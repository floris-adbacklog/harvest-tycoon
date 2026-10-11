import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import nodeModule from 'node:module';
import {ROADS,roadRects,roadSize,SPREAD,POND,pondBounds,placeIn,HOMES} from '../public/farm-layout.js';
import {createFarm,normalizeFarm,xpForLevel,recipeUnlocked,worldTwoBuilding,BUILDINGS,MAX_BUILDING_LEVEL,VILLAGE_LANDMARKS} from '../game/farm-state.js';
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

// 27 Sep 2026: during the deploy a player got "Your farm could not load" for village_rowboat_001.glb. A 404 under /assets/ is cached
// for a day (vercel.json), so one missing decorative model kept the whole farm shut. Now it is asked for once more past the cache,
// and if it still fails the farm opens without it.
test('one model that will not load never keeps the farm shut',()=>{
 const game=read('public/game.js');
 assert.match(game,/try\{return await gltfLoader\.loadAsync\(`\/assets\/models\/\$\{name\}\.glb`\);\}/);
 assert.match(game,/try\{return await gltfLoader\.loadAsync\(`\/assets\/models\/\$\{name\}\.glb\?fresh=\$\{Date\.now\(\)\}`\);\}/,'the second try goes past the browser cache');
 assert.match(game,/if\(!gltf\)\{const group=new THREE\.Group\(\),stand=new THREE\.Mesh\(new THREE\.BoxGeometry\(1,1,1\),new THREE\.MeshBasicMaterial\(\{visible:false\}\)\);/,'an invisible stand-in keeps every size and tap area working');
 assert.match(read('vercel.json'),/"source": "\/assets\/\(\.\*\)"/,'this is why: /assets/ is cached for a day');
});

// World II's later places and landmarks (Oct 2026, the owner's plan for levels 100-200): props from the same Village pack at the places
// (public/assets/village/village-extras.glb), the five landmarks, and rows of the farm's crops on the Village Fields.
const scene=read('public/village-scene.js'),game=read('public/game.js');
const constant=name=>new Function(`return ${new RegExp(`export const ${name}=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);`).exec(scene)[1]}`)();
const VILLAGE_EXTRAS=constant('VILLAGE_EXTRAS'),VILLAGE_PLACES=constant('VILLAGE_PLACES'),VILLAGE_LANDMARK_SPOTS=constant('VILLAGE_LANDMARK_SPOTS');
const PROP_PLACES=['mine','lumbercamp','canteen','kiln','linenloft','soapmaker','pier','jeweller'],LANDMARKS=['windpump','longhouse','stonequay','lookout','greathall'];
test('the extras stand where they belong: props at the places, the five landmarks, on the village\'s own scale',()=>{
 assert.deepEqual(Object.keys(VILLAGE_EXTRAS),[...PROP_PLACES,...LANDMARKS]);
 for(const key of PROP_PLACES)assert.equal(BUILDINGS[key]?.world,2,`${key} is a village place`);
 assert.deepEqual(Object.keys(VILLAGE_LANDMARK_SPOTS),Object.keys(VILLAGE_LANDMARKS),'a spot for every landmark, in their order');
 for(const [key,pieces] of Object.entries(VILLAGE_EXTRAS)){
  const spot=VILLAGE_PLACES[key]??VILLAGE_LANDMARK_SPOTS[key];assert.ok(spot,key);
  for(const piece of pieces){
   assert.equal(piece.length,6,key);assert.equal(typeof piece[0],'string');assert.ok(piece.slice(1).every(Number.isFinite),`${key}: ${piece}`);
   assert.ok(piece[5]>=1&&piece[5]<=1.3,`${key} ${piece[0]}: the pack's own size next to the houses`);
   assert.ok(Math.hypot(piece[1]-spot.x,piece[3]-spot.z)<6,`${key} ${piece[0]} stands by its name`);
  }
 }
 const models=key=>VILLAGE_EXTRAS[key].map(([model])=>model);
 assert.deepEqual([models('windpump'),models('longhouse'),models('lookout')],[['Building_022'],['Building_017_012'],['Building_005']]);
 // 10 Oct 2026 (the owner's review): the Great Hall was one more house of the square and the Stone quay a pier on posts. The Hall is
 // built of the pack's house parts: two wings and a bell tower of three storeys under a cross roof, on stone footings with a porch and
 // steps; the quay of the village's stone steps with dry-stone walls, without a plank of pier.
 const hall=models('greathall'),count=(list,name)=>list.filter(m=>m===name).length;
 assert.equal(count(hall,'Building_Angle_002'),6,'a bell tower of three storeys');assert.equal(count(hall,'Building_Angle_Roof_002'),2,'under a cross roof');
 assert.equal(count(hall,'Building_Door_002'),2,'two wings');for(const part of ['Building_Canopy_002','foundation_002','foundation_010'])assert.ok(hall.includes(part),part);
 assert.ok(!hall.includes('Building_025'),'no longer a house of the square');
 const quay=models('stonequay');assert.ok(count(quay,'foundation_010')>=4&&count(quay,'stones_015')>=2,'slabs and walls of stone');
 assert.ok(!quay.some(m=>/^Building_00[1-9]$/.test(m)),'no wooden pier');
});
// game.js's own syncVillageExtras, with stand-ins for the meshes village-scene.js makes.
const now=Date.parse('2026-10-05T12:00:00Z'),LATER=['villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller'];
function sync(state){
 const from=game.indexOf('function syncVillageExtras(){'),to=game.indexOf('\n}\n',from);assert.ok(from>0&&to>from,'game.js syncVillageExtras');
 const villageExtras={places:new Map(PROP_PLACES.map(k=>[k,{visible:false}])),landmarks:new Map(LANDMARKS.map(k=>[k,{visible:false}])),fields:{strips:[],show(open){this.strips=['lavender','potatoes','flax','saffron'].filter(open);}}};
 new Function('state','villageExtras','recipeUnlocked',`${game.slice(from,to+2)}syncVillageExtras();`)(state,villageExtras,recipeUnlocked);
 return {props:[...villageExtras.places].filter(([,m])=>m.visible).map(([k])=>k),strips:villageExtras.fields.strips,landmarks:[...villageExtras.landmarks.values()].filter(m=>m.visible).length};
}
function farm(level,places){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){if(worldTwoBuilding(k))b.built=places.includes(k);else{b.built=true;if(BUILDINGS[k].type==='production')b.level=MAX_BUILDING_LEVEL;}}
 return normalizeFarm(s,now);
}
test('a place\'s props show once it is built; the Fields show what they can sow; an old farm shows none',()=>{
 const live=['mine','lumbercamp','smithy','villagemill'];
 assert.deepEqual(sync(farm(150,[...live,...LATER])),{props:PROP_PLACES,strips:['lavender','potatoes','flax'],landmarks:0},'saffron from 158');
 assert.deepEqual(sync(farm(130,[...live,'villagefields','canteen','kiln','linenloft'])),{props:['mine','lumbercamp','canteen','kiln','linenloft'],strips:['potatoes','flax'],landmarks:0});
 assert.deepEqual(sync(farm(150,[...live,...LATER.filter(k=>k!=='villagefields')])).strips,[],'no rows before the Fields are built');
 assert.deepEqual(sync(farm(160,[...live,...LATER])).strips,['lavender','potatoes','flax','saffron']);
 // A save from before (the live farm at 113): no new building or good, normalizeFarm not run yet.
 const old=createFarm(now);old.xp=xpForLevel(113);for(const k of LATER)delete old.buildings[k];old.buildings.mine.built=true;old.buildings.lumbercamp.built=true;
 assert.deepEqual(sync(old),{props:['mine','lumbercamp'],strips:[],landmarks:0});
 assert.match(game,/for\(const \[key,mesh\] of villageExtras\.places\)mesh\.visible=state\.buildings\[key\]\?\.built===true;/,'the landmarks are never a place\'s props');
});
// The real village-scene.js and the real files, in node: the extras on the village's scale and palette, every mesh hidden until game.js
// shows it, and the Fields' rows only where the plot's soil is on top.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
test('the extras and the Fields\' rows build from the real files, hidden until the game shows them',{skip:!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)'},async()=>{
 const asked=[],R=globalThis.Request;
 globalThis.self??=globalThis;globalThis.ProgressEvent??=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
 globalThis.Request=class{constructor(url,init={}){this.url=url;this.signal=init.signal;}};
 globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;asked.push(url);if(url.startsWith('blob:')){const {resolveObjectURL}=await import('node:buffer');return new Response(await resolveObjectURL(url).arrayBuffer());}
  return new Response(readFileSync(new URL(`../public${url.split('?')[0]}`,import.meta.url)));};
 globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 const {error,warn}=console;console.error=console.warn=()=>{};
 try{
  const V=await import('../public/village-scene.js'),village=await V.loadVillage();
  assert.ok(Math.abs(village.userData.scale-.143746)<1e-6&&village.userData.palette?.isTexture,'the village\'s scale and its palette for the extras');
  const extras=await V.loadVillageExtras(village);
  assert.deepEqual([...extras.places.keys()],PROP_PLACES);assert.deepEqual([...extras.landmarks.keys()],LANDMARKS);
  assert.deepEqual(extras.group.children.map(m=>m.name),[...PROP_PLACES.map(k=>`extras-${k}`),...LANDMARKS.map(k=>`landmark-${k}`)],'one mesh (one draw) a place or landmark');
  for(const mesh of extras.group.children){
   assert.equal(mesh.visible,false,mesh.name);assert.equal(mesh.material.map,village.userData.palette,'the village\'s own palette');
   mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox,key=mesh.name.replace(/^\w+-/,''),spot=VILLAGE_PLACES[key]??VILLAGE_LANDMARK_SPOTS[key];
   assert.ok(Math.hypot((box.min.x+box.max.x)/2-spot.x,(box.min.z+box.max.z)/2-spot.z)<6,`${mesh.name} stands by its name`);
   assert.ok(box.max.y-box.min.y<4.5,`${mesh.name}: ${(box.max.y-box.min.y).toFixed(1)} tall, the village's houses are about 2`);
   // A landmark's pin (11 Oct 2026, the owner's review: the Wind pump's floated in the rocks, the Stone quay's high over the water): its
   // point (game.js: the spot's y + 3.3) half a unit over the model's top, the Lookout's a unit (lower, a phone on its side lost it).
   if(LANDMARKS.includes(key)){const over=spot.y+3.3-box.max.y;assert.ok(over>.45&&over<(key==='lookout'?1.15:.55),`${key}: its pin ${over.toFixed(2)} over its top`);}
  }
  const fields=await V.createVillageFields(village);
  assert.deepEqual(fields.group.children.map(r=>[r.name,r.count]),[['fields-lavender',28],['fields-potatoes',45],['fields-flax',45],['fields-saffron',26]],'only on the plot\'s soil');
  assert.ok(fields.group.children.every(r=>!r.visible));fields.show(crop=>crop==='potatoes');assert.deepEqual(fields.group.children.map(r=>r.visible),[false,true,false,false]);
  assert.deepEqual(asked.filter(u=>!u.startsWith('blob:')).map(u=>u.split('?')[0]),['/assets/village/village.glb','/assets/village/village-layout.json','/assets/village/village-extras.glb','/assets/models/plant_004.glb','/assets/models/plant_005.glb','/assets/models/palette.png'],'the farm\'s own crop models, no new file');
 }finally{console.error=error;console.warn=warn;globalThis.Request=R;}
});
// 10 Oct 2026 (review fixes): the game's camera looks one way on every screen (from 36, 40, 36 towards the middle), so a landmark behind
// the near mountains is never seen, whatever the pan or zoom: the Great Hall stood there, hidden whole behind mountains_003. From points
// through each landmark a ray towards the camera must pass the village for most of them. And a landmark clears its ground: while it shows,
// no village tree reaches into it (a crown came through the Longhouse's roof), and when it does not, the trees are back as they were.
test('every landmark is seen from the game\'s camera and stands on clear ground',{skip:!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)'},async()=>{
 const R=globalThis.Request;
 globalThis.self??=globalThis;globalThis.ProgressEvent??=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
 globalThis.Request=class{constructor(url,init={}){this.url=url;this.signal=init.signal;}};
 globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('blob:')){const {resolveObjectURL}=await import('node:buffer');return new Response(await resolveObjectURL(url).arrayBuffer());}
  return new Response(readFileSync(new URL(`../public${url.split('?')[0]}`,import.meta.url)));};
 globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 const {error,warn}=console;console.error=console.warn=()=>{};
 try{
  const THREE=await import('three'),V=await import('../public/village-scene.js'),village=await V.loadVillage(),extras=await V.loadVillageExtras(village);
  const dir=new THREE.Vector3(-36,-40,-36).normalize(),ray=new THREE.Raycaster(),solid=[],trees=[],statics=[],m=new THREE.Matrix4();
  village.traverse(o=>{if(o.isMesh)solid.push(o);if(o.isInstancedMesh&&/^Tree_/.test(o.name))trees.push(o);else if(o.isMesh&&/^Tree_/.test(o.name))statics.push(o);});
  assert.equal(statics.length,3,'the three trees that stand in the village as they are');
  const matrices=()=>trees.map(o=>Array.from(o.instanceMatrix.array).join());const before=matrices();
  for(const [key,mesh] of extras.landmarks){
   extras.showLandmark(key,true);assert.equal(mesh.visible,true,key);
   const b=mesh.geometry.boundingBox,at=(a,h,c)=>new THREE.Vector3(b.min.x+(b.max.x-b.min.x)*a,b.min.y+(b.max.y-b.min.y)*h,b.min.z+(b.max.z-b.min.z)*c);let seen=0,all=0;
   for(const a of [.1,.5,.9])for(const c of [.1,.5,.9])for(const h of [.3,.6,.9]){all++;ray.set(at(a,h,c).addScaledVector(dir,-300),dir);ray.far=299.95;if(!ray.intersectObjects(solid,false).length)seen++;}
   assert.ok(seen/all>.5,`${key}: ${seen} of ${all} seen from the camera`);
   const foot=b.clone().expandByScalar(-.1);foot.min.y+=.3;
   for(const o of trees)for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);assert.ok(!o.geometry.boundingBox.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld).intersectsBox(foot),`${key}: ${o.name} ${i} stands in it`);}
   for(const o of statics)assert.ok(!o.visible||!new THREE.Box3().setFromObject(o).intersectsBox(foot),`${key}: ${o.name} stands in it`);
   extras.showLandmark(key,false);assert.equal(mesh.visible,false,key);
  }
  assert.deepEqual(extras.landmarks.get('longhouse').userData.trees.map(([o])=>o.name),['Tree_001'],'the tree whose crown came through the roof');
  assert.ok(extras.landmarks.get('greathall').userData.trees.some(([o,i])=>o.name==='Tree_011012'&&i===-1),'the tree that stood where the Hall\'s north wing is');
  assert.ok(matrices().every((x,i)=>x===before[i]),'every tree is back while no landmark shows');assert.ok(statics.every(o=>o.visible),'and the three that stand as they are');
 }finally{console.error=error;console.warn=warn;globalThis.Request=R;}
});
