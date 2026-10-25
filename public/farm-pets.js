import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {sharePalette,shareAtlas,download} from './model-atlas.js';
import {softShadow} from './soft-shadow.js';

// The farm's pets (20 Oct 2026, the owner: "doe de kat en de hond, en het hert in Village II"): a dog and a cat by the lane in front of
// the Farmhouse, from the start (no level), and a deer in World II, on the quiet slope above the village lake's east cliff by the woods.
// Each walks slowly between a few spots close together (its walk) and stands a while at each (its idle), sideways to the camera as the
// farm's other animals stand. A tap on one makes it hop and turn to you, with a small heart over it; once an hour it also has a small find
// (game.js patPet and the rules' pet_pat and PETS; this file plays, saves and counts nothing itself). They never take a tap
// from anything else: game.js asks them only when a tap found no field, building, pin or place.
// The models are ithappy Studios' free animals, rebuilt small for the game (scripts/build-pets.mjs, ASSET-USAGE.md): about 100 KB each,
// meshopt-packed, painted from the farm's palette.png. They come after the farm or the village is on screen (game.js), so the loading
// bar never waits for them, and a pet that cannot load is simply not there.
export const PET_MODELS=Object.freeze({dog:'dog_101',cat:'cat_101',deer:'deer_101'});
// Where they walk, in world units, and how big they are (nose to tail). The farm's animals are drawn bigger than life next to its
// buildings (a chicken .72 tall, a cow 2.4 long): the dog is about 60% of a cow, the cat a little bigger than a chicken. walk: units a
// second. spots: the places they walk between, round the lane in front of the Farmhouse, where both are seen at once on a phone and a
// computer, below the top bar. The dog goes from its corner of the front yard (between the porch table, the logs and the mower)
// across the lane to the grass on the other side and back; the cat keeps to that grass, between the big tree, the Feed Mill's name and the barrel by the road.
// Nothing there opens anything, and no tree crown hangs over them (tests/farm-pets.test.mjs keeps them clear of every yard and field).
export const FARM_PETS=Object.freeze({
 dog:Object.freeze({length:1.45,walk:.8,spots:Object.freeze([[-17.6,-7.6],[-19.4,-5.2],[-20.9,-3.1],[-19.4,-3.2]])}),
 cat:Object.freeze({length:.95,walk:.45,spots:Object.freeze([[-20.3,-1.5],[-19.3,-1.2],[-19.8,-2.2]])})
});
// The deer, in the village's own units (its houses stand 1.8 tall): on the grassy slope above the lake's east cliff, among the trees
// south of the Village Fields and above the path, away from every place, landmark and name. A little bigger than life, like the farm's
// animals, or it would be a speck; seen at the left edge of a phone's first view and in the middle of a computer's.
export const VILLAGE_DEER=Object.freeze({length:.72,walk:.3,spots:Object.freeze([[13,-10],[14.2,-9.4],[15.2,-9],[12.8,-8.5]])});
// The game's heart (Lucide's, as the icons of the menus), filled in the game's red by farm-life.css.
const HEART='<svg viewBox="0 0 24 24" width="24" height="24"><path d="M2 9.5a5.5 5.5 0 0 1 9.591-3.676.56.56 0 0 0 .818 0A5.49 5.49 0 0 1 22 9.5c0 2.29-1.5 4-3 5.5l-5.492 5.313a2 2 0 0 1-3 .019L5 15c-1.5-1.5-3-3.2-3-5.5"/></svg>';
// The two ways an animal stands sideways to the camera (which looks from +x, +z), as the farm's do: facing left or right on the screen.
const SIDEWAYS=[-Math.PI/4,3*Math.PI/4];
const TURN=4.2,FADE=.35,HOP=.5,REST=[4,11];
// The turn from one heading to another the short way round (-PI to PI), a step towards it, and the sideways heading nearest to one.
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const turnTowards=(from,to,step)=>{const d=turnOf(from,to);return Math.abs(d)<=step?from+d:from+Math.sign(d)*step;};
const nearestSideways=yaw=>SIDEWAYS.reduce((a,b)=>Math.abs(turnOf(yaw,a))<=Math.abs(turnOf(yaw,b))?a:b);

let loader=null;
async function loadPet(name){
 loader??=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const url=`/assets/models/${name}.glb`,open=address=>download(address).then(data=>loader.parseAsync(data,'/assets/models/'));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
// Every scene's pets, for the screenshot harness (where they stand on the screen, to tap one).
export const PET_HERDS=new Set();
// The pets of one scene. ground(x, z): the height of the ground there (0 on the farm). labels: the layer the heart pops up in.
export async function createPets({scene,kinds,ground=()=>0,labels,reducedMotion}){
 const pets=new Map();let view=null;
 await Promise.all(Object.entries(kinds).map(async([id,spec])=>{
  let gltf;try{gltf=await loadPet(PET_MODELS[id]);}catch(error){console.warn('A pet could not load; the farm is there without it.',id,error);return;}
  const model=gltf.scene;
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=1;o.material.metalness=0;}});
  shareAtlas(model,PET_MODELS[id]);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),k=spec.length/Math.max(size.x,size.z);
  model.scale.setScalar(k);model.position.set(-(box.min.x+box.max.x)/2*k,-box.min.y*k,-(box.min.z+box.max.z)/2*k);
  const body=new THREE.Group();body.add(model);
  const root=new THREE.Group();root.name=`pet-${id}`;root.add(body);
  root.add(softShadow(spec.length*.9,spec.length*.9*.62));
  // The tap target: a box round the animal, a little bigger than it, so a small pet is easy to tap on a phone. Never drawn.
  const hit=new THREE.Mesh(new THREE.BoxGeometry(size.x*k+.5,size.y*k+.3,size.z*k+.5),new THREE.MeshBasicMaterial({visible:false}));
  hit.position.y=size.y*k/2;hit.userData.pet=id;root.add(hit);
  const mixer=new THREE.AnimationMixer(model),clip=name=>gltf.animations.find(a=>a.name===name);
  const idle=mixer.clipAction(clip('idle')),walk=mixer.clipAction(clip('walk'));
  const spots=spec.spots,start=spots[0],yaw=SIDEWAYS[pets.size%2];
  root.position.set(start[0],ground(start[0],start[1]),start[1]);root.rotation.y=yaw;
  idle.play();mixer.update(Math.random()*3);
  scene.add(root);
  pets.set(id,{id,spec,root,body,hit,mixer,idle,walk,height:size.y*k,spot:0,target:null,rest:REST[0]*Math.random(),yaw,face:yaw,hop:0,walking:false});
 }));
 function play(p,walking){
  if(p.walking===walking)return;p.walking=walking;
  const [from,to]=walking?[p.idle,p.walk]:[p.walk,p.idle];
  to.reset().play();from.crossFadeTo(to,FADE,false);
 }
 function nextSpot(p){
  const n=p.spec.spots.length;let next=Math.floor(Math.random()*(n-1));if(next>=p.spot)next++;
  p.spot=next;p.target=p.spec.spots[next];
 }
 // One step of every pet: dt in seconds (game.js caps it at a tenth). Never called while the tab is hidden, the farm rests under a
 // window, or motion is reduced (then they stand still in their idle).
 function animate(dt){
  for(const p of pets.values()){
   const at=p.root.position;
   if(p.hop>0){p.hop=Math.max(0,p.hop-dt);const f=1-p.hop/HOP;p.body.position.y=Math.sin(f*Math.PI)*p.height*.35;}
   if(p.target&&p.hop<=0){
    const dx=p.target[0]-at.x,dz=p.target[1]-at.z,d=Math.hypot(dx,dz);
    if(d<.05){p.target=null;p.rest=REST[0]+Math.random()*(REST[1]-REST[0]);p.face=nearestSideways(p.yaw);}
    else{
     const want=Math.atan2(dx,dz);p.yaw=turnTowards(p.yaw,want,TURN*dt);play(p,true);
     // It turns on the spot first, then walks: no sliding sideways.
     if(Math.abs(turnOf(p.yaw,want))<.5){const s=Math.min(d,p.spec.walk*dt);at.x+=dx/d*s;at.z+=dz/d*s;at.y=ground(at.x,at.z);}
    }
   }else if(!p.target){
    // Back to face along the screen with its legs stepping, then it stands (22 Oct 2026: no turning round on still legs). A tap's
    // turn towards you comes with the hop.
    const turning=Math.abs(turnOf(p.yaw,p.face))>.02;
    p.yaw=turnTowards(p.yaw,p.face,TURN*dt);play(p,turning&&p.hop<=0);
    if(p.hop<=0&&(p.rest-=dt)<=0)nextSpot(p);
   }
   p.root.rotation.y=p.yaw;p.mixer.update(dt);
  }
 }
 // The hits for a tap that found nothing else (game.js pointerTarget): the pet's id, or null.
 function pick(raycaster){
  const hit=raycaster.intersectObjects([...pets.values()].map(p=>p.hit),false)[0];
  return hit?hit.object.userData.pet:null;
 }
 // A tap: a hop, a turn towards you, and a heart. It stops where it is and rests a little before it walks on.
 function react(id){
  const p=pets.get(id);if(!p)return false;
  p.target=null;play(p,false);p.rest=3+Math.random()*3;p.face=Math.PI/4;
  if(!reducedMotion){p.hop=HOP;p.yaw=turnTowards(p.yaw,p.face,.9);}else p.yaw=p.face;
  p.root.rotation.y=p.yaw;
  if(labels&&view){
   const {camera,width,height}=view,s=new THREE.Vector3(p.root.position.x,p.root.position.y+p.height*1.15,p.root.position.z).project(camera);
   const heart=document.createElement('span');heart.className='pet-heart';heart.setAttribute('aria-hidden','true');heart.innerHTML=HEART;
   heart.style.left=`${(s.x*.5+.5)*width}px`;heart.style.top=`${(-s.y*.5+.5)*height}px`;labels.append(heart);
   heart.addEventListener('animationend',()=>heart.remove());setTimeout(()=>heart.remove(),1600);
  }
  return true;
 }
 // Where a pet's find floats up from (game.js floatAt): just over its head, where it stands now.
 const top=id=>{const p=pets.get(id);return p?{x:p.root.position.x,y:p.root.position.y+p.height*1.3,z:p.root.position.z}:null;};
 // The camera and the size of the farm on the screen, as the names over the buildings were last placed (game.js positionBuildingLabels).
 function position(camera,width,height){view={camera,width,height};}
 // Where each pet stands on the screen, in pixels of the farm's view.
 const where=()=>view?[...pets.values()].map(p=>{const s=p.root.position.clone();s.y+=p.height/2;s.project(view.camera);return {id:p.id,x:(s.x*.5+.5)*view.width,y:(-s.y*.5+.5)*view.height,world:[p.root.position.x,p.root.position.z]};}):[];
 const herd={pets,animate,pick,react,top,position,where};PET_HERDS.add(herd);return herd;
}
