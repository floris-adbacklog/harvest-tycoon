import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDiscordLink,localStandIn,clientIdOf,inDiscord,SCOPE} from '../src/discord-link.js';
import {runDiscordPage,TEXT,DC_KEY,LOCALE_KEY,SOURCE,MAX_WAIT} from '../src/discord-page.js';
import {portal as portalAround,portalOff,portalChat,portalLogIn,PORTAL_FEATURES,PRIVACY_URL,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
import {farmPrefetch,prefetchLines,PREFETCH_START,PREFETCH_END} from '../scripts/module-preload.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const noComments=html=>html.replace(/<!--[^]*?-->/g,'');

// ---- Oct 2026: the page's side of Discord's Embedded App SDK (src/discord-link.js), with a stand-in for the SDK ----
const CLIENT='1290012345678901234',HOST=`${CLIENT}.discordsays.com`,SEARCH='?instance_id=i-1-gc-2-3&location_id=gc-2-3&launch_id=l-1&frame_id=f-1&platform=desktop';
function fakeSdk({answers=[],ready=true,broken=false}={}){
 const made=[],calls={authorize:[],links:[]};let release=()=>{};
 const readyPromise=ready?Promise.resolve():new Promise(resolve=>{release=resolve;});
 class SDK{
  constructor(id,config){if(broken)throw new Error('instance_id query param is not defined');made.push({id,config});
   this.commands={
    authorize:async args=>{calls.authorize.push(args);const next=answers.shift()??{code:`code-${calls.authorize.length}`};if(next.reject)throw next.reject;return next;},
    openExternalLink:async args=>{calls.links.push(args);return {opened:true};}
   };}
  ready(){return readyPromise;}
 }
 return {SDK,made,calls,release:()=>release()};
}
const fakeTimers=()=>({list:[],setTimeout(fn,ms){this.list.push({fn,ms});return this.list.length;},clearTimeout(){}});
const discordWin=({hostname=HOST,search=SEARCH}={})=>({location:{hostname,search}});

test('outside Discord no SDK is made: the client id comes from Discord\'s address, and Discord\'s frame_id must be there',async()=>{
 assert.equal(clientIdOf(HOST),CLIENT);assert.equal(clientIdOf(HOST.toUpperCase()),CLIENT);
 for(const host of ['www.harvesttycoon.com','localhost','123.discordsays.com',`${CLIENT}.discordsays.com.example.com`,`x.${CLIENT}.discordsays.com`,`${CLIENT}0000.discordsays.com`,'',null])assert.equal(clientIdOf(host),null,String(host));
 assert.equal(inDiscord({hostname:HOST,search:SEARCH}),true);
 assert.equal(inDiscord({hostname:HOST,search:'?instance_id=i-1'}),false,'no frame_id: not Discord\'s frame');
 assert.equal(inDiscord({hostname:'www.harvesttycoon.com',search:SEARCH}),false,'our own address, whatever its query says');
 assert.equal(inDiscord({hostname:'localhost',search:SEARCH}),false);assert.equal(inDiscord(),false);
 for(const win of [discordWin({hostname:'www.harvesttycoon.com'}),discordWin({search:''}),{location:{hostname:'localhost',search:SEARCH}}]){
  const sdk=fakeSdk(),link=createDiscordLink({win,SDK:sdk.SDK,timers:fakeTimers()});
  assert.deepEqual(await link.hello(),{code:null,reason:'unready'});assert.deepEqual(sdk.made,[],'never constructed');
  assert.equal(link.openLink(PRIVACY_URL),false,'no Discord: the link opens as a link');assert.equal(link.ready,false);
 }
 assert.deepEqual(SCOPE,['identify'],'who plays, nothing more');
});
test('inside Discord: the SDK once, its logs kept to itself, then authorize for identify only; a new code on each later ask',async()=>{
 const sdk=fakeSdk(),link=createDiscordLink({win:discordWin(),SDK:sdk.SDK,timers:fakeTimers()});
 const first=await link.hello();assert.deepEqual(await link.hello(),first,'hello once per page load');
 assert.deepEqual(first,{code:'code-1'});assert.ok(link.ready);
 assert.deepEqual(sdk.made,[{id:CLIENT,config:{disableConsoleLogOverride:true}}],'the game\'s console stays out of Discord');
 assert.deepEqual(sdk.calls.authorize,[{client_id:CLIENT,response_type:'code',state:'',prompt:'none',scope:['identify']}]);
 assert.deepEqual(await link.authorize(),{code:'code-2'},'a code is good for one sign-in: a new start asks again');
 assert.equal(sdk.made.length,1);assert.equal(sdk.calls.authorize.length,2);
});
test('a no in Discord\'s window is "declined", and Discord is asked again only when the page asks (the player\'s tap)',async()=>{
 const sdk=fakeSdk({answers:[{reject:{code:5000,message:'User closed the window'}},{code:'code-yes'},{}]}),link=createDiscordLink({win:discordWin(),SDK:sdk.SDK,timers:fakeTimers()});
 assert.deepEqual(await link.hello(),{code:null,reason:'declined'});await settle();
 assert.equal(sdk.calls.authorize.length,1,'never by itself');
 assert.deepEqual(await link.authorize(),{code:'code-yes'});
 assert.deepEqual(await link.authorize(),{code:null,reason:'declined'},'an answer without a code is a no too');
});
test('Discord that does not answer: unready after 15 seconds, and taken up when it comes; an SDK that cannot start is unready',async()=>{
 const sdk=fakeSdk({ready:false}),timers=fakeTimers(),link=createDiscordLink({win:discordWin(),SDK:sdk.SDK,timers});
 const hello=link.hello();await settle();
 assert.equal(timers.list[0].ms,15000,'15 seconds at most');timers.list[0].fn();
 assert.deepEqual(await hello,{code:null,reason:'unready'});assert.deepEqual(sdk.calls.authorize,[]);
 sdk.release();await settle();assert.ok(link.ready);
 assert.deepEqual(await link.authorize(),{code:'code-1'});assert.equal(sdk.made.length,1,'the same SDK');
 const broken=fakeSdk({broken:true}),b=createDiscordLink({win:discordWin(),SDK:broken.SDK,timers:fakeTimers()});
 assert.deepEqual(await b.hello(),{code:null,reason:'unready'});assert.equal(b.openLink(PRIVACY_URL),false);
});
test('links out: only the privacy policy, in Discord\'s own window; the stand-in on our own computer opens nothing itself',async()=>{
 const sdk=fakeSdk(),link=createDiscordLink({win:discordWin(),SDK:sdk.SDK,timers:fakeTimers()});await link.hello();
 for(const url of ['https://www.harvesttycoon.com/','https://example.com/privacy','https://www.harvesttycoon.com/privacy?x=1','/privacy'])assert.equal(link.openLink(url),false,url);
 assert.equal(link.openLink(PRIVACY_URL),true);await settle();
 assert.deepEqual(sdk.calls.links,[{url:PRIVACY_URL}],'Discord asks the player before it opens a site');
 const stand=localStandIn({search:''});assert.deepEqual(await stand.hello(),{code:null,reason:'declined'},'the Authorize card');assert.equal(stand.openLink(PRIVACY_URL),false);
 assert.deepEqual(await localStandIn({search:'?discord_code=abc'}).hello(),{code:'abc'});
});

// ---- The page itself (src/discord-page.js): a player who says yes, a player who says no, a start that goes wrong ----
function fakePage({answers=[],stored={},replies=[],session=null,online=true,configured=true,events=[]}={}){
 const els={},el=id=>els[id]??={id,hidden:false,textContent:'',value:0,dataset:{},disabled:false,listeners:{},
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},click(){return Promise.all((this.listeners.click??[]).map(fn=>fn({})));}};
 const docListeners={};
 const doc={getElementById:el,documentElement:{classList:{remove(){}}},body:{dataset:{}},addEventListener(type,fn){(docListeners[type]??=[]).push(fn);}};
 const store={data:{...stored},get(key){return this.data[key]??null;},set(key,value){this.data[key]=value;}};
 const link={asked:0,answers:[...answers],opened:[],openLinkResult:true,hello(){return this.first??=this.authorize();},
  async authorize(){this.asked++;return this.answers.shift()??{code:`code-${this.asked}`};},openLink(url){this.opened.push(url);return this.openLinkResult;}};
 const auth={session,calls:[],async getSession(){return {data:{session:this.session}};},
  async verifyOtp(args){this.calls.push(['verifyOtp',args.token_hash]);if(this.fail){const error=this.fail;this.fail=null;return {error};}this.session={access_token:`at:${args.token_hash}`,user:{id:args.token_hash.replace('hash:','')}};return {error:null};},
  async signOut(args){this.calls.push(['signOut',args.scope]);this.session=null;return {};},startAutoRefresh(){}};
 const used=[],sent=[],opened=[],chosen=[],timers=fakeTimers();
 let config=null,reopen=null,translations=0,update=null;
 const fetchImpl=async(url,init)=>{sent.push({url,headers:init.headers,body:JSON.parse(init.body)});const next=replies.shift()??{status:200,data:{token_hash:'hash:player-a',player_id:'player-a'}};if(next.throw)throw new TypeError('offline');
  return new Response(JSON.stringify(next.data??{}),{status:next.status??200,headers:next.headers??{}});};
 const createFarmSession=options=>{config=options;return {open:async()=>{events.push('open');opened.push(auth.session?.user?.id??null);},dispose(){},listen(hooks){reopen=hooks.reopen;}};};
 const run=()=>runDiscordPage({link,doc,win:{location:{reload(){}}},nav:{onLine:online},timers,store,portalClient:key=>{assert.equal(key,DC_KEY);return {auth};},setClient:client=>used.push(client),
  functionsUrl:'https://x.supabase.co/functions/v1',supabaseKey:'anon',isConfigured:configured,fetchImpl,createFarmSession,
  chooseLanguage:code=>{events.push(`language ${code}`);chosen.push(code);},chosenLanguage:()=>'en',startTranslation:()=>{translations++;},startUpdateCheck:options=>{update=options;}});
 const tap=event=>{for(const fn of docListeners.click??[])fn(event);};
 return {run,els,el,link,auth,sent,opened,used,chosen,store,timers,events,tap,get config(){return config;},reopen:()=>reopen(),get translations(){return translations;},get update(){return update;}};
}
const retryTimers=p=>p.timers.list.filter(t=>t.ms!==3000);
test('a player who says yes: the code to our server (never in an address), a way in, the farm opens',async()=>{
 const p=fakePage();await p.run();
 assert.equal(p.sent.length,1);const [ask]=p.sent;
 assert.equal(ask.url,'https://x.supabase.co/functions/v1/discord-auth?forceFunctionRegion=eu-central-1','in Frankfurt, as farm-api');
 assert.deepEqual(ask.body,{op:'discord',code:'code-1',language:'en'});assert.equal(ask.headers.apikey,'anon');assert.equal(ask.headers.authorization,undefined,'no session yet');
 assert.doesNotMatch(ask.url,/code-1/,'the code only in the body');
 assert.deepEqual(p.auth.calls,[['verifyOtp','hash:player-a']]);assert.equal(p.used.length,1);assert.deepEqual(p.opened,['player-a']);
 assert.equal(p.el('authorize-screen').hidden,true);assert.equal(p.el('loading-copy').textContent,'Checking your account…');assert.equal(p.link.asked,1);
 // The farm session: the website's own, with the portal and its source; no Sign out.
 const bridge={signOut(){throw new Error('no');}};p.config.extend(bridge);assert.equal(bridge.portal.name,'discord');assert.doesNotThrow(()=>bridge.signOut());
 assert.deepEqual(p.config.firstLoad(),{source:{src:'discord',ref:'discord.com'}});assert.deepEqual(SOURCE,{src:'discord',ref:'discord.com'});
 // The next launch on this device: the session goes along, and the server says it is this player's already.
 const again=fakePage({session:{access_token:'at-a',user:{id:'player-a'}},replies:[{status:200,data:{ok:true,player_id:'player-a',locale:'en-US'}}]});await again.run();
 assert.equal(again.sent[0].headers.authorization,'Bearer at-a');assert.deepEqual(again.auth.calls,[],'no new sign-in');assert.deepEqual(again.opened,['player-a']);
 // A session of someone else on this device: the server's way in for whoever plays now.
 const other=fakePage({session:{access_token:'at-b',user:{id:'player-b'}},replies:[{status:200,data:{token_hash:'hash:player-a',player_id:'player-a'}}]});await other.run();
 assert.equal(other.sent[0].headers.authorization,'Bearer at-b');assert.deepEqual(other.opened,['player-a'],'never the other player\'s farm');
});
test('a code is good for one sign-in: Try again, a session that ended and the pause screen\'s reopen each ask Discord for a new one',async()=>{
 const p=fakePage({replies:[{status:401}]});await p.run();
 assert.equal(p.el('pause-copy').textContent,TEXT.refused);assert.deepEqual(p.opened,[]);
 await p.el('pause-retry').click();await settle();
 assert.equal(p.link.asked,2);assert.equal(p.sent[1].body.code,'code-2');assert.deepEqual(p.opened,['player-a'],'Try again: in');
 p.config.signedOut('Your session has ended.');await settle();
 assert.equal(p.link.asked,3);assert.equal(p.sent[2].body.code,'code-3');assert.equal(p.sent[2].headers.authorization,undefined,'the ended session was let go');
 assert.deepEqual(p.opened,['player-a','player-a']);
 p.config.signedOut('Your session has ended.');assert.equal(p.el('pause-copy').textContent,'Your session has ended. Tap Try again to continue.','twice in half a minute: the pause card, never a loop');
 p.reopen();await settle();assert.equal(p.link.asked,4);assert.equal(p.sent[3].body.code,'code-4');
});
test('a no in Discord\'s window: the Authorize card (no server call, no farm); only a tap on Authorize to play asks again',async()=>{
 const p=fakePage({answers:[{code:null,reason:'declined'}],session:{access_token:'old',user:{id:'someone-before'}}});await p.run();
 assert.equal(p.el('authorize-screen').hidden,false);assert.equal(p.el('farm-host').hidden,true);assert.equal(p.el('loading-screen').hidden,true);assert.equal(p.el('pause-screen').hidden,true);
 assert.equal(p.sent.length,0,'nothing to ask our server');assert.deepEqual(p.opened,[]);
 assert.deepEqual(p.auth.calls,[['signOut','local']],'no farm of whoever played before on this device');
 assert.equal(p.el('authorize-contact').textContent,`Questions about your privacy? Email ${PRIVACY_CONTACT}.`);
 // Nothing asks again by itself: not the connection coming back, not Try again, not a new version (its reload would ask again).
 p.reopen();await settle();await p.el('pause-retry').click();await settle();assert.equal(p.link.asked,1,'never by itself');assert.equal(p.el('authorize-screen').hidden,false);
 assert.equal(p.update.canReload(),false,'a new version waits while the card is up');
 // A tap: another no leaves the card; Discord not there says so; a yes opens the farm.
 p.link.answers=[{code:null,reason:'declined'}];await p.el('authorize-play').click();assert.equal(p.link.asked,2);assert.equal(p.el('authorize-status').textContent,'');assert.equal(p.el('authorize-screen').hidden,false);
 p.link.answers=[{code:null,reason:'unready'}];await p.el('authorize-play').click();assert.equal(p.el('authorize-status').textContent,TEXT.noConnect);assert.equal(p.el('authorize-play').disabled,false);
 p.link.answers=[{code:'code-yes'}];await p.el('authorize-play').click();await settle();
 assert.equal(p.link.asked,4,'the tap\'s own code, not another');assert.deepEqual(p.sent.map(s=>s.body.code),['code-yes']);assert.deepEqual(p.opened,['player-a']);assert.equal(p.el('authorize-screen').hidden,true);
 assert.equal(p.update.canReload(),true,'and comes once the farm is open');
});
test('a refused sign-in, Discord asking to wait, a server that is away: the pause card in the game\'s words, and tries again by itself',async()=>{
 for(const [status,text] of [[401,TEXT.refused],[400,TEXT.failed]]){
  const p=fakePage({replies:[{status,data:{error:'English from the server'}}]});await p.run();
  assert.equal(p.el('pause-screen').hidden,false,String(status));assert.equal(p.el('pause-copy').textContent,text,String(status));assert.equal(p.el('pause-message').textContent,'');assert.deepEqual(p.opened,[]);
  assert.deepEqual(retryTimers(p),[],'Try again only');
 }
 // Discord's own limit (our server passes on its retry_after, in seconds): busy, then a new start once the wait is over.
 for(const [reply,ms] of [[{data:{retry_after:30}},30000],[{data:{retry_after:7200}},MAX_WAIT],[{data:{}},8000],[{data:{},headers:{'retry-after':'12'}},12000],[{data:{retry_after:'soon'}},8000]]){
  const p=fakePage({replies:[{status:429,...reply}]});await p.run();
  assert.equal(p.el('pause-copy').textContent,TEXT.busy);assert.equal(p.el('pause-message').textContent,'We are trying again automatically.');
  assert.equal(retryTimers(p).at(-1).ms,ms,JSON.stringify(reply));
  retryTimers(p).at(-1).fn();await settle();assert.deepEqual(p.opened,['player-a'],'waited: in');assert.equal(p.sent[1].body.code,'code-2');
 }
 for(const reply of [{status:503,data:{error:'Discord could not be reached.',code:'DISCORD_UNAVAILABLE'}},{status:503,data:{code:'NOT_CONFIGURED'}},{throw:true}]){
  const p=fakePage({replies:[reply,reply]});await p.run();
  assert.equal(p.el('pause-copy').textContent,TEXT.away);assert.equal(p.el('pause-message').textContent,'We are trying again automatically.');
  assert.equal(retryTimers(p).at(-1).ms,8000,'8 s, then longer each time');
  retryTimers(p).at(-1).fn();await settle();assert.equal(retryTimers(p).at(-1).ms,16000);
  retryTimers(p).at(-1).fn();await settle();assert.deepEqual(p.opened,['player-a'],'tried again: in');
 }
 // Discord's SDK did not answer: the same, a new ask later.
 const late=fakePage({answers:[{code:null,reason:'unready'}]});await late.run();assert.equal(late.el('pause-copy').textContent,TEXT.away);assert.equal(late.sent.length,0);
 retryTimers(late).at(-1).fn();await settle();assert.deepEqual(late.opened,['player-a']);
 // Supabase's own limit on sign-ins (one network for every Discord player): busy, Try again.
 const busy=fakePage();busy.auth.fail=Object.assign(new Error('Request rate limit reached'),{status:429});await busy.run();
 assert.equal(busy.el('pause-copy').textContent,TEXT.busy);assert.equal(busy.el('pause-message').textContent,'');assert.deepEqual(retryTimers(busy),[]);
 const off=fakePage({configured:false});await off.run();assert.equal(off.el('pause-copy').textContent,TEXT.setup);assert.equal(off.sent.length,0);
});
test('the language comes from the player\'s Discord (our server reads it) when the game speaks it, else English; a choice in Settings stays',async()=>{
 const nl=fakePage({replies:[{status:200,data:{token_hash:'hash:player-a',player_id:'player-a',locale:'nl'}}]});await nl.run();
 assert.deepEqual(nl.chosen,['nl']);assert.equal(nl.store.data[LOCALE_KEY],'nl');assert.deepEqual(nl.events,['language nl','open'],'before the farm opens, so the farm is in it');
 assert.equal(nl.translations,1,'this page is translated once');
 const kept=fakePage({stored:{[LOCALE_KEY]:'nl'},replies:[{status:200,data:{token_hash:'hash:player-a',player_id:'player-a',locale:'nl'}}]});await kept.run();assert.deepEqual(kept.chosen,[],'the same as last time: Settings wins');
 for(const [locale,code] of [['pt-BR','pt'],['zh-CN','zh'],['es-419','es'],['en-GB','en'],['it','en']]){
  const p=fakePage({replies:[{status:200,data:{token_hash:'hash:player-a',player_id:'player-a',locale}}]});await p.run();assert.deepEqual(p.chosen,[code],locale);
 }
 const none=fakePage();await none.run();assert.deepEqual(none.chosen,[]);assert.equal(none.translations,1);
 const declined=fakePage({answers:[{code:null,reason:'declined'}]});await declined.run();assert.equal(declined.translations,1,'the Authorize card in the device\'s language');
});

// ---- The portal: everything Discord mode leaves out is off, and the privacy policy goes through Discord ----
test('the portal object the page hands the game: every feature off, a signed-in player, the chat on, the privacy policy through Discord',async()=>{
 const p=fakePage();const {portal}=await p.run();
 assert.equal(portal.name,'discord');assert.deepEqual(Object.keys(portal.features),PORTAL_FEATURES);assert.ok(Object.values(portal.features).every(on=>on===false));
 assert.equal(portal.guest,false);assert.equal(portal.userAvailable,true);assert.deepEqual(portal.settings,{muteAudio:false,disableChat:false});assert.equal(portal.privacyContact,'info@harvesttycoon.com');
 for(const feature of PORTAL_FEATURES)assert.equal(portalOff(feature,portal),true,feature);
 assert.equal(portalChat(portal),'on','the chat for every player: Discord vouched for each');assert.equal(portalLogIn(portal),true);
 assert.equal(portalAround({parent:{harvestPortal:portal}}),portal);
 assert.equal(typeof portal.reload,'function');assert.equal(typeof portal.reopen,'function');assert.doesNotThrow(()=>portal.event('gameplayStart'));
 assert.equal(portal.showAuthPrompt,undefined,'no guests, so no log-in to offer');
 assert.equal(portal.openLink(PRIVACY_URL),true);assert.deepEqual(p.link.opened,[PRIVACY_URL],'the farm\'s privacy links go to Discord\'s window');
 // The privacy line on this page: Discord's window inside Discord, a plain link on our own computer.
 let prevented=0;const click=href=>({target:{closest:sel=>sel==='a[href]'?{href}:null},preventDefault:()=>prevented++});
 p.tap(click(PRIVACY_URL));assert.equal(prevented,1);assert.deepEqual(p.link.opened,[PRIVACY_URL,PRIVACY_URL]);
 p.link.openLinkResult=false;p.tap(click(PRIVACY_URL));assert.equal(prevented,1,'not handed over: the link does what a link does');
 p.tap({target:{closest:()=>null},preventDefault:()=>prevented++});assert.equal(prevented,1,'not a link: nothing');
});

// ---- The page, its headers and its build ----
test('discord.html: no script written in the page, no inline handlers, no address but the privacy policy; the loading screen, the Authorize card',()=>{
 const html=read('public/discord.html'),code=noComments(html);
 for(const banned of [/googletagmanager|GTM-|dataLayer|gtag\(/,/cookie-consent|harvestConsent|Cookie settings/,/account-card|account-form|type="email"|type="password"|Create account|social-login|data-provider/,/<footer|site-legal|footer-social/,/rel="manifest"|apple-touch|apple-mobile-web-app|mobile-web-app-capable/,/og:|twitter:|rel="canonical"|ld\+json/,/browser-gate|data-gate/,/\/partners|\/wiki"|facebook\.com|tiktok\.com|instagram\.com|crazygames|kongregate/i,/cloud\/cloud\.js|i18n-boot\.js/,/mailto:/,/supabase\.co|preconnect/])assert.doesNotMatch(code,banned,String(banned));
 assert.match(html,/<html lang="en" data-portal="discord" class="i18n-wait">/);assert.match(html,/<meta name="robots" content="noindex, nofollow">/);assert.match(html,/<meta name="harvest-version" content="dev">/);
 assert.match(html,/<meta name="referrer" content="strict-origin">/,'Discord puts its launch in the address: only our own address goes along');
 // Discord's frame runs no script written into a page and no handler in an attribute: one script, the page's own bundle.
 assert.deepEqual([...code.matchAll(/<script\b[^>]*>/g)].map(m=>m[0]),['<script type="module" src="/cloud/discord.js">']);
 assert.match(code,/<script type="module" src="\/cloud\/discord\.js"><\/script>/);
 assert.doesNotMatch(code,/\son[a-z]+\s*=/i,'no onclick="…" and the like');assert.doesNotMatch(code,/javascript:/i);
 assert.deepEqual([...new Set([...code.matchAll(/https?:\/\/[^\s'"`)<,]+/g)].map(m=>m[0]))],[PRIVACY_URL],'no address but the privacy policy: everything else is ours, through Discord\'s proxy');
 assert.deepEqual([...code.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]),[PRIVACY_URL,PRIVACY_URL],'one link: the privacy policy, on the loading screen and the Authorize card');
 assert.doesNotMatch(code,/(?:src|href)="\/\//,'no address of another site without its https');
 for(const id of ['loading-screen','loading-copy','loading-progress','loading-percent','loading-tip-text','loading-tip-icon','authorize-screen','authorize-title','authorize-play','authorize-status','authorize-contact','farm-host','pause-screen','pause-copy','pause-message','pause-retry'])assert.match(html,new RegExp(`id="${id}"`),id);
 assert.match(html,/<button type="button" id="authorize-play" class="dc-authorize-button">Authorize to play<\/button>/);
 assert.match(html,/<section id="authorize-screen" class="loading-screen farm-loading dc-authorize" aria-labelledby="authorize-title" hidden>/,'the painted farm and the logo, as the loading screen');
 assert.match(html,/<p class="portal-privacy">By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.<\/p>/);
 assert.equal(read('public/crazygames.html').match(/<section id="loading-screen"[^]*?<\/section>/)[0],html.match(/<section id="loading-screen"[^]*?<\/section>/)[0],'the same loading screen as on CrazyGames');
 assert.equal(read('public/kongregate.html').match(/<section id="pause-screen"[^]*?<\/section>/)[0],html.match(/<section id="pause-screen"[^]*?<\/section>/)[0],'the same pause card as on Kongregate');
 const css=read('public/discord.css');assert.match(css,/user-select:none/);assert.match(css,/background:#fbf8f3/);assert.match(css,/background:#3f8a4a/,'the game\'s green main button');
 // Phones: Discord's safe areas reach only this page, so the farm's frame is kept clear of them here.
 assert.match(css,/#farm-host\{position:fixed;inset:0;background:#c2a17c;padding:var\(--discord-safe-area-inset-top,env\(safe-area-inset-top\)\) var\(--discord-safe-area-inset-right,env\(safe-area-inset-right\)\) var\(--discord-safe-area-inset-bottom,env\(safe-area-inset-bottom\)\) var\(--discord-safe-area-inset-left,env\(safe-area-inset-left\)\)\}/);
 assert.match(css,/\*\{box-sizing:border-box\}/,'the frame fits inside that room');
 assert.doesNotMatch(css,/@import|https?:/,'nothing from another address');
 assert.doesNotMatch(read('public/sitemap.xml'),/discord/);
 // The farm downloads meanwhile, the same list as on CrazyGames.
 const block=html.slice(html.indexOf(PREFETCH_START)+PREFETCH_START.length,html.indexOf(PREFETCH_END)).trim();
 assert.equal(block,prefetchLines(farmPrefetch(read('public/farm.html'))),'run node scripts/module-preload.mjs');
 assert.ok(html.indexOf('<script type="module" src="/cloud/discord.js"></script>')<html.indexOf(PREFETCH_START));
});
test('src/discord.js: only inside Discord (on its own our address sends the visitor to the website); never moved inside Discord; no trackers',()=>{
 const js=read('src/discord.js'),page=read('src/discord-page.js'),link=read('src/discord-link.js');
 assert.match(js,/^import \{DiscordSDK\} from '@discord\/embedded-app-sdk';/,'from npm, in this bundle: Discord\'s frame loads no script from another address');
 assert.match(js,/const discord=inDiscord\(location\),local=isLocalHost\(location\.hostname\);/);
 assert.match(js,/if\(!discord&&!local\)location\.replace\('\/'\);/);
 assert.match(js,/link:discord\?createDiscordLink\(\{win:window,SDK:DiscordSDK\}\):localStandIn\(\{search:location\.search\}\)/);
 assert.equal((js.match(/location\.(replace|assign)/g)??[]).length,1,'only outside Discord');
 for(const source of [js,page,link]){
  assert.doesNotMatch(source,/window\.top|top\.location|parent\.location/,'never Discord\'s own page');
  assert.doesNotMatch(source,/trackCommerce|trackInvite|pushEvent|dataLayer|gtag|fbq|ttq/,'no trackers');
  assert.doesNotMatch(source,/patchUrlMappings|authenticate\(|getUser\(|userSettingsGetLocale/,'the proxy address comes from the build; no Discord token, no Discord user here');
  assert.doesNotMatch(source,/\bon[a-z]+=["']|innerHTML|insertAdjacentHTML|document\.write/,'no handler or markup written as text');
 }
 // Inside Discord the page stays where Discord put it: the SDK answers Discord through document.referrer.
 for(const source of [page,link])assert.doesNotMatch(source,/location\.(replace|assign|href\s*=)|history\./);
 assert.doesNotMatch(page+link,/username|global_name|avatar/,'the farmer\'s name is never the Discord one');
 assert.match(link,/new SDK\(clientId,\{disableConsoleLogOverride:true\}\)/);
 assert.match(link,/sdk\.commands\.authorize\(\{client_id:clientId,response_type:'code',state:'',prompt:'none',scope:\[\.\.\.SCOPE\]\}\)/);
 assert.match(link,/sdk\.commands\.openExternalLink\(\{url\}\)/);
 assert.doesNotMatch(page,/paymentRequest|createNotifications/,'no purchases or reminders in this session');
 assert.match(page,/const reply=await askServer\(\{op:'discord',code,language:chosenLanguage\(\)\},now\?\.access_token\);/);
 assert.match(page,/`\$\{functionsUrl\}\/discord-auth\?forceFunctionRegion=eu-central-1`/);
 assert.match(page,/verifyOtp\(\{token_hash:reply\.token_hash,type:'magiclink'\}\)/);
 assert.equal((page.match(/link\.hello\(\)/g)??[]).length,1);
 assert.equal((page.match(/link\.authorize\(\)/g)??[]).length,2,'a new start after a yes, and the Authorize to play tap');
 assert.match(page,/if\(declined\)\{phase\('authorize'\);return;\}/,'after a no, never by itself');
 assert.match(page,/DC_KEY='harvest-tycoon:dc-user'/);assert.match(page,/LOCALE_KEY='harvest-tycoon:dc-locale'/);
});
test('the headers and the way in: Discord\'s visit to / goes on to the page (a redirect, the query kept); built and stamped like the other portal pages',()=>{
 const config=JSON.parse(read('vercel.json'));
 // Vercel serves a file before a rewrite, and / is index.html: only a redirect moves Discord's visit, and Discord stays the referrer.
 assert.deepEqual(config.redirects.filter(r=>r.source==='/'),[{source:'/',has:[{type:'query',key:'frame_id'}],destination:'/discord.html',permanent:false}],'everyone else gets the home page as it is');
 assert.ok(!(config.rewrites??[]).some(r=>r.source==='/'));
 const rule=config.headers.find(r=>r.source==='/discord.html');
 assert.deepEqual(rule.headers,[{key:'Cache-Control',value:'no-cache'},{key:'X-Robots-Tag',value:'noindex, nofollow'}],'no frame-ancestors: Discord\'s clients frame it from several places');
 assert.deepEqual(config.headers.filter(r=>r.headers.some(h=>h.key==='Content-Security-Policy')).map(r=>r.source),['/crazygames.html','/kongregate.html']);
 const build=read('scripts/build-static.mjs');
 assert.match(build,/readFileSync\('public\/discord\.html','utf8'\)\.replace\('<meta name="harvest-version" content="dev">'/);assert.match(build,/if\(!discord\.includes\(`content="\$\{version\}"`\)\)throw new Error/);assert.match(build,/writeFileSync\('dist-static\/discord\.html',discord\)/);
 // Its own build, with Discord's proxy address for Supabase in that build only.
 const cloud=read('scripts/build-cloud.mjs');
 assert.match(cloud,/define:\{'import\.meta\.env\.VITE_SUPABASE_URL':discordUrl,'import\.meta\.env\.VITE_SUPABASE_ANON_KEY':JSON\.stringify\(key\)\},build:\{outDir:'public\/cloud',emptyOutDir:false,lib:\{entry:\{discord:'src\/discord\.js'\}/);
 assert.equal((cloud.match(/discordUrl/g)??[]).length,2,'defined once, used by the Discord build only');
 assert.equal((cloud.match(/'import\.meta\.env\.VITE_SUPABASE_URL':JSON\.stringify\(url\)/g)??[]).length,3,'the website, CrazyGames and Kongregate as before');
 assert.match(cloud,/entry:\{cloud:'src\/main\.js','game-cloud':'src\/game-cloud\.js',partners:'src\/partners\.js'\}/);
 const template=cloud.match(/const discordUrl=`([^`]+)`;/)[1],expression=template.replace('${JSON.stringify(url)}',JSON.stringify('https://jnmdirvidffzxukbdmij.supabase.co'));
 const at=location=>new Function('location',`return ${expression};`)(location);
 assert.equal(at({hostname:HOST,origin:`https://${HOST}`}),`https://${HOST}/supabase`,'inside Discord: through its proxy (URL Mappings /supabase)');
 for(const hostname of ['localhost','www.harvesttycoon.com','discordsays.com.example.com'])assert.equal(at({hostname,origin:`https://${hostname}`}),'https://jnmdirvidffzxukbdmij.supabase.co',hostname);
 assert.match(read('scripts/i18n-extract.mjs'),/'public\/discord\.html'/,'its words are translated with the game');
 assert.match(read('scripts/module-preload.mjs'),/writeFileSync\(DISCORD,withPrefetch\(readFileSync\(DISCORD,'utf8'\),prefetch,'public\/discord\.html'\)\);/);
 assert.doesNotMatch(read('package.json').match(/"build:static": "[^"]*"/)[0],/discord/,'nothing to upload: Discord shows the live page');
 // The SDK at one exact version, in the lockfile Vercel installs from.
 assert.equal(JSON.parse(read('package.json')).dependencies['@discord/embedded-app-sdk'],'2.5.0');
 assert.match(read('pnpm-lock.yaml'),/'@discord\/embedded-app-sdk':\n {8}specifier: 2\.5\.0\n {8}version: 2\.5\.0\n/);
});
