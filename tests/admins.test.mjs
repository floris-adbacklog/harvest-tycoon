import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isAdminAccount,isSuperadmin,isAdminAddress} from '../supabase/functions/farm-api/admin-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Two admins since 3 Oct 2026, the owner and his brother, with the same rules everywhere: farm-api, the game and the database list the
// same two addresses; powers only in a Google session; playing locked on the account itself.
const ADMINS=['floris@millstone.nl','harvesttycoon@gmail.com'];
test('both admin addresses have the same powers, only with Google',()=>{
 for(const email of ADMINS){
  assert.ok(isAdminAddress(email.toUpperCase()));
  const user={email,email_confirmed_at:'2026-10-03T00:00:00Z'};
  assert.ok(isAdminAccount(user),email);
  assert.ok(isSuperadmin({...user,signInMethods:['oauth']}),email);
  assert.ok(!isSuperadmin({...user,signInMethods:['password']}),`${email} with a password is an ordinary farmer`);
  assert.ok(!isAdminAccount({email}),`${email} unconfirmed is no admin`);
 }
 assert.ok(!isAdminAddress('someone@gmail.com'));
});
test('the game and the database list the same admin addresses',()=>{
 assert.match(read('src/player-profiles.js'),/ADMIN_EMAILS=Object\.freeze\(\['floris@millstone\.nl','harvesttycoon@gmail\.com'\]\)/);
 assert.match(read('supabase/admins.sql'),/lower\(u\.email\) in \('floris@millstone\.nl','harvesttycoon@gmail\.com'\)/);
});
test('the welcome message can come from either admin; for now from Gerard, whose texts say "I\'m Gerard"',()=>{
 const client=read('src/chat-client.js'),dash=read('src/admin-dashboard.js'),sql=read('supabase/gerard.sql');
 assert.match(client,/welcomeSave:\(\{enabled,body,delay,sender\}\)=>rpc\('welcome_dm_save',sender\?\{p_enabled:enabled,p_body:body,p_delay:delay,p_sender:sender\}/);
 assert.match(dash,/id="admin-welcome-from" hidden>From<select id="admin-welcome-sender">/);assert.match(dash,/from\.hidden=list\.length<2;/);
 assert.match(sql,/function public\.welcome_dm_save\(p_enabled boolean, p_body text, p_delay integer, p_sender uuid\)/);
 assert.match(sql,/if who<>me and public\.chat_staff_role\(who\) is distinct from 'admin' then raise exception 'Choose one of the admins\.'/);
 assert.match(sql,/I'm Gerard, the community manager of Harvest Tycoon\./);assert.match(sql,/update public\.player_stats set avatar_id='gerard'/);
});
