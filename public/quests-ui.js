import {QUESTS,QUEST_XP,levelOf,guidedFarm,availableDaily} from './farm-state.js';
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
 else groups.active=groups.active.sort((a,b)=>a.quest.reward-b.quest.reward||a.id-b.id).slice(0,levelOf(state)<6?3:5);   // the quickest wins first
 return groups;
}

// One picture per quest, from what it counts: the crop or good itself, the building, or the farm job.
const QUEST_ART={harvested:'harvest',planted:'seeds',varieties:'seeds',watered:'water',tended:'care',fertilized:'fertilizer',earned:'coins',passive_earned:'stall',sold:'market',produced:'buildings',parallel_batches:'buildings',bread:'bread',upgrades:'hammer',windmill_upgrades:'windmill',windmill_batches:'windmill',silo_upgrades:'silo',expansions:'estate',projects:'estate',deliveries:'cart',crafted_deliveries:'cart',honey_deliveries:'honey',tractor:'tractor',dailies:'gift',chores:'chores',mastery_medals:'trophy',diamonds_earned:'diamonds',boosts_used:'boost',activities:'helping-hand',activity_rounds:'helping-hand'};
export function questArt(stat){
 const [, kind, key]=stat.match(/^(made|harvest|built|activity|chore)_(.+)$/)??[];
 const pick=QUEST_ART[stat]??(kind==='activity'?`activity-${key}`:kind==='chore'?`chore-${key}`:key);
 return art(pick)||art('quests');
}
const number=n=>Number(n).toLocaleString('en-US');

export function createQuestsUI({state,claim,icons,notify,document:doc=globalThis.document}){
 const dialog=doc.getElementById('tasks-dialog'),list=doc.getElementById('task-list');
 let filter='active';
 const toolbar=doc.createElement('div');toolbar.className='quest-toolbar';
 toolbar.innerHTML='<div id="quest-summary" role="status"></div><div class="market-tabs quest-filters" role="group" aria-label="Quest status"><button data-quest-filter="ready" aria-pressed="false">Ready <span>0</span></button><button data-quest-filter="active" aria-pressed="true">In progress <span>0</span></button><button data-quest-filter="done" aria-pressed="false">Completed <span>0</span></button></div>';
 list.before(toolbar);
 function row({id,quest:q,value},group){
  const xp=q.xp??QUEST_XP,rewards=`<span class="quest-rewards"><b>${art('coins')}${number(q.reward)}</b>${xp?`<b class="is-xp">${art('xp')}${xp} XP</b>`:''}</span>`;
  const end=group==='ready'?`<button class="primary-button" data-claim="${id}">Claim</button>`:group==='done'?'<span class="quest-state">Completed ✓</span>':'';
  return `<article class="task-row quest-item is-${group}"><span class="quest-art">${questArt(q.stat)}</span><div class="quest-body"><div class="quest-row-heading"><h3>${q.title}</h3></div><p>${q.description}</p>${group==='done'?'':`<div class="quest-meter"><progress value="${value}" max="${q.target}" aria-label="${q.title} progress"></progress><span>${number(value)} / ${number(q.target)}</span></div>`}<div class="task-bottom">${rewards}${end}</div></div></article>`;
 }
 function render(){
  const groups=questGroups(state),done=groups.done.length;
  toolbar.querySelector('#quest-summary').innerHTML=`${art('quests')}<span><strong>${done} of ${QUESTS.length} quests done</strong><progress max="${QUESTS.length}" value="${done}" aria-label="Quests completed"></progress></span>`;
  toolbar.querySelectorAll('[data-quest-filter]').forEach(button=>{
   button.setAttribute('aria-pressed',String(button.dataset.questFilter===filter));
   button.querySelector('span').textContent=groups[button.dataset.questFilter].length;
  });
  // Several rewards waiting: one button collects them all, with the total on it.
  const ready=groups.ready,total=ready.reduce((sum,{quest:q})=>({coins:sum.coins+q.reward,xp:sum.xp+(q.xp??QUEST_XP)}),{coins:0,xp:0});
  const claimAll=filter==='ready'&&ready.length>1?`<div class="quest-claim-all"><span><strong>${ready.length} rewards ready</strong><span class="quest-rewards"><b>${art('coins')}${number(total.coins)}</b>${total.xp?`<b class="is-xp">${art('xp')}${number(total.xp)} XP</b>`:''}</span></span><button class="primary-button" data-claim-all>Claim all</button></div>`:'';
  list.innerHTML=claimAll+(groups[filter].map(entry=>row(entry,filter)).join('')||`<div class="quest-empty">${art(filter==='done'?'trophy':'quests')}<h3>${filter==='ready'?'No rewards waiting':filter==='done'?'Your journey starts here':'All caught up!'}</h3><p>${filter==='ready'?'Finish a quest in progress to claim it here.':filter==='done'?'Claimed quests are kept here.':'New quests arrive as your farm grows.'}</p></div>`);
  icons();
 }
 async function claimAll(button){
  // Keep going while rewards are ready: on a guided farm a claim can reveal a next quest that is already done.
  let coins=0,xp=0,claimed=0,next;
  button.disabled=true;
  while((next=questGroups(state).ready[0])&&claimed<QUESTS.length){
   button.textContent=`Claiming ${claimed+1}…`;
   const result=await claim(next.id,{quiet:true});
   if(!result||result.error)break;
   coins+=result.coins??0;xp+=result.xp??0;claimed++;
  }
  if(claimed)notify?.(`${claimed} quest${claimed===1?'':'s'} complete! +${number(coins)} coins${xp?` and +${number(xp)} XP`:''}.`);
  render();
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
  const all=event.target.closest('[data-claim-all]');if(all&&!all.disabled){await claimAll(all);return;}
  const button=event.target.closest('[data-claim]');if(!button||button.disabled)return;
  button.disabled=true;await claim(Number(button.dataset.claim));render();
  (list.querySelector('[data-claim]')??toolbar.querySelector(`[data-quest-filter="${filter}"]`))?.focus({preventScroll:true});
 });
 // One direct path for desktop and mobile; there is no nested quest popover on phones.
 doc.getElementById('tasks-button').addEventListener('click',open);
 return {open,refresh(){if(dialog.open)render();}};
}
