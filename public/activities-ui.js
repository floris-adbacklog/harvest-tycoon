import {featureUnlocked,featureUnlockHint,ACTIVE_STATIONS,activityRoundReward,activityStatus,handShare,levelOf,HAND_FULL_LEVEL,HAND_REST_PER_LEVEL,ITEMS,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {refreshArt,art} from './visual-icons.js';
const $=id=>document.getElementById(id);
// A helping hand: four stops around the farm. The hub shows each stop's reward and state at a glance; opening a stop that is
// ready starts its job at once; a finished job offers "Next stop" (the next stop of the round) and the way back to all stops.
// Below level 10 the stops grow with the farm (11 Oct 2026, farm-state.js handShare): the rewards shown are this farm's own, the round
// bonus too, and the hub says the rule in one line under the round, on the screen that shows it.
export function createActivitiesUI({state,runAction,notify,onResult}){
 let selected=null,busy=false,lastSignature='',feedback='',result=null;
 const dialog=$('activities-dialog'),hubDialog=$('activities-hub-dialog');
 const order=Object.keys(ACTIVE_STATIONS);
 function statuses(){return order.map(id=>activityStatus(state,id,farmNow()));}
 function signature(){return statuses().map(s=>`${s.station}:${!!s.job}:${s.job?.done.length}:${s.remaining>0}:${s.inRound}`).join('|');}
 // Shared by the hub grid and the station dialog: every stop, clickable to jump straight there (except the one already open).
 // paidBonus: the round was just completed, and the result below says what its bonus paid (11 Oct 2026 review: the strip left out the
 // next round's bonus then, it is more after a level-up and read as a second, different amount).
 function roundStrip(all,round,paidBonus=false){
  const bonus=activityRoundReward(state);
  return `<div class="activity-round-heading"><strong>Your farm round</strong><b>${round.length} / 4</b></div><div class="activity-round-stops" aria-label="Stops completed">${all.map(stop=>`<button type="button" class="round-stop ${stop.inRound?'complete':''}" data-round-station="${stop.station}" ${stop.station===selected?'disabled':''} aria-label="${stop.name}: ${stop.inRound?'complete':'not completed'}" title="${stop.name} · ${stop.inRound?'Complete':'Not completed'}">${art(`activity-${stop.station}`)}${stop.inRound?'<i data-lucide="check" class="round-tick" data-line-icon aria-hidden="true"></i>':''}</button>`).join('')}${paidBonus?'':`<span class="round-bonus">All four stops: +${bonus.coins} coins · +${bonus.xp} XP</span>`}</div>`;
 }
 // The rule, only while it applies (a guided farm below level 10).
 function growRule(){
  if(handShare(state)>=1)return '';
  return `<p class="activity-grow-rule">Stops grow with your farm: now each rests ${Math.round(HAND_REST_PER_LEVEL*levelOf(state)/60000)} minutes after its job. Every level adds 6 minutes and a little more XP, up to 1 hour and the full reward at level ${HAND_FULL_LEVEL}.</p>`;
 }
 function bindRoundStrip(root){root.querySelectorAll('[data-round-station]').forEach(b=>b.onclick=()=>open(b.dataset.roundStation));}
 // What a hub card says: what is happening at that stop right now, in one line.
 function stopStatus(s){
  if(s.job)return {text:`Working · ${s.job.done.length} / 3`,kind:'working'};
  if(s.remaining)return {text:`Back in ${formatDuration(s.remaining)}`,kind:'locked'};
  return {text:'Ready',kind:'available'};
 }
 const rewardChips=s=>`<span class="activity-chip">${art('xp')}+${s.xp} XP</span>${s.item?`<span class="activity-chip">${art(s.item)}${s.itemCount??1} ${ITEMS[s.item].name}</span>`:''}`;
 // The next stop of the round after this one: one that still counts and can be done now, else one that still counts.
 function nextStop(from){
  const all=statuses(),after=[...all.slice(order.indexOf(from)+1),...all.slice(0,order.indexOf(from))];
  return after.find(s=>!s.inRound&&!s.remaining)??after.find(s=>!s.inRound)??after.find(s=>!s.remaining)??null;
 }
 function open(id){
  if(!featureUnlocked(state,'activities')){notify(featureUnlockHint('activities'));return false;}if(!Object.hasOwn(ACTIVE_STATIONS,id))return false;
  selected=id;feedback='';result=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();dialog.showModal();
  // A stop that is ready starts its job straight away: no separate "Start" step.
  const s=activityStatus(state,id,farmNow());if(!s.job&&!s.remaining)void act({type:'activity_start',station:id});
  return true;
 }
 // The four stops at a glance, in a clean 2x2 grid (reuses the Buildings catalog's own card style). Tap one to open its job.
 function openHub(){
  if(!featureUnlocked(state,'activities')){notify(featureUnlockHint('activities'));return false;}
  selected=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());renderHub();hubDialog.showModal();return true;
 }
 function renderHub(){
  const all=statuses(),round=state.activities?.round??[];
  $('activities-hub-round').innerHTML=roundStrip(all,round)+growRule();bindRoundStrip($('activities-hub-round'));
  // Each card: the picture (with the round's checkmark on its corner when that stop already counts), the reward, and one pill that
  // says what tapping it now does. The checkmark stays on the picture, apart from the pill, so a card never reads as done and ready at once.
  $('activities-hub-grid').innerHTML=all.map(s=>{const status=stopStatus(s);return `<button class="building-card activity-stop is-${status.kind}" data-open-station="${s.station}"><span class="activity-stop-art">${art(`activity-${s.station}`)}${s.inRound?'<i data-lucide="check" class="round-tick" data-line-icon aria-hidden="true"></i>':''}</span><span class="building-card-info"><strong>${s.name}</strong><span class="activity-chips">${rewardChips(s)}</span><span class="building-status ${status.kind}">${status.text}</span>${s.job?`<span class="activity-stop-bar" aria-hidden="true"><i style="width:${Math.round(s.job.done.length/3*100)}%"></i></span>`:''}</span><i data-lucide="chevron-right"></i></button>`;}).join('');
  $('activities-hub-grid').querySelectorAll('[data-open-station]').forEach(b=>b.onclick=()=>open(b.dataset.openStation));
  lastSignature=signature();refreshArt();
 }
 function render(){
  if(!selected)return;
  const all=statuses(),round=state.activities?.round??[],s=all.find(s=>s.station===selected),panel=$('activity-work');
  $('activities-title').textContent=s.name;
  $('activity-icon').innerHTML=art(`activity-${s.station}`);
  $('activity-round').innerHTML=roundStrip(all,round,!!result?.roundComplete);bindRoundStrip($('activity-round'));
  const next=nextStop(s.station);
  const nav=`<div class="activity-nav"><button type="button" class="small-button" data-activity-hub>‹ All stops</button>${next?`<button type="button" class="primary-button" data-activity-next="${next.station}">Next stop: ${next.name} ›</button>`:''}</div>`;
  let body;
  if(result){
   // The job is done: what it paid, the round bonus when this was the fourth stop, and where to go next. What it paid, at the level
   // the farm had when the job finished (a level-up on the way would show the next level's amounts).
   body=`<div class="activity-result${result.roundComplete?' is-round':''}"><strong>${result.roundComplete?'Round complete!':'Job complete!'}</strong><div class="activity-chips">${rewardChips({...s,xp:result.xp})}${result.roundComplete?`<span class="activity-chip is-bonus">Round bonus: +${result.bonus.coins} coins · +${result.bonus.xp} XP</span>`:''}</div></div>${nav}`;
  }else if(s.job){
   const dots=[0,1,2].map(i=>`<i class="${i<s.job.done.length?'is-done':''}"></i>`).join('');
   body=`<div class="activity-job-progress"><span class="activity-dots" aria-hidden="true">${dots}</span><span>${s.job.done.length} of 3 done</span></div><div class="activity-board" aria-label="${s.instruction}">${Array.from({length:6},(_,id)=>{const done=s.job.done.includes(id),target=s.job.targets.includes(id);return `<button class="activity-tile ${done?'done':target?'needs-care':'healthy'}" data-activity-target="${id}" ${done||busy?'disabled':''} aria-label="${done?'Completed':target?s.task:s.other}"><i data-lucide="${done?'check':target?s.targetIcon:s.otherIcon}" data-line-icon aria-hidden="true"></i><strong>${done?'Done':target?s.target:s.other}</strong></button>`;}).join('')}</div>`;
  }else if(s.remaining){
   body=`<p class="activity-wait">This stop is back in <b data-activity-wait>${formatDuration(s.remaining)}</b>.</p>${nav}`;
  }else{
   body=busy?'<p class="activity-wait">Getting the job ready…</p>':`<button id="activity-start" class="primary-button">Start this job<i data-lucide="arrow-right"></i></button>`;
  }
  // The stop's reward line goes while a result shows (11 Oct 2026 review): the result says what the job paid, and after a level-up the
  // line would already show the next level's XP next to it (at levels 3 to 6 a round is about one level, so on most rounds).
  panel.innerHTML=`<p class="activity-instruction">${s.instruction}</p>${result?'':`<div class="activity-reward">${art('xp')}<b>+${s.xp} XP</b>${s.item?`<span>· ${art(s.item)} +${s.itemCount??1} ${ITEMS[s.item].name}</span>`:''}</div>`}${body}`;
  $('activity-start')?.addEventListener('click',()=>act({type:'activity_start',station:s.station}));
  panel.querySelectorAll('[data-activity-target]').forEach(b=>b.onclick=()=>act({type:'activity_work',station:s.station,startedAt:s.job.startedAt,target:Number(b.dataset.activityTarget)}));
  panel.querySelector('[data-activity-next]')?.addEventListener('click',e=>open(e.currentTarget.dataset.activityNext));
  panel.querySelector('[data-activity-hub]')?.addEventListener('click',openHub);
  $('activity-feedback').textContent=feedback;lastSignature=signature();refreshArt();tickButtons();
 }
 async function act(action){
  if(busy)return;busy=true;dialog.querySelectorAll('.activity-tile,#activity-start').forEach(b=>b.disabled=true);
  if(action.type==='activity_start')render();
  try{
   const paid=action.type==='activity_work'?{xp:activityStatus(state,action.station,farmNow()).xp,bonus:activityRoundReward(state)}:null;
   const outcome=await runAction(action);onResult?.(action,outcome);feedback='';
   if(outcome.finished){result={roundComplete:Boolean(outcome.roundComplete),...paid};notify(`${outcome.roundComplete?'Round complete!':'Job complete!'} +${outcome.xp} XP${outcome.item?` · +${outcome.itemCount??1} ${ITEMS[outcome.item].name}`:''}${outcome.roundComplete?` · +${paid.bonus.coins} coins`:''}`);}
  }catch(e){feedback=e.message;}
  finally{busy=false;render();refresh();}
 }
 // A tile is open again the moment its tap is shown (13 Oct 2026): no wait on the job's old nextAt, so the three taps follow each other at once.
 function tickButtons(){
  if(!selected)return;const s=activityStatus(state,selected,farmNow());
  document.querySelectorAll('[data-activity-target]').forEach(b=>b.disabled=busy||!s.job||s.job.done.includes(Number(b.dataset.activityTarget)));
  const wait=dialog.querySelector('[data-activity-wait]');if(wait&&s.remaining)wait.textContent=formatDuration(s.remaining);
 }
 function refresh(){if(dialog.open&&!busy)render();else if(hubDialog.open)renderHub();}
 function tick(){
  if(busy)return;
  if(dialog.open){if(signature()!==lastSignature&&!result){render();return;}tickButtons();return;}
  if(hubDialog.open&&signature()!==lastSignature)renderHub();
 }
 return {open,openHub,refresh,tick};
}
