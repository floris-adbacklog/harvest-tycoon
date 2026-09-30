import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {sendEmailChange,confirmEmailChange,confirmEmailCode,EMAIL_CODE} from '../supabase/functions/farm-api/event-service.js';
import {handleAdminEmail} from '../supabase/functions/farm-api/admin-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 28 Sep 2026: email sign-ups are not checked when the account is made, so a typo is common. The farmer changes the address with
// their password and a code sent to the new address; the admin (never a moderator) can change it directly.
function db({row=null,moveError=null,users={}}={}){
 const moved=[];
 const table={select(){return this;},eq(){return this;},async maybeSingle(){return {data:row?{...row}:null,error:null};},
  async upsert(value){row={attempts:0,sends_today:0,...(row??{}),...value};return {error:null};},
  update(patch){return {eq:async()=>{row={...row,...patch};return {error:null};}};}};
 return {row:()=>row,moved,from:()=>table,rpc:async()=>({data:false,error:null}),
  auth:{admin:{async updateUserById(id,attrs){if(moveError)return {data:null,error:moveError};moved.push([id,attrs]);return {data:{user:{id,...attrs}},error:null};},
   async getUserById(id){const user=users[id];return user?{data:{user},error:null}:{data:{user:null},error:{message:'User not found'}};}}}};
}
const farmer={id:'00000000-0000-4000-8000-000000000001',email:'farmer@exampel.com',app_metadata:{provider:'email'}};
const t0=Date.UTC(2026,8,28,12),password='hunter22',passwordOk=async(email,typed)=>email===farmer.email&&typed===password;

test('the new address and the password first; nothing is sent for a wrong or odd request',async()=>{
 const admin=db(),sent=[],mail=async to=>sent.push(to);
 const ask=over=>sendEmailChange({admin,user:farmer,email:'farmer@example.com',password,passwordOk,now:t0,mail,...over});
 await assert.rejects(()=>ask({user:{...farmer,app_metadata:{provider:'facebook'}}}),/Google or Facebook/);
 for(const [email,why] of [['not-an-address',/valid email/],['FARMER@exampel.com ',/already your email/],['floris@millstone.nl',/cannot be used/]])await assert.rejects(()=>ask({email}),why,email);
 await assert.rejects(()=>ask({password:''}),/Type your password/);
 await assert.rejects(()=>ask({user:{id:'00000000-0000-4000-8000-0000000000aa',email:'floris@millstone.nl',email_confirmed_at:'2026-09-01T00:00:00Z',app_metadata:{provider:'email'}}}),/admin account/,'the admin never moves its own address from the game');
 assert.equal(sent.length,0);assert.equal(admin.row(),null,'nothing counted for a request that never reached the password');
});
test('a wrong password uses one of the day\'s five and waits a minute, so it cannot be guessed',async()=>{
 const admin=db(),sent=[],mail=async to=>sent.push(to);
 await assert.rejects(()=>sendEmailChange({admin,user:farmer,email:'farmer@example.com',password:'guess',passwordOk,now:t0,mail}),/password is not right/);
 assert.equal(admin.row().sends_today,1);assert.equal(sent.length,0);assert.equal(admin.row().new_email,undefined);
 await assert.rejects(()=>sendEmailChange({admin,user:farmer,email:'farmer@example.com',password,passwordOk,now:t0+30000,mail}),/Wait a minute/);
 let t=t0;for(let i=1;i<EMAIL_CODE.perDay;i++){t+=EMAIL_CODE.waitMs;await sendEmailChange({admin,user:farmer,email:'farmer@example.com',password:'guess'+i,passwordOk,now:t,mail}).catch(()=>{});}
 await assert.rejects(()=>sendEmailChange({admin,user:farmer,email:'farmer@example.com',password,passwordOk,now:t+EMAIL_CODE.waitMs,mail}),/5 codes today/);
});
test('the code goes to the new address; only that code moves the account, and the new address counts as confirmed',async()=>{
 const confirmedOld={player_id:farmer.id,email:farmer.email,confirmed_at:new Date(t0-86400000).toISOString(),attempts:0,sends_today:0};
 const admin=db({row:confirmedOld}),sent=[];
 const r=await sendEmailChange({admin,user:farmer,email:' Farmer@Example.com',password,passwordOk,now:t0,mail:async to=>sent.push(to),random:()=>424242});
 assert.deepEqual(r,{sent:true,email:'farmer@example.com',waitMs:EMAIL_CODE.waitMs});assert.deepEqual(sent,['farmer@example.com']);
 assert.equal(admin.row().email,farmer.email,'until the code, the current address stays');assert.ok(admin.row().confirmed_at,'and stays confirmed');
 await assert.rejects(()=>confirmEmailCode({admin,user:farmer,code:'424242',now:t0+1000}),/Ask for a new code/,'the change code never confirms the old address');
 await assert.rejects(()=>confirmEmailChange({admin,user:farmer,code:'111111',now:t0+1000}),/4 tries left/);assert.equal(admin.moved.length,0);
 const done=await confirmEmailChange({admin,user:farmer,code:'424242',now:t0+2000});
 assert.deepEqual(done,{changed:true,email:'farmer@example.com'});assert.deepEqual(admin.moved,[[farmer.id,{email:'farmer@example.com',email_confirm:true}]]);
 assert.equal(admin.row().email,'farmer@example.com');assert.equal(admin.row().new_email,null);assert.equal(admin.row().code_hash,null);assert.ok(admin.row().confirmed_at);
 await assert.rejects(()=>confirmEmailChange({admin,user:farmer,code:'424242',now:t0+3000}),/Ask for a code/,'used once');
});
test('an address another account has is refused with a clear message, and the account stays where it was',async()=>{
 const admin=db({moveError:{code:'email_exists',message:'A user with this email address has already been registered'}});
 await sendEmailChange({admin,user:farmer,email:'taken@example.com',password,passwordOk,now:t0,mail:async()=>{},random:()=>1});
 await assert.rejects(()=>confirmEmailChange({admin,user:farmer,code:'000001',now:t0+1000}),/belongs to another account/);
 assert.equal(admin.row().email,farmer.email);assert.equal(admin.row().new_email,'taken@example.com');
});
test('the admin, and nobody else, can put a farmer on another address at once, without an email',async()=>{
 const owner={id:'00000000-0000-4000-8000-0000000000aa',email:'floris@millstone.nl',email_confirmed_at:'2026-09-01T00:00:00Z',signInMethods:['oauth']};
 const users={[farmer.id]:farmer,'00000000-0000-4000-8000-000000000002':{id:'00000000-0000-4000-8000-000000000002',email:'g@example.com',app_metadata:{provider:'google'}}};
 const moderator={id:'00000000-0000-4000-8000-0000000000bb',email:'mod@example.com',email_confirmed_at:'2026-09-01T00:00:00Z'};
 assert.equal((await handleAdminEmail({admin:db({users}),body:{playerId:farmer.id,email:'farmer@example.com'},user:moderator})).status,403);
 assert.equal((await handleAdminEmail({admin:db({users}),body:{playerId:'00000000-0000-4000-8000-000000000002',email:'x@example.com'},user:owner})).status,400,'Google keeps its own address');
 assert.equal((await handleAdminEmail({admin:db({users}),body:{playerId:farmer.id,email:'bad'},user:owner})).status,400);
 assert.equal((await handleAdminEmail({admin:db({users,moveError:{code:'email_exists',message:'exists'}}),body:{playerId:farmer.id,email:'taken@example.com'},user:owner})).status,409);
 const admin=db({users}),r=await handleAdminEmail({admin,body:{playerId:farmer.id,email:' Farmer@Example.com '},user:owner,now:t0});
 assert.equal(r.status,200);assert.deepEqual(admin.moved,[[farmer.id,{email:'farmer@example.com',email_confirm:true}]]);
 assert.equal(admin.row().email,'farmer@example.com');assert.ok(admin.row().confirmed_at,'counts as confirmed');
});
test('the routes, the password check, the screens and the database column',()=>{
 const index=read('supabase/functions/farm-api/index.ts'),events=read('supabase/functions/farm-api/event-service.js');
 assert.match(index,/handleEvents\(\{admin,body,user,passwordOk\}\)/);assert.match(index,/'admin_player','admin_email','invite','player_log'\]/);
 assert.match(index,/await check\.auth\.signOut\(\{scope:'local'\}\)/,'the check\'s own session is ended, never the farmer\'s');
 assert.match(index,/canChange:\(user\.app_metadata\?\.provider\?\?'email'\)==='email'/);
 assert.match(events,/command==='email_change_send'\)return respond\(await sendEmailChange\(/);assert.match(events,/accountLog\('email_change','Changed the email address'\)/);
 assert.match(read('supabase/email-change.sql'),/alter table public\.email_checks add column if not exists new_email text;/);
 const ui=read('public/email-check-ui.js');assert.match(ui,/Wrong address\? Change it/);assert.match(ui,/command:'email_change_send',email:typed\.email,password:typed\.password/);
 assert.match(read('public/game.js'),/\$\('email-settings-change'\)\.onclick=\(\)=>emailCheckUI\.open\(\{change:true\}\)/);
 assert.match(read('src/admin-players.js'),/\.\.\.\('email' in p\?\[fact\('Email'/);assert.match(read('src/admin-dashboard.js'),/operation:'admin_email',playerId:id,email/);
});

// 30 Sep 2026: confirming the address is the moment to offer the daily reminder email: one tick, off until ticked, saved at once.
test('the confirm pop-up offers the reminder email as a tick next to news and offers, saved in the same setting as Settings',()=>{
 const ui=read('public/email-check-ui.js');
 assert.match(ui,/<input type="checkbox" data-email-digest \$\{digest\?'checked':''\}><span>Email me when my crops are ready\. At most one email a day\.<\/span>/);
 assert.match(ui,/\+digestBox\(\)\+newsBox\(\)\+/);
 assert.match(ui,/addEventListener\('change',event=>saveChoice\(event,'emailDigest',on=>\{digest=on;\}\)\)/);
 assert.match(ui,/await api\.save\(\{\.\.\.\(await api\.get\(\)\),\[key\]:on\}\)/,'every other choice is kept');
 assert.match(ui,/digest=Boolean\(prefs\?\.emailDigest\)/,'it shows what is saved: off until ticked');
});
