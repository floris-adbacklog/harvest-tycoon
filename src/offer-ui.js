import {fitsDevice} from './popup-ui.js';
import {shopPrice,shopWorth} from '../public/android.js';

// The special offer (29 Sep 2026, supabase/special-offer.sql): diamonds, coins and/or VIP time worth €49.99 at the shop's own
// prices, for €4.99, once per farmer, from level 14. The admin puts one together in the Admin panel; the server's catalogue says
// which offer runs for this farm (diamond-checkout), so this screen needs no request of its own at the start: it reads the
// catalogue the Starter Pack already asks for (starter-pack-ui.js, the harvest-catalog event). A big window on a computer or
// tablet, a compact one on a phone, with a sound of its own; it opens by itself once per offer on this device, when nothing else
// is open, and after that from a button next to the diamonds (a tile above the bottom bar on a phone) and a banner at the top of
// the Diamond shop, until it ends or is bought.
export const OFFER_PARTS=Object.freeze([
 {key:'diamonds',art:'offer-diamonds',label:'diamonds'},
 {key:'coins',art:'offer-coins',label:'coins'},
 {key:'vipDays',art:'offer-vip',label:'VIP'}]);
const euro=cents=>`€${(cents/100).toFixed(2)}`;
const number=n=>Number(n).toLocaleString('en-US');
// What is in the offer, as cards: the amount, and for VIP how long.
export function offerParts(offer){
 return OFFER_PARTS.filter(p=>Number(offer?.[p.key])>0).map(p=>p.key==='vipDays'
  ?{...p,amount:'VIP',detail:`${offer.vipDays} days`}
  :{...p,amount:number(offer[p.key]),detail:p.label});
}
// "Worth" is always the shop price of what is in it (game/payments.js OFFER.valueCents); the discount follows from it.
export const offerDiscount=offer=>Math.round((1-offer.cents/offer.valueCents)*100);

export function createOfferUI(bridge,{doc=document,win=window,storage=win.localStorage}={}){
 let offer=null,mode='live',enabled=true,offset=0,pending=false,requestId='',waiting=0,disposed=false,live=null,prices=null;
 // In the Android app (Oct 2026) the price is Google Play's and the worth is in the same currency (public/android.js shopPrice).
 const price=()=>shopPrice({prices},'offer',offer.cents),worth=()=>shopWorth({prices},'offer',offer.cents,offer.valueCents);
 const style=doc.createElement('link');style.rel='stylesheet';style.href='/offer.css';doc.head.append(style);
 const tile=doc.createElement('button');tile.id='offer-button';tile.type='button';tile.hidden=true;
 const chip=doc.createElement('button');chip.id='offer-chip';chip.className='icon-button';chip.type='button';chip.hidden=true;chip.title='Special offer';
 const dialog=doc.createElement('dialog');dialog.id='offer-dialog';dialog.className='game-dialog';dialog.setAttribute('aria-labelledby','offer-title');dialog.tabIndex=-1;
 doc.body.append(tile,dialog);
 const hud=doc.getElementById('starter-pack-chip')??doc.getElementById('diamond-button');hud?.after(chip);
 const device=()=>({installed:doc.documentElement.dataset.appMode==='standalone',phone:Boolean(win.matchMedia?.('(pointer: coarse)').matches)});
 const left=()=>(offer?.endsAt??0)-(Date.now()+offset);
 const running=()=>Boolean(offer)&&!offer.bought&&left()>0&&fitsDevice(offer.audience,device());
 const seenKey=()=>`harvest-offer-shown:${offer?.id}`;
 const seen=()=>{try{return storage?.getItem(seenKey())==='1';}catch{return false;}};
 const markSeen=()=>{try{storage?.setItem(seenKey(),'1');}catch{}};
 // The time left as the rest of the game writes it (1d 4h), once public/farm-state.js is loaded; hours until then.
 let duration=ms=>`${Math.max(1,Math.ceil(ms/3600000))}h`;
 import(/* @vite-ignore */ '/farm-state.js').then(m=>{duration=m.formatDuration;render();}).catch(()=>{});

 function draw(){
  const off=offerDiscount(offer),parts=offerParts(offer);
  const label=`Special offer, ${price()}`;tile.setAttribute('aria-label',label);chip.setAttribute('aria-label',label);
  tile.innerHTML=`<img src="/assets/icons/offer-hero.webp" alt=""><span>Special offer</span><small>-${off}%</small>`;
  chip.innerHTML=`<img src="/assets/icons/offer-hero.webp" alt=""><small>-${off}%</small>`;
  // Picture with the discount, then what is in it (cards with a + between), what it is worth, the time left and one Buy button.
  dialog.innerHTML=`<button type="button" class="offer-close" aria-label="Close">×</button>`
   +`<div class="offer-hero"><img src="/assets/icons/offer-hero.webp" alt="" draggable="false"><span class="offer-ribbon"><b>${off}%</b><small>OFF</small></span></div>`
   +`<div class="offer-body"><span class="eyebrow">SPECIAL OFFER</span><h2 id="offer-title">A chest full of treasure</h2>`
   +`<div class="offer-parts">${parts.map((p,i)=>`${i?'<span class="offer-plus" aria-hidden="true">+</span>':''}<div class="offer-part is-${p.key}"><img src="/assets/icons/${p.art}.webp" alt="" draggable="false"><strong>${p.amount}</strong><span>${p.detail}</span></div>`).join('')}</div>`
   +`<p class="offer-worth"><span>Worth</span> <s>${worth()}</s> <b>${price()}</b></p>`
   +`<p class="offer-time"><img src="/assets/icons/offer-hourglass.webp" alt=""><span data-offer-left></span></p>`
   +`<button type="button" class="primary-button offer-buy"></button><p class="offer-feedback" role="status" aria-live="polite"></p>`
   +`<small class="offer-fine">Once per farmer. Worth: what the same diamonds, coins and VIP cost in the shop.</small></div>`;
  dialog.dataset.parts=String(parts.length);
  dialog.querySelector('.offer-close').onclick=()=>dialog.close();
  dialog.querySelector('.offer-buy').onclick=buy;
 }
 function render(){
  const show=running()&&!offer.preview;tile.hidden=chip.hidden=!show;banner(show);
  if(!offer||!dialog.querySelector('.offer-buy'))return;
  const ms=left(),over=ms<=0||offer.bought;
  dialog.querySelector('[data-offer-left]').textContent=offer.bought?'Already bought':over?'This offer has ended':`Ends in ${duration(ms)}`;
  const button=dialog.querySelector('.offer-buy');button.disabled=pending||over||!enabled||offer.preview;
  button.textContent=offer.preview?`Preview · ${euro(offer.cents)}`:pending?'Opening secure checkout…':mode==='test'?`Test purchase · ${euro(offer.cents)}`:`Buy for ${price()}`;
  const feedback=dialog.querySelector('.offer-feedback');if(!enabled&&!pending)feedback.textContent='Purchases are not available yet. Please check back later.';
 }
 function open(){
  if(!offer)return;doc.querySelectorAll('dialog[open]').forEach(d=>d!==dialog&&d.close());
  requestId=win.crypto.randomUUID();pending=false;draw();render();dialog.showModal();
  // The window itself takes the focus, not the close button (a phone drew a ring around it).
  dialog.focus({preventScroll:true});if(!offer.preview)markSeen();
  win.harvestSound?.('offer');
 }
 // The Diamond shop (public/farm.html #boost-dialog): the offer as a banner at the top while it runs, so a farmer who closed the
 // window can open it again there.
 function banner(show){
  let b=doc.getElementById('shop-offer');const wallet=doc.querySelector('#boost-dialog .boost-wallet');
  if(!b&&!wallet)return;
  if(!b){b=doc.createElement('button');b.type='button';b.id='shop-offer';b.className='shop-offer';b.onclick=open;wallet.after(b);}
  b.hidden=!show;if(!show)return;
  const html=`<img src="/assets/icons/offer-hero.webp" alt=""><span class="shop-offer-copy"><b>Special offer</b><small>Ends in ${duration(left())}</small></span><span class="shop-offer-price"><s>${worth()}</s><b>${price()}</b></span><span class="shop-offer-tag">-${offerDiscount(offer)}%</span>`;
  if(b.dataset.html!==html){b.dataset.html=html;b.innerHTML=html;}
 }
 async function buy(){
  if(pending||!running()||offer.preview)return;pending=true;dialog.querySelector('.offer-feedback').textContent='';render();
  // Stripe leaves the page; Google Play's sheet (the Android app) closes on the farm, and the window with the result opens by itself.
  try{const done=await bridge.checkout('offer',requestId,offer.id);if(done?.store==='google_play'){pending=false;render();}}
  catch(error){pending=false;render();dialog.querySelector('.offer-feedback').textContent=error.message;}
 }
 // Once per offer on this device, when nothing else is open (the daily gift, a pop-up, a purchase screen).
 // Never by itself in the admin view (3 Oct 2026, src/admin-view.js): nothing is bought there; the dashboard's Preview still opens it.
 function autoOpen(){
  if(!running()||seen()||waiting||doc.documentElement?.hasAttribute?.('data-admin-view'))return;
  const quiet=()=>!doc.querySelector('dialog[open]');
  if(quiet()){open();return;}
  waiting=win.setInterval(()=>{if(disposed||!running()){win.clearInterval(waiting);waiting=0;return;}if(quiet()){win.clearInterval(waiting);waiting=0;open();}},2000);
 }
 function update(catalog){
  const next=catalog?.offer??null,changed=next?.id!==offer?.id;
  offset=(catalog?.serverNow??Date.now())-Date.now();mode=catalog?.mode??'live';enabled=Boolean(catalog?.enabled);prices=catalog?.prices??null;offer=next;
  if(!offer){tile.hidden=chip.hidden=true;if(dialog.open)dialog.close();return;}
  if(changed||!dialog.querySelector('.offer-buy'))draw();
  if(offer.bought)pending=false;render();autoOpen();
 }
 // The admin panel's Preview (src/admin-dashboard.js): the window with the amounts being put together, which cannot be bought;
 // closing it brings back the offer that runs now.
 function preview({diamonds=0,coins=0,vipDays=0,hours=48}={}){
  if(!offer?.preview)live=offer;
  offer={id:'preview',preview:true,diamonds,coins,vipDays,audience:'all',bought:false,cents:499,valueCents:4999,endsAt:Date.now()+offset+hours*3600000};
  open();
 }
 dialog.addEventListener('close',()=>{if(!offer?.preview)return;offer=live;live=null;if(offer)draw();render();});
 win.harvestOffer={preview,open};
 const onCatalog=event=>{if(offer?.preview){live=event.detail?.offer??null;return;}update(event.detail);};
 win.addEventListener('harvest-catalog',onCatalog);
 tile.onclick=chip.onclick=open;
 const timer=win.setInterval(render,10000);
 win.addEventListener('pagehide',()=>{disposed=true;win.clearInterval(timer);if(waiting)win.clearInterval(waiting);win.removeEventListener('harvest-catalog',onCatalog);},{once:true});
 return {update,open,preview};
}
