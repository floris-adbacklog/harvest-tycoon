export async function createStarterPackUI(bridge){
 const {CROPS,STARTER_PACK_CROPS,STARTER_LEVEL,formatDuration}=await import(/* @vite-ignore */ '/farm-state.js');
 const {art,refreshArt}=await import(/* @vite-ignore */ '/visual-icons.js');
 const style=document.createElement('link');style.rel='stylesheet';style.href='/starter-pack.css';document.head.append(style);
 const button=document.createElement('button');button.id='starter-pack-button';button.hidden=true;button.type='button';button.setAttribute('aria-label','Starter Pack, €2.99');button.innerHTML='<img src="/assets/icons/starter-pack.webp" alt=""><span>Starter Pack</span><small>€2.99</small>';
 // On a computer the offer is a small button next to the diamonds; phones keep the tile above the bottom bar
 // (starter-pack.css shows one of the two).
 const chip=document.createElement('button');chip.id='starter-pack-chip';chip.className='icon-button';chip.hidden=true;chip.type='button';chip.title='Starter Pack';chip.setAttribute('aria-label','Starter Pack, €2.99');chip.innerHTML='<img src="/assets/icons/starter-pack.webp" alt=""><small>€2.99</small>';
 const dialog=document.createElement('dialog');dialog.id='starter-pack-dialog';dialog.className='game-dialog';dialog.setAttribute('aria-labelledby','starter-pack-title');
 // Picture, name and time left; the diamonds first (the real value), then the coins; the twelve crops as one strip
 // of pictures; one Buy button that fits on a phone without scrolling.
 dialog.innerHTML=`<button type="button" class="starter-close" aria-label="Close Starter Pack">×</button><img class="starter-hero" src="/assets/icons/starter-pack.webp" alt=""><span class="eyebrow">A LITTLE HEAD START</span><h2 id="starter-pack-title">Starter Pack</h2><p class="starter-time"></p><div class="starter-rewards"><div class="is-diamonds">${art('diamonds')}<strong>300</strong><span>diamonds</span></div><div>${art('coins')}<strong>10,000</strong><span>coins</span></div></div><div class="starter-crops-strip"><strong>+ one of ${STARTER_PACK_CROPS.length} crops</strong><div class="starter-crops">${STARTER_PACK_CROPS.map(key=>`<span title="${CROPS[key].name}">${art(key)}</span>`).join('')}</div><small>They go straight to your storage.</small></div><button class="primary-button starter-buy" disabled>Buy for €2.99</button><p class="starter-feedback" role="status" aria-live="polite"></p><small class="starter-fine">One purchase per account.</small>`;
 document.body.append(button,dialog);document.getElementById('diamond-button')?.after(chip);refreshArt();
 const buy=dialog.querySelector('.starter-buy'),feedback=dialog.querySelector('.starter-feedback'),time=dialog.querySelector('.starter-time');
 let catalog=null,offset=0,pending=false,disposed=false,requestId='',refreshing=false,checkedAt=0;
 function render(){
  const offer=catalog?.starter,remaining=(offer?.expiresAt??0)-(Date.now()+offset),eligible=offer?.eligible&&remaining>0;
  button.hidden=chip.hidden=!eligible;buy.disabled=pending||!eligible||!catalog?.enabled;
  buy.textContent=pending?'Opening secure checkout…':catalog?.mode==='test'?'Test purchase · €2.99':'Buy for €2.99';
  time.textContent=offer?.claimed?'Already received':eligible?`${formatDuration(remaining)} left`:'This offer has ended';
  if(!catalog?.enabled&&!pending)feedback.textContent='Purchases are not available yet. Please check back later.';
  else if(catalog?.enabled&&feedback.textContent==='Purchases are not available yet. Please check back later.')feedback.textContent='';
 }
 async function refresh(){if(refreshing||disposed)return;refreshing=true;checkedAt=Date.now();try{const data=await bridge.payments({operation:'catalog'});if(disposed)return;catalog=data;offset=data.serverNow-Date.now();render();}catch{if(!catalog)button.hidden=chip.hidden=true;}finally{refreshing=false;}}
 button.onclick=chip.onclick=()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());requestId=crypto.randomUUID();feedback.textContent='';render();dialog.showModal();refresh();};
 dialog.querySelector('.starter-close').onclick=()=>dialog.close();
 buy.onclick=async()=>{if(pending||buy.disabled)return;pending=true;feedback.textContent='';render();try{await bridge.checkout('starter',requestId);}catch(error){feedback.textContent=error.message;pending=false;render();}};
 // The countdown runs on this device. The server is asked when the game starts, when the offer is opened, after a purchase
 // and when the farm reaches the Starter Pack level; while the offer runs, also every 15 minutes (and on coming back to
 // the game, at most that often). A farm without a running offer is not asked again. (It used to ask every minute, for
 // every player: a third of all server calls.)
 const RECHECK=15*60*1000,running=()=>Boolean(catalog?.starter?.eligible)&&catalog.starter.expiresAt-(Date.now()+offset)>0;
 const due=()=>!document.hidden&&(!catalog||running()&&Date.now()-checkedAt>=RECHECK);
 const timer=setInterval(render,10000),poll=setInterval(()=>{if(due())refresh();},RECHECK);
 const onVisible=()=>{if(due())refresh();};document.addEventListener('visibilitychange',onVisible);window.addEventListener('harvest-purchase-confirmed',refresh);
 // Reaching the level opens the offer on the server with that level-up, so ask shortly after the level changes.
 const levelEl=document.getElementById('level');let lastLevel=Number(levelEl?.textContent)||0;
 const levelWatch=new MutationObserver(()=>{const level=Number(levelEl.textContent)||0;if(lastLevel<STARTER_LEVEL&&level>=STARTER_LEVEL)setTimeout(refresh,1500);lastLevel=level;});
 if(levelEl)levelWatch.observe(levelEl,{childList:true,characterData:true,subtree:true});
 window.addEventListener('pagehide',()=>{disposed=true;clearInterval(timer);clearInterval(poll);levelWatch.disconnect();document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('harvest-purchase-confirmed',refresh);},{once:true});
 await refresh();
}
