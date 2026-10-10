import {portalLanguage} from './crazygames-link.js';
import {validTicket} from './discord-link.js';
import {ACCOUNT_STEPS} from '../public/loading-screen.js';
import {PORTAL_FEATURES,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
// Harvest Tycoon on Discord (Oct 2026): what public/discord.html does, from the moment Discord's SDK is there (src/discord.js hands it
// everything it talks to, so tests run all of it). As on Kongregate there is only the portal's own log-in: no sign-in card of ours, no
// guest farm. Discord's authorize gives a one-time code; our server (the Edge Function discord-auth) trades it with Discord for the
// player's user id and answers with a way in to their farm. A Discord user it has not seen before chooses first: a new farm, or the farm
// they already have on harvesttycoon.com, logged in on the website (Discord's rules allow no log-in of ours here) while this page
// waits. A player who says no in Discord's window sees one card whose button asks again. The farm opens exactly as on the website
// (src/farm-session.js), with a portal on the bridge that tells the game what Discord mode leaves out (public/portal.js): every
// purchase, sign-up, email, reminder, app, invite and link out but the privacy policy, which opens in Discord's own window. The
// farmer's name is one of ours, never the Discord name.
// The sign-in of this page, in its own place on the device, apart from the website's and the other portals'.
export const DC_KEY='harvest-tycoon:dc-user';
// The language of the player's Discord last time (our server reads it from Discord): only applied again when it changes, so a
// language picked in Settings stays.
export const LOCALE_KEY='harvest-tycoon:dc-locale';
// Where these farmers come from (supabase/player-attribution.sql): the server keeps it for a brand-new farm only.
export const SOURCE=Object.freeze({src:'discord',ref:'discord.com'});
// What the page says when a start goes wrong (the server's own texts are English only; these are translated with the game).
export const TEXT=Object.freeze({
 refused:'Your Discord sign-in could not be checked. Please try again.',
 busy:'Many players are starting at once. Please try again in a little while.',
 away:'We could not reach your farm. Your farm is safe; we keep trying.',
 failed:'We could not open your farm. Please try again.',
 setup:'Account access is temporarily unavailable. Please try again later.',
 noConnect:'We could not connect. Please try again.',
 // A farm from harvesttycoon.com: the website's link page did not open, or its ticket ran out before the farm was linked.
 noLink:'We could not open harvesttycoon.com. Please try again.',
 expired:'The link to harvesttycoon.com has expired. Please choose again.'
});
// Discord may ask our server to wait before the next sign-in (its own limit, up to an hour): the page tries again by itself after that
// wait, but never later than this.
export const MAX_WAIT=5*60000;
// The waiting card asks our server this often whether the farm on harvesttycoon.com was linked (only while the page is in view).
export const POLL=3000;
// How long a ticket lasts, in seconds, when our server does not say (it does: expires_in), and never longer.
export const TICKET_LIFE=600;

export async function runDiscordPage({
 link,doc=globalThis.document,win=globalThis.window,nav=globalThis.navigator,timers=globalThis,clock=()=>Date.now(),
 store={get(key){try{return globalThis.localStorage.getItem(key);}catch{return null;}},set(key,value){try{globalThis.localStorage.setItem(key,value);}catch{}}},
 portalClient,setClient,functionsUrl,supabaseKey,isConfigured,fetchImpl=(...args)=>globalThis.fetch(...args),
 createFarmSession,sessionDeps={},cloudError=error=>error?.message||'We could not connect. Please try again.',
 startTranslation=()=>{},chooseLanguage=()=>{},chosenLanguage=()=>'en',startUpdateCheck=()=>{},
 startLoadingTips=()=>()=>{},farmHandOver=()=>({wait(){},stop(){}}),stopPageZoom=()=>{}
}){
 const $=id=>doc.getElementById(id),at=()=>doc.body.dataset.phase;
 stopPageZoom(doc);
 // The page's words wait for their language, which comes with our server's first answer (the player's Discord language), at most 3
 // seconds; then they show in the language this device has (discord.css hides them until then).
 let translating=null;
 const translate=()=>{translating??=Promise.resolve().then(()=>startTranslation()).catch(()=>{});};
 timers.setTimeout(()=>{doc.documentElement.classList.remove('i18n-wait');translate();},3000);
 function language(locale){
  if(typeof locale!=='string'||!locale)return;
  const code=portalLanguage(locale);
  if(store.get(LOCALE_KEY)!==code){chooseLanguage(code);store.set(LOCALE_KEY,code);}
 }
 // A new version waits while a card asks the player something: the reload would open Discord's window again without the player's
 // tap, or lose the choice of a farm and the wait for the website.
 startUpdateCheck({canReload:()=>!['authorize','choose','waiting'].includes(at())});

 // ---- The portal the game reads (public/portal.js): everything off, a player always signed in, the privacy policy through Discord ----
 let session=null,player=null,relinking=null;
 // The farm open now is this Discord user's alone (made here: app_metadata.portal 'discord'), not one from harvesttycoon.com.
 const discordOnly=()=>at()==='authenticated'&&player?.app_metadata?.portal==='discord';
 const linkExisting=()=>relinking??=relink().finally(()=>{relinking=null;});
 const portal={
  name:'discord',features:Object.freeze(Object.fromEntries(PORTAL_FEATURES.map(feature=>[feature,false]))),
  // The farm only ever opens for a player Discord vouched for: never a guest, no settings of Discord's own.
  guest:false,settings:Object.freeze({muteAudio:false,disableChat:false}),userAvailable:true,privacyContact:PRIVACY_CONTACT,
  event(){},
  // The one link out (the privacy policy) opens in Discord's own window: the frame cannot open a page by itself.
  openLink:url=>link.openLink(url),
  // A new language reloads this page only, at the same address (Discord's frame_id with it).
  reload:()=>win.location.reload(),
  reopen:()=>void session?.open(),
  // Settings › "Play your harvesttycoon.com farm here", on a Discord farm only (relink, below): there for a farm of Discord alone,
  // never for one from the website.
  get discordOnly(){return discordOnly();},
  get linkExisting(){return discordOnly()?linkExisting:undefined;}
 };
 win.harvestPortal=portal;

 // ---- The screens of this page: loading, the Authorize card, the choice of a farm and its waiting card, the farm, a pause ----
 let stopTips=null;const handOver=farmHandOver(win,$('loading-screen'));
 function phase(value,message){
  doc.body.dataset.phase=value;
  // The loading screen stays over the farm until the farm page shows its own (public/loading-screen.js farmHandOver).
  if(value==='authenticated')handOver.wait();else{handOver.stop();$('loading-screen').hidden=value!=='checking';}
  $('farm-host').hidden=value!=='authenticated';$('pause-screen').hidden=value!=='error';$('authorize-screen').hidden=value!=='authorize';
  $('choose-screen').hidden=value!=='choose';$('wait-screen').hidden=value!=='waiting';
  if(message){$('loading-copy').textContent=message;const step=ACCOUNT_STEPS[message]??6;$('loading-progress').value=step;$('loading-percent').textContent=`${step}%`;}
  if(value==='checking')stopTips??=startLoadingTips(doc);else{stopTips?.();stopTips=null;translate();}
 }
 let retryTimer=0;
 function pause(message,{retrying=false}={}){
  timers.clearTimeout(retryTimer);
  phase('error');$('pause-copy').textContent=message;$('pause-message').textContent=retrying?'We are trying again automatically.':'';
 }
 // The privacy policy on this page (loading screen, Authorize card): in Discord's window; on our own computer it opens as a link.
 doc.addEventListener('click',event=>{const anchor=event.target?.closest?.('a[href]');if(anchor&&link.openLink(anchor.href))event.preventDefault();});
 // Who to ask about privacy, under the policy (Discord's terms ask for an easy way to ask about the data and its deletion).
 $('authorize-contact').textContent=privacyContact();

 // ---- Who plays ----
 let client=null;
 const own=()=>client??=portalClient(DC_KEY);
 async function sessionNow(){try{const {data}=await own().auth.getSession();return data?.session??null;}catch{return null;}}
 // The sign-in ends on this device only (a player who said no, or a new start after a session that ended).
 async function forget(){try{await own()?.auth.signOut({scope:'local'});}catch{}}
 // How long Discord asked our server to wait, in ms (retry_after, in seconds).
 const waitOf=(data,response)=>{const seconds=Number(data?.retry_after??response.headers?.get?.('retry-after'));return Number.isFinite(seconds)&&seconds>0?seconds*1000:0;};
 async function askServer(body,bearer){
  let response;
  // In Frankfurt next to the database, as farm-api (src/supabase.js FARM_API): one long hop instead of one per database step.
  try{response=await fetchImpl(`${functionsUrl}/discord-auth?forceFunctionRegion=eu-central-1`,{method:'POST',headers:{'content-type':'application/json',apikey:supabaseKey,...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});}
  catch{throw Object.assign(new Error(TEXT.away),{transient:true});}
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok){
   const status=response.status,transient=status>=500;
   throw Object.assign(new Error(transient?TEXT.away:status===401?TEXT.refused:status===429?TEXT.busy:TEXT.failed),{status,transient,ours:true,wait:status===429?waitOf(data,response):0});
  }
  return data??{};
 }
 // A way in from our server (a one-time token_hash, no email) becomes this page's session, the one the farm then talks with.
 async function signIn(hash){
  if(typeof hash!=='string'||!hash)throw new Error(TEXT.failed);
  const {error}=await own().auth.verifyOtp({token_hash:hash,type:'magiclink'});if(error)throw error;
 }
 function adopt(){void own()?.auth?.startAutoRefresh?.();setClient(own());}
 // The code from Discord on every start, checked by our server, which answers with a way in to the player's farm, or that the session
 // here is theirs already, or (a Discord user it has not seen) a ticket for the choice card; and with the player's Discord language.
 async function account(code,note){
  const now=await sessionNow();
  const reply=await askServer({op:'discord',code,language:chosenLanguage()},now?.access_token);
  language(reply.locale);translate();
  // No farm of whoever played here before on this device.
  if(reply.choose){await forget();choose(reply,note);return false;}
  if(!(reply.ok&&now&&now.user?.id===reply.player_id))await signIn(reply.token_hash);
  adopt();return true;
 }

 session=createFarmSession({
  ...sessionDeps,cloudError,
  host:()=>$('farm-host'),phase,unavailable:pause,signedOut,
  firstLoad:()=>({source:{...SOURCE}}),
  extend(bridge,{user}={}){
   // No Sign out in Discord (portal.css hides the button): Discord's own log-in is the only one.
   bridge.portal=portal;bridge.signOut=()=>{};player=user??null;
  }
 });
 // A code is good for one sign-in: the first comes with the page, every start after it asks Discord again (no window then: the
 // player said yes already). After a no, only the player's tap on Authorize to play asks again.
 let next=link.hello(),declined=false,running=false,again=false,endedAt=0,retries=0,note='';
 // Every way in, one at a time: Discord's code (a start), a new farm from the choice card, a farm linked on the website. enter is
 // true when the farm can open, false when a card is up instead.
 async function start(enter=fromDiscord){
  if(running){again=true;return;}running=true;timers.clearTimeout(retryTimer);stopWaiting();
  const said=note;note='';
  try{
   session.dispose();
   if(declined){phase('authorize');return;}
   phase('checking','Checking your account…');
   if(!isConfigured)throw new Error(TEXT.setup);
   if(await enter(said))await session.open();
   retries=0;
  }catch(error){
   // Trying again by itself, a little later each time (8 s up to a minute).
   if(error?.transient||nav?.onLine===false){pause(TEXT.away,{retrying:true});retryTimer=timers.setTimeout(()=>void start(),Math.min(60000,8000*2**retries++));}
   // Discord asked our server to wait: the pause card, and a new start once the wait is over.
   else if(error?.ours&&error.status===429){pause(TEXT.busy,{retrying:true});retryTimer=timers.setTimeout(()=>void start(),Math.min(MAX_WAIT,Math.max(8000,error.wait)));}
   else if(error?.ours)pause(error.message);
   // 429 from the sign-in itself: Supabase's own limit per network, and every Discord player comes through Discord's proxy.
   else if(error?.status===429)pause(TEXT.busy);
   else pause(cloudError(error));
  }finally{running=false;if(again){again=false;queueMicrotask(()=>void start());}}
 }
 async function fromDiscord(said){
  const answer=await(next??link.authorize());next=null;
  // No farm of whoever played here before on this device.
  if(answer?.reason==='declined'){declined=true;await forget();phase('authorize');return false;}
  // Discord did not answer (yet): tried again by itself.
  if(!answer?.code)throw Object.assign(new Error(TEXT.away),{transient:true});
  return account(answer.code,said);
 }
 // The sign-in ended (a session closed elsewhere): it is let go, and a new start signs the player in again. Twice within half a
 // minute means something else is wrong: the pause screen with Try again, never a loop.
 function signedOut(message){
  const now=clock();
  if(now-endedAt<30000){pause(message?`${message} Tap Try again to continue.`:'Tap Try again to continue.');return;}
  endedAt=now;
  void (async()=>{await forget();void start();})();
 }

 // ---- A Discord user our server has not seen (Oct 2026): a new farm, or the farm they already have on harvesttycoon.com ----
 // The ticket of this choice, from our server: only in memory (never stored, logged or shown), sent back with the choice and put in
 // the address of the website's link page. Its key stays here (never in an address): our server makes a farm or signs in only for
 // ticket and key together. relink: from Settings, for the Discord farm open now (the website farm takes its place).
 let offer=null,waitTimer=0,waitRound=0,asking=false;
 const lifetime=seconds=>Math.max(0,Math.min(typeof seconds==='number'&&Number.isFinite(seconds)?seconds:TICKET_LIFE,TICKET_LIFE))*1000;
 const ticketOf=reply=>{const ticket=validTicket(reply?.ticket),key=validTicket(reply?.key);if(!ticket||!key)throw new Error(TEXT.failed);return {ticket,key};};
 // Our server's no to a ticket: unknown, used or expired, or the choice made already (on the website, or here).
 const gone=error=>Boolean(error?.ours)&&[404,409,410].includes(error.status);
 function choose(reply,said=''){
  offer={...ticketOf(reply),until:clock()+lifetime(reply.expires_in),relink:false};
  phase('choose');$('choose-status').textContent=said||'';
 }
 // New farm: one of its own for this Discord user, made by our server for the ticket of the choice. A ticket that ran out first: a
 // new start, which asks again with a note (or opens a farm that was linked meanwhile).
 async function createFarm(){
  const chosen=offer;offer=null;
  if(!chosen||clock()>=chosen.until)return fromDiscord(TEXT.expired);
  let reply;
  try{reply=await askServer({op:'create',ticket:chosen.ticket,key:chosen.key,language:chosenLanguage()});}
  catch(error){if(gone(error))return fromDiscord(TEXT.expired);throw error;}
  language(reply.locale);await signIn(reply.token_hash);adopt();return true;
 }
 // I already have a farm: the website's link page in Discord's window (Discord asks the player first), then the waiting card. A no
 // in Discord's window leaves the choice as it is.
 async function toWebsite(){
  const button=$('choose-existing');
  if(at()!=='choose'||!offer||button.disabled)return;
  if(clock()>=offer.until){offer=null;note=TEXT.expired;void start();return;}
  button.disabled=true;$('choose-status').textContent='';
  try{
   const answer=await link.openLinkPage(offer.ticket);
   if(at()!=='choose'||!offer)return;
   if(answer?.opened)wait();else if(answer?.reason!=='declined')$('choose-status').textContent=TEXT.noLink;
  }finally{button.disabled=false;}
 }
 // The waiting card: every few seconds our server is asked whether the website linked the farm; not while this page is out of view,
 // and at once when it is back (a phone that went to the browser). Linked: that farm opens. The ticket's end: a new start, which
 // shows the choice card again with a note (from Settings: the Discord farm as it was), or a farm linked just then.
 function wait(){phase('waiting');$('wait-new').hidden=offer.relink;waitRound++;later();}
 function later(){timers.clearTimeout(waitTimer);if(at()==='waiting'&&!doc.hidden)waitTimer=timers.setTimeout(()=>void poll(),POLL);}
 function stopWaiting(){waitRound++;timers.clearTimeout(waitTimer);}
 function giveUp(){const was=offer;stopWaiting();offer=null;note=was?.relink?'':TEXT.expired;void start();}
 async function poll(){
  const round=waitRound,waited=offer;
  if(at()!=='waiting'||!waited)return;
  // One question at a time: the one on its way (perhaps from before a Cancel) is answered first, then the next round.
  if(asking){later();return;}
  if(clock()>=waited.until){giveUp();return;}
  asking=true;let reply=null,failure=null;
  try{reply=await askServer({op:'claim',ticket:waited.ticket,key:waited.key});}catch(error){failure=error;}
  asking=false;
  // Cancel, New farm instead or a new start came first.
  if(round!==waitRound)return;
  // A connection problem, or our server busy: asked again on the next round, until the ticket's end.
  if(failure){if(gone(failure))giveUp();else later();return;}
  if(typeof reply.token_hash==='string'&&reply.token_hash){offer=null;const hash=reply.token_hash;void start(()=>linked(hash));return;}
  // Not linked yet: our server says how long the ticket has left.
  if(typeof reply.expires_in==='number')waited.until=clock()+lifetime(reply.expires_in);
  later();
 }
 // The farm linked on the website: the session here ends on this device (from Settings: the Discord farm's, which our server deleted
 // when the website said Link) and the website farm's begins.
 async function linked(hash){await forget();await signIn(hash);adopt();return true;}
 doc.addEventListener('visibilitychange',()=>{if(at()!=='waiting')return;timers.clearTimeout(waitTimer);if(!doc.hidden)void poll();});

 // ---- Settings on a Discord farm (Oct 2026): play the farm from harvesttycoon.com here instead ----
 // The game asked the player first: the Discord farm is deleted by our server once the website says Link, never before. Our server
 // gives a ticket for the Discord farm open now (its session shows whose), the website's link page opens in Discord's window, the farm
 // closes and this page waits as after the choice card, without New farm instead. {opened:true}: the waiting card is up;
 // {opened:false}: the player said no in Discord's window, the farm stays. Anything else throws in the game's words, the farm stays.
 async function relink(){
  if(!discordOnly())throw new Error(TEXT.noLink);
  const now=await sessionNow();if(!now)throw new Error(TEXT.noLink);
  // A new code from Discord (no window: the player said yes before): our server checks it is this farm's Discord account, and the
  // website names that account. No code, no ticket.
  const discord=await link.authorize();
  if(!discord?.code)throw new Error(TEXT.noLink);
  let reply;
  try{reply=await askServer({op:'relink',code:discord.code},now.access_token);}
  catch(error){throw error?.transient||error?.status===429?error:new Error(TEXT.noLink);}
  const ticket=validTicket(reply.ticket),key=validTicket(reply.key);if(!ticket||!key)throw new Error(TEXT.noLink);
  const asked={ticket,key,until:clock()+lifetime(reply.expires_in),relink:true};
  const answer=await link.openLinkPage(asked.ticket);
  if(!answer?.opened){if(answer?.reason==='declined')return {opened:false};throw new Error(TEXT.noLink);}
  if(at()!=='authenticated')return {opened:false};
  offer=asked;session.dispose();wait();
  return {opened:true};
 }

 // Authorize to play: Discord's window again, only from this tap. Another no leaves the card as it is.
 const authorizeButton=$('authorize-play');
 authorizeButton.addEventListener('click',async()=>{
  if(authorizeButton.disabled)return;authorizeButton.disabled=true;$('authorize-status').textContent='';
  try{
   const answer=await link.authorize();
   if(answer?.code){declined=false;next=Promise.resolve(answer);void start();}
   else if(answer?.reason!=='declined')$('authorize-status').textContent=TEXT.noConnect;
  }finally{authorizeButton.disabled=false;}
 });
 $('choose-new').addEventListener('click',()=>{if(at()==='choose')void start(createFarm);});
 $('choose-existing').addEventListener('click',()=>void toWebsite());
 // New farm instead (after the choice card only). Cancel: back to the choice card, or from Settings to the farm as it was. From
 // Settings the ticket is withdrawn first (our server's cancel), so a Link tapped on the website later deletes nothing; a link made
 // just before opens the website farm instead. Our server away: the farm opens all the same, and the ticket runs out by itself.
 $('wait-new').addEventListener('click',()=>{if(at()==='waiting'&&offer&&!offer.relink)void start(createFarm);});
 $('wait-cancel').addEventListener('click',()=>{
  if(at()!=='waiting')return;stopWaiting();
  if(offer&&!offer.relink){phase('choose');$('choose-status').textContent='';return;}
  const was=offer;offer=null;
  void start(async said=>{if(was)await askServer({op:'cancel',ticket:was.ticket,key:was.key}).catch(()=>{});return fromDiscord(said);});
 });
 $('pause-retry').addEventListener('click',()=>void start());
 session.listen({reopen:()=>void start()});
 await start();
 return {portal,start};
}
