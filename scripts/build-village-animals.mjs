// Builds the village's animals (27 Oct 2026, the owner's d, e and f for World II; public/village-animals.js): pigeons on the market
// square, roe deer and a fox at the forest edge by the Lumber Camp, and a cat with her kittens by the Miners' Canteen. Only to look at.
// From ithappy Studios' Animals pack, bought by the owner (the paid licence, ASSET-USAGE.md; the download stays out of the repository),
// rebuilt exactly as scripts/build-farm-animals.mjs rebuilds the farm's animals: one file a kind, the kind's colours as separate meshes
// on one skeleton, only the clips the village plays, each vertex painted from the farm's palette.png (as the village's deer and the
// farm's animals are; nothing of the pack's picture is shipped), the farm's baked shade (COLOR_0), meshopt-compressed and quantized.
// Run from a folder with @gltf-transform/core, extensions, functions (4.5.1), meshoptimizer (1.3.0) and pngjs (7.0.0) installed (npm i
// them there, not in the game), <pack> = the pack's Animals_glb/Separate_Assets_glb folder (with Domestic/Animals and Forest/Animals):
//   node build-village-animals.mjs <pack> public/assets/models/palette.png <out>
//   SRC=<out>/models OUT=<out>/ao blender -b --factory-startup --python scripts/model-shade/bake-ao.py
//   node build-village-animals.mjs <pack> public/assets/models/palette.png <out> <out>/ao
//   cp <out>/pigeon_101.glb <out>/roedeer_101.glb <out>/fox_101.glb <out>/housecat_101.glb <out>/kitten_101.glb public/assets/models/
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {PNG} from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const [,,pack,palettePath,outDir,aoDir]=process.argv;
// Each kind: its variants (the mesh's name in the game's file: the pack's model and, where wanted, a repaint as in
// build-farm-animals.mjs) and the clips it keeps.
const KINDS=Object.freeze({
 // Three town pigeons: they stand and bob, walk a little, and flutter up (fly). Their gesture is left out: it hops the bird a body
 // length and a half sideways, which would snap back at its end.
 pigeon_101:{variants:{pigeon_grey:['Pigeon_01'],pigeon_dark:['Pigeon_02'],pigeon_pale:['Pigeon_03']},clips:['idle','walk','fly']},
 // A roe buck and a doe: they graze (gesture), stand and walk slowly.
 roedeer_101:{variants:{roe_buck:['Roe_Deer_01'],roe_doe:['Roe_Deer_02']},clips:['idle','walk','gesture']},
 // The fox: stands, walks, and trots now and then (its run, played slow).
 fox_101:{variants:{fox_red:['Fox_01']},clips:['idle','walk','run']},
 // The mother cat: sits and watches, stands, walks a few steps.
 housecat_101:{variants:{cat_ginger:['Cat_04']},clips:['idle','sit','walk']},
 // Her kittens: they stand, play (gesture) and walk.
 kitten_101:{variants:{kitten_ginger:['Kitty_03',{'=255,171,145':'255,169,32'}],kitten_white:['Kitty_01'],kitten_grey:['Kitty_02']},clips:['idle','walk','gesture']}
});
// The pack keeps its farm animals in Domestic/Animals, its wild ones in Forest/Animals.
const source=file=>[path.join(pack,'Domestic','Animals',`${file}.glb`),path.join(pack,'Forest','Animals',`${file}.glb`),path.join(pack,`${file}.glb`)].find(f=>fs.existsSync(f))??(()=>{throw new Error(`${file}.glb is not in ${pack}`);})();
// KIND=pigeon_101 (a comma list) builds only those kinds; without it, all of them.
const ONLY=process.env.KIND?new Set(process.env.KIND.split(',')):null;
const BUILD=Object.entries(KINDS).filter(([kind])=>!ONLY||ONLY.has(kind));
// A clip's name less the animal's ('Cow_Lying' lie, 'Duck_Swim_Idle' swim_idle).
const clipName=name=>{const k=name.replace(/^[^_]*_/,'').toLowerCase();return k==='lying'?'lie':k;};
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
const nearest=rgb=>{const l=lab(rgb);let best=cells[0],d=Infinity;for(const c of cells){const e=dist(l,c.lab);if(e<d){d=e;best=c;}}return best;};
// The pack's palette is inside each of its files (the same picture in all of them). A colour is the middle (median) of a 5 x 5 patch
// round the point, so a point on the edge of two cells takes the one it is mostly in.
const decoded=new Map();
function sourceColour(image,u,v){
 let img=decoded.get(image);if(!img){img=PNG.sync.read(Buffer.from(image));decoded.set(image,img);}
 const x=Math.floor((u-Math.floor(u))*img.width),y=Math.floor((v-Math.floor(v))*img.height),ch=[[],[],[]];
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const p=pixel(img,x+dx,y+dy);for(let c=0;c<3;c++)ch[c].push(p[c]);}
 return ch.map(list=>list.sort((a,b)=>a-b)[list.length>>1]);
}

// One variant as its own file, for the shade's bake: the kind's clips (renamed), painted from the farm's palette, no picture inside.
const cellOf=rgb=>cells.find(c=>c.rgb.join(',')===rgb)??(()=>{throw new Error(`no cell ${rgb} in the farm's palette`);})();
async function variant(kind,name,[file,paint={}]){
 const doc=await io.read(source(file)),root=doc.getRoot(),keep=KINDS[kind].clips;
 for(const a of root.listAnimations()){const k=clipName(a.getName());if(keep.includes(k==='lie'?'lying':k))a.setName(clipName(a.getName()));else a.dispose();}
 const image=root.listTextures()[0].getImage(),report=new Map();
 for(const mesh of root.listMeshes())for(const p of mesh.listPrimitives()){
  const uv=p.getAttribute('TEXCOORD_0').clone(),v=[0,0];p.setAttribute('TEXCOORD_0',uv);
  const chosen=new Map();
  for(let i=0;i<uv.getCount();i++){
   uv.getElement(i,v);const rgb=sourceColour(image,v[0],v[1]),key=rgb.map(c=>c>>3).join(',');
   let cell=chosen.get(key);
   if(!cell){
    cell=nearest(rgb);
    for(const [from,to] of Object.entries(paint)){
     const hit=from.startsWith('=')?cell.rgb.join(',')===from.slice(1):from.split(',').every((c,k)=>Math.abs(c-rgb[k])<=3);
     if(hit){cell=cellOf(to);break;}
    }
    chosen.set(key,cell);
   }
   uv.setElement(i,[cell.u,cell.v]);const r=`${rgb} -> ${cell.rgb}`;report.set(r,(report.get(r)??0)+1);
  }
  p.setAttribute('COLOR_0',null);
 }
 for(const t of root.listTextures()){t.setImage(null);t.setMimeType('image/png');t.setName('palette');}
 for(const m of root.listMaterials()){m.setMetallicFactor(0);m.setRoughnessFactor(1);m.setName(kind);}
 root.listMeshes()[0].setName(name);for(const n of root.listNodes())if(n.getMesh())n.setName(name);
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
 for(const [kind,{variants}] of BUILD)for(const [name,file] of Object.entries(variants)){
  const doc=await variant(kind,name,file);await doc.transform(prune({keepAttributes:true}));
  fs.writeFileSync(path.join(outDir,'models',`${name}.glb`),pointAtPalette(Buffer.from(await io.writeBinary(doc))));
 }
 fs.copyFileSync(palettePath,path.join(outDir,'models','palette.png'));
 console.log(`The variants are in ${outDir}/models: bake them (see above), then run again with the shade folder`);process.exit(0);
}
// The shade from bake-ao.py (1 = open) with the farm's strength .45 and floor .55 (scripts/model-shade/apply-ao.mjs), as grey vertex
// colours, one byte a channel.
const shade=v=>Math.max(.55,1-.45*(1-v));
function addShade(doc,name){
 const {ao}=JSON.parse(fs.readFileSync(path.join(aoDir,`${name}.ao.json`),'utf8'));
 doc.getRoot().listMeshes().forEach((mesh,mi)=>mesh.listPrimitives().forEach((p,pi)=>{
  const values=ao[`${mi}:${pi}`],n=p.getAttribute('POSITION').getCount();if(values?.length!==n)throw new Error(`${name}: no shade for ${mi}:${pi}`);
  const c=new Uint8Array(n*4);for(let i=0;i<n;i++){c[i*4]=c[i*4+1]=c[i*4+2]=Math.round(shade(values[i])*255);c[i*4+3]=255;}
  p.setAttribute('COLOR_0',doc.createAccessor().setType('VEC4').setArray(c).setNormalized(true).setBuffer(doc.getRoot().listBuffers()[0]));
 }));
}
// A copy of an accessor in another document.
const copyAccessor=(doc,a)=>doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(doc.getRoot().listBuffers()[0]);
// A channel that holds its bone at the bone's rest pose all through the clip moves nothing: three.js keeps a bone without a channel
// at its rest pose, also while two clips fade into each other.
function dropStill(doc){
 let dropped=0;
 for(const a of doc.getRoot().listAnimations())for(const ch of a.listChannels()){
  const node=ch.getTargetNode(),p=ch.getTargetPath(),rest=p==='translation'?node.getTranslation():p==='rotation'?node.getRotation():p==='scale'?node.getScale():null;
  if(!rest)continue;
  const out=ch.getSampler().getOutput(),n=rest.length,v=new Array(n);let still=true;
  for(let i=0;i<out.getCount()&&still;i++){
   out.getElement(i,v);const same=v.every((x,k)=>Math.abs(x-rest[k])<1e-4);
   still=same||(p==='rotation'&&v.every((x,k)=>Math.abs(x+rest[k])<1e-4));
  }
  if(still){const s=ch.getSampler();ch.dispose();if(!s.listParents().some(x=>x.propertyType==='AnimationChannel'))s.dispose();dropped++;}
 }
 return dropped;
}
for(const [kind,{variants}] of BUILD){
 const names=Object.keys(variants),docs=[];
 for(const name of names){const doc=await io.read(path.join(outDir,'models',`${name}.glb`));addShade(doc,name);docs.push(doc);}
 // The first variant's file takes the others' meshes, each on the first one's bones (the same rig: matched by the bones' names).
 const doc=docs[0],root=doc.getRoot(),skin=root.listSkins()[0],joints=new Map(skin.listJoints().map(j=>[j.getName(),j]));
 const holder=root.listNodes().find(n=>n.getMesh()),parent=holder.getParentNode(),scene=root.listScenes()[0],material=root.listMaterials()[0];
 for(let i=1;i<docs.length;i++){
  const other=docs[i].getRoot(),otherSkin=other.listSkins()[0],otherHolder=other.listNodes().find(n=>n.getMesh());
  const s=doc.createSkin(names[i]).setInverseBindMatrices(copyAccessor(doc,otherSkin.getInverseBindMatrices()));
  for(const j of otherSkin.listJoints()){const mine=joints.get(j.getName());if(!mine)throw new Error(`${kind}: ${names[i]} has a bone ${j.getName()} the first has not`);s.addJoint(mine);}
  if(skin.getSkeleton())s.setSkeleton(skin.getSkeleton());
  const mesh=doc.createMesh(names[i]);
  for(const p of otherHolder.getMesh().listPrimitives()){
   const q=doc.createPrimitive().setMaterial(material).setIndices(copyAccessor(doc,p.getIndices()));
   for(const semantic of p.listSemantics())q.setAttribute(semantic,copyAccessor(doc,p.getAttribute(semantic)));
   mesh.addPrimitive(q);
  }
  const node=doc.createNode(names[i]).setMesh(mesh).setSkin(s).setTranslation(otherHolder.getTranslation()).setRotation(otherHolder.getRotation()).setScale(otherHolder.getScale());
  if(parent)parent.addChild(node);else scene.addChild(node);
 }
 const dropped=dropStill(doc);
 root.getAsset().extras={...root.getAsset().extras,bakedShade:true};
 for(const t of root.listTextures())t.setImage(null);
 await doc.transform(resample({tolerance:1e-4}),dedup(),prune({keepAttributes:true}),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const glb=pointAtPalette(Buffer.from(await io.writeBinary(doc)));
 fs.writeFileSync(path.join(outDir,`${kind}.glb`),glb);
 const from=[...new Set(Object.values(variants).map(([file])=>file))].reduce((sum,file)=>sum+fs.statSync(source(file)).size,0);
 console.log(`${kind}.glb ${(glb.length/1024).toFixed(1)} KB, ${names.length} variants, ${dropped} still channels left out (from ${(from/1024).toFixed(0)} KB)`);
}
