import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/player-profiles.js',import.meta.url),'utf8').split('export function createPlayerProfiles')[1];
function harness(){
 let doc,timer;const intervals=[],requests=[],created=[];
 class Element{
  constructor(){this.nodes=new Map();this.listeners={};this.attributes={};this.innerHTML='';this.textContent='';this.children=[];this.isConnected=true;this.value='';this.open=false;}
  querySelector(key){if(!this.nodes.has(key))this.nodes.set(key,new Element());return this.nodes.get(key);}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,fn){this.listeners[key]=fn;}
  before(el){created.push(el);}
  append(el){this.children.push(el);}
  replaceChildren(){this.children=[];this.innerHTML='';}
  focus(){doc.activeElement=this;}
  showModal(){this.open=true;}
  close(){this.open=false;this.listeners.close?.();}
  contains(el){return this===el||this.children.includes(el);}
 }
 const board=new Element();doc={body:new Element(),activeElement:new Element(),hidden:false,getElementById:()=>board,createElement:()=>new Element()};
 const bridge={request(body){return new Promise((resolve,reject)=>requests.push({body,resolve,reject}));}};
 const context=vm.createContext({document:doc,window:{addEventListener(){}},setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},setInterval(fn){intervals.push(fn);return 2;},clearInterval(){},renderPlayerProfile:p=>p.username,renderPlayerSearch:players=>players.map(p=>p.username).join(',')});
 vm.runInContext(`function createPlayerProfiles${source}`,context);
 const controller=context.createPlayerProfiles(bridge),dialog=doc.body.children[0],search=created[0];
 return {controller,requests,dialog,search,doc,intervals,tick(){const fn=timer;timer=null;fn?.();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('a slow first profile cannot overwrite a newer selected farmer',async()=>{
 const h=harness(),one=h.controller.open('one'),two=h.controller.open('two');
 h.requests[1].resolve({playerProfile:{username:'Second'}});await two;
 h.requests[0].resolve({playerProfile:{username:'First'}});await one;
 assert.equal(h.dialog.querySelector('#farmer-profile-content').innerHTML,'Second');
});
test('closing while loading never reopens the profile and restores focus',async()=>{
 const h=harness(),origin=h.doc.activeElement,pending=h.controller.open('one');h.dialog.close();
 h.requests[0].resolve({playerProfile:{username:'First'}});await pending;
 assert.equal(h.controller.isOpen,false);assert.equal(h.doc.activeElement,origin);assert.ok(!h.dialog.querySelector('#farmer-profile-content').innerHTML.includes('First'));
});
test('typing invalidates an outstanding search before the next debounce completes',async()=>{
 const h=harness(),input=h.search.querySelector('input'),results=h.search.querySelector('#farmer-search-results');
 input.value='Tony';input.listeners.input();h.tick();assert.equal(h.requests.length,1);
 input.value='Sunny';input.listeners.input();h.requests[0].resolve({players:[{username:'Tony'}]});await flush();assert.equal(results.innerHTML,'');
 h.tick();h.requests[1].resolve({players:[{username:'Sunny'}]});await flush();assert.equal(results.innerHTML,'Sunny');
});
test('clearing search discards pending results and resets busy state',async()=>{
 const h=harness(),input=h.search.querySelector('input');input.value='Tony';input.listeners.input();h.tick();
 h.search.querySelector('#farmer-search-clear').onclick();h.requests[0].resolve({players:[{username:'Tony'}]});await flush();
 const results=h.search.querySelector('#farmer-search-results');assert.equal(results.innerHTML,'');assert.equal(results.attributes['aria-busy'],'false');assert.equal(input.value,'');
});
test('profile lookup errors remain in the dialog with a working retry',async()=>{
 const h=harness(),pending=h.controller.open('missing');h.requests[0].reject(new Error('Farmer not found'));await pending;
 assert.equal(h.controller.isOpen,true);assert.equal(h.dialog.querySelector('#farmer-profile-status').textContent,'Farmer not found');
 const retry=h.dialog.querySelector('#farmer-profile-content').children[0];const again=retry.onclick();h.requests[1].resolve({playerProfile:{username:'Now available'}});await again;
 assert.equal(h.dialog.querySelector('#farmer-profile-content').innerHTML,'Now available');
});
