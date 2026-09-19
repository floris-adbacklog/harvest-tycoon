import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,expansionCost,expansionMaterials,tractorQuote,CROPS,ITEMS,RECIPES,normalizeFarm} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
test('each expansion buys exactly one field with increasing coin and mixed supply costs',()=>{
 const s=createFarm(now);s.coins=1e7;let previous=0;
 for(let n=12;n<24;n++){
  const cost=expansionCost(s),materials=expansionMaterials(s),old=structuredClone(s.plots);
  assert(cost>previous);assert(Object.keys(materials).length>=2);Object.assign(s.inventory,materials);
  const balance=s.coins,result=applyFarmAction(s,{type:'expand'},now);
  assert.equal(s.plots.length,n+1);assert.equal(s.coins,balance-cost+(result.levelReward?.coins??0));assert.deepEqual(s.plots.slice(0,n),old);
  for(const k of Object.keys(materials))assert.equal(s.inventory[k],0);
  assert.equal(normalizeFarm(JSON.parse(JSON.stringify(s)),now).plots.length,n+1);previous=cost;
 }
 assert.equal(expansionCost(s),null);const old=structuredClone(s);assert.throws(()=>applyFarmAction(s,{type:'expand'},now),/fully expanded/);assert.deepEqual(s,old);
});
test('missing expansion supplies and insufficient tractor fuel leave balances and plots intact',()=>{
 const s=createFarm(now);s.coins=10000;let old=structuredClone(s);
 assert.throws(()=>applyFarmAction(s,{type:'expand'},now),/supplies/);assert.deepEqual(s,old);
 s.coins=0;old=structuredClone(s);assert.throws(()=>applyFarmAction(s,{type:'tractor',mode:'harvest'},now),/fuel/);assert.deepEqual(s,old);
 s.coins=14;const q=tractorQuote(s,'plant','wheat',now);assert.equal(q.count,0);old=structuredClone(s);
 assert.throws(()=>applyFarmAction(s,{type:'tractor',mode:'plant',crop:'wheat'},now),/fuel/);assert.deepEqual(s,old);
 s.coins=17;assert.equal(tractorQuote(s,'plant','wheat',now).count,1);
 const result=applyFarmAction(s,{type:'tractor',mode:'plant',crop:'wheat'},now);assert.equal(result.count,1);assert.equal(result.cost,17);assert.equal(s.coins,0);
});
test('mixed recipes consume larger batches and remain worth more than their ingredients',()=>{
 for(const recipe of Object.values(RECIPES).filter(r=>Object.keys(r.input).length>1)){
  assert(Object.values(recipe.input).every(n=>n>=2));
  const cost=Object.entries(recipe.input).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);
  const value=Object.entries(recipe.output).reduce((sum,[key,n])=>sum+ITEMS[key].sell*n,0);assert(value>cost,recipe.name);
 }
});
