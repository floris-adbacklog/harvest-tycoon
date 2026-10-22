// Reload everyone now (22 Oct 2026, the owner: a hard refresh for everyone after a release), a card of its own in the Admin dashboard's
// Settings, for the admin only. The button asks first (the panel's own confirm), then farm-api (operation admin_reload, reload-service.js,
// the admin signed in with Google) keeps the time; every open game that has this code and opened before it reloads to the new version
// within about a minute and a half (src/app-update.js startForcedReload). The card says when it was last pressed, in UTC like the rest
// of the dashboard. Staff screens stay English.
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {dateTime} from './admin-players.js';

const why=error=>error?.raw??error?.message;
export const lastLine=at=>Number.isFinite(at)&&at>0?`Last used ${dateTime(new Date(at).toISOString())} (UTC).`:'Not used yet.';
export const RELOAD_HINT='Every farmer with the game open sees “A new version is ready, reloading…” and their game reloads within about a minute and a half. Only when the new version is live on the site (deploy first), never during a purchase or while they type a message: it then waits until they are done. Your own game reloads too.';
export const RELOAD_REACH='It only reaches games on a version that already has this button (from the release of 22 Oct 2026). Older ones update the usual way, the next time the farmer comes back to the game.';

export function createReloadCard({dialog,bridge,ask=confirmAction,doc=globalThis.document}){
 const settings=dialog.querySelector('[data-admin-panel="settings"]');if(!settings)return {show(){}};
 const section=doc.createElement('section');section.className='admin-card';section.id='admin-reload';section.hidden=true;
 section.innerHTML='<h3>'+art('farmapp')+'Reload everyone</h3>'
  +`<p class="admin-popup-note">${RELOAD_HINT}</p><p class="admin-popup-note">${RELOAD_REACH}</p>`
  +'<div class="admin-offer-actions"><button type="button" class="primary-button" id="admin-reload-now">Reload everyone now</button></div>'
  +'<p class="admin-hint" id="admin-reload-last"></p><p class="admin-hint" id="admin-reload-status" role="status"></p>';
 // First on Settings (22 Oct 2026), above this device's numbers.
 if(settings.prepend)settings.prepend(section);else settings.append(section);
 const $=id=>section.querySelector(`#admin-reload-${id}`);
 async function show(){
  section.hidden=false;
  try{const data=await bridge.request({operation:'admin_reload'});$('last').textContent=lastLine(data?.lastReload);}
  catch(error){$('last').textContent=`When it was last used could not be loaded: ${why(error)}`;}
 }
 async function press(){
  if(!await ask({title:'Reload everyone now?',description:'Every open game that has a newer version waiting reloads within about a minute and a half. Deploy the site first.',confirmLabel:'Reload everyone',cancelLabel:'Cancel'}))return 'cancelled';
  const button=$('now');button.disabled=true;$('status').textContent='Sending…';
  try{const data=await bridge.request({operation:'admin_reload',reload:true});$('last').textContent=lastLine(data?.lastReload);$('status').textContent='Done. Open games reload within about a minute and a half.';return 'sent';}
  catch(error){$('status').textContent=why(error);return 'failed';}
  finally{button.disabled=false;}
 }
 $('now').onclick=()=>{void press();};
 return {show,press};
}
