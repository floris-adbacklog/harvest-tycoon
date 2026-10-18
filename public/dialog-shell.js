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
function watch(dialog){
 if(!dialog?.matches?.(SHELL))return;
 if(!dialog.open){dialog.removeAttribute('data-scrolled');return;}
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
