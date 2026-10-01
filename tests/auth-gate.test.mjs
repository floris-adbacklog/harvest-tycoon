import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').split('\n').filter(line=>!line.startsWith('import ')).join('\n');
const accountForm=readFileSync(new URL('../src/account-form.js',import.meta.url),'utf8').replace(/^export /gm,'');
const connectionModule=readFileSync(new URL('../src/connection.js',import.meta.url),'utf8').replace(/^export /gm,'');
const socialModule=readFileSync(new URL('../src/social-login.js',import.meta.url),'utf8').replace(/^export /gm,'');
const inviteModule=readFileSync(new URL('../src/invite-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const partnerModule=readFileSync(new URL('../src/partner-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const browserTipModule=readFileSync(new URL('../src/browser-tip.js',import.meta.url),'utf8').replace(/^export /gm,'');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({ua='',user=null,load,online=true,storage,authApi={},rpc,location={origin:'https://farm.example'}}={}){
 const nodes=new Map(),events={},frames=[],calls=[],analytics=[],game=[],timers=[],lookups=[];let authCallback,currentUser=user,clock=1_000_000,nextTimer=1;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',disabled:false,dataset:{},children:[],textContent:'',setAttribute(){},toggleAttribute(name,on){(this.attrs??={})[name]=Boolean(on);},removeAttribute(name){if(this.attrs)delete this.attrs[name];},focus(){},scrollIntoView(){},replaceChildren(...items){for(const old of this.children)if(!items.includes(old))old.removed=true;this.children=items;},append(node){this.children.push(node);},remove(){this.removed=true;},contentWindow:{}});return nodes.get(id);};
 const document={body:{dataset:{}},hidden:false,getElementById:element,querySelector:element,querySelectorAll:()=>[],createElement(tag){const frame=element('frame'+frames.length);frames.push(frame);return frame;},addEventListener(name,fn){events[name]=fn;}};
 const window={addEventListener(name,fn){events[name]=fn;}};
 const supabase={auth:{onAuthStateChange(fn){authCallback=fn;},async signOut(){currentUser=null;authCallback('SIGNED_OUT',null);return{};},...authApi},...(rpc?{rpc}:{})};
 const context=vm.createContext({createFarmPresence:()=>({dispose(){},snapshot(){return {};}}),document,window,navigator:{onLine:online,userAgent:ua},Date:{now:()=>clock},location,localStorage:storage&&{getItem:key=>storage[key]??null,setItem(key,value){storage[key]=String(value);},removeItem(key){delete storage[key];}},clearInterval(){},URL,queueMicrotask,
  // A delay of 0 runs at once; a real delay waits until the test moves the clock (see advance).
  setTimeout:(fn,ms)=>{if(!ms){queueMicrotask(fn);return 0;}const id=nextTimer++;timers.push({id,at:clock+ms,fn});return id;},clearTimeout:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);},setInterval(){},supabase,isConfigured:true,verifiedUser:async()=>{lookups.push(1);return currentUser;},validUsername:()=>true,chosenLanguage:()=>'en',socialProviders:async()=>[],cloudError:e=>e.message,fetchLeaderboard:async()=>({rows:[]}),trackSignUp(){},trackAuth:(step,params)=>analytics.push({step,...params}),startPwa(){},startUpdateCheck(){},stopPageZoom(){},gameViewport(){},startTranslation(){},renderLanguageSwitch(){},openIntent:()=>null,withoutOpen:href=>href,startPlayerCounts(){},trackGame:(event,params)=>game.push({event,...params}),createNotifications:()=>({}),createChatClient:()=>({dispose(){}}),startLoadingTips:()=>()=>{},ACCOUNT_STEPS:{},functionsUrl:null,isNewRegistration:()=>true,farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:currentUser.id},state:{coins:180},serverNow:Date.now()};}});

 vm.runInContext(accountForm,context);vm.runInContext(connectionModule,context);vm.runInContext(socialModule,context);vm.runInContext(inviteModule,context);vm.runInContext(partnerModule,context);vm.runInContext(browserTipModule,context);vm.runInContext(source,context);
 // Moves the clock forward, running every timer that falls due on the way (and the ones they start).
 const advance=async ms=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();clock=Math.max(clock,next.at);next.fn();await settle();}clock=end;await settle();};
 return {analytics,game,lookups,context,document,window,frames,calls,nodes,events,timers,advance,goOffline(){context.navigator.onLine=false;},goOnline(){context.navigator.onLine=true;},async auth(event,next){currentUser=next;authCallback(event,next?{user:next}:null);await settle();}};
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
 const card=f.nodes.get('.account-card');assert.equal(card.attrs['data-gate'],true);assert.equal(f.nodes.get('gate-open').textContent,'Open in Chrome');
 assert.equal(f.context.location.href,'intent://www.harvesttycoon.com/play.html?utm_source=facebook#Intent;scheme=https;package=com.android.chrome;end');
 assert.equal(storage['harvest-tycoon:browser-escape'],'shown');
 const again=fixture({ua:ANDROID_FB,storage,location:{...page}});await settle();
 assert.equal(again.context.location.href,undefined,'the second visit waits for a tap');assert.equal(again.nodes.get('.account-card').attrs['data-gate'],true);
 again.nodes.get('gate-open').onclick();assert.match(again.context.location.href,/^intent:\/\//);
 await again.advance(1500);assert.equal(again.nodes.get('gate-help').hidden,false,'still here: where the app keeps its own "open in browser"');assert.match(again.nodes.get('gate-help').textContent,/Open in Chrome/);
});
test('on an iPhone the card tries Safari only on a tap; "Play here instead" is remembered and ends the later tip too',async()=>{
 const storage={},f=fixture({ua:IPHONE_IG,storage,location:{...page}});await settle();
 assert.equal(f.context.location.href,undefined,'an iPhone is never sent anywhere by itself');assert.equal(f.nodes.get('gate-open').textContent,'Open in Safari');
 f.nodes.get('gate-open').onclick();assert.equal(f.context.location.href,'x-safari-https://www.harvesttycoon.com/play.html?utm_source=facebook');
 f.nodes.get('gate-stay').onclick();
 assert.equal(storage['harvest-tycoon:browser-escape'],'stay');assert.equal(storage['harvest-tycoon:browser-tip'],'1');assert.equal(f.nodes.get('.account-card').attrs['data-gate'],undefined);
 const later=fixture({ua:IPHONE_IG,storage,location:{...page}});await settle();assert.equal(later.nodes.get('.account-card').attrs?.['data-gate'],false,'the sign-up form straight away');
});
// 30 Sep 2026: TikTok's app has the step too, but Android never leaves it by itself (not known yet whether TikTok passes intent:// on).
const ANDROID_TT='Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 trill_370504 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/trill app_version/37.5.4 ByteLocale/en BytedanceWebview/d8a21c6';
const IPHONE_TT='Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_41.2.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US BytedanceWebview/d8a21c6';
test('inside TikTok the card offers the phone\'s browser too; Android goes to Chrome only on a tap',async()=>{
 const storage={},f=fixture({ua:ANDROID_TT,storage,location:{...page,search:'?utm_source=tiktok&ttclid=E.C.P'}});await settle();
 assert.equal(f.nodes.get('.account-card').attrs['data-gate'],true);assert.equal(f.nodes.get('gate-open').textContent,'Open in Chrome');
 assert.equal(f.context.location.href,undefined,'no jump by itself');assert.equal(storage['harvest-tycoon:browser-escape'],'shown');
 f.nodes.get('gate-open').onclick();assert.equal(f.context.location.href,'intent://www.harvesttycoon.com/play.html?utm_source=tiktok&ttclid=E.C.P#Intent;scheme=https;package=com.android.chrome;end','the ad\'s click id goes along');
 const iphone=fixture({ua:IPHONE_TT,storage:{},location:{...page}});await settle();
 assert.equal(iphone.nodes.get('.account-card').attrs['data-gate'],true);assert.equal(iphone.nodes.get('gate-open').textContent,'Open in Safari');assert.equal(iphone.context.location.href,undefined);
});
test('a phone browser, and every screen that is not sign-in or sign-up, never shows the browser step',async()=>{
 const chrome=fixture({ua:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36',storage:{},location:{...page}});await settle();
 assert.equal(chrome.nodes.get('.account-card').attrs?.['data-gate'],false);assert.equal(chrome.context.location.href,undefined);
 const reset=fixture({ua:ANDROID_FB,user:{id:'A'},storage:{'harvest-tycoon:browser-escape':'shown'},location:{...page,hash:'#access_token=t&type=recovery'}});await settle();
 assert.notEqual(reset.nodes.get('.account-card').attrs?.['data-gate'],true,'a password reset opened in the app still works');
});
test('the page shows the browser step before the script loads, for the same apps, and keeps a friend\'s invite in the link',async()=>{
 const play=readFileSync(new URL('../public/play.html',import.meta.url),'utf8'),tip=await import('../src/browser-tip.js');
 assert.ok(play.includes(`if(${tip.GATE_APP}.test(navigator.userAgent)&&localStorage.getItem('${tip.ESCAPE_KEY}')!=='stay')document.querySelector('.account-card').setAttribute('data-gate','');`));
 for(const ua of [ANDROID_FB,IPHONE_IG,'… [FBAN/FBIOS;FBAV/500.0]','… Barcelona 350.0'])assert.ok(tip.metaApp(ua),ua);
 for(const ua of ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1','Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36','… musical_ly'])assert.ok(!tip.metaApp(ua),ua);
 for(const ua of [ANDROID_FB,IPHONE_IG,ANDROID_TT,IPHONE_TT])assert.ok(tip.gateApp(ua),ua);
 for(const ua of ['Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1','Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36'])assert.ok(!tip.gateApp(ua),ua);
 assert.equal(tip.escapeTarget({origin:'https://www.harvesttycoon.com',pathname:'/play.html',search:'?code=abc&error=x&utm_campaign=eu'},'FARM2026'),'https://www.harvesttycoon.com/play.html?utm_campaign=eu&invite=FARM2026','no sign-in answer, the invite back in');
 assert.ok(/\.account-card\[data-gate\]>:not\(\.card-top\):not\(\.browser-gate\)\{display:none!important\}/.test(readFileSync(new URL('../public/welcome.css',import.meta.url),'utf8')));
 assert.match(readFileSync(new URL('../public/privacy.html',import.meta.url),'utf8'),/<code>harvest-tycoon:browser-escape<\/code>/);
});

test('a refusal from the server (4xx) shows its reason; only a lost or failing connection shows "Reconnecting…"',async()=>{
 const {refused}=await import('../src/connection.js');
 for(const status of [400,403,404,413,422,429])assert.equal(refused(status),true,String(status));
 for(const status of [undefined,408,425,500,502,503,504,546])assert.equal(refused(status),false,String(status));
});
