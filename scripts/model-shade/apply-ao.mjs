// node scripts/model-shade/apply-ao.mjs <origDir> <aoDir> <outDir> [strength=.45] [floor=.55]
// Writes each GLB again with the shade from bake-ao.py as COLOR_0 (normalized bytes, 4 per vertex). A model that already has
// vertex colours keeps them, multiplied by the shade. Everything else in the file stays the same. A model that is already shaded
// (asset.extras.bakedShade) is copied as it is, so running this twice never darkens a model twice.
import fs from 'node:fs';
import path from 'node:path';
const [,,orig,aoDir,out,strengthArg='.45',floorArg='.55']=process.argv;
const strength=+strengthArg,floor=+floorArg;
const shade=ao=>Math.max(floor,1-strength*(1-ao));
const pad4=n=>(n+3)&~3;
let before=0,after=0,count=0;
for(const f of fs.readdirSync(orig).filter(f=>f.endsWith('.glb'))){
 const src=fs.readFileSync(path.join(orig,f));before+=src.length;
 const aoFile=path.join(aoDir,f.replace(/\.glb$/,'.ao.json'));
 if(!fs.existsSync(aoFile)){fs.copyFileSync(path.join(orig,f),path.join(out,f));after+=src.length;continue;}
 const {ao}=JSON.parse(fs.readFileSync(aoFile,'utf8'));
 const jl=src.readUInt32LE(12),json=JSON.parse(src.subarray(20,20+jl).toString('utf8'));
 if(json.asset?.extras?.bakedShade){fs.copyFileSync(path.join(orig,f),path.join(out,f));after+=src.length;continue;}
 json.asset.extras={...json.asset.extras,bakedShade:true};
 const binStart=20+jl,binLen=src.readUInt32LE(binStart);let bin=Buffer.from(src.subarray(binStart+8,binStart+8+binLen));
 const extra=[];let offset=pad4(bin.length);
 json.meshes.forEach((mesh,mi)=>mesh.primitives.forEach((p,pi)=>{
  const values=ao[`${mi}:${pi}`];if(!values)throw new Error(`${f}: no shade for ${mi}:${pi}`);
  const n=json.accessors[p.attributes.POSITION].count;if(values.length!==n)throw new Error(`${f}: ${values.length} shades for ${n} vertices`);
  if(p.attributes.COLOR_0!=null){
   // Existing colours (the trees and bushes: normalized unsigned shorts, VEC4): multiply in place.
   const a=json.accessors[p.attributes.COLOR_0],bv=json.bufferViews[a.bufferView],comps=a.type==='VEC4'?4:3;
   if(a.componentType!==5123||!a.normalized)throw new Error(`${f}: unexpected colour type`);
   const stride=bv.byteStride||comps*2,start=(bv.byteOffset||0)+(a.byteOffset||0);
   for(let v=0;v<n;v++)for(let c=0;c<3;c++){const at=start+v*stride+c*2;bin.writeUInt16LE(Math.round(bin.readUInt16LE(at)*shade(values[v])),at);}
   return;
  }
  const data=Buffer.alloc(n*4);
  for(let v=0;v<n;v++){const s=Math.round(shade(values[v])*255);data[v*4]=s;data[v*4+1]=s;data[v*4+2]=s;data[v*4+3]=255;}
  json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,target:34962});
  json.accessors.push({bufferView:json.bufferViews.length-1,componentType:5121,normalized:true,count:n,type:'VEC4'});
  p.attributes.COLOR_0=json.accessors.length-1;
  extra.push([offset,data]);offset=pad4(offset+data.length);
 }));
 if(extra.length){
  const grown=Buffer.alloc(offset);bin.copy(grown,0);for(const [at,data] of extra)data.copy(grown,at);bin=grown;
 }
 json.buffers[0].byteLength=bin.length;
 let text=Buffer.from(JSON.stringify(json),'utf8');const jsonPad=pad4(text.length)-text.length;text=Buffer.concat([text,Buffer.alloc(jsonPad,0x20)]);
 const total=12+8+text.length+8+bin.length,glb=Buffer.alloc(total);
 glb.writeUInt32LE(0x46546c67,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(total,8);
 glb.writeUInt32LE(text.length,12);glb.writeUInt32LE(0x4e4f534a,16);text.copy(glb,20);
 const b=20+text.length;glb.writeUInt32LE(bin.length,b);glb.writeUInt32LE(0x004e4942,b+4);bin.copy(glb,b+8);
 fs.writeFileSync(path.join(out,f),glb);after+=glb.length;count++;
}
console.log(`${count} models shaded; ${(before/1e6).toFixed(2)} MB -> ${(after/1e6).toFixed(2)} MB (+${((after/before-1)*100).toFixed(1)}%)`);
