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
test('the admin powers need Google itself: an admin account that also signs in with Discord or Apple has none (10 Oct 2026)',()=>{
 // The session says only "oauth"; Supabase links a Discord or Apple sign-in with the same verified address to the account.
 for(const email of ADMINS){
  const user={email,email_confirmed_at:'2026-10-03T00:00:00Z',signInMethods:['oauth']};
  assert.ok(isSuperadmin({...user,identities:[{provider:'google'},{provider:'email'}],app_metadata:{provider:'email',providers:['email','google']}}),`${email}: Google and email, as both are on 10 Oct`);
  for(const other of ['discord','apple','facebook']){
   assert.ok(!isSuperadmin({...user,identities:[{provider:'google'},{provider:other}]}),`${email} with ${other} linked`);
   assert.ok(!isSuperadmin({...user,app_metadata:{providers:['google',other]}}),`${email} with ${other} in providers`);
  }
 }
 // The chat's staff powers: the same rule in the database, patched from the live definition, and only the admin's own session.
 const sql=read('supabase/admin-google-identity.sql');
 assert.match(sql,/681aff59b24e63e597d7390b4693f0bd/);
 assert.match(sql,/and not exists\(select 1 from auth\.identities i where i\.user_id=p_player and i\.provider not in \('google','email'\)\)/);
 assert.match(sql,/if position\('auth\.identities' in def\)>0 then return; end if;/);
 assert.match(sql,/revoke execute on function public\.chat_staff_role\(uuid\) from public, anon, authenticated;/);
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
test('Chat and house rules names both admins: Gerard, community manager, and Tony, developer; a tap opens their profile in the game',async()=>{
 const {wikiArticle}=await import('../public/wiki-content.js');
 const game=wikiArticle('chat',{level:20,href:id=>`#wiki-${id}`,portal:false,app:false}).html,site=wikiArticle('chat',{portal:false,app:false}).html;
 assert.match(game,/There are two admins, Gerard and Tony\./);
 assert.match(game,/data-player-profile="c1194a46-dfdf-47f7-abd2-c59279681702" translate="no">Gerard<\/a>, community manager/);
 assert.match(game,/data-player-profile="e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8" translate="no">Tony<\/a>, developer/);
 assert.doesNotMatch(site,/data-player-profile/,'on the website nobody is signed in: plain names');assert.match(site,/<span translate="no">Gerard<\/span>, community manager/);
 assert.match(read('public/wiki-ui.js'),/closest\('\[data-player-profile\]'\);if\(profile\)\{event\.preventDefault\(\);window\.harvestProfiles\?\.open\?\.\(/);
});
