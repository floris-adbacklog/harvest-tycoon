import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import * as rules from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const source=stripTypeScriptTypes(readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8').replace(/^import .*;\n/gm,''));
const user='11111111-1111-4111-8111-111111111111',requestId='22222222-2222-4222-8222-222222222222';
const token=`test.${Buffer.from(JSON.stringify({session_id:'test-session'})).toString('base64url')}.fixture`;
function endpoint({failCommit=false,active=true}={}){
 const state=createLegacyFarm();state.diamonds=2000;
 let row={player_id:user,state,revision:10,receipts:[]},handler,commits=0;
 const admin={auth:{async getUser(){return {data:{user:{id:user,user_metadata:{username:'Test farmer'}}}};}},from(table){return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:table==='player_farms'?structuredClone(row):{player_id:user,username:'Test farmer',currency:state.coins,level:rules.levelOf(state)}};}};},async rpc(name,args){
  if(name==='harvest_session_active')return {data:active};
  assert.equal(name,'harvest_commit_farm');assert.equal(args.p_player,user);
  if(failCommit)return {error:{code:'SIMULATED_FAILURE'}};
  if(args.p_expected!==row.revision)return {data:false};
  row={...row,state:structuredClone(args.p_state),receipts:structuredClone(args.p_receipts),revision:row.revision+1};commits++;return {data:true};
 }};
 vm.runInNewContext(source,{...rules,createClient:()=>admin,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,atob,crypto,console:{error(){}},Uint32Array,handleFamily:()=>{throw new Error('unexpected family call');},handlePlayerDirectory:()=>{throw new Error('unexpected directory call');}});
 return {get row(){return row;},get commits(){return commits;},async send(body,authorized=true){const r=await handler(new Request('https://test.invalid/farm-api',{method:'POST',headers:authorized?{Authorization:`Bearer ${token}`}:{},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}};
}
const body=(id=requestId)=>({operation:'action',requestId:id,action:{type:'buy_vip',plan:'week',expectedCost:500,expectedExpiresAt:0}});
test('the actual farm endpoint commits duplicate/concurrent VIP request IDs only once',async()=>{
 const api=endpoint(),results=await Promise.all([api.send(body()),api.send(body())]);
 assert.deepEqual(results.map(r=>r.status),[200,200]);assert.equal(api.commits,1);assert.equal(api.row.state.diamonds,1500);assert.equal(api.row.receipts.length,1);
 const expiry=api.row.state.vipExpiresAt;assert.equal(results[0].data.result.vipExpiresAt,expiry);assert.equal(results[1].data.result.vipExpiresAt,expiry);
 const again=await api.send(body());assert.equal(again.status,200);assert.equal(api.commits,1);
});
test('concurrent different requests with the same VIP quote cannot both spend',async()=>{
 const api=endpoint(),results=await Promise.all([api.send(body()),api.send(body('33333333-3333-4333-8333-333333333333'))]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,422]);assert.equal(api.row.state.diamonds,1500);assert.equal(api.commits,1);
});
test('commit failure keeps the authoritative diamonds and expiry unchanged',async()=>{
 const api=endpoint({failCommit:true}),before=structuredClone(api.row);const response=await api.send(body());
 assert.equal(response.status,503);assert.deepEqual(api.row,before);assert.equal(api.commits,0);
});
test('client-supplied farm, player ID, VIP time and balance are never authoritative',async()=>{
 const api=endpoint();const response=await api.send({...body(),player_id:'other',state:{diamonds:999999,vipExpiresAt:9999999999999},action:{...body().action,vipExpiresAt:9999999999999,diamonds:999999}});
 assert.equal(response.status,200);assert.equal(api.row.state.diamonds,1500);assert.ok(api.row.state.vipExpiresAt<Date.now()+8*rules.DAY_MS);assert.equal(api.row.player_id,user);
});
test('VIP requires an authenticated, still-active server session',async()=>{
 const anonymous=endpoint();assert.equal((await anonymous.send(body(),false)).status,401);assert.equal(anonymous.commits,0);
 const inactive=endpoint({active:false});assert.equal((await inactive.send(body())).status,401);assert.equal(inactive.commits,0);
});
