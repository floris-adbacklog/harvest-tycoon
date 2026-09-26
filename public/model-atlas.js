import * as THREE from 'three';
import {softenRed} from './soft-red.js';

// Every model of the pack paints from the same 1024 px colour palette, and every .glb carries its own copy of it. The farm keeps
// one palette on the graphics card instead of one per model (about 5 MB each), and buildings get a twin with a lighter, softer
// red: in the fuller light the red barns read as a deep crimson.
const BUILDING=/^(house|hangar|tower|coop|stall|greenhouse)_/;
let base=null,soft=null;

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
   base??=map;
   let shared=base;
   if(BUILDING.test(name)){try{soft??=softTwin(base);shared=soft;}catch{}}
   if(map===shared)continue;
   material.map=shared;
   if(map!==base){map.dispose();map.image?.close?.();}
  }
 });
}
