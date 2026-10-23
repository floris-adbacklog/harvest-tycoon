import {QUESTS,VILLAGE_QUESTS,questXp,levelOf,guidedFarm,availableDaily,questFeatureOpen,worldTwoOpen,featureUnlocked,dailyTasks,ACTIVE_STATIONS,villageQuestOpen} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art} from './visual-icons.js';

export function questGroups(state){
 const groups={ready:[],active:[],done:[]};
 // An older (legacy) farm sees every quest, but a quest of the endgame (level 90 and up) only from its own level (17 Oct 2026, with the
 // Seed Lab's quests): nothing of the endgame shows below 90, as its places and pins, and nothing of level 100 at 99.
 QUESTS.forEach((quest,id)=>{
  if(guidedFarm(state)&&!state.claimed.includes(id)&&!availableDaily(state,quest))return;
  if(!guidedFarm(state)&&!state.claimed.includes(id)&&(quest.minLevel??1)>=90&&levelOf(state)<quest.minLevel)return;
  // Nor one for a feature it has not reached the level for (19 Oct 2026: features follow the level on every farm).
  if(!guidedFarm(state)&&!state.claimed.includes(id)&&!questFeatureOpen(state,quest))return;
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
 const groups={ready:[],active:[],done:[]},claimed=state.villageQuests??[];
 VILLAGE_QUESTS.forEach((quest,id)=>{
  if(!claimed.includes(id)&&!villageQuestOpen(state,quest))return;
  const value=Math.min(quest.target,Number(state.stats[quest.stat])||0);
  groups[claimed.includes(id)?'done':value>=quest.target?'ready':'active'].push({id,quest,value});
 });
 // By the level they open (Oct 2026): the market square's quests come last in the list but open at 100, with the first ones.
 groups.active.sort((a,b)=>a.quest.minLevel-b.quest.minLevel||a.id-b.id);
 return groups;
}
export const villageQuestReady=state=>worldTwoOpen(state)&&villageQuestGroups(state).ready.length>0;
// Plan F (13 Oct 2026): the daily challenges that are done and wait in Today, one Claim each. On a phone Today sits in More, and 48% of
// the farmers who stopped at level 5 or 6 left one there: the Quests button counts them too (game.js), and its window has one line at the
// top that opens Today. They are still claimed in Today, one at a time.
export function readyDailies(state,now=farmNow()){return featureUnlocked(state,'challenges')?dailyTasks(state,now).filter(q=>!q.claimed&&q.progress>=q.target):[];}
// Plan F (13 Oct 2026): when a daily challenge waits for a helping hand stop that is resting, Today says when that stop is ready again
// ("Greenhouse ready at 14:35"): the stop it asks for, or for a round or for any jobs the first of the stops it still needs, and only when
// none of them can be done now. null when nothing waits.
export function dailyWait(state,task,now=farmNow()){
 if(task.claimed||task.progress>=task.target)return null;
 const a=state.activities??{},keys=Object.keys(ACTIVE_STATIONS),one=task.stat?.match(/^activity_(.+)$/)?.[1];
 const stops=task.stat==='activities'?keys:task.stat==='activity_rounds'?keys.filter(k=>!(a.round??[]).includes(k)):keys.includes(one)?[one]:[];
 const rest=stops.map(k=>({station:k,name:ACTIVE_STATIONS[k].name,at:a.jobs?.[k]?0:Number(a.cooldowns?.[k])||0}));
 return !rest.length||rest.some(s=>s.at<=now)?null:rest.sort((x,y)=>x.at-y.at)[0];
}

// One picture per quest, from what it counts: the crop or good itself, the building, or the farm job. The village's later quests (Oct 2026):
// the market crate, builder's crates, the town boat and the landmarks.
const QUEST_ART={fish:'fishingpond',fish_kinds:'fish-carp',fish_perfect:'fish-pike',caught_whiskers:'fish-whiskers',lake_fish:'villagelake',lake_fish_kinds:'fish-browntrout',caught_oldgranite:'fish-oldgranite',heirlooms_found:'seedlab',lab_crosses:'goldenwheat',village_batches:'mine',village_sold:'villagemarket',village_requests:'villagemarket',village_earned:'coins',beyond_upgrades:'mastertools',market_crates:'villagemarket',builder_crates_used:'builderscrate',boat_trips:'pier',village_landmarks:'landmark-greathall',coins_spent:'coins',diamonds_spent:'diamonds',harvested:'harvest',planted:'seeds',varieties:'seeds',watered:'water',tended:'care',fertilized:'fertilizer',earned:'coins',passive_earned:'stall',sold:'market',produced:'buildings',parallel_batches:'buildings',bread:'bread',upgrades:'hammer',windmill_upgrades:'windmill',windmill_batches:'windmill',silo_upgrades:'silo',expansions:'estate',projects:'estate',deliveries:'cart',crafted_deliveries:'cart',honey_deliveries:'honey',tractor:'tractor',dailies:'gift',glasshouse_batches:'glasshouse',valley_baskets:'valley-market',ranch_focus:'ranch',improvements:'estate-workshop',depot_shipments:'trade-depot',depot_loaded:'trade-depot',depot_coins:'trade-depot',valley_coins:'valley-market',fair_entries:'grand-fair',fair_stars:'grand-fair',fair_champion:'grand-fair',chores:'chores',mastery_medals:'trophy',diamonds_earned:'diamonds',boosts_used:'boost',activities:'helping-hand',activity_rounds:'helping-hand'};
export function questArt(stat){
 const [, kind, key]=stat.match(/^(made|harvest|built|activity|chore|sold)_(.+)$/)??[];
 const pick=QUEST_ART[stat]??(kind==='activity'?`activity-${key}`:kind==='chore'?`chore-${key}`:key);
 return art(pick)||art('quests');
}
const number=n=>Number(n).toLocaleString('en-US');

// village: the game shows the village (World II), where Your quests opens on the village's quests. From level 100 a Farm / Village
// switch shows either list; below it there is only the farm's.
// openToday(id) (Plan F, 13 Oct 2026): the line at the top for the daily challenges that are ready opens Today at the first of them, where
// they are claimed (review fix: at the top of Today a phone of 360x640 showed the gift and no Claim).
export function createQuestsUI({state,claim,claimVillage,icons,notify,openToday=null,village=false,document:doc=globalThis.document}){
 const dialog=doc.getElementById('tasks-dialog'),list=doc.getElementById('task-list');
 let showDone=false,world=village?'village':'farm';
 const toolbar=doc.createElement('div');toolbar.className='quest-toolbar';
 toolbar.innerHTML='<button type="button" class="quest-today-line" data-quest-today hidden></button><div class="market-tabs quest-worlds" role="group" aria-label="Quests for" hidden><button data-quest-world="farm" aria-pressed="true"><i data-game-art="farm"></i><span>Farm</span></button><button data-quest-world="village" aria-pressed="false"><i data-game-art="village-badge"></i><span>Village</span></button></div><div id="quest-summary" role="status"></div>';
 list.before(toolbar);
 // The quest card (23 Oct 2026, as the chores window): picture, title and its line, then one row with the bar and its count beside the
 // reward chips; a quest that is done has its Claim beside the card (one tap per quest, never all at once), a claimed one its tick after the chips.
 function row({id,quest:q,value},group){
  const xp=questXp(q),rewards=`<span class="quest-rewards"><b>${art('coins')}${number(q.reward)}</b>${xp?`<b class="is-xp">${art('xp')}${xp} XP</b>`:''}</span>`;
  const meter=group==='active'?`<div class="quest-meter"><progress value="${value}" max="${q.target}" aria-label="${q.title} progress"></progress><span>${number(value)} / ${number(q.target)}</span></div>`:'';
  const tick=group==='done'?'<span class="quest-state">Completed ✓</span>':'',claim=group==='ready'?`<div class="quest-act"><button class="primary-button" data-claim="${id}">Claim</button></div>`:'';
  return `<article class="task-row quest-item is-${group}"><span class="quest-art">${questArt(q.stat)}</span><div class="quest-body"><div class="quest-row-heading"><h3>${q.title}</h3></div><p>${q.description}</p><div class="task-bottom">${meter}${rewards}${tick}</div></div>${claim}</article>`;
 }
 function render(){
  const both=worldTwoOpen(state);if(!both)world='farm';
  const villageList=world==='village',groups=villageList?villageQuestGroups(state):questGroups(state),done=groups.done.length,all=villageList?VILLAGE_QUESTS.length:QUESTS.length;
  // Plan F (13 Oct 2026): the daily challenges the Quests button also counts, in one line that opens Today.
  const daily=readyDailies(state).length,line=toolbar.querySelector('[data-quest-today]');if(line)line.hidden=!daily||!openToday;
  if(line&&!line.hidden)line.innerHTML=`${art('gift')}<strong>${daily} daily challenge${daily===1?'':'s'} ready</strong><span>Today</span><i data-lucide="chevron-right"></i>`;
  const worlds=toolbar.querySelector('.quest-worlds');if(worlds){worlds.hidden=!both;worlds.querySelectorAll('[data-quest-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.questWorld===world)));}
  toolbar.querySelector('#quest-summary').innerHTML=`${art(villageList?'village-badge':'quests')}<strong>${villageList?`${done} of ${all} village quests done`:`${done} of ${all} quests done`}</strong><progress max="${all}" value="${done}" aria-label="Quests completed"></progress>`;
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
  if(event.target.closest('[data-quest-today]')){dialog.close();openToday?.(readyDailies(state)[0]?.id??null);}
 });
 list.addEventListener('click',async event=>{
  if(event.target.closest('[data-quest-done]')){showDone=!showDone;render();return;}
  const button=event.target.closest('[data-claim]');if(!button||button.disabled)return;
  button.disabled=true;await (world==='village'?claimVillage:claim)(Number(button.dataset.claim));render();
  (list.querySelector('[data-claim]')??dialog.querySelector('.close-dialog'))?.focus({preventScroll:true});
 });
 // One direct path for desktop and mobile; there is no nested quest popover on phones.
 doc.getElementById('tasks-button').addEventListener('click',open);
 // Quests straight at one quest (11 Oct 2026, Part A A13: the next-goal banner on a phone): that quest in the middle, its Claim in reach.
 function openAt(id){open();const button=list.querySelector(`[data-claim="${Number(id)}"]`);button?.closest('.task-row')?.scrollIntoView?.({block:'center'});button?.focus({preventScroll:true});}
 return {open,openAt,refresh(){if(dialog.open)render();}};
}
