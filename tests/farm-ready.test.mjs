import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Execute the real cloud startup with controlled farm loading and DOM services.
const source=(await readFile(new URL('../src/game-cloud.js',import.meta.url),'utf8'))
 .replace(/^import .*;\n/gm,'')
 .replace("import(/* @vite-ignore */ '/game.js?v=familyhall-model-2')",'loadGame()');
function start({fail=false}={}){
 let finish;
 const farmReady=new Promise(resolve=>{finish=resolve;});
 const calls=[],watched=[];
 const bridge={takeInitial:()=>({profile:{}}),playerId:'player'};
 const context=vm.createContext({
  window:{parent:{harvestBridge:bridge},addEventListener(){}},
  document:{body:{hidden:true},getElementById:()=>null},location:{replace:()=>calls.push('redirect')},
  createCloudUI:()=>({setProfile(){},status(){}}),
  createAvatarSettings:()=>{},stopPageZoom:()=>{},loadStaff:()=>Promise.resolve(),staffRole:()=>null,
  createPlayerProfiles:()=>({open(){},isOpen:false}),
  createAdminDashboard:()=>({}),createChatUI:()=>null,
  setInterval:()=>1,clearInterval(){},setTimeout:()=>1,
  loadGame:async()=>{if(fail)throw new TypeError('Failed to fetch dynamically imported module');return {farmReady};},
  watchLoading:()=>({failed:()=>watched.push('failed'),done:ready=>watched.push(`done:${ready}`)}),console:{error(){}},
  showPaymentReturn:()=>calls.push('payment'),
  createStarterPackUI:async()=>calls.push('starter'),
  createPopupUI:()=>({start(){calls.push('popup');}}),
  createOfferUI:()=>calls.push('offer')
 });
 const done=vm.runInContext(`(async()=>{${source}})()`,context);
 return{calls,watched,done,finish};
}
test('starter offer and payment return wait for farm readiness',async()=>{
 const app=start();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.calls,[]);
 app.finish(true);await app.done;
 assert.deepEqual(app.calls,['payment','popup','offer','starter'],'the admin pop-up does not wait for the Starter Pack; the special offer listens before its catalogue arrives');
});
test('failed farm startup never shows purchase UI',async()=>{
 const app=start();app.finish(false);await app.done;
 assert.deepEqual(app.calls,[]);
});

// 3 Oct 2026: a game that does not load is no longer a bar standing still at 12% (public/loading-screen.js watchLoading opens it again).
test('the loading watch hears whether the game loaded: failed, ready or not ready',async()=>{
 const broken=start({fail:true});await broken.done;assert.deepEqual(broken.watched,['failed']);assert.deepEqual(broken.calls,[],'nothing else starts');
 const ok=start();ok.finish(true);await ok.done;assert.deepEqual(ok.watched,['done:true']);
 const webgl=start();webgl.finish(false);await webgl.done;assert.deepEqual(webgl.watched,['done:false'],'the game\'s own error stays, no reload');
});
