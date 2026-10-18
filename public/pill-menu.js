// A compact pill menu (18 Oct 2026, the owner's rule: compact pill dropdowns, not rows of big segmented buttons): a pill that says what is
// chosen ("Growing time: All ▾") with the same choice buttons as before in a small list under it. The buttons keep their own hooks and
// handlers; this only opens and closes the list. Markup: <button class="pill-menu-toggle" aria-controls="X" aria-expanded="false">…
// <b data-pill-current></b></button><div id="X" class="pill-menu-list" hidden>…the choices…</div>. One listener for every menu, also the
// ones a window draws later. The list closes after a pick, on a tap outside it and on Escape. [data-pill-current] shows the words of the
// choice that is pressed (aria-pressed="true", or .active).
const OPEN='.pill-menu-toggle[aria-expanded="true"]';
function listOf(toggle){return toggle?.ownerDocument?.getElementById(toggle.getAttribute('aria-controls')??'')??null;}
export function setPill(toggle,open){
 const list=listOf(toggle);if(!list)return;
 list.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
}
export function closePills(doc=document,except=null){for(const t of doc.querySelectorAll(OPEN))if(t!==except)setPill(t,false);}
// The pill's words: the chosen choice's, without its count or picture.
export function showChoice(toggle){
 const list=listOf(toggle),slot=toggle?.querySelector('[data-pill-current]');if(!list||!slot)return;
 const chosen=list.querySelector('[aria-pressed="true"],.active,[aria-selected="true"]');
 const own=[...(chosen?.childNodes??[])].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim();
 const words=chosen?(chosen.querySelector('[data-pill-name]')?.textContent??(own||chosen.textContent)):'';
 if(words&&slot.textContent!==words.trim())slot.textContent=words.trim();
}
export function refreshPills(root=document){for(const t of root.querySelectorAll?.('.pill-menu-toggle[aria-controls]')??[])showChoice(t);}
if(typeof document!=='undefined'){
 document.addEventListener('click',event=>{
  const toggle=event.target.closest?.('.pill-menu-toggle[aria-controls]');
  if(toggle){const open=toggle.getAttribute('aria-expanded')!=='true';closePills(document,toggle);setPill(toggle,open);return;}
  const list=event.target.closest?.('.pill-menu-list');
  // After a pick the focus goes back to the pill, unless the window moved it on purpose (Feedback puts it in the message box, so a
  // phone's keyboard opens): only when it was in the list or fell to the page.
  if(list){if(event.target.closest('button')){const t=document.querySelector(`.pill-menu-toggle[aria-controls="${list.id}"]`);if(t){setPill(t,false);queueMicrotask(()=>showChoice(t));setTimeout(()=>showChoice(t),0);
   const a=document.activeElement;if(!a||a===document.body||list.contains(a)||!a.isConnected)t.focus?.({preventScroll:true});}}return;}
  closePills();
 });
 // Escape closes a list that can be seen, in the window the farmer is in; a list left open in a window that has gone is closed quietly
 // and lets Escape through (that other window still closes).
 const showing=t=>{const box=t.closest('dialog'),here=document.activeElement?.closest?.('dialog')??null;return t.getClientRects().length>0&&(!box||box.open)&&(!here||here===box);};
 document.addEventListener('keydown',event=>{
  if(event.key!=='Escape')return;
  const all=[...document.querySelectorAll(OPEN)];if(!all.length)return;
  const open=all.find(showing);for(const t of all)if(t!==open&&!showing(t))setPill(t,false);
  if(!open)return;event.preventDefault();event.stopPropagation();setPill(open,false);open.focus?.({preventScroll:true});
 },true);
 // A window that closes (its ×, Escape, or code closing every open window) closes its lists too, so it opens with them shut.
 if(typeof MutationObserver==='function')new MutationObserver(list=>{for(const m of list){const box=m.target;if(box?.tagName==='DIALOG'&&!box.open)for(const t of box.querySelectorAll(OPEN))setPill(t,false);}}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
 // A list drawn anew (a window's render) says its choice again.
 if(typeof MutationObserver==='function')new MutationObserver(list=>{for(const m of list){const t=m.target.closest?.('.pill-menu-list')??null;if(t){const toggle=document.querySelector(`.pill-menu-toggle[aria-controls="${t.id}"]`);if(toggle)showChoice(toggle);}}}).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
}
