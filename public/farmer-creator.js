import * as THREE from 'three';
import {createFarmer} from './farmer.js';
import {FARMER_SLOTS,REQUIRED_SLOTS,DEFAULT_FARMER,partsOfSlot,wearPart,validFarmerConfig} from './farmer-parts.js';
import {farmerPortrait} from './farmer-portrait.js';

// My farmer (20 Oct 2026, prototype for the owner; not in Settings yet and nothing is saved): build your farmer from the pack's parts.
// A 3D farmer turning slowly at the top, a row of tabs (one a slot: skin, face, hair, ...) and the pictures of that slot's parts
// below (scripts/build-farmer-pictures.mjs: one picture sheet a slot). A tap puts a part on; what does not go with it comes off
// (farmer-parts.js wearPart). The window's picture is the farmer's own portrait (farmer-portrait.js). A hat, a costume or a mascot is
// earned (FARMER_GROUPS): it carries a lock, and can still be tried on.
export const THUMB_BASE='/assets/farmer/thumbs/';
const COLUMNS=10;
// The tabs, in this order, with their names.
export const CREATOR_TABS=Object.freeze([
 ['body','Skin'],['face','Face'],['hair','Hair'],['hat','Hat'],['glasses','Glasses'],['faceExtra','Beard'],['top','Top'],['bottom','Trousers'],
 ['outfit','Outfit'],['costume','Costume'],['mascot','Mascot'],['shoes','Shoes'],['socks','Socks'],['gloves','Gloves']
].map(Object.freeze));
const TAB_NAMES=Object.fromEntries(CREATOR_TABS),FIT_ORDER=['farm','plain','fun','off'];
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LOCK='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const NONE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6.5 17.5l11-11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
// A part's picture: its cell in its slot's sheet.
export function thumbStyle(slot,id){
 const list=partsOfSlot(slot),i=list.findIndex(p=>p.id===id),rows=Math.ceil(list.length/COLUMNS);if(i<0)return '';
 const x=COLUMNS>1?(i%COLUMNS)/(COLUMNS-1)*100:0,y=rows>1?Math.floor(i/COLUMNS)/(rows-1)*100:0;
 return `background-image:url('${THUMB_BASE}${slot}.webp');background-size:${COLUMNS*100}% ${rows*100}%;background-position:${x.toFixed(3)}% ${y.toFixed(3)}%`;
}
let sheet=null;
function addStylesheet(){
 if(sheet||document.querySelector('link[href^="/farmer-maker.css"]'))return;
 sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/farmer-maker.css';document.head.append(sheet);
}
// Opens the window. config: the farmer to start from; owned: the earned parts the farmer has (null: all of them look open, for the
// harness); onDone(config): the farmer when Done is tapped. Returns {dialog, close, config()}.
export async function openFarmerCreator({config=DEFAULT_FARMER,owned=null,onDone=()=>{},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 addStylesheet();
 let current=validFarmerConfig(config).ok?{...config}:{...DEFAULT_FARMER},tab='body';
 const dialog=document.createElement('dialog');dialog.className='game-dialog is-sheet is-m farmer-maker';dialog.setAttribute('aria-labelledby','farmer-maker-title');
 dialog.innerHTML=`<div class="dialog-top"><div class="dialog-heading"><span class="dialog-badge farmer-maker-badge"></span><div class="dialog-titles"><h2 id="farmer-maker-title">My farmer</h2></div><button type="button" class="icon-button close-dialog" aria-label="Close">${CLOSE}</button></div></div>
<div class="farmer-maker-stage"><canvas class="farmer-maker-preview" width="360" height="360" aria-hidden="true"></canvas></div>
<div class="market-tabs farmer-maker-tabs" role="tablist" aria-label="My farmer">${CREATOR_TABS.map(([slot,name])=>`<button type="button" role="tab" data-slot="${slot}" aria-selected="false"><span class="farmer-tab-thumb" aria-hidden="true"></span><span>${name}</span></button>`).join('')}</div>
<div class="farmer-maker-grid" role="group"></div>
<div class="dialog-actions farmer-maker-actions"><button type="button" class="secondary-button farmer-maker-random">Random</button><button type="button" class="primary-button farmer-maker-done">Done</button></div>`;
 document.body.append(dialog);
 const grid=dialog.querySelector('.farmer-maker-grid'),badge=dialog.querySelector('.farmer-maker-badge'),canvas=dialog.querySelector('canvas');
 const isOwned=p=>!p.earned||!owned||owned.includes(p.id);
 function drawTabs(){
  for(const button of dialog.querySelectorAll('[data-slot]')){
   const slot=button.dataset.slot,worn=current[slot]??partsOfSlot(slot)[0]?.id;
   button.setAttribute('aria-selected',String(slot===tab));button.classList.toggle('active',slot===tab);
   button.querySelector('.farmer-tab-thumb').setAttribute('style',thumbStyle(slot,worn));
   button.classList.toggle('is-empty',!current[slot]);
  }
 }
 function drawGrid(){
  // The farm's own look first (a straw hat before a traffic cone), then plain, fun and off; the pictures keep their sheet's cell.
  const parts=partsOfSlot(tab).map((p,i)=>[p,i]).sort((a,b)=>FIT_ORDER.indexOf(a[0].fit)-FIT_ORDER.indexOf(b[0].fit)||a[1]-b[1]).map(([p])=>p),none=REQUIRED_SLOTS.includes(tab)?'':`<button type="button" class="farmer-part is-none" data-part="" aria-pressed="${!current[tab]}" aria-label="None">${NONE}</button>`;
  grid.setAttribute('aria-label',TAB_NAMES[tab]);
  grid.innerHTML=none+parts.map((p,i)=>`<button type="button" class="farmer-part${isOwned(p)?'':' is-locked'}" data-part="${p.id}" aria-pressed="${current[tab]===p.id}" aria-label="${esc(p.name)}" title="${esc(p.name)}" style="${thumbStyle(tab,p.id)}">${isOwned(p)?'':`<span class="farmer-part-lock">${LOCK}</span>`}</button>`).join('');
 }
 function drawBadge(){badge.innerHTML=farmerPortrait(current,{size:44});}
 // The 3D preview: its own small renderer, the farmer breathing and turning slowly (standing still with reduced motion).
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.outputColorSpace=THREE.SRGBColorSpace;
 const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xfff6e6,0x9a8a6a,1.7));const sun=new THREE.DirectionalLight(0xffffff,1.9);sun.position.set(2.5,5,6);scene.add(sun);
 const camera=new THREE.PerspectiveCamera(24,1,.1,30);camera.position.set(0,1.15,5.2);camera.lookAt(0,.95,0);
 const farmer=await createFarmer(current,{height:1.83});scene.add(farmer.root);farmer.actions.idle?.play();
 let running=true,last=performance.now(),turn=-.35;
 function size(){const w=canvas.clientWidth||300,h=canvas.clientHeight||300;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
 function loop(now){
  if(!running)return;requestAnimationFrame(loop);
  const dt=Math.min(.1,(now-last)/1000);last=now;
  // With reduced motion the farmer stands still, in the idle's first pose (not the pack's arms-out rest pose).
  if(!reducedMotion)turn+=dt*.35;farmer.mixer.update(reducedMotion?0:dt);
  farmer.root.rotation.y=turn;renderer.render(scene,camera);
 }
 async function wear(slot,id){current=wearPart(current,slot,id||null);drawTabs();drawGrid();drawBadge();await farmer.dress(current);}
 dialog.addEventListener('click',event=>{
  const t=event.target.closest('button');if(!t)return;
  if(t.dataset.slot){tab=t.dataset.slot;drawTabs();drawGrid();grid.scrollTop=0;return;}
  if(t.dataset.part!==undefined){void wear(tab,t.dataset.part);return;}
  if(t.classList.contains('farmer-maker-random')){current=randomFarmer(Math.random);drawTabs();drawGrid();drawBadge();void farmer.dress(current);return;}
  if(t.classList.contains('farmer-maker-done')){onDone({...current});close();return;}
  if(t.classList.contains('close-dialog'))close();
 });
 dialog.addEventListener('close',()=>close());
 function close(){if(!running)return;running=false;farmer.dispose();renderer.dispose();if(dialog.open)dialog.close();dialog.remove();}
 drawTabs();drawGrid();drawBadge();
 dialog.showModal();size();new ResizeObserver(size).observe(canvas);requestAnimationFrame(loop);
 return {dialog,close,config:()=>({...current}),farmer};
}
// A random farmer from the free parts that fit the farm's look (fit farm or plain): a skin tone, a friendly face, hair, clothes, shoes.
export function randomFarmer(random=Math.random){
 const pick=(slot,ok=()=>true)=>{const list=partsOfSlot(slot).filter(p=>!p.earned&&(p.fit==='farm'||p.fit==='plain')&&ok(p));return list[Math.floor(random()*list.length)]?.id;};
 let c={body:pick('body',p=>p.name.startsWith('Skin')),face:pick('face'),hair:pick('hair')};
 if(random()<.35)c.outfit=pick('outfit');else{c.top=pick('top');c.bottom=pick('bottom');}
 c.shoes=pick('shoes');if(random()<.3)c.glasses=pick('glasses');if(random()<.25)c.faceExtra=pick('faceExtra');
 for(const slot of FARMER_SLOTS)if(!c[slot])delete c[slot];
 // Whatever clashes (big hair is fine without a hat) comes off in slot order.
 let out={body:c.body,face:c.face};for(const slot of FARMER_SLOTS)if(c[slot]&&!REQUIRED_SLOTS.includes(slot))out=wearPart(out,slot,c[slot]);
 return out;
}
