import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const sql=readFileSync(new URL('../supabase/security-hardening.sql',import.meta.url),'utf8');

test('tables that only the server writes keep no rights for signed-in or anonymous players',()=>{
 assert.match(sql,/revoke all on public\.admin_grants, public\.notification_job, public\.notification_state from anon, authenticated;/);
 assert.match(sql,/revoke all on public\.notification_settings, public\.push_subscriptions from anon, authenticated;\s*grant select on public\.notification_settings, public\.push_subscriptions to authenticated;/,'only reading their own, through the policy');
});

test('a push device must be a real browser push service, so the reminder job never posts anywhere else',()=>{
 assert.match(sql,/left\(p_endpoint, 8\) <> 'https:\/\/'/);
 for(const host of ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','%.notify.windows.com'])assert(sql.includes(`'${host}'`),host);
 assert.match(sql,/set search_path to ''/);assert.match(sql,/alter function public\.harvest_referral_qualify\(uuid,bigint,integer,integer\) set search_path to '';/);
});

test('the admin needs a confirmed address, not just the right one',async()=>{
 const {isSuperadmin}=await import('../supabase/functions/farm-api/admin-service.js');
 assert.equal(isSuperadmin({email:'floris@millstone.nl'}),false);
 assert.equal(isSuperadmin({email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']}),true);
 // 28 Sep 2026: the admin's powers need a Google session (two-step verification); the same account with a password is a farmer.
 assert.equal(isSuperadmin({email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['password']}),false);
 assert.equal(isSuperadmin({email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z'}),false);
});
test('the admin needs a Google session for its powers; the account itself never plays, whatever the sign-in',async()=>{
 const index=readFileSync(new URL('../supabase/functions/farm-api/index.ts',import.meta.url),'utf8');
 assert.match(index,/\.signInMethods=Array\.isArray\(claims\.amr\)\?claims\.amr\.map\(/,'the sign-in methods come from the verified token');
 assert.ok(index.indexOf('.signInMethods=')>index.indexOf('await admin.auth.getUser(token)'),'only after the token is verified');
 assert.match(index,/body\.operation==='action'&&isAdminAccount\(user\)/);
 const sql=readFileSync(new URL('../supabase/admin-google-only.sql',import.meta.url),'utf8');
 assert.match(sql,/p_player is distinct from \(select auth\.uid\(\)\) or coalesce\(\(select auth\.jwt\(\)->'amr'\) @> '\[\{"method":"oauth"\}\]'::jsonb,false\)/);
 assert.match(sql,/revoke execute on function public\.chat_staff_role\(uuid\) from public, anon, authenticated;/);
});
