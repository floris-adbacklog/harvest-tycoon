// The farmer's pictures (20 Oct 2026, the owner: "Doe 2"), drawn at build time from the game's own farmer files (scripts/build-farmer.mjs)
// by the game's own code (public/farmer.js) in the installed Google Chrome, headless and muted, and saved as WebP with cwebp:
//   public/assets/farmer/thumbs/<slot>.webp     one sheet a slot (body, face, hair, ...): every part My farmer offers, 96 px a picture,
//                                               10 a row, in the order of creatorParts (public/farmer-parts.js); a slot with none has no sheet
//   public/assets/icons/my-farmer.webp          My farmer's own picture (its title, its buttons): the default farmer in the straw hat
// (The stacked portrait layers of 20 Oct 2026 are gone: the painted avatars stay everyone's picture, the owner, 20 Oct 2026.)
// Nothing goes over the network: Chrome reaches only the small server this script starts on this computer, and is stopped (by its own
// process) at the end.
//   node scripts/build-farmer-pictures.mjs
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'),PUBLIC=path.join(ROOT,'public'),OUT=path.join(PUBLIC,'assets/farmer');
const CHROME=process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const THUMB=96,THUMB_COLUMNS=10;
const TYPES={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.json':'application/json'};

// The page Chrome draws on: one renderer, one farmer, the camera per picture.
const PAGE=`<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script></head><body style="margin:0;background:transparent">
<script type="module">
import * as THREE from 'three';
import {createFarmer} from '/farmer.js';
import {FARMER_PARTS,creatorParts,FARMER_SLOTS,DEFAULT_FARMER,farmerFiles} from '/farmer-parts.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff6e6,0x9a8a6a,1.7));const sun=new THREE.DirectionalLight(0xffffff,1.9);sun.position.set(2.5,5,6);scene.add(sun);
const farmer=await createFarmer({},{height:1.83});scene.add(farmer.root);
farmer.actions.idle.play();farmer.mixer.setTime(0);
const camera=new THREE.PerspectiveCamera(24,1,.05,50);
const settle=async()=>{farmer.mixer.update(0);farmer.root.updateMatrixWorld(true);};
// What a thumbnail shows each part on (a hat on a bald head with a face, a top on the bare body, ...) and how close it looks.
const BASE={body:[],face:['body_010'],hair:['body_010','male_emotion_usual_002'],hat:['body_010','male_emotion_usual_002'],glasses:['body_010','male_emotion_usual_002'],
 faceExtra:['body_010','male_emotion_usual_002'],top:['body_010'],bottom:['body_010'],outfit:['body_010'],costume:['body_010','male_emotion_usual_002'],
 mascot:['body_010','male_emotion_usual_002'],shoes:['body_010'],socks:['body_010'],gloves:['body_010']};
// The part's own box (the bare body's for a body), framed from a little to the right of the front.
function frame(box,{min=.35,pad=1.15}={}){
 const c=box.getCenter(new THREE.Vector3()),s=box.getSize(new THREE.Vector3()),r=Math.max(min,s.x,s.y,s.z*.6)*pad/2;
 const dir=new THREE.Vector3(.42,.16,1).normalize(),d=r/Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 camera.position.copy(c).addScaledVector(dir,d);camera.lookAt(c);camera.updateMatrixWorld();
}
window.sheet=async slot=>{
 const parts=creatorParts(slot);if(!parts.length)return {count:0,png:null};
 const rows=Math.ceil(parts.length/${THUMB_COLUMNS}),big=document.createElement('canvas');big.width=${THUMB_COLUMNS}*${THUMB};big.height=rows*${THUMB};
 const g=big.getContext('2d');renderer.setSize(${THUMB}*2,${THUMB}*2);camera.aspect=1;camera.updateProjectionMatrix();
 for(let i=0;i<parts.length;i++){
  const p=parts[i];
  await farmer.wearFiles([...(slot==='body'?[]:BASE[slot].map(id=>FARMER_PARTS[id].files).flat()),...p.files]);await settle();
  const box=new THREE.Box3();
  farmer.root.traverse(n=>{if(n.isSkinnedMesh&&p.files.includes(n.userData.file))box.expandByObject(n,true);});
  if(slot==='body')box.set(new THREE.Vector3(-.3,.85,-.2),new THREE.Vector3(.3,1.9,.2));
  if(slot==='face')box.set(new THREE.Vector3(-.16,1.48,-.1),new THREE.Vector3(.16,1.8,.15));
  if(box.isEmpty())box.set(new THREE.Vector3(-.3,.2,-.2),new THREE.Vector3(.3,1.9,.2));
  frame(box,{min:slot==='gloves'?.5:.3});
  renderer.render(scene,camera);
  g.drawImage(renderer.domElement,(i%${THUMB_COLUMNS})*${THUMB},Math.floor(i/${THUMB_COLUMNS})*${THUMB},${THUMB},${THUMB});
 }
 return {count:parts.length,png:big.toDataURL('image/png')};
};
// The My farmer picture (the window's title, its buttons, its Settings row): the default farmer in the straw hat, head and shoulders.
window.icon=async()=>{
 renderer.setSize(256,256);camera.aspect=1;camera.fov=15;camera.updateProjectionMatrix();
 await farmer.wearFiles(farmerFiles({...DEFAULT_FARMER,hat:'hat_009'}));await settle();
 camera.position.set(.62,1.85,3.6);camera.lookAt(.1,1.53,0);camera.updateMatrixWorld();renderer.render(scene,camera);
 // Trimmed to the farmer (a few pixels of room), square, so a small icon is mostly farmer.
 const src=document.createElement('canvas');src.width=src.height=256;const g=src.getContext('2d');g.drawImage(renderer.domElement,0,0);
 const px=g.getImageData(0,0,256,256).data;let x0=256,y0=256,x1=0,y1=0;
 for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(px[(y*256+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 const side=Math.max(x1-x0,y1-y0)+8,cx=(x0+x1)/2,cy=(y0+y1)/2,out=document.createElement('canvas');out.width=out.height=256;
 out.getContext('2d').drawImage(src,cx-side/2,cy-side/2,side,side,0,0,256,256);
 return out.toDataURL('image/png');
};
window.slots=FARMER_SLOTS;
window.ready=true;
</script></body></html>`;

const server=createServer((req,res)=>{
 const url=decodeURIComponent(new URL(req.url,'http://x').pathname);
 if(url==='/__farmer-pictures.html'){res.writeHead(200,{'content-type':'text/html'});res.end(PAGE);return;}
 const file=path.normalize(path.join(PUBLIC,url));
 if(!file.startsWith(PUBLIC)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404).end();return;}
 res.writeHead(200,{'content-type':TYPES[path.extname(file)]??'application/octet-stream'});res.end(fs.readFileSync(file));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const port=server.address().port,profile=fs.mkdtempSync(path.join(os.tmpdir(),'farmer-pictures-')),debug=9300+Math.floor(Math.random()*500);
const chrome=spawn(CHROME,['--headless=new','--mute-audio',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',
 '--disable-background-networking','--disable-component-update','--disable-sync','--ignore-gpu-blocklist','--enable-gpu-rasterization',
 '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127.0.0.1','--no-proxy-server','--window-size=800,800','about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
try{
 let target;for(let i=0;i<75&&!target;i++){try{target=(await (await fetch(`http://127.0.0.1:${debug}/json`)).json()).find(t=>t.type==='page');}catch{}if(!target)await sleep(200);}
 if(!target)throw new Error('Chrome did not start');
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);let id=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')console.error('page:',m.params.exceptionDetails.exception?.description??m.params.exceptionDetails.text);};
 const send=(method,params={})=>new Promise((r,j)=>{const i=++id;pending.set(i,m=>m.error?j(new Error(m.error.message)):r(m.result));ws.send(JSON.stringify({id:i,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description??r.exceptionDetails.text);return r.result.value;};
 await send('Runtime.enable');await send('Page.enable');
 await send('Page.navigate',{url:`http://127.0.0.1:${port}/__farmer-pictures.html`});
 for(let i=0;i<200;i++){await sleep(150);try{if(await evaluate('window.ready===true'))break;}catch{}}
 const webp=(dataUrl,file,args)=>{const tmp=path.join(profile,'p.png');fs.writeFileSync(tmp,Buffer.from(dataUrl.split(',')[1],'base64'));fs.mkdirSync(path.dirname(file),{recursive:true});execFileSync('cwebp',['-quiet',...args,tmp,'-o',file]);return fs.statSync(file).size;};
 let total=0;
 for(const slot of await evaluate('window.slots')){
  const {count,png}=await evaluate(`window.sheet(${JSON.stringify(slot)})`);
  if(!count){fs.rmSync(path.join(OUT,'thumbs',`${slot}.webp`),{force:true});console.log(`thumbs/${slot}.webp: nothing offered yet, no sheet`);continue;}
  const bytes=webp(png,path.join(OUT,'thumbs',`${slot}.webp`),['-q','82','-alpha_q','90','-m','6']);total+=bytes;
  console.log(`thumbs/${slot}.webp: ${count} pictures, ${(bytes/1024).toFixed(1)} KB`);
 }
 console.log(`thumbnails: ${(total/1024).toFixed(0)} KB`);
 console.log(`icons/my-farmer.webp: ${(webp(await evaluate('window.icon()'),path.join(PUBLIC,'assets/icons/my-farmer.webp'),['-q','88','-alpha_q','95','-m','6'])/1024).toFixed(1)} KB`);
 ws.close();
}finally{
 chrome.kill();server.close();await sleep(300);try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
}
