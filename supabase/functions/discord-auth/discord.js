// Discord accounts (Oct 2026): everything the discord-auth Edge Function (index.ts) decides, with every database and Auth call going
// through the `admin` client and every call to Discord through `fetchImpl` passed in, so tests can run all of it.
// The game runs as a Discord Activity (public/discord.html, src/discord.js) with Discord's log-in only (no sign-up of ours, no email,
// no guests), so a Discord player plays on an ordinary Supabase account with a made-up address on players.harvesttycoon.com (no
// mailbox, never mailed), marked app_metadata.portal='discord' (supabase/discord.sql): a Discord-only farm. As on Kongregate
// (kongregate-auth), the game turns the token_hash it gets into its own session with supabase.auth.verifyOtp({token_hash,
// type:'magiclink'}), so sessions, refresh, row-level security and Realtime work as for any farmer, and farm-api needs nothing new.
// Linking (10 Oct 2026, the owner's "doe 2"): a player can play their harvesttycoon.com farm in Discord instead. Discord's Developer
// Policy forbids asking for a password inside the Activity, so the player signs in on harvesttycoon.com (opened with the SDK's
// openExternalLink) and says yes there; a link ticket (supabase/discord-link.sql) carries that yes back to the Activity. A website farm
// played in Discord stays a website farm: its account is never changed here.
//  {op:'discord', code, language?} (+ the current session as Authorization: Bearer, if any) → the code the Activity got from Discord
//   (commands.authorize, scope identify) exchanged with our client secret for an access token, which reads the player's Discord user id,
//   locale and name (users/@me) and is then dropped: never kept, never sent back. A Discord user with a farm already: this session
//   {ok:true, player_id, locale}, or a way in {token_hash, player_id, locale}. One without: {choose:true, ticket, key, expires_in,
//   locale}, and the Activity asks "New farm" or "I already have a farm". The ticket goes into the website's address; the key stays in
//   the Activity (never in an address), and only ticket and key together make a farm or sign in (create, claim), so a ticket read from
//   an address, a log or the website's analytics opens nothing.
//   A code Discord refuses: 401. Discord asks us to wait: 429 with retry_after (seconds). Discord unreachable: 503 (the game tries again).
//   A code works once: the game asks Discord for a new one before it tries again.
//  {op:'create', ticket, key, language?} → "New farm": the Discord-only farm, made as before → {token_hash, player_id}.
//  {op:'relink', code} + the session of a Discord-only farm → {ticket, key, expires_in}: the farm is replaced by the website farm the
//   player confirms (Settings in the Activity warned them first). The code (commands.authorize again, prompt none) says which Discord
//   account asks, so the website always shows its username.
//  {op:'cancel', ticket, key} → {ok:true}: Cancel on the Activity's waiting card after Settings: a Link tapped on the website later
//   deletes nothing.
//  {op:'peek', ticket} + a harvesttycoon.com session → {display_name, relink, expires_in}: what the website's "Play this farm on
//   Discord?" shows (the Discord username; relink: the Discord user's farm made on Discord is deleted on Link). A farm Link would
//   refuse whatever Discord says (PORTAL_ACCOUNT, STAFF_ACCOUNT, EMAIL_UNCONFIRMED, ALREADY_LINKED) is refused here already, before
//   the trip to Discord. {op:'peek', state}: the same question back from Discord (op begin), in whatever tab Discord opened.
//  {op:'begin', ticket} + a harvesttycoon.com session → {state}: Link's trip to Discord starts here. The same checks as peek, then a new
//   random state (32 bytes, as a ticket) for Discord's address, which Discord hands back with its code (LINK_CALLBACK). Only its
//   SHA-256 is kept, on the ticket, with the website account that tapped Link: on a phone Discord's app often opens its answer in a
//   new tab or another browser, which knows nothing of the first, so code and state alone are enough, and only for that account. A new
//   begin replaces the ticket's older state; {op:'begin', state} (Link again, back from Discord) does so for the ticket of that state.
//  {op:'confirm', state, code} + a harvesttycoon.com session → {ok:true}: this Discord user plays that website farm from now on (a
//   relink's Discord-only farm is deleted here, after the Discord user's row names the website farm, never before). The state must be
//   this account's (403 LINK_OTHER_ACCOUNT otherwise, and nothing changes), at most 10 minutes old and its ticket open; only then is
//   Discord asked, and only a code of the ticket's Discord account links (403 DISCORD_MISMATCH otherwise, and nothing changes), so a
//   ticket's link sent to someone else (who then taps Link) gives nobody their farm. A state links once. No code: 400; a code Discord
//   refuses: 401; Discord's wait: 429; Discord away: 503 (as op discord).
//  {op:'claim', ticket, key} → the Activity asks every few seconds: {pending:true, expires_in} until the website said yes, then once
//   {token_hash, player_id} for the website farm.
//  {op:'status'} / {op:'unlink'} + a harvesttycoon.com session → {linked} / {ok:true}: Settings › Privacy on the website shows a farm
//   played on Discord and ends that link (Discord opens it no more, and its other devices are signed out, a game open in Discord too).
//  The link ops refuse with {error:CODE} (LINK_ERRORS): 401 SIGN_IN, 403 NOT_DISCORD_FARM / PORTAL_ACCOUNT / STAFF_ACCOUNT /
//  EMAIL_UNCONFIRMED / DISCORD_MISMATCH / LINK_OTHER_ACCOUNT, 409 ALREADY_LINKED / DISCORD_LINKED, 410 TICKET_GONE, 429
//  TOO_MANY_TICKETS (with retry_after).
//  Release (10 Oct 2026): supabase/discord-link.sql and LINK_CALLBACK under OAuth2, Redirects in Discord's Developer Portal, then the
//  site (the Activity page that knows a choice), then this function. The other way round a new Discord player meets the old page,
//  which cannot show the choice.
import {randomPlayerName,firstFreeName} from './account-form.js';

export const PORTAL='discord';
export const MAIL_DOMAIN='players.harvesttycoon.com';
// Discord's OAuth2 API (docs: topics/oauth2, activities "Building Your First Activity"): only ever called from here, never from the game.
// No redirect_uri for the Activity: its code comes from commands.authorize, and Discord's own Activity starter sends none either.
// Always with the version (v10): without one Discord answers as v6, whose 429 gives retry_after in milliseconds, not seconds.
export const TOKEN_URL='https://discord.com/api/v10/oauth2/token';
export const ME_URL='https://discord.com/api/v10/users/@me';
export const MAX_BODY=4096;
// Link on the website (op confirm): the farmer's browser went to Discord's own page (public/app-links.js discordAuthorizeUrl), which
// came back here with the code. Discord swaps that code only with exactly this address, which is also registered for the app in
// Discord's Developer Portal (OAuth2, Redirects).
export const LINK_CALLBACK='https://www.harvesttycoon.com/discord-link/callback';
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
// Why a link op says no, as a code: the game and the website show their own text for each (all 16 languages).
export const LINK_ERRORS=Object.freeze({
 signIn:'SIGN_IN',                  // 401: no session, or one that has ended
 notDiscord:'NOT_DISCORD_FARM',     // 403 relink: this session is not a Discord-only farm (or its code is another Discord user's)
 portal:'PORTAL_ACCOUNT',           // 403 peek, confirm, unlink: the website account is a CrazyGames, Kongregate or Discord account
 staff:'STAFF_ACCOUNT',             // 403 peek, confirm: a moderator's account (staff_roles) is never played through Discord
 email:'EMAIL_UNCONFIRMED',         // 403 peek, confirm (and a sign-in): the address is not confirmed, and no Google or Facebook either
 mismatch:'DISCORD_MISMATCH',       // 403 confirm: Discord says another Discord account than the ticket's tapped Link
 otherAccount:'LINK_OTHER_ACCOUNT', // 403 peek, begin, confirm by a state: another website account tapped this Link
 alreadyLinked:'ALREADY_LINKED',    // 409 peek, confirm: this website farm is played by another Discord account already
 discordLinked:'DISCORD_LINKED',    // 409 confirm: this Discord account plays another farm already (one it was not warned about)
 gone:'TICKET_GONE',                // 410: unknown, used or past its time (a ticket, or a Link's state)
 tooMany:'TOO_MANY_TICKETS'         // 429: this Discord user has MAX_OPEN_TICKETS open already
});
// A ticket works 10 minutes and once. A Discord user has at most 10 open at a time (each start of the Activity without a farm makes
// one). The Activity can still claim one the website confirmed in its last minute, for a minute.
export const TICKET_TTL=600;
export const MAX_OPEN_TICKETS=10;
// A Link's state (op begin) works 10 minutes, within its ticket's time, and links once.
export const STATE_TTL=600;
const CLAIM_GRACE=60;
const TICKETS='discord_link_tickets';
const DAY_MS=86400000;

const hex=list=>[...list].map(b=>b.toString(16).padStart(2,'0')).join('');
const randomBytes=n=>crypto.getRandomValues(new Uint8Array(n));
const base64url=list=>btoa(String.fromCharCode(...list)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const decode=text=>{const s=String(text).replace(/-/g,'+').replace(/_/g,'/');return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))));};
const iso=ms=>new Date(ms).toISOString();

// Discord's user id: a snowflake of 17 to 20 digits, always kept as text (it is too big for a JavaScript number, so a number is refused).
export const discordId=value=>typeof value==='string'&&/^\d{17,20}$/.test(value)?value:null;
// The code from commands.authorize as Discord hands it to the game: visible characters, no spaces. Never stored or logged.
export const discordCode=value=>typeof value==='string'&&/^[\x21-\x7e]{1,256}$/.test(value)?value:null;
// Discord's locale for the player ("nl", "en-US", "pt-BR", "es-419"), handed back so the game can open in it; null when it is not one.
export const discordLocale=value=>typeof value==='string'&&/^[a-z]{2,3}(-[A-Za-z0-9]{2,3})?$/.test(value)?value:null;
// A name from Discord, at most 32 characters as Discord allows, without control, invisible or direction characters (the joiner inside
// an emoji stays); null when there is none. The link ticket keeps the player's Discord username: unique on Discord, so nobody else can
// take it, unlike the display name anyone can set to anything ("Harvest Tycoon"). Only for the website's "Play this farm on Discord?",
// which shows it to the same player, and it goes with the ticket (Discord's Developer Terms: never shown to other players, never kept).
const HIDDEN=/[\p{Cc}\p{Cs}\p{Co}\p{Cn}؜​‎‏‪-‮⁠⁦-⁩﻿]/gu;
export const discordName=value=>{
 if(typeof value!=='string')return null;
 const name=Array.from(value.replace(HIDDEN,'').trim()).slice(0,32).join('').trim();
 return name||null;
};
// A link ticket as the game and the website hand it back: 32 random bytes as base64url. Only its SHA-256 is stored. Its key (the
// Activity's alone) has the same form.
export const linkTicket=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{43}$/.test(value)?value:null;
export async function ticketHash(ticket){return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ticket))));}
// How long Discord asks us to wait, in whole seconds: its body's retry_after, else the Retry-After header; a minute when it says
// neither (a Cloudflare block of a server address can last up to an hour, docs production-readiness), never more than an hour.
export function retryAfter(data,headers){
 const n=Number(data?.retry_after??headers?.get?.('retry-after'));
 return Number.isFinite(n)&&n>0?Math.min(Math.ceil(n),3600):60;
}

// Discord said no: a wrong, used or old code (invalid_grant), or our own settings (SETUP_REFUSALS).
export class DiscordRefused extends Error{constructor(reason){super(MESSAGES.code);this.reason=reason;}}
// Swaps the code for an access token and reads who it belongs to. Gives {userId, locale, displayName} (never the avatar or the display
// name; displayName is the username, only for a link ticket, see discordName). Throws DiscordRefused for a no, an error with retryAfter (seconds) when Discord rate-limits us,
// and one with transient=true when Discord cannot be reached or answers with something else. At most 5 seconds a call.
// redirectUri: only for a code from Discord's page (the website's Link, LINK_CALLBACK); the Activity's codes go without one.
export async function verifyDiscord({code,clientId,clientSecret,redirectUri=null,fetchImpl=globalThis.fetch,timeoutMs=5000}){
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
  body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,grant_type:'authorization_code',code,...(redirectUri?{redirect_uri:redirectUri}:{})}).toString()});
 const access=typeof token?.access_token==='string'?token.access_token:'';
 if(!access)throw Object.assign(new Error('Discord gave no access token.'),{transient:true});
 const me=await call(ME_URL,{method:'GET',headers:{Authorization:`Bearer ${access}`}});
 const userId=discordId(me?.id);
 if(!userId)throw new DiscordRefused('user');
 return {userId,locale:discordLocale(me.locale),displayName:discordName(me.username)};
}

const nameFree=async(admin,name)=>{const {data,error}=await admin.rpc('username_available',{p_name:name});if(error)throw error;return data===true;};
const accountMetadata=userId=>({portal:PORTAL,guest:false,discord_id:userId});
// A moderator (staff_roles, supabase/chat.sql) or one of the two admins (chat_staff_role names them by their confirmed address,
// supabase/admins.sql; asked by this service it says 'admin' whatever the session): staff go with every session of the account (the
// badge, cannot be muted), so never one made through Discord (10 Oct 2026, the owner's question about admin accounts).
async function staffAccount(admin,playerId){
 const [found,role]=await Promise.all([admin.from('staff_roles').select('player_id').eq('player_id',playerId).maybeSingle(),admin.rpc('chat_staff_role',{p_player:playerId})]);
 if(found.error)throw found.error;if(role.error)throw role.error;
 return Boolean(found.data)||role.data==='admin'||role.data==='moderator';
}
const isCurrent=(user,userId)=>user?.app_metadata?.portal===PORTAL&&user.app_metadata.guest===false&&user.app_metadata.discord_id===userId;
const language=value=>typeof value==='string'&&/^[a-z]{2}$/.test(value)?value:null;
const password=()=>base64url(randomBytes(32));   // never stored or shown: these accounts only sign in with a token_hash from here
const emailTaken=error=>error?.code==='email_exists'||/already (been )?registered|already exists/i.test(String(error?.message??''));
export const accountEmail=(userId,suffix='')=>`dc-${userId}${suffix?`-${suffix}`:''}@${MAIL_DOMAIN}`;
// A farm made here for a Discord user (createAccount): its made-up address names that Discord id. A Discord-only farm is one made here
// and marked so; only such a farm is ever deleted for a link, never any other account.
const DISCORD_MAIL=/^dc-(\d{17,20})(?:-[0-9a-f]{6})?@players\.harvesttycoon\.com$/i;
const madeFor=(user,userId)=>DISCORD_MAIL.exec(String(user?.email??''))?.[1]===userId;
const discordOnly=(user,userId)=>user?.app_metadata?.portal===PORTAL&&madeFor(user,userId);
// A CrazyGames, Kongregate or Discord account (marked, or with a made-up address): never linked to a Discord user.
const portalAccount=user=>Boolean(user?.app_metadata?.portal)||/@players\.harvesttycoon\.com$/i.test(String(user?.email??''));
// Google or Facebook said whose address it is.
const OAUTH=['google','facebook'];
const hasOAuth=user=>(Array.isArray(user?.identities)?user.identities:[]).some(i=>OAUTH.includes(i?.provider))||
 (Array.isArray(user?.app_metadata?.providers)?user.app_metadata.providers:[]).some(p=>OAUTH.includes(p));
export function jwtClaims(token){
 try{const parts=String(token??'').split('.');if(parts.length!==3)return null;const claims=decode(parts[1]);return claims&&typeof claims==='object'?claims:null;}catch{return null;}
}

// The account of the session that sent this request, checked by Supabase itself and still signed in (the same check as farm-api,
// harvest_session_active). Anything else, such as the project's public key, counts as no session.
const bearerToken=headers=>/^Bearer\s+(\S+)$/i.exec(String(headers?.get?.('authorization')??''))?.[1];
async function sessionUser(admin,headers){
 const token=bearerToken(headers),claims=token&&jwtClaims(token);
 if(!claims||claims.role!=='authenticated'||typeof claims.sub!=='string'||!claims.session_id)return null;
 const {data,error}=await admin.auth.getUser(token);const user=data?.user;
 if(error||!user||user.is_anonymous||user.id!==claims.sub)return null;
 const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});
 if(active.error)throw active.error;
 return active.data===true?user:null;
}
// A one-time sign-in for this account: generateLink only makes it (Supabase sends no email for it; the auth-email hook is not asked),
// and the game makes its session from it.
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
async function rowOfPlayer(admin,playerId){
 const found=await admin.from('discord_accounts').select('discord_user_id').eq('player_id',playerId).maybeSingle();
 if(found.error)throw found.error;return found.data??null;
}
// false when the Discord user or the farm has its row already (two starts at the same moment).
async function addMapping(admin,row){
 const saved=await admin.from('discord_accounts').insert(row);
 if(!saved.error)return true;if(saved.error.code==='23505')return false;throw saved.error;
}

// A new account for a Discord user who chose a new farm, with a friendly random farmer name (the first free one; Settings invites the
// farmer to make it their own). null when another start made it at the same moment (this one is removed).
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

const refuse=(status,error)=>({status,data:{error}});
const GONE=refuse(410,LINK_ERRORS.gone),SIGN_IN=refuse(401,LINK_ERRORS.signIn);
const TOO_MANY={status:429,data:{error:LINK_ERRORS.tooMany,retry_after:60}};
// Signs this Discord user in to the farm their row names (`me` when this session is that farm already). A Discord-only farm whose
// marks did not get saved is put right. A harvesttycoon.com farm (linked on the website) is never changed, and only signed in while
// its address is confirmed: a sign-in link would confirm it on the way.
async function openFarm(admin,userId,playerId,me=null){
 let user=me?.id===playerId?me:null;
 if(!user){const found=await admin.auth.admin.getUserById(playerId);if(found.error||!found.data?.user)throw found.error??Error('A Discord farm without its account.');user=found.data.user;}
 if(madeFor(user,userId)){
  if(!isCurrent(user,userId)){
   const marked=await admin.auth.admin.updateUserById(playerId,{app_metadata:accountMetadata(userId)});if(marked.error)throw marked.error;
   return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:playerId}};
  }
 }else if(!user.email||!user.email_confirmed_at)return refuse(403,LINK_ERRORS.email);
 if(user===me)return {status:200,data:{ok:true,player_id:playerId}};
 return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:playerId}};
}

// ---- Link tickets (supabase/discord-link.sql) ----
const TICKET_COLUMNS='ticket_hash,discord_user_id,display_name,key_hash,relink_from,linked_player,expires_at,used_at,state_hash,state_player,state_at';
async function readTicket(admin,ticket){
 const hash=await ticketHash(ticket);
 const found=await admin.from(TICKETS).select(TICKET_COLUMNS).eq('ticket_hash',hash).maybeSingle();
 if(found.error)throw found.error;
 return {hash,row:found.data??null};
}
// The ticket a website request names: by the ticket itself (Discord's link), or by the state of a Link begun on the website (op
// begin), all that a farmer back from Discord has. {hash, row, stateHash} (stateHash: only by a state), or null when it names none.
async function namedTicket(admin,body){
 const ticket=linkTicket(body.ticket),state=ticket?null:linkTicket(body.state);
 if(ticket)return {...await readTicket(admin,ticket),stateHash:null};
 if(!state)return null;
 const stateHash=await ticketHash(state);
 const found=await admin.from(TICKETS).select(TICKET_COLUMNS).eq('state_hash',stateHash).maybeSingle();
 if(found.error)throw found.error;
 return {hash:found.data?.ticket_hash??null,row:found.data??null,stateHash};
}
// Whether this website account may go on with the ticket a request names (peek, begin, and confirm before Discord is asked): an open
// ticket, and by a state only for the account that tapped that Link, while the state is at most STATE_TTL old. null, or the refusal.
function ticketRefusal(found,me,now){
 if(!found?.row)return GONE;
 if(found.stateHash){
  if(found.row.state_player!==me.id)return refuse(403,LINK_ERRORS.otherAccount);
  if(!(Date.parse(found.row.state_at)>now-STATE_TTL*1000))return GONE;
 }
 return ticketState(found.row,now)==='open'?null:GONE;
}
// What a ticket is now: 'gone' (unknown, used or past its time), 'linked' (the website said yes, not claimed yet) or 'open'.
const ticketState=(row,now)=>!row||row.used_at||!(Date.parse(row.expires_at)>now)?'gone':row.linked_player?'linked':'open';
const secondsLeft=(row,now)=>Math.max(0,Math.floor((Date.parse(row.expires_at)-now)/1000));
// The Activity's key for this ticket: create, claim and cancel need it as well as the ticket.
const keyFits=async(row,key)=>Boolean(row?.key_hash)&&Boolean(linkTicket(key))&&row.key_hash===await ticketHash(key);
// Changes a ticket only while it is as `where` says (null: not set), so of two requests at the same moment only one gets it.
async function updateTicket(admin,hash,changes,where,openAt=null){
 let query=admin.from(TICKETS).update(changes).eq('ticket_hash',hash);
 for(const [key,value] of Object.entries(where))query=value===null?query.is(key,null):query.eq(key,value);
 if(openAt!==null)query=query.gt('expires_at',iso(openAt));
 const done=await query.select('ticket_hash');
 if(done.error)throw done.error;
 return (done.data?.length??0)>0;
}
// A ticket taken by a request that then failed is given back, so the game's next try can use it.
const release=(admin,hash,usedAt)=>Promise.resolve(admin.from(TICKETS).update({used_at:null}).eq('ticket_hash',hash).eq('used_at',usedAt)).catch(()=>{});
// A new ticket and its key for this Discord user (relinkFrom: the Discord-only farm it replaces). Tickets a day past their time go
// first (the job in discord-link.sql does the same every 15 minutes). null when this Discord user has MAX_OPEN_TICKETS open already.
async function newTicket(admin,{userId,displayName=null,relinkFrom=null,now}){
 const [,open]=await Promise.all([
  Promise.resolve(admin.from(TICKETS).delete().lt('expires_at',iso(now-DAY_MS))).catch(()=>null),
  admin.from(TICKETS).select('ticket_hash',{count:'exact',head:true}).eq('discord_user_id',userId).gt('expires_at',iso(now))
 ]);
 if(open.error)throw open.error;
 if((open.count??0)>=MAX_OPEN_TICKETS)return null;
 const ticket=base64url(randomBytes(32)),key=base64url(randomBytes(32));
 const saved=await admin.from(TICKETS).insert({ticket_hash:await ticketHash(ticket),discord_user_id:userId,display_name:displayName,
  key_hash:await ticketHash(key),relink_from:relinkFrom,expires_at:iso(now+TICKET_TTL*1000)});
 if(saved.error)throw saved.error;
 return {ticket,key};
}
// The Discord-only farm a relink replaces, once the Discord user's row names the website farm: deleted with everything of it, as
// Settings' Delete account does (harvest_delete_account, with its own farmer name). Only while it is still a Discord-only farm of this
// Discord user and no row names it. false when it could not be deleted: it stays, unreachable, and index.ts logs its id.
async function dropOld(admin,userId,playerId){
 try{
  const found=await admin.auth.admin.getUserById(playerId);
  if(found.error)return found.error.status===404||found.error.code==='user_not_found';
  if(!discordOnly(found.data?.user,userId)||await rowOfPlayer(admin,playerId))return true;
  const stats=await admin.from('player_stats').select('username').eq('player_id',playerId).maybeSingle();
  if(stats.error)throw stats.error;
  const deleted=await admin.rpc('harvest_delete_account',{p_player:playerId,p_name:stats.data?.username??''});
  if(deleted.error)throw deleted.error;
  return true;
 }catch{return false;}
}
// The end of a confirm or a claim: the relinked Discord-only farm goes (when it is still there).
async function finish(admin,row,playerId,result){
 if(!row.relink_from||row.relink_from===playerId)return result;
 return await dropOld(admin,row.discord_user_id,row.relink_from)?result:{...result,leftover:row.relink_from};
}
// Points the Discord user's row at the website farm: a new row, the same row already, or a relink's row moved from the Discord-only
// farm the player chose to replace (only while it still names that farm). Anything else is refused: the Discord user plays another
// farm already. The row moves before anything is deleted, so a failure halfway never leaves the Discord user without a farm.
async function pointRow(admin,row,playerId){
 const userId=row.discord_user_id;
 for(let attempt=0;attempt<2;attempt++){
  const current=(await mappedRow(admin,userId))?.player_id??null;
  if(current===playerId)return null;
  if(!current){
   const saved=await admin.from('discord_accounts').insert({discord_user_id:userId,player_id:playerId});
   if(!saved.error)return null;
   if(saved.error.code!=='23505')throw saved.error;
   const own=await rowOfPlayer(admin,playerId);
   if(own&&own.discord_user_id!==userId)return LINK_ERRORS.alreadyLinked;
   continue;
  }
  if(current!==row.relink_from)return LINK_ERRORS.discordLinked;
  const old=await admin.auth.admin.getUserById(current);
  if(old.error)throw old.error;
  if(!discordOnly(old.data?.user,userId))return LINK_ERRORS.discordLinked;
  const moved=await admin.from('discord_accounts').update({player_id:playerId}).eq('discord_user_id',userId).eq('player_id',current).select('player_id');
  if(moved.error){if(moved.error.code==='23505')return LINK_ERRORS.alreadyLinked;throw moved.error;}
  if(moved.data?.length)return null;
 }
 return LINK_ERRORS.discordLinked;
}

const busy=seconds=>({status:429,data:{error:MESSAGES.busy,retry_after:seconds}});
// Discord's answer for a code, with the session of the request asked at the same moment (one round trip less on every start; none
// without headers): {me, player}, or {reply} when the answer stops here (our settings missing, Discord's wait, its no, or Discord down).
async function askDiscord({admin,code,headers=null,env,now,fetchImpl,pause,redirectUri=null}){
 // The client secret is a secret of the server (Supabase secret DISCORD_CLIENT_SECRET): without it nobody gets in, and nothing is asked.
 const clientId=discordId(env.clientId);
 if(!clientId||!env.clientSecret)return {reply:{status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'}}};
 // Discord asked this server to wait: until then nobody's code goes to Discord (asking anyway only makes the wait longer).
 if(pause.until>now)return {reply:busy(Math.ceil((pause.until-now)/1000))};
 try{const [me,player]=await Promise.all([headers?sessionUser(admin,headers):null,verifyDiscord({code,clientId,clientSecret:env.clientSecret,redirectUri,fetchImpl})]);return {me,player};}
 catch(error){
  if(error instanceof DiscordRefused){
   if(SETUP_REFUSALS.includes(error.reason))return {reply:{status:503,data:{error:MESSAGES.setup,code:'NOT_CONFIGURED'},refused:error.reason}};
   return {reply:{status:401,data:{error:MESSAGES.code},refused:error.reason}};
  }
  if(error?.retryAfter){pause.until=Math.max(pause.until,now+error.retryAfter*1000);return {reply:busy(error.retryAfter)};}
  if(error?.transient)return {reply:{status:503,data:{error:MESSAGES.unavailable,code:'DISCORD_UNAVAILABLE'}}};
  throw error;
 }
}

async function discord({admin,body,headers,env,now,fetchImpl,pause}){
 const code=discordCode(body.code);
 if(!code)return {status:400,data:{error:MESSAGES.request}};
 const asked=await askDiscord({admin,code,headers,env,now,fetchImpl,pause});
 if(asked.reply)return asked.reply;
 const {me,player:{userId,locale,displayName}}=asked;
 const row=await mappedRow(admin,userId);
 if(row){const opened=await openFarm(admin,userId,row.player_id,me);return opened.status===200?{...opened,data:{...opened.data,locale}}:opened;}
 // No farm yet: the player chooses (the Activity's "New farm" or "I already have a farm").
 const made=await newTicket(admin,{userId,displayName,now});
 if(!made)return TOO_MANY;
 return {status:200,data:{choose:true,...made,expires_in:TICKET_TTL,locale}};
}

// "New farm": the Discord-only farm, made as before, for the Discord user of the ticket. A farm made or linked for them in the meantime
// (another start, or the website) opens instead.
async function create({admin,body,now}){
 const ticket=linkTicket(body.ticket);if(!ticket)return GONE;
 const {hash,row}=await readTicket(admin,ticket);
 if(ticketState(row,now)!=='open'||row.relink_from||!await keyFits(row,body.key))return GONE;
 const usedAt=iso(now);
 if(!await updateTicket(admin,hash,{used_at:usedAt},{used_at:null,linked_player:null,relink_from:null},now))return GONE;
 const userId=row.discord_user_id;
 try{
  const mapped=(await mappedRow(admin,userId))?.player_id;
  if(mapped)return await openFarm(admin,userId,mapped);
  const user=await createAccount(admin,userId,language(body.language));
  if(user)return {status:200,data:{token_hash:await signIn(admin,user.email),player_id:user.id}};
  const made=(await mappedRow(admin,userId))?.player_id;
  if(!made)throw Error('The Discord account could not be made.');
  return await openFarm(admin,userId,made);
 }catch(error){await release(admin,hash,usedAt);throw error;}
}

// "Play your harvesttycoon.com farm here", from a Discord-only farm's Settings in the Activity.
// The code says which Discord account asks (it must be the one of this farm), so the website shows its username.
async function relink({admin,body,headers,env,now,fetchImpl,pause}){
 const code=discordCode(body.code);
 if(!code)return {status:400,data:{error:MESSAGES.request}};
 const asked=await askDiscord({admin,code,headers,env,now,fetchImpl,pause});
 if(asked.reply)return asked.reply;
 const {me,player}=asked;
 if(!me)return SIGN_IN;
 const row=me.app_metadata?.portal===PORTAL?await rowOfPlayer(admin,me.id):null;
 if(!row||!discordOnly(me,row.discord_user_id)||player.userId!==row.discord_user_id)return refuse(403,LINK_ERRORS.notDiscord);
 const made=await newTicket(admin,{userId:row.discord_user_id,displayName:player.displayName,relinkFrom:me.id,now});
 if(!made)return TOO_MANY;
 return {status:200,data:{...made,expires_in:TICKET_TTL}};
}
// Cancel on the Activity's waiting card after Settings: the ticket is done, unless the website said yes already (then the Activity's
// new start opens the website farm).
async function cancel({admin,body,now}){
 const ticket=linkTicket(body.ticket);if(!ticket)return GONE;
 const {hash,row}=await readTicket(admin,ticket);
 if(ticketState(row,now)!=='open'||!await keyFits(row,body.key))return GONE;
 if(!await updateTicket(admin,hash,{used_at:iso(now),display_name:null},{used_at:null,linked_player:null}))return GONE;
 return {status:200,data:{ok:true}};
}

// What the website's "Play this farm on Discord?" shows, for a signed-in farmer: from Discord's link (the ticket), or back from Discord
// (the Link's state, then only for the account that tapped Link). A website farm that Link would refuse whatever Discord says
// (accountRefusal) is refused here already, so the farmer is never sent to Discord for nothing.
async function peek({admin,body,headers,now}){
 const [me,found]=await Promise.all([sessionUser(admin,headers),namedTicket(admin,body)]);
 if(!me)return SIGN_IN;
 const refused=ticketRefusal(found,me,now)??await accountRefusal(admin,me,found.row.discord_user_id);
 if(refused)return refused;
 const {row}=found;
 return {status:200,data:{display_name:row.display_name??null,relink:Boolean(row.relink_from),expires_in:secondsLeft(row,now)}};
}
// What only the website account decides (peek, begin, and confirm again at Link): a real website account (no moderator's) whose address is
// confirmed (or that has Google or Facebook), played by no other Discord account than the ticket's. null, or the refusal.
async function accountRefusal(admin,me,userId){
 if(portalAccount(me))return refuse(403,LINK_ERRORS.portal);
 if(await staffAccount(admin,me.id))return refuse(403,LINK_ERRORS.staff);
 if(!me.email||!me.email_confirmed_at)return refuse(403,LINK_ERRORS.email);
 if(!hasOAuth(me)){const checked=await admin.rpc('harvest_email_checked',{p_player:me.id});if(checked.error)throw checked.error;if(checked.data!==true)return refuse(403,LINK_ERRORS.email);}
 const own=await rowOfPlayer(admin,me.id);
 if(own&&own.discord_user_id!==userId)return refuse(409,LINK_ERRORS.alreadyLinked);
 return null;
}

// Link on the website: the trip to Discord starts here. The same checks as peek (a farm Link would refuse is never sent to Discord),
// then a new state for Discord's address, kept (as its SHA-256) on this ticket with this website account. Discord's answer brings it
// back (LINK_CALLBACK), in whatever tab or browser Discord opens, and confirm needs nothing else. Begun with a state (Link again after
// Discord said no or answered for another account, in a tab that never knew the ticket): the same ticket, a new state, the old done.
async function begin({admin,body,headers,now}){
 const [me,found]=await Promise.all([sessionUser(admin,headers),namedTicket(admin,body)]);
 if(!me)return SIGN_IN;
 const refused=ticketRefusal(found,me,now)??await accountRefusal(admin,me,found.row.discord_user_id);
 if(refused)return refused;
 const state=base64url(randomBytes(32));
 const where={used_at:null,linked_player:null,...(found.stateHash?{state_hash:found.stateHash}:{})};
 if(!await updateTicket(admin,found.hash,{state_hash:await ticketHash(state),state_player:me.id,state_at:iso(now)},where,now))return GONE;
 return {status:200,data:{state}};
}

// "Link" on the website, back from Discord: this Discord user plays the signed-in website farm from now on. Only the account that
// tapped Link (the state's), only a website farm accountRefusal lets through, as at peek; the ticket's Discord user may have no farm
// yet, or the Discord-only farm the relink came from (deleted here, after the row moved). The state and the session are checked
// before Discord is asked (another account, an old or used state: Discord's code is never swapped), then only the ticket's own
// Discord account goes on. Its access token is used once, for users/@me, and never kept.
async function confirm({admin,body,headers,env,now,fetchImpl,pause}){
 const state=linkTicket(body.state),code=discordCode(body.code);
 if(!code)return {status:400,data:{error:MESSAGES.request}};
 const [me,found]=await Promise.all([sessionUser(admin,headers),state?namedTicket(admin,{state}):null]);
 if(!me)return SIGN_IN;
 const stopped=ticketRefusal(found,me,now);
 if(stopped)return stopped;
 const asked=await askDiscord({admin,code,env,now,fetchImpl,pause,redirectUri:LINK_CALLBACK});
 if(asked.reply)return asked.reply;
 const {hash,row,stateHash}=found;
 if(asked.player.userId!==row.discord_user_id)return refuse(403,LINK_ERRORS.mismatch);
 // The state links once: of two requests with it at the same moment, only one goes on.
 if(!await updateTicket(admin,hash,{state_hash:null,state_player:null,state_at:null},{state_hash:stateHash,used_at:null,linked_player:null},now))return GONE;
 const refused=await accountRefusal(admin,me,row.discord_user_id);
 if(refused)return refused;
 const taken=await pointRow(admin,row,me.id);
 if(taken)return refuse(409,taken);
 // The ticket says yes for the Activity's next claim; the Discord name has done its job.
 await updateTicket(admin,hash,{linked_player:me.id,display_name:null,expires_at:iso(Math.max(Date.parse(row.expires_at),now+CLAIM_GRACE*1000))},{used_at:null,linked_player:null});
 return finish(admin,row,me.id,{status:200,data:{ok:true}});
}

// The Activity's question while the player is on the website: once the website said yes, a way in to that farm, one time only.
// Without the Activity's key: gone, whatever the ticket's state.
async function claim({admin,body,now}){
 const ticket=linkTicket(body.ticket);if(!ticket)return GONE;
 const {hash,row}=await readTicket(admin,ticket),state=ticketState(row,now);
 if(state!=='gone'&&!await keyFits(row,body.key))return GONE;
 if(state==='open')return {status:200,data:{pending:true,expires_in:secondsLeft(row,now)}};
 if(state!=='linked')return GONE;
 const usedAt=iso(now);
 if(!await updateTicket(admin,hash,{used_at:usedAt},{used_at:null,linked_player:row.linked_player}))return GONE;
 let opened;
 try{opened=await openFarm(admin,row.discord_user_id,row.linked_player);}
 catch(error){await release(admin,hash,usedAt);throw error;}
 return opened.status===200?finish(admin,row,row.linked_player,opened):opened;
}

// Settings › Privacy on the website (and in our apps): whether a Discord account plays this farm.
async function status({admin,headers}){
 const me=await sessionUser(admin,headers);
 if(!me)return SIGN_IN;
 return {status:200,data:{linked:!portalAccount(me)&&Boolean(await rowOfPlayer(admin,me.id))}};
}
// Unlink Discord: the Discord account no longer opens this farm (its next start offers the choice again), a yes the Activity has not
// picked up yet is withdrawn, and every other session of this account ends (as Sign out does), so a game open in Discord stops too.
// Never for a farm made on Discord or another portal, which would be left without a way in.
async function unlink({admin,headers,now}){
 const me=await sessionUser(admin,headers);
 if(!me)return SIGN_IN;
 if(portalAccount(me))return refuse(403,LINK_ERRORS.portal);
 const removed=await admin.from('discord_accounts').delete().eq('player_id',me.id);
 if(removed.error)throw removed.error;
 const withdrawn=await admin.from(TICKETS).update({used_at:iso(now)}).eq('linked_player',me.id).is('used_at',null);
 if(withdrawn.error)throw withdrawn.error;
 const ended=await admin.auth.admin.signOut(bearerToken(headers),'others');
 if(ended?.error)throw ended.error;
 return {status:200,data:{ok:true}};
}

// Discord's last "wait", for every request this server handles (an Edge Function keeps its module between requests).
const PAUSE={until:0};
const OPS={discord,create,relink,cancel,peek,begin,confirm,claim,status,unlink};
// The whole request after index.ts read it: body is the parsed JSON, headers the request's. env: {clientId, clientSecret}.
export async function handleDiscordAuth({admin,body,headers,env={},now=Date.now(),fetchImpl=globalThis.fetch,pause=PAUSE}){
 if(!body||typeof body!=='object'||Array.isArray(body))return {status:400,data:{error:MESSAGES.request}};
 if(typeof body.op==='string'&&Object.hasOwn(OPS,body.op))return OPS[body.op]({admin,body,headers,env,now,fetchImpl,pause});
 return {status:400,data:{error:MESSAGES.unknown}};
}
