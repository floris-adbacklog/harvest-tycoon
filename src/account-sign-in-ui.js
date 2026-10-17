import {art} from '../public/visual-icons.js';
import {usableAddress,signInSentence,canSetPassword,maskEmail,APPLE_RELAY,RELAY_TEXT,SET_PASSWORD,PASSWORD_SENT} from './account-sign-in.js';
// Settings, Your account: "You sign in with Google." (17 Oct 2026, the owner; what it says and when: src/account-sign-in.js). Only the farm
// page (src/game-cloud.js) draws it, so the sign-in page never loads the game's pictures for it.

// The providers' marks, as on the sign-in card (public/play.html; a test keeps them the same); a password has the game's letter (markOf).
export const SIGN_IN_MARKS=Object.freeze({
 google:'<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>',
 facebook:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#1877F2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z"/><path fill="#fff" d="m16.67 15.56.53-3.49h-3.33V9.81c0-.96.47-1.89 1.96-1.89h1.51V4.95s-1.37-.24-2.68-.24c-2.74 0-4.53 1.67-4.53 4.69v2.66H7.08v3.49h3.05V24a12.1 12.1 0 0 0 3.74 0v-8.44z"/></svg>',
 apple:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#000" d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/></svg>',
 discord:'<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#5865F2" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/></svg>'
});
const markOf=method=>method==='email'?art('letter'):SIGN_IN_MARKS[method]??'';

// Settings, Your account: the line under the farmer's name card, in the look of the Settings rows (the Discord switch beside it), built
// element by element (the texts as text, never markup). The address sits in translate="no" (the farmer's own); Apple's relay is said in
// words until Show. Set a password, once sent, makes way for what happens next; a refusal shows under it and the button stays.
// update(email): the farmer changed their address in Settings, Email address (public/game.js sends harvest-email-changed).
// 17 Oct 2026 (the review): below "Make the name your own" (#name-nudge) when it shows, so that tip stays with the name it is about;
// and Show lasts one visit: closing Settings masks the address again, so a streamer who checked it earlier never opens Settings live
// to the whole address.
export function createSignInLine({info,setPassword,doc=globalThis.document}){
 const card=doc?.querySelector?.('.settings-account .account-card'),sentence=signInSentence(info?.methods);
 if(!card||!sentence||doc.getElementById('account-sign-in'))return null;
 let email=usableAddress(info.email),shown=false;
 const make=(tag,className,text)=>{const el=doc.createElement(tag);el.className=className;if(text)el.textContent=text;return el;};
 const box=make('div','account-sign-in'),marks=make('span','sign-in-marks'),copy=make('div','sign-in-copy'),how=make('p','sign-in-how',sentence);
 const line=make('p','sign-in-address'),out=make('span','sign-in-email'),show=make('button','sign-in-show'),message=make('p','sign-in-message');
 box.id='account-sign-in';out.id='account-sign-in-email';marks.setAttribute('aria-hidden','true');show.type='button';show.setAttribute('aria-controls',out.id);
 message.setAttribute('role','status');message.hidden=true;
 for(const method of info.methods){const mark=markOf(method);if(!mark)continue;const holder=make('span','sign-in-mark');holder.innerHTML=mark;marks.append(holder);}
 line.append(out,show);copy.append(how,line);box.append(marks,copy);
 const button=canSetPassword(info)&&typeof setPassword==='function'?make('button','small-button sign-in-password',SET_PASSWORD):null;
 if(button){button.type='button';box.append(button);}
 box.append(message);
 function draw(){
  line.hidden=!email;if(!email)return;
  const words=APPLE_RELAY.test(email)&&!shown;
  // The translate mark first: a text written while it is still there is never translated (public/i18n.js KEEP).
  if(words)out.removeAttribute('translate');else out.setAttribute('translate','no');
  out.textContent=words?RELAY_TEXT:shown?email:maskEmail(email);
  show.textContent=shown?'Hide':'Show';show.setAttribute('aria-pressed',String(shown));show.setAttribute('aria-label',shown?'Hide email address':'Show email address');
 }
 show.onclick=()=>{shown=!shown;draw();};
 if(button)button.onclick=async()=>{
  button.disabled=true;message.hidden=false;message.classList.remove('is-error','is-done');message.textContent='Sending…';
  try{await setPassword();button.hidden=true;message.classList.add('is-done');message.textContent=PASSWORD_SENT;}
  catch(error){message.classList.add('is-error');message.textContent=error?.message||'Something went wrong. Please try again.';}
  finally{button.disabled=false;}
 };
 draw();(card.parentElement?.querySelector?.('#name-nudge')??card).after(box);
 card.closest?.('dialog')?.addEventListener?.('close',()=>{if(!shown)return;shown=false;draw();});
 const update=next=>{const value=usableAddress(next);if(!value||value===email)return;email=value;shown=false;draw();};
 doc.addEventListener?.('harvest-email-changed',event=>update(event?.detail));
 return {box,update};
}
