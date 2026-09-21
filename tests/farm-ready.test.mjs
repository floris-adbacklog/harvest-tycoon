import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Execute the real cloud startup with controlled farm loading and DOM services.
const source=(await readFile(new URL('../src/game-cloud.js',import.meta.url),'utf8'))
 .replace(/^import .*;\n/gm,'')
 .replace("import(/* @vite-ignore */ '/game.js?v=familyhall-model-2')",'loadGame()');
function start(){
 let finish;
 const farmReady=new Promise(resolve=>{finish=resolve;});
 const calls=[];
 const bridge={takeInitial:()=>({profile:{}}),playerId:'player'};
 const context=vm.createContext({
  window:{parent:{harvestBridge:bridge},addEventListener(){}},
  document:{body:{hidden:true},getElementById:()=>null},location:{replace:()=>calls.push('redirect')},
  createCloudUI:()=>({setProfile(){},status(){}}),
  createAvatarSettings:()=>{},
  createPlayerProfiles:()=>({open(){},isOpen:false}),
  setInterval:()=>1,clearInterval(){},
  loadGame:async()=>({farmReady}),
  showPaymentReturn:()=>calls.push('payment'),
  createStarterPackUI:async()=>calls.push('starter')
 });
 const done=vm.runInContext(`(async()=>{${source}})()`,context);
 return{calls,done,finish};
}
test('starter offer and payment return wait for farm readiness',async()=>{
 const app=start();
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(app.calls,[]);
 app.finish(true);await app.done;
 assert.deepEqual(app.calls,['payment','starter']);
});
test('failed farm startup never shows purchase UI',async()=>{
 const app=start();app.finish(false);await app.done;
 assert.deepEqual(app.calls,[]);
});
