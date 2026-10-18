// Small windows (16 Oct 2026, the owner, from Kongregate without full screen: the game in a box of about 1000 x 620, level 19, 16 fields
// of red cabbage all at "7h 33m"): a computer window 700 px high or less. The phone layout runs up to 900 px wide (mobile-ui.js
// mobileLayout, mobile.css), so a small window is a computer one: 901 px wide or more and not a short touch screen. One query for all of
// it: the small-window block of desktop-hud.css is written with the same words (tests/small-window.test.mjs checks they match), and the
// game asks this one matchMedia. Here the parts with rules of their own:
// - the timers of fields that stand together with the same crop, ready within a minute, are one label with how many (timerGroups);
// - on Kongregate, full screen: a button where the page around the farm may go full screen, else one tip on this device.
import {portal} from './portal.js';
export const SMALL_WINDOW='(min-width:901px) and (max-height:700px) and (min-height:551px),(min-width:901px) and (max-height:700px) and (pointer:fine)';
export const smallWindow=typeof matchMedia==='function'?matchMedia(SMALL_WINDOW):{matches:false,addEventListener(){}};
// Every computer window (18 Oct 2026, the owner: cleaner): the words of desktop-hud.css's computer block. The field timers that stand
// together are one label in every one of them, not only in a small window.
export const COMPUTER_WINDOW='(min-width:901px) and (min-height:551px),(min-width:901px) and (pointer:fine)';
export const computerWindow=typeof matchMedia==='function'?matchMedia(COMPUTER_WINDOW):{matches:false,addEventListener(){}};

// A growing field's look: its crop, and watered and cared for (the label looks the same; when it is ready is timerGroups' part). null for
// a field that keeps its own label: empty, ready to harvest, or asking for extra care (the label pulses for a tap). The same care rule as
// game.js drawCrop. A field that may still be watered groups too (16 Oct 2026 review: its label looks just like any other, and a fresh
// planting of 16 is waterable until care opens, so the owner's pile stayed); the group's ring is still green, not the watered blue.
export function timerKey(plot,now){
 if(!plot?.crop||!(now<plot.readyAt)||!plot.tended&&now>=plot.careAt)return null;
 return [plot.crop,plot.watered?1:0,plot.tended?1:0].join('|');
}
// keys: one per field, in the fields' order (timerKey, or null); readyAt: when each is ready; `columns` to a row (game.js lays the fields
// out 4 wide). Fields with the same key that touch side by side or front to back, ready less than a minute from the group's first field,
// are one group (16 Oct 2026 review: a sweep across a whole minute was two labels side by side with the same time, for all of the
// growing; a group never drifts more than a minute either way). Its label is its middle field's: the one nearest the group's centre, of
// two as near the one in front (its label stands over the group, not over the field behind it). Returns per field the field whose label
// stands for it (lead), and per lead how many fields it stands for (count; 1 for a label of its own). Nothing measured: cheap enough for
// every update of the labels.
export function timerGroups(keys,readyAt=[],columns=4){
 const lead=keys.map((_,i)=>i),count=keys.map(()=>1),done=new Set(),at=j=>[j%columns,Math.floor(j/columns)];
 for(let i=0;i<keys.length;i++){
  if(keys[i]==null||done.has(i))continue;
  const group=[i];done.add(i);
  for(let k=0;k<group.length;k++){const j=group[k];for(const n of [j-columns,j+columns,j%columns?j-1:-1,(j+1)%columns?j+1:-1])if(n>=0&&n<keys.length&&!done.has(n)&&keys[n]===keys[i]&&Math.abs((readyAt[n]??0)-(readyAt[i]??0))<60000){done.add(n);group.push(n);}}
  if(group.length<2)continue;
  const cx=group.reduce((s,j)=>s+at(j)[0],0)/group.length,cy=group.reduce((s,j)=>s+at(j)[1],0)/group.length,far=j=>Math.hypot(at(j)[0]-cx,at(j)[1]-cy);
  const mid=group.reduce((best,j)=>far(j)<far(best)-1e-9||Math.abs(far(j)-far(best))<1e-9&&j>best?j:best);
  for(const j of group)lead[j]=mid;count[mid]=group.length;
 }
 return {lead,count};
}

// Full screen on Kongregate. The farm frame and Kongregate's page around it (public/kongregate.html) are the same site, so the farm asks
// that page's document: fullscreenEnabled says whether Kongregate's own frame allows full screen, and the button makes that whole page
// full screen (the farm's frame allows none of its own). Never on the website, in the apps or on another portal.
export const FULL_SCREEN_TIP='Tip: Kongregate\'s full screen gives your farm more room.';
export const FULL_SCREEN_TIP_KEY='harvest-tycoon:fullscreen-tip',FULL_SCREEN_TIP_WAIT_MS=8000;
// 'button' for a small window on Kongregate whose page may go full screen, 'tip' when it may not and this device has not seen the tip,
// null for everything else (another place, a big window, full screen already).
export function fullScreenChoice({portal,small,allowed,active,tipSeen}){
 if(portal!=='kongregate'||!small||active)return null;
 return allowed?'button':tipSeen?null:'tip';
}
// button: the farm's Full screen button (farm.html, hidden until it may show). show(text): the game's toast. storage: localStorage or
// null. quiet(): true while no tip may show (a window open); the tip also waits until the farm has been on screen 8 seconds (after the
// welcome toast), and is tried again every 4 seconds. Once shown it is kept on the device. Nothing here ever throws.
export function createFullScreenOffer({win=globalThis.window,button=null,small=smallWindow,show,storage=null,quiet=()=>false,now=()=>Date.now(),later=(fn,ms)=>setTimeout(fn,ms)}){
 const outer=()=>{try{return win?.parent&&win.parent!==win?win.parent.document:null;}catch{return null;}};
 const seen=()=>{try{return storage?.getItem(FULL_SCREEN_TIP_KEY)==='seen';}catch{return false;}};
 const start=now();let waiting=false,told=false;
 function update(){
  try{
   const doc=outer(),choice=fullScreenChoice({portal:portal(win)?.name,small:Boolean(small?.matches),allowed:Boolean(doc?.fullscreenEnabled&&doc.documentElement?.requestFullscreen),active:Boolean(doc?.fullscreenElement),tipSeen:told||seen()});
   if(button)button.hidden=choice!=='button';
   if(choice!=='tip'||waiting)return;
   if(now()-start<FULL_SCREEN_TIP_WAIT_MS||quiet()){waiting=true;later(()=>{waiting=false;update();},4000);return;}
   told=true;try{storage?.setItem(FULL_SCREEN_TIP_KEY,'seen');}catch{}
   show?.(FULL_SCREEN_TIP);
  }catch{}
 }
 if(button)button.onclick=()=>{try{const asked=outer()?.documentElement?.requestFullscreen?.();asked?.catch?.(()=>{});}catch{}};
 try{small?.addEventListener?.('change',update);outer()?.addEventListener?.('fullscreenchange',update);win?.addEventListener?.('pagehide',()=>{try{outer()?.removeEventListener?.('fullscreenchange',update);}catch{}},{once:true});}catch{}
 update();
 return {update};
}
