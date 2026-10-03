import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {parse} from '../scripts/vendor/acorn.mjs';
import {ONESIGNAL_APP_ID,ONESIGNAL_URL,ONESIGNAL_BATCH,APP_PUSH_TTL,appLink,collapseId,idempotencyKey,notificationRequest,createOneSignal,sendReminders} from '../supabase/functions/notify-hourly/onesignal.js';
import {runJob} from '../supabase/functions/notify-hourly/job.js';
import {planPlayer} from '../supabase/functions/notify-hourly/rules.js';
import {CROP_NAMES,BUILDING_NAMES} from '../supabase/functions/notify-hourly/names.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const names={crops:CROP_NAMES,buildings:BUILDING_NAMES};
const UUID5=/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Push in our Android app (Oct 2026), the server half: notify-hourly sends the same reminders and messages through OneSignal's REST
// API to the farmers who turned them on in the app (supabase/app-push.sql), addressed by player id (external_id).
// fetch as OneSignal answers it; calls: every request made.
function oneSignal(answer=request=>({status:200,body:{id:'0c3f5e8a-1111-4222-8333-444455556666',errors:[]}})){
 const calls=[];
 const fetchImpl=async(url,init)=>{const request=JSON.parse(init.body);calls.push({url,init,request});const {status,body}=answer(request);return {ok:status>=200&&status<300,status,json:async()=>body};};
 return {calls,fetchImpl};
}

test('one OneSignal request: the app, push only, the farmers by player id, the words in the farmer\'s language, where a tap goes',async()=>{
 assert.equal(ONESIGNAL_APP_ID,'1d8ca7c0-fca0-48a9-b55e-e87b85802fad');assert.equal(ONESIGNAL_URL,'https://api.onesignal.com/notifications?c=push');
 const key=await idempotencyKey('reminder|2026-09-21T07|x');
 assert.deepEqual(notificationRequest({ids:['p1','p2'],title:'Harvest Tycoon',body:'Je gewassen zijn klaar om te oogsten',url:'/?source=push',tag:'harvest-tycoon',key}),{
  app_id:'1d8ca7c0-fca0-48a9-b55e-e87b85802fad',target_channel:'push',include_aliases:{external_id:['p1','p2']},
  headings:{en:'Harvest Tycoon'},contents:{en:'Je gewassen zijn klaar om te oogsten'},data:{url:'https://www.harvesttycoon.com/?source=push'},
  idempotency_key:key,ttl:APP_PUSH_TTL,collapse_id:'harvest-tycoon'});
 assert.equal(APP_PUSH_TTL,3600,'an hour, as the browser\'s push');
 assert.ok(!('url' in notificationRequest({ids:['p1'],title:'t',body:'b',url:'/',key})),'no url field: that would open a browser');
 // Where a tap goes: only harvesttycoon.com, as a full address; anything else is the home page.
 assert.equal(appLink('/?source=push&open=today'),'https://www.harvesttycoon.com/?source=push&open=today');
 assert.equal(appLink('/?open=chat&channel=dm%3Aa%3Ab'),'https://www.harvesttycoon.com/?open=chat&channel=dm%3Aa%3Ab');
 assert.equal(appLink('/?source=push','https://harvesttycoon.com'),'https://harvesttycoon.com/?source=push');
 for(const [path,base] of [['https://evil.example/x',undefined],['//evil.example/x',undefined],['javascript:alert(1)',undefined],['http://www.harvesttycoon.com/',undefined],['/x','https://preview.vercel.app']])
  assert.equal(appLink(path,base),base?'https://www.harvesttycoon.com/x':'https://www.harvesttycoon.com/',path);
 // A private chat's tag is longer than OneSignal's collapse_id may be: shortened, the same every time.
 const tag=`chat-dm:${'a'.repeat(36)}:${'b'.repeat(36)}`;assert.ok(collapseId(tag).length<=64);assert.equal(collapseId(tag),collapseId(tag));assert.notEqual(collapseId(tag),collapseId(tag.replace(/b$/,'c')));
});
test('idempotency keys: a UUID (version 5) from the notification and its farmers, the same for the same call, another for another',async()=>{
 const a=await idempotencyKey('reminder|2026-09-21T07|Harvest Tycoon|Your crops are ready to harvest|/?source=push|p1,p2');
 assert.match(a,UUID5);assert.equal(a,await idempotencyKey('reminder|2026-09-21T07|Harvest Tycoon|Your crops are ready to harvest|/?source=push|p1,p2'));
 assert.notEqual(a,await idempotencyKey('reminder|2026-09-21T08|Harvest Tycoon|Your crops are ready to harvest|/?source=push|p1,p2'),'next hour');
 assert.notEqual(a,await idempotencyKey('reminder|2026-09-21T07|Harvest Tycoon|Your crops are ready to harvest|/?source=push|p1,p3'),'other farmers');
});
test('sending: calls of at most 2,000 farmers, each with its own key, the secret as "Key"; the farmers OneSignal took come back',async()=>{
 const {calls,fetchImpl}=oneSignal(),logs=[];
 const client=createOneSignal({apiKey:'test-rest-key',fetchImpl,log:m=>logs.push(m)});assert.equal(client.enabled,true);assert.equal(ONESIGNAL_BATCH,2000);
 const ids=Array.from({length:4500},(_,i)=>`player-${String(i).padStart(5,'0')}`);
 const reached=await client.send({ids:[...ids,ids[0],'',null],title:'Harvest Tycoon',body:'Your crops are ready to harvest',url:'/?source=push',tag:'harvest-tycoon',key:'reminder|2026-09-21T07'});
 assert.deepEqual(calls.map(c=>c.request.include_aliases.external_id.length),[2000,2000,500],'each farmer once');
 for(const {url,init,request} of calls){
  assert.equal(url,'https://api.onesignal.com/notifications?c=push');assert.equal(init.method,'POST');
  assert.equal(init.headers.Authorization,'Key test-rest-key');assert.equal(init.headers['Content-Type'],'application/json');
  assert.equal(request.app_id,ONESIGNAL_APP_ID);assert.equal(request.target_channel,'push');assert.match(request.idempotency_key,UUID5);
 }
 assert.equal(new Set(calls.map(c=>c.request.idempotency_key)).size,3);assert.equal(reached.size,4500);
 // The same call again (a retry) has the same keys, so OneSignal sends it once.
 const again=oneSignal();await createOneSignal({apiKey:'k',fetchImpl:again.fetchImpl}).send({ids,title:'Harvest Tycoon',body:'Your crops are ready to harvest',url:'/?source=push',tag:'harvest-tycoon',key:'reminder|2026-09-21T07'});
 assert.deepEqual(again.calls.map(c=>c.request.idempotency_key),calls.map(c=>c.request.idempotency_key));
 assert.ok(!logs.join(' ').includes('test-rest-key'));
});
test('OneSignal\'s answers: a farmer it cannot reach, nobody reached, a refusal or no network count as not delivered, and nothing throws',async()=>{
 const logs=[],log=m=>logs.push(m);
 const some=oneSignal(()=>({status:200,body:{id:'0c3f5e8a-1111-4222-8333-444455556666',errors:{invalid_aliases:{external_id:['p2']}}}}));
 assert.deepEqual([...await createOneSignal({apiKey:'secret-key',fetchImpl:some.fetchImpl,log}).send({ids:['p1','p2','p3'],title:'t',body:'b',url:'/',key:'k'})],['p1','p3']);
 const nobody=oneSignal(()=>({status:200,body:{id:'',errors:['All included players are not subscribed']}}));
 assert.equal((await createOneSignal({apiKey:'secret-key',fetchImpl:nobody.fetchImpl,log}).send({ids:['p1'],title:'t',body:'b',url:'/',key:'k'})).size,0);
 for(const status of [400,401,429,500]){const refused=oneSignal(()=>({status,body:{errors:['API rate limit exceeded']}}));assert.equal((await createOneSignal({apiKey:'secret-key',fetchImpl:refused.fetchImpl,log}).send({ids:['p1'],title:'t',body:'b',url:'/',key:'k'})).size,0,String(status));}
 assert.equal((await createOneSignal({apiKey:'secret-key',fetchImpl:async()=>{throw new Error('network down');},log}).send({ids:['p1'],title:'t',body:'b',url:'/',key:'k'})).size,0);
 assert.equal((await createOneSignal({apiKey:'secret-key',fetchImpl:async()=>({ok:true,status:200,json:async()=>{throw new Error('not json');}}),log}).send({ids:['p1'],title:'t',body:'b',url:'/',key:'k'})).size,0);
 assert.ok(logs.some(m=>/refused: 429/.test(m))&&logs.some(m=>/network down/.test(m)));assert.ok(!logs.join(' ').includes('secret-key'),'the key is never logged');
});
test('no secret yet (ONESIGNAL_REST_API_KEY not set): nothing is sent, nothing fails',async()=>{
 const {calls,fetchImpl}=oneSignal();
 for(const apiKey of ['',undefined,null]){const client=createOneSignal({apiKey,fetchImpl});assert.equal(client.enabled,false);assert.equal((await client.send({ids:['p1'],title:'t',body:'b',url:'/',key:'k'})).size,0);assert.equal((await sendReminders(client,[{player:'p1',push:{title:'t',body:'b',url:'/'}}])).size,0);}
 assert.equal(calls.length,0);assert.equal(createOneSignal({apiKey:'k',fetchImpl:null}).enabled,false);
});
test('the hourly reminders: one call per text and link (each language its own), the hour in the key',async()=>{
 const {calls,fetchImpl}=oneSignal(),client=createOneSignal({apiKey:'k',fetchImpl}),now=Date.parse('2026-09-21T07:05:00Z');
 const nl={title:'Harvest Tycoon',body:'Je gewassen zijn klaar om te oogsten',tag:'harvest-tycoon',url:'/?source=push'},en={...nl,body:'Your crops are ready to harvest'},gift={...en,body:'Your daily gift is waiting',url:'/?source=push&open=today'};
 const reached=await sendReminders(client,[{player:'a',push:nl},{player:'b',push:en},{player:'c',push:nl},{player:'d',push:gift}],now);
 assert.deepEqual([...reached].sort(),['a','b','c','d']);
 assert.deepEqual(calls.map(c=>[c.request.contents.en,c.request.include_aliases.external_id,c.request.data.url]),[
  ['Je gewassen zijn klaar om te oogsten',['a','c'],'https://www.harvesttycoon.com/?source=push'],['Your crops are ready to harvest',['b'],'https://www.harvesttycoon.com/?source=push'],
  ['Your daily gift is waiting',['d'],'https://www.harvesttycoon.com/?source=push&open=today']]);
 // The same farmers and words in another hour: other keys (and the same hour: the same keys).
 const later=oneSignal();await sendReminders(createOneSignal({apiKey:'k',fetchImpl:later.fetchImpl}),[{player:'a',push:nl},{player:'c',push:nl}],now+3600000);
 assert.notEqual(later.calls[0].request.idempotency_key,calls[0].request.idempotency_key);
 const same=oneSignal();await sendReminders(createOneSignal({apiKey:'k',fetchImpl:same.fetchImpl}),[{player:'c',push:nl},{player:'a',push:nl}],now+60000);
 assert.equal(same.calls[0].request.idempotency_key,calls[0].request.idempotency_key);
 // The words come from planPlayer in the farmer's own language, as the browser's push.
 const at=Date.parse('2026-09-21T07:05:00Z'),row={player_id:'p',push_crops:true,push_production:true,push_daily:false,timezone:'Europe/Amsterdam',language:'nl',last_active_at:new Date(at-3*3600000).toISOString(),crops_seen_at:at-7200000,production_seen_at:at-7200000,app_push:true,subscriptions:[],farm:{plots:[{id:0,crop:'wheat',readyAt:at-600000}],buildings:{},login:{lastDay:'2026-09-21',streak:1}}};
 assert.equal(planPlayer(row,at,names).push.body,'Je gewassen zijn klaar om te oogsten');
});

// The job (job.js) with app push: as tests/reminder-rules.test.mjs, plus the farmers with the app's notifications on.
const MORNING=Date.parse('2026-09-21T07:05:00Z'),HOUR=3600000;
const player=(over={})=>({player_id:'p1',email:'a@b.nl',username:'Tony',push_crops:true,push_production:true,push_daily:false,email_digest:false,digest_hour:9,timezone:'Europe/Amsterdam',
 last_active_at:new Date(MORNING-3*HOUR).toISOString(),crops_seen_at:MORNING-2*HOUR,production_seen_at:MORNING-2*HOUR,last_push_at:null,push_day:null,push_count:0,daily_morning_on:null,daily_evening_on:null,digest_on:null,
 subscriptions:[],farm:{plots:[{id:0,crop:'wheat',readyAt:MORNING-10*60000}],buildings:{},login:{lastDay:'2026-09-21',streak:5}},...over});
function jobDeps(rows,{appPlayers=[],reach=ids=>ids,web=async()=>({ok:true,status:201}),appFails=false,playersFail=false}={}){
 const log={saved:[],web:[],app:[]};
 return {log,deps:{names,
  db:{beginRun:async()=>({run:true,emails_sent:0}),candidates:async()=>rows,saveState:async(id,patch)=>log.saved.push([id,patch]),removeSubscription:async()=>{},markSuccess:async()=>{},markFailure:async()=>{},addEmails:async()=>{},
   appPushPlayers:async()=>{if(playersFail)throw new Error('no table');return new Set(appPlayers);}},
  sendPush:async(sub,payload)=>{log.web.push([sub.endpoint,JSON.parse(payload).body]);return web(sub);},
  sendAppPush:async(items,now)=>{log.app.push({items,now});if(appFails)throw new Error('OneSignal down');return new Set(reach(items.map(i=>i.player)));},log:()=>{}}};
}
const device={endpoint:'https://push.example/1',p256dh:'k',auth:'a'};
test('job: a farmer with only the app gets the reminder there, and it counts as the one reminder of this hour',async()=>{
 const {log,deps}=jobDeps([player()],{appPlayers:['p1']});const stats=await runJob(deps,MORNING);
 assert.deepEqual([stats.pushes,stats.appPushes,stats.errors],[1,1,0]);assert.deepEqual(log.web,[]);
 assert.deepEqual(log.app[0].items,[{player:'p1',push:{title:'Harvest Tycoon',body:'Your crops are ready to harvest',tag:'harvest-tycoon',url:'/?source=push'}}]);assert.equal(log.app[0].now,MORNING);
 assert.equal(log.saved.length,1);assert.equal(log.saved[0][1].push_count,1);assert.equal(log.saved[0][1].crops_seen_at,MORNING);
 // Without the app (and without a browser) there is nothing to send it to: the markers follow the clock, as before.
 const none=jobDeps([player()]);await runJob(none.deps,MORNING);assert.equal(none.log.app.length,0);assert.equal(none.log.saved[0][1].push_count,undefined);
});
test('job: a farmer with a browser and the app gets the same reminder on both, counted once; the hour, day and quiet-hour limits hold for the farmer',async()=>{
 const {log,deps}=jobDeps([player({subscriptions:[device]})],{appPlayers:['p1']});const stats=await runJob(deps,MORNING);
 assert.deepEqual([stats.pushes,stats.appPushes],[1,1]);assert.deepEqual(log.web,[['https://push.example/1','Your crops are ready to harvest']]);assert.equal(log.app[0].items[0].push.body,'Your crops are ready to harvest');
 assert.equal(log.saved.length,1);assert.equal(log.saved[0][1].push_count,1,'one reminder, not two');
 // Sent 20 minutes ago (to either): nothing to anyone. Fourteen today: nothing. 23:05 local: no crops reminder.
 for(const over of [{last_push_at:new Date(MORNING-20*60000).toISOString()},{push_day:'2026-09-21',push_count:14}]){
  const held=jobDeps([player({subscriptions:[device],...over})],{appPlayers:['p1']});await runJob(held.deps,MORNING);assert.deepEqual([held.log.web,held.log.app],[[],[]],JSON.stringify(over));
 }
 const night=Date.parse('2026-09-21T21:05:00Z'),late=jobDeps([player({last_active_at:new Date(night-3*HOUR).toISOString(),crops_seen_at:night-2*HOUR,farm:{plots:[{id:0,crop:'wheat',readyAt:night-600000}],buildings:{},login:{lastDay:'2026-09-21',streak:5}}})],{appPlayers:['p1']});
 await runJob(late.deps,night);assert.deepEqual(late.log.app,[]);
 // A switch that is off is off in the app too.
 const off=jobDeps([player({push_crops:false,push_production:false})],{appPlayers:['p1']});await runJob(off.deps,MORNING);assert.deepEqual(off.log.app,[]);
});
test('job: an app reminder that did not arrive is tried again next hour; the browser\'s copy still counts; OneSignal down never stops the run',async()=>{
 const missed=jobDeps([player()],{appPlayers:['p1'],reach:()=>[]});const stats=await runJob(missed.deps,MORNING);
 assert.deepEqual([stats.pushes,stats.appPushes],[0,0]);assert.ok(!missed.log.saved.some(([,patch])=>patch.push_count),'markers unchanged, so it is tried again');
 const browser=jobDeps([player({subscriptions:[device]})],{appPlayers:['p1'],reach:()=>[]});assert.equal((await runJob(browser.deps,MORNING)).pushes,1);assert.equal(browser.log.saved[0][1].push_count,1);
 const down=jobDeps([player({subscriptions:[device]}),player({player_id:'p2'})],{appPlayers:['p1','p2'],appFails:true});const run=await runJob(down.deps,MORNING);
 assert.deepEqual([run.pushes,run.appPushes,run.errors],[1,0,0]);assert.equal(down.log.saved.find(([id])=>id==='p1')[1].push_count,1);
 // The app's list cannot be read (supabase/app-push.sql not run yet): the browsers get theirs as before.
 const noTable=jobDeps([player({subscriptions:[device]})],{playersFail:true});const before=await runJob(noTable.deps,MORNING);
 assert.deepEqual([before.pushes,before.appPushes],[1,0]);assert.deepEqual(noTable.log.app,[]);
 // Many farmers share one call per text: the job hands them over together.
 const many=jobDeps([player(),player({player_id:'p2'}),player({player_id:'p3',push_crops:false,push_production:false})],{appPlayers:['p1','p2','p3']});await runJob(many.deps,MORNING);
 assert.equal(many.log.app.length,1);assert.deepEqual(many.log.app[0].items.map(i=>i.player).sort(),['p1','p2']);
});

test('notify-hourly: the secret by name from the environment, never in the code; the config says appPush; messages and purchase notices reach the app too',()=>{
 const index=read('supabase/functions/notify-hourly/index.ts');
 assert.match(index,/createOneSignal\(\{apiKey:Deno\.env\.get\('ONESIGNAL_REST_API_KEY'\)\?\?''/);
 const configLine=index.split('\n').find(l=>l.includes("query.has('config')"));
 assert.match(configLine,/appPush:appPushOn/);assert.doesNotMatch(configLine,/ONESIGNAL|apiKey|VAPID_PRIVATE|RESEND_KEY|SERVICE_ROLE/);
 assert.match(index,/if\(query\.has\('dm'\)\)\{\n  if\(!pushOn&&!appPushOn\)return json\(\{sent:0\}\);/);
 assert.match(index,/appPush\.send\(\{\.\.\.push,ids:await db\.appPushOf\(await db\.messageTargets\(id\)\),key:`message\|\$\{id\}`\}\)/,'a private message or the Crew: whoever the claim went to');
 assert.match(index,/admin\.from\('chat_push_state'\)\.select\('player_id'\)\.eq\('message_id',message\)\.eq\('claimed',true\)/);
 assert.match(index,/appPush\.send\(\{\.\.\.push,ids:await db\.appPushOf\(await db\.noticeOwner\(String\(claim\.id\)\)\),key:`notice\|\$\{claim\.id\}`\}\)/,'a purchase notice: the admin');
 assert.match(index,/if\(!pushOn&&!emailOn&&!appPushOn\)return json\(\{ran:false,reason:'not configured'\},503\);/);
 assert.match(index,/sendAppPush:appPushOn\?\(items:[^)]*\)=>sendReminders\(appPush,items,now\):null/);
 assert.match(index,/admin\.from\('app_push_devices'\)\.select\('subscription_id,player_id'\)\.eq\('enabled',true\)/);
 assert.doesNotMatch(index,/console\.(log|error)\([^)]*apiKey/);
 // The same function, still valid code once its types are gone (it runs on Deno; this is the syntax check here).
 assert.doesNotThrow(()=>parse(stripTypeScriptTypes(index),{ecmaVersion:'latest',sourceType:'module'}));
 // The secret is only named: no OneSignal key anywhere in the repository's code.
 for(const file of ['supabase/functions/notify-hourly/index.ts','supabase/functions/notify-hourly/onesignal.js','src/app-push.js','public/android.js','supabase/app-push.sql'])
  assert.doesNotMatch(read(file),/os_v2_app_|Key [A-Za-z0-9]{20,}|['"][A-Za-z0-9_-]{40,}['"]/,file);
});

test('supabase/app-push.sql: own rows readable, writes only through the two checked functions, re-runnable, the triggers patched from their live definitions',()=>{
 const sql=read('supabase/app-push.sql');
 assert.match(sql,/create table if not exists public\.app_push_devices \(\n subscription_id text primary key check \(subscription_id ~ '\^\[A-Za-z0-9\._:-\]\{8,128\}\$'\),\n player_id uuid not null references auth\.users\(id\) on delete cascade,\n enabled boolean not null default true,\n platform text not null default 'android'/);
 assert.match(sql,/alter table public\.app_push_devices enable row level security;/);
 assert.match(sql,/revoke all on public\.app_push_devices from anon, authenticated;\ngrant select on public\.app_push_devices to authenticated;/);
 assert.match(sql,/drop policy if exists "players read their own app push devices" on public\.app_push_devices;\ncreate policy "players read their own app push devices" on public\.app_push_devices for select to authenticated using \(player_id = \(select auth\.uid\(\)\)\);/);
 assert.equal((sql.match(/create policy/g)??[]).length,1);assert.doesNotMatch(sql,/for (insert|update|delete|all)/i,'no client write policies');
 const fns=sql.split(/create or replace function public\./).slice(1);assert.deepEqual(fns.map(f=>f.slice(0,f.indexOf('('))),['app_push_save','app_push_forget']);
 for(const body of fns){assert.match(body,/security definer set search_path = ''/);assert.match(body,/v_player uuid := \(select auth\.uid\(\)\)/);assert.match(body,/is_anonymous/);}
 for(const fn of ['app_push_save(text, boolean)','app_push_forget(text)']){
  const name=fn.replace(/[()]/g,m=>`\\${m}`);
  assert.match(sql,new RegExp(`revoke all on function public\\.${name} from public, anon;`));assert.match(sql,new RegExp(`grant execute on function public\\.${name} to authenticated;`));
 }
 assert.match(sql,/p_subscription_id !~ '\^\[A-Za-z0-9\._:-\]\{8,128\}\$' then raise exception 'This device cannot receive notifications\.'/,'the id is checked');
 assert.match(sql,/on conflict \(subscription_id\) do update set player_id = excluded\.player_id, enabled = true, updated_at = now\(\);/,'a phone follows the farmer who turns it on');
 assert.match(sql,/limit 5\);/);assert.match(sql,/insert into public\.notification_settings \(player_id\) values \(v_player\) on conflict \(player_id\) do nothing;/);
 assert.match(sql,/update public\.app_push_devices set enabled = false, updated_at = now\(\) where player_id = v_player and enabled;/,'off is the farmer\'s, on every phone');
 assert.match(sql,/delete from public\.app_push_devices where subscription_id = p_subscription_id and player_id = v_player;/,'only the farmer\'s own phone is forgotten');
 // The three triggers that ask notify-hourly for a push, patched line by line from their live definitions, once.
 assert.match(sql,/create or replace function pg_temp\.app_push_patch\(p_fn regprocedure, p_marker text, p_from text, p_to text\)/);
 const patched=[...sql.matchAll(/select pg_temp\.app_push_patch\('([^']+)','app_push_devices',\n \$a\$([\s\S]*?)\$a\$,\n \$b\$([\s\S]*?)\$b\$\);/g)].map(m=>[m[1],m[2],m[3]]);
 assert.deepEqual(patched.map(p=>p[0]),['public.chat_dm_push()','public.chat_crew_push()','public.harvest_purchase_alert()']);
 const live={'public.chat_dm_push()':read('supabase/chat-broadcast-dm.sql'),'public.chat_crew_push()':read('supabase/chat-crew-push.sql'),'public.harvest_purchase_alert()':read('supabase/special-offer.sql')};
 for(const [fn,from,to] of patched){assert.ok(live[fn].includes(from),`${fn}: the line is in its latest definition in the repo`);assert.match(to,/public\.app_push_devices( a where a\.player_id=(other|admin_id) and a\.enabled| where enabled)/);assert.ok(to.includes(from.slice(0,40)),'the browser\'s devices still count');}
 assert.match(read('supabase/season-pass.sql'),/if exists\(select 1 from public\.push_subscriptions p where p\.player_id=admin_id\) then/);
 for(const part of ['create table if not exists','create index if not exists','drop policy if exists'])assert.ok(sql.includes(part),part);
});
test('the privacy policy: push in the app through OneSignal (player id, push token, device type), off in Settings or Android, OneSignal among who helps us',()=>{
 const policy=read('public/privacy.html');
 assert.doesNotMatch(policy,/cannot show push notifications/);
 const app=policy.slice(policy.indexOf('<h3 id="android-app">'),policy.indexOf('<h2 id="service-providers">'));
 assert.match(app,/the app can show push notifications if you allow them \(Settings, Reminders\)\. They are sent through <strong>OneSignal<\/strong>, which processes them on our behalf and receives your player ID, a push token for your phone and your device type/);
 assert.match(app,/You can switch them off in Settings, or for the app in your phone's Android settings\./);
 const helpers=policy.slice(policy.indexOf('<h2 id="service-providers">'),policy.indexOf('<h2 id="transfers">'));
 assert.match(helpers,/<li><strong>OneSignal<\/strong>: delivery of push notifications in the Android app, if you allow them\. OneSignal receives your player ID, a push token for your phone and your device type\.<\/li>/);
 assert.match(policy,/including Vercel, Stripe, Resend, OneSignal, Google, Meta and TikTok/);assert.match(policy,/<strong>Push ID in the Android app<\/strong>: until you sign out in the app/);
});
