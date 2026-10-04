import {refreshArt} from './visual-icons.js';
import {createInstallSection} from './install-ui.js';
import {createNotificationsSection} from './notifications-ui.js';
import {createSettingsNav} from './settings-nav.js';
import {settingsPart} from './game-links.js';
import {MUSIC_TRACKS} from './farm-audio.js';
export function createSoundSettings(audio,{onEmailOn}={}){
 const $=id=>document.getElementById(id),dialog=$('sound-dialog'),install=createInstallSection(),reminders=createNotificationsSection({onEmailOn});
 const nav=createSettingsNav(dialog);
 // Music (4 Oct 2026): the farmer picks the farm's music; Listen plays a track's 20-second preview first, and tapping it again
 // (Playing, with a stop sign) ends it.
 const tracks=$('music-tracks');
 if(tracks){
  tracks.innerHTML=MUSIC_TRACKS.map(t=>`<div class="music-track" data-track="${t.id}"><label class="music-pick"><input type="radio" name="music-track" value="${t.id}"><span><b id="music-title-${t.id}">${t.title}</b><small>${t.about}</small></span></label><button type="button" class="music-listen" data-track="${t.id}" aria-labelledby="music-state-${t.id} music-title-${t.id}"><i data-lucide="play" class="music-play"></i><i data-lucide="square" class="music-stop"></i><span id="music-state-${t.id}">Listen</span></button></div>`).join('');
  tracks.onchange=event=>{const id=event.target?.value;if(!id)return;audio.setSettings({music:id});void audio.unlock();};
  tracks.onclick=event=>{
   const button=event.target?.closest?.('.music-listen');if(!button)return;
   const id=button.dataset.track;if(audio.settings().preview?.id===id){audio.stopPreview();return;}
   void audio.unlock().then(()=>audio.preview(id));
  };
  // A preview stops when Settings closes or the farmer goes back to the list (no Playing button there to stop it).
  dialog?.addEventListener('close',()=>audio.stopPreview());
  dialog?.addEventListener('click',event=>{if(event.target?.closest?.('.settings-back'))audio.stopPreview();});
 }
 function refresh(){
  const s=audio.settings(),audible=s.enabled&&(s.ambience>0||s.effects>0);
  $('sound-enabled').checked=s.enabled;$('sound-enabled').disabled=!s.available;
  $('ambience-volume').value=s.ambience;$('effects-volume').value=s.effects;
  $('ambience-value').value=`${s.ambience}%`;$('effects-value').value=`${s.effects}%`;
  for(const id of ['ambience-volume','effects-volume'])$(id).disabled=!s.available;
  for(const row of tracks?.querySelectorAll('.music-track')??[]){
   const id=row.dataset.track,mine=s.preview?.id===id,button=row.querySelector('.music-listen');
   row.classList.toggle('is-chosen',id===s.music);row.querySelector('input').checked=id===s.music;
   button.disabled=!s.available||!s.enabled||Boolean(s.outsideMute);button.classList.toggle('is-playing',mine&&s.preview.status==='playing');
   // Its name is its visible words and the track ("Playing Hayride Hop"), so what a screen reader says matches the screen.
   button.setAttribute('aria-pressed',String(mine));button.setAttribute('aria-busy',String(mine&&s.preview.status==='loading'));
   button.querySelector('span').textContent=!mine?'Listen':s.preview.status==='loading'?'Loading…':'Playing';
  }
  $('sound-status').textContent=!s.available?'Sound is not available in this browser.':s.outsideMute?'The sound is off on CrazyGames.':!s.enabled?'All sound is muted.':!audible?'Both volume sliders are set to zero.':s.previewFailed?'The preview could not play. Check your connection and try again.':s.musicStatus==='unavailable'?'Music could not load. Game sounds are still available.':s.musicStatus==='loading'?'Getting your background music ready…':'';
  $('sound-preview').disabled=!s.available||!s.enabled||!s.effects;
  $('sound-button').setAttribute('aria-label','Settings');$('sound-button').title='Settings';
  $('mobile-sound-label').textContent='Settings';$('mobile-sound-summary').textContent=audible?'Account, avatar, sound & app':'Account, avatar & app · sound off';install.refresh();refreshArt();
 }
 // part (4 Oct 2026): a slug of public/game-links.js, from a link (/settings/<part>, the chat's Settings chip): Settings opens there.
 function open(part){document.querySelectorAll('dialog[open]').forEach(d=>d.close());refresh();nav?.openAt(settingsPart(part)?.id??(part?'unknown':null));dialog.showModal();void reminders.refresh();}
 $('sound-button').onclick=()=>open();
 $('sound-enabled').onchange=()=>{audio.setSettings({enabled:$('sound-enabled').checked});if($('sound-enabled').checked)void audio.unlock();};
 $('ambience-volume').oninput=()=>audio.setSettings({ambience:Number($('ambience-volume').value)});
 $('effects-volume').oninput=()=>audio.setSettings({effects:Number($('effects-volume').value)});
 $('effects-volume').onchange=()=>{void audio.unlock().then(()=>audio.play('plant'));};
 $('sound-preview').onclick=()=>{void audio.unlock().then(()=>audio.play('levelup'));};
 // The cookie choice lives on the page around the game (public/cookie-consent.js).
 const cookies=$('cookie-settings');if(cookies)cookies.onclick=()=>{dialog.close();window.parent?.harvestConsent?.open();};
 refresh();return {open,refresh};
}
