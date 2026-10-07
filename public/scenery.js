// Scenery that makes the valley feel lived in. It is added after the farm is on screen (game.js addScenery), so the first
// load is not slower, and everything in it stands still. Around the valley: a belt of firs with soft green hills behind, between the farm's trees and the mountains. Beside the roads: strips of sunflowers. On the farm:
// chicks and a rooster at the coop, a spotted cow, and the odd tool around the farmhouse and the fields. Grass tufts
// across the outer meadows, which were bare ground, and at the front (towards the camera) only low things: bushes, young
// trees and clumps of sunflowers. Round bushes, wildflowers and sunflowers along the crops' fences, the roads and the yards and on
// the pond's bank, mostly in the home view, and a few round bales by the farmyards (6 Oct 2026), for the abundance of the loading
// screen's painted valley. Spots are fixed (a seeded generator), so the farm looks the same on every visit, and a piece only goes
// where nothing else stands: not on a building, fence, road, field (all 40 of them) or the pond. Repeated pieces (trees, sunflowers) are
// drawn as one instanced mesh per model, so a hundred of them cost a handful of draw calls.
import * as THREE from 'three';
import {seeded,YARD_THEME} from './farm-props.js';
import {SPREAD,ANCHORS,POND,YARD_EXTENT,FIELD_BLOCK,roadRects,onRoad,anchorAt,placeIn,pondBounds,outsideFields,outsideYardExtents} from './farm-layout.js';
import {wildflowers} from './scene-polish.js';

const FIRS=['fir_tree_001','fir_tree_003','fir_tree_004','fir_tree_006','fir_tree_007','fir_tree_010'];
const FARM_PIECES=['chicken_002','chicken_003','cow_003','toilet_001','firewood_005','cart_003','cart_006','lawn_mower_001','car_005','dray_001'];
const FRONT=['bush_001','bush_002','bush_003','bush_004','tree_002','tree_005','tree_007','tree_008'];
export const SCENERY_MODELS=Object.freeze([...FIRS,...FRONT,'mountain_001','mountain_007','mountain_008','plant_008','grass_001','grass_004','hay_001',...FARM_PIECES]);

// The same ring as the mountains (scene-polish.js): laid out in screen directions around the home view, sides and back only,
// so nothing stands between the camera and the farm.
const RING=1+(SPREAD-1)*.85,K=Math.SQRT1_2;
const ringPoint=(degrees,a,b)=>{const phi=degrees*Math.PI/180,sx=a*Math.cos(phi),sb=b*Math.sin(phi);return {x:1.4+(sx-sb)*K,z:1.5+(-sx-sb)*K,angle:Math.atan2(-((-a*Math.sin(phi))-(b*Math.cos(phi)))*K,((-a*Math.sin(phi))-(b*Math.cos(phi)))*K)};};

export function buildScenery({scene,models,mobile=false}){
 const rand=seeded(20260924),group=new THREE.Group();group.name='Scenery';scene.add(group);
 // The trees and bushes sway in the wind (scene-polish.js): they are measured upright, or a spot beside one would be free at one
 // moment and taken the next, and the scenery would differ between visits (6 Oct 2026).
 const swaying=scene.children.filter(o=>/^(fir_tree|tree|bush)_/.test(o.userData.model??'')).map(o=>[o,o.rotation.x,o.rotation.z]);
 for(const [o] of swaying){o.rotation.x=0;o.rotation.z=0;}
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
   // Big shapes are ground to stand on, except a field: nothing grows on a field.
   if(size.x*size.z>120&&!/^field_/.test(o.userData.model??'')){terrain.push(mesh);return;}
   const b=box.clone();cells(b.min.x,b.max.x,b.min.z,b.max.z,key=>{if(!grid.has(key))grid.set(key,[]);grid.get(key).push(b);});
  });
 }
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),from=new THREE.Vector3();
 const groundAt=(x,z)=>{if(!terrain.length)return 0;ray.set(from.set(x,60,z),down);return ray.intersectObjects(terrain,false)[0]?.point.y??0;};
 const rises=(x,z)=>groundAt(x,z)>.12;
 const pond=pondBounds(),fields=[-5.6,-3,10.4,33.6];
 // The spots already taken, by the 4 x 4 cell of their middle (6 Oct 2026: a look round the nine cells near a spot instead of along
 // all of them, as there are two thousand by the end). Every piece needs less than 2 round it, so a neighbour is never further off.
 const taken=new Map(),roomy=(x,z,r)=>{const cx=Math.floor(x/CELL),cz=Math.floor(z/CELL);for(let i=cx-1;i<=cx+1;i++)for(let j=cz-1;j<=cz+1;j++)for(const [tx,tz,tr] of taken.get(`${i},${j}`)??[])if(Math.hypot(x-tx,z-tz)<r+tr)return false;return true;};
 const touches=(x,z,r)=>{let hit=false;cells(x-r,x+r,z-r,z+r,key=>{if(!hit)hit=(grid.get(key)??[]).some(b=>x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r);});return hit;};
 const free=(x,z,r=1)=>!(x>fields[0]-r&&x<fields[2]+r&&z>fields[1]-r&&z<fields[3]+r)&&!(x>pond[0]-r&&x<pond[2]+r&&z>pond[1]-r&&z<pond[3]+r)
  &&!onRoad(x-r,x+r,z-r,z+r)&&roomy(x,z,r)&&!touches(x,z,r)&&!rises(x,z);
 // Trees may also stand on gentle hills, at the height of the ground there, but never against a mountain: the spot and four
 // around it must all be low, or the trunk would disappear into the slope.
 const gentle=(x,z)=>groundAt(x,z)<1.1&&[[1.6,0],[-1.6,0],[0,1.6],[0,-1.6]].every(([dx,dz])=>groundAt(x+dx,z+dz)<1.3);
 const freeForTree=(x,z,r)=>!(x>fields[0]-r&&x<fields[2]+r&&z>fields[1]-r&&z<fields[3]+r)&&!(x>pond[0]-r&&x<pond[2]+r&&z>pond[1]-r&&z<pond[3]+r)
  &&!onRoad(x-r,x+r,z-r,z+r)&&roomy(x,z,r)&&!touches(x,z,r)&&gentle(x,z);
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
 const claim=(x,z,r)=>{const key=`${Math.floor(x/CELL)},${Math.floor(z/CELL)}`;if(!taken.has(key))taken.set(key,[]);taken.get(key).push([x,z,r]);};
 // Where the pieces of 8 (more life, 6 Oct 2026) may stand. They only reckon with what always stands, the farm's models, also those
 // hidden until a later level, and not with what moves or comes and goes (bees, smoke, a flag), so every piece stands in the same
 // spot at every level and on every visit. A spot keeps off the crops (low things may stand a step from their fence), the pond, the
 // roads, the yards (the packed earth of scene-polish.js, also the patch under each animal of a building, the pastures' grazing
 // patches, and the pens), the animals, every piece placed before, and the ground behind a building, helper or station that shows
 // where its name floats on screen (the camera looks from +x,+z and 38 degrees up, so a point h above the ground shows where the
 // ground 1.27 h further back does).
 const ANIMAL=/^(cow|horse|pig|sheep|goat|chicken)_/,yards=[],named=[],animals=[],fences=[],fixed=new Map();
 for(const o of scene.children){
  const model=o.userData.model??'';if(!model||model==='road_001')continue;
  o.traverse(mesh=>{
   if(!mesh.isMesh)return;box.setFromObject(mesh);if(box.isEmpty())return;box.getSize(size);
   if(size.y<.03||size.x*size.z>120&&!/^field_/.test(model))return;
   const b=box.clone();cells(b.min.x,b.max.x,b.min.z,b.max.z,key=>{if(!fixed.has(key))fixed.set(key,[]);fixed.get(key).push(b);});
  });
  if(/^(fence|stone_fence)_/.test(model))fences.push(new THREE.Box3().setFromObject(o));
  if(!(o.userData.building||o.userData.utility||o.userData.activity))continue;
  const b=new THREE.Box3().setFromObject(o),c=b.getCenter(new THREE.Vector3());b.getSize(size);
  // The packed-earth yard of scene-polish.js: the building (or the animal) and 1.1 round it, 4.6 to 10 across.
  const w=THREE.MathUtils.clamp(size.x+2.2,4.6,10)/2,d=THREE.MathUtils.clamp(size.z+2.2,4.6,10)/2,yard=[c.x-w,c.x+w,c.z-d,c.z+d];
  // An animal's patch is kept clear but gets no ring of its own (id null).
  if(ANIMAL.test(model)){animals.push([o.position.x,o.position.z]);if(o.userData.building)yards.push([...yard,null,false]);continue;}
  named.push([o.position.x,o.position.z,b.max.y]);yards.push([...yard,o.userData.building??o.userData.utility??o.userData.activity,!!o.userData.building]);
 }
 const stands=(x,z,r)=>{let hit=false;cells(x-r,x+r,z-r,z+r,key=>{if(!hit)hit=(fixed.get(key)??[]).some(b=>x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r);});return hit;};
 const underName=(x,z)=>named.some(([bx,bz,h])=>{const across=Math.abs((x-bx)-(z-bz))*K,back=-((x-bx)+(z-bz))*K,name=(h+.45)*1.27;return across<4.2&&back>name-1.8&&back<name+4.2;});
 const [pondX,pondZ]=placeIn('pond',POND.x,POND.z),offWater=(x,z,r,bank)=>((x-pondX)/(POND.rx+bank+r))**2+((z-pondZ)/(POND.rz+bank+r))**2>1;
 // bank: how far from the water a piece on the shore keeps (reeds stand on the sand, the rest beyond it); elsewhere the pond's box counts.
 const fits=(x,z,r,bank=null)=>outsideFields(x,z,r+.35)&&(bank==null?!(x>pond[0]-r&&x<pond[2]+r&&z>pond[1]-r&&z<pond[3]+r):offWater(x,z,r,bank))
  &&!onRoad(x-r,x+r,z-r,z+r)&&outsideYardExtents(x,z,r)&&yards.every(([a,b,c,d])=>x<a-r||x>b+r||z<c-r||z>d+r)&&animals.every(([ax,az])=>Math.hypot(x-ax,z-az)>1.8+r)
  &&!underName(x,z)&&roomy(x,z,r)&&!stands(x,z,r)&&!rises(x,z);
 // Three round bales by the farmyards nearest the middle, as by the barn of the painted valley: two together by the nearest, one by
 // the next. They come before everything else and with their own generator, so they stand in the same spots on a phone and a
 // computer, and never by a fence or the crops.
 const bales=[];{
  const hay=seeded(20261006),[hx,hz]=[1.4,1.5];
  const farmyards=yards.filter(([,,,,id,building])=>building&&YARD_THEME[id]==='farm').sort((p,q)=>Math.hypot((p[0]+p[1])/2-hx,(p[2]+p[3])/2-hz)-Math.hypot((q[0]+q[1])/2-hx,(q[2]+q[3])/2-hz));
  const clear=(x,z)=>fits(x,z,.8)&&outsideFields(x,z,3)&&fences.every(f=>x<f.min.x-2.2||x>f.max.x+2.2||z<f.min.z-2.2||z>f.max.z+2.2);
  for(const [a0,b0,c0,d0,id] of farmyards.slice(0,2)){
   const [ax,az]=YARD_EXTENT[id]?anchorAt(id):[0,0],[a,b,c,d]=YARD_EXTENT[id]?[ax+YARD_EXTENT[id][0],ax+YARD_EXTENT[id][1],az+YARD_EXTENT[id][2],az+YARD_EXTENT[id][3]]:[a0,b0,c0,d0];
   for(let i=0,want=bales.length?1:2;i<60&&want;i++){
    const gap=1+hay()*2,side=Math.floor(hay()*4),t=hay(),x=side<2?(side?b+gap:a-gap):a+(b-a)*t,z=side<2?c+(d-c)*t:(side===2?d+gap:c-gap);
    if(!clear(x,z))continue;
    // The second of a pair lies against the first, on whichever side has room.
    const turn=hay()*Math.PI*2,pair=want===2?[0,1,2,3,4,5].map(k=>[x+Math.cos(turn+k*Math.PI/3)*1.25,z+Math.sin(turn+k*Math.PI/3)*1.25]).find(p=>clear(...p)):null;
    if(want===2&&!pair)continue;
    for(const [px,pz] of pair?[[x,z],pair]:[[x,z]]){claim(px,pz,.8);bales.push([px,pz,1+hay()*.12,hay()*Math.PI*2]);}want=0;
   }
  }
 }

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

 // 3. The forest edge at the foot of the mountains: stands of firs close together, tall ones at the back and young ones in front, so
 // every mountain gets a green hem (where the green hills were until 25 Sep 2026). Two rows: the stands against the rock, and a
 // looser row of young firs a little further in.
 const firs=Object.fromEntries(FIRS.map(n=>[n,[]]));
 const fir=(x,z,r,height)=>{if(!freeForTree(x,z,r))return;claim(x,z,r);firs[FIRS[Math.floor(rand()*FIRS.length)]].push([x,z,height,rand()*Math.PI*2,groundAt(x,z)]);};
 const step=mobile?11:6;
 for(let a=-6;a<=192;a+=step){
  const deg=a+(rand()-.5)*4,centre=ringPoint(deg,(42+rand()*3)*RING,(39+rand()*3)*RING),count=mobile?3+Math.floor(rand()*2):5+Math.floor(rand()*4);
  for(let i=0;i<count;i++)fir(centre.x+(rand()-.5)*6,centre.z+(rand()-.5)*6,1,4.4+rand()*3);
  const front=ringPoint(deg+(rand()-.5)*4,(37+rand()*2)*RING,(34+rand()*2)*RING);
  for(let i=0,n=mobile?1:2+Math.floor(rand()*2);i<n;i++)fir(front.x+(rand()-.5)*5,front.z+(rand()-.5)*5,.8,2.4+rand()*1.6);
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
 // (Drawn at the end, with the reeds of 8.)

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
 // (Drawn at the end, with the bushes and sunflowers of 8.)

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
  ['cart_006',near('greenhouse',-3.5,3),7,.8,{width:1.2,rotation:.8}]
 ]){const spot=nearestFree(from,r,max);if(spot){claim(...spot,r);put(name,...spot,options);}}

 // 8. More life (6 Oct 2026), for the abundance of the loading screen's painted valley: round bushes (alone, two or three together
 // or in a row), white and yellow wildflowers and clumps of sunflowers beside every segment of the crops' fences, along the road
 // verges, round the yards and on the pond's bank, and wildflowers and bushes in the open grass, on the spots fits() allows (above;
 // the bales came first). Most of it goes where players look, the home view: round the farm's middle a computer shows about 30
 // across and 30 up and down the screen, a phone a strip 16 across, more of it up the screen than down, where its buttons cover the
 // farm (the camera looks from +x,+z: across the screen runs along x-z, up it along -(x+z)); beyond that only now and then. Mostly
 // green (the valley must not turn yellow) and all of it low (a bush at most 1.2 tall), so it hides no field, building or animal.
 // Everything joins the instanced meshes of 4-6; the wildflowers add one draw call. A phone gets about two thirds as many in its
 // narrower view, and only the light bush (bush_001: 292 triangles, the others about 2,000).
 const inView=(x,z)=>{const dx=x-1.4,dz=z-1.5,across=Math.abs(dx-dz)*K,up=-(dx+dz)*K;return mobile?across<16&&up>-30&&up<44:across<30&&Math.abs(up)<30;};
 const blooms=[],WHITE=[0xfffdf4,0xffffff,0xfff6e2],YELLOW=[0xffd84a,0xffcf3a];
 // A bush's crown is 1.6 times as wide as the bush is tall (bush_001; the big ones about the same at the size they get here), so a
 // bush of 0.8 to 1.2 needs 0.64 to 0.96 round it. Where a full one does not fit (between the west fence and the road) a smaller one
 // stands, 0.72 to 0.9 tall.
 const ROOM={bush:.62,bushes:1.4,flowers:.55,sunflowers:.8,reeds:.45};
 // What it all may cost to draw, so a phone stays within a tenth more triangles than before 8 and a computer within a seventh: a
 // phone spends at most 21,000 on it, a computer 56,000 (a wildflower has 21, a model as many as its meshes). Once that is spent,
 // nothing more is planted: the crops' fences come first, then the verges, the pond, the yards and the open grass.
 const TRIS=new Map(),tris=name=>{if(!TRIS.has(name)){let t=0;models.get(name)?.object.traverse(m=>{if(m.isMesh)t+=(m.geometry.index?m.geometry.index.count:m.geometry.attributes.position.count)/3;});TRIS.set(name,t);}return TRIS.get(name);};
 let spent=0;const budget=mobile?21000:56000;
 const tall=small=>small?.72+rand()*.18:.8+rand()*.4;
 const bush=(x,z,height)=>{const big=!mobile&&rand()<.02,name=big?FRONT[1+Math.floor(rand()*3)]:'bush_001';front[name].push([x,z,big?height*.85:height,rand()*Math.PI*2]);spent+=tris(name);};
 const grow={
  bushes:(x,z)=>{const n=mobile?2:2+Math.floor(rand()*2),turn=rand()*Math.PI*2;for(let k=0;k<n;k++){const a=turn+k/n*Math.PI*2;bush(x+Math.cos(a)*.55,z+Math.sin(a)*.55,.8+rand()*.3);}},
  flowers:(x,z)=>{const tone=rand()<.62?WHITE:YELLOW;for(let k=0,n=(mobile?5:6)+Math.floor(rand()*(mobile?5:6));k<n;k++){const a=rand()*Math.PI*2,d=Math.sqrt(rand())*.5;blooms.push([x+Math.cos(a)*d,z+Math.sin(a)*d,.9+rand()*.45,rand()*Math.PI*2,tone[Math.floor(rand()*tone.length)]]);spent+=21;}},
  sunflowers:(x,z)=>{for(let k=0,n=5+Math.floor(rand()*3);k<n;k++){const a=k/n*Math.PI*2+rand()*.8,d=.2+rand()*.4;flowers.push([x+Math.cos(a)*d,z+Math.sin(a)*d,.9+rand()*.35,rand()*Math.PI*2]);spent+=tris('plant_008');}},
  reeds:(x,z)=>{for(let k=0;k<3;k++){tufts.grass_001.push([x+(rand()-.5)*.5,z+(rand()-.5)*.5,.6+rand()*.35,rand()*Math.PI*2]);spent+=tris('grass_001');}}
 };
 const plant=(x,z,kind,bank,small=false)=>{
  if(spent>=budget)return false;
  if(kind==='bush'){const h=tall(small);if(!fits(x,z,h*.8,bank))return false;claim(x,z,h*.8);bush(x,z,h);return true;}
  const r=ROOM[kind];if(!fits(x,z,r,bank))return false;claim(x,z,r);grow[kind](x,z);return true;
 };
 // A row of two or three bushes along dx,dz, as beside a fence or a road; each bush needs its own room.
 const hedge=(x,z,dx,dz,small=false)=>{
  if(spent>=budget)return false;
  const n=mobile?2:2+Math.floor(rand()*2),row=Array.from({length:n},(_,k)=>[x+dx*(k-(n-1)/2)*.95,z+dz*(k-(n-1)/2)*.95,tall(small)]);
  if(!row.every(([px,pz,h])=>fits(px,pz,h*.8)))return false;for(const [px,pz,h] of row){claim(px,pz,h*.8);bush(px,pz,h);}return true;
 };
 // Beside a line (a fence, a road's edge, a yard's side) at x,z, out along ox,oz: the first of the kinds that finds room, as close to
 // the line as it fits, sliding a little along it, and bushes smaller if full ones find none (so a row that finds no room becomes
 // one bush, and a bush wildflowers).
 const beside=(x,z,ox,oz,kinds)=>kinds.some(kind=>[false,true].some(small=>(!small||kind==='bush'||kind==='hedge')&&[0,-.5,.5].some(s=>{
  for(let off=ROOM[kind==='hedge'?'bush':kind]+.4;off<2.6;off+=.3){const px=x+ox*off+oz*s,pz=z+oz*off+ox*s;if(kind==='hedge'?hedge(px,pz,oz,ox,small):plant(px,pz,kind,null,small))return true;}
  return false;
 })));
 // One of a few kinds, by their shares: [[kind,share],...].
 const pick=shares=>{let u=rand();for(const [kind,share] of shares)if((u-=share)<0)return kind;return shares.at(-1)[0];};
 const thin=mobile?.7:1;
 // Beside every segment of the crops' two fences, outside them: a row of bushes, a bush, wildflowers or a clump of sunflowers (between
 // the west fence and the road there is only room for a row or wildflowers), and now and then wildflowers by the next post. The
 // other fences in the home view get one now and then, on the side away from the nearest yard first (outside a pen), else the other.
 const crop=[],middles=Object.keys(ANCHORS).map(anchorAt);
 for(const o of scene.children){
  if(!/^(fence|stone_fence)_/.test(o.userData.model??''))continue;
  box.setFromObject(o);const long=box.max.x-box.min.x>box.max.z-box.min.z,x=(box.min.x+box.max.x)/2,z=(box.min.z+box.max.z)/2;
  if(!long&&z>FIELD_BLOCK.minZ&&z<FIELD_BLOCK.maxZ+2&&Math.min(Math.abs(x-FIELD_BLOCK.minX),Math.abs(x-FIELD_BLOCK.maxX))<.6){crop.push([x,z]);continue;}
  if(!inView(x,z)||rand()>.6*thin)continue;
  const [ax,az]=middles.reduce((best,m)=>Math.hypot(x-m[0],z-m[1])<Math.hypot(x-best[0],z-best[1])?m:best),out=(long?Math.sign(z-az):Math.sign(x-ax))||1;
  const kinds=[pick([['hedge',.3],['flowers',.35],['bushes',.15],['sunflowers',.2]]),'flowers'];
  for(const side of [out,-out])if(long?beside(x,z,0,side,kinds):beside(x,z,side,0,kinds))break;
 }
 for(const [x,z] of crop){
  const out=x<(FIELD_BLOCK.minX+FIELD_BLOCK.maxX)/2?-1:1,first=pick([['hedge',.4],['bush',.2],['flowers',.2],['sunflowers',.2]]);
  beside(x,z,out,0,first==='hedge'?['hedge','bush','flowers']:first==='flowers'?['flowers']:[first,'bush','flowers']);
  if(rand()<.5)beside(x,z+(rand()<.5?-1.1:1.1),out,0,['flowers']);
 }
 // Along the road verges, on both sides: rows of bushes, bushes and wildflowers, close together in the home view and on a computer
 // now and then beyond it, where the sunflower strips (4) leave room.
 for(const r of roadRects()){
  const length=r.horizontal?r.maxX-r.minX:r.maxZ-r.minZ,start=r.horizontal?r.minX:r.minZ;
  for(const side of [-1,1])for(let d=1+rand()*2;d<length-1;){
   const edge=r.horizontal?(side<0?r.minZ:r.maxZ):(side<0?r.minX:r.maxX),x=r.horizontal?start+d:edge,z=r.horizontal?edge:start+d,near=inView(x,z);
   d+=(near?2.8:9)/thin*(.75+rand()*.5);
   if(!near&&(mobile||rand()<.5))continue;
   const kinds=[pick([['flowers',.4],['hedge',.25],['bush',.2],['bushes',.15]]),'flowers'];
   if(r.horizontal)beside(x,z,0,side,kinds);else beside(x,z,side,0,kinds);
  }
 }
 // The pond's bank: reeds at the water, wildflowers and bushes beyond the sand.
 for(let deg=0;deg<360;deg+=13/thin){
  const a=(deg+(rand()-.5)*8)*Math.PI/180,kind=pick([['reeds',.4],['flowers',.35],['bushes',.25]]),k=kind==='reeds'?1.1:1.3+rand()*.25;
  plant(pondX+POND.rx*k*Math.cos(a),pondZ+POND.rz*k*Math.sin(a),kind,kind==='reeds'?0:.6);
 }
 // Round every yard in the home view, just off its packed earth (or outside its pen): a farmyard gets bushes and wildflowers, a house
 // wildflowers, sunflowers and bushes, the rest bushes and wildflowers. Beyond the home view a computer gives each yard one.
 for(const [a0,b0,c0,d0,id] of yards){
  if(!id)continue;
  const [ax,az]=YARD_EXTENT[id]?anchorAt(id):[0,0],[a,b,c,d]=YARD_EXTENT[id]?[ax+YARD_EXTENT[id][0],ax+YARD_EXTENT[id][1],az+YARD_EXTENT[id][2],az+YARD_EXTENT[id][3]]:[a0,b0,c0,d0];
  const theme=YARD_THEME[id]??'',shares=theme==='farm'?[['hedge',.3],['bushes',.25],['flowers',.45]]:theme==='home'?[['flowers',.4],['sunflowers',.25],['bushes',.2],['hedge',.15]]:[['flowers',.5],['bushes',.3],['hedge',.2]];
  for(let i=0,made=0,want=inView((a+b)/2,(c+d)/2)?Math.round(5*thin):mobile?0:1;i<want*4&&made<want;i++){
   const kind=pick(shares),side=Math.floor(rand()*4),t=rand(),x=side<2?(side?b:a):a+(b-a)*t,z=side<2?c+(d-c)*t:(side===2?d:c);
   if(side<2?beside(x,z,side?1:-1,0,[kind]):beside(x,z,0,side===2?1:-1,[kind]))made++;
  }
 }
 // And in the open grass of the home view: patches of wildflowers, like the white dots all over the painted meadow, and bushes; on a
 // computer every eighth try further out, for the overview.
 for(let i=0,made=0,want=mobile?26:84;i<want*12&&made<want;i++){
  const across=(rand()*2-1)*(mobile?16:30),back=mobile?rand()*74-30:(rand()*2-1)*30,p=!mobile&&i%8===7?ringPoint(rand()*360,(30+rand()*10)*RING,(28+rand()*10)*RING):{x:1.4+(across-back)*K,z:1.5+(-across-back)*K};
  if(plant(p.x,p.z,pick([['flowers',.7],['bush',.15],['bushes',.15]])))made++;
 }

 for(const [name,list] of Object.entries(tufts))instanced(name,list,{shadow:false});
 for(const [name,list] of Object.entries(front))instanced(name,list,{shadow:!name.startsWith('hay')});
 instanced('plant_008',flowers,{shadow:false});
 instanced('hay_001',bales);
 if(blooms.length)group.add(wildflowers(blooms));
 for(const [o,rx,rz] of swaying){o.rotation.x=rx;o.rotation.z=rz;}
 return group;
}
