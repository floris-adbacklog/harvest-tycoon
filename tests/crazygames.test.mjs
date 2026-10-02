import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createWrapperLink,trustedWrapper,portalLanguage,cleanInit,localStandIn,NS} from '../src/crazygames-link.js';
import {createWrapper,gameAddress,allowedOrigin,GAME_URL,GAME_ORIGIN,SDK_EVENTS} from '../crazygames/wrapper.js';
import {createFarmSession} from '../src/farm-session.js';
import {portal,portalOff,portalChat,portalLogIn,PORTAL_FEATURES,PRIVACY_URL} from '../public/portal.js';
import {setAppBadge} from '../public/app-badge.js';
import {portalTips,LOADING_TIPS,PORTAL_HIDDEN_TIPS} from '../public/loading-screen.js';
import {wikiArticle,wikiQuick,WIKI_TOPICS} from '../public/wiki-content.js';
import {renderLanguageSettings} from '../public/language-settings.js';
import {createChatUI} from '../src/chat-ui.js';
import {linkify} from '../src/popup-ui.js';
import {checkWrapper,buildCrazyGames,SDK_TAG} from '../scripts/build-crazygames.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const WRAPPER='https://harvest-tycoon.game-files.crazygames.com';
const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve();};
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// ---- Oct 2026: the game page's side of the talk with our wrapper on CrazyGames (src/crazygames-link.js) ----
function gamePage({local=false,wait=40,tokenWait=40}={}){
 const listeners=[],sent=[],parent={postMessage(data,target){sent.push({data,target});}};
 const win={parent,addEventListener(type,fn){if(type==='message')listeners.push(fn);},removeEventListener(){}};
 const link=createWrapperLink({win,parent,local,wait,tokenWait});
 const deliver=(data,{from=WRAPPER,source=parent}={})=>{for(const fn of listeners)fn({data,origin:from,source});};
 return {link,sent,deliver,parent};
}
const init=(extra={})=>({ns:NS,type:'init',environment:'crazygames',locale:'nl-NL',settings:{muteAudio:true,disableChat:false},userAvailable:true,user:{username:'Farmer.Joe'},...extra});
test('the game page says hello and listens only to its own wrapper on a crazygames.com address',async()=>{
 const f=gamePage(),hello=f.link.hello();
 assert.deepEqual(f.sent[0],{data:{ns:NS,type:'hello'},target:'*'},'hello carries nothing, so it may go anywhere');
 f.deliver(init({locale:'xx-1'}),{from:'https://evil.example'});
 f.deliver(init({locale:'xx-2'}),{from:'https://crazygames.com.evil.example'});
 f.deliver(init({locale:'xx-3'}),{from:'http://harvest.game-files.crazygames.com'});
 f.deliver(init({locale:'xx-4'}),{from:'http://localhost:8080'});
 f.deliver(init({locale:'xx-5'}),{source:{postMessage(){}}});
 f.deliver({...init({locale:'xx-6'}),ns:'someone-else'});
 f.deliver(init());
 const info=await hello;
 assert.deepEqual(info,{environment:'crazygames',locale:'nl-NL',settings:{muteAudio:true,disableChat:false},userAvailable:true,user:{username:'Farmer.Joe'}});
 assert.equal(f.link.origin,WRAPPER);
 for(const origin of [WRAPPER,'https://crazygames.com','https://www.crazygames.com','https://games.crazygames.com'])assert.ok(trustedWrapper(origin),origin);
 for(const origin of ['https://crazygames.com.evil.example','https://evilcrazygames.com','http://www.crazygames.com','http://localhost:3000',null])assert.ok(!trustedWrapper(origin),String(origin));
 assert.ok(trustedWrapper('http://localhost:3000',{local:true})&&trustedWrapper('http://127.0.0.1:8080',{local:true}),'a local wrapper only on a computer of our own');
});
test('a token request is answered only with its own id and type, from the wrapper that said init; the token goes to that address only',async()=>{
 const f=gamePage();const hello=f.link.hello();f.deliver(init());await hello;
 const asking=f.link.token(),request=f.sent.at(-1);
 assert.equal(request.target,WRAPPER);assert.equal(request.data.type,'token');assert.match(request.data.id,/^token-\d+$/);
 f.deliver({ns:NS,type:'token',id:'token-999',token:'wrong-id'});
 f.deliver({ns:NS,type:'authPrompt',id:request.data.id,ok:true});
 f.deliver({ns:NS,type:'token',id:request.data.id,token:'other-wrapper'},{from:'https://other.crazygames.com'});
 f.deliver({ns:NS,type:'token',id:request.data.id,token:'jwt-1'});
 assert.equal(await asking,'jwt-1');
 const guest=f.link.token();f.deliver({ns:NS,type:'token',id:f.sent.at(-1).data.id,token:null});assert.equal(await guest,null,'a guest has no token');
 assert.equal(await f.link.token(),null,'no answer in time: play as a guest');
 const prompt=f.link.authPrompt();f.deliver({ns:NS,type:'authPrompt',id:f.sent.at(-1).data.id,ok:false,error:'userCancelled'});
 assert.deepEqual(await prompt,{ok:false,error:'userCancelled'});
});
test('SDK events, settings and log-ins: only the known events go out, and changes reach the page',async()=>{
 const f=gamePage();const hello=f.link.hello();f.deliver(init());await hello;
 const before=f.sent.length;f.link.event('gameplayStart');f.link.event('requestAd');f.link.event('loadingStop');
 assert.deepEqual(f.sent.slice(before).map(s=>[s.data.name,s.target]),[['gameplayStart',WRAPPER],['loadingStop',WRAPPER]]);
 const settings=[],auth=[];f.link.onSettings(s=>settings.push(s));f.link.onAuth(u=>auth.push(u));
 f.deliver({ns:NS,type:'settings',settings:{disableChat:true,muteAudio:'yes'}});f.deliver({ns:NS,type:'auth',user:{username:'Farmer.Joe',profilePictureUrl:'x'}});f.deliver({ns:NS,type:'auth',user:null});
 f.deliver({ns:NS,type:'settings',settings:{disableChat:false}},{from:'https://other.crazygames.com'});
 assert.deepEqual(settings,[{muteAudio:false,disableChat:true}]);assert.deepEqual(auth,[{username:'Farmer.Joe'},null]);
});
test('without a wrapper the game still starts as a guest; a local wrapper counts only on a computer of our own',async()=>{
 const alone=gamePage();const info=await alone.link.hello();
 assert.deepEqual(info,{environment:'disabled',locale:null,settings:{muteAudio:false,disableChat:false},userAvailable:false,user:null});
 assert.equal(await alone.link.token(),null);
 const site=gamePage();const hello=site.link.hello();site.deliver(init({environment:'local'}),{from:'http://localhost:4000'});assert.equal((await hello).environment,'disabled','our real address ignores a localhost wrapper');
 const mine=gamePage({local:true});const local=mine.link.hello();mine.deliver(init({environment:'local'}),{from:'http://localhost:4000'});assert.equal((await local).environment,'local');
 const win={addEventListener(){},removeEventListener(){}};win.parent=win;
 assert.equal((await createWrapperLink({win,wait:10}).hello()).environment,'disabled','a page on its own');
 const stand=localStandIn({locale:'de-DE'});assert.deepEqual(await stand.hello(),{environment:'local',locale:'de-DE',settings:{muteAudio:false,disableChat:false},userAvailable:false,user:null});
 assert.equal(cleanInit({environment:'evil',user:{username:42}}).environment,'disabled');
});
test('the language comes from CrazyGames\' locale when the game speaks it, else English',()=>{
 for(const [locale,code] of [['pt-BR','pt'],['en-US','en'],['nl','nl'],['zh-CN','zh'],['ar-EG','ar'],['it-IT','en'],['',''],[null,null]])assert.equal(portalLanguage(locale),code||'en',String(locale));
});

// ---- The wrapper CrazyGames hosts (crazygames/) ----
function wrapper({environment='crazygames',sdk:change={}}={}){
 const posted=[],calls=[],listeners=[];let settingsListener,authListener;
 const contentWindow={postMessage(data,target){posted.push({data,target});}};
 const sdk={environment,
  user:{isUserAccountAvailable:true,systemInfo:{locale:'nl-NL'},getUser:async()=>({username:'Farmer.Joe',profilePictureUrl:'https://x/p.png'}),getUserToken:async()=>'jwt-token',showAuthPrompt:async()=>({username:'Farmer.Joe'}),addAuthListener(fn){authListener=fn;}},
  game:{settings:{muteAudio:true,disableChat:false},addSettingsChangeListener(fn){settingsListener=fn;},...Object.fromEntries([...SDK_EVENTS,'requestAd'].map(name=>[name,()=>calls.push(name)]))},...change};
 const w=createWrapper({sdk,frame:{contentWindow},environment,gameOrigin:GAME_ORIGIN,win:{addEventListener(type,fn){listeners.push(fn);},removeEventListener(){}}});
 const send=(data,{origin=GAME_ORIGIN,source=contentWindow}={})=>w.handle({data,origin,source});
 return {posted,calls,send,sdk,settings:next=>settingsListener(next),auth:user=>authListener(user)};
}
test('the wrapper answers hello with what the SDK knows (never the profile picture), only to our game frame',async()=>{
 const w=wrapper();
 await w.send({ns:NS,type:'hello'},{origin:'https://evil.example'});await w.send({ns:NS,type:'hello'},{source:{}});await w.send({ns:'x',type:'hello'});
 assert.equal(w.posted.length,0);
 await w.send({ns:NS,type:'hello'});
 assert.deepEqual(w.posted,[{data:{ns:NS,type:'init',environment:'crazygames',locale:'nl-NL',settings:{muteAudio:true,disableChat:false},userAvailable:true,user:{username:'Farmer.Joe'}},target:GAME_ORIGIN}]);
 assert.ok(allowedOrigin(GAME_ORIGIN,'crazygames')&&!allowedOrigin('http://localhost:3000','crazygames')&&allowedOrigin('http://localhost:3000','local'));
});
test('the wrapper hands a fresh token per request, null for a guest, and the log-in window only when asked',async()=>{
 const w=wrapper();
 await w.send({ns:NS,type:'token',id:'token-1'});
 await w.send({ns:NS,type:'token'},{});
 w.sdk.user.getUserToken=async()=>{throw {code:'userNotAuthenticated'};};await w.send({ns:NS,type:'token',id:'token-2'});
 w.sdk.user.getUserToken=async()=>{throw new Error('boom');};await w.send({ns:NS,type:'token',id:'token-3'});
 await w.send({ns:NS,type:'authPrompt',id:'authPrompt-4'});
 w.sdk.user.showAuthPrompt=async()=>{throw {code:'userCancelled'};};await w.send({ns:NS,type:'authPrompt',id:'authPrompt-5'});
 assert.deepEqual(w.posted.map(p=>p.data),[
  {ns:NS,type:'token',id:'token-1',token:'jwt-token'},{ns:NS,type:'token',id:'token-2',token:null},{ns:NS,type:'token',id:'token-3',token:null,error:'unexpectedError'},
  {ns:NS,type:'authPrompt',id:'authPrompt-4',ok:true},{ns:NS,type:'authPrompt',id:'authPrompt-5',ok:false,error:'userCancelled'}]);
 assert.ok(w.posted.every(p=>p.target===GAME_ORIGIN));
 const source=read('crazygames/wrapper.js');assert.equal((source.match(/showAuthPrompt\(\)/g)??[]).length,1,'one call, behind the authPrompt request');
});
test('the wrapper passes on only the SDK\'s game events, and settings and log-ins as they change',async()=>{
 const w=wrapper();
 for(const name of ['loadingStart','gameplayStart','requestAd','gameplayStop','happytime','loadingStop'])await w.send({ns:NS,type:'event',name});
 assert.deepEqual(w.calls,['loadingStart','gameplayStart','gameplayStop','happytime','loadingStop']);
 w.settings({muteAudio:false,disableChat:true});w.auth({username:'Farmer.Joe',profilePictureUrl:'x'});w.auth(null);
 assert.deepEqual(w.posted.map(p=>p.data),[{ns:NS,type:'settings',settings:{muteAudio:false,disableChat:true}},{ns:NS,type:'auth',user:{username:'Farmer.Joe'}},{ns:NS,type:'auth',user:null}]);
 const none=wrapper({environment:'disabled',sdk:{user:undefined,game:undefined}});await none.send({ns:NS,type:'hello'});await none.send({ns:NS,type:'token',id:'token-1'});await none.send({ns:NS,type:'event',name:'gameplayStart'});
 assert.deepEqual(none.posted.map(p=>p.data),[{ns:NS,type:'init',environment:'disabled',locale:null,settings:{muteAudio:false,disableChat:false},userAvailable:false,user:null},{ns:NS,type:'token',id:'token-1',token:null,error:'unexpectedError'}],'no SDK (an ad blocker): the game still starts, as a guest');
});
test('the wrapper shows our live game; a local game only while CrazyGames\' SDK runs locally',()=>{
 assert.equal(GAME_URL,'https://www.harvesttycoon.com/crazygames.html');
 assert.equal(gameAddress('?useLocalSdk=true&game=http://localhost:4789/crazygames.html','local'),'http://localhost:4789/crazygames.html');
 assert.equal(gameAddress('?game=https://evil.example/crazygames.html','local'),GAME_URL);
 assert.equal(gameAddress('?game=http://localhost:4789/crazygames.html','crazygames'),GAME_URL);
 assert.equal(gameAddress('','local'),GAME_URL);
});
test('the uploaded files: the SDK first, only relative paths, nothing to select, a frame that fills the page, a zip with index.html at its root',()=>{
 const html=read('crazygames/index.html'),js=read('crazygames/wrapper.js');
 assert.ok(html.includes(SDK_TAG));assert.ok(html.indexOf(SDK_TAG)<html.indexOf('src="wrapper.js"'));
 assert.match(html,/<script type="module" src="wrapper\.js"><\/script>/);assert.match(html,/user-select:none/);assert.match(html,/#game\{position:fixed;inset:0;width:100%;height:100%;border:0/);
 assert.match(js,/frame\.allow='autoplay; clipboard-write; web-share'/);
 const code=`${html}\n${js}`.replace(/<!--[^]*?-->/g,'').replace(/^\s*\/\/.*$/gm,'');
 assert.deepEqual([...code.matchAll(/https?:\/\/[^\s'"`)<,]+/g)].map(m=>m[0]).filter(url=>!url.startsWith('https://sdk.crazygames.com/')&&url!=='https://www.harvesttycoon.com/crazygames.html'&&url!=='https://www.harvesttycoon.com'),[],'no address besides the SDK and our game');
 assert.deepEqual(checkWrapper(),['index.html','wrapper.js']);
 assert.doesNotMatch(read('package.json').match(/"build:static": "[^"]*"/)[0],/crazygames/,'not part of the Vercel build');
 assert.match(read('package.json'),/"build:crazygames": "node scripts\/build-crazygames\.mjs"/);assert.match(read('.gitignore'),/^dist-crazygames\/$/m);
 let zip=true;try{execFileSync('zip',['-v'],{stdio:'ignore'});}catch{zip=false;}
 if(!zip)return;
 const out=mkdtempSync(join(tmpdir(),'cg-zip-'));
 try{const made=buildCrazyGames({out});assert.equal(made.zip,join(out,'harvest-tycoon-crazygames.zip'));const list=execFileSync('unzip',['-Z1',made.zip],{encoding:'utf8'}).trim().split('\n').sort();assert.deepEqual(list,['index.html','wrapper.js']);}
 finally{rmSync(out,{recursive:true,force:true});}
});

// ---- The game page: public/crazygames.html, served by Vercel ----
test('crazygames.html: the loading screen and the farm, without tracking, cookie banner, sign-in, footer, links, app or search engines',()=>{
 const html=read('public/crazygames.html'),play=read('public/play.html');
 for(const banned of [/googletagmanager|GTM-|dataLayer|gtag\(/,/cookie-consent|harvestConsent|Cookie settings/,/account-card|account-form|type="email"|type="password"|Sign in|Create account|social-login|data-provider/,/<footer|site-legal|footer-social/,/rel="manifest"|apple-touch|apple-mobile-web-app|mobile-web-app-capable/,/og:|twitter:|rel="canonical"|ld\+json/,/browser-gate|data-gate/,/\/partners|\/wiki"|facebook\.com|tiktok\.com|instagram\.com/,/cloud\/cloud\.js|i18n-boot\.js/])assert.doesNotMatch(html,banned,String(banned));
 assert.match(html,/<html lang="en" data-portal="crazygames" class="i18n-wait">/);assert.match(html,/<meta name="robots" content="noindex, nofollow">/);assert.match(html,/<meta name="harvest-version" content="dev">/);
 assert.match(html,/<script type="module" src="\/cloud\/crazygames\.js"><\/script>/);
 assert.match(html,/<p class="portal-privacy">By playing you agree to our <a href="https:\/\/www\.harvesttycoon\.com\/privacy" target="_blank" rel="noopener">Privacy Policy<\/a>\.<\/p>/,'a notice, never a pop-up');
 for(const id of ['loading-screen','loading-copy','loading-progress','loading-percent','loading-tip-text','loading-tip-icon','farm-host','pause-screen','pause-copy','pause-message','pause-retry'])assert.match(html,new RegExp(`id="${id}"`),id);
 assert.ok(play.includes('<section id="loading-screen" class="loading-screen farm-loading" aria-labelledby="loading-copy">')&&html.includes('<section id="loading-screen" class="loading-screen farm-loading" aria-labelledby="loading-copy">'),'the same loading screen as play.html');
 assert.match(read('public/crazygames.css'),/user-select:none/);
 assert.doesNotMatch(read('public/sitemap.xml'),/crazygames/);
 const rule=JSON.parse(read('vercel.json')).headers.find(r=>r.source==='/crazygames.html'),get=key=>rule.headers.find(h=>h.key===key)?.value;
 assert.equal(get('Cache-Control'),'no-cache');assert.equal(get('X-Robots-Tag'),'noindex, nofollow');
 assert.equal(get('Content-Security-Policy'),'frame-ancestors https://*.crazygames.com https://crazygames.com capacitor://app.crazygames.com http://localhost:* http://127.0.0.1:*');
 assert.ok(!JSON.parse(read('vercel.json')).headers.some(r=>r.source!=='/crazygames.html'&&r.headers.some(h=>h.key==='Content-Security-Policy')),'only this page may be framed by them');
 const build=read('scripts/build-static.mjs');assert.match(build,/readFileSync\('public\/crazygames\.html','utf8'\)\.replace\('<meta name="harvest-version" content="dev">'/);assert.match(build,/writeFileSync\('dist-static\/crazygames\.html',crazy\)/);
 const cloud=read('scripts/build-cloud.mjs');
 assert.match(cloud,/entry:\{cloud:'src\/main\.js','game-cloud':'src\/game-cloud\.js',partners:'src\/partners\.js'\}/,'the website\'s files are made as before');
 assert.match(cloud,/outDir:'public\/cloud',emptyOutDir:false,lib:\{entry:\{crazygames:'src\/crazygames\.js'\}/);
});
test('src/crazygames.js: its own sign-ins, the token on every start, a guest otherwise, never the log-in window by itself',()=>{
 const js=read('src/crazygames.js'),supabase=read('src/supabase.js');
 assert.match(js,/user:'harvest-tycoon:cg-user',guest:'harvest-tycoon:cg-guest'/);
 assert.match(supabase,/const portalPage=Boolean\(globalThis\.document\?\.documentElement\?\.dataset\?\.portal\);\nexport let supabase=isConfigured&&!portalPage\?createClient\(url,key,\{auth:\{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'\}\}\):null;/,'the website\'s saved sign-in is never read there');
 assert.match(supabase,/detectSessionInUrl:false,storageKey\}/);
 assert.match(js,/const token=await link\.token\(\);/);assert.match(js,/askServer\(\{op:'crazygames',token,language:chosenLanguage\(\)\},sent\?\.access_token\)/);assert.match(js,/askServer\(\{op:'guest',language:chosenLanguage\(\)\}\)/);
 assert.match(js,/verifyOtp\(\{token_hash:tokenHash,type:'magiclink'\}\)/);assert.match(js,/`\$\{functionsUrl\}\/crazygames-auth\?forceFunctionRegion=eu-central-1`/,'in Frankfurt, next to the database, as farm-api');
 // Oct 2026 review: the token is asked whenever CrazyGames has accounts here (not only when init named a user); a server that is down is
 // asked again later each time; a trip to the village that does not start gives CrazyGames its gameplay back; the same player told
 // twice does not reload the farm.
 assert.match(js,/async function account\(\)\{\n  if\(info\.userAvailable\)\{\n   const token=await link\.token\(\);/);
 assert.match(js,/retryTimer=setTimeout\(\(\)=>void start\(\),Math\.min\(60000,8000\*2\*\*retries\+\+\)\);/);assert.match(js,/await account\(\);await session\.open\(\);retries=0;/);
 assert.match(js,/try\{await travel\(to\);\}catch\(error\)\{sdk\('loadingStop'\);ready=true;sdk\('gameplayStart'\);throw error;\}/);
 assert.match(js,/link\.onAuth\(user=>\{if\(\(user\?\.username\?\?null\)===\(info\.user\?\.username\?\?null\)\)return;/);
 assert.match(js,/get userAvailable\(\)\{return info\.userAvailable;\}/);
 assert.match(js,/firstLoad:\(\)=>\(\{source:\{src:'crazygames',ref:'crazygames\.com'\}\}\)/);
 assert.equal((js.match(/authPrompt\(\)/g)??[]).length,1,'only through the portal, from a tap');assert.match(js,/showAuthPrompt:\(\)=>link\.authPrompt\(\)/);
 assert.match(js,/if\(!framed&&!local\)location\.replace\('\/'\);/,'on its own, our address sends the visitor to the website');
 assert.doesNotMatch(js,/window\.top|top\.location/,'never CrazyGames\' own page');
 assert.doesNotMatch(js,/trackCommerce|trackInvite|pushEvent|dataLayer/,'no trackers');
});

// ---- The same farm, session and bridge as the website (src/farm-session.js) ----
test('the farm session builds the same bridge as the website\'s (src/main.js), so a change to one shows up in the other',()=>{
 const main=read('src/main.js'),session=read('src/farm-session.js');
 const assigned=src=>[...new Set([...src.matchAll(/\bbridge\.(\w+)=/g)].map(m=>m[1]))].sort();
 assert.deepEqual(assigned(session),assigned(main));
 for(const line of ["const bridge={playerId,presence,serverNow:initial.serverNow,takeInitial(){const data=initial;initial=null;return data;},","async leaderboard(category='level'){if(ticket!==generation)throw new Error('Your session has ended.');","watchConnection(watch){watchers.add(watch);return()=>watchers.delete(watch);}}",
  "if(initial.profile?.player_id!==user.id){giveUp();reopen=true;return;}","data.profile?.player_id!==user.id)throw new Error('Your session has ended.');connection.ok();return data;}","else if(error.status===409)unavailable(error.message);",
  "else if(!refused(error.status)&&!['player_search','player_profile','avatar'].includes(body.operation))connection.problem(reasonOf(error,","presence.setClock?.(initial.serverNow);",
  "const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');"])
  {assert.ok(main.includes(line),`main.js: ${line}`);assert.ok(session.includes(line),`farm-session.js: ${line}`);}
 assert.ok(main.includes('signOut,async leaderboard')&&session.includes('signOut:()=>signedOut(),async leaderboard'));
});
function sessionPage({user={id:'A'},load}={}){
 const frames=[],phases=[],signedOut=[],paused=[],calls=[],host={children:[],append(n){this.children.push(n);},replaceChildren(){for(const c of this.children)c.removed=true;this.children=[];}};
 const doc={hidden:false,body:{dataset:{}},createElement(){const frame={remove(){frame.removed=true;},contentWindow:{}};frames.push(frame);return frame;},addEventListener(){}};
 const win={location:{search:'',href:'https://www.harvesttycoon.com/crazygames.html',assign(){throw new Error('no navigation');}},history:{replaceState(){}},addEventListener(){}};
 const session=createFarmSession({supabase:{},verifiedUser:async()=>user,farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:user.id},state:{coins:1},serverNow:5};},
  fetchLeaderboard:async()=>({rows:[]}),createFarmPresence:()=>({dispose(){},snapshot:()=>({})}),createChatClient:()=>({dispose(){}}),host:()=>host,
  phase:(value,message)=>phases.push(message?[value,message]:[value]),signedOut:message=>signedOut.push(message??null),unavailable:(message,options)=>paused.push([message,options.retrying]),
  firstLoad:()=>({source:{src:'crazygames',ref:'crazygames.com'}}),extend:bridge=>{bridge.portal={name:'crazygames'};},doc,win,nav:{onLine:true},timers:{setTimeout:()=>0,clearTimeout(){},setInterval:()=>0}});
 return {session,frames,phases,signedOut,paused,calls,win,host};
}
test('the farm opens through the same steps: page first, farm with its source, then the bridge with the portal; no payments here',async()=>{
 const p=sessionPage();await p.session.open();
 assert.deepEqual(p.phases,[['checking','Checking your account…'],['checking','Opening your farm…'],['authenticated']]);
 assert.deepEqual(p.calls,[{operation:'load',source:{src:'crazygames',ref:'crazygames.com'}}]);
 assert.equal(p.frames[0].src,'/farm.html');const bridge=p.win.harvestBridge;
 assert.equal(bridge.portal.name,'crazygames');assert.equal(bridge.takeInitial().state.coins,1);assert.equal(bridge.takeInitial(),null);
 assert.equal(bridge.notifications,null,'no reminders or push');
 await assert.rejects(bridge.payments({operation:'catalog'}),/Purchases are not available here/);await assert.rejects(bridge.checkout('50','r1'),/Purchases are not available here/);
 await bridge.travel('village');assert.equal(p.frames[0].src,'/farm.html?world=village');assert.deepEqual(p.calls.at(-1),{operation:'load'},'a trip carries no source');
});
test('an ended sign-in, a conflict and a refusal: the same answers as the website, through the page\'s own screens',async()=>{
 let reply=null;const p=sessionPage({load:body=>{if(reply&&body.operation!=='load')throw reply;return {profile:{player_id:'A'},state:{},serverNow:1};}});await p.session.open();
 reply=Object.assign(new Error('Sign in again'),{status:401});await assert.rejects(p.win.harvestBridge.request({operation:'action'}));assert.deepEqual(p.signedOut,['Your session has ended.']);
 const q=sessionPage({load:body=>{if(body.operation!=='load')throw Object.assign(new Error('Your farm changed in another tab.'),{status:409});return {profile:{player_id:'A'},state:{},serverNow:1};}});await q.session.open();
 await assert.rejects(q.win.harvestBridge.request({operation:'action'}));assert.deepEqual(q.paused,[['Your farm changed in another tab.',false]]);assert.equal(q.frames[0].removed,true);assert.equal(q.win.harvestBridge,undefined);
 const nobody=sessionPage({user:null});await nobody.session.open();assert.deepEqual(nobody.signedOut,[null]);assert.equal(nobody.calls.length,0);
 let first=true;const other=sessionPage({load:()=>{const id=first?'B':'A';first=false;return {profile:{player_id:id},state:{},serverNow:1};}});await other.session.open();await settle();
 assert.equal(other.frames[0].removed,true,'never another player\'s farm');assert.equal(other.frames.length,2,'it asks again');assert.equal(other.win.harvestBridge.playerId,'A');
});

// ---- The farm on CrazyGames: what steps aside (public/portal.js, public/portal.css), and the website untouched ----
const CRAZY={name:'crazygames',guest:true,features:Object.fromEntries(PORTAL_FEATURES.map(f=>[f,false])),settings:{muteAudio:false,disableChat:false}};
test('the portal is read from the page around the game; on the website there is none and every feature is on',()=>{
 const own={};own.parent=own;
 assert.equal(portal(undefined),null);assert.equal(portal(own),null);assert.equal(portal({parent:{}}),null);assert.equal(portal({parent:{harvestBridge:{pending:true}}}),null);
 assert.equal(portal({parent:{harvestBridge:{portal:CRAZY}}}),CRAZY);assert.equal(portal({parent:{harvestBridge:{pending:true},harvestPortal:CRAZY}}),CRAZY,'before the farm is there too');
 assert.equal(portal({get parent(){throw new Error('cross-origin');}}),null);
 for(const feature of PORTAL_FEATURES){assert.equal(portalOff(feature,null),false,feature);assert.equal(portalOff(feature,CRAZY),true,feature);}
 assert.deepEqual(PORTAL_FEATURES,['payments','invite','share','email','reminders','app','signOut','cookies','translate','links']);
 assert.equal(portalChat(null),'on');assert.equal(portalChat(CRAZY),'guest');
 // Oct 2026 review: where CrazyGames has no accounts (isUserAccountAvailable false) a guest cannot log in, so no chat and no log-in button.
 assert.equal(portalChat({...CRAZY,userAvailable:false}),'off');assert.equal(portalChat({...CRAZY,guest:false,userAvailable:false}),'on');
 assert.equal(portalLogIn(CRAZY),true);assert.equal(portalLogIn({...CRAZY,userAvailable:true}),true);assert.equal(portalLogIn({...CRAZY,userAvailable:false}),false);assert.equal(portalLogIn(null),false);assert.equal(portalChat({...CRAZY,guest:false}),'on');assert.equal(portalChat({...CRAZY,guest:false,settings:{disableChat:true}}),'off');
 assert.equal(PRIVACY_URL,'https://www.harvesttycoon.com/privacy');
 assert.equal(linkify('See https://www.harvesttycoon.com/partners'),'See <a href="https://www.harvesttycoon.com/partners" target="_blank" rel="noopener noreferrer">www.harvesttycoon.com/partners</a>','the website keeps its links');
});
test('every control CrazyGames does not allow is hidden by the portal flag, and nothing in portal.css reaches the website',()=>{
 const css=read('public/portal.css'),farm=read('public/farm.html');
 const sources=['public/farm.html','public/boosts-ui.js','public/pass-ui.js','public/family-ui.js','public/progression-ui.js','src/player-profiles.js','public/reminder-nudge.js','public/wiki-content.js','src/ui.js','src/chat-ui.js','public/mobile-ui.js'].map(read).join('\n');
 const hidden=['#diamond-store','[data-shop-jump="diamond-store"]','.get-diamonds','#shop-pass','.pass-paid-box','.pass-cell.is-paid','#invite-button','[data-menu-action="invite-button"]','.family-invite-friend','.level-up-share','.farmer-share',
  '#email-button','#email-menu-entry','#email-settings','#notify-settings','.reminder-nudge','#app-settings','.wiki-install','#logout-player','#cookie-settings','.chat-translate'];
 const rules=css.replace(/\/\*[^]*?\*\//g,'').replace(/@media[^{]*\{([^{}]*\{[^}]*\})*\s*\}/g,'');
 const none=[...rules.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter(([,,body])=>/display:none!important/.test(body)).flatMap(([,selectors])=>selectors.split(',').map(s=>s.trim()));
 for(const selector of hidden){
  assert.ok(none.includes(`html[data-portal] ${selector}`),`hidden: ${selector}`);
  const name=selector.match(/[#.]([\w-]+)|"([\w-]+)"/).slice(1).find(Boolean);assert.ok(sources.includes(name),`still in the game: ${name}`);
 }
 for(const [,selectors] of css.replace(/\/\*[^]*?\*\//g,'').replace(/@media[^{]*\{/g,'').matchAll(/([^{}]+)\{[^}]*\}/g))for(const selector of selectors.split(',').map(s=>s.trim()).filter(Boolean))
  assert.ok(selector.startsWith('html[data-portal]')||/(^|\s)\.portal-/.test(selector)||selector.startsWith('.i18n-wait .portal-'),`scoped to the portal: ${selector}`);
 const sheets=[...farm.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m=>m[1]);assert.ok(sheets.includes('/portal.css')&&sheets.at(-1)==='/pwa-layout.css');
 assert.doesNotMatch(farm,/data-portal/,'the farm page is only marked inside CrazyGames (src/portal-ui.js)');
});
test('the farm frame on CrazyGames: SDK events at farm ready, no purchases, the privacy notice, Save your farm for a guest',()=>{
 const cloud=read('src/game-cloud.js'),ui=read('src/portal-ui.js');
 assert.match(cloud,/const portal=bridge\.portal\?\?null;\n if\(!window\.harvestInitialFarm\)\{if\(portal\)portal\.reopen\(\);else location\.replace\('\/play\.html'\);\}else\{/,'the website\'s sign-in page never opens inside CrazyGames');
 assert.match(cloud,/if\(portal\)createPortalUI\(\{portal\}\);/);
 assert.match(cloud,/if\(await farmReady\)\{\n   \/\/[^\n]*\n   if\(portal\)\{portal\.event\('loadingStop'\);portal\.event\('gameplayStart'\);\}/);
 assert.match(cloud,/const shop=!portal;\n   if\(shop\)showPaymentReturn\(bridge\);/);assert.match(cloud,/if\(shop\)\{createOfferUI\(bridge\);\n   await createStarterPackUI\(bridge\);\}/);
 assert.match(ui,/doc\.documentElement\.dataset\.portal=portal\.name;/);assert.match(ui,/button\.textContent='Save your farm: log in with CrazyGames';/);assert.match(ui,/if\(portal\.guest&&portalLogIn\(portal\)\)\{/);
 assert.match(ui,/button\.onclick=async\(\)=>\{button\.disabled=true;try\{await portal\.showAuthPrompt\(\);\}/,'only from a tap');
 assert.match(read('public/boosts-ui.js'),/track\('diamond_shop_view'\);if\(portalOff\('payments'\)\)return;try\{catalog=await bridge\(\)\.payments/,'the shop never asks for the packs there');
 assert.match(read('public/pass-ui.js'),/if\(catalog\|\|portalOff\('payments'\)\|\|/);assert.match(read('public/pass-ui.js'),/if\(pending\|\|portalOff\('payments'\)\|\|/);
 assert.match(read('public/farm-share.js'),/const available=\(\)=>Boolean\(capture\)&&!portalOff\('share'\)&&Boolean\(canCapture\(\)\);/);
 assert.match(read('public/game.js'),/function setEmailCheck\(check\)\{if\(check\)emailAccount=portalOff\('email'\)\?\{\.\.\.check,needed:false,canChange:false\}:check;/);
 assert.match(read('public/game.js'),/farmAudio\.muteFromOutside\(soundPortal\.settings\?\.muteAudio\);const stop=soundPortal\.onSettings\?\.\(next=>farmAudio\.muteFromOutside\(next\?\.muteAudio\)\);/,'CrazyGames\' mute switch wins');
});
test('a language picked in Settings reloads our own page only, never CrazyGames\' own',()=>{
 let reloaded=0;const saved=globalThis.window,doc=globalThis.document;
 globalThis.document??={querySelector:()=>null};const select={innerHTML:'',value:'',addEventListener:(type,fn)=>{select.on=fn;},closest:()=>null};
 globalThis.window={parent:{harvestPortal:{...CRAZY,reload:()=>reloaded++}},get top(){throw new Error('window.top must not be touched');}};
 try{renderLanguageSettings(select);select.value='de';select.on();assert.equal(reloaded,1);}
 finally{if(saved)globalThis.window=saved;else delete globalThis.window;if(!doc)delete globalThis.document;}
});
test('loading tips, the wiki and the chat leave out what is not there on CrazyGames; the website keeps everything',()=>{
 const crazy={documentElement:{dataset:{portal:'crazygames'}}};
 assert.ok(portalTips(LOADING_TIPS,crazy).length<LOADING_TIPS.length);assert.ok(portalTips(LOADING_TIPS,crazy).every(([picture])=>!PORTAL_HIDDEN_TIPS.includes(picture)));assert.equal(portalTips(LOADING_TIPS,{documentElement:{dataset:{}}}),LOADING_TIPS);
 const wiki=portal=>WIKI_TOPICS.map(t=>wikiArticle(t.id,{level:120,portal}).html).join('\n');
 const crazyWiki=wiki(true),site=wiki(false);
 for(const gone of [/Buying diamonds/,/Play it as an app/,/Install the app/,/Invite a friend/,/Confirm your email/,/Share my farm/,/delete-account/,/Stripe;/,/Reminders/,/Forgot your password/,/home screen/])
  {assert.doesNotMatch(crazyWiki,gone,String(gone));assert.match(site,gone,`the website keeps ${gone}`);}
 assert.match(crazyWiki,/The chat is for farmers who are logged in with CrazyGames/);assert.match(crazyWiki,/href="https:\/\/www\.harvesttycoon\.com\/privacy"/);
 assert.doesNotMatch(wikiQuick({portal:true}),/>App</);assert.match(wikiQuick({}),/>App</);
 assert.match(read('src/chat-ui.js'),/if\(portalOff\('translate'\)\)\{const at=items\.findIndex/);assert.match(read('src/popup-ui.js'),/export const linkify=text=>portalOff\('links'\)\?esc\(text\):/);
 assert.match(read('src/popup-ui.js'),/const offered=button&&!\(portalOff\('links'\)&&/);
});
function chatPage(portalState){
 const el=()=>{const node={hidden:true,attrs:{},kids:{},open:false,setAttribute(k,v){node.attrs[k]=v;},querySelector(sel){return node.kids[sel]??=el();},showModal(){node.open=true;},close(){node.open=false;}};return node;};
 const button=el(),dot=el(),appended=[];
 const doc={getElementById:id=>id==='chat-button'?button:id==='chat-dot'?dot:null,createElement:()=>el(),body:{append:node=>appended.push(node)},querySelectorAll:()=>[]};
 let prompts=0;const changes=new Set();const portal={...portalState,showAuthPrompt:async()=>{prompts++;return {ok:true};},onSettings:fn=>{changes.add(fn);return()=>changes.delete(fn);}};
 const chat=createChatUI({bridge:{chat:{},playerId:'A',portal},profiles:null,doc,win:{addEventListener(){}}});
 return {chat,button,appended,prompts:()=>prompts,settle:next=>{portal.settings=next;for(const fn of changes)fn(next);}};
}
test('the chat on CrazyGames: gone when CrazyGames switches it off; a guest gets one window with CrazyGames\' log-in, opened only by a tap',async()=>{
 const off=chatPage({...CRAZY,guest:false,settings:{disableChat:true}});assert.equal(off.chat,null);assert.equal(off.button.hidden,true);assert.equal(off.appended.length,0);
 const guestOff=chatPage({...CRAZY,settings:{disableChat:true}});assert.equal(guestOff.chat,null);
 const guest=chatPage(CRAZY);
 assert.equal(guest.button.hidden,false);assert.equal(guest.appended.length,1);const dialog=guest.appended[0];
 assert.equal(dialog.open,false,'never opens by itself');assert.match(dialog.innerHTML,/Log in with CrazyGames to chat/);assert.equal(guest.prompts(),0);
 guest.button.onclick();assert.equal(dialog.open,true);
 await dialog.kids['[data-portal-login]'].onclick();assert.equal(guest.prompts(),1);assert.equal(dialog.open,false);
 assert.equal(guest.chat.role,null);
 // Oct 2026 review: CrazyGames switching the chat off during play takes the guest's chat button and window away too.
 guest.button.onclick();assert.equal(dialog.open,true);guest.settle({muteAudio:false,disableChat:true});assert.equal(guest.button.hidden,true);assert.equal(dialog.open,false);
 guest.chat.open();assert.equal(dialog.open,false,'gone until the next start');
 const noAccounts=chatPage({...CRAZY,userAvailable:false});assert.equal(noAccounts.chat,null);assert.equal(noAccounts.appended.length,0,'no log-in where CrazyGames has none');
});
test('the privacy policy says what we get from CrazyGames, about guests, no trackers there and how to delete a farm',()=>{
 const html=read('public/privacy.html');
 assert.match(html,/<h3 id="crazygames">Playing on CrazyGames<\/h3>/);assert.match(html,/<strong>CrazyGames user ID<\/strong> and <strong>username<\/strong>/);
 assert.match(html,/we make a guest account for your farm, without a name, email address or any other details from you/);
 assert.match(html,/on CrazyGames we load no Google Analytics, Meta Pixel, TikTok Pixel or other trackers/);assert.match(html,/<strong>Deleting your farm:<\/strong> email <a href="mailto:info@harvesttycoon\.com">/);
 for(const key of ['cg-user','cg-guest','cg-locale'])assert.match(html,new RegExp(`<code>harvest-tycoon:${key}</code>`),key);
 assert.match(read('src/crazygames.js'),/const LOCALE_KEY='harvest-tycoon:cg-locale';/);
});

// Oct 2026 review: inside CrazyGames the top window is theirs; reading its navigator throws, so the badge stays in our own frame and
// never becomes an error in the console.
test('the app badge never reaches into CrazyGames\' own page',async()=>{
 const set=[];const own={navigator:{setAppBadge:async n=>{set.push(n);}},caches:null};
 own.top={get navigator(){throw new Error('cross-origin');}};
 await setAppBadge(3,own);assert.deepEqual(set,[3]);
 const site={navigator:{setAppBadge:async n=>{set.push(`top ${n}`);}}};const frame={navigator:{setAppBadge:async()=>set.push('frame')},top:site};
 await setAppBadge(2,frame);assert.deepEqual(set,[3,'top 2'],'on the website the installed app\'s own window still gets it');
});
