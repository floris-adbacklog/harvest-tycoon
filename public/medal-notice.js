import {CROPS,featureUnlocked,medalsWaiting} from './farm-state.js';
import {art} from './visual-icons.js';
import {createToast} from './toast-ui.js';
// A new crop medal (Oct 2026). Until now nothing happened when a farmer earned one: it only showed once collected in Estate → Medals,
// and farmers on level 7-9 could not open Medals at all (live 3 Oct: 164 medals waiting there, none collected). Now the harvest that
// earns one shows a medal chip in its floating text, one short toast at the bottom says where to collect it (one toast for a whole
// sweep or tractor run, never a window), and the yellow "!" (growth-ui.js) stays on Medals until it is collected. Collecting stays the
// farmer's own tap.
export const MEDAL_NAMES=['Bronze medal','Silver medal','Gold medal','Platinum medal'];
// What an action earned: waiting now and not before it. Nothing while Medals is still closed (below level 7): those wait quietly and
// only light the "!" once it opens, like the ones a farm already had when the game started (no toast storm at launch).
export function newMedals(before,state){
 if(!featureUnlocked(state,'mastery'))return [];
 const had=new Set(before);
 return medalsWaiting(state).filter(id=>!had.has(id)).map(id=>{const [crop,tier]=id.split(':');return {crop,tier:Number(tier)};});
}
export const medalMessage=medals=>medals.length===1?`${CROPS[medals[0].crop].name}: ${MEDAL_NAMES[medals[0].tier]}! Collect it in Medals.`:`${medals.length} new medals! Collect them in Medals.`;
// The medal chips on a line of their own above what the harvest gave: one per tier, highest first, ×2 when a sweep earns two alike.
// The name sits in its own span so it is translated as the exact text ("Bronze medal").
export function withMedals(medals,html){
 if(!medals?.length)return html;
 const chips=[...new Set(medals.map(m=>m.tier))].sort((a,b)=>b-a).map(tier=>{const n=medals.filter(m=>m.tier===tier).length;return `<span class="float-chip is-medal tier-${tier}">${art('trophy')}<span>${MEDAL_NAMES[tier]}</span>${n>1?`<b>×${n}</b>`:''}</span>`;}).join('');
 return `<span class="float-stack"><span class="float-row">${chips}</span><span class="float-row">${html}</span></span>`;
}
// The toast at the bottom (farm.html #medal-toast), never under a window: a medal from the tractor (its window is open) or one that
// comes with a level-up card waits until the windows are closed. Medals earned meanwhile join the same toast; one collected meanwhile
// is left out.
export function createMedalNotice(el,{state,doc=document,duration=4500}={}){
 const show=createToast(el,{duration});let waiting=[],timer=0;
 function flush(){
  if(!waiting.length||doc.querySelector('dialog[open]'))return;
  const still=new Set(medalsWaiting(state));waiting=[...new Map(waiting.map(m=>[`${m.crop}:${m.tier}`,m])).values()].filter(m=>still.has(`${m.crop}:${m.tier}`));
  if(waiting.length)show(medalMessage(waiting),{tone:'reward'});waiting=[];
 }
 const later=ms=>{clearTimeout(timer);timer=setTimeout(flush,ms);};
 doc.addEventListener('close',()=>{if(waiting.length)later(400);},true);
 return {earned(medals){if(!medals?.length)return;waiting.push(...medals);later(700);}};
}
