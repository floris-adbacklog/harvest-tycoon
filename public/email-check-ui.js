import {art,refreshArt} from './visual-icons.js';
import {EMAIL_BONUS} from './farm-state.js';

// Confirm your email for EMAIL_BONUS diamonds (email sign-ups only; Google and Facebook accounts get them at once). The pop-up
// sends a 6-digit code to the farmer's address and takes it back; the server pays the diamonds on the next farm load.
export function createEmailCheck({doc=globalThis.document,bridge,email,onDone,timers=globalThis}){
 const dialog=doc.createElement('dialog');dialog.id='email-check-dialog';dialog.className='game-dialog email-check-dialog';dialog.setAttribute('aria-labelledby','email-check-title');doc.body.append(dialog);
 let sent=false,busy=false,waitUntil=0,timer=0,message='',news=null;
 // News & offers by email: a separate yes that starts off (26 Sep 2026). Ticking it saves it right away, with the date, in the
 // same setting as Settings, Reminders (supabase/email-marketing-consent.sql). Confirming the email does not depend on it.
 const notices=()=>bridge?.notifications;
 const newsBox=()=>news===null?'':`<label class="email-check-news"><input type="checkbox" data-email-news ${news?'checked':''}><span>Send me news and offers by email. You can unsubscribe at any time.</span></label>`;
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 function render(){
  const wait=Math.max(0,Math.ceil((waitUntil-Date.now())/1000));
  dialog.innerHTML=`<button type="button" class="icon-button close-dialog email-check-close" data-email-close aria-label="Close"><i data-lucide="x"></i></button>${art('letter')}<p class="eyebrow">${EMAIL_BONUS} DIAMONDS FOR YOU</p><h2 id="email-check-title">Confirm your email</h2>`
   +(sent?`<p>We sent a 6-digit code to <b>${esc(email())}</b>. Type it here and the diamonds are yours.</p><form class="email-check-form" data-email-form><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" aria-label="The 6-digit code" data-email-code><button type="submit" class="primary-button" ${busy?'disabled':''}>Confirm</button></form><button type="button" class="link-button email-check-resend" data-email-send ${busy||wait?'disabled':''}>${wait?`Send a new code in ${wait}s`:'Send a new code'}</button>`
    :`<p>Confirm your email address once and get ${EMAIL_BONUS} diamonds. We send a 6-digit code to <b>${esc(email())}</b>.</p><button type="button" class="primary-button" data-email-send ${busy?'disabled':''}>Send code</button>`)
   +newsBox()+`<p class="email-check-status" role="status">${esc(message)}</p>`;
  dialog.querySelector('[data-email-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-email-send]')?.addEventListener('click',send);
  dialog.querySelector('[data-email-form]')?.addEventListener('submit',event=>{event.preventDefault();checkCode();});
  dialog.querySelector('[data-email-news]')?.addEventListener('change',async event=>{
   const on=event.target.checked;
   try{const api=notices();await api.save({...(await api.get()),emailMarketing:on});news=on;}
   catch(error){event.target.checked=!on;message=error?.message||'That did not save. Please try again.';render();}
  });
  refreshArt();
 }
 async function send(){
  if(busy)return;busy=true;message='';render();
  try{const r=await bridge.request({operation:'events',command:'email_send'});if(r.verified){busy=false;dialog.close();await onDone?.();return;}sent=true;waitUntil=Date.now()+(r.waitMs??60000);message='Code sent. Check your inbox (and the spam folder).';}
  catch(e){message=e.message;}
  busy=false;render();dialog.querySelector('[data-email-code]')?.focus();
  timers.clearInterval(timer);timer=timers.setInterval(()=>{if(!dialog.open||Date.now()>waitUntil){timers.clearInterval(timer);}const b=dialog.querySelector('.email-check-resend');if(b&&!busy){const w=Math.max(0,Math.ceil((waitUntil-Date.now())/1000));b.disabled=w>0;b.textContent=w?`Send a new code in ${w}s`:'Send a new code';}},1000);
 }
 async function checkCode(){
  const code=dialog.querySelector('[data-email-code]')?.value.trim()??'';if(busy)return;
  if(!/^\d{6}$/.test(code)){message='Type the 6 digits from the email.';render();return;}
  busy=true;message='';render();
  try{await bridge.request({operation:'events',command:'email_confirm',code});busy=false;dialog.close();await onDone?.();return;}
  catch(e){message=e.message;}
  busy=false;render();const input=dialog.querySelector('[data-email-code]');if(input){input.value=code;input.focus();}
 }
 function open(){
  if(!dialog.open){message='';render();dialog.showModal();}
  notices()?.get?.().then(prefs=>{news=Boolean(prefs?.emailMarketing);if(dialog.open)render();}).catch(()=>{});
 }
 dialog.addEventListener('close',()=>timers.clearInterval(timer));
 return {open,dialog};
}
