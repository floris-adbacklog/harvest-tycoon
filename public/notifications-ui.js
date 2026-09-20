// The "Reminders" block of the settings dialog. It talks to window.parent.harvestBridge.notifications
// (src/notifications.js) and stays hidden until the notification service is switched on.
import {refreshArt} from './visual-icons.js';
const IDS={pushCrops:'notify-crops',pushProduction:'notify-production',pushDaily:'notify-daily',emailDigest:'notify-email'};
const hourLabel=hour=>`${String(hour).padStart(2,'0')}:00`;
export function createNotificationsSection(){
 const $=id=>document.getElementById(id),api=()=>{try{return window.parent?.harvestBridge?.notifications??null;}catch{return null;}};
 let saving=false,current=null;
 const select=$('notify-hour');
 if(select&&!select.children.length)select.innerHTML=Array.from({length:24},(_,hour)=>`<option value="${hour}">${hourLabel(hour)}</option>`).join('');
 const status=text=>{const el=$('notify-status');if(el)el.textContent=text;};
 function read(){
  const prefs={digestHour:Number(select.value)};
  for(const [key,id] of Object.entries(IDS))prefs[key]=$(id).checked;
  return prefs;
 }
 function paint(prefs){
  current=prefs;
  for(const [key,id] of Object.entries(IDS))$(id).checked=prefs[key];
  select.value=String(prefs.digestHour);$('notify-email-time').hidden=!prefs.emailDigest;
 }
 function busy(on){saving=on;for(const id of [...Object.values(IDS),'notify-hour'])$(id).disabled=on;}
 async function refresh(){
  const section=$('notify-settings');if(!section)return;
  const bridge=api();if(bridge?.ready)await bridge.ready;
  section.hidden=!bridge?.available;if(section.hidden)return;
  try{paint(await bridge.get());status('');}catch{status('Your reminder settings could not be loaded.');}
  refreshArt();
 }
 async function change(){
  if(saving)return;const bridge=api(),before=current;if(!bridge)return;
  const next=read();$('notify-email-time').hidden=!next.emailDigest;busy(true);status('Saving…');
  try{paint(await bridge.save(next));status('Saved.');}
  catch(error){if(before)paint(before);status(error?.message||'Could not save. Please try again.');}
  finally{busy(false);}
 }
 for(const id of [...Object.values(IDS),'notify-hour']){const el=$(id);if(el)el.onchange=change;}
 return {refresh};
}
