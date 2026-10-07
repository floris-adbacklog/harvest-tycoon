import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {PALETTE_VERSION} from './model-atlas.js';

// World II, The Village (30 Sep 2026): the village of the ITHappy Studios Village pack, as its own scene. One GLB holds every model
// once (meshopt-compressed, one shared palette texture) and a layout says where each stands (scripts/build-village.mjs); each model
// is drawn as one InstancedMesh, so the 930 trees, rocks and houses cost about 200 draws instead of 1,200. The objects that are not
// a separate model of the pack are in the GLB as they stand (the "static" node). About 5.3 MB, loaded only when a level-100 farmer
// travels to the village.
export const VILLAGE_SIZE=170;   // the village's longest side in game units (the farm is about 55 wide)
// Where the village's places stand, in game units after VILLAGE_SIZE (x, ground height, z), and the road back to the farm.
export const VILLAGE_PLACES=Object.freeze({
 mine:{x:32,y:14.5,z:-22.3},
 lumbercamp:{x:9.6,y:9.2,z:19.4},
 smithy:{x:40.4,y:10,z:-14.2},
 villagemill:{x:28,y:11.2,z:-17.6}
});
export const VILLAGE_UTILITIES=Object.freeze({
 villagemarket:{x:38,y:8.4,z:-7.1},
 farmroad:{x:.6,y:6.7,z:-21}
});
// The cloud shadows' sheet (farm-atmosphere.js) just above the village's highest ground (hills to 12.7, rocks and trees to 15.7), so
// the clouds drift over the whole valley; on the farm's height (.28) it lay under the hills. Only the mountain tops rise through it.
export const VILLAGE_CLOUD_HEIGHT=16;
// The look of the loading screen's painted village (6 Oct 2026): fresh green meadows, deeper trees and a clear blue lake; since
// 7 Oct 2026 as sunny and cheerful as the farm (its light, its palette grade: livelier trees, and a lighter blue lake).
// The pack's hills and the grass edges of its paths sit on the seam between a green and a yellow cell of the palette (564 of
// 1024 px across, the cells are 94 px), so the texture filter painted them two-fifths yellow: the lime meadows. They now read
// the palette's white cell and carry their green in the vertex colours, times the baked shade, one green per row of the pack's
// greens (row 4 its deepest, 7 its lightest). Nothing else in the village reads that seam.
// The greens are the farm's grass: the sunlit meadow renders like the farm's lit grass in the same light, one valley; the pack's
// own greens made a saturated golf-course green (hue 97) beside it. Set again for the farm's sunny light of 7 Oct 2026: at noon
// the meadow renders #a3d259 (hue 83, lightness .59) against the farm's #a1d253 (hue 83, .58), on phones #a1d058 against #a1cf5b.
// Rows 5-7 lighter than the farm's ground colour (game.js), as the baked shade darkens them again; the trees keep the palette's green.
export const VILLAGE_GRASS=Object.freeze({4:0x82b656,5:0x95c560,6:0xaacf6d,7:0xbcd97b});
// The mountains' haze is the farm's (scene-polish.js, 0xe2ead0) since 6 Oct 2026, so both worlds' mountains fade into the same
// air: the cool sky white before it faded them toward blue against the valley's green-white sky. The lake (7 Oct 2026) is halfway
// between the pack's pale cyan (0x80deea) and the clear blue of 6 Oct (0x2898f2), as the farm's pond went from mint to 0x4eb1d2.
export const VILLAGE_LAKE=0x54bbee,VILLAGE_HAZE=0xe2ead0;
const PALETTE_PX=1024,CELL=94,SEAM=564,WHITE=[893/PALETTE_PX,982/PALETTE_PX];
const grassTints=new Map(Object.entries(VILLAGE_GRASS).map(([row,hex])=>[Number(row),new THREE.Color(hex)]));   // linear, as vertex colours are
function freshGrass(g){
 let uv=g.getAttribute('uv'),own=false;const colour=g.getAttribute('color');if(!uv||!colour)return;
 for(let i=0;i<uv.count;i++){
  if(Math.abs(uv.getX(i)*PALETTE_PX-SEAM)>1.5)continue;
  const tint=grassTints.get(Math.floor(uv.getY(i)*PALETTE_PX/CELL));if(!tint)continue;
  // Parts with the same texture coordinates share them (one accessor in the file): each gets its own copy before it changes,
  // or the next part would no longer find the seam and stay white.
  if(!own){uv=uv.clone();own=true;g.setAttribute('uv',uv);}
  uv.setXY(i,WHITE[0],WHITE[1]);colour.setXYZ(i,colour.getX(i)*tint.r,colour.getY(i)*tint.g,colour.getZ(i)*tint.b);
 }
}
export async function loadVillage({onProgress}={}){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const [gltf,layout,palette]=await Promise.all([
  loader.loadAsync('/assets/village/village.glb',event=>{if(event.total)onProgress?.(event.loaded/event.total);}),
  fetch('/assets/village/village-layout.json').then(r=>{if(!r.ok)throw new Error('The village could not load.');return r.json();}),
  // village.glb carries its own copy of the pack's palette; the village paints from village-palette.png instead (6 Oct 2026),
  // the one its props on the farm use, graded like the farm's palette (7 Oct 2026: livelier greens, a touch fuller colours) and
  // versioned past a day-old cache. Without it the village keeps its own copy.
  new THREE.ImageLoader().loadAsync(`/assets/models/village-palette.png?v=${PALETTE_VERSION}`).catch(()=>null)
 ]);
 if(palette){const maps=new Set();gltf.scene.traverse(o=>{if(o.isMesh&&o.material.map)maps.add(o.material.map);});for(const map of maps){map.image?.close?.();map.image=palette;map.needsUpdate=true;}}
 const world=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 // Finished like the farm's models (Oct 2026; game.js loadModel, scene-polish.js mountainRing): the baked shade (_SHADE, one byte a
 // vertex, scripts/build-village.mjs) becomes the grey vertex colours the farm's models carry, and every material is matte (the
 // pack's roughness .5 gave roofs and hills a plastic sheen). The mountains below fade toward the sky like the farm's, with half its
 // haze (.12): they stand right around the valley and fill half the screen, and the farm's .24 turned them chalk-white and flat.
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;const g=o.geometry,s=g.getAttribute('_shade');
  if(s){const c=new Uint8Array(s.count*4);for(let i=0;i<s.count;i++){c[i*4]=c[i*4+1]=c[i*4+2]=Math.round(s.getX(i)*255);c[i*4+3]=255;}g.setAttribute('color',new THREE.BufferAttribute(c,4,true));g.deleteAttribute('_shade');freshGrass(g);}
  o.material.roughness=1;o.material.metalness=0;o.material.vertexColors||=Boolean(g.getAttribute('color'));
  // The pack's water (its "Transparent" material: the lake and the stream down the mountains) was the palette's pale cyan at half
  // strength, a milky green over the lake bed: now a sunny blue with a little of the sun on it, like the farm's pond.
  if(o.material.name==='Transparent'){o.material.map=null;o.material.color.setHex(VILLAGE_LAKE);o.material.opacity=.85;o.material.roughness=.35;}
 });
 // The farm's haze colour at half its strength (6 Oct 2026): the village's grey mountains then render in the farm's mountain tone
 // (7 Oct 2026 at noon: lightness about .69 against the farm's .67, a touch greyer); at the farm's full .24 they went chalk-white.
 const haze=new Map(),hazy=m=>{if(!haze.has(m)){const h=m.clone();h.emissive=new THREE.Color(VILLAGE_HAZE);h.emissiveIntensity=.12;haze.set(m,h);}return haze.get(m);};
 const parts=new Map();for(const node of gltf.scene.children){if(node.name==='static')continue;const list=[];node.traverse(o=>{if(o.isMesh)list.push(o);});parts.set(node.name,list);}
 const byModel=new Map();for(const p of layout)(byModel.get(p.a)??byModel.set(p.a,[]).get(p.a)).push(p.m);
 const flip=new THREE.Matrix4().makeScale(-1,1,1);
 for(const [name,mats] of byModel)for(const mesh of parts.get(name)??[]){
  const all=mats.map(m=>new THREE.Matrix4().fromArray(m).multiply(mesh.matrixWorld)),mountain=/^mountains_/.test(name);
  // A mirrored object (negative scale in the pack's scene) turns its triangles round. three.js handles that for an ordinary mesh,
  // not per instance: the mirrored ones get an InstancedMesh that is itself mirrored, each instance un-mirrored by the same flip,
  // so the triangles face the camera and the light falls on the right side.
  for(const mirrored of [false,true]){
   const list=all.filter(m=>(m.determinant()<0)===mirrored);if(!list.length)continue;
   const im=new THREE.InstancedMesh(mesh.geometry,mountain?hazy(mesh.material):mesh.material,list.length);im.name=name;if(mirrored)im.scale.set(-1,1,1);
   list.forEach((m,i)=>im.setMatrixAt(i,mirrored?flip.clone().multiply(m):m));
   // The mountains (34) cast no shadow, as on the farm: the rim of the valley only threw coarse shade onto it.
   im.castShadow=!mountain;im.receiveShadow=true;im.computeBoundingSphere();world.add(im);
  }
 }
 const statics=gltf.scene.getObjectByName('static');
 if(statics){statics.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});world.add(statics);}
 // Scale the pack's scene (metres, about a kilometre across) to the game: its longest side VILLAGE_SIZE, centred, its lowest
 // point at 0, as in the preview the places were measured in.
 const box=new THREE.Box3().setFromObject(world),size=box.getSize(new THREE.Vector3()),s=VILLAGE_SIZE/Math.max(size.x,size.z);
 const centre=box.getCenter(new THREE.Vector3()).multiplyScalar(s);
 world.scale.setScalar(s);world.position.set(-centre.x,-box.min.y*s,-centre.z);world.updateMatrixWorld(true);
 return world;
}
