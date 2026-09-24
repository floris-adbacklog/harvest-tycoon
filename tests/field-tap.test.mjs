import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fieldTapAction,canWater,waterUntil,createFarm,applyFarmAction,xpForLevel,normalizeFarm} from '../game/farm-state.js';
const now=Date.UTC(2026,8,24,12),M=60000;
// A 30-minute crop: care opens after 9 minutes (30%), so water fits in the first 9 minutes.
const crop=(minutesIn,extra={})=>({crop:'corn',plantedAt:now-minutesIn*M,readyAt:now+(30-minutesIn)*M,careAt:now+(9-minutesIn)*M,watered:false,tended:false,...extra});

test('water belongs to planting: until extra care opens (30% of the growing time), and always in the first minute',()=>{
 assert.equal(canWater(crop(2),now),true);assert.equal(canWater(crop(8.9),now),true);
 assert.equal(canWater(crop(9),now),false,'care is open: the watering time has passed');assert.equal(canWater(crop(20),now),false);
 assert.equal(canWater(crop(2,{watered:true}),now),false);
 // A beginner's crop grows in seconds and its care opens after 7 seconds: water still fits in the first minute.
 const quick={crop:'wheat',plantedAt:now-20000,readyAt:now+4000,careAt:now-13000,watered:false,tended:false};
 assert.equal(waterUntil(quick),now+40000);assert.equal(canWater(quick,now),true);
});
test('a tap on a field does what it can use now: plant, harvest, water early, extra care later',()=>{
 assert.equal(fieldTapAction({crop:null},now),'plant');
 assert.equal(fieldTapAction(crop(30),now),'harvest');
 assert.equal(fieldTapAction(crop(2),now),'water','early: water');
 assert.equal(fieldTapAction(crop(2,{watered:true}),now),null,'watered, care not open yet: nothing to do');
 assert.equal(fieldTapAction(crop(12),now),'tend','later: extra care');
 assert.equal(fieldTapAction(crop(12,{tended:true}),now),null,'missed the water, already cared for');
});
test('a tool picked on purpose goes first when it fits; otherwise the tap still helps',()=>{
 const overlap={crop:'wheat',plantedAt:now-20000,readyAt:now+4000,careAt:now-13000,watered:false,tended:false};
 assert.equal(fieldTapAction(overlap,now),'tend','both possible (a beginner crop): care first');
 assert.equal(fieldTapAction(overlap,now,'water'),'water','Water picked: water');
 assert.equal(fieldTapAction(crop(12),now,'water'),'tend','too late to water: the tap gives care instead');
 assert.equal(fieldTapAction(crop(2),now,'tend'),'water','care not open: the tap waters instead of failing');
});
test('the server refuses late water with a clear reason, and the tractor only waters crops that can still take it',()=>{
 const s=createFarm(now);s.xp=xpForLevel(20);normalizeFarm(s,now);s.coins=100000;
 s.plots.forEach((p,i)=>s.plots[i]={...p,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false});
 s.plots[0]={...s.plots[0],...crop(12)};s.plots[1]={...s.plots[1],...crop(2)};
 assert.throws(()=>applyFarmAction(s,{type:'field',id:0,action:'water'},now),/Water right after planting/);
 const result=applyFarmAction(s,{type:'tractor',mode:'water'},now);
 assert.equal(s.plots[0].watered,false);assert.equal(s.plots[1].watered,true);assert.equal(result.count,1);
});
test('the game uses it for every tap, and says so in the hint',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/const action=forcedAction\?\?fieldTapAction\(plot,farmNow\(\),selectedTool\);/);
 assert.match(game,/or a growing crop to water it and give extra care when it is ready/);
 // Nothing to do yet: what comes next and when, in two plain sentences.
 assert.match(game,/toast\(`\$\{name\}: \$\{plot\.tended\?'fully cared for':`extra care opens in \$\{formatDuration\(plot\.careAt-now\)\}`\}\. Ready to harvest in \$\{formatDuration\(plot\.readyAt-now\)\}\.`\)/);
});
