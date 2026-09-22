import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminGrant,isSuperadmin,validGrantAmount,validGrant,validItem,sanitizeGiftMessage} from '../supabase/functions/farm-api/admin-service.js';
import {createFarm,levelOf} from '../game/farm-state.js';
const id='11111111-1111-4111-8111-111111111111',adminId='22222222-2222-4222-8222-222222222222';
const now=Date.UTC(2026,8,22,12);
const admin={id:adminId,email:'floris@millstone.nl'};

test('only the one account passes isSuperadmin, matched case-insensitively and never by anything client-supplied',()=>{
 assert.equal(isSuperadmin({email:'floris@millstone.nl'}),true);
 assert.equal(isSuperadmin({email:'Floris@Millstone.NL'}),true);
 assert.equal(isSuperadmin({email:' floris@millstone.nl '}),true);
 for(const user of [{email:'someone.else@millstone.nl'},{email:'floris@millstone.nl.evil.com'},{email:undefined},{},null,undefined])assert.equal(isSuperadmin(user),false);
});
test('grant amounts must be whole, non-negative, within limits, and at least one must be set',()=>{
 assert.equal(validGrantAmount(0,1000000),true);assert.equal(validGrantAmount(1000000,1000000),true);
 for(const bad of [-1,1000001,1.5,NaN,Infinity,'5'])assert.equal(validGrantAmount(bad,1000000),false);
 assert.equal(validGrant({coins:0,xp:0,diamonds:0}),false,'nothing to give');
 assert.equal(validGrant({coins:1,xp:0,diamonds:0}),true);
 assert.equal(validGrant({coins:0,xp:0,diamonds:5000}),true,'diamonds allowed up to their own, tighter cap');
 assert.equal(validGrant({coins:0,xp:0,diamonds:5001}),false,'diamonds capped well below the coins/xp limit');
 assert.equal(validGrant({coins:1000001,xp:0,diamonds:0}),false);
});
test('an item grant needs a real item key, a positive whole count within its own cap, or no item at all',()=>{
 assert.equal(validItem(null,undefined),true,'no item, nothing to check');
 assert.equal(validItem(null,0),true);assert.equal(validItem(null,5),false,'a count with no item makes no sense');
 assert.equal(validItem('wheat',5),true);assert.equal(validItem('wheat',10000),true,'exactly the cap');
 assert.equal(validItem('wheat',10001),false);assert.equal(validItem('wheat',0),false,'an item with nothing to give is not a gift');
 assert.equal(validItem('wheat',-1),false);assert.equal(validItem('wheat',1.5),false);
 assert.equal(validItem('not-a-real-item',5),false);
 assert.equal(validGrant({coins:0,xp:0,diamonds:0,item:'wheat',itemCount:5}),true,'an item alone is enough to count as a gift');
 assert.equal(validGrant({coins:0,xp:0,diamonds:0,item:'not-a-real-item',itemCount:5}),false);
});
test('a gift message is trimmed, capped at 200 characters, and blank becomes no message at all',()=>{
 assert.equal(sanitizeGiftMessage('  Enjoy!  '),'Enjoy!');
 assert.equal(sanitizeGiftMessage(''),null);assert.equal(sanitizeGiftMessage('   '),null);assert.equal(sanitizeGiftMessage(undefined),null);
 assert.equal(sanitizeGiftMessage('x'.repeat(500)).length,200);
 assert.equal(sanitizeGiftMessage(42),'42','never throws on a non-string');
});

function database({state=createFarm(now),revision=7,receipts=[{id:'r1',result:{}}],username='Tony',rpcResults=[true]}={}){
 const calls=[];let rpcCall=0;
 const row={player_id:id,state,revision,receipts};
 return {calls,row,
  from(table){
   const call={table};calls.push(call);
   // A fresh, independent copy every fetch, like a real row read back from the database — normalizeFarm mutates
   // in place, so reusing one shared object across a retry would silently double up whatever it changes.
   if(table==='player_farms')return {select(v){call.select=v;return this;},eq(k,v){call.eq=[k,v];return this;},async maybeSingle(){return {data:{...row,state:structuredClone(row.state)}};}};
   if(table==='player_stats')return {select(v){call.select=v;return this;},eq(k,v){call.eq=[k,v];return this;},async maybeSingle(){return {data:{username}};}};
   if(table==='admin_grants')return {async insert(values){call.insert=values;return {error:null};}};
   throw new Error(`unexpected table ${table}`);
  },
  // A false result means someone else's commit landed first; its revision is bumped right away, like the real row
  // would already show by the time a retry re-fetches it.
  async rpc(name,args){calls.push({rpc:name,args});const data=rpcResults[Math.min(rpcCall,rpcResults.length-1)];rpcCall++;if(!data)row.revision++;return {data,error:null};}
 };
}
test('a valid grant adds to the existing balance, recomputes the real level, and logs who gave it',async()=>{
 const state=createFarm(now);state.coins=100;state.xp=0;state.diamonds=5;
 const db=database({state});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:50000,xp:1000,diamonds:10},user:admin});
 assert.equal(result.status,200);
 assert.deepEqual(result.data.granted,{coins:50000,xp:1000,diamonds:10,item:null,itemCount:0});
 // Regression: bridge.request() in src/main.js throws "Your session has ended" for any farm-api response whose
 // profile.player_id is not the signed-in caller's own id (undefined, missing entirely, fails that check too) —
 // this shipped without it once, so admin_grant's own success response silently looked like a dead session.
 assert.equal(result.data.profile.player_id,adminId,'the admin\'s own id, not the farmer who was granted something');
 assert.equal(result.data.totals.coins,50100);assert.equal(result.data.totals.xp,1000);assert.equal(result.data.totals.diamonds,15);
 assert.equal(result.data.totals.level,levelOf({xp:1000,xpOffset:0,xpCurve:state.xpCurve}));
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.equal(rpc.p_player,id);assert.equal(rpc.p_expected,7);assert.equal(rpc.p_currency,50100);assert.equal(rpc.p_username,'Tony');
 assert.equal(rpc.p_state.coins,50100);assert.equal(rpc.p_state.xp,1000);assert.equal(rpc.p_state.diamonds,15);
 assert.deepEqual(rpc.p_receipts,[{id:'r1',result:{}}],'the receipt log is carried through untouched, not rewritten');
 const logged=db.calls.find(c=>c.insert)?.insert;
 assert.deepEqual(logged,{player_id:id,granted_by:adminId,coins:50000,xp:1000,diamonds:10,item:null,item_count:0,notified:false,message:null},'the audit row records who gave it, separate from the farm state itself');
});
test('a crop gift adds to inventory and counts exactly as a harvest would: the stat, the total, and mastery progress',async()=>{
 const state=createFarm(now);const before=state.inventory.wheat,beforeHarvest=state.stats.harvest_wheat??0,beforeTotal=state.stats.harvested,beforeMastery=state.mastery.harvests.wheat;
 const db=database({state});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:0,xp:0,diamonds:0,item:'wheat',itemCount:25},user:admin});
 assert.equal(result.status,200);assert.deepEqual(result.data.granted,{coins:0,xp:0,diamonds:0,item:'wheat',itemCount:25});
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.equal(rpc.p_state.inventory.wheat,before+25);
 assert.equal(rpc.p_state.stats.harvest_wheat,beforeHarvest+25);
 assert.equal(rpc.p_state.stats.harvested,beforeTotal+25);
 assert.equal(rpc.p_state.mastery.harvests.wheat,beforeMastery+25);
 assert.equal(rpc.p_state.stats.goods_produced,state.stats.goods_produced,'a crop never touches the production stat');
 const logged=db.calls.find(c=>c.insert)?.insert;assert.equal(logged.item,'wheat');assert.equal(logged.item_count,25);
});
test('a produced-good gift adds to inventory and counts as goods_produced plus its own made_<item> stat',async()=>{
 const state=createFarm(now);const before=state.inventory.honey,beforeProduced=state.stats.goods_produced??0,beforeMade=state.stats.made_honey??0;
 const db=database({state});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:0,xp:0,diamonds:0,item:'honey',itemCount:8},user:admin});
 assert.equal(result.status,200);
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.equal(rpc.p_state.inventory.honey,before+8);
 assert.equal(rpc.p_state.stats.goods_produced,beforeProduced+8);
 assert.equal(rpc.p_state.stats.made_honey,beforeMade+8);
 assert.equal(rpc.p_state.stats.harvested,state.stats.harvested,'a produced good never touches the harvest stat');
});
test('an item can be combined with coins/XP/diamonds and included in the pendingGift shown to the player',async()=>{
 const db=database();
 await handleAdminGrant({admin:db,body:{playerId:id,coins:50,xp:0,diamonds:0,item:'corn',itemCount:12,notify:true},user:admin});
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.deepEqual(rpc.p_state.pendingGift,{coins:50,xp:0,diamonds:0,item:'corn',itemCount:12,message:null,at:rpc.p_state.pendingGift.at});
});
test('an invalid item key is rejected before touching the database, even with valid coins alongside it',async()=>{
 const db=database();
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:100,item:'not-a-real-item',itemCount:5},user:admin});
 assert.equal(result.status,400);assert.equal(db.calls.length,0);
});
test('notify stores a pendingGift on the committed state, ready to be picked up on the farmer\'s next load; message is optional',async()=>{
 const db=database();
 await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0,notify:true,message:'  Thanks for playing!  '},user:admin});
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.deepEqual(rpc.p_state.pendingGift,{coins:100,xp:0,diamonds:0,item:null,itemCount:0,message:'Thanks for playing!',at:rpc.p_state.pendingGift.at});
 const logged=db.calls.find(c=>c.insert)?.insert;
 assert.equal(logged.notified,true);assert.equal(logged.message,'Thanks for playing!');
});
test('without notify, nothing is queued and the audit row says so',async()=>{
 const db=database();
 await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0},user:admin});
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.ok(!('pendingGift' in rpc.p_state));
 const logged=db.calls.find(c=>c.insert)?.insert;
 assert.equal(logged.notified,false);assert.equal(logged.message,null);
});
test('notify without a message still queues the gift, just with no note',async()=>{
 const db=database();
 await handleAdminGrant({admin:db,body:{playerId:id,coins:0,xp:500,diamonds:0,notify:true},user:admin});
 const rpc=db.calls.find(c=>c.rpc==='harvest_commit_farm').args;
 assert.equal(rpc.p_state.pendingGift.message,null);
});
test('anyone but the one admin account is rejected before touching the database at all',async()=>{
 for(const user of [{id:'x',email:'someone.else@millstone.nl'},{id:'x',email:''},null]){
  const db=database();
  const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0},user});
  assert.equal(result.status,403);assert.equal(db.calls.length,0);
  assert.equal(result.data.profile.player_id,user?.id,'even a 403 carries the caller\'s own id, never undefined by omission');
 }
});
test('a malformed player id or an empty/out-of-range gift is rejected before touching the database',async()=>{
 for(const body of [{playerId:'not-a-uuid',coins:1},{playerId:id,coins:0,xp:0,diamonds:0},{playerId:id,coins:-1},{playerId:id,coins:1000001},{playerId:id,diamonds:5001}]){
  const db=database();
  const result=await handleAdminGrant({admin:db,body,user:admin});
  assert.equal(result.status,400);assert.equal(db.calls.length,0);
 }
});
test('a farmer that does not exist returns 404 instead of creating anything',async()=>{
 const db=database();db.from=table=>({select(){return this;},eq(){return this;},async maybeSingle(){return {data:null};}});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0},user:admin});
 assert.equal(result.status,404);
});
test('a revision conflict is retried with the fresh revision, not silently dropped or doubled',async()=>{
 const db=database({revision:7,rpcResults:[false,true]});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0},user:admin});
 assert.equal(result.status,200);
 const attempts=db.calls.filter(c=>c.rpc==='harvest_commit_farm');
 assert.equal(attempts.length,2);assert.equal(attempts[0].args.p_expected,7);assert.equal(attempts[1].args.p_expected,8,'refetched the row before retrying, used its new revision');
});
test('a farmer that keeps changing at the same moment fails closed after a few tries, never applied twice',async()=>{
 const db=database({rpcResults:[false,false,false,false,false]});
 const result=await handleAdminGrant({admin:db,body:{playerId:id,coins:100,xp:0,diamonds:0},user:admin});
 assert.equal(result.status,409);
 assert.equal(db.calls.filter(c=>c.insert).length,0,'never logged a grant that was never actually committed');
});

test('the admin_grant operation is wired in, gated on the caller, and reachable without a username set',()=>{
 const code=readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8');
 assert.match(code,/import \{handleAdminGrant\} from '\.\/admin-service\.js';/);
 assert.match(code,/\[.*'admin_grant'.*\]\.includes\(body\?\.operation\)/);
 const branch=code.indexOf("body.operation==='admin_grant'");
 assert.ok(branch>0);
 assert.ok(branch<code.indexOf("if(!username)return reply"),'reachable before the caller needs their own username set, like player_search/player_profile');
 assert.match(code,/const granted=await handleAdminGrant\(\{admin,body,user\}\);return reply\(granted\.data,granted\.status\);/);
});
test('a waiting gift is picked up and cleared on the farmer\'s own next load, alongside level/chapter rewards',()=>{
 const code=readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8');
 const load=code.slice(code.indexOf("body.operation==='load'"),code.indexOf("body.operation==='load'")+1400);
 assert.match(load,/const gift=state\.pendingGift\?\?null;if\(gift\)delete state\.pendingGift;/,'read once, then removed from the state that gets committed');
 assert.match(load,/if\(welcome\|\|levelReward\.levels\.length\|\|chapterReward\.chapters\.length\|\|gift\)\{/,'a waiting gift alone is enough to trigger the commit, like a level or chapter reward');
 assert.match(load,/return reply\(\{state,profile:\{\.\.\.profile,currency:state\.coins\},levelReward,chapterReward,gift,welcome,revision:row\.revision\+1,serverNow:now\}\);/);
});
