// Discord accounts (Oct 2026): everything the discord-auth Edge Function (index.ts) decides, with every database and Auth call going
// through the `admin` client and every call to Discord through `fetchImpl` passed in, so tests can run all of it.
// The game runs as a Discord Activity (public/discord.html, src/discord.js) with Discord's log-in only (no sign-up of ours, no email,
// no guests, no linking), so a Discord player plays on an ordinary Supabase account with a made-up address on players.harvesttycoon.com
// (no mailbox, never mailed), marked app_metadata.portal='discord' (supabase/discord.sql). As on Kongregate (kongregate-auth), the game
// turns the token_hash it gets into its own session with supabase.auth.verifyOtp({token_hash,type:'magiclink'}), so sessions, refresh,
// row-level security and Realtime work as for any farmer, and farm-api needs nothing new.
//  {op:'discord', code, language?} (+ the current session as Authorization: Bearer, if any) → the code the Activity got from Discord
//   (commands.authorize, scope identify) exchanged with our client secret for an access token, which reads the player's Discord user id
//   and locale (users/@me) and is then dropped: never kept, never sent back. Then: already this player's session
//   {ok:true, player_id, locale}; or a session for the farm of this Discord user, made the first time: {token_hash, player_id, locale}.
//   A code Discord refuses: 401. Discord asks us to wait: 429 with retry_after (seconds). Discord unreachable: 503 (the game tries again).
//   A code works once: the game asks Discord for a new one before it tries again.
import {randomPlayerName,firstFreeName} from './account-form.js';

export const PORTAL='discord';
export const MAIL_DOMAIN='players.harvesttycoon.com';
// Discord's OAuth2 API (docs: topics/oauth2, activities "Building Your First Activity"): only ever called from here, never from the game.
// No redirect_uri: an Activity's code comes from commands.authorize, and Discord's own Activity starter sends none either.
// Always with the version (v10): without one Discord answers as v6, whose 429 gives retry_after in milliseconds, not seconds.
export const TOKEN_URL='https://discord.com/api/v10/oauth2/token';
export const ME_URL='https://discord.com/api/v10/users/@me';
export const MAX_BODY=4096;
// How a new Discord farm found the game, for "Where new farmers come from" (farm-api source-service.js), in case the game's first load
// does not say so itself.
export const SOURCE=Object.freeze({src:'discord',ref:'discord.com'});
// Discord's answers that mean our own settings are wrong (DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET), not the player's code: a new code
// would be refused the same way, so the game waits instead of asking Discord again.
const SETUP_REFUSALS=['invalid_client','unauthorized_client'];
export const MESSAGES=Object.freeze({
 code:'Your Discord sign-in could not be checked. Please try again.',
 busy:'Discord is busy right now. Please try again in a moment.',
 setup:'Signing in with Discord is not available yet. Please try again later.',
 unavailable:'Discord could not be reached. Please try again.',
 request:'Invalid request.',
 unknown:'Unknown request.'
});

const hex=list=>[...list].map(b=>b.toString(16).padStart(2,'0')).join('');
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const base64url=list=>btoa(String.fromCharCode(...list)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=text=>{const s=String(text).replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))));};

// Discord's user id: a snowflake of 17 to 20 digits, always kept as text (it is too big for a JavaScript number, so a number is refused).
export const discordId=value=>typeof value==='string'&&/^\d{17,20}$/.test(value)?value:null;
// The code from commands.authorize as Discord hands it to the game: visible characters, no spaces. Never stored or logged.
export const discordCode=value=>typeof value==='string'&&/^[\x21-\x7e]{1,256}$/.test(value)?value:null;
// Discord's locale for the player ("nl", "en-US", "pt-BR", "es-419"), handed back so the game can open in it; null when it is not one.
export const discordLocale=value=>typeof value==='string'&&/^[a-z]{2,3}(-[A-Za-z0-9]{2,3})?$/.test(value)?value:null;
// How long Discord asks us to wait, in whole seconds: its body's retry_after, else the Retry-After header; a minute when it says
// neither (a Cloudflare block of a server address can last up to an hour, docs production-readiness), never more than an hour.
export function retryAfter(data,headers){
 const n=Number(data?.retry_after??headers?.get?.('retry-after'));
 return Number.isFinite(n)&&n>0?Math.min(Math.ceil(n),3600):60;
}

// Discord said no: a wrong, used or old code (invalid_grant), or our own settings (SETUP_REFUSALS).
export class DiscordRefused extends Error{constructor(reason){super(MESSAGES.code);this.reason=reason;}}
// Swaps the code for an access token and reads who it belongs to. Gives {userId, locale} (never the username, display name or avatar:
// Discord's Developer Terms do not let us show its data to other players). Throws DiscordRefused for a no, an error with retryAfter
// (seconds) when Discord rate-limits us, and one with transient=true when Discord cannot be reached or answers with something else.
// At most 5 seconds a call.
export async function verifyDiscord({code,clientId,clientSecret,fetchImpl=globalThis.fetch,timeoutMs=5000}){
 const call=async(url,init)=>{
  let response;
  try{response=await fetchImpl(url,{...init,headers:{Accept:'application/json',...init.headers},signal:AbortSignal.timeout(timeoutMs)});}
  catch{throw Object.assign(new Error('Discord could not be reached.'),{transient:true});}
  let data=null;try{data=await response.json();}catch{}
  data=data&&typeof data==='object'&&!Array.isArray(data)?data:null;
  if(response.status===429)throw Object.assign(new Error('Discord asks us to wait.'),{retryAfter:retryAfter(data,response.headers)});
  // Discord's own no comes as JSON; a 4xx page without it is Cloudflare in front of Discord, which passes like any outage.
  if(response.status>=400&&response.status<500&&response.status!==408&&data)
   throw new DiscordRefused(typeof data.error==='string'&&/^[a-z_]{1,40}$/.test(data.error)?data.error:`status ${response.status}`);
  if(response.status<200||response.status>=300)throw Object.assign(new Error(`Discord answered ${response.status}`),{transient:true});
  return data;
 };
 const token=await call(TOKEN_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
  body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',code}).toString()});
 const access=typeof token?.access_token==='string'?token.access_token:'';
 if(!access)throw Object.assign(new Error('Discord gave no access token.'),{transient:true});
 const me=await call(ME_URL,{method:'GET',headers:{Authorization:`Bearer ${access}`}});
 const userId=discordId(me?.id);
 if(!userId)throw new DiscordRefused('user');
 return {userId,locale:discordLocale(me.locale)};
}

const nameFree=async(admin,name)=>{const {data,error}=await admin.rpc('username_available',{p_name:name});if(error)throw error;return data===true;};
const accountMetadata=userId=>({portal:PORTAL,guest:false,discord_id:userId});
const isCurrent=(user,userId)=>user?.app_metadata?.portal===PORTAL&&user.app_metadata.guest===false&&user.app_metadata.discord_id===userId;
const language=value=>typeof value==='string'&&/^[a-z]{2}$/.test(value)?value:null;
const password=()=>base64url(randomBytes(32));   // never stored or shown: these accounts only sign in with a token_hash from here
const emailTaken=error=>error?.code==='email_exists'||/already (been )?registered|already exists/i.test(String(error?.message??''));
export const accountEmail=(userId,suffix='')=>`dc-${userId}${suffix?`-${suffix}`:''}@${MAIL_DOMAIN}`;
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
 const found=await admin.from('discord_accounts').select('player_id').eq('discord_user_id',userId).maybeSingle();
 if(found.error)throw found.error;return found.data??null;
}
// false when the Discord user or the farm has its row already (two starts at the same moment).
async function addMapping(admin,row){
 const saved=await admin.from('discord_accounts').insert(row);
 if(!saved.error)return true;if(saved.error.code==='23505')return false;throw saved.error;
}

// A new account for a Discord user seen for the first time, with a friendly random farmer name (the first free one; Settings invites
// the farmer to make it their own). null when another start made it at the same moment (this one is removed).
async function createAccount(admin,userId,lang){
 const username=await firstFreeName(randomPlayerName(),name=>nameFree(admin,name));
 const attributes=email=>({email,password:password(),email_confirm:true,app_metadata:accountMetadata(userId),
  user_metadata:{username,...(lang?{language:lang}:{}),source:{...SOURCE}}});
 let created=await admin.auth.admin.createUser(attributes(accountEmail(userId)));
 // The address is taken (someone typed it at sign-up on the website, or a start that stopped halfway): another made-up one.
 if(created.error&&emailTaken(created.error))created=await admin.auth.admin.createUser(attributes(accountEmail(userId,hex(randomBytes(3)))));
 if(created.error)throw created.error;
 const user=created.data.user;
 if(await addMapping(admin,{discord_user_id:userId,player_id:user.id}))return user;
 await Promise.resolve(admin.auth.admin.deleteUser(user.id)).catch(()=>{});
 return null;
}

const busy=seconds=>({status:429,data:{error:MESSAGES.busy,retry_after:seconds}});
async function discord({admin,body,headers,env,now,fetchImpl,pause}){
 const code=discordCode(body.code);
 if(!code)return {status:400,data:{error:MESSAGES.request}};
 // The client secret is a secret of the server (Supabase secret DISCORD_CLIENT_SECRET): without it nobody gets in, and nothing is asked.
 const clientId=discordId(env.clientId);
 if(!clientId||!env.clientSecret)return {status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'}};
 // Discord asked this server to wait: until then nobody's code goes to Discord (asking anyway only makes the wait longer).
 if(pause.until>now)return busy(Math.ceil((pause.until-now)/1000));
 // The session and Discord's answer at once: one round trip less on every start.
 let me,player;
 try{[me,player]=await Promise.all([sessionUser(admin,headers),verifyDiscord({code,clientId,clientSecret:env.clientSecret,fetchImpl})]);}
 catch(error){
  if(error instanceof DiscordRefused){
   if(SETUP_REFUSALS.includes(error.reason))return {status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'},refused:error.reason};
   return {status:401,data:{error:MESSAGES.code},refused:error.reason};
  }
  if(error?.retryAfter){pause.until=Math.max(pause.until,now+error.retryAfter*1000);return busy(error.retryAfter);}
  if(error?.transient)return {status:503,data:{error:MESSAGES.unavailable,code:'DISCORD_UNAVAILABLE'}};
  throw error;
 }
 const {userId,locale}=player;
 let playerId=(await mappedRow(admin,userId))?.player_id??null,user=null;
 if(!playerId){
  user=await createAccount(admin,userId,language(body.language));
  playerId=user?.id??(await mappedRow(admin,userId))?.player_id??null;
  if(!playerId)throw Error('The Discord account could not be made.');
 }
 if(!user&&me?.id===playerId)user=me;
 if(!user){const found=await admin.auth.admin.getUserById(playerId);if(found.error||!found.data?.user)throw found.error??Error('A Discord farm without its account.');user=found.data.user;}
 // An account whose marks did not get saved is put right: it is this Discord user's.
 if(!isCurrent(user,userId)){const marked=await admin.auth.admin.updateUserById(playerId,{app_metadata:accountMetadata(userId)});if(marked.error)throw marked.error;}
 else if(user===me)return {status:200,data:{ok:true,player_id:playerId,locale}};
 return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:playerId,locale}};
}

// Discord's last "wait", for every request this server handles (an Edge Function keeps its module between requests).
const PAUSE={until:0};
// The whole request after index.ts read it: body is the parsed JSON, headers the request's. env: {clientId, clientSecret}.
export async function handleDiscordAuth({admin,body,headers,env={},now=Date.now(),fetchImpl=globalThis.fetch,pause=PAUSE}){
 if(!body||typeof body!=='object'||Array.isArray(body))return {status:400,data:{error:MESSAGES.request}};
 if(body.op==='discord')return discord({admin,body,headers,env,now,fetchImpl,pause});
 return {status:400,data:{error:MESSAGES.unknown}};
}
