// The farm is laid out wide, so the things you work on (buildings, stalls, pens, the tractor) have room around them.
// Every yard (a building with its props, pens and fences) keeps its own shape and moves as one piece to its anchor times
// SPREAD; loose scenery (trees, hills, roads) is spread out with it, and the fields never move.
export const SPREAD=1.45;
// Where each yard was designed (x, z on the compact grid).
export const ANCHORS=Object.freeze({
 dairy:[-1,-13.2],silo:[5.6,-11.8],farmhouse:[-13.8,-10.2],familyhall:[-9.3,-20.5],preserves:[-15.2,-18.6],juicepress:[-1,-20.1],
 greenhouse:[5.6,-19],packing:[11.5,-17.2],coop:[13,-9.5],paddock:[17.9,-7],windmill:[12.8,-1.5],tractor:[-5.2,-.2],cart:[-6.3,3.8],
 chores:[-5.8,-10.7],stall:[-11.3,-2.6],mill:[-12.5,4],bakery:[-10.8,12],kitchen:[-12.4,18.2],apiary:[10.5,13.8],workshop:[-9.1,-14.7],pond:[17.6,15.2]
});
// Trees, bushes and other loose pieces keep this far from the middle of a yard.
export const YARD_CLEARANCE=5.4;

// The roads, as designed on the compact grid: centre, size, height and depth in the ground. The long side grows with the farm.
export const ROADS=Object.freeze([
 {x:-1,z:-4,width:48,depth:2.9,height:.13,y:-.045},{x:-6,z:3,width:2.9,depth:40,height:.13,y:-.035},{x:6.2,z:19.8,width:27,depth:2.4,height:.12,y:-.035},
 {x:-21,z:7,width:2.1,depth:41,height:.09,y:0},{x:-1,z:-23.3,width:42,depth:2.2,height:.09,y:0},{x:-1,z:23.2,width:45,depth:2.2,height:.09,y:0}
]);
export const roadSize=road=>({width:road.width>road.depth?road.width*SPREAD:road.width,depth:road.depth>road.width?road.depth*SPREAD:road.depth});
// World rectangles of the roads: {minX,maxX,minZ,maxZ}.
export const roadRects=()=>ROADS.map(road=>{const {width,depth}=roadSize(road),cx=road.x*SPREAD,cz=road.z*SPREAD;return {minX:cx-width/2,maxX:cx+width/2,minZ:cz-depth/2,maxZ:cz+depth/2,horizontal:width>depth};});
// True when a box (a fence segment, a prop) stands on a road.
export const onRoad=(minX,maxX,minZ,maxZ,margin=0)=>roadRects().some(r=>maxX>r.minX+margin&&minX<r.maxX-margin&&maxZ>r.minZ+margin&&minZ<r.maxZ-margin);

// 'fields' leaves things where they are (the default), null spreads loose scenery, 'exact' only scales, a yard name moves with that yard.
let current='fields';
export function zone(id){
 if(id!==null&&id!=='fields'&&id!=='exact'&&!Object.hasOwn(ANCHORS,id))throw new Error(`Unknown yard: ${id}`);
 current=id;return id;
}
export const currentZone=()=>current;
export const wide=length=>length*SPREAD;
export const anchorAt=id=>{const [x,z]=ANCHORS[id];return [x*SPREAD,z*SPREAD];};
const yardCentres=Object.keys(ANCHORS).map(anchorAt);

// Moves a loose piece to the nearest free spot outside every yard, preferring the direction away from the nearest yard.
export function clearOfYards(x,z,clearance=YARD_CLEARANCE){
 const free=(px,pz)=>yardCentres.every(([ax,az])=>Math.hypot(px-ax,pz-az)>=clearance-1e-6);
 if(free(x,z))return [x,z];
 const [nx,nz]=yardCentres.reduce((best,c)=>Math.hypot(x-c[0],z-c[1])<Math.hypot(x-best[0],z-best[1])?c:best);
 const away=Math.hypot(x-nx,z-nz)<.001?0:Math.atan2(z-nz,x-nx);
 for(let radius=1;radius<=20;radius++){
  for(let turn=0;turn<=12;turn++){
   for(const sign of turn?[1,-1]:[1]){
    const angle=away+sign*turn*Math.PI/12,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
    if(free(px,pz))return [px,pz];
   }
  }
 }
 return [x,z];
}
// The centres of a fence line's segments, in world coordinates. A loose boundary line grows with the farm (more segments of the
// same size), a yard's fence keeps its length and moves with the yard, and a segment that would stand on a road is left out,
// so a road crossing a fence simply has a gap.
export function fenceSegments(x,z,n,axis='x',size=2.2){
 const stretched=current===null||current==='exact';
 const [sx,sz]=stretched?place(x,z):[x,z],count=stretched?Math.round(n*SPREAD):n,segments=[];
 for(let i=0;i<count;i++){
  const rx=sx+(axis==='x'?i*size:0),rz=sz+(axis==='z'?i*size:0),[cx,cz]=stretched?[rx,rz]:place(rx,rz);
  const halfX=axis==='x'?size/2:.3,halfZ=axis==='z'?size/2:.3;
  if(!onRoad(cx-halfX,cx+halfX,cz-halfZ,cz+halfZ))segments.push([cx,cz]);
 }
 return segments;
}
// One-off mapping for a point that belongs to a yard, without changing the current zone.
export function placeIn(id,x,z){
 const before=current;current=id;const point=place(x,z);current=before;return point;
}
export function place(x,z){
 if(current==='fields')return [x,z];
 if(current==='exact')return [x*SPREAD,z*SPREAD];
 if(current===null)return clearOfYards(x*SPREAD,z*SPREAD);
 const [ax,az]=ANCHORS[current];
 return [x+ax*(SPREAD-1),z+az*(SPREAD-1)];
}
