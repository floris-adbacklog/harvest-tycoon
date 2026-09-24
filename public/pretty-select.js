// Every <select> in the game looks like the game: a soft button with the chosen option and a chevron, which opens a short menu.
// The real <select> stays in the page (hidden), so forms, labels and the code that reads or sets its value keep working: picking an
// option sets its value and fires "input" and "change" like a real choice, and setting .value from code updates the button.
// An <option> can carry data-art (a picture), data-note (a small second line) and data-detail with data-detail-art (on the right,
// like a price). data-pretty="compact" on the <select> makes a small pill; data-native keeps the plain browser control.
import {art} from './visual-icons.js';

const CHEVRON='<svg class="pretty-select-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PROTO=globalThis.HTMLSelectElement?.prototype;
let openMenu=null;

function labelText(select,labels){
 const own=select.getAttribute('aria-label');if(own)return own;
 const label=labels[0];if(!label)return '';
 const copy=label.cloneNode(true);copy.querySelectorAll('select,.pretty-select').forEach(node=>node.remove());
 return copy.textContent.replace(/\s+/g,' ').trim();
}
// The nearest box that cuts off what sticks out (a scrolling dialog), or the window.
function clipRect(element){
 for(let node=element.parentElement;node&&node!==document.body;node=node.parentElement){
  if(/(auto|scroll|hidden|clip)/.test(getComputedStyle(node).overflowY))return node.getBoundingClientRect();
 }
 return {top:0,bottom:window.innerHeight,left:0,right:window.innerWidth};
}
const optionText=option=>option?.textContent.replace(/\s+/g,' ').trim()??'';
function optionRow(option){
 const detail=option.dataset.detail?`<b class="pretty-select-detail">${option.dataset.detailArt?art(option.dataset.detailArt):''}${esc(option.dataset.detail)}</b>`:'';
 return `<button type="button" role="option" class="pretty-select-option" data-index="${option.index}" aria-selected="${option.selected}" ${option.disabled?'disabled':''}>${option.dataset.art?`<span class="pretty-select-option-art">${art(option.dataset.art)}</span>`:''}<span class="pretty-select-option-text"><span>${esc(optionText(option))}</span>${option.dataset.note?`<small>${esc(option.dataset.note)}</small>`:''}</span>${detail}</button>`;
}

export function prettySelect(select){
 if(!PROTO||select.dataset.prettyReady||select.hasAttribute('data-native')||select.multiple)return;
 select.dataset.prettyReady='1';
 const wrap=document.createElement('div');wrap.className=`pretty-select${select.dataset.pretty==='compact'?' is-compact':''}`;
 const toggle=document.createElement('button');toggle.type='button';toggle.className='pretty-select-toggle';
 toggle.setAttribute('aria-haspopup','listbox');toggle.setAttribute('aria-expanded','false');
 // The select's labels, kept before a <label for> is pointed at the new button (a tap on it then opens the menu).
 const labels=[...(select.labels??[])];
 if(select.id){toggle.id=`${select.id}-button`;for(const label of labels)if(label.htmlFor===select.id)label.htmlFor=toggle.id;}
 wrap.append(toggle);select.after(wrap);
 select.classList.add('pretty-select-native');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 let menu=null,typed='',typedAt=0;

 function sync(){
  const option=select.options[select.selectedIndex],text=optionText(option),name=labelText(select,labels);
  toggle.innerHTML=`<span class="pretty-select-value">${esc(text)}</span>${CHEVRON}`;
  toggle.disabled=select.disabled;wrap.hidden=select.hidden;
  toggle.setAttribute('aria-label',name?`${name}: ${text}`:text);
  if(menu)fill();
 }
 function fill(){
  menu.innerHTML=[...select.children].map(child=>child.tagName==='OPTGROUP'?`<div class="pretty-select-group" role="presentation">${esc(child.label)}</div>${[...child.children].map(optionRow).join('')}`:child.tagName==='OPTION'?optionRow(child):'').join('');
 }
 function place(){
  menu.classList.remove('is-up','is-end');menu.style.maxHeight='';
  const box=toggle.getBoundingClientRect(),clip=clipRect(wrap),below=clip.bottom-box.bottom-10,above=box.top-clip.top-10;
  const up=below<Math.min(menu.scrollHeight,220)&&above>below;
  menu.classList.toggle('is-up',up);menu.style.maxHeight=`${Math.max(132,Math.min(340,up?above:below))}px`;
  if(menu.getBoundingClientRect().right>Math.min(clip.right??window.innerWidth,window.innerWidth)-8)menu.classList.add('is-end');
 }
 const options=()=>[...menu.querySelectorAll('.pretty-select-option:not(:disabled)')];
 function focusOption(button){if(!button)return;button.focus({preventScroll:true});button.scrollIntoView({block:'nearest'});}
 function open(){
  if(select.disabled||menu)return;openMenu?.close();
  menu=document.createElement('div');menu.className='pretty-select-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',labelText(select,labels)||'Choose');
  wrap.append(menu);fill();place();toggle.setAttribute('aria-expanded','true');wrap.classList.add('is-open');
  openMenu={wrap,close};
  focusOption(menu.querySelector('.pretty-select-option[aria-selected="true"]:not(:disabled)')??options()[0]);
 }
 function close(){
  if(!menu)return;menu.remove();menu=null;toggle.setAttribute('aria-expanded','false');wrap.classList.remove('is-open');
  if(openMenu?.wrap===wrap)openMenu=null;
 }
 function choose(index){
  const changed=select.selectedIndex!==index;
  close();toggle.focus();
  if(!changed)return;
  Object.getOwnPropertyDescriptor(PROTO,'selectedIndex').set.call(select,index);sync();
  select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));
 }
 toggle.addEventListener('click',()=>menu?close():open());
 toggle.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();open();}});
 wrap.addEventListener('click',event=>{const button=event.target.closest('.pretty-select-option');if(button&&!button.disabled)choose(Number(button.dataset.index));});
 wrap.addEventListener('keydown',event=>{
  if(!menu||!menu.contains(event.target))return;
  const list=options(),at=list.indexOf(document.activeElement);
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();toggle.focus();return;}
  if(event.key==='Tab'){close();return;}
  const next={ArrowDown:Math.min(at+1,list.length-1),ArrowUp:Math.max(at-1,0),Home:0,End:list.length-1}[event.key];
  if(next!==undefined){event.preventDefault();focusOption(list[next]);return;}
  // Typing letters jumps to the first option that starts with them (handy in the long lists of crops and goods).
  // A space only counts while typing (otherwise it picks the option, like Enter).
  const typing=typed&&Date.now()-typedAt<700;
  if(event.key.length===1&&(/\S/.test(event.key)||typing)&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   if(event.key===' ')event.preventDefault();
   typed=(typing?typed:'')+event.key.toLowerCase();typedAt=Date.now();
   focusOption(list.find(button=>button.textContent.trim().toLowerCase().startsWith(typed)));
  }
 });
 // Code that sets .value or .selectedIndex, swaps the options or disables the select updates the button too.
 for(const key of ['value','selectedIndex']){
  const property=Object.getOwnPropertyDescriptor(PROTO,key);
  Object.defineProperty(select,key,{configurable:true,get(){return property.get.call(this);},set(value){property.set.call(this,value);sync();}});
 }
 new MutationObserver(sync).observe(select,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','hidden','aria-label','selected','label']});
 select.addEventListener('change',sync);select.form?.addEventListener('reset',()=>setTimeout(sync));
 sync();
}

export function prettifySelects(root=document){root.querySelectorAll('select:not([data-pretty-ready]):not([data-native]):not([multiple])').forEach(prettySelect);}

// Once per page: dress the selects that are there, and every one added later; close an open menu on a tap elsewhere.
let watching=false;
export function watchSelects(){
 if(watching||!globalThis.document?.body)return;watching=true;
 prettifySelects();
 let queued=false;
 new MutationObserver(records=>{
  if(queued||!records.some(record=>[...record.addedNodes].some(node=>node.nodeType===1)))return;
  queued=true;queueMicrotask(()=>{queued=false;prettifySelects();});
 }).observe(document.body,{childList:true,subtree:true});
 document.addEventListener('pointerdown',event=>{if(openMenu&&!openMenu.wrap.contains(event.target))openMenu.close();},true);
 window.addEventListener('resize',()=>openMenu?.close());
}
