// The sweep tip (16 Oct 2026, the owner): "Many people plant and water one by one; it is too unclear that you can go faster by
// swiping. When you plant, water or give care one by one, show a small message that you can also swipe." Harvest too, the same rule.
// The third tap in a row of the same action (plant, water, extra care or harvest, one field at a time, within 30 seconds of the first)
// shows one short toast: hold and sweep across your fields to do them all at once, in mouse words or phone words. At most one tip in
// 10 minutes, whatever the action, and never while quiet() says so (the Beginner guide, the admin view, the village). An action this
// device has swept over 2 fields or more never shows its tip again: the farmer knows. The device keeps that in localStorage
// ({swept:[actions],at:last tip}); where storage is blocked it is kept for the page only. This file has no DOM of its own: show(text)
// is the game's own toast.
export const SWEEP_TIP_KEY='harvest-tycoon:sweep-tip';
export const SWEEP_TIP_TAPS=3,SWEEP_TIP_WINDOW_MS=30000,SWEEP_TIP_GAP_MS=600000;
const ACTIONS=Object.freeze(['plant','water','tend','harvest']);
export const SWEEP_TIP_TEXTS=Object.freeze({
 mouse:Object.freeze({
  plant:'Tip: hold the mouse button on an empty field and sweep across your fields to plant them all at once.',
  water:'Tip: hold the mouse button on a crop and sweep across your fields to water them all at once.',
  tend:'Tip: hold the mouse button on a crop and sweep across your fields to give them all extra care at once.',
  harvest:'Tip: hold the mouse button on a ripe crop and sweep across your fields to harvest them all at once.'
 }),
 touch:Object.freeze({
  plant:'Tip: hold an empty field for a moment, then swipe across your fields to plant them all at once.',
  water:'Tip: hold a crop for a moment, then swipe across your fields to water them all at once.',
  tend:'Tip: hold a crop for a moment, then swipe across your fields to give them all extra care at once.',
  harvest:'Tip: hold a ripe crop for a moment, then swipe across your fields to harvest them all at once.'
 })
});

// storage: the page's localStorage (or null). now: the clock in ms. show(text): the toast. quiet(): true while no tip may come.
// tapped(action,{touch}): one field done by a tap; touch is false only for a mouse. swept(action,count): a sweep ended with count fields.
// A run is the taps of one action in a row: another action, or more than 30 seconds since its first tap, starts a new one. A third tap
// that may not show its tip (quiet, the 10 minutes) keeps the run, so the next tap of it can. Nothing here ever throws.
export function createSweepTip({storage,now=()=>Date.now(),show,quiet=()=>false}){
 const load=()=>{try{const data=JSON.parse(storage?.getItem(SWEEP_TIP_KEY)??'null');if(!data||typeof data!=='object')return null;return {swept:new Set(Array.isArray(data.swept)?data.swept.filter(a=>ACTIONS.includes(a)):[]),at:Number.isFinite(data.at)?data.at:0};}catch{return null;}};
 const memory=load()??{swept:new Set(),at:0};
 // What another tab of the farm swept in the meantime is kept.
 const save=()=>{try{for(const a of load()?.swept??[])memory.swept.add(a);storage?.setItem(SWEEP_TIP_KEY,JSON.stringify({swept:[...memory.swept],at:memory.at}));}catch{}};
 let run=null;
 function tapped(action,{touch=true}={}){
  try{
   if(!ACTIONS.includes(action))return;
   const t=now();
   if(!run||run.action!==action||t-run.start>SWEEP_TIP_WINDOW_MS||t<run.start)run={action,start:t,count:0};
   run.count++;
   if(run.count<SWEEP_TIP_TAPS||memory.swept.has(action))return;
   // A tip time in the future (the device clock was turned back) holds nothing back.
   if(memory.at&&t>=memory.at&&t-memory.at<SWEEP_TIP_GAP_MS)return;
   if(quiet())return;
   run=null;memory.at=t;save();
   show?.(touch?SWEEP_TIP_TEXTS.touch[action]:SWEEP_TIP_TEXTS.mouse[action]);
  }catch{}
 }
 function swept(action,count){
  try{
   if(!ACTIONS.includes(action)||!(typeof count==='number'&&count>=2)||memory.swept.has(action))return;
   memory.swept.add(action);save();
  }catch{}
 }
 return {tapped,swept};
}
