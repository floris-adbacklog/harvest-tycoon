import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import * as kongregate from '../supabase/functions/kongregate-auth/kongregate.js';
import {handleKongregateAuth,verifyKongregate,KongregateRefused,kongId,kongToken,cleanUsername,clientIp,ipHash,tokenHash,checkLimit,accountEmail,
 CHECK_LIMIT,TOKEN_FRESH_MS,MESSAGES,AUTH_URL,MAX_BODY} from '../supabase/functions/kongregate-auth/kongregate.js';
import {isRandomPlayerName} from '../src/account-form.js';
import {portalOf,PORTAL_MAIL} from '../supabase/functions/farm-api/portal.js';
import {sendEmailCode,sendEmailChange,confirmEmailChange} from '../supabase/functions/farm-api/event-service.js';
import {handleAdminEmail} from '../supabase/functions/farm-api/admin-service.js';
import {handleDeleteAccount,DELETE_KONGREGATE} from '../supabase/functions/farm-api/account-delete-service.js';
import {PORTAL_MAIL as REMINDER_PORTAL_MAIL} from '../supabase/functions/notify-hourly/job.js';
import {PORTAL_MAIL as HOOK_PORTAL_MAIL} from '../supabase/functions/auth-email/mail.js';
import {provider} from '../src/admin-players.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Kongregate (9 Oct 2026, the owner: "zo simpel mogelijk"): Kongregate's log-in only, checked by our server with Kongregate's
// authenticate.json; no guests, no purchases, no linking. The server half: kongregate-auth, supabase/kongregate.sql and the guards in
// farm-api, diamond-checkout, notify-hourly and auth-email.
const NOW=Date.UTC(2026,9,9,12),KEY='kong-api-key-123',SECRET='secret';
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
// Kongregate's server as the docs describe it: a user id and that user's token give {success:true, username, user_id}; anything else
// {success:false, error:403} with status 200 (style 'body') or the status itself (style 'status').
function fakeKongregate({users={'1480702':{token:'tok-lord',username:'LordSmatchington'}},style='body',down=false,status=null,queryIgnored=false,answer=null}={}){
 const calls=[];
 const reply=(data,code=200)=>new Response(JSON.stringify(data),{status:code,headers:{'Content-Type':'application/json'}});
 async function fetchImpl(url,init={}){
  calls.push({url:String(url),method:init.method,headers:init.headers,body:init.body,signal:init.signal});
  if(down)throw new TypeError('fetch failed');
  if(status)return new Response(status>=500?'<html>busy</html>':JSON.stringify({error:status}),{status});
  if(answer)return reply(answer);
  const u=new URL(url);let q=Object.fromEntries(u.searchParams);
  if(init.method==='POST'){try{q=JSON.parse(init.body);}catch{q={};}}
  else if(queryIgnored)q={};
  if(!q.user_id||!q.game_auth_token||!q.api_key){const data={success:false,error:400,error_description:'user_id, game_auth_token, and api_key are required parameters'};return style==='status'?reply(data,400):reply(data);}
  const user=users[String(q.user_id)];
  if(q.api_key!==KEY||!user||user.token!==q.game_auth_token){const data={success:false,error:403,error_description:'Invalid credentials'};return style==='status'?reply(data,403):reply(data);}
  return reply({success:true,username:user.username,user_id:Number(q.user_id)});
 }
 return {fetchImpl,calls};
}

test('Kongregate is asked with the user id, the token and our key in the query, as the reference defines, from the server only',async()=>{
 const k=fakeKongregate();
 assert.deepEqual(await verifyKongregate({userId:'1480702',token:'tok-lord',apiKey:KEY,fetchImpl:k.fetchImpl}),{userId:'1480702',username:'LordSmatchington'});
 const [call]=k.calls,url=new URL(call.url);
 assert.equal(`${url.origin}${url.pathname}`,AUTH_URL);assert.equal(AUTH_URL,'https://api.kongregate.com/api/authenticate.json');
 assert.deepEqual(Object.fromEntries(url.searchParams),{user_id:'1480702',game_auth_token:'tok-lord',api_key:KEY});
 assert.equal(call.method,'GET');assert.equal(call.headers.Accept,'application/json');assert.ok(call.signal,'a time limit (5 s)');
 // The docs' examples send the three as a JSON body instead: when the query is not read, once more that way.
 const body=fakeKongregate({queryIgnored:true});
 assert.equal((await verifyKongregate({userId:'1480702',token:'tok-lord',apiKey:KEY,fetchImpl:body.fetchImpl})).username,'LordSmatchington');
 assert.deepEqual(body.calls.map(c=>c.method),['GET','POST']);assert.deepEqual(JSON.parse(body.calls[1].body),{user_id:1480702,game_auth_token:'tok-lord',api_key:KEY});
 assert.equal(body.calls[1].headers['Content-Type'],'application/json');
 // Never from the game: the key is only ever read on the server.
 for(const file of ['src/kongregate.js','src/kongregate-page.js','src/kongregate-link.js','public/kongregate.html'])assert.doesNotMatch(read(file),/api_key|KONGREGATE_API_KEY|authenticate\.json/,file);
});

test('a refusal in either style the docs show is a no; a server problem or no answer is not a no, but "try again"',async()=>{
 const reason=async(options,user='1480702',token='tok-lord',apiKey=KEY)=>{
  try{await verifyKongregate({userId:user,token,apiKey,fetchImpl:fakeKongregate(options).fetchImpl});return 'accepted';}
  catch(error){if(error instanceof KongregateRefused){assert.equal(error.message,MESSAGES.token);return error.reason;}return error.transient?'transient':'other';}
 };
 assert.equal(await reason({},'1480702','wrong-token'),'credentials','{success:false, error:403} with status 200');
 assert.equal(await reason({style:'status'},'1480702','wrong-token'),'credentials','status 403');
 assert.equal(await reason({},'1480702','tok-lord','wrong-key'),'credentials','a wrong API key looks the same (index.ts logs it)');
 // Someone changes the user id in the address: Kongregate does not know that id with this token.
 assert.equal(await reason({},'999','tok-lord'),'credentials');
 // And should Kongregate ever answer yes for another user than asked, that is no farm either.
 assert.equal(await reason({answer:{success:true,username:'Other',user_id:42}}),'user');
 assert.equal(await reason({answer:{success:true,username:'NoId'}}),'user');
 for(const status of [500,502,503,429,408])assert.equal(await reason({status}),'transient',String(status));
 assert.equal(await reason({down:true}),'transient','Kongregate unreachable');
 assert.equal(await reason({status:404}),'status 404');
 assert.match(read('supabase/functions/kongregate-auth/kongregate.js'),/signal:AbortSignal\.timeout\(timeoutMs\)/);
 assert.match(read('supabase/functions/kongregate-auth/kongregate.js'),/fetchImpl=globalThis\.fetch,timeoutMs=5000/);
});

test('only a real Kongregate user id and token are taken; a guest (0) or anything else is no request',()=>{
 for(const [value,id] of [['1480702','1480702'],[1480702,'1480702'],[' 42 ','42'],['0',null],[0,null],['-5',null],['12a',null],['007',null],['2147483648',null],['2147483647','2147483647'],[1.5,null],[null,null],[{},null]])
  assert.equal(kongId(value),id,String(value));
 assert.equal(kongToken('a1b2c3'),'a1b2c3');for(const bad of ['',' x','a b','x'.repeat(257),42,null,'é'])assert.equal(kongToken(bad),null,String(bad));
 assert.equal(accountEmail('1480702'),'kg-1480702@players.harvesttycoon.com');assert.ok(PORTAL_MAIL.test(accountEmail('1')));
 for(const pattern of [PORTAL_MAIL,REMINDER_PORTAL_MAIL,HOOK_PORTAL_MAIL])assert.ok(pattern.test('kg-1480702@players.harvesttycoon.com'),'no reminder and no auth email ever goes to it');
});

test('a Kongregate username becomes a farmer name that fits the rule, else a friendly random one',()=>{
 for(const [name,farmer] of [['LordSmatchington','LordSmatchington'],['__Farmer_Joe','Farmer_Joe'],['ab',null],['x_',null],['_',null],['',null],[null,null],['A'.repeat(25),'A'.repeat(20)]])assert.equal(cleanUsername(name),farmer,String(name));
 assert.equal(read('supabase/functions/kongregate-auth/account-form.js'),read('src/account-form.js'),'the same name maker as farm-api (scripts/sync-game.mjs)');
 assert.match(read('scripts/sync-game.mjs'),/src\/account-form\.js.*kongregate-auth\/account-form\.js/);
});

// A database and Auth that keep what they are told, like Supabase's.
const FARMER='00000000-0000-4000-8000-0000000000b1',WEBSITE='00000000-0000-4000-8000-0000000000c1',CG='00000000-0000-4000-8000-0000000000c2';
const session=(id,{role='authenticated',session_id='s-'+id}={})=>`${part({alg:'HS256'})}.${part({sub:id,role,session_id})}.sig`;
function fakeSupabase({users=[],accounts=[],sessions=[],taken=[],slot=true,lostRace=false,saveFails=false}={}){
 const db={users:new Map(users.map(u=>[u.id,structuredClone(u)])),accounts:structuredClone(accounts)};
 const log={created:[],updated:[],deleted:[],links:[],inserted:[],saved:[],slots:[],getUser:0};
 let counter=0;
 const admin={
  from(table){
   assert.equal(table,'kongregate_accounts');
   const filters=[];
   const api={select(){return api;},eq(key,value){filters.push([key,value]);return api;},
    async maybeSingle(){const found=db.accounts.filter(r=>filters.every(([k,v])=>String(r[k])===String(v)));return {data:found[0]?structuredClone(found[0]):null,error:null};},
    async insert(row){
     if(lostRace&&!db.accounts.length)db.accounts.push({kong_user_id:row.kong_user_id,player_id:FARMER,token_hash:null,verified_at:null});
     if(db.accounts.some(a=>String(a.kong_user_id)===String(row.kong_user_id)||a.player_id===row.player_id))return {error:{code:'23505',message:'duplicate key'}};
     db.accounts.push({...row});log.inserted.push({...row});return {error:null};
    },
    update(patch){return {async eq(key,value){if(saveFails)return {error:{message:'down'}};for(const a of db.accounts)if(String(a[key])===String(value))Object.assign(a,patch);log.saved.push([value,patch]);return {error:null};}};}};
   return api;
  },
  async rpc(name,args){
   if(name==='username_available')return {data:!taken.includes(args.p_name.toLowerCase()),error:null};
   if(name==='harvest_session_active')return {data:sessions.includes(args.p_session),error:null};
   if(name==='kongregate_check_slot'){log.slots.push(args);return {data:slot,error:null};}
   throw new Error(`unexpected rpc ${name}`);
  },
  auth:{
   async getUser(token){log.getUser++;const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));const user=db.users.get(claims.sub);return user?{data:{user:structuredClone(user)},error:null}:{data:{user:null},error:{message:'invalid'}};},
   admin:{
    async createUser(attributes){
     if([...db.users.values()].some(u=>u.email===attributes.email))return {data:{user:null},error:{code:'email_exists',message:'A user with this email address has already been registered'}};
     const id=`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`;
     const user={id,email:attributes.email,app_metadata:{provider:'email',providers:['email'],...attributes.app_metadata},user_metadata:{...attributes.user_metadata}};
     db.users.set(id,user);log.created.push(structuredClone(attributes));return {data:{user:structuredClone(user)},error:null};
    },
    async updateUserById(id,attributes){const user=db.users.get(id);if(!user)return {data:{user:null},error:{message:'User not found'}};user.app_metadata={...user.app_metadata,...attributes.app_metadata};log.updated.push([id,structuredClone(attributes)]);return {data:{user:structuredClone(user)},error:null};},
    async getUserById(id){const user=db.users.get(id);return user?{data:{user:structuredClone(user)},error:null}:{data:{user:null},error:{message:'User not found'}};},
    async deleteUser(id){db.users.delete(id);log.deleted.push(id);return {error:null};},
    async generateLink({type,email}){assert.equal(type,'magiclink');log.links.push(email);return {data:{properties:{hashed_token:`hash:${email}`}},error:null};}
   }
  }
 };
 return {admin,db,log};
}
const ENV={apiKey:KEY,secret:SECRET};
const run=(admin,body,{headers={},env=ENV,now=NOW,k=fakeKongregate()}={})=>handleKongregateAuth({admin,body,headers:new Headers(headers),env,now,fetchImpl:k.fetchImpl});
const START={op:'kongregate',user_id:'1480702',game_auth_token:'tok-lord'};
const farmer=()=>({id:FARMER,email:'kg-1480702@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'kongregate',guest:false,kongregate_id:'1480702'},user_metadata:{username:'LordSmatchington'}});

test('signed in to Kongregate for the first time: checked with Kongregate, a new account keyed on the user id, a way in',async()=>{
 const {admin,db,log}=fakeSupabase({taken:['lordsmatchington']}),k=fakeKongregate();
 const r=await run(admin,{...START,language:'nl'},{k,headers:{'x-forwarded-for':'203.0.113.7, 10.0.0.1'}});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data).sort(),['player_id','token_hash'],'the contract: {token_hash, player_id}');
 assert.equal(k.calls.length,1,'Kongregate asked once');
 const [made]=log.created;
 assert.equal(made.email,'kg-1480702@players.harvesttycoon.com');assert.equal(made.email_confirm,true);assert.ok(made.password.length>=40,'a long random password, never stored or shown');
 assert.deepEqual(made.app_metadata,{portal:'kongregate',guest:false,kongregate_id:'1480702'});
 assert.deepEqual(made.user_metadata,{username:'LordSmatchington 2',language:'nl',source:{src:'kongregate',ref:'kongregate.com'}},'Kongregate\'s name (taken: the first free one)');
 assert.equal(db.accounts.length,1);const [row]=db.accounts;
 assert.deepEqual({...row,token_hash:undefined},{kong_user_id:'1480702',player_id:r.data.player_id,token_hash:undefined,verified_at:new Date(NOW).toISOString()});
 assert.equal(row.token_hash,await tokenHash('tok-lord',SECRET));assert.match(row.token_hash,/^[0-9a-f]{64}$/);assert.ok(!JSON.stringify(db).includes('tok-lord'),'the token itself is never kept');
 assert.equal(r.data.token_hash,`hash:${made.email}`);
 const [slot]=log.slots;assert.equal(slot.p_ip,await ipHash('203.0.113.7',SECRET));assert.doesNotMatch(slot.p_ip,/203/);assert.deepEqual([slot.p_max,slot.p_max_all],[CHECK_LIMIT.perIp,CHECK_LIMIT.all]);
 // Only Kongregate's own answer counts for the name: the game's username is never read.
 const sneaky=fakeSupabase();await run(sneaky.admin,{...START,username:'Admin'});assert.equal(sneaky.log.created[0].user_metadata.username,'LordSmatchington');
 const nameless=fakeSupabase();await run(nameless.admin,{...START,user_id:'7',game_auth_token:'t7'},{k:fakeKongregate({users:{'7':{token:'t7',username:'ab'}}})});
 assert.ok(isRandomPlayerName(nameless.log.created[0].user_metadata.username),'nothing usable left of the name: a friendly random one');
});

test('the next start: the same farm; this session already, no new sign-in; within the hour the same token needs no new check',async()=>{
 const hash=await tokenHash('tok-lord',SECRET),checked=new Date(NOW-10*60000).toISOString();
 const {admin,log}=fakeSupabase({users:[farmer()],accounts:[{kong_user_id:'1480702',player_id:FARMER,token_hash:hash,verified_at:checked}],sessions:['s-'+FARMER]});
 const k=fakeKongregate();
 const current=await run(admin,START,{k,headers:{Authorization:`Bearer ${session(FARMER)}`}});
 assert.deepEqual(current,{status:200,data:{ok:true,player_id:FARMER}},'the contract: {ok:true, player_id}');
 assert.equal(k.calls.length,0,'checked ten minutes ago: Kongregate is not asked again');assert.equal(log.slots.length,0);
 assert.equal(log.links.length+log.created.length+log.updated.length,0);
 const other=await run(admin,START,{k});
 assert.deepEqual(other,{status:200,data:{token_hash:`hash:${farmer().email}`,player_id:FARMER}},'another device: a way in to the same farm');
 // An hour later, or another token (Kongregate makes a new one when the password changes): asked again, and remembered.
 const later=await run(admin,START,{k,now:NOW+TOKEN_FRESH_MS});
 assert.equal(later.status,200);assert.equal(k.calls.length,1);assert.deepEqual(log.saved,[['1480702',{token_hash:hash,verified_at:new Date(NOW+TOKEN_FRESH_MS).toISOString()}]]);
 const k2=fakeKongregate({users:{'1480702':{token:'tok-new',username:'LordSmatchington'}}});
 assert.equal((await run(admin,{...START,game_auth_token:'tok-new'},{k:k2})).status,200);assert.equal(k2.calls.length,1,'a new token is always checked');
 // The old token after a password change: Kongregate says no, and a cached check of another token does not help it.
 assert.equal((await run(admin,{...START,game_auth_token:'tok-stolen'},{k:k2})).status,401);
 // A check that cannot be remembered still lets the player in.
 const flaky=fakeSupabase({users:[farmer()],accounts:[{kong_user_id:'1480702',player_id:FARMER,token_hash:null,verified_at:null}],saveFails:true});
 assert.equal((await run(flaky.admin,START)).status,200);
});

test('a wrong token, a changed user id, a guest or a bad request is refused before anything is made',async()=>{
 const {admin,log}=fakeSupabase(),k=fakeKongregate();
 assert.deepEqual(await run(admin,{...START,game_auth_token:'wrong'},{k}),{status:401,data:{error:MESSAGES.token},refused:'credentials'});
 // The user id changed in the address (someone else's id with one's own token): Kongregate's check fails, no farm of the other.
 assert.equal((await run(admin,{...START,user_id:'555'},{k})).status,401);
 assert.equal((await run(admin,START,{k:fakeKongregate({answer:{success:true,username:'LordSmatchington',user_id:555}})})).status,401,'Kongregate\'s own user id must be the one asked');
 for(const body of [{op:'kongregate',user_id:'0',game_auth_token:'guest-token'},{op:'kongregate',user_id:'1480702'},{op:'kongregate',game_auth_token:'tok-lord'},{op:'kongregate',user_id:'abc',game_auth_token:'tok-lord'}])
  assert.deepEqual(await run(admin,body,{k}),{status:400,data:{error:MESSAGES.request}},JSON.stringify(body));
 for(const op of ['guest','crazygames','link','delete'])assert.deepEqual(await run(admin,{op},{k}),{status:400,data:{error:MESSAGES.unknown}},op);
 for(const body of [null,[],'kongregate',7])assert.deepEqual(await run(admin,body,{k}),{status:400,data:{error:MESSAGES.request}});
 assert.equal(log.created.length+log.links.length+log.inserted.length,0);
 assert.equal(k.calls.length,2,'only the two real checks reached Kongregate (the third had a Kongregate of its own)');
});

test('without the API key nobody gets in and nothing is asked; Kongregate down or too many checks from one network: try again later',async()=>{
 const none=fakeSupabase(),k=fakeKongregate();
 for(const apiKey of ['',undefined])assert.deepEqual(await run(none.admin,START,{k,env:{apiKey,secret:SECRET}}),{status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'}});
 assert.equal(k.calls.length,0);assert.equal(none.log.created.length+none.log.slots.length,0);
 const down=fakeSupabase();
 assert.deepEqual(await run(down.admin,START,{k:fakeKongregate({down:true})}),{status:503,data:{error:MESSAGES.unavailable,code:'KONGREGATE_UNAVAILABLE'}});
 assert.deepEqual(await run(down.admin,START,{k:fakeKongregate({status:502})}),{status:503,data:{error:MESSAGES.unavailable,code:'KONGREGATE_UNAVAILABLE'}});
 assert.equal(down.log.created.length,0);
 const busy=fakeSupabase({slot:false}),kb=fakeKongregate();
 assert.deepEqual(await run(busy.admin,START,{k:kb,headers:{'cf-connecting-ip':'198.51.100.1'},env:{...ENV,checkLimit:{perIp:'50',all:'5000'}}}),{status:429,data:{error:MESSAGES.busy}});
 assert.equal(kb.calls.length,0,'over the limit: Kongregate is not asked');assert.deepEqual([busy.log.slots[0].p_max,busy.log.slots[0].p_max_all],[50,5000]);
 assert.deepEqual(checkLimit({}),{perIp:60,all:20000});assert.deepEqual(checkLimit({perIp:'',all:'0'}),{perIp:60,all:20000});assert.deepEqual(checkLimit({perIp:'2.5',all:'-1'}),{perIp:60,all:20000});
 assert.equal(clientIp(new Headers({'cf-connecting-ip':'1.1.1.1','x-real-ip':'2.2.2.2'})),'1.1.1.1');assert.equal(clientIp(new Headers({})),null);assert.equal(await ipHash(null,'s'),null);
 assert.notEqual(await ipHash('1.1.1.1','a'),await ipHash('1.1.1.1','b'),'keyed: not a plain hash anyone can recompute');
});

test('never linked: a website, CrazyGames or another session is left alone and the Kongregate player gets a farm of their own',async()=>{
 const website={id:WEBSITE,email:'farmer@example.com',app_metadata:{provider:'email'},user_metadata:{}};
 const cg={id:CG,email:'cg-x@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:true},user_metadata:{}};
 for(const [label,user] of [['a website account',website],['a CrazyGames guest',cg]]){
  const {admin,log,db}=fakeSupabase({users:[user],sessions:['s-'+user.id]});
  const r=await run(admin,START,{headers:{Authorization:`Bearer ${session(user.id)}`}});
  assert.equal(r.status,200,label);assert.notEqual(r.data.player_id,user.id,label);assert.equal(log.created.length,1,label);
  assert.deepEqual(db.users.get(user.id).app_metadata,user.app_metadata,`${label}: left as it was`);
 }
 const anon=fakeSupabase({users:[farmer()],accounts:[{kong_user_id:'1480702',player_id:FARMER}]});
 const r=await run(anon.admin,START,{headers:{Authorization:`Bearer ${session(FARMER,{role:'anon'})}`}});
 assert.deepEqual(r.data,{token_hash:`hash:${farmer().email}`,player_id:FARMER});assert.equal(anon.log.getUser,0,'the public key is not even looked up');
 // A farm whose marks did not get saved is put right.
 const unmarked=fakeSupabase({users:[{...farmer(),app_metadata:{provider:'email'}}],accounts:[{kong_user_id:'1480702',player_id:FARMER}]});
 await run(unmarked.admin,START);assert.deepEqual(unmarked.db.users.get(FARMER).app_metadata.kongregate_id,'1480702');
});

test('two first starts at the same moment and a taken address end on one farm',async()=>{
 const race=fakeSupabase({users:[farmer()],lostRace:true});
 const r=await run(race.admin,START);
 assert.equal(r.data.player_id,FARMER,'the other start made the farm: that one opens');assert.equal(race.log.deleted.length,1,'the extra account is removed again');
 assert.match(race.log.created[0].email,/^kg-1480702-[0-9a-f]{6}@players\.harvesttycoon\.com$/,'the first address was taken');
 assert.equal(race.log.saved.length,1,'the check is remembered on the farm that won');
 const squatted=fakeSupabase({users:[{id:WEBSITE,email:'kg-1480702@players.harvesttycoon.com',app_metadata:{provider:'email'},user_metadata:{}}]});
 const own=await run(squatted.admin,START);assert.notEqual(own.data.player_id,WEBSITE,'an account someone else made with that address is never used');
});

test('the Edge Function itself: OPTIONS, POST JSON up to 4 KB, the secrets from the environment, a 503 that names nothing',async()=>{
 const source=stripTypeScriptTypes(read('supabase/functions/kongregate-auth/index.ts').replace(/^import .*;\n/gm,''));
 const settings={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',KONGREGATE_API_KEY:` ${KEY} `,KONGREGATE_CHECK_LIMIT:'12'};
 const logs=[];
 const start=(admin,k=fakeKongregate(),env=settings)=>{let handler;vm.runInNewContext(source,{...kongregate,handleKongregateAuth:args=>handleKongregateAuth({...args,fetchImpl:k.fetchImpl}),createClient:()=>admin,
  Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},Response,JSON,String,Error,console:{error:(...a)=>logs.push(a.join(' '))}});
  return (method,body,more={})=>handler(new Request('https://x.supabase.co/functions/v1/kongregate-auth',{method,headers:{'Content-Type':'application/json',...more},...(body===undefined?{}:{body})}));};
 const {admin,log}=fakeSupabase(),call=start(admin);
 const options=await call('OPTIONS');assert.equal(options.status,200);assert.equal(options.headers.get('access-control-allow-origin'),'*');assert.match(options.headers.get('access-control-allow-headers'),/authorization/);
 assert.equal((await call('GET')).status,405);
 assert.equal((await call('POST','{"op":"kongregate","pad":"'+'x'.repeat(MAX_BODY)+'"}')).status,413);
 assert.deepEqual(await (await call('POST','not json')).json(),{error:MESSAGES.request});
 const ok=await call('POST',JSON.stringify(START),{'x-real-ip':'192.0.2.4'});
 assert.equal(ok.status,200);assert.equal(ok.headers.get('content-type'),'application/json');assert.equal(ok.headers.get('cache-control'),'no-store');
 assert.deepEqual(Object.keys(await ok.json()).sort(),['player_id','token_hash'],'the key is used trimmed');
 assert.equal(log.slots[0].p_max,12);assert.equal(log.slots[0].p_ip,await ipHash('192.0.2.4','service'),'the service role key keys the hashes when KONGREGATE_IP_SECRET is not set');
 const refused=await call('POST',JSON.stringify({...START,game_auth_token:'nope'}));assert.equal(refused.status,401);assert.deepEqual(Object.keys(await refused.json()),['error'],'why stays in the log');
 const missing=start(fakeSupabase().admin,fakeKongregate(),{...settings,KONGREGATE_API_KEY:''});
 assert.equal((await missing('POST',JSON.stringify(START))).status,503);
 const broken=start({...admin,rpc:async()=>({error:{code:'XX000',message:'database down'}})});
 assert.deepEqual(await (await broken('POST',JSON.stringify({...START,game_auth_token:'other'}))).json(),{error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'});
 assert.ok(logs.some(line=>/Kongregate refused a sign-in check: credentials/.test(line)));assert.ok(logs.some(line=>/KONGREGATE_API_KEY is not set/.test(line)));
 assert.ok(!logs.some(line=>line.includes(KEY)||line.includes('tok-lord')||line.includes('nope')),'never the key or a token in the log');
 const index=read('supabase/functions/kongregate-auth/index.ts');
 assert.match(index,/Deploy with --no-verify-jwt/);assert.match(index,/apiKey:env\('KONGREGATE_API_KEY'\)\.trim\(\)/);assert.match(index,/secret:env\('KONGREGATE_IP_SECRET'\)\|\|env\('SUPABASE_SERVICE_ROLE_KEY'\)/);
 assert.equal(read('supabase/functions/kongregate-auth/deno.json'),read('supabase/functions/farm-api/deno.json'));
});

// ---- supabase/kongregate.sql: the tables, and every patch of a live function ----
const SQL=read('supabase/kongregate.sql');
function patches(){
 const found=[];
 for(const m of SQL.matchAll(/select pg_temp\.kongregate_patch\('([^']+)',\$m\$([\s\S]*?)\$m\$,\s*\$a\$([\s\S]*?)\$a\$,\s*\$b\$([\s\S]*?)\$b\$\);/g))found.push({fn:m[1],marker:m[2],from:m[3],to:m[4]});
 return found;
}
const once=(text,piece)=>text.split(piece).length-1;
// The CrazyGames patches (crazygames.sql) as the database has them, to build today's live definitions from the repository.
const cgPatches=()=>[...read('supabase/crazygames.sql').matchAll(/select pg_temp\.crazygames_patch\(('[^']*'|fn::regprocedure),(\$m\$[\s\S]*?\$m\$|'[^']*'),\s*\$a\$([\s\S]*?)\$a\$,\s*\$b\$([\s\S]*?)\$b\$\)/g)].map(m=>({fn:m[1].replace(/'/g,''),from:m[3],to:m[4]}));
test('kongregate.sql: the tables service-role only, the check limit as CrazyGames\' guest limit, re-runnable',()=>{
 assert.match(SQL,/create table if not exists public\.kongregate_accounts \(\n kong_user_id bigint primary key check \(kong_user_id between 1 and 2147483647\),\n player_id uuid not null unique references auth\.users\(id\) on delete cascade,\n token_hash text check \(token_hash is null or char_length\(token_hash\)=64\),\n verified_at timestamptz,\n created_at timestamptz not null default now\(\)\n\);/);
 for(const table of ['kongregate_accounts','kongregate_check_ips'])assert.match(SQL,new RegExp(`alter table public\\.${table} enable row level security;\\nrevoke all on public\\.${table} from anon, authenticated;`),table);
 assert.match(SQL,/revoke all on function public\.kongregate_check_slot\(text,integer,integer\) from public, anon, authenticated;\ngrant execute on function public\.kongregate_check_slot\(text,integer,integer\) to service_role;/);
 assert.match(SQL,/perform pg_advisory_xact_lock\(hashtextextended\('kongregate-check:'\|\|coalesce\(p_ip,''\),0\)\);/);
 assert.match(SQL,/select cron\.unschedule\('harvest-kongregate-check-ips'\) where exists\(select 1 from cron\.job where jobname='harvest-kongregate-check-ips'\);\nselect cron\.schedule\('harvest-kongregate-check-ips','\*\/15 \* \* \* \*',\$c\$delete from public\.kongregate_check_ips where created_at<now\(\)-interval '1 hour'\$c\$\);/);
 assert.match(SQL,/if position\(p_marker in def\)>0 then return; end if;\n if position\(p_from in def\)=0 or \(length\(def\)-length\(replace\(def,p_from,''\)\)\)\/length\(p_from\)<>1 then/,'patched already: left alone; not there once: stops');
 // It removes nothing (beyond the hashes it keeps itself); the deletion function's own lines are only moved along with it.
 assert.doesNotMatch(SQL.replace(/\$a\$[\s\S]*?\$a\$|\$b\$[\s\S]*?\$b\$/g,''),/drop |truncate |delete from public\.(?!kongregate_check_ips)/i,'it removes nothing of anyone');
 // The code's names for them.
 const code=read('supabase/functions/kongregate-auth/kongregate.js');
 for(const name of ["from('kongregate_accounts')","rpc('kongregate_check_slot'",'kong_user_id','token_hash','verified_at'])assert.ok(code.includes(name),name);
});
test('kongregate.sql: every patch runs once, keeps CrazyGames\' own marks, and does what it says on today\'s definitions',()=>{
 const list=patches();
 assert.deepEqual(list.map(p=>p.fn),['public.harvest_email_checked(uuid)','public.notification_candidates()','public.admin_player_accounts(uuid,text)','public.chat_broadcast_filters(jsonb)','public.chat_broadcast_filters(jsonb)','public.chat_broadcast_targets(uuid,jsonb)','public.harvest_delete_account(uuid,text)']);
 for(const p of list){
  assert.ok(p.to.includes(p.marker),`${p.fn}: after the patch its marker is there, so running the file again changes nothing`);
  assert.ok(!p.from.includes(p.marker),`${p.fn}: the marker is not in the text it replaces`);
 }
 // Today's definitions, from the repository: the group filters and the delete function as written, the others with crazygames.sql's
 // patches applied (the live text was read on 9 Oct 2026 and has each looked-for line exactly once).
 const cg=cgPatches(),cgTo=fn=>cg.filter(p=>p.fn===fn).map(p=>p.to).join('\n');
 const group=read('supabase/chat-group-filters.sql'),remove=read('supabase/delete-account.sql');
 const where={'public.harvest_email_checked(uuid)':cgTo('public.harvest_email_checked(uuid)'),'public.notification_candidates()':cgTo('public.notification_candidates()'),
  'public.admin_player_accounts(uuid,text)':cgTo('public.admin_player_accounts(uuid,text)'),'public.chat_broadcast_filters(jsonb)':group,'public.chat_broadcast_targets(uuid,jsonb)':group,'public.harvest_delete_account(uuid,text)':remove};
 for(const p of list)assert.equal(once(where[p.fn],p.from),1,`${p.fn}: ${p.from.slice(0,70)}`);
 // CrazyGames' patches still find themselves done after these (crazygames.sql stays re-runnable).
 const marks=[...read('supabase/crazygames.sql').matchAll(/select pg_temp\.crazygames_patch\('([^']*)',(\$m\$[\s\S]*?\$m\$|'[^']*')/g)].map(m=>({fn:m[1],marker:m[2].replace(/^\$m\$|\$m\$$/g,'').replace(/^'|'$/g,'')}));
 for(const p of list){for(const m of marks.filter(m=>m.fn===p.fn))assert.ok(!p.from.includes(m.marker)||p.to.includes(m.marker),`${p.fn} keeps ${m.marker}`);}
 // What each does.
 let checked=/create or replace function public\.harvest_email_checked[\s\S]*?\$f\$([\s\S]*?)\$f\$;/.exec(read('supabase/event-email-check.sql'))[1];
 for(const p of cg.filter(p=>p.fn==='public.harvest_email_checked(uuid)'))checked=checked.replace(p.from,p.to);
 for(const p of list.filter(p=>p.fn==='public.harvest_email_checked(uuid)'))checked=checked.replace(p.from,p.to);
 assert.equal(checked.trim(),`select exists(select 1 from auth.users u where u.id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and (coalesce(u.raw_app_meta_data->>'provider','email')<>'email' or u.raw_app_meta_data->>'portal'='crazygames' or u.raw_app_meta_data->>'portal'='kongregate'))
  or exists(select 1 from public.email_checks c join auth.users u on u.id=c.player_id where c.player_id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and c.confirmed_at is not null and lower(c.email)=lower(u.email))`,'a Kongregate player gets the email bonus quietly');
 const of=fn=>list.filter(p=>p.fn===fn);
 assert.match(of('public.notification_candidates()')[0].to,/^coalesce\(u\.raw_app_meta_data->>'portal',''\) not in \('crazygames','kongregate'\)$/,'no reminders');
 assert.match(of('public.admin_player_accounts(uuid,text)')[0].to,/^case when u\.raw_app_meta_data->>'portal'='kongregate' then 'kongregate' when u\.raw_app_meta_data->>'portal'='crazygames' then case$/);
 assert.equal(provider('kongregate'),'Kongregate','the Players tab says Kongregate');assert.equal(provider('crazygames'),'CrazyGames');
 let filters=group;for(const p of of('public.chat_broadcast_filters(jsonb)'))filters=filters.replace(p.from,p.to);
 assert.match(filters,/if k not in \('minLevel','maxLevel','active','platform','notPlatform','crazygames','kongregate','language','family'\) then/);assert.match(filters,/elsif k in \('crazygames','kongregate'\) then\n   if v is distinct from 'true'::jsonb then/);
 assert.match(of('public.chat_broadcast_targets(uuid,jsonb)')[0].to,/\n  and \(p_filters->'kongregate' is null or exists\(select 1 from auth\.users u where u\.id=ps\.player_id and u\.raw_app_meta_data->>'portal'='kongregate'\)\)$/);
 // The new table holds a player id: it joins the account deletion (the deletion audit, tests/delete-account.test.mjs).
 const [removal]=of('public.harvest_delete_account(uuid,text)');
 assert.match(removal.to,/\n delete from public\.kongregate_accounts where player_id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('kongregate_accounts',n\);$/);
 assert.match(SQL,/revoke all on function public\.harvest_delete_account\(uuid,text\) from public, anon, authenticated;\ngrant execute on function public\.harvest_delete_account\(uuid,text\) to service_role;\n$/);
 // No new text for players in the database (the chat refusals stay CrazyGames' own: Kongregate has no guests).
 assert.doesNotMatch(SQL,/raise exception '/);
});

test('farm-api, diamond-checkout and the admin: a Kongregate account has no email, no deletion here, nothing to buy',async()=>{
 const kg={id:FARMER,email:'kg-1480702@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'kongregate',guest:false,kongregate_id:'1480702'}};
 assert.deepEqual(portalOf(kg),{id:'kongregate',name:'Kongregate',guest:false});
 const nothing={rpc:async()=>{throw new Error('no database call');},from:()=>{throw new Error('no database call');}},sent=[];
 for(const ask of [()=>sendEmailCode({admin:nothing,user:kg,mail:async to=>sent.push(to)}),()=>sendEmailChange({admin:nothing,user:kg,email:'me@example.com',password:'x',passwordOk:async()=>true,mail:async to=>sent.push(to)}),()=>confirmEmailChange({admin:nothing,user:kg,code:'123456'})])
  await assert.rejects(ask,/You play with Kongregate, so your account has no email address\./);
 assert.equal(sent.length,0);
 await assert.rejects(()=>sendEmailCode({admin:nothing,user:{...kg,app_metadata:{portal:'crazygames'}},mail:async()=>{}}),/You play with CrazyGames/,'CrazyGames as before');
 const owner={id:'00000000-0000-4000-8000-0000000000aa',email:'floris@millstone.nl',email_confirmed_at:'2026-09-01T00:00:00Z',signInMethods:['oauth']},moved=[];
 const admin={auth:{admin:{async getUserById(){return {data:{user:kg},error:null};},async updateUserById(...a){moved.push(a);return {};}}},from(){throw new Error('no write');}};
 const r=await handleAdminEmail({admin,body:{playerId:FARMER,email:'real@example.com'},user:owner});
 assert.equal(r.status,400);assert.match(r.data.error,/plays on Kongregate/);assert.equal(moved.length,0);
 // farm-api marks the account's provider, so the email sign-up rules leave it out (index.ts), and deletion is refused before anything.
 assert.match(read('supabase/functions/farm-api/index.ts'),/if\(user\.app_metadata\?\.portal==='kongregate'\)user\.app_metadata=\{\.\.\.user\.app_metadata,provider:'kongregate'\};/);
 const refused=await handleDeleteAccount({admin:nothing,body:{username:'LordSmatchington'},user:{...kg,app_metadata:{...kg.app_metadata,provider:'kongregate'}}});
 assert.deepEqual(refused,{status:403,data:{error:DELETE_KONGREGATE,code:'ACTION_REJECTED'}});
 for(const text of [DELETE_KONGREGATE,'You play with Kongregate, so your account has no email address.'])assert.ok(JSON.parse(read('i18n/ignore.json')).includes(text),'never shown in the game (no email or delete there)');
 // diamond-checkout: never a Stripe, Google Play or App Store purchase for a Kongregate account.
 const payments=await import('../supabase/functions/diamond-checkout/payments.js'),googlePlay=await import('../supabase/functions/diamond-checkout/google-play.js'),appStore=await import('../supabase/functions/diamond-checkout/app-store.js');
 const source=stripTypeScriptTypes(read('supabase/functions/diamond-checkout/index.ts').replace(/^import .*;\n/gm,''));
 const send=async(user,body)=>{
  let handler;const stripe=[];
  const db={auth:{async getUser(){return {data:{user:structuredClone(user)},error:null};}},async rpc(name){assert.equal(name,'harvest_session_active');return {data:true,error:null};},from(){throw new Error('no look-up');}};
  vm.runInNewContext(source,{...payments,...googlePlay,...appStore,Stripe:class{constructor(){stripe.push('made');}},createClient:()=>db,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,atob,console:{error(){}}});
  const token=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
  const res=await handler(new Request('https://test.invalid/diamond-checkout',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
  return {status:res.status,data:await res.json(),stripe};
 };
 const create={operation:'create',pack:Object.keys(payments.PAYMENT_PACKS)[0],requestId:crypto.randomUUID()};
 for(const order of [create,{...create,store:'google_play'},{...create,store:'app_store'},...Object.keys(payments.PAYMENT_PACKS).filter(pack=>/^\d+$/.test(pack)).map(pack=>({...create,pack})),{...create,pack:'pass'}]){
  const r=await send(kg,order);assert.deepEqual([r.status,r.data],[403,{error:'Purchases are not available on Kongregate.'}],JSON.stringify(order));assert.deepEqual(r.stripe,[]);
 }
});

test('the privacy policy names Kongregate next to CrazyGames: what we get, the scrambled token and address, how to delete',()=>{
 const policy=read('public/privacy.html');
 assert.match(policy,/<li>On Kongregate you play with your Kongregate account, and we load no trackers there\. See <a href="#kongregate">Playing on Kongregate<\/a>\.<\/li>/);
 assert.match(policy,/<h3 id="kongregate">Playing on Kongregate<\/h3>/);assert.match(policy,/<strong>Kongregate user ID<\/strong>, <strong>username<\/strong> and a sign-in token/);
 assert.match(policy,/keeps a scrambled form \(a keyed hash\) of the token, never the token itself/);
 assert.match(policy,/our server keeps a scrambled form \(a keyed hash\) of your IP address for at most two hours, never the address itself\./);
 assert.match(policy,/with your farmer name and your Kongregate username, and we delete your farm/);
 for(const key of ['kg-user','kg-locale'])assert.match(policy,new RegExp(`<code>harvest-tycoon:${key}</code>`),key);
 assert.match(policy,/<li><strong>Playing on Kongregate<\/strong>: the link between your Kongregate user ID and your farm, for as long as your account exists;/);
 assert.ok(policy.indexOf('id="crazygames"')<policy.indexOf('id="kongregate"')&&policy.indexOf('id="kongregate"')<policy.indexOf('id="android-app"'),'next to CrazyGames');
 assert.match(read('src/kongregate-page.js'),/export const KG_KEY='harvest-tycoon:kg-user';/);assert.match(read('src/kongregate-page.js'),/export const LOCALE_KEY='harvest-tycoon:kg-locale';/);
});
