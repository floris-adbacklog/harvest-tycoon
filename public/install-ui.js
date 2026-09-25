// The "Farm app" block of the settings dialog. The install prompt belongs to the top-level page,
// so this reads it from window.parent.harvestPwa (see src/pwa.js) and renders what fits the device.
import {refreshArt} from './visual-icons.js';
const COPY={
 installed:'Harvest Tycoon is installed on this device. Open it from your home screen.',
 prompt:'Put Harvest Tycoon on your home screen or desktop for one-tap access, without the browser bar.',
 ios:'Add Harvest Tycoon to your home screen for one-tap access, without the browser bar:',
 manual:'Look for “Install” or “Add to Home Screen” in your browser menu to keep Harvest Tycoon one tap away.'
};
const IOS_STEPS=['Tap the Share button in your browser.','Choose “Add to Home Screen”.','Tap “Add”. Harvest Tycoon now opens like an app.'];
export function createInstallSection(){
 const $=id=>document.getElementById(id),pwa=()=>{try{return window.parent?.harvestPwa??null;}catch{return null;}};
 function refresh(){
  const api=pwa(),section=$('app-settings');if(!section)return;
  const state=api?.state()??{kind:'unsupported'};
  section.hidden=state.kind==='unsupported';if(section.hidden)return;
  $('install-copy').textContent=COPY[state.kind]??'';
  $('install-steps').hidden=state.kind!=='ios';$('install-steps').innerHTML=state.kind==='ios'?IOS_STEPS.map(step=>`<li>${step}</li>`).join(''):'';
  $('install-app').hidden=state.kind!=='prompt';
  // Full screen: where the browser can (not on an iPhone), on or off as remembered on this device.
  const full=api?.fullscreen,row=$('app-fullscreen-row');
  if(row){row.hidden=!full?.supported?.();if(!row.hidden)$('app-fullscreen').checked=full.wanted();}
  refreshArt();
 }
 const button=$('install-app');
 if(button)button.onclick=async()=>{button.disabled=true;try{await pwa()?.install();}finally{button.disabled=false;refresh();}};
 const toggle=$('app-fullscreen');
 if(toggle)toggle.onchange=async()=>{await pwa()?.fullscreen?.set(toggle.checked);refresh();};
 // A remembered "full screen" comes back with the first tap in the game (browsers need a tap for it).
 const full=pwa()?.fullscreen;
 if(full?.supported?.()&&full.wanted()&&!full.active())document.addEventListener('pointerup',()=>{if(full.wanted()&&!full.active())void full.enter();},{once:true});
 pwa()?.subscribe?.(refresh);
 refresh();
 return {refresh};
}
