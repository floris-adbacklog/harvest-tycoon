export function showPaymentReturn(bridge){
 const purchase=bridge.paymentReturn?.();if(!purchase?.id)return;
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','payment-result-title');
 dialog.style.cssText='width:min(420px,calc(100vw - 32px));box-sizing:border-box;padding:28px;border:1px solid #c9d3b6;border-radius:24px;background:#fffdf3;color:#29412d;';
 dialog.innerHTML='<h2 id="payment-result-title">Your purchase</h2><p role="status" style="line-height:1.6"></p><button type="button" data-retry>Check payment</button> <button type="button" data-close>Back to farm</button>';
 document.body.append(dialog);const message=dialog.querySelector('p'),retry=dialog.querySelector('[data-retry]');let timer,attempts=0,closed=false;
 const stop=()=>{closed=true;clearTimeout(timer);};
 dialog.addEventListener('close',()=>{stop();bridge.clearPaymentReturn?.();dialog.remove();});
 window.addEventListener('pagehide',stop,{once:true});
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 async function check(){
  clearTimeout(timer);retry.disabled=true;
  try{
   const result=await bridge.payments({operation:'status',purchaseId:purchase.id});if(closed)return;
   if(result.status==='credited'){
    message.textContent=result.pack==='starter'?'Starter Pack received! 10,000 coins, 300 diamonds and one of every crop have been added to your account.':`Payment confirmed. ${result.diamonds} diamonds have been added to your farm!`;retry.hidden=true;
    window.dispatchEvent(new Event('harvest-purchase-confirmed'));
    await window.harvestRefresh?.();return;
   }
   if(result.status==='test_paid'){message.textContent='Test payment confirmed. No real diamonds were added.';retry.hidden=true;return;}
   message.textContent=purchase.cancelled?'Checkout was closed. No diamonds have been added. If you completed a payment, check its status here.':'Waiting for payment confirmation. You can keep playing; your diamonds will arrive automatically once payment is confirmed.';
   if(!purchase.cancelled&&++attempts<20)timer=setTimeout(check,3000);
  }catch(error){if(!closed)message.textContent=error.message;}
  finally{retry.disabled=false;}
 }
 retry.onclick=()=>{attempts=0;check();};message.textContent='Checking your payment…';dialog.showModal();check();
}
