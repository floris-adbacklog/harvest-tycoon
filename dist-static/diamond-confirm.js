export function confirmDiamondSpend({title,cost,description}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='diamond-confirm';
  dialog.setAttribute('aria-labelledby','diamond-confirm-title');dialog.setAttribute('aria-describedby','diamond-confirm-description');
  dialog.innerHTML='<h2 id="diamond-confirm-title"></h2><p id="diamond-confirm-description"></p><strong class="diamond-confirm-cost"></strong><div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel autofocus>Keep diamonds</button><button type="button" class="confirm-spend" data-confirm>Confirm</button></div>';
  dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
  dialog.querySelector('.diamond-confirm-cost').textContent=`Spend ${cost.toLocaleString('en-US')} diamonds`;
  const focus=document.activeElement;let accepted=false;
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-confirm]').onclick=()=>{accepted=true;dialog.close();};
  dialog.addEventListener('close',()=>{dialog.remove();if(focus?.isConnected)focus.focus();resolve(accepted);},{once:true});
  document.body.append(dialog);dialog.showModal();
 });
}
