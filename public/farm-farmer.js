import * as THREE from 'three';
import {createFarmer} from './farmer.js';
import {DEFAULT_FARMER} from './farmer-parts.js';

// Your own farmer, walking on your farm and in the village (20 Oct 2026, the owner: "Doe 2"; phase 1: everyone's farmer is the default
// one until the creator is saved somewhere). A few calm loops round the Farmhouse yard (in World II round the village's farm road),
// standing still between them to breathe, look around or rest; a tap makes them hop. Like the farm's animals (farm-animals.js) it comes
// after the farm is on screen and the page has a quiet moment (the skeleton and the default farmer's parts are about 160 KB), never
// with reduced motion, Save-Data or a 2g line (game.js addFarmer), and only moves while it is in the picture (a phone: every other frame).
// Nothing is saved, counted or earned; a tap on anything else is never taken (game.js asks the farmer last, after the pets).
// Where they walk, in world units. The farm: the open ground across the lane from the Farmhouse, between the dog's and the cat's walks
// and the tractor (tests/farm-farmer.test.mjs keeps every point clear of the yards, the fields, the pond, the pets' walks and the tappable
// things round the Farmhouse, and the harness checked on a phone and a computer that the farmer never stands in front of anything
// that can be tapped). One loop: the spots in order and back to the first.
export const FARM_WALK=Object.freeze({height:1.9,walk:1.05,spots:Object.freeze([[-15.3,-3.4],[-14.4,-2.7],[-13.6,-2],[-14.8,-1.6],[-16,-2.2]])});
// The village (its houses stand 1.8 tall, the deer .72 long): smaller, on the lane through the village and the grass above it, below
// the deer's slope, between a tree, the red house at the bend and the blue house's roof (nothing hides them there), in the middle of a
// computer's first view.
export const VILLAGE_WALK=Object.freeze({height:.95,walk:.5,spots:Object.freeze([[17,-7.6],[16.4,-9.2],[17.6,-9.4],[18.6,-8.2],[18,-8.3]])});
// How long they stand at a spot (seconds), and what they do there: breathe, look around or rest on one leg.
const REST=[4,10],STILL={idle:.45,look:.35,relaxed:.2};
const TURN=3,FADE=.4,HOP_TIME=.45,HOP_UP=.14;
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const turnTowards=(from,to,step)=>{const d=turnOf(from,to);return Math.abs(d)<=step?from+d:from+Math.sign(d)*step;};
const choose=(odds,random)=>{let r=random()*Object.values(odds).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(odds)){r-=w;if(r<=0)return k;}return 'idle';};
// The soft round shadow under the farmer (the sun's shadow map is drawn only now and then, so a walker's own would lag).
function blob(size){
 const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,4,32,32,31);
 r.addColorStop(0,'rgba(40,52,24,.4)');r.addColorStop(1,'rgba(40,52,24,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
 const m=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.y=.02;m.renderOrder=1;return m;
}
// For the screenshot harness: every page's walker (where it stands on the screen, to tap it).
export const FARM_WALKERS=new Set();
// scene: the farm's or the village's; walk: FARM_WALK or VILLAGE_WALK; ground(x, z): the height there; lite: phones (every other frame).
export async function createFarmWalker({scene,walk=FARM_WALK,ground=()=>0,lite=false,config=DEFAULT_FARMER,random=Math.random}){
 const farmer=await createFarmer(config,{height:walk.height});
 const root=farmer.root,{actions,mixer}=farmer;root.name='your-farmer';
 for(const name of ['walk','idle','look','relaxed'])actions[name]?.setLoop(THREE.LoopRepeat,Infinity);
 // The walk cycle covers 1.48 m of the pack's 1.83 m farmer: played at the speed that keeps the feet from sliding.
 if(actions.walk)actions.walk.timeScale=walk.walk/(1.48*walk.height/1.83/actions.walk.getClip().duration);
 actions.hop?.setLoop(THREE.LoopOnce,1);if(actions.hop)actions.hop.clampWhenFinished=true;
 root.add(blob(walk.height*.55));
 // The tap target: a box round the farmer, a little bigger, so a phone's finger finds them. Never drawn.
 const hit=new THREE.Mesh(new THREE.BoxGeometry(walk.height*.5,walk.height*1.05,walk.height*.5),new THREE.MeshBasicMaterial({visible:false}));
 hit.position.y=walk.height*.52;hit.userData.farmer=true;root.add(hit);
 const spots=walk.spots,start=Math.floor(random()*spots.length);
 root.position.set(spots[start][0],ground(spots[start][0],spots[start][1]),spots[start][1]);scene.add(root);
 const me={spot:start,target:null,rest:REST[0]*random(),yaw:Math.PI/4,face:Math.PI/4,state:'idle',current:null,hopping:0};
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();let frame=0,wait=0,seenBy=null;
 function play(name,fade=FADE){
  const next=actions[name];if(!next||next===me.current)return;
  next.reset().play();if(me.current)me.current.crossFadeTo(next,fade,false);me.current=next;me.state=name;
 }
 play('idle');mixer.update(random()*3);
 // Facing the camera a little (it looks from +x, +z) while standing; the next spot of the loop when the rest is over.
 function rest(){me.target=null;me.rest=REST[0]+random()*(REST[1]-REST[0]);me.face=Math.PI/4+(random()-.5)*1.2;play(choose(STILL,random));}
 function step(dt){
  const at=root.position;
  if(me.hopping>0){
   // The hop (21 Oct 2026, the owner: the pack's jump, made small, sank into the ground: its legs still tucked a full jump's worth):
   // the whole farmer goes up and down once, standing as they are; the ground is never crossed.
   me.hopping=Math.max(0,me.hopping-dt);at.y=ground(at.x,at.z)+Math.sin(Math.PI*(1-me.hopping/HOP_TIME))*HOP_UP*walk.height;
   if(me.hopping<=0){at.y=ground(at.x,at.z);rest();}
  }
  else if(me.target){
   const dx=me.target[0]-at.x,dz=me.target[1]-at.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz);
   if(d<.05)rest();
   else{
    me.yaw=turnTowards(me.yaw,want,TURN*dt);
    // It turns first, then walks: no sliding sideways.
    if(Math.abs(turnOf(me.yaw,want))<.5){play('walk');const s=Math.min(d,walk.walk*dt);at.x+=dx/d*s;at.z+=dz/d*s;at.y=ground(at.x,at.z);}
   }
  }else{
   me.yaw=turnTowards(me.yaw,me.face,TURN*.4*dt);
   if((me.rest-=dt)<=0){me.spot=(me.spot+1)%spots.length;me.target=spots[me.spot];}
  }
  root.rotation.y=me.yaw;
 }
 const shown=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 // One frame (dt in seconds; game.js caps it): only while in the picture, a phone at every other frame (with that frame's time too).
 function animate(dt,camera){
  frame++;wait+=dt;seenBy=camera;
  if(lite&&frame%2)return;
  const t=Math.min(wait,.2);wait=0;
  if(!shown(root))return;
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  sphere.center.copy(root.position);sphere.center.y+=walk.height/2;sphere.radius=walk.height;
  if(!frustum.intersectsSphere(sphere))return;
  step(t);mixer.update(t);
 }
 // A tap that found nothing else (game.js pointerTarget): true when it was the farmer.
 const pick=raycaster=>raycaster.intersectObject(hit,false).length>0;
 // A tap: they stop, turn to you and hop once, then stand a while before walking on.
 function react(){
  me.target=null;me.yaw=me.face=Math.PI/4;root.rotation.y=me.yaw;
  play('idle');me.hopping=HOP_TIME;
  return true;
 }
 // Where the farmer stands on the screen, -1 to 1 across and up (as the camera saw it last), and what they are doing.
 const where=()=>{if(!seenBy)return null;const p=root.position.clone();p.y+=walk.height*.5;p.project(seenBy);return {x:p.x,y:p.y,state:me.state,world:[root.position.x,root.position.z]};};
 const result={farmer,root,hit,ground,animate,pick,react,where,camera:()=>seenBy,dispose(){farmer.dispose();FARM_WALKERS.delete(result);}};
 FARM_WALKERS.add(result);return result;
}
