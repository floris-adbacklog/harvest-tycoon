import {ACTIVE_STATIONS,ACTIVITY_ROUND_REWARD,activityStatus,ITEMS,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {refreshArt,art} from './visual-icons.js';
const $=id=>document.getElementById(id);
export function createActivitiesUI({state,runAction,notify,onFind,onResult}){
 let selected=null,busy=false,lastSignature='',feedback='';
 const dialog=$('activities-dialog');
 function statuses(){return Object.keys(ACTIVE_STATIONS).map(id=>activityStatus(state,id,farmNow()));}
 function signature(){return statuses().map(s=>`${s.station}:${!!s.job}:${s.job?.done.length}:${s.remaining>0}`).join('|');}
 function open(id=null){selected=id;feedback='';document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();dialog.showModal();}
 function render(){
  const all=statuses(),round=state.activities?.round??[];
  $('activity-round').innerHTML=`<div><strong>Your farm round</strong><span>Help at all four stops for +${ACTIVITY_ROUND_REWARD.coins} coins and +${ACTIVITY_ROUND_REWARD.xp} XP.</span></div><b>${round.length} / 4</b><progress value="${round.length}" max="4" aria-label="Farm round progress"></progress>`;
  $('activity-stations').innerHTML=all.map(s=>`<button class="activity-station ${selected===s.station?'selected':''}" data-station="${s.station}" aria-pressed="${selected===s.station}"><i data-lucide="${s.icon}"></i><span><strong>${s.name}</strong><small data-station-clock="${s.station}">${s.job?`In progress · ${s.job.done.length}/3`:s.remaining?`Returns in ${formatDuration(s.remaining)}`:s.inRound?'Ready again · Round stop complete':'Ready to help'}</small></span>${s.inRound?'<i data-lucide="check" class="round-check"></i>':''}</button>`).join('');
  document.querySelectorAll('[data-station]').forEach(b=>b.onclick=()=>{selected=b.dataset.station;feedback='';render();});
  const s=selected?all.find(s=>s.station===selected):null;
  const panel=$('activity-work');
  if(!s){panel.innerHTML='<p class="activity-intro">Pick a stop to lend a hand. Find the right items, finish the job and earn a little extra while your crops grow. Each job returns in 3–4 minutes.</p>';}
  else{
   panel.innerHTML=`<div class="activity-heading"><div><span class="eyebrow">${s.job?'HANDS ON · '+s.job.done.length+' / 3 DONE':'A LITTLE HELP GOES A LONG WAY'}</span><h3>${s.name}</h3></div><button class="small-button" id="activity-find">Find on farm<i data-lucide="locate-fixed"></i></button></div><p class="activity-instruction">${s.instruction}</p><div class="activity-reward">${art('coins')}<b>+${s.coins}</b><span>+${s.xp} XP${s.item?` · +1 ${ITEMS[s.item].name}`:''}</span></div>${s.job?`<div class="activity-board" aria-label="${s.instruction}">${Array.from({length:6},(_,id)=>{const done=s.job.done.includes(id),target=s.job.targets.includes(id);return `<button class="activity-tile ${done?'done':target?'needs-care':'healthy'}" data-activity-target="${id}" ${done||busy?'disabled':''} aria-label="${done?'Completed':target?s.verb+' '+s.target.toLowerCase():s.other}"><i data-lucide="${done?'check':target?s.targetIcon:s.otherIcon}"></i><strong>${done?'Done':target?s.target:s.other}</strong><small>${done?'Nice work':target?s.verb:'Leave as it is'}</small></button>`;}).join('')}</div><p class="activity-helper">Choose the items that need attention. Your progress is kept if you leave.</p>`:`<button id="activity-start" class="primary-button" ${s.remaining||busy?'disabled':''}>${s.remaining?`Returns in ${formatDuration(s.remaining)}`:'Start this job'}<i data-lucide="arrow-right"></i></button>`}`;
   $('activity-find').onclick=()=>{dialog.close();onFind(s.station);notify(`Tap the ${s.name.toLowerCase()} to continue your job.`);};
   $('activity-start')?.addEventListener('click',()=>act({type:'activity_start',station:s.station}));
   panel.querySelectorAll('[data-activity-target]').forEach(b=>b.onclick=()=>act({type:'activity_work',station:s.station,startedAt:s.job.startedAt,target:Number(b.dataset.activityTarget)}));
  }
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
 function refresh(){
  const available=statuses().filter(s=>s.job||!s.remaining).length;
  $('activities-count').textContent=available?`${available} ready`:'All done';
  $('activities-button').setAttribute('aria-label',`Farm activities, ${available} jobs available`);
  if(dialog.open&&!busy)render();
 }
 function tick(){
  const all=statuses(),available=all.filter(s=>s.job||!s.remaining).length;
  $('activities-count').textContent=available?`${available} ready`:'All done';
  if(!dialog.open||busy)return;
  if(signature()!==lastSignature){render();return;}
  all.forEach(s=>{const el=document.querySelector(`[data-station-clock="${s.station}"]`);if(el&&s.remaining)el.textContent=`Returns in ${formatDuration(s.remaining)}`;});tickButtons();
 }
 $('activities-button').onclick=()=>open();
 document.querySelectorAll('[data-open-activities]').forEach(b=>b.onclick=()=>open());
 return {open,refresh,tick};
}
