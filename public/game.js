import {createFamilyUI} from './family-ui.js';
import {renderFarmGuide} from './farm-guide.js';
import {createProgressionUI,progressionSnapshot,progressionChange} from './progression-ui.js';
import {buildingEligible,featureUnlocked,featureUnlockHint} from './farm-state.js';
import {createLoadingScreen} from './loading-screen.js';
import {clearCropVisual,loadInBatches} from './render-resources.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CROPS, ITEMS, BUILDINGS, RECIPES, QUESTS, MAX_PLOTS, progress, farmSummary, seedCost, levelProgress, formatDuration, harvestYield, productionJobs, unlockEntries } from './farm-state.js';
import { createReminderNudge } from './reminder-nudge.js';
import { zone, place, wide, currentZone, SPREAD, ANCHORS, anchorAt, placeIn, ROADS, roadSize, roadRects, fenceSegments } from './farm-layout.js';
import { scatterProps, seeded } from './farm-props.js';
import { createEconomyUI } from './economy-ui.js?v=familyhall-model-2';
import { createFarmClient, farmNow } from './farm-client.js';
import { createRetentionUI } from './retention-ui.js';
import { createGrowthUI } from './growth-ui.js';
import { createBoostsUI } from './boosts-ui.js';
import { art,refreshArt } from './visual-icons.js';
import { bindFarmInput,cameraDragDelta } from './farm-input.js';
import { createQuestsUI } from './quests-ui.js';
import { createBeginnerUI } from './beginner-ui.js';
import { createMobileUI,mobileLayout } from './mobile-ui.js';
import { createFarmLife,LIFE_MODELS } from './farm-life.js';
import { createScenePolish } from './scene-polish.js';
import { createActivitiesUI } from './activities-ui.js';
import { ACTIVE_STATIONS } from './farm-state.js';
import { createFarmAudio,withActionSounds,createProductionCueTracker } from './farm-audio.js';
import { createSoundSettings } from './sound-settings.js';

const $ = id => document.getElementById(id);
const state = structuredClone(window.harvestInitialFarm.state);
const initialChapterReward=window.harvestInitialFarm.chapterReward;
const initialLevelReward=window.harvestInitialFarm.levelReward;
window.harvestInitialFarm = null;
let selectedTool='plant', selectedCrop='wheat', ready=false;
let renderer,scene,camera,zoom=1,pan=0,panDepth=0,hovered=-1,lastTick=0,lastFrame=0;
let viewportWidth=0,viewportHeight=0,viewportRatio=0,viewMode='home';
let overviewBounds=null;
const familyDecor=[],models=new Map(), plots=[], animals=[], particles=[], buildingViews=new Map();
let familyUI,progression,economy,retention,growth,boosts,quests,beginner,mobileUI,windmillRotor,farmLife,activities,soundUI,scenePolish;
const utilityViews=new Map();
const utilityInfo={stall:{name:'Farm stall',icon:'store',hint:'Collect your passive income'},chores:{name:'Farm chores',icon:'shovel',hint:'Little jobs, extra coins'},tractor:{name:'Tractor',icon:'tractor',hint:'Work all your fields'},silo:{name:'Silo research',icon:'warehouse',hint:'Better seeds & faster growth'},cart:{name:'Delivery cart',icon:'truck',hint:'Fresh orders every day'}};
const client=createFarmClient(state,{onChapterReward:reward=>toast(`Completed chapters: +${reward.diamonds} diamonds added!`),onLevelReward:reward=>progression?.announce({...progressionChange(progressionSnapshot(state),state,reward),catchUp:true}),onChange:()=>{if(ready)expandVisuals();updateUI();},onError:toast,onStatus:status=>{const el=$('save-status'),shown=status==='error'||status==='reconnecting';el.hidden=!shown;el.textContent=status==='error'?'Connection interrupted · Retry':status==='reconnecting'?'Reconnecting…':'';el.disabled=status!=='error';el.classList.toggle('save-error',shown);}});
const farmAudio=createFarmAudio({onChange:()=>soundUI?.refresh()});
const productionSounds=createProductionCueTracker(state.buildings,Date.now());
// Pacing measurements go to the page around the game (see src/analytics.js); they carry numbers only.
const track=(event,params={})=>{try{window.parent.harvestBridge?.trackGame?.(event,params);}catch{}};
let sessionTracked=false;
const nudge=createReminderNudge({state,farmNow,level:()=>levelProgress(state).level,notify:message=>toast(message),track,canShow:()=>ready&&$('loading').hidden&&!document.querySelector('dialog[open]')});
const runAction=withActionSounds(async action=>{const before=progressionSnapshot(state);const result=await client.runAction(action);const change=progressionChange(before,state,result.levelReward);progression?.announce(change);if(change.leveled)track('level_up',{level:change.level});return result;},()=>levelProgress(state).level,kind=>farmAudio.play(kind));
function openUtility(key){if(!featureUnlocked(state,key)){toast(featureUnlockHint(key));return;}if(key==='stall'||key==='chores')growth.open(key);else retention.openUtility(key);}
const clock=new THREE.Clock(), raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
const world=$('world'),labels=$('plot-labels');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const modelNames=['plant_001','plant_002','plant_003','plant_004','plant_005','plant_006','plant_007','plant_010','plant_011','garden_bed_001','bag_001','bag_002','bag_003','bucket_001','apiary_001','cart_004','chair_001','firewood_003','firewood_008','hay_002','hay_003','table_001','grass_004','bush_003','hangar_003','house_027','house_030','tower_005','house_010','hangar_004','tower_002','tractor_001','tree_001','tree_004','tree_006','fence_001','cow_001','chicken_001','sheep_001','hay_001','bush_001','grass_001','barrel_001','barrel_009','cart_001','case_002','case_003','coop_001','water_001','landscape_001','ground_004','road_001'];
modelNames.push('tower_001','tower_020','stall_002','greenhouse_003','prop_023','barrel_002','bucket_003','goat_001');
modelNames.push('fence_008','fence_015','ground_002','ground_006','ground_007','stall_001','case_001','dray_002','dray_004','prop_029');
modelNames.push('tree_009','hangar_005','hangar_002','house_011',...LIFE_MODELS);
modelNames.push('coop_002','mountain_001','mountain_007');
modelNames.push('house_008','pointer_002','table_002','garden_bed_002','firewood_001');
const beanPodGeometry=new THREE.SphereGeometry(1,5,5),beanPodMaterial=new THREE.MeshStandardMaterial({color:0x70a936,roughness:1});
let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function icons(){refreshArt();}

function cloneModel(name,x,z,{width,height,depth,scale=1,rotation=0,y=0}={}){
 const entry=models.get(name);if(!entry)throw new Error(`Missing model: ${name}`);
 const obj=entry.object.clone(true),d=entry.size;
 if(width!=null&&depth!=null)obj.scale.set(width/d.x,(height??d.y)/d.y,depth/d.z);
 else {const s=height!=null?height/d.y:width!=null?width/Math.max(d.x,d.z):scale;obj.scale.setScalar(s);}
 const [px,pz]=place(x,z);obj.position.set(px,y,pz);obj.rotation.y=rotation;obj.userData.model=name;scene.add(obj);return obj;
}
function patch(x,z,width,depth,color,y=.005){
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshStandardMaterial({color,roughness:1}));
 mesh.rotation.x=-Math.PI/2;{const [px,pz]=place(x,z);mesh.position.set(px,y,pz);}mesh.receiveShadow=true;scene.add(mesh);return mesh;
}
function fenceLine(x,z,n,axis='x',size=2.2,style='fence_001',tintColor){
 const before=currentZone(),spots=fenceSegments(x,z,n,axis,size);
 zone('fields');
 for(const [cx,cz] of spots){
  const seg=cloneModel(style,cx,cz,{width:size,rotation:axis==='z'?Math.PI/2:0});
  if(tintColor)tint(seg,tintColor);
 }
 zone(before);
}
function groundPatch(name,x,z,width,depth,color){
 const p=cloneModel(name,x,z,{width,depth,height:.16,y:.006});
 p.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(color);}});
 return p;
}
// Multiplicative tint: only ever makes a texture darker/warmer, never lighter than its source pixels.
function tint(obj,color){obj.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(color);}});return obj;}
// Additive glow: the only way to make an already-dark, texture-mapped prop read lighter.
function lighten(obj,color,intensity=.3){obj.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.emissive=new THREE.Color(color);n.material.emissiveIntensity=intensity;}});return obj;}
function decorate(){
 // Layout zones (public/farm-layout.js): each yard moves as one piece, the fields stay where they are.
 zone('fields');
 const ground=patch(0,0,200,200,0xacae5c,0);ground.name='Farm ground';
 // The crossing paths keep the four parts of the farm easy to read from the fixed camera.
 zone('exact');
 for(const road of ROADS.slice(0,3))cloneModel('road_001',road.x,road.z,{...roadSize(road),height:road.height,y:road.y});
 zone('fields');patch(2.575,14.4,12.8,31.7,0xa2a66b,.004);
 zone('coop');patch(13,-9.5,15.8,11.6,0xa4a76e,.007);
 zone('mill');patch(-12.5,5.3,8.7,13,0xa9ab73,.004);
 // Buildings, vehicles and all plants below come from the supplied GLB pack.
 zone('dairy');addBuilding('dairy',-1,-13.2,{width:6.8,rotation:Math.PI/2});
 zone('silo');addUtility('silo','tower_002',5.6,-11.8,{height:6.6});
 zone('farmhouse');addBuilding('farmhouse',-13.8,-10.2,{width:6.5,rotation:Math.PI/2});
 zone('mill');addBuilding('mill',-12.5,4,{width:4.8,rotation:Math.PI/2});
 cloneModel('tower_005',-17,3,{height:4.5});
 zone('bakery');addBuilding('bakery',-10.8,12,{width:5.2,rotation:Math.PI/2});
 zone('packing');addBuilding('packing',11.5,-17.2,{width:4.4,rotation:-Math.PI/2});
 zone('windmill');
 const windmillPosition={x:12.8,z:-1.5};
 addBuilding('windmill',windmillPosition.x,windmillPosition.z,{height:6.6});
 zone('juicepress');addBuilding('juicepress',-1,-20.1,{width:5.5,height:3.7,depth:4.8,rotation:Math.PI/2});
 zone('preserves');addBuilding('preserves',-15.2,-18.6,{width:5.7,height:3.9,depth:5,rotation:Math.PI/2});
 zone('kitchen');addBuilding('kitchen',-12.4,18.2,{width:4.2,height:3,depth:3.7,rotation:Math.PI/2});
 // North-west square, clear of crop expansions and the north-south path at x=-6.
 zone('familyhall');addBuilding('familyhall',-9.3,-20.5,{width:4.2,rotation:Math.PI/2});
 {
  // Independent decor is excluded from the raycast target lists.
  for(const [name,x,z,options] of [
   ['pointer_002',-6.8,-18.2,{height:1.3}],
   ['table_002',-9.6,-16.9,{width:1.5}],['garden_bed_002',-11.8,-17,{width:1.3,height:.28,depth:1.6}],
   ['firewood_001',-12.2,-20.6,{width:1.1}]
  ]){const decor=cloneModel(name,x,z,options);familyDecor.push(decor);}
 }

 zone('juicepress');patch(-1,-20.1,6.9,6.4,0xb6bd88,.008);
 zone('preserves');patch(-15.2,-18.6,7.1,6.6,0xb6bd88,.008);
 zone('kitchen');patch(-12.4,18.2,5.1,4.8,0xb6bd88,.008);
 // Both the mill body and its moving sails are original parts from the supplied pack.
 zone('windmill');
 const sail=cloneModel('tower_020',0,0,{height:5.8});scene.remove(sail);
 sail.position.set(0,-2.9,0);windmillRotor=new THREE.Group();{const [rx,rz]=place(windmillPosition.x,windmillPosition.z+1.8);windmillRotor.position.set(rx,4.55,rz);}windmillRotor.add(sail);windmillRotor.userData.building='windmill';scene.add(windmillRotor);
 cloneModel('bag_001',windmillPosition.x-2,windmillPosition.z+1.8,{height:.95,rotation:.4});
 cloneModel('bag_002',windmillPosition.x-1.3,windmillPosition.z+2.2,{height:.85,rotation:-.3});
 cloneModel('prop_023',windmillPosition.x+2.2,windmillPosition.z+1.8,{width:1.1,rotation:.2});
 zone('greenhouse');const glasshouse=cloneModel('greenhouse_003',5.6,-19,{width:3.7,rotation:Math.PI/2});
 zone('packing');
 cloneModel('barrel_002',14.5,-14.6,{height:1.2});
 cloneModel('bucket_003',12.7,-13.9,{height:.65});
 zone('tractor');addUtility('tractor','tractor_001',-5.2,-.2,{width:3.1,rotation:-Math.PI/2});
 zone('cart');addUtility('cart','cart_001',-6.3,3.8,{width:2.2,rotation:Math.PI/2});
 cloneModel('bag_001',-4.6,5.2,{height:.75,rotation:-.25});
 cloneModel('bag_002',-5.3,5.05,{height:.72,rotation:.35});
 cloneModel('bucket_001',-4.8,4.45,{height:.62,rotation:.2});
 zone('bakery');
 cloneModel('cart_004',-14.8,12.4,{width:2.2,rotation:.35});
 cloneModel('table_001',-12.7,13.4,{width:1.8,rotation:-.2});
 cloneModel('chair_001',-11.4,13.7,{height:1.05,rotation:-2.4});
 zone('apiary');
 const hive=cloneModel('apiary_001',10.1,13.8,{height:1.35,rotation:.15});
 cloneModel('apiary_001',11.4,14.2,{height:1.25,rotation:-.2});
 zone('farmhouse');cloneModel('firewood_003',-15.4,-5.8,{width:1.7,rotation:Math.PI/2});
 zone('silo');
 cloneModel('hay_001',4.6,-7.8,{width:1.9});
 cloneModel('hay_001',6.2,-8.1,{width:1.7,rotation:.4});
 cloneModel('hay_001',5.35,-7.9,{width:1.5,y:1.2});
 cloneModel('hay_002',3.7,-8.4,{width:1.45,rotation:.2});
 zone('chores');
 addUtility('chores','barrel_001',-5.8,-10.7,{height:1.1});
 cloneModel('barrel_001',-6.7,-10.3,{height:1.05});
 zone('stall');
 addUtility('stall','stall_002',-11.3,-2.6,{width:2.9,rotation:.15});
 cloneModel('prop_023',-9.2,-2.7,{width:.8});
 zone('coop');
 addBuilding('coop',13,-9.5,{width:3.4,rotation:-Math.PI/2});
 {const pen=buildingViews.get('coop').object,house=cloneModel('coop_002',13,-9.5,{width:1.8});pen.attach(house);}
 // The pen is roomy, with the coop in the middle: 15.4 wide and 11 deep around it.
 fenceLine(6.4,-15,7);fenceLine(6.4,-4,7);fenceLine(5.3,-13.9,5,'z');fenceLine(20.7,-13.9,5,'z');
 // The farmhouse dooryard gets a white picket fence; the rest stay practical rail fencing.
 zone('farmhouse');fenceLine(-16.6,-13.2,4,'x',2.2,'fence_015',0xf2e2bd);
 zone(null);fenceLine(-19,-9,8,'z');fenceLine(-18.8,10.8,5);
 // White rail fences run along the two sides of the crops, the same distance from the outer fields; the ends stay open.
 zone('fields');
 fenceLine(-4.4,-.3,15,'z',2.2,'fence_008',0xf2e2bd);fenceLine(9.55,-.3,15,'z',2.2,'fence_008',0xf2e2bd);
 zone('coop');
 const animalAt=(model,x,z,options,building,seed)=>{const o=cloneModel(model,x,z,options);o.userData.building=building;const [ax,az]=place(x,z);animals.push({obj:o,x:ax,z:az,seed});return o;};
 animalAt('cow_001',8.6,-6.6,{width:2.4,rotation:-.6},'dairy',.5);
 animalAt('cow_001',17.6,-6.2,{width:1.85,rotation:2},'dairy',3);
 animalAt('sheep_001',8.2,-12.2,{width:1.6,rotation:.6},'dairy',1.5);
 animalAt('goat_001',17.8,-12,{width:1.5,rotation:-1.1},'dairy',4.2);
 // The chickens live at their coop, in the pen with the other animals.
 for(const [x,z,r] of [[10.6,-11.6,.2],[9.9,-8.6,2.1],[15.8,-7,3.1]])animalAt('chicken_001',x,z,{height:.72,rotation:r},'coop',r);
 // Small work yards and low props create breathing room around every building.
 // Organic ground pieces replace flat rectangles so each yard reads as trodden earth, not a shape.
 zone('mill');groundPatch('ground_002',-12.5,4,6.4,6.4,0xb8af8a);
 zone('bakery');groundPatch('ground_007',-10.8,12,7,6.9,0xbaaf8b);
 zone('packing');groundPatch('ground_006',11.5,-17.2,6.8,6.4,0xb9af8a);
 for(const [yard,list] of Object.entries({
  packing:[['case_002',9,-14.2,{width:1.1,rotation:.12}],['bag_003',10.25,-14.2,{height:.82,rotation:-.25}],['cart_004',14.7,-17.3,{width:1.7,rotation:Math.PI/2}],['prop_029',8.4,-13.6,{width:.55,rotation:.6}],['bush_003',8.9,-19.6,{width:1.2}]],
  mill:[['barrel_002',-15.7,6.5,{height:.95}],['bag_001',-10.2,6.4,{height:.8}],['bag_002',-10.8,6.7,{height:.7}],['bucket_001',-7.7,1,{height:.65}],['bush_003',-8.4,8,{width:1.1}],['grass_004',-8.2,8.9,{height:.3}]],
  bakery:[['firewood_003',-14.1,10.5,{width:1.3}],['case_003',-8.1,13.5,{width:.9,rotation:.35}]],
  farmhouse:[['table_001',-13.9,-5.9,{width:1.6}],['chair_001',-15,-6.3,{height:.85,rotation:1.7}],['garden_bed_001',-17.3,-8,{width:1.8,rotation:Math.PI/2}],['garden_bed_001',-17.3,-5.9,{width:1.8,rotation:Math.PI/2}],['firewood_008',-16.1,-4.4,{width:1.45,rotation:.25}]],
  dairy:[['bucket_003',-1.8,-9.1,{height:.65}],['hay_002',1.2,-9.7,{width:1.2}]],
  coop:[['water_001',17.6,-13.4,{width:1.1}]],
  apiary:[['barrel_001',10.3,7.1,{height:.9}],['barrel_009',11.6,7.7,{height:.82,rotation:.2}]],
  silo:[['hay_003',6.4,-7.9,{width:1.3,rotation:-.35}]]
})){zone(yard);for(const [name,x,z,options] of list)cloneModel(name,x,z,options);}
 // These sit clear of the roads (which run along x≈-6, z≈-4 and z≈20) and get a warm
 // glow since a plain color tint can only darken a texture, never lighten it.
 zone('packing');lighten(cloneModel('case_001',9.9,-15.1,{width:.95,rotation:-.4}),0x3a2a16,.28);
 zone('farmhouse');
 lighten(cloneModel('dray_004',-18.5,-6.5,{width:2,rotation:.4}),0x3a2a16,.28);
 lighten(cloneModel('dray_002',-18.6,-11.2,{width:1.9,rotation:.5}),0x3a2a16,.28);
 zone('bakery');lighten(cloneModel('stall_001',-9.5,14.8,{width:2.2,rotation:.4}),0x3a2a16,.28);
 // Trees, bushes and tufts are spread out with the farm and keep clear of every yard.
 zone(null);
 // The western boundary keeps tall foliage clear of the Family Hall roof.
 const trees=[[-19,-16,4],[-20,-10,5],[-19,1,4.5],[-18.8,6,4.7],[-17.4,8.5,4],[-18,12,6.2],[-18,18,4],[-5,19,5.8],[12,22,5.2],[14,15,5.4],[19,8,6],[21,1,5.7],[22.5,-10,6],[19,-19,6.1],[4,-21,5.4],[-21,-16,4.8],[1,-24.5,4],[-23,7,6.5],[24,15,6.4],[-25,-1,6.4],[25,-17,7]];
 trees.forEach(([x,z,height],i)=>cloneModel(['tree_001','tree_004','tree_006'][i%3],x,z,{height,rotation:i*1.8}));
 // More trees between the far ones fill the wider ring the spread-out farm needs.
 [[-27,-24,4.4],[-28,-4,5],[-27,17,5.4],[-9,27,5],[9,29,5.8],[27,3,5.6],[27,-12,5.8],[24,-25,6],[12,-31,5.2],[-6,-33,4.6],[-24,-32,5.2],[-10,-30,4.8]].forEach(([x,z,height],i)=>cloneModel(['tree_004','tree_006','tree_001'][i%3],x,z,{height,rotation:i*2.3+.7}));
 for(const [x,z] of [[-17,-6],[-16.5,-4],[-18.5,9],[-15,12],[21,-3],[18,2],[21,9],[10,15],[2,20],[-21,-15],[11,-16]])cloneModel('bush_001',x,z,{width:2.2,rotation:x});
 for(const [x,z,r] of [[9.4,12.2,.2],[9.8,9.2,1.1],[-13.7,15.2,2.2],[16,5.2,.6]])cloneModel('bush_003',x,z,{width:1.45,rotation:r});
 // Small tufts from the pack add texture while leaving the fields unobstructed.
 for(let i=0;i<54;i++){
  const a=i*2.3999,r=18+(i%7)*1.15,x=Math.cos(a)*r,z=Math.sin(a)*r;
  cloneModel('grass_001',x,z,{height:.25+(i%3)*.1,rotation:a});
 }
 for(const [x,z,r] of [[9.5,13.2,.3],[9.5,11.1,1.8],[-11.2,14.5,.7],[-14.7,14.8,2.1],[15.5,4.5,.4],[17.1,4.9,2.4]])cloneModel('grass_004',x,z,{height:.38,rotation:r});
 farmLife=createFarmLife({scene,cloneModel,patch,state,onOpen:id=>activities.open(id),reducedMotion});
 zone('fields');
 farmLife.attach('greenhouse',glasshouse);farmLife.attach('apiary',hive);farmLife.watchProduction(buildingViews);
 addExtraProps();
}
// Small props from the model pack fill the room between the yards. Spots are taken only where nothing stands: not on a
// building, road, fence, field or the pond.
function addExtraProps(){
 scene.updateMatrixWorld(true);
 const blocked=[];
 for(const object of scene.children){
  if(object.isLight||object.isCamera||object===scene.getObjectByName('Farm ground'))continue;
  const box=new THREE.Box3().setFromObject(object);if(box.isEmpty()||box.getSize(new THREE.Vector3()).y<.03)continue;
  blocked.push(box);
 }
 const [pondX,pondZ]=placeIn('pond',0,0),pond=[10.4+pondX,10.4+pondZ,24.8+pondX,19.6+pondZ],fields=[-5.6,-3,10.4,33.6];
 const free=(x,z,r)=>!blocked.some(b=>x>b.min.x-r&&x<b.max.x+r&&z>b.min.z-r&&z<b.max.z+r)
  &&!(x>fields[0]&&x<fields[2]&&z>fields[1]&&z<fields[3])&&!(x>pond[0]-1&&x<pond[2]+1&&z>pond[1]-1&&z<pond[3]+1);
 const anchors=Object.fromEntries(Object.keys(ANCHORS).map(id=>[id,anchorAt(id)]));
 // The roadside props follow the roads of the layout, along their length.
 const roads=roadRects().slice(0,3).map(r=>r.horizontal?[r.minX+3,(r.minZ+r.maxZ)/2,r.maxX-3,(r.minZ+r.maxZ)/2]:[(r.minX+r.maxX)/2,r.minZ+3,(r.minX+r.maxX)/2,r.maxZ-3]);
 for(const p of scatterProps({anchors,roads,free,rand:seeded(20260921)}))cloneModel(p.name,p.x,p.z,p.options);
}
function createPlots(){
 while(plots.length>state.plots.length){
  const v=plots.pop();v.label.remove();clearCropVisual(v.cropGroup);
  for(const object of [v.soil,v.hit,v.ring,v.cropGroup])scene.remove(object);
  for(const object of [v.hit,v.ring]){object.geometry.dispose();object.material.dispose();}
 }
 for(let i=plots.length;i<state.plots.length;i++){
  const x=-2.15+(i%4)*3.15,z=.25+Math.floor(i/4)*3.2;
  const soil=cloneModel('ground_004',x,z,{width:2.38,depth:2.38,height:.20,y:.02});
  soil.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.color.setHex(0xc4b39a);n.userData.plot=i;}});
  const hit=new THREE.Mesh(new THREE.BoxGeometry(2.4,.25,2.4),new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}));hit.position.set(x,.23,z);hit.userData.plot=i;scene.add(hit);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.5,.56,4,1,Math.PI/4),new THREE.MeshBasicMaterial({color:0xffe081,transparent:true,opacity:.8,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.scale.set(3.2,3.2,1);ring.position.set(x,.247,z);ring.visible=false;scene.add(ring);
  const label=document.createElement('button');label.className='plot-label';label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);label.addEventListener('click',()=>interact(i));label.addEventListener('focus',()=>highlight(i));label.addEventListener('blur',()=>highlight(-1));labels.append(label);
  const cropGroup=new THREE.Group();cropGroup.userData.plot=i;scene.add(cropGroup);
  plots.push({x,z,soil,hit,ring,label,cropGroup,visualCrop:undefined,lastReady:false});
 }
}
function drawCrop(i){
 const p=state.plots[i],v=plots[i];
 if(v.visualCrop!==p.crop){
  clearCropVisual(v.cropGroup);v.visualCrop=p.crop;
  if(p.crop){
   const c=CROPS[p.crop];
   if(c.perennial){
    const o=cloneModel(c.model,0,0,{height:c.height,width:p.crop==='apples'?1.9:1.7,depth:p.crop==='apples'?1.9:1.7,rotation:.5});scene.remove(o);v.cropGroup.add(o);o.position.set(0,0,0);
   }else if(p.crop==='pumpkin'){
    const o=cloneModel(c.model,0,0,{width:2.05,rotation:Math.PI/2});scene.remove(o);v.cropGroup.add(o);o.position.set(0,0,0);
   }else{
    const offsets=['wheat','barley'].includes(p.crop)?[-.65,0,.65].flatMap(x=>[-.65,0,.65].map(z=>[x,z])):[[-.55,-.55],[.55,-.55],[-.55,.55],[.55,.55]];
    for(const [dx,dz] of offsets){
     const o=cloneModel(c.model,0,0,{height:c.height,rotation:p.crop==='sunflower'?-.55:.5+i*.22});scene.remove(o);v.cropGroup.add(o);o.position.set(dx,0,dz);if(p.crop==='greenbeans'){for(let j=0;j<3;j++){const pod=new THREE.Mesh(beanPodGeometry,beanPodMaterial);pod.scale.set(.065,.23,.065);pod.position.set(dx+Math.cos(j*2)*.16,.45+j*.19,dz+Math.sin(j*2)*.16);pod.rotation.z=.25-j*.2;v.cropGroup.add(pod);}}if(c.tint)o.traverse(n=>{if(n.isMesh){n.material=n.material.clone();n.material.userData.farmCropOwned=true;n.material.color.setHex(c.tint);}});
    }
   }
  }
 }
 v.cropGroup.position.set(v.x,.25,v.z);
 const pg=progress(p,farmNow()),scale=p.crop ? (CROPS[p.crop].perennial&&p.harvestCycles>0?.85+.15*pg:.12+.88*Math.pow(pg,.6)) : 1;
 v.cropGroup.scale.setScalar(scale);
 const ripe=p.crop&&farmNow()>=p.readyAt;
 v.soil.traverse(n=>{if(n.isMesh)n.material.color.setHex(p.watered?0x8b8a82:0xc4b39a)});
 if(!p.crop){v.label.innerHTML='';v.label.className='plot-label';v.label.setAttribute('aria-label',`Field ${i+1}, empty. Plant ${CROPS[selectedCrop].name}.`);}
 else if(ripe){
  if(!v.lastReady||!v.label.querySelector('.game-art'))v.label.innerHTML=art(['apples','berries','greenbeans'].includes(p.crop)?p.crop:'vegetables');
  v.label.className='plot-label ready';v.label.setAttribute('aria-label',`Harvest ${CROPS[p.crop].name} from field ${i+1}`);
 }else{
  const remaining=p.readyAt-farmNow(),time=mobileLayout.matches?(remaining>=3600000?`${Math.ceil(remaining/3600000)}h`:remaining>=60000?`${Math.ceil(remaining/60000)}m`:`${Math.ceil(Math.max(0,remaining)/1000)}s`):formatDuration(remaining);
  v.label.textContent=mobileLayout.matches?time:`${p.tended?'✦ ':p.watered?'↟ ':''}${time}`;v.label.className=`plot-label${p.watered?' watered':''}${!p.tended&&farmNow()>=p.careAt?' care-ready':''}`;v.label.setAttribute('aria-label',`${CROPS[p.crop].name}, field ${i+1}, ${formatDuration(p.readyAt-farmNow())} remaining${p.watered?', watered':''}`);
 }
 v.lastReady=ripe;
}
function highlight(id){hovered=id;plots.forEach((v,i)=>v.ring.visible=i===id);for(const [key,v] of buildingViews)v.outline.visible=key===id;world.style.cursor=id!==-1?'pointer':'grab';}
function particleBurst(id,water=false){
 if(reducedMotion)return;
 const v=plots[id];
 for(let i=0;i<13&&particles.length<100;i++){
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(water?.045:.055,4,3),new THREE.MeshBasicMaterial({color:water?0x88d0e0:[0xffdb69,0xfff2bb,0xf6bf42][i%3],transparent:true}));
  mesh.position.set(v.x,.9,v.z);scene.add(mesh);particles.push({mesh,velocity:new THREE.Vector3((Math.random()-.5)*2,1.5+Math.random()*1.5,(Math.random()-.5)*2),life:1});
 }
}
function floatReward(id,text){const v=plots[id],p=new THREE.Vector3(v.x,2.4,v.z).project(camera),e=document.createElement('div');e.className='floating-reward';e.textContent=text;e.style.left=`${world.offsetLeft+(p.x*.5+.5)*world.clientWidth}px`;e.style.top=`${world.offsetTop+(-p.y*.5+.5)*world.clientHeight}px`;$('game').append(e);setTimeout(()=>e.remove(),1400);}
async function interact(id,forcedAction){
 if(!ready)return;
 const plot=state.plots[id];
 const action=forcedAction??(plot.crop&&farmNow()>=plot.readyAt?'harvest':selectedTool);
 try{
  const result=await runAction({type:'field',id,action,crop:selectedCrop});
  if(action==='harvest'){particleBurst(id);floatReward(id,`+${result.quantity} ${CROPS[result.crop].name} · +${result.xp} XP`);}
  if(action==='water'){particleBurst(id,true);floatReward(id,'+1 crop · 20% less waiting');}
  if(action==='tend'){particleBurst(id);floatReward(id,'Extra care · +1 crop');}
  if(action==='plant')floatReward(id,`−${result.cost} coins`);
  drawCrop(id);renderer.shadowMap.needsUpdate=true;updateUI();icons();return result;
 }catch(e){toast(e.message);return {error:e.message};}
}
function setTool(tool){selectedTool=tool;document.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('active',b.dataset.tool===tool);b.setAttribute('aria-pressed',String(b.dataset.tool===tool));});updateHint();}
function setCrop(crop){selectedCrop=crop;setTool('plant');if(ready)plots.forEach((_,i)=>drawCrop(i));updateHint();}
function updateHint(){
 let text=selectedTool==='tend'?'Give growing crops extra care when the green marker appears. Earn +1 crop.':selectedTool==='water'?'Water growing crops for +1 crop and 20% less waiting.':selectedTool==='harvest'?'Click a ready crop to harvest. Hold and drag to move the view.':`Click an empty field to plant ${CROPS[selectedCrop].name.toLowerCase()}. Hold and drag to move the view.`;
 if(!state.stats.harvested&&state.plots.some(p=>p.crop&&farmNow()>=p.readyAt))text='Your first crops are ready. Click a crop or its basket to harvest!';
 if(selectedTool==='plant'&&state.stats.harvested>=3&&state.stats.produced===0)text='Your farm can do more. Click a building to start producing!';
 if(mobileLayout.matches)text=selectedTool==='plant'?`Tap an empty field to plant ${CROPS[selectedCrop].name.toLowerCase()}. Drag to move the view.`:`Tap a field to ${selectedTool==='tend'?'give extra care':selectedTool}. Drag to move the view.`;
 $('hint-text').textContent=text;
}
function updateUI(){
 $('coins').textContent=state.coins.toLocaleString('en-US',mobileLayout.matches?{notation:'compact',maximumFractionDigits:1}:{});$('coins').parentElement.title=`${state.coins.toLocaleString('en-US')} coins`;
 const lp=levelProgress(state),lvl=lp.level;
 if(!sessionTracked){sessionTracked=true;track('game_session',{level:lvl,returning:(state.stats?.harvested??0)>=5});}
 {const next=unlockEntries(state).filter(e=>!e.unlocked&&e.level===lvl+1).map(e=>e.name);$('journal-button').title=next.length?`Level ${lvl+1} unlocks: ${next.slice(0,3).join(', ')}${next.length>3?'…':''}`:'Farm journal & level rewards';}
 nudge?.check();
 $('level').textContent=lvl;$('xp-text').textContent=`${lp.current} / ${lp.target} XP`;$('xp-bar').max=lp.target;$('xp-bar').value=lp.current;
 $('level-name').textContent=['Rookie farmer','Green thumb','Market regular','Harvest hero','Farm tycoon'][Math.min(lvl-1,4)];
 const count=Object.values(state.inventory).reduce((a,b)=>a+b,0);$('stock-count').hidden=count===0;$('stock-count').textContent=count;
 $('task-dot').hidden=!QUESTS.some((q,i)=>!state.claimed.includes(i)&&state.stats[q.stat]>=q.target);
 familyUI?.refresh();beginner?.refresh();updateHint();economy?.refresh();retention?.refresh();growth?.refresh();boosts?.refresh();quests?.refresh();mobileUI?.refresh();activities?.refresh();progression?.refresh();
}
function renderMarket(){economy.renderMarket();}
function sell(item='category'){return economy.sell(item);}
async function claim(id){try{const r=await runAction({type:'quest',id});updateUI();toast(`Quest complete! +${r.coins} coins and +${r.xp} XP.`);return r;}catch(e){toast(e.message);return {error:e.message};}}
function openDialog(id){if(id==='tasks-dialog'){quests.open();return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());if(id==='market-dialog')renderMarket();$(id).showModal();$(id).scrollTop=0;}
function resize(){
 if(!renderer||!camera)return;
 const width=world.clientWidth,height=world.clientHeight;if(width<=0||height<=0)return;const aspect=width/height;
 const ratio=Math.min(devicePixelRatio,mobileLayout.matches?1.5:1.75);
 if(ratio!==viewportRatio){renderer.setPixelRatio(ratio);viewportRatio=ratio;}
 if(width!==viewportWidth||height!==viewportHeight){renderer.setSize(width,height);viewportWidth=width;viewportHeight=height;}
 const mobile=mobileLayout.matches;
 // Fit the actual useful farm, not its decorative trees. Desktop HUD areas are
 // reserved so the main buildings are not hidden behind the guide or tool dock.
 const padding=mobile?{left:28,right:28,top:48,bottom:25}:{left:105,right:285,top:125,bottom:155};
 const bounds=overviewBounds??{minX:-27,maxX:27,minY:-18,maxY:18};
 const usableWidth=Math.max(width*.5,width-padding.left-padding.right),usableHeight=Math.max(height*.5,height-padding.top-padding.bottom);
 const overviewSpan=Math.max((bounds.maxY-bounds.minY+3)*height/usableHeight,(bounds.maxX-bounds.minX+3)*height/usableWidth);
 // The fields view shows every row: the block is 12 wide and 3.2 per row deep, seen diagonally (about .44 of its width plus depth
 // up and down, 1.4 across), with room for the buttons above and below it.
 const rows=Math.ceil(state.plots.length/4),fieldSpan=Math.max(21,24/aspect,(10+2.26*rows)/aspect,10.6+rows*2.06);
 const homeSpan=Math.min(overviewSpan,Math.max(fieldSpan,mobile?32/aspect:38));
 const span=(viewMode==='fields'?fieldSpan:viewMode==='home'?homeSpan:overviewSpan)/zoom;
 camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;
 let focus;
 if(viewMode==='fields'){
  const fieldCenter=.25+(Math.ceil(state.plots.length/4)-1)*3.2/2;
  focus=new THREE.Vector3(2.575+pan+panDepth,0,fieldCenter-pan+panDepth);
 }else if(viewMode==='home'){
  focus=new THREE.Vector3(1.4+pan+panDepth,0,1.5-pan+panDepth);
 }else{
  const side=(bounds.minX+bounds.maxX)/2+(padding.right-padding.left)*span/(2*height);
  const up=(bounds.minY+bounds.maxY)/2+(padding.top-padding.bottom)*span/(2*height);
  focus=new THREE.Vector3(side/Math.SQRT2+pan+panDepth,0,-side/Math.SQRT2-pan+panDepth);
  // Looking down (36,40,36), each ground axis projects vertically by -40/sqrt(8384).
  const depth=-up*Math.sqrt(8384)/80;focus.x+=depth;focus.z+=depth;
 }
 camera.position.copy(focus).add(new THREE.Vector3(36,40,36));camera.lookAt(focus);camera.updateProjectionMatrix();camera.updateMatrixWorld();
 $('game').classList.toggle('farm-overview',mobile&&viewMode==='overview'&&zoom<1.4);
 $('fields-view').setAttribute('aria-pressed',String(viewMode==='fields'));$('zoom-reset').setAttribute('aria-pressed',String(viewMode==='home'));$('zoom-fit').setAttribute('aria-pressed',String(viewMode==='overview'));
 $('zoom-in').disabled=zoom>=2.2;$('zoom-out').disabled=zoom<=.75;
 positionLabels();positionBuildingLabels();
}
function panFarm(delta,depth=0){const limit=Math.round(20*SPREAD);pan=Math.max(-limit,Math.min(limit,pan+delta));panDepth=Math.max(-limit,Math.min(limit,panDepth+depth));resize();}
function zoomFarm(value){zoom=Math.max(.75,Math.min(2.2,value));resize();}
function resetView(){viewMode='home';zoom=1;pan=0;panDepth=0;resize();if(ready)updateUI();}
function showOverview(){viewMode='overview';zoom=1;pan=0;panDepth=0;resize();}
function focusFields(){viewMode='fields';zoom=1;pan=0;panDepth=0;resize();}
function measureFarm(){
 // Use each actual building and field box, retaining the useful heights.
 const bounds={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity};
 for(const object of [...Array.from(buildingViews.values(),v=>v.object),...Array.from(utilityViews.values(),v=>v.object),...plots.map(v=>v.soil),...Array.from(farmLife?.views.values()??[],v=>v.object)]){
  const box=new THREE.Box3().setFromObject(object);
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y+1])for(const z of [box.min.z,box.max.z]){
   const sx=(x-z)/Math.SQRT2,sy=-(x+z)*40/Math.sqrt(8384)+y*72/Math.sqrt(8384);
   bounds.minX=Math.min(bounds.minX,sx);bounds.maxX=Math.max(bounds.maxX,sx);bounds.minY=Math.min(bounds.minY,sy);bounds.maxY=Math.max(bounds.maxY,sy);
  }
 }
 overviewBounds=bounds;
}
function positionLabels(){
 if(!camera)return;
 for(let i=0;i<plots.length;i++){
  const v=plots[i],p=state.plots[i],y=p.crop?Math.max(.7,(CROPS[p.crop].height+.55)*(CROPS[p.crop].perennial&&p.harvestCycles>0?1:progress(p,farmNow()))):0.4;
  const point=new THREE.Vector3(v.x,y,v.z).project(camera);
  v.label.style.left=`${(point.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-point.y*.5+.5)*world.clientHeight}px`;
  v.label.hidden=point.z>1||point.z< -1||Math.abs(point.x)>1||Math.abs(point.y)>1;
 }
 if(mobileLayout.matches){
  // Keep each label attached to its own plot; hide overlaps instead of moving
  // a timer onto a neighbouring field. Harvest markers take priority.
  const occupied=[];
  const candidates=plots.map((v,i)=>({v,i})).filter(({v,i})=>state.plots[i].crop&&!v.label.hidden).sort((a,b)=>Number(b.v.lastReady)-Number(a.v.lastReady)||a.i-b.i);
  for(const {v} of candidates){
   const rect=v.label.getBoundingClientRect();
   const overlaps=occupied.some(r=>rect.left<r.right+4&&rect.right>r.left-4&&rect.top<r.bottom+4&&rect.bottom>r.top-4);
   if(overlaps)v.label.hidden=true;else occupied.push(rect);
  }
 }
}
function pointerTarget(event){
 for(const [id,v] of farmLife?.views??[]){if(v.label.hidden)continue;const b=v.label.getBoundingClientRect(),pad=6;if(event.clientX>=b.left-pad&&event.clientX<=b.right+pad&&event.clientY>=b.top-pad&&event.clientY<=b.bottom+pad)return {type:'activity',id};}
 for(let i=0;i<plots.length;i++){const v=plots[i];if(!state.plots[i].crop||v.label.hidden)continue;const box=v.label.getBoundingClientRect();if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return {type:'plot',id:i};}
 for(const [type,views] of [['building',buildingViews],['utility',utilityViews],['activity',farmLife?.views??new Map()]])for(const [id,v] of views){
  if(v.label.hidden)continue;const box=v.label.getBoundingClientRect();
  if(event.clientX>=box.left&&event.clientX<=box.right&&event.clientY>=box.top&&event.clientY<=box.bottom)return {type,id};
 }
 const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);
 // Hands-on stations have dedicated solid hit volumes: glass, open roofs and
 // small props must not lose taps to scenery or nearby utility models.
 const stationHit=raycaster.intersectObjects(farmLife?.targets()??[],true)[0];
 if(stationHit){let node=stationHit.object;while(node){if(node.userData.activity)return {type:'activity',id:node.userData.activity};node=node.parent;}}
 const targets=[...plots.flatMap(v=>[v.hit,v.cropGroup]),...Array.from(buildingViews.values()).filter(v=>v.object.visible).flatMap(v=>[v.object,v.hit]),...Array.from(utilityViews.values()).filter(v=>v.object.visible).map(v=>v.object),...animals.map(v=>v.obj),...(windmillRotor?.visible?[windmillRotor]:[]),...(farmLife?.targets()??[])];
 for(const hit of raycaster.intersectObjects(targets,true)){let obj=hit.object;while(obj){if(obj.userData.activity)return {type:'activity',id:obj.userData.activity};if(obj.userData.utility)return {type:'utility',id:obj.userData.utility};if(obj.userData.building)return {type:'building',id:obj.userData.building};if(Number.isInteger(obj.userData.plot))return {type:'plot',id:obj.userData.plot};obj=obj.parent;}}
 return null;
}
function addUtility(key,model,x,z,options){
 const object=cloneModel(model,x,z,options);object.userData.utility=key;
 const height=new THREE.Box3().setFromObject(object).max.y,info=utilityInfo[key];
 const label=document.createElement('button');label.className='utility-label';label.title=`${info.name} · ${info.hint}`;label.setAttribute('aria-label',`Open ${info.name}`);label.innerHTML=art(key);label.onclick=()=>openUtility(key);$('building-labels').append(label);
 utilityViews.set(key,{object,label,x:object.position.x,z:object.position.z,height});
}
function addBuilding(key,x,z,options){
 const object=cloneModel(BUILDINGS[key].model,x,z,options);object.userData.building=key;
 const bounds=new THREE.Box3().setFromObject(object),height=bounds.max.y;
 const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const hit=new THREE.Mesh(new THREE.BoxGeometry(size.x+.4,size.y+.3,size.z+.4),new THREE.MeshBasicMaterial({visible:false,side:THREE.DoubleSide}));
 hit.position.copy(center);hit.userData.building=key;scene.add(hit);hit.updateMatrixWorld(true);
 const outline=new THREE.BoxHelper(object,0xffdc76);outline.material.transparent=true;outline.material.opacity=.75;outline.visible=false;scene.add(outline);
 const label=document.createElement('button');label.className='building-label';label.setAttribute('aria-label',`Open ${BUILDINGS[key].name}`);
 label.innerHTML=`<span class="building-pin">${art(key==='familyhall'?'familyhall-model':key)}</span><span><strong>${BUILDINGS[key].name}</strong><small class="building-status" data-building-status="${key}">${key==='farmhouse'?'Expand your fields':'Ready to work'}</small></span>`;
 label.addEventListener('click',()=>economy.openBuilding(key));label.addEventListener('mouseenter',()=>highlight(key));label.addEventListener('mouseleave',()=>highlight(-1));label.addEventListener('focus',()=>highlight(key));label.addEventListener('blur',()=>highlight(-1));$('building-labels').append(label);
 buildingViews.set(key,{object,hit,outline,label,x:object.position.x,z:object.position.z,height});
}
function positionBuildingLabels(){
 for(const decor of familyDecor)decor.visible=buildingEligible(state,'familyhall');
 if(windmillRotor)windmillRotor.visible=buildingEligible(state,'windmill');
 farmLife?.position(camera,world.clientWidth,world.clientHeight,farmNow());
 for(const [key,v] of utilityViews){v.object.visible=featureUnlocked(state,key);const p=new THREE.Vector3(v.x,v.height+.3,v.z).project(camera);v.label.style.left=`${(p.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-p.y*.5+.5)*world.clientHeight}px`;v.label.hidden=!v.object.visible||Math.abs(p.x)>.94||Math.abs(p.y)>.82;}
 for(const [key,v]of buildingViews){v.object.visible=buildingEligible(state,key);v.hit.visible=v.object.visible;const p=new THREE.Vector3(v.x,v.height+.45,v.z).project(camera);v.label.style.left=`${(p.x*.5+.5)*world.clientWidth}px`;v.label.style.top=`${(-p.y*.5+.5)*world.clientHeight}px`;v.label.hidden=!v.object.visible||Math.abs(p.x)>.92||Math.abs(p.y)>.82;v.label.classList.toggle('ready',economy.status(key).kind==='ready');}
}
function expandVisuals(){if(!ready)return;createPlots();scenePolish?.sync();measureFarm();plots.forEach((_,i)=>drawCrop(i));renderer.shadowMap.needsUpdate=true;resize();icons();}
function bindUI(){
 document.querySelectorAll('[data-tool]').forEach(b=>b.addEventListener('click',()=>setTool(b.dataset.tool)));
 document.querySelectorAll('[data-crop]').forEach(b=>b.addEventListener('click',()=>setCrop(b.dataset.crop)));
 $('market-button').addEventListener('click',()=>openDialog('market-dialog'));
 $('help-button').addEventListener('click',()=>{renderFarmGuide(state);openDialog('help-dialog');});
 $('farm-button').addEventListener('click',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());resetView();toast('Back to the heart of your farm.');});
 document.querySelectorAll('.close-dialog').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 $('sell-all').addEventListener('click',()=>sell());
 const toggleQuest=()=>{if(mobileLayout.matches){beginner.open();return;}const hidden=!$('quest-body').hidden;$('quest-body').hidden=hidden;$('quest-collapse').setAttribute('aria-expanded',String(!hidden));$('quest-collapse').setAttribute('aria-label',hidden?'Expand quest':'Collapse quest');$('quest-collapse').innerHTML=`<i data-lucide="${hidden?'clipboard-check':'chevron-up'}"></i>`;icons();};
 $('quest-collapse').addEventListener('click',toggleQuest);
 document.querySelector('.quest-heading')?.addEventListener('click',event=>{if(event.target.closest('#quest-collapse'))return;if(mobileLayout.matches)beginner.open();});
 soundUI=createSoundSettings(farmAudio);
 document.addEventListener('visibilitychange',()=>productionSounds.reset(state.buildings,farmNow()));
 $('zoom-in').addEventListener('click',()=>zoomFarm(zoom+.15));$('zoom-out').addEventListener('click',()=>zoomFarm(zoom-.15));$('zoom-reset').addEventListener('click',resetView);$('fields-view').addEventListener('click',focusFields);$('zoom-fit').addEventListener('click',showOverview);
 window.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]')||e.ctrlKey||e.metaKey||e.altKey)return;const t={1:'plant',2:'water',3:'harvest',4:'tend'}[e.key];if(t){e.preventDefault();setTool(t);}});
 familyUI=createFamilyUI({state,runAction,notify:toast,isReady:()=>ready});
 economy=createEconomyUI({state,onFamily:()=>familyUI.open(),onChange:updateUI,onCrop:setCrop,onExpand:expandVisuals,notify:toast,runAction,onEstate:section=>growth.open(section)});
 retention=createRetentionUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,getCrop:()=>selectedCrop,itemList:economy.itemList});
 growth=createGrowthUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast,itemList:economy.itemList,onPlant:key=>economy.chooseCrop(key)});
 boosts=createBoostsUI({state,runAction,onChange:()=>{expandVisuals();updateUI();},notify:toast});
 quests=createQuestsUI({state,claim,icons});
 activities=createActivitiesUI({state,runAction,notify:toast,onResult:(action,result)=>{if(action.type==='activity_work'){farmLife?.celebrate(action.station);}}});
 beginner=createBeginnerUI({state,runAction,icons,notify:toast,onChange:updateUI,guide:target=>{
  if(['plant','water','harvest','tend'].includes(target)){if(target==='plant')setCrop('wheat');else setTool(target);focusFields();toast(target==='plant'?'Tap an empty field to plant wheat.':target==='tend'?'Tap a growing crop with a care marker.':target==='water'?'Tap a growing crop to water it.':'Tap a ready crop or its basket.');}
  else if(target==='eggs')economy.openMarket('goods');
  else if(target==='market')openDialog('market-dialog');
  else if(target==='produce')economy.openBuilding('coop');
  else if(target==='collect'){const key=Object.keys(state.buildings).find(k=>productionJobs(state.buildings[k]).some(j=>j.readyAt<=farmNow()))??Object.keys(state.buildings).find(k=>state.buildings[k].job)??'coop';economy.openBuilding(key);}
  else if(target==='today')retention.openToday();
  else if(target==='chores')growth.open('chores');
 }});
 progression=createProgressionUI({state,isReady:()=>ready&&$('loading').hidden});
 if(initialLevelReward?.levels.length)progression.announce({...progressionChange(progressionSnapshot(state),state,initialLevelReward),catchUp:true});
 mobileUI=createMobileUI({openUtility,resetView});
 $('save-status').onclick=()=>client.retry();
 new ResizeObserver(resize).observe(world);icons();
}
function frame(now){
 requestAnimationFrame(frame);if(!ready||document.hidden)return;
 if(now-lastFrame<32)return;const dt=Math.min((now-lastFrame)/1000,.1);lastFrame=now;
 if(now-lastTick>500){if(productionSounds.check(state.buildings,farmNow()))farmAudio.play('ready');plots.forEach((_,i)=>drawCrop(i));positionLabels();positionBuildingLabels();economy.tick();retention.tick();growth.tick();boosts.tick();activities.tick();icons();renderer.shadowMap.needsUpdate=true;lastTick=now;}
 if(!reducedMotion){
  if(windmillRotor)windmillRotor.rotation.z-=dt*.28;
  const t=clock.getElapsedTime();farmLife?.animate(t,dt,farmNow());scenePolish?.animate(t);
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.velocity.y-=dt*3;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.material.opacity=Math.max(0,p.life);if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();particles.splice(i,1);}}
 }
 renderer.render(scene,camera);
}
function registerAgentTools(){
 if(!document.modelContext?.registerTool)return;
 const lifecycle=new AbortController();
 const specs=[
  {name:'get_farm_state',title:'Inspect the farm',description:'Read coins, inventory, field IDs, growth and quests in your saved Harvest Tycoon farm.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>farmSummary(state)},
  {name:'work_farm_fields',title:'Plant, water or harvest fields',description:'Apply one farming action to the given fields. Planting spends coins; harvesting adds produce to inventory. Returns per-field results.',inputSchema:{type:'object',properties:{fieldIds:{type:'array',items:{type:'integer',minimum:0,maximum:MAX_PLOTS-1},minItems:1,maxItems:MAX_PLOTS,uniqueItems:true},action:{type:'string',enum:['plant','water','harvest','tend']},crop:{type:'string',enum:Object.keys(CROPS)}},required:['fieldIds','action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{
   if(!ready)throw new Error('The farm is still loading.');
   if(!input||!Array.isArray(input.fieldIds)||input.fieldIds.length<1||input.fieldIds.length>state.plots.length||new Set(input.fieldIds).size!==input.fieldIds.length||input.fieldIds.some(i=>!Number.isInteger(i)||i<0||i>=state.plots.length)||!['plant','water','harvest','tend'].includes(input.action)||input.crop!==undefined&&!Object.hasOwn(CROPS,input.crop))throw new Error('Invalid field IDs, action or crop.');
   if(input.crop)economy.chooseCrop(input.crop);setTool(input.action);
   return {results:await input.fieldIds.reduce(async(previous,id)=>[...await previous,{id,...await interact(id,input.action)}],Promise.resolve([])),farm:farmSummary(state)};
  }},
  {name:'sell_farm_harvest',title:'Sell harvested crops',description:'Sell all stored crops and goods, or all of one item, for coins at the market.',inputSchema:{type:'object',properties:{crop:{type:'string',enum:['all',...Object.keys(ITEMS)]}},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{const crop=input?.crop??'all';if(!['all',...Object.keys(ITEMS)].includes(crop))throw new Error('Invalid crop.');const result=await sell(crop);return {...result,farm:farmSummary(state)};}},
  {name:'start_farm_production',title:'Start a production batch',description:'Consume the ingredients and start a timed recipe in its farm building. Does not collect the finished goods.',inputSchema:{type:'object',properties:{recipe:{type:'string',enum:Object.keys(RECIPES)}},required:['recipe'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction({type:'produce',recipe:input?.recipe});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'collect_farm_production',title:'Collect a finished batch',description:'Collect finished goods from a building into inventory. Fails when the batch is not ready.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS).filter(k=>k!=='farmhouse')}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction({type:'collect',building:input?.building});updateUI();economy.openBuilding(result.building);return {...result,farm:farmSummary(state)};}},
  {name:'upgrade_farm_building',title:'Upgrade a farm building',description:'Spend coins to increase production speed, or expand the fields when building is farmhouse.',inputSchema:{type:'object',properties:{building:{type:'string',enum:Object.keys(BUILDINGS)}},required:['building'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!ready)throw new Error('The farm is loading.');const result=await runAction(input?.building==='farmhouse'?{type:'expand'}:{type:'upgrade',building:input?.building});expandVisuals();updateUI();economy.openBuilding(input.building);return {...result,farm:farmSummary(state)};}}
 ];
 for(const tool of specs){try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
async function init(){
 const loadingUI=createLoadingScreen(document,modelNames.length);
 bindUI();updateUI();
 try{
  renderer=new THREE.WebGLRenderer({antialias:!mobileLayout.matches,alpha:false,powerPreference:mobileLayout.matches?'low-power':'high-performance'});
  renderer.setClearColor(0xf3dda6);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  world.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive farm. Use Tab to move between fields, and Enter to work a field.');
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();ready=false;$('error-message').textContent='The 3D view was interrupted. Reload to return to your saved farm.';$('error').hidden=false;});
  scene=new THREE.Scene();camera=new THREE.OrthographicCamera(-25,25,17,-17,.1,180);
  const hemi=new THREE.HemisphereLight(0xffedc0,0x8a7a4a,2.35);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffd9a0,3.05);sun.position.set(-24,26,15);sun.castShadow=true;sun.shadow.mapSize.set(mobileLayout.matches?1024:2048,mobileLayout.matches?1024:2048);sun.shadow.camera.left=-52;sun.shadow.camera.right=52;sun.shadow.camera.top=52;sun.shadow.camera.bottom=-52;sun.shadow.camera.near=1;sun.shadow.camera.far=125;sun.shadow.normalBias=.035;sun.shadow.bias=-.00012;sun.shadow.radius=3;scene.add(sun);scene.add(sun.target);
  scene.fog=new THREE.Fog(0xf3dda6,46,128);
  const loader=new GLTFLoader();let loaded=0;
  await Promise.all([client.load().then(()=>loadingUI.accountReady()),loadInBatches(modelNames,async name=>{
   const gltf=await loader.loadAsync(`/assets/models/${name}.glb`),object=gltf.scene;
   const box=new THREE.Box3().setFromObject(object),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
   object.position.sub(new THREE.Vector3(center.x,box.min.y,center.z));const group=new THREE.Group();group.add(object);
   object.traverse(n=>{if(n.isMesh){n.castShadow=true;n.receiveShadow=true;n.material.roughness=1;n.material.metalness=0;}});
   models.set(name,{object:group,size});loaded++;loadingUI.modelsReady(loaded);
  },4)]);
  decorate();createPlots();plots.forEach((v,i)=>v.cropGroup.userData.plot=i);plots.forEach((_,i)=>drawCrop(i));scenePolish=createScenePolish({scene,cloneModel,getPlots:()=>plots,reducedMotion,mobile:mobileLayout.matches,anisotropy:renderer.capabilities.getMaxAnisotropy()});measureFarm();resize();icons();
  renderer.domElement.addEventListener('pointermove',e=>{
   if(e.pointerType!=='mouse'||e.buttons){highlight(-1);$('tooltip').hidden=true;return;}
   const target=pointerTarget(e);highlight(target?.id??-1);const tooltip=$('tooltip');
   if(!target||e.pointerType==='touch'){tooltip.hidden=true;return;}
   tooltip.hidden=false;
   if(target.type==='activity'){const a=ACTIVE_STATIONS[target.id];tooltip.innerHTML=`<strong>${a.name}</strong><span>Hands-on job · coins & XP</span>`;}
   else if(target.type==='utility'){const u=utilityInfo[target.id];tooltip.innerHTML=`<strong>${u.name}</strong><span>${u.hint} · click to open</span>`;}
   else if(target.type==='building'){const b=BUILDINGS[target.id];tooltip.innerHTML=`<strong>${b.name}</strong><span>${economy.status(target.id).text} · click to open</span>`;}
   else{const p=state.plots[target.id];tooltip.innerHTML=`<strong>${p.crop?CROPS[p.crop].name:'Empty field'}</strong><span>${!p.crop?`Plant ${CROPS[selectedCrop].name.toLowerCase()} · ${seedCost(state,selectedCrop)} coins`:farmNow()>=p.readyAt?'Ready to harvest!':`${formatDuration(p.readyAt-farmNow())} · ${harvestYield(p)} crop${harvestYield(p)>1?'s':''}${!p.tended&&farmNow()>=p.careAt?' · extra care ready':p.tended?' · fully cared for':' · water & care for more'}`}</span>`;}
   const r=world.getBoundingClientRect();tooltip.style.left=`${Math.min(r.width-130,Math.max(130,e.clientX-r.left))}px`;tooltip.style.top=`${e.clientY-r.top-16}px`;
  });
  renderer.domElement.addEventListener('pointerleave',()=>{highlight(-1);$('tooltip').hidden=true;});
  const canvas=renderer.domElement;
  bindFarmInput({canvas,isReady:()=>ready,pick:pointerTarget,
   open:target=>{if(target.type==='plot')interact(target.id);else if(target.type==='building')economy.openBuilding(target.id);else if(target.type==='utility')openUtility(target.id);else if(target.type==='activity')activities.open(target.id);},
   pan:(dx,dy)=>{
    const shift=cameraDragDelta(dx,dy,camera.right-camera.left,camera.top-camera.bottom,world.clientWidth,world.clientHeight);
    panFarm(shift.side,shift.depth);
   },
   zoom:ratio=>zoomFarm(zoom*ratio)
  });
  ready=true;positionBuildingLabels();updateUI();const ripe=state.plots.filter(p=>p.crop&&p.readyAt<=farmNow()).length;if(state.stats.harvested>0)toast(`Welcome back! ${ripe?`${ripe} crops are ready to harvest.`:'Your farm is right where you left it.'}${initialChapterReward?.diamonds?` Completed chapters: +${initialChapterReward.diamonds} diamonds!`:''}`);renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);loadingUI.complete();$('loading').classList.add('fade');registerAgentTools();requestAnimationFrame(frame);
  await new Promise(resolve=>setTimeout(()=>{$('loading').hidden=true;progression.refresh();resolve();},450));
  return ready;
 }catch(error){console.error('Farm initialization failed',error);if(renderer)$('error-message').textContent=error.message||'Your saved farm could not load. Please try again.';$('loading').hidden=true;$('error').hidden=false;if(!renderer)$('error-message').textContent='This game needs WebGL 2. Try a current browser with hardware acceleration enabled.';return false;}
}
export const farmReady=init();
