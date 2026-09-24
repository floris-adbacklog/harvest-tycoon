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
 assert.equal(isSuperadmin({email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z'}),true);
});
