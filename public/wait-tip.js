import {CROPS,POND_OPEN,beginnerProgress,cropDuration,cropUnlocked,featureUnlocked,formatDuration,levelOf} from './farm-state.js';
// Long waits early on (16 Oct 2026, the owner: "People quickly plant lots of corn, or even barley early on, and then sit in a long waiting
// time."). Live on 16 Oct: of 1,225 early farms (level 1-8) that stopped, 10% left with 5 minutes or more still to grow, 98% of those with
// corn or barley on their fields; 56 of the 71 farms with barley on their fields never harvested barley. Up to level 8 the game says it
// twice, in the farm's own times (cropDuration, the first day's beginner boost included):
// 1. Choosing a crop that is not quick in the seed shop says how long it takes and names the quickest crop for playing on.
// 2. Right after planting one (a tap or a sweep), when more than half of the fields now grow and the last of them is 10 minutes or more
//    away: when the fields are ready and what is open meanwhile. Once a day on this device; not during the Beginner guide, in the admin
//    view or in the village (game.js).
// Quick is 5 minutes or less (wheat, lettuce): the seed shop's Quick tab says the same (economy-ui.js seedTab).
export const QUICK_CROP_MS=5*60000,LONG_WAIT_LEVEL=8,LONG_WAIT_MS=10*60000,WAIT_TIP_KEY='harvest-tycoon:wait-tip';
export const quickCrop=key=>CROPS[key].duration<=QUICK_CROP_MS;
// The quickest crop the farm has (wheat).
export const quickestCrop=state=>Object.keys(CROPS).filter(key=>cropUnlocked(state,key)).sort((a,b)=>CROPS[a].duration-CROPS[b].duration)[0]??null;
const early=state=>levelOf(state)<=LONG_WAIT_LEVEL;
// 1. The seed shop's word when a crop is chosen ("Corn selected: ready in 15m, good before a break. Playing on? Wheat is ready in 2m.").
// From level 9, or for a quick crop, it stays the plain one.
export function cropChoiceText(state,key,now=Date.now()){
 const name=CROPS[key].name,quick=quickestCrop(state);
 if(!early(state)||quickCrop(key)||!quick||!quickCrop(quick))return `${name} selected. Choose an empty field to plant.`;
 return `${name} selected: ready in ${formatDuration(cropDuration(state,key,false,now))}, good before a break. Playing on? ${CROPS[quick].name} is ready in ${formatDuration(cropDuration(state,quick,false,now))}.`;
}
// 2. After a planting: when the fields are ready (the last growing field) and what this farm has open meanwhile, or null. Wheat only while a
// field is empty.
export function waitTip(state,crop,now=Date.now()){
 if(!early(state)||!CROPS[crop]||quickCrop(crop)||!beginnerProgress(state,now).every(q=>q.done))return null;
 const growing=state.plots.filter(p=>p.crop&&p.readyAt>now);if(growing.length*2<=state.plots.length)return null;
 const at=Math.max(...growing.map(p=>p.readyAt));if(at-now<LONG_WAIT_MS)return null;
 return {at,open:[POND_OPEN&&featureUnlocked(state,'fishing')&&'pond',featureUnlocked(state,'activities')&&'hand',cropUnlocked(state,'wheat')&&state.plots.some(p=>!p.crop)&&'wheat'].filter(Boolean)};
}
// One sentence for each mix of what is open, so every language has it whole; the time in the device's own clock, as the next-goal line says it.
const MEANWHILE={
 'pond hand wheat':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: the fishing pond, a helping hand or wheat on an empty field.`,
 'pond hand':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: the fishing pond or a helping hand.`,
 'pond wheat':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: the fishing pond or wheat on an empty field.`,
 'hand wheat':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: a helping hand or wheat on an empty field.`,
 'pond':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: the fishing pond.`,
 'hand':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: a helping hand.`,
 'wheat':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}. Meanwhile: wheat on an empty field.`,
 '':(today,t)=>`Your fields are ready ${today?'at':'tomorrow at'} ${t}.`
};
export function waitTipText({at,open},now=Date.now()){
 const clock=new Date(at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 return MEANWHILE[open.join(' ')](new Date(at).toDateString()===new Date(now).toDateString(),clock);
}
// The note once a day on this device (its own key; in memory where the browser keeps nothing). planted(crop) after every planting;
// quiet: the admin view and the village. It stays 6 seconds, not the toast's 3.2: about 19 words, longer in German or Russian, and no
// second one that day.
export const WAIT_TIP_SHOW_MS=6000;
export function createWaitTip({state,show,now=()=>Date.now(),quiet=()=>false,storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})()}){
 let shown='';
 const seen=()=>{try{return storage?.getItem(WAIT_TIP_KEY)??'';}catch{return '';}};
 return {planted(crop){
  if(quiet())return false;
  const t=now(),day=new Date(t).toDateString();if(shown===day||seen()===day)return false;
  const tip=waitTip(state,crop,t);if(!tip)return false;
  shown=day;try{storage?.setItem(WAIT_TIP_KEY,day);}catch{}
  show(waitTipText(tip,t),{duration:WAIT_TIP_SHOW_MS});return true;
 }};
}
