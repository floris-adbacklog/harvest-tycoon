import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadLog,noteLog,NOTE_MAX,LOG_CATEGORIES} from '../supabase/functions/farm-api/player-log.js';
import {platformOf,recordSeen,PLATFORMS} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {createFarm,applyFarmAction as act,recordFirstLook} from '../game/farm-state.js';
import {createFarmClient,NOTE_WAIT_MS} from '../public/farm-client.js';
import {createReminderNudge} from '../public/reminder-nudge.js';
import {reminderSource} from '../public/app-links.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12);
const P1='11111111-1111-4111-8111-111111111111';
const tick=()=>new Promise(r=>setTimeout(r,0));

// ---- 13 Oct 2026, the measurement package (plan-wachten/E-verbeteringen.md, item 5): the player sees nothing ----

// (a) A reminder that opened the game: notify-hourly's push (?source=push, a browser or either app) and the daily email (?source=email).
test('opened from a reminder: the open line says which, also after less than 30 minutes; still the action open',()=>{
 const text=rows=>rows.map(r=>[r.category,r.action,r.text]);
 assert.deepEqual(text(loadLog({away:5*3600000+60000,from:'push'})),[['account','open','Opened the game from a push reminder after 5 hours']]);
 assert.deepEqual(text(loadLog({away:2*86400000,from:'email'})),[['account','open','Opened the game from the daily email after 2 days']]);
 assert.deepEqual(text(loadLog({away:12*60000,from:'push'})),[['account','open','Opened the game from a push reminder after 12 minutes']],'a tap within 30 minutes still counts');
 assert.deepEqual(text(loadLog({away:20000,from:'email'})),[['account','open','Opened the game from the daily email']],'no "after 0 minutes"');
 assert.equal(loadLog({away:89000,from:'push'})[0].text,'Opened the game from a push reminder after 1 minute','one minute, not "1 minutes"');
 assert.equal(loadLog({away:3599000,from:'email'})[0].text,'Opened the game from the daily email after 59 minutes','whole minutes, never "60 minutes"');
 assert.equal(loadLog({away:45.8*60000})[0].text,'Opened the game after 45 minutes');
 assert.deepEqual(text(loadLog({away:5*3600000+60000,from:'pwa'})),[['account','open','Opened the game after 5 hours']],'anything else is an ordinary open');
 assert.deepEqual(loadLog({away:10*60000,from:'chat'}),[],'and under 30 minutes no line, as before');
 for(const rows of [loadLog({away:1,from:'push'}),loadLog({away:1e9,from:'email'})])assert.ok(rows.every(r=>!r.text.includes(' · ')&&r.text.length<=240));
});
test('reminderSource: only push and email, from any address the game opens on',()=>{
 assert.equal(reminderSource('https://www.harvesttycoon.com/?source=push&open=today'),'push');
 assert.equal(reminderSource('/?source=push','https://www.harvesttycoon.com'),'push','sw.js hands over a full address, a relative one works with its base');
 assert.equal(reminderSource('https://www.harvesttycoon.com/?source=email'),'email');
 for(const href of ['https://www.harvesttycoon.com/?source=pwa','https://www.harvesttycoon.com/?src=android-app','https://www.harvesttycoon.com/?open=chat&channel=global','/?source=push','not a url',undefined])
  assert.equal(reminderSource(href),null,String(href));
});
test('the site says it once, with the next farm load; a reload or Back is no new open; farm-api passes it to the log',()=>{
 const main=read('src/main.js'),supabase=read('src/supabase.js'),api=read('supabase/functions/farm-api/index.ts');
 assert.match(main,/openedBy\(\(\(\)=>\{try\{if\(document\.wasDiscarded\)return null;const entry=performance\.getEntriesByType\?\.\('navigation'\)\?\.\[0\];if\(entry&&entry\.type!=='navigate'\)return null;\}catch\{\}return reminderSource\(location\.href,location\.origin\);\}\)\(\)\);/,'nor a tab the phone put to sleep and loads again');
 assert.match(main,/addEventListener\?\.\('message',event=>\{if\(event\.data\?\.type!=='open'\)return;openedBy\(reminderSource\(String\(event\.data\.url\),location\.origin\)\);/,'a push tapped while the game is open counts for the next load');
 assert.match(supabase,/export function openedBy\(source\)\{if\(source==='push'\|\|source==='email'\)openedFrom=source;\}/);
 assert.match(supabase,/const takeOpened=\(\)=>\{const source=openedFrom;openedFrom=null;return source\?\{opened:source\}:\{\};\};/,'taken once');
 assert.match(supabase,/platform:pagePlatform\(\),\.\.\.takeOpened\(\),\.\.\.takeStall\(\)\}:body;/,'by a load only');
 assert.match(api,/from:body\.opened\}\);/);
 // Both apps open the push's own address (notify-hourly onesignal.js data.url): the parameter is all they need.
 assert.match(read('supabase/functions/notify-hourly/rules.js'),/url:giftParts===parts\.length&&!chestPush\?'\/\?source=push&open=today':'\/\?source=push'/);
 assert.match(read('supabase/functions/notify-hourly/mail.js'),/href="\$\{appUrl\}\/\?source=email"/);
 assert.match(read('supabase/functions/notify-hourly/onesignal.js'),/data:\{url:appLink\(url,base\)\}/);
});

// (b) The reminder question: shown, and what the farmer did with it, in the farmer's log.
test('noteLog: the reminder question\'s steps become account lines; anything unknown is left out, at most 5 a request',()=>{
 const note=(step,channel='push',level=5)=>({kind:'reminder',step,channel,level});
 const rows=noteLog([note('shown'),note('on'),note('later','email',10),note('blocked'),note('failed','email',20)]);
 assert.deepEqual(rows.map(r=>[r.category,r.action,r.text]),[
  ['account','reminder_shown','Was asked to turn on push reminders at level 5'],
  ['account','reminder_on','Turned on push reminders from the question'],
  ['account','reminder_later','Said “Not now” to the daily email'],
  ['account','reminder_blocked','Push reminders could not be turned on: notifications are blocked on this device'],
  ['account','reminder_failed','The daily email could not be turned on']]);
 assert.deepEqual(noteLog([note('shown','email',10),note('on','email'),note('later'),note('failed')]).map(r=>r.text),['Was asked to turn on the daily email at level 10','Turned on the daily email from the question','Said “Not now” to push reminders','Push reminders could not be turned on']);
 for(const bad of [note('blocked','email'),note('constructor'),note('__proto__'),note('toString','push'),note('shown','sms'),note('shown','push',0),note('shown','push',2.5),note('shown','push','5'),{...note('shown'),kind:'other'},null,'shown',42])
  assert.deepEqual(noteLog([bad]),[],JSON.stringify(bad));
 assert.deepEqual(noteLog('nope'),[]);assert.deepEqual(noteLog({0:note('shown')}),[]);
 assert.equal(noteLog(Array.from({length:9},()=>note('shown'))).length,NOTE_MAX);assert.equal(NOTE_MAX,5);
 assert.ok(noteLog([note('shown',undefined,9999)]).length===1&&noteLog([note('shown','push',10000)]).length===0);
 assert.ok(rows.every(r=>LOG_CATEGORIES.includes(r.category)&&r.action.length<=40&&!r.text.includes(' · ')));
});
test('farm-api logs them beside the game\'s next action or refresh, whatever that request does; never for an admin account',()=>{
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/import \{handlePlayerLog,writeLog,snapshot,farmLog,familyLog,loadLog,accountLog,adminGrantLog,noteLog\} from '\.\/player-log\.js';/);
 assert.match(api,/if\(\(body\.operation==='load'\|\|body\.operation==='action'\)&&Array\.isArray\(body\.notes\)&&!isAdminAccount\(user\)\)\{const noted=noteLog\(body\.notes\);if\(noted\.length\)later\(writeLog\(admin,user\.id,noted\)\);\}/);
 assert.ok(api.indexOf('noteLog(body.notes)')<api.indexOf("const profileResponse=await admin.from('player_stats')"),'before the farm is read, so a refused action still logs them');
 assert.ok(api.indexOf('noteLog(body.notes)')>api.indexOf("if(body.operation==='avatar')"),'after the operations that are not the farm\'s');
});

function nudgeHarness({enable='on',kind='off',push=true,email=false,saveFails=false,level=5}={}){
 const steps=[],storage={},buttons={later:{onclick:null},on:{onclick:null}};let card=null;
 globalThis.localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}};
 globalThis.document={createElement(){card={setAttribute(){},set innerHTML(v){this.html=v;},querySelector:sel=>sel==='[data-nudge-later]'?buttons.later:buttons.on,remove(){card=null;}};return card;},body:{append(){}},querySelector:()=>card};
 const api={ready:Promise.resolve(),available:true,config:{push,email},push:push?{async status(){return {kind};},async enable(){return {kind:enable};}}:null,async get(){return {emailDigest:false};},async save(){if(saveFails)throw new Error('offline');}};
 globalThis.window={parent:{harvestBridge:{notifications:api}}};
 const nudge=createReminderNudge({state:{plots:[],buildings:{}},level:()=>level,notify(){},log:s=>steps.push(s),settleMs:0});nudge.harvested();
 return {nudge,steps,buttons,cleanup(){delete globalThis.localStorage;delete globalThis.document;delete globalThis.window;}};
}
test('the reminder question notes each step: shown, Not now, Turn on, blocked by the browser or the phone, failed; push and email',async()=>{
 const step=(name,channel='push',level=5)=>({kind:'reminder',step:name,channel,level});
 let h=nudgeHarness();await h.nudge.check();h.buttons.later.onclick();assert.deepEqual(h.steps,[step('shown'),step('later')]);h.cleanup();
 h=nudgeHarness({level:10});await h.nudge.check();await h.buttons.on.onclick();assert.deepEqual(h.steps,[step('shown','push',10),step('on','push',10)]);h.cleanup();
 h=nudgeHarness({enable:'blocked'});await h.nudge.check();await h.buttons.on.onclick();assert.deepEqual(h.steps.at(-1),step('blocked'));h.cleanup();
 h=nudgeHarness({enable:'off'});await h.nudge.check();await h.buttons.on.onclick();assert.deepEqual(h.steps.at(-1),step('failed'));h.cleanup();
 h=nudgeHarness({push:false,email:true});await h.nudge.check();await h.buttons.on.onclick();assert.deepEqual(h.steps,[step('shown','email'),step('on','email')]);h.cleanup();
 h=nudgeHarness({push:false,email:true,saveFails:true});await h.nudge.check();await h.buttons.on.onclick();assert.deepEqual(h.steps.at(-1),step('failed','email'));h.cleanup();
 // Every step the question can note is a line farm-api knows.
 for(const s of [step('shown'),step('later'),step('on'),step('blocked'),step('failed'),step('shown','email'),step('later','email'),step('on','email'),step('failed','email')])assert.equal(noteLog([s]).length,1,JSON.stringify(s));
 // A broken log never breaks the question.
 globalThis.localStorage={getItem:()=>null,setItem(){}};globalThis.document={createElement:()=>({setAttribute(){},querySelector:()=>({}),remove(){}}),body:{append(){}},querySelector:()=>null};
 globalThis.window={parent:{harvestBridge:{notifications:{ready:Promise.resolve(),available:true,config:{push:true},push:{async status(){return {kind:'off'};}}}}}};
 const sturdy=createReminderNudge({state:{},level:()=>5,notify(){},log(){throw new Error('x');},settleMs:0});sturdy.harvested();await assert.doesNotReject(()=>sturdy.check());
 delete globalThis.localStorage;delete globalThis.document;delete globalThis.window;
 assert.match(read('public/game.js'),/const nudge=createReminderNudge\(\{state,level:\(\)=>levelProgress\(state\)\.level,notify:message=>toast\(message\),track,log:client\.note,/);
});

function clientSetup(answer){
 const sent=[],timers=[],realSet=globalThis.setTimeout,realClear=globalThis.clearTimeout;
 globalThis.setTimeout=(fn,ms)=>{if(ms===NOTE_WAIT_MS){const t={fn,ms};timers.push(t);return t;}return realSet(fn,ms);};
 globalThis.clearTimeout=t=>{const i=timers.indexOf(t);if(i>=0)timers.splice(i,1);else realClear(t);};
 globalThis.document={body:{classList:{add(){},remove(){}}},documentElement:{hasAttribute:()=>false}};
 const server=createFarm(now);
 globalThis.window={parent:{harvestBridge:{serverNow:now,async request(body){sent.push(body);if(answer)return answer(body,server);const result=body.operation==='action'?act(server,body.action,now):undefined;return {state:structuredClone(server),result,serverNow:now};}}}};
 const state=structuredClone(server),client=createFarmClient(state,{onChange(){},onStatus(){}});
 return {client,sent,timers,cleanup(){globalThis.setTimeout=realSet;globalThis.clearTimeout=realClear;delete globalThis.document;delete globalThis.window;}};
}
test('the game keeps the steps and the next request takes them: an action or a refresh, never a request of their own unless 15 s pass',async()=>{
 const note=step=>({kind:'reminder',step,channel:'push',level:5});
 let c=clientSetup();await c.client.load();
 c.client.note(note('shown'));c.client.note(note('later'));assert.equal(c.sent.length,0,'nothing sent by itself at once');assert.equal(c.timers.length,1);
 await c.client.runAction({type:'field',id:0,action:'harvest'});await tick();
 assert.equal(c.sent.length,1);assert.equal(c.sent[0].operation,'action');assert.deepEqual(c.sent[0].notes,[note('shown'),note('later')],'along with the harvest');
 assert.equal(c.timers.length,0,'the wait is over');
 await c.client.runAction({type:'field',id:1,action:'harvest'});await tick();assert.equal(c.sent[1].notes,undefined,'once');
 c.client.note(note('on'));await c.client.refresh();assert.deepEqual(c.sent.at(-1),{operation:'load',notes:[note('on')]},'or with a refresh');c.cleanup();
 // Nobody plays on: after NOTE_WAIT_MS a refresh takes them.
 c=clientSetup();await c.client.load();c.client.note(note('shown'));assert.equal(c.timers.length,1);c.timers.shift().fn();await tick();await tick();
 assert.deepEqual(c.sent,[{operation:'load',notes:[note('shown')]}]);c.cleanup();
 // At most 5 wait; the admin view keeps none.
 c=clientSetup();await c.client.load();for(let i=1;i<=7;i++)c.client.note({...note('shown'),level:i});await c.client.refresh();
 assert.deepEqual(c.sent[0].notes.map(n=>n.level),[3,4,5,6,7]);c.cleanup();
 c=clientSetup();await c.client.load();globalThis.document.documentElement.hasAttribute=name=>name==='data-admin-view';c.client.note(note('shown'));assert.equal(c.timers.length,0);c.cleanup();
 // A first look carries them too (it is an action), and the look still goes once.
 c=clientSetup();await c.client.load();c.client.note(note('shown'));c.client.look({readyAt:Date.now()});c.client.sendLook();await tick();await tick();
 assert.equal(c.sent[0].action.type,'first_look');assert.deepEqual(c.sent[0].notes,[note('shown')]);c.cleanup();
});

// (c) Platform and PWA per account, outside the farm's saved state: player_seen.platform (supabase/player-platform.sql).
const ANDROID_APP='Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36 HarvestTycoonApp/1.0 PlayBilling/1';
const GALAXY_APP='Mozilla/5.0 (Linux; Android 14; SM-S921B; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0 Mobile Safari/537.36 HarvestTycoonApp/1.0 WebBilling/1';
const IPHONE_APP='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0 AppStoreBilling/1';
const PHONE='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Mobile Safari/537.36';
test('platformOf: our apps by their user agent, a portal by its page or account, else what the page says; nothing made up',()=>{
 assert.equal(platformOf({hint:'app',agent:ANDROID_APP}),'android_app');assert.equal(platformOf({agent:GALAXY_APP}),'galaxy_app');assert.equal(platformOf({hint:'browser',agent:IPHONE_APP}),'ios_app','the app is the app, whatever the page says');
 assert.equal(platformOf({hint:'app',agent:PHONE}),'android_app','?app=android in a browser (the app\'s fallback)');
 for(const portal of ['crazygames','kongregate','discord']){assert.equal(platformOf({hint:portal,agent:PHONE}),portal);assert.equal(platformOf({agent:PHONE,portal}),portal,'an account from a page before this');}
 assert.equal(platformOf({hint:'discord',agent:PHONE,portal:null}),'discord','a website account played in the Discord Activity');
 assert.equal(platformOf({hint:'pwa',agent:PHONE}),'pwa');assert.equal(platformOf({hint:'frame',agent:PHONE}),'frame');assert.equal(platformOf({hint:'browser',agent:PHONE}),'web');
 for(const hint of [undefined,null,'','toString','constructor','ios_app','web','<b>'])assert.equal(platformOf({hint,agent:PHONE}),null,String(hint));
 assert.equal(platformOf(),null);
 const sql=read('supabase/player-platform.sql'),allowed=/check \(platform in \(([^)]*)\)\)/.exec(sql)[1].split(',').map(v=>v.trim().replace(/'/g,''));
 assert.deepEqual(allowed,[...PLATFORMS],'the database takes exactly what farm-api writes');
 for(const hint of ['app','pwa','frame','browser','crazygames','kongregate','discord'])assert.ok(PLATFORMS.includes(platformOf({hint,agent:PHONE})),hint);
 for(const agent of [ANDROID_APP,GALAXY_APP,IPHONE_APP])assert.ok(PLATFORMS.includes(platformOf({agent})));
});
function database(){const calls=[];return {calls,from(table){const call={table};calls.push(call);const q={upsert(row){call.upsert=row;return q;},then(resolve){return Promise.resolve({error:null}).then(resolve);}};return q;}};}
test('recordSeen keeps the platform with the rest of the visit; a page that cannot tell keeps what was saved',async()=>{
 const seen=async(headers,more)=>{const db=database();await recordSeen({admin:db,player:P1,headers:new Headers(headers),timeZone:'Europe/Amsterdam',language:'nl',now,...more});return db.calls[0].upsert;};
 assert.deepEqual(await seen({'user-agent':PHONE},{platform:'pwa'}),{player_id:P1,country:'NL',device:PHONE,language:'nl',platform:'pwa',seen_at:new Date(now).toISOString()});
 assert.equal((await seen({'user-agent':PHONE},{platform:'browser'})).platform,'web');
 const old=await seen({'user-agent':PHONE},{});assert.ok(!('platform' in old),'a page from before this keeps the platform saved');
 assert.equal((await seen({'user-agent':ANDROID_APP},{})).platform,'android_app','an app is known even from an old page');
 assert.equal((await seen({'user-agent':PHONE},{portal:'crazygames'})).platform,'crazygames');
 assert.equal((await seen({'user-agent':PHONE},{platform:'nonsense'})).platform,undefined);
 // A farm-api out before supabase/player-platform.sql: the column is not there yet, and the rest of the visit is still saved.
 for(const code of ['PGRST204','42703']){
  const rows=[],db={from(){return {upsert(row){rows.push(row);return Promise.resolve({error:'platform' in row?{code}:null});}};}};
  await recordSeen({admin:db,player:P1,headers:new Headers({'user-agent':PHONE}),timeZone:'Europe/Amsterdam',language:'nl',platform:'pwa',now});
  assert.deepEqual(rows.map(r=>r.platform),['pwa',undefined],code);assert.deepEqual(rows[1],{player_id:P1,country:'NL',device:PHONE,language:'nl',seen_at:new Date(now).toISOString()});
 }
 let tries=0;const other={from(){return {upsert:()=>{tries++;return Promise.resolve({error:{code:'23514'}});}};}};
 await assert.rejects(()=>recordSeen({admin:other,player:P1,headers:new Headers({'user-agent':PHONE}),platform:'pwa',now}));assert.equal(tries,1,'any other failure still fails, at once');
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/recordSeen\(\{admin,player:user\.id,headers:req\.headers,timeZone:body\.timeZone,language:body\.language,platform:body\.platform,portal:user\.app_metadata\?\.portal\}\)/);
});
test('the page says on what it runs: a portal\'s page, our app, the web app from the home screen, a frame or a tab',()=>{
 const src=read('src/supabase.js'),body=/export function pagePlatform\(win=globalThis\.window,standalone=openedStandalone\)\{\n([^]*?)\n\}/.exec(src)[1];
 const pagePlatform=new Function('win','standalone',body);
 const page=({portal=null,app=null,framed=false}={})=>{const win={document:{documentElement:{getAttribute:name=>name==='data-portal'?portal:name==='data-app'?app:null}}};win.top=framed?{}:win;return win;};
 assert.equal(pagePlatform(page({portal:'kongregate',framed:true}),false),'kongregate');assert.equal(pagePlatform(page({portal:'discord',framed:true}),true),'discord');
 assert.equal(pagePlatform(page({app:'android'}),true),'app','the app before standalone: its WebView may say either');
 assert.equal(pagePlatform(page(),true),'pwa');assert.equal(pagePlatform(page({framed:true}),false),'frame');assert.equal(pagePlatform(page(),false),'browser');
 assert.equal(pagePlatform(undefined,false),null,'no page: nothing');
 assert.match(src,/const openedStandalone=\(\(\)=>\{try\{return Boolean\(globalThis\.matchMedia\?\.\('\(display-mode: standalone\)'\)\?\.matches\|\|globalThis\.navigator\?\.standalone===true\);\}catch\{return false;\}\}\)\(\);/,'as the page opened (full screen changes the display mode later); an iPhone\'s Home Screen app too');
 const sql=read('supabase/player-platform.sql');
 assert.match(sql,/alter table public\.player_seen add column if not exists platform text;/);
 assert.match(sql,/if not exists\(select 1 from pg_constraint where conrelid='public\.player_seen'::regclass and conname='player_seen_platform_check'\) then/,'safe to run again');
 assert.doesNotMatch(sql,/create table/i,'no new table: the account delete already removes player_seen');
 assert.match(read('supabase/delete-account.sql'),/delete from public\.player_seen where player_id=p_player;/);
});

// (d) The farm in view, touched or not: an extra part of the first look (game/farm-state.js recordFirstLook).
test('the first look keeps when the farm was first in view and how long after readyAt, once, like its other parts',()=>{
 const s=createFarm(now);
 act(s,{type:'first_look',look:{readyAt:now-3000,viewAt:now-2500,viewMs:450.4}},now);
 assert.deepEqual(s.onboarding.firstLook,{readyAt:now-3000,viewAt:now-2500,viewMs:450});
 act(s,{type:'field',id:0,action:'harvest',look:{viewAt:now,viewMs:1}},now);assert.equal(s.onboarding.firstLook.viewAt,now-2500,'kept once');
 const t=createFarm(now),device=now-300000;recordFirstLook(t,{readyAt:device-9000,viewAt:device+60000,viewMs:-4,sentAt:device+70000},now);
 assert.deepEqual(t.onboarding.firstLook,{readyAt:now-79000,viewAt:now-10000},'on the server\'s clock by sentAt; a negative duration is left out');
 const u=createFarm(now);recordFirstLook(u,{viewAt:now+120000,viewMs:3*3600000},now);assert.deepEqual(u.onboarding.firstLook,{viewMs:600000},'not ahead of the server; at most 10 minutes');
 for(const copy of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(copy),read('game/farm-state.js'),copy);
});
test('the game notes the farm in view once the loading screen is gone and the page in view; a tab in the background later',()=>{
 const game=read('public/game.js');
 assert.match(game,/const pageInView=\(\)=>document\.visibilityState==='visible';/);
 assert.match(game,/if\(!pageInView\(\)\)client\.sendLook\(\);\n  farmInView=\(\)=>\{farmInView=null;const seen=\(\)=>\{if\(!pageInView\(\)\)return false;const t=Date\.now\(\);client\.look\(\{viewAt:t,viewMs:t-at\}\);client\.sendLook\(\);return true;\};/);
 assert.match(game,/if\(!seen\(\)\)\{client\.sendLook\(\);const later=\(\)=>\{if\(seen\(\)\)document\.removeEventListener\('visibilitychange',later\);\};document\.addEventListener\('visibilitychange',later\);\}\};\}/,'readyAt goes now, the view when the tab comes into view');
 assert.match(game,/\$\('loading'\)\.hidden=true;stopTips\(\);progression\.refresh\(\);\}finally\{resolve\(\);\}\},450\)\);\n  farmInView\?\.\(\);/,'right after the loading screen is gone');
 assert.ok(game.indexOf('if(!villageWorld&&!adminView&&!(state.stats.harvested>0))noteFirstLook();')<game.indexOf('  farmInView?.();'),'only for a farm whose first look this is');
});
