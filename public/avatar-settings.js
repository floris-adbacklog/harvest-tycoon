import {PLAYER_AVATARS,playerAvatar} from './player-avatars.js';
import {emblemPickerMarkup,bindEmblemPickers} from './emblem-picker.js';

const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tile=id=>`<span class="avatar-tile"><img src="${playerAvatar(id).src}" alt="" width="96" height="96" loading="lazy" decoding="async" draggable="false"></span>`;

// One row of faces that pages with arrows, the same picker as the family emblems.
export function avatarSettingsMarkup(id){
 const current=playerAvatar(id);
 const picker=emblemPickerMarkup({emblems:PLAYER_AVATARS,checkedId:current.id,legend:'Choose your farmer avatar',nameOf:a=>a.name,tile,esc,field:'avatar',noun:'avatar',extraClass:'avatar-picker'});
 return `<div class="avatar-settings-header"><img id="avatar-preview" src="${current.src}" alt="${esc(current.name)}" width="80" height="80"><div><h3 id="avatar-settings-title">Avatar</h3><p>Pick a face for your farm.</p></div></div><form id="avatar-form">${picker}<button type="submit" class="small-button avatar-save" disabled>Save avatar</button></form><p id="avatar-feedback" class="avatar-feedback" role="status" aria-live="polite"></p>`;
}

export function createAvatarSettings(root,{bridge,profile,onSaved=()=>{}}){
 if(!root)return;
 let saved=playerAvatar(profile?.avatar_id).id,selected=saved,busy=false,disposed=false;
 root.innerHTML=avatarSettingsMarkup(saved);bindEmblemPickers(root);
 const form=root.querySelector('form'),preview=root.querySelector('#avatar-preview'),feedback=root.querySelector('#avatar-feedback'),save=form.querySelector('.avatar-save'),choices=form.querySelector('fieldset');
 function refresh(){const avatar=playerAvatar(selected);preview.src=avatar.src;preview.alt=avatar.name;save.disabled=busy||selected===saved;choices.disabled=busy;save.textContent=busy?'Saving…':'Save avatar';form.setAttribute('aria-busy',String(busy));}
 form.addEventListener('change',event=>{if(event.target.name!=='avatar'||busy)return;selected=playerAvatar(event.target.value).id;feedback.textContent=selected===saved?'':'Save to use this avatar.';refresh();});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||selected===saved)return;busy=true;feedback.textContent='';refresh();
  try{
   const data=await bridge.request({operation:'avatar',avatarId:selected});
   if(disposed)return;
   if(data.profile?.player_id!==bridge.playerId||data.profile?.avatar_id!==selected)throw new Error('Your avatar could not be saved. Please try again.');
   saved=selected;onSaved(data.profile);feedback.textContent='Avatar saved.';
   window.dispatchEvent(new CustomEvent('harvest-avatar-changed',{detail:{playerId:bridge.playerId,avatarId:saved}}));
  }catch(error){if(!disposed)feedback.textContent=error.message||'Your avatar could not be saved. Please try again.';}
  finally{busy=false;if(!disposed)refresh();}
 });
 window.addEventListener('pagehide',()=>{disposed=true;},{once:true});
 return {get savedAvatar(){return saved;}};
}
