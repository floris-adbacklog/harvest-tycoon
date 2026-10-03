import {confirmAction} from '../public/confirm-dialog.js';
// Delete account (3 Oct 2026): the red button in Settings › Privacy, on the website and in the Android and iPhone apps (the App Store asks
// for it inside the app); never on CrazyGames (portal.css and src/portal-ui.js take it away). Two steps: what disappears for good, then
// the farmer name typed exactly (confirmAction's typeToConfirm: a field a phone keyboard does not capitalise or correct, and the button
// stays off until the name matches, so a typo never reaches the server). farm-api checks the name again and deletes
// (supabase/functions/farm-api/account-delete-service.js); the page around the game then signs this device out and shows the home page
// with "Your account has been deleted." (src/main.js deleteAccount). A refusal (a wrong name, an admin account, no connection) shows under the button and nothing changes.
export const DELETE_WARNING='Your farm and all your progress, coins, diamonds, VIP, medals, your place in your farm family, your chat and private messages and your invites are deleted for good. Purchases are not refunded. This cannot be undone.';
export function createAccountDelete({bridge,name=()=>'',doc=globalThis.document,ask=confirmAction}){
 const button=doc.getElementById('delete-account'),message=doc.getElementById('delete-account-message');
 if(!button)return null;
 if(typeof bridge?.deleteAccount!=='function'){doc.getElementById('delete-account-row')?.remove();return null;}
 async function start(){
  if(message)message.textContent='';
  const farmer=String(name()??'').trim();
  if(!await ask({title:'Delete your account?',description:DELETE_WARNING,confirmLabel:'Continue',cancelLabel:'Keep my account',picture:'farm',tone:'danger'}))return false;
  if(!await ask({title:'Type your farmer name',description:`Type ${farmer} exactly to delete your account for good.`,confirmLabel:'Delete my account',cancelLabel:'Keep my account',tone:'danger',typeToConfirm:farmer}))return false;
  button.disabled=true;
  try{await bridge.deleteAccount(farmer);return true;}
  catch(error){if(message)message.textContent=error?.message||'Your account could not be deleted. Please try again.';return false;}
  finally{button.disabled=false;}
 }
 button.onclick=()=>void start();
 return {start};
}
