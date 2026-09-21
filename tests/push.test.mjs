import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPush,urlBase64ToUint8Array} from '../src/push.js';
import {createNotifications} from '../src/notifications.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function device({permission='default',ios=false,standalone=false,existing=null,grant='granted',ready=true}={}){
 const calls=[],state={permission,sub:existing};
 const sub=endpoint=>({endpoint,toJSON:()=>({endpoint,keys:{p256dh:'P',auth:'A'}}),async unsubscribe(){state.sub=null;calls.push(['unsubscribe']);return true;}});
 const registration={pushManager:{async getSubscription(){return state.sub;},async subscribe(options){calls.push(['subscribe',options]);state.sub=sub('https://push.example/device');return state.sub;}},async showNotification(title,options){calls.push(['show',title,options]);}};
 const Notification={get permission(){return state.permission;},async requestPermission(){calls.push(['permission']);state.permission=grant;return grant;}};
 if(existing)state.sub=sub(existing);
 const win={navigator:{userAgent:ios?'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)':'Mozilla/5.0 (Android 14)',serviceWorker:{get ready(){return ready?Promise.resolve(registration):Promise.reject(new Error('no worker'));}}},PushManager:{},Notification,matchMedia:()=>({matches:standalone})};
 const rpc=[];const supabase={async rpc(name,params){rpc.push([name,params]);return {error:null};}};
 return {win,calls,rpc,supabase,state};
}
test('a base64url key becomes the bytes the browser expects',()=>{
 assert.deepEqual([...urlBase64ToUint8Array('AQID')],[1,2,3]);assert.deepEqual([...urlBase64ToUint8Array('-_8')],[251,255]);
});
test('status: what this device can do',async()=>{
 const make=over=>{const d=device(over);return createPush({supabase:d.supabase,getKey:async()=>'AQID',win:d.win});};
 assert.equal((await make({}).status()).kind,'off');
 assert.equal((await make({permission:'denied'}).status()).kind,'blocked');
 assert.equal((await make({permission:'granted',existing:'https://push.example/x'}).status()).kind,'on');
 assert.equal((await make({permission:'granted'}).status()).kind,'off','allowed, but nothing subscribed yet');
 assert.equal((await make({ios:true}).status()).kind,'install-first','an iPhone only receives push from the home screen');
 assert.equal((await make({ios:true,standalone:true}).status()).kind,'off');
 assert.equal((await createPush({supabase:{},getKey:async()=>null,win:{navigator:{}}}).status()).kind,'unsupported');
 assert.equal((await createPush({supabase:{},getKey:async()=>null,win:undefined}).status()).kind,'unsupported');
});
test('turning notifications on asks permission, subscribes with the service key and links the device to the player',async()=>{
 const d=device(),push=createPush({supabase:d.supabase,getKey:async()=>'AQID',win:d.win});
 const result=await push.enable();
 assert.equal(result.kind,'on');assert.deepEqual(d.calls.map(c=>c[0]),['permission','subscribe']);
 const options=d.calls[1][1];assert.equal(options.userVisibleOnly,true);assert.deepEqual([...options.applicationServerKey],[1,2,3]);
 assert.deepEqual(d.rpc,[['notification_subscribe',{p_endpoint:'https://push.example/device',p_p256dh:'P',p_auth:'A',p_user_agent:'Mozilla/5.0 (Android 14)'}]]);
});
test('turning on stops early when it cannot work, and never subscribes without a yes',async()=>{
 const denied=device({grant:'denied'});assert.equal((await createPush({supabase:denied.supabase,getKey:async()=>'AQID',win:denied.win}).enable()).kind,'blocked');assert.equal(denied.rpc.length,0);
 const phone=device({ios:true});assert.equal((await createPush({supabase:phone.supabase,getKey:async()=>'AQID',win:phone.win}).enable()).kind,'install-first');assert.equal(phone.calls.length,0,'no prompt on an iPhone browser tab');
 const noKey=device();await assert.rejects(()=>createPush({supabase:noKey.supabase,getKey:async()=>null,win:noKey.win}).enable(),/not switched on/);assert.equal(noKey.calls.length,0);
 const noWorker=device({ready:false});await assert.rejects(()=>createPush({supabase:noWorker.supabase,getKey:async()=>'AQID',win:noWorker.win}).enable(),/not ready/);
 const broken=device();broken.supabase.rpc=async()=>({error:new Error('nope')});await assert.rejects(()=>createPush({supabase:broken.supabase,getKey:async()=>'AQID',win:broken.win}).enable(),/nope/);
});
test('turning off, syncing and signing out keep the server and the device in step',async()=>{
 const d=device({permission:'granted',existing:'https://push.example/x'}),push=createPush({supabase:d.supabase,getKey:async()=>'AQID',win:d.win});
 await push.sync();assert.equal(d.rpc[0][0],'notification_subscribe');assert.equal(d.rpc[0][1].p_endpoint,'https://push.example/x','a shared device follows the signed-in player');
 await push.detach();assert.equal(d.rpc[1][0],'notification_unsubscribe');assert.equal(d.state.sub!==null,true,'signing out only stops the reminders, the browser subscription stays');
 assert.equal((await push.disable()).kind,'off');assert.equal(d.rpc.at(-1)[0],'notification_unsubscribe');assert.equal(d.state.sub,null);
 const idle=device();await createPush({supabase:idle.supabase,getKey:async()=>'AQID',win:idle.win}).sync();assert.equal(idle.rpc.length,0,'no subscription, nothing to sync');
});
test('the test notification is shown locally by the service worker',async()=>{
 const d=device({permission:'granted',existing:'https://push.example/x'});await createPush({supabase:d.supabase,getKey:async()=>'AQID',win:d.win}).test();
 assert.equal(d.calls[0][0],'show');assert.equal(d.calls[0][1],'Harvest Tycoon');assert.match(d.calls[0][2].body,/Notifications work in this browser or app/);
});
test('push is only offered when the service has it switched on',async()=>{
 const on=createNotifications({},{configUrl:'https://x.example/fn?config',fetchImpl:async()=>({ok:true,json:async()=>({enabled:true,push:true,email:false,vapidPublicKey:'AQID'})}),win:undefined});
 assert.equal(on.push,null,'before the config answer');await on.ready;assert.equal(typeof on.push.status,'function');assert.equal(on.config.email,false);
 const emailOnly=createNotifications({},{configUrl:'https://x.example/fn?config',fetchImpl:async()=>({ok:true,json:async()=>({enabled:true,push:false,email:true,vapidPublicKey:null})}),win:undefined});await emailOnly.ready;assert.equal(emailOnly.push,null);assert.equal(emailOnly.available,true);
});

test('service worker: every push shows a notification and a tap opens the game',async()=>{
 const listeners={},shown=[],opened=[],focused=[];
 const clientsList=[{url:'https://www.harvesttycoon.com/',focus:async()=>focused.push('focused')}];
 const self={addEventListener:(name,fn)=>{listeners[name]=fn;},skipWaiting(){},clients:{claim(){},matchAll:async()=>clientsList,openWindow:async url=>opened.push(url)},registration:{showNotification:async(title,options)=>shown.push([title,options])},location:{origin:'https://www.harvesttycoon.com'}};
 vm.runInNewContext(read('public/sw.js'),{self,URL,JSON,console});
 const run=async fn=>{let p;fn({waitUntil:x=>{p=x;}});await p;};
 const push=data=>({data:data===undefined?null:{json:()=>data,text:()=>String(data)},waitUntil:x=>{push.p=x;}});
 for(const data of [{title:'T',body:'3 crops ready',tag:'x',url:'/?source=push'},undefined])await (async()=>{const event=push(data);listeners.push(event);await push.p;})();
 assert.equal(shown.length,2,'a push without a payload still shows something');assert.equal(shown[0][0],'T');assert.equal(shown[0][1].body,'3 crops ready');assert.equal(shown[0][1].data.url,'/?source=push');assert.equal(shown[0][1].tag,'x');assert.equal(shown[0][1].renotify,true);
 assert.equal(shown[1][0],'Harvest Tycoon');assert.equal(shown[1][1].data.url,'/');
 const evil={data:{json:()=>({body:'x',url:'https://evil.example/'})},waitUntil:x=>{evil.p=x;}};listeners.push(evil);await evil.p;assert.equal(shown[2][1].data.url,'/','only same-site paths are followed');
 let closed=false;const click={notification:{close(){closed=true;},data:{url:'/?source=push'}},waitUntil:x=>{click.p=x;}};listeners.notificationclick(click);await click.p;
 assert(closed);assert.deepEqual(focused,['focused'],'an open game is focused instead of opening a second one');assert.equal(opened.length,0);
 clientsList.length=0;const again={notification:{close(){},data:{url:'/?source=push'}},waitUntil:x=>{again.p=x;}};listeners.notificationclick(again);await again.p;assert.deepEqual(opened,['https://www.harvesttycoon.com/?source=push']);
});

test('the notify-hourly function: config leaks no secret, unsubscribing needs a POST, and the job only runs on POST',()=>{
 const index=read('supabase/functions/notify-hourly/index.ts');
 const configLine=index.split('\n').find(l=>l.includes("query.has('config')"));assert(configLine&&!/VAPID_PRIVATE|RESEND_KEY|SERVICE_ROLE/.test(configLine),'config answer');
 assert(index.indexOf("req.method==='POST'")<index.indexOf(".update({email_digest:false"),'the unsubscribe update sits behind the POST check');
 assert(index.indexOf("if(req.method!=='POST')return json({error:'Use POST.'},405)")<index.indexOf('runJob('),'the job needs a POST');
 assert.match(index,/tokenOk\(token\)/);assert.match(index,/List-Unsubscribe-Post/);assert.match(index,/notification_begin_run/);
 assert.match(index,/import webpush from 'npm:web-push@/);assert(!/console\.(log|error)\([^)]*(VAPID_PRIVATE|RESEND_KEY)/.test(index),'secrets are never logged');
});

test('the hourly schedule is written down, runs at :05 and points at the function',()=>{
 const cron=read('supabase/notifications-cron.sql');
 assert.match(cron,/cron\.schedule\('notify-hourly', '5 \* \* \* \*'/);assert.match(cron,/functions\/v1\/notify-hourly/);assert.match(cron,/create extension if not exists pg_cron/);assert.match(cron,/net\.http_post/);
 const jobSql=read('supabase/notifications-job.sql');
 for(const fn of ['notification_begin_run','notification_add_emails','notification_candidates']){assert.match(jobSql,new RegExp(`revoke all on function public\\.${fn}\\([^)]*\\) from public, anon, authenticated`));assert.match(jobSql,new RegExp(`grant execute on function public\\.${fn}\\([^)]*\\) to service_role`));}
 assert.match(jobSql,/date_trunc\('hour', last_run_at\) < date_trunc\('hour', now\(\)\)/,'one run per clock hour');
 assert(!/re_[A-Za-z0-9_]{20,}|['"][A-Za-z0-9_-]{43}['"]/.test(cron+jobSql+read('supabase/functions/notify-hourly/index.ts')),'no key pasted into the repo');
});
