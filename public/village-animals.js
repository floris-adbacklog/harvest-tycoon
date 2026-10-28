import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {sharePalette,shareAtlas,download} from './model-atlas.js';
import {softShadow} from './soft-shadow.js';

// The village's animals (27 Oct 2026, the owner's d, e and f for World II): a few pigeons on the market square, two roe deer and a fox
// at the forest edge north of the Lumber Camp, and a ginger cat with three kittens on the lane by the Miners' Canteen. Only to look at:
// no tap, no window, no text, nothing saved or counted, and the game's pointer never hits them (it hits what lies under them). The
// pigeons flutter up for a moment when the square is tapped or the camera comes close to them.
// The models are ithappy Studios' Animals pack (the owner's paid licence), rebuilt small by scripts/build-village-animals.mjs (one file a
// kind, about 100 KB each, the colours of a kind as meshes on one skeleton, painted from the farm's palette.png like the village's deer).
// game.js asks for this file once the village's extras are on screen; it waits for a quiet moment, and stays away with reduced motion,
// simple graphics, Save-Data or a 2g line. The cats come with the Canteen: they hang on its props (VILLAGE_EXTRAS.canteen), which game.js
// shows once it is built. The pigeons and the forest's animals are always there (the village itself opens at level 100).
export const VILLAGE_ANIMAL_FILES=Object.freeze(['pigeon_101','roedeer_101','fox_101','housecat_101','kitten_101']);
// How each kind moves, in the village's units (its houses stand 1.8 tall) and seconds. length: nose to tail. walk (trot): units a
// second; turn: radians per unit walked, so it only turns while it walks, in a curve of radius 1/turn (never a spin on the spot); reach:
// how far one walk goes; ahead: how far off its heading the next spot may lie (radians) before it looks all round; rest: seconds it
// stands between walks, doing one of `odds` (clips); apart: the room it keeps from the others of its group; stride: a walk cycle's
// ground in body lengths (the walk plays at the speed that keeps the feet from sliding).
export const VILLAGE_ANIMAL_KINDS=Object.freeze({
 pigeon:Object.freeze({file:'pigeon_101',walk:.11,turn:6,reach:Object.freeze([.25,.8]),ahead:1.4,rest:Object.freeze([2,7]),odds:Object.freeze({idle:1}),apart:.28,stride:.4}),
 roe:Object.freeze({file:'roedeer_101',walk:.18,turn:2.8,reach:Object.freeze([.6,1.8]),ahead:1.2,rest:Object.freeze([7,16]),odds:Object.freeze({idle:.45,gesture:.55}),apart:.6,stride:.4}),
 fox:Object.freeze({file:'fox_101',walk:.22,trot:.55,turn:2.8,reach:Object.freeze([.8,2.6]),ahead:1.2,rest:Object.freeze([5,12]),odds:Object.freeze({idle:1}),apart:.6,stride:.4,stretch:1}),
 cat:Object.freeze({file:'housecat_101',walk:.13,turn:4,reach:Object.freeze([.3,.8]),ahead:1.4,rest:Object.freeze([14,32]),odds:Object.freeze({sit:.75,idle:.25}),apart:.32,stride:.4}),
 kitten:Object.freeze({file:'kitten_101',walk:.11,turn:5,reach:Object.freeze([.25,.7]),ahead:1.4,rest:Object.freeze([2,6]),odds:Object.freeze({idle:.45,gesture:.55}),apart:.22,stride:.4})
});
// The three groups. place: the place they belong to (VILLAGE_PLACES / VILLAGE_UTILITIES, its pin and its house stay clear); ground: the
// open ground they keep to, [minX, maxX, minZ, maxZ] each (measured from above in the harness, 27 Oct 2026: no tree, house, stall,
// prop, rock or water inside, nothing between it and the camera, and at least 0.2 from any for the pigeons, 0.2 for the others (the forest's meadow) or 0.4 (the cats'); each a rectangle, so a walk from one spot of
// it to another never leaves it); surface: what they stand on (the square's paving is a rock of the pack, the rest the hills and the
// lanes); animals: [kind, the mesh of its file, length].
export const VILLAGE_ANIMALS=Object.freeze({
 // The square's open paving north of the stalls, in front of the houses on its north side: seen on a phone and a computer, clear of the
 // Market's pin (west) and the Jeweller's (east).
 pigeons:Object.freeze({place:'villagemarket',surface:/^(rock_014|hill_|Road_)/,ground:Object.freeze([Object.freeze([39,41.6,-9.8,-8.6]),Object.freeze([40.4,41.6,-8.6,-8])]),
  animals:Object.freeze([['pigeon','pigeon_grey',.3],['pigeon','pigeon_dark',.3],['pigeon','pigeon_pale',.3],['pigeon','pigeon_grey',.28]])}),
 // The meadow north of the Lumber Camp, between the camp, the lake's rocks and the woods to the east: behind the camp from the camera,
 // so they never stand in front of it, and where no tree crown stands between them and the camera (the meadow further north, down to
 // the lake's cliff, is hidden behind the woods' crowns).
 forest:Object.freeze({place:'lumbercamp',surface:/^(hill_|landscape_|Road_)/,ground:Object.freeze([Object.freeze([9,11,15.3,16.9]),Object.freeze([8,10.2,14.7,15.4])]),
  animals:Object.freeze([['roe','roe_buck',.84],['roe','roe_doe',.78],['fox','fox_red',.74]])}),
 // The lane at the Canteen's fence corner, by its tables and barrels (north of it, seen beside its roof).
 cats:Object.freeze({place:'canteen',surface:/^(hill_|landscape_|Road_)/,ground:Object.freeze([Object.freeze([26.3,27.7,-12.4,-11.8]),Object.freeze([26.9,27.7,-11.8,-11.2])]),
  animals:Object.freeze([['cat','cat_ginger',.58],['kitten','kitten_ginger',.32],['kitten','kitten_white',.32],['kitten','kitten_grey',.32]])})
});
// The pigeons' flutter: how high (units over the ground), how long (seconds), how far it lands from where it rose, and how close the
// camera must come (a unit on the screen as this share of its height) before they rise by themselves, at most once in `again` seconds.
export const FLUTTER=Object.freeze({height:Object.freeze([.55,.9]),time:Object.freeze([1.2,1.7]),reach:Object.freeze([.5,1.8]),close:.07,again:30,tap:2.6});
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const EDGE=.04,CAREFUL=2.5,inside=(rects,x,z)=>rects.some(([a,b,c,d])=>x>=a&&x<=b&&z>=c&&z<=d);
const between=([a,b],random)=>a+random()*(b-a);

// How one animal wanders, without three.js (tests/village-animals.test.mjs runs it). rects: its group's ground; others(): where the
// rest of its group stands and is heading, [[x, z], ...]. It turns only while it walks, never more than spec.turn per unit walked.
export function createWander({rects,spec,random=Math.random,others=()=>[],start=null}){
 const free=(x,z)=>inside(rects,x,z);
 // The planned way keeps a little inside the ground (EDGE), so the real walk, which steers in steps of its own, never reaches past it.
 const well=(x,z)=>inside(rects.map(([a,b,c,d])=>[a+EDGE,b-EDGE,c+EDGE,d-EDGE]),x,z)||(free(x,z)&&rects.filter(r=>inside([r],x,z)).length>1);
 const near=(x,z,room,list=others())=>list.some(([ox,oz])=>Math.hypot(ox-x,oz-z)<room);
 const somewhere=()=>{for(let i=0;i<300;i++){const r=rects[Math.floor(random()*rects.length)],x=between([r[0],r[1]],random),z=between([r[2],r[3]],random);if(well(x,z)&&!near(x,z,spec.apart))return [x,z];}const r=rects[0];return [(r[0]+r[1])/2,(r[2]+r[3])/2];};
 const [x0,z0]=start??somewhere();
 const s={x:x0,z:z0,yaw:random()*2*Math.PI,speed:0,pace:spec.walk,moving:false,trot:false,rest:between(spec.rest,random)*random(),target:null,rests:0,blocked:0,stuck:0,careful:0,turn:spec.turn,flight:null};
 // The way to a spot as step() steers it (turn: radians per unit walked): every point of it on the group's ground and clear of the others,
 // and, where room>0, open ground that far straight on past the spot (so it never walks into a corner it cannot curve out of).
 const clearWay=(x,z,turn,room)=>{
  // One that already stands too close (two that walked up to each other) is let go: it may walk away from it.
  let px=s.x,pz=s.z,yaw=s.yaw;const d=.03,most=turn*d,round=others().filter(([ox,oz])=>Math.hypot(ox-s.x,oz-s.z)>=spec.apart*.6);
  for(let i=0;i<500;i++){
   if(Math.hypot(x-px,z-pz)<.06){for(let k=.1;k<=room;k+=.1)if(!well(px+Math.sin(yaw)*k,pz+Math.cos(yaw)*k))return false;return true;}
   const t=turnOf(yaw,Math.atan2(x-px,z-pz));yaw+=Math.abs(t)<=most?t:Math.sign(t)*most;
   px+=Math.sin(yaw)*d;pz+=Math.cos(yaw)*d;if(!well(px,pz)||near(px,pz,spec.apart*.6,round))return false;
  }
  return false;
 };
 // The next spot: roughly ahead first (a calm curve), else anywhere it can reach on its curve; where neither can be reached (at the
 // end of its ground), a careful few steps (CAREFUL: a tighter curve at a slower pace, still walking); else it stands a while longer.
 function pick(){
  const wide=1/spec.turn;
  for(const [ahead,turn,room,careful] of [[spec.ahead,spec.turn,wide],[Math.PI,spec.turn,wide],[Math.PI,spec.turn*CAREFUL,wide/CAREFUL,true],[Math.PI,spec.turn*CAREFUL,0,true]])for(let i=0;i<30;i++){
   const a=s.yaw+(random()*2-1)*ahead,d=careful?between([spec.reach[0],spec.reach[0]*2],random):between(spec.reach,random),x=s.x+Math.sin(a)*d,z=s.z+Math.cos(a)*d;
   if(well(x,z)&&!near(x,z,spec.apart)&&clearWay(x,z,turn,room)){
    s.target=[x,z];s.moving=true;s.turn=turn;s.left=d*3/(careful?spec.walk*.7:spec.walk)+3;s.trot=!careful&&Boolean(spec.trot)&&d>1.4&&random()<.45;s.pace=s.trot?spec.trot:careful?spec.walk*.7:spec.walk;if(careful)s.careful++;return true;
   }
  }
  s.stuck++;s.rest=1.5+random()*2;return false;
 }
 const stop=()=>{s.moving=false;s.target=null;s.trot=false;s.rest=between(spec.rest,random);s.rests++;};
 // A flight (the pigeons): up from where it stands to a free spot not far off, over its own ground, turning in the air.
 function fly(){
  if(s.flight)return false;
  for(let i=0;i<60;i++){
   const a=random()*2*Math.PI,d=between(FLUTTER.reach,random),x=s.x+Math.sin(a)*d,z=s.z+Math.cos(a)*d;
   const over=k=>free(s.x+(x-s.x)*k,s.z+(z-s.z)*k);
   if(free(x,z)&&!near(x,z,spec.apart)&&Array.from({length:24},(_,i)=>(i+1)/25).every(over)){s.flight={from:[s.x,s.z],to:[x,z],t:0,time:between(FLUTTER.time,random),height:between(FLUTTER.height,random)};s.moving=false;s.target=null;s.speed=0;return true;}
  }
  return false;
 }
 function step(dt){
  if(s.flight){
   const f=s.flight;f.t=Math.min(1,f.t+dt/f.time);const k=f.t*f.t*(3-2*f.t);
   s.x=f.from[0]+(f.to[0]-f.from[0])*k;s.z=f.from[1]+(f.to[1]-f.from[1])*k;
   const want=Math.atan2(f.to[0]-f.from[0],f.to[1]-f.from[1]),t=turnOf(s.yaw,want);s.yaw+=Math.abs(t)<=8*dt?t:Math.sign(t)*8*dt;
   s.lift=Math.sin(Math.PI*f.t)*f.height;if(f.t>=1){s.flight=null;s.lift=0;stop();}
   return s;
  }
  s.lift=0;
  if(!s.moving){s.speed=Math.max(0,s.speed-dt*s.pace*3);if((s.rest-=dt)<=0)pick();}
  else{
   const [tx,tz]=s.target,d=Math.hypot(tx-s.x,tz-s.z);
   // There (or as near as its curve brings it: a walk never goes on longer than three times its way at its pace).
   if(d<.1||(s.left-=dt)<=0){stop();return s;}
   s.speed=Math.min(s.pace,s.speed+dt*s.pace*2.5);
   const want=Math.atan2(tx-s.x,tz-s.z),most=s.turn*s.speed*dt,t=turnOf(s.yaw,want);s.yaw+=Math.abs(t)<=most?t:Math.sign(t)*most;
   const nx=s.x+Math.sin(s.yaw)*s.speed*dt,nz=s.z+Math.cos(s.yaw)*s.speed*dt;
   // Never off its ground (the curve keeps it well on; this is only a guard): it stops short and stands a while.
   if(free(nx,nz)){s.x=nx;s.z=nz;}else{s.blocked++;stop();}
  }
  return s;
 }
 return {state:s,step,fly,free};
}

let loader=null;
async function loadFile(name){
 loader??=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const url=`/assets/models/${name}.glb`,open=address=>download(address).then(data=>loader.parseAsync(data,'/assets/models/'));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
// A copy of a skinned model with bones of its own, and only one of its colours (as farm-animals.js does).
function cloneRig(source,variant){
 const copy=source.clone(true),bones=new Map(),skins=[];
 copy.traverse(n=>{if(n.isBone)bones.set(n.name,n);});
 source.traverse(n=>{if(n.isSkinnedMesh)skins.push(n.skeleton);});
 let i=0;copy.traverse(n=>{if(!n.isSkinnedMesh)return;const s=skins[i++];n.bind(new THREE.Skeleton(s.bones.map(b=>bones.get(b.name)),s.boneInverses),n.bindMatrix);});
 const others=[];copy.traverse(n=>{if(n.isSkinnedMesh&&n.name!==variant)others.push(n);});for(const n of others)n.removeFromParent();
 return copy;
}
// The height of what they stand on, every fifth of a unit over their ground: rays straight down onto the village's surface meshes there
// (the highest one), read once; between the points it is blended.
const GRID=.2;
function surfaceOf(village,rects,surface){
 const x0=Math.min(...rects.map(r=>r[0]))-.4,x1=Math.max(...rects.map(r=>r[1]))+.4,z0=Math.min(...rects.map(r=>r[2]))-.4,z1=Math.max(...rects.map(r=>r[3]))+.4;
 const cols=Math.ceil((x1-x0)/GRID)+1,rows=Math.ceil((z1-z0)/GRID)+1,h=new Float32Array(cols*rows).fill(NaN);
 const area=new THREE.Box3(new THREE.Vector3(x0,-1e3,z0),new THREE.Vector3(x1,1e3,z1)),box=new THREE.Box3(),m=new THREE.Matrix4(),parts=[];
 village.updateMatrixWorld(true);
 village.traverse(o=>{
  if(!o.isMesh||!surface.test(o.name))return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  if(!o.isInstancedMesh){if(box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).intersectsBox(area))parts.push([o.geometry,o.matrixWorld.clone()]);return;}
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);const w=new THREE.Matrix4().multiplyMatrices(o.matrixWorld,m);if(box.copy(o.geometry.boundingBox).applyMatrix4(w).intersectsBox(area))parts.push([o.geometry,w]);}
 });
 const probe=new THREE.Mesh(undefined,new THREE.MeshBasicMaterial({side:THREE.DoubleSide})),ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),hits=[];
 probe.matrixAutoUpdate=false;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  ray.set(new THREE.Vector3(x0+i*GRID,200,z0+j*GRID),down);let top=NaN;
  for(const [geometry,matrix] of parts){probe.geometry=geometry;probe.matrixWorld.copy(matrix);hits.length=0;probe.raycast(ray,hits);for(const hit of hits)if(!(hit.point.y<=top))top=hit.point.y;}
  h[j*cols+i]=top;
 }
 const known=h.filter(Number.isFinite),middle=known.length?known.reduce((a,b)=>a+b,0)/known.length:0;for(let k=0;k<h.length;k++)if(!Number.isFinite(h[k]))h[k]=middle;
 return (x,z)=>{
  const fx=Math.min(cols-1.001,Math.max(0,(x-x0)/GRID)),fz=Math.min(rows-1.001,Math.max(0,(z-z0)/GRID)),i=Math.floor(fx),j=Math.floor(fz),u=fx-i,v=fz-j,y=(a,b)=>h[b*cols+a];
  return (y(i,j)*(1-u)+y(i+1,j)*u)*(1-v)+(y(i,j+1)*(1-u)+y(i+1,j+1)*u)*v;
 };
}
// Not something to tap: the game's pointer never hits them, it hits what lies under them (as the farm's duck).
const unpickable=object=>object.traverse(o=>{o.raycast=()=>{};});
const choose=(odds,random)=>{let r=random()*Object.values(odds).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(odds)){r-=w;if(r<=0)return k;}return Object.keys(odds)[0];};
const FADE=.5;

// One group: its animals in a group of their own (parent: the scene, or the Canteen's props for the cats), moved at every frame the game
// draws them (so they rest while the tab is hidden, and are not moved while their group is hidden).
async function createGroup(name,{village,parent,files,random=Math.random}){
 const spec=VILLAGE_ANIMALS[name],ground=surfaceOf(village,spec.ground,spec.surface),group=new THREE.Group();group.name=`village-${name}`;
 const animals=[];
 for(const [kindName,variant,length] of spec.animals){
  const kind=VILLAGE_ANIMAL_KINDS[kindName],gltf=files.get(kind.file);if(!gltf)continue;
  const model=cloneRig(gltf.scene,variant);
  model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=1;o.material.metalness=0;}});
  shareAtlas(model,kind.file);
  const mixer=new THREE.AnimationMixer(model),actions={};for(const clip of gltf.animations)actions[clip.name]=mixer.clipAction(clip);
  actions.idle.play();mixer.update(0);model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),k=length/Math.max(size.x,size.z);
  model.scale.setScalar(k);model.position.set(-(box.min.x+box.max.x)/2*k,-box.min.y*k,-(box.min.z+box.max.z)/2*k);
  const root=new THREE.Group();root.add(model);const shade=softShadow(size.x*k*1.6,size.z*k*1.1,.6);root.add(shade);group.add(root);
  const wander=createWander({rects:spec.ground,spec:kind,random,others:()=>animals.filter(a=>a.root!==root).flatMap(a=>{const s=a.wander.state;return [[s.x,s.z],...(s.target?[s.target]:[]),...(s.flight?[s.flight.to]:[])];})});
  mixer.update(random()*4);
  animals.push({kind,root,model,shade,mixer,actions,wander,length,clip:'idle',rests:-1});
 }
 unpickable(group);parent.add(group);
 function play(a,clip){
  if(a.clip===clip||!a.actions[clip])return;const from=a.actions[a.clip],to=a.actions[clip];
  to.reset().play();from.crossFadeTo(to,FADE,false);a.clip=clip;
 }
 function animate(dt){
  for(const a of animals){
   const s=a.wander.step(dt);
   if(s.flight)play(a,'fly');
   else if(s.moving||s.speed>.02){play(a,s.trot?'run':'walk');const clip=a.actions[a.clip];clip.timeScale=Math.max(.3,s.speed*clip.getClip().duration/((s.trot?a.kind.stretch??1:a.kind.stride)*a.length));}
   else if(a.rests!==s.rests||a.clip==='walk'||a.clip==='run'||a.clip==='fly'){a.rests=s.rests;play(a,choose(a.kind.odds,random));}
   const y=ground(s.x,s.z);a.root.position.set(s.x,y+(s.lift??0),s.z);a.root.rotation.y=s.yaw;
   // The shadow stays on the ground under a flying bird, smaller and fainter the higher it is.
   a.shade.position.y=.03-(s.lift??0);a.shade.material.opacity=.6/(1+(s.lift??0)*2);
   a.mixer.update(dt);
  }
 }
 // A flutter (the pigeons): those near `at` (or all of them) rise, one after the other within a quarter of a second.
 function flutter(at=null){
  let n=0;for(const a of animals){if(!a.actions.fly)continue;const s=a.wander.state;if(at&&Math.hypot(s.x-at.x,s.z-at.z)>FLUTTER.tap)continue;if(random()<.85)setTimeout(()=>{if(a.wander.fly())n++;},random()*250);}
  return n;
 }
 const middle=()=>{const r=spec.ground[0];return new THREE.Vector3((r[0]+r[1])/2,ground((r[0]+r[1])/2,(r[2]+r[3])/2),(r[2]+r[3])/2);};
 return {name,group,animals,animate,flutter,middle,ground};
}

// What game.js calls once the village's extras are on screen (addVillageExtras): scene, village (village-scene.js loadVillage's group),
// extras (loadVillageExtras's: the Canteen's props are its places' 'canteen'), canvas (the farm's, for the taps on the square), simple
// (simple graphics). Returns the groups, or null when they stay away.
export async function addVillageAnimals({scene,village,extras,canvas,simple=false,random=Math.random}){
 const connection=navigator.connection;
 if(simple||matchMedia('(prefers-reduced-motion: reduce)').matches||connection?.saveData||/2g/.test(connection?.effectiveType??''))return null;
 await new Promise(done=>'requestIdleCallback' in window?requestIdleCallback(done,{timeout:6000}):setTimeout(done,2500));
 const files=new Map();
 await Promise.all(VILLAGE_ANIMAL_FILES.map(async file=>{try{files.set(file,await loadFile(file));}catch(error){console.warn('A village animal could not load.',file,error);}}));
 const canteen=extras?.places?.get('canteen');
 const groups=[];
 for(const [name,parent] of [['pigeons',scene],['forest',scene],['cats',canteen]]){
  if(!parent)continue;
  try{groups.push(await createGroup(name,{village,parent,files,random}));}catch(error){console.warn('Village animals skipped.',name,error);}
 }
 const pigeons=groups.find(g=>g.name==='pigeons');
 let camera=null,last=performance.now(),closeBefore=true,lastFlutter=-1e9;
 // Moved from the frame the game draws (the first animal's body asks), at most once a frame, a tenth of a second at most at a time.
 for(const g of groups){
  const body=g.animals[0]?.model.getObjectByProperty('isSkinnedMesh',true);if(!body)continue;
  let at=performance.now();
  body.onBeforeRender=(renderer,s,cam)=>{
   const now=performance.now(),dt=Math.min(.1,(now-at)/1000);if(dt<.008)return;at=now;camera=cam;g.animate(dt);
   if(g===pigeons)closeLook(cam,now);
  };
 }
 // The camera come close: a unit at the flock as FLUTTER.close of the screen's height or more, the flock in the middle of the view.
 const a=new THREE.Vector3(),b=new THREE.Vector3();
 function closeLook(cam,now){
  const m=pigeons.middle();a.copy(m).project(cam);b.copy(m).add(new THREE.Vector3(1/Math.SQRT2,0,-1/Math.SQRT2)).project(cam);
  const close=Math.abs(b.x-a.x)/2>=FLUTTER.close*(canvas?.clientHeight||1)/(canvas?.clientWidth||1)&&Math.abs(a.x)<.7&&Math.abs(a.y)<.7;
  if(close&&!closeBefore&&now-lastFlutter>FLUTTER.again*1000){lastFlutter=now;pigeons.flutter();}
  closeBefore=close;
 }
 // A tap on the square (a press and a release in one spot, not a drag): the pigeons near it rise. The tap goes on to the game as ever.
 if(pigeons&&canvas){
  let down=null;const plane=new THREE.Plane(),ray=new THREE.Raycaster(),hit=new THREE.Vector3();
  canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,t:performance.now()};},{passive:true});
  canvas.addEventListener('pointerup',e=>{
   if(!down||!camera||Math.hypot(e.clientX-down.x,e.clientY-down.y)>10||performance.now()-down.t>600){down=null;return;}down=null;
   const r=canvas.getBoundingClientRect(),m=pigeons.middle();plane.set(new THREE.Vector3(0,1,0),-m.y);
   ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);
   if(ray.ray.intersectPlane(plane,hit)&&Math.hypot(hit.x-m.x,hit.z-m.z)<FLUTTER.tap+1.5){lastFlutter=performance.now();pigeons.flutter(hit);}
  },{passive:true});
 }
 VILLAGE_ANIMAL_GROUPS.push(...groups);
 return groups;
}
// For the screenshot harness: the groups on the page.
export const VILLAGE_ANIMAL_GROUPS=[];
