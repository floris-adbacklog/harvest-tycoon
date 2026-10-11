import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,11,12);

// A small page: elements with a box, a place in the page (closest) and what elementFromPoint finds over their middle.
function page({hit=()=>null,width=918,height=516}={}){
 const box=(left,top,w,h)=>({left,top,width:w,height:h,right:left+w,bottom:top+h});
 const make=(name,rect,{parentSel=null}={})=>{const el={name,isConnected:true,rect,getBoundingClientRect:()=>rect,getClientRects:()=>[rect],contains:x=>x===el,closest:sel=>sel==='[hidden]'?null:parentSel&&sel.split(',').some(s=>s.trim()===parentSel)?{}:null,classList:{add(){},remove(){}}};return el;};
 const els={
  coop:make('coop label',box(700,200,44,44),{parentSel:'#building-labels'}),
  buildings:make('Buildings',box(30,280,60,60)),
  card:make('guide card',box(628,110,270,265)),
  world:make('farm canvas',box(0,0,width,height),{parentSel:'#world'})
 };
 const selectors={'.building-label[data-building="coop"]':els.coop,'#buildings-button':els.buildings};
 const doc={querySelector:sel=>selectors[sel]??null,querySelectorAll:()=>[],elementFromPoint:(x,y)=>hit(x,y,els)};
 return {doc,win:{innerWidth:width,innerHeight:height,document:doc},els};
}
globalThis.getComputedStyle??=()=>({visibility:'visible',display:'block'});

// 11 Oct 2026 (Part A, A5): step 5's Show me rang the Chicken Coop's map label while the Beginner guide card lay over it (CrazyGames, a
// computer with a short frame). The map is only used when the label is in the clear; otherwise the way goes through Buildings.
test('a map label is only pointed at when nothing lies over it: else through Buildings',async()=>{
 const {clear}=await import('../public/coach.js');
 const {guideSteps}=await import('../public/guide-steps.js');
 const state=createFarm(now);
 // The guide card over the Coop's label.
 let p=page({hit:(x,y,els)=>{assert.equal(x,722);assert.equal(y,222);return els.card;}});
 assert.equal(clear(p.els.coop,p.win,p.doc),false,'under the guide card');
 let steps=guideSteps('produce',{state,now,doc:p.doc,win:p.win});
 assert.equal(steps[0].text,'Tap Buildings.');assert.equal(steps[0].find(),p.els.buildings);assert.equal(steps[1].text,'Open the Chicken Coop.');
 // Nothing over it: the label itself (a computer), or the farm view under a label that lets taps through (a phone).
 for(const top of ['coop','world',null]){
  p=page({hit:(x,y,els)=>top&&els[top]});
  assert.equal(clear(p.els.coop,p.win,p.doc),true,String(top));
  steps=guideSteps('produce',{state,now,doc:p.doc,win:p.win});
  assert.equal(steps[0].text,'Tap the Chicken Coop.');assert.equal(steps[0].find(),p.els.coop);
 }
 // Off the screen is never in the clear.
 p=page({width:600});assert.equal(clear(p.els.coop,p.win,p.doc),false);
 // The chores' shovel on the map follows the same rule.
 assert.match(read('public/guide-steps.js'),/const spot=open\(label\)\?\[\{find:\(\)=>doc\.querySelector\('dialog\[open\] \[data-chore\]'\)\?\{skip:true\}:shown\(label\),text:'Tap the shovel for Farm chores\.'\}\]/);
});

// 11 Oct 2026: a map label lets the tap through to the farm (pointer-events: none), which opens the building, so the coach never saw a tap
// on it: the pointer stayed on 'Tap this building.' behind the open window (Build the Feed Mill's Show me, step 5's Coop). The label's step
// now passes on once that building's window is open, and the next step points at its button.
test('a map label step passes on once its building window is open; a tap on its spot keeps the pointer by itself',async()=>{
 const {guideSteps}=await import('../public/guide-steps.js');
 const {createCoach}=await import('../public/coach.js');
 const state=createFarm(now);
 const p=page({hit:(x,y,els)=>els.world});let dialog=null;
 const query=p.doc.querySelector;p.doc.querySelector=sel=>sel==='#building-dialog[open][data-building="coop"]'?dialog:sel==='dialog[open] #construct-building'&&dialog?{build:true}:query(sel);
 const steps=guideSteps('build:coop',{state,now,doc:p.doc,win:p.win});
 assert.deepEqual(steps.map(s=>s.text),['Tap this building.','Build it here.']);
 assert.equal(steps[0].find(),p.els.coop,'the label while the window is closed');
 dialog={};assert.deepEqual(steps[0].find(),{skip:true},'passed on once the Coop window is open');assert.deepEqual(steps[1].find(),{build:true});
 assert.match(read('public/economy-ui.js'),/currentBuilding=key;\$\('building-dialog'\)\.dataset\.building=key;renderBuilding\(\);show\('building-dialog'\);/);
 // The coach by itself (auto): a tap that lands on the farm canvas right on the pointed label's spot is a tap on it; elsewhere it ends.
 const listeners={},frames=[];
 const doc={addEventListener:(t,fn)=>{(listeners[t]??=[]).push(fn);},removeEventListener:(t,fn)=>{listeners[t]=(listeners[t]??[]).filter(f=>f!==fn);},body:{append(){}},
  createElement:()=>({setAttribute(){},dataset:{},style:{setProperty(){}},classList:{toggle(){}},remove(){},getBoundingClientRect:()=>({left:0,top:0,width:120,height:30,right:120,bottom:30})})};
 const saved={raf:globalThis.requestAnimationFrame,caf:globalThis.cancelAnimationFrame};globalThis.requestAnimationFrame=fn=>frames.push(fn);globalThis.cancelAnimationFrame=()=>{};
 try{
  const coach=createCoach({doc,win:{innerWidth:918,innerHeight:516}});
  coach.start([{find:()=>p.els.coop,text:'Tap this building.'}],{auto:true});frames.shift()();
  const down=(x,y)=>listeners.pointerdown.forEach(fn=>fn({target:{nodeType:1,name:'canvas'},clientX:x,clientY:y}));
  down(722,222);assert.equal(coach.active,true,'on the label\'s spot');
  down(300,300);assert.equal(coach.active,false,'anywhere else ends it');
 }finally{globalThis.requestAnimationFrame=saved.raf;globalThis.cancelAnimationFrame=saved.caf;}
});
