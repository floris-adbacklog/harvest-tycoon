import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {LANGUAGES} from '../public/languages.js';
import {art} from '../public/visual-icons.js';
import {renderLanguageSettings} from '../public/language-settings.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Sep 2026: Settings > Language lists the languages to come, each with its painted flag; only English can be chosen so far.
test('every language has its painted flag; English and the fully translated languages can be chosen',()=>{
 assert.deepEqual(LANGUAGES.map(l=>l.code),['en','de','es','fr','id','nl','pt','tr','ru','ar','hi','zh','ja']);
 assert.deepEqual(LANGUAGES.filter(l=>l.ready).map(l=>l.code),['en','de','es']);
 for(const {code} of LANGUAGES){
  assert.ok(art(`flag-${code}`).includes(`src="/assets/icons/flag-${code}.webp"`),code);
  assert.ok(statSync(new URL(`../public/assets/icons/flag-${code}.webp`,import.meta.url)).size>2000,code);
 }
});

test('the Language dropdown in Settings: English chosen, the others greyed out as coming soon',()=>{
 globalThis.document??={querySelector:()=>null};const select={innerHTML:'',addEventListener(){},closest:()=>null};renderLanguageSettings(select);
 const options=[...select.innerHTML.matchAll(/<option [^>]*>[^<]*<\/option>/g)].map(m=>m[0]);
 assert.equal(options.length,LANGUAGES.length);
 assert.match(options[0],/value="en".*data-art="flag-en" selected>English</);
 const ready=LANGUAGES.filter(l=>l.ready).length;
 options.forEach((option,i)=>i<ready?assert.doesNotMatch(option,/disabled/):assert.match(option,/ disabled data-note="Coming soon">/));
 assert.deepEqual(options.map(o=>o.match(/value="(\w+)"/)[1]),[...LANGUAGES.filter(l=>l.ready),...LANGUAGES.filter(l=>!l.ready)].map(l=>l.code),'the languages you can choose come first');
 assert.match(read('public/farm.html'),/<section id="language-settings"[^>]*>.*<select id="language-select" aria-label="Language"><\/select><\/section>\s*<section id="privacy-settings"/s);
 const game=read('public/game.js');
 assert.ok(game.indexOf('renderLanguageSettings();')<game.indexOf('watchSelects();'),'the options are there before the dropdowns get the game look');
});
