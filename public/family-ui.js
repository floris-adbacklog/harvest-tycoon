import {confirmAction} from './confirm-dialog.js';
import {createSocialUI} from './social-ui.js';
import {avatarImage} from './player-avatars.js';
import {vipBadge,refreshVipBadges} from './vip-ui.js';
import {renderFamilyInvitation,renderSentInvitations,createFamilyInviteSearch,inviteBlocker} from './family-invitations-ui.js';
import {renderFamilyOrderRewards} from './family-order-rewards.js';
import {renderFamilyTournament} from './family-tournament.js';
import {FAMILY_MIN_LEVEL,FAMILY_EMBLEMS,familyUnlocked,ITEMS,BUILDINGS,formatDuration,itemAvailable,itemUnlockLevel,itemBuilding,levelOf} from './farm-state.js';
import {emblemPickerMarkup,bindEmblemPickers} from './emblem-picker.js';
import {art,refreshArt} from './visual-icons.js';
import {farmNow} from './farm-client.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const emblemName=e=>({'family-bee':'Honeybee','family-oak':'Oak grove','family-barn':'Sunrise barn','family-fox':'Cosy fox','family-owl':'Wise owl','family-windmill':'Wheat windmill','family-horseshoe':'Lucky horseshoe'}[e.icon]??ITEMS[e.icon]?.name??e.icon.charAt(0).toUpperCase()+e.icon.slice(1));
const emblem=id=>{const e=FAMILY_EMBLEMS.find(x=>x.id===id)??FAMILY_EMBLEMS[0];return `<span class="family-emblem" style="--family-color:${e.color}">${art(e.icon)}</span>`;};
export function createFamilyUI({state,runAction,notify,isReady}){
 // Daily sharing has a tab of its own (Sharing); it borrows this view's portraits and levels.
 const social=createSocialUI({state,notify,refreshFarm:()=>window.harvestRefresh(),getMembers:()=>view?.members??[]});
 const dialog=document.getElementById('family-dialog'),content=document.getElementById('family-content'),button=document.getElementById('family-button'),dot=document.getElementById('family-dot');
 let view=null,tab='week',busy=false,reading=false,lastRead=0,generation=0,error='';
 const inviteSearch=createFamilyInviteSearch({request:body=>window.parent.harvestBridge.request(body),onInvite:act,getView:()=>view,playerId:window.parent.harvestBridge.playerId,isBusy:()=>busy});
 const disabled=condition=>condition||busy?'disabled':'';
 const actionButton=(type,label,data='',condition=false)=>`<button type="button" class="small-button" data-family-action="${type}" ${data} ${disabled(condition)}>${label}</button>`;
 const rewardCards=()=>view.rewards.length?`<section class="family-rewards"><h3>Your rewards are ready</h3>${view.rewards.map(r=>`<div class="family-reward">${art('gift')}<div><strong>${r.kind==='order'?'Family Order':'Family Tournament'}</strong><span>${[r.coins?`${num(r.coins)} coins`:null,r.xp?`${num(r.xp)} XP`:null,r.diamonds?`${num(r.diamonds)} diamonds`:null].filter(Boolean).join(' · ')}</span><small>Claim within ${formatDuration(r.expiresAt-farmNow())}</small></div>${actionButton('family_claim','Collect',`data-reward-id="${esc(r.id)}"`)}</div>`).join('')}</section>`:'';
 function landing(){
  const cooldown=view.cooldownUntil>farmNow();
  return `${renderFamilyInvitation(view,farmNow(),emblem,actionButton)}${rewardCards()}<div class="family-welcome">${art('family-members')}<h3>A little farm. A bigger family.</h3><p>Share a weekly order, help each other grow and join the Family Tournament. Up to ${view.config.maxMembers} farmers can play together.</p><div class="family-welcome-benefits"><div>${art('gift')}<strong>Weekly order rewards</strong><span>Coins, XP and bonus diamonds</span></div><div>${art('rank-gold')}<strong>${num(view.tournament.firstPrizeMin)}–${num(view.tournament.firstPrizeMax)} diamonds</strong><span>Weekly first prize for your family</span></div></div></div>${cooldown?`<p class="family-notice">You can join or create a family in ${formatDuration(view.cooldownUntil-farmNow())}.</p>`:''}<div class="family-join-grid family-create-grid"><form data-family-form="create"><h3>Create a family</h3><label for="family-name">Family name</label><input id="family-name" name="name" required minlength="3" maxlength="20" placeholder="Meadow friends" autocomplete="off">${emblemPickerMarkup({emblems:FAMILY_EMBLEMS,checkedId:FAMILY_EMBLEMS[0].id,legend:'Choose your emblem',nameOf:emblemName,tile:emblem,esc})}<button class="primary-button" ${disabled(cooldown)}>Create family</button></form></div><section><h3>Open families</h3>${view.openFamilies.length?view.openFamilies.map(f=>`<div class="family-list-row">${emblem(f.emblem)}<div><strong>${esc(f.name)}</strong><span>${f.members} / ${view.config.maxMembers} farmers</span></div>${actionButton('family_join','Join',`data-family-id="${f.id}"`,cooldown)}</div>`).join(''):'<p>No open families yet. Create one or ask a family leader to invite you.</p>'}</section>`;
 }
 function prizePreview(){
  const t=view.tournament;
  return `<section class="family-prize-preview">${art('diamonds')}<div><strong>${t.entered?`${num(t.yourDiamonds)} diamonds for you`:'Your first delivery enters the tournament'}</strong><span>${t.entered?'At current standings · collect after Monday, 00:00 UTC':'Deliver anything from the Family Order to join. Solo families can win too.'}</span>${t.entered&&t.yourDiamonds===0?`<small>${t.yourRank>3?'Reach the top three to win a prize.':'Your share follows your contribution points.'}</small>`:''}</div></section>`;
 }
 // A short line to the Tournament tab (the full prize story lives there).
 function tournamentLink(){
  const t=view.tournament;
  const title=t.entered&&t.yourRank?`Your family is #${t.yourRank} in the tournament`:'Your first delivery enters the tournament';
  const note=t.entered?`${num(t.yourDiamonds)} diamonds for you at current standings`:`1st place wins ${num(t.firstPrizeMin)}–${num(t.firstPrizeMax)} diamonds for the family`;
  return `<button type="button" class="family-share-entry family-tournament-link" data-family-goto="tournament">${art('family-tournament')}<span><strong>${title}</strong><small>${note}</small></span><i data-lucide="chevron-right" data-line-icon></i></button>`;
 }
 function week(){
  const o=view.order,locked=view.contributionLocked;
  const lines=Object.entries(o.lines),isDone=([k,n])=>(o.filled[k]??0)>=n,complete=lines.filter(isDone).length;
  const total=lines.reduce((n,[,t])=>n+t,0),delivered=lines.reduce((n,[k,t])=>n+Math.min(t,o.filled[k]??0),0);
  const extrasOpen=complete>0;
  const available=Object.entries(ITEMS).filter(([k,item])=>item.sell>0&&state.inventory[k]>0);
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
  return `${rewardCards()}<section class="family-week-intro"><div><span class="eyebrow">${o.completed?'ORDER COMPLETE':'GROW SOMETHING TOGETHER'}</span><h3>This week’s Family Order</h3><p>Ends Monday, 00:00 UTC</p></div>${art('family-weekly-order')}</section>
  <section class="family-week-summary" aria-label="This week so far"><div class="family-week-stats"><div><strong>${complete} / ${lines.length}</strong><span>lines complete</span></div><div><strong>${num(view.yourPoints)}</strong><span>${view.yourPoints>0&&place?`your points · #${place} in family`:'your points'}</span></div><div><strong data-family-countdown>${formatDuration(Math.max(0,view.endsAt-farmNow()))}</strong><span>left</span></div></div><progress max="${Math.max(1,total)}" value="${delivered}" aria-label="Family Order delivered"></progress></section>
  ${locked?'<p class="family-notice">You have already contributed to another family this week. You can help this family next week.</p>':o.completed?'':'<p class="family-notice">Deliveries also count for the tournament. They cannot be taken back.</p>'}
  ${o.completed?`${view.rewards.some(r=>r.kind==='order')?'':renderFamilyOrderRewards(view)}<details class="family-done-fold"><summary><span><strong>✓ ${done.length} ${done.length===1?'line':'lines'} delivered</strong></span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary>${chips}</details>`
   :`<div class="family-order">${open.filter(l=>!later(l)).sort((a,b)=>order(a)-order(b)).map(line).join('')}</div>${done.length?`<div class="family-done-row"><span>Delivered</span>${chips}</div>`:''}`}
  ${lines.some(later)?`<details class="family-later"><summary><span><strong>Later (${lines.filter(later).length})</strong><small>These open with a higher level or another building</small></span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="family-order">${lines.filter(later).map(line).join('')}</div></details>`:''}
  ${o.completed?'':`<details class="family-rewards-fold"><summary><strong>Your rewards</strong><span>when the order is complete</span><i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary>${renderFamilyOrderRewards(view)}</details>`}
  ${tournamentLink()}
  <details class="family-extra"><summary><span><strong>Tournament goods</strong><small>${extrasOpen?'Extra points for your family':'Fill an order line to unlock'}</small></span></summary><p>Extra goods count for the weekly tournament only (no coins, XP or diamonds), as many as you like. They are handed in permanently.</p>${extrasOpen&&available.length?`<form data-family-form="extra"><label for="family-extra-item">Goods to contribute</label><select id="family-extra-item" name="item">${available.map(([key,item])=>`<option value="${key}" data-art="${key}" data-note="${num(state.inventory[key])} in stock · ${num(item.sell)} points each">${esc(item.name)}</option>`).join('')}</select><label for="family-extra-count">Quantity</label><input id="family-extra-count" name="count" type="number" inputmode="numeric" min="1" step="1" value="1" required><button class="small-button" ${disabled(locked)}>Contribute goods</button></form>`:extrasOpen?'<p>No spare goods in storage yet.</p>':''}</details>`;
 }
 // Members by points this week; tap a farmer for their profile. A leader's actions sit behind a small menu on each row.
 function members(){
  const best=Math.max(1,...view.members.map(m=>m.points)),online=view.members.filter(m=>m.online).length,profiles=!!window.harvestProfiles;
  const menu=m=>view.family.leader&&!m.isSelf?`<details class="family-member-menu"><summary aria-label="Options for ${esc(m.username)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></summary><div class="family-member-menu-list">${actionButton('family_promote','Make leader',`data-member-id="${m.id}"`)}${actionButton('family_kick','Remove from family',`data-member-id="${m.id}" data-danger`)}</div></details>`:'';
  const row=m=>`<article class="family-member${m.isSelf?' is-self':''}"><button type="button" class="family-member-open" data-player-profile="${esc(m.playerId??'')}" ${profiles&&m.playerId?'':'disabled'}><span class="family-member-portrait">${avatarImage(m.avatarId)}<span class="online-dot ${m.online?'is-online':''}" role="img" aria-label="${m.online?'Online':'Offline'}" title="${m.online?'Online':'Offline'}"></span></span><span class="family-member-copy"><strong>${esc(m.username)}${vipBadge(m.vipExpiresAt,farmNow())}${m.isSelf?' <em>(you)</em>':''}${m.role==='leader'?'<span class="family-role">Leader</span>':''}</strong><small>Level ${m.level} · ${num(m.points)} points this week</small><span class="family-member-bar" aria-hidden="true"><span style="width:${Math.round(m.points/best*100)}%"></span></span></span>${profiles&&m.playerId?'<span class="family-sr-only">Open profile</span>':''}</button>${menu(m)}</article>`;
  // The leader invites farmers right here, above the list; anyone can bring a friend who is new to the game (below it).
  const invite=view.family.leader?`${inviteSearch.html()}${renderSentInvitations(view,farmNow(),actionButton)}`:'';
  return `${invite}<div class="family-members-heading"><h3>Members</h3><span>${view.members.length} / ${view.config.maxMembers} farmers · ${online} online</span></div><div class="family-member-list">${[...view.members].sort((a,b)=>Number(b.online)-Number(a.online)||b.points-a.points||a.username.localeCompare(b.username)).map(row).join('')}</div><p class="family-footnote">A green dot means a farm action in the last 30 minutes.</p>${friendEntry}`;
 }
 // Help, gifts and requests (public/social-ui.js draws into this box and keeps it up to date itself).
 function sharing(){return '<div class="family-sharing" data-sharing-root aria-live="polite"></div>';}
 function tournament(){return renderFamilyTournament({view,now:farmNow(),emblem,rewards:rewardCards(),preview:prizePreview()});}
 // Anyone can bring a friend who is new to Harvest Tycoon (public/invite-ui.js), leader or not (bottom of Members).
 const friendEntry=`<button type="button" class="family-share-entry family-invite-friend" data-invite-friend>${art('invite-friends')}<span><strong>Invite a friend to Harvest Tycoon</strong><small>At level 10 you both get 150 diamonds</small></span><i data-lucide="chevron-right" data-line-icon></i></button>`;
 // The gear in the header (settings): look and name, who can join, and leaving (quietly at the bottom).
 function settings(){
  const f=view.family,renameLater=f.renameAt>farmNow();
  const header=`<h3 class="family-settings-title">${art('family-management')}Family settings</h3><div class="family-settings-header"><span data-look-emblem>${emblem(f.emblem)}</span><div><h3 data-look-name>${esc(f.name)}</h3><p>${f.members} / ${view.config.maxMembers} farmers · ${f.open?'Open to new farmers':'Invite-only'}</p></div></div>`;
  const leave=`<section class="family-leave"><h3>Leave this family</h3><p>You will wait 48 hours before joining or creating another family. This week’s contributions stay with this family.${f.leader?' Leadership passes to the longest-standing member.':''}</p>${actionButton('family_leave','Leave family')}</section>`;
  if(!f.leader)return `${header}<p class="family-notice">Your family leader can invite farmers, choose the emblem and rename the family.</p>${leave}`;
  return `${header}
  <form data-family-look class="family-card family-look"><h3>Look and name</h3>${emblemPickerMarkup({emblems:FAMILY_EMBLEMS,checkedId:f.emblem,legend:'Choose an emblem',nameOf:emblemName,tile:emblem,esc})}
  <label for="family-rename">Family name</label><input id="family-rename" name="name" value="${esc(f.name)}" minlength="3" maxlength="20" required ${renameLater?'disabled':''}><small>${renameLater?`You can rename again in ${formatDuration(f.renameAt-farmNow())}.`:'You can rename once every seven days.'}</small>
  <div class="family-look-save" data-look-save hidden><button type="button" class="link-button" data-look-undo>Undo</button><button class="primary-button">Save changes</button></div></form>
  <section class="family-card family-open-row"><div><strong>Open to new farmers</strong><p>Anyone can find your family in the Open families list and join. When it is off, farmers join only by invitation.</p></div><input type="checkbox" role="switch" class="family-switch" data-family-open aria-label="Open to new farmers" ${f.open?'checked':''} ${disabled(false)}></section>
  ${leave}`;
 }
 function render(){
  if(!dialog.open)return;
  inviteSearch.unmount();
  const focused=document.activeElement,focusId=focused?.id,selection=focused?.selectionStart;
  // The family's own emblem and name on top, with who is in it; the chat and the settings sit beside the close button.
  const f=view?.family,heading=document.getElementById('family-subtitle');
  heading.textContent=f?'FARM FAMILY':'A place to grow together';document.getElementById('family-title').textContent=f?f.name:'Farm Family';
  const badge=document.getElementById('family-heading-emblem');badge.hidden=!f;if(f)badge.innerHTML=emblem(f.emblem);
  const meta=document.getElementById('family-meta');meta.hidden=!f;if(f)meta.textContent=`${view.members.length} / ${view.config.maxMembers} farmers · ${view.members.filter(m=>m.online).length} online · ${f.open?'Open to new farmers':'Invite-only'}`;
  document.getElementById('family-chat').hidden=!f||!window.harvestChat;document.getElementById('family-settings').hidden=!f;
  dialog.querySelector('#family-settings').classList.toggle('active',tab==='settings');
  document.getElementById('family-feedback').textContent=error;
  document.getElementById('family-tabs').hidden=!view?.family;
  document.querySelectorAll('[data-family-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.familyTab===tab);b.setAttribute('aria-selected',String(b.dataset.familyTab===tab));});
  if(!view){content.innerHTML=`<p class="family-loading">${error?'Your family could not be loaded.':'Opening the Family Hall…'}</p><button id="family-retry" class="small-button">Try again</button>`;content.querySelector('#family-retry').onclick=()=>load(true);return;}
  social.unmount();
  content.innerHTML=view.family?(({week,sharing,members,tournament,settings}[tab])??week)():landing();
  content.querySelectorAll('[data-family-action]').forEach(b=>b.onclick=async()=>{
   const type=b.dataset.familyAction;
   // The game's own confirmation (not the browser's), red for what is hard to undo.
   const ask={family_leave:{title:'Leave this family?',description:'You cannot join another family for 48 hours.',confirmLabel:'Leave family',tone:'danger'},family_kick:{title:'Remove this farmer?',description:'They cannot join a family again for 48 hours.',confirmLabel:'Remove',tone:'danger'},family_promote:{title:'Make them the leader?',description:'You will become a regular member.',confirmLabel:'Make leader'}}[type];
   if(ask&&!await confirmAction({...ask,cancelLabel:'Cancel',picture:'family-members'}))return;
   act({type,week:view.week,item:b.dataset.item,count:Number(b.dataset.count),invitationId:b.dataset.invitationId,memberId:b.dataset.memberId,rewardId:b.dataset.rewardId,familyId:b.dataset.familyId,open:b.dataset.open==='true'});
  });
  content.querySelectorAll('form[data-family-form]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const kind=form.dataset.familyForm;act(kind==='extra'?{type:'family_tournament_goods',week:view.week,item:d.item,count:Number(d.count)}:{type:'family_'+kind,...d});});
  content.querySelector('[data-invite-friend]')?.addEventListener('click',()=>window.harvestInvite?.open());
  const sharingRoot=content.querySelector('[data-sharing-root]');if(sharingRoot)void social.mount(sharingRoot);
  content.querySelector('[data-family-goto]')?.addEventListener('click',event=>{tab=event.currentTarget.dataset.familyGoto;render();content.scrollTop=0;dialog.scrollTop=0;});
  content.querySelectorAll('[data-player-profile]').forEach(b=>b.onclick=()=>{if(b.dataset.playerProfile)window.harvestProfiles?.open(b.dataset.playerProfile,{back:'Back to your family'});});
  content.querySelectorAll('.family-member-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)content.querySelectorAll('.family-member-menu[open]').forEach(other=>{if(other!==menu)other.open=false;});}));
  // Look and name: the header above shows the picked emblem and the typed name at once; Save changes only appears once
  // something has changed, and saves the emblem and the name together.
  const look=content.querySelector('form[data-family-look]');
  if(look){
   const input=look.querySelector('input[name="name"]'),bar=look.querySelector('[data-look-save]'),f=view.family;
   const picked=()=>look.querySelector('input[name="emblem"]:checked')?.value??f.emblem,name=()=>input.value.trim();
   const sync=()=>{
    content.querySelector('[data-look-emblem]').innerHTML=emblem(picked());content.querySelector('[data-look-name]').textContent=name()||f.name;
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
  content.querySelector('[data-family-open]')?.addEventListener('change',event=>act({type:'family_open',open:event.currentTarget.checked}));
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
  const waiting={week:Boolean(view?.rewards?.some(r=>r.kind==='order')||view?.order&&!view.contributionLocked&&Object.entries(view.order.lines).some(([k,n])=>(view.order.filled[k]??0)<n&&(state.inventory[k]??0)>0)),tournament:Boolean(view?.rewards?.some(r=>r.kind!=='order'))};
  document.querySelectorAll('[data-family-tab]').forEach(b=>{const d=b.querySelector('.family-tab-dot');if(d)d.hidden=!waiting[b.dataset.familyTab];});
 }
 function refresh(){
  refreshVipBadges(dialog,farmNow());tabDots();
  button.hidden=!familyUnlocked(state);if(button.hidden)return;
  dot.hidden=!(view?.invitation||view?.rewards.length||view?.order&&!view.contributionLocked&&Object.entries(view.order.lines).some(([k,n])=>(view.order.filled[k]??0)<n&&(state.inventory[k]??0)>0));
  const countdown=dialog.querySelector('[data-family-countdown]');if(countdown&&view)countdown.textContent=formatDuration(Math.max(0,view.endsAt-farmNow()));
  if(!busy&&!reading&&isReady()&&!document.hidden&&Date.now()-lastRead>=30000)void load();
 }
 function open(){if(!familyUnlocked(state))return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();render();void load(true);}
 dialog.addEventListener('close',()=>{inviteSearch.unmount();social.unmount();});
 // A farmer's profile (src/player-profiles.js) asks whether you can invite them, and sends the invitation through here.
 window.harvestFamilyInvite={
  offer(player){if(!view?.family?.leader||!player?.playerId||player.family||player.playerId===window.parent.harvestBridge.playerId)return null;return {familyName:view.family.name,reason:inviteBlocker(view,player,window.parent.harvestBridge.playerId)};},
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
