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
 assert.match(source,/kind<\.62\?\[FRONT\[Math\.floor\(rand\(\)\*4\)\],\.7\+rand\(\)\*\.9,\.9\]:kind<\.85\?\[FRONT\[4\+Math\.floor\(rand\(\)\*4\)\],2\.2\+rand\(\)\*1\.4,1\.2\]/,'bushes and young trees of at most 3.6');
 assert.match(source,/if\(peaks\.length\)range\(-4,192,mobile\?28:17,57,53,/,'a second row of mountains at the sides and back only');
 assert.match(source,/if\(Math\.max\(Math\.abs\(p\.x\),Math\.abs\(p\.z\)\)>74\)continue;/,'never over the edge of the ground');
 assert.match(source,/const free=\(x,z,r=1\)=>!\(x>fields\[0\]-r/,'never on a field, the pond, a road or anything that stands');
});

test('a growing crop shows a ring that fills as it grows, its picture, the time and a drop or leaf; gold when Care is ready',()=>{
 const game=read('public/game.js'),css=read('public/retention.css');
 assert.match(game,/<span class="plot-timer-ring">\$\{art\(p\.crop\)\}<\/span><b class="plot-timer-time"><\/b><span class="plot-timer-badge"><\/span>/,'built once per planting');
 assert.match(game,/v\.label\.style\.setProperty\('--grow',\(grown\*100\)\.toFixed\(1\)\);v\.label\.querySelector\('\.plot-timer-time'\)\.textContent=time;/,'each tick only the fill and the time');
 assert.match(game,/badge=p\.tended\|\|careReady\?'care':p\.watered\?'water':''/);
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
 for(const id of ['trufflehunt','vegetablefeast'])assert(perHour(id)>150&&perHour(id)<200,`${id} ${perHour(id)}`);
 assert(perHour('truffleomelette')>200&&perHour('truffleomelette')<240,'like the other Farm Kitchen dishes');
 assert.equal(m.itemUnlockLevel('truffles'),29);assert.equal(m.itemUnlockLevel('truffleomelette'),30);
 // New goods join the Family Order from the week after release, so this week's orders stay the same for every family.
 assert.deepEqual(m.FAMILY_ORDER_FROM_WEEK,{truffles:2960,truffleomelette:2960});
 for(let week=2940;week<2960;week++)for(const k of Object.keys(m.familyOrder('f',week,3).lines))assert(!k.startsWith('truffle'),`week ${week}`);
});
