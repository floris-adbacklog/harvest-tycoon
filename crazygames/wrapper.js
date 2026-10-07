// The page CrazyGames hosts for Harvest Tycoon (Oct 2026): uploaded once as a zip (scripts/build-crazygames.mjs), it runs the CrazyGames
// SDK and shows the live game, https://www.harvesttycoon.com/crazygames.html, in a frame that fills it. A push to the website updates
// the game without a new upload; only a change to this folder needs one. The game asks for what the SDK knows through postMessage
// ({ns:'harvest-cg', ...}, src/crazygames-link.js has the game's side): hello → init, token, authPrompt and the SDK events. Only our
// own game frame on www.harvesttycoon.com is answered (and a game on localhost while CrazyGames' SDK runs locally, for testing).
export const NS='harvest-cg';
export const GAME_URL='https://www.harvesttycoon.com/crazygames.html';
export const GAME_ORIGIN='https://www.harvesttycoon.com';
export const LOCAL_ORIGIN=/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
export const SDK_EVENTS=Object.freeze(['loadingStart','loadingStop','gameplayStart','gameplayStop','happytime']);
export const allowedOrigin=(origin,environment)=>origin===GAME_ORIGIN||(environment==='local'&&LOCAL_ORIGIN.test(String(origin)));
// The game to show: ours, or with CrazyGames' SDK running locally (?useLocalSdk=true) a local one for testing (?game=http://localhost:…).
export function gameAddress(search,environment){
 if(environment==='local'){
  try{const asked=new URLSearchParams(search).get('game');if(asked){const url=new URL(asked);if(allowedOrigin(url.origin,'local'))return url.href;}}catch{}
 }
 return GAME_URL;
}
const errorCode=error=>typeof error?.code==='string'?error.code:'unexpectedError';
const userOf=user=>user&&typeof user.username==='string'?{username:user.username}:null;

// environment: the SDK's, or the promise of it while sdk.init() still runs (7 Oct 2026): the frame is made at once and may ask
// before the SDK is ready, so every request waits for init, and nothing reaches the SDK before it.
export function createWrapper({sdk,frame,environment,gameOrigin,win,onHello=()=>{}}){
 const ready=Promise.resolve(environment);
 const post=message=>{try{frame.contentWindow?.postMessage({ns:NS,...message},gameOrigin);}catch{}};
 const settings=value=>({muteAudio:value?.muteAudio===true,disableChat:value?.disableChat===true});
 // One loadingStart for one loadingStop: the wrapper says the first as soon as the SDK is ready, so the game's own counts as said.
 let loading=false;
 function sdkEvent(name){
  if(name==='loadingStart'){if(loading)return;loading=true;}else if(name==='loadingStop'){if(!loading)return;loading=false;}
  try{sdk.game[name]();}catch{}
 }
 async function init(environment){
  let userAvailable=false,user=null,locale=null,now={};
  try{userAvailable=sdk.user.isUserAccountAvailable===true;}catch{}
  try{locale=sdk.user.systemInfo?.locale??null;}catch{}
  try{now=sdk.game.settings;}catch{}
  if(userAvailable){try{user=userOf(await sdk.user.getUser());}catch{}}
  return {type:'init',environment,locale:typeof locale==='string'?locale:null,settings:settings(now),userAvailable,user};
 }
 async function handle(event){
  if(event.source!==frame.contentWindow||event.origin!==gameOrigin)return;
  const data=event.data;if(!data||typeof data!=='object'||data.ns!==NS||typeof data.type!=='string')return;
  // The game's page has its own loading screen up: the frame can show (index.html keeps ours until then).
  if(data.type==='hello')onHello();
  const environment=await ready;if(!allowedOrigin(event.origin,environment))return;
  const id=typeof data.id==='string'&&data.id.length<=40?data.id:null;
  if(data.type==='hello'){post(await init(environment));return;}
  // A fresh token every time it is asked (the SDK renews it; it is never kept here). A guest: no token, and that is no error.
  if(data.type==='token'&&id){
   try{const token=await sdk.user.getUserToken();post({type:'token',id,token:typeof token==='string'&&token?token:null});}
   catch(error){const code=errorCode(error);post({type:'token',id,token:null,...(code==='userNotAuthenticated'?{}:{error:code})});}
   return;
  }
  // CrazyGames' own log-in window: only when a player taps "Log in with CrazyGames" in the game, never by itself.
  if(data.type==='authPrompt'&&id){
   try{await sdk.user.showAuthPrompt();post({type:'authPrompt',id,ok:true});}
   catch(error){post({type:'authPrompt',id,ok:false,error:errorCode(error)});}
   return;
  }
  if(data.type==='event'&&SDK_EVENTS.includes(data.name))sdkEvent(data.name);
 }
 const listener=event=>{void handle(event);};
 win.addEventListener('message',listener);
 // Once the SDK is ready: loading has started (CrazyGames: say it when loading starts; the game page could only say it after its own
 // download and hello), and the settings and log-ins as they change.
 void ready.then(()=>{
  sdkEvent('loadingStart');
  try{sdk.game.addSettingsChangeListener(next=>post({type:'settings',settings:settings(next)}));}catch{}
  try{sdk.user.addAuthListener(user=>post({type:'auth',user:userOf(user)}));}catch{}
 });
 return {handle,ready,dispose:()=>win.removeEventListener('message',listener)};
}

// The start (7 Oct 2026): the game's frame is made at once and downloads beside CrazyGames' SDK starting up (sdk.init()); before, it
// waited for init, on a flat green page. Only a local test (?useLocalSdk=true) waits for init first: its ?game= address counts only
// once the SDK says it runs locally. The frame stays invisible over our loading screen (index.html) until the game says hello; then it
// shows once its page has loaded, pictures and all, or at most SHOW_AFTER_HELLO ms later. A page that never says hello shows once loaded.
export const SHOW_AFTER_HELLO=1200;
export function startWrapper({sdk=globalThis.CrazyGames?.SDK,doc=globalThis.document,win=globalThis.window,search=globalThis.location?.search??'',timers=globalThis}={}){
 const ready=(async()=>{try{await sdk.init();return sdk.environment;}catch{return 'disabled';}})();
 function open(address){
  const frame=doc.createElement('iframe');let shown=false,said=false;
  frame.id='game';frame.title='Harvest Tycoon';frame.allow='autoplay; clipboard-write; web-share';frame.src=address;
  const show=()=>{if(shown)return;shown=true;frame.classList.add('shown');timers.setTimeout(()=>doc.getElementById('loading')?.remove(),600);};
  const onHello=()=>{if(said)return;said=true;timers.setTimeout(show,SHOW_AFTER_HELLO);};
  const wrapper=createWrapper({sdk,frame,environment:ready,gameOrigin:new URL(address).origin,win,onHello});
  doc.body.append(frame);frame.addEventListener('load',show);
  return {frame,wrapper};
 }
 if(new URLSearchParams(search).get('useLocalSdk')==='true')return ready.then(environment=>open(gameAddress(search,environment)));
 return Promise.resolve(open(GAME_URL));
}
if(typeof document!=='undefined'&&typeof window!=='undefined')void startWrapper();
