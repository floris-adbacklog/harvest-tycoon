// A family's profile (27 Sep 2026): its emblem and level, its farmers, and how it has done — tournaments won and on the podium,
// chest tiers opened, Family Orders completed, and this week so far. Opened from a farmer's profile, the list of families, your own
// family's heading and the tournament: window.harvestFamilyProfile.open(familyId). The numbers come from familyProfile (farm-state.js)
// through farm-api's read-only family_profile request; Join and Ask to join run through the Family window, as in its list.
import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {vipBadge,refreshVipBadges} from './vip-ui.js';
import {FAMILY_JOIN_MODES,FAMILY_MIN_LEVEL} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {rankArt} from './rank-art.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const place=rank=>({1:'1st',2:'2nd',3:'3rd'}[rank]??`${rank}th`);
const day=ms=>new Date(ms).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short',year:'numeric'});
const weekOf=week=>new Date((week*7+4)*86400000).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});

// What the farmer looking can do here, in the same words as the list of families.
export function familyProfileAction(p){
 const v=p.viewer;
 if(v.member)return {button:'open',label:'Open your family'};
 if(v.inFamily)return {note:'You are in another family.'};
 if(!v.unlocked)return {note:`Farm Families open at level ${FAMILY_MIN_LEVEL}.`};
 if(p.full)return {note:'This family is full.'};
 if(p.mode==='open')return v.cooldown?{note:'You recently left a family; you can join again soon.'}:{button:'family_join',label:'Join'};
 if(p.mode==='request'){
  if(v.requestId)return {button:'family_request_cancel',label:'Cancel request',note:'You asked to join. Their leader can accept or decline.'};
  if(v.requestElsewhere)return {note:'You already asked another family to join.'};
  return v.cooldown?{note:'You recently left a family; you can ask again soon.'}:{button:'family_request',label:'Ask to join'};
 }
 return {note:p.mode==='closed'?'This family is not taking new farmers.':'Invite only: the leader invites farmers by name.'};
}

export function renderFamilyProfile(p,{emblem,now=Date.now(),profiles=true}){
 const s=p.standing,next=s.next,progress=next?Math.min(100,Math.round(s.tiers/next*100)):100;
 const tile=(picture,value,label)=>`<div class="family-profile-stat">${art(picture)}<strong>${value}</strong><span>${label}</span></div>`;
 const member=m=>`<article class="family-member"><button type="button" class="family-member-open" data-player-profile="${esc(m.playerId)}" ${profiles?'':'disabled'}><span class="family-member-portrait">${avatarImage(m.avatarId)}<span class="online-dot ${m.online?'is-online':''}" role="img" aria-label="${m.online?'Online':'Offline'}" title="${m.online?'Online':'Offline'}"></span></span><span class="family-member-copy"><strong>${esc(m.username)}${vipBadge(m.vipExpiresAt,now)}${m.leader?'<span class="family-role">Leader</span>':''}</strong><small>Level ${num(m.level)}</small></span>${profiles?'<span class="family-sr-only">Open profile</span>':''}</button></article>`;
 const action=familyProfileAction(p);
 return `<section class="family-profile-hero">
  <span class="family-profile-emblem">${emblem(p.emblem)}<b class="family-level-badge" title="Family level ${s.level}">${s.level}</b></span>
  <div><h3>${esc(p.name)}</h3><p>${num(p.members.length)} / ${num(p.maxMembers)} farmers · ${num(p.online)} online</p>
   <div class="family-profile-tags"><span class="family-mode-chip">${esc(FAMILY_JOIN_MODES[p.mode]??'Invite only')}</span>${p.createdAt?`<small>Since ${day(p.createdAt)}</small>`:''}</div></div>
 </section>
 <section class="family-profile-level" aria-label="Family level">
  <div><strong>Level ${s.level}</strong><span>${next?`${num(s.tiers)} of ${num(next)} chest tiers to level ${s.level+1}`:'The highest family level'}</span></div>
  <span class="family-profile-bar" aria-hidden="true"><i style="width:${progress}%"></i></span>
  ${s.bonus?`<small>+${Math.round(s.bonus*100)}% on Family Chest and Family Order rewards</small>`:'<small>Each level adds 10% to Family Chest and Family Order rewards.</small>'}
 </section>
 <section class="family-profile-stats" aria-label="How this family has done">
  ${tile('family-tournament',num(p.stats.wins),p.stats.wins===1?'Tournament won':'Tournaments won')}
  ${tile('trophy',num(p.stats.podiums),'Podium places')}
  ${tile('family-chest-gold',num(p.stats.chestTiers),'Chest tiers opened')}
  ${tile('family-weekly-order',num(p.stats.orders),'Family Orders done')}
  ${tile('family-chest-wood',num(p.thisWeek.chestPoints),'Chest points this week')}
  ${tile('family-tournament',p.thisWeek.rank?`#${p.thisWeek.rank}`:'—',p.thisWeek.rank?'In the tournament now':'Not in the tournament yet')}
 </section>
 <section class="family-profile-members"><h3>Farmers</h3><div class="family-member-list">${p.members.map(member).join('')}</div></section>
 <section class="family-profile-recent"><h3>Recent tournaments</h3>${p.recent.length?p.recent.map(r=>`<div class="family-list-row"><b class="family-rank">${rankArt(r.rank)}</b><div><strong>${place(r.rank)} place</strong><span>Week of ${weekOf(r.week)} · ${num(r.points)} points</span></div></div>`).join(''):'<p class="family-profile-empty">No finished tournament yet. A week ends on Monday, 00:00 UTC.</p>'}</section>
 <div class="family-profile-actions">${action.note?`<p class="family-notice">${esc(action.note)}</p>`:''}${action.button?`<button type="button" class="${action.button==='open'||action.button==='family_join'||action.button==='family_request'?'primary-button':'small-button'}" data-family-profile-action="${action.button}">${esc(action.label)}</button>`:''}</div>`;
}

export function createFamilyProfile({emblem,act,openFamily,request=body=>window.parent.harvestBridge.request(body)}){
 const dialog=document.createElement('dialog');dialog.id='family-profile-dialog';dialog.className='game-dialog family-profile-dialog';dialog.setAttribute('aria-labelledby','family-profile-title');
 dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">FARM FAMILY</span><h2 id="family-profile-title">Family profile</h2></div><button type="button" class="icon-button" data-family-profile-close aria-label="Close family profile">×</button></div><div id="family-profile-content" class="family-profile" aria-live="polite"></div>';
 document.body.append(dialog);
 const content=dialog.querySelector('#family-profile-content');
 dialog.querySelector('[data-family-profile-close]').onclick=()=>dialog.close();
 let shown=null,sequence=0,busy=false;
 function paint(p){
  shown=p;
  content.innerHTML=renderFamilyProfile(p,{emblem,now:farmNow(),profiles:!!window.harvestProfiles});refreshArt();refreshVipBadges(content,farmNow());
  content.querySelectorAll('[data-player-profile]').forEach(b=>b.onclick=()=>{dialog.close();window.harvestProfiles?.open(b.dataset.playerProfile,{back:null});});
  content.querySelector('[data-family-profile-action]')?.addEventListener('click',async event=>{
   const type=event.currentTarget.dataset.familyProfileAction;
   if(type==='open'){dialog.close();openFamily();return;}
   if(busy)return;busy=true;event.currentTarget.disabled=true;
   const done=await act(type==='family_request_cancel'?{type,requestId:p.viewer.requestId}:{type,familyId:p.id});
   busy=false;
   if(done&&type==='family_join'){dialog.close();openFamily();}else void open(p.id,{keep:true});
  });
 }
 async function open(familyId,{keep=false}={}){
  if(!familyId)return;
  const ticket=++sequence;
  if(!keep){document.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});content.innerHTML='<p class="family-loading">Opening the family…</p>';}
  if(!dialog.open)dialog.showModal();
  try{const data=await request({operation:'family_profile',familyId});if(ticket===sequence&&dialog.open)paint(data.familyProfile);}
  catch(error){if(ticket!==sequence||!dialog.open)return;content.innerHTML=`<p class="family-loading">${esc(error.message||'This family could not be loaded.')}</p><button type="button" class="small-button" data-family-profile-retry>Try again</button>`;content.querySelector('[data-family-profile-retry]').onclick=()=>open(familyId);}
 }
 dialog.addEventListener('close',()=>{sequence++;shown=null;});
 window.harvestFamilyProfile={open,get shown(){return shown;}};
 return {open};
}
