// Builds the farm's pets (public/assets/models/dog_101.glb, cat_101.glb and deer_101.glb, 20 Oct 2026, the owner: "doe de kat en de hond,
// en het hert in Village II") from ithappy Studios' free animals (https://ithappystudios.com/, free asset policy: use inside the game is
// allowed, sharing the files as they are is not; the download stays out of the repository). Each source model is about 1 MB: a skinned
// animal with a run, a walk and an idle, painted from the pack's own 1024 px palette with a watermark over it. Each pet keeps its walk
// and its idle, paints from the farm's palette.png (each vertex reads the farm palette's cell nearest to the colour it read in the
// pack's: nothing of the pack's picture is shipped), carries the farm's baked shade (COLOR_0) and is meshopt-compressed and quantized.
// Run from a folder with @gltf-transform/core, extensions, functions (4.5.1), meshoptimizer (1.3.0) and pngjs (7.0.0) installed (npm i
// them there, not in the game), <pack> = the folder that holds Separate_assets_glb/ and textures/:
//   node build-pets.mjs <pack> public/assets/models/palette.png <out>
//   SRC=<out>/models OUT=<out>/ao blender -b --factory-startup --python scripts/model-shade/bake-ao.py
//   node build-pets.mjs <pack> public/assets/models/palette.png <out> <out>/ao
//   cp <out>/dog_101.glb <out>/cat_101.glb <out>/deer_101.glb public/assets/models/
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {PNG} from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const [,,pack,palettePath,outDir,aoDir]=process.argv;
const PETS=Object.freeze({dog_101:'Dog_001',cat_101:'Kitty_001',deer_101:'Deer_001'});
const KEEP=/_(idle|walk)$/;
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});

// Colours in CIE Lab, so "nearest" is what the eye calls nearest.
const lin=c=>{c/=255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
function lab([r,g,b]){
 const R=lin(r),G=lin(g),B=lin(b),f=t=>t>216/24389?Math.cbrt(t):(24389/27*t+16)/116;
 const x=f((R*.4124+G*.3576+B*.1805)/.95047),y=f(R*.2126+G*.7152+B*.0722),z=f((R*.0193+G*.1192+B*.9505)/1.08883);
 return [116*y-16,500*(x-y),200*(y-z)];
}
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
// The farm's palette: 11 x 11 cells of 94 px (the last row and column a little narrower). A cell is read at its middle.
const farm=PNG.sync.read(fs.readFileSync(palettePath)),CELL=94,cells=[];
const pixel=(img,x,y)=>{const i=(Math.min(img.height-1,Math.max(0,y))*img.width+Math.min(img.width-1,Math.max(0,x)))*4;return [img.data[i],img.data[i+1],img.data[i+2]];};
for(let row=0;row*CELL<farm.height;row++)for(let col=0;col*CELL<farm.width;col++){
 const x0=col*CELL,y0=row*CELL,x1=Math.min(farm.width,x0+CELL),y1=Math.min(farm.height,y0+CELL),cx=Math.floor((x0+x1)/2),cy=Math.floor((y0+y1)/2);
 const rgb=pixel(farm,cx,cy);cells.push({u:(cx+.5)/farm.width,v:(cy+.5)/farm.height,rgb,lab:lab(rgb)});
}
// The pack's palette has a watermark over it: a colour is the middle (median) of a 9 x 9 patch round the point, which the thin letters
// do not move.
const source=PNG.sync.read(fs.readFileSync(path.join(pack,'textures','Texture_1.png')));
function sourceColour(u,v){
 const x=Math.floor((u-Math.floor(u))*source.width),y=Math.floor((v-Math.floor(v))*source.height),ch=[[],[],[]];
 for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const p=pixel(source,x+dx,y+dy);for(let c=0;c<3;c++)ch[c].push(p[c]);}
 return ch.map(list=>list.sort((a,b)=>a-b)[list.length>>1]);
}
const nearest=rgb=>{const l=lab(rgb);let best=cells[0],d=Infinity;for(const c of cells){const e=dist(l,c.lab);if(e<d){d=e;best=c;}}return best;};

async function pet(name,file){
 const doc=await io.read(path.join(pack,'Separate_assets_glb',`${file}.glb`)),root=doc.getRoot();
 for(const a of root.listAnimations()){if(KEEP.test(a.getName()))a.setName(a.getName().replace(/^.*_(idle|walk)$/,'$1'));else a.dispose();}
 const report=new Map();
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const uv=p.getAttribute('TEXCOORD_0').clone(),v=[0,0];p.setAttribute('TEXCOORD_0',uv);
  // A colour of the pack's (rounded) maps to one cell, so the faces of one colour stay one colour.
  const chosen=new Map();
  for(let i=0;i<uv.getCount();i++){
   uv.getElement(i,v);const rgb=sourceColour(v[0],v[1]),key=rgb.map(c=>c>>3).join(',');
   let cell=chosen.get(key);if(!cell){cell=nearest(rgb);chosen.set(key,cell);}
   uv.setElement(i,[cell.u,cell.v]);const r=`${rgb} -> ${cell.rgb}`;report.set(r,(report.get(r)??0)+1);
  }
  // The pack's own vertex colours (the kitten's, all white) make way for the shade.
  p.setAttribute('COLOR_0',null);
 }
 // The picture: none in the file. The image points at palette.png beside the model (written below, after the file is made).
 for(const t of root.listTextures()){t.setImage(null);t.setMimeType('image/png');t.setName('palette');}
 for(const m of root.listMaterials()){m.setMetallicFactor(0);m.setRoughnessFactor(1);m.setName(name);}
 console.log(name,[...report].sort((a,b)=>b[1]-a[1]).map(([k,n])=>`${k} (${n})`).join('; '));
 return doc;
}
// The image points at palette.png (as scripts/share-palette.mjs leaves every farm model): only the JSON changes.
function pointAtPalette(glb){
 const jl=glb.readUInt32LE(12),json=JSON.parse(glb.subarray(20,20+jl).toString('utf8')),rest=glb.subarray(20+jl);
 json.images=(json.images??[]).map(image=>({...image,uri:'palette.png',mimeType:'image/png'}));
 let text=Buffer.from(JSON.stringify(json),'utf8');text=Buffer.concat([text,Buffer.alloc(((text.length+3)&~3)-text.length,0x20)]);
 const head=Buffer.alloc(20);head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(20+text.length+rest.length,8);head.writeUInt32LE(text.length,12);head.writeUInt32LE(0x4e4f534a,16);
 return Buffer.concat([head,text,rest]);
}

if(!aoDir){
 fs.mkdirSync(path.join(outDir,'models'),{recursive:true});fs.mkdirSync(path.join(outDir,'ao'),{recursive:true});   // bake-ao.py writes into a folder that is there
 for(const [name,file] of Object.entries(PETS)){const doc=await pet(name,file);await doc.transform(prune({keepAttributes:true}));fs.writeFileSync(path.join(outDir,'models',`${name}.glb`),pointAtPalette(Buffer.from(await io.writeBinary(doc))));}
 fs.copyFileSync(palettePath,path.join(outDir,'models','palette.png'));   // the second run reads the models back with it
 console.log(`${Object.keys(PETS).length} pets in ${outDir}/models: bake them (see above), then run again with the shade folder`);process.exit(0);
}
// The shade from bake-ao.py (1 = open) with the farm's strength .45 and floor .55 (scripts/model-shade/apply-ao.mjs), as grey vertex
// colours, one byte a channel. The models are read back from the first run, so the shade fits vertex for vertex.
const shade=v=>Math.max(.55,1-.45*(1-v));
for(const name of Object.keys(PETS)){
 const doc=await io.read(path.join(outDir,'models',`${name}.glb`)),{ao}=JSON.parse(fs.readFileSync(path.join(aoDir,`${name}.ao.json`),'utf8'));
 doc.getRoot().listMeshes().forEach((mesh,mi)=>mesh.listPrimitives().forEach((p,pi)=>{
  const values=ao[`${mi}:${pi}`],n=p.getAttribute('POSITION').getCount();if(values?.length!==n)throw new Error(`${name}: no shade for ${mi}:${pi}`);
  const c=new Uint8Array(n*4);for(let i=0;i<n;i++){c[i*4]=c[i*4+1]=c[i*4+2]=Math.round(shade(values[i])*255);c[i*4+3]=255;}
  p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(c).setNormalized(true).setBuffer(doc.getRoot().listBuffers()[0]));
 }));
 doc.getRoot().getAsset().extras={...doc.getRoot().getAsset().extras,bakedShade:true};
 for(const t of doc.getRoot().listTextures())t.setImage(null);
 await doc.transform(resample({tolerance:1e-4}),dedup(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const glb=pointAtPalette(Buffer.from(await io.writeBinary(doc)));
 fs.writeFileSync(path.join(outDir,`${name}.glb`),glb);
 console.log(`${name}.glb ${(glb.length/1024).toFixed(1)} KB (from ${(fs.statSync(path.join(pack,'Separate_assets_glb',`${PETS[name]}.glb`)).size/1024).toFixed(0)} KB)`);
}
