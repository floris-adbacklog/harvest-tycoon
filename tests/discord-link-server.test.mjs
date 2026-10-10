import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import * as discord from '../supabase/functions/discord-auth/discord.js';
import {handleDiscordAuth,LINK_ERRORS,TICKET_TTL,STATE_TTL,MAX_OPEN_TICKETS,MESSAGES,TOKEN_URL,ME_URL,LINK_CALLBACK,linkTicket,ticketHash,discordName,verifyDiscord} from '../supabase/functions/discord-auth/discord.js';
import {DISCORD_CALLBACK} from '../public/app-links.js';
import {portalOf} from '../supabase/functions/farm-api/portal.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Discord link (10 Oct 2026, the owner's "doe 2"): a Discord player plays their harvesttycoon.com farm in the Activity. The server
// half: discord-auth's ops discord (a choice for a new Discord user), create, relink, peek, begin, confirm and claim, and the ticket
// table (supabase/discord-link.sql). The website's dialog and the Activity's cards are the game's own tests.
const CLIENT_ID='1290000000000000001',SECRET='dc-client-secret-123',DISCORD_ID='81384788765712384',OTHER_ID='81384788765712999';
const NELLY={id:DISCORD_ID,username:'nelly',global_name:'Nelly',avatar:'8342729096ea3675442027381ff50dfe',locale:'en-US'};
const NOW=Date.UTC(2026,9,10,12),iso=ms=>new Date(ms).toISOString();
const W='00000000-0000-4000-8000-0000000000c1',W2='00000000-0000-4000-8000-0000000000c2',D='00000000-0000-4000-8000-0000000000d1';
const GOOGLE='00000000-0000-4000-8000-0000000000c3',FB='00000000-0000-4000-8000-0000000000c4',UNCHECKED='00000000-0000-4000-8000-0000000000c5';
const UNCONFIRMED='00000000-0000-4000-8000-0000000000c6',CG='00000000-0000-4000-8000-0000000000e1',KG='00000000-0000-4000-8000-0000000000e2',FAKE='00000000-0000-4000-8000-0000000000e3';
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const bearer=id=>({Authorization:`Bearer ${part({alg:'HS256'})}.${part({sub:id,role:'authenticated',session_id:'s-'+id})}.sig`});
const sha256=text=>createHash('sha256').update(text).digest('hex');

const website=(id,extra={})=>({id,email:`farmer-${id.slice(-2)}@example.com`,email_confirmed_at:'2026-09-01T00:00:00Z',
 app_metadata:{provider:'email',providers:['email']},user_metadata:{username:`Farmer ${id.slice(-2)}`,language:'nl'},identities:[{provider:'email'}],...extra});
const discordFarm=(id,userId=DISCORD_ID)=>({id,email:`dc-${userId}@players.harvesttycoon.com`,email_confirmed_at:'2026-10-10T08:00:00Z',
 app_metadata:{provider:'email',providers:['email'],portal:'discord',guest:false,discord_id:userId},user_metadata:{username:'Sunny Acres 4821'},identities:[{provider:'email'}]});
const USERS=()=>[website(W),website(W2),discordFarm(D),
 website(GOOGLE,{app_metadata:{provider:'google',providers:['google']},identities:[{provider:'google'}]}),
 website(FB,{app_metadata:{provider:'email',providers:['email','facebook']},identities:[{provider:'email'},{provider:'facebook'}]}),
 website(UNCHECKED),website(UNCONFIRMED,{email_confirmed_at:null}),
 {id:CG,email:'cg-x@players.harvesttycoon.com',email_confirmed_at:'2026-10-01T00:00:00Z',app_metadata:{provider:'email',portal:'crazygames',guest:false},user_metadata:{}},
 {id:KG,email:'kg-1480702@players.harvesttycoon.com',email_confirmed_at:'2026-10-01T00:00:00Z',app_metadata:{provider:'email',portal:'kongregate',guest:false,kongregate_id:'1480702'},user_metadata:{}},
 // Someone typed a made-up address at sign-up on the website: no mark, but still not a website farm to link.
 website(FAKE,{email:'dc-81384788765712000@players.harvesttycoon.com'})];

// Discord's OAuth2 (as in discord-auth.test.mjs): a code works once and gives the user at users/@me. forms: what each swap sent.
function fakeDiscord(codes={}){
 const calls=[],forms=[],used=new Set(),tokens=new Map();let n=0;
 const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 async function fetchImpl(url,init={}){
  calls.push(String(url));
  if(String(url)===TOKEN_URL){
   forms.push(Object.fromEntries(new URLSearchParams(init.body)));
   const code=new URLSearchParams(init.body).get('code'),user=codes[code];
   if(!user||used.has(code))return reply({error:'invalid_grant'},400);
   used.add(code);const access=`access-${++n}`;tokens.set(access,user);return reply({token_type:'Bearer',access_token:access,scope:'identify'});
  }
  if(String(url)===ME_URL){const user=tokens.get(String(init.headers.Authorization).replace(/^Bearer /,''));return user?reply(user):reply({message:'401: Unauthorized'},401);}
  throw new Error(`unexpected address ${url}`);
 }
 return {fetchImpl,calls,forms};
}
// Tables that keep what they are told, as PostgREST does (the same as discord-auth.test.mjs), with every write in log.calls.
function fakeTables(tables,{unique={},defaults={},onWrite=()=>{}}={}){
 const test=(row,[op,key,value])=>op==='gt'?row[key]!=null&&row[key]>value:op==='lt'?row[key]!=null&&row[key]<value:row[key]===value;
 return name=>{
  const rows=tables[name];assert.ok(rows,`unexpected table ${name}`);
  const filters=[];let action='select',values=null,head=false,returning=false;
  // A unique column holds a value once; empty (null) as often as it likes, as in Postgres.
  const clash=(row,self)=>(unique[name]??[]).some(key=>row[key]!=null&&rows.some(other=>other!==self&&other[key]===row[key]));
  const duplicate={code:'23505',message:'duplicate key value violates unique constraint'};
  function run(){
   if(action!=='select')onWrite(name,action,values,filters);
   if(action==='insert'){const row={...(defaults[name]?.()??{}),...values};if(clash(row))return {data:null,error:duplicate};rows.push(structuredClone(row));return {data:null,error:null};}
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
// The database and Auth as Supabase keeps them: deleting an account takes its rows (discord_accounts, player_stats and a ticket's
// linked_player on delete cascade) and empties a ticket's relink_from (on delete set null), as supabase/discord-link.sql says.
function fakeSupabase({users=USERS(),accounts=[],tickets=[],checked=[W],staff=[],failDelete=0,failLink=0,failCreate=0}={}){
 const db={users:new Map(users.map(u=>[u.id,structuredClone(u)])),accounts:structuredClone(accounts),tickets:structuredClone(tickets),
  stats:users.filter(u=>u.user_metadata?.username).map(u=>({player_id:u.id,username:u.user_metadata.username})),
  staff:staff.map(id=>({player_id:id,role:'moderator'}))};
 const log={calls:[],links:[],updated:[],created:[],deletes:[],signOuts:[]};
 let counter=0;
 const removeUser=id=>{
  db.users.delete(id);
  for(const list of [db.accounts,db.stats])for(let i=list.length-1;i>=0;i--)if(list[i].player_id===id)list.splice(i,1);
  for(let i=db.tickets.length-1;i>=0;i--){const t=db.tickets[i];if(t.linked_player===id)db.tickets.splice(i,1);else if(t.relink_from===id)t.relink_from=null;}
 };
 const from=fakeTables({discord_accounts:db.accounts,discord_link_tickets:db.tickets,player_stats:db.stats,staff_roles:db.staff},{
  unique:{discord_accounts:['discord_user_id','player_id'],discord_link_tickets:['ticket_hash','state_hash']},
  defaults:{discord_link_tickets:()=>({display_name:null,relink_from:null,linked_player:null,used_at:null,created_at:iso(NOW),state_hash:null,state_player:null,state_at:null})},
  onWrite:(table,action,values,filters)=>log.calls.push(`${table}.${action}`)});
 const admin={
  from,
  async rpc(name,args){
   log.calls.push(`rpc ${name}`);
   if(name==='username_available')return {data:true,error:null};
   if(name==='harvest_session_active')return {data:db.users.has(args.p_player)&&args.p_session==='s-'+args.p_player,error:null};
   if(name==='harvest_email_checked')return {data:checked.includes(args.p_player),error:null};
   if(name==='harvest_delete_account'){
    log.deletes.push({...args});
    if(failDelete>0){failDelete--;return {data:null,error:{code:'P0001',message:'Your partner payout is still open. Please contact support before you delete your account.'}};}
    const stats=db.stats.find(s=>s.player_id===args.p_player);
    if(stats&&stats.username!==String(args.p_name??'').trim())return {data:null,error:{code:'P0001',message:'Type your farmer name exactly to delete your account.'}};
    removeUser(args.p_player);return {data:{auth_user:1},error:null};
   }
   throw new Error(`unexpected rpc ${name}`);
  },
  auth:{
   async getUser(token){const {sub}=JSON.parse(Buffer.from(token.split('.')[1],'base64url'));const user=db.users.get(sub);return user?{data:{user:structuredClone(user)},error:null}:{data:{user:null},error:{message:'invalid'}};},
   admin:{
    async createUser(attributes){
     if(failCreate>0){failCreate--;return {data:{user:null},error:{code:'unexpected_failure',message:'Database error creating new user'}};}
     if([...db.users.values()].some(u=>u.email===attributes.email))return {data:{user:null},error:{code:'email_exists',message:'A user with this email address has already been registered'}};
     const id=`00000000-0000-4000-8000-${String(++counter).padStart(12,'0')}`;
     const user={id,email:attributes.email,email_confirmed_at:iso(NOW),app_metadata:{provider:'email',providers:['email'],...attributes.app_metadata},user_metadata:{...attributes.user_metadata}};
     db.users.set(id,user);log.created.push(structuredClone(attributes));log.calls.push('createUser');return {data:{user:structuredClone(user)},error:null};
    },
    async updateUserById(id,attributes){log.calls.push('updateUserById');log.updated.push(id);const user=db.users.get(id);user.app_metadata={...user.app_metadata,...attributes.app_metadata};return {data:{user:structuredClone(user)},error:null};},
    async getUserById(id){const user=db.users.get(id);return user?{data:{user:structuredClone(user)},error:null}:{data:{user:null},error:{status:404,code:'user_not_found',message:'User not found'}};},
    async deleteUser(id){log.calls.push('deleteUser');removeUser(id);return {error:null};},
    // Ends sessions of the account whose access token it gets ('others': all but that one).
    async signOut(jwt,scope){log.calls.push('signOut');log.signOuts.push([JSON.parse(Buffer.from(jwt.split('.')[1],'base64url')).sub,scope]);return {data:null,error:null};},
    // Makes the one-time sign-in and sends nothing: the only Auth call that gives a way in (no OTP, invite or reset mail).
    async generateLink({type,email,...rest}){
     assert.equal(type,'magiclink');assert.deepEqual(rest,{},'no redirect or options: nothing to mail');log.calls.push('generateLink');
     if(failLink>0){failLink--;return {data:null,error:{status:500,message:'Auth is down'}};}
     log.links.push(email);return {data:{properties:{hashed_token:`hash:${email}`}},error:null};
    }
   }
  }
 };
 return {admin,db,log};
}
const ENV={clientId:CLIENT_ID,clientSecret:SECRET};
// The Activity keeps each ticket's key and sends it with create, claim and cancel: run() does so too, unless a test sends its own key
// (null: none). Link on the website is begin (with the ticket), the trip to Discord, then confirm with the state begin gave and
// Discord's code: run() does the same for a confirm that names a ticket (begin's refusal is then the answer), unless a test sends its
// own state, and sends a code of Nelly's (the Discord user of these tests), unless a test sends its own code (and its own Discord).
const KEYS=new Map(),LINK_CODE='from-discord';
async function run(admin,body,{headers={},now=NOW,d,pause={until:0}}={}){
 let sent=['create','claim','cancel'].includes(body?.op)&&!('key' in body)&&KEYS.has(body.ticket)?{...body,key:KEYS.get(body.ticket)}:body;
 if(body?.op==='confirm'&&'ticket' in body&&!('state' in body)){
  const begun=await handleDiscordAuth({admin,body:{op:'begin',ticket:body.ticket},headers:new Headers(headers),env:ENV,now,fetchImpl:fakeDiscord().fetchImpl,pause});
  if(begun.status!==200)return begun;
  const {ticket,...rest}=sent;sent={...rest,state:begun.data.state};
 }
 if(body?.op==='confirm'&&!('code' in body)){sent={...sent,code:LINK_CODE};d??=fakeDiscord({[LINK_CODE]:NELLY});}
 d??=fakeDiscord();
 const result=await handleDiscordAuth({admin,body:sent,headers:new Headers(headers),env:ENV,now,fetchImpl:d.fetchImpl,pause});
 if(typeof result.data?.ticket==='string')KEYS.set(result.data.ticket,result.data.key);
 return result;
}
// "Play your harvesttycoon.com farm here" from a Discord-only farm's Settings: its session and a new code of its Discord account.
const relinkAs=(admin,id=D,{user=NELLY,...extra}={})=>run(admin,{op:'relink',code:'r'},{headers:bearer(id),d:fakeDiscord({r:user}),...extra});
// A Discord user without a farm starts the Activity: the choice, with its ticket.
async function choose(admin,{now=NOW,user=NELLY}={}){
 const r=await run(admin,{op:'discord',code:'start'},{d:fakeDiscord({start:user}),now});
 assert.equal(r.status,200);assert.equal(r.data.choose,true);return r.data.ticket;
}
const ticketRow=(db,ticket)=>db.tickets.find(t=>t.ticket_hash===sha256(ticket));
// Link tapped on the website by this account: the state for Discord's address.
const begin=async(admin,ticket,id=W,now=NOW)=>{const r=await run(admin,{op:'begin',ticket},{headers:bearer(id),now});assert.equal(r.status,200,JSON.stringify(r));return r.data.state;};
const gone={status:410,data:{error:'TICKET_GONE'}};

test('a ticket: 32 random bytes as base64url and a key of its own, only their SHA-256 kept, 10 minutes, the player\'s Discord username and nothing else',async()=>{
 const {admin,db}=fakeSupabase();
 const r=await run(admin,{op:'discord',code:'start'},{d:fakeDiscord({start:NELLY})});
 assert.deepEqual(Object.keys(r.data).sort(),['choose','expires_in','key','locale','ticket']);
 assert.equal(r.data.expires_in,TICKET_TTL);assert.equal(TICKET_TTL,600);assert.equal(r.data.locale,'en-US');
 for(const value of [r.data.ticket,r.data.key]){assert.match(value,/^[A-Za-z0-9_-]{43}$/);assert.equal(Buffer.from(value,'base64url').length,32);}
 assert.notEqual(r.data.key,r.data.ticket);
 assert.equal(await ticketHash(r.data.ticket),sha256(r.data.ticket));
 const [row]=db.tickets;
 assert.deepEqual(row,{display_name:'nelly',key_hash:sha256(r.data.key),relink_from:null,linked_player:null,used_at:null,created_at:iso(NOW),state_hash:null,state_player:null,state_at:null,ticket_hash:sha256(r.data.ticket),discord_user_id:DISCORD_ID,expires_at:iso(NOW+600000)});
 assert.ok(!JSON.stringify(db).includes(r.data.ticket),'the ticket itself is never stored');assert.ok(!JSON.stringify(db).includes(r.data.key),'nor its key');
 assert.doesNotMatch(JSON.stringify(db),/Nelly|8342729096ea|access-/,'never the display name, the avatar or a token');
 assert.equal(db.accounts.length,0);
 // A new ticket each start, never the same twice.
 assert.notEqual(await choose(admin),r.data.ticket);
 // The name: global_name, else the username; at most 32 characters, no control or direction characters.
 assert.equal(discordName('  Ne‮ly\u0000​⁦ '),'Nely');assert.equal(discordName('Rosa 👩‍🌾'),'Rosa 👩‍🌾','the joiner inside an emoji stays');assert.equal(discordName('x'.repeat(40)),'x'.repeat(32));assert.equal(discordName('🌻'.repeat(40)),'🌻'.repeat(32));
 for(const none of ['',' ','​',null,42,{}])assert.equal(discordName(none),null,JSON.stringify(none));
 // The username, unique on Discord: a display name anyone can choose ("Harvest Tycoon", another player's name) is never shown.
 const posing=fakeSupabase();await choose(posing.admin,{user:{...NELLY,global_name:'Harvest Tycoon'}});assert.equal(posing.db.tickets[0].display_name,'nelly');
 for(const bad of ['',r.data.ticket.slice(1),`${r.data.ticket}=`,r.data.ticket.replace(/.$/,'+'),42,null])assert.equal(linkTicket(bad),null,String(bad));
});

test('create ("New farm"): an open ticket only, once; a relink, linked, used, old or made-up ticket is gone; a failure gives it back',async()=>{
 const {admin,db,log}=fakeSupabase();
 const ticket=await choose(admin);
 assert.deepEqual(await run(admin,{op:'create',ticket},{now:NOW+600000}),gone,'10 minutes, not one second more');
 const made=await run(admin,{op:'create',ticket,language:'nl'},{now:NOW+599000});
 assert.equal(made.status,200);assert.deepEqual(Object.keys(made.data).sort(),['player_id','token_hash']);
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:made.data.player_id}]);
 assert.deepEqual(log.created[0].app_metadata,{portal:'discord',guest:false,discord_id:DISCORD_ID},'a Discord-only farm, as before');
 assert.equal(ticketRow(db,ticket).used_at,iso(NOW+599000));
 assert.deepEqual(await run(admin,{op:'create',ticket},{now:NOW+599500}),gone,'once');
 for(const bad of [undefined,'',42,'x'.repeat(43)+'!',ticket.slice(2)])assert.deepEqual(await run(admin,{op:'create',ticket:bad}),gone,String(bad));
 assert.equal(log.created.length,1);
 // A relink ticket is the website's, never a new farm.
 const relinked=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]});
 const r=await relinkAs(relinked.admin);
 assert.deepEqual(await run(relinked.admin,{op:'create',ticket:r.data.ticket}),gone);assert.equal(relinked.log.created.length,0);
 // Only with the Activity's key: the ticket alone (from an address, a log, analytics) makes nothing.
 const keyed=fakeSupabase(),t4=await choose(keyed.admin);
 for(const key of [null,'',KEYS.get(t4).replace(/^./,c=>c==='A'?'B':'A'),t4,42])assert.deepEqual(await run(keyed.admin,{op:'create',ticket:t4,key}),gone,String(key));
 assert.equal(keyed.log.created.length,0);assert.equal(ticketRow(keyed.db,t4).used_at,null,'still the Activity\'s');
 assert.equal((await run(keyed.admin,{op:'create',ticket:t4})).status,200);
 // Made or linked in the meantime (another start, the website): that farm opens, nothing new is made.
 const meantime=fakeSupabase(),t2=await choose(meantime.admin);meantime.db.accounts.push({discord_user_id:DISCORD_ID,player_id:W});
 assert.deepEqual(await run(meantime.admin,{op:'create',ticket:t2}),{status:200,data:{token_hash:`hash:${website(W).email}`,player_id:W}});
 assert.equal(meantime.log.created.length,0);assert.deepEqual(meantime.db.users.get(W),website(W),'the website farm is not changed');
 // Auth fails halfway: the ticket is given back and the game's next try makes the farm.
 const flaky=fakeSupabase({failCreate:1}),t3=await choose(flaky.admin);
 await assert.rejects(()=>run(flaky.admin,{op:'create',ticket:t3}),error=>error.message==='Database error creating new user');
 assert.equal(ticketRow(flaky.db,t3).used_at,null);
 assert.equal((await run(flaky.admin,{op:'create',ticket:t3})).status,200);
});

test('the website: peek shows the Discord name to a signed-in farmer; Link makes their farm the Discord user\'s; claim opens it once',async()=>{
 const before=USERS().find(u=>u.id===W),{admin,db,log}=fakeSupabase();
 const ticket=await choose(admin);
 assert.deepEqual(await run(admin,{op:'claim',ticket},{now:NOW+3000}),{status:200,data:{pending:true,expires_in:597}},'the Activity waits');
 assert.deepEqual(await run(admin,{op:'peek',ticket},{headers:bearer(W),now:NOW+30000}),{status:200,data:{display_name:'nelly',relink:false,expires_in:570}});
 assert.deepEqual(await run(admin,{op:'peek',ticket}),{status:401,data:{error:'SIGN_IN'}},'only with a session');
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{now:NOW+40000}),{status:401,data:{error:'SIGN_IN'}});
 log.calls.length=0;
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W),now:NOW+40000}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 const row=ticketRow(db,ticket);assert.equal(row.linked_player,W);assert.equal(row.display_name,null,'the Discord name has done its job');assert.equal(row.used_at,null);
 assert.deepEqual([row.state_hash,row.state_player,row.state_at],[null,null,null],'Link\'s state has done its job too');
 assert.ok(!log.calls.includes('generateLink'),'Link gives the website nothing to sign in with');
 assert.deepEqual(await run(admin,{op:'peek',ticket},{headers:bearer(W),now:NOW+41000}),gone,'asked once');
 // A second Link: no second trip to Discord (the dialog then asks status, which says linked).
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W),now:NOW+41000}),gone,'linked already');
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W2),now:NOW+41000}),gone,'another farmer: gone');
 // The ticket alone (read from the website's address) signs nobody in: gone, as if used, without saying it was linked.
 for(const key of [null,'x'.repeat(43),ticket])assert.deepEqual(await run(admin,{op:'claim',ticket,key},{now:NOW+41500}),gone,String(key));
 assert.deepEqual(log.links,[]);
 const claimed=await run(admin,{op:'claim',ticket},{now:NOW+42000});
 assert.deepEqual(claimed,{status:200,data:{token_hash:`hash:${before.email}`,player_id:W}});
 assert.deepEqual(log.links,[before.email],'one sign-in, for the website farm\'s own address');
 assert.deepEqual(await run(admin,{op:'claim',ticket},{now:NOW+43000}),gone,'once');
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W),now:NOW+700000}),gone,'Link tapped again later');
 assert.deepEqual(await run(admin,{op:'status'},{headers:bearer(W),now:NOW+700000}),{status:200,data:{linked:true}});
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W2),now:NOW+43000}),gone);
 // A website farm in Discord stays a website farm: its account is never changed, now or at its next start.
 assert.deepEqual(db.users.get(W),before);assert.deepEqual(log.updated,[]);
 const next=await run(admin,{op:'discord',code:'again'},{d:fakeDiscord({again:NELLY}),now:NOW+60000});
 assert.deepEqual(next,{status:200,data:{token_hash:`hash:${before.email}`,player_id:W,locale:'en-US'}});
 const signedIn=await run(admin,{op:'discord',code:'again'},{d:fakeDiscord({again:NELLY}),headers:bearer(W)});
 assert.deepEqual(signedIn,{status:200,data:{ok:true,player_id:W,locale:'en-US'}},'this session already');
 assert.deepEqual(db.users.get(W),before);assert.deepEqual(log.updated,[]);assert.equal(db.tickets.length,1,'no new choice for a Discord user with a farm');
 // Google or Facebook say whose address it is (no Settings check needed).
 for(const id of [GOOGLE,FB]){
  const s=fakeSupabase({checked:[]}),t=await choose(s.admin);
  assert.deepEqual(await run(s.admin,{op:'confirm',ticket:t},{headers:bearer(id)}),{status:200,data:{ok:true}},id);
  assert.ok(!s.log.calls.includes('rpc harvest_email_checked'),id);
 }
});

test('the website says no: an old, used or made-up ticket; a portal account; an address not confirmed; a farm or Discord user linked already',async()=>{
 const {admin,db,log}=fakeSupabase({accounts:[{discord_user_id:OTHER_ID,player_id:W2}],checked:[W,W2]});
 const ticket=await choose(admin);
 const confirm=(id,t=ticket,now=NOW)=>run(admin,{op:'confirm',ticket:t},{headers:bearer(id),now});
 assert.deepEqual(await confirm(W,ticket,NOW+600000),gone,'past its time');
 for(const bad of ['nope','x'.repeat(43),null,42])assert.deepEqual(await confirm(W,bad),gone,String(bad));
 assert.deepEqual(await run(admin,{op:'confirm'},{headers:bearer(W)}),gone,'no ticket at all');
 assert.deepEqual(await run(admin,{op:'peek',ticket:'x'.repeat(43)},{headers:bearer(W)}),gone);
 for(const id of [CG,KG,D,FAKE])assert.deepEqual(await confirm(id),{status:403,data:{error:'PORTAL_ACCOUNT'}},id);
 // A moderator's farm: never through Discord (their powers go with every session of the account).
 const staffed=fakeSupabase({staff:[GOOGLE]}),st=await choose(staffed.admin);
 assert.deepEqual(await run(staffed.admin,{op:'confirm',ticket:st},{headers:bearer(GOOGLE)}),{status:403,data:{error:'STAFF_ACCOUNT'}});
 assert.deepEqual(staffed.db.accounts,[]);assert.equal(ticketRow(staffed.db,st).linked_player,null);
 assert.deepEqual(await confirm(UNCONFIRMED),{status:403,data:{error:'EMAIL_UNCONFIRMED'}},'Supabase never confirmed it');
 assert.deepEqual(await confirm(UNCHECKED),{status:403,data:{error:'EMAIL_UNCONFIRMED'}},'not confirmed in Settings, Email address');
 assert.deepEqual(await confirm(W2),{status:409,data:{error:'ALREADY_LINKED'}},'another Discord account plays it already');
 assert.deepEqual(db.accounts,[{discord_user_id:OTHER_ID,player_id:W2}]);assert.equal(ticketRow(db,ticket).linked_player,null);assert.deepEqual(log.deletes,[]);
 // The same refusals at peek already, so such a farmer is never sent to Discord for nothing (confirm still checks them all).
 for(const [id,status,error] of [[CG,403,'PORTAL_ACCOUNT'],[KG,403,'PORTAL_ACCOUNT'],[D,403,'PORTAL_ACCOUNT'],[FAKE,403,'PORTAL_ACCOUNT'],[UNCONFIRMED,403,'EMAIL_UNCONFIRMED'],[UNCHECKED,403,'EMAIL_UNCONFIRMED'],[W2,409,'ALREADY_LINKED']])
  assert.deepEqual(await run(admin,{op:'peek',ticket},{headers:bearer(id)}),{status,data:{error}},id);
 assert.deepEqual(await run(staffed.admin,{op:'peek',ticket:st},{headers:bearer(GOOGLE)}),{status:403,data:{error:'STAFF_ACCOUNT'}});
 assert.deepEqual(await run(admin,{op:'peek',ticket},{headers:bearer(W)}),{status:200,data:{display_name:'nelly',relink:false,expires_in:600}});
 assert.equal((await confirm(W)).status,200,'the ticket still works for the right farm');
 // The Discord user plays another farm already: a website farm (linked at the same moment), or a Discord-only farm they were not
 // warned about (a second start made one): never moved, never deleted.
 for(const owner of [W2,D]){
  const s=fakeSupabase(),t=await choose(s.admin);s.db.accounts.push({discord_user_id:DISCORD_ID,player_id:owner});
  assert.deepEqual(await run(s.admin,{op:'confirm',ticket:t},{headers:bearer(W)}),{status:409,data:{error:'DISCORD_LINKED'}},owner);
  assert.deepEqual(s.db.accounts,[{discord_user_id:DISCORD_ID,player_id:owner}]);assert.ok(s.db.users.has(owner));assert.deepEqual(s.log.deletes,[]);
 }
});

// Link on the website (10 Oct 2026, the owner's choice against a ticket's link sent to someone else): the website first sends the
// farmer to Discord, and confirm links only with Discord's code for the ticket's own Discord account.
test('confirm needs Discord\'s code: the ticket\'s own Discord account links (swapped with the website\'s callback address, the token never kept)',async()=>{
 assert.equal(LINK_CALLBACK,'https://www.harvesttycoon.com/discord-link/callback');assert.equal(DISCORD_CALLBACK,LINK_CALLBACK,'the website asks Discord with the address the server swaps with');
 const {admin,db}=fakeSupabase(),ticket=await choose(admin),d=fakeDiscord({mine:NELLY});
 assert.deepEqual(await run(admin,{op:'confirm',ticket,code:'mine'},{headers:bearer(W),d}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 assert.deepEqual(d.calls,[TOKEN_URL,ME_URL],'one swap, one users/@me');
 assert.deepEqual(d.forms,[{client_id:CLIENT_ID,client_secret:SECRET,grant_type:'authorization_code',code:'mine',redirect_uri:'https://www.harvesttycoon.com/discord-link/callback'}]);
 assert.doesNotMatch(JSON.stringify(db),/access-|"mine"/,'the access token and the code are never kept');
 // The Activity's own codes go as before: without a redirect_uri (commands.authorize gives none).
 const activity=fakeSupabase(),a=fakeDiscord({start:NELLY});
 await run(activity.admin,{op:'discord',code:'start'},{d:a});
 const again=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]}),r=fakeDiscord({r:NELLY});
 await run(again.admin,{op:'relink',code:'r'},{headers:bearer(D),d:r});
 for(const form of [...a.forms,...r.forms])assert.deepEqual(Object.keys(form).sort(),['client_id','client_secret','code','grant_type'],JSON.stringify(form));
 const plain=fakeDiscord({x:NELLY}),site=fakeDiscord({y:NELLY});
 await verifyDiscord({code:'x',clientId:CLIENT_ID,clientSecret:SECRET,fetchImpl:plain.fetchImpl});
 await verifyDiscord({code:'y',clientId:CLIENT_ID,clientSecret:SECRET,redirectUri:LINK_CALLBACK,fetchImpl:site.fetchImpl});
 assert.equal('redirect_uri' in plain.forms[0],false);assert.equal(site.forms[0].redirect_uri,LINK_CALLBACK);
});

test('confirm: another Discord account than the ticket\'s is DISCORD_MISMATCH and nothing changes; no code, a refused code, Discord away: nothing either',async()=>{
 const MALLORY={...NELLY,id:OTHER_ID,username:'mallory'};
 const {admin,db,log}=fakeSupabase(),ticket=await choose(admin),state=await begin(admin,ticket),before=structuredClone({accounts:db.accounts,tickets:db.tickets,users:[...db.users]});
 const unchanged=()=>assert.deepEqual(structuredClone({accounts:db.accounts,tickets:db.tickets,users:[...db.users]}),before);
 log.calls.length=0;
 // The ticket's link sent to someone else, who signs in and taps Link: Discord says it is them, not the ticket's Discord user.
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'theirs'},{headers:bearer(W),d:fakeDiscord({theirs:MALLORY})}),{status:403,data:{error:'DISCORD_MISMATCH'}});
 unchanged();assert.deepEqual(log.calls,['rpc harvest_session_active'],'nothing written, nothing deleted');
 // No code, or not one Discord could have given: 400, and Discord is not asked.
 for(const code of [null,'',42,'a b','x'.repeat(257),{}]){
  const d=fakeDiscord({mine:NELLY});
  assert.deepEqual(await run(admin,{op:'confirm',state,code},{headers:bearer(W),d}),{status:400,data:{error:MESSAGES.request}},JSON.stringify(code));
  assert.deepEqual(d.calls,[]);
 }
 // A code Discord refuses (made up, used, too old): 401 as for the Activity, with the reason for the log.
 const refusing=fakeDiscord({once:NELLY});
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'made-up'},{headers:bearer(W),d:refusing}),{status:401,data:{error:MESSAGES.code},refused:'invalid_grant'});
 // Discord away or asking us to wait: as for the Activity (503, 429), and the farmer tries again.
 const away={fetchImpl:async()=>{throw new TypeError('fetch failed');},calls:[]};
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{headers:bearer(W),d:away}),{status:503,data:{error:MESSAGES.unavailable,code:'DISCORD_UNAVAILABLE'}});
 const pause={until:NOW+30000};
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{headers:bearer(W),pause}),{status:429,data:{error:MESSAGES.busy,retry_after:30}});
 unchanged();assert.deepEqual(log.links,[]);
 // Signed out: SIGN_IN, as before (Discord's code alone links nothing), and Discord is not asked.
 const out=fakeDiscord({n:NELLY});
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'n'},{d:out}),{status:401,data:{error:'SIGN_IN'}});
 unchanged();assert.deepEqual(out.calls,[]);
 // None of these used the state up: it still links for its own Discord account.
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{headers:bearer(W),d:fakeDiscord({mine:NELLY})}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 // Linked: no second trip to Discord, for any account.
 assert.deepEqual(await run(admin,{op:'begin',ticket},{headers:bearer(W)}),gone);
 // From Settings on a farm made on Discord: someone else's Link deletes nothing and moves nothing.
 const relinked=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]}),t=(await relinkAs(relinked.admin)).data.ticket;
 assert.deepEqual(await run(relinked.admin,{op:'confirm',ticket:t,code:'theirs'},{headers:bearer(W),d:fakeDiscord({theirs:MALLORY})}),{status:403,data:{error:'DISCORD_MISMATCH'}});
 assert.ok(relinked.db.users.has(D));assert.deepEqual(relinked.log.deletes,[]);assert.deepEqual(relinked.db.accounts,[{discord_user_id:DISCORD_ID,player_id:D}]);
 assert.equal(ticketRow(relinked.db,t).linked_player,null);assert.equal(ticketRow(relinked.db,t).display_name,'nelly','still the question for its own account');
});

// Phones (10 Oct 2026): Discord's authorize page often opens Discord's app, which sends the farmer back to a new tab or another
// browser. Link's state lives on our server (op begin), bound to the website account that tapped Link, so code and state are enough.
test('begin: a new random state for Link\'s trip to Discord, only its SHA-256 kept, with the account that tapped Link; a new begin replaces it',async()=>{
 const {admin,db,log}=fakeSupabase({checked:[W,W2]}),ticket=await choose(admin);
 assert.deepEqual(await run(admin,{op:'begin',ticket}),{status:401,data:{error:'SIGN_IN'}},'only with a session');
 const r=await run(admin,{op:'begin',ticket},{headers:bearer(W),now:NOW+20000});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data),['state'],'the state and nothing else');
 assert.match(r.data.state,/^[A-Za-z0-9_-]{43}$/);assert.equal(Buffer.from(r.data.state,'base64url').length,32);assert.notEqual(r.data.state,ticket);
 assert.equal(STATE_TTL,600);
 const row=ticketRow(db,ticket);
 assert.deepEqual([row.state_hash,row.state_player,row.state_at],[sha256(r.data.state),W,iso(NOW+20000)]);
 assert.ok(!JSON.stringify(db).includes(r.data.state),'the state itself is never stored');
 assert.equal(row.linked_player,null);assert.equal(row.used_at,null);assert.deepEqual(db.accounts,[],'begin links nothing');
 // Back from Discord, the state alone asks the question (who wants to play, a relink or not).
 assert.deepEqual(await run(admin,{op:'peek',state:r.data.state},{headers:bearer(W),now:NOW+30000}),{status:200,data:{display_name:'nelly',relink:false,expires_in:570}});
 // Link again: a new state, and the old one is done.
 const again=await begin(admin,ticket);
 assert.notEqual(again,r.data.state);assert.equal(ticketRow(db,ticket).state_hash,sha256(again));
 assert.deepEqual(await run(admin,{op:'peek',state:r.data.state},{headers:bearer(W)}),gone);
 const d=fakeDiscord({mine:NELLY});
 assert.deepEqual(await run(admin,{op:'confirm',state:r.data.state,code:'mine'},{headers:bearer(W),d}),gone);assert.deepEqual(d.calls,[]);
 // Begun again from a state (Link after Discord's no, in a tab that never knew the ticket): the same ticket, a new state.
 const rotated=await run(admin,{op:'begin',state:again},{headers:bearer(W)});
 assert.equal(rotated.status,200);assert.equal(ticketRow(db,ticket).state_hash,sha256(rotated.data.state));
 assert.deepEqual(await run(admin,{op:'begin',state:again},{headers:bearer(W)}),gone,'the old one is done');
 // Another farmer taps Link with the same ticket (its link sent on): their state now, and the first one is done.
 const theirs=await begin(admin,ticket,W2);
 assert.equal(ticketRow(db,ticket).state_player,W2);
 assert.deepEqual(await run(admin,{op:'peek',state:rotated.data.state},{headers:bearer(W)}),gone);
 // The refusals of peek, before anything is kept: a portal or Discord account, a moderator, an unconfirmed address.
 for(const id of [CG,KG,D,FAKE])assert.deepEqual(await run(admin,{op:'begin',ticket},{headers:bearer(id)}),{status:403,data:{error:'PORTAL_ACCOUNT'}},id);
 for(const id of [UNCONFIRMED,UNCHECKED])assert.deepEqual(await run(admin,{op:'begin',ticket},{headers:bearer(id)}),{status:403,data:{error:'EMAIL_UNCONFIRMED'}},id);
 const staffed=fakeSupabase({staff:[GOOGLE]}),st=await choose(staffed.admin);
 assert.deepEqual(await run(staffed.admin,{op:'begin',ticket:st},{headers:bearer(GOOGLE)}),{status:403,data:{error:'STAFF_ACCOUNT'}});assert.equal(ticketRow(staffed.db,st).state_hash,null);
 assert.equal(ticketRow(db,ticket).state_hash,sha256(theirs),'unchanged by a refusal');
 // A ticket past its time, made up or cut short: gone.
 assert.deepEqual(await run(admin,{op:'begin',ticket},{headers:bearer(W),now:NOW+600000}),gone,'past its time');
 for(const bad of [undefined,'short','x'.repeat(43),42])assert.deepEqual(await run(admin,{op:'begin',ticket:bad,state:bad},{headers:bearer(W)}),gone,String(bad));
 assert.deepEqual(log.links,[]);assert.deepEqual(db.accounts,[]);
});

test('back from Discord in a fresh tab: code and state alone link the farm of the account that tapped Link; the Activity opens it',async()=>{
 const {admin,db}=fakeSupabase(),ticket=await choose(admin),state=await begin(admin,ticket,W,NOW+10000);
 // A new tab (Discord's app on a phone): no ticket, nothing from the first tab, the same account signed in on this browser.
 assert.deepEqual(await run(admin,{op:'peek',state},{headers:bearer(W),now:NOW+50000}),{status:200,data:{display_name:'nelly',relink:false,expires_in:550}});
 const d=fakeDiscord({fresh:NELLY});
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'fresh'},{headers:bearer(W),d,now:NOW+60000}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 assert.deepEqual(d.calls,[TOKEN_URL,ME_URL]);assert.equal(d.forms[0].redirect_uri,LINK_CALLBACK);
 const row=ticketRow(db,ticket);
 assert.equal(row.linked_player,W);assert.deepEqual([row.state_hash,row.state_player,row.state_at],[null,null,null],'a state links once');
 assert.deepEqual(await run(admin,{op:'claim',ticket},{now:NOW+61000}),{status:200,data:{token_hash:`hash:${website(W).email}`,player_id:W}});
 // From Settings on a farm made on Discord, the same: the Discord farm goes once the website farm is linked.
 const relinked=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]}),t=(await relinkAs(relinked.admin)).data.ticket,s2=await begin(relinked.admin,t);
 assert.deepEqual(await run(relinked.admin,{op:'peek',state:s2},{headers:bearer(W)}),{status:200,data:{display_name:'nelly',relink:true,expires_in:600}});
 assert.deepEqual(await run(relinked.admin,{op:'confirm',state:s2,code:'r2'},{headers:bearer(W),d:fakeDiscord({r2:NELLY})}),{status:200,data:{ok:true}});
 assert.deepEqual(relinked.db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);assert.ok(!relinked.db.users.has(D));
});

test('back from Discord signed in with another account: LINK_OTHER_ACCOUNT, Discord not asked, nothing changes',async()=>{
 const {admin,db,log}=fakeSupabase({checked:[W,W2]}),ticket=await choose(admin),state=await begin(admin,ticket);
 const snapshot=()=>structuredClone({accounts:db.accounts,tickets:db.tickets,users:[...db.users]}),before=snapshot();
 assert.equal(LINK_ERRORS.otherAccount,'LINK_OTHER_ACCOUNT');
 log.calls.length=0;
 const d=fakeDiscord({mine:NELLY});
 for(const id of [W2,GOOGLE]){
  assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{headers:bearer(id),d}),{status:403,data:{error:'LINK_OTHER_ACCOUNT'}},id);
  assert.deepEqual(await run(admin,{op:'peek',state},{headers:bearer(id)}),{status:403,data:{error:'LINK_OTHER_ACCOUNT'}},id);
  assert.deepEqual(await run(admin,{op:'begin',state},{headers:bearer(id)}),{status:403,data:{error:'LINK_OTHER_ACCOUNT'}},id);
 }
 assert.deepEqual(d.calls,[],'Discord\'s code is never swapped for another account');
 assert.deepEqual(snapshot(),before);assert.ok(log.calls.every(call=>call==='rpc harvest_session_active'),log.calls.join(', '));
 // Signed out on that browser: SIGN_IN (the sign-in card, then the question again).
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{d}),{status:401,data:{error:'SIGN_IN'}});
 assert.deepEqual(snapshot(),before);assert.deepEqual(d.calls,[]);
 // Signed in with the account that tapped Link: the same state and code link.
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'mine'},{headers:bearer(W),d}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
});

test('a state links once and for 10 minutes: a used, old, unknown or made-up state is gone, and Discord is not asked',async()=>{
 const {admin,db}=fakeSupabase(),ticket=await choose(admin),state=await begin(admin,ticket),d=fakeDiscord({a:NELLY,b:NELLY});
 for(const bad of [null,'','short','x'.repeat(43),`${state}=`,ticket,42])
  assert.deepEqual(await run(admin,{op:'confirm',state:bad,code:'a'},{headers:bearer(W),d}),gone,`${bad}`);
 assert.deepEqual(await run(admin,{op:'peek',state:ticket},{headers:bearer(W)}),gone,'the ticket is not a state');
 // Older than STATE_TTL (10 minutes), also while its ticket is still open; its ticket past its time.
 const row=ticketRow(db,ticket),at=row.state_at;row.state_at=iso(NOW-STATE_TTL*1000);
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'a'},{headers:bearer(W),d}),gone);
 assert.deepEqual(await run(admin,{op:'peek',state},{headers:bearer(W)}),gone);assert.deepEqual(await run(admin,{op:'begin',state},{headers:bearer(W)}),gone);
 row.state_at=at;
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'a'},{headers:bearer(W),d,now:NOW+600000}),gone);
 assert.deepEqual(d.calls,[]);assert.deepEqual(db.accounts,[]);
 // Once: the second time it is gone, with a good code too.
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'a'},{headers:bearer(W),d}),{status:200,data:{ok:true}});
 assert.deepEqual(await run(admin,{op:'confirm',state,code:'b'},{headers:bearer(W),d}),gone,'used');
 assert.equal(d.calls.length,2,'Discord asked once');
 // Two confirms at the same moment with one state: one links, the other is gone.
 const race=fakeSupabase(),t=await choose(race.admin),s=await begin(race.admin,t),both=fakeDiscord({x:NELLY,y:NELLY});
 const answers=await Promise.all(['x','y'].map(code=>run(race.admin,{op:'confirm',state:s,code},{headers:bearer(W),d:both})));
 assert.deepEqual(answers.map(a=>a.status).sort(),[200,410]);assert.deepEqual(race.db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 // The Activity's Cancel (after Settings) meanwhile: gone, and the Discord farm stays.
 const cancelled=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]}),r=await relinkAs(cancelled.admin),s2=await begin(cancelled.admin,r.data.ticket);
 assert.deepEqual(await run(cancelled.admin,{op:'cancel',ticket:r.data.ticket}),{status:200,data:{ok:true}});
 assert.deepEqual(await run(cancelled.admin,{op:'confirm',state:s2,code:'c'},{headers:bearer(W),d:fakeDiscord({c:NELLY})}),gone);
 assert.ok(cancelled.db.users.has(D));assert.deepEqual(cancelled.log.deletes,[]);
 // A refusal after Discord said yes (the farm linked to another Discord account meanwhile) uses the state up too: Link starts again.
 const late=fakeSupabase(),t3=await choose(late.admin),s3=await begin(late.admin,t3);late.db.accounts.push({discord_user_id:OTHER_ID,player_id:W});
 assert.deepEqual(await run(late.admin,{op:'confirm',state:s3,code:'l'},{headers:bearer(W),d:fakeDiscord({l:NELLY})}),{status:409,data:{error:'ALREADY_LINKED'}});
 assert.equal(ticketRow(late.db,t3).state_hash,null);
});

test('relink: only a Discord-only farm asks; Link moves the row first, then deletes that farm; never any other account',async()=>{
 const {admin,db,log}=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]});
 assert.deepEqual(await run(admin,{op:'relink',code:'r'},{d:fakeDiscord({r:NELLY})}),{status:401,data:{error:'SIGN_IN'}});
 for(const id of [W,KG,CG])assert.deepEqual(await relinkAs(admin,id),{status:403,data:{error:'NOT_DISCORD_FARM'}},id);
 // Always with a code from commands.authorize, so the website always names the Discord account (never "Someone on Discord").
 assert.deepEqual(await run(admin,{op:'relink'},{headers:bearer(D)}),{status:400,data:{error:MESSAGES.request}},'no code');
 const r=await relinkAs(admin);
 assert.deepEqual(Object.keys(r.data).sort(),['expires_in','key','ticket']);assert.equal(r.data.expires_in,600);
 assert.deepEqual({...ticketRow(db,r.data.ticket),ticket_hash:undefined,created_at:undefined},{ticket_hash:undefined,created_at:undefined,display_name:'nelly',key_hash:sha256(r.data.key),relink_from:D,linked_player:null,used_at:null,state_hash:null,state_player:null,state_at:null,discord_user_id:DISCORD_ID,expires_at:iso(NOW+600000)});
 assert.deepEqual(await run(admin,{op:'peek',ticket:r.data.ticket},{headers:bearer(W)}),{status:200,data:{display_name:'nelly',relink:true,expires_in:600}},'the website warns that the Discord farm goes');
 // A code of another Discord user is refused.
 const named=await relinkAs(admin);
 assert.equal(ticketRow(db,named.data.ticket).display_name,'nelly');
 assert.deepEqual(await run(admin,{op:'relink',code:'theirs'},{headers:bearer(D),d:fakeDiscord({theirs:{...NELLY,id:OTHER_ID}})}),{status:403,data:{error:'NOT_DISCORD_FARM'}});
 assert.deepEqual(await run(admin,{op:'relink',code:'used'},{headers:bearer(D)}),{status:401,data:{error:MESSAGES.code},refused:'invalid_grant'});
 assert.deepEqual(await run(admin,{op:'relink',code:'a b'},{headers:bearer(D)}),{status:400,data:{error:MESSAGES.request}});
 assert.ok(db.users.has(D),'asking deletes nothing');
 log.calls.length=0;
 assert.deepEqual(await run(admin,{op:'confirm',ticket:r.data.ticket},{headers:bearer(W)}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);
 // The order: the row names the website farm before the Discord-only farm is deleted.
 const moved=log.calls.indexOf('discord_accounts.update'),deleted=log.calls.indexOf('rpc harvest_delete_account');
 assert.ok(moved>=0&&deleted>moved,log.calls.join(', '));
 assert.deepEqual(log.deletes,[{p_player:D,p_name:'Sunny Acres 4821'}],'with its own farmer name, as Delete account');
 assert.ok(!db.users.has(D));assert.ok(!db.stats.some(s=>s.player_id===D));
 const row=ticketRow(db,r.data.ticket);assert.equal(row.relink_from,null,'on delete set null: the ticket outlives the old farm');assert.equal(row.linked_player,W);
 assert.deepEqual(await run(admin,{op:'claim',ticket:r.data.ticket}),{status:200,data:{token_hash:`hash:${website(W).email}`,player_id:W}});
 // Not a Discord-only farm (a website account, or the mark missing): never deleted, nothing moves.
 for(const victim of [website(W2),{...discordFarm(D),app_metadata:{provider:'email'}}]){
  const s=fakeSupabase({users:[...USERS().filter(u=>u.id!==victim.id),victim],accounts:[{discord_user_id:DISCORD_ID,player_id:victim.id}]});
  const t=Buffer.alloc(32,7).toString('base64url');
  s.db.tickets.push({ticket_hash:sha256(t),discord_user_id:DISCORD_ID,display_name:null,relink_from:victim.id,linked_player:null,created_at:iso(NOW),expires_at:iso(NOW+600000),used_at:null});
  assert.deepEqual(await run(s.admin,{op:'confirm',ticket:t},{headers:bearer(W)}),{status:409,data:{error:'DISCORD_LINKED'}});
  assert.ok(s.db.users.has(victim.id));assert.deepEqual(s.log.deletes,[]);assert.deepEqual(s.db.accounts,[{discord_user_id:DISCORD_ID,player_id:victim.id}]);
 }
 // The row moved to another farm since the relink was asked: refused, and the old farm stays.
 const since=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]}),t=(await relinkAs(since.admin)).data.ticket;
 since.db.accounts[0].player_id=W2;
 assert.deepEqual(await run(since.admin,{op:'confirm',ticket:t},{headers:bearer(W)}),{status:409,data:{error:'DISCORD_LINKED'}});assert.ok(since.db.users.has(D));
});

test('relink: an old farm that cannot be deleted stays for the owner (its id in the log); the Activity\'s claim finishes it',async()=>{
 const {admin,db,log}=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}],failDelete:1});
 const ticket=(await relinkAs(admin)).data.ticket;
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W)}),{status:200,data:{ok:true},leftover:D},'the link stands');
 assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:W}]);assert.ok(db.users.has(D));
 const claimed=await run(admin,{op:'claim',ticket});
 assert.deepEqual(claimed,{status:200,data:{token_hash:`hash:${website(W).email}`,player_id:W}},'the second try deletes it');
 assert.ok(!db.users.has(D));assert.equal(log.deletes.length,2);
});

test('claim: pending until the website says yes, a minute more after a late yes, once; a failed sign-in gives the ticket back',async()=>{
 const {admin,db}=fakeSupabase({failLink:1});
 const ticket=await choose(admin);
 assert.deepEqual(await run(admin,{op:'claim',ticket},{now:NOW+599000}),{status:200,data:{pending:true,expires_in:1}});
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W),now:NOW+590000}),{status:200,data:{ok:true}});
 assert.equal(ticketRow(db,ticket).expires_at,iso(NOW+650000),'a yes in the last minute: claimable a minute more');
 await assert.rejects(()=>run(admin,{op:'claim',ticket},{now:NOW+640000}),error=>error.message==='Auth is down');
 assert.equal(ticketRow(db,ticket).used_at,null,'given back');
 assert.equal((await run(admin,{op:'claim',ticket},{now:NOW+645000})).status,200);
 assert.equal(ticketRow(db,ticket).used_at,iso(NOW+645000));
 // Never a yes: gone once its time is up (the Activity goes back to the choice).
 const late=fakeSupabase(),t=await choose(late.admin);
 assert.deepEqual(await run(late.admin,{op:'claim',ticket:t},{now:NOW+600000}),gone);
 assert.deepEqual(await run(late.admin,{op:'claim',ticket:'x'.repeat(43)}),gone);
 // A linked website farm whose address is no longer confirmed: no sign-in link (it would confirm the address).
 const lapsed=fakeSupabase(),t2=await choose(lapsed.admin);
 await run(lapsed.admin,{op:'confirm',ticket:t2},{headers:bearer(W)});lapsed.db.users.get(W).email_confirmed_at=null;
 assert.deepEqual(await run(lapsed.admin,{op:'claim',ticket:t2}),{status:403,data:{error:'EMAIL_UNCONFIRMED'}});
 assert.deepEqual(await run(lapsed.admin,{op:'discord',code:'c'},{d:fakeDiscord({c:NELLY})}),{status:403,data:{error:'EMAIL_UNCONFIRMED'}});
 assert.deepEqual(lapsed.log.links,[]);assert.deepEqual(lapsed.log.updated,[]);
});

test('cancel: Cancel on the Activity\'s waiting card after Settings withdraws the ticket (only with its key), so a later Link deletes nothing',async()=>{
 const {admin,db,log}=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]});
 const r=await relinkAs(admin);
 for(const key of [null,'x'.repeat(43),r.data.ticket])assert.deepEqual(await run(admin,{op:'cancel',ticket:r.data.ticket,key}),gone,String(key));
 assert.equal(ticketRow(db,r.data.ticket).used_at,null,'the ticket alone withdraws nothing');
 assert.deepEqual(await run(admin,{op:'cancel',ticket:r.data.ticket},{now:NOW+5000}),{status:200,data:{ok:true}});
 const row=ticketRow(db,r.data.ticket);assert.equal(row.used_at,iso(NOW+5000));assert.equal(row.display_name,null);
 // The website's tab still open: Link there is too late, and the Discord farm stays.
 assert.deepEqual(await run(admin,{op:'peek',ticket:r.data.ticket},{headers:bearer(W)}),gone);
 assert.deepEqual(await run(admin,{op:'confirm',ticket:r.data.ticket},{headers:bearer(W)}),gone);
 assert.ok(db.users.has(D));assert.deepEqual(log.deletes,[]);assert.deepEqual(db.accounts,[{discord_user_id:DISCORD_ID,player_id:D}]);
 assert.deepEqual(await run(admin,{op:'cancel',ticket:r.data.ticket}),gone,'once');
 // Linked just before the Cancel: nothing to withdraw; the Activity's new start opens the website farm.
 const r2=await relinkAs(admin);
 assert.deepEqual(await run(admin,{op:'confirm',ticket:r2.data.ticket},{headers:bearer(W)}),{status:200,data:{ok:true}});
 assert.deepEqual(await run(admin,{op:'cancel',ticket:r2.data.ticket}),gone);
 assert.deepEqual(await run(admin,{op:'discord',code:'c'},{d:fakeDiscord({c:NELLY})}),{status:200,data:{token_hash:`hash:${website(W).email}`,player_id:W,locale:'en-US'}});
});

test('Settings › Privacy on the website: status shows a farm Discord plays; Unlink ends it, withdraws a yes not picked up yet, signs out the other devices',async()=>{
 const {admin,db,log}=fakeSupabase({accounts:[{discord_user_id:OTHER_ID,player_id:D}]});
 assert.deepEqual(await run(admin,{op:'status'}),{status:401,data:{error:'SIGN_IN'}});
 assert.deepEqual(await run(admin,{op:'unlink'}),{status:401,data:{error:'SIGN_IN'}});
 assert.deepEqual(await run(admin,{op:'status'},{headers:bearer(W)}),{status:200,data:{linked:false}});
 const ticket=await choose(admin);
 assert.deepEqual(await run(admin,{op:'confirm',ticket},{headers:bearer(W)}),{status:200,data:{ok:true}});
 assert.deepEqual(await run(admin,{op:'status'},{headers:bearer(W)}),{status:200,data:{linked:true}});
 assert.deepEqual(await run(admin,{op:'unlink'},{headers:bearer(W),now:NOW+9000}),{status:200,data:{ok:true}});
 assert.deepEqual(db.accounts,[{discord_user_id:OTHER_ID,player_id:D}],'only this farm\'s row');
 assert.equal(ticketRow(db,ticket).used_at,iso(NOW+9000),'the Activity can no longer pick up the yes');
 assert.deepEqual(await run(admin,{op:'claim',ticket}),gone);assert.deepEqual(log.links,[]);
 assert.deepEqual(log.signOuts,[[W,'others']],'every other session ends (a game open in Discord too); this one stays');
 assert.deepEqual(await run(admin,{op:'status'},{headers:bearer(W)}),{status:200,data:{linked:false}});
 assert.deepEqual(db.users.get(W),website(W),'the account itself is not changed');
 // The Discord account's next start: the choice again, never the website farm.
 assert.equal((await run(admin,{op:'discord',code:'c'},{d:fakeDiscord({c:NELLY})})).data.choose,true);
 // A farm made on Discord (or another portal) is never unlinked: it would have no way in left.
 for(const id of [D,CG,KG])assert.deepEqual(await run(admin,{op:'unlink'},{headers:bearer(id)}),{status:403,data:{error:'PORTAL_ACCOUNT'}},id);
 assert.deepEqual(await run(admin,{op:'status'},{headers:bearer(D)}),{status:200,data:{linked:false}});
 assert.deepEqual(db.accounts,[{discord_user_id:OTHER_ID,player_id:D}]);assert.equal(log.signOuts.length,1);
});

test('at most 10 open tickets per Discord user; tickets a day past their time go when a new one is made',async()=>{
 const old={ticket_hash:'0'.repeat(64),discord_user_id:OTHER_ID,display_name:null,relink_from:null,linked_player:null,used_at:null,created_at:iso(NOW-2*86400000),expires_at:iso(NOW-86400001)};
 const recent={...old,ticket_hash:'1'.repeat(64),expires_at:iso(NOW-3600000)};
 const {admin,db}=fakeSupabase({tickets:[old,recent]});
 for(let i=0;i<MAX_OPEN_TICKETS;i++)await choose(admin);
 assert.equal(MAX_OPEN_TICKETS,10);
 assert.deepEqual(db.tickets.map(t=>t.ticket_hash).filter(h=>/^[01]+$/.test(h)),['1'.repeat(64)],'a day past its time: gone; an hour: still there');
 assert.deepEqual(await run(admin,{op:'discord',code:'c'},{d:fakeDiscord({c:NELLY})}),{status:429,data:{error:'TOO_MANY_TICKETS',retry_after:60}});
 const d=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}]});
 for(let i=0;i<MAX_OPEN_TICKETS;i++)assert.equal((await relinkAs(d.admin)).status,200);
 assert.deepEqual(await relinkAs(d.admin),{status:429,data:{error:'TOO_MANY_TICKETS',retry_after:60}});
 assert.equal((await choose(admin,{now:NOW+600000})).length,43,'10 minutes later: again');
 assert.equal(db.tickets.filter(t=>t.discord_user_id===DISCORD_ID).length,MAX_OPEN_TICKETS+1);
});

test('the codes for the game and the website; never a ticket, code or token in the log; no email is ever sent',async()=>{
 assert.deepEqual({...LINK_ERRORS},{signIn:'SIGN_IN',notDiscord:'NOT_DISCORD_FARM',portal:'PORTAL_ACCOUNT',staff:'STAFF_ACCOUNT',email:'EMAIL_UNCONFIRMED',mismatch:'DISCORD_MISMATCH',otherAccount:'LINK_OTHER_ACCOUNT',alreadyLinked:'ALREADY_LINKED',discordLinked:'DISCORD_LINKED',gone:'TICKET_GONE',tooMany:'TOO_MANY_TICKETS'});
 const code=read('supabase/functions/discord-auth/discord.js'),index=read('supabase/functions/discord-auth/index.ts');
 assert.doesNotMatch(code,/console\./,'discord.js logs nothing itself');
 // Sign-in links are only made (generateLink, type magiclink), never mailed: no OTP, invite, reset or resend, no other link type.
 assert.doesNotMatch(code,/signInWithOtp|inviteUserByEmail|resetPasswordForEmail|\.resend\(|type:'(signup|invite|recovery|email_change)/);
 assert.equal(code.match(/generateLink\(/g).length,1);assert.match(code,/generateLink\(\{type:'magiclink',email\}\)/);
 // A website farm's account is only ever read: the one updateUserById is the Discord-only farm's marks (openFarm, madeFor).
 assert.equal(code.match(/updateUserById\(/g).length,1);assert.match(code,/if\(madeFor\(user,userId\)\)\{\n  if\(!isCurrent\(user,userId\)\)\{\n   const marked=await admin\.auth\.admin\.updateUserById/);
 // The Edge Function itself, every op through it: the log has the reason and the leftover id, never a ticket, code or token.
 const source=stripTypeScriptTypes(index.replace(/^import .*;\n/gm,''));
 const logs=[],settings={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',DISCORD_CLIENT_ID:CLIENT_ID,DISCORD_CLIENT_SECRET:SECRET};
 const {admin}=fakeSupabase({accounts:[{discord_user_id:DISCORD_ID,player_id:D}],failDelete:1}),d=fakeDiscord({start:{...NELLY,id:OTHER_ID},mine:NELLY,'site-code':NELLY});
 let handler;vm.runInNewContext(source,{...discord,handleDiscordAuth:args=>handleDiscordAuth({...args,fetchImpl:d.fetchImpl,pause:{until:0}}),createClient:()=>admin,
  Deno:{env:{get:key=>settings[key]},serve:fn=>handler=fn},Response,JSON,String,Error,console:{error:(...a)=>logs.push(a.join(' '))}});
 const call=async(body,headers={})=>{const res=await handler(new Request('https://x.supabase.co/functions/v1/discord-auth',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}));return {status:res.status,data:await res.json()};};
 const chosen=(await call({op:'discord',code:'start'})).data,relinked=(await call({op:'relink',code:'mine'},bearer(D))).data;
 const secrets=[chosen.ticket,chosen.key,relinked.ticket,relinked.key,'start','mine','site-code','access-'];
 assert.equal((await call({op:'peek',ticket:relinked.ticket},bearer(W))).data.display_name,'nelly');
 const {state}=(await call({op:'begin',ticket:relinked.ticket},bearer(W))).data;secrets.push(state);
 assert.equal((await call({op:'peek',state},bearer(W2))).data.error,'LINK_OTHER_ACCOUNT');
 assert.deepEqual(await call({op:'confirm',state,code:'site-code'},bearer(W)),{status:200,data:{ok:true}},'the leftover stays in the log, not in the answer');
 const claimed=await call({op:'claim',ticket:relinked.ticket,key:relinked.key});secrets.push(claimed.data.token_hash);
 assert.deepEqual(await call({op:'claim',ticket:relinked.ticket,key:relinked.key}),{status:410,data:{error:'TICKET_GONE'}});
 const created=await call({op:'create',ticket:chosen.ticket,key:chosen.key});secrets.push(created.data.token_hash);
 assert.deepEqual(logs,[`A replaced Discord farm is left to delete: ${D}`]);
 assert.ok(!logs.some(line=>secrets.some(s=>line.includes(s))));
 assert.match(index,/if\(result\.leftover\)console\.error\('A replaced Discord farm is left to delete:',result\.leftover\);/);
});

test('discord-link.sql: the ticket table service-role only, the hash not the ticket or the state, a player id never kept past a deletion, the clean-up job',()=>{
 const sql=read('supabase/discord-link.sql');
 assert.match(sql,/create table if not exists public\.discord_link_tickets \(\n ticket_hash text primary key check \(ticket_hash ~ '\^\[0-9a-f\]\{64\}\$'\),\n discord_user_id text not null check \(discord_user_id ~ '\^\[0-9\]\{17,20\}\$'\),\n display_name text check \(display_name is null or char_length\(display_name\) between 1 and 32\),\n key_hash text not null check \(key_hash ~ '\^\[0-9a-f\]\{64\}\$'\),\n relink_from uuid references auth\.users\(id\) on delete set null,\n linked_player uuid references auth\.users\(id\) on delete cascade,\n created_at timestamptz not null default now\(\),\n expires_at timestamptz not null,\n used_at timestamptz,\n state_hash text unique check \(state_hash ~ '\^\[0-9a-f\]\{64\}\$'\),\n state_player uuid references auth\.users\(id\) on delete cascade,\n state_at timestamptz,\n check \(\(state_hash is null\)=\(state_player is null\) and \(state_hash is null\)=\(state_at is null\)\)\n\);/);
 assert.match(sql,/alter table public\.discord_link_tickets enable row level security;\nrevoke all on public\.discord_link_tickets from anon, authenticated;/);
 assert.doesNotMatch(sql,/grant |create policy/i,'service_role only');
 for(const index of ['discord_link_tickets_user on public.discord_link_tickets(discord_user_id, expires_at)','discord_link_tickets_expires on public.discord_link_tickets(expires_at)',
  'discord_link_tickets_relink_from on public.discord_link_tickets(relink_from) where relink_from is not null','discord_link_tickets_linked_player on public.discord_link_tickets(linked_player) where linked_player is not null',
  'discord_link_tickets_state_player on public.discord_link_tickets(state_player) where state_player is not null'])
  assert.ok(sql.includes(`create index if not exists ${index};`),index);
 assert.match(sql,/select cron\.unschedule\('harvest-discord-link-tickets'\) where exists\(select 1 from cron\.job where jobname='harvest-discord-link-tickets'\);\nselect cron\.schedule\('harvest-discord-link-tickets','\*\/15 \* \* \* \*',\$c\$update public\.discord_link_tickets set display_name=null where display_name is not null and \(used_at is not null or linked_player is not null or expires_at<now\(\)\); update public\.discord_link_tickets set state_hash=null, state_player=null, state_at=null where state_hash is not null and \(used_at is not null or linked_player is not null or expires_at<now\(\)\); delete from public\.discord_link_tickets where expires_at<now\(\)-interval '1 day'\$c\$\);/);
 // Re-runnable and harmless: nothing dropped, nothing of a player removed, no function changed (so harvest_delete_account stays),
 // and no player text (i18n-extract reads raise exception texts only), so i18n/ignore.json needs nothing new.
 assert.doesNotMatch(sql.replace(/\$c\$[\s\S]*?\$c\$/g,''),/drop |truncate |delete from |create or replace function|harvest_delete_account\(|raise exception/i);
 assert.doesNotMatch(sql,/ · /);
 // The code reads and writes the columns the table has.
 const code=read('supabase/functions/discord-auth/discord.js'),columns=/create table[\s\S]*?\n\);/.exec(sql)[0];
 for(const column of /const TICKET_COLUMNS='([^']+)'/.exec(code)[1].split(','))assert.match(columns,new RegExp(`\\n ${column} `),column);
 assert.match(code,/const TICKETS='discord_link_tickets';/);
});

test('farm-api and diamond-checkout: a website farm played in Discord is still a website farm (no portal mark, no Discord rules)',()=>{
 assert.equal(portalOf(website(W)),null);assert.equal(portalOf(discordFarm(D)).id,'discord');
 // farm-api and diamond-checkout decide by the account's own mark, never by where the session came from.
 const farm=read('supabase/functions/farm-api/index.ts'),checkout=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(farm,/if\(user\.app_metadata\?\.portal==='discord'\)user\.app_metadata=\{\.\.\.user\.app_metadata,provider:'discord'\};/);
 assert.match(checkout,/if\(user\.app_metadata\?\.portal==='discord'\)return reply\(\{error:'Purchases are not available on Discord\.'\},403\);/);
 for(const source of [farm,checkout])assert.doesNotMatch(source,/discordsays|discord_accounts|discord_link_tickets/);
});
