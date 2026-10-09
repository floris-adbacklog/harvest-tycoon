import {isGuest,GUEST} from './kongregate-link.js';
import {portalLanguage} from './crazygames-link.js';
import {ACCOUNT_STEPS} from '../public/loading-screen.js';
import {PORTAL_FEATURES,PRIVACY_CONTACT,privacyContact} from '../public/portal.js';
// Harvest Tycoon on Kongregate (Oct 2026): what public/kongregate.html does, from the moment Kongregate's API says who plays
// (src/kongregate.js hands it everything it talks to, so tests run all of it). Kongregate allows only its own log-in, so there is no
// sign-in card and no guest farm: a player signed in to Kongregate gets their own farm (their user id and game auth token are checked
// by our server, the Edge Function kongregate-auth, on every start), and a guest sees one page with the Register button that opens
// Kongregate's own sign-in window. A guest who signs in, or another Kongregate user, gets the farm of whoever plays now. The farm itself
// opens exactly as on the website (src/farm-session.js), with a portal on the bridge that tells the game what Kongregate does not allow
// (public/portal.js): every purchase, sign-up, email, reminder, app, invite and link out.
// The sign-in of this page, in its own place on the device, apart from the website's and CrazyGames'.
export const KG_KEY='harvest-tycoon:kg-user';
// The language Kongregate's site was in last time: it is only applied again when that language changes, so a language picked in
// Settings stays.
export const LOCALE_KEY='harvest-tycoon:kg-locale';
// Where these farmers come from (supabase/player-attribution.sql): the server keeps it for a brand-new farm only.
export const SOURCE=Object.freeze({src:'kongregate',ref:'kongregate.com'});
// What the page says when a start goes wrong (the server's own texts are English only; these are translated with the game).
export const TEXT=Object.freeze({
 refused:'Your Kongregate sign-in could not be checked. Please reload the game.',
 busy:'Many players on this network are starting at once. Please try again in a little while.',
 away:'We could not reach your farm. Your farm is safe; we keep trying.',
 failed:'We could not open your farm. Please try again.',
 setup:'Account access is temporarily unavailable. Please try again later.',
 noRegister:'We could not connect. Please try again.'
});

export async function runKongregatePage({
 link,doc=globalThis.document,win=globalThis.window,nav=globalThis.navigator,timers=globalThis,
 store={get(key){try{return globalThis.localStorage.getItem(key);}catch{return null;}},set(key,value){try{globalThis.localStorage.setItem(key,value);}catch{}}},
 portalClient,setClient,functionsUrl,supabaseKey,isConfigured,fetchImpl=(...args)=>globalThis.fetch(...args),
 createFarmSession,sessionDeps={},cloudError=error=>error?.message||'We could not connect. Please try again.',
 startTranslation=()=>{},chooseLanguage=()=>{},chosenLanguage=()=>'en',startUpdateCheck=()=>{},
 startLoadingTips=()=>()=>{},farmHandOver=()=>({wait(){},stop(){}}),stopPageZoom=()=>{}
}){
 const $=id=>doc.getElementById(id);
 stopPageZoom(doc);
 // The page shows its texts once it knows the language (kongregate.css hides them until then; never longer than 3 seconds).
 timers.setTimeout(()=>doc.documentElement.classList.remove('i18n-wait'),3000);
 const info=await link.hello();
 // "initialized" = 1 on every load, as early as it can (Kongregate's checklist: the filter for its ratings); nothing happens while
 // the statistic is not set up on Kongregate yet.
 link.submit('initialized',1);
 if(info.language){const language=portalLanguage(info.language);if(store.get(LOCALE_KEY)!==language){chooseLanguage(language);store.set(LOCALE_KEY,language);}}
 void startTranslation();
 startUpdateCheck();

 // ---- The portal the game reads (public/portal.js): everything off, a player always signed in, the privacy contact ----
 let session=null;
 const portal={
  name:'kongregate',features:Object.freeze(Object.fromEntries(PORTAL_FEATURES.map(feature=>[feature,false]))),
  // The farm only ever opens for a player signed in to Kongregate: never a guest, no settings of Kongregate's own.
  guest:false,settings:Object.freeze({muteAudio:false,disableChat:false}),userAvailable:true,privacyContact:PRIVACY_CONTACT,
  event(){},
  showAuthPrompt:async()=>({ok:link.register()}),
  onSettings:()=>()=>{},
  // A new language reloads this page only, never Kongregate's own (public/language-settings.js).
  reload:()=>win.location.reload(),
  reopen:()=>void session?.open()
 };
 win.harvestPortal=portal;

 // ---- The screens of this page: loading, the guest's Register page, the farm, a pause ----
 let stopTips=null;const handOver=farmHandOver(win,$('loading-screen'));
 function phase(value,message){
  doc.body.dataset.phase=value;
  // The loading screen stays over the farm until the farm page shows its own (public/loading-screen.js farmHandOver).
  if(value==='authenticated')handOver.wait();else{handOver.stop();$('loading-screen').hidden=value!=='checking';}
  $('farm-host').hidden=value!=='authenticated';$('pause-screen').hidden=value!=='error';$('guest-screen').hidden=value!=='guest';
  if(message){$('loading-copy').textContent=message;const step=ACCOUNT_STEPS[message]??6;$('loading-progress').value=step;$('loading-percent').textContent=`${step}%`;}
  if(value==='checking')stopTips??=startLoadingTips(doc);else{stopTips?.();stopTips=null;}
 }
 let retryTimer=0;
 function pause(message,{retrying=false}={}){
  timers.clearTimeout(retryTimer);
  phase('error');$('pause-copy').textContent=message;$('pause-message').textContent=retrying?'We are trying again automatically.':'';
 }
 // Register: Kongregate's own window, only from this tap. A sign-in comes back through onChange below (or a reload by Kongregate).
 $('guest-register').onclick=()=>{$('guest-status').textContent=link.register()?'':TEXT.noRegister;};
 // Who to ask about privacy, under the policy (Kongregate's privacy rules ask for a contact in the game).
 $('guest-contact').textContent=privacyContact();

 // ---- Who plays ----
 let client=null,active=null;
 const own=()=>client??=portalClient(KG_KEY);
 async function sessionNow(){try{const {data}=await own().auth.getSession();return data?.session??null;}catch{return null;}}
 // The sign-in ends on this device only (a guest now, or a new start after a session that ended).
 async function forget(){try{await own()?.auth.signOut({scope:'local'});}catch{}}
 async function askServer(body,bearer){
  let response;
  // In Frankfurt next to the database, as farm-api (src/supabase.js FARM_API): one long hop instead of one per database step.
  try{response=await fetchImpl(`${functionsUrl}/kongregate-auth?forceFunctionRegion=eu-central-1`,{method:'POST',headers:{'content-type':'application/json',apikey:supabaseKey,...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});}
  catch{throw Object.assign(new Error(TEXT.away),{transient:true});}
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok){
   const status=response.status,transient=status>=500;
   throw Object.assign(new Error(transient?TEXT.away:status===401?TEXT.refused:status===429?TEXT.busy:TEXT.failed),{status,transient,ours:true});
  }
  return data??{};
 }
 // A player signed in to Kongregate: their user id and token on every start, checked by our server, which answers with a way in to
 // their farm (made the first time), or that the session here is theirs already.
 async function account(user){
  const now=await sessionNow();
  const reply=await askServer({op:'kongregate',user_id:user.id,game_auth_token:user.token,language:chosenLanguage()},now?.access_token);
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
   // No Sign out on Kongregate (portal.css hides the button): Kongregate's own log-in is the only one.
   bridge.portal=portal;bridge.signOut=()=>{};
  }
 });
 let running=false,again=false,endedAt=0,retries=0;
 async function start(){
  if(running){again=true;return;}running=true;timers.clearTimeout(retryTimer);
  try{
   session.dispose();
   const user=link.user();active=user.id;
   // A guest: the Register page, and no farm of whoever played here before on this device.
   if(isGuest(user)){await forget();phase('guest');return;}
   phase('checking','Checking your account…');
   if(!isConfigured)throw new Error(TEXT.setup);
   await account(user);await session.open();retries=0;
  }catch(error){
   // Trying again by itself, a little later each time (8 s up to a minute).
   if(error?.transient||nav?.onLine===false){pause(TEXT.away,{retrying:true});retryTimer=timers.setTimeout(()=>void start(),Math.min(60000,8000*2**retries++));}
   else if(error?.ours)pause(error.message);
   // 429 from the sign-in itself: Supabase's own limit, per network (a school class behind one address).
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
 // A guest who signs in on Kongregate, or another Kongregate user: the farm of whoever plays now. The same player told twice does not
 // reload the farm.
 link.onChange(user=>{if((user?.id??GUEST)!==active)void start();});
 $('pause-retry').onclick=()=>void start();
 session.listen({reopen:()=>void start()});
 await start();
 return {portal,start,get active(){return active;}};
}
