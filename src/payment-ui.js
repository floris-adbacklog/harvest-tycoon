import {art} from '../public/visual-icons.js';

export function showPaymentReturn(bridge){
 const purchase=bridge.paymentReturn?.();if(!purchase?.id)return;
 const dialog=document.createElement('dialog');dialog.className='payment-dialog';
 dialog.setAttribute('aria-labelledby','payment-result-title');dialog.setAttribute('aria-describedby','payment-result-message');
 dialog.innerHTML=`<button type="button" class="payment-dismiss" aria-label="Close purchase update"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg></button><div class="payment-hero">${art('diamonds')}</div><p class="payment-eyebrow">A LITTLE EXTRA GROWING POWER</p><h2 id="payment-result-title">Checking your purchase</h2><p id="payment-result-message" class="payment-message" role="status" aria-live="polite">Just a moment while we check your payment.</p><span class="payment-status">Checking payment</span><div class="payment-actions"><button type="button" data-close autofocus>Back to farm</button><button type="button" data-retry>Check payment</button></div>`;
 document.body.append(dialog);
 const title=dialog.querySelector('h2'),message=dialog.querySelector('.payment-message'),status=dialog.querySelector('.payment-status'),retry=dialog.querySelector('[data-retry]');
 let timer,attempts=0,closed=false,checking=false;
 const stop=()=>{closed=true;clearTimeout(timer);};
 dialog.addEventListener('close',()=>{stop();window.removeEventListener('pagehide',stop);bridge.clearPaymentReturn?.();dialog.remove();});
 window.addEventListener('pagehide',stop,{once:true});
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.querySelector('.payment-dismiss').onclick=()=>dialog.close();
 function display(kind,heading,copy,label){dialog.dataset.state=kind;title.textContent=heading;message.textContent=copy;status.textContent=label;}
 async function check(){
  if(closed||checking)return;checking=true;clearTimeout(timer);retry.disabled=true;retry.textContent='Checking…';
  try{
   const result=await bridge.payments({operation:'status',purchaseId:purchase.id});if(closed)return;
   if(result.status==='credited'){
    // Local deduplication only; no purchase or account identifier is sent to analytics.
    try{const key='harvest-payment-event:'+purchase.id;if(!sessionStorage.getItem(key)){bridge.trackCommerce?.('diamond_pack_completed',{pack:result.pack,diamonds:result.diamonds});sessionStorage.setItem(key,'1');}}catch{}

    display('credited',result.pack==='starter'?'Your Starter Pack is here!':'A little sparkle for your farm',result.pack==='starter'?'10,000 coins, 300 diamonds and one of every crop have been added to your account.':`${Number(result.diamonds).toLocaleString('en-US')} diamonds have been added to your farm. Enjoy your next little upgrade!`,'Payment confirmed');retry.hidden=true;
    window.dispatchEvent(new Event('harvest-purchase-confirmed'));
    // A farm-refresh failure must not turn a verified payment into a payment error.
    try{await window.harvestRefresh?.();}catch{if(!closed)message.textContent+=' Reopen your farm to refresh your balance.';}
    return;
   }
   if(result.status==='test_paid'){display('test','Test payment confirmed','This was a test purchase. No real diamonds were added.','Test complete');retry.hidden=true;return;}
   if(result.status==='expired'){display('closed','This checkout has expired','You can return to the diamond shop to start a new checkout.','Checkout expired');retry.hidden=true;return;}
   if(purchase.cancelled)display('closed','Back to your farm','Checkout was closed. If you paid before returning, check your payment status below.','Checkout closed');
   else display('pending','Confirming your purchase','We’re waiting for payment confirmation. You can return to your farm while we check.','Awaiting confirmation');
   if(!purchase.cancelled&&++attempts<20)timer=setTimeout(check,3000);
  }catch{if(!closed)display('error','Let’s check again','We couldn’t confirm your payment right now. If you paid, check again in a moment.','Connection interrupted');}
  finally{checking=false;retry.disabled=false;retry.textContent='Check payment';}
 }
 retry.onclick=()=>{attempts=0;check();};dialog.showModal();check();
}
