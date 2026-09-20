import {pushEvent} from './analytics.js';

// What the "Farm app" block of the settings should offer on this device.
export function installState({standalone=false,ios=false,promptReady=false,secure=true,serviceWorker=true}={}){
 if(standalone)return {kind:'installed'};
 if(!secure||!serviceWorker)return {kind:'unsupported'};
 if(promptReady)return {kind:'prompt'};
 return {kind:ios?'ios':'manual'};
}

// Registers the service worker (installable app, later push) and keeps the browser's install prompt for
// the settings dialog, which lives in the game iframe and reads it from window.harvestPwa.
export function startPwa(win=globalThis.window){
 if(!win?.navigator)return null;
 const nav=win.navigator,listeners=new Set();let deferred=null;
 const standalone=()=>Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches||nav.standalone);
 const ios=()=>/iphone|ipad|ipod/i.test(nav.userAgent??'')||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1);
 const state=()=>installState({standalone:standalone(),ios:ios(),promptReady:Boolean(deferred),secure:win.isSecureContext!==false,serviceWorker:'serviceWorker' in nav});
 const notify=()=>{for(const listener of listeners){try{listener(state());}catch{}}};
 win.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferred=event;notify();});
 win.addEventListener('appinstalled',()=>{deferred=null;pushEvent('pwa_installed',{},win);notify();});
 if('serviceWorker' in nav){
  const register=()=>nav.serviceWorker.register('/sw.js',{scope:'/'}).catch(()=>{});
  if(win.document?.readyState==='complete')register();else win.addEventListener('load',register);
 }
 if(standalone())pushEvent('pwa_launch',{},win);
 const api={
  state,
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  async install(){
   if(!deferred)return {outcome:'unavailable'};
   const event=deferred;deferred=null;pushEvent('pwa_install_click',{},win);
   await event.prompt();const choice=await event.userChoice;notify();return choice;
  }
 };
 win.harvestPwa=api;
 return api;
}
