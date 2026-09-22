import {rookieBoostLeft,rookieBoost,ROOKIE_TAPER_MS,ROOKIE_MS,ROOKIE_TIMER_BOOST,CROPS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art} from './visual-icons.js';

// The beginner boost is temporary, and everything here says so: an hourglass button next to the diamonds shows how long is left,
// and tapping it opens a screen that explains what it is and what changes when it ends. The rules live in farm-state.js
// (rookieLeft); this only shows them.
const percent=Math.round(ROOKIE_TIMER_BOOST*100);
export const rookieTimeLeft=ms=>ms<60000?`${Math.max(1,Math.ceil(ms/1000))}s`:`${Math.ceil(ms/60000)} min`;
export const rookieBadge=ms=>ms<60000?'<1m':`${Math.ceil(ms/60000)}m`;
export const rookieLabel=(ms,boost=ROOKIE_TIMER_BOOST)=>`${Math.round(boost*100)}% shorter waiting · ${rookieTimeLeft(ms)} left`;

export function createRookieUI({state,document:doc=globalThis.document,now=farmNow}){
 const dialog=doc.createElement('dialog');dialog.id='rookie-dialog';dialog.setAttribute('aria-labelledby','rookie-title');
 doc.body.append(dialog);
 let phase='';
 const minutes=ms=>{const n=Math.round(ms/60000);return `${n} minute${n===1?'':'s'}`;};
 const normal=minutes(CROPS.corn.duration).replace(' minutes',''),fast=minutes(CROPS.corn.duration*(1-ROOKIE_TIMER_BOOST));
 function render(left){
  const on=left>0,currentPercent=Math.round(rookieBoost(state,now())*100);phase=on?'on':'ended';
  dialog.innerHTML=`<button type="button" class="rookie-close" data-rookie-close aria-label="Close">×</button>${art('hourglass','rookie-art')}<p class="eyebrow">BEGINNER BOOST</p>`+
   (on?`<h2 id="rookie-title"><span data-rookie-percent>${currentPercent}</span>% shorter waiting times</h2><p>Your first ${ROOKIE_MS/60000} minutes are a sprint: new crops and batches finish in a fraction of the time.</p>
    <div class="rookie-clock"><progress max="${ROOKIE_MS+ROOKIE_TAPER_MS}" value="${left}" aria-label="Time left of your beginner boost"></progress><b data-rookie-left>${rookieTimeLeft(left)} left</b></div>
    <ul class="rookie-notes"><li><strong>Fast now</strong><span>At full boost, corn takes ${fast} instead of ${normal}, and the Care marker shows up sooner.</span></li>
    <li><strong>Only for a while</strong><span>The boost gradually eases for 90 minutes, beginning ${ROOKIE_MS/60000} minutes after you started your farm. Then waiting times are back to normal; crops and batches that are already running keep their fast times.</span></li>
    <li><strong>Your starter goods</strong><span>Your starter corn and animal feed are kept for your first steps. After 30 minutes they are yours to sell.</span></li></ul>`
   :`<h2 id="rookie-title">Beginner boost ended</h2><p>Your beginner boost has gently eased to its end. Waiting times are back to normal, and your starter corn and animal feed are free to sell.</p>`)+
   `<button type="button" class="primary-button" data-rookie-close>Got it</button>`;
 }
 function open(){
  doc.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});
  render(rookieBoostLeft(state,now()));if(!dialog.open)dialog.showModal();
  dialog.querySelector('.primary-button')?.focus({preventScroll:true});
 }
 // The hourglass buttons and the chip only need [data-rookie-open]; nothing else has to know about this screen.
 doc.addEventListener('click',event=>{if(event.target.closest?.('[data-rookie-open]'))open();});
 dialog.addEventListener('click',event=>{
  if(event.target.closest('[data-rookie-close]'))dialog.close();
  else if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}
 });
 // Called with the other screens: shows or hides the hourglass and keeps every clock in step.
 function tick(){
  const left=rookieBoostLeft(state,now());
  const button=doc.getElementById('rookie-button'),badge=doc.getElementById('rookie-time');
  if(button){button.hidden=left<=0;button.title=left>0?`Beginner boost · ${rookieLabel(left,rookieBoost(state,now()))}`:'Beginner boost';}
  if(badge){const text=left>0?rookieBadge(left):'';if(badge.textContent!==text)badge.textContent=text;}
  if(!dialog.open)return;
  if((left>0?'on':'ended')!==phase)render(left);
  else if(left>0){dialog.querySelector('[data-rookie-left]').textContent=`${rookieTimeLeft(left)} left`;dialog.querySelector('progress').value=left;dialog.querySelector('[data-rookie-percent]').textContent=Math.round(rookieBoost(state,now())*100);}
 }
 tick();
 return {open,tick,refresh:tick};
}
