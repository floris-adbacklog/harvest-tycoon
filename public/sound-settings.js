import {refreshArt} from './visual-icons.js';
export function createSoundSettings(audio){
 const $=id=>document.getElementById(id),dialog=$('sound-dialog');
 function refresh(){
  const s=audio.settings(),audible=s.enabled&&(s.ambience>0||s.effects>0);
  $('sound-enabled').checked=s.enabled;$('sound-enabled').disabled=!s.available;
  $('ambience-volume').value=s.ambience;$('effects-volume').value=s.effects;
  $('ambience-value').value=`${s.ambience}%`;$('effects-value').value=`${s.effects}%`;
  for(const id of ['ambience-volume','effects-volume'])$(id).disabled=!s.available;
  $('sound-status').textContent=!s.available?'Sound is not available in this browser.':!s.enabled?'All sound is muted.':!audible?'Both volume sliders are set to zero.':'A quiet breeze, birdsong and little celebrations.';
  $('sound-preview').disabled=!s.available||!s.enabled||!s.effects;
  $('sound-button').innerHTML=`<i data-lucide="${audible?'volume-2':'volume-x'}"></i>`;
  $('sound-button').setAttribute('aria-label',`Sound settings, ${audible?'sound on':'muted'}`);
  $('sound-button').title='Sound settings';$('mobile-sound-label').textContent='Sound settings';
  $('mobile-sound-summary').textContent=audible?'Ambience & game sounds':'Currently muted';refreshArt();
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
