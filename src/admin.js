// A small, separate page for the one admin account: who is online, the newest real accounts and a 7-day
// retention cohort. Reuses the same Supabase session play.html already keeps in this browser (same origin,
// same storage key) — if that is already floris@millstone.nl, this opens straight to the dashboard.
import {supabase,isConfigured,farmRequest,verifiedUser,cloudError} from './supabase.js';

const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
const fmtDate=iso=>{const time=Date.parse(iso);return Number.isFinite(time)?new Date(time).toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'—';};
const fmtDay=day=>{const time=Date.parse(`${day}T00:00:00Z`);return Number.isFinite(time)?new Date(time).toLocaleDateString('en-US',{month:'short',day:'numeric'}):day;};
let refreshTimer;

function show(view){
 for(const id of ['admin-loading','admin-signin','admin-denied','admin-board'])$(id).hidden=id!==view;
}
function renderOnline(data){
 $('admin-online-count').textContent=number(data.count);
 $('admin-online-window').textContent=data.windowMinutes;
 $('admin-online-list').innerHTML=data.players.length?data.players.map(p=>`<li><strong>${esc(p.username??'Unnamed')}</strong><span>Level ${number(p.level)}</span></li>`).join(''):'<li class="admin-empty">Nobody is online right now.</li>';
}
function renderRecent(data){
 $('admin-recent-body').innerHTML=data.players.map(p=>`<tr><td>${esc(p.username??'—')}${p.online?' <span class="admin-dot" title="Online now"></span>':''}</td><td>${p.everPlayed?number(p.level):'<span class="admin-empty">Never opened a farm</span>'}</td><td>${p.everPlayed?number(p.coins):'—'}</td><td>${fmtDate(p.createdAt)}</td></tr>`).join('');
}
function renderRetention(data){
 $('admin-retention-head').innerHTML=`<tr><th>Signed up</th><th>Farmers</th>${Array.from({length:8},(_,i)=>`<th>Day ${i}</th>`).join('')}</tr>`;
 $('admin-retention-body').innerHTML=data.rows.length?data.rows.map(row=>`<tr><td>${fmtDay(row.day)}</td><td>${number(row.size)}</td>${row.days.map(d=>d?`<td title="${d.retained} / ${d.total} still active">${d.pct}%</td>`:'<td class="admin-pending">—</td>').join('')}</tr>`).join(''):'<tr><td colspan="10" class="admin-empty">No signups in the last week.</td></tr>';
}

async function loadDashboard(){
 $('admin-status').textContent='Refreshing…';
 try{
  const [online,recent,retention]=await Promise.all([farmRequest({operation:'admin_online'}),farmRequest({operation:'admin_recent_players'}),farmRequest({operation:'admin_retention'})]);
  renderOnline(online);renderRecent(recent);renderRetention(retention);
  $('admin-status').textContent=`Updated ${new Date().toLocaleTimeString('en-US')}`;
 }catch(error){$('admin-status').textContent=cloudError(error);}
}
async function boot(){
 if(!isConfigured){show('admin-denied');$('admin-denied-message').textContent='Account access is not configured.';return;}
 show('admin-loading');
 let user;try{user=await verifiedUser();}catch{user=null;}
 if(!user){show('admin-signin');return;}
 // The real gate: farm-api checks the account itself, not anything this page assumes.
 try{await farmRequest({operation:'admin_online'});}
 catch(error){show('admin-denied');$('admin-denied-message').textContent=error.status===403?'Signed in, but this account cannot open the admin dashboard.':cloudError(error);return;}
 show('admin-board');await loadDashboard();
 clearInterval(refreshTimer);refreshTimer=setInterval(loadDashboard,60000);
}
$('admin-signin-form').addEventListener('submit',async event=>{
 event.preventDefault();
 $('admin-signin-message').textContent='Signing in…';
 try{const {error}=await supabase.auth.signInWithPassword({email:$('admin-email').value.trim(),password:$('admin-password').value});if(error)throw error;await boot();}
 catch(error){$('admin-signin-message').textContent=cloudError(error);}
});
$('admin-refresh').addEventListener('click',loadDashboard);
boot();
