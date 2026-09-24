import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').split('\n').filter(line=>!line.startsWith('import ')).join('\n');
const accountForm=readFileSync(new URL('../src/account-form.js',import.meta.url),'utf8').replace(/^export /gm,'');
const connectionModule=readFileSync(new URL('../src/connection.js',import.meta.url),'utf8').replace(/^export /gm,'');
const socialModule=readFileSync(new URL('../src/social-login.js',import.meta.url),'utf8').replace(/^export /gm,'');
const inviteModule=readFileSync(new URL('../src/invite-link.js',import.meta.url),'utf8').replace(/^export /gm,'');
const browserTipModule=readFileSync(new URL('../src/browser-tip.js',import.meta.url),'utf8').replace(/^export /gm,'');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({user=null,load,online=true,storage,authApi={},location={origin:'https://farm.example'}}={}){
 const nodes=new Map(),events={},frames=[],calls=[],analytics=[],game=[],timers=[],lookups=[];let authCallback,currentUser=user,clock=1_000_000,nextTimer=1;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',disabled:false,dataset:{},children:[],textContent:'',setAttribute(){},focus(){},scrollIntoView(){},replaceChildren(...items){this.children=items;},append(node){this.children.push(node);},remove(){this.removed=true;},contentWindow:{}});return nodes.get(id);};
 const document={body:{dataset:{}},hidden:false,getElementById:element,querySelector:element,querySelectorAll:()=>[],createElement(tag){const frame=element('frame'+frames.length);frames.push(frame);return frame;},addEventListener(name,fn){events[name]=fn;}};
 const window={addEventListener(name,fn){events[name]=fn;}};
 const supabase={auth:{onAuthStateChange(fn){authCallback=fn;},async signOut(){currentUser=null;authCallback('SIGNED_OUT',null);return{};},...authApi}};
 const context=vm.createContext({createFarmPresence:()=>({dispose(){},snapshot(){return {};}}),document,window,navigator:{onLine:online},Date:{now:()=>clock},location,localStorage:storage&&{getItem:key=>storage[key]??null,setItem(key,value){storage[key]=String(value);},removeItem(key){delete storage[key];}},clearInterval(){},URL,queueMicrotask,
  // A delay of 0 runs at once; a real delay waits until the test moves the clock (see advance).
  setTimeout:(fn,ms)=>{if(!ms){queueMicrotask(fn);return 0;}const id=nextTimer++;timers.push({id,at:clock+ms,fn});return id;},clearTimeout:id=>{const i=timers.findIndex(t=>t.id===id);if(i>=0)timers.splice(i,1);},setInterval(){},supabase,isConfigured:true,verifiedUser:async()=>{lookups.push(1);return currentUser;},validUsername:()=>true,socialProviders:async()=>[],cloudError:e=>e.message,fetchLeaderboard:async()=>({rows:[]}),trackSignUp(){},trackAuth:(step,params)=>analytics.push({step,...params}),startPwa(){},startPlayerCounts(){},trackGame:(event,params)=>game.push({event,...params}),createNotifications:()=>({}),createChatClient:()=>({dispose(){}}),startLoadingTips:()=>()=>{},ACCOUNT_STEPS:{},functionsUrl:null,isNewRegistration:()=>true,farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:currentUser.id},state:{coins:180},serverNow:Date.now()};}});

 vm.runInContext(accountForm,context);vm.runInContext(connectionModule,context);vm.runInContext(socialModule,context);vm.runInContext(inviteModule,context);vm.runInContext(browserTipModule,context);vm.runInContext(source,context);
 // Moves the clock forward, running every timer that falls due on the way (and the ones they start).
 const advance=async ms=>{const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>end)break;timers.shift();clock=Math.max(clock,next.at);next.fn();await settle();}clock=end;await settle();};
 return {analytics,game,lookups,context,document,window,frames,calls,nodes,events,timers,advance,goOffline(){context.navigator.onLine=false;},goOnline(){context.navigator.onLine=true;},async auth(event,next){currentUser=next;authCallback(event,next?{user:next}:null);await settle();}};
}
test('a new visitor does not load or initialize any farm',async()=>{
 const f=fixture();await settle();assert.equal(f.document.body.dataset.phase,'unauthenticated');assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);
});
test('game waits for authenticated server data; logout destroys its frame and bridge',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'checking');
 pending.resolve({profile:{player_id:'A'},state:{coins:230},serverNow:Date.now()});await settle();assert.equal(f.frames.length,1);assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.window.harvestBridge.takeInitial().state.coins,230);
 await f.auth('SIGNED_OUT',null);assert.equal(f.frames[0].removed,true);assert.equal(f.window.harvestBridge,undefined);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('late farm response after logout cannot reopen private gameplay',async()=>{
 const pending=deferred(),f=fixture({user:{id:'A'},load:()=>pending.promise});await settle();await f.auth('SIGNED_OUT',null);pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'unauthenticated');
});
test('cross-tab account switch discards A before B and never mounts a stale response',async()=>{
 const pending=deferred();let count=0;const f=fixture({user:{id:'A'},load:()=>++count===1?pending.promise:Promise.resolve({profile:{player_id:'B'},state:{coins:180},serverNow:Date.now()})});await settle();await f.auth('SIGNED_IN',{id:'B'});pending.resolve({profile:{player_id:'A'},state:{coins:999},serverNow:Date.now()});await settle();assert.equal(f.frames.length,1);assert.equal(f.window.harvestBridge.playerId,'B');assert.equal(f.window.harvestBridge.takeInitial().state.coins,180);
});
test('offline and server failures fail closed without creating fallback farms',async()=>{
 const f=fixture({user:{id:'A'},online:false});await settle();assert.equal(f.calls.length,0);assert.equal(f.frames.length,0);assert.equal(f.document.body.dataset.phase,'error');
 const g=fixture({user:{id:'A'},load:async()=>{throw new Error('Unavailable');}});await settle();assert.equal(g.frames.length,0);assert.equal(g.document.body.dataset.phase,'error');
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
 assert.equal(f.document.body.dataset.phase,'error');assert.equal(f.frames.length,0);
 assert.match(f.nodes.get('account-copy').textContent,/could not reach your farm/);assert.match(f.nodes.get('account-message').textContent,/automatically/);
 await f.advance(5000);assert.equal(f.document.body.dataset.phase,'error','still down: it keeps trying');
 state.fail=null;await f.advance(9000);
 assert.equal(f.document.body.dataset.phase,'authenticated');assert.equal(f.frames.length,1);
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
