// The village lake's water lilies and cattails (3 Nov 2026, the owner, from the ithappy Studios Vegetation pack, as on the farm's pond in
// scenery.js). Only to look at, added once the village is on screen (game.js addVillageExtras). The lake is the pack's one water plane
// under the whole village, so a spot is water where a ray from above meets the water first: the lilies float in the band along the
// shore (the open middle stays free for the boats), the cattails stand on the bank just above the water. Spots are fixed (a seeded
// generator over a fixed grid), so the lake looks the same on every visit; none near the fishing boat, its float or the harbour boat,
// and none under a pier or the Stone quay (they are met first). Two instanced meshes, about 2,000 triangles on a computer.
import * as THREE from 'three';
import {seeded} from './farm-props.js';
import {VILLAGE_FISHING_SPOT,VILLAGE_HARBOUR_BOAT} from './village-scene.js';

export const LAKE_PLANTS=Object.freeze(['veg_water_lily_001','veg_reed_002']);
const KEEP_CLEAR=[[VILLAGE_FISHING_SPOT.x,VILLAGE_FISHING_SPOT.z,3],[VILLAGE_FISHING_SPOT.float.x,VILLAGE_FISHING_SPOT.float.z,3],[VILLAGE_HARBOUR_BOAT.x,VILLAGE_HARBOUR_BOAT.z,4]];

// village: the village's group; also: what else stands on the water (the extras: the Stone quay, the boats); models: game.js's models
// (the two above loaded). Returns the group with the plants, or null.
export function lakePlants({village,also=[],models,mobile=false}){
 const water=[];village.traverse(o=>{if(o.isMesh&&o.material?.name==='Transparent'&&/^water/.test(o.name))water.push(o);});
 const lily=models.get(LAKE_PLANTS[0]),reed=models.get(LAKE_PLANTS[1]);
 if(!water.length||!lily||!reed)return null;
 const targets=[village,...also].filter(Boolean);for(const t of targets)t.updateMatrixWorld(true);
 const box=new THREE.Box3();for(const w of water)box.expandByObject(w);
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),from=new THREE.Vector3();
 const hitAt=(x,z)=>{ray.set(from.set(x,box.max.y+40,z),down);return ray.intersectObjects(targets,true).find(h=>h.object.visible&&h.object.material?.visible!==false)??null;};
 const wet=hit=>hit&&water.includes(hit.object);
 const clearOf=(x,z)=>KEEP_CLEAR.every(([cx,cz,r])=>Math.hypot(x-cx,z-cz)>r);
 // Every 1.5 across the water's plane: water or not, and how high.
 const STEP=1.5,grid=new Map(),key=(i,j)=>`${i},${j}`;
 for(let i=Math.ceil(box.min.x/STEP);i*STEP<box.max.x;i++)for(let j=Math.ceil(box.min.z/STEP);j*STEP<box.max.z;j++){const h=hitAt(i*STEP,j*STEP);grid.set(key(i,j),h?{wet:wet(h),y:h.point.y}:null);}
 const near=(i,j,test)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>test(grid.get(key(i+a,j+b))));
 const shore=[],bank=[];
 for(const [k,cell] of grid){
  if(!cell)continue;const [i,j]=k.split(',').map(Number),x=i*STEP,z=j*STEP;if(!clearOf(x,z))continue;
  // Water with land beside it (lilies), or land just above the water with water beside it (cattails).
  if(cell.wet&&near(i,j,c=>c&&!c.wet))shore.push([x,z,cell.y]);
  else if(!cell.wet&&cell.y<box.max.y+.5&&near(i,j,c=>c?.wet))bank.push([x,z,cell.y]);
 }
 const rand=seeded(20261104),pick=(list,n)=>{const out=[];const pool=[...list];while(out.length<n&&pool.length)out.push(...pool.splice(Math.floor(rand()*pool.length),1));return out;};
 const flat=lily.size.y/Math.max(lily.size.x,lily.size.z),pads=[],stems=[];
 for(const [x,z,y] of pick(shore,mobile?12:22))for(let n=0,count=2+Math.floor(rand()*3);n<count;n++){
  const px=x+(rand()-.5)*1.4,pz=z+(rand()-.5)*1.4,h=hitAt(px,pz);if(!wet(h))continue;pads.push([px,pz,(.5+rand()*.3)*flat,rand()*Math.PI*2,h.point.y+.015]);
 }
 for(const [x,z] of pick(bank,mobile?8:14))for(let n=0;n<3;n++){
  const px=x+(rand()-.5)*.8,pz=z+(rand()-.5)*.8,h=hitAt(px,pz);if(!h||wet(h))continue;stems.push([px,pz,1.1+rand()*.4,rand()*Math.PI*2,h.point.y]);
 }
 const group=new THREE.Group();group.name='lake-plants';
 for(const [entry,list,shadow,name] of [[lily,pads,false,LAKE_PLANTS[0]],[reed,stems,true,LAKE_PLANTS[1]]]){
  if(!list.length)continue;entry.object.updateMatrixWorld(true);
  entry.object.traverse(mesh=>{
   if(!mesh.isMesh)return;
   const im=new THREE.InstancedMesh(mesh.geometry,mesh.material,list.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
   list.forEach(([x,z,height,turn,y],i)=>{const s=height/entry.size.y;m.compose(new THREE.Vector3(x,y,z),q.setFromAxisAngle(up,turn),new THREE.Vector3(s,s,s)).multiply(mesh.matrixWorld);im.setMatrixAt(i,m);});
   im.instanceMatrix.needsUpdate=true;im.computeBoundingSphere();im.castShadow=shadow;im.receiveShadow=true;im.userData.scenery=name;group.add(im);
  });
 }
 return group;
}
