// Moving things on your own farm (24 Oct 2026, the owner: "Doe optie 2"; the rules are game/farm-map.js). The Move button (beside the
// camera buttons, and in More from the start) turns the farm into a board:
//  1. Tap a building's yard, a field, or a tree or path tile you placed: it is picked up and its spot shows on the ground, green where
//     it fits and red where it does not.
//  2. Drag it (it moves in half steps). Dragging the grass still moves the camera.
//  3. Rotate turns a building a quarter (the owner: "Rotate building maybe?"; R on a keyboard); a field or a tree does not turn.
//  4. Place here saves it (the farm action layout_move); Cancel puts it back. Store puts a tree or tile you placed away. Done (or Esc)
//     ends it.
// A tree, bush or rock on the land is in the way: tap it and Clear it for coins (layout_clear, milestone 2). Build (milestone 3) buys a
// tree or a path tile, or places one you stored, where you drag it.
// A path is drawn (24 Oct 2026, the owner: "kan je draggen om een road te tekenen", then "1+2"): Path tile in Build turns a drag into
// path tiles on a 2-step grid, and Erase turns a drag into taking tiles and the old roads' pieces away (into your store). Save keeps the
// whole drag at once (layout_paths): tiles from your store first, then for coins.
// What may not stand on: unopened land, the pond, a road, or anything else on the farm. The farmhouse and the pond stay where they are.
import {landAt,landOpen,WATER,LAYOUT_GRID,FIXED_YARDS,DECOR,clearCost,PATH_GRID} from './farm-map.js';

const snap=v=>Math.round(v/LAYOUT_GRID)*LAYOUT_GRID;
// Neighbouring yards' fences may touch: two boxes only clash when they overlap by more than this on both sides.
export const LAYOUT_SLACK=.6;
const clash=(a,b,slack)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>slack&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>slack;
// Why a box [minX, maxX, minZ, maxZ] does not fit (or null when it does): 'land' (not open at this level), 'water', 'road', 'taken', or
// the kind of obstacle standing in it ('tree', 'bush', 'rock': blockers are {x, z, kind}).
export function misfit(box,{level,others=[],roads=[],blockers=[],slack=LAYOUT_SLACK}){
 const [a,b,c,d]=box,s=slack;
 if(![[a+s,c+s],[b-s,c+s],[a+s,d-s],[b-s,d-s],[(a+b)/2,(c+d)/2]].every(([x,z])=>landOpen(level,x,z)))return 'land';
 if(WATER.some(w=>clash(box,w,0)))return 'water';
 if(roads.some(r=>clash(box,r,s)))return 'road';
 if(others.some(o=>clash(box,o,s)))return 'taken';
 const hit=blockers.find(o=>o.x>a+.2&&o.x<b-.2&&o.z>c+.2&&o.z<d-.2);
 return hit?hit.kind:null;
}
const HINT={
 none:'Tap something to move it, or a tree to clear it.',
 shop:'Choose a tree or a path tile to place.',
 held:'Drag it where you want it, then tap Place here.',
 water:'Not in the pond.',
 road:'Not on a road.',
 taken:'Something is in the way.',
 tree:'A tree is in the way. Tap it to clear it.',
 bush:'A bush is in the way. Tap it to clear it.',
 rock:'A rock is in the way. Tap it to clear it.',
 fixed:'The farmhouse and the pond stay where they are.',
 draw:'Drag over the grass to draw a path.',
 drawFence:'Drag over the grass to put up a fence.',
 drawPlants:'Drag over the grass to plant them.',
 erase:'Drag over a path or a road to take it away.'
};
const OFFER={tree:(coins,xp)=>`Clear this tree for ${coins} coins (+${xp} XP)?`,bush:(coins,xp)=>`Clear this bush for ${coins} coins (+${xp} XP)?`,rock:(coins,xp)=>`Clear this rock for ${coins} coins (+${xp} XP)?`};
// The picture on each Build tile: a painted one where there is one (data-game-art), else a line icon.
const ICON=Object.freeze(Object.fromEntries(Object.keys(DECOR).map(kind=>[kind,`art:decor-${kind}`])));
const icon=name=>name.startsWith('art:')?`<i data-game-art="${name.slice(4)}"></i>`:`<i data-lucide="${name}"></i>`;
const decorId=id=>/^d\d+$/.test(id);
// pick(event): the id of what is under the pointer (a yard's name, field:N, dN for a placed tree or tile, new:<kind> for one being
// bought, o:... for an obstacle) or null. groundAt(event): [x, z] on the ground. spotOf(id) and preview(id, at): where it stands
// and moving it on the screen. footprint(id): its box where it stands now. others(id): the boxes of everything else. roads(): the
// road boxes. blockers(): the obstacles still standing. mark(box, ok): the spot on the ground (null clears it).
// rotate(id, at): turns it a quarter in place and gives its new spot [x, z, turn]. spawn(kind): a new tree or tile in view, {id, at};
// discard(id) takes it away again. save(id, at, {fresh, kind}), store(id), clear(id): the farm actions. level(), coins(), stored():
// the farm's level, coins and stored trees and tiles. refresh(): draws new icons. pathAt([x, z]): the path tile or old road piece there.
// brush({add, remove}): shows a drag's new tiles and what it takes away. savePaths({add, remove}): the farm action layout_paths.
export function createLayoutEditor({doc=document,root=doc.documentElement,bar,inventory=null,level,coins=()=>0,stored=()=>({}),pick,groundAt,spotOf,preview,footprint,others,roads,blockers=()=>[],mark,rotate,spawn,discard=()=>{},save,store,clear,pathAt=()=>null,brush:showBrush=()=>{},savePaths,notify=()=>{},onToggle=()=>{},refresh=()=>{}}){
 let on=false,held=null,offer=null,shop=false,priced=null,brush=null;const brushKinds=new Map();
 const $=id=>bar.querySelector(`[data-layout="${id}"]`);
 const shopRow=$('shop');
 shopRow.innerHTML=Object.entries(DECOR).map(([kind,d])=>`<button type="button" data-kind="${kind}">${icon(ICON[kind])}<span>${d.name}</span><b data-price="${kind}"></b></button>`).join('');
 const price=kind=>(stored()[kind]??0)>0?0:DECOR[kind].coins;
 function show(){
  const all=['rotate','store','erase','cancel','place','done','build','clear','keep'],visible=new Set();
  let hint,wrong=false;
  if(brush){
   const adds=brush.add.size,removes=brush.remove.size,cost=brushCost();
   hint=cost>coins()?`You need ${cost} coins.`:brush.mode==='erase'?HINT.erase:brush.kind==='fence'?HINT.drawFence:brush.kind==='path'?HINT.draw:HINT.drawPlants;wrong=cost>coins();
   visible.add('erase');visible.add('cancel');visible.add('place');
   $('erase').setAttribute('aria-pressed',String(brush.mode==='erase'));
   $('place').disabled=!adds&&!removes||cost>coins();$('place').textContent=cost?`Buy for ${cost}`:'Save';
  }else if(offer){
   const piece=landAt(offer.x,offer.z),open=landOpen(level(),offer.x,offer.z),short=coins()<offer.cost.coins;
   hint=!open?`This land opens at level ${piece?.level??'?'}.`:short?`You need ${offer.cost.coins} coins to clear it.`:OFFER[offer.cost.kind](offer.cost.coins,offer.cost.xp);
   wrong=!open||short;visible.add('keep');if(open)visible.add('clear');$('clear').disabled=short;
  }else if(held){
   const why=held.why,cost=held.fresh?price(held.kind):0,short=cost>coins();
   hint=why==='land'?`This land opens at level ${landAt(...held.at)?.level??'?'}.`:why?HINT[why]:short?`You need ${cost} coins.`:HINT.held;
   wrong=Boolean(why)||short;
   visible.add('cancel');visible.add('place');
   if(!held.fresh&&!decorId(held.id)&&!held.id.startsWith('field:'))visible.add('rotate');
   if(decorId(held.id))visible.add('store');
   $('place').disabled=wrong;
   $('place').textContent=!held.fresh?'Place here':cost?`Buy for ${cost}`:'Place';
  }else{hint=shop?HINT.shop:HINT.none;visible.add('build');visible.add('done');}
  $('hint').textContent=hint;$('hint').classList.toggle('is-wrong',wrong);
  for(const k of all)$(k).hidden=!visible.has(k);
  $('build').setAttribute('aria-pressed',String(shop));shopRow.hidden=!(shop&&!held&&!offer&&!brush);
  showInventory();
  // The prices (or how many you stored) are drawn again only when they change: a drag shows the bar many times a second.
  const key=JSON.stringify(stored());
  if(key!==priced){priced=key;for(const kind of Object.keys(DECOR)){const n=stored()[kind]??0;shopRow.querySelector(`[data-price="${kind}"]`).innerHTML=n?`${n} stored`:`<i data-lucide="coins"></i>${DECOR[kind].coins}`;}refresh();}
 }
 // Your things (24 Oct 2026, the owner: "Doe ook een inventory in het build scherm rechtsboven met al je spullen"): what you stored,
 // top right while Build is open; a tap places one (for free).
 let stocked=null;
 function showInventory(){
  if(!inventory)return;
  inventory.hidden=!(on&&shop&&!held&&!offer&&!brush);if(inventory.hidden)return;
  const have=Object.entries(stored()).filter(([kind,n])=>n>0&&DECOR[kind]),key=JSON.stringify(have);if(key===stocked)return;stocked=key;
  inventory.querySelector('[data-inventory]').innerHTML=have.map(([kind,n])=>`<button type="button" data-kind="${kind}" title="${DECOR[kind].name}">${icon(ICON[kind])}<b>${n}</b></button>`).join('');
  inventory.querySelector('[data-inventory-empty]').hidden=have.length>0;refresh();
 }
 function check(){
  const box=footprint(held.id);
  held.why=box?misfit(box,{level:level(),others:others(held.id),roads:roads(),blockers:blockers()}):'taken';
  mark(box,!held.why&&!(held.fresh&&price(held.kind)>coins()));
 }
 function start(){if(on)return;on=true;root.classList.add('farm-editing');bar.hidden=false;show();onToggle(true);}
 function stop(){if(!on)return;endBrush();cancel();offer=null;shop=false;on=false;root.classList.remove('farm-editing');bar.hidden=true;if(inventory)inventory.hidden=true;mark(null);onToggle(false);}
 function cancel(){if(brush){endBrush();show();return;}if(!held)return;if(held.fresh)discard(held.id);else preview(held.id,held.from);held=null;mark(null);show();}
 async function place(){
  if(brush){
   const edit={kind:brush.kind,add:[...brush.add.values()],remove:[...brush.remove]};if(!edit.add.length&&!edit.remove.length||brushCost()>coins())return;
   try{await savePaths(edit);}catch(error){notify(error.message);}
   endBrush();if(on)show();return;
  }
  if(!held||held.why)return;
  const {id,at,from,fresh,kind}=held;if(fresh&&price(kind)>coins())return;
  held=null;mark(null);show();
  if(!fresh&&at.every((v,i)=>v===from[i]))return;
  try{await save(id,at,{fresh,kind});}catch(error){if(!fresh)preview(id,from);notify(error.message);}
  finally{if(fresh)discard(id);if(on)show();}
 }
 async function putAway(){
  if(!held||!decorId(held.id))return;
  const {id,from}=held;held=null;mark(null);show();
  try{await store(id);}catch(error){preview(id,from);notify(error.message);}
  if(on)show();
 }
 function offerClear(id){
  const cost=clearCost(id);if(!cost)return;
  const [,,x,z]=id.split(':');offer={id,cost,x:Number(x)/10,z:Number(z)/10};shop=false;show();
 }
 async function clearIt(){
  if(!offer)return;const {id}=offer;offer=null;show();
  try{await clear(id);}catch(error){notify(error.message);}
  if(held)check();if(on)show();
 }
 // A press: on something that moves it is picked up (or taken again) and the drag moves it; on a tree, bush or rock it offers to
 // clear it; anywhere else the camera moves.
 function grab(event){
  if(!on)return false;
  if(brush){brush.last=null;paint(event);return true;}
  const id=pick(event);if(!id)return false;
  if(id.startsWith('o:')){offerClear(id);return false;}
  if(FIXED_YARDS.includes(id)){notify(HINT.fixed);return false;}
  const ground=groundAt(event);if(!ground)return false;
  offer=null;shop=false;
  if(held&&held.id!==id)cancel();
  if(!held){const from=spotOf(id);held={id,from,at:from,why:null};}
  held.start=ground;held.base=held.at;check();show();
  return true;
 }
 function drag(event){
  if(brush){paint(event);return;}
  if(!held?.start)return;
  const ground=groundAt(event);if(!ground)return;
  const at=[snap(held.base[0]+ground[0]-held.start[0]),snap(held.base[1]+ground[1]-held.start[1]),...held.at.slice(2)];
  if(at[0]===held.at[0]&&at[1]===held.at[1])return;
  preview(held.id,at);held.at=at;check();show();
 }
 function drop(){if(brush)brush.last=null;if(held)held.start=null;}
 // Drawing a path: every 2-step cell the drag passes (checked every step of 1, so a quick drag leaves no gaps) gets a tile where one
 // fits; in Erase every path tile or old road piece it passes goes (a tile drawn in this same drag just goes again).
 const cell=v=>Math.round(v/PATH_GRID)*PATH_GRID;
 function brushCost(){
  if(!brush)return 0;const back=[...brush.remove].filter(id=>brushKinds.get(id)===brush.kind).length,free=(stored()[brush.kind]??0)+back;
  return Math.max(0,brush.add.size-free)*DECOR[brush.kind].coins;
 }
 function brushRules(){brush.rules={level:level(),others:others('path:new',brush.remove),roads:roads(),blockers:blockers()};}
 function paint(event){
  const at=groundAt(event);if(!at)return;
  const from=brush.last??at,steps=Math.max(1,Math.ceil(Math.hypot(at[0]-from[0],at[1]-from[1])));brush.last=at;let changed=false;
  for(let i=1;i<=steps;i++){
   const x=from[0]+(at[0]-from[0])*i/steps,z=from[1]+(at[1]-from[1])*i/steps;
   if(brush.mode==='draw'){
    const c=[cell(x),cell(z)],key=c.join(',');if(brush.add.has(key))continue;
    // A fence runs the way the drag goes: along x (0) or along z (1); the first one follows the second.
    if(brush.kind==='fence'){const prev=brush.lastCell;const turn=prev&&Math.abs(c[1]-prev[1])>Math.abs(c[0]-prev[0])?1:0;c.push(turn);if(prev&&brush.add.size===1)brush.add.get(prev.join(',')).splice(2,1,turn);}
    const planned=[...brush.add.values()].map(([px,pz])=>[px-1,px+1,pz-1,pz+1]);
    if(misfit([c[0]-1,c[0]+1,c[1]-1,c[1]+1],{...brush.rules,others:brush.rules.others.concat(planned)}))continue;
    brush.add.set(key,c);brush.lastCell=c.slice(0,2);changed=true;
   }else{
    const key=[cell(x),cell(z)].join(',');if(brush.add.delete(key)){changed=true;continue;}
    const found=pathAt([x,z]);if(found&&!brush.remove.has(found.id)){brush.remove.add(found.id);brushKinds.set(found.id,found.kind);changed=true;}
   }
  }
  if(changed){showBrush({kind:brush.kind,add:[...brush.add.values()],remove:[...brush.remove]});if(brush.mode==='erase')brushRules();show();}
 }
 function startBrush(kind='path'){cancel();offer=null;shop=false;brush={kind,mode:'draw',add:new Map(),remove:new Set(),last:null,lastCell:null};brushKinds.clear();brushRules();show();}
 function endBrush(){if(!brush)return;brush=null;showBrush({add:[],remove:[]});}
 function turn(){if(!held||held.fresh||decorId(held.id)||held.id.startsWith('field:'))return;held.at=rotate(held.id,held.at);held.base=held.at;check();show();}
 // Build: a new tree or tile appears in the middle of the view, picked up, to drag where you want it.
 function choose(kind){
  if(!Object.hasOwn(DECOR,kind))return;
  if(DECOR[kind].draw){startBrush(kind);return;}cancel();offer=null;shop=false;
  const made=spawn(kind);if(!made)return;
  held={id:made.id,kind,fresh:true,from:null,at:made.at,why:null};check();
  // Not on top of something: the nearest free spot, ring by ring round the middle of the view (its box moved along, so the screen
  // only changes once).
  if(held.why&&held.why!=='land'){
   const box=footprint(held.id),rules={level:level(),others:others(held.id),roads:roads(),blockers:blockers()};
   outer:for(let r=1;r<=24;r++)for(let i=0;i<8*r;i++){
    const a=i/(8*r)*Math.PI*2,at=[snap(made.at[0]+Math.cos(a)*r),snap(made.at[1]+Math.sin(a)*r)],dx=at[0]-made.at[0],dz=at[1]-made.at[1];
    if(!misfit([box[0]+dx,box[1]+dx,box[2]+dz,box[3]+dz],rules)){preview(held.id,at);held.at=at;check();break outer;}
   }
  }
  show();
 }
 $('done').addEventListener('click',stop);$('cancel').addEventListener('click',cancel);$('place').addEventListener('click',place);$('rotate').addEventListener('click',turn);
 $('store').addEventListener('click',putAway);$('clear').addEventListener('click',clearIt);$('keep').addEventListener('click',()=>{offer=null;show();});
 $('build').addEventListener('click',()=>{shop=!shop;show();});
 $('erase').addEventListener('click',()=>{if(!brush)return;brush.mode=brush.mode==='erase'?'draw':'erase';brushRules();show();});
 shopRow.addEventListener('click',event=>{const b=event.target.closest?.('[data-kind]');if(b)choose(b.dataset.kind);});
 inventory?.addEventListener('click',event=>{const b=event.target.closest?.('[data-kind]');if(b)choose(b.dataset.kind);});
 // On a keyboard R turns what you hold, as the Rotate button does (24 Oct 2026, the owner: "Doe ook R rotate met toetsenbord"), and Esc
 // ends moving (the owner: "Esc moet ook move sluiten"); what you held goes back. Not while typing, and not with Ctrl, Cmd or Alt.
 doc.addEventListener('keydown',event=>{
  if(!on||event.repeat||event.ctrlKey||event.metaKey||event.altKey)return;
  if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]')||doc.querySelector('dialog[open]'))return;
  if(event.key==='Escape'){event.preventDefault();stop();return;}
  if(!held||event.key?.toLowerCase()!=='r')return;
  event.preventDefault();turn();
 });
 return {active:()=>on,held:()=>held?.id??null,start,stop,cancel,place,grab,drag,drop,turn,choose,refresh:()=>{if(on)show();}};
}
