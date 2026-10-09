import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createKongregateLink,localStandIn,cleanUser,addressUser,siteLanguage,isGuest,API_SCRIPT,GUEST} from '../src/kongregate-link.js';
import {runKongregatePage,TEXT,KG_KEY,LOCALE_KEY,SOURCE} from '../src/kongregate-page.js';
import {portal as portalAround,portalOff,portalChat,portalLogIn,PORTAL_FEATURES,PRIVACY_URL,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
import {wikiArticle,wikiQuick,WIKI_TOPICS} from '../public/wiki-content.js';
import {createPortalUI} from '../src/portal-ui.js';
import {linkify} from '../src/popup-ui.js';
import {groupPills,groupLine} from '../src/chat-ui.js';
import {portalTips,LOADING_TIPS,PORTAL_HIDDEN_TIPS} from '../public/loading-screen.js';
import {farmPrefetch,prefetchLines,PREFETCH_START,PREFETCH_END} from '../scripts/module-preload.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};

// ---- Oct 2026: the page's side of Kongregate's JavaScript API (src/kongregate-link.js) ----
function kongregateWindow({id=1480702,username='LordSmatchington',token='tok-lord',language='nl',search='',load=true,late=false}={}){
 const state={id,username,token},calls={load:0,get:0,register:0,stats:[]},listeners={};let callback=null;
 const api={services:{getUserId:()=>state.id,getUsername:()=>state.username,getGameAuthToken:()=>state.token,addEventListener:(type,fn)=>{(listeners[type]??=[]).push(fn);},
  showRegistrationBox:()=>{calls.register++;}},stats:{submit:(name,value)=>calls.stats.push([name,value])}};
 const win={location:{search},kongregateAPI:load?{loadAPI(fn){calls.load++;callback=fn;if(!late)fn();},getAPI(){calls.get++;return api;},flashVarsObject:()=>({kongregate_language:language,kongregate_user_id:String(id)})}:undefined};
 const timers={list:[],intervals:[],setTimeout(fn,ms){this.list.push({fn,ms});return this.list.length;},clearTimeout(){},setInterval(fn,ms){this.intervals.push({fn,ms});return 99;},clearInterval(){this.intervals=[];}};
 return {win,state,calls,timers,login(next){Object.assign(state,next);for(const fn of listeners.login??[])fn();},finishLoad:()=>callback?.()};
}
test('the API is loaded once and asked who plays: the id, the name and the token; a guest is id 0',async()=>{
 const k=kongregateWindow(),link=createKongregateLink({win:k.win,timers:k.timers});
 const info=await link.hello();await link.hello();
 assert.deepEqual(info,{api:true,language:'nl',user:{id:'1480702',username:'LordSmatchington',token:'tok-lord'}});
 assert.equal(k.calls.load,1,'loadAPI once per page load (Kongregate\'s rule)');assert.equal(k.calls.get,1);assert.ok(k.win.kongregate?.services,'window.kongregate, as their docs set it');
 assert.ok(link.ready);
 const guest=kongregateWindow({id:0,username:'Guest123',token:'shared-guest-token'}),g=createKongregateLink({win:guest.win,timers:guest.timers});
 assert.deepEqual((await g.hello()).user,{id:GUEST,username:'Guest123',token:''},'a guest has no token of its own (all guests share one)');assert.ok(isGuest((await g.hello()).user));
 for(const [input,id] of [[{id:'12',token:'t'},'12'],[{id:12,token:'t'},'12'],[{id:'0',token:'t'},GUEST],[{id:'12'},GUEST],[{id:'12',token:'a b'},GUEST],[{id:'x',token:'t'},GUEST],[{},GUEST]])assert.equal(cleanUser(input).id,id,JSON.stringify(input));
 assert.equal(siteLanguage({kongregate_language:'PT'}),'pt');assert.equal(siteLanguage({kongregate_language:'x'}),null);assert.equal(siteLanguage(null),null);
});
test('Register opens Kongregate\'s own window only when asked; the initialized statistic is handed to Kongregate',async()=>{
 const k=kongregateWindow({id:0,token:''}),link=createKongregateLink({win:k.win,timers:k.timers});await link.hello();
 assert.equal(k.calls.register,0,'never by itself');
 assert.equal(link.register(),true);assert.equal(k.calls.register,1);
 assert.equal(link.submit('initialized',1),true);assert.deepEqual(k.calls.stats,[['initialized',1]]);
 const none=createKongregateLink({win:{location:{search:''}},timers:k.timers});await none.hello();
 assert.equal(none.register(),false,'no API: nothing to open');assert.equal(none.submit('initialized',1),false);
 const broken=kongregateWindow();broken.win.kongregateAPI.getAPI=()=>{throw new Error('boom');};
 const b=createKongregateLink({win:broken.win,timers:broken.timers});assert.equal((await b.hello()).api,false);assert.equal(b.register(),false);
});
test('a guest who signs in, or another user, is told: by Kongregate\'s login event and by looking every 2 seconds',async()=>{
 const k=kongregateWindow({id:0,token:''}),link=createKongregateLink({win:k.win,timers:k.timers});await link.hello();
 const told=[];link.onChange(user=>told.push(user.id));
 assert.equal(k.timers.intervals[0].ms,2000);
 k.login({id:777,username:'NewFarmer',token:'tok-new'});assert.deepEqual(told,['777'],'the login event, without a reload');
 k.timers.intervals[0].fn();assert.deepEqual(told,['777'],'nothing new: nothing told');
 Object.assign(k.state,{id:888,token:'tok-888'});k.timers.intervals[0].fn();assert.deepEqual(told,['777','888'],'another user, noticed by looking');
 Object.assign(k.state,{id:0,token:''});k.timers.intervals[0].fn();assert.deepEqual(told,['777','888',GUEST],'signed out');
});
test('without the API (blocked) the address Kongregate gave the frame is used; an API that loads late is taken up',async()=>{
 const search='?kongregate_user_id=1480702&kongregate_username=LordSmatchington&kongregate_game_auth_token=tok-lord&kongregate_language=de';
 assert.deepEqual(addressUser(search),{id:'1480702',username:'LordSmatchington',token:'tok-lord'});
 const blocked=kongregateWindow({load:false,search}),link=createKongregateLink({win:blocked.win,timers:blocked.timers});
 assert.deepEqual(await link.hello(),{api:false,language:'de',user:{id:'1480702',username:'LordSmatchington',token:'tok-lord'}});
 const slow=kongregateWindow({late:true,id:555,token:'tok-555'}),s=createKongregateLink({win:slow.win,timers:slow.timers,wait:15000});
 const hello=s.hello();assert.equal(slow.timers.list[0].ms,15000,'15 seconds at most');slow.timers.list[0].fn();
 assert.deepEqual((await hello).user,{id:GUEST,username:'',token:''},'nothing yet: the Register page');
 const told=[];s.onChange(user=>told.push(user.id));slow.finishLoad();assert.deepEqual(told,['555'],'the API came: its player is told');
 const stand=localStandIn({search:'?kongregate_language=ja'});assert.deepEqual(await stand.hello(),{api:false,language:'ja',user:{id:GUEST,username:'',token:''}});assert.equal(stand.register(),false);
});

// ---- The page itself (src/kongregate-page.js): the guest page, the farm of a signed-in player, a sign-in during play ----
function fakePage({user={id:'1480702',username:'LordSmatchington',token:'tok-lord'},language=null,stored={},replies=[],session=null,online=true}={}){
 const els={},el=id=>els[id]??={id,hidden:false,textContent:'',value:0,dataset:{},onclick:null};
 const doc={getElementById:el,documentElement:{classList:{remove(){}}},body:{dataset:{}}};
 const store={data:{...stored},get(key){return this.data[key]??null;},set(key,value){this.data[key]=value;}};
 let current={...user};const changes=[];
 const link={hello:async()=>({api:true,language,user:{...current}}),user:()=>({...current}),registered:0,register(){this.registered++;return true;},stats:[],submit(name,value){this.stats.push([name,value]);return true;},onChange(fn){changes.push(fn);return()=>{};}};
 const auth={session,calls:[],async getSession(){return {data:{session:this.session}};},async verifyOtp(args){this.calls.push(['verifyOtp',args.token_hash]);this.session={access_token:`at:${args.token_hash}`,user:{id:args.token_hash.replace('hash:','')}};return {error:null};},
  async signOut(args){this.calls.push(['signOut',args.scope]);this.session=null;return {};},startAutoRefresh(){}};
 const used=[],sent=[],opened=[],chosen=[],timers={list:[],setTimeout(fn,ms){this.list.push({fn,ms});return this.list.length;},clearTimeout(){}};
 let config=null;
 const fetchImpl=async(url,init)=>{sent.push({url,headers:init.headers,body:JSON.parse(init.body)});const next=replies.shift()??{status:200,data:{token_hash:'hash:player-a',player_id:'player-a'}};if(next.throw)throw new TypeError('offline');return new Response(JSON.stringify(next.data??{}),{status:next.status??200});};
 const createFarmSession=options=>{config=options;return {open:async()=>{opened.push(auth.session?.user?.id??null);},dispose(){},listen(){}};};
 const run=()=>runKongregatePage({link,doc,win:{location:{reload(){}}},nav:{onLine:online},timers,store,portalClient:key=>{assert.equal(key,KG_KEY);return {auth};},setClient:client=>used.push(client),
  functionsUrl:'https://x.supabase.co/functions/v1',supabaseKey:'anon',isConfigured:true,fetchImpl,createFarmSession,chooseLanguage:code=>chosen.push(code),chosenLanguage:()=>'en'});
 return {run,els,el,link,auth,sent,opened,used,chosen,store,timers,get config(){return config;},setUser(next){current={...next};},tell(next){current={...next};for(const fn of changes)fn({...current});}};
}
test('a guest sees the Register page (never a farm, never a server call); Register opens Kongregate\'s window; initialized is sent first',async()=>{
 const p=fakePage({user:{id:GUEST,username:'Guest1',token:''},session:{access_token:'old',user:{id:'someone-before'}}});
 await p.run();
 assert.deepEqual(p.link.stats,[['initialized',1]],'on every load, before anything else');
 assert.equal(p.el('guest-screen').hidden,false);assert.equal(p.el('farm-host').hidden,true);assert.equal(p.el('loading-screen').hidden,true);assert.equal(p.el('pause-screen').hidden,true);
 assert.equal(p.sent.length,0,'no account for a guest');assert.deepEqual(p.opened,[]);
 assert.deepEqual(p.auth.calls,[['signOut','local']],'no farm of whoever played before on this device');
 assert.equal(p.link.registered,0,'the window never opens by itself');p.el('guest-register').onclick();assert.equal(p.link.registered,1);assert.equal(p.el('guest-status').textContent,'');
 assert.equal(p.el('guest-contact').textContent,`Questions about your privacy? Email ${PRIVACY_CONTACT}.`);
 p.link.register=()=>false;p.el('guest-register').onclick();assert.equal(p.el('guest-status').textContent,TEXT.noRegister,'no API: a line says so');
});
test('a player signed in to Kongregate: the id and token to our server (never in an address), a way in, the farm opens',async()=>{
 const p=fakePage();await p.run();
 assert.equal(p.sent.length,1);const [ask]=p.sent;
 assert.equal(ask.url,'https://x.supabase.co/functions/v1/kongregate-auth?forceFunctionRegion=eu-central-1','in Frankfurt, as farm-api');
 assert.deepEqual(ask.body,{op:'kongregate',user_id:'1480702',game_auth_token:'tok-lord',language:'en'});assert.equal(ask.headers.authorization,undefined,'no session yet');
 assert.doesNotMatch(ask.url,/tok-lord|1480702/,'the token only in the body');
 assert.deepEqual(p.auth.calls,[['verifyOtp','hash:player-a']]);assert.equal(p.used.length,1);assert.deepEqual(p.opened,['player-a']);
 assert.equal(p.el('guest-screen').hidden,true);assert.equal(p.el('loading-copy').textContent,'Checking your account…');
 // The farm session: the website's own, with the portal and its source; no Sign out.
 const bridge={signOut(){throw new Error('no');}};p.config.extend(bridge);assert.equal(bridge.portal.name,'kongregate');assert.doesNotThrow(()=>bridge.signOut());
 assert.deepEqual(p.config.firstLoad(),{source:{src:'kongregate',ref:'kongregate.com'}});assert.deepEqual(SOURCE,{src:'kongregate',ref:'kongregate.com'});
 // The next start on this device: the session is sent along, and the server says it is this player's already.
 const again=fakePage({session:{access_token:'at-a',user:{id:'player-a'}},replies:[{status:200,data:{ok:true,player_id:'player-a'}}]});await again.run();
 assert.equal(again.sent[0].headers.authorization,'Bearer at-a');assert.deepEqual(again.auth.calls,[],'no new sign-in');assert.deepEqual(again.opened,['player-a']);
});
test('a guest who signs in gets their farm at once; another user switches over; the same player told twice changes nothing',async()=>{
 const p=fakePage({user:{id:GUEST,username:'Guest1',token:''},replies:[{status:200,data:{token_hash:'hash:player-a',player_id:'player-a'}},{status:200,data:{token_hash:'hash:player-b',player_id:'player-b'}}]});
 await p.run();assert.equal(p.el('guest-screen').hidden,false);
 p.tell({id:'1480702',username:'LordSmatchington',token:'tok-lord'});await settle();
 assert.equal(p.sent.length,1);assert.equal(p.sent[0].body.user_id,'1480702');assert.deepEqual(p.opened,['player-a'],'Kongregate\'s login event: the farm');
 p.tell({id:'1480702',username:'LordSmatchington',token:'tok-lord'});await settle();assert.equal(p.sent.length,1,'the same player: no reload');
 p.tell({id:'555',username:'Other',token:'tok-555'});await settle();
 assert.equal(p.sent.length,2);assert.deepEqual(p.sent[1].body,{op:'kongregate',user_id:'555',game_auth_token:'tok-555',language:'en'});
 assert.equal(p.sent[1].headers.authorization,'Bearer at:hash:player-a','the old session goes along: the server answers with the new player\'s way in');
 assert.deepEqual(p.opened,['player-a','player-b'],'never the other player\'s farm');
 p.tell({id:GUEST,username:'Guest2',token:''});await settle();assert.equal(p.el('guest-screen').hidden,false,'signed out on Kongregate: the Register page again');
 assert.ok(p.auth.calls.some(([name])=>name==='signOut'));
});
test('a refused sign-in, too many at once and a server that is away: the pause card in the game\'s words, away tries again by itself',async()=>{
 for(const [status,text] of [[401,TEXT.refused],[429,TEXT.busy],[400,TEXT.failed]]){
  const p=fakePage({replies:[{status,data:{error:'English from the server'}}]});await p.run();
  assert.equal(p.el('pause-screen').hidden,false,String(status));assert.equal(p.el('pause-copy').textContent,text,String(status));assert.equal(p.el('pause-message').textContent,'');assert.deepEqual(p.opened,[]);
 }
 for(const reply of [{status:503,data:{error:'Kongregate could not be reached. Please try again.'}},{throw:true}]){
  const p=fakePage({replies:[reply]});await p.run();
  assert.equal(p.el('pause-copy').textContent,TEXT.away);assert.equal(p.el('pause-message').textContent,'We are trying again automatically.');
  assert.equal(p.timers.list.at(-1).ms,8000,'8 s, then longer each time');
  p.timers.list.at(-1).fn();await settle();assert.deepEqual(p.opened,['player-a'],'tried again: in');
 }
 const retry=fakePage({replies:[{status:401}]});await retry.run();retry.el('pause-retry').onclick();await settle();assert.deepEqual(retry.opened,['player-a'],'Try again');
});
test('the language comes from Kongregate\'s site when the game speaks it, else English; a choice in Settings stays',async()=>{
 const nl=fakePage({language:'nl'});await nl.run();assert.deepEqual(nl.chosen,['nl']);assert.equal(nl.store.data[LOCALE_KEY],'nl');
 const kept=fakePage({language:'nl',stored:{[LOCALE_KEY]:'nl'}});await kept.run();assert.deepEqual(kept.chosen,[],'the same as last time: Settings wins');
 const other=fakePage({language:'it'});await other.run();assert.deepEqual(other.chosen,['en'],'not translated: English');
 const none=fakePage({language:null});await none.run();assert.deepEqual(none.chosen,[]);
});

// ---- The portal: everything Kongregate does not allow is off, and no link leaves the game but the privacy policy ----
const KONG={name:'kongregate',guest:false,features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false])),settings:{muteAudio:false,disableChat:false},userAvailable:true,privacyContact:PRIVACY_CONTACT};
test('the portal object the page hands the game: every feature off, a signed-in player, the chat on, the privacy contact',async()=>{
 const p=fakePage();const {portal}=await p.run();
 assert.equal(portal.name,'kongregate');assert.deepEqual(Object.keys(portal.features),PORTAL_FEATURES);assert.ok(Object.values(portal.features).every(on=>on===false));
 assert.deepEqual(PORTAL_FEATURES,['payments','invite','share','email','reminders','app','signOut','cookies','translate','links'],'payments and the shop, invites, sharing, email, reminders, the app and its badge, Sign out, the cookie banner, Google Translate and links out');
 assert.equal(portal.guest,false);assert.equal(portal.privacyContact,'info@harvesttycoon.com');
 for(const feature of PORTAL_FEATURES)assert.equal(portalOff(feature,portal),true,feature);
 assert.equal(portalChat(portal),'on','the chat for players signed in to Kongregate, as for CrazyGames\' logged-in players');assert.equal(portalLogIn(portal),true);
 assert.equal(portalAround({parent:{harvestPortal:portal}}),portal);
});
test('the wiki on Kongregate: no buying, inviting, app, email or reminders; its own lines; only the privacy policy as a link out',()=>{
 const ctx={level:120,portal:'kongregate',href:id=>`#wiki-${id}`},html=WIKI_TOPICS.map(t=>wikiArticle(t.id,ctx).html).join('\n');
 for(const gone of [/Buying diamonds/,/Play it as an app/,/Install the app/,/Invite a friend/,/Confirm your email/,/Share my farm/,/delete-account/,/Stripe;/,/Reminders/,/Forgot your password/,/home screen/,/CrazyGames/,/As a guest/,/Starter Pack/])assert.doesNotMatch(html,gone,String(gone));
 assert.match(html,/Your farm on Kongregate/);assert.match(html,/Your farm is saved on our server with your Kongregate account/);
 assert.match(html,/Questions about your privacy\? Email info@harvesttycoon\.com\./);
 const links=[...html.matchAll(/href="([^"]*)"/g)].map(m=>m[1]);
 assert.ok(links.length>10);assert.deepEqual([...new Set(links.filter(href=>!href.startsWith('#')))],[PRIVACY_URL],'the in-game wiki links stay in the game; the policy is the one link out');
 assert.doesNotMatch(html,/mailto:/,'the address is written out, not a link');
 assert.doesNotMatch(wikiQuick({portal:'kongregate'}),/>App</);
 // CrazyGames keeps its own lines.
 const cg=WIKI_TOPICS.map(t=>wikiArticle(t.id,{level:120,portal:true}).html).join('\n');assert.match(cg,/Your farm on CrazyGames/);assert.doesNotMatch(cg,/Kongregate|Questions about your privacy/);
 // Nothing is sold on either: What opens when has no Starter Pack there (the website's wiki keeps it).
 assert.doesNotMatch(cg,/Starter Pack/);assert.match(wikiArticle('quests',{level:120,href:id=>`#wiki-${id}`}).html,/<span>Starter Pack<\/span>/);
 assert.ok(portalTips(LOADING_TIPS,{documentElement:{dataset:{portal:'kongregate'}}}).every(([picture])=>!PORTAL_HIDDEN_TIPS.includes(picture)),'no tips about inviting or the app');
});
test('no address out of the game in Kongregate mode: popups and staff messages plain, Settings › Privacy only the policy and the contact',()=>{
 const saved=globalThis.window;globalThis.window={parent:{harvestPortal:KONG}};
 try{
  assert.equal(linkify('See https://www.harvesttycoon.com/partners'),'See https://www.harvesttycoon.com/partners','a web address stays words');
  assert.equal(portalOff('links'),true);assert.equal(portalOff('translate'),true);assert.equal(portalOff('app'),true);assert.equal(portalOff('payments'),true);
  // A group message for the browser, or one that leaves an app out, reaches Kongregate players too: no pill names our apps there.
  const sent=groupLine({meta:{group:{filters:{platform:'browser',notPlatform:'android',minLevel:20}}}});
  assert.doesNotMatch(sent,/Android|iPhone/);assert.match(sent,/Plays in the browser/);assert.match(sent,/From level 20/);
  assert.doesNotMatch(groupLine({meta:{group:{filters:{notPlatform:'ios'}}}}),/Sent to/,'nothing left to say who it went to');
 }finally{if(saved===undefined)delete globalThis.window;else globalThis.window=saved;}
 // Settings › Privacy: the cookie button, Contact support and Delete account go; the policy (our full address) and who to ask come in.
 const nodes=[],make=tag=>{const n={tag,className:'',textContent:'',innerHTML:'',children:[],append(c){this.children.push(c);},prepend(c){this.children.unshift(c);},remove(){n.removed=true;}};nodes.push(n);return n;};
 const oldCopy=make('p'),actions=make('div'),danger=make('div'),privacyLink={href:'/privacy'},privacy=make('section');
 privacy.querySelectorAll=()=>[oldCopy,actions,danger];
 const doc={documentElement:{dataset:{}},querySelector:()=>null,querySelectorAll:sel=>sel==='a[href="/privacy"]'?[privacyLink]:[],getElementById:id=>id==='privacy-settings'?privacy:null,createElement:make};
 createPortalUI({portal:KONG,doc});
 assert.equal(doc.documentElement.dataset.portal,'kongregate');assert.ok(oldCopy.removed&&actions.removed&&danger.removed,'Cookie settings, Contact support and Delete account are gone');
 assert.equal(privacy.children.length,2);assert.match(privacy.children[0].innerHTML,/^By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.$/);
 assert.equal(privacy.children[1].textContent,privacyContact());assert.equal(privacy.children[1].innerHTML,'','the contact is text, not a link');
 assert.equal(privacyLink.href,PRIVACY_URL);
 // Every way out of the game the code has is behind a portal check (the same as on CrazyGames).
 assert.match(read('src/popup-ui.js'),/export const linkify=text=>portalOff\('links'\)\?esc\(text\):/);
 assert.match(read('src/popup-ui.js'),/const offered=button&&!\(portalOff\('links'\)&&/);
 assert.match(read('src/chat-ui.js'),/if\(key==='translate'\)\{if\(!portalOff\('translate'\)\)win\.open/);
 assert.match(read('src/chat-ui.js'),/part\.app\?\(portalOff\('app'\)\?`<span translate="no">/);
 assert.match(read('src/chat-ui.js'),/if\(portalOff\('app'\)\)\{showCenterNotice\(dialog,bridge\.portal\?\.name==='kongregate'\?'The app is not available on Kongregate\.'/);
 assert.match(read('public/farm-share.js'),/!portalOff\('share'\)/);assert.match(read('src/game-cloud.js'),/if\(!portal\)void loadStaff/,'no Copy link for the staff there');
 assert.match(read('src/game-cloud.js'),/const shop=!portal;/,'no payment return, special offer or Starter Pack');
 assert.match(read('public/wiki-ui.js'),/if\(portal\(\)\)return;/);
 // No number on an app icon there: there is no app of ours (public/app-badge.js).
 return (async()=>{
  const set=[],frame={navigator:{setAppBadge:async n=>set.push(n)},caches:null,parent:{harvestBridge:{portal:KONG}}};
  const {setAppBadge}=await import('../public/app-badge.js');await setAppBadge(3,frame);assert.deepEqual(set,[]);
  const site={navigator:{setAppBadge:async n=>set.push(n)},caches:null,parent:{harvestBridge:{}}};await setAppBadge(2,site);assert.deepEqual(set,[2],'the website as before');
  const cg={navigator:{setAppBadge:async n=>set.push(n)},caches:null,parent:{harvestBridge:{portal:{name:'crazygames'}}}};await setAppBadge(4,cg);assert.deepEqual(set,[2,4],'CrazyGames\' farm frame keeps its own number, as before Kongregate');
  // The admin's group messages can go to Kongregate players only, and they read it.
  assert.deepEqual(groupPills({kongregate:true}),['Plays on Kongregate']);
  // On the website every pill stays.
  assert.match(groupLine({meta:{group:{filters:{notPlatform:'android'}}}}),/Not in the Android app/);
 })();
});

// ---- The page, its headers and its build ----
test('kongregate.html: Kongregate\'s API script once, the loading screen, the Register page; no tracking, banner, sign-in, links or app',()=>{
 const html=read('public/kongregate.html');
 for(const banned of [/googletagmanager|GTM-|dataLayer|gtag\(/,/cookie-consent|harvestConsent|Cookie settings/,/account-card|account-form|type="email"|type="password"|Create account|social-login|data-provider/,/<footer|site-legal|footer-social/,/rel="manifest"|apple-touch|apple-mobile-web-app|mobile-web-app-capable/,/og:|twitter:|rel="canonical"|ld\+json/,/browser-gate|data-gate/,/\/partners|\/wiki"|facebook\.com|tiktok\.com|instagram\.com|crazygames/i,/cloud\/cloud\.js|i18n-boot\.js/,/mailto:/])assert.doesNotMatch(html.replace(/<!--[^]*?-->/g,''),banned,String(banned));
 assert.match(html,/<html lang="en" data-portal="kongregate" class="i18n-wait">/);assert.match(html,/<meta name="robots" content="noindex, nofollow">/);assert.match(html,/<meta name="harvest-version" content="dev">/);
 assert.match(html,/<meta name="referrer" content="strict-origin">/,'Kongregate may put the sign-in in the address: only our own address goes along');
 assert.equal(API_SCRIPT,'https://cdn1.kongregate.com/javascripts/kongregate_api.js');
 assert.equal(html.split(API_SCRIPT).length-1,1,'loaded once');assert.ok(html.indexOf(`<script>if(window.parent!==window)document.write('<script src="${API_SCRIPT}"><\\/script>');</script>`)>0&&html.indexOf(API_SCRIPT)<html.indexOf('</head>'),'in the head, as their docs ask, and only inside a frame: a direct visit never runs it on our own site');
 assert.ok(html.indexOf(API_SCRIPT)<html.indexOf('<script type="module" src="/cloud/kongregate.js"></script>'));
 const code=html.replace(/<!--[^]*?-->/g,'');
 assert.deepEqual([...new Set([...code.matchAll(/https?:\/\/[^\s'"`)<,]+/g)].map(m=>m[0]))].sort(),[API_SCRIPT,'https://jnmdirvidffzxukbdmij.supabase.co',PRIVACY_URL].sort(),'no address besides Kongregate\'s API, our database and the privacy policy');
 assert.deepEqual([...code.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]),[PRIVACY_URL,PRIVACY_URL],'one link: the privacy policy, on the loading screen and the Register page');
 for(const id of ['loading-screen','loading-copy','loading-progress','loading-percent','loading-tip-text','loading-tip-icon','guest-screen','guest-title','guest-register','guest-status','guest-contact','farm-host','pause-screen','pause-copy','pause-message','pause-retry'])assert.match(html,new RegExp(`id="${id}"`),id);
 assert.match(html,/<button type="button" id="guest-register" class="kong-register">Register or sign in<\/button>/,'the checklist\'s Register button');
 assert.match(html,/<section id="guest-screen" class="loading-screen farm-loading kong-guest" aria-labelledby="guest-title" hidden>/,'the painted farm and the logo, as the loading screen');
 assert.match(html,/<p class="portal-privacy">By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.<\/p>/);
 assert.equal(read('public/crazygames.html').match(/<section id="loading-screen"[^]*?<\/section>/)[0],html.match(/<section id="loading-screen"[^]*?<\/section>/)[0],'the same loading screen as on CrazyGames');
 const css=read('public/kongregate.css');assert.match(css,/user-select:none/);assert.match(css,/background:#fbf8f3/);assert.match(css,/background:#3f8a4a/,'the game\'s green main button');
 assert.doesNotMatch(read('public/sitemap.xml'),/kongregate/);
 // Kongregate's frame is 1024 to 1100 px wide: on a computer that narrow the level card gives way, so How to play never runs out of it.
 const narrow=read('public/portal.css').match(/@media\(min-width:901px\) and \(max-width:1150px\)\{([^]*?)\n\}/)?.[1]??'';
 for(const rule of ['html[data-portal] .topbar .level-card{flex:0 1 auto;min-width:0}','html[data-portal] .topbar #xp-text{flex-shrink:100}','html[data-portal] .topbar .resources{flex:none}'])assert.ok(narrow.includes(rule),rule);
 // The farm downloads meanwhile, the same list as on CrazyGames.
 const block=html.slice(html.indexOf(PREFETCH_START)+PREFETCH_START.length,html.indexOf(PREFETCH_END)).trim();
 assert.equal(block,prefetchLines(farmPrefetch(read('public/farm.html'))),'run node scripts/module-preload.mjs');
});
test('src/kongregate.js: only on Kongregate (on its own our address sends the visitor to the website), never Kongregate\'s own page, no trackers',()=>{
 const js=read('src/kongregate.js'),page=read('src/kongregate-page.js');
 assert.match(js,/if\(!framed&&!local\)location\.replace\('\/'\);/);
 assert.match(js,/link:framed\?createKongregateLink\(\{win:window\}\):localStandIn\(\{search:location\.search\}\)/);
 for(const source of [js,page,read('src/kongregate-link.js')]){
  assert.doesNotMatch(source,/window\.top|top\.location/,'never Kongregate\'s own page');
  assert.doesNotMatch(source,/trackCommerce|trackInvite|pushEvent|dataLayer|gtag|fbq|ttq/,'no trackers');
 }
 assert.doesNotMatch(page,/paymentRequest|createNotifications/,'no purchases or reminders in this session');
 assert.match(page,/await askServer\(\{op:'kongregate',user_id:user\.id,game_auth_token:user\.token,language:chosenLanguage\(\)\},now\?\.access_token\)/);
 assert.match(page,/verifyOtp\(\{token_hash:reply\.token_hash,type:'magiclink'\}\)/);
 assert.equal((page.match(/link\.register\(\)/g)??[]).length,2,'only from a tap: the Register button, and the portal\'s log-in (never asked for: no guests in the farm)');
});
test('the headers: only Kongregate may frame the page, no search engine, revalidated; built and stamped like the CrazyGames page',()=>{
 const rules=JSON.parse(read('vercel.json')).headers,rule=rules.find(r=>r.source==='/kongregate.html'),get=key=>rule.headers.find(h=>h.key===key)?.value;
 assert.equal(get('Content-Security-Policy'),'frame-ancestors https://www.kongregate.com https://*.kongregate.com https://*.konggames.com');
 assert.equal(get('X-Robots-Tag'),'noindex, nofollow');assert.equal(get('Cache-Control'),'no-cache');assert.equal(rule.headers.length,3);
 const build=read('scripts/build-static.mjs');
 assert.match(build,/readFileSync\('public\/kongregate\.html','utf8'\)\.replace\('<meta name="harvest-version" content="dev">'/);assert.match(build,/writeFileSync\('dist-static\/kongregate\.html',kong\)/);
 assert.match(read('scripts/build-cloud.mjs'),/outDir:'public\/cloud',emptyOutDir:false,lib:\{entry:\{kongregate:'src\/kongregate\.js'\}/,'its own build, sharing no file');
 assert.match(read('scripts/i18n-extract.mjs'),/'public\/kongregate\.html'/,'its words are translated with the game');
 assert.match(read('scripts/module-preload.mjs'),/writeFileSync\(KONG,withPrefetch\(readFileSync\(KONG,'utf8'\),prefetch,'public\/kongregate\.html'\)\);/);
 assert.doesNotMatch(read('package.json').match(/"build:static": "[^"]*"/)[0],/kongregate/,'nothing to upload: Kongregate frames the live page');
});
