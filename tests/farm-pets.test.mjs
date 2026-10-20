import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// farm-pets.js and village-scene.js import 'three' and its addons by name, as the browser's import map does: here the copies the game ships.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const glb=name=>{const b=readFileSync(new URL(`../public/assets/models/${name}.glb`,import.meta.url));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));};

// The farm's pets (20 Oct 2026, the owner: "doe de kat en de hond, en het hert in Village II"): ithappy Studios' free animals, rebuilt
// small (scripts/build-pets.mjs): about 1 MB each as they come, about 100 KB each in the game.
test('the pets are small: meshopt-packed, quantized, painted from palette.png, with their shade, a walk and an idle and nothing more',()=>{
 for(const name of ['dog_101','cat_101','deer_101']){
  const json=glb(name),size=statSync(new URL(`../public/assets/models/${name}.glb`,import.meta.url)).size;
  assert.ok(size<160_000,`${name} is ${Math.round(size/1024)} KB`);
  assert.deepEqual([...json.extensionsRequired].sort(),['EXT_meshopt_compression','KHR_mesh_quantization'],name);
  assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle','walk'],`${name}: no run, no other clips`);
  assert.equal(json.skins.length,1,`${name} is one skinned animal`);
  assert.deepEqual(json.images,[{name:'palette',mimeType:'image/png',uri:'palette.png'}],`${name} carries no picture of its own (the pack's has a watermark)`);
  assert.ok(json.asset.extras.bakedShade&&json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!=null)),`${name} has the farm's baked shade`);
 }
 const build=read('scripts/build-pets.mjs');
 assert.match(build,/const KEEP=\/_\(idle\|walk\)\$\/;/);assert.match(build,/meshopt\(\{encoder:MeshoptEncoder,level:'high'\}\)/);
 assert.match(build,/const shade=v=>Math\.max\(\.55,1-\.45\*\(1-v\)\);/,'the farm\'s strength and floor (apply-ao.mjs)');
 assert.match(read('ASSET-USAGE.md'),/## Farm pets \(20 Oct 2026\)[^]*https:\/\/ithappystudios\.com\/type-of-licenses\/[^]*not as they are/,'the licence and its one rule are written down');
});

test('they come after the farm or the village is on screen, never in the loading bar\'s models, and a failure leaves the farm as it is',()=>{
 const game=read('public/game.js'),pets=read('public/farm-pets.js');
 assert.match(game,/if\(!villageWorld\)void addScenery\(\);if\(villageWorld\)void addVillageExtras\(\);void addPets\(\);/,'after the first picture');
 assert.match(game,/await new Promise\(done=>'requestIdleCallback' in window\?requestIdleCallback\(done,\{timeout:4000\}\):setTimeout\(done,1500\)\);/,'after the scenery has started');
 assert.match(game,/const \{createPets,FARM_PETS,VILLAGE_DEER\}=await import\('\.\/farm-pets\.js'\);/,'loaded only then');
 assert.doesNotMatch(game,/^import[^\n]*farm-pets/m,'never in the first load');
 assert.doesNotMatch(game,/modelNames\.push\([^)]*_101/,'not among the models the loading bar waits for');
 assert.match(game,/catch\(error\)\{console\.warn\('The pets were skipped\.',error\);\}/);
 assert.match(pets,/catch\(error\)\{console\.warn\('A pet could not load; the farm is there without it\.',id,error\);return;\}/);
 // The same stalled-request handling as every model (model-atlas.js download), the shared palette, and the village's mesh decoder.
 assert.match(pets,/loader\?\?=sharePalette\(new GLTFLoader\(\)\)\.setMeshoptDecoder\(MeshoptDecoder\);/);
 assert.match(pets,/open=address=>download\(address\)\.then\(data=>loader\.parseAsync\(data,'\/assets\/models\/'\)\);/);
});

test('a pet never takes a tap from anything else, and a tap on one is only a hop and a heart: no reward, nothing saved',()=>{
 const game=read('public/game.js'),pets=read('public/farm-pets.js'),css=read('public/farm-life.css');
 const pick=/function pointerTarget\(event\)\{[^]*?\n\}/.exec(game)[0];
 assert.match(pick,/obj=obj\.parent;\}\}\n \/\/ A pet[^\n]*\n const pet=pets\?\.pick\(raycaster\);if\(pet\)return \{type:'pet',id:pet\};\n return null;\n\}$/,'asked last, when the tap found no field, building, pin or place');
 assert.match(game,/else if\(target\.type==='pet'\)pets\?\.react\(target\.id\);\},/);
 assert.match(game,/if\(!target\|\|e\.pointerType==='touch'\|\|target\.type==='pet'\)\{tooltip\.hidden=true;return;\}/,'no tooltip of its own (no new text)');
 assert.doesNotMatch(pets,/runAction|localStorage|sessionStorage|state\.|client\.|track\(/,'nothing is played, saved or counted');
 assert.match(pets,/heart\.className='pet-heart';heart\.setAttribute\('aria-hidden','true'\);/);
 assert.match(css,/\.pet-heart\{position:absolute;z-index:1;transform:translate\(-50%,-100%\);pointer-events:none;color:var\(--btn-red\);/,'nothing to tap, the game\'s red');
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.pet-heart\{animation:pet-heart-still/);
 // Cheap: one mixer each, moved in the frame only when the farm is drawn (never with the tab hidden, under a window or with reduced motion).
 assert.match(game,/const t=clock\.getElapsedTime\(\);farmLife\?\.animate\(t,dt,farmNow\(\)\);pets\?\.animate\(dt\);/);
 assert.match(game,/function frame\(now\)\{\n requestAnimationFrame\(frame\);if\(!ready\|\|document\.hidden\)return;/);
 assert.equal((pets.match(/new THREE\.AnimationMixer\(/g)??[]).length,1);
});

test('where they walk: open ground by the Farmhouse and on the village\'s lake slope, clear of fields, buildings, places and names',{skip},async()=>{
 const {FARM_PETS,VILLAGE_DEER}=await import('../public/farm-pets.js');
 const {FIELD_BLOCK,pondBounds,outsideYardExtents,anchorAt}=await import('../public/farm-layout.js');
 const {VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_LANDMARK_SPOTS,VILLAGE_FIELD_PLOT,VILLAGE_FISHING_SPOT}=await import('../public/village-scene.js');
 // Every point of a walk: the spots and the straight lines between any two of them.
 const walk=spots=>spots.flatMap(a=>spots.flatMap(b=>Array.from({length:11},(_,i)=>[a[0]+(b[0]-a[0])*i/10,a[1]+(b[1]-a[1])*i/10])));
 const [fx,fz]=anchorAt('farmhouse');
 // The tappable things round the Farmhouse as they stand on the farm (measured in the game, 20 Oct 2026): the Farmhouse, the chores
 // barrels, the Feed Mill, the delivery cart and the tractor, each with the pet's half length round it.
 const TAPPABLE={farmhouse:[-21.4,-14.5,-16.6,-9.9],chores:[-14.6,-13.5,-8.8,-7.7],mill:[-19.5,-13,3.2,7.2],cart:[-13.7,-11.5,-14.1,-13.1],tractor:[-8.3,-5.2,-1.1,.6]};
 for(const [id,{length,spots}] of Object.entries(FARM_PETS)){
  assert.ok(Math.hypot(spots[0][0]-fx,spots[0][1]-fz)<12,`${id} is near the Farmhouse`);
  for(const [x,z] of walk(spots)){
   assert.ok(x<FIELD_BLOCK.minX-2||x>FIELD_BLOCK.maxX+2||z<FIELD_BLOCK.minZ-2||z>FIELD_BLOCK.maxZ+2,`${id} keeps off the fields at ${x},${z}`);
   const [px0,pz0,px1,pz1]=pondBounds();assert.ok(x<px0||x>px1||z<pz0||z>pz1,`${id} keeps out of the pond`);
   assert.ok(outsideYardExtents(x,z,1),`${id} keeps out of the yards at ${x},${z}`);
   for(const [name,[x0,x1,z0,z1]] of Object.entries(TAPPABLE))assert.ok(x<x0-length/2||x>x1+length/2||z<z0-length/2||z>z1+length/2,`${id} keeps clear of the ${name} at ${x},${z}`);
  }
 }
 const named=[...Object.values(VILLAGE_PLACES),...Object.values(VILLAGE_UTILITIES),...Object.values(VILLAGE_LANDMARK_SPOTS),VILLAGE_FISHING_SPOT];
 const p=VILLAGE_FIELD_PLOT;
 for(const [x,z] of walk(VILLAGE_DEER.spots)){
  for(const spot of named)assert.ok(Math.hypot(x-spot.x,z-spot.z)>4,`the deer keeps away from the place at ${spot.x},${spot.z}`);
  assert.ok(x<p.x-1||x>p.x+p.width+1||z<p.z-1||z>p.z+p.depth+1,'the deer keeps off the Village Fields');
 }
 assert.ok(VILLAGE_DEER.length<FARM_PETS.dog.length,'the village is drawn smaller than the farm');
});
