import {SPREAD,placeIn} from './farm-layout.js';
import * as THREE from 'three';

// Purely decorative layer for the 3D farm. It never reads or writes game state,
// is never part of a hit test, and skips every animation when motion is reduced.
// Inspired by the supplied Farm demo scene: layered ground (grass, dirt yards,
// furrowed fields), scattered wildflowers and a little life in the air.

const mulberry=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
const smooth=t=>t*t*(3-2*t);
const clamp01=v=>Math.min(1,Math.max(0,v));

// Wrap-around value noise, so the ground texture tiles without visible seams.
function tileableNoise(size,cells,rand){
 const grid=Array.from({length:cells*cells},rand),out=new Float32Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fx=x/size*cells,fy=y/size*cells,x0=Math.floor(fx),y0=Math.floor(fy),tx=smooth(fx-x0),ty=smooth(fy-y0);
  const r0=(y0%cells)*cells,r1=((y0+1)%cells)*cells,c0=x0%cells,c1=(x0+1)%cells;
  const a=grid[r0+c0],b=grid[r0+c1],c=grid[r1+c0],d=grid[r1+c1];
  out[y*size+x]=a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;
 }
 return out;
}
function canvasTexture(canvas,{repeat,anisotropy=1,srgb=true}={}){
 const t=new THREE.CanvasTexture(canvas);
 if(srgb)t.colorSpace=THREE.SRGBColorSpace;
 if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);}
 t.anisotropy=anisotropy;return t;
}
function makeCanvas(w,h=w){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}

// Soft mottling in three scales plus a slight warm/green drift, so meadows read as
// different patches of grass instead of one flat colour. Values stay near white
// because the material colour multiplies them.
function groundTexture(size,rand,anisotropy,tile){
 const n1=tileableNoise(size,4,rand),n2=tileableNoise(size,9,rand),n3=tileableNoise(size,24,rand);
 const canvas=makeCanvas(size),ctx=canvas.getContext('2d'),img=ctx.createImageData(size,size);
 for(let i=0;i<size*size;i++){
  const v=.5*n1[i]+.3*n2[i]+.2*n3[i],shade=.9+.13*clamp01((v-.25)*2);
  img.data[i*4]=Math.min(255,shade*(1+(n2[i]-.5)*.07)*255);
  img.data[i*4+1]=Math.min(255,shade*255);
  img.data[i*4+2]=Math.min(255,shade*(1-(n1[i]-.5)*.14)*255);
  img.data[i*4+3]=255;
 }
 ctx.putImageData(img,0,0);
 return canvasTexture(canvas,{repeat:tile,anisotropy});
}

// Parallel furrows, as in the demo's striped fields. Transparent, so the soil keeps its colour.
function furrowTexture(anisotropy){
 const canvas=makeCanvas(128),ctx=canvas.getContext('2d');
 for(let row=0;row<8;row++){
  const y=row*16+8;
  const dark=ctx.createLinearGradient(0,y-6,0,y+6);dark.addColorStop(0,'rgba(88,54,26,0)');dark.addColorStop(.5,'rgba(88,54,26,.42)');dark.addColorStop(1,'rgba(88,54,26,0)');
  ctx.fillStyle=dark;ctx.fillRect(0,y-6,128,12);
  const ridge=ctx.createLinearGradient(0,y+5,0,y+13);ridge.addColorStop(0,'rgba(255,226,170,0)');ridge.addColorStop(.5,'rgba(255,226,170,.16)');ridge.addColorStop(1,'rgba(255,226,170,0)');
  ctx.fillStyle=ridge;ctx.fillRect(0,y+5,128,8);
 }
 return canvasTexture(canvas,{anisotropy});
}

// A packed-earth yard with a soft, slightly irregular edge; sits under every building.
function yardTexture(rand){
 const size=128,canvas=makeCanvas(size),ctx=canvas.getContext('2d'),img=ctx.createImageData(size,size),radius=.24;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const px=(x+.5)/size-.5,py=(y+.5)/size-.5,qx=Math.abs(px)-(.5-radius-.05),qy=Math.abs(py)-(.5-radius-.05);
  const dist=Math.hypot(Math.max(qx,0),Math.max(qy,0))+Math.min(Math.max(qx,qy),0)-radius;
  const alpha=clamp01(1-smooth(clamp01((dist+.02)/.07)))*.92,grain=(rand()-.5)*.10;
  img.data[(y*size+x)*4]=clamp01(.80+grain)*255;img.data[(y*size+x)*4+1]=clamp01(.66+grain)*255;img.data[(y*size+x)*4+2]=clamp01(.47+grain)*255;img.data[(y*size+x)*4+3]=alpha*255;
 }
 ctx.putImageData(img,0,0);return canvasTexture(canvas);
}
function softBlobTexture(){
 const canvas=makeCanvas(128),ctx=canvas.getContext('2d'),g=ctx.createRadialGradient(64,64,4,64,64,62);
 g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.55,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return canvasTexture(canvas,{srgb:false});
}

// Three crossed blades per tuft, darker at the root and lighter at the tip.
function tuftGeometry(){
 const pos=[],col=[],norm=[];
 for(let k=0;k<3;k++){
  const a=k*Math.PI/3,c=Math.cos(a),s=Math.sin(a),bend=.05+k*.02;
  for(const [x,y,shade] of [[-.055,0,.62],[.055,0,.62],[bend,.34+k*.05,1]]){pos.push(x*c,y,x*s);col.push(shade,shade,shade);norm.push(0,1,0);}
 }
 const g=new THREE.BufferGeometry();
 g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));
 return g;
}


// Small scenery that is meant to stand next to a building, never inside its walls.
const CLIPPABLE=/^(fence|stone_fence|bush|grass|barrel|bag|case|bucket|firewood|prop|hay)_/;
// Hides fences, bushes and props that stand inside a building. Bounding boxes are too
// generous (porches, sails), so the test is exact: rays are dropped from above at a few
// points of each object, and a point counts as "inside" only when real building geometry
// is above it. Placement is hand-tuned, so this keeps every present and future building clean.
function hideClippedScenery(scene){
 const buildings=scene.children.filter(o=>o.userData.building&&o.userData.model);
 if(!buildings.length)return 0;
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),origin=new THREE.Vector3(),size=new THREE.Vector3(),hidden=[];
 const covered=(x,z,y)=>{origin.set(x,80,z);ray.set(origin,down);return ray.intersectObjects(buildings,true).some(h=>h.point.y>y+.25);};
 for(const o of scene.children){
  const m=o.userData.model;if(!m||o.userData.building||o.userData.utility||o.userData.activity||!CLIPPABLE.test(m+'_')||!o.visible)continue;
  const box=new THREE.Box3().setFromObject(o),c=box.getCenter(new THREE.Vector3());box.getSize(size);
  const long=size.x>=size.z,points=size.x>1.2*size.z||size.z>1.2*size.x
   ?[-.35,0,.35].map(k=>[c.x+(long?k*size.x:0),c.z+(long?0:k*size.z)])
   :[[0,0],[.25,.25],[-.25,.25],[.25,-.25],[-.25,-.25]].map(([a,b])=>[c.x+a*size.x,c.z+b*size.z]);
  const inside=points.filter(([x,z])=>covered(x,z,box.min.y)).length;
  if(inside/points.length>=.5){o.visible=false;hidden.push(`${m}@${o.position.x.toFixed(1)},${o.position.z.toFixed(1)}`);}
 }
 if(hidden.length)console.debug('Scene polish hid scenery that clipped a building:',hidden.join(' '));
 return hidden.length;
}

// A ring of rocky peaks around the valley, like the crater in the supplied demo. The fixed
// isometric camera only sees a limited strip beyond the farm, so the ring is laid out in
// screen directions (right = +x/-z, back = -x/-z): the side walls show in the normal view
// and the back wall when the player zooms out. The front stays open so nothing hides the farm.
// The mountains stay behind the wider farm.
const RING=1+(SPREAD-1)*.85;
function mountainRing({cloneModel,group,rand,mobile}){
 const names=['mountain_001','mountain_007','mountain_001','mountain_008','mountain_007'],k=Math.SQRT1_2;
 const step=mobile?22:14;let i=0;
 for(let a=-8;a<=196;a+=step){
  const phi=(a+(rand()-.5)*7)*Math.PI/180,A=(50+rand()*5)*RING,B=(46+rand()*5)*RING;
  const sx=A*Math.cos(phi),sb=B*Math.sin(phi);
  // Screen axes to world: right = (1,0,-1)/sqrt2, back = (-1,0,-1)/sqrt2, around the home focus.
  const x=1.4+(sx-sb)*k,z=1.5+(-sx-sb)*k;
  // The wall runs along the ring's tangent.
  const tx=-A*Math.sin(phi),tb=B*Math.cos(phi),dx=(tx-tb)*k,dz=(-tx-tb)*k;
  const name=names[i++%names.length],w=30+rand()*10,d=12+rand()*5,h=(name==='mountain_008'?8:9.5)+rand()*4.5+Math.max(0,Math.sin(phi))*2.5;
  const o=cloneModel(name,x,z,{width:w,depth:d,height:h,y:-.8,rotation:Math.atan2(-dz,dx)+(rand()-.5)*.5});
  // Distant rock fades toward the sky colour, like the rest of the valley's haze.
  o.traverse(n=>{if(n.isMesh){n.castShadow=false;n.receiveShadow=true;n.material=n.material.clone();n.material.emissive=new THREE.Color(0xe2ead0);n.material.emissiveIntensity=.24;}});
  group.add(o);
 }
}

export function createScenePolish({scene,cloneModel,getPlots,reducedMotion=false,mobile=false,anisotropy=4}){
 const rand=mulberry(20260919),group=new THREE.Group();group.name='Scene polish';group.userData.polish=true;scene.add(group);
 scene.updateMatrixWorld(true);

 // 1. Ground: mottled grass, tiled every 22 world units (the ground is 600 wide, game.js).
 const ground=scene.getObjectByName('Farm ground');
 if(ground?.material){
  ground.material.map=groundTexture(mobile?256:512,rand,Math.min(anisotropy,4),600/22);   // the same 22-unit tile on the wider ground
  ground.material.color.multiplyScalar(1.07);ground.material.needsUpdate=true;
 }

 hideClippedScenery(scene);

 // 2. Where plants may grow: everything that is not a flat decal, road-sized clearing or the pond.
 const blocked=[];
 for(const o of scene.children){
  if(o===group||o===ground||o.isLight||o.isCamera)continue;
  const box=new THREE.Box3().setFromObject(o);if(box.isEmpty())continue;
  if(box.getSize(new THREE.Vector3()).y<.03)continue;
  blocked.push(box.expandByVector(new THREE.Vector3(.45,0,.45)));
 }
 const [pondX,pondZ]=placeIn('pond',0,0),fieldRect=[-4.6,-2,9.4,32],pondRect=[10.4+pondX,10.4+pondZ,24.8+pondX,19.6+pondZ];
 const free=(x,z)=>!blocked.some(b=>x>b.min.x&&x<b.max.x&&z>b.min.z&&z<b.max.z)
  &&!(x>fieldRect[0]&&x<fieldRect[2]&&z>fieldRect[1]&&z<fieldRect[3])
  &&!(x>pondRect[0]&&x<pondRect[2]&&z>pondRect[1]&&z<pondRect[3]);

 // 3. Dirt yards under buildings (the demo grounds every building on packed earth).
 const yardTex=yardTexture(rand),yardMaterial=new THREE.MeshLambertMaterial({map:yardTex,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
 for(const o of scene.children){
  if(!o.userData.building)continue;
  const box=new THREE.Box3().setFromObject(o),size=box.getSize(new THREE.Vector3()),c=box.getCenter(new THREE.Vector3());
  const w=THREE.MathUtils.clamp(size.x+2.2,4.6,10),d=THREE.MathUtils.clamp(size.z+2.2,4.6,10);
  const yard=new THREE.Mesh(new THREE.PlaneGeometry(w,d),yardMaterial);yard.rotation.x=-Math.PI/2;yard.position.set(c.x,.011,c.z);yard.receiveShadow=true;yard.renderOrder=-1;group.add(yard);
 }

 // 4. Furrowed soil on every field. Fields can be added later, so this is re-synced while running.
 const furrowMaterial=new THREE.MeshLambertMaterial({map:furrowTexture(anisotropy),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3});
 const furrowGeometry=new THREE.PlaneGeometry(2.3,2.3),furrows=[];
 function syncFurrows(){
  const plots=getPlots();
  while(furrows.length>plots.length){const m=furrows.pop();group.remove(m);}
  for(let i=furrows.length;i<plots.length;i++){
   const m=new THREE.Mesh(furrowGeometry,furrowMaterial);m.rotation.x=-Math.PI/2;m.position.set(plots[i].x,.226,plots[i].z);m.receiveShadow=true;m.renderOrder=1;group.add(m);furrows.push(m);
  }
 }
 syncFurrows();

 // 5. Grass tufts and wildflowers, clustered rather than sprinkled evenly.
 const meadow=[];
 const tuftCount=Math.round((mobile?640:1500)*SPREAD*SPREAD),tuftMaterial=new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide});
 const tufts=new THREE.InstancedMesh(tuftGeometry(),tuftMaterial,tuftCount),dummy=new THREE.Object3D(),tint=new THREE.Color();
 const greens=[0x8fae4a,0x9db752,0x7ea043,0xb2b95a,0xa6a94a,0xc0b45c];
 let placed=0,guard=0;
 while(placed<tuftCount&&guard++<tuftCount*30){
  const cx=(rand()-.5)*84*SPREAD,cz=(rand()-.5)*78*SPREAD,n=3+Math.floor(rand()*5);
  for(let k=0;k<n&&placed<tuftCount;k++){
   const x=cx+(rand()-.5)*2.6,z=cz+(rand()-.5)*2.6;if(!free(x,z))continue;
   const s=.7+rand()*.9;dummy.position.set(x,0,z);dummy.rotation.set(0,rand()*Math.PI,0);dummy.scale.set(s,s*(.8+rand()*.5),s);dummy.updateMatrix();
   tufts.setMatrixAt(placed,dummy.matrix);tufts.setColorAt(placed,tint.setHex(greens[Math.floor(rand()*greens.length)]));placed++;
   if(rand()<.06)meadow.push([x,z]);
  }
 }
 tufts.frustumCulled=false;tufts.count=placed;tufts.instanceMatrix.needsUpdate=true;if(tufts.instanceColor)tufts.instanceColor.needsUpdate=true;group.add(tufts);

 const bloom=[0xfff4e0,0xffd45a,0xf59fb5,0xb79bf0,0xffffff,0xf28b5b],flowerPatches=Math.round((mobile?26:60)*SPREAD*SPREAD),perPatch=6;
 const flowers=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.075,0),new THREE.MeshLambertMaterial({}),flowerPatches*perPatch);
 let f=0;guard=0;
 while(f<flowerPatches*perPatch&&guard++<flowerPatches*40){
  const cx=(rand()-.5)*80*SPREAD,cz=(rand()-.5)*74*SPREAD;if(!free(cx,cz))continue;
  const colour=bloom[Math.floor(rand()*bloom.length)];meadow.push([cx,cz]);
  for(let k=0;k<perPatch&&f<flowerPatches*perPatch;k++){
   const x=cx+(rand()-.5)*1.1,z=cz+(rand()-.5)*1.1;if(!free(x,z))continue;
   const s=.8+rand()*.7;dummy.position.set(x,.2+rand()*.09,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(s);dummy.updateMatrix();
   flowers.setMatrixAt(f,dummy.matrix);flowers.setColorAt(f,tint.setHex(colour).offsetHSL((rand()-.5)*.03,0,(rand()-.5)*.08));f++;
  }
 }
 flowers.frustumCulled=false;flowers.count=f;flowers.instanceMatrix.needsUpdate=true;if(flowers.instanceColor)flowers.instanceColor.needsUpdate=true;group.add(flowers);

 // 6. Wind: trees, bushes and crops lean gently together in gusts.
 const swayers=[];
 for(const o of scene.children){
  const m=o.userData.model;if(!m)continue;
  const amp=/^fir_tree/.test(m)?.007:/^tree_/.test(m)?.013:/^bush_/.test(m)?.010:0;
  if(amp)swayers.push({o,rx:o.rotation.x,rz:o.rotation.z,amp,phase:rand()*6.28,speed:rand()*.4});
 }

 // 7. Life in the air, only when motion is welcome.
 const butterflies=[],cloudShadows=[];let motes=null,moteData=null;
 if(!reducedMotion){
  const wingColours=[0xfff3d6,0xffc94a,0xf59a6b,0xd9b3ff];
  const spots=meadow.length?meadow:[[0,10]];
  for(let i=0;i<(mobile?2:4);i++){
   const g=new THREE.Group(),material=new THREE.MeshBasicMaterial({color:wingColours[i%wingColours.length],side:THREE.DoubleSide});
   const left=new THREE.Mesh(new THREE.PlaneGeometry(.17,.13).rotateX(-Math.PI/2).translate(-.085,0,0),material),right=new THREE.Mesh(new THREE.PlaneGeometry(.17,.13).rotateX(-Math.PI/2).translate(.085,0,0),material);
   g.add(left,right);group.add(g);
   const [cx,cz]=spots[Math.floor(rand()*spots.length)];
   butterflies.push({g,left,right,cx,cz,rx:2.2+rand()*2.4,rz:1.8+rand()*2.2,sx:.16+rand()*.12,sz:.13+rand()*.1,phase:rand()*6.28,bob:.9+rand()*.5});
  }
  const blob=softBlobTexture();
  for(let i=0;i<3;i++){
   const m=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:blob,color:0x5a3d10,transparent:true,opacity:.13,depthWrite:false}));
   m.rotation.x=-Math.PI/2;m.scale.set(26+rand()*14,15+rand()*8,1);m.position.y=.25;m.renderOrder=2;group.add(m);
   cloudShadows.push({m,offset:i*57,lane:-30+i*26+rand()*8,speed:.32+rand()*.16});
  }
  if(!mobile){
   const count=46,positions=new Float32Array(count*3);moteData=[];
   for(let i=0;i<count;i++){positions.set([(rand()-.5)*44*SPREAD,.5+rand()*4.5,(rand()-.5)*40*SPREAD],i*3);moteData.push({v:.08+rand()*.1,ph:rand()*6.28});}
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
   motes=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xfff0c0,size:.11,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending}));motes.frustumCulled=false;group.add(motes);
  }
 }

 if(cloneModel)mountainRing({cloneModel,group,rand,mobile});

 let lastSync=0;
 const at=new THREE.Vector3(),next=new THREE.Vector3();
 function flight(b,t,out){
  out.set(b.cx+Math.sin(t*b.sx+b.phase)*b.rx,1+Math.sin(t*1.7+b.phase)*.22*b.bob,b.cz+Math.cos(t*b.sz+b.phase*1.3)*b.rz);
 }
 return {
  group,
  sync:syncFurrows,
  animate(t){
   if(reducedMotion)return;
   if(t-lastSync>2){lastSync=t;syncFurrows();}
   const gust=.65+.35*Math.sin(t*.31)+.15*Math.sin(t*.83+1.7);
   for(const s of swayers){const w=Math.sin(t*(.9+s.speed)+s.phase)*s.amp*gust;s.o.rotation.z=s.rz+w;s.o.rotation.x=s.rx+w*.6;}
   getPlots().forEach((p,i)=>{p.cropGroup.rotation.z=Math.sin(t*1.5+i*.9)*.026*gust;p.cropGroup.rotation.x=Math.cos(t*1.3+i*.7)*.017*gust;});
   for(const b of butterflies){
    flight(b,t,at);flight(b,t+.06,next);b.g.position.copy(at);b.g.rotation.y=Math.atan2(next.x-at.x,next.z-at.z);
    const flap=.25+.85*Math.abs(Math.sin(t*13+b.phase));b.left.rotation.z=flap;b.right.rotation.z=-flap;
   }
   for(const c of cloudShadows){c.m.position.x=((t*c.speed*8+c.offset)%180)-90;c.m.position.z=c.lane+Math.sin(t*.05+c.offset)*4;}
   if(motes){
    const p=motes.geometry.attributes.position;
    for(let i=0;i<moteData.length;i++){
     const d=moteData[i];let x=p.getX(i)+d.v*.7*.033,y=p.getY(i)+Math.sin(t*.6+d.ph)*.004+d.v*.005,z=p.getZ(i)+Math.cos(t*.4+d.ph)*.006;
     if(x>22)x=-22;if(y>5)y=.5;p.setXYZ(i,x,y,z);
    }
    p.needsUpdate=true;
   }
  }
 };
}
