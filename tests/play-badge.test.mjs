import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {LANGUAGES,PLAY_BADGES,playBadge} from '../public/languages.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The Google Play badge in every website footer (Oct 2026): Google's own picture per language, to our Play page with a referrer, never
// in our Android app (the farmer is in it) and never on CrazyGames (no store links there).
const LINK='https://play.google.com/store/apps/details?id=com.harvesttycoon.app&amp;referrer=utm_source%3Dwebsite%26utm_medium%3Dfooter';
test('every website footer has the Google Play badge, linking to our Play page',()=>{
 for(const page of ['public/play.html','public/privacy.html','public/delete-account.html','public/partners.html','public/404.html','scripts/build-wiki.mjs']){
  const html=read(page);
  assert.ok(html.includes(`<span class="play-badge"><a href="${LINK}" target="_blank" rel="noopener"><img src="/assets/badges/google-play-en.webp" alt="Get it on Google Play"`),page);
 }
 assert.doesNotMatch(read('public/crazygames.html'),/play-badge|play\.google\.com/);
});
test('a badge per game language, WebP and small; Arabic shows the English one',()=>{
 for(const {code} of LANGUAGES){
  const file=playBadge(code);assert.match(file,/^\/assets\/badges\/google-play-[a-z]{2}\.webp$/);
  assert.ok(statSync(new URL(`../public${file}`,import.meta.url)).size<20000,file);
 }
 assert.equal(playBadge('ar'),'/assets/badges/google-play-en.webp');assert.ok(!PLAY_BADGES.includes('ar'));
});
test('the badge steps aside in the Android app, and the pages that show it load the app mark',()=>{
 for(const css of ['public/welcome.css','public/legal.css'])assert.match(read(css),/html\[data-app=android\] \.play-badge\{display:none!important\}/);
 for(const page of ['public/privacy.html','public/delete-account.html','public/partners.html','public/404.html'])assert.match(read(page),/<script src="\/android-app\.js"><\/script>/,page);
 for(const {code,ready} of LANGUAGES)if(ready&&code!=='en')assert.ok(JSON.parse(read(`public/i18n/${code}.json`))['Get it on Google Play'],code);
});
