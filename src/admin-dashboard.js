// The staff dashboard (the admin and the moderators): three headline numbers, the chat reports, who is online, the newest real
// accounts, a 7-day retention cohort and the Invite a friend log; for the admin also news for everyone, the moderators and the
// levels from which farmers may chat (supabase/chat.sql). Giving coins, XP, diamonds or goods stays admin-only (the profile). Farm events run on their own schedule (live-events-schedule.sql), so they have no controls here. A single
// icon button in the topbar (hidden for everyone else, same gate as the gift panel in player-profiles.js) opens
// its own dialog inside the game, instead of a separate page — one session, one sign-in, nothing extra to visit.
import {checkAdmin} from './player-profiles.js';
import {refreshArt} from '../public/visual-icons.js';
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';

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

export function createAdminDashboard(bridge,{chat=null}={}){
 const button=document.getElementById('admin-button');
 if(!button)return {};
 const dialog=document.createElement('dialog');dialog.id='admin-dashboard-dialog';dialog.className='game-dialog wide-dialog admin-dashboard-dialog';dialog.setAttribute('aria-labelledby','admin-dashboard-title');
 dialog.innerHTML=`<div class="dialog-heading"><div class="admin-title"><span class="admin-badge">${art('admin')}</span><div><span class="eyebrow" id="admin-dashboard-eyebrow">ONLY FOR YOU</span><h2 id="admin-dashboard-title">Admin dashboard</h2></div></div><button class="icon-button admin-dashboard-close" aria-label="Close"><i data-lucide="x"></i></button></div>`
  +'<div class="admin-kpis"><div><strong id="admin-kpi-online">–</strong><span>Online now</span></div><div><strong id="admin-kpi-new">–</strong><span>New today</span></div><div><strong id="admin-kpi-day1">–</strong><span>Kept on day 1</span></div><div><strong id="admin-kpi-reports">–</strong><span>Open reports</span></div></div>'
  +'<div class="market-tabs admin-tabs" role="tablist" aria-label="Dashboard"><button type="button" role="tab" data-admin-tab="chat" class="active" aria-selected="true">Chat</button><button type="button" role="tab" data-admin-tab="players" aria-selected="false">Players</button><button type="button" role="tab" data-admin-tab="growth" aria-selected="false">Growth</button><button type="button" role="tab" data-admin-tab="settings" aria-selected="false" hidden>Settings</button></div>'
  +'<div data-admin-panel="chat">'
  +'<section class="admin-card admin-guide"><h3><i data-lucide="heart-handshake" data-line-icon></i>Keeping the valley friendly</h3><ul><li><strong>Delete</strong> a message that is rude, hurtful or shares personal details (an address, a phone number).</li><li><strong>Mute for a day</strong> when someone keeps it up after a message is deleted.</li><li><strong>Ban from chat</strong> only for serious or repeated abuse. It closes the chat, never the farm.</li><li>Not sure? Choose <strong>Nothing wrong</strong> or leave it for the admin.</li></ul></section>'
  +'<section class="admin-card" id="admin-reports" hidden><h3><i data-lucide="flag" data-line-icon></i>Chat reports <span id="admin-report-count">0</span></h3><ul id="admin-report-list" class="admin-recent-list admin-report-list"></ul><p class="admin-hint">Delete removes the message for everyone. Mute and ban only close the chat for that farmer, never their farm.</p></section>'
  +'</div><div data-admin-panel="players" hidden>'
  +'<section class="admin-card" id="admin-donate" hidden><h3><i data-lucide="gift" data-line-icon></i>A gift for everyone</h3><form id="admin-donate-form" class="admin-donate"><label><span>'+art('diamonds')+'Diamonds</span><input type="number" id="admin-donate-diamonds" min="0" max="50" step="1" value="0" inputmode="numeric"></label><label><span>'+art('coins')+'Coins</span><input type="number" id="admin-donate-coins" min="0" max="500" step="10" value="0" inputmode="numeric"></label><label class="admin-donate-message"><span>Message</span><input type="text" id="admin-donate-message" maxlength="120" placeholder="Thanks for playing!"></label><button type="submit" class="primary-button">Send to everyone</button></form><p class="admin-hint" id="admin-donate-room"></p></section>'
  +'<section class="admin-card"><h3><i data-lucide="radio" data-line-icon></i>Online now <span id="admin-online-count">0</span></h3><ul id="admin-online-list" class="admin-online-list"></ul><p class="admin-hint">Active in the last <span id="admin-online-window">30</span> minutes.</p></section>'
  +'<section class="admin-card"><h3><i data-lucide="user-plus" data-line-icon></i>Newest players</h3><ul id="admin-recent-list" class="admin-recent-list"></ul></section>'
  +'</div><div data-admin-panel="growth" hidden>'
  +'<section class="admin-card"><h3><i data-lucide="trending-up" data-line-icon></i>Retention, day 0–7</h3><p class="admin-hint">Share of each day’s signups still active N days later. Approximate: based on last activity.</p><div class="admin-table-scroll"><table class="admin-table admin-retention-table"><thead id="admin-retention-head"></thead><tbody id="admin-retention-body"></tbody></table></div></section>'
  +'<section class="admin-card"><h3><i data-lucide="gift" data-line-icon></i>Invite a friend</h3><div id="admin-invite-totals" class="admin-invite-totals"></div><ul id="admin-invite-list" class="admin-recent-list admin-invite-list"></ul><p class="admin-hint">Each friend who reaches level 10 within 30 days earns 150 diamonds for both. “Paid” means the diamonds are in their farm.</p></section>'
  +'</div><div data-admin-panel="settings" hidden>'
  +'<section class="admin-card" id="admin-chat-settings" hidden><h3><i data-lucide="megaphone" data-line-icon></i>News for everyone</h3><form id="admin-news-form" class="admin-news"><textarea id="admin-news-text" maxlength="400" rows="3" placeholder="A new feature, an event… Everyone sees it under Notifications in the chat."></textarea><label class="admin-news-hours">Show it for<select id="admin-news-hours"><option value="6">6 hours</option><option value="12">12 hours</option><option value="24" selected>24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="0">Always</option></select></label><button type="submit" class="primary-button">Post news</button></form>'
  +'<h3><i data-lucide="shield" data-line-icon></i>Moderators</h3><ul id="admin-mod-list" class="admin-recent-list"></ul><p class="admin-hint">Make a farmer a moderator (or not) on their profile.</p>'
  +'<h3><i data-lucide="message-circle" data-line-icon></i>Who may chat</h3><form id="admin-levels-form" class="admin-levels"><label>Global chat from level<input type="number" id="admin-level-global" min="1" max="200" step="1" inputmode="numeric"></label><label>Private messages from level<input type="number" id="admin-level-dm" min="1" max="200" step="1" inputmode="numeric"></label><button type="submit" class="small-button">Save</button></form><p id="admin-chat-status" class="admin-hint" role="status"></p></section></div>'
  +'<p id="admin-dashboard-status" class="admin-hint admin-status" role="status"></p>';
 document.body.append(dialog);
 dialog.querySelector('.admin-dashboard-close').onclick=()=>dialog.close();
 // Four tabs: the chat first (what a moderator comes for), then players, growth and, for the admin, the chat settings.
 function showTab(name){
  dialog.querySelectorAll('[data-admin-tab]').forEach(tab=>{const on=tab.dataset.adminTab===name;tab.classList.toggle('active',on);tab.setAttribute('aria-selected',String(on));});
  dialog.querySelectorAll('[data-admin-panel]').forEach(panel=>panel.hidden=panel.dataset.adminPanel!==name);
 }
 dialog.querySelectorAll('[data-admin-tab]').forEach(tab=>tab.onclick=()=>showTab(tab.dataset.adminTab));
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
  void loadChat();
  try{
   const [online,recent,retention,invites]=await Promise.all([bridge.request({operation:'admin_online'}),bridge.request({operation:'admin_recent_players'}),bridge.request({operation:'admin_retention'}),bridge.request({operation:'admin_invites'}).catch(()=>null)]);
   renderOnline(online);renderRecent(recent);renderRetention(retention);renderKpis(online,retention);if(invites)renderInvites(invites);
   status.textContent=`Updated ${new Date().toLocaleTimeString('en-US')}`;
  }catch(error){status.textContent=error.message;}
 }
 // The chat: open reports for the staff; news, moderators and chat levels for the admin.
 const where=channel=>channel==='global'?'Global chat':String(channel).startsWith('family:')?'Family chat':'Private message';
 async function loadChat(){
  const client=bridge.chat;if(!client||!role)return;
  const chatStatus=dialog.querySelector('#admin-chat-status');
  try{
   const reports=await client.reports();
   dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-count').textContent=number(reports.length);dialog.querySelector('#admin-kpi-reports').textContent=number(reports.length);
   dialog.querySelector('#admin-report-list').innerHTML=reports.length?reports.map(r=>`<li>${avatar(r.senderName,false)}<span class="admin-recent-copy"><strong>${esc(r.senderName??'A farmer')} <small>${where(r.channel)} · ${number(r.reports)} report${r.reports===1?'':'s'}${r.present?'':' · already gone'}</small></strong><small class="admin-report-body">“${esc(r.body)}”</small><span class="admin-report-actions">${r.present?`<button type="button" class="small-button" data-report="delete" data-id="${esc(r.messageId)}">Delete</button>`:''}<button type="button" class="small-button" data-report="mute" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Mute 1 day</button><button type="button" class="small-button" data-report="ban" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Ban from chat</button><button type="button" class="small-button" data-report="dismiss" data-id="${esc(r.messageId)}">Nothing wrong</button></span></span></li>`).join(''):'<li class="admin-empty">No open reports. The valley is friendly today.</li>';
  }catch(error){dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-list').innerHTML=`<li class="admin-empty">${esc(error.message)}</li>`;}
  try{showRoom(await client.donationRoom());}catch{}
  if(role!=='admin')return;
  dialog.querySelector('#admin-chat-settings').hidden=false;
  try{
   const [staff,overview]=await Promise.all([client.staffList(),chat?.whenReady?.()]);
   dialog.querySelector('#admin-mod-list').innerHTML=staff.length?staff.map(s=>`<li>${avatar(s.name,false)}<span class="admin-recent-copy"><strong>${esc(s.name)}</strong><small>Moderator since ${esc(fmtDate(s.since))}</small></span></li>`).join(''):'<li class="admin-empty">No moderators yet.</li>';
   const levels=overview?.levels;
   if(levels&&document.activeElement?.closest?.('#admin-levels-form')==null){dialog.querySelector('#admin-level-global').value=levels.global;dialog.querySelector('#admin-level-dm').value=levels.dm;}
  }catch(error){chatStatus.textContent=error.message;}
 }
 dialog.querySelector('#admin-report-list').addEventListener('click',async event=>{
  const action=event.target.closest('[data-report]');if(!action||!bridge.chat)return;
  const {report:kind,id,player}=action.dataset;action.disabled=true;
  try{
   if(kind==='delete')await bridge.chat.deleteMessage(id);
   else if(kind==='dismiss')await bridge.chat.dismissReports(id);
   else await bridge.chat.sanction(player,kind==='mute'?1440:0,kind==='ban');
   await loadChat();
  }catch(error){action.disabled=false;dialog.querySelector('#admin-dashboard-status').textContent=error.message;}
 });
 // A gift for everyone: all staff together give at most 50 diamonds and 500 coins a day (the database keeps count).
 function showRoom(room){
  dialog.querySelector('#admin-donate').hidden=false;
  dialog.querySelector('#admin-donate-room').textContent=`Left today, for all staff together: ${number(room.diamonds)} diamonds, ${number(room.coins)} coins, ${number(room.gifts)} gift${room.gifts===1?'':'s'}. Every farmer gets it the next time the farm opens (open games at once), and sees it under Notifications.`;
 }
 dialog.querySelector('#admin-donate-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!bridge.chat)return;
  const diamonds=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-diamonds').value)||0)),coins=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-coins').value)||0));
  const message=dialog.querySelector('#admin-donate-message').value.trim(),room=dialog.querySelector('#admin-donate-room');
  if(!diamonds&&!coins){room.textContent='Enter some diamonds or coins.';return;}
  const parts=[diamonds&&`${number(diamonds)} diamonds`,coins&&`${number(coins)} coins`].filter(Boolean).join(' + ');
  if(!await confirmAction({title:'Send a gift to everyone?',description:`Every farmer receives ${parts}.${message?` “${message}”`:''}`,confirmLabel:'Send',picture:'gift'}))return;
  try{showRoom(await bridge.chat.donate(coins,diamonds,message||null));dialog.querySelector('#admin-donate-diamonds').value='0';dialog.querySelector('#admin-donate-coins').value='0';dialog.querySelector('#admin-donate-message').value='';}
  catch(error){room.textContent=error.message;}
 });
 dialog.querySelector('#admin-news-form').addEventListener('submit',async event=>{
  event.preventDefault();const text=dialog.querySelector('#admin-news-text'),chatStatus=dialog.querySelector('#admin-chat-status'),body=text.value.trim();if(!body)return;
  const hours=Number(dialog.querySelector('#admin-news-hours').value)||0;
  try{await bridge.chat.postNews(body,hours);text.value='';chatStatus.textContent=hours?`Posted. Everyone sees it under Notifications for ${hours>=48&&hours%24===0?`${hours/24} days`:`${hours} hours`}.`:'Posted. Everyone sees it under Notifications.';}catch(error){chatStatus.textContent=error.message;}
 });
 dialog.querySelector('#admin-levels-form').addEventListener('submit',async event=>{
  event.preventDefault();const chatStatus=dialog.querySelector('#admin-chat-status');
  const global=Math.round(Number(dialog.querySelector('#admin-level-global').value)),dm=Math.round(Number(dialog.querySelector('#admin-level-dm').value));
  try{await bridge.chat.setLevels(global,dm);chatStatus.textContent=`Saved: global chat from level ${global}, private messages from level ${dm}.`;}catch(error){chatStatus.textContent=error.message;}
 });
 button.onclick=()=>{
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());refreshArt();dialog.showModal();load();
  clearInterval(refreshTimer);refreshTimer=setInterval(load,60000);
 };
 // For the admin (checked by e-mail, as before) and the moderators (their role comes with the chat). Phones hide the topbar
 // icons, so the same dashboard also gets a card at the end of the More menu. The server checks every request again.
 let role=null;
 Promise.all([checkAdmin(),chat?.whenReady?.().then(overview=>overview?.role??null).catch(()=>null)]).then(([admin,chatRole])=>{
  role=admin||chatRole==='admin'?'admin':chatRole==='moderator'?'moderator':null;if(!role)return;
  dialog.querySelector('#admin-dashboard-eyebrow').textContent=role==='admin'?'ONLY FOR YOU':'FOR THE MODERATORS';
  dialog.querySelector('#admin-dashboard-title').textContent=role==='admin'?'Admin dashboard':'Moderator dashboard';
  dialog.querySelector('[data-admin-tab="settings"]').hidden=role!=='admin';
  button.hidden=false;const entry=document.getElementById('admin-menu-entry');if(entry)entry.hidden=false;
 });
 return {};
}
