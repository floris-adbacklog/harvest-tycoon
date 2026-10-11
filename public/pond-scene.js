import * as THREE from 'three';
import {POND,placeIn} from './farm-layout.js';
// The Fishing pond in the farm (11 Oct 2026, part C): a rod in a rest at the end of the pier, a float, the line, a fish's shadow under
// the water during the fight, splashes, and the fish that leaps out when it is landed. All made here from plain shapes (there is no fish,
// rod or float in the model packs), in the colours of the owner's fish pictures; the float is the game's red and cream. The rod lies in
// its rest from level 4, so the pier says what it is for; a small fish jumps now and then while casts are waiting (cue()). pond-ui.js
// drives the rest. Where things stand comes from the pier as it was placed (farm-life.js), so a moved pier takes the spot along.
const WATER_Y=.034,UP=new THREE.Vector3(0,1,0);
// Colour, size and (page two's eel and sturgeon) how long and slim the body is, from the owner's pictures.
export const FISH_LOOK=Object.freeze({minnow:[0xc9cfbf,.5],perch:[0x9aa547,.7],roach:[0xc5ccd3,.75],carp:[0xc08a3e,1.1],tench:[0x7b8a35,1],pike:[0x7d9440,1.3],goldencarp:[0xf2b33a,1],whiskers:[0x8a7a55,1.6],
 rudd:[0xb9a23e,.65],bream:[0xa49a7e,.95],eel:[0x6f5f2a,1,2],trout:[0xc7b3ae,.9],barbel:[0xa77c4a,1.05],zander:[0x97a08a,1.15],koi:[0xee7a3a,1],sturgeon:[0x7f8a92,1.6,1.5]});
const ease=k=>k<.5?2*k*k:1-(-2*k+2)**2/2;
export function createPondScene({scene,reducedMotion=false,cue=()=>false}){
 const [cx,cz]=placeIn('pond',POND.x,POND.z),centre=new THREE.Vector3(cx,WATER_Y,cz);
 const pier=scene.children.find(o=>o.userData.model==='village_pier_001');
 const pierBox=pier?new THREE.Box3().setFromObject(pier):null,pierMid=pierBox?pierBox.getCenter(new THREE.Vector3()):new THREE.Vector3(cx+4.8,0,cz+3);
 // The farmer stands at the pier's right-hand corner as the camera sees it (screen right is +x -z), so the rod reaches up and over the
 // water across the screen instead of straight away from the camera, where it looked like a post.
 const toCentre=new THREE.Vector3(cx-pierMid.x,0,cz-pierMid.z).normalize(),right=new THREE.Vector3(Math.SQRT1_2,0,-Math.SQRT1_2);
 const ray=new THREE.Raycaster();
 const deckAt=(x,z)=>{ray.set(new THREE.Vector3(x,6,z),new THREE.Vector3(0,-1,0));const hit=pier?ray.intersectObject(pier,true).find(h=>h.point.y>.05):null;return hit?hit.point.y:.3;};
 // Where the farmer stands (the pier's edge on the water side), where the float rests and the middle of the two (the camera's spot).
 const stand=pierMid.clone().addScaledVector(right,.75).addScaledVector(toCentre,.55);stand.y=deckAt(stand.x,stand.z);
 const dir=new THREE.Vector3(cx-stand.x,0,cz-stand.z).normalize(),side=new THREE.Vector3(-dir.z,0,dir.x);
 const rest=stand.clone().addScaledVector(dir,3.3);rest.y=WATER_Y;
 const group=new THREE.Group();group.name='Fishing pond';scene.add(group);
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.7,...extra});
 // The rod in its rest: a pivot at the butt, turned to the water, lifted by `pitch`.
 const rod=new THREE.Group();rod.position.copy(stand);rod.rotation.y=Math.atan2(-dir.z,dir.x);group.add(rod);
 const pivot=new THREE.Group();rod.add(pivot);
 const ROD=2.3,pole=new THREE.Mesh(new THREE.CylinderGeometry(.028,.055,ROD,6),mat(0x8a5a2b));pole.rotation.z=-Math.PI/2;pole.position.x=ROD/2;pivot.add(pole);
 const grip=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.42,8),mat(0x5e3a1c));grip.rotation.z=-Math.PI/2;grip.position.x=.24;pivot.add(grip);
 const reelWheel=new THREE.Mesh(new THREE.CylinderGeometry(.075,.075,.05,10),mat(0xb9b2a0,{metalness:.4,roughness:.4}));reelWheel.rotation.x=Math.PI/2;reelWheel.position.set(.5,-.08,0);pivot.add(reelWheel);
 const tip=new THREE.Object3D();tip.position.x=ROD;pivot.add(tip);
 const stick=new THREE.Mesh(new THREE.BoxGeometry(.07,.42,.07),mat(0x6b4a2b));stick.position.set(.95,.17,0);rod.add(stick);
 let pitch=.5,pitchTo=.5;pivot.rotation.z=pitch;
 // The float: red over cream, with a little stick on top.
 const float=new THREE.Group(),R=.16;
 const top=new THREE.Mesh(new THREE.SphereGeometry(R,12,6,0,Math.PI*2,0,Math.PI/2),mat(0xc9503c,{roughness:.45}));
 const bottom=new THREE.Mesh(new THREE.SphereGeometry(R,12,6,0,Math.PI*2,Math.PI/2,Math.PI/2),mat(0xfffdf5,{roughness:.5}));
 const antenna=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.16,5),mat(0xfffdf5));antenna.position.y=R+.06;
 float.add(top,bottom,antenna);float.visible=false;group.add(float);
 // A soft ring round the float while it waits, so a small float is easy to find on a small screen.
 const marker=new THREE.Mesh(new THREE.RingGeometry(.36,.42,32),new THREE.MeshBasicMaterial({color:0xfffdf5,transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));marker.rotation.x=-Math.PI/2;marker.position.set(rest.x,WATER_Y+.005,rest.z);group.add(marker);
 // The line: from the rod's tip to the float (or, in the fight, to the fish under the water), sagging a little.
 const LINE_POINTS=18,linePositions=new Float32Array(LINE_POINTS*3),lineGeometry=new THREE.BufferGeometry();lineGeometry.setAttribute('position',new THREE.BufferAttribute(linePositions,3));
 const line=new THREE.Line(lineGeometry,new THREE.LineBasicMaterial({color:0xfffdf5,transparent:true,opacity:.85}));line.frustumCulled=false;line.visible=false;group.add(line);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,18),new THREE.MeshBasicMaterial({color:0x1f4e5a,transparent:true,opacity:0,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=WATER_Y+.004;group.add(shadow);
 const effects=[];
 function ring(at,size=1,life=.9){
  const m=new THREE.Mesh(new THREE.RingGeometry(.42,.5,28),new THREE.MeshBasicMaterial({color:0xeaf7f2,transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  m.rotation.x=-Math.PI/2;m.position.set(at.x,WATER_Y+.006,at.z);m.scale.setScalar(.25*size);group.add(m);effects.push({obj:m,life,age:0,kind:'ring',size});
 }
 function drops(at,count=6,power=1){
  for(let i=0;i<count;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),new THREE.MeshBasicMaterial({color:0xeaf7f2,transparent:true,opacity:.9}));m.position.set(at.x,WATER_Y+.05,at.z);group.add(m);
   const a=i/count*Math.PI*2;effects.push({obj:m,life:.7,age:0,kind:'drop',v:new THREE.Vector3(Math.cos(a)*.9*power,(1.6+Math.random())*power,Math.sin(a)*.9*power)});}
 }
 function fishMesh(species){
  const [color,size,long=1]=FISH_LOOK[species]??FISH_LOOK.minnow,g=new THREE.Group(),m=mat(color,{roughness:.5,metalness:.15});
  const body=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),m);body.scale.set(.34*long,.14/Math.sqrt(long),.09);g.add(body);
  const tail=new THREE.Mesh(new THREE.ConeGeometry(.13,.22,4),m);tail.rotation.z=Math.PI/2;tail.position.x=-.06-.34*long;tail.scale.set(1,1,.35);g.add(tail);
  const fin=new THREE.Mesh(new THREE.ConeGeometry(.06,.14,3),m);fin.position.set(.02,.15,0);fin.scale.set(1,1,.3);g.add(fin);
  if(species==='whiskers'||species==='barbel'||species==='sturgeon')for(const s of [-1,1]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.3,3),m);w.position.set(.02+.34*long,-.04,s*.05);w.rotation.z=1.1;g.add(w);}
  g.scale.setScalar(size);return g;
 }
 // A fish that leaps out of the water at `from` and dives back further on (landed: towards the pier, where it is caught).
 function leap(species,from,to,height=1.1,life=.75){
  const f=fishMesh(species);f.position.copy(from);group.add(f);ring(from,1.2);drops(from,7,.9);
  effects.push({obj:f,life,age:0,kind:'leap',from:from.clone(),to:to.clone(),height});
 }
 // What the line and float are doing: hidden, resting on the water, flying out, nibbled at, pulled under, or in the fight.
 let mode='off',modeAt=0,clock=0,fishAt=rest.clone(),shadowSize=.5,tension=0,fight={progress:30,fishY:50,inside:true};
 const castFrom=new THREE.Vector3(),floatAt=rest.clone();
 const set=(next)=>{mode=next;modeAt=clock;};
 function tipPosition(out=new THREE.Vector3()){rod.updateMatrixWorld(true);return tip.getWorldPosition(out);}
 function drawLine(end,sag=.35){
  const a=tipPosition(),mid=a.clone().lerp(end,.5);mid.y-=sag;
  for(let i=0;i<LINE_POINTS;i++){const k=i/(LINE_POINTS-1),p=a.clone().multiplyScalar((1-k)**2).addScaledVector(mid,2*k*(1-k)).addScaledVector(end,k*k);linePositions.set([p.x,p.y,p.z],i*3);}
  lineGeometry.attributes.position.needsUpdate=true;line.visible=true;
 }
 let nextCue=12+Math.random()*10;
 function tick(t,dt){
  clock+=dt;const since=clock-modeAt;
  pitch+=(pitchTo-pitch)*Math.min(1,dt*(mode==='cast'?14:6));pivot.rotation.z=pitch;
  if(mode==='off'){float.visible=false;line.visible=false;}
  else if(mode==='ready'){pitchTo=.55;float.visible=false;line.visible=true;const hang=tipPosition().add(new THREE.Vector3(0,-.55,0));drawLine(hang,0);}
  else if(mode==='cast'){
   const k=Math.min(1,since/.7);pitchTo=k<.3?1.05:.4;
   floatAt.copy(castFrom).lerp(rest,ease(k));floatAt.y=castFrom.y*(1-k)+WATER_Y+Math.sin(k*Math.PI)*1.2;float.position.copy(floatAt);float.visible=true;drawLine(floatAt,.05);
   if(k>=1){set('float');ring(rest,1);drops(rest,4,.5);}
  }
  else if(mode==='float'||mode==='nibble'||mode==='bite'){
   pitchTo=.5;const bob=reducedMotion?0:Math.sin(clock*2.4)*.012;let y=WATER_Y+bob;
   if(mode==='nibble'){const k=since/.32;y-=k<1?Math.sin(k*Math.PI)*.07:0;if(k>=1)set('float');}
   if(mode==='bite'){y=WATER_Y-.16+(reducedMotion?0:Math.sin(clock*30)*.015);}
   floatAt.set(rest.x,y,rest.z);float.position.copy(floatAt);float.visible=true;drawLine(floatAt.clone().setY(Math.max(WATER_Y,y)+.02),.2);
  }
  else if(mode==='fight'){
   // The fish under the water: nearer the pier as the catch fills, to the side as it runs in the bar.
   const k=Math.min(1,Math.max(0,(fight.progress-30)/70));
   const goal=rest.clone().lerp(stand,.15+.55*k).addScaledVector(side,(fight.fishY-50)/50*1.1);goal.y=WATER_Y;
   fishAt.lerp(goal,Math.min(1,dt*5));tension+=((fight.inside?0:1)-tension)*Math.min(1,dt*4);pitchTo=.62-.22*tension;
   float.visible=false;shadow.position.set(fishAt.x,WATER_Y+.004,fishAt.z);shadow.material.opacity=Math.min(.5,shadow.material.opacity+dt);
   shadow.scale.set(.42*shadowSize,.17*shadowSize,1);shadow.rotation.z=Math.atan2(goal.z-fishAt.z,goal.x-fishAt.x);
   drawLine(fishAt,.04);
   if(!reducedMotion&&Math.random()<dt*(fight.inside?1.5:4))ring(fishAt,.6,.6);
  }
  else if(mode==='slack'){pitchTo=.5;line.visible=false;float.visible=false;shadow.material.opacity=Math.max(0,shadow.material.opacity-dt*1.5);}
  {const waiting=mode==='float'||mode==='nibble'||mode==='bite',goal=waiting?(mode==='bite'?.9:.45+(reducedMotion?0:Math.sin(clock*3)*.12)):0;marker.material.opacity+=(goal-marker.material.opacity)*Math.min(1,dt*6);marker.scale.setScalar(mode==='bite'?1.25:1);}
  if(mode!=='fight'&&shadow.material.opacity>0)shadow.material.opacity=Math.max(0,shadow.material.opacity-dt*1.2);
  // The pond's own life: now and then a small fish jumps while casts are waiting (never while fishing, never with reduced motion).
  if(!reducedMotion&&mode==='off'&&(nextCue-=dt)<=0){nextCue=18+Math.random()*10;if(cue()){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*.55,p=new THREE.Vector3(cx+Math.cos(a)*r*POND.rx,WATER_Y,cz+Math.sin(a)*r*POND.rz);leap('minnow',p,p.clone().addScaledVector(dir,-.7).addScaledVector(side,.3),.55,.5);}}
  for(let i=effects.length-1;i>=0;i--){
   const e=effects[i];e.age+=dt;const k=Math.min(1,e.age/e.life);
   if(e.kind==='ring'){e.obj.scale.setScalar((.25+k*1.4)*e.size);e.obj.material.opacity=(1-k)*.8;}
   else if(e.kind==='drop'){e.v.y-=dt*7;e.obj.position.addScaledVector(e.v,dt);e.obj.material.opacity=(1-k)*.9;}
   else if(e.kind==='leap'){const p=e.from.clone().lerp(e.to,k);p.y=WATER_Y+Math.sin(k*Math.PI)*e.height;const ahead=e.from.clone().lerp(e.to,Math.min(1,k+.05));ahead.y=WATER_Y+Math.sin(Math.min(1,k+.05)*Math.PI)*e.height;
    e.obj.position.copy(p);e.obj.lookAt(ahead);e.obj.rotateY(-Math.PI/2);if(k>=1){ring(e.to,.9);drops(e.to,5,.6);}}
   if(k>=1){group.remove(e.obj);e.obj.traverse(n=>{n.geometry?.dispose();n.material?.dispose?.();});effects.splice(i,1);}
  }
 }
 return {
  stand,rest,dir,
  // The spot between the farmer and the float: what the fishing view frames.
  focus:()=>stand.clone().lerp(rest,.55).setY(0),
  labelAt:()=>pierMid.clone().setY((pierBox?.max.y??1)+.9),
  show(on){rod.visible=on;},
  ready(){set('ready');},
  off(){set('off');},
  cast(){castFrom.copy(tipPosition());set('cast');},
  nibble(){if(mode==='float')set('nibble');},
  settle(){if(mode==='bite'||mode==='nibble'||mode==='cast')set('float');},
  bite(){set('bite');ring(rest,.9);drops(rest,6,.7);},
  fight(species){shadowSize=FISH_LOOK[species]?.[1]??.6;fishAt.copy(rest);tension=0;set('fight');},
  pull(next){fight=next;},
  // Landed: it leaps out and over to the pier. Escaped: a splash where it was and the line goes slack.
  land(species){const from=fishAt.clone(),to=stand.clone().addScaledVector(dir,.4);to.y=WATER_Y;leap(species,from,to,1.3,.8);set('slack');},
  escape(){ring(fishAt,1.1);drops(fishAt,5,.7);set('slack');},
  tick,dispose(){scene.remove(group);}
 };
}
