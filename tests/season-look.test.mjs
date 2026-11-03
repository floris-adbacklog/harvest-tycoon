import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const glb=name=>{const b=readFileSync(new URL(`public/assets/models/${name}.glb`,root));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));};
const triangles=name=>{const json=glb(name);let t=0;for(const m of json.meshes)for(const p of m.primitives)t+=json.accessors[p.indices].count/3;return t;};

// 3 Nov 2026 (the owner picked 1, 2 and 3 from the ithappy Studios Vegetation pack): the trees and bushes in the season's colours, water
// lilies and cattails on the pond and the village lake, tulips and leafy tufts round the yard. Look only.
test('the farm\'s season: the Season Pass\'s open season, else the date\'s, and ?season= for the harness',async()=>{
 const {farmSeason}=await import('../public/season-look.js'),at=(y,m,d)=>Date.UTC(y,m-1,d,12);
 assert.equal(farmSeason(at(2026,11,3),''),'autumn','Autumn 2026 is open');
 assert.equal(farmSeason(at(2026,12,23),''),'winter','Winter 2026 from 22 December');
 assert.equal(farmSeason(at(2027,4,10),''),'spring');assert.equal(farmSeason(at(2027,7,10),''),'summer');assert.equal(farmSeason(at(2027,10,1),''),'autumn');
 assert.equal(farmSeason(at(2027,1,10),''),'winter');
 for(const s of ['spring','summer','autumn','winter'])assert.equal(farmSeason(at(2026,11,3),`?season=${s}`),s);
 assert.equal(farmSeason(at(2026,11,3),'?season=monsoon'),'autumn','anything else: the real season');
});

test('every swap is a Vegetation model in the game, the crops keep their own, and a phone draws about as much as before',async()=>{
 const {SEASON_SWAPS,seasonFile}=await import('../public/season-look.js'),{CROPS}=await import('../game/farm-state.js');
 const cropModels=new Set(Object.values(CROPS).map(c=>c.model));
 assert.deepEqual(SEASON_SWAPS.summer,{},'summer is the farm as it always was');
 for(const [season,swaps] of Object.entries(SEASON_SWAPS))for(const [farm,veg] of Object.entries(swaps)){
  assert.ok(existsSync(new URL(`public/assets/models/${farm}.glb`,root)),farm);
  assert.match(veg,/^veg_/);assert.ok(existsSync(new URL(`public/assets/models/${veg}.glb`,root)),veg);
  assert.ok(!cropModels.has(farm),`${farm} is a crop's model: a field would change with the season (${season})`);
  // The light bush (hundreds of them on a phone) stays light; nothing doubles what it draws.
  assert.ok(triangles(veg)<=Math.max(triangles(farm)*2,700),`${veg} for ${farm} (${season}): ${triangles(veg)} triangles, was ${triangles(farm)}`);
 }
 assert.equal(seasonFile('bush_001','autumn'),'bush_001','the small round bush stays green in autumn: the valley must not turn yellow');
 assert.equal(seasonFile('bush_001','winter'),'veg_bush_014');assert.equal(triangles('veg_bush_014'),triangles('bush_001'));
 assert.equal(seasonFile('tree_009','winter'),'tree_009','the apple tree is a crop');
 const game=read('public/game.js');
 assert.match(game,/let file=seasonFile\(name,farmLook\),gltf=await fetchModel\(file\);\n if\(!gltf&&file!==name\)\{file=name;gltf=await fetchModel\(name\);\}/,'its own model when the season\'s cannot come');
 assert.match(game,/models\.set\(name,\{object:group,size\}\)/,'the model keeps the farm\'s name');
});

test('the pond, the lake and the yard in bloom: after the rest, with their own generator and budget, and no tulips in the snow',()=>{
 const scenery=read('public/scenery.js'),lake=read('public/lake-plants.js'),game=read('public/game.js');
 const nine=scenery.indexOf(' // 9. The pond and the yard in bloom'),eight=scenery.indexOf(' // 8. More life');
 assert.ok(eight>0&&nine>eight,'after everything else, so 1-8 stand where they stood');
 assert.match(scenery.slice(nine),/const bloom=seeded\(20261103\)/);assert.doesNotMatch(scenery.slice(nine,scenery.indexOf('instanced(POND_PLANTS[0]')),/\brand\(\)/,'never the scenery\'s own generator');
 assert.match(scenery,/let bloomSpent=0;const bloomBudget=mobile\?10000:30000;/);
 assert.match(scenery,/if\(season!=='winter'\)tulips\[name\]\.push/);
 assert.match(scenery,/buildScenery\(\{scene,models,mobile=false,clear=null,keepOff=\[\],season='autumn'\}\)/);
 assert.match(lake,/const KEEP_CLEAR=\[\[VILLAGE_FISHING_SPOT\.x,VILLAGE_FISHING_SPOT\.z,3\],\[VILLAGE_FISHING_SPOT\.float\.x,VILLAGE_FISHING_SPOT\.float\.z,3\],\[VILLAGE_HARBOUR_BOAT\.x,VILLAGE_HARBOUR_BOAT\.z,4\]\];/,'the fishing boat, its float and the harbour boat keep open water');
 assert.match(game,/import\('\.\/lake-plants\.js'\)\.then\(/,'loaded only in the village, once it is on screen');
 assert.match(game,/console\.warn\('The lake plants were skipped\.',error\)/,'a failure leaves the village as it is');
});

test('Settings › Graphics: Automatic or one of the four seasons, kept on this device, and the farm opens again with it',async()=>{
 const {farmSeason,chosenSeason,chooseSeason,SEASON_CHOICE_KEY}=await import('../public/season-look.js');
 const kept=new Map(),storage={getItem:k=>kept.get(k)??null,setItem:(k,v)=>kept.set(k,v),removeItem:k=>kept.delete(k)},now=Date.UTC(2026,10,3,12);
 assert.equal(chosenSeason(storage),'');assert.equal(farmSeason(now,'',storage),'autumn','Automatic: the game\'s');
 chooseSeason('winter',storage);assert.equal(kept.get(SEASON_CHOICE_KEY),'winter');assert.equal(farmSeason(now,'',storage),'winter');
 assert.equal(farmSeason(now,'?season=spring',storage),'spring','the harness\'s ?season= first');
 chooseSeason('',storage);assert.equal(kept.has(SEASON_CHOICE_KEY),false,'Automatic keeps nothing');
 kept.set(SEASON_CHOICE_KEY,'monsoon');assert.equal(farmSeason(now,'',storage),'autumn','anything else: the game\'s');
 assert.equal(farmSeason(now,'',{getItem(){throw new Error('blocked');}}),'autumn','no storage: the game\'s');
 const html=read('public/farm.html'),game=read('public/game.js');
 assert.match(html,/<section id="graphics-settings"[^]*<select id="season-look" data-pretty="compact"><option value="">Automatic<\/option><option value="spring">Spring<\/option><option value="summer">Summer<\/option><option value="autumn">Autumn<\/option><option value="winter">Winter<\/option><\/select>/);
 assert.match(game,/season\.onchange=\(\)=>\{chooseSeason\(season\.value\);\$\('graphics-status'\)\.textContent='Opening your farm again…';reopen\(\);\};/);
});
