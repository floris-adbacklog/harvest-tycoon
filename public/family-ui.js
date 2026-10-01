import {confirmAction} from './confirm-dialog.js';
import {skeleton} from './skeleton.js';
import {createSocialUI} from './social-ui.js';
import {avatarImage} from './player-avatars.js';
import {vipBadge,refreshVipBadges} from './vip-ui.js';
import {renderFamilyInvitation,renderSentInvitations,createFamilyInviteSearch,inviteBlocker} from './family-invitations-ui.js';
import {renderFamilyOrderRewards} from './family-order-rewards.js';
import {renderFamilyTournament} from './family-tournament.js';
import {createFamilyProfile,rankChip} from './family-profile.js';
import {FAMILY_MIN_LEVEL,FAMILY_MIN_LEVELS,worldTwoItem,FAMILY_EMBLEMS,FAMILY_JOIN_MODES,FAMILY_RANKS,FAMILY_MAX_COLEADERS,familyUnlocked,ITEMS,BUILDINGS,formatDuration,itemAvailable,itemUnlockLevel,itemBuilding,levelOf} from './farm-state.js';
import {emblemPickerMarkup,bindEmblemPickers} from './emblem-picker.js';
import {art,refreshArt} from './visual-icons.js';
import {farmNow} from './farm-client.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const emblemName=e=>({'family-bee':'Honeybee','family-oak':'Oak grove','family-barn':'Sunrise barn','family-fox':'Cosy fox','family-owl':'Wise owl','family-windmill':'Wheat windmill','family-horseshoe':'Lucky horseshoe'}[e.icon]??ITEMS[e.icon]?.name??e.icon.charAt(0).toUpperCase()+e.icon.slice(1));
// Who can join, in one plain sentence each (Family settings and the list of families).
const MODE_HELP={open:'Anyone can find your family in the list and join straight away.',request:'Farmers ask to join from the list; you accept or decline.',invite:'Farmers join only when you invite them by their player name.',closed:'Nobody new can join, not even by invitation.'};
const emblem=id=>{const e=FAMILY_EMBLEMS.find(x=>x.id===id)??FAMILY_EMBLEMS[0];return `<span class="family-emblem" style="--family-color:${e.color}">${art(e.icon)}</span>`;};
export function createFamilyUI({state,runAction,notify,isReady}){
 // Daily sharing has a tab of its own (Sharing); it borrows this view's portraits and levels.
 const social=createSocialUI({state,notify,refreshFarm:()=>window.harvestRefresh(),getMembers:()=>view?.members??[]});
 const dialog=document.getElementById('family-dialog'),content=document.getElementById('family-content'),button=document.getElementById('family-button'),dot=document.getElementById('family-dot');
 let view=null,tab='week',busy=false,reading=false,lastRead=0,generation=0,error='';
 const familyProfile=createFamilyProfile({emblem,act,openFamily:()=>open()});
 const inviteSearch=createFamilyInviteSearch({request:body=>window.parent.harvestBridge.request(body),onInvite:act,getView:()=>view,playerId:window.parent.harvestBridge.playerId,isBusy:()=>busy});
 const disabled=condition=>condition||busy?'disabled':'';
 const actionButton=(type,label,data='',condition=false)=>`<button type="button" class="small-button" data-family-action="${type}" ${data} ${disabled(condition)}>${label}</button>`;
 // What a reward is for: the weekly order, the tournament, or a tier of the Family Chest (with its own chest picture).
 const CHEST_NAMES={'chest-wood':'Wooden chest','chest-iron':'Iron chest','chest-silver':'Silver chest','chest-gold':'Golden chest'};
 const rewardName=r=>r.kind==='order'?'Family Order':CHEST_NAMES[r.kind]?`Family Chest · ${CHEST_NAMES[r.kind]}`:'Family Tournament';
 const rewardArt=r=>CHEST_NAMES[r.kind]?art(`family-${r.kind}`):art('gift');
 const isChest=r=>Boolean(CHEST_NAMES[r.kind]);
 const rewardRow=(r,short=false)=>`<div class="family-reward">${rewardArt(r)}<div><strong>${short&&CHEST_NAMES[r.kind]?CHEST_NAMES[r.kind]:rewardName(r)}</strong><span>${[r.coins?`${num(r.coins)} coins`:null,r.xp?`${num(r.xp)} XP`:null,r.diamonds?`${num(r.diamonds)} diamonds`:null].filter(Boolean).join(' · ')}</span><small>Claim within ${formatDuration(r.expiresAt-farmNow())}</small></div>${actionButton('family_claim','Collect',`data-reward-id="${esc(r.id)}"`)}</div>`;
 const rewardCards=(list=view.rewards)=>list.length?`<section class="family-rewards"><h3>Rewards to collect</h3>${list.map(rewardRow).join('')}</section>`:'';
 function landing(){
  const cooldown=view.cooldownUntil>farmNow();
  return `${renderFamilyInvitation(view,farmNow(),emblem,actionButton)}${rewardCards()}<div class="family-welcome is-compact">${art('family-members')}<div><h3>A little farm. A bigger family.</h3><p>Fill a Family Chest together every week, share a weekly order and help each other grow. Up to ${view.config.maxMembers} farmers.</p></div></div>${cooldown?`<p class="family-notice">You can join or create a family in ${formatDuration(view.cooldownUntil-farmNow())}.</p>`:''}${browse(cooldown)}<details class="family-create-fold"${(view.families??[]).some(f=>!f.full&&(f.mode==='open'||f.mode==='request'))?'':' open'}><summary><strong>Start your own family</strong><span>Anyone can join it; you can change that later</span></summary><div class="family-join-grid family-create-grid"><form data-family-form="create"><label for="family-name">Family name</label><input id="family-name" name="name" required minlength="3" maxlength="20" placeholder="Meadow friends" autocomplete="off">${emblemPickerMarkup({emblems:FAMILY_EMBLEMS,checkedId:FAMILY_EMBLEMS[0].id,legend:'Choose your emblem',nameOf:emblemName,tile:emblem,esc})}<button class="primary-button" ${disabled(cooldown)}>Create family</button></form></div></details>`;
 }
 // Every family, with who can join and how: Join, Ask to join (or cancel your request), or why not. Open ones come first.
 function browse(cooldown){
  const list=view.families??view.openFamilies??[],mine=view.myRequest;
  const myLevel=levelOf(state),low=f=>(f.mode==='open'||f.mode==='request')&&myLevel<(f.minLevel??FAMILY_MIN_LEVEL);
  const action=f=>f.full?'<span class="family-mode-chip">Full</span>'
   :low(f)?`<span class="family-mode-chip">From level ${f.minLevel}</span>`
   :f.mode==='open'?actionButton('family_join','Join',`data-family-id="${esc(f.id)}"`,cooldown)
   :f.mode==='request'?(mine?.family.id===f.id?actionButton('family_request_cancel','Cancel request',`data-request-id="${esc(mine.id)}"`):actionButton('family_request','Ask to join',`data-family-id="${esc(f.id)}"`,cooldown||!!mine))
   :`<span class="family-mode-chip">${FAMILY_JOIN_MODES[f.mode]}</span>`;
  const note=mine?`<p class="family-notice">You asked to join ${esc(mine.family.name)}. Their leader or a co-leader can accept it for ${formatDuration(mine.expiresAt-farmNow())}.</p>`:'';
  return `<section class="family-browse"><h3>Join a family</h3>${note}${list.length?list.map(f=>`<div class="family-list-row${mine?.family.id===f.id?' is-requested':''}"><button type="button" class="family-list-open" data-family-profile="${esc(f.id)}">${emblem(f.emblem)}<div><strong>${esc(f.name)} <small class="family-level-chip">Level ${f.level??1}</small></strong><span>${f.members} / ${view.config.maxMembers} farmers · ${f.active??0} active${(f.minLevel??FAMILY_MIN_LEVEL)>FAMILY_MIN_LEVEL&&(f.mode==='open'||f.mode==='request')&&!low(f)?` · level ${f.minLevel}+`:''}</span></div></button>${action(f)}</div>`).join(''):'<p>No families yet. Create the first one!</p>'}${list.some(f=>!f.full&&f.mode!=='open')?'<p class="family-footnote">Request to join: the leader or a co-leader decides. Invite only: they invite you by your player name.</p>':''}</section>`;
 }
 function prizePreview(){
  const t=view.tournament;
  return `<section class="family-prize-preview">${art('diamonds')}<div><strong>${t.entered?`${num(t.yourDiamonds)} diamonds for you`:'Your first delivery enters the tournament'}</strong><span>${t.entered?'At current standings · collect after Monday, 00:00 UTC':'Deliver anything from the Family Order to join. Solo families can win too.'}</span>${t.entered&&t.yourDiamonds===0?`<small>${t.yourRank>3?'Reach the top three to win a prize.':'Your share follows your contribution points.'}</small>`:''}</div></section>`;
 }
 function week(){
  const o=view.order,locked=view.contributionLocked;
  const lines=Object.entries(o.lines),isDone=([k,n])=>(o.filled[k]??0)>=n,complete=lines.filter(isDone).length;
  const total=lines.reduce((n,[,t])=>n+t,0),delivered=lines.reduce((n,[k,t])=>n+Math.min(t,o.filled[k]??0),0);
  const place=[...view.members].sort((a,b)=>b.points-a.points).findIndex(m=>m.isSelf)+1;
  // What you can hand in now comes first, then what still needs stock, and finished lines last.
  const order=([k,n])=>isDone([k,n])?2:!locked&&(state.inventory[k]??0)>0?0:1;
  // A line you cannot help with yet (the good unlocks later, or needs a building you do not have) waits in one grey "Later" fold.
  const waitsLater=([key,target])=>(o.filled[key]??0)<target&&(state.inventory[key]??0)<1&&!itemAvailable(state,key);
  // …unless every open line waits: then nothing is folded away and the order shows as it is.
  const open=lines.filter(l=>!isDone(l)),later=l=>waitsLater(l)&&open.some(x=>!waitsLater(x));
  const line=([key,target])=>{
   const filled=o.filled[key]??0,stock=state.inventory[key]??0,max=Math.min(stock,target-filled),done=filled>=target;
   // One clear button for everything you can hand in now, and +1 beside it for a careful farmer.
   const actions=done?'<span class="family-done">✓ Complete</span>':locked||stock<1?'':`${max>1?actionButton('family_contribute','+1',`data-item="${key}" data-count="1"`):''}<button type="button" class="primary-button family-deliver" data-family-action="family_contribute" data-item="${key}" data-count="${max}" ${disabled(max<1)}>Deliver ${num(max)}</button>`;
   return `<article class="family-order-line${done?' is-done':order([key,target])===0?' is-ready':''}">${art(key)}<div class="family-line-copy"><strong>${ITEMS[key].name}</strong><span>${num(filled)} / ${num(target)} delivered · ${stock<1&&!done&&!itemAvailable(state,key)?(levelOf(state)<itemUnlockLevel(key)?`unlocks at level ${itemUnlockLevel(key)}`:`needs the ${BUILDINGS[itemBuilding(key)]?.name??'right building'}`):`${num(stock)} in stock`}</span><progress max="${target}" value="${filled}" aria-label="${ITEMS[key].name} delivered"></progress></div><div class="family-line-actions">${actions}</div></article>`;
  };
  // A delivered line is a small chip (26 Sep 2026: four finished lines took a full row each); open lines keep their buttons.
  const chip=([key,target])=>`<span class="family-done-chip">${art(key)}<span>✓ ${ITEMS[key].name} ${num(Math.min(o.filled[key]??0,target))}/${num(target)}</span></span>`;
  const done=lines.filter(isDone),chips=`<div class="family-done-chips">${done.map(chip).join('')}</div>`;
  // 2. The Family Order as one card: title, where it stands and the time left in one line, and the bar (27 Sep 2026: three blocks).
  return `${rewardCards(view.rewards.filter(r=>!isChest(r)))}${aloneNote()}${chestCard()}<section class="family-order-card"><div class="family-order-head">${art('family-weekly-order')}<div><span class="eyebrow">${o.completed?'ORDER COMPLETE':'THIS WEEK'}</span><h3>${o.completed?'Order complete!':'Family Order'}</h3><p><b>${complete} / ${lines.length}</b> lines · <b>${num(view.yourPoints)}</b> ${view.yourPoints>0&&place?`your points (#${place})`:'your points'} · <b data-family-countdown>${formatDuration(Math.max(0,view.endsAt-farmNow()))}</b> left</p></div></div><progress max="${Math.max(1,total)}" value="${delivered}" aria-label="Family Order delivered"></progress>${locked?'<p class="family-notice">You have already contributed to another family this week. You can help this family next week.</p>':''}${o.completed?'':`<details class="family-rewards-fold"><summary><strong>Your rewards</strong><span>when the order is complete</span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary>${renderFamilyOrderRewards(view)}</details>`}</section>

  ${o.completed?`${view.rewards.some(r=>r.kind==='order')?'':renderFamilyOrderRewards(view)}<details class="family-done-fold"><summary><span><strong>✓ ${done.length} ${done.length===1?'line':'lines'} delivered</strong></span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary>${chips}</details>`
   :`<div class="family-order">${open.filter(l=>!later(l)).sort((a,b)=>order(a)-order(b)).map(line).join('')}</div>${done.length?`<div class="family-done-row"><span>Delivered</span>${chips}</div>`:''}`}
  ${lines.some(later)?`<details class="family-later"><summary><span><strong>Later (${lines.filter(later).length})</strong><small>These open with a higher level or another building</small></span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="family-order">${lines.filter(later).map(line).join('')}</div></details>`:''}
  ${locked||o.completed?'':'<p class="family-footnote">Deliveries count for the tournament too and cannot be taken back.</p>'}`;
 }
 // Tournament goods (on the Tournament tab since 30 Sep 2026: they count for the tournament only), once an order line is full.
 function extraGoods(){
  const o=view.order,locked=view.contributionLocked,extrasOpen=Object.entries(o.lines).some(([k,n])=>(o.filled[k]??0)>=n);
  const available=Object.entries(ITEMS).filter(([k,item])=>item.sell>0&&state.inventory[k]>0&&!worldTwoItem(k));   // never World II's goods
  return `<details class="family-extra"><summary><span><strong>Tournament goods</strong><small>${extrasOpen?'Extra points for your family':'Fill an order line to unlock'}</small></span></summary><p>Extra goods count for the weekly tournament only (no coins, XP or diamonds), as many as you like. They are handed in permanently.</p>${extrasOpen&&available.length?`<form data-family-form="extra"><label for="family-extra-item">Goods to contribute</label><select id="family-extra-item" name="item">${available.map(([key,item])=>`<option value="${key}" data-art="${key}" data-note="${num(state.inventory[key])} in stock · ${num(item.sell)} points each">${esc(item.name)}</option>`).join('')}</select><label for="family-extra-count">Quantity</label><input id="family-extra-count" name="count" type="number" inputmode="numeric" min="1" step="1" value="1" required><button class="small-button" ${disabled(locked)}>Contribute goods</button></form>`:extrasOpen?'<p>No spare goods in storage yet.</p>':''}</details>`;
 }
 // The Family Chest: one progress bar with the four chests along it, what you have put in, and what each chest gives you.
 function chestCard(){
  const c=view.chest;if(!c)return '';
  const top=c.tiers.at(-1).points,next=c.tiers.find(t=>!t.reached),level=view.standing?.level??1,bonus=Math.round((view.standing?.bonus??0)*100);
  const marker=t=>`<span class="family-chest-marker${t.reached?' is-reached':''}" style="inset-inline-start:${Math.min(100,t.points/top*100)}%">${art(`family-chest-${t.id}`)}</span>`;
  const tier=t=>`<li class="${t.reached?'is-reached':''}">${art(`family-chest-${t.id}`)}<div><strong>${t.name}</strong><span>${num(t.points)} points</span></div><span class="family-chest-gives"><b>${art('diamonds')}${num(t.diamonds)}</b><b>${art('coins')}${num(t.coins)}</b></span>${t.reached?'<i class="family-chest-check" aria-label="Reached">✓</i>':''}</li>`;
  const mine=c.mine>=c.minPoints?`You put in ${num(c.mine)} points: you share in every chest.`:`You put in ${num(c.mine)} points. From ${num(c.minPoints)} you share in every chest.`;
  return `<section class="family-chest"><div class="family-chest-head">${art(next?`family-chest-${next.id}`:'family-chest-open')}<div><span class="eyebrow">FAMILY CHEST${bonus?` · +${bonus}% REWARDS`:''}</span><h3>${next?`${num(c.points)} / ${num(next.points)} to the ${next.name.toLowerCase()}`:'Every chest is open this week!'}</h3></div></div>
   <div class="family-chest-track"><progress max="${top}" value="${Math.min(c.points,top)}" aria-label="Family Chest points"></progress>${c.tiers.map(marker).join('')}</div>
   <p class="family-chest-mine">${mine}</p>${chestRewards()}<details class="family-chest-fold"><summary><strong>What each chest gives you</strong><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><p class="family-chest-how">Everything your family does on the farm fills it. A new chest every Monday.</p><ul class="family-chest-tiers">${c.tiers.map(tier).join('')}</ul><p class="family-footnote">Coins grow with your level. Every chest your family opens raises the family level, and every level adds 10% to the chest and the weekly order.</p></details></section>`;
 }
 // Chest rewards waiting: small rows on the chest card, each with its own Collect.
 function chestRewards(){const list=view.rewards.filter(isChest);return list.length?`<div class="family-chest-ready">${list.map(r=>rewardRow(r,true)).join('')}</div>`:'';}
 // Alone in a family for three days: a quiet line (no pop-up) to find a busier one; leaving a family of one has no wait.
 function aloneNote(){
  if(!view.alone)return '';
  return `<section class="family-alone">${art('family-members')}<div><strong>Your family is just you</strong><span>A busier family fills the Family Chest much faster. You can leave and join another family straight away.</span></div>${actionButton('family_leave','Find a family')}</section>`;
 }
 // Members by points this week; tap a farmer for their profile. A leader's actions sit behind a small menu on each row.
 function members(){
  const best=Math.max(1,...view.members.map(m=>m.points)),profiles=!!window.harvestProfiles;
  // The leader sets ranks and can remove anyone; a co-leader can remove members and honorary members, not the leader or a co-leader.
  const coleaders=view.members.filter(m=>m.role==='coleader').length,f=view.family;
  const rankButtons=m=>f.leader?[['coleader','Make co-leader',coleaders>=FAMILY_MAX_COLEADERS&&m.role!=='coleader'],['honorary','Make honorary'],['member','Make member']].filter(([rank])=>rank!==m.role).map(([rank,label,full])=>actionButton('family_rank',`${art(`family-rank-${rank}`)}${full?`${label} (${FAMILY_MAX_COLEADERS} already)`:label}`,`data-member-id="${m.id}" data-rank="${rank}"`,full)).join('')+actionButton('family_promote','Make leader',`data-member-id="${m.id}"`):'';
  const canRemove=m=>f.leader||f.manager&&!['leader','coleader'].includes(m.role);
  const menu=m=>!m.isSelf&&(f.leader||canRemove(m))?`<details class="family-member-menu"><summary aria-label="Options for ${esc(m.username)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></summary><div class="family-member-menu-list">${rankButtons(m)}${canRemove(m)?actionButton('family_kick','Remove from family',`data-member-id="${m.id}" data-danger`):''}</div></details>`:'';
  const row=m=>`<article class="family-member${m.isSelf?' is-self':''}"><button type="button" class="family-member-open" data-player-profile="${esc(m.playerId??'')}" ${profiles&&m.playerId?'':'disabled'}><span class="family-member-portrait">${avatarImage(m.avatarId)}<span class="online-dot ${m.online?'is-online':''}" role="img" aria-label="${m.online?'Online':'Offline'}" title="${m.online?'Online: a farm action in the last 30 minutes':'Offline'}"></span></span><span class="family-member-copy"><strong>${esc(m.username)}${vipBadge(m.vipExpiresAt,farmNow())}${m.isSelf?' <em>(you)</em>':''}${rankChip(m)}</strong><small>Level ${m.level} · ${num(m.points)} points this week</small><span class="family-member-bar" aria-hidden="true"><span style="width:${Math.round(m.points/best*100)}%"></span></span></span>${profiles&&m.playerId?'<span class="family-sr-only">Open profile</span>':''}</button>${menu(m)}</article>`;
  // 30 Sep 2026: farmers asking to join first (they wait for an answer), then the family itself, then inviting: the leader's search
  // with the invitations still open, and a friend who is new to the game. The header already counts the farmers and who is online,
  // and the dot and the crown say what they mean when you point at them, so there is no heading or footnote to repeat it.
  const manager=view.family.manager,closed=view.family.mode==='closed';
  const invite=manager?(closed?`<p class="family-notice">Your family is closed to new farmers. To invite someone, change who can join in Family settings.</p>`:`${inviteSearch.html()}${renderSentInvitations(view,farmNow(),actionButton)}`):'';
  return `${manager&&!closed?joinRequests():''}<div class="family-member-list">${[...view.members].sort((a,b)=>Number(b.online)-Number(a.online)||b.points-a.points||a.username.localeCompare(b.username)).map(row).join('')}</div>${invite}${friendEntry}`;
 }
 // Farmers asking to join (a leader of a family that takes requests): accept or decline each; oldest first.
 function joinRequests(){
  if(!view.joinRequests?.length)return '';
  const full=view.members.length>=view.config.maxMembers;
  return `<section class="family-requests"><h3>Asking to join (${view.joinRequests.length})</h3>${full?'<p class="family-notice">Your family is full. Make room before you accept.</p>':''}${view.joinRequests.map(r=>`<div class="family-list-row"><span class="family-member-portrait">${avatarImage(r.avatarId)}</span><div><strong>${esc(r.username)}</strong><span>Level ${r.level} · ${formatDuration(r.expiresAt-farmNow())} left to answer</span></div>${actionButton('family_request_decline','Decline',`data-request-id="${esc(r.id)}"`)}${actionButton('family_request_accept','Accept',`data-request-id="${esc(r.id)}"`,full)}</div>`).join('')}</section>`;
 }
 // Help, gifts and requests (public/social-ui.js draws into this box and keeps it up to date itself).
 function sharing(){return '<div class="family-sharing" data-sharing-root aria-live="polite"></div>';}
 function tournament(){return renderFamilyTournament({view,now:farmNow(),emblem,rewards:rewardCards(),preview:prizePreview(),extra:extraGoods()});}
 // Anyone can bring a friend who is new to Harvest Tycoon (public/invite-ui.js), leader or not (bottom of Members).
 const friendEntry=`<button type="button" class="family-share-entry family-invite-friend" data-invite-friend>${art('invite-friends')}<span><strong>Invite a friend to Harvest Tycoon</strong><small>At level 10 you both get 150 diamonds</small></span><i data-lucide="chevron-right" data-line-icon></i></button>`;
 // The gear in the header (settings): look and name, who can join, and leaving (quietly at the bottom).
 function settings(){
  const f=view.family,renameLater=f.renameAt>farmNow();
  // The window's own header shows the family (30 Sep 2026: no second emblem and name card here); a new emblem or name shows there as you pick it.
  const header=`<h3 class="family-settings-title">${art('family-management')}Family settings</h3>`;
  const solo=view.members.length===1;
  const leave=`<section class="family-leave"><h3>Leave this family</h3><p>${solo?'You are its only member, so you can join another family straight away.':'You wait 48 hours before you can join or start another family.'} Your points this week stay here.${f.leader&&!solo?' The longest-standing member becomes leader.':''}</p>${actionButton('family_leave','Leave family')}</section>`;
  if(!f.manager)return `${header}<p class="family-notice">Your family leader and co-leaders can invite farmers, choose the emblem and rename the family.</p>${leave}`;
  return `${header}
  <form data-family-look class="family-card family-look"><h3>Look and name</h3>${emblemPickerMarkup({emblems:FAMILY_EMBLEMS,checkedId:f.emblem,legend:'Choose an emblem',nameOf:emblemName,tile:emblem,esc})}
  <label for="family-rename">Family name</label><input id="family-rename" name="name" value="${esc(f.name)}" minlength="3" maxlength="20" required ${renameLater?'disabled':''}><small>${renameLater?`You can rename again in ${formatDuration(f.renameAt-farmNow())}.`:'You can rename once every seven days.'}</small>
  <div class="family-look-save" data-look-save hidden><button type="button" class="link-button" data-look-undo>Undo</button><button class="primary-button">Save changes</button></div></form>
  <section class="family-card family-open-row"><div><strong>Who can join</strong><p>${MODE_HELP[f.mode]??MODE_HELP.invite}</p></div><select data-family-mode aria-label="Who can join" ${disabled(false)}>${Object.entries(FAMILY_JOIN_MODES).map(([k,label])=>`<option value="${k}" ${f.mode===k?'selected':''}>${label}</option>`).join('')}</select></section>
  ${f.mode==='open'||f.mode==='request'?`<section class="family-card family-open-row"><div><strong>Minimum level</strong><p>${f.mode==='open'?'Farmers below this level cannot join.':'Farmers below this level cannot ask to join.'} You can still invite anyone.</p></div><select data-family-min-level aria-label="Minimum level" ${disabled(false)}>${FAMILY_MIN_LEVELS.map(n=>`<option value="${n}" ${(f.minLevel??FAMILY_MIN_LEVEL)===n?'selected':''}>${n===FAMILY_MIN_LEVEL?`Any level (${n}+)`:`Level ${n}+`}</option>`).join('')}</select></section>`:''}
  ${leave}`;
 }
 function render(){
  if(!dialog.open)return;
  inviteSearch.unmount();
  const focused=document.activeElement,focusId=focused?.id,selection=focused?.selectionStart;
  // The family's own emblem and name on top, with who is in it; the chat and the settings sit beside the close button.
  const f=view?.family,heading=document.getElementById('family-subtitle');
  heading.textContent=f?'FARM FAMILY':'A place to grow together';document.getElementById('family-title').textContent=f?f.name:'Farm Family';
  const badge=document.getElementById('family-heading-emblem');badge.hidden=!f;if(f)badge.innerHTML=`${emblem(f.emblem)}<b class="family-level-badge" title="Family level ${view.standing?.level??1}">${view.standing?.level??1}</b>`;
  // Your family's emblem and name open its profile, as other families' do in the list and the tournament.
  for(const el of [badge,document.getElementById('family-title')]){el.classList.toggle('family-profile-link',!!f);if(f){el.setAttribute('role','button');el.tabIndex=0;el.title='Family profile';el.onclick=()=>familyProfile.open(f.id);el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();familyProfile.open(f.id);}};}else{el.removeAttribute('role');el.removeAttribute('tabindex');el.removeAttribute('title');el.onclick=el.onkeydown=null;}}
  const meta=document.getElementById('family-meta');meta.hidden=!f;if(f)meta.textContent=`${view.members.length} / ${view.config.maxMembers} farmers · ${view.members.filter(m=>m.online).length} online`;
  document.getElementById('family-chat').hidden=!f||!window.harvestChat;document.getElementById('family-settings').hidden=!f;
  dialog.querySelector('#family-settings').classList.toggle('active',tab==='settings');
  document.getElementById('family-feedback').textContent=error;
  document.getElementById('family-tabs').hidden=!view?.family;
  document.querySelectorAll('[data-family-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.familyTab===tab);b.setAttribute('aria-selected',String(b.dataset.familyTab===tab));});
  // Still on its way: placeholder rows (1 Oct 2026). Usually it is here already: refresh() reads it in the background every 30 s.
  if(!view){if(!error){content.innerHTML=skeleton('Opening the Family Hall…',{hero:true,rows:4});return;}content.innerHTML='<p class="family-loading">Your family could not be loaded.</p><button id="family-retry" class="small-button">Try again</button>';content.querySelector('#family-retry').onclick=()=>load(true);return;}
  social.unmount();
  content.innerHTML=view.family?(({week,sharing,members,tournament,settings}[tab])??week)():landing();
  content.querySelectorAll('[data-family-action]').forEach(b=>b.onclick=async()=>{
   const type=b.dataset.familyAction;
   // The game's own confirmation (not the browser's), red for what is hard to undo.
   const ask=type==='family_leave'&&view.members?.length===1?{title:'Leave your family?',description:'You are its only member. You can join another family straight away.',confirmLabel:'Leave family'}:{family_leave:{title:'Leave this family?',description:'You cannot join another family for 48 hours.',confirmLabel:'Leave family',tone:'danger'},family_kick:{title:'Remove this farmer?',description:'They cannot join a family again for 48 hours.',confirmLabel:'Remove',tone:'danger'},family_promote:{title:'Make them the leader?',description:'You will become a regular member.',confirmLabel:'Make leader'}}[type];
   if(ask&&!await confirmAction({...ask,cancelLabel:'Cancel',picture:'family-members'}))return;
   act({type,week:view.week,item:b.dataset.item,count:Number(b.dataset.count),invitationId:b.dataset.invitationId,memberId:b.dataset.memberId,rank:b.dataset.rank,rewardId:b.dataset.rewardId,familyId:b.dataset.familyId,requestId:b.dataset.requestId,open:b.dataset.open==='true'});
  });
  content.querySelectorAll('form[data-family-form]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const kind=form.dataset.familyForm;act(kind==='extra'?{type:'family_tournament_goods',week:view.week,item:d.item,count:Number(d.count)}:{type:'family_'+kind,...d});});
  content.querySelector('[data-invite-friend]')?.addEventListener('click',()=>window.harvestInvite?.open());
  const sharingRoot=content.querySelector('[data-sharing-root]');if(sharingRoot)void social.mount(sharingRoot);
  content.querySelector('[data-family-goto]')?.addEventListener('click',event=>{tab=event.currentTarget.dataset.familyGoto;render();content.scrollTop=0;dialog.scrollTop=0;});
  content.querySelectorAll('[data-player-profile]').forEach(b=>b.onclick=()=>{if(b.dataset.playerProfile)window.harvestProfiles?.open(b.dataset.playerProfile,{back:'Back to your family'});});
  content.querySelectorAll('[data-family-profile]').forEach(b=>b.onclick=()=>familyProfile.open(b.dataset.familyProfile));
  content.querySelectorAll('.family-member-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)content.querySelectorAll('.family-member-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});}));
  // Look and name: the header above shows the picked emblem and the typed name at once; Save changes only appears once
  // something has changed, and saves the emblem and the name together.
  const look=content.querySelector('form[data-family-look]');
  if(look){
   const input=look.querySelector('input[name="name"]'),bar=look.querySelector('[data-look-save]'),f=view.family;
   const picked=()=>look.querySelector('input[name="emblem"]:checked')?.value??f.emblem,name=()=>input.value.trim();
   const sync=()=>{
    document.querySelector('#family-heading-emblem .family-emblem')?.replaceWith(Object.assign(document.createElement('template'),{innerHTML:emblem(picked())}).content);document.getElementById('family-title').textContent=name()||f.name;
    bar.hidden=picked()===f.emblem&&(input.disabled||name()===f.name);refreshArt();
   };
   look.addEventListener('change',sync);input.addEventListener('input',sync);
   look.querySelector('[data-look-undo]').onclick=()=>{look.querySelector(`input[name="emblem"][value="${f.emblem}"]`).checked=true;input.value=f.name;look.querySelector('[data-emblem-picker]').dispatchEvent(new Event('change',{bubbles:true}));sync();};
   look.onsubmit=async event=>{
    event.preventDefault();const emblemId=picked(),newName=name();
    if(emblemId!==f.emblem&&!await act({type:'family_emblem',emblem:emblemId}))return;
    if(!input.disabled&&newName!==f.name)await act({type:'family_rename',name:newName});
   };
  }
  content.querySelector('[data-family-mode]')?.addEventListener('change',event=>act({type:'family_join_mode',mode:event.currentTarget.value}));
  content.querySelector('[data-family-min-level]')?.addEventListener('change',event=>act({type:'family_min_level',level:Number(event.currentTarget.value)}));
  inviteSearch.mount(content);bindEmblemPickers(content);
  refreshArt();if(focusId){const next=document.getElementById(focusId);next?.focus({preventScroll:true});if(next&&typeof selection==='number')try{next.setSelectionRange(selection,selection);}catch{}}
 }
 async function act(action){
  if(busy)return;busy=true;generation++;error='';content.querySelectorAll('button').forEach(b=>b.disabled=true);
  let done=false;
  try{const result=await runAction(action);view=result.family;lastRead=Date.now();notify(result.message);if(result.completed)dialog.classList.add('family-celebrate');done=true;}
  catch(e){error=e.message;notify(error);}
  finally{busy=false;render();refresh();}
  return done;
 }
 async function load(force=false){
  if(busy||reading||!familyUnlocked(state)||!isReady()||!force&&Date.now()-lastRead<30000)return;
  reading=true;const ticket=generation;
  try{const data=await window.parent.harvestBridge.request({operation:'family'});if(ticket!==generation)return;view=data.family;lastRead=Date.now();error='';
   // Do not disturb a form while a farmer is typing into it.
   if(tab!=='sharing'&&(!content.contains(document.activeElement)||!(['INPUT','SELECT'].includes(document.activeElement.tagName)||document.activeElement.closest('[data-emblem-picker]'))))render();
  }catch(e){if(ticket===generation){error=e.message;lastRead=Date.now();render();}}finally{reading=false;refresh();}
 }
 // A "!" on the tab where something waits for you: a reward to collect, or goods you can deliver to the order.
 function tabDots(){
  const waiting={week:Boolean(view?.rewards?.some(r=>r.kind==='order'||r.kind.startsWith('chest-'))||view?.order&&!view.contributionLocked&&Object.entries(view.order.lines).some(([k,n])=>(view.order.filled[k]??0)<n&&(state.inventory[k]??0)>0)),tournament:Boolean(view?.rewards?.some(r=>r.kind==='tournament'))};
  document.querySelectorAll('[data-family-tab]').forEach(b=>{const d=b.querySelector('.family-tab-dot');if(d)d.hidden=!waiting[b.dataset.familyTab];});
 }
 function refresh(){
  refreshVipBadges(dialog,farmNow());tabDots();
  button.hidden=!familyUnlocked(state);if(button.hidden)return;
  // The button's "!" only for what waits for you: an invitation, a reward, farmers asking to join. Goods you could deliver light the
  // "!" on This week inside the window, not the button (30 Sep 2026: with a full storage that was always true, so it never went away).
  dot.hidden=!(view?.invitation||view?.rewards.length||view?.joinRequests?.length);
  const countdown=dialog.querySelector('[data-family-countdown]');if(countdown&&view)countdown.textContent=formatDuration(Math.max(0,view.endsAt-farmNow()));
  if(!busy&&!reading&&isReady()&&!document.hidden&&Date.now()-lastRead>=30000)void load();
 }
 function open(){if(!familyUnlocked(state))return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();render();void load(true);}
 dialog.addEventListener('close',()=>{inviteSearch.unmount();social.unmount();});
 // A farmer's profile (src/player-profiles.js) asks whether you can invite them, and sends the invitation through here.
 window.harvestFamilyInvite={
  // A closed family invites nobody, so its leader sees no invite button at all.
  offer(player){if(!view?.family?.manager||view.family.mode==='closed'||!player?.playerId||player.family||player.playerId===window.parent.harvestBridge.playerId)return null;return {familyName:view.family.name,reason:inviteBlocker(view,player,window.parent.harvestBridge.playerId)};},
  invite:playerId=>act({type:'family_invite',playerId})
 };
 document.addEventListener('pointerdown',event=>{if(!event.target.closest?.('.family-member-menu'))content.querySelectorAll('.family-member-menu[open]').forEach(menu=>menu.open=false);});
 dialog.addEventListener('keydown',event=>{const open=content.querySelector('.family-member-menu[open]');if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();open.open=false;open.querySelector('summary').focus();}});
 button.onclick=open;document.querySelectorAll('[data-family-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.familyTab;error='';render();});
 document.getElementById('family-settings').onclick=()=>{tab=tab==='settings'?'members':'settings';error='';render();content.scrollTop=0;dialog.scrollTop=0;};
 document.getElementById('family-chat').onclick=()=>{dialog.close();window.harvestChat?.open({tab:'family'});};
 window.addEventListener('harvest-avatar-changed',()=>{lastRead=0;void load(true);});
 const timer=setInterval(refresh,1000);window.addEventListener('pagehide',()=>{clearInterval(timer);inviteSearch.unmount();},{once:true});
 return {open,refresh};
}
