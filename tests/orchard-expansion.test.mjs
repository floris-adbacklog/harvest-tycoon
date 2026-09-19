import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,CROPS,BUILDINGS,RECIPES,DAY_MS,xpForLevel,cropDuration,seedCost,recipeValue,dailyTasks,dailyOrders,productionJobs,BOOSTS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,12),crops=['greenbeans','apples','berries'],buildings=['kitchen','juicepress','preserves'];
function advanced(){const s=createFarm(now);s.xp=xpForLevel(20);s.coins=100000;s.diamonds=500;return s;}
function open(s){for(const key of buildings)act(s,{type:'construct',building:key},now);}
test('v10 saves retain balances, timers, quests, tutorial and daily snapshots',()=>{
 const s=advanced();s.version=10;s.claimed=[0,31,71];s.onboarding={completed:10,rewardClaimed:true,milestones:{}};
 for(const k of crops){delete s.inventory[k];delete s.stats['harvest_'+k];delete s.mastery.harvests[k];}for(const k of buildings)delete s.buildings[k];
 const before=structuredClone(s);normalizeFarm(s,now);for(const k of ['coins','diamonds','xp','plots','claimed','daily','onboarding'])assert.deepEqual(s[k],before[k]);
 for(const k of crops){assert.equal(s.inventory[k],0);assert.equal(s.mastery.harvests[k],0);}for(const k of buildings)assert.equal(s.buildings[k].built,false);
 assert.deepEqual(normalizeFarm(structuredClone(s),now),s);
});
test('locked crops, recipes and construction reject without charges, including tractor use',()=>{
 const s=createFarm(now);s.coins=100000;
 for(const crop of crops){const before=structuredClone(s);assert.throws(()=>act(s,{type:'field',id:8,action:'plant',crop},now),/Reach level/);assert.throws(()=>act(s,{type:'tractor',mode:'plant',crop},now),/Reach level/);assert.deepEqual(s,before);}
 for(const key of buildings){assert.throws(()=>act(s,{type:'construct',building:key},now),/Reach level/);assert.throws(()=>act(s,{type:'upgrade',building:key},now),/Open this building/);}
 s.xp=xpForLevel(20);for(const k of Object.keys(s.inventory))s.inventory[k]=100;
 for(const key of buildings){const recipe=Object.keys(RECIPES).find(k=>RECIPES[k].building===key);assert.throws(()=>act(s,{type:'produce',recipe},now),/Unlock/);const coins=s.coins;act(s,{type:'construct',building:key,cost:0},now);assert.equal(s.coins,coins-BUILDINGS[key].buildCost);assert.throws(()=>act(s,{type:'construct',building:key},now),/already open/);}
});
for(const crop of ['apples','berries'])test(`${crop} holds only one harvest while offline and resets care after manual picking`,()=>{
 const s=advanced(),coins=s.coins;act(s,{type:'field',id:8,action:'plant',crop},now);const p=s.plots[8],deadline=p.readyAt;
 normalizeFarm(s,now+7*DAY_MS);assert.equal(s.inventory[crop],0);assert.equal(p.readyAt,deadline);
 const r=act(s,{type:'field',id:8,action:'harvest'},now+7*DAY_MS);assert.equal(r.quantity,1);assert.equal(s.coins,coins-seedCost(s,crop));assert.equal(p.readyAt,now+7*DAY_MS+cropDuration(s,crop,true));
 const before=structuredClone(s);assert.throws(()=>act(s,{type:'field',id:8,action:'harvest'},now+7*DAY_MS),/Still growing/);assert.deepEqual(s,before);
 act(s,{type:'field',id:8,action:'water'},now+7*DAY_MS+1);act(s,{type:'field',id:8,action:'tend'},p.careAt);p.fertilized=true;
 const t=p.readyAt,result=act(s,{type:'field',id:8,action:'harvest'},t);assert.equal(result.quantity,3);assert.equal(result.xp,CROPS[crop].xp*2);assert.equal(s.inventory[crop],4);assert.equal(s.mastery.harvests[crop],2);assert.equal(s.stats['harvest_'+crop],4);
 assert.equal(p.watered,false);assert.equal(p.tended,false);assert.equal(p.fertilized,false);assert.equal(p.harvestCycles,2);assert.equal(p.readyAt,t+cropDuration(s,crop,true));
});
test('normal crops clear; removing perennials validates the current cycle and awards nothing',()=>{
 const s=advanced();act(s,{type:'field',id:8,action:'plant',crop:'greenbeans'},now);act(s,{type:'field',id:8,action:'harvest'},s.plots[8].readyAt);assert.equal(s.plots[8].crop,null);
 act(s,{type:'field',id:8,action:'plant',crop:'apples'},now+DAY_MS);const before=structuredClone(s);assert.throws(()=>act(s,{type:'clear_planting',id:8,expectedPlantedAt:now},now+DAY_MS),/changed/);assert.deepEqual(s,before);
 act(s,{type:'clear_planting',id:8,expectedPlantedAt:now+DAY_MS},now+DAY_MS);assert.equal(s.plots[8].crop,null);for(const k of ['inventory','coins','diamonds','xp','mastery'])assert.deepEqual(s[k],before[k]);
});
test('boosts and tractor never collect multiple cycles or grant stock without harvesting',()=>{
 const s=advanced();s.plots.forEach(p=>p.crop=null);act(s,{type:'field',id:0,action:'plant',crop:'apples'},now);act(s,{type:'field',id:1,action:'plant',crop:'berries'},now);
 act(s,{type:'finish_crop',id:0,expectedCost:10},now+1);assert.equal(s.inventory.apples,0);act(s,{type:'tractor',mode:'harvest'},now+2);assert.equal(s.inventory.apples,1);assert.equal(s.inventory.berries,0);
 act(s,{type:'buy_boost',boost:'crops',expectedCost:BOOSTS.crops.cost},now+3);assert.equal(s.inventory.apples,1);act(s,{type:'tractor',mode:'harvest'},now+20000);assert.equal(s.inventory.apples,2);assert.equal(s.inventory.berries,1);
});
test('all new chains support three simultaneous batches and collect-all with positive processing value',()=>{
 const s=advanced();open(s);for(const k of Object.keys(s.inventory))s.inventory[k]=100;
 for(const recipe of ['stew','applejuice','applepie','berrypreserves','berrytart']){const r=RECIPES[recipe],key=Object.keys(r.output)[0];s.buildings[r.building].level=3;const n=s.inventory[key],result=act(s,{type:'produce',recipe,count:3},now);assert.equal(productionJobs(s.buildings[r.building]).length,3);act(s,{type:'collect_all',building:r.building},result.readyAt);assert.equal(s.inventory[key],n+3);assert.ok(recipeValue(recipe).added>0);}
});
test('new tasks and orders wait for buildings and rotate after unlocking',()=>{
 const s=advanced(),seen=new Set(),tasks=new Set();for(let d=1;d<35;d++){const t=now+d*DAY_MS;normalizeFarm(s,t);for(const q of [...dailyTasks(s,t),...dailyOrders(s,t)])assert.ok(!q.requiresBuildings?.length);}
 open(s);for(let d=35;d<220;d++){const t=now+d*DAY_MS;normalizeFarm(s,t);dailyOrders(s,t).forEach(o=>Object.keys(o.input).forEach(k=>seen.add(k)));dailyTasks(s,t).forEach(q=>tasks.add(q.stat));}
 for(const k of ['applejuice','applepie','berrypreserves','berrytart','stew']){assert.ok(seen.has(k),k);assert.ok(tasks.has('made_'+k),k);}
});

test('Starter Pack SQL awards every crop once and all expansion assets exist',async()=>{
 const {readFileSync,existsSync}=await import('node:fs');
 const sql=readFileSync(new URL('../supabase/orchard-expansion.sql',import.meta.url),'utf8');
 const ids=[...sql.match(/foreach crop in array array\[([^\]]+)\]/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 assert.deepEqual(ids.slice().sort(),Object.keys(CROPS).sort());assert.equal(new Set(ids).size,12);
 for(const id of [...crops,'applejuice','applepie','berrypreserves','berrytart','stew',...buildings])assert.ok(existsSync(new URL(`../public/assets/icons/${id}.png`,import.meta.url)),id);
 for(const model of ['plant_006','tree_009','bush_003','house_011','hangar_005','hangar_002'])assert.ok(existsSync(new URL(`../public/assets/models/${model}.glb`,import.meta.url)),model);
});
