import test from 'node:test';
import {LANGUAGES} from '../public/languages.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {linkify,fitsDevice,inLanguage,POPUP_SCREENS,POPUP_AUDIENCES} from '../src/popup-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('web addresses in news and pop-ups open in a new tab; only https, and the rest stays plain text',()=>{
 assert.equal(linkify('More at https://www.harvesttycoon.com/play.html.'),'More at <a href="https://www.harvesttycoon.com/play.html" target="_blank" rel="noopener noreferrer">www.harvesttycoon.com/play.html</a>.');
 assert.equal(linkify('<b>hi</b> http://example.com'),'&lt;b&gt;hi&lt;/b&gt; http://example.com','no http, no html');
 assert.doesNotMatch(linkify('https://x.com/"><script>'),/<script>|"></);
 assert.match(read('src/chat-ui.js'),/n\.kind==='news'\?linkify\(news\.body\):esc\(n\.body\)/,'news in Notifications too');
});
test('who sees it: everyone, phones in the browser, anyone in the browser, phones or computers',()=>{
 const app={installed:true,phone:true},browserPhone={installed:false,phone:true},computer={installed:false,phone:false};
 assert.deepEqual(['all','phone_browser','browser','phone','desktop'].map(a=>[app,browserPhone,computer].map(d=>fitsDevice(a,d))),[[true,true,true],[false,true,false],[false,true,true],[true,true,false],[false,false,true]]);
 assert.deepEqual(POPUP_AUDIENCES,{all:'Everyone',phone_browser:'Phones in the browser',browser:'In the browser (phone or computer)',phone:'Phones only',desktop:'Computers only',android_app:'Android app (Google Play)'},'9 Oct 2026: our Google Play app too (tests/popup-android-app.test.mjs)');
 assert.deepEqual(Object.keys(POPUP_SCREENS),['install','today','events','leaderboard','chat','shop','family','wiki','feedback']);
 assert.match(readFileSync(new URL('../supabase/popup-feedback-target.sql',import.meta.url),'utf8'),/screen:\(install\|today\|events\|leaderboard\|chat\|shop\|family\|wiki\|feedback\)/,'the database takes it too');
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
 assert.match(read('public/game.js'),/window\.harvestWiki=\(id,anchor='',options=\{\}\)=>\{openDialog\('help-dialog'\);renderWiki\(state,id,anchor,options\);\};/,'Oct 2026: and where it was opened from, for the chat\'s wiki chip');
 assert.match(read('public/wiki-ui.js'),/export function renderWiki\(state,id=null,anchor='',\{from=null\}=\{\}\)\{farm=state;bind\(\);trail=[^;]+;if\(id\)topic\(id,anchor\);else home\(\);\}/,'a topic and a spot on it (Oct 2026: and where it was opened from)');
 assert.match(read('public/wiki-content.js'),/section\('Play it as an app'/,'the anchor sec-play-it-as-an-app exists');
});
test('the admin form: send a notification, a pop-up or both; a web page asks for its address',()=>{
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/Send as<select id="admin-send-as"><option value="news">Notification<\/option><option value="popup">Pop-up<\/option><option value="both">Notification and pop-up<\/option><option value="dm">Private message \(they can reply\)<\/option><\/select><\/label>/);
 assert.match(admin,/<div class="admin-popup-fields" id="admin-popup-fields" hidden>/);
 assert.match(admin,/hours,news:mode==='both',texts\}\);/,'a pop-up alone posts no news');
 const sql=read('supabase/popups-send-as.sql');
 assert.match(sql,/if coalesce\(p_news,true\) then\n  insert into public\.player_notices/);assert.match(sql,/check \(audience in \('all','browser','phone_browser','phone','desktop'\)\)/);
 assert.match(sql,/drop function if exists public\.popup_post\(text,text,text,text,text,integer,integer\);/,'one version of the function');
 assert.match(admin,/<option value="link">A web page \(new tab\)<\/option>/);
 assert.match(admin,/await bridge\.chat\.postPopup\(\{title:en\.title\?\?'',body,buttonLabel:label\|\|null,buttonTarget:label\?target:null,/);
 assert.match(admin,/data-popup-stop=/);assert.match(read('src/chat-client.js'),/postPopup:\(\{title,body,buttonLabel=null,buttonTarget=null,audience='all',minLevel=1,hours=24,news=true,texts=null\}\)=>rpc\('popup_post'/);
 assert.match(read('public/pwa-layout.css'),/#starter-pack-dialog,#popup-dialog\)\{/,'clear of the notch in the installed app');
});
test('the admin can send one private message to many farmers: online now, active this week or everyone; they can reply',()=>{
 const admin=read('src/admin-dashboard.js'),sql=read('supabase/chat-broadcast-dm.sql');
 assert.match(admin,/<option value="online">Online now<\/option><option value="week" selected>Active this week<\/option><option value="month" data-group-filter>Active this month<\/option><option value="all">Everyone<\/option>/,'this month too since 8 Oct 2026 (supabase/chat-group-filters.sql)');
 assert.match(admin,/let n=groupFilters===false\?null:await bridge\.chat\.broadcastGroup\(\{filters:dmFilters\(\)\}\);if\(ask!==dmCounting\)return;[^]*?note\.textContent=`Goes to/,'the count before sending (with the filters since 8 Oct 2026), only the latest one');
 assert.match(admin,/confirmAction\(\{title:`Send a private message to/,'asked once more before it goes');
 assert.match(read('src/chat-client.js'),/broadcastDm:\(\{body='',audience,send=false,minLevel=1,texts=null\}\)=>rpc\('chat_broadcast_dm',\{p_body:body,p_audience:audience,p_send:send,p_min_level:minLevel,p_texts:texts\}\)/);
 assert.match(sql,/if me is null or public\.chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'only the admin');
 assert.match(sql,/p_audience='online' and ps\.last_active_at>now\(\)-interval '30 minutes'/,'online: the same 30 minutes as the green dot');
 assert.match(sql,/not exists\(select 1 from public\.chat_blocks b where b\.player_id=ps\.player_id and b\.blocked_id=p_sender\)/,'not to farmers who blocked the admin');
 assert.doesNotMatch(sql,/harvest\.broadcast/,'a push as for any private message: the trigger only calls out for farmers with notifications on');
 assert.match(sql,/if not exists\(select 1 from public\.push_subscriptions p where p\.player_id=other\) then return null; end if;/);
 assert.match(sql,/m\.body=msg and m\.created_at>now\(\)-interval '10 minutes'\) then raise exception 'You sent this message a moment ago\.'/,'a double click sends once');
 assert.match(read('src/chat-ui.js'),/m\.sender_staff\?linkify\(part\.text\):esc\(part\.text\)/,'a link in the admin\'s message works (its words between wiki chips, 3 Oct 2026)');
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
 assert.match(admin,/const reached=group\?await bridge\.chat\.broadcastGroup\(\{body,filters,send:true,texts\}\):await bridge\.chat\.broadcastDm\(\{body,audience:audience\.value,send:true,minLevel,texts\}\);/,'the old call while the database has no filters (supabase/chat-group-filters.sql)');
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
test('the welcome message in the language the farmer plays in, English for every language without its own text',()=>{
 const sql=read('supabase/welcome-dm-languages.sql'),admin=read('src/admin-dashboard.js'),client=read('src/chat-client.js');
 assert.match(sql,/left join public\.player_seen seen on seen\.player_id=u\.id\n   left join public\.welcome_dm_texts t on t\.language=seen\.language/,'the game language they last played in');
 assert.match(sql,/replace\(coalesce\(r\.own,c\.body\),'\{name\}',r\.username\)/,'their own text, otherwise English');
 assert.match(sql,/if msg='' then delete from public\.welcome_dm_texts where language=p_language;/,'an empty text goes back to English');
 assert.match(sql,/function public\.welcome_dm_save_text[\s\S]*?chat_staff_role\(me\) is distinct from 'admin' then raise exception 'Not authorized\.'/,'only the admin sets it');
 assert.match(sql,/revoke all on public\.welcome_dm_texts from anon, authenticated;/);
 assert.match(sql,/on conflict \(language\) do nothing;\s*$/,'a text the admin already set is kept');
 const texts=[...sql.matchAll(/\('([a-z]{2})',\$t\$([\s\S]*?)\$t\$\)/g)];
 const codes=texts.map(m=>m[1]).sort();
 assert.deepEqual(codes,LANGUAGES.map(l=>l.code).filter(c=>c!=='en').sort(),'a first text for every game language');
 for(const [,code,body] of texts){assert.ok(body.includes('{name}'),code);assert.ok([...body].length<=500,code);}
 assert.match(client,/welcomeSaveText:\(\{language,body\}\)=>rpc\('welcome_dm_save_text',\{p_language:language,p_body:body\}\)/);
 assert.match(admin,/<select id="admin-welcome-language">'\+LANGUAGES\.map/);
 assert.match(admin,/if\(code!=='en'\)w=await bridge\.chat\.welcomeSaveText\(\{language:code,body:text\}\);/);
});
test('news, pop-ups and the admin\'s private message in the farmer\'s own language, English where it has none (1 Oct 2026)',()=>{
 const sql=read('supabase/admin-texts-languages.sql'),admin=read('src/admin-dashboard.js'),client=read('src/chat-client.js'),ui=read('src/popup-ui.js'),chat=read('src/chat-ui.js');
 const popup={id:'p',title:'New!',body:'Hello',buttonLabel:'Go',buttonTarget:'screen:events',texts:{nl:{title:'Nieuw!',body:'Hallo'},de:{buttonLabel:'Los'}}};
 const shown=(code,item=popup)=>{const p=inLanguage(item,code);return [p.title,p.body,p.buttonLabel,[...p.own].sort()];};
 assert.deepEqual(shown('nl'),['Nieuw!','Hallo','Go',['body','title']],'a part without its own text stays English');
 assert.deepEqual(shown('de'),['New!','Hello','Los',['buttonLabel']]);
 assert.deepEqual(shown('fr'),['New!','Hello','Go',[]],'no text of its own: English');
 assert.deepEqual(shown('en'),['New!','Hello','Go',[]]);
 assert.equal(inLanguage({title:'x',body:'y',texts:{nl:{buttonLabel:'Ga'}}},'nl').buttonLabel,undefined,'no button in English, none in another language');
 assert.match(ui,/const popup=inLanguage\(shown\),button=popup\.buttonLabel&&popup\.buttonTarget,keep=key=>popup\.own\.has\(key\)\?' translate="no"':'';/,'the page translation leaves the admin\'s own words alone');
 assert.match(chat,/const news=n\.kind==='news'\?inLanguage\(n\):\{own:new Set\(\)\};/,'news in Notifications too');
 assert.match(client,/select\('id,player_id,kind,body,texts,created_at'\)/);
 // The server keeps two-letter languages other than English, within the same lengths as the English text, and only the admin sends.
 assert.match(sql,/continue when code !~ '\^\[a-z\]\{2\}\$' or code='en' or jsonb_typeof\(v\)<>'object';/);
 assert.match(sql,/revoke all on function public\.admin_texts\(jsonb,integer\) from public, anon, authenticated;/);
 for(const fn of ['chat_post_news','popup_post','chat_broadcast_dm']){
  assert.match(sql,new RegExp(`drop function if exists public\\.${fn}\\(`),`${fn}: one version`);
  assert.match(sql,new RegExp(`function public\\.${fn}\\([^]*?is distinct from 'admin' then raise exception 'Not authorized\\.'`),`${fn}: the admin only`);
 }
 assert.match(sql,/'audience',p\.audience,'texts',p\.texts\)/,'the game gets every language\'s text');
 assert.match(sql,/coalesce\(own->>seen\.language,msg\)\n  from public\.chat_broadcast_targets\(me,p_audience,lvl\) t left join public\.player_seen seen on seen\.player_id=t\.player_id;/,'a private message in the language they last played in');
 assert.match(sql,/m\.body=msg or m\.body in \(select value from jsonb_each_text\(own\)\)/,'a double click sends once, in any language');
 assert.match(admin,/<select id="admin-news-language">'\+LANGUAGES\.map/);
 assert.match(admin,/await bridge\.chat\.postNews\(body,hours,texts,newsLevel\(\)\)/);
});
