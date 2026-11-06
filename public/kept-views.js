// Windows open with what they showed last time (6 Nov 2026, the owner: "doe alle", the game should feel faster). The Leaderboard, the
// Farm Family and News already kept their last view while the game was open (src/game-cloud.js boardCache, public/family-ui.js view,
// src/chat-ui.js noticesRead); now that view is kept on this device too, so the first look after a new start shows it at once while the
// newest is read, as Chat does. Only a picture of a window: the server's answer always takes over, nothing here is farm data.
// Kept per farmer (another farmer on this device sees none of it) and for KEPT_DAYS at most; a view too large to keep is not kept.
// Storage that is blocked or full simply keeps nothing.
export const KEPT_KEY='harvest-tycoon:kept-view:',KEPT_DAYS=3,KEPT_MAX=200000;
const local=()=>{try{return globalThis.localStorage??null;}catch{return null;}};
export function keptView(name,player,{storage=local(),now=Date.now(),days=KEPT_DAYS}={}){
 if(!name||!player||!storage)return null;
 try{
  const kept=JSON.parse(storage.getItem(KEPT_KEY+name)??'null');
  if(!kept||kept.player!==player||!Number.isFinite(kept.at)||now-kept.at>days*86400000||now<kept.at-60000)return null;
  return kept.view??null;
 }catch{return null;}
}
export function keepView(name,player,view,{storage=local(),now=Date.now()}={}){
 if(!name||!player||!storage||view==null)return false;
 try{
  const text=JSON.stringify({player,at:now,view});
  if(text.length>KEPT_MAX){storage.removeItem(KEPT_KEY+name);return false;}
  storage.setItem(KEPT_KEY+name,text);return true;
 }catch{return false;}
}
// Prefetch on touch (item 4 of the same day): a press on a button or a More-menu tile that opens a window starts reading that window's
// newest view, so it is there, or on its way, by the time the press ends in a click (about 100 ms with a mouse, more on a phone). ids:
// the buttons' ids; a More-menu tile names its button in data-menu-action. warm() runs at most once every gap ms.
export function warmOnPress(ids,warm,{doc=globalThis.document,gap=4000,now=()=>Date.now()}={}){
 if(!doc?.addEventListener)return ()=>{};
 const wanted=new Set(ids);let last=-Infinity;
 const press=event=>{
  const el=event.target?.closest?.('button,[role="button"]');if(!el)return;
  if(!wanted.has(el.id)&&!wanted.has(el.dataset?.menuAction))return;
  if(el.disabled||now()-last<gap)return;last=now();
  try{const done=warm();if(done&&typeof done.catch==='function')done.catch(()=>{});}catch{}
 };
 doc.addEventListener('pointerdown',press,{capture:true,passive:true});
 return ()=>doc.removeEventListener('pointerdown',press,{capture:true});
}
