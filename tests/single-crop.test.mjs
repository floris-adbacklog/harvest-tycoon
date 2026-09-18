import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,applyFarmAction as act} from '../game/farm-state.js';
const now=Date.UTC(2026,8,18);
test('five diamonds finish only the selected growing crop without harvesting it',()=>{
 const s=createFarm(now);s.diamonds=10;const id=s.plots.findIndex(p=>p.crop&&p.readyAt>now),before=structuredClone(s),crop=s.plots[id].crop;
 act(s,{type:'finish_crop',id,expectedCost:5},now);assert.equal(s.diamonds,5);assert.equal(s.plots[id].readyAt,now);assert.equal(s.plots[id].crop,crop);assert.deepEqual(s.inventory,before.inventory);assert.deepEqual(s.plots.filter((_,i)=>i!==id),before.plots.filter((_,i)=>i!==id));
 assert.throws(()=>act(s,{type:'finish_crop',id,expectedCost:5},now));assert.equal(s.diamonds,5);
});
test('invalid, ready, empty, underfunded and forged-price requests spend nothing',()=>{
 for(const variant of ['invalid','ready','empty','poor','price']){const s=createFarm(now);s.diamonds=variant==='poor'?4:10;let id=s.plots.findIndex(p=>p.crop&&p.readyAt>now);if(variant==='invalid')id=999;if(variant==='ready')id=s.plots.findIndex(p=>p.crop&&p.readyAt<=now);if(variant==='empty')id=s.plots.findIndex(p=>!p.crop);const balance=s.diamonds;assert.throws(()=>act(s,{type:'finish_crop',id,expectedCost:variant==='price'?0:5},now));assert.equal(s.diamonds,balance);}
});
