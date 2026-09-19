export async function createStarterPackUI(bridge){
 const {CROPS,formatDuration}=await import(/* @vite-ignore */ '/farm-state.js');
 const {art,refreshArt}=await import(/* @vite-ignore */ '/visual-icons.js');
 const style=document.createElement('link');style.rel='stylesheet';style.href='/starter-pack.css';document.head.append(style);
 const button=document.createElement('button');button.id='starter-pack-button';button.hidden=true;button.type='button';button.setAttribute('aria-label','Starter Pack, €2.99');button.innerHTML='<img src="/assets/icons/starter-pack.svg" alt=""><span>Starter Pack</span><small>€2.99</small>';
 const dialog=document.createElement('dialog');dialog.id='starter-pack-dialog';dialog.className='game-dialog';dialog.setAttribute('aria-labelledby','starter-pack-title');
 dialog.innerHTML=`<button type="button" class="starter-close" aria-label="Close Starter Pack">×</button><img class="starter-hero" src="/assets/icons/starter-pack.svg" alt=""><span class="eyebrow">A LITTLE HEAD START</span><h2 id="starter-pack-title">Starter Pack</h2><p>Make yourself at home with a one-time welcome bundle.</p><div class="starter-rewards"><div>${art('coins')}<strong>10,000</strong><span>coins</span></div><div>${art('diamonds')}<strong>300</strong><span>diamonds</span></div></div><h3>1× each of all 12 crops</h3><div class="starter-crops">${Object.entries(CROPS).map(([key,c])=>`<div>${art(key)}<span>${c.name}</span><b>×1</b></div>`).join('')}</div><p class="starter-note">All crops are added to your inventory, ready to use or sell; no fields are planted.</p><p class="starter-time"></p><button class="primary-button starter-buy" disabled>Buy Starter Pack · €2.99</button><p class="starter-feedback" role="status" aria-live="polite"></p><small>One purchase per account. Available for your first 72 hours.</small>`;
 document.body.append(button,dialog);refreshArt();
 const buy=dialog.querySelector('.starter-buy'),feedback=dialog.querySelector('.starter-feedback'),time=dialog.querySelector('.starter-time');
 let catalog=null,offset=0,pending=false,disposed=false,requestId='',refreshing=false;
 function render(){
  const offer=catalog?.starter,remaining=(offer?.expiresAt??0)-(Date.now()+offset),eligible=offer?.eligible&&remaining>0;
  button.hidden=!eligible;buy.disabled=pending||!eligible||!catalog?.enabled;
  buy.textContent=pending?'Opening secure checkout…':catalog?.mode==='test'?'Test Starter Pack · €2.99':'Buy Starter Pack · €2.99';
  time.textContent=offer?.claimed?'Starter Pack already received':eligible?`Available for ${formatDuration(remaining)}`:'This welcome offer has ended.';
  if(!catalog?.enabled&&!pending)feedback.textContent='Purchases are not available yet. Please check back later.';
  else if(catalog?.enabled&&feedback.textContent==='Purchases are not available yet. Please check back later.')feedback.textContent='';
 }
 async function refresh(){if(refreshing||disposed)return;refreshing=true;try{const data=await bridge.payments({operation:'catalog'});if(disposed)return;catalog=data;offset=data.serverNow-Date.now();render();}catch{if(!catalog)button.hidden=true;}finally{refreshing=false;}}
 button.onclick=()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());requestId=crypto.randomUUID();feedback.textContent='';render();dialog.showModal();refresh();};
 dialog.querySelector('.starter-close').onclick=()=>dialog.close();
 buy.onclick=async()=>{if(pending||buy.disabled)return;pending=true;feedback.textContent='';render();try{await bridge.checkout('starter',requestId);}catch(error){feedback.textContent=error.message;pending=false;render();}};
 const timer=setInterval(render,10000),poll=setInterval(refresh,60000);
 const onVisible=()=>{if(!document.hidden)refresh();};document.addEventListener('visibilitychange',onVisible);window.addEventListener('harvest-purchase-confirmed',refresh);
 window.addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);clearInterval(poll);document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('harvest-purchase-confirmed',refresh);},{once:true});
 await refresh();
}
