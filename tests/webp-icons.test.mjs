import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {art,ART_KEYS} from '../public/visual-icons.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const icon=name=>new URL(`../public/assets/icons/${name}`,import.meta.url).pathname;

// The exact set this session converted (75-86% smaller, visually checked side by side against the originals at full size:
// no visible difference, including on gradient-heavy art like the honey jar and the gold medals).
const WEBP_SHEETS=['crops-v2','goods-v2','interface-v2'];
const WEBP_PICTURES=['vip','honey','rank-gold','family-bee','family-barn','rank-bronze','family-weekly-order',
'family-oak','rank-silver','family-members','familyhall','lock','family-tournament','family-management',
'berries','berrytart','berrypreserves','chore-harvestfair','pickledbeans','apples','applepie','applejuice',
'harvesthamper','berrycheesecake','stew','orchardsalad','orchardjuice','family-horseshoe','applecompote',
'chore-sorting','chore-irrigation','collect-all','activity-greenhouse','activity-apiary',
'instant-harvest','chore-troughs',
// The midgame expansion's crops and goods (painted with ChatGPT, delivered as WebP from the start).
'squash','polebeans','ciderapples','squashsoup','beeswax','wool','yarn','cloth','cider',
// Wave 2 (same set): cherries, the new goods, and the Valley Market and Ranch pictures.
'cherries','goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie','valley-market','ranch'];
// level-up.webp is real and converted too, but it is only ever used via a hardcoded <img> in progression-ui.js, never through art().
const WEBP_STANDALONE=[...WEBP_PICTURES,'level-up'];

test('the converted sprite sheets and pictures are served as WebP, are all present on disk, and are meaningfully smaller than their PNG originals',()=>{
 for(const name of WEBP_SHEETS){
  assert(existsSync(icon(`${name}.webp`)),`${name}.webp is missing`);
  assert(existsSync(icon(`${name}.png`)),`${name}.png must still exist too — nothing gets deleted`);
  assert(statSync(icon(`${name}.webp`)).size<statSync(icon(`${name}.png`)).size*.4,`${name}.webp should be well under half the PNG's size`);
 }
 for(const key of WEBP_STANDALONE){
  assert(existsSync(icon(`${key}.webp`)),`${key}.webp is missing`);
  assert(existsSync(icon(`${key}.png`)),`${key}.png must still exist too`);
  assert(statSync(icon(`${key}.webp`)).size<statSync(icon(`${key}.png`)).size*.4,`${key}.webp should be well under half the PNG's size`);
 }
 for(const key of WEBP_PICTURES)assert.match(art(key),new RegExp(`/assets/icons/${key}\\.webp`),`art('${key}') must actually request the .webp file`);
});
test('every sprite sheet reference (art() and the welcome-page CSS sheet) points at the .webp file',()=>{
 for(const name of WEBP_SHEETS){
  assert.match(read('public/visual-icons.js'),new RegExp(`file:'${name}\\.webp'`));
  assert.doesNotMatch(read('public/visual-icons.js'),new RegExp(`file:'${name}\\.png'`));
 }
 const welcome=read('public/welcome.css');
 for(const name of WEBP_SHEETS)assert.match(welcome,new RegExp(`/assets/icons/${name}\\.webp`));
});
test('pictures that were not converted still ask for a plain PNG (the extension swap is per-key, not global)',()=>{
 // (The Family Hall render and the windmill joined the second, larger batch: see tests/speed-seo.test.mjs.)
 for(const key of ['farmhouse','mill','dairy','coop','bakery','packing','stall','chores']){
  assert.match(art(key),new RegExp(`/assets/icons/${key}\\.png"`),`art('${key}') should still be a PNG`);
 }
});
test('every hardcoded icon path outside visual-icons.js was updated to match: the VIP badge, the level-up celebration, and the loading screen',()=>{
 assert.match(read('public/vip-ui.js'),/\/assets\/icons\/vip\.webp/);
 assert.doesNotMatch(read('public/vip-ui.js'),/\/assets\/icons\/vip\.png/);
 assert.match(read('public/progression-ui.js'),/\/assets\/icons\/level-up\.webp/);
 for(const file of ['public/play.html','public/farm.html']){
  const html=read(file);
  assert.match(html,/\/assets\/icons\/apples\.webp/,`${file} loading screen`);
  // The loading screen's tip picture is a WebP; the old row of crop icons (wheat and corn as PNG) is gone.
  assert.doesNotMatch(html,/\/assets\/icons\/(wheat|corn)\.png/,`${file} loading screen`);
 }
});
test('ART_KEYS still lists every converted key — nothing lost its entry when its extension changed',()=>{
 for(const key of WEBP_PICTURES)assert(ART_KEYS.includes(key),key);
});
// World II's levels 100-200 (Oct 2026): the 13 later goods (painted by the owner, 256 px) and the pictures of the seven later places and
// the five landmarks (renders of the Village pack, 512 px, scripts/render-village-pictures.py) are WebP from the start, never PNG.
const VILLAGE_GOODS_ART=['potatoes','clay','rooftile','flax','linen','builderscrate','lavender','lavendersoap','scentedsachet','silvercandlestick','rubyring','saffron','saffronbun'];
const VILLAGE_PICTURES=['villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller','landmark-windpump','landmark-longhouse','landmark-stonequay','landmark-lookout','landmark-greathall'];
test('World II\'s later goods, places and landmarks are WebP, never PNG',()=>{
 for(const [keys,side,most] of [[VILLAGE_GOODS_ART,256,30000],[VILLAGE_PICTURES,512,40000]])for(const key of keys){
  const file=icon(`${key}.webp`);assert(existsSync(file),`${key}.webp is missing`);assert(!existsSync(icon(`${key}.png`)),`${key}.png: new pictures are WebP only`);
  const b=readFileSync(file);assert.equal(b.toString('ascii',0,4)+b.toString('ascii',8,16),'RIFFWEBPVP8X','an extended WebP, with transparency');
  assert.deepEqual([1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)],[side,side],`${key}: ${side} px`);assert.ok(statSync(file).size<=most,`${key}.webp is ${statSync(file).size} bytes`);
  assert.match(art(key),new RegExp(`src="/assets/icons/${key}\\.webp"`),`art('${key}') asks for the .webp file`);assert.ok(ART_KEYS.includes(key),key);
 }
});
