import {supabase,isConfigured,verifiedUser,validUsername,farmRequest,cloudError} from './supabase.js';
import {fetchLeaderboard} from './leaderboard.js';
const $=id=>document.getElementById(id);
let mode='signin',generation=0,playerId=null,frame=null,submitting=false,checking=false,reopen=false;
function phase(value,message){document.body.dataset.phase=value;$('loading-screen').hidden=value!=='checking';$('welcome').hidden=value==='checking'||value==='authenticated';$('farm-host').hidden=value!=='authenticated';if(message)$('loading-copy').textContent=message;}
function dispose(){generation++;frame?.remove();frame=null;playerId=null;delete window.harvestBridge;$('farm-host').replaceChildren();}
function setMode(next,focus=false){mode=next;const registration=mode==='register',onboarding=mode==='name';$('name-row').hidden=!registration&&!onboarding;$('player-name').required=registration||onboarding;for(const id of ['email','password']){$(id+'-row').hidden=onboarding;$(id).required=!onboarding;}$('confirm-row').hidden=!registration;$('confirm-password').required=registration;$('password').autocomplete=registration?'new-password':'current-password';$('account-title').textContent=onboarding?'Meet your farmer.':registration?'Something good starts here.':'Welcome home.';$('account-copy').textContent=onboarding?'Choose the name other farmers will see.':registration?'Your first harvest is just around the corner.':'Sign in to pick up where you left off.';$('account-submit').textContent=onboarding?'Open my farm':registration?'Create account & play':'Sign in & play';$('account-message').textContent='';$('account-form').hidden=false;$('connection-actions').hidden=true;document.querySelector('.account-tabs').hidden=onboarding;document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));if(focus){document.querySelector('.account-card').scrollIntoView({behavior:'smooth',block:'start'});$(registration||onboarding?'player-name':'email').focus({preventScroll:true});}}
function landing(message=''){dispose();setMode('signin');phase('unauthenticated');$('account-message').textContent=message;}
function unavailable(message='Your farm is safe. Reconnect to continue.'){dispose();phase('error');$('account-title').textContent='A little pause.';$('account-copy').textContent=message;$('account-message').textContent='';$('account-form').hidden=true;document.querySelector('.account-tabs').hidden=true;$('connection-actions').hidden=false;}
async function signOut(){if(!supabase){landing();return;}dispose();phase('checking','Signing you out…');try{const result=await supabase.auth.signOut();if(result.error)throw result.error;}catch{await supabase.auth.signOut({scope:'local'});}finally{landing();$('password').value='';$('confirm-password').value='';}}
async function openFarm(){
 if(checking){reopen=true;return;}checking=true;dispose();const ticket=generation;phase('checking','Checking your account…');
 try{
  if(!isConfigured)throw new Error('Account access is temporarily unavailable. Please try again later.');
  if(!navigator.onLine)throw new Error('Connect to the internet to open your farm.');
  const user=await verifiedUser();if(ticket!==generation)return;
  if(!user){landing();return;}playerId=user.id;phase('checking','Opening your farm…');
  let initial;try{initial=await farmRequest({operation:'load'});}catch(error){if(ticket!==generation)return;if(error.code==='USERNAME_REQUIRED'){phase('unauthenticated');setMode('name');return;}throw error;}
  if(ticket!==generation)return;if(initial.profile?.player_id!==user.id){reopen=true;return;}
  const bridge={playerId,serverNow:initial.serverNow,takeInitial(){const data=initial;initial=null;return data;},signOut,async leaderboard(){if(ticket!==generation)throw new Error('Your session has ended.');return fetchLeaderboard(supabase,user.id);},async request(body){
   if(ticket!==generation||!navigator.onLine)throw new Error('Your session is paused. Reconnect to continue.');
   try{const data=await farmRequest(body);if(ticket!==generation||data.profile?.player_id!==user.id)throw new Error('Your session has ended.');return data;}
   catch(error){if(ticket===generation&&error.code!=='ACTION_REJECTED'&&error.status!==400){if(error.status===401){await supabase.auth.signOut({scope:'local'});landing('Your session has ended. Please sign in again.');}else unavailable(error.message);}throw error;}
  }};
  window.harvestBridge=bridge;frame=document.createElement('iframe');frame.title='Harvest Tycoon farm';frame.src='/farm.html';$('farm-host').append(frame);phase('authenticated');
 }catch(error){if(ticket===generation){if(error.status===401){landing('Your session has ended. Please sign in again.');}else unavailable(cloudError(error));}}
 finally{checking=false;if(reopen){reopen=false;queueMicrotask(openFarm);}}
}
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{if(submitting)return;setMode(button.dataset.mode,true);});
$('account-form').onsubmit=async event=>{
 event.preventDefault();if(submitting||!event.currentTarget.reportValidity())return;
 if((mode==='register'||mode==='name')&&!validUsername($('player-name').value)){$('account-message').textContent='Use 3–20 letters, numbers, spaces, underscores or hyphens.';return;}
 if(mode==='register'&&$('password').value!==$('confirm-password').value){$('account-message').textContent='Your passwords do not match.';return;}
 if(!isConfigured){unavailable('Account access is temporarily unavailable.');return;}
 submitting=true;$('account-submit').disabled=true;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=true);$('account-message').textContent=mode==='register'?'Creating your account…':'Opening your farm…';
 try{
  if(mode==='name'){const {error}=await supabase.auth.updateUser({data:{username:$('player-name').value.trim()}});if(error)throw error;}
  else if(mode==='register'){
   const {data,error}=await supabase.auth.signUp({email:$('email').value.trim(),password:$('password').value,options:{data:{username:$('player-name').value.trim()},emailRedirectTo:new URL('/play.html',location.origin).href}});
   if(error)throw error;
   if(!data.session){$('account-message').textContent='Check your inbox to confirm your email, then sign in to open your farm.';$('password').value='';$('confirm-password').value='';return;}
  }else{const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error)throw error;}
  await openFarm();$('password').value='';$('confirm-password').value='';
 }catch(error){$('account-message').textContent=cloudError(error);}
 finally{submitting=false;$('account-submit').disabled=false;document.querySelectorAll('[data-mode]').forEach(b=>b.disabled=false);}
};
$('retry-connection').onclick=openFarm;$('leave-account').onclick=signOut;
window.addEventListener('offline',()=>unavailable());
window.addEventListener('online',()=>{if(document.body.dataset.phase==='error')openFarm();});
if(supabase)supabase.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){landing();return;}
 if(event==='SIGNED_IN'&&!submitting&&checking&&(!playerId||playerId!==session?.user.id)){dispose();phase('checking','Checking your account…');reopen=true;return;}
 if(playerId&&session?.user.id!==playerId){dispose();phase('checking','Checking your account…');}
 if(event==='SIGNED_IN'&&!submitting&&!frame)setTimeout(openFarm,0);
});
async function checkSession(){if(!frame||checking)return;const ticket=generation;try{const user=await verifiedUser();if(ticket!==generation)return;if(!user||user.id!==playerId){landing('Please sign in to continue.');return;}if(frame.contentWindow.harvestRefresh)await frame.contentWindow.harvestRefresh();else await window.harvestBridge.request({operation:'load'});}catch(error){if(ticket===generation)unavailable(cloudError(error));}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkSession();});setInterval(checkSession,60000);
openFarm();
