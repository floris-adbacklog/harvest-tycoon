import {MASTER_BRANCHES,MASTER_FROM,masterPoints,masterFree,masterRank,masterBonus,cropUnlocked,featureUnlocked,featureUnlockHint,CROPS,ITEMS,CHORES,CHORE_PRACTICE_STEP,choreRewards,choreStatus,CHAPTER_DIAMONDS,PROJECTS,MASTERY_TIERS,masteryStatus,stallStatus,stallNotice,currentProject,formatDuration,levelOf,CROP_LEVELS,guidedFarm,CHAPTER_STALL_INCOME,chapterIncome,medalsWaiting} from './farm-state.js';
import {MEDAL_NAMES} from './medal-notice.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt,MEDAL_ART} from './visual-icons.js';
import {bonusOverview} from './bonus-overview.js';
import {keepFolds} from './keep-folds.js';
import {setDialogBadge} from './dialog-shell.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const number=n=>n.toLocaleString('en-US');
// Each tab opens with one short line next to its icon, not an icon, a big heading and a paragraph.
const lead=(icon,text)=>`<p class="estate-lead"><span class="estate-icon"><i data-lucide="${icon}"></i></span><span>${text}</span></p>`;
// The Bonuses tab (8 Oct 2026) opens with Medals at level 14 (it opened with the diamond boosts at 10 until 9 Oct 2026, when Medals
// moved from 7 to 14: the Estate window is reached through Medals or the projects, so from 10 to 13 nothing led to it); every other
// tab is its own feature. The boosts themselves are in the Boosts window from level 10, as before.
const gate=tab=>tab==='bonuses'?'mastery':tab;
// Bonuses: a card per group with its total in green, a row per bonus with its value in a chip at the end, and the next bonus of
// the group dimmed (public/bonus-overview.js). Separate elements, never a " · " between them.
const bonusRow=r=>`<li class="bonus-row ${r.active?'is-active':'is-next'}"><div><strong>${r.name}</strong>${r.sub?`<small>${r.sub}</small>`:''}</div><span class="bonus-chip">${r.value}</span></li>`;
export const bonusesMarkup=({groups})=>`${lead('sparkles','Every bonus your farm has now, and the next one to get.')}<div class="bonus-groups">${groups.map(g=>`<section class="bonus-group"><h3>${art(g.art)}<span>${g.title}</span></h3>${g.totals.map(t=>`<p class="bonus-total">${t.text}</p>`).join('')}<ul class="bonus-list">${g.rows.map(bonusRow).join('')}</ul>${g.note?`<p class="bonus-note">${g.note}</p>`:''}</section>`).join('')}</div>`;
export function createGrowthUI({state,runAction,onChange,notify,itemList,onNotice}){
 let tab='projects',lastReadiness='',stallWaiting=null,medalWaiting=null;
 const projectReady=()=>Boolean(state.estate.job&&farmNow()>=state.estate.job.readyAt);
 // The same yellow "!" as elsewhere once the stall is a quarter full (stallNotice, farm-state.js): on its tile in the
 // phone menu (and so the More button) and on the Estate button, whose screen holds the stall; not on its map pin. A
 // finished Estate chapter lights the Estate button too.
 function notices(){
  const waiting=stallNotice(state,farmNow());
  // A Master point to spend (from level 91) lights it too.
  // Not on the admin's showcase farm (farm-state.js createShowcaseFarm): every branch is full there, so its points have nowhere to go.
  const master=featureUnlocked(state,'master')&&masterFree(state)>0&&!state.showcase;
  // A crop medal earned and not collected (Oct 2026) lights the "!" until it is collected: on the Medals tab, its tile in More (and so
  // the More button) and the Estate button. Medals already waiting when the game opens light it too, without a toast (medal-notice.js).
  const medals=featureUnlocked(state,'mastery')&&medalsWaiting(state).length>0;
  $('estate-dot').hidden=!projectReady()&&!master&&!medals;
  document.querySelector('[data-menu-utility="stall"]')?.classList.toggle('has-dot',waiting);
  document.querySelector('[data-menu-utility="mastery"]')?.classList.toggle('has-dot',medals);
  const tabDot=document.querySelector('[data-estate-tab="mastery"] .estate-tab-dot');if(tabDot)tabDot.hidden=!medals;
  if(waiting!==stallWaiting||medals!==medalWaiting){stallWaiting=waiting;medalWaiting=medals;onNotice?.();}
 }
 // While the farm waits for the server's answer (about a second, 26 Oct 2026: "chores take long after the tap"), the tapped chore turns its
 // hourglass at once ("One moment…" for screen readers and on hover; the button keeps its width, so nothing beside it moves), and the
 // window's other buttons are off, so nothing is tapped twice. A render meanwhile keeps it. A chore itself shows at once since the same
 // evening (farm-client.js INSTANT_ACTIONS), so this is for what still waits; with an answer at once it never shows.
 let acting=null;
 function markBusy(){
  const box=$('estate-content');box.setAttribute('aria-busy','true');
  box.querySelectorAll('button').forEach(b=>{if(b.dataset.chore===acting.chore){b.disabled=false;b.setAttribute('aria-disabled','true');b.classList.add('is-busy');b.classList.remove('is-waiting');b.textContent='';b.title='One moment…';b.setAttribute('aria-label','One moment…');}else b.disabled=true;});
 }
 async function act(action,message){
  if(acting)return;acting={chore:action.type==='chore'?action.id:null};markBusy();
  try{const result=await runAction(action);onChange();render();$('estate-feedback').textContent=typeof message==='function'?message(result):message;notify($('estate-feedback').textContent);}
  catch(error){$('estate-feedback').textContent=error.message;notify(error.message);}
  finally{acting=null;const said=$('estate-feedback').textContent;render();$('estate-feedback').textContent=said;$('estate-content').removeAttribute('aria-busy');}
 }
 function open(section='projects'){
  if(!featureUnlocked(state,gate(section))){notify(featureUnlockHint(gate(section)));return;}
  tab=section;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-dialog').showModal();icons();
 }
 function render(){
  document.querySelectorAll('[data-estate-tab]').forEach(b=>{b.hidden=!featureUnlocked(state,gate(b.dataset.estateTab));b.classList.toggle('active',b.dataset.estateTab===tab);b.setAttribute('aria-pressed',String(b.dataset.estateTab===tab));});
  // 8 Oct 2026: the Farm stall and the Farm chores have their own ways in (their icons on the farm and their tiles), so they have no tab
  // here. Opened for one of them, the window is just that one: no Estate tabs, titled like its tile.
  const alone={stall:'Farm stall',chores:'Farm chores'}[tab],dlg=$('estate-dialog');for(const el of [dlg.querySelector?.('.estate-tabs'),dlg.querySelector?.('.dialog-heading .eyebrow')])if(el)el.hidden=!!alone;$('estate-title').textContent=alone??'Estate';setDialogBadge(dlg,{stall:'stall',chores:'chores'}[tab]??'estate');
  $('estate-feedback').textContent='';
  if(tab==='projects')renderProjects();if(tab==='stall')renderStall();if(tab==='chores')renderChores();if(tab==='mastery')renderMastery();if(tab==='master')renderMaster();if(tab==='bonuses')renderBonuses(true);
  lastReadiness=readiness();icons();if(acting)markBusy();
 }
 function renderProjects(){
  const p=currentProject(state),job=state.estate.job,levelOk=!p.level||levelOf(state)>=p.level,can=levelOk&&state.coins>=p.coins&&state.mastery.claimed.length>=p.medals&&Object.entries(p.input).every(([k,n])=>state.inventory[k]>=n),isReady=job&&farmNow()>=job.readyAt;
  const steps=PROJECTS.map((project,i)=>`<div class="estate-step ${i<state.estate.completed?'finished':i===state.estate.completed?'current':''}"><span><i data-lucide="${i<state.estate.completed?'check':i===state.estate.completed?'flag':'lock-keyhole'}"></i></span><div><strong>${project.name}</strong><small>${i<state.estate.completed?'Established':`${project.level?`Level ${project.level} · `:''}${formatDuration(project.duration)} construction · ${project.medals} medals · +${CHAPTER_DIAMONDS[i]} diamonds · +${number(CHAPTER_STALL_INCOME[i]??0)} coins/hour`}</small></div></div>`).join('');
  // The road ahead stays open when a farm update draws the projects anew (16 Oct 2026, public/keep-folds.js).
  keepFolds($('estate-content'),`${lead('landmark',state.estate.completed<PROJECTS.length?`This chapter adds <b>+${number(CHAPTER_STALL_INCOME[state.estate.completed])} coins/hour</b> to your stall, for good. Every next chapter adds more.`:`Your chapters add <b>${number(chapterIncome(state.estate.completed))} coins/hour</b> to your stall.`)}<section class="project-focus"><div class="project-kicker">${state.estate.completed<PROJECTS.length?`CHAPTER ${state.estate.completed+1} / ${PROJECTS.length}`:'ONGOING ESTATE COMMISSIONS'}<span class="project-rewards">+${number(p.xp)} XP${p.diamonds?` · ${art('diamonds')} +${p.diamonds} diamonds`:""}</span></div><h3>${p.name}</h3><p>${p.description}</p>${job?`<div class="project-building"><div><i data-lucide="${isReady?'circle-check':'hammer'}"></i><strong id="project-clock">${isReady?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`}</strong></div><progress id="project-progress" max="100" value="${Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100)}" aria-label="Construction progress"></progress><button class="primary-button" id="project-complete" ${isReady?'':'disabled'}>${isReady?'Celebrate & unlock the next chapter':'Construction in progress'}<i data-lucide="flag"></i></button></div>`:`<div class="project-requirements">${p.level?`<span class="${levelOk?'met':''}"><i data-lucide="star"></i> Level ${p.level}</span>`:''}<span class="${state.coins>=p.coins?'met':''}"><i data-lucide="coins"></i> ${number(p.coins)} coins</span><span class="${state.mastery.claimed.length>=p.medals?'met':''}"><i data-lucide="medal"></i> ${state.mastery.claimed.length} / ${p.medals} medals</span><span><i data-lucide="clock-3"></i> ${formatDuration(p.duration)}</span></div><div class="ingredients project-goods">${itemList(p.input,true)}</div><button class="primary-button" id="project-start" ${can?'':'disabled'}>Fund & start construction<i data-lucide="hammer"></i></button>`}</section><details class="estate-road" data-fold="road"><summary><strong>The road ahead</strong><span>${Math.min(state.estate.completed,PROJECTS.length)} / ${PROJECTS.length} chapters</span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="estate-roadmap">${steps}<div class="estate-step ${state.estate.completed>=6?'current':''}"><span><i data-lucide="infinity"></i></span><div><strong>Estate commissions</strong><small>Repeatable three-day projects with growing goals</small></div></div></div></details>`);
  $('project-start')?.addEventListener('click',()=>act({type:'project_start'},r=>`${r.name} is under construction. There is plenty to do while it grows.`));
  $('project-complete')?.addEventListener('click',()=>act({type:'project_collect'},r=>`${r.name} established! +${number(r.xp)} XP${r.diamonds?` · +${r.diamonds} diamonds`:""} and +${number(r.income)} coins/hour at your stall.`));
 }
 // How long until the stall is full, or that it is full and stopped earning.
 const stallNote=s=>s.balance>=s.capacity?'Full · collect to keep earning':`Full in ${formatDuration((s.capacity-s.balance)/s.rate*3600000)}`;
 function renderStall(){
  const s=stallStatus(state,farmNow()),full=s.balance>=s.capacity,nextHours=Math.min(48,s.capacityHours+4)-s.capacityHours;
  $('estate-content').innerHTML=`${lead('store','Earns coins while you are away. Collect before it is full.')}<section class="stall-hero ${full?'is-full':''}"><span class="stall-art">${art('stall')}</span><div class="stall-copy"><span>Waiting at your stall</span><strong id="stall-balance">${art('coins')}${number(s.available)}</strong><progress id="stall-meter" max="${s.capacity}" value="${s.balance}" aria-label="Farm stall capacity"></progress><small id="stall-capacity">${stallNote(s)}</small></div><button id="stall-collect" class="primary-button" ${s.available?'':'disabled'}>Collect</button></section>`
   +`<div class="stall-facts"><span>${art('coins')}<b>${number(s.rate)}</b> an hour</span><span><i data-lucide="archive"></i><b>${s.capacityHours}h</b> storage</span><span><i data-lucide="store"></i>Level <b>${s.level}/8</b></span></div>`
   +`<section class="stall-upgrade"><div><strong>${s.upgradeCost?`Level ${s.level+1}`:'Fully upgraded'}</strong>${s.upgradeCost?`<span class="stall-gains"><b>+18 an hour</b>${nextHours?`<b>+${nextHours}h storage</b>`:''}</span>`:'<span>Each estate chapter adds 6 coins an hour.</span>'}</div><button id="stall-upgrade" class="secondary-button" ${s.upgradeCost===null||state.coins<s.upgradeCost?'disabled':''}>${s.upgradeCost?`<span>Upgrade</span><span class="button-price">${art('coins')}${number(s.upgradeCost)} coins</span>`:'Max level'}</button></section>`;
  $('stall-collect').onclick=()=>act({type:'stall_collect'},r=>`Collected ${number(r.coins)} coins from your farm stall.`);
  $('stall-upgrade').onclick=()=>act({type:'stall_upgrade'},r=>`Your farm stall is now level ${r.level}.`);
 }
 // A chore's button: Do chore, Locked, or the time until it can be done again (2 Oct 2026: on a dark button, the time left was pale
 // grey on pale beige and hard to read).
 const choreButton=s=>s.locked?{text:'Locked',waiting:false}:s.remaining?{text:`Back in ${formatDuration(s.remaining)}`,waiting:true}:{text:'Do chore',waiting:false};
 // The chores window (23 Oct 2026, the owner picked 1, 2, 3 and 4): the chores you can do on top, a chore that is ready again first
 // and marked green, waiting ones below by their time left; the locked ones folded away as small rows (as Seeds to unlock). Each card
 // is compact on a phone too (its button beside it): the rewards, the bonus as a chip ("60% chance" and what it finds) and a mastery
 // bar that says which chore it opens. The rest every chore has sits under its button.
 function renderChores(){
  const mastery=c=>Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP);
  const now=farmNow();
  const next=key=>Object.entries(CHORES).find(([,c])=>c.requires===key)?.[1]??null;
  const all=Object.entries(CHORES).map(([key,c])=>({key,c,status:choreStatus(state,key,now)}));
  const open=all.filter(x=>!x.status.locked).sort((a,b)=>a.status.remaining-b.status.remaining),locked=all.filter(x=>x.status.locked);
  const card=({key,c,status})=>{
   const base=choreRewards(c),item=c.bonus.item,n=mastery(c),done=Math.min(n,status.attempts),opens=next(key);
   const progress=status.mastered?`<p class="chore-mastery is-mastered"><span class="tag-info">Mastered</span></p>`
    :`<div class="chore-mastery"><progress max="${n}" value="${done}" aria-hidden="true"></progress><small>${opens?`Mastery ${done} / ${n} · unlocks ${opens.name}`:`Mastery ${done} / ${n}`}</small></div>`;
   const shown=choreButton(status),ready=!status.remaining;
   return `<article class="chore-card ${ready?'is-ready':'is-waiting'}" title="${c.description}"><span class="chore-icon">${art(`chore-${key}`)}</span><div class="chore-main"><h3>${c.name}</h3><div class="chore-rewards"><span>${art('coins')}+${base.coins}</span><span>${art('xp')}+${base.xp} XP</span><span class="chore-bonus" title="Bonus: ${status.chance}% chance">${art(item)}+${c.bonus.count} ${ITEMS[item].name.toLowerCase()}<b>${status.chance}% chance</b></span></div>${progress}</div><div class="chore-act"><button class="${ready?'primary-button':'small-button'}${shown.waiting?' is-waiting':''}" data-chore="${key}" ${ready?'':'disabled'}>${shown.text}</button><small>every ${formatDuration(c.cooldown)}</small></div></article>`;
  };
  const row=({key,c})=>`<div class="chore-locked"><span class="chore-icon">${art(`chore-${key}`)}</span><span><strong>${c.name}</strong><small>Master ${CHORES[c.requires].name} first</small></span>${art('lock','unlock-lock')}</div>`;
  keepFolds($('estate-content'),`${lead('shovel','Coins and XP every time, sometimes extra goods.')}<div class="chore-list">${open.map(card).join('')}</div>${locked.length?`<details class="future-unlocks chore-unlocks" data-fold="chores-locked"><summary>${art('lock','unlock-lock')}<span>Chores to unlock · ${locked.length}</span></summary><div class="chore-locked-list">${locked.map(row).join('')}</div></details>`:''}`);
  document.querySelectorAll('[data-chore]').forEach(b=>b.onclick=()=>act({type:'chore',id:b.dataset.chore},r=>{showChoreResult(b.dataset.chore,r);return `Job well done! +${r.coins} coins and +${r.xp} XP.${r.bonus?` Bonus: ${bonusText(r.items)}!`:''}`;}));
 }
 const bonusText=items=>Object.entries(items??{}).map(([item,count])=>`+${count} ${ITEMS[item]?.name.toLowerCase()??item}`).join(', ');
 function showChoreResult(id,result){
  document.getElementById('chore-result')?.remove();
  const c=CHORES[id],dialog=document.createElement('dialog');dialog.id='chore-result';dialog.className='chore-result is-card is-s is-cheer';dialog.setAttribute('aria-labelledby','chore-result-title');
  const found=Object.entries(result.items??{}).map(([item,count])=>`<strong class="chore-prize-bonus">${art(item)}+${count} ${ITEMS[item]?.name.toLowerCase()??item}</strong>`).join('');
  // Two clearly different moments: a find (gold, the goods up front) or a plain finished job (calm, what the next try brings).
  const item=c.bonus.item,missed=`<p class="chore-missed">${art(item)}<span>No ${ITEMS[item].name.toLowerCase()} this time. ${result.nextChance>result.chance?`Practice raised your chance to <b>${result.nextChance}%</b>.`:`Your chance stays <b>${result.nextChance}%</b>.`}</span></p>`;
  dialog.classList.toggle('is-bonus',!!result.bonus);
  dialog.innerHTML=`<span class="chore-result-art">${result.bonus?art(item):art(`chore-${id}`)}</span><h2 id="chore-result-title">${result.bonus?'You found something!':'Job well done'}</h2><p>${c.name}</p><div class="chore-prizes">${found}<strong>${art('coins')}+${result.coins} coins</strong><strong>${art('xp')}+${result.xp} XP</strong></div>${result.bonus?'':missed}<small>${result.bonus&&result.nextChance>result.chance?`Bonus chance now ${result.nextChance}% · `:''}Back in ${formatDuration(c.cooldown)}</small><button class="primary-button">Back to chores</button>`;
  document.body.append(dialog);dialog.querySelector('button').onclick=()=>dialog.close();dialog.onclose=()=>dialog.remove();icons();dialog.showModal();
 }
 // The level a crop opens at on this farm (guided farms follow the new ladder, older farms the crop's own level).
 const cropLevel=key=>guidedFarm(state)?CROP_LEVELS[key]:CROPS[key].minLevel??1;
 // The Medals tab (23 Oct 2026, the same way as the Farm chores window): a medal ready to collect on top, its card marked green with its
 // Collect button beside it (on a phone too); the crops on their way as compact rows, the one closest to its next medal first, each with
 // its four medals small (collected ones in colour, one ready to collect with a green ring), a bar towards the next medal and what it
 // pays; the crops with no harvests yet and the ones still to open folded away as small rows (as Chores to unlock).
 const medalRow=all=>`<span class="mastery-medals">${all.map(t=>`<span class="mastery-medal${t.claimed?' earned':t.progress>=t.target?' is-ready':''}" title="${t.name}: ${number(t.target)} harvests">${art(MEDAL_ART[t.id])}</span>`).join('')}</span>`;
 const toward=t=>`${number(t.progress)} / ${number(t.target)} for ${t.name}`;
 function renderMastery(){
  const crops=Object.keys(CROPS).map(key=>{const all=masteryStatus(state,key);return {key,c:CROPS[key],all,next:all.find(t=>!t.claimed),count:state.mastery.harvests[key]??0,open:cropUnlocked(state,key)};});
  const share=x=>x.next?x.next.progress/x.next.target:-1;
  const ready=crops.filter(x=>x.open&&x.next&&x.next.progress>=x.next.target);
  const later=crops.filter(x=>!x.open||x.all.every(t=>!t.claimed&&!t.progress)).sort((a,b)=>Number(b.open)-Number(a.open)||(a.open?0:cropLevel(a.key)-cropLevel(b.key)));
  const going=crops.filter(x=>!ready.includes(x)&&!later.includes(x)).sort((a,b)=>share(b)-share(a));
  const card=({key,c,all,next})=>`<article class="mastery-card is-ready">${art(key,'mastery-picture')}<div class="mastery-main"><div class="mastery-name"><h3>${c.name}</h3>${medalRow(all)}</div><div class="chore-rewards mastery-rewards"><span class="mastery-won">${art(MEDAL_ART[next.id])}${MEDAL_NAMES[next.id]}</span><span>${art('coins')}+${number(next.coins)}</span><span>${art('xp')}+${next.xp} XP</span></div></div><button class="primary-button" data-mastery="${key}" data-tier="${next.id}">Collect</button></article>`;
  const row=({key,c,all,next,count})=>`<div class="mastery-row${next?'':' is-done'}">${art(key,'mastery-picture')}<div class="mastery-main"><div class="mastery-name"><strong>${c.name}</strong>${medalRow(all)}</div>${next?`<progress max="${next.target}" value="${next.progress}" aria-label="${c.name}: ${number(count)} harvests"></progress><small>${toward(next)}</small>`:'<span class="tag-info">Mastered</span>'}</div>${next?`<span class="mastery-pay"><b>${art('coins')}+${number(next.coins)}</b><small>+${next.xp} XP</small></span>`:''}</div>`;
  const rest=({key,c,all,open})=>`<div class="mastery-later${open?'':' is-locked'}"><span class="mastery-later-art">${art(key,'mastery-picture')}</span><span><strong>${c.name}</strong><small>${open?toward(all[0]):`Opens at level ${cropLevel(key)}`}</small></span>${open?'':art('lock','unlock-lock')}</div>`;
  const total=Object.keys(CROPS).length;
  keepFolds($('estate-content'),`${lead('medal',`Medals at ${MASTERY_TIERS.map(t=>number(t.target)).join(', ')} harvests per crop.`)}<div class="mastery-total medals-total"><strong>${state.mastery.claimed.length} / ${total*MASTERY_TIERS.length} medals</strong><span>Across ${total} crop varieties</span></div><div class="mastery-list">${ready.map(card).join('')}${going.length?`<div class="mastery-rows">${going.map(row).join('')}</div>`:''}</div>${later.length?`<details class="future-unlocks mastery-unlocks" data-fold="medals-later"><summary>${art(MEDAL_ART[0],'unlock-lock')}<span>Not harvested yet · ${later.length}</span></summary><div class="mastery-later-list">${later.map(rest).join('')}</div></details>`:''}`);
  document.querySelectorAll('[data-mastery]').forEach(b=>b.onclick=()=>act({type:'mastery',crop:b.dataset.mastery,tier:Number(b.dataset.tier)},r=>`${MEDAL_NAMES[r.tier]} collected! +${number(r.coins)} coins and +${r.xp} XP.`));
 }
 // Master points (27 Sep 2026): one for every level after 90, each spent on a lasting bonus, ten ranks per branch.
 function renderMaster(){
  const free=state.showcase?0:masterFree(state),total=masterPoints(state);
  const cards=Object.entries(MASTER_BRANCHES).map(([id,b])=>{const rank=masterRank(state,id),full=rank>=b.max;
   return `<article class="order-card master-branch${full?' is-ready':''}"><div class="order-head"><span class="order-icon">${art(b.art)}</span><div><small>Rank ${rank} of ${b.max}${rank?` · now +${Math.round(masterBonus(state,id)*100)}%`:''}</small><h3>${b.name}</h3><p class="valley-line">${b.effect}</p></div></div><div class="master-pips" aria-hidden="true">${Array.from({length:b.max},(_,i)=>`<i class="${i<rank?'is-on':''}"></i>`).join('')}</div><div class="task-bottom">${full?'<span class="quest-state">Highest rank ✓</span>':`<button class="primary-button" data-master="${id}" ${free?'':'disabled'}>Spend a point</button>`}</div></article>`;}).join('');
  $('estate-content').innerHTML=`${lead('star',`Every level after ${MASTER_FROM} gives a Master point. Spend each one on a bonus that lasts.`)}<div class="mastery-total"><strong>${free} ${free===1?'point':'points'} to spend</strong><span>${total} earned in all · the next one at level ${MASTER_FROM+total+1}</span></div><div class="daily-list">${cards}</div>`;
  document.querySelectorAll('[data-master]').forEach(b=>b.onclick=()=>act({type:'master_spend',branch:b.dataset.master},r=>`${r.name} is now rank ${r.rank}.${r.free?` ${r.free} ${r.free===1?'point':'points'} left.`:''}`));
 }
 // Written again only when something on it changes: a timer's minute, a boost that starts or ends (tick, every half second).
 let bonusesShown='';
 function renderBonuses(always=false){const html=bonusesMarkup(bonusOverview(state,farmNow()));if(!always&&html===bonusesShown)return;bonusesShown=html;$('estate-content').innerHTML=html;icons();}
 function readiness(){return [tab,state.estate.job&&farmNow()>=state.estate.job.readyAt,...Object.keys(CHORES).map(id=>farmNow()>=(state.chores[id]??0))].join('|');}
 function refresh(){
  notices();
  if($('estate-dialog').open)render();
 }
 function tick(){
  notices();const s=stallStatus(state,farmNow());
  if(!$('estate-dialog').open||acting)return;
  if(lastReadiness!==readiness()){render();return;}
  if(tab==='stall'){$('stall-balance').innerHTML=`${art('coins')}${number(s.available)}`;$('stall-meter').value=s.balance;$('stall-capacity').textContent=stallNote(s);$('stall-collect').disabled=s.available<1;document.querySelector('.stall-hero')?.classList.toggle('is-full',s.balance>=s.capacity);}
  if(tab==='chores')document.querySelectorAll('[data-chore]').forEach(b=>{const s=choreStatus(state,b.dataset.chore,farmNow()),shown=choreButton(s);b.textContent=shown.text;b.classList.toggle('is-waiting',shown.waiting);b.disabled=s.locked||s.remaining>0;});
  if(tab==='bonuses')renderBonuses();
  if(tab==='projects'&&state.estate.job){const job=state.estate.job;$('project-clock').textContent=farmNow()>=job.readyAt?'Ready to complete':`${formatDuration(job.readyAt-farmNow())} remaining`;$('project-progress').value=Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100);}
 }
 // The Estate button opens what waits: a finished chapter, else a medal to collect (Oct 2026); otherwise the projects, or before they
 // open at 27 (on a computer the button is there from Medals at level 14) its first open tab. Never the stall (8 Oct 2026): it has its own
 // icon and tile and opens on its own, so the Estate button showed only the stall whenever coins waited there. Nor the chores, for the same reason.
 $('estate-button').onclick=()=>open(!projectReady()&&featureUnlocked(state,'mastery')&&medalsWaiting(state).length?'mastery':['projects','mastery'].find(t=>featureUnlocked(state,t))??'projects');
 document.querySelectorAll('[data-estate-tab]').forEach(b=>b.onclick=()=>open(b.dataset.estateTab));
 return {open,refresh,tick};
}
