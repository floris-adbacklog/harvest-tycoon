// Moving things on your own farm (24 Oct 2026, the owner: "Doe optie 2"; the rules are game/farm-map.js). The Move button (beside the
// camera buttons, and in More from the start) turns the farm into a board:
//  1. Tap a building's yard or a field: it is picked up and its spot shows on the ground, green where it fits and red where it does not.
//  2. Drag it (it moves in half steps). Dragging the grass still moves the camera.
//  3. Rotate turns a building a quarter (24 Oct 2026, the owner: "Rotate building maybe?"); a field is square and does not turn.
//  4. Place here saves it (the farm action layout_move); Cancel puts it back. Done ends it.
// What it may not stand on: unopened land, the pond, a road, or anything else on the farm. The farmhouse and the pond stay where they are.
import {landAt,landOpen,WATER,LAYOUT_GRID,FIXED_YARDS} from './farm-map.js';

const snap=v=>Math.round(v/LAYOUT_GRID)*LAYOUT_GRID;
// Neighbouring yards' fences may touch: two boxes only clash when they overlap by more than this on both sides.
export const LAYOUT_SLACK=.6;
const clash=(a,b,slack)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>slack&&Math.min(a[3],b[3])-Math.max(a[2],b[2])>slack;
// Why a box [minX, maxX, minZ, maxZ] does not fit (or null when it does): 'land' (not open at this level), 'water', 'road', 'taken'.
export function misfit(box,{level,others=[],roads=[],slack=LAYOUT_SLACK}){
 const [a,b,c,d]=box,s=slack;
 if(![[a+s,c+s],[b-s,c+s],[a+s,d-s],[b-s,d-s],[(a+b)/2,(c+d)/2]].every(([x,z])=>landOpen(level,x,z)))return 'land';
 if(WATER.some(w=>clash(box,w,0)))return 'water';
 if(roads.some(r=>clash(box,r,s)))return 'road';
 if(others.some(o=>clash(box,o,s)))return 'taken';
 return null;
}
const HINT={
 none:'Tap a building or a field to pick it up.',
 held:'Drag it where you want it, then tap Place here.',
 water:'Not in the pond.',
 road:'Not on a road.',
 taken:'Something is in the way.',
 fixed:'The farmhouse and the pond stay where they are.'
};
// pick(event): the id of what is under the pointer (a yard's name or field:N) or null. groundAt(event): [x, z] on the ground.
// spotOf(id) and preview(id, [x, z]): where it stands and moving it on the screen. footprint(id): its box where it stands now.
// others(id): the boxes of everything else. roads(): the road boxes. mark(box, ok): the spot on the ground (null clears it).
// rotate(id, at): turns it a quarter in place and gives its new spot [x, z, turn]. save(id, [x, z, turn]): the farm action.
// level(): the farm's level.
export function createLayoutEditor({doc=document,root=doc.documentElement,bar,level,pick,groundAt,spotOf,preview,footprint,others,roads,mark,rotate,save,notify=()=>{},onToggle=()=>{}}){
 let on=false,held=null;
 const $=id=>bar.querySelector(`[data-layout="${id}"]`);
 function show(){
  const why=held?.why;
  $('hint').textContent=!held?HINT.none:why==='land'?`This land opens at level ${landAt(...held.at)?.level??'?'}.`:why?HINT[why]:HINT.held;
  $('hint').classList.toggle('is-wrong',Boolean(why));
  $('cancel').hidden=!held;$('place').hidden=!held;$('place').disabled=Boolean(why);$('done').hidden=Boolean(held);
  $('rotate').hidden=!held||held.id.startsWith('field:');
 }
 function check(){
  const box=footprint(held.id);
  held.why=box?misfit(box,{level:level(),others:others(held.id),roads:roads()}):'taken';
  mark(box,!held.why);
 }
 function start(){if(on)return;on=true;root.classList.add('farm-editing');bar.hidden=false;show();onToggle(true);}
 function stop(){if(!on)return;cancel();on=false;root.classList.remove('farm-editing');bar.hidden=true;mark(null);onToggle(false);}
 function cancel(){if(!held)return;preview(held.id,held.from);held=null;mark(null);show();}
 async function place(){
  if(!held||held.why)return;
  const {id,at,from}=held;held=null;mark(null);show();
  if(at.every((v,i)=>v===from[i]))return;
  try{await save(id,at);}catch(error){preview(id,from);notify(error.message);}
 }
 // A press: on something that moves it is picked up (or taken again) and the drag moves it; anywhere else the camera moves.
 function grab(event){
  if(!on)return false;
  const id=pick(event);if(!id)return false;
  if(FIXED_YARDS.includes(id)){notify(HINT.fixed);return false;}
  const ground=groundAt(event);if(!ground)return false;
  if(held&&held.id!==id)cancel();
  if(!held){const from=spotOf(id);held={id,from,at:from,why:null};}
  held.start=ground;held.base=held.at;check();show();
  return true;
 }
 function drag(event){
  if(!held?.start)return;
  const ground=groundAt(event);if(!ground)return;
  const at=[snap(held.base[0]+ground[0]-held.start[0]),snap(held.base[1]+ground[1]-held.start[1]),...held.at.slice(2)];
  if(at[0]===held.at[0]&&at[1]===held.at[1])return;
  preview(held.id,at);held.at=at;check();show();
 }
 function drop(){if(held)held.start=null;}
 function turn(){if(!held||held.id.startsWith('field:'))return;held.at=rotate(held.id,held.at);held.base=held.at;check();show();}
 $('done').addEventListener('click',stop);$('cancel').addEventListener('click',cancel);$('place').addEventListener('click',place);$('rotate').addEventListener('click',turn);
 return {active:()=>on,held:()=>held?.id??null,start,stop,cancel,place,grab,drag,drop,turn};
}
