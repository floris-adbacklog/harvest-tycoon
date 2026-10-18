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
if(typeof document!=='undefined'){
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
