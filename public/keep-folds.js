// Fold-outs stay open while their window does (16 Oct 2026, the owner: an opened fold-out closed again by itself). A window that draws
// its content anew (on a timer, after a farm update, the family's or the events' refresh) wrote every <details> closed again. A fold-out
// that should stay carries data-fold="…": a key that is the same on every render and unique in its window (a member's menu has the
// member in it), never its summary, which is translated and holds numbers. keepFolds(container,write) notes which keyed folds are open,
// writes (write() or an HTML string) and sets the same ones open again; one the player closed stays closed, one it has not seen yet
// keeps what its HTML says. Every open and close the player makes is noted as it happens too, so a tab of the same window that is written
// without keepFolds (the Estate's Stall, Today's Challenges) cannot bring back a fold the player closed before going there. The <dialog>
// around the container closing forgets them, so they start closed next time, as before.
// It never throws for itself: no container, or a browser without <details>, and it only writes.
const kept=new WeakMap(),watched=new WeakSet(),heard=new WeakSet();
export function keepFolds(container,write){
 let folds=null;
 try{
  folds=kept.get(container);
  if(folds){for(const fold of container.querySelectorAll('details[data-fold]'))if(typeof fold.open==='boolean')folds.set(fold.dataset.fold,fold.open);}
  else{folds=new Map();kept.set(container,folds);}
  // 'toggle' does not bubble; a listener in the capture phase hears it from every fold in the container, once per container.
  if(!heard.has(container)&&container.addEventListener){heard.add(container);container.addEventListener('toggle',e=>{const fold=e.target;if(fold?.dataset?.fold!==undefined&&typeof fold.open==='boolean')kept.get(container)?.set(fold.dataset.fold,fold.open);},true);}
  // A window closed and opened again at once (one window's button opening another in its place) keeps them.
  const dialog=container.closest?.('dialog');
  if(dialog&&!watched.has(container)){watched.add(container);dialog.addEventListener('close',()=>{if(!dialog.open)kept.delete(container);});}
 }catch{folds=null;}
 if(typeof write==='function')write();else if(container)container.innerHTML=write;
 try{if(folds?.size)for(const fold of container.querySelectorAll('details[data-fold]')){const open=folds.get(fold.dataset.fold);if(typeof open==='boolean'&&typeof fold.open==='boolean'&&fold.open!==open)fold.open=open;}}catch{}
}
