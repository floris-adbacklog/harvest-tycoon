import {featureUnlocked} from './farm-state.js';
// The fertilizer tip (21 Oct 2026, the owner, after players kept asking how to fertilize a field: "2+4"). The first time the farm has
// natural fertilizer and the tractor, one toast says in one sentence how to use it: the tractor's Fertilize job (24 Oct 2026, the owner:
// "Haal natuurlijke mest uit Windmolen, gaat nu via tractor"; the Windmill's hand fertilizing is gone). Once per device, as the sweep tip and the long-wait tip: the device keeps it in localStorage (in
// memory where storage is blocked), so no save key. It waits a moment (FERTILIZER_TIP_DELAY_MS), so the toast of what brought the
// fertilizer (a batch collected, a helping hand) is read first, and it stays FERTILIZER_TIP_SHOW_MS like the long-wait tip. Never while
// quiet() says so (the Beginner guide, the admin view, the village, an open window): then it comes at a later check. No popup.
export const FERTILIZER_TIP_KEY='harvest-tycoon:fertilizer-tip';
export const FERTILIZER_TIP_DELAY_MS=3500,FERTILIZER_TIP_SHOW_MS=6000;
export const FERTILIZER_TIP_TEXT='Use natural fertilizer on growing fields with the tractor’s Fertilize job to cut their growing time by 35%.';
// Whether the farm is ready for the tip: fertilizer in storage and the tractor open.
export const fertilizerTipDue=state=>(state?.inventory?.fertilizer??0)>0&&featureUnlocked(state,'tractor');
export const fertilizerTipText=()=>FERTILIZER_TIP_TEXT;
// state: the farm (the same object, kept up to date). show(text,options): the game's toast. check(): after every farm update; true when
// the tip is on its way. Nothing here ever throws.
export function createFertilizerTip({state,show,quiet=()=>false,storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})(),wait=(fn,ms)=>setTimeout(fn,ms)}){
 let shown=false,waiting=false;
 const seen=()=>{try{return Boolean(storage?.getItem(FERTILIZER_TIP_KEY));}catch{return false;}};
 const ready=()=>!shown&&!seen()&&!quiet()&&fertilizerTipDue(state);
 return {check(){
  try{
   if(waiting||!ready())return false;
   waiting=true;
   wait(()=>{
    waiting=false;
    try{
     if(!ready())return;
     shown=true;try{storage?.setItem(FERTILIZER_TIP_KEY,'1');}catch{}
     show(fertilizerTipText(state),{duration:FERTILIZER_TIP_SHOW_MS,icon:'fertilizer',tone:'info'});
    }catch{}
   },FERTILIZER_TIP_DELAY_MS);
   return true;
  }catch{return false;}
 }};
}
