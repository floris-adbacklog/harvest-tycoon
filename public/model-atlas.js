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
// asked for once more past the browser's cache (as fetchModel in game.js does for a model); if it still fails, the model fails to
// load, and game.js puts its invisible stand-in there instead of an unpainted model.
const PALETTE=/(^|\/)(village-)?palette\.png$/;
// The palettes' colours change now and then (6 Oct 2026: deeper greens, like the loading screen's painted valley; 7 Oct: half of
// that). /assets/ is kept for a day, so the version makes a returning farmer fetch the new palette at once instead of yesterday's.
export const PALETTE_VERSION='20261007';
const palettes=new Map();
function paletteImage(loader,url){
 let image=palettes.get(url);
 if(!image){
  const current=`${url}?v=${PALETTE_VERSION}`;
  image=loader.loadAsync(current).catch(()=>loader.loadAsync(`${current}&fresh=${Date.now()}`));
  palettes.set(url,image);image.catch(()=>palettes.delete(url));
 }
 return image;
}
export function sharePalette(gltfLoader){
 return gltfLoader.register(parser=>({name:'harvest_shared_palette',loadTexture(index){
  const source=parser.json.textures[index].source,uri=parser.json.images[source]?.uri??'';
  if(!PALETTE.test(uri))return null;
  // The loader GLTFLoader chose for this browser (an ImageBitmap where it can, an <img> otherwise), asked once per palette.
  const loader=parser.textureLoader;
  const once={isImageBitmapLoader:loader.isImageBitmapLoader,load:(url,onLoad,onProgress,onError)=>paletteImage(loader,url).then(image=>onLoad(image.isTexture?image.clone():image),onError)};
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
