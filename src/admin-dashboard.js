// The admin-only dashboard: who is online, the newest real accounts and a 7-day retention cohort. A single
// icon button in the topbar (hidden for everyone else, same gate as the gift panel in player-profiles.js) opens
// its own dialog inside the game, instead of a separate page — one session, one sign-in, nothing extra to visit.
import {checkAdmin} from './player-profiles.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
const fmtDate=iso=>{const time=Date.parse(iso);return Number.isFinite(time)?new Date(time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';};
const fmtDay=day=>{const time=Date.parse(`${day}T00:00:00Z`);return Number.isFinite(time)?new Date(time).toLocaleDateString('en-US',{month:'short',day:'numeric'}):day;};

export function createAdminDashboard(bridge){
 const button=document.getElementById('admin-button');
 if(!button)return {};
 const dialog=document.createElement('dialog');dialog.id='admin-dashboard-dialog';dialog.className='game-dialog wide-dialog admin-dashboard-dialog';dialog.setAttribute('aria-labelledby','admin-dashboard-title');
 dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">FLORIS@MILLSTONE.NL ONLY</span><h2 id="admin-dashboard-title">Admin dashboard</h2></div><button class="icon-button admin-dashboard-close" aria-label="Close">×</button></div>'
  +'<section class="admin-card"><h3>Online now <span id="admin-online-count">0</span></h3><p class="admin-hint">Active in the last <span id="admin-online-window">30</span> minutes.</p><ul id="admin-online-list" class="admin-online-list"></ul></section>'
  +'<section class="admin-card"><h3>Last 14 players</h3><div class="admin-table-scroll"><table class="admin-table"><thead><tr><th>Farmer</th><th>Level</th><th>Coins</th><th>Signed up</th></tr></thead><tbody id="admin-recent-body"></tbody></table></div></section>'
  +'<section class="admin-card"><h3>Retention, day 0–7</h3><p class="admin-hint">Per signup day: the share of that day\'s real accounts whose last activity is at or after "signup day + N". An approximation — the game keeps no daily activity log, so this is "still around by day N", not exact day-N-active retention.</p><div class="admin-table-scroll"><table class="admin-table admin-retention-table"><thead id="admin-retention-head"></thead><tbody id="admin-retention-body"></tbody></table></div></section>'
  +'<p id="admin-dashboard-status" class="admin-hint" role="status"></p>';
 document.body.append(dialog);
 dialog.querySelector('.admin-dashboard-close').onclick=()=>dialog.close();
 let refreshTimer;
 dialog.addEventListener('close',()=>clearInterval(refreshTimer));
 function renderOnline(data){
  dialog.querySelector('#admin-online-count').textContent=number(data.count);
  dialog.querySelector('#admin-online-window').textContent=data.windowMinutes;
  dialog.querySelector('#admin-online-list').innerHTML=data.players.length?data.players.map(p=>`<li><strong>${esc(p.username??'Unnamed')}</strong><span>Level ${number(p.level)}</span></li>`).join(''):'<li class="admin-empty">Nobody is online right now.</li>';
 }
 function renderRecent(data){
  dialog.querySelector('#admin-recent-body').innerHTML=data.players.map(p=>`<tr><td>${esc(p.username??'—')}${p.online?' <span class="admin-dot" title="Online now"></span>':''}</td><td>${p.everPlayed?number(p.level):'<span class="admin-empty">Never opened a farm</span>'}</td><td>${p.everPlayed?number(p.coins):'—'}</td><td>${fmtDate(p.createdAt)}</td></tr>`).join('');
 }
 function renderRetention(data){
  dialog.querySelector('#admin-retention-head').innerHTML=`<tr><th>Signed up</th><th>Farmers</th>${Array.from({length:8},(_,i)=>`<th>Day ${i}</th>`).join('')}</tr>`;
  dialog.querySelector('#admin-retention-body').innerHTML=data.rows.length?data.rows.map(row=>`<tr><td>${fmtDay(row.day)}</td><td>${number(row.size)}</td>${row.days.map(d=>d?`<td title="${d.retained} / ${d.total} still active">${d.pct}%</td>`:'<td class="admin-pending">—</td>').join('')}</tr>`).join(''):'<tr><td colspan="10" class="admin-empty">No signups in the last week.</td></tr>';
 }
 async function load(){
  const status=dialog.querySelector('#admin-dashboard-status');status.textContent='Refreshing…';
  try{
   const [online,recent,retention]=await Promise.all([bridge.request({operation:'admin_online'}),bridge.request({operation:'admin_recent_players'}),bridge.request({operation:'admin_retention'})]);
   renderOnline(online);renderRecent(recent);renderRetention(retention);
   status.textContent=`Updated ${new Date().toLocaleTimeString('en-US')}`;
  }catch(error){status.textContent=error.message;}
 }
 button.onclick=()=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();load();
  clearInterval(refreshTimer);refreshTimer=setInterval(load,60000);
 };
 checkAdmin().then(admin=>{if(admin)button.hidden=false;});
 return {};
}
