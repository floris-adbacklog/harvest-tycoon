// CrazyGames (Oct 2026): the same farm also runs inside CrazyGames. Their page loads ours, public/crazygames.html (src/crazygames.js),
// which hands the farm a portal on the bridge (bridge.portal; window.harvestPortal before the farm is there). CrazyGames allows no
// payments of our own, no sign-in of our own, no sign out, no links out to our site or an app, no invites and no full-screen button,
// so each of those is a feature that is off there; the farm asks here. On harvesttycoon.com there is no portal: everything is on and
// nothing here changes a thing.
import {androidApp,playBilling} from './android.js';
export const PORTAL_FEATURES=Object.freeze(['payments','invite','share','email','reminders','app','signOut','cookies','translate','links']);
// The portal of the page around this frame, or null (the website, a test, a page on its own).
export function portal(win=globalThis.window){
 try{
  if(!win||!win.parent||win.parent===win)return null;
  const found=win.parent.harvestBridge?.portal??win.parent.harvestPortal??null;
  return found&&typeof found==='object'&&typeof found.name==='string'?found:null;
 }catch{return null;}
}
// The Android app (Oct 2026, public/android.js): Google Play's rules leave no room for purchases of our own there, so payments are off
// as on CrazyGames (earned diamonds and spending them stay; what was bought on the website counts as always). Everything else is on.
// From the app 1.1 (play: public/android.js playBilling) the shop is there again, paid through Google Play (src/play-store.js).
export const APP_OFF=Object.freeze(['payments']);
// True only where a portal switched this feature off, or the Android app does.
export function portalOff(feature,found=portal(),app=androidApp(),play=playBilling()){return (Boolean(found)&&found.features?.[feature]===false)||(app&&APP_OFF.includes(feature)&&!(feature==='payments'&&play));}
// The chat on a portal (one rule each): 'off' when CrazyGames switches chat off (its disableChat setting), 'guest' for a guest (the
// chat is for players logged in with CrazyGames; they see a way to log in instead), else 'on'. Always 'on' on the website. A guest
// where CrazyGames has no accounts (portalLogIn false) cannot log in, so there the chat is simply not there (Oct 2026 review).
export function portalChat(found=portal()){
 if(!found)return 'on';
 if(found.settings?.disableChat)return 'off';
 if(!found.guest)return 'on';
 return portalLogIn(found)?'guest':'off';
}
// "Log in with CrazyGames" only where CrazyGames has accounts (their isUserAccountAvailable; false on sites that show CrazyGames'
// games without it).
export const portalLogIn=(found=portal())=>Boolean(found)&&found.userAvailable!==false;
// The privacy line on a portal: CrazyGames allows a link to our Privacy Policy (and only that), so it is the full address.
export const PRIVACY_URL='https://www.harvesttycoon.com/privacy';
export const privacyLine=()=>`By playing you agree to our <a href="${PRIVACY_URL}" target="_blank" rel="noopener">Privacy Policy</a>.`;
