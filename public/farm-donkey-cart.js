import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {sharePalette,shareAtlas,download} from './model-atlas.js';

// The donkey with the cart (27 Oct 2026, the owner's pick c with the Donkey Stable): once the stable is built, its grey donkey pulls the
// farm's horse cart (dray_003, the visitors' cart) up and down the trunk road past the stable and the Goat Shed, in a wide bend at each
// end, and stands a while by the stable now and then. It brings the day's goods to buy (farm-state.js cartLoads): a tap on it opens its
// own window (the owner: "je klikt op de ezelkar"; userData.donkeyCart, game.js pointerTarget, donkey-cart-ui.js). Nothing of it is
// saved or counted here. farm-life.js asks for it like the duck (not with reduced motion, simple graphics, Save-Data or a 2g line).
export const CART_DONKEY='donkey_101',CART_DONKEY_MESH='donkey_grey',CART_MODEL='dray_003';
// The way, in world units: a closed loop along the trunk road (it lies at z -5.2, 2.9 wide), eastwards on its north half and back on
// its south half (lane: from the road's middle). Over the last `ease` units before each end the lanes widen to the bend's radius, then
// it goes round a half circle, so it never turns sharper than that bend. The west bend (round x west) is clear of the chickens' pen and
// the Craft Workshop, the east one (round x east) of the Goat Shed's pen and the Glasshouse (tests/farm-donkey-cart.test.mjs).
// stop: the distance along the loop where it stands by the stable's pen, rest how long (seconds), odds how often. speed: units a
// second at a walk; donkey and cart: their lengths; gap: from the donkey's middle back to the cart's.
export const CART_ROUTE=Object.freeze({west:25.8,east:46.8,middle:-5.2,lane:.5,bend:1.2,ease:4,stop:5,rest:Object.freeze([8,20]),odds:.6,speed:.75,donkey:1.6,cart:2.3,gap:1.05});
const FADE=.6;
// The loop as a function of the distance s along it (three.js-free, for the test): {x, z, yaw} with yaw the way it faces.
export function createRoute(spec=CART_ROUTE){
 const {west,east,middle,lane,bend,ease}=spec,smooth=t=>(1-Math.cos(Math.PI*Math.max(0,Math.min(1,t))))/2;
 const off=x=>lane+(bend-lane)*Math.max(smooth((x-(east-ease))/ease),smooth((west+ease-x)/ease)),line=[],step=.05;
 for(let x=west;x<east;x+=step)line.push([x,middle-off(x)]);
 for(let a=0;a<Math.PI;a+=step/bend)line.push([east+Math.sin(a)*bend,middle-Math.cos(a)*bend]);
 for(let x=east;x>west;x-=step)line.push([x,middle+off(x)]);
 for(let a=0;a<Math.PI;a+=step/bend)line.push([west-Math.sin(a)*bend,middle+Math.cos(a)*bend]);
 const n=line.length,along=[0];for(let i=1;i<=n;i++)along.push(along[i-1]+Math.hypot(line[i%n][0]-line[i-1][0],line[i%n][1]-line[i-1][1]));
 const length=along[n];
 function at(s){
  s=((s%length)+length)%length;let lo=0,hi=n;while(hi-lo>1){const mid=(lo+hi)>>1;if(along[mid]<=s)lo=mid;else hi=mid;}
  const a=line[lo],b=line[(lo+1)%n],k=(s-along[lo])/((along[lo+1]-along[lo])||1),f=line[(lo+4)%n],r=line[(lo-4+n)%n];
  return {x:a[0]+(b[0]-a[0])*k,z:a[1]+(b[1]-a[1])*k,yaw:Math.atan2(f[0]-r[0],f[1]-r[1])};
 }
 return {at,length,stopAt:spec.stop,line};
}
// The walk: dt in seconds. It walks on along the loop, and where it passes the stop it stands a while (its odds) before it goes on.
export function createTrip({spec=CART_ROUTE,random=Math.random}={}){
 const route=createRoute(spec),t={s:random()*route.length,walking:true,rest:0,stops:0};
 function step(dt){
  if(!t.walking){if((t.rest-=dt)<=0)t.walking=true;return t;}
  const before=((t.s%route.length)+route.length)%route.length,after=before+spec.speed*dt;
  t.s=after%route.length;
  if(before<route.stopAt&&after>=route.stopAt&&random()<spec.odds){t.walking=false;t.rest=spec.rest[0]+random()*(spec.rest[1]-spec.rest[0]);t.stops++;}
  return t;
 }
 return {trip:t,route,step};
}

let loader=null;
function loadDonkey(){
 loader??=sharePalette(new GLTFLoader()).setMeshoptDecoder(MeshoptDecoder);
 const url=`/assets/models/${CART_DONKEY}.glb`,open=address=>download(address).then(data=>loader.parseAsync(data,'/assets/models/'));
 return open(url).catch(()=>open(`${url}?fresh=${Date.now()}`));
}
// cart: the farm's cart model as game.js clones it; shown(): whether the stable stands (the pair is out of sight before).
export async function createDonkeyCart({scene,cart,shown}){
 const gltf=await loadDonkey(),model=gltf.scene,others=[];
 model.traverse(o=>{if(o.isSkinnedMesh&&o.name!==CART_DONKEY_MESH)others.push(o);});for(const o of others)o.removeFromParent();
 model.traverse(o=>{if(o.isMesh){o.castShadow=false;o.receiveShadow=true;o.frustumCulled=false;o.material.roughness=1;o.material.metalness=0;}});
 shareAtlas(model,CART_DONKEY);
 const mixer=new THREE.AnimationMixer(model),clip=name=>gltf.animations.find(a=>a.name===name);
 const walk=mixer.clipAction(clip('walk')),idle=mixer.clipAction(clip('idle'));
 walk.play();mixer.update(0);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),k=CART_ROUTE.donkey/Math.max(size.x,size.z);
 model.scale.setScalar(k);model.position.set(-(box.min.x+box.max.x)/2*k,-box.min.y*k,-(box.min.z+box.max.z)/2*k);
 // The pack's donkey walks along its own +z; the cart is turned so its shafts point forward the same way.
 const donkey=new THREE.Group();donkey.name='donkey-cart';donkey.add(model);
 const wagon=new THREE.Group();wagon.name='donkey-cart-wagon';cart.rotation.y=0;cart.position.set(0,cart.position.y,0);cart.updateMatrixWorld(true);
 {const b=new THREE.Box3().setFromObject(cart),c=b.getCenter(new THREE.Vector3());cart.position.x-=c.x;cart.position.z-=c.z;}
 wagon.add(cart);
 donkey.userData.donkeyCart=wagon.userData.donkeyCart=true;scene.add(donkey,wagon);
 const {trip,route,step}=createTrip(),pace=CART_ROUTE.speed;
 // The walk clip's stride matched to its speed, so the hooves do not slide.
 walk.timeScale=Math.max(.5,Math.min(1.4,pace/(CART_ROUTE.donkey*.45/walk.getClip().duration)));
 let walking=true;
 function place(){
  const head=route.at(trip.s),tail=route.at(trip.s-CART_ROUTE.gap);
  donkey.position.set(head.x,0,head.z);donkey.rotation.y=head.yaw;
  wagon.position.set(tail.x,0,tail.z);wagon.rotation.y=Math.atan2(head.x-tail.x,head.z-tail.z);
 }
 place();
 // One step: dt in seconds (game.js caps it at a tenth). Never called while the tab is hidden or motion is reduced.
 function animate(dt){
  const on=shown();donkey.visible=wagon.visible=on;if(!on)return;
  step(dt);
  if(trip.walking!==walking){walking=trip.walking;const [from,to]=walking?[idle,walk]:[walk,idle];to.reset().play();from.crossFadeTo(to,FADE,false);}
  place();mixer.update(dt);
 }
 return {donkey,wagon,animate,trip,route,targets:()=>donkey.visible?[donkey,wagon]:[]};
}
