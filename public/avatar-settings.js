import {PLAYER_AVATARS,playerAvatar,avatarLevel,avatarUnlocked} from './player-avatars.js';
import {emblemPickerMarkup,bindEmblemPickers} from './emblem-picker.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const lockIcon=open=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="${open?'M8.5 10.5V7.8a3.5 3.5 0 0 1 6.8-1.2':'M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7'}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>`;
// The 10 level avatars carry their level on the tile: grey with a closed lock until the farm gets there, then a gold badge with an
// open lock. The 20 everyone has show no badge.
export function avatarBadge(id,level){
 const need=avatarLevel(id);if(need<=1)return '';
 const open=avatarUnlocked(id,level);
 return `<span class="avatar-level ${open?'is-open':'is-locked'}">${lockIcon(open)}Lv. ${need}</span>`;
}
const locked=(id,level)=>!avatarUnlocked(id,level);
const labelOf=(a,level)=>locked(a.id,level)?`${a.name}, opens at level ${a.level}`:a.name;
const tile=level=>id=>`<span class="avatar-tile${locked(id,level)?' is-locked':''}"><img src="${playerAvatar(id).src}" alt="" width="96" height="96" loading="lazy" decoding="async" draggable="false">${avatarBadge(id,level)}</span>`;

// One row of faces that pages with arrows, the same picker as the family emblems.
export function avatarSettingsMarkup(id,level=1){
 const current=playerAvatar(id);
 const picker=emblemPickerMarkup({emblems:PLAYER_AVATARS,checkedId:current.id,legend:'Choose your farmer avatar',nameOf:a=>labelOf(a,level),tile:tile(level),esc,field:'avatar',noun:'avatar',extraClass:'avatar-picker'});
 return `<div class="avatar-settings-header"><img id="avatar-preview" src="${current.src}" alt="${esc(current.name)}" width="80" height="80"><div><h3 id="avatar-settings-title">Avatar</h3><p>Pick a face for your farm. Every 10 levels opens a new one.</p></div></div><form id="avatar-form">${picker}<button type="submit" class="small-button avatar-save" disabled>Save avatar</button></form><p id="avatar-feedback" class="avatar-feedback" role="status" aria-live="polite"></p>`;
}

// A locked face can still be picked to see it large; it cannot be saved until the farm reaches its level (avatar-service.js checks
// that too). The level-up screen (progression-ui.js) sends harvest-level, so a face opens here without reloading.
export function createAvatarSettings(root,{bridge,profile,onSaved=()=>{}}){
 if(!root)return;
 let saved=playerAvatar(profile?.avatar_id).id,selected=saved,busy=false,disposed=false,level=Math.max(1,Number(profile?.level)||1);
 root.innerHTML=avatarSettingsMarkup(saved,level);bindEmblemPickers(root);
 const form=root.querySelector('form'),preview=root.querySelector('#avatar-preview'),feedback=root.querySelector('#avatar-feedback'),save=form.querySelector('.avatar-save'),choices=form.querySelector('fieldset');
 const waiting=()=>locked(selected,level)?`Reach level ${avatarLevel(selected)} to use this avatar.`:selected===saved?'':'Save to use this avatar.';
 function refresh(){const avatar=playerAvatar(selected);preview.src=avatar.src;preview.alt=avatar.name;save.disabled=busy||selected===saved||locked(selected,level);choices.disabled=busy;save.textContent=busy?'Saving…':'Save avatar';form.setAttribute('aria-busy',String(busy));}
 function levelUp(next){
  if(!(next>level))return;level=next;
  for(const input of form.querySelectorAll('input[name="avatar"]')){
   const avatar=playerAvatar(input.value),t=input.nextElementSibling;if(avatarLevel(avatar.id)<=1)continue;
   t.classList.toggle('is-locked',locked(avatar.id,level));t.querySelector('.avatar-level')?.remove();t.insertAdjacentHTML('beforeend',avatarBadge(avatar.id,level));
   input.dataset.name=labelOf(avatar,level);input.setAttribute('aria-label',`${labelOf(avatar,level)} avatar`);input.parentElement.title=labelOf(avatar,level);
  }
  const picked=form.querySelector('.emblem-picked strong');if(picked)picked.textContent=form.querySelector('input[name="avatar"]:checked')?.dataset?.name??'';
  if(!busy&&feedback.textContent!=='Avatar saved.')feedback.textContent=waiting();refresh();
 }
 form.addEventListener('change',event=>{if(event.target.name!=='avatar'||busy)return;selected=playerAvatar(event.target.value).id;feedback.textContent=waiting();refresh();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||selected===saved||locked(selected,level))return;busy=true;feedback.textContent='';refresh();
  try{
   const data=await bridge.request({operation:'avatar',avatarId:selected});
   if(disposed)return;
   if(data.profile?.player_id!==bridge.playerId||data.profile?.avatar_id!==selected)throw new Error('Your avatar could not be saved. Please try again.');
   saved=selected;onSaved(data.profile);feedback.textContent='Avatar saved.';
   window.dispatchEvent(new CustomEvent('harvest-avatar-changed',{detail:{playerId:bridge.playerId,avatarId:saved}}));
  }catch(error){if(!disposed)feedback.textContent=error.message||'Your avatar could not be saved. Please try again.';}
  finally{busy=false;if(!disposed)refresh();}
 });
 const onLevel=event=>levelUp(Number(event.detail?.level));
 window.addEventListener('harvest-level',onLevel);
 window.addEventListener('pagehide',()=>{disposed=true;window.removeEventListener('harvest-level',onLevel);},{once:true});
 return {get savedAvatar(){return saved;},get level(){return level;}};
}
