// The "Reminders" block of the settings dialog. It talks to window.parent.harvestBridge.notifications
// (src/notifications.js) and stays hidden until the notification service is switched on.
import {refreshArt} from './visual-icons.js';
const IDS={pushCrops:'notify-crops',pushProduction:'notify-production',pushDaily:'notify-daily',emailDigest:'notify-email'};
const DEVICE={
 unsupported:'This browser cannot receive notifications.',
 'install-first':'On iPhone, first add Harvest Tycoon to your home screen (see Farm app below). Then come back here to turn notifications on.',
 blocked:'Notifications are blocked for this site. Allow them in your browser settings, then reload the page.',
 off:'Turn on notifications to get your reminders on this device.',
 on:'Notifications are on for this device.'
};
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
 async function device(){
  const push=api()?.push;if(!push)return;
  let kind='unsupported';try{kind=(await push.status()).kind;}catch{}
  $('notify-device-copy').textContent=DEVICE[kind]??'';
  $('notify-enable').hidden=kind!=='off';$('notify-test').hidden=kind!=='on';$('notify-disable').hidden=kind!=='on';
  $('notify-push-rows').hidden=kind==='unsupported';
 }
 async function refresh(){
  const section=$('notify-settings');if(!section)return;
  const bridge=api();if(bridge?.ready)await bridge.ready;
  const push=Boolean(bridge?.available&&bridge.config?.push&&bridge.push),email=Boolean(bridge?.available&&bridge.config?.email);
  section.hidden=!(push||email);if(section.hidden)return;
  $('notify-device').hidden=!push;$('notify-push-rows').hidden=!push;$('notify-email-rows').hidden=!email;
  try{paint(await bridge.get());status('');}catch{status('Your reminder settings could not be loaded.');}
  if(push)await device();
  refreshArt();
 }
 async function change(){
  if(saving)return;const bridge=api(),before=current;if(!bridge)return;
  const next=read();$('notify-email-time').hidden=!next.emailDigest;busy(true);status('Saving…');
  try{paint(await bridge.save(next));status('Saved.');}
  catch(error){if(before)paint(before);status(error?.message||'Could not save. Please try again.');}
  finally{busy(false);}
 }
 async function deviceAction(action,done=''){
  const push=api()?.push;if(!push)return;
  for(const id of ['notify-enable','notify-test','notify-disable'])$(id).disabled=true;
  try{await push[action]();status(done);}catch(error){status(error?.message||'That did not work. Please try again.');}
  finally{for(const id of ['notify-enable','notify-test','notify-disable'])$(id).disabled=false;await device();}
 }
 for(const id of [...Object.values(IDS),'notify-hour']){const el=$(id);if(el)el.onchange=change;}
 if($('notify-enable'))$('notify-enable').onclick=()=>deviceAction('enable','');
 if($('notify-test'))$('notify-test').onclick=()=>deviceAction('test','Test sent. It should appear on this device in a moment.');
 if($('notify-disable'))$('notify-disable').onclick=()=>deviceAction('disable','Notifications are off on this device.');
 return {refresh};
}
