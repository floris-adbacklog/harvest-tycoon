import {art} from './visual-icons.js';
// A plain "are you sure?" dialog in the look of the other pop-ups: an optional picture, the question, one line and two
// buttons (diamond-confirm.js is the same frame with a price). It resolves to true only when the player confirms; Cancel,
// Escape and a tap outside all resolve to false, and focus returns to where it was. tone 'danger' is for what is hard to
// undo (leaving a family, removing a member): the confirm button is red. typeToConfirm is for what must never happen by accident
// (making someone a moderator): the confirm button stays off until that text (their name) is typed exactly, then Enter works too.
export function confirmAction({title,description,confirmLabel='Confirm',cancelLabel='Cancel',picture='',tone='',typeToConfirm=''}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className=`diamond-confirm sale-confirm${tone==='danger'?' is-danger':''}`;
  dialog.setAttribute('aria-labelledby','sale-confirm-title');dialog.setAttribute('aria-describedby','sale-confirm-description');
  dialog.innerHTML=`${picture?`<div class="diamond-confirm-art">${art(picture)}</div>`:''}<h2 id="sale-confirm-title"></h2><p id="sale-confirm-description"></p>${typeToConfirm?'<label class="confirm-type"><span data-type-label></span><input type="text" data-type autocomplete="off" autocapitalize="off" spellcheck="false" autofocus></label>':''}<div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel${typeToConfirm?'':' autofocus'}></button><button type="button" class="primary-button confirm-spend" data-confirm></button></div>`;
  dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
  dialog.querySelector('[data-cancel]').textContent=cancelLabel;dialog.querySelector('[data-confirm]').textContent=confirmLabel;
  const focus=document.activeElement,button=dialog.querySelector('[data-confirm]');let accepted=false;
  const typed=typeToConfirm?dialog.querySelector('[data-type]'):null,matches=()=>!typed||typed.value.trim()===typeToConfirm;
  if(typed){
   dialog.querySelector('[data-type-label]').textContent=`Type “${typeToConfirm}” to confirm`;button.disabled=true;
   typed.oninput=()=>{button.disabled=!matches();};
   typed.onkeydown=event=>{if(event.key==='Enter'&&matches()){accepted=true;dialog.close();}};
  }
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  button.onclick=()=>{if(!matches())return;accepted=true;dialog.close();};
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{dialog.remove();if(focus?.isConnected)focus.focus();resolve(accepted);},{once:true});
  document.body.append(dialog);dialog.showModal();
 });
}
