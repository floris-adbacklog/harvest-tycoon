// The farmer's pictures (20 Oct 2026, the owner: "Doe 2"), drawn at build time from the game's own farmer files (scripts/build-farmer.mjs)
// by the game's own code (public/farmer.js) in the installed Google Chrome, headless and muted, and saved as WebP with cwebp:
//   public/assets/farmer/thumbs/<slot>.webp     one sheet a slot (body, face, hair, ...): every part of it, 96 px a picture, 10 a row,
//                                               in the order of partsOfSlot (public/farmer-parts.js); the creator shows them
//   public/assets/farmer/portrait/<id>.webp     one layer a part that shows in a head-and-shoulders picture, 160 px, transparent, all
//                                               in one fixed pose and camera; a portrait is its parts' layers stacked (farmer-portrait.js)
// A layer is drawn with the bare body in front of the camera as an unseen shape: what the head and shoulders hide (the back of the hair,
// the inside of a hood) is left out, so the layers stack as the farmer looks. Nothing goes over the network: Chrome reaches only the
// small server this script starts on this computer, and is stopped (by its own process) at the end.
//   node scripts/build-farmer-pictures.mjs [only: thumbs|portraits]
import {createServer} from 'node:http';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'),PUBLIC=path.join(ROOT,'public'),OUT=path.join(PUBLIC,'assets/farmer');
const only=process.argv[2]??'';
const CHROME=process.env.CHROME??'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const THUMB=96,THUMB_COLUMNS=10,LAYER=160;
const TYPES={'.html':'text/html','.js':'text/javascript','.glb':'model/gltf-binary','.webp':'image/webp','.png':'image/png','.json':'application/json'};

// The page Chrome draws on: one renderer, one farmer, the camera per picture.
const PAGE=`<!doctype html><html><head><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/vendor/three.module.js","three/addons/":"/vendor/addons/"}}</script></head><body style="margin:0;background:transparent">
<script type="module">
import * as THREE from 'three';
import {createFarmer} from '/farmer.js';
import {FARMER_PARTS,partsOfSlot,FARMER_SLOTS} from '/farmer-parts.js';
import {PORTRAIT_CAMERA,PORTRAIT_GROUPS,BASE_BODY} from '/farmer-portrait.js';
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.setClearColor(0x000000,0);
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff6e6,0x9a8a6a,1.7));const sun=new THREE.DirectionalLight(0xffffff,1.9);sun.position.set(2.5,5,6);scene.add(sun);
const farmer=await createFarmer({},{height:1.83});scene.add(farmer.root);
farmer.actions.idle.play();farmer.mixer.setTime(0);
// The unseen body: the same shape, drawn only into the depth buffer, so what it hides stays out of a layer.
const occluder=await createFarmer({},{height:1.83});await occluder.wearFiles([FARMER_PARTS[BASE_BODY].files[0]]);occluder.actions.idle.play();occluder.mixer.setTime(0);
const hidden=new THREE.MeshBasicMaterial({colorWrite:false});occluder.root.traverse(n=>{if(n.isMesh){n.material=hidden;n.renderOrder=-1;}});scene.add(occluder.root);
const camera=new THREE.PerspectiveCamera(24,1,.05,50),HAT_ROOM=1.12;
const settle=async()=>{farmer.mixer.update(0);farmer.root.updateMatrixWorld(true);occluder.mixer.update(0);occluder.root.updateMatrixWorld(true);};
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
 const parts=partsOfSlot(slot),rows=Math.ceil(parts.length/${THUMB_COLUMNS}),big=document.createElement('canvas');big.width=${THUMB_COLUMNS}*${THUMB};big.height=rows*${THUMB};
 const g=big.getContext('2d');renderer.setSize(${THUMB}*2,${THUMB}*2);camera.aspect=1;camera.updateProjectionMatrix();occluder.root.visible=false;
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
window.layer=async id=>{
 const p=FARMER_PARTS[id];renderer.setSize(${LAYER},${LAYER});camera.aspect=1;camera.fov=PORTRAIT_CAMERA.fov;camera.updateProjectionMatrix();
 camera.position.set(...PORTRAIT_CAMERA.position);camera.lookAt(...PORTRAIT_CAMERA.target);camera.updateMatrixWorld();
 await farmer.wearFiles(p.files);await settle();
 occluder.root.visible=p.group!=='body';
 // A hat's own inside (the far side of its crown) would show where the hair is: for a hat the unseen head is a little bigger, about as
 // much as hair fills it, so a hat's layer keeps only what is seen from outside.
 occluder.bones.get('Head').scale.setScalar(p.group==='hat'||p.group==='helmet'?HAT_ROOM:1);occluder.root.updateMatrixWorld(true);
 renderer.render(scene,camera);
 return renderer.domElement.toDataURL('image/png');
};
window.portraitIds=()=>Object.values(FARMER_PARTS).filter(p=>PORTRAIT_GROUPS.includes(p.group)).map(p=>p.id);
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
 if(only!=='portraits'){
  let total=0;
  for(const slot of await evaluate('window.slots')){
   const {count,png}=await evaluate(`window.sheet(${JSON.stringify(slot)})`);
   const bytes=webp(png,path.join(OUT,'thumbs',`${slot}.webp`),['-q','82','-alpha_q','90','-m','6']);total+=bytes;
   console.log(`thumbs/${slot}.webp: ${count} pictures, ${(bytes/1024).toFixed(1)} KB`);
  }
  console.log(`thumbnails: ${(total/1024).toFixed(0)} KB`);
 }
 if(only!=='thumbs'){
  fs.rmSync(path.join(OUT,'portrait'),{recursive:true,force:true});
  const ids=await evaluate('window.portraitIds()');let total=0;
  for(const part of ids)total+=webp(await evaluate(`window.layer(${JSON.stringify(part)})`),path.join(OUT,'portrait',`${part}.webp`),['-q','85','-alpha_q','92','-m','6','-exact']);
  console.log(`portrait layers: ${ids.length}, ${(total/1024).toFixed(0)} KB, about ${(total/ids.length/1024).toFixed(1)} KB each`);
 }
 ws.close();
}finally{
 chrome.kill();server.close();await sleep(300);try{fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:200});}catch{}
}
