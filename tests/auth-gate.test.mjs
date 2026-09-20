import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').split('\n').filter(line=>!line.startsWith('import ')).join('\n');
const accountForm=readFileSync(new URL('../src/account-form.js',import.meta.url),'utf8').replace(/^export /gm,'');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture({user=null,load,online=true,storage,authApi={},location={origin:'https://farm.example'}}={}){
 const nodes=new Map(),events={},frames=[],calls=[],analytics=[];let authCallback,currentUser=user;
 const element=id=>{if(!nodes.has(id))nodes.set(id,{id,hidden:false,value:'',disabled:false,dataset:{},children:[],textContent:'',setAttribute(){},focus(){},scrollIntoView(){},replaceChildren(...items){this.children=items;},append(node){this.children.push(node);},remove(){this.removed=true;},contentWindow:{}});return nodes.get(id);};
 const document={body:{dataset:{}},hidden:false,getElementById:element,querySelector:element,querySelectorAll:()=>[],createElement(tag){const frame=element('frame'+frames.length);frames.push(frame);return frame;},addEventListener(name,fn){events[name]=fn;}};
 const window={addEventListener(name,fn){events[name]=fn;}};
 const supabase={auth:{onAuthStateChange(fn){authCallback=fn;},async signOut(){currentUser=null;authCallback('SIGNED_OUT',null);return{};},...authApi}};
 const context=vm.createContext({createFarmPresence:()=>({dispose(){},snapshot(){return {};}}),document,window,navigator:{onLine:online},location,localStorage:storage&&{getItem:key=>storage[key]??null,setItem(key,value){storage[key]=String(value);},removeItem(key){delete storage[key];}},clearInterval(){},URL,queueMicrotask,setTimeout:fn=>queueMicrotask(fn),setInterval(){},supabase,isConfigured:true,verifiedUser:async()=>currentUser,validUsername:()=>true,cloudError:e=>e.message,fetchLeaderboard:async()=>({rows:[]}),trackSignUp(){},trackAuth:(step,params)=>analytics.push({step,...params}),startPwa(){},createNotifications:()=>({}),functionsUrl:null,isNewRegistration:()=>true,farmRequest:async body=>{calls.push(body);return load?load(body):{profile:{player_id:currentUser.id},state:{coins:180},serverNow:Date.now()};}});

 vm.runInContext(accountForm,context);vm.runInContext(source,context);
 return {analytics,context,document,window,frames,calls,nodes,events,async auth(event,next){currentUser=next;authCallback(event,next?{user:next}:null);await settle();}};
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
