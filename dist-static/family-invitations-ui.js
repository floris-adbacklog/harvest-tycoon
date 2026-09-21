import {avatarImage} from './player-avatars.js';
import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderFamilyInvitation(view,now,emblem,actionButton){
 const i=view.invitation;
 if(!i)return `<section class="family-invitation-empty">${art('family-members')}<div><h3>Your invitation</h3><p>No pending invitation. A family leader can find your player name and invite you here.</p><small>You can have one pending invitation at a time.</small></div></section>`;
 const canAccept=i.canAccept&&i.expiresAt>now;
 return `<section class="family-incoming-invitation" aria-labelledby="family-invitation-heading"><span class="eyebrow">YOU ARE INVITED</span><div class="family-invitation-identity">${emblem(i.family.emblem)}<div><h3 id="family-invitation-heading">${esc(i.family.name)}</h3><p>Invited by ${esc(i.invitedBy)} · ${i.family.members} / ${view.config.maxMembers} farmers</p></div></div><p>Join this family to work on weekly orders and earn tournament rewards together.</p><small>Expires in ${formatDuration(Math.max(0,i.expiresAt-now))}</small>${canAccept?'':`<p class="family-notice">${i.family.members>=view.config.maxMembers?'This family is full right now.':view.cooldownUntil>now?`You can join in ${formatDuration(view.cooldownUntil-now)}.`:'This invitation is no longer available.'}</p>`}<div class="family-invitation-actions">${actionButton('family_accept_invite','Accept invitation',`data-invitation-id="${esc(i.id)}"`,!canAccept)}${actionButton('family_decline_invite','Decline',`data-invitation-id="${esc(i.id)}"`)}</div></section>`;
}
export function renderSentInvitations(view,now,actionButton){
 if(!view.family?.leader)return '';
 return `<section class="family-sent-invitations"><h3>Pending invitations</h3>${view.sentInvitations?.length?view.sentInvitations.map(i=>`<div class="family-sent-invitation"><div><strong>${esc(i.username)}</strong><span>Expires in ${formatDuration(Math.max(0,i.expiresAt-now))}</span></div>${actionButton('family_cancel_invite','Cancel',`data-invitation-id="${esc(i.id)}"`)}</div>`).join(''):'<p>No invitations waiting for a reply.</p>'}</section>`;
}
export function createFamilyInviteSearch({request,onInvite,getView,playerId,isBusy}){
 let query='',players=[],status='Enter at least 2 characters to find a farmer.',sequence=0,timer,root=null,familyId=null;
 function candidate(p){const view=getView();if(p.playerId===playerId)return 'You';if(p.family)return 'Already in a family';if(p.level<view.config.minLevel)return `Level ${view.config.minLevel} required`;if(view.sentInvitations?.some(i=>i.recipientId===p.playerId))return 'Invited';if(view.family.members>=view.config.maxMembers)return 'Family full';return '';}
 function results(){return players.map(p=>{const reason=candidate(p);return `<div class="family-invite-result">${avatarImage(p.avatarId)}<div><strong>${esc(p.username)}</strong><span>Level ${p.level}${p.family?` · ${esc(p.family.name)}`:''}</span></div><button type="button" class="small-button" data-invite-player="${esc(p.playerId)}" ${reason||isBusy()?'disabled':''}>${esc(reason||'Invite')}</button></div>`;}).join('');}
 function paint(){if(!root)return;root.querySelector('[data-invite-search-status]').textContent=status;root.querySelector('[data-invite-search-results]').innerHTML=results();}
 async function search(ticket,value){
  if(ticket!==sequence||!root)return;status='Looking around the valley…';paint();
  try{const data=await request({operation:'player_search',query:value});if(ticket!==sequence||!root)return;players=data.players;status=players.length?`${players.length} farmer${players.length===1?'':'s'} found.${data.hasMore?' Keep typing to narrow your search.':''}`:'No farmers found. Try another name.';}
  catch(error){if(ticket!==sequence||!root)return;players=[];status=error.message;}
  paint();
 }
 function changed(){query=root.querySelector('input').value;players=[];const ticket=++sequence;clearTimeout(timer);const value=query.trim();status=value.length<2?'Enter at least 2 characters to find a farmer.':'Searching…';paint();if(value.length>=2)timer=setTimeout(()=>search(ticket,value),300);}
 return {
  html(){if(familyId!==getView().family?.id){familyId=getView().family?.id;query='';players=[];status='Enter at least 2 characters to find a farmer.';}return `<section class="family-name-invite">${art('family-members')}<h3>Invite a farmer</h3><p>Search by player name. They can accept or decline in their Family Hall.</p><label for="family-invite-name">Player name</label><input id="family-invite-name" type="search" maxlength="20" autocomplete="off" placeholder="Search player name…" value="${esc(query)}" aria-describedby="family-invite-search-status"><p id="family-invite-search-status" data-invite-search-status role="status">${esc(status)}</p><div data-invite-search-results>${results()}</div><small>From level ${getView().config.minLevel} · One pending invitation per player · Expires after 7 days</small></section>`;},
  mount(container){root=container.querySelector('.family-name-invite');if(!root)return;root.querySelector('input').addEventListener('input',changed);root.querySelector('input').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();clearTimeout(timer);if(query.trim().length>=2)void search(++sequence,query.trim());}});if(query.trim().length>=2&&!players.length)void search(++sequence,query.trim());root.querySelector('[data-invite-search-results]').onclick=async event=>{const b=event.target.closest('[data-invite-player]');if(!b||b.disabled||isBusy())return;b.disabled=true;await onInvite({type:'family_invite',playerId:b.dataset.invitePlayer});paint();};},
  unmount(){++sequence;clearTimeout(timer);root=null;}
 };
}
