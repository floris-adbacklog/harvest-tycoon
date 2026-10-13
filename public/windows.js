// The farm's windows (13 Oct 2026, Android app 1.3): which window is on top, the apps' Back button, and the farm's rest under a window.
// A window opened with showModal (Market, Settings, the wiki, a profile, a confirmation) lies above every other window; the pond and the
// lake are opened with show. Among windows of one kind the one opened last is on top: a watch on their open attribute keeps that order
// (a window already open when the watch started counts as opened before the others, in page order). A window gliding shut (.is-closing,
// the pond) is no longer open.
export function modalOpen(doc=globalThis.document){try{return doc.querySelector('dialog:modal')!==null;}catch{return false;}}   // :modal needs Chrome 105+; an older WebView counts as no window
const modal=dialog=>{try{return dialog.matches(':modal');}catch{return true;}};
export function watchWindows(doc=globalThis.document,Observer=globalThis.MutationObserver){
 let order=[];
 const note=records=>{for(const {target} of records??[])if(target?.tagName==='DIALOG'){order=order.filter(d=>d!==target);if(target.open)order.push(target);}};
 const watch=typeof Observer==='function'?new Observer(note):null;watch?.observe(doc.documentElement??doc,{subtree:true,attributes:true,attributeFilter:['open']});
 function top(){
  if(watch)note(watch.takeRecords());
  const open=[...doc.querySelectorAll('dialog[open]')].filter(d=>!d.classList?.contains('is-closing'));order=order.filter(d=>open.includes(d));
  return open.map((d,i)=>({d,i,rank:(modal(d)?open.length+1:0)+order.indexOf(d)})).sort((a,b)=>a.rank-b.rank||a.i-b.i).at(-1)?.d??null;
 }
 return {top,stop:()=>watch?.disconnect()};
}
// Back (window.harvestBack; the app asks the page around the farm, which asks this page: src/main.js, src/farm-session.js) does what
// Escape does on a computer, to the top-most window only: first that window's own Escape (the fish book before the pond, a menu inside
// a window), then, as the browser does with Escape, its cancel (a window that waits for the server says no there) and close. Right
// away, without waiting for a window's closing glide. true: a window was open (closed now, or it chose to stay open); false: none was,
// and the app does what Back did before (back a page, or leave the game).
export function createBack({doc=globalThis.document,win=globalThis.window,windows=watchWindows(doc,win?.MutationObserver)}={}){
 return function back(){
  try{
   const top=windows.top();if(!top)return false;
   const focus=doc.activeElement,at=focus&&top.contains?.(focus)?focus:top;
   if(!at.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true})))return true;
   if(top.open&&!top.classList?.contains('is-closing')&&top.dispatchEvent(new win.Event('cancel',{cancelable:true})))top.close();
   return true;
  }catch{return false;}
 };
}
// Phones, tablets and the apps (13 Oct 2026, Android vitals: a weak graphics chip stalled on the farm behind a window, and the app
// stopped answering taps): under a window opened with showModal the farm is drawn once a second instead of 30 times, so the chip rests
// and the window's blurred backdrop is not made again every frame (the vignette's blur went for the same reason, styles.css). A
// computer draws as before. handheld: Android and iPhone/iPad (an iPad says Macintosh, with a touch screen) and both apps
// (html[data-app]); a phone-sized layout counts as well (public/game.js asks mobileLayout every frame).
export const FARM_REST_MS=1000;
export function handheldDevice({ua=globalThis.navigator?.userAgent??'',touchPoints=globalThis.navigator?.maxTouchPoints??0,app=Boolean(globalThis.document?.documentElement?.hasAttribute?.('data-app'))}={}){
 return app||/Android|iPhone|iPad|iPod/.test(ua)||/Macintosh/.test(ua)&&touchPoints>1;
}
export function farmRests(handheld,sinceDraw,modal){return Boolean(handheld)&&sinceDraw<FARM_REST_MS&&Boolean(modal());}
