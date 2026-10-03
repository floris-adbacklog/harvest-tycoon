import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {androidApp,appShareLink,shareInApp,APP_SHARE} from '../public/android.js';
import {portalOff,APP_OFF,PORTAL_FEATURES} from '../public/portal.js';
import {usableProviders} from '../src/social-login.js';
import {scheduleBrowserTip} from '../src/browser-tip.js';
import {createNotifications} from '../src/notifications.js';
import {startPwa,installState} from '../src/pwa.js';
import {portalTips,LOADING_TIPS,APP_HIDDEN_TIPS} from '../public/loading-screen.js';
import {WIKI_TOPICS,wikiArticle,wikiQuick} from '../public/wiki-content.js';
import {createPassUI} from '../public/pass-ui.js';
import {SEASON_PASS,createFarm,normalizeFarm,xpForLevel} from '../game/farm-state.js';
import {buildWiki} from '../scripts/build-wiki.mjs';
import {buildLanguagePages,READY} from '../scripts/build-languages.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};

// Our Android app (Oct 2026): the game on Google Play in a WebView wrapper (WebViewGold). The app keeps the WebView's own user agent and
// adds " HarvestTycoonApp/1.0"; ?app=android is the fallback, remembered on the device.
const APP_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36 HarvestTycoonApp/1.0';
const WEBVIEW_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36';
const FACEBOOK_UA=`${WEBVIEW_UA} [FB_IAB/FB4A;FBAV/484.0.0.66.73;]`;
const CHROME_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36';
const KEY='harvest-tycoon:app';
// A page (or the game frame) with an element that holds attributes, for the marks.
const element=(attrs={})=>({attrs,getAttribute:name=>attrs[name]??null,hasAttribute:name=>name in attrs,setAttribute(name,value){attrs[name]=String(value);}});
const appWindow=(extra={})=>({document:{documentElement:element({'data-app':'android'})},...extra});

// ---- The early mark: public/android-app.js, run as the browser runs it ----
// parent: the page around the game frame (an element), 'cross-origin' for one that cannot be read, or null for a page on its own.
function mark({ua=CHROME_UA,search='',stored={},blocked=false,parent=null,own={}}={}){
 const html=element({...own});
 const storage=blocked?{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');},removeItem(){throw new Error('blocked');}}
  :{getItem:key=>stored[key]??null,setItem(key,value){stored[key]=String(value);},removeItem(key){delete stored[key];}};
 const window={};
 window.parent=parent==='cross-origin'?{get document(){throw new Error('cross-origin');}}:parent?{document:{documentElement:parent}}:window;
 vm.runInNewContext(read('public/android-app.js'),{window,document:{documentElement:html},navigator:{userAgent:ua},location:{search},localStorage:storage});
 return {app:html.attrs['data-app'],attrs:html.attrs,stored,detect:window.harvestAndroidApp};
}
test('the early mark: the app\'s user agent marks the page; Chrome, other WebViews and the Facebook app never do',()=>{
 assert.equal(mark({ua:APP_UA}).app,'android');assert.deepEqual(mark({ua:APP_UA}).stored,{},'the user agent needs nothing stored');
 assert.equal(mark({ua:APP_UA,search:'?src=android-app'}).app,'android','the app\'s own start address');
 for(const ua of [CHROME_UA,WEBVIEW_UA,FACEBOOK_UA,'','Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1'])
  assert.equal(mark({ua}).app,undefined,ua);
 assert.equal(mark({ua:`${CHROME_UA} HarvestTycoonApp`}).app,undefined,'only HarvestTycoonApp/ with its version');
});
test('the fallback: ?app=android once is remembered on this device; ?app=web forgets it; nothing else counts',()=>{
 const stored={};
 assert.equal(mark({search:'?app=android',stored}).app,'android');assert.equal(stored[KEY],'android');
 assert.equal(mark({stored}).app,'android','the next page without it');assert.equal(mark({search:'?src=farm-photo&invite=AB12',stored}).app,'android');
 assert.equal(mark({search:'?ref=x&app=android&src=android-app',stored:{}}).app,'android','anywhere in the address');
 assert.equal(mark({search:'?app=web',stored}).app,undefined);assert.equal(stored[KEY],undefined,'forgotten');assert.equal(mark({stored}).app,undefined);
 assert.equal(mark({ua:APP_UA,search:'?app=web'}).app,'android','the app itself stays the app');
 for(const search of ['?app=androids','?xapp=android','?app=Android','?apps=android','?app='])assert.equal(mark({search,stored:{}}).app,undefined,search);
 assert.equal(mark({stored:{[KEY]:'yes'}}).app,undefined,'only the value this script writes');
});
test('blocked storage never stops the page: the user agent still counts, and ?app=android counts for that page',()=>{
 assert.equal(mark({ua:APP_UA,blocked:true}).app,'android');assert.equal(mark({search:'?app=android',blocked:true}).app,'android');
 assert.equal(mark({blocked:true}).app,undefined);
});
test('the game frame follows the page around it; never anything inside CrazyGames\' page',()=>{
 assert.equal(mark({parent:element({'data-app':'android'})}).app,'android','the frame\'s own address never carries ?app=');
 assert.equal(mark({parent:element()}).app,undefined);assert.equal(mark({ua:APP_UA,parent:'cross-origin'}).app,'android');assert.equal(mark({parent:'cross-origin'}).app,undefined);
 // public/crazygames.html is <html data-portal="crazygames">: its own page and the farm frame in it stay as they are.
 for(const options of [{ua:APP_UA,own:{'data-portal':'crazygames'}},{ua:APP_UA,parent:element({'data-portal':'crazygames'})},{stored:{[KEY]:'android'},parent:element({'data-portal':'crazygames'})},
  {search:'?app=android',own:{'data-portal':'crazygames'}}]){const run=mark(options);assert.equal(run.app,undefined,JSON.stringify(options));assert.deepEqual(run.stored,options.stored??{});}
 assert.doesNotMatch(read('public/crazygames.html'),/android/);
});
test('the rule on its own (window.harvestAndroidApp): what counts and what to remember',()=>{
 const {detect}=mark();
 assert.deepEqual({...detect(APP_UA,'','')},{app:true,remember:null});
 assert.deepEqual({...detect(CHROME_UA,'?app=android',null)},{app:true,remember:'android'});
 assert.deepEqual({...detect(CHROME_UA,'','android')},{app:true,remember:null},'remembered on this device');
 assert.deepEqual({...detect(CHROME_UA,'?app=web','android')},{app:false,remember:'web'});
 assert.deepEqual({...detect(undefined,undefined,undefined)},{app:false,remember:null});
});

// ---- What the code asks (public/android.js) ----
test('androidApp(): this page or the page around the frame is marked; anything unreadable is not the app',()=>{
 assert.equal(androidApp(appWindow()),true);
 const frame={document:{documentElement:element()}};frame.parent=appWindow();assert.equal(androidApp(frame),true);
 const site={document:{documentElement:element()}};site.parent=site;assert.equal(androidApp(site),false);
 assert.equal(androidApp(undefined),false);assert.equal(androidApp({}),false);assert.equal(androidApp(),false,'tests and Node: no window');
 assert.equal(androidApp({get document(){throw new Error('x');},get parent(){throw new Error('x');}}),false);
 assert.equal(androidApp({document:{documentElement:element({'data-app':'ios'})}}),false);
});
test('the share link the app opens: shareapp://shareapp?<message>&url=<link>, both encoded in full, the link once',()=>{
 const link='https://www.harvesttycoon.com/?invite=TONYAA',message='Come farm with me in Harvest Tycoon! Reach level 10 and we both get 150 diamonds.';
 assert.equal(APP_SHARE,'shareapp://shareapp');
 assert.equal(appShareLink(message,link),'shareapp://shareapp?Come%20farm%20with%20me%20in%20Harvest%20Tycoon!%20Reach%20level%2010%20and%20we%20both%20get%20150%20diamonds.&url=https%3A%2F%2Fwww.harvesttycoon.com%2F%3Finvite%3DTONYAA');
 // How the app reads it (Uri.decode on both parts): split at the first &url=, which an encoded message can never hold.
 const parse=href=>{const rest=href.slice(`${APP_SHARE}?`.length),at=rest.indexOf('&url=');return [decodeURIComponent(rest.slice(0,at)),decodeURIComponent(rest.slice(at+5))];};
 for(const text of ['Tom & Jerry&url=https://evil.example #1 100%','¡Ven a cultivar conmigo! 🌽','تعال وازرع معي','line one\nline two','+ = ? / :'])
  assert.deepEqual(parse(appShareLink(text,link)),[text,link],text);
 // Share my farm's text ends with the link already: the message gives it up, so the shared text has it once.
 const farm=`${link}&src=farm-photo`;
 assert.deepEqual(parse(appShareLink(`Come and see my farm in Harvest Tycoon! Play free with my link: ${farm}`,farm)),['Come and see my farm in Harvest Tycoon! Play free with my link:',farm]);
 assert.deepEqual(parse(appShareLink('Hello','')),['Hello','']);
 const host={location:{href:'https://www.harvesttycoon.com/'}};assert.equal(shareInApp({text:message,url:link},host),true);assert.equal(host.location.href,appShareLink(message,link));
 assert.equal(shareInApp({text:message,url:link},{get location(){throw new Error('x');}}),false);
});

// ---- The pages: the mark before anything is drawn, on every page the app can show ----
test('play.html, the language pages, farm.html and the website\'s wiki load the early mark before any stylesheet; CrazyGames\' page does not',async()=>{
 const before=(html,name)=>{const at=html.indexOf('<script src="/android-app.js"></script>'),sheet=html.indexOf('rel="stylesheet"');assert.ok(at>0&&(sheet<0||at<sheet),`${name}: the mark before the first stylesheet`);return at;};
 const play=read('public/play.html'),farm=read('public/farm.html');
 assert.ok(before(play,'play.html')<play.indexOf('/app-mode.js'));assert.ok(before(farm,'farm.html')<farm.indexOf('/app-mode.js'));
 assert.equal(play.match(/android-app\.js/g).length,1);assert.equal(farm.match(/android-app\.js/g).length,1);
 const sheets=[...farm.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);assert.equal(sheets[sheets.indexOf('/portal.css')+1],'/android.css');assert.equal(sheets.at(-1),'/pwa-layout.css');
 assert.doesNotMatch(read('public/crazygames.html'),/android-app\.js|android\.css/);
 const out=mkdtempSync(join(tmpdir(),'android-app-'));writeFileSync(join(out,'sitemap.xml'),read('public/sitemap.xml'));
 buildLanguagePages(out,play);
 for(const code of READY.filter(code=>code!=='en'))before(readFileSync(join(out,code,'index.html'),'utf8'),`/${code}/`);
 await buildWiki(out);for(const page of ['index',...WIKI_TOPICS.map(t=>t.id)])before(readFileSync(join(out,'wiki',`${page}.html`),'utf8'),`wiki/${page}`);
});
// Every selector of a stylesheet that ends in display:none!important (outside @media), and every selector at all.
const hiddenBy=css=>[...css.replace(/\/\*[^]*?\*\//g,'').replace(/@media[^{]*\{([^{}]*\{[^}]*\})*\s*\}/g,'').matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([,,body])=>/display:none!important/.test(body)).flatMap(([,selectors])=>selectors.split(/,(?![^(]*\))/).map(s=>s.trim()));
const selectorsOf=css=>[...css.replace(/\/\*[^]*?\*\//g,'').replace(/@media[^{]*\{/g,'').matchAll(/([^{}]+)\{[^}]*\}/g)].flatMap(([,selectors])=>selectors.split(/,(?![^(]*\))/).map(s=>s.trim()).filter(Boolean));
test('android.css hides what a Play app may not have or cannot do, only in the app, and leaves everything else',()=>{
 const css=read('public/android.css'),hidden=hiddenBy(css),sources=['public/farm.html','public/boosts-ui.js','public/pass-ui.js','src/starter-pack-ui.js','src/offer-ui.js','public/retention-ui.js','public/wiki-content.js'].map(read).join('\n');
 const gone=['#diamond-store','[data-shop-jump="diamond-store"]','.get-diamonds','#starter-pack-button','#starter-pack-chip','#offer-button','#offer-chip','#shop-offer',
  '#shop-pass','.pass-paid-box:not(.is-owned)','.pass-cell.is-paid.is-locked','#app-settings','#app-fullscreen-row','.wiki-install','.wiki-app-steps','#notify-device','#notify-push-rows','#notify-settings>.install-copy','#gift-remind'];
 for(const selector of gone){
  assert.ok(hidden.includes(`html[data-app=android] ${selector}`),`hidden: ${selector}`);
  const name=selector.match(/[#.]([\w-]+)|"([\w-]+)"/).slice(1).find(Boolean);assert.ok(sources.includes(name),`still in the game: ${name}`);
 }
 // What stays in the app: invites and sharing, email and its reminders, chat, families, the leaderboard, the wiki, cookies, Sign out.
 for(const kept of ['#invite-button','.family-invite-friend','.level-up-share','.farmer-share','#email-button','#email-settings','#notify-settings','#notify-email-rows','.reminder-nudge','#chat-button','#family-button','#leaderboard-button','#help-button','#cookie-settings','#logout-player','.pass-cell','#vip-shop','#boost-catalog','#starter-pack-dialog','#offer-dialog','.payment-dialog'])
  assert.ok(!selectorsOf(css).some(s=>s===`html[data-app=android] ${kept}`),`kept: ${kept}`);
 for(const selector of selectorsOf(css))assert.ok(selector.startsWith('html[data-app=android] '),`only in the app: ${selector}`);
 // A rule with :has() stands alone, so a WebView without it drops only that rule.
 for(const [,selectors] of css.replace(/\/\*[^]*?\*\//g,'').replace(/@media[^{]*\{/g,'').matchAll(/([^{}]+)\{[^}]*\}/g))if(/:has\(/.test(selectors))assert.equal(selectors.split(/,(?![^(]*\))/).length,1,selectors);
 assert.match(css,/#pass-content:has\(\.pass-cell\.is-paid\.is-locked\) :is\(\.pass-heads,\.pass-row\)\{grid-template-columns:34px minmax\(0,1fr\)\}/);
 assert.doesNotMatch(read('public/farm.html'),/data-app=/,'the farm page is only marked by the early script');
});
test('the sign-in card and the website\'s wiki: the same second lock, only in the app',()=>{
 const welcome=read('public/welcome.css'),wiki=read('public/wiki.css');
 for(const selector of ['#social-login','.social-button','.browser-tip'])assert.ok(hiddenBy(welcome).includes(`html[data-app=android] ${selector}`),selector);
 const wikiHidden=hiddenBy(wiki);
 for(const selector of ['.wiki-install','.wiki-page :is(#sec-play-it-as-an-app,#sec-buying-diamonds,#sec-halloween-pass,#sec-your-account,[data-shop-only])'])assert.ok(wikiHidden.includes(`html[data-app=android] ${selector}`),selector);
 assert.ok(wikiHidden.some(s=>['sec-play-it-as-an-app','sec-buying-diamonds','sec-halloween-pass','sec-your-account'].every(id=>s.includes(`[data-wiki-jump="${id}"]`))&&s.includes('[data-wiki-anchor="sec-play-it-as-an-app"]')),'and their chips in the jump bar');
 for(const css of [welcome,wiki])for(const selector of selectorsOf(css).filter(s=>s.includes('[data-app=')))assert.ok(selector.startsWith('html[data-app=android] '),selector);
 // The sections those rules name exist on the website's wiki (their ids come from their titles).
 const site=WIKI_TOPICS.map(t=>wikiArticle(t.id,{now:SEASON_PASS.startsAt+3600000}).html).join('\n');
 for(const id of ['sec-play-it-as-an-app','sec-buying-diamonds','sec-halloween-pass','sec-your-account'])assert.match(site,new RegExp(`id="${id}"`),id);
 // Your account on the website holds only the home screen, full screen and push reminders (the app's own line is in Getting started);
 // the one bought thing in What opens when is the Starter Pack, and it is the one chip marked.
 const account=wikiArticle('account').html.match(/<section class="wiki-section" id="sec-your-account">.*?<\/section>/)[0];
 for(const browserOnly of [/home screen/,/Settings, Farm app/,/Push reminders/])assert.match(account,browserOnly,String(browserOnly));
 assert.equal((account.match(/<li>/g)??[]).length,2,'nothing else would go with it');
 assert.deepEqual([...wikiArticle('quests').html.matchAll(/<span class="wiki-open" data-shop-only>.*?<span>([^<]+)<\/span>/g)].map(m=>m[1]),['Starter Pack']);
});

// ---- Purchases: off in the app at the one place the farm asks (public/portal.js portalOff), plus the bridge (tests/auth-gate.test.mjs) ----
test('payments are off in the app as on CrazyGames; every other feature stays on; the website keeps everything',()=>{
 assert.deepEqual([...APP_OFF],['payments']);
 assert.equal(portalOff('payments',null,true),true);for(const feature of PORTAL_FEATURES.filter(f=>f!=='payments'))assert.equal(portalOff(feature,null,true),false,feature);
 for(const feature of PORTAL_FEATURES)assert.equal(portalOff(feature,null,false),false,feature);
 assert.equal(portalOff('payments'),false,'no window: the website');
 // The shop's own "off" paths (written for CrazyGames) do the rest: no packs asked for, "Get diamonds" says where they are earned.
 assert.match(read('public/boosts-ui.js'),/track\('diamond_shop_view'\);if\(portalOff\('payments'\)\)return;try\{catalog=await bridge\(\)\.payments/);
 assert.match(read('public/boosts-ui.js'),/if\(portalOff\('payments'\)\)\{const tip='Earn diamonds with the daily gift, daily challenges, quests, level-ups and events\.'/);
});
// A stand-in for the farm page, enough for public/pass-ui.js (as tests/season-pass.test.mjs has it).
function passPage(){
 const node=(extra={})=>({hidden:false,textContent:'',dataset:{},...extra});
 const content={html:'',set innerHTML(v){this.html=v;},get innerHTML(){return this.html;},querySelectorAll:()=>[],querySelector:()=>null};
 const dialog=node({open:false,showModal(){this.open=true;},close(){this.open=false;}});
 const nodes={'pass-button':node(),'pass-dot':node(),'pass-dialog':dialog,'pass-content':content,'pass-menu-hint':node()};
 const wallet={after(b){nodes['shop-pass']=b;}};
 const doc={getElementById:id=>nodes[id]??null,querySelectorAll:()=>[],querySelector:sel=>sel==='#boost-dialog .boost-wallet'?wallet:null,createElement:()=>({hidden:false,dataset:{},set innerHTML(v){this.html=v;}})};
 return {doc,nodes,dialog,content};
}
test('the Halloween Pass in the app: the free row and every reward, no buy box, no shop banner and no catalogue; bought on the website, it is there',async()=>{
 const saved={window:globalThis.window,document:globalThis.document};
 const listeners={};globalThis.window=appWindow({addEventListener(name,fn){listeners[name]=fn;},removeEventListener(){}});globalThis.document={querySelectorAll:()=>[]};
 try{
  const t=SEASON_PASS.startsAt-20*86400000,s=createFarm(t-3*86400000);s.xp=xpForLevel(20)+5;normalizeFarm(s,t);
  const asked=[],bridge={payments:async q=>{asked.push(q);return {enabled:true,pass:{cents:499,ready:true}};},checkout:async()=>{asked.push('checkout');}};
  const page=passPage(),ui=createPassUI({state:s,runAction:async()=>{},notify(){},bridge:()=>bridge,doc:page.doc,clock:()=>t});
  assert.equal(page.nodes['pass-button'].hidden,false,'the pass itself stays');assert.equal(page.nodes['shop-pass']?.hidden??true,true,'no banner in the Diamond shop');
  ui.open();await settle();const html=page.content.html;
  assert.deepEqual(asked,[],'nothing about buying is asked');assert.doesNotMatch(html,/pass-paid-box|pass-buy|Unlock the paid rewards|€/);
  assert.equal((html.match(/data-pass-row=/g)??[]).length,SEASON_PASS.tiers.length);assert.match(html,/pass-cell is-free/);
  s.passPremium=[SEASON_PASS.id];normalizeFarm(s,t);ui.refresh();
  assert.match(page.content.html,/<section class="pass-paid-box is-owned">/,'bought on the website: it says so');assert.match(page.content.html,/<b>Paid<\/b>/);assert.doesNotMatch(page.content.html,/pass-buy/);
 }finally{listeners.pagehide?.();globalThis.window=saved.window;globalThis.document=saved.document;if(saved.window===undefined)delete globalThis.window;if(saved.document===undefined)delete globalThis.document;}
});

// ---- Sign-in, the browser tip, notifications, installing ----
test('sign-in in the app: email and password only (Google and Facebook both refuse a WebView); elsewhere as before',()=>{
 assert.deepEqual(usableProviders(['google','facebook'],APP_UA,true),[]);assert.deepEqual(usableProviders(['google'],CHROME_UA,true),[]);
 assert.deepEqual(usableProviders(['google','facebook'],APP_UA,false),['facebook'],'a WebView outside our app: as before');
 assert.deepEqual(usableProviders(['google','facebook'],CHROME_UA),['google','facebook']);
 assert.match(read('src/main.js'),/if\(submitting\|\|!supabase\|\|inApp\)return;const provider=button\.dataset\.provider;/,'no OAuth can start in the app');
});
test('the tip to open the game in Chrome never comes in the app, though its WebView says "; wv)"; elsewhere it still does',()=>{
 const timers=[],win=extra=>({setTimeout:(fn,ms)=>timers.push(ms),navigator:{userAgent:APP_UA},...extra}),storage={get:()=>null,set(){}};
 assert.equal(scheduleBrowserTip({embedded:true,doc:{},win:win(appWindow()),storage}),false);assert.deepEqual(timers,[]);
 assert.equal(scheduleBrowserTip({embedded:true,doc:{},win:win({document:{documentElement:element()}}),storage}),true,'Instagram, Facebook, TikTok: as before');assert.deepEqual(timers,[120000]);
 assert.match(read('src/main.js'),/on=!inApp&&gateApp\(ua\)&&store\.get\(ESCAPE_KEY\)!=='stay'/,'and no browser step on the sign-up card');
});
test('notifications in the app: no device push (no switch, no "Turn on", no browser question); email reminders stay',async()=>{
 const config={enabled:true,push:true,email:true,vapidPublicKey:'AQID'},fetchImpl=async()=>({ok:true,json:async()=>config});
 const app=createNotifications({},{configUrl:'https://x.example/fn?config',fetchImpl,win:appWindow({navigator:{serviceWorker:{}},PushManager:{},Notification:{}})});await app.ready;
 assert.equal(app.available,true);assert.equal(app.config.email,true);assert.equal(app.push,null);
 const site=createNotifications({},{configUrl:'https://x.example/fn?config',fetchImpl,win:{navigator:{serviceWorker:{}},PushManager:{},Notification:{}}});await site.ready;assert.notEqual(site.push,null);
 // Without push the settings show only the email rows and the questions offer the daily email (the code for browsers without push).
 assert.match(read('public/notifications-ui.js'),/const push=Boolean\(bridge\?\.available&&bridge\.config\?\.push&&bridge\.push\)/);
 assert.match(read('public/reminder-nudge.js'),/const push=api\.config\?\.push&&api\.push\?\(await api\.push\.status\(\)\)\.kind:'unsupported';/);
 assert.match(read('public/retention-ui.js'),/if\(!api\.available\|\|!api\.config\?\.push\|\|!api\.push\|\|/);
});
function pwaWindow(extra={}){
 const handlers={},registered=[];
 const win={navigator:{userAgent:APP_UA,serviceWorker:{register:async url=>{registered.push(url);}}},document:{readyState:'complete',fullscreenEnabled:true,documentElement:{requestFullscreen(){},getAttribute:()=>null},addEventListener(){}},isSecureContext:true,dataLayer:[],localStorage:{getItem:()=>'on',setItem(){},removeItem(){}},matchMedia:()=>({matches:false}),addEventListener(name,fn){handlers[name]=fn;},...extra};
 return {win,handlers,registered};
}
test('installing in the app: nothing to install, no install prompt and no full screen; the service worker still runs',async()=>{
 assert.equal(installState({app:true,promptReady:true}).kind,'unsupported');assert.equal(installState({promptReady:true}).kind,'prompt');
 const app=pwaWindow();app.win.document.documentElement.getAttribute=name=>name==='data-app'?'android':null;
 const api=startPwa(app.win);assert.deepEqual(app.registered,['/sw.js'],'the offline page keeps working');
 let prompted=0;app.handlers.beforeinstallprompt({preventDefault(){},prompt(){prompted++;},userChoice:Promise.resolve({outcome:'accepted'})});
 assert.equal(api.state().kind,'unsupported','Settings\' Farm app block stays hidden (public/install-ui.js)');assert.deepEqual(await api.install(),{outcome:'unavailable'});assert.equal(prompted,0);
 assert.equal(api.fullscreen.supported(),false,'no full-screen switch, and a remembered one never comes back');
 const site=pwaWindow({navigator:{userAgent:CHROME_UA,serviceWorker:{register:async()=>{}}}}),web=startPwa(site.win);
 assert.equal(web.fullscreen.supported(),true);site.handlers.beforeinstallprompt({preventDefault(){},prompt(){},userChoice:Promise.resolve({})});assert.equal(web.state().kind,'prompt');
 assert.match(read('public/install-ui.js'),/section\.hidden=state\.kind==='unsupported';/);
});

// ---- Loading tips, admin pop-ups and How to play ----
test('the loading tips leave out only adding the game to the home screen in the app',()=>{
 const app={documentElement:{dataset:{app:'android'}}},tips=portalTips(LOADING_TIPS,app);
 assert.deepEqual([...APP_HIDDEN_TIPS],['farmapp']);assert.equal(tips.length,LOADING_TIPS.length-1);assert.ok(!tips.some(([picture])=>picture==='farmapp'));
 assert.ok(tips.some(([picture])=>picture==='invite-friends'),'inviting and sharing stay');
 assert.equal(portalTips(LOADING_TIPS,{documentElement:{dataset:{}}}),LOADING_TIPS);
 assert.ok(!portalTips(LOADING_TIPS,{documentElement:{dataset:{portal:'crazygames',app:'android'}}}).some(([picture])=>picture==='invite-friends'),'CrazyGames keeps its own list');
});
test('admin pop-ups: the app counts as installed, and a button to installing the web app is left out there',()=>{
 const popup=read('src/popup-ui.js');
 assert.match(popup,/installed:doc\.documentElement\.dataset\.appMode==='standalone'\|\|androidApp\(win\)/);
 assert.match(popup,/&&!\(androidApp\(win\)&&\/\^\(screen:\)\?install\$\/\.test\(popup\.buttonTarget\)\);/);
});
test('How to play in the app: no installing the web app, no buying on our website, no browser notifications; the rest as on the website',()=>{
 const now=SEASON_PASS.startsAt+3600000,text=ctx=>WIKI_TOPICS.map(t=>wikiArticle(t.id,{level:120,now,...ctx}).html).join('\n');
 const app=text({app:true}),site=text({});
 for(const gone of [/Play it as an app/,/Install the app/,/home screen/,/Buying diamonds/,/Stripe;/,/Push reminders/,/€/,/paid rewards open/,/Settings, Farm app/,/Starter Pack/])
  {assert.doesNotMatch(app,gone,String(gone));assert.match(site,gone,`the website keeps ${gone}`);}
 for(const kept of [/Invite a friend/,/Share my farm/,/Confirm your email/,/delete-account/,/Privacy Policy/,/Halloween Pass/,/Boosts/,/VIP/,/Your farm is saved to your account/,/Forgot your password/])assert.match(app,kept,String(kept));
 assert.doesNotMatch(wikiQuick({app:true}),/>App</);assert.match(wikiQuick({}),/>App</);
});
test('the privacy policy lists what the app remembers',()=>{
 assert.match(read('public/privacy.html'),/<code>harvest-tycoon:app<\/code><\/td><td data-label="What it does">In our Android app: remembers that the game runs in the app/);
});

// ---- Sharing in the app: Invite a friend through the app's own share sheet ----
test('Invite a friend in the app: Share opens the app\'s share sheet with the text and the link; a browser keeps navigator.share',async()=>{
 const DATA={link:'https://www.harvesttycoon.com/?invite=TONYAA',rules:{level:10,reward:150,limit:10,days:30},friends:[],earned:0,invitedBy:null};
 const saved={window:globalThis.window,document:globalThis.document};
 const el=(tag='div')=>({tag,hidden:false,dataset:{},html:'',kids:new Map(),set innerHTML(v){this.html=v;this.kids=new Map();},get innerHTML(){return this.html;},setAttribute(){},append(){},addEventListener(){},select(){},showModal(){this.open=true;},close(){this.open=false;},
  querySelector(selector){if(!this.kids.has(selector))this.kids.set(selector,el());return this.kids.get(selector);}});
 async function shareFrom(host){
  const made=[];globalThis.document={createElement:tag=>{const e=el(tag);made.push(e);return e;},body:{append(){}},getElementById:()=>null,querySelectorAll:()=>[]};globalThis.window={parent:host};
  const {createInviteUI}=await import('../public/invite-ui.js');createInviteUI({notify(){}}).open();await settle();
  await made[0].querySelector('#invite-content').querySelector('[data-invite-share]').onclick();
 }
 try{
  const events=[],shared=[],host={document:{documentElement:element({'data-app':'android'})},location:{href:'https://www.harvesttycoon.com/?src=android-app'},
   navigator:{share:async data=>{shared.push(data);}},harvestBridge:{request:async()=>DATA,trackInvite:event=>events.push(event)}};
  await shareFrom(host);
  assert.equal(host.location.href,appShareLink('Come farm with me in Harvest Tycoon! Reach level 10 and we both get 150 diamonds.',DATA.link));
  assert.deepEqual(shared,[]);assert.ok(events.includes('invite_share'));
  const browser={document:{documentElement:element()},location:{href:'https://www.harvesttycoon.com/'},navigator:{share:async data=>{shared.push(data);}},harvestBridge:{request:async()=>DATA,trackInvite(){}}};
  await shareFrom(browser);assert.equal(browser.location.href,'https://www.harvesttycoon.com/');
  assert.deepEqual(shared,[{title:'Harvest Tycoon',text:'Come farm with me in Harvest Tycoon! Reach level 10 and we both get 150 diamonds.',url:DATA.link}]);
 }finally{globalThis.window=saved.window;globalThis.document=saved.document;if(saved.window===undefined)delete globalThis.window;if(saved.document===undefined)delete globalThis.document;}
});
// Google Play asks that an app with accounts lets its players start deleting their account from inside the app (Oct 2026): Settings'
// Privacy links to the website's /delete-account page, for every farmer; CrazyGames (no links to our website) leaves it out.
test('Settings\' Privacy links to deleting the account, except on CrazyGames',()=>{
 const privacy=read('public/farm.html').match(/<section id="privacy-settings"[\s\S]*?<\/section>/)[0];
 assert.match(privacy,/<a id="delete-account-link" class="link-button" href="\/delete-account" target="_blank" rel="noopener">Delete account<\/a>/);
 assert.match(read('public/portal.css'),/html\[data-portal\] #delete-account-link[,{]/);
 assert.doesNotMatch(read('public/android.css'),/delete-account/);
 for(const code of READY)if(code!=='en')assert.ok(JSON.parse(read(`public/i18n/${code}.json`))['Delete account'],code);
});
