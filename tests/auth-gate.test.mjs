import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').split('\n').slice(2).join('\n');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({user=null,load,online=true}={}){
 const nodes=new Map(),events={},frames=[],calls=[];let authCallback,currentUser=user;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',disabled:false,dataset:{},children:[],textContent:'',setAttribute(){},focus(){},scrollIntoView(){},replaceChildren(...items){this.children=items;},append(node){this.children.push(node);},remove(){this.removed=true;},contentWindow:{}});return nodes.get(id);};
 const document={body:{dataset:{}},hidden:false,getElementById:element,querySelector:element,querySelectorAll:()=>[],createElement(tag){const frame=element('frame'+frames.length);frames.push(frame);return frame;},addEventListener(name,fn){events[name]=fn;}};
 const window={addEventListener(name,fn){events[name]=fn;}};
 const supabase={auth:{onAuthStateChange(fn){authCallback=fn;},async signOut(){currentUser=null;authCallback('SIGNED_OUT',null);return{};}}};
 const context=vm.createContext({document,window,navigator:{onLine:online},location:{origin:'https://farm.example'},URL,queueMicrotask,setTimeout:fn=>queueMicrotask(fn),setInterval(){},supabase,isConfigured:true,verifiedUser:async()=>currentUser,validUsername:()=>true,cloudError:e=>e.message,fetchLeaderboard:async()=>({rows:[]}),farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:currentUser.id},state:{coins:180},serverNow:Date.now()};}});
 vm.runInContext(source,context);
 return {context,document,window,frames,calls,nodes,events,async auth(event,next){currentUser=next;authCallback(event,next?{user:next}:null);await settle();}};
}
test('a new visitor does not load or initialize any farm',async()=>{
 const f=fixture();await settle();assert.equal(f.document.body.dataset.phase,'unauthenticated');assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);
});
test('game waits for authenticated server data; logout destroys its frame and bridge',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'checking');
 pending.resolve({profile:{player_id:'A'},state:{coins:230},serverNow:Date.now()});await settle();assert.equal(f.frames.length,1);assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.window.harvestBridge.takeInitial().state.coins,230);
 await f.auth('SIGNED_OUT',null);assert.equal(f.frames[0].removed,true);assert.equal(f.window.harvestBridge,undefined);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('late farm response after logout cannot reopen private gameplay',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();await f.auth('SIGNED_OUT',null);pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('cross-tab account switch discards A before B and never mounts a stale response',async()=>{
 const pending=deferred();let count=0;const f=fixture({user:{id:'A'},load:()=>++count===1?pending.promise:Promise.resolve({profile:{player_id:'B'},state:{coins:180},serverNow:Date.now()})});await settle();await f.auth('SIGNED_IN',{id:'B'});pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(f.frames.length,1);assert.equal(f.window.harvestBridge.playerId,'B');assert.equal(f.window.harvestBridge.takeInitial().state.coins,180);
});
test('offline and server failures fail closed without creating fallback farms',async()=>{
 const f=fixture({user:{id:'A'},online:false});await settle();assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'error');
 const g=fixture({user:{id:'A'},load:async()=>{throw new Error('Unavailable');}});await settle();assert.equal(g.frames.length,0);assert.equal(g.document.body.dataset.phase,'error');
});
