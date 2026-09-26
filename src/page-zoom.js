// The game is played with fingers. Pinching over the farm zooms the 3D field (its canvas has touch-action:none and handles the
// gesture), but pinching anywhere else, over a button, a panel or the chat, used to zoom the whole app, which then stayed enlarged
// and cut off at the edges. In the game the page itself no longer zooms: touch-action in styles.css (the game frame) and welcome.css
// (the page, once signed in), a viewport without zoom once signed in (which also undoes a zoom already made), and Safari's own
// pinch events, which iPhones send even when the viewport says no. The signed-out home page stays zoomable for reading.
export const PAGE_VIEWPORT='width=device-width, initial-scale=1, viewport-fit=cover';
export const GAME_VIEWPORT='width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover';
export function stopPageZoom(doc=document,inGame=()=>true){
 const stop=event=>{if(inGame())event.preventDefault();};
 for(const type of ['gesturestart','gesturechange'])doc.addEventListener(type,stop,{passive:false});
}
// The installed app keeps one viewport from the start (app-mode.js sets it; 26 Sep 2026): changing the viewport while it runs may be
// what makes iOS lay the page out a status bar short. Nothing changes when the content is already right.
export function gameViewport(on,doc=document){
 const meta=doc.querySelector('meta[name="viewport"]');if(!meta)return;
 const content=on||doc.documentElement?.dataset?.appMode==='standalone'?GAME_VIEWPORT:PAGE_VIEWPORT;
 if(meta.getAttribute('content')!==content)meta.setAttribute('content',content);
}
