import {art} from '../public/visual-icons.js';
import {CROPS,MASTERY_TIERS,FAMILY_EMBLEMS} from '../game/farm-state.js';

export const escapeProfileText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=escapeProfileText;
const fmt=value=>Math.max(0,Number(value)||0).toLocaleString('en-US');
const initials=name=>String(name??'Farmer').split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase();
const presence=online=>`<span class="farmer-presence"><span class="online-dot${online?' is-online':''}" aria-hidden="true"></span>${online?'Online':'Offline'}</span>`;
export function renderPlayerProfile(player){
 const family=player.family,emblem=FAMILY_EMBLEMS.find(e=>e.id===family?.emblem),stats=player.stats??{};
 const tiles=[['harvested_crops','Crops harvested','harvest'],['goods_produced','Goods produced','buildings'],['items_sold','Items sold','market'],['deliveries','Deliveries completed','cart']];
 const badges=player.badges??[];
 return `<div class="farmer-identity"><div class="farmer-avatar" aria-hidden="true">${art('wheat')}<span>${esc(initials(player.username))}</span></div><div><span class="eyebrow">FARMER OF THE VALLEY</span><h3>${esc(player.username)}</h3><div class="farmer-identity-meta"><span class="farmer-level">${art('xp')}Level ${fmt(player.level)}</span>${presence(player.online)}</div></div></div>
 <section class="farmer-family" aria-label="Family">${art(emblem?.icon??'familyhall')}<div><span class="eyebrow">FAMILY</span><h4>${esc(family?.name??'No family yet')}</h4><p>${esc(family?.role??'Growing at their own pace')}</p></div></section>
 <h3 class="farmer-section-title">Life on the farm</h3><div class="farmer-stat-grid">${tiles.map(([key,label,icon])=>`<div class="farmer-stat">${art(icon)}<div><strong>${fmt(stats[key])}</strong><span>${label}</span></div></div>`).join('')}</div>
 <section class="farmer-badges"><div class="farmer-section-heading"><h3 class="farmer-section-title">Crop mastery</h3><span>${badges.length} / 48 badges</span></div>${badges.length?`<div class="farmer-badge-grid">${badges.map(b=>{const crop=CROPS[b.crop],tier=MASTERY_TIERS[b.tier];if(!crop||!tier)return '';return `<div class="farmer-badge farmer-badge-${Number(b.tier)}" title="${esc(tier.name)} · ${esc(crop.name)}">${art(b.crop)}<strong>${esc(crop.name)}</strong><span>${esc(tier.name)}</span></div>`;}).join('')}</div>`:'<p class="farmer-empty">Every harvest is a step towards a first mastery badge.</p>'}</section>`;
}
export function renderPlayerSearch(players){
 return players.map(p=>`<button type="button" class="farmer-search-result" data-player-id="${esc(p.playerId)}" aria-haspopup="dialog"><span class="farmer-search-avatar" aria-hidden="true">${esc(initials(p.username))}</span><span class="farmer-search-name"><strong>${esc(p.username)}</strong><small>${p.family?esc(p.family.name):'No family yet'} · Level ${fmt(p.level)}</small></span>${presence(p.online)}<span aria-hidden="true">›</span></button>`).join('');
}
// Sequence tokens invalidate pending work as soon as the user types, switches
// players, closes a dialog or leaves the page. Late responses cannot reopen it.
export function createPlayerProfiles(bridge){
 const board=document.getElementById('leaderboard-dialog');
 const search=document.createElement('section');search.className='farmer-search';search.setAttribute('aria-label','Player search');
 search.innerHTML='<label for="farmer-search-input">Find a farmer</label><div class="farmer-search-control"><input id="farmer-search-input" type="search" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Search by player name…" aria-describedby="farmer-search-status"><button type="button" class="small-button" id="farmer-search-clear" hidden>Clear</button></div><p id="farmer-search-status" role="status">Enter at least 2 characters to search all farmers.</p><div id="farmer-search-results"></div>';
 board.querySelector('.leaderboard-filter').before(search);
 const dialog=document.createElement('dialog');dialog.id='player-profile-dialog';dialog.className='game-dialog farmer-profile-dialog';dialog.setAttribute('aria-labelledby','farmer-profile-title');
 dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">GROWING TOGETHER</span><h2 id="farmer-profile-title">Farmer profile</h2></div><button class="icon-button farmer-profile-close" aria-label="Close player profile">×</button></div><div id="farmer-profile-content" aria-busy="false"></div><p id="farmer-profile-status" class="farmer-profile-status" role="status"></p><button type="button" class="small-button farmer-profile-back">Back to leaderboard</button>';
 document.body.append(dialog);
 const input=search.querySelector('input'),clear=search.querySelector('#farmer-search-clear'),results=search.querySelector('#farmer-search-results'),status=search.querySelector('#farmer-search-status');
 const content=dialog.querySelector('#farmer-profile-content'),profileStatus=dialog.querySelector('#farmer-profile-status');
 let searchSequence=0,profileSequence=0,timer,selected=null,returnFocus,disposed=false;
 function close(){dialog.close();}
 dialog.querySelector('.farmer-profile-close').onclick=close;dialog.querySelector('.farmer-profile-back').onclick=close;
 dialog.addEventListener('close',()=>{++profileSequence;selected=null;if(!disposed)(returnFocus?.isConnected?returnFocus:input).focus();});
 async function open(playerId){
  if(disposed)return;returnFocus=document.activeElement;selected=playerId;++profileSequence;
  dialog.querySelector('#farmer-profile-title').textContent='Farmer profile';
  content.innerHTML='<p class="farmer-empty">Opening this farmer’s gate…</p>';profileStatus.textContent='';
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
  await loadProfile(false);
 }
 async function loadProfile(quiet){
  const id=selected,ticket=++profileSequence;if(!id)return;content.setAttribute('aria-busy','true');
  try{
   const data=await bridge.request({operation:'player_profile',playerId:id});
   if(disposed||ticket!==profileSequence||!dialog.open)return;
   const y=dialog.scrollTop;content.innerHTML=renderPlayerProfile(data.playerProfile);
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
   results.innerHTML=renderPlayerSearch(data.players);
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
 const refresh=setInterval(()=>{
  if(disposed||document.hidden)return;
  if(dialog.open)loadProfile(true);
  else if(board.open&&input.value.trim().length>=2&&results.children.length&&document.activeElement!==input&&!results.contains(document.activeElement))searchPlayers(++searchSequence,input.value.trim());
 },30000);
 window.addEventListener('pagehide',()=>{disposed=true;++searchSequence;++profileSequence;clearTimeout(timer);clearInterval(refresh);},{once:true});
 return {open,get isOpen(){return dialog.open;}};
}
