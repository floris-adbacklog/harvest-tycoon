import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,QUESTS,DAILY_POOLS,ORDER_POOL,ITEMS,DAY_MS,utcDay,dailyTasks,dailyOrders,xpForLevel,dayNumber,marketValue,COMMISSION_POOL,PRODUCTS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,18,12);
test('new quests append to old IDs and keep beginner and claimed progress',()=>{
 const s=createFarm(now);s.version=9;s.claimed=[0,31,40];s.onboarding.completed=10;s.onboarding.rewardClaimed=true;
 s.activities.completed={greenhouse:10,apiary:5,paddock:10,workshop:10};s.activities.rounds=3;s.siloLevel=3;
 for(const q of QUESTS.slice(41))delete s.stats[q.stat];
 normalizeFarm(s,now);assert.deepEqual(s.claimed,[0,31,40]);assert.equal(s.onboarding.rewardClaimed,true);
 assert.equal(QUESTS.length,85);assert.equal(QUESTS[31].title,'A lifelong grower');assert.equal(QUESTS[40].title,'Pumpkin perfection');
 assert.equal(s.stats.activity_apiary,5);assert.equal(s.stats.activity_rounds,3);assert.equal(s.stats.silo_upgrades,3);
 const id=QUESTS.findIndex(q=>q.title==='A taste of honey');act(s,{type:'quest',id},now);
 assert.throws(()=>act(s,{type:'quest',id},now),/already/);
 assert.throws(()=>act(s,{type:'quest',id:QUESTS.findIndex(q=>q.stat==='chore_sorting')},now),/Finish/);
});
test('new day selections stay fixed through level-ups, upgrades and reloads',()=>{
 const s=createFarm(now),tasks=dailyTasks(s,now),orders=dailyOrders(s,now);
 s.xp=xpForLevel(20);s.buildings.mill.level=5;s.chorePractice={weeds:20,troughs:20};
 assert.deepEqual(dailyTasks(s,now),tasks);assert.deepEqual(dailyOrders(s,now),orders);
 const reloaded=JSON.parse(JSON.stringify(s));assert.deepEqual(dailyTasks(reloaded,now),tasks);assert.deepEqual(dailyOrders(reloaded,now),orders);
 normalizeFarm(s,now+DAY_MS);assert.deepEqual(s.daily.claimed,[]);assert.deepEqual(s.daily.orders,[]);
 assert.throws(()=>act(s,{type:'delivery',id:0,day:utcDay(now)},now+DAY_MS),/refreshed/);
});
test('old daily progress and order identities survive the migration until midnight',()=>{
 const s=createFarm(now);s.version=9;delete s.daily.tasks;delete s.daily.orderBoard;
 s.daily.claimed=[0];s.daily.orders=[1];s.daily.bonusClaimed=false;
 const d=dayNumber(now),legacyTitles=['The village grocer','Breakfast at the inn','The flower stall','Sunday lunch','The baker next door','A picnic in the park','Autumn pantry'];
 normalizeFarm(s,now);
 assert.deepEqual(dailyOrders(s,now).map(o=>o.title),[0,2,4].map(offset=>legacyTitles[(d+offset)%7]));
 assert.equal(dailyTasks(s,now)[0].claimed,true);assert.equal(dailyOrders(s,now)[1].done,true);
 assert.deepEqual(dailyTasks(s,now).map(q=>q.stat),[['harvested','watered','planted'],['produced','made_milk','made_eggs'],['earned','deliveries','harvest_wheat']].map((pool,id)=>pool[(d+id)%3]));
 const snapshot=JSON.stringify(s.daily);normalizeFarm(s,now);assert.equal(JSON.stringify(s.daily),snapshot);
});
test('daily rotation covers accessible orders without locked chores or parallel goals for starters',()=>{
 assert.equal(DAILY_POOLS.flat().length,36);assert.equal(ORDER_POOL.length,28);
 const tasksSeen=new Set(),ordersSeen=new Set();
 for(let day=0;day<180;day++){
  const t=now+day*DAY_MS,s=createFarm(t);
  for(const q of dailyTasks(s,t)){assert.ok(!q.chore);assert.ok(!q.parallel);assert.ok((q.minLevel??1)<=1);}
  for(const o of dailyOrders(s,t))assert.ok(o.minLevel<=1);
  s.xp=xpForLevel(20);for(const b of Object.values(s.buildings))b.built=true;s.buildings.mill.level=3;s.chorePractice={weeds:20,troughs:20};
  normalizeFarm(s,t+DAY_MS);
  dailyTasks(s,t+DAY_MS).forEach(q=>tasksSeen.add(q.title));
  const orders=dailyOrders(s,t+DAY_MS);assert.equal(new Set(orders.map(o=>o.title)).size,3);
  orders.forEach(o=>{ordersSeen.add(o.title);assert.equal(o.coins,Math.ceil(marketValue(o.input,t+DAY_MS)*(100+o.bonus)/100));});
 }
 assert.equal(tasksSeen.size,36);for(const o of ORDER_POOL.filter(o=>o.minLevel===1||Object.keys(o.input).some(k=>k!=='honey'&&PRODUCTS[k])))assert.ok(ordersSeen.has(o.title),o.title);for(const o of COMMISSION_POOL.filter(o=>o.minLevel===16))assert.ok(ordersSeen.has(o.title));
});
test('new progress only counts accepted actions; failed chores and ready queues do not count',()=>{
 const s=createFarm(now);act(s,{type:'chore',id:'weeds'},now,()=>.99);assert.equal(s.stats.chore_weeds,0);
 act(s,{type:'chore',id:'weeds'},now+60000,()=>0);assert.equal(s.stats.chore_weeds,1);
 s.buildings.mill.level=2;s.inventory.corn=20;
 act(s,{type:'produce',recipe:'feed'},now);act(s,{type:'produce',recipe:'feed'},now+1);assert.equal(s.stats.parallel_batches,1);
 assert.throws(()=>act(s,{type:'produce',recipe:'feed'},now+2),/slots/);assert.equal(s.stats.parallel_batches,1);
 act(s,{type:'collect',building:'mill'},now+999999);act(s,{type:'produce',recipe:'feed'},now+999999);assert.equal(s.stats.parallel_batches,1);
});
test('Honey deliveries consume stock once and advance the dedicated quest',()=>{
 let s,t,order;
 for(let day=0;day<10;day++){t=now+day*DAY_MS;s=createFarm(t);order=dailyOrders(s,t).find(o=>o.input.honey);if(order)break;}
 assert.ok(order);Object.assign(s.inventory,order.input);const coins=s.coins;
 act(s,{type:'delivery',id:order.id,day:utcDay(t)},t);
 assert.equal(s.stats.honey_deliveries,1);assert.equal(s.inventory.honey,0);assert.equal(s.coins,coins+order.coins);
 assert.throws(()=>act(s,{type:'delivery',id:order.id,day:utcDay(t)},t),/already/);assert.equal(s.stats.honey_deliveries,1);
});
