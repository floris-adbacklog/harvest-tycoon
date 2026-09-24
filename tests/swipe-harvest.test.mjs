import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindFarmInput} from '../public/farm-input.js';
import {createFarm,normalizeFarm,applyFarmAction,SWIPE_MAX_FIELDS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// A row of fields 50 px wide: field n covers x from n*50 to n*50+49, grass below y 100.
function setup(work){
 const handlers={},log={pan:0,opened:[],added:[],ended:null};
 const canvas={addEventListener:(type,fn)=>{handlers[type]=fn;},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};
 const pick=e=>e.clientY<100?{type:'plot',id:Math.floor(e.clientX/50)}:null;
 bindFarmInput({canvas,isReady:()=>true,pick,open:t=>log.opened.push(t.id),pan:()=>log.pan++,zoom(){},
  sweep:{action:t=>work[t.id]??null,add:t=>log.added.push(t.id),end:(action,ids)=>{log.ended={action,ids};}}});
 const at=(type,x,y,id=1)=>handlers[type]({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,preventDefault(){}});
 return {log,at};
}

test('a swipe that starts on a ripe field harvests every ripe field it passes, even on a quick swipe, and does not move the map',()=>{
 const {log,at}=setup({0:'harvest',1:'harvest',2:'water',3:'harvest',4:'harvest'});
 at('pointerdown',20,50);at('pointermove',120,50);at('pointermove',230,50);at('pointerup',230,50);
 assert.deepEqual(log.ended,{action:'harvest',ids:[0,1,3,4]},'field 2 only needs water, so it is skipped');
 assert.deepEqual(log.added,[0,1,3,4]);assert.equal(log.pan,0);assert.deepEqual(log.opened,[]);
});

test('a drag that starts on grass or on a field with nothing to do still moves the map; a tap still works one field',()=>{
 let s=setup({0:'harvest'});s.at('pointerdown',20,150);s.at('pointermove',120,150);s.at('pointerup',120,150);
 assert.ok(s.log.pan>0);assert.equal(s.log.ended,null);
 s=setup({});s.at('pointerdown',20,50);s.at('pointermove',120,50);s.at('pointerup',120,50);
 assert.ok(s.log.pan>0,'a growing field with nothing to do: the map moves');assert.equal(s.log.ended,null);
 s=setup({0:'harvest'});s.at('pointerdown',20,50);s.at('pointerup',22,51);
 assert.deepEqual(s.log.opened,[0]);assert.equal(s.log.ended,null,'a tap is a tap');
});

test('a second finger turns a swipe that has not started into a pinch',()=>{
 const {log,at}=setup({0:'harvest',1:'harvest'});
 at('pointerdown',20,50,1);at('pointerdown',300,300,2);at('pointermove',120,50,1);at('pointerup',120,50,1);
 assert.equal(log.ended,null);
});

test('the server works the swiped fields in one save: only where the work fits, each field once, at most 60',()=>{
 const now=Date.now(),s=normalizeFarm(createFarm(now),now);
 const ripe={crop:'wheat',plantedAt:now-1e7,readyAt:now-1,careAt:now-1e7,watered:false,tended:false,harvestCycles:0};
 Object.assign(s.plots[0],ripe);Object.assign(s.plots[1],ripe);
 Object.assign(s.plots[2],{crop:'wheat',plantedAt:now,readyAt:now+1e7,careAt:now+1e6,watered:false,tended:false,harvestCycles:0});
 const before=s.inventory.wheat,r=applyFarmAction(s,{type:'fields',action:'harvest',ids:[0,2,1,0]},now);
 assert.deepEqual(r.fields.map(f=>f.id),[0,1]);assert.equal(r.count,2);assert.ok(s.inventory.wheat>before);
 assert.equal(s.plots[0].crop,null);assert.equal(s.plots[2].crop,'wheat','the growing field is left alone');
 assert.throws(()=>applyFarmAction(s,{type:'fields',action:'harvest',ids:[2]},now),/No crops are ready/);
 assert.throws(()=>applyFarmAction(s,{type:'fields',action:'plant',ids:[3]},now),/valid tool/,'planting is never swiped (it costs coins)');
 assert.throws(()=>applyFarmAction(s,{type:'fields',action:'water',ids:Array.from({length:SWIPE_MAX_FIELDS+1},(_,i)=>i)},now),/Choose some fields/);
 const w=applyFarmAction(s,{type:'fields',action:'water',ids:[2]},now);assert.equal(w.count,1);assert.equal(s.plots[2].watered,true);
});

test('the game wires the swipe to one save and lights the swiped fields; labels lost their extra icon',()=>{
 const game=read('public/game.js');
 assert.match(game,/const result=await runAction\(\{type:'fields',action,ids\}\);/);
 assert.match(game,/return a==='harvest'\|\|a==='water'\|\|a==='tend'\?a:null;/,'harvest, water and care; never planting');
 assert.match(read('public/farm-audio.js'),/if\(action\.type==='fields'\)return/);
});
