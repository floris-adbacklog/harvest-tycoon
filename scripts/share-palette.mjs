// node scripts/share-palette.mjs [dir=public/assets/models]
// One palette file instead of a copy in every model (6 Oct 2026). Every model of the Farm pack paints from the same palette
// picture, and every .glb carried its own copy of it: 144 copies of one 10 KB PNG, and 10 copies of the Village pack's 23 KB one,
// 1.7 MB of the 12 MB of models (about 0.35 MB once the site has brotli-packed them). This writes the picture once beside the models
// (palette.png, and village-palette.png for village_*) and points each model's image at that file instead of its own copy.
// public/model-atlas.js (sharePalette) then fetches each file once for all the models.
// Only a picture that is byte for byte the palette is taken out; a model with a picture of its own keeps it. Everything else in the
// file stays as it was (the geometry and the baked shade are checked byte for byte), and the file names stay the same.
// Safe to run again: a model that already points at the palette is left alone. Run it after scripts/model-shade/apply-ao.mjs when
// a new model comes in from the pack.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const dir=path.resolve(process.argv[2]??'public/assets/models');
const PALETTES=[{file:'palette.png',models:name=>!/^village_/.test(name)},{file:'village-palette.png',models:name=>/^village_/.test(name)}];
const GLB=0x46546c67,JSON_CHUNK=0x4e4f534a,BIN_CHUNK=0x004e4942;
const pad4=n=>(n+3)&~3,sha=data=>crypto.createHash('sha256').update(data).digest('hex');

function readGlb(buf){
 if(buf.readUInt32LE(0)!==GLB)throw new Error('not a .glb');
 let off=12,json=null,bin=Buffer.alloc(0);
 while(off<buf.length){
  const len=buf.readUInt32LE(off),type=buf.readUInt32LE(off+4),data=buf.subarray(off+8,off+8+len);
  if(type===JSON_CHUNK)json=JSON.parse(data.toString('utf8'));else if(type===BIN_CHUNK)bin=data;
  off+=8+len;
 }
 return {json,bin};
}
function writeGlb(json,bin){
 let text=Buffer.from(JSON.stringify(json),'utf8');text=Buffer.concat([text,Buffer.alloc(pad4(text.length)-text.length,0x20)]);
 const body=Buffer.concat([bin,Buffer.alloc(pad4(bin.length)-bin.length)]),total=12+8+text.length+(body.length?8+body.length:0),glb=Buffer.alloc(total);
 glb.writeUInt32LE(GLB,0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(total,8);
 glb.writeUInt32LE(text.length,12);glb.writeUInt32LE(JSON_CHUNK,16);text.copy(glb,20);
 if(body.length){const b=20+text.length;glb.writeUInt32LE(body.length,b);glb.writeUInt32LE(BIN_CHUNK,b+4);body.copy(glb,b+8);}
 return glb;
}
const viewBytes=(json,bin,index)=>{const v=json.bufferViews[index];return bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);};
// The embedded pictures of a model: [{index, bytes, hash}].
const embedded=({json,bin})=>(json.images??[]).map((image,index)=>image.bufferView==null?null:{index,bytes:viewBytes(json,bin,image.bufferView)}).filter(Boolean).map(e=>({...e,hash:sha(e.bytes)}));

// Takes the pictures listed in `images` (index -> uri) out of the model and packs the binary chunk again without them.
function externalise(glb,images){
 const {json,bin}=glb;
 for(const ext of json.extensionsUsed??[])if(/draco|meshopt/i.test(ext))throw new Error(`${ext} is not handled`);
 const drop=new Set();
 for(const [index,uri] of images){const {bufferView,...image}=json.images[index];drop.add(bufferView);json.images[index]={...image,uri};}
 const users=[...json.accessors??[],...(json.accessors??[]).flatMap(a=>a.sparse?[a.sparse.indices,a.sparse.values]:[]),...json.images];
 for(const view of drop)if(users.some(u=>u.bufferView===view))throw new Error(`buffer view ${view} is shared`);
 const order=json.bufferViews.map((view,index)=>({view,index})).filter(v=>!drop.has(v.index)).sort((a,b)=>(a.view.byteOffset??0)-(b.view.byteOffset??0));
 const parts=[],remap=new Map();let offset=0;
 for(const {view,index} of order){
  const data=bin.subarray(view.byteOffset??0,(view.byteOffset??0)+view.byteLength);
  offset=pad4(offset);parts.push([offset,data]);view.byteOffset=offset;offset+=data.length;
 }
 const packed=Buffer.alloc(pad4(offset));for(const [at,data] of parts)data.copy(packed,at);
 const kept=json.bufferViews.map((view,index)=>({view,index})).filter(v=>!drop.has(v.index));
 kept.forEach(({index},i)=>remap.set(index,i));json.bufferViews=kept.map(v=>v.view);
 for(const u of users)if(u.bufferView!=null)u.bufferView=remap.get(u.bufferView);
 json.buffers[0].byteLength=packed.length;
 return {json,bin:packed};
}
// The geometry, colours and everything but the pictures must come out byte for byte the same.
function sameData(a,b,f){
 const strip=j=>JSON.stringify({...j,images:(j.images??[]).map(({bufferView,uri,...rest})=>rest),bufferViews:undefined,buffers:undefined,accessors:j.accessors?.map(({bufferView,...rest})=>rest)});
 if(strip(a.json)!==strip(b.json))throw new Error(`${f}: the model description changed`);
 a.json.accessors?.forEach((acc,i)=>{
  if(acc.bufferView==null)return;
  if(!viewBytes(a.json,a.bin,acc.bufferView).equals(viewBytes(b.json,b.bin,b.json.accessors[i].bufferView)))throw new Error(`${f}: accessor ${i} changed`);
 });
}

const files=fs.readdirSync(dir).filter(f=>f.endsWith('.glb')).sort();
let before=0,after=0,changed=0;const own=[];
for(const p of PALETTES)if(fs.existsSync(path.join(dir,p.file)))before+=fs.statSync(path.join(dir,p.file)).size;
for(const palette of PALETTES){
 const group=files.filter(f=>palette.models(f)).map(f=>{const buf=fs.readFileSync(path.join(dir,f));return {f,buf,glb:readGlb(buf)};});
 const target=path.join(dir,palette.file);
 // The palette is the file already there, or else the picture most of these models carry (at least two of them).
 let hash=fs.existsSync(target)?sha(fs.readFileSync(target)):null;
 if(!hash){
  const count=new Map();for(const m of group)for(const e of embedded(m.glb)){const c=count.get(e.hash)??{n:0,bytes:e.bytes};c.n++;count.set(e.hash,c);}
  const [best]=[...count.entries()].sort((a,b)=>b[1].n-a[1].n);
  if(!best||best[1].n<2){console.log(`${palette.file}: no picture shared by these models, nothing to do`);continue;}
  hash=best[0];fs.writeFileSync(target,best[1].bytes);console.log(`${palette.file}: written (${best[1].bytes.length} bytes, carried by ${best[1].n} models)`);
 }
 for(const {f,buf,glb} of group){
  before+=buf.length;
  const images=embedded(glb).filter(e=>e.hash===hash).map(e=>[e.index,palette.file]);
  for(const e of embedded(glb))if(e.hash!==hash)own.push(`${f} (image ${e.index}, ${e.bytes.length} bytes)`);
  if(!images.length){after+=buf.length;continue;}
  const original=readGlb(Buffer.from(buf)),shared=externalise(glb,images),out=writeGlb(shared.json,shared.bin);
  sameData(original,readGlb(out),f);
  fs.writeFileSync(path.join(dir,f),out);after+=out.length;changed++;
 }
}
for(const p of PALETTES)if(fs.existsSync(path.join(dir,p.file)))after+=fs.statSync(path.join(dir,p.file)).size;
if(own.length)console.log(`Kept their own picture: ${own.join(', ')}`);
console.log(`${changed} of ${files.length} models now point at the palette; ${(before/1e6).toFixed(2)} MB -> ${(after/1e6).toFixed(2)} MB with the palette files`);
