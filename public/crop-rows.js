import * as THREE from 'three';
import {ROW_CROPS,growthStage,fieldSpots,hop} from './crop-growth.js';

// A field of row crops drawn as one instanced mesh (one draw call however many plants), with the bean pods as a second one, and the
// little moments around it: a new planting pops up, each growth step gives a small hop, a ripe field wiggles once, and a harvested
// field's plants are picked (they go down into the soil while the harvest flies to the Market button, harvest-fly.js). Looks only: game.js and farm-state.js keep the rules.

export const isRowCrop=crop=>Object.hasOwn(ROW_CROPS,crop);
const WHITE=new THREE.Color(1,1,1),UP=new THREE.Vector3(0,1,0);
const clock=()=>performance.now()/1000;

function templateMesh(entry){let mesh=null;entry.object.updateMatrixWorld(true);entry.object.traverse(n=>{if(!mesh&&n.isMesh)mesh=n;});return mesh;}

export function createCropMotion({scene,reducedMotion=false}){
 const hopping=new Map(),flying=[];
 const motion={
  canMove:!reducedMotion,
  // A hop for a whole crop group (trees, vines, bean poles), on top of the size it has.
  hopGroup(v,kind){if(!reducedMotion)hopping.set(v,{kind,start:clock()});},
  isHopping:v=>hopping.has(v),
  track(rows){if(!reducedMotion)hopping.set(rows,{rows});},
  // The plants of a harvested field are picked: a small lift, then they go down into the soil (the harvest itself flies to the
  // Market button, harvest-fly.js). False when motion is reduced.
  pick(cropGroup){
   if(reducedMotion||!cropGroup.children.length)return false;
   const g=new THREE.Group();g.position.copy(cropGroup.position);g.rotation.copy(cropGroup.rotation);g.scale.copy(cropGroup.scale);
   for(const child of [...cropGroup.children])g.add(child);
   scene.add(g);flying.push({g,start:clock(),s:g.scale.x});return true;
  },
  // Each frame: true while something moves (so the shadows follow).
  animate(){
   const now=clock();let busy=false;
   for(const [key,h] of hopping){
    busy=true;
    if(h.rows){if(!h.rows.step(now))hopping.delete(key);continue;}
    const f=hop(h.kind,now-h.start),s=key.groupScale??1;
    if(!f){key.cropGroup.scale.setScalar(s);hopping.delete(key);}else key.cropGroup.scale.set(s*f.wide,s*f.up,s*f.wide);
   }
   for(let i=flying.length-1;i>=0;i--){
    const fl=flying[i],k=(now-fl.start)/.34;busy=true;
    if(k>=1){fl.g.traverse(n=>{if(n.isInstancedMesh)n.dispose();for(const m of [].concat(n.material??[]))if(m.userData?.farmCropOwned)m.dispose();});scene.remove(fl.g);flying.splice(i,1);continue;}
    const lift=k<.3?Math.sin(k/.3*Math.PI):0,e=k<.3?0:(k-.3)/.7,up=k<.3?1+.1*lift:(1-e)*(1-e),wide=k<.3?1-.04*lift:1-.25*e;
    fl.g.scale.set(fl.s*wide,fl.s*Math.max(.001,up),fl.s*wide);
   }
   return busy;
  }
 };
 return motion;
}

export function buildRows({crop,entry,height,tint,seed,pods,fresh,motion}){
 const rows=ROW_CROPS[crop],spots=fieldSpots(crop,seed),template=templateMesh(entry),base=template.matrixWorld.clone(),unit=height/entry.size.y;
 const mesh=new THREE.InstancedMesh(template.geometry,template.material,spots.length);
 mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;
 const podMesh=pods?new THREE.InstancedMesh(pods.geometry,pods.material,spots.length*3):null;
 if(podMesh){podMesh.castShadow=true;podMesh.frustumCulled=false;}
 const own=tint!=null?new THREE.Color(tint):WHITE.clone(),young=new THREE.Color(...rows.young),colour=new THREE.Color();
 const m=new THREE.Matrix4(),pm=new THREE.Matrix4(),q=new THREE.Quaternion(),pos=new THREE.Vector3(),scl=new THREE.Vector3();
 const podTurn=new THREE.Quaternion(),podAt=new THREE.Vector3(),podSize=new THREE.Vector3(),zAxis=new THREE.Vector3(0,0,1),hidden=new THREE.Matrix4().makeScale(0,0,0);
 let shown=null,stage=null,active=null,first=true;
 function write(target,f){
  const s=target.scale*(f?.grow??1),up=f?.up??1,wide=f?.wide??1;
  colour.copy(WHITE).lerp(young,target.green).multiply(own);
  spots.forEach((p,i)=>{
   const k=unit*p.size*s;
   q.setFromAxisAngle(UP,p.turn);pos.set(p.x,0,p.z);scl.set(k*wide,k*up,k*wide);
   m.compose(pos,q,scl).multiply(base);mesh.setMatrixAt(i,m);mesh.setColorAt(i,colour);
   if(podMesh)for(let j=0;j<3;j++){
    // Pods hang on grown bean plants only, placed as on the old four-plant field (sized for a 1.25 tall plant).
    if(target.scale<.8){podMesh.setMatrixAt(i*3+j,hidden);continue;}
    const r=p.size*s/.85;
    podAt.set(p.x+Math.cos(j*2)*.16*r*wide,(.45+j*.19)*r*up,p.z+Math.sin(j*2)*.16*r*wide);podTurn.setFromAxisAngle(zAxis,.25-j*.2);podSize.set(.065*r,.23*r*up,.065*r);
    podMesh.setMatrixAt(i*3+j,pm.compose(podAt,podTurn,podSize));
   }
  });
  mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.boundingSphere=null;
  if(podMesh){podMesh.instanceMatrix.needsUpdate=true;podMesh.boundingSphere=null;}
  shown=target;
 }
 const view={
  mesh,podMesh,
  // Twice a second from drawCrop: the growth stage for how far the crop has grown.
  update(grown,ripe){
   const target=growthStage(grown,ripe),changed=stage!==target.stage,wasFirst=first;first=false;stage=target.stage;
   if(changed&&motion?.canMove&&(!wasFirst||fresh)){const kind=wasFirst?'plant':target.stage==='ripe'?'ripe':'stage';active={kind,start:clock(),target};write(target,hop(kind,0));motion.track(view);return;}
   if(active){active.target=target;return;}
   if(!shown||changed||Math.abs(shown.scale-target.scale)>.004)write(target);
  },
  step(now){
   if(!active)return false;
   const f=hop(active.kind,now-active.start);
   if(!f){write(active.target);active=null;return false;}
   write(active.target,f);return true;
  },
  dispose(){mesh.dispose();podMesh?.dispose();}
 };
 return view;
}
