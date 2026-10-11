import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {PALETTE_VERSION} from './model-atlas.js';
import {sharePalette} from './model-atlas.js';

// World II, The Village (30 Sep 2026): the village of the ITHappy Studios Village pack, as its own scene. One GLB holds every model
// once (meshopt-compressed, one shared palette texture) and a layout says where each stands (scripts/build-village.mjs); each model
// is drawn as one InstancedMesh, so the 930 trees, rocks and houses cost about 200 draws instead of 1,200. The objects that are not
// a separate model of the pack are in the GLB as they stand (the "static" node). About 5.3 MB, loaded only when a level-100 farmer
// travels to the village, and village-extras.glb (about 410 KB) once it is on screen.
export const VILLAGE_SIZE=170;   // the village's longest side in game units (the farm is about 55 wide)
// Where the village's places stand, in game units after VILLAGE_SIZE (x, the roof's height less a little, z), and the road back to the
// farm. The places of Oct 2026 are names on houses that already stand in village.glb (0 KB, the owner's plan for levels 100-200).
// 11 Oct 2026 (the owner's review of the whole village): the Village Fields' name stands over the plot's west corner, so the Wind pump
// behind the plot's north edge shows beside it (over the plot's middle the name covered the pump's wheel); the Village Windmill's name
// is a little lower, clear of the Mine's in the whole-village view of a 1280 x 720 screen (they touched).
export const VILLAGE_PLACES=Object.freeze({
 mine:{x:32,y:14.5,z:-22.3},
 lumbercamp:{x:9.6,y:9.2,z:19.4},
 smithy:{x:40.4,y:10,z:-14.2},
 villagemill:{x:28,y:10.6,z:-17.6},
 villagefields:{x:11.2,y:7,z:-13.8},
 canteen:{x:27.7,y:9.3,z:-8.5},
 kiln:{x:-12,y:7.3,z:1.8},
 linenloft:{x:-21.9,y:9.1,z:14.2},
 soapmaker:{x:-19.9,y:8.8,z:-5.1},
 pier:{x:7.1,y:7.2,z:-3.6},
 jeweller:{x:43.3,y:9.8,z:-8.4}
});
// The market square's pin (11 Oct 2026, the owner's review) stands on the square's west half: on its middle it touched the Jeweller's name.
export const VILLAGE_UTILITIES=Object.freeze({
 villagemarket:{x:37.1,y:8.4,z:-6.2},
 farmroad:{x:.6,y:6.7,z:-21}
});
// The places across the lake or past the west shore (Oct 2026): an upright phone's first view is the village's own side; these are a swipe away.
export const VILLAGE_FAR_SIDE=Object.freeze(['lumbercamp','kiln','linenloft','soapmaker','pier']);
// The computer's first view and the whole-village view are measured round the places of 30 Sep 2026, as the owner approved them: the
// later places all stand inside that frame or a pan away, and measuring them too moved the first view west past the Mine and the Smithy.
export const VILLAGE_FRAME=Object.freeze(['mine','lumbercamp','smithy','villagemill','villagemarket','farmroad']);
// Where each landmark of the levels 165-200 stands (its pin and Show me), in game units: x and z the middle of its model, and y such that
// its pin's point (y + 3.3, as game.js places a pin) is half a unit over the model's top (11 Oct 2026, the owner's review: the Wind pump's
// pin floated in the rocks over its wheel, the Stone quay's high over the water). The Lookout's stays a unit over its roof: any lower and
// Show me on a phone on its side, which cannot look further south there, lost its pin under the bottom edge. The Longhouse stands alone
// on the east meadow by the lake: by the western hamlet its pin covered the Linen Loft's. 10 Oct 2026 (review fixes): the Great Hall
// stands on the hill south-west of the square; in front of the square's south houses the near mountain hid all of it from the game's
// camera, which looks one way on every screen. Later that day the Great Hall and the Stone quay got bigger models (VILLAGE_EXTRAS): the
// Hall's spot is its bell tower, the quay's the middle of the quay, out on the water.
export const VILLAGE_LANDMARK_SPOTS=Object.freeze({
 windpump:{x:13.25,y:8.71,z:-20.75},
 longhouse:{x:16.25,y:6.84,z:3.5},
 stonequay:{x:5.9,y:4.57,z:3.9},
 lookout:{x:38,y:8.7,z:6},
 greathall:{x:30.5,y:10.22,z:-.2}
});
// World II's props and landmarks (Oct 2026): [model of village-extras.glb, x, y, z, turn, size], game units; size 1 is the pack's own next
// to the village's houses. A place's pieces show once it is built (game.js syncVillageExtras), a landmark once it is the next one (greyed)
// or finished (placeLandmarks).
export const VILLAGE_EXTRAS=Object.freeze({
 mine:[['Building_034',30.5,10,-22.45,-1.5708,1.3],['props_048',30.65,9.99,-20.75,.4,1],['props_048',30.4,9.99,-21,1.1,1]],
 lumbercamp:[['props_033',9.6,9.41,20.4,0,1],['props_008',10.1,9.11,18.9,1.5708,1],['props_072',8.6,9.42,20.9,0,1],['Building_021',8.1,9.2,19.65,0,1]],
 canteen:[['props_054',26.7,7.75,-10.75,0,1],['props_044',26.2,7.79,-10.75,0,1],['props_044',26.45,7.77,-11,.8,1]],
 kiln:[['props_063',-16.75,7.77,2.25,0,1],['props_073',-16.75,7.75,1.25,0,1],['props_056',-16.5,7.73,2.75,0,1],['props_057',-17.25,7.8,2,.5,1],['props_059',-17,7.75,2.75,1,1],['props_061',-17.5,7.83,1.75,0,1]],
 linenloft:[['props_034',-23,7.82,16,0,1],['props_034',-23.75,7.87,15.25,0,1]],
 soapmaker:[['props_039',-19.4,7.81,-4.1,0,1],['props_039',-18.9,7.84,-4.6,.7,1]],
 pier:[['props_070',11.55,7.08,-4.15,0,1]],
 jeweller:[['props_062',43.75,8.24,-7.2,-.6,1]],
 // The Wind pump (11 Oct 2026) a quarter of a unit further north-east, clear of the Fields' name and of the plot's first row.
 windpump:[['Building_022',13.25,7.84,-20.75,0,1]],
 longhouse:[['Building_017_012',16.25,7.96,3.5,0,1.2]],
 // The Stone quay (10 Oct 2026, the owner's review: the pier on posts read as wood): slabs of the stone steps in front of the village's
 // houses (foundation_010) jutting into the lake south of the big pier, faced and backed with dry-stone walls, goods by the shore and a boat.
 stonequay:[
  ['foundation_010',6.75,6.6,4.19,0,1.3],['foundation_010',6.75,6.6,3.61,3.1416,1.3],['foundation_010',5.87,6.6,4.19,0,1.3],['foundation_010',5.87,6.6,3.61,3.1416,1.3],['foundation_010',4.99,6.6,4.19,0,1.3],['foundation_010',4.99,6.6,3.61,3.1416,1.3],
  ['stones_015',5.87,6.71,3.41,0,1.3],['stones_015',6.25,6.54,4.54,0,1.3],['stones_015',5.49,6.53,4.57,3.1416,1.3],['props_055',6.64,6.87,3.73,0,1.3],['props_018',6.99,6.87,3.81,.3,1.3],['props_018',7.01,7.06,3.83,.6,1.3],['props_044',7.05,6.87,4.05,0,1.3],['props_022',6,6.87,3.79,.2,1.3],['props_023',5.68,6.65,4.95,1.5708,1.3]],
 lookout:[['Building_005',38,8.96,6,0,1]],
 // The Great Hall (10 Oct 2026, the owner's review: it was one more house of the square): the pack's house parts, as the village's own
 // houses are built, made into two wings and a bell tower of three storeys under a cross roof, on stone footings with a porch and steps
 // towards the square. The tower stands 3 units tall, the square's houses 1.8.
 greathall:[
  ['Building_Angle_002',30.5,10.19,-.2,0,1.2],['Building_Angle_002',30.5,10.19,-.2,3.1416,1.2],['Building_Angle_002',30.5,10.96,-.2,0,1.2],['Building_Angle_002',30.5,10.96,-.2,3.1416,1.2],['Building_Angle_002',30.5,11.73,-.2,0,1.2],['Building_Angle_002',30.5,11.73,-.2,3.1416,1.2],['Building_Angle_Roof_002',30.5,11.73,-.2,0,1.2],['Building_Angle_Roof_002',30.5,11.73,-.2,3.1416,1.2],
  ['Building_Window_002',30.5,10.19,.87,0,1.2],['Building_Door_002',30.5,10.19,1.79,0,1.2],['Building_Roof_002',30.5,10.19,.87,0,1.2],['Building_Roof_002',30.5,10.19,1.79,0,1.2],['foundation_002',30.5,9.97,1.35,1.5708,1.2],
  ['Building_Window_002',30.5,10.19,-1.27,3.1416,1.2],['Building_Door_002',30.5,10.19,-2.19,3.1416,1.2],['Building_Roof_002',30.5,10.19,-1.27,3.1416,1.2],['Building_Roof_002',30.5,10.19,-2.19,3.1416,1.2],['foundation_002',30.5,9.97,-1.75,1.5708,1.2],
  ['foundation_002',30.5,9.97,-.2,0,1.2],['Building_Small_Window_002',30.73,11.07,-.2,0,1.2],['Building_Small_Window_002',30.5,11.07,.03,-1.5708,1.2],['Building_Canopy_002',31.43,10.19,-.2,1.5708,1.2],['foundation_010',31.88,9.97,-.2,1.5708,1.2]]
});
// How far the camera may look (7 Oct 2026): past the ring of mountains is the empty sky colour (on a phone it showed as a pale strip
// under the valley). From the game's angle the village fills an oval on the screen round the valley, and the view never leaves this
// ellipse inside it: x, y its middle, rx, ry its half-width and half-height, in game units on the screen (x across as (x-z)/sqrt(2),
// y up as (72y-40(x+z))/sqrt(8384), as game.js measures the farm). Measured from a render of the whole village, with a unit and a
// half to spare all round; a new village.glb means measuring it again.
export const VILLAGE_VIEW=Object.freeze({x:5,y:8,rx:68,ry:44});
// The cloud shadows' sheet (farm-atmosphere.js) just above the village's highest ground (hills to 12.7, rocks and trees to 15.7), so
// the clouds drift over the whole valley; on the farm's height (.28) it lay under the hills. Only the mountain tops rise through it.
export const VILLAGE_CLOUD_HEIGHT=16;
// The look of the loading screen's painted village (6 Oct 2026): fresh green meadows, deeper trees and a clear blue lake; since
// 7 Oct 2026 as sunny and cheerful as the farm (its light, its palette grade: livelier trees, and a lighter blue lake).
// The pack's hills and the grass edges of its paths sit on the seam between a green and a yellow cell of the palette (564 of
// 1024 px across, the cells are 94 px), so the texture filter painted them two-fifths yellow: the lime meadows. They now read
// the palette's white cell and carry their green in the vertex colours, times the baked shade, one green per row of the pack's
// greens (row 4 its deepest, 7 its lightest). Nothing else in the village reads that seam.
// The greens are the farm's grass: the sunlit meadow renders like the farm's lit grass in the same light, one valley; the pack's
// own greens made a saturated golf-course green (hue 97) beside it. Set again for the farm's sunny light of 7 Oct 2026: at noon
// the meadow renders #a3d259 (hue 83, lightness .59) against the farm's #a1d253 (hue 83, .58), on phones #a1d058 against #a1cf5b.
// Rows 5-7 lighter than the farm's ground colour (game.js), as the baked shade darkens them again; the trees keep the palette's green.
export const VILLAGE_GRASS=Object.freeze({4:0x82b656,5:0x95c560,6:0xaacf6d,7:0xbcd97b});
// The mountains' haze is the farm's (scene-polish.js, 0xe2ead0) since 6 Oct 2026, so both worlds' mountains fade into the same
// air: the cool sky white before it faded them toward blue against the valley's green-white sky. The lake (7 Oct 2026) is halfway
// between the pack's pale cyan (0x80deea) and the clear blue of 6 Oct (0x2898f2), as the farm's pond went from mint to 0x4eb1d2.
export const VILLAGE_LAKE=0x54bbee,VILLAGE_HAZE=0xe2ead0;
const PALETTE_PX=1024,CELL=94,SEAM=564,WHITE=[893/PALETTE_PX,982/PALETTE_PX];
const grassTints=new Map(Object.entries(VILLAGE_GRASS).map(([row,hex])=>[Number(row),new THREE.Color(hex)]));   // linear, as vertex colours are
function freshGrass(g){
 let uv=g.getAttribute('uv'),own=false;const colour=g.getAttribute('color');if(!uv||!colour)return;
 for(let i=0;i<uv.count;i++){
  if(Math.abs(uv.getX(i)*PALETTE_PX-SEAM)>1.5)continue;
  const tint=grassTints.get(Math.floor(uv.getY(i)*PALETTE_PX/CELL));if(!tint)continue;
  // Parts with the same texture coordinates share them (one accessor in the file): each gets its own copy before it changes,
  // or the next part would no longer find the seam and stay white.
  if(!own){uv=uv.clone();own=true;g.setAttribute('uv',uv);}
  uv.setXY(i,WHITE[0],WHITE[1]);colour.setXYZ(i,colour.getX(i)*tint.r,colour.getY(i)*tint.g,colour.getZ(i)*tint.b);
 }
}
export async function loadVillage({onProgress}={}){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const [gltf,layout,palette]=await Promise.all([
  loader.loadAsync('/assets/village/village.glb',event=>{if(event.total)onProgress?.(event.loaded/event.total);}),
  fetch('/assets/village/village-layout.json').then(r=>{if(!r.ok)throw new Error('The village could not load.');return r.json();}),
  // village.glb carries its own copy of the pack's palette; the village paints from village-palette.png instead (6 Oct 2026),
  // the one its props on the farm use, graded like the farm's palette (7 Oct 2026: livelier greens, a touch fuller colours) and
  // versioned past a day-old cache. Without it the village keeps its own copy.
  new THREE.ImageLoader().loadAsync(`/assets/models/village-palette.png?v=${PALETTE_VERSION}`).catch(()=>null)
 ]);
 if(palette){const maps=new Set();gltf.scene.traverse(o=>{if(o.isMesh&&o.material.map)maps.add(o.material.map);});for(const map of maps){map.image?.close?.();map.image=palette;map.needsUpdate=true;}}
 const world=new THREE.Group();gltf.scene.updateMatrixWorld(true);
 // Finished like the farm's models (Oct 2026; game.js loadModel, scene-polish.js mountainRing): the baked shade (_SHADE, one byte a
 // vertex, scripts/build-village.mjs) becomes the grey vertex colours the farm's models carry, and every material is matte (the
 // pack's roughness .5 gave roofs and hills a plastic sheen). The mountains below fade toward the sky like the farm's, with half its
 // haze (.12): they stand right around the valley and fill half the screen, and the farm's .24 turned them chalk-white and flat.
 // The palette the houses paint from is kept for the extras (Oct 2026), so they need no picture of their own.
 let paletteMap=null;
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;const g=o.geometry,s=g.getAttribute('_shade');
  if(s){const c=new Uint8Array(s.count*4);for(let i=0;i<s.count;i++){c[i*4]=c[i*4+1]=c[i*4+2]=Math.round(s.getX(i)*255);c[i*4+3]=255;}g.setAttribute('color',new THREE.BufferAttribute(c,4,true));g.deleteAttribute('_shade');freshGrass(g);}
  o.material.roughness=1;o.material.metalness=0;o.material.vertexColors||=Boolean(g.getAttribute('color'));
  // The pack's water (its "Transparent" material: the lake and the stream down the mountains) was the palette's pale cyan at half
  // strength, a milky green over the lake bed: now a sunny blue with a little of the sun on it, like the farm's pond.
  paletteMap??=o.material.name!=='Transparent'?o.material.map:null;
  if(o.material.name==='Transparent'){o.material.map=null;o.material.color.setHex(VILLAGE_LAKE);o.material.opacity=.85;o.material.roughness=.35;}
 });
 // The farm's haze colour at half its strength (6 Oct 2026): the village's grey mountains then render in the farm's mountain tone
 // (7 Oct 2026 at noon: lightness about .69 against the farm's .67, a touch greyer); at the farm's full .24 they went chalk-white.
 const haze=new Map(),hazy=m=>{if(!haze.has(m)){const h=m.clone();h.emissive=new THREE.Color(VILLAGE_HAZE);h.emissiveIntensity=.12;haze.set(m,h);}return haze.get(m);};
 const parts=new Map();for(const node of gltf.scene.children){if(node.name==='static')continue;const list=[];node.traverse(o=>{if(o.isMesh)list.push(o);});parts.set(node.name,list);}
 const byModel=new Map();for(const p of layout)(byModel.get(p.a)??byModel.set(p.a,[]).get(p.a)).push(p.m);
 const flip=new THREE.Matrix4().makeScale(-1,1,1);
 for(const [name,mats] of byModel)for(const mesh of parts.get(name)??[]){
  const all=mats.map(m=>new THREE.Matrix4().fromArray(m).multiply(mesh.matrixWorld)),mountain=/^mountains_/.test(name);
  // A mirrored object (negative scale in the pack's scene) turns its triangles round. three.js handles that for an ordinary mesh,
  // not per instance: the mirrored ones get an InstancedMesh that is itself mirrored, each instance un-mirrored by the same flip,
  // so the triangles face the camera and the light falls on the right side.
  for(const mirrored of [false,true]){
   const list=all.filter(m=>(m.determinant()<0)===mirrored);if(!list.length)continue;
   const im=new THREE.InstancedMesh(mesh.geometry,mountain?hazy(mesh.material):mesh.material,list.length);im.name=name;if(mirrored)im.scale.set(-1,1,1);
   list.forEach((m,i)=>im.setMatrixAt(i,mirrored?flip.clone().multiply(m):m));
   // The mountains (34) cast no shadow, as on the farm: the rim of the valley only threw coarse shade onto it.
   im.castShadow=!mountain;im.receiveShadow=true;im.computeBoundingSphere();world.add(im);
  }
 }
 const statics=gltf.scene.getObjectByName('static');
 if(statics){statics.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});world.add(statics);}
 // Scale the pack's scene (metres, about a kilometre across) to the game: its longest side VILLAGE_SIZE, centred, its lowest
 // point at 0, as in the preview the places were measured in.
 const box=new THREE.Box3().setFromObject(world),size=box.getSize(new THREE.Vector3()),s=VILLAGE_SIZE/Math.max(size.x,size.z);
 const centre=box.getCenter(new THREE.Vector3()).multiplyScalar(s);
 world.scale.setScalar(s);world.position.set(-centre.x,-box.min.y*s,-centre.z);world.updateMatrixWorld(true);
 world.userData={scale:s,palette:paletteMap};
 return world;
}
// One model's part of village-extras.glb, moved to where it stands, as plain arrays the merge can join: the shade (_SHADE, one byte a
// vertex) becomes the grey vertex colours the village carries; positions, normals and palette coordinates become plain floats.
function placed(g,matrix){
 const position=g.getAttribute('position'),normal=g.getAttribute('normal'),uv=g.getAttribute('uv'),shade=g.getAttribute('_shade'),n=position.count;
 const pos=new Float32Array(n*3),nor=new Float32Array(n*3),tex=new Float32Array(n*2),col=new Uint8Array(n*4),v=new THREE.Vector3(),turn=new THREE.Matrix3().getNormalMatrix(matrix);
 for(let i=0;i<n;i++){
  v.fromBufferAttribute(position,i).applyMatrix4(matrix).toArray(pos,i*3);v.fromBufferAttribute(normal,i).applyMatrix3(turn).normalize().toArray(nor,i*3);
  tex[i*2]=uv.getX(i);tex[i*2+1]=uv.getY(i);col[i*4]=col[i*4+1]=col[i*4+2]=Math.round(shade.getX(i)*255);col[i*4+3]=255;
 }
 const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));
 out.setAttribute('uv',new THREE.BufferAttribute(tex,2));out.setAttribute('color',new THREE.BufferAttribute(col,4,true));out.setIndex(Array.from(g.index.array));return out;
}
// The extras (Oct 2026), only in the village and after it is on screen: each place's or landmark's pieces merged into one mesh (one draw),
// painted with the village's own palette, matte like the rest, all hidden until game.js shows them. A file that does not come (a deploy
// going live, a day-old "not found" in the cache) is asked for once more past the cache, as game.js fetchModel does.
// A landmark clears its ground (10 Oct 2026, review fix: a tree's crown came through the Longhouse's roof): every village tree that reaches
// into its footprint above the ground goes while the landmark shows (greyed or finished), and is back when it does not. showLandmark does both.
// The three trees that stand in the village as they are (the "static" node, not a model drawn in many places) count too: one stood
// where the Great Hall's north wing is (10 Oct 2026). Such a tree is [mesh, -1, null] and is hidden whole.
const EXTRAS_URL='/assets/village/village-extras.glb',GONE=new THREE.Matrix4().makeScale(0,0,0);
function treesUnder(village,mesh){
 mesh.geometry.computeBoundingBox();const foot=mesh.geometry.boundingBox.clone().expandByScalar(-.1);foot.min.y+=.3;
 const trees=[],m=new THREE.Matrix4(),box=new THREE.Box3();village.updateMatrixWorld(true);
 village.traverse(o=>{
  if(!o.isMesh||!/^Tree_/.test(o.name))return;
  if(!o.isInstancedMesh){if(box.setFromObject(o).intersectsBox(foot))trees.push([o,-1,null]);return;}
  if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();
  for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);if(box.copy(o.geometry.boundingBox).applyMatrix4(m).applyMatrix4(o.matrixWorld).intersectsBox(foot))trees.push([o,i,m.clone()]);}
 });
 return trees;
}
export async function loadVillageExtras(village){
 const loader=new GLTFLoader();loader.setMeshoptDecoder(MeshoptDecoder);
 const gltf=await loader.loadAsync(EXTRAS_URL).catch(()=>loader.loadAsync(`${EXTRAS_URL}?fresh=${Date.now()}`));gltf.scene.updateMatrixWorld(true);
 const models=new Map(gltf.scene.children.map(node=>[node.name,node])),{scale,palette}=village.userData;
 const material=new THREE.MeshStandardMaterial({map:palette,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
 const group=new THREE.Group(),places=new Map(),landmarks=new Map(),at=new THREE.Matrix4(),turn=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 for(const [key,pieces] of Object.entries(VILLAGE_EXTRAS)){
  const parts=[];
  for(const [name,x,y,z,rotation,size] of pieces){const node=models.get(name);if(!node)continue;
   at.compose(new THREE.Vector3(x,y,z),turn.setFromAxisAngle(up,rotation),new THREE.Vector3(1,1,1).multiplyScalar(scale*size));
   node.traverse(o=>{if(o.isMesh)parts.push(placed(o.geometry,new THREE.Matrix4().multiplyMatrices(at,o.matrixWorld)));});}
  if(!parts.length)continue;
  const landmark=Object.hasOwn(VILLAGE_LANDMARK_SPOTS,key),mesh=new THREE.Mesh(mergeGeometries(parts),material);
  mesh.name=`${landmark?'landmark':'extras'}-${key}`;mesh.visible=false;mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);(landmark?landmarks:places).set(key,mesh);
  if(landmark)mesh.userData.trees=treesUnder(village,mesh);
 }
 const showLandmark=(key,shown)=>{
  const mesh=landmarks.get(key);if(!mesh)return;mesh.visible=shown;
  for(const [trees,i,m] of mesh.userData.trees){if(i<0){trees.visible=!shown;continue;}trees.setMatrixAt(i,shown?GONE:m);trees.instanceMatrix.needsUpdate=true;}
 };
 return {group,places,landmarks,showLandmark};
}
// The Village Fields' rows (Oct 2026): the farm's own crop models at a third of their size, in four strips on the bare plot by the hay
// barns, each from the moment the Fields can sow it. Flax, lavender and saffron wear one colour of the pack's palette: a tint multiplied
// over the green leaves turned them grey-green. The plot: its corner (x, z) and its long side's direction; 9.41 by 7.07.
export const VILLAGE_FIELD_PLOT=Object.freeze({x:10.29,z:-21.24,ax:.996,az:.088});
export const VILLAGE_FIELD_CROPS=Object.freeze({
 lavender:Object.freeze({strip:0,model:'plant_004',height:.21,color:0x9470d2}),
 potatoes:Object.freeze({strip:1,model:'plant_005',height:.165,color:null}),
 flax:Object.freeze({strip:2,model:'plant_004',height:.21,color:0x5cb6fe}),
 saffron:Object.freeze({strip:3,model:'plant_005',height:.165,color:0xb299df})
});
// A strip's 45 places: 3 rows of 15 along the plot, a little out of line so they look sown by hand.
export function villageFieldSpots(strip){
 const p=VILLAGE_FIELD_PLOT,out=[];
 for(let r=0;r<3;r++)for(let i=0;i<15;i++){
  const n=strip*45+r*15+i,a=.7+i*8.01/14+((n*37)%11/10-.5)*.12,b=.9+strip*1.4675+r*.435+((n*53)%7/6-.5)*.1;
  out.push({x:p.x+p.ax*a-p.az*b,z:p.z+p.az*a+p.ax*b,yaw:(n*2.4)%(2*Math.PI)});
 }
 return out;
}
// A plant stands only where the plot's soil is on top: where the two hills rise over its edge there is none.
export async function createVillageFields(village){
 const loader=sharePalette(new GLTFLoader()),names=[...new Set(Object.values(VILLAGE_FIELD_CROPS).map(c=>c.model))];
 const models=new Map(await Promise.all(names.map(async name=>[name,await loader.loadAsync(`/assets/models/${name}.glb`)])));
 const soil=['landscape_004','hill_008001','hill_009001'].map(name=>village.getObjectByName(name)).filter(Boolean);
 const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),m=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),group=new THREE.Group(),strips=new Map();
 for(const [crop,c] of Object.entries(VILLAGE_FIELD_CROPS)){
  let mesh=null;models.get(c.model).scene.traverse(o=>{if(!mesh&&o.isMesh)mesh=o;});
  const g=mesh.geometry.clone();g.computeBoundingBox();const b=g.boundingBox,k=c.height/(b.max.y-b.min.y);g.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);
  const material=mesh.material.clone();material.roughness=1;material.metalness=0;material.vertexColors=Boolean(g.getAttribute('color'));
  if(c.color!=null){material.map=null;material.color.setHex(c.color);}
  const spots=[];
  for(const s of villageFieldSpots(c.strip)){ray.set(new THREE.Vector3(s.x,40,s.z),down);const hit=ray.intersectObjects(soil,true)[0];if(hit?.object.name==='landscape_004')spots.push([s,hit.point.y+.01]);}
  const rows=new THREE.InstancedMesh(g,material,spots.length);rows.name=`fields-${crop}`;rows.visible=false;rows.receiveShadow=true;
  spots.forEach(([s,y],i)=>rows.setMatrixAt(i,m.compose(new THREE.Vector3(s.x,y,s.z),q.setFromAxisAngle(up,s.yaw),new THREE.Vector3(k,k,k))));
  rows.computeBoundingSphere();group.add(rows);strips.set(crop,rows);
 }
 return {group,show:open=>{for(const [crop,rows] of strips)rows.visible=open(crop);}};
}
