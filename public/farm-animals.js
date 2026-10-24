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
// How they walk (22 Oct 2026, the owner: "de geanimeerde dieren zoals de koeien draaien soms een beetje raar", and after two tries
// "het gebeurt nog steeds, geef dieren desnoods wat meer ruimte in hun veld"): a cow is two units long and could wander 0.75 from its
// spot, so about every other walk was a half turn on the spot (the walk clip playing while the body spun round) for a step shorter
// than half its body. Now each has room for its size: a few body lengths along the screen, inside its pen's fences (game.js gives
// each its pen and what stands in it), half a body clear of a fence or a barn. A walk goes on the way it faces, one to three body
// lengths; only at the end of its room does it turn round, walking a wide bend to the side with room, and then walks back a good way.
// It never turns while it stands, grazes or lies.
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
// Each kind: how far from its spot it may wander, in its own body lengths along the screen (roam) and up and down it (depth, a share
// of that; always inside its pen), its stride (a walk cycle's ground in body lengths, so the feet do not slide), how fast its walk plays, and how often it
// does what (it picks again after each). The clips it has: the build keeps idle, walk and eat (the goat's gesture instead), and lie
// for the cow and the pig. The chickens keep to their spots as before (0.8 along the screen, a third of that up and down): their
// pen has the coop's pin and the Windmill's tap box, which no chicken may stand under. The others have the run of their pens.
export const ANIMAL_KINDS=Object.freeze({
 chicken_101:{roam:1.15,depth:.33,bend:.12,stride:.42,pace:.8,odds:{eat:.5,idle:.32,walk:.18}},
 // The scenery's two chicks stay on their spots (scenery.js finds them a free one), cheeping about.
 chick_101:{roam:0,depth:0,stride:.4,pace:.8,odds:{idle:.6,gesture:.4}},
 cow_101:{roam:3,depth:1,stride:.36,pace:.7,odds:{eat:.45,idle:.31,walk:.14,lie:.1}},
 goat_101:{roam:3,depth:1,stride:.4,pace:.75,odds:{idle:.48,gesture:.34,walk:.18}},
 pig_101:{roam:3,depth:1,stride:.36,pace:.7,odds:{eat:.4,idle:.3,walk:.14,lie:.16}},
 sheep_101:{roam:3,depth:1,stride:.34,pace:.7,odds:{eat:.52,idle:.32,walk:.16}},
 horse_101:{roam:3,depth:1,stride:.4,pace:.7,odds:{eat:.48,idle:.38,walk:.14}}
});
// A walk: three fifths of a body length to two body lengths (WALK), within 17 degrees of its line along the screen (SWAY), keeping near the line
// through its own spot (where its pen is longest). A half turn: a bend of BEND body lengths' radius (a hen's is tighter: kind.bend),
// walked at its walking pace (its legs keep stepping as it goes round), never a spin on the spot; and only now and then (TURN_ROUND):
// mostly, at the end of its room, it stays and grazes a while longer.
const WALK=[.6,2],SWAY=.3,BEND=.25,TURN_ROUND=.3,APART=.5,BY=.3;
// How long a state lasts, in seconds (a walk lasts until it is there).
const LASTS={idle:[5,12],eat:[6,15],gesture:[5,9],lie:[16,34]};
const FADE=.6,LIE_FADE=1.4;
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
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

// The animals of the farm. list: [{obj, still, pen}] with obj a still animal on the farm (cloneModel's, or scenery.js's), still true
// for one that only stands (the Animal paddock's horse, whose pin and tap box stay where they are, and the white hen and the two chicks
// of the scenery), and pen its pen (game.js): {box:[minX, maxX, minZ, maxZ] round its fences, keepOut:[[minX, maxX, minZ, maxZ], ...]
// what stands in it}, or null.
// relock(obj): greys the new animal with its yard if the yard is still to come (game.js setLocked). lite: phones (their animals move
// at half the frame rate). onKind: after a kind took its place (the shadows are drawn again).
export function createHerd({list,relock=()=>{},lite=false,onKind=()=>{},random=Math.random}){
 const herd=[],frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();let frame=0,stopped=false,seenBy=null;
 const todo=new Map();
 for(const entry of list){const [file]=ANIMATED[entry.obj.userData.model??entry.obj.userData.scenery]??[];if(file)(todo.get(file)??todo.set(file,[]).get(file)).push(entry);}
 function adopt(file,gltf,{obj,still,pen=null}){
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
  // It walks along the screen, the way the layout turned it or the other way (axes).
  const a={obj,rig,mixer,actions,kind,file,still,home,length,pen,axes:[turn,turn+Math.PI],yaw:turn,state:null,timer:0,target:null,bend:0,speed:kind.stride*length/actions.walk.getClip().duration*kind.pace,since:0};
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
  if(state!=='walk'){a.target=null;a.bend=0;}
  play(a,state,lying?LIE_FADE:FADE);
  if(start){a.current.time=random()*a.current.getClip().duration;a.mixer.update(0);}
 }
 // How far a spot is from where it may stand (0: it may): inside its pen, half its body clear of the fences and of what stands in the
 // pen, and within its roam round its own spot.
 function outside(a,x,z){
  const m=a.length*.5,[hx,hz]=a.home,reach=a.kind.roam*a.length;
  const u=(x-hx)*ACROSS[0]+(z-hz)*ACROSS[1],v=(x-hx)*DEPTH[0]+(z-hz)*DEPTH[1];
  let out=Math.max(0,Math.abs(u)-reach,Math.abs(v)-reach*a.kind.depth);
  if(a.pen){
   const [x0,x1,z0,z1]=a.pen.box;out=Math.max(out,x0+m-x,x-x1+m,z0+m-z,z-z1+m);
   for(const [k0,k1,l0,l1] of a.pen.keepOut)out=Math.max(out,Math.min(x-k0+m,k1+m-x,z-l0+m,l1+m-z));
  }
  return out;
 }
 // Never onto another animal (where it stands or where it is going): it stops a body apart from them (apart), and passes them with
 // room for both (by).
 const clearOf=(a,x,z,room)=>herd.every(b=>b===a||[[b.obj.position.x,b.obj.position.z],b.target].every(p=>!p||Math.hypot(p[0]-x,p[1]-z)>=(a.length+b.length)*room));
 // A way it may walk: every point of it where it may stand (or, from a spot it may not, no further out), clear of the others.
 const fine=(a,points,from)=>points.every(([x,z])=>outside(a,x,z)<=from+1e-6&&clearOf(a,x,z,BY));
 const line=(p,q,n=8)=>Array.from({length:n},(_,i)=>[p[0]+(q[0]-p[0])*(i+1)/n,p[1]+(q[1]-p[1])*(i+1)/n]);
 // The bend of a half turn to one side (+1 or -1) from x, z facing yaw: the points it passes, and where it ends, facing the other way.
 function bendPath(a,side,x=a.obj.position.x,z=a.obj.position.z,yaw=a.yaw){
  const r=a.length*(a.kind.bend??BEND),points=[];
  for(let i=0;i<12;i++){yaw+=side*Math.PI/12;x+=Math.sin(yaw)*r*Math.PI/12;z+=Math.cos(yaw)*r*Math.PI/12;points.push([x,z]);}
  return {points,end:[x,z],yaw};
 }
 // Room to turn round there, to one side or the other (so it never walks into a corner it cannot leave).
 const turnable=(a,x,z,yaw)=>[1,-1].some(side=>bendPath(a,side,x,z,yaw).points.every(([px,pz])=>outside(a,px,pz)===0));
 // A walk on the way it faces, ending where it can turn round; at the end of its room a half turn first. null: it stays (grazes or
 // stands).
 function walkTarget(a){
  if(a.still)return null;
  const at=[a.obj.position.x,a.obj.position.z],from=outside(a,...at);
  const ahead=a.axes.reduce((b,f)=>Math.abs(turnOf(a.yaw,f))<Math.abs(turnOf(a.yaw,b))?f:b);
  // Of the walks that fit, the one nearest the line through its own spot (give or take a little).
  const along=(start,way,before=[])=>{
   let best=null,score=Infinity;
   for(let tries=0;tries<10;tries++){
    const angle=way+(random()*2-1)*SWAY,dist=a.length*(WALK[0]+random()*(WALK[1]-WALK[0])),x=start[0]+Math.sin(angle)*dist,z=start[1]+Math.cos(angle)*dist;
    if(!(outside(a,x,z)===0&&clearOf(a,x,z,APART)&&fine(a,[...before,...line(start,[x,z])],from)&&turnable(a,x,z,angle)))continue;
    const off=Math.abs((x-a.home[0])*DEPTH[0]+(z-a.home[1])*DEPTH[1])/a.length+random()*.3;if(off<score){best=[x,z];score=off;}
   }
   return best;
  };
  const straight=along(at,ahead);if(straight){a.bend=0;return straight;}
  if(random()>TURN_ROUND)return null;
  for(const side of random()<.5?[1,-1]:[-1,1]){
   const {points,end,yaw}=bendPath(a,side);if(!fine(a,points,from))continue;
   const back=along(end,yaw,points);if(back){a.bend=side;return back;}
  }
  return null;
 }
 function step(a,dt){
  const at=a.obj.position;
  if(a.state==='walk'){
   const dx=a.target[0]-at.x,dz=a.target[1]-at.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz),off=turnOf(a.yaw,want),s=a.speed*dt;
   // Always forward, the way it faces (no sliding sideways), steering at most as tight as its bend; a half turn is that bend, to
   // the side it was planned on, until it faces the way back.
   if(d<=Math.max(.05,s)||d<a.length*.3&&Math.abs(off)>Math.PI/2)enter(a,a.actions.eat&&random()<.6?'eat':'idle');
   else{
    const most=s/(a.length*(a.kind.bend??BEND));
    if(a.bend&&Math.abs(off)>.35)a.yaw+=a.bend*most;
    else{a.bend=0;a.yaw+=Math.sign(off)*Math.min(Math.abs(off),most);}
    at.x+=Math.sin(a.yaw)*s;at.z+=Math.cos(a.yaw)*s;
   }
   if(a.state==='walk'&&(a.since+=dt)>60)enter(a,'idle');   // never walks for ever
  }else{
   a.since=0;
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
 // Your own farm layout (24 Oct 2026, game.js): a yard that moved (its pieces, these animals' still models among them, moved already)
 // takes its animals' home, pen and walk along.
 const move=([x,z],dx,dz)=>[x+dx,z+dz];
 function shift(match,dx,dz){
  for(const a of herd){
   if(!match(a.obj))continue;
   a.home=move(a.home,dx,dz);if(Array.isArray(a.target))a.target=move(a.target,dx,dz);
   if(a.pen)a.pen={box:[a.pen.box[0]+dx,a.pen.box[1]+dx,a.pen.box[2]+dz,a.pen.box[3]+dz],keepOut:a.pen.keepOut.map(([x0,x1,z0,z1])=>[x0+dx,x1+dx,z0+dz,z1+dz])};
  }
 }
 // A yard turned a quarter (or more) round its anchor [px, pz] (angle about the up axis, as three.js turns): the same for its animals,
 // their walking line included.
 function turn(match,[px,pz],angle){
  const c=Math.cos(angle),sn=Math.sin(angle),at=([x,z])=>[px+(x-px)*c+(z-pz)*sn,pz-(x-px)*sn+(z-pz)*c];
  const box=([x0,x1,z0,z1])=>{const pts=[[x0,z0],[x1,z0],[x0,z1],[x1,z1]].map(at),xs=pts.map(p=>p[0]),zs=pts.map(p=>p[1]);return [Math.min(...xs),Math.max(...xs),Math.min(...zs),Math.max(...zs)];};
  for(const a of herd){
   if(!match(a.obj))continue;
   a.home=at(a.home);if(Array.isArray(a.target))a.target=at(a.target);a.axes=a.axes.map(t=>t+angle);a.yaw+=angle;
   if(a.pen)a.pen={box:box(a.pen.box),keepOut:a.pen.keepOut.map(box)};
  }
 }
 const result={herd,animate,ready,where,shift,turn,camera:()=>seenBy,stop:()=>{stopped=true;}};ANIMAL_HERDS.add(result);return result;
}
