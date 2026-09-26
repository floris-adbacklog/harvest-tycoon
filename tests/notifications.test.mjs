import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DEFAULT_PREFS,prefsFromRow,paramsFromPrefs,createNotifications} from '../src/notifications.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/notifications.sql');

test('a player without a saved row has private messages, the daily gift and crops & goods on (26 Sep 2026), the email off',()=>{
 assert.deepEqual(prefsFromRow(null),DEFAULT_PREFS);assert.deepEqual(prefsFromRow(undefined),{pushCrops:true,pushProduction:true,pushDaily:true,emailDigest:false,digestHour:9,pushMessages:true,emailMarketing:false},'private messages, the daily gift and crops & goods are on by default; news & offers by email is off');
 assert.deepEqual(prefsFromRow({push_crops:true,push_production:null,push_daily:'yes',email_digest:true,digest_hour:7}),{pushCrops:true,pushProduction:false,pushDaily:false,emailDigest:true,digestHour:7,emailMarketing:false,pushMessages:false},'only a real true switches something on');
 assert.equal(prefsFromRow({push_messages:true}).pushMessages,true);
 assert.equal(prefsFromRow({digest_hour:99}).digestHour,9);
});
test('saving sends strict booleans, a valid hour and the time zone',()=>{
 assert.deepEqual(paramsFromPrefs({pushCrops:true,pushProduction:1,emailDigest:true,digestHour:18},'Europe/Amsterdam'),{p_push_crops:true,p_push_production:false,p_push_daily:false,p_email_digest:true,p_digest_hour:18,p_timezone:'Europe/Amsterdam',p_push_messages:false,p_email_marketing:false});
 assert.equal(paramsFromPrefs({pushMessages:true,digestHour:9},'UTC').p_push_messages,true);
 assert.equal(paramsFromPrefs({digestHour:'x'},'UTC').p_digest_hour,9);assert.equal(paramsFromPrefs({digestHour:24},'UTC').p_digest_hour,9);assert.equal(paramsFromPrefs({digestHour:0},'UTC').p_digest_hour,0);
});
const response=(ok,body)=>({ok,json:async()=>body});
test('reminders stay unavailable until the notification service answers',async()=>{
 const off=createNotifications({},{configUrl:null});await off.ready;assert.equal(off.available,false);
 for(const fetchImpl of [async()=>response(false,{}),async()=>response(true,{enabled:false}),async()=>{throw new Error('offline');},async()=>({ok:true,json:async()=>{throw new Error('not json');}})]){
  const n=createNotifications({},{configUrl:'https://x.example/notify-hourly?config',fetchImpl});await n.ready;assert.equal(n.available,false);
 }
 let asked;const on=createNotifications({},{configUrl:'https://x.example/notify-hourly?config',fetchImpl:async url=>{asked=url;return response(true,{enabled:true,vapidPublicKey:'PUB'});}});
 assert.equal(on.available,false,'not before the answer');await on.ready;assert.equal(on.available,true);assert.equal(on.config.vapidPublicKey,'PUB');assert.equal(asked,'https://x.example/notify-hourly?config');
});
test('loading reads the own row and saving calls the validated function',async()=>{
 const calls=[];
 const supabase={from:table=>({select:columns=>({async maybeSingle(){calls.push(['select',table,columns]);return {data:{push_crops:true,digest_hour:6},error:null};}})}),async rpc(name,params){calls.push(['rpc',name,params]);return {error:null};}};
 const n=createNotifications(supabase,{timezone:()=>'Europe/Amsterdam'});
 assert.equal((await n.get()).pushCrops,true);assert.equal(calls[0][1],'notification_settings');assert(!calls[0][2].includes('unsubscribe_token'),'the token is not needed in the browser');
 const saved=await n.save({pushCrops:false,pushDaily:true,emailDigest:true,digestHour:20});
 assert.equal(calls[1][1],'notification_save');assert.equal(calls[1][2].p_timezone,'Europe/Amsterdam');assert.deepEqual(saved,{pushCrops:false,pushProduction:false,pushDaily:true,emailDigest:true,digestHour:20,pushMessages:false,emailMarketing:false});
 const failing=createNotifications({from:()=>({select:()=>({maybeSingle:async()=>({data:null,error:new Error('nope')})})}),rpc:async()=>({error:new Error('bad')})});
 await assert.rejects(()=>failing.get(),/nope/);await assert.rejects(()=>failing.save({}),/bad/);
});

test('database: opt-in by default, own rows readable, writes only through the functions',()=>{
 for(const table of ['notification_settings','push_subscriptions','notification_state'])assert.match(sql,new RegExp(`alter table public\\.${table} enable row level security`));
 assert(!/for (insert|update|delete|all)/i.test(sql),'no client write policies');
 assert.equal((sql.match(/create policy/g)??[]).length,2,'only the two own-row read policies; notification_state has none');
 assert.match(sql,/push_crops boolean not null default false/);assert.match(sql,/email_digest boolean not null default false/);assert.match(sql,/digest_hour smallint not null default 9 check \(digest_hour between 0 and 23\)/);
 assert.match(sql,/endpoint text not null unique check \(endpoint like 'https:\/\/%'/);
});
test('database: the functions are locked to the signed-in player',()=>{
 const functions=sql.split('create or replace function').slice(1);assert.equal(functions.length,3);
 for(const body of functions){assert.match(body,/security definer set search_path = ''/);assert.match(body,/auth\.uid\(\)/);assert.match(body,/is_anonymous/);}
 for(const name of ['notification_save','notification_subscribe','notification_unsubscribe']){assert.match(sql,new RegExp(`revoke all on function public\\.${name}\\([^)]*\\) from public, anon`));assert.match(sql,new RegExp(`grant execute on function public\\.${name}\\([^)]*\\) to authenticated`));}
 assert.match(sql,/pg_timezone_names/);assert.match(sql,/limit 5/,'at most five devices per player');
});

function domFor(){
 const els={};const el=id=>els[id]??=({id,hidden:false,checked:false,value:'',disabled:false,textContent:'',innerHTML:'',children:[]});
 for(const id of ['notify-settings','notify-device','notify-device-copy','notify-enable','notify-test','notify-disable','notify-push-rows','notify-email-rows','notify-messages','notify-ready','notify-daily','notify-email','notify-marketing','notify-hour','notify-email-time','notify-status'])el(id);
 els['notify-hour'].children=[];return {els,document:{getElementById:el,querySelectorAll:()=>[]}};
}
function bridgeFor(over={}){
 const calls=[],state={stored:{pushCrops:true,pushProduction:false,pushDaily:false,emailDigest:true,digestHour:20,pushMessages:true},device:'off'};
 const bridge={ready:Promise.resolve(),available:false,config:{enabled:true,push:true,email:true},async get(){return state.stored;},async save(prefs){state.stored=prefs;return prefs;},
  push:{async status(){return {kind:state.device};},async enable(){calls.push('enable');state.device='on';},async disable(){calls.push('disable');state.device='off';},async test(){calls.push('test');}},...over};
 return {bridge,state,calls};
}
async function open(bridge,dom){
 globalThis.document=dom.document;globalThis.window={parent:{harvestBridge:{notifications:bridge}}};
 const {createNotificationsSection}=await import('../public/notifications-ui.js?t='+Math.random());return createNotificationsSection();
}
test('the reminders block stays hidden until the service is on, then shows the saved choices',async()=>{
 const dom=domFor(),{els}=dom,{bridge,state}=bridgeFor();const section=await open(bridge,dom);
 assert.match(els['notify-hour'].innerHTML,/<option value="0">00:00<\/option>/);assert.match(els['notify-hour'].innerHTML,/<option value="23">23:00<\/option>/);
 await section.refresh();assert.equal(els['notify-settings'].hidden,true,'service not on yet');
 bridge.available=true;await section.refresh();
 assert.equal(els['notify-settings'].hidden,false);assert.equal(els['notify-ready'].checked,true,'on when either setting is on');assert.equal(els['notify-daily'].checked,false);assert.equal(els['notify-hour'].value,'20');assert.equal(els['notify-email-time'].hidden,false);
 els['notify-daily'].checked=true;els['notify-email'].checked=false;await els['notify-ready'].onchange();
 assert.deepEqual(state.stored,{digestHour:20,pushMessages:true,pushDaily:true,emailDigest:false,emailMarketing:false,pushCrops:true,pushProduction:true},'one switch sets both');assert.equal(els['notify-status'].textContent,'Saved.');assert.equal(els['notify-email-time'].hidden,true,'the time only matters with the email on');assert.equal(els['notify-ready'].disabled,false);
 bridge.save=async()=>{throw new Error('Unknown time zone.');};
 els['notify-ready'].checked=false;await els['notify-ready'].onchange();
 assert.equal(els['notify-ready'].checked,true,'a failed save puts the switch back');assert.equal(els['notify-status'].textContent,'Unknown time zone.');
 delete globalThis.document;delete globalThis.window;
});
test('only what the service offers is shown: push rows for push, the email rows for email',async()=>{
 for(const [config,push,email] of [[{enabled:true,push:true,email:false},false,true],[{enabled:true,push:false,email:true},true,false]]){
  const dom=domFor(),{bridge}=bridgeFor({config,available:true,push:config.push?bridgeFor().bridge.push:null});const section=await open(bridge,dom);await section.refresh();
  assert.equal(dom.els['notify-settings'].hidden,false);assert.equal(dom.els['notify-push-rows'].hidden,push,'push rows hidden without push');assert.equal(dom.els['notify-device'].hidden,push);assert.equal(dom.els['notify-email-rows'].hidden,email,'email rows hidden without email');
 }
 const dom=domFor(),{bridge}=bridgeFor({config:{enabled:false,push:false,email:false},available:true});await (await open(bridge,dom)).refresh();assert.equal(dom.els['notify-settings'].hidden,true);
 delete globalThis.document;delete globalThis.window;
});
test('the device block tells the truth per device and its buttons work',async()=>{
 const dom=domFor(),{els}=dom,{bridge,state,calls}=bridgeFor({available:true});const section=await open(bridge,dom);
 await section.refresh();assert.match(els['notify-device-copy'].textContent,/Turn on notifications/);assert.equal(els['notify-enable'].hidden,false);assert.equal(els['notify-test'].hidden,true);
 await els['notify-enable'].onclick();assert.deepEqual(calls,['enable']);assert.match(els['notify-device-copy'].textContent,/are on in this browser or app/);assert.equal(els['notify-test'].hidden,false);assert.equal(els['notify-disable'].hidden,false);assert.equal(els['notify-enable'].hidden,true);
 await els['notify-test'].onclick();assert.match(els['notify-status'].textContent,/Test sent/);
 await els['notify-disable'].onclick();assert.equal(state.device,'off');
 for(const [kind,text,rowsHidden] of [['install-first',/add Harvest Tycoon to your home screen/,false],['blocked',/blocked/,false],['unsupported',/cannot receive/,true]]){state.device=kind;await section.refresh();assert.match(els['notify-device-copy'].textContent,text);assert.equal(els['notify-push-rows'].hidden,rowsHidden);assert.equal(els['notify-enable'].hidden,true);}
 bridge.push.enable=async()=>{throw new Error('Reminders are not switched on yet.');};state.device='off';await section.refresh();await els['notify-enable'].onclick();assert.match(els['notify-status'].textContent,/not switched on/);assert.equal(els['notify-enable'].disabled,false);
 delete globalThis.document;delete globalThis.window;
});
test('the settings dialog carries the reminders block, hidden by default, and never claims delivery it cannot do',()=>{
 const farm=read('public/farm.html');
 assert.match(farm,/<section id="notify-settings"[^>]*hidden>/);
 for(const id of ['notify-ready','notify-daily','notify-email','notify-hour','notify-device','notify-enable','notify-test','notify-disable'])assert(farm.includes(`id="${id}"`),id);
 for(const id of ['notify-crops','notify-production'])assert(!farm.includes(`id="${id}"`),`${id} became one switch`);
 assert.match(farm,/id="notify-push-rows" hidden/);assert.match(farm,/id="notify-email-rows" hidden/);assert.match(farm,/<strong>Crops &amp; goods ready<\/strong><small>One reminder when new crops or goods are ready, at most once an hour and not between 22:00 and 08:00\.<\/small>/);
 for(const id of ['notify-ready','notify-daily','notify-email'])assert(!new RegExp(`id="${id}"[^>]*checked`).test(farm),`${id} starts off`);
 assert.match(read('public/sound-settings.js'),/createNotificationsSection/);
 assert.match(read('src/main.js'),/bridge\.notifications=createNotifications\(supabase/);
});
