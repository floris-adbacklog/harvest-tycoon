// The farm no longer waits for the server after a tap that already shows (24 Oct 2026, a farmer and the owner: "Beeld blijft hangen";
// after "Round complete!" the farm took no tap or drag for about a second while the chore's three taps were on their way). Only an action
// that cannot show at once (a diamond spend) keeps taps off the farm until its answer is back, and dragging the farm never waits.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../game/farm-state.js';
import {createFarmClient} from '../public/farm-client.js';
import {bindFarmInput} from '../public/farm-input.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,24,12);
const tick=()=>new Promise(r=>setTimeout(r,0));

test('a tap that shows at once saves without locking the farm; an action that waits for the server locks taps until its answer',async()=>{
 const classes=new Set(),gates=[],server=createFarm(now);
 globalThis.document={body:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},documentElement:{hasAttribute:()=>false}};
 globalThis.window={parent:{harvestBridge:{serverNow:now,request:()=>new Promise(resolve=>gates.push(()=>resolve({state:structuredClone(server),result:{},serverNow:now})))}}};
 const state=structuredClone(server),client=createFarmClient(state,{onChange(){},onStatus(){}});await client.load();
 // A harvest: on the screen now, saving on its way, the farm open.
 await client.runAction({type:'field',id:0,action:'harvest'});
 assert.ok(classes.has('farm-saving'),'the saving status (an app update waits for it)');assert.ok(!classes.has('farm-waiting'),'taps go on');
 // A diamond spend waits for the server: taps wait with it, behind the harvest in the line.
 const spend=client.runAction({type:'finish_crop',id:1});await tick();
 assert.ok(classes.has('farm-waiting'));
 gates.shift()();await tick();await tick();assert.ok(classes.has('farm-waiting'),'until its own answer, not the harvest\'s');
 gates.shift()();await spend;await tick();
 assert.ok(!classes.has('farm-waiting'));assert.ok(!classes.has('farm-saving'));
});

test('while the farm waits, a press only moves it: no field is worked and nothing opens; then taps work again',()=>{
 const handlers={},log={pan:0,opened:[],added:[]};let busy=true;
 const canvas={addEventListener:(type,fn)=>{handlers[type]=fn;},setPointerCapture(){},hasPointerCapture:()=>false,releasePointerCapture(){}};
 const pick=e=>e.clientY>=100?{type:'plot',id:Math.floor(e.clientX/50)}:null;
 bindFarmInput({canvas,isReady:()=>true,busy:()=>busy,pick,open:t=>log.opened.push(t.id),pan:()=>log.pan++,zoom(){},
  sweep:{action:()=>'harvest',add:t=>log.added.push(t.id),end(){}},later:()=>0,cancelLater(){}});
 const at=(type,x,y)=>handlers[type]({pointerId:1,pointerType:'mouse',button:0,clientX:x,clientY:y,preventDefault(){}});
 at('pointerdown',60,120);at('pointerup',60,120);assert.deepEqual(log.opened,[],'a tap waits');
 at('pointerdown',60,120);at('pointermove',160,120);at('pointerup',160,120);
 assert.deepEqual(log.added,[],'no sweep');assert.ok(log.pan>0,'the farm moves');
 busy=false;at('pointerdown',60,120);at('pointerup',60,120);assert.deepEqual(log.opened,[1]);
});

test('the game asks farm-input whether it waits; no sheet takes the farm away while saving',()=>{
 assert.match(read('public/game.js'),/bindFarmInput\(\{canvas,surface:\$\('game'\),isReady:\(\)=>ready,busy:\(\)=>visitView\|\|document\.body\.classList\.contains\('farm-waiting'\),/);
 assert.match(read('public/farm-client.js'),/try\{const data=await send\(action,false,true\);/,'only the actions that wait for the server');
 assert.doesNotMatch(read('public/styles.css'),/\.farm-(?:saving|waiting) #world/);
});
