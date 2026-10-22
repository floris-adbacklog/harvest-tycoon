// The Admin dashboard restructured and refreshed (22 Oct 2026, the owner picked option 2 for "Upgrade het admin dashboard qua UX/UI"):
// eight tabs (Overview, Players, Growth, Money, Chat, Feedback, Messages, Settings), a moderator sees Players, Chat and Feedback only and
// the dashboard asks for nothing else for them, an Overview with today's numbers (UTC) and quick actions for the admin, a name search
// at the top on every tab, the game's own look (public/admin-dashboard.css) and no eyebrow line, no middle dots on screen.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TABS,STAFF_TABS,ADMIN_TABS,tabsFor,firstTab,PARTS,partsFor,QUICK_ACTIONS,earned,feedbackToday,dayOne,overviewTiles,searchPlayers,euro} from '../src/admin-overview.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dash=read('src/admin-dashboard.js'),css=read('public/admin-dashboard.css');
const HOUR=3600000,DAY=24*HOUR,iso=ms=>new Date(ms).toISOString();
// 22 Oct 2026, 15:00 UTC: midnight UTC was 15 hours ago.
const now=Date.UTC(2026,9,22,15);

// Which tab a card sits on: the last panel opened before its id in the dashboard's markup (and the two cards the modules add).
function panelOf(id){
 const at=dash.indexOf(`id="${id}"`);assert.ok(at>0,id);
 const before=[...dash.slice(0,at).matchAll(/data-admin-panel="(\w+)"/g)];return before.at(-1)[1];
}

test('the tabs: eight in the owner\'s order, Feedback next to Chat; the moderators get Players, Chat and Feedback',()=>{
 assert.deepEqual(TABS,['overview','players','growth','money','chat','feedback','messages','settings']);
 assert.deepEqual([...dash.matchAll(/data-admin-tab="(\w+)" aria-label/g)].map(m=>m[1]),[...TABS],'the markup has them in that order');
 assert.deepEqual([...dash.matchAll(/<div data-admin-panel="(\w+)"/g)].map(m=>m[1]),[...TABS],'one panel per tab, in the same order');
 assert.deepEqual(STAFF_TABS,['players','chat','feedback']);
 assert.deepEqual(ADMIN_TABS,['overview','growth','money','messages','settings']);
 assert.deepEqual(tabsFor('admin'),[...TABS]);assert.deepEqual(tabsFor('moderator'),['players','chat','feedback']);assert.deepEqual(tabsFor(null),[]);
 assert.equal(firstTab('admin'),'overview');assert.equal(firstTab('moderator'),'chat','a moderator comes for the chat');
 // Hidden for a moderator, and a tab they may not see is never shown, whoever asks for it (the profile, the admin view's topbar).
 assert.match(dash,/for\(const tab of ADMIN_TABS\)dialog\.querySelector\(`\[data-admin-tab="\$\{tab\}"\]`\)\.hidden=role!=='admin';\n  showTab\(firstTab\(role\)\);/);
 assert.match(dash,/function showTab\(name\)\{\n  if\(!tabsFor\(role\)\.includes\(name\)\)name=firstTab\(role\);/);
 assert.match(dash,/showTab\(tabsFor\(role\)\.includes\(tab\)\?tab:firstTab\(role\)\);/,'open(tab) from the admin view');
 // On a moderator's three tabs, the chat first.
 assert.match(css,/#admin-dashboard-dialog\[data-role="moderator"\] \[data-admin-tab="chat"\]\{order:1\}/);
});

test('every card is on its tab: Players, Growth, Money, Chat, Feedback, Messages, Settings',()=>{
 const where={
  players:['admin-online-list','admin-players','admin-player-detail'],
  growth:['admin-funnel','admin-sources','admin-retention','admin-countries','admin-devices','admin-languages','admin-invite-list'],
  money:['admin-purchases','admin-offers','admin-partners'],
  chat:['admin-reports','admin-report-log','admin-mods','admin-chat-levels'],
  feedback:['admin-feedback-list'],
  messages:['admin-chat-settings','admin-dm-fields','admin-welcome','admin-donate'],
  settings:['admin-device-card'],
  overview:['admin-tiles']
 };
 for(const [panel,ids] of Object.entries(where))for(const id of ids)assert.equal(panelOf(id),panel,id);
 assert.ok(dash.indexOf('Keeping the valley friendly')>dash.indexOf('data-admin-panel="chat"')&&dash.indexOf('Keeping the valley friendly')<dash.indexOf('data-admin-panel="feedback"'),'the guide on Chat');
 // The purchases first on Money, then the special offer, then the partners.
 assert.ok(dash.indexOf('id="admin-purchases"')<dash.indexOf('id="admin-offers"')&&dash.indexOf('id="admin-offers"')<dash.indexOf('id="admin-partners"'));
 // The newsletter right under News and pop-ups on Messages; Reload everyone first on Settings.
 const mail=read('src/admin-news-mail.js'),reload=read('src/admin-reload.js');
 assert.match(mail,/const settings=dialog\.querySelector\('\[data-admin-panel="messages"\]'\)\?\?dialog\.querySelector\('\[data-admin-panel="settings"\]'\);/);
 assert.match(mail,/const news=settings\.querySelector\?\.\('#admin-chat-settings'\);if\(news\?\.after\)news\.after\(section\);else settings\.append\(section\);/);
 assert.match(reload,/if\(settings\.prepend\)settings\.prepend\(section\);else settings\.append\(section\);/);
 // A gift from a farmer's details goes to the gift card on Messages, for that farmer.
 assert.match(dash,/function giftTo\(player\)\{closePlayer\(\);showTab\('messages'\);gift\.audience='player';gift\.player=player;/);
});

test('a moderator: only what Players shows is loaded, never Retention, Invites, money, sources or the admin\'s settings',()=>{
 assert.deepEqual(PARTS.map(p=>p[0]),['admin_online','admin_players','admin_retention','admin_invites']);
 assert.deepEqual(partsFor('moderator').map(p=>p[0]),['admin_online','admin_players']);
 assert.deepEqual(partsFor('admin').map(p=>p[0]),['admin_online','admin_players','admin_retention','admin_invites']);
 const load=dash.slice(dash.indexOf(' async function load(){'),dash.indexOf(' // Feedback & bugs: the open messages'));
 // Every other request in load() is the admin's alone.
 for(const line of load.split('\n').filter(l=>/showOffers|showPartners|loadSources|newsMail\.show|reloadCard\.show|admin_purchases/.test(l)))assert.match(line,/^  if\(role==='admin'\)/,line.trim());
 // The chat part: reports and the log for the staff; the gift room, the pop-ups, the welcome, the moderators and the levels after the admin check.
 const chat=dash.slice(dash.indexOf(' async function loadChat(){'),dash.indexOf(".addEventListener('input',event=>{view.search=event.target.value;"));
 const gate=chat.indexOf("if(role!=='admin')return;");assert.ok(gate>0);
 for(const call of ['donationRoom','showPopups','showWelcome','staffList'])assert.ok(chat.indexOf(call)>gate,call);
 for(const call of ['client.reports()','client.reportLog()'])assert.ok(chat.indexOf(call)<gate,call);
 // The admin's cards on Chat and Messages stay hidden until the admin's load shows them.
 for(const id of ['admin-mods','admin-chat-levels','admin-welcome','admin-chat-settings','admin-donate','admin-sources','admin-countries','admin-devices'])assert.match(dash,new RegExp(`id="${id}" hidden>`),id);
 assert.match(chat,/for\(const id of \['admin-chat-settings','admin-welcome','admin-mods','admin-chat-levels'\]\)dialog\.querySelector\(`#\$\{id\}`\)\.hidden=false;/);
 // The Overview draws nothing for a moderator (they have no Overview).
 assert.match(dash,/function renderOverview\(\)\{\n  if\(role!=='admin'\)return;/);
});

test('the Overview\'s numbers: today in UTC, money as the Purchases totals count it (paid, real farmers)',()=>{
 const purchases=[
  {status:'credited',live:true,amountCents:499,createdAt:iso(now-2*HOUR),creditedAt:iso(now-2*HOUR)},
  {status:'credited',live:true,amountCents:999,createdAt:iso(now-16*HOUR),creditedAt:iso(now-14*HOUR)},// opened yesterday, paid today
  {status:'credited',live:true,amountCents:1999,createdAt:iso(now-3*DAY)},
  {status:'credited',live:true,amountCents:4999,createdAt:iso(now-8*DAY)},// older than 7 days
  {status:'credited',live:false,amountCents:999,createdAt:iso(now-HOUR)},// a test payment
  {status:'test_paid',live:false,amountCents:999,createdAt:iso(now-HOUR)},
  {status:'pending',live:true,amountCents:299,createdAt:iso(now-HOUR)},
  {status:'refunded',live:true,amountCents:499,createdAt:iso(now-HOUR)}
 ];
 assert.deepEqual(earned(purchases,now),{todayCents:1498,todayPaid:2,weekCents:3497,weekPaid:3});
 // 7 days is today and the 6 days before, from midnight UTC: 6 days and 15 hours back still counts, 7 days back does not.
 assert.equal(earned([{status:'credited',amountCents:100,createdAt:iso(now-6*DAY-14*HOUR)}],now).weekCents,100);
 assert.equal(earned([{status:'credited',amountCents:100,createdAt:iso(now-6*DAY-16*HOUR)}],now).weekCents,0);
 assert.equal(euro(1498),'€14.98');
 assert.deepEqual(feedbackToday([{createdAt:iso(now-HOUR)},{createdAt:iso(now-20*HOUR)},{}],now),{open:3,today:1});
 assert.equal(dayOne({kpi:{day1:{retained:18,total:41}}}),44);
 assert.equal(dayOne({rows:[{days:[null,{retained:1,total:4}]},{days:[null,{retained:3,total:4}]}]}),50,'an older farm-api: from the rows');
 assert.equal(dayOne({rows:[]}),null);
 const t=overviewTiles({online:{count:6},retention:{kpi:{today:7,day1:{retained:18,total:41}},rows:[]},reports:[{},{}],feedback:[{createdAt:iso(now-HOUR)}],purchases},now);
 assert.deepEqual(t,{online:6,new:7,day1:44,reports:2,feedback:1,feedbackToday:1,revenueToday:1498,paidToday:2,revenueWeek:3497,paidWeek:3});
 // A part that did not load shows "–", never a 0 that looks real.
 assert.deepEqual(overviewTiles({},now),{online:null,new:null,day1:null,reports:null,feedback:null,feedbackToday:null,revenueToday:null,paidToday:null,revenueWeek:null,paidWeek:null});
 // New today from the retention row of today's UTC date when farm-api sends no kpi.
 assert.equal(overviewTiles({retention:{rows:[{day:'2026-10-22',size:5,days:[]}]}},now).new,5);
});

test('the Overview\'s tiles: the five the owner named and the money, each opening its tab; the money only for the admin',()=>{
 for(const [tile,go] of [['online','players'],['new','players'],['day1','growth'],['reports','chat'],['feedback','feedback'],['revenue-today','money'],['revenue-week','money']])
  assert.match(dash,new RegExp(`data-tile="${tile}" data-go="${go}"`),tile);
 assert.equal(panelOf('admin-kpi-revenue-today'),'overview');assert.equal(panelOf('admin-kpi-revenue-week'),'overview');
 assert.ok(ADMIN_TABS.includes('overview')&&!STAFF_TABS.includes('overview')&&!STAFF_TABS.includes('money'),'moderators never see money');
 // Drawn whenever a part comes in, from the operations already loaded: no new farm-api operation.
 assert.match(dash,/overview\.purchases=data\?\.purchases\?\?\[\];renderPurchases\(data\);renderOverview\(\);/);
 assert.match(dash,/overview\.feedback=open;renderOverview\(\);/);assert.match(dash,/overview\.reports=reports;renderOverview\(\);/);
 // New players today: the list of new farmers, newest first.
 assert.match(dash,/if\(kind==='new'\)\{view\.filter='new';view\.sort='new';/);
 // The open reports also as a count on the Chat tab, for the moderators who have no Overview.
 assert.match(dash,/const tabCount=dialog\.querySelector\('#admin-chat-count'\);tabCount\.textContent=number\(reports\.length\);tabCount\.hidden=!reports\.length;/);
});

test('quick actions: News and pop-up, Gift to everyone, Start an offer, Reload everyone, Newsletter, each opening its card, nothing sent from there',()=>{
 assert.deepEqual(Object.keys(QUICK_ACTIONS),['news','gift','offer','reload','mail']);
 for(const key of Object.keys(QUICK_ACTIONS))assert.match(dash,new RegExp(`data-quick="${key}"`),key);
 assert.equal(panelOf('admin-chat-settings'),QUICK_ACTIONS.news.tab);assert.equal(panelOf('admin-donate'),QUICK_ACTIONS.gift.tab);assert.equal(panelOf('admin-offers'),QUICK_ACTIONS.offer.tab);
 assert.deepEqual([QUICK_ACTIONS.reload.tab,QUICK_ACTIONS.mail.tab],['settings','messages'],'the cards src/admin-reload.js and src/admin-news-mail.js add');
 assert.equal(QUICK_ACTIONS.news.card,'admin-chat-settings');assert.equal(QUICK_ACTIONS.gift.card,'admin-donate');assert.equal(QUICK_ACTIONS.offer.card,'admin-offers');assert.equal(QUICK_ACTIONS.reload.card,'admin-reload');assert.equal(QUICK_ACTIONS.mail.card,'admin-news-mail');
 assert.match(read('src/admin-reload.js'),/section\.id='admin-reload';/);assert.match(read('src/admin-news-mail.js'),/section\.id='admin-news-mail';/);
 assert.equal(QUICK_ACTIONS.gift.audience,'all','Gift to everyone picks Everyone');
 for(const field of Object.values(QUICK_ACTIONS).map(a=>a.focus).filter(Boolean))assert.ok(dash.includes(`id="${field}"`)||read('src/admin-news-mail.js').includes('admin-mail-subject'),field);
 const handler=dash.slice(dash.indexOf("dialog.querySelector('.admin-quick-actions')"),dash.indexOf(' // The search at the top'));
 assert.doesNotMatch(handler,/bridge|press\(|\.submit|requestSubmit|confirm/,'a quick action only opens its card; every card still asks before it sends');
 assert.ok(panelOf('admin-tiles')==='overview'&&dash.indexOf('class="admin-card admin-quick"')<dash.indexOf('data-admin-panel="players"'),'on the Overview');
});

test('the search at the top: farmers by name from every tab, the best match first, a pick opens their details',()=>{
 const players=[
  {playerId:'a',username:'Meadow Mae',lastActiveAt:iso(now-DAY)},{playerId:'b',username:'Mae Barley',lastActiveAt:iso(now-2*DAY)},
  {playerId:'c',username:'Old Mae',lastActiveAt:iso(now-HOUR)},{playerId:'d',username:null,lastActiveAt:iso(now)},{playerId:'e',username:'Sunny',ip:'203.0.113.9',country:'NL',lastActiveAt:iso(now)}
 ];
 assert.deepEqual(searchPlayers(players,'mae').map(p=>p.playerId),['b','c','a'],'a name that starts with it first, then the most recently active');
 assert.deepEqual(searchPlayers(players,'  ').map(p=>p.playerId),[]);
 assert.deepEqual(searchPlayers(players,'203.0').map(p=>p.playerId),[],'names only: never an IP address or a country');
 assert.deepEqual(searchPlayers(players,'NL').map(p=>p.playerId),[]);
 assert.equal(searchPlayers(Array.from({length:20},(_,i)=>({playerId:String(i),username:`Farmer ${i}`})),'farmer').length,8);
 // In the heading, outside the panels, so every tab has it; Enter picks the first; a pick goes to Players and opens the farmer.
 assert.ok(dash.indexOf('id="admin-search"')<dash.indexOf('data-admin-tab="overview"'),'above the tabs');
 assert.match(dash,/function pickFarmer\(id\)\{search\.value='';closeSearch\(\);showTab\('players'\);void openPlayer\(id\);\}/);
 assert.match(dash,/if\(event\.key!=='Enter'\)return;event\.preventDefault\(\);const first=searchPlayers\(view\.players,search\.value\)\[0\];if\(first\)pickFarmer\(first\.playerId\);/);
 assert.match(dash,/hits\.map\(p=>`<li><button type="button" data-search-pick="\$\{esc\(p\.playerId\)\}">/,'escaped');
});

test('the look: the game\'s window shell and cards, no eyebrow, no middle dots on screen, the sheet only for the staff',()=>{
 assert.match(dash,/dialog\.className='game-dialog wide-dialog admin-dashboard-dialog is-sheet is-l';/);
 assert.match(dash,/<div class="dialog-top admin-top"><div class="dialog-heading">'\+art\('admin','dialog-badge'\)\+'<div class="dialog-titles"><h2 id="admin-dashboard-title">Admin dashboard<\/h2><\/div>'/);
 assert.doesNotMatch(dash,/class="eyebrow"|admin-dashboard-eyebrow/);
 // The stylesheet is asked for once the role is known: farmers never download it.
 assert.match(dash,/role=admin\|\|chatRole==='admin'\?'admin':chatRole==='moderator'\?'moderator':null;if\(!role\)return;\n[^\n]*\n  const style=document\.createElement\('link'\);style\.rel='stylesheet';style\.href=import\.meta\.resolve\?\.\('\/admin-dashboard\.css'\)\?\?'\/admin-dashboard\.css';document\.head\.append\(style\);/);
 // The cards: cream, the sturdy rim and the edge underneath, like the game's toasts and chips.
 assert.match(css,/#admin-dashboard-dialog \.admin-card\{margin:0;padding:16px 18px;border:1\.5px solid var\(--admin-rim\);border-radius:18px;background:var\(--admin-card\);box-shadow:0 4px 0 var\(--admin-edge\)\}/);
 assert.match(css,/--admin-rim:#e3d8c6;--admin-edge:#e2d4ba;--admin-card:#fffdf5/);
 assert.doesNotMatch(css,/text-transform:uppercase/,'no small capitals');
 for(const rule of css.replace(/\/\*[^]*?\*\//g,'').matchAll(/([^{}]+)\{([^{}]*)\}/g))assert.ok(rule[1].trim().startsWith('#admin-dashboard-dialog')||rule[1].trim().startsWith('@')||/^\d|^from|^to/.test(rule[1].trim()),rule[1]);
 // Phones: the tabs in rows of four, the tiles in two columns.
 assert.match(css,/@media\(max-width:900px\),\(max-height:550px\) and \(pointer:coarse\)\{[^]*#admin-dashboard-dialog \.admin-tiles\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 // No " · " on screen: the dashboard runs the game's undot over what it draws (the translation pass leaves staff screens alone).
 assert.match(read('public/i18n.js'),/\.admin-dashboard-dialog/);
 assert.match(dash,/import \{chosenLanguage,undot\} from '\.\.\/public\/i18n\.js';/);
 assert.match(dash,/new MutationObserver\(list=>\{for\(const m of list\)\{if\(m\.type==='characterData'\)clean\(m\.target\);else m\.addedNodes\.forEach\(clean\);\}\}\)\.observe\(dialog,\{subtree:true,childList:true,characterData:true\}\);/);
 // The new words are staff text: left out of the translation catalog like every admin-*.js file.
 assert.match(read('scripts/i18n-extract.mjs'),/admin-\[\^\/\]\*/);
});
