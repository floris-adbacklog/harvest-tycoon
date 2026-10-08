import test,{mock} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,mkdtempSync,copyFileSync,writeFileSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as nodeModule from 'node:module';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const dir=new URL('public/assets/models/',root);
const glb=buf=>{
 const jl=buf.readUInt32LE(12),json=JSON.parse(buf.subarray(20,20+jl).toString('utf8'));
 const binAt=20+jl,bin=buf.length>binAt?buf.subarray(binAt+8,binAt+8+buf.readUInt32LE(binAt)):Buffer.alloc(0);
 return {json,bin};
};

// 6 Oct 2026: every .glb carried its own copy of the palette (144 of the Farm one, 10 of the Village one, 1.7 MB of the models).
// The models now point at one palette.png (village-palette.png for village_*) beside them, fetched once a page.
test('the palette goes over the network once: every model points at palette.png or village-palette.png and carries no copy of it',()=>{
 const palette=readFileSync(new URL('palette.png',dir)),village=readFileSync(new URL('village-palette.png',dir));
 assert.equal(palette.subarray(1,4).toString(),'PNG');assert.equal(village.subarray(1,4).toString(),'PNG');
 for(const f of readdirSync(dir).filter(f=>f.endsWith('.glb'))){
  const {json,bin}=glb(readFileSync(new URL(f,dir)));
  for(const image of json.images??[]){
   if(image.bufferView!=null){
    const v=json.bufferViews[image.bufferView],bytes=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);
    assert.ok(!bytes.equals(palette)&&!bytes.equals(village),`${f} carries its own copy of the palette again: run node scripts/share-palette.mjs`);
    continue;
   }
   assert.equal(image.uri,f.startsWith('village_')?'village-palette.png':'palette.png',`${f} points at the wrong palette`);
  }
 }
});

test('one request and one decode per palette: GLTFLoader gets the shared palette, and the shared picture is never closed',()=>{
 const game=read('public/game.js'),atlas=read('public/model-atlas.js');
 assert.match(game,/gltfLoader\?\?=sharePalette\(new GLTFLoader\(\)\);/,'the models\' loader shares the palette');
 assert.match(atlas,/export function sharePalette\(gltfLoader\)\{\n return gltfLoader\.register\(/);
 assert.match(atlas,/const PALETTE=\/\(\^\|\\\/\)\(village-\)\?palette\\\.png\$\/;/);
 assert.match(atlas,/let image=palettes\.get\(url\);/,'one fetch per palette address, shared by every model');
 assert.match(atlas,/const current=`\$\{url\}\?v=\$\{PALETTE_VERSION\}`;/,'the current palette, its version past a day-old cache');
 assert.match(atlas,/loader\.loadAsync\(tries\+\+\?`\$\{current\}&fresh=\$\{Date\.now\(\)\}`:current\)/,'asked again past the browser\'s cache');
 assert.match(atlas,/export const PALETTE_WAITS=Object\.freeze\(\[8000,12000,16000\]\);/,'8, 12 and 16 seconds, as the comment explains');
 assert.match(atlas,/palettes\.set\(url,image\);image\.catch\(\(\)=>palettes\.delete\(url\)\);/,'a refused palette is asked for again by the next model');
 assert.match(atlas,/if\(tries===PALETTE_WAITS\.length\)return;/,'after the third try it keeps waiting: no give-up, no stand-ins for a slow palette');
 assert.match(atlas,/const loader=parser\.textureLoader;/,'the same ImageBitmap or <img> loader GLTFLoader chose for this browser');
 assert.match(atlas,/return parser\.loadTextureImage\(index,source,once\)\.then\(texture=>\{\n   if\(!texture\)throw new Error/,'no palette: the model fails (and gets its stand-in), it is never drawn unpainted');
 assert.match(atlas,/if\(map!==base&&map!==villageBase\)\{map\.dispose\(\);if\(!map\.userData\.sharedPalette\)map\.image\?\.close\?\.\(\);\}/,'closing the shared picture would blank every model');
});

test('scripts/share-palette.mjs takes a copy out again, keeps the rest byte for byte, and changes nothing on a second run',()=>{
 const tmp=mkdtempSync(join(tmpdir(),'palette-'));
 try{
  for(const f of ['palette.png','village-palette.png','plant_001.glb','village_boat_001.glb'])copyFileSync(new URL(f,dir),join(tmp,f));
  // plant_001 as it came from the pack: the palette inside the file again.
  const shared=readFileSync(new URL('plant_001.glb',dir)),{json,bin}=glb(shared),palette=readFileSync(new URL('palette.png',dir));
  const at=(bin.length+3)&~3,grown=Buffer.concat([bin,Buffer.alloc(at-bin.length),palette,Buffer.alloc(((palette.length+3)&~3)-palette.length)]);
  json.bufferViews.push({buffer:0,byteOffset:at,byteLength:palette.length});const {uri,...image}=json.images[0];json.images[0]={bufferView:json.bufferViews.length-1,...image};json.buffers[0].byteLength=grown.length;
  let text=Buffer.from(JSON.stringify(json));text=Buffer.concat([text,Buffer.alloc(((text.length+3)&~3)-text.length,0x20)]);
  const head=Buffer.alloc(20),binHead=Buffer.alloc(8);head.writeUInt32LE(0x46546c67,0);head.writeUInt32LE(2,4);head.writeUInt32LE(28+text.length+grown.length,8);head.writeUInt32LE(text.length,12);head.writeUInt32LE(0x4e4f534a,16);
  binHead.writeUInt32LE(grown.length,0);binHead.writeUInt32LE(0x004e4942,4);
  writeFileSync(join(tmp,'plant_001.glb'),Buffer.concat([head,text,binHead,grown]));
  const first=execFileSync(process.execPath,[new URL('scripts/share-palette.mjs',root).pathname,tmp],{encoding:'utf8'});
  assert.match(first,/1 of 2 models now point at the palette/);
  assert.ok(readFileSync(join(tmp,'plant_001.glb')).equals(shared),'the same file as the one in the game');
  assert.match(execFileSync(process.execPath,[new URL('scripts/share-palette.mjs',root).pathname,tmp],{encoding:'utf8'}),/0 of 2 models now point at the palette/);
  assert.ok(existsSync(join(tmp,'village-palette.png')));
 }finally{rmSync(tmp,{recursive:true,force:true});}
});

// 8 Oct 2026: the farm often stood at 12% until a refresh. All farm models wait for palette.png, and a request that never answered held
// every one of them for good. These load real models with the real GLTFLoader, model-atlas.js and game.js's own fetchModel/loadModel,
// eight at a time as the farm does, over a pretend network and a pretend clock.
const {registerHooks}=nodeModule,vendor=new URL('public/vendor/',root).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const FARM=['plant_001','house_005','apiary_001','bag_001','barrel_001','bucket_001','bush_001','bush_002','bush_003','apiary_002','bag_002','barrel_002'],VILLAGE=['village_barrels_001','village_boat_001'];
const flush=async(rounds=40)=>{for(let i=0;i<rounds;i++)await new Promise(resolve=>setImmediate(resolve));};
const later=async ms=>{for(let t=0;t<ms;t+=250){mock.timers.tick(Math.min(250,ms-t));await flush(4);}await flush();};
let farms=0;
async function loadFarm(rule){
 const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{loadInBatches}=await import('../public/render-resources.js');
 // A fresh model-atlas.js each time: one page, with its own palettes.
 const {sharePalette,shareAtlas}=await import(`../public/model-atlas.js?farm=${++farms}`);
 const net={asked:[],aborted:[],decodes:0,closed:0,warned:[]};
 globalThis.self??=globalThis;   // GLTFLoader reads self.URL, as in a browser
 globalThis.Request=class{constructor(url,init={}){this.url=url;this.signal=init.signal;}};
 globalThis.ProgressEvent??=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
 globalThis.fetch=async(input,init={})=>{
  const url=typeof input==='string'?input:input.url,signal=init.signal??input.signal,file=url.split('?')[0].split('/').pop();
  net.asked.push(url);const how=rule(url,net.asked.filter(u=>u.split('?')[0].endsWith('/'+file)).length);
  if(how==='hang')return new Promise((_,reject)=>signal?.addEventListener('abort',()=>{net.aborted.push(url);reject(new DOMException('The operation was aborted.','AbortError'));}));
  // A number: the answer comes after that many milliseconds (a palette that is only slow).
  if(typeof how==='number')return new Promise((resolve,reject)=>{let came=false;const timer=setTimeout(()=>{came=true;resolve(new Response(readFileSync(new URL(file,dir))));},how);signal?.addEventListener('abort',()=>{if(came)return;clearTimeout(timer);net.aborted.push(url);reject(new DOMException('The operation was aborted.','AbortError'));});});
  if(how==='404')return new Response('Not found',{status:404});
  return new Response(readFileSync(new URL(file,dir)));
 };
 globalThis.createImageBitmap=async blob=>{
  const bytes=new Uint8Array(await blob.arrayBuffer());
  if(bytes[1]!==0x50||bytes[2]!==0x4e)throw new DOMException('The source image could not be decoded.','InvalidStateError');
  net.decodes++;return {width:1024,height:1024,close(){net.closed++;}};
 };
 const models=new Map(),game=read('public/game.js'),from=game.indexOf('let gltfLoader=null;'),to=game.indexOf(' models.set(name,{object:group,size});\n}',from);
 const quiet={warn:(...a)=>net.warned.push(a.map(String).join(' ')),error:(...a)=>net.warned.push(a.map(String).join(' '))},{warn,error}=console;
 Object.assign(console,quiet);
 const {loadModel}=new Function('THREE','GLTFLoader','sharePalette','shareAtlas','models','console',`${game.slice(from,to)} models.set(name,{object:group,size});\n}\nreturn {loadModel};`)(THREE,GLTFLoader,sharePalette,shareAtlas,models,quiet);
 const farm={net,models,loaded:0,done:false,restore:()=>Object.assign(console,{warn,error}),
  standIns:()=>[...models.values()].filter(m=>m.object.children[0]?.material?.visible===false).length,
  painted:()=>[...models.values()].filter(m=>{let map=null;m.object.traverse(n=>{if(n.isMesh)map??=n.material.map;});return map?.image?.width===1024;}).length,
  palette:()=>net.asked.filter(u=>/\/palette\.png/.test(u))};
 loadInBatches([...FARM,...VILLAGE],async name=>{await loadModel(name);farm.loaded++;},8).then(()=>{farm.done=true;});
 return farm;
}
test('a palette request that never answers: after 8 seconds a fresh one beside it, and every model loads painted',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const farm=await loadFarm((url,nth)=>/\/palette\.png/.test(url)&&nth===1?'hang':'ok');t.after(farm.restore);
 await later(7900);
 assert.equal(farm.done,false);assert.equal(farm.loaded,0,'the first eight models wait for the palette (the 12% of the reports)');assert.equal(farm.palette().length,1,'no second request before 8 seconds');
 await later(400);
 assert.equal(farm.done,true,'loaded without a refresh');assert.equal(farm.loaded,FARM.length+VILLAGE.length);
 assert.equal(farm.standIns(),0);assert.equal(farm.painted(),FARM.length+VILLAGE.length,'every model painted from the palette');
 assert.equal(farm.palette().length,2);assert.match(farm.palette()[1],/palette\.png\?v=\d+&fresh=\d+$/,'an address of its own: it cannot wait behind the stuck one in the browser\'s cache');
 assert.deepEqual(farm.net.aborted,[farm.palette()[0]],'the stuck request is stopped');
 assert.equal(farm.net.decodes,2,'one decode per palette (the farm\'s and the village\'s)');
 assert.ok(farm.net.warned.some(line=>/palette\.png did not arrive within 8 s/.test(line)),'and it says so in the console');
});
test('a palette that never answers at all: three tries in 36 seconds, then it keeps waiting (watchLoading opens the page again), and never gives the farm stand-ins',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const farm=await loadFarm(url=>/\/palette\.png/.test(url)?'hang':'ok');t.after(farm.restore);
 await later(120000);
 assert.equal(farm.done,false);assert.equal(farm.loaded,0);assert.equal(farm.standIns(),0,'no empty valley: the bar waits, and loading-screen.js opens the page again after 30 seconds in view');
 assert.equal(farm.palette().length,3,'one plain request, then two fresh ones at 8 and 20 seconds, shared by all models; none after');assert.deepEqual(farm.net.aborted,[],'none of the three is stopped');
});
test('a palette that only comes after 40 seconds still paints every model, with no model fetched twice',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const farm=await loadFarm((url,nth)=>/\/palette\.png/.test(url)?(nth===1?40000:'hang'):'ok');t.after(farm.restore);
 await later(36300);
 assert.equal(farm.done,false);assert.equal(farm.loaded,0);assert.equal(farm.standIns(),0,'no stand-ins after 36 seconds');
 assert.equal(farm.palette().length,3);assert.deepEqual(farm.net.aborted,[],'nothing stopped: the first request may still come');
 await later(4000);
 assert.equal(farm.done,true);assert.equal(farm.standIns(),0);assert.equal(farm.painted(),FARM.length+VILLAGE.length,'every model painted from the palette');
 assert.deepEqual(farm.net.aborted,farm.palette().slice(1),'the two fresh requests are stopped once the first one came');
 assert.equal(farm.net.asked.filter(u=>/\.glb/.test(u)).length,FARM.length+VILLAGE.length,'no model downloaded again past the cache');
});
test('a refused palette is still asked again at once, and a palette that comes stops the clock',{skip},async t=>{
 mock.timers.enable({apis:['setTimeout']});t.after(()=>mock.timers.reset());
 const refused=await loadFarm((url,nth)=>/\/palette\.png/.test(url)&&nth<=2?'404':'ok');t.after(refused.restore);
 await later(100);
 assert.equal(refused.done,true,'no waiting: an error goes straight to the next try');assert.equal(refused.standIns(),0);assert.equal(refused.palette().length,3);
 refused.restore();
 const fine=await loadFarm(()=>'ok');t.after(fine.restore);
 await later(100);assert.equal(fine.done,true);assert.equal(fine.palette().length,1,'one request');assert.equal(fine.net.decodes,2,'one decode per palette');
 await later(60000);assert.equal(fine.palette().length,1,'no try left waiting');assert.deepEqual(fine.net.warned,[]);
});
test('an error inside onLoad reaches onError: the model fails (and gets its stand-in) instead of waiting forever',{skip},async()=>{
 const {sharePalette}=await import(`../public/model-atlas.js?farm=${++farms}`);
 const textureLoader={isImageBitmapLoader:true,loadAsync:async()=>({width:1024,height:1024,close(){}})};
 const parser={json:{textures:[{source:0}],images:[{uri:'palette.png'}]},textureLoader,loadTextureImage:(index,source,once)=>new Promise((resolve,reject)=>once.load('/assets/models/palette.png',()=>{throw new Error('onLoad broke');},undefined,reject))};
 let plugin=null;sharePalette({register:make=>{plugin=make(parser);}});
 const result=await Promise.race([plugin.loadTexture(0).then(()=>'loaded',error=>error.message),flush().then(()=>'still waiting')]);
 assert.equal(result,'onLoad broke');
});
