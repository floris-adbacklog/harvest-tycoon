import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// farm-duck.js imports 'three' and its addons by name, as the browser's import map does: here the copies the game ships.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const file=new URL('../public/assets/models/duck_101.glb',import.meta.url);

// The duck on the farm's pond (22 Oct 2026, the owner: "zet de eend hier bij, doet verder niks"): the duck of ithappy Studios' Animals
// pack, rebuilt small (scripts/build-farm-animals.mjs, KIND=duck_101), with only its swim and its float.
test('the duck is small: meshopt-packed, quantized, painted from palette.png, with its shade, a swim and a float and nothing more',()=>{
 const size=statSync(file).size,b=readFileSync(file),json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 assert.ok(size<100_000,`duck_101 is ${Math.round(size/1024)} KB`);
 assert.deepEqual([...json.extensionsRequired].sort(),['EXT_meshopt_compression','KHR_mesh_quantization']);
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['swim','swim_idle'],'no walk, run or gesture: it never comes ashore');
 assert.deepEqual(json.images,[{name:'palette',mimeType:'image/png',uri:'palette.png'}],'no picture of its own');
 assert.ok(json.asset.extras.bakedShade&&json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!=null)),'the farm\'s baked shade');
 assert.match(read('scripts/build-farm-animals.mjs'),/duck_101:\{variants:\{duck_white:\['Duck_01'\]\},clips:\['swim','swim_idle'\]\}/);
 assert.match(read('ASSET-USAGE.md'),/duck_101: duck_white \(Duck_01\)/,'written down with the other animals of the paid pack');
});

test('only to look at: it can never be tapped or take a tap from the pond, and nothing is played, saved or counted',()=>{
 const duck=read('public/farm-duck.js');
 assert.match(duck,/const unpickable=object=>object\.traverse\(o=>\{o\.raycast=\(\)=>\{\};\}\);/);
 assert.match(duck,/unpickable\(root\);/);
 assert.doesNotMatch(duck,/userData\.(activity|pet|plot|building)|addEventListener|runAction|localStorage|sessionStorage|state\.|client\.|track\(/);
 assert.doesNotMatch(read('public/game.js'),/farm-duck|duck_101/,'game.js knows nothing of it: no tap, no target');
});

test('it comes after the farm is on screen, never in the loading bar, and not with reduced motion, simple graphics or to save data',()=>{
 const life=read('public/farm-life.js'),game=read('public/game.js');
 assert.doesNotMatch(life,/^import[^\n]*farm-duck/m,'never in the first load');
 assert.doesNotMatch(life.match(/export const LIFE_MODELS=\[[^\]]*\]/)[0],/duck/,'not among the models the loading bar waits for');
 assert.match(life,/\.then\(\(\)=>import\('\.\/farm-duck\.js'\)\)/);
 // Asked for from the frame (animate runs only once the farm is drawn, never while the tab is hidden or motion is reduced).
 assert.match(life,/if\(reducedMotion\)return;\n  askDuck\(\);duck\?\.animate\(dt\);/);
 assert.match(life,/if\(reducedMotion\|\|simple\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\)return;/);
 assert.match(life,/requestIdleCallback\(done,\{timeout:6000\}\)/,'and a quiet moment after');
 assert.match(life,/catch\(error=>console\.warn\('The duck was skipped\.',error\)\)/);
 assert.match(game,/farmLife=createFarmLife\(\{[^}]*reducedMotion,simple:graphicsSimple\}\);/,'game.js says when the graphics are simple');
});

// The pond as it stands in the lab (22 Oct 2026, level 60): the oval's middle, and the boxes round the pier, the moored boat and the
// rowboat (Box3 of the placed models).
const WATER={x:25.68,z:15.16,rx:7.4,rz:4.8};
const BOXES=[[28.45,32.51,16.33,19.99],[27.72,30.04,18.21,20.11],[21.44,24.72,11.68,15.04]].map(([minX,maxX,minZ,maxZ])=>({minX,maxX,minZ,maxZ}));
const seeded=seed=>()=>((seed=(seed*1664525+1013904223)>>>0)/2**32);
test('it floats and paddles on the water: off the bank, clear of the boats, the pier and the fishing line, turning only while it paddles',{skip},async()=>{
 const {createSwim,DUCK}=await import('../public/farm-duck.js');
 const {placeIn,POND}=await import('../public/farm-layout.js');
 const [cx,cz]=placeIn('pond',POND.x,POND.z);assert.ok(Math.abs(cx-WATER.x)<.01&&Math.abs(cz-WATER.z)<.01,'the pond is where the lab measured it');
 const pier=BOXES[0],mid=[(pier.minX+pier.maxX)/2,(pier.minZ+pier.maxZ)/2],to=Math.atan2(cx-mid[0],cz-mid[1]),line={a:mid,b:[mid[0]+Math.sin(to)*4.2,mid[1]+Math.cos(to)*4.2],r:.35};
 const near=(x,z)=>{const ux=line.b[0]-line.a[0],uz=line.b[1]-line.a[1],k=Math.max(0,Math.min(1,((x-line.a[0])*ux+(z-line.a[1])*uz)/(ux*ux+uz*uz)));return Math.hypot(x-line.a[0]-ux*k,z-line.a[1]-uz*k);};
 for(const seed of [1,2,3,4,5,6,7,8]){
  const swim=createSwim({water:WATER,boxes:BOXES,lines:[line],random:seeded(seed)}),s=swim.state,dt=1/30;
  let still=0,steps=0,spots=new Set(),edgeK=0,boxGap=9,lineGap=9;
  for(let i=0;i<30*60*20;i++){
   const yaw=s.yaw;swim.step(dt);steps++;
   // It turns only as fast as it paddles (a still duck keeps its heading: no spinning on the spot), in gentle curves.
   assert.ok(Math.abs(s.yaw-yaw)<=DUCK.turn*dt*Math.min(1,s.speed/(DUCK.swim*DUCK.slow))+1e-9,'no turn without paddling');
   if(!s.swimming)assert.equal(s.yaw,yaw,'a floating duck drifts straight on');
   if(s.speed<DUCK.swim*.25)still++;
   // Its middle stays at least .6 (inside a shrunken oval) from the bank, and its body clear of the boats, the pier and the line.
   edgeK=Math.max(edgeK,((s.x-WATER.x)/(WATER.rx-.6))**2+((s.z-WATER.z)/(WATER.rz-.6))**2);
   for(const b of BOXES)boxGap=Math.min(boxGap,Math.hypot(Math.max(b.minX-s.x,0,s.x-b.maxX),Math.max(b.minZ-s.z,0,s.z-b.maxZ)));
   lineGap=Math.min(lineGap,near(s.x,s.z));
   spots.add(`${Math.round(s.x)},${Math.round(s.z)}`);
  }
  assert.ok(edgeK<1,`seed ${seed}: off the bank (${edgeK.toFixed(2)})`);
  assert.ok(boxGap>=.3,`seed ${seed}: clear of the boats and the pier (${boxGap.toFixed(2)})`);
  assert.ok(lineGap>=.2,`seed ${seed}: clear of the fishing line (${lineGap.toFixed(2)})`);
  assert.equal(s.blocked,0,`seed ${seed}: it never had to stop short`);
  assert.equal(s.stuck,0,`seed ${seed}: it always found a way on`);
  // "een eend drijft meestal op het water" (the owner): mostly floating, now and then a calm stretch of paddling.
  assert.ok(still/steps>.6&&still/steps<.9,`seed ${seed}: mostly floating (${(100*still/steps).toFixed(0)}% floating)`);
  assert.ok(spots.size>=15,`seed ${seed}: it goes round the pond (${spots.size} spots)`);
 }
});
