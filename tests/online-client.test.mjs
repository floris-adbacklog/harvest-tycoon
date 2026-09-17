import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarmClient} from '../public/farm-client.js';
function setup(request){
 globalThis.localStorage={getItem(){throw new Error('Legacy save must not be read');},setItem(){throw new Error('Farm state must not be saved locally');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{request,serverNow:Date.now()}}};
 const state={coins:180,inventory:{wheat:4}},client=createFarmClient(state,{onChange(){},onStatus(){}});
 return {state,client};
}
test('no optimistic progression; only a successful server response changes the view',async()=>{
 let finish,payload;const {state,client}=setup(body=>{payload=body;return new Promise(resolve=>finish=resolve);});await client.load();
 const action=client.runAction({type:'sell',item:'wheat'});assert.equal(state.coins,180);assert.equal(payload.operation,'action');assert(!Object.hasOwn(payload,'state'));assert(!Object.hasOwn(payload,'player_id'));
 await assert.rejects(client.runAction({type:'sell',item:'wheat'}),/previous action/);
 finish({state:{coins:212,inventory:{wheat:0}},serverNow:Date.now(),result:{coins:32}});
 assert.deepEqual(await action,{coins:32});assert.equal(state.coins,212);assert.equal(state.inventory.wheat,0);
});
test('failed server writes do not change state or read old browser saves',async()=>{
 const {state,client}=setup(async()=>{throw new Error('Unavailable');});await client.load();await assert.rejects(client.runAction({type:'sell'}),/Unavailable/);assert.equal(state.coins,180);assert.equal(state.inventory.wheat,4);
});
test('direct game access cannot create a client without an authenticated parent',()=>{
 globalThis.window={parent:{}};assert.throws(()=>createFarmClient({},{}),/Sign in/);
});
test('an expected game-rule rejection does not show a broken connection',async()=>{
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:async()=>{throw Object.assign(new Error('Choose a dry seedling.'),{code:'ACTION_REJECTED'});}}}};
 const statuses=[],s={coins:180};const client=createFarmClient(s,{onChange(){},onStatus:status=>statuses.push(status)});
 await assert.rejects(client.runAction({type:'activity_work'}),/seedling/);assert.deepEqual(statuses,['saving','saved']);assert.equal(s.coins,180);
});
