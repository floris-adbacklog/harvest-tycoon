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
// shows it, and the Village Fields (11 Oct 2026) on the hill under the pack's old plot: soil, fence and plants on the ground, clear of the
// trees and the hay barns, the old plot hidden.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
test('the extras and the Village Fields build from the real files, hidden until the game shows them',{skip:!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)'},async()=>{
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
  const THREE=await import('three'),started=performance.now(),fields=await V.createVillageFields(village),took=performance.now()-started;
  assert.deepEqual(fields.group.children.map(o=>o.name),['fields-soil','fields-fence','fields-lavender','fields-flax','fields-potatoes','fields-saffron']);
  const count=name=>fields.group.getObjectByName(`fields-${name}`).children.filter(m=>m.isInstancedMesh).map(m=>m.count);
  // 11 Oct 2026, the owner's review: the rows keep to the strips' flat soil (a little shorter), the potatoes are leafy clumps of three.
  assert.deepEqual([count('lavender'),count('flax'),count('potatoes'),count('saffron')],[[279,372],[175,345],[261,44],[112,220]],'clumps of lavender, flax and saffron under flowers, potatoes with a few');
  assert.deepEqual(fields.group.getObjectByName('fields-potatoes').children.map(m=>m.name),['fields-potatoes-0','fields-potatoes-1','fields-potatoes-ridges'],'the potatoes on hilled rows');
  assert.equal(fields.group.getObjectByName('fields-potatoes-ridges').material,fields.group.getObjectByName('fields-soil').material,'ridges of the same soil');
  assert.equal(fields.group.getObjectByName('fields-fence').count,36,'36 pieces of fence, the gate open');
  assert.ok(fields.group.children.slice(2).every(r=>!r.visible)&&fields.group.children.slice(0,2).every(o=>o.visible),'the soil and the fence always, the crops once they are sown');
  fields.show(crop=>crop==='potatoes');assert.deepEqual(fields.group.children.slice(2).map(r=>r.visible),[false,false,true,false]);
  assert.equal(village.getObjectByName('landscape_004').visible,false,'the pack\'s bumpy plot is gone');
  assert.ok(took<3000,`built in ${Math.round(took)} ms (rays onto the hills took seconds)`);
  // On the hill: the soil's middle just over the grass, the fence's feet in it, every plant's foot in the soil.
  const hills=[],ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),m=new THREE.Matrix4(),at=new THREE.Vector3(),box=new THREE.Box3();village.updateMatrixWorld(true);
  village.traverse(o=>{if(o.isMesh&&!o.isInstancedMesh&&/^hill_/.test(o.name))hills.push(o);});
  const from=new THREE.Vector3(),hill=(x,z)=>{ray.set(from.set(x,40,z),down);return ray.intersectObjects(hills,false)[0].point.y;},soil=fields.group.getObjectByName('fields-soil');
  for(let k=0;k<24;k++){const s=V.villageFieldStrip(k%4),x=s.x+s.width*(.1+.8*((k*7)%6)/5),z=s.z+s.depth*(.3+.4*(k%3)/2);ray.set(from.set(x,40,z),down);
   const over=ray.intersectObject(soil,false)[0].point.y-hill(x,z);assert.ok(over>.01&&over<.12,`the soil ${over.toFixed(3)} over the grass at ${x.toFixed(1)}, ${z.toFixed(1)}`);}
  const fence=fields.group.getObjectByName('fields-fence');
  for(let i=0;i<fence.count;i++){fence.getMatrixAt(i,m);at.setFromMatrixPosition(m);const sunk=hill(at.x,at.z)-at.y;assert.ok(sunk>-.005&&sunk<.1,`fence piece ${i} ${sunk.toFixed(3)} in the ground`);}
  // A plant's foot in the soil; on the potatoes' ridges that much higher, their flowers higher again over the leaves.
  for(const rows of fields.group.children.slice(2))for(const mesh of rows.children.filter(o=>o.isInstancedMesh)){
   const [,crop,n]=mesh.name.split('-'),c=V.VILLAGE_FIELD_CROPS[crop],lift=(c.ridge??0)+(c.parts[n].lift??0);
   for(let i=0;i<mesh.count;i+=7){mesh.getMatrixAt(i,m);at.setFromMatrixPosition(m);const foot=at.y-lift-hill(at.x,at.z);assert.ok(foot>0&&foot<.15,`${mesh.name} ${i}: its foot ${foot.toFixed(3)} over the grass`);}
  }
  // The ridges lie on the strip's flat soil, their tops where the plants stand.
  {const ridges=fields.group.getObjectByName('fields-potatoes-ridges'),pos=ridges.geometry.getAttribute('position'),soilOf=V.villageFieldSoil(V.VILLAGE_FIELD_CROPS.potatoes.strip);
   for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),over=pos.getY(i)-hill(x,z);assert.ok(x>=soilOf.x0&&x<=soilOf.x1&&z>=soilOf.z0&&z<=soilOf.z1&&over>0&&over<.15,`ridge corner ${i} at ${x.toFixed(2)}, ${z.toFixed(2)}, ${over.toFixed(3)} over the grass`);}}
  // Clear of the village: no tree stands in the fence, no hay barn and no landmark reaches into it.
  const P=V.VILLAGE_FIELD_PLOT,plot=new THREE.Box3(new THREE.Vector3(P.x,-1e3,P.z),new THREE.Vector3(P.x+P.width,1e3,P.z+P.depth)),middle=new THREE.Vector3();
  village.traverse(o=>{
   if(!o.isInstancedMesh||!/^(Tree_|Building_)/.test(o.name))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);box.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld);
    if(/^Tree_/.test(o.name))assert.ok(!plot.containsPoint(box.getCenter(middle)),`${o.name} ${i} grows in the Fields`);else assert.ok(!box.intersectsBox(plot),`${o.name} ${i} stands in the Fields`);}
  });
  for(const mesh of extras.landmarks.values()){mesh.geometry.computeBoundingBox();assert.ok(!mesh.geometry.boundingBox.intersectsBox(plot),`${mesh.name} stands in the Fields`);}
  assert.deepEqual(asked.filter(u=>!u.startsWith('blob:')).map(u=>u.split('?')[0]),['/assets/village/village.glb','/assets/village/village-layout.json','/assets/village/village-extras.glb','/assets/models/field_004.glb','/assets/models/fence_008.glb','/assets/models/plant_010.glb','/assets/models/plant_006.glb','/assets/models/palette.png'],'the farm\'s own field, fence and plants, no new file');
  // The tap target (11 Oct 2026, the owner's review: only a tap by the name, at the plot's south-west corner, opened the Fields): an
  // invisible lid over the whole fenced plot. Rays as the game's camera casts them (it looks one way, from 36, 40, 36, orthographic):
  // through the soil, the crops, the fence and every corner of the plot they find it; through the hay barn, a tree in front of the plot,
  // the Wind pump behind it, or the grass just outside the fence they do not (on the far sides, west and north, from half a unit out:
  // nearer, the fence's top rail, a third of a unit tall, stands in front of that grass).
  const tap=fields.tap,dir=new THREE.Vector3(36,40,36).normalize(),caster=new THREE.Raycaster();
  assert.ok(tap.isMesh&&tap.material.visible===false&&tap.name==='fields-tap'&&!fields.group.getObjectById(tap.id),'never drawn, and not part of the Fields\' group');
  tap.updateMatrixWorld(true);
  const through=(x,y,z)=>{caster.set(new THREE.Vector3(x,y,z).addScaledVector(dir,80),dir.clone().negate());return caster;};
  const hits=(x,y,z)=>{through(x,y,z);return caster.intersectObject(tap,false).length>0;},behind=(x,y,z)=>{through(x,y,z);const raw=[];THREE.Mesh.prototype.raycast.call(tap,caster,raw);return raw.length>0;};
  const G=(x,z)=>[x,hill(x,z),z];
  for(const [what,point] of [['the middle',G(P.x+P.width/2,P.z+P.depth/2)],['the north-east corner',G(P.x+P.width-.1,P.z+.1)],['the north-west corner',G(P.x+.1,P.z+.1)],['the south-west corner',G(P.x+.1,P.z+P.depth-.1)],['the south-east corner',G(P.x+P.width-.1,P.z+P.depth-.1)],['the gate',G(P.x+1.9,P.z+P.depth-.05)]])assert.ok(hits(...point),`a tap on ${what} of the plot`);
  for(const name of ['fields-lavender-1','fields-flax-1','fields-potatoes-0','fields-saffron-1']){const mesh=fields.group.getObjectByName(name);for(const i of [0,Math.floor(mesh.count/2),mesh.count-1]){mesh.getMatrixAt(i,m);at.setFromMatrixPosition(m);assert.ok(hits(at.x,at.y+.12,at.z),`a tap on ${name} ${i}`);}}
  // The fence: both ends and the middle of each side (north 0-10, east 11-18, south 19-27 without the gate, west 28-35), but for the
  // pieces the hay barn hides from the camera at the south-east corner (17, 18, 27).
  {const fence=fields.group.getObjectByName('fields-fence');for(const i of [0,5,10,11,14,19,23,26,28,31,35]){fence.getMatrixAt(i,m);at.setFromMatrixPosition(m);assert.ok(hits(at.x,at.y+.15,at.z),`a tap on fence piece ${i}`);}}
  for(const [what,[x,z]] of [['south',[P.x+P.width/2,P.z+P.depth+.2]],['east',[P.x+P.width+.2,P.z+P.depth/2]],['south-east',[P.x+P.width+.2,P.z+P.depth+.2]],['west',[P.x-.5,P.z+P.depth/2]],['north',[P.x+P.width/2,P.z-.5]]])assert.ok(!hits(...G(x,z)),`the grass just ${what} of the fence is not the Fields`);
  // In front of the plot, from the camera's side: what a ray meets first is what was tapped, even where the lid lies behind it.
  let blocked=0;const by={};
  village.traverse(o=>{
   if(!o.isInstancedMesh||!/^(Tree_|Building_018)/.test(o.name))return;
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);box.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld);if(box.min.x>P.x+P.width+3||box.max.x<P.x-1||box.min.z>P.z+P.depth+3||box.max.z<P.z-1)continue;
    const probe=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));probe.matrixWorld.multiplyMatrices(o.matrixWorld,m);
    for(let k=0;k<35;k++){const p=new THREE.Vector3(box.min.x+(box.max.x-box.min.x)*(k%7+.5)/7,box.min.y+(box.max.y-box.min.y)*(.3+.6*((k*3)%5)/4),box.min.z+(box.max.z-box.min.z)*((k*3)%7+.5)/7);
     through(p.x,p.y,p.z);const own=[];probe.raycast(caster,own);if(!own.length||!behind(p.x,p.y,p.z))continue;
     blocked++;by[o.name]=(by[o.name]??0)+1;assert.ok(!hits(p.x,p.y,p.z),`a tap on ${o.name} ${i} at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)} opened the Fields behind it`);}
   }
  });
  assert.ok(blocked>=10,`taps on the hay barn and the trees in front of the plot checked (${blocked})`);
  const barn=[];village.traverse(o=>{if(o.isInstancedMesh&&o.name==='Building_018'){o.getMatrixAt(0,m);barn.push(box.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld).clone());}});
  assert.ok(barn[0].min.x>P.x+P.width&&barn[0].min.z<P.z+P.depth&&barn[0].max.z>P.z+P.depth,'the hay barn at the plot\'s south-east corner');
  assert.ok(by.Building_018>0,'its roof hides a corner of the plot, and a tap on it is not the Fields');
  const pump=extras.landmarks.get('windpump');pump.geometry.computeBoundingBox();const pb=pump.geometry.boundingBox;
  for(let k=0;k<20;k++){const x=pb.min.x+(pb.max.x-pb.min.x)*(k%5+.5)/5,y=pb.min.y+(pb.max.y-pb.min.y)*Math.floor(k/5)/4+.05,z=pb.max.z;assert.ok(!hits(x,y,z),`a tap on the Wind pump at ${x.toFixed(1)}, ${y.toFixed(1)} is not the Fields`);}
 }finally{console.error=error;console.warn=warn;globalThis.Request=R;}
});
// 11 Oct 2026, the owner's review: only a tap by the Fields' name, at the plot's south-west corner, opened them. Their lid (above) takes
// the place of the place's block, so a tap anywhere on the plot walks up to the place as a tap on the block did: the same window as
// the name opens, greyed and hidden with the place (a place still waiting for its golden brief shows nothing and takes no tap).
test('a tap anywhere on the Village Fields opens them, as a tap on their place did',()=>{
 const add=/async function addVillageExtras\(\)\{[\s\S]*?\n\}/.exec(game)[0];
 assert.match(add,/const v=buildingViews\.get\('villagefields'\);if\(v\)\{v\.object\.remove\(v\.hit\);v\.object\.attach\(villageExtras\.fields\.tap\);v\.hit=villageExtras\.fields\.tap;\}/,'the lid hangs on the Fields\' place instead of its block');
 assert.match(game,/function addVillagePlace\(key,\{x,y,z\}\)\{\n const object=villageMarker\(x,y,z\);object\.userData\.building=key;/,'the place carries its key');
 assert.match(game,/\.\.\.Array\.from\(buildingViews\.values\(\)\)\.filter\(v=>v\.object\.visible\)\.flatMap\(v=>\[v\.object,v\.hit\]\)/,'a shown place and what hangs on it are tap targets');
 assert.match(game,/if\(obj\.userData\.building\)return \{type:'building',id:obj\.userData\.building\};/,'found by walking up to the place');
 assert.match(game,/v\.object\.visible=!waiting;if\(waiting\)\{v\.label\.hidden=true;continue;\}/,'hidden with its name while it waits');
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
