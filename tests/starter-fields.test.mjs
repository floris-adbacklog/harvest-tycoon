import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,xpForLevel,expansionCost,expansionMaterials,expansionLevel,unlockEntries,STARTER_FIELDS,EARLY_FIELDS} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const now=Date.UTC(2026,8,24,12);

test('a new farm starts with 8 fields: 3 ripe corn, 3 wheat ripening one by one, 2 empty',()=>{
 const s=createFarm(now);
 assert.equal(STARTER_FIELDS,8);assert.equal(s.plots.length,8);assert.equal(s.progression.fields,8);
 assert.deepEqual(s.plots.map(p=>p.crop),['corn','corn','corn','wheat','wheat','wheat',null,null]);
 for(const id of [0,1,2])assert(s.plots[id].readyAt<=now,'ripe for the first basket');
 assert.deepEqual([3,4,5].map(id=>s.plots[id].readyAt-now),[30000,60000,90000],'ripen while you take the first steps');
});

test('fields 9-12 come back one per level in the first half hour: cheap, no supplies, not counted as expansions',()=>{
 assert.deepEqual(EARLY_FIELDS.map(f=>[f.level,f.coins]),[[2,100],[3,150],[4,200],[5,250]]);
 const s=createFarm(now);s.coins=10000;
 assert.equal(expansionLevel(s),2);assert.equal(expansionCost(s),100);assert.deepEqual(expansionMaterials(s),{});
 assert.throws(()=>act(s,{type:'expand'},now),/Reach level 2 to unlock field 9/);
 const expansions=s.stats.expansions??0,house=s.buildings.farmhouse.level;
 for(const [i,f] of EARLY_FIELDS.entries()){
  s.xp=xpForLevel(f.level);const coins=s.coins,xp=s.xp;act(s,{type:'expand'},now);
  assert.equal(s.plots.length,9+i);assert.equal(coins-s.coins,f.coins);assert.equal(s.xp,xp+20);
 }
 assert.equal(s.stats.expansions??0,expansions,'fields 9-12 are the starting farm, not expansions');assert.equal(s.buildings.farmhouse.level,house);
 // Field 13 on is unchanged and counts as the first expansion.
 assert.equal(expansionCost(s),600);assert.deepEqual(expansionMaterials(s),{wheat:12,corn:6});assert.equal(expansionLevel(s),1);
});

test('the level-up and journal lists show fields 9-12 for new farms only',()=>{
 const fresh=unlockEntries(createFarm(now)).filter(e=>/^field:(9|1[0-2])$/.test(e.id));
 assert.deepEqual(fresh.map(e=>[e.name,e.level]),[['Field 9',2],['Field 10',3],['Field 11',4],['Field 12',5]]);
 assert.equal(unlockEntries(createLegacyFarm(now)).filter(e=>/^field:(9|1[0-2])$/.test(e.id)).length,0);
});

test('the Farmhouse explains the first fields in one sentence',()=>{
 assert.match(readFileSync(new URL('../public/economy-ui.js',import.meta.url),'utf8'),/state\.plots\.length<12\?'While you start out, every new level opens one more field, up to 12\. No supplies needed\.'/);
});
