import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,productionJobs,dailyOrders,utcDay,ORDER_POOL,deliveryDiamonds} from '../game/farm-state.js';
import {clearCropVisual,loadInBatches} from '../public/render-resources.js';
const now=Date.UTC(2026,8,18,12);
test('bulk production fills exactly the requested slots and consumes ingredients once',()=>{
 for(let level=2;level<=10;level++){
  const s=createFarm(now);s.buildings.mill.level=level;s.inventory.corn=level*2;
  const r=act(s,{type:'produce',recipe:'feed',count:level},now);
  assert.equal(r.count,level);assert.equal(s.inventory.corn,0);assert.equal(productionJobs(s.buildings.mill).length,level);
  assert.equal(new Set(r.batches.map(b=>b.jobId)).size,level);assert.equal(s.stats.parallel_batches,level-1);
 }
});
test('invalid bulk production never partly consumes stock or starts jobs',()=>{
 const s=createFarm(now);s.buildings.mill.level=3;s.inventory.corn=4;
 for(const count of [0,-1,1.5,11,'2',null,3,4]){const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'produce',recipe:'feed',count},now));assert.equal(JSON.stringify(s),before);}
});
test('multi-field fertilizer is atomic, charges per field and preserves replay protection',()=>{
 const s=createFarm(now);s.inventory.fertilizer=3;
 for(let id=0;id<3;id++)s.plots[id]={...s.plots[id],crop:'corn',readyAt:now+100000,plantedAt:now,watered:false,fertilized:false};
 for(const ids of [[0,0],[0,99],[0,1,2,3],[],null]){const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'fertilize',ids},now));assert.equal(JSON.stringify(s),before);}
 s.boosts.xpUntil=now+999999;const r=act(s,{type:'fertilize',ids:[0,2]},now);
 assert.equal(r.cost,2);assert.equal(r.xp,20);assert.equal(s.inventory.fertilizer,1);assert.equal(s.plots[0].readyAt,now+65000);assert.equal(s.plots[1].fertilized,false);
 const before=JSON.stringify(s);assert.throws(()=>act(s,{type:'fertilize',ids:[1,2]},now));assert.equal(JSON.stringify(s),before);
});
test('delivery diamonds scale from 1 to 4, ignore boosts, and never pay twice',()=>{
 assert.deepEqual([...new Set(ORDER_POOL.map(deliveryDiamonds))].sort(),[1,2,3,4]);
 const s=createFarm(now),order=dailyOrders(s,now)[0];Object.assign(s.inventory,order.input);s.boosts.coinsUntil=now+99999;s.boosts.xpUntil=now+99999;
 const before=s.diamonds,r=act(s,{type:'delivery',id:order.id,day:utcDay(now)},now);
 assert.equal(r.diamonds,order.diamonds);assert.equal(s.diamonds,before+order.diamonds);
 assert.throws(()=>act(s,{type:'delivery',id:order.id,day:utcDay(now)},now));assert.equal(s.diamonds,before+order.diamonds);
});
test('crop cleanup releases owned materials exactly once without disposing shared assets',()=>{
 let disposed=0,cleared=0;const shared={userData:{},dispose(){throw Error('shared asset');}},owned={userData:{farmCropOwned:true},dispose(){disposed++;}};
 clearCropVisual({traverse(fn){fn({material:shared});fn({material:[owned,owned]});},clear(){cleared++;}});
 assert.equal(disposed,1);assert.equal(cleared,1);
});
test('model loading caps concurrency and propagates load failures',async()=>{
 let active=0,peak=0,done=0;
 await loadInBatches(Array.from({length:75},(_,i)=>i),async()=>{active++;peak=Math.max(peak,active);await new Promise(r=>setTimeout(r,1));active--;done++;},4);
 assert.equal(done,75);assert.equal(peak,4);
 await assert.rejects(loadInBatches([1],async()=>{throw Error('Model failed');}),/Model failed/);
});
