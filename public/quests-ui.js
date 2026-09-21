import {QUESTS,levelOf,guidedFarm,availableDaily} from './farm-state.js';
import {art} from './visual-icons.js';

export function questGroups(state){
 const groups={ready:[],active:[],done:[]};
 QUESTS.forEach((quest,id)=>{
  if(guidedFarm(state)&&!state.claimed.includes(id)&&!availableDaily(state,quest))return;
  const value=Math.min(quest.target,Number(state.stats[quest.stat])||0);
  const group=state.claimed.includes(id)?'done':value>=quest.target?'ready':'active';
  groups[group].push({id,quest,value});
 });
 if(!guidedFarm(state))groups.active.sort((a,b)=>Number(b.id>=41)-Number(a.id>=41));
 else groups.active=groups.active.slice(0,levelOf(state)<6?3:5);
 return groups;
}

export function createQuestsUI({state,claim,icons,document:doc=globalThis.document}){
 const dialog=doc.getElementById('tasks-dialog'),list=doc.getElementById('task-list');
 let filter='active';
 const toolbar=doc.createElement('div');toolbar.className='quest-toolbar';
 toolbar.innerHTML='<p id="quest-summary" role="status"></p><div class="market-tabs quest-filters" role="group" aria-label="Quest status"><button data-quest-filter="ready" aria-pressed="false">Ready <span>0</span></button><button data-quest-filter="active" aria-pressed="true">In progress <span>0</span></button><button data-quest-filter="done" aria-pressed="false">Completed <span>0</span></button></div>';
 list.before(toolbar);
 function render(){
  const groups=questGroups(state);
  toolbar.querySelector('#quest-summary').textContent=`${groups.done.length} of ${QUESTS.length} completed · ${groups.ready.length} rewards ready`;
  toolbar.querySelectorAll('[data-quest-filter]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.questFilter===filter));
   button.querySelector('span').textContent=groups[button.dataset.questFilter].length;
  });
  list.innerHTML=groups[filter].map(({id,quest:q,value})=>`<article class="task-row ${filter==='done'?'completed':''}"><div class="quest-row-heading"><h3>${q.title}</h3>${id>=41?'<span class="beta-badge">New</span>':''}</div><p>${q.description}</p><progress value="${value}" max="${q.target}" aria-label="${q.title} progress"></progress><div class="task-bottom"><span>${value} / ${q.target}<strong class="coin-reward">${art('coins')}${q.reward} coins</strong></span>${filter==='ready'?`<button class="primary-button" data-claim="${id}">Claim reward</button>`:`<span class="quest-state">${filter==='done'?'Completed ✓':'In progress'}</span>`}</div></article>`).join('')||`<div class="quest-empty"><i data-lucide="clipboard-check"></i><h3>${filter==='ready'?'No rewards waiting':filter==='done'?'Your journey starts here':'All caught up!'}</h3><p>${filter==='ready'?'Open In progress to find your next goal.':filter==='done'?'Complete a quest, then claim its reward here.':'New milestones will arrive as the farm grows.'}</p></div>`;
  icons();
 }
 function open(){
  filter=questGroups(state).ready.length?'ready':'active';
  doc.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});
  render();if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  dialog.querySelector('.close-dialog')?.focus({preventScroll:true});
 }
 toolbar.addEventListener('click',event=>{
  const button=event.target.closest('[data-quest-filter]');if(!button)return;
  filter=button.dataset.questFilter;render();
 });
 list.addEventListener('click',async event=>{
  const button=event.target.closest('[data-claim]');if(!button||button.disabled)return;
  button.disabled=true;await claim(Number(button.dataset.claim));render();
  (list.querySelector('[data-claim]')??toolbar.querySelector(`[data-quest-filter="${filter}"]`))?.focus({preventScroll:true});
 });
 // One direct path for desktop and mobile; there is no nested quest popover on phones.
 doc.getElementById('tasks-button').addEventListener('click',open);
 return {open,refresh(){if(dialog.open)render();}};
}
