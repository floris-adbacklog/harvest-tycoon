import * as THREE from 'three';
import {featureUnlocked,ACTIVE_STATIONS,activityStatus,productionJobs} from './farm-state.js';
import {art} from './visual-icons.js';
import {SPREAD,zone,place,placeIn,wide,ROADS,roadSize,onRoad} from './farm-layout.js';
export const LIFE_MODELS=['mountain_008','field_004','field_005','bridge_001','horse_002','pig_001','lawn_mower_001','fir_tree_003','tree_008','stone_fence_001','trailer_001','tree_002','tree_005','tree_007','fir_tree_001','fir_tree_006','bush_002','bush_004','stone_fence_003'];

export function createFarmLife({scene,cloneModel,patch,state,onOpen,reducedMotion}){
 const views=new Map(),hitAreas=[],moving=[],effects=[],water=[],smoke=[];
 function scenery(name,x,z,options={}){
  const o=cloneModel(name,x,z,options);
  // The surrounding valley never changes the playable camera bounds or hit tests.
  o.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;if(name==='field_005'){n.material=n.material.clone();n.material.map=null;n.material.color.setHex(0xd7b654);}}});return o;
 }
 function station(id,object,x,z){
  object.userData.activity=id;
  const bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
  const hit=new THREE.Mesh(new THREE.BoxGeometry(Math.max(size.x+.6,2.8),Math.max(size.y+.4,1.8),Math.max(size.z+.6,2.8)),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
  hit.position.copy(center);hit.userData.activity=id;scene.add(hit);hit.updateMatrixWorld(true);hitAreas.push(hit);
  const height=new THREE.Box3().setFromObject(object).max.y;
  const label=document.createElement('button');label.className='activity-label';label.setAttribute('aria-label',`Help at the ${ACTIVE_STATIONS[id].name}`);label.title=ACTIVE_STATIONS[id].name;label.innerHTML=art(`activity-${id}`);label.onclick=()=>onOpen(id);document.getElementById('building-labels').append(label);
  views.set(id,{object,x:object.position.x,z:object.position.z,height,label});return object;
 }
  // Higher mountains stay behind the farm; the edges around it are open meadow with pines and strips of field. (Broad smooth green
 // hills stood here too, until 25 Sep 2026: they did not match the angular rest of the valley, hid the trees behind them, and the
 // pines at their foot stood half inside them. The hills behind the Juice Press and the barns had already made way for the Valley
 // Market and the midgame yards, and two strips of field moved aside.)
 zone('exact');
 for(const [x,z,w,d,h] of [[-43,-39,37,27,10],[-9,-53,38,23,9],[26,-47,35,22,8]])scenery('mountain_008',x,z,{width:wide(w),depth:wide(d),height:h,y:-.6});
 // Neighbouring agricultural strips echo the supplied demo without adding timers. (The west one stops short of the Pig Farm's pen.)
 // (The two strips on the west made way for the level 25-50 yards, and the one in front of the Factory for a grove, 25 Sep 2026.)
 for(const [name,x,z,w,d,rotation] of [['field_004',-13,-32,20,11,0]])scenery(name,x,z,{width:wide(w),depth:wide(d),height:.45,rotation,y:.01});
 // A turned road runs along the model's own length, so it has no pointed ends (the lane to the Trade Depot).
 for(const road of ROADS.slice(3)){const size=roadSize(road);scenery('road_001',road.x,road.z,road.turned?{width:size.depth,depth:size.width,height:road.height,y:road.y,rotation:Math.PI/2}:{...size,height:road.height});}
 zone(null);
 for(const [x,z] of [[-19,-22],[-17,-23],[-14,-25],[12,-23],[17,-23],[-24,16],[-23,19],[-22,22],[22,3],[24,8],[25,14],[-18,25],[-12,26],[25,-17]])scenery(['tree_008','tree_002','tree_005','tree_007'][Math.abs(x+z)%4],x,z,{height:2.8+(Math.abs(x+z)%3)*.3,rotation:x*.3});
 // Pines at the foot of the mountains where the two hills were.
 for(const [x,z] of [[-30,-13],[-31,-18],[-26,-25],[-16,-30],[-11,-32],[15,-32],[25,-23],[29,-20],[-32,16],[30,17],[6,-40],[11,-38],[-2,-42],[33,-32],[36,-29],[38,-35]])scenery(['fir_tree_003','fir_tree_001','fir_tree_006'][Math.abs(x)%3],x,z,{height:3.4+(Math.abs(x)%3)*.4,rotation:z*.2});
 {const [wx,wz]=place(-18,28.5);zone('fields');for(let i=0;i<Math.round(7*SPREAD);i++){const cx=wx+i*2.6;if(onRoad(cx-1.3,cx+1.3,wz-.3,wz+.3))continue;scenery(i%3===2?'stone_fence_003':'stone_fence_001',cx,wz,{width:2.6,height:.65});}zone(null);}
 // Neighbouring farms: a patchwork of field strips in the open meadow in front of the farm (wheat, green rows, ploughed earth), each
 // with a low stone wall on the side that faces the farm, so the valley reads as farmland. (The back and the sides are the forest
 // edge's, scenery.js.) Each goes to the first free
 // spot near where it belongs: not on a road, a building, a tree or another field, and well inside the ring of mountains that
 // scene-polish.js puts around the valley later. They are here, before the grass and the loose props, so those keep off them.
 {
  zone('fields');
  const RING=1+(SPREAD-1)*.85,K=Math.SQRT1_2,box=new THREE.Box3(),size=new THREE.Vector3();
  const taken=[];
  for(const o of scene.children){
   if(o.isLight||o.isCamera||o.name==='Farm ground'||o.userData.model==='road_001')continue;
   box.setFromObject(o);if(box.isEmpty()||box.getSize(size).y<.03)continue;taken.push(box.clone());
  }
  // Clear of the mountain ring: its peaks stand from about 50 (to the sides) and 46 (to the back) out, in screen directions, all the
  // way from the right (-8 degrees) round the back to the left front (196); only the front is open.
  const insideRing=(x,z)=>{const sx=((x-1.4)-(z-1.5))*K,sb=(-(x-1.4)-(z-1.5))*K,A=44*RING,B=40*RING,deg=Math.atan2(sb/B,sx/A)*180/Math.PI;
   return (deg>-16&&deg<204)?(sx/A)**2+(sb/B)**2<1:true;};
  const clear=(x,z,w,d)=>[[-1,-1],[1,-1],[-1,1],[1,1]].every(([a,b])=>insideRing(x+a*w/2,z+b*d/2)&&Math.max(Math.abs(x+a*w/2),Math.abs(z+b*d/2))<70)
   &&!onRoad(x-w/2-1,x+w/2+1,z-d/2-1,z+d/2+1)&&!taken.some(t=>x+w/2+.8>t.min.x&&x-w/2-.8<t.max.x&&z+d/2+.8>t.min.z&&z-d/2-.8<t.max.z);
  const KINDS={wheat:['field_005',0xd7b654,false],green:['field_004',null,true],ploughed:['field_004',0x9c7a52,false]};
  for(const [x0,z0,w,d,kind] of [[-20,55,13,8,'green'],[-3,60,11,9,'wheat'],[15,56,14,7,'ploughed'],[31,63,10,8,'green'],[47,53,10,8,'wheat']]){
   let spot=null;
   for(let r=0;r<=8&&!spot;r+=2)for(const [dx,dz] of r?[[r,0],[-r,0],[0,r],[0,-r],[r,r],[-r,r],[r,-r],[-r,-r]]:[[0,0]])if(!spot&&clear(x0+dx,z0+dz,w,d))spot=[x0+dx,z0+dz];
   if(!spot)continue;const [x,z]=spot,[model,color,keepMap]=KINDS[kind];
   const field=cloneModel(model,x,z,{width:w,depth:d,height:.45,y:.01});
   field.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;if(color!=null){n.material=n.material.clone();if(!keepMap)n.material.map=null;n.material.color.setHex(color);}}});
   field.userData.neighbour=true;taken.push(new THREE.Box3().setFromObject(field));
   // The wall along the long side towards the middle of the farm.
   const alongX=w>=d,side=alongX?(z>0?-1:1):(x>0?-1:1),length=alongX?w:d;
   for(let i=0;i<Math.floor(length/2.6);i++){
    const t=-length/2+1.3+i*2.6,wx=alongX?x+t:x+side*(w/2+.5),wz=alongX?z+side*(d/2+.5):z+t;
    const wall=scenery(i%3===2?'stone_fence_003':'stone_fence_001',wx,wz,{width:2.6,height:.65,rotation:alongX?0:Math.PI/2});taken.push(new THREE.Box3().setFromObject(wall));
   }
  }
  // A grove where the big wheat field in front of the Factory was (25 Sep 2026): trees on both sides of the road there.
  for(const [x,z,h,i] of [[6,34.5,4.6,0],[11.5,36,5.2,1],[30.5,35,4.8,2],[35,38,5.4,3],[7.5,44.5,5,1],[13.5,46.5,4.4,2],[21,44,5.6,0],[28.5,45.5,4.9,3],[35.5,44,4.5,1]])
   scenery(['tree_008','tree_002','tree_005','tree_007'][i],x,z,{height:h,rotation:x*.37});
  zone(null);
  // No tree grows on a field: the farm's own trees (game.js) and the ones above were placed without looking at the fields.
  const fieldBoxes=scene.children.filter(o=>/^field_/.test(o.userData.model??'')).map(o=>new THREE.Box3().setFromObject(o).expandByScalar(-.3));
  for(const o of [...scene.children])if(/^(tree|fir_tree|bush)_/.test(o.userData.model??'')&&fieldBoxes.some(b=>o.position.x>b.min.x&&o.position.x<b.max.x&&o.position.z>b.min.z&&o.position.z<b.max.z))o.removeFromParent();
 }
 // A shallow pond and small bridge create a recognisable corner near the fields.
 zone('pond');
 const shore=new THREE.Mesh(new THREE.CircleGeometry(1,18),new THREE.MeshStandardMaterial({color:0xb4ac89,roughness:1}));shore.rotation.x=-Math.PI/2;shore.scale.set(6.4,4.4,1);{const [px,pz]=place(17.6,15.2);shore.position.set(px,.019,pz);}scene.add(shore);
 const pond=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshStandardMaterial({color:0x62bfc0,roughness:.35,metalness:.05}));pond.rotation.x=-Math.PI/2;pond.scale.set(5.8,3.8,1);{const [px,pz]=place(17.6,15.2);pond.position.set(px,.027,pz);}scene.add(pond);
 scenery('bridge_001',17.5,16.2,{width:11.9,depth:1.7,height:.7,rotation:0,y:.05});
 for(let i=0;i<3;i++){const r=new THREE.Mesh(new THREE.RingGeometry(.48,.51,32),new THREE.MeshBasicMaterial({color:0xd6f1da,transparent:true,opacity:.35,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;{const [px,pz]=place(14.9+i*1.6,14.6-i*.45);r.position.set(px,.032,pz);}scene.add(r);water.push(r);}
 for(const [x,z] of [[12.5,15.5],[14,18.5],[21,17.8],[22.3,13.8]]){scenery('bush_003',x,z,{width:1.4});scenery('grass_004',x+.7,z-.4,{height:.6});}
 scenery('bush_004',10.4,17.6,{width:1.9});scenery('bush_002',23.9,17,{width:1.7});
 zone('workshop');
 // Open approach to the Family Hall; the workshop stays directly tappable.
 station('workshop',cloneModel('lawn_mower_001',-9.1,-14.7,{width:1.25,rotation:.5}),-9.1,-14.7);
 zone(null);scenery('trailer_001',-19,-20,{width:2.2,rotation:.25});zone('paddock');
 // The existing glasshouse and hives receive real activities through attach().
 const horse=station('paddock',cloneModel('horse_002',17.9,-8.5,{width:2.2,rotation:-.7}),17.9,-8.5);
 const pig=cloneModel('pig_001',17.9,-5.6,{width:1.3,rotation:2.4});pig.userData.activity='paddock';
 {const [hx,hz]=place(17.9,-8.5),[gx,gz]=place(17.9,-5.6);moving.push({obj:horse,x:hx,z:hz,kind:'animal',phase:0},{obj:pig,x:gx,z:gz,kind:'animal',phase:3});}
 // Three standard 2.2-unit segments, like every other fence on the farm (one 5.8-wide piece made the posts oversized).
 for(const z of [-9.2,-7,-4.8])scenery('fence_001',19.5,z,{width:2.2,rotation:Math.PI/2});scenery('water_001',18.4,-10.6,{width:1.4});scenery('hay_002',17.7,-3.2,{width:1.8});zone(null);
 // A few bees, kept away from the crop labels.
 const beeHome=placeIn('apiary',10.4,13.7);
 for(let i=0;i<5;i++){const bee=new THREE.Mesh(new THREE.SphereGeometry(.06,4,3),new THREE.MeshBasicMaterial({color:0xf5c64c}));scene.add(bee);moving.push({obj:bee,kind:'bee',phase:i*1.8});}
 function attach(id,obj){return station(id,obj,obj.position.x,obj.position.z);}
 function position(camera,width,height,now){
  for(const [id,v] of views){
   const p=new THREE.Vector3(v.object.position.x,v.height+.4,v.object.position.z).project(camera),s=activityStatus(state,id,now);
   v.label.style.left=`${(p.x*.5+.5)*width}px`;v.label.style.top=`${(-p.y*.5+.5)*height}px`;
   v.label.hidden=!featureUnlocked(state,'activities')||Math.abs(p.x)>.94||Math.abs(p.y)>.86;v.label.classList.toggle('available',!s.remaining);v.label.classList.toggle('working',!!s.job);
  }
 }
 function watchProduction(buildings){
  for(const id of ['bakery','mill','packing','kitchen','juicepress','preserves','factory']){const v=buildings.get(id);for(let i=0;i<3;i++){const obj=new THREE.Mesh(new THREE.SphereGeometry(.17,6,4),new THREE.MeshBasicMaterial({color:0xfff5dc,transparent:true,opacity:0,depthWrite:false}));scene.add(obj);smoke.push({obj,id,x:v.x,z:v.z,y:v.height,phase:i/3});}}
 }
 function animate(t,dt,now){
  if(reducedMotion)return;
  for(const m of moving){
   if(m.kind==='bee')m.obj.position.set(beeHome[0]+Math.sin(t*1.2+m.phase)*.7,1.2+Math.sin(t*2+m.phase)*.25,beeHome[1]+Math.cos(t+m.phase)*.6);
  }
  water.forEach((r,i)=>{const f=((t*.3+i/3)%1);r.scale.setScalar(.6+f*1.6);r.material.opacity=(1-f)*.35;});
  for(const s of smoke){const running=productionJobs(state.buildings[s.id]).some(j=>j.readyAt>now),f=(t*.23+s.phase)%1;s.obj.visible=running;s.obj.position.set(s.x+f*.5,s.y+.1+f*1.8,s.z);s.obj.scale.setScalar(.6+f*1.5);s.obj.material.opacity=(1-f)*.3;}
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.obj.position.y+=dt*.8;e.obj.material.opacity=Math.max(0,e.life);e.obj.scale.multiplyScalar(1+dt*.3);if(e.life<=0){scene.remove(e.obj);e.obj.geometry.dispose();e.obj.material.dispose();effects.splice(i,1);}}
 }
 function celebrate(id){
  if(reducedMotion)return;const v=views.get(id);if(!v)return;
  for(let i=0;i<7;i++){const o=new THREE.Mesh(new THREE.SphereGeometry(.1,4,3),new THREE.MeshBasicMaterial({color:i%2?0xffd458:0xd0e79d,transparent:true}));o.position.set(v.x+Math.cos(i)*.7,.8,v.z+Math.sin(i)*.7);scene.add(o);effects.push({obj:o,life:1.4});}
 }
 return {views,attach,position,animate,celebrate,watchProduction,targets:()=>!featureUnlocked(state,'activities')?[]:hitAreas.concat([...views.values()].map(v=>v.object).concat(moving.filter(m=>m.kind!=='bee').map(m=>m.obj)))};
}
