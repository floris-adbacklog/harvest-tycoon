// Oct 2026: the Farmhouse (and the Family Hall) in Buildings and goods, links that land on the exact spot, names in tables that lead
// to where they are explained, a step back, and Copy link beside every heading with one canonical address (public/wiki-link.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {BUILDINGS,CROPS,MAX_PLOTS,STARTER_FIELDS,EARLY_FIELDS,ENDGAME_FIELDS,FEATURE_LEVELS,FAMILY_MIN_LEVEL,createFarm,expandFarm,levelOf,xpForLevel} from '../public/farm-state.js';
import {WIKI_TOPICS,wikiArticle,wikiSearch,wikiJump,wikiFields,wikiSectionTitle,parseWikiLink as fromContent} from '../public/wiki-content.js';
import {WIKI_SITE,WIKI_TOPIC_IDS,wikiLink,parseWikiLink,wikiLinksIn,WIKI_COPY_ICON} from '../public/wiki-link.js';
import {buildWiki,TOPIC_SCRIPT} from '../scripts/build-wiki.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const ids=html=>new Set([...html.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]));
const links=html=>[...html.matchAll(/<a [^>]*data-wiki-topic="([^"]+)"(?: data-wiki-anchor="([^"]+)")?/g)].map(m=>({topic:m[1],anchor:m[2]??''}));

test('one link form: wiki-link.js builds and reads https://www.harvesttycoon.com/wiki/<topic>#<spot>, the website\'s own address',()=>{
 assert.deepEqual([...WIKI_TOPIC_IDS],WIKI_TOPICS.map(t=>t.id),'the same topics as the wiki');
 assert.equal(WIKI_SITE,'https://www.harvesttycoon.com');
 assert.equal(wikiLink('buildings','building-farmhouse'),'https://www.harvesttycoon.com/wiki/buildings#building-farmhouse');
 assert.equal(wikiLink('crops'),'https://www.harvesttycoon.com/wiki/crops');
 assert.deepEqual(parseWikiLink('https://www.harvesttycoon.com/wiki/buildings#building-farmhouse'),{topic:'buildings',section:'building-farmhouse'});
 assert.deepEqual(parseWikiLink('harvesttycoon.com/wiki/crops'),{topic:'crops',section:''},'typed without https://');
 assert.deepEqual(parseWikiLink('https://harvesttycoon.com/wiki/quests/?fbclid=x#level-30'),{topic:'quests',section:'level-30'});
 for(const bad of ['http://www.harvesttycoon.com/wiki/crops','https://www.harvesttycoon.com/wiki','https://www.harvesttycoon.com/wiki/nope','https://evil.com/wiki/crops','https://www.harvesttycoon.com.evil.com/wiki/crops','https://www.harvesttycoon.com:8443/wiki/crops','https://x@www.harvesttycoon.com/wiki/crops','https://www.harvesttycoon.com/wiki/crops#<b>','https://www.harvesttycoon.com/play.html',' ',null,'javascript:alert(1)'])
  assert.equal(parseWikiLink(bad),null,String(bad));
 assert.equal(fromContent,parseWikiLink,'wiki-content.js hands on the same helper');
 assert.deepEqual(wikiLinksIn('Look: https://www.harvesttycoon.com/wiki/crops#crop-wheat. And harvesttycoon.com/wiki/market, not https://example.com/wiki/crops').map(l=>[l.url,l.topic,l.section]),[['https://www.harvesttycoon.com/wiki/crops#crop-wheat','crops','crop-wheat'],['harvesttycoon.com/wiki/market','market','']]);
 // Oct 2026 review: a wiki link starts a word, never the tail of another address; the index is where the link itself starts.
 for(const text of ['notharvesttycoon.com/wiki/crops','https://evilharvesttycoon.com/wiki/crops','https://evil.com/?r=harvesttycoon.com/wiki/crops','evil.com/harvesttycoon.com/wiki/crops','x.harvesttycoon.com/wiki/crops','user@harvesttycoon.com/wiki/crops','éharvesttycoon.com/wiki/crops'])
  assert.deepEqual(wikiLinksIn(text),[],text);
 assert.deepEqual(wikiLinksIn('(harvesttycoon.com/wiki/crops) and\nhttps://www.harvesttycoon.com/wiki/market').map(l=>[l.index,l.topic]),[[1,'crops'],[35,'market']]);
 assert.doesNotMatch(read('public/wiki-link.js'),/\(\?<[!=]/,'no lookbehind: older iPhones cannot read one, and the wiki loads this file');
 assert.doesNotMatch(read('public/wiki-link.js'),/^import /m,'no imports: the page around the game can use it');
 // The website serves exactly that path (vercel.json /wiki/:topic -> /wiki/<topic>.html) with that canonical address.
 assert.ok(JSON.parse(read('vercel.json')).rewrites.some(r=>r.source==='/wiki/:topic([a-z-]+)'&&r.destination==='/wiki/:topic.html'));
 assert.match(read('scripts/build-wiki.mjs'),/<article class="wiki-article" data-wiki-page="\$\{topic\.id\}">/);
});

test('every link in the wiki lands on a spot its topic has, on the website and in the game at every level',()=>{
 for(const ctx of [{},{level:1,href:id=>`#wiki-${id}`},{level:30,href:id=>`#wiki-${id}`},{level:200,href:id=>`#wiki-${id}`}]){
  const pages=Object.fromEntries(WIKI_TOPICS.map(t=>[t.id,wikiArticle(t.id,ctx).html]));
  for(const [from,html] of Object.entries(pages))for(const {topic,anchor} of links(html)){
   assert.ok(pages[topic],`${from} → ${topic}`);
   if(anchor)assert.ok(ids(pages[topic]).has(anchor),`${from} → ${topic}#${anchor} (${ctx.level??'website'})`);
  }
  // In the game a link never points at our website (CrazyGames allows no links to it): the spot rides along in data-wiki-anchor.
  if(ctx.href)for(const html of Object.values(pages))assert.doesNotMatch(html,/href="\/wiki/);
 }
 for(const hit of [...wikiSearch('farmhouse'),...wikiSearch('cheese'),...wikiSearch('corn')])if(hit.anchor)assert.ok(ids(wikiArticle(hit.topic).html).has(hit.anchor),hit.anchor);
});

test('the links that went to the top of a topic now go to the paragraph they mean',()=>{
 const link=(id,topic,anchor)=>assert.match(wikiArticle(id).html,new RegExp(`href="/wiki/${topic}#${anchor}" data-wiki-topic="${topic}" data-wiki-anchor="${anchor}"`),`${id} → ${topic}#${anchor}`);
 link('crops','buildings','building-farmhouse');link('getting-started','daily','sec-a-gift-every-day');link('market','helpers','sec-farm-stall');link('market','daily','sec-delivery-orders');
 link('helpers','crops','sec-silo-research');link('helpers','estate','sec-estate-chapters');link('chat','account','sec-feedback');link('quests','crops','sec-every-crop');
 // The Halloween Pass, while it is on sale: from Buying diamonds to its own part of Daily rewards.
 assert.match(wikiArticle('diamonds',{now:Date.UTC(2026,9,25)}).html,/href="\/wiki\/daily#sec-halloween-pass" data-wiki-topic="daily" data-wiki-anchor="sec-halloween-pass">Halloween Pass</);
 // A few "See X." at the end of a sentence, each its own piece of text, so the sentence before it keeps its translation.
 assert.match(wikiArticle('crops').html,/no harvest, no XP and no seed coins\. <span class="wiki-see">See <a href="\/wiki\/buildings#building-farmhouse"[^>]*>Farmhouse<\/a>\.<\/span><\/p>/);
 assert.match(wikiArticle('quests').html,/shows your level rewards\. <span class="wiki-see">See <a href="\/wiki\/quests#sec-what-opens-when"[^>]*>What opens when<\/a>\.<\/span>/);
});

test('the Farmhouse is the first row of Buildings and goods: what you do there, the level rule and every field from the rules',()=>{
 const html=wikiArticle('buildings').html,game=wikiArticle('buildings',{level:20,href:id=>`#wiki-${id}`}).html;
 const rows=[...html.matchAll(/<details class="wiki-section wiki-building" id="building-([a-z]+)">/g)].map(m=>m[1]);
 assert.deepEqual(rows.slice(0,2),['farmhouse','familyhall'],'the Farmhouse first, then the Family Hall, then the production buildings');
 assert.ok(html.indexOf('id="sec-how-buildings-work"')<html.indexOf('id="building-farmhouse"'));
 const farmhouse=html.match(/<details[^>]*id="building-farmhouse">[^]*?<\/details>/)[0];
 assert.match(farmhouse,/<summary><h3>[^]*?Farmhouse<\/h3><span class="wiki-meta"><span class="wiki-level">Level 1<\/span> Ready from the start<\/span>/);
 assert.match(farmhouse,new RegExp(`You start with ${STARTER_FIELDS} fields\\. Buy more here, one at a time, up to ${MAX_PLOTS}\\.`));
 assert.match(farmhouse,/<strong>Your fields<\/strong><p>Remove a crop to free its field\. You get nothing back\.<\/p>/,'the game\'s own words');
 assert.match(farmhouse,new RegExp(`<strong>Your next chapter <span class="wiki-level">Level ${FEATURE_LEVELS.projects}</span></strong><p>Estate projects, passive income and medals <span class="wiki-see">See <a href="/wiki/estate#sec-estate-chapters"`));
 assert.match(farmhouse,/<p>The Farmhouse level goes up by 1 with every field from field 13 on\. You do not upgrade it, and it gives no bonus of its own\.<\/p>/);
 // The table: fields 9-40, straight from the rules; checked against the game buying them one by one.
 const fields=wikiFields();assert.deepEqual(fields.map(f=>f.field),Array.from({length:MAX_PLOTS-STARTER_FIELDS},(_,i)=>STARTER_FIELDS+i+1));
 assert.deepEqual(fields.slice(0,EARLY_FIELDS.length).map(f=>[f.level,f.coins]),EARLY_FIELDS.map(f=>[f.level,f.coins]));
 assert.deepEqual(fields.slice(-ENDGAME_FIELDS.length).map(f=>[f.level,f.coins,f.materials]),ENDGAME_FIELDS.map(f=>[f.level,f.coins,{...f.materials}]));
 const farm=createFarm(Date.now());farm.xp=xpForLevel(95);farm.coins=1e9;for(const key of Object.keys(farm.inventory))farm.inventory[key]=1e6;
 for(const f of fields){const before=farm.buildings.farmhouse.level;assert.ok(levelOf(farm)>=f.level);const r=expandFarm(farm);assert.equal(r.cost,f.coins,`field ${f.field}`);assert.deepEqual(r.materials,f.materials);assert.equal(farm.buildings.farmhouse.level-before,f.field>=13?1:0,`field ${f.field} and the Farmhouse level`);}
 assert.equal(farm.plots.length,MAX_PLOTS);
 assert.equal((farmhouse.match(/<tr id=|<tr>|<tr class/g)??[]).length-1,MAX_PLOTS-STARTER_FIELDS,'one row per field');
 assert.match(farmhouse,/<td>Field 40<\/td><td><span class="wiki-level">Level 90<\/span><\/td><td>[^]*?1,400,000<\/td>/);
 assert.match(farmhouse,/<td>Field 9<\/td><td><span class="wiki-level">Level 2<\/span><\/td><td>[^]*?100<\/td><td>–<\/td>/,'the first fields ask no supplies');
 assert.match(farmhouse,/<td>Field 13<\/td><td><span class="wiki-level">Level 5<\/span><\/td>/,'fields 13-28 come after field 12, so from level 5');
 assert.match(game,/<tr class="is-locked"><td>Field 29<\/td><td><span class="wiki-level is-locked">From level 30<\/span>/,'in the game: from which level');
 assert.match(farmhouse,/<ul class="wiki-cards"><li class="wiki-card">[^]*?<strong>Field 9<\/strong>/,'cards on a phone');
 // The Family Hall: what it is for, from which level, and where to read more.
 const hall=html.match(/<details[^>]*id="building-familyhall">[^]*?<\/details>/)[0];
 assert.match(hall,new RegExp(`<span class="wiki-meta"><span class="wiki-level">Level ${FAMILY_MIN_LEVEL}</span></span>`));
 assert.match(hall,new RegExp(`<p>${BUILDINGS.familyhall.tagline}</p><p>Tap it on your farm to open your Farm family: start or join one`));
 assert.match(hall,/See <a href="\/wiki\/family" data-wiki-topic="family">Farm family<\/a>\./);
 // The jump bar and search find them; More fields leads to the row.
 const jump=wikiJump(wikiArticle('buildings'));assert.match(jump,/data-wiki-jump="building-farmhouse"/);assert.match(jump,/data-wiki-jump="building-familyhall"/);
 for(const word of ['farmhouse','expand','fields','family hall'])assert.ok(wikiSearch(word).some(h=>h.topic==='buildings'&&/^building-(farmhouse|familyhall)$/.test(h.anchor)),word);
 assert.match(wikiArticle('crops').html,/up to 40 in total\. See <a href="\/wiki\/buildings#building-farmhouse"/);
});

test('names in tables and lists lead to where they are explained; a row\'s own name and a closed row\'s level stay plain',()=>{
 const buildings=wikiArticle('buildings').html,crops=wikiArticle('crops').html,quests=wikiArticle('quests').html;
 const bakery=buildings.match(/<details[^>]*id="building-bakery">[^]*?<\/details>/)[0];
 assert.match(bakery,/<a class="wiki-item" href="\/wiki\/buildings#building-windmill" data-wiki-topic="buildings" data-wiki-anchor="building-windmill">[^]*?<span>[^<]*Flour<\/span><\/a>/,'a good: the building that makes it');
 assert.match(bakery,/<tr><td><span class="wiki-item">[^]*?<span>2 Fresh bread<\/span><\/span><\/td>/,'what a row makes is not a link to itself');
 assert.match(buildings,/<a class="wiki-item" href="\/wiki\/crops#crop-wheat" data-wiki-topic="crops" data-wiki-anchor="crop-wheat">/,'a crop: its row in Every crop');
 assert.match(crops,/<tr id="crop-wheat"><td><span class="wiki-item">/);assert.match(crops,/<li class="wiki-card" data-wiki-row="crop-wheat">/);
 assert.match(wikiArticle('estate').html,/data-wiki-anchor="sec-heirlooms"|data-wiki-anchor="building-/);
 // A level of What opens when has an id, so a link can point at it; level chips themselves stay plain.
 assert.match(quests,/<tr id="level-3"><td><span class="wiki-level">Level 3<\/span><\/td>/);assert.doesNotMatch(crops,/<a class="wiki-level/);
 assert.doesNotMatch(buildings,/<summary>(?:(?!<\/summary>)[^])*<a /,'no link inside a closed row\'s summary: a tap there opens the row');
 // What opens when: a chip leads to its crop, building or recipe; the Starter Pack (bought) stays as it was.
 assert.match(quests,/<a class="wiki-open" href="\/wiki\/buildings#building-bakery" data-wiki-topic="buildings" data-wiki-anchor="building-bakery">[^]*?<span>Bakery<\/span><small>building<\/small><\/a>/);
 assert.match(quests,/<a class="wiki-open" href="\/wiki\/crops#crop-lettuce"[^>]*>[^]*?<span>Lettuce<\/span><small>crop<\/small><\/a>/);
 assert.match(quests,/<a class="wiki-open" href="\/wiki\/helpers#sec-tractor"[^>]*>[^]*?<span>Tractor<\/span><\/a>/);
 assert.match(quests,/<span class="wiki-open" data-shop-only>/);
 const count=(html,re)=>(html.match(re)??[]).length;
 assert.ok(count(buildings,/<a class="wiki-item"/g)>300,'hundreds of names');assert.equal(count(quests,/<a class="wiki-open"/g)+1,count(quests,/class="wiki-open"/g),'every chip but the Starter Pack');
});

test('wikiSectionTitle names a spot for a link\'s chip: a section, a building, a crop or a level, else the topic',()=>{
 assert.equal(wikiSectionTitle('buildings','building-farmhouse'),'Farmhouse');
 assert.equal(wikiSectionTitle('crops','sec-every-crop'),'Every crop');
 assert.equal(wikiSectionTitle('crops','crop-wheat'),CROPS.wheat.name);
 assert.equal(wikiSectionTitle('quests','level-30'),'Level 30');
 assert.equal(wikiSectionTitle('crops',''),'Fields and crops');assert.equal(wikiSectionTitle('crops','sec-nope'),'Fields and crops');
 assert.equal(wikiSectionTitle('nope','sec-x'),null);assert.equal(wikiSectionTitle('quests','level-1'),'Quests and levels','no row for level 1');assert.equal(wikiSectionTitle('crops','crop-nope'),'Fields and crops');
 const {topic,section}=parseWikiLink('https://www.harvesttycoon.com/wiki/account#sec-feedback');assert.equal(wikiSectionTitle(topic,section),'Feedback');
 // Kept for the hour without a ctx (a chat names every link it shows): the same answer, much faster the second time.
 const first=performance.now();assert.equal(wikiSectionTitle('buildings','building-bakery'),'Bakery');const once=performance.now()-first;
 const again=performance.now();for(let i=0;i<50;i++)assert.equal(wikiSectionTitle('buildings','building-bakery'),'Bakery');assert.ok(performance.now()-again<once*5,'50 kept answers cost less than 5 fresh ones');
 assert.equal(wikiSectionTitle('quests','level-30',{level:20}),'Level 30','with a ctx: written fresh');
});

test('How to play: lands on the spot and lights it up, a step back, Copy link beside every heading but never on CrazyGames',()=>{
 const ui=read('public/wiki-ui.js'),css=read('public/wiki.css');
 // The way in for a chat link (track D): renderWiki(state, topic, spot, {from}).
 assert.match(ui,/export function renderWiki\(state,id=null,anchor='',\{from=null\}=\{\}\)\{farm=state;bind\(\);trail=from\?\.go\?\[\{label:String\(from\.label\?\?'Back'\),go:from\.go\}\]:\[\];if\(id\)topic\(id,anchor\);else home\(\);\}/);
 assert.match(ui,/const target=anchor&&reveal\(anchor\);\n if\(target\)land\(target\);else scrollTop\(\);/);
 assert.match(ui,/querySelector\(`\[data-wiki-row="\$\{CSS\.escape\(target\.id\)\}"\]`\)/,'a row hidden on a phone: its card');
 assert.match(ui,/mark\?\.classList\.add\('wiki-flash'\)/);assert.match(css,/@keyframes wiki-flash\{/);assert.match(css,/\.wiki \.wiki-flash\{border-radius:8px;animation:wiki-flash 1\.8s ease-out\}/);
 // Back: one step, with the words the game has already ("Back", or "Chat" when it came from there).
 assert.match(ui,/<span aria-hidden="true">‹<\/span> <span>\$\{esc\(step\.go\?step\.label:'Back'\)\}<\/span>/);
 assert.match(ui,/function go\(id,anchor=''\)\{\n if\(view\)\{trail\.push\(spot\(\)\);/);assert.match(ui,/if\(step\.go\)\{step\.go\(\);return;\}/);
 assert.match(ui,/const link=event\.target\.closest\('\[data-wiki-topic\]'\);if\(link\)\{event\.preventDefault\(\);go\(link\.dataset\.wikiTopic,link\.dataset\.wikiAnchor\);return;\}/);
 // Copy link: the canonical address, "Copied." on the button itself, nothing on CrazyGames (the code, and portal.css's mark as well).
 assert.match(ui,/function addCopy\(el,id\)\{\n if\(portal\(\)\)return;/);assert.match(ui,/data-wiki-copy="\$\{wikiLink\(id,head\.closest\('\.wiki-section'\)\.id\)\}" title="Copy link" aria-label="Copy link"/);
 assert.match(ui,/say\.textContent='Copied\.'/);assert.match(css,/html\[data-portal\] \.wiki-copy\{display:none!important\}/);
 assert.ok(ui.indexOf("closest('[data-wiki-copy]')")<ui.indexOf("closest('[data-wiki-install]')"),'the copy click is handled first, so a building row does not open or close');
 assert.doesNotMatch(ui,/\b(alert|prompt|confirm)\(/,'no pop-ups');assert.match(WIKI_COPY_ICON,/^<svg [^>]*aria-hidden="true"/);
});

test('the website wiki does the same: Copy link with the same address, and a link to a spot lands on it',async()=>{
 const out=mkdtempSync(join(tmpdir(),'wiki-links-'));await buildWiki(out);
 const page=readFileSync(join(out,'wiki','buildings.html'),'utf8');
 assert.match(page,/<article class="wiki-article" data-wiki-page="buildings">/);
 assert.ok(page.includes(TOPIC_SCRIPT));
 assert.match(TOPIC_SCRIPT,/b\.setAttribute\('data-wiki-copy','https:\/\/www\.harvesttycoon\.com\/wiki\/'\+topic\+'#'\+h\.closest\('\.wiki-section'\)\.id\)/);
 assert.match(TOPIC_SCRIPT,/say\.textContent='Copied\.'/);assert.match(TOPIC_SCRIPT,/getAttribute\('data-wiki-row'\)===id/);assert.match(TOPIC_SCRIPT,/classList\.add\('wiki-flash'\)/);
 assert.doesNotMatch(TOPIC_SCRIPT,/\b(alert|prompt|confirm)\(/);
 // Oct 2026 review: a broken address (#%E0) is no spot and stops nothing else; the link shown to copy by hand is shown once, and a tap in
 // it leaves a building's row as it is.
 assert.match(TOPIC_SCRIPT,/var id='';try\{id=decodeURIComponent\(location\.hash\.slice\(1\)\);\}catch\(e\)\{\}/);
 assert.match(TOPIC_SCRIPT,/closest\('\.wiki-copy-field'\)\)\{e\.preventDefault\(\);return;\}/);assert.match(read('public/wiki-ui.js'),/if\(event\.target\.closest\('\.wiki-copy-field'\)\)\{event\.preventDefault\(\);return;\}/);
 new Function(TOPIC_SCRIPT.replace(/^<script>|<\/script>$/g,''));
 assert.match(readFileSync(join(out,'wiki','crops.html'),'utf8'),/<tr id="crop-wheat">/);
});
