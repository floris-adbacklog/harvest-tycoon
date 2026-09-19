import {unlockEntries,featureUnlocked,levelOf,levelReward} from './farm-state.js';
export function progressionSnapshot(state){return {level:levelOf(state),ids:new Set(unlockEntries(state).filter(e=>e.unlocked).map(e=>e.id))};}
export function progressionChange(before,state,reward){return {reward,level:levelOf(state),leveled:levelOf(state)>before.level,entries:unlockEntries(state).filter(e=>e.unlocked&&!before.ids.has(e.id))};}
export function roadmapMarkup(state){const next=unlockEntries(state).filter(e=>!e.unlocked).sort((a,b)=>a.level-b.level).slice(0,6);return next.length?`<section class="unlock-roadmap"><h3>Next on your farm</h3><p>Grow at your own pace. New possibilities open as you play.</p>${next.map(e=>`<div><strong>${e.name}</strong><span>${e.hint}</span></div>`).join('')}</section>`:'';}
export function foldLocked(container,selector,isLocked,title){
 const locked=[...container.querySelectorAll(selector)].filter(isLocked);if(!locked.length)return;
 const details=document.createElement('details');details.className='future-unlocks';
 const summary=document.createElement('summary');summary.textContent=`${title} · ${locked.length}`;
 const grid=document.createElement('div');grid.className='future-unlocks-grid';grid.append(...locked);details.append(summary,grid);container.append(details);
}
export function mergeRewards(a,b){const levels=[...new Set([...(a?.levels??[]),...(b?.levels??[])])].sort((x,y)=>x-y);return {levels,...levels.reduce((sum,l)=>{const r=levelReward(l);return {coins:sum.coins+r.coins,diamonds:sum.diamonds+r.diamonds};},{coins:0,diamonds:0})};}
export function createProgressionUI({state,isReady}){
 const dialog=document.createElement('dialog');dialog.id='level-up-dialog';dialog.setAttribute('aria-labelledby','level-up-title');
 document.body.append(dialog);let pending=null,timer;
 function schedule(){clearTimeout(timer);timer=setTimeout(flush,100);}
 function flush(){
  if(!pending||!isReady()||document.querySelector('dialog[open]'))return;
  const p=pending;pending=null;
  dialog.innerHTML=`<button class="level-up-close" aria-label="Close celebration">×</button><img class="level-up-art" src="/assets/icons/level-up.png" alt=""><p class="eyebrow">${p.leveled?'LOOK HOW YOU HAVE GROWN':'A NEW POSSIBILITY'}</p><h2 id="level-up-title">${p.catchUp?'Your level rewards':p.leveled?`Level ${p.level}!`:'Unlocked!'}</h2><p>${p.leveled?'One harvest at a time, your farm is growing.':'Your hard work has opened something new.'}</p>${p.entries.length?`<ul>${p.entries.map(e=>`<li><strong>${e.name}</strong><span>${e.kind==='Ready to build'?'Ready to build · open Buildings':e.kind+' unlocked'}</span></li>`).join('')}</ul>`:'<p>Keep planting, making and trading. Your next milestone is ahead.</p>'}${p.reward?.levels.length?`<div class="level-up-rewards"><strong>+${p.reward.coins.toLocaleString('en-US')} coins</strong><strong>+${p.reward.diamonds} diamonds</strong></div><p class="level-up-note">${p.reward.levels.length>1?`Rewards for levels ${p.reward.levels[0]}–${p.reward.levels.at(-1)}. `:''}Added to your account automatically.</p>`:''}<button class="primary-button level-up-done">Keep growing</button>`;
  dialog.querySelector('.level-up-close').onclick=()=>dialog.close();dialog.querySelector('.level-up-done').onclick=()=>dialog.close();dialog.showModal();
 }
 function announce(change){if(!change.leveled&&!change.entries.length&&!change.reward?.levels.length)return;pending=pending?{level:Math.max(pending.level,change.level),catchUp:pending.catchUp||change.catchUp,reward:mergeRewards(pending.reward,change.reward),leveled:pending.leveled||change.leveled,entries:[...new Map([...pending.entries,...change.entries].map(e=>[e.id,e])).values()]}:change;schedule();}
 function refresh(){
  const gates={'#boosts-button':'boosts','#estate-button':'projects','[data-menu-action="boosts-button"]':'boosts','[data-menu-action="estate-button"]':'projects'};
  for(const [selector,feature]of Object.entries(gates))document.querySelectorAll(selector).forEach(el=>el.hidden=!featureUnlocked(state,feature));
  document.querySelectorAll('[data-utility],[data-menu-utility]').forEach(el=>el.hidden=!featureUnlocked(state,el.dataset.utility??el.dataset.menuUtility));
  schedule();
 }
 document.addEventListener('close',schedule,true);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);document.removeEventListener('close',schedule,true);},{once:true});
 return {announce,refresh};
}
