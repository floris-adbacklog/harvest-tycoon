import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarmClient,instantResult,INSTANT_ACTIONS} from '../public/farm-client.js';
import {createFarm,levelOf,xpForLevel} from '../public/farm-state.js';
function setup(request){
 globalThis.localStorage={getItem(){throw new Error('Legacy save must not be read');},setItem(){throw new Error('Farm state must not be saved locally');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{request,serverNow:Date.now()}}};
 const state={coins:180,inventory:{wheat:4}},client=createFarmClient(state,{onChange(){},onStatus(){}});
 return {state,client};
}
// 1 Oct 2026 ("a harvest took over five seconds"): everyday taps show at once with the same rules as the server, and the server's
// answer takes over; a second tap waits its turn instead of being refused; a refused tap goes back to the saved farm and says why.
function farmSetup(request,extra={}){
 globalThis.localStorage={getItem(){throw new Error('Legacy save must not be read');},setItem(){throw new Error('Farm state must not be saved locally');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{request,serverNow:Date.now()}}};
 const state=createFarm(Date.now());state.inventory.wheat=4;
 const errors=[],statuses=[],client=createFarmClient(state,{onChange(){},onStatus:s=>statuses.push(s),onError:m=>errors.push(m),...extra});
 return {state,client,errors,statuses};
}
test('an everyday tap shows at once, and the server answer takes over when it comes',async()=>{
 const answers=[];let payload;
 const {state,client}=farmSetup(body=>{payload=body;return new Promise(resolve=>answers.push(resolve));});await client.load();
 const coins=state.coins,result=await client.runAction({type:'sell',item:'wheat',quantity:4});
 assert.equal(state.inventory.wheat,0,'sold on the screen before the server answered');assert(state.coins>coins);assert(result.coins>0);
 assert.equal(payload.operation,'action');assert(!Object.hasOwn(payload,'state'));assert(!Object.hasOwn(payload,'player_id'));
 const saved=structuredClone(state);saved.coins=coins+999;answers.shift()({state:saved,serverNow:Date.now(),result});
 await new Promise(r=>setTimeout(r,0));assert.equal(state.coins,coins+999,'the server has the last word');
});
test('a second tap waits its turn instead of being refused, and is sent after the first',async()=>{
 const sent=[],answers=[];
 const {state,client}=farmSetup(body=>{sent.push(body.action.type);return new Promise(resolve=>answers.push(()=>resolve({state:structuredClone(state),serverNow:Date.now(),result:{}})));});await client.load();
 await client.runAction({type:'sell',item:'wheat',quantity:1});const second=client.runAction({type:'sell',item:'wheat',quantity:1});
 await second;await new Promise(r=>setTimeout(r,0));assert.equal(sent.length,1,'the second waits until the first is answered');
 answers.shift()();await new Promise(r=>setTimeout(r,0));assert.equal(sent.length,2);answers.shift()();
});
test('a tap the server refuses goes back to the saved farm and says why',async()=>{
 const {state,client,errors}=farmSetup(async()=>{throw Object.assign(new Error('Your farm changed in another tab.'),{code:'ACTION_REJECTED'});});await client.load();
 const coins=state.coins;await client.runAction({type:'sell',item:'wheat',quantity:4});assert.equal(state.inventory.wheat,0);
 await new Promise(r=>setTimeout(r,0));await new Promise(r=>setTimeout(r,0));
 assert.equal(state.inventory.wheat,4);assert.equal(state.coins,coins);assert.deepEqual(errors,['Your farm changed in another tab.']);
});
test('what the rules refuse is refused at once, without asking the server; other actions still wait for the server',async()=>{
 let asked=0;const {state,client}=farmSetup(async()=>{asked++;throw new Error('Unavailable');});await client.load();
 await assert.rejects(client.runAction({type:'sell',item:'corn',quantity:50}));assert.equal(asked,0);
 await assert.rejects(client.runAction({type:'buy_boost',boost:'double_harvest'}),/Unavailable/);assert.equal(asked,1);assert.equal(state.inventory.wheat,4);
});
test('a level-up shows at once too (a new farm levels up on its first harvest); only the invited friend\'s reward waits for the server',()=>{
 const now=Date.now(),farm=createFarm(now),ready=farm.plots.findIndex(p=>p.crop&&p.readyAt<=now);
 const first=instantResult(farm,{type:'field',id:ready,action:'harvest'},now);
 assert.ok(first,'the first harvest shows at once');assert(levelOf(first.trial)>levelOf(farm));assert.ok(first.result.levelReward,'with its level reward, from the same rules as the server');
 const invited=structuredClone(farm);invited.invite={code:'ANNA12',by:'Anna',at:now};invited.xp=xpForLevel(10)-1;
 assert.equal(instantResult(invited,{type:'field',id:ready,action:'harvest'},now),null,'reaching level 10 as an invited friend waits for the server');
 assert.equal(instantResult(farm,{type:'buy_vip',plan:'week'},now),null,'not an everyday tap');
 assert.deepEqual([...INSTANT_ACTIONS].sort(),['activity_start','activity_work','beginner_claim','checkin','collect','collect_all','comeback','construct','daily','delivery','expand','field','fields','mastery','produce','quest','sell','stall_collect','tractor','upgrade']);
 assert(!INSTANT_ACTIONS.has('chore'),'a chore\'s lucky bonus is the server\'s roll');
 assert.match(readFileSync(new URL('../public/farm-client.js',import.meta.url),'utf8'),/if\(\(trial\.diamonds\?\?0\)<\(state\.diamonds\?\?0\)\)return null;/,'spending diamonds waits for the server');
 assert.equal(instantResult({coins:1},{type:'quest',id:'x'},now),null,'a slip in the rules (not a refusal) leaves it to the server');
});
test('direct game access cannot create a client without an authenticated parent',()=>{
 globalThis.window={parent:{}};assert.throws(()=>createFarmClient({},{}),/Sign in/);
});
test('a gift on the load response is handed to onGift once, alongside the state it arrived with',async()=>{
 globalThis.localStorage={getItem(){throw new Error('unused');},setItem(){throw new Error('unused');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 const gift={coins:500,xp:0,diamonds:0,message:'Enjoy!'};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:async()=>({state:{coins:680},serverNow:Date.now(),gift})}}};
 const gifts=[],state={coins:180};const client=createFarmClient(state,{onChange(){},onStatus(){},onGift:g=>gifts.push(g)});
 await client.refresh();
 assert.deepEqual(gifts,[gift]);assert.equal(state.coins,680);
});
test('no gift field means onGift is never called',async()=>{
 globalThis.localStorage={getItem(){throw new Error('unused');},setItem(){throw new Error('unused');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:async()=>({state:{coins:180},serverNow:Date.now()})}}};
 const gifts=[],state={coins:180};const client=createFarmClient(state,{onChange(){},onStatus(){},onGift:g=>gifts.push(g)});
 await client.refresh();
 assert.deepEqual(gifts,[]);
});
test('an expected game-rule rejection does not show a broken connection',async()=>{
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:async()=>{throw Object.assign(new Error('Choose a dry seedling.'),{code:'ACTION_REJECTED'});}}}};
 const statuses=[],s={coins:180};const client=createFarmClient(s,{onChange(){},onStatus:status=>statuses.push(status)});
 await assert.rejects(client.runAction({type:'chore',id:'weeds'}),/seedling/);assert.deepEqual(statuses,['saving','saved']);assert.equal(s.coins,180);
});
