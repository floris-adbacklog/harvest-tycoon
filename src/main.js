import {createFarmPresence} from './presence.js';
import {supabase,isConfigured,verifiedUser,validUsername,farmRequest,paymentRequest,cloudError} from './supabase.js';
import {fetchLeaderboard} from './leaderboard.js';
import {trackSignUp,isNewRegistration,trackAuth} from './analytics.js';
import {MODES,formErrors,describeAuthError,randomPlayerName} from './account-form.js';
import {startPwa} from './pwa.js';
const $=id=>document.getElementById(id);
startPwa();
let presence=null;
let mode='register',generation=0,playerId=null,frame=null,submitting=false,checking=false,reopen=false;
let focusing=false,nameOpen=false,recovering=false,viewTracked=false,confirmKind='signup',pendingEmail='',resendTimer=null;
const started={};
const AUTH_KEY='harvest-tycoon:auth',RETURNING_KEY='harvest-tycoon:returning',CONFIRM_KEY='harvest-tycoon:confirm-pending';
const store={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}},remove(key){try{localStorage.removeItem(key);}catch{}}};
// True only when the browser can be read and holds no saved session, so a first-time visitor skips the "Checking your account…" screen.
const brandNewVisitor=()=>{try{return localStorage.getItem(AUTH_KEY)===null&&localStorage.getItem(RETURNING_KEY)===null;}catch{return false;}};
const knownPlayer=()=>store.get(RETURNING_KEY)==='1'||store.get(AUTH_KEY)!==null;
const linkText=()=>`${globalThis.location?.hash??''}&${globalThis.location?.search??''}`;
const linkKind=()=>/type=(recovery|signup|magiclink|invite|email_change)/.exec(linkText())?.[1]??'';
const linkError=()=>/error_code=|error=access_denied/.test(linkText());
const redirectUrl=()=>new URL('/play.html',location.origin).href;
const inputId=field=>field==='name'?'player-name':field;
const MESSAGES={register:'Creating your account…',signin:'Opening your farm…',name:'Opening your farm…',forgot:'Sending your link…',recovery:'Saving your password…'};
function phase(value,message){document.body.dataset.phase=value;$('loading-screen').hidden=value!=='checking';$('welcome').hidden=value==='checking'||value==='authenticated';$('farm-host').hidden=value!=='authenticated';if(message)$('loading-copy').textContent=message;}
function dispose(){presence?.dispose();presence=null;generation++;frame?.remove();frame=null;playerId=null;delete window.harvestBridge;$('farm-host').replaceChildren();}
// Moving focus from code (opening a mode, pointing at a mistake) must not count as the visitor starting the form.
function focusField(id,options){focusing=true;try{$(id).focus(options);}finally{focusing=false;}}
function fieldError(field,message=''){$(field+'-error').textContent=message;$(inputId(field)).setAttribute('aria-invalid',String(Boolean(message)));}
function clearErrors(){for(const field of ['email','password','name'])fieldError(field);}
function showFieldErrors(errors){clearErrors();for(const [field,message] of Object.entries(errors))fieldError(field,message);const first=Object.keys(errors)[0];if(first)focusField(inputId(first));}
function setPasswordVisible(visible){$('password').type=visible?'text':'password';$('toggle-password').textContent=visible?'Hide':'Show';$('toggle-password').setAttribute('aria-label',visible?'Hide password':'Show password');$('toggle-password').setAttribute('aria-pressed',String(visible));}
function lock(busy){$('account-submit').disabled=busy;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=busy);}
function setMode(next,focus=false){
 mode=next;const m=MODES[mode];if(mode!=='register')nameOpen=false;
 const shows=field=>m.fields.includes(field)||(field==='name'&&mode==='register'&&nameOpen),visible=['email','password','name'].filter(shows);
 for(const field of ['email','password','name']){$(field+'-row').hidden=!shows(field);$(inputId(field)).required=shows(field)&&(field!=='name'||mode==='name');$(inputId(field)).setAttribute('enterkeyhint',field===visible.at(-1)?'go':'next');}
 clearErrors();setPasswordVisible(false);$('password').autocomplete=mode==='signin'?'current-password':'new-password';
 $('form-eyebrow').textContent=m.eyebrow;$('account-title').textContent=m.title;$('account-copy').textContent=m.copy;$('account-copy').hidden=!m.copy;$('account-submit').textContent=m.submit;$('account-message').textContent='';
 $('account-form').hidden=mode==='confirm';$('confirm-panel').hidden=mode!=='confirm';$('connection-actions').hidden=true;document.querySelector('.account-tabs').hidden=!m.tabs;
 $('forgot-link').hidden=mode!=='signin';$('name-toggle').hidden=!(mode==='register'&&!nameOpen);$('name-optional').hidden=mode==='name';$('name-help').hidden=mode==='name';$('register-promise').hidden=mode!=='register';
 $('mode-switch-row').hidden=!m.switch;if(m.switch){$('mode-switch-text').textContent=m.switch.text;$('mode-switch').textContent=m.switch.label;$('mode-switch').dataset.mode=m.switch.to;}
 document.querySelectorAll('.account-tabs [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
 if(focus){document.querySelector('.account-card').scrollIntoView({behavior:'smooth',block:'start'});if(visible.length)focusField(inputId(visible[0]),{preventScroll:true});}
}
function landing(message=''){dispose();setMode(message||knownPlayer()?'signin':'register');phase('unauthenticated');$('account-message').textContent=message;if(!viewTracked){viewTracked=true;trackAuth('view',{mode});}}
function unavailable(message='Your farm is safe. Reconnect to continue.'){dispose();phase('error');$('account-title').textContent='A little pause.';$('account-copy').hidden=false;$('account-copy').textContent=message;$('account-message').textContent='';$('account-form').hidden=true;$('confirm-panel').hidden=true;$('mode-switch-row').hidden=true;document.querySelector('.account-tabs').hidden=true;$('connection-actions').hidden=false;}
async function signOut(){if(!supabase){landing();return;}dispose();phase('checking','Signing you out…');try{const result=await supabase.auth.signOut();if(result.error)throw result.error;}catch{await supabase.auth.signOut({scope:'local'});}finally{landing();$('password').value='';}}
// "Check your inbox": shown after registering, after asking for a reset link, and when an unconfirmed player tries to sign in.
function showConfirmation(email,{kind='signup',fresh=true}={}){
 pendingEmail=email;confirmKind=kind;if(kind==='signup')store.set(CONFIRM_KEY,'1');setMode('confirm');
 $('confirm-copy').textContent=kind==='reset'?`If ${email} has an account, a link to choose a new password is on its way.`:fresh?`We sent a confirmation link to ${email}. Tap it and your farm opens right away.`:`${email} still needs to be confirmed. Use the link we emailed you, or send it again.`;
 $('confirm-message').textContent='';trackAuth(kind==='reset'?'reset_sent':'confirmation_sent');startResendCooldown(45);
}
function startResendCooldown(seconds){
 clearInterval(resendTimer);const button=$('resend-confirmation');let left=seconds;
 const tick=()=>{button.disabled=left>0;button.textContent=left>0?`Send the email again (${left}s)`:'Send the email again';if(left<=0)clearInterval(resendTimer);left--;};
 tick();resendTimer=setInterval(tick,1000);
}
function startRecovery(){recovering=true;dispose();phase('unauthenticated');setMode('recovery');trackAuth('recovery_open');}
async function openFarm(){
 if(checking){reopen=true;return;}checking=true;dispose();const ticket=generation;phase('checking','Checking your account…');
 try{
  if(!isConfigured)throw new Error('Account access is temporarily unavailable. Please try again later.');
  if(!navigator.onLine)throw new Error('Connect to the internet to open your farm.');
  const user=await verifiedUser();if(ticket!==generation)return;
  if(!user){landing();return;}playerId=user.id;phase('checking','Opening your farm…');
  let initial;try{initial=await farmRequest({operation:'load'});}catch(error){if(ticket!==generation)return;if(error.code==='USERNAME_REQUIRED'){phase('unauthenticated');setMode('name');return;}throw error;}
  if(ticket!==generation)return;if(initial.profile?.player_id!==user.id){reopen=true;return;}
  presence=createFarmPresence(supabase,user.id);
  presence.setClock?.(initial.serverNow);
  const bridge={playerId,presence,serverNow:initial.serverNow,takeInitial(){const data=initial;initial=null;return data;},signOut,async leaderboard(category='level'){if(ticket!==generation)throw new Error('Your session has ended.');const result=await fetchLeaderboard(supabase,user.id,category);if(ticket!==generation)throw new Error('Your session has ended.');presence?.setRows?.(result.rows);return {...result,...presence?.snapshot()};},async request(body){
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   try{const data=await farmRequest(body);if(ticket!==generation||data.profile?.player_id!==user.id)throw new Error('Your session has ended.');return data;}
   catch(error){if(ticket===generation&&error.code!=='ACTION_REJECTED'&&error.status!==400){if(error.status===401){await supabase.auth.signOut({scope:'local'});landing('Your session has ended. Please sign in again.');}else if(!['player_search','player_profile'].includes(body.operation))unavailable(error.message);}throw error;}
  }};
  bridge.payments=async body=>{if(ticket!==generation)throw new Error('Your session has ended.');const data=await paymentRequest(body);if(ticket!==generation)throw new Error('Your session has ended.');return data;};
  bridge.checkout=async(pack,requestId)=>{const data=await bridge.payments({operation:'create',pack,requestId});const url=new URL(data.url);if(url.protocol!=='https:'||url.hostname!=='checkout.stripe.com')throw new Error('Invalid checkout destination.');location.assign(url.href);};
  bridge.paymentReturn=()=>{const params=new URLSearchParams(location.search);return {id:params.get('purchase'),cancelled:params.get('checkout')==='cancelled'};};
  bridge.clearPaymentReturn=()=>{const url=new URL(location.href);url.searchParams.delete('purchase');url.searchParams.delete('checkout');history.replaceState(null,'',url.pathname+url.search+url.hash);};
  window.harvestBridge=bridge;frame=document.createElement('iframe');frame.title='Harvest Tycoon farm';frame.src='/farm.html';$('farm-host').append(frame);phase('authenticated');store.set(RETURNING_KEY,'1');
 }catch(error){if(ticket===generation){if(error.status===401){landing('Your session has ended. Please sign in again.');}else unavailable(cloudError(error));}}
 finally{checking=false;if(reopen){reopen=false;queueMicrotask(openFarm);}}
}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{if(submitting)return;const next=button.dataset.mode;if(next!==mode)trackAuth('mode',{mode:next});setMode(next,true);});
$('forgot-link').onclick=()=>{if(submitting)return;trackAuth('mode',{mode:'forgot'});setMode('forgot',true);};
$('name-toggle').onclick=()=>{nameOpen=true;setMode('register');focusField('player-name');};
$('toggle-password').onclick=()=>setPasswordVisible($('password').type==='password');
for(const id of ['email','password','player-name'])$(id).oninput=()=>fieldError(id==='player-name'?'name':id);
// Funnel: the first field a visitor touches in each mode. On phones, keep the focused field clear of the keyboard.
$('account-form').addEventListener?.('focusin',event=>{
 const id=event.target?.id;if(!id||focusing)return;
 if(!started[mode]){started[mode]=true;trackAuth('field_start',{mode,field:id==='player-name'?'name':id});}
 if(globalThis.innerWidth<720)setTimeout(()=>event.target.scrollIntoView?.({block:'center',behavior:'smooth'}),300);
});
$('account-form').onsubmit=async event=>{
 event.preventDefault();if(submitting)return;
 const email=$('email').value.trim(),password=$('password').value;let name=shownField('name')?$('player-name').value.trim():'';
 const errors=formErrors({mode,name,email,password},validUsername);
 if(Object.keys(errors).length){showFieldErrors(errors);trackAuth('error',{mode,reason:'validation',field:Object.keys(errors)[0]});return;}
 clearErrors();
 if(!isConfigured){unavailable('Account access is temporarily unavailable.');return;}
 trackAuth('submit',{mode});
 submitting=true;lock(true);$('account-message').textContent=MESSAGES[mode];
 try{
  if(mode==='name'){const {error}=await supabase.auth.updateUser({data:{username:name}});if(error)throw error;}
  else if(mode==='register'){
   // The player name is optional: a friendly one is picked here and can be changed in the leaderboard.
   if(!name)name=randomPlayerName();
   const {data,error}=await supabase.auth.signUp({email,password,options:{data:{username:name},emailRedirectTo:redirectUrl()}});
   if(error)throw error;
   if(isNewRegistration(data))trackSignUp({confirmationRequired:!data.session});
   store.set(RETURNING_KEY,'1');
   if(!data.session){$('password').value='';showConfirmation(email);return;}
  }else if(mode==='forgot'){
   const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:redirectUrl()});if(error)throw error;
   showConfirmation(email,{kind:'reset'});return;
  }else if(mode==='recovery'){
   const {error}=await supabase.auth.updateUser({password});if(error)throw error;
   recovering=false;trackAuth('password_changed');store.set(RETURNING_KEY,'1');try{history.replaceState(null,'',location.pathname);}catch{}
  }else{
   const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;
   const afterSignup=store.get(CONFIRM_KEY)==='1';store.remove(CONFIRM_KEY);trackAuth('login',{method:'password',after_signup:afterSignup});
  }
  await openFarm();$('password').value='';
 }catch(error){
  const problem=describeAuthError(error,cloudError);trackAuth('error',{mode,reason:problem.reason,field:problem.field});
  if(problem.resend)showConfirmation(email,{fresh:false});
  else if(problem.field&&shownField(problem.field))fieldError(problem.field,problem.message);
  else $('account-message').textContent=problem.message;
 }
 finally{submitting=false;lock(false);}
};
function shownField(field){return !$(field+'-row').hidden;}
$('resend-confirmation').onclick=async()=>{
 if(!pendingEmail||!supabase)return;trackAuth('resend',{mode:confirmKind});$('confirm-message').textContent='Sending…';
 try{
  const {error}=confirmKind==='reset'?await supabase.auth.resetPasswordForEmail(pendingEmail,{redirectTo:redirectUrl()}):await supabase.auth.resend({type:'signup',email:pendingEmail,options:{emailRedirectTo:redirectUrl()}});
  if(error)throw error;$('confirm-message').textContent='Sent! It can take a minute to arrive.';startResendCooldown(60);
 }catch(error){const problem=describeAuthError(error,cloudError);$('confirm-message').textContent=problem.message;trackAuth('error',{mode:'confirm',reason:problem.reason});}
};
$('confirm-back').onclick=()=>setMode(confirmKind==='reset'?'forgot':'register',true);
$('retry-connection').onclick=openFarm;$('leave-account').onclick=signOut;
window.addEventListener('offline',()=>unavailable());
window.addEventListener('online',()=>{if(document.body.dataset.phase==='error')openFarm();});
if(supabase)supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='PASSWORD_RECOVERY'){startRecovery();return;}
 if(event==='SIGNED_OUT'){landing();return;}
 if(recovering)return;
 if(event==='SIGNED_IN'&&!submitting&&checking&&(!playerId||playerId!==session?.user.id)){dispose();phase('checking','Checking your account…');reopen=true;return;}
 if(playerId&&session?.user.id!==playerId){dispose();phase('checking','Checking your account…');}
 if(event==='SIGNED_IN'&&!submitting&&!frame)setTimeout(openFarm,0);
});
async function checkSession(){if(!frame||checking)return;const ticket=generation;try{const user=await verifiedUser();if(ticket!==generation)return;if(!user||user.id!==playerId){landing('Please sign in to continue.');return;}if(frame.contentWindow.harvestRefresh)await frame.contentWindow.harvestRefresh();else await window.harvestBridge.request({operation:'load'});}catch(error){if(ticket===generation)unavailable(cloudError(error));}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession();});setInterval(checkSession,60000);
// Boot: a reset link opens the new-password form, an expired link explains itself, a first-time visitor sees the sign-up card at once.
const kind=linkKind();
if(kind==='recovery')startRecovery();
else if(linkError()){landing('That link has expired or was already used. Sign in, or ask for a new link.');trackAuth('link_error');}
else{
 if(kind==='signup'){trackAuth('email_confirmed');store.remove(CONFIRM_KEY);}
 if(!kind&&brandNewVisitor())landing();else openFarm();
}
