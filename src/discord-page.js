import {portalLanguage} from './crazygames-link.js';
import {ACCOUNT_STEPS} from '../public/loading-screen.js';
import {PORTAL_FEATURES,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
// Harvest Tycoon on Discord (Oct 2026): what public/discord.html does, from the moment Discord's SDK is there (src/discord.js hands it
// everything it talks to, so tests run all of it). As on Kongregate there is only the portal's own log-in: no sign-in card of ours, no
// guest farm, no linking. Discord's authorize gives a one-time code; our server (the Edge Function discord-auth) trades it with Discord
// for the player's user id and answers with a way in to their farm, made the first time. A player who says no in Discord's window sees
// one card whose button asks again. The farm opens exactly as on the website (src/farm-session.js), with a portal on the bridge that
// tells the game what Discord mode leaves out (public/portal.js): every purchase, sign-up, email, reminder, app, invite and link out
// but the privacy policy, which opens in Discord's own window. The farmer's name is one of ours, never the Discord name.
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
 noConnect:'We could not connect. Please try again.'
});
// Discord may ask our server to wait before the next sign-in (its own limit, up to an hour): the page tries again by itself after that
// wait, but never later than this.
export const MAX_WAIT=5*60000;

export async function runDiscordPage({
 link,doc=globalThis.document,win=globalThis.window,nav=globalThis.navigator,timers=globalThis,
 store={get(key){try{return globalThis.localStorage.getItem(key);}catch{return null;}},set(key,value){try{globalThis.localStorage.setItem(key,value);}catch{}}},
 portalClient,setClient,functionsUrl,supabaseKey,isConfigured,fetchImpl=(...args)=>globalThis.fetch(...args),
 createFarmSession,sessionDeps={},cloudError=error=>error?.message||'We could not connect. Please try again.',
 startTranslation=()=>{},chooseLanguage=()=>{},chosenLanguage=()=>'en',startUpdateCheck=()=>{},
 startLoadingTips=()=>()=>{},farmHandOver=()=>({wait(){},stop(){}}),stopPageZoom=()=>{}
}){
 const $=id=>doc.getElementById(id);
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
 // A new version waits while the Authorize card is up: the reload would open Discord's window again without the player's tap.
 startUpdateCheck({canReload:()=>doc.body.dataset.phase!=='authorize'});

 // ---- The portal the game reads (public/portal.js): everything off, a player always signed in, the privacy policy through Discord ----
 let session=null;
 const portal={
  name:'discord',features:Object.freeze(Object.fromEntries(PORTAL_FEATURES.map(feature=>[feature,false]))),
  // The farm only ever opens for a player Discord vouched for: never a guest, no settings of Discord's own.
  guest:false,settings:Object.freeze({muteAudio:false,disableChat:false}),userAvailable:true,privacyContact:PRIVACY_CONTACT,
  event(){},
  // The one link out (the privacy policy) opens in Discord's own window: the frame cannot open a page by itself.
  openLink:url=>link.openLink(url),
  // A new language reloads this page only, at the same address (Discord's frame_id with it).
  reload:()=>win.location.reload(),
  reopen:()=>void session?.open()
 };
 win.harvestPortal=portal;

 // ---- The screens of this page: loading, the Authorize card, the farm, a pause ----
 let stopTips=null;const handOver=farmHandOver(win,$('loading-screen'));
 function phase(value,message){
  doc.body.dataset.phase=value;
  // The loading screen stays over the farm until the farm page shows its own (public/loading-screen.js farmHandOver).
  if(value==='authenticated')handOver.wait();else{handOver.stop();$('loading-screen').hidden=value!=='checking';}
  $('farm-host').hidden=value!=='authenticated';$('pause-screen').hidden=value!=='error';$('authorize-screen').hidden=value!=='authorize';
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
 // The code from Discord on every start, checked by our server, which answers with a way in to the player's farm (made the first
 // time), or that the session here is theirs already; and with the player's Discord language.
 async function account(code){
  const now=await sessionNow();
  const reply=await askServer({op:'discord',code,language:chosenLanguage()},now?.access_token);
  language(reply.locale);translate();
  if(!(reply.ok&&now&&now.user?.id===reply.player_id)){
   if(typeof reply.token_hash!=='string'||!reply.token_hash)throw new Error(TEXT.failed);
   const {error}=await own().auth.verifyOtp({token_hash:reply.token_hash,type:'magiclink'});if(error)throw error;
  }
  void own()?.auth?.startAutoRefresh?.();setClient(own());
 }

 session=createFarmSession({
  ...sessionDeps,cloudError,
  host:()=>$('farm-host'),phase,unavailable:pause,signedOut,
  firstLoad:()=>({source:{...SOURCE}}),
  extend(bridge){
   // No Sign out in Discord (portal.css hides the button): Discord's own log-in is the only one.
   bridge.portal=portal;bridge.signOut=()=>{};
  }
 });
 // A code is good for one sign-in: the first comes with the page, every start after it asks Discord again (no window then: the
 // player said yes already). After a no, only the player's tap on Authorize to play asks again.
 let next=link.hello(),declined=false,running=false,again=false,endedAt=0,retries=0;
 async function start(){
  if(running){again=true;return;}running=true;timers.clearTimeout(retryTimer);
  try{
   session.dispose();
   if(declined){phase('authorize');return;}
   phase('checking','Checking your account…');
   if(!isConfigured)throw new Error(TEXT.setup);
   const answer=await(next??link.authorize());next=null;
   // No farm of whoever played here before on this device.
   if(answer?.reason==='declined'){declined=true;await forget();phase('authorize');return;}
   // Discord did not answer (yet): tried again by itself.
   if(!answer?.code)throw Object.assign(new Error(TEXT.away),{transient:true});
   await account(answer.code);await session.open();retries=0;
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
 // The sign-in ended (a session closed elsewhere): it is let go, and a new start signs the player in again. Twice within half a
 // minute means something else is wrong: the pause screen with Try again, never a loop.
 function signedOut(message){
  const now=Date.now();
  if(now-endedAt<30000){pause(message?`${message} Tap Try again to continue.`:'Tap Try again to continue.');return;}
  endedAt=now;
  void (async()=>{await forget();void start();})();
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
 $('pause-retry').addEventListener('click',()=>void start());
 session.listen({reopen:()=>void start()});
 await start();
 return {portal,start};
}
