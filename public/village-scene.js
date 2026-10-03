import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

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
export async function loadVillage({onProgress}={}){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const [gltf,layout]=await Promise.all([
  loader.loadAsync('/assets/village/village.glb',event=>{if(event.total)onProgress?.(event.loaded/event.total);}),
  fetch('/assets/village/village-layout.json').then(r=>{if(!r.ok)throw new Error('The village could not load.');return r.json();})
 ]);
 const world=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 // Finished like the farm's models (Oct 2026; game.js loadModel, scene-polish.js mountainRing): the baked shade (_SHADE, one byte a
 // vertex, scripts/build-village.mjs) becomes the grey vertex colours the farm's models carry, and every material is matte (the
 // pack's roughness .5 gave roofs and hills a plastic sheen). The mountains below fade toward the sky like the farm's, with half its
 // haze (.12): they stand right around the valley and fill half the screen, and the farm's .24 turned them chalk-white and flat.
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;const g=o.geometry,s=g.getAttribute('_shade');
  if(s){const c=new Uint8Array(s.count*4);for(let i=0;i<s.count;i++){c[i*4]=c[i*4+1]=c[i*4+2]=Math.round(s.getX(i)*255);c[i*4+3]=255;}g.setAttribute('color',new THREE.BufferAttribute(c,4,true));g.deleteAttribute('_shade');}
  o.material.roughness=1;o.material.metalness=0;o.material.vertexColors||=Boolean(g.getAttribute('color'));
 });
 const haze=new Map(),hazy=m=>{if(!haze.has(m)){const h=m.clone();h.emissive=new THREE.Color(0xe2ead0);h.emissiveIntensity=.12;haze.set(m,h);}return haze.get(m);};
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
