// Moving the farm with the right mouse button (18 Oct 2026, the owner: farmers who do it sometimes got the browser's right-click menu):
// no browser menu anywhere on the farm screen except in a text box, and a right- or middle-button drag that starts on a pin over the farm
// moves the farm as one that starts on the farm itself; a left click on a pin is the pin's own, as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindFarmInput,FARM_PINS} from '../public/farm-input.js';

class Canvas extends EventTarget{
 captured=new Set();
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
}
// A tiny tree: surface > canvas, surface > pin, surface > text box, surface > top bar. closest() walks up by the selector's own words.
class Node extends EventTarget{
 constructor(name,parent=null,matches=[]){super();this.name=name;this.parentNode=parent;this.matches=matches;}
 closest(selector){for(let n=this;n;n=n.parentNode)if(n.matches.some(m=>selector.split(',').includes(m)))return n;return null;}
}
function setup(){
 const surface=new Node('game'),canvas=Object.assign(new Canvas(),{parentNode:surface,closest:()=>null}),calls={open:[],pan:[]};
 const pin=new Node('pond pin',surface,['.pond-label']),input=new Node('chat box',surface,['input']),bar=new Node('top bar',surface,[]);
 let pinPressed=0;pin.addEventListener('pointerdown',()=>pinPressed++);
 bindFarmInput({canvas,surface,isReady:()=>true,pick:()=>({type:'plot',id:1}),open:t=>calls.open.push(t),pan:(...a)=>calls.pan.push(a),zoom(){}});
 return {surface,canvas,pin,input,bar,calls,get pinPressed(){return pinPressed;}};
}

test('no browser menu on the farm screen, except in a text box',()=>{
 const {surface,input,bar,canvas}=setup();
 for(const target of [canvas,bar]){
  const event=new Event('contextmenu',{cancelable:true});Object.defineProperty(event,'target',{value:target});surface.dispatchEvent(event);
  assert.equal(event.defaultPrevented,true,`no menu over ${target.name??'the farm'}`);
 }
 const text=new Event('contextmenu',{cancelable:true});Object.defineProperty(text,'target',{value:input});surface.dispatchEvent(text);
 assert.equal(text.defaultPrevented,false,'a text box keeps its menu (copy and paste)');
});

test('a right- or middle-button drag that starts on a pin moves the farm and never opens anything',()=>{
 for(const button of [2,1]){
  const s=setup();
  const down=new Event('pointerdown',{cancelable:true});Object.assign(down,{pointerId:7,pointerType:'mouse',button,clientX:100,clientY:100});
  Object.defineProperty(down,'target',{value:s.pin});s.surface.dispatchEvent(down);
  assert.equal(down.defaultPrevented,true);assert.equal(s.canvas.hasPointerCapture(7),true,'the farm takes the drag');
  for(const [type,x] of [['pointermove',130],['pointermove',170],['pointerup',170]]){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:7,pointerType:'mouse',button,clientX:x,clientY:100});s.canvas.dispatchEvent(e);}
  assert.deepEqual(s.calls.pan,[[30,0],[40,0]],`button ${button}: the farm moved`);assert.equal(s.calls.open.length,0,'nothing opened');
 }
});

test('a left click on a pin stays the pin\'s own, and a touch on a pin is not taken either',()=>{
 for(const [button,pointerType] of [[0,'mouse'],[0,'touch'],[2,'touch']]){
  const s=setup();
  const down=new Event('pointerdown',{cancelable:true});Object.assign(down,{pointerId:3,pointerType,button,clientX:10,clientY:10});
  Object.defineProperty(down,'target',{value:s.pin});s.surface.dispatchEvent(down);
  assert.equal(down.defaultPrevented,false);assert.equal(s.canvas.hasPointerCapture(3),false);
 }
});

test('the pins named are the ones the game puts over the farm, and the game passes its farm screen',()=>{
 for(const pin of ['#plot-labels','#building-labels','.building-label','.utility-label','.activity-label','.pond-label'])assert(FARM_PINS.split(',').includes(pin),pin);
 assert.match(readFileSync(new URL('../public/game.js',import.meta.url),'utf8'),/bindFarmInput\(\{canvas,surface:\$\('game'\),/);
});
