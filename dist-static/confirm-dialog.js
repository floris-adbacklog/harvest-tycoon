// A plain "are you sure?" dialog, in the same look as the diamond confirmation. It resolves to true only when the
// player confirms; Cancel, Escape and a tap outside all resolve to false, and focus returns to where it was.
export function confirmAction({title,description,confirmLabel='Confirm',cancelLabel='Cancel'}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='diamond-confirm sale-confirm';
  dialog.setAttribute('aria-labelledby','sale-confirm-title');dialog.setAttribute('aria-describedby','sale-confirm-description');
  dialog.innerHTML='<h2 id="sale-confirm-title"></h2><p id="sale-confirm-description"></p><div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel autofocus></button><button type="button" class="confirm-spend" data-confirm></button></div>';
  dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
  dialog.querySelector('[data-cancel]').textContent=cancelLabel;dialog.querySelector('[data-confirm]').textContent=confirmLabel;
  const focus=document.activeElement;let accepted=false;
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-confirm]').onclick=()=>{accepted=true;dialog.close();};
  dialog.addEventListener('close',()=>{dialog.remove();if(focus?.isConnected)focus.focus();resolve(accepted);},{once:true});
  document.body.append(dialog);dialog.showModal();
 });
}
