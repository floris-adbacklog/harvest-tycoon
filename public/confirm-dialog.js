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

// A short text to change (a chat message, for the moderators): the same frame with a text box and a character count. Resolves to the
// new text, or null when cancelled. Enter saves, Shift+Enter is a new line; Save is off while the box is empty.
export function promptText({title,description='',value='',maxLength=200,confirmLabel='Save',cancelLabel='Cancel',picture=''}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='diamond-confirm sale-confirm prompt-text';dialog.setAttribute('aria-labelledby','sale-confirm-title');
  dialog.innerHTML=`${picture?`<div class="diamond-confirm-art">${art(picture)}</div>`:''}<h2 id="sale-confirm-title"></h2>${description?'<p id="sale-confirm-description"></p>':''}<textarea class="prompt-text-field" rows="3" data-text aria-labelledby="sale-confirm-title" autofocus></textarea><small class="prompt-text-count" data-count aria-live="polite"></small><div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel></button><button type="button" class="primary-button confirm-spend" data-confirm></button></div>`;
  dialog.querySelector('h2').textContent=title;if(description)dialog.querySelector('p').textContent=description;
  dialog.querySelector('[data-cancel]').textContent=cancelLabel;
  const field=dialog.querySelector('[data-text]'),count=dialog.querySelector('[data-count]'),button=dialog.querySelector('[data-confirm]'),focus=document.activeElement;
  button.textContent=confirmLabel;field.maxLength=maxLength;field.value=String(value).slice(0,maxLength);let result=null;
  const update=()=>{count.textContent=`${field.value.length} / ${maxLength}`;button.disabled=!field.value.trim();};
  const save=()=>{if(!field.value.trim())return;result=field.value;dialog.close();};
  field.oninput=update;field.onkeydown=event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault?.();save();}};update();
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();button.onclick=save;
  dialog.addEventListener('close',()=>{dialog.remove();if(focus?.isConnected)focus.focus();resolve(result);},{once:true});
  document.body.append(dialog);dialog.showModal();field.setSelectionRange?.(field.value.length,field.value.length);
 });
}
