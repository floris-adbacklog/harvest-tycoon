import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APP_PUSH,appPushLoginLink} from '../public/android.js';
import {createAppPush} from '../src/app-push.js';
import {createOneSignal,sendReminders} from '../supabase/functions/notify-hourly/onesignal.js';
import {runJob} from '../supabase/functions/notify-hourly/job.js';
import {CROP_NAMES,BUILDING_NAMES} from '../supabase/functions/notify-hourly/names.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async(n=30)=>{for(let i=0;i<n;i++)await Promise.resolve();};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// App push reaches everyone who turned it on (13 Oct 2026): on 13 Oct OneSignal named 96 of the 180 farmers with app push on as not
// reachable (errors.invalid_aliases), most of them on Android 13 and newer. The fix is mostly in the apps (android-app AppPush.java
// 1.3: the link and the phone's subscription sent to OneSignal again after the yes and at every start; fresh=1 sends the link afresh).
// Here: notify-hourly counts and marks who OneSignal cannot reach, the game asks the app to repair a marked farmer's phone, and a Turn
// on that saved sends the link once more.

function oneSignal(answer){
 const calls=[];
 const fetchImpl=async(url,init)=>{const request=JSON.parse(init.body);calls.push(request);const {status,body}=answer(request);return {ok:status>=200&&status<300,status,json:async()=>body};};
 return {calls,fetchImpl};
}
const ID='0c3f5e8a-1111-4222-8333-444455556666';

test('OneSignal\'s "not reachable": the farmers it names are collected, also when it names every farmer of a call; failures name nobody',async()=>{
 const send=async(answer,ids=['p1','p2','p3'])=>{const unreachable=new Set(),logs=[];const reached=await createOneSignal({apiKey:'k',fetchImpl:oneSignal(answer).fetchImpl,log:m=>logs.push(m)}).send({ids,title:'t',body:'b',url:'/',key:'k',unreachable});return {reached:[...reached].sort(),unreachable:[...unreachable].sort(),logs};};
 // Some of them: the others are reached.
 let r=await send(()=>({status:200,body:{id:ID,errors:{invalid_aliases:{external_id:['p2']}}}}));
 assert.deepEqual([r.reached,r.unreachable],[['p1','p3'],['p2']]);assert.match(r.logs[0],/1 of 3 not reachable/);
 // All of them: OneSignal sends nothing and gives no id (as in the 13 Oct logs, "reached nobody of 1: {invalid_aliases...}").
 r=await send(()=>({status:200,body:{id:'',errors:{invalid_aliases:{external_id:['p1','p2','p3']}}}}));
 assert.deepEqual([r.reached,r.unreachable],[[],['p1','p2','p3']]);
 // An id the call did not hold is no farmer of ours.
 r=await send(()=>({status:200,body:{id:ID,errors:{invalid_aliases:{external_id:['p2','someone-else']}}}}));assert.deepEqual(r.unreachable,['p2']);
 // A refusal, "not subscribed" as plain words, no network: reached nobody, and nobody is marked (nothing is known about them).
 for(const answer of [()=>({status:429,body:{errors:{invalid_aliases:{external_id:['p1']}}}}),()=>({status:200,body:{id:'',errors:['All included players are not subscribed']}})]){
  r=await send(answer);assert.deepEqual([r.reached,r.unreachable],[[],[]]);
 }
 const down=new Set();await createOneSignal({apiKey:'k',fetchImpl:async()=>{throw new Error('down');}}).send({ids:['p1'],title:'t',body:'b',url:'/',key:'k',unreachable:down});assert.equal(down.size,0);
 // Without a set it works as before.
 assert.deepEqual([...await createOneSignal({apiKey:'k',fetchImpl:oneSignal(()=>({status:200,body:{id:ID,errors:{invalid_aliases:{external_id:['p2']}}}})).fetchImpl}).send({ids:['p1','p2'],title:'t',body:'b',url:'/',key:'k'})],['p1']);
 // The hourly reminders hand the set to every call.
 const unreachable=new Set(),both=oneSignal(request=>({status:200,body:{id:ID,errors:{invalid_aliases:{external_id:request.include_aliases.external_id.filter(id=>id.endsWith('x'))}}}}));
 const push={title:'Harvest Tycoon',body:'Your crops are ready to harvest',url:'/?source=push',tag:'harvest-tycoon',channel:'ready'};
 const reached=await sendReminders(createOneSignal({apiKey:'k',fetchImpl:both.fetchImpl}),[{player:'ax',push},{player:'b',push},{player:'cx',push:{...push,body:'Your daily gift is waiting',channel:'daily'}}],Date.parse('2026-10-13T07:05:00Z'),unreachable);
 assert.equal(both.calls.length,2);assert.deepEqual([...reached],['b']);assert.deepEqual([...unreachable].sort(),['ax','cx']);
});

// The job, as in tests/app-push-server.test.mjs.
const names={crops:CROP_NAMES,buildings:BUILDING_NAMES},MORNING=Date.parse('2026-09-21T07:05:00Z'),HOUR=3600000;
const player=(over={})=>({player_id:'p1',email:'a@b.nl',username:'Tony',push_crops:true,push_production:true,push_daily:false,email_digest:false,digest_hour:9,timezone:'Europe/Amsterdam',
 last_active_at:new Date(MORNING-3*HOUR).toISOString(),crops_seen_at:MORNING-2*HOUR,production_seen_at:MORNING-2*HOUR,last_push_at:null,push_day:null,push_count:0,daily_morning_on:null,daily_evening_on:null,digest_on:null,
 subscriptions:[],farm:{plots:[{id:0,crop:'wheat',readyAt:MORNING-10*60000}],buildings:{},login:{lastDay:'2026-09-21',streak:5}},...over});
function jobDeps(rows,{appPlayers=[],missing=[],appFails=false,markFails=false,mark=true}={}){
 const log={saved:[],marks:[],lines:[]};
 const db={beginRun:async()=>({run:true,emails_sent:0}),candidates:async()=>rows,saveState:async(id,patch)=>log.saved.push([id,patch]),removeSubscription:async()=>{},markSuccess:async()=>{},markFailure:async()=>{},addEmails:async()=>{},appPushPlayers:async()=>new Set(appPlayers)};
 if(mark)db.markAppPushReach=async reach=>{if(markFails)throw new Error('column "unreachable_at" does not exist');log.marks.push(reach);};
 return {log,deps:{names,db,sendPush:async()=>({ok:true,status:201}),log:m=>log.lines.push(m),
  sendAppPush:async(items,now,unreachable)=>{if(appFails)throw new Error('OneSignal down');const ids=items.map(i=>i.player);for(const id of ids)if(missing.includes(id))unreachable.add(id);return new Set(ids.filter(id=>!missing.includes(id)));}}};
}
test('notify-hourly: one line per run with how many app farmers were reached and how many are not reachable, and who is marked or unmarked',async()=>{
 const rows=[player(),player({player_id:'p2'}),player({player_id:'p3'}),player({player_id:'p4',push_crops:false,push_production:false})];
 const {log,deps}=jobDeps(rows,{appPlayers:['p1','p2','p3','p4'],missing:['p2','p3']});const stats=await runJob(deps,MORNING);
 assert.deepEqual([stats.appPushes,stats.appPushUnreachable,stats.errors],[1,2,0]);
 assert.deepEqual(log.lines,['app push this hour: 3 farmers, 1 reached, 2 not reachable'],'p4 has nothing due this hour');
 assert.deepEqual(log.marks,[{reached:['p1'],unreachable:['p2','p3']}]);
 // A farmer not reached keeps the reminder for next hour, as before.
 assert.equal(log.saved.find(([id])=>id==='p1')[1].push_count,1);assert.ok(!log.saved.some(([id,patch])=>id!=='p1'&&patch.push_count));
 // OneSignal down: nothing is known, so nobody is marked as not reachable (and nobody unmarked).
 const down=jobDeps(rows,{appPlayers:['p1','p2'],appFails:true});const run=await runJob(down.deps,MORNING);
 assert.equal(run.appPushUnreachable,0);assert.deepEqual(down.log.marks,[{reached:[],unreachable:[]}]);
 // The column is not there yet (supabase/app-push-reach.sql not run): logged, the run goes on.
 const early=jobDeps(rows,{appPlayers:['p1','p2'],missing:['p2'],markFails:true});const before=await runJob(early.deps,MORNING);
 assert.deepEqual([before.appPushes,before.appPushUnreachable,before.errors],[1,1,0]);assert.ok(early.log.lines.some(m=>/^app push reach: column "unreachable_at" does not exist/.test(m)));
 // No farmer with the app due this hour: no line, nothing marked.
 const none=jobDeps(rows,{appPlayers:[]});const quiet=await runJob(none.deps,MORNING);assert.deepEqual([quiet.appPushUnreachable,none.log.lines,none.log.marks],[0,[],[]]);
 // A database without the function (older tests, fakes) is fine too.
 const bare=jobDeps(rows,{appPlayers:['p1'],mark:false});assert.equal((await runJob(bare.deps,MORNING)).appPushes,1);
});
test('notify-hourly marks in the table itself: the time OneSignal first named a farmer, cleared once it takes them; in chunks; only the hourly run',()=>{
 const index=read('supabase/functions/notify-hourly/index.ts');
 const mark=index.slice(index.indexOf(' async markAppPushReach('),index.indexOf(' // Of these farmers, the ones with the app\'s notifications on.'));
 assert.match(mark,/admin\.from\('app_push_players'\)\.update\(\{unreachable_at:at\}\)\.in\('player_id',unreachable\.slice\(i,i\+150\)\)\.is\('unreachable_at',null\)/,'the first time is kept');
 assert.match(mark,/admin\.from\('app_push_players'\)\.update\(\{unreachable_at:null\}\)\.in\('player_id',reached\.slice\(i,i\+150\)\)\.not\('unreachable_at','is',null\)/,'only marked rows are written');
 assert.doesNotMatch(mark,/updated_at|enabled/,'on or off, and when the farmer changed it, stay the farmer\'s');
 assert.equal((mark.match(/console\.error\(`app push reach: \$\{error\.message\}`\);return;/g)??[]).length,2,'an error is logged and stops marking, nothing throws');
 assert.equal((index.match(/markAppPushReach/g)??[]).length,1,'called from the job only (db.markAppPushReach), not from a message\'s push');
 const sql=read('supabase/app-push-reach.sql');
 assert.match(sql,/^alter table public\.app_push_players add column if not exists unreachable_at timestamptz;$/m);
 assert.doesNotMatch(sql,/create table|grant |policy|create or replace function|subscription_id/i,'no new table, rights or functions; still no phone\'s push id');
 assert.match(sql,/harvest_delete_account \(delete-account\.sql\) already removes the row/);
 assert.match(read('supabase/delete-account.sql'),/delete from public\.app_push_players where player_id=p_player;/);
});

// The game's half, on the page around the game in the app (src/app-push.js), with a phone and a database as tests/app-push.test.mjs.
function appTop(app){
 const visits=[],win={document:{documentElement:{getAttribute:name=>name==='data-app'?'android':null,hasAttribute:()=>false}}};
 win.location={get href(){return 'https://www.harvesttycoon.com/?src=android-app';},set href(link){visits.push(String(link));app?.(String(link),win);}};
 win.parent=win;return {win,visits};
}
const SUB='4f1e2d3c-aaaa-4bbb-8ccc-0123456789ab';
const phone=(state={permission:'granted',optedIn:true,subscriptionId:SUB,externalId:'',version:'1.3.0'})=>(link,win)=>{if(link.startsWith(APP_PUSH.login))state.externalId='p1';queueMicrotask(()=>win.harvestAppPush({...state}));};
function database(row,{fail=false}={}){
 const calls=[];
 return {calls,from(table){calls.push(['from',table]);const query={select:columns=>{calls.push(['select',columns]);return query;},eq:()=>query,limit:async()=>fail?{data:null,error:new Error('offline')}:{data:row?[row]:[],error:null}};return query;},
  async rpc(name,params){calls.push([name,params]);return {error:null};}};
}
test('the game: a phone that allows them, of a farmer OneSignal could not reach, is linked afresh (fresh=1) once per page load',async()=>{
 assert.equal(appPushLoginLink('p1',{fresh:true}),'onesignallogin://login?id=p1&fresh=1');assert.equal(appPushLoginLink('p1'),'onesignallogin://login?id=p1');
 // As the apps read it (Uri.getQueryParameter, URLComponents): the id is still the id, and an older app sees nothing else.
 const query=new URLSearchParams(appPushLoginLink('a b&c',{fresh:true}).split('?')[1]);assert.deepEqual([query.get('id'),query.get('fresh')],['a b&c','1']);
 const marked={player_id:'p1',enabled:true,unreachable_at:'2026-10-13T16:05:52Z'};
 const run=async({row=marked,state,fail=false}={})=>{const top=appTop(phone(state)),db=database(row,{fail});const push=createAppPush({supabase:db,playerId:'p1',win:top.win,statusWaitMs:30,gapMs:0});await push.sync();await settle();await push.sync();await settle();push.dispose();return {visits:top.visits,calls:db.calls};};
 let r=await run();
 assert.deepEqual(r.visits,['onesignallogin://login?id=p1','onesignallogin://login?id=p1&fresh=1'],'the link, then once afresh; the second sync of the page does nothing');
 assert.deepEqual(r.calls,[['from','app_push_players'],['select','*']],'its own row (row-level security), every column so a database without the mark reads none');
 // Reached at the last reminder, no mark (or the column not there yet), turned off, or the read failed: only the link.
 for(const row of [{...marked,unreachable_at:null},{player_id:'p1',enabled:true},{...marked,enabled:false},null]){r=await run({row});assert.deepEqual(r.visits,['onesignallogin://login?id=p1'],JSON.stringify(row));}
 r=await run({fail:true});assert.deepEqual(r.visits,['onesignallogin://login?id=p1']);
 // A phone that does not allow them, or is not opted in: nothing to repair on this phone, and the row is not even read.
 for(const state of [{permission:'default',optedIn:false,subscriptionId:'',externalId:'',version:'1.3.0'},{permission:'granted',optedIn:false,subscriptionId:'',externalId:'',version:'1.2.0'},{permission:'denied',optedIn:false,subscriptionId:SUB,externalId:'',version:'1.3.0'}]){
  r=await run({state});assert.deepEqual([r.visits,r.calls],[['onesignallogin://login?id=p1'],[]],JSON.stringify(state));
 }
 // An app that never answers (an old one, or none): the link only, after the short wait.
 const silent=appTop(),db=database(marked),push=createAppPush({supabase:db,playerId:'p1',win:silent.win,statusWaitMs:20,gapMs:0});
 await push.sync();assert.deepEqual([silent.visits,db.calls],[['onesignallogin://login?id=p1'],[]]);push.dispose();
});
test('the game: a Turn on that saved sends the link once more, also when the phone\'s yes came after the wait; a no sends nothing',async()=>{
 // The yes after the wait (the subscription came late): saved by itself, then the link.
 const late={permission:'default',optedIn:false,subscriptionId:'',externalId:'',version:'1.3.0'},top=appTop(link=>{if(link===APP_PUSH.register)return;}),saved=[];
 const db={from(){const q={select:()=>q,eq:()=>q,limit:async()=>({data:[],error:null})};return q;},async rpc(name,params){saved.push([name,params]);return {error:null};}};
 const push=createAppPush({supabase:db,playerId:'p1',win:top.win,waitMs:30,statusWaitMs:20,gapMs:0,timezone:()=>'UTC'});
 top.win.harvestAppPush(late);assert.deepEqual(await push.enable(),{kind:'off'});assert.deepEqual(top.visits,[APP_PUSH.register]);
 top.win.harvestAppPush({...late,permission:'granted',optedIn:true,subscriptionId:SUB});await settle();await pause(5);
 assert.deepEqual(saved.map(([name,p])=>[name,p.p_enabled]),[['app_push_save',true]]);assert.deepEqual(top.visits,[APP_PUSH.register,'onesignallogin://login?id=p1']);
 push.dispose();
 // A no: nothing saved, no link.
 const no=appTop((link,win)=>{if(link===APP_PUSH.register)queueMicrotask(()=>win.harvestAppPush({permission:'default'}));}),noDb=database(null);
 const refused=createAppPush({supabase:noDb,playerId:'p1',win:no.win,waitMs:200,statusWaitMs:20,gapMs:0});
 assert.deepEqual(await refused.enable(),{kind:'blocked'});await settle();assert.deepEqual(no.visits,[APP_PUSH.register]);refused.dispose();
 // Without a farmer (no player id) there is no link to send.
 const anon=appTop(phone()),anonPush=createAppPush({supabase:database(null),win:anon.win,waitMs:200,statusWaitMs:20,gapMs:0});
 anon.win.harvestAppPush({permission:'granted',optedIn:true,subscriptionId:SUB});await anonPush.enable();await settle();assert.deepEqual(anon.visits,[APP_PUSH.register]);anonPush.dispose();
});
test('the game: a link to the farmer still on its way is dropped after Sign out or when the next farmer plays, never sent after the logout',async()=>{
 // A Turn on whose save comes back after Sign out: the logout stays the last word.
 let finish;const slow={from(){const q={select:()=>q,eq:()=>q,limit:async()=>({data:[],error:null})};return q;},rpc:()=>new Promise(resolve=>{finish=()=>resolve({error:null});})};
 const top=appTop(),push=createAppPush({supabase:slow,playerId:'p1',win:top.win,waitMs:50,statusWaitMs:20,gapMs:0,timezone:()=>'UTC'});
 top.win.harvestAppPush({permission:'granted',optedIn:true,subscriptionId:SUB,externalId:'p1',version:'1.3.0'});
 const turnOn=push.enable();await settle();assert.ok(finish,'saving');
 await push.detach();push.dispose();finish();await turnOn;await settle();await pause(5);
 assert.deepEqual(top.visits,[APP_PUSH.register,APP_PUSH.logout]);
 // fresh=1 for a marked farmer whose row comes back once the next farmer signed in (the page links p2 now): not sent.
 let rows;const marked={player_id:'p1',enabled:true,unreachable_at:'2026-10-13T16:05:52Z'};
 const db={from(){const q={select:()=>q,eq:()=>q,limit:()=>new Promise(resolve=>{rows=()=>resolve({data:[marked],error:null});})};return q;}};
 const next=appTop(phone()),old=createAppPush({supabase:db,playerId:'p1',win:next.win,statusWaitMs:20,gapMs:0});
 const syncing=old.sync();for(let i=0;i<50&&!rows;i++)await pause(1);assert.ok(rows,'reading the mark');
 old.dispose();next.win.harvestAppPushLinked='p2';rows();await syncing;await settle();
 assert.deepEqual(next.visits,['onesignallogin://login?id=p1']);
 // The same farmer's farm opened again (the page still links p1): what was on its way still goes.
 let again;const same=appTop(phone()),db2={from(){const q={select:()=>q,eq:()=>q,limit:()=>new Promise(resolve=>{again=()=>resolve({data:[marked],error:null});})};return q;}};
 const first=createAppPush({supabase:db2,playerId:'p1',win:same.win,statusWaitMs:20,gapMs:0});
 const s2=first.sync();for(let i=0;i<50&&!again;i++)await pause(1);first.dispose();again();await s2;await settle();
 assert.deepEqual(same.visits,['onesignallogin://login?id=p1','onesignallogin://login?id=p1&fresh=1']);
});
