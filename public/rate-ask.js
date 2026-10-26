import {portal} from './portal.js';
import {levelOf} from './farm-state.js';
// A rating on Kongregate (26 Oct 2026, the owner: 28 ratings from 694 players, 3.3 stars; the farmers who stay rarely rate). Once on a
// device, from level 10, a plain question in the game's toast: no reward, no question first, never again (a reward for a rating, or
// asking only the happy farmers, is not fair play). Never on the website, in the apps or on another portal.
export const RATE_ASK='Enjoying Harvest Tycoon? Please rate it on Kongregate and help more players discover the game.';
export const RATE_ASK_KEY='harvest-tycoon:rate-ask',RATE_ASK_LEVEL=10,RATE_ASK_WAIT_MS=60000,RATE_ASK_SHOW_MS=9000;
export const rateAskDue=({portal,level,seen})=>portal==='kongregate'&&level>=RATE_ASK_LEVEL&&!seen;
// show(text,options): the game's toast. storage: localStorage or null. quiet(): true while nothing may show (a window open, the calm
// start). It waits until the farm has been on screen a minute, then looks every 20 seconds. Nothing here ever throws.
export function createRateAsk({win=globalThis.window,state,show,storage=null,quiet=()=>false,now=()=>Date.now(),later=(fn,ms)=>setTimeout(fn,ms)}){
 let name=null;try{name=portal(win)?.name??null;}catch{}
 if(name!=='kongregate')return {check:()=>false};
 const start=now();let told=false;
 const seen=()=>{if(told)return true;try{return storage?.getItem(RATE_ASK_KEY)==='seen';}catch{return false;}};
 function check(){
  try{
   if(!rateAskDue({portal:name,level:levelOf(state),seen:seen()})){if(!seen())later(check,20000);return false;}
   if(now()-start<RATE_ASK_WAIT_MS||quiet()){later(check,20000);return false;}
   told=true;try{storage?.setItem(RATE_ASK_KEY,'seen');}catch{}
   show?.(RATE_ASK,{duration:RATE_ASK_SHOW_MS});return true;
  }catch{return false;}
 }
 later(check,RATE_ASK_WAIT_MS);
 return {check};
}
