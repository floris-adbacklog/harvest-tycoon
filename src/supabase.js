import {createClient} from '@supabase/supabase-js';
import {describeFailure,connectionMessage,safeToRepeat,withRetry} from './connection.js';
import {enabledProviders} from './social-login.js';
import {chosenLanguage} from '../public/i18n.js';
import {LOAD_STALL_KEY} from '../public/loading-screen.js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isConfigured=Boolean(url&&key);
export const functionsUrl=url?`${url.replace(/\/$/,'')}/functions/v1`:null;
// CrazyGames (Oct 2026): public/crazygames.html (<html data-portal="crazygames">) signs in with sign-ins of its own (portalClient,
// src/crazygames.js), so there the website's saved sign-in is never read or refreshed. Everything below uses whichever is in use.
const portalPage=Boolean(globalThis.document?.documentElement?.dataset?.portal);
export let supabase=isConfigured&&!portalPage?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'}}):null;
export const supabaseKey=key;
export const portalClient=storageKey=>isConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storageKey}}):null;
export function useClient(client){supabase=client;}
// Which of Google / Facebook sign-in are switched on in Supabase (an empty list until they are).
export const socialProviders=()=>isConfigured?enabledProviders({url,key}):Promise.resolve([]);
export const validUsername=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());
export function cloudError(error){
 if(error?.code==='invalid_credentials')return 'The email address or password is incorrect.';
 if(error?.code==='email_not_confirmed')return 'Please confirm your email address using the link in your inbox.';
 return error?.message||'We could not connect. Please try again.';
}
// A check that never ends (11 Oct 2026, the 12% report again): getSession may first renew the sign-in over the network and getUser asks
// the server, both without a time limit of their own, and a farm request waits for that session before it goes out, a wait invoke's
// 20-second limit cannot end. On a connection that stalls, the loading screen stood at 4% ("Checking your account…") or 10% ("Opening
// your farm…") for good, and the pause screen's checks waited behind it. Each now ends after ACCOUNT_WAIT as a slow connection
// (transient): the pause screen, which keeps trying by itself (src/connection.js). A farm request that is late changes nothing: invoke's
// own limit has stopped it by then, so it never goes out after all.
export const ACCOUNT_WAIT=20000;
function inTime(work,ms){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Object.assign(new Error(connectionMessage('timeout',globalThis.navigator?.onLine)),{kind:'timeout',transient:true})),ms);
  work.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
 });
}
export function verifiedUser(){return inTime(checkUser(),ACCOUNT_WAIT);}
async function checkUser(){
 const {data:{session},error}=await supabase.auth.getSession();if(error)throw error;
 if(!session||session.user.is_anonymous)return null;
 const checked=await supabase.auth.getUser();
 if(checked.error){if(checked.error.status===401||checked.error.status===403)return null;const {kind,transient}=describeFailure(checked.error);throw Object.assign(checked.error,{kind,transient});}
 return checked.data.user?.is_anonymous?null:checked.data.user;
}
// One call to the farm. A failure says what kind it was (kind, transient) so the caller knows whether trying again can help.
// farm-api runs in Frankfurt, next to the database (1 Oct 2026). Left to itself it runs in the region nearest the player, and
// every database step then crosses the world: 1.2–1.7 s a tap in Asia against 0.5 s in Europe. One long hop per tap instead of
// one per step. The query parameter (not the x-region header) keeps the request free of a CORS preflight change.
export const FARM_API='farm-api?forceFunctionRegion=eu-central-1';
async function farmRequestOnce(body){
 const {data,error}=await inTime(supabase.functions.invoke(FARM_API,{body,timeout:20000}),ACCOUNT_WAIT+1000);
 if(error){let detail;try{detail=await error.context?.json();}catch{}
  const {kind,transient,status,code}=describeFailure(error,detail);
  const failure=new Error(detail?.error||connectionMessage(kind,globalThis.navigator?.onLine));
  Object.assign(failure,{status,code,kind,transient});throw failure;
 }
 return data;
}
// A request that cannot go wrong twice (see safeToRepeat) is repeated a few times when the connection fails, with the same
// body, so with the same request ID. {retry:false} is for checks that are repeated by the caller anyway.
// Every farm load says which time zone the device is in and which language the game is in: the admin dashboard shows the country
// the time zone belongs to (farm-api, time-zones.js) and the language.
const deviceTimeZone=()=>{try{return Intl.DateTimeFormat().resolvedOptions().timeZone||null;}catch{return null;}};
// And on what (13 Oct 2026, the measurement package; farm-api admin-analytics-service.js platformOf): a portal's own page (data-portal),
// our app (data-app, public/android-app.js), the web app opened from the home screen (pwa: as it opened, since full screen changes the
// display mode later, src/pwa.js), the website inside another site (frame) or a browser tab.
const openedStandalone=(()=>{try{return Boolean(globalThis.matchMedia?.('(display-mode: standalone)')?.matches||globalThis.navigator?.standalone===true);}catch{return false;}})();
export function pagePlatform(win=globalThis.window,standalone=openedStandalone){
 try{const html=win.document.documentElement,portal=html.getAttribute('data-portal');if(portal)return portal;if(html.getAttribute('data-app')==='android')return 'app';if(standalone)return 'pwa';return win.top!==win?'frame':'browser';}catch{return null;}
}
// A reminder that opened the game (13 Oct 2026, src/main.js: 'push' or 'email'): the next farm load takes it along, once (opened), for the
// "Opened the game" line in the farmer's log (farm-api player-log.js loadLog).
let openedFrom=null;
export function openedBy(source){if(source==='push'||source==='email')openedFrom=source;}
const takeOpened=()=>{const source=openedFrom;openedFrom=null;return source?{opened:source}:{};};
// A load that stalled (15 Oct 2026, the 12% report, option 5; public/loading-screen.js LOAD_STALL_KEY): the note the farm page or this page
// left in this tab goes along with the next farm load, once, for farm-api's count of stalls (load-stall-service.js); one older than 6
// hours is dropped. A page that went while still loading ('left'), with this page opened by a reload: the player refreshed by hand
// ('refresh'). Not a note written after this page started (its farm frame, taken away while it loaded): that one stays 'left'.
const STALL_MAX_AGE=6*3600000,pageStarted=Date.now();
const takeStall=()=>{
 let note=null;try{const store=globalThis.sessionStorage,raw=store?.getItem(LOAD_STALL_KEY);if(raw==null)return {};store.removeItem(LOAD_STALL_KEY);note=JSON.parse(raw);}catch{return {};}
 const now=Date.now();if(!note||typeof note!=='object'||Array.isArray(note)||typeof note.at!=='number'||!(now-note.at>=0&&now-note.at<=STALL_MAX_AGE))return {};
 let arrival='';try{arrival=globalThis.performance.getEntriesByType('navigation')[0]?.type??'';}catch{}
 return {loadStall:note.kind==='left'&&arrival==='reload'&&note.at<=pageStarted?{...note,kind:'refresh'}:note};
};
export function farmRequest(body,{retry=true}={}){const sent=body?.operation==='load'?{...body,timeZone:deviceTimeZone(),language:chosenLanguage(),platform:pagePlatform(),...takeOpened(),...takeStall()}:body;return withRetry(()=>farmRequestOnce(sent),{repeatable:retry&&safeToRepeat(sent)});}
export async function paymentRequest(body){
 const {data,error}=await supabase.functions.invoke('diamond-checkout',{body,timeout:20000});
 if(error){let detail;try{detail=await error.context?.json();}catch{}throw new Error(detail?.error||'Could not connect to checkout. Please try again.');}
 return data;
}
