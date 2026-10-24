// The first steps' spotlight (24 Oct 2026, the owner, after players said a new farm overwhelmed them: "Doe alle 4"). During the Beginner
// guide's first four steps (harvest, sell, plant, water; game.js spotTarget) the farm dims except the place to tap: the ripe corn, the
// empty fields, the growing ones. For the sale the whole farm dims and the Market button, which stands above it with the other buttons,
// glows. It only shows: every tap goes through to the farm. The buttons, the step line and the guide's pointer stay bright above it
// (beginner.css: the farm's names lie at z-index 2, the spotlight at 4, the bars from 6). Never over a window. "Skip tutorial" ends it on
// this device. Nothing here ever throws.
export const SPOT_SKIP_KEY='harvest-tycoon:spotlight-skipped';
export const SPOT_PAD=14;
export function createSpotlight({doc=globalThis.document,storage=(()=>{try{return globalThis.localStorage;}catch{return null;}})(),onSkip=null}={}){
 let skipped=false;try{skipped=storage?.getItem(SPOT_SKIP_KEY)==='1';}catch{}
 const host=doc.getElementById?.('game');
 const layer=doc.createElement('div');layer.className='spotlight';layer.hidden=true;layer.setAttribute('aria-hidden','true');
 const hole=doc.createElement('div');hole.className='spotlight-hole';
 const skip=doc.createElement('button');skip.type='button';skip.className='spotlight-skip';skip.textContent='Skip tutorial';
 skip.addEventListener('click',()=>{skipped=true;try{storage?.setItem(SPOT_SKIP_KEY,'1');}catch{}hide();onSkip?.();});
 layer.append(hole);host?.append(layer,skip);skip.hidden=true;
 let last='';
 function hide(){if(!layer.hidden){layer.hidden=true;skip.hidden=true;last='';}}
 // rect: the place to tap, in page pixels ({left,top,right,bottom}); null with all: dim the whole farm.
 function show(rect,{all=false}={}){
  try{
   if(skipped||!host||!rect&&!all){hide();return;}
   const box=host.getBoundingClientRect();
   const spot=rect?{left:Math.round(rect.left-box.left-SPOT_PAD),top:Math.round(rect.top-box.top-SPOT_PAD),width:Math.round(rect.right-rect.left+2*SPOT_PAD),height:Math.round(rect.bottom-rect.top+2*SPOT_PAD)}:null;
   const key=spot?`${spot.left},${spot.top},${spot.width},${spot.height}`:'all';
   layer.hidden=false;skip.hidden=false;if(key===last)return;last=key;
   layer.classList.toggle('is-all',!spot);hole.hidden=!spot;
   if(spot)Object.assign(hole.style,{left:`${spot.left}px`,top:`${spot.top}px`,width:`${spot.width}px`,height:`${spot.height}px`});
  }catch{}
 }
 return {show,hide,get skipped(){return skipped;}};
}
