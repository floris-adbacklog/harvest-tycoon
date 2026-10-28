import {art} from './visual-icons.js';
import {unlockEntries,featureUnlocked,featureUnlockHint,FEATURE_LEVELS,levelOf,levelReward,beginnerProgress,FISH,POND_BOOK2_DIAMONDS,LAKE_FISH,LAKE_BOOK2_DIAMONDS,RECIPES,BUILDINGS,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS,POND_BOOK_REFILL_MS,MILLER_DIAMONDS} from './farm-state.js';
import {PLAYER_AVATARS,avatarGoal,avatarOpen} from './player-avatars.js';
export function progressionSnapshot(state){return {level:levelOf(state),ids:new Set(unlockEntries(state).filter(e=>e.unlocked).map(e=>e.id))};}
export function progressionChange(before,state,reward){return {reward,from:before.level,level:levelOf(state),leveled:levelOf(state)>before.level,entries:unlockEntries(state).filter(e=>e.unlocked&&!before.ids.has(e.id))};}
// A village place (World II) shows as its own kind, 'Village place': it is built from a golden brief at the market square, not from Buildings.
// A landmark (Oct 2026) is the golden brief after the last place: 'Village landmark' in Coming up.
const ROADMAP_KIND={Crop:'New crop','Ready to build':'New building','Ready to expand':'New field',Landmark:'Village landmark'};
// Plan F (13 Oct 2026): of two things at one level the Farm Family comes first, so level 9's card says "Next at level 10: Farm Family"
// (it said Diamond boosts: a diamond teaser at the start of the longest level).
const upcoming=state=>unlockEntries(state).filter(e=>!e.unlocked).sort((a,b)=>a.level-b.level||(b.id==='feature:family')-(a.id==='feature:family')||a.id.localeCompare(b.id));
// Plan F (13 Oct 2026, proposal 4): every line on the level-up card says what opened and where it is, as the pond's line does (five things
// said only "Activity unlocked"; the pond, whose line says where, is fished by 78%). The same place on a phone and a computer (a pin or
// a building on the farm, Today, the diamonds at the top), except Medals: in More on a phone, in Estate on a computer.
const FEATURE_LINES={neighbours:'Rosie, Mei and Otto moved in: More › Neighbours.',shipbin:'Sell tonight for 10% more: To bin at the Market.',challenges:'Three small goals a day, in Today.',activities:'Small jobs at four stops: tap a pin on the farm.',cart:'Customers pay more than the Market: tap the cart.',
 family:'Play together: tap the Family Hall.',boosts:'Spend your diamonds on a boost: tap the diamonds at the top.',chores:'Small jobs for extra coins: tap its pin on the farm.',
 stall:'It earns coins while you are away: tap its pin on the farm.',tractor:'Works many fields at once: tap its pin on the farm.',silo:'Cheaper seeds and quicker crops: tap its pin on the farm.',
 projects:'Big works for your estate: open Estate.',valleymarket:'Full baskets of goods pay more: tap its pin on the farm.',ranch:'Pick one herd to work faster: tap its pin on the farm.',
 estateworkshop:'Improvements that last: tap its pin on the farm.',tradedepot:'Big export loads pay more: tap its pin on the farm.',grandfair:'Win ribbons every week: tap its pin on the farm.',
 master:'Every level gives a point for a lasting bonus, in Estate.',seedlab:'Cross two crops into an heirloom: tap its pin on the farm.',visitors:'Rush orders from the road: tap its pin on the farm.',
 giantpumpkin:'Grow one every week, at the Grand Valley Fair.',valleyprojects:'Big works with lasting bonuses: tap its pin on the farm.',
 'orders:village':'Bigger orders that pay even more: tap the cart.','orders:commission':'One big order a day that pays the most: tap the cart.'};
export function entryLine(e,{phone=false}={}){
 const [kind,key]=e.id.split(':');
 if(e.kind==='Ready to build')return 'Ready to build · open Buildings';
 if(e.kind==='Landmark')return 'Landmark · built from a golden brief at the market square';
 if(e.kind==='Village place')return 'Village place · built from a golden brief at the market square';
 if(e.kind==='Harbour place')return 'Harbour places are built from the harbour master’s works.';   // World III (28 Oct 2026): not from Buildings
 if(e.kind==='Ready to expand')return 'New field · buy it at the Farmhouse';
 if(e.id==='feature:fishing')return 'Activity · tap its pin over the pier';
 if(e.id==='pond:page2')return `Catch all ${Object.keys(FISH).length} kinds: ${POND_BOOK2_DIAMONDS} diamonds and a new cast every ${POND_BOOK_REFILL_MS/60000} minutes.`;
 if(e.id==='lake:open')return 'Fish from the rowboat in the village: its own casts and fish.';
 if(e.id==='lake:page2')return `Catch all ${Object.keys(LAKE_FISH).length} kinds: ${LAKE_BOOK2_DIAMONDS} diamonds, once.`;
 if(e.id==='village:week')return `Help ${VILLAGE_WEEK_TARGET} villagers in a week for ${VILLAGE_CRATE_DIAMONDS} diamonds, at the market square.`;
 if(e.id==='village:miller')return `Heirloom bakes for the miller each week: coins and ${MILLER_DIAMONDS} diamonds, at the market square.`;
 if(e.id==='feature:mastery')return phone?'Rewards for every crop you grow, in More.':'Rewards for every crop you grow, in Estate.';
 if(kind==='feature'&&FEATURE_LINES[key])return FEATURE_LINES[key];
 if(FEATURE_LINES[e.id])return FEATURE_LINES[e.id];
 if(kind==='recipe'&&BUILDINGS[RECIPES[key]?.building])return `Make it at the ${BUILDINGS[RECIPES[key].building].name}.`;
 if(kind==='crop')return 'Pick it in the seed shop and plant it on a field.';
 if(kind==='improvement')return 'Build it once at the Estate Workshop: it works for good.';
 return e.kind+' unlocked';
}
// The first thing a coming level opens (the level card and the level-up screen show it, so there is always a next goal).
export const nextUnlock=state=>upcoming(state)[0]??null;
export function roadmapMarkup(state){const next=upcoming(state).slice(0,3);return next.length?`<section class="unlock-roadmap"><h3>Coming up</h3>${next.map(e=>`<div class="roadmap-entry">${art(e.art)}<div><strong>${e.name}</strong><span>${ROADMAP_KIND[e.kind]??e.kind}</span></div><b class="roadmap-level">Level ${e.level}</b></div>`).join('')}</section>`:'';}
// fold: its key for public/keep-folds.js (16 Oct 2026), so it stays open when its window draws its list anew.
export function foldLocked(container,selector,isLocked,title,fold=''){
 const locked=[...container.querySelectorAll(selector)].filter(isLocked);if(!locked.length)return;
 const details=document.createElement('details');details.className='future-unlocks';if(fold)details.dataset.fold=fold;
 const summary=document.createElement('summary');summary.innerHTML=art('lock','unlock-lock');const label=document.createElement('span');label.textContent=`${title} · ${locked.length}`;summary.append(label);
 const grid=document.createElement('div');grid.className='future-unlocks-grid';grid.append(...locked);details.append(summary,grid);container.append(details);
}
// The level avatars (player-avatars.js) a level-up has opened: every level passed since `from`, and every level the rewards were for.
export function newAvatars(p){const levels=new Set(p.reward?.levels??[]);for(let l=(p.from??p.level)+1;l<=p.level;l++)levels.add(l);return PLAYER_AVATARS.filter(a=>levels.has(a.level));}
export function mergeRewards(a,b){const levels=[...new Set([...(a?.levels??[]),...(b?.levels??[])])].sort((x,y)=>x-y);return {levels,...levels.reduce((sum,l)=>{const r=levelReward(l);return {coins:sum.coins+r.coins,diamonds:sum.diamonds+r.diamonds};},{coins:0,diamonds:0})};}
// The one line for what opened without a new level (11 Oct 2026, A6): at most three names, then "and more".
export const newLine=n=>n.length===1?`New: ${n[0]}.`:n.length===2?`New: ${n[0]} and ${n[1]}.`:n.length===3?`New: ${n[0]}, ${n[1]} and ${n[2]}.`:`New: ${n[0]}, ${n[1]}, ${n[2]} and more.`;
// share: Share my farm (public/farm-share.js), or null in the village. On a level-up (or the catch-up rewards) it is a quiet button
// beside Keep growing (one green button per window, Oct 2026); the picture and its buttons open in the card, above them.
// phone(): the phone layout (mobile-ui.js mobileLayout's query; this file cannot import it, it asks the browser as it loads).
export function createProgressionUI({state,isReady,share=null,notify=null,phone=()=>globalThis.matchMedia?.('(max-width: 900px), (max-height: 550px) and (pointer: coarse)')?.matches??false}){
 const dialog=document.createElement('dialog');dialog.id='level-up-dialog';dialog.className='is-card is-s is-cheer';dialog.setAttribute('aria-labelledby','level-up-title');
 document.body.append(dialog);let pending=null,timer;
 dialog.addEventListener('close',()=>share?.reset(dialog.querySelector('.farm-share-box')));
 function schedule(){clearTimeout(timer);timer=setTimeout(flush,100);}
 function flush(){
  if(!pending||!isReady()||document.querySelector('dialog[open]'))return;
  const p=pending;pending=null;const faces=[...newAvatars(p),...(p.avatars??[])],sharing=Boolean((p.leveled||p.catchUp)&&share?.available());
  // Plan F (13 Oct 2026): what the farmer's own action opened (a building built opens its recipes) waits for its line while a window is open;
  // a level reached before that window closed showed it again on its card ("Feed the cows" on level 6 for a Dairy Barn built at 5, "Bake
  // fresh bread" on 9). A level's card names only what the level opened; the building's window showed its recipes already.
  const entries=p.leveled||p.catchUp?p.entries.filter(e=>!p.acted?.includes(e.id)):p.entries;
  // Level 2 comes with the very first harvest (6 Oct 2026: a quarter of new farmers left right after its window, and most never found the
  // Market): a short toast instead, and the guide points the way to the Market (beginner-ui.js). The window from level 3.
  // 7 Oct 2026: the toast names what level 2 opens (the Feed Mill and field 9 were never announced).
  // 11 Oct 2026 (Part A, A11): with the first basket it is the one line that speaks, and it says the next step (it named the Feed Mill at the
  // exact second the guide asked to sell; the guide's own "✓ Your first basket" line steps aside for it, beginner-ui.js). 20 Oct 2026: and that
  // the first sale pays double (farm-state.js firstSaleDouble).
  if(notify&&p.leveled&&!p.catchUp&&p.level===2&&!p.avatars?.length){notify(beginnerProgress(state).find(q=>q.current)?.id==='sell'?'Level 2! Next: sell your corn in Market. Your first sale pays double.':p.entries.some(e=>e.id==='building:mill')?'Level 2! You can now build the Feed Mill and buy a new field.':`Level ${p.level}! One harvest at a time, your farm is growing.`);return;}
  // A new level gets its card; what opens because of something the farmer just did (a building built opens its recipes, a field bought)
  // is named in one line at the top instead (11 Oct 2026, Part A A6: about 2 to 3 cards fewer in the first 15 minutes, some of them for a
  // building just built). An avatar earned keeps its card. Each name is a part of its own, so it is translated as a name.
  if(notify&&!p.leveled&&!p.catchUp&&!faces.length&&p.entries.length){notify(newLine(p.entries.map(e=>e.name)));return;}
  // The village lake's lines (12 Oct 2026, plan D): level 100's says where it is, level 120's what the whole book pays (the book's words).
    // The window shell (18 Oct 2026): the level big on the star, a catch-up titled by its levels, no line that says nothing new.
  const paid=p.reward?.levels??[],span=paid.length>1?`Levels ${paid[0]}–${paid.at(-1)}`:`Level ${paid[0]??p.level} rewards`;
  dialog.innerHTML=`<button class="level-up-close" aria-label="Close celebration">×</button><div class="level-up-medal"><img class="level-up-art" src="/assets/icons/level-up.webp" alt="">${p.leveled||p.catchUp?`<b>${p.level}</b>`:''}</div><h2 id="level-up-title">${p.catchUp?span:p.leveled?`Level ${p.level}!`:'Unlocked!'}</h2>${p.leveled?'<p>One harvest at a time, your farm is growing.</p>':''}${entries.length||faces.length?`<ul>${entries.map(e=>`<li>${art(e.art)}<div><strong>${e.name}</strong><span>${entryLine(e,{phone:phone()})}</span></div></li>`).join('')}${faces.map(a=>`<li><img class="level-up-avatar" src="${a.src}" alt="" width="40" height="44"><div><strong>${a.name}</strong><span>New avatar: pick it in Settings</span></div></li>`).join('')}</ul>`:'<p>Keep planting, making and trading. Your next milestone is ahead.</p>'}${p.reward?.levels.length?`<div class="level-up-rewards"><strong class="reward-coins reward-big">${art('coins')}+${p.reward.coins.toLocaleString('en-US')} coins</strong><strong class="reward-diamonds reward-big">${art('diamonds')}+${p.reward.diamonds} ${p.reward.diamonds===1?'diamond':'diamonds'}</strong></div>${p.reward.levels.length>1&&!p.catchUp?`<p class="level-up-note">Rewards for levels ${p.reward.levels[0]}–${p.reward.levels.at(-1)}.</p>`:''}`:''}${(next=>next?`<p class="level-up-next">${art(next.art)}<span>Next at level ${next.level}: <strong>${next.name}</strong></span></p>`:'')(nextUnlock(state))}${sharing?'<div class="farm-share-box" hidden aria-live="polite"></div><div class="level-up-actions"><button type="button" class="secondary-button level-up-share">Share my farm</button><button class="primary-button level-up-done">Keep growing</button></div>':'<button class="primary-button level-up-done">Keep growing</button>'}`;
  dialog.querySelector('.level-up-close').onclick=()=>dialog.close();dialog.querySelector('.level-up-done').onclick=()=>dialog.close();
  const shareButton=dialog.querySelector('.level-up-share');if(shareButton)shareButton.onclick=()=>void share.open({source:'level_up',box:dialog.querySelector('.farm-share-box'),button:shareButton});
  dialog.showModal();
 }
 function announce(change){if(!change.leveled&&!change.entries.length&&!change.reward?.levels.length&&!change.avatars?.length)return;const acted=change.leveled||change.catchUp?[]:change.entries.map(e=>e.id);pending=pending?{acted:[...(pending.acted??[]),...acted],avatars:[...new Map([...(pending.avatars??[]),...(change.avatars??[])].map(a=>[a.id,a])).values()],from:Math.min(pending.from??pending.level,change.from??change.level),level:Math.max(pending.level,change.level),catchUp:pending.catchUp||change.catchUp,reward:mergeRewards(pending.reward,change.reward),leveled:pending.leveled||change.leveled,entries:[...new Map([...pending.entries,...change.entries].map(e=>[e.id,e])).values()]}:{...change,acted};schedule();}
 // The side-tool bar (desktop) only has room for what is already open, so a locked feature simply is not there yet.
 // The avatar picker (avatar-settings.js) opens a level or achievement avatar as soon as the farm gets there; an achievement avatar
 // earned while playing is also announced here, like an unlock (the ones the farm already had when the game opened are not).
 let toldLevel=0,toldGoals=null;
 function tellLevel(){
  const level=levelOf(state),goals=PLAYER_AVATARS.filter(a=>avatarGoal(a.id)&&avatarOpen(a.id,{state}));
  const earned=toldGoals?goals.filter(a=>!toldGoals.has(a.id)):[];
  if(level>toldLevel||earned.length){toldLevel=Math.max(toldLevel,level);window.dispatchEvent(new CustomEvent('harvest-level',{detail:{level,state}}));}
  if(earned.length)announce({leveled:false,level,entries:[],reward:null,avatars:earned});
  toldGoals=new Set(goals.map(a=>a.id));
 }
 function refresh(){
  tellLevel();
  // The Estate button (computers; phones have it in More) is there from Medals at level 14 (level 7 until 9 Oct 2026): a computer has no More menu, so
  // before the projects open at 27 it was no way to Medals at all. Its window shows only the tabs that are open.
  const sideTools={'#boosts-button':'boosts','#estate-button':'mastery'};
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
