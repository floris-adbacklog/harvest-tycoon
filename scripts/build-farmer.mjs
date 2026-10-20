// Builds the farmer every player makes for themselves (20 Oct 2026, the owner: "Doe 2") from ithappy Studios' Creative Characters pack,
// bought by the owner (a paid licence: see ASSET-USAGE.md; the download stays out of the repository). The pack is one skeleton (44 bones)
// with 413 wearable parts bound to it, all painting from one 1024 px colour picture (smooth bands of colour, no watermark).
// scripts/farmer-export.py writes them out of the pack's .blend as one .glb; this cuts that into what the game loads:
//   public/assets/farmer/farmer-rig.glb   the skeleton and its clips: idle, look (looks around), relaxed, walk (on the spot) and hop (a
//                                         small cheerful jump for a tap, made of the pack's Jump_Start and Jump_End); no mesh
//   public/assets/farmer/parts/<id>.glb   one small file a part: its mesh, skinned to bones of the same names, no picture
//   public/assets/farmer/farmer.webp      the colour picture, 512 px (the bands are smooth: nothing is lost at half size)
// and the measured catalog (ids, groups, files, sizes, colours) into the block between the markers in game/farmer-parts.js (then
// node scripts/sync-game.mjs copies it to public/farmer-parts.js; the rules
// and the names stay as written there). Every file is meshopt-compressed and quantized like the farm's animals.
// Run from a folder with @gltf-transform/core, extensions, functions (4.5.1), meshoptimizer (1.3.0) and pngjs (7.0.0) installed (npm i
// them there, not in the game), with cwebp on the PATH:
//   cp <pack>/Creative_Characters.blend <tmp>/work.blend
//   blender -b --factory-startup <tmp>/work.blend --python scripts/farmer-export.py -- <tmp>/farmer-all.glb
//   cp scripts/build-farmer.mjs <tools folder>/ && node <tools folder>/build-farmer.mjs <tmp>/farmer-all.glb <game checkout>
import {NodeIO,Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {prune,dedup,resample,meshopt} from '@gltf-transform/functions';
import {MeshoptEncoder,MeshoptDecoder} from 'meshoptimizer';
import {PNG} from 'pngjs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const [,,source,checkout='.']=process.argv;
const OUT=path.join(checkout,'public/assets/farmer'),PARTS=path.join(OUT,'parts'),CATALOG=path.join(checkout,'game/farmer-parts.js');
await MeshoptEncoder.ready;await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.encoder':MeshoptEncoder,'meshopt.decoder':MeshoptDecoder});
const doc=await io.read(source),root=doc.getRoot();
fs.rmSync(PARTS,{recursive:true,force:true});fs.mkdirSync(PARTS,{recursive:true});

// The pack's groups (its .blend's collections) as the catalog's.
const GROUP={'Body':'body','Faces':'face','Hairstyle':'hair','Hairstyle Single':'hairFull','Hat':'hat','Hat Single':'helmet','Glasses':'glasses',
 'Gloves':'gloves','Face Accessories':'faceExtra','Outwear':'top','Outfit':'outfit','Costumes':'costume','Mascots':'mascot','Pants':'pants',
 'Shorts':'shorts','Shoes':'shoes','Socks':'socks'};
// A costume is several pieces in the pack (Costume_8_001 ... Costume_8_004: the suit, the helmet, the gloves, ...): one part in the game.
const partOf=name=>/^Costume_\d+_\d+$/.test(name)?name.replace(/_\d+$/,'').toLowerCase():name.toLowerCase();
const MATERIAL={Color:'farmer',Glass:'farmer-glass',Emission:'farmer-glow'};

// The colour picture, at 512 px.
const texture=root.listTextures()[0],full=PNG.sync.read(Buffer.from(texture.getImage()));
{
 const half=new PNG({width:full.width/2,height:full.height/2});
 for(let y=0;y<half.height;y++)for(let x=0;x<half.width;x++)for(let c=0;c<4;c++){
  let s=0;for(const [dx,dy] of [[0,0],[1,0],[0,1],[1,1]])s+=full.data[((y*2+dy)*full.width+x*2+dx)*4+c];
  half.data[(y*half.width+x)*4+c]=Math.round(s/4);
 }
 const tmp=path.join(OUT,'.farmer.png');fs.writeFileSync(tmp,PNG.sync.write(half));
 execFileSync('cwebp',['-quiet','-q','92','-m','6','-sharp_yuv',tmp,'-o',path.join(OUT,'farmer.webp')]);fs.rmSync(tmp);
}
const colourAt=(u,v)=>{const x=Math.min(full.width-1,Math.max(0,Math.floor((u-Math.floor(u))*full.width))),y=Math.min(full.height-1,Math.max(0,Math.floor((v-Math.floor(v))*full.height))),i=(y*full.width+x)*4;return [full.data[i],full.data[i+1],full.data[i+2]];};

// A copy of an accessor in another document.
const copyAccessor=(to,a)=>to.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(to.getRoot().listBuffers()[0]);
const skin=root.listSkins()[0],skeleton=root.listNodes().find(n=>n.getName()==='Skeleton');
// The skeleton's nodes into another document: the same names, the same rest pose, the same tree. Returns old node -> new node.
function copySkeleton(to,scene){
 const map=new Map();
 const copy=(node,parent)=>{const n=to.createNode(node.getName()).setTranslation(node.getTranslation()).setRotation(node.getRotation()).setScale(node.getScale());map.set(node,n);parent.addChild(n);for(const c of node.listChildren())if(!c.getMesh())copy(c,n);};
 copy(skeleton,scene);return map;
}
const finish=async(d,file)=>{
 await d.transform(dedup(),prune({keepAttributes:true,keepLeaves:true}),meshopt({encoder:MeshoptEncoder,level:'high'}));
 const glb=Buffer.from(await io.writeBinary(d));fs.writeFileSync(file,glb);return glb.length;
};

// The parts: each mesh as its own file, bound to the skeleton's bones by name.
const measured=new Map();
for(const node of root.listNodes()){
 const mesh=node.getMesh();if(!mesh)continue;
 const name=node.getName(),group=GROUP[node.getExtras().part];if(!group)throw new Error(`${name}: no group (${node.getExtras().part})`);
 // Only the bones this part moves with (a hat: the head), each where the skeleton holds it at rest, side by side: the game binds the
 // part to its farmer's own bones by these names (farmer.js), and the file alone still shows the part at its spot. 44 bones in a tree
 // cost about 12 KB a file; a hat's one bone a few hundred bytes.
 const joints=skin.listJoints(),used=new Set();
 for(const p of mesh.listPrimitives()){
  const J=p.getAttribute('JOINTS_0'),W=p.getAttribute('WEIGHTS_0'),j=[],w=[];
  for(let i=0;i<J.getCount();i++){J.getElement(i,j);W.getElement(i,w);for(let k=0;k<4;k++)if(w[k]>0)used.add(j[k]);}
 }
 const order=[...used].sort((a,b)=>a-b),index=new Map(order.map((j,i)=>[j,i])),d=new Document();d.createBuffer();const scene=d.createScene();
 const ibm=skin.getInverseBindMatrices(),matrices=new Float32Array(order.length*16),one=[];
 const s=d.createSkin('farmer');
 order.forEach((j,i)=>{
  ibm.getElement(j,one);matrices.set(one,i*16);
  const bone=d.createNode(joints[j].getName()).setMatrix(joints[j].getWorldMatrix());
  bone.setTranslation(bone.getTranslation().map(x=>+x.toFixed(5))).setRotation(bone.getRotation().map(x=>+x.toFixed(6)));
  scene.addChild(bone);s.addJoint(bone);
 });
 s.setInverseBindMatrices(d.createAccessor().setType('MAT4').setArray(matrices).setBuffer(d.getRoot().listBuffers()[0]));
 const m=d.createMesh(name),hash=crypto.createHash('sha1'),swatch=[0,0,0];let verts=0,tris=0,count=0;const kinds=new Set();
 let minY=Infinity,maxY=-Infinity;
 for(const p of mesh.listPrimitives()){
  const kind=MATERIAL[p.getMaterial()?.getName()]??'farmer';kinds.add(kind);
  let material=d.getRoot().listMaterials().find(x=>x.getName()===kind);
  if(!material)material=d.createMaterial(kind).setMetallicFactor(0).setRoughnessFactor(1);
  const q=d.createPrimitive().setMaterial(material).setIndices(copyAccessor(d,p.getIndices()));
  for(const semantic of p.listSemantics())q.setAttribute(semantic,copyAccessor(d,p.getAttribute(semantic)));
  const J=q.getAttribute('JOINTS_0'),W=q.getAttribute('WEIGHTS_0'),j=[],w=[];
  for(let i=0;i<J.getCount();i++){J.getElement(i,j);W.getElement(i,w);J.setElement(i,j.map((x,k)=>w[k]>0?index.get(x):0));}
  m.addPrimitive(q);
  const pos=p.getAttribute('POSITION'),uv=p.getAttribute('TEXCOORD_0'),v=[0,0,0],t=[0,0];
  for(let i=0;i<pos.getCount();i++){pos.getElement(i,v);hash.update(v.map(x=>x.toFixed(3)).join(','));minY=Math.min(minY,v[1]);maxY=Math.max(maxY,v[1]);if(uv&&kind==='farmer'){uv.getElement(i,t);const c=colourAt(t[0],t[1]);for(let k=0;k<3;k++)swatch[k]+=c[k];count++;}}
  verts+=pos.getCount();tris+=p.getIndices().getCount()/3;
 }
 const holder=d.createNode(name).setMesh(m).setSkin(s);scene.addChild(holder);
 d.getRoot().getAsset().extras={part:partOf(name),source:'ithappy Creative Characters'};
 const file=`${name.toLowerCase()}.glb`,bytes=await finish(d,path.join(PARTS,file));
 measured.set(name,{name,group,part:partOf(name),file,bytes,verts,tris,kinds:[...kinds],shape:hash.digest('hex').slice(0,10),
  colour:count?'#'+swatch.map(x=>Math.round(x/count).toString(16).padStart(2,'0')).join(''):null,top:+maxY.toFixed(3),bottom:+minY.toFixed(3)});
}

// The rig: the skeleton and the clips, no mesh.
const CLIPS={Idle_Breathing:'idle',Idle_Look_Around:'look',Idle_Relaxed:'relaxed',Walk_Forward:'walk'};
// The hop: the pack's jump goes 1.15 m up (the Root bone's height); a farmer tapped on the farm hops a fifth of that.
const HOP_HEIGHT=.2;
let rigBytes=0;
{
 const d=new Document();d.createBuffer();const scene=d.createScene();const map=copySkeleton(d,scene);
 const anims=new Map(root.listAnimations().map(a=>[a.getName(),a]));
 // One clip into the new document: per channel its times (from `start` on) and values; `edit(node,path,value)` may change a value.
 const channels=(a,start,edit)=>a.listChannels().map(ch=>{
  const node=ch.getTargetNode(),p=ch.getTargetPath(),s=ch.getSampler(),inp=s.getInput(),out=s.getOutput(),times=[],values=[],v=[];
  for(let i=0;i<inp.getCount();i++){times.push(inp.getScalar(i)+start);out.getElement(i,v);values.push(...(edit?edit(node.getName(),p,v.slice(),i):v));}
  return {node,path:p,times,values,type:out.getType()};
 });
 const write=(name,list)=>{
  const anim=d.createAnimation(name);
  for(const c of list){
   const input=d.createAccessor().setType('SCALAR').setArray(new Float32Array(c.times)).setBuffer(d.getRoot().listBuffers()[0]);
   const output=d.createAccessor().setType(c.type).setArray(new Float32Array(c.values)).setBuffer(d.getRoot().listBuffers()[0]);
   const sampler=d.createAnimationSampler().setInput(input).setOutput(output).setInterpolation('LINEAR');
   anim.addSampler(sampler).addChannel(d.createAnimationChannel().setTargetNode(map.get(c.node)).setTargetPath(c.path).setSampler(sampler));
  }
 };
 for(const [from,to] of Object.entries(CLIPS)){
  // The walk walks on the spot: the farm moves the farmer itself (the Root bone's 1.48 m forward a cycle is kept at its start).
  write(to,channels(anims.get(from),0,(bone,p,v,i)=>{if(to==='walk'&&bone==='Root'&&p==='translation')return [0,v[1],0];return v;}));
 }
 // Jump_Start then Jump_End, the Root bone's height a fifth.
 const lower=(bone,p,v)=>bone==='Root'&&p==='translation'?[0,v[1]*HOP_HEIGHT/1.15,0]:v;
 const first=channels(anims.get('Jump_Start'),0,lower),length=Math.max(...first.flatMap(c=>c.times)),then=channels(anims.get('Jump_End'),length+1/30,lower);
 write('hop',first.map(c=>{const t=then.find(x=>x.node===c.node&&x.path===c.path);return t?{...c,times:[...c.times,...t.times],values:[...c.values,...t.values]}:c;}));
 // A channel that holds its bone at the rest pose all through a clip moves nothing: three.js keeps such a bone at its rest pose.
 for(const a of d.getRoot().listAnimations())for(const ch of a.listChannels()){
  const node=ch.getTargetNode(),p=ch.getTargetPath(),rest=p==='translation'?node.getTranslation():p==='rotation'?node.getRotation():node.getScale();
  const out=ch.getSampler().getOutput(),v=[];let still=true;
  for(let i=0;i<out.getCount()&&still;i++){out.getElement(i,v);still=v.every((x,k)=>Math.abs(x-rest[k])<1e-4)||(p==='rotation'&&v.every((x,k)=>Math.abs(x+rest[k])<1e-4));}
  if(still){const s=ch.getSampler();ch.dispose();s.dispose();}
 }
 await d.transform(resample({tolerance:1e-4}));
 d.getRoot().getAsset().extras={rig:'farmer',source:'ithappy Creative Characters'};
 rigBytes=await finish(d,path.join(OUT,'farmer-rig.glb'));
}

// The measured catalog into game/farmer-parts.js, between its markers; and a short report.
const parts=new Map();
for(const m of measured.values()){
 const p=parts.get(m.part)??parts.set(m.part,{id:m.part,group:m.group,files:[],bytes:0,verts:0,shape:'',colour:m.colour,kinds:new Set(),top:m.top,bottom:m.bottom}).get(m.part);
 p.files.push(m.file.replace(/\.glb$/,''));p.bytes+=m.bytes;p.verts+=m.verts;p.shape+=m.shape;m.kinds.forEach(k=>p.kinds.add(k));p.top=Math.max(p.top,m.top);p.bottom=Math.min(p.bottom,m.bottom);
}
// Parts of the same shape in another colour (the pack's colour versions: 16 bodies, the tops 1-10 and 11-20, ...) share a style.
const styles=new Map();
for(const p of [...parts.values()].sort((a,b)=>a.id.localeCompare(b.id,'en',{numeric:true}))){const key=`${p.group}:${p.shape}`;if(!styles.has(key))styles.set(key,p.id);p.style=styles.get(key);}
const rows=[...parts.values()].sort((a,b)=>a.group.localeCompare(b.group)||a.id.localeCompare(b.id,'en',{numeric:true}))
 .map(p=>`[${[p.id,p.group,p.style===p.id?'':p.style,p.files.join('+'),p.bytes,p.colour??'',[...p.kinds].filter(k=>k!=='farmer').join('+')].map(x=>JSON.stringify(x)).join(',')}]`);
const text=fs.readFileSync(CATALOG,'utf8'),begin='// <measured by scripts/build-farmer.mjs>',end='// </measured>';
const a=text.indexOf(begin),b=text.indexOf(end);if(a<0||b<a)throw new Error(`${CATALOG} has no ${begin} ... ${end}`);
fs.writeFileSync(CATALOG,`${text.slice(0,a)}${begin}\n// [id, group, style (the part it is another colour of), files, bytes, colour, other materials]\nconst MEASURED=[\n${rows.join(',\n')}\n];\n${text.slice(b)}`);
const total=[...measured.values()].reduce((s,m)=>s+m.bytes,0),texBytes=fs.statSync(path.join(OUT,'farmer.webp')).size;
console.log(`${measured.size} meshes in ${parts.size} parts: ${(total/1024).toFixed(0)} KB (smallest ${Math.min(...[...measured.values()].map(m=>m.bytes))} B, largest ${Math.max(...[...measured.values()].map(m=>m.bytes))} B); rig ${(rigBytes/1024).toFixed(1)} KB; farmer.webp ${(texBytes/1024).toFixed(1)} KB`);
const by=new Map();for(const p of parts.values()){const g=by.get(p.group)??by.set(p.group,{n:0,bytes:0,styles:new Set()}).get(p.group);g.n++;g.bytes+=p.bytes;g.styles.add(p.style);}
for(const [g,{n,bytes,styles}] of by)console.log(`${g.padEnd(10)} ${String(n).padStart(3)} parts, ${String(styles.size).padStart(3)} shapes, ${(bytes/1024).toFixed(0).padStart(5)} KB, about ${(bytes/n/1024).toFixed(1)} KB each`);
