import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the scenery loads after the farm is on screen and never stops the farm',()=>{
 const game=read('public/game.js');
 assert.match(game,/ready=true;setupMinimap\(\);positionBuildingLabels\(\);updateUI\(\);void addScenery\(\);/,'after the first frame, not during the loading screen');
 assert.match(game,/await loadInBatches\(SCENERY_MODELS\.filter\(name=>!models\.has\(name\)\),loadModel,4\);/);
 assert.match(game,/catch\(error\)\{console\.warn\('The extra scenery was skipped\.',error\);\}/,'a failure leaves the farm as it is');
});

test('every scenery model is in the pack, and together they stay small',()=>{
 const source=read('public/scenery.js'),names=[...new Set(source.match(/'[a-z]+(?:_[a-z]+)*_\d{3}'/g).map(s=>s.slice(1,-1)))];
 let bytes=0;
 for(const name of names){const file=new URL(`../public/assets/models/${name}.glb`,import.meta.url);assert(existsSync(file),name);bytes+=statSync(file).size;}
 assert(bytes<4_000_000,`${Math.round(bytes/1024)} KB`);
});

test('repeated pieces are instanced, everything stands still, and the front keeps to low things',()=>{
 const source=read('public/scenery.js');
 assert.match(source,/new THREE\.InstancedMesh\(mesh\.geometry,mesh\.material,list\.length\)/);
 for(const kind of ['firs','front','tufts'])assert.match(source,new RegExp(`Object\\.entries\\(${kind}\\)\\)instanced\\(`),kind);
 assert.match(source,/instanced\('plant_008',flowers,\{shadow:false\}\)/);
 assert.doesNotMatch(source,/requestAnimationFrame|\.tick|mixer/,'no animation: the animals stand still');
 assert.match(source,/ringPoint\(200\+rand\(\)\*150,/,'the front meadows');
 assert.match(source,/kind<\.7\?\[FRONT\[Math\.floor\(rand\(\)\*4\)\],\.7\+rand\(\)\*\.9,\.9\]:\[FRONT\[4\+Math\.floor\(rand\(\)\*4\)\],2\.2\+rand\(\)\*1\.4,1\.2\]/,'bushes and young trees of at most 3.6');
 assert.doesNotMatch(source.match(/const FRONT=\[[^\]]*\]/)[0],/hay/,'no hay in the meadows, where no tractor comes');
 assert.match(source,/if\(peaks\.length\)range\(-4,192,mobile\?28:17,57,53,/,'a second row of mountains at the sides and back only');
 assert.match(source,/if\(Math\.max\(Math\.abs\(p\.x\),Math\.abs\(p\.z\)\)>74\)continue;/,'never over the edge of the ground');
 assert.match(source,/const free=\(x,z,r=1\)=>!\(x>fields\[0\]-r/,'never on a field, the pond, a road or anything that stands');
});

test('a growing crop shows a ring that fills as it grows, its picture and the time (no extra water or care icon); gold and pulsing when Care is ready',()=>{
 const game=read('public/game.js'),css=read('public/retention.css');
 assert.match(game,/<span class="plot-timer-ring">\$\{art\(p\.crop\)\}<\/span><b class="plot-timer-time"><\/b>`;/,'built once per planting, without the extra icon');
 assert.ok(!game.includes('plot-timer-badge'),'the outer water/care icon is gone');
 assert.match(game,/v\.label\.style\.setProperty\('--grow',\(grown\*100\)\.toFixed\(1\)\);v\.label\.querySelector\('\.plot-timer-time'\)\.textContent=time;/,'each tick only the fill and the time');
 assert.match(css,/\.plot-label\.plot-timer\.care-ready \.plot-timer-ring\{animation:care-ask/,'the ring pulses when care opens');
 assert.doesNotMatch(game,/'✦ '|'↟ '/,'no more cryptic signs');
 assert.match(game,/\$\{Math\.floor\(m\/60\)\}h\$\{m%60\?String\(m%60\)\.padStart\(2,'0'\):''\}/,'phones show 1h20, not 2h');
 assert.match(css,/\.plot-timer-ring\{[^}]*conic-gradient\(#7fae4e calc\(var\(--grow,0\)\*1%\),#e9e1d0 0\)/);
 assert.match(css,/\.plot-label\.plot-timer\.care-ready\{border-color:#e0b04a;/);
});

test('every model the farm loads at the start is in the pack (a missing one stops the whole farm)',()=>{
 const game=read('public/game.js');
 const names=new Set([...game.matchAll(/modelNames(?:\.push\(|=\[)([^;]*)/g)].flatMap(m=>[...m[1].matchAll(/'([a-z]+(?:_[a-z]+)*_\d{3})'/g)].map(x=>x[1])));
 assert(names.has('house_019')&&names.has('pig_003'),'the Pig Farm');
 for(const name of names)assert(existsSync(new URL(`../public/assets/models/${name}.glb`,import.meta.url)),name);
});

test('the Pig Farm: level 29, truffles at the pace of the other animal buildings, an omelette in the Farm Kitchen',async()=>{
 const m=await import('../game/farm-state.js');
 const value=o=>Object.entries(o).reduce((sum,[k,n])=>sum+m.ITEMS[k].sell*n,0),perHour=id=>{const r=m.RECIPES[id];return (value(r.output)-value(r.input))/(r.duration/3600000);};
 assert.equal(m.BUILDING_LEVELS.pigfarm,29);assert.equal(m.BUILDINGS.pigfarm.model,'house_019');
 assert(perHour('vegetablefeast')>150&&perHour('vegetablefeast')<200,`vegetablefeast ${perHour('vegetablefeast')}`);
 // Feed is cheaper since 26 Sep 2026 (60, was 115), so the feed-fed truffle hunt now earns like the other feed-fed animals.
 assert(perHour('trufflehunt')>200&&perHour('trufflehunt')<300,`trufflehunt ${perHour('trufflehunt')}`);
 assert(perHour('truffleomelette')>200&&perHour('truffleomelette')<240,'like the other Farm Kitchen dishes');
 assert.equal(m.itemUnlockLevel('truffles'),29);assert.equal(m.itemUnlockLevel('truffleomelette'),30);
 // New goods join the Family Order from the week after release, so this week's orders stay the same for every family.
 assert.deepEqual(m.FAMILY_ORDER_FROM_WEEK,{truffles:2960,truffleomelette:2960});
 for(let week=2940;week<2960;week++)for(const k of Object.keys(m.familyOrder('f',week,3).lines))assert(!k.startsWith('truffle'),`week ${week}`);
});
// 25 Sep 2026: fewer loose props, none on a road or in a field, room around the animals, and the animals sideways to the camera.
test('the farm is tidier: fewer props, kept off roads and fields and clear of the animals, and the animals turned sideways',async()=>{
 const {PROPS_PER_YARD,ROAD_STEP,MEADOW_CLUMPS}=await import('../public/farm-props.js');
 assert.deepEqual([PROPS_PER_YARD,ROAD_STEP,MEADOW_CLUMPS],[2,14,18]);
 const game=read('public/game.js');
 assert.match(game,/const ANIMAL=\/\^\(cow\|horse\|pig\|sheep\|goat\|chicken\)_\/,FLAT_BLOCKS=\/\^\(road\|field\)_\/;/);
 assert.match(game,/blocked\.push\(ANIMAL\.test\(model\)\?box\.expandByScalar\(1\.2\):box\);/);
 // every animal faces left (about -0.8) or right (about 2.4) with a small margin, never head-on or from behind (0.8, -2.4)
 const turns=[...game.matchAll(/animalAt\('(?:cow|sheep|goat)_00\d',[-\d.]+,[-\d.]+,\{[^}]*rotation:([-\d.]+)\}/g)].map(m=>Number(m[1]))
  .concat([...game.matchAll(/\['(?:sheep|goat|horse)_00\d',[-\d.]+,[-\d.]+,([-\d.]+)\]/g)].map(m=>Number(m[1])),[...game.matchAll(/\['pig_00\d',[-\d.]+,[-\d.]+,[\d.]+,([-\d.]+)\]/g)].map(m=>Number(m[1])));
 assert.ok(turns.length>=15,`found ${turns.length} animals`);
 const off=r=>Math.min(...[-.8,2.4].map(side=>{const d=Math.abs(((r-side)%(2*Math.PI)+3*Math.PI)%(2*Math.PI)-Math.PI);return d;}));
 for(const r of turns)assert.ok(off(r)<=.75,`rotation ${r} faces the camera or away from it`);
 assert.doesNotMatch(game,/dairy:\[\[[^\]]*hay_002/,'no hay right behind the paddock horse');assert.doesNotMatch(game,/silo:\[\['hay_003'/,'nor inside the hay stack');
});
// 25 Sep 2026: after the green hills went, the valley became farmland with a forest edge; and no tree stands on a field.
test('the valley: a patchwork of neighbouring fields in front, a forest edge along the mountains, and nothing growing on a field',()=>{
 const life=read('public/farm-life.js'),scenery=read('public/scenery.js');
 assert.doesNotMatch(life,/landscape_004|mountain_009/,'no smooth green hills');
 const spots=life.match(/for\(const \[x0,z0,w,d,kind\] of (\[\[.*?\]\])\)/)[1];
 assert.equal(JSON.parse(spots.replace(/'/g,'"')).length,5,'five fields');
 assert.match(life,/KINDS=\{wheat:\['field_005',0xd7b654,false\],green:\['field_004',null,true\],ploughed:\['field_004',0x9c7a52,false\]\}/);
 assert.match(life,/return \(deg>-16&&deg<204\)\?\(sx\/A\)\*\*2\+\(sb\/B\)\*\*2<1:true;/,'clear of the mountain ring, which runs round to the left front');
 assert.match(life,/if\(\/\^\(tree\|fir_tree\|bush\)_\/\.test\(o\.userData\.model\?\?''\)&&fieldBoxes\.some/,'the fixed trees keep off the fields');
 assert.match(scenery,/if\(size\.x\*size\.z>120&&!\/\^field_\/\.test\(o\.userData\.model\?\?''\)\)\{terrain\.push\(mesh\);return;\}/,'a field is not ground for the forest to grow on');
 assert.match(scenery,/count=mobile\?3\+Math\.floor\(rand\(\)\*2\):5\+Math\.floor\(rand\(\)\*4\)/,'stands of firs close together');
 assert.match(scenery,/const front=ringPoint\(deg\+\(rand\(\)-\.5\)\*4,\(37\+rand\(\)\*2\)\*RING,\(34\+rand\(\)\*2\)\*RING\);/,'and young firs in front of them');
});
// 25 Sep 2026: the smaller buildings were brought up to the scale of the farmhouse and the barns, and a grove replaced the big
// wheat field in front of the Factory.
test('the smaller buildings are in scale with the rest, and trees stand where the Factory field was',()=>{
 const game=read('public/game.js'),life=read('public/farm-life.js');
 for(const [id,size] of [['mill','width:6.2'],['bakery','width:6.8'],['packing','width:5.1'],['kitchen','width:5.5,height:3.9,depth:4.8'],['familyhall','width:5.7'],['coop','width:4.25'],['glasshouse','width:6.5,height:3.25,depth:10.1'],['craftshop','width:9.4,height:3.25,depth:3.9']])
  assert.match(game,new RegExp(`addBuilding\\('${id}',[-\\d.]+,[-\\d.]+,\\{${size.replace(/\./g,'\\.')}`),id);
 assert.doesNotMatch(life,/\['field_005',15,29,25,11,0\]/,'no wheat field in front of the Factory');
 assert.match(life,/A grove where the big wheat field in front of the Factory was/);
});
