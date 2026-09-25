import {PLAYER_AVATARS,playerAvatar,avatarLevel,avatarGoal,goalCount,avatarOpen} from './player-avatars.js';
import {emblemPickerMarkup,bindEmblemPickers} from './emblem-picker.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n).toLocaleString('en-US');
const lockIcon=open=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="${open?'M8.5 10.5V7.8a3.5 3.5 0 0 1 6.8-1.2':'M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
const trophyIcon='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 3.5h10v5.2a5 5 0 0 1-10 0z" fill="currentColor"/><path d="M7 5.5H4.2v1.3A3.3 3.3 0 0 0 7.5 10M17 5.5h2.8v1.3a3.3 3.3 0 0 1-3.3 3.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10.6 13.4h2.8v3.3h-2.8zM7.8 17.6h8.4v2.9H7.8z" fill="currentColor"/></svg>';
// `farm` is what the picker knows of the farmer: {level, state, events} (player-avatars.js avatarOpen). A plain number is a level.
const asFarm=farm=>farm&&typeof farm==='object'?farm:{level:Number(farm)||1};
// The 10 level avatars carry their level on the tile, the achievement avatars a trophy: grey with a closed lock until earned, then a
// gold badge with an open lock. The 20 everyone has show no badge.
export function avatarBadge(id,farm){
 const goal=avatarGoal(id),need=avatarLevel(id);if(!goal&&need<=1)return '';
 const open=avatarOpen(id,asFarm(farm));
 return `<span class="avatar-level ${open?'is-open':'is-locked'}">${lockIcon(open)}${goal?trophyIcon:`Lv. ${need}`}</span>`;
}
const locked=(id,farm)=>!avatarOpen(id,asFarm(farm));
const lower=text=>text[0].toLowerCase()+text.slice(1);
function labelOf(a,farm){
 if(!locked(a.id,farm))return a.name;
 const goal=avatarGoal(a.id);return goal?`${a.name}: ${lower(goal.text)}`:`${a.name}, opens at level ${a.level}`;
}
// What still stands between the farmer and a locked face, under the Save button.
function lockedText(id,farm){
 const goal=avatarGoal(id);if(!goal)return `Reach level ${avatarLevel(id)} to use this avatar.`;
 return `${goal.text} to use this avatar.${goal.target>1?` You are at ${number(Math.min(goalCount(id,farm),goal.target))} of ${number(goal.target)}.`:''}`;
}
const tile=farm=>id=>`<span class="avatar-tile${locked(id,farm)?' is-locked':''}"><img src="${playerAvatar(id).src}" alt="" width="96" height="96" loading="lazy" decoding="async" draggable="false">${avatarBadge(id,farm)}</span>`;

// One row of faces that pages with arrows, the same picker as the family emblems.
export function avatarSettingsMarkup(id,farm=1){
 const current=playerAvatar(id),known=asFarm(farm);
 const picker=emblemPickerMarkup({emblems:PLAYER_AVATARS,checkedId:current.id,legend:'Choose your farmer avatar',nameOf:a=>labelOf(a,known),tile:tile(known),esc,field:'avatar',noun:'avatar',extraClass:'avatar-picker'});
 return `<div class="avatar-settings-header"><img id="avatar-preview" src="${current.src}" alt="${esc(current.name)}" width="80" height="80"><div><h3 id="avatar-settings-title">Avatar</h3><p>Pick a face for your farm.</p></div></div><form id="avatar-form">${picker}<button type="submit" class="small-button avatar-save" disabled>Save avatar</button></form><p id="avatar-feedback" class="avatar-feedback" role="status" aria-live="polite"></p>`;
}

// A locked face can still be picked to see it large; it cannot be saved until it is earned (avatar-service.js checks that too). The
// game sends harvest-level with the level and the farm (progression-ui.js), so a face opens here without reloading.
export function createAvatarSettings(root,{bridge,profile,state=null,onSaved=()=>{}}){
 if(!root)return;
 let saved=playerAvatar(profile?.avatar_id).id,selected=saved,busy=false,disposed=false;
 const farm={level:Math.max(1,Number(profile?.level)||1),state,events:Number(profile?.events_finished)||0};
 root.innerHTML=avatarSettingsMarkup(saved,farm);bindEmblemPickers(root);
 const form=root.querySelector('form'),preview=root.querySelector('#avatar-preview'),feedback=root.querySelector('#avatar-feedback'),save=form.querySelector('.avatar-save'),choices=form.querySelector('fieldset');
 const waiting=()=>locked(selected,farm)?lockedText(selected,farm):selected===saved?'':'Save to use this avatar.';
 function refresh(){const avatar=playerAvatar(selected);preview.src=avatar.src;preview.alt=avatar.name;save.disabled=busy||selected===saved||locked(selected,farm);choices.disabled=busy;save.textContent=busy?'Saving…':'Save avatar';form.setAttribute('aria-busy',String(busy));}
 function update({level,state:next}={}){
  if(level>farm.level)farm.level=level;if(next&&typeof next==='object')farm.state=next;
  for(const input of form.querySelectorAll('input[name="avatar"]')){
   const avatar=playerAvatar(input.value),t=input.nextElementSibling;if(!avatarGoal(avatar.id)&&avatarLevel(avatar.id)<=1)continue;
   t.classList.toggle('is-locked',locked(avatar.id,farm));t.querySelector('.avatar-level')?.remove();t.insertAdjacentHTML('beforeend',avatarBadge(avatar.id,farm));
   input.dataset.name=labelOf(avatar,farm);input.setAttribute('aria-label',`${labelOf(avatar,farm)} avatar`);input.parentElement.title=labelOf(avatar,farm);
  }
  const picked=form.querySelector('.emblem-picked strong');if(picked)picked.textContent=form.querySelector('input[name="avatar"]:checked')?.dataset?.name??'';
  if(!busy&&feedback.textContent!=='Avatar saved.')feedback.textContent=waiting();refresh();
 }
 form.addEventListener('change',event=>{if(event.target.name!=='avatar'||busy)return;selected=playerAvatar(event.target.value).id;feedback.textContent=waiting();refresh();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||selected===saved||locked(selected,farm))return;busy=true;feedback.textContent='';refresh();
  try{
   const data=await bridge.request({operation:'avatar',avatarId:selected});
   if(disposed)return;
   if(data.profile?.player_id!==bridge.playerId||data.profile?.avatar_id!==selected)throw new Error('Your avatar could not be saved. Please try again.');
   saved=selected;onSaved(data.profile);feedback.textContent='Avatar saved.';
   window.dispatchEvent(new CustomEvent('harvest-avatar-changed',{detail:{playerId:bridge.playerId,avatarId:saved}}));
  }catch(error){if(!disposed)feedback.textContent=error.message||'Your avatar could not be saved. Please try again.';}
  finally{busy=false;if(!disposed)refresh();}
 });
 const onLevel=event=>update({level:Number(event.detail?.level),state:event.detail?.state});
 window.addEventListener('harvest-level',onLevel);
 window.addEventListener('pagehide',()=>{disposed=true;window.removeEventListener('harvest-level',onLevel);},{once:true});
 return {get savedAvatar(){return saved;},get level(){return farm.level;}};
}
