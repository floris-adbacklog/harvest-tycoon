// The reminder card (23 Oct 2026, the owner's option 2): a farmer whose website purchase was started but not paid (pending or expired,
// in the last 24 hours, nothing paid since: game/payments.js unfinishedCheckout, carried by the catalogue of diamond-checkout, so it
// works on every device) sees once a calm card when nothing else is open: the pack, one line, Try again (the same pack through the
// normal card flow), Other ways to pay (Google Play on an Android phone, the App Store on an iPhone where card payment cannot work) and
// Not now. No discount and no bonus (the owner: abandoning must not pay). Which purchase, and whether the pack can still be bought, is
// src/pay-ways.js reminderFor; once per purchase on this device (localStorage). Only from the catalogue the farm asks for when it
// starts (the next visit), never from a later refresh in the same visit, and never for the purchase the page just came back from
// (its own window, src/payment-ui.js, says what happened).
import {reminderFor,reminderKey,packName,payWays,deviceTimeZone,otherWays,playStoreLink,REMIND_AFTER} from './pay-ways.js';
import {packPicture,showPayChoice} from './pay-choice-ui.js';
import {portal} from '../public/portal.js';

export const REMINDER_WAIT=6000;   // after the farm starts, so the daily gift, Welcome back and the special offer come first
export const QUIET_CHECK=2000;     // then every 2 s until no window is open

export function reminderHtml({pack,season,ways}){
 const other=otherWays(ways),retry=ways?.card!==false;
 return `<img class="pay-choice-picture" src="${packPicture(pack,season)}" alt="" draggable="false"><h2 id="checkout-reminder-title">${packName(pack)}</h2>`
  +'<p class="pay-choice-line">Your purchase is still waiting.</p>'
  +(retry?'':'<p class="pay-choice-line">Card payment is not available in your country.</p>')
  +`<div class="pay-ways">${retry?'<button type="button" class="pay-way is-go is-plain" data-reminder="retry"><b>Try again</b></button>':''}`
  +`${other?'<button type="button" class="pay-way is-plain" data-reminder="other"><b>Other ways to pay</b></button>':''}`
  +'<button type="button" class="pay-choice-later" data-reminder="later">Not now</button></div>'
  +'<p class="pay-choice-feedback" role="status" aria-live="polite"></p>';
}

export function createCheckoutReminder(bridge,{doc=document,win=window,storage=win.localStorage,now=()=>Date.now()}={}){
 const ways=payWays({ua:win.navigator?.userAgent,timeZone:deviceTimeZone(),app:doc.documentElement?.dataset?.app==='android',portal:Boolean(portal(win))});
 const shown=id=>{try{return storage?.getItem(reminderKey(id))==='1';}catch{return false;}};
 const mark=id=>{try{storage?.setItem(reminderKey(id),'1');}catch{}};
 // The purchase this page came back from (?purchase=… from Stripe): its own window answers, so no reminder for it.
 try{const back=bridge.paymentReturn?.()?.id;if(typeof back==='string'&&back)mark(back);}catch{}
 let first=true,timer=0,disposed=false,dialog=null;
 // Not in a calm start either (24 Oct 2026, the owner: no pop-ups before the Beginner guide is done).
 const quiet=()=>!doc.querySelector('dialog[open]')&&!doc.body?.classList?.contains?.('fishing')&&!doc.documentElement?.hasAttribute?.('data-admin-view')&&!doc.documentElement?.classList?.contains?.('calm-start');
 function open(found){
  mark(found.id);
  dialog=doc.createElement('dialog');dialog.className='game-dialog is-card is-s pay-choice checkout-reminder';dialog.setAttribute('aria-labelledby','checkout-reminder-title');
  dialog.innerHTML=reminderHtml({pack:found.pack,season:found.season,ways});
  const feedback=dialog.querySelector('.pay-choice-feedback'),retry=dialog.querySelector('[data-reminder="retry"]');
  dialog.addEventListener('close',()=>{dialog.remove();dialog=null;});
  dialog.querySelector('[data-reminder="later"]').onclick=()=>dialog.close();
  if(retry)retry.onclick=async()=>{
   if(retry.disabled)return;retry.disabled=true;retry.querySelector('b').textContent='Opening secure checkout…';feedback.textContent='';
   bridge.trackCommerce?.('checkout_reminder_retry',{pack:found.pack});
   // The same pack through the normal card flow (the card page; the sheet already offered the other ways).
   try{const done=await bridge.checkout(found.pack,win.crypto.randomUUID(),found.offerId??undefined,{...(found.season?{season:found.season}:{}),way:'card',source:'reminder'});if(done?.store)dialog?.close();}
   catch(error){feedback.textContent=String(error?.message??'Checkout is unavailable. Please try again later.');retry.disabled=false;retry.querySelector('b').textContent='Try again';}
  };
  const other=dialog.querySelector('[data-reminder="other"]');
  if(other)other.onclick=()=>{
   bridge.trackCommerce?.('checkout_reminder_other',{pack:found.pack});
   // On an Android phone the one other way is Google Play: straight there, in a new tab. Elsewhere the sheet that says why.
   if(ways.play&&ways.card){win.open?.(playStoreLink('reminder'),'_blank','noopener');dialog.close();return;}
   dialog.close();void showPayChoice(doc,{pack:found.pack,season:found.season,ways,source:'reminder',track:event=>bridge.trackCommerce?.(event,{pack:found.pack})});
  };
  doc.body.append(dialog);
  bridge.trackCommerce?.('checkout_reminder_shown',{pack:found.pack});
  dialog.showModal();dialog.focus?.({preventScroll:true});
 }
 function consider(catalog){
  if(!first||disposed)return;first=false;
  // A farmer with no way at all here (card payment not available, no store on this device): nothing to offer, so no card.
  if(ways&&!ways.card&&!otherWays(ways))return;
  const found=reminderFor(catalog,{now:Number(catalog?.serverNow)||now(),shown});
  if(!found)return;
  const started=now();
  const tick=()=>{
   if(disposed||dialog)return;
   if(now()-started>=REMINDER_WAIT&&quiet()){open(found);return;}
   timer=win.setTimeout(tick,QUIET_CHECK);
  };
  timer=win.setTimeout(tick,Math.min(REMINDER_WAIT,REMIND_AFTER));
 }
 const onCatalog=event=>consider(event.detail);
 win.addEventListener('harvest-catalog',onCatalog);
 win.addEventListener('pagehide',()=>{disposed=true;win.clearTimeout(timer);win.removeEventListener('harvest-catalog',onCatalog);},{once:true});
 return {consider,ways};
}
