// The staff dashboard (the admin and the moderators): three headline numbers, the chat reports, who is online, every farmer with
// when they were last active and one farmer's details (src/admin-players.js), where new players stop, a 7-day retention cohort
// and the Invite a friend log; for the admin also news for everyone, the moderators and the
// levels from which farmers may chat (supabase/chat.sql). Giving coins, XP, diamonds or goods stays admin-only (the profile). Farm events run on their own schedule (live-events-schedule.sql), so they have no controls here. A single
// icon button in the topbar (hidden for everyone else, same gate as the gift panel in player-profiles.js) opens
// its own dialog inside the game, instead of a separate page — one session, one sign-in, nothing extra to visit.
import {checkAdmin} from './player-profiles.js';
import {refreshArt} from '../public/visual-icons.js';
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {avatarImage} from '../public/player-avatars.js';
import {GIFT_AUDIENCES,giftCount,giftMatches,giftLabel,PLAYER_FILTERS,PLAYER_SORTS,FUNNEL_PERIODS,GUIDE_STEPS,filterPlayers,playerRow,playerDetail,funnel,funnelHtml,countryCounts,countriesHtml,dateTime,clock,zoneDay} from './admin-players.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
// Every time is Amsterdam time on a 24-hour clock (admin-players.js); a retention day is already an Amsterdam date ("2026-09-25").
const fmtDate=dateTime;
const fmtDay=day=>{const time=Date.parse(`${day}T00:00:00Z`);return Number.isFinite(time)?new Date(time).toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric'}):day;};
const initials=name=>String(name??'?').trim().split(/\s+/).slice(0,2).map(part=>part[0]??'').join('').toUpperCase()||'?';
// A farmer's own picture when we know it (the same as on the leaderboard), otherwise their initials.
let faces=new Map();
const avatar=(name,online,id)=>{const face=id&&faces.get(id);return `<span class="admin-avatar${face?' has-face':''}">${face?avatarImage(face):esc(initials(name))}${online?'<span class="online-dot is-online" aria-hidden="true"></span>':''}</span>`;};
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
  +'<div class="admin-kpis"><div>'+art('family-members')+'<strong id="admin-kpi-online">–</strong><span>Online now</span></div><div>'+art('invite-friends')+'<strong id="admin-kpi-new">–</strong><span>New today</span></div><div>'+art('rank-gold')+'<strong id="admin-kpi-day1">–</strong><span>Kept on day 1</span></div><div>'+art('alert')+'<strong id="admin-kpi-reports">–</strong><span>Open reports</span></div></div>'
  +'<div class="market-tabs admin-tabs" role="tablist" aria-label="Dashboard"><button type="button" role="tab" data-admin-tab="chat" class="active" aria-selected="true">'+art('chat')+'Chat</button><button type="button" role="tab" data-admin-tab="players" aria-selected="false">'+art('family-members')+'Players</button><button type="button" role="tab" data-admin-tab="growth" aria-selected="false">'+art('xp')+'Growth</button><button type="button" role="tab" data-admin-tab="settings" aria-selected="false" hidden>'+art('settings')+'Settings</button></div>'
  +'<div data-admin-panel="chat">'
  +'<section class="admin-card admin-guide"><h3>'+art('admin')+'Keeping the valley friendly</h3><ul><li><strong>Delete</strong> a message that is rude, hurtful or shares personal details (an address, a phone number).</li><li><strong>Mute for a day</strong> when someone keeps it up after a message is deleted.</li><li><strong>Ban from chat</strong> only for serious or repeated abuse. It closes the chat, never the farm.</li><li>Not sure? Choose <strong>Nothing wrong</strong> or leave it for the admin.</li></ul></section>'
  +'<section class="admin-card" id="admin-reports" hidden><h3>'+art('alert')+'Chat reports <span id="admin-report-count">0</span></h3><ul id="admin-report-list" class="admin-recent-list admin-report-list"></ul><p class="admin-hint">Delete removes the message for everyone. Mute and ban only close the chat for that farmer, never their farm.</p></section>'
  +'<section class="admin-card" id="admin-report-log" hidden><h3>'+art('quests')+'Report log</h3><p class="admin-hint">Every reported message, newest first, and what the staff did with it.</p><ul id="admin-log-list" class="admin-recent-list admin-log-list"></ul></section>'
  +'</div><div data-admin-panel="players" hidden>'
  +'<section class="admin-card" id="admin-donate" hidden><h3>'+art('gift')+'Send a gift</h3><form id="admin-donate-form" class="admin-donate"><div class="admin-gift-to"><span>Send to</span><div class="admin-filters" role="group" aria-label="Send to">'+GIFT_AUDIENCES.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-gift-audience="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><div id="admin-gift-player" class="admin-gift-player" hidden><input type="search" id="admin-gift-search" placeholder="Find a farmer by name" aria-label="Find a farmer" autocomplete="off"><ul id="admin-gift-results" class="admin-gift-results"></ul></div></div><label><span>'+art('diamonds')+'Diamonds</span><input type="number" id="admin-donate-diamonds" min="0" max="50" step="1" value="0" inputmode="numeric"></label><label><span>'+art('coins')+'Coins</span><input type="number" id="admin-donate-coins" min="0" max="500" step="10" value="0" inputmode="numeric"></label><label class="admin-donate-message"><span>Message</span><input type="text" id="admin-donate-message" maxlength="120" placeholder="Thanks for playing!"></label><button type="submit" class="primary-button" id="admin-donate-send">Send to everyone</button></form><p class="admin-hint" id="admin-donate-room"></p></section>'
  +'<section class="admin-card"><h3>'+art('family-members')+'Online now <span id="admin-online-count">0</span></h3><ul id="admin-online-list" class="admin-online-list"></ul><p class="admin-hint">Active in the last <span id="admin-online-window">30</span> minutes.</p></section>'
  +'<section class="admin-card" id="admin-players"><h3>'+art('family-members')+'All players <span id="admin-players-count">0</span></h3><div class="admin-player-tools"><input type="search" id="admin-player-search" placeholder="Search by name" aria-label="Search players" autocomplete="off"><select id="admin-player-sort" aria-label="Order">'+PLAYER_SORTS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')+'</select></div><div class="admin-filters" role="group" aria-label="Show">'+PLAYER_FILTERS.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-player-filter="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><ul id="admin-player-list" class="admin-recent-list admin-player-list"></ul><button type="button" id="admin-player-more" class="small-button admin-more" hidden>Show more</button><p class="admin-hint">Times are Amsterdam time. Last action: the last time the farm saved. Gone quiet: played before, not active for 7 days or more. New: joined in the last 7 days.</p></section>'
  +'<section class="admin-card admin-player-detail" id="admin-player-detail" hidden></section>'
  +'</div><div data-admin-panel="growth" hidden>'
  +'<section class="admin-card" id="admin-funnel"><h3>'+art('quests')+'New players: where do they stop?</h3><div class="admin-filters" role="group" aria-label="Period">'+FUNNEL_PERIODS.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-funnel-period="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><ul id="admin-funnel-list" class="admin-bars admin-funnel"></ul><p class="admin-hint">Of everyone who made an account in the period, how many got this far. Coming back counts only farmers who joined long enough ago, from their last activity.</p></section>'
  +'<section class="admin-card" id="admin-countries" hidden><h3>'+art('invite-friends')+'Where players come from</h3><ul id="admin-country-list" class="admin-bars"></ul><p class="admin-hint">The country of each farmer’s device time zone, the last time they opened the game.</p></section>'
  +'<section class="admin-card"><h3>'+art('xp')+'Retention, day 0–7</h3><p class="admin-hint">Share of each day’s signups (Amsterdam time) still active N days later. Approximate: based on last activity.</p><div class="admin-table-scroll"><table class="admin-table admin-retention-table"><thead id="admin-retention-head"></thead><tbody id="admin-retention-body"></tbody></table></div></section>'
  +'<section class="admin-card"><h3>'+art('gift')+'Invite a friend</h3><div id="admin-invite-totals" class="admin-invite-totals"></div><ul id="admin-invite-list" class="admin-recent-list admin-invite-list"></ul><p class="admin-hint">Each friend who reaches level 10 within 30 days earns 150 diamonds for both. “Paid” means the diamonds are in their farm.</p></section>'
  +'</div><div data-admin-panel="settings" hidden>'
  +'<section class="admin-card" id="admin-chat-settings" hidden><h3>'+art('bell')+'News for everyone</h3><form id="admin-news-form" class="admin-news"><textarea id="admin-news-text" maxlength="400" rows="3" placeholder="A new feature, an event… Everyone sees it under Notifications in the chat."></textarea><label class="admin-news-hours">Show it for<select id="admin-news-hours"><option value="6">6 hours</option><option value="12">12 hours</option><option value="24" selected>24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="0">Always</option></select></label><button type="submit" class="primary-button">Post news</button></form>'
  +'<h3>'+art('admin')+'Moderators</h3><ul id="admin-mod-list" class="admin-recent-list"></ul><p class="admin-hint">Make a farmer a moderator (or not) on their profile.</p>'
  +'<h3>'+art('chat')+'Who may chat</h3><form id="admin-levels-form" class="admin-levels"><label>Global chat from level<input type="number" id="admin-level-global" min="1" max="200" step="1" inputmode="numeric"></label><label>Private messages from level<input type="number" id="admin-level-dm" min="1" max="200" step="1" inputmode="numeric"></label><button type="submit" class="small-button">Save</button></form><p id="admin-chat-status" class="admin-hint" role="status"></p></section></div>'
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
  dialog.querySelector('#admin-online-list').innerHTML=data.players.length?data.players.map(p=>`<li>${avatar(p.username,true,p.playerId)}<span><strong>${esc(p.username??'Unnamed')}</strong><small>Level ${number(p.level)}</small></span></li>`).join(''):'<li class="admin-empty">Nobody is online right now.</li>';
 }
 // All players: the filter, search and order stay as they are when the list refreshes; one farmer's details replace the list
 // until "All players". The funnel and the countries read the same list.
 const view={filter:'all',search:'',sort:'active',shown:60,period:'7',players:[],owner:false,guideSteps:GUIDE_STEPS.length,detail:null};
 function renderPlayers(){
  const found=filterPlayers(view.players,view),list=dialog.querySelector('#admin-player-list');
  dialog.querySelector('#admin-players-count').textContent=found.length===view.players.length?number(found.length):`${number(found.length)} of ${number(view.players.length)}`;
  list.innerHTML=found.length?found.slice(0,view.shown).map(p=>playerRow(p,{guideSteps:view.guideSteps})).join(''):'<li class="admin-empty">No farmers match.</li>';
  const more=dialog.querySelector('#admin-player-more');more.hidden=found.length<=view.shown;more.textContent=`Show more (${number(found.length-view.shown)} left)`;
 }
 function renderFunnel(){dialog.querySelector('#admin-funnel-list').innerHTML=funnelHtml(funnel(view.players,view.period));}
 function renderCountries(){const box=dialog.querySelector('#admin-countries');box.hidden=!view.owner;if(view.owner)dialog.querySelector('#admin-country-list').innerHTML=countriesHtml(countryCounts(view.players));}
 function showPlayers(data){
  view.players=data.players??[];view.owner=Boolean(data.owner);view.guideSteps=data.guideSteps??GUIDE_STEPS.length;
  faces=new Map([...faces,...view.players.filter(p=>p.avatarId).map(p=>[p.playerId,p.avatarId])]);
  dialog.querySelector('#admin-player-search').placeholder=view.owner?'Search by name, country or IP':'Search by name';
  renderPlayers();renderFunnel();renderCountries();paintGift();
 }
 function pressed(buttons,on){buttons.forEach(b=>{const yes=b===on;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});}
 // One farmer: the list and the other cards step aside; "All players" brings them back where they were.
 async function openPlayer(id){
  const box=dialog.querySelector('#admin-player-detail'),panel=dialog.querySelector('[data-admin-panel="players"]');
  view.detail=id;panel.querySelectorAll(':scope>section:not(#admin-player-detail)').forEach(s=>s.classList.add('is-behind'));
  box.hidden=false;box.innerHTML='<p class="admin-hint">Loading the farmer…</p>';box.scrollIntoView?.({block:'start'});
  try{
   const {player}=await bridge.request({operation:'admin_player',playerId:id});if(view.detail!==id)return;
   box.innerHTML=playerDetail(player,{guideSteps:GUIDE_STEPS});refreshArt();
  }catch(error){box.innerHTML=`<div class="admin-detail-top"><button type="button" class="small-button" data-player-back>‹ All players</button></div><p class="admin-hint">${esc(error.message)}</p>`;}
 }
 function closePlayer(){
  view.detail=null;const panel=dialog.querySelector('[data-admin-panel="players"]');
  dialog.querySelector('#admin-player-detail').hidden=true;panel.querySelectorAll('.is-behind').forEach(s=>s.classList.remove('is-behind'));
 }
 // Headline numbers: who is on now, today's signups (today's retention row) and how many of the recent signups came
 // back the next day, weighted by cohort size.
 function renderKpis(online,retention){
  const today=zoneDay(Date.now()),row=retention.rows.find(r=>r.day===today),day1=retention.rows.map(r=>r.days[1]).filter(Boolean);
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
  // Every part loads on its own: one that fails leaves the others showing, and the line at the bottom says which one is missing.
  const PARTS=[['admin_online','Online now'],['admin_players','All players'],['admin_retention','Retention'],['admin_invites','Invites']];
  const [online,players,retention,invites]=await Promise.all(PARTS.map(([operation])=>bridge.request({operation}).catch(()=>null)));
  if(players)showPlayers(players);
  if(online){await loadFaces(online.players.map(p=>p.playerId));renderOnline(online);}
  if(retention)renderRetention(retention);
  if(online&&retention)renderKpis(online,retention);
  if(invites)renderInvites(invites);
  const missing=PARTS.filter((_,i)=>![online,players,retention,invites][i]).map(([,name])=>name);
  status.textContent=missing.length?`${missing.join(', ')} could not be loaded. Please try again.`:`Updated ${clock(new Date().toISOString())} (Amsterdam time)`;
 }
 // The chat: open reports for the staff; news, moderators and chat levels for the admin.
 const ACTIONS={deleted:'Deleted',dismissed:'Nothing wrong',muted:'Muted',banned:'Banned from chat'};
 const verdict=r=>r.open?'<b class="admin-log-open">Open</b>':`<b class="admin-log-done">${esc(ACTIONS[r.action]??'Handled')}${r.handledBy?` · ${esc(r.handledBy)}`:''}</b>`;
 const where=channel=>channel==='global'?'Global chat':String(channel).startsWith('family:')?'Family chat':'Private message';
 // The farmers' pictures for the lists (kept between refreshes, so a list never flickers back to initials).
 // Asked again on every refresh, so a farmer who picks a new avatar shows it here too; your own shows at once.
 async function loadFaces(ids){try{const found=await bridge.chat?.faces?.(ids);if(found)faces=new Map([...faces,...found]);}catch{}}
 window.addEventListener('harvest-avatar-changed',event=>{const {playerId,avatarId}=event.detail??{};if(playerId&&avatarId)faces.set(playerId,avatarId);});
 async function loadChat(){
  const client=bridge.chat;if(!client||!role)return;
  const chatStatus=dialog.querySelector('#admin-chat-status');
  try{
   const reports=await client.reports();await loadFaces(reports.map(r=>r.sender));
   dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-count').textContent=number(reports.length);dialog.querySelector('#admin-kpi-reports').textContent=number(reports.length);
   dialog.querySelector('#admin-report-list').innerHTML=reports.length?reports.map(r=>`<li>${avatar(r.senderName,false,r.sender)}<span class="admin-recent-copy"><strong>${esc(r.senderName??'A farmer')} <small>${where(r.channel)} · ${number(r.reports)} report${r.reports===1?'':'s'}${r.present?'':' · already gone'}</small></strong><small class="admin-report-body">“${esc(r.body)}”</small><span class="admin-report-actions">${r.present?`<button type="button" class="small-button" data-report="delete" data-id="${esc(r.messageId)}">Delete</button>`:''}<button type="button" class="small-button" data-report="mute" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Mute 1 day</button><button type="button" class="small-button" data-report="ban" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Ban from chat</button><button type="button" class="small-button" data-report="dismiss" data-id="${esc(r.messageId)}">Nothing wrong</button></span></span></li>`).join(''):'<li class="admin-empty">No open reports. The valley is friendly today.</li>';
  }catch(error){dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-list').innerHTML=`<li class="admin-empty">${esc(error.message)}</li>`;}
  try{
   const log=await client.reportLog();await loadFaces(log.map(r=>r.sender));dialog.querySelector('#admin-report-log').hidden=false;
   dialog.querySelector('#admin-log-list').innerHTML=log.length?log.map(r=>`<li>${avatar(r.senderName,false,r.sender)}<span class="admin-recent-copy"><strong><button type="button" class="admin-log-name" data-profile="${esc(r.sender)}">${esc(r.senderName??'A farmer')}</button> <small>${where(r.channel)} · ${number(r.reports)} report${r.reports===1?'':'s'}</small></strong><small class="admin-report-body">“${esc(r.body)}”</small><small>${verdict(r)}</small></span><small class="admin-when" title="${esc(fmtDate(r.lastAt))}">${ago(r.lastAt)}</small></li>`).join(''):'<li class="admin-empty">No reports yet.</li>';
  }catch{}
  try{showRoom(await client.donationRoom());}catch{}
  if(role!=='admin')return;
  dialog.querySelector('#admin-chat-settings').hidden=false;
  try{
   const [staff,overview]=await Promise.all([client.staffList(),chat?.whenReady?.()]);await loadFaces(staff.map(s=>s.playerId));
   dialog.querySelector('#admin-mod-list').innerHTML=staff.length?staff.map(s=>`<li>${avatar(s.name,false,s.playerId)}<span class="admin-recent-copy"><strong>${esc(s.name)}</strong><small>Moderator since ${esc(fmtDate(s.since))}</small></span></li>`).join(''):'<li class="admin-empty">No moderators yet.</li>';
   const levels=overview?.levels;
   if(levels&&document.activeElement?.closest?.('#admin-levels-form')==null){dialog.querySelector('#admin-level-global').value=levels.global;dialog.querySelector('#admin-level-dm').value=levels.dm;}
  }catch(error){chatStatus.textContent=error.message;}
 }
 dialog.querySelector('#admin-player-search').addEventListener('input',event=>{view.search=event.target.value;view.shown=60;renderPlayers();});
 dialog.querySelector('#admin-player-sort').addEventListener('change',event=>{view.sort=event.target.value;renderPlayers();});
 dialog.querySelectorAll('[data-player-filter]').forEach(b=>b.onclick=()=>{view.filter=b.dataset.playerFilter;view.shown=60;pressed(dialog.querySelectorAll('[data-player-filter]'),b);renderPlayers();});
 dialog.querySelectorAll('[data-funnel-period]').forEach(b=>b.onclick=()=>{view.period=b.dataset.funnelPeriod;pressed(dialog.querySelectorAll('[data-funnel-period]'),b);renderFunnel();});
 dialog.querySelector('#admin-player-more').onclick=()=>{view.shown+=60;renderPlayers();};
 dialog.querySelector('[data-admin-panel="players"]').addEventListener('click',event=>{
  const row=event.target.closest('[data-player]');if(row){void openPlayer(row.dataset.player);return;}
  if(event.target.closest('[data-player-back]')){closePlayer();return;}
  const giftButton=event.target.closest('[data-gift-player]');if(giftButton){const p=view.players.find(x=>x.playerId===giftButton.dataset.giftPlayer);if(p)giftTo(p);return;}
  const profile=event.target.closest('[data-open-profile]');if(profile)window.harvestProfiles?.open(profile.dataset.openProfile,{back:null});
 });
 // A name in the log opens that farmer's profile (with the chat buttons: mute, ban), on top of the dashboard.
 dialog.querySelector('#admin-log-list').addEventListener('click',event=>{const name=event.target.closest('[data-profile]');if(name)window.harvestProfiles?.open(name.dataset.profile,{back:null});});
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
 // A gift from the staff, to everyone, the farmers active this week, the farmers online now or one farmer (the database decides the list
 // when it is sent). All staff together give at most 5 gifts, 50 diamonds and 500 coins a day (the database keeps count).
 const gift={audience:'all',player:null};
 function showRoom(room,sent=''){
  dialog.querySelector('#admin-donate').hidden=false;
  dialog.querySelector('#admin-donate-room').textContent=`${sent}Left today, for all staff together: ${number(room.diamonds)} diamonds, ${number(room.coins)} coins, ${number(room.gifts)} gift${room.gifts===1?'':'s'}. Farmers get it the next time their farm opens (open games at once), and see it under Notifications.`;
 }
 function paintGift(){
  dialog.querySelectorAll('[data-gift-audience]').forEach(b=>{const on=b.dataset.giftAudience===gift.audience;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  const picker=dialog.querySelector('#admin-gift-player');picker.hidden=gift.audience!=='player';
  const count=view.players?.length?giftCount(view.players,gift.audience):null,send=dialog.querySelector('#admin-donate-send');
  send.textContent=giftLabel(gift.audience,{count,player:gift.player});send.disabled=gift.audience==='player'&&!gift.player;
  const found=giftMatches(view.players,dialog.querySelector('#admin-gift-search').value);
  dialog.querySelector('#admin-gift-results').innerHTML=gift.player&&!found.length?`<li class="is-chosen">${avatar(gift.player.username,gift.player.online,gift.player.playerId)}<span><strong>${esc(gift.player.username)}</strong><small>Level ${number(gift.player.level)}</small></span></li>`
   :found.map(p=>`<li><button type="button" data-gift-pick="${esc(p.playerId)}" aria-pressed="${gift.player?.playerId===p.playerId}">${avatar(p.username,p.online,p.playerId)}<span><strong>${esc(p.username)}</strong><small>Level ${number(p.level)}</small></span></button></li>`).join('');
 }
 function giftTo(player){gift.audience='player';gift.player=player;dialog.querySelector('#admin-gift-search').value='';paintGift();dialog.querySelector('#admin-donate').scrollIntoView({behavior:'smooth',block:'start'});}
 dialog.querySelector('#admin-donate').addEventListener('click',event=>{
  const choice=event.target.closest('[data-gift-audience]');if(choice){gift.audience=choice.dataset.giftAudience;paintGift();if(gift.audience==='player'&&!gift.player)dialog.querySelector('#admin-gift-search').focus();return;}
  const pick=event.target.closest('[data-gift-pick]');if(pick){gift.player=view.players.find(p=>p.playerId===pick.dataset.giftPick)??null;dialog.querySelector('#admin-gift-search').value='';paintGift();}
 });
 dialog.querySelector('#admin-gift-search').addEventListener('input',paintGift);
 // Enter in the name box picks the first farmer found, instead of sending the form.
 dialog.querySelector('#admin-gift-search').addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();const first=giftMatches(view.players,event.target.value)[0];if(first){gift.player=first;event.target.value='';paintGift();}});
 dialog.querySelector('#admin-donate-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!bridge.chat)return;
  const diamonds=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-diamonds').value)||0)),coins=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-coins').value)||0));
  const message=dialog.querySelector('#admin-donate-message').value.trim(),room=dialog.querySelector('#admin-donate-room');
  if(!diamonds&&!coins){room.textContent='Enter some diamonds or coins.';return;}
  if(gift.audience==='player'&&!gift.player){room.textContent='Choose the farmer who gets the gift.';return;}
  const parts=[diamonds&&`${number(diamonds)} diamonds`,coins&&`${number(coins)} coins`].filter(Boolean).join(' + ');
  const count=view.players?.length?giftCount(view.players,gift.audience):null;
  const to=gift.audience==='player'?gift.player.username:gift.audience==='active'?`the ${count==null?'':`${number(count)} `}farmers active this week`:gift.audience==='online'?`the ${count==null?'':`${number(count)} `}farmers online now`:'everyone';
  const who=gift.audience==='player'?`${gift.player.username} receives`:gift.audience==='all'?'Every farmer receives':'Each of them receives';
  if(!await confirmAction({title:`Send a gift to ${to}?`,description:`${who} ${parts}.${message?` “${message}”`:''}`,confirmLabel:'Send',picture:'gift'}))return;
  try{
   const result=await bridge.chat.donate(coins,diamonds,message||null,gift.audience,gift.audience==='player'?gift.player.playerId:null);
   showRoom(result,result.farmers==null?'Sent to everyone. ':`Sent to ${number(result.farmers)} farmer${result.farmers===1?'':'s'}. `);
   dialog.querySelector('#admin-donate-diamonds').value='0';dialog.querySelector('#admin-donate-coins').value='0';dialog.querySelector('#admin-donate-message').value='';
  }catch(error){room.textContent=error.message;}
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
 function openDashboard(){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());refreshArt();dialog.showModal();load();
  clearInterval(refreshTimer);refreshTimer=setInterval(load,60000);
 }
 button.onclick=openDashboard;
 // "Open in dashboard" on a farmer's profile (src/player-profiles.js): the Players tab, on that farmer's details. From the
 // dashboard's own "Open profile" the dashboard is still open underneath, so only the profile closes.
 function showFarmer(id){
  if(!role||!id)return;
  if(dialog.open)document.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});else openDashboard();
  showTab('players');openPlayer(id);
 }
 window.harvestStaff={role:()=>role,showFarmer};
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
