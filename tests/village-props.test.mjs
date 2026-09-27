import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {ROADS,roadRects,roadSize,SPREAD,POND,pondBounds,placeIn,HOMES} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 27 Sep 2026: props from the ithappy Village pack (the farm's own models come from its Farm pack). The Village buildings did not
// match the rest, so only props: a bigger pond with a pier and boats, market stalls, and a tidier south of the farm.
const VILLAGE=['village_pier_001','village_boat_001','village_rowboat_001','village_stones_001','village_stall_001','village_stall_002','village_stall_003','village_stall_004','village_melons_001','village_barrels_001'];

test('the Village models are in the game, shaded like the rest, and share their own palette',()=>{
 for(const name of VILLAGE){
  const file=new URL(`../public/assets/models/${name}.glb`,import.meta.url);assert.ok(existsSync(file),name);
  const b=readFileSync(file),json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
  assert.equal(json.asset.extras?.bakedShade,true,`${name} has its baked shade`);
 }
 const atlas=read('public/model-atlas.js');
 assert.match(atlas,/const VILLAGE=\/\^village_\/;/);
 assert.match(atlas,/if\(VILLAGE\.test\(name\)\)shared=villageBase\?\?=map;/,'a Village model never gets the Farm palette, which would paint it in the wrong colours');
 assert.match(read('.gitignore'),/^assets-source\/$/m,'the bought pack itself stays out of the repository');
});

test('the pond is bigger and in the middle of the green, and one size is used everywhere',()=>{
 assert.deepEqual({...POND},{x:20.4,z:10.6,rx:7.4,rz:4.8});
 const [px,pz]=placeIn('pond',0,0),box=pondBounds();
 assert.deepEqual(box.map(v=>+v.toFixed(2)),[POND.x-POND.rx-1.4+px,POND.z-POND.rz-1+pz,POND.x+POND.rx+1.4+px,POND.z+POND.rz+.6+pz].map(v=>+v.toFixed(2)));
 assert.match(read('public/game.js'),/const pond=pondBounds\(\),fields=/);assert.match(read('public/scenery.js'),/const pond=pondBounds\(\),fields=/);
 assert.match(read('public/scene-polish.js'),/pondRect=pondBounds\(\)/);
 for(const file of ['public/game.js','public/scenery.js','public/scene-polish.js'])assert.doesNotMatch(read(file),/10\.4\+pondX/,file);
 const life=read('public/farm-life.js');
 assert.match(life,/oval\(POND\.rx,POND\.rz,32,/);assert.doesNotMatch(life,/bridge_001/,'the long plank bridge made way for a pier');
 for(const name of ['village_pier_001','village_boat_001','village_rowboat_001','village_stones_001'])assert.match(life,new RegExp(`scenery\\('${name}'`),name);
 assert.match(life,/\/\^\(tree\|fir_tree\)_\/\.test\(model\)\?1\.3/,'no tree stands in the water');
});

test('no road leads nowhere: the dead end below the fields is gone and the lane past the Farm stall meets the south road',()=>{
 assert.equal(ROADS.length,6);assert.ok(!ROADS.some(r=>r.z===31),'the road below the fields is gone');
 const lane=ROADS[1],south=ROADS[2],laneSize=roadSize(lane),southSize=roadSize(south);
 const laneEnd=lane.z*SPREAD+laneSize.depth/2,southOuter=south.z*SPREAD+southSize.depth/2;
 assert.ok(Math.abs(laneEnd-southOuter)<.05,`the lane runs to the far side of the south road (${laneEnd} vs ${southOuter})`);
 const southStart=south.x*SPREAD-southSize.width/2,laneOuter=lane.x*SPREAD-laneSize.width/2;
 assert.ok(Math.abs(southStart-laneOuter)<.05,`the south road starts at the lane's outer edge (${southStart} vs ${laneOuter})`);
 // The Farm stall stepped aside, so the road runs on beside it.
 const [sx,sz]=HOMES.stall.map(v=>v*SPREAD);
 assert.ok(!roadRects().some(r=>sx+1.5>r.minX&&sx-1.5<r.maxX&&sz+1.5>r.minZ&&sz-1.5<r.maxZ),'the Farm stall stands clear of every road');
 const life=read('public/farm-life.js');
 assert.match(life,/zone\('exact'\);scenery\('tree_008',-4\.7,27\.9,/,'a tree in front of the bend');
 assert.match(life,/Nothing grows on a road/);assert.match(life,/if\(rects\.some\(r=>x>r\.minX-\.2&&x<r\.maxX\+\.2&&z>r\.minZ-\.2&&z<r\.maxZ\+\.2\)\)o\.removeFromParent\(\);/);
});

test('Village stalls at the Farm stall, the Valley Market and in front of the Grand Valley Fair, greyed out with the Fair',()=>{
 const game=read('public/game.js');
 assert.match(game,/addUtility\('stall','village_stall_001',/);assert.match(game,/cloneModel\('village_stall_001',-2\.8,-24\.2,/);
 assert.match(game,/yardDecor\.grandfair\.push\(\.\.\.\[\['village_stall_001',34\.5\],\['village_stall_002',40\.5\],\['village_stall_003',47\],\['village_stall_004',53\.5\]\]\.map/);
 const loaded=new Set([...game.split('\n').filter(line=>/^const modelNames=|^modelNames\.push\(/.test(line)).join('\n').matchAll(/'([a-z_]+_\d+)'/g)].map(m=>m[1]));
 for(const name of ['village_stall_001','village_stall_002','village_stall_003','village_stall_004','village_melons_001','village_barrels_001'])assert.ok(loaded.has(name),name);
 assert.doesNotMatch(game,/'stall_002'/,'the old stall is no longer used');
 assert.match(game,/addUtility\('estateworkshop','house_005',42\.3,2\.2,\{width:10\.2,/,'the Estate Workshop is a fifth bigger');
});
