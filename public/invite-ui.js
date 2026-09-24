// Invite a friend: your personal link, Share and Copy, and the friends who started with it (rules: farm-state.js; data:
// farm-api invite-service.js). Opened from the side tools on desktop, the More menu on phones and the Family tab.
import {art,refreshArt} from './visual-icons.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATUS={
 playing:f=>`Level ${f.level} · playing`,
 rewarded:()=>'Reached level 10 · reward sent',
 limit:()=>'Reached level 10 · your 10 rewards are used',
 expired:()=>'Did not reach level 10 within 30 days'
};
export function createInviteUI({notify}){
 const bridge=()=>window.parent.harvestBridge,host=window.parent??window;
 const dialog=document.createElement('dialog');dialog.id='invite-dialog';dialog.className='game-dialog invite-dialog';dialog.setAttribute('aria-labelledby','invite-title');
 dialog.innerHTML=`<div class="dialog-heading"><div><span class="eyebrow">GROW THE VALLEY</span><h2 id="invite-title">Invite a friend</h2></div><button class="icon-button close-dialog" aria-label="Close"><i data-lucide="x"></i></button></div><div id="invite-content" aria-live="polite"></div>`;
 document.body.append(dialog);dialog.querySelector('.close-dialog').onclick=()=>dialog.close();
 const content=dialog.querySelector('#invite-content');
 let data=null,error='';
 function render(){
  if(!data){content.innerHTML=`<p class="invite-loading">${esc(error||'Finding your invite link…')}</p>${error?'<button type="button" class="small-button" data-invite-retry>Try again</button>':''}`;content.querySelector('[data-invite-retry]')?.addEventListener('click',load);return;}
  const {rules,friends,invitedBy}=data;
  const you=invitedBy?`<section class="invite-you">${art('diamonds')}<div><strong>${invitedBy.rewarded?`You earned ${rules.reward} diamonds from ${esc(invitedBy.name)}’s invite`:invitedBy.expired?`${esc(invitedBy.name)} invited you`:`${esc(invitedBy.name)} invited you`}</strong><span>${invitedBy.rewarded?'Thanks for playing together!':invitedBy.expired?`The ${rules.days} days to reach level ${rules.level} have passed.`:`Reach level ${rules.level} within ${rules.days} days and you both get ${rules.reward} diamonds. You are level ${invitedBy.level}.`}</span></div></section>`:'';
  content.innerHTML=`<section class="invite-hero">${art('invite-friends')}<div><strong>Farm together, earn together</strong><span>When a friend you invite reaches level ${rules.level}, you both get <b>${art('diamonds')}${rules.reward} diamonds.</b></span></div></section>
  <section class="invite-link" aria-label="Your invite link"><input type="text" readonly value="${esc(data.link)}" aria-label="Your invite link" data-invite-link><div class="invite-actions"><button type="button" class="primary-button" data-invite-share>${art('invite-friends')}Share</button><button type="button" class="small-button" data-invite-copy>Copy link</button></div></section>
  <div class="invite-count"><span>Friends rewarded</span><strong>${data.earned} of ${rules.limit}</strong><progress max="${rules.limit}" value="${Math.min(rules.limit,data.earned)}" aria-label="Friends rewarded"></progress></div>
  ${you}
  <section class="invite-friends"><h3>Your friends</h3>${friends.length?friends.map(f=>`<div class="invite-friend is-${f.status}"><div><strong>${esc(f.name)}</strong><small>${STATUS[f.status](f)}</small></div>${f.status==='rewarded'?`<b>${art('diamonds')}+${rules.reward}</b>`:f.status==='playing'?`<span class="invite-level" aria-hidden="true"><span style="width:${Math.min(100,Math.round(f.level/rules.level*100))}%"></span></span>`:''}</div>`).join(''):'<p class="invite-empty">No friends yet. Share your link and farm together.</p>'}</section>
  <p class="invite-rules">Your friend has to be new to Harvest Tycoon and start with your link. Up to ${rules.limit} friends earn you diamonds; they always get theirs.</p>`;
  const input=content.querySelector('[data-invite-link]');
  content.querySelector('[data-invite-copy]').onclick=()=>copy(input);
  content.querySelector('[data-invite-share]').onclick=()=>share(input);
  refreshArt();
 }
 // The copy goes through the page around the game (same site), which is where the browser allows the clipboard and sharing.
 async function copy(input){
  try{await host.navigator.clipboard.writeText(data.link);}
  catch{input.select();try{document.execCommand('copy');}catch{}}
  bridge()?.trackInvite?.('invite_copy');notify?.('Invite link copied. Send it to a friend!');
 }
 async function share(input){
  const text=`Come farm with me in Harvest Tycoon! Reach level ${data.rules.level} and we both get ${data.rules.reward} diamonds.`;
  if(typeof host.navigator.share==='function'){
   try{await host.navigator.share({title:'Harvest Tycoon',text,url:data.link});bridge()?.trackInvite?.('invite_share');}
   catch(e){if(e?.name!=='AbortError')await copy(input);}
  }else await copy(input);
 }
 async function load(){
  error='';render();
  try{data=await bridge().request({operation:'invite'});}catch(e){error=e.message||'Your invite link could not be loaded.';}
  if(dialog.open)render();
 }
 function open(){
  document.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});
  if(!dialog.open)dialog.showModal();render();void load();bridge()?.trackInvite?.('invite_open');
 }
 document.getElementById('invite-button')?.addEventListener('click',open);
 window.harvestInvite={open};
 return {open};
}
