import {refreshArt} from './visual-icons.js';
import {createInstallSection} from './install-ui.js';
export function createSoundSettings(audio){
 const $=id=>document.getElementById(id),dialog=$('sound-dialog'),install=createInstallSection();
 function refresh(){
  const s=audio.settings(),audible=s.enabled&&(s.ambience>0||s.effects>0);
  $('sound-enabled').checked=s.enabled;$('sound-enabled').disabled=!s.available;
  $('ambience-volume').value=s.ambience;$('effects-volume').value=s.effects;
  $('ambience-value').value=`${s.ambience}%`;$('effects-value').value=`${s.effects}%`;
  for(const id of ['ambience-volume','effects-volume'])$(id).disabled=!s.available;
  $('sound-status').textContent=!s.available?'Sound is not available in this browser.':!s.enabled?'All sound is muted.':!audible?'Both volume sliders are set to zero.':s.musicStatus==='unavailable'?'Music could not load. Game sounds are still available.':s.musicStatus==='loading'?'Getting your background music ready…':'Soft music and little celebrations.';
  $('sound-preview').disabled=!s.available||!s.enabled||!s.effects;
  $('sound-button').setAttribute('aria-label','Settings');$('sound-button').title='Settings';
  $('mobile-sound-label').textContent='Settings';$('mobile-sound-summary').textContent=audible?'Sound & app':'Sound off · app';install.refresh();refreshArt();
 }
 function open(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());refresh();dialog.showModal();}
 $('sound-button').onclick=open;
 $('sound-enabled').onchange=()=>{audio.setSettings({enabled:$('sound-enabled').checked});if($('sound-enabled').checked)void audio.unlock();};
 $('ambience-volume').oninput=()=>audio.setSettings({ambience:Number($('ambience-volume').value)});
 $('effects-volume').oninput=()=>audio.setSettings({effects:Number($('effects-volume').value)});
 $('effects-volume').onchange=()=>{void audio.unlock().then(()=>audio.play('plant'));};
 $('sound-preview').onclick=()=>{void audio.unlock().then(()=>audio.play('levelup'));};
 refresh();return {open,refresh};
}
