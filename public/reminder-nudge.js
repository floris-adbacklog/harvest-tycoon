// A gentle question right after a harvest ("Want a nudge when your crops are ready?"), one tap to answer:
// "Turn on" asks the browser for permission and switches on the crop and production reminders. Anything else stays in Settings.
// It comes at level 5, and again at level 10 and 20 while reminders are still off (30 Sep 2026: most new farmers leave in their
// first visit and never come back, so the repeats come with levels, in the same visit too, never with days). One card at a time.
// The first ask after the first daily gift (13 Oct 2026, item 4 of the 13 Oct proposal): half of the new farmers collect it, in their
// first 4 minutes, and only 43% reach level 5 on their first day. Right after the farm's first gift (once its window is closed) the same
// card asks "Want a nudge when tomorrow’s gift is ready?", and "Turn on" switches on the daily gift reminder. It takes the place of
// the level-5 ask: a farmer who skipped the gift is still asked at level 5, so it stays three asks in all.
// Where push cannot work (inside the Facebook, Instagram or TikTok app, Safari on an iPhone without the Home Screen app, push blocked)
// the same question offers the daily email instead (28 Sep 2026): every account has an address. In our Android app "Turn on" asks
// the app for its own notifications (src/app-push.js, Oct 2026), the same question with the same answer.
import {art} from './visual-icons.js';
import {APP_PUSH_BLOCKED} from './android.js';
const KEY='harvest-tycoon:reminder-nudge';
export const NUDGE_LEVELS=Object.freeze([5,10,20]);
// A harvest by hand, of one field or several, or by the tractor.
export const harvestAction=action=>((action?.type==='field'||action?.type==='fields')&&action.action==='harvest')||(action?.type==='tractor'&&action.mode==='harvest');
const HARVEST_WINDOW_MS=2*60000;
const SETTLE_MS=15000;
// After the first gift: 1.5 s of farm once the gift's window (Today or Welcome back) and a level-up are closed, within 5 minutes.
const GIFT_SETTLE_MS=1500,GIFT_WINDOW_MS=5*60000;
// The question's words: after a harvest, or after the first gift (on its card the email version names the gift too).
const ASK={push:{harvest:'Want a nudge when your crops are ready?',gift:'Want a nudge when tomorrow’s gift is ready?'},email:{harvest:'Want a reminder by email?',gift:'Want an email when tomorrow’s gift is ready?'}};

// `canShow` is true only while the farm itself is on screen: never over the loading screen or another dialog.
// `settleMs` gives the farm a moment of quiet after that, so the question never lands on top of the welcome-back message.
// An email sign-up's address is not checked at sign-up (fewer steps to an account), so it can hold a typo or someone else's address.
// There "Email me" opens the 6-digit code check (email-check-ui.js, with its diamonds) and notify-hourly mails only a confirmed address.
// `log` (13 Oct 2026, the measurement package): each step also goes to the farmer's log (farm-api player-log.js noteLog), whatever the
// cookie choice: {step: shown, on, later, blocked or failed, channel: push or email, level}. blocked: the browser or the phone said no.
// The ask after the first gift adds at: 'gift'. `schedule` looks again every half second while that ask waits (game.js calls check()
// only when the screen changes, and closing a window changes nothing on the farm).
export function createReminderNudge({state,level,notify,track=()=>{},log=()=>{},canShow=()=>true,settleMs=SETTLE_MS,clock=()=>Date.now(),emailUnconfirmed=()=>false,confirmEmail=()=>{},schedule=(fn,ms)=>setTimeout(fn,ms)}){
 let open=false,checking=false,lastCheck=0,visibleSince=0,harvestedAt=0,giftAt=0;
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
 // gift: the ask after the first gift, kept as the level-5 one (as its own level when that is higher), so the next is at 10 or 20.
 function show(channel,lvl,gift=false){
  const step=name=>{try{log({kind:'reminder',step:name,channel,level:lvl,...(gift?{at:'gift'}:{})});}catch{}};
  open=true;storage.set(`${farmKey()}:${gift?Math.max(lvl,NUDGE_LEVELS[0]):lvl}`);track('reminder_prompt',{action:'shown',channel});step('shown');
  const card=document.createElement('aside');card.className='reminder-nudge';card.setAttribute('role','region');card.setAttribute('aria-label','Reminders');
  card.innerHTML=channel==='email'
   ?'<span class="reminder-nudge-icon" aria-hidden="true">'+art('letter')+'</span><div class="reminder-nudge-copy"><strong>'+ASK.email[gift?'gift':'harvest']+'</strong><span>At most one a day, only when crops or your daily gift are waiting. Unsubscribe in one tap.</span></div><div class="reminder-nudge-actions"><button type="button" class="small-button" data-nudge-later>Not now</button><button type="button" class="primary-button" data-nudge-on>Email me</button></div>'
   :'<span class="reminder-nudge-icon" aria-hidden="true"><i data-lucide="bell"></i></span><div class="reminder-nudge-copy"><strong>'+ASK.push[gift?'gift':'harvest']+'</strong><span>We only send a reminder when something is waiting.</span></div><div class="reminder-nudge-actions"><button type="button" class="small-button" data-nudge-later>Not now</button><button type="button" class="primary-button" data-nudge-on>Turn on</button></div>';
  card.querySelector('[data-nudge-later]').onclick=()=>{track('reminder_prompt',{action:'dismissed',channel});step('later');close();};
  card.querySelector('[data-nudge-on]').onclick=async()=>{
   const button=card.querySelector('[data-nudge-on]');button.disabled=true;
   if(channel==='email'){
    try{const api=bridge(),current=await api.get();await api.save({...current,emailDigest:true});track('reminder_prompt',{action:'accepted',channel});step('on');if(emailUnconfirmed()){notify('Confirm your email address and the reminders start.');confirmEmail();}else notify('Email reminders are on. You can change the time in Settings.');}
    catch{notify('Email reminders could not be turned on. You can try again in Settings.');track('reminder_prompt',{action:'failed',channel});step('failed');}
    finally{close();}
    return;
   }
   // After the first gift it switches on what it asked about, the daily gift reminder, as the gift's own "Remind me" does; the
   // other choices stay (a new farmer's crops & goods reminder is on unless switched off, src/notifications.js DEFAULT_PREFS).
   try{
    const api=bridge(),result=await api.push.enable();
    if(result?.kind!=='on'){notify(result?.kind==='blocked'?(api.push.app?APP_PUSH_BLOCKED:'Notifications are blocked for this site. You can allow them in your browser settings.'):'Reminders could not be turned on here.');track('reminder_prompt',{action:'failed',channel});step(result?.kind==='blocked'?'blocked':'failed');close();return;}
    const current=await api.get();await api.save(gift?{...current,pushDaily:true}:{...current,pushCrops:true,pushProduction:true});
    track('reminder_prompt',{action:'accepted',channel});step('on');notify(gift?'Reminders are on. We will let you know when your next gift is ready.':'Reminders are on. We will nudge you when crops or batches are ready.');
   }catch{notify('Reminders could not be turned on. You can try again in Settings.');track('reminder_prompt',{action:'failed',channel});step('failed');}
   finally{close();}
  };
  document.body.append(card);
  try{window.lucide?.createIcons?.();}catch{}
 }
 // After a harvest the question may come within two minutes (a level-up window after the harvest is closed first, then a quiet moment).
 function harvested(){harvestedAt=clock();lastCheck=0;}
 // After a daily gift (game.js runAction, a checkin): only the farm's first (login.visits, kept by the farm), and only while this device
 // has not asked this farm anything yet. Looked at every half second until it is asked or its 5 minutes are over.
 function gifted(){
  if(state.login?.visits!==1||askedAt()!==0)return;
  giftAt=clock();lastCheck=0;visibleSince=0;
  const look=()=>{if(!giftAt||open)return;void check();schedule(look,500);};look();
 }
 // Cheap enough to call after every screen update: only after a harvest or the first gift, at most every 30 seconds, and only at a
 // level it has not asked at (after the first gift: when it has asked nothing yet).
 async function check(){
  if(open||checking||!harvestedAt&&!giftAt)return;
  const now=clock();
  if(giftAt&&now-giftAt>GIFT_WINDOW_MS)giftAt=0;
  if(harvestedAt&&now-harvestedAt>HARVEST_WINDOW_MS)harvestedAt=0;
  if(!harvestedAt&&!giftAt)return;
  if(!canShow()){visibleSince=0;return;}
  if(!visibleSince)visibleSince=now;
  const gift=giftAt>0&&askedAt()===0;
  if(now-visibleSince<(gift?Math.min(settleMs,GIFT_SETTLE_MS):settleMs)||now-lastCheck<30000)return;lastCheck=now;
  const lvl=level();if(!gift&&!(harvestedAt&&due(lvl))){harvestedAt=0;giftAt=0;return;}
  checking=true;
  try{
   const api=bridge();if(!api)return;await api.ready;if(!api.available)return;
   const push=(api.config?.push||api.config?.appPush)&&api.push?(await api.push.status()).kind:'unsupported';
   harvestedAt=0;giftAt=0;
   if(push==='on')return;
   if(push==='off'){show('push',lvl,gift);return;}
   if(!api.config?.email||(await api.get()).emailDigest)return;
   show('email',lvl,gift);
  }catch{}finally{checking=false;}
 }
 return {check,harvested,gifted};
}
