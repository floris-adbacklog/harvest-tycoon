import {cropUnlocked,featureUnlocked,featureUnlockHint,CROPS,ITEMS,CHORES,CHORE_PRACTICE_STEP,choreRewards,choreStatus,CHAPTER_DIAMONDS,PROJECTS,MASTERY_TIERS,masteryStatus,stallStatus,stallNotice,currentProject,formatDuration,levelOf,CROP_LEVELS,guidedFarm,CHAPTER_STALL_INCOME,chapterIncome} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const number=n=>n.toLocaleString('en-US');
export function createGrowthUI({state,runAction,onChange,notify,itemList,onNotice}){
 let tab='projects',lastReadiness='',stallWaiting=null;
 const projectReady=()=>Boolean(state.estate.job&&farmNow()>=state.estate.job.readyAt);
 // The same yellow "!" as elsewhere once the stall is a quarter full (stallNotice, farm-state.js): on its tile in the
 // phone menu (and so the More button) and on the Estate button, whose screen holds the stall; not on its map pin. A
 // finished Estate chapter lights the Estate button too.
 function notices(){
  const waiting=stallNotice(state,farmNow());
  $('estate-dot').hidden=!projectReady()&&!waiting;
  document.querySelector('[data-menu-utility="stall"]')?.classList.toggle('has-dot',waiting);
  if(waiting!==stallWaiting){stallWaiting=waiting;onNotice?.();}
 }
 async function act(action,message){try{const result=await runAction(action);onChange();render();$('estate-feedback').textContent=typeof message==='function'?message(result):message;notify($('estate-feedback').textContent);}catch(error){$('estate-feedback').textContent=error.message;notify(error.message);}}
 function open(section='projects'){
  if(!featureUnlocked(state,section)){notify(featureUnlockHint(section));return;}
  tab=section;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-dialog').showModal();icons();
 }
 // Each tab opens with one short line next to its icon, not an icon, a big heading and a paragraph.
 const lead=(icon,text)=>`<p class="estate-lead"><span class="estate-icon"><i data-lucide="${icon}"></i></span><span>${text}</span></p>`;
 function render(){
  document.querySelectorAll('[data-estate-tab]').forEach(b=>{b.hidden=!featureUnlocked(state,b.dataset.estateTab);b.classList.toggle('active',b.dataset.estateTab===tab);b.setAttribute('aria-pressed',String(b.dataset.estateTab===tab));});
  $('estate-feedback').textContent='';
  if(tab==='projects')renderProjects();if(tab==='stall')renderStall();if(tab==='chores')renderChores();if(tab==='mastery')renderMastery();
  lastReadiness=readiness();icons();
 }
 function renderProjects(){
  const p=currentProject(state),job=state.estate.job,levelOk=!p.level||levelOf(state)>=p.level,can=levelOk&&state.coins>=p.coins&&state.mastery.claimed.length>=p.medals&&Object.entries(p.input).every(([k,n])=>state.inventory[k]>=n),isReady=job&&farmNow()>=job.readyAt;
  const steps=PROJECTS.map((project,i)=>`<div class="estate-step ${i<state.estate.completed?'finished':i===state.estate.completed?'current':''}"><span><i data-lucide="${i<state.estate.completed?'check':i===state.estate.completed?'flag':'lock-keyhole'}"></i></span><div><strong>${project.name}</strong><small>${i<state.estate.completed?'Established':`${project.level?`Level ${project.level} · `:''}${formatDuration(project.duration)} construction · ${project.medals} medals · +${CHAPTER_DIAMONDS[i]} diamonds · +${number(CHAPTER_STALL_INCOME[i]??0)} coins/hour`}</small></div></div>`).join('');
  $('estate-content').innerHTML=`${lead('landmark',state.estate.completed<PROJECTS.length?`This chapter adds <b>+${number(CHAPTER_STALL_INCOME[state.estate.completed])} coins/hour</b> to your stall, for good. Every next chapter adds more.`:`Your chapters add <b>${number(chapterIncome(state.estate.completed))} coins/hour</b> to your stall.`)}<section class="project-focus"><div class="project-kicker">${state.estate.completed<PROJECTS.length?`CHAPTER ${state.estate.completed+1} / ${PROJECTS.length}`:'ONGOING ESTATE COMMISSIONS'}<span class="project-rewards">+${number(p.xp)} XP${p.diamonds?` · ${art('diamonds')} +${p.diamonds} diamonds`:""}</span></div><h3>${p.name}</h3><p>${p.description}</p>${job?`<div class="project-building"><div><i data-lucide="${isReady?'circle-check':'hammer'}"></i><strong id="project-clock">${isReady?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`}</strong></div><progress id="project-progress" max="100" value="${Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100)}" aria-label="Construction progress"></progress><button class="primary-button" id="project-complete" ${isReady?'':'disabled'}>${isReady?'Celebrate & unlock the next chapter':'Construction in progress'}<i data-lucide="flag"></i></button></div>`:`<div class="project-requirements">${p.level?`<span class="${levelOk?'met':''}"><i data-lucide="star"></i> Level ${p.level}</span>`:''}<span class="${state.coins>=p.coins?'met':''}"><i data-lucide="coins"></i> ${number(p.coins)} coins</span><span class="${state.mastery.claimed.length>=p.medals?'met':''}"><i data-lucide="medal"></i> ${state.mastery.claimed.length} / ${p.medals} mastery medals</span><span><i data-lucide="clock-3"></i> ${formatDuration(p.duration)}</span></div><div class="ingredients project-goods">${itemList(p.input,true)}</div><button class="primary-button" id="project-start" ${can?'':'disabled'}>Fund & start construction<i data-lucide="hammer"></i></button>`}</section><details class="estate-road"><summary><strong>The road ahead</strong><span>${Math.min(state.estate.completed,PROJECTS.length)} / ${PROJECTS.length} chapters</span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="estate-roadmap">${steps}<div class="estate-step ${state.estate.completed>=6?'current':''}"><span><i data-lucide="infinity"></i></span><div><strong>Estate commissions</strong><small>Repeatable three-day projects with growing goals</small></div></div></div></details>`;
  $('project-start')?.addEventListener('click',()=>act({type:'project_start'},r=>`${r.name} is under construction. There is plenty to do while it grows.`));
  $('project-complete')?.addEventListener('click',()=>act({type:'project_collect'},r=>`${r.name} established! +${number(r.xp)} XP${r.diamonds?` · +${r.diamonds} diamonds`:""} and +${number(r.income)} coins/hour at your stall.`));
 }
 // How long until the stall is full, or that it is full and stopped earning.
 const stallNote=s=>s.balance>=s.capacity?'Full · collect to keep earning':`Full in ${formatDuration((s.capacity-s.balance)/s.rate*3600000)}`;
 function renderStall(){
  const s=stallStatus(state,farmNow()),full=s.balance>=s.capacity,nextHours=Math.min(48,s.capacityHours+4)-s.capacityHours;
  $('estate-content').innerHTML=`${lead('store','Earns coins while you are away. Collect before it is full.')}<section class="stall-hero ${full?'is-full':''}"><span class="stall-art">${art('stall')}</span><div class="stall-copy"><span>Waiting at your stall</span><strong id="stall-balance">${art('coins')}${number(s.available)}</strong><progress id="stall-meter" max="${s.capacity}" value="${s.balance}" aria-label="Farm stall capacity"></progress><small id="stall-capacity">${stallNote(s)}</small></div><button id="stall-collect" class="primary-button" ${s.available?'':'disabled'}>Collect</button></section>`
   +`<div class="stall-facts"><span>${art('coins')}<b>${number(s.rate)}</b> an hour</span><span><i data-lucide="archive"></i><b>${s.capacityHours}h</b> storage</span><span><i data-lucide="store"></i>Level <b>${s.level}/8</b></span></div>`
   +`<section class="stall-upgrade"><div><strong>${s.upgradeCost?`Level ${s.level+1}`:'Fully upgraded'}</strong>${s.upgradeCost?`<span class="stall-gains"><b>+18 an hour</b>${nextHours?`<b>+${nextHours}h storage</b>`:''}</span>`:'<span>Each estate chapter adds 6 coins an hour.</span>'}</div><button id="stall-upgrade" class="primary-button" ${s.upgradeCost===null||state.coins<s.upgradeCost?'disabled':''}>${s.upgradeCost?`<span>Upgrade</span><span class="button-price">${art('coins')}${number(s.upgradeCost)} coins</span>`:'Max level'}</button></section>`;
  $('stall-collect').onclick=()=>act({type:'stall_collect'},r=>`Collected ${number(r.coins)} coins from your farm stall.`);
  $('stall-upgrade').onclick=()=>act({type:'stall_upgrade'},r=>`Your farm stall is now level ${r.level}.`);
 }
 function renderChores(){
  const mastery=c=>Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP);
  $('estate-content').innerHTML=`${lead('shovel','Coins and XP every time, sometimes extra goods.')}<div class="chore-list">${Object.entries(CHORES).map(([key,c])=>{
   const status=choreStatus(state,key,farmNow()),remaining=status.remaining,base=choreRewards(c),item=c.bonus.item;
   const foot=status.locked?`Master ${CHORES[c.requires].name} first`:status.mastered?`Mastered · every ${formatDuration(c.cooldown)}`:`${Math.min(mastery(c),status.attempts)} / ${mastery(c)} to mastery · every ${formatDuration(c.cooldown)}`;
   return `<article class="chore-card ${status.locked?'is-locked':''}"><span class="chore-icon">${art(`chore-${key}`)}</span><div><h3>${c.name}</h3><p>${c.description}</p><div class="chore-rewards"><span>${art('coins')}+${base.coins}</span><span>${art('xp')}+${base.xp} XP</span><span class="chore-bonus" title="Bonus: ${status.chance}% chance">${art(item)}+${c.bonus.count} ${ITEMS[item].name.toLowerCase()}</span></div><div class="chore-chance ${status.mastered?'is-mastered':''}"><progress max="${c.maxChance}" value="${status.chance}" aria-label="${c.name} bonus chance, ${status.chance}% of ${c.maxChance}%"></progress><strong>${status.mastered?`${status.chance}% · Mastered`:`${status.chance}% bonus chance`}</strong></div><p class="chore-foot">${foot}</p></div><button class="small-button" data-chore="${key}" ${remaining||status.locked?'disabled':''}>${status.locked?'Locked':remaining?formatDuration(remaining):'Do chore'}</button></article>`;
  }).join('')}</div>`;
  document.querySelectorAll('[data-chore]').forEach(b=>b.onclick=()=>act({type:'chore',id:b.dataset.chore},r=>{showChoreResult(b.dataset.chore,r);return `Job well done! +${r.coins} coins and +${r.xp} XP.${r.bonus?` Bonus: ${bonusText(r.items)}!`:''}`;}));
 }
 const bonusText=items=>Object.entries(items??{}).map(([item,count])=>`+${count} ${ITEMS[item]?.name.toLowerCase()??item}`).join(', ');
 function showChoreResult(id,result){
  document.getElementById('chore-result')?.remove();
  const c=CHORES[id],dialog=document.createElement('dialog');dialog.id='chore-result';dialog.className='chore-result';dialog.setAttribute('aria-labelledby','chore-result-title');
  const found=Object.entries(result.items??{}).map(([item,count])=>`<strong class="chore-prize-bonus">${art(item)}+${count} ${ITEMS[item]?.name.toLowerCase()??item}</strong>`).join('');
  // Two clearly different moments: a find (gold, the goods up front) or a plain finished job (calm, what the next try brings).
  const item=c.bonus.item,missed=`<p class="chore-missed">${art(item)}<span>No ${ITEMS[item].name.toLowerCase()} this time. ${result.nextChance>result.chance?`Practice raised your chance to <b>${result.nextChance}%</b>.`:`Your chance stays <b>${result.nextChance}%</b>.`}</span></p>`;
  dialog.classList.toggle('is-bonus',!!result.bonus);
  dialog.innerHTML=`<span class="chore-result-art">${result.bonus?art(item):art(`chore-${id}`)}</span><p class="eyebrow">${result.bonus?'A LITTLE EXTRA!':'A LITTLE JOB, WELL DONE'}</p><h2 id="chore-result-title">${result.bonus?'You found something!':'Job well done'}</h2><p>${c.name}</p><div class="chore-prizes">${found}<strong>${art('coins')}+${result.coins} coins</strong><strong>${art('xp')}+${result.xp} XP</strong></div>${result.bonus?'':missed}<small>${result.bonus&&result.nextChance>result.chance?`Bonus chance now ${result.nextChance}% · `:''}Back in ${formatDuration(c.cooldown)}</small><button class="primary-button">Back to chores</button>`;
  document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();icons();dialog.showModal();
 }
 // The level a crop opens at on this farm (guided farms follow the new ladder, older farms the crop's own level).
 const cropLevel=key=>guidedFarm(state)?CROP_LEVELS[key]:CROPS[key].minLevel??1;
 function renderMastery(){
  $('estate-content').innerHTML=`${lead('medal',`Medals at ${MASTERY_TIERS.map(t=>number(t.target)).join(', ')} harvests per crop.`)}<div class="mastery-total"><strong>${state.mastery.claimed.length} / ${Object.keys(CROPS).length*MASTERY_TIERS.length} medals</strong><span>Across ${Object.keys(CROPS).length} crop varieties</span></div><div class="mastery-list">${Object.entries(CROPS).filter(([key])=>cropUnlocked(state,key)).map(([key,c])=>{const all=masteryStatus(state,key),next=all.find(t=>!t.claimed),count=state.mastery.harvests[key]??0;return `<article class="mastery-card">${art(key,'mastery-picture')}<div><h3>${c.name}</h3><span class="mastery-medals">${all.map(t=>`<i class="${t.claimed?'earned':''}" title="${t.name}: ${number(t.target)} harvests" data-lucide="medal"></i>`).join('')}</span><small>${number(count)} fields harvested${next?` · ${number(next.target)} for ${next.name}`:' · Full mastery'}</small><progress max="${next?.target??1000}" value="${count}" aria-label="${c.name} mastery progress"></progress></div><button class="small-button" data-mastery="${key}" data-tier="${next?.id??0}" ${!next||next.progress<next.target?'disabled':''}>${!next?'Mastered':next.progress>=next.target?`Claim ${next.name}`:`${number(next.coins)} coins`}</button></article>`;}).join('')}${Object.keys(CROPS).filter(key=>!cropUnlocked(state,key)).sort((x,y)=>cropLevel(x)-cropLevel(y)).map(key=>`<article class="mastery-card is-locked">${art(key,'mastery-picture')}<div><h3>${CROPS[key].name}</h3><small>Opens at level ${cropLevel(key)}</small></div><span class="mastery-lock" aria-label="Locked">${art('lock')}</span></article>`).join('')}</div>`;
  document.querySelectorAll('[data-mastery]').forEach(b=>b.onclick=()=>act({type:'mastery',crop:b.dataset.mastery,tier:Number(b.dataset.tier)},r=>`${MASTERY_TIERS[r.tier].name} mastery! +${number(r.coins)} coins and +${r.xp} XP.`));
 }
 function readiness(){return [tab,state.estate.job&&farmNow()>=state.estate.job.readyAt,...Object.keys(CHORES).map(id=>farmNow()>=(state.chores[id]??0))].join('|');}
 function refresh(){
  notices();
  if($('estate-dialog').open)render();
 }
 function tick(){
  notices();const s=stallStatus(state,farmNow());
  if(!$('estate-dialog').open)return;
  if(lastReadiness!==readiness()){render();return;}
  if(tab==='stall'){$('stall-balance').innerHTML=`${art('coins')}${number(s.available)}`;$('stall-meter').value=s.balance;$('stall-capacity').textContent=stallNote(s);$('stall-collect').disabled=s.available<1;document.querySelector('.stall-hero')?.classList.toggle('is-full',s.balance>=s.capacity);}
  if(tab==='chores')document.querySelectorAll('[data-chore]').forEach(b=>{const s=choreStatus(state,b.dataset.chore,farmNow());b.textContent=s.locked?'Locked':s.remaining?formatDuration(s.remaining):'Do chore';b.disabled=s.locked||s.remaining>0;});
  if(tab==='projects'&&state.estate.job){const job=state.estate.job;$('project-clock').textContent=farmNow()>=job.readyAt?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`;$('project-progress').value=Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100);}
 }
 $('estate-button').onclick=()=>open(!projectReady()&&stallNotice(state,farmNow())?'stall':'projects');
 document.querySelectorAll('[data-estate-tab]').forEach(b=>b.onclick=()=>open(b.dataset.estateTab));
 return {open,refresh,tick};
}
