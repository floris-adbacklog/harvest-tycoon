import {art} from './visual-icons.js';
import {toastParts} from './toast-ui.js';
// A message in the middle of the screen, over an open window (29 Sep 2026). The game's toast sits under a modal dialog, and a line
// at the bottom of a long window is easy to miss, so a refused Help or gift showed nowhere a farmer would look. It uses the toast's
// icon, tone and chips; {refused:true} marks a refusal whatever its words. A refusal stays until the farmer taps it; good news goes
// by itself.
export function showCenterNotice(host,message,{duration=3200,refused=false}={}){
 const doc=host?.ownerDocument;if(!doc||!message)return null;
 host.querySelector(':scope>.center-notice')?.remove();
 const parts=toastParts(message),tone=refused?'warn':parts.tone,icon=refused?'lock':parts.icon,{html}=parts;
 const el=doc.createElement('div');
 el.className=`center-notice is-${tone}`;el.setAttribute('role',tone==='warn'?'alert':'status');
 el.innerHTML=`<div class="center-notice-card"><span class="toast-icon">${art(icon)}</span><p class="toast-text">${html}</p><button type="button" class="primary-button" data-notice-close>Got it</button></div>`;
 let timer=0;
 const close=()=>{clearTimeout(timer);el.remove();};
 el.addEventListener('click',event=>{event.stopPropagation();close();});
 host.append(el);
 if(tone!=='warn')timer=setTimeout(close,duration);
 el.querySelector('[data-notice-close]').focus({preventScroll:true});
 return el;
}
