// A single, gentle question at the first moment a player has to wait ("Want a nudge when your crops are ready?").
// It appears once, only where push reminders can really work, never after "Not now", and asks nothing more than one tap:
// "Turn on" asks the browser for permission and switches on the crop and production reminders. Anything else stays in Settings.
const KEY='harvest-tycoon:reminder-nudge';
const WAIT_MS=10*60000;
const SETTLE_MS=15000;

// `canShow` is true only while the farm itself is on screen: never over the loading screen or another dialog.
// `settleMs` gives the farm a moment of quiet after that, so the question never lands on top of the welcome-back message.
export function createReminderNudge({state,farmNow,level,notify,track=()=>{},canShow=()=>true,settleMs=SETTLE_MS,clock=()=>Date.now()}){
 let shown=false,checking=false,lastCheck=0,visibleSince=0;
 const storage={get(){try{return localStorage.getItem(KEY);}catch{return 'unavailable';}},set(value){try{localStorage.setItem(KEY,value);}catch{}}};
 const bridge=()=>{try{return window.parent?.harvestBridge?.notifications??null;}catch{return null;}};
 const jobs=building=>[building?.job,...(building?.extraJobs??[])].filter(Boolean);
 // The player is about to wait: something is still growing or being made for at least ten minutes.
 function waiting(now){
  return state.plots.some(p=>p.crop&&p.readyAt-now>=WAIT_MS)||Object.values(state.buildings??{}).some(b=>jobs(b).some(j=>j.readyAt-now>=WAIT_MS));
 }
 function close(){document.querySelector('.reminder-nudge')?.remove();}
 function show(){
  shown=true;track('reminder_prompt',{action:'shown'});
  const card=document.createElement('aside');card.className='reminder-nudge';card.setAttribute('role','region');card.setAttribute('aria-label','Reminders');
  card.innerHTML='<span class="reminder-nudge-icon" aria-hidden="true"><i data-lucide="bell"></i></span><div class="reminder-nudge-copy"><strong>Want a nudge when your crops are ready?</strong><span>We only send a reminder when something is waiting.</span></div><div class="reminder-nudge-actions"><button type="button" class="small-button" data-nudge-later>Not now</button><button type="button" class="primary-button" data-nudge-on>Turn on</button></div>';
  card.querySelector('[data-nudge-later]').onclick=()=>{storage.set('dismissed');track('reminder_prompt',{action:'dismissed'});close();};
  card.querySelector('[data-nudge-on]').onclick=async()=>{
   const button=card.querySelector('[data-nudge-on]');button.disabled=true;storage.set('answered');
   try{
    const api=bridge(),result=await api.push.enable();
    if(result?.kind!=='on'){notify(result?.kind==='blocked'?'Notifications are blocked for this site. You can allow them in your browser settings.':'Reminders could not be turned on here.');track('reminder_prompt',{action:'failed'});close();return;}
    const current=await api.get();await api.save({...current,pushCrops:true,pushProduction:true});
    track('reminder_prompt',{action:'accepted'});notify('Reminders are on. We will nudge you when crops or batches are ready.');
   }catch{notify('Reminders could not be turned on. You can try again in Settings.');track('reminder_prompt',{action:'failed'});}
   finally{close();}
  };
  document.body.append(card);
  try{window.lucide?.createIcons?.();}catch{}
 }
 // Cheap enough to call after every screen update: it waits, checks at most every 30 seconds and stops for good after the first answer.
 async function check(){
  if(shown||checking||storage.get())return;
  const now=clock();
  if(!canShow()){visibleSince=0;return;}
  if(!visibleSince)visibleSince=now;
  if(now-visibleSince<settleMs||now-lastCheck<30000)return;lastCheck=now;
  if(level()<2||!waiting(farmNow()))return;
  checking=true;
  try{
   const api=bridge();if(!api)return;await api.ready;
   if(!api.available||!api.config?.push||!api.push)return;
   if((await api.push.status()).kind!=='off')return;
   show();
  }catch{}finally{checking=false;}
 }
 return {check};
}
