import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {download} from './model-atlas.js';
import {farmerFiles,validFarmerConfig,DEFAULT_FARMER} from './farmer-parts.js';

// The farmer every player makes for themselves (20 Oct 2026, the owner: "Doe 2"): ithappy Studios' Creative Characters, one skeleton
// with the parts a farmer wears bound to it (scripts/build-farmer.mjs). A farmer is built from a small config (farmer-parts.js: which
// body, face, hair, hat, clothes, ...): only the files of those parts load, each part's mesh is bound to this farmer's own bones by the
// bones' names, and every part of every farmer shares one material and one 512 px colour picture (8 KB). The skeleton and its clips
// (idle, look, relaxed, walk, hop) load once a page; a part's file once a page too, however many farmers wear it.
export const FARMER_BASE='/assets/farmer/';
// The pack's farmer is 1.83 m (bald, in the A pose). The farm's people-sized things: the Farmhouse's door is about 1.6 high, a cow 2.4
// long, the dog 1.45 nose to tail, so the farmer stands a little over the dog's length, like the farm's other animals bigger than life.
export const FARMER_HEIGHT=1.9;
let loader=null,rig=null,picture=null,pictureReady=null;
const files=new Map(),materials=new Map();
function gltf(url){
 loader??=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
 const open=address=>download(address).then(data=>loader.parseAsync(data,FARMER_BASE));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
export function loadRig(){return rig??=gltf(`${FARMER_BASE}farmer-rig.glb`).catch(error=>{rig=null;throw error;});}
export function loadPart(file){
 let p=files.get(file);
 if(!p){p=gltf(`${FARMER_BASE}parts/${file}.glb`);files.set(file,p);p.catch(()=>files.delete(file));}
 return p;
}
// The colour picture: a farmer is shown once it is there (never a black one first); one that does not come is asked for once more.
function texture(){
 if(!picture){
  picture=new THREE.Texture();picture.flipY=false;picture.colorSpace=THREE.SRGBColorSpace;picture.anisotropy=4;
  const images=new THREE.ImageLoader(),url=`${FARMER_BASE}farmer.webp`;
  pictureReady=images.loadAsync(url).catch(()=>images.loadAsync(`${url}?fresh=${Date.now()}`)).then(image=>{picture.image=image;picture.needsUpdate=true;},error=>{pictureReady=null;throw error;});
 }
 return picture;
}
export function farmerReady(){texture();return pictureReady??(picture=null,texture(),pictureReady);}
// The three materials of the pack: its colours (matte, like the farm's models), glass (the lenses of some glasses and helmets) and
// glow (a few costumes' lights). One of each for every farmer on the page.
export function farmerMaterial(kind){
 let m=materials.get(kind);
 if(!m){
  const map=texture();
  if(kind==='farmer-glass')m=new THREE.MeshStandardMaterial({map,roughness:.25,metalness:0,transparent:true,opacity:.45,depthWrite:false});
  else if(kind==='farmer-glow')m=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.8,roughness:1,metalness:0});
  else m=new THREE.MeshStandardMaterial({map,roughness:1,metalness:0});
  m.name=kind;materials.set(kind,m);
 }
 return m;
}
// One part's meshes for a farmer: the file's meshes, sharing its geometry, bound to the farmer's bones of the same names.
function wear(source,bones,parent,file){
 const meshes=[];
 source.scene.traverse(n=>{
  if(!n.isSkinnedMesh)return;
  const mesh=new THREE.SkinnedMesh(n.geometry,farmerMaterial(n.material.name));
  mesh.name=n.name;mesh.userData.file=file;mesh.matrix.copy(n.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.bind(new THREE.Skeleton(n.skeleton.bones.map(b=>bones.get(b.name)),n.skeleton.boneInverses),n.bindMatrix);
  mesh.castShadow=true;mesh.receiveShadow=true;
  // The pose moves the mesh a little round its rest shape (an arm up in the hop): a roomier sphere for the culling.
  mesh.frustumCulled=false;
  parent.add(mesh);meshes.push(mesh);
 });
 return meshes;
}
// A farmer: root (a Group to place and turn; it faces +z) with the skeleton and the parts in it, a mixer with the clips, and
// dress(config) to change what it wears (the parts that stay are kept; a part's file loads once). height: world units, the head's top
// (without a hat) at that height. Never throws for a bad config: it wears the default farmer instead.
export async function createFarmer(config=DEFAULT_FARMER,{height=FARMER_HEIGHT}={}){
 const [{scene,animations}]=await Promise.all([loadRig(),farmerReady()]);
 const root=new THREE.Group();root.name='farmer';
 const body=scene.clone(true);body.scale.setScalar(height/1.83);root.add(body);
 const bones=new Map();body.traverse(n=>{if(n.name)bones.set(n.name,n);});
 const mixer=new THREE.AnimationMixer(body),actions={};
 for(const clip of animations)actions[clip.name]=mixer.clipAction(clip);
 const worn=new Map();let current=null,token=0;
 async function dress(next){
  const ok=validFarmerConfig(next).ok?next:DEFAULT_FARMER;
  return await wearFiles(farmerFiles(ok))?(current=ok):current;
 }
 // The files themselves (the build's thumbnails and portraits wear one part at a time). False when a newer call came first.
 async function wearFiles(want){
  const mine=++token;
  const loaded=await Promise.all(want.map(file=>worn.has(file)?null:loadPart(file).then(g=>[file,g],error=>{console.warn('A part of the farmer could not load.',file,error);return null;})));
  if(mine!==token)return false;
  for(const [file,meshes] of worn)if(!want.includes(file)){for(const m of meshes){m.removeFromParent();m.skeleton.dispose();}worn.delete(file);}
  for(const entry of loaded)if(entry){const [file,g]=entry;worn.set(file,wear(g,bones,body,file));}
  return true;
 }
 await dress(config);
 return {root,body,bones,mixer,actions,dress,wearFiles,worn,get config(){return current;},height,
  dispose(){for(const meshes of worn.values())for(const m of meshes)m.skeleton.dispose();worn.clear();mixer.stopAllAction();root.removeFromParent();}};
}
