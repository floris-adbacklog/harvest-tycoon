import {CROPS,formatDuration} from './farm-state.js';
import {art} from './visual-icons.js';

// Native disclosure and form controls retain keyboard and screen-reader support.
// The choices stay in the dialog flow, so phone browsers cannot clip a popup.
export function fieldPicker({id,plots,selected=[],multiple=false,now,disabled=false,available=0}){
 const chosen=new Set(selected.map(String)),current=plots.find(p=>chosen.has(String(p.id)));
 const title=multiple?`${chosen.size} ${chosen.size===1?'field':'fields'} selected`:current?`Field ${current.id+1} · ${CROPS[current.crop].name}`:plots.length?'Choose a growing field':'No growing fields';
 return `<details class="field-picker" id="${id}" ${disabled||!plots.length?'data-disabled="true"':''}><summary ${disabled||!plots.length?'aria-disabled="true" tabindex="-1"':''}><span class="field-picker-art">${art(current&&!multiple?current.crop:multiple?'fertilizer':'seeds')}</span><span class="field-picker-copy"><strong data-picker-title>${title}</strong><small>${multiple?'Choose crops to give a head start':current?`${formatDuration(current.readyAt-now)} remaining`:'Select one crop to finish instantly'}</small></span><span class="picker-chevron" aria-hidden="true"></span></summary><div class="field-picker-body">${multiple?`<div class="field-picker-toolbar"><span>${plots.length} growing fields</span><button type="button" data-picker-all ${!available?'disabled':''}>Select ${Math.min(available,plots.length)}</button><button type="button" data-picker-clear>Clear</button></div>`:''}<div class="field-picker-options" aria-label="${multiple?'Growing fields':'Choose one growing field'}">${plots.map(p=>{
 const active=chosen.has(String(p.id)),copy=`<span class="field-choice-art">${art(p.crop)}</span><span class="field-choice-copy"><strong>Field ${p.id+1} <span>· ${CROPS[p.crop].name}</span></strong><small>${formatDuration(p.readyAt-now)} remaining</small></span>`;
 return multiple?`<label class="field-choice"><input type="checkbox" data-field-choice="${p.id}" ${active?'checked':''} aria-label="Field ${p.id+1}, ${CROPS[p.crop].name}">${copy}<span class="field-choice-check" aria-hidden="true"></span></label>`:`<button type="button" class="field-choice" data-field-choice="${p.id}" aria-pressed="${active}">${copy}<span class="field-choice-check" aria-hidden="true"></span></button>`;
 }).join('')}</div>${multiple?'<div class="field-picker-bottom"><span>1 fertilizer per field</span><button type="button" data-picker-done>Done</button></div>':''}</div></details>`;
}

export function bindFieldPicker(root,{multiple=false,available=0,onChange}){
 const summary=root.querySelector('summary'),choices=[...root.querySelectorAll('[data-field-choice]')];
 const selection=()=>choices.filter(el=>multiple?el.checked:el.getAttribute('aria-pressed')==='true').map(el=>Number(el.dataset.fieldChoice));
 const close=()=>{root.open=false;summary.focus();};
 const update=()=>{const ids=selection();if(multiple)root.querySelector('[data-picker-title]').textContent=`${ids.length} ${ids.length===1?'field':'fields'} selected`;onChange(ids);};
 summary.addEventListener('click',event=>{if(root.dataset.disabled==='true')event.preventDefault();});
 choices.forEach(choice=>choice.addEventListener(multiple?'change':'click',()=>{
  if(!multiple){choices.forEach(el=>el.setAttribute('aria-pressed',String(el===choice)));const row=choice.querySelector('.field-choice-copy');root.querySelector('[data-picker-title]').textContent=row.querySelector('strong').textContent;root.querySelector('.field-picker-copy small').textContent=row.querySelector('small').textContent;root.querySelector('.field-picker-art').innerHTML=choice.querySelector('.field-choice-art').innerHTML;close();}
  update();
 }));
 root.querySelector('[data-picker-all]')?.addEventListener('click',()=>{choices.forEach((el,i)=>{el.checked=i<available;});update();});
 root.querySelector('[data-picker-clear]')?.addEventListener('click',()=>{choices.forEach(el=>{el.checked=false;});update();});
 root.querySelector('[data-picker-done]')?.addEventListener('click',close);
 root.addEventListener('keydown',event=>{
  if(root.dataset.disabled==='true')return;
  if(event.key==='Escape'&&root.open){event.preventDefault();event.stopPropagation();close();return;}
  if(!multiple&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)&&choices.length){
   event.preventDefault();root.open=true;const index=choices.indexOf(document.activeElement);
   const target=event.key==='Home'?0:event.key==='End'?choices.length-1:event.key==='ArrowDown'?(index+1)%choices.length:index<0?choices.length-1:(index-1+choices.length)%choices.length;
   choices[target].focus();
  }
 });
 return selection;
}
