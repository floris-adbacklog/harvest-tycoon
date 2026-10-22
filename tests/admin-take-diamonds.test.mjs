import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminGrant,validGrant,takeBackAlone,TAKE_ALONE} from '../supabase/functions/farm-api/admin-service.js';
import {adminGrantLog} from '../supabase/functions/farm-api/player-log.js';
import {createFarm} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const id='11111111-1111-4111-8111-111111111111',adminId='22222222-2222-4222-8222-222222222222';
const now=Date.UTC(2026,9,17,12);
const admin={id:adminId,email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};

// The owner, 17 Oct 2026: "Geef me mogelijkheid als admin om -diamonds te geven omdat mensen cheaten met friends invite in Edit".
// A minus in the admin gift's Diamonds takes them back: on its own, never below 0, never notified, logged with the minus.
function database(diamonds){
 const state=createFarm(now);state.diamonds=diamonds;
 const calls=[],row={player_id:id,state,revision:3,receipts:[]};
 return {calls,
  from(table){
   const call={table};calls.push(call);
   if(table==='player_farms')return {select(){return this;},eq(){return this;},async maybeSingle(){return {data:{...row,state:structuredClone(row.state)}};}};
   if(table==='player_stats')return {select(){return this;},eq(){return this;},lte(){return Promise.resolve({error:null});},update(v){call.update=v;return this;},async maybeSingle(){return {data:{username:'Tony',last_active_at:'2026-10-16T08:00:00.000Z'}};}};
   if(table==='admin_grants')return {async insert(values){call.insert=values;return {error:null};}};
   if(table==='player_notices')return {async insert(values){call.notice=values;return {error:null};}};
   throw new Error(`unexpected table ${table}`);
  },
  async rpc(name,args){calls.push({rpc:name,args});return {data:true,error:null};}
 };
}
const take=(db,body)=>handleAdminGrant({admin:db,body:{playerId:id,coins:0,xp:0,item:null,itemCount:0,notify:false,...body},user:admin});

test('a minus in Diamonds is a valid amount up to the same cap; it stands on its own and is never notified',()=>{
 assert.equal(validGrant({coins:0,xp:0,diamonds:-1}),true);assert.equal(validGrant({coins:0,xp:0,diamonds:-20000}),true);
 assert.equal(validGrant({coins:0,xp:0,diamonds:-20001}),false);assert.equal(validGrant({coins:0,xp:0,diamonds:-1.5}),false);
 assert.equal(validGrant({coins:-5,xp:0,diamonds:0}),false,'coins, XP and goods stay gifts only');
 assert.equal(takeBackAlone({coins:0,xp:0,diamonds:-50,notify:false}),true);
 for(const other of [{coins:1},{xp:1},{item:'wheat',itemCount:2},{notify:true}])assert.equal(takeBackAlone({coins:0,xp:0,diamonds:-50,notify:false,...other}),false,JSON.stringify(other));
 assert.equal(takeBackAlone({coins:5,xp:0,diamonds:5,notify:true}),true,'a gift is not a removal');
});

test('taking back: the diamonds go, the row in admin_grants has the minus, no "Donation!" and no notice',async()=>{
 const db=database(80),r=await take(db,{diamonds:-50});
 assert.equal(r.status,200);assert.equal(r.data.granted.diamonds,-50);assert.equal(r.data.totals.diamonds,30);
 const saved=db.calls.find(c=>c.rpc==='harvest_commit_farm').args.p_state;
 assert.equal(saved.diamonds,30);assert.equal(saved.pendingGift,undefined,'no Donation! popup for a removal');
 assert.deepEqual(db.calls.find(c=>c.insert).insert,{player_id:id,granted_by:adminId,coins:0,xp:0,diamonds:-50,item:null,item_count:0,notified:false,message:null});
 assert.equal(db.calls.some(c=>c.notice),false);
 assert.equal(r.data.profile.player_id,adminId);
});

test('never below 0: it takes what the farmer has; with none there is nothing to save',async()=>{
 const db=database(30),r=await take(db,{diamonds:-500});
 assert.equal(r.status,200);assert.equal(r.data.granted.diamonds,-30,'what was really taken');assert.equal(r.data.totals.diamonds,0);
 assert.equal(db.calls.find(c=>c.insert).insert.diamonds,-30);
 const none=database(0),n=await take(none,{diamonds:-5});
 assert.equal(n.status,400);assert.equal(n.data.error,'This farmer has no diamonds to take back.');
 assert.equal(none.calls.some(c=>c.rpc||c.insert),false,'nothing saved, nothing logged');
});

test('a removal with coins, XP, goods or notify on is refused before anything is read or saved',async()=>{
 for(const other of [{coins:100},{xp:5},{item:'wheat',itemCount:3},{notify:true,message:'Bye'}]){
  const db=database(80),r=await take(db,{diamonds:-10,...other});
  assert.equal(r.status,400,JSON.stringify(other));assert.equal(r.data.error,TAKE_ALONE);
  assert.equal(db.calls.length,0);
 }
 const db=database(80),r=await handleAdminGrant({admin:db,body:{playerId:id,diamonds:-10},user:{...admin,email:'someone@else.com'}});
 assert.equal(r.status,403,'still only the admin');
});

test('the farmer\'s own log says the admin took diamonds back',()=>{
 const [line]=adminGrantLog({coins:0,xp:0,diamonds:-30,item:null,itemCount:0});
 assert.deepEqual(line,{category:'staff',action:'admin_take',text:'The admin took back diamonds · −30 diamonds'});
 assert.match(adminGrantLog({coins:5,xp:0,diamonds:2})[0].text,/^Received a gift from the admin/,'a gift stays a gift');
});

test('Edit on a farmer: the Diamonds field takes a minus; a removal asks in red and sends notify off; the SQL allows the minus',()=>{
 const ui=read('src/player-profiles.js');
 assert.match(ui,/<input type="number" min="-20000" step="1" placeholder="0" id="admin-grant-diamonds">/,'no inputmode=numeric: the iPhone keyboard then has a minus');
 assert.match(ui,/diamonds=Math\.trunc\(Number\(diamondsInput\.value\)\|\|0\);/);
 assert.match(ui,/if\(diamonds<0\)return takeBack\(\{diamonds,other:coins\|\|xp\|\|\(item&&itemCount\)\|\|notify\|\|pass\}\);/);
 assert.match(ui,/A minus in Diamonds takes them back \(−50\): never below 0, and without a notification\./);
 assert.ok(ui.includes(`'${TAKE_ALONE}'`),'the page says the server\'s rule in the same words');
 assert.match(ui,/confirmLabel:'Take back',cancelLabel:'Cancel',picture:'diamonds',tone:'danger'\}/);
 assert.match(ui,/bridge\.request\(\{operation:'admin_grant',playerId,coins:0,xp:0,diamonds,item:null,itemCount:0,notify:false,message:''\}\)/);
 assert.match(ui,/Taken back: \$\{-data\.granted\.diamonds\} diamonds\. They now have \$\{data\.totals\.diamonds\}\./);
 const sql=read('supabase/admin-grants-take-back.sql');
 assert.match(sql,/alter table public\.admin_grants drop constraint if exists admin_grants_diamonds_check;/);
 assert.match(sql,/add constraint admin_grants_diamonds_check check \(diamonds between -20000 and 20000\);/,'the same cap as MAX_DIAMONDS');
 assert.match(read('supabase/functions/farm-api/admin-service.js'),/const MAX_GRANT=1000000,MAX_DIAMONDS=20000,/);
});
