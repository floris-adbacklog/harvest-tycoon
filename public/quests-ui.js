import {QUESTS,VILLAGE_QUESTS,questXp,levelOf,guidedFarm,availableDaily,worldTwoOpen} from './farm-state.js';
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

// World II's quests (30 Sep 2026): those open at the farmer's level, and every one already claimed.
export function villageQuestGroups(state){
 const groups={ready:[],active:[],done:[]},claimed=state.villageQuests??[],level=levelOf(state);
 VILLAGE_QUESTS.forEach((quest,id)=>{
  if(!claimed.includes(id)&&level<quest.minLevel)return;
  const value=Math.min(quest.target,Number(state.stats[quest.stat])||0);
  groups[claimed.includes(id)?'done':value>=quest.target?'ready':'active'].push({id,quest,value});
 });
 // By the level they open (Oct 2026): the market square's quests come last in the list but open at 100, with the first ones.
 groups.active.sort((a,b)=>a.quest.minLevel-b.quest.minLevel||a.id-b.id);
 return groups;
}
export const villageQuestReady=state=>worldTwoOpen(state)&&villageQuestGroups(state).ready.length>0;

// One picture per quest, from what it counts: the crop or good itself, the building, or the farm job.
const QUEST_ART={village_batches:'mine',village_sold:'villagemarket',village_requests:'villagemarket',village_earned:'coins',beyond_upgrades:'mastertools',coins_spent:'coins',diamonds_spent:'diamonds',harvested:'harvest',planted:'seeds',varieties:'seeds',watered:'water',tended:'care',fertilized:'fertilizer',earned:'coins',passive_earned:'stall',sold:'market',produced:'buildings',parallel_batches:'buildings',bread:'bread',upgrades:'hammer',windmill_upgrades:'windmill',windmill_batches:'windmill',silo_upgrades:'silo',expansions:'estate',projects:'estate',deliveries:'cart',crafted_deliveries:'cart',honey_deliveries:'honey',tractor:'tractor',dailies:'gift',glasshouse_batches:'glasshouse',valley_baskets:'valley-market',ranch_focus:'ranch',improvements:'estate-workshop',depot_shipments:'trade-depot',depot_loaded:'trade-depot',depot_coins:'trade-depot',valley_coins:'valley-market',fair_entries:'grand-fair',fair_stars:'grand-fair',fair_champion:'grand-fair',chores:'chores',mastery_medals:'trophy',diamonds_earned:'diamonds',boosts_used:'boost',activities:'helping-hand',activity_rounds:'helping-hand'};
export function questArt(stat){
 const [, kind, key]=stat.match(/^(made|harvest|built|activity|chore|sold)_(.+)$/)??[];
 const pick=QUEST_ART[stat]??(kind==='activity'?`activity-${key}`:kind==='chore'?`chore-${key}`:key);
 return art(pick)||art('quests');
}
const number=n=>Number(n).toLocaleString('en-US');

// village: the game shows the village (World II), where Your quests opens on the village's quests. From level 100 a Farm / Village
// switch shows either list; below it there is only the farm's.
export function createQuestsUI({state,claim,claimVillage,icons,notify,village=false,document:doc=globalThis.document}){
 const dialog=doc.getElementById('tasks-dialog'),list=doc.getElementById('task-list');
 let showDone=false,world=village?'village':'farm';
 const toolbar=doc.createElement('div');toolbar.className='quest-toolbar';
 toolbar.innerHTML='<div class="market-tabs quest-worlds" role="group" aria-label="Quests for" hidden><button data-quest-world="farm" aria-pressed="true">Farm</button><button data-quest-world="village" aria-pressed="false">Village</button></div><div id="quest-summary" role="status"></div>';
 list.before(toolbar);
 function row({id,quest:q,value},group){
  const xp=questXp(q),rewards=`<span class="quest-rewards"><b>${art('coins')}${number(q.reward)}</b>${xp?`<b class="is-xp">${art('xp')}${xp} XP</b>`:''}</span>`;
  const end=group==='ready'?`<button class="primary-button" data-claim="${id}">Claim</button>`:group==='done'?'<span class="quest-state">Completed ✓</span>':'';
  return `<article class="task-row quest-item is-${group}"><span class="quest-art">${questArt(q.stat)}</span><div class="quest-body"><div class="quest-row-heading"><h3>${q.title}</h3></div><p>${q.description}</p>${group==='done'?'':`<div class="quest-meter"><progress value="${value}" max="${q.target}" aria-label="${q.title} progress"></progress><span>${number(value)} / ${number(q.target)}</span></div>`}<div class="task-bottom">${rewards}${end}</div></div></article>`;
 }
 function render(){
  const both=worldTwoOpen(state);if(!both)world='farm';
  const villageList=world==='village',groups=villageList?villageQuestGroups(state):questGroups(state),done=groups.done.length,all=villageList?VILLAGE_QUESTS.length:QUESTS.length;
  const worlds=toolbar.querySelector('.quest-worlds');if(worlds){worlds.hidden=!both;worlds.querySelectorAll('[data-quest-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.questWorld===world)));}
  toolbar.querySelector('#quest-summary').innerHTML=`${art(villageList?'village-badge':'quests')}<span><strong>${villageList?`${done} of ${all} village quests done`:`${done} of ${all} quests done`}</strong><progress max="${all}" value="${done}" aria-label="Quests completed"></progress></span>`;
  // One list, no tabs (30 Sep 2026): what you can claim comes first, then what is in progress; completed quests fold away at the
  // end. Every reward is claimed on its own, one tap per quest: that is the satisfying part.
  const open=[...groups.ready.map(entry=>row(entry,'ready')),...groups.active.map(entry=>row(entry,'active'))].join('');
  const toggle=done?`<button type="button" class="secondary-button quest-done-toggle" data-quest-done aria-expanded="${showDone}">${showDone?'Hide completed':`Show completed (${done})`}</button>`:'';
  list.innerHTML=(open||`<div class="quest-empty">${art('trophy')}<h3>All caught up!</h3><p>New quests arrive as your farm grows.</p></div>`)+toggle+(showDone?groups.done.map(entry=>row(entry,'done')).join(''):'');
  icons();
 }
 function open(){
  world=village&&worldTwoOpen(state)?'village':'farm';
  showDone=false;
  doc.querySelectorAll('dialog[open]').forEach(other=>{if(other!==dialog)other.close();});
  render();if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  dialog.querySelector('.close-dialog')?.focus({preventScroll:true});
 }
 toolbar.addEventListener('click',event=>{
  const switcher=event.target.closest('[data-quest-world]');
  if(switcher){world=switcher.dataset.questWorld;showDone=false;render();}
 });
 list.addEventListener('click',async event=>{
  if(event.target.closest('[data-quest-done]')){showDone=!showDone;render();return;}
  const button=event.target.closest('[data-claim]');if(!button||button.disabled)return;
  button.disabled=true;await (world==='village'?claimVillage:claim)(Number(button.dataset.claim));render();
  (list.querySelector('[data-claim]')??dialog.querySelector('.close-dialog'))?.focus({preventScroll:true});
 });
 // One direct path for desktop and mobile; there is no nested quest popover on phones.
 doc.getElementById('tasks-button').addEventListener('click',open);
 return {open,refresh(){if(dialog.open)render();}};
}
