import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {avatarImage} from '../public/player-avatars.js';
import {readFileSync} from 'node:fs';
const file=readFileSync(new URL('../public/family-invitations-ui.js',import.meta.url),'utf8'),source=file.split('export function createFamilyInviteSearch')[1];
// The search shares its eligibility rule with the invite button on a profile (inviteBlocker), so load that too.
const blocker=file.match(/export function inviteBlocker[\s\S]*?\n\}\n/)[0].replace('export ','');
function harness(){
 let timer;const requests=[],invites=[];
 const nodes=new Map();const node=key=>{if(!nodes.has(key))nodes.set(key,{value:'',innerHTML:'',textContent:'',listeners:{},addEventListener(key,fn){this.listeners[key]=fn;}});return nodes.get(key);};
 const root={querySelector:node},container={querySelector:()=>root};
 const view={config:{minLevel:10,maxMembers:6},family:{id:'family',members:1,leader:true},sentInvitations:[]};
 const context=vm.createContext({avatarImage,art:()=>'',esc:v=>String(v??''),setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;}});vm.runInContext(`${blocker}function createFamilyInviteSearch${source}`,context);
 const controller=context.createFamilyInviteSearch({request:body=>new Promise((resolve,reject)=>requests.push({body,resolve,reject})),onInvite:async action=>invites.push(action),getView:()=>view,playerId:'self',isBusy:()=>false});controller.html();controller.mount(container);
 return {controller,requests,invites,view,node,container,tick(){const fn=timer;timer=null;fn?.();},type(value){node('input').value=value;node('input').listeners.input();}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('changing the search ignores a late response for the previous player name',async()=>{
 const h=harness();h.type('Tony');h.tick();h.type('Robin');h.requests[0].resolve({players:[{playerId:'old',username:'Tony',level:10}]});await flush();assert.ok(!h.node('[data-invite-search-results]').innerHTML.includes('Tony'));
 h.tick();h.requests[1].resolve({players:[{playerId:'new',username:'Robin',level:10}]});await flush();assert.match(h.node('[data-invite-search-results]').innerHTML,/Robin/);
});
test('closing or switching tabs invalidates a pending search; reopening resumes it',async()=>{
 const h=harness();h.type('Robin');h.tick();h.controller.unmount();h.requests[0].resolve({players:[{playerId:'old',username:'Old response',level:10}]});await flush();assert.ok(!h.node('[data-invite-search-results]').innerHTML.includes('Old response'));
 h.controller.html();h.controller.mount(h.container);assert.equal(h.requests.length,2);h.requests[1].resolve({players:[{playerId:'new',username:'Robin',level:10}]});await flush();assert.match(h.node('[data-invite-search-results]').innerHTML,/Robin/);
});
test('search eligibility labels explain self, existing membership, low level and pending invitations',async()=>{
 const h=harness();h.view.sentInvitations=[{recipientId:'pending'}];h.type('fa');h.tick();h.requests[0].resolve({players:[{playerId:'self',username:'Me',level:10},{playerId:'member',username:'Member',level:10,family:{name:'Team'}},{playerId:'young',username:'Young',level:9},{playerId:'pending',username:'Invited',level:10}]});await flush();const html=h.node('[data-invite-search-results]').innerHTML;for(const text of ['You','Already in a family','Level 10 required','Invited'])assert.ok(html.includes(text));assert.equal((html.match(/disabled/g)??[]).length,4);
});
