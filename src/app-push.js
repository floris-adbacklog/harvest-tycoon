// Push notifications in our Android app (Oct 2026): the app's own notifications through OneSignal instead of the browser's, with the
// same face as src/push.js (status, enable, disable, sync, detach), so Settings, the reminder question and the daily gift's "Remind me"
// work as on the website. It runs on the page around the game and talks to the app through public/android.js (APP_PUSH): the page goes
// to an address the app catches, the app answers with window.harvestAppPush.
// OneSignal finds the farmer's phones by the player id (OneSignal.login on every phone the farmer is signed in on), so on or off is the
// farmer's, not a phone's: the server (supabase/app-push.sql, app_push_players) keeps only that, once the farmer turned them on with a
// tap and this phone allows them. "On" here: this phone allows notifications and the farmer has them on. Turn off switches them off for
// the farmer (every phone); Sign out only unlinks this phone from the farmer (logout), so the farmer's other phones keep theirs.
import {APP_PUSH,appPushLoginLink,listenAppPush,appPushAllowed} from '../public/android.js';
export const APP_PUSH_WAIT_MS=60000;    // the farmer answering Android's question, and the phone's subscription after a yes
export const APP_STATUS_WAIT_MS=3000;   // the app answering "how is it?"
export const APP_LINK_GAP_MS=400;       // between two addresses, so the app sees each one
const FAILED='That did not work. Please try again.';
const deviceTimezone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{return 'UTC';}};

// Which farmer this page linked the phone to (once per page load; a sign-in links again: forgetAppPushLink on the sign-in card).
export function forgetAppPushLink(win=globalThis.window){try{if(win)win.harvestAppPushLinked=null;}catch{}}

// timezone: this phone's time zone, for a farmer whose reminder settings are made by turning these on (quiet hours, 09:00 and 19:00).
export function createAppPush({supabase,playerId=null,win=globalThis.window,timers=globalThis,clock=()=>Date.now(),timezone=deviceTimezone,
 waitMs=APP_PUSH_WAIT_MS,statusWaitMs=APP_STATUS_WAIT_MS,gapMs=APP_LINK_GAP_MS}){
 const hub=listenAppPush(win),watchers=new Set();
 let chain=Promise.resolve(),last=-Infinity,wanted=false,asking=false;
 const sleep=ms=>new Promise(resolve=>timers.setTimeout(resolve,ms));
 // One address at a time, a moment apart: a second address straight after the first would cancel it before the app sees it.
 // sent: told the moment the page goes to the address.
 function open(link,sent=()=>{}){
  chain=chain.then(async()=>{const wait=last+gapMs-clock();if(wait>0)await sleep(wait);sent();try{win.location.href=link;}catch{}last=clock();});
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
 // On for the farmer. A farmer without reminder settings yet gets them in this phone's time zone (not the server's UTC).
 async function save(){
  let zone='UTC';try{zone=String(timezone()||'UTC');}catch{}
  const {error}=await supabase.rpc('app_push_save',{p_enabled:true,p_timezone:zone});if(error)throw new Error(FAILED);
 }
 // Every answer repaints Settings. A "Turn on" that is still wanted (the phone's subscription came after the wait, the farmer said no
 // and then allowed them in the phone's settings) is saved the moment the phone allows it.
 const unlisten=hub?.onChange(state=>{
  if(wanted&&!asking&&ready(state)){wanted=false;void save().catch(()=>{wanted=true;}).finally(tell);return;}
  tell();
 });
 // On for the farmer (the farmer's own row; row-level security shows no one else's).
 async function farmerOn(){
  const {data,error}=await supabase.from('app_push_players').select('enabled').eq('enabled',true).limit(1);
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
  // The app answers once the farmer answered Android's question. Not allowed (Android says 'default' after a first "Don't allow" and
  // 'denied' after the second): that first answer settles it at once, as blocked, so the farmer reads where to allow them. Allowed:
  // the phone's subscription can come a moment later, so only that waits (at most waitMs).
  async enable(){
   wanted=true;asking=true;let refused=false;
   try{
    const now=hub?.state??null;let sent=false,answered=false;
    void open(APP_PUSH.register,()=>{sent=true;});
    // Already allowed: the app's answer only confirms it. Otherwise only an answer that came after the question went out.
    const state=ready(now)?now:await answer(s=>(answered=sent&&(ready(s)||s.permission!=='granted')),waitMs,{fresh:true});
    if(ready(state)){await save();wanted=false;}
    else refused=answered&&state?.permission!=='granted';
   }finally{asking=false;tell();}
   return refused?{kind:'blocked'}:status();
  },
  async disable(){
   wanted=false;
   const {error}=await supabase.rpc('app_push_save',{p_enabled:false});
   if(error)throw new Error(FAILED);
   tell();return status();
  },
  // Links this phone to the farmer (OneSignal's external_id), once per page load and again after a sign-in; the app answers with the state.
  async sync(){
   if(!playerId)return;
   try{if(win.harvestAppPushLinked===playerId)return;win.harvestAppPushLinked=playerId;}catch{return;}
   await open(appPushLoginLink(playerId));
  },
  // Sign out: this phone stops getting the farmer's notifications (the app unlinks it); on or off stays the farmer's, for their other phones.
  async detach(){
   wanted=false;
   forgetAppPushLink(win);
   await open(APP_PUSH.logout);
  },
  onChange(watch){watchers.add(watch);return()=>watchers.delete(watch);},
  // The farm closed (signed out, or opened again): this one stops listening, so an old "Turn on" never saves for the next farmer.
  dispose(){wanted=false;unlisten?.();watchers.clear();}
 };
}
