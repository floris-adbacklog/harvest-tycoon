import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// village-animals.js imports 'three' and its addons by name, as the browser's import map does: here the copies the game ships.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const glb=name=>{const b=readFileSync(new URL(`../public/assets/models/${name}.glb`,import.meta.url));return {size:b.length,json:JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'))};};

// The village's animals (27 Oct 2026, the owner's d, e and f): pigeons on the square, roe deer and a fox by the Lumber Camp, a cat with
// kittens by the Canteen, from ithappy Studios' Animals pack rebuilt small (scripts/build-village-animals.mjs).
const FILES={pigeon_101:{clips:['fly','idle','walk'],meshes:['pigeon_dark','pigeon_grey','pigeon_pale']},roedeer_101:{clips:['gesture','idle','walk'],meshes:['roe_buck','roe_doe']},
 fox_101:{clips:['idle','run','walk'],meshes:['fox_red']},housecat_101:{clips:['idle','sit','walk'],meshes:['cat_ginger']},kitten_101:{clips:['gesture','idle','walk'],meshes:['kitten_ginger','kitten_grey','kitten_white']}};
test('the models are small: meshopt-packed, quantized, painted from palette.png, with their shade and only the clips the village plays',()=>{
 for(const [name,{clips,meshes}] of Object.entries(FILES)){
  const {size,json}=glb(name);
  assert.ok(size<140_000,`${name} is ${Math.round(size/1024)} KB`);
  assert.deepEqual([...json.extensionsRequired].sort(),['EXT_meshopt_compression','KHR_mesh_quantization'],name);
  assert.deepEqual(json.animations.map(a=>a.name).sort(),clips,name);
  assert.deepEqual(json.meshes.map(m=>m.name).sort(),meshes,name);
  assert.deepEqual(json.images,[{name:'palette',mimeType:'image/png',uri:'palette.png'}],`${name}: no picture of its own`);
  assert.ok(json.asset.extras.bakedShade&&json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!=null)),`${name}: the baked shade`);
 }
 const build=read('scripts/build-village-animals.mjs');
 for(const name of Object.keys(FILES))assert.match(build,new RegExp(`${name}:\\{variants:`));
 assert.match(read('ASSET-USAGE.md'),/village-animals\.js/,'written down with the other animals of the paid pack');
});

test('only to look at: never tapped, nothing saved or counted, no text; it comes after the village is on screen and stays away when it should',()=>{
 const code=read('public/village-animals.js'),game=read('public/game.js');
 assert.match(code,/const unpickable=object=>object\.traverse\(o=>\{o\.raycast=\(\)=>\{\};\}\);/);
 assert.match(code,/unpickable\(group\);/);
 assert.doesNotMatch(code,/runAction|localStorage|sessionStorage|state\.buildings|client\.|track\(|textContent|innerHTML|createElement/);
 assert.match(code,/if\(simple\|\|matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\)return null;/);
 assert.match(code,/requestIdleCallback\(done,\{timeout:6000\}\)/);
 // The taps on the square only listen (passive): the game gets every tap as before.
 for(const m of code.matchAll(/addEventListener\('([a-z]+)'[^\n]*?\{passive:true\}\)/g))assert.ok(['pointerdown','pointerup'].includes(m[1]));
 assert.equal((code.match(/addEventListener\(/g)??[]).length,2);
 // game.js asks for it once, after the village's extras, never in the first load; the cats hang on the Canteen's props.
 assert.doesNotMatch(game,/^import[^\n]*village-animals/m);
 assert.equal((game.match(/village-animals\.js/g)??[]).length,1);
 assert.match(game,/syncVillageExtras\(\);renderer\.shadowMap\.needsUpdate=true;\n  import\('\.\/village-animals\.js'\)\.then\(m=>m\.addVillageAnimals\(\{scene,village:villageGroup,extras:villageExtras,canvas:renderer\.domElement,simple:graphicsSimple\}\)\)/);
 assert.match(code,/\['cats',canteen\]/);
 assert.match(code,/extras\?\.places\?\.get\('canteen'\)/);
});

test('their ground is open ground away from every place\'s pin, landmark and prop, and every walk stays on it',{skip},async()=>{
 const {VILLAGE_ANIMALS,VILLAGE_ANIMAL_KINDS,createWander}=await import('../public/village-animals.js');
 const {VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_LANDMARK_SPOTS,VILLAGE_EXTRAS,VILLAGE_FIELD_PLOT}=await import('../public/village-scene.js');
 const {VILLAGE_DEER}=await import('../public/farm-pets.js');
 const gap=([a,b,c,d],x,z)=>Math.hypot(Math.max(a-x,0,x-b),Math.max(c-z,0,z-d));
 const pins=[...Object.values(VILLAGE_PLACES),...Object.values(VILLAGE_UTILITIES),...Object.values(VILLAGE_LANDMARK_SPOTS)];
 for(const [name,group] of Object.entries(VILLAGE_ANIMALS)){
  assert.ok(Object.hasOwn(VILLAGE_PLACES,group.place)||Object.hasOwn(VILLAGE_UTILITIES,group.place),name);
  for(const r of group.ground){
   assert.ok(r[1]-r[0]>=.5&&r[3]-r[2]>=.5,`${name}: room to walk`);
   for(const p of pins)assert.ok(gap(r,p.x,p.z)>=1.6,`${name}: clear of a pin at ${p.x}, ${p.z}`);
   for(const pieces of Object.values(VILLAGE_EXTRAS))for(const [model,x,,z] of pieces)assert.ok(gap(r,x,z)>=.45,`${name}: clear of ${model} at ${x}, ${z}`);
   const f=VILLAGE_FIELD_PLOT;assert.ok(r[0]>f.x+f.width+1||r[1]<f.x-1||r[2]>f.z+f.depth+1||r[3]<f.z-1,`${name}: off the Village Fields`);
   for(const [x,z] of VILLAGE_DEER.spots)assert.ok(gap(r,x,z)>=3,`${name}: away from the village's deer`);
  }
 }
 // A long while of each group, every animal stepping as the game steps them: always on its ground, turning only while it walks (never
 // more than its turn per unit walked, two and a half times that on a careful walk at the end of its ground), never stopped short, and
 // finding a way on.
 const seeded=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
 for(const [name,group] of Object.entries(VILLAGE_ANIMALS))for(const seed of [1,2,3,4,5]){
  const random=seeded(seed),list=[];
  for(const [kind] of group.animals){const spec=VILLAGE_ANIMAL_KINDS[kind],me=list.length;list.push({spec,w:createWander({rects:group.ground,spec,random,others:()=>list.filter((_,i)=>i!==me).flatMap(a=>[[a.w.state.x,a.w.state.z],...(a.w.state.target?[a.w.state.target]:[]),...(a.w.state.flight?[a.w.state.flight.to]:[])])})});}
  const dt=1/30;let walked=0,close=0,steps=0;
  for(let i=0;i<30*60*10;i++)for(const a of list){
   const s=a.w.state,yaw=s.yaw,x=s.x,z=s.z,flying=Boolean(s.flight);
   if(name==='pigeons'&&i%(30*40)===0)a.w.fly();
   a.w.step(dt);steps++;
   const moved=Math.hypot(s.x-x,s.z-z);walked+=moved;
   assert.ok(a.w.free(s.x,s.z),`${name} seed ${seed}: off its ground at ${s.x.toFixed(2)}, ${s.z.toFixed(2)}`);
   if(!flying&&!s.flight)assert.ok(Math.abs(((s.yaw-yaw+3*Math.PI)%(2*Math.PI))-Math.PI)<=a.spec.turn*2.5*moved+1e-6,`${name} seed ${seed}: a turn without walking`);
   for(const b of list)if(b!==a&&!s.flight&&!b.w.state.flight&&Math.hypot(b.w.state.x-s.x,b.w.state.z-s.z)<Math.min(a.spec.apart,b.spec.apart)*.5)close++;
  }
  for(const a of list)assert.equal(a.w.state.blocked,0,`${name} seed ${seed}: stopped short`);
  assert.ok(walked>list.length*3,`${name} seed ${seed}: they move about (${walked.toFixed(1)} units)`);
  assert.ok(close/steps<.01,`${name} seed ${seed}: they keep their room (${(100*close/steps).toFixed(2)}%)`);
 }
});
