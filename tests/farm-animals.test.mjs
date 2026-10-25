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
 assert.match(animals,/obj\.traverse\(n=>\{if\(n\.isMesh\)n\.visible=false;\}\);\n  obj\.add\(rig\);\{const shade=softShadow\(size\.x\*k\/s\*1\.5,size\.z\*k\/s\*1\.4,1\);shade\.position\.y=\.05\/s;obj\.add\(shade\);\}relock\(obj\);/,'drawn inside the still model with a soft shadow under it (25 Oct 2026), greyed with its yard');
 assert.match(game,/\.\.\.animals\.map\(v=>v\.obj\)/,'the still models are still the tap targets');
 assert.match(game,/relock:o=>\{if\(o\.userData\.locked\)\{o\.userData\.locked=false;setLocked\(o,true\);\}\}/);
 // The Animal paddock's horse (a stop with a pin and a tap box of its own) and the scenery's hen and chicks stay on their spots.
 assert.match(game,/still:Boolean\(o\.userData\.activity\|\|o\.userData\.scenery\)/);
 assert.match(animals,/if\(a\.still\)return null;/);
 assert.doesNotMatch(animals,/'run'|_run|Run/,'no running');
 assert.doesNotMatch(animals,/runAction|localStorage|sessionStorage|state\.|client\.|track\(/,'site only: nothing played, saved or counted');
});

// 22 Oct 2026 (the owner: "de geanimeerde dieren zoals de koeien draaien soms een beetje raar", and "het gebeurt nog steeds, geef
// dieren desnoods wat meer ruimte in hun veld, zoals Koeien door de Koeienstal meer naar achteren plaatsen"): a cow two units long
// could wander 0.75 from its spot, so about every other walk was a half turn on the spot for a step shorter than half its body. In
// the lab (20 simulated minutes of every animal) that was 4 spins per cow and 7 per goat each 10 minutes; now 1 to 2 walked bends.
test('they keep to their own pens, with room for their size: no fence, no barn, half a body clear',{skip},async()=>{
 const {ANIMAL_KINDS}=await import('../public/farm-animals.js');
 const game=read('public/game.js'),animals=read('public/farm-animals.js');
 for(const [kind,{roam,depth,stride,pace,odds}] of Object.entries(ANIMAL_KINDS)){
  assert.ok(pace<=.8&&stride<.5,`${kind} walks calmly`);
  assert.ok((odds.walk??0)<=.2,`${kind} mostly grazes and stands`);
  assert.ok(!('run' in odds));
  if(kind==='chick_101')assert.equal(roam,0,'the chicks stay on their spots');
  else if(kind==='chicken_101')assert.ok(roam*.7<=.85&&depth<=.34,'the hens keep to their spots (0.8, a third up and down): the coop\'s pin and the Windmill\'s tap box');
  else assert.ok(roam>=2&&depth===1,`${kind} roams a few of its own body lengths, in its pen`);
 }
 assert.ok(ANIMAL_KINDS.cow_101.odds.lie&&ANIMAL_KINDS.pig_101.odds.lie&&!ANIMAL_KINDS.sheep_101.odds.lie,'the cows and pigs lie down now and then');
 // Every penned animal gets its pen's box (its fences) and what stands in it; a spot is half a body clear of both.
 assert.match(game,/const penned=\(id,pieces\)=>\{for\(const piece of pieces\)piece\.userData\.pen=id;return pieces;\};/);
 for(const id of ['coop','dairy','sheepbarn','goatshed','pigfarm','ranch'])assert.match(game,new RegExp(`penned\\('${id}',`),`${id}'s fences are its pen`);
 assert.match(game,/o\.userData\.building=building;o\.userData\.pen=building;/,'a pen animal knows its pen');
 assert.match(game,/horse\.userData\.pen='ranch'/,'and the Ranch\'s horses theirs');
 assert.match(game,/list\.push\(\{obj:o,still:Boolean\(o\.userData\.activity\|\|o\.userData\.scenery\),pen:penOf\(o\)\}\)/);
 assert.match(animals,/const m=a\.length\*\.5,/,'half a body from the fence');
 assert.match(animals,/out=Math\.max\(out,x0\+m-x,x-x1\+m,z0\+m-z,z-z1\+m\);/);
 assert.match(animals,/for\(const \[k0,k1,l0,l1\] of a\.pen\.keepOut\)out=Math\.max\(out,Math\.min\(x-k0\+m,k1\+m-x,z-l0\+m,l1\+m-z\)\);/);
});

test('turns are rare walked bends: on along the way it faces, a half turn only at the end of its room, never a turn while it rests',{skip},async()=>{
 const animals=read('public/farm-animals.js');
 assert.match(animals,/const WALK=\[\.6,2\],SWAY=\.3,BEND=\.25,TURN_ROUND=\.3,APART=\.5,BY=\.3;/);
 // Every walk ends where it can turn round again, its whole way inside its room and clear of the others.
 assert.match(animals,/outside\(a,x,z\)===0&&clearOf\(a,x,z,APART\)&&fine\(a,\[\.\.\.before,\.\.\.line\(start,\[x,z\]\)\],from\)&&turnable\(a,x,z,angle\)/);
 assert.match(animals,/const straight=along\(at,ahead\);if\(straight\)\{a\.bend=0;return straight;\}\n  if\(random\(\)>TURN_ROUND\)return null;/,'a half turn only now and then');
 // Always forward along the way it faces (no sliding sideways, no spin on the spot): steering at most as tight as its bend.
 assert.match(animals,/const most=s\/\(a\.length\*\(a\.kind\.bend\?\?BEND\)\);/);
 assert.match(animals,/at\.x\+=Math\.sin\(a\.yaw\)\*s;at\.z\+=Math\.cos\(a\.yaw\)\*s;/);
 // The yaw changes only in a walk: grazing, standing and lying never turn the body.
 const resting=animals.slice(animals.indexOf('  }else{\n   a.since=0;'),animals.indexOf('  a.obj.rotation.y=a.yaw;'));
 assert.doesNotMatch(resting,/a\.yaw/,'no turning while it rests');
});

test('the Dairy Barn stands one segment further back, its cows\' pasture four segments deep, and the props stay where they stood',()=>{
 const game=read('public/game.js'),scenery=read('public/scenery.js'),farmer=read('public/farm-farmer.js');
 assert.match(game,/zone\('dairy'\);addBuilding\('dairy',-\.3,-16\.1,\{width:6\.8\}\);/);
 assert.match(game,/const west=fenceLine\(-4\.7,-11\.6,4,'z'\),east=fenceLine\(4\.1,-11\.6,4,'z'\),back=\[\.\.\.fenceLine\(-3\.6,-12\.7,1\),\.\.\.fenceLine\(3,-12\.7,1\)\];/);
 assert.match(farmer,/dairy:trip\(\[-4\.8,-16\.86\],\[OUT,\[-7\.8,-4\.4\],\[-7\.8,-16\.86\]\]\)/,'the farmer stands by the barn\'s front corner, behind the fence, as before');
 // The seeded props and scenery are placed as the yard stood before (else every one of them moves farm-wide), then kept off it.
 assert.match(game,/function addExtraProps\(\)\{\n const props=asBefore\(placeExtraProps\),off=keptOff\(\),dairyOff=keptOff\(true\),/);
 assert.match(game,/\[\[-2\.6,-8\.2\],\[2\.2,-8\],\[-\.3,-5\.4\]\]\.forEach/,'the cows\' spots of before');
 assert.match(scenery,/list=list\.filter\(\(\[x,z\]\)=>!keptOff\(x,z,\.3\)\);/);
});
