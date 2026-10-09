// The staff dashboard (the admin and the moderators): three headline numbers, the chat reports, who is online, every farmer with
// when they were last active and one farmer's details (src/admin-players.js), where new players stop, a 7-day retention cohort
// and the Invite a friend log; for the admin also where new farmers come from, news for everyone, the moderators and the
// levels from which farmers may chat (supabase/chat.sql). Giving coins, XP, diamonds or goods stays admin-only (Send a gift and the profile). Farm events run on their own schedule (live-events-schedule.sql), so they have no controls here. A single
// icon button in the topbar (hidden for everyone else, same gate as the gift panel in player-profiles.js) opens
// its own dialog inside the game, instead of a separate page — one session, one sign-in, nothing extra to visit.
import {checkAdmin} from './player-profiles.js';
import {refreshArt} from '../public/visual-icons.js';
import {art} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';
import {POPUP_SCREENS,POPUP_AUDIENCES} from './popup-ui.js';
import {OFFER,offerValueCents,offerProblem,offerFill} from '../game/payments.js';
import {avatarImage} from '../public/player-avatars.js';
import {LANGUAGES} from '../public/languages.js';
import {chosenLanguage} from '../public/i18n.js';
import {translateLink,groupPills} from './chat-ui.js';
import {deviceName} from '../supabase/functions/farm-api/admin-analytics-service.js';
import {GIFT_AUDIENCES,giftCount,giftMatches,giftLabel,PLAYER_FILTERS,PLAYER_SORTS,FUNNEL_PERIODS,RETENTION_PERIODS,SOURCE_PERIODS,GUIDE_STEPS,filterPlayers,playerRow,playerDetail,funnel,funnelHtml,sourcesHtml,countryCounts,countriesHtml,languageCounts,languagesHtml,deviceCounts,devicesHtml,dateTime,clock,zoneDay} from './admin-players.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
// The staff see what the database really said (Oct 2026: the chat shows farmers the general text instead, src/chat-client.js).
const why=error=>error?.raw??error?.message;
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
  +'<div class="market-tabs admin-tabs" role="tablist" aria-label="Dashboard"><button type="button" role="tab" data-admin-tab="chat" aria-label="Chat" class="active" aria-selected="true">'+art('chat')+'<span class="admin-tab-name">Chat</span></button><button type="button" role="tab" data-admin-tab="feedback" aria-label="Feedback" aria-selected="false">'+art('feedback')+'<span class="admin-tab-name">Feedback</span><b class="admin-tab-count" id="admin-feedback-count" hidden>0</b></button><button type="button" role="tab" data-admin-tab="players" aria-label="Players" aria-selected="false">'+art('family-members')+'<span class="admin-tab-name">Players</span></button><button type="button" role="tab" data-admin-tab="growth" aria-label="Growth" aria-selected="false">'+art('xp')+'<span class="admin-tab-name">Growth</span></button><button type="button" role="tab" data-admin-tab="purchases" aria-label="Purchases" aria-selected="false" hidden>'+art('diamonds')+'<span class="admin-tab-name">Purchases</span></button><button type="button" role="tab" data-admin-tab="settings" aria-label="Settings" aria-selected="false" hidden>'+art('settings')+'<span class="admin-tab-name">Settings</span></button></div>'
  +'<div data-admin-panel="chat">'
  +'<section class="admin-card admin-guide"><h3>'+art('admin')+'Keeping the valley friendly</h3><ul><li><strong>Delete</strong> a message that is rude, hurtful or shares personal details (an address, a phone number).</li><li><strong>Mute for a day</strong> when someone keeps it up after a message is deleted.</li><li><strong>Ban from chat</strong> only for serious or repeated abuse. It closes the chat, never the farm.</li><li>Not sure? Choose <strong>Nothing wrong</strong> or leave it for the admin.</li></ul></section>'
  +'<section class="admin-card" id="admin-reports" hidden><h3>'+art('alert')+'Chat reports <span id="admin-report-count">0</span></h3><ul id="admin-report-list" class="admin-recent-list admin-report-list"></ul><p class="admin-hint">Delete removes the message for everyone. Mute and ban only close the chat for that farmer, never their farm.</p></section>'
  +'<section class="admin-card" id="admin-report-log" hidden><h3>'+art('quests')+'Report log</h3><p class="admin-hint">Every reported message, newest first: who reported it and what the staff did with it.</p><ul id="admin-log-list" class="admin-recent-list admin-log-list"></ul></section>'
  // Feedback & bugs (supabase/feedback.sql): what farmers send with the mailbox button, for the admin and the moderators.
  +'</div><div data-admin-panel="feedback" hidden>'
  +'<section class="admin-card"><h3>'+art('feedback')+'Feedback</h3><div class="admin-filters" role="group" aria-label="Show"><button type="button" class="admin-filter active" data-feedback-filter="open" aria-pressed="true">Open</button><button type="button" class="admin-filter" data-feedback-filter="done" aria-pressed="false">Done</button></div>'
  +'<ul id="admin-feedback-list" class="admin-recent-list admin-feedback-list"></ul><p class="admin-hint">What farmers send with the mailbox button, newest first, in their own words. Done moves a message to Done. A name opens the farmer\'s profile, where you can write back.</p></section>'
  +'</div><div data-admin-panel="players" hidden>'
  +'<section class="admin-card" id="admin-donate" hidden><h3>'+art('gift')+'Send a gift</h3><form id="admin-donate-form" class="admin-donate"><div class="admin-gift-to"><span>Send to</span><div class="admin-filters" role="group" aria-label="Send to">'+GIFT_AUDIENCES.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-gift-audience="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><div id="admin-gift-player" class="admin-gift-player" hidden><input type="search" id="admin-gift-search" placeholder="Find a farmer by name" aria-label="Find a farmer" autocomplete="off"><ul id="admin-gift-results" class="admin-gift-results"></ul></div></div><label><span>'+art('diamonds')+'Diamonds</span><input type="number" id="admin-donate-diamonds" min="0" max="50" step="1" placeholder="0" inputmode="numeric"></label><label><span>'+art('coins')+'<b id="admin-donate-coins-label">Coins</b></span><input type="number" id="admin-donate-coins" min="0" max="1000" step="10" placeholder="0" inputmode="numeric"></label><div class="admin-coin-kind"><div class="admin-filters" role="group" aria-label="Coins"><button type="button" class="admin-filter active" data-coin-kind="fixed" aria-pressed="true">Fixed</button><button type="button" class="admin-filter" data-coin-kind="level" aria-pressed="false">Per level</button></div><p class="admin-hint" id="admin-donate-preview">Every farmer gets the same.</p></div><label class="admin-donate-message"><span>Message</span><input type="text" id="admin-donate-message" maxlength="120" placeholder="Thanks for playing!"></label><button type="submit" class="primary-button" id="admin-donate-send">Send to everyone</button></form><p class="admin-hint" id="admin-donate-room"></p></section>'
  +'<section class="admin-card"><h3>'+art('family-members')+'Online now <span id="admin-online-count">0</span></h3><ul id="admin-online-list" class="admin-online-list"></ul><p class="admin-hint">Active in the last <span id="admin-online-window">30</span> minutes.</p></section>'
  +'<section class="admin-card" id="admin-players"><h3>'+art('family-members')+'All players <span id="admin-players-count">0</span></h3><div class="admin-player-tools"><input type="search" id="admin-player-search" placeholder="Search by name" aria-label="Search players" autocomplete="off"><select id="admin-player-sort" aria-label="Order">'+PLAYER_SORTS.map(([id,label])=>`<option value="${id}">${label}</option>`).join('')+'</select></div><div class="admin-filters" role="group" aria-label="Show">'+PLAYER_FILTERS.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-player-filter="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><ul id="admin-player-list" class="admin-recent-list admin-player-list"></ul><button type="button" id="admin-player-more" class="small-button admin-more" hidden>Show more</button><p class="admin-hint">Times are Amsterdam time. Last action: the last time the farm saved. Gone quiet: played before, not active for 7 days or more. New: joined in the last 7 days.</p></section>'
  +'<section class="admin-card admin-player-detail" id="admin-player-detail" hidden></section>'
  +'</div><div data-admin-panel="growth" hidden>'
  +'<section class="admin-card" id="admin-funnel"><h3>'+art('quests')+'New players: where do they stop?</h3><div class="admin-filters" role="group" aria-label="Period">'+FUNNEL_PERIODS.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-funnel-period="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><ul id="admin-funnel-list" class="admin-bars admin-funnel"></ul><p class="admin-hint">Of everyone who made an account in the period, how many got this far. Coming back counts only farmers who joined long enough ago, from their last activity.</p></section>'
  // Where new farmers come from (2 Oct 2026, supabase/player-attribution.sql): the admin only, it has money in it.
  +'<section class="admin-card" id="admin-sources" hidden><h3>'+art('invite-friends')+'Where new farmers come from</h3><div class="admin-filters" role="group" aria-label="Sources period">'+SOURCE_PERIODS.map(([id,label])=>`<button type="button" class="admin-filter${id==='30'?' active':''}" data-source-period="${id}" aria-pressed="${id==='30'}">${label}</button>`).join('')+'</div><div class="admin-table-scroll"><table class="admin-table admin-source-table"><thead><tr><th>Source</th><th>Farmers</th><th>Day 1</th><th>Level 5</th><th>Level 10</th><th>Level 14</th><th>Checkouts</th><th>Paid</th><th>€</th></tr></thead><tbody id="admin-source-body"></tbody></table></div><p class="admin-hint">One source per farmer, the first that applies: our ?src= tag, a partner link, a friend’s invite, the ad’s utm_source / campaign, the ad click (Meta, TikTok, Google), the website that linked, else Direct. Recorded once, when a new farm opens. Day 1 is approximate (last activity). Checkouts, Paid and € leave test payments out.</p></section>'
  +'<section class="admin-card" id="admin-countries" hidden><h3>'+art('invite-friends')+'Where players come from</h3><ul id="admin-country-list" class="admin-bars"></ul><p class="admin-hint">The country of each farmer’s device time zone, the last time they opened the game.</p></section>'
  +'<section class="admin-card" id="admin-devices" hidden><h3>'+art('farmapp')+'Mobile or desktop</h3><div id="admin-device-box"></div><p class="admin-hint">The device each farmer last opened the game on. Mobile is a phone or a tablet.</p></section>'
  +'<section class="admin-card" id="admin-languages"><h3>'+art('settings')+'Game language</h3><ul id="admin-language-list" class="admin-bars"></ul><p class="admin-hint">The language each farmer’s game was in, the last time they opened it.</p></section>'
  // 7, 30 or 90 days (1 Oct 2026): a row per signup day, or per signup week for 90 days (admin-analytics-service.js).
  +'<section class="admin-card"><h3>'+art('xp')+'Retention</h3><div class="admin-filters" role="group" aria-label="Retention period">'+RETENTION_PERIODS.map(([id,label],i)=>`<button type="button" class="admin-filter${i?'':' active'}" data-retention-period="${id}" aria-pressed="${!i}">${label}</button>`).join('')+'</div><p class="admin-hint" id="admin-retention-hint">Share of each day’s signups (Amsterdam time) still active N days later. Approximate: based on last activity.</p><div class="admin-table-scroll"><table class="admin-table admin-retention-table"><thead id="admin-retention-head"></thead><tbody id="admin-retention-body"></tbody></table></div></section>'
  +'<section class="admin-card"><h3>'+art('gift')+'Invite a friend</h3><div id="admin-invite-totals" class="admin-invite-totals"></div><ul id="admin-invite-list" class="admin-recent-list admin-invite-list"></ul><p class="admin-hint">Each friend who reaches level 10 within 30 days earns 150 diamonds for both. “Paid” means the diamonds are in their farm.</p></section>'
  // Purchases (27 Sep 2026, the admin only): every checkout, paid or not, newest first.
  +'</div><div data-admin-panel="purchases" hidden>'
  // Special offers (29 Sep 2026, supabase/special-offer.sql): diamonds, coins and/or VIP worth €49.99 at shop prices, for €4.99,
  // once per farmer, from level 14. Ticking a kind fills in amounts worth €49.99; they can be changed while the worth stays
  // within 2%. One offer at a time: a new one ends the one running now.
  +'<section class="admin-card" id="admin-offers"><h3>'+art('diamonds')+'Special offer</h3><form id="admin-offer-form" class="admin-news admin-offer">'
  +'<div class="admin-offer-kinds"><label><input type="checkbox" id="admin-offer-has-diamonds" checked> Diamonds</label><label><input type="checkbox" id="admin-offer-has-coins"> Coins</label>'
  +'<label>VIP<select id="admin-offer-vip"><option value="0">None</option><option value="7">7 days</option><option value="30">30 days</option><option value="60">60 days</option><option value="90">90 days</option></select></label></div>'
  +'<div class="admin-popup-fields"><label>Diamonds<input id="admin-offer-diamonds" type="number" min="0" max="'+OFFER.maxDiamonds+'" step="50" inputmode="numeric"></label>'
  +'<label>Coins<input id="admin-offer-coins" type="number" min="0" max="'+OFFER.maxCoins+'" step="1000" inputmode="numeric"></label>'
  // The pop-ups' groups but the Android app (9 Oct 2026): the database takes no offer for that group (supabase/popup-android-app.sql).
  +'<label>Who sees it<select id="admin-offer-audience">'+Object.entries(POPUP_AUDIENCES).filter(([key])=>key!=='android_app').map(([key,name])=>`<option value="${key}">${name}</option>`).join('')+'</select></label>'
  +'<label>From level<input id="admin-offer-level" type="number" min="14" max="200" step="1" value="14" inputmode="numeric"></label>'
  +'<label>Runs for<select id="admin-offer-hours"><option value="24">24 hours</option><option value="48" selected>48 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="336">14 days</option></select></label></div>'
  +'<p class="admin-offer-worth" id="admin-offer-worth"></p>'
  +'<p class="admin-popup-note">Always €4.99 for what costs €49.99 in the shop (a diamond as in the 500 pack, 200 coins a diamond (1,000 coins = 5 diamonds), VIP at its diamond price). Every farmer from the level above can buy it once. It opens by itself once per device, when nothing else is open, and then waits next to the diamonds until it ends.</p>'
  +'<div class="admin-offer-actions"><button type="button" class="secondary-button" id="admin-offer-preview">Preview</button><button type="submit" class="primary-button">Start offer</button></div>'
  +'<p class="admin-hint" id="admin-offer-status" role="status"></p></form><ul id="admin-offer-list" class="admin-recent-list" hidden></ul></section>'
  +'<section class="admin-card"><h3>'+art('diamonds')+'Purchases</h3><div id="admin-purchase-totals" class="admin-invite-totals"></div><div class="admin-filters" role="group" aria-label="Show"><button type="button" class="admin-filter active" data-purchase-filter="all" aria-pressed="true">All</button><button type="button" class="admin-filter" data-purchase-filter="paid" aria-pressed="false">Paid</button><button type="button" class="admin-filter" data-purchase-filter="open" aria-pressed="false">Not finished</button></div><ul id="admin-purchase-list" class="admin-recent-list admin-purchase-list"></ul><p class="admin-hint">Every checkout, newest first (Amsterdam time). “Not finished”: the farmer opened the payment page but did not pay, or the page is still open. Test payments are marked.</p></section>'
  // The partner programme (supabase/partners.sql, /partners): partners, what they brought in, and payout requests to pay by hand.
  +'<section class="admin-card" id="admin-partners"><h3>'+art('invite-friends')+'Partners <span id="admin-partner-count">0</span></h3><div id="admin-partner-totals" class="admin-invite-totals"></div><h4 class="admin-subhead">Payout requests</h4><ul id="admin-payout-list" class="admin-recent-list"></ul><h4 class="admin-subhead">Partners</h4><ul id="admin-partner-list" class="admin-recent-list"></ul><p class="admin-hint">Partners sign up on harvesttycoon.com/partners and earn 25% of what their players spend, without 21% VAT. A payout request comes by email to info@harvesttycoon.com with where to pay: pay it by hand, then mark it paid here. Rejected goes back to what they can ask for.</p></section>'
  +'</div><div data-admin-panel="settings" hidden>'
  +'<section class="admin-card" id="admin-chat-settings" hidden><h3>'+art('bell')+'News and pop-ups</h3><form id="admin-news-form" class="admin-news">'
  // In more languages (supabase/admin-texts-languages.sql): English for every language without a text of its own.
  +'<label class="admin-news-hours">Language<select id="admin-news-language">'+LANGUAGES.map(l=>`<option value="${l.code}">${esc(l.name)}</option>`).join('')+'</select></label><p class="admin-popup-note" id="admin-news-language-note"></p>'
  +'<textarea id="admin-news-text" maxlength="400" rows="3" placeholder="A new feature, an event… As a notification everyone sees it under Notifications in the chat."></textarea>'
  // The admin only: the same news also as a pop-up, once per farmer, with an optional button (src/popup-ui.js, supabase/popups.sql).
  +'<label class="admin-news-hours admin-send-as">Send as<select id="admin-send-as"><option value="news">Notification</option><option value="popup">Pop-up</option><option value="both">Notification and pop-up</option><option value="dm">Private message (they can reply)</option></select></label>'
  // The admin's private message to many farmers: who gets it, and how many that is right now (supabase/chat-broadcast-dm.sql). A group
  // message with filters since 8 Oct 2026 (supabase/chat-group-filters.sql), all together; what is marked data-group-filter goes away
  // while the database does not have them yet. Below it the last ones sent, with how many farmers replied.
  +'<div class="admin-popup-fields" id="admin-dm-fields" hidden><div class="admin-dm-filters"><label>Who gets it<select id="admin-dm-audience"><option value="online">Online now</option><option value="week" selected>Active this week</option><option value="month" data-group-filter>Active this month</option><option value="all">Everyone</option></select></label><label>From level<input id="admin-dm-level" type="number" min="1" max="200" step="1" value="1" inputmode="numeric"></label>'
  +'<label data-group-filter>Up to level<input id="admin-dm-max-level" type="number" min="1" max="200" step="1" placeholder="Any level" inputmode="numeric"></label>'
  +'<label data-group-filter>Plays<select id="admin-dm-platform"><option value="">Anywhere</option><option value="android">In the Android app (Google Play)</option><option value="ios">In the iPhone app (App Store)</option><option value="browser">In the browser</option></select></label>'
  +'<label data-group-filter>Leave out<select id="admin-dm-notPlatform"><option value="">Nobody</option><option value="android">The Android app (Google Play)</option><option value="ios">The iPhone app (App Store)</option><option value="browser">The browser</option></select></label>'
  +'<label data-group-filter>Game language<select id="admin-dm-language"><option value="">Any language</option>'+LANGUAGES.map(l=>`<option value="${l.code}">${esc(l.name)}</option>`).join('')+'</select></label>'
  +'<label data-group-filter>Family<select id="admin-dm-family"><option value="">In a family or not</option><option value="in">In a family</option><option value="out">Not in a family</option></select></label>'
  +'<label class="admin-dm-check" data-group-filter><input type="checkbox" id="admin-dm-crazygames">CrazyGames accounts only</label>'
  +'<label class="admin-dm-check" data-group-filter><input type="checkbox" id="admin-dm-kongregate">Kongregate accounts only</label></div>'
  +'<p class="admin-popup-note" id="admin-dm-count">Counting farmers…</p><p class="admin-popup-note">Every farmer gets it as a private message from you and can reply; the replies come in under your private messages. Farmers with notifications on for messages also get a push. Links (https) work.</p>'
  +'<p class="admin-popup-note" data-group-filter>Above it they read “Group message from the team” and who it was sent to, in their own language. Farmers who switched private messages off are left out. Plays and Leave out: where they last opened the game (a farmer with nothing on record is in no place and never left out). Game language: the one they last played in.</p>'
  +'<h4 class="admin-subhead" id="admin-dm-log-head" hidden>Last group messages</h4><ul class="admin-popup-list" id="admin-dm-log" hidden></ul></div>'
  +'<div class="admin-popup-fields" id="admin-popup-fields" hidden>'
  +'<label>Title<input id="admin-popup-title" maxlength="60" placeholder="Play it as an app"></label>'
  +'<label>Button<input id="admin-popup-label" maxlength="30" placeholder="Show me how (leave empty for no button)"></label>'
  +'<label>The button opens<select id="admin-popup-target">'+Object.entries(POPUP_SCREENS).map(([key,name])=>`<option value="screen:${key}">${name}</option>`).join('')+'<option value="link">A web page (new tab)</option></select></label>'
  +'<label id="admin-popup-link-row" hidden>Web address<input id="admin-popup-link" type="url" maxlength="300" placeholder="https://"></label>'
  +'<label>Who sees it<select id="admin-popup-audience">'+Object.entries(POPUP_AUDIENCES).map(([key,name])=>`<option value="${key}">${name}</option>`).join('')+'</select></label>'
  +'<label>From level<input id="admin-popup-level" type="number" min="1" max="200" step="1" value="1" inputmode="numeric"></label>'
  +'<p class="admin-popup-note">Every farmer sees the pop-up once, when nothing else is open, and never in their first half hour. It ends after the time below, or after 30 days. Who installed the app is only known on the device: phones and browsers are checked when the game opens. Android app (Google Play): only in our app from Google Play, never in the iPhone app, a browser or a game site; send it as a pop-up only (a notification would reach everyone).</p></div>'
  +'<label class="admin-news-hours" id="admin-news-hours-row">Show it for<select id="admin-news-hours"><option value="6">6 hours</option><option value="12">12 hours</option><option value="24" selected>24 hours</option><option value="48">48 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="0">Always</option></select></label><label class="admin-news-hours" id="admin-news-level-row">From level<input id="admin-news-level" type="number" min="1" max="200" step="1" value="1" inputmode="numeric"></label><button type="submit" class="primary-button">Send</button></form><ul class="admin-popup-list" id="admin-popup-list" hidden></ul>'
  // A private message from the admin to every new farmer, a few minutes after they sign up (supabase/welcome-dm.sql), in the
  // language they play in when it has a text of its own, otherwise in English (supabase/welcome-dm-languages.sql).
  +'<h3>'+art('chat')+'Welcome message</h3><form id="admin-welcome-form" class="admin-news admin-welcome" hidden><label class="admin-welcome-on"><input type="checkbox" role="switch" class="family-switch" id="admin-welcome-on"><span>Send new farmers a private message from you</span></label>'
  // From (Oct 2026): the welcome comes from one of the admins, Tony or Gerard (supabase/gerard.sql); it is sent as that farmer, with
  // their face and name, and replies go to them, so the text should say who they are.
  +'<label class="admin-news-hours" id="admin-welcome-from" hidden>From<select id="admin-welcome-sender"></select></label>'
  +'<label class="admin-news-hours">Language<select id="admin-welcome-language">'+LANGUAGES.map(l=>`<option value="${l.code}">${esc(l.name)}</option>`).join('')+'</select></label>'
  +'<textarea id="admin-welcome-text" maxlength="500" rows="4" placeholder="Hi {name}, welcome to Harvest Tycoon!"></textarea><p class="admin-popup-note" id="admin-welcome-language-note"></p><p class="admin-popup-note">{name} becomes their farmer name. They can reply; the replies come in under your private messages. Only farmers who sign up after you switch it on get it, each once.</p>'
  +'<label class="admin-news-hours">Send it<select id="admin-welcome-delay"><option value="1">1 minute after sign-up</option><option value="3">3 minutes after sign-up</option><option value="5">5 minutes after sign-up</option><option value="10">10 minutes after sign-up</option><option value="30">30 minutes after sign-up</option></select></label>'
  +'<button type="submit" class="primary-button">Save</button><p class="admin-hint" id="admin-welcome-status"></p></form>'
  +'<h3>'+art('admin')+'Moderators</h3><ul id="admin-mod-list" class="admin-recent-list"></ul><p class="admin-hint">Make a farmer a moderator (or not) on their profile.</p>'
  +'<h3>'+art('chat')+'Who may chat</h3><form id="admin-levels-form" class="admin-levels"><label>Global chat from level<input type="number" id="admin-level-global" min="1" max="200" step="1" inputmode="numeric"></label><label>Private messages from level<input type="number" id="admin-level-dm" min="1" max="200" step="1" inputmode="numeric"></label><button type="submit" class="small-button">Save</button></form><p id="admin-chat-status" class="admin-hint" role="status"></p><p id="admin-device" class="admin-hint admin-device"></p></section></div>'
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
 const view={filter:'all',search:'',sort:'active',shown:60,period:'7',retention:'7',sources:'30',players:[],owner:false,guideSteps:GUIDE_STEPS.length,detail:null};
 function renderPlayers(){
  const found=filterPlayers(view.players,view),list=dialog.querySelector('#admin-player-list');
  dialog.querySelector('#admin-players-count').textContent=found.length===view.players.length?number(found.length):`${number(found.length)} of ${number(view.players.length)}`;
  list.innerHTML=found.length?found.slice(0,view.shown).map(p=>playerRow(p,{guideSteps:view.guideSteps})).join(''):'<li class="admin-empty">No farmers match.</li>';
  const more=dialog.querySelector('#admin-player-more');more.hidden=found.length<=view.shown;more.textContent=`Show more (${number(found.length-view.shown)} left)`;
 }
 function renderFunnel(){dialog.querySelector('#admin-funnel-list').innerHTML=funnelHtml(funnel(view.players,view.period));}
 function renderCountries(){const box=dialog.querySelector('#admin-countries');box.hidden=!view.owner;if(view.owner)dialog.querySelector('#admin-country-list').innerHTML=countriesHtml(countryCounts(view.players));renderDevices();}
 function renderLanguages(){dialog.querySelector('#admin-language-list').innerHTML=languagesHtml(languageCounts(view.players));}
 function renderDevices(){const box=dialog.querySelector('#admin-devices');box.hidden=!view.owner;if(view.owner)dialog.querySelector('#admin-device-box').innerHTML=devicesHtml(deviceCounts(view.players),deviceCounts(view.players,{since:Date.now()-7*86400000}));}
 function showPlayers(data){
  view.players=data.players??[];view.owner=Boolean(data.owner);view.guideSteps=data.guideSteps??GUIDE_STEPS.length;
  faces=new Map([...faces,...view.players.filter(p=>p.avatarId).map(p=>[p.playerId,p.avatarId])]);
  dialog.querySelector('#admin-player-search').placeholder=view.owner?'Search by name, country or IP':'Search by name';
  renderPlayers();renderFunnel();renderCountries();renderLanguages();paintGift();
 }
 function pressed(buttons,on){buttons.forEach(b=>{const yes=b===on;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});}
 // One farmer: the list and the other cards step aside; "All players" brings them back where they were.
 async function openPlayer(id){
  const box=dialog.querySelector('#admin-player-detail'),panel=dialog.querySelector('[data-admin-panel="players"]');
  view.detail=id;panel.querySelectorAll(':scope>section:not(#admin-player-detail)').forEach(s=>s.classList.add('is-behind'));
  box.hidden=false;box.innerHTML='<p class="admin-hint">Loading the farmer…</p>';box.scrollIntoView?.({block:'start'});
  try{
   const {player}=await bridge.request({operation:'admin_player',playerId:id});if(view.detail!==id)return;
   box.innerHTML=playerDetail(player,{guideSteps:GUIDE_STEPS,owner:view.owner});refreshArt();
  }catch(error){box.innerHTML=`<div class="admin-detail-top"><button type="button" class="small-button" data-player-back>‹ All players</button></div><p class="admin-hint">${esc(why(error))}</p>`;}
 }
 function closePlayer(){
  view.detail=null;const panel=dialog.querySelector('[data-admin-panel="players"]');
  dialog.querySelector('#admin-player-detail').hidden=true;panel.querySelectorAll('.is-behind').forEach(s=>s.classList.remove('is-behind'));
 }
 // Headline numbers: who is on now, today's signups (today's retention row) and how many of the recent signups came
 // back the next day, weighted by cohort size.
 function renderKpis(online,retention){
  // The server counts the last week's signups whatever period the table shows (retention.kpi); an older server sends only the week.
  const today=zoneDay(Date.now()),row=retention.rows.find(r=>r.day===today),day1=retention.rows.map(r=>r.days[1]).filter(Boolean);
  const kept=retention.kpi?.day1??day1.reduce((sum,d)=>({retained:sum.retained+d.retained,total:sum.total+d.total}),{retained:0,total:0});
  dialog.querySelector('#admin-kpi-online').textContent=number(online.count);
  dialog.querySelector('#admin-kpi-new').textContent=number(retention.kpi?.today??row?.size??0);
  dialog.querySelector('#admin-kpi-day1').textContent=kept.total?`${Math.round(kept.retained/kept.total*100)}%`:'—';
 }
 function renderRetention(data){
  const columns=data.columns??Array.from({length:8},(_,i)=>i),period=data.period??7;
  dialog.querySelector('#admin-retention-hint').textContent=data.weekly?'Share of each week’s signups (from Monday, Amsterdam time) still active N days after their own signup day. A farmer counts once N days have passed. Approximate: based on last activity.':'Share of each day’s signups (Amsterdam time) still active N days later. Approximate: based on last activity.';
  dialog.querySelector('#admin-retention-head').innerHTML=`<tr><th>Signed up</th><th>Farmers</th>${columns.map(n=>`<th>Day ${n}</th>`).join('')}</tr>`;
  dialog.querySelector('#admin-retention-body').innerHTML=data.rows.length?data.rows.map(row=>`<tr><td>${data.weekly?`Week of ${fmtDay(row.day)}`:fmtDay(row.day)}</td><td>${number(row.size)}</td>${row.days.map(d=>d?`<td class="${heat(d.pct)}" title="${d.retained} / ${d.total} still active">${d.pct}%</td>`:'<td class="admin-pending">—</td>').join('')}</tr>`).join(''):`<tr><td colspan="${columns.length+2}" class="admin-empty">No signups in the last ${period===7?'week':`${period} days`}.</td></tr>`;
 }
 // Invite a friend: the totals, then every friend who started with someone's link and whether each side has its diamonds.
 function renderInvites(data){
  const t=data.totals,reward=data.rules?.reward??150;
  dialog.querySelector('#admin-invite-totals').innerHTML=`<span><strong>${number(t.links)}</strong> links</span><span><strong>${number(t.friends)}</strong> friends joined</span><span><strong>${number(t.qualified)}</strong> reached level ${data.rules?.level??10}</span><span><strong>${number(t.diamondsPaid)}</strong> diamonds paid</span>`;
  const paid=(yes,amount)=>amount>0?(yes?`<b class="admin-paid">+${amount} paid</b>`:`<b class="admin-pending-pay">+${amount} pending</b>`):'<b class="admin-none">none</b>';
  // Both names open that farmer's profile, as in the chat log.
  const who=(name,id)=>id?`<button type="button" class="admin-log-name" data-profile="${esc(id)}">${esc(name)}</button>`:esc(name);
  const state=i=>i.status==='qualified'?`Reached level 10 ${ago(new Date(i.qualifiedAt).toISOString())} · friend ${paid(i.friendPaid,reward)} · inviter ${paid(i.inviterPaid,i.inviterReward)}${i.inviterReward===0?' (inviter used all 10 rewards)':''}`
   :i.status==='expired'?`Did not reach level 10 within 30 days (level ${number(i.friendLevel)})`:`Playing · level ${number(i.friendLevel)} of 10`;
  dialog.querySelector('#admin-invite-list').innerHTML=data.invites.length?data.invites.map(i=>`<li>${avatar(i.friend,false,i.friendId)}<span class="admin-recent-copy"><strong>${who(i.friend,i.friendId)} <small>invited by ${who(i.inviter,i.inviterId)}</small></strong><small>${state(i)}</small></span><small class="admin-when" title="${esc(fmtDate(new Date(i.joinedAt).toISOString()))}">${ago(new Date(i.joinedAt).toISOString())}</small></li>`).join(''):'<li class="admin-empty">No friend has joined with an invite link yet.</li>';
 }
 // Purchases: the totals, then one row per checkout with who, what, the price and whether it was paid.
 let purchases=null,purchaseFilter='all';
 const PURCHASE_STATUS={credited:['Paid','is-paid'],pending:['Not finished','is-open'],expired:['Expired','is-expired'],refunded:['Refunded','is-expired']};
 const euro=cents=>`€${(cents/100).toFixed(2)}`;
 // Partners: the totals, the payout requests (open ones first, with Paid and Reject) and every partner with their numbers.
 const PAYOUT_STATUS={requested:['Asked for','is-open'],paid:['Paid','is-paid'],rejected:['Rejected','is-expired']};
 async function showPartners(){
  const list=dialog.querySelector('#admin-partner-list'),requests=dialog.querySelector('#admin-payout-list');
  try{
   const data=await bridge.chat.partnerList(),partners=data.partners??[],payouts=data.payouts??[],sum=key=>partners.reduce((n,p)=>n+(p.stats?.[key]??0),0);
   dialog.querySelector('#admin-partner-count').textContent=number(partners.length);
   dialog.querySelector('#admin-partner-totals').innerHTML=`<span><strong>${number(sum('players'))}</strong> players brought in</span><span><strong>${number(sum('payingPlayers'))}</strong> paying</span><span><strong>${euro(sum('earnedCents'))}</strong> earned</span><span><strong>${euro(sum('paidCents'))}</strong> paid out</span>`;
   const open=payouts.filter(p=>p.status==='requested'),rest=payouts.filter(p=>p.status!=='requested');
   requests.innerHTML=payouts.length?[...open,...rest].map(p=>{const [label,cls]=PAYOUT_STATUS[p.status]??[p.status,''];return `<li><span class="admin-recent-copy"><strong>${esc(p.partner)} · ${euro(p.amountCents)}</strong><small>${esc(p.email??'')} · asked ${esc(fmtDate(p.requestedAt))}</small></span>${p.status==='requested'?`<span class="admin-log-side"><button type="button" class="small-button" data-payout-id="${esc(p.id)}" data-payout-status="paid">Paid</button><button type="button" class="small-button" data-payout-id="${esc(p.id)}" data-payout-status="rejected">Reject</button></span>`:`<b class="admin-purchase-status ${cls}">${label}</b>`}</li>`;}).join(''):'<li class="admin-empty">No payout requests yet.</li>';
   list.innerHTML=partners.length?partners.map(p=>`<li><span class="admin-recent-copy"><strong>${esc(p.name)} <small>${esc(p.code)}</small></strong><small>${esc(p.email??'')}${p.website?` · ${esc(p.website)}`:''} · since ${esc(fmtDate(p.createdAt))}</small><small>${number(p.stats?.players??0)} players · ${number(p.stats?.payingPlayers??0)} paying · ${euro(p.stats?.earnedCents??0)} earned · ${euro(p.stats?.paidCents??0)} paid · ${euro(p.stats?.availableCents??0)} available</small></span></li>`).join(''):'<li class="admin-empty">No partners yet.</li>';
  }catch(error){list.innerHTML=`<li class="admin-empty">${esc(why(error))}</li>`;requests.innerHTML='';}
 }
 dialog.querySelector('#admin-payout-list').addEventListener('click',async event=>{
  const button=event.target.closest('[data-payout-id]');if(!button)return;const paid=button.dataset.payoutStatus==='paid';
  if(!await confirmAction({title:paid?'Mark this payout paid?':'Reject this payout request?',description:paid?'Only after you paid it by hand. The partner sees it as paid.':'The amount goes back to what the partner can ask for.',confirmLabel:paid?'Mark paid':'Reject',tone:paid?'':'danger'}))return;
  button.disabled=true;
  try{await bridge.chat.partnerPayout(button.dataset.payoutId,button.dataset.payoutStatus);}catch(error){button.disabled=false;button.title=why(error);return;}
  void showPartners();
 });
 function renderPurchases(data){
  if(data)purchases=data;if(!purchases)return;const t=purchases.totals;
  dialog.querySelector('#admin-purchase-totals').innerHTML=`<span><strong>${number(t.started)}</strong> checkouts</span><span><strong>${number(t.paid)}</strong> paid</span><span><strong>${number(t.notFinished)}</strong> not finished</span><span><strong>${euro(t.revenueCents)}</strong> earned</span><span><strong>${number(t.players)}</strong> farmers</span>`;
  const shown=purchases.purchases.filter(p=>purchaseFilter==='all'||(purchaseFilter==='paid'?p.status==='credited':p.status!=='credited'));
  // The Halloween Pass (Oct 2026) holds no diamonds of its own: it goes by its name.
  const what=p=>p.pack==='pass'?'Halloween Pass':p.pack==='starter'||p.pack==='offer'?`${p.pack==='offer'?'Special offer':'Starter Pack'} · ${number(p.diamonds)} diamonds${p.coins?` + ${number(p.coins)} coins`:''}`:`${number(p.diamonds)} diamonds`;
  dialog.querySelector('#admin-purchase-list').innerHTML=shown.length?shown.map(p=>{const [label,cls]=PURCHASE_STATUS[p.status]??[p.status,'is-open'];
   return `<li>${avatar(p.username,false,p.playerId)}<span class="admin-recent-copy"><strong>${p.playerId?`<button type="button" class="admin-log-name" data-profile="${esc(p.playerId)}">${esc(p.username)}</button>`:esc(p.username)} <small>${p.level?`Level ${p.level}`:''}</small></strong><small>${what(p)} · ${euro(p.amountCents)}${p.store==='google_play'?' · Google Play':p.store==='app_store'?' · App Store':''}${p.live?'':' · test'}</small></span><span class="admin-purchase-status ${cls}">${label}</span><small class="admin-when" title="${esc(fmtDate(p.createdAt))}">${ago(p.createdAt)}</small></li>`;}).join(''):'<li class="admin-empty">No checkouts here yet.</li>';
 }
 dialog.querySelectorAll('[data-purchase-filter]').forEach(b=>b.onclick=()=>{purchaseFilter=b.dataset.purchaseFilter;dialog.querySelectorAll('[data-purchase-filter]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});renderPurchases();});
 dialog.querySelector('#admin-purchase-list').addEventListener('click',event=>{const name=event.target.closest('[data-profile]');if(name)window.harvestProfiles?.open(name.dataset.profile,{back:null});});
 async function load(){
  const status=dialog.querySelector('#admin-dashboard-status');status.textContent='Refreshing…';
  void loadChat();void loadFeedback();
  // Every part loads on its own: one that fails leaves the others showing, and the line at the bottom says which one is missing.
  const PARTS=[['admin_online','Online now'],['admin_players','All players'],['admin_retention','Retention'],['admin_invites','Invites']];
  const [online,players,retention,invites]=await Promise.all(PARTS.map(([operation])=>bridge.request(operation==='admin_retention'?{operation,days:Number(view.retention)}:{operation}).catch(()=>null)));
  if(role==='admin')void showOffers();
  if(role==='admin')void showPartners();
  if(role==='admin')void loadSources();
  if(role==='admin')void bridge.request({operation:'admin_purchases'}).then(renderPurchases).catch(()=>{dialog.querySelector('#admin-purchase-list').innerHTML='<li class="admin-empty">Purchases could not be loaded.</li>';});
  if(players)showPlayers(players);
  if(online){await loadFaces(online.players.map(p=>p.playerId));renderOnline(online);}
  if(retention)renderRetention(retention);
  if(online&&retention)renderKpis(online,retention);
  if(invites)renderInvites(invites);
  const missing=PARTS.filter((_,i)=>![online,players,retention,invites][i]).map(([,name])=>name);
  status.textContent=missing.length?`${missing.join(', ')} could not be loaded. Please try again.`:`Updated ${clock(new Date().toISOString())} (Amsterdam time)`;
 }
 // Feedback & bugs: the open messages (the count on the tab), or the ones marked done; each with the farmer's name, the time
 // (Amsterdam), level, device and game language, and a Google Translate link like the chat's.
 let feedbackView='open';
 const FEEDBACK_KINDS={feedback:'Feedback',bug:'Bug',feature:'Feature request'};
 const languageName=code=>code?LANGUAGES.find(l=>l.code===code)?.name??code:null;
 const feedbackRow=f=>`<li>${avatar(f.name,false,f.playerId)}<span class="admin-recent-copy"><strong><button type="button" class="admin-log-name" data-profile="${esc(f.playerId)}">${esc(f.name??'A farmer')}</button> <b class="admin-feedback-kind is-${FEEDBACK_KINDS[f.kind]?f.kind:'feedback'}">${FEEDBACK_KINDS[f.kind]??'Feedback'}</b> <small>${esc(fmtDate(f.createdAt))}</small></strong>`
  +`<span class="admin-feedback-body">${esc(f.body)}</span><small class="admin-feedback-meta">${[f.level?`Level ${number(f.level)}`:null,deviceName(f.device),languageName(f.language)].filter(Boolean).map(esc).join(' · ')}${f.handledAt?` · done by ${esc(f.handledBy??'the staff')}, ${esc(fmtDate(f.handledAt))}`:''}</small>`
  +`<span class="admin-report-actions"><a class="small-button" href="${esc(translateLink(f.body,chosenLanguage()))}" target="_blank" rel="noopener noreferrer">Translate</a><button type="button" class="small-button" data-feedback-id="${esc(f.id)}" data-feedback-done="${f.handledAt?'0':'1'}">${f.handledAt?'Open again':'Done'}</button></span></span></li>`;
 async function loadFeedback(){
  const client=bridge.chat,list=dialog.querySelector('#admin-feedback-list');if(!client?.feedbackList||!role)return;
  try{
   const [open,done]=await Promise.all([client.feedbackList(false),feedbackView==='done'?client.feedbackList(true):null]);
   const count=dialog.querySelector('#admin-feedback-count');count.textContent=number(open.length);count.hidden=!open.length;
   const shown=done??open;await loadFaces(shown.map(f=>f.playerId));
   list.innerHTML=shown.length?shown.map(feedbackRow).join(''):`<li class="admin-empty">${feedbackView==='done'?'Nothing is marked done yet.':'No open messages. Everything is read.'}</li>`;
  }catch(error){list.innerHTML=`<li class="admin-empty">${esc(why(error))}</li>`;}
 }
 dialog.querySelectorAll('[data-feedback-filter]').forEach(b=>b.onclick=()=>{feedbackView=b.dataset.feedbackFilter;dialog.querySelectorAll('[data-feedback-filter]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on));});void loadFeedback();});
 dialog.querySelector('#admin-feedback-list').addEventListener('click',async event=>{
  const name=event.target.closest('[data-profile]');if(name){window.harvestProfiles?.open(name.dataset.profile,{back:null});return;}
  const mark=event.target.closest('[data-feedback-id]');if(!mark)return;
  mark.disabled=true;
  try{await bridge.chat.feedbackHandle(mark.dataset.feedbackId,mark.dataset.feedbackDone==='1');}catch(error){mark.disabled=false;mark.title=why(error);return;}
  void loadFeedback();
 });
 // The chat: open reports for the staff; news, moderators and chat levels for the admin.
 const ACTIONS={deleted:'Deleted',dismissed:'Nothing wrong',muted:'Muted',banned:'Banned from chat'};
 const verdict=r=>r.open?'<b class="admin-log-open">Open</b>':`<b class="admin-log-done">${esc(ACTIONS[r.action]??'Handled')}${r.handledBy?` · ${esc(r.handledBy)}`:''}</b>`;
 const where=channel=>channel==='global'?'Global chat':String(channel).startsWith('family:')?'Family chat':'Private message';
 // The farmers' pictures for the lists (kept between refreshes, so a list never flickers back to initials).
 // Asked again on every refresh, so a farmer who picks a new avatar shows it here too; your own shows at once.
 async function loadFaces(ids){try{const found=await bridge.chat?.faces?.(ids);if(found)faces=new Map([...faces,...found]);}catch{}}
 window.addEventListener('harvest-avatar-changed',event=>{const {playerId,avatarId}=event.detail??{};if(playerId&&avatarId)faces.set(playerId,avatarId);});
 // Who reported it (28 Sep 2026, supabase/chat-report-reporters.sql), with the reason they gave: a name opens that farmer's profile.
 // Only the staff see this; the farmer who was reported never learns who it was.
 const reportedBy=r=>r.reporters?.length?`<small class="admin-report-by">Reported by ${r.reporters.map(p=>`<button type="button" class="admin-log-name" data-profile="${esc(p.id)}">${esc(p.name??'A farmer')}</button>${p.reason?` (${esc(p.reason)})`:''}`).join(', ')}</small>`:'';
 async function loadChat(){
  const client=bridge.chat;if(!client||!role)return;
  const chatStatus=dialog.querySelector('#admin-chat-status');
  try{
   const reports=await client.reports();await loadFaces(reports.map(r=>r.sender));
   dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-count').textContent=number(reports.length);dialog.querySelector('#admin-kpi-reports').textContent=number(reports.length);
   dialog.querySelector('#admin-report-list').innerHTML=reports.length?reports.map(r=>`<li>${avatar(r.senderName,false,r.sender)}<span class="admin-recent-copy"><strong>${esc(r.senderName??'A farmer')} <small>${where(r.channel)} · ${number(r.reports)} report${r.reports===1?'':'s'}${r.present?'':' · already gone'}</small></strong><small class="admin-report-body">“${esc(r.body)}”</small>${reportedBy(r)}<span class="admin-report-actions">${r.present?`<button type="button" class="small-button" data-report="delete" data-id="${esc(r.messageId)}">Delete</button>`:''}<button type="button" class="small-button" data-report="mute" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Mute 1 day</button><button type="button" class="small-button" data-report="ban" data-id="${esc(r.messageId)}" data-player="${esc(r.sender)}">Ban from chat</button><button type="button" class="small-button" data-report="dismiss" data-id="${esc(r.messageId)}">Nothing wrong</button></span></span></li>`).join(''):'<li class="admin-empty">No open reports. The valley is friendly today.</li>';
  }catch(error){dialog.querySelector('#admin-reports').hidden=false;dialog.querySelector('#admin-report-list').innerHTML=`<li class="admin-empty">${esc(why(error))}</li>`;}
  try{
   const log=await client.reportLog();await loadFaces(log.map(r=>r.sender));dialog.querySelector('#admin-report-log').hidden=false;
   dialog.querySelector('#admin-log-list').innerHTML=log.length?log.map(r=>`<li>${avatar(r.senderName,false,r.sender)}<span class="admin-recent-copy"><strong><button type="button" class="admin-log-name" data-profile="${esc(r.sender)}">${esc(r.senderName??'A farmer')}</button> <small>${where(r.channel)} · ${number(r.reports)} report${r.reports===1?'':'s'}</small></strong><small class="admin-report-body">“${esc(r.body)}”</small>${reportedBy(r)}<small>${verdict(r)}</small></span><span class="admin-log-side"><small class="admin-when" title="${esc(fmtDate(r.lastAt))}">${ago(r.lastAt)}</small>${role==='admin'&&!r.open?`<button type="button" class="small-button" data-log-remove="${esc(r.messageId)}">Remove</button>`:''}</span></li>`).join(''):'<li class="admin-empty">No reports yet.</li>';
  }catch{}
  if(role!=='admin')return;
  // Send a gift: only the admins since 3 Oct 2026 (supabase/staff-gift-admin-only.sql); a moderator never sees the card.
  try{showRoom(await client.donationRoom());}catch{}
  dialog.querySelector('#admin-chat-settings').hidden=false;void showPopups();void showWelcome();
  // This device, as the installed app sees it (public/app-mode.js): to check the bottom of the screen on a real phone.
  const viewport=w=>{try{return w.harvestViewport??null;}catch{return null;}},page=viewport(window.parent),frame=viewport(window);
  dialog.querySelector('#admin-device').textContent=page?`This device: screen ${page.screen}, window ${page.window}, full-screen box ${page.fixed}, status bar ${page.statusBar}, strip ${page.shortfall}. Game: window ${frame?.window??'?'}, box ${frame?.fixed??'?'}, page strip ${frame?.strip??0}.`:'This device: not the installed app.';
  try{
   const [staff,overview]=await Promise.all([client.staffList(),chat?.whenReady?.()]);await loadFaces(staff.map(s=>s.playerId));
   dialog.querySelector('#admin-mod-list').innerHTML=staff.length?staff.map(s=>`<li>${avatar(s.name,false,s.playerId)}<span class="admin-recent-copy"><strong>${esc(s.name)}</strong><small>Moderator since ${esc(fmtDate(s.since))}</small></span></li>`).join(''):'<li class="admin-empty">No moderators yet.</li>';
   const levels=overview?.levels;
   if(levels&&document.activeElement?.closest?.('#admin-levels-form')==null){dialog.querySelector('#admin-level-global').value=levels.global;dialog.querySelector('#admin-level-dm').value=levels.dm;}
  }catch(error){chatStatus.textContent=why(error);}
 }
 dialog.querySelector('#admin-player-search').addEventListener('input',event=>{view.search=event.target.value;view.shown=60;renderPlayers();});
 dialog.querySelector('#admin-player-sort').addEventListener('change',event=>{view.sort=event.target.value;renderPlayers();});
 dialog.querySelectorAll('[data-player-filter]').forEach(b=>b.onclick=()=>{view.filter=b.dataset.playerFilter;view.shown=60;pressed(dialog.querySelectorAll('[data-player-filter]'),b);renderPlayers();});
 // The retention period: only the latest choice is drawn when the answers come back out of order.
 let retentionAsk=0;
 dialog.querySelectorAll('[data-retention-period]').forEach(b=>b.onclick=async()=>{
  view.retention=b.dataset.retentionPeriod;pressed(dialog.querySelectorAll('[data-retention-period]'),b);const ask=++retentionAsk;
  dialog.querySelector('#admin-retention-body').innerHTML='<tr><td colspan="10" class="admin-empty">Loading…</td></tr>';
  try{const data=await bridge.request({operation:'admin_retention',days:Number(view.retention)});if(ask===retentionAsk)renderRetention(data);}
  catch(error){if(ask===retentionAsk)dialog.querySelector('#admin-retention-body').innerHTML=`<tr><td colspan="10" class="admin-empty">${esc(why(error))}</td></tr>`;}
 });
 // Where new farmers come from (the admin only): one database call per period; only the latest choice is drawn.
 let sourceAsk=0;
 async function loadSources(){
  const body=dialog.querySelector('#admin-source-body'),ask=++sourceAsk;dialog.querySelector('#admin-sources').hidden=false;
  try{const data=await bridge.request({operation:'admin_sources',days:Number(view.sources)});if(ask===sourceAsk)body.innerHTML=sourcesHtml(data);}
  catch(error){if(ask===sourceAsk)body.innerHTML=`<tr><td colspan="9" class="admin-empty">${esc(why(error))}</td></tr>`;}
 }
 dialog.querySelectorAll('[data-source-period]').forEach(b=>b.onclick=()=>{view.sources=b.dataset.sourcePeriod;pressed(dialog.querySelectorAll('[data-source-period]'),b);dialog.querySelector('#admin-source-body').innerHTML='<tr><td colspan="9" class="admin-empty">Loading…</td></tr>';void loadSources();});
 dialog.querySelectorAll('[data-funnel-period]').forEach(b=>b.onclick=()=>{view.period=b.dataset.funnelPeriod;pressed(dialog.querySelectorAll('[data-funnel-period]'),b);renderFunnel();});
 dialog.querySelector('#admin-player-more').onclick=()=>{view.shown+=60;renderPlayers();};
 dialog.querySelector('[data-admin-panel="players"]').addEventListener('click',event=>{
  const row=event.target.closest('[data-player]');if(row){void openPlayer(row.dataset.player);return;}
  if(event.target.closest('[data-player-back]')){closePlayer();return;}
  const giftButton=event.target.closest('[data-gift-player]');if(giftButton){const p=view.players.find(x=>x.playerId===giftButton.dataset.giftPlayer);if(p)giftTo(p);return;}
  const profile=event.target.closest('[data-open-profile]');if(profile)window.harvestProfiles?.open(profile.dataset.openProfile,{back:null});
  // Edit: the same profile, straight to its Admin gift (any amount, XP, crops and goods; Send a gift has daily limits).
  const edit=event.target.closest('[data-edit-player]');if(edit)window.harvestProfiles?.open(edit.dataset.editPlayer,{back:null,gift:true});
  // Email (the admin only): Change opens a small form under Account; Cancel closes it.
  const form=dialog.querySelector('[data-email-form]');
  if(event.target.closest('[data-email-edit]')&&form){form.hidden=false;form.querySelector('input').focus();return;}
  if(event.target.closest('[data-email-cancel]')&&form){form.hidden=true;return;}
 });
 dialog.querySelector('[data-admin-panel="players"]').addEventListener('submit',async event=>{
  const form=event.target.closest('[data-email-form]');if(!form)return;event.preventDefault();
  const id=view.detail,email=form.querySelector('input').value.trim(),status=form.querySelector('[data-email-status]'),name=dialog.querySelector('.admin-detail-head h3')?.textContent?.trim()||'this farmer';
  if(!id||!email)return;
  if(!await confirmAction({title:'Change the email address?',description:`${name} signs in with ${email} from now on. No email is sent.`,confirmLabel:'Change',cancelLabel:'Cancel',picture:'letter'}))return;
  form.querySelectorAll('button,input').forEach(el=>el.disabled=true);status.textContent='Saving…';
  try{await bridge.request({operation:'admin_email',playerId:id,email});if(view.detail===id)await openPlayer(id);}
  catch(error){status.textContent=why(error);form.querySelectorAll('button,input').forEach(el=>el.disabled=false);}
 });
 // A name in the log opens that farmer's profile (with the chat buttons: mute, ban), on top of the dashboard.
 // The admin can take a handled report out of the log; an open one is handled under Chat reports first.
 dialog.querySelector('#admin-log-list').addEventListener('click',async event=>{
  const name=event.target.closest('[data-profile]');if(name){window.harvestProfiles?.open(name.dataset.profile,{back:null});return;}
  const remove=event.target.closest('[data-log-remove]');if(!remove)return;
  if(!await confirmAction({title:'Remove from the report log?',description:'Every report of this message goes for good, also from the farmer\'s report count. The message itself stays as it is.',confirmLabel:'Remove',tone:'danger'}))return;
  remove.disabled=true;
  try{await bridge.chat.reportLogRemove(remove.dataset.logRemove);const row=remove.closest('li'),list=row.parentElement;row.remove();if(!list.children.length)list.innerHTML='<li class="admin-empty">No reports yet.</li>';}
  catch(error){remove.disabled=false;remove.nextElementSibling?.remove();remove.insertAdjacentHTML('afterend',`<small class="admin-log-error">${esc(why(error))}</small>`);}
 });
 dialog.querySelector('#admin-invite-list').addEventListener('click',event=>{const name=event.target.closest('[data-profile]');if(name)window.harvestProfiles?.open(name.dataset.profile,{back:null});});
 dialog.querySelector('#admin-report-list').addEventListener('click',async event=>{
  const name=event.target.closest('[data-profile]');if(name){window.harvestProfiles?.open(name.dataset.profile,{back:null});return;}
  const action=event.target.closest('[data-report]');if(!action||!bridge.chat)return;
  const {report:kind,id,player}=action.dataset;action.disabled=true;
  try{
   if(kind==='delete')await bridge.chat.deleteMessage(id);
   else if(kind==='dismiss')await bridge.chat.dismissReports(id);
   else await bridge.chat.sanction(player,kind==='mute'?1440:0,kind==='ban');
   await loadChat();
  }catch(error){action.disabled=false;dialog.querySelector('#admin-dashboard-status').textContent=why(error);}
 });
 // A gift from the admins (only they since 3 Oct 2026, supabase/staff-gift-admin-only.sql), to everyone, the farmers active this
 // week, the farmers online now or one farmer (the database decides the list when it is sent). Both admins together give at most
 // 5 gifts, 50 diamonds and 1,000 coins or 50 coins per level a day (the database keeps count).
 // Coins: a fixed amount (at most 1,000 a day) or an amount per level (at most 50 a day), which each farmer gets times their level
 // (28 Sep 2026, supabase/staff-gift-per-level.sql), so a late farm gets a gift that still counts.
 const gift={audience:'all',player:null,perLevel:false};
 function paintCoins(){
  dialog.querySelectorAll('[data-coin-kind]').forEach(b=>{const on=(b.dataset.coinKind==='level')===gift.perLevel;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  const input=dialog.querySelector('#admin-donate-coins'),per=Math.max(0,Math.floor(Number(input.value)||0));
  input.max=gift.perLevel?'50':'1000';input.step=gift.perLevel?'5':'10';dialog.querySelector('#admin-donate-coins-label').textContent=gift.perLevel?'Coins per level':'Coins';
  dialog.querySelector('#admin-donate-preview').textContent=!gift.perLevel?'Every farmer gets the same.'
   :per?`Level 5 gets ${number(5*per)}, level 25 gets ${number(25*per)}, level 80 gets ${number(80*per)} coins.`:'Times their level: 20 per level is about one daily gift.';
 }
 function showRoom(room,sent=''){
  dialog.querySelector('#admin-donate').hidden=false;
  dialog.querySelector('#admin-donate-room').textContent=`${sent}Left today, for both admins together: ${number(room.diamonds)} diamonds, ${number(room.coins)} coins${room.perLevel!=null?`, ${number(room.perLevel)} coins per level`:''}, ${number(room.gifts)} gift${room.gifts===1?'':'s'}. Farmers get it the next time their farm opens (open games at once), and see it under Notifications.`;
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
 // From a farmer's page: back to the list first, since the gift card waits behind that page.
 function giftTo(player){closePlayer();gift.audience='player';gift.player=player;dialog.querySelector('#admin-gift-search').value='';paintGift();dialog.querySelector('#admin-donate').scrollIntoView({behavior:'smooth',block:'start'});}
 dialog.querySelector('#admin-donate').addEventListener('click',event=>{
  const kind=event.target.closest('[data-coin-kind]');if(kind){gift.perLevel=kind.dataset.coinKind==='level';paintCoins();return;}
  const choice=event.target.closest('[data-gift-audience]');if(choice){gift.audience=choice.dataset.giftAudience;paintGift();if(gift.audience==='player'&&!gift.player)dialog.querySelector('#admin-gift-search').focus();return;}
  const pick=event.target.closest('[data-gift-pick]');if(pick){gift.player=view.players.find(p=>p.playerId===pick.dataset.giftPick)??null;dialog.querySelector('#admin-gift-search').value='';paintGift();}
 });
 dialog.querySelector('#admin-gift-search').addEventListener('input',paintGift);
 dialog.querySelector('#admin-donate-coins').addEventListener('input',paintCoins);
 // Enter in the name box picks the first farmer found, instead of sending the form.
 dialog.querySelector('#admin-gift-search').addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();const first=giftMatches(view.players,event.target.value)[0];if(first){gift.player=first;event.target.value='';paintGift();}});
 dialog.querySelector('#admin-donate-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!bridge.chat)return;
  const diamonds=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-diamonds').value)||0)),coins=Math.max(0,Math.floor(Number(dialog.querySelector('#admin-donate-coins').value)||0));
  const message=dialog.querySelector('#admin-donate-message').value.trim(),room=dialog.querySelector('#admin-donate-room');
  if(!diamonds&&!coins){room.textContent='Enter some diamonds or coins.';return;}
  if(gift.audience==='player'&&!gift.player){room.textContent='Choose the farmer who gets the gift.';return;}
  const parts=[diamonds&&`${number(diamonds)} diamonds`,coins&&`${number(coins)} coins${gift.perLevel?' for every level':''}`].filter(Boolean).join(' + ');
  const count=view.players?.length?giftCount(view.players,gift.audience):null;
  const to=gift.audience==='player'?gift.player.username:gift.audience==='active'?`the ${count==null?'':`${number(count)} `}farmers active this week`:gift.audience==='online'?`the ${count==null?'':`${number(count)} `}farmers online now`:'everyone';
  const who=gift.audience==='player'?`${gift.player.username} receives`:gift.audience==='all'?'Every farmer receives':'Each of them receives';
  if(!await confirmAction({title:`Send a gift to ${to}?`,description:`${who} ${parts}.${message?` “${message}”`:''}`,confirmLabel:'Send',picture:'gift'}))return;
  try{
   const result=await bridge.chat.donate(coins,diamonds,message||null,gift.audience,gift.audience==='player'?gift.player.playerId:null,gift.perLevel);
   showRoom(result,result.farmers==null?'Sent to everyone. ':`Sent to ${number(result.farmers)} farmer${result.farmers===1?'':'s'}. `);
   dialog.querySelector('#admin-donate-diamonds').value='';dialog.querySelector('#admin-donate-coins').value='';dialog.querySelector('#admin-donate-message').value='';paintCoins();
  }catch(error){room.textContent=why(error);}
 });
 // Pop-ups: the fields open with "Also as a pop-up", the web address with "A web page"; below the form the last ten, with who saw them.
 dialog.querySelector('#admin-send-as').addEventListener('change',event=>{const mode=event.target.value;dialog.querySelector('#admin-popup-fields').hidden=mode==='news'||mode==='dm';dialog.querySelector('#admin-dm-fields').hidden=mode!=='dm';dialog.querySelector('#admin-news-hours-row').hidden=mode==='dm';dialog.querySelector('#admin-news-level-row').hidden=mode!=='news';if(mode==='dm'){void countDm();void showDmLog();}});
 // How many farmers a private message to all would reach right now.
 async function countDm(){
  const note=dialog.querySelector('#admin-dm-count'),minLevel=dmLevel(),ask=++dmCounting;note.textContent='Counting farmers…';delete note.dataset.count;
  // Only the latest count shows (typing a level asks again for every digit).
  // With the filters while the database has them (8 Oct 2026); without (null), the old choice and the old count.
  try{
   let n=groupFilters===false?null:await bridge.chat.broadcastGroup({filters:dmFilters()});if(ask!==dmCounting)return;
   if(n===null){showGroupFilters(false);n=await bridge.chat.broadcastDm({audience:dialog.querySelector('#admin-dm-audience').value,minLevel});if(ask!==dmCounting)return;}else groupFilters=true;
   note.textContent=`Goes to ${n.toLocaleString('en-US')} farmer${n===1?'':'s'}.`;note.dataset.count=String(n);
  }catch(error){if(ask===dmCounting)note.textContent=why(error);}
 }
 // A group message's filters (8 Oct 2026, supabase/chat-group-filters.sql), all together: only what narrows it down goes (the database
 // checks them again), the same filters the farmers' line shows. groupFilters: null until the first count, false without that file.
 let groupFilters=null;
 const $dm=id=>dialog.querySelector(`#admin-dm-${id}`);
 function dmFilters(){
  const f={},active=$dm('audience').value,minLevel=dmLevel(),max=$dm('max-level').value.trim();
  if(active!=='all')f.active=active;if(minLevel>1)f.minLevel=minLevel;
  if(max){const n=Math.min(200,Math.max(1,Math.round(Number(max)||1)));if(n<200)f.maxLevel=n;}
  for(const key of ['platform','notPlatform','language','family'])if($dm(key).value)f[key]=$dm(key).value;
  if($dm('crazygames').checked)f.crazygames=true;
  if($dm('kongregate').checked)f.kongregate=true;
  return f;
 }
 // Before that file: no filters but the old choice (a hidden option is still picked in Safari, so it is switched off too).
 function showGroupFilters(on){
  groupFilters=on;dialog.querySelectorAll('#admin-dm-fields [data-group-filter]').forEach(el=>{el.hidden=!on;if(el.tagName==='OPTION')el.disabled=!on;});
  if(!on&&$dm('audience').value==='month')$dm('audience').value='week';
 }
 // The last group messages: the text, who they went to (the pills the farmers see, src/chat-ui.js), how many farmers and how many replied.
 async function showDmLog(){
  const list=$dm('log'),head=$dm('log-head');let rows=[];
  try{rows=await bridge.chat.broadcastLog?.()??[];}catch{rows=[];}
  if(!Array.isArray(rows))rows=[];list.hidden=head.hidden=!rows.length;
  list.innerHTML=rows.map(b=>`<li><span class="admin-recent-copy"><strong>“${esc(b.body)}”</strong><small>${esc(groupPills(b.filters).join(', '))}</small><small>${number(b.recipients)} farmer${b.recipients===1?'':'s'}, ${number(b.replies)} replied${b.senderName?`, from ${esc(b.senderName)}`:''}, ${esc(fmtDate(b.sentAt))}</small></span></li>`).join('');
 }
 // From a farm level too (supabase/chat-broadcast-level.sql), e.g. level 14 for the farmers who can buy the special offer.
 // News from a level (4 Oct 2026): 1 is everyone.
 const newsLevel=()=>Math.min(200,Math.max(1,Math.round(Number(dialog.querySelector('#admin-news-level').value)||1)));
 let dmCounting=0;const dmLevel=()=>Math.min(200,Math.max(1,Math.round(Number(dialog.querySelector('#admin-dm-level').value)||1)));
 for(const id of ['audience','platform','notPlatform','language','family','crazygames','kongregate'])dialog.querySelector(`#admin-dm-${id}`).addEventListener('change',()=>void countDm());
 for(const id of ['level','max-level'])dialog.querySelector(`#admin-dm-${id}`).addEventListener('input',()=>void countDm());
 dialog.querySelector('#admin-popup-target').addEventListener('change',event=>{dialog.querySelector('#admin-popup-link-row').hidden=event.target.value!=='link';});
 // News, pop-ups and the private message per language: the text, the title and the button. Each language keeps what was typed for it
 // until the message goes; the English parts show in the empty fields of another language, as what to translate.
 let newsTexts={},newsLanguage='en';
 const newsFields=()=>({body:dialog.querySelector('#admin-news-text'),title:dialog.querySelector('#admin-popup-title'),buttonLabel:dialog.querySelector('#admin-popup-label')});
 function keepNewsLanguage(){newsTexts[newsLanguage]=Object.fromEntries(Object.entries(newsFields()).map(([key,field])=>[key,field.value.trim()]));}
 function showNewsLanguage(){
  const en=newsTexts.en??{},own=newsTexts[newsLanguage]??{},name=LANGUAGES.find(l=>l.code===newsLanguage)?.name??newsLanguage;
  for(const [key,field] of Object.entries(newsFields())){field.dataset.placeholder??=field.placeholder;field.value=own[key]??'';field.placeholder=newsLanguage==='en'?field.dataset.placeholder:en[key]||field.dataset.placeholder;}
  for(const option of dialog.querySelectorAll('#admin-news-language option')){
   const l=LANGUAGES.find(x=>x.code===option.value),has=Object.values(newsTexts[l.code]??{}).some(Boolean);
   option.textContent=l.code==='en'?`${l.name} · everyone else`:`${l.name}${has?' ✓':' · English for now'}`;
  }
  dialog.querySelector('#admin-news-language-note').textContent=newsLanguage==='en'?'Farmers whose game language has no text of its own get the English one.':`Farmers who play in ${name} get this text. A part left empty stays English.`;
 }
 // The other languages' parts that were written, for the server.
 const newsOwnTexts=()=>{const texts=Object.entries(newsTexts).filter(([code,t])=>code!=='en'&&Object.values(t).some(Boolean)).map(([code,t])=>[code,Object.fromEntries(Object.entries(t).filter(([,v])=>v))]);return texts.length?Object.fromEntries(texts):null;};
 dialog.querySelector('#admin-news-language').addEventListener('change',event=>{keepNewsLanguage();newsLanguage=event.target.value;showNewsLanguage();});
 showNewsLanguage();
 // The welcome message: its setting, and how many new farmers got it.
 function welcomeStatus(w){
  const last=w.lastSentAt?` · last one ${new Date(w.lastSentAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'';
  return `${w.enabled?'On':'Off'} · sent to ${Number(w.sent??0).toLocaleString('en-US')} new farmer${w.sent===1?'':'s'}${last}`;
 }
 // Per language: English is the text for everyone whose language has none of its own. The list marks which have one.
 let welcome={body:'',texts:{}};
 const welcomeLanguage=()=>dialog.querySelector('#admin-welcome-language').value;
 function showWelcomeLanguage(){
  const code=welcomeLanguage(),name=LANGUAGES.find(l=>l.code===code)?.name??code,own=welcome.texts?.[code];
  for(const option of dialog.querySelectorAll('#admin-welcome-language option')){
   const l=LANGUAGES.find(x=>x.code===option.value);
   option.textContent=l.code==='en'?`${l.name} · everyone else`:`${l.name}${welcome.texts?.[l.code]?' ✓':' · English for now'}`;
  }
  const text=dialog.querySelector('#admin-welcome-text');
  text.value=code==='en'?welcome.body??'':own??'';
  text.placeholder=code==='en'?'Hi {name}, welcome to Harvest Tycoon!':welcome.body??'';
  dialog.querySelector('#admin-welcome-language-note').textContent=code==='en'
   ?'Farmers whose game language has no text of its own get this one.'
   :own?`Farmers who play in ${name} get this text. Empty it and save to send them the English one.`
   :`No text of its own yet: farmers who play in ${name} get the English one.`;
 }
 dialog.querySelector('#admin-welcome-language').addEventListener('change',showWelcomeLanguage);
 // Who it comes from: the admins the database lists (welcome_dm_get senders); hidden while the database does not list them yet.
 function showWelcomeSender(w){
  const from=dialog.querySelector('#admin-welcome-from'),select=dialog.querySelector('#admin-welcome-sender'),list=Array.isArray(w?.senders)?w.senders:[];
  from.hidden=list.length<2;
  select.innerHTML=list.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
  if(w?.sender)select.value=w.sender;
 }
 async function showWelcome(){
  const form=dialog.querySelector('#admin-welcome-form');if(!bridge.chat?.welcomeGet)return;
  try{
   const w=await bridge.chat.welcomeGet();form.hidden=false;welcome={...w,texts:w.texts??{}};
   dialog.querySelector('#admin-welcome-on').checked=!!w.enabled;showWelcomeLanguage();showWelcomeSender(w);
   const delay=dialog.querySelector('#admin-welcome-delay');delay.value=String(w.delayMinutes??3);if(delay.value!==String(w.delayMinutes??3))delay.value='3';
   dialog.querySelector('#admin-welcome-status').textContent=welcomeStatus(w);
  }catch(error){form.hidden=false;dialog.querySelector('#admin-welcome-status').textContent=why(error);}
 }
 dialog.querySelector('#admin-welcome-form').addEventListener('submit',async event=>{
  event.preventDefault();const status=dialog.querySelector('#admin-welcome-status');
  try{
   const code=welcomeLanguage(),text=dialog.querySelector('#admin-welcome-text').value.trim();
   const from=dialog.querySelector('#admin-welcome-from'),sender=from.hidden?undefined:dialog.querySelector('#admin-welcome-sender').value||undefined;
   let w=await bridge.chat.welcomeSave({enabled:dialog.querySelector('#admin-welcome-on').checked,body:code==='en'?text:welcome.body,delay:Number(dialog.querySelector('#admin-welcome-delay').value),sender});
   if(code!=='en')w=await bridge.chat.welcomeSaveText({language:code,body:text});
   welcome={...w,texts:w.texts??{}};showWelcomeLanguage();showWelcomeSender(w);
   status.textContent=`Saved${code==='en'?'':` (${LANGUAGES.find(l=>l.code===code)?.name})`}. ${welcomeStatus(w)}`;
  }catch(error){status.textContent=why(error);}
 });
 // Special offer: the amounts, their worth as the checkout counts it (game/payments.js), a preview, posting and the list.
 const $o=id=>dialog.querySelector(`#admin-offer-${id}`);
 const offerDraft=()=>({diamonds:$o('has-diamonds').checked?Math.max(0,Math.round(Number($o('diamonds').value)||0)):0,coins:$o('has-coins').checked?Math.max(0,Math.round(Number($o('coins').value)||0)):0,vipDays:Number($o('vip').value)||0});
 const offerText=o=>[o.diamonds>0&&`${number(o.diamonds)} diamonds`,o.coins>0&&`${number(o.coins)} coins`,o.vipDays>0&&`VIP ${o.vipDays} days`].filter(Boolean).join(' + ')||'Nothing yet';
 function offerWorth(){
  const o=offerDraft(),problem=offerProblem(o),line=$o('worth');
  $o('diamonds').disabled=!$o('has-diamonds').checked;$o('coins').disabled=!$o('has-coins').checked;
  line.textContent=problem??`${offerText(o)} · worth ${euro(offerValueCents(o))} · sells for ${euro(OFFER.cents)}`;line.classList.toggle('is-wrong',Boolean(problem));
  dialog.querySelector('#admin-offer-form [type="submit"]').disabled=Boolean(problem);$o('preview').disabled=Boolean(problem);
 }
 function offerRefill(){const o=offerFill({diamonds:$o('has-diamonds').checked,coins:$o('has-coins').checked,vipDays:Number($o('vip').value)||0});$o('diamonds').value=o.diamonds||'';$o('coins').value=o.coins||'';offerWorth();}
 ['has-diamonds','has-coins','vip'].forEach(id=>$o(id).addEventListener('change',offerRefill));
 ['diamonds','coins'].forEach(id=>$o(id).addEventListener('input',offerWorth));
 offerRefill();
 $o('preview').onclick=()=>window.harvestOffer?.preview({...offerDraft(),hours:Number($o('hours').value)});
 async function showOffers(){
  const list=$o('list');if(!bridge.chat?.offerList)return;
  try{
   const offers=await bridge.chat.offerList();list.hidden=!offers.length;
   list.innerHTML=offers.map(o=>`<li><span class="admin-recent-copy"><strong>${esc(offerText(o))}</strong><small>${esc(POPUP_AUDIENCES[o.audience]??o.audience)} · from level ${o.minLevel} · ${o.active?`until ${fmtDate(o.endsAt)}`:'ended'} · bought by ${number(o.bought)} farmer${o.bought===1?'':'s'}</small></span>${o.active?`<button type="button" class="small-button" data-offer-stop="${esc(o.id)}">Stop</button>`:''}</li>`).join('');
  }catch{list.hidden=true;}
 }
 $o('list').addEventListener('click',async event=>{
  const stop=event.target.closest('[data-offer-stop]');if(!stop)return;
  if(!await confirmAction({title:'Stop this offer?',description:'Farmers can no longer buy it. Anyone who already paid keeps what they bought.',confirmLabel:'Stop',tone:'danger'}))return;
  try{await bridge.chat.stopOffer(stop.dataset.offerStop);}catch(error){$o('status').textContent=why(error);}
  void showOffers();
 });
 $o('form').addEventListener('submit',async event=>{
  event.preventDefault();const o=offerDraft();if(offerProblem(o))return;
  const hours=Number($o('hours').value),time=$o('hours').options[$o('hours').selectedIndex].text;
  if(!await confirmAction({title:'Start this offer?',description:`${offerText(o)} for ${euro(OFFER.cents)}, for ${time}, from level ${$o('level').value}. It replaces the offer running now.`,confirmLabel:'Start',cancelLabel:'Cancel',picture:'diamonds'}))return;
  try{await bridge.chat.postOffer({...o,audience:$o('audience').value,minLevel:Number($o('level').value)||14,hours});$o('status').textContent='The offer is running. Farmers see it the next time they open the game.';}
  catch(error){$o('status').textContent=why(error);}
  void showOffers();
 });
 async function showPopups(){
  const list=dialog.querySelector('#admin-popup-list');
  try{
   const popups=await bridge.chat.popupList();list.hidden=!popups.length;
   list.innerHTML=popups.map(p=>`<li><span class="admin-recent-copy"><strong>${esc(p.title)}</strong><small>${esc(POPUP_AUDIENCES[p.audience]??p.audience)}${p.minLevel>1?` · from level ${p.minLevel}`:''} · seen by ${number(p.seen)} farmer${p.seen===1?'':'s'}</small></span>${p.active?`<button type="button" class="small-button" data-popup-stop="${esc(p.id)}">Stop</button>`:'<small class="admin-popup-ended">Ended</small>'}</li>`).join('');
  }catch{list.hidden=true;}
 }
 dialog.querySelector('#admin-popup-list').addEventListener('click',async event=>{
  const stop=event.target.closest('[data-popup-stop]');if(!stop)return;
  if(!await confirmAction({title:'Stop this pop-up?',description:'Farmers who have not seen it yet will not get it. The news stays in Notifications.',confirmLabel:'Stop',tone:'danger'}))return;
  try{await bridge.chat.stopPopup(stop.dataset.popupStop);}catch(error){dialog.querySelector('#admin-chat-status').textContent=why(error);}
  void showPopups();
 });
 dialog.querySelector('#admin-news-form').addEventListener('submit',async event=>{
  event.preventDefault();const chatStatus=dialog.querySelector('#admin-chat-status');
  keepNewsLanguage();const en=newsTexts.en??{},body=en.body??'',texts=newsOwnTexts(),languages=texts?` in ${Object.keys(texts).length+1} languages`:'';
  if(!body){chatStatus.textContent=newsLanguage==='en'?'':'Write the English text first: farmers in every other language get it.';return;}
  const sent=()=>{newsTexts={};newsLanguage='en';dialog.querySelector('#admin-news-language').value='en';showNewsLanguage();};
  const hours=Number(dialog.querySelector('#admin-news-hours').value)||0;
  const mode=dialog.querySelector('#admin-send-as').value,popup=mode==='popup'||mode==='both',$p=id=>dialog.querySelector(`#admin-popup-${id}`);
  try{
   if(mode==='dm'){
    const audience=dialog.querySelector('#admin-dm-audience'),n=Number(dialog.querySelector('#admin-dm-count').dataset.count??0),who=audience.options[audience.selectedIndex].text.toLowerCase(),minLevel=dmLevel();
    // With filters (8 Oct 2026): the question names them as the farmers' line will; without that file in the database, as before.
    const filters=dmFilters(),group=groupFilters!==false;
    const description=group?`Sent to: ${groupPills(filters).join(', ')}. They get “${body}” from you${languages} and can reply. Above it they read “Group message from the team” and who it was sent to.`:`Every farmer${audience.value==='all'?'':` ${who}`}${minLevel>1?` from level ${minLevel}`:''} gets “${body}” from you${languages} and can reply.`;
    if(!await confirmAction({title:`Send a private message to ${n.toLocaleString('en-US')} farmers?`,description,confirmLabel:'Send',cancelLabel:'Cancel',picture:'bell'}))return;
    const reached=group?await bridge.chat.broadcastGroup({body,filters,send:true,texts}):await bridge.chat.broadcastDm({body,audience:audience.value,send:true,minLevel,texts});
    // No filters in the database after all (sent before the first count came back): nothing went; the old choice shows, to check.
    if(reached===null){showGroupFilters(false);void countDm();chatStatus.textContent='Not sent: the database has no group filters yet. Check who gets it and send again.';return;}
    sent();void showDmLog();chatStatus.textContent=`Sent to ${reached.toLocaleString('en-US')} farmers${languages}. Their replies come in under your private messages.`;return;
   }
   if(popup){
    const label=en.buttonLabel??'',target=$p('target').value==='link'?$p('link').value.trim():$p('target').value;
    await bridge.chat.postPopup({title:en.title??'',body,buttonLabel:label||null,buttonTarget:label?target:null,audience:$p('audience').value,minLevel:Number($p('level').value)||1,hours,news:mode==='both',texts});
    $p('link').value='';dialog.querySelector('#admin-send-as').value='news';$p('fields').hidden=true;void showPopups();
   }else await bridge.chat.postNews(body,hours,texts,newsLevel());
   const span=hours?` for ${hours>=48&&hours%24===0?`${hours/24} days`:`${hours} hours`}`:'',from=mode==='news'&&newsLevel()>1?newsLevel():mode==='both'&&Number($p('level').value)>1?Number($p('level').value):0;
   sent();chatStatus.textContent=mode==='popup'?`Sent as a pop-up${span}${languages}.`:`Sent${mode==='both'?' as a notification and a pop-up':''}${languages}. ${from?`Farmers from level ${from}`:'Everyone'} see${from?'':'s'} it under Notifications${span}.`;
  }catch(error){chatStatus.textContent=why(error);}
 });
 dialog.querySelector('#admin-levels-form').addEventListener('submit',async event=>{
  event.preventDefault();const chatStatus=dialog.querySelector('#admin-chat-status');
  const global=Math.round(Number(dialog.querySelector('#admin-level-global').value)),dm=Math.round(Number(dialog.querySelector('#admin-level-dm').value));
  try{await bridge.chat.setLevels(global,dm);chatStatus.textContent=`Saved: global chat from level ${global}, private messages from level ${dm}.`;}catch(error){chatStatus.textContent=why(error);}
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
 // One tab of the dashboard, opened from elsewhere (3 Oct 2026, the admin view's topbar, src/admin-view.js): its online count opens the
 // Players tab at Online now, its open reports the Chat tab with the reports.
 function open(tab='chat'){
  if(!role)return;
  if(!dialog.open)openDashboard();
  showTab(dialog.querySelector(`[data-admin-tab="${tab}"]:not([hidden])`)?tab:'chat');
  if(tab==='players')dialog.querySelector('#admin-online-list')?.closest('.admin-card')?.scrollIntoView?.({block:'start'});
 }
 window.harvestStaff={role:()=>role,showFarmer,open};
 // For the admin (checked by e-mail, as before) and the moderators (their role comes with the chat). Phones hide the topbar
 // icons, so the same dashboard also gets a card at the end of the More menu. The server checks every request again.
 let role=null;
 Promise.all([checkAdmin(),chat?.whenReady?.().then(overview=>overview?.role??null).catch(()=>null)]).then(([admin,chatRole])=>{
  role=admin||chatRole==='admin'?'admin':chatRole==='moderator'?'moderator':null;if(!role)return;
  dialog.querySelector('#admin-dashboard-eyebrow').textContent=role==='admin'?'ONLY FOR YOU':'FOR THE MODERATORS';
  dialog.querySelector('#admin-dashboard-title').textContent=role==='admin'?'Admin dashboard':'Moderator dashboard';
  dialog.querySelector('[data-admin-tab="settings"]').hidden=role!=='admin';dialog.querySelector('[data-admin-tab="purchases"]').hidden=role!=='admin';
  button.hidden=false;const entry=document.getElementById('admin-menu-entry');if(entry)entry.hidden=false;
 });
 return {};
}
