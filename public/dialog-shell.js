// The window shell's one bit of script (18 Oct 2026, public/dialog-shell.css). A window that has been scrolled gets data-scrolled, so its
// heading shows a thin line under it while the list moves beneath; and every open window knows how tall its heading is (--head-h), so a
// tab bar further down can stay on top just under it and a jump to a row never ends under the heading. One quiet listener for every
// window, also the ones made later. And setDialogBadge: the picture in a window's heading, for the windows that show more than one place
// (the tractor and the silo, the stall and the chores, the Valley Market and the Ranch, the Estate's places).
import {art} from './visual-icons.js';
const SHELL='dialog.is-sheet,dialog.is-card';
function onScroll(event){
 const box=event.target;
 if(!box?.matches?.(SHELL))return;
 const scrolled=box.scrollTop>4;
 if(scrolled!==box.hasAttribute('data-scrolled'))box.toggleAttribute('data-scrolled',scrolled);
}
function measure(dialog){
 const head=dialog.querySelector(':scope>.dialog-top,:scope>.dialog-heading');
 if(!head)return;
 const h=Math.round(head.getBoundingClientRect().height);
 if(h>0)dialog.style.setProperty('--head-h',`${h}px`);
}
const sizes=typeof ResizeObserver==='function'?new ResizeObserver(entries=>{for(const e of entries){const d=e.target.closest?.('dialog');if(d)measure(d);}}):null;
// The ⓘ beside Close (23 Oct 2026, the owner: the windows too busy): a window's rules (how it works) are hidden where they stand
// (public/calm-windows.css, the same list) and wait behind it. A press opens a small card under the heading with them, a second press
// closes it, and each time the window opens it starts closed (24 Oct 2026, the owner: "wat doet dit i'tje hier? ik klik erop maar er
// gebeurt niks": it showed the lines where they stood, which could be in another tab or far down the window). It shows only while the
// window has such a line to show, one in a tab that is not open does not count. Its name is the words the game already has ("How it
// works"), so the page translates it; the card holds the lines' own words, already in the farmer's language.
export const HINT_LINES='.seed-yield-line,.gift-note,.orders-lead,.warehouse-lead,.silo-lead,.silo-note,.estate-lead,.season-rule,.pass-rule,.tractor-rule,.family-footnote';
// A line's words with a space between its parts (a title and its sentence), as they read on screen.
const words=line=>{const parts=[];const walk=node=>{for(const child of node.childNodes??[]){if(child.nodeType===3)parts.push(child.data);else walk(child);}};walk(line);return (parts.length?parts.join(' '):line.textContent??'').replace(/\s+/g,' ').trim();};
export function hintTexts(dialog){
 const lines=[...dialog.querySelectorAll(HINT_LINES)];
 if(dialog.id==='seed-dialog')lines.unshift(...dialog.querySelectorAll(':scope>p'));
 const seen=new Set();
 return lines.filter(line=>!line.closest('[hidden]')&&!line.closest('.hints-panel')).map(words).filter(text=>text&&!seen.has(text)&&seen.add(text));
}
const hintWatch=new WeakMap();
function closeHints(dialog){dialog?.querySelector?.('.hints-panel')?.remove();dialog?.querySelector?.('.hints-button')?.setAttribute('aria-pressed','false');}
export function hintsButton(dialog,doc=dialog?.ownerDocument??globalThis.document,Observer=globalThis.MutationObserver){
 const close=dialog?.querySelector?.('.dialog-heading .close-dialog');
 if(!close)return null;
 let button=close.parentElement.querySelector(':scope>.hints-button');
 if(!button){
  button=doc.createElement('button');button.type='button';button.className='hints-button';button.textContent='i';
  button.setAttribute('aria-label','How it works');
  button.addEventListener('click',()=>{
   if(dialog.querySelector('.hints-panel')){closeHints(dialog);return;}
   const texts=hintTexts(dialog);if(!texts.length)return;
   const panel=doc.createElement('div');panel.className='hints-panel';panel.setAttribute('translate','no');
   for(const text of texts){const line=doc.createElement('p');line.textContent=text;panel.append(line);}
   const head=dialog.querySelector(':scope>.dialog-top,:scope>.dialog-heading')??close.parentElement;
   head.after(panel);button.setAttribute('aria-pressed','true');
   try{dialog.scrollTo?.({top:0});}catch{}
  });
  close.before(button);
 }
 closeHints(dialog);
 const show=()=>{const none=!hintTexts(dialog).length;if(button.hidden!==none)button.hidden=none;};
 show();
 // While the window is open its content changes (a tab, a new batch): the ⓘ follows; the watch ends when it closes (watch below).
 if(typeof Observer==='function'&&!hintWatch.has(dialog)){const w=new Observer(show);w.observe(dialog,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});hintWatch.set(dialog,w);}
 return button;
}
function watch(dialog){
 if(!dialog?.matches?.(SHELL))return;
 if(!dialog.open){dialog.removeAttribute('data-scrolled');try{hintWatch.get(dialog)?.disconnect();hintWatch.delete(dialog);closeHints(dialog);}catch{}return;}
 try{hintsButton(dialog);}catch{}
 measure(dialog);
 const head=dialog.querySelector(':scope>.dialog-top,:scope>.dialog-heading');
 if(head&&sizes&&!head.dataset.watched){head.dataset.watched='';sizes.observe(head);}
}
// A window's stylesheet that a module adds later (the Special offer, the Starter Pack, the admin view: src/offer-ui.js and the others) and
// that fails to load is asked for again after 2 and after 4 seconds, with ?retry= so no cache answers for it (18 Oct 2026: a player's
// Android app showed the Special offer without its stylesheet, its pictures full width, right after an update; the window styles itself
// as soon as the sheet arrives). A load error does not bubble, so it is caught on its way down.
export const STYLE_RETRIES=2;
export function retryStyle(event,later=setTimeout){
 const link=event?.target;
 if(link?.tagName!=='LINK'||!/\bstylesheet\b/.test(link.rel||''))return false;
 const tried=Number(link.dataset.retry||0);if(tried>=STYLE_RETRIES)return false;
 link.dataset.retry=String(tried+1);
 later(()=>{try{const url=new URL(link.href);url.searchParams.set('retry',String(tried+1));link.href=url.href;}catch{}},2000*(tried+1));
 return true;
}
if(typeof document!=='undefined'){
 document.addEventListener('error',event=>retryStyle(event),true);
 document.addEventListener('scroll',onScroll,{capture:true,passive:true});
 if(typeof MutationObserver==='function')new MutationObserver(list=>{for(const m of list)if(m.attributeName==='open')watch(m.target);}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
}
export function setDialogBadge(dialog,key){
 const badge=dialog?.querySelector?.('.dialog-heading .dialog-badge');
 if(!badge||badge.dataset.art===key)return;
 const holder=document.createElement('template');holder.innerHTML=art(key,'dialog-badge');
 const picture=holder.content.firstElementChild;if(!picture)return;
 picture.setAttribute('aria-hidden','true');badge.replaceWith(picture);
}
