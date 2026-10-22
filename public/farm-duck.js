import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {sharePalette,shareAtlas,download} from './model-atlas.js';

// The duck on the farm's pond (22 Oct 2026, the owner, with a picture of the Fishing pond: "zet de eend hier bij, doet verder niks"):
// one duck that paddles calmly round the water in gentle curves and now and then floats still a while. Only to look at: no tap, no
// reward, nothing saved or counted, and it never takes a tap from the pond, its pin, the boats or the pier (nothing of it can be hit by
// the game's pointer). farm-life.js asks for it once the farm is on screen and the page has a quiet moment (not with reduced motion,
// simple graphics, Save-Data or a 2g line) and moves it in its own frame, so it rests while the tab is hidden; on the farm only.
// The model is the duck of ithappy Studios' Animals pack (the owner's paid licence), rebuilt small for the game by
// scripts/build-farm-animals.mjs (KIND=duck_101): only its swim and its float (swim_idle), painted from the farm's palette.png.
export const DUCK_MODEL='duck_101';
// How it swims, in world units. length: beak to tail, a duck next to the rowboat (2.6 long). swim: units a second. turn: radians a
// second at full speed, never more (it turns only while it paddles, as fast as it paddles, so it never spins on the spot). bank: the
// least room between its middle and the bank; clear: round the boats and the pier (the fishing line takes its own). A duck mostly
// floats (22 Oct 2026, the owner: "een eend drijft meestal op het water"): float is how often it stops when it reaches a spot, rest
// how long it then floats (seconds), drift how fast it still drifts on meanwhile (straight on, no turning); reach is how far a calm
// stretch of paddling goes. About three quarters of the time it floats. slow: a careful paddle (this share of its speed, the same
// turn a second, so a tighter curve) when no spot can be reached on its wide curve.
export const DUCK=Object.freeze({length:.68,swim:.3,turn:.75,bank:.95,clear:.55,float:.9,rest:Object.freeze([14,34]),drift:.015,reach:Object.freeze([1.2,3.2]),slow:.4,water:.027});
const FADE=.8,ARRIVE=.45,AHEAD=1.6;
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;

// The swim itself, without three.js (tests/farm-duck.test.mjs runs it): water = {x, z, rx, rz} (the pond's oval in the world),
// boxes = [{minX, maxX, minZ, maxZ}] (the boats and the pier as they stand), lines = [{a:[x, z], b:[x, z], r}] (the fishing line).
export function createSwim({water,boxes=[],lines=[],random=Math.random,spec=DUCK}){
 // Free: in the water with `bank` to spare, clear of the boats and the pier by `clear` and of a line by its r, and `extra` more.
 const inWater=(x,z,bank)=>{const dx=(x-water.x)/Math.max(.1,water.rx-bank),dz=(z-water.z)/Math.max(.1,water.rz-bank);return dx*dx+dz*dz<1;};
 const nearLine=(x,z,{a,b},r)=>{const ux=b[0]-a[0],uz=b[1]-a[1],k=Math.max(0,Math.min(1,((x-a[0])*ux+(z-a[1])*uz)/(ux*ux+uz*uz||1)));return Math.hypot(x-a[0]-ux*k,z-a[1]-uz*k)<r;};
 const free=(x,z,extra=0)=>inWater(x,z,spec.bank+extra)&&!boxes.some(b=>x>b.minX-spec.clear-extra&&x<b.maxX+spec.clear+extra&&z>b.minZ-spec.clear-extra&&z<b.maxZ+spec.clear+extra)&&!lines.some(l=>nearLine(x,z,l,l.r+extra));
 // The way it will swim to a spot, step by step as step() steers (its turn per unit swum is the same at any speed): all of it free,
 // and open water ahead of it when it gets there (so it never paddles into a corner it cannot turn out of).
 const clearWay=(s,x,z,extra,slow)=>{
  let px=s.x,pz=s.z,yaw=s.yaw;const most=spec.turn/(spec.swim*(slow?spec.slow:1))*.05;
  for(let i=0;i<400;i++){
   if(Math.hypot(x-px,z-pz)<ARRIVE){for(let d=.2;d<=AHEAD;d+=.2)if(!free(px+Math.sin(yaw)*d,pz+Math.cos(yaw)*d,extra))return false;return true;}
   const turn=turnOf(yaw,Math.atan2(x-px,z-pz));yaw+=Math.abs(turn)<=most?turn:Math.sign(turn)*most;
   px+=Math.sin(yaw)*.05;pz+=Math.cos(yaw)*.05;if(!free(px,pz,extra))return false;
  }
  return false;
 };
 // The next spot: open water it can reach on its curve, not too close, and (when it can) roughly ahead, so the curve stays wide; where
 // none can be reached that way, it paddles off carefully (slow); and where not even that, it floats a while and looks again.
 function pick(s){
  for(const [ahead,extra,slow] of [[1.4,.9],[2.2,.9],[Math.PI,.9],[Math.PI,.6],[Math.PI,.3],[Math.PI,.3,true],[Math.PI,.1,true],[Math.PI,0,true]])for(let i=0;i<60;i++){
   const [near,far]=slow?[.9,4]:spec.reach,a=s.yaw+(random()*2-1)*ahead,d=near+random()*(far-near),x=s.x+Math.sin(a)*d,z=s.z+Math.cos(a)*d;
   if(free(x,z,extra)&&clearWay(s,x,z,Math.min(.4,extra*.5),slow)){s.target=[x,z];s.slow=Boolean(slow);if(slow)s.careful++;return true;}
  }
  s.swimming=false;s.rest=spec.rest[0];s.stuck++;return false;
 }
 // Its first spot: somewhere free in the open water, facing the middle.
 const s={x:water.x,z:water.z,yaw:0,speed:0,swimming:true,slow:false,rest:0,target:null,blocked:0,careful:0,stuck:0};
 for(let i=0;i<200;i++){const x=water.x+(random()*2-1)*water.rx*.6,z=water.z+(random()*2-1)*water.rz*.6;if(free(x,z,.6)){s.x=x;s.z=z;break;}}
 s.yaw=Math.atan2(water.x-s.x,water.z-s.z)+(random()-.5);pick(s);
 // One step: dt in seconds.
 function step(dt){
  if(s.swimming){
   const [tx,tz]=s.target;
   if(Math.hypot(tx-s.x,tz-s.z)<ARRIVE){
    if(random()<spec.float){s.swimming=false;s.rest=spec.rest[0]+random()*(spec.rest[1]-spec.rest[0]);}
    else pick(s);
   }
  }else if((s.rest-=dt)<=0){s.swimming=true;pick(s);}
  const pace=spec.swim*(s.slow?spec.slow:1);
  s.speed+=((s.swimming?pace:spec.drift)-s.speed)*Math.min(1,dt*(s.swimming?.9:1.2));
  // It turns only as fast as it paddles: a floating duck keeps its heading. While it floats it slows to a gentle drift straight on (the
  // open water ahead of every spot leaves room for it), and picks its next spot when it paddles off again.
  if(s.swimming){
   const [tx,tz]=s.target,want=Math.atan2(tx-s.x,tz-s.z),most=spec.turn*dt*Math.min(1,s.speed/pace),turn=turnOf(s.yaw,want);
   s.yaw+=Math.abs(turn)<=most?turn:Math.sign(turn)*most;
  }
  const nx=s.x+Math.sin(s.yaw)*s.speed*dt,nz=s.z+Math.cos(s.yaw)*s.speed*dt;
  // Never into the bank, a boat or the pier (the planned curve keeps it well off; this is only a guard): it stops short and looks again.
  if(free(nx,nz,-.25)){s.x=nx;s.z=nz;}else{s.speed=0;s.blocked++;pick(s);}
  return s;
 }
 return {state:s,step,free};
}

let loader=null;
async function loadDuck(){
 loader??=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const url=`/assets/models/${DUCK_MODEL}.glb`,open=address=>download(address).then(data=>loader.parseAsync(data,'/assets/models/'));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
// Not something to tap: the game's pointer (game.js pointerTarget, pond-ui.js) never hits the duck, it hits what lies under it.
const unpickable=object=>object.traverse(o=>{o.raycast=()=>{};});
// The duck on the pond. water/boxes/lines as createSwim takes them (farm-life.js measures them in the world as the farm stands).
export async function createDuck({scene,water,boxes,lines}){
 const gltf=await loadDuck(),model=gltf.scene;
 model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=1;o.material.metalness=0;}});
 shareAtlas(model,DUCK_MODEL);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),k=DUCK.length/Math.max(size.x,size.z);
 // Its belly at the water: the model's feet hang under it while it swims (the pack's swim keeps the body where it stands).
 model.scale.setScalar(k);model.position.set(-(box.min.x+box.max.x)/2*k,-box.min.y*k,-(box.min.z+box.max.z)/2*k);
 const root=new THREE.Group();root.name='pond-duck';root.add(model);
 unpickable(root);
 const mixer=new THREE.AnimationMixer(model),clip=name=>gltf.animations.find(a=>a.name===name);
 const swim=mixer.clipAction(clip('swim')),still=mixer.clipAction(clip('swim_idle'));
 const swimmer=createSwim({water,boxes,lines}),s=swimmer.state;
 let swimming=true;swim.play();mixer.update(Math.random()*2);
 root.position.set(s.x,DUCK.water,s.z);root.rotation.y=s.yaw;scene.add(root);
 // One step: dt in seconds (game.js caps it at a tenth). Never called while the tab is hidden or motion is reduced.
 function animate(dt){
  swimmer.step(dt);
  const paddling=s.speed>DUCK.swim*.25;
  if(paddling!==swimming){swimming=paddling;const [from,to]=paddling?[still,swim]:[swim,still];to.reset().play();from.crossFadeTo(to,FADE,false);}
  swim.timeScale=.6+.4*Math.min(1,s.speed/DUCK.swim);
  root.position.set(s.x,DUCK.water+Math.sin(performance.now()/700)*.006,s.z);root.rotation.y=s.yaw;mixer.update(dt);
 }
 return {root,animate,swimmer};
}
