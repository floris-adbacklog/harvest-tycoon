import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// farm-animals.js imports 'three' and its addons by name, as the browser's import map does: here the copies the game ships.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const file=name=>new URL(`../public/assets/models/${name}.glb`,import.meta.url);
const glb=name=>{const b=readFileSync(file(name));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));};

// The farm's animals move (20 Oct 2026, the owner: "voeg (nog) niks toe, alleen de 6 bestaande"; and "Vergeet de ranch paarden
// niet"): every still chicken, chick, cow, goat, pig, sheep and horse on the farm gets an animated twin from ithappy Studios' Animals
// pack, rebuilt small (scripts/build-farm-animals.mjs).
test('every still animal the farm places has an animated twin, the Ranch\'s horses and the scenery\'s chicks too',{skip},async()=>{
 const {ANIMATED,ANIMAL_FILES,ANIMAL_KINDS}=await import('../public/farm-animals.js');
 const placed=new Set();
 for(const path of ['public/game.js','public/farm-life.js','public/scenery.js'])for(const m of read(path).matchAll(/'((?:chicken|cow|goat|pig|sheep|horse)_0\d\d)'/g))placed.add(m[1]);
 assert.deepEqual([...placed].filter(name=>!ANIMATED[name]),[],'no still animal is left out');
 for(const name of ['horse_002','horse_003','horse_004','horse_005','chicken_002'])assert.ok(ANIMATED[name],`${name} moves`);
 for(const [name,[kind,variant]] of Object.entries(ANIMATED)){
  assert.ok(ANIMAL_FILES.includes(kind)&&ANIMAL_KINDS[kind],`${name}: ${kind} is loaded`);
  assert.ok(glb(kind).nodes.some(n=>n.name===variant&&n.skin!=null),`${name}: ${kind}.glb has the skinned ${variant}`);
 }
});

test('the files are small: one a kind, meshopt-packed, painted from palette.png, with their shade, and no run',()=>{
 let total=0;
 for(const name of ['chicken_101','chick_101','cow_101','goat_101','pig_101','sheep_101','horse_101']){
  const json=glb(name),size=statSync(file(name)).size;total+=size;
  assert.ok(size<140_000,`${name} is ${Math.round(size/1024)} KB`);
  assert.deepEqual([...json.extensionsRequired].sort(),['EXT_meshopt_compression','KHR_mesh_quantization'],name);
  const clips=json.animations.map(a=>a.name);
  assert.ok(clips.includes('idle')&&clips.includes('walk'),`${name} stands and walks`);
  assert.ok(clips.every(c=>['idle','walk','eat','lie','gesture'].includes(c)),`${name}: no run (${clips})`);
  assert.equal(clips.includes('lie'),['cow_101','pig_101'].includes(name),`${name}: only the cows and pigs lie down`);
  assert.deepEqual(json.images,[{name:'palette',mimeType:'image/png',uri:'palette.png'}],`${name} carries no picture of its own`);
  assert.ok(json.asset.extras.bakedShade&&json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!=null)),`${name} has the farm's baked shade`);
 }
 assert.ok(total<720_000,`all of them: ${Math.round(total/1024)} KB`);
 const build=read('scripts/build-farm-animals.mjs');
 assert.match(build,/meshopt\(\{encoder:MeshoptEncoder,level:'high'\}\)/);
 assert.match(build,/const shade=v=>Math\.max\(\.55,1-\.45\*\(1-v\)\);/,'the farm\'s strength and floor (apply-ao.mjs)');
 assert.match(read('ASSET-USAGE.md'),/## Farm animals that move \(20 Oct 2026\)[^]*bought by the owner[^]*https:\/\/ithappystudios\.com\/type-of-licenses\/[^]*not as they are/,'the paid licence is written down');
});

test('they come after the farm is on screen, never in the loading bar\'s models, and a failure leaves the still ones standing',()=>{
 const game=read('public/game.js'),animals=read('public/farm-animals.js');
 assert.doesNotMatch(game,/^import[^\n]*farm-animals/m,'never in the first load');
 assert.doesNotMatch(game,/modelNames\.push\([^)]*_101/,'not among the models the loading bar waits for');
 assert.match(game,/ \}catch\(error\)\{console\.warn\('The extra scenery was skipped\.',error\);\}\n void addAnimals\(\);\n\}/,'after the extra scenery');
 assert.match(game,/if\(reducedMotion\|\|graphicsSimple\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\)return;/,'not with reduced motion or to save data');
 assert.match(game,/const \{createHerd,ANIMATED\}=await import\('\.\/farm-animals\.js'\);/);
 assert.match(game,/catch\(error\)\{console\.warn\('The animals were left standing\.',error\);\}/);
 assert.match(animals,/catch\(error\)\{console\.warn\('An animal could not load; its still model stays\.',file,error\);continue;\}/);
 assert.match(animals,/loader\?\?=sharePalette\(new GLTFLoader\(\)\)\.setMeshoptDecoder\(MeshoptDecoder\);/);
 // Cheap: moved only in the frame when the farm is drawn, only the ones in the picture, a phone at every other frame.
 assert.match(game,/pets\?\.animate\(dt\);herd\?\.animate\(dt,camera\);/);
 assert.match(animals,/if\(!frustum\.intersectsSphere\(sphere\)\)continue;/);
 assert.match(game,/lite:handheld\|\|mobileLayout\.matches/);
});

test('a tap on an animal opens what it opened before: the still model stays as its unseen tap target and walks with it',()=>{
 const game=read('public/game.js'),animals=read('public/farm-animals.js');
 assert.match(animals,/obj\.traverse\(n=>\{if\(n\.isMesh\)n\.visible=false;\}\);\n  obj\.add\(rig\);relock\(obj\);/,'drawn inside the still model, greyed with its yard');
 assert.match(game,/\.\.\.animals\.map\(v=>v\.obj\)/,'the still models are still the tap targets');
 assert.match(game,/relock:o=>\{if\(o\.userData\.locked\)\{o\.userData\.locked=false;setLocked\(o,true\);\}\}/);
 // The Animal paddock's horse (a stop with a pin and a tap box of its own) and the scenery's hen and chicks stay on their spots.
 assert.match(game,/still:Boolean\(o\.userData\.activity\|\|o\.userData\.scenery\)/);
 assert.match(animals,/if\(a\.still\)return null;/);
 assert.doesNotMatch(animals,/'run'|_run|Run/,'no running');
 assert.doesNotMatch(animals,/runAction|localStorage|sessionStorage|state\.|client\.|track\(/,'site only: nothing played, saved or counted');
});

test('they keep to their own pens: a few calm steps round the spot the layout gives them, mostly along the screen',{skip},async()=>{
 const {ANIMAL_KINDS}=await import('../public/farm-animals.js');
 for(const [kind,{roam,stride,pace,odds}] of Object.entries(ANIMAL_KINDS)){
  assert.ok(roam<=.9,`${kind} stays within .9 of its spot`);
  assert.ok(pace<=.8&&stride<.5,`${kind} walks calmly`);
  assert.ok((odds.walk??0)<=.2,`${kind} mostly grazes and stands`);
  assert.ok(!('run' in odds));
 }
 assert.ok(ANIMAL_KINDS.cow_101.odds.lie&&ANIMAL_KINDS.pig_101.odds.lie&&!ANIMAL_KINDS.sheep_101.odds.lie,'the cows and pigs lie down now and then');
});
