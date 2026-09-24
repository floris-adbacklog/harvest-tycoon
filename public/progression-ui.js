import {art} from './visual-icons.js';
import {unlockEntries,featureUnlocked,featureUnlockHint,FEATURE_LEVELS,levelOf,levelReward} from './farm-state.js';
export function progressionSnapshot(state){return {level:levelOf(state),ids:new Set(unlockEntries(state).filter(e=>e.unlocked).map(e=>e.id))};}
export function progressionChange(before,state,reward){return {reward,level:levelOf(state),leveled:levelOf(state)>before.level,entries:unlockEntries(state).filter(e=>e.unlocked&&!before.ids.has(e.id))};}
const ROADMAP_KIND={Crop:'New crop','Ready to build':'New building','Ready to expand':'New field'};
const upcoming=state=>unlockEntries(state).filter(e=>!e.unlocked).sort((a,b)=>a.level-b.level||a.id.localeCompare(b.id));
// The first thing a coming level opens (the level card and the level-up screen show it, so there is always a next goal).
export const nextUnlock=state=>upcoming(state)[0]??null;
export function roadmapMarkup(state){const next=upcoming(state).slice(0,3);return next.length?`<section class="unlock-roadmap"><h3>Coming up</h3>${next.map(e=>`<div class="roadmap-entry">${art(e.art)}<div><strong>${e.name}</strong><span>${ROADMAP_KIND[e.kind]??e.kind}</span></div><b class="roadmap-level">Level ${e.level}</b></div>`).join('')}</section>`:'';}
export function foldLocked(container,selector,isLocked,title){
 const locked=[...container.querySelectorAll(selector)].filter(isLocked);if(!locked.length)return;
 const details=document.createElement('details');details.className='future-unlocks';
 const summary=document.createElement('summary');summary.innerHTML=art('lock','unlock-lock');const label=document.createElement('span');label.textContent=`${title} · ${locked.length}`;summary.append(label);
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
  dialog.innerHTML=`<button class="level-up-close" aria-label="Close celebration">×</button><img class="level-up-art" src="/assets/icons/level-up.webp" alt=""><p class="eyebrow">${p.leveled?'LOOK HOW YOU HAVE GROWN':'A NEW POSSIBILITY'}</p><h2 id="level-up-title">${p.catchUp?'Your level rewards':p.leveled?`Level ${p.level}!`:'Unlocked!'}</h2><p>${p.leveled?'One harvest at a time, your farm is growing.':'Your hard work has opened something new.'}</p>${p.entries.length?`<ul>${p.entries.map(e=>`<li>${art(e.art)}<div><strong>${e.name}</strong><span>${e.kind==='Ready to build'?'Ready to build · open Buildings':e.kind==='Ready to expand'?'New field · buy it at the Farmhouse':e.kind+' unlocked'}</span></div></li>`).join('')}</ul>`:'<p>Keep planting, making and trading. Your next milestone is ahead.</p>'}${p.reward?.levels.length?`<div class="level-up-rewards"><strong class="reward-coins">${art('coins')}+${p.reward.coins.toLocaleString('en-US')} coins</strong><strong class="reward-diamonds">${art('diamonds')}+${p.reward.diamonds} ${p.reward.diamonds===1?'diamond':'diamonds'}</strong></div>${p.reward.levels.length>1?`<p class="level-up-note">Rewards for levels ${p.reward.levels[0]}–${p.reward.levels.at(-1)}.</p>`:''}`:''}${(next=>next?`<p class="level-up-next">${art(next.art)}<span>Next at level ${next.level}: <strong>${next.name}</strong></span></p>`:'')(nextUnlock(state))}<button class="primary-button level-up-done">Keep growing</button>`;
  dialog.querySelector('.level-up-close').onclick=()=>dialog.close();dialog.querySelector('.level-up-done').onclick=()=>dialog.close();dialog.showModal();
 }
 function announce(change){if(!change.leveled&&!change.entries.length&&!change.reward?.levels.length)return;pending=pending?{level:Math.max(pending.level,change.level),catchUp:pending.catchUp||change.catchUp,reward:mergeRewards(pending.reward,change.reward),leveled:pending.leveled||change.leveled,entries:[...new Map([...pending.entries,...change.entries].map(e=>[e.id,e])).values()]}:change;schedule();}
 // The side-tool bar (desktop) only has room for what is already open, so a locked feature simply is not there yet.
 function refresh(){
  const sideTools={'#boosts-button':'boosts','#estate-button':'projects'};
  for(const [selector,feature]of Object.entries(sideTools))document.querySelectorAll(selector).forEach(el=>el.hidden=!featureUnlocked(state,feature));
  // The "More" menu (mobile) is everything on the farm, so it always shows every entry: what is not open yet stays visible, gets a lock and
  // "Reach level N." in place of its usual description, and cannot be tapped, so the game never looks emptier than it is this early.
  const moreMenuGates={'[data-menu-action="boosts-button"]':'boosts','[data-menu-action="estate-button"]':'projects'};
  const lockable=[...document.querySelectorAll('[data-menu-utility]')].map(el=>[el,el.dataset.menuUtility]).concat([...document.querySelectorAll('[data-menu-action="boosts-button"],[data-menu-action="estate-button"]')].map(el=>[el,moreMenuGates[`[data-menu-action="${el.dataset.menuAction}"]`]]));
  for(const [el,feature] of lockable){
   // Locked entries line up after the open ones, lowest level first; once open, an entry is back in its usual place.
   const unlocked=featureUnlocked(state,feature);el.disabled=!unlocked;el.classList.toggle('locked',!unlocked);el.style.order=unlocked?'':String(100+FEATURE_LEVELS[feature]);
   const hint=el.querySelector('.menu-hint');if(hint){if(!hint.dataset.open)hint.dataset.open=hint.textContent;hint.textContent=unlocked?hint.dataset.open:`Reach level ${FEATURE_LEVELS[feature]}.`;}
   el.setAttribute('aria-disabled',String(!unlocked));if(!unlocked)el.title=featureUnlockHint(feature);else el.removeAttribute('title');
  }
  schedule();
 }
 document.addEventListener('close',schedule,true);
 window.addEventListener('pagehide',()=>{clearTimeout(timer);document.removeEventListener('close',schedule,true);},{once:true});
 return {announce,refresh};
}
