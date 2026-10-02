import {privacyLine,PRIVACY_URL,portalLogIn} from '../public/portal.js';
// The farm on CrazyGames (Oct 2026; src/game-cloud.js calls this only there). The page is marked (html[data-portal], so portal.css
// hides what CrazyGames does not allow: our purchases, invites, sharing, email, reminders, the app, Sign out and cookies) and gets
// what CrazyGames asks for instead:
// - the privacy notice: one line on the loading screen (never a pop-up) and in Settings, Privacy, with the only link allowed;
// - for a guest, one small button in Settings, Your account: "Save your farm: log in with CrazyGames". It opens CrazyGames' own
//   log-in window, only when tapped; a guest who logs in keeps this farm (src/crazygames.js).
export function createPortalUI({portal,doc=globalThis.document}){
 doc.documentElement.dataset.portal=portal.name;
 const stage=doc.querySelector('#loading .farm-loading-stage');
 if(stage&&!stage.querySelector('.portal-privacy')){const line=doc.createElement('p');line.className='portal-privacy';line.innerHTML=privacyLine();stage.append(line);}
 const privacy=doc.getElementById('privacy-settings');
 if(privacy){
  for(const old of privacy.querySelectorAll('.install-copy,.notify-device-actions'))old.remove();
  const line=doc.createElement('p');line.className='install-copy portal-privacy-settings';line.innerHTML=privacyLine();privacy.append(line);
 }
 // The privacy link in the wiki and elsewhere in the frame: our full address, in a new tab (CrazyGames allows this one link).
 for(const link of doc.querySelectorAll('a[href="/privacy"]'))link.href=PRIVACY_URL;
 if(portal.guest&&portalLogIn(portal)){
  const account=doc.querySelector('.settings-account .account-actions');
  if(account&&!doc.getElementById('portal-login')){
   const button=doc.createElement('button');button.type='button';button.id='portal-login';button.className='small-button portal-login';
   button.textContent='Save your farm: log in with CrazyGames';
   button.onclick=async()=>{button.disabled=true;try{await portal.showAuthPrompt();}finally{button.disabled=false;}};
   account.prepend(button);
  }
 }
}
