import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// scenery.js and scene-polish.js import 'three' by name, as the browser's import map does: here it is the copy the game ships.
const {registerHooks}=nodeModule,three=new URL('../public/vendor/three.module.js',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?three:specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// 6 Oct 2026: "meer leven", the abundance of the loading screen's painted valley, from models the farm already loads, where players
// look (the home view), within a fixed number of triangles, and fuller: bushes 0.8 to 1.2 tall, sunflower clumps of 5 to 7.
test('more life: bushes, white and yellow wildflowers, sunflowers and three bales, instanced, within a triangle budget, a phone lighter',()=>{
 const scenery=read('public/scenery.js'),polish=read('public/scene-polish.js');
 assert.match(scenery,/import \{wildflowers\} from '\.\/scene-polish\.js';/,'one wildflower for the meadow and the edges');
 assert.match(scenery,/instanced\('hay_001',bales\);\n if\(blooms\.length\)group\.add\(wildflowers\(blooms\)\);/,'one draw call for the bales, one for the flowers');
 assert.match(scenery,/const thin=mobile\?\.7:1;/,'a phone gets about two thirds, in its narrower view');
 assert.match(scenery,/const big=!mobile&&rand\(\)<\.02,name=big\?FRONT\[1\+Math\.floor\(rand\(\)\*3\)\]:'bush_001'/,'a phone only gets the light bush');
 assert.match(scenery,/let spent=0;const budget=mobile\?21000:56000;/,'a phone spends at most 21,000 triangles on it, a computer 56,000');
 assert.match(scenery,/const tall=small=>small\?\.72\+rand\(\)\*\.18:\.8\+rand\(\)\*\.4;/,'bushes 0.8 to 1.2 tall, smaller only where a full one has no room');
 assert.match(scenery,/sunflowers:\(x,z\)=>\{for\(let k=0,n=5\+Math\.floor\(rand\(\)\*3\);/,'sunflower clumps of 5 to 7');
 // The bales come before everything else, with their own generator: the same spots on a phone and a computer.
 const bales=scenery.indexOf('const hay=seeded(20261006)'),one=scenery.indexOf(' // 1. (Green hills');
 assert.ok(bales>0&&bales<one,'the bales are claimed first');
 assert.doesNotMatch(scenery.slice(scenery.indexOf(' // 8. More life')),/'bale'/,'no bale among the rest: the valley stays green');
 assert.match(polish,/group\.add\(wildflowers\(blooms\)\);/,'the meadow\'s own flowers are the same wildflower');
 assert.doesNotMatch(polish,/IcosahedronGeometry\(\.075/,'no more coloured beads');
});

test('the wildflower: petals and heart face up (a back face turns dark), 21 triangles, mostly white and yellow, only the petals tinted',{skip},async()=>{
 const THREE=await import(three),{wildflowerGeometry,wildflowers,wildflowerMaterial,BLOOM}=await import('../public/scene-polish.js');
 const geometry=wildflowerGeometry(),p=geometry.attributes.position.array,a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
 assert.equal(p.length/9,21);
 for(let i=0;i<p.length;i+=9){
  a.fromArray(p,i);b.fromArray(p,i+3);c.fromArray(p,i+6);
  const up=b.clone().sub(a).cross(c.clone().sub(a)).y;
  if(Math.min(a.y,b.y,c.y)>=.24)assert.ok(up>0,`petal or heart triangle ${i/9} faces down`);
 }
 // The petal mask: 1 on the ten petals (the white corners), 0 on the stem, the leaves and the heart, which keep their own colour.
 const mask=geometry.attributes.petal.array,colour=geometry.attributes.color.array;
 assert.equal(mask.length,63);assert.equal(mask.filter(v=>v===1).length,30,'ten petals');
 for(let i=0;i<mask.length;i++)assert.equal(mask[i],colour[i*3]===1&&colour[i*3+1]===1&&colour[i*3+2]===1?1:0,`corner ${i}: only the white petals take the flower's colour`);
 const material=wildflowerMaterial(),shader={vertexShader:THREE.ShaderLib.lambert.vertexShader};material.onBeforeCompile(shader);
 assert.match(shader.vertexShader,/^\/\/ the petal mask of wildflowerGeometry\nattribute float petal;\n/);
 assert.match(shader.vertexShader,/vColor\.xyz\*=mix\(vec3\(1\.\),instanceColor\.xyz,petal\);/,'the instance colour only tints the petals');
 assert.doesNotMatch(shader.vertexShader,/vColor\.xyz \*= instanceColor\.xyz;/,'and never the whole flower');
 const light=BLOOM.filter(hex=>{const [r,g,b]=[hex>>16,hex>>8&255,hex&255];return r>240&&g>200&&b<=g;});
 assert.ok(light.length>=BLOOM.length*.7,'white and yellow, with a pink or lilac one now and then');
 const mesh=wildflowers([[1,2,1,0,0xffffff],[3,4,1.2,1,0xffd84a]]);
 assert.ok(mesh.isInstancedMesh&&mesh.count===2&&!mesh.material.side&&mesh.material.onBeforeCompile,'one instanced mesh, one-sided, petals tinted');
});

// A small farm with the real layout: a farmhouse, the dairy with a cow, the crops' two fences, a fence in the open, swaying trees,
// and a box for every model.
async function farm(){
 const THREE=await import(three),{anchorAt,FIELD_BLOCK}=await import('../public/farm-layout.js'),{SCENERY_MODELS}=await import('../public/scenery.js');
 const scene=new THREE.Scene(),material=new THREE.MeshLambertMaterial(),box=(w,h,d)=>new THREE.BoxGeometry(w,h,d).translate(0,h/2,0);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(600,600).rotateX(-Math.PI/2),material);ground.name='Farm ground';scene.add(ground);
 const add=(model,x,z,[w,h,d],data={})=>{const o=new THREE.Group();o.add(new THREE.Mesh(box(w,h,d),material));o.position.set(x,0,z);Object.assign(o.userData,{model,...data});scene.add(o);return o;};
 const places=[['farmhouse','house_010',[6,6,5]],['dairy','hangar_004',[7,4,6]]].map(([id,model,size])=>{const [x,z]=anchorAt(id);add(model,x,z,size,{building:id});return {x,z,height:size[1],size};});
 const cow=(()=>{const [x,z]=anchorAt('dairy');add('cow_001',x+5,z+4,[1.6,1.4,.8],{building:'dairy'});return [x+5,z+4];})();
 const crop=[FIELD_BLOCK.minX,FIELD_BLOCK.maxX].flatMap(x=>Array.from({length:15},(_,i)=>[x,-.3+i*2.2]));
 for(const [x,z] of crop)add('fence_008',x,z,[.12,1,2.2]);
 for(let i=0;i<6;i++)add('fence_001',-2+i*2.2,44,[2.2,1,.1]);
 const trees=[[-14,30],[14,-2],[-12,-2],[24,4],[2,40],[-20,18]].map(([x,z])=>add('tree_001',x,z,[3,5,3]));
 const models=new Map([...SCENERY_MODELS,'hay_001'].map(name=>{const g=new THREE.Group();g.add(new THREE.Mesh(box(1,1,1),material));return [name,{object:g,size:new THREE.Vector3(1,1,1)}];}));
 return {THREE,scene,models,places,trees,cow,crop};
}
// Every instance the scenery drew, by model (the wildflowers by their own name), as [x,z].
function spots(THREE,group,models){
 const byGeometry=new Map([...models].map(([name,entry])=>[entry.object.children[0].geometry,name])),out={},m=new THREE.Matrix4(),p=new THREE.Vector3();
 group.traverse(o=>{if(!o.isInstancedMesh)return;const name=o.userData.wildflowers?'wildflowers':byGeometry.get(o.geometry);for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);p.setFromMatrixPosition(m);(out[name]??=[]).push([+p.x.toFixed(3),+p.z.toFixed(3)]);}});
 return out;
}

test('the new pieces: the same on every visit and at every level, off fields, roads, pond, buildings, names and grazing patches, fewer on a phone',{skip},async()=>{
 const {buildScenery}=await import('../public/scenery.js'),{FIELD_BLOCK,onRoad,POND,placeIn}=await import('../public/farm-layout.js');
 const first=await farm(),desktop=spots(first.THREE,buildScenery({scene:first.scene,models:first.models}),first.models);
 // Trees that lean in a gust while the scenery is built change nothing: they are measured upright.
 const second=await farm();for(const tree of second.trees){tree.rotation.z=.3;tree.rotation.x=-.2;}
 const again=spots(second.THREE,buildScenery({scene:second.scene,models:second.models}),second.models);
 assert.deepEqual(again,desktop,'same spots after every reload');assert.equal(second.trees[0].rotation.z,.3,'and the trees keep their lean');
 const third=await farm(),phone=spots(third.THREE,buildScenery({scene:third.scene,models:third.models,mobile:true}),third.models);
 const count=(all,names)=>names.reduce((sum,name)=>sum+(all[name]?.length??0),0),BUSHES=['bush_001','bush_002','bush_003','bush_004'];
 assert.ok(count(desktop,['wildflowers'])>300&&count(desktop,BUSHES)>60,'abundance on a computer');
 assert.ok(count(phone,['wildflowers'])<count(desktop,['wildflowers'])*.8&&count(phone,BUSHES)<count(desktop,BUSHES)*.8,'fewer on a phone');
 // Most of it where players look: the home view, 30 across and 30 up and down the screen round the farm's middle (1.4, 1.5).
 const inView=([x,z])=>Math.abs((x-1.4)-(z-1.5))*Math.SQRT1_2<30&&Math.abs((x-1.4)+(z-1.5))*Math.SQRT1_2<30;
 assert.ok(desktop.wildflowers.filter(inView).length>desktop.wildflowers.length*.75,'the wildflowers mostly in the home view');
 // Every segment of the crops' fences has something beside it, outside the crops.
 const life=all=>['bush_001','plant_008','wildflowers'].flatMap(name=>all[name]??[]);
 for(const [x,z] of first.crop)assert.ok(life(desktop).some(([px,pz])=>Math.abs(pz-z)<1.8&&(x<0?px<x&&px>x-2.8:px>x&&px<x+2.8)),`nothing beside the crops' fence at ${x},${z}`);
 // Two or three round bales by the farmyard, the same on a phone, never by a fence or the crops.
 assert.ok(desktop.hay_001?.length>=1&&desktop.hay_001.length<=3,'one to three bales');assert.deepEqual(phone.hay_001,desktop.hay_001,'in the same spots on a phone');
 for(const [x,z] of desktop.hay_001){
  assert.ok(x<FIELD_BLOCK.minX-3||x>FIELD_BLOCK.maxX+3||z<FIELD_BLOCK.minZ-3||z>FIELD_BLOCK.maxZ+3,`a bale by the crops at ${x},${z}`);
  assert.ok([...first.crop,...Array.from({length:6},(_,i)=>[-2+i*2.2,44])].every(([fx,fz])=>Math.hypot(x-fx,z-fz)>2.2),`a bale by a fence at ${x},${z}`);
 }
 const [pondX,pondZ]=placeIn('pond',POND.x,POND.z);
 for(const [device,all] of [['computer',desktop],['phone',phone]])for(const name of [...BUSHES,'plant_008','hay_001','wildflowers'])for(const [x,z] of all[name]??[]){
  assert.ok(x<FIELD_BLOCK.minX||x>FIELD_BLOCK.maxX||z<FIELD_BLOCK.minZ||z>FIELD_BLOCK.maxZ,`${name} in the crops at ${x},${z} (${device})`);
  assert.ok(!onRoad(x,x,z,z),`${name} on a road at ${x},${z} (${device})`);
  assert.ok(((x-pondX)/POND.rx)**2+((z-pondZ)/POND.rz)**2>1,`${name} in the pond at ${x},${z} (${device})`);
  // The packed earth under the dairy's cow (scene-polish.js gives every animal of a building one, 4.6 across) stays bare.
  if(name!=='plant_008')assert.ok(Math.abs(x-first.cow[0])>2.3||Math.abs(z-first.cow[1])>2.3,`${name} on the cow's patch at ${x},${z} (${device})`);
  for(const p of first.places){
   assert.ok(Math.abs(x-p.x)>p.size[0]/2||Math.abs(z-p.z)>p.size[2]/2,`${name} inside a building at ${x},${z} (${device})`);
   // The name floats above the roof: on the ground that is 1.27 times the height further back, as the camera sees it.
   const across=Math.abs((x-p.x)-(z-p.z))*Math.SQRT1_2,back=-((x-p.x)+(z-p.z))*Math.SQRT1_2,label=(p.height+.45)*1.27;
   if(name!=='wildflowers')assert.ok(!(across<3.5&&back>label-1&&back<label+3.5),`${name} under a name at ${x},${z} (${device})`);
  }
 }
});
