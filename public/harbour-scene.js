import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {download,sharePalette} from './model-atlas.js';
import {tuftGeometry,wildflowerGeometry,wildflowerMaterial,BLOOM} from './scene-polish.js';

// World III, The Harbour (27 Oct 2026, Fase 0: the map only, the owner: "Bouw de map zoals de .blend"): the port of the ITHappy Studios
// Port pack's demo scene, as its own scene, built as the village is (village-scene.js): one GLB holds every model once (meshopt, the
// pack's palette) and a layout says where each of the 8,170 stands, each model drawn as one InstancedMesh (369 draws). Left out of the
// pack's scene: the tank farms, tank wagons, the tanker, the factories, the bulldozer, excavator and wheel loader, the studio's name
// plates, two in three parked cars and road barriers; the grey paving and mountains read warmer cells of the palette (the build in
// ~/Harvest Tycoon/plan-wereld-3). Only a level-200 farmer who travels here downloads it (about 2.7 MB).
// It answers to the same names as village-scene.js, so game.js runs the harbour on the village's camera and HUD: no places yet.
export const HARBOUR_SCALE=.2;   // the pack's metres to game units: the village's houses are as big (its kilometre is 170 units)
const PORT_MIDDLE=new THREE.Vector3(35,0,-100);   // the middle of the quays in the pack's scene (glTF axes, metres)
export const HARBOUR_BYTES=1648532;
const HARBOUR_FILE='/assets/harbour/harbour.glb',LAYOUT_FILE='/assets/harbour/harbour-layout.json',NATURE_FILE='/assets/harbour/harbour-nature.json',TREES_FILE='/assets/harbour/harbour-trees.glb',ANIMALS_FILE='/assets/harbour/harbour-animals.json';
export const HARBOUR_SEA=0x3fa9e0;
// Where the harbour's places and pins stand (game units, x, the roof's height, z), from build-tools/place.py's spots (the pack's metres ×
// HARBOUR_SCALE, less PORT_MIDDLE): the four places on their plots, the harbour office on a blue-and-white shed on the quay (its goods sell at the Market button),
// the seal on the quay's edge, the road back to the farm
// on the land side (28 Oct 2026, the owner: where there is no port, at the side: the road that leaves the port east into the
// green), and the boat back to the village at the quay's edge, over the water as the town boat came.
export const VILLAGE_PLACES=Object.freeze({ropewalk:{x:11.8,y:2.4,z:-66},cooperage:{x:37.4,y:1.6,z:-45.6},galley:{x:44,y:1.6,z:-66.6},harbourforge:{x:-15.4,y:2,z:-36.8},
 chandlery:{x:46.2,y:1.8,z:-11.8},paintshop:{x:31,y:1.8,z:-22.8},instruments:{x:47.4,y:1.4,z:-44.4},   // place2.py's three (27 Oct 2026)
 cannery:{x:20.4,y:1.8,z:-13.4},tradinghouse:{x:7.4,y:1.4,z:-56.8},boatyard:{x:-18.2,y:.9,z:-21.2}});   // and place3.py's
export const VILLAGE_UTILITIES=Object.freeze({harbouroffice:{x:2,y:3.2,z:14},harbourwarehouse:{x:43.8,y:2.8,z:4.6},harbourseal:{x:26,y:.8,z:60},farmroad:{x:54,y:1.4,z:-25},villageboat:{x:-7,y:1.2,z:28}});
export const VILLAGE_LANDMARK_SPOTS=Object.freeze({}),VILLAGE_FAR_SIDE=Object.freeze([]),VILLAGE_FRAME=Object.freeze([]);
// What the whole-harbour view frames: the quays' corners (x, roof height, z in game units).
export const FRAME_SPOTS=Object.freeze([{x:-40,y:4,z:-70},{x:40,y:4,z:-70},{x:-40,y:4,z:70},{x:40,y:4,z:70}]);
// The quays fill a diamond on the screen (±94 across, ±58 up): the view stays inside this ellipse, a little of the sea and the land round it.
export const VILLAGE_VIEW=Object.freeze({x:20,y:20,rx:240,ry:160});
export const VILLAGE_CLOUD_HEIGHT=12;
export function groundUnder(){return ()=>0;}
function twice(url,options){
 return download(url,options).catch(()=>download(`${url}?fresh=${Date.now()}`,options)).catch(()=>{throw new Error('The harbour could not load.');});
}
export async function loadVillage({onProgress}={}){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const [data,layout]=await Promise.all([
  twice(HARBOUR_FILE,{onProgress:event=>onProgress?.(Math.min(1,event.loaded/Math.max(event.total||0,HARBOUR_BYTES)))}),
  twice(LAYOUT_FILE,{type:'json'})
 ]);
 const gltf=await loader.parseAsync(data,'/assets/harbour/');
 const world=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 // Matte like the farm and the village; the pack's sea (its "water" material on one big plane) a sunny blue.
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;o.material.roughness=1;o.material.metalness=0;
  if(o.material.name==='water'){o.material.map=null;o.material.color.setHex(HARBOUR_SEA);o.material.roughness=.35;}
 });
 const parts=new Map();for(const node of gltf.scene.children){const list=[];node.traverse(o=>{if(o.isMesh)list.push(o);});parts.set(node.name,list);}
 const byModel=new Map();for(const p of layout)(byModel.get(p.a)??byModel.set(p.a,[]).get(p.a)).push(p.m);
 // The pack's grey mountains round the bay (as in its scene), faded toward the sky with the village's haze, as the village's are.
 const haze=new Map(),hazy=m=>{if(!haze.has(m)){const h=m.clone();h.emissive=new THREE.Color(0xe2ead0);h.emissiveIntensity=.12;haze.set(m,h);}return haze.get(m);};
 const flip=new THREE.Matrix4().makeScale(-1,1,1);
 const meadows=new Map(),meadow=m=>{if(!meadows.has(m))meadows.set(m,meadowMaterial(m));return meadows.get(m);};
 for(const [name,mats] of byModel)for(const mesh of parts.get(name)??[]){
  const all=mats.map(m=>new THREE.Matrix4().fromArray(m).multiply(mesh.matrixWorld)),mountain=/^mountain/.test(name),flat=/^(Wall|ground|road_markings?)/.test(name);
  // Mirrored objects get a mirrored InstancedMesh, each instance un-mirrored by the same flip (as in the village).
  for(const mirrored of [false,true]){
   const list=all.filter(m=>(m.determinant()<0)===mirrored);if(!list.length)continue;
   const im=new THREE.InstancedMesh(mesh.geometry,mountain?hazy(mesh.material):/^h\d+_ground$/.test(name)?meadow(mesh.material):mesh.material,list.length);im.name=name;if(mirrored)im.scale.set(-1,1,1);
   list.forEach((m,i)=>im.setMatrixAt(i,mirrored?flip.clone().multiply(m):m));
   im.castShadow=!mountain&&!flat;im.receiveShadow=true;im.computeBoundingSphere();world.add(im);
  }
 }
 await addNature(world).catch(error=>console.warn('The harbour\'s trees were skipped.',error?.message));
 await addAnimals(world).catch(error=>console.warn('The harbour\'s seals and pigeons were skipped.',error?.message));
 world.scale.setScalar(HARBOUR_SCALE);world.position.copy(PORT_MIDDLE).multiplyScalar(-HARBOUR_SCALE);world.updateMatrixWorld(true);
 world.userData={scale:HARBOUR_SCALE};
 window.__harbour=world;   // the harness looks at it
 return world;
}
// The harbour's grass as the farm's meadow (27 Oct 2026, the owner: "gras is nu heel saai"): where the pack's ground reads a green cell
// it becomes the farm's ground green (0x8cbc58) with the farm's soft mottling in three scales and its slight warm/green drift
// (scene-polish.js groundTexture), a little deeper and wider for the harbour's distance, worked out from where it lies, so the big
// ground pieces need no texture; their sand stays sand.
const MEADOW_GLSL=`varying vec3 vMeadow;
float meadowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float meadowNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(meadowHash(i),meadowHash(i+vec2(1,0)),f.x),mix(meadowHash(i+vec2(0,1)),meadowHash(i+vec2(1,1)),f.x),f.y);}`;
function meadowMaterial(base){
 const m=base.clone();
 m.onBeforeCompile=shader=>{
  shader.vertexShader='varying vec3 vMeadow;\n'+shader.vertexShader.replace('#include <project_vertex>','#include <project_vertex>\n vec4 meadowAt=vec4(transformed,1.);\n #ifdef USE_INSTANCING\n meadowAt=instanceMatrix*meadowAt;\n #endif\n vMeadow=(modelMatrix*meadowAt).xyz;');
  shader.fragmentShader=MEADOW_GLSL+'\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
  {vec3 c=diffuseColor.rgb;float green=step(c.r+.03,c.g)*step(c.b+.03,c.g);vec2 p=vMeadow.xz;
   float n1=meadowNoise(p*.05),n2=meadowNoise(p*.13+7.3),n3=meadowNoise(p*.4+3.1),v=.5*n1+.3*n2+.2*n3;
   float shade=.74+.4*clamp((v-.22)*1.8,0.,1.);
   vec3 grass=vec3(.262,.503,.098)*shade*vec3(1.+(n2-.5)*.3,1.,1.-(n1-.5)*.45);
   diffuseColor.rgb=mix(c,grass,green);}`);
 };
 m.customProgramCacheKey=()=>'harbour-meadow';
 return m;
}
// Trees, bushes, grass and flowers as on the farm (27 Oct 2026, the owner: "zoals village en farm met bomen etc", "kijk ook naar farm,
// past misschien beter"): the farm's own models and palette, at the harbour's size, where harbour-nature.json puts them (rays dropped on
// the green land in Blender, plan-wereld-3/build-tools/nature.py): groups of mixed trees well inside the green, bushes along its edge by
// the quays and the water, clumps of grass and patches of one-colour flowers. Positions are the pack's metres, inside the world group.
const TREES=['tree_001','tree_002','tree_004','tree_005','tree_006','tree_007','tree_008','tree_009','tree_010','tree_011'],FIRS=['fir_tree_001','fir_tree_003','fir_tree_006','fir_tree_007','fir_tree_010'],BUSHES=['bush_001','bush_002','bush_003','bush_004'];
// How tall each kind stands, in the pack's metres (a container is 2.7): trees about as tall as the long warehouses, bushes knee-high to them.
const TALL={trees:12.5,firs:13,bushes:2.8,stones:4};
const GRASS=[0x8fae4a,0x9db752,0x7ea043,0xb2b95a,0xa6a94a,0xc0b45c];
async function addNature(world){
 // harbour-trees.glb holds them decimated to 130-380 triangles each (build-tools/nature_models.py: the farm's bushes have up to 2,400,
 // and 900 of them cost more than the whole port), without a picture: they take the farm's palette from bush_001, as on the farm.
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const [nature,trees,farm]=await Promise.all([twice(NATURE_FILE,{type:'json'}),twice(TREES_FILE).then(data=>loader.parseAsync(data,'/assets/harbour/')),sharePalette(new GLTFLoader()).loadAsync('/assets/models/bush_001.glb')]);
 let palette=null;farm.scene.traverse(o=>{if(o.isMesh&&o.material.map)palette??=o.material;});
 const models=new Map();for(const node of [...trees.scene.children]){if(palette)node.traverse(o=>{if(o.isMesh){const m=palette.clone();m.vertexColors=Boolean(o.geometry.getAttribute('color'));o.material=m;}});const scene=new THREE.Group();scene.add(node);node.position.set(0,0,0);models.set(node.name,{scene});}
 const group=new THREE.Group();group.name='harbour-nature';
 const dummy=new THREE.Object3D();
 const place=(kind,names)=>{
  const byName=new Map();for(const p of nature[kind]??[]){const n=names[p[5]%names.length];(byName.get(n)??byName.set(n,[]).get(n)).push(p);}
  for(const [name,list] of byName){
   const gltf=models.get(name);if(!gltf)continue;gltf.scene.updateMatrixWorld(true);const box=new THREE.Box3().setFromObject(gltf.scene),tall=Math.max(.01,box.max.y-box.min.y),k=TALL[kind]/tall;
   gltf.scene.traverse(o=>{
    if(!o.isMesh)return;o.material.roughness=1;o.material.metalness=0;
    const im=new THREE.InstancedMesh(o.geometry,o.material,list.length);
    list.forEach(([x,y,z,size,turn],i)=>{dummy.position.set(x,y-box.min.y*k*size,z);dummy.rotation.set(0,turn,0);dummy.scale.setScalar(k*size);dummy.updateMatrix();im.setMatrixAt(i,dummy.matrix.clone().multiply(o.matrixWorld));});
    im.castShadow=kind!=='stones';im.receiveShadow=true;im.computeBoundingSphere();group.add(im);
   });
  }
 };
 place('trees',TREES);place('firs',FIRS);place('bushes',BUSHES);place('stones',['village_stones_001']);
 // The farm's grass tufts and wildflowers (scene-polish.js), six times their size in the pack's metres: the harbour is seen from further
 // off than the farm, and at the farm's size they were specks.
 const tint=new THREE.Color();
 const tufts=nature.tufts??[],tm=new THREE.InstancedMesh(tuftGeometry(),new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}),tufts.length);
 tufts.forEach(([x,y,z,size,turn,c],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,turn,0);dummy.scale.set(6*size,6*size*(.8+(c%3)*.2),6*size);dummy.updateMatrix();tm.setMatrixAt(i,dummy.matrix);tm.setColorAt(i,tint.setHex(GRASS[c%GRASS.length]));});
 tm.computeBoundingSphere();group.add(tm);
 const flowers=nature.flowers??[],fm=new THREE.InstancedMesh(wildflowerGeometry(),wildflowerMaterial(),flowers.length);
 flowers.forEach(([x,y,z,size,turn,c],i)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,turn,0);dummy.scale.setScalar(6.5*size);dummy.updateMatrix();fm.setMatrixAt(i,dummy.matrix);fm.setColorAt(i,tint.setHex(BLOOM[c%BLOOM.length]));});
 fm.computeBoundingSphere();group.add(fm);
 world.add(group);
}
// Seals and pigeons (27 Oct 2026, the owner: "Doe 1&2&3"; plan 15.4): the Animals pack's seals lie on the quays' edge looking at the
// water, a few float in the basin, and flocks of pigeons peck about the open quays (the pack has no gulls). Built as the farm's animals
// (scripts/build-farm-animals.mjs, seal_101 and pigeon_101: three colours each on one skeleton, the farm's palette). Where they stand comes
// from build-tools/place.py (harbour-animals.json, the pack's metres). Only to look at: no tap, nothing saved. They move in their own
// frame, not while the tab is hidden, and stand still with reduced motion.
// A copy of a skinned model with bones of its own (as farm-animals.js cloneRig).
function cloneSkinned(source){
 const copy=source.clone(true),bones=new Map(),skins=[];
 copy.traverse(n=>{if(n.isBone)bones.set(n.name,n);});
 source.traverse(n=>{if(n.isSkinnedMesh)skins.push(n.skeleton);});
 let i=0;copy.traverse(n=>{if(!n.isSkinnedMesh)return;const s=skins[i++];n.bind(new THREE.Skeleton(s.bones.map(b=>bones.get(b.name)),s.boneInverses),n.bindMatrix);});
 return copy;
}
const SEAL_LONG=3,PIGEON_LONG=.9,PIGEON_MOST=42;   // in the pack's metres: a little larger than life, so they read from the harbour's distance
async function addAnimals(world){
 const loader=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const open=name=>download(`/assets/models/${name}.glb`).then(data=>loader.parseAsync(data,'/assets/models/'));
 const [spots,seal,pigeon]=await Promise.all([twice(ANIMALS_FILE,{type:'json'}),open('seal_101'),open('pigeon_101')]);
 const still=matchMedia('(prefers-reduced-motion: reduce)').matches,mixers=[],group=new THREE.Group();group.name='harbour-animals';
 const make=(gltf,long,[x,y,z,turn,variant,clip])=>{
  const model=cloneSkinned(gltf.scene),names=[...new Set(gltf.scene.children.flatMap(c=>{const n=[];c.traverse(o=>{if(o.isSkinnedMesh)n.push(o.name);});return n;}))];
  const show=names[variant%names.length];
  model.traverse(o=>{if(o.isSkinnedMesh){o.visible=o.name===show;o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=1;o.material.metalness=0;o.raycast=()=>{};}});
  const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),k=long/Math.max(size.x,size.z);
  const root=new THREE.Group();model.scale.setScalar(k);model.position.y=-box.min.y*k;root.add(model);root.position.set(x,y,z);root.rotation.y=turn;group.add(root);
  const mixer=new THREE.AnimationMixer(model),find=n=>gltf.animations.find(a=>a.name===n)??gltf.animations.find(a=>a.name==='idle')??gltf.animations[0];   // the village's pigeons have no gesture: they stand
  const action=mixer.clipAction(find(clip));action.play();mixer.update(Math.random()*3);
  return {mixer,find,action,clip,next:2+Math.random()*6};
 };
 for(const spot of spots.animals?.seals??[])mixers.push(make(seal,SEAL_LONG,spot));
 for(const spot of (spots.animals?.pigeons??[]).slice(0,PIGEON_MOST))mixers.push({...make(pigeon,PIGEON_LONG,spot),pigeon:true});
 world.add(group);
 if(still)return;
 const clock=new THREE.Clock();
 (function tick(){
  requestAnimationFrame(tick);const dt=Math.min(.1,clock.getDelta());if(document.hidden)return;
  for(const m of mixers){
   m.mixer.update(dt);
   // A pigeon pecks now and then (its gesture), then stands again.
   if(m.pigeon&&(m.next-=dt)<=0){const to=m.clip==='gesture'?'idle':Math.random()<.5?'gesture':'idle';if(to!==m.clip){const a=m.mixer.clipAction(m.find(to));a.reset().play();m.action.crossFadeTo(a,.3,false);m.action=a;m.clip=to;}m.next=to==='gesture'?1.5+Math.random():3+Math.random()*6;}
  }
 })();
}
