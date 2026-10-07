import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {SETTINGS_PARTS,SETTINGS_SLUGS,APP_LINK,FEEDBACK_LINK,appPath as gameAppPath,settingsLink,settingsSlug,settingsPart,parseGameLink,gameLinksIn} from '../public/game-links.js';
import {chatParts,MAX_LINKS} from '../src/chat-rich.js';
import {openIntent,withoutOpen} from '../public/app-links.js';
import {wikiArticle} from '../public/wiki-content.js';
import {LANGUAGES,playBadge} from '../public/languages.js';
import {buildAppPages,translateAppPage,appPath,READY} from '../scripts/build-languages.mjs';
import {AWAY} from '../public/settings-nav.js';
import {catalog,translations} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SITE='https://www.harvesttycoon.com',others=READY.filter(code=>code!=='en');
const exact=(dict,key)=>{const out=dict[key];return out&&typeof out==='object'?out.other:out;};
// 4 Oct 2026: besides the wiki, the chat lets through the app page (/app) and one part of Settings (/settings/<part>), shown as chips;
// the same addresses work on the website (/app is a page, /settings/<part> opens the game there); the staff copy them in Settings.

test('the Settings parts: one slug each, the section id and title the game has, nothing else',()=>{
 assert.deepEqual(SETTINGS_SLUGS,['avatar','email','sound','chat','reminders','farm-app','language','privacy']);
 const farm=read('public/farm.html');
 for(const slug of SETTINGS_SLUGS){
  const {id,title}=SETTINGS_PARTS[slug];
  if(id==='avatar-settings'){assert.match(farm,/<section id="avatar-settings"/);assert.match(read('public/avatar-settings.js'),/<h3 id="avatar-settings-title">Avatar<\/h3>/);continue;}
  assert.match(farm,new RegExp(`<section id="${id}" class="settings-section"[^>]*><h3 class="settings-heading"[^>]*><i [^>]*><\\/i>${title}<\\/h3>`),slug);
 }
 assert.equal(settingsSlug('app-settings'),'farm-app');assert.equal(settingsSlug('nope'),null);
 assert.equal(settingsPart('__proto__'),null);assert.equal(settingsPart('toString'),null);assert.equal(settingsPart(undefined),null);
 assert.equal(settingsLink('farm-app'),'https://www.harvesttycoon.com/settings/farm-app');assert.equal(APP_LINK,'https://www.harvesttycoon.com/app');
});

test('which address is one of ours: the app page and a known part, our site only, as the wiki links',()=>{
 for(const url of ['https://www.harvesttycoon.com/app','harvesttycoon.com/app','www.harvesttycoon.com/app/','https://harvesttycoon.com/app?fbclid=x','http://harvesttycoon.com/app','HARVESTTYCOON.COM/APP'])assert.deepEqual(parseGameLink(url),{app:true},url);
 assert.deepEqual(parseGameLink('https://www.harvesttycoon.com/settings/farm-app'),{settings:'farm-app'});
 assert.deepEqual(parseGameLink('harvesttycoon.com/settings/reminders/'),{settings:'reminders'});
 for(const url of ['harvesttycoon.com/settings/Chat','HARVESTTYCOON.COM/SETTINGS/CHAT'])assert.deepEqual(parseGameLink(url),{settings:'chat'},url);
 for(const url of ['ftp://harvesttycoon.com/app','https://evil.com/app','harvesttycoon.com.evil.com/app','https://harvesttycoon.com:8443/app','https://x@harvesttycoon.com/app','harvesttycoon.com/apple','harvesttycoon.com/app/x',
  'harvesttycoon.com/app#x','harvesttycoon.com/settings','harvesttycoon.com/settings/nope','harvesttycoon.com/settings/__proto__','harvesttycoon.com/settings/chat#x','harvesttycoon.com/app/../x','',null,'a b'])
  assert.equal(parseGameLink(url),null,String(url));
 assert.deepEqual(gameLinksIn('Get it: harvesttycoon.com/app. Then (www.harvesttycoon.com/settings/chat)!'),[
  {url:'harvesttycoon.com/app',index:8,app:true},{url:'www.harvesttycoon.com/settings/chat',index:37,settings:'chat'}]);
 for(const text of ['notharvesttycoon.com/app','evil.com/?r=harvesttycoon.com/app','x.harvesttycoon.com/app'])assert.deepEqual(gameLinksIn(text),[],text);
 assert.doesNotMatch(read('public/game-links.js'),/^import /m,'no imports: the page around the game, the chat and the tests use it');
});

test('a message: wiki, app and Settings chips in order, in the same 2 links',()=>{
 assert.equal(MAX_LINKS,2);
 assert.deepEqual(chatParts('See harvesttycoon.com/settings/farm-app and https://www.harvesttycoon.com/app!'),[
  {text:'See '},{settings:{slug:'farm-app',url:'harvesttycoon.com/settings/farm-app'}},{text:' and '},{app:{url:'https://www.harvesttycoon.com/app'}},{text:'!'}]);
 assert.deepEqual(chatParts('harvesttycoon.com/wiki/chat harvesttycoon.com/settings/chat').map(p=>Object.keys(p)[0]),['wiki','text','settings']);
 assert.deepEqual(chatParts('harvesttycoon.com/settings/nope'),[{text:'harvesttycoon.com/settings/nope'}],'an unknown part stays words');
});

// The database's address (it is a JavaScript expression too): every chip the game draws is a link the database counted as one.
const SQL_LINK=String.raw`(^|[\s(])(https?://)?(www\.)?harvesttycoon\.com/(wiki(/[a-z-]+)?/?(#[a-z0-9-]+)?|app/?|settings/(avatar|email|sound|chat|reminders|farm-app|language|privacy)/?)(?=$|[\s).,!?;:])`;
test('the database lets the same links through: patched from the live functions, re-runnable, the refusals name what is allowed',()=>{
 const sql=read('supabase/chat-game-links.sql');
 assert.equal(sql.split(`'${SQL_LINK}'`).length-1,2,'chat_game_links strips and counts the same address');
 assert.ok(SQL_LINK.includes(`settings/(${SETTINGS_SLUGS.join('|')})/?`),'the same parts as the game');
 const counted=body=>[...body.matchAll(new RegExp(SQL_LINK,'gi'))].map(m=>m.index+m[1].length);
 for(const body of ['See harvesttycoon.com/app.','(https://www.harvesttycoon.com/settings/farm-app/) ok','harvesttycoon.com/app?fbclid=1','one harvesttycoon.com/settings/privacy, two harvesttycoon.com/wiki/chat#sec-house-rules'])
  {const parts=[...gameLinksIn(body)];assert.ok(parts.length,body);for(const link of parts)assert.ok(counted(body).includes(link.index),`${body}: ${link.url}`);}
 assert.equal(counted('harvesttycoon.com/settings/nope').length,0);assert.equal(counted('harvesttycoon.com/app#x').length,0);assert.equal(counted('notharvesttycoon.com/app').length,0);
 assert.match(sql,/revoke all on function public\.chat_game_links\(text\) from public, anon, authenticated;/);
 for(const [fn,v] of [['chat_send(text,text)','body'],['chat_mod_edit(uuid,text)','clean']]){
  assert.ok(sql.includes(`select pg_temp.chat_links_patch('public.${fn}','chat_game_links(',`),fn);
  assert.ok(sql.includes(`$a$if public.chat_wiki_links(${v})<0 then raise exception 'Only links to the Harvest Tycoon wiki are allowed in the chat.' using errcode='22023'; end if;\n if public.chat_wiki_links(${v})>2 then raise exception 'Up to 2 wiki links fit in one message.' using errcode='22023'; end if;$a$`),`${fn}: the live lines it replaces`);
  assert.ok(sql.includes(`$b$if public.chat_game_links(${v})<0 then raise exception 'Only links to the Harvest Tycoon wiki, the app page and Settings are allowed in the chat.' using errcode='22023'; end if;\n if public.chat_game_links(${v})>2 then raise exception 'Up to 2 links fit in one message.' using errcode='22023'; end if;$b$`),`${fn}: the new lines`);
 }
 assert.match(sql,/if position\(p_marker in def\)>0 then return; end if;\n if position\(p_from in def\)=0 then raise exception/,'re-runnable, never over an unknown definition');
 for(const {code,ready} of LANGUAGES)if(ready&&code!=='en'){const dict=translations(code);for(const key of ['Only links to the Harvest Tycoon wiki, the app page and Settings are allowed in the chat.','Up to 2 links fit in one message.'])assert.ok(exact(dict,key),`${code}: ${key}`);}
});

// Both ways (4 Oct 2026 review): chat_game_links run in JavaScript (its two expressions read from the file; \M is a word end) against
// the chips the game draws. A message the database stores holds as many links as the game shows chips, except the few it stores as
// plain words on purpose: a path that leaves the page (/app/../x), something glued after a stop (/app.evil.cc) or a #spot after a query.
test('the database counts as many links as the game draws chips; what it refuses has no chips to count',()=>{
 const sql=read('supabase/chat-game-links.sql');
 const other=new RegExp(sql.match(/~\* '([^']+)' then -1/)[1].replace('\\M','(?![\\p{L}\\p{N}_])'),'iu');
 const db=body=>other.test(body.replace(new RegExp(SQL_LINK,'gi'),'$1 '))?-1:(body.match(new RegExp(SQL_LINK,'gi'))??[]).length;
 const chips=body=>chatParts(body).filter(part=>part.wiki||part.app||part.settings).length;
 for(const body of ['See harvesttycoon.com/app.','(https://www.harvesttycoon.com/settings/farm-app/) ok','harvesttycoon.com/app?fbclid=1','harvesttycoon.com/APP','HARVESTTYCOON.COM/SETTINGS/PRIVACY',
  'harvesttycoon.com/Settings/Chat and http://harvesttycoon.com/app','one harvesttycoon.com/settings/privacy, two harvesttycoon.com/wiki/chat#sec-house-rules',
  'harvesttycoon.com/app harvesttycoon.com/settings/sound harvesttycoon.com/wiki/market','no links at all','www.harvesttycoon.com/settings/language/!'])
  {assert.ok(db(body)>=0,body);assert.equal(chips(body),db(body),body);}
 assert.equal(db('harvesttycoon.com/app harvesttycoon.com/settings/sound harvesttycoon.com/wiki/market'),3,'over the 2: refused by its own line');
 for(const body of ['harvesttycoon.com/app/../x','harvesttycoon.com/settings/chat/../../evil','harvesttycoon.com/app.evil.cc','harvesttycoon.com/app;evil.cc','harvesttycoon.com/app)evil','harvesttycoon.com/settings/farm-app:evil','harvesttycoon.com/app?utm=1#x'])
  {assert.equal(db(body),1,body);assert.equal(chips(body),0,`${body}: plain words on purpose`);}
 for(const body of ['harvesttycoon.com/settings/nope','harvesttycoon.com/app#x','evil.com/?r=harvesttycoon.com/app','harvesttycoon.com/apple','notharvesttycoon.com/app','harvesttycoon.com.evil.com/app',
  '\u0436harvesttycoon.com/app','\u04bbarvesttycoon.com/app','\u0436evil.com','x_evil.com'])assert.equal(db(body),-1,body);
});

test('the chips: "Get the app" and "Settings › part" in the game\'s words; the app is not left for a store inside our apps',()=>{
 const ui=read('src/chat-ui.js');
 assert.match(ui,/data-app-link>\$\{ICON\.phone\}<span>Get the app<\/span><\/button>/);
 assert.match(ui,/data-settings-link="\$\{esc\(link\.slug\)\}">\$\{art\('settings'\)\}<span>Settings<\/span><span class="chat-path-sep" aria-hidden="true">›<\/span><span>\$\{esc\(settingsPart\(link\.slug\)\?\.title\?\?''\)\}<\/span><\/button>/);
 assert.match(ui,/if\(portalOff\('app'\)\)\{showCenterNotice\(dialog,'The app is not available on CrazyGames\.'\);return;\}\n  if\(androidApp\(win\)\)\{showCenterNotice\(dialog,'You already have the app: you are playing in it\.'\);return;\}\n  win\.open\(`\$\{SITE\}\$\{appPath\(chosenLanguage\(\)\)\}`,'_blank','noopener'\);/,'the page in the farmer\'s language');
 assert.match(ui,/part\.app\?\(portalOff\('app'\)\?`<span translate="no">\$\{esc\(part\.app\.url\)\}<\/span>`:appChip\(\)\):part\.settings\?settingsChip\(part\.settings\)/,'on CrazyGames an app link stays words');
 assert.equal(gameAppPath('en'),'/app');assert.equal(gameAppPath('es'),'/es/app');assert.equal(appPath,gameAppPath,'one copy for the build and the chat');
 assert.match(read('public/chat.css'),/\.chat-text \.chat-settings-link span:first-of-type\{flex:none\}/,'"Settings" itself is never cut off');
 assert.match(ui,/dialog\.close\(\);win\.harvestSettings\(slug\);/);
 assert.match(read('public/game.js'),/window\.harvestSettings=part=>soundUI\.open\(part\);/);
 assert.match(read('public/sound-settings.js'),/nav\?\.openAt\(settingsPart\(part\)\?\.id\?\?\(part\?'unknown':null\)\);dialog\.showModal\(\);/);
 assert.match(read('public/sound-settings.js'),/\$\('sound-button'\)\.onclick=\(\)=>open\(\);/,'the button never passes its click as a part');
});

test('Settings opens at the part a link names, or on the list with a note when this farmer does not have it',()=>{
 const nav=read('public/settings-nav.js');
 assert.match(nav,/new MutationObserver\(\(\)=>\{if\(!dialog\.open\)return;const id=next;next=null;if\(id\)reveal\(id\);else show\(null\);\}\)\.observe\(dialog,\{attributes:true,attributeFilter:\['open'\]\}\);/);
 assert.match(nav,/if\(here&&win\?\.getComputedStyle\?\.\(part\)\.display!=='none'\)return;/,'a part put aside by CSS (CrazyGames, our apps) counts as not there');
 assert.match(nav,/That part of Settings is not available here\./);
 assert.match(nav,/filter\(n=>!n\.classList\?\.contains\('settings-copy'\)\)/,'the list\'s titles leave the Copy link button out');
 assert.match(nav,/const i=\[\.\.\.part\.querySelectorAll\('h3 \[data-game-art\],h3 \[data-lucide\],h3 \.game-art,h3 svg'\)\]\.find\(n=>!n\.closest\('\.settings-copy'\)\);/,'a row\'s picture is never the Copy link chain');
 assert.match(nav,/const away=p=>p\.hidden\|\|p\.matches\(AWAY\)\|\|!titleOf\(p\);/);
 assert.match(nav,/parts\(\)\.filter\(p=>!away\(p\)\)/,'no row for a part the CSS puts aside');assert.match(nav,/here=Boolean\(part\)&&!away\(part\);/);
 // AWAY is what android.css and portal.css put aside, part by part.
 const android=read('public/android.css'),portal=read('public/portal.css');
 assert.equal(AWAY,'html[data-app=android] #app-settings,html[data-portal] :is(#email-settings,#notify-settings,#app-settings)');
 assert.match(android,/html\[data-app=android\] #app-settings,[^{]*\{display:none!important\}/);
 for(const id of ['email-settings','notify-settings','app-settings'])assert.match(portal,new RegExp(`html\\[data-portal\\] #${id}[,{]`),id);
});

test('Copy link in Settings: for the admins and moderators only, never on CrazyGames, the part\'s own address',()=>{
 const nav=read('public/settings-nav.js'),cloud=read('src/game-cloud.js');
 assert.match(nav,/data-settings-copy="\$\{settingsLink\(slug\)\}" title="Copy link" aria-label="Copy link">\$\{WIKI_COPY_ICON\}/);
 assert.match(cloud,/if\(!portal\)void loadStaff\(bridge\.chat\)\.then\(\(\)=>\{if\(staffRole\(bridge\.playerId\)\)\{addSettingsCopyLinks\(document\.getElementById\('sound-dialog'\)\);addFeedbackCopyLink\(document\.getElementById\('feedback-dialog'\)\);\}\}\);/);
 assert.equal((cloud.match(/addSettingsCopyLinks\(/g)??[]).length,1,'nowhere else');
 assert.match(read('public/settings.css'),/html\[data-portal\] \.settings-copy\{display:none!important\}/);
 assert.doesNotMatch(read('public/sound-settings.js')+read('public/game.js'),/addSettingsCopyLinks/,'farmers\' Settings never adds them');
});

test('outside the game: /settings/<part> opens the game there, /app is a page; a link survives a sign-in elsewhere',()=>{
 assert.deepEqual(openIntent('?open=settings&part=farm-app'),{open:'settings',part:'farm-app'});
 assert.deepEqual(openIntent('?open=settings&part=nope'),{open:'settings'},'an unknown part: the list');
 assert.deepEqual(openIntent('?open=settings'),{open:'settings'});
 assert.equal(withoutOpen('https://x.example/?open=settings&part=chat&src=a'),'/?src=a');
 const vercel=JSON.parse(read('vercel.json')),slugs=SETTINGS_SLUGS.join('|');
 for(const source of [`/settings/:part(${slugs})`,`/settings/:part(${slugs})/`])assert.ok(vercel.redirects.some(r=>r.source===source&&r.destination==='/?open=settings&part=:part'&&r.permanent===false),source);
 for(const source of ['/settings','/settings/'])assert.ok(vercel.redirects.some(r=>r.source===source&&r.destination==='/?open=settings'),source);
 const codes=others.join('|');
 for(const source of ['/app','/app/'])assert.ok(vercel.rewrites.some(r=>r.source===source&&r.destination==='/app.html'),source);
 for(const source of [`/:lang(${codes})/app`,`/:lang(${codes})/app/`])assert.ok(vercel.rewrites.some(r=>r.source===source&&r.destination==='/:lang/app.html'),source);
 const cloud=read('src/game-cloud.js'),main=read('src/main.js');
 assert.match(cloud,/else if\(intent\?\.open==='settings'\)window\.harvestSettings\?\.\(intent\.part\);/);
 assert.match(main,/window\.harvestTakeOpen=\(\)=>\{const intent=pendingOpen;pendingOpen=null;keepOpen\(null\);return intent;\};/);
 assert.match(main,/pendingOpen=openIntent\(`\?\$\{new URLSearchParams/,'what was kept is checked again as a link');
});

test('the app page: legal-style, no script but the app mark, the badge to Play with its own referrer, the App Store ready behind one attribute',()=>{
 const html=read('public/app.html'),css=read('public/app-page.css');
 assert.match(html,/^<!doctype html>\n<html lang="en"><head>/);
 assert.match(html,/<link rel="canonical" href="https:\/\/www\.harvesttycoon\.com\/app">/);
 assert.ok(!/<script/i.test(html.replace('<script src="/android-app.js"></script>','')),'no scripts but the app mark');
 assert.doesNotMatch(html,/googletagmanager|gtag\(|fbq\(|\son[a-z]+="/i);
 assert.ok(html.includes('<a class="app-play" href="https://play.google.com/store/apps/details?id=com.harvesttycoon.app&amp;referrer=utm_source%3Dwebsite%26utm_medium%3Dapp-page" target="_blank" rel="noopener"><img src="/assets/badges/google-play-en.webp" alt="Get it on Google Play"'));
 assert.match(html,/<section class="app-option app-ios" id="iphone" aria-labelledby="iphone-title" data-app-store="off">/);
 assert.ok(html.includes('<div class="app-store-block">\n    <p>Get the free app on the App Store. Sign in with the same account and your farm is there.</p>\n    <a class="app-store-badge" data-app-store-link><img src="/assets/badges/app-store-en.webp" alt="Download on the App Store" width="168" height="56" decoding="async"></a>'),'Apple\'s badge, no guessed App Store address before Apple approves');
 assert.doesNotMatch(html,/apps\.apple\.com/);
 assert.match(css,/\.app-ios\[data-app-store=off\] \.app-store-block,\.app-ios\[data-app-store=on\] \.app-home-screen\{display:none\}/);
 assert.match(css,/html\[data-app\] \.app-in-app\{display:block\}/);assert.match(css,/html\[data-app\] \.app-options\{display:none\}/);
 assert.match(html,/<a class="legal-button" href="\/">Play in your browser<\/a>/);
 assert.doesNotMatch(html,/<img [^>]*src="[^"]*\.png"/,'pictures as WebP');
 assert.match(read('public/play.html'),/<span>© 2026 Harvest Tycoon<\/span><a class="footer-app" href="\/app">Get the app<\/a><a href="\/wiki">/);
 assert.match(read('public/support.html'),/<a class="footer-app" href="\/app">Get the app<\/a>/);
 for(const file of ['public/legal.css','public/welcome.css'])assert.match(read(file),/html\[data-app\] \.footer-app\{display:none!important\}/,file);
 assert.match(read('scripts/build-static.mjs'),/buildAppPages\('dist-static',readFileSync\('public\/app\.html','utf8'\)\);/);
});

test('the app page in every language: exact translations, its own address, the badge and links in that language, once in the sitemap',()=>{
 const out=mkdtempSync(join(tmpdir(),'app-page-'));
 try{
  writeFileSync(join(out,'sitemap.xml'),read('public/sitemap.xml'));
  const html=read('public/app.html'),english=buildAppPages(out,html);
  assert.equal(readFileSync(join(out,'app.html'),'utf8'),english);
  const keys=Object.entries(catalog()).filter(([,source])=>source==='public/app.html').map(([key])=>key);
  assert.ok(keys.length>12,'the page\'s texts are in the catalog');
  for(const code of others){
   const doc=readFileSync(join(out,code,'app.html'),'utf8'),dict=translations(code);
   assert.ok(doc.startsWith(`<!doctype html>\n<html lang="${code}"${code==='ar'?' dir="rtl"':''} data-page-lang="${code}"><head>`),code);
   assert.match(doc,new RegExp(`<link rel="canonical" href="${SITE}/${code}/app">`));
   assert.equal(doc.split(`src="${playBadge(code)}"`).length-1,2,`${code}: both badges in the page's language`);
   assert.ok(!/href="\/"/.test(doc)&&doc.includes(`href="/${code}/"`)&&doc.includes(`href="/${code}/support"`),`${code}: links in the same language`);
   assert.equal(doc.match(/<title>([^<]*)<\/title>/)[1],exact(dict,'Get the app — Harvest Tycoon'));
   for(const key of keys)if(exact(dict,key)!==key&&key.length>8)assert.ok(!doc.includes(`>${key}<`),`${code}: "${key}" is still English`);
  }
  buildAppPages(out,html);
  const xml=readFileSync(join(out,'sitemap.xml'),'utf8');
  for(const code of READY)assert.equal(xml.split(`<loc>${SITE}${appPath(code)}</loc>`).length,2,code);
  const dict={...translations('es')};delete dict['Harvest Tycoon on your phone'];
  assert.throws(()=>translateAppPage(english,'es',dict),/App page es: missing "Harvest Tycoon on your phone"/);
 }finally{rmSync(out,{recursive:true,force:true});}
});

test('the texts that state the link rule say it, in every language',()=>{
 const chat=wikiArticle('chat').html;
 assert.match(chat,/<li>No links, except to this wiki, the app page or a part of Settings: at most 2 in one message\.<\/li>/);
 assert.match(chat,/A Settings link shows the way there, such as Settings › Farm app\./);
 // On CrazyGames no app page (their build promotes no app) and no Farm app in Settings (4 Oct 2026 review).
 const portal=wikiArticle('chat',{portal:true}).html;
 assert.match(portal,/<li>No links, except to this wiki or a part of Settings: at most 2 in one message\.<\/li>/);
 assert.match(portal,/A link to this wiki or a part of Settings shows as a button that opens it\. A Settings link shows the way there, such as Settings › Sound\./);
 assert.doesNotMatch(portal,/app page|Farm app/);
 for(const {code,ready} of LANGUAGES)if(ready&&code!=='en'){
  const dict=translations(code),settings=exact(dict,'Settings'),farmApp=exact(dict,'Farm app');
  const fact=exact(dict,'A link to this wiki, the app page or a part of Settings shows as a button that opens it. A Settings link shows the way there, such as Settings › Farm app.');
  assert.ok(fact.includes(`${settings} › ${farmApp}`),`${code}: the way in the game's own words`);
  const portalFact=exact(dict,'A link to this wiki or a part of Settings shows as a button that opens it. A Settings link shows the way there, such as Settings › Sound.');
  assert.ok(portalFact.includes(`${settings} › ${exact(dict,'Sound')}`),`${code}: the way on CrazyGames`);
  for(const key of ['No links, except to this wiki, the app page or a part of Settings: at most 2 in one message.','No links, except to this wiki or a part of Settings: at most 2 in one message.','Get the app','That part of Settings is not available here.','You already have the app: you are playing in it.','The app is not available on CrazyGames.'])assert.ok(exact(dict,key),`${code}: ${key}`);
 }
});

// The Feedback window as a link (6 Oct 2026): the staff copy it beside Feedback's title, the chat shows it as a chip, the site opens it.
test('the Feedback link: /feedback opens the Feedback window, the chat shows a Feedback chip, the staff copy it beside the title',()=>{
 const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 assert.equal(FEEDBACK_LINK,'https://www.harvesttycoon.com/feedback');
 for(const url of [FEEDBACK_LINK,'harvesttycoon.com/feedback','https://harvesttycoon.com/feedback/','http://www.harvesttycoon.com/FEEDBACK'])assert.deepEqual(parseGameLink(url),{feedback:true},url);
 for(const url of ['https://www.harvesttycoon.com/feedbackx','https://www.harvesttycoon.com/feedback#x','https://evil.com/feedback'])assert.equal(parseGameLink(url),null,url);
 assert.deepEqual(gameLinksIn('Tell us: harvesttycoon.com/feedback!').map(({url,feedback})=>({url,feedback})),[{url:'harvesttycoon.com/feedback',feedback:true}]);
 assert.deepEqual(chatParts('Tell us here: https://www.harvesttycoon.com/feedback thanks'),[{text:'Tell us here: '},{feedback:{url:'https://www.harvesttycoon.com/feedback'}},{text:' thanks'}]);
 assert.deepEqual(openIntent('?open=feedback'),{open:'feedback'});
 const vercel=JSON.parse(read('vercel.json')),to=src=>(vercel.redirects??[]).find(r=>r.source===src)?.destination;
 assert.equal(to('/feedback'),'/?open=feedback');assert.equal(to('/feedback/'),'/?open=feedback');
 assert.match(read('src/game-cloud.js'),/else if\(intent\?\.open==='feedback'\)document\.getElementById\('feedback-button'\)\?\.click\(\);/);
 const ui=read('src/chat-ui.js');assert.match(ui,/const feedbackChip=\(\)=>`<button type="button" class="chat-wiki chat-feedback-link" data-feedback-link>\$\{art\('feedback'\)\}<span>Feedback<\/span><\/button>`;/);
 assert.match(ui,/if\(event\.target\.closest\('\[data-feedback-link\]'\)\)\{dialog\.close\(\);doc\.getElementById\('feedback-button'\)\?\.click\(\);return;\}/);
 const fb=read('public/feedback-ui.js');assert.match(fb,/const copy=dialog\.dataset\.copyLink==='on'\?`<button type="button" class="feedback-copy" data-feedback-copy title="Copy link" aria-label="Copy link">/);
 assert.match(fb,/copyGameLink\(event\.currentTarget,FEEDBACK_LINK,\{doc\}\)/);assert.match(read('public/retention.css'),/html\[data-portal\] \.feedback-copy\{display:none!important\}/);
 const sql=read('supabase/chat-feedback-link.sql');assert.match(sql,/execute replace\(def,'\|app\/\?\|settings\/\(','\|app\/\?\|feedback\/\?\|settings\/\('\);/);
 assert.match(sql,/if position\('feedback\/\?' in def\)>0 then return; end if;/,'re-runnable');
});
