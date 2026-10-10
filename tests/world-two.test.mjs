import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,unlockEntries,upgradeCost,upgradeRequirements,upgradeGoods,marketHighlights,familyOrder,
 buildingRecipes,marketItems,villageBrief,villageSquareReady,villageRequestGoods,villagePlaceBefore,itemAvailable,questXp,
 BUILDINGS,BUILDING_COSTS,BUILDING_LEVELS,RECIPE_LEVELS,RECIPES,ITEMS,VILLAGE_GOODS,MASTER_UPGRADES,MAX_BUILDING_LEVEL,TOP_BUILDING_LEVEL,WORLD_TWO_LEVEL,
 VILLAGE_BRIEFS,VILLAGE_BUILD_XP,VILLAGE_UPGRADE_GOODS,VILLAGE_QUESTS,VILLAGERS,VILLAGE_REQUEST_WAIT,QUESTS,DAILY_POOLS,
 villageGood,worldTwoItem,worldTwoBuilding,beyondMaxBuilding,masterUpgrade,doubleBatchChance,worldTwoOpen,recipeLevel,buildingUnlocked,recipeUnlocked} from '../game/farm-state.js';
import {EVENT_GOAL_POOLS} from '../public/event-goals.js';

const now=Date.parse('2026-10-05T12:00:00Z');
function farm(level){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=true;if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}
 normalizeFarm(s,now);return s;
}
const act=(s,a,t=now,random)=>applyFarmAction(s,a,t,random);
// A farm as a player has it at that level (Oct 2026): the farm's buildings not built yet, none of the village's places; guided or legacy.
function playerFarm(level,mode='guided'){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=400000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};return normalizeFarm(s,now);
}

test('World II opens at level 100: below it none of its places, recipes, goods or upgrades shows',()=>{
 const s=farm(99);
 assert.equal(worldTwoOpen(s),false);
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.equal(buildingUnlocked(s,key),false,key);
 for(const id of Object.keys(RECIPES).filter(id=>recipeLevel(s,id)>=WORLD_TWO_LEVEL))assert.equal(recipeUnlocked(s,id),false,id);
 assert.ok(unlockEntries(s).every(e=>e.level<WORLD_TWO_LEVEL),'the roadmap shows nothing of level 100 and up');
 assert.equal(upgradeCost(s,'bakery'),null,'a level-10 building reads as fully upgraded, as before');
 assert.equal(masterUpgrade(s,'bakery'),null);
 assert.throws(()=>act(s,{type:'sell',item:'all',category:'village'}),/level 100/);
 const w=farm(100);assert.equal(worldTwoOpen(w),true);
 for(const key of ['mine','lumbercamp'])assert.equal(buildingUnlocked(w,key),true,key);
 for(const id of ['packedlunch','digiron','chop','saw'])assert.equal(recipeUnlocked(w,id),true,id);
 assert.equal(recipeUnlocked(w,'smeltiron'),false,'the Smithy waits for 102');
 // Built from the golden brief at the market square (Oct 2026): 75,000 for the Mine and the Lumber Camp, 150,000 for the Smithy, 250,000
 // for the windmill, and the brief's goods (150k / 150k / 200k / 300k in coins only before).
 const fresh=createFarm(now);fresh.xp=xpForLevel(100);fresh.coins=400000;fresh.onboarding={...fresh.onboarding,completed:99,rewardClaimed:true};normalizeFarm(fresh,now);
 assert.equal(buildingUnlocked(fresh,'mine'),false,'eligible, not built yet');
 fresh.inventory.packedlunch=6;const xp=fresh.xp;
 act(fresh,{type:'village_build',place:'mine'});assert.equal(buildingUnlocked(fresh,'mine'),true);
 assert.deepEqual([fresh.coins,fresh.inventory.packedlunch,fresh.xp-xp,fresh.stats.built_mine],[325000,0,VILLAGE_BUILD_XP,1]);assert.equal(VILLAGE_BUILD_XP,250);
 assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>BUILDINGS[k].buildCost),[75000,75000,150000,250000]);
 assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>BUILDING_COSTS[k]),[75000,75000,150000,250000]);
 assert.deepEqual(VILLAGE_BRIEFS.map(b=>b.place),['mine','lumbercamp','smithy','villagemill']);
 // A game from before the update sends Build: refused, never the old price.
 assert.throws(()=>act(fresh,{type:'construct',building:'lumbercamp'}),/golden brief/);assert.equal(fresh.buildings.lumbercamp.built,false);
 assert.throws(()=>act(playerFarm(99),{type:'construct',building:'mine'}),{message:'Reach level 100.'},'below 100 the old answer, nothing of the village');
});

test('the village goods stay in the village: own market, never in the farm Market, Family Orders or family sharing',async()=>{
 assert.equal(Object.keys(VILLAGE_GOODS).length,12);
 for(const k of Object.keys(VILLAGE_GOODS)){assert.ok(villageGood(k)&&worldTwoItem(k),k);}
 assert.ok(worldTwoItem('goldenloaf')&&worldTwoItem('heirloompie')&&!villageGood('goldenloaf'),'the farm\'s bakes are World II but sell at the farm Market');
 const s=farm(110);s.inventory.stone=10;s.inventory.wheat=5;
 assert.throws(()=>act(s,{type:'sell',item:'stone'}),/Village market/);
 assert.throws(()=>act(s,{type:'sell',item:'wheat',category:'village'}),/only buys village goods/);
 const before=s.coins;act(s,{type:'sell',item:'all'});assert.equal(s.inventory.stone,10,'selling everything at the farm leaves the village goods');assert.ok(s.coins>before);
 act(s,{type:'sell',item:'stone',category:'village',quantity:4});assert.equal(s.inventory.stone,6);
 act(s,{type:'sell',item:'all',category:'village'});assert.equal(s.inventory.stone,0);
 for(let day=0;day<60;day++)for(const k of Object.keys(familyOrder('f'+day,2900+day,3).lines))assert.ok(!worldTwoItem(k),k);
 for(let d=0;d<30;d++){const h=marketHighlights(now+d*86400000,s);assert.ok(!villageGood(h.today.item)&&!villageGood(h.tomorrow.item));}
 // Valley baskets, Trade Depot exports, fair classes and visitors' orders never ask for World II goods, even with them in reach.
 const src=(await import('node:fs')).readFileSync(new URL('../game/farm-state.js',import.meta.url),'utf8');
 for(const fn of ['function valleyBasket(','function exportContract(','function fairClasses(','function visitorOrder(']){const body=src.slice(src.indexOf(fn),src.indexOf('\n}',src.indexOf(fn)));assert.match(body,/!worldTwoItem\(k\)/,fn);}
});

test('a packed lunch from the farm starts every trip: the chain from the Kitchen to master tools works',()=>{
 const s=farm(108);for(const k of Object.keys(s.inventory))s.inventory[k]=0;
 Object.assign(s.inventory,{bread:2,cheese:2,apples:4});
 let r=act(s,{type:'produce',recipe:'packedlunch'});act(s,{type:'collect',building:'kitchen'},r.readyAt);assert.equal(s.inventory.packedlunch,6);
 r=act(s,{type:'produce',recipe:'digiron'});assert.equal(s.inventory.packedlunch,5);act(s,{type:'collect',building:'mine'},r.readyAt);
 assert.deepEqual([s.inventory.ironore,s.inventory.stone],[5,4]);
 assert.throws(()=>act(s,{type:'produce',recipe:'digsilver'}),/Missing ingredients/,'silver needs pickaxes from the Smithy');
 for(const [id,building] of [['chop','lumbercamp'],['saw','lumbercamp'],['smeltiron','smithy']]){
  r=act(s,{type:'produce',recipe:id},r.readyAt);act(s,{type:'collect',building,jobId:r.jobId},r.readyAt);
 }
 assert.equal(s.inventory.ironbar,1);assert.equal(s.inventory.plank,2);
});

test('past level 10 with master tools: one level at farm level 108, 120, 140, 160 and 180, up to 15',()=>{
 assert.equal(TOP_BUILDING_LEVEL,15);assert.deepEqual(MASTER_UPGRADES.map(u=>u.level),[108,120,140,160,180]);
 assert.deepEqual(MASTER_UPGRADES.map(u=>u.materials.mastertools),[1,2,3,4,5]);
 assert.ok(beyondMaxBuilding('bakery')&&!beyondMaxBuilding('factory')&&!beyondMaxBuilding('mine')&&!beyondMaxBuilding('farmhouse'));
 const s=farm(105);
 assert.deepEqual(upgradeRequirements(s,'bakery'),{level:108,materials:{mastertools:1,plank:20,stone:30}});
 assert.throws(()=>act(s,{type:'upgrade',building:'bakery'}),/Reach level 108/);
 const t=farm(108);Object.assign(t.inventory,{mastertools:1,plank:20,stone:30});
 assert.equal(upgradeCost(t,'bakery'),750000);
 const coins=t.coins;act(t,{type:'upgrade',building:'bakery'});
 assert.equal(t.buildings.bakery.level,11);assert.equal(t.buildings.bakery.beyond,1);assert.equal(t.coins,coins-750000);
 assert.deepEqual([t.inventory.mastertools,t.inventory.plank,t.inventory.stone],[0,0,0]);assert.equal(t.stats.beyond_upgrades,1);
 assert.throws(()=>act(t,{type:'upgrade',building:'bakery'}),/Reach level 120/);
 assert.equal(upgradeCost(t,'factory'),null,'the Factory stops at 10');
 // An old save with levels past 10 from before 26 Sep 2026 keeps only what master tools bought.
 const old=farm(150);old.buildings.dairy.level=20;old.buildings.bakery.level=13;old.buildings.bakery.beyond=1;normalizeFarm(old,now);
 assert.equal(old.buildings.dairy.level,10);assert.equal(old.buildings.bakery.level,11);
});

test('every level past 10 gives a batch a 10% chance to come out double, decided when it starts',()=>{
 assert.deepEqual([9,10,11,13,15,20].map(doubleBatchChance),[0,0,.1,.3,.5,.5]);
 const s=farm(120);s.buildings.bakery.level=12;s.buildings.bakery.beyond=2;Object.assign(s.inventory,{flour:40,milk:20});
 const lucky=act(s,{type:'produce',recipe:'bread'},now,()=>.1);assert.equal(lucky.double,true);
 const plain=act(s,{type:'produce',recipe:'bread'},now,()=>.25);assert.equal(plain.double,undefined);
 const got=act(s,{type:'collect',building:'bakery',jobId:lucky.jobId},lucky.readyAt);assert.deepEqual(got.items,{bread:4},'2 bread doubled');
 assert.deepEqual(act(s,{type:'collect',building:'bakery',jobId:plain.jobId},plain.readyAt).items,{bread:2});
 const v=farm(120);v.buildings.mine.level=10;v.inventory.packedlunch=5;
 assert.equal(act(v,{type:'produce',recipe:'digiron'},now,()=>0).double,undefined,'the village\'s places never double');
});

test('every World II recipe is worth making: 40% on top and 120 coins an hour, at least 2 of each mixed ingredient',async()=>{
 const {recipeValue}=await import('../game/farm-state.js');
 for(const id of Object.keys(RECIPES).filter(id=>(RECIPES[id].minLevel??0)>=WORLD_TWO_LEVEL&&RECIPES[id].building!=='factory')){
  const v=recipeValue(id),r=RECIPES[id];
  assert.ok(v.output/v.input>=1.4,id);assert.ok(v.added/(r.duration/3600000)>=120,id);
  if(Object.keys(r.input).length>1)assert.ok(Object.values(r.input).every(n=>n>=2),id);
  assert.ok(Object.keys(r.input).concat(Object.keys(r.output)).every(k=>ITEMS[k]),id);
 }
 assert.equal(levelOf(farm(200)),200);
});

test('the village keeps its own count and its own quests: batches, sales and quests apart from the farm\'s',async()=>{
 const {VILLAGE_QUESTS,QUESTS,worldTwoItem:w2}=await import('../game/farm-state.js');
 // Every village quest counts something of the village (its goods, places, batches, market) or the master levels, from level 100.
 for(const q of VILLAGE_QUESTS){
  assert.ok(q.minLevel>=WORLD_TWO_LEVEL,q.title);
  const [,kind,key]=q.stat.match(/^(made|built)_(.+)$/)??[];
  assert.ok(kind==='made'?w2(key):kind==='built'?worldTwoBuilding(key):['village_batches','village_sold','village_earned','village_requests','beyond_upgrades'].includes(q.stat),q.stat);
  if(kind==='made'){const opens=Math.min(...Object.values(RECIPES).filter(r=>r.output[key]&&r.building!=='factory').map(r=>r.minLevel??0));assert.ok(q.minLevel>=opens,`${q.title} opens with its recipe`);}
 }
 assert.ok(!QUESTS.some(q=>/^village_|beyond_upgrades/.test(q.stat)),'the farm\'s quests stay the farm\'s');
 const s=farm(110);Object.assign(s.inventory,{packedlunch:10,stone:20});
 const produced=s.stats.produced??0,sold=s.stats.sold??0;
 const r=act(s,{type:'produce',recipe:'digiron'});act(s,{type:'collect',building:'mine'},r.readyAt);
 assert.deepEqual([s.stats.village_batches,s.stats.produced??0],[1,produced],'a village batch is the village\'s');
 const sale=act(s,{type:'sell',item:'stone',category:'village',quantity:5},r.readyAt);
 assert.deepEqual([s.stats.village_sold,s.stats.village_earned,s.stats.sold??0],[5,sale.coins,sold],'so is a village sale');
 // A village quest: claimed once, only when done and open, and never among the farm's claimed quests.
 const first=VILLAGE_QUESTS.findIndex(q=>q.stat==='village_batches');
 const low=farm(99);low.stats.village_batches=50;assert.throws(()=>act(low,{type:'village_quest',id:first}),/Reach level 100/);
 s.stats.village_batches=VILLAGE_QUESTS[first].target;const coins=s.coins,claimed=[...s.claimed];
 const got=act(s,{type:'village_quest',id:first});assert.equal(s.coins,coins+VILLAGE_QUESTS[first].reward);assert.ok(got.xp>0);
 assert.deepEqual(s.villageQuests,[first]);assert.deepEqual(s.claimed,claimed);
 assert.throws(()=>act(s,{type:'village_quest',id:first}),/already been claimed/);
 const late=VILLAGE_QUESTS.findIndex(q=>q.minLevel>110);s.stats[VILLAGE_QUESTS[late].stat]=1e9;assert.throws(()=>act(s,{type:'village_quest',id:late}),/Reach level/);
 s.villageQuests.push(999,'x',first);normalizeFarm(s,now);assert.deepEqual(s.villageQuests,[first]);
});

// Phase 0 of World II's market square (Oct 2026): nothing of the village shows below level 100, on guided farms and on legacy farms
// (rank 2 at level 108 is one). The wiki and the Market screen read these rules (buildingRecipes, marketItems).
function legacyFarm(level){
 const s=createFarm(now);s.progression={mode:'legacy'};s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=true;if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}
 return normalizeFarm(s,now);
}
test('level 99 sees nothing new, guided and legacy: no recipe, Market good, highlight, quest, board or village action of World II',()=>{
 const production=Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].type==='production'&&!worldTwoBuilding(k));
 assert.ok(production.includes('factory'));
 for(const s of [farm(99),legacyFarm(99),playerFarm(99),playerFarm(99,'legacy')]){
  const mode=s.progression.mode;Object.assign(s.inventory,{goldenloaf:3,heirloompie:2});   // even with the bakes in stock (a gift)
  assert.ok(unlockEntries(s).every(e=>e.level<WORLD_TWO_LEVEL),mode);
  for(const key of production)for(const id of buildingRecipes(s,key)){
   assert.ok(recipeLevel(s,id)<WORLD_TWO_LEVEL,`${mode} ${key} lists ${id}`);
   assert.ok(Object.keys(RECIPES[id].output).every(k=>!worldTwoItem(k)),`${mode} ${key} shows what ${id} makes`);
  }
  assert.ok(buildingRecipes(s,'kitchen').includes('stew')&&buildingRecipes(s,'factory').includes('mass_bread'),'the rest stays listed');
  for(const tab of ['crops','goods'])assert.ok(marketItems(s,tab).length&&marketItems(s,tab).every(k=>!worldTwoItem(k)),`${mode} ${tab}`);
  for(let d=0;d<30;d++){const h=marketHighlights(now+d*86400000,s);assert.ok(!worldTwoItem(h.today.item)&&!worldTwoItem(h.tomorrow.item),`${mode} day ${d}`);}
  assert.deepEqual(s.village,{serial:0,boards:[]},mode);
  for(const action of [{type:'village_deliver',board:0,request:1,input:{stone:1}},{type:'village_skip',board:0,request:1},{type:'village_build',place:'mine'}])
   assert.throws(()=>act(s,action),{message:'Reach level 100 to trade in the village.'},`${mode} ${action.type}`);
  assert.equal(villageSquareReady(s),false);
 }
 // No farm quest, daily challenge or event goal counts the market square (the village's own quests open at 100).
 const stats=new Set(['village_requests','village_sold','village_earned']);
 assert.ok(!QUESTS.some(q=>stats.has(q.stat)));assert.ok(!DAILY_POOLS.flat().some(q=>stats.has(q.stat)));
 assert.ok(!EVENT_GOAL_POOLS.flat(2).some(g=>stats.has(g.stat)));
 // From 100 the village is open: the Kitchen lists packed lunches (and the heirloom pie of 115 under "Coming later"), the Market the bakes.
 for(const s of [farm(100),legacyFarm(100)]){
  assert.ok(buildingRecipes(s,'kitchen').includes('packedlunch')&&buildingRecipes(s,'kitchen').includes('heirloompie'));
  assert.ok(buildingRecipes(s,'factory').includes('mass_packedlunch'));
  s.inventory.goldenloaf=1;assert.ok(marketItems(s,'goods').includes('goldenloaf'));
  assert.ok(marketItems(s,'village').every(villageGood));
 }
});

// The screens' half of it (Oct 2026): How to play finds, lists and opens nothing of World II below level 100 (a link from the chat opens
// its home page), and the building and Market screens list what the rules above list.
test('level 99 sees nothing new in How to play or on the screens: no search hit, topic, link or listed recipe of World II',async()=>{
 const {wikiSearch,wikiGroups,wikiArticle,WIKI_TOPICS}=await import('../public/wiki-content.js');
 const {readFileSync}=await import('node:fs'),read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 const names=[...Object.values(VILLAGE_GOODS).map(g=>g.name),...Object.keys(BUILDINGS).filter(worldTwoBuilding).map(k=>BUILDINGS[k].name),'Golden loaf','Heirloom pie','village','master tools','market square','golden brief'];
 for(const name of names){
  assert.deepEqual(wikiSearch(name,{level:99}),[],name);
  assert.ok(wikiSearch(name,{level:100}).length>=1,`${name} at 100`);assert.ok(wikiSearch(name).length>=1,`${name} on the website`);
 }
 const ctx={level:99,href:id=>`#wiki-${id}`};
 assert.doesNotMatch(wikiGroups(ctx),/data-wiki-topic="village"/);assert.equal(wikiArticle('village',ctx),null);
 for(const t of WIKI_TOPICS.filter(t=>t.id!=='village')){
  const a=wikiArticle(t.id,ctx);
  assert.doesNotMatch(a.html,/data-wiki-topic="village"|market square|golden brief|packed lunch|master tools|heirloom pie|golden loaf|from the village/i,t.id);
  assert.ok(a.related.every(r=>r.id!=='village'),t.id);
 }
 assert.match(wikiArticle('buildings',{level:100}).html,/master tools/);
 // The building windows and the Market list what buildingRecipes and marketItems list; the wiki's search gets the farmer's level.
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const previewEntries=buildingRecipes\(state,key\)\.filter\(id=>recipeUnlocked\(preview,id\)\)/,'the build panel\'s recipes');
 assert.match(ui,/const made=\[\.\.\.new Set\(buildingRecipes\(state,key\)\.flatMap/,'its Makes pictures');
 assert.match(ui,/const recipeEntries=buildingRecipes\(state,key\)\.map/,'a built building\'s list and its Coming later');
 assert.match(ui,/function marketEntries\(\)\{return marketItems\(state,marketTab\)\.map\(k=>\[k,ITEMS\[k\]\]\);\}/,'the Market tabs');
 assert.doesNotMatch(ui,/Object\.(entries|values)\(RECIPES\)\.filter/,'no screen lists a building\'s recipes on its own');
 assert.match(read('public/wiki-ui.js'),/hits=wikiSearch\(q,\{level:ctx\(\)\.level\}\)/);
 // The signpost and the closed bridge on the farm stay from level 90.
 assert.match(read('public/game.js'),/const shown=levelProgress\(state\)\.level>=WORLD_TWO_TEASER;v\.object\.visible=shown;/);
});

test('every village place and recipe has its level, so a guided farm never opens one at level 1',()=>{
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.ok(BUILDING_LEVELS[key]>=WORLD_TWO_LEVEL&&BUILDING_LEVELS[key]===BUILDINGS[key].minLevel,key);
 const village=Object.keys(RECIPES).filter(id=>RECIPES[id].building!=='factory'&&(worldTwoBuilding(RECIPES[id].building)||Object.keys(RECIPES[id].output).some(worldTwoItem)));
 assert.ok(village.length>=13);
 for(const id of village)assert.ok(RECIPE_LEVELS[id]===RECIPES[id].minLevel&&RECIPE_LEVELS[id]>=WORLD_TWO_LEVEL,id);
});

test('village places upgrade with planks and stone only: 4 and 6 for every level, from the upgrade to level 4',()=>{
 assert.deepEqual(VILLAGE_UPGRADE_GOODS,{plank:4,stone:6});
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding)){
  for(let level=1;level<=10;level++)assert.ok(Object.keys(upgradeGoods(key,level)).every(k=>k==='plank'||k==='stone'),`${key} ${level}`);
  for(const level of [1,2,10])assert.deepEqual(upgradeGoods(key,level),{},`${key} ${level}`);
  const total={plank:0,stone:0};for(let level=3;level<=9;level++)for(const [k,n] of Object.entries(upgradeGoods(key,level)))total[k]+=n;
  assert.deepEqual(total,{plank:168,stone:252},key);
 }
 assert.deepEqual(upgradeGoods('villagemill',6),{plank:24,stone:36},'not 72 heirloom flour any more');
 const s=farm(110);s.buildings.mine.level=6;s.boosts.upgradeCredits=1;
 assert.deepEqual(upgradeRequirements(s,'mine').materials,{plank:12,stone:18},'the Buildings discount halves them');
 const t=farm(110);t.buildings.smithy.level=3;Object.assign(t.inventory,{plank:12,stone:18});
 act(t,{type:'upgrade',building:'smithy'});assert.deepEqual([t.buildings.smithy.level,t.inventory.plank,t.inventory.stone],[4,0,0]);
});

test('one golden brief at a time, guided and legacy: the Mine, the Lumber Camp, the Smithy at 102, the windmill at 112',()=>{
 for(const mode of ['guided','legacy']){
  const s=playerFarm(100,mode);s.coins=10000000;
  assert.equal(villageBrief(s).place,'mine',mode);assert.equal(villageBrief(s).title,'The miners’ lunch');
  assert.deepEqual([villageBrief(s).coins,villageBrief(s).level,villageBrief(s).open,villageBrief(s).ready],[75000,100,true,false]);
  assert.deepEqual(villageBrief(s).missing,{packedlunch:6});
  assert.throws(()=>act(s,{type:'village_build',place:'lumbercamp'}),{message:'Build the Mine first: one golden brief at a time.'},mode);
  assert.throws(()=>act(s,{type:'village_build',place:'mine'}),{message:'Gather the missing supplies: 6 Packed lunch.'},mode);
  assert.throws(()=>act(s,{type:'village_build',place:'barn'}),{message:'Choose a village place.'});
  assert.throws(()=>act(s,{type:'village_build',place:'familyhall'}),/Choose a village place/);
  s.inventory.packedlunch=12;assert.equal(villageBrief(s).ready,true);
  const poor=structuredClone(s);poor.coins=74999;assert.throws(()=>act(poor,{type:'village_build',place:'mine'}),{message:'You need 75,000 coins to build the Mine.'});
  assert.equal(villageBrief(poor).short,1);
  let coins=s.coins;assert.deepEqual(act(s,{type:'village_build',place:'mine'}),{place:'mine',name:'Mine',coins:75000,goods:{packedlunch:6},xp:250});
  assert.equal(s.coins,coins-75000);assert.throws(()=>act(s,{type:'village_build',place:'mine'}),{message:'The Mine is already built.'});
  assert.equal(villageBrief(s).place,'lumbercamp');act(s,{type:'village_build',place:'lumbercamp'});
  assert.equal(s.inventory.packedlunch,0);assert.equal(s.stats.built_lumbercamp,1);
  Object.assign(s.inventory,{ironore:20,timber:20});
  assert.equal(villageBrief(s).open,false);assert.throws(()=>act(s,{type:'village_build',place:'smithy'}),{message:'Reach level 102.'},mode);
  s.xp=xpForLevel(102);assert.deepEqual(villageBrief(s).goods,{ironore:20,timber:20});
  coins=s.coins;act(s,{type:'village_build',place:'smithy'});assert.deepEqual([s.coins,s.inventory.ironore,s.inventory.timber],[coins-150000,0,0]);
  Object.assign(s.inventory,{plank:30,stone:40});
  assert.throws(()=>act(s,{type:'village_build',place:'villagemill'}),{message:'Reach level 112.'},mode);
  s.xp=xpForLevel(112);coins=s.coins;act(s,{type:'village_build',place:'villagemill'});
  assert.deepEqual([s.coins,s.inventory.plank,s.inventory.stone,buildingUnlocked(s,'villagemill')],[coins-250000,0,0,true]);
  assert.equal(villageBrief(s),null,'every place built: no brief');
 }
});

test('a farm that already built a place keeps it, its level and its batch; the briefs start at the first place it lacks',()=>{
 const s=playerFarm(112);s.coins=10000000;
 Object.assign(s.buildings.smithy,{built:true,level:3,job:{id:'smithy-1',recipe:'smeltiron',startedAt:now-1000,readyAt:now+3600000,output:{ironbar:1},xp:50},batchSequence:1});
 const smithy=structuredClone(s.buildings.smithy);normalizeFarm(s,now+1000);
 assert.deepEqual(s.buildings.smithy,smithy,'unchanged, the batch keeps the XP it started with');
 assert.equal(villageBrief(s).place,'mine');
 assert.throws(()=>act(s,{type:'village_build',place:'smithy'}),/already built/);
 assert.throws(()=>act(s,{type:'village_build',place:'villagemill'}),/Build the Mine first/);
 s.inventory.packedlunch=12;act(s,{type:'village_build',place:'mine'});act(s,{type:'village_build',place:'lumbercamp'});
 assert.equal(villageBrief(s).place,'villagemill','the Smithy is skipped: it is built');
});

test('old farms load unchanged: an empty market square, nothing else moves; normalizing twice changes nothing; junk is cleaned up',async()=>{
 const {createLegacyFarm}=await import('./legacy-farm.mjs');
 for(const s of [createLegacyFarm(now),playerFarm(60),farm(112),legacyFarm(108)]){
  delete s.village;const before=structuredClone(s);normalizeFarm(s,now);
  for(const key of ['coins','inventory','buildings','xp','stats','diamonds'])assert.deepEqual(s[key],before[key],key);
  if(!worldTwoOpen(s))assert.deepEqual(s.village,{serial:0,boards:[]});else assert.equal(s.village.boards.length,levelOf(s)>=104?3:2);
  const village=structuredClone(s.village);normalizeFarm(s,now);assert.deepEqual(s.village,village,'idempotent');
 }
 const junk=()=>({serial:-3,boards:[5,{request:{id:'x'}},{request:{id:2,villager:0,input:{stone:'a'},value:1,coins:1,xp:1}},{},{}],extra:1});
 const low=farm(99);low.village=junk();normalizeFarm(low,now);
 assert.deepEqual(low.village,{serial:0,boards:[{request:null,readyAt:0},{request:null,readyAt:0}]},'below 100 nothing fills');
 for(const bad of ['x',[1,2],null,{boards:'x'},{serial:1.5,boards:[{request:{id:1,villager:9,input:{stone:1},value:45,coins:68,xp:1}}]}]){
  const s=farm(99);s.village=bad;normalizeFarm(s,now);assert.ok(s.village.boards.every(b=>b.request===null),JSON.stringify(bad));
 }
 // Never a third villager below level 104, also when an old save holds three boards.
 const hundred=farm(100);hundred.village=junk();normalizeFarm(hundred,now);
 assert.equal(hundred.village.boards.length,2);assert.ok(hundred.village.boards.every(b=>b.request));assert.equal(hundred.village.serial,2);
 const kept=farm(104);kept.village={serial:3,boards:[{request:{id:7,villager:0,input:{stone:10},value:450,coins:675,xp:9},readyAt:0}]};normalizeFarm(kept,now);
 assert.deepEqual(kept.village.boards[0].request,{id:7,villager:0,input:{stone:10},value:450,coins:675,xp:9},'a good request is kept');
 assert.deepEqual(kept.village.boards.slice(1).map(b=>b.request.id),[8,9],'and the next ids never repeat it');
});

test('the market square lights up only when there is something to do: a brief to build or a villager to help',()=>{
 assert.equal(villageSquareReady(farm(99)),false);
 const s=farm(110);for(const k of Object.keys(s.inventory))s.inventory[k]=0;
 assert.equal(villageBrief(s),null);assert.ok(s.village.boards.every(b=>b.request));assert.equal(villageSquareReady(s),false,'nothing in stock');
 Object.assign(s.inventory,s.village.boards[1].request.input);assert.equal(villageSquareReady(s),true,'a villager can be helped');
 const b=playerFarm(100);for(const board of b.village.boards){board.request=null;board.readyAt=now+VILLAGE_REQUEST_WAIT;}
 assert.equal(villageSquareReady(b),false,'the brief is not ready yet');
 b.inventory.packedlunch=6;assert.equal(villageSquareReady(b),true,'the brief can be built');
 b.coins=1000;assert.equal(villageSquareReady(b),false);
});

test('the market square\'s quests come after the others, so every claimed quest keeps its place',()=>{
 assert.equal(VILLAGE_QUESTS[0].title,'Lunch for the road');assert.equal(VILLAGE_QUESTS[26].title,'A valley of masters');
 const added=VILLAGE_QUESTS.slice(27);
 assert.deepEqual(added.map(q=>[q.stat,q.target,q.reward,q.minLevel]),[['village_requests',1,10000,100],['village_requests',10,30000,100],['village_requests',50,100000,104],['village_requests',200,250000,120]]);
 assert.deepEqual(added.map(questXp),[47,82,150,237]);
 const titles=[...QUESTS,...VILLAGE_QUESTS].map(q=>q.title.toLowerCase().replace(/’/g,'\''));
 assert.equal(new Set(titles).size,titles.length,'every quest title once');
 assert.ok(!titles.some(t=>/favourite/.test(t)&&/village/.test(t)),'nothing close to "The valley\'s favourite"');
 const s=farm(110);s.villageQuests=[0];s.stats.village_requests=10;
 act(s,{type:'village_quest',id:28});assert.deepEqual(s.villageQuests,[0,28]);
 assert.throws(()=>act(s,{type:'village_quest',id:29}),/Finish this quest/);
});

test('a request\'s villager and lines stay the same after a save reorders its goods',()=>{
 let lunchFirst=0;
 for(const [level,stock] of [[101,{}],[101,{packedlunch:100}],[130,{ironbar:10,plank:50}],[130,{}]]){
 const s=farm(level);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,stock);s.village={serial:0,boards:[]};
 for(let i=0;i<40;i++){
  normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
  for(const b of s.village.boards){
   const r=b.request,places=Object.keys(r.input).map(k=>Object.values(RECIPES).find(x=>x.output[k]&&worldTwoBuilding(x.building))?.building).filter(Boolean);
   assert.ok(places.length?places.includes(VILLAGERS[r.villager].place):VILLAGERS[r.villager].place==='villagemarket',JSON.stringify(r));
   if(Object.keys(r.input)[0]==='packedlunch'&&places.length)lunchFirst++;   // the lunches' Kitchen is not a village place
   const shown=JSON.stringify(villageRequestGoods(r)),villager=r.villager;
   r.input=Object.fromEntries(Object.entries(r.input).reverse());   // what a save does to the keys
   normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);assert.equal(b.request.villager,villager);assert.equal(JSON.stringify(villageRequestGoods(b.request)),shown);
   b.request=null;b.readyAt=now+(i+1)*VILLAGE_REQUEST_WAIT;
  }
 }
 }
 assert.ok(lunchFirst>10,'requests that start with lunches and ask a place\'s good too go to that place\'s villager');
});

test('villagers never ask for master tools or heirloom flour, even when the farm makes both',()=>{
 const s=farm(115);s.lab.found=['goldenwheat'];Object.assign(s.inventory,{goldenwheat:50,heirloomflour:200,mastertools:20});normalizeFarm(s,now);
 assert.ok(itemAvailable(s,'heirloomflour')&&itemAvailable(s,'mastertools'));
 for(let i=0;i<200;i++){
  for(const b of s.village.boards){assert.ok(!('heirloomflour' in b.request.input)&&!('mastertools' in b.request.input),JSON.stringify(b.request.input));b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}
  normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
 }
});

test('a board\'s villager does not depend on how its fills were grouped: one pass after two boards fell due fills them as two passes did',()=>{
 const H=3600000;
 for(const mode of ['guided','legacy']){
  // Level 104, the Mine and the Lumber Camp built. "Not now" on board 1 at 12:00 and on board 0 at 12:20, so board 1 falls due first.
  // The screen fills board 1 at 15:00 from a load that is not saved; the server fills both at 15:20:30 from the saved farm.
  const s=farm(104);if(mode==='legacy')s.progression={mode:'legacy'};s.buildings.smithy.built=s.buildings.villagemill.built=false;s.village={serial:0,boards:[]};normalizeFarm(s,now);
  act(s,{type:'village_skip',board:1,request:s.village.boards[1].request.id},now);
  act(s,{type:'village_skip',board:0,request:s.village.boards[0].request.id},now+20*60000);
  const saved=structuredClone(s),screen=structuredClone(saved);
  normalizeFarm(screen,now+3*H+60000);const seen=structuredClone(screen.village.boards[1].request);assert.equal(screen.village.boards[0].request,null);
  normalizeFarm(screen,now+3*H+20*60000+30000);
  const server=structuredClone(saved);normalizeFarm(server,now+3*H+20*60000+30000);
  assert.deepEqual(server.village,screen.village,mode);assert.deepEqual(server.village.boards[1].request,seen,`${mode}: the villager on the screen stays`);
  assert.ok(server.village.boards[1].request.id<server.village.boards[0].request.id,'the board that waited longest gets the first number');
 }
 // Any times: a pass at each moment a board falls due, or one pass at the end, from the same farm.
 for(let round=0;round<60;round++){
  const s=farm(110);s.village={serial:0,boards:[]};normalizeFarm(s,now);
  const times=s.village.boards.map((b,i)=>now+((round*7+i*13)%5)*15*60000);
  s.village.boards.forEach((b,i)=>{b.request=null;b.readyAt=times[i];});
  const one=structuredClone(s),many=structuredClone(s),end=Math.max(...times)+1;
  for(const t of [...times].sort((a,b)=>a-b))normalizeFarm(many,t);normalizeFarm(many,end);normalizeFarm(one,end);
  assert.deepEqual(one.village,many.village,`round ${round}: ${times.map(t=>(t-now)/60000)}`);
 }
});

test('every villager with request lines comes to the market square; the miller only speaks on his golden brief',()=>{
 assert.deepEqual(VILLAGERS[3].lines,[],'his windmill grinds heirloom flour, which nobody asks for');
 assert.equal(VILLAGE_BRIEFS.find(b=>b.place==='villagemill').villager,3);
 for(const v of VILLAGERS.filter(v=>v.lines.length))assert.equal(v.lines.length,3,`${v.id}: as many lines as boards`);
 const s=farm(130);s.lab.found=['goldenwheat'];Object.assign(s.inventory,{goldenwheat:50});s.village={serial:0,boards:[]};normalizeFarm(s,now);
 const met=new Set();
 for(let i=1;i<=300;i++){
  for(const b of s.village.boards){met.add(b.request.villager);b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}
  normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
 }
 assert.deepEqual([...met].sort(),VILLAGERS.map((v,i)=>v.lines.length?i:null).filter(i=>i!==null),'each one with lines, nobody without');
 // A save that names a villager without lines (or none at all) loses that request: the board fills again.
 const junk=farm(110);junk.village={serial:5,boards:[{request:{id:5,villager:3,input:{stone:10},value:450,coins:675,xp:9},readyAt:0}]};normalizeFarm(junk,now);
 assert.notEqual(junk.village.boards[0].request.villager,3);assert.equal(junk.village.boards[0].request.id,6);
});

test('the level-up card and Coming up call a village place a village place, built from a golden brief, never "open Buildings"',()=>{
 for(const mode of ['guided','legacy']){
  const s=playerFarm(100,mode),entries=unlockEntries(s);
  for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.equal(entries.find(e=>e.id==='building:'+key).kind,'Village place',`${mode} ${key}`);
  assert.ok(entries.filter(e=>e.id.startsWith('building:')&&!worldTwoBuilding(e.id.slice(9))).every(e=>e.kind!=='Village place'),mode);
 }
 const ui=readFileSync(new URL('../public/progression-ui.js',import.meta.url),'utf8');
 assert.match(ui,/e\.kind==='Village place'\?'Village place · built from a golden brief at the market square':/);
});

test('a village place that waits names the place right before it, not the open brief',()=>{
 const s=playerFarm(112);
 assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>villagePlaceBefore(s,k)),[null,'mine','lumbercamp','smithy']);
 s.buildings.smithy.built=true;   // built before the briefs
 assert.deepEqual(['mine','lumbercamp','villagemill'].map(k=>villagePlaceBefore(s,k)),[null,'mine','lumbercamp'],'a place already built is skipped');
 s.buildings.mine.built=true;assert.deepEqual(['lumbercamp','villagemill'].map(k=>villagePlaceBefore(s,k)),[null,'lumbercamp']);
});
