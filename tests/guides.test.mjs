import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildGuides} from '../scripts/build-guides.mjs';
import {GUIDES,cropEarnings} from '../scripts/guides-content.mjs';
import {CROPS,STARTER_COINS,BEGINNER_QUESTS,BEGINNER_REWARD,caredDuration,FAMILY_MIN_LEVEL} from '../public/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Oct 2026 (the owner's choice 1 and 2): five guides and what makes a good farming game, at /guides, English first.
test('six guides at /guides, each a page of its own in the sitemap',()=>{
 assert.deepEqual(GUIDES.map(g=>g.slug),['play-farming-game-in-browser','beginners-first-hour','earn-coins-fast','best-crops-by-level','farming-with-friends','what-makes-a-good-farming-game']);
 const dir=mkdtempSync(join(tmpdir(),'guides-'));
 try{
  writeFileSync(join(dir,'sitemap.xml'),'<urlset>\n</urlset>');
  assert.equal(buildGuides(dir,{languages:['en']}),7);buildGuides(dir,{languages:['en']});
  const map=readFileSync(join(dir,'sitemap.xml'),'utf8');
  assert.equal((map.match(/<loc>https:\/\/www\.harvesttycoon\.com\/guides<\/loc>/g)??[]).length,1,'once, even built twice');
  for(const g of GUIDES){
   assert.ok(map.includes(`/guides/${g.slug}</loc>`));
   const html=readFileSync(join(dir,'guides',`${g.slug}.html`),'utf8');
   assert.match(html,new RegExp(`<link rel="canonical" href="https://www\\.harvesttycoon\\.com/guides/${g.slug}">`));
   assert.ok(html.includes(`<h1>${g.title.replace(/&/g,'&amp;')}</h1>`)||html.includes(g.title),g.slug);
   assert.match(html,/<a href="\/guides">Guides<\/a>/,'the footer links the guides');
   assert.doesNotMatch(html,/ · /,'no middle dots');
  }
  assert.ok(existsSync(join(dir,'guides','index.html')));
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('their numbers are the game\'s own, so they stay true',()=>{
 const html=Object.fromEntries(GUIDES.map(g=>[g.slug,g.body()]));
 const all=cropEarnings();
 assert.equal(all.length,Object.keys(CROPS).length,'every crop');
 for(const c of all)assert.ok(html['best-crops-by-level'].includes(`<td>${c.name}</td>`),c.name);
 const corn=all.find(c=>c.key==='corn');assert.equal(corn.cared,caredDuration({},'corn'));assert.equal(corn.perHarvest,CROPS.corn.sell-CROPS.corn.cost);
 assert.match(html['beginners-first-hour'],new RegExp(`starts with ${STARTER_COINS} coins`));
 assert.match(html['beginners-first-hour'],new RegExp(`The guide has ${BEGINNER_QUESTS.length} steps.*${BEGINNER_REWARD} diamonds`));
 for(const q of BEGINNER_QUESTS)assert.ok(html['beginners-first-hour'].includes(q.title.replace(/'/g,'’'))||html['beginners-first-hour'].includes(q.title),q.id);
 assert.match(html['farming-with-friends'],new RegExp(`From level ${FAMILY_MIN_LEVEL} you can start a Farm family`));
});

test('served at /guides, in the Markdown copies and llms.txt as their own part, and linked from the wiki',()=>{
 const rewrites=JSON.parse(read('vercel.json')).rewrites;
 assert.deepEqual(rewrites.filter(r=>r.source.startsWith('/guides')).map(r=>[r.source,r.destination]),[['/guides','/guides/index.html'],['/guides/','/guides/index.html'],['/guides/:slug([a-z-]+)','/guides/:slug.html']]);
 const codes='cs|de|es|fr|id|hu|nl|pt|tr|ru|uk|hi|ja|ar|zh';
 assert.deepEqual(rewrites.filter(r=>r.source.includes(')/guides')).map(r=>[r.source,r.destination]),[[`/:lang(${codes})/guides`,'/:lang/guides/index.html'],[`/:lang(${codes})/guides/`,'/:lang/guides/index.html'],[`/:lang(${codes})/guides/:slug([a-z-]+)`,'/:lang/guides/:slug.html']]);
 assert.match(read('scripts/build-static.mjs'),/await buildWiki\('dist-static'\);\n[^\n]*\nconst \{buildGuides\}=await import\('\.\/build-guides\.mjs'\);buildGuides\('dist-static'\);/);
 assert.match(read('scripts/build-ai-markdown.mjs'),/const CATEGORY_ORDER=\['Main pages','Guides','Game wiki','Privacy and partners'\];/);
 assert.match(read('scripts/build-wiki.mjs'),/ <a href="\/wiki">Game wiki<\/a>\n <a href="\/guides">Guides<\/a>\n/);
});

// 29 Oct 2026 (the owner: "alle 15"): every guide in every ready language, from the game's translations, each naming all of them.
test('every guide in all 16 languages: translated words, the game\'s own numbers, its own address and the others named',async()=>{
 const {READY}=await import('../scripts/build-languages.mjs');
 const dir=mkdtempSync(join(tmpdir(),'guides-all-'));
 try{
  writeFileSync(join(dir,'sitemap.xml'),'<urlset>\n</urlset>');
  assert.equal(buildGuides(dir),7*READY.length,'a missing translation would stop it');
  const map=readFileSync(join(dir,'sitemap.xml'),'utf8');
  for(const code of READY){
   const base=code==='en'?'':`/${code}`;
   assert.ok(map.includes(`<loc>https://www.harvesttycoon.com${base}/guides/best-crops-by-level</loc>`),code);
   const html=readFileSync(join(dir,`${base.slice(1)}${base?'/':''}guides/best-crops-by-level.html`),'utf8');
   assert.match(html,new RegExp(`<html lang="${code}"`));
   assert.match(html,new RegExp(`<link rel="canonical" href="https://www\\.harvesttycoon\\.com${base}/guides/best-crops-by-level">`));
   for(const other of READY)assert.ok(html.includes(`hreflang="${other}"`),`${code} names ${other}`);
   if(code!=='en'){
    assert.doesNotMatch(html,/Which crop to plant depends on how long/,`${code} is translated`);
    assert.match(html,new RegExp(`href="/${code}/guides/earn-coins-fast"`),'links stay in the language');
    assert.match(html,/href="\/wiki\/crops/,'the wiki is English only');
   }
  }
  const ru=readFileSync(join(dir,'ru','guides','best-crops-by-level.html'),'utf8');assert.match(ru,/2 ч/,'hours the language\'s way');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
