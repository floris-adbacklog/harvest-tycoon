import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {APP_PUSH,APP_PUSH_BLOCKED,appPushLoginLink,readAppPush,appPushAllowed,listenAppPush,appPushState,appPushOffered} from '../public/android.js';
import {createAppPush,forgetAppPushLink} from '../src/app-push.js';
import {createNotifications} from '../src/notifications.js';
import {createReminderNudge} from '../public/reminder-nudge.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async(n=30)=>{for(let i=0;i<n;i++)await Promise.resolve();};
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// Push notifications in our Android app (Oct 2026): the page around the game asks the app by going to an address (as Share does), the
// app answers on that page with window.harvestAppPush, and the game frame reads the answer through the page around it.
const element=(attrs={})=>({attrs,getAttribute:name=>attrs[name]??null,hasAttribute:name=>name in attrs,setAttribute(name,value){attrs[name]=String(value);}});
// The page around the game in the app. visits: every address the page went to. app(link): what the app does when it sees one.
function appTop({app=()=>{}}={}){
 const visits=[],win={document:{documentElement:element({'data-app':'android'})}};
 win.location={get href(){return 'https://www.harvesttycoon.com/?src=android-app';},set href(link){visits.push(String(link));app(String(link),win);}};
 win.parent=win;
 return {win,visits};
}
// The phone in the app: what it reports after each address (as the contract says), with a permission the test sets. As the real app
// (android-app AppPush.permissionState): Android 13+ reports 'default' after a first "Don't allow" (the game may still ask) and 'denied'
// only after the second.
function phone({permission='default',optedIn=false,subscriptionId='',allowOnRegister=true,answerRegister=true}={}){
 const state={permission,optedIn,subscriptionId,externalId:'',version:'1.0'},seen=[];let refusals=0;
 const report=win=>queueMicrotask(()=>win.harvestAppPush&&win.harvestAppPush({...state}));
 return {state,seen,app(link,win){
  seen.push(link);
  if(link.startsWith(APP_PUSH.login)){state.externalId=decodeURIComponent(link.split('?id=')[1]);report(win);}
  else if(link===APP_PUSH.logout){state.externalId='';report(win);}
  else if(link===APP_PUSH.status)report(win);
  else if(link===APP_PUSH.register){
   if(allowOnRegister){state.permission='granted';state.optedIn=true;state.subscriptionId||='4f1e2d3c-aaaa-4bbb-8ccc-0123456789ab';}else state.permission=++refusals>1?'denied':'default';
   if(answerRegister)report(win);
  }
 }};
}
// Supabase as far as app push uses it: the farmer's own row (row-level security) and the function that sets it.
function database({fail=false}={}){
 const calls=[];let on=false;
 return {calls,get on(){return on;},set on(value){on=value;},
  from(table){calls.push(['from',table]);const query={select:()=>query,eq:()=>query,limit:async()=>fail?{data:null,error:new Error('offline')}:{data:on&&table==='app_push_players'?[{enabled:true}]:[],error:null},maybeSingle:async()=>({data:null,error:null})};return query;},
  async rpc(name,params){calls.push([name,params]);if(fail)return {error:new Error('offline')};if(name==='app_push_save')on=params.p_enabled;return {error:null};}};
}
const SUB='4f1e2d3c-aaaa-4bbb-8ccc-0123456789ab',ZONE='Europe/Amsterdam',zone=()=>ZONE;

test('the addresses the app catches: exactly the agreed format, the player id encoded in full',()=>{
 assert.deepEqual({...APP_PUSH},{login:'onesignallogin://login',logout:'onesignallogout://logout',register:'registerpush://',status:'pushstatus://status'});
 assert.equal(appPushLoginLink('9b2f6c1e-4d3a-4f8b-a1c2-3d4e5f607182'),'onesignallogin://login?id=9b2f6c1e-4d3a-4f8b-a1c2-3d4e5f607182');
 // As the app reads it (Uri's getQueryParameter decodes): the same id back, whatever it holds.
 for(const id of ['a b&c=d/é?#','9b2f6c1e-4d3a-4f8b-a1c2-3d4e5f607182'])assert.equal(decodeURIComponent(appPushLoginLink(id).split('?id=')[1]),id);
 assert.equal(appPushLoginLink('a b&c'),'onesignallogin://login?id=a%20b%26c');
});
test('the app\'s answer: kept on the page around the game, read by the game frame; odd answers read as not allowed',()=>{
 const top=appTop(),frame={parent:top.win,document:{documentElement:element()}},seen=[];
 const hub=listenAppPush(top.win);hub.onChange(state=>seen.push(state));
 assert.equal(typeof top.win.harvestAppPush,'function');assert.equal(appPushState(frame),null,'nothing before the app answers');
 // The call exactly as the app makes it, on the page around the game.
 vm.runInNewContext("window.harvestAppPush&&window.harvestAppPush({permission:'granted',optedIn:true,subscriptionId:'4f1e2d3c-aaaa-4bbb-8ccc-0123456789ab',externalId:'p1',version:'1.0'})",{window:top.win});
 assert.deepEqual({...appPushState(frame)},{permission:'granted',optedIn:true,subscriptionId:SUB,externalId:'p1',version:'1.0'},'the frame reads the page around it');
 assert.deepEqual({...appPushState(top.win)},{...appPushState(frame)});assert.equal(appPushAllowed(appPushState(frame)),true);assert.equal(seen.length,1);
 top.win.harvestAppPush({permission:'yes',optedIn:'true',subscriptionId:'<img src=x>',externalId:7,version:{}});
 assert.deepEqual({...appPushState(frame)},{permission:'default',optedIn:false,subscriptionId:'',externalId:'',version:''});assert.equal(appPushAllowed(appPushState(frame)),false);
 assert.deepEqual({...readAppPush(undefined)},{permission:'default',optedIn:false,subscriptionId:'',externalId:'',version:''});
 assert.equal(readAppPush({subscriptionId:'x'.repeat(129)}).subscriptionId,'','too long');
 // Installed once: listening again only adds a listener, and keeps the state.
 const before=top.win.harvestAppPush;listenAppPush(top.win).onChange(()=>seen.push('second'));assert.equal(top.win.harvestAppPush,before);
 top.win.harvestAppPush({permission:'denied'});assert.equal(appPushState(frame).permission,'denied');assert.deepEqual(seen.slice(-2).map(s=>s==='second'?s:s.permission),['denied','second']);
 // A browser page or a page that cannot be read: nothing, and no error.
 assert.equal(appPushState({parent:{}}),null);assert.equal(appPushState({get harvestAppPushState(){throw new Error('x');},get parent(){throw new Error('x');}}),null);assert.equal(appPushState(undefined),null);
 assert.equal(listenAppPush(undefined),null);
});

test('Turn on asks the app only on the farmer\'s tap; the answer is saved for the farmer and the device says on',async()=>{
 const device=phone(),top=appTop({app:device.app}),db=database(),visits=top.visits;
 const push=createAppPush({supabase:db,playerId:'p1',win:top.win,waitMs:200,statusWaitMs:100,gapMs:0,timezone:zone});
 assert.equal(push.app,true);assert.equal(push.test,undefined,'no test notification in the app');
 await push.sync();await settle();
 assert.deepEqual(visits,['onesignallogin://login?id=p1'],'linking the phone to the farmer asks nothing');assert.equal(device.state.externalId,'p1');
 assert.deepEqual(await push.status(),{kind:'off'});assert.deepEqual(await push.status(),{kind:'off'});
 assert.ok(!visits.includes(APP_PUSH.register),'reading the state never asks Android\'s question');
 assert.ok(!db.calls.some(([name])=>name==='app_push_save'),'nothing is saved without a tap');
 assert.deepEqual(await push.enable(),{kind:'on'});
 assert.deepEqual(visits,['onesignallogin://login?id=p1',APP_PUSH.register]);
 // On for the farmer, with this phone's time zone for reminder settings made now (quiet hours, 09:00 and 19:00); no push id is kept.
 assert.deepEqual(db.calls.filter(([name])=>name==='app_push_save'),[['app_push_save',{p_enabled:true,p_timezone:ZONE}]]);
 assert.deepEqual(await push.status(),{kind:'on'});assert.ok(db.calls.some(([name,table])=>name==='from'&&table==='app_push_players'));
 // Turn off: off for the farmer (every phone, as OneSignal reaches them all by the player id); the phone itself still allows them.
 assert.deepEqual(await push.disable(),{kind:'off'});assert.deepEqual(db.calls.filter(([name])=>name==='app_push_save').at(-1),['app_push_save',{p_enabled:false}]);
 // On again with the phone already allowing them: the app confirms at once.
 assert.deepEqual(await push.enable(),{kind:'on'});assert.equal(visits.filter(v=>v===APP_PUSH.register).length,2);
 push.dispose();
});
test('Android says no: answered at once as blocked, nothing saved, Turn on again after a first no; a phone that never answered is off',async()=>{
 const denied=phone({allowOnRegister:false}),top=appTop({app:denied.app}),db=database();
 const push=createAppPush({supabase:db,playerId:'p1',win:top.win,waitMs:5000,statusWaitMs:100,gapMs:0});
 assert.deepEqual(await push.status(),{kind:'off'});assert.deepEqual(top.visits,[APP_PUSH.status],'no state yet: the app is asked how it is, nothing more');
 // A first "Don't allow": the app reports 'default' (Android may still ask). That answer settles it at once, not after the wait, so
 // Turn on, the reminder card and "Remind me" never hang; the farmer reads where to allow them.
 let started=Date.now();
 assert.deepEqual(await push.enable(),{kind:'blocked'});assert.ok(Date.now()-started<1000,`${Date.now()-started} ms`);assert.equal(denied.state.permission,'default');
 assert.ok(!db.calls.some(([name])=>name==='app_push_save'));
 assert.deepEqual(await push.status(),{kind:'off'},'Turn on is offered again: Android may ask once more');
 // The second "Don't allow": 'denied', only Android's settings can allow them now.
 started=Date.now();assert.deepEqual(await push.enable(),{kind:'blocked'});assert.ok(Date.now()-started<1000);
 assert.deepEqual(await push.status(),{kind:'blocked'});assert.ok(!db.calls.some(([name])=>name==='app_push_save'));
 push.dispose();
 // An answer to an earlier address (a sign-in link still on its way) is not the farmer's answer: only one after the question counts.
 const late=phone({allowOnRegister:true,answerRegister:false}),lateTop=appTop({app:late.app}),lateDb=database();
 const waiting=createAppPush({supabase:lateDb,playerId:'p1',win:lateTop.win,waitMs:5000,statusWaitMs:100,gapMs:30});
 lateTop.win.harvestAppPush({permission:'default'});void waiting.sync();
 const asked=waiting.enable();await pause(5);assert.ok(!lateTop.visits.includes(APP_PUSH.register),'the question waits its turn');
 lateTop.win.harvestAppPush({permission:'default',externalId:'p1'});await pause(50);assert.equal(lateTop.visits.at(-1),APP_PUSH.register);
 lateTop.win.harvestAppPush({...late.state});assert.deepEqual(await asked,{kind:'on'});
 assert.deepEqual(lateDb.calls.filter(([name])=>name==='app_push_save').map(([,p])=>p.p_enabled),[true]);
 waiting.dispose();
 // An app that does not answer at all (an older app): off, after a short wait, and Turn on gives up after its wait.
 const silent=appTop(),quiet=createAppPush({supabase:database(),playerId:'p1',win:silent.win,waitMs:60,statusWaitMs:30,gapMs:0});
 assert.deepEqual(await quiet.status(),{kind:'off'});assert.deepEqual(await quiet.enable(),{kind:'off'});
 quiet.dispose();
});
// Android 8-12 allow notifications from the install, so the app can report 'granted' before the farmer ever tapped Turn on. Until that
// tap OneSignal has no subscription for the phone (the app gives OneSignal its consent only on registerpush://), and the app says so:
// optedIn false and no subscription id. Only 'granted' with optedIn true is on; nothing is saved without the tap.
test('Android 8-12: allowed from the install but not opted in reads as off (Turn on stays), never saved; the tap turns it on',async()=>{
 const before={permission:'granted',optedIn:false,subscriptionId:'',externalId:'',version:'1.0'};
 assert.equal(appPushAllowed(readAppPush(before)),false);assert.equal(appPushAllowed(readAppPush({...before,optedIn:true})),true);
 assert.equal(appPushAllowed(readAppPush({...before,permission:'default',optedIn:true})),false);
 // The real app's order after the tap: consent, Android's answer (allowed at once here), opt in; the subscription id follows when
 // OneSignal has made it.
 const visits=[],state={...before},db=database(),top=appTop({app(link,win){
  visits.push(link);
  if(link.startsWith(APP_PUSH.login)){state.externalId='p1';queueMicrotask(()=>win.harvestAppPush({...state}));}
  else if(link===APP_PUSH.status)queueMicrotask(()=>win.harvestAppPush({...state}));
  else if(link===APP_PUSH.register){
   state.optedIn=true;queueMicrotask(()=>win.harvestAppPush({...state}));
   setTimeout(()=>{state.subscriptionId=SUB;win.harvestAppPush({...state});},30);
  }
 }});
 // The farmer already has them on (on another phone): this phone still says off and offers Turn on.
 db.on=true;
 const push=createAppPush({supabase:db,playerId:'p1',win:top.win,waitMs:2000,statusWaitMs:100,gapMs:0,timezone:zone});
 await push.sync();await settle();
 assert.deepEqual(await push.status(),{kind:'off'});
 // The app repeats its state (page loads, back in the app): still off, and nothing is saved.
 top.win.harvestAppPush({...state});top.win.harvestAppPush({...state});await settle();
 assert.deepEqual(await push.status(),{kind:'off'});assert.ok(!db.calls.some(([name])=>name==='app_push_save'));
 assert.ok(!visits.includes(APP_PUSH.register),'nothing asks the app to opt in without the tap');
 // The Settings line for it: Turn on, not Turn off.
 const els={},el=id=>els[id]??=({id,hidden:false,checked:false,value:'',disabled:false,textContent:'',innerHTML:'',children:[]});
 els['notify-settings']={...el('notify-settings'),querySelector:()=>null};
 const notifications={ready:Promise.resolve(),available:true,config:{appPush:true},push,get:async()=>({pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:false,digestHour:9,pushMessages:true}),save:async prefs=>prefs};
 globalThis.document={getElementById:el,querySelectorAll:()=>[]};globalThis.window={parent:{harvestBridge:{notifications}}};
 try{
  const {createNotificationsSection}=await import('../public/notifications-ui.js?granted='+Math.random());await createNotificationsSection().refresh();
  assert.equal(els['notify-enable'].hidden,false,'Turn on');assert.equal(els['notify-disable'].hidden,true,'no Turn off');
 }finally{delete globalThis.document;delete globalThis.window;}
 // The tap: an answer that is allowed and opted in but has no subscription yet is not the end (and not a no); the subscription is.
 db.on=false;
 assert.deepEqual(await push.enable(),{kind:'on'});assert.equal(visits.at(-1),APP_PUSH.register);
 assert.deepEqual(db.calls.filter(([name])=>name==='app_push_save'),[['app_push_save',{p_enabled:true,p_timezone:ZONE}]]);
 push.dispose();
 // An app that stays not opted in after the tap: off after the wait, not blocked (the phone allows them), nothing saved.
 const stuck={...before},stuckDb=database(),stuckTop=appTop({app(link,win){if(link===APP_PUSH.register)queueMicrotask(()=>win.harvestAppPush({...stuck}));}});
 const stuckPush=createAppPush({supabase:stuckDb,playerId:'p1',win:stuckTop.win,waitMs:60,statusWaitMs:30,gapMs:0});
 stuckTop.win.harvestAppPush({...stuck});
 assert.deepEqual(await stuckPush.enable(),{kind:'off'});assert.ok(!stuckDb.calls.some(([name])=>name==='app_push_save'));
 stuckPush.dispose();
});
test('a slow answer still counts: Android\'s question answered after the wait is saved the moment the phone allows it; not after the farm closed',async()=>{
 const slow=phone({answerRegister:false}),top=appTop({app:slow.app}),db=database(),changes=[];
 const push=createAppPush({supabase:db,playerId:'p1',win:top.win,waitMs:40,statusWaitMs:30,gapMs:0,timezone:zone});push.onChange(()=>changes.push(1));
 top.win.harvestAppPush({permission:'default',optedIn:false,subscriptionId:SUB});
 assert.deepEqual(await push.enable(),{kind:'off'},'no answer within the wait');assert.ok(!db.calls.some(([name])=>name==='app_push_save'));
 top.win.harvestAppPush({...slow.state});await settle();
 // Saved by itself, with this phone's time zone: a farmer without reminder settings gets them on their own clock, not the server's UTC.
 assert.deepEqual(db.calls.filter(([name])=>name==='app_push_save'),[['app_push_save',{p_enabled:true,p_timezone:ZONE}]]);assert.ok(changes.length>=2,'Settings is told');
 assert.deepEqual(await push.status(),{kind:'on'});
 push.dispose();
 // A farm that closed (signed out, opened again) never saves a "Turn on" for whoever comes next.
 const other=appTop(),db2=database(),closed=createAppPush({supabase:db2,playerId:'p1',win:other.win,waitMs:20,statusWaitMs:20,gapMs:0});
 other.win.harvestAppPush({permission:'default'});await closed.enable();closed.dispose();
 other.win.harvestAppPush({permission:'granted',optedIn:true,subscriptionId:SUB});await settle();
 assert.ok(!db2.calls.some(([name])=>name==='app_push_save'));
});
test('sign-in and sign-out: the phone is linked once per page load and again after a sign-in; Sign out unlinks only this phone',async()=>{
 const device=phone({permission:'granted',optedIn:true,subscriptionId:SUB}),top=appTop({app:device.app}),db=database();
 const first=createAppPush({supabase:db,playerId:'p1',win:top.win,gapMs:0});
 await first.sync();await first.sync();
 // The farm opened again in the same page (a reconnect): no second link.
 const again=createAppPush({supabase:db,playerId:'p1',win:top.win,gapMs:0});await again.sync();
 assert.deepEqual(top.visits,['onesignallogin://login?id=p1']);await settle();
 // Sign out: the app unlinks this phone. On or off stays the farmer's, so the farmer's other phones keep their notifications.
 db.on=true;await again.detach();await settle();
 assert.deepEqual(db.calls.filter(([name])=>name.startsWith('app_push')),[]);assert.equal(db.on,true);
 assert.deepEqual(top.visits,['onesignallogin://login?id=p1',APP_PUSH.logout]);assert.equal(device.state.externalId,'');
 // The next farmer signs in on the same phone: linked to them.
 await createAppPush({supabase:db,playerId:'p2',win:top.win,gapMs:0}).sync();assert.equal(top.visits.at(-1),'onesignallogin://login?id=p2');
 // The sign-in card (src/main.js landing) forgets the link, so the same farmer signing in again is linked again.
 forgetAppPushLink(top.win);await createAppPush({supabase:db,playerId:'p2',win:top.win,gapMs:0}).sync();assert.equal(top.visits.filter(v=>v==='onesignallogin://login?id=p2').length,2);
 // Without a player there is nothing to link.
 const none=appTop();await createAppPush({supabase:db,win:none.win,gapMs:0}).sync();assert.deepEqual(none.visits,[]);
 const main=read('src/main.js');
 assert.match(main,/if\(inApp\)listenAppPush\(window\);/,'the page keeps the app\'s answers from the start');
 assert.match(main,/function landing\(message=''\)\{connection\.stop\(\);dispose\(\);if\(inApp\)forgetAppPushLink\(window\);/);
 assert.match(main,/createNotifications\(supabase,\{configUrl:functionsUrl&&`\$\{functionsUrl\}\/notify-hourly\?config`,playerId:user\.id\}\)/);
 assert.match(main,/void notifications\.ready\?\.then\?\.\(\(\)=>notifications\?\.push\?\.sync\?\.\(\)\);/,'linked once the service says app push is on');
 assert.match(main,/try\{await notifications\?\.push\?\.detach\(\);\}catch\{\}notifications\?\.dispose\?\.\(\);notifications=null;dispose\(\);/,'Sign out unlinks before signing out');
});
test('one address at a time, a moment apart, so the app sees each one',async()=>{
 const top=appTop(),push=createAppPush({supabase:database(),playerId:'p1',win:top.win,statusWaitMs:5,gapMs:40});
 const times=[];top.win.location={get href(){return '';},set href(link){top.visits.push(link);times.push(Date.now());}};
 await Promise.all([push.sync(),push.status()]);await pause(60);
 assert.deepEqual(top.visits,['onesignallogin://login?id=p1',APP_PUSH.status]);assert.ok(times[1]-times[0]>=35,`${times[1]-times[0]} ms apart`);
 push.dispose();
});

test('the service decides: the app\'s push only once notify-hourly says appPush; then linked, and the Settings in the frame work through the page around it',async()=>{
 const device=phone(),top=appTop({app:device.app}),db=database();
 top.win.navigator={serviceWorker:{}};top.win.PushManager={};top.win.Notification={};
 const config=body=>async()=>({ok:true,json:async()=>body});
 const off=createNotifications(db,{configUrl:'https://x.example/fn?config',fetchImpl:config({enabled:true,push:true,email:true}),win:top.win,playerId:'p1'});await off.ready;
 assert.equal(off.push,null,'no OneSignal key yet: no device push in the app (and nothing goes to the app)');off.dispose();
 const notifications=createNotifications(db,{configUrl:'https://x.example/fn?config',fetchImpl:config({enabled:true,push:true,email:true,appPush:true}),win:top.win,playerId:'p1'});
 await notifications.ready;await notifications.push.sync();await settle();
 assert.deepEqual(top.visits,['onesignallogin://login?id=p1']);assert.equal(appPushState(top.win).externalId,'p1');
 // Settings in the game frame (public/notifications-ui.js) talks to the bridge on the page around it.
 const els={},el=id=>els[id]??=({id,hidden:false,checked:false,value:'',disabled:false,textContent:'',innerHTML:'',children:[]});
 const intro={hidden:false};els['notify-settings']={...el('notify-settings'),querySelector:sel=>sel===':scope>.install-copy'?intro:null};
 notifications.get=async()=>({pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:false,digestHour:9,pushMessages:true});const saved=[];notifications.save=async prefs=>{saved.push(prefs);return prefs;};
 globalThis.document={getElementById:el,querySelectorAll:()=>[]};globalThis.window={parent:{harvestBridge:{notifications}}};
 try{
  const {createNotificationsSection}=await import('../public/notifications-ui.js?app='+Math.random());const section=createNotificationsSection();
  await section.refresh();
  assert.equal(els['notify-settings'].hidden,false);assert.equal(els['notify-device'].hidden,false,'the device switch is back in the app');assert.equal(els['notify-push-rows'].hidden,false);assert.equal(intro.hidden,false);
  assert.match(els['notify-device-copy'].textContent,/Turn on notifications in this browser or app/);assert.equal(els['notify-enable'].hidden,false);
  assert.ok(!top.visits.includes(APP_PUSH.register),'opening Settings asks nothing');
  await els['notify-enable'].onclick();
  assert.equal(top.visits.at(-1),APP_PUSH.register);assert.match(els['notify-device-copy'].textContent,/Notifications are on in this browser or app\./);
  assert.equal(els['notify-test'].hidden,true,'no test in the app');assert.equal(els['notify-disable'].hidden,false);assert.equal(saved.length,1,'the settings on screen are saved, as on the website');
  // The phone takes them away in Android's settings: the app says so, and the device line follows by itself.
  top.win.harvestAppPush({...device.state,permission:'denied',optedIn:false});await pause(5);await settle();
  assert.equal(els['notify-device-copy'].textContent,APP_PUSH_BLOCKED);assert.equal(els['notify-enable'].hidden,true);
  // Without the app's push (the service has none yet) the line that asks to allow notifications goes too; the email rows stay.
  const email=createNotifications(db,{configUrl:'https://x.example/fn?config',fetchImpl:config({enabled:true,push:true,email:true}),win:top.win});await email.ready;
  email.get=notifications.get;globalThis.window={parent:{harvestBridge:{notifications:email}}};await section.refresh();
  assert.equal(els['notify-device'].hidden,true);assert.equal(els['notify-push-rows'].hidden,true);assert.equal(els['notify-email-rows'].hidden,false);assert.equal(intro.hidden,true);
  // A first "Don't allow" from Settings: answered at once, the status line says where to allow them, and Turn on is offered again.
  const no=phone({allowOnRegister:false}),noTop=appTop({app:no.app});
  const refused=createNotifications(db,{configUrl:'https://x.example/fn?config',fetchImpl:config({enabled:true,push:true,email:true,appPush:true}),win:noTop.win,playerId:'p1'});await refused.ready;
  refused.get=notifications.get;refused.save=notifications.save;globalThis.window={parent:{harvestBridge:{notifications:refused}}};
  try{
   await section.refresh();assert.equal(els['notify-enable'].hidden,false);
   const started=Date.now();await els['notify-enable'].onclick();assert.ok(Date.now()-started<3000,`${Date.now()-started} ms`);
   assert.equal(noTop.visits.at(-1),APP_PUSH.register);assert.equal(els['notify-status'].textContent,APP_PUSH_BLOCKED);
   assert.equal(els['notify-enable'].hidden,false);assert.equal(els['notify-enable'].disabled,false,'the buttons are free again');
  }finally{refused.dispose();}
 }finally{delete globalThis.document;delete globalThis.window;notifications.dispose();}
});
test('the reminder question in the app offers push again (Turn on), and says where to allow it when the phone said no',async()=>{
 for(const [allow,toast] of [[true,/Reminders are on/],[false,new RegExp(APP_PUSH_BLOCKED.replace(/[.]/g,'\\.'))]]){
  const device=phone({allowOnRegister:allow}),top=appTop({app:device.app}),db=database(),storage={},toasts=[];let card=null;
  const buttons={later:{onclick:null},on:{onclick:null,disabled:false}};
  const notifications=createNotifications(db,{configUrl:'https://x.example/fn?config',fetchImpl:async()=>({ok:true,json:async()=>({enabled:true,push:true,email:true,appPush:true})}),win:top.win,playerId:'p1'});
  await notifications.ready;notifications.get=async()=>({pushCrops:false,pushProduction:false,pushDaily:true,emailDigest:false,digestHour:9});notifications.save=async prefs=>prefs;
  globalThis.localStorage={getItem:k=>storage[k]??null,setItem:(k,v)=>{storage[k]=v;}};
  globalThis.document={createElement(){card={set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},setAttribute(){},querySelector:sel=>sel==='[data-nudge-later]'?buttons.later:buttons.on,remove(){card=null;}};return card;},body:{append(){}},querySelector:()=>card};
  globalThis.window={parent:{harvestBridge:{notifications}}};
  try{
   const nudge=createReminderNudge({state:{plots:[],buildings:{}},level:()=>5,notify:m=>toasts.push(m),settleMs:0});nudge.harvested();
   // Asking how it is, before the app answered anything: the app is asked for the state, never Android's question.
   const check=nudge.check();await pause(5);top.win.harvestAppPush({permission:'default'});await check;
   assert.match(card?.html??'',/Want a nudge when your crops are ready\?.*data-nudge-on>Turn on</s,'the push question, not the email one');
   assert.ok(!top.visits.includes(APP_PUSH.register));
   await buttons.on.onclick();
   assert.equal(top.visits.at(-1),APP_PUSH.register);assert.match(toasts.at(-1),toast);
  }finally{delete globalThis.localStorage;delete globalThis.document;delete globalThis.window;notifications.dispose();}
 }
 // The gift's "Remind me" uses the same question (public/retention-ui.js) and the same words when the phone said no.
 const gift=read('public/retention-ui.js');
 assert.match(gift,/notify\(result\?\.kind==='blocked'\?\(api\.push\.app\?APP_PUSH_BLOCKED:'Notifications are blocked for this site\. You can allow them in your browser settings\.'\)/);
 assert.match(read('public/reminder-nudge.js'),/notify\(result\?\.kind==='blocked'\?\(api\.push\.app\?APP_PUSH_BLOCKED:'Notifications are blocked for this site\. You can allow them in your browser settings\.'\)/);
});

test('browsers and CrazyGames: the browser\'s own push as before, and nothing ever goes to the app\'s addresses',async()=>{
 const visits=[],win={document:{documentElement:element()},location:{set href(link){visits.push(link);},get href(){return 'https://www.harvesttycoon.com/';}},navigator:{serviceWorker:{}},PushManager:{},Notification:{permission:'default'}};win.parent=win;
 const site=createNotifications(database(),{configUrl:'https://x.example/fn?config',fetchImpl:async()=>({ok:true,json:async()=>({enabled:true,push:true,email:true,appPush:true,vapidPublicKey:'AQID'})}),win,playerId:'p1'});await site.ready;
 assert.equal(site.push.app,undefined);assert.equal(typeof site.push.test,'function','the browser keeps its test');
 await site.push.sync();site.dispose();await settle();
 assert.deepEqual(visits,[]);assert.equal(win.harvestAppPush,undefined,'no app hook on a website page');
 // CrazyGames' page: never marked as the app (public/android-app.js), and its farm has no reminders at all (src/farm-session.js).
 assert.doesNotMatch(read('public/crazygames.html'),/android/);assert.match(read('src/crazygames.js'),/createFarmSession\(/);assert.doesNotMatch(read('src/crazygames.js'),/createNotifications/);
 // The second lock in public/android.css no longer hides the reminders' device parts in the app; nothing else changed there.
 assert.doesNotMatch(read('public/android.css'),/notify-|gift-remind/);
 // Only the page around the game goes to the app's addresses, in the app: the game frame never does.
 for(const file of ['public/notifications-ui.js','public/reminder-nudge.js','public/retention-ui.js','public/game.js'])assert.doesNotMatch(read(file),/onesignal|registerpush|pushstatus/i,file);
});
