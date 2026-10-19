import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction as act} from '../game/farm-state.js';
const now=Date.UTC(2026,8,18);
// Finishing one crop is a Diamond boost: it opens at level 10 on every farm since 19 Oct 2026 (older farms had it from level 1), so the
// farms play at 10, and a level-9 farm is turned away too.
test('ten diamonds finish only the selected growing crop without harvesting it',()=>{
 const s=createFarm(now,{level:10});s.diamonds=20;const id=s.plots.findIndex(p=>p.crop&&p.readyAt>now),before=structuredClone(s),crop=s.plots[id].crop;
 act(s,{type:'finish_crop',id,expectedCost:10},now);assert.equal(s.diamonds,10);assert.equal(s.plots[id].readyAt,now);assert.equal(s.plots[id].crop,crop);assert.deepEqual(s.inventory,before.inventory);assert.deepEqual(s.plots.filter((_,i)=>i!==id),before.plots.filter((_,i)=>i!==id));
 assert.throws(()=>act(s,{type:'finish_crop',id,expectedCost:10},now));assert.equal(s.diamonds,10);
});
test('invalid, ready, empty, underfunded, forged-price and locked requests spend nothing',()=>{
 for(const variant of ['invalid','ready','empty','poor','price','locked']){const s=createFarm(now,{level:variant==='locked'?9:10});s.diamonds=variant==='poor'?9:20;let id=s.plots.findIndex(p=>p.crop&&p.readyAt>now);if(variant==='invalid')id=999;if(variant==='ready')id=s.plots.findIndex(p=>p.crop&&p.readyAt<=now);if(variant==='empty')id=s.plots.findIndex(p=>!p.crop);const balance=s.diamonds;assert.throws(()=>act(s,{type:'finish_crop',id,expectedCost:variant==='price'?5:10},now));assert.equal(s.diamonds,balance);}
});
