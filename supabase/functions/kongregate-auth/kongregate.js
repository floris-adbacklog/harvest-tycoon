// Kongregate accounts (Oct 2026): everything the kongregate-auth Edge Function (index.ts) decides, with every database and Auth call
// going through the `admin` client and every call to Kongregate through `fetchImpl` passed in, so tests can run all of it.
// Kongregate allows only its own log-in (no sign-up of ours, no email), so a player signed in to Kongregate plays on an ordinary
// Supabase account with a made-up address on players.harvesttycoon.com (no mailbox, never mailed), marked
// app_metadata.portal='kongregate' (supabase/kongregate.sql). The game turns the token_hash it gets into its own session with
// supabase.auth.verifyOtp({token_hash,type:'magiclink'}), so sessions, refresh, row-level security and Realtime work as for any farmer,
// and farm-api needs nothing new. There are no guest accounts: a Kongregate guest sees the game's Register page (src/kongregate.js).
//  {op:'kongregate', user_id, game_auth_token, language?} (+ the current session as Authorization: Bearer, if any) → the user id and
//   token checked by Kongregate's server (authenticate.json, with our secret API key), then: already this player's session
//   {ok:true, player_id}; or a session for the farm of this Kongregate user, made the first time: {token_hash, player_id}.
//   A bad token or a user id that is not the token's: 401. Kongregate unreachable: 503 (the game tries again by itself).
import {randomPlayerName,firstFreeName} from './account-form.js';

export const PORTAL='kongregate';
export const MAIL_DOMAIN='players.harvesttycoon.com';
// Kongregate's server API (docs.kongregate.com/reference/server-api-authenticate): only ever called from here, never from the game.
export const AUTH_URL='https://api.kongregate.com/api/authenticate.json';
export const MAX_BODY=4096;
// Checks with Kongregate an hour: from one network (a keyed hash of the IP address; a school class behind one address still gets
// in) and from all networks together, so nobody can make us call Kongregate over and over with made-up tokens.
// KONGREGATE_CHECK_LIMIT / KONGREGATE_CHECK_LIMIT_ALL change them.
export const CHECK_LIMIT=Object.freeze({perIp:60,all:20000});
// A token Kongregate said yes to is taken again for an hour without asking Kongregate (one round trip to the US less on most starts).
// Only a keyed hash of it is kept, next to the farm (kongregate_accounts.token_hash); a new token (Kongregate makes one when the
// password changes) is always checked.
export const TOKEN_FRESH_MS=3600000;
// How a new Kongregate farm found the game, for "Where new farmers come from" (farm-api source-service.js), in case the game's first
// load does not say so itself.
export const SOURCE=Object.freeze({src:'kongregate',ref:'kongregate.com'});
// The farmer-name rule (farm-api nameValid).
export const NAME_RULE=/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/;
export const MESSAGES=Object.freeze({
 token:'Your Kongregate sign-in could not be checked. Please reload the game.',
 busy:'Too many sign-ins from this network right now. Please try again later.',
 setup:'Signing in with Kongregate is not available yet. Please try again later.',
 unavailable:'Kongregate could not be reached. Please try again.',
 request:'Invalid request.',
 unknown:'Unknown request.'
});

const hex=list=>[...list].map(b=>b.toString(16).padStart(2,'0')).join('');
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const base64url=list=>btoa(String.fromCharCode(...list)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=text=>{const s=String(text).replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))));};
async function keyed(secret,text){
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret||'kongregate')),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(text))));
}

// Kongregate's user id: a whole number above 0, as their API gives it (int32), sent as a number or as digits. 0 is a guest, who gets
// no account (the game shows a guest the Register page and never asks).
export function kongId(value){
 const text=typeof value==='number'&&Number.isSafeInteger(value)?String(value):typeof value==='string'?value.trim():'';
 return /^[1-9]\d{0,9}$/.test(text)&&Number(text)<=2147483647?text:null;
}
// The game auth token as Kongregate hands it to the game: visible characters, no spaces. Never stored or logged.
export const kongToken=value=>typeof value==='string'&&/^[\x21-\x7e]{1,256}$/.test(value)?value:null;

// Kongregate said no: a wrong or old token, or a user id that is not the token's own (someone changed the id in the address).
export class KongregateRefused extends Error{constructor(reason){super(MESSAGES.token);this.reason=reason;}}
// Asks Kongregate whose token this is. The docs disagree in two places, so both ways are understood:
// - the request: the reference defines user_id, game_auth_token and api_key as query parameters (asked that way); its examples send
//   them as a JSON body instead, so an answer that says they are missing ("required parameters") is asked once more with a body;
// - the answer: a refusal comes as {success:false, error:403} with status 200, or as the status itself (403, 401, 400).
// Gives {userId, username} (Kongregate's, never the game's), throws KongregateRefused for a no and an error with transient=true when
// Kongregate cannot be reached or answers with something else (a server error, too many requests). At most 5 seconds a call.
export async function verifyKongregate({userId,token,apiKey,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const call=async(url,init)=>{
  let response;
  try{response=await fetchImpl(url,{...init,headers:{Accept:'application/json',...init.headers},signal:AbortSignal.timeout(timeoutMs)});}
  catch{throw Object.assign(new Error('Kongregate could not be reached.'),{transient:true});}
  let data=null;try{data=await response.json();}catch{}
  return {status:response.status,data:data&&typeof data==='object'&&!Array.isArray(data)?data:null};
 };
 const missing=answer=>answer.data?.success===false&&(Number(answer.data.error)||answer.status)===400&&/required/i.test(String(answer.data.error_description??''));
 let answer=await call(`${AUTH_URL}?${new URLSearchParams({user_id:userId,game_auth_token:token,api_key:apiKey})}`,{method:'GET'});
 if(missing(answer))answer=await call(AUTH_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:Number(userId),game_auth_token:token,api_key:apiKey})});
 const {status,data}=answer;
 if(status>=200&&status<300&&data?.success===true){
  if(String(data.user_id??'')!==userId)throw new KongregateRefused('user');
  return {userId,username:typeof data.username==='string'?data.username:''};
 }
 const code=data?.success===false?Number(data.error)||status:status;
 const refused=code>=400&&code<500&&code!==408&&code!==429;
 if(refused||(data?.success===false&&!(code>=500)))throw new KongregateRefused(missing(answer)?'request':code===403||code===401?'credentials':`status ${code}`);
 throw Object.assign(new Error(`Kongregate answered ${status}`),{transient:true});
}

// A Kongregate username (letters, numbers and "_", up to 16 characters) as a farmer name: anything outside the name rule is left out
// and it starts with a letter or number. null when fewer than 3 characters are left (then a friendly random name).
export function cleanUsername(name){
 const cleaned=String(name??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9 _-]/g,'').replace(/\s+/g,' ')
  .replace(/^[^A-Za-z0-9]+/,'').slice(0,20).trim();
 return NAME_RULE.test(cleaned)?cleaned:null;
}
const nameFree=async(admin,name)=>{const {data,error}=await admin.rpc('username_available',{p_name:name});if(error)throw error;return data===true;};

// The network a request comes from, as farm-api reads it, and a keyed hash of it: the address itself is never stored.
export function clientIp(headers){
 const get=key=>String(headers?.get?.(key)??'').trim();
 return (get('cf-connecting-ip')||get('x-real-ip')||get('x-forwarded-for').split(',')[0].trim()).slice(0,64)||null;
}
export async function ipHash(ip,secret){return ip?(await keyed(secret,`ip:${ip}`)).slice(0,32):null;}
// The keyed hash of a token Kongregate said yes to (kongregate_accounts.token_hash).
export const tokenHash=(token,secret)=>keyed(secret,`token:${token}`);
export function checkLimit({perIp,all}={}){
 const count=(value,fallback)=>{const n=Number(value);return value!==undefined&&value!==null&&value!==''&&Number.isInteger(n)&&n>0&&n<=1000000?n:fallback;};
 return {perIp:count(perIp,CHECK_LIMIT.perIp),all:count(all,CHECK_LIMIT.all)};
}

const accountMetadata=userId=>({portal:PORTAL,guest:false,kongregate_id:userId});
const isCurrent=(user,userId)=>user?.app_metadata?.portal===PORTAL&&user.app_metadata.guest===false&&user.app_metadata.kongregate_id===userId;
const language=value=>typeof value==='string'&&/^[a-z]{2}$/.test(value)?value:null;
const password=()=>base64url(randomBytes(32));   // never stored or shown: these accounts only sign in with a token_hash from here
const emailTaken=error=>error?.code==='email_exists'||/already (been )?registered|already exists/i.test(String(error?.message??''));
export const accountEmail=(userId,suffix='')=>`kg-${userId}${suffix?`-${suffix}`:''}@${MAIL_DOMAIN}`;
export function jwtClaims(token){
 try{const parts=String(token??'').split('.');if(parts.length!==3)return null;const claims=decode(parts[1]);return claims&&typeof claims==='object'?claims:null;}catch{return null;}
}

// The account of the session that sent this request, checked by Supabase itself and still signed in (the same check as farm-api,
// harvest_session_active). Anything else, such as the project's public key, counts as no session.
async function sessionUser(admin,headers){
 const token=/^Bearer\s+(\S+)$/i.exec(String(headers?.get?.('authorization')??''))?.[1],claims=token&&jwtClaims(token);
 if(!claims||claims.role!=='authenticated'||typeof claims.sub!=='string'||!claims.session_id)return null;
 const {data,error}=await admin.auth.getUser(token);const user=data?.user;
 if(error||!user||user.is_anonymous||user.id!==claims.sub)return null;
 const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});
 if(active.error)throw active.error;
 return active.data===true?user:null;
}
// A one-time sign-in for this account (no email is sent): the game makes its session from it.
async function signIn(admin,email){
 const {data,error}=await admin.auth.admin.generateLink({type:'magiclink',email});
 if(error)throw error;
 const hash=data?.properties?.hashed_token;if(!hash)throw Error('No sign-in link came back.');
 return hash;
}
async function mappedRow(admin,userId){
 const found=await admin.from('kongregate_accounts').select('player_id,token_hash,verified_at').eq('kong_user_id',userId).maybeSingle();
 if(found.error)throw found.error;return found.data??null;
}
// false when the Kongregate user or the farm has its row already (two starts at the same moment).
async function addMapping(admin,row){
 const saved=await admin.from('kongregate_accounts').insert(row);
 if(!saved.error)return true;if(saved.error.code==='23505')return false;throw saved.error;
}
async function saveCheck(admin,userId,check){
 const saved=await admin.from('kongregate_accounts').update(check).eq('kong_user_id',userId);
 if(saved.error)throw saved.error;
}

// A new account for a Kongregate user seen for the first time: the Kongregate name as farmer name (cleaned, the first free one), or
// a friendly random one when nothing usable is left of it. null when another start made it at the same moment (this one is removed).
async function createAccount(admin,kong,lang,check){
 const username=await firstFreeName(cleanUsername(kong.username)??randomPlayerName(),name=>nameFree(admin,name));
 const attributes=email=>({email,password:password(),email_confirm:true,app_metadata:accountMetadata(kong.userId),
  user_metadata:{username,...(lang?{language:lang}:{}),source:{...SOURCE}}});
 let created=await admin.auth.admin.createUser(attributes(accountEmail(kong.userId)));
 // The address is taken (someone typed it at sign-up on the website, or a start that stopped halfway): another made-up one.
 if(created.error&&emailTaken(created.error))created=await admin.auth.admin.createUser(attributes(accountEmail(kong.userId,hex(randomBytes(3)))));
 if(created.error)throw created.error;
 const user=created.data.user;
 if(await addMapping(admin,{kong_user_id:kong.userId,player_id:user.id,...check}))return user;
 await Promise.resolve(admin.auth.admin.deleteUser(user.id)).catch(()=>{});
 return null;
}

async function kongregate({admin,body,headers,env,now,fetchImpl}){
 const userId=kongId(body.user_id),token=kongToken(body.game_auth_token);
 if(!userId||!token)return {status:400,data:{error:MESSAGES.request}};
 // The session, the farm of this Kongregate user and the token's hash at once: one round trip less on every start.
 const [me,row,hash]=await Promise.all([sessionUser(admin,headers),mappedRow(admin,userId),tokenHash(token,env.secret)]);
 const at=Date.parse(row?.verified_at??''),fresh=Boolean(row)&&row.token_hash===hash&&Number.isFinite(at)&&now-at<TOKEN_FRESH_MS&&at-now<60000;
 let kong={userId,username:''},check=null;
 if(!fresh){
  // The API key is a secret of the server (Supabase secret KONGREGATE_API_KEY): without it nobody gets in, and nothing is asked.
  if(!env.apiKey)return {status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'}};
  const limit=checkLimit(env.checkLimit);
  const slot=await admin.rpc('kongregate_check_slot',{p_ip:await ipHash(clientIp(headers),env.secret),p_max:limit.perIp,p_max_all:limit.all});
  if(slot.error)throw slot.error;
  if(slot.data!==true)return {status:429,data:{error:MESSAGES.busy}};
  try{kong=await verifyKongregate({userId,token,apiKey:env.apiKey,fetchImpl});}
  catch(error){
   if(error instanceof KongregateRefused)return {status:401,data:{error:MESSAGES.token},refused:error.reason};
   if(error?.transient)return {status:503,data:{error:MESSAGES.unavailable,code:'KONGREGATE_UNAVAILABLE'}};
   throw error;
  }
  check={token_hash:hash,verified_at:new Date(now).toISOString()};
 }
 let playerId=row?.player_id??null,user=null,saved=false;
 if(!playerId){
  user=await createAccount(admin,kong,language(body.language),check??{});
  saved=Boolean(user);
  playerId=user?.id??(await mappedRow(admin,userId))?.player_id??null;
  if(!playerId)throw Error('The Kongregate account could not be made.');
 }
 // The check is remembered beside the rest (a failure there only means Kongregate is asked again next time).
 const remember=check&&!saved?saveCheck(admin,userId,check).catch(()=>{}):null;
 if(!user&&me?.id===playerId)user=me;
 if(!user){const found=await admin.auth.admin.getUserById(playerId);if(found.error||!found.data?.user)throw found.error??Error('A Kongregate farm without its account.');user=found.data.user;}
 // An account whose marks did not get saved is put right: it is this Kongregate user's.
 if(!isCurrent(user,userId)){const marked=await admin.auth.admin.updateUserById(playerId,{app_metadata:accountMetadata(userId)});if(marked.error)throw marked.error;}
 else if(user===me){await remember;return {status:200,data:{ok:true,player_id:playerId}};}
 const [signedIn]=await Promise.all([signIn(admin,user.email),remember]);
 return {status:200,data:{token_hash:signedIn,player_id:playerId}};
}

// The whole request after index.ts read it: body is the parsed JSON, headers the request's. env: {apiKey, secret, checkLimit}.
export async function handleKongregateAuth({admin,body,headers,env={},now=Date.now(),fetchImpl=globalThis.fetch}){
 if(!body||typeof body!=='object'||Array.isArray(body))return {status:400,data:{error:MESSAGES.request}};
 if(body.op==='kongregate')return kongregate({admin,body,headers,env,now,fetchImpl});
 return {status:400,data:{error:MESSAGES.unknown}};
}
