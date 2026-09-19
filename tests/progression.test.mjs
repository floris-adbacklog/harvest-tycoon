import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,CROPS,BUILDINGS,RECIPES,cropUnlocked,buildingUnlocked,buildingEligible,featureUnlocked,recipeUnlocked,itemAvailable,beginnerProgress,xpForLevel,levelOf,dailyTasks,dailyOrders,DAY_MS,productionJobs} from '../game/farm-state.js';
import {progressionSnapshot,progressionChange} from '../public/progression-ui.js';
const now=Date.UTC(2026,8,19,12);
function level(s,n){s.xp=xpForLevel(n);s.xpOffset=0;}
function gather(s,crop,count){s.inventory[crop]=count;}
function produce(s,recipe,t=now){act(s,{type:'produce',recipe},t);const key=RECIPES[recipe].building,job=productionJobs(s.buildings[key]).at(-1);act(s,{type:'collect',building:key,jobId:job.id},job.readyAt);return job.readyAt;}
test('new farm starts with two crops, two buildings and achievable daily tasks',()=>{
 const s=createFarm(now);assert.deepEqual(Object.keys(CROPS).filter(k=>cropUnlocked(s,k)),['corn','wheat']);
 assert.deepEqual(Object.keys(BUILDINGS).filter(k=>buildingUnlocked(s,k)),['farmhouse','coop']);
 assert.ok(s.plots.every(p=>!p.crop||['wheat','corn'].includes(p.crop)));
 assert.ok(recipeUnlocked(s,'eggs'));assert.ok(!recipeUnlocked(s,'oil'));
 for(const key of ['chores','activities','projects','tractor','silo','cart','boosts'])assert.equal(featureUnlocked(s,key),false,key);
 for(const task of dailyTasks(s,now))assert.ok(task.title&&task.target>0);
});
test('gates reject forged actions without spending inventory or balances',()=>{
 for(const action of [{type:'field',id:8,action:'plant',crop:'cabbage'},{type:'produce',recipe:'milk'},{type:'upgrade',building:'bakery'},{type:'chore',id:'weeds'},{type:'activity_start',station:'greenhouse'},{type:'tractor',mode:'plant',crop:'wheat'},{type:'silo_upgrade'},{type:'project_start'},{type:'buy_boost',boost:'xp',expectedCost:25}]){
  const s=createFarm(now),before=structuredClone(s);assert.throws(()=>act(s,action,now));assert.deepEqual(s,before,JSON.stringify(action));
 }
});
test('collecting and selling an egg unlocks hands-on jobs and the beginner milestone',()=>{
 const s=createFarm(now);const t=produce(s,'eggs');assert.equal(featureUnlocked(s,'activities'),false);
 const before=progressionSnapshot(s);act(s,{type:'sell',item:'eggs',quantity:1},t);
 assert.equal(s.inventory.eggs,2);assert.equal(s.stats.sold_eggs,1);assert.equal(featureUnlocked(s,'activities'),true);
 assert.equal(beginnerProgress(s).find(q=>q.id==='sell_egg').ready,true);
 assert.ok(progressionChange(before,s).entries.some(e=>e.id==='feature:activities'));
 act(s,{type:'activity_start',station:'greenhouse'},t);assert.ok(s.activities.jobs.greenhouse);
});
test('level unlocks follow a viable chain to bread; cabbage requires actual collection',()=>{
 const s=createFarm(now);s.coins=100000;
 level(s,2);assert.ok(buildingUnlocked(s,'mill'));assert.ok(cropUnlocked(s,'lettuce'));gather(s,'corn',2);produce(s,'feed');
 level(s,3);assert.ok(buildingUnlocked(s,'dairy'));produce(s,'milk');assert.ok(!buildingUnlocked(s,'bakery'));
 level(s,4);assert.ok(cropUnlocked(s,'barley'));assert.ok(buildingUnlocked(s,'windmill'));gather(s,'wheat',8);gather(s,'barley',4);produce(s,'grainmeal');produce(s,'flour');
 level(s,5);assert.ok(buildingUnlocked(s,'bakery'));assert.ok(!cropUnlocked(s,'cabbage'));assert.ok(!buildingUnlocked(s,'packing'));
 act(s,{type:'produce',recipe:'bread'},now);assert.equal(cropUnlocked(s,'cabbage'),false);
 const before=progressionSnapshot(s);act(s,{type:'collect',building:'bakery'},s.buildings.bakery.job.readyAt);
 assert.ok(cropUnlocked(s,'cabbage'));assert.ok(buildingUnlocked(s,'packing'));
 assert.ok(progressionChange(before,s).entries.some(e=>e.id==='crop:cabbage'));
 normalizeFarm(s,now+DAY_MS);assert.ok(cropUnlocked(s,'cabbage'));
});
test('legacy saves retain access, balances, ongoing jobs, quests and beginner reward',()=>{
 const s=createFarm(now);delete s.progression;s.version=12;s.coins=12345;s.diamonds=77;s.claimed=[1,2];s.onboarding={completed:10,rewardClaimed:true,milestones:{}};
 s.buildings.bakery.job={id:'saved',recipe:'bread',startedAt:now,readyAt:now+1000};
 const before=structuredClone(s);normalizeFarm(s,now);
 for(const k of Object.keys(CROPS).filter(k=>!CROPS[k].minLevel))assert.ok(cropUnlocked(s,k),k);
 for(const k of Object.keys(BUILDINGS).filter(k=>!BUILDINGS[k].buildCost))assert.ok(buildingUnlocked(s,k),k);
 for(const k of ['activities','chores','projects','boosts','cart'])assert.ok(featureUnlocked(s,k));
 for(const key of ['coins','diamonds','claimed','onboarding','plots','daily'])assert.deepEqual(s[key],before[key]);
 assert.equal(s.buildings.bakery.job.id,'saved');assert.equal(s.buildings.bakery.job.readyAt,now+1000);
 assert.throws(()=>act(s,{type:'beginner_claim',id:'collect'},now),/complete/);
});
test('new daily boards never demand locked ingredients across levels and days',()=>{
 for(let lvl=1;lvl<=12;lvl++)for(let day=0;day<8;day++){
  const t=now+day*DAY_MS,s=createFarm(t);level(s,lvl);if(lvl>=5)s.stats.made_bread=2;
  if(lvl>=3)s.stats.sold_eggs=1;
  for(const k of ['kitchen','juicepress','preserves'])if(buildingEligible(s,k))s.buildings[k].built=true;
  delete s.daily;normalizeFarm(s,t);
  for(const o of dailyOrders(s,t))for(const item of Object.keys(o.input))assert.ok(itemAvailable(s,item),`${lvl}: ${o.title}: ${item}`);
  for(const q of dailyTasks(s,t)){assert.ok(q.title);if(q.stat.startsWith('made_'))assert.ok(itemAvailable(s,q.stat.slice(5)));if(q.stat.startsWith('harvest_'))assert.ok(cropUnlocked(s,q.stat.slice(8)));}
 }
});
test('level-up reports all new unlocks once, without modifying rewards',()=>{
 const s=createFarm(now),before=progressionSnapshot(s),coins=s.coins,diamonds=s.diamonds;level(s,3);
 const event=progressionChange(before,s);assert.equal(event.leveled,true);assert.equal(event.level,3);
 for(const id of ['building:mill','building:dairy','crop:lettuce','feature:chores'])assert.ok(event.entries.some(e=>e.id===id));
 assert.equal(s.coins,coins);assert.equal(s.diamonds,diamonds);
 assert.deepEqual(progressionChange(progressionSnapshot(s),s).entries,[]);
});
test('all ten guided steps are achievable without forced level jumps and pay once',()=>{
 const s=createFarm(now);
 act(s,{type:'field',id:0,action:'harvest'},now);
 act(s,{type:'field',id:8,action:'plant',crop:'wheat'},now);
 act(s,{type:'field',id:8,action:'water'},now);
 act(s,{type:'sell',item:'corn',quantity:1},now);
 act(s,{type:'produce',recipe:'eggs'},now);
 act(s,{type:'checkin'},now);
 act(s,{type:'field',id:8,action:'tend'},now+40000);
 act(s,{type:'field',id:8,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);
 act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 const diamonds=s.diamonds;
 for(const q of beginnerProgress(s)){assert.equal(q.ready,true,q.id);act(s,{type:'beginner_claim',id:q.id},now+300000);}
 assert.equal(s.onboarding.completed,10);assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds,diamonds+20);
 assert.throws(()=>act(s,{type:'beginner_claim',id:'collect'},now+300000));
});
