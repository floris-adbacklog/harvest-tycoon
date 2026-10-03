// Push notifications in our Android app (Oct 2026): the app's own notifications through OneSignal instead of the browser's, with the
// same face as src/push.js (status, enable, disable, sync, detach), so Settings, the reminder question and the daily gift's "Remind me"
// work as on the website. It runs on the page around the game and talks to the app through public/android.js (APP_PUSH): the page goes
// to an address the app catches, the app answers with window.harvestAppPush.
// The server (supabase/app-push.sql, app_push_devices) keeps this phone's OneSignal subscription id only once the farmer turned
// notifications on with a tap and the phone allows them. OneSignal finds the farmer's phones by the player id (OneSignal.login), so
// "on" is the farmer's: this phone allows notifications and the farmer has them on. Turn off switches them off for the farmer
// (app_push_save false); Sign out forgets this phone (app_push_forget) and unlinks it from the farmer (logout).
import {APP_PUSH,appPushLoginLink,listenAppPush,appPushAllowed} from '../public/android.js';
export const APP_PUSH_WAIT_MS=60000;    // the farmer answering Android's question
export const APP_STATUS_WAIT_MS=3000;   // the app answering "how is it?"
export const APP_LINK_GAP_MS=400;       // between two addresses, so the app sees each one
const FAILED='That did not work. Please try again.';

// Which farmer this page linked the phone to (once per page load; a sign-in links again: forgetAppPushLink on the sign-in card).
export function forgetAppPushLink(win=globalThis.window){try{if(win)win.harvestAppPushLinked=null;}catch{}}

export function createAppPush({supabase,playerId=null,win=globalThis.window,timers=globalThis,clock=()=>Date.now(),
 waitMs=APP_PUSH_WAIT_MS,statusWaitMs=APP_STATUS_WAIT_MS,gapMs=APP_LINK_GAP_MS}){
 const hub=listenAppPush(win),watchers=new Set();
 let chain=Promise.resolve(),last=-Infinity,wanted=false,asking=false;
 const sleep=ms=>new Promise(resolve=>timers.setTimeout(resolve,ms));
 // One address at a time, a moment apart: a second address straight after the first would cancel it before the app sees it.
 function open(link){
  chain=chain.then(async()=>{const wait=last+gapMs-clock();if(wait>0)await sleep(wait);try{win.location.href=link;}catch{}last=clock();});
  return chain;
 }
 const tell=()=>{for(const watch of [...watchers]){try{watch();}catch{}}};
 const ready=state=>appPushAllowed(state)&&Boolean(state.subscriptionId);
 // The first answer that settles it, or the latest one after `ms`. fresh: only answers that come from now on count.
 function answer(done,ms,{fresh=false}={}){
  return new Promise(resolve=>{
   const now=hub?.state??null;if(!hub||(!fresh&&now&&done(now))){resolve(now);return;}
   let timer=null;
   const off=hub.onChange(state=>{if(!done(state))return;timers.clearTimeout(timer);off();resolve(state);});
   timer=timers.setTimeout(()=>{off();resolve(hub.state??null);},ms);
  });
 }
 async function save(subscription){const {error}=await supabase.rpc('app_push_save',{p_subscription_id:subscription,p_enabled:true});if(error)throw new Error(FAILED);}
 // Every answer repaints Settings. A "Turn on" that is still wanted (Android's question took longer than the wait, the farmer allowed
 // them in the phone's settings, or the subscription id came later) is saved the moment the phone allows it.
 const unlisten=hub?.onChange(state=>{
  if(wanted&&!asking&&ready(state)){wanted=false;void save(state.subscriptionId).catch(()=>{wanted=true;}).finally(tell);return;}
  tell();
 });
 // On for the farmer: any of their phones turned on (the farmer's own row; row-level security shows no one else's).
 async function farmerOn(){
  const {data,error}=await supabase.from('app_push_devices').select('enabled').eq('enabled',true).limit(1);
  if(error)throw error;return Array.isArray(data)&&data.length>0;
 }
 // off | blocked | on, as src/push.js (an app always can, so never unsupported or install-first).
 async function status(){
  let state=hub?.state??null;
  if(!state){void open(APP_PUSH.status);state=await answer(Boolean,statusWaitMs);}
  if(!state)return {kind:'off'};
  if(state.permission==='denied')return {kind:'blocked'};
  if(!appPushAllowed(state))return {kind:'off'};
  try{return {kind:await farmerOn()?'on':'off'};}catch{return {kind:'off'};}
 }
 return {
  app:true,
  status,
  // Only ever from the farmer's tap (Settings' "Turn on", yes to the reminder question, the gift's "Remind me").
  async enable(){
   wanted=true;asking=true;
   try{
    void open(APP_PUSH.register);
    // Already allowed: the app's answer only confirms it. Otherwise the answer to this question, not an older one.
    const state=await answer(s=>ready(s)||s.permission==='denied',waitMs,{fresh:!ready(hub?.state)});
    if(ready(state)){await save(state.subscriptionId);wanted=false;}
   }finally{asking=false;tell();}
   return status();
  },
  async disable(){
   wanted=false;
   const {error}=await supabase.rpc('app_push_save',{p_subscription_id:hub?.state?.subscriptionId||null,p_enabled:false});
   if(error)throw new Error(FAILED);
   tell();return status();
  },
  // Links this phone to the farmer (OneSignal's external_id), once per page load and again after a sign-in; the app answers with the state.
  async sync(){
   if(!playerId)return;
   try{if(win.harvestAppPushLinked===playerId)return;win.harvestAppPushLinked=playerId;}catch{return;}
   await open(appPushLoginLink(playerId));
  },
  // Sign out: this phone stops getting the farmer's notifications. The server forgets it first (it needs the session), then the app unlinks it.
  async detach(){
   wanted=false;
   const subscription=hub?.state?.subscriptionId;
   if(subscription){try{await supabase.rpc('app_push_forget',{p_subscription_id:subscription});}catch{}}
   forgetAppPushLink(win);
   await open(APP_PUSH.logout);
  },
  onChange(watch){watchers.add(watch);return()=>watchers.delete(watch);},
  // The farm closed (signed out, or opened again): this one stops listening, so an old "Turn on" never saves for the next farmer.
  dispose(){wanted=false;unlisten?.();watchers.clear();}
 };
}
