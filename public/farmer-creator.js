import * as THREE from 'three';
import {createFarmer} from './farmer.js';
import {FARMER_SLOTS,REQUIRED_SLOTS,DEFAULT_FARMER,creatorParts,farmerPart,wearPart,validFarmerConfig,rewardProgress} from './farmer-parts.js';
import {art} from './visual-icons.js';

// My farmer (20 Oct 2026; your own character since 21 Oct 2026, the owner: "Doe alle 3"): put your farmer together from the pack's parts.
// They walk on your farm and in the village; the painted avatar stays your picture everywhere else. A 3D farmer turning slowly at the
// top, a row of tabs (one a slot: skin, face, hair, ...) and the pictures of that slot's parts below (scripts/build-farmer-pictures.mjs:
// one sheet a slot, only the parts offered here). A tap puts a part on; what does not go with it comes off (farmer-parts.js wearPart).
// Hats and two costumes are earned, each with a goal of its own (farmer-parts.js FARMER_REWARDS, 21 Oct 2026): one not earned yet carries
// a lock, can be tried on, and says its goal and how far the farm is ("Catch 25 fish" 12 / 25); Save waits until everything worn is
// yours. Save sends the farm action farmer_wear (onSave), which checks it again.
export const THUMB_BASE='/assets/farmer/thumbs/';
const COLUMNS=10;
// The tabs, in this order, with their names. A tab with nothing to offer yet (the mascots: future rewards) is left out.
export const CREATOR_TABS=Object.freeze([
 ['body','Skin'],['face','Face'],['hair','Hair'],['hat','Hat'],['glasses','Glasses'],['faceExtra','Beard'],['top','Top'],['bottom','Trousers'],
 ['outfit','Outfit'],['costume','Costume'],['mascot','Mascot'],['shoes','Shoes'],['socks','Socks'],['gloves','Gloves']
].map(Object.freeze));
const TAB_NAMES=Object.fromEntries(CREATOR_TABS),FIT_ORDER=['farm','plain','fun','off'];
// The slots whose parts are earned: their tab says so, in one line.
const EARNED_TABS=new Set(['hat','costume','mascot']);
const number=n=>Number(n).toLocaleString('en-US');
// Each goal in words (farmer-parts.js FARMER_GOALS counts it).
export const GOAL_TEXTS=Object.freeze({
 harvested:n=>`Harvest ${number(n)} crops`,watered:n=>`Water ${number(n)} crops`,sold:n=>`Sell ${number(n)} crops`,eggs:n=>`Collect ${number(n)} eggs`,
 milk:n=>`Collect ${number(n)} milk`,bread:n=>`Bake ${number(n)} bread`,honey:n=>`Collect ${number(n)} honey`,pets:n=>`Pat Rex and Mimi ${number(n)} times`,
 fish:n=>`Catch ${number(n)} fish`,deliveries:n=>`Complete ${number(n)} delivery orders`,rounds:n=>`Finish ${number(n)} helping-hand rounds`,
 chores:n=>`Do ${number(n)} chores`,upgrades:n=>`Upgrade buildings ${number(n)} times`,tractor:n=>`Use the tractor ${number(n)} times`,
 visits:n=>`Play on ${number(n)} days`,streak:n=>`Play ${number(n)} days in a row`
});
// A part's goal in words ('' for a free part), and how far a farm is with it.
export function rewardText(id){const p=rewardProgress(id,{});return p?GOAL_TEXTS[p.goal](p.target):'';}
const LOCK='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.2" fill="currentColor"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const DONE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const NONE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6.5 17.5l11-11" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A part's picture: its cell in its slot's sheet (the sheet holds the parts offered here, in creatorParts' order).
export function thumbStyle(slot,id){
 const list=creatorParts(slot),i=list.findIndex(p=>p.id===id),rows=Math.ceil(list.length/COLUMNS);if(i<0)return '';
 const x=COLUMNS>1?(i%COLUMNS)/(COLUMNS-1)*100:0,y=rows>1?Math.floor(i/COLUMNS)/(rows-1)*100:0;
 return `background-image:url('${THUMB_BASE}${slot}.webp');background-size:${COLUMNS*100}% ${rows*100}%;background-position:${x.toFixed(3)}% ${y.toFixed(3)}%`;
}
let sheet=null;
function addStylesheet(){
 if(sheet||document.querySelector('link[href^="/farmer-maker.css"]'))return;
 sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/farmer-maker.css';document.head.append(sheet);
}
// Opens the window. config: the farmer as it is now; owned: the earned parts the farm has (farmer-parts.js farmerOwned); state: the farm
// (for how far a goal is); onSave(config):
// saves it (a promise; a refusal's message is shown). Returns {dialog, close, config()}.
export async function openFarmerCreator({config=DEFAULT_FARMER,owned=[],state={},onSave=async()=>{},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches}={}){
 addStylesheet();
 const saved=validFarmerConfig(config).ok?{...config}:{...DEFAULT_FARMER};
 let current={...saved},tab='body',busy=false;
 const tabs=CREATOR_TABS.filter(([slot])=>creatorParts(slot).length);
 const dialog=document.createElement('dialog');dialog.className='game-dialog is-sheet is-m farmer-maker';dialog.setAttribute('aria-labelledby','farmer-maker-title');
 dialog.innerHTML=`<div class="dialog-top"><div class="dialog-heading">${art('my-farmer','dialog-badge')}<div class="dialog-titles"><h2 id="farmer-maker-title">My farmer</h2></div><button type="button" class="icon-button close-dialog" aria-label="Close">${CLOSE}</button></div></div>
<div class="farmer-maker-stage"><canvas class="farmer-maker-preview" width="360" height="360" aria-hidden="true"></canvas></div>
<div class="market-tabs farmer-maker-tabs" role="tablist" aria-label="My farmer">${tabs.map(([slot,name])=>`<button type="button" role="tab" data-slot="${slot}" aria-selected="false"><span class="farmer-tab-thumb" aria-hidden="true"></span><span>${name}</span></button>`).join('')}</div>
<p class="farmer-maker-note" role="status" aria-live="polite" hidden></p>
<div class="farmer-maker-grid" role="group"></div>
<div class="dialog-actions farmer-maker-actions"><button type="button" class="secondary-button farmer-maker-random">Random</button><button type="button" class="primary-button farmer-maker-save" disabled>Save</button></div>`;
 document.body.append(dialog);
 const grid=dialog.querySelector('.farmer-maker-grid'),canvas=dialog.querySelector('canvas'),note=dialog.querySelector('.farmer-maker-note'),save=dialog.querySelector('.farmer-maker-save');
 const isOwned=p=>!p.earned||owned.includes(p.id);
 const lockedWorn=()=>FARMER_SLOTS.map(slot=>farmerPart(current[slot])).filter(p=>p&&!isOwned(p));
 const changed=()=>FARMER_SLOTS.some(slot=>(current[slot]??null)!==(saved[slot]??null));
 function drawTabs(){
  for(const button of dialog.querySelectorAll('[data-slot]')){
   const slot=button.dataset.slot,worn=current[slot]&&creatorParts(slot).some(p=>p.id===current[slot])?current[slot]:creatorParts(slot)[0]?.id;
   button.setAttribute('aria-selected',String(slot===tab));button.classList.toggle('active',slot===tab);
   button.querySelector('.farmer-tab-thumb').setAttribute('style',thumbStyle(slot,worn));
   button.classList.toggle('is-empty',!current[slot]);
  }
 }
 function drawGrid(){
  // The farm's own look first (a straw hat before a crown), then plain and fun; the pictures keep their sheet's cell.
  const parts=creatorParts(tab).map((p,i)=>[p,i]).sort((a,b)=>FIT_ORDER.indexOf(a[0].fit)-FIT_ORDER.indexOf(b[0].fit)||a[1]-b[1]).map(([p])=>p);
  const none=REQUIRED_SLOTS.includes(tab)?'':`<button type="button" class="farmer-part is-none" data-part="" aria-pressed="${!current[tab]}" aria-label="None">${NONE}</button>`;
  grid.setAttribute('aria-label',TAB_NAMES[tab]);
  grid.innerHTML=none+parts.map(p=>{const open=isOwned(p);return `<button type="button" class="farmer-part${open?'':' is-locked'}" data-part="${p.id}" aria-pressed="${current[tab]===p.id}" aria-label="${esc(open?TAB_NAMES[tab]:rewardText(p.id))}" style="${thumbStyle(tab,p.id)}">${open?'':`<span class="farmer-part-lock">${LOCK}</span>`}</button>`;}).join('');
 }
 // Above the pictures, a goal and how far you are (the owner, 21 Oct 2026: the goal there, not a general line): what is tried on and
 // still locked; else, on a tab with things to earn, the one worn there (done) or the closest one still to earn. Or why the save failed.
 function tabGoal(){
  if(!EARNED_TABS.has(tab))return null;
  const worn=farmerPart(current[tab]);if(worn?.earned&&isOwned(worn))return {part:worn,done:true};
  const next=creatorParts(tab).filter(p=>!isOwned(p)).map(p=>{const r=rewardProgress(p.id,state);return {part:p,share:r?r.count/r.target:0};}).sort((a,b)=>b.share-a.share)[0];
  return next?{part:next.part,done:false}:null;
 }
 function drawState(message=''){
  const locked=lockedWorn()[0],goal=message?null:locked?{part:locked,done:false}:tabGoal();
  const text=message||(goal?rewardText(goal.part.id):''),progress=goal&&!goal.done?rewardProgress(goal.part.id,state):null;
  note.hidden=!text;note.classList.toggle('is-locked',Boolean(progress));note.classList.toggle('is-done',Boolean(goal?.done));
  note.innerHTML=text?`${progress?LOCK:goal?.done?DONE:''}<span>${esc(text)}</span>${progress?`<b>${number(progress.count)} / ${number(progress.target)}</b>`:''}`:'';
  save.disabled=busy||!changed()||Boolean(locked);save.textContent=busy?'Saving…':'Save';
 }
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
 const redraw=()=>{drawTabs();drawGrid();drawState();void farmer.dress(current);};
 async function saveNow(){
  if(save.disabled)return;busy=true;drawState();
  try{await onSave({...current});busy=false;close();}
  catch(error){busy=false;drawState(error?.message||'Your farmer could not be saved. Please try again.');}
 }
 dialog.addEventListener('click',event=>{
  const t=event.target.closest('button');if(!t||busy)return;
  if(t.dataset.slot){tab=t.dataset.slot;drawTabs();drawGrid();grid.scrollTop=0;return;}
  if(t.dataset.part!==undefined){current=wearPart(current,tab,t.dataset.part||null);redraw();return;}
  if(t.classList.contains('farmer-maker-random')){current=randomFarmer(Math.random);redraw();return;}
  if(t.classList.contains('farmer-maker-save')){void saveNow();return;}
  if(t.classList.contains('close-dialog'))close();
 });
 dialog.addEventListener('close',()=>close());
 function close(){if(!running)return;running=false;farmer.dispose();renderer.dispose();if(dialog.open)dialog.close();dialog.remove();}
 drawTabs();drawGrid();drawState();
 dialog.showModal();size();new ResizeObserver(size).observe(canvas);requestAnimationFrame(loop);
 return {dialog,close,config:()=>({...current}),farmer};
}
// A random farmer from the free parts that fit the farm's look (fit farm or plain): a skin tone, a friendly face, hair, clothes, shoes.
export function randomFarmer(random=Math.random){
 const pick=(slot,ok=()=>true)=>{const list=creatorParts(slot).filter(p=>!p.earned&&(p.fit==='farm'||p.fit==='plain')&&ok(p));return list[Math.floor(random()*list.length)]?.id;};
 const c={body:pick('body',p=>p.name.startsWith('Skin')),face:pick('face'),hair:pick('hair')};
 if(random()<.35)c.outfit=pick('outfit');else{c.top=pick('top');c.bottom=pick('bottom');}
 c.shoes=pick('shoes');if(random()<.3)c.glasses=pick('glasses');if(random()<.25)c.faceExtra=pick('faceExtra');
 // Whatever clashes (big hair is fine without a hat) comes off in slot order.
 let out={body:c.body,face:c.face};for(const slot of FARMER_SLOTS)if(c[slot]&&!REQUIRED_SLOTS.includes(slot))out=wearPart(out,slot,c[slot]);
 return out;
}
