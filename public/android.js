// The Android app (Oct 2026): public/android-app.js marks the page <html data-app="android"> before it is drawn (the page around the
// game and the game frame); the code asks here. On harvesttycoon.com in a browser and on CrazyGames this is always false.
// True in the Android app: this page is marked, or the page around this frame is.
export function androidApp(win=globalThis.window){
 const marked=w=>{try{return w?.document?.documentElement?.getAttribute?.('data-app')==='android';}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
// Our Android app from Google Play (9 Oct 2026, the pop-up group "Android app"): marked data-app="android" without the iPhone app's
// data-app-os="ios" and without the Galaxy Store app's data-web-billing (the same wrapper, not from Google Play). Never in a browser and
// never on CrazyGames, Kongregate or itch: nothing marks those (public/android-app.js).
export function googlePlayApp(win=globalThis.window){
 const marked=w=>{try{const html=w?.document?.documentElement;return html?.getAttribute?.('data-app')==='android'&&html.getAttribute('data-app-os')!=='ios'&&!html.hasAttribute('data-web-billing');}catch{return false;}};
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
// - register: asks Android's permission (the Android 13+ question) and opts the phone in. Only ever from the farmer's own tap. While
//   Android's question is open the app reports nothing (AppPush.holdingState), so the next report is the farmer's answer.
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
// The app's own notifications are offered: notify-hourly's config says appPush (src/notifications.js; its OneSignal key is set). Read on the
// page around the game, where the bridge lives, or from the game frame through it (How to play mentions push reminders in the app only then).
export function appPushOffered(win=globalThis.window){
 const offered=w=>{try{return w?.harvestBridge?.notifications?.config?.appPush===true;}catch{return false;}};
 if(offered(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&offered(win.parent));}catch{return false;}
}
// The latest answer for the game frame: from this page or, inside the frame, from the page around it (as androidApp() reads the mark).
export function appPushState(win=globalThis.window){
 const own=w=>{try{return w?.harvestAppPushState??null;}catch{return null;}};
 const here=own(win);if(here)return here;
 try{return win?.parent&&win.parent!==win?own(win.parent):null;}catch{return null;}
}

// Purchases through Google Play (Oct 2026, the Android app 1.1; android-app PlayBilling.java). The app says it can with " PlayBilling/1"
// in its user agent; public/android-app.js then marks the page <html data-play-billing> (and the game frame), and the shop opens there
// as on the website (portal.js portalOff, android.css). Older app versions sell nothing; the iPhone app 1.1 sells through the App Store
// (below). The page around the game asks the app as it does for push: it goes to one of these addresses and the app answers with
// window.harvestPlay({...}) (src/play-store.js).
export function playBilling(win=globalThis.window){
 const marked=w=>{try{return w?.document?.documentElement?.hasAttribute?.('data-play-billing')===true;}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
export const PLAY_LINKS=Object.freeze({prices:'playprices://prices',buy:'playbuy://buy',pending:'playpending://pending'});
export const playPricesLink=ids=>`${PLAY_LINKS.prices}?ids=${ids.map(encodeURIComponent).join(',')}`;
export const playBuyLink=({product,account,purchase})=>`${PLAY_LINKS.buy}?product=${encodeURIComponent(product)}&account=${encodeURIComponent(account)}&purchase=${encodeURIComponent(purchase)}`;
// Purchases through the App Store (Oct 2026, the iPhone app 1.1; ios-app HarvestApp.swift HarvestStore). The app says it can with
// " AppStoreBilling/1" in its user agent; public/android-app.js then marks the page <html data-app-store-billing> (and the game frame).
// The same addresses as Google Play's, plus finish: the app finishes a purchase (StoreKit's Transaction.finish) only when the page sends
// it there, after diamond-checkout credited it; until then the App Store hands it back at every start. The app answers with
// window.harvestAppStore({...}) (src/app-store.js).
export function appStoreBilling(win=globalThis.window){
 const marked=w=>{try{return w?.document?.documentElement?.hasAttribute?.('data-app-store-billing')===true;}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
// The Galaxy Store app (Oct 2026): " WebBilling/1", marked <html data-web-billing> by public/android-app.js. It sells through Stripe on
// the website like a browser, the checkout opening in the phone's browser (src/main.js webPay); Samsung allows a game's own payments.
export function webBilling(win=globalThis.window){
 const marked=w=>{try{return w?.document?.documentElement?.hasAttribute?.('data-web-billing')===true;}catch{return false;}};
 if(marked(win))return true;
 try{return Boolean(win?.parent&&win.parent!==win&&marked(win.parent));}catch{return false;}
}
// The app sells, through its store or Stripe (<html data-app-billing> in public/android.css): the shop is open there (portalOff).
export const appBilling=(win=globalThis.window)=>playBilling(win)||appStoreBilling(win)||webBilling(win);
export const APP_STORE_LINKS=Object.freeze({prices:'appstoreprices://prices',buy:'appstorebuy://buy',pending:'appstorepending://pending',finish:'appstorefinish://finish'});
export const appStorePricesLink=ids=>`${APP_STORE_LINKS.prices}?ids=${ids.map(encodeURIComponent).join(',')}`;
export const appStoreBuyLink=({product,account,purchase})=>`${APP_STORE_LINKS.buy}?product=${encodeURIComponent(product)}&account=${encodeURIComponent(account)}&purchase=${encodeURIComponent(purchase)}`;
export const appStoreFinishLink=transaction=>`${APP_STORE_LINKS.finish}?transaction=${encodeURIComponent(transaction)}`;
// The price on a buy button: the app's store's own (the farmer's currency, catalog.prices from src/play-store.js or src/app-store.js)
// in the app, else the euro price as on the website (Stripe shows it in the farmer's currency at checkout). worth: an amount at the
// same rate as the pack's price (the special offer's "worth €49.99"), in the same currency.
const euro=cents=>`€${(Number(cents)/100).toFixed(2)}`;
export function shopPrice(catalog,pack,cents){const p=catalog?.prices?.[pack];return typeof p?.price==='string'&&p.price?p.price:euro(cents);}
export function shopWorth(catalog,pack,cents,worthCents){
 const p=catalog?.prices?.[pack];
 if(!p||!Number.isFinite(p.micros)||!/^[A-Z]{3}$/.test(p.currency??'')||!(cents>0))return euro(worthCents);
 try{return new Intl.NumberFormat(undefined,{style:'currency',currency:p.currency}).format(p.micros/1e6*worthCents/cents);}catch{return euro(worthCents);}
}
