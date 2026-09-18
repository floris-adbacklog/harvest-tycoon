import {ACTIVE_STATIONS,ACTIVITY_ROUND_REWARD,activityStatus,ITEMS,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {refreshArt,art} from './visual-icons.js';
const $=id=>document.getElementById(id);
export function createActivitiesUI({state,runAction,notify,onResult}){
 let selected=null,busy=false,lastSignature='',feedback='';
 const dialog=$('activities-dialog');
 function statuses(){return Object.keys(ACTIVE_STATIONS).map(id=>activityStatus(state,id,farmNow()));}
 function signature(){return statuses().map(s=>`${s.station}:${!!s.job}:${s.job?.done.length}:${s.remaining>0}`).join('|');}
 function open(id){if(!Object.hasOwn(ACTIVE_STATIONS,id))return false;selected=id;feedback='';document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();dialog.showModal();return true;}
 function render(){
  if(!selected)return;
  const all=statuses(),round=state.activities?.round??[],s=all.find(s=>s.station===selected),panel=$('activity-work');
  $('activities-title').textContent=s.name;
  $('activity-icon').innerHTML=`<i data-lucide="${s.icon}" data-line-icon aria-hidden="true"></i>`;
  $('activity-round').innerHTML=`<div class="activity-round-heading"><strong>Your farm round</strong><b>${round.length} / 4</b></div><div class="activity-round-stops" aria-label="Stops completed">${all.map(stop=>`<span class="round-stop ${stop.inRound?'complete':''}" role="img" aria-label="${stop.name}: ${stop.inRound?'complete':'not completed'}" title="${stop.name}: ${stop.inRound?'Complete':'Not completed'}"><i data-lucide="${stop.icon}" data-line-icon aria-hidden="true"></i>${stop.inRound?'<i data-lucide="check" class="round-tick" data-line-icon aria-hidden="true"></i>':''}</span>`).join('')}<span class="round-bonus">All four stops: +${ACTIVITY_ROUND_REWARD.coins} coins · +${ACTIVITY_ROUND_REWARD.xp} XP</span></div>`;
  panel.innerHTML=`<p class="activity-instruction">${s.instruction}</p><div class="activity-reward">${art('coins')}<b>+${s.coins}</b><span>+${s.xp} XP${s.item?` · ${art(s.item)} +1 ${ITEMS[s.item].name}`:''}</span></div>${s.job?`<div class="activity-job-progress"><strong>Help where it is needed</strong><span>${s.job.done.length} / 3 done</span></div><div class="activity-board" aria-label="${s.instruction}">${Array.from({length:6},(_,id)=>{const done=s.job.done.includes(id),target=s.job.targets.includes(id);return `<button class="activity-tile ${done?'done':target?'needs-care':'healthy'}" data-activity-target="${id}" ${done||busy?'disabled':''} aria-label="${done?'Completed':target?s.verb+' '+s.target.toLowerCase():s.other}"><i data-lucide="${done?'check':target?s.targetIcon:s.otherIcon}" data-line-icon aria-hidden="true"></i><strong>${done?'Done':target?s.target:s.other}</strong><small>${done?'Nice work':target?s.verb:'Leave as it is'}</small></button>`;}).join('')}</div><p class="activity-helper">Choose the items that need attention. Your progress is kept if you leave.</p>`:`<button id="activity-start" class="primary-button" ${s.remaining||busy?'disabled':''}>${s.remaining?`Returns in ${formatDuration(s.remaining)}`:'Start this job'}<i data-lucide="arrow-right"></i></button><p class="activity-helper">Tap the other stops on your farm to lend a hand there, too.</p>`}`;
   $('activity-start')?.addEventListener('click',()=>act({type:'activity_start',station:s.station}));
   panel.querySelectorAll('[data-activity-target]').forEach(b=>b.onclick=()=>act({type:'activity_work',station:s.station,startedAt:s.job.startedAt,target:Number(b.dataset.activityTarget)}));
  $('activity-feedback').textContent=feedback;lastSignature=signature();refreshArt();tickButtons();
 }
 async function act(action){
  if(busy)return;busy=true;dialog.querySelectorAll('.activity-tile,#activity-start').forEach(b=>b.disabled=true);
  try{
   const result=await runAction(action);onResult?.(action,result);
   if(result.finished){feedback=`Job complete! +${result.coins} coins · +${result.xp} XP${result.item?` · +1 ${ITEMS[result.item].name}`:''}${result.roundComplete?' · Farm round bonus included!':''}`;notify(feedback);}
   else feedback=action.type==='activity_start'?'Choose the three items that need your help.':'Good work. Keep going!';
  }catch(e){feedback=e.message;}
  finally{busy=false;render();refresh();}
 }
 function tickButtons(){
  if(!selected)return;const s=activityStatus(state,selected,farmNow());
  document.querySelectorAll('[data-activity-target]').forEach(b=>b.disabled=busy||!s.job||s.job.done.includes(Number(b.dataset.activityTarget))||farmNow()<s.job.nextAt);
  const start=$('activity-start');if(start){start.disabled=busy||s.remaining>0;start.firstChild.textContent=s.remaining?`Returns in ${formatDuration(s.remaining)}`:'Start this job';}
 }
 function refresh(){if(dialog.open&&!busy)render();}
 function tick(){
  if(!dialog.open||busy)return;
  if(signature()!==lastSignature){render();return;}
  tickButtons();
 }
 return {open,refresh,tick};
}
