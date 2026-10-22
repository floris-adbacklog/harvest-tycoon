import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {webcrypto,createHash} from 'node:crypto';
import {reminderSource} from '../public/app-links.js';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').split('\n').filter(line=>!line.startsWith('import ')).join('\n');
const accountForm=readFileSync(new URL('../src/account-form.js',import.meta.url),'utf8').replace(/^export /gm,'');
const connectionModule=readFileSync(new URL('../src/connection.js',import.meta.url),'utf8').replace(/^export /gm,'');
const socialModule=readFileSync(new URL('../src/social-login.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const inviteModule=readFileSync(new URL('../src/invite-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const partnerModule=readFileSync(new URL('../src/partner-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const sourceModule=readFileSync(new URL('../src/source-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const browserTipModule=readFileSync(new URL('../src/browser-tip.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const appSignInModule=readFileSync(new URL('../src/app-sign-in.js',import.meta.url),'utf8').replace(/^export /gm,'');
// How you sign in (17 Oct 2026): main.js gives the farm bridge.signIn and bridge.setPassword from it; its letter picture (visual-icons.js) is
// only drawn in the farm's Settings, never here.
const signInModule=readFileSync(new URL('../src/account-sign-in.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
let uuid=0;
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
// app: the page is marked as our Android app (public/android-app.js; public/android.js androidApp()). providers: what Supabase has switched
// on; buttons: the page's Google and Facebook buttons are there (nodes 'provider-google' and 'provider-facebook').
// play: the app sells through Google Play (app 1.1, public/android.js playBilling); playStore: the fake app it talks to (src/play-store.js).
// apple, appStore: the same for the iPhone app 1.1 and the App Store (Oct 2026, public/android.js appStoreBilling, src/app-store.js).
// web: the Galaxy Store app, which sells through Stripe like the website (Oct 2026, public/android.js webBilling).
// signIn: the iPhone app 1.3 signs in with every provider through its own sheets (16 Oct 2026, public/android.js appSignIn, src/app-sign-in.js);
// tab: the tab's sessionStorage (OAUTH_KEY).
function fixture({navigation=null,discarded=false,ua='',user=null,load,online=true,storage,authApi={},rpc,location={origin:'https://farm.example'},app=false,providers=[],buttons=false,paymentRequest,play=false,playStore=null,apple=false,appStore=null,web=false,win={},signIn=false,tab,
 playProducts={'150':'diamonds_150','500':'diamonds_500',starter:'starter_pack'},appleProducts={'150':'diamonds_150','500':'diamonds_500',starter:'starter_pack'},appleSellsOffer=false}={}){
 const nodes=new Map(),events={},frames=[],calls=[],analytics=[],game=[],timers=[],lookups=[],opened=[];let authCallback,currentUser=user,clock=1_000_000,nextTimer=1;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',disabled:false,dataset:{},children:[],textContent:'',setAttribute(){},toggleAttribute(name,on){(this.attrs??={})[name]=Boolean(on);},removeAttribute(name){if(this.attrs)delete this.attrs[name];},focus(){},scrollIntoView(){},replaceChildren(...items){for(const old of this.children)if(!items.includes(old))old.removed=true;this.children=items;},append(node){this.children.push(node);},remove(){this.removed=true;},classList:(set=>({add:name=>set.add(name),remove:name=>set.delete(name),contains:name=>set.has(name)}))(new Set()),contentWindow:{}});return nodes.get(id);};
 const providerButtons=buttons?(Array.isArray(buttons)?buttons:['google','facebook']).map(provider=>Object.assign(element(`provider-${provider}`),{dataset:{provider}})):[];
 // Their row (.social-buttons): prepend moves a button to the front, as the page's DOM does (the iPhone app 1.3 puts Apple first).
 const row={prepend(node){const i=providerButtons.indexOf(node);if(i>=0)providerButtons.splice(i,1);providerButtons.unshift(node);}};for(const button of providerButtons)button.parentElement=row;
 const document={body:{dataset:{}},hidden:false,wasDiscarded:discarded,getElementById:element,querySelector:element,querySelectorAll:selector=>selector==='[data-provider]'?providerButtons:[],createElement(tag){const frame=element('frame'+frames.length);frames.push(frame);return frame;},addEventListener(name,fn){events[name]=fn;}};
 const window={addEventListener(name,fn){events[name]=fn;},...win};
 const supabase={auth:{onAuthStateChange(fn){authCallback=fn;},async signOut(){currentUser=null;authCallback('SIGNED_OUT',null);return{};},...authApi},...(rpc?{rpc}:{})};
 const context=vm.createContext({createFarmPresence:()=>({dispose(){},snapshot(){return {};}}),document,window,navigator:{onLine:online,userAgent:ua},Date:{now:()=>clock},location,localStorage:storage&&{getItem:key=>storage[key]??null,setItem(key,value){storage[key]=String(value);},removeItem(key){delete storage[key];}},
  sessionStorage:tab&&{getItem:key=>tab[key]??null,setItem(key,value){tab[key]=String(value);},removeItem(key){delete tab[key];}},clearInterval(){},URL,URLSearchParams,queueMicrotask,TextEncoder,appSignIn:()=>signIn,
  // A delay of 0 runs at once; a real delay waits until the test moves the clock (see advance).
  setTimeout:(fn,ms)=>{if(!ms){queueMicrotask(fn);return 0;}const id=nextTimer++;timers.push({id,at:clock+ms,fn});return id;},clearTimeout:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);},setInterval(){},supabase,isConfigured:true,verifiedUser:async()=>{lookups.push(1);return currentUser;},validUsername:()=>true,chosenLanguage:()=>'en',playBadge:code=>`/assets/badges/google-play-${code}.webp`,appStoreBadge:code=>`/assets/badges/app-store-${code}.webp`,socialProviders:async()=>providers,androidApp:()=>app,listenAppPush:()=>null,playBilling:()=>play,createPlayStore:()=>playStore,PLAY_ERRORS:{unavailable:'Google Play is not available right now.',error:'Google Play could not start the purchase.',owned:'Unfinished purchase.'},PLAY_PRODUCTS:playProducts,
  appStoreBilling:()=>apple,webBilling:()=>web,createAppStore:()=>appStore,APP_STORE_ERRORS:{unavailable:'The App Store is not available right now.',not_found:'Not in the App Store yet.',error:'The App Store could not start the purchase.'},APPLE_PRODUCTS:appleProducts,APPLE_SELLS_OFFER:appleSellsOffer,appleProduct:pack=>pack==='season'?null:appleProducts[pack]??null,crypto:{randomUUID:()=>'00000000-0000-4000-8000-00000000000'+(++uuid),getRandomValues:bytes=>webcrypto.getRandomValues(bytes),subtle:webcrypto.subtle},forgetAppPushLink(){},...(paymentRequest?{paymentRequest}:{}),cloudError:e=>e.message,fetchLeaderboard:async()=>({rows:[]}),trackSignUp(){},trackCommerce(){},trackAuth:(step,params)=>analytics.push({step,...params}),startPwa(){},startUpdateCheck(){},guardPurchases:bridge=>bridge,stopPageZoom(){},gameViewport(){},startTranslation(){},renderLanguageSwitch(){},openIntent:()=>null,withoutOpen:href=>href,reminderSource,openedBy:source=>{if(source)opened.push(source);},performance:navigation?{getEntriesByType:kind=>kind==='navigation'?[{type:navigation}]:[]}:undefined,startPlayerCounts(){},trackGame:(event,params)=>game.push({event,...params}),createNotifications:()=>({}),createChatClient:()=>({dispose(){}}),startLoadingTips:()=>()=>{},ACCOUNT_STEPS:{},farmHandOver:(win,screen)=>({wait(){screen.hidden=true;},stop(){}}),functionsUrl:null,isNewRegistration:()=>true,farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:currentUser.id},state:{coins:180},serverNow:Date.now()};}});

 vm.runInContext(accountForm,context);vm.runInContext(connectionModule,context);vm.runInContext(socialModule,context);vm.runInContext(inviteModule,context);vm.runInContext(partnerModule,context);vm.runInContext(sourceModule,context);vm.runInContext(browserTipModule,context);vm.runInContext(appSignInModule,context);vm.runInContext(signInModule,context);vm.runInContext(source,context);
 // Moves the clock forward, running every timer that falls due on the way (and the ones they start).
 const advance=async ms=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();clock=Math.max(clock,next.at);next.fn();await settle();}clock=end;await settle();};
 return {analytics,game,lookups,opened,context,document,window,frames,calls,nodes,events,timers,advance,buttons:providerButtons,goOffline(){context.navigator.onLine=false;},goOnline(){context.navigator.onLine=true;},async auth(event,next){currentUser=next;authCallback(event,next?{user:next}:null);await settle();}};
}
test('a new visitor does not load or initialize any farm',async()=>{
 const f=fixture();await settle();assert.equal(f.document.body.dataset.phase,'unauthenticated');assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);
});
// 1 Oct 2026: the game page starts loading while the farm is on its way, but it holds no farm: its bridge only says "wait" until the
// authenticated farm is here, and a farm that does not come takes the page away again.
const shown=f=>f.frames.filter(frame=>!frame.removed);
test('game waits for authenticated server data; logout destroys its frame and bridge',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();assert.equal(f.document.body.dataset.phase,'checking');
 assert.equal(f.window.harvestBridge.pending,true,'the page may start loading, but its bridge holds no farm');assert.equal(f.window.harvestBridge.takeInitial,undefined);assert.equal(f.window.harvestBridge.request,undefined);
 pending.resolve({profile:{player_id:'A'},state:{coins:230},serverNow:Date.now()});await settle();assert.equal(f.frames.length,1);assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.window.harvestBridge.takeInitial().state.coins,230);
 await f.auth('SIGNED_OUT',null);assert.equal(f.frames[0].removed,true);assert.equal(f.window.harvestBridge,undefined);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('late farm response after logout cannot reopen private gameplay',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();await f.auth('SIGNED_OUT',null);pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(shown(f).length,0);assert.equal(f.window.harvestBridge,undefined);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('cross-tab account switch discards A before B and never mounts a stale response',async()=>{
 const pending=deferred();let count=0;const f=fixture({user:{id:'A'},load:()=>++count===1?pending.promise:Promise.resolve({profile:{player_id:'B'},state:{coins:180},serverNow:Date.now()})});await settle();await f.auth('SIGNED_IN',{id:'B'});pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(shown(f).length,1);assert.equal(f.window.harvestBridge.playerId,'B');assert.equal(f.window.harvestBridge.takeInitial().state.coins,180);
});
// 13 Oct 2026 ("after a trip to the village the crops show no time for half a minute"): a trip's load is the farm page's clock too. The
// bridge kept the first load's serverNow for good, so a trip's new page ran behind by the whole visit until the 60-second check.
test('a trip carries its own server time and when it came: the next farm page is never behind by the time since the first load',async()=>{
 const f=fixture({user:{id:'A'},load:()=>({profile:{player_id:'A'},state:{coins:1},serverNow:f.context.Date.now()+4000})});await settle();const bridge=f.window.harvestBridge,opened=bridge.serverAt;
 assert.equal(bridge.serverNow-bridge.serverAt,4000,'the first load: the server\'s clock against this device\'s, when it came');
 await f.advance(10*60000);await bridge.travel('village');
 assert.equal(f.frames[0].src,'/farm.html?world=village');assert.equal(bridge.serverAt,opened+10*60000,'stamped when the trip\'s farm came');
 assert.equal(bridge.serverNow-bridge.serverAt,4000,'the same clock, not ten minutes behind');
 await f.advance(5*60000);await bridge.travel('farm');assert.equal(f.frames[0].src,'/farm.html');assert.equal(bridge.serverAt,opened+15*60000);
});
// 13 Oct 2026 (Android app 1.3, the Back button): the app asks this page (window.harvestBack), this page asks the farm (public/windows.js);
// a trip to the village and back takes the frame's own place in the history, so Back after trips does what it did before them.
test('Back: the page around the farm asks the farm, true only when it closed a window; a trip adds no step to the history',async()=>{
 const f=fixture({user:{id:'A'},load:()=>({profile:{player_id:'A'},state:{coins:1},serverNow:f.context.Date.now()})});
 assert.equal(f.window.harvestBack(),false,'no farm yet');await settle();
 const frame=f.frames[0],replaced=[];assert.equal(frame.src,'/farm.html');
 frame.contentWindow={harvestBack:()=>true,location:{replace:address=>replaced.push(address)}};
 assert.equal(f.window.harvestBack(),true);
 for(const answer of [()=>false,()=>1,()=>{throw new Error('no');}])assert.equal((frame.contentWindow.harvestBack=answer,f.window.harvestBack()),false);
 delete frame.contentWindow.harvestBack;assert.equal(f.window.harvestBack(),false,'a farm page still loading');
 const bridge=f.window.harvestBridge;
 await bridge.travel('village');assert.deepEqual(replaced,['/farm.html?world=village']);assert.equal(frame.src,'/farm.html','not through its src: that added a step');
 assert.equal(frame.dataset.address,'/farm.html?world=village');
 await bridge.travel('farm');assert.deepEqual(replaced,['/farm.html?world=village','/farm.html']);assert.equal(frame.dataset.address,'/farm.html');
 frame.contentWindow=null;await bridge.travel('village');assert.equal(frame.src,'/farm.html?world=village','no window to send: its src, as before');
 await f.auth('SIGNED_OUT',null);assert.equal(f.window.harvestBack(),false,'signed out: no farm');
});
test('offline and server failures fail closed without creating fallback farms',async()=>{
 const f=fixture({user:{id:'A'},online:false});await settle();assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'error');
 const g=fixture({user:{id:'A'},load:async()=>{throw new Error('Unavailable');}});await settle();assert.equal(shown(g).length,0);assert.equal(g.window.harvestBridge,undefined);assert.equal(g.document.body.dataset.phase,'error');
});
test('a first-time visitor sees the sign-up card at once, without the account check or any request',async()=>{
 const f=fixture({storage:{}});await settle();
 assert.equal(f.document.body.dataset.phase,'unauthenticated');assert.equal(f.calls.length,0);
 assert.equal(f.nodes.get('account-title').textContent,'Start your farm.');
 assert.equal(f.nodes.get('account-submit').textContent,'Start my farm');
 assert.equal(f.nodes.get('confirm-panel').hidden,true);assert.equal(f.nodes.get('register-promise').hidden,false);
 assert.deepEqual(f.analytics.map(e=>e.step),['view']);assert.equal(f.analytics[0].mode,'register');
});
test('a returning player lands on sign in, and a saved session still opens the farm',async()=>{
 const returning=fixture({storage:{'harvest-tycoon:returning':'1'}});await settle();
 assert.equal(returning.nodes.get('account-title').textContent,'Welcome home.');assert.equal(returning.nodes.get('forgot-link').hidden,false);assert.equal(returning.nodes.get('register-promise').hidden,true);
 const saved=fixture({user:{id:'A'},storage:{'harvest-tycoon:auth':'{}'}});await settle();
 assert.equal(saved.frames.length,1);assert.equal(saved.document.body.dataset.phase,'authenticated');
 assert.equal(saved.context.localStorage.getItem('harvest-tycoon:returning'),'1','opening the farm marks the browser as a returning one');
});
test('an expired confirmation link explains itself instead of showing a blank sign-in',async()=>{
 const f=fixture({storage:{},location:{origin:'https://farm.example',hash:'#error=access_denied&error_code=otp_expired&error_description=x',search:''}});await settle();
 assert.equal(f.document.body.dataset.phase,'unauthenticated');assert.match(f.nodes.get('account-message').textContent,/expired/);assert.equal(f.nodes.get('account-title').textContent,'Welcome home.');
 assert(f.analytics.some(e=>e.step==='link_error'));
});
test('a password-reset link opens the new-password form and never opens the farm',async()=>{
 const f=fixture({user:{id:'A'},location:{origin:'https://farm.example',hash:'#access_token=t&type=recovery',search:''}});await settle();
 assert.equal(f.nodes.get('account-title').textContent,'Choose a new password.');assert.equal(f.frames.length,0);assert.equal(f.calls.length,0);
 assert.equal(f.nodes.get('email-row').hidden,true);assert.equal(f.nodes.get('password-row').hidden,false);
 await f.auth('SIGNED_IN',{id:'A'});assert.equal(f.frames.length,0,'the recovery session must not skip the password change');
});
test('an email confirmation link is measured and then opens the farm',async()=>{
 const f=fixture({user:{id:'A'},storage:{'harvest-tycoon:confirm-pending':'1'},location:{origin:'https://farm.example',hash:'#access_token=t&type=signup',search:''}});await settle();
 assert(f.analytics.some(e=>e.step==='email_confirmed'));assert.equal(f.frames.length,1);assert.equal(f.context.localStorage.getItem('harvest-tycoon:confirm-pending'),null);
});
async function submit(f,fields){
 for(const [id,value] of Object.entries(fields))f.nodes.get(id).value=value;
 await f.nodes.get('account-form').onsubmit({preventDefault(){}});await settle();
}
test('registering needs only an email and a password; the player name is optional and generated',async()=>{
 const sent=[];const f=fixture({storage:{},authApi:{async signUp(body){sent.push(body);return {data:{user:{identities:[{}]},session:null},error:null};}}});await settle();
 assert.equal(f.nodes.get('name-row').hidden,true);assert.equal(f.nodes.get('password-row').hidden,false);assert.equal(f.nodes.get('name-toggle').hidden,false);
 await submit(f,{email:'  new@farm.example ',password:'secret1','player-name':''});
 assert.equal(sent.length,1);assert.equal(sent[0].email,'new@farm.example');assert.match(sent[0].options.data.username,/^[A-Za-z]+ [A-Za-z]+ \d{4}$/);
 assert.equal(sent[0].options.emailRedirectTo,'https://farm.example/play.html');
 assert.equal(f.nodes.get('confirm-panel').hidden,false);assert.equal(f.nodes.get('account-form').hidden,true);assert.equal(f.nodes.get('account-title').textContent,'Check your inbox.');
 assert.match(f.nodes.get('confirm-copy').textContent,/new@farm\.example/);
 assert.deepEqual(f.analytics.map(e=>e.step),['view','submit','confirmation_sent']);
 assert.equal(f.context.localStorage.getItem('harvest-tycoon:returning'),'1');
});
test('a chosen player name is sent as typed, but a hidden name field is ignored',async()=>{
 const sent=[];const f=fixture({storage:{},authApi:{async signUp(body){sent.push(body);return {data:{user:{identities:[{}]},session:{}},error:null};}}});await settle();
 await submit(f,{email:'a@b.nl',password:'secret1','player-name':'Left Behind'});assert.notEqual(sent[0].options.data.username,'Left Behind');
 f.nodes.get('name-toggle').onclick();assert.equal(f.nodes.get('name-row').hidden,false);assert.equal(f.nodes.get('name-toggle').hidden,true);
 await submit(f,{email:'a@b.nl',password:'secret1','player-name':'Sunny Acres'});assert.equal(sent[1].options.data.username,'Sunny Acres');
});
test('mistakes are shown next to the field and nothing is sent',async()=>{
 let calls=0;const f=fixture({storage:{},authApi:{async signUp(){calls++;return {data:{},error:null};}}});await settle();
 await submit(f,{email:'not-an-email',password:'123'});
 assert.equal(calls,0);assert.match(f.nodes.get('email-error').textContent,/valid email/);assert.match(f.nodes.get('password-error').textContent,/at least 6/);
 assert(f.analytics.some(e=>e.step==='error'&&e.reason==='validation'&&e.field==='email'));
 await submit(f,{email:'ok@farm.example',password:'123456'});assert.equal(calls,1);assert.equal(f.nodes.get('email-error').textContent,'');
});
test('server errors map to a friendly message and a safe analytics reason',async()=>{
 const f=fixture({storage:{'harvest-tycoon:returning':'1'},authApi:{async signInWithPassword(){return {error:{code:'invalid_credentials',message:'Invalid login credentials for x@y.nl'}};}}});await settle();
 await submit(f,{email:'x@y.nl',password:'wrong-password'});
 assert.equal(f.nodes.get('account-message').textContent,'The email address or password is incorrect.');
 const error=f.analytics.find(e=>e.step==='error');assert.equal(error.reason,'invalid_credentials');assert(!JSON.stringify(f.analytics).includes('x@y.nl'),'no address in analytics');
});
test('signing in with an unconfirmed email opens the inbox screen with a resend button',async()=>{
 const f=fixture({storage:{'harvest-tycoon:returning':'1'},authApi:{async signInWithPassword(){return {error:{code:'email_not_confirmed',message:'Email not confirmed'}};}}});await settle();
 await submit(f,{email:'x@y.nl',password:'secret1'});assert.equal(f.nodes.get('confirm-panel').hidden,false);assert.match(f.nodes.get('confirm-copy').textContent,/still needs to be confirmed/);
});
test('forgot password sends a reset link to the play page',async()=>{
 const sent=[];const f=fixture({storage:{'harvest-tycoon:returning':'1'},authApi:{async resetPasswordForEmail(email,options){sent.push({email,redirectTo:options.redirectTo});return {error:null};}}});await settle();
 f.nodes.get('forgot-link').onclick();assert.equal(f.nodes.get('account-title').textContent,'Forgot your password?');assert.equal(f.nodes.get('password-row').hidden,true);
 await submit(f,{email:'x@y.nl'});assert.equal(JSON.stringify(sent),JSON.stringify([{email:'x@y.nl',redirectTo:'https://farm.example/play.html'}]));
 assert.match(f.nodes.get('confirm-copy').textContent,/link to choose a new password/);
 f.nodes.get('confirm-back').onclick();assert.equal(f.nodes.get('account-title').textContent,'Forgot your password?');
});
// How you sign in (17 Oct 2026, src/account-sign-in.js): the farm's bridge says how the signed-in user signs in, from the user the farm
// opened with, and Set a password is the "Forgot your password?" mail to that account's own address, with the same return address.
test('the bridge says how this account signs in; Set a password sends the reset mail to its own address, back to the play page',async()=>{
 const sent=[];const google={id:'A',email:'floris.example@gmail.com',identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}};
 const f=fixture({user:google,load:async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:Date.now()}),authApi:{async resetPasswordForEmail(email,options){sent.push({email,redirectTo:options.redirectTo});return {error:null};}}});await settle();
 const bridge=f.window.harvestBridge;assert.equal(f.document.body.dataset.phase,'authenticated');
 assert.equal(JSON.stringify(bridge.signIn),JSON.stringify({email:'floris.example@gmail.com',methods:['google']}));
 await bridge.setPassword();
 assert.equal(JSON.stringify(sent),JSON.stringify([{email:'floris.example@gmail.com',redirectTo:'https://farm.example/play.html'}]),'the same return address as Forgot your password?');
 assert.ok(f.analytics.some(e=>e.step==='set_password_sent'));assert.ok(!JSON.stringify(f.analytics).includes('gmail'),'no address in analytics');
 // A refusal in the farmer's words; offline nothing is asked.
 const busy=fixture({user:google,load:async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:Date.now()}),authApi:{async resetPasswordForEmail(){return {error:{code:'over_email_send_rate_limit',status:429,message:'For security purposes, you can only request this after 40 seconds.'}};}}});await settle();
 await assert.rejects(busy.window.harvestBridge.setPassword(),/^Error: Too many attempts\. Please wait a few minutes and try again\.$/);
 busy.goOffline();await assert.rejects(busy.window.harvestBridge.setPassword(),/We could not reach the server/);
 // An email farmer: the bridge says so (Settings shows no button there).
 const own=fixture({user:{id:'B',email:'sunny@example.com',identities:[{provider:'email'}],app_metadata:{provider:'email',providers:['email']}},load:async()=>({profile:{player_id:'B'},state:{coins:1},serverNow:Date.now()})});await settle();
 assert.equal(JSON.stringify(own.window.harvestBridge.signIn.methods),JSON.stringify(['email']));
 // After Sign out the old bridge sends nothing more.
 const out=fixture({user:google,load:async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:Date.now()}),authApi:{async resetPasswordForEmail(){sent.push('late');return {error:null};}}});await settle();
 const old=out.window.harvestBridge;await out.auth('SIGNED_OUT',null);await assert.rejects(old.setPassword(),/Your session has ended/);assert.ok(!sent.includes('late'));
});
// 17 Oct 2026 (the review): Supabase adds no email identity when a Google account sets a password, so the session says it. Its amr
// (supabase-js getAuthenticatorAssuranceLevel, from the stored session) names 'password' after a password sign-in (every Google farmer
// in the Android app); the farm right after "Choose a new password." (amr 'otp') knows it set one. Anything unreadable: the identities.
test('a password session or a password just set counts as email and password; an unreadable session falls back to the identities',async()=>{
 const google={id:'A',email:'floris.example@gmail.com',identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}};
 const load=async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:Date.now()});
 const amr=methods=>({mfa:{async getAuthenticatorAssuranceLevel(){return {data:{currentLevel:'aal1',nextLevel:'aal1',currentAuthenticationMethods:methods},error:null};}}});
 let f=fixture({user:google,load,authApi:amr([{method:'password',timestamp:1}])});await settle();
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google','email']));
 f=fixture({user:google,load,authApi:amr([{method:'oauth',timestamp:1}])});await settle();assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google']));
 f=fixture({user:google,load,authApi:{mfa:{async getAuthenticatorAssuranceLevel(){throw new SyntaxError('Invalid JWT structure');}}}});await settle();
 assert.equal(f.document.body.dataset.phase,'authenticated','a token it cannot read never stops the farm');assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google']));
 f=fixture({user:google,load,authApi:{mfa:{async getAuthenticatorAssuranceLevel(){return {data:null,error:{message:'Auth session missing!'}};}}}});await settle();assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google']));
 // After the reset link: the password form, then the farm, which knows a password was just set (no Set a password again).
 const updates=[];
 // (the fixture's own farm load: it answers for whoever is signed in)
 f=fixture({user:google,location:{origin:'https://farm.example',hash:'#access_token=t&type=recovery',search:''},authApi:{...amr([{method:'otp',timestamp:1}]),async updateUser(body){updates.push(body);return {data:{user:google},error:null};}}});await settle();
 assert.equal(f.nodes.get('account-title').textContent,'Choose a new password.');
 f.nodes.get('password').value='harvest-moon-42';await f.nodes.get('account-form').onsubmit({preventDefault(){}});await settle();
 assert.equal(updates.length,1);assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google','email']));
 // Another account signing in on that page later is not taken for the one that set the password.
 const other={id:'B',email:'other@gmail.com',identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}};
 await f.auth('SIGNED_OUT',null);await f.auth('SIGNED_IN',other);await f.advance(10);
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.window.harvestBridge.playerId,'B');
 assert.equal(JSON.stringify(f.window.harvestBridge.signIn.methods),JSON.stringify(['google']));
});
// 17 Oct 2026 (the review): supabase-js sends PASSWORD_RECOVERY to every tab of the site. Set a password starts from an open farm, so the
// mail's link opened in the same browser must not close that farm and leave a second password form: only the link's own tab changes.
test('a reset link opened in another tab leaves this tab\'s farm open; the link\'s own tab shows the password form',async()=>{
 const google={id:'A',email:'floris.example@gmail.com',identities:[{provider:'google'}],app_metadata:{provider:'google',providers:['google']}};
 const f=fixture({user:google,load:async()=>({profile:{player_id:'A'},state:{coins:1},serverNow:Date.now()})});await settle();
 assert.equal(f.document.body.dataset.phase,'authenticated');const bridge=f.window.harvestBridge;const opened=f.frames.length;
 await f.auth('PASSWORD_RECOVERY',google);await settle();
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.window.harvestBridge,bridge,'the same farm, not disposed');
 assert.notEqual(f.nodes.get('account-title')?.textContent,'Choose a new password.');assert.equal(f.frames.length,opened);
 assert.ok(!f.analytics.some(e=>e.step==='recovery_open'));
 // The password set in the other tab (USER_UPDATED there, shared here): the farm stays.
 await f.auth('USER_UPDATED',google);await settle();assert.equal(f.window.harvestBridge,bridge);
 // The link's own tab: the form, once (the event after boot does not open it again).
 const link=fixture({user:google,location:{origin:'https://farm.example',hash:'#access_token=t&type=recovery',search:''}});await settle();
 assert.equal(link.nodes.get('account-title').textContent,'Choose a new password.');
 await link.auth('PASSWORD_RECOVERY',google);await settle();
 assert.equal(link.nodes.get('account-title').textContent,'Choose a new password.');assert.equal(link.analytics.filter(e=>e.step==='recovery_open').length,1);assert.equal(link.frames.length,0);
});
test('the first sign-in after registering is tagged so the funnel can be closed',async()=>{
 const storage={'harvest-tycoon:returning':'1','harvest-tycoon:confirm-pending':'1'};
 const f=fixture({user:null,storage,authApi:{async signInWithPassword(){return {error:null};}}});await settle();
 await submit(f,{email:'x@y.nl',password:'secret1'});
 const login=f.analytics.find(e=>e.step==='login');assert.equal(login.after_signup,true);assert.equal(login.method,'password');assert.equal(storage['harvest-tycoon:confirm-pending'],undefined);
});

// ---- Connection problems: the farm stays open, reconnects by itself, and only pauses after a minute ----
const trouble=(kind='network')=>Object.assign(new Error('Your farm could not be reached.'),{kind,transient:true});
const okFarm=(id='A')=>({profile:{player_id:id},state:{coins:1},serverNow:Date.now()});
async function openFarmFixture(){
 const state={fail:null};
 const f=fixture({user:{id:'A'},load:()=>{if(state.fail)throw state.fail;return okFarm();}});await settle();
 assert.equal(f.document.body.dataset.phase,'authenticated');
 const statuses=[];f.window.harvestBridge.watchConnection(status=>statuses.push(status));
 return {f,state,statuses,request:()=>f.window.harvestBridge.request({operation:'load'}).catch(()=>{})};
}
test('a failed request keeps the farm open, shows "Reconnecting…" and comes back by itself',async()=>{
 const {f,state,statuses,request}=await openFarmFixture();
 state.fail=trouble('timeout');await request();
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.frames[0].removed,undefined,'the game is still there');
 assert.deepEqual(statuses,['reconnecting']);
 assert.deepEqual(f.game,[{event:'connection_problem',reason:'timeout',stage:'reconnecting'}]);
 await f.advance(1500);assert.deepEqual(statuses,['reconnecting'],'not yet: the first check comes after 2 seconds');
 state.fail=null;await f.advance(1000);
 assert.deepEqual(statuses,['reconnecting','ok']);assert.equal(f.document.body.dataset.phase,'authenticated');
 assert.deepEqual(f.game.map(e=>[e.event,e.stage]),[['connection_problem','reconnecting'],['connection_recovered','reconnecting']]);
});
test('a request that works again ends the reconnecting state at once',async()=>{
 const {f,state,statuses,request}=await openFarmFixture();
 state.fail=trouble();await request();assert.deepEqual(statuses,['reconnecting']);
 state.fail=null;await request();assert.deepEqual(statuses,['reconnecting','ok']);
});
test('only a problem that lasts a minute pauses the farm, and the pause screen reopens it by itself',async()=>{
 const {f,state,request}=await openFarmFixture();
 state.fail=trouble('server');await request();
 await f.advance(40000);assert.equal(f.document.body.dataset.phase,'authenticated','forty seconds is still just "Reconnecting…"');
 await f.advance(30000);
 assert.equal(f.document.body.dataset.phase,'error');assert.equal(f.frames[0].removed,true);
 assert.match(f.nodes.get('account-copy').textContent,/servers are busy/);assert.match(f.nodes.get('account-message').textContent,/trying again automatically/);
 assert.deepEqual(f.game.map(e=>e.stage),['reconnecting','paused']);assert.equal(f.game[1].reason,'server');
 state.fail=null;await f.advance(9000);
 assert.equal(f.frames.length,2,'a new game is opened');assert.equal(f.document.body.dataset.phase,'authenticated');
 assert.deepEqual(f.game.map(e=>e.event),['connection_problem','connection_problem','connection_recovered']);assert.equal(f.game[2].stage,'paused');
});
test('a farm that cannot be opened shows what went wrong and tries again by itself',async()=>{
 const state={fail:trouble('network')};
 const f=fixture({user:{id:'A'},load:()=>{if(state.fail)throw state.fail;return okFarm();}});await settle();
 assert.equal(f.document.body.dataset.phase,'error');assert.equal(shown(f).length,0);
 assert.match(f.nodes.get('account-copy').textContent,/could not reach your farm/);assert.match(f.nodes.get('account-message').textContent,/automatically/);
 await f.advance(5000);assert.equal(f.document.body.dataset.phase,'error','still down: it keeps trying');
 state.fail=null;await f.advance(9000);
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(shown(f).length,1);
});
test('offline is only a problem when the browser stays offline; a short blip changes nothing',async()=>{
 const {f,statuses}=await openFarmFixture();
 f.goOffline();f.events.offline();await f.advance(3000);f.goOnline();f.events.online();await f.advance(10000);
 assert.deepEqual(statuses,[]);assert.equal(f.document.body.dataset.phase,'authenticated');assert.deepEqual(f.game,[]);
 f.goOffline();f.events.offline();await f.advance(7000);
 assert.deepEqual(statuses,['reconnecting']);assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.game[0].reason,'offline');
 f.goOnline();f.events.online();await f.advance(1000);assert.deepEqual(statuses,['reconnecting'],'the network gets a moment to settle first');
 await f.advance(3000);assert.deepEqual(statuses,['reconnecting','ok']);
});
test('a paused farm opens again as soon as the browser is back online',async()=>{
 const {f}=await openFarmFixture();
 f.goOffline();f.events.offline();await f.advance(80000);
 assert.equal(f.document.body.dataset.phase,'error');assert.match(f.nodes.get('account-copy').textContent,/offline/);
 f.goOnline();f.events.online();await f.advance(4000);
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.frames.length,2);
});
test('the minute check asks only the farm: no account lookup, and nothing while the tab is hidden',async()=>{
 const {f}=await openFarmFixture();
 const before=f.calls.length,lookups=f.lookups.length;
 await f.context.checkSession();
 assert.equal(f.calls.length,before+1);assert.equal(f.calls.at(-1).operation,'load');assert.equal(f.lookups.length,lookups,'the server checks the sign-in itself');
 f.document.hidden=true;await f.context.checkSession();assert.equal(f.calls.length,before+1,'a hidden tab is not asked');
});
test('coming back to the tab or waking the laptop waits a moment before the check',async()=>{
 const {f}=await openFarmFixture();
 const before=f.calls.length;f.document.hidden=false;f.events.visibilitychange();await settle();
 assert.equal(f.calls.length,before,'the network is not up yet');
 await f.advance(2000);assert.equal(f.calls.length,before+1);
});
test('a check that fails after waking up does not close the farm',async()=>{
 const {f,state,statuses}=await openFarmFixture();
 state.fail=trouble('network');f.events.visibilitychange();await f.advance(2000);
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.deepEqual(statuses,['reconnecting']);
});
test('an ended session still signs the player out, and a conflict still pauses at once',async()=>{
 const a=await openFarmFixture();a.state.fail=Object.assign(new Error('Sign in again'),{status:401});await a.request();
 assert.equal(a.f.document.body.dataset.phase,'unauthenticated');assert.equal(a.f.game.length,0);
 const b=await openFarmFixture();b.state.fail=Object.assign(new Error('Your farm changed in another tab.'),{status:409,code:'CONFLICT'});await b.request();
 assert.equal(b.f.document.body.dataset.phase,'error');assert.equal(b.f.nodes.get('account-copy').textContent,'Your farm changed in another tab.');
 assert.equal(b.f.nodes.get('account-message').textContent,'','not a connection problem: no automatic retry');assert.equal(b.f.game.length,0);
});
test('a rejected action or a name that is taken is not a connection problem',async()=>{
 const {f,state,statuses,request}=await openFarmFixture();
 state.fail=Object.assign(new Error('Not enough coins.'),{status:200,code:'ACTION_REJECTED'});await request();
 state.fail=Object.assign(new Error('Invalid'),{status:400});await request();
 assert.deepEqual(statuses,[]);assert.equal(f.document.body.dataset.phase,'authenticated');
});
test('a farmer name that is taken is refused before the account is made; a free one goes through',async()=>{
 const sent=[],asked=[];const f=fixture({storage:{},rpc:async(name,args)=>{asked.push(args.p_name);return {data:args.p_name!=='Taken Farm',error:null};},authApi:{async signUp(body){sent.push(body);return {data:{user:{identities:[{}]},session:null},error:null};}}});await settle();
 f.nodes.get('name-toggle').onclick();
 await submit(f,{email:'a@b.nl',password:'secret1','player-name':'Taken Farm'});
 assert.equal(sent.length,0,'no account');assert.match(f.nodes.get('name-error').textContent,/taken/);
 await submit(f,{email:'a@b.nl',password:'secret1','player-name':'Free Farm'});
 assert.equal(sent.length,1);assert.equal(sent[0].options.data.username,'Free Farm');assert.deepEqual(asked,['Taken Farm','Free Farm']);
});

// 28 Sep 2026: inside the Facebook or Instagram app the sign-up card first offers the phone's own browser (src/browser-tip.js).
const ANDROID_FB='Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/484.0.0.66.73;]';
const IPHONE_IG='Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 400.0.0.0';
const page={origin:'https://www.harvesttycoon.com',pathname:'/play.html',search:'?utm_source=facebook',hash:''};
test('inside Facebook on Android the card offers Chrome, and the first visit hands the page to Chrome by itself, once',async()=>{
 const storage={},f=fixture({ua:ANDROID_FB,storage,location:{...page}});await settle();
 const card=f.nodes.get('.account-card');assert.equal(card.attrs['data-gate'],true);assert.equal(f.nodes.get('browser-gate').hidden,false,'the page ships the step hidden; the gate shows it (8 Oct 2026)');assert.equal(f.nodes.get('gate-open').textContent,'Open in Chrome');
 assert.equal(f.context.location.href,'intent://www.harvesttycoon.com/play.html?utm_source=facebook&via=facebook#Intent;scheme=https;package=com.android.chrome;end','the app it came from goes along (src/source-link.js)');
 assert.equal(storage['harvest-tycoon:browser-escape'],'shown');
 const again=fixture({ua:ANDROID_FB,storage,location:{...page}});await settle();
 assert.equal(again.context.location.href,undefined,'the second visit waits for a tap');assert.equal(again.nodes.get('.account-card').attrs['data-gate'],true);
 again.nodes.get('gate-open').onclick();assert.match(again.context.location.href,/^intent:\/\//);
 await again.advance(1500);assert.equal(again.nodes.get('gate-help').hidden,false,'still here: where the app keeps its own "open in browser"');assert.match(again.nodes.get('gate-help').textContent,/Open in Chrome/);
});
test('on an iPhone the card tries Safari only on a tap; "Play here instead" is remembered and ends the later tip too',async()=>{
 const storage={},f=fixture({ua:IPHONE_IG,storage,location:{...page}});await settle();
 assert.equal(f.context.location.href,undefined,'an iPhone is never sent anywhere by itself');assert.equal(f.nodes.get('gate-open').textContent,'Open in Safari');
 f.nodes.get('gate-open').onclick();assert.equal(f.context.location.href,'x-safari-https://www.harvesttycoon.com/play.html?utm_source=facebook&via=instagram');
 f.nodes.get('gate-stay').onclick();
 assert.equal(storage['harvest-tycoon:browser-escape'],'stay');assert.equal(storage['harvest-tycoon:browser-tip'],'1');assert.equal(f.nodes.get('.account-card').attrs['data-gate'],undefined);
 assert.equal(f.nodes.get('browser-gate').hidden,true,'the step is hidden again with its mark (8 Oct 2026)');
 const later=fixture({ua:IPHONE_IG,storage,location:{...page}});await settle();assert.equal(later.nodes.get('.account-card').attrs?.['data-gate'],false,'the sign-up form straight away');assert.equal(later.nodes.get('browser-gate').hidden,true);
});
// 30 Sep 2026: TikTok's app has the step too, but Android never leaves it by itself (not known yet whether TikTok passes intent:// on).
const ANDROID_TT='Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 trill_370504 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill app_version/37.5.4 ByteLocale/en BytedanceWebview/d8a21c6';
const IPHONE_TT='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_41.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US BytedanceWebview/d8a21c6';
test('inside TikTok the card offers the phone\'s browser too; Android goes to Chrome only on a tap',async()=>{
 const storage={},f=fixture({ua:ANDROID_TT,storage,location:{...page,search:'?utm_source=tiktok&ttclid=E.C.P'}});await settle();
 assert.equal(f.nodes.get('.account-card').attrs['data-gate'],true);assert.equal(f.nodes.get('gate-open').textContent,'Open in Chrome');
 assert.equal(f.context.location.href,undefined,'no jump by itself');assert.equal(storage['harvest-tycoon:browser-escape'],'shown');
 f.nodes.get('gate-open').onclick();assert.equal(f.context.location.href,'intent://www.harvesttycoon.com/play.html?utm_source=tiktok&ttclid=E.C.P&via=tiktok#Intent;scheme=https;package=com.android.chrome;end','the ad\'s click id goes along');
 const iphone=fixture({ua:IPHONE_TT,storage:{},location:{...page}});await settle();
 assert.equal(iphone.nodes.get('.account-card').attrs['data-gate'],true);assert.equal(iphone.nodes.get('gate-open').textContent,'Open in Safari');assert.equal(iphone.context.location.href,undefined);
});
test('a phone browser, and every screen that is not sign-in or sign-up, never shows the browser step',async()=>{
 const chrome=fixture({ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36',storage:{},location:{...page}});await settle();
 assert.equal(chrome.nodes.get('.account-card').attrs?.['data-gate'],false);assert.equal(chrome.nodes.get('browser-gate').hidden,true);assert.equal(chrome.context.location.href,undefined);
 const reset=fixture({ua:ANDROID_FB,user:{id:'A'},storage:{'harvest-tycoon:browser-escape':'shown'},location:{...page,hash:'#access_token=t&type=recovery'}});await settle();
 assert.notEqual(reset.nodes.get('.account-card').attrs?.['data-gate'],true,'a password reset opened in the app still works');assert.equal(reset.nodes.get('browser-gate').hidden,true);
});
test('the page shows the browser step before the script loads, for the same apps, and keeps a friend\'s invite in the link',async()=>{
 const play=readFileSync(new URL('../public/play.html',import.meta.url),'utf8'),tip=await import('../src/browser-tip.js');
 // 8 Oct 2026: the head decides (data-boot="gate", the loading screen until the end of the page), with the same apps as the script; the
 // end of the page shows the step. The list of apps is in the page once.
 assert.ok(play.includes(`try{if(${tip.GATE_APP}.test(navigator.userAgent)&&localStorage.getItem('${tip.ESCAPE_KEY}')!=='stay')h.setAttribute('data-boot','gate');}catch(e){}`));
 assert.equal(play.split(String(tip.GATE_APP)).length,2,'one list of apps in the page');
 assert.ok(play.includes(`if(boot==='gate'){document.getElementById('browser-gate').hidden=false;document.querySelector('.account-card').setAttribute('data-gate','');}`));
 for(const ua of [ANDROID_FB,IPHONE_IG,'… [FBAN/FBIOS;FBAV/500.0]','… Barcelona 350.0'])assert.ok(tip.metaApp(ua),ua);
 for(const ua of ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1','Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36','… musical_ly'])assert.ok(!tip.metaApp(ua),ua);
 for(const ua of [ANDROID_FB,IPHONE_IG,ANDROID_TT,IPHONE_TT])assert.ok(tip.gateApp(ua),ua);
 for(const ua of ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1','Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36'])assert.ok(!tip.gateApp(ua),ua);
 assert.equal(tip.escapeTarget({origin:'https://www.harvesttycoon.com',pathname:'/play.html',search:'?code=abc&error=x&utm_campaign=eu'},'FARM2026'),'https://www.harvesttycoon.com/play.html?utm_campaign=eu&invite=FARM2026','no sign-in answer, the invite back in');
 assert.ok(/\.account-card\[data-gate\]>:not\(\.card-top\):not\(\.browser-gate\)\{display:none!important\}/.test(readFileSync(new URL('../public/welcome.css',import.meta.url),'utf8')));
 assert.match(readFileSync(new URL('../public/privacy.html',import.meta.url),'utf8'),/<code>harvest-tycoon:browser-escape<\/code>/);
});

// Our Android app (Oct 2026, public/android.js): the same page in a WebView whose user agent ends in HarvestTycoonApp/1.0.
const APP_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 HarvestTycoonApp/1.0';
const APP_PAGE={origin:'https://www.harvesttycoon.com',pathname:'/',search:'?src=android-app',hash:''};
test('the Android app: only email and password, and a sign-in with Google or Facebook cannot even start; the website keeps both',async()=>{
 let oauth=0;const authApi={signInWithOAuth:async()=>{oauth++;return {};}};
 const app=fixture({ua:APP_UA,app:true,storage:{},providers:['google','facebook'],buttons:true,authApi,location:{...APP_PAGE}});await settle();
 assert.equal(app.nodes.get('provider-google').hidden,true);assert.equal(app.nodes.get('provider-facebook').hidden,true);assert.equal(app.nodes.get('social-login').hidden,true);
 await app.nodes.get('provider-google').onclick();await app.nodes.get('provider-facebook').onclick();assert.equal(oauth,0);
 assert.equal(app.nodes.get('email-row').hidden,false);assert.equal(app.nodes.get('password-row').hidden,false);
 const site=fixture({ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36',storage:{},providers:['google','facebook'],buttons:true,authApi,location:{...page}});await settle();
 assert.equal(site.nodes.get('provider-google').hidden,false);assert.equal(site.nodes.get('provider-facebook').hidden,false);assert.equal(site.nodes.get('social-login').hidden,false);
 assert.equal(site.nodes.get('provider-facebook').classList.contains('is-wide'),false,'two buttons side by side, none takes the whole row');
 await site.nodes.get('provider-google').onclick();assert.equal(oauth,1,'the website signs in with Google as before');
});
// Every sign-in in the iPhone app from 1.3 (16 Oct 2026, the owner; contract "AppSignIn/1" in src/app-sign-in.js): the page asks the app,
// which signs in with the iPhone's own sheets. The live iPhone app 1.2 keeps email and password only, exactly as before.
const IOS_12='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.2 AppStoreBilling/1';
const IOS_13=IOS_12.replace('HarvestTycoonApp/1.2 AppStoreBilling/1','HarvestTycoonApp/1.3 AppStoreBilling/1 AppSignIn/1');
const IOS_PAGE={origin:'https://www.harvesttycoon.com',pathname:'/',search:'?src=ios-app',hash:'',href:'https://www.harvesttycoon.com/?src=ios-app'};
const ALL=['google','facebook','apple','discord'];
// The address supabase-js 2.116 makes for it (16 Oct 2026, checked in node): skipBrowserRedirect adds nothing to it; redirect_to is
// the redirectTo the page asked for, encoded.
const authorize=({provider,options})=>`https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(options.redirectTo)}`;
// Apple's nonce is hashed with the real Web Crypto, which answers outside the microtask queue: wait until the page has gone to the app.
const sent=async f=>{for(let i=0;i<200&&!/^appsignin:/.test(f.context.location.href??'');i++)await new Promise(r=>setTimeout(r,1));await settle();};
test('the iPhone app 1.2 (live): email and password only, no button shows and none can start, as before',async()=>{
 let oauth=0;const authApi={signInWithOAuth:async()=>{oauth++;return {};},signInWithIdToken:async()=>{oauth++;return {};}};
 const f=fixture({ua:IOS_12,app:true,signIn:false,storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE}});await settle();
 for(const provider of ALL)assert.equal(f.nodes.get(`provider-${provider}`).hidden,true,provider);
 assert.equal(f.nodes.get('social-login').hidden,true);
 for(const provider of ALL)await f.nodes.get(`provider-${provider}`).onclick();
 assert.equal(oauth,0);assert.equal(f.context.location.href,IOS_PAGE.href,'no address for the app');assert.equal(f.nodes.get('account-submit').disabled,false);
});
test('the iPhone app 1.3: all four buttons; Google opens the system\'s sign-in sheet through appsignin://oauth, back to the website\'s return page on www; a closed sheet opens the form again',async()=>{
 const started=[],tab={};const authApi={signInWithOAuth:async options=>{started.push(options);return {data:{provider:options.provider,url:authorize(options)},error:null};}};
 const f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab,providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE}});await settle();
 for(const provider of ALL)assert.equal(f.nodes.get(`provider-${provider}`).hidden,false,provider);
 assert.equal(f.nodes.get('social-login').hidden,false);
 const tapped=f.nodes.get('provider-google').onclick();await settle();
 // The website's return page on www with the query a browser sign-in carries (16 Oct 2026, the owner: no custom scheme; the sheet's
 // claimed https callback only answers for www/play.html).
 assert.deepEqual(JSON.parse(JSON.stringify(started)),[{provider:'google',options:{redirectTo:'https://www.harvesttycoon.com/play.html?src=ios-app&rd=none',skipBrowserRedirect:true}}]);
 const link=new URL(f.context.location.href);
 assert.equal(`${link.protocol}//${link.host}`,'appsignin://oauth');assert.deepEqual([...link.searchParams.keys()],['provider','url'],'no return address');
 assert.equal(link.searchParams.get('provider'),'google');assert.equal(link.searchParams.get('url'),authorize(started[0]));
 assert.equal(f.context.location.href,'appsignin://oauth?provider=google&url=https%3A%2F%2Fjnmdirvidffzxukbdmij.supabase.co%2Fauth%2Fv1%2Fauthorize%3Fprovider%3Dgoogle%26redirect_to%3Dhttps%253A%252F%252Fwww.harvesttycoon.com%252Fplay.html%253Fsrc%253Dios-app%2526rd%253Dnone','every part encoded in full');
 const back=new URL(new URL(link.searchParams.get('url')).searchParams.get('redirect_to'));assert.equal(back.origin+back.pathname,'https://www.harvesttycoon.com/play.html');assert.equal(back.searchParams.get('src'),'ios-app','the source comes back as from a browser');
 assert.equal(tab['harvest-tycoon:oauth'],'google','kept as in a browser, so a failed return says so');
 assert.equal(f.nodes.get('account-message').textContent,'Opening Google…');assert.equal(f.nodes.get('account-submit').disabled,true,'one sign-in at a time');
 await f.nodes.get('provider-facebook').onclick();assert.equal(started.length,1,'a second tap while the sheet is open does nothing');
 f.window.harvestAppSignIn({type:'cancelled',provider:'facebook'});await settle();assert.equal(f.nodes.get('account-submit').disabled,true,'another provider\'s answer is not this one');
 // The farmer reads iOS's alert and closes it: not at once (an answer at once is iOS refusing the sheet, see below).
 await f.advance(1500);f.window.harvestAppSignIn({type:'cancelled',provider:'google'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'');assert.equal(f.nodes.get('account-submit').disabled,false);assert.equal(tab['harvest-tycoon:oauth'],undefined);
 assert.deepEqual(f.analytics.filter(e=>e.step==='error').map(({reason,method})=>({reason,method})),[{reason:'oauth_return',method:'google'}]);
 // The app could not open the sheet (or another sign-in was open): the usual line, and the form opens again.
 const again=f.nodes.get('provider-discord').onclick();await settle();assert.match(f.context.location.href,/^appsignin:\/\/oauth\?provider=discord&/);
 f.window.harvestAppSignIn({type:'error',provider:'discord',reason:'busy'});await again;
 assert.equal(f.nodes.get('account-message').textContent,'We could not open Discord. Please try again, or use your email address.');assert.equal(f.nodes.get('account-submit').disabled,false);
 // An authorize address that is not our project's, or that comes back anywhere but the return page on www, never goes to the app.
 for(const url of ['https://evil.example/auth/v1/authorize?provider=facebook&redirect_to=https%3A%2F%2Fwww.harvesttycoon.com%2Fplay.html',
  'https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/authorize?provider=facebook&redirect_to=harvesttycoon%3A%2F%2Fauth-callback',
  'https://jnmdirvidffzxukbdmij.supabase.co/auth/v1/authorize?provider=facebook&redirect_to=https%3A%2F%2Fharvesttycoon.com%2Fplay.html']){
  f.context.supabase.auth.signInWithOAuth=async()=>({data:{url},error:null});const before=f.context.location.href;
  await f.nodes.get('provider-facebook').onclick();assert.equal(f.context.location.href,before,url);assert.equal(f.nodes.get('account-message').textContent,'We could not open Facebook. Please try again, or use your email address.');
  assert.equal(f.nodes.get('account-submit').disabled,false);assert.equal(tab['harvest-tycoon:oauth'],undefined);
 }
});
// iOS refuses the Google, Facebook or Discord sheet when it knows no association with www.harvesttycoon.com (the
// apple-app-site-association file not on Apple's CDN yet or gone, no Associated Domains): the app gets 'cancelled' at once, as if the
// farmer closed it (16 Oct 2026, seen in the simulator). The app 1.3 sends that as error code 1; a cancel that still comes within 1.5
// seconds is not a farmer either, so the card says it could not open the provider instead of only flashing "Opening Google…" (16 Oct
// 2026, review); Apple's cancel stays silent.
test('the iPhone app 1.3: a cancel that comes at once is iOS refusing the sheet: the "could not open" line, counted as app_cancelled_fast',async()=>{
 const authApi={signInWithOAuth:async options=>({data:{provider:options.provider,url:authorize(options)},error:null})};
 const f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE}});await settle();
 let tapped=f.nodes.get('provider-google').onclick();await settle();assert.match(f.context.location.href,/^appsignin:\/\/oauth\?provider=google&/);
 f.window.harvestAppSignIn({type:'cancelled',provider:'google'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'We could not open Google. Please try again, or use your email address.');assert.equal(f.nodes.get('account-submit').disabled,false);
 // Just under the threshold is still iOS; at the threshold it is the farmer.
 tapped=f.nodes.get('provider-facebook').onclick();await settle();await f.advance(1499);f.window.harvestAppSignIn({type:'cancelled',provider:'facebook'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'We could not open Facebook. Please try again, or use your email address.');
 tapped=f.nodes.get('provider-discord').onclick();await settle();await f.advance(1500);f.window.harvestAppSignIn({type:'cancelled',provider:'discord'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'');assert.equal(f.nodes.get('account-submit').disabled,false);
 // Apple has no alert and no association: a cancel at once is the farmer's, and says nothing.
 f.context.location.href='';tapped=f.nodes.get('provider-apple').onclick();await sent(f);assert.match(f.context.location.href,/^appsignin:\/\/apple\?/);f.window.harvestAppSignIn({type:'cancelled',provider:'apple'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'');
 assert.deepEqual(f.analytics.filter(e=>e.step==='error').map(({reason,method})=>({reason,method})),
  [{reason:'app_cancelled_fast',method:'google'},{reason:'app_cancelled_fast',method:'facebook'},{reason:'oauth_return',method:'discord'},{reason:'oauth_return',method:'apple'}]);
 // The app's own answer for it: the same line, counted with the app's code.
 tapped=f.nodes.get('provider-google').onclick();await settle();f.window.harvestAppSignIn({type:'error',provider:'google',reason:'error',code:1});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'We could not open Google. Please try again, or use your email address.');assert.equal(f.analytics.at(-1).reason,'app_error_1');
});
test('the iPhone app 1.3 always sends Google, Facebook and Discord back to www, whatever origin the page itself is on; the website keeps its own',async()=>{
 for(const origin of ['https://harvesttycoon.com','http://127.0.0.1:5401','https://harvest-tycoon.vercel.app']){
  const started=[];const authApi={signInWithOAuth:async options=>{started.push(options);return {data:{provider:options.provider,url:authorize(options)},error:null};}};
  const f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE,origin,href:`${origin}/?src=ios-app&utm_campaign=autumn`,search:'?src=ios-app&utm_campaign=autumn'}});await settle();
  void f.nodes.get('provider-discord').onclick();await settle();
  assert.equal(started[0].options.redirectTo,'https://www.harvesttycoon.com/play.html?src=ios-app&utm_campaign=autumn&rd=none',origin);
  assert.match(f.context.location.href,/^appsignin:\/\/oauth\?provider=discord&url=https%3A%2F%2Fjnmdirvidffzxukbdmij\.supabase\.co%2F/,origin);
 }
 // The website (Safari) signs in in its own tab, back to the page's own origin, as before.
 const started=[];const authApi={signInWithOAuth:async options=>{started.push(options);return {data:{},error:null};}};
 const site=fixture({ua:IOS_13.replace(' HarvestTycoonApp/1.3 AppStoreBilling/1 AppSignIn/1',' Version/18.0 Safari/604.1'),storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{origin:'https://harvesttycoon.com',pathname:'/',search:'?src=x',hash:'',href:'https://harvesttycoon.com/?src=x'}});await settle();
 await site.nodes.get('provider-google').onclick();
 assert.deepEqual(JSON.parse(JSON.stringify(started)),[{provider:'google',options:{redirectTo:'https://harvesttycoon.com/play.html?src=x&rd=none'}}]);
});
// The buttons' rows (16 Oct 2026, the owner): in the iPhone app 1.3 Apple first on a row of its own, then Google and Facebook side by
// side and Discord across the row (an ad visit: no Discord, Google and Facebook still side by side). The website keeps its order and its
// two by two (the last of an odd number across the row).
test('the buttons\' rows: Apple first and wide in the iPhone app 1.3, the two-by-two rule for the ones below it; the website as before',async()=>{
 const rows=f=>f.buttons.filter(b=>!b.hidden).map(b=>b.dataset.provider+(b.classList.contains('is-wide')?' (wide)':''));
 const app=search=>fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:ALL,buttons:[...ALL],location:{...IOS_PAGE,search,href:`https://www.harvesttycoon.com/${search}`}});
 let f=app('?src=ios-app');await settle();
 assert.deepEqual(rows(f),['apple (wide)','google','facebook','discord (wide)']);assert.equal(f.nodes.get('social-login').hidden,false);
 f=app('?src=ios-app&fbclid=abc');await settle();assert.deepEqual(rows(f),['apple (wide)','google','facebook'],'from an ad: no Discord, Apple still there (4.8)');
 f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:['google','apple'],buttons:[...ALL],location:{...IOS_PAGE}});await settle();
 assert.deepEqual(rows(f),['apple (wide)','google (wide)'],'one below Apple: across the row');
 f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:['apple'],buttons:[...ALL],location:{...IOS_PAGE}});await settle();assert.deepEqual(rows(f),['apple (wide)']);
 // The website: the page's own order, two by two, unchanged (Safari on an iPhone, a computer, an ad visit).
 const SAFARI=IOS_13.replace(' HarvestTycoonApp/1.3 AppStoreBilling/1 AppSignIn/1',' Version/18.0 Safari/604.1'),WINDOWS='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36';
 const site=(ua,search='')=>fixture({ua,storage:{},tab:{},providers:ALL,buttons:[...ALL],location:{origin:'https://www.harvesttycoon.com',pathname:'/',search,hash:'',href:`https://www.harvesttycoon.com/${search}`}});
 f=site(SAFARI);await settle();assert.deepEqual(rows(f),['google','facebook','apple','discord']);
 f=site(SAFARI,'?fbclid=abc');await settle();assert.deepEqual(rows(f),['google','facebook']);
 f=site(WINDOWS);await settle();assert.deepEqual(rows(f),['google','facebook','discord (wide)']);
 // Even with the mark but without the iPhone app (cannot happen: android-app.js only marks the iPhone app), nothing moves.
 f=fixture({ua:SAFARI,signIn:true,storage:{},tab:{},providers:ALL,buttons:[...ALL],location:{origin:'https://www.harvesttycoon.com',pathname:'/',search:'',hash:'',href:'https://www.harvesttycoon.com/'}});await settle();
 assert.deepEqual(rows(f),['google','facebook','apple','discord']);
});
test('the iPhone app 1.3: Apple asks Apple\'s own sheet with a hashed nonce, signs in with Apple\'s token and the nonce, and opens the farm as after a password',async()=>{
 const asked=[];let user=null;const authApi={signInWithIdToken:async options=>{asked.push(options);user={id:'A'};f.context.verifiedUser=async()=>user;return {data:{session:{}},error:null};}};
 const f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE},load:()=>({profile:{player_id:'A'},state:{coins:1},serverNow:1})});await settle();
 const tapped=f.nodes.get('provider-apple').onclick();await sent(f);
 const link=f.context.location.href,hash=/^appsignin:\/\/apple\?nonce=([0-9a-f]{64})$/.exec(link)?.[1];assert.ok(hash,link);
 assert.equal(f.nodes.get('account-message').textContent,'Opening Apple…');
 f.window.harvestAppSignIn({type:'apple',provider:'apple',token:'eyJhbGciOiJSUzI1NiJ9.eyJub25jZSI6IngifQ.c2ln',name:'Floris'});await tapped;
 assert.equal(asked.length,1);assert.equal(asked[0].provider,'apple');assert.equal(asked[0].token,'eyJhbGciOiJSUzI1NiJ9.eyJub25jZSI6IngifQ.c2ln');
 assert.match(asked[0].nonce,/^[0-9a-f]{64}$/);assert.notEqual(asked[0].nonce,hash,'the nonce itself, never its hash');
 assert.equal(createHash('sha256').update(asked[0].nonce).digest('hex'),hash,'Apple got the SHA-256 of the nonce Supabase gets');
 assert.ok(f.analytics.some(e=>e.step==='login'&&e.method==='apple'));assert.equal(f.calls[0]?.operation,'load','the farm opens');assert.equal(f.calls[0].source?.src,'ios-app','with where the farmer came from');
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.nodes.get('account-submit').disabled,false);
});
test('the iPhone app 1.3: Apple cancelled opens the form again without a word; a refused token says Apple could not be opened',async()=>{
 const authApi={signInWithIdToken:async()=>({data:{},error:{message:'Bad ID token'}})};
 const f=fixture({ua:IOS_13,app:true,signIn:true,storage:{},tab:{},providers:ALL,buttons:ALL,authApi,location:{...IOS_PAGE}});await settle();
 let tapped=f.nodes.get('provider-apple').onclick();await settle();f.window.harvestAppSignIn({type:'cancelled',provider:'apple'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'');assert.equal(f.nodes.get('account-submit').disabled,false);
 f.context.location.href='';tapped=f.nodes.get('provider-apple').onclick();await sent(f);f.window.harvestAppSignIn({type:'apple',provider:'apple',token:'a.b.c'});await tapped;
 assert.equal(f.nodes.get('account-message').textContent,'We could not open Apple. Please try again, or use your email address.');assert.equal(f.nodes.get('account-submit').disabled,false);
 assert.equal(f.calls.length,0,'no farm');
 // No answer at all (the app gone quiet): after 20 minutes, as the App Store's sheet, the form opens again.
 f.context.location.href='';tapped=f.nodes.get('provider-apple').onclick();await sent(f);assert.equal(f.nodes.get('account-submit').disabled,true);await f.advance(20*60000-1);assert.equal(f.nodes.get('account-submit').disabled,true,'still waiting');await f.advance(1);await tapped;
 assert.equal(f.nodes.get('account-submit').disabled,false);assert.equal(f.nodes.get('account-message').textContent,'We could not open Apple. Please try again, or use your email address.');
});
test('the Android app never shows the step to open the game in Chrome, not even for a user agent the step knows',async()=>{
 const storage={},app=fixture({ua:`${ANDROID_FB} HarvestTycoonApp/1.0`,app:true,storage,location:{...APP_PAGE}});await settle();
 assert.equal(app.nodes.get('.account-card').attrs?.['data-gate'],false);assert.equal(app.context.location.href,undefined,'never sent to Chrome');
 assert.equal(storage['harvest-tycoon:browser-escape'],undefined);assert.ok(!app.analytics.some(e=>e.step==='browser_gate'));
});
test('the Android app: the shop\'s catalogue says off, nothing else about payments is asked and no checkout opens; the website is unchanged',async()=>{
 const asked=[],paymentRequest=async body=>{asked.push(body);return {enabled:true,url:'https://checkout.stripe.com/c/pay/x'};};
 const app=fixture({ua:APP_UA,app:true,user:{id:'A'},paymentRequest,location:{...APP_PAGE,search:'?src=android-app&purchase=p1&checkout=cancelled'}});await settle();
 assert.equal(app.document.body.dataset.phase,'authenticated');const bridge=app.window.harvestBridge;
 const catalog=await bridge.payments({operation:'catalog'});assert.equal(catalog.enabled,false);assert.equal(catalog.starter,undefined);assert.equal(catalog.offer,undefined);assert.equal(catalog.pass,undefined);
 await assert.rejects(bridge.payments({operation:'create',pack:'50',requestId:'r'}),/Purchases are not available here/);
 await assert.rejects(bridge.payments({operation:'status',purchaseId:'p1'}),/Purchases are not available here/);
 await assert.rejects(bridge.checkout('50','r1'),/Purchases are not available here/);await assert.rejects(bridge.checkout('offer','r2','o1'),/Purchases are not available here/);
 assert.deepEqual(asked,[],'the payment service is never asked');assert.equal(app.context.location.href,undefined,'no checkout page');
 assert.deepEqual({...bridge.paymentReturn()},{id:null,cancelled:false},'no purchase window from an address');
 const site=fixture({user:{id:'A'},paymentRequest,location:{...page,search:'?purchase=p1&checkout=cancelled'}});await settle();
 assert.deepEqual(await site.window.harvestBridge.payments({operation:'catalog'}),{enabled:true,url:'https://checkout.stripe.com/c/pay/x'});assert.deepEqual(asked,[{operation:'catalog'}]);
 assert.deepEqual({...site.window.harvestBridge.paymentReturn()},{id:'p1',cancelled:true});
});

// The Android app 1.1 (Oct 2026): the shop sells through Google Play (src/play-store.js), checked by the server before anything is credited.
test('the Android app 1.1: Google\'s prices in the catalogue, a purchase through Google\'s sheet confirmed by the server, never Stripe',async()=>{
 const A='0000000a-0000-4000-8000-000000000000',asked=[],shown=[];let sheet=null;
 const paymentRequest=async body=>{asked.push(body);
  if(body.operation==='catalog')return {enabled:true,store:'google_play',packs:[]};
  if(body.operation==='create')return {purchaseId:'1111111a-0000-4000-8000-000000000000',product:'diamonds_500',account:A,store:'google_play'};
  if(body.operation==='play_confirm')return {id:'1111111a-0000-4000-8000-000000000000',status:'credited',duplicate:false};
  return {status:'pending'};};
 const playStore={async prices(ids){assert.deepEqual([...ids].sort(),['diamonds_150','diamonds_500','starter_pack']);return {diamonds_500:{price:'US$5.49',micros:5490000,currency:'USD'}};},
  async buy(order){sheet=order;return {kind:'purchase',product:order.product,token:'t'.repeat(30),state:'purchased',account:A,purchase:order.purchase};},
  async pending(){return [];},onPurchase(){return()=>{};}};
 const app=fixture({ua:APP_UA+' PlayBilling/1',app:true,play:true,playStore,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 const bridge=app.window.harvestBridge;bridge.purchaseDone=id=>shown.push(id);
 const catalog=await bridge.payments({operation:'catalog'});
 assert.equal(catalog.enabled,true);assert.deepEqual({...catalog.prices},{'500':{price:'US$5.49',micros:5490000,currency:'USD'}},'Google\'s price per pack');
 assert.deepEqual({...asked[0]},{operation:'catalog',store:'google_play'});
 const done=await bridge.checkout('500','ui-request');
 assert.deepEqual({...done},{store:'google_play',id:'1111111a-0000-4000-8000-000000000000',status:'purchased'});
 assert.equal(asked[1].operation,'create');assert.equal(asked[1].store,'google_play');assert.notEqual(asked[1].requestId,'ui-request','a new purchase row for every sheet');
 assert.deepEqual({...sheet},{product:'diamonds_500',account:A,purchase:'1111111a-0000-4000-8000-000000000000'});
 assert.deepEqual({...asked[2]},{operation:'play_confirm',store:'google_play',product:'diamonds_500',token:'t'.repeat(30)},'the server checks it with Google');
 assert.deepEqual(shown,['1111111a-0000-4000-8000-000000000000'],'the result window opens');
 assert.equal(app.context.location.href,undefined,'never a Stripe page');
 // Closed sheet: nothing confirmed, the shop just opens again. Another farmer's purchase on this phone is left for them.
 playStore.buy=async()=>({kind:'cancelled'});asked.length=0;
 assert.deepEqual({...await bridge.checkout('150','r')},{store:'google_play',status:'cancelled'});assert.deepEqual(asked.map(b=>b.operation),['create']);
 assert.equal(await bridge.playSettle({product:'diamonds_150',token:'u'.repeat(30),state:'purchased',account:'0000000b-0000-4000-8000-000000000000'}),null);
 // No price from Google (products not in Play Console yet, no connection): the shop stays closed.
 const quiet=fixture({ua:APP_UA+' PlayBilling/1',app:true,play:true,playStore:{...playStore,async prices(){return {};}},user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 assert.equal((await quiet.window.harvestBridge.payments({operation:'catalog'})).enabled,false);
});

// The iPhone app 1.1 (Oct 2026): the shop sells through the App Store (src/app-store.js). The server checks Apple's signed transaction
// before anything is credited, and only when it says finish does the App Store hear that this phone is done with the purchase.
const IOS_APP_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 26_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.1 AppStoreBilling/1';
test('the iPhone app 1.1: the App Store\'s prices, a purchase checked by the server with Apple\'s signed transaction, finished only when the server says so',async()=>{
 const A='0000000a-0000-4000-8000-000000000000',B='0000000b-0000-4000-8000-000000000000',ROW='1111111a-0000-4000-8000-000000000000',ROW2='2222222a-0000-4000-8000-000000000000';
 const asked=[],shown=[],finished=[],JWS='aaa.bbb.ccc';let sheet=null,held=[];
 let confirm=()=>({id:ROW,status:'credited',duplicate:false,finish:true,transaction:'2000000000000001'});
 const paymentRequest=async body=>{asked.push(body);
  if(body.operation==='catalog')return {enabled:true,store:'app_store',packs:[]};
  if(body.operation==='create')return {purchaseId:ROW,product:'diamonds_500',account:A,store:'app_store'};
  if(body.operation==='apple_confirm')return confirm(body);
  return {status:'pending'};};
 const appStore={async prices(ids){assert.deepEqual([...ids].sort(),['diamonds_150','diamonds_500','starter_pack']);return {diamonds_500:{price:'5,49 US$',micros:5490000,currency:'USD'}};},
  async buy(order){sheet=order;return {kind:'purchase',product:order.product,token:JWS,order:'2000000000000001',state:'purchased',account:A,purchase:order.purchase};},
  async pending(){return held;},async finish(id){finished.push(id);return true;},onPurchase(){return()=>{};}};
 const app=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 const bridge=app.window.harvestBridge;bridge.purchaseDone=id=>shown.push(id);
 const catalog=await bridge.payments({operation:'catalog'});
 assert.equal(catalog.enabled,true);assert.deepEqual({...catalog.prices},{'500':{price:'5,49 US$',micros:5490000,currency:'USD'}},'the App Store\'s price per pack');
 assert.deepEqual({...asked[0]},{operation:'catalog',store:'app_store'});
 const done=await bridge.checkout('500','ui-request');
 assert.deepEqual({...done},{store:'app_store',id:ROW,status:'purchased'});
 assert.equal(asked[1].operation,'create');assert.equal(asked[1].store,'app_store');assert.notEqual(asked[1].requestId,'ui-request','a new purchase row for every sheet');
 assert.deepEqual({...sheet},{product:'diamonds_500',account:A,purchase:ROW});
 assert.deepEqual({...asked[2]},{operation:'apple_confirm',store:'app_store',product:'diamonds_500',transaction:JWS},'the server checks Apple\'s signed transaction');
 assert.deepEqual(finished,['2000000000000001'],'finished once the server credited it');assert.deepEqual(shown,[ROW],'the result window opens');
 assert.equal(app.context.location.href,undefined,'never a Stripe page');
 // The server does not say finish: the App Store keeps it and hands it back at the next start.
 const later={product:'diamonds_150',token:'ddd.eee.fff',order:'2000000000000002',state:'purchased',account:A,purchase:ROW2};
 confirm=()=>({id:ROW2,status:'pending',duplicate:false,finish:false});finished.length=0;shown.length=0;
 assert.equal((await bridge.playSettle(later)).finish,false);assert.deepEqual(finished,[]);assert.deepEqual(shown,[]);
 // Credited before (the App Store handed it back): finished now, no window again.
 confirm=()=>({id:ROW2,status:'credited',duplicate:true,finish:true,transaction:'2000000000000002'});
 await bridge.playSettle(later);assert.deepEqual(finished,['2000000000000002']);assert.deepEqual(shown,[]);
 // Another farmer's purchase on this phone is left for them: not asked, not finished.
 asked.length=0;finished.length=0;
 assert.equal(await bridge.playSettle({...later,account:B}),null);assert.deepEqual(asked,[]);assert.deepEqual(finished,[]);
 assert.equal(await bridge.playSettle({...later,state:'unknown'}),null);assert.deepEqual(asked,[],'only a bought one');
 // After the app was installed again it does not know whose a purchase is (account null): the server decides. This farmer's: credited and
 // finished. Another farmer's: refused (403), asked once, never finished, and nothing thrown.
 const unknown={...later,token:'ggg.hhh.iii',order:'2000000000000003',account:null};
 confirm=()=>({id:ROW2,status:'credited',duplicate:false,finish:true,transaction:'2000000000000003'});
 await bridge.playSettle(unknown);assert.deepEqual({...asked.at(-1)},{operation:'apple_confirm',store:'app_store',product:'diamonds_150',transaction:'ggg.hhh.iii'});
 assert.deepEqual(finished,['2000000000000003']);assert.deepEqual(shown,[ROW2]);
 confirm=()=>{throw Object.assign(new Error('This purchase belongs to another farmer.'),{status:403});};asked.length=0;finished.length=0;
 assert.equal(await bridge.playSettle({...unknown,token:'jjj.kkk.lll',order:'2000000000000004'}),null);assert.equal(asked.length,1,'a refusal is not asked again');assert.deepEqual(finished,[]);
 // At the start: everything the App Store still holds is confirmed, one at a time; this farmer's are finished, another farmer's wait.
 confirm=body=>({id:ROW2,status:'credited',duplicate:true,finish:true,transaction:body.transaction==='kkk.lll.mmm'?'2000000000000005':'x'});asked.length=0;
 held=[{...later,token:'kkk.lll.mmm',order:'2000000000000005'},{...later,token:'nnn.ooo.ppp',order:'2000000000000006',account:B}];
 await bridge.playRecover();assert.deepEqual(asked.map(b=>b.transaction),['kkk.lll.mmm']);assert.deepEqual(finished,['2000000000000005']);
 // Ask to Buy (or the bank): nothing to confirm yet, the window says it is on its way.
 appStore.buy=async order=>({kind:'purchase',product:order.product,state:'pending',account:A,purchase:order.purchase});shown.length=0;asked.length=0;finished.length=0;
 assert.deepEqual({...await bridge.checkout('500','r')},{store:'app_store',id:ROW,status:'pending'});assert.deepEqual(shown,[ROW]);assert.deepEqual(asked.map(b=>b.operation),['create']);assert.deepEqual(finished,[]);
 // Closed sheet: nothing confirmed, the shop just opens again. The App Store's errors name it.
 appStore.buy=async()=>({kind:'cancelled'});asked.length=0;
 assert.deepEqual({...await bridge.checkout('150','r')},{store:'app_store',status:'cancelled'});assert.deepEqual(asked.map(b=>b.operation),['create']);
 appStore.buy=async()=>({kind:'error',reason:'not_found'});await assert.rejects(bridge.checkout('150','r'),/Not in the App Store yet/);
 appStore.buy=async()=>({kind:'error',reason:'whatever'});await assert.rejects(bridge.checkout('150','r'),/The App Store could not start/);
 appStore.buy=async()=>null;await assert.rejects(bridge.checkout('150','r'),/The App Store is not available/);
 // No price from the App Store (products not in App Store Connect yet, no connection): the shop stays closed.
 const quiet=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore:{...appStore,async prices(){return {};}},user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 assert.equal((await quiet.window.harvestBridge.payments({operation:'catalog'})).enabled,false);
 // The iPhone app 1.0 sells nothing, as before.
 asked.length=0;const old=fixture({ua:IOS_APP_UA.replace(' AppStoreBilling/1',''),app:true,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 assert.equal((await old.window.harvestBridge.payments({operation:'catalog'})).enabled,false);await assert.rejects(old.window.harvestBridge.checkout('500','r'),/Purchases are not available here/);assert.deepEqual(asked,[]);
});

test('a refusal from the server (4xx) shows its reason; only a lost or failing connection shows "Reconnecting…"',async()=>{
 const {refused}=await import('../src/connection.js');
 for(const status of [400,403,404,413,422,429])assert.equal(refused(status),true,String(status));
 for(const status of [undefined,408,425,500,502,503,504,546])assert.equal(refused(status),false,String(status));
});
test('in the app, a pack the store has no price for is not for sale: no Starter Pack, no special offer, the pass cannot be bought (Oct 2026)',async()=>{
 const A='0000000a-0000-4000-8000-000000000000';
 const paymentRequest=async body=>body.operation==='catalog'?{enabled:true,store:'app_store',packs:[],starter:{eligible:true,expiresAt:Date.now()+86400000},offer:{id:'o',diamonds:900},pass:{id:'halloween-2026',ready:true}}:{status:'pending'};
 const appStore=found=>({async prices(){return found;},async buy(){return null;},async pending(){return [];},async finish(){return true;},onPurchase(){return()=>{};}});
 const priced={diamonds_500:{price:'€4,99',micros:4990000,currency:'EUR'}};
 const only=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore:appStore(priced),user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 const catalog=await only.window.harvestBridge.payments({operation:'catalog'});
 assert.equal(catalog.enabled,true);assert.equal(catalog.starter.eligible,false);assert.equal(catalog.offer,null);assert.equal(catalog.pass.ready,false);
 const all=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore:appStore({...priced,starter_pack:{price:'€2,99'},special_offer:{price:'€4,99'},halloween_pass_2026:{price:'€4,99'}}),user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 const full=await all.window.harvestBridge.payments({operation:'catalog'});
 assert.equal(full.starter.eligible,true,'with the store\'s price the Starter Pack is for sale as before (the fixture\'s store knows 150, 500 and the Starter Pack)');
});

// 13 Oct 2026: a special offer may open at level 10, the level of App Review's demo account, and Apple's sandbox prices special_offer
// although it was not submitted with the iPhone app 1.1: the iPhone app shows no offer at all until Apple sells it (APPLE_SELLS_OFFER).
test('the iPhone app never shows a special offer, even when the server sends one and the App Store prices special_offer; the Android app does',async()=>{
 const A='0000000a-0000-4000-8000-000000000000',OFFER={id:'00000000-0000-4000-8000-0000000000aa',diamonds:5000,coins:0,vipDays:0,audience:'all',endsAt:Date.now()+86400000,cents:499,valueCents:4999,bought:false};
 const products={'150':'diamonds_150','500':'diamonds_500',starter:'starter_pack',offer:'special_offer',pass:'halloween_pass_2026'};
 const asked=[],paymentRequest=async body=>{asked.push(body);return body.operation==='catalog'?{enabled:true,store:body.store,packs:[],starter:{eligible:false,expiresAt:0},offer:OFFER,pass:{id:'halloween-2026',ready:true}}:{status:'pending'};};
 const priced={diamonds_500:{price:'€4,99',micros:4990000,currency:'EUR'},special_offer:{price:'€4,99',micros:4990000,currency:'EUR'}};
 const store={async prices(){return priced;},async buy(){return null;},async pending(){return [];},async finish(){return true;},onPurchase(){return()=>{};}};
 const iphone=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore:store,appleProducts:products,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 const catalog=await iphone.window.harvestBridge.payments({operation:'catalog'});
 assert.equal(catalog.enabled,true,'the shop itself is open');assert.equal(catalog.prices.offer.price,'€4,99','Apple priced it');
 assert.equal(catalog.offer,null,'no offer to show, so no chip, tile, banner or window (src/offer-ui.js)');
 // Once Apple sells special_offer, the same app shows it.
 const approved=fixture({ua:IOS_APP_UA,app:true,apple:true,appStore:store,appleProducts:products,appleSellsOffer:true,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 assert.equal((await approved.window.harvestBridge.payments({operation:'catalog'})).offer.id,OFFER.id);
 // The Android app (Google Play sells special_offer) shows it as before.
 const android=fixture({app:true,play:true,playStore:store,playProducts:products,user:{id:A},paymentRequest,location:{...APP_PAGE}});await settle();
 assert.equal((await android.window.harvestBridge.payments({operation:'catalog'})).offer.id,OFFER.id);
 assert.deepEqual(asked.map(b=>b.store),['app_store','app_store','google_play']);
});

// The game in a frame on another site (itch.io, Oct 2026): Google, Facebook and Stripe refuse a frame, so they open in a new tab.
test('in a frame on another site: Google sign-in and a checkout open in a new tab, made on the tap; the website itself is unchanged',async()=>{
 let oauth=0;const opened=[],authApi={signInWithOAuth:async()=>{oauth++;return {};}};
 const tabOf=()=>({location:{},opener:'me',closed:false,close(){this.closed=true;}});
 const open=(url,target)=>{const tab=tabOf();opened.push({url,target,tab});return tab;};
 const framed=fixture({storage:{},providers:['google','facebook'],buttons:true,authApi,win:{top:{},open},location:{...page,href:'https://www.harvesttycoon.com/?src=itch',search:'?src=itch'}});await settle();
 await framed.nodes.get('provider-google').onclick();
 assert.equal(oauth,0,'no sign-in inside the frame');assert.equal(opened.length,1);assert.match(opened[0].url,/\/play\.html\?src=itch/);assert.equal(opened[0].target,'_blank');assert.equal(opened[0].tab.opener,null);
 assert.equal(framed.nodes.get('account-message').textContent,'Sign in with Google in the new tab.');
 const blocked=fixture({storage:{},providers:['google'],buttons:true,authApi,win:{top:{},open:()=>null},location:{...page}});await settle();
 await blocked.nodes.get('provider-google').onclick();assert.equal(oauth,0);assert.equal(blocked.nodes.get('account-message').textContent,'To sign in with Google, open www.harvesttycoon.com.');
 const asked=[],paymentRequest=async body=>{asked.push(body);if(body.pack==='bad')throw new Error('Diamond purchases are not available yet.');return {url:'https://checkout.stripe.com/c/pay/x',purchaseId:'p1'};};
 opened.length=0;const shop=fixture({user:{id:'A'},paymentRequest,win:{top:{},open},location:{...page}});await settle();
 const bridge=shop.window.harvestBridge,shown=[];bridge.purchaseDone=(id,more)=>shown.push([id,more]);
 assert.deepEqual({...await bridge.checkout('50','r1')},{store:'tab'});
 assert.equal(opened.length,1);assert.equal(opened[0].url,'');assert.equal(opened[0].tab.location.href,'https://checkout.stripe.com/c/pay/x');assert.equal(opened[0].tab.opener,null);
 assert.deepEqual(shown.map(([id,more])=>[id,{...more}]),[['p1',{tab:true}]],'the farm waits for the payment in its purchase window');assert.equal(shop.context.location.href,undefined,'the frame stays on the farm');
 await assert.rejects(bridge.checkout('bad','r2'),/not available yet/);assert.equal(opened[1].tab.closed,true,'a checkout that cannot start closes its tab');
 const noPopups=fixture({user:{id:'A'},paymentRequest,win:{top:{},open:()=>null},location:{...page}});await settle();asked.length=0;
 await assert.rejects(noPopups.window.harvestBridge.checkout('50','r3'),/Allow pop-ups for this page to pay in a new tab\./);assert.deepEqual(asked,[],'no checkout is made without its tab');
 let site=0;const own=fixture({storage:{},providers:['google'],buttons:true,authApi,win:{open:()=>{site++;return null;}},location:{...page}});await settle();
 await own.nodes.get('provider-google').onclick();assert.equal(oauth,1,'the website signs in with Google as before');assert.equal(site,0);
});
test('the itch.io page: the live game in a frame with ?src=itch, zipped with index.html at the root; a payment in a new tab is waited for',()=>{
 const page=readFileSync(new URL('../itch/index.html',import.meta.url),'utf8');
 assert.match(page,/<iframe src="https:\/\/www\.harvesttycoon\.com\/\?src=itch" title="Harvest Tycoon" allow="autoplay; fullscreen; clipboard-write"><\/iframe>/);
 assert.doesNotMatch(page,/<script/,'no script of its own');
 const build=readFileSync(new URL('../scripts/build-itch.mjs',import.meta.url),'utf8');assert.match(build,/execFileSync\('zip',\['-X','-q','-j',zip,page\]\)/);
 assert.match(readFileSync(new URL('../.gitignore',import.meta.url),'utf8'),/^dist-itch\/$/m);
 const ui=readFileSync(new URL('../src/payment-ui.js',import.meta.url),'utf8');
 assert.match(ui,/purchase\.tab\?'Finish paying in the new tab\. Your purchase shows up here by itself\.'/);assert.match(ui,/\+\+attempts<\(purchase\.tab\?120:20\)/);
 assert.match(readFileSync(new URL('../src/game-cloud.js',import.meta.url),'utf8'),/if\(shop\)bridge\.purchaseDone=\(id,more\)=>showPaymentReturn\(bridge,\{id,cancelled:false,\.\.\.more\}\);/);
});

// The Galaxy Store app (Oct 2026, " WebBilling/1"): Samsung allows a game's own payments, so it sells through Stripe like the website.
test('the Galaxy Store app: the shop asks the server like the website, a checkout opens Stripe for the app to send to the browser, and the farm waits for it',async()=>{
 const asked=[],paymentRequest=async body=>{asked.push(body);return body.operation==='catalog'?{enabled:true,store:'stripe'}:{url:'https://checkout.stripe.com/c/pay/x',purchaseId:'p1'};};
 const assigned=[],location={...APP_PAGE,search:'?src=galaxy-store&purchase=p0',assign:url=>assigned.push(url)};
 const app=fixture({ua:`${APP_UA} WebBilling/1`,app:true,web:true,user:{id:'A'},paymentRequest,location});await settle();
 const bridge=app.window.harvestBridge,shown=[];bridge.purchaseDone=(id,more)=>shown.push([id,{...more}]);
 assert.deepEqual({...await bridge.payments({operation:'catalog'})},{enabled:true,store:'stripe'});assert.equal(asked[0].store,undefined,'Stripe, as on the website');
 assert.deepEqual({...await bridge.checkout('50','r1')},{store:'browser'});
 assert.deepEqual(assigned,['https://checkout.stripe.com/c/pay/x'],'the app sends it to the phone\'s browser');assert.deepEqual(shown,[['p1',{tab:true,app:true}]],'the farm waits for the payment');
 assert.deepEqual({...bridge.paymentReturn()},{id:'p0',cancelled:false},'a payment that comes back into the app shows as on the website');
 const play=fixture({ua:APP_UA,app:true,user:{id:'A'},paymentRequest,location:{...APP_PAGE}});await settle();asked.length=0;
 assert.equal((await play.window.harvestBridge.payments({operation:'catalog'})).enabled,false,'an app without a store still sells nothing');assert.deepEqual(asked,[]);
});
// 13 Oct 2026 (the measurement package): a reminder that opened the page is said once, with the next farm load (src/supabase.js
// openedBy); a reload or Back to the page is no new open.
test('a push reminder or the daily email that opened the page is noted for the farm load; a reload is not, nor any other address',async()=>{
 const at=search=>({origin:'https://farm.example',href:`https://farm.example/${search}`,search,hash:''});
 for(const [search,navigation,expected] of [['?source=push&open=today','navigate',['push']],['?source=email',null,['email']],['?source=push','reload',[]],['?source=email','back_forward',[]],['?source=pwa','navigate',[]],['?src=android-app','navigate',[]]]){
  const f=fixture({user:{id:'A'},location:at(search),navigation});await settle();
  assert.deepEqual(f.opened,expected,`${search} ${navigation}`);
 }
 const woken=fixture({user:{id:'A'},location:at('?source=push'),navigation:'navigate',discarded:true});await settle();
 assert.deepEqual(woken.opened,[],'a tab the phone put to sleep, loaded again on the push\'s address');
});
