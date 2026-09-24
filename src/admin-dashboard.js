// The admin-only dashboard: three headline numbers, who is online, the newest real accounts, a 7-day retention
// cohort and the Invite a friend log. Farm events run on their own schedule (live-events-schedule.sql), so they have no controls here. A single
// icon button in the topbar (hidden for everyone else, same gate as the gift panel in player-profiles.js) opens
// its own dialog inside the game, instead of a separate page — one session, one sign-in, nothing extra to visit.
import {checkAdmin} from './player-profiles.js';
import {refreshArt} from '../public/visual-icons.js';
import {art} from '../public/visual-icons.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
const fmtDate=iso=>{const time=Date.parse(iso);return Number.isFinite(time)?new Date(time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';};
const fmtDay=day=>{const time=Date.parse(`${day}T00:00:00Z`);return Number.isFinite(time)?new Date(time).toLocaleDateString('en-US',{month:'short',day:'numeric'}):day;};
const initials=name=>String(name??'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase()||'?';
const avatar=(name,online)=>`<span class="admin-avatar">${esc(initials(name))}${online?'<span class="online-dot is-online" aria-hidden="true"></span>':''}</span>`;
// A quick colour read on a retention cell — green holds up, amber is slipping, red has mostly left. Purely
// visual, the numbers underneath (and the "N / total" title) are the real data.
// "5h ago" for the newest-players list; the exact time is in the tooltip.
const ago=iso=>{const ms=Date.now()-Date.parse(iso);if(!Number.isFinite(ms))return '—';const m=Math.floor(ms/60000);return m<1?'just now':m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`;};
const heat=pct=>pct>=50?'admin-heat-good':pct>=25?'admin-heat-ok':'admin-heat-low';

export function createAdminDashboard(bridge){
 const button=document.getElementById('admin-button');
 if(!button)return {};
 const dialog=document.createElement('dialog');dialog.id='admin-dashboard-dialog';dialog.className='game-dialog wide-dialog admin-dashboard-dialog';dialog.setAttribute('aria-labelledby','admin-dashboard-title');
 dialog.innerHTML=`<div class="dialog-heading"><div class="admin-title"><span class="admin-badge">${art('admin')}</span><div><span class="eyebrow">ONLY FOR YOU</span><h2 id="admin-dashboard-title">Admin dashboard</h2></div></div><button class="icon-button admin-dashboard-close" aria-label="Close"><i data-lucide="x"></i></button></div>`
  +'<div class="admin-kpis"><div><strong id="admin-kpi-online">–</strong><span>Online now</span></div><div><strong id="admin-kpi-new">–</strong><span>New today</span></div><div><strong id="admin-kpi-day1">–</strong><span>Kept on day 1</span></div></div>'
  +'<section class="admin-card"><h3><i data-lucide="radio" data-line-icon></i>Online now <span id="admin-online-count">0</span></h3><ul id="admin-online-list" class="admin-online-list"></ul><p class="admin-hint">Active in the last <span id="admin-online-window">30</span> minutes.</p></section>'
  +'<section class="admin-card"><h3><i data-lucide="user-plus" data-line-icon></i>Newest players</h3><ul id="admin-recent-list" class="admin-recent-list"></ul></section>'
  +'<section class="admin-card"><h3><i data-lucide="trending-up" data-line-icon></i>Retention, day 0–7</h3><p class="admin-hint">Share of each day’s signups still active N days later. Approximate: based on last activity.</p><div class="admin-table-scroll"><table class="admin-table admin-retention-table"><thead id="admin-retention-head"></thead><tbody id="admin-retention-body"></tbody></table></div></section>'
  +'<section class="admin-card"><h3><i data-lucide="gift" data-line-icon></i>Invite a friend</h3><div id="admin-invite-totals" class="admin-invite-totals"></div><ul id="admin-invite-list" class="admin-recent-list admin-invite-list"></ul><p class="admin-hint">Each friend who reaches level 10 within 30 days earns 150 diamonds for both. “Paid” means the diamonds are in their farm.</p></section>'
  +'<p id="admin-dashboard-status" class="admin-hint admin-status" role="status"></p>';
 document.body.append(dialog);
 dialog.querySelector('.admin-dashboard-close').onclick=()=>dialog.close();
 let refreshTimer;
 dialog.addEventListener('close',()=>clearInterval(refreshTimer));
 function renderOnline(data){
  dialog.querySelector('#admin-online-count').textContent=number(data.count);
  dialog.querySelector('#admin-online-window').textContent=data.windowMinutes;
  dialog.querySelector('#admin-online-list').innerHTML=data.players.length?data.players.map(p=>`<li>${avatar(p.username,true)}<span><strong>${esc(p.username??'Unnamed')}</strong><small>Level ${number(p.level)}</small></span></li>`).join(''):'<li class="admin-empty">Nobody is online right now.</li>';
 }
 function renderRecent(data){
  dialog.querySelector('#admin-recent-list').innerHTML=data.players.length?data.players.map(p=>`<li>${avatar(p.username,p.online)}<span class="admin-recent-copy"><strong>${esc(p.username??'Unnamed')}</strong><small>${p.everPlayed?`Level ${number(p.level)} · ${number(p.coins)} coins`:'Never opened a farm'}</small></span><time datetime="${esc(p.createdAt)}" title="${esc(fmtDate(p.createdAt))}">${ago(p.createdAt)}</time></li>`).join(''):'<li class="admin-empty">No players yet.</li>';
 }
 // Headline numbers: who is on now, today's signups (today's retention row) and how many of the recent signups came
 // back the next day, weighted by cohort size.
 function renderKpis(online,retention){
  const today=new Date().toISOString().slice(0,10),row=retention.rows.find(r=>r.day===today),day1=retention.rows.map(r=>r.days[1]).filter(Boolean);
  const kept=day1.reduce((sum,d)=>({retained:sum.retained+d.retained,total:sum.total+d.total}),{retained:0,total:0});
  dialog.querySelector('#admin-kpi-online').textContent=number(online.count);
  dialog.querySelector('#admin-kpi-new').textContent=number(row?.size??0);
  dialog.querySelector('#admin-kpi-day1').textContent=kept.total?`${Math.round(kept.retained/kept.total*100)}%`:'—';
 }
 function renderRetention(data){
  dialog.querySelector('#admin-retention-head').innerHTML=`<tr><th>Signed up</th><th>Farmers</th>${Array.from({length:8},(_,i)=>`<th>Day ${i}</th>`).join('')}</tr>`;
  dialog.querySelector('#admin-retention-body').innerHTML=data.rows.length?data.rows.map(row=>`<tr><td>${fmtDay(row.day)}</td><td>${number(row.size)}</td>${row.days.map(d=>d?`<td class="${heat(d.pct)}" title="${d.retained} / ${d.total} still active">${d.pct}%</td>`:'<td class="admin-pending">—</td>').join('')}</tr>`).join(''):'<tr><td colspan="10" class="admin-empty">No signups in the last week.</td></tr>';
 }
 // Invite a friend: the totals, then every friend who started with someone's link and whether each side has its diamonds.
 function renderInvites(data){
  const t=data.totals,reward=data.rules?.reward??150;
  dialog.querySelector('#admin-invite-totals').innerHTML=`<span><strong>${number(t.links)}</strong> links</span><span><strong>${number(t.friends)}</strong> friends joined</span><span><strong>${number(t.qualified)}</strong> reached level ${data.rules?.level??10}</span><span><strong>${number(t.diamondsPaid)}</strong> diamonds paid</span>`;
  const paid=(yes,amount)=>amount>0?(yes?`<b class="admin-paid">+${amount} paid</b>`:`<b class="admin-pending-pay">+${amount} pending</b>`):'<b class="admin-none">none</b>';
  const state=i=>i.status==='qualified'?`Reached level 10 ${ago(new Date(i.qualifiedAt).toISOString())} · friend ${paid(i.friendPaid,reward)} · inviter ${paid(i.inviterPaid,i.inviterReward)}${i.inviterReward===0?' (inviter used all 10 rewards)':''}`
   :i.status==='expired'?`Did not reach level 10 within 30 days (level ${number(i.friendLevel)})`:`Playing · level ${number(i.friendLevel)} of 10`;
  dialog.querySelector('#admin-invite-list').innerHTML=data.invites.length?data.invites.map(i=>`<li>${avatar(i.friend,false)}<span class="admin-recent-copy"><strong>${esc(i.friend)} <small>invited by ${esc(i.inviter)}</small></strong><small>${state(i)}</small></span><small class="admin-when" title="${esc(fmtDate(new Date(i.joinedAt).toISOString()))}">${ago(new Date(i.joinedAt).toISOString())}</small></li>`).join(''):'<li class="admin-empty">No friend has joined with an invite link yet.</li>';
 }
 async function load(){
  const status=dialog.querySelector('#admin-dashboard-status');status.textContent='Refreshing…';
  try{
   const [online,recent,retention,invites]=await Promise.all([bridge.request({operation:'admin_online'}),bridge.request({operation:'admin_recent_players'}),bridge.request({operation:'admin_retention'}),bridge.request({operation:'admin_invites'}).catch(()=>null)]);
   renderOnline(online);renderRecent(recent);renderRetention(retention);renderKpis(online,retention);if(invites)renderInvites(invites);
   status.textContent=`Updated ${new Date().toLocaleTimeString('en-US')}`;
  }catch(error){status.textContent=error.message;}
 }
 button.onclick=()=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());refreshArt();dialog.showModal();load();
  clearInterval(refreshTimer);refreshTimer=setInterval(load,60000);
 };
 // Phones hide the topbar icons, so the same dashboard also gets a card at the end of the More menu.
 checkAdmin().then(admin=>{if(!admin)return;button.hidden=false;const entry=document.getElementById('admin-menu-entry');if(entry)entry.hidden=false;});
 return {};
}
