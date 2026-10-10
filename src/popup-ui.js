import {refreshArt} from '../public/visual-icons.js';
import {rookieLeft} from '../public/farm-state.js';
import {chosenLanguage} from '../public/i18n.js';
import {portal,portalOff} from '../public/portal.js';
import {androidApp,googlePlayApp} from '../public/android.js';

// Pop-ups from the admin (supabase/popups.sql, 26 Sep 2026): news that also opens once as a pop-up, with an optional button to a
// screen of the game or to a web page (in a new tab); the admin can also send it without the news. Who sees it: everyone, phones in
// the browser, anyone in the browser, phones or computers, or (9 Oct 2026) our Android app from Google Play or our website (decided
// here, on the device: nothing records who installed the app), and from a farm level (decided by the server). Never in a farmer's first
// half hour, and never over another window: it waits until nothing else is open.
export const POPUP_SCREENS=Object.freeze({install:'How to install the app',today:'Daily gift',events:'Events',leaderboard:'Leaderboard',chat:'Chat',shop:'Diamond shop',family:'Farm family',wiki:'How to play',feedback:'Feedback'});
export const POPUP_AUDIENCES=Object.freeze({all:'Everyone',phone_browser:'Phones in the browser',browser:'In the browser (phone or computer)',phone:'Phones only',desktop:'Computers only',android_app:'Android app (Google Play)',web:'Website (not the apps or the game portals)'});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Web addresses in news and pop-ups open in a new tab (https only; the text around them stays plain text). On CrazyGames (Oct 2026,
// public/portal.js) no links out are allowed: the address stays plain text there.
export const linkify=text=>portalOff('links')?esc(text):esc(text).replace(/https:\/\/[^\s<]+[^\s<.,!?;:)'"]/g,url=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${url.replace(/^https:\/\//,'')}</a>`);
// The admin's own text in the language the game plays in (supabase/admin-texts-languages.sql, 1 Oct 2026), part by part: English for
// a part that language has no text of its own for. `own` lists the parts in that language, which the page's translation leaves alone.
export function inLanguage(item,code=chosenLanguage()){
 const texts=code!=='en'&&item?.texts?.[code]||{},own=new Set(['title','body','buttonLabel'].filter(key=>texts[key]&&item?.[key]));
 return {...item,...Object.fromEntries([...own].map(key=>[key,texts[key]])),own};
}
// A group this list does not know is never shown, as in every version since 26 Sep 2026: a game from before the Android app group (9 Oct
// 2026) skips its pop-ups and leaves them unseen, so the farmer still gets them once the game knows the group. playApp: public/android.js
// googlePlayApp (only the special offer leaves it out: no offer goes to that group). The website group (9 Oct 2026, web): harvesttycoon.com
// in a browser or on the home screen, itch.io's frame too; never in our apps (Android, iPhone, Galaxy Store) or on a game portal
// (CrazyGames, Kongregate, Discord: no links out there; 'browser' does include those portals). A game from before it skips it, as above;
// the offer passes no web.
export function fitsDevice(audience,{installed,phone,playApp=false,web=false}){
 return audience==='all'||(audience==='browser'&&!installed)||(audience==='phone_browser'&&phone&&!installed)||(audience==='phone'&&phone)||(audience==='desktop'&&!phone)||(audience==='android_app'&&playApp===true)||(audience==='web'&&web===true);
}

export function createPopupUI({client,chat,state,doc=document,win=window,now=()=>Date.now()}){
 const dialog=doc.createElement('dialog');dialog.id='popup-dialog';dialog.setAttribute('aria-labelledby','popup-title');doc.body.append(dialog);
 // Our Android app (Oct 2026, public/android.js) counts as installed: a pop-up for players in the browser is not for it.
 // The Android app group (9 Oct 2026): only our Google Play app, never the iPhone app, a browser or a portal. The website group: no app
 // marks the page and no portal is around it (public/portal.js).
 const device=()=>({installed:doc.documentElement.dataset.appMode==='standalone'||androidApp(win),phone:Boolean(win.matchMedia?.('(pointer: coarse)').matches),playApp:googlePlayApp(win),web:!androidApp(win)&&!portal(win)});
 const click=id=>doc.getElementById(id)?.click();
 const screens={install:()=>win.harvestWiki?.('getting-started','sec-play-it-as-an-app'),today:()=>win.harvestToday?.(),events:()=>click('events-button'),
  leaderboard:()=>click('leaderboard-button'),chat:()=>chat?.open(),shop:()=>win.harvestShop?.open(),family:()=>click('family-button'),wiki:()=>click('help-button'),
  // The Feedback window (5 Oct 2026): ask farmers what they think, straight from a pop-up or News.
  feedback:()=>click('feedback-button')};
 function go(target){
  if(target.startsWith('https://')){win.open(target,'_blank','noopener,noreferrer');return;}
  screens[target.replace(/^screen:/,'')]?.();
 }
 function show(shown){
  const popup=inLanguage(shown),button=popup.buttonLabel&&popup.buttonTarget,keep=key=>popup.own.has(key)?' translate="no"':'';
  // On CrazyGames (Oct 2026, public/portal.js) a button to a web page or to installing the app is left out: neither is allowed there.
  // In our Android app (Oct 2026) the button to installing the web app is left out: the app is installed.
  const offered=button&&!(portalOff('links')&&/^https:\/\/|^(screen:)?install$/.test(popup.buttonTarget))&&!(androidApp(win)&&/^(screen:)?install$/.test(popup.buttonTarget));
  dialog.innerHTML=`<button type="button" class="popup-close" data-popup-close aria-label="Close">×</button><img class="popup-art" src="/assets/harvest-tycoon-logo.webp" alt="" width="88" height="88" draggable="false"><h2 id="popup-title"${keep('title')}>${esc(popup.title)}</h2><p${keep('body')}>${linkify(popup.body)}</p>`
   +(offered?`<button type="button" class="primary-button" data-popup-go><span${keep('buttonLabel')}>${esc(popup.buttonLabel)}</span>${popup.buttonTarget.startsWith('https://')?' ↗':''}</button><button type="button" class="popup-later" data-popup-close>Not now</button>`:'<button type="button" class="primary-button" data-popup-close>Got it</button>');
  dialog.onclick=event=>{
   if(event.target.closest('[data-popup-go]')){dialog.close();go(popup.buttonTarget);}
   else if(event.target.closest('[data-popup-close]'))dialog.close();
  };
  refreshArt();dialog.showModal();
  // Seen once it is on screen: it does not come back, on this device or another.
  client.popupSeen(popup.id).catch(()=>{});
 }
 async function start(){
  if(!client?.popups||rookieLeft(state,now())>0)return;
  let list;try{list=await client.popups();}catch{return;}
  const popup=(list??[]).find(p=>fitsDevice(p.audience,device()));if(!popup)return;
  const quiet=()=>!doc.querySelector('dialog[open]');
  if(quiet()){show(popup);return;}
  const timer=win.setInterval(()=>{if(quiet()){win.clearInterval(timer);show(popup);}},2000);
 }
 return {start,show};
}
