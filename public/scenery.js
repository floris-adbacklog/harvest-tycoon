// Scenery that makes the valley feel lived in. It is added after the farm is on screen (game.js addScenery), so the first
// load is not slower, and everything in it stands still. Around the valley: a belt of firs with soft green hills behind, between the farm's trees and the mountains. Beside the roads: strips of sunflowers. On the farm:
// chicks and a rooster at the coop, a spotted cow, and the odd tool around the farmhouse and the fields. Grass tufts
// across the outer meadows, which were bare ground, and at the front (towards the camera) only low things: bushes, young
// trees and clumps of sunflowers.
// Spots are fixed (a seeded generator), so the farm looks the same on every device, and a piece only goes where nothing
// else stands: not on a building, fence, road, field (all 40 of them) or the pond. Repeated pieces (trees, sunflowers) are
// drawn as one instanced mesh per model, so a hundred of them cost a handful of draw calls.
import * as THREE from 'three';
import {seeded} from './farm-props.js';
import {SPREAD,roadRects,onRoad,placeIn,anchorAt} from './farm-layout.js';

const FIRS=['fir_tree_001','fir_tree_003','fir_tree_004','fir_tree_006','fir_tree_007','fir_tree_010'];
const FARM_PIECES=['chicken_002','chicken_003','cow_003','toilet_001','firewood_005','cart_003','cart_006','lawn_mower_001','car_005','dray_001','trailer_002'];
const FRONT=['bush_001','bush_002','bush_003','bush_004','tree_002','tree_005','tree_007','tree_008'];
export const SCENERY_MODELS=Object.freeze([...FIRS,...FRONT,'mountain_001','mountain_007','mountain_008','plant_008','grass_001','grass_004',...FARM_PIECES]);

// The same ring as the mountains (scene-polish.js): laid out in screen directions around the home view, sides and back only,
// so nothing stands between the camera and the farm.
const RING=1+(SPREAD-1)*.85,K=Math.SQRT1_2;
const ringPoint=(degrees,a,b)=>{const phi=degrees*Math.PI/180,sx=a*Math.cos(phi),sb=b*Math.sin(phi);return {x:1.4+(sx-sb)*K,z:1.5+(-sx-sb)*K,angle:Math.atan2(-((-a*Math.sin(phi))-(b*Math.cos(phi)))*K,((-a*Math.sin(phi))-(b*Math.cos(phi)))*K)};};

export function buildScenery({scene,models,mobile=false}){
 const rand=seeded(20260924),group=new THREE.Group();group.name='Scenery';scene.add(group);
 scene.updateMatrixWorld(true);
 // Where something may stand. Every visible mesh already on the farm counts with its own box (kept in a grid of 4 x 4 cells,
 // so the check stays quick); the few wide pieces of landscape (hills, mountains, the crop fields beyond the farm) would
 // cover half the valley with their boxes, so for those a ray looks whether the ground actually rises there. Flat decals,
 // the roads (checked by their shape) and the scenery groups themselves do not count.
 const CELL=4,grid=new Map(),terrain=[],box=new THREE.Box3(),size=new THREE.Vector3();
 const cells=(minX,maxX,minZ,maxZ,visit)=>{for(let cx=Math.floor(minX/CELL);cx<=Math.floor(maxX/CELL);cx++)for(let cz=Math.floor(minZ/CELL);cz<=Math.floor(maxZ/CELL);cz++)visit(`${cx},${cz}`);};
 for(const o of scene.children){
  // The mountain ring of scene-polish.js lives in its own group: its peaks are terrain too.
  if(o.userData.polish){for(const c of o.children)if(/^(mountain|landscape)_/.test(c.userData.model??''))c.traverse(n=>{if(n.isMesh)terrain.push(n);});continue;}
  if(o===group||o.isLight||o.isCamera||o.name==='Farm ground'||o.userData.model==='road_001')continue;
  o.traverseVisible(mesh=>{
   if(!mesh.isMesh)return;
   box.setFromObject(mesh);if(box.isEmpty())return;box.getSize(size);if(size.y<.03)return;
   if(size.x*size.z>120){terrain.push(mesh);return;}
   const b=box.clone();cells(b.min.x,b.max.x,b.min.z,b.max.z,key=>{if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);});
  });
 }
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),from=new THREE.Vector3();
 const groundAt=(x,z)=>{if(!terrain.length)return 0;ray.set(from.set(x,60,z),down);return ray.intersectObjects(terrain,false)[0]?.point.y??0;};
 const rises=(x,z)=>groundAt(x,z)>.12;
 const [pondX,pondZ]=placeIn('pond',0,0),pond=[10.4+pondX,10.4+pondZ,24.8+pondX,19.6+pondZ],fields=[-5.6,-3,10.4,33.6];
 const taken=[];
 const touches=(x,z,r)=>{let hit=false;cells(x-r,x+r,z-r,z+r,key=>{if(!hit)hit=(grid.get(key)??[]).some(b=>x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r);});return hit;};
 const free=(x,z,r=1)=>!(x>fields[0]-r&&x<fields[2]+r&&z>fields[1]-r&&z<fields[3]+r)&&!(x>pond[0]-r&&x<pond[2]+r&&z>pond[1]-r&&z<pond[3]+r)
  &&!onRoad(x-r,x+r,z-r,z+r)&&taken.every(([tx,tz,tr])=>Math.hypot(x-tx,z-tz)>=r+tr)&&!touches(x,z,r)&&!rises(x,z);
 // Trees may also stand on gentle hills, at the height of the ground there, but never against a mountain: the spot and four
 // around it must all be low, or the trunk would disappear into the slope.
 const gentle=(x,z)=>groundAt(x,z)<1.1&&[[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]].every(([dx,dz])=>groundAt(x+dx,z+dz)<1.3);
 const freeForTree=(x,z,r)=>!(x>fields[0]-r&&x<fields[2]+r&&z>fields[1]-r&&z<fields[3]+r)&&!(x>pond[0]-r&&x<pond[2]+r&&z>pond[1]-r&&z<pond[3]+r)
  &&!onRoad(x-r,x+r,z-r,z+r)&&taken.every(([tx,tz,tr])=>Math.hypot(x-tx,z-tz)>=r+tr)&&!touches(x,z,r)&&gentle(x,z);
 // One piece, scaled by height or width (like cloneModel), standing on the ground.
 function put(name,x,z,{height,width,depth,rotation=0,y=0,shadow=true}={}){
  const entry=models.get(name);if(!entry)return null;
  const o=entry.object.clone(true),d=entry.size,s=height!=null?height/d.y:width!=null?width/Math.max(d.x,d.z):1;
  if(width!=null&&depth!=null)o.scale.set(width/d.x,(height??d.y)/d.y,depth/d.z);else o.scale.setScalar(s);o.position.set(x,y,z);o.rotation.y=rotation;o.userData.scenery=name;
  o.traverse(n=>{if(n.isMesh){n.castShadow=shadow;n.receiveShadow=true;}});group.add(o);return o;
 }
 // Many copies of one model as instanced meshes: [x,z,height,rotation,y] each.
 function instanced(name,list,{shadow=true}={}){
  const entry=models.get(name);if(!entry||!list.length)return;
  entry.object.updateMatrixWorld(true);
  entry.object.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const im=new THREE.InstancedMesh(mesh.geometry,mesh.material,list.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
   list.forEach(([x,z,height,rotation,y=0],i)=>{const s=height/entry.size.y;m.compose(new THREE.Vector3(x,y-.05,z),q.setFromAxisAngle(up,rotation),new THREE.Vector3(s,s,s)).multiply(mesh.matrixWorld);im.setMatrixAt(i,m);});
   im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();im.castShadow=shadow;im.receiveShadow=true;group.add(im);
  });
 }
 const claim=(x,z,r)=>taken.push([x,z,r]);

 // 1. (Green hills stood here, between the firs and the mountain ring: big smooth lumps that poked through the rock. The firs and the
 // ring fill that edge on their own. The broad hill at the farm's own edge is farm-life.js's.) The extra mountains (2) are put
 // down first and join the terrain, so the firs after them stand on their slopes instead of inside them.
 // 2. More mountains: a second, taller row behind the ring at the sides and back. (Not at the front: lone peaks there stood
 // on the open plain like boulders.)
 // Rock only: mountain_009 is a green hill, and scaled up to a peak it looked like green jelly.
 const peaks=['mountain_001','mountain_007','mountain_008'].filter(n=>models.has(n));
 const hazy=o=>o?.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;n.material=n.material.clone();n.material.emissive=new THREE.Color(0xe2ead0);n.material.emissiveIntensity=.3;}});
 // The ground ends 100 from the middle: a mountain whose far side would hang over that edge is left out.
 const range=(from,to,every,a,b,height)=>{for(let deg=from;deg<=to;deg+=every){const p=ringPoint(deg+(rand()-.5)*8,(a+rand()*4)*RING,(b+rand()*4)*RING);if(Math.max(Math.abs(p.x),Math.abs(p.z))>74)continue;const peak=put(peaks[Math.floor(rand()*peaks.length)],p.x,p.z,{width:32+rand()*14,depth:13+rand()*6,height:height(),y:-.8,rotation:p.angle+(rand()-.5)*.5,shadow:false});hazy(peak);peak?.updateMatrixWorld(true);peak?.traverse(n=>{if(n.isMesh)terrain.push(n);});}};
 if(peaks.length)range(-4,192,mobile?28:17,57,53,()=>10+rand()*5);

 // 3. The forest belt: clusters of firs of different kinds and heights.
 const firs=Object.fromEntries(FIRS.map(n=>[n,[]]));
 const step=mobile?12:7;
 for(let a=-6;a<=192;a+=step){
  const centre=ringPoint(a+(rand()-.5)*4,(41+rand()*4)*RING,(38+rand()*4)*RING),count=mobile?2+Math.floor(rand()*2):3+Math.floor(rand()*3);
  for(let i=0;i<count;i++){
   const x=centre.x+(rand()-.5)*7,z=centre.z+(rand()-.5)*7;
   if(!freeForTree(x,z,1.1))continue;claim(x,z,1.1);
   firs[FIRS[Math.floor(rand()*FIRS.length)]].push([x,z,3.6+rand()*3.4,rand()*Math.PI*2,groundAt(x,z)]);
  }
 }
 for(const [name,list] of Object.entries(firs))instanced(name,list);
 // 4. Sunflower strips beside the roads: a row every so often, on the side where there is room.
 const flowers=[];
 for(const r of roadRects()){
  const length=r.horizontal?r.maxX-r.minX:r.maxZ-r.minZ;
  for(let d=6;d<length-6;d+=mobile?22:13){
   if(rand()<.35)continue;
   const side=rand()<.5?-1:1,row=5+Math.floor(rand()*4),offset=(r.horizontal?(r.maxZ-r.minZ):(r.maxX-r.minX))/2+1.3;
   for(let k=0;k<row;k++){
    const along=d+k*.75,x=r.horizontal?r.minX+along:(r.minX+r.maxX)/2+side*offset,z=r.horizontal?(r.minZ+r.maxZ)/2+side*offset:r.minZ+along;
    if(!free(x,z,.35))continue;claim(x,z,.35);flowers.push([x,z,1.05+rand()*.4,rand()*Math.PI*2]);
   }
  }
 }

 // 5. Grass across the outer meadows, where the farm's own tufts (scene-polish.js) stop: from the farm's edge out to the haze.
 const tufts={grass_001:[],grass_004:[]};
 for(let i=0,made=0,want=mobile?320:900;i<want*6&&made<want;i++){
  // All the way round and out to where the haze takes over: flat, so it hides nothing.
  const t=Math.sqrt(rand()),deg=rand()*360,p=ringPoint(deg,(22+t*46)*RING,(20+t*44)*RING);
  // Not beyond the mountain ring (its peaks stand from -8 to 196 degrees, from about 42 out): a tuft there seemed to float above the peaks.
  if(22+t*46>40&&(deg<205||deg>345))continue;
  if(!free(p.x,p.z,.3))continue;made++;
  (rand()<.7?tufts.grass_001:tufts.grass_004).push([p.x,p.z,.28+rand()*.3,rand()*Math.PI*2]);
 }
 for(const [name,list] of Object.entries(tufts))instanced(name,list,{shadow:false});

 // 6. The front meadows, towards the camera: only low things there (bushes, young trees, clumps of sunflowers), so
 // nothing hides the farm behind them. No hay out here: a bale belongs where a tractor can bring it, by the yards and the roads.
 const front=Object.fromEntries(FRONT.map(n=>[n,[]]));
 for(let i=0,made=0,want=mobile?34:80;i<want*8&&made<want;i++){
  const p=ringPoint(200+rand()*150,(21+rand()*24)*RING,(19+rand()*23)*RING),kind=rand();
  if(kind<.12){   // a clump of sunflowers
   if(!free(p.x,p.z,1.2))continue;claim(p.x,p.z,1.2);made++;
   for(let k=0;k<6;k++){const a=k/6*Math.PI*2+rand(),d=.35+rand()*.6;flowers.push([p.x+Math.cos(a)*d,p.z+Math.sin(a)*d,.95+rand()*.45,rand()*Math.PI*2]);}
   continue;
  }
  const [name,height,r]=kind<.7?[FRONT[Math.floor(rand()*4)],.7+rand()*.9,.9]:[FRONT[4+Math.floor(rand()*4)],2.2+rand()*1.4,1.2];
  if(!free(p.x,p.z,r))continue;claim(p.x,p.z,r);made++;front[name].push([p.x,p.z,height,rand()*Math.PI*2]);
 }
 for(const [name,list] of Object.entries(front))instanced(name,list,{shadow:!name.startsWith('hay')});
 instanced('plant_008',flowers,{shadow:false});

 // 7. On the farm. Each piece looks for the nearest free spot, starting where it belongs and working outwards.
 const near=(id,dx,dz)=>{const [x,z]=anchorAt(id);return [x+dx,z+dz];};
 const nearestFree=([x,z],r,max=8)=>{
  for(let d=0;d<=max;d+=.8){const n=d?Math.max(6,Math.round(2*Math.PI*d/.8)):1;for(let i=0;i<n;i++){const a=i/n*Math.PI*2,px=x+Math.cos(a)*d,pz=z+Math.sin(a)*d;if(free(px,pz,r))return [px,pz];}}
  return null;
 };
 // [model, where it belongs, how far it may look, room it needs, size and turn]
 for(const [name,from,max,r,options] of [
  ['chicken_002',near('coop',-2,-2.4),5,.5,{height:.42,rotation:.6}],
  ['chicken_002',near('coop',-1,-3.4),5,.5,{height:.38,rotation:2.2}],
  ['chicken_003',near('coop',3,-1.6),5,.6,{height:.85,rotation:-.9}],
  ['cow_003',near('paddock',0,2),6,1,{height:1.25,rotation:2.4}],
  ['toilet_001',near('farmhouse',-6,-4),7,.9,{height:2.1,rotation:.4}],
  ['firewood_005',near('farmhouse',-4,-5.5),7,.8,{width:1.5,rotation:1.1}],
  ['cart_003',near('farmhouse',4,4),7,.8,{width:1.3,rotation:2.3}],
  ['lawn_mower_001',near('farmhouse',2,5.5),7,.7,{height:.8,rotation:-.6}],
  ['car_005',near('farmhouse',6.5,-2.5),9,1.8,{width:3.4,rotation:.9}],
  ['dray_001',near('dairy',-5,-3.5),13,1.3,{width:2.6,rotation:-.5}],
  ['cart_006',near('greenhouse',-3.5,3),7,.8,{width:1.2,rotation:.8}],
  ['trailer_002',[12.8,9],7,1.7,{width:3,rotation:Math.PI/2}]
 ]){const spot=nearestFree(from,r,max);if(spot){claim(...spot,r);put(name,...spot,options);}}
 return group;
}
