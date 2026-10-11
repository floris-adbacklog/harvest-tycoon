// The mouse wheel never moves the page around the game (11 Oct 2026, Part A A7). Only the farm itself caught the wheel (farm-input.js
// zooms with it): a wheel over the bars, a window's backdrop or the end of a list that was scrolled all the way passed on to the page
// around the game, and on CrazyGames their page slid the game out of view. Now every wheel on the page is stopped, unless something under
// the pointer can still scroll that way (a window's list, the chat, a row of tabs): that one scrolls as usual. With
// overscroll-behavior (styles.css, crazygames.css) for a touchpad's swipe past the end.
const SCROLLS=/^(auto|scroll|overlay)$/;
// Whether el, or a box around it, can still scroll in the wheel's direction (dx, dy in pixels; the larger one decides).
export function scrollable(el,dx,dy,win=globalThis){
 const across=Math.abs(dx)>Math.abs(dy),delta=across?dx:dy;if(!delta)return false;
 for(let node=el;node&&node.nodeType===1;node=node.parentElement){
  let style;try{style=win.getComputedStyle(node);}catch{continue;}
  if(across){
   if(!SCROLLS.test(style.overflowX)||node.scrollWidth<=node.clientWidth+1)continue;
   // Right to left the start is 0 and the rest is negative: only how far there is to go counts.
   const at=Math.abs(node.scrollLeft),room=node.scrollWidth-node.clientWidth;
   const back=style.direction==='rtl'?delta>0:delta<0;
   if(back?at>0:at<room-1)return true;
  }else{
   if(!SCROLLS.test(style.overflowY)||node.scrollHeight<=node.clientHeight+1)continue;
   if(delta<0?node.scrollTop>0:node.scrollTop<node.scrollHeight-node.clientHeight-1)return true;
  }
 }
 return false;
}
// One listener on the page, after everything else (the farm's own zoom has already stopped its wheel). Returns how to stop it.
export function guardWheel(doc=globalThis.document,win=globalThis){
 if(!doc?.addEventListener)return ()=>{};
 const onWheel=event=>{
  if(event.defaultPrevented)return;
  const unit=event.deltaMode===1?16:event.deltaMode===2?400:1;
  if(!scrollable(event.target,(event.deltaX||0)*unit,(event.deltaY||0)*unit,win))event.preventDefault();
 };
 doc.addEventListener('wheel',onWheel,{passive:false});
 return ()=>doc.removeEventListener('wheel',onWheel,{passive:false});
}
