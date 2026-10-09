import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildLanguagePages,READY} from '../scripts/build-languages.mjs';
import {buildWiki,namePictures} from '../scripts/build-wiki.mjs';
import {flag} from '../src/language-switch.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations} from '../scripts/i18n.mjs';
import {CROPS,EVENT_LEAGUES} from '../game/farm-state.js';

// 9 Oct 2026: Bing's site scan warns "Alt attribute for images is missing" for every page with an alt="" picture (its number per page
// is how deep the page is linked, not a count). Every picture on the pages it reads now has a name: a picture that means something on
// its own is read out (the farm valley behind the sign-in card); one with its name written right beside it is aria-hidden, so a screen
// reader still reads that name once, as before.
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const tempDir=(t,name)=>{const dir=mkdtempSync(join(tmpdir(),name));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;};
const pictures=html=>[...html.matchAll(/<img\b[^>]*>/g)].map(m=>m[0]);
const altOf=tag=>tag.match(/ alt="([^"]*)"/)?.[1];
const hidden=tag=>/ aria-hidden="true"/.test(tag);
const unescape=text=>text.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const HERO='A sunny farm valley in Harvest Tycoon with a red barn, a windmill, wheat and corn fields and a blue tractor';
const ICONS={'loading-tip-icon':'Tip','invite-friends.webp':'Invite a friend','browser-gate-art':'Farm app'};

test('the home page: the farm valley is described and read out; the small pictures beside their text are named and hidden',()=>{
 const play=read('public/play.html'),all=pictures(play);
 for(const tag of all)assert.ok(altOf(tag)?.trim(),`a name: ${tag}`);
 const hero=all.find(tag=>tag.includes('class="welcome-landscape"'));
 assert.equal(altOf(hero),HERO);assert.ok(!hidden(hero),'the farm valley means something on its own');
 for(const [mark,name] of Object.entries(ICONS)){const tag=all.find(t=>t.includes(mark));assert.equal(altOf(tag),name,mark);assert.ok(hidden(tag),`${mark} is beside its text`);}
 // A name is a text like any other: in the catalog, so every language translates it (the deploy build stops without one).
 const texts=catalog();for(const name of [HERO,...Object.values(ICONS)])assert.ok(name in texts,name);
 // The same size and look as before: only the alt and aria-hidden changed.
 assert.match(play,/<img class="welcome-landscape" src="\/assets\/farm-backdrop\.webp" alt="[^"]+" fetchpriority="high" width="1672" height="941">/);
});

test('every language page has the farm valley in its own language and no empty alt',t=>{
 const out=tempDir(t,'alt-languages-');
 buildLanguagePages(out,read('public/play.html'));
 for(const code of READY.filter(code=>code!=='en')){
  const page=readFileSync(join(out,code,'index.html'),'utf8'),dict=translations(code),all=pictures(page);
  for(const tag of all)assert.ok(altOf(tag)?.trim(),`${code}: ${tag}`);
  const hero=unescape(altOf(all.find(tag=>tag.includes('class="welcome-landscape"'))));
  assert.equal(hero,dict[HERO],code);assert.notEqual(hero,HERO,code);assert.doesNotMatch(hero,/·/,code);
  for(const [mark,name] of Object.entries(ICONS))assert.equal(unescape(altOf(all.find(tag=>tag.includes(mark)))),dict[name],`${code} ${mark}`);
 }
});

test('the language menu: a flag carries its language name and is hidden, as the name is written beside it',()=>{
 for(const {code,name} of LANGUAGES.filter(l=>l.ready))assert.equal(flag(code,name),`<img src="/assets/icons/flag-${code}.webp" alt="${name}" aria-hidden="true" width="20" height="20">`);
 assert.doesNotMatch(read('src/language-switch.js'),/alt=""/);
});

test('the website wiki: every picture has a name and is hidden from screen readers, as its name is beside it',async t=>{
 const out=tempDir(t,'alt-wiki-');await buildWiki(out);
 for(const file of readdirSync(join(out,'wiki'))){
  const page=readFileSync(join(out,'wiki',file),'utf8');
  assert.doesNotMatch(page,/alt=\\?"\\?"/,file);
  for(const tag of pictures(page.replace(/\\"/g,'"'))){
   assert.ok(altOf(tag)?.trim(),`${file}: ${tag}`);
   // The logo and the store badges keep their own alt; every game picture is named and hidden.
   if(!/harvest-tycoon-logo|\/badges\//.test(tag))assert.ok(hidden(tag),`${file}: ${tag}`);
  }
 }
 const page=name=>readFileSync(join(out,'wiki',`${name}.html`),'utf8');
 // A crop by its game name (not "12 Apples" from the line beside it); a league badge by its league; a chore by the name beside it.
 assert.match(page('crops'),/<img class="game-art " data-art="apples" src="[^"]+" alt="Apples" aria-hidden="true"/);
 for(const l of EVENT_LEAGUES)assert.match(page('events'),new RegExp(`<img class="wiki-league-badge" src="/assets/icons/league-${l.id}\\.webp" alt="${l.name}" aria-hidden="true"`));
 assert.match(page('helpers'),/data-art="chore-weeds" src="[^"]+" alt="Clear the paths" aria-hidden="true"/);
 assert.match(page('account'),/<img src="\/assets\/avatars\/family-farmer\.webp" alt="Family farmer" aria-hidden="true"/);
 // A building's small product pictures sit in a row that is hidden from screen readers already; they carry their names too.
 assert.match(page('buildings'),/<span class="wiki-makes" aria-hidden="true"><img class="game-art " data-art="[a-z]+" src="[^"]+" alt="[^"]+" aria-hidden="true"/);
 const search=JSON.parse(readFileSync(join(out,'wiki','search.json'),'utf8'));
 for(const [key,html] of Object.entries(search.arts))if(html.startsWith('<img'))assert.match(html,/ alt="[^"]+" aria-hidden="true"/,key);
 assert.match(search.arts.apples,/ alt="Apples" aria-hidden="true"/);
});

test('a wiki picture is named by the game first, then by the name beside it, then by its own key',()=>{
 assert.equal(namePictures('<img data-art="corn" alt=""><span>12 Corn</span>'),`<img data-art="corn" alt="${CROPS.corn.name}" aria-hidden="true"><span>12 Corn</span>`);
 assert.equal(namePictures('<img data-art="family-chest-wood" alt="">Wooden chest</td>'),'<img data-art="family-chest-wood" alt="Wooden chest" aria-hidden="true">Wooden chest</td>');
 assert.equal(namePictures('<img data-art="chat" alt=""><div><strong>Global &amp; family</strong>'),'<img data-art="chat" alt="Global &amp; family" aria-hidden="true"><div><strong>Global &amp; family</strong>');
 // Nothing beside it (a closing tag, another picture, a search box): the fallback, else the key in words.
 assert.equal(namePictures('<img data-art="guide" alt=""><input type="search">'),'<img data-art="guide" alt="Guide" aria-hidden="true"><input type="search">');
 assert.equal(namePictures('<img data-art="live-events" alt=""></span>','Events'),'<img data-art="live-events" alt="Events" aria-hidden="true"></span>');
 assert.equal(namePictures('<img src="/a.webp" alt="Logo">'),'<img src="/a.webp" alt="Logo">','a picture with a name keeps it');
});

test('the partner programme page: every media kit picture is named after what it is and hidden, as its label is beside it',()=>{
 const page=read('public/partners.html');
 assert.doesNotMatch(page,/alt=""/);
 for(const tag of pictures(page).filter(tag=>!/harvest-tycoon-logo\.webp|\/badges\//.test(tag))){assert.match(altOf(tag),/^Harvest Tycoon /,tag);assert.ok(hidden(tag),tag);}
});
