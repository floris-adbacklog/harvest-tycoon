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
