import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,availableDaily,questXp,unlockEntries,familyWeek,familyWeekStart,waterRefill,waterCasts,
 QUESTS,VILLAGE_QUESTS,FISH,LAKE_FISH,HEIRLOOMS,ITEMS,RECIPES,POND_WATER,LAKE_WATER,POND_REFILL_MS,POND_BOOK_REFILL_MS,POND_MAX_CASTS,LAB_BEDS,LAB_FULL_BEDS,LAB_GROW_MS,
 LAB_COMPLETE_DIAMONDS,LAB_DISCOVER_DIAMONDS,MILLER_LEVEL,MILLER_ORDER,MILLER_PREMIUM,MILLER_DIAMONDS,VILLAGE_XP_SHARE,WORLD_TWO_LEVEL,millerValue,millerOpen,millerDelivered,
 villageQuestOpen,labBeds,labComplete,worldTwoBuilding} from '../game/farm-state.js';
import {questGroups,villageQuestGroups,questArt} from '../public/quests-ui.js';
import {squareMarkup,squareStatus} from '../public/village-square-ui.js';
import {entryLine} from '../public/progression-ui.js';
import {farmLog} from '../supabase/functions/farm-api/player-log.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Heirlooms and fishing in the quests (17 Oct 2026). A farmer baked heirloom flour into a loaf and found no quest for it; the owner chose
// 1a 2a 3a 4a 5b: 20 quests for the pond and the Seed Lab (320 in all), 12 for the heirloom bakes and the village lake (70 in all), a third
// test bed for the whole heirloom collection, a cast every 15 minutes for the pond's whole fish book, and the miller's weekly order.
const now=Date.parse('2026-10-17T12:00:00Z');
function farm(level,{mode='guided'}={}){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=1000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings))if(!worldTwoBuilding(k))b.built=true;
 return normalizeFarm(s,now);
}
const act=(s,a,t=now)=>applyFarmAction(s,a,t);
const pondOf=best=>({n:200,casts:5,castsAt:0,firstAt:0,lastAt:0,prevAt:0,best,page2At:0});
const W1=QUESTS.slice(300),W2=VILLAGE_QUESTS.slice(58);

test('20 quests for the pond and the Seed Lab and 12 for the heirloom bakes and the lake, appended: 320 and 70, every old id where it was',()=>{
 assert.equal(QUESTS.length,320);assert.equal(VILLAGE_QUESTS.length,70);
 assert.equal(QUESTS[299].title,'Stall keeper');assert.equal(VILLAGE_QUESTS[57].title,'The Great Hall');
 assert.deepEqual(W1.map(q=>[q.stat,q.target,q.reward,q.minLevel]),[
  ['fish',1,100,4],['fish_kinds',4,250,4],['fish',25,500,5],['fish_perfect',10,800,6],['fish_kinds',8,1500,8],['caught_whiskers',1,2000,10],['fish',100,3000,12],
  ['fish_kinds',12,5000,20],['fish',250,8000,25],['fish_kinds',16,15000,25],['fish_perfect',100,12000,30],['fish',1000,40000,50],
  ['heirlooms_found',1,30000,92],['heirlooms_found',5,60000,92],['lab_crosses',10,50000,92],['heirlooms_found',10,100000,94],['heirlooms_found',15,150000,96],
  ['heirlooms_found',20,250000,98],['lab_crosses',50,150000,95],['lab_crosses',150,300000,100]]);
 assert.deepEqual(W2.map(q=>[q.stat,q.target,q.reward,q.minLevel]),[
  ['made_heirloomflour',3,20000,112],['made_goldenloaf',1,20000,112],['made_heirloompie',1,30000,115],['made_heirloomflour',200,200000,125],['made_goldenloaf',60,200000,130],
  ['made_heirloompie',50,300000,140],['lake_fish',1,10000,100],['lake_fish',50,30000,100],['lake_fish_kinds',10,60000,102],['caught_oldgranite',1,100000,105],
  ['lake_fish_kinds',20,200000,120],['lake_fish',500,250000,130]]);
 for(const list of [QUESTS,VILLAGE_QUESTS])assert.equal(new Set(list.map(q=>q.title)).size,list.length,'every title once');
 // Each kind of goal is a ladder: a bigger goal pays more. The heirloom bakes' first steps come before the three of 30 Sep.
 for(const list of [QUESTS,VILLAGE_QUESTS]){const by={};for(const q of list.filter(q=>q.xp===undefined))(by[q.stat]??=[]).push(q);
  for(const [stat,l] of Object.entries(by)){l.sort((a,b)=>a.target-b.target);for(let i=1;i<l.length;i++)assert.ok(l[i].target>l[i-1].target&&l[i].reward>l[i-1].reward,stat);}}
 // A bake's quest opens with its recipe; every new quest has its own picture and a short description.
 for(const q of W2.filter(q=>q.stat.startsWith('made_')))assert.ok(q.minLevel>=Object.values(RECIPES).find(r=>r.output[q.stat.slice(5)]).minLevel,q.title);
 for(const q of [...W1,...W2]){assert.ok(!questArt(q.stat).includes('data-art="quests"'),`${q.title}: its own picture`);assert.ok(q.description.length<=60,q.title);}
});

test('the collections are counted from the farm itself: a farm that has them can claim at once; a number written in stats does not count',()=>{
 const s=farm(117,{mode:'legacy'});s.pond=pondOf(Object.fromEntries(Object.keys(FISH).map(k=>[k,1])));s.lake=pondOf({bleak:.1,oldgranite:30});s.lab.found=Object.keys(HEIRLOOMS);
 normalizeFarm(s,now);
 assert.deepEqual([s.stats.fish_kinds,s.stats.caught_whiskers,s.stats.lake_fish_kinds,s.stats.caught_oldgranite,s.stats.heirlooms_found],[16,1,2,1,20]);
 const id=QUESTS.findIndex(q=>q.title==='The whole fish book');assert.deepEqual(act(s,{type:'quest',id}),{coins:15000,xp:questXp(QUESTS[id])});
 const every=QUESTS.findIndex(q=>q.title==='Every heirloom');act(s,{type:'quest',id:every});
 const granite=VILLAGE_QUESTS.findIndex(q=>q.title==='The lake’s legend');assert.deepEqual(act(s,{type:'village_quest',id:granite}),{coins:100000,xp:questXp(VILLAGE_QUESTS[granite])});
 const t=farm(117);t.stats.fish_kinds=16;normalizeFarm(t,now);assert.equal(t.stats.fish_kinds,0,'a book that is not there counts nothing');
 assert.throws(()=>act(t,{type:'quest',id}),/Finish this quest/);
 // A new kind in the book counts in the same action.
 const f=farm(30);f.pond=pondOf({});normalizeFarm(f,now);const r=act(f,{type:'fish',n:200,landed:true,perfect:false},now);
 assert.equal(r.first,true);assert.equal(f.stats.fish_kinds,1);
});

test('the pond\'s quests wait for the pond, the Seed Lab\'s for level 92 (guided) and are never seen below 90, nor at 99 those of 100 (legacy)',()=>{
 const pondQuest=QUESTS.findIndex(q=>q.title==='A first bite');
 assert.equal(availableDaily(farm(3),QUESTS[pondQuest]),false);assert.equal(availableDaily(farm(4),QUESTS[pondQuest]),true);
 // quests-ui.js reads public/farm-state.js (another copy of the module): compared by title.
 const shown=s=>[...questGroups(s).ready,...questGroups(s).active].map(x=>x.quest.title);
 const lab=W1.filter(q=>q.minLevel>=90).map(q=>q.title);
 for(const level of [60,89,91])for(const mode of ['guided','legacy'])assert.ok(!shown(farm(level,{mode})).some(t=>lab.includes(t)),`${mode} ${level}`);
 const g=farm(92),labQuests=W1.filter(q=>q.minLevel>=90);assert.ok(labQuests.filter(q=>q.minLevel===92).every(q=>availableDaily(g,q)));assert.equal(availableDaily(g,labQuests.find(q=>q.minLevel===94)),false);
 const legacy=shown(farm(95,{mode:'legacy'}));
 assert.ok(legacy.includes('A new variety')&&legacy.includes('A lab regular'));assert.ok(!legacy.includes('Fifteen varieties')&&!legacy.includes('Master breeder'));
 const hundred=QUESTS.filter(q=>q.minLevel>=100).map(q=>q.title);assert.ok(hundred.length&&!shown(farm(99,{mode:'legacy'})).some(t=>hundred.includes(t)),'nothing of level 100 at 99');
 // The pond's quests below 90 on an older farm: as every other quest, all of them.
 const ten=shown(farm(10,{mode:'legacy'}));assert.ok(W1.filter(q=>q.minLevel<90).every(q=>ten.includes(q.title)));
});

test('the village\'s new quests open at their level; the lake\'s also with the lake; claimed one at a time',()=>{
 const titles=s=>[...villageQuestGroups(s).ready,...villageQuestGroups(s).active].map(x=>x.quest.title);
 assert.ok(titles(farm(100)).includes('Out on the lake'));assert.ok(!titles(farm(100)).includes('The first heirloom flour'));
 assert.ok(titles(farm(112)).includes('The first heirloom flour')&&titles(farm(112)).includes('A golden loaf')&&!titles(farm(112)).includes('An heirloom pie'));
 const lake=VILLAGE_QUESTS.find(q=>q.title==='Out on the lake');assert.equal(villageQuestOpen(farm(100),lake),true);assert.equal(villageQuestOpen(farm(99),lake),false);
 const read2=read('game/farm-state.js');assert.match(read2,/const LAKE_QUEST_STATS=Object\.freeze\(\['lake_fish','lake_fish_kinds','caught_oldgranite'\]\);/);
 const s=farm(112),id=VILLAGE_QUESTS.findIndex(q=>q.title==='The first heirloom flour');
 assert.throws(()=>act(s,{type:'village_quest',id}),/Finish this quest/);s.stats.made_heirloomflour=3;
 assert.deepEqual(act(s,{type:'village_quest',id}),{coins:20000,xp:questXp(VILLAGE_QUESTS[id])});assert.throws(()=>act(s,{type:'village_quest',id}),/already been claimed/);
 assert.throws(()=>act(farm(114),{type:'village_quest',id:VILLAGE_QUESTS.findIndex(q=>q.title==='An heirloom pie')}),{message:'Reach level 115 for this quest.'});
});

test('the whole heirloom collection: the 20th discovery gives a third test bed for good, with its diamonds; a farm that had all 20 gets it on loading',()=>{
 const s=farm(98),keys=Object.keys(HEIRLOOMS);s.lab.found=keys.slice(0,19);normalizeFarm(s,now);
 assert.equal(s.lab.beds.length,LAB_BEDS);assert.equal(labBeds(s),2);assert.equal(labComplete(s),false);
 const last=keys[19];for(const [k,n] of Object.entries(HEIRLOOMS[last].input))s.inventory[k]=n*3;
 assert.throws(()=>act(s,{type:'lab_cross',bed:2,heirloom:last}),/Choose a test bed/);
 act(s,{type:'lab_cross',bed:0,heirloom:last});const later=now+25*3600000;const d=s.diamonds;
 const r=act(s,{type:'lab_collect',bed:0},later);
 assert.equal(r.complete,true);assert.equal(r.beds,LAB_FULL_BEDS);assert.equal(r.diamonds,LAB_DISCOVER_DIAMONDS+LAB_COMPLETE_DIAMONDS);assert.equal(s.diamonds-d,r.diamonds);
 assert.equal(s.lab.beds.length,3);assert.equal(s.stats.heirlooms_found,20);
 act(s,{type:'lab_cross',bed:2,heirloom:last},later);assert.equal(s.lab.beds[2].heirloom,last);assert.equal(s.lab.beds[2].readyAt,later+LAB_GROW_MS);
 const again=structuredClone(s);normalizeFarm(again,later);assert.deepEqual(again.lab,s.lab,'the third bed and what grows in it stay');
 const old=farm(117);old.lab={beds:[null,null],found:keys};normalizeFarm(old,now);assert.deepEqual(old.lab.beds,[null,null,null]);
 const junk=farm(117);junk.lab={beds:[null,null,{heirloom:last,startedAt:1,readyAt:2}],found:keys.slice(0,5)};normalizeFarm(junk,now);assert.equal(junk.lab.beds.length,2,'no third bed without the collection');
 // The Seed Lab says it before and after.
 const ui=read('public/estate-ui.js');
 assert.match(ui,/discovered\. Find all \$\{total\} for \+\$\{LAB_COMPLETE_DIAMONDS\} diamonds and a third test bed\./);assert.match(ui,/The whole collection is yours, with a third test bed\./);
 assert.match(ui,/if\(r\.complete\)showCollectionCheer\(\{title:'Heirloom collection complete!'/);
});

test('the pond\'s whole fish book: a new cast every 15 minutes there; the lake and an unfinished book keep 20',()=>{
 const full=Object.fromEntries(Object.keys(FISH).map(k=>[k,1])),s=farm(30);s.pond=pondOf(full);normalizeFarm(s,now);
 assert.equal(waterRefill(POND_WATER,s),POND_BOOK_REFILL_MS);assert.equal(POND_BOOK_REFILL_MS,15*60000);assert.equal(POND_REFILL_MS,20*60000);
 s.pond.casts=0;s.pond.castsAt=now;assert.deepEqual(waterCasts(POND_WATER,s,now+15*60000),{casts:1,nextAt:now+30*60000});
 assert.throws(()=>act(s,{type:'fish',n:200,landed:true,perfect:false},now+60000),{message:'No casts left. A new cast comes every 15 minutes.'});
 const part=farm(30);part.pond=pondOf({minnow:1});part.pond.casts=0;part.pond.castsAt=now;normalizeFarm(part,now);
 assert.equal(waterRefill(POND_WATER,part),POND_REFILL_MS);assert.equal(waterCasts(POND_WATER,part,now+15*60000).casts,0);
 assert.throws(()=>act(part,{type:'fish',n:200,landed:true,perfect:false},now+60000),{message:'No casts left. A new cast comes every 20 minutes.'});
 const lake=farm(130);lake.lake=pondOf(Object.fromEntries(Object.keys(LAKE_FISH).map(k=>[k,1])));normalizeFarm(lake,now);
 assert.equal(waterRefill(LAKE_WATER,lake),POND_REFILL_MS,'the lake keeps 20 minutes');assert.equal(POND_MAX_CASTS,5);
 // The book and the level-20 card say it; the card for the whole book comes with the catch that fills it.
 const ui=read('public/pond-ui.js');
 assert.match(ui,/Catch all \$\{Object\.keys\(FISH\)\.length\} kinds on both pages: \$\{W\.book2\} diamonds and a new cast every \$\{W\.fullRefill\/60000\} minutes\./);
 assert.match(ui,/if\(r\.book2\)showCollectionCheer\(\{title:'Fish book complete!'/);assert.match(ui,/perk:W\.fullRefill\?`From now on a new cast comes every \$\{W\.fullRefill\/60000\} minutes at your pond\.`:''/);
});

test('the miller\'s order: from level 115, once a week, 6 golden loaves and 2 heirloom pies for twice their worth, 10 diamonds and XP',()=>{
 assert.deepEqual({...MILLER_ORDER},{goldenloaf:6,heirloompie:2});assert.equal(millerValue(),40000);assert.equal(MILLER_PREMIUM,2);assert.equal(MILLER_DIAMONDS,10);
 const week=familyWeek(now),stock=s=>{Object.assign(s.inventory,{goldenloaf:6,heirloompie:2});return s;};
 assert.equal(millerOpen(farm(114)),false);assert.equal(millerOpen(farm(115)),true);
 assert.throws(()=>act(stock(farm(114)),{type:'miller_deliver',week}),{message:`Reach level ${MILLER_LEVEL} for the miller’s order.`});
 assert.throws(()=>act(stock(farm(99)),{type:'miller_deliver',week}),{message:`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`});
 const s=farm(120);s.inventory.goldenloaf=5;s.inventory.heirloompie=2;
 assert.throws(()=>act(s,{type:'miller_deliver',week}),{message:'Missing: Golden loaf (5/6).'});
 stock(s);const before={coins:s.coins,diamonds:s.diamonds,xp:s.xp,earned:s.stats.earned,village:s.stats.village_earned??0,gems:s.stats.diamonds_earned??0};
 s.boosts.coinsUntil=now+3600000;   // no coin boost on an order, as a villager's
 assert.throws(()=>act(s,{type:'miller_deliver',week:week-1}),{message:'A new week has begun. Look at the miller’s order again.'});
 const r=act(s,{type:'miller_deliver',week});
 assert.deepEqual(r,{coins:80000,xp:Math.round(40000/VILLAGE_XP_SHARE),diamonds:10});
 assert.deepEqual([s.coins-before.coins,s.diamonds-before.diamonds,s.xp-before.xp],[80000,10,800]);
 assert.deepEqual([s.stats.earned-before.earned,s.stats.village_earned-before.village,s.stats.diamonds_earned-before.gems,s.stats.miller_orders],[80000,80000,10,1]);
 assert.equal(s.inventory.goldenloaf,0);assert.equal(s.inventory.heirloompie,0);assert.equal(millerDelivered(s,now),true);
 stock(s);assert.throws(()=>act(s,{type:'miller_deliver',week}),{message:'The miller has his bakes for this week. He comes back on Monday.'});
 const monday=familyWeekStart(week+1)+60000;assert.equal(millerDelivered(s,monday),false);act(s,{type:'miller_deliver',week:week+1},monday);assert.equal(s.stats.miller_orders,2);
 // Saved as the week it was delivered; anything else is cleaned up.
 const again=structuredClone(s);normalizeFarm(again,monday);assert.deepEqual(again.village.miller,{week:week+1});
 const junk=farm(120);junk.village.miller={week:'x',more:1};normalizeFarm(junk,now);assert.deepEqual(junk.village.miller,{week:null});
 // A line in the farm's log, and diamonds' sound.
 assert.match(read('supabase/functions/farm-api/player-log.js'),/miller_deliver:\['market',\(\)=>'Delivered the miller’s order at the market square'\]/);
 assert.match(read('public/farm-audio.js'),/miller_deliver:'diamond'/);
});

test('the market square shows the miller from 115 with his portrait, what he asks and pays, and after delivering when he comes back',()=>{
 const itemList=items=>Object.entries(items).map(([k,n])=>`<span class="ingredient" data-item="${k}">${n} ${ITEMS[k].name}</span>`).join('');
 assert.doesNotMatch(squareMarkup(farm(114),itemList,now),/miller/i);
 const s=farm(115),html=squareMarkup(s,itemList,now);
 assert.match(html,/<h3 class="square-heading">The miller’s order<\/h3><p class="square-rule">Once a week the miller asks for heirloom bakes\. He pays twice what they are worth, and 10 diamonds\.<\/p>/);
 assert.match(html,/data-art="villager-miller"|villager-miller/);assert.match(html,/data-item="goldenloaf">6 Golden loaf/);assert.match(html,/data-item="heirloompie">2 Heirloom pie/);
 assert.match(html,/80,000/);assert.match(html,/data-miller-deliver data-week="\d+" disabled/);assert.match(html,/Golden loaves bake at the Bakery and heirloom pies in the Farm Kitchen/);
 Object.assign(s.inventory,{goldenloaf:6,heirloompie:2});assert.match(squareMarkup(s,itemList,now),/data-miller-deliver data-week="\d+" >Deliver/);
 assert.deepEqual(squareStatus(s,now),{text:'The miller’s order is ready to deliver',kind:'ready'});
 act(s,{type:'miller_deliver',week:familyWeek(now)});const done=squareMarkup(s,itemList,now);
 assert.match(done,/Thank you! His next order comes in <b>/);assert.doesNotMatch(done,/data-miller-deliver/);
 assert.doesNotMatch(squareMarkup(s,itemList,now),/village-request miller/,'the miller is not one of the villagers\' boards');
});

test('level 115\'s card names the miller\'s order, from level 100 in Coming up, never below; the wiki says every rule',()=>{
 const entry=s=>unlockEntries(s).find(e=>e.id==='village:miller');
 assert.equal(entry(farm(99)),undefined);assert.equal(entry(farm(100)).unlocked,false);assert.equal(entry(farm(115)).unlocked,true);
 assert.equal(entryLine(entry(farm(115))),'Heirloom bakes for the miller each week: coins and 10 diamonds, at the market square.');
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/section\('The miller’s order',`<p>\$\{h\.lvl\(MILLER_LEVEL\)\} Once a week the miller at the market square asks for/);
 assert.match(wiki,/and a third test bed for good, so \$\{LAB_FULL_BEDS\} crosses grow at once\./);
 assert.match(wiki,/From then on a new cast comes every \$\{POND_BOOK_REFILL_MS\/60000\} minutes at your pond\./);
 assert.match(wiki,/The pond has its own quests, from your first fish to a thousand\./);assert.match(wiki,/The lake has its own village quests\./);
});

test('balance: the miller asks about 4 Seed Lab crosses a week; the quests pay at most about a day of income at their level',()=>{
 // A golden wheat cross gives 4, ground 2 into 3 heirloom flour; a loaf and a pie take 2 flour each, a pie 2 golden apples (4 a cross).
 const flour=MILLER_ORDER.goldenloaf*RECIPES.goldenloaf.input.heirloomflour+MILLER_ORDER.heirloompie*RECIPES.heirloompie.input.heirloomflour;
 const wheat=Math.ceil(flour/RECIPES.heirloomflour.output.heirloomflour)*RECIPES.heirloomflour.input.goldenwheat,apples=MILLER_ORDER.heirloompie*RECIPES.heirloompie.input.goldenapple;
 const crosses=Math.ceil(wheat/4)+Math.ceil(apples/4);assert.equal(crosses,4);assert.ok(crosses<=2*3*7/4,'well under what two beds grow in a week');
 // The plan's modelled day of a steady farmer (tests/lake-balance.test.mjs): 359k coins at 100, 410k at 120, 553k at 150.
 const day=level=>level<120?359000:level<150?410000:553000;
 for(const q of W2)assert.ok(q.reward>=10000&&q.reward<=day(q.minLevel),`${q.title}: ${q.reward}`);
 for(const q of W1.filter(q=>q.minLevel>=90))assert.ok(q.reward<=300000,q.title);
 for(const q of W1.filter(q=>q.minLevel<90))assert.ok(q.reward<=40000&&q.target<=1000,q.title);
 assert.ok(millerValue()*MILLER_PREMIUM<=day(MILLER_LEVEL)/4,'an order is under a quarter of a day');
 // No new diamond source but the order (10 a week) and the book and collection diamonds as before.
 for(const q of [...W1,...W2])assert.equal(q.diamonds,undefined);
});

test('the farm log names the order; the card for a whole collection is its own small module in the level-up card\'s look',()=>{
 const s=farm(115),before=structuredClone(s);Object.assign(s.inventory,{goldenloaf:6,heirloompie:2});const r=act(s,{type:'miller_deliver',week:familyWeek(now)});
 const [row]=farmLog({type:'miller_deliver',week:familyWeek(now)},before,s,r);assert.equal(row.category,'market');assert.equal(row.action,'miller_deliver');assert.match(row.text,/^Delivered the miller’s order at the market square/);
 const cheer=read('public/collection-cheer.js');
 assert.match(cheer,/dialog\.showModal\(\)/);assert.match(cheer,/COLLECTION COMPLETE/);assert.match(cheer,/Wonderful!/);
 assert.match(read('public/progression.css'),/#collection-cheer\[open\]\{display:flex;flex-direction:column/);
});
