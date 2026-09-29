// Builds World II's village (public/assets/village/village.glb and village-layout.json, 30 Sep 2026) from the ITHappy Studios
// Village pack's demo scene (assets-source/village, not in git). Every object that is a separate model of the pack, moved, turned
// and scaled, becomes one entry in the layout and the model goes into the GLB once (with colour variants where the scene recoloured
// it); the rest goes in as it is. The game draws each model as one InstancedMesh (public/village-scene.js). 54 MB -> ~4.5 MB.
// Run from a folder with @gltf-transform/core, extensions, functions, cli and pngjs installed (npm i them there, not in the game):
//   node build-village.mjs <pack>/Village_Summer_glb/Village_Summer.glb <pack>/Village_Summer_glb/Separate_assets_glb <out>
//   gltf-transform meshopt <out>/village.glb public/assets/village/village.glb --level high
//   cp <out>/village-layout.json public/assets/village/
import {NodeIO,Document} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {mergeDocuments,dedup,prune,weld,quantize,unpartition} from '@gltf-transform/functions';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const [,,demoPath,sepDir,outDir]=process.argv;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS);
const demo=await io.read(demoPath);
const mul=(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;};
const apply=(m,[x,y,z])=>[m[0]*x+m[4]*y+m[8]*z+m[12],m[1]*x+m[5]*y+m[9]*z+m[13],m[2]*x+m[6]*y+m[10]*z+m[14]];
// The pack colours everything from one palette texture: the colour is in the texture coordinates, so a model only counts as the same
// when its UVs and material match too (a summer and an autumn tree share their shape).
// Two objects look the same when every vertex reads the same palette colour (their UVs may differ within a palette cell).
import {PNG} from 'pngjs';
const paletteImage=demo.getRoot().listTextures()[0].getImage(),palette=PNG.sync.read(Buffer.from(paletteImage));
const colour=(u,v)=>{const x=Math.min(palette.width-1,Math.max(0,Math.floor((u-Math.floor(u))*palette.width))),y=Math.min(palette.height-1,Math.max(0,Math.floor((v-Math.floor(v))*palette.height))),i=(y*palette.width+x)*4;return (palette.data[i]>>3)<<10|(palette.data[i+1]>>3)<<5|(palette.data[i+2]>>3);};
function looks(mesh){const uv=[],mats=[];for(const p of mesh.listPrimitives()){mats.push(p.getMaterial()?.getName()??'');const a=p.getAttribute('TEXCOORD_0'),v=[0,0];if(a)for(let i=0;i<a.getCount();i++){a.getElement(i,v);uv.push(colour(v[0],v[1]));}}return {uv,mats:mats.join('|')};}
const sameLook=(x,y)=>x.mats===y.mats&&x.uv.length===y.uv.length&&x.uv.every((v,i)=>v===y.uv[i]);
function positions(mesh,matrix){const out=[];for(const p of mesh.listPrimitives()){const a=p.getAttribute('POSITION'),v=[0,0,0];for(let i=0;i<a.getCount();i++){a.getElement(i,v);out.push(matrix?apply(matrix,v):[...v]);}}return out;}
// Largest eigenvector of a symmetric 4×4 matrix (Jacobi).
function eigenMax(N){const a=N.map(r=>[...r]),v=[[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
 for(let sweep=0;sweep<60;sweep++){let off=0;for(let p=0;p<4;p++)for(let q=p+1;q<4;q++)off+=a[p][q]**2;if(off<1e-18)break;
  for(let p=0;p<4;p++)for(let q=p+1;q<4;q++){if(Math.abs(a[p][q])<1e-20)continue;const th=(a[q][q]-a[p][p])/(2*a[p][q]),t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)),c=1/Math.sqrt(t*t+1),s=t*c;
   for(let k=0;k<4;k++){const akp=a[k][p],akq=a[k][q];a[k][p]=c*akp-s*akq;a[k][q]=s*akp+c*akq;}
   for(let k=0;k<4;k++){const apk=a[p][k],aqk=a[q][k];a[p][k]=c*apk-s*aqk;a[q][k]=s*apk+c*aqk;}
   for(let k=0;k<4;k++){const vkp=v[k][p],vkq=v[k][q];v[k][p]=c*vkp-s*vkq;v[k][q]=s*vkp+c*vkq;}}}
 let best=0;for(let i=1;i<4;i++)if(a[i][i]>a[best][best])best=i;return [v[0][best],v[1][best],v[2][best],v[3][best]];}
// Similarity transform (uniform scale s, rotation q, translation t) mapping A onto B, and how well it fits.
function fit(A,B){
 const n=A.length,ca=[0,0,0],cb=[0,0,0];for(let i=0;i<n;i++)for(let k=0;k<3;k++){ca[k]+=A[i][k]/n;cb[k]+=B[i][k]/n;}
 const S=[[0,0,0],[0,0,0],[0,0,0]];let na=0,nb=0;
 for(let i=0;i<n;i++){const a=[A[i][0]-ca[0],A[i][1]-ca[1],A[i][2]-ca[2]],b=[B[i][0]-cb[0],B[i][1]-cb[1],B[i][2]-cb[2]];for(let r=0;r<3;r++)for(let c=0;c<3;c++)S[r][c]+=a[r]*b[c];na+=a[0]**2+a[1]**2+a[2]**2;nb+=b[0]**2+b[1]**2+b[2]**2;}
 const [[xx,xy,xz],[yx,yy,yz],[zx,zy,zz]]=S;
 const N=[[xx+yy+zz,yz-zy,zx-xz,xy-yx],[yz-zy,xx-yy-zz,xy+yx,zx+xz],[zx-xz,xy+yx,-xx+yy-zz,yz+zy],[xy-yx,zx+xz,yz+zy,-xx-yy+zz]];
 const [w,x,y,z]=eigenMax(N),s=Math.sqrt(nb/Math.max(na,1e-12));
 const R=[1-2*(y*y+z*z),2*(x*y+w*z),2*(x*z-w*y),2*(x*y-w*z),1-2*(x*x+z*z),2*(y*z+w*x),2*(x*z+w*y),2*(y*z-w*x),1-2*(x*x+y*y)];
 const rot=p=>[R[0]*p[0]+R[3]*p[1]+R[6]*p[2],R[1]*p[0]+R[4]*p[1]+R[7]*p[2],R[2]*p[0]+R[5]*p[1]+R[8]*p[2]];
 const rc=rot(ca),t=[cb[0]-s*rc[0],cb[1]-s*rc[1],cb[2]-s*rc[2]];
 let err=0;for(let i=0;i<n;i++){const r=rot(A[i]);err+=(s*r[0]+t[0]-B[i][0])**2+(s*r[1]+t[1]-B[i][1])**2+(s*r[2]+t[2]-B[i][2])**2;}
 const size=Math.sqrt(nb/n)||1;
 return {m:[s*R[0],s*R[1],s*R[2],0,s*R[3],s*R[4],s*R[5],0,s*R[6],s*R[7],s*R[8],0,t[0],t[1],t[2],1],rms:Math.sqrt(err/n)/size};
}
const assets=new Map(),placements=[],leftovers=[],variants=new Map();let fitted=0;
// Every separate model, by its vertex count: an object whose name does not lead to its file ("props.012", "building.004") is
// matched against the models with as many vertices, and the best fit wins.
const byCount=new Map();
for(const f of fs.readdirSync(sepDir).filter(f=>f.endsWith('.glb'))){const base=f.slice(0,-4),doc=await io.read(path.join(sepDir,f));const an=doc.getRoot().listNodes().find(n=>n.getMesh());if(!an)continue;
 const asset={doc,verts:positions(an.getMesh(),an.getWorldMatrix()),look:looks(an.getMesh())};assets.set(base,asset);const n=asset.verts.length;(byCount.get(n)??byCount.set(n,[]).get(n)).push(base);}
for(const node of demo.getRoot().getDefaultScene().listChildren()){
 const mesh=node.getMesh();if(!mesh){continue;}
 const base=node.getName().replace(/\.\d+$/,'');
 const world=node.getWorldMatrix(),local=positions(mesh);
 const look=looks(mesh),candidates=[base,...(byCount.get(local.length)??[]).filter(k=>k!==base)].filter(k=>assets.get(k)?.verts.length===local.length);
 let best=null;for(const k of candidates){const f=fit(assets.get(k).verts,local);if(f.rms<0.01&&(!best||f.rms<best.f.rms))best={k,f};if(best&&best.f.rms<1e-4)break;}
 if(best){
  // Same shape, own colours: a variant of the model, made once from the first object that has them (its vertices moved back
  // into the model's space) and used for every object with the same colours.
  let key=best.k;
  if(!sameLook(assets.get(best.k).look,look)){key=`${best.k}~${crypto.createHash('md5').update(look.mats+look.uv.join(',')).digest('hex').slice(0,6)}`;if(!variants.has(key))variants.set(key,{node,m:best.f.m});}
  else assets.get(best.k).used=true;
  placements.push({a:key,m:mul(world,best.f.m).map(v=>Math.round(v*10000)/10000)});fitted++;continue;}
 leftovers.push(node);
}
if(process.env.REPORT){const by={};for(const n of leftovers){const k=n.getName().replace(/\.\d+$/,'');by[k]=(by[k]??0)+1;}console.log(Object.entries(by).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>k+':'+v).join('  '));process.exit(0);}
console.log('fitted',fitted,'leftover',leftovers.length,'models',[...assets.values()].filter(a=>a.used).length,'variants',variants.size);
// One GLB: every used model as a named node at the origin, and the leftover objects where they stand (under "static").
const out=new Document();
for(const [base,a] of assets)if(a.used){mergeDocuments(out,a.doc);const scene=out.getRoot().listScenes().at(-1);for(const n of scene.listChildren())n.setName(base);}
const target=out.getRoot().listScenes()[0]??out.createScene('village');
for(const s of out.getRoot().listScenes().slice(1)){for(const n of s.listChildren())target.addChild(n);s.dispose();}
const statics=out.createNode('static');target.addChild(statics);
mergeDocuments(out,demo);
const demoScene=out.getRoot().listScenes().at(-1),keep=new Set(leftovers.map(n=>n.getName())),protos=new Map([...variants].map(([key,v])=>[v.node.getName(),{key,m:v.m}]));
for(const n of demoScene.listChildren()){
 const proto=protos.get(n.getName());
 if(proto){
  const [a,b,c,,d,e,f,,g,h,i,,tx,ty,tz]=proto.m,s2=a*a+b*b+c*c;   // m = s·R | t: the inverse is Rᵀ/s, applied to (p - t)
  const inv=p=>{const x=p[0]-tx,y=p[1]-ty,z=p[2]-tz;return [(a*x+b*y+c*z)/s2,(d*x+e*y+f*z)/s2,(g*x+h*y+i*z)/s2];};
  const rot=p=>{const s=Math.sqrt(s2);return [(a*p[0]+b*p[1]+c*p[2])/s,(d*p[0]+e*p[1]+f*p[2])/s,(g*p[0]+h*p[1]+i*p[2])/s];};
  const mesh=n.getMesh().clone();
  for(const prim of mesh.listPrimitives()){
   const pos=prim.getAttribute('POSITION').clone(),nor=prim.getAttribute('NORMAL')?.clone(),v=[0,0,0];prim.setAttribute('POSITION',pos);if(nor)prim.setAttribute('NORMAL',nor);
   for(let k=0;k<pos.getCount();k++){pos.getElement(k,v);pos.setElement(k,inv(v));}
   if(nor)for(let k=0;k<nor.getCount();k++){nor.getElement(k,v);nor.setElement(k,rot(v));}
  }
  const model=out.createNode(proto.key).setMesh(mesh);target.addChild(model);n.dispose();continue;
 }
 if(keep.has(n.getName()))statics.addChild(n);else n.dispose();
}
demoScene.dispose();
await out.transform(dedup(),prune(),weld(),quantize(),unpartition());
fs.mkdirSync(outDir,{recursive:true});
await io.write(path.join(outDir,'village.glb'),out);
fs.writeFileSync(path.join(outDir,'village-layout.json'),JSON.stringify(placements));
console.log('village.glb',(fs.statSync(path.join(outDir,'village.glb')).size/1048576).toFixed(2),'MB · layout',(fs.statSync(path.join(outDir,'village-layout.json')).size/1024).toFixed(0),'KB · textures',out.getRoot().listTextures().length);
