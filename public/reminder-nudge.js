// A gentle question right after a harvest ("Want a nudge when your crops are ready?"), one tap to answer:
// "Turn on" asks the browser for permission and switches on the crop and production reminders. Anything else stays in Settings.
// It comes at level 5, and again at level 10 and 20 while reminders are still off (30 Sep 2026: most new farmers leave in their
// first visit and never come back, so the repeats come with levels, in the same visit too, never with days). One card at a time.
// Where push cannot work (inside the Facebook, Instagram or TikTok app, Safari on an iPhone without the Home Screen app, push blocked)
// the same question offers the daily email instead (28 Sep 2026): every account has an address.
const KEY='harvest-tycoon:reminder-nudge';
export const NUDGE_LEVELS=Object.freeze([5,10,20]);
// A harvest by hand, of one field or several, or by the tractor.
export const harvestAction=action=>((action?.type==='field'||action?.type==='fields')&&action.action==='harvest')||(action?.type==='tractor'&&action.mode==='harvest');
const HARVEST_WINDOW_MS=2*60000;
const SETTLE_MS=15000;

// `canShow` is true only while the farm itself is on screen: never over the loading screen or another dialog.
// `settleMs` gives the farm a moment of quiet after that, so the question never lands on top of the welcome-back message.
// An email sign-up's address is not checked at sign-up (fewer steps to an account), so it can hold a typo or someone else's address.
// There "Email me" opens the 6-digit code check (email-check-ui.js, with its diamonds) and notify-hourly mails only a confirmed address.
export function createReminderNudge({state,level,notify,track=()=>{},canShow=()=>true,settleMs=SETTLE_MS,clock=()=>Date.now(),emailUnconfirmed=()=>false,confirmEmail=()=>{}}){
 let open=false,checking=false,lastCheck=0,visibleSince=0,harvestedAt=0;
 const storage={get(){try{return localStorage.getItem(KEY);}catch{return 'unavailable';}},set(value){try{localStorage.setItem(KEY,value);}catch{}}};
 // The device remembers the farm it last asked and that farm's level then ("farm:level"; a new farm on the same device starts
 // over). "dismissed" and "answered" are from before the repeats (asked once, from level 2).
 const farmKey=()=>String(state.rookieUntil??0);
 function askedAt(){
  const value=storage.get();if(!value)return 0;if(value==='unavailable')return Infinity;if(value==='dismissed'||value==='answered')return 2;
  const [farm,at]=value.split(':');return farm===farmKey()?Number(at)||0:0;
 }
 const due=lvl=>{const before=askedAt();return NUDGE_LEVELS.some(step=>step>before&&step<=lvl);};
 const bridge=()=>{try{return window.parent?.harvestBridge?.notifications??null;}catch{return null;}};
 function close(){open=false;document.querySelector('.reminder-nudge')?.remove();}
 function show(channel,lvl){
  open=true;storage.set(`${farmKey()}:${lvl}`);track('reminder_prompt',{action:'shown',channel});
  const card=document.createElement('aside');card.className='reminder-nudge';card.setAttribute('role','region');card.setAttribute('aria-label','Reminders');
  card.innerHTML=channel==='email'
   ?'<span class="reminder-nudge-icon" aria-hidden="true"><i data-lucide="mail"></i></span><div class="reminder-nudge-copy"><strong>Want a reminder by email?</strong><span>At most one a day, only when crops or your daily gift are waiting. Unsubscribe in one tap.</span></div><div class="reminder-nudge-actions"><button type="button" class="small-button" data-nudge-later>Not now</button><button type="button" class="primary-button" data-nudge-on>Email me</button></div>'
   :'<span class="reminder-nudge-icon" aria-hidden="true"><i data-lucide="bell"></i></span><div class="reminder-nudge-copy"><strong>Want a nudge when your crops are ready?</strong><span>We only send a reminder when something is waiting.</span></div><div class="reminder-nudge-actions"><button type="button" class="small-button" data-nudge-later>Not now</button><button type="button" class="primary-button" data-nudge-on>Turn on</button></div>';
  card.querySelector('[data-nudge-later]').onclick=()=>{track('reminder_prompt',{action:'dismissed',channel});close();};
  card.querySelector('[data-nudge-on]').onclick=async()=>{
   const button=card.querySelector('[data-nudge-on]');button.disabled=true;
   if(channel==='email'){
    try{const api=bridge(),current=await api.get();await api.save({...current,emailDigest:true});track('reminder_prompt',{action:'accepted',channel});if(emailUnconfirmed()){notify('Confirm your email address and the reminders start.');confirmEmail();}else notify('Email reminders are on. You can change the time in Settings.');}
    catch{notify('Email reminders could not be turned on. You can try again in Settings.');track('reminder_prompt',{action:'failed',channel});}
    finally{close();}
    return;
   }
   try{
    const api=bridge(),result=await api.push.enable();
    if(result?.kind!=='on'){notify(result?.kind==='blocked'?'Notifications are blocked for this site. You can allow them in your browser settings.':'Reminders could not be turned on here.');track('reminder_prompt',{action:'failed',channel});close();return;}
    const current=await api.get();await api.save({...current,pushCrops:true,pushProduction:true});
    track('reminder_prompt',{action:'accepted',channel});notify('Reminders are on. We will nudge you when crops or batches are ready.');
   }catch{notify('Reminders could not be turned on. You can try again in Settings.');track('reminder_prompt',{action:'failed',channel});}
   finally{close();}
  };
  document.body.append(card);
  try{window.lucide?.createIcons?.();}catch{}
 }
 // After a harvest the question may come within two minutes (a level-up window after the harvest is closed first, then a quiet moment).
 function harvested(){harvestedAt=clock();lastCheck=0;}
 // Cheap enough to call after every screen update: only after a harvest, at most every 30 seconds, and only at a level it has not asked at.
 async function check(){
  if(open||checking||!harvestedAt)return;
  const now=clock();
  if(now-harvestedAt>HARVEST_WINDOW_MS){harvestedAt=0;return;}
  if(!canShow()){visibleSince=0;return;}
  if(!visibleSince)visibleSince=now;
  if(now-visibleSince<settleMs||now-lastCheck<30000)return;lastCheck=now;
  const lvl=level();if(!due(lvl)){harvestedAt=0;return;}
  checking=true;
  try{
   const api=bridge();if(!api)return;await api.ready;if(!api.available)return;
   const push=api.config?.push&&api.push?(await api.push.status()).kind:'unsupported';
   harvestedAt=0;
   if(push==='on')return;
   if(push==='off'){show('push',lvl);return;}
   if(!api.config?.email||(await api.get()).emailDigest)return;
   show('email',lvl);
  }catch{}finally{checking=false;}
 }
 return {check,harvested};
}
