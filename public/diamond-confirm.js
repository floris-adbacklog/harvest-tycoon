import {art} from './visual-icons.js';
// "Spend diamonds?" in the look of the other pop-ups: the thing you buy, what it does, the price with a diamond, what you
// keep, and the usual buttons (Keep diamonds is focused, so Enter never spends by accident). Resolves to true only on Spend.
export function confirmDiamondSpend({title,cost,description,picture='diamonds',balance}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='diamond-confirm';
  dialog.setAttribute('aria-labelledby','diamond-confirm-title');dialog.setAttribute('aria-describedby','diamond-confirm-description');
  const amount=cost.toLocaleString('en-US'),left=Number.isFinite(balance)?balance-cost:null;
  dialog.innerHTML=`<div class="diamond-confirm-art">${art(picture)}</div><h2 id="diamond-confirm-title"></h2><p id="diamond-confirm-description"></p><div class="diamond-confirm-cost"><strong>${art('diamonds')}${amount}</strong>${left!==null&&left>=0?`<small>You keep ${left.toLocaleString('en-US')} diamonds</small>`:''}</div><div class="diamond-confirm-actions"><button type="button" class="small-button" data-cancel autofocus>Keep diamonds</button><button type="button" class="primary-button confirm-spend" data-confirm>Spend ${amount}</button></div>`;
  dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
  const focus=document.activeElement;let accepted=false;
  dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
  dialog.querySelector('[data-confirm]').onclick=()=>{accepted=true;dialog.close();};
  dialog.addEventListener('close',()=>{dialog.remove();if(focus?.isConnected)focus.focus();resolve(accepted);},{once:true});
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  document.body.append(dialog);dialog.showModal();
 });
}
