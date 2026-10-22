import * as THREE from 'three';
import {softenRed} from './soft-red.js';

// Every model of the pack paints from the same 1024 px colour palette (since 6 Oct 2026 one palette.png, see sharePalette below;
// before, every .glb carried its own copy of it, and an old copy can still come from the browser's cache). The farm keeps
// one palette on the graphics card instead of one per model (about 5 MB each), and buildings get a twin with a lighter, softer
// red: in the fuller light the red barns read as a deep crimson.
const BUILDING=/^(house|hangar|tower|coop|stall|greenhouse)_/;
// The Village pack (village_*, 27 Sep 2026: stalls, boats, a pier) paints from its own small palette; its models share that one.
const VILLAGE=/^village_/;
let base=null,soft=null,villageBase=null;

// The palette goes over the network once (6 Oct 2026). The copies inside the .glb files were 144 times the same 10 KB picture (and
// 10 times the Village one): 1.7 MB of the 12 MB of models, about 0.35 MB of the 3.6 MB sent (the site sends models brotli-packed),
// and a 1024 px picture decoded for every model, 4 MB of memory each time. scripts/share-palette.mjs took them out: each model now
// points at palette.png or village-palette.png beside it. Left to itself GLTFLoader would fetch and decode that file again for
// every model, so this plugin hands all of them the one picture: one request and one decode per palette per page, and no 144 cache
// checks that cost seconds on a slow phone connection. GLTFLoader still makes each model's own
// texture (its sampler, flipY, colour space) exactly as before, so material.map is there for shareAtlas and the farm looks the
// same. A model is only ready once its palette has arrived, so nothing is ever drawn without it. A palette that does not come is
// asked for again past the browser's cache (as fetchModel in game.js does for a model; paletteImage below); if it still fails, the
// model fails to load, and game.js puts its invisible stand-in there instead of an unpainted model.
const PALETTE=/(^|\/)(village-)?palette\.png$/;
// The palettes' colours change now and then (6 Oct 2026: deeper greens, like the loading screen's painted valley; 7 Oct: half of
// that). /assets/ is kept for a day, so the version makes a returning farmer fetch the new palette at once instead of yesterday's.
export const PALETTE_VERSION='20261007';
// A palette that does not answer (8 Oct 2026): the bar stood still at 12% until a refresh. All farm models wait for palette.png, and
// one request that never answered (a stalled transfer, another tab downloading the same address slowly, a decode that never ended)
// held every one of them, with nothing logged: the second try only came after an error. Now each try has a wait. When the palette is
// not there by then, a fresh request (an address of its own, so it never waits behind the stuck one in the browser's cache) goes
// beside it, the first to arrive is used and the rest are stopped. 8, 12 and 16 seconds: the 6.6 KB palette takes 0.02-0.06 s on
// broadband, 0.6 s on Fast 3G and about 4 s on Slow 3G next to the first eight models (harness, 8 Oct), so a slow line seldom needs
// a second request, and one costs 6.6 KB. After the third try (36 s) it keeps waiting for those three and never gives up: a palette
// that is merely slow still paints every model, and a page that stays stuck is opened again by loading-screen.js watchLoading after
// 30 seconds in view. A refused palette (an error, not silence) is asked for once more at once and then by the next model, as before.
export const PALETTE_WAITS=Object.freeze([8000,12000,16000]);
const palettes=new Map();
// 11 Oct 2026: the village's palette (village-scene.js) comes through here too, with its own <img> loader.
export function paletteImage(loader,url){
 let image=palettes.get(url);
 if(!image){
  const current=`${url}?v=${PALETTE_VERSION}`;
  image=new Promise((resolve,reject)=>{
   let tries=0,open=0,timer=0,over=false;
   const end=(settle,value)=>{if(over)return;over=true;clearTimeout(timer);if(open)try{loader.abort?.();}catch{}settle(value);};
   const ask=()=>{
    clearTimeout(timer);
    if(tries===PALETTE_WAITS.length)return;
    const wait=PALETTE_WAITS[tries];open++;
    // A late second picture is closed: one decoded palette per page.
    loader.loadAsync(tries++?`${current}&fresh=${Date.now()}`:current).then(picture=>{open--;if(over)picture?.close?.();else end(resolve,picture);},error=>{open--;if(!over&&!open){if(tries===1)ask();else end(reject,error);}});
    timer=setTimeout(()=>{console.warn(`The palette ${url} did not arrive within ${wait/1000} s.`);ask();},wait);
   };
   ask();
  });
  palettes.set(url,image);image.catch(()=>palettes.delete(url));
 }
 return image;
}
// A model file that sends nothing (11 Oct 2026, the 12% report again): fetchModel in game.js only asked again after an error, so a .glb
// caught in a stalled transfer (a laptop waking up, a phone between networks, a page that went to the background while loading) kept
// its place among the eight for good, and the bar stood still until watchLoading opened the page again 30 seconds later (harness, 11 Oct:
// after 15 seconds of no network the models caught in it never came, the farm stood at 95% and was opened again at 52 seconds; now it
// is ready at 23). Now a file that sends nothing for FILE_WAITS (nothing at all: every piece that arrives starts the wait again, so a
// file that is only slow is never asked for twice, and a model that waits for its palette has all its bytes already) gets a fresh
// request beside it, an address of its own as the palette's, the first to arrive is used and the rest are stopped. After the last wait
// it keeps waiting (watchLoading is there for a page that stays stuck). An error is not silence: when no request is left the file fails
// at once and its caller asks once more past the browser's cache, as before. The village and its layout (village-scene.js) come the
// same way; onProgress hears every piece.
export const FILE_WAITS=Object.freeze([8000,12000]);
export function download(url,{type='arraybuffer',waits=FILE_WAITS,onProgress}={}){
 return new Promise((resolve,reject)=>{
  const files=new THREE.FileLoader().setResponseType(type);
  let tries=0,open=0,timer=0,over=false;
  const end=(settle,value)=>{if(over)return;over=true;clearTimeout(timer);if(open)files.abort();settle(value);};
  const quiet=()=>{clearTimeout(timer);const wait=waits[tries-1];if(!over&&wait)timer=setTimeout(()=>{console.warn(`${url} sent nothing for ${wait/1000} s.`);ask();},wait);};
  const ask=()=>{
   open++;
   files.load(tries++?`${url}${url.includes('?')?'&':'?'}fresh=${Date.now()}`:url,data=>{open--;end(resolve,data);},event=>{if(over)return;quiet();onProgress?.(event);},error=>{open--;if(!over&&!open)end(reject,error);});
   quiet();
  };
  ask();
 });
}
export function sharePalette(gltfLoader){
 return gltfLoader.register(parser=>({name:'harvest_shared_palette',loadTexture(index){
  const source=parser.json.textures[index].source,uri=parser.json.images[source]?.uri??'';
  if(!PALETTE.test(uri))return null;
  // The loader GLTFLoader chose for this browser (an ImageBitmap where it can, an <img> otherwise), asked once per palette.
  const loader=parser.textureLoader;
  // An error in onLoad itself reaches onError too (8 Oct 2026); as then()'s second argument it was lost and the model waited forever.
  const once={isImageBitmapLoader:loader.isImageBitmapLoader,load:(url,onLoad,onProgress,onError)=>paletteImage(loader,url).then(image=>onLoad(image.isTexture?image.clone():image)).catch(onError)};
  return parser.loadTextureImage(index,source,once).then(texture=>{
   if(!texture)throw new Error(`The palette ${uri} could not load.`);
   texture.userData.sharedPalette=true;return texture;
  });
 }}));
}

function softTwin(texture){
 const image=texture.image,canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);softenRed(pixels.data);ctx.putImageData(pixels,0,0);
 const twin=texture.clone();twin.source=new THREE.Source(canvas);twin.needsUpdate=true;return twin;
}
export function shareAtlas(object,name){
 object.traverse(mesh=>{
  if(!mesh.isMesh)return;
  for(const material of [mesh.material].flat()){
   const map=material.map;if(!map)continue;
   let shared;
   if(VILLAGE.test(name))shared=villageBase??=map;
   else {
    shared=base??=map;
    if(BUILDING.test(name)){try{soft??=softTwin(base);shared=soft;}catch{}}
   }
   if(map===shared)continue;
   material.map=shared;
   // A picture from palette.png is the one every model shares, so it is never closed; only a model's own copy (an old .glb from
   // the browser's cache, which keeps /assets/ for a day) is freed.
   if(map!==base&&map!==villageBase){map.dispose();if(!map.userData.sharedPalette)map.image?.close?.();}
  }
 });
}
// One building in another colour (22 Oct 2026, the owner: the Sheep Barn has the Goat Shed's barn and needs a roof of its own). The
// palette is a grid of PALETTE_CELLS x PALETTE_CELLS swatches and a model picks a swatch by where its corners sit on it. repaint gives
// this one copy its own geometry and moves the corners that sit in a swatch [column,row] to another one, the same spot inside it, so
// nothing else changes: not the shared palette, not the other copies of the model (they keep the geometry the model was loaded with).
export const PALETTE_CELLS=11;
export function repaint(object,swaps){
 const cell=value=>Math.min(PALETTE_CELLS-1,Math.floor(value*PALETTE_CELLS));
 object.traverse(mesh=>{
  const uv=mesh.isMesh&&mesh.geometry.attributes.uv;if(!uv)return;
  mesh.geometry=mesh.geometry.clone();const own=mesh.geometry.attributes.uv;
  for(let i=0;i<own.count;i++){
   const u=own.getX(i),v=own.getY(i),swap=swaps.find(([[c,r]])=>cell(u)===c&&cell(v)===r);
   if(swap){const [[c,r],[toC,toR]]=swap;own.setXY(i,u+(toC-c)/PALETTE_CELLS,v+(toR-r)/PALETTE_CELLS);}
  }
  own.needsUpdate=true;
 });
 return object;
}
