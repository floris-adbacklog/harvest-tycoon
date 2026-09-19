import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,marketQuote,utcDay} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,12);
test('partial sale preserves stock and credits exact current market price',()=>{
 const farm=createFarm(now);farm.inventory.corn=36;const before=farm.coins;
 applyFarmAction(farm,{type:'sell',item:'corn',quantity:10,day:utcDay(now)},now);
 assert.equal(farm.inventory.corn,26);assert.equal(farm.coins-before,10*marketQuote('corn',now).price);assert.equal(farm.stats.sold,10);
});
test('sell all remains compatible with old clients and category sales',()=>{
 const farm=createFarm(now);farm.inventory.corn=36;farm.inventory.bread=5;
 applyFarmAction(farm,{type:'sell',item:'corn'},now);assert.equal(farm.inventory.corn,0);assert.equal(farm.inventory.bread,5);
 applyFarmAction(farm,{type:'sell',category:'goods'},now);assert.equal(farm.inventory.bread,0);
});
test('invalid quantities cannot consume stock or mint coins',()=>{
 for(const quantity of [0,-1,37,1.5,'10',null,Infinity,NaN]){
  const farm=createFarm(now);farm.inventory.corn=36;const coins=farm.coins;
  assert.throws(()=>applyFarmAction(farm,{type:'sell',item:'corn',quantity},now));assert.equal(farm.inventory.corn,36);assert.equal(farm.coins,coins);
 }
 for(const extra of [{item:'all'},{category:'crops'}]){
  const farm=createFarm(now);assert.throws(()=>applyFarmAction(farm,{type:'sell',quantity:1,...extra},now));
 }
});
