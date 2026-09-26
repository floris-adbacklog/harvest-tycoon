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
test('who sees it: everyone, farmers without the installed app, phones or computers',()=>{
 const app={installed:true,phone:true},browserPhone={installed:false,phone:true},computer={installed:false,phone:false};
 assert.deepEqual(['all','no_app','phone','desktop'].map(a=>[app,browserPhone,computer].map(d=>fitsDevice(a,d))),[[true,true,true],[false,true,true],[true,true,false],[false,false,true]]);
 assert.deepEqual(Object.keys(POPUP_AUDIENCES),['all','no_app','phone','desktop']);
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
 assert.match(cloud,/void createPopupUI\(\{client:bridge\.chat,chat,state:firstState\}\)\.start\(\);\n   await createStarterPackUI\(bridge\);/);
 assert.match(read('public/game.js'),/window\.harvestWiki=\(id,anchor=''\)=>\{openDialog\('help-dialog'\);renderWiki\(state,id,anchor\);\};/);
 assert.match(read('public/wiki-ui.js'),/export function renderWiki\(state,id=null,anchor=''\)\{farm=state;bind\(\);if\(id\)topic\(id,anchor\);else home\(\);\}/);
 assert.match(read('public/wiki-content.js'),/section\('Play it as an app'/,'the anchor sec-play-it-as-an-app exists');
});
test('the admin form: "Also as a pop-up" opens the fields; a web page asks for its address',()=>{
 const admin=read('src/admin-dashboard.js');
 assert.match(admin,/<input type="checkbox" id="admin-popup-on"> Also as a pop-up<\/label><div class="admin-popup-fields" id="admin-popup-fields" hidden>/);
 assert.match(admin,/<option value="link">A web page \(new tab\)<\/option>/);
 assert.match(admin,/await bridge\.chat\.postPopup\(\{title:\$p\('title'\)\.value\.trim\(\),body,buttonLabel:label\|\|null,buttonTarget:label\?target:null,/);
 assert.match(admin,/data-popup-stop=/);assert.match(read('src/chat-client.js'),/postPopup:\(\{title,body,buttonLabel=null,buttonTarget=null,audience='all',minLevel=1,hours=24\}\)=>rpc\('popup_post'/);
 assert.match(read('public/pwa-layout.css'),/#starter-pack-dialog,#popup-dialog\)\{/,'clear of the notch in the installed app');
});
