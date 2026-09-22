import {featureUnlocked,featureUnlockHint,ACTIVE_STATIONS,ACTIVITY_ROUND_REWARD,activityStatus,ITEMS,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {refreshArt,art} from './visual-icons.js';
const $=id=>document.getElementById(id);
export function createActivitiesUI({state,runAction,notify,onResult}){
 let selected=null,busy=false,lastSignature='',feedback='';
 const dialog=$('activities-dialog'),hubDialog=$('activities-hub-dialog');
 function statuses(){return Object.keys(ACTIVE_STATIONS).map(id=>activityStatus(state,id,farmNow()));}
 function signature(){return statuses().map(s=>`${s.station}:${!!s.job}:${s.job?.done.length}:${s.remaining>0}`).join('|');}
 // Shared by the hub grid and the station dialog: every stop, clickable to jump straight there (except the one already open).
 function roundStrip(all,round){
  return `<div class="activity-round-heading"><strong>Your farm round</strong><b>${round.length} / 4</b></div><div class="activity-round-stops" aria-label="Stops completed">${all.map(stop=>`<button type="button" class="round-stop ${stop.inRound?'complete':''}" data-round-station="${stop.station}" ${stop.station===selected?'disabled':''} aria-label="${stop.name}: ${stop.inRound?'complete':'not completed'}" title="${stop.name} · ${stop.inRound?'Complete':'Not completed'}">${art(`activity-${stop.station}`)}${stop.inRound?'<i data-lucide="check" class="round-tick" data-line-icon aria-hidden="true"></i>':''}</button>`).join('')}<span class="round-bonus">All four stops: +${ACTIVITY_ROUND_REWARD.coins} coins · +${ACTIVITY_ROUND_REWARD.xp} XP</span></div>`;
 }
 function bindRoundStrip(root){root.querySelectorAll('[data-round-station]').forEach(b=>b.onclick=()=>open(b.dataset.roundStation));}
 // What a hub card says: what is happening at that stop right now, in one line.
 function stopStatus(s){
  if(s.job)return {text:`Working · ${s.job.done.length} / 3 done`,kind:'working'};
  if(s.remaining)return {text:`Returns in ${formatDuration(s.remaining)}`,kind:'locked'};
  return {text:'Ready to help',kind:'available'};
 }
 function open(id){if(!featureUnlocked(state,'activities')){notify(featureUnlockHint('activities'));return false;}if(!Object.hasOwn(ACTIVE_STATIONS,id))return false;selected=id;feedback='';document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();dialog.showModal();return true;}
 // The four stops at a glance, in a clean 2x2 grid (reuses the Buildings catalog's own card style). Tap one to open its job.
 function openHub(){
  if(!featureUnlocked(state,'activities')){notify(featureUnlockHint('activities'));return false;}
  selected=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close());renderHub();hubDialog.showModal();return true;
 }
 function renderHub(){
  const all=statuses(),round=state.activities?.round??[];
  $('activities-hub-round').innerHTML=roundStrip(all,round);bindRoundStrip($('activities-hub-round'));
  // Whether a stop already counted toward this round is the strip's job, above (its own colour and a checkmark badge); repeating that
  // here too, in front of "Ready to help", only made the pill read as if it were both done and still to do. The card just says what
  // tapping it now would start.
  $('activities-hub-grid').innerHTML=all.map(s=>{const status=stopStatus(s);return `<button class="building-card" data-open-station="${s.station}">${art(`activity-${s.station}`)}<span class="building-card-info"><strong>${s.name}</strong><span class="building-status ${status.kind}">${status.text}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('');
  $('activities-hub-grid').querySelectorAll('[data-open-station]').forEach(b=>b.onclick=()=>open(b.dataset.openStation));
  lastSignature=signature();refreshArt();
 }
 function render(){
  if(!selected)return;
  const all=statuses(),round=state.activities?.round??[],s=all.find(s=>s.station===selected),panel=$('activity-work');
  $('activities-title').textContent=s.name;
  $('activity-icon').innerHTML=art(`activity-${s.station}`);
  $('activity-round').innerHTML=roundStrip(all,round);bindRoundStrip($('activity-round'));
  panel.innerHTML=`<p class="activity-instruction">${s.instruction}</p><div class="activity-reward">${art('xp')}<b>+${s.xp} XP</b>${s.item?`<span>· ${art(s.item)} +${s.itemCount??1} ${ITEMS[s.item].name}</span>`:''}</div>${s.job?`<div class="activity-job-progress"><strong>Help where it is needed</strong><span>${s.job.done.length} / 3 done</span></div><div class="activity-board" aria-label="${s.instruction}">${Array.from({length:6},(_,id)=>{const done=s.job.done.includes(id),target=s.job.targets.includes(id);return `<button class="activity-tile ${done?'done':target?'needs-care':'healthy'}" data-activity-target="${id}" ${done||busy?'disabled':''} aria-label="${done?'Completed':target?s.verb+' '+s.target.toLowerCase():s.other}"><i data-lucide="${done?'check':target?s.targetIcon:s.otherIcon}" data-line-icon aria-hidden="true"></i><strong>${done?'Done':target?s.target:s.other}</strong><small>${done?'Nice work':target?s.verb:'Leave as it is'}</small></button>`;}).join('')}</div><p class="activity-helper">Choose the items that need attention. Your progress is kept if you leave.</p>`:`<button id="activity-start" class="primary-button" ${s.remaining||busy?'disabled':''}>${s.remaining?`Returns in ${formatDuration(s.remaining)}`:'Start this job'}<i data-lucide="arrow-right"></i></button><p class="activity-helper">Tap another stop above to lend a hand there, too.</p>`}`;
   $('activity-start')?.addEventListener('click',()=>act({type:'activity_start',station:s.station}));
   panel.querySelectorAll('[data-activity-target]').forEach(b=>b.onclick=()=>act({type:'activity_work',station:s.station,startedAt:s.job.startedAt,target:Number(b.dataset.activityTarget)}));
  $('activity-feedback').textContent=feedback;lastSignature=signature();refreshArt();tickButtons();
 }
 async function act(action){
  if(busy)return;busy=true;dialog.querySelectorAll('.activity-tile,#activity-start').forEach(b=>b.disabled=true);
  try{
   const result=await runAction(action);onResult?.(action,result);
   if(result.finished){feedback=`Job complete! +${result.xp} XP${result.item?` · +${result.itemCount??1} ${ITEMS[result.item].name}`:''}${result.roundComplete?' · Farm round bonus included!':''}`;notify(feedback);}
   else feedback=action.type==='activity_start'?'Choose the three items that need your help.':'Good work. Keep going!';
  }catch(e){feedback=e.message;}
  finally{busy=false;render();refresh();}
 }
 function tickButtons(){
  if(!selected)return;const s=activityStatus(state,selected,farmNow());
  document.querySelectorAll('[data-activity-target]').forEach(b=>b.disabled=busy||!s.job||s.job.done.includes(Number(b.dataset.activityTarget))||farmNow()<s.job.nextAt);
  const start=$('activity-start');if(start){start.disabled=busy||s.remaining>0;start.firstChild.textContent=s.remaining?`Returns in ${formatDuration(s.remaining)}`:'Start this job';}
 }
 function refresh(){if(dialog.open&&!busy)render();else if(hubDialog.open)renderHub();}
 function tick(){
  if(busy)return;
  if(dialog.open){if(signature()!==lastSignature){render();return;}tickButtons();return;}
  if(hubDialog.open&&signature()!==lastSignature)renderHub();
 }
 return {open,openHub,refresh,tick};
}
