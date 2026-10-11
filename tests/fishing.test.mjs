import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {farmLog,snapshot} from '../supabase/functions/farm-api/player-log.js';
import {POND_LOADING_TIP} from '../public/loading-screen.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
// The Fishing pond (11 Oct 2026, part C). It ships closed first (POND_OPEN false): these tests play the rules with the pond open,
// whatever the switch says today, from the same source with only the switch turned (G), and check the switch itself as it is.
const SOURCE=read('game/farm-state.js');
const OPEN=asModule(SOURCE.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=true,'));
const G=await import(OPEN);
// The browser's instant path (farm-client.js) on the same open rules.
const {instantResult}=await import(asModule(read('public/farm-client.js').replace("from './farm-state.js';",`from '${OPEN}';`)));
const now=Date.UTC(2026,9,11,9);
const at=level=>{const s=G.createFarm(now-3600000);s.xp=G.xpForLevel(level);s.coins=500;G.normalizeFarm(s,now);return s;};
const fish=(s,t,landed=true,perfect=false)=>G.applyFarmAction(s,{type:'fish',n:s.pond?.n??0,landed,perfect},t);
const GAP=G.POND_MIN_GAP_MS,LATER=G.POND_REFILL_MS*5;

test('one switch: closed, the pond is in no list, no screen loads it and every fish is refused; the copies are one file',async()=>{
 assert.equal((SOURCE.match(/export const POND_OPEN=(true|false),/g)??[]).length,1,'one switch, in game/farm-state.js');
 assert.equal(read('public/farm-state.js'),SOURCE,'scripts/sync-game.mjs copies the rules to the browser');
 assert.equal(read('supabase/functions/farm-api/farm-state.js'),SOURCE,'and to farm-api');
 const C=await import(asModule(SOURCE.replace(/export const POND_OPEN=(true|false),/,'export const POND_OPEN=false,')));
 assert.equal(C.FEATURE_LEVELS.fishing,undefined);assert.equal(C.FEATURE_NAMES.fishing,undefined);
 const s=C.createFarm(now);s.xp=C.xpForLevel(60);C.normalizeFarm(s,now);
 assert.equal(C.featureUnlocked(s,'fishing'),false);assert.ok(!C.unlockEntries(s).some(e=>e.id==='feature:fishing'),'not in Coming up or on a level card');
 assert.throws(()=>C.applyFarmAction(s,{type:'fish',n:0,landed:true,perfect:false},now),/The fishing pond is not open yet\./);
 assert.equal(s.pond,undefined,'no save gets a pond');
 const game=read('public/game.js');
 assert.match(game,/if\(POND_OPEN&&!villageWorld&&!adminView\)void import\('\.\/pond-ui\.js'\)/,'the farm only (never the village or the admin\'s showcase), and only when open');
 assert.match(game,/\.\.\.\(POND_OPEN\?\[POND_LOADING_TIP\]:\[\]\)/,'its loading tip only when open');
 assert.match(read('public/wiki-content.js'),/\+\(POND_OPEN\?pondSection\(h\):''\)/,'its wiki section only when open');
});

test('open at level 4 for every farm, old or new; level 3 is refused with the unlock hint; the level-4 card names it',()=>{
 assert.equal(G.FEATURE_LEVELS.fishing,4);assert.equal(G.POND_LEVEL,4);assert.equal(G.FEATURE_NAMES.fishing,'Fishing pond');
 const three=at(3);assert.equal(G.featureUnlocked(three,'fishing'),false);
 assert.throws(()=>fish(three,now),{message:'Reach level 4 to unlock Fishing pond.'});
 const four=at(4);assert.equal(G.featureUnlocked(four,'fishing'),true);assert.equal(fish(four,now).species,'minnow');
 // An old (legacy) farm opens nothing early: it waits for level 4 too.
 const old=createLegacyFarm(now);G.normalizeFarm(old,now);old.xp=G.xpForLevel(3);assert.equal(G.featureUnlocked(old,'fishing'),false);old.xp=G.xpForLevel(4);assert.equal(G.featureUnlocked(old,'fishing'),true);
 const entry=G.unlockEntries(four).find(e=>e.id==='feature:fishing');assert.deepEqual([entry.name,entry.art,entry.kind,entry.level],['Fishing pond','fishingpond','Activity',4]);
});

test('the first three fish are always a Minnow, a Perch and a Carp; after that the farm\'s own seed decides, the same everywhere',()=>{
 for(const rookieUntil of [0,1,123456789,Date.UTC(2026,9,1)])assert.deepEqual([0,1,2].map(n=>G.pondFish({rookieUntil},n)).map(f=>[f.species,f.kg]),[['minnow',.11],['perch',.42],['carp',2.35]]);
 const a={rookieUntil:1760000000000},b={rookieUntil:1760000000001},seq=s=>Array.from({length:40},(_,i)=>G.pondFish(s,i+3)).map(f=>`${f.species}:${f.kg}`).join();
 assert.equal(seq(a),seq(a),'the same fish every time');assert.notEqual(seq(a),seq(b),'another farm, other fish');
 assert.equal(seq({}),seq({rookieUntil:0}),'a farm without a seed shares one sequence (harmless)');
 // Over 100,000 fish the kinds come as often as the table says (the legend's own rule left out: the book already has him).
 const counts={},s={rookieUntil:42,pond:{best:{whiskers:10}}};
 for(let n=3;n<100003;n++){const f=G.pondFish(s,n);counts[f.species]=(counts[f.species]??0)+1;const [lo,hi]=G.FISH[f.species].kg;assert.ok(f.kg>=lo&&f.kg<=hi&&f.share>=0&&f.share<=1);}
 for(const [key,f] of Object.entries(G.FISH))assert.ok(Math.abs((counts[key]??0)/1000-f.chance)<.5,`${key}: ${(counts[key]??0)/1000}% for ${f.chance}%`);
 assert.equal(Object.values(G.FISH).reduce((sum,f)=>sum+f.chance,0).toFixed(6),'100.000000');
});

test('casts: 5 at the start, one used per fish landed or let go, a new one every 20 minutes, never more than 5 waiting',()=>{
 const s=at(10);assert.deepEqual(G.pondCasts(s,now),{casts:5,nextAt:0},'a farm that never fished has a full pond');
 fish(s,now);assert.deepEqual(G.pondCasts(s,now),{casts:4,nextAt:now+20*60000},'spending from a full pond starts the 20 minutes');
 fish(s,now+5*60000,false);assert.equal(G.pondCasts(s,now+5*60000).casts,3,'letting a fish go uses its cast');
 assert.equal(G.pondCasts(s,now+20*60000).casts,4);assert.equal(G.pondCasts(s,now+40*60000-1).casts,4);assert.equal(G.pondCasts(s,now+40*60000).casts,5);
 assert.deepEqual(G.pondCasts(s,now+10*3600000),{casts:5,nextAt:0},'never more than 5');
 // The time already counted towards the next cast is kept when one is spent meanwhile.
 const u=at(10);fish(u,now);fish(u,now+GAP);fish(u,now+2*GAP);const mid=now+15*60000;fish(u,mid);assert.deepEqual(G.pondCasts(u,mid),{casts:1,nextAt:now+20*60000});
 // 77 a day at most: 5 at the start and one every 20 minutes.
 const d=at(10);let landed=0;
 for(let k=0;k<24*12;k++){const t=now+k*5*60000;for(let i=0;G.pondCasts(d,t+i*GAP).casts>0;i++){fish(d,t+i*GAP);landed++;}}
 assert.ok(landed>=72&&landed<=G.POND_START_CASTS+72,`${landed} in a day`);
});

test('refused: no casts, another tab\'s number, a third fish within 3.5 seconds, a landing that is not a plain true or false',()=>{
 const s=at(10);
 for(const [landed,perfect] of [[1,false],['yes',false],[true,undefined],[true,1],[null,null]])assert.throws(()=>G.applyFarmAction(s,{type:'fish',n:0,landed,perfect},now),/Choose whether you landed the fish\./);
 assert.throws(()=>G.applyFarmAction(s,{type:'fish',n:1,landed:true,perfect:false},now),/Your pond changed in another tab\./);
 assert.throws(()=>G.applyFarmAction(s,{type:'fish',n:'0',landed:true,perfect:false},now),/Your pond changed in another tab\./);
 fish(s,now);fish(s,now+100);   // two close together pass (a slow connection can deliver them so)
 assert.throws(()=>fish(s,now+GAP-1),/Give the line a moment\./,'a third within 3.5 s of the first does not');
 fish(s,now+GAP);fish(s,now+2*GAP);fish(s,now+3*GAP);
 assert.throws(()=>fish(s,now+4*GAP),/No casts left\. A new cast comes every 20 minutes\./);
 assert.equal(s.pond.n,5,'nothing refused moved the count');
});

test('pay: coins by kind, weight and level, double for today\'s fish, a fifth more when perfect, the first of a kind three times and 10 XP more',()=>{
 for(const level of [4,10,50,100]){
  const s=at(level),f=G.pondFish(s,0),r=fish(s,now),base=Math.round(4*(.8+.4*f.share)*(1+level/8)*(G.todaysFish(now)==='minnow'?2:1));
  assert.equal(r.coins,base*3,`level ${level}: the first minnow pays three times`);assert.equal(r.xp,2+10);assert.equal(r.first,true);
 }
 assert.ok(['minnow','perch','roach','carp','tench'].includes(G.todaysFish(now)),'today\'s fish is one of the five common kinds');
 assert.notEqual(G.todaysFish(now),G.todaysFish(now+G.DAY_MS),'another one tomorrow');
 const dayOf=sp=>{for(let d=0;d<5;d++)if(G.todaysFish(now+d*G.DAY_MS)===sp)return now+d*G.DAY_MS;};
 const s=at(20),f={species:'carp',kg:3,share:(3-1.5)/4.5},base=12*(.8+.4*f.share)*(1+20/8);
 assert.equal(G.fishCoins(s,f,false,dayOf('perch')),Math.round(base));
 assert.equal(G.fishCoins(s,f,true,dayOf('perch')),Math.round(base*1.2),'a perfect catch pays a fifth more');
 assert.equal(G.fishCoins(s,f,false,dayOf('carp')),Math.round(base*2),'today\'s fish pays double');
 assert.equal(G.fishCoins(s,f,true,dayOf('carp')),Math.round(base*2*1.2));
 // The second minnow of a farm pays once, without the first-catch bonus.
 const t=at(10);for(let k=0;k<200&&!(t.pond?.best?.minnow>0&&G.pondFish(t,t.pond.n).species==='minnow');k++)fish(t,now+k*LATER);
 const before=t.coins,second=fish(t,now+300*LATER);assert.equal(second.first,false);assert.equal(second.xp,2);assert.equal(t.coins-before,second.coins);
 assert.equal(second.coins,G.fishCoins(t,G.pondFish({...t,pond:{best:{}}},second.n),false,now+300*LATER));
});

test('the fish book: a record only when heavier, and all eight kinds pay 25 diamonds exactly once',()=>{
 const s=at(30);s.pond={firstAt:now,n:3,casts:5,castsAt:now,lastAt:0,prevAt:0,best:{minnow:.15,perch:.5,roach:.6,carp:3,tench:2,pike:4,goldencarp:2}};G.normalizeFarm(s,now);
 const diamonds=s.diamonds;let t=now,paid=0;
 for(let k=0;k<400&&!(s.pond.best.whiskers>0);k++){
  t+=LATER;const next=G.pondFish(s,s.pond.n),had=s.pond.best[next.species]??0,r=fish(s,t);paid+=r.diamonds;
  assert.equal(r.record,had>0&&next.kg>had,`${next.species} ${next.kg} after ${had}`);assert.equal(s.pond.best[next.species],Math.max(had,next.kg));assert.equal(r.first,!(had>0));
 }
 assert.ok(s.pond.best.whiskers>=9,'Old Whiskers came');assert.equal(paid,25);assert.equal(s.diamonds,diamonds+25);assert.equal(s.pond.bookPaid,true);assert.ok(G.pondBookDone(s));
 assert.equal(s.stats.diamonds_earned,25,'counted as diamonds earned, like every diamond from play (the quest "A sparkling streak")');
 for(let k=0;k<30;k++){t+=LATER;assert.equal(fish(s,t).diamonds,0,'never again');}
});

test('Old Whiskers, the pond\'s legend: fish 120 is him for a farm that never landed him, again at 240 if he was let go',()=>{
 for(const rookieUntil of [0,7,1760000000000]){assert.equal(G.pondFish({rookieUntil},119).species,'whiskers');assert.equal(G.pondFish({rookieUntil},239).species,'whiskers');}
 let ordinary=0;for(let seed=1;seed<=20;seed++)if(G.pondFish({rookieUntil:seed,pond:{best:{whiskers:9}}},119).species!=='whiskers')ordinary++;
 assert.ok(ordinary>=18,'once landed, fish 120 is an ordinary roll');
 // Let go at 120, he is back at 240; caught at 240, the book has him.
 const s=at(50);s.pond={firstAt:now,n:119,casts:5,castsAt:now,lastAt:0,prevAt:0,best:{}};G.normalizeFarm(s,now);
 assert.equal(fish(s,now,false).released,true);
 s.pond.n=239;const r=fish(s,now+LATER);assert.equal(r.species,'whiskers');assert.ok(r.kg>=9&&r.kg<=15);assert.equal(r.xp,20+10);
});

test('letting a fish go pays nothing, uses the cast and is counted; nothing is paid in items or diamonds per fish',()=>{
 const s=at(12),before={coins:s.coins,xp:s.xp,diamonds:s.diamonds,inventory:{...s.inventory}};
 const r=fish(s,now,false);assert.equal(r.released,true);assert.deepEqual({coins:s.coins,xp:s.xp,diamonds:s.diamonds,inventory:s.inventory},before);
 assert.equal(s.stats.fish_released,1);assert.equal(s.pond.n,1);assert.deepEqual(s.pond.best,{});
 const t=at(40),inv={...t.inventory},d=t.diamonds,earned=t.stats.earned;
 for(let k=0;k<200;k++)fish(t,now+k*LATER,true,k%3===0);
 assert.deepEqual(t.inventory,inv,'no items, no Market goods');assert.ok(t.diamonds-d<=G.POND_BOOK_DIAMONDS,'diamonds only for the full book');
 assert.equal(t.stats.fish,200);assert.equal(t.stats.fish_perfect,67);assert.ok(t.stats.fish_coins>0);
 assert.equal(t.stats.earned,earned,'fish coins are not market earnings (no "Earn coins" goal moves)');
 assert.ok(G.NO_EVENT_ACTIONS.has('fish'),'and no event or Family Chest counts a fish (farm-api saves it as no event action)');
 assert.match(read('supabase/functions/farm-api/index.ts'),/eventAction:NO_EVENT_ACTIONS\.has\(body\.action\.type\)\?null:body\.action\.type/);
});

test('what the screen shows at once is what the server pays (farm-client.js instantResult)',()=>{
 for(const level of [4,15,60]){
  const s=at(level);let t=now;
  for(let k=0;k<5;k++){
   t+=GAP+1;const action={type:'fish',n:s.pond?.n??0,landed:k!==3,perfect:k%2===0};
   const shown=instantResult(s,action,t),server=structuredClone(s),paid=G.applyFarmAction(server,action,t);
   assert.ok(shown,'a fish shows at once');assert.deepEqual(shown.result,paid,`level ${level}, fish ${k}`);
   assert.deepEqual(shown.trial.pond,server.pond);G.applyFarmAction(s,action,t);
  }
 }
 assert.match(read('public/farm-client.js'),/'stall_collect','pass_claim','fish'\]\)\);/);
});

test('a saved pond: never made by loading, cleaned when garbled without losing its count or book',()=>{
 const s=at(10);G.normalizeFarm(s,now);assert.equal('pond' in s,false,'a farm that never fished keeps its shape');
 for(const k of ['fish','fish_perfect','fish_released','fish_coins'])assert.equal(k in s.stats,false);
 const g=at(10);g.pond={n:7.5,casts:9,castsAt:'x',firstAt:-5,lastAt:null,best:{minnow:.123,shark:4,perch:-1,carp:'2',tench:Infinity,pike:2.5},bookPaid:'yes'};G.normalizeFarm(g,now);
 assert.deepEqual(g.pond,{n:0,casts:5,castsAt:0,firstAt:0,lastAt:0,prevAt:0,best:{minnow:.12,pike:2.5}});
 const kept=at(10);kept.pond={n:12,casts:9,best:{carp:3.1}};G.normalizeFarm(kept,now);assert.equal(kept.pond.n,12);assert.deepEqual(kept.pond.best,{carp:3.1});assert.equal(kept.pond.casts,5);
 const h=at(10);h.pond={n:12,casts:2,castsAt:now-60000,firstAt:now-86400000,lastAt:now-60000,prevAt:now-90000,best:{carp:3.1},bookPaid:true};const copy=structuredClone(h.pond);G.normalizeFarm(h,now);assert.deepEqual(h.pond,copy,'a good pond is left as it is');
 for(const bad of [null,5,'pond',[1,2]]){const b=at(10);b.pond=bad;G.normalizeFarm(b,now);assert.equal('pond' in b,false,String(bad));}
});

// The plan's balance (11 Oct 2026, part C 2.7), from the rules: a boost on the first day and pocket money after it.
test('balance: about 3.6 XP a cast (77 casts at most a day, under 300 XP), coins far below selling and a helping hand',()=>{
 const xpPerCast=Object.values(G.FISH).reduce((sum,f)=>sum+f.chance/100*f.xp,0);
 assert.ok(Math.abs(xpPerCast-3.6)<.05,`${xpPerCast} XP a cast`);assert.ok(xpPerCast*77<=300,'a full day of casts stays under 300 XP');
 // Expected coins a cast at a level (no first-catch bonus; a perfect catch 3 times in 10; today's fish as the days fall), from real fish.
 const perCast=level=>{const s=at(level);let sum=0;const N=6000;for(let n=3;n<N+3;n++){const f=G.pondFish({rookieUntil:n*7919,pond:{best:{whiskers:9}}},n);sum+=G.fishCoins(s,f,n%10<3,now+(n%5)*G.DAY_MS);}return sum/N;};
 const c4=perCast(4),c8=perCast(8),c30=perCast(30);
 assert.ok(c4>12&&c4<20,`level 4: ${c4.toFixed(1)} a cast (the plan: about 15.6)`);
 assert.ok(15*c8<=.2*1881,`15 casts a day at level 8 (${Math.round(15*c8)}) stay under a fifth of the median day of selling then (1,881 coins, 5-9 Oct)`);
 assert.ok(3*c30<=G.ACTIVITY_ROUND_REWARD.coins,`at the refill pace, 3 an hour at level 30 (${Math.round(3*c30)}) earn less than one helping-hand round`);
 const handHour=Object.values(G.ACTIVE_STATIONS).reduce((sum,a)=>sum+a.xp,0)+G.ACTIVITY_ROUND_REWARD.xp;
 assert.ok(3*xpPerCast<=.1*handHour,'and less than a tenth of a helping hand\'s XP an hour');
 // The first session at level 4: five casts, all of them first catches, stay below the Dairy Barn's price and a level's XP.
 const s=at(4);let coins=0,xp=0;for(let k=0;k<5;k++){const r=fish(s,now+k*GAP);coins+=r.coins;xp+=r.xp;}
 assert.ok(coins<G.BUILDING_COSTS.dairy,`first session ${coins} coins`);assert.ok(xp<G.xpForLevel(5)-G.xpForLevel(4),`and ${xp} XP, less than a level`);
});

// The review (11 Oct 2026): the first session over many farms, not one. Fish 1 to 3 are fixed; fish 4 and 5 come from the farm's seed and
// every new kind pays 3 times, so a Pike, a Golden carp or (0.4% of farms) Old Whiskers among them makes it a big first day. Measured on
// 20,000 seeds x 5 days: without a perfect catch median 152, 95% under 250, 2.3% at 300 or more, at most 834; every catch perfect: median
// 182, 4.9% at 300 or more, at most 1,002. XP: 44 to 92, always under the 95 of level 4. Whether to cap this is the owner's call.
test('balance: the first five fish at level 4 over 4,000 farms and 5 days (the real range, not one farm)',()=>{
 const level4=at(4),gap=G.xpForLevel(5)-G.xpForLevel(4);
 const session=(seed,day,perfect)=>{const s={...level4,rookieUntil:seed*7919+13,pond:undefined},seen=new Set(),t=now+day*G.DAY_MS;let coins=0,xp=0;
  for(let n=0;n<5;n++){const f=G.pondFish(s,n),first=!seen.has(f.species),base=G.fishCoins(s,f,perfect,t);seen.add(f.species);coins+=base*(first?1+G.POND_NEW_FISH_COINS:1);xp+=G.FISH[f.species].xp+(first?G.POND_NEW_FISH_XP:0);}
  return {coins,xp};};
 // The quick sum is the rules' own: the same as five real fish through applyFarmAction.
 for(let seed=1;seed<=40;seed++){const s=at(4);s.rookieUntil=seed*7919+13;let coins=0;for(let k=0;k<5;k++)coins+=fish(s,now+(seed%5)*G.DAY_MS+k*GAP,true,seed%2===0).coins;assert.equal(coins,session(seed,seed%5,seed%2===0).coins,`seed ${seed}`);}
 for(const perfect of [false,true]){
  const all=[];for(let seed=1;seed<=4000;seed++)for(let day=0;day<5;day++)all.push(session(seed,day,perfect));
  const coins=all.map(r=>r.coins).sort((a,b)=>a-b),median=coins[coins.length>>1],over=coins.filter(c=>c>=G.BUILDING_COSTS.dairy).length/coins.length;
  assert.ok(median>=130&&median<=200,`median ${median} coins (perfect ${perfect})`);
  assert.ok(over<(perfect?.07:.04),`${(over*100).toFixed(1)}% of first sessions reach the Dairy Barn's ${G.BUILDING_COSTS.dairy} coins`);
  assert.ok(coins.at(-1)<=1100,`at most ${coins.at(-1)} coins`);assert.ok(all.every(r=>r.xp<gap),'never a whole level of XP');
 }
});

test('every catch is a line in the farm\'s log; the loading tip says the rules\' numbers',()=>{
 const s=at(10),before=snapshot(s),r=fish(s,now);
 const [row]=farmLog({type:'fish',n:0,landed:true,perfect:false},before,s,r);
 assert.equal(row.category,'rewards');assert.equal(row.action,'fish');assert.match(row.text,/^Caught a fish: Minnow, 0\.11 kg · \+\d+ coins · \+12 XP$/);
 const b2=snapshot(s),r2=fish(s,now+GAP,false);assert.equal(farmLog({type:'fish',n:1,landed:false,perfect:false},b2,s,r2)[0].text,'Let a fish go');
 assert.equal(POND_LOADING_TIP[1],`Waiting for your crops? From level ${G.POND_LEVEL} the fishing pond has ${G.POND_START_CASTS} casts for you, and a new one every ${G.POND_REFILL_MS/60000} minutes.`);
 assert.equal(POND_LOADING_TIP[0],'fishingpond');assert.doesNotMatch(POND_LOADING_TIP[1],/ · /);
});

// Release order (new save keys go site first, then farm-api): the game from before the pond (04ba9d7) must read a farm that carries a
// pond and fish counts without throwing, keep them, and play on.
test('a game from before the pond reads a farm with a pond, keeps it and plays on',async t=>{
 let old;try{old=execFileSync('git',['show','04ba9d7:game/farm-state.js'],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=at(12);for(let k=0;k<4;k++)fish(s,now+k*GAP,k!==2,k===0);
 const saved=structuredClone(s);assert.ok(saved.pond&&saved.stats.fish===3&&saved.stats.fish_released===1);
 const copy=structuredClone(saved),tt=now+60000;O.normalizeFarm(copy,tt);
 assert.deepEqual(copy.pond,saved.pond,'the old rules leave the pond as it is');assert.equal(copy.stats.fish,3);
 O.farmSummary(copy,tt);O.unlockEntries(copy);O.dailyTasks(copy,tt);O.dailyOrders(copy,tt);
 const play=action=>{try{O.applyFarmAction(copy,action,tt);}catch(error){if(error instanceof TypeError||error instanceof RangeError||error instanceof ReferenceError)throw error;}};
 const field=copy.plots.findIndex(p=>p.crop&&p.readyAt<=tt);if(field>=0)play({type:'field',id:field,action:'harvest'});
 play({type:'sell',item:'corn',quantity:1});play({type:'field',id:0,action:'plant',crop:'wheat'});
 assert.deepEqual(copy.pond,saved.pond,'and still after playing on');
 assert.throws(()=>O.applyFarmAction(structuredClone(saved),{type:'fish',n:4,landed:true,perfect:false},tt),/Unknown farm action\./,'an old farm-api refuses a fish: the pond opens with farm-api first');
});
