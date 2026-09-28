import {art,refreshArt} from './visual-icons.js';
import {EMAIL_BONUS} from './farm-state.js';

// Confirm your email for EMAIL_BONUS diamonds (email sign-ups only; Google and Facebook accounts get them at once). The pop-up
// sends a 6-digit code to the farmer's address and takes it back; the server pays the diamonds on the next farm load.
// Change your email (28 Sep 2026): an email sign-up is not checked when the account is made, so a typo is common. "Wrong address?
// Change it" (or Settings) asks for the new address and the password; the code then goes to the new address and only that code
// moves the account (farm-api event-service.js sendEmailChange). The new address counts as confirmed, so its diamonds follow.
export function createEmailCheck({doc=globalThis.document,bridge,email,canChange=()=>false,onDone,onChanged,timers=globalThis}){
 const dialog=doc.createElement('dialog');dialog.id='email-check-dialog';dialog.className='game-dialog email-check-dialog';dialog.setAttribute('aria-labelledby','email-check-title');doc.body.append(dialog);
 let sent=false,busy=false,waitUntil=0,timer=0,message='',news=null;
 // Changing: 'form' (new address and password), 'code' (the code sent to the new address), or null. From Settings there is no way back to confirming.
 let change=null,changeOnly=false,newEmail='',typed={email:'',password:''};
 // News & offers by email: a separate yes that starts off (26 Sep 2026). Ticking it saves it right away, with the date, in the
 // same setting as Settings, Reminders (supabase/email-marketing-consent.sql). Confirming the email does not depend on it.
 const notices=()=>bridge?.notifications;
 const newsBox=()=>news===null?'':`<label class="email-check-news"><input type="checkbox" data-email-news ${news?'checked':''}><span>Send me news and offers by email. You can unsubscribe at any time.</span></label>`;
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 function render(){
  const wait=Math.max(0,Math.ceil((waitUntil-Date.now())/1000));
  if(change){renderChange();return;}
  dialog.innerHTML=`<button type="button" class="icon-button close-dialog email-check-close" data-email-close aria-label="Close"><i data-lucide="x"></i></button>${art('letter')}<p class="eyebrow">${EMAIL_BONUS} DIAMONDS FOR YOU</p><h2 id="email-check-title">Confirm your email</h2>`
   +(sent?`<p>We sent a 6-digit code to <b>${esc(email())}</b>. Type it here and the diamonds are yours.</p><form class="email-check-form" data-email-form><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" aria-label="The 6-digit code" data-email-code><button type="submit" class="primary-button" ${busy?'disabled':''}>Confirm</button></form><button type="button" class="link-button email-check-resend" data-email-send ${busy||wait?'disabled':''}>${wait?`Send a new code in ${wait}s`:'Send a new code'}</button>`
    :`<p>Confirm your email address once and get ${EMAIL_BONUS} diamonds. We send a 6-digit code to <b>${esc(email())}</b>.</p><button type="button" class="primary-button" data-email-send ${busy?'disabled':''}>Send code</button>`)
   +(canChange()?'<button type="button" class="link-button email-check-change" data-email-change>Wrong address? Change it</button>':'')
   +newsBox()+`<p class="email-check-status" role="status">${esc(message)}</p>`;
  dialog.querySelector('[data-email-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-email-change]')?.addEventListener('click',()=>{change='form';message='';render();dialog.querySelector('[data-new-email]')?.focus();});
  dialog.querySelector('[data-email-send]')?.addEventListener('click',send);
  dialog.querySelector('[data-email-form]')?.addEventListener('submit',event=>{event.preventDefault();checkCode();});
  dialog.querySelector('[data-email-news]')?.addEventListener('change',async event=>{
   const on=event.target.checked;
   try{const api=notices();await api.save({...(await api.get()),emailMarketing:on});news=on;}
   catch(error){event.target.checked=!on;message=error?.message||'That did not save. Please try again.';render();}
  });
  refreshArt();
 }
 function renderChange(){
  const back=changeOnly?'':'<button type="button" class="link-button" data-change-back>Back</button>';
  dialog.innerHTML=`<button type="button" class="icon-button close-dialog email-check-close" data-email-close aria-label="Close"><i data-lucide="x"></i></button>${art('letter')}<p class="eyebrow">YOUR ACCOUNT</p><h2 id="email-check-title">Change your email</h2>`
   +(change==='code'?`<p>We sent a 6-digit code to <b>${esc(newEmail)}</b>. Type it here and your account moves to this address.</p><form class="email-check-form" data-change-code-form><input type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="123456" aria-label="The 6-digit code" data-email-code><button type="submit" class="primary-button" ${busy?'disabled':''}>Confirm</button></form><button type="button" class="link-button" data-change-again>Use another address</button>`
    :`<p>Now: <b>${esc(email())}</b>. Type your new address and your password. We send a code to the new address; your account moves there once you type it.</p><form class="email-change-form" data-change-form><label>New email address<input type="email" autocomplete="email" inputmode="email" autocapitalize="none" spellcheck="false" maxlength="254" required data-new-email></label><label>Your password<input type="password" autocomplete="current-password" required data-password></label><button type="submit" class="primary-button" ${busy?'disabled':''}>Send code</button></form>`)
   +back+`<p class="email-check-status" role="status">${esc(message)}</p>`;
  const field=dialog.querySelector('[data-new-email]');if(field){field.value=typed.email;dialog.querySelector('[data-password]').value=typed.password;}
  dialog.querySelector('[data-email-close]').onclick=()=>dialog.close();
  dialog.querySelector('[data-change-back]')?.addEventListener('click',()=>{change=null;message='';render();});
  dialog.querySelector('[data-change-again]')?.addEventListener('click',()=>{change='form';message='';render();});
  dialog.querySelector('[data-change-form]')?.addEventListener('submit',event=>{event.preventDefault();sendChange();});
  dialog.querySelector('[data-change-code-form]')?.addEventListener('submit',event=>{event.preventDefault();confirmChange();});
  refreshArt();
 }
 async function sendChange(){
  if(busy)return;typed={email:dialog.querySelector('[data-new-email]')?.value.trim()??'',password:dialog.querySelector('[data-password]')?.value??''};
  if(!typed.email||!typed.password){message='Type your new address and your password.';render();return;}
  busy=true;message='';render();
  try{const r=await bridge.request({operation:'events',command:'email_change_send',email:typed.email,password:typed.password});newEmail=r.email;typed={email:typed.email,password:''};change='code';message='Code sent. Check that inbox (and its spam folder).';}
  catch(e){message=e.message;}
  busy=false;render();dialog.querySelector(change==='code'?'[data-email-code]':'[data-new-email]')?.focus();
 }
 async function confirmChange(){
  const code=dialog.querySelector('[data-email-code]')?.value.trim()??'';if(busy)return;
  if(!/^\d{6}$/.test(code)){message='Type the 6 digits from the email.';render();return;}
  busy=true;message='';render();
  try{const r=await bridge.request({operation:'events',command:'email_change_confirm',code});busy=false;change=null;typed={email:'',password:''};dialog.close();await onChanged?.(r.email);return;}
  catch(e){message=e.message;}
  busy=false;render();const input=dialog.querySelector('[data-email-code]');if(input){input.value=code;input.focus();}
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
 // open({change:true}) starts on the new-address form (Settings); the plain open() is the confirmation with its diamonds.
 function open({change:toChange=false}={}){
  if(toChange){change='form';changeOnly=true;}else if(!dialog.open){change=null;changeOnly=false;}
  if(!dialog.open){message='';typed={email:'',password:''};render();dialog.showModal();}
  notices()?.get?.().then(prefs=>{news=Boolean(prefs?.emailMarketing);if(dialog.open)render();}).catch(()=>{});
 }
 dialog.addEventListener('close',()=>{timers.clearInterval(timer);typed.password='';});
 return {open,dialog};
}
