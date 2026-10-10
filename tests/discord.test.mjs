import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDiscordLink,localStandIn,clientIdOf,inDiscord,SCOPE,LINK_PAGE,linkPageUrl,validTicket} from '../src/discord-link.js';
import {runDiscordPage,TEXT,DC_KEY,LOCALE_KEY,SOURCE,MAX_WAIT,POLL,TICKET_LIFE} from '../src/discord-page.js';
import {portal as portalAround,portalOff,portalChat,portalLogIn,PORTAL_FEATURES,PRIVACY_URL,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
import {farmPrefetch,prefetchLines,PREFETCH_START,PREFETCH_END} from '../scripts/module-preload.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
// Longer ways (a ticket, the server, a new start): a few turns of the event loop as well.
const flush=async()=>{for(let i=0;i<6;i++){await settle();await new Promise(resolve=>setImmediate(resolve));}};
const noComments=html=>html.replace(/<!--[^]*?-->/g,'');

// ---- Oct 2026: the page's side of Discord's Embedded App SDK (src/discord-link.js), with a stand-in for the SDK ----
const CLIENT='1290012345678901234',HOST=`${CLIENT}.discordsays.com`,SEARCH='?instance_id=i-1-gc-2-3&location_id=gc-2-3&launch_id=l-1&frame_id=f-1&platform=desktop';
function fakeSdk({answers=[],linkAnswers=[],ready=true,broken=false}={}){
 const made=[],calls={authorize:[],links:[]};let release=()=>{};
 const readyPromise=ready?Promise.resolve():new Promise(resolve=>{release=resolve;});
 class SDK{
  constructor(id,config){if(broken)throw new Error('instance_id query param is not defined');made.push({id,config});
   this.commands={
    authorize:async args=>{calls.authorize.push(args);const next=answers.shift()??{code:`code-${calls.authorize.length}`};if(next.reject)throw next.reject;return next;},
    openExternalLink:async args=>{calls.links.push(args);const next=linkAnswers.shift()??{opened:true};if(next.reject)throw next.reject;return next;}
   };}
  ready(){return readyPromise;}
 }
 return {SDK,made,calls,linkAnswers,release:()=>release()};
}
const fakeTimers=()=>({list:[],setTimeout(fn,ms){this.list.push({fn,ms});return this.list.length;},clearTimeout(id){const timer=this.list[id-1];if(timer)timer.cleared=true;}});
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
// A ticket as our server makes it: 32 random bytes in base64url (43 characters).
const TICKET='Zm9vYmFyLWJhei1xdXV4LTEyMzQ1Njc4OTAtYWJjZGVm'.slice(0,43),TICKET2=`${'b'.repeat(40)}_-2`,TICKET3=`${'c'.repeat(40)}_-3`;
// Its key, which stays in the Activity (never in an address): our server makes a farm or signs in only with both.
const KEY=`${'k'.repeat(40)}_-k`;
test('the website\'s link page: only with a ticket of our server\'s, in Discord\'s own window; a no there, an older Discord, no Discord',async()=>{
 assert.equal(TICKET.length,43);assert.equal(validTicket(TICKET),TICKET);
 assert.equal(LINK_PAGE,'https://www.harvesttycoon.com/discord-link');
 assert.equal(linkPageUrl(TICKET),`https://www.harvesttycoon.com/discord-link?t=${TICKET}`);assert.equal(linkPageUrl('a+b/c=&d'),'https://www.harvesttycoon.com/discord-link?t=a%2Bb%2Fc%3D%26d','always encoded');
 const sdk=fakeSdk({linkAnswers:[{opened:true},{opened:false},{opened:null},{},{reject:Object.assign(new Error('Invalid command'),{code:4002})}]});
 const link=createDiscordLink({win:discordWin(),SDK:sdk.SDK,timers:fakeTimers()});await link.hello();
 assert.deepEqual(await link.openLinkPage(TICKET),{opened:true});
 assert.deepEqual(sdk.calls.links,[{url:`https://www.harvesttycoon.com/discord-link?t=${TICKET}`}],'the ticket and nothing else');
 for(const bad of ['short','x'.repeat(31),`${'a'.repeat(40)}&x=1`,`${'a'.repeat(40)}/../`,`${'a'.repeat(40)}+/=`,'a'.repeat(129),'',null,undefined,42,{ticket:TICKET}])assert.deepEqual(await link.openLinkPage(bad),{opened:false,reason:'unready'},String(bad));
 assert.equal(sdk.calls.links.length,1,'never an address with anything else in it');
 assert.deepEqual(await link.openLinkPage(TICKET),{opened:false,reason:'declined'},'the player said no in Discord\'s window');
 assert.deepEqual(await link.openLinkPage(TICKET),{opened:true},'a Discord from before Dec 2024 does not say: opened');
 assert.deepEqual(await link.openLinkPage(TICKET),{opened:true});
 assert.deepEqual(await link.openLinkPage(TICKET),{opened:false,reason:'unready'},'a Discord that cannot');
 assert.equal(link.openLink(linkPageUrl(TICKET)),false,'the farm\'s own links out stay the privacy policy only');
 // No Discord: nothing opens; on our own computer a new tab.
 const none=createDiscordLink({win:discordWin({hostname:'www.harvesttycoon.com'}),SDK:fakeSdk().SDK,timers:fakeTimers()});
 assert.deepEqual(await none.openLinkPage(TICKET),{opened:false,reason:'unready'});
 const tabs=[],stand=localStandIn({search:'',win:{open:(...args)=>tabs.push(args)}});
 assert.deepEqual(await stand.openLinkPage(TICKET),{opened:true});assert.deepEqual(tabs,[[linkPageUrl(TICKET),'_blank','noopener']]);
 assert.deepEqual(await stand.openLinkPage('bad'),{opened:false,reason:'unready'});assert.equal(tabs.length,1);
});

// ---- The page itself (src/discord-page.js): a player who says yes, a player who says no, a start that goes wrong ----
function fakePage({answers=[],stored={},replies=[],session=null,online=true,configured=true,events=[],pageAnswers=[]}={}){
 const els={},el=id=>els[id]??={id,hidden:false,textContent:'',value:0,dataset:{},disabled:false,listeners:{},
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},click(){return Promise.all((this.listeners.click??[]).map(fn=>fn({})));}};
 const docListeners={};
 const doc={hidden:false,getElementById:el,documentElement:{classList:{remove(){}}},body:{dataset:{}},addEventListener(type,fn){(docListeners[type]??=[]).push(fn);}};
 const store={data:{...stored},get(key){return this.data[key]??null;},set(key,value){this.data[key]=value;}};
 const link={asked:0,answers:[...answers],opened:[],openLinkResult:true,pages:[],pageAnswers:[...pageAnswers],hello(){return this.first??=this.authorize();},
  async authorize(){this.asked++;return this.answers.shift()??{code:`code-${this.asked}`};},openLink(url){this.opened.push(url);return this.openLinkResult;},
  async openLinkPage(ticket){this.pages.push(ticket);return this.pageAnswers.shift()??{opened:true};}};
 const auth={session,calls:[],async getSession(){return {data:{session:this.session}};},
  async verifyOtp(args){this.calls.push(['verifyOtp',args.token_hash]);if(this.fail){const error=this.fail;this.fail=null;return {error};}const id=args.token_hash.replace('hash:','');this.session={access_token:`at:${args.token_hash}`,user:{id,app_metadata:id.startsWith('dc-')?{portal:'discord'}:{provider:'email'}}};return {error:null};},
  async signOut(args){this.calls.push(['signOut',args.scope]);this.session=null;return {};},startAutoRefresh(){}};
 const used=[],sent=[],opened=[],chosen=[],timers=fakeTimers(),clock={t:1_000_000};
 let config=null,reopen=null,translations=0,update=null,disposed=0;
 const fetchImpl=async(url,init)=>{sent.push({url,headers:init.headers,body:JSON.parse(init.body)});if(page.fetchGate)await page.fetchGate;const next=replies.shift()??{status:200,data:{token_hash:'hash:player-a',player_id:'player-a'}};if(next.throw)throw new TypeError('offline');
  return new Response(JSON.stringify(next.data??{}),{status:next.status??200,headers:next.headers??{}});};
 // The farm opens as farm-session.js opens it: the bridge gets the portal and the account, then the farm is up.
 const createFarmSession=options=>{config=options;return {open:async()=>{events.push('open');const user=auth.session?.user??null;options.extend({},{alive:()=>true,user});opened.push(user?.id??null);options.phase('authenticated');},dispose(){disposed++;},listen(hooks){reopen=hooks.reopen;}};};
 const run=()=>runDiscordPage({link,doc,win:{location:{reload(){}}},nav:{onLine:online},timers,clock:()=>clock.t,store,portalClient:key=>{assert.equal(key,DC_KEY);return {auth};},setClient:client=>used.push(client),
  functionsUrl:'https://x.supabase.co/functions/v1',supabaseKey:'anon',isConfigured:configured,fetchImpl,createFarmSession,
  chooseLanguage:code=>{events.push(`language ${code}`);chosen.push(code);},chosenLanguage:()=>'en',startTranslation:()=>{translations++;},startUpdateCheck:options=>{update=options;}});
 const tap=event=>{for(const fn of docListeners.click??[])fn(event);};
 const fire=type=>{for(const fn of docListeners[type]??[])fn({});};
 const page={run,els,el,link,auth,sent,opened,used,chosen,store,timers,events,tap,fire,doc,replies,clock,fetchGate:null,get disposed(){return disposed;},get config(){return config;},reopen:()=>reopen(),get translations(){return translations;},get update(){return update;}};
 return page;
}
const retryTimers=p=>p.timers.list.filter(t=>t.ms!==3000);
// The waiting card's next round (the first 3-second timer is the page's language wait), and that round run.
const polls=p=>p.timers.list.filter((t,i)=>i>0&&t.ms===POLL&&!t.cleared&&!t.fired);
const tick=async p=>{const round=polls(p).at(-1);assert.ok(round,'a round is waiting');round.fired=true;round.fn();await flush();};
const choice=(ticket=TICKET,extra={})=>({status:200,data:{choose:true,ticket,key:KEY,expires_in:600,...extra}});
// The farm open: the loading screen stays over it until the farm page shows its own (public/loading-screen.js farmHandOver).
const FARM=Object.freeze({'loading-screen':true,'farm-host':true});
const screens=p=>Object.fromEntries(['loading-screen','authorize-screen','choose-screen','wait-screen','pause-screen','farm-host'].filter(id=>!p.el(id).hidden).map(id=>[id,true]));
test('a player who says yes: the code to our server (never in an address), a way in, the farm opens',async()=>{
 const p=fakePage();await p.run();
 assert.equal(p.sent.length,1);const [ask]=p.sent;
 assert.equal(ask.url,'https://x.supabase.co/functions/v1/discord-auth?forceFunctionRegion=eu-central-1','in Frankfurt, as farm-api');
 assert.deepEqual(ask.body,{op:'discord',code:'code-1',language:'en'});assert.equal(ask.headers.apikey,'anon');assert.equal(ask.headers.authorization,undefined,'no session yet');
 assert.doesNotMatch(ask.url,/code-1/,'the code only in the body');
 assert.deepEqual(p.auth.calls,[['verifyOtp','hash:player-a']]);assert.equal(p.used.length,1);assert.deepEqual(p.opened,['player-a']);
 assert.equal(p.el('authorize-screen').hidden,true);assert.equal(p.el('loading-copy').textContent,'Checking your account…');assert.equal(p.link.asked,1);
 assert.deepEqual(screens(p),FARM,'a farm our server knows: no choice card');
 // The farm session: the website's own, with the portal and its source; no Sign out.
 const bridge={signOut(){throw new Error('no');}};p.config.extend(bridge);assert.equal(bridge.portal.name,'discord');assert.doesNotThrow(()=>bridge.signOut());
 assert.deepEqual(p.config.firstLoad(),{source:{src:'discord',ref:'discord.com'}});assert.deepEqual(SOURCE,{src:'discord',ref:'discord.com'});
 // The next launch on this device: the session goes along, and the server says it is this player's already.
 const again=fakePage({session:{access_token:'at-a',user:{id:'player-a'}},replies:[{status:200,data:{ok:true,player_id:'player-a',locale:'en-US'}}]});await again.run();
 assert.equal(again.sent[0].headers.authorization,'Bearer at-a');assert.deepEqual(again.auth.calls,[],'no new sign-in');assert.deepEqual(again.opened,['player-a']);
 assert.equal(again.el('choose-screen').hidden,true,'a returning player never sees the choice card');
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

// ---- Oct 2026: a Discord user our server has not seen chooses: a new farm, or the farm they already have on harvesttycoon.com ----
test('a Discord user our server has not seen: the choice card (no farm yet, the sign-in here before let go); New farm makes one with the ticket',async()=>{
 const p=fakePage({session:{access_token:'old',user:{id:'someone-before'}},replies:[choice(TICKET,{locale:'nl'}),{status:200,data:{token_hash:'hash:dc-new',player_id:'dc-new'}}]});await p.run();
 assert.deepEqual(screens(p),{'choose-screen':true});assert.equal(p.el('choose-status').textContent,'');
 assert.equal(p.sent[0].headers.authorization,'Bearer old','the start as always');
 assert.deepEqual(p.auth.calls,[['signOut','local']],'no farm of whoever played before on this device');assert.deepEqual(p.opened,[]);
 assert.deepEqual(p.chosen,['nl'],'the card in the player\'s Discord language');assert.equal(p.translations,1);
 assert.ok(!JSON.stringify(p.store.data).includes(TICKET),'the ticket is never stored');assert.ok(!JSON.stringify(p.store.data).includes(KEY),'nor its key');
 assert.equal(p.update.canReload(),false,'a new version waits: its reload would lose the choice');
 assert.deepEqual(retryTimers(p),[],'nothing happens by itself');assert.deepEqual(polls(p),[]);
 await p.el('choose-new').click();await flush();
 assert.deepEqual(p.sent[1].body,{op:'create',ticket:TICKET,key:KEY,language:'en'});assert.equal(p.sent[1].headers.authorization,undefined,'the ticket says who');
 assert.equal(p.sent[1].url,'https://x.supabase.co/functions/v1/discord-auth?forceFunctionRegion=eu-central-1');
 assert.deepEqual(p.auth.calls.at(-1),['verifyOtp','hash:dc-new']);assert.deepEqual(p.opened,['dc-new']);assert.deepEqual(screens(p),FARM);
 assert.equal(p.link.asked,1,'no new code from Discord: the ticket carries the choice');assert.deepEqual(p.link.pages,[]);
 assert.equal(p.update.canReload(),true);
 // A tap on a card that is gone does nothing.
 await p.el('choose-new').click();await p.el('choose-existing').click();await flush();assert.equal(p.sent.length,2);assert.deepEqual(p.link.pages,[]);
});
test('I already have a farm: the website\'s link page with the ticket, then the waiting card asks every 3 s until the website linked the farm',async()=>{
 const p=fakePage({replies:[choice()]});await p.run();
 await p.el('choose-existing').click();await flush();
 assert.deepEqual(p.link.pages,[TICKET],'in Discord\'s window, with the ticket');assert.equal(p.el('choose-existing').disabled,false);
 assert.deepEqual(screens(p),{'wait-screen':true});assert.equal(p.el('wait-new').hidden,false,'New farm instead');
 assert.equal(p.update.canReload(),false,'no reload while waiting');
 assert.equal(polls(p).length,1);assert.equal(polls(p)[0].ms,3000);assert.equal(p.sent.length,1,'nothing asked before the first 3 s');
 p.replies.push({status:200,data:{pending:true,expires_in:590}});await tick(p);
 assert.deepEqual(p.sent[1].body,{op:'claim',ticket:TICKET,key:KEY});assert.equal(p.sent[1].headers.authorization,undefined);
 assert.equal(polls(p).length,1,'asked again 3 s later');assert.deepEqual(screens(p),{'wait-screen':true});
 // A connection problem, our server away or busy: the next round asks again.
 for(const reply of [{throw:true},{status:503},{status:429,data:{retry_after:5}},{status:500}]){p.replies.push(reply);await tick(p);assert.equal(polls(p).length,1,JSON.stringify(reply));assert.deepEqual(screens(p),{'wait-screen':true});}
 // Linked on the website: that farm opens (the sign-in before let go on this device).
 p.replies.push({status:200,data:{token_hash:'hash:web-1',player_id:'web-1'}});await tick(p);
 assert.deepEqual(p.opened,['web-1']);assert.deepEqual(screens(p),FARM);assert.deepEqual(polls(p),[],'no more asking');
 assert.deepEqual(p.auth.calls,[['signOut','local'],['signOut','local'],['verifyOtp','hash:web-1']]);
 assert.equal(p.sent.filter(s=>s.body.op==='claim').length,6);assert.equal(p.link.asked,1);
 assert.equal(p.update.canReload(),true);
});
test('the waiting card stops asking while the page is out of view (a phone that went to the browser) and asks at once when it is back',async()=>{
 const p=fakePage({replies:[choice()]});await p.run();
 await p.el('choose-existing').click();await flush();
 p.doc.hidden=true;p.fire('visibilitychange');assert.deepEqual(polls(p),[],'not while out of view');
 p.fire('visibilitychange');assert.deepEqual(polls(p),[]);assert.equal(p.sent.length,1);
 p.doc.hidden=false;p.replies.push({status:200,data:{pending:true,expires_in:500}});p.fire('visibilitychange');await flush();
 assert.deepEqual(p.sent.at(-1).body,{op:'claim',ticket:TICKET,key:KEY},'at once when back');assert.equal(polls(p).length,1);
 // An answer that comes once the page is out of view: no next round until it is back.
 p.replies.push({status:200,data:{pending:true,expires_in:497}});const round=polls(p).at(-1);round.fired=true;p.doc.hidden=true;round.fn();await flush();
 assert.equal(p.sent.length,3);assert.deepEqual(polls(p),[]);
 // Back twice while a question is still on its way: one question at a time.
 p.doc.hidden=false;p.replies.push({status:200,data:{pending:true,expires_in:490}});const before=p.sent.length;
 p.fire('visibilitychange');p.fire('visibilitychange');await flush();assert.equal(p.sent.length,before+1,'one question, not two');assert.equal(polls(p).length,1);
 // Other phases do not listen.
 const q=fakePage();await q.run();q.doc.hidden=false;q.fire('visibilitychange');await flush();assert.equal(q.sent.length,1);
});
test('the ticket\'s end: a new start (a new code from Discord), the choice card again with a note; a farm linked meanwhile opens instead',async()=>{
 const p=fakePage({replies:[choice(TICKET,{expires_in:60})]});await p.run();
 await p.el('choose-existing').click();await flush();
 // On the page's clock: nothing asked with a ticket that ran out.
 p.clock.t+=60000;p.replies.push(choice(TICKET2));await tick(p);
 assert.equal(p.sent.filter(s=>s.body.op==='claim').length,0);
 assert.deepEqual(p.sent.at(-1).body,{op:'discord',code:'code-2',language:'en'});assert.equal(p.link.asked,2);
 assert.deepEqual(screens(p),{'choose-screen':true});assert.equal(p.el('choose-status').textContent,TEXT.expired);assert.deepEqual(polls(p),[]);
 // Our server's no to the ticket (expired, used, unknown): the same.
 await p.el('choose-existing').click();await flush();assert.deepEqual(p.link.pages,[TICKET,TICKET2]);assert.equal(p.el('choose-status').textContent,'','the note goes with a new try');
 for(const status of [410,404,409]){
  p.replies.push({status,data:{error:'English from the server'}},choice(TICKET3));await tick(p);
  assert.equal(p.sent.at(-1).body.op,'discord',String(status));assert.equal(p.el('choose-status').textContent,TEXT.expired,String(status));
  await p.el('choose-existing').click();await flush();
 }
 // Our server says how long is left: 0 seconds is the end, without asking again.
 const asked=p.sent.length;p.replies.push({status:200,data:{pending:true,expires_in:0}},choice(TICKET));await tick(p);await tick(p);
 assert.equal(p.sent.length,asked+2,'one claim, then a new start');assert.equal(p.sent.at(-1).body.op,'discord');assert.equal(p.el('choose-status').textContent,TEXT.expired);
 // Linked just as the ticket ran out: the new start finds the farm and opens it (no note, no choice).
 await p.el('choose-existing').click();await flush();
 p.replies.push({status:410},{status:200,data:{token_hash:'hash:web-2',player_id:'web-2'}});await tick(p);
 assert.deepEqual(p.opened,['web-2']);assert.deepEqual(screens(p),FARM);
});
test('waiting: Cancel goes back to the choice (the same ticket), New farm instead makes the farm; a no in Discord\'s window keeps the choice',async()=>{
 const p=fakePage({replies:[choice()],pageAnswers:[{opened:false,reason:'declined'},{opened:false,reason:'unready'}]});await p.run();
 await p.el('choose-existing').click();await flush();
 assert.deepEqual(screens(p),{'choose-screen':true},'the player said no in Discord\'s window');assert.equal(p.el('choose-status').textContent,'');
 await p.el('choose-existing').click();await flush();
 assert.equal(p.el('choose-status').textContent,TEXT.noLink,'Discord could not open it');assert.deepEqual(polls(p),[]);
 await p.el('choose-existing').click();await flush();assert.deepEqual(screens(p),{'wait-screen':true});assert.equal(p.el('choose-status').textContent,'');
 await p.el('wait-cancel').click();await flush();
 assert.deepEqual(screens(p),{'choose-screen':true});assert.deepEqual(polls(p),[],'no more asking');assert.equal(p.sent.length,1);assert.equal(p.link.asked,1);
 await p.el('choose-existing').click();await flush();assert.deepEqual(p.link.pages,[TICKET,TICKET,TICKET,TICKET]);
 // An answer on its way when the player taps: let go.
 p.replies.push({status:200,data:{token_hash:'hash:web-late',player_id:'web-late'}});const round=polls(p).at(-1);round.fired=true;round.fn();
 await p.el('wait-cancel').click();await flush();assert.deepEqual(p.opened,[]);assert.deepEqual(screens(p),{'choose-screen':true});
 // Cancel and back to waiting while a question is still on its way: the rounds go on once it is answered.
 await p.el('choose-existing').click();await flush();
 let answer;p.fetchGate=new Promise(resolve=>{answer=resolve;});p.replies.push({status:200,data:{pending:true,expires_in:500}},{status:200,data:{pending:true,expires_in:497}});
 polls(p).at(-1).fired=true;const slow=p.timers.list.filter(t=>t.ms===POLL&&t.fired).at(-1);slow.fn();
 await p.el('wait-cancel').click();await p.el('choose-existing').click();await flush();
 await tick(p);assert.equal(polls(p).length,1,'asked once the question before is answered');
 answer();p.fetchGate=null;await flush();assert.equal(polls(p).length,1);await tick(p);
 assert.equal(p.sent.filter(s=>s.body.op==='claim').length,3,'the one let go, the one on its way, the next round');assert.deepEqual(screens(p),{'wait-screen':true});
 await p.el('wait-cancel').click();await flush();
 await p.el('choose-existing').click();await flush();
 p.replies.push({status:200,data:{token_hash:'hash:dc-7',player_id:'dc-7'}});await p.el('wait-new').click();await flush();
 assert.deepEqual(p.sent.at(-1).body,{op:'create',ticket:TICKET,key:KEY,language:'en'});assert.deepEqual(p.opened,['dc-7']);assert.deepEqual(polls(p),[]);
 await p.el('wait-cancel').click();await p.el('wait-new').click();await flush();assert.equal(p.sent.at(-1).body.op,'create','the waiting card\'s buttons do nothing once it is gone');assert.deepEqual(p.opened,['dc-7']);
});
test('New farm with a ticket that ran out: a new start with a note (nothing made); our server away: the pause card, and a new start',async()=>{
 const p=fakePage({replies:[choice(TICKET,{expires_in:30})]});await p.run();
 p.clock.t+=30000;p.replies.push(choice(TICKET2));await p.el('choose-new').click();await flush();
 assert.equal(p.sent.filter(s=>s.body.op==='create').length,0,'never with a ticket that ran out');
 assert.deepEqual(screens(p),{'choose-screen':true});assert.equal(p.el('choose-status').textContent,TEXT.expired);
 p.clock.t+=600000;p.replies.push(choice(TICKET3));await p.el('choose-existing').click();await flush();
 assert.deepEqual(p.link.pages,[],'the website never gets a ticket that ran out');assert.equal(p.el('choose-status').textContent,TEXT.expired);
 p.replies.push({status:410},choice(TICKET));await p.el('choose-new').click();await flush();
 assert.deepEqual(p.sent.at(-2).body,{op:'create',ticket:TICKET3,key:KEY,language:'en'});assert.equal(p.sent.at(-1).body.op,'discord');assert.equal(p.el('choose-status').textContent,TEXT.expired);
 p.replies.push({status:503});await p.el('choose-new').click();await flush();
 assert.deepEqual(screens(p),{'pause-screen':true});assert.equal(p.el('pause-copy').textContent,TEXT.away);
 p.replies.push(choice(TICKET2));retryTimers(p).at(-1).fn();await flush();
 assert.equal(p.sent.at(-1).body.op,'discord','a new start: a new code, a new ticket');assert.deepEqual(screens(p),{'choose-screen':true});assert.equal(p.el('choose-status').textContent,'');
 // An answer without a ticket of ours: the pause card, never an address with it.
 const odd=fakePage({replies:[{status:200,data:{choose:true,ticket:'x&y=1',key:KEY}}]});await odd.run();
 assert.deepEqual(screens(odd),{'pause-screen':true});assert.equal(odd.el('pause-copy').textContent,TEXT.failed);
 // Without its key the ticket could neither make the farm nor open the linked one: the pause card too.
 const keyless=fakePage({replies:[{status:200,data:{choose:true,ticket:TICKET}}]});await keyless.run();
 assert.deepEqual(screens(keyless),{'pause-screen':true});assert.equal(keyless.el('pause-copy').textContent,TEXT.failed);
});

// ---- Settings on a Discord farm: play the farm from harvesttycoon.com here instead (portal.linkExisting) ----
const discordFarm=(extra=[])=>fakePage({session:{access_token:'at-dc',user:{id:'dc-1',app_metadata:{portal:'discord'}}},replies:[{status:200,data:{ok:true,player_id:'dc-1'}},...extra]});
test('linkExisting: only on a Discord farm; a ticket for it, the link page, the waiting card; once linked the Discord farm\'s session ends here',async()=>{
 const p=discordFarm();const {portal}=await p.run();
 assert.equal(portal.discordOnly,true);assert.equal(typeof portal.linkExisting,'function');
 p.replies.push({status:200,data:{ticket:TICKET,key:KEY,expires_in:600}});
 assert.deepEqual(await portal.linkExisting(),{opened:true});
 assert.deepEqual(p.sent[1].body,{op:'relink',code:'code-2'},'a new code (no window): the website can name the Discord account');assert.equal(p.sent[1].headers.authorization,'Bearer at-dc','the Discord farm\'s own session says which');
 assert.deepEqual(p.link.pages,[TICKET]);assert.deepEqual(screens(p),{'wait-screen':true},'the farm closed');assert.equal(p.disposed>0,true);
 assert.equal(p.el('wait-new').hidden,true,'no New farm instead: the player has a farm');
 assert.equal(portal.discordOnly,false);assert.equal(portal.linkExisting,undefined,'not again while waiting');
 assert.deepEqual(p.auth.calls,[],'the Discord farm\'s session stays until the website linked');
 p.replies.push({status:200,data:{pending:true,expires_in:580}},{status:200,data:{token_hash:'hash:web-9',player_id:'web-9'}});await tick(p);await tick(p);
 assert.deepEqual(p.sent.slice(2).map(s=>s.body),[{op:'claim',ticket:TICKET,key:KEY},{op:'claim',ticket:TICKET,key:KEY}]);
 assert.deepEqual(p.auth.calls,[['signOut','local'],['verifyOtp','hash:web-9']],'the old session let go on this device, then the website farm\'s');
 assert.deepEqual(p.opened,['dc-1','web-9']);assert.deepEqual(screens(p),FARM);assert.deepEqual(p.used.length,2);
 assert.equal(portal.discordOnly,false);assert.equal(portal.linkExisting,undefined,'a farm from the website: never offered');
});
test('linkExisting: a no in Discord\'s window or from our server keeps the farm; Cancel and the ticket\'s end go back to the Discord farm',async()=>{
 const p=discordFarm();const {portal}=await p.run();
 p.link.pageAnswers=[{opened:false,reason:'declined'},{opened:false,reason:'unready'}];
 p.replies.push({status:200,data:{ticket:TICKET,key:KEY,expires_in:600}});assert.deepEqual(await portal.linkExisting(),{opened:false});
 assert.deepEqual(screens(p),FARM);assert.deepEqual(polls(p),[]);
 p.replies.push({status:200,data:{ticket:TICKET,key:KEY,expires_in:600}});await assert.rejects(portal.linkExisting(),{message:TEXT.noLink});
 for(const [reply,message] of [[{status:403,data:{error:'Not a Discord farm.'}},TEXT.noLink],[{status:401},TEXT.noLink],[{status:200,data:{ticket:TICKET}},TEXT.noLink],[{status:200,data:{ticket:'x&y=1'}},TEXT.noLink],[{status:503},TEXT.away],[{throw:true},TEXT.away],[{status:429},TEXT.busy]]){
  p.replies.push(reply);await assert.rejects(portal.linkExisting(),{message},JSON.stringify(reply));assert.deepEqual(screens(p),FARM);
 }
 assert.equal(p.link.pages.length,2);assert.deepEqual(p.auth.calls,[]);
 // Two taps: one question.
 p.replies.push({status:200,data:{ticket:TICKET,key:KEY,expires_in:600}});const first=portal.linkExisting(),second=portal.linkExisting();
 assert.equal(first,second);assert.deepEqual(await first,{opened:true});assert.equal(p.sent.filter(s=>s.body.op==='relink').length,10);
 // Every ticket with a new code from Discord: our server checks it is this farm's Discord account and names it on the website.
 assert.deepEqual(p.sent.filter(s=>s.body.op==='relink').map(s=>s.body.code),['code-2','code-3','code-4','code-5','code-6','code-7','code-8','code-9','code-10','code-11']);
 // Cancel: the ticket withdrawn first (so a Link on the website later deletes nothing), then a new start, which opens the Discord
 // farm as it was (its session still the player's).
 p.replies.push({status:200,data:{ok:true}},{status:200,data:{ok:true,player_id:'dc-1'}});await p.el('wait-cancel').click();await flush();
 assert.deepEqual(p.sent.at(-2).body,{op:'cancel',ticket:TICKET,key:KEY});assert.equal(p.sent.at(-2).headers.authorization,undefined,'the key says whose');
 assert.deepEqual(p.sent.at(-1).body,{op:'discord',code:'code-12',language:'en'});assert.equal(p.sent.at(-1).headers.authorization,'Bearer at-dc');
 assert.deepEqual(p.opened,['dc-1','dc-1']);assert.deepEqual(screens(p),FARM);assert.deepEqual(polls(p),[]);
 // A Discord that gives no code just now: no ticket (the website must name the Discord account that asks), the farm stays.
 const sentBefore=p.sent.length;p.link.answers=[{code:null,reason:'unready'}];await assert.rejects(portal.linkExisting(),{message:TEXT.noLink});
 assert.equal(p.sent.length,sentBefore);assert.deepEqual(screens(p),FARM);
 // The ticket's end: back to the Discord farm, without a note (nothing to withdraw: it ran out).
 p.replies.push({status:200,data:{ticket:TICKET2,key:KEY,expires_in:600}});assert.deepEqual(await portal.linkExisting(),{opened:true});
 p.clock.t+=600000;p.replies.push({status:200,data:{ok:true,player_id:'dc-1'}});await tick(p);
 assert.deepEqual(p.opened,['dc-1','dc-1','dc-1']);assert.equal(p.el('choose-status').textContent,'');assert.equal(p.sent.filter(s=>s.body.op==='claim').length,0);
 // Linked on the website while the player cancelled: the new start opens the website farm (our server moved the Discord user to it).
 p.replies.push({status:200,data:{ticket:TICKET3,key:KEY,expires_in:600}});await portal.linkExisting();
 p.replies.push({status:410,data:{error:'TICKET_GONE'}},{status:200,data:{token_hash:'hash:web-3',player_id:'web-3'}});await p.el('wait-cancel').click();await flush();
 assert.equal(p.sent.at(-2).body.op,'cancel');assert.deepEqual(p.opened.at(-1),'web-3');
});
test('linkExisting is not there for a farm from the website played in Discord, nor before a farm is open',async()=>{
 const web=fakePage({session:{access_token:'at-web',user:{id:'web-1',app_metadata:{provider:'google'}}},replies:[{status:200,data:{ok:true,player_id:'web-1'}}]});const {portal}=await web.run();
 assert.equal(portal.discordOnly,false);assert.equal(portal.linkExisting,undefined);assert.equal('linkExisting' in portal,true,'the portal has the hook; it answers only on a Discord farm');
 const none=fakePage({answers:[{code:null,reason:'declined'}]});const {portal:card}=await none.run();assert.equal(card.linkExisting,undefined,'the Authorize card');
 const choosing=fakePage({replies:[choice()]});const {portal:chooser}=await choosing.run();assert.equal(chooser.linkExisting,undefined,'the choice card');
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
 assert.deepEqual([...code.matchAll(/<a [^>]*href="([^"]+)"/g)].map(m=>m[1]),[PRIVACY_URL,PRIVACY_URL,PRIVACY_URL],'one link: the privacy policy, on the loading screen, the Authorize card and the choice card');
 assert.doesNotMatch(code,/(?:src|href)="\/\//,'no address of another site without its https');
 for(const id of ['loading-screen','loading-copy','loading-progress','loading-percent','loading-tip-text','loading-tip-icon','authorize-screen','authorize-title','authorize-play','authorize-status','authorize-contact','choose-screen','choose-title','choose-new','choose-existing','choose-status','wait-screen','wait-title','wait-new','wait-cancel','farm-host','pause-screen','pause-copy','pause-message','pause-retry'])assert.equal(html.split(`id="${id}"`).length,2,id);
 assert.match(html,/<button type="button" id="authorize-play" class="dc-authorize-button">Authorize to play<\/button>/);
 // The choice of a farm and the card that waits for the website: the Authorize card's look, the game's green and cream buttons.
 for(const id of ['choose-screen','wait-screen'])assert.match(html,new RegExp(`<section id="${id}" class="loading-screen farm-loading dc-authorize" aria-labelledby="${id.replace('screen','title')}" hidden>`),id);
 assert.match(html,/<button type="button" id="choose-new" class="dc-authorize-button">New farm<\/button><button type="button" id="choose-existing" class="dc-second-button">I already have a farm<\/button>/);
 assert.match(html,/<p>Log in on harvesttycoon\.com, tap Link and confirm on Discord\. This window continues by itself\.<\/p>/);
 assert.match(html,/<button type="button" id="wait-new" class="dc-second-button">New farm instead<\/button><button type="button" id="wait-cancel" class="dc-second-button">Cancel<\/button>/);
 assert.equal((code.match(/<button /g)??[]).length,(code.match(/<button type="button" id="[a-z-]+" class="[a-z- ]+">/g)??[]).length,'every button: a type, an id the page listens on, a class');
 assert.doesNotMatch(code.replace(/<[^>]+>/g,'\n'),/ · /,'no middle dots on screen');
 assert.match(html,/<section id="authorize-screen" class="loading-screen farm-loading dc-authorize" aria-labelledby="authorize-title" hidden>/,'the painted farm and the logo, as the loading screen');
 assert.match(html,/<p class="portal-privacy">By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.<\/p>/);
 assert.equal(read('public/crazygames.html').match(/<section id="loading-screen"[^]*?<\/section>/)[0],html.match(/<section id="loading-screen"[^]*?<\/section>/)[0],'the same loading screen as on CrazyGames');
 assert.equal(read('public/kongregate.html').match(/<section id="pause-screen"[^]*?<\/section>/)[0],html.match(/<section id="pause-screen"[^]*?<\/section>/)[0],'the same pause card as on Kongregate');
 const css=read('public/discord.css');assert.match(css,/user-select:none/);assert.match(css,/background:#fbf8f3/);assert.match(css,/background:#3f8a4a/,'the game\'s green main button');
 // The second button in buttons.css's own cream (--btn-second, -line, -edge, -text, -hover).
 const buttons=read('public/buttons.css'),token=name=>buttons.match(new RegExp(`--btn-second${name}:(#[0-9a-f]+)`))[1];
 assert.match(css,new RegExp(`\\.dc-second-button\\{[^}]*border:1px solid ${token('-line')};background:${token('')};color:${token('-text')};[^}]*box-shadow:0 3px 0 ${token('-edge')};`));
 assert.match(css,new RegExp(`\\.dc-second-button:hover\\{background:${token('-hover')}\\}`));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{[^\n]*\.dc-wait-spinner\{animation-duration:3s\}/);
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
 assert.equal((page.match(/verifyOtp\(/g)??[]).length,1,'one way in for every answer (a start, a new farm, a linked farm)');
 assert.match(page,/verifyOtp\(\{token_hash:hash,type:'magiclink'\}\)/);
 // The website's link page: only through Discord's window, only with our server's ticket; the ticket is never stored or logged.
 assert.equal((link.match(/sdk\.commands\.openExternalLink\(/g)??[]).length,2,'the privacy policy and the link page');
 assert.match(link,/sdk\.commands\.openExternalLink\(\{url:linkPageUrl\(valid\)\}\)/);
 assert.doesNotMatch(page,/discord-link\?|harvesttycoon\.com\//,'the link page\'s address is made in discord-link.js only');
 assert.doesNotMatch(page+link,/console\./,'no ticket in a log');
 assert.doesNotMatch(page,/store\.set\((?!LOCALE_KEY)/,'the page stores the language and nothing else');
 assert.match(page,/startUpdateCheck\(\{canReload:\(\)=>!\['authorize','choose','waiting'\]\.includes\(at\(\)\)\}\)/,'no reload while a card asks something');
 assert.equal((page.match(/link\.hello\(\)/g)??[]).length,1);
 assert.equal((page.match(/link\.authorize\(\)/g)??[]).length,3,'a new start after a yes, the Authorize to play tap, and Settings\' relink (the website names the Discord account)');
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
