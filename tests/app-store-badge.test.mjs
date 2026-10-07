import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LANGUAGES,APP_STORE_BADGES,appStoreBadge} from '../public/languages.js';
import {APP_STORE_URL} from '../public/game-links.js';
import {appStoreAddress,withAppStore,applyAppStore} from '../scripts/app-store-links.mjs';
import {translatePage,translateSupport,translateAppPage} from '../scripts/build-languages.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dictionary=code=>JSON.parse(read(`public/i18n/${code}.json`));
// The App Store badge (7 Oct 2026, the iPhone app in review): Apple's own picture per language first in every website footer, to the app
// page until Apple approves the app; then one address (APP_STORE_URL) and the deploy points every badge at the App Store.
const FOOTERS={'public/play.html':'/app','public/support.html':'/app','public/privacy.html':'/app','public/delete-account.html':'/app','public/partners.html':'/app','public/404.html':'/app','public/app.html':'#iphone','scripts/build-wiki.mjs':'/app'};
const BADGE=href=>`<span class="play-badge"><a class="app-store-badge" href="${href}" data-app-store-link><img src="/assets/badges/app-store-en.webp" alt="Download on the App Store" width="120" height="40" loading="lazy" decoding="async"></a>`;
test('every website footer starts with the App Store badge, to the app page until Apple has approved the app',()=>{
 for(const [page,href] of Object.entries(FOOTERS)){
  const html=read(page);
  assert.ok(html.includes(BADGE(href)),page);
  assert.equal(html.match(/data-app-store-link/g).length,page==='public/app.html'?2:1,page);
  assert.doesNotMatch(html,/apps\.apple\.com/,`${page}: no guessed App Store address`);
 }
 for(const page of ['public/crazygames.html','public/farm.html'])assert.doesNotMatch(read(page),/app-store-badge|data-app-store-link/,page);
});
test('a badge per game language, Apple\'s, WebP and small; Hindi shows the English one',()=>{
 for(const {code} of LANGUAGES){
  const file=appStoreBadge(code);assert.match(file,/^\/assets\/badges\/app-store-[a-z]{2}\.webp$/);
  const size=statSync(new URL(`../public${file}`,import.meta.url)).size;assert.ok(size>2000&&size<20000,file);
 }
 assert.equal(appStoreBadge('hi'),'/assets/badges/app-store-en.webp');assert.ok(!APP_STORE_BADGES.includes('hi'));
 assert.equal(appStoreBadge('ar'),'/assets/badges/app-store-ar.webp');
 for(const {code,ready} of LANGUAGES)if(ready&&code!=='en')assert.ok(dictionary(code)['Download on the App Store'],code);
});
test('the language pages show the badge in their language and link to their own app page',()=>{
 for(const {code,ready} of LANGUAGES){
  if(!ready||code==='en')continue;
  const dict=dictionary(code),alt=dict['Download on the App Store'].replaceAll('&','&amp;').replaceAll('"','&quot;');
  for(const [name,html] of [['home',translatePage(read('public/play.html'),code,dict)],['support',translateSupport(read('public/support.html'),code,dict)]]){
   assert.ok(html.includes(`<a class="app-store-badge" href="/${code}/app" data-app-store-link><img src="${appStoreBadge(code)}" alt="${alt}"`),`${name} ${code}`);
  }
  const app=translateAppPage(read('public/app.html'),code,dict);
  assert.ok(app.includes(`<a class="app-store-badge" href="#iphone" data-app-store-link><img src="${appStoreBadge(code)}"`),`app ${code}`);
  assert.ok(app.includes(`<a class="app-store-badge" data-app-store-link><img src="${appStoreBadge(code)}"`),`app ${code}: the iPhone part`);
  if(APP_STORE_BADGES.includes(code))assert.doesNotMatch(app,/app-store-en\.webp/,`app ${code}: no English badge left`);
 }
});
test('once approved: every badge to the App Store in a new tab, and the app page shows the App Store instead of the Home Screen steps',()=>{
 const url='https://apps.apple.com/nl/app/harvest-tycoon/id6741234567?l=en',live='https://apps.apple.com/app/harvest-tycoon/id6741234567';
 assert.equal(appStoreAddress(url),live,'without the country: every visitor gets their own store');
 assert.equal(appStoreAddress('https://apps.apple.com/app/id6741234567'),'https://apps.apple.com/app/id6741234567');
 for(const wrong of ['https://apps.apple.com/','http://apps.apple.com/app/id6741234567','https://example.com/app/id6741234567','https://apps.apple.com/app/harvest"><script>/id6741234567','apps.apple.com/app/id6741234567'])assert.throws(()=>appStoreAddress(wrong),/not an App Store app address/,wrong);
 const home=withAppStore(read('public/play.html'),url);
 assert.ok(home.includes(`<a class="app-store-badge" href="${live}" target="_blank" rel="noopener" data-app-store-link><img src="/assets/badges/app-store-en.webp"`));
 assert.doesNotMatch(home,/data-app-store-link[^>]*href="\/app"|href="\/app"[^>]*data-app-store-link/);
 assert.ok(home.includes('<a class="footer-app" href="/app">Get the app</a>'),'Get the app still opens the app page');
 const app=withAppStore(read('public/app.html'),url);
 assert.match(app,/<section class="app-option app-ios" id="iphone" aria-labelledby="iphone-title" data-app-store="on">/);
 assert.equal(app.match(new RegExp(`<a class="app-store-badge" href="${live.replaceAll('.','\\.')}" target="_blank" rel="noopener" data-app-store-link>`,'g')).length,2);
 assert.equal(withAppStore(home,url),home,'twice is the same as once');
 assert.equal(withAppStore(read('public/app.html'),null),read('public/app.html'),'null leaves the page as it is');
 const dir=mkdtempSync(join(tmpdir(),'app-store-'));
 try{
  mkdirSync(join(dir,'es'));writeFileSync(join(dir,'index.html'),read('public/play.html'));writeFileSync(join(dir,'es','app.html'),read('public/app.html'));writeFileSync(join(dir,'other.html'),'<p>no badge</p>');writeFileSync(join(dir,'x.css'),'a{}');
  assert.equal(applyAppStore(dir,null),0);
  assert.equal(applyAppStore(dir,url),2);
  assert.ok(readFileSync(join(dir,'es','app.html'),'utf8').includes('data-app-store="on"'));
  assert.equal(readFileSync(join(dir,'other.html'),'utf8'),'<p>no badge</p>');
  rmSync(join(dir,'index.html'));rmSync(join(dir,'es'),{recursive:true});
  assert.throws(()=>applyAppStore(dir,url),/no page has an App Store badge/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
// The English home page puts both badges in the farmer's language as it is shown (src/main.js): each its own store's picture.
test('the home page swaps each badge for its own store\'s picture in the farmer\'s language',()=>{
 const main=read('src/main.js');
 assert.match(main,/\[document\.querySelector\('\.play-badge \.app-store-badge img'\),appStoreBadge\(code\)\]/);
 assert.match(main,/\[document\.querySelector\('\.play-badge a:not\(\.app-store-badge\) img'\),playBadge\(code\)\]/);
 assert.doesNotMatch(main,/querySelector\('\.play-badge img'\)/,'the first picture is Apple\'s now');
});
// The alt text says what Apple's picture says (the badge's name is its words), and the app page's description is true before and after.
test('the alt text is the badge\'s own words; the app page promises nothing the App Store switch takes away',()=>{
 const WORDS={ar:'تنزيل من App Store',cs:'Stáhnout v App Store',de:'Laden im App Store',es:'Consíguelo en el App Store',hu:'Letölthető az App Store-ból',id:'Download di App Store',ja:'App Storeからダウンロード',nl:'Download in de App Store',pt:'Baixar na App Store',ru:'Загрузите в App Store',tr:"App Store'dan İndirin",uk:'Завантажити в App Store',zh:'App Store 下载'};
 for(const [code,words] of Object.entries(WORDS))assert.equal(dictionary(code)['Download on the App Store'],words,code);
 assert.doesNotMatch(read('public/app.html'),/Home Screen of your iPhone/,'the description stays true once the App Store replaces the Home Screen steps');
});
test('the address, the deploy step, the look and Apple\'s credit line',()=>{
 if(APP_STORE_URL!==null)assert.doesNotThrow(()=>appStoreAddress(APP_STORE_URL),'a set address must be an App Store app address');
 assert.match(read('scripts/build-static.mjs'),/applyAppStore\('dist-static',APP_STORE_URL\)/);
 for(const css of ['public/welcome.css','public/legal.css']){
  assert.match(read(css),/\.play-badge\{flex-basis:100%;display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px;/,css);
  assert.match(read(css),/html\[data-app=android\] \.play-badge\{display:none!important\}/,css);
 }
 assert.match(read('public/app-page.css'),/\.app-play img,\.app-option \.app-store-badge img\{display:block;width:auto;height:56px\}/);
 assert.match(read('public/app-page.css'),/\.app-ios\[data-app-store=on\]\{order:-1\}/,'once approved the iPhone section, with the App Store badge, comes first');
 assert.ok(read('public/privacy.html').includes('Apple and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other countries and regions. App Store is a service mark of Apple Inc.'));
});
