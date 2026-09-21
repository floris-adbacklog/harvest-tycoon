import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,productionJobs,RECIPES} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,12);
function fixture(){const s=createFarm(now);s.buildings.windmill.level=5;s.buildings.mill.level=2;for(const k in s.inventory)s.inventory[k]=100;return s;}
test('collect all aggregates mixed recipes, leaves running batches and other buildings untouched',()=>{
 const s=fixture();
 for(const recipe of ['grainmeal','flour','fertilizer'])act(s,{type:'produce',recipe},now);
 act(s,{type:'produce',recipe:'feed'},now);
 const jobs=productionJobs(s.buildings.windmill);jobs[0].readyAt=now;jobs[2].readyAt=now;
 const working=structuredClone(jobs[1]),other=structuredClone(s.buildings.mill),before=structuredClone(s);
 const result=act(s,{type:'collect_all',building:'windmill'},now);
 const items={};for(const recipe of ['grainmeal','fertilizer'])for(const [k,n] of Object.entries(RECIPES[recipe].output))items[k]=(items[k]??0)+n;
 assert.equal(result.count,2);assert.deepEqual(result.items,items);
 for(const [k,n] of Object.entries(items)){assert.equal(s.inventory[k],before.inventory[k]+n);assert.equal(s.stats['made_'+k],(before.stats['made_'+k]??0)+n);}
 assert.equal(s.stats.produced,before.stats.produced+2);assert.equal(s.stats.windmill_batches,(before.stats.windmill_batches??0)+2);
 assert.equal(s.xp,before.xp+result.xp);assert.deepEqual(result.levelReward,{coins:50,diamonds:2,levels:[2,3]});assert.equal(s.coins,before.coins+50);assert.equal(s.diamonds,before.diamonds+2);
 assert.deepEqual(productionJobs(s.buildings.windmill),[working]);assert.deepEqual(s.buildings.mill,other);assert.equal(s.onboarding.milestones.collect,true);
});
test('all ten slots collect once, with double XP applied exactly once to the total',()=>{
 const s=fixture();s.buildings.mill.level=10;
 act(s,{type:'produce',recipe:'feed',count:10},now);for(const j of productionJobs(s.buildings.mill))j.readyAt=now;
 s.boosts.xpUntil=now+60000;const before=s.xp,inventory=s.inventory.feed;
 const r=act(s,{type:'collect_all',building:'mill'},now);
 assert.equal(r.count,10);assert.equal(r.xp,RECIPES.feed.xp*20);assert.equal(s.xp,before+r.xp);assert.equal(s.inventory.feed,inventory+RECIPES.feed.output.feed*10);assert.equal(productionJobs(s.buildings.mill).length,0);
 const snapshot=structuredClone(s);assert.throws(()=>act(s,{type:'collect_all',building:'mill'},now),/No batches/);assert.deepEqual(s,snapshot);
});
test('bulk collection honors outputs and XP stored when each batch started',()=>{
 const s=fixture();act(s,{type:'produce',recipe:'feed',count:2},now);
 const jobs=productionJobs(s.buildings.mill);jobs.forEach(j=>j.readyAt=now);jobs[0].output={feed:7};jobs[0].xp=19;
 const r=act(s,{type:'collect_all',building:'mill'},now);
 assert.equal(r.items.feed,7+RECIPES.feed.output.feed);assert.equal(r.xp,19+RECIPES.feed.xp);
});
test('no-ready and invalid-building requests never award items or remove working batches',()=>{
 const s=fixture();act(s,{type:'produce',recipe:'feed',count:2},now);
 for(const building of ['mill','farmhouse','missing','__proto__',null]){const before=structuredClone(s);assert.throws(()=>act(s,{type:'collect_all',building},now));assert.deepEqual(s,before);}
});
test('bulk collecting bread advances the same recipe quest counters as individual collection',()=>{
 const s=fixture();s.buildings.bakery.level=2;act(s,{type:'produce',recipe:'bread',count:2},now);productionJobs(s.buildings.bakery).forEach(j=>j.readyAt=now);
 const individual=structuredClone(s),r=act(s,{type:'collect_all',building:'bakery'},now);
 act(individual,{type:'collect',building:'bakery'},now);act(individual,{type:'collect',building:'bakery'},now);
 assert.equal(r.count,2);assert.deepEqual(s,individual);
});
