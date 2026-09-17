import {CROPS,CHORES,PROJECTS,MASTERY_TIERS,masteryStatus,stallStatus,currentProject,formatDuration,cropDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const number=n=>n.toLocaleString('en-US');
export function createGrowthUI({state,runAction,onChange,notify,itemList,onPlant}){
 let tab='projects',lastReadiness='';
 function act(action,message){try{const result=runAction(action);onChange();render();$('estate-feedback').textContent=typeof message==='function'?message(result):message;notify($('estate-feedback').textContent);}catch(error){$('estate-feedback').textContent=error.message;notify(error.message);}}
 function open(section='projects'){
  tab=section;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-dialog').showModal();icons();
 }
 function render(){
  document.querySelectorAll('[data-estate-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.estateTab===tab);b.setAttribute('aria-pressed',String(b.dataset.estateTab===tab));});
  $('estate-feedback').textContent='';
  if(tab==='projects')renderProjects();if(tab==='stall')renderStall();if(tab==='chores')renderChores();if(tab==='mastery')renderMastery();
  lastReadiness=readiness();icons();
 }
 function renderProjects(){
  const p=currentProject(state),job=state.estate.job,can=state.coins>=p.coins&&state.mastery.claimed.length>=p.medals&&Object.entries(p.input).every(([k,n])=>state.inventory[k]>=n),isReady=job&&farmNow()>=job.readyAt;
  const steps=PROJECTS.map((project,i)=>`<div class="estate-step ${i<state.estate.completed?'finished':i===state.estate.completed?'current':''}"><span><i data-lucide="${i<state.estate.completed?'check':i===state.estate.completed?'flag':'lock-keyhole'}"></i></span><div><strong>${project.name}</strong><small>${i<state.estate.completed?'Established':`${formatDuration(project.duration)} construction · ${project.medals} medals`}</small></div></div>`).join('');
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="landmark"></i></span><div><h3>Grow something that lasts</h3><p>Six chapters, then ongoing commissions. Each completed project adds <b>6 coins/hour</b> to your farm stall.</p></div></div><section class="project-focus"><div class="project-kicker">${state.estate.completed<PROJECTS.length?`CHAPTER ${state.estate.completed+1} / 6`:'ONGOING ESTATE COMMISSIONS'}<span>+${number(p.xp)} XP</span></div><h3>${p.name}</h3><p>${p.description}</p>${job?`<div class="project-building"><div><i data-lucide="${isReady?'circle-check':'hammer'}"></i><strong id="project-clock">${isReady?'Ready to open':`${formatDuration(job.readyAt-farmNow())} remaining`}</strong></div><progress id="project-progress" max="100" value="${Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100)}" aria-label="Construction progress"></progress><p>Your other fields, buildings and farm chores stay available during construction.</p><button class="primary-button" id="project-complete" ${isReady?'':'disabled'}>${isReady?'Celebrate & unlock the next chapter':'Construction in progress'}<i data-lucide="flag"></i></button></div>`:`<div class="project-requirements"><span class="${state.coins>=p.coins?'met':''}"><i data-lucide="coins"></i> ${number(p.coins)} coins</span><span class="${state.mastery.claimed.length>=p.medals?'met':''}"><i data-lucide="medal"></i> ${state.mastery.claimed.length} / ${p.medals} mastery medals</span><span><i data-lucide="clock-3"></i> ${formatDuration(p.duration)}</span></div><div class="ingredients project-goods">${itemList(p.input,true)}</div><button class="primary-button" id="project-start" ${can?'':'disabled'}>Fund & start construction<i data-lucide="hammer"></i></button><small class="project-note">Coins and goods are spent when construction starts. Medals are kept.</small>`}</section><div class="recipe-section-heading"><h3>The road ahead</h3><span>${Math.min(state.estate.completed,6)} / 6 chapters complete</span></div><div class="estate-roadmap">${steps}<div class="estate-step ${state.estate.completed>=6?'current':''}"><span><i data-lucide="infinity"></i></span><div><strong>Estate commissions</strong><small>Repeatable three-day projects with growing goals</small></div></div></div>`;
  $('project-start')?.addEventListener('click',()=>act({type:'project_start'},r=>`${r.name} is under construction. There is plenty to do while it grows.`));
  $('project-complete')?.addEventListener('click',()=>act({type:'project_collect'},r=>`${r.name} established! +${number(r.xp)} XP and +6 coins/hour at your stall.`));
 }
 function renderStall(){
  const s=stallStatus(state,farmNow());
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="store"></i></span><div><h3>A little income while you’re away</h3><p>Your farm stall earns coins automatically. Plant longer crops before you leave, then return to collect both.</p></div></div><section class="stall-bank"><span>Waiting at your farm stall</span><strong id="stall-balance">${number(s.available)}<small>coins</small></strong><div class="stall-meter"><progress id="stall-meter" max="${s.capacity}" value="${s.balance}" aria-label="Farm stall capacity"></progress><small id="stall-capacity">${number(s.available)} / ${number(s.capacity)} coins</small></div><button id="stall-collect" class="primary-button" ${s.available?'':'disabled'}>Collect earnings<i data-lucide="coins"></i></button></section><div class="research-stats"><div><strong>${s.rate}</strong><span>coins per hour</span></div><div><strong>${s.capacityHours}h</strong><span>storage capacity</span></div><div><strong>${s.level}/8</strong><span>stall level</span></div></div><div class="pace-note"><i data-lucide="sprout"></i><p>Active farming earns more: watering doubles a field’s yield, extra care adds a third crop, and production and orders add value. Ready crops never wither. The stall pauses when its storage is full.</p></div><div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${s.upgradeCost?'Grow your farm stall':'Fully upgraded'}</strong><p>${s.upgradeCost?`Next level: ${s.rate+18} coins/hour · ${Math.min(48,s.capacityHours+4)}h capacity.`:'Complete estate projects for further income bonuses.'}</p></div><button id="stall-upgrade" class="small-button" ${s.upgradeCost===null||state.coins<s.upgradeCost?'disabled':''}>${s.upgradeCost?`${number(s.upgradeCost)} coins`:'Max level'}</button></div>`;
  $('stall-collect').onclick=()=>act({type:'stall_collect'},r=>`Collected ${number(r.coins)} coins from your farm stall.`);
  $('stall-upgrade').onclick=()=>act({type:'stall_upgrade'},r=>`Your farm stall is now level ${r.level}.`);
 }
 function renderChores(){
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="shovel"></i></span><div><h3>Always a little something to do</h3><p>Fit a few chores between harvests. Each one returns after its own short cooldown.</p></div></div><div class="chore-list">${Object.entries(CHORES).map(([key,c])=>{const remaining=Math.max(0,(state.chores[key]??0)-farmNow());return `<article class="chore-card"><span class="chore-icon"><i data-lucide="${c.icon}"></i></span><div><h3>${c.name}</h3><p>${c.description}</p><small>+${c.coins} coins · +${c.xp} XP · every ${formatDuration(c.cooldown)}</small></div><button class="small-button" data-chore="${key}" ${remaining?'disabled':''}>${remaining?formatDuration(remaining):'Do chore'}</button></article>`;}).join('')}</div><div class="pace-note"><i data-lucide="wheat"></i><p>Keep a few fields for wheat (${formatDuration(cropDuration(state,'wheat'))}) and lettuce (${formatDuration(cropDuration(state,'lettuce'))}). Water right away, return with the Care tool after 30% of the original growing time, and collect up to 3 crops per field.</p></div><button class="primary-button" id="quick-crop">Choose quick-growing wheat<i data-lucide="sprout"></i></button>`;
  document.querySelectorAll('[data-chore]').forEach(b=>b.onclick=()=>act({type:'chore',id:b.dataset.chore},r=>`A little job well done. +${r.coins} coins and +${r.xp} XP.`));
  $('quick-crop').onclick=()=>{onPlant('wheat');$('estate-dialog').close();notify('Wheat selected. Keep some fields for active farming.');};
 }
 function renderMastery(){
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="medal"></i></span><div><h3>Become a master grower</h3><p>Every harvested field counts once. Earn ${MASTERY_TIERS.map(t=>`${t.name.toLowerCase()} at ${number(t.target)}`).join(', ')} harvests per crop. Medals unlock later estate projects.</p></div></div><div class="mastery-total"><strong>${state.mastery.claimed.length} / 36 medals</strong><span>Across 9 crop varieties</span></div><div class="mastery-list">${Object.entries(CROPS).map(([key,c])=>{const all=masteryStatus(state,key),next=all.find(t=>!t.claimed),count=state.mastery.harvests[key]??0;return `<article class="mastery-card">${art(key,'mastery-picture')}<div><h3>${c.name}</h3><span class="mastery-medals">${all.map(t=>`<i class="${t.claimed?'earned':''}" title="${t.name}: ${number(t.target)} harvests" data-lucide="medal"></i>`).join('')}</span><small>${number(count)} fields harvested${next?` · ${number(next.target)} for ${next.name}`:' · Full mastery'}</small><progress max="${next?.target??1000}" value="${count}" aria-label="${c.name} mastery progress"></progress></div><button class="small-button" data-mastery="${key}" data-tier="${next?.id??0}" ${!next||next.progress<next.target?'disabled':''}>${!next?'Mastered':next.progress>=next.target?`Claim ${next.name}`:`${number(next.coins)} coins`}</button></article>`;}).join('')}</div>`;
  document.querySelectorAll('[data-mastery]').forEach(b=>b.onclick=()=>act({type:'mastery',crop:b.dataset.mastery,tier:Number(b.dataset.tier)},r=>`${MASTERY_TIERS[r.tier].name} mastery! +${number(r.coins)} coins and +${r.xp} XP.`));
 }
 function readiness(){return [tab,state.estate.job&&farmNow()>=state.estate.job.readyAt,...Object.keys(CHORES).map(id=>farmNow()>=(state.chores[id]??0))].join('|');}
 function refresh(){
  const s=stallStatus(state,farmNow()),readyProject=state.estate.job&&farmNow()>=state.estate.job.readyAt;
  $('estate-dot').hidden=!readyProject&&s.available<Math.min(100,s.capacity);
  $('estate-dot').textContent=readyProject?'!':'G';
  if($('estate-dialog').open)render();
 }
 function tick(){
  const s=stallStatus(state,farmNow());$('estate-dot').hidden=!(state.estate.job&&farmNow()>=state.estate.job.readyAt)&&s.available<Math.min(100,s.capacity);
  if(!$('estate-dialog').open)return;
  if(lastReadiness!==readiness()){render();return;}
  if(tab==='stall'){$('stall-balance').innerHTML=`${number(s.available)}<small>coins</small>`;$('stall-meter').value=s.balance;$('stall-capacity').textContent=`${number(s.available)} / ${number(s.capacity)} coins`;$('stall-collect').disabled=s.available<1;}
  if(tab==='chores')document.querySelectorAll('[data-chore]').forEach(b=>{const left=Math.max(0,(state.chores[b.dataset.chore]??0)-farmNow());b.textContent=left?formatDuration(left):'Do chore';b.disabled=left>0;});
  if(tab==='projects'&&state.estate.job){const job=state.estate.job;$('project-clock').textContent=farmNow()>=job.readyAt?'Ready to open':`${formatDuration(job.readyAt-farmNow())} remaining`;$('project-progress').value=Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100);}
 }
 $('estate-button').onclick=()=>open();
 document.querySelectorAll('[data-estate-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.estateTab;render();});
 return {open,refresh,tick};
}
