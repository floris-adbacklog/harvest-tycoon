import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {download} from './model-atlas.js';
import {farmerFiles,validFarmerConfig,DEFAULT_FARMER,FAMILY_SHIRT,FAMILY_SHIRTS} from './farmer-parts.js';
import {FAMILY_EMBLEMS} from './farm-state.js';
import {artSource} from './visual-icons.js';

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
// glow (a few costumes' lights). One of each for every farmer on the page; shade: the part carries the farm's baked shade (COLOR_0,
// scripts/farmer-export.py), as every part built since 21 Oct 2026 does.
export function farmerMaterial(kind,shade=false){
 const key=`${kind}${shade?':shade':''}`;let m=materials.get(key);
 if(!m){
  const map=texture(),vertexColors=shade;
  if(kind==='farmer-glass')m=new THREE.MeshStandardMaterial({map,vertexColors,roughness:.25,metalness:0,transparent:true,opacity:.45,depthWrite:false});
  else if(kind==='farmer-glow')m=new THREE.MeshStandardMaterial({map,vertexColors,emissiveMap:map,emissive:0xffffff,emissiveIntensity:.8,roughness:1,metalness:0});
  else m=new THREE.MeshStandardMaterial({map,vertexColors,roughness:1,metalness:0});
  m.name=kind;materials.set(key,m);
 }
 return m;
}
// The family shirt (21 Oct 2026, item 6): the cut the family picked, in one colour, the family's (its emblem's colour, as its flag),
// with a little of the farm's baked shade, and the emblem on a small cream patch on the chest. family: {shirt, emblem} (the Family
// read's view.family) or null: then the T-shirt in a plain cream until the family is known.
const shirtMaterials=new Map(),patches=new Map();
export const familyColour=emblem=>(FAMILY_EMBLEMS.find(e=>e.id===String(emblem))??FAMILY_EMBLEMS[0]).color;
function shirtMaterial(colour){
 let m=shirtMaterials.get(colour);
 if(!m){m=new THREE.MeshStandardMaterial({color:new THREE.Color(colour),vertexColors:true,roughness:1,metalness:0});m.name='farmer-family-shirt';shirtMaterials.set(colour,m);}
 return m;
}
// The emblem patch: a 64 px canvas (cream round, gold rim, the emblem's picture), drawn once an emblem a page.
function patchTexture(emblem){
 let t=patches.get(emblem);
 if(!t){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  g.beginPath();g.arc(32,32,29,0,Math.PI*2);g.fillStyle='#fff6df';g.fill();g.lineWidth=4;g.strokeStyle='#e9bd4c';g.stroke();
  t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;patches.set(emblem,t);
  const icon=(FAMILY_EMBLEMS.find(e=>e.id===String(emblem))??FAMILY_EMBLEMS[0]).icon,source=artSource(icon);
  if(source){const img=new Image();img.decoding='async';img.onload=()=>{const cell=img.naturalWidth/source.columns,sx=(source.index%source.columns)*cell,sy=Math.floor(source.index/source.columns)*cell;g.drawImage(img,sx,sy,cell,cell,13,13,38,38);t.needsUpdate=true;};img.src=source.src;}
 }
 return t;
}
// Where the patch sits: on the chest, in front of the upper spine, a little to the farmer's left (their heart side), facing forward.
const PATCH=Object.freeze({bone:'Spine1',up:.17,forward:.15,side:.07,size:.11});
function chestPatch(root,bones,height){
 const bone=bones.get(PATCH.bone);if(!bone)return null;
 const k=height/1.83,mesh=new THREE.Mesh(new THREE.PlaneGeometry(PATCH.size*k,PATCH.size*k),new THREE.MeshStandardMaterial({transparent:true,roughness:1,metalness:0,polygonOffset:true,polygonOffsetFactor:-2}));
 mesh.name='family-patch';mesh.visible=false;
 // Placed at the rest pose in the farmer's own space (createFarmer, before anything moves), then kept on the bone: it moves with the chest.
 root.updateMatrixWorld(true);
 const at=new THREE.Vector3();bone.getWorldPosition(at);
 const want=new THREE.Vector3(at.x+PATCH.side*k,at.y+PATCH.up*k,at.z+PATCH.forward*k);
 const bq=new THREE.Quaternion();bone.getWorldQuaternion(bq);const s=new THREE.Vector3();bone.getWorldScale(s);
 mesh.position.copy(bone.worldToLocal(want));mesh.quaternion.copy(bq.invert());mesh.scale.set(1/s.x,1/s.y,1/s.z);
 bone.add(mesh);return mesh;
}
// One part's meshes for a farmer: the file's meshes, sharing its geometry, bound to the farmer's bones of the same names.
function wear(source,bones,parent,file,shadow=true){
 const meshes=[];
 source.scene.traverse(n=>{
  if(!n.isSkinnedMesh)return;
  const mesh=new THREE.SkinnedMesh(n.geometry,farmerMaterial(n.material.name,Boolean(n.geometry.attributes.color)));
  mesh.name=n.name;mesh.userData.file=file;mesh.matrix.copy(n.matrixWorld);mesh.matrix.decompose(mesh.position,mesh.quaternion,mesh.scale);
  mesh.bind(new THREE.Skeleton(n.skeleton.bones.map(b=>bones.get(b.name)),n.skeleton.boneInverses),n.bindMatrix);
  mesh.castShadow=shadow;mesh.receiveShadow=true;
  // The pose moves the mesh a little round its rest shape (an arm up in the hop): a roomier sphere for the culling.
  mesh.frustumCulled=false;
  parent.add(mesh);meshes.push(mesh);
 });
 return meshes;
}
// A farmer: root (a Group to place and turn; it faces +z) with the skeleton and the parts in it, a mixer with the clips, and
// dress(config) to change what it wears (the parts that stay are kept; a part's file loads once). height: world units, the head's top
// (without a hat) at that height. Never throws for a bad config: it wears the default farmer instead.
// family: the family shirt's {shirt, emblem} (item 6), or null. shadow: false for one that walks on the farm (25 Oct 2026): it casts
// nothing into the sun's shadow map, which is drawn again only when the farm changes; soft-shadow.js lies under it instead.
export async function createFarmer(config=DEFAULT_FARMER,{height=FARMER_HEIGHT,family=null,shadow=true}={}){
 const [{scene,animations}]=await Promise.all([loadRig(),farmerReady()]);
 const root=new THREE.Group();root.name='farmer';
 const body=scene.clone(true);body.scale.setScalar(height/1.83);root.add(body);
 const bones=new Map();body.traverse(n=>{if(n.name)bones.set(n.name,n);});
 const mixer=new THREE.AnimationMixer(body),actions={};
 for(const clip of animations)actions[clip.name]=mixer.clipAction(clip);
 const worn=new Map(),patch=chestPatch(root,bones,height);let current=null,token=0,shirtFor=family;
 // A new family shirt (the family's cut, colour or emblem changed): dress(config, family).
 async function dress(next,familyNow=shirtFor){
  const ok=validFarmerConfig(next).ok?next:DEFAULT_FARMER;shirtFor=familyNow;
  if(!await wearFiles(farmerFiles(ok,{shirt:shirtFor?.shirt})))return current;
  current=ok;dressShirt();return current;
 }
 // The family shirt worn: its meshes in the family's colour and the emblem patch on the chest; off: the patch goes.
 function dressShirt(){
  const on=current?.top===FAMILY_SHIRT;if(patch)patch.visible=false;
  if(!on)return;
  const file=farmerFiles({top:FAMILY_SHIRT},{shirt:shirtFor?.shirt})[0],meshes=worn.get(file)??[];
  const colour=shirtFor?familyColour(shirtFor.emblem):'#efe4cc';
  for(const m of meshes)m.material=shirtMaterial(colour);
  if(patch&&shirtFor&&FAMILY_SHIRTS.includes(shirtFor.shirt)){patch.material.map=patchTexture(shirtFor.emblem);patch.material.needsUpdate=true;patch.visible=true;}
 }
 // The files themselves (the build's thumbnails and portraits wear one part at a time). False when a newer call came first.
 async function wearFiles(want){
  const mine=++token;
  const loaded=await Promise.all(want.map(file=>worn.has(file)?null:loadPart(file).then(g=>[file,g],error=>{console.warn('A part of the farmer could not load.',file,error);return null;})));
  if(mine!==token)return false;
  for(const [file,meshes] of worn)if(!want.includes(file)){for(const m of meshes){m.removeFromParent();m.skeleton.dispose();}worn.delete(file);}
  for(const entry of loaded)if(entry){const [file,g]=entry;worn.set(file,wear(g,bones,body,file,shadow));}
  // A part kept from before gets its own colours back (it may have been the family shirt).
  for(const [file,meshes] of worn)if(!loaded.some(e=>e?.[0]===file))for(const m of meshes)if(m.material.name==='farmer-family-shirt')m.material=farmerMaterial('farmer',true);
  return true;
 }
 await dress(config);
 return {root,body,bones,mixer,actions,dress,wearFiles,worn,get config(){return current;},height,
  dispose(){for(const meshes of worn.values())for(const m of meshes)m.skeleton.dispose();worn.clear();mixer.stopAllAction();root.removeFromParent();}};
}
