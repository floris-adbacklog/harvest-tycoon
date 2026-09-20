import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,RECIPES,ITEMS,QUESTS,DAILY_POOLS,ORDER_POOL,COMMISSION_POOL,DAY_MS,xpForLevel,recipeAvailability,productionJobs,marketQuote,dailyTasks,dailyOrders,utcDay} from '../game/farm-state.js';
const ids=['orchardjuice','berrysmoothie','applecompote','applevinegar','pickledbeans','beangratin','orchardsalad','berrycheesecake','harvesthamper'];
const now=Date.UTC(2026,8,19,12);
function farm(){const s=createFarm(now);s.xp=xpForLevel(20);for(const b of Object.values(s.buildings)){b.built=true;b.level=3;}for(const k of Object.keys(s.inventory))s.inventory[k]=100;return s;}
test('new recipes reserve bulk ingredients, preserve running batches and reward collection once',()=>{
 for(const id of ids){const s=farm(),r=RECIPES[id],before=structuredClone(s.inventory),coins=s.coins,diamonds=s.diamonds;
 const result=act(s,{type:'produce',recipe:id,count:3},now);assert.equal(productionJobs(s.buildings[r.building]).length,3);
 for(const [k,n] of Object.entries(r.input))assert.equal(s.inventory[k],before[k]-n*3);assert.equal(s.inventory[id],before[id]);
 assert.throws(()=>act(s,{type:'collect_all',building:r.building},result.readyAt-1),/ready/);
 const saved=normalizeFarm(JSON.parse(JSON.stringify(s)),result.readyAt);assert.equal(saved.stats['made_'+id],0);
 act(saved,{type:'collect_all',building:r.building},result.readyAt);assert.equal(saved.inventory[id],before[id]+3);assert.equal(saved.stats['made_'+id],3);assert.equal(saved.stats.produced,3);
 assert.throws(()=>act(saved,{type:'collect_all',building:r.building},result.readyAt),/ready|Nothing/);assert.equal(saved.coins,coins);assert.equal(saved.diamonds,diamonds);
 }
});
test('new recipe locks cannot be bypassed with inventory or forged prices',()=>{
 for(const id of ids){const s=farm(),r=RECIPES[id];s.xp=xpForLevel(r.minLevel-1);const before=structuredClone(s);
 assert.equal(recipeAvailability(s,id).locked,true);assert.throws(()=>act(s,{type:'produce',recipe:id,count:1,cost:0},now),/Unlock/);assert.deepEqual(s,before);
 for(const building of r.requiresBuildings??[]){const f=farm();f.buildings[building].built=false;assert.equal(recipeAvailability(f,id).locked,true);assert.throws(()=>act(f,{type:'produce',recipe:id},now),/Unlock/);}
 }
});
test('apple juice must be collected before vinegar, and vinegar before pickled beans',()=>{
 const s=farm();s.inventory.applejuice=0;s.inventory.applevinegar=0;s.inventory.pickledbeans=0;
 assert.throws(()=>act(s,{type:'produce',recipe:'applevinegar'},now),/Missing/);
 let t=now;for(const [id,count] of [['applejuice',2],['applevinegar',2],['pickledbeans',1]]){
  const r=act(s,{type:'produce',recipe:id,count},t);t=r.readyAt;act(s,{type:'collect_all',building:RECIPES[id].building},t);
 }
 assert.equal(s.inventory.applejuice,0);assert.equal(s.inventory.applevinegar,0);assert.equal(s.inventory.pickledbeans,1);
});
test('existing save balances, claims, production and daily snapshots survive the expansion',()=>{
 const s=farm();s.version=11;s.claimed=[0,20,84];for(const id of ids){delete s.inventory[id];delete s.stats['made_'+id];}
 const before=structuredClone(s);normalizeFarm(s,now);
 for(const key of ['coins','diamonds','claimed','daily','plots','onboarding','buildings'])assert.deepEqual(s[key],before[key]);
 for(const id of ids){assert.equal(s.inventory[id],0);assert.equal(s.stats['made_'+id],0);}assert.equal(s.version,14);
});
test('all products have positive base processing margins, variable prices and reachable objectives',()=>{
 for(const id of ids){const r=RECIPES[id],cost=Object.entries(r.input).reduce((n,[k,q])=>n+ITEMS[k].sell*q,0);assert.ok(ITEMS[id].sell>=cost*1.35,id);assert.ok(QUESTS.some(q=>q.stat==='made_'+id));assert.ok(DAILY_POOLS.flat().some(q=>q.stat==='made_'+id));assert.ok(ORDER_POOL.some(o=>o.input[id]));
 const prices=new Set(Array.from({length:60},(_,d)=>marketQuote(id,now+d*DAY_MS).price));assert.ok(prices.size>3,id);
 }
});
test('special hamper commission pays coins and diamonds once; locked buildings never get its orders',()=>{
 const s=farm();let t=now,order;
 for(let d=1;d<100;d++){t=now+d*DAY_MS;order=dailyOrders(s,t).find(o=>o.input.harvesthamper===2&&o.tier==='commission');if(order)break;}
 assert.ok(order);assert.ok(order.coins>order.marketValue);assert.ok(order.diamonds>=8);const coins=s.coins,diamonds=s.diamonds;
 const result=act(s,{type:'delivery',id:order.id,day:utcDay(t)},t);assert.equal(s.coins,coins+result.coins);assert.equal(s.diamonds,diamonds+result.diamonds);
 assert.throws(()=>act(s,{type:'delivery',id:order.id,day:utcDay(t)},t),/already delivered/);
 const locked=farm();locked.buildings.preserves.built=false;for(let d=1;d<50;d++)for(const q of [...dailyTasks(locked,now+d*DAY_MS),...dailyOrders(locked,now+d*DAY_MS)])assert.ok(!q.requiresBuildings?.includes('preserves'));
});
