import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarmClient,farmNow,bridgeClock,instantResult} from '../public/farm-client.js';
import {createFarm} from '../public/farm-state.js';
import {createFarmSession} from '../src/farm-session.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// 13 Oct 2026, two farmers at level 100+ ("a freeze of 40-60 s in the fields and batches when I switch from the village to the farm";
// "after farm to village and back the first half minute shows no time for the crops, nor what is already done"): a trip's new farm
// page took the server's clock from the first load of the visit (bridge.serverNow, never renewed), so it ran behind by the whole visit:
// ripe fields and finished batches showed a time, and their tap was refused on the device, until the next answer (the 60-second check).
// Now the page around keeps the last load's serverNow and when it came (serverAt), and a farm page that starts counts from those.
const T0=Date.UTC(2026,9,13,13,0),SKEW=3000;   // the server 3 s ahead of this device
function farmPage(bridge){
 globalThis.localStorage={getItem(){return null;},setItem(){}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:bridge}};
 const state=structuredClone(bridge.takeInitial?.()?.state??createFarm(Date.now()));
 return {state,client:createFarmClient(state,{onChange(){},onStatus(){}})};
}
function sessionPage(server){
 const frames=[],host={append(n){frames.push(n);},replaceChildren(){}};
 const win={location:{search:'',href:'https://www.harvesttycoon.com/play.html',assign(){}},history:{replaceState(){}},addEventListener(){}};
 const session=createFarmSession({supabase:{},verifiedUser:async()=>({id:'A'}),farmRequest:async()=>({profile:{player_id:'A'},state:structuredClone(server.state),serverNow:Date.now()+SKEW}),
  fetchLeaderboard:async()=>({rows:[]}),createFarmPresence:()=>({dispose(){},snapshot:()=>({})}),createChatClient:()=>({dispose(){}}),host:()=>host,
  doc:{hidden:false,body:{dataset:{}},createElement(){return {remove(){},contentWindow:{}};},addEventListener(){}},win,nav:{onLine:true},timers:{setTimeout:()=>0,clearTimeout(){},setInterval:()=>0}});
 return {session,win,frames};
}
test('a trip ten minutes into a visit: the new farm page runs on the server\'s clock, so a field ripe since then is ripe at once',async t=>{
 mock.timers.enable({apis:['Date'],now:T0});t.after(()=>mock.timers.reset());
 // A field that ripens one minute after the farm opened, cared for.
 const server={state:createFarm(T0-3600000)};
 Object.assign(server.state.plots[0],{crop:'wheat',plantedAt:T0-3600000,readyAt:T0+SKEW+60000,careAt:T0,watered:true,tended:true});
 const p=sessionPage(server);await p.session.open();const bridge=p.win.harvestBridge;bridge.takeInitial();
 mock.timers.tick(10*60000);await bridge.travel('village');
 assert.equal(bridge.serverNow,Date.now()+SKEW,'the trip\'s own load');assert.equal(bridge.serverAt,Date.now(),'and when it came');
 // The village page starts four seconds after the trip's farm came (a mid phone).
 mock.timers.tick(4000);const {state,client}=farmPage(bridge);await client.load();
 assert.equal(farmNow(),Date.now()+SKEW,'the server\'s clock, not ten minutes behind');
 assert.ok(instantResult(state,{type:'field',action:'harvest',id:0},farmNow()),'ripe: the tap harvests at once');
});
test('before: a page around without serverAt keeps the old count (an older page with a new farm-client.js), no serverNow is this device\'s clock',async t=>{
 mock.timers.enable({apis:['Date'],now:T0});t.after(()=>mock.timers.reset());
 const old=farmPage({serverNow:T0-600000,request:async()=>({})});await old.client.load();assert.equal(farmNow(),T0-600000,'as before: the bridge\'s serverNow counted from now');
 assert.equal(bridgeClock({serverNow:T0+SKEW,serverAt:T0-4000}),SKEW+4000);assert.equal(bridgeClock({serverNow:T0+SKEW}),SKEW);
 for(const bridge of [{},{serverNow:undefined,serverAt:T0},{serverNow:NaN},null])assert.equal(bridgeClock(bridge),0,'never NaN: this device\'s clock');
});
test('the first open counts from when the farm came too: a farm page that starts late is not behind by its own loading',async t=>{
 mock.timers.enable({apis:['Date'],now:T0});t.after(()=>mock.timers.reset());
 const p=sessionPage({state:createFarm(T0)});await p.session.open();const bridge=p.win.harvestBridge;
 assert.equal(bridge.serverNow,T0+SKEW);assert.equal(bridge.serverAt,T0);
 mock.timers.tick(12000);const {client}=farmPage(bridge);await client.load();assert.equal(farmNow(),Date.now()+SKEW);
});
test('the website and the portals travel the same way: the trip\'s load sets the bridge\'s clock before the new page starts',()=>{
 const trip=src=>src.match(/bridge\.travel=async to=>\{[^\n]*\};/)?.[0];
 for(const file of ['src/main.js','src/farm-session.js']){
  const line=trip(read(file));assert.ok(line,file);
  assert.match(line,/const data=await farmRequest\(\{operation:'load'\}\);if\(ticket!==generation\)return;initial=data;bridge\.serverNow=data\.serverNow;bridge\.serverAt=Date\.now\(\);const address=[^;]+;try\{frame\.dataset\.address=address;frame\.contentWindow\.location\.replace\(address\);\}catch\{frame\.src=address;\}\};$/,file);   // 13 Oct 2026: the new page takes the old one's place in the history (tests/back-button.test.mjs)
  assert.ok(read(file).includes('serverNow:initial.serverNow,serverAt:Date.now(),takeInitial(){'),file);
 }
 assert.match(read('public/farm-client.js'),/async function load\(\)\{clockOffset=bridgeClock\(bridge\);/);
});
