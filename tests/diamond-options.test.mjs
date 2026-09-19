import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,normalizeFarm,productionJobs,diamondUpgradeCost,SINGLE_BATCH_COST,REPLACE_ORDER_COST,DAILY_ORDER_REPLACEMENTS,replacementOptions,dailyOrders,utcDay,DAY_MS,xpForLevel,BUILDINGS,DIAMOND_UPGRADE_COSTS,RECIPES} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,12);
function farm(){const s=createLegacyFarm(now);s.diamonds=10000;s.coins=100000;s.xp=xpForLevel(20);s.levelRewards=Array.from({length:20},(_,i)=>i+1);for(const k in s.inventory)s.inventory[k]=100;for(const k in BUILDINGS)if(BUILDINGS[k].buildCost)s.buildings[k].built=true;delete s.daily;return normalizeFarm(s,now);}
test('finish one batch charges 20 once, preserves other jobs and does not collect',()=>{
 const s=farm();s.buildings.coop.level=3;act(s,{type:'produce',recipe:'eggs',count:3},now);
 const jobs=productionJobs(s.buildings.coop),original=structuredClone(jobs),inventory=structuredClone(s.inventory),diamonds=s.diamonds,xp=s.xp;
 const action={type:'finish_batch',building:'coop',jobId:jobs[1].id,expectedCost:SINGLE_BATCH_COST};
 act(s,action,now);assert.equal(s.diamonds,diamonds-20);assert.equal(jobs[1].readyAt,now);assert.deepEqual(jobs[0],original[0]);assert.deepEqual(jobs[2],original[2]);assert.deepEqual(s.inventory,inventory);assert.equal(s.xp,xp);
 assert.throws(()=>act(s,action,now));assert.equal(s.diamonds,diamonds-20);
 act(s,{type:'collect',building:'coop',jobId:jobs[1].id},now);assert.equal(s.inventory.eggs,inventory.eggs+3);
});
test('invalid batch quotes, foreign jobs and insufficient balance spend nothing',()=>{
 for(const extra of [{expectedCost:1},{building:'bakery'},{jobId:'missing'},{expectedCost:'20'},{}]){
  const s=farm();act(s,{type:'produce',recipe:'eggs'},now);if(!Object.keys(extra).length)s.diamonds=19;
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'finish_batch',building:'coop',jobId:s.buildings.coop.job.id,expectedCost:20,...extra},now));assert.deepEqual(s,before);
 }
});
test('diamond upgrade prices rise every level and retain coins and coin vouchers',()=>{
 const s=farm();s.boosts.upgradeCredits=1;let previous=0;
 for(let level=1;level<10;level++){
  const cost=diamondUpgradeCost(s,'coop'),coins=s.coins,diamonds=s.diamonds;
  assert.ok(cost>previous);assert.equal(cost,DIAMOND_UPGRADE_COSTS[level-1]);
  act(s,{type:'upgrade',building:'coop',currency:'diamonds',expectedCost:cost,expectedLevel:level},now);
  assert.equal(s.buildings.coop.level,level+1);assert.equal(s.coins,coins);assert.equal(s.diamonds,diamonds-cost);assert.equal(s.boosts.upgradeCredits,1);previous=cost;
 }
 assert.equal(diamondUpgradeCost(s,'coop'),null);
 assert.throws(()=>act(s,{type:'upgrade',building:'coop',currency:'diamonds',expectedCost:null,expectedLevel:10},now));
});
test('stale, underfunded, busy and invalid diamond upgrades leave the farm intact',()=>{
 for(const scenario of ['stale','cost','poor','busy','currency','farmhouse']){
  const s=farm(),a={type:'upgrade',building:'coop',currency:'diamonds',expectedCost:25,expectedLevel:1};
  if(scenario==='stale')a.expectedLevel=2;if(scenario==='cost')a.expectedCost=1;if(scenario==='poor')s.diamonds=24;
  if(scenario==='busy')act(s,{type:'produce',recipe:'eggs'},now);if(scenario==='currency')a.currency='free';if(scenario==='farmhouse')a.building='farmhouse';
  const before=structuredClone(s);assert.throws(()=>act(s,a,now));assert.deepEqual(s,before);
 }
});
test('replacement preserves tier and stock, enforces revisions and daily limit',()=>{
 const s=farm(),inventory=structuredClone(s.inventory);let replaced;
 for(let i=0;i<DAILY_ORDER_REPLACEMENTS;i++){
  const order=dailyOrders(s,now).find(o=>replacementOptions(s,o.id,now).length);assert.ok(order);
  const diamonds=s.diamonds,coins=s.coins;
  const action={type:'replace_order',id:order.id,day:utcDay(now),revision:order.revision,expectedCost:REPLACE_ORDER_COST};
  act(s,action,now);const next=dailyOrders(s,now).find(o=>o.id===order.id);assert.notEqual(next.title,order.title);assert.equal(next.tier,order.tier);assert.equal(next.minLevel,order.minLevel);assert.equal(next.revision,order.revision+1);assert.equal(s.diamonds,diamonds-5);assert.equal(s.coins,coins);assert.deepEqual(s.inventory,inventory);
  const before=structuredClone(s);assert.throws(()=>act(s,action,now));assert.deepEqual(s,before);assert.throws(()=>act(s,{type:'delivery',id:order.id,day:utcDay(now),revision:order.revision},now));replaced=next;
 }
 const before=structuredClone(s);assert.throws(()=>act(s,{type:'replace_order',id:replaced.id,day:utcDay(now),revision:replaced.revision,expectedCost:5},now),/both/);assert.deepEqual(s,before);
 const reloaded=normalizeFarm(JSON.parse(JSON.stringify(s)),now);assert.equal(reloaded.daily.replacements,2);assert.deepEqual(reloaded.daily.orderBoard,s.daily.orderBoard);
 act(s,{type:'delivery',id:replaced.id,revision:replaced.revision,day:utcDay(now)},now);assert.ok(s.daily.orders.includes(replaced.id));
 normalizeFarm(s,now+DAY_MS);assert.equal(s.daily.replacements,0);
});
test('delivered orders and wrong price quotes cannot be replaced',()=>{
 const s=farm(),order=dailyOrders(s,now).find(o=>replacementOptions(s,o.id,now).length);
 let before=structuredClone(s);assert.throws(()=>act(s,{type:'replace_order',id:order.id,revision:0,day:utcDay(now),expectedCost:1},now));assert.deepEqual(s,before);
 act(s,{type:'delivery',id:order.id,day:utcDay(now)},now);before=structuredClone(s);
 assert.throws(()=>act(s,{type:'replace_order',id:order.id,revision:0,day:utcDay(now),expectedCost:5},now),/Delivered/);assert.deepEqual(s,before);
});
