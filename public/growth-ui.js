import {cropUnlocked,featureUnlocked,featureUnlockHint,CROPS,ITEMS,CHORES,choreRewards,choreStatus,CHAPTER_DIAMONDS,PROJECTS,MASTERY_TIERS,masteryStatus,stallStatus,currentProject,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const number=n=>n.toLocaleString('en-US');
export function createGrowthUI({state,runAction,onChange,notify,itemList}){
 let tab='projects',lastReadiness='';
 async function act(action,message){try{const result=await runAction(action);onChange();render();$('estate-feedback').textContent=typeof message==='function'?message(result):message;notify($('estate-feedback').textContent);}catch(error){$('estate-feedback').textContent=error.message;notify(error.message);}}
 function open(section='projects'){
  if(!featureUnlocked(state,section)){notify(featureUnlockHint(section));return;}
  tab=section;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-dialog').showModal();icons();
 }
 function render(){
  document.querySelectorAll('[data-estate-tab]').forEach(b=>{b.hidden=!featureUnlocked(state,b.dataset.estateTab);b.classList.toggle('active',b.dataset.estateTab===tab);b.setAttribute('aria-pressed',String(b.dataset.estateTab===tab));});
  $('estate-feedback').textContent='';
  if(tab==='projects')renderProjects();if(tab==='stall')renderStall();if(tab==='chores')renderChores();if(tab==='mastery')renderMastery();
  lastReadiness=readiness();icons();
 }
 function renderProjects(){
  const p=currentProject(state),job=state.estate.job,can=state.coins>=p.coins&&state.mastery.claimed.length>=p.medals&&Object.entries(p.input).every(([k,n])=>state.inventory[k]>=n),isReady=job&&farmNow()>=job.readyAt;
  const steps=PROJECTS.map((project,i)=>`<div class="estate-step ${i<state.estate.completed?'finished':i===state.estate.completed?'current':''}"><span><i data-lucide="${i<state.estate.completed?'check':i===state.estate.completed?'flag':'lock-keyhole'}"></i></span><div><strong>${project.name}</strong><small>${i<state.estate.completed?'Established':`${formatDuration(project.duration)} construction · ${project.medals} medals · +${CHAPTER_DIAMONDS[i]} diamonds`}</small></div></div>`).join('');
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="landmark"></i></span><div><h3>Grow something that lasts</h3><p>Six chapters with XP and diamond rewards, then ongoing commissions. Chapter diamonds are credited once when you celebrate completion. Each completed project adds <b>6 coins/hour</b> to your farm stall.</p></div></div><section class="project-focus"><div class="project-kicker">${state.estate.completed<PROJECTS.length?`CHAPTER ${state.estate.completed+1} / 6`:'ONGOING ESTATE COMMISSIONS'}<span class="project-rewards">+${number(p.xp)} XP${p.diamonds?` · ${art('diamonds')} +${p.diamonds} diamonds`:""}</span></div><h3>${p.name}</h3><p>${p.description}</p>${job?`<div class="project-building"><div><i data-lucide="${isReady?'circle-check':'hammer'}"></i><strong id="project-clock">${isReady?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`}</strong></div><progress id="project-progress" max="100" value="${Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100)}" aria-label="Construction progress"></progress><p>Your other fields, buildings and farm chores stay available during construction.</p><button class="primary-button" id="project-complete" ${isReady?'':'disabled'}>${isReady?'Celebrate & unlock the next chapter':'Construction in progress'}<i data-lucide="flag"></i></button></div>`:`<div class="project-requirements"><span class="${state.coins>=p.coins?'met':''}"><i data-lucide="coins"></i> ${number(p.coins)} coins</span><span class="${state.mastery.claimed.length>=p.medals?'met':''}"><i data-lucide="medal"></i> ${state.mastery.claimed.length} / ${p.medals} mastery medals</span><span><i data-lucide="clock-3"></i> ${formatDuration(p.duration)}</span></div><div class="ingredients project-goods">${itemList(p.input,true)}</div><button class="primary-button" id="project-start" ${can?'':'disabled'}>Fund & start construction<i data-lucide="hammer"></i></button><small class="project-note">Coins and goods are spent when construction starts. Medals are kept.</small>`}</section><div class="recipe-section-heading"><h3>The road ahead</h3><span>${Math.min(state.estate.completed,6)} / 6 chapters complete</span></div><div class="estate-roadmap">${steps}<div class="estate-step ${state.estate.completed>=6?'current':''}"><span><i data-lucide="infinity"></i></span><div><strong>Estate commissions</strong><small>Repeatable three-day projects with growing goals</small></div></div></div>`;
  $('project-start')?.addEventListener('click',()=>act({type:'project_start'},r=>`${r.name} is under construction. There is plenty to do while it grows.`));
  $('project-complete')?.addEventListener('click',()=>act({type:'project_collect'},r=>`${r.name} established! +${number(r.xp)} XP${r.diamonds?` · +${r.diamonds} diamonds`:""} and +6 coins/hour at your stall.`));
 }
 function renderStall(){
  const s=stallStatus(state,farmNow());
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="store"></i></span><div><h3>A little income while you’re away</h3><p>Your farm stall earns coins automatically. Plant longer crops before you leave, then return to collect both.</p></div></div><section class="stall-bank"><span>Waiting at your farm stall</span><strong id="stall-balance">${number(s.available)}<small>coins</small></strong><div class="stall-meter"><progress id="stall-meter" max="${s.capacity}" value="${s.balance}" aria-label="Farm stall capacity"></progress><small id="stall-capacity">${number(s.available)} / ${number(s.capacity)} coins</small></div><button id="stall-collect" class="primary-button" ${s.available?'':'disabled'}>Collect earnings<i data-lucide="coins"></i></button></section><div class="research-stats"><div><strong>${s.rate}</strong><span>coins per hour</span></div><div><strong>${s.capacityHours}h</strong><span>storage capacity</span></div><div><strong>${s.level}/8</strong><span>stall level</span></div></div><div class="pace-note"><i data-lucide="sprout"></i><p>Active farming earns more: watering doubles a field’s yield, extra care adds a third crop, and production and orders add value. Ready crops never wither. The stall pauses when its storage is full.</p></div><div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${s.upgradeCost?'Grow your farm stall':'Fully upgraded'}</strong><p>${s.upgradeCost?`Next level: ${s.rate+18} coins/hour · ${Math.min(48,s.capacityHours+4)}h capacity.`:'Complete estate projects for further income bonuses.'}</p></div><button id="stall-upgrade" class="small-button" ${s.upgradeCost===null||state.coins<s.upgradeCost?'disabled':''}>${s.upgradeCost?`${art('coins')} ${number(s.upgradeCost)} coins`:'Max level'}</button></div>`;
  $('stall-collect').onclick=()=>act({type:'stall_collect'},r=>`Collected ${number(r.coins)} coins from your farm stall.`);
  $('stall-upgrade').onclick=()=>act({type:'stall_upgrade'},r=>`Your farm stall is now level ${r.level}.`);
 }
 function renderChores(){
  const mastery=c=>Math.ceil((c.maxChance-c.baseChance)/2);
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="shovel"></i></span><div><h3>Always a little something to do</h3><p>Every chore pays coins and XP. With a bit of luck you also find some extra goods. Practice raises that chance; master a chore to unlock the next.</p></div></div><div class="chore-list">${Object.entries(CHORES).map(([key,c])=>{
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
 function renderMastery(){
  $('estate-content').innerHTML=`<div class="estate-intro"><span class="estate-icon"><i data-lucide="medal"></i></span><div><h3>Become a master grower</h3><p>Every harvested field counts once. Earn ${MASTERY_TIERS.map(t=>`${t.name.toLowerCase()} at ${number(t.target)}`).join(', ')} harvests per crop. Medals unlock later estate projects.</p></div></div><div class="mastery-total"><strong>${state.mastery.claimed.length} / ${Object.keys(CROPS).length*MASTERY_TIERS.length} medals</strong><span>Across ${Object.keys(CROPS).length} crop varieties</span></div><div class="mastery-list">${Object.entries(CROPS).filter(([key])=>cropUnlocked(state,key)).map(([key,c])=>{const all=masteryStatus(state,key),next=all.find(t=>!t.claimed),count=state.mastery.harvests[key]??0;return `<article class="mastery-card">${art(key,'mastery-picture')}<div><h3>${c.name}</h3><span class="mastery-medals">${all.map(t=>`<i class="${t.claimed?'earned':''}" title="${t.name}: ${number(t.target)} harvests" data-lucide="medal"></i>`).join('')}</span><small>${number(count)} fields harvested${next?` · ${number(next.target)} for ${next.name}`:' · Full mastery'}</small><progress max="${next?.target??1000}" value="${count}" aria-label="${c.name} mastery progress"></progress></div><button class="small-button" data-mastery="${key}" data-tier="${next?.id??0}" ${!next||next.progress<next.target?'disabled':''}>${!next?'Mastered':next.progress>=next.target?`Claim ${next.name}`:`${number(next.coins)} coins`}</button></article>`;}).join('')}</div>`;
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
  if(tab==='chores')document.querySelectorAll('[data-chore]').forEach(b=>{const s=choreStatus(state,b.dataset.chore,farmNow());b.textContent=s.locked?'Locked':s.remaining?formatDuration(s.remaining):'Do chore';b.disabled=s.locked||s.remaining>0;});
  if(tab==='projects'&&state.estate.job){const job=state.estate.job;$('project-clock').textContent=farmNow()>=job.readyAt?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`;$('project-progress').value=Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100);}
 }
 $('estate-button').onclick=()=>open();
 document.querySelectorAll('[data-estate-tab]').forEach(b=>b.onclick=()=>open(b.dataset.estateTab));
 return {open,refresh,tick};
}
