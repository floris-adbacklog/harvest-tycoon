import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,readdirSync,existsSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {RECIPES} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const file=new URL('../public/assets/village/village.glb',import.meta.url);

// Oct 2026: World II's village is finished like the farm: the farm's baked shade, matte materials, no shadow stripes, hazy mountains
// and cloud shadows above its hills (ASSET-USAGE.md, Village shade). World I must stay exactly as it was.
async function village(at=file){
 const b=readFileSync(at),jl=b.readUInt32LE(12),json=JSON.parse(b.subarray(20,20+jl).toString('utf8')),bin=b.subarray(20+jl+8);
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
 assert.match(scene,/h\.emissive=new THREE\.Color\(VILLAGE_HAZE\);h\.emissiveIntensity=\.12;/,'half the farm\'s haze: the village\'s mountains are near');
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

// 6 Oct 2026, like the loading screen's painted village, and since 7 Oct 2026 as sunny and cheerful as the farm: the farm's grass
// green in the meadows (never lime, olive or beige), livelier trees, a blue lake, the farm's mountain haze, and the village painting
// from the graded village-palette.png instead of the copy inside village.glb.
const hsl=([r,g,b])=>{r/=255;g/=255;b/=255;const mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;let h=0,s=0;if(mx!==mn){const d=mx-mn;s=l>.5?d/(2-mx-mn):d/(mx+mn);h=(mx===r?(g-b)/d+(g<b?6:0):mx===g?(b-r)/d+2:(r-g)/d+4)*60;}return [h,s,l];};
const rgb=([h,s,l])=>{const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return [f(0),f(8),f(4)].map(v=>Math.round(v*255));};
// The farm's palette grade (7 Oct 2026, "B vrolijk"), two steps on the raw values, each rounded to whole values, only where the
// saturation is above .12. 1: greens 80-165 deg a little warmer, fuller and deeper, yellows a little fuller, all a touch fuller.
// 2: all fuller again, and the darker greens lighter (never past .6), so the trees look lively instead of dark.
const step1=c=>{let [h,s,l]=hsl(c);if(s>.12){if(h>=80&&h<165){h-=2;s=Math.min(1,s*1.1);l*=l<.6?.83:.95;}else if(h>=35&&h<62)s=Math.min(1,s*1.06);s=Math.min(1,s*1.03);}return rgb([(h+360)%360,s,l]);};
const step2=c=>{let [h,s,l]=hsl(c);if(s>.12){s=Math.min(1,s*1.08);if(h>=80&&h<165&&l<.6)l=Math.min(.6,l*1.1);}return rgb([h,s,l]);};
const grade=c=>step2(step1(c));
function png(path){
 const b=readFileSync(new URL(`../${path}`,import.meta.url));assert.equal(b.toString('ascii',1,4),'PNG');
 const w=b.readUInt32BE(16),h=b.readUInt32BE(20);assert.deepEqual([b[24],b[25],b[28]],[8,6,0],'8-bit RGBA, not interlaced');
 const parts=[];for(let at=8;at<b.length;){const n=b.readUInt32BE(at),type=b.toString('ascii',at+4,at+8);if(type==='IDAT')parts.push(b.subarray(at+8,at+8+n));at+=12+n;}
 const raw=inflateSync(Buffer.concat(parts)),row=w*4,out=Buffer.alloc(row*h);
 for(let y=0;y<h;y++){const f=raw[y*(row+1)],src=raw.subarray(y*(row+1)+1,(y+1)*(row+1));
  for(let x=0;x<row;x++){const a=x>=4?out[y*row+x-4]:0,up=y?out[(y-1)*row+x]:0,ul=x>=4&&y?out[(y-1)*row+x-4]:0,p=a+up-ul,pa=Math.abs(p-a),pb=Math.abs(p-up),pc=Math.abs(p-ul);
   out[y*row+x]=(src[x]+[0,a,up,(a+up)>>1,pa<=pb&&pa<=pc?a:pb<=pc?up:ul][f])&255;}}
 return (x,y)=>[...out.subarray(y*row+x*4,y*row+x*4+3)];
}
test('the village palette is graded like the farm\'s: livelier greens for the trees, a touch fuller colours, the white cell untouched',()=>{
 const at=png('public/assets/models/village-palette.png');
 // The pack's colours in the middle of their cells (94 px), and what the grade makes of them.
 for(const [x,y,pack] of [[517,423,[66,160,71]],[517,517,[73,174,76]],[517,611,[101,187,106]],[517,141,[28,94,31]],[611,517,[255,235,58]],[611,423,[253,216,53]],[47,517,[244,67,54]],[329,517,[33,150,243]],[893,987,[250,250,250]]]){
  const got=at(x,y),want=grade(pack);assert.ok(got.every((v,i)=>Math.abs(v-want[i])<=1),`${x},${y}: ${got} instead of ${want}`);}
 // The trees' green: fuller and a little deeper than the pack's (hue 121, s .41, l .48), never the dark green of 6 Oct (l .32).
 const [h,s,l]=hsl(at(517,517));assert.ok(h>100&&h<130&&s>.45&&l>.4&&l<.47,`the trees' green (${h.toFixed(0)} deg, s ${s.toFixed(2)}, l ${l.toFixed(2)})`);
 // What freshGrass in village-scene.js counts on: the hills' seam between the green and the yellow cell, and a neutral white cell.
 assert.ok(hsl(at(563,517))[0]>100&&hsl(at(564,517))[0]<62,'the seam sits at 564 px');
 assert.deepEqual(at(893,982),[250,250,250],'the white cell the meadows read: their green is in the vertex colours');
});
test('the meadows are the farm\'s green, the lake blue like the farm\'s pond, the mountains\' haze the farm\'s; the village paints from the graded palette',async()=>{
 const scene=read('public/village-scene.js'),hex=name=>Number(new RegExp(`${name}=(0x[0-9a-f]{6})`).exec(scene)?.[1]),split=n=>[n>>16&255,n>>8&255,n&255];
 const grass=Object.entries(JSON.parse(/VILLAGE_GRASS=Object\.freeze\((\{[^}]+\})\)/.exec(scene)[1].replace(/(\d+):/g,'"$1":').replace(/0x[0-9a-f]{6}/g,n=>Number(n))));
 assert.deepEqual(grass.map(([row])=>Number(row)),[4,5,6,7],'one green for each row of the pack\'s greens');
 grass.forEach(([row,n],i)=>{const [h,s,l]=hsl(split(n));assert.ok(h>=78&&h<=100&&s>=.35&&s<=.65&&l>=.5&&l<=.75,`row ${row}: the farm's grass green, never golf-course green, lime, olive or beige (${h.toFixed(0)} deg, s ${s.toFixed(2)}, l ${l.toFixed(2)})`);if(i)assert.ok(l>hsl(split(grass[i-1][1]))[2],'lighter row by row, as the pack\'s');});
 // Measured in the game (sunlit meadow against the farm's lit grass at noon, 1440x900 and 390x844, 7 Oct 2026: hue within a degree,
 // lightness within .01): the rows' hue sits on the farm ground's. A new farm grass green or light means matching the village again.
 const farmGround=Number(/patch\(0,0,600,600,(0x[0-9a-f]{6}),0\);ground\.name='Farm ground'/.exec(read('public/game.js'))?.[1]),meanHue=grass.reduce((a,[,n])=>a+hsl(split(n))[0],0)/4;
 assert.ok(Math.abs(meanHue-hsl(split(farmGround))[0])<=8,`the village's greens (${meanHue.toFixed(0)} deg) follow the farm's grass (${hsl(split(farmGround))[0].toFixed(0)} deg)`);
 const [lh,ls]=hsl(split(hex('VILLAGE_LAKE')));assert.ok(lh>=195&&lh<=215&&ls>=.7,'a blue lake, not the pack\'s pale cyan');
 // Halfway between the pack's pale cyan and the clear blue of 6 Oct, as the farm's pond went halfway from mint to blue.
 const half=(a,b)=>split(a).map((v,i)=>(v+split(b)[i])/2),near=(n,want)=>split(n).every((v,i)=>Math.abs(v-want[i])<=.5);
 assert.ok(near(hex('VILLAGE_LAKE'),half(0x80deea,0x2898f2)),'the lake halfway');assert.ok(near(0x4eb1d2,half(0x62bfc0,0x3aa3e3)),'the pond halfway');
 assert.match(read('public/farm-life.js'),/color:0x4eb1d2,roughness:\.35/,'the farm\'s pond');
 assert.equal(hex('VILLAGE_HAZE'),Number(/n\.material\.emissive=new THREE\.Color\((0x[0-9a-f]{6})\);n\.material\.emissiveIntensity=\.24;/.exec(read('public/scene-polish.js'))?.[1]),'the farm\'s mountain haze: one valley');
 assert.match(scene,/import \{PALETTE_VERSION\} from '\.\/model-atlas\.js';/);
 assert.match(scene,/new THREE\.ImageLoader\(\)\.loadAsync\(`\/assets\/models\/village-palette\.png\?v=\$\{PALETTE_VERSION\}`\)\.catch\(\(\)=>null\)/,'versioned past a day-old cache; without it the village keeps its own copy');
 assert.match(scene,/for\(const map of maps\)\{map\.image\?\.close\?\.\(\);map\.image=palette;map\.needsUpdate=true;\}/,'the copy inside village.glb is freed');
 assert.match(scene,/g\.setAttribute\('color',new THREE\.BufferAttribute\(c,4,true\)\);g\.deleteAttribute\('_shade'\);freshGrass\(g\);\}/,'once a part, right after its shade');
 assert.match(scene,/if\(!own\)\{uv=uv\.clone\(\);own=true;g\.setAttribute\('uv',uv\);\}/,'parts sharing texture coordinates each get their own copy, or the next one stays white');
 assert.match(scene,/if\(o\.material\.name==='Transparent'\)\{o\.material\.map=null;o\.material\.color\.setHex\(VILLAGE_LAKE\);o\.material\.opacity=\.85;/);
 // In village.glb itself: every hill and every path's grass edge reads that seam, and nothing else does (a tree there would turn
 // into meadow).
 const {json}=await village(),b=readFileSync(file),bin=b.subarray(20+b.readUInt32LE(12)+8);
 const {MeshoptDecoder}=await import('../public/vendor/addons/libs/meshopt_decoder.module.js');await MeshoptDecoder.ready;
 const names=new Map(json.nodes.filter(n=>n.mesh!=null).map(n=>[n.mesh,n.name])),onSeam=new Set();
 json.meshes.forEach((mesh,mi)=>{for(const p of mesh.primitives){const a=json.accessors[p.attributes.TEXCOORD_0];if(!a)continue;
  const bv=json.bufferViews[a.bufferView],m=bv.extensions?.EXT_meshopt_compression,float=a.componentType===5126;
  assert.ok(float||a.componentType===5123&&a.normalized,'quantized to 16 bits (one part as floats)');
  let bytes,stride=bv.byteStride??(float?8:4);
  if(m){bytes=new Uint8Array(m.count*m.byteStride);MeshoptDecoder.decodeGltfBuffer(bytes,m.count,m.byteStride,bin.subarray(m.byteOffset,m.byteOffset+m.byteLength),m.mode,m.filter);stride=m.byteStride;}
  else bytes=bin.subarray(bv.byteOffset??0,(bv.byteOffset??0)+bv.byteLength);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  for(let i=0;i<a.count;i++){const at=(a.byteOffset??0)+i*stride,u=float?view.getFloat32(at,true):view.getUint16(at,true)/65535;if(Math.abs((u-Math.floor(u))*1024-564)<1.5){onSeam.add(names.get(mi));break;}}}});
 const seam=[...onSeam].sort();assert.ok(seam.every(n=>/^(hill|Road)_/.test(n)),`only hills and paths: ${seam.filter(n=>!/^(hill|Road)_/.test(n))}`);
 assert.equal(seam.filter(n=>/^hill_/.test(n)).length,json.nodes.filter(n=>n.mesh!=null&&/^hill_/.test(n.name)).length,'every hill');
 assert.equal(seam.filter(n=>/^Road_/.test(n)).length,5,'the five paths');
});

// Oct 2026, the owner's plan for levels 100-200: the later places are names on houses already in village.glb, and their props and the
// five landmarks come in one small file of their own (village-extras.glb), shaded like the rest and loaded only in the village.
const extras=new URL('../public/assets/village/village-extras.glb',import.meta.url);
const sceneFile=()=>read('public/village-scene.js');
const extrasTable=()=>new Function(`return ${/export const VILLAGE_EXTRAS=Object\.freeze\((\{[\s\S]*?\})\);/.exec(sceneFile())[1]}`)();
test('village.glb stays as it is: the later places are names on its houses',()=>{
 assert.equal(statSync(file).size,5269692,'village.glb');
 assert.equal(statSync(new URL('../public/assets/village/village-layout.json',import.meta.url)).size,105028,'village-layout.json');
});
test('the village\'s extras: the pack\'s props and the five landmarks, shaded like the village, under 500 KB',async()=>{
 const size=statSync(extras).size;assert.ok(size>250000&&size<500000,`village-extras.glb is ${size} bytes`);
 const {json,shade}=await village(extras),all=[];
 assert.equal(json.asset.extras?.bakedShade,true,'marked like the farm\'s models');
 assert.ok(json.extensionsRequired.includes('EXT_meshopt_compression')&&json.extensionsRequired.includes('KHR_mesh_quantization'),'meshopt-compressed and quantized');
 assert.equal(json.images,undefined,'no picture: the village paints it with its own palette');assert.equal(json.textures,undefined);
 for(const mesh of json.meshes)for(const p of mesh.primitives){
  const a=json.accessors[p.attributes._SHADE];assert.ok(a,`${mesh.name} has no baked shade`);
  assert.deepEqual([a.type,a.componentType,a.normalized],['SCALAR',5121,true],'one normalized byte a vertex');
  assert.ok(p.attributes.TEXCOORD_0!=null&&p.attributes.NORMAL!=null,'the palette\'s coordinates and the normals');
  assert.equal(p.attributes.COLOR_0,undefined,'the shade replaces the pack\'s plain white colours');
  const values=shade(p.attributes._SHADE);assert.equal(values.length,json.accessors[p.attributes.POSITION].count);all.push(...values);
 }
 all.sort((x,y)=>x-y);assert.ok(all[0]>=140&&all.at(-1)===255,`shade ${all[0]}..${all.at(-1)}`);
 const roots=json.scenes[json.scene??0].nodes.map(i=>json.nodes[i].name);
 assert.deepEqual(roots,json.asset.extras.models,'one node a model, named after it');
 assert.deepEqual([...roots].sort(),[...new Set(Object.values(extrasTable()).flat().map(([model])=>model))].sort(),'exactly the models village-scene.js places');
});
test('the extras build: the farm\'s strength and floor, a shade that must fit, one way to make the file',()=>{
 const build=read('scripts/build-village-extras.mjs');
 assert.match(build,/shade=v=>Math\.max\(\.55,1-\.45\*\(1-v\)\)/);
 assert.match(build,/throw new Error\(`\$\{name\}: the shade does not fit part /,'a bake of another build never slips in');
 assert.match(build,/prune\(\{keepAttributes:true\}\)/,'without a texture prune would drop the palette coordinates');
 assert.match(build,/meshopt\(\{encoder:MeshoptEncoder,level:'high'\}\)/);
 assert.deepEqual(JSON.parse(/const MODELS=(\[[^\]]+\]);/.exec(build)[1].replace(/'/g,'"')).sort(),[...new Set(Object.values(extrasTable()).flat().map(([model])=>model))].sort(),'the build makes the models the scene places');
 assert.match(read('ASSET-USAGE.md'),/SRC=<out>\/models OUT=<out>\/ao blender -b --factory-startup --python scripts\/model-shade\/bake-ao\.py/);
});
test('the extras are painted with the village\'s palette and loaded only there, after it shows',()=>{
 const scene=sceneFile(),game=read('public/game.js');
 assert.match(scene,/world\.userData=\{scale:s,palette:paletteMap\};/);
 assert.match(scene,/paletteMap\?\?=o\.material\.name!=='Transparent'\?o\.material\.map:null;/,'the houses\' palette, never the lake\'s plain blue');
 assert.match(scene,/new THREE\.MeshStandardMaterial\(\{map:palette,vertexColors:true,roughness:1,metalness:0,side:THREE\.DoubleSide\}\)/);
 assert.match(scene,/mesh\.name=`\$\{landmark\?'landmark':'extras'\}-\$\{key\}`;mesh\.visible=false;/,'all hidden until game.js shows them');
 assert.match(scene,/loader\.loadAsync\(EXTRAS_URL\)\.catch\(\(\)=>loader\.loadAsync\(`\$\{EXTRAS_URL\}\?fresh=\$\{Date\.now\(\)\}`\)\)/,'asked for once more past the cache');
 assert.match(scene,/import \{mergeGeometries\} from 'three\/addons\/utils\/BufferGeometryUtils\.js';/);
 for(const name of readdirSync(new URL('../public/',import.meta.url),{recursive:true}).filter(n=>/\.(m?js|html|css|json)$/.test(n)&&!n.startsWith('vendor')&&n!=='village-scene.js'))
  assert.doesNotMatch(read(`public/${name}`),/village-extras\.glb/,`only the village scene loads the extras (${name})`);
 assert.match(game,/if\(!villageWorld\)void addScenery\(\);if\(villageWorld\)void addVillageExtras\(\);/,'after the village is on screen, never on the farm');
 assert.match(game,/console\.warn\('The village extras were skipped\.',error\);/,'a file that does not come leaves the village as it is');
 const tick=/if\(now-lastTick>500\)\{[^\n]*\}/.exec(game)?.[0]??'';assert.match(tick,/atmosphere\?\.tick\(\);syncVillageExtras\(\);/,'a build shows within half a second');
 assert.doesNotMatch(/function expandVisuals\(\)\{[^\n]*\}/.exec(game)[0],/syncVillageExtras/,'not in expandVisuals (tests/village-square.test.mjs runs it alone)');
});
// The Village Fields' rows (Oct 2026): the farm's own crop models, one strip for each crop the Fields sow, and for flax, lavender and
// saffron one colour of the pack's palette (a tint multiplied over green leaves turned them grey-green; checked in a render).
test('the Fields\' rows: one strip per village crop, the farm\'s models, the pack\'s colours',()=>{
 const scene=sceneFile(),object=name=>new Function('Object',`return ${new RegExp(`export const ${name}=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);\\n`).exec(scene)[1]}`)({freeze:o=>o});
 const crops=object('VILLAGE_FIELD_CROPS'),plot=object('VILLAGE_FIELD_PLOT');
 assert.deepEqual(Object.keys(crops).sort(),Object.values(RECIPES).filter(r=>r.building==='villagefields').map(r=>Object.keys(r.output)[0]).sort(),'a strip for every crop the Fields sow');
 assert.deepEqual(Object.values(crops).map(c=>c.strip).sort(),[0,1,2,3]);
 for(const c of Object.values(crops))assert.ok(existsSync(new URL(`../public/assets/models/${c.model}.glb`,import.meta.url)),`${c.model}: a farm model, nothing new to download`);
 const at=png('public/assets/models/village-palette.png'),hex=([r,g,b])=>r<<16|g<<8|b;
 assert.deepEqual([crops.flax.color,crops.lavender.color,crops.saffron.color,crops.potatoes.color],[hex(at(326,698)),hex(at(233,698)),hex(at(233,791)),null],'blue flax, purple lavender, lilac saffron; potatoes in the farm\'s own greens');
 const from=scene.indexOf('export function villageFieldSpots(strip){'),spots=new Function('VILLAGE_FIELD_PLOT',`${scene.slice(from+7,scene.indexOf('\n}\n',from)+2)}return villageFieldSpots;`)(plot);
 for(let strip=0;strip<4;strip++){const list=spots(strip);assert.equal(list.length,45);
  for(const {x,z} of list){const a=(x-plot.x)*plot.ax+(z-plot.z)*plot.az,b=-(x-plot.x)*plot.az+(z-plot.z)*plot.ax;assert.ok(a>0&&a<9.41&&b>0&&b<7.07,`strip ${strip}: ${a.toFixed(2)}, ${b.toFixed(2)} on the plot`);}}
 assert.match(scene,/if\(hit\?\.object\.name==='landscape_004'\)/,'a plant only where the plot\'s soil is on top');
});
