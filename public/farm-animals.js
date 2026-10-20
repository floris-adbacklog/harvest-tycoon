import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {sharePalette,shareAtlas,download} from './model-atlas.js';

// The farm's animals move (20 Oct 2026, the owner: "voeg (nog) niks toe, alleen de 6 bestaande"): the chickens, cows, goats, pigs,
// sheep and horses that stood still get animated twins from ithappy Studios' Animals pack (scripts/build-farm-animals.mjs,
// ASSET-USAGE.md). Nothing is added, moved or taken away: the still models load and stand as before (the loading bar never waits for
// this file), and once the farm is on screen and the page has a quiet moment each kind comes in (about 70-130 KB a file, one file for
// all the colours of a kind) and takes the place of its still models, one kind at a time. A kind that cannot load keeps its still models.
// The still model stays where it was as the animal's tap target, unseen: the animal is drawn inside it, and it walks and turns with the
// animal, so a tap on an animal opens what it opened before (game.js pointerTarget), greyed and shown with its yard as before.
// They mostly graze and stand, now and then take a few calm steps in their own pen, round the spot the layout gives them, and the
// cows and pigs lie down for a while. No running. Each keeps its own clock, so they never move together.
// Which still model becomes which animated one: [file, its mesh in that file]. The colours follow the old ones (the build repaints
// where the pack has no such animal: the grey goat, the all-white sheep, the brown hen).
export const ANIMATED=Object.freeze({
 chicken_001:['chicken_101','hen_brown'],chicken_002:['chick_101','chick_yellow'],chicken_003:['chicken_101','hen_white'],
 cow_001:['cow_101','cow_black'],cow_003:['cow_101','cow_brown'],
 goat_001:['goat_101','goat_white'],goat_002:['goat_101','goat_grey'],
 pig_002:['pig_101','pig_peach'],pig_003:['pig_101','pig_pink'],pig_005:['pig_101','pig_peach'],
 sheep_001:['sheep_101','sheep_white'],sheep_002:['sheep_101','sheep_grey'],sheep_003:['sheep_101','sheep_cream'],
 horse_002:['horse_101','horse_bay'],horse_003:['horse_101','horse_chestnut'],horse_004:['horse_101','horse_black'],horse_005:['horse_101','horse_bay']
});
// The order they come in: the kinds round the home view first.
export const ANIMAL_FILES=Object.freeze(['chicken_101','cow_101','horse_101','sheep_101','goat_101','pig_101','chick_101']);
// Each kind: how far from its spot it may wander (world units, along the screen; a third of that up and down it), its stride (a walk
// cycle's ground in body lengths, so the feet do not slide), how fast its walk plays, and how often it does what (it picks again
// after each). The clips it has: the build keeps idle, walk and eat (the goat's gesture instead), and lie for the cow and the pig.
export const ANIMAL_KINDS=Object.freeze({
 chicken_101:{roam:.8,stride:.42,pace:.8,odds:{eat:.5,idle:.32,walk:.18}},
 // The scenery's two chicks stay on their spots (scenery.js finds them a free one), cheeping about.
 chick_101:{roam:0,stride:.4,pace:.8,odds:{idle:.6,gesture:.4}},
 cow_101:{roam:.75,stride:.36,pace:.7,odds:{eat:.45,idle:.31,walk:.14,lie:.1}},
 goat_101:{roam:.8,stride:.4,pace:.75,odds:{idle:.48,gesture:.34,walk:.18}},
 pig_101:{roam:.5,stride:.36,pace:.7,odds:{eat:.4,idle:.3,walk:.14,lie:.16}},
 sheep_101:{roam:.8,stride:.34,pace:.7,odds:{eat:.52,idle:.32,walk:.16}},
 horse_101:{roam:.9,stride:.4,pace:.7,odds:{eat:.48,idle:.38,walk:.14}}
});
// How long a state lasts, in seconds (a walk lasts until it is there).
const LASTS={idle:[5,12],eat:[6,15],gesture:[5,9],lie:[16,34]};
const FADE=.6,LIE_FADE=1.4,TURN=1.6;
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const turnTowards=(from,to,step)=>{const d=turnOf(from,to);return Math.abs(d)<=step?from+d:from+Math.sign(d)*step;};
// Along the screen (the camera looks from +x, +z) and up and down it, on the ground.
const ACROSS=[Math.SQRT1_2,-Math.SQRT1_2],DEPTH=[Math.SQRT1_2,Math.SQRT1_2];

// Every farm's herd, for the screenshot harness (where each animal stands on the screen, to tap one).
export const ANIMAL_HERDS=new Set();
let loader=null;
function loadFile(name){
 loader??=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const url=`/assets/models/${name}.glb`,open=address=>download(address).then(data=>loader.parseAsync(data,'/assets/models/'));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
// A copy of a skinned model with bones of its own (the copy's meshes are bound to the copy's bones, found by their names).
function cloneRig(source){
 const copy=source.clone(true),bones=new Map(),skins=[];
 copy.traverse(n=>{if(n.isBone)bones.set(n.name,n);});
 source.traverse(n=>{if(n.isSkinnedMesh)skins.push(n.skeleton);});
 let i=0;copy.traverse(n=>{if(!n.isSkinnedMesh)return;const s=skins[i++];n.bind(new THREE.Skeleton(s.bones.map(b=>bones.get(b.name)),s.boneInverses),n.bindMatrix);});
 return copy;
}
// Standing, grazing or (the goat) its gesture, without walking or lying: how a still one passes its time, and how each starts.
const resting=a=>({idle:1,...(a.actions.eat?{eat:1.4}:{}),...(a.actions.gesture?{gesture:.8}:{})});
const pick=(odds,random)=>{let r=random()*Object.values(odds).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(odds)){r-=w;if(r<=0)return k;}return Object.keys(odds)[0];};

// The animals of the farm. list: [{obj, still}] with obj a still animal on the farm (cloneModel's, or scenery.js's) and still true for
// one that only stands (the Animal paddock's horse, whose pin and tap box stay where they are, and the white hen and the two chicks
// of the scenery).
// relock(obj): greys the new animal with its yard if the yard is still to come (game.js setLocked). lite: phones (their animals move
// at half the frame rate). onKind: after a kind took its place (the shadows are drawn again).
export function createHerd({list,relock=()=>{},lite=false,onKind=()=>{},random=Math.random}){
 const herd=[],frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();let frame=0,stopped=false,seenBy=null;
 const todo=new Map();
 for(const entry of list){const [file]=ANIMATED[entry.obj.userData.model??entry.obj.userData.scenery]??[];if(file)(todo.get(file)??todo.set(file,[]).get(file)).push(entry);}
 function adopt(file,gltf,{obj,still}){
  const model=obj.userData.model??obj.userData.scenery,[,variant]=ANIMATED[model],kind=ANIMAL_KINDS[file];
  const rig=cloneRig(gltf.scene);
  // Only this one's colours: the kind's other meshes go.
  const others=[];rig.traverse(n=>{if(n.isSkinnedMesh&&n.name!==variant)others.push(n);});
  for(const n of others)n.removeFromParent();
  let body=null;rig.traverse(n=>{if(n.isSkinnedMesh&&n.name===variant)body=n;});if(!body)return null;
  body.castShadow=true;body.receiveShadow=true;body.material.roughness=1;body.material.metalness=0;
  shareAtlas(rig,file);
  const mixer=new THREE.AnimationMixer(rig),actions={};
  for(const clip of gltf.animations)if(clip.name==='walk'||kind.odds[clip.name]||clip.name==='idle')actions[clip.name]=mixer.clipAction(clip);
  if(!actions.idle||!actions.walk)return null;
  actions.walk.timeScale=kind.pace;
  // The still model's size, turned straight: the animal gets its length.
  const turn=obj.rotation.y;obj.rotation.y=0;obj.updateMatrixWorld(true);
  const was=new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());obj.rotation.y=turn;obj.updateMatrixWorld(true);
  actions.idle.play();mixer.update(0);rig.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(rig),size=box.getSize(new THREE.Vector3());
  const length=Math.max(was.x,was.z),k=length/Math.max(size.x,size.z),s=obj.scale.x;
  rig.scale.setScalar(k/s);rig.position.set(-(box.min.x+box.max.x)/2*k/s,-box.min.y*k/s,-(box.min.z+box.max.z)/2*k/s);
  // The pose moves the mesh a little round its standing shape (a head down to graze, lying): a roomier sphere for the culling.
  body.computeBoundingSphere();body.boundingSphere.radius*=1.3;
  // The still model goes out of sight but stays as the tap target; the animal is drawn in its place.
  obj.traverse(n=>{if(n.isMesh)n.visible=false;});
  obj.add(rig);relock(obj);
  const home=[obj.position.x,obj.position.z];
  // It faces as the layout turned it, or the other way along the screen; the cow only the way it was turned (seen from its other
  // side, from up here, its turned head seems to stare at the sky).
  const faces=file==='cow_101'?[turn]:[turn,turn+Math.PI];
  const a={obj,rig,mixer,actions,kind,file,still,home,length,faces,yaw:turn,face:turn,state:null,timer:0,target:null,speed:kind.stride*length/actions.walk.getClip().duration*kind.pace,since:0};
  // A head start of its own: a state of its own and a point of its own in its clips. The old lying pig lies.
  enter(a,model==='pig_002'&&actions.lie?'lie':pick(resting(a),random),true);
  return a;
 }
 function play(a,name,fade){
  const next=a.actions[name],now=a.current;if(now===next)return;
  next.reset().play();if(now)now.crossFadeTo(next,fade,false);
  a.current=next;
 }
 // A new state (start: the first one without a fade and at a random point of its clip).
 function enter(a,state,start=false){
  if(state==='walk'&&!(a.target=walkTarget(a)))state=a.actions.eat?'eat':'idle';
  if(!a.actions[state])state='idle';
  const lying=state==='lie'||a.state==='lie';
  a.state=state;a.timer=state==='walk'?0:LASTS[state][0]+random()*(LASTS[state][1]-LASTS[state][0]);
  if(state!=='walk'){a.target=null;a.face=a.faces.reduce((b,f)=>Math.abs(turnOf(a.yaw,f))<Math.abs(turnOf(a.yaw,b))?f:b);}
  play(a,state,lying?LIE_FADE:FADE);
  if(start){a.current.time=random()*a.current.getClip().duration;a.mixer.update(0);}
 }
 // A few calm steps, mostly along the screen (seen from the side, as the farm's animals stand), round its own spot, and never onto
 // another animal (where it stands or where it is going).
 function walkTarget(a){
  if(a.still)return null;
  const {roam}=a.kind,[hx,hz]=a.home,at=[a.obj.position.x,a.obj.position.z];
  for(let tries=0;tries<6;tries++){
   const u=(random()*2-1)*roam,v=(random()*2-1)*roam*.33,x=hx+u*ACROSS[0]+v*DEPTH[0],z=hz+u*ACROSS[1]+v*DEPTH[1];
   if(Math.hypot(x-at[0],z-at[1])<.35)continue;
   const clear=herd.every(b=>b===a||[[b.obj.position.x,b.obj.position.z],b.target].every(p=>!p||Math.hypot(p[0]-x,p[1]-z)>=(a.length+b.length)*.45));
   if(clear)return [x,z];
  }
  return null;
 }
 function step(a,dt){
  const at=a.obj.position;
  if(a.state==='walk'){
   const dx=a.target[0]-at.x,dz=a.target[1]-at.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz);
   if(d<.04)enter(a,a.actions.eat&&random()<.6?'eat':'idle');
   else{
    a.yaw=turnTowards(a.yaw,want,TURN*dt);
    // It turns first, then walks: no sliding sideways.
    if(Math.abs(turnOf(a.yaw,want))<.4){const s=Math.min(d,a.speed*dt);at.x+=dx/d*s;at.z+=dz/d*s;}
   }
   if(a.state==='walk'&&(a.since+=dt)>30)enter(a,'idle');   // never walks for ever (the target was taken)
  }else{
   a.since=0;a.yaw=turnTowards(a.yaw,a.face,TURN*.5*dt);
   if((a.timer-=dt)<=0)enter(a,a.state==='lie'?'idle':pick(a.still?resting(a):a.kind.odds,random));
  }
  a.obj.rotation.y=a.yaw;
 }
 // Seen: shown with all its parents (a yard still to come is greyed, not hidden; the Ranch's are hidden before it is near).
 const shown=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 // One frame: dt in seconds. Only the animals in the picture move; a phone moves each at every other frame (with that frame's time too).
 function animate(dt,camera){
  if(!herd.length)return;
  frame++;seenBy=camera;matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  for(let i=0;i<herd.length;i++){
   const a=herd[i];a.wait=(a.wait??0)+dt;
   if(lite&&(i+frame)%2)continue;
   const t=Math.min(a.wait,.2);a.wait=0;
   if(a.obj.userData.locked||!shown(a.obj))continue;
   sphere.center.copy(a.obj.position);sphere.radius=a.length;
   if(!frustum.intersectsSphere(sphere))continue;
   step(a,t);a.mixer.update(t);
  }
 }
 // The kinds come one after another, each as soon as it is in.
 const ready=(async()=>{
  for(const file of ANIMAL_FILES){
   const entries=todo.get(file);if(!entries||stopped)continue;
   let gltf;try{gltf=await loadFile(file);}catch(error){console.warn('An animal could not load; its still model stays.',file,error);continue;}
   if(stopped)return;
   for(const entry of entries){if(!entry.obj.parent)continue;const a=adopt(file,gltf,entry);if(a)herd.push(a);}
   onKind(file);
  }
 })();
 // Where each one stands on the screen, -1 to 1 across and up the farm's view (as the camera saw it last), and what it is doing.
 const where=()=>seenBy?herd.map(a=>{const p=a.obj.position.clone();p.y+=a.length*.25;p.project(seenBy);return {model:a.obj.userData.model??a.obj.userData.scenery,state:a.state,x:p.x,y:p.y,world:[a.obj.position.x,a.obj.position.z],home:a.home};}):[];
 const result={herd,animate,ready,where,camera:()=>seenBy,stop:()=>{stopped=true;}};ANIMAL_HERDS.add(result);return result;
}
