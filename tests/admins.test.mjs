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
