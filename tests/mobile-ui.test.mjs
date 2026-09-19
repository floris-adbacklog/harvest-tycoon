import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindFarmInput,cameraDragDelta} from '../public/farm-input.js';
import {OrthographicCamera,Vector3} from '../public/vendor/three.module.js';
import {createQuestsUI,questGroups} from '../public/quests-ui.js';
import {createFarm,QUESTS,applyFarmAction} from '../game/farm-state.js';

class Canvas extends EventTarget{
 captured=new Set();
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
}
function setup(pick=event=>({type:'plot',id:Math.floor(event.clientX/50)})){
 const canvas=new Canvas(),calls={open:[],pan:[],zoom:[]};
 bindFarmInput({canvas,isReady:()=>true,pick,open:target=>calls.open.push(target),pan:(...args)=>calls.pan.push(args),zoom:ratio=>calls.zoom.push(ratio)});
 function send(type,x,y=20,id=1,pointerType='touch'){
  const event=new Event(type,{cancelable:true});Object.assign(event,{clientX:x,clientY:y,pointerId:id,pointerType,button:0});canvas.dispatchEvent(event);
 }
 return {canvas,calls,send};
}
test('mouse, touch and pen clicks work a field once on release; contact alone never spends or harvests',()=>{
 for(const pointerType of ['mouse','touch','pen']){
  const {send,calls}=setup();send('pointerdown',20,20,1,pointerType);assert.equal(calls.open.length,0);
  send('pointermove',23,22,1,pointerType);send('pointerup',23,22,1,pointerType);assert.deepEqual(calls.open,[{type:'plot',id:0}]);assert.equal(calls.pan.length,0);
 }
});
test('dragging from a crop pans in both directions without working any field',()=>{
 const {send,calls}=setup();send('pointerdown',20);send('pointermove',75,60);send('pointermove',150,100);send('pointerup',150,100);
 assert.equal(calls.open.length,0);assert.deepEqual(calls.pan,[[55,40],[75,40]]);
});
test('the isometric farm follows the finger up, down, left, right and diagonally',()=>{
 for(const [width,height] of [[390,510],[580,235],[1024,768],[1440,900]])for(const [dx,dy] of [[40,0],[-40,0],[0,40],[0,-40],[25,-30]]){
  const spanY=20,spanX=spanY*width/height,camera=new OrthographicCamera(-spanX/2,spanX/2,spanY/2,-spanY/2,.1,180);
  const project=focus=>{camera.position.copy(focus).add(new Vector3(36,40,36));camera.lookAt(focus);camera.updateMatrixWorld();return new Vector3(2,0,3).project(camera);};
  const before=project(new Vector3()),shift=cameraDragDelta(dx,dy,spanX,spanY,width,height);
  const after=project(new Vector3(shift.side+shift.depth,0,-shift.side+shift.depth));
  assert(Math.abs((after.x-before.x)*width/2-dx)<.001);
  assert(Math.abs(-(after.y-before.y)*height/2-dy)<.001);
 }
});
test('pinching and lifting fingers never becomes a field tap or an icon click',()=>{
 const {send,calls}=setup(()=>({type:'utility',id:'tractor'}));
 send('pointerdown',20,20,1);send('pointerdown',100,20,2);send('pointermove',140,20,2);send('pointerup',140,20,2);send('pointerup',20,20,1);
 assert.deepEqual(calls.zoom,[1.5]);assert.equal(calls.open.length,0);
});
test('a cancelled touch gesture does not trigger a purchase or utility',()=>{
 const {send,calls}=setup(()=>({type:'utility',id:'tractor'}));send('pointerdown',20);send('pointercancel',20);send('pointerup',20);
 assert.equal(calls.open.length,0);
});
test('tractor and building icons open once for mouse, touch and pen',()=>{
 for(const pointerType of ['mouse','touch','pen'])for(const target of [{type:'utility',id:'tractor'},{type:'building',id:'windmill'}]){
  const {send,calls}=setup(()=>target);send('pointerdown',20,20,1,pointerType);send('pointerup',20,20,1,pointerType);
  assert.deepEqual(calls.open,[target]);assert.equal(calls.pan.length,0);
 }
});
test('dragging with mouse, touch or pen pans from a field, icon or background, even after returning to the starting point',()=>{
 for(const pointerType of ['mouse','touch','pen'])for(const target of [null,{type:'plot',id:0},{type:'utility',id:'tractor'},{type:'building',id:'windmill'}]){
  const {send,calls,canvas}=setup(()=>target);
  send('pointerdown',20,20,1,pointerType);assert(canvas.hasPointerCapture(1));
  send('pointermove',120,80,1,pointerType);send('pointermove',20,20,1,pointerType);send('pointerup',20,20,1,pointerType);
  assert.equal(calls.open.length,0);assert.deepEqual(calls.pan,[[100,60],[-100,-60]]);assert(!canvas.hasPointerCapture(1));
 }
});
test('a mouse gesture losing capture does not click, and a subsequent click still works',()=>{
 const target={type:'building',id:'windmill'},{send,calls}=setup(()=>target);
 send('pointerdown',20,20,1,'mouse');send('lostpointercapture',20,20,1,'mouse');send('pointerup',20,20,1,'mouse');
 assert.equal(calls.open.length,0);
 send('pointerdown',20,20,1,'mouse');send('pointerup',20,20,1,'mouse');assert.deepEqual(calls.open,[target]);
});

// Event-based DOM fixture: exercises the actual opening and delegated filter/claim handlers.
class Element extends EventTarget{
 constructor(){super();this.dataset={};this.attributes={};this.open=false;this.scrollTop=500;this.textContent='';this.innerHTML='';}
 setAttribute(key,value){this.attributes[key]=value;}
 showModal(){this.open=true;this.openCount=(this.openCount??0)+1;}
 close(){this.open=false;}
 focus(){this.focused=true;}
 before(element){this.previous=element;}
 querySelector(selector){return this.children?.[selector]??null;}
 querySelectorAll(){return this.buttons??[];}
 clickTarget(target=this){const event=new Event('click');Object.defineProperty(event,'target',{value:target});this.dispatchEvent(event);}
 closest(selector){return selector==='[data-claim]'&&this.dataset.claim!==undefined||selector==='[data-quest-filter]'&&this.dataset.questFilter?this:null;}
}
function questFixture(state){
 const elements=Object.fromEntries(['tasks-dialog','task-list','tasks-button','all-quests-mobile'].map(id=>[id,new Element()]));
 const close=new Element();elements['tasks-dialog'].children={'.close-dialog':close};
 const toolbar=new Element();toolbar.buttons=['ready','active','done'].map(key=>{const button=new Element();button.dataset.questFilter=key;button.children={span:new Element()};return button;});
 toolbar.children={'#quest-summary':new Element(),...Object.fromEntries(toolbar.buttons.map(b=>[`[data-quest-filter="${b.dataset.questFilter}"]`,b]))};
 const other=new Element();other.open=true;
 const doc={getElementById:id=>elements[id],createElement:()=>toolbar,querySelectorAll:()=>[other,...Object.values(elements).filter(e=>e.open)]};
 const ui=createQuestsUI({state,claim:id=>applyFarmAction(state,{type:'quest',id}),icons:()=>{},document:doc});
 return {ui,elements,toolbar,other,close};
}
test('the Quests navigation button opens directly, resets scroll and can reopen',()=>{
 const state=createFarm(),{elements,other,close}=questFixture(state);
 elements['tasks-button'].clickTarget();assert.equal(elements['tasks-dialog'].open,true);assert.equal(elements['tasks-dialog'].scrollTop,0);assert.equal(other.open,false);assert.equal(close.focused,true);
 assert.match(elements['task-list'].innerHTML,/Your first harvest/);
 elements['tasks-dialog'].close();elements['tasks-button'].clickTarget();assert.equal(elements['tasks-dialog'].openCount,2);
 elements['tasks-dialog'].close();elements['all-quests-mobile'].clickTarget();assert.equal(elements['tasks-dialog'].open,false,'beginner navigation must not open regular quests');
});
test('quest filters expose rewards, new features and completed quests without losing progress',()=>{
 const state=createFarm();state.stats[QUESTS[0].stat]=QUESTS[0].target;
 const {elements,toolbar}=questFixture(state);elements['tasks-button'].clickTarget();assert.match(elements['task-list'].innerHTML,/data-claim="0"/);
 const claim=new Element();claim.dataset.claim='0';elements['task-list'].clickTarget(claim);assert(state.claimed.includes(0));
 toolbar.clickTarget(toolbar.buttons[2]);assert.match(elements['task-list'].innerHTML,/Completed ✓/);
 toolbar.clickTarget(toolbar.buttons[1]);assert.match(elements['task-list'].innerHTML,new RegExp(QUESTS[32].title));
 const groups=questGroups(state);assert.equal(groups.ready.length+groups.active.length+groups.done.length,94);
});
test('pressed floating buttons retain their position instead of jumping away from the pointer',()=>{
 const css=readFileSync(new URL('../public/styles.css',import.meta.url),'utf8');
 const pressed=css.match(/button:active:not\(:disabled\)\{([^}]+)\}/)[1];
 assert.doesNotMatch(pressed,/(?:transform|translate|left|top)\s*:/);
 const normal=css.match(/\.utility-label\{[^}]*transform:([^;}]*)/)[1];
 const active=css.match(/\.utility-label:active\{[^}]*transform:([^;}]*)/)[1];assert.equal(active,normal);
});
