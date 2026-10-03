import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleDeleteAccount,forgetOneSignal,DELETE_ADMIN,DELETE_WRONG_NAME,DELETE_PAYOUT_OPEN,DELETE_PORTAL,ONESIGNAL_APP_ID} from '../supabase/functions/farm-api/account-delete-service.js';
import {createAccountDelete,DELETE_WARNING} from '../src/account-delete.js';
import {safeToRepeat} from '../src/connection.js';
import {READY} from '../scripts/build-languages.mjs';
import {validatePaidSession,PAYMENT_PACKS} from '../game/payments.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Delete account in the game (3 Oct 2026): Settings › Privacy, on the website and in the Android and iPhone apps.
const ME='11111111-1111-4111-8111-111111111111',OTHER='22222222-2222-4222-8222-222222222222';
const farmer={id:ME,email:'sunny@example.com',email_confirmed_at:'2026-09-20T10:00:00Z'};

function fakeAdmin({username='Sunny Acres',rpcError=null}={}){
 const calls=[];
 return {calls,
  from(table){const q={select(columns){calls.push(['select',table,columns]);return q;},eq(column,value){calls.push(['eq',table,column,value]);return q;},maybeSingle:async()=>({data:username==null?null:{username},error:null})};return q;},
  rpc:async(name,args)=>{calls.push(['rpc',name,args]);return rpcError?{data:null,error:rpcError}:{data:{player_stats:username==null?0:1,auth_user:1},error:null};},
  auth:{admin:{deleteUser:async id=>{calls.push(['deleteUser',id]);return {data:{},error:null};}}}
 };
}
const named=(calls,kind)=>calls.filter(c=>c[0]===kind);

test('farm-api delete_account: the signed-in farmer only, with their own name typed exactly, all in the database (the sign-in too)',async()=>{
 const admin=fakeAdmin(),r=await handleDeleteAccount({admin,body:{operation:'delete_account',username:'  Sunny Acres ',playerId:OTHER,p_player:OTHER},user:farmer});
 assert.deepEqual(r,{status:200,data:{deleted:ME}});
 assert.deepEqual(named(admin.calls,'rpc'),[['rpc','harvest_delete_account',{p_player:ME,p_name:'Sunny Acres'}]],'never an id from the request');
 assert.equal(named(admin.calls,'deleteUser').length,0,'the sign-in goes in the same transaction (delete-account.sql), not in a second step that can fail on its own');
 assert.deepEqual(named(admin.calls,'eq'),[['eq','player_stats','player_id',ME]]);
});

test('farm-api delete_account refuses a wrong name, an admin account and a missing sign-in, and then deletes nothing',async()=>{
 for(const username of ['sunny acres','Sunny','Sunny Acres 2','',null,undefined,42,'x'.repeat(41)]){
  const admin=fakeAdmin(),r=await handleDeleteAccount({admin,body:{username},user:farmer});
  assert.deepEqual(r,{status:422,data:{error:DELETE_WRONG_NAME,code:'ACTION_REJECTED'}},String(username));
  assert.equal(named(admin.calls,'rpc').length+named(admin.calls,'deleteUser').length,0);
 }
 for(const email of ['floris@millstone.nl','HarvestTycoon@gmail.com']){
  const admin=fakeAdmin(),r=await handleDeleteAccount({admin,body:{username:'Sunny Acres'},user:{id:ME,email,email_confirmed_at:'2026-09-16T21:12:00Z'}});
  assert.deepEqual(r,{status:403,data:{error:DELETE_ADMIN,code:'ACTION_REJECTED'}});assert.equal(admin.calls.length,0,'not even a read');
 }
 assert.equal(DELETE_ADMIN,'This is an admin account and cannot be deleted here.');
 // CrazyGames: no button there, and its sign-in would quietly make a new account; refused before anything is read.
 const portal=fakeAdmin(),refused=await handleDeleteAccount({admin:portal,body:{username:'Sunny Acres'},user:{...farmer,app_metadata:{provider:'crazygames'}}});
 assert.deepEqual(refused,{status:403,data:{error:DELETE_PORTAL,code:'ACTION_REJECTED'}});assert.equal(portal.calls.length,0);
 assert.ok(JSON.parse(read('i18n/ignore.json')).includes(DELETE_PORTAL),'never shown in the game (no button on CrazyGames)');
 for(const user of [null,undefined,{}]){const admin=fakeAdmin();assert.equal((await handleDeleteAccount({admin,body:{username:'Sunny Acres'},user})).status,401);assert.equal(admin.calls.length,0);}
 // index.ts itself: no token, an anonymous user or an ended session never reaches the operation.
 const index=read('supabase/functions/farm-api/index.ts');
 const at=op=>index.indexOf(op);
 assert.ok(at("if(!token)return reply({error:'Please sign in.'},401);")<at("if(body.operation==='delete_account')"));
 assert.ok(at("if(!active.data)return reply({error:'Your session has ended. Please sign in again.'},401);")<at("if(body.operation==='delete_account')"));
});

test('farm-api delete_account: the database\'s own refusals, a sign-in without a farm, and OneSignal',async()=>{
 for(const text of [DELETE_WRONG_NAME,DELETE_ADMIN,DELETE_PAYOUT_OPEN]){
  const admin=fakeAdmin({rpcError:{message:text,code:'P0001'}}),r=await handleDeleteAccount({admin,body:{username:'Sunny Acres'},user:farmer});
  assert.deepEqual(r,{status:text===DELETE_ADMIN?403:422,data:{error:text,code:'ACTION_REJECTED'}});assert.equal(named(admin.calls,'deleteUser').length,0);
 }
 await assert.rejects(handleDeleteAccount({admin:fakeAdmin({rpcError:{message:'deadlock detected'}}),body:{username:'Sunny Acres'},user:farmer}),error=>/deadlock/.test(error.message),'anything else is a server error (index.ts: 503)');
 // A sign-in that never made a farm: no name to compare, the database deletes the sign-in alone.
 const bare=fakeAdmin({username:null});assert.equal((await handleDeleteAccount({admin:bare,body:{username:'Sunny Acres'},user:farmer})).status,200);assert.equal(named(bare.calls,'rpc').length,1);
 // OneSignal is asked every time there is a key (a 404 is fine), so nothing is left there whatever happened before; never on a refusal.
 const fetched=[];const fetchImpl=async(url,init)=>{fetched.push([url,init.method,init.headers.Authorization]);return {ok:false,status:404};};
 await handleDeleteAccount({admin:fakeAdmin(),body:{username:'Sunny Acres'},user:farmer,oneSignalKey:'k',fetchImpl});
 assert.deepEqual(fetched,[[`https://api.onesignal.com/apps/${ONESIGNAL_APP_ID}/users/by/external_id/${ME}`,'DELETE','Key k']]);
 await handleDeleteAccount({admin:fakeAdmin(),body:{username:'Sunny Acres'},user:farmer,oneSignalKey:'',fetchImpl});
 await handleDeleteAccount({admin:fakeAdmin({rpcError:{message:DELETE_WRONG_NAME}}),body:{username:'Sunny Acres'},user:farmer,oneSignalKey:'k',fetchImpl});
 assert.equal(fetched.length,1,'only with the key, and only after the deletion');
 assert.equal(await forgetOneSignal(ME,{apiKey:'k',fetchImpl}),true,'a user OneSignal never had is fine');
 assert.equal(await forgetOneSignal(ME,{apiKey:'k',fetchImpl:async()=>{throw new Error('offline');}}),false,'never in the way');
 assert.equal(ONESIGNAL_APP_ID,read('supabase/functions/notify-hourly/onesignal.js').match(/ONESIGNAL_APP_ID='([^']+)'/)[1]);
});

test('farm-api wiring: the operation is known, runs before the farm is read, and the admin lock line is untouched',()=>{
 const index=read('supabase/functions/farm-api/index.ts');
 assert.match(index,/'rename','avatar','delete_account','family',/);
 assert.match(index,/import \{handleDeleteAccount\} from '\.\/account-delete-service\.js';/);
 assert.match(index,/if\(body\.operation==='delete_account'\)\{\n\s+const removed=await handleDeleteAccount\(\{admin,body,user,oneSignalKey:Deno\.env\.get\('ONESIGNAL_REST_API_KEY'\)\?\?''\}\);return reply\(removed\.data,removed\.status\);\n\s+\}\n\s+const profileResponse=/);
 assert.ok(index.includes("  if(body.operation==='action'&&isAdminAccount(user))return reply({error:'This is your admin account, so playing is locked here. Play on your own farmer account.',code:'ACTION_REJECTED'},422);\n"));
 assert.equal(safeToRepeat({operation:'delete_account',username:'Sunny Acres'}),false,'never sent twice by itself');
});

test('supabase/delete-account.sql: one security-definer function for the service role only, every table of the audit, re-runnable',()=>{
 const sql=read('supabase/delete-account.sql');
 assert.match(sql,/create or replace function public\.harvest_delete_account\(p_player uuid, p_name text\)\nreturns jsonb language plpgsql security definer set search_path to '' as \$f\$/);
 assert.match(sql,/revoke all on function public\.harvest_delete_account\(uuid,text\) from public, anon, authenticated;\ngrant execute on function public\.harvest_delete_account\(uuid,text\) to service_role;/);
 assert.doesNotMatch(sql,/grant [^;]*harvest_delete_account[^;]*to (anon|authenticated|public)/);
 assert.match(sql,/pg_advisory_xact_lock\(hashtextextended\('delete-account:'\|\|p_player::text,0\)\)/);
 assert.match(sql,/if public\.chat_staff_role\(p_player\)='admin' then raise exception 'This is an admin account and cannot be deleted here\.'; end if;/);
 assert.match(sql,/if found and v_name is distinct from btrim\(coalesce\(p_name,''\)\) then raise exception 'Type your farmer name exactly to delete your account\.'; end if;/);
 assert.match(sql,/raise exception 'Your partner payout is still open\. Please contact support before you delete your account\.';/);
 for(const table of ['player_farms','player_stats','player_seen','player_attribution','player_logs','player_notices','popup_seen','popups','email_checks','notification_settings','notification_state','push_subscriptions','app_push_players','welcome_dm_sent','welcome_dm_config','crazygames_accounts','account_move_backup','chat_messages','chat_message_edits','chat_reads','chat_push_state','chat_reports','chat_blocks','chat_sanctions','chat_settings','families','family_members','family_invitations','family_requests','family_contributions','family_chest_players','family_rewards','family_claims','family_attempts','family_receipts','family_top_state','family_social_actions','family_social_requests','live_event_players','live_events','referrals','player_invite_codes','partners','partner_referrals','partner_payouts','harvest_purchases','harvest_offers','admin_grants','staff_roles','staff_donations','feedback_reports','family_revision'])
  assert.match(sql,new RegExp(`public\\.${table}\\b`),table);
 // Family: the lock first, the game's own leader rule, a family that ends with its last member; claims before their rewards.
 assert.match(sql,/update public\.family_revision set revision=revision\+1 where id;/);
 assert.match(sql,/order by \(m\.role='coleader'\) desc, m\.joined_at, m\.id::text limit 1;/);
 assert.match(sql,/update public\.families set deleted_at=v_now where id=v_member\.family_id and deleted_at is null;/);
 assert.ok(sql.indexOf('delete from public.family_claims')<sql.indexOf('delete from public.family_rewards'));
 assert.ok(sql.indexOf('delete from public.family_members')<sql.indexOf('delete from public.player_stats'));
 // Private chats from both sides; other farmers' messages keep their text, without the link.
 assert.match(sql,/v_dm_from:='dm:'\|\|p_player::text\|\|':%';v_dm_to:='dm:%:'\|\|p_player::text;/);
 assert.match(sql,/delete from public\.chat_messages where sender=p_player or channel like v_dm_from or channel like v_dm_to;/);
 assert.match(sql,/update public\.chat_reports set sender=null,sender_name=null,body='\(deleted\)' where sender=p_player;/);
 // Purchases are kept, without the account; test purchases go; partner payouts stay.
 assert.match(sql,/update public\.harvest_purchases set player_id=null,account_deleted_at=now\(\),status=case when status='pending' then 'expired' else status end where player_id=p_player;/);
 assert.match(sql,/delete from public\.harvest_purchases where player_id=p_player and not livemode;/);
 assert.match(sql,/alter table public\.harvest_purchases alter column player_id drop not null;/);
 assert.match(sql,/add column if not exists account_deleted_at timestamptz;/);assert.match(sql,/add column if not exists partner_id uuid references public\.partners\(user_id\) on delete set null;/);
 assert.match(sql,/update public\.partner_payouts set partner_id=null where partner_id=p_player;/);
 assert.match(sql,/foreign key \(partner_id\) references public\.partners\(user_id\) on delete set null;/);
 // partner_stats is patched from the live definition: once, and only where the expected text is.
 assert.match(sql,/pg_get_functiondef\('public\.partner_stats\(uuid\)'::regprocedure\)/);
 assert.match(sql,/if position\('h\.partner_id=p_partner' in def\)>0 then return; end if;/);
 assert.match(sql,/revoke all on function public\.partner_stats\(uuid\) from public, anon, authenticated;/);
 // The other farmers' rows stay: these are updates, never deletes.
 for(const kept of [/update public\.family_social_requests set fulfilled_by=nullif\(fulfilled_by,p_player\),helpers=array_remove\(helpers,p_player\),amounts=amounts-p_player::text/,/update public\.staff_donations set recipients=array_remove\(recipients,p_player\)/,/jsonb_set\(state,'\{invite,by\}','"A friend"'::jsonb\)/])assert.match(sql,kept);
 assert.match(sql,/delete from public\.player_stats where player_id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('player_stats',n\);\n delete from auth\.users where id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('auth_user',n\);\n return c;/,'the stats, then the sign-in itself, in the same transaction');
 assert.equal((sql.match(/delete from auth\.users/g)??[]).length,1);
 // A friend's "invited by" gets a new revision, so an older save of theirs cannot write the name back.
 assert.match(sql,/jsonb_set\(state,'\{invite,by\}','"A friend"'::jsonb\),revision=revision\+1/);
 // A checkout paid after the deletion: recorded (credited, nothing given, no commission) with a notice to refund, patched from live.
 assert.match(sql,/pg_get_functiondef\('public\.harvest_credit_purchase\(uuid,text,text,text,boolean\)'::regprocedure\)/);
 assert.match(sql,/if position\('account_deleted' in def\)>0 then return; end if;/);
 assert.match(sql,/if purchase\.player_id is null and purchase\.account_deleted_at is not null and purchase\.status in \('pending','expired'\) then\n\s+update public\.harvest_purchases set status=case when livemode then 'credited' else 'test_paid' end,stripe_payment_id=p_payment,stripe_event_id=p_event,credited_at=now\(\),partner_id=null where id=p_purchase;\n\s+return jsonb_build_object\('status',case when purchase\.livemode then 'credited' else 'test_paid' end,'duplicate',false,'account_deleted',true\);/);
 assert.match(sql,/if new\.player_id is null then body:='Paid after the account was deleted: '\|\|what\|\|' for '\|\|price/);
 assert.match(sql,/when \(\(old\.status='pending' or old\.status='expired' and new\.player_id is null and new\.account_deleted_at is not null\) and new\.status in \('credited','test_paid'\)\)\n execute function public\.harvest_purchase_alert\(\);/);
});

test('stripe-webhook: a deleted account\'s checkout paid after all is tied by the checkout and purchase id, any other stays refused',()=>{
 const pack=PAYMENT_PACKS['150'],purchase={id:'purchase',player_id:null,account_deleted_at:'2026-10-03T21:00:00Z',pack:'150',diamonds:150,amount_cents:199,price_id:pack.price,livemode:true,stripe_session_id:'cs_1'};
 const session={id:'cs_1',payment_status:'paid',status:'complete',mode:'payment',livemode:true,client_reference_id:ME,metadata:{purchase_id:'purchase',player_id:ME,app:'harvest-tycoon'},currency:'eur',amount_total:199,amount_subtotal:199,payment_intent:'pi_1'};
 const items={has_more:false,data:[{quantity:1,price:{id:pack.price}}]};
 assert.equal(validatePaidSession(session,purchase,items),'pi_1');
 assert.throws(()=>validatePaidSession({...session,metadata:{...session.metadata,player_id:OTHER}},purchase,items),/ownership/,'the two ids in the checkout still agree');
 assert.throws(()=>validatePaidSession({...session,id:'cs_2'},purchase,items),/ownership/);
 assert.throws(()=>validatePaidSession(session,{...purchase,account_deleted_at:null},items),/ownership/,'no owner and not deleted: refused as before');
 for(const dir of ['diamond-checkout','stripe-webhook'])assert.equal(read(`supabase/functions/${dir}/payments.js`),read('game/payments.js'));
});

// A tiny Settings › Privacy: the button, the line under it and the row around them.
function privacyPage(){
 const els={'delete-account':{disabled:false,onclick:null},'delete-account-message':{textContent:''},'delete-account-row':{removed:false,remove(){this.removed=true;}}};
 return {els,doc:{getElementById:id=>els[id]??null}};
}
test('the game: two steps (what disappears, then the farmer name), both red, then the bridge; a refusal shows under the button',async()=>{
 const asked=[],page=privacyPage(),sent=[];let first=true,typed=true;
 let farmer='Sunny Acres',refusal=null;
 const ui=createAccountDelete({bridge:{deleteAccount:async name=>{sent.push(name);if(refusal)throw new Error(refusal);}},name:()=>farmer,doc:page.doc,ask:async o=>{asked.push(o);return asked.length===1?first:typed;}});
 assert.equal(typeof page.els['delete-account'].onclick,'function');
 assert.equal(await ui.start(),true);assert.deepEqual(sent,['Sunny Acres']);
 assert.equal(asked[0].title,'Delete your account?');assert.equal(asked[0].description,DELETE_WARNING);assert.equal(asked[0].tone,'danger');assert.equal(asked[0].confirmLabel,'Continue');
 assert.equal(asked[1].title,'Type your farmer name');assert.equal(asked[1].description,'Type Sunny Acres exactly to delete your account for good.');assert.equal(asked[1].tone,'danger');assert.equal(asked[1].confirmLabel,'Delete my account');
 assert.equal(asked[1].typeToConfirm,'Sunny Acres','the button stays off until the name matches; no phone keyboard capitals or corrections');
 for(const part of ['farm','progress','coins','diamonds','VIP','medals','farm family','chat and private messages','invites','Purchases are not refunded','cannot be undone'])assert.ok(DELETE_WARNING.includes(part),part);
 first=false;asked.length=0;assert.equal(await ui.start(),false);assert.equal(asked.length,1,'Keep my account at step 1 asks nothing more');
 first=true;typed=false;asked.length=0;assert.equal(await ui.start(),false);assert.equal(sent.length,1,'cancelled at step 2: nothing sent');
 typed=true;asked.length=0;refusal=DELETE_WRONG_NAME;farmer='Renamed';assert.equal(await ui.start(),false);assert.equal(sent.at(-1),'Renamed');assert.equal(page.els['delete-account-message'].textContent,DELETE_WRONG_NAME);assert.equal(page.els['delete-account'].disabled,false);
 // No way to delete (CrazyGames' session): the row goes.
 const other=privacyPage();assert.equal(createAccountDelete({bridge:{},doc:other.doc}),null);assert.equal(other.els['delete-account-row'].removed,true);
});

test('the wiring: the frame on the website and in both apps only, the page around it signs out and says so',()=>{
 const cloud=read('src/game-cloud.js'),main=read('src/main.js'),session=read('src/farm-session.js');
 assert.match(cloud,/if\(!portal\)createAccountDelete\(\{bridge,name:\(\)=>document\.getElementById\('player-name'\)\?\.dataset\.username\?\?''\}\);/);
 assert.match(main,/bridge\.deleteAccount=async username=>\{\n\s+if\(ticket!==generation\|\|!navigator\.onLine\)throw new Error\('Your session is paused\. Reconnect to continue\.'\);\n\s+let data;try\{data=await farmRequest\(\{operation:'delete_account',username\},\{retry:false\}\);\}\n\s+catch\(error\)\{if\(!error\?\.transient\|\|await verifiedUser\(\)\.catch\(\(\)=>user\)\)throw error;data=\{deleted:user\.id\};\}/,'an answer lost on the way after the server deleted: the sign-in is gone, so it is a deletion');
 assert.match(main,/if\(ticket!==generation\|\|data\?\.deleted!==user\.id\)throw new Error\('Your session has ended\.'\);/);
 assert.match(main,/try\{await notifications\?\.push\?\.detach\(\);\}catch\{\}notifications\?\.dispose\?\.\(\);notifications=null;dispose\(\);\n\s+try\{await supabase\.auth\.signOut\(\{scope:'local'\}\);\}catch\{\}/,'the app lets go of its notifications; the session is only ended on this device (the server has none left)');
 assert.match(main,/store\.remove\(RETURNING_KEY\);landing\(\);setMode\('register'\);\$\('account-message'\)\.textContent='Your account has been deleted\.';/);
 assert.doesNotMatch(session,/deleteAccount/,'the CrazyGames session has no way to delete (farm-api refuses it too)');
 assert.match(read('public/confirm-dialog.js'),/<input type="text" data-type autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" autofocus>/);
 assert.match(read('public/settings.css'),/#privacy-settings \.privacy-danger\{margin-top:14px\}/);
});

test('every new text is in every ready language',()=>{
 const texts=['Delete your account?',DELETE_WARNING,'Continue','Keep my account','Type your farmer name','Type {0} exactly to delete your account for good.','Delete my account','Your account could not be deleted. Please try again.','Your account has been deleted.','Contact support',DELETE_ADMIN,DELETE_WRONG_NAME,DELETE_PAYOUT_OPEN];
 for(const code of READY)if(code!=='en'){const t=JSON.parse(read(`public/i18n/${code}.json`));for(const text of texts){assert.ok(t[text],`${code}: ${text}`);if(text.includes('{0}'))assert.ok(t[text].includes('{0}'),`${code}: ${text}`);}}
});

test('/delete-account: in the game on the website and in both apps, the support form without a sign-in, what goes, what stays and how fast',()=>{
 const page=read('public/delete-account.html');
 assert.match(page,/Open <strong>Settings<\/strong>, go to <strong>Privacy<\/strong> and tap <strong>Delete account<\/strong>\./);
 assert.match(page,/on our website, in the Harvest Tycoon app for Android on Google Play and in the Harvest Tycoon app for iPhone on the App Store\./);
 assert.match(page,/Your account is deleted <strong>at once<\/strong>/);
 assert.match(page,/<h2 id="no-sign-in">Can’t sign in any more\?<\/h2>/);assert.match(page,/<a href="\/support">support form<\/a> <strong>from the email address linked to your account<\/strong>/);
 assert.match(page,/generally <strong>seven years<\/strong>\. In our records they are no longer linked to your account, your email address or your player name; Stripe keeps its own payment records under its own privacy policy\. Purchases are not refunded/);
 assert.match(page,/If you are a partner: your partner account, and partner earnings that have not been paid out yet\. Request a payout first/);
 for(const part of ['farm and all your progress','VIP, medals','Your place in your farm family','your private messages (from both sides of the conversation)','Your invites'])assert.ok(page.includes(part),part);
 assert.doesNotMatch(page,/subject=Delete|Email a deletion request/,'no more emailed requests');
 const policy=read('public/privacy.html');
 assert.match(policy,/<h3 id="iphone-app">The iPhone app<\/h3>/);
 assert.match(policy,/<strong>No Tag Manager, no cookies, no ad tracking:<\/strong> the app loads no Google Tag Manager, Google Analytics, Meta Pixel or TikTok Pixel, sets no cookies for statistics or ads and shows no cookie banner\./);
 assert.match(policy,/delivered by <strong>OneSignal<\/strong> on our behalf, through Apple Push Notification service/);
 assert.match(policy,/in the game under <strong>Settings<\/strong>, <strong>Privacy<\/strong>, <strong>Delete account<\/strong>, on the website, in the Android app and in the iPhone app\./);
 assert.match(policy,/<strong>When you delete your account<\/strong> in the game: we delete your personal data or make it anonymous at once/);
 assert.match(policy,/<h2 id="contact">15\. Contact<\/h2>\n <p>Questions about this policy or your data\? Use our <a href="\/support">support form<\/a>/);
 assert.match(read('public/wiki-content.js'),/<strong>Settings<\/strong>, <strong>Privacy<\/strong>, <strong>Delete account<\/strong>/);
});
