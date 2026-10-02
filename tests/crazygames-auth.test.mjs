import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync} from 'node:fs';
import {generateKeyPairSync,createSign} from 'node:crypto';
import * as crazygames from '../supabase/functions/crazygames-auth/crazygames.js';
import {handleCrazyGamesAuth,verifyToken,createKeyStore,cleanUsername,clientIp,ipHash,guestLimit,accountEmail,TokenError,GUEST_LIMIT,MESSAGES,MAIL_DOMAIN,PUBLIC_KEY_URL,MAX_BODY} from '../supabase/functions/crazygames-auth/crazygames.js';
import {firstFreeName,isRandomPlayerName} from '../src/account-form.js';
import {portalOf,PORTAL_MAIL} from '../supabase/functions/farm-api/portal.js';
import {sendEmailCode,sendEmailChange,confirmEmailChange} from '../supabase/functions/farm-api/event-service.js';
import {handleAdminEmail} from '../supabase/functions/farm-api/admin-service.js';
import {cleanSource} from '../supabase/functions/farm-api/source-service.js';
import {runJob,PORTAL_MAIL as REMINDER_PORTAL_MAIL} from '../supabase/functions/notify-hourly/job.js';
import {PORTAL_MAIL as HOOK_PORTAL_MAIL} from '../supabase/functions/auth-email/mail.js';
import {provider} from '../src/admin-players.js';
import * as rules from '../game/farm-state.js';
import * as invites from '../supabase/functions/farm-api/invite-service.js';
import * as playerLog from '../supabase/functions/farm-api/player-log.js';
import {welcomeSummary} from '../supabase/functions/farm-api/welcome-service.js';
import {savePlayerAvatar} from '../supabase/functions/farm-api/avatar-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// CrazyGames Basic Launch (Oct 2026): guests by default, players logged in to CrazyGames signed in automatically, a guest's farm kept
// when it logs in. The server half: crazygames-auth, supabase/crazygames.sql and the guards in farm-api, notify-hourly and auth-email.
const NOW=Date.UTC(2026,9,2,12),SECOND=1000;
const pair=()=>{const {publicKey,privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});return {pem:publicKey.export({type:'spki',format:'pem'}),pkcs1:publicKey.export({type:'pkcs1',format:'pem'}),privateKey};};
const KEY=pair(),OTHER=pair();
const part=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
function cgToken(payload,{key=KEY.privateKey,alg='RS256'}={}){
 const signed=`${part({alg,typ:'JWT'})}.${part({userId:'cg-user-1',gameId:'harvest',username:'Cool.Gamer',profilePictureUrl:'https://images.crazygames.com/x.png',iat:NOW/1000-60,exp:NOW/1000+3600,...payload})}`;
 return `${signed}.${createSign('RSA-SHA256').update(signed).sign(key).toString('base64url')}`;
}
function store(pems,clock={now:NOW}){
 let fetched=0;
 const keys=createKeyStore({fetchKey:async()=>pems[Math.min(fetched++,pems.length-1)],now:()=>clock.now});
 return {keys,get fetched(){return fetched;}};
}

test('a CrazyGames token is checked with their public key: signed, not expired, for this game',async()=>{
 const {keys}=store([KEY.pem]);
 assert.deepEqual(await verifyToken(cgToken({}),{keys,now:NOW}),{userId:'cg-user-1',gameId:'harvest',username:'Cool.Gamer',exp:NOW/1000+3600});
 assert.equal((await verifyToken(cgToken({}),{keys,gameId:'harvest',now:NOW})).userId,'cg-user-1','the right game');
 const reason=async(token,options={})=>{try{await verifyToken(token,{keys,now:NOW,...options});return 'accepted';}catch(error){assert.ok(error instanceof TokenError);assert.equal(error.message,MESSAGES.token);return error.reason;}};
 assert.equal(await reason(cgToken({exp:NOW/1000-1})),'expired');
 assert.equal(await reason(cgToken({exp:NOW/1000})),'expired','expires at that very second');
 assert.equal(await reason(cgToken({exp:undefined})),'expired','no expiry is no token');
 assert.equal(await reason(cgToken({gameId:'another-game'}),{gameId:'harvest'}),'game','CRAZYGAMES_GAME_ID set: another game\'s token is refused');
 assert.equal(await reason(cgToken({gameId:'another-game'})),'accepted','not set yet (before the submission gives the id): any game');
 assert.equal(await reason(cgToken({},{key:OTHER.privateKey})),'signature','signed with another key');
 assert.equal(await reason(cgToken({},{alg:'HS256'})),'algorithm');assert.equal(await reason(cgToken({}).replace(/^[^.]+/,part({alg:'none'}))),'algorithm');
 const [h,p,s]=cgToken({}).split('.');assert.equal(await reason(`${h}.${part({userId:'someone-else',exp:NOW/1000+3600})}.${s}`),'signature','a changed payload');
 for(const bad of [undefined,'',42,'a.b','x'.repeat(30),`${h}.${p}`,`${h}.${p}.${s}.x`])assert.equal(await reason(bad),'format',String(bad));
 assert.equal(await reason(cgToken({userId:''})),'user');assert.equal(await reason(cgToken({userId:'x'.repeat(129)})),'user');
 assert.equal((await verifyToken(cgToken({userId:12345}),{keys,now:NOW})).userId,'12345');
 const pkcs1=store([KEY.pkcs1]);assert.equal((await verifyToken(cgToken({}),{keys:pkcs1.keys,now:NOW})).userId,'cg-user-1','an "RSA PUBLIC KEY" works too');
});

test('the public key is kept in memory and fetched once more when a token fails, at most once a minute',async()=>{
 const clock={now:NOW},rotated=store([OTHER.pem,KEY.pem],clock);
 const options={keys:rotated.keys,now:NOW};
 await assert.rejects(()=>verifyToken(cgToken({}),options),TokenError,'the old key was fetched a moment ago: no new fetch yet');
 assert.equal(rotated.fetched,1);
 clock.now+=61*SECOND;
 assert.equal((await verifyToken(cgToken({}),options)).userId,'cg-user-1','CrazyGames changed its key: fetched once more, then it works');
 assert.equal(rotated.fetched,2);
 for(let i=0;i<5;i++)await verifyToken(cgToken({}),options);
 assert.equal(rotated.fetched,2,'kept in memory');
 for(let i=0;i<5;i++)await assert.rejects(()=>verifyToken(cgToken({},{key:OTHER.privateKey}),options),TokenError);
 assert.equal(rotated.fetched,2,'bad tokens never make us fetch it over and over');
 const down=createKeyStore({fetchKey:async()=>{throw new Error('offline');}});
 await assert.rejects(()=>verifyToken(cgToken({}),{keys:down,now:NOW}),/offline/,'CrazyGames unreachable is a server problem (503), not a bad token');
 const index=read('supabase/functions/crazygames-auth/index.ts');
 assert.equal(PUBLIC_KEY_URL,'https://sdk.crazygames.com/publicKey.json');assert.match(index,/return \(await response\.json\(\)\)\?\.publicKey;/);
 assert.match(index,/fetch\(PUBLIC_KEY_URL,\{headers:\{Accept:'application\/json'\},signal:AbortSignal\.timeout\(5000\)\}\)/,'a slow CrazyGames never holds a start for long');
});

test('a CrazyGames username becomes a farmer name that fits the rule, the first free one',async()=>{
 for(const [cg,farmer] of [['Cool.Gamer','Cool Gamer'],['Cool.Gamer.123','Cool Gamer 123'],['José_Ñandú-99','Jose_Nandu-99'],['__x__yz','x__yz'],['a.b','a b'],
  ['Fröhlich.Bauer','Frohlich Bauer'],['ab','~'],['..ab','~'],['😀😀😀','~'],['', '~'],[null,'~'],['A'.repeat(25),'A'.repeat(20)],['ABCDEFGHIJKLMNOPQRS.T','ABCDEFGHIJKLMNOPQRS']]){
  const cleaned=cleanUsername(cg);assert.equal(cleaned,farmer==='~'?null:farmer,String(cg));
  if(cleaned)assert.match(cleaned,/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/,'farm-api\'s name rule');
 }
 const taken=new Set(['anna','anna 2','cool gamer']),free=async name=>!taken.has(name.toLowerCase());
 assert.equal(await firstFreeName('Anna',free),'Anna 3');assert.equal(await firstFreeName('Cool Gamer',free),'Cool Gamer 2');assert.equal(await firstFreeName('Bert',free),'Bert');
 taken.add('abcdefghijklmnopqrst');assert.equal(await firstFreeName('ABCDEFGHIJKLMNOPQRST',free),'ABCDEFGHIJKLMNOPQR 2','cut to fit 20 characters');
 // One rule for every new name: farm-api's new farm and crazygames-auth use the same firstFreeName (src/account-form.js, synced).
 assert.match(read('supabase/functions/farm-api/index.ts'),/const freeName=\(admin:any,name:string\)=>firstFreeName\(name,\(candidate:string\)=>nameFree\(admin,candidate\)\);/);
 assert.equal(read('supabase/functions/crazygames-auth/account-form.js'),read('src/account-form.js'));
 assert.match(read('scripts/sync-game.mjs'),/src\/account-form\.js.*crazygames-auth\/account-form\.js/);
});

// A database and Auth that keep what they are told, like Supabase's, for the account rules.
const GUEST='00000000-0000-4000-8000-0000000000a1',OTHER_GUEST='00000000-0000-4000-8000-0000000000a2',FARMER='00000000-0000-4000-8000-0000000000b1';
const guestUser=(id=GUEST)=>({id,email:`g-${id}@${MAIL_DOMAIN}`,app_metadata:{provider:'email',providers:['email'],portal:'crazygames',guest:true},user_metadata:{}});
const session=(id,{role='authenticated',session_id='s-'+id,app_metadata}={})=>`${part({alg:'HS256'})}.${part({sub:id,role,session_id,...(app_metadata?{app_metadata}:{})})}.sig`;
const headers=(values={})=>new Headers(values);
function fakeSupabase({users=[],accounts=[],stats=[],sessions=[],taken=[],slot=true,lostRace=false}={}){
 const db={users:new Map(users.map(u=>[u.id,structuredClone(u)])),accounts:structuredClone(accounts),stats:structuredClone(stats)};
 const log={created:[],updated:[],deleted:[],links:[],inserted:[],renamed:[],slots:[],getUser:0};
 let counter=0;
 const rowsOf=table=>table==='crazygames_accounts'?db.accounts:table==='player_stats'?db.stats:[];
 const admin={
  from(table){
   const filters=[];
   const api={select(){return api;},eq(key,value){filters.push([key,value]);return api;},
    async maybeSingle(){const found=rowsOf(table).filter(r=>filters.every(([k,v])=>r[k]===v));return {data:found[0]?structuredClone(found[0]):null,error:null};},
    async insert(row){
     assert.equal(table,'crazygames_accounts');
     if(lostRace&&!db.accounts.length){db.accounts.push({cg_user_id:row.cg_user_id,player_id:FARMER,linked_from_guest:false});}
     if(db.accounts.some(a=>a.cg_user_id===row.cg_user_id||a.player_id===row.player_id))return {error:{code:'23505',message:'duplicate key'}};
     db.accounts.push({...row});log.inserted.push({...row});return {error:null};
    },
    update(patch){return {async eq(key,value){
     assert.equal(table,'player_stats');
     if(patch.username&&db.stats.some(s=>s[key]!==value&&s.username.toLowerCase()===patch.username.toLowerCase()))return {error:{code:'23505'}};
     for(const s of db.stats)if(s[key]===value){Object.assign(s,patch);log.renamed.push([value,patch.username]);}return {error:null};
    }};}};
   return api;
  },
  async rpc(name,args){
   if(name==='username_available')return {data:!taken.includes(args.p_name.toLowerCase())&&!db.stats.some(s=>s.username.toLowerCase()===args.p_name.toLowerCase()),error:null};
   if(name==='harvest_session_active')return {data:sessions.includes(args.p_session),error:null};
   if(name==='crazygames_guest_slot'){log.slots.push(args);return {data:slot,error:null};}
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
    async updateUserById(id,attributes){
     const user=db.users.get(id);if(!user)return {data:{user:null},error:{message:'User not found'}};
     user.app_metadata={...user.app_metadata,...attributes.app_metadata};user.user_metadata={...user.user_metadata,...attributes.user_metadata};
     log.updated.push([id,structuredClone(attributes)]);return {data:{user:structuredClone(user)},error:null};
    },
    async getUserById(id){const user=db.users.get(id);return user?{data:{user:structuredClone(user)},error:null}:{data:{user:null},error:{message:'User not found'}};},
    async deleteUser(id){db.users.delete(id);log.deleted.push(id);return {error:null};},
    async generateLink({type,email}){assert.equal(type,'magiclink');log.links.push(email);return {data:{properties:{hashed_token:`hash:${email}`}},error:null};}
   }
  }
 };
 return {admin,db,log};
}
const keys=store([KEY.pem]).keys;
const run=(admin,body,values={},env={})=>handleCrazyGamesAuth({admin,body,headers:headers(values),keys,env,now:NOW});

test('a guest: a new account without email or name from the player, and a one-time sign-in for it',async()=>{
 const {admin,log,db}=fakeSupabase();
 const r=await run(admin,{op:'guest',language:'nl'},{'x-forwarded-for':'203.0.113.7, 10.0.0.1'},{ipSecret:'secret'});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data).sort(),['player_id','token_hash'],'the contract: {token_hash, player_id}');
 const [made]=log.created;
 assert.match(made.email,new RegExp(`^g-[0-9a-f-]{36}@players\\.harvesttycoon\\.com$`));assert.equal(made.email_confirm,true);
 assert.ok(made.password.length>=40,'a long random password that is never stored or shown');
 assert.deepEqual(made.app_metadata,{portal:'crazygames',guest:true});
 assert.deepEqual(made.user_metadata,{language:'nl',source:{src:'crazygames',ref:'crazygames.com'}},'how it found the game, for the dashboard');
 assert.equal(r.data.player_id,[...db.users.keys()][0]);assert.equal(r.data.token_hash,`hash:${made.email}`);
 const [slot]=log.slots;assert.equal(slot.p_ip,await ipHash('203.0.113.7','secret'));assert.doesNotMatch(slot.p_ip,/203/,'the address itself is never stored');
 assert.deepEqual([slot.p_max,slot.p_max_all],[GUEST_LIMIT.perIp,GUEST_LIMIT.all]);
 const odd=await run(admin,{op:'guest',language:'Dutch'});assert.deepEqual(log.created[1].user_metadata,{source:{src:'crazygames',ref:'crazygames.com'}},'a language that is not a code is left out');assert.equal(odd.status,200);
});

test('guests per network: over the limit is refused with 429 and makes nothing; the limits can be changed',async()=>{
 const {admin,log}=fakeSupabase({slot:false});
 const r=await run(admin,{op:'guest'},{'cf-connecting-ip':'198.51.100.1'},{guestLimit:{perIp:'50',all:'5000'}});
 assert.deepEqual(r,{status:429,data:{error:MESSAGES.busy}});assert.equal(log.created.length,0);assert.equal(log.links.length,0);
 assert.deepEqual([log.slots[0].p_max,log.slots[0].p_max_all],[50,5000]);
 assert.deepEqual(guestLimit({}),{perIp:30,all:3000});assert.deepEqual(guestLimit({perIp:'',all:'0'}),{perIp:30,all:3000});assert.deepEqual(guestLimit({perIp:'2.5',all:'-1'}),{perIp:30,all:3000});
 assert.equal(clientIp(headers({'cf-connecting-ip':'1.1.1.1','x-real-ip':'2.2.2.2','x-forwarded-for':'3.3.3.3'})),'1.1.1.1');
 assert.equal(clientIp(headers({'x-real-ip':'2.2.2.2','x-forwarded-for':'3.3.3.3'})),'2.2.2.2');assert.equal(clientIp(headers({'x-forwarded-for':' 3.3.3.3 , 4.4.4.4'})),'3.3.3.3');
 assert.equal(clientIp(headers({})),null);assert.equal(await ipHash(null,'s'),null,'no address: only the overall limit counts');
 assert.equal(await ipHash('1.1.1.1','a'),await ipHash('1.1.1.1','a'));assert.notEqual(await ipHash('1.1.1.1','a'),await ipHash('1.1.1.1','b'),'keyed: not a plain hash anyone can recompute');
 const sql=read('supabase/crazygames.sql');
 assert.match(sql,/perform pg_advisory_xact_lock\(hashtextextended\('crazygames-guest:'\|\|coalesce\(p_ip,''\),0\)\);/,'two at the same moment cannot both take the last place');
 assert.match(sql,/delete from public\.crazygames_guest_ips where created_at<now\(\)-interval '2 hours';/,'kept two hours at most');
 assert.match(sql,/where ip_hash=p_ip and created_at>now\(\)-interval '1 hour';\n  if n>=greatest\(coalesce\(p_max,0\),0\) then return false; end if;/);
 assert.match(sql,/where created_at>now\(\)-interval '1 hour';\n if n>=greatest\(coalesce\(p_max_all,0\),0\) then return false; end if;\n insert into public\.crazygames_guest_ips\(ip_hash\) values\(p_ip\);\n return true;/);
 assert.match(sql,/grant execute on function public\.crazygames_guest_slot\(text,integer,integer\) to service_role;/);
 // Also without new guests, nothing stays longer than the privacy policy says (at most two hours): every 15 minutes, older than an hour.
 assert.match(sql,/select cron\.unschedule\('harvest-crazygames-guest-ips'\) where exists\(select 1 from cron\.job where jobname='harvest-crazygames-guest-ips'\);\nselect cron\.schedule\('harvest-crazygames-guest-ips','\*\/15 \* \* \* \*',\$c\$delete from public\.crazygames_guest_ips where created_at<now\(\)-interval '1 hour'\$c\$\);/);
});

test('logged in to CrazyGames for the first time: a new account with the CrazyGames name, keyed on the CrazyGames userId',async()=>{
 const {admin,log,db}=fakeSupabase({taken:['cool gamer']});
 const r=await run(admin,{op:'crazygames',token:cgToken({}),language:'de'});
 assert.equal(r.status,200);assert.deepEqual(Object.keys(r.data).sort(),['linked','player_id','token_hash']);assert.equal(r.data.linked,false);
 const [made]=log.created;
 assert.equal(made.email,'cg-cg-user-1@players.harvesttycoon.com');assert.equal(made.email_confirm,true);
 assert.deepEqual(made.app_metadata,{portal:'crazygames',guest:false,crazygames_id:'cg-user-1'});
 assert.deepEqual(made.user_metadata,{username:'Cool Gamer 2',language:'de',source:{src:'crazygames',ref:'crazygames.com'}},'"Cool.Gamer", cleaned; "Cool Gamer" was taken');
 assert.deepEqual(db.accounts,[{cg_user_id:'cg-user-1',player_id:r.data.player_id,linked_from_guest:false}]);
 assert.equal(r.data.token_hash,`hash:${made.email}`);
 const nameless=fakeSupabase();await run(nameless.admin,{op:'crazygames',token:cgToken({userId:'u2',username:'..'})});
 assert.ok(isRandomPlayerName(nameless.log.created[0].user_metadata.username),'nothing usable left of the name: a friendly random one');
 assert.equal(await accountEmail('Ab_C-9'),'cg-ab_c-9@players.harvesttycoon.com');assert.match(await accountEmail('weird id/with+chars'),/^cg-[0-9a-f]{32}@players\.harvesttycoon\.com$/);
});

test('the next start: the same account, without a new sign-in when this session is it already',async()=>{
 const farmer={id:FARMER,email:'cg-cg-user-1@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:false,crazygames_id:'cg-user-1'},user_metadata:{username:'Cool Gamer'}};
 const {admin,log}=fakeSupabase({users:[farmer],accounts:[{cg_user_id:'cg-user-1',player_id:FARMER,linked_from_guest:false}],sessions:['s-'+FARMER]});
 const current=await run(admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(FARMER)}`});
 assert.deepEqual(current,{status:200,data:{ok:true,player_id:FARMER}},'the contract: {ok:true, player_id}');
 assert.equal(log.links.length,0);assert.equal(log.created.length,0);assert.equal(log.updated.length,0);
 const fresh=await run(admin,{op:'crazygames',token:cgToken({})});
 assert.deepEqual(fresh,{status:200,data:{token_hash:`hash:${farmer.email}`,player_id:FARMER,linked:false}},'another device: a sign-in for the same farm');
 const shared=fakeSupabase({users:[farmer,guestUser()],accounts:[{cg_user_id:'cg-user-1',player_id:FARMER,linked_from_guest:false}],sessions:['s-'+GUEST]});
 const switched=await run(shared.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.deepEqual(switched.data,{token_hash:`hash:${farmer.email}`,player_id:FARMER,linked:false},'a guest on this device while the player has a farm already: that farm opens');
 assert.equal(shared.db.users.get(GUEST).app_metadata.guest,true,'the guest farm is left as it was');assert.equal(shared.db.accounts.length,1);
});

test('a guest who logs in to CrazyGames keeps the farm: linked, no longer a guest, and the random name becomes the CrazyGames name',async()=>{
 const {admin,log,db}=fakeSupabase({users:[guestUser()],stats:[{player_id:GUEST,username:'Sunny Acres 4821'}],sessions:['s-'+GUEST]});
 const r=await run(admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.deepEqual(r,{status:200,data:{token_hash:`hash:g-${GUEST}@${MAIL_DOMAIN}`,player_id:GUEST,linked:true}},'a new session, so its token no longer says guest');
 assert.equal(log.created.length,0,'no second account');
 assert.deepEqual(db.accounts,[{cg_user_id:'cg-user-1',player_id:GUEST,linked_from_guest:true}]);
 assert.deepEqual(db.users.get(GUEST).app_metadata,{provider:'email',providers:['email'],portal:'crazygames',guest:false,crazygames_id:'cg-user-1'});
 assert.equal(db.stats[0].username,'Cool Gamer');assert.equal(db.users.get(GUEST).user_metadata.username,'Cool Gamer');
 const again=await run(admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.deepEqual(again.data,{ok:true,player_id:GUEST},'from then on, the same farm');
 const chosen=fakeSupabase({users:[guestUser()],stats:[{player_id:GUEST,username:'Farmer Jo'}],sessions:['s-'+GUEST]});
 await run(chosen.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.equal(chosen.db.stats[0].username,'Farmer Jo','a name the guest chose stays');assert.equal(chosen.log.renamed.length,0);
 assert.equal(chosen.db.users.get(GUEST).user_metadata.username,undefined);
 const noFarmYet=fakeSupabase({users:[guestUser()],sessions:['s-'+GUEST],taken:['cool gamer']});
 await run(noFarmYet.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.equal(noFarmYet.db.users.get(GUEST).user_metadata.username,'Cool Gamer 2','no farm yet: its first load takes this name');
});

test('only a signed-in CrazyGames guest is ever linked; anything else makes or opens the CrazyGames user\'s own farm',async()=>{
 const website={id:OTHER_GUEST,email:'farmer@example.com',app_metadata:{provider:'email'},user_metadata:{}};
 for(const [label,users,sessions,auth] of [
  ['the project\'s public key',[guestUser()],['s-'+GUEST],`Bearer ${session(GUEST,{role:'anon'})}`],
  ['a session that has ended',[guestUser()],[],`Bearer ${session(GUEST)}`],
  ['a website account',[website],['s-'+OTHER_GUEST],`Bearer ${session(OTHER_GUEST)}`],
  ['a guest of another account',[guestUser()],['s-'+GUEST],`Bearer ${session(OTHER_GUEST)}`],
  ['no session',[guestUser()],[],null]]){
  const {admin,log,db}=fakeSupabase({users,sessions});
  const r=await run(admin,{op:'crazygames',token:cgToken({})},auth?{Authorization:auth}:{});
  assert.equal(r.status,200,label);assert.equal(r.data.linked,false,label);assert.equal(log.created.length,1,label);
  assert.equal(db.accounts[0].linked_from_guest,false,label);for(const u of users)assert.deepEqual(db.users.get(u.id).app_metadata,u.app_metadata,`${label}: left as it was`);
 }
 const anon=fakeSupabase({users:[guestUser()]});await run(anon.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST,{role:'anon'})}`});
 assert.equal(anon.log.getUser,0,'the public key is not even looked up');
 const linkedElsewhere=fakeSupabase({users:[guestUser()],accounts:[{cg_user_id:'someone-else',player_id:GUEST,linked_from_guest:true}],sessions:['s-'+GUEST]});
 const r=await run(linkedElsewhere.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.equal(r.data.linked,false);assert.notEqual(r.data.player_id,GUEST,'a farm is linked to one CrazyGames user only');
});

test('two starts at the same moment, a taken address and a link that stopped halfway all end on one farm',async()=>{
 const farmer={id:FARMER,email:'cg-cg-user-1@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:false,crazygames_id:'cg-user-1'},user_metadata:{}};
 const race=fakeSupabase({users:[farmer],lostRace:true});
 const r=await run(race.admin,{op:'crazygames',token:cgToken({})});
 assert.equal(r.data.player_id,FARMER,'the other start made the farm: that one opens');assert.equal(race.log.deleted.length,1,'the extra account is removed again');
 assert.match(race.log.created[0].email,/^cg-cg-user-1-[0-9a-f]{6}@players\.harvesttycoon\.com$/,'the first address was taken');
 const squatted=fakeSupabase({users:[{id:OTHER_GUEST,email:'cg-cg-user-1@players.harvesttycoon.com',app_metadata:{provider:'email'},user_metadata:{}}]});
 const own=await run(squatted.admin,{op:'crazygames',token:cgToken({})});
 assert.notEqual(own.data.player_id,OTHER_GUEST,'an account someone else made with that address is never used');
 assert.match(squatted.log.created[0].email,/^cg-cg-user-1-[0-9a-f]{6}@players\.harvesttycoon\.com$/);
 const half=fakeSupabase({users:[guestUser()],accounts:[{cg_user_id:'cg-user-1',player_id:GUEST,linked_from_guest:true}],sessions:['s-'+GUEST]});
 const fixed=await run(half.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`});
 assert.deepEqual(fixed.data,{token_hash:`hash:g-${GUEST}@${MAIL_DOMAIN}`,player_id:GUEST,linked:true},'put right, and a new session that says so; linked, so the game forgets its guest sign-in');
 assert.equal(half.db.users.get(GUEST).app_metadata.guest,false);assert.equal(half.db.users.get(GUEST).app_metadata.crazygames_id,'cg-user-1');
 // The same guest twice at the same moment (the start and the login listener): the one that finds the farm linked already says linked too.
 const twice=fakeSupabase({users:[guestUser()],stats:[{player_id:GUEST,username:'Sunny Acres 4821'}],sessions:['s-'+GUEST]});
 const guestToken=session(GUEST,{app_metadata:{portal:'crazygames',guest:true}});
 const both=await Promise.all([1,2].map(()=>run(twice.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${guestToken}`})));
 assert.deepEqual(both.map(r=>[r.data.player_id,r.data.linked,typeof r.data.token_hash]),[[GUEST,true,'string'],[GUEST,true,'string']]);assert.equal(twice.log.created.length,0);assert.equal(twice.db.accounts.length,1);
 // Linked already, but this session's token was made while it was a guest (the chat would stay closed until it renews): a new one.
 assert.deepEqual((await run(twice.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${guestToken}`})).data,{token_hash:`hash:g-${GUEST}@${MAIL_DOMAIN}`,player_id:GUEST,linked:true});
 assert.deepEqual((await run(twice.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST,{app_metadata:{portal:'crazygames',guest:false}})}`})).data,{ok:true,player_id:GUEST},'its new session: nothing to do');
 const repaired=fakeSupabase({users:[{...guestUser(),app_metadata:{portal:'crazygames',guest:false,crazygames_id:'old'}}],accounts:[{cg_user_id:'cg-user-1',player_id:GUEST,linked_from_guest:true}],sessions:['s-'+GUEST]});
 assert.equal((await run(repaired.admin,{op:'crazygames',token:cgToken({})},{Authorization:`Bearer ${session(GUEST)}`})).data.linked,false,'no guest any more: nothing to forget');
});

test('a bad request or token is refused before anything is made; the endpoint is POST JSON only, CORS for everyone',async()=>{
 const {admin,log}=fakeSupabase();
 for(const token of [undefined,'nope',cgToken({exp:NOW/1000-5}),cgToken({},{key:OTHER.privateKey})]){
  assert.deepEqual(await run(admin,{op:'crazygames',token}),{status:401,data:{error:MESSAGES.token}});
 }
 assert.deepEqual(await run(admin,{op:'crazygames',token:cgToken({gameId:'x'})},{},{gameId:'harvest'}),{status:401,data:{error:MESSAGES.token}});
 assert.deepEqual(await run(admin,{op:'delete'}),{status:400,data:{error:MESSAGES.unknown}});
 for(const body of [null,[],'guest',7])assert.deepEqual(await run(admin,body),{status:400,data:{error:MESSAGES.request}});
 assert.equal(log.created.length+log.links.length+log.slots.length+log.getUser,0);
 const index=read('supabase/functions/crazygames-auth/index.ts');
 assert.match(index,/Deploy with --no-verify-jwt/);assert.match(index,/'Access-Control-Allow-Origin':'\*'/);
 assert.match(index,/if\(req\.method==='OPTIONS'\)return new Response\('ok',\{headers:cors\}\);\n if\(req\.method!=='POST'\)return reply\(\{error:'Use POST\.'\},405\);/);
 assert.equal(MAX_BODY,4096);assert.match(index,/if\(raw\.length>MAX_BODY\)return reply\(\{error:'Request is too large\.'\},413\);/);
 assert.match(index,/gameId:env\('CRAZYGAMES_GAME_ID'\)\.trim\(\)/);assert.match(index,/ipSecret:env\('CRAZYGAMES_IP_SECRET'\)\|\|env\('SUPABASE_SERVICE_ROLE_KEY'\)/);
 assert.match(index,/return reply\(\{error:'Your farm could not be reached\. Please try again\.',code:'SERVER_UNAVAILABLE'\},503\);/);
 assert.equal(read('supabase/functions/crazygames-auth/deno.json'),read('supabase/functions/farm-api/deno.json'));
});

test('the Edge Function itself: OPTIONS, POST JSON up to 4 KB, the settings from the environment, a 503 that names nothing',async()=>{
 const source=stripTypeScriptTypes(read('supabase/functions/crazygames-auth/index.ts').replace(/^import .*;\n/gm,''));
 const settings={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',CRAZYGAMES_GAME_ID:' harvest ',CRAZYGAMES_GUEST_LIMIT:'12'};
 const start=(admin,fetched=[])=>{let handler;vm.runInNewContext(source,{...crazygames,createClient:()=>admin,Deno:{env:{get:key=>settings[key]},serve:fn=>handler=fn},Response,JSON,String,Error,AbortSignal,console:{error(){}},
  fetch:async url=>{fetched.push(url);return new Response(JSON.stringify({publicKey:KEY.pem}));}});
  return (method,body,more={})=>handler(new Request('https://x.supabase.co/functions/v1/crazygames-auth',{method,headers:{'Content-Type':'application/json',...more},...(body===undefined?{}:{body})}));};
 const {admin,log}=fakeSupabase(),fetched=[],call=start(admin,fetched);
 const options=await call('OPTIONS');assert.equal(options.status,200);assert.equal(options.headers.get('access-control-allow-origin'),'*');assert.match(options.headers.get('access-control-allow-headers'),/authorization/);
 assert.equal((await call('GET')).status,405);
 assert.equal((await call('POST','{"op":"guest","pad":"'+'x'.repeat(MAX_BODY)+'"}')).status,413);
 assert.deepEqual(await (await call('POST','not json')).json(),{error:MESSAGES.request});
 const guest=await call('POST',JSON.stringify({op:'guest'}),{'x-real-ip':'192.0.2.4'});
 assert.equal(guest.status,200);assert.equal(guest.headers.get('content-type'),'application/json');assert.equal(guest.headers.get('cache-control'),'no-store');
 assert.deepEqual(Object.keys(await guest.json()).sort(),['player_id','token_hash']);assert.equal(log.slots[0].p_max,12);assert.equal(log.slots[0].p_ip,await ipHash('192.0.2.4','service'));
 const other=await call('POST',JSON.stringify({op:'crazygames',token:cgToken({gameId:'another'})}));assert.equal(other.status,401,'CRAZYGAMES_GAME_ID is used, trimmed');
 const mine=await call('POST',JSON.stringify({op:'crazygames',token:cgToken({gameId:'harvest'})}));assert.equal(mine.status,200);assert.deepEqual(fetched,[PUBLIC_KEY_URL],'the key is fetched once');
 const broken=start({...admin,rpc:async()=>({error:{code:'XX000',message:'database down'}})});
 assert.deepEqual(await (await broken('POST',JSON.stringify({op:'guest'}))).json(),{error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'});
});

// The patches in supabase/crazygames.sql: [function, marker, from, to].
const SQL=read('supabase/crazygames.sql');
function patches(){
 const found=[];
 for(const m of SQL.matchAll(/select pg_temp\.crazygames_patch\(('[^']*'|fn::regprocedure),(\$m\$[\s\S]*?\$m\$|'[^']*'),\s*\$a\$([\s\S]*?)\$a\$,\s*\$b\$([\s\S]*?)\$b\$\)(\s*from unnest\(array\[([^\]]+)\]\))?/g)){
  const fns=m[6]?[...m[6].matchAll(/'([^']+)'/g)].map(x=>x[1]):[m[1].replace(/'/g,'')];
  for(const fn of fns)found.push({fn,marker:m[2].replace(/^\$m\$|\$m\$$/g,'').replace(/^'|'$/g,''),from:m[3],to:m[4]});
 }
 return found;
}
test('crazygames.sql: the tables, service-role only, and every patch of a live function runs once and only where expected',()=>{
 assert.match(SQL,/create table if not exists public\.crazygames_accounts \(\n cg_user_id text primary key[^\n]*,\n player_id uuid not null unique references auth\.users\(id\) on delete cascade,\n linked_from_guest boolean not null default false,\n created_at timestamptz not null default now\(\)\n\);/);
 for(const table of ['crazygames_accounts','crazygames_guest_ips']){
  assert.match(SQL,new RegExp(`alter table public\\.${table} enable row level security;\\nrevoke all on public\\.${table} from anon, authenticated;`),table);
 }
 for(const fn of ['crazygames_guest_slot\\(text,integer,integer\\)','harvest_portal_guest\\(uuid\\)'])assert.match(SQL,new RegExp(`revoke all on function public\\.${fn} from public, anon, authenticated;`),fn);
 assert.match(SQL,/select coalesce\(\(select u\.raw_app_meta_data->>'guest'='true' and u\.raw_app_meta_data->>'portal'='crazygames' from auth\.users u where u\.id=p_player\),false\)/,'a guest by the account itself');
 assert.match(SQL,/if position\(p_marker in def\)>0 then return; end if;\n if position\(p_from in def\)=0 then raise exception/,'patched already: left alone; changed since: stops');
 const list=patches();
 assert.deepEqual([...new Set(list.map(p=>p.fn))].sort(),['public.admin_player_accounts(uuid,text)','public.chat_block(uuid,boolean)','public.chat_broadcast_targets(uuid,text,integer)','public.chat_can_read(text)',
  'public.chat_player_status(uuid)','public.chat_report(uuid,text)','public.chat_report_player(uuid,text)','public.chat_send(text,text)','public.chat_set_private(boolean)','public.harvest_email_checked(uuid)',
  'public.notification_candidates()','public.welcome_dm_run()']);
 for(const p of list){
  assert.ok(p.to.includes(p.marker),`${p.fn}: after the patch its marker is there, so running the file again changes nothing`);
  assert.ok(!p.from.includes(p.marker),`${p.fn}: the marker is not in the text it replaces`);
  // The line it looks for is in the repo's own copy of the function (the live one was read on 2 Oct 2026 and matched).
  const files=['chat.sql','chat-crew.sql','chat-broadcast-level.sql','welcome-dm-languages.sql','event-email-check.sql','comeback-chest.sql','admin-player-language.sql'].map(f=>read(`supabase/${f}`)).join('\n');
  assert.ok(files.includes(p.from),`${p.fn}: ${p.from.slice(0,60)}`);
 }
 const guarded=list.filter(p=>p.to.includes(`raise exception 'Log in with CrazyGames to chat.' using errcode='42501'`)).map(p=>p.fn).sort();
 assert.deepEqual(guarded,['public.chat_block(uuid,boolean)','public.chat_report(uuid,text)','public.chat_report_player(uuid,text)','public.chat_send(text,text)','public.chat_set_private(boolean)'],'a guest is told why');
 assert.ok(list.some(p=>p.fn==='public.chat_send(text,text)'&&p.to.includes(`if public.harvest_portal_guest(other) then raise exception 'This farmer does not receive private messages.'`)));
 assert.ok(list.some(p=>p.fn==='public.chat_can_read(text)'&&p.to.includes(`if coalesce((select auth.jwt()->'app_metadata'->>'guest'),'')='true' then return false; end if;`)),'a guest reads no chat');
 assert.ok(list.some(p=>p.fn==='public.chat_player_status(uuid)'&&p.to.includes('not public.harvest_portal_guest(me) and not public.harvest_portal_guest(p_player)')));
});

test('crazygames.sql: the email bonus for a CrazyGames login and never a guest; no reminders; the admin sees the account type',()=>{
 const list=patches(),of=fn=>list.filter(p=>p.fn===fn);
 // harvest_email_checked as in event-email-check.sql, with both patches applied the way the database will.
 let checked=/create or replace function public\.harvest_email_checked[\s\S]*?\$f\$([\s\S]*?)\$f\$;/.exec(read('supabase/event-email-check.sql'))[1];
 for(const p of of('public.harvest_email_checked(uuid)'))checked=checked.replace(p.from,p.to);
 assert.equal(checked.trim(),`select exists(select 1 from auth.users u where u.id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and (coalesce(u.raw_app_meta_data->>'provider','email')<>'email' or u.raw_app_meta_data->>'portal'='crazygames'))
  or exists(select 1 from public.email_checks c join auth.users u on u.id=c.player_id where c.player_id=p_player and coalesce(u.raw_app_meta_data->>'guest','')<>'true' and c.confirmed_at is not null and lower(c.email)=lower(u.email))`);
 const [candidates]=of('public.notification_candidates()');assert.match(candidates.to,/\n  and coalesce\(u\.raw_app_meta_data->>'portal',''\)<>'crazygames'$/);
 const [accounts]=of('public.admin_player_accounts(uuid,text)');
 assert.match(accounts.to,/then case when u\.raw_app_meta_data->>'guest'='true' then 'crazygames_guest' else 'crazygames' end\n   else coalesce\(u\.raw_app_meta_data->>'provider','email'\) end as provider$/);
 assert.equal(provider('crazygames'),'CrazyGames');assert.equal(provider('crazygames_guest'),'CrazyGames guest');assert.equal(provider('email'),'Email');assert.equal(provider('google'),'Google');
 const [welcome]=of('public.welcome_dm_run()');assert.match(welcome.to,/coalesce\(u\.raw_app_meta_data->>'guest',''\)<>'true'/);
 const [broadcast]=of('public.chat_broadcast_targets(uuid,text,integer)');assert.match(broadcast.to,/and not public\.harvest_portal_guest\(ps\.player_id\)$/);
});

// farm-api itself, run as in vip-endpoint.test.mjs: a CrazyGames account is no email sign-up.
const API=stripTypeScriptTypes(read('supabase/functions/farm-api/index.ts').replace(/^import .*;\n/gm,''));
function farmApi(user,{checked=false}={}){
 const state=rules.createFarm(NOW);let row={player_id:user.id,state,revision:3,receipts:[],updated_at:new Date().toISOString()},handler;
 const profile={player_id:user.id,username:'Cool Gamer',currency:state.coins,level:rules.levelOf(state),avatar_id:'default'};
 const admin={auth:{async getUser(){return {data:{user:structuredClone(user)}};},admin:{async updateUserById(){return {};}}},
  from(table){const api={select(){return api;},update(){return api;},eq(){return api;},gt(){return api;},or(){return api;},order(){return api;},limit(){return Promise.resolve({data:[]});},insert:async()=>({}),upsert:async()=>({}),
   async maybeSingle(){return {data:table==='player_farms'?structuredClone(row):table==='player_stats'?structuredClone(profile):null};}};return api;},
  async rpc(name,args){
   if(name==='harvest_session_active')return {data:true};
   if(name==='harvest_email_checked')return {data:checked};
   if(name==='harvest_commit_farm'){if(args.p_expected!==row.revision)return {data:false};row={...row,state:structuredClone(args.p_state),revision:row.revision+1};return {data:true};}
   return {data:null};
  }};
 vm.runInNewContext(API,{...rules,...invites,...playerLog,welcomeSummary,savePlayerAvatar,isSuperadmin:()=>false,isAdminAccount:()=>false,createClient:()=>admin,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,atob,crypto,console:{error(){}},Uint32Array,
  handleFamily:()=>{throw new Error('unexpected');},handlePlayerDirectory:()=>{throw new Error('unexpected');}});
 const token=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
 return {get row(){return row;},async send(body){const r=await handler(new Request('https://test.invalid/farm-api',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()};}};
}
test('farm-api: a CrazyGames account never sees the email popup or address change; a logged-in one gets the bonus quietly',async()=>{
 const cgUser={id:FARMER,email:'cg-cg-user-1@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:false,crazygames_id:'cg-user-1'},user_metadata:{username:'Cool Gamer'}};
 const quiet=farmApi(cgUser,{checked:true}),loaded=await quiet.send({operation:'load',source:{src:'crazygames',ref:'crazygames.com'}});
 assert.equal(loaded.status,200);assert.deepEqual(loaded.data.emailCheck,{needed:false,email:cgUser.email,canChange:false});
 assert.equal(loaded.data.gift?.message??null,null,'no "Thanks for confirming your email!"');assert.equal(quiet.row.state.diamonds,rules.createFarm(NOW).diamonds+rules.EMAIL_BONUS,'paid once, as for Google');
 const guest=farmApi({...guestUser(),user_metadata:{}});const g=await guest.send({operation:'load'});
 assert.deepEqual(g.data.emailCheck,{needed:false,email:`g-${GUEST}@${MAIL_DOMAIN}`,canChange:false});assert.equal(guest.row.state.emailBonus,undefined,'a guest: no bonus (harvest_email_checked says no)');
 // The website as before.
 const emailUser={id:OTHER_GUEST,email:'farmer@example.com',app_metadata:{provider:'email'},user_metadata:{username:'Anna'}};
 const site=farmApi(emailUser),s=await site.send({operation:'load'});
 assert.deepEqual(s.data.emailCheck,{needed:true,email:'farmer@example.com',canChange:true});
 const confirmed=farmApi(emailUser,{checked:true}),c=await confirmed.send({operation:'load'});assert.equal(c.data.gift.message,'Thanks for confirming your email!');
 assert.deepEqual(cleanSource({src:'crazygames',ref:'crazygames.com'}).src,'crazygames','the game\'s first load says where it came from; nothing refuses it');
 assert.equal(cleanSource({src:'crazygames',ref:'crazygames.com'}).referrer_host,'crazygames.com');
});

test('farm-api: no email code, no address change for a CrazyGames account; the admin cannot move its address either',async()=>{
 const cg={id:FARMER,email:'cg-x@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest:false}};
 const nothing={rpc:async()=>{throw new Error('no database call');},from:()=>{throw new Error('no database call');}},sent=[];
 for(const ask of [()=>sendEmailCode({admin:nothing,user:cg,mail:async to=>sent.push(to)}),()=>sendEmailCode({admin:nothing,user:{...cg,app_metadata:{portal:'crazygames',guest:true}},mail:async to=>sent.push(to)}),
  ()=>sendEmailChange({admin:nothing,user:cg,email:'me@example.com',password:'x',passwordOk:async()=>true,mail:async to=>sent.push(to)}),()=>confirmEmailChange({admin:nothing,user:cg,code:'123456'})])
  await assert.rejects(ask,/You play with CrazyGames, so your account has no email address\./);
 assert.equal(sent.length,0);
 const owner={id:'00000000-0000-4000-8000-0000000000aa',email:'floris@millstone.nl',email_confirmed_at:'2026-09-01T00:00:00Z',signInMethods:['oauth']},moved=[];
 const admin={auth:{admin:{async getUserById(){return {data:{user:cg},error:null};},async updateUserById(...a){moved.push(a);return {};}}},from(){throw new Error('no write');}};
 const r=await handleAdminEmail({admin,body:{playerId:FARMER,email:'real@example.com'},user:owner});
 assert.equal(r.status,400);assert.match(r.data.error,/plays on CrazyGames/);assert.equal(moved.length,0);
 assert.deepEqual(portalOf(cg),{id:'crazygames',name:'CrazyGames',guest:false});assert.equal(portalOf({app_metadata:{portal:'poki'}}),null);assert.equal(portalOf({app_metadata:{provider:'google'}}),null);
 assert.match(read('supabase/functions/farm-api/index.ts'),/if\(user\.app_metadata\?\.portal==='crazygames'\)user\.app_metadata=\{\.\.\.user\.app_metadata,provider:'crazygames'\};/);
});

test('no reminder and no auth email ever goes to a made-up CrazyGames address',async()=>{
 for(const pattern of [PORTAL_MAIL,REMINDER_PORTAL_MAIL,HOOK_PORTAL_MAIL]){
  assert.ok(pattern.test('cg-abc@players.harvesttycoon.com')&&pattern.test(`g-${GUEST}@PLAYERS.harvesttycoon.com`));
  assert.ok(!pattern.test('farmer@harvesttycoon.com')&&!pattern.test('players.harvesttycoon.com@example.com')&&!pattern.test('a@players.harvesttycoon.com.evil.io'));
 }
 const MORNING=Date.parse('2026-09-21T07:05:00Z'),pushed=[],mailed=[];
 const row=(id,email)=>({player_id:id,email,username:'X',push_crops:true,push_production:false,push_daily:false,email_digest:true,digest_hour:9,timezone:'Europe/Amsterdam',last_active_at:new Date(MORNING-3*3600000).toISOString(),
  crops_seen_at:MORNING-7200000,production_seen_at:MORNING-7200000,last_push_at:null,push_day:null,push_count:0,subscriptions:[{endpoint:`https://push.example/${id}`,p256dh:'k',auth:'a'}],
  farm:{plots:[{id:0,crop:'wheat',readyAt:MORNING-600000}],buildings:{},login:{lastDay:'2026-09-21',streak:2}}});
 const stats=await runJob({db:{beginRun:async()=>({run:true,emails_sent:0}),candidates:async()=>[row('cg','cg-1@players.harvesttycoon.com'),row('site','farmer@example.com')],saveState:async()=>{},markSuccess:async()=>{},markFailure:async()=>{},removeSubscription:async()=>{},addEmails:async()=>{}},
  sendPush:async sub=>{pushed.push(sub.endpoint);return {ok:true,status:201};},sendEmail:async r=>{mailed.push(r.player_id);return true;},emailConfirmed:async()=>true,names:{crops:{wheat:'Wheat'},buildings:{}}},MORNING);
 assert.deepEqual(pushed,['https://push.example/site']);assert.deepEqual(mailed,['site']);assert.equal(stats.players,1,'not even counted');
 const hook=read('supabase/functions/auth-email/index.ts');
 assert.ok(hook.indexOf("if(PORTAL_MAIL.test(String(user?.email??'').trim()))return reply({});")>hook.indexOf('.verify('),'only after the signature is checked');
 assert.ok(hook.indexOf('return reply({});')<hook.indexOf("fetch('https://api.resend.com/emails'"),'before anything is sent');
});

test('the privacy policy says what playing on CrazyGames stores',()=>{
 const policy=read('public/privacy.html');
 assert.match(policy,/<h3 id="crazygames">Playing on CrazyGames<\/h3>/);
 assert.match(policy,/we keep a scrambled form \(a keyed hash\) of your IP address for at most two hours, only to limit how many new guest farms one network can start/);
 assert.match(policy,/CrazyGames tells us your <strong>CrazyGames user ID<\/strong> and <strong>username<\/strong>: we link your farm to that user ID/);
 assert.match(policy,/If you log in to CrazyGames while playing as a guest, your guest farm is kept and linked to your CrazyGames account\./);
 assert.match(policy,/<li><strong>Playing on CrazyGames<\/strong>: the link between your CrazyGames user ID and your farm, for as long as your account exists; the scrambled IP address of a new guest farm, at most two hours\.<\/li>/);
});

test('diamond-checkout: a CrazyGames account never starts a Stripe checkout; a website farmer as before',async()=>{
 const payments=await import('../supabase/functions/diamond-checkout/payments.js');
 const source=stripTypeScriptTypes(read('supabase/functions/diamond-checkout/index.ts').replace(/^import .*;\n/gm,''));
 const send=async(user,body)=>{
  let handler;const stripe=[];
  const admin={auth:{async getUser(){return {data:{user:structuredClone(user)},error:null};}},async rpc(name){assert.equal(name,'harvest_session_active');return {data:true,error:null};},
   from(){throw new Error('no look-up for a pack checkout');}};
  vm.runInNewContext(source,{...payments,Stripe:class{constructor(){stripe.push('made');}},createClient:()=>admin,Deno:{env:{get:()=>''},serve:fn=>handler=fn},Response,JSON,Date,Object,Promise,Error,atob,console:{error(){}}});
  const token=`x.${Buffer.from(JSON.stringify({session_id:'s'})).toString('base64url')}.y`;
  const r=await handler(new Request('https://test.invalid/diamond-checkout',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:JSON.stringify(body)}));
  return {status:r.status,data:await r.json(),stripe};
 };
 const create={operation:'create',pack:Object.keys(payments.PAYMENT_PACKS)[0],requestId:crypto.randomUUID()};
 for(const guest of [false,true]){
  const r=await send({id:FARMER,email:'cg-x@players.harvesttycoon.com',app_metadata:{provider:'email',portal:'crazygames',guest}},create);
  assert.deepEqual([r.status,r.data],[403,{error:'Purchases are not available on CrazyGames.'}]);assert.deepEqual(r.stripe,[]);
 }
 const site=await send({id:OTHER_GUEST,email:'farmer@example.com',app_metadata:{provider:'email'}},create);
 assert.deepEqual([site.status,site.data],[503,{error:'Diamond purchases are not available yet.'}],'the website: past this check as before (no Stripe key in this test)');
});
