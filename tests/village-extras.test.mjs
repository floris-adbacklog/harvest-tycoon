import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,dailyTasks,availableDaily,dayNumber,utcDay,
 BUILDINGS,DAILY_POOLS,MAX_BUILDING_LEVEL,worldTwoBuilding} from '../game/farm-state.js';
import {EVENT_GOAL_POOLS} from '../public/event-goals.js';

// World II's two extras (Oct 2026, the owner's choice): the daily "Village errands" from level 100, and the leaderboard "Villagers helped".
const now=Date.parse('2026-10-05T12:00:00Z'),DAY=86400000;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Every building built (the farm's at level 10), as tests/world-two.test.mjs has it; guided or legacy.
function farm(level,mode='guided'){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=true;if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}
 return normalizeFarm(s,now);
}
// A farm as a player has it at that level: the farm's buildings not built yet, none of the village's places.
function playerFarm(level,mode='guided'){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=400000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};return normalizeFarm(s,now);
}
const errands=q=>q.stat==='village_requests';

test('Village errands: one daily last in each pool, from level 100, never drawn below it; the pools below 100 draw as before',()=>{
 const found=DAILY_POOLS.flat().filter(errands);
 assert.deepEqual(found,DAILY_POOLS.map(pool=>pool.at(-1)),'last in every pool');
 assert.deepEqual(found.map(q=>q.title),['Market square errands','Village errands','Errands for the villagers']);
 for(const q of found)assert.deepEqual({...q,title:''},{stat:'village_requests',target:2,description:'Help 2 villagers at the market square.',reward:800,minLevel:100,title:''});
 const titles=DAILY_POOLS.flat().map(q=>q.title);assert.equal(new Set(titles).size,titles.length,'every daily title once');
 assert.deepEqual(DAILY_POOLS.map(pool=>pool.length),[21,26,22],'one more in each pool (20, 25 and 21 before)');
 // Below level 100 a farm's eligible dailies, and so its draws (eligible[(day+id)%length]), are the pools' without the errands.
 const before=DAILY_POOLS.map(pool=>pool.filter(q=>!errands(q)));
 for(const mode of ['guided','legacy'])for(const level of [5,15,20,40,60,80,95,99])for(const s of [farm(level,mode),playerFarm(level,mode)]){
  assert.ok(DAILY_POOLS.flat().filter(errands).every(q=>!availableDaily(s,q)),`${mode} ${level}`);
  for(let d=0;d<60;d++){
   const t=now+d*DAY;delete s.daily;const drawn=dailyTasks(s,t).map(q=>q.title);
   const expected=before.map((pool,id)=>{const eligible=pool.filter(q=>availableDaily(s,q));return eligible.length?eligible[(dayNumber(t)+id)%eligible.length].title:drawn[id];});
   assert.deepEqual(drawn,expected,`${mode} ${level} day ${d}`);
   assert.ok(!drawn.some(title=>found.some(q=>q.title===title)),`${mode} ${level} day ${d}`);
  }
 }
 for(const s of [farm(99),farm(99,'legacy'),playerFarm(60)])for(let d=0;d<400;d++){delete s.daily;assert.ok(dailyTasks(s,now+d*DAY).every(q=>!errands(q)),`day ${d}`);}
 // A villager comes only with packed lunches to ask for: from the Kitchen or the Miners' Canteen (Oct 2026).
 for(const mode of ['guided','legacy']){
  const s=farm(150,mode),q=found[1];assert.equal(availableDaily(s,q),true);
  s.buildings.kitchen.built=false;assert.equal(availableDaily(s,q),true,`${mode}: the Canteen alone`);
  s.buildings.canteen.built=false;assert.equal(availableDaily(s,q),false,`${mode}: no Kitchen, no Canteen`);
  assert.equal(availableDaily(farm(100,mode),q),true);assert.equal(availableDaily(farm(99,mode),q),false);
 }
});

test('Village errands from level 100: about one day in 7, two helps fill it, Claim pays like its pool',()=>{
 for(const mode of ['guided','legacy']){
  const s=farm(120,mode),days=[];
  for(let d=0;d<=400;d++){delete s.daily;dailyTasks(s,now+d*DAY).forEach((q,slot)=>{if(errands(q))days.push([d,slot]);});}
  assert.deepEqual(days.filter(([d])=>d<=50),[[6,2],[15,1],[16,0],[26,2],[37,0],[41,1],[46,2]],mode);
  const many=new Set(days.map(([d])=>d)).size;assert.ok(many>=50&&many<=60,`${mode}: ${many} days of 401`);
 }
 // Day 15: the errand in slot 1; two villagers helped fill it, and Claim pays 800 coins, 10 XP and pool 1's diamond.
 const t=now+15*DAY,s=farm(120);delete s.daily;normalizeFarm(s,t);
 const task=dailyTasks(s,t)[1];assert.deepEqual([task.title,task.progress,task.target,task.diamonds],['Village errands',0,2,1]);
 for(const board of [0,1]){const r=s.village.boards[board].request;Object.assign(s.inventory,r.input);applyFarmAction(s,{type:'village_deliver',board,request:r.id,input:r.input},t);}
 assert.equal(dailyTasks(s,t)[1].progress,2);
 const got=applyFarmAction(s,{type:'daily',id:1,day:utcDay(t)},t);assert.deepEqual([got.coins,got.xp,got.diamonds],[800,10,1]);
});

// Review fix (10 Oct 2026): with the errands in all three pools, two pools could draw them on the same day, and two helps paid both.
test('the three dailies never count the same thing: one Village errands a day at most, from level 100 to 200',()=>{
 // Only the farm's buildings and the Mine and Lumber Camp, as the review's farm had it; and every place built.
 const early=(level,mode)=>{const s=farm(level,mode);for(const k of Object.keys(s.buildings))if(worldTwoBuilding(k)&&k!=='mine'&&k!=='lumbercamp')s.buildings[k].built=false;return s;};
 for(const mode of ['guided','legacy'])for(const level of [100,120,160,200])for(const s of [farm(level,mode),early(level,mode)]){
  let errandDays=0;
  for(let d=0;d<365;d++){
   const t=now+d*DAY;delete s.daily;const drawn=dailyTasks(s,t),stats=drawn.map(q=>q.stat);
   assert.equal(new Set(stats).size,3,`${mode} ${level} day ${d}: ${drawn.map(q=>q.title).join(', ')}`);
   // A pool draws again only when its first draw is a goal an earlier pool already has; every other draw is eligible[(day+id)%length].
   drawn.forEach((q,id)=>{const eligible=DAILY_POOLS[id].filter(p=>availableDaily(s,p)),first=eligible[(dayNumber(t)+id)%eligible.length];if(!stats.slice(0,id).includes(first.stat))assert.equal(q.title,first.title,`${mode} ${level} day ${d} slot ${id}`);});
   if(stats.includes('village_requests'))errandDays++;
  }
  assert.ok(errandDays>=40&&errandDays<=60,`${mode} ${level}: errands on ${errandDays} days of 365`);
 }
 // The two days the review found: one errands card, and two helps fill only that one.
 for(const day of ['2027-02-24','2027-05-19']){
  const t=Date.parse(`${day}T12:00:00Z`),s=early(105,'guided');delete s.daily;
  const drawn=dailyTasks(s,t);assert.equal(drawn.filter(errands).length,1,day);
  s.stats.village_requests=(s.stats.village_requests??0)+2;
  const filled=dailyTasks(s,t).filter(q=>q.progress>=q.target);assert.deepEqual(filled.map(q=>q.stat),['village_requests'],day);
  const id=drawn.findIndex(errands),got=applyFarmAction(s,{type:'daily',id,day:utcDay(t)},t);assert.equal(got.coins,800,day);
  for(const other of [0,1,2].filter(n=>n!==id))assert.throws(()=>applyFarmAction(s,{type:'daily',id:other,day:utcDay(t)},t),/Finish this daily challenge first/,day);
 }
});

test('no live event goal counts the village',()=>{
 const village=new Set(['village_requests','village_landmarks','village_sold','village_earned','village_batches','market_crates','builder_crates_used','boat_trips','boat_loaded','boat_coins']);
 assert.ok(!EVENT_GOAL_POOLS.flat(2).some(g=>village.has(g.stat)));
});

// The board's database side (supabase/world-two-phase-2-5.sql): a column filled from the farm's stats.village_requests on every save, readable
// like the other board columns, once for every farm, and the seven new places left out of "Most building upgrades".
test('the Villagers helped board reads its own column, filled from the farm on every save; the new places are not building upgrades',()=>{
 const sql=read('supabase/world-two-phase-2-5.sql');
 assert.match(sql,/add column if not exists villagers_helped integer not null default 0;\ngrant select \(villagers_helped\) on public\.player_stats to authenticated;/);
 assert.match(sql,/new\.villagers_helped:=\(farm#>>''\{stats,village_requests\}''\)::integer/);
 assert.match(sql,/''smithy'',''villagemill'',''villagefields'',''canteen'',''kiln'',''linenloft'',''soapmaker'',''pier'',''jeweller''\)/);
 assert.equal((sql.match(/raise exception/g)??[]).length,2,'both replacements must find their text');
 assert.match(sql,/disable trigger player_stats_updated_at;\nupdate public\.player_stats set villagers_helped=villagers_helped;\nalter table public\.player_stats enable trigger player_stats_updated_at;/);
 const places=Object.keys(BUILDINGS).filter(worldTwoBuilding);assert.equal(places.length,11);
 for(const key of places)assert.ok(sql.includes(`''${key}''`)||read('supabase/leaderboard-world-two.sql').includes(`''${key}''`),key);
});
