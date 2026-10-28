// Builds the farm's moving animals (20 Oct 2026, the owner: "voeg (nog) niks toe, alleen de 6 bestaande"): the chickens, cows, goats,
// pigs, sheep and horses that stood on the farm as still models (chicken_001, cow_001, ...) get animated twins from ithappy Studios'
// Animals pack, bought by the owner (a paid licence: see ASSET-USAGE.md; the download stays out of the repository). One file a kind
// (public/assets/models/chicken_101.glb, chick_101.glb, cow_101.glb, goat_101.glb, pig_101.glb, sheep_101.glb, horse_101.glb): the pack's colour
// variants of that kind as separate meshes on one skeleton, with the kind's clips once (idle, walk, eat, lie for the cow and the pig,
// the goat's gesture instead of eating; the run is left out). Like the pets (scripts/build-pets.mjs): each vertex paints from the farm's
// palette.png (the farm palette's cell nearest to the colour it read in the pack's own palette; nothing of the pack's picture is
// shipped), carries the farm's baked shade (COLOR_0), and the file is meshopt-compressed and quantized. A clip's channels that only
// hold a bone at its rest pose are left out (most of a file's JSON).
// Since 22 Oct 2026 also the duck on the farm's pond (duck_101.glb: Duck_01 with its swim and its float only; public/farm-duck.js).
// KIND=duck_101 before node builds only that one (the steps below as they are, cp only its file).
// Run from a folder with @gltf-transform/core, extensions, functions (4.5.1), meshoptimizer (1.3.0) and pngjs (7.0.0) installed (npm i
// them there, not in the game), <pack> = the pack's Animals_glb/Separate_Assets_glb/Domestic/Animals folder:
//   node build-farm-animals.mjs <pack> public/assets/models/palette.png <out>
//   SRC=<out>/models OUT=<out>/ao blender -b --factory-startup --python scripts/model-shade/bake-ao.py
//   node build-farm-animals.mjs <pack> public/assets/models/palette.png <out> <out>/ao
//   cp <out>/*_101.glb public/assets/models/
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {PNG} from 'pngjs';
import fs from 'node:fs';
import path from 'node:path';
const [,,pack,palettePath,outDir,aoDir]=process.argv;
// Each kind: its variants and the clips it keeps. A variant is the mesh's name in the game's file: the pack's model it comes from and,
// where the pack has no animal of the old one's colours, a repaint: a colour of the pack's ('r,g,b', within 3 a channel) or a cell
// of the farm's palette it took ('=r,g,b') that paints from another cell of the farm's palette instead.
const KINDS=Object.freeze({
 // The old brown hen (chicken_001): the orange one, brown with its salmon wings (Chicken_03 is a rooster).
 chicken_101:{variants:{hen_brown:['Chicken_01',{'=255,112,65':'124,84,69'}],hen_white:['Chicken_02']},clips:['idle','eat','walk']},
 // The scenery's chicks by the coop (chicken_002): the pack's chick, a rig of its own.
 chick_101:{variants:{chick_yellow:['Chick_01']},clips:['idle','gesture','walk']},
 cow_101:{variants:{cow_black:['Cow_01'],cow_brown:['Cow_02']},clips:['idle','eat','walk','lying']},
 // The old grey goat (goat_002): the white one, grey.
 goat_101:{variants:{goat_white:['Goat_01'],goat_grey:['Goat_01',{'=245,245,245':'158,158,158'}]},clips:['idle','gesture','walk']},
 pig_101:{variants:{pig_pink:['Pig_03'],pig_peach:['Pig_02']},clips:['idle','eat','walk','lying']},
 // The old all-white sheep (sheep_003): the white one with a white face and white legs (its eyes and hooves stay dark).
 sheep_101:{variants:{sheep_white:['Sheep_01'],sheep_grey:['Sheep_02'],sheep_cream:['Sheep_01',{'63,60,60':'238,238,238'}]},clips:['idle','eat','walk']},
 // The chestnut's mane took a bright orange-brown cell: the dark brown of its legs instead.
 horse_101:{variants:{horse_bay:['Horse_01'],horse_black:['Horse_02'],horse_chestnut:['Horse_05',{'=140,69,5':'79,51,46'}]},clips:['idle','eat','walk']},
 // The duck on the farm's pond (22 Oct 2026, the owner: "zet de eend hier bij, doet verder niks"; public/farm-duck.js): only its
 // swim and its float (swim_idle); it never comes ashore, so its walk, idle, gesture and run are left out.
 duck_101:{variants:{duck_white:['Duck_01']},clips:['swim','swim_idle']},
 // World III, the harbour (27 Oct 2026, the owner: "Doe 1&2&3"): seals on the quays' edge and in the basin, pigeons on the quays
 // (the pack has no gulls). <pack> then holds Polar/Animals' Seal_0* and Domestic/Animals' Pigeon_0* side by side.
 seal_101:{variants:{seal_grey:['Seal_01'],seal_brown:['Seal_02'],seal_spotted:['Seal_03']},clips:['idle','gesture','swim','idle_swim']},
 pigeon_101:{variants:{pigeon_grey:['Pigeon_01'],pigeon_brown:['Pigeon_02'],pigeon_white:['Pigeon_03']},clips:['idle','gesture','walk','fly']}
});
// KIND=duck_101 (a comma list) builds only those kinds; without it, all of them.
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
 const doc=await io.read(path.join(pack,`${file}.glb`)),root=doc.getRoot(),keep=KINDS[kind].clips;
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
 const from=[...new Set(Object.values(variants).map(([file])=>file))].reduce((sum,file)=>sum+fs.statSync(path.join(pack,`${file}.glb`)).size,0);
 console.log(`${kind}.glb ${(glb.length/1024).toFixed(1)} KB, ${names.length} variants, ${dropped} still channels left out (from ${(from/1024).toFixed(0)} KB)`);
}
