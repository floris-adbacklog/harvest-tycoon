// The small sheet right after Buy (23 Oct 2026, the owner's options 1 and 4; the rules are in src/pay-ways.js). One compact card in the
// farm's own window style (public/payments.css .pay-choice): the pack as its title, then
//  - Pay by card (green, the default) and Pay with Google Play with its short line, on an Android phone in a browser; or
//  - where card payment cannot work, one short line that says so, with Google Play (Android) or the App Store (iPhone) when there is one.
// Google Play and the App Store open our app's page in a new tab in the tap itself (a page opened later is blocked as a pop-up); the
// app opens with the same account. It is drawn into the farm's own page (the game frame), where the window style lives; src/main.js
// hands that document over.
import {packName,playStoreLink,appStoreLink,askFirst} from './pay-ways.js';
import {APP_STORE_URL} from '../public/game-links.js';

const PICTURES={starter:'starter-pack',offer:'offer-hero',pass:'golden-pumpkin',season:'season-pass-autumn'};
export const packPicture=(pack,season)=>`/assets/icons/${pack==='season'&&/^winter/.test(String(season??''))?'season-pass-winter':PICTURES[pack]??'offer-diamonds'}.webp`;
const CLOSE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>';
const CARD='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/></svg>';
const PHONE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/></svg>';

// The choices as markup, for the sheet and the tests: [data-way="card"|"play"|"app_store"].
export function payChoiceHtml({pack,season,ways}){
 const name=packName(pack),blocked=!ways.card;
 const option=(way,icon,title,line,money=false)=>`<button type="button" class="pay-way${money?' is-go':''}" data-way="${way}"><span class="pay-way-icon">${icon}</span><span class="pay-way-text"><b>${title}</b>${line?`<small>${line}</small>`:''}</span></button>`;
 // Where card payment cannot work, the store may not take payments there either (Google Play and the App Store follow the same
 // sanctions): its line says so plainly instead of promising it.
 const stores=[ways.play&&option('play',PHONE,'Pay with Google Play',blocked?'In our app, where Google Play takes payments':'Phone credit, gift cards and local wallets'),
  ways.appStore&&option('app_store',PHONE,'Pay in the App Store','In our app, where the App Store takes payments')].filter(Boolean);
 return `<button type="button" class="pay-choice-close" aria-label="Close">${CLOSE}</button>`
  +`<img class="pay-choice-picture" src="${packPicture(pack,season)}" alt="" draggable="false"><h2 id="pay-choice-title">${name}</h2>`
  +(blocked?`<p class="pay-choice-line">Card payment is not available in your country.</p>`:'')
  +`<div class="pay-ways">${ways.card?option('card',CARD,'Pay by card','On a secure payment page',true):''}${stores.join('')}</div>`
  +(stores.length?`<p class="pay-choice-note">The app opens with your farm when you sign in with the same account.</p>`:'')
  +(blocked?`<p class="pay-choice-note">Diamonds you earn in the game keep working.</p>`:'');
}

// Shows the sheet; answers 'card', 'play', 'app_store' or null (closed). source: 'shop' or 'reminder', for the store link.
export function showPayChoice(doc,{pack,season=null,ways,source='shop',track=()=>{}}){
 return new Promise(resolve=>{
  const win=doc.defaultView??globalThis.window;
  const dialog=doc.createElement('dialog');dialog.className='game-dialog is-card is-s pay-choice';dialog.setAttribute('aria-labelledby','pay-choice-title');
  dialog.innerHTML=payChoiceHtml({pack,season,ways});
  if(!ways.card)dialog.dataset.blocked='';
  let answer=null;
  const done=way=>{answer=way;dialog.close();};
  dialog.addEventListener('close',()=>{dialog.remove();resolve(answer);});
  dialog.querySelector('.pay-choice-close').onclick=()=>done(null);
  for(const button of dialog.querySelectorAll('[data-way]'))button.onclick=()=>{
   const way=button.dataset.way;
   // The store's page opens in the tap itself, in a new tab: the farm stays where it is.
   if(way==='play'){track('pay_with_google_play');win?.open?.(playStoreLink(source),'_blank','noopener');}
   if(way==='app_store'){track('pay_with_app_store');win?.open?.(appStoreLink(APP_STORE_URL,source),'_blank','noopener');}
   done(way);
  };
  doc.body.append(dialog);
  track(ways.card?'pay_choice_shown':'card_unavailable_shown');
  dialog.showModal();
  dialog.focus?.({preventScroll:true});
 });
}

// bridge.checkout with the sheet in front of it where src/pay-ways.js askFirst says so: 'card' goes on to the card page as before;
// a store or a close answers {store} so the window that asked stops waiting (src/offer-ui.js and the others reset on done.store).
// more.way 'card' (the reminder's Try again) skips the sheet.
export function withPayChoice(checkout,{ways,doc,track=()=>{}}){
 return async(pack,requestId,offerId,more={})=>{
  const found=ways();
  if(more?.way==='card'&&found?.card!==false||!askFirst(found))return checkout(pack,requestId,offerId,more);
  const picked=await showPayChoice(doc(),{pack,season:more?.season??null,ways:found,source:more?.source??'shop',track:event=>track(event,pack)});
  if(picked==='card')return checkout(pack,requestId,offerId,more);
  return {store:picked??'none',status:picked?'elsewhere':'cancelled'};
 };
}
