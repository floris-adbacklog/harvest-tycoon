import * as THREE from 'three';
import {featureUnlocked,ACTIVE_STATIONS,activityStatus,productionJobs} from './farm-state.js';
import {art} from './visual-icons.js';
import {SPREAD,zone,place,placeIn,wide,ROADS,roadSize,onRoad} from './farm-layout.js';
export const LIFE_MODELS=['landscape_004','mountain_008','mountain_009','field_004','field_005','bridge_001','horse_002','pig_001','lawn_mower_001','fir_tree_003','tree_008','stone_fence_001','trailer_001','tree_002','tree_005','tree_007','fir_tree_001','fir_tree_006','bush_002','bush_004','stone_fence_003'];

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
 // Broad, low shapes fill the edges; higher mountains stay behind the farm. The hills behind the Juice Press and behind the barns
 // made way for the Valley Market and the midgame yards (pushed further out they ran into the mountains), the one in the east is gone
 // (it stood in front of the wave-3 column at the end of the trunk road), and two strips of field moved aside.
 zone('exact');
 for(const [x,z,w,d,h,rotation] of [[-34,-21,25,20,5,.4],[-24,-34,26,21,6,1.1],[-37,10,20,24,3,1.5]])scenery('landscape_004',x,z,{width:wide(w),depth:wide(d),height:h,rotation,y:-.25});
 for(const [x,z,w,d,h] of [[-43,-39,37,27,10],[-9,-53,38,23,9],[26,-47,35,22,8]])scenery('mountain_008',x,z,{width:wide(w),depth:wide(d),height:h,y:-.6});
 scenery('mountain_009',-46,-7,{width:wide(21),depth:wide(30),height:5,y:-.2});
 // Neighbouring agricultural strips echo the supplied demo without adding timers. (The west one stops short of the Pig Farm's pen.)
 for(const [name,x,z,w,d,rotation] of [['field_005',-27,5.8,12,14.4,0],['field_004',-27,23,13,15,0],['field_005',15,29,25,11,0],['field_004',-13,-32,20,11,0]])scenery(name,x,z,{width:wide(w),depth:wide(d),height:.45,rotation,y:.01});
 // A turned road runs along the model's own length, so it has no pointed ends (the lane to the Trade Depot).
 for(const road of ROADS.slice(3)){const size=roadSize(road);scenery('road_001',road.x,road.z,road.turned?{width:size.depth,depth:size.width,height:road.height,y:road.y,rotation:Math.PI/2}:{...size,height:road.height});}
 zone(null);
 for(const [x,z] of [[-19,-22],[-17,-23],[-14,-25],[12,-23],[17,-23],[-24,16],[-23,19],[-22,22],[22,3],[24,8],[25,14],[-18,25],[-12,26],[25,-17]])scenery(['tree_008','tree_002','tree_005','tree_007'][Math.abs(x+z)%4],x,z,{height:2.8+(Math.abs(x+z)%3)*.3,rotation:x*.3});
 // Pines at the foot of the mountains where the two hills were.
 for(const [x,z] of [[-30,-13],[-31,-18],[-26,-25],[-16,-30],[-11,-32],[15,-32],[25,-23],[29,-20],[-32,16],[30,17],[6,-40],[11,-38],[-2,-42],[33,-32],[36,-29],[38,-35]])scenery(['fir_tree_003','fir_tree_001','fir_tree_006'][Math.abs(x)%3],x,z,{height:3.4+(Math.abs(x)%3)*.4,rotation:z*.2});
 {const [wx,wz]=place(-18,28.5);zone('fields');for(let i=0;i<Math.round(7*SPREAD);i++){const cx=wx+i*2.6;if(onRoad(cx-1.3,cx+1.3,wz-.3,wz+.3))continue;scenery(i%3===2?'stone_fence_003':'stone_fence_001',cx,wz,{width:2.6,height:.65});}zone(null);}
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
