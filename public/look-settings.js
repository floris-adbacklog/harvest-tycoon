import {SEASON_LOOKS,SEASON_LOOK_SOURCE,LOOK_SLOTS,LOOK_FARM_SLOTS,seasonLook,seasonLooksOwned,currentSeason,seasonPhase,seasonById} from './farm-state.js';
import {lookArt,lookKindName,worn,seasonSellsHere} from './season-ui.js';
import {refreshArt} from './visual-icons.js';

// Your look (Oct 2026, the Season Pass). Since 21 Oct 2026 (the owner: "Je look staat nu heel lelijk onder instellingen, kan het niet
// onder een nieuw kopje", then "Doe je look ook onder avatar, en verander het kopje mijn avatar in iets breders zodat het fit"):
// - in Settings › Profile, under the avatar card, a card of its own: what you wear now as small pictures, how many of the looks are
//   yours, and one button that opens the Your look window (#look-dialog in farm.html);
// - that window: one tab per kind of look (the picture on a tab is what you wear now) and that kind's tiles, "None" first. With one
//   kind there are no tabs.
// What a farmer collected is theirs for good; a tap wears it. The current season's looks they do not have yet show with a lock and
// where they come from ("Season Pass Autumn 2026, tier 25"); a past season's they do not have are not shown. The paid ones only where
// the pass is sold (seasonSellsHere), unless they are yours. No look at all: the card stays hidden. The avatar has its own card
// (avatar-settings.js).
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ROWS=Object.freeze([...LOOK_SLOTS,...LOOK_FARM_SLOTS]);
// The window's picture, on its heading and its button: the season's badge (there is no picture of "a look" of its own).
export const LOOK_ICON='season-badge-autumn-2026';
export function lookChoices(state,now,slot,{sells=true}={}){
 const own=new Set(seasonLooksOwned(state)),running=currentSeason(now);
 return Object.entries(SEASON_LOOKS).filter(([id,look])=>look.kind===slot&&(own.has(id)||(running&&look.season===running.id&&['soon','open','claim'].includes(seasonPhase(running,now))&&(SEASON_LOOK_SOURCE[id]?.track!=='paid'||sells))))
  .map(([id,look])=>({id,look,owned:own.has(id),source:SEASON_LOOK_SOURCE[id]}));
}
const lookRows=(state,now,sells)=>ROWS.map(slot=>({slot,choices:lookChoices(state,now,slot,{sells})})).filter(r=>r.choices.length);
// A look's small picture on a tile or a tab: a title as quote marks (its words are the tile's caption), "None" as an empty dashed ring.
const mark=id=>!id?'<span class="look-none"></span>':seasonLook(id)?.kind==='title'?'<span class="look-title-mark">“ ”</span>':lookArt(id);
const countLine=rows=>{const all=rows.flatMap(r=>r.choices);return `<span class="look-count">${all.filter(c=>c.owned).length} of ${all.length} collected</span>`;};
// The card in Settings › Profile: what is worn now (one small picture per kind, with its name for a screen reader), the count, the button.
export function lookSummaryMarkup(state,now,wearing,{sells=true}={}){
 const rows=lookRows(state,now,sells);if(!rows.length)return '';
 const on=rows.map(({slot})=>wearing[slot]??null).filter(id=>seasonLook(id));
 return `<div class="look-summary">${on.length?`<ul class="look-worn">${on.map(id=>`<li title="${esc(seasonLook(id).name)}">${mark(id)}<span class="sr-only">${esc(seasonLook(id).name)}</span></li>`).join('')}</ul>`:''}${countLine(rows)}</div>`
  +`<button type="button" class="secondary-button look-open" data-look-open aria-haspopup="dialog"><i data-game-art="${LOOK_ICON}"></i>Your look</button>`;
}
// The Your look window's body.
export function lookSettingsMarkup(state,now,wearing,{sells=true,tab=null}={}){
 const rows=lookRows(state,now,sells);if(!rows.length)return '';
 const open=rows.find(r=>r.slot===tab)??rows[0],on=wearing[open.slot]??null;
 // Tabs in rows of at most 4: 8 kinds are 2 rows of 4, 5 kinds 3 and 2.
 const columns=Math.min(rows.length,Math.ceil(rows.length/Math.ceil(rows.length/4)));
 const tabs=rows.length<2?'':`<div class="market-tabs look-tabs" role="tablist" aria-label="Your look" style="--look-columns:${columns}">${rows.map(({slot})=>{
  const id=wearing[slot]??null,here=slot===open.slot;
  return `<button type="button" role="tab" id="look-tab-${slot}" aria-controls="look-panel" aria-selected="${here}" tabindex="${here?0:-1}" data-look-tab="${slot}"><span class="look-tab-art">${mark(seasonLook(id)?.kind===slot?id:null)}</span><span>${esc(lookKindName(slot))}</span></button>`;
 }).join('')}</div>`;
 const chip=(id,label,locked=false,where='')=>`<button type="button" class="look-chip${on===id?' is-on':''}${locked?' is-locked':''}" data-look-slot="${open.slot}" data-look-id="${id??''}" aria-pressed="${on===id}" ${locked?'aria-disabled="true"':''} title="${esc(where||label)}">${mark(id)}<span>${esc(label)}</span>${where?`<small>${esc(where)}</small>`:''}</button>`;
 return `<p class="look-settings-rule">${countLine(rows)}<span>What you collect stays yours.</span></p>`
  +tabs
  +`<div class="look-panel" id="look-panel" ${tabs?`role="tabpanel" aria-labelledby="look-tab-${open.slot}"`:`role="group" aria-label="${esc(lookKindName(open.slot))}"`}>${tabs?'':`<strong class="look-kind">${esc(lookKindName(open.slot))}</strong>`}<div class="look-chips">${chip(null,'None')}${open.choices.map(c=>chip(c.id,c.look.name,!c.owned,c.owned?'':`Season Pass ${seasonById(c.source.season)?.title??''}, tier ${c.source.tier}`)).join('')}</div></div>`
  +'<p class="look-feedback" role="status" aria-live="polite"></p>';
}
export function createLookSettings(root,{state,runAction,bridge=()=>window.parent?.harvestBridge,clock=()=>Date.now(),dialog=globalThis.document?.getElementById('look-dialog')}={}){
 if(!root)return {refresh(){}};
 const body=dialog?.querySelector('.look-dialog-body');
 let busy=false,drawn='',drawnCard='',tab=null;
 const wearing=()=>({...worn(),...(state.lookFarm??{})});
 function draw(){
  const now=clock(),sells=seasonSellsHere(),card=lookSummaryMarkup(state,now,wearing(),{sells});
  if(card!==drawnCard){drawnCard=card;root.innerHTML=card;root.hidden=!card;refreshArt();root.querySelector('[data-look-open]')?.addEventListener('click',open);}
  if(!card&&dialog?.open)dialog.close();
  if(!body)return;
  const html=lookSettingsMarkup(state,now,wearing(),{sells,tab});
  if(html===drawn)return;
  // The tab or tile that has the focus keeps it when the window is drawn again (a keyboard or screen-reader user keeps their place).
  const had=body.contains(document.activeElement)?document.activeElement.closest?.('[data-look-tab],[data-look-id]'):null;
  const again=had?(had.dataset.lookTab?`[data-look-tab="${esc(had.dataset.lookTab)}"]`:`[data-look-id="${esc(had.dataset.lookId)}"]`):null;
  drawn=html;body.innerHTML=html;refreshArt();
  body.querySelectorAll('[data-look-slot]').forEach(b=>b.onclick=()=>wear(b.dataset.lookSlot,b.dataset.lookId||null,b));
  const tabs=[...body.querySelectorAll('[data-look-tab]')];
  tabs.forEach((b,i)=>{
   b.onclick=()=>pick(b.dataset.lookTab);
   // The arrow keys move along the tabs, as a tab bar does (mirrored in a right-to-left language).
   b.onkeydown=event=>{let step={ArrowRight:1,ArrowDown:1,ArrowLeft:-1,ArrowUp:-1}[event.key];if(!step)return;event.preventDefault();
    if(event.key.startsWith('ArrowL')||event.key==='ArrowRight')step*=getComputedStyle(body).direction==='rtl'?-1:1;
    pick(tabs[(i+step+tabs.length)%tabs.length].dataset.lookTab,true);};
  });
  if(again)body.querySelector(again)?.focus({preventScroll:true});
 }
 function open(){
  if(!dialog)return;
  drawn='';draw();const feedback=body?.querySelector('.look-feedback');if(feedback)feedback.textContent='';
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
 }
 function pick(slot,focus=false){
  if(slot===tab&&drawn)return;tab=slot;draw();
  if(focus)body.querySelector(`[data-look-tab="${slot}"]`)?.focus({preventScroll:true});
 }
 async function wear(slot,id,button){
  const say=text=>{const feedback=body.querySelector('.look-feedback');if(feedback)feedback.textContent=text;};
  if(busy||button.getAttribute('aria-disabled')==='true'){if(button.getAttribute('aria-disabled')==='true')say(button.title);return;}
  if((wearing()[slot]??null)===id)return;busy=true;say('Saving…');
  try{
   if(LOOK_FARM_SLOTS.includes(slot))await runAction({type:'season_look',slot,id});
   else{const data=await bridge().request({operation:'look',look:{...worn(),[slot]:id}});window.harvestLook=data?.look??{...worn(),[slot]:id};window.dispatchEvent(new CustomEvent('harvest-look-changed',{detail:window.harvestLook}));}
   drawn='';draw();say(id?`${seasonLook(id).name} is in use.`:'Look saved.');
  }catch(error){say(error.message||'Your look could not be saved. Please try again.');}
  finally{busy=false;}
 }
 const onLook=()=>{drawn='';draw();};
 window.addEventListener('harvest-look-changed',onLook);
 window.addEventListener('pagehide',()=>window.removeEventListener('harvest-look-changed',onLook),{once:true});
 draw();
 return {refresh(){if(!busy)draw();},open};
}
