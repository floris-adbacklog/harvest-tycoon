// Builds World II's extras (public/assets/village/village-extras.glb, Oct 2026): the pack's models the village scene does not have (the
// props at the places and the five landmarks of the owner's plan for levels 100-200), each once, as a node named after the model,
// centred on its footprint and standing on its own ground. It carries the farm's soft shade, baked per model on a ground plane like the
// Village props on the farm (ASSET-USAGE.md), one byte a vertex (_SHADE), and no palette: village-scene.js paints it with the village's.
// Run from a folder with @gltf-transform/core, extensions, functions (4.5.1) and meshoptimizer (1.3.0) installed (npm i them there,
// not in the game), <pack> = assets-source/village:
//   node build-village-extras.mjs <pack> <out>
//   SRC=<out>/models OUT=<out>/ao blender -b --factory-startup --python scripts/model-shade/bake-ao.py
//   node build-village-extras.mjs <pack> <out> <out>/ao
//   cp <out>/village-extras.glb public/assets/village/
import {NodeIO,Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,dedup,prune,weld,unpartition,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import fs from 'node:fs';
import path from 'node:path';
const [,,pack,outDir,aoDir]=process.argv;
// Every model public/village-scene.js's VILLAGE_EXTRAS places (tests/village-look.test.mjs checks the two lists match). The Great Hall
// and the Stone quay (10 Oct 2026) are built of parts drawn many times (the house parts Building_Angle_002 to Building_Window_002, the stone
// footings and steps foundation_002 and foundation_010), so each part is in the file once however often it stands.
const MODELS=['Building_005','Building_017_012','Building_021','Building_022','Building_034','Building_Angle_002','Building_Angle_Roof_002',
 'Building_Canopy_002','Building_Door_002','Building_Roof_002','Building_Small_Window_002','Building_Window_002','foundation_002','foundation_010','stones_015',
 'props_008','props_018','props_022','props_023','props_033','props_034','props_039','props_044','props_048','props_054','props_055','props_056','props_057','props_059','props_061',
 'props_062','props_063','props_070','props_072','props_073'];
// A model the village itself draws at another size than the pack stores it (village-layout.json) is written at the village's size, so
// size 1 in VILLAGE_EXTRAS is the village's own for it too: foundation_010, the stone steps in front of the village's houses, at a tenth.
const SIZE={foundation_010:.1};
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
// One model: its node transforms written into the vertices under one node named after it, its footprint (x, z) centred, its ground (y) kept.
async function single(name){
 const doc=await io.read(path.join(pack,'Village_Summer_glb','Separate_assets_glb',`${name}.glb`)),scene=doc.getRoot().listScenes()[0],v=[0,0,0];
 const apply=(W,p)=>[W[0]*p[0]+W[4]*p[1]+W[8]*p[2]+W[12],W[1]*p[0]+W[5]*p[1]+W[9]*p[2]+W[13],W[2]*p[0]+W[6]*p[1]+W[10]*p[2]+W[14]];
 let lo=[Infinity,Infinity],hi=[-Infinity,-Infinity];
 for(const n of scene.listChildren())n.traverse(node=>{const W=node.getWorldMatrix();for(const p of node.getMesh()?.listPrimitives()??[]){const a=p.getAttribute('POSITION');
  for(let i=0;i<a.getCount();i++){const [x,,z]=apply(W,a.getElement(i,v));lo=[Math.min(lo[0],x),Math.min(lo[1],z)];hi=[Math.max(hi[0],x),Math.max(hi[1],z)];}}});
 const cx=(lo[0]+hi[0])/2,cz=(lo[1]+hi[1])/2,k=SIZE[name]??1,root=doc.createNode(name);
 for(const n of [...scene.listChildren()])n.traverse(node=>{const mesh=node.getMesh();if(!mesh)return;const W=node.getWorldMatrix(),copy=mesh.clone();
  for(const p of copy.listPrimitives()){
   const pos=p.getAttribute('POSITION').clone(),nor=p.getAttribute('NORMAL')?.clone();p.setAttribute('POSITION',pos);if(nor)p.setAttribute('NORMAL',nor);
   for(let i=0;i<pos.getCount();i++){const [x,y,z]=apply(W,pos.getElement(i,v));pos.setElement(i,[(x-cx)*k,y*k,(z-cz)*k]);}
   if(nor)for(let i=0;i<nor.getCount();i++){nor.getElement(i,v);const x=W[0]*v[0]+W[4]*v[1]+W[8]*v[2],y=W[1]*v[0]+W[5]*v[1]+W[9]*v[2],z=W[2]*v[0]+W[6]*v[1]+W[10]*v[2],l=Math.hypot(x,y,z)||1;nor.setElement(i,[x/l,y/l,z/l]);}
  }
  root.addChild(doc.createNode(node.getName()).setMesh(copy));});
 for(const n of [...scene.listChildren()])n.dispose();scene.addChild(root);
 for(const t of doc.getRoot().listTextures())t.dispose();   // the palette comes from the village at load time
 await doc.transform(prune({keepAttributes:true}),weld());   // keepAttributes: without a texture prune would drop the palette coordinates
 return doc;
}
if(!aoDir){
 fs.mkdirSync(path.join(outDir,'models'),{recursive:true});fs.mkdirSync(path.join(outDir,'ao'),{recursive:true});   // bake-ao.py writes into a folder that is there
 for(const name of MODELS)await io.write(path.join(outDir,'models',`${name}.glb`),await single(name));
 console.log(`${MODELS.length} models in ${outDir}/models: bake them (see above), then run again with the shade folder`);process.exit(0);
}
// The shade from bake-ao.py (1 = open) with the farm's strength .45 and floor .55, as one byte per vertex (village-scene.js turns it into
// the grey vertex colours the farm's models carry). The models are read back from the first run, so the shade fits vertex for vertex.
const out=new Document(),shade=v=>Math.max(.55,1-.45*(1-v));
for(const name of MODELS){
 const doc=await io.read(path.join(outDir,'models',`${name}.glb`)),{ao}=JSON.parse(fs.readFileSync(path.join(aoDir,`${name}.ao.json`),'utf8'));
 doc.getRoot().listMeshes().forEach((mesh,mi)=>mesh.listPrimitives().forEach((p,pi)=>{const values=ao[`${mi}:${pi}`];
  if(values?.length!==p.getAttribute('POSITION').getCount())throw new Error(`${name}: the shade does not fit part ${mi}:${pi}: bake the models again`);
  p.setAttribute('COLOR_0',null);
  p.setAttribute('_SHADE',doc.createAccessor().setType('SCALAR').setArray(Uint8Array.from(values,v=>Math.round(shade(v)*255))).setNormalized(true).setBuffer(doc.getRoot().listBuffers()[0]));}));
 mergeDocuments(out,doc);
}
const target=out.getRoot().listScenes()[0];for(const s of out.getRoot().listScenes().slice(1)){for(const n of s.listChildren())target.addChild(n);s.dispose();}
const buffer=out.getRoot().listBuffers()[0];for(const a of out.getRoot().listAccessors())a.setBuffer(buffer);for(const b of out.getRoot().listBuffers().slice(1))b.dispose();
await out.transform(dedup(),prune({keepAttributes:true}),unpartition(),meshopt({encoder:MeshoptEncoder,level:'high'}));
out.getRoot().getAsset().extras={bakedShade:true,models:MODELS};
await io.write(path.join(outDir,'village-extras.glb'),out);
console.log('village-extras.glb',fs.statSync(path.join(outDir,'village-extras.glb')).size,'bytes,',MODELS.length,'models');
