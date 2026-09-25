import {playerAvatar,avatarImage} from '../public/player-avatars.js';
import {vipBadge,refreshVipBadges} from '../public/vip-ui.js';
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {CROPS,ITEMS,MASTERY_TIERS,FAMILY_EMBLEMS} from '../game/farm-state.js';

export const escapeProfileText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeProfileText;
const fmt=value=>Math.max(0,Number(value)||0).toLocaleString('en-US');
const two=value=>String(value).padStart(2,'0');
// Dates are shown as DD-MM-YYYY, in UTC, so every viewer sees the same day. Never a time.
export function formatDate(ms){
 const time=Number(ms);if(!Number.isFinite(time)||time<=0)return null;
 const day=new Date(time),year=day.getUTCFullYear(),month=two(day.getUTCMonth()+1),date=two(day.getUTCDate());
 return {text:`${date}-${month}-${year}`,iso:`${year}-${month}-${date}`};
}
const since=ms=>{const date=formatDate(ms);return date?`<p class="farmer-since"><svg class="farmer-since-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 3v4M16 3v4M4 10h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></svg>Member since <time datetime="${date.iso}">${date.text}</time></p>`:'';};
const presence=online=>`<span class="farmer-presence"><span class="online-dot${online?' is-online':''}" aria-hidden="true"></span>${online?'Online':'Offline'}</span>`;
// Crop mastery: one card per crop with its best badge, and a dot for each of the four badges (bronze, silver, gold, platinum)
// that is earned. The best crops first, then in the order they unlock.
export function masteryByCrop(badges){
 const order=Object.keys(CROPS),byCrop=new Map();
 for(const b of badges){if(!CROPS[b.crop]||!MASTERY_TIERS[b.tier])continue;const tiers=byCrop.get(b.crop)??new Set();tiers.add(Number(b.tier));byCrop.set(b.crop,tiers);}
 return [...byCrop].map(([crop,tiers])=>({crop,tiers,best:Math.max(...tiers)})).sort((a,b)=>b.best-a.best||order.indexOf(a.crop)-order.indexOf(b.crop));
}
const masteryCard=({crop,tiers,best})=>`<div class="farmer-badge farmer-badge-${best}" title="${esc(MASTERY_TIERS[best].name)} · ${esc(CROPS[crop].name)}">${art(crop)}<strong>${esc(CROPS[crop].name)}</strong><span>${esc(MASTERY_TIERS[best].name)}</span><span class="farmer-badge-pips" role="img" aria-label="${tiers.size} of ${MASTERY_TIERS.length} badges">${MASTERY_TIERS.map((tier,i)=>`<i class="tier-${i}${tiers.has(i)?' is-earned':''}" title="${esc(tier.name)}"></i>`).join('')}</span></div>`;
export function renderPlayerProfile(player,now=Date.now()){
 const family=player.family,emblem=FAMILY_EMBLEMS.find(e=>e.id===family?.emblem),stats=player.stats??{};
 const tiles=[['harvested_crops','Crops harvested','harvest'],['goods_produced','Goods produced','buildings'],['items_sold','Items sold','market'],['deliveries','Deliveries completed','cart']];
 const badges=player.badges??[],mastered=masteryByCrop(badges);
 return `<div class="farmer-identity"><div class="farmer-avatar" aria-hidden="true"><img class="farmer-avatar-img" src="${playerAvatar(player.avatarId).src}" alt="" width="384" height="384" decoding="async" draggable="false"></div><div><span class="eyebrow">FARMER OF THE VALLEY</span><h3>${esc(player.username)}${vipBadge(player.vipExpiresAt,now)}</h3><div class="farmer-identity-meta"><span class="farmer-level">${art('xp')}Level ${fmt(player.level)}</span>${presence(player.online)}</div>${since(player.memberSince)}${vipBadge(player.vipExpiresAt,now,true)}</div></div>
 <div class="farmer-chat" data-farmer-chat hidden></div>
 <section class="farmer-family" aria-label="Family">${emblem?`<span class="farmer-family-emblem" style="--family-color:${esc(emblem.color)}">${art(emblem.icon)}</span>`:art('familyhall')}<div><span class="eyebrow">FAMILY</span><h4>${esc(family?.name??'No family yet')}</h4><p>${esc(family?.role??'Growing at their own pace')}</p></div><div class="farmer-invite" data-farmer-invite hidden></div></section>
 <h3 class="farmer-section-title">Life on the farm</h3><div class="farmer-stat-grid">${tiles.map(([key,label,icon])=>`<div class="farmer-stat">${art(icon)}<div><strong>${fmt(stats[key])}</strong><span>${label}</span></div></div>`).join('')}</div>
 <section class="farmer-badges"><div class="farmer-section-heading"><h3 class="farmer-section-title">Crop mastery</h3><span>${badges.length} / ${Object.keys(CROPS).length*MASTERY_TIERS.length} badges</span></div>${mastered.length?`<div class="farmer-badge-grid">${mastered.map(masteryCard).join('')}</div>${mastered.length<Object.keys(CROPS).length?`<p class="farmer-badge-more">${Object.keys(CROPS).length-mastered.length} more crops to master</p>`:''}`:'<p class="farmer-empty">Every harvest is a step towards a first mastery badge.</p>'}</section>`;
}
export function renderPlayerSearch(players,now=Date.now()){
 return players.map(p=>`<button type="button" class="farmer-search-result" data-player-id="${esc(p.playerId)}" aria-haspopup="dialog"><span class="farmer-search-avatar" aria-hidden="true">${avatarImage(p.avatarId)}</span><span class="farmer-search-name"><strong>${esc(p.username)}${vipBadge(p.vipExpiresAt,now)}</strong><small>${p.family?esc(p.family.name):'No family yet'} · Level ${fmt(p.level)}</small></span>${presence(p.online)}<span aria-hidden="true">›</span></button>`).join('');
}
// Checked once per session and cached: only ever true for the one admin account, and only ever used to decide
// whether to draw the gift form at all. The real gate is server-side (farm-api rejects anyone else outright), so
// this cannot be tricked into granting access — at worst a wrong guess here just shows or hides a form.
// Imported lazily, on first use, rather than at the top of the file: this module is also loaded directly by
// tests that never touch the admin box, in a plain Node run where '@supabase/supabase-js' is not installed
// (only Vite's build resolves it) — a top-level import would break every one of those tests to serve this one.
let adminCheck=null;
export function checkAdmin(){
 return adminCheck??=import('./supabase.js').then(({supabase})=>supabase?.auth.getUser()).then(result=>String(result?.data?.user?.email??'').trim().toLowerCase()==='floris@millstone.nl').catch(()=>false);
}
// Every seed and production good, grouped the way a farmer already thinks about them.
const adminGrantItemOptions=`<option value="">None</option><optgroup label="Crops">${Object.entries(CROPS).map(([key,c])=>`<option value="${key}" data-art="${key}">${esc(c.name)}</option>`).join('')}</optgroup><optgroup label="Goods produced">${Object.entries(ITEMS).filter(([key])=>!Object.hasOwn(CROPS,key)).map(([key,c])=>`<option value="${key}" data-art="${key}">${esc(c.name)}</option>`).join('')}</optgroup>`;
// Sequence tokens invalidate pending work as soon as the user types, switches
// players, closes a dialog or leaves the page. Late responses cannot reopen it.
export function createPlayerProfiles(bridge){
 const board=document.getElementById('leaderboard-dialog');
 const search=document.createElement('section');search.className='farmer-search';search.setAttribute('aria-label','Player search');
 search.innerHTML='<label for="farmer-search-input">Find a farmer</label><div class="farmer-search-control"><input id="farmer-search-input" type="search" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Search by player name…" aria-describedby="farmer-search-status"><button type="button" class="small-button" id="farmer-search-clear" hidden>Clear</button></div><p id="farmer-search-status" role="status">Enter at least 2 characters to search all farmers.</p><div id="farmer-search-results"></div>';
 (board.querySelector('.rank-drawer')??board.querySelector('.leaderboard-filter')).before(search);
 const dialog=document.createElement('dialog');dialog.id='player-profile-dialog';dialog.className='game-dialog farmer-profile-dialog';dialog.setAttribute('aria-labelledby','farmer-profile-title');
 dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="farmer-profile-title">Farmer profile</h2></div><button class="icon-button farmer-profile-close" aria-label="Close player profile">×</button></div><div id="admin-grant" class="admin-grant" hidden></div><div id="farmer-profile-content" aria-busy="false"></div><p id="farmer-profile-status" class="farmer-profile-status" role="status"></p><button type="button" class="small-button farmer-profile-back">Back to leaderboard</button>';
 document.body.append(dialog);
 const input=search.querySelector('input'),clear=search.querySelector('#farmer-search-clear'),results=search.querySelector('#farmer-search-results'),status=search.querySelector('#farmer-search-status');
 const content=dialog.querySelector('#farmer-profile-content'),profileStatus=dialog.querySelector('#farmer-profile-status'),adminGrant=dialog.querySelector('#admin-grant');
 // Built fresh per farmer, only for the admin account; everyone else never sees this box (still enforced again, for real, by the server).
 function renderAdminGrant(playerId){
  adminGrant.hidden=false;
  adminGrant.innerHTML=`<strong class="admin-grant-title">${art('gift')}Admin gift</strong><div class="admin-grant-row">
   <label class="admin-grant-field"><span class="admin-grant-field-label">${art('coins')}Coins</span><input type="number" inputmode="numeric" min="0" step="1" value="0" id="admin-grant-coins"></label>
   <label class="admin-grant-field"><span class="admin-grant-field-label">${art('xp')}XP</span><input type="number" inputmode="numeric" min="0" step="1" value="0" id="admin-grant-xp"></label>
   <label class="admin-grant-field"><span class="admin-grant-field-label">${art('diamonds')}Diamonds</span><input type="number" inputmode="numeric" min="0" step="1" value="0" id="admin-grant-diamonds"></label>
  </div><div class="admin-grant-item-row">
   <label class="admin-grant-field admin-grant-item-select"><span class="admin-grant-field-label">${art('seeds')}Crop or good</span><select id="admin-grant-item">${adminGrantItemOptions}</select></label>
   <label class="admin-grant-field admin-grant-item-count"><span class="admin-grant-field-label">Quantity</span><input type="number" inputmode="numeric" min="0" step="1" value="0" id="admin-grant-item-count"></label>
  </div><label class="admin-grant-notify"><input type="checkbox" id="admin-grant-notify"><span>Notify the player — they see a "Donation!" popup with these amounts</span></label><textarea id="admin-grant-message" maxlength="200" rows="2" placeholder="Optional message, shown with the notification" hidden></textarea><button type="button" class="primary-button admin-grant-give" id="admin-grant-give">${art('gift')}Give</button><p id="admin-grant-status" role="status"></p>`;
  const coinsInput=adminGrant.querySelector('#admin-grant-coins'),xpInput=adminGrant.querySelector('#admin-grant-xp'),diamondsInput=adminGrant.querySelector('#admin-grant-diamonds');
  const itemSelect=adminGrant.querySelector('#admin-grant-item'),itemCountInput=adminGrant.querySelector('#admin-grant-item-count');
  const notifyInput=adminGrant.querySelector('#admin-grant-notify'),messageInput=adminGrant.querySelector('#admin-grant-message');
  const give=adminGrant.querySelector('#admin-grant-give'),grantStatus=adminGrant.querySelector('#admin-grant-status');
  // The message field only makes sense once notify is on; it stays out of the way otherwise.
  notifyInput.onchange=()=>{messageInput.hidden=!notifyInput.checked;};
  give.onclick=async()=>{
   const coins=Math.max(0,Math.floor(Number(coinsInput.value)||0)),xp=Math.max(0,Math.floor(Number(xpInput.value)||0)),diamonds=Math.max(0,Math.floor(Number(diamondsInput.value)||0));
   const item=itemSelect.value||null,itemCount=item?Math.max(0,Math.floor(Number(itemCountInput.value)||0)):0;
   if(!coins&&!xp&&!diamonds&&!(item&&itemCount)){grantStatus.textContent='Enter at least one amount.';return;}
   const notify=notifyInput.checked,message=notify?messageInput.value.trim():'';
   const parts=[coins&&`${coins} coins`,xp&&`${xp} XP`,diamonds&&`${diamonds} diamonds`,item&&itemCount&&`${itemCount} ${ITEMS[item].name}`].filter(Boolean).join(', ');
   const sure=await confirmAction({title:`Give ${profileUsername??'this farmer'}?`,description:`${parts}.${notify?' They will be notified.':''}`,confirmLabel:'Give',cancelLabel:'Cancel',picture:'gift'});
   if(!sure)return;
   give.disabled=true;grantStatus.textContent='Giving…';
   try{
    const data=await bridge.request({operation:'admin_grant',playerId,coins,xp,diamonds,item,itemCount,notify,message});
    const itemPart=data.granted.item?` · +${data.granted.itemCount} ${ITEMS[data.granted.item].name}`:'';
    grantStatus.textContent=`Given: +${data.granted.coins} coins · +${data.granted.xp} XP · +${data.granted.diamonds} diamonds${itemPart}. New level: ${data.totals.level}.${notify?' Notified.':''}`;
    coinsInput.value='0';xpInput.value='0';diamondsInput.value='0';itemSelect.value='';itemCountInput.value='0';messageInput.value='';
    // Gifting yourself: your own running farm (same window, farm.html's own script) still has the old balance
    // in memory and no reason of its own to refetch — force the same reload a reconnect would do, so the coin
    // counter catches up and, if notify was on, the "Donation!" popup actually shows instead of silently waiting
    // for a page reload that might never come during this test.
    if(playerId===bridge.playerId)window.harvestRefresh?.().catch(()=>{});
   }catch(error){grantStatus.textContent=error.message;}
   finally{give.disabled=false;}
  };
 }
 // The chat (src/chat-ui.js) adds the Moderator badge, Send message, Block and the staff's chat buttons after every draw.
 let chatExtras=null;
 let searchSequence=0,profileSequence=0,timer,selected=null,returnFocus,disposed=false,profileUsername=null,clockOffset=Number.isFinite(bridge.serverNow)?bridge.serverNow-Date.now():0;
 function close(){dialog.close();}
 dialog.querySelector('.farmer-profile-close').onclick=close;dialog.querySelector('.farmer-profile-back').onclick=close;
 dialog.addEventListener('close',()=>{++profileSequence;selected=null;if(!disposed)(returnFocus?.isConnected?returnFocus:input).focus();});
 // From the leaderboard (the default) or from somewhere else, such as the Family Members list, which names its own way back.
 // back:null (the chat) shows no way back at all: closing the profile is the way back.
 async function open(playerId,{back='Back to leaderboard'}={}){
  if(disposed)return;returnFocus=document.activeElement;selected=playerId;profileUsername=null;++profileSequence;
  const backButton=dialog.querySelector('.farmer-profile-back');backButton.hidden=back===null;if(back!==null)backButton.textContent=back;
  dialog.querySelector('#farmer-profile-title').textContent='Farmer profile';
  content.innerHTML='<p class="farmer-empty">Opening this farmer’s gate…</p>';profileStatus.textContent='';
  adminGrant.hidden=true;adminGrant.innerHTML='';
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  checkAdmin().then(admin=>{if(!disposed&&admin&&selected===playerId&&dialog.open)renderAdminGrant(playerId);});
  await loadProfile(false);
 }
 // A family leader sees "Invite to <family>" on the profile of a farmer without a family (public/family-ui.js decides whether
 // that is possible and sends the invitation; the reason shows on the button when it is not).
 function showInvite(player){
  const box=content.querySelector('[data-farmer-invite]'),family=window.harvestFamilyInvite,offer=box&&family?.offer?.(player);
  if(!offer)return;
  const label=`Invite to ${offer.familyName}`;
  box.hidden=false;box.innerHTML=`<button type="button" class="small-button farmer-invite-button" ${offer.reason?'disabled':''}>${esc(offer.reason||label)}</button>`;
  box.querySelector('button').onclick=async event=>{
   const button=event.currentTarget;button.disabled=true;button.textContent='Inviting…';
   const sent=await family.invite(player.playerId);button.textContent=sent?'Invited':label;button.disabled=sent;
  };
 }
 async function loadProfile(quiet){
  const id=selected,ticket=++profileSequence;if(!id)return;content.setAttribute('aria-busy','true');
  try{
   const data=await bridge.request({operation:'player_profile',playerId:id});
   if(disposed||ticket!==profileSequence||!dialog.open)return;
   const y=dialog.scrollTop;clockOffset=Number.isFinite(data.serverNow)?data.serverNow-Date.now():0;content.innerHTML=renderPlayerProfile(data.playerProfile,Date.now()+clockOffset);refreshVipBadges(dialog,Date.now()+clockOffset);
   profileUsername=data.playerProfile.username;showInvite(data.playerProfile);
   chatExtras?.(data.playerProfile,content,{isCurrent:()=>!disposed&&selected===id&&dialog.open});
   dialog.querySelector('#farmer-profile-title').textContent=`${data.playerProfile.username}'s profile`;
   profileStatus.textContent='Online status is based on activity in the last 30 minutes.';
   if(quiet)dialog.scrollTop=y;
  }catch(error){
   if(disposed||ticket!==profileSequence||!dialog.open)return;
   if(!quiet)content.replaceChildren();profileStatus.textContent=quiet?'Could not refresh this profile. Showing the last update.':error.message;
   if(!quiet){const retry=document.createElement('button');retry.className='small-button';retry.textContent='Try again';retry.onclick=()=>loadProfile(false);content.append(retry);}
  }finally{if(ticket===profileSequence)content.setAttribute('aria-busy','false');}
 }
 async function searchPlayers(ticket,query){
  if(disposed||ticket!==searchSequence)return;
  results.setAttribute('aria-busy','true');status.textContent='Looking around the valley…';
  try{
   const data=await bridge.request({operation:'player_search',query});
   if(disposed||ticket!==searchSequence)return;
   clockOffset=Number.isFinite(data.serverNow)?data.serverNow-Date.now():clockOffset;results.innerHTML=renderPlayerSearch(data.players,Date.now()+clockOffset);
   status.textContent=data.players.length?`${data.players.length} farmer${data.players.length===1?'':'s'} found.${data.hasMore?' More matches available — keep typing to narrow your search.':''}`:'No farmers found. Try another name.';
  }catch(error){if(!disposed&&ticket===searchSequence){results.replaceChildren();status.textContent=error.message;}}
  finally{if(ticket===searchSequence)results.setAttribute('aria-busy','false');}
 }
 function changed(){
  clearTimeout(timer);const ticket=++searchSequence,query=input.value.trim();clear.hidden=!input.value;results.replaceChildren();results.setAttribute('aria-busy','false');
  if(query.length<2){status.textContent='Enter at least 2 characters to search all farmers.';return;}
  status.textContent='Searching…';timer=setTimeout(()=>searchPlayers(ticket,query),300);
 }
 input.addEventListener('input',changed);clear.onclick=()=>{input.value='';changed();input.focus();};
 results.onclick=event=>{const button=event.target.closest('[data-player-id]');if(button&&results.contains(button))open(button.dataset.playerId);};
 const vipTimer=setInterval(()=>{if(!disposed&&!document.hidden)refreshVipBadges(document,Date.now()+clockOffset);},1000);
 const refresh=setInterval(()=>{
  if(disposed||document.hidden)return;
  if(dialog.open)loadProfile(true);
  else if(board.open&&input.value.trim().length>=2&&results.children.length&&document.activeElement!==input&&!results.contains(document.activeElement))searchPlayers(++searchSequence,input.value.trim());
 },30000);
 window.addEventListener('pagehide',()=>{disposed=true;++searchSequence;++profileSequence;clearTimeout(timer);clearInterval(refresh);clearInterval(vipTimer);},{once:true});
 return {open,get isOpen(){return dialog.open;},setChatExtras(fn){chatExtras=fn;}};
}
