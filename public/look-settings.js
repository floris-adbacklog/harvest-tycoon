import {SEASON_LOOKS,SEASON_LOOK_SOURCE,LOOK_SLOTS,LOOK_FARM_SLOTS,seasonLook,seasonLooksOwned,currentSeason,seasonPhase,seasonById} from './farm-state.js';
import {lookArt,lookKindName,worn,seasonSellsHere} from './season-ui.js';
import {refreshArt} from './visual-icons.js';

// Your look (Oct 2026, the Season Pass; Settings › Profile, under the avatar): one row per kind of look, the same tappable row for each,
// "None" first. What a farmer collected is theirs for good; a tap wears it. The current season's looks they do not have yet show with a
// lock and where they come from ("Season Pass Autumn 2026, tier 25"); a past season's they do not have are not shown. The paid ones only
// where the pass is sold (seasonSellsHere), unless they are yours. The avatar has its own picker above (avatar-settings.js).
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROWS=Object.freeze([...LOOK_SLOTS,...LOOK_FARM_SLOTS]);
export function lookChoices(state,now,slot,{sells=true}={}){
 const own=new Set(seasonLooksOwned(state)),running=currentSeason(now);
 return Object.entries(SEASON_LOOKS).filter(([id,look])=>look.kind===slot&&(own.has(id)||(running&&look.season===running.id&&['soon','open','claim'].includes(seasonPhase(running,now))&&(SEASON_LOOK_SOURCE[id]?.track!=='paid'||sells))))
  .map(([id,look])=>({id,look,owned:own.has(id),source:SEASON_LOOK_SOURCE[id]}));
}
export function lookSettingsMarkup(state,now,wearing,{sells=true}={}){
 const rows=ROWS.map(slot=>({slot,choices:lookChoices(state,now,slot,{sells})})).filter(r=>r.choices.length);
 if(!rows.length)return '';
 return `<h3 id="look-settings-title">Your look</h3><p class="look-settings-rule">What you collect stays yours.</p>`+rows.map(({slot,choices})=>{
  const on=wearing[slot]??null;
  const chip=(id,inner,label,locked=false,where='')=>`<button type="button" class="look-chip${on===id?' is-on':''}${locked?' is-locked':''}" data-look-slot="${slot}" data-look-id="${id??''}" aria-pressed="${on===id}" ${locked?'aria-disabled="true"':''} title="${esc(where||label)}">${inner}<span>${esc(label)}</span>${where?`<small>${esc(where)}</small>`:''}</button>`;
  return `<div class="look-row"><strong>${esc(lookKindName(slot))}</strong><div class="look-chips">${chip(null,'<span class="look-none"></span>','None')}${choices.map(c=>chip(c.id,c.look.kind==='title'?'<span class="look-title-mark">“ ”</span>':lookArt(c.id),c.look.name,!c.owned,c.owned?'':`Season Pass ${seasonById(c.source.season)?.title??''}, tier ${c.source.tier}`)).join('')}</div></div>`;
 }).join('')+'<p class="look-feedback" role="status" aria-live="polite"></p>';
}
export function createLookSettings(root,{state,runAction,bridge=()=>window.parent?.harvestBridge,clock=()=>Date.now()}){
 if(!root)return {refresh(){}};
 let busy=false,drawn='';
 const wearing=()=>({...worn(),...(state.lookFarm??{})});
 function draw(){
  const html=lookSettingsMarkup(state,clock(),wearing(),{sells:seasonSellsHere()});
  if(html===drawn)return;drawn=html;root.innerHTML=html;root.hidden=!html;refreshArt();
  root.querySelectorAll('[data-look-slot]').forEach(b=>b.onclick=()=>wear(b.dataset.lookSlot,b.dataset.lookId||null,b));
 }
 async function wear(slot,id,button){
  if(busy||button.getAttribute('aria-disabled')==='true'){if(button.getAttribute('aria-disabled')==='true')root.querySelector('.look-feedback').textContent=button.title;return;}
  if((wearing()[slot]??null)===id)return;busy=true;const feedback=root.querySelector('.look-feedback');feedback.textContent='Saving…';
  try{
   if(LOOK_FARM_SLOTS.includes(slot))await runAction({type:'season_look',slot,id});
   else{const data=await bridge().request({operation:'look',look:{...worn(),[slot]:id}});window.harvestLook=data?.look??{...worn(),[slot]:id};window.dispatchEvent(new CustomEvent('harvest-look-changed',{detail:window.harvestLook}));}
   drawn='';draw();root.querySelector('.look-feedback').textContent=id?`${seasonLook(id).name} is in use.`:'Look saved.';
  }catch(error){feedback.textContent=error.message||'Your look could not be saved. Please try again.';}
  finally{busy=false;}
 }
 const onLook=()=>{drawn='';draw();};
 window.addEventListener('harvest-look-changed',onLook);
 window.addEventListener('pagehide',()=>window.removeEventListener('harvest-look-changed',onLook),{once:true});
 draw();
 return {refresh(){if(!busy)draw();}};
}
