// The phone's event rail (18 Oct 2026, the window shell; the owner's question b, answered yes the same day): a short column of HUD buttons
// at the right-hand edge of the farm, under the top bar, for what is on for a while. The Special offer's tile (src/offer-ui.js makes it)
// is there while the offer runs; Today, Events and the Halloween Pass are there as round buttons only while something waits for the farmer
// there, by the same signal as their own badge: #today-dot (today's gift, a challenge to claim or an order to deliver, retention-ui.js),
// #events-dot (a reward to collect or a running event not opened yet, live-events-ui.js) and #pass-dot (a reward to claim, pass-ui.js).
// All three stay in More as well. On a phone (mobileLayout) the buttons themselves move into #event-rail, on a computer back to where they
// were (nothing changes there), so every selector and handler that knows them keeps working. Nothing here ever throws.
import {mobileLayout} from './mobile-ui.js';
export const RAIL_IDS=Object.freeze(['offer-button','today-button','events-button','pass-button']);
// The buttons that show in the rail only while their badge shows (a button the page hides itself, Events before its level or the pass
// out of season, stays hidden).
export const WAIT_DOTS=Object.freeze({'today-button':'today-dot','events-button':'events-dot','pass-button':'pass-dot'});
const homes=new Map();
// is-waiting on a button while its badge shows (hud.css shows it in the rail only then).
export function markWaiting(doc=globalThis.document){
 try{
  for(const [id,dot] of Object.entries(WAIT_DOTS)){
   const button=doc.getElementById(id),badge=doc.getElementById(dot);
   if(button)button.classList.toggle('is-waiting',Boolean(badge&&!badge.hidden));
  }
 }catch{}
}
function place(){
 try{
  const rail=document.getElementById('event-rail');if(!rail)return;
  for(const id of RAIL_IDS){
   const node=document.getElementById(id);if(!node)continue;
   if(mobileLayout.matches){
    if(node.parentElement===rail)continue;
    if(!homes.has(id))homes.set(id,{parent:node.parentElement,next:node.nextSibling});
    rail.append(node);
   }else if(node.parentElement===rail){
    const home=homes.get(id);
    if(home?.parent?.isConnected)home.parent.insertBefore(node,home.next?.parentNode===home.parent?home.next:null);else document.body.append(node);
   }
  }
 }catch{}
}
export function startEventRail(){
 place();markWaiting();
 try{mobileLayout.addEventListener('change',place);}catch{}
 try{
  if(typeof MutationObserver==='function'){
   // The offer's tile is made by the cloud script, after the farm page: it is placed as soon as it is there.
   const watch=new MutationObserver(()=>{if(!mobileLayout.matches||RAIL_IDS.every(id=>{const n=document.getElementById(id);return !n||n.parentElement?.id==='event-rail';}))return;place();});
   watch.observe(document.body,{childList:true});
   // A badge that shows or hides takes its button into the rail or out of it.
   const badges=new MutationObserver(()=>markWaiting());
   for(const dot of Object.values(WAIT_DOTS)){const el=document.getElementById(dot);if(el)badges.observe(el,{attributes:true,attributeFilter:['hidden']});}
  }
 }catch{}
}
if(typeof document!=='undefined'&&document.body)startEventRail();
