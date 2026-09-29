import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {LANGUAGES} from '../public/languages.js';
import {art} from '../public/visual-icons.js';
import {renderLanguageSettings} from '../public/language-settings.js';
import {renderLanguageSwitch} from '../src/language-switch.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Sep 2026: Settings > Language lists the languages to come, each with its painted flag; only English can be chosen so far.
test('every language has its painted flag; English and the fully translated languages can be chosen',()=>{
 assert.deepEqual(LANGUAGES.map(l=>l.code),['en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja']);
 assert.deepEqual(LANGUAGES.filter(l=>l.ready).map(l=>l.code),['en','de','es','fr','id','nl','pt','ru','hi','ja']);
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

// 29 Sep 2026: a small language switch under the sign-up form: a flag button with a little menu of the languages you can play in.
test('the sign-up page has a small language switch under the form with the translated languages',()=>{
 const on={};const node=()=>({addEventListener:(type,fn)=>{on[type]=fn;},setAttribute(){},querySelectorAll:()=>[]});
 globalThis.document??={};const doc=globalThis.document,added=doc.addEventListener;doc.addEventListener=()=>{};
 const host={innerHTML:'',hidden:true,querySelector:node,contains:()=>true};
 try{renderLanguageSwitch(host);}finally{doc.addEventListener=added;}
 assert.equal(host.hidden,false);assert.ok(on.click&&on.keydown,'the button opens the menu, the menu answers clicks and keys');
 assert.match(host.innerHTML,/^<button type="button" class="language-button" aria-haspopup="listbox" aria-expanded="false"><img src="\/assets\/icons\/flag-en\.webp"[^>]*><span lang="en">English<\/span>/);
 assert.match(host.innerHTML,/<ul class="language-menu( is-wide)?" role="listbox" aria-label="Language" hidden>/);
 assert.equal(host.innerHTML.includes("is-wide"),LANGUAGES.filter(l=>l.ready).length>6,"two columns from seven languages on");
 const options=[...host.innerHTML.matchAll(/<li role="option"[^>]* data-code="(\w+)"/g)].map(m=>m[1]);
 assert.deepEqual(options,LANGUAGES.filter(l=>l.ready).map(l=>l.code),'only the languages you can play in');
 assert.match(host.innerHTML,/data-code="en" lang="en" aria-selected="true"><img src="\/assets\/icons\/flag-en\.webp"[^>]*><span>English<\/span><svg class="language-check"/);
 assert.match(read('public/play.html'),/<p class="account-legal">.*?<\/p>\s*<div id="language-switch" class="language-switch" hidden><\/div>/);
 const main=read('src/main.js');assert.ok(main.indexOf('renderLanguageSwitch();')>main.indexOf('startTranslation();'));
});
