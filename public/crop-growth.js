// How a field of crops grows, without any 3D (crop-rows.js draws it). Grain stands in a dense field of stalks, the other row crops
// in a neat 3 by 3; each plant a little different in size and turn, the same every time for the same field.
const VEG={grid:3,step:.7,size:.62,young:[.85,1,.8]};
export const ROW_CROPS={
 wheat:{grid:6,step:.34,size:.95,young:[.62,1,.45]},
 barley:{grid:6,step:.34,size:.95,young:[.62,1,.45]},
 corn:{grid:3,step:.7,size:.85,young:[.78,1,.7]},
 sunflower:{grid:3,step:.7,size:.8,young:[.8,1,.7]},
 greenbeans:{grid:3,step:.7,size:.85,young:[.8,1,.72]},
 cabbage:VEG,redcabbage:VEG,lettuce:VEG,cauliflower:VEG
};

// First a sprout, then a young plant, then the full plant, each a little bigger while it grows; young plants are greener and
// ripe ones have their full colour. green: 1 = the young colour, 0 = the crop's own.
export function growthStage(grown,ripe){
 if(ripe)return {stage:'ripe',scale:1,green:0};
 const g=Math.min(1,Math.max(0,grown));
 if(g<.25)return {stage:'sprout',scale:.38,green:1};
 if(g<.6)return {stage:'young',scale:.55+(g-.25)/.35*.15,green:.7};
 return {stage:'growing',scale:.8+(g-.6)/.4*.15,green:.35};
}

const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
export function fieldSpots(crop,seed){
 const rows=ROW_CROPS[crop],rand=seeded(seed*7919+13),spots=[],half=(rows.grid-1)/2;
 for(let r=0;r<rows.grid;r++)for(let c=0;c<rows.grid;c++)spots.push({
  x:(c-half)*rows.step+(rand()-.5)*rows.step*.16,z:(r-half)*rows.step+(rand()-.5)*rows.step*.16,
  turn:rand()*Math.PI*2,size:rows.size*(.9+rand()*.18)
 });
 return spots;
}

// A short hop: stretched up, then squashed, settling back (a new planting first pops up out of the soil). Returns the height and
// width factors and how far a new planting has come up, or null once it is over.
export const HOPS={plant:{amp:.3,time:.55},stage:{amp:.12,time:.45},ripe:{amp:.2,time:.7}};
export function hop(kind,elapsed){
 const {amp,time}=HOPS[kind];if(elapsed>=time)return null;
 const k=Math.max(0,elapsed)/time,wave=Math.sin(k*Math.PI*2.5)*(1-k)*amp;
 return {up:1+wave,wide:1-wave*.45,grow:kind==='plant'?Math.min(1,Math.max(0,elapsed)/.18):1};
}
