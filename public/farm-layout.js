// The farm is laid out wide, so the things you work on (buildings, stalls, pens, the tractor) have room around them.
// Every yard (a building with its props, pens and fences) keeps its own shape and moves as one piece to its anchor times
// SPREAD; loose scenery (trees, hills, roads) is spread out with it, and the fields never move.
export const SPREAD=1.3;
// Where each yard was designed (x, z on the compact grid).
export const ANCHORS=Object.freeze({
 dairy:[-1,-13.2],silo:[5.6,-11.8],farmhouse:[-13.8,-10.2],familyhall:[-9.3,-20.5],preserves:[-15.2,-18.6],juicepress:[-1,-20.1],
 greenhouse:[5.6,-19],packing:[11.5,-17.2],coop:[13,-9.5],paddock:[17.9,-7],windmill:[12.8,-1.5],tractor:[-5.2,-.2],cart:[-6.3,3.8],factory:[16.2,21.9],
 chores:[-5.8,-10.7],stall:[-11.3,-2.6],mill:[-12.5,4],bakery:[-10.8,12],kitchen:[-12.4,18.2],apiary:[10.5,13.8],workshop:[-9.1,-14.7],pond:[17.6,15.2],
 // The midgame yards stand on new ground east of the coop and the Family Hall, where the trunk road now runs on to.
 beeyard:[22.7,1.9],sheepbarn:[23.8,-15.4],glasshouse:[28.8,1.2],weaving:[26.2,8.5],
 // Wave 2: the goats beside the sheep, the Craft Workshop beside the Weaving Shed, the Ranch and its paddock by the pond, and the
 // Valley Market behind the Juice Press, on the top road out of the valley.
 goatshed:[31.9,-14.6],craftshop:[33.1,9.6],ranch:[31.5,16.2],valleymarket:[0,-29.2],
 // Wave 3: a new column at the east end of the trunk road: the Trade Depot where the road ends, the Estate Workshop's manor across
 // the road, and the Grand Valley Fair's hall and fairground south of it.
 tradedepot:[42.7,-9.6],estateworkshop:[42.3,3.1],grandfair:[44,13.4],
 // The Pig Farm (level 29) on the open ground west of the farmhouse, across the west road: a white-fenced pen, with the barn
 // turned side-on beside it.
 pigfarm:[-24.92,-9.08]
});
// Where a yard stands when that is not where it was designed (same compact grid; everything inside a yard moves along with it).
// The apiary and the family hall have swapped places (the hall stands east of the crops, far enough out not to hide them), the
// market waits by the road out at the front, the delivery cart stands at the open end of the farmhouse fence where it can be seen,
// and the animal paddock stands beside the trunk road below the dairy barn.
// The east is a street that climbs in level as you pan right, so a new farmer finds everything close by: along the trunk road the
// Pig Farm (29), Bee Yard (34), Glasshouse (40) and Weaving Shed (43); behind them the Craft Workshop (58), the Ranch (70) and the
// Estate Workshop (75); furthest out the Grand Valley Fair (90). The Family Hall (10) moved to the open ground west of the
// farmhouse, where the Pig Farm first stood. Sheep Barn, Goat Shed and Trade Depot keep their places across the road.
export const HOMES=Object.freeze({apiary:ANCHORS.familyhall,familyhall:[-25.77,-6.92],stall:[-8,23.4],cart:[-9.7,-10.45],paddock:[1.7,-8.6],
 pigfarm:[23.46,1.46],beeyard:[30.46,1.69],glasshouse:[37.62,1.23],weaving:[44.62,2],
 craftshop:[28.62,11.15],ranch:[37.31,11.15],estateworkshop:[46.92,11.15],grandfair:[40,28.1]});
// Trees, bushes and other loose pieces keep this far from the middle of a yard.
export const YARD_CLEARANCE=5.4;

// The roads, as designed on the compact grid: centre, size, height and depth in the ground. The long side grows with the farm.
export const ROADS=Object.freeze([
 {x:4.5,z:-4,width:59,depth:2.9,height:.13,y:-.045},{x:-6,z:3,width:2.9,depth:40,height:.13,y:-.035},{x:6.2,z:26,width:27,depth:2.4,height:.12,y:-.035},
 {x:-21,z:7,width:2.1,depth:41,height:.09,y:0},{x:-1,z:-23.3,width:42,depth:2.2,height:.09,y:0},{x:-1,z:31,width:45,depth:2.2,height:.09,y:0},
 // The road out of the valley: it lies over the trunk road's tapered end, passes the Trade Depot and runs on to the edge of the
 // world, where the haze swallows it.
 {x:50.15,z:-4,width:52,depth:2.9,height:.13,y:-.043,turned:true}
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
export const anchorAt=id=>{const [x,z]=HOMES[id]??ANCHORS[id];return [x*SPREAD,z*SPREAD];};
const yardCentres=Object.keys(ANCHORS).map(anchorAt);
// Yards that reach further than the clearance around their middle: how far they run from their anchor (world units: west, east,
// north, south). The Sheep Barn's pasture runs down to the road in front of it. Trees keep three steps clear of the edges, so
// no crown hangs over a yard.
export const YARD_EXTENT=Object.freeze({coop:[-7.9,7.9,-5.8,5.8],windmill:[-4.6,4.6,-4.6,4.6],beeyard:[-3.5,3.5,-2.5,3.5],sheepbarn:[-4.6,4.6,-4.8,12.2],glasshouse:[-4.2,4.2,-2.6,4.6],weaving:[-3,4.8,-4,5.5],
 goatshed:[-4.8,4.8,-4.4,11],pigfarm:[-12.6,4.6,-3.6,12.5],craftshop:[-4.4,4.8,-2.4,3.6],ranch:[-6,6,-5.2,10.2],valleymarket:[-8.5,9.5,-5,4.5],
 tradedepot:[-7,7.5,-4.5,5],estateworkshop:[-5.5,5.5,-3.5,4.5],grandfair:[-13.8,13.8,-5.4,5]});
const EXTENT_MARGIN=3;
const extents=Object.entries(YARD_EXTENT).map(([id,[west,east,north,south]])=>{const [x,z]=anchorAt(id);return [x+west,x+east,z+north,z+south];});
export const outsideYardExtents=(x,z,margin=EXTENT_MARGIN)=>extents.every(([minX,maxX,minZ,maxZ])=>x<minX-margin||x>maxX+margin||z<minZ-margin||z>maxZ+margin);

// The crops, from fence to fence and down to the last of the forty fields. Loose scenery keeps a step clear of them, however
// many fields the farm has grown to (a bush that was outside the crops at 28 fields stands in them at 40).
export const FIELD_BLOCK=Object.freeze({minX:-4.4,maxX:9.55,minZ:-1.2,maxZ:31});
const FIELD_MARGIN=1;
export const outsideFields=(x,z,margin=0)=>x<FIELD_BLOCK.minX-margin||x>FIELD_BLOCK.maxX+margin||z<FIELD_BLOCK.minZ-margin||z>FIELD_BLOCK.maxZ+margin;
// The Factory is a long hall (12 east-west) with a chimney and a hopper at its ends: more than the radius around its middle.
export const factoryYard=()=>{const [x,z]=anchorAt('factory');return Object.freeze({minX:x-8.2,maxX:x+8.2,minZ:z-3.4,maxZ:z+3.9});};
export const outsideFactory=(x,z,margin=0)=>{const r=factoryYard();return x<r.minX-margin||x>r.maxX+margin||z<r.minZ-margin||z>r.maxZ+margin;};

// Moves a loose piece to the nearest free spot outside every yard and the crops, preferring the direction away from the nearest yard.
// A piece that has to move never lands on a road.
export function clearOfYards(x,z,clearance=YARD_CLEARANCE){
 const free=(px,pz)=>outsideFields(px,pz,FIELD_MARGIN)&&outsideFactory(px,pz,FIELD_MARGIN)&&outsideYardExtents(px,pz)&&yardCentres.every(([ax,az])=>Math.hypot(px-ax,pz-az)>=clearance-1e-6);
 if(free(x,z))return [x,z];
 const [nx,nz]=yardCentres.reduce((best,c)=>Math.hypot(x-c[0],z-c[1])<Math.hypot(x-best[0],z-best[1])?c:best);
 const away=Math.hypot(x-nx,z-nz)<.001?0:Math.atan2(z-nz,x-nx);
 // Far enough to get out of the middle of the east street, where the yards stand close on both sides of the road.
 for(let radius=1;radius<=32;radius++){
  for(let turn=0;turn<=12;turn++){
   for(const sign of turn?[1,-1]:[1]){
    const angle=away+sign*turn*Math.PI/12,px=x+Math.cos(angle)*radius,pz=z+Math.sin(angle)*radius;
    if(free(px,pz)&&!onRoad(px-1,px+1,pz-1,pz+1))return [px,pz];
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
 const [ax,az]=ANCHORS[current],home=HOMES[current];
 return home?[x+home[0]*SPREAD-ax,z+home[1]*SPREAD-az]:[x+ax*(SPREAD-1),z+az*(SPREAD-1)];
}
