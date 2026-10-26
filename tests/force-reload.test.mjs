import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleAdminReload,readReloadAfter,forgetReloadCache,RELOAD_CACHE_MS} from '../supabase/functions/farm-api/reload-service.js';
import {startForcedReload,startUpdateCheck,noteReloadAfter,useForcedReload,guardPurchases,holdForPurchase,purchaseRunning,resetPurchases,typingNow,savingNow,
 FORCED_KEY,FORCED_TEXT,FORCED_TOAST_MS,FORCED_WINDOW_MS,FORCED_CHECK_MS,PURCHASE_TAIL_MS} from '../src/app-update.js';
import {createReloadCard,lastLine} from '../src/admin-reload.js';
import {LANGUAGES} from '../public/languages.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// The owner, 22 Oct 2026: a button in the admin panel that makes everyone who has the game open reload to the newest version right away.
const ADMIN='22222222-2222-4222-8222-222222222222';
const owner={id:ADMIN,email:'floris@millstone.nl',email_confirmed_at:'2026-09-16T21:12:00Z',signInMethods:['oauth']};
const now=Date.UTC(2026,9,22,12);

function table(row=null,{fail=false}={}){
 const calls=[];
 return {calls,row:()=>row,from(name){
  const q={select(){return q;},eq(){return q;},
   async maybeSingle(){calls.push([name,'read']);return fail?{data:null,error:{message:'relation "public.site_reload" does not exist'}}:{data:row,error:null};},
   upsert(next){calls.push([name,'upsert',next]);row={...row,...next};return {select:()=>({single:async()=>({data:row,error:null})})};}};
  return q;
 }};
}

test('only the admin, signed in with Google, can press it; the time is kept and read back as lastReload',async()=>{
 forgetReloadCache();
 const db=table({reload_after:null});
 for(const user of [{...owner,signInMethods:['password']},{...owner,email:'someone@example.com'},{...owner,email_confirmed_at:null},{id:'x'},null,
  {...owner,identities:[{provider:'google'},{provider:'discord'}]}]){
  const r=await handleAdminReload({admin:db,body:{reload:true},user,now});
  assert.equal(r.status,403);assert.equal(r.data.error,'Not authorized.');
 }
 assert.deepEqual(db.calls,[],'a refused press never touches the table');
 const read1=await handleAdminReload({admin:db,body:{},user:owner,now});
 assert.equal(read1.status,200);assert.equal(read1.data.lastReload,null);assert.equal(read1.data.profile.player_id,ADMIN,'bridge.request checks the caller');
 const pressed=await handleAdminReload({admin:db,body:{reload:true},user:owner,now});
 assert.equal(pressed.status,200);assert.equal(pressed.data.lastReload,now);
 assert.deepEqual(db.calls.at(-1),['site_reload','upsert',{id:true,reload_after:new Date(now).toISOString(),set_by:ADMIN,updated_at:new Date(now).toISOString()}]);
 assert.equal('reloadAfter' in pressed.data,false,'the button\'s own answer never starts the admin\'s reload');
 assert.equal(await readReloadAfter(table(null),now+1),now,'this instance knows the new time at once');
 assert.equal((await handleAdminReload({admin:db,body:{reload:'yes'},user:owner,now})).data.lastReload,now,'only reload:true presses');
 assert.equal(db.calls.filter(c=>c[1]==='upsert').length,1);
});

test('farm loads carry reloadAfter: read at most every 30 seconds, never failing a load',async()=>{
 forgetReloadCache();
 const db=table({reload_after:'2026-10-22T11:00:00Z'});
 assert.equal(await readReloadAfter(db,now),Date.parse('2026-10-22T11:00:00Z'));
 await readReloadAfter(db,now+RELOAD_CACHE_MS-1);assert.equal(db.calls.length,1,'cached');
 await readReloadAfter(db,now+RELOAD_CACHE_MS);assert.equal(db.calls.length,2);
 forgetReloadCache();assert.equal(await readReloadAfter(table(null,{fail:true}),now),null,'no table yet (farm-api before the SQL): nothing');
 forgetReloadCache();assert.equal(await readReloadAfter({from(){throw new Error('down');}},now),null);
 forgetReloadCache();assert.equal(await readReloadAfter(table({reload_after:null}),now),null);
 const api=read('supabase/functions/farm-api/index.ts');
 assert.match(api,/'admin_email','invite','player_log','admin_reload'\]\.includes\(body\?\.operation\)/);
 assert.match(api,/const reloadAt=body\.operation==='load'\?readReloadAfter\(admin\):null;/);
 assert.match(api,/if\(body\.operation==='admin_reload'\)\{const r=await handleAdminReload\(\{admin,body,user\}\);return reply\(r\.data,r\.status\);\}/);
 assert.equal(api.match(/serverNow:now,reloadAfter:await reloadAt\}\)/g)?.length,4,'every load answer: the admin view, a new or changed farm, an unchanged one');
 assert.ok(api.indexOf('const reloadAt=')<api.indexOf('const profileResponse=await (mine?.profile'),'read beside the farm, not after it');
});

test('the table: one row, only farm-api, an after-check; no function',()=>{
 const sql=read('supabase/force-reload.sql');
 assert.match(sql,/create table if not exists public\.site_reload\(\n id boolean primary key default true check \(id\),/);
 assert.match(sql,/alter table public\.site_reload enable row level security;/);
 assert.match(sql,/revoke all on public\.site_reload from public, anon, authenticated;/);
 assert.match(sql,/grant select, insert, update on public\.site_reload to service_role;/);
 assert.match(sql,/has_table_privilege\('anon','public\.site_reload'/);assert.match(sql,/raise exception 'site_reload is open to anon or authenticated'/);
 assert.doesNotMatch(sql,/create (or replace )?function/i);assert.doesNotMatch(sql,/create policy/i);
});

// A page for the reload: the version meta, a body for the toast, a clock that sleep moves on.
function page({version='v1',live='v2',started=now-60000,store=new Map(),busy=()=>false,typing=()=>false,canReload=()=>true}={}){
 const reloads=[],toasts=[],fetches=[];let clock=now;
 const body={children:[],append(el){this.children.push(el);toasts.push({text:el.textContent,at:clock});el.remove=()=>{this.children=this.children.filter(c=>c!==el);};}};
 const doc={body,querySelector:s=>s==='meta[name="harvest-version"]'?{content:version}:null,
  createElement:()=>({style:{},setAttribute(){},textContent:''})};
 const win={location:{reload:()=>reloads.push(clock)}};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const p={reloads,toasts,fetches,store,get clock(){return clock;},set live(v){live=v;},advance(ms){clock+=ms;},sleeps:[]};
 p.forced=startForcedReload({doc,win,now:()=>clock,pageStarted:started,storage,busy:()=>busy(clock),typing:()=>typing(clock),canReload,text:()=>FORCED_TEXT,
  fetchImpl:async(url,options)=>{fetches.push([url,options.cache]);return {ok:true,json:async()=>({version:live})};},
  sleep:async ms=>{p.sleeps.length=Math.min(p.sleeps.length,1000);p.sleeps.push(ms);clock+=ms;await new Promise(r=>setImmediate(r));}});
 return p;
}

test('a press after the page opened, with a newer version live: the toast for 3 seconds, then one reload',async()=>{
 const p=page();
 assert.equal(await p.forced.offer(now-1000,now),'reloaded');
 assert.deepEqual(p.fetches,[['/version.json','no-store']]);
 assert.deepEqual(p.toasts,[{text:'A new version is ready, reloading…',at:now}]);
 assert.deepEqual(p.reloads,[now+FORCED_TOAST_MS],'3 seconds after the toast');
 assert.equal(p.store.get(FORCED_KEY),String(now-1000),'remembered before the reload');
 // The same press again (the next answer, or the reloaded page with the same storage): never twice.
 assert.equal(await p.forced.offer(now-1000,now),'done');assert.equal(p.reloads.length,1);
 const again=page({store:p.store});assert.equal(await again.forced.offer(now-1000,now),'done');assert.deepEqual(again.fetches,[]);
});

test('no reload: a page opened after the press, the same version, a stale press, nothing pressed, a local build',async()=>{
 const after=page({started:now-500});assert.equal(await after.forced.offer(now-1000,now),'openedAfter');assert.deepEqual(after.fetches,[]);
 // The device clock is 10 minutes behind: the server's clock decides. Opened (server time) after the press, so nothing.
 const skewed=page({started:now-600000+5000});assert.equal(await skewed.forced.offer(now-1000,now+600000),'openedAfter');
 const same=page({live:'v1'});assert.equal(await same.forced.offer(now-1000,now),'same');assert.deepEqual(same.reloads,[]);assert.deepEqual(same.toasts,[]);
 assert.equal(await same.forced.offer(now-1000,now),'checked','asked again only after a minute');assert.equal(same.fetches.length,1);
 const old=page({started:now-FORCED_WINDOW_MS-60000});assert.equal(await old.forced.offer(now-FORCED_WINDOW_MS-1,now),'tooLate');
 for(const value of [null,undefined,0,'x',-5])assert.equal(await page().forced.offer(value,now),'none');
 assert.equal(startForcedReload({doc:{querySelector:()=>({content:'dev'})},win:{}}),null,'a local build never reloads');
 assert.equal(startForcedReload({doc:{querySelector:()=>null},win:{}}),null);
});

test('a press before the deploy is out: checked again once a minute, and reloads when the version arrives',async()=>{
 const p=page({live:'v1'});
 assert.equal(await p.forced.offer(now-1000,now),'same');
 assert.equal(await p.forced.offer(now-1000,now),'checked');
 p.live='v2';p.advance(FORCED_CHECK_MS-1);assert.equal(await p.forced.offer(now-1000,now),'checked');
 p.advance(1);assert.equal(await p.forced.offer(now-1000,now),'reloaded');assert.equal(p.fetches.length,2);assert.equal(p.reloads.length,1);
});

test('held back during a purchase, while taps are saved, while typing, or while the page holds it; the toast again when something starts',async()=>{
 // A purchase that ends after 10 seconds: no toast before it ends.
 const buy=page({busy:at=>at<now+10000});
 assert.equal(await buy.forced.offer(now-1000,now),'reloaded');
 assert.ok(buy.toasts[0].at>=now+10000,'the toast only after the purchase');assert.equal(buy.reloads[0],buy.toasts[0].at+FORCED_TOAST_MS);
 // A message typed during the 3 seconds: the toast goes, the reload waits for the message to be sent, then the toast again.
 const type=page({typing:at=>at>=now+FORCED_TOAST_MS&&at<now+20000});
 assert.equal(await type.forced.offer(now-1000,now),'reloaded');
 assert.equal(type.toasts.length,2);assert.ok(type.reloads[0]>=now+20000+FORCED_TOAST_MS);
 // The Discord page's Authorize card (canReload) holds it the same way.
 let allowed=false;const card=page({canReload:()=>allowed});
 const going=card.forced.offer(now-1000,now);
 for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));
 assert.deepEqual(card.reloads,[]);allowed=true;assert.equal(await going,'reloaded');
 // One wait at a time: an answer that comes while it waits starts nothing more.
 let open=true;const one=page({busy:()=>open});const first=one.forced.offer(now-1000,now);await new Promise(r=>setImmediate(r));
 assert.equal(await one.forced.offer(now-1000,now),'running');open=false;await first;assert.equal(one.reloads.length,1);
});

test('what counts as a purchase: checkout (plus the leaving page) and payments, counted while they run, even when they fail',async()=>{
 resetPurchases();let clock=now;
 let finish;const bridge={checkout:()=>new Promise(r=>{finish=r;}),payments:async()=>{throw new Error('no');}};
 guardPurchases(bridge,{now:()=>clock});
 const going=bridge.checkout('pack','id');assert.equal(purchaseRunning(clock),true);
 finish('ok');assert.equal(await going,'ok');assert.equal(purchaseRunning(clock),true,'the page is on its way to Stripe');
 assert.equal(purchaseRunning(clock+PURCHASE_TAIL_MS),false);
 await assert.rejects(bridge.payments({operation:'status'}),/no/);assert.equal(purchaseRunning(clock+PURCHASE_TAIL_MS),false,'a failed one is over too');
 assert.throws(()=>holdForPurchase(()=>{throw new Error('sync');}),/sync/);assert.equal(purchaseRunning(clock+PURCHASE_TAIL_MS),false);
 const bare={};assert.equal(guardPurchases(bare),bare);assert.equal('checkout' in bare,false,'a page without payments gets none');
 resetPurchases();
 for(const [file,line] of [['src/main.js','  guardPurchases(bridge);\n  window.harvestBridge=bridge;'],['src/farm-session.js','   guardPurchases(bridge);\n   win.harvestBridge=bridge;']])
  assert.ok(read(file).includes(line),`${file}: wrapped as the bridge is handed to the farm (after Kreds attached its own)`);
});

function fakeDoc({active=null,fields=[],saving=false,frames=[]}={}){
 return {activeElement:active,body:{classList:{contains:c=>c==='farm-saving'&&saving}},
  querySelectorAll:s=>s==='iframe'?frames.map(d=>({contentDocument:d})):s.includes('.chat-compose')?fields:[]};
}
test('typing: a focused text field with text, or the chat\'s message with text while it shows, in the page or the farm',()=>{
 const input=(value,extra={})=>({tagName:'INPUT',type:'text',value,getClientRects:()=>[1],...extra});
 assert.equal(typingNow(fakeDoc()),false);
 assert.equal(typingNow(fakeDoc({active:input('')})),false,'an empty field is not typing');
 assert.equal(typingNow(fakeDoc({active:input('hi')})),true);
 assert.equal(typingNow(fakeDoc({active:{tagName:'TEXTAREA',value:'news'}})),true);
 assert.equal(typingNow(fakeDoc({active:input('5',{type:'checkbox'})})),false);
 assert.equal(typingNow(fakeDoc({active:{tagName:'DIV',isContentEditable:true,textContent:'x'}})),true);
 assert.equal(typingNow(fakeDoc({frames:[fakeDoc({fields:[input('hello valley')]})]})),true,'the chat message in the farm, not focused');
 assert.equal(typingNow(fakeDoc({frames:[fakeDoc({fields:[input('hello',{getClientRects:()=>[]})]})]})),false,'a chat that is closed holds nothing');
 assert.equal(savingNow(fakeDoc({frames:[fakeDoc({saving:true})]})),true);assert.equal(savingNow(fakeDoc()),false);
});

test('every farm answer goes past the page\'s watcher; startUpdateCheck starts it with the page\'s hold-back',async()=>{
 const offered=[];useForcedReload({offer:(at,server)=>{offered.push([at,server]);}});
 const data={reloadAfter:5,serverNow:9,state:{}};assert.equal(noteReloadAfter(data),data);
 noteReloadAfter({state:{}});noteReloadAfter(null);
 assert.deepEqual(offered,[[5,9]]);
 useForcedReload({offer:()=>{throw new Error('x');}});assert.doesNotThrow(()=>noteReloadAfter(data));useForcedReload(null);
 assert.match(read('src/supabase.js'),/return withRetry\(\(\)=>farmRequestOnce\(sent\),\{repeatable:retry&&safeToRepeat\(sent\)\}\)\.then\(noteReloadAfter\);\}/);
 assert.match(read('src/app-update.js'),/forced=startForcedReload\(\{doc,win,fetchImpl,now,canReload\}\);/);
 const doc={hidden:false,querySelector:()=>({content:'v1'}),addEventListener(){}};
 const started=startUpdateCheck({doc,win:{setInterval:()=>1,clearInterval(){}},fetchImpl:async()=>({ok:true,json:async()=>({version:'v1'})})});
 assert.equal(typeof started.forced.offer,'function');useForcedReload(null);
});

test('the admin card: confirm first, then the press; last used in UTC; the reach explained',async()=>{
 class El{constructor(){Object.assign(this,{hidden:false,disabled:false,textContent:'',byId:new Map()});}
  set innerHTML(html){this._html=html;for(const m of html.matchAll(/\sid="([^"]+)"/g))this.byId.set(m[1],new El());}get innerHTML(){return this._html;}
  querySelector(s){return this.byId.get(s.replace(/^#/,''))??null;}}
 const settings=new El();settings.append=s=>{settings.section=s;};
 const dialog={querySelector:s=>s==='[data-admin-panel="settings"]'?settings:null};
 const asked=[],confirms=[];let yes=false;
 const bridge={request:async body=>{asked.push(body);return {lastReload:body.reload?now:now-86400000,profile:{player_id:ADMIN}};}};
 const card=createReloadCard({dialog,bridge,ask:async o=>{confirms.push(o);return yes;},doc:{createElement:()=>new El()}});
 const $=id=>settings.section.querySelector(`#admin-reload-${id}`);
 assert.equal(settings.section.hidden,true,'hidden until the admin\'s dashboard shows it');
 assert.match(settings.section.innerHTML,/Reload everyone now/);assert.match(settings.section.innerHTML,/It only reaches games on a version that already has this button/);
 assert.doesNotMatch(settings.section.innerHTML,/ · /);
 await card.show();assert.equal(settings.section.hidden,false);assert.deepEqual(asked,[{operation:'admin_reload'}]);
 assert.match($('last').textContent,/^Last used .+ \(UTC\)\.$/);
 assert.equal(await card.press(),'cancelled');assert.equal(asked.length,1,'Cancel sends nothing');
 assert.equal(confirms[0].title,'Reload everyone now?');
 yes=true;assert.equal(await card.press(),'sent');assert.deepEqual(asked.at(-1),{operation:'admin_reload',reload:true});
 assert.equal($('status').textContent,'Done. Open games reload within about a minute and a half.');assert.equal($('now').disabled,false);
 assert.equal(lastLine(null),'Not used yet.');
 const dash=read('src/admin-dashboard.js');
 assert.match(dash,/const reloadCard=createReloadCard\(\{dialog,bridge\}\);/);assert.match(dash,/if\(role==='admin'\)void reloadCard\.show\(\);/);
 assert.doesNotMatch(read('src/admin-reload.js'),/window\.confirm|[^.]confirm\(/,'the panel\'s own confirm, never the browser\'s');
});

test('the toast is in every language of the game',()=>{
 for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){
  const dict=JSON.parse(read(`public/i18n/${code}.json`));
  assert.ok(dict[FORCED_TEXT],`${code}: ${FORCED_TEXT}`);assert.match(dict[FORCED_TEXT],/…$/);
 }
 assert.ok(JSON.parse(read('i18n/catalog.json'))[FORCED_TEXT]);
});
