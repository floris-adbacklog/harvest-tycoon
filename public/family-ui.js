import {renderFamilyInvitation,renderSentInvitations,createFamilyInviteSearch} from './family-invitations-ui.js';
import {renderFamilyOrderRewards} from './family-order-rewards.js';
import {renderFamilyTournament} from './family-tournament.js';
import {FAMILY_MIN_LEVEL,FAMILY_EMBLEMS,familyUnlocked,ITEMS,formatDuration} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {farmNow} from './farm-client.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const emblemName=e=>({'family-bee':'Honeybee','family-oak':'Oak grove','family-barn':'Sunrise barn'}[e.icon]??ITEMS[e.icon]?.name??e.icon.charAt(0).toUpperCase()+e.icon.slice(1));
const emblem=id=>{const e=FAMILY_EMBLEMS.find(x=>x.id===id)??FAMILY_EMBLEMS[0];return `<span class="family-emblem" style="--family-color:${e.color}">${art(e.icon)}</span>`;};
export function createFamilyUI({state,runAction,notify,isReady}){
 const dialog=document.getElementById('family-dialog'),content=document.getElementById('family-content'),button=document.getElementById('family-button'),dot=document.getElementById('family-dot');
 let view=null,tab='week',busy=false,reading=false,lastRead=0,generation=0,error='';
 const inviteSearch=createFamilyInviteSearch({request:body=>window.parent.harvestBridge.request(body),onInvite:act,getView:()=>view,playerId:window.parent.harvestBridge.playerId,isBusy:()=>busy});
 const disabled=condition=>condition||busy?'disabled':'';
 const actionButton=(type,label,data='',condition=false)=>`<button type="button" class="small-button" data-family-action="${type}" ${data} ${disabled(condition)}>${label}</button>`;
 const rewardCards=()=>view.rewards.length?`<section class="family-rewards"><h3>Your rewards are ready</h3>${view.rewards.map(r=>`<div class="family-reward">${art('gift')}<div><strong>${r.kind==='order'?'Family Order':'Family Tournament'}</strong><span>${[r.coins?`${num(r.coins)} coins`:null,r.xp?`${num(r.xp)} XP`:null,r.diamonds?`${num(r.diamonds)} diamonds`:null].filter(Boolean).join(' · ')}</span><small>Claim within ${formatDuration(r.expiresAt-farmNow())}</small></div>${actionButton('family_claim','Collect',`data-reward-id="${esc(r.id)}"`)}</div>`).join('')}</section>`:'';
 function landing(){
  const cooldown=view.cooldownUntil>farmNow();
  return `${renderFamilyInvitation(view,farmNow(),emblem,actionButton)}${rewardCards()}<div class="family-welcome">${art('family-members')}<h3>A little farm. A bigger family.</h3><p>Share a weekly order, help each other grow and join the Family Tournament. Up to ${view.config.maxMembers} farmers can play together.</p><div class="family-welcome-benefits"><div>${art('gift')}<strong>Weekly order rewards</strong><span>Coins, XP and bonus diamonds</span></div><div>${art('rank-gold')}<strong>50–300 diamonds</strong><span>Weekly first prize for your family</span></div></div></div>${cooldown?`<p class="family-notice">You can join or create a family in ${formatDuration(view.cooldownUntil-farmNow())}.</p>`:''}<div class="family-join-grid family-create-grid"><form data-family-form="create"><h3>Create a family</h3><label for="family-name">Family name</label><input id="family-name" name="name" required minlength="3" maxlength="20" placeholder="Meadow friends" autocomplete="off"><fieldset><legend>Choose your emblem</legend><div class="family-emblems">${FAMILY_EMBLEMS.map((e,i)=>`<label title="${esc(emblemName(e))}"><input type="radio" name="emblem" value="${e.id}" ${i===0?'checked':''} aria-label="${esc(emblemName(e))} emblem">${emblem(e.id)}</label>`).join('')}</div></fieldset><button class="primary-button" ${disabled(cooldown)}>Create family</button></form></div><section><h3>Open families</h3>${view.openFamilies.length?view.openFamilies.map(f=>`<div class="family-list-row">${emblem(f.emblem)}<div><strong>${esc(f.name)}</strong><span>${f.members} / ${view.config.maxMembers} farmers</span></div>${actionButton('family_join','Join',`data-family-id="${f.id}"`,cooldown)}</div>`).join(''):'<p>No open families yet. Create one or ask a family leader to invite you.</p>'}</section>`;
 }
 function prizePreview(){
  const t=view.tournament;
  return `<section class="family-prize-preview">${art('diamonds')}<div><strong>${t.entered?`${num(t.yourDiamonds)} diamonds for you`:'Your first delivery enters the tournament'}</strong><span>${t.entered?'At current standings · collect after Monday, 00:00 UTC':`1st place wins ${num(t.firstPrizeMin)}–${num(t.firstPrizeMax)} diamonds for the family. Solo families can win too.`}</span>${t.entered&&t.yourDiamonds===0?`<small>${t.yourRank>3?'Reach the top three to win a prize.':'Your share follows your contribution points.'}</small>`:''}</div></section>`;
 }
 function week(){
  const o=view.order,locked=view.contributionLocked;
  const lines=Object.entries(o.lines);
  const extrasOpen=lines.some(([k,n])=>(o.filled[k]??0)>=n);
  const available=Object.entries(ITEMS).filter(([k,item])=>item.sell>0&&state.inventory[k]>0);
  return `${rewardCards()}<section class="family-week-intro"><div><span class="eyebrow">${o.completed?'ORDER COMPLETE':'GROW SOMETHING TOGETHER'}</span><h3>This week’s Family Order</h3><p>Ends in <strong data-family-countdown>${formatDuration(view.endsAt-farmNow())}</strong> · Monday, 00:00 UTC</p></div>${art('family-weekly-order')}</section>${renderFamilyOrderRewards(view)}<p class="family-notice">${locked?'You have already contributed to another family this week. You can help this family next week.':`Deliver goods together. Every delivery also earns tournament points. Delivered goods cannot be taken back.`}</p><div class="family-order">${lines.map(([key,target])=>{const filled=o.filled[key]??0,stock=state.inventory[key]??0,max=Math.min(stock,target-filled);return `<article class="family-order-line">${art(key)}<div class="family-line-copy"><strong>${ITEMS[key].name}</strong><span>${num(filled)} / ${num(target)} delivered · ${num(stock)} in stock</span><progress max="${target}" value="${filled}" aria-label="${ITEMS[key].name} delivered"></progress></div><div class="family-line-actions">${filled>=target?'<span class="family-done">✓ Complete</span>':[1,5,'max'].map(n=>actionButton('family_contribute',n==='max'?`Max (${num(max)})`:`+${n}`,`data-item="${key}" data-count="${n==='max'?max:n}"`,locked||max<(n==='max'?1:n))).join('')}</div></article>`;}).join('')}</div>${prizePreview()}<details class="family-extra"><summary>Tournament goods <span>${extrasOpen?'Extra points for your family':'Fill an order line to unlock'}</span></summary><p>Extra goods earn tournament points only. ${num(view.config.extraCap-view.extraUsed)} points left in your weekly allowance. They are handed in permanently.</p>${extrasOpen&&available.length?`<form data-family-form="extra"><label for="family-extra-item">Goods to contribute</label><select id="family-extra-item" name="item">${available.map(([key,item])=>`<option value="${key}">${esc(item.name)} · ${num(state.inventory[key])} in stock · ${num(item.sell)} points each</option>`).join('')}</select><label for="family-extra-count">Quantity</label><input id="family-extra-count" name="count" type="number" inputmode="numeric" min="1" step="1" value="1" required><button class="small-button" ${disabled(locked)}>Contribute goods</button></form>`:extrasOpen?'<p>No spare goods in storage yet.</p>':''}</details>`;
 }
 function members(){return `<div class="family-page-icon">${art('family-members')}</div><p>Farmers are online after a farm action within the last 30 minutes.</p><div class="family-member-list">${view.members.map(m=>`<article class="family-list-row"><span class="online-dot ${m.online?'is-online':''}" role="img" aria-label="${m.online?'Online':'Offline'}" title="${m.online?'Online':'Offline'}"></span><div><strong>${esc(m.username)}${m.isSelf?' (you)':''}</strong><span>Level ${m.level} · ${m.role==='leader'?'Leader':'Member'} · ${num(m.points)} points this week</span></div>${view.family.leader&&!m.isSelf?`<div class="family-member-actions">${actionButton('family_promote','Make leader',`data-member-id="${m.id}"`)}${actionButton('family_kick','Remove',`data-member-id="${m.id}"`)}</div>`:''}</article>`).join('')}</div>`;}
 function tournament(){return renderFamilyTournament({view,now:farmNow(),emblem,rewards:rewardCards(),preview:prizePreview()});}
 function settings(){const f=view.family;return `<div class="family-settings-header">${art('family-management')}<div><h3>${esc(f.name)}</h3><p>${f.members} / ${view.config.maxMembers} farmers · ${f.open?'Open family':'Invite-only'}</p></div></div>${f.leader?inviteSearch.html()+renderSentInvitations(view,farmNow(),actionButton):'<p class="family-notice">Your family leader can invite farmers by player name.</p>'}${f.leader?`<form data-family-form="emblem" class="family-emblem-settings"><h3>Your family emblem</h3><p>Give your family a look of its own.</p><fieldset><legend>Choose an emblem</legend><div class="family-emblems">${FAMILY_EMBLEMS.map(e=>`<label title="${esc(emblemName(e))}"><input type="radio" name="emblem" value="${e.id}" ${e.id===f.emblem?'checked':''} aria-label="${esc(emblemName(e))} emblem">${emblem(e.id)}</label>`).join('')}</div></fieldset><button class="small-button" ${disabled(false)}>Save emblem</button></form><div class="family-setting-row"><div><strong>Open to new farmers</strong><p>Show your family in the Open families list.</p></div>${actionButton('family_open',f.open?'Make invite-only':'Open family',`data-open="${!f.open}"`)}</div><form data-family-form="rename"><label for="family-rename">Family name</label><div class="family-inline"><input id="family-rename" name="name" value="${esc(f.name)}" minlength="3" maxlength="20" required><button class="small-button" ${disabled(f.renameAt>farmNow())}>Rename</button></div><small>${f.renameAt>farmNow()?`Available in ${formatDuration(f.renameAt-farmNow())}`:'You can rename once every seven days.'}</small></form>`:''}<section class="family-leave"><h3>Leave this family</h3><p>You will wait 48 hours before joining or creating another family. This week’s contributions stay with this family.${f.leader?' Leadership passes to the longest-standing member.':''}</p>${actionButton('family_leave','Leave family')}</section>`;}
 function render(){
  if(!dialog.open)return;
  inviteSearch.unmount();
  const focused=document.activeElement,focusId=focused?.id,selection=focused?.selectionStart;
  const heading=document.getElementById('family-subtitle');heading.textContent=view?.family?view.family.name:'A place to grow together';
  document.getElementById('family-feedback').textContent=error;
  document.getElementById('family-tabs').hidden=!view?.family;
  document.querySelectorAll('[data-family-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.familyTab===tab);b.setAttribute('aria-selected',String(b.dataset.familyTab===tab));});
  if(!view){content.innerHTML=`<p class="family-loading">${error?'Your family could not be loaded.':'Opening the Family Hall…'}</p><button id="family-retry" class="small-button">Try again</button>`;content.querySelector('#family-retry').onclick=()=>load(true);return;}
  content.innerHTML=view.family?({week,members,tournament,family:settings}[tab])():landing();
  content.querySelectorAll('[data-family-action]').forEach(b=>b.onclick=()=>{
   const type=b.dataset.familyAction;
   if(['family_leave','family_kick','family_promote'].includes(type)&&!confirm({family_leave:'Leave this family? Joining another family will be unavailable for 48 hours.',family_kick:'Remove this member? A 48-hour join cooldown will apply.',family_promote:'Give this member leadership? You will become a regular member.'}[type]))return;
   act({type,week:view.week,item:b.dataset.item,count:Number(b.dataset.count),invitationId:b.dataset.invitationId,memberId:b.dataset.memberId,rewardId:b.dataset.rewardId,familyId:b.dataset.familyId,open:b.dataset.open==='true'});
  });
  content.querySelectorAll('form[data-family-form]').forEach(form=>form.onsubmit=e=>{e.preventDefault();const d=Object.fromEntries(new FormData(form));const kind=form.dataset.familyForm;act(kind==='extra'?{type:'family_tournament_goods',week:view.week,item:d.item,count:Number(d.count)}:{type:'family_'+kind,...d});});
  inviteSearch.mount(content);
  refreshArt();if(focusId){const next=document.getElementById(focusId);next?.focus({preventScroll:true});if(next&&typeof selection==='number')try{next.setSelectionRange(selection,selection);}catch{}}
 }
 async function act(action){
  if(busy)return;busy=true;generation++;error='';content.querySelectorAll('button').forEach(b=>b.disabled=true);
  try{const result=await runAction(action);view=result.family;lastRead=Date.now();notify(result.message);if(result.completed)dialog.classList.add('family-celebrate');}
  catch(e){error=e.message;notify(error);}
  finally{busy=false;render();refresh();}
 }
 async function load(force=false){
  if(busy||reading||!familyUnlocked(state)||!isReady()||!force&&Date.now()-lastRead<30000)return;
  reading=true;const ticket=generation;
  try{const data=await window.parent.harvestBridge.request({operation:'family'});if(ticket!==generation)return;view=data.family;lastRead=Date.now();error='';
   // Do not disturb a form while a farmer is typing into it.
   if(!content.contains(document.activeElement)||!['INPUT','SELECT'].includes(document.activeElement.tagName))render();
  }catch(e){if(ticket===generation){error=e.message;lastRead=Date.now();render();}}finally{reading=false;refresh();}
 }
 function refresh(){
  button.hidden=!familyUnlocked(state);if(button.hidden)return;
  dot.hidden=!(view?.invitation||view?.rewards.length||view?.order&&!view.contributionLocked&&Object.entries(view.order.lines).some(([k,n])=>(view.order.filled[k]??0)<n&&(state.inventory[k]??0)>0));
  const countdown=dialog.querySelector('[data-family-countdown]');if(countdown&&view)countdown.textContent=formatDuration(Math.max(0,view.endsAt-farmNow()));
  if(!busy&&!reading&&isReady()&&!document.hidden&&Date.now()-lastRead>=30000)void load();
 }
 function open(){if(!familyUnlocked(state))return;document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();render();void load(true);}
 dialog.addEventListener('close',()=>inviteSearch.unmount());
 button.onclick=open;document.querySelectorAll('[data-family-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.familyTab;error='';render();});
 const timer=setInterval(refresh,1000);window.addEventListener('pagehide',()=>{clearInterval(timer);inviteSearch.unmount();},{once:true});
 return {open,refresh};
}
