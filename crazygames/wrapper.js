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

export function createWrapper({sdk,frame,environment,gameOrigin,win}){
 const post=message=>{try{frame.contentWindow?.postMessage({ns:NS,...message},gameOrigin);}catch{}};
 const settings=value=>({muteAudio:value?.muteAudio===true,disableChat:value?.disableChat===true});
 async function init(){
  let userAvailable=false,user=null,locale=null,now={};
  try{userAvailable=sdk.user.isUserAccountAvailable===true;}catch{}
  try{locale=sdk.user.systemInfo?.locale??null;}catch{}
  try{now=sdk.game.settings;}catch{}
  if(userAvailable){try{user=userOf(await sdk.user.getUser());}catch{}}
  return {type:'init',environment,locale:typeof locale==='string'?locale:null,settings:settings(now),userAvailable,user};
 }
 async function handle(event){
  if(event.source!==frame.contentWindow||event.origin!==gameOrigin||!allowedOrigin(event.origin,environment))return;
  const data=event.data;if(!data||typeof data!=='object'||data.ns!==NS||typeof data.type!=='string')return;
  const id=typeof data.id==='string'&&data.id.length<=40?data.id:null;
  if(data.type==='hello'){post(await init());return;}
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
  if(data.type==='event'&&SDK_EVENTS.includes(data.name)){try{sdk.game[data.name]();}catch{}}
 }
 const listener=event=>{void handle(event);};
 win.addEventListener('message',listener);
 try{sdk.game.addSettingsChangeListener(next=>post({type:'settings',settings:settings(next)}));}catch{}
 try{sdk.user.addAuthListener(user=>post({type:'auth',user:userOf(user)}));}catch{}
 return {handle,dispose:()=>win.removeEventListener('message',listener)};
}

async function start(){
 const sdk=globalThis.CrazyGames?.SDK;let environment='disabled';
 try{await sdk.init();environment=sdk.environment;}catch{}
 const address=gameAddress(location.search,environment),frame=document.createElement('iframe');
 frame.id='game';frame.title='Harvest Tycoon';frame.allow='autoplay; clipboard-write; web-share';frame.src=address;
 createWrapper({sdk,frame,environment,gameOrigin:new URL(address).origin,win:window});
 document.body.append(frame);
}
if(typeof document!=='undefined'&&typeof window!=='undefined')void start();
