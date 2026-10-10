import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import * as discord from '../supabase/functions/discord-auth/discord.js';
import {handleDiscordAuth,verifyDiscord,DiscordRefused,discordId,discordCode,discordLocale,retryAfter,accountEmail,
 MESSAGES,TOKEN_URL,ME_URL,MAX_BODY} from '../supabase/functions/discord-auth/discord.js';
import {isRandomPlayerName} from '../src/account-form.js';
import {portalOf,PORTAL_MAIL} from '../supabase/functions/farm-api/portal.js';
import {sendEmailCode,sendEmailChange,confirmEmailChange} from '../supabase/functions/farm-api/event-service.js';
import {handleAdminEmail} from '../supabase/functions/farm-api/admin-service.js';
import {handleDeleteAccount,DELETE_DISCORD,DELETE_KONGREGATE} from '../supabase/functions/farm-api/account-delete-service.js';
import {PORTAL_MAIL as REMINDER_PORTAL_MAIL} from '../supabase/functions/notify-hourly/job.js';
import {PORTAL_MAIL as HOOK_PORTAL_MAIL} from '../supabase/functions/auth-email/mail.js';
import {provider} from '../src/admin-players.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Discord (10 Oct 2026, the owner: the simplest version, as Kongregate): the Activity's Discord log-in only (OAuth scope identify),
// swapped on our server; no guests, no purchases, never Discord's avatar, its name only on the player's own link ticket. The server
// half: discord-auth, supabase/discord.sql and the guards in farm-api and diamond-checkout (notify-hourly and auth-email skip the
// address by its domain). The same day, the owner's "doe 2": a new Discord player chooses a new farm or their harvesttycoon.com farm
// (the link ops: tests/discord-link-server.test.mjs).
const CLIENT_ID='1290000000000000001',SECRET='dc-client-secret-123',DISCORD_ID='81384788765712384';
const NELLY={id:DISCORD_ID,username:'nelly',global_name:'Nelly',avatar:'8342729096ea3675442027381ff50dfe',locale:'en-US'};
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
// Discord's OAuth2 as the docs describe it: a code works once and only with our id and secret (form-encoded), and gives an access token
// that reads the user at users/@me. `limit`/`status` make one step answer 429 or another status; `down` is no answer at all.
function fakeDiscord({codes={'code-1':NELLY,'code-2':NELLY,'code-3':NELLY},limit=null,status=null,down=false,token=null,me=null}={}){
 const calls=[],used=new Set(),tokens=new Map();let n=0;
 const reply=(data,code=200,headers={})=>new Response(typeof data==='string'?data:JSON.stringify(data),{status:code,headers:{'Content-Type':'application/json',...headers}});
 async function fetchImpl(url,init={}){
  const step=String(url)===TOKEN_URL?'token':String(url)===ME_URL?'me':null;
  calls.push({step,url:String(url),method:init.method,headers:init.headers,body:init.body,signal:init.signal});
  if(!step)throw new Error(`unexpected address ${url}`);
  if(down)throw new TypeError('fetch failed');
  if(limit?.at===step)return reply(limit.body??{message:'You are being rate limited.',retry_after:limit.retry_after,global:false},429,limit.headers);
  if(status?.at===step)return reply(status.body??'<html>busy</html>',status.code);
  if(step==='token'){
   if(token)return reply(token);
   const form=new URLSearchParams(init.body);
   if(init.headers['Content-Type']!=='application/x-www-form-urlencoded')return reply({error:'invalid_request'},400);
   if(form.get('client_id')!==CLIENT_ID||form.get('client_secret')!==SECRET)return reply({error:'invalid_client'},401);
   if(form.get('grant_type')!=='authorization_code')return reply({error:'unsupported_grant_type'},400);
   const code=form.get('code'),user=codes[code];
   if(!user||used.has(code))return reply({error:'invalid_grant',error_description:'Invalid "code" in request.'},400);
   used.add(code);const access=`access-${++n}`;tokens.set(access,user);
   return reply({token_type:'Bearer',access_token:access,expires_in:604800,refresh_token:`refresh-${n}`,scope:'identify'});
  }
  if(me)return reply(me);
  const user=tokens.get(String(init.headers.Authorization??'').replace(/^Bearer /,''));
  return user?reply({...user,discriminator:'0'}):reply({message:'401: Unauthorized',code:0},401);
 }
 return {fetchImpl,calls};
}

test('Discord is asked from the server only: the code swapped with our secret, form-encoded, then users/@me with that token',async()=>{
 const d=fakeDiscord();
 // The id and the locale; the username only for a link ticket (discord-link-server.test.mjs), never the display name or the avatar.
 assert.deepEqual(await verifyDiscord({code:'code-1',clientId:CLIENT_ID,clientSecret:SECRET,fetchImpl:d.fetchImpl}),{userId:DISCORD_ID,locale:'en-US',displayName:'nelly'});
 const [swap,who]=d.calls;
 // The versioned API: unversioned is v6, where retry_after counts milliseconds and a short wait would lock everyone out for an hour.
 assert.equal(TOKEN_URL,'https://discord.com/api/v10/oauth2/token');assert.equal(ME_URL,'https://discord.com/api/v10/users/@me');
 assert.deepEqual([swap.url,who.url],[TOKEN_URL,ME_URL]);
 assert.equal(swap.method,'POST');assert.equal(swap.headers['Content-Type'],'application/x-www-form-urlencoded');assert.equal(swap.headers.Accept,'application/json');
 assert.deepEqual(Object.fromEntries(new URLSearchParams(swap.body)),{client_id:CLIENT_ID,client_secret:SECRET,grant_type:'authorization_code',code:'code-1'},'no redirect_uri, as Discord\'s Activity starter');
 assert.equal(who.method,'GET');assert.equal(who.headers.Authorization,'Bearer access-1');
 assert.ok(swap.signal&&who.signal,'a time limit (5 s) on each');
 assert.match(read('supabase/functions/discord-auth/discord.js'),/fetchImpl=globalThis\.fetch,timeoutMs=5000/);
 assert.match(read('supabase/functions/discord-auth/discord.js'),/signal:AbortSignal\.timeout\(timeoutMs\)/);
 // Never in the game: the secret and the swap are only ever on the server.
 const game=[...readdirSync(new URL('../src/',import.meta.url)).filter(f=>/discord/i.test(f)).map(f=>`src/${f}`),...['public/discord.html','public/discord.css'].filter(f=>existsSync(new URL(`../${f}`,import.meta.url)))];
 for(const file of game)assert.doesNotMatch(read(file),/client_secret|DISCORD_CLIENT_SECRET|oauth2\/token|users\/@me/,file);
});

test('a code Discord refuses is a no; our own settings refused, a wait, or a server problem are not',async()=>{
 const outcome=async(options,code='code-1',clientSecret=SECRET)=>{
  try{await verifyDiscord({code,clientId:CLIENT_ID,clientSecret,fetchImpl:fakeDiscord(options).fetchImpl});return 'accepted';}
  catch(error){if(error instanceof DiscordRefused){assert.equal(error.message,MESSAGES.code);return error.reason;}return error.retryAfter?`wait ${error.retryAfter}`:error.transient?'transient':'other';}
 };
 assert.equal(await outcome({},'made-up'),'invalid_grant','a wrong or used code');
 assert.equal(await outcome({},'code-1','wrong-secret'),'invalid_client','a wrong secret (index.ts logs it)');
 assert.equal(await outcome({status:{at:'me',code:401,body:{message:'401: Unauthorized',code:0}}}),'status 401');
 assert.equal(await outcome({me:{...NELLY,id:81384788765712384}}),'user','an id as a number is not taken');
 assert.equal(await outcome({me:{username:'nelly'}}),'user');
 for(const at of ['token','me']){
  for(const code of [500,502,503,408])assert.equal(await outcome({status:{at,code}}),'transient',`${at} ${code}`);
  assert.equal(await outcome({limit:{at,retry_after:2.5}}),'wait 3',`${at} 429: Discord's retry_after, whole seconds`);
 }
 assert.equal(await outcome({down:true}),'transient','Discord unreachable');
 assert.equal(await outcome({status:{at:'token',code:403}}),'transient','a page without Discord\'s JSON is Cloudflare in front of it, not a no');
 assert.equal(await outcome({token:{token_type:'Bearer'}}),'transient','no access token in the answer');
 assert.equal(await outcome({limit:{at:'token',body:'<html>blocked</html>',headers:{'Retry-After':'7'}}}),'wait 7','the header when the body says nothing (a Cloudflare block)');
 assert.equal(await outcome({limit:{at:'token',body:'<html>blocked</html>'}}),'wait 60','a minute when nothing says how long');
 assert.equal(retryAfter({retry_after:99999}),3600);assert.equal(retryAfter({retry_after:0.2}),1);assert.equal(retryAfter(null,new Headers({'retry-after':'x'})),60);
});

test('only a real code is taken; a Discord id is 17 to 20 digits as text; the locale as Discord writes it',()=>{
 for(const [value,ok] of [[DISCORD_ID,true],['12345678901234567890',true],['1234567890123456',false],['123456789012345678901',false],[81384788765712384,false],[` ${DISCORD_ID}`,false],['8138478876571238x',false],[null,false]])
  assert.equal(discordId(value),ok?value:null,String(value));
 assert.equal(discordCode('NhhvTDYsFcdgNLnnLijcl7Ku7bEEeee'),'NhhvTDYsFcdgNLnnLijcl7Ku7bEEeee');
 for(const bad of ['',' x','a b','x'.repeat(257),42,null,'é',{}])assert.equal(discordCode(bad),null,String(bad));
 for(const locale of ['nl','en-US','pt-BR','es-419','zh-CN','sv-SE'])assert.equal(discordLocale(locale),locale);
 for(const bad of ['english','','EN','en_US','en-US-x',null,7])assert.equal(discordLocale(bad),null,String(bad));
 assert.equal(accountEmail(DISCORD_ID),`dc-${DISCORD_ID}@players.harvesttycoon.com`);
 for(const pattern of [PORTAL_MAIL,REMINDER_PORTAL_MAIL,HOOK_PORTAL_MAIL])assert.ok(pattern.test(accountEmail(DISCORD_ID)),'no reminder and no auth email ever goes to it');
 assert.equal(read('supabase/functions/discord-auth/account-form.js'),read('src/account-form.js'),'the same name maker as farm-api (scripts/sync-game.mjs)');
 assert.match(read('scripts/sync-game.mjs'),/src\/account-form\.js.*discord-auth\/account-form\.js/);
});

// A database and Auth that keep what they are told, like Supabase's.
const FARMER='00000000-0000-4000-8000-0000000000d1',WEBSITE='00000000-0000-4000-8000-0000000000c1',CG='00000000-0000-4000-8000-0000000000c2',KG='00000000-0000-4000-8000-0000000000c3';
const session=(id,{role='authenticated',session_id='s-'+id}={})=>`${part({alg:'HS256'})}.${part({sub:id,role,session_id})}.sig`;
// Tables that keep what they are told, as PostgREST does: eq, is, gt and lt filters, maybeSingle, a head count, insert with the
// table's unique columns (23505), update and delete that give back the rows they changed with .select().
function fakeTables(tables,{unique={},defaults={},onInsert=()=>{}}={}){
 const test=(row,[op,key,value])=>op==='gt'?row[key]!=null&&row[key]>value:op==='lt'?row[key]!=null&&row[key]<value:row[key]===value;
 return name=>{
  const rows=tables[name];assert.ok(rows,`unexpected table ${name}`);
  const filters=[];let action='select',values=null,head=false,returning=false;
  const clash=(row,self)=>(unique[name]??[]).some(key=>rows.some(other=>other!==self&&other[key]===row[key]));
  const duplicate={code:'23505',message:'duplicate key value violates unique constraint'};
  function run(){
   if(action==='insert'){
    onInsert(name,values);const row={...(defaults[name]?.()??{}),...values};
    if(clash(row))return {data:null,error:duplicate};
    rows.push(structuredClone(row));return {data:null,error:null};
   }
   const found=rows.filter(row=>filters.every(f=>test(row,f)));
   if(action==='update'){
    if(found.some(row=>clash({...row,...values},row)))return {data:null,error:duplicate};
    for(const row of found)Object.assign(row,structuredClone(values));
    return {data:returning?structuredClone(found):null,error:null};
   }
   if(action==='delete'){for(const row of found)rows.splice(rows.indexOf(row),1);return {data:returning?structuredClone(found):null,error:null};}
   return head?{data:null,count:found.length,error:null}:{data:structuredClone(found),error:null};
  }
  const api={
   select(columns,options={}){if(action==='select')head=options.head===true;else returning=true;return api;},
   insert(row){action='insert';values={...row};return api;},
   update(changes){action='update';values={...changes};return api;},
   delete(){action='delete';return api;},
   eq(key,value){filters.push(['eq',key,value]);return api;},
   is(key,value){filters.push(['is',key,value]);return api;},
   gt(key,value){filters.push(['gt',key,value]);return api;},
   lt(key,value){filters.push(['lt',key,value]);return api;},
   async maybeSingle(){const r=run();return {data:r.data?.[0]??null,error:r.error};},
   then(resolve,reject){try{resolve(run());}catch(error){reject(error);}}
  };
  return api;
 };
}
function fakeSupabase({users=[],accounts=[],sessions=[],taken=[],takenOnce=false,lostRace=false}={}){
 const db={users:new Map(users.map(u=>[u.id,structuredClone(u)])),accounts:structuredClone(accounts),tickets:[]};
 const log={created:[],updated:[],deleted:[],links:[],inserted:[],names:[],getUser:0};
 let counter=0;
 const from=fakeTables({discord_accounts:db.accounts,discord_link_tickets:db.tickets},{
  unique:{discord_accounts:['discord_user_id','player_id'],discord_link_tickets:['ticket_hash']},
  defaults:{discord_link_tickets:()=>({display_name:null,relink_from:null,linked_player:null,used_at:null,created_at:new Date().toISOString()})},
  onInsert(table,row){
   if(table!=='discord_accounts')return;
   if(lostRace&&!db.accounts.length)db.accounts.push({discord_user_id:row.discord_user_id,player_id:FARMER});
   if(!db.accounts.some(a=>a.discord_user_id===row.discord_user_id||a.player_id===row.player_id))log.inserted.push({...row});
  }});
 const admin={
  from,
  async rpc(name,args){
   if(name==='username_available'){log.names.push(args.p_name);return {data:!(takenOnce&&log.names.length===1)&&!taken.includes(args.p_name.toLowerCase()),error:null};}
   if(name==='harvest_session_active')return {data:sessions.includes(args.p_session),error:null};
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
const ENV={clientId:CLIENT_ID,clientSecret:SECRET};
const run=(admin,body,{headers={},env=ENV,d=fakeDiscord(),pause={until:0},now=Date.now()}={})=>handleDiscordAuth({admin,body,headers:new Headers(headers),env,now,fetchImpl:d.fetchImpl,pause});
const START={op:'discord',code:'code-1'};
const farmer=()=>({id:FARMER,email:`dc-${DISCORD_ID}@players.harvesttycoon.com`,app_metadata:{provider:'email',portal:'discord',guest:false,discord_id:DISCORD_ID},user_metadata:{username:'Sunny Acres 4821'}});

test('the first start: Discord asked once for each step, a choice; "New farm": an account keyed on the Discord id, a random farmer name, a way in',async()=>{
 const {admin,db,log}=fakeSupabase(),d=fakeDiscord();
 const start=await run(admin,{...START,language:'nl',username:'Admin'},{d});
 assert.equal(start.status,200);assert.deepEqual(Object.keys(start.data).sort(),['choose','expires_in','key','locale','ticket'],'the contract: {choose:true, ticket, key, expires_in, locale}');
 assert.equal(start.data.choose,true);assert.equal(start.data.expires_in,600);
 assert.equal(start.data.locale,'en-US','Discord\'s locale, for the game\'s language');
 assert.deepEqual(d.calls.map(c=>c.step),['token','me']);
 assert.equal(log.created.length+log.links.length+db.accounts.length,0,'nothing made before the player chooses');
 const r=await run(admin,{op:'create',ticket:start.data.ticket,key:start.data.key,language:'nl',username:'Admin'},{d});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data).sort(),['player_id','token_hash'],'the contract: {token_hash, player_id}');
 assert.equal(d.calls.length,2,'"New farm" does not ask Discord again');
 const [made]=log.created;
 assert.equal(made.email,`dc-${DISCORD_ID}@players.harvesttycoon.com`);assert.equal(made.email_confirm,true);assert.ok(made.password.length>=40,'a long random password, never stored or shown');
 assert.deepEqual(made.app_metadata,{portal:'discord',guest:false,discord_id:DISCORD_ID});
 assert.deepEqual(Object.keys(made.user_metadata),['username','language','source']);
 assert.deepEqual({...made.user_metadata,username:undefined},{username:undefined,language:'nl',source:{src:'discord',ref:'discord.com'}});
 // Never Discord's name (nor the one the page sends): Discord's Developer Terms keep its data from other players.
 assert.ok(isRandomPlayerName(made.user_metadata.username),made.user_metadata.username);
 assert.doesNotMatch(JSON.stringify(log.created),/nelly|Admin|8342729096ea/i);
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:r.data.player_id}],'the link and nothing else');
 assert.equal(r.data.token_hash,`hash:${made.email}`);
 // The access token and the code are used once and dropped: not kept, not sent back.
 assert.doesNotMatch(JSON.stringify({db:[...db.users.values(),db.accounts],r}),/access-|refresh-|code-1/);
 // Taken: the first free one ("… 2").
 const newFarm=async(admin,body={},d=fakeDiscord())=>{const s=await run(admin,START,{d});return run(admin,{op:'create',ticket:s.data.ticket,key:s.data.key,...body},{d});};
 const busyName=fakeSupabase({takenOnce:true});await newFarm(busyName.admin);
 assert.match(busyName.log.names[1],/ 2$/);assert.equal(busyName.log.created[0].user_metadata.username,busyName.log.names[1]);
 // A language that is not one is left out; the locale Discord does not give is null.
 const quiet=fakeSupabase(),qd=fakeDiscord({codes:{'code-1':{...NELLY,locale:undefined}}});
 assert.equal((await run(quiet.admin,START,{d:qd})).data.locale,null);
 await newFarm(quiet.admin,{language:'Dutch'});assert.deepEqual(Object.keys(quiet.log.created[0].user_metadata),['username','source']);
});

test('the next start: the same farm; this session already, no new sign-in; a new code each time',async()=>{
 const {admin,log}=fakeSupabase({users:[farmer()],accounts:[{discord_user_id:DISCORD_ID,player_id:FARMER}],sessions:['s-'+FARMER]});
 const d=fakeDiscord();
 const current=await run(admin,START,{d,headers:{Authorization:`Bearer ${session(FARMER)}`}});
 assert.deepEqual(current,{status:200,data:{ok:true,player_id:FARMER,locale:'en-US'}},'the contract: {ok:true, player_id, locale}');
 assert.equal(log.links.length+log.created.length+log.updated.length,0);
 const other=await run(admin,{...START,code:'code-2'},{d});
 assert.deepEqual(other,{status:200,data:{token_hash:`hash:${farmer().email}`,player_id:FARMER,locale:'en-US'}},'another device: a way in to the same farm');
 assert.equal(d.calls.length,4,'every start is checked with Discord (a code works once)');
 // A code used before: Discord says no, and nothing changes.
 assert.deepEqual(await run(admin,START,{d}),{status:401,data:{error:MESSAGES.code},refused:'invalid_grant'});
 // A session that has ended: a new way in.
 const ended=await run(admin,{...START,code:'code-3'},{d,headers:{Authorization:`Bearer ${session(FARMER,{session_id:'old'})}`}});
 assert.equal(ended.data.token_hash,`hash:${farmer().email}`);
});

test('a refused code or a bad request is refused before anything is made',async()=>{
 const {admin,log}=fakeSupabase(),d=fakeDiscord();
 assert.deepEqual(await run(admin,{...START,code:'stolen'},{d}),{status:401,data:{error:MESSAGES.code},refused:'invalid_grant'});
 for(const body of [{op:'discord'},{op:'discord',code:''},{op:'discord',code:'a b'},{op:'discord',code:42},{op:'discord',user_id:DISCORD_ID}])
  assert.deepEqual(await run(admin,body,{d}),{status:400,data:{error:MESSAGES.request}},JSON.stringify(body));
 for(const op of ['guest','kongregate','link','delete','token'])assert.deepEqual(await run(admin,{op,code:'code-1'},{d}),{status:400,data:{error:MESSAGES.unknown}},op);
 for(const body of [null,[],'discord',7])assert.deepEqual(await run(admin,body,{d}),{status:400,data:{error:MESSAGES.request}});
 assert.equal(log.created.length+log.links.length+log.inserted.length,0);
 assert.equal(d.calls.length,1,'only the one real code reached Discord');
});

test('without our settings nobody gets in and nothing is asked; Discord down: try again; no limit per network',async()=>{
 const none=fakeSupabase(),d=fakeDiscord();
 for(const env of [{},{clientId:CLIENT_ID},{clientSecret:SECRET},{clientId:'my-app',clientSecret:SECRET},{clientId:'',clientSecret:''}])
  assert.deepEqual(await run(none.admin,START,{d,env}),{status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'}},JSON.stringify(env));
 assert.equal(d.calls.length,0);assert.equal(none.log.created.length,0);
 // A wrong secret is ours to fix, not the player's: the same answer, and the reason for the log.
 assert.deepEqual(await run(none.admin,START,{env:{...ENV,clientSecret:'old-secret'}}),{status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'},refused:'invalid_client'});
 const down=fakeSupabase();
 for(const d of [fakeDiscord({down:true}),fakeDiscord({status:{at:'token',code:502}}),fakeDiscord({status:{at:'me',code:503}})])
  assert.deepEqual(await run(down.admin,START,{d}),{status:503,data:{error:MESSAGES.unavailable,code:'DISCORD_UNAVAILABLE'}});
 assert.equal(down.log.created.length,0);
 // Every Discord player comes through Discord's proxy: a limit per network would be one for all of them (fakeSupabase knows no other rpc).
 const code=read('supabase/functions/discord-auth/discord.js');
 assert.doesNotMatch(code,/cf-connecting-ip|x-forwarded-for|check_slot|ipHash/);
 const many=fakeSupabase(),dm=fakeDiscord({codes:Object.fromEntries(Array.from({length:80},(_,i)=>[`c${i}`,{...NELLY,id:String(10n**17n+BigInt(i))}]))});
 for(let i=0;i<80;i++)assert.equal((await run(many.admin,{op:'discord',code:`c${i}`},{d:dm,headers:{'cf-connecting-ip':'162.159.135.232'}})).status,200);
});

test('Discord asks us to wait: 429 with retry_after, and nobody\'s code goes to Discord until then',async()=>{
 const {admin,log}=fakeSupabase(),pause={until:0},NOW=Date.UTC(2026,9,10,12);
 const limited=fakeDiscord({limit:{at:'token',retry_after:12.4}});
 assert.deepEqual(await run(admin,START,{d:limited,pause,now:NOW}),{status:429,data:{error:MESSAGES.busy,retry_after:13}});
 assert.equal(pause.until,NOW+13000);
 const d=fakeDiscord();
 assert.deepEqual(await run(admin,START,{d,pause,now:NOW+5000}),{status:429,data:{error:MESSAGES.busy,retry_after:8}},'the rest of the wait');
 assert.equal(d.calls.length,0,'Discord is not asked while it said wait');
 const after=await run(admin,START,{d,pause,now:NOW+13000});
 assert.equal(after.status,200,'after the wait: asked again');assert.equal(after.data.choose,true);
 assert.equal(log.created.length,0);
 // The same when users/@me says it.
 const late={until:0},again=fakeSupabase();
 assert.deepEqual(await run(again.admin,START,{d:fakeDiscord({limit:{at:'me',retry_after:1}}),pause:late,now:NOW}),{status:429,data:{error:MESSAGES.busy,retry_after:1}});
 assert.equal(again.log.created.length,0);assert.equal(late.until,NOW+1000);
});

test('a session sent along never links: a website, CrazyGames or Kongregate session is left alone and the Discord player chooses',async()=>{
 const website={id:WEBSITE,email:'farmer@example.com',email_confirmed_at:'2026-09-01T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
 const cg={id:CG,email:'cg-x@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:true},user_metadata:{}};
 const kg={id:KG,email:'kg-1480702@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'kongregate',guest:false,kongregate_id:'1480702'},user_metadata:{}};
 for(const [label,user] of [['a website account',website],['a CrazyGames guest',cg],['a Kongregate account',kg]]){
  const {admin,log,db}=fakeSupabase({users:[user],sessions:['s-'+user.id]}),headers={Authorization:`Bearer ${session(user.id)}`};
  const r=await run(admin,START,{headers});
  assert.equal(r.status,200,label);assert.equal(r.data.choose,true,label);assert.equal(r.data.player_id,undefined,label);
  // "New farm" with that session still there: a farm of the Discord player's own.
  const made=await run(admin,{op:'create',ticket:r.data.ticket,key:r.data.key},{headers});
  assert.notEqual(made.data.player_id,user.id,label);assert.equal(log.created.length,1,label);assert.ok(made.data.token_hash,label);
  assert.deepEqual(db.users.get(user.id).app_metadata,user.app_metadata,`${label}: left as it was`);
 }
 const anon=fakeSupabase({users:[farmer()],accounts:[{discord_user_id:DISCORD_ID,player_id:FARMER}]});
 const r=await run(anon.admin,START,{headers:{Authorization:`Bearer ${session(FARMER,{role:'anon'})}`}});
 assert.deepEqual(r.data,{token_hash:`hash:${farmer().email}`,player_id:FARMER,locale:'en-US'});assert.equal(anon.log.getUser,0,'the public key is not even looked up');
 // A farm whose marks did not get saved is put right, also when it is this session's.
 const unmarked=fakeSupabase({users:[{...farmer(),app_metadata:{provider:'email'}}],accounts:[{discord_user_id:DISCORD_ID,player_id:FARMER}],sessions:['s-'+FARMER]});
 const fixed=await run(unmarked.admin,START,{headers:{Authorization:`Bearer ${session(FARMER)}`}});
 assert.equal(unmarked.db.users.get(FARMER).app_metadata.discord_id,DISCORD_ID);assert.equal(fixed.data.token_hash,`hash:${farmer().email}`);
});

test('two "New farm"s at the same moment and a taken address end on one farm',async()=>{
 const newFarm=async admin=>{const s=await run(admin,START);return run(admin,{op:'create',ticket:s.data.ticket,key:s.data.key});};
 const race=fakeSupabase({users:[farmer()],lostRace:true});
 const r=await newFarm(race.admin);
 assert.equal(r.data.player_id,FARMER,'the other start made the farm: that one opens');assert.equal(race.log.deleted.length,1,'the extra account is removed again');
 assert.match(race.log.created[0].email,new RegExp(`^dc-${DISCORD_ID}-[0-9a-f]{6}@players\\.harvesttycoon\\.com$`),'the first address was taken');
 const squatted=fakeSupabase({users:[{id:WEBSITE,email:`dc-${DISCORD_ID}@players.harvesttycoon.com`,app_metadata:{provider:'email'},user_metadata:{}}]});
 const own=await newFarm(squatted.admin);assert.notEqual(own.data.player_id,WEBSITE,'an account someone else made with that address is never used');
 assert.deepEqual(squatted.db.users.get(WEBSITE).app_metadata,{provider:'email'},'nor marked');
});

test('the Edge Function itself: OPTIONS, POST JSON up to 4 KB, the settings from the environment, a 503 that names nothing',async()=>{
 const source=stripTypeScriptTypes(read('supabase/functions/discord-auth/index.ts').replace(/^import .*;\n/gm,''));
 const settings={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',DISCORD_CLIENT_ID:` ${CLIENT_ID}\n`,DISCORD_CLIENT_SECRET:` ${SECRET} `};
 const logs=[];
 const start=(admin,d=fakeDiscord(),env=settings,pause={until:0})=>{let handler;vm.runInNewContext(source,{...discord,handleDiscordAuth:args=>handleDiscordAuth({...args,fetchImpl:d.fetchImpl,pause}),createClient:()=>admin,
  Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},Response,JSON,String,Error,console:{error:(...a)=>logs.push(a.join(' '))}});
  return (method,body,more={})=>handler(new Request('https://x.supabase.co/functions/v1/discord-auth',{method,headers:{'Content-Type':'application/json',...more},...(body===undefined?{}:{body})}));};
 const {admin}=fakeSupabase(),d=fakeDiscord(),call=start(admin,d);
 const options=await call('OPTIONS');assert.equal(options.status,200);assert.equal(options.headers.get('access-control-allow-origin'),'*');assert.match(options.headers.get('access-control-allow-headers'),/authorization/);
 assert.equal((await call('GET')).status,405);
 assert.equal((await call('POST','{"op":"discord","pad":"'+'x'.repeat(MAX_BODY)+'"}')).status,413);
 assert.deepEqual(await (await call('POST','not json')).json(),{error:MESSAGES.request});
 const ok=await call('POST',JSON.stringify(START));
 assert.equal(ok.status,200);assert.equal(ok.headers.get('content-type'),'application/json');assert.equal(ok.headers.get('cache-control'),'no-store');
 const chosen=await ok.json();
 assert.deepEqual(Object.keys(chosen).sort(),['choose','expires_in','key','locale','ticket'],'the id and secret are used trimmed');
 const made=await call('POST',JSON.stringify({op:'create',ticket:chosen.ticket,key:chosen.key}));assert.equal(made.status,200);const {token_hash}=await made.json();
 assert.equal((await call('POST',JSON.stringify({op:'create',ticket:chosen.ticket,key:chosen.key}))).status,410,'a ticket works once');
 const refused=await call('POST',JSON.stringify({...START,code:'nope'}));assert.equal(refused.status,401);assert.deepEqual(Object.keys(await refused.json()),['error'],'why stays in the log');
 const missing=start(fakeSupabase().admin,fakeDiscord(),{...settings,DISCORD_CLIENT_SECRET:''});
 assert.equal((await missing('POST',JSON.stringify(START))).status,503);
 const wrong=start(fakeSupabase().admin,fakeDiscord(),{...settings,DISCORD_CLIENT_SECRET:'old-secret'});
 assert.deepEqual(await (await wrong('POST',JSON.stringify(START))).json(),{error:MESSAGES.setup,code:'NOT_CONFIGURED'});
 const waiting=start(fakeSupabase().admin,fakeDiscord({limit:{at:'token',retry_after:4}}));
 const wait=await waiting('POST',JSON.stringify(START));assert.equal(wait.status,429);assert.deepEqual(await wait.json(),{error:MESSAGES.busy,retry_after:4});
 const down=()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null,error:{code:'XX000',message:'database down'}})};return q;};
 const broken=start({...fakeSupabase().admin,from:down,rpc:async()=>({error:{code:'XX000',message:'database down'}})});
 assert.deepEqual(await (await broken('POST',JSON.stringify(START))).json(),{error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'});
 assert.ok(logs.some(line=>/Discord refused a sign-in: invalid_grant/.test(line)));assert.ok(logs.some(line=>/Discord refused a sign-in: invalid_client/.test(line)));
 assert.ok(logs.some(line=>/DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not set/.test(line)));assert.ok(logs.some(line=>/Discord asks to wait 4 s/.test(line)));
 assert.ok(!logs.some(line=>line.includes(SECRET)||line.includes('code-1')||line.includes('nope')||line.includes('access-')||line.includes(chosen.ticket)||line.includes(chosen.key)||line.includes(token_hash)),'never the secret, a code, a ticket, its key or a token in the log');
 const index=read('supabase/functions/discord-auth/index.ts');
 assert.match(index,/Deploy with --no-verify-jwt/);assert.match(index,/clientId:env\('DISCORD_CLIENT_ID'\)\.trim\(\),clientSecret:env\('DISCORD_CLIENT_SECRET'\)\.trim\(\)/);
 assert.equal(read('supabase/functions/discord-auth/deno.json'),read('supabase/functions/farm-api/deno.json'));
});

// ---- supabase/discord.sql: the table, and every patch of a live function ----
const SQL=read('supabase/discord.sql');
const patchesOf=(text,name)=>[...text.matchAll(new RegExp(`select pg_temp\\.${name}_patch\\('([^']+)',\\$m\\$([\\s\\S]*?)\\$m\\$,\\s*\\$a\\$([\\s\\S]*?)\\$a\\$,\\s*\\$b\\$([\\s\\S]*?)\\$b\\$\\);`,'g'))].map(m=>({fn:m[1],marker:m[2],from:m[3],to:m[4]}));
const once=(text,piece)=>text.split(piece).length-1;
// The CrazyGames patches (crazygames.sql) as the database has them, to build today's live definitions from the repository.
const cgPatches=()=>[...read('supabase/crazygames.sql').matchAll(/select pg_temp\.crazygames_patch\(('[^']*'|fn::regprocedure),(\$m\$[\s\S]*?\$m\$|'[^']*'),\s*\$a\$([\s\S]*?)\$a\$,\s*\$b\$([\s\S]*?)\$b\$\)/g)].map(m=>({fn:m[1].replace(/'/g,''),marker:m[2].replace(/^\$m\$|\$m\$$/g,'').replace(/^'|'$/g,''),from:m[3],to:m[4]}));
const kgPatches=()=>patchesOf(read('supabase/kongregate.sql'),'kongregate');
// The patch helper as the database runs it: done already (its marker), else the text exactly once.
function apply(def,list){
 for(const p of list){if(def.includes(p.marker))continue;assert.equal(once(def,p.from),1,`${p.fn}: ${p.from.slice(0,70)}`);def=def.replace(p.from,p.to);}
 return def;
}
test('discord.sql: the table service-role only, the Discord id as text, nothing of Discord kept but the id',()=>{
 assert.match(SQL,/create table if not exists public\.discord_accounts \(\n discord_user_id text primary key check \(discord_user_id ~ '\^\[0-9\]\{17,20\}\$'\),\n player_id uuid not null unique references auth\.users\(id\) on delete cascade,\n created_at timestamptz not null default now\(\)\n\);/);
 assert.match(SQL,/alter table public\.discord_accounts enable row level security;\nrevoke all on public\.discord_accounts from anon, authenticated;/);
 assert.match(SQL,/create or replace function pg_temp\.discord_patch\(p_fn regprocedure, p_marker text, p_from text, p_to text\)/);
 assert.match(SQL,/if position\(p_marker in def\)>0 then return; end if;\n if position\(p_from in def\)=0 or \(length\(def\)-length\(replace\(def,p_from,''\)\)\)\/length\(p_from\)<>1 then/,'patched already: left alone; not there once: stops');
 assert.doesNotMatch(SQL.replace(/\$a\$[\s\S]*?\$a\$|\$b\$[\s\S]*?\$b\$/g,''),/drop |truncate |delete from /i,'it removes nothing of anyone');
 assert.doesNotMatch(/create table[\s\S]*?\n\);/.exec(SQL)[0],/token|name|avatar|locale/i,'no token, Discord name, avatar or locale kept');
 const code=read('supabase/functions/discord-auth/discord.js');
 for(const name of ["from('discord_accounts')","eq('discord_user_id',userId)",'discord_user_id:userId,player_id:user.id'])assert.ok(code.includes(name),name);
});
test('discord.sql: every patch runs once, keeps CrazyGames\' and Kongregate\'s own marks, and does what it says on today\'s definitions',()=>{
 const list=patchesOf(SQL,'discord');
 assert.deepEqual(list.map(p=>p.fn),['public.harvest_email_checked(uuid)','public.notification_candidates()','public.admin_player_accounts(uuid,text)','public.chat_broadcast_filters(jsonb)','public.chat_broadcast_filters(jsonb)','public.chat_broadcast_targets(uuid,jsonb)','public.harvest_delete_account(uuid,text)']);
 for(const p of list){
  assert.ok(p.to.includes(p.marker),`${p.fn}: after the patch its marker is there, so running the file again changes nothing`);
  assert.ok(!p.from.includes(p.marker),`${p.fn}: the marker is not in the text it replaces`);
 }
 // Today's definitions, from the repository (the live text read on 10 Oct 2026 is exactly this): the group filters and the delete
 // function as written plus chat-group-filters.sql's own delete line, the others from crazygames.sql's patches; then kongregate.sql.
 const cg=cgPatches(),kg=kgPatches(),cgTo=fn=>cg.filter(p=>p.fn===fn).map(p=>p.to).join('\n');
 const group=read('supabase/chat-group-filters.sql'),settingsLine=`delete from public.chat_settings where player_id=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_settings',n);`;
 let checked=/create or replace function public\.harvest_email_checked[\s\S]*?\$f\$([\s\S]*?)\$f\$;/.exec(read('supabase/event-email-check.sql'))[1];
 checked=apply(checked,cg.filter(p=>p.fn==='public.harvest_email_checked(uuid)'));
 const live={'public.harvest_email_checked(uuid)':checked,'public.notification_candidates()':cgTo('public.notification_candidates()'),'public.admin_player_accounts(uuid,text)':cgTo('public.admin_player_accounts(uuid,text)'),
  'public.chat_broadcast_filters(jsonb)':/create or replace function public\.chat_broadcast_filters[\s\S]*?\$f\$;/.exec(group)[0],
  'public.chat_broadcast_targets(uuid,jsonb)':/create or replace function public\.chat_broadcast_targets[\s\S]*?\$function\$;/.exec(group)[0],
  'public.harvest_delete_account(uuid,text)':/create or replace function public\.harvest_delete_account[\s\S]*?end \$f\$;/.exec(read('supabase/delete-account.sql'))[0].replace(settingsLine,`${settingsLine}\n delete from public.chat_broadcasts where sender=p_player;get diagnostics n=row_count;c:=c||jsonb_build_object('chat_broadcasts',n);`)};
 for(const fn of Object.keys(live))live[fn]=apply(live[fn],kg.filter(p=>p.fn===fn));
 const after=Object.fromEntries(Object.entries(live).map(([fn,def])=>[fn,apply(def,list.filter(p=>p.fn===fn))]));
 for(const [fn,def] of Object.entries(after)){
  assert.equal(apply(def,list.filter(p=>p.fn===fn)),def,`${fn}: a second run changes nothing`);
  // crazygames.sql and kongregate.sql still find their own patches done, so both stay re-runnable after this file.
  for(const p of [...cg,...kg].filter(p=>p.fn===fn))assert.ok(def.includes(p.marker),`${fn} keeps ${p.marker}`);
 }
 // What each does.
 assert.equal(after['public.harvest_email_checked(uuid)'].trim(),`select exists(select 1 from auth.users u where u.id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and (coalesce(u.raw_app_meta_data->>'provider','email')<>'email' or u.raw_app_meta_data->>'portal'='crazygames' or u.raw_app_meta_data->>'portal'='kongregate' or u.raw_app_meta_data->>'portal'='discord'))
  or exists(select 1 from public.email_checks c join auth.users u on u.id=c.player_id where c.player_id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and c.confirmed_at is not null and lower(c.email)=lower(u.email))`,'a Discord player gets the email bonus quietly');
 assert.match(after['public.notification_candidates()'],/coalesce\(u\.raw_app_meta_data->>'portal',''\) not in \('crazygames','kongregate','discord'\)/,'no reminders');
 assert.match(after['public.admin_player_accounts(uuid,text)'],/case when u\.raw_app_meta_data->>'portal'='discord' then 'discord' when u\.raw_app_meta_data->>'portal'='kongregate' then 'kongregate' when u\.raw_app_meta_data->>'portal'='crazygames' then case/);
 assert.equal(provider('discord'),'Discord','the Players tab says Discord');assert.equal(provider('kongregate'),'Kongregate');
 const filters=after['public.chat_broadcast_filters(jsonb)'];
 assert.match(filters,/if k not in \('minLevel','maxLevel','active','platform','notPlatform','discord','crazygames','kongregate','language','family'\) then/);
 assert.match(filters,/\n  elsif k='discord' then\n   if v is distinct from 'true'::jsonb then raise exception 'The filter % cannot be %\.', k, v using errcode='22023'; end if;\n   out:=out\|\|jsonb_build_object\(k,true\);\n  elsif k in \('crazygames','kongregate'\) then\n   if v is distinct from 'true'::jsonb then/);
 assert.match(after['public.chat_broadcast_targets(uuid,jsonb)'],/\n  and \(p_filters->'kongregate' is null or [^\n]*\n  and \(p_filters->'discord' is null or exists\(select 1 from auth\.users u where u\.id=ps\.player_id and u\.raw_app_meta_data->>'portal'='discord'\)\)\n/);
 assert.match(read('src/admin-dashboard.js'),/if\(\$dm\('discord'\)\.checked\)f\.discord=true;/,'the admin\'s "Discord accounts only" sends the filter this accepts');
 // The new table holds a player id: it joins the account deletion (the deletion audit, tests/delete-account.test.mjs).
 assert.match(after['public.harvest_delete_account(uuid,text)'],/\n delete from public\.kongregate_accounts where player_id=p_player;[^\n]*\n delete from public\.discord_accounts where player_id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('discord_accounts',n\);\n/);
 assert.match(SQL,/revoke all on function public\.harvest_delete_account\(uuid,text\) from public, anon, authenticated;\ngrant execute on function public\.harvest_delete_account\(uuid,text\) to service_role;\n$/);
 // The one message in it is the filter check's own, already there and never shown to a player (i18n/ignore.json).
 assert.deepEqual([...SQL.matchAll(/raise exception '([^']*)'/g)].map(m=>m[1]),['The filter % cannot be %.']);
 assert.ok(JSON.parse(read('i18n/ignore.json')).includes('The filter {0} cannot be {1}.'));
});

test('farm-api, diamond-checkout and the admin: a Discord account has no email, no deletion here, nothing to buy',async()=>{
 const dc={id:FARMER,email:`dc-${DISCORD_ID}@players.harvesttycoon.com`,app_metadata:{provider:'email',portal:'discord',guest:false,discord_id:DISCORD_ID}};
 assert.deepEqual(portalOf(dc),{id:'discord',name:'Discord',guest:false});
 const nothing={rpc:async()=>{throw new Error('no database call');},from:()=>{throw new Error('no database call');}},sent=[];
 for(const ask of [()=>sendEmailCode({admin:nothing,user:dc,mail:async to=>sent.push(to)}),()=>sendEmailChange({admin:nothing,user:dc,email:'me@example.com',password:'x',passwordOk:async()=>true,mail:async to=>sent.push(to)}),()=>confirmEmailChange({admin:nothing,user:dc,code:'123456'})])
  await assert.rejects(ask,/You play with Discord, so your account has no email address\./);
 assert.equal(sent.length,0);
 await assert.rejects(()=>sendEmailCode({admin:nothing,user:{...dc,app_metadata:{portal:'kongregate'}},mail:async()=>{}}),/You play with Kongregate/,'Kongregate as before');
 await assert.rejects(()=>sendEmailCode({admin:nothing,user:{...dc,app_metadata:{portal:'crazygames'}},mail:async()=>{}}),/You play with CrazyGames/,'CrazyGames as before');
 const owner={id:'00000000-0000-4000-8000-0000000000aa',email:'floris@millstone.nl',email_confirmed_at:'2026-09-01T00:00:00Z',signInMethods:['oauth']},moved=[];
 const admin={auth:{admin:{async getUserById(){return {data:{user:dc},error:null};},async updateUserById(...a){moved.push(a);return {};}}},from(){throw new Error('no write');}};
 const r=await handleAdminEmail({admin,body:{playerId:FARMER,email:'real@example.com'},user:owner});
 assert.equal(r.status,400);assert.match(r.data.error,/plays on Discord/);assert.equal(moved.length,0);
 // farm-api marks the account's provider, so the email sign-up rules leave it out (index.ts), and deletion is refused before anything.
 const index=read('supabase/functions/farm-api/index.ts');
 assert.match(index,/if\(user\.app_metadata\?\.portal==='discord'\)user\.app_metadata=\{\.\.\.user\.app_metadata,provider:'discord'\};/);
 assert.match(index,/if\(user\.app_metadata\?\.portal==='kongregate'\)user\.app_metadata=\{\.\.\.user\.app_metadata,provider:'kongregate'\};/,'Kongregate as before');
 const refused=await handleDeleteAccount({admin:nothing,body:{username:'Sunny Acres 4821'},user:{...dc,app_metadata:{...dc.app_metadata,provider:'discord'}}});
 assert.deepEqual(refused,{status:403,data:{error:DELETE_DISCORD,code:'ACTION_REJECTED'}});
 assert.equal(DELETE_DISCORD,'Your Discord account cannot be deleted here.');
 assert.deepEqual(await handleDeleteAccount({admin:nothing,body:{username:'x'},user:{...dc,app_metadata:{provider:'kongregate'}}}),{status:403,data:{error:DELETE_KONGREGATE,code:'ACTION_REJECTED'}},'Kongregate as before');
 for(const text of [DELETE_DISCORD,'You play with Discord, so your account has no email address.','Discord'])assert.ok(JSON.parse(read('i18n/ignore.json')).includes(text),'never shown in the game (no email or delete there; a name)');
 // diamond-checkout: never a Stripe, Google Play or App Store purchase for a Discord account.
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
  const r=await send(dc,order);assert.deepEqual([r.status,r.data],[403,{error:'Purchases are not available on Discord.'}],JSON.stringify(order));assert.deepEqual(r.stripe,[]);
 }
 const kgOrder=await send({...dc,app_metadata:{portal:'kongregate'}},create);assert.deepEqual(kgOrder.data,{error:'Purchases are not available on Kongregate.'},'Kongregate as before');
});
