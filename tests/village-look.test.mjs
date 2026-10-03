import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const file=new URL('../public/assets/village/village.glb',import.meta.url);

// Oct 2026: World II's village is finished like the farm: the farm's baked shade, matte materials, no shadow stripes, hazy mountains
// and cloud shadows above its hills (ASSET-USAGE.md, Village shade). World I must stay exactly as it was.
async function village(){
 const b=readFileSync(file),jl=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+jl).toString('utf8')),bin=b.subarray(20+jl+8);
 const {MeshoptDecoder}=await import('../public/vendor/addons/libs/meshopt_decoder.module.js');await MeshoptDecoder.ready;
 // One byte of shade a vertex, from the meshopt-compressed buffer view as the game's loader reads it.
 const shade=accessor=>{const a=json.accessors[accessor],bv=json.bufferViews[a.bufferView],m=bv.extensions?.EXT_meshopt_compression;
  let bytes=bin.subarray(bv.byteOffset??0),stride=bv.byteStride??1;
  if(m){bytes=new Uint8Array(m.count*m.byteStride);MeshoptDecoder.decodeGltfBuffer(bytes,m.count,m.byteStride,bin.subarray(m.byteOffset??0,(m.byteOffset??0)+m.byteLength),m.mode,m.filter);stride=m.byteStride;}
  return Array.from({length:a.count},(_,i)=>bytes[(a.byteOffset??0)+i*stride]);};
 return {json,shade};
}

test('every part of the village carries the farm\'s baked shade, and the download stays small',async()=>{
 const {json,shade}=await village(),all=[];
 assert.equal(json.asset.extras?.bakedShade,true,'marked like the farm\'s models');
 assert.ok(json.extensionsRequired.includes('EXT_meshopt_compression')&&json.extensionsRequired.includes('KHR_mesh_quantization'),'still meshopt-compressed and quantized');
 for(const mesh of json.meshes)for(const p of mesh.primitives){
  const a=json.accessors[p.attributes._SHADE];assert.ok(a,`${mesh.name} has no baked shade`);
  assert.deepEqual([a.type,a.componentType,a.normalized],['SCALAR',5121,true],'one normalized byte a vertex');
  assert.equal(p.attributes.COLOR_0,undefined,'the shade replaces the pack\'s plain white colours');
  assert.ok(p.material!=null,`${mesh.name}: a part without material is drawn almost black`);
  const values=shade(p.attributes._SHADE);assert.equal(values.length,json.accessors[p.attributes.POSITION].count);all.push(...values);
 }
 // The farm's strength .45 and floor .55 (scripts/model-shade/apply-ao.mjs): 140..255. Most of it is shaded, a good part of it open.
 all.sort((x,y)=>x-y);const share=limit=>all.filter(v=>v<limit).length/all.length;
 assert.ok(all[0]>=140&&all.at(-1)===255,`shade ${all[0]}..${all.at(-1)}`);
 assert.ok(share(230)>.5&&share(230)<.85,`${Math.round(share(230)*100)}% darker than .9`);assert.ok(share(141)<.2,'not all of it at the floor');
 assert.ok(statSync(file).size<5.5e6,`village.glb is ${(statSync(file).size/1e6).toFixed(2)} MB`);
});
test('the village build and bake: the farm\'s strength and floor, the palette for parts without a material, one way to make the file',()=>{
 const build=read('scripts/build-village.mjs'),apply=read('scripts/model-shade/apply-ao.mjs'),bake=read('scripts/model-shade/bake-ao.py');
 assert.match(apply,/\[,,orig,aoDir,out,strengthArg='\.45',floorArg='\.55'\]/);assert.match(build,/shade=v=>Math\.max\(\.55,1-\.45\*\(1-v\)\)/);
 assert.match(build,/if\(!p\.getMaterial\(\)\)p\.setMaterial\(paint\);/);
 assert.match(build,/throw new Error\(`The shade does not fit part \$\{mi\}:\$\{pi\}: bake this build again/,'a bake of another build never slips in');
 assert.match(bake,/lay = os\.environ\.get\('LAYOUT'\)/);assert.match(bake,/a mirrored place turns its triangles round/);
 assert.match(read('ASSET-USAGE.md'),/LAYOUT=<out>\/village-layout\.json blender -b --factory-startup --python scripts\/model-shade\/bake-ao\.py/);
});
test('the village is matte, shaded by its vertex colours, its mountains hazy and without shadows',()=>{
 const scene=read('public/village-scene.js');
 assert.match(scene,/c\[i\*4\]=c\[i\*4\+1\]=c\[i\*4\+2\]=Math\.round\(s\.getX\(i\)\*255\);c\[i\*4\+3\]=255;\}g\.setAttribute\('color',new THREE\.BufferAttribute\(c,4,true\)\)/,'the shade becomes the vertex colours, as on the farm');
 assert.match(scene,/o\.material\.roughness=1;o\.material\.metalness=0;o\.material\.vertexColors\|\|=Boolean\(g\.getAttribute\('color'\)\);/);
 assert.match(scene,/h\.emissive=new THREE\.Color\(0xe2ead0\);h\.emissiveIntensity=\.12;/,'the farm\'s haze colour, half as strong: the village\'s mountains are near');
 assert.match(scene,/mountain=\/\^mountains_\/\.test\(name\)/);assert.match(scene,/im\.castShadow=!mountain;im\.receiveShadow=true;/);
 assert.match(scene,/export const VILLAGE_CLOUD_HEIGHT=16;/);
});
test('the village\'s shadows and clouds are its own; the farm keeps its light exactly as it was',()=>{
 const game=read('public/game.js'),village=game.slice(game.indexOf('  if(villageWorld){\n   // The village is three times'),game.indexOf('  }else{\n  await Promise.all([client.load()'));
 assert.ok(village.length>500,'the village branch of init');
 assert.match(village,/sun\.shadow\.normalBias=1\.3\*190\/sun\.shadow\.mapSize\.x;/,'1.3 shadow texels: .12, .24 on phones');
 assert.ok(1.3*190/2048>.12&&1.3*190/1024<.25);
 assert.match(village,/createAtmosphere\(\{scene,renderer,sun,hemi,reducedMotion,mobile:mobileLayout\.matches,cloudHeight:VILLAGE_CLOUD_HEIGHT\}\)/);
 // The farm: the same sun, shadow and bias, the same matte models, mountain haze and cloud sheet.
 assert.match(game,/sun\.shadow\.camera\.left=-52;sun\.shadow\.camera\.right=52;sun\.shadow\.camera\.top=52;sun\.shadow\.camera\.bottom=-52;sun\.shadow\.camera\.near=1;sun\.shadow\.camera\.far=125;sun\.shadow\.normalBias=\.035;sun\.shadow\.bias=-\.00012;sun\.shadow\.radius=3;/);
 assert.match(game,/atmosphere=createAtmosphere\(\{scene,renderer,sun,hemi,reducedMotion,mobile:mobileLayout\.matches\}\);clearPropsFromMountains\(\);/,'no cloud height on the farm');
 assert.match(game,/n\.castShadow=true;n\.receiveShadow=true;n\.material\.roughness=1;n\.material\.metalness=0;/);
 assert.match(read('public/scene-polish.js'),/n\.castShadow=false;n\.receiveShadow=true;n\.material=n\.material\.clone\(\);n\.material\.emissive=new THREE\.Color\(0xe2ead0\);n\.material\.emissiveIntensity=\.24;/);
 const air=read('public/farm-atmosphere.js');assert.match(air,/cloudHeight=\.28\}\)\{/);assert.match(air,/sheet\.position\.y=cloudHeight;/);
});
