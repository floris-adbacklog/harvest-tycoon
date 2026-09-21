import {PLAYER_AVATARS,playerAvatar} from './player-avatars.js';

export function avatarSettingsMarkup(id){
 const current=playerAvatar(id);
 return `<div class="avatar-settings-header"><img id="avatar-preview" src="${current.src}" alt="${current.name}" width="80" height="80"><div><h3 id="avatar-settings-title">Your farmer avatar</h3><p>Pick a face for your farm.</p><span id="avatar-current-name">${current.name}</span></div></div><details id="avatar-choices"><summary>Change avatar <span>${PLAYER_AVATARS.length} free choices</span></summary><form id="avatar-form"><fieldset class="avatar-grid"><legend class="avatar-sr-only">Choose your farmer avatar</legend>${PLAYER_AVATARS.map(a=>`<label class="avatar-choice"><input type="radio" name="avatar" value="${a.id}" ${a.id===current.id?'checked':''}><span class="avatar-choice-art"><img src="${a.src}" alt="" width="96" height="96" loading="lazy" decoding="async"><span class="avatar-choice-check" aria-hidden="true">✓</span></span><span class="avatar-choice-name">${a.name}</span></label>`).join('')}</fieldset><button type="submit" class="small-button avatar-save" disabled>Save avatar</button></form></details><p id="avatar-feedback" class="avatar-feedback" role="status" aria-live="polite"></p>`;
}

export function createAvatarSettings(root,{bridge,profile,onSaved=()=>{}}){
 if(!root)return;
 let saved=playerAvatar(profile?.avatar_id).id,selected=saved,busy=false,disposed=false;
 root.innerHTML=avatarSettingsMarkup(saved);
 const form=root.querySelector('form'),preview=root.querySelector('#avatar-preview'),label=root.querySelector('#avatar-current-name'),feedback=root.querySelector('#avatar-feedback'),save=form.querySelector('button'),choices=form.querySelector('fieldset');
 function refresh(){const avatar=playerAvatar(selected);preview.src=avatar.src;preview.alt=avatar.name;label.textContent=avatar.name;save.disabled=busy||selected===saved;choices.disabled=busy;save.textContent=busy?'Saving…':'Save avatar';form.setAttribute('aria-busy',String(busy));}
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
