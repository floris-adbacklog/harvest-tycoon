// CrazyGames accounts (Oct 2026, Basic Launch): everything the crazygames-auth Edge Function (index.ts) decides, with every database
// and Auth call going through the `admin` client passed in, so tests can run all of it. Every CrazyGames player, guest or logged in to
// CrazyGames, plays on an ordinary Supabase account with a made-up address on players.harvesttycoon.com (no mailbox, never mailed),
// marked app_metadata.portal='crazygames' and, for a guest, app_metadata.guest=true (supabase/crazygames.sql). The game turns the
// token_hash it gets into its own session with supabase.auth.verifyOtp({token_hash,type:'magiclink'}), so sessions, refresh,
// row-level security and Realtime work as for any farmer, and farm-api needs nothing new.
//  {op:'guest'} → a new guest account: {token_hash, player_id}; at most so many per network an hour (429).
//  {op:'crazygames', token, language?} (+ the current session as Authorization: Bearer, if any) → CrazyGames' login token checked,
//   then: already this player's session {ok:true, player_id}; or a session for the farm of this CrazyGames user, made the first time,
//   when a guest farm is playing now that is linked to it and kept: {token_hash, player_id, linked}. A bad or old token: 401.
import {randomPlayerName,isRandomPlayerName,firstFreeName} from './account-form.js';

export const PORTAL='crazygames';
export const MAIL_DOMAIN='players.harvesttycoon.com';
export const PUBLIC_KEY_URL='https://sdk.crazygames.com/publicKey.json';
export const MAX_BODY=4096;
// New guest farms an hour: from one network (an IP address; a whole school class behind one address still gets in), and from all
// networks together, a ceiling against someone faking addresses. CRAZYGAMES_GUEST_LIMIT / CRAZYGAMES_GUEST_LIMIT_ALL change them.
export const GUEST_LIMIT=Object.freeze({perIp:30,all:3000});
// How a new CrazyGames farm found the game, for "Where new farmers come from" (farm-api source-service.js), in case the game's first
// load does not say so itself.
export const SOURCE=Object.freeze({src:'crazygames',ref:'crazygames.com'});
// The farmer-name rule (farm-api nameValid).
export const NAME_RULE=/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/;
export const MESSAGES=Object.freeze({
 token:'Your CrazyGames login could not be checked. Please reload the game.',
 busy:'Too many new farms from this network right now. Please try again later.',
 request:'Invalid request.',
 unknown:'Unknown request.'
});

const bytes=text=>{const s=String(text).replace(/-/g,'+').replace(/_/g,'/');const bin=atob(s+'='.repeat((4-s.length%4)%4));return Uint8Array.from(bin,c=>c.charCodeAt(0));};
const json=text=>JSON.parse(new TextDecoder().decode(bytes(text)));
const hex=list=>[...list].map(b=>b.toString(16).padStart(2,'0')).join('');
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const base64url=list=>btoa(String.fromCharCode(...list)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

export class TokenError extends Error{constructor(reason){super(MESSAGES.token);this.reason=reason;}}

// The three parts of a JWT, read but not trusted yet. Only RS256, as CrazyGames signs.
export function decodeToken(token){
 if(typeof token!=='string'||token.length<20||token.length>MAX_BODY)throw new TokenError('format');
 const parts=token.split('.');
 if(parts.length!==3||parts.some(part=>!/^[A-Za-z0-9_-]+$/.test(part)))throw new TokenError('format');
 let header,payload;try{header=json(parts[0]);payload=json(parts[1]);}catch{throw new TokenError('format');}
 if(header?.alg!=='RS256')throw new TokenError('algorithm');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new TokenError('format');
 return {header,payload,signed:new TextEncoder().encode(`${parts[0]}.${parts[1]}`),signature:bytes(parts[2])};
}

// DER length and a PKCS#1 key ("BEGIN RSA PUBLIC KEY") wrapped as the SPKI ("BEGIN PUBLIC KEY") the browser's crypto reads.
const derLength=n=>n<128?[n]:n<256?[0x81,n]:[0x82,n>>8,n&255];
const der=(tag,content)=>[tag,...derLength(content.length),...content];
const RSA_ALGORITHM=[0x30,0x0d,0x06,0x09,0x2a,0x86,0x48,0x86,0xf7,0x0d,0x01,0x01,0x01,0x05,0x00];
export async function importPublicKey(pem){
 const text=String(pem??''),body=text.replace(/-----(BEGIN|END) (RSA )?PUBLIC KEY-----/g,'').replace(/\s+/g,'');
 if(!body)throw Error('No CrazyGames public key.');
 let key=bytes(body);
 if(/BEGIN RSA PUBLIC KEY/.test(text))key=Uint8Array.from(der(0x30,[...RSA_ALGORITHM,...der(0x03,[0x00,...key])]));
 return crypto.subtle.importKey('spki',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
}

// CrazyGames' public key, kept in memory. After a token failed with it, it is fetched once more (CrazyGames may have changed it),
// at most once a minute, so bad tokens cannot make us fetch it over and over.
export function createKeyStore({fetchKey,now=()=>Date.now(),freshMs=60000}){
 let key=null,at=0,pending=null;
 const load=()=>pending??=Promise.resolve().then(fetchKey).then(importPublicKey).then(found=>{key=found;at=now();return found;}).finally(()=>{pending=null;});
 return {
  async get(){return key??load();},
  async refresh(){if(key&&now()-at<freshMs)return null;return load();}
 };
}

// CrazyGames' login token (SDK.user.getUserToken(), valid one hour): signed by CrazyGames, not expired, for this game when
// CRAZYGAMES_GAME_ID is set. Gives the CrazyGames user; throws TokenError otherwise.
export async function verifyToken(token,{keys,gameId='',now=Date.now()}){
 const t=decodeToken(token);
 const valid=key=>crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,t.signature,t.signed).catch(()=>false);
 let ok=await valid(await keys.get());
 if(!ok){const fresh=await keys.refresh();ok=Boolean(fresh)&&await valid(fresh);}
 if(!ok)throw new TokenError('signature');
 const p=t.payload;
 if(!Number.isFinite(p.exp)||p.exp*1000<=now)throw new TokenError('expired');
 if(gameId&&String(p.gameId??'')!==String(gameId))throw new TokenError('game');
 const userId=typeof p.userId==='string'?p.userId.trim():Number.isSafeInteger(p.userId)?String(p.userId):'';
 if(!userId||userId.length>128)throw new TokenError('user');
 return {userId,gameId:p.gameId==null?null:String(p.gameId),username:typeof p.username==='string'?p.username:'',exp:p.exp};
}

// A CrazyGames username (they hold up to 20 characters and may have '.') as a farmer name: '.' becomes a space, accents are dropped
// from their letters, anything else outside letters, numbers, spaces, '_' and '-' is left out, and it starts with a letter or number.
// null when fewer than 3 characters are left.
export function cleanUsername(name){
 const cleaned=String(name??'').normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/\./g,' ').replace(/[^A-Za-z0-9 _-]/g,'')
  .replace(/\s+/g,' ').replace(/^[^A-Za-z0-9]+/,'').slice(0,20).trim();
 return NAME_RULE.test(cleaned)?cleaned:null;
}
const nameFree=async(admin,name)=>{const {data,error}=await admin.rpc('username_available',{p_name:name});if(error)throw error;return data===true;};

// The network a guest comes from, as farm-api reads it (admin-analytics-service.js recordSeen), and a keyed hash of it: the
// address itself is never stored.
export function clientIp(headers){
 const get=key=>String(headers?.get?.(key)??'').trim();
 return (get('cf-connecting-ip')||get('x-real-ip')||get('x-forwarded-for').split(',')[0].trim()).slice(0,64)||null;
}
export async function ipHash(ip,secret){
 if(!ip)return null;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret||'crazygames')),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip)))).slice(0,32);
}
export function guestLimit({perIp,all}={}){
 const count=(value,fallback)=>{const n=Number(value);return value!==undefined&&value!==null&&value!==''&&Number.isInteger(n)&&n>0&&n<=100000?n:fallback;};
 return {perIp:count(perIp,GUEST_LIMIT.perIp),all:count(all,GUEST_LIMIT.all)};
}

const accountMetadata=userId=>({portal:PORTAL,guest:false,crazygames_id:userId});
const isGuest=user=>user?.app_metadata?.portal===PORTAL&&user.app_metadata.guest===true;
const isCurrent=(user,userId)=>user?.app_metadata?.portal===PORTAL&&user.app_metadata.guest===false&&user.app_metadata.crazygames_id===userId;
const language=value=>typeof value==='string'&&/^[a-z]{2}$/.test(value)?value:null;
const password=()=>base64url(randomBytes(32));   // never stored or shown: these accounts only sign in with a token_hash from here
const emailTaken=error=>error?.code==='email_exists'||/already (been )?registered|already exists/i.test(String(error?.message??''));
export const guestEmail=id=>`g-${id}@${MAIL_DOMAIN}`;
export async function accountEmail(userId,suffix=''){
 const local=/^[A-Za-z0-9_-]{1,64}$/.test(userId)?userId.toLowerCase():hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(userId)))).slice(0,32);
 return `cg-${local}${suffix?`-${suffix}`:''}@${MAIL_DOMAIN}`;
}
export function jwtClaims(token){
 try{const parts=String(token??'').split('.');if(parts.length!==3)return null;const claims=json(parts[1]);return claims&&typeof claims==='object'?claims:null;}catch{return null;}
}

// The account of the session that sent this request (the guest playing now), checked by Supabase itself and still signed in (the
// same check as farm-api, harvest_session_active). Anything else, such as the project's public key, counts as no session.
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
async function mappedPlayer(admin,userId){
 const found=await admin.from('crazygames_accounts').select('player_id').eq('cg_user_id',userId).maybeSingle();
 if(found.error)throw found.error;return found.data?.player_id??null;
}
// false when the CrazyGames user or the farm has its row already (two starts at the same moment, or a guest linked before).
async function addMapping(admin,row){
 const saved=await admin.from('crazygames_accounts').insert(row);
 if(!saved.error)return true;if(saved.error.code==='23505')return false;throw saved.error;
}

async function guest({admin,body,headers,env}){
 const limit=guestLimit(env.guestLimit);
 const slot=await admin.rpc('crazygames_guest_slot',{p_ip:await ipHash(clientIp(headers),env.ipSecret),p_max:limit.perIp,p_max_all:limit.all});
 if(slot.error)throw slot.error;
 if(slot.data!==true)return {status:429,data:{error:MESSAGES.busy}};
 const lang=language(body.language);
 const created=await admin.auth.admin.createUser({email:guestEmail(crypto.randomUUID()),password:password(),email_confirm:true,
  app_metadata:{portal:PORTAL,guest:true},user_metadata:{...(lang?{language:lang}:{}),source:{...SOURCE}}});
 if(created.error)throw created.error;
 const user=created.data.user;
 return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:user.id}};
}

// Linking: the guest's farm becomes this CrazyGames user's and is kept. A farmer name picked at random ("Sunny Acres 4821") becomes
// the CrazyGames name, or its first free "Name 2"; a name the guest chose stays. Gives the account as it is now.
async function linkGuest(admin,me,cg){
 let username=null;const cleaned=cleanUsername(cg.username);
 if(cleaned){
  const stats=await admin.from('player_stats').select('username').eq('player_id',me.id).maybeSingle();if(stats.error)throw stats.error;
  const current=stats.data?.username??null;
  if(!current||isRandomPlayerName(current)){
   username=await firstFreeName(cleaned,name=>nameFree(admin,name));
   if(current){const renamed=await admin.from('player_stats').update({username}).eq('player_id',me.id);if(renamed.error?.code==='23505')username=null;else if(renamed.error)throw renamed.error;}
  }
 }
 const saved=await admin.auth.admin.updateUserById(me.id,{app_metadata:accountMetadata(cg.userId),...(username?{user_metadata:{username}}:{})});
 if(saved.error)throw saved.error;
 return saved.data?.user??{...me,app_metadata:{...me.app_metadata,...accountMetadata(cg.userId)}};
}

// A new account for a CrazyGames user seen for the first time: the CrazyGames name as farmer name (cleaned, the first free one), or
// a friendly random one when nothing usable is left of it. null when another start made it at the same moment (this one is removed).
async function createAccount(admin,cg,lang){
 const username=await firstFreeName(cleanUsername(cg.username)??randomPlayerName(),name=>nameFree(admin,name));
 const attributes=email=>({email,password:password(),email_confirm:true,app_metadata:accountMetadata(cg.userId),
  user_metadata:{username,...(lang?{language:lang}:{}),source:{...SOURCE}}});
 let created=await admin.auth.admin.createUser(attributes(await accountEmail(cg.userId)));
 // The address is taken (someone typed it at sign-up on the website, or a start that stopped halfway): another made-up one.
 if(created.error&&emailTaken(created.error))created=await admin.auth.admin.createUser(attributes(await accountEmail(cg.userId,hex(randomBytes(3)))));
 if(created.error)throw created.error;
 const user=created.data.user;
 if(await addMapping(admin,{cg_user_id:cg.userId,player_id:user.id,linked_from_guest:false}))return user;
 await Promise.resolve(admin.auth.admin.deleteUser(user.id)).catch(()=>{});
 return null;
}

async function crazygames({admin,body,headers,keys,env,now}){
 let cg;
 try{cg=await verifyToken(body.token,{keys,gameId:env.gameId,now});}
 catch(error){if(error instanceof TokenError)return {status:401,data:{error:error.message}};throw error;}
 const me=await sessionUser(admin,headers);
 let playerId=await mappedPlayer(admin,cg.userId),user=null,linked=false;
 if(!playerId&&isGuest(me)){
  if(await addMapping(admin,{cg_user_id:cg.userId,player_id:me.id,linked_from_guest:true})){user=await linkGuest(admin,me,cg);playerId=me.id;linked=true;}
  else playerId=await mappedPlayer(admin,cg.userId);
 }
 if(!playerId){
  user=await createAccount(admin,cg,language(body.language));
  playerId=user?.id??await mappedPlayer(admin,cg.userId);
  if(!playerId)throw Error('The CrazyGames account could not be made.');
 }
 if(!user&&me?.id===playerId)user=me;
 if(!user){const found=await admin.auth.admin.getUserById(playerId);if(found.error||!found.data?.user)throw found.error??Error('A CrazyGames farm without its account.');user=found.data.user;}
 // An account whose marks did not get saved (a link that stopped halfway) is put right: it is this CrazyGames user's, no guest.
 if(!isCurrent(user,cg.userId)){
  const saved=await admin.auth.admin.updateUserById(playerId,{app_metadata:accountMetadata(cg.userId)});if(saved.error)throw saved.error;
 }else if(user===me&&!linked)return {status:200,data:{ok:true,player_id:playerId}};
 return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:playerId,linked}};
}

// The whole request after index.ts read it: body is the parsed JSON, headers the request's.
export async function handleCrazyGamesAuth({admin,body,headers,keys,env={},now=Date.now()}){
 if(!body||typeof body!=='object'||Array.isArray(body))return {status:400,data:{error:MESSAGES.request}};
 if(body.op==='guest')return guest({admin,body,headers,env});
 if(body.op==='crazygames')return crazygames({admin,body,headers,keys,env,now});
 return {status:400,data:{error:MESSAGES.unknown}};
}
