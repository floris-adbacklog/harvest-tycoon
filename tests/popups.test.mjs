import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkify,fitsDevice,POPUP_SCREENS,POPUP_AUDIENCES} from '../src/popup-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('web addresses in news and pop-ups open in a new tab; only https, and the rest stays plain text',()=>{
 assert.equal(linkify('More at https://www.harvesttycoon.com/play.html.'),'More at <a href="https://www.harvesttycoon.com/play.html" target="_blank" rel="noopener noreferrer">www.harvesttycoon.com/play.html</a>.');
 assert.equal(linkify('<b>hi</b> http://example.com'),'&lt;b&gt;hi&lt;/b&gt; http://example.com','no http, no html');
 assert.doesNotMatch(linkify('https://x.com/"><script>'),/<script>|"></);
 assert.match(read('src/chat-ui.js'),/n\.kind==='news'\?linkify\(n\.body\):esc\(n\.body\)/,'news in Notifications too');
});
test('who sees it: everyone, phones in the browser, anyone in the browser, phones or computers',()=>{
 const app={installed:true,phone:true},browserPhone={installed:false,phone:true},computer={installed:false,phone:false};
 assert.deepEqual(['all','phone_browser','browser','phone','desktop'].map(a=>[app,browserPhone,computer].map(d=>fitsDevice(a,d))),[[true,true,true],[false,true,false],[false,true,true],[true,true,false],[false,false,true]]);
 assert.deepEqual(POPUP_AUDIENCES,{all:'Everyone',phone_browser:'Phones in the browser',browser:'In the browser (phone or computer)',phone:'Phones only',desktop:'Computers only'});
 assert.deepEqual(Object.keys(POPUP_SCREENS),['install','today','events','leaderboard','chat','shop','family','wiki']);
});
test('the server: only the admin posts, lists and stops; a pop-up always ends; every farmer gets each one once',()=>{
 const sql=read('supabase/popups.sql');
 for(const fn of ['popup_post','popup_list','popup_stop'])assert.match(sql,new RegExp(`function public\\.${fn}\\([^]*?if public\\.chat_staff_role\\((me|\\(select auth\\.uid\\(\\)\\))\\) is distinct from 'admin' then raise exception 'Not authorized\\.'`),fn);
 assert.match(sql,/screen:\(install\|today\|events\|leaderboard\|chat\|shop\|family\|wiki\)\|https:\/\/\[\^\[:space:\]<>"\]\+\)\$'/,'a screen of the game or an https link');
 assert.match(sql,/ends:=now\(\)\+make_interval\(hours=>case when hours>0 then hours else 720 end\);/,'news without an end: the pop-up ends after 30 days');
 assert.match(sql,/insert into public\.player_notices\(player_id,kind,body,expires_at\) values\(null,'news',b,/,'the news goes to Notifications as before');
 assert.match(sql,/not exists\(select 1 from public\.popup_seen s where s\.player_id=me and s\.popup_id=x\.id\)/);assert.match(sql,/x\.min_level<=coalesce\(lvl,1\)/);
 assert.match(sql,/revoke all on public\.popups, public\.popup_seen from anon, authenticated;/,'only through the functions');
 assert.doesNotMatch(sql,/\{1,300\}/,'Postgres allows at most 255 repeats in a pattern');
});
test('the game shows it once, when nothing else is open, never in a farmer\'s first half hour, and not behind the Starter Pack',()=>{
 const ui=read('src/popup-ui.js'),cloud=read('src/game-cloud.js');
 assert.match(ui,/if\(!client\?\.popups\|\|rookieLeft\(state,now\(\)\)>0\)return;/);
 assert.match(ui,/const quiet=\(\)=>!doc\.querySelector\('dialog\[open\]'\);/);
 assert.match(ui,/client\.popupSeen\(popup\.id\)\.catch\(\(\)=>\{\}\);/);
 assert.match(ui,/if\(target\.startsWith\('https:\/\/'\)\)\{win\.open\(target,'_blank','noopener,noreferrer'\);return;\}/);
 assert.match(ui,/install:\(\)=>win\.harvestWiki\?\.\('getting-started','sec-play-it-as-an-app'\)/);
 assert.match(cloud,/const firstState=window\.harvestInitialFarm\.state;/,'the game clears harvestInitialFarm once it has taken the farm');
 assert.match(cloud,/void createPopupUI\(\{client:bridge\.chat,chat,state:firstState\}\)\.start\(\);\n[^]*?createOfferUI\(bridge\);\n   await createStarterPackUI\(bridge\);/);
 assert.match(read('public/game.js'),/window\.harvestWiki=\(id,anchor=''\)=>\{openDialog\('help-dialog'\);renderWiki\(state,id,anchor\);\};/);
 assert.match(read('public/wiki-ui.js'),/export function renderWiki\(state,id=null,anchor=''\)\{farm=state;bind\(\);if\(id\)topic\(id,anchor\);else home\(\);\}/);
 assert.match(read('public/wiki-content.js'),/section\('Play it as an app'/,'the anchor sec-play-it-as-an-app exists');
});
test('the admin form: send a notification, a pop-up or both; a web page asks for its address',()=>{
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/Send as<select id="admin-send-as"><option value="news">Notification<\/option><option value="popup">Pop-up<\/option><option value="both">Notification and pop-up<\/option><option value="dm">Private message \(they can reply\)<\/option><\/select><\/label>/);
 assert.match(admin,/<div class="admin-popup-fields" id="admin-popup-fields" hidden>/);
 assert.match(admin,/hours,news:mode==='both'\}\);/,'a pop-up alone posts no news');
 const sql=read('supabase/popups-send-as.sql');
 assert.match(sql,/if coalesce\(p_news,true\) then\n  insert into public\.player_notices/);assert.match(sql,/check \(audience in \('all','browser','phone_browser','phone','desktop'\)\)/);
 assert.match(sql,/drop function if exists public\.popup_post\(text,text,text,text,text,integer,integer\);/,'one version of the function');
 assert.match(admin,/<option value="link">A web page \(new tab\)<\/option>/);
 assert.match(admin,/await bridge\.chat\.postPopup\(\{title:\$p\('title'\)\.value\.trim\(\),body,buttonLabel:label\|\|null,buttonTarget:label\?target:null,/);
 assert.match(admin,/data-popup-stop=/);assert.match(read('src/chat-client.js'),/postPopup:\(\{title,body,buttonLabel=null,buttonTarget=null,audience='all',minLevel=1,hours=24,news=true\}\)=>rpc\('popup_post'/);
 assert.match(read('public/pwa-layout.css'),/#starter-pack-dialog,#popup-dialog\)\{/,'clear of the notch in the installed app');
});
test('the admin can send one private message to many farmers: online now, active this week or everyone; they can reply',()=>{
 const admin=read('src/admin-dashboard.js'),sql=read('supabase/chat-broadcast-dm.sql');
 assert.match(admin,/<option value="online">Online now<\/option><option value="week" selected>Active this week<\/option><option value="all">Everyone<\/option>/);
 assert.match(admin,/const n=await bridge\.chat\.broadcastDm\(\{audience,minLevel\}\);if\(ask!==dmCounting\)return;note\.textContent=`Goes to/,'the count before sending, only the latest one');
 assert.match(admin,/confirmAction\(\{title:`Send a private message to/,'asked once more before it goes');
 assert.match(read('src/chat-client.js'),/broadcastDm:\(\{body='',audience,send=false,minLevel=1\}\)=>rpc\('chat_broadcast_dm',\{p_body:body,p_audience:audience,p_send:send,p_min_level:minLevel\}\)/);
 assert.match(sql,/if me is null or public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'only the admin');
 assert.match(sql,/p_audience='online' and ps\.last_active_at>now\(\)-interval '30 minutes'/,'online: the same 30 minutes as the green dot');
 assert.match(sql,/not exists\(select 1 from public\.chat_blocks b where b\.player_id=ps\.player_id and b\.blocked_id=p_sender\)/,'not to farmers who blocked the admin');
 assert.doesNotMatch(sql,/harvest\.broadcast/,'a push as for any private message: the trigger only calls out for farmers with notifications on');
 assert.match(sql,/if not exists\(select 1 from public\.push_subscriptions p where p\.player_id=other\) then return null; end if;/);
 assert.match(sql,/m\.body=msg and m\.created_at>now\(\)-interval '10 minutes'\) then raise exception 'You sent this message a moment ago\.'/,'a double click sends once');
 assert.match(read('src/chat-ui.js'),/m\.sender_staff\?linkify\(m\.body\):esc\(m\.body\)/,'a link in the admin\'s message works');
 assert.match(sql,/add constraint chat_messages_body_check check \(char_length\(body\) between 1 and 500\);/,'the table takes the admin\'s 500 characters (it allowed 200)');
});
test('the admin\'s private message can go to farmers from a level, e.g. 14 for the special offer',()=>{
 const sql=read('supabase/chat-broadcast-level.sql'),admin=read('src/admin-dashboard.js');
 assert.match(sql,/drop function if exists public\.chat_broadcast_dm\(text,text,boolean\);/,'one function for the game to call');
 assert.match(sql,/ps\.level>=greatest\(\(select c\.dm_level from public\.chat_config c\),coalesce\(p_min_level,1\)\)/,'the private-message level still applies');
 assert.match(sql,/p_send boolean default false, p_min_level integer default 1\)/,'a call without a level is everyone, as before');
 assert.match(sql,/if me is null or public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/);
 assert.match(sql,/m\.body=msg and m\.created_at>now\(\)-interval '10 minutes'\) then raise exception 'You sent this message a moment ago\.'/);
 assert.match(admin,/<label>From level<input id="admin-dm-level" type="number" min="1" max="200"/);
 assert.match(admin,/const sent=await bridge\.chat\.broadcastDm\(\{body,audience:audience\.value,send:true,minLevel\}\);/);
});
test('a welcome message from the admin to every new farmer, a few minutes after sign-up; set up in the Admin dashboard',()=>{
 const sql=read('supabase/welcome-dm.sql'),admin=read('src/admin-dashboard.js');
 assert.match(sql,/if me is null or public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'only the admin sets it');
 assert.match(sql,/enabled_since=case when coalesce\(p_enabled,false\) and not enabled then now\(\) else enabled_since end/,'switching it on starts from now: nobody from before gets it');
 assert.match(sql,/u\.created_at>=greatest\(c\.enabled_since,now\(\)-interval '1 day'\) and u\.created_at<=now\(\)-make_interval\(mins=>c\.delay_minutes\)/,'a few minutes after sign-up');
 assert.match(sql,/insert into public\.welcome_dm_sent\(player_id\) values\(r\.id\) on conflict do nothing;\n  if not found then continue; end if;/,'each farmer once');
 assert.match(sql,/replace\(c\.body,'\{name\}',r\.username\)/,'{name} becomes their farmer name');
 assert.match(sql,/cron\.schedule\('harvest-welcome-dm','\* \* \* \* \*','select public\.welcome_dm_run\(\)'\)/,'checked every minute');
 assert.match(sql,/revoke all on function public\.welcome_dm_run\(\) from public, anon, authenticated;/,'only the clock runs it');
 assert.match(admin,/<option value="3">3 minutes after sign-up<\/option>/);assert.match(admin,/\{name\} becomes their farmer name\./);
 assert.match(admin,/await bridge\.chat\.welcomeSave\(\{enabled:dialog\.querySelector\('#admin-welcome-on'\)\.checked,/);
});
