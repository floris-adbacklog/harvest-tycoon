import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CROPS,RECIPES} from '../public/farm-state.js';
import {WIKI_TOPICS,wikiArticle,wikiSearch,wikiTime} from '../public/wiki-content.js';
import {buildWiki} from '../scripts/build-wiki.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('every topic renders from the game rules without gaps, old drawn icons or broken links',()=>{
 assert.equal(WIKI_TOPICS.length,13);
 const ids=new Set(WIKI_TOPICS.map(t=>t.id));
 for(const t of WIKI_TOPICS){
  const a=wikiArticle(t.id);
  assert.doesNotMatch(a.html,/undefined|NaN|\[object|\.svg/,t.id);
  for(const [,id] of a.html.matchAll(/data-wiki-topic="([^"]+)"/g))assert.ok(ids.has(id),`${t.id} links to ${id}`);
  assert.ok(a.related.length&&a.related.every(Boolean),t.id);
 }
});

test('the tables list every crop and every recipe',()=>{
 const crops=wikiArticle('crops').html,buildings=wikiArticle('buildings').html;
 for(const c of Object.values(CROPS))assert.ok(crops.includes(c.name),c.name);
 const rows=(buildings.match(/<tr/g)??[]).length,tables=(buildings.match(/<table/g)??[]).length;
 assert.equal(rows-tables,Object.keys(RECIPES).length);
 assert.equal(wikiTime(120000),'2 min');assert.equal(wikiTime(5400000),'1 h 30 min');assert.equal(wikiTime(86400000),'1 d');
});

test('in the game what is above your level says from which level; the website just shows the level',()=>{
 const game=wikiArticle('crops',{level:20}).html,site=wikiArticle('crops').html;
 assert.match(game,/From level 23/);assert.match(game,/class="is-locked"/);
 assert.doesNotMatch(site,/From level|is-locked/);
});

test('search finds topics, crops, buildings and goods',()=>{
 assert.ok(wikiSearch('corn').some(h=>h.topic==='crops'));
 assert.ok(wikiSearch('cheese').some(h=>h.topic==='buildings'&&h.anchor));
 assert.ok(wikiSearch('tractor').some(h=>h.topic==='helpers'));
 assert.deepEqual(wikiSearch('  '),[]);
});

test('How to play opens the wiki',()=>{
 const html=read('public/farm.html'),game=read('public/game.js');
 assert.match(html,/<h2 id="help-title">How to play<\/h2>/);assert.match(html,/<div id="help-content"><\/div>/);
 assert.match(game,/renderWiki\(state\);openDialog\('help-dialog'\)/);
 assert.ok(html.indexOf('/wiki.css')>0&&html.indexOf('/wiki.css')<html.indexOf('/buttons.css'));
});

test('the website gets a page per topic, in the sitemap, linked from the footer',async()=>{
 const out=mkdtempSync(join(tmpdir(),'wiki-'));
 writeFileSync(join(out,'sitemap.xml'),'<?xml version="1.0"?>\n<urlset>\n</urlset>\n');
 assert.equal(await buildWiki(out),WIKI_TOPICS.length+1);await buildWiki(out);
 const pages=readdirSync(join(out,'wiki'));assert.equal(pages.length,WIKI_TOPICS.length+1);
 const crops=readFileSync(join(out,'wiki','crops.html'),'utf8');
 assert.match(crops,/<link rel="canonical" href="https:\/\/www\.harvesttycoon\.com\/wiki\/crops">/);
 assert.match(crops,/<a href="\/wiki">Game wiki<\/a>/);assert.match(crops,/href="\/wiki\/buildings" data-wiki-topic="buildings"/);
 const sitemap=readFileSync(join(out,'sitemap.xml'),'utf8');
 assert.equal((sitemap.match(/\/wiki<\/loc>/g)??[]).length,1,'added once');assert.match(sitemap,/\/wiki\/crops<\/loc>/);
 const vercel=JSON.parse(read('vercel.json'));
 assert.ok(vercel.rewrites.some(r=>r.source==='/wiki'&&r.destination==='/wiki/index.html'));
 assert.ok(vercel.rewrites.some(r=>r.source==='/wiki/:topic([a-z-]+)'&&r.destination==='/wiki/:topic.html'));
 assert.match(read('scripts/build-static.mjs'),/await buildWiki\('dist-static'\)/);
 for(const page of ['public/play.html','public/privacy.html','public/delete-account.html','public/404.html'])assert.match(read(page),/href="\/wiki">Game wiki</,page);
});
