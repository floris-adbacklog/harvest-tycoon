import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import {openIntent,withoutOpen,OPEN_SCREENS} from '../public/app-links.js';
import {startUpdateCheck,UPDATE_AFTER_HIDDEN} from '../src/app-update.js';
import {planPlayer} from '../supabase/functions/notify-hourly/rules.js';
import {CROP_NAMES,BUILDING_NAMES} from '../supabase/functions/notify-hourly/names.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const exists=path=>existsSync(new URL(`../${path}`,import.meta.url));
const D='11111111-1111-4111-8111-111111111111',E='22222222-2222-4222-8222-222222222222';

test('links that open one screen: only known screens, and a chat only by a real channel',()=>{
 assert.deepEqual(OPEN_SCREENS,['chat','today','leaderboard','farm']);
 assert.deepEqual(openIntent('?open=today'),{open:'today'});assert.deepEqual(openIntent('?source=pwa&open=leaderboard'),{open:'leaderboard'});
 assert.deepEqual(openIntent(`?open=chat&channel=${encodeURIComponent(`dm:${D}:${E}`)}`),{open:'chat',channel:`dm:${D}:${E}`});
 assert.deepEqual(openIntent('?open=chat&channel=global'),{open:'chat',channel:'global'});
 assert.deepEqual(openIntent('?open=chat&channel=<script>'),{open:'chat'},'an unknown channel just opens the chat');
 for(const bad of ['','?open=admin','?open=','?source=push'])assert.equal(openIntent(bad),null,bad);
 assert.equal(withoutOpen(`https://x.example/?source=pwa&open=chat&channel=global#top`),'/?source=pwa#top','a reload does not open it again; the rest stays');
 const main=read('src/main.js');
 assert.match(main,/let pendingOpen=openIntent\(location\.search\);\nif\(pendingOpen\)history\.replaceState\(null,'',withoutOpen\(location\.href\)\);/);
 assert.match(main,/navigator\.serviceWorker\?\.addEventListener\?\.\('message'/);assert.match(main,/window\.launchQueue\?\.setConsumer\?\./);
 const cloud=read('src/game-cloud.js');
 assert.match(cloud,/window\.harvestOpen=intent=>\{/);assert.match(cloud,/const waiting=window\.parent\?\.harvestTakeOpen\?\.\(\);if\(waiting\)window\.harvestOpen\(waiting\);/);
 assert.match(read('public/game.js'),/window\.harvestToday=\(\)=>retention\.openToday\(\);/);
 assert.match(read('src/chat-ui.js'),/if\(channel\?\.startsWith\('dm:'\)\)\{const t=overview\.threads\?\.find\(x=>x\.channel===channel\);/);
});
test('a private message opens its conversation; a reminder only about the daily gift opens Daily rewards',()=>{
 assert.match(read('supabase/functions/notify-hourly/index.ts'),/url:`\/\?open=chat&channel=\$\{encodeURIComponent\(claim\.channel\)\}`/);
 const now=Date.parse('2026-09-21T07:05:00Z');
 const player=farm=>({player_id:'p1',push_crops:true,push_production:true,push_daily:true,timezone:'Europe/Amsterdam',last_active_at:new Date(now-3*3600000).toISOString(),crops_seen_at:now-2*3600000,production_seen_at:now-2*3600000,push_count:0,subscriptions:[{endpoint:'https://push.example/1'}],farm:{plots:[],buildings:{},...farm}});
 const names={crops:CROP_NAMES,buildings:BUILDING_NAMES};
 const gift=planPlayer(player({login:{lastDay:'2026-09-20',streak:1}}),now,names);
 assert.equal(gift.push.url,'/?source=push&open=today');
 const crops=planPlayer(player({login:{lastDay:'2026-09-20',streak:1},plots:[{id:0,crop:'wheat',readyAt:now-60000}]}),now,names);
 assert.equal(crops.push.url,'/?source=push','the fields too: the farm');
});
test('a new version: checked on the way back in after a minute away, never while playing',async()=>{
 const listeners={},reloads=[];let clock=0,live='v2',intervals=0;
 const doc={hidden:false,querySelector:()=>({content:'v1'}),addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const win={setInterval:()=>++intervals,clearInterval(){},location:{reload:()=>reloads.push(clock)}};
 const fetches=[];const fetchImpl=async(url,options)=>{fetches.push([url,options.cache]);return {ok:true,json:async()=>({version:live})};};
 const check=startUpdateCheck({doc,win,fetchImpl,now:()=>clock});
 assert.equal(intervals,1);
 doc.hidden=true;await listeners.visibilitychange();clock+=UPDATE_AFTER_HIDDEN-1;doc.hidden=false;await listeners.visibilitychange();
 assert.deepEqual(reloads,[],'a short glance away changes nothing');assert.equal(fetches.length,0);
 doc.hidden=true;await listeners.visibilitychange();clock+=UPDATE_AFTER_HIDDEN;doc.hidden=false;await listeners.visibilitychange();
 assert.deepEqual(fetches,[['/version.json','no-store']]);assert.equal(reloads.length,1,'back after a minute with a new version: reload');
 live='v1';reloads.length=0;const same=startUpdateCheck({doc,win,fetchImpl,now:()=>clock});assert.equal(await same.check(),false);
 assert.equal(startUpdateCheck({doc:{querySelector:()=>({content:'dev'})},win,fetchImpl}),null,'a local build never checks');
 const build=read('scripts/build-static.mjs');
 assert.match(build,/writeFileSync\('dist-static\/version\.json',JSON\.stringify\(\{version\}\)/);assert.match(build,/replace\('<meta name="harvest-version" content="dev">'/);
 assert.match(read('public/play.html'),/<meta name="harvest-version" content="dev">/);
 const rules=JSON.parse(read('vercel.json')).headers;assert.equal(rules.find(r=>r.source==='/version.json').headers[0].value,'no-store');
});
test('the install window: a description, a phone and a computer screenshot, three shortcuts, and one window',()=>{
 const m=JSON.parse(read('public/manifest.webmanifest'));
 assert.ok(m.description.length>40);assert.deepEqual(m.launch_handler,{client_mode:['focus-existing','auto']});
 assert.deepEqual(m.screenshots.map(s=>[s.form_factor,s.sizes]),[['narrow','1080x2338'],['wide','1920x1080']]);
 for(const s of m.screenshots)assert.ok(exists(`public${s.src}`),s.src);
 assert.deepEqual(m.shortcuts.map(s=>openIntent(new URL(s.url,'https://x.example').search).open),['chat','today','leaderboard']);
 for(const s of m.shortcuts)for(const icon of s.icons)assert.ok(exists(`public${icon.src}`),icon.src);
});
test('the iPhone launch screen: one picture per screen size, each exactly that size',()=>{
 const html=read('public/play.html'),tags=[...html.matchAll(/<link rel="apple-touch-startup-image" media="\(device-width: (\d+)px\) and \(device-height: (\d+)px\) and \(-webkit-device-pixel-ratio: (\d)\) and \(orientation: portrait\)" href="([^"]+)">/g)];
 assert.equal(tags.length,12);
 for(const [,w,h,r,href] of tags){assert.ok(exists(`public${href}`),href);assert.ok(href.endsWith(`launch-${w*r}x${h*r}.png`),href);}
});
test('the number on the app icon: unread private and family messages, and one more for a chat message while the game is closed',async()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/onIcon=\(u\.dm\?\?0\)\+\(u\.family\?\?0\);\n  if\(onIcon!==iconCount\)\{iconCount=onIcon;void setAppBadge\(onIcon\);\}/);
 const store=new Map(),badges=[],listeners={};
 const caches={open:async()=>({match:async key=>store.has(key)?{text:async()=>store.get(key)}:undefined,put:async(key,res)=>store.set(key,await res.text())})};
 const self={addEventListener:(n,fn)=>{listeners[n]=fn;},skipWaiting(){},navigator:{setAppBadge:async n=>badges.push(n)},clients:{claim(){}},registration:{showNotification:async()=>{}},location:{origin:'https://x.example'}};
 vm.runInNewContext(read('public/sw.js'),{self,caches,URL,JSON,Response:class{constructor(b){this.b=b;}async text(){return this.b;}},Promise,Number,String,console});
 const push=tag=>{let p;listeners.push({data:{json:()=>({title:'T',body:'B',tag})},waitUntil:x=>{p=x;}});return p;};
 await push('chat-dm:a:b');await push('chat-family:x');await push('harvest-tycoon');
 assert.deepEqual(badges,[1,2],'chat messages count, farm reminders do not');
 const {setAppBadge}=await import('../public/app-badge.js');const calls=[];
 const win={navigator:{setAppBadge:async n=>calls.push(['set',n]),clearAppBadge:async()=>calls.push(['clear'])},caches:{open:async()=>({put:async()=>{}})}};win.top=win;
 await setAppBadge(3,win);await setAppBadge(0,win);assert.deepEqual(calls,[['set',3],['clear']]);
 await setAppBadge(2,{});assert.ok(true,'a browser without badges ignores it');
});
test('full screen: a switch in Settings where the browser can, remembered, back with the first tap; the privacy policy names it',()=>{
 const html=read('public/farm.html');
 assert.match(html,/<label class="notify-row notify-row-art app-fullscreen" for="app-fullscreen" id="app-fullscreen-row" hidden><i data-game-art="farm"><\/i><span><strong>Full screen<\/strong>/);
 const pwa=read('src/pwa.js');
 assert.match(pwa,/supported:\(\)=>Boolean\(doc\?\.fullscreenEnabled&&doc\.documentElement\?\.requestFullscreen\)&&!ios\(\)/,'not on an iPhone');
 assert.match(pwa,/requestFullscreen\(\{navigationUI:'hide'\}\)/);assert.match(pwa,/KEY='harvest-tycoon:fullscreen'/);
 assert.match(pwa,/const standalone=\(\)=>openedAsApp\|\|displayStandalone\(\);/,'full screen does not make the app look uninstalled');
 const install=read('public/install-ui.js');
 assert.match(install,/if\(full\?\.supported\?\.\(\)&&full\.wanted\(\)&&!full\.active\(\)\)document\.addEventListener\('pointerup',\(\)=>\{if\(full\.wanted\(\)&&!full\.active\(\)\)void full\.enter\(\);\},\{once:true\}\);/);
 const privacy=read('public/privacy.html');
 assert.match(privacy,/<code>harvest-tycoon:fullscreen<\/code>/);assert.match(privacy,/It keeps one small page to show when there is no internet connection/);
});
test('the wiki explains the app, and App is the first quick search',()=>{
 assert.match(read('public/wiki-ui.js'),/const QUICK=\[\{label:'App',topic:'getting-started',anchor:'sec-play-it-as-an-app'\},'Corn'/);
 assert.match(read('public/wiki-content.js'),/section\('Play it as an app',facts\(\[/);
});
