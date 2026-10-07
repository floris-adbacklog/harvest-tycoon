import {LANGUAGES} from '../public/languages.js';
// The game page's side of the talk with the CrazyGames wrapper (Oct 2026). CrazyGames hosts a small page of ours (crazygames/,
// uploaded as a zip) that runs their SDK and shows this page, https://www.harvesttycoon.com/crazygames.html, in a frame. The two talk
// with postMessage, every message {ns:'harvest-cg', type, ...}:
//   game → wrapper: hello (answered with init: environment, locale, settings, userAvailable, user), token (a fresh CrazyGames token,
//   or null for a guest), authPrompt (CrazyGames' own log-in window, only ever from a player's tap) and event (loadingStart,
//   loadingStop, gameplayStart, gameplayStop, happytime; no answer).
//   wrapper → game: settings (muteAudio, disableChat changed) and auth (a player logged in or out).
// Only the page that holds this one (window.parent) on a crazygames.com address is listened to, and on a computer of our own
// (localhost) also a local wrapper for testing. The token only ever goes to that wrapper's address.
export const NS='harvest-cg';
export const WRAPPER_ORIGIN=/^https:\/\/([a-z0-9-]+\.)*crazygames\.com$/;
export const LOCAL_ORIGIN=/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;
export const SDK_EVENTS=Object.freeze(['loadingStart','loadingStop','gameplayStart','gameplayStop','happytime']);
export const isLocalHost=hostname=>hostname==='localhost'||hostname==='127.0.0.1';
export function trustedWrapper(origin,{local=false}={}){return typeof origin==='string'&&(WRAPPER_ORIGIN.test(origin)||(local&&LOCAL_ORIGIN.test(origin)));}
// What init may carry, and nothing else.
export function cleanInit(data){
 const user=data?.user&&typeof data.user.username==='string'?{username:data.user.username.slice(0,40)}:null;
 return {environment:['crazygames','local','disabled'].includes(data?.environment)?data.environment:'disabled',locale:typeof data?.locale==='string'?data.locale.slice(0,20):null,
  settings:cleanSettings(data?.settings),userAvailable:data?.userAvailable===true,user};
}
export const cleanSettings=settings=>({muteAudio:settings?.muteAudio===true,disableChat:settings?.disableChat===true});
// The game's language from CrazyGames' locale ("pt-BR" → pt): one of the languages the game is translated into, else English.
export function portalLanguage(locale){
 const code=String(locale??'').slice(0,2).toLowerCase();
 return LANGUAGES.some(l=>l.ready&&l.code===code)?code:'en';
}

// The link from this page. Without a wrapper answering within `wait` ms (a page opened on its own, a wrapper that broke) the game
// still starts, as a guest without CrazyGames (environment 'disabled'). 15 s (7 Oct 2026, was 5): the wrapper now starts this page
// while CrazyGames' own SDK is still starting (up to about 12 s on a slow computer), and a logged-in player must not end up a guest.
export function createWrapperLink({win=globalThis.window,parent=win?.parent,local=false,wait=15000,tokenWait=15000,timers=globalThis}={}){
 let origin=null,counter=0,initDone;
 const pending=new Map(),settingsListeners=new Set(),authListeners=new Set();
 const init=new Promise(resolve=>{initDone=resolve;});
 const send=message=>{try{parent.postMessage({ns:NS,...message},origin??'*');}catch{}};
 function onMessage(event){
  if(!parent||event.source!==parent||!trustedWrapper(event.origin,{local}))return;
  const data=event.data;if(!data||typeof data!=='object'||data.ns!==NS||typeof data.type!=='string')return;
  if(data.type==='init'){if(origin&&event.origin!==origin)return;origin=event.origin;initDone(cleanInit(data));return;}
  if(!origin||event.origin!==origin)return;
  if(data.type==='token'||data.type==='authPrompt'){const wanted=pending.get(data.id);if(!wanted||wanted.type!==data.type)return;pending.delete(data.id);timers.clearTimeout(wanted.timer);wanted.resolve(data);return;}
  if(data.type==='settings'){const next=cleanSettings(data.settings);for(const fn of settingsListeners)try{fn(next);}catch{}return;}
  if(data.type==='auth'){const user=data.user&&typeof data.user.username==='string'?{username:data.user.username.slice(0,40)}:null;for(const fn of authListeners)try{fn(user);}catch{}}
 }
 win?.addEventListener?.('message',onMessage);
 // A request that waits for its own answer: the same id and the same type.
 function ask(type,limit){
  if(!origin)return Promise.resolve({type,ok:false,token:null,error:'noWrapper'});
  const id=`${type}-${++counter}`;
  return new Promise(resolve=>{const timer=limit?timers.setTimeout(()=>{pending.delete(id);resolve({type,id,ok:false,token:null,error:'timeout'});},limit):null;pending.set(id,{type,resolve,timer});send({type,id});});
 }
 function hello(){
  if(!parent||parent===win){initDone(cleanInit(null));return init;}
  send({type:'hello'});timers.setTimeout(()=>initDone(cleanInit(null)),wait);
  return init;
 }
 return {
  hello,
  get origin(){return origin;},
  // A fresh token on every start (CrazyGames' rule); null for a guest, on a problem or without a wrapper.
  async token(){const answer=await ask('token',tokenWait);return typeof answer.token==='string'&&answer.token?answer.token:null;},
  async authPrompt(){const answer=await ask('authPrompt',0);return {ok:answer.ok===true,error:typeof answer.error==='string'?answer.error:undefined};},
  event(name){if(origin&&SDK_EVENTS.includes(name))send({type:'event',name});},
  onSettings(fn){settingsListeners.add(fn);return()=>settingsListeners.delete(fn);},
  onAuth(fn){authListeners.add(fn);return()=>authListeners.delete(fn);},
  dispose(){win?.removeEventListener?.('message',onMessage);for(const {timer} of pending.values())timers.clearTimeout(timer);pending.clear();}
 };
}
// A stand-in for the wrapper when this page is opened on its own on a computer of our own (http://localhost:…/crazygames.html): a
// guest, nothing muted, the chat allowed, no CrazyGames account. Only for trying the page out; on our real address the page sends a
// visitor who opens it on its own to the website instead (src/crazygames.js).
export function localStandIn({locale=globalThis.navigator?.language??'en'}={}){
 const init=cleanInit({environment:'local',locale,settings:{},userAvailable:false,user:null});
 return {hello:async()=>init,origin:null,token:async()=>null,authPrompt:async()=>({ok:false,error:'local'}),event(){},onSettings:()=>()=>{},onAuth:()=>()=>{},dispose(){}};
}
