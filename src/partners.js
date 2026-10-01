// /partners (public/partners.html, 1 Oct 2026): the partner programme's account box and panel, apart from the game's Invite a friend.
// Its own session (storageKey harvest-tycoon:partner-auth): a partner's account never opens a farm on this device, and a farmer who
// is signed in to the game is not signed in here. Sign up, sign in, a new password by email, and the panel: the link, what it
// brought in and the payout form (supabase/functions/partner-api). Payouts are never automatic; from €20 the partner asks.
import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const PARTNER_AUTH_KEY='harvest-tycoon:partner-auth';
const supabase=url&&key?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:PARTNER_AUTH_KEY}}):null;
const API=url?`${url.replace(/\/$/,'')}/functions/v1/partner-api`:'';
const root=document.getElementById('partner-app');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const euro=cents=>`€${(Math.max(0,Number(cents)||0)/100).toFixed(2)}`;
const STATUS={requested:'Asked for',paid:'Paid',rejected:'Not paid'};
let mode='signup',panel=null,note='',noteKind='',busy=false,asking=false,recovering=false;

async function api(body){
 const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Please sign in.');
 const response=await fetch(API,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Something went wrong. Please try again.');return data;
}
const say=(text,kind='')=>{note=text;noteKind=kind;};
const noteHtml=()=>note?`<p class="partner-note${noteKind?` is-${noteKind}`:''}" role="status">${esc(note)}</p>`:'';
const field=(label,input)=>`<label class="partner-field"><span>${label}</span>${input}</label>`;

function accountForms(){
 const tabs=`<div class="partner-tabs" role="tablist"><button type="button" role="tab" data-mode="signup" aria-selected="${mode==='signup'}">Become a partner</button><button type="button" role="tab" data-mode="signin" aria-selected="${mode==='signin'||mode==='forgot'}">Sign in</button></div>`;
 if(recovering)return `<form class="partner-form" data-form="recover"><p>Choose a new password for your partner account.</p>${field('New password','<input type="password" name="password" autocomplete="new-password" minlength="8" required>')}<button class="legal-button" type="submit">Save password</button>${noteHtml()}</form>`;
 if(mode==='signin')return `${tabs}<form class="partner-form" data-form="signin">${field('Email','<input type="email" name="email" autocomplete="email" required>')}${field('Password','<input type="password" name="password" autocomplete="current-password" required>')}<button class="legal-button" type="submit">Sign in</button><button type="button" class="partner-link-button" data-mode="forgot">Forgot your password?</button>${noteHtml()}</form>`;
 if(mode==='forgot')return `${tabs}<form class="partner-form" data-form="forgot"><p>We send you a link to choose a new password.</p>${field('Email','<input type="email" name="email" autocomplete="email" required>')}<button class="legal-button" type="submit">Send the link</button><button type="button" class="partner-link-button" data-mode="signin">Back to sign in</button>${noteHtml()}</form>`;
 return `${tabs}<form class="partner-form" data-form="signup">${field('Your name or company','<input type="text" name="name" maxlength="80" autocomplete="organization" required>')}${field('Website or channel <small>(optional)</small>','<input type="text" name="website" maxlength="200" placeholder="https://… or @name">')}${field('Email','<input type="email" name="email" autocomplete="email" required>')}${field('Password <small>(at least 8 characters)</small>','<input type="password" name="password" autocomplete="new-password" minlength="8" required>')}<label class="partner-check"><input type="checkbox" name="terms" required><span>I accept the <a href="#terms">partner terms</a>.</span></label><button class="legal-button" type="submit">Become a partner</button><p class="partner-small">Already have a Harvest Tycoon account with a password? Sign in with it and become a partner from there.</p>${noteHtml()}</form>`;
}
function joinForm(){
 return `<form class="partner-form" data-form="join"><p>You are signed in as <strong>${esc(panel?.email)}</strong>. Become a partner with this account:</p>${field('Your name or company','<input type="text" name="name" maxlength="80" required>')}${field('Website or channel <small>(optional)</small>','<input type="text" name="website" maxlength="200" placeholder="https://… or @name">')}<label class="partner-check"><input type="checkbox" name="terms" required><span>I accept the <a href="#terms">partner terms</a>.</span></label><button class="legal-button" type="submit">Become a partner</button> <button type="button" class="partner-link-button" data-signout>Sign out</button>${noteHtml()}</form>`;
}
function panelHtml(){
 const {partner,stats:s,rules,payouts}=panel,open=payouts.find(p=>p.status==='requested');
 const tiles=[['Players brought in',s.players],['Paying players',s.payingPlayers],['Earned',euro(s.earnedCents)],['Paid out',euro(s.paidCents)],['Available',euro(s.availableCents)]];
 const payout=open?`<p class="partner-payout-state">Your payout request of <strong>${euro(open.amountCents)}</strong> is with us. We will be in touch by email.</p>`
  :s.availableCents>=rules.minCents?(asking?`<form class="partner-form" data-form="payout"><p>Ask for <strong>${euro(s.availableCents)}</strong>. We pay it by hand.</p>${field('Pay to (name on the account)','<input type="text" name="name" maxlength="80" autocomplete="name" required>')}${field('IBAN or PayPal email address','<input type="text" name="details" maxlength="200" required>')}${field('Note <small>(optional)</small>','<textarea name="note" maxlength="500" rows="2"></textarea>')}<button class="legal-button" type="submit">Send the request</button> <button type="button" class="partner-link-button" data-asking="0">Cancel</button>${noteHtml()}</form>`
   :`<button type="button" class="legal-button" data-asking="1">Ask for a payout of ${euro(s.availableCents)}</button>`)
  :`<p class="partner-payout-state">You can ask for a payout from ${euro(rules.minCents)}. Available now: <strong>${euro(s.availableCents)}</strong>.</p>`;
 return `<div class="partner-panel"><div class="partner-panel-head"><div><strong>${esc(partner.name)}</strong><small>${esc(panel.email)}</small></div><button type="button" class="partner-link-button" data-signout>Sign out</button></div>
  <div class="partner-linkbox"><span>Your partner link</span><div><input type="text" readonly value="${esc(partner.link)}" aria-label="Your partner link" data-link><button type="button" class="legal-button" data-copy>Copy</button></div></div>
  <ul class="partner-stats">${tiles.map(([label,value])=>`<li><strong>${esc(value)}</strong><span>${label}</span></li>`).join('')}</ul>
  <p class="partner-small">${rules.sharePct}% of what your players spend, without ${rules.vatPct}% VAT. Numbers only: we never show who your players are.</p>
  <h3>Payouts</h3>${payout}${asking?'':noteHtml()}
  ${payouts.length?`<table class="legal-table"><thead><tr><th>Asked on</th><th>Amount</th><th>Status</th></tr></thead><tbody>${payouts.map(p=>`<tr><td>${esc(new Date(p.requestedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}))}</td><td>${euro(p.amountCents)}</td><td>${STATUS[p.status]??esc(p.status)}</td></tr>`).join('')}</tbody></table>`:''}</div>`;
}
function render(){
 if(!root)return;
 if(!supabase){root.innerHTML='<p>The partner programme is not available right now.</p>';return;}
 root.innerHTML=busy?'<p class="partner-loading">One moment…</p>':panel?.partner?panelHtml():panel&&!recovering?joinForm():accountForms();
 root.classList.toggle('is-busy',busy);
}
async function loadPanel(join=null){
 busy=true;render();
 try{panel=await api({operation:'panel',...(join?{join}:{})});if(panel.joined)say('Welcome! Your partner link is ready.','good');}
 catch(error){panel=null;say(error.message,'bad');}
 busy=false;render();
}
const form=el=>Object.fromEntries(new FormData(el).entries());
async function submit(kind,values){
 say('');busy=true;render();
 try{
  if(kind==='signup'){
   const {data,error}=await supabase.auth.signUp({email:values.email.trim(),password:values.password,options:{data:{partner_signup:true,partner_name:values.name.trim(),partner_website:values.website.trim(),partner_terms:true,language:'en'},emailRedirectTo:`${location.origin}/partners`}});
   if(error)throw error;
   if(!data.session){busy=false;mode='signin';say('Almost there: confirm your email with the link we sent you, then sign in here.','good');render();return;}
   return loadPanel();
  }
  if(kind==='signin'){const {error}=await supabase.auth.signInWithPassword({email:values.email.trim(),password:values.password});if(error)throw error;return loadPanel();}
  if(kind==='forgot'){const {error}=await supabase.auth.resetPasswordForEmail(values.email.trim(),{redirectTo:`${location.origin}/partners`});if(error)throw error;busy=false;mode='signin';say('Check your inbox for the link to choose a new password.','good');render();return;}
  if(kind==='recover'){const {error}=await supabase.auth.updateUser({password:values.password});if(error)throw error;recovering=false;say('Your new password is saved.','good');return loadPanel();}
  if(kind==='join')return loadPanel({name:values.name,website:values.website,terms:values.terms==='on'});
  if(kind==='payout'){panel=await api({operation:'payout',name:values.name,details:values.details,note:values.note});asking=false;say('Your request is on its way. We will be in touch by email.','good');}
 }catch(error){say(error.code==='invalid_credentials'?'The email address or password is incorrect.':error.code==='email_not_confirmed'?'Confirm your email first, with the link we sent you.':error.message||'Something went wrong. Please try again.','bad');}
 busy=false;render();
}
root?.addEventListener('submit',event=>{const el=event.target.closest('form[data-form]');if(!el)return;event.preventDefault();void submit(el.dataset.form,form(el));});
root?.addEventListener('click',async event=>{
 const to=event.target.closest('[data-mode]');if(to){mode=to.dataset.mode;say('');render();return;}
 if(event.target.closest('[data-asking]')){asking=event.target.closest('[data-asking]').dataset.asking==='1';say('');render();return;}
 if(event.target.closest('[data-copy]')){const input=root.querySelector('[data-link]');try{await navigator.clipboard.writeText(input.value);say('Your link is copied.','good');}catch{input.select();}render();return;}
 if(event.target.closest('[data-signout]')){await supabase.auth.signOut();panel=null;mode='signin';say('');render();}
});
if(supabase){
 supabase.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY'){recovering=true;panel=null;busy=false;render();}});
 supabase.auth.getSession().then(({data:{session}})=>{if(recovering)return;if(session&&!session.user.is_anonymous)void loadPanel();else render();});
}else render();
