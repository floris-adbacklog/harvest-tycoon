// The Android app (Oct 2026): public/android-app.js marks the page <html data-app="android"> before it is drawn (the page around the
// game and the game frame); the code asks here. On harvesttycoon.com in a browser and on CrazyGames this is always false.
// True in the Android app: this page is marked, or the page around this frame is.
export function androidApp(win=globalThis.window){
 const marked=w=>{try{return w?.document?.documentElement?.getAttribute?.('data-app')==='android';}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
// The app's own share sheet (agreed with the Android app; the WebView has no navigator.share): the page goes to
// shareapp://shareapp?<message>&url=<url>, both parts encoded in full, and the app shares "message", a new line and the link. A message
// that ends with the link already (Share my farm's text) gives it up here, so the link comes once.
export const APP_SHARE='shareapp://shareapp';
export function appShareLink(message,url=''){
 const link=String(url??'').trim();let text=String(message??'').trim();
 if(link&&text.endsWith(link))text=text.slice(0,-link.length).trimEnd();
 return `${APP_SHARE}?${encodeURIComponent(text)}&url=${encodeURIComponent(link)}`;
}
// Only from the farmer's tap. host: the page around the game (the app's main frame, where the app sees the address); the page stays.
export function shareInApp({text,url},host=globalThis.window){
 try{host.location.href=appShareLink(text,url);return true;}catch{return false;}
}

// Push notifications in the app (Oct 2026, through OneSignal; agreed with the Android app). The page around the game asks the app by
// going to one of these addresses, as Share does (the app only sees the main frame), and the app answers on that page by calling
// window.harvestAppPush({permission:'granted'|'denied'|'default',optedIn,subscriptionId,externalId,version}): after login,
// registerpush and pushstatus, and whenever the phone's permission or the subscription changes.
// - login: links this phone to the farmer (OneSignal's external_id = the player id); once per page load, and again after a sign-in.
// - logout: Sign out; this phone stops getting that farmer's notifications.
// - register: asks Android's permission (the Android 13+ question) and opts the phone in. Only ever from the farmer's own tap.
// - status: the app answers with the state as it is, asking nothing.
export const APP_PUSH=Object.freeze({login:'onesignallogin://login',logout:'onesignallogout://logout',register:'registerpush://',status:'pushstatus://status'});
export const appPushLoginLink=id=>`${APP_PUSH.login}?id=${encodeURIComponent(String(id??''))}`;
// The phone said no to notifications for the app (a question Android asks once or twice): Settings, the reminder question and the
// daily gift's "Remind me" say where to allow them again, instead of the browser's own words.
export const APP_PUSH_BLOCKED='Notifications are off for Harvest Tycoon on this phone. You can allow them in your phone settings.';
const PERMISSIONS=['granted','denied','default'];
// What the app reports, checked: anything unexpected reads as "not allowed" and an empty subscription.
export function readAppPush(raw){
 const text=(value,max)=>typeof value==='string'&&value.length<=max&&/^[\w.:-]*$/.test(value)?value:'';
 return Object.freeze({permission:PERMISSIONS.includes(raw?.permission)?raw.permission:'default',optedIn:raw?.optedIn===true,
  subscriptionId:text(raw?.subscriptionId,128),externalId:text(raw?.externalId,128),version:text(raw?.version,32)});
}
// The phone can show the app's notifications: permission given and the phone opted in.
export const appPushAllowed=state=>state?.permission==='granted'&&state.optedIn===true;
// The page around the game keeps the latest answer (window.harvestAppPushState) and tells whoever listens. Installed once per page;
// listenAppPush on an installed page only adds a listener.
export function listenAppPush(win=globalThis.window){
 if(!win)return null;
 let hub=win.harvestAppPushHub;
 if(!hub){
  hub={listeners:new Set()};
  try{Object.defineProperty(win,'harvestAppPushHub',{value:hub,configurable:true});}catch{win.harvestAppPushHub=hub;}
  win.harvestAppPushState=win.harvestAppPushState??null;
  win.harvestAppPush=raw=>{const state=readAppPush(raw);win.harvestAppPushState=state;for(const listen of [...hub.listeners]){try{listen(state);}catch{}}};
 }
 return {get state(){return win.harvestAppPushState??null;},onChange(listen){hub.listeners.add(listen);return()=>hub.listeners.delete(listen);}};
}
// The latest answer for the game frame: from this page or, inside the frame, from the page around it (as androidApp() reads the mark).
export function appPushState(win=globalThis.window){
 const own=w=>{try{return w?.harvestAppPushState??null;}catch{return null;}};
 const here=own(win);if(here)return here;
 try{return win?.parent&&win.parent!==win?own(win.parent):null;}catch{return null;}
}
