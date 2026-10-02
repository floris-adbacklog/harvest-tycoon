import {supabase,portalClient,useClient,supabaseKey,functionsUrl,isConfigured,verifiedUser,farmRequest,cloudError} from './supabase.js';
import {createFarmSession} from './farm-session.js';
import {createFarmPresence} from './presence.js';
import {fetchLeaderboard} from './leaderboard.js';
import {createChatClient} from './chat-client.js';
import {createWrapperLink,localStandIn,isLocalHost,portalLanguage} from './crazygames-link.js';
import {stopPageZoom} from './page-zoom.js';
import {startUpdateCheck} from './app-update.js';
import {WAKE_GRACE} from './connection.js';
import {startTranslation,chooseLanguage,chosenLanguage} from '../public/i18n.js';
import {startLoadingTips,ACCOUNT_STEPS} from '../public/loading-screen.js';
import {PORTAL_FEATURES} from '../public/portal.js';
// Harvest Tycoon on CrazyGames (Oct 2026): public/crazygames.html, shown in a frame by our small page on CrazyGames (crazygames/).
// No sign-in card: a player who is logged in on CrazyGames gets their own farm (their token is checked by our server, the Edge
// Function crazygames-auth, on every start), anyone else plays as a guest of this browser. The farm itself opens exactly as on the
// website (src/farm-session.js), with a portal on the bridge that tells the game what CrazyGames does not allow (public/portal.js).
const $=id=>document.getElementById(id);
const store={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}},remove(key){try{localStorage.removeItem(key);}catch{}}};
// The sign-ins of this page, each in its own place on the device, apart from the website's: a guest on a shared computer never
// opens the farm of the CrazyGames player who played there before.
const CG_KEYS=Object.freeze({user:'harvest-tycoon:cg-user',guest:'harvest-tycoon:cg-guest'});
// The language CrazyGames asked for last time: it is only applied again when CrazyGames' own language changes, so a language picked
// in Settings stays.
const LOCALE_KEY='harvest-tycoon:cg-locale';
const framed=window.parent!==window,local=isLocalHost(location.hostname);
// Opened on its own on our own address: this page is for CrazyGames only, so the visitor goes to the website.
if(!framed&&!local)location.replace('/');
else void boot();

async function boot(){
 const link=framed?createWrapperLink({win:window,parent:window.parent,local}):localStandIn();
 stopPageZoom(document);
 // The page shows its texts once it knows the language (crazygames.css hides them until then; never longer than 3 seconds).
 setTimeout(()=>document.documentElement.classList.remove('i18n-wait'),3000);
 const info=await link.hello();
 const language=portalLanguage(info.locale);
 if(info.locale&&store.get(LOCALE_KEY)!==language){chooseLanguage(language);store.set(LOCALE_KEY,language);}
 void startTranslation();
 startUpdateCheck();

 // ---- The SDK's events: one start for one stop, and play only while the farm is on screen ----
 let playing=false,loading=false,ready=false,happyAt=0;
 function sdk(name){
  if(name==='gameplayStart'){if(playing||!ready||document.hidden||document.body.dataset.phase!=='authenticated')return;playing=true;}
  else if(name==='gameplayStop'){if(!playing)return;playing=false;}
  else if(name==='loadingStart'){if(loading)return;loading=true;}
  else if(name==='loadingStop'){if(!loading)return;loading=false;}
  link.event(name);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)sdk('gameplayStop');else sdk('gameplayStart');});

 // ---- The portal the game reads (public/portal.js): what is off here, the settings, the SDK and the log-in window ----
 const settings={...info.settings},listeners=new Set();
 let guest=true;
 const portal={
  name:'crazygames',features:Object.freeze(Object.fromEntries(PORTAL_FEATURES.map(feature=>[feature,false]))),
  get guest(){return guest;},get settings(){return {...settings};},
  // From the game (src/game-cloud.js): the farm is ready (loadingStop, gameplayStart).
  event(name){if(name==='loadingStop'||name==='gameplayStart')ready=true;sdk(name);},
  // Only ever from a player's tap ("Log in with CrazyGames"); a log-in arrives through onAuth below.
  showAuthPrompt:()=>link.authPrompt(),
  onSettings(fn){listeners.add(fn);return()=>listeners.delete(fn);},
  // A new language reloads this page only, never CrazyGames' own (public/language-settings.js).
  reload:()=>location.reload(),
  reopen:()=>void session.open()
 };
 window.harvestPortal=portal;
 link.onSettings(next=>{Object.assign(settings,next);for(const fn of [...listeners])try{fn({...settings});}catch{listeners.delete(fn);}});

 // ---- The screens of this page: loading, the farm, a pause ----
 let stopTips=null;
 function phase(value,message){
  document.body.dataset.phase=value;
  $('loading-screen').hidden=value!=='checking';$('farm-host').hidden=value!=='authenticated';$('pause-screen').hidden=value!=='error';
  if(message){$('loading-copy').textContent=message;const step=ACCOUNT_STEPS[message]??6;$('loading-progress').value=step;$('loading-percent').textContent=`${step}%`;}
  if(value==='checking'){stopTips??=startLoadingTips(document);ready=false;sdk('gameplayStop');sdk('loadingStart');}else{stopTips?.();stopTips=null;}
 }
 let retryTimer=0;
 function pause(message,{retrying=false}={}){
  clearTimeout(retryTimer);ready=false;sdk('gameplayStop');sdk('loadingStop');
  phase('error');$('pause-copy').textContent=message;$('pause-message').textContent=retrying?'We are trying again automatically.':'';
 }

 // ---- Who plays ----
 const clients={};let active=null;
 const clientOf=kind=>clients[kind]??=portalClient(CG_KEYS[kind]);
 function activate(kind){
  active=kind;guest=kind==='guest';
  for(const [other,client] of Object.entries(clients))if(other!==kind)client?.auth?.stopAutoRefresh?.();
  const client=clientOf(kind);void client?.auth?.startAutoRefresh?.();useClient(client);
 }
 async function sessionOf(kind){try{const {data}=await clientOf(kind).auth.getSession();return data?.session??null;}catch{return null;}}
 // forget: this sign-in is over (it is closed on the server too); drop: it moved to the player's own place, so only this device lets go.
 async function forget(kind){try{await clientOf(kind)?.auth.signOut({scope:'local'});}catch{}}
 function drop(kind){clientOf(kind)?.auth?.stopAutoRefresh?.();store.remove(CG_KEYS[kind]);}
 async function askServer(body,bearer){
  let response;
  try{response=await fetch(`${functionsUrl}/crazygames-auth`,{method:'POST',headers:{'content-type':'application/json',apikey:supabaseKey,...(bearer?{authorization:`Bearer ${bearer}`}:{})},body:JSON.stringify(body)});}
  catch{throw Object.assign(new Error('We could not reach your farm. Your farm is safe; we keep trying.'),{transient:true});}
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok)throw Object.assign(new Error(data?.error||'We could not connect. Please try again.'),{status:response.status,transient:response.status>=500});
  return data??{};
 }
 async function enter(kind,tokenHash){
  if(typeof tokenHash!=='string'||!tokenHash)throw new Error('We could not open your farm. Please try again.');
  const {error}=await clientOf(kind).auth.verifyOtp({token_hash:tokenHash,type:'magiclink'});if(error)throw error;activate(kind);
 }
 // A CrazyGames player: a fresh token on every start (their rule), checked by our server, which answers with a way in to their farm.
 // A guest who logs in keeps the guest farm: the guest's sign-in goes along and the server makes it the CrazyGames player's farm.
 async function account(){
  if(info.userAvailable&&info.user){
   const token=await link.token();
   if(token){
    try{
     const own=await sessionOf('user'),current=active==='guest'?await sessionOf('guest'):null,stored=own||current?null:await sessionOf('guest');
     const sent=current??own??stored;
     const reply=await askServer({op:'crazygames',token,language:chosenLanguage()},sent?.access_token);
     if(reply.ok&&sent&&sent.user?.id===reply.player_id){
      // Already this player: keep the sign-in, in the player's own place.
      if(sent!==own){const {error}=await clientOf('user').auth.setSession({access_token:sent.access_token,refresh_token:sent.refresh_token});if(error)throw error;drop('guest');}
      activate('user');
     }else{await enter('user',reply.token_hash);if(reply.linked)await forget('guest');}
     return;
    }catch(error){if(error.status!==401)throw error;}   // a token our server does not take: play on as a guest
   }
  }
  // A guest farm of this browser: the farm's own check (src/farm-session.js) finds out whether its sign-in still works.
  if(await sessionOf('guest')){activate('guest');return;}
  const reply=await askServer({op:'guest',language:chosenLanguage()});
  await enter('guest',reply.token_hash);
 }

 const session=createFarmSession({
  supabase:()=>supabase,verifiedUser,farmRequest,fetchLeaderboard,createFarmPresence,createChatClient,cloudError,
  host:()=>$('farm-host'),phase,unavailable:pause,signedOut,
  // Where these farmers come from (supabase/player-attribution.sql): the server keeps it for a brand-new farm only.
  firstLoad:()=>({source:{src:'crazygames',ref:'crazygames.com'}}),
  // No trackers here: only a level-up becomes CrazyGames' happytime, at most once in two minutes.
  track:{game:event=>{if(event==='level_up'&&Date.now()-happyAt>120000){happyAt=Date.now();sdk('happytime');}}},
  extend(bridge){
   // No Sign out on CrazyGames (their rule; portal.css hides the button): a guest's farm is never let go by a tap.
   bridge.portal=portal;bridge.signOut=()=>{};
   // The village and back: the game page loads again, through its loading screen.
   const travel=bridge.travel;bridge.travel=async to=>{ready=false;sdk('gameplayStop');sdk('loadingStart');await travel(to);};
  }
 });
 let running=false,again=false,endedAt=0;
 async function start(){
  if(running){again=true;return;}running=true;clearTimeout(retryTimer);
  try{
   session.dispose();phase('checking','Checking your account…');
   if(!isConfigured)throw new Error('Account access is temporarily unavailable. Please try again later.');
   await account();await session.open();
  }catch(error){
   if(error?.status===429)pause('Many new farms were started from this network just now. Please try again in a little while.');
   else if(error?.transient||navigator.onLine===false){pause(error.message||'We could not reach your farm. Your farm is safe; we keep trying.',{retrying:true});retryTimer=setTimeout(()=>void start(),8000);}
   else pause(cloudError(error));
  }finally{running=false;if(again){again=false;queueMicrotask(()=>void start());}}
 }
 // The sign-in ended (an old guest sign-in, a session closed elsewhere): it is let go, and a new start finds the player again (a
 // CrazyGames player through a fresh token; a guest whose sign-in no longer works starts a new farm). Twice within half a minute
 // means something else is wrong: the pause screen with Try again, never a loop.
 function signedOut(message){
  const now=Date.now();
  if(now-endedAt<30000){pause(message?`${message} Tap Try again to continue.`:'Tap Try again to continue.');return;}
  endedAt=now;
  void (async()=>{if(active)await forget(active);void start();})();
 }
 // Logging in or out on CrazyGames during play: the farm of whoever plays now (a log-out reloads the whole page anyway).
 link.onAuth(user=>{info.user=user;if(user)info.userAvailable=true;void start();});
 $('pause-retry').onclick=()=>void start();
 session.listen({reopen:()=>void start()});
 void start();
}
