import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the scenery loads after the farm is on screen and never stops the farm',()=>{
 const game=read('public/game.js');
 assert.match(game,/ready=true;positionBuildingLabels\(\);updateUI\(\);void addScenery\(\);/,'after the first frame, not during the loading screen');
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
