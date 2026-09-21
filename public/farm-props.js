// More to see between the yards: small props from the model pack, scattered around every yard and along the roads.
// The spots are picked with a seeded random generator, so the farm looks the same on every visit and every device.
export const THEMES=Object.freeze({
 farm:[['hay_001',{width:1.7}],['hay_002',{width:1.4}],['hay_003',{width:1.3}],['barrel_001',{height:1}],['barrel_009',{height:.85}],['bag_001',{height:.8}],['bag_002',{height:.72}],['case_002',{width:1}],['bucket_003',{height:.65}]],
 home:[['table_001',{width:1.6}],['chair_001',{height:.95}],['garden_bed_001',{width:1.7}],['garden_bed_002',{width:1.3,height:.28,depth:1.6}],['bush_003',{width:1.2}],['firewood_003',{width:1.3}],['bucket_001',{height:.62}],['stall_001',{width:2}]],
 work:[['cart_004',{width:2}],['dray_004',{width:1.9}],['case_001',{width:.95}],['case_003',{width:.9}],['firewood_008',{width:1.4}],['barrel_002',{height:1}],['bag_003',{height:.8}],['prop_029',{width:.55}],['prop_023',{width:.9}]],
 green:[['bush_001',{width:2}],['bush_003',{width:1.3}],['bush_002',{width:1.6}],['bush_004',{width:1.7}],['grass_004',{height:.5}],['grass_001',{height:.4}],['tree_009',{height:3.2}]],
 road:[['pointer_002',{height:1.3}],['barrel_009',{height:.85}],['case_002',{width:1}],['bush_003',{width:1.2}],['hay_003',{width:1.3}],['bag_002',{height:.72}],['water_001',{width:1.1}]]
});
export const YARD_THEME=Object.freeze({
 dairy:'farm',silo:'farm',coop:'farm',windmill:'farm',chores:'farm',stall:'farm',paddock:'farm',
 farmhouse:'home',familyhall:'home',bakery:'home',kitchen:'home',
 preserves:'work',juicepress:'work',packing:'work',mill:'work',tractor:'work',cart:'work',workshop:'work',factory:'work',
 greenhouse:'green',apiary:'green',pond:'green'
});
export const PROPS_PER_YARD=4,PROPS_AROUND_YARD=[3.4,8.2],ROAD_STEP=7.5,MEADOW_CLUMPS=26;

export const seeded=seed=>{let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};};
const pick=(list,rand)=>list[Math.floor(rand()*list.length)];

// anchors: {id:[x,z]} in world coordinates; roads: [[x1,z1,x2,z2],...]; free(x,z,radius) says whether a spot is clear.
export function scatterProps({anchors,roads,free,rand,perYard=PROPS_PER_YARD,clumps=MEADOW_CLUMPS,ring=PROPS_AROUND_YARD,radius=1}){
 const placed=[];
 const put=(theme,x,z,yard=null)=>{
  if(!free(x,z,radius)||placed.some(p=>Math.hypot(p.x-x,p.z-z)<1.6))return false;
  const [name,options]=pick(THEMES[theme],rand);placed.push({name,options:{...options,rotation:rand()*Math.PI*2},x,z,theme,yard});return true;
 };
 for(const [id,[ax,az]] of Object.entries(anchors)){
  let made=0;
  for(let attempt=0;attempt<40&&made<perYard;attempt++){
   const angle=rand()*Math.PI*2,distance=ring[0]+rand()*(ring[1]-ring[0]);
   if(put(YARD_THEME[id]??'farm',ax+Math.cos(angle)*distance,az+Math.sin(angle)*distance,id))made++;
  }
 }
 // Every so often beside the roads, alternating sides.
 for(const [x1,z1,x2,z2] of roads){
  const length=Math.hypot(x2-x1,z2-z1),nx=-(z2-z1)/length,nz=(x2-x1)/length;let side=1;
  for(let d=ROAD_STEP/2;d<length;d+=ROAD_STEP*(.8+rand()*.5)){
   const offset=side*(2.4+rand()*1.6);side=-side;
   put('road',x1+(x2-x1)*d/length+nx*offset,z1+(z2-z1)*d/length+nz*offset);
  }
 }
 // Clumps of green in the open ground.
 for(let attempt=0,made=0;attempt<clumps*12&&made<clumps;attempt++){
  const angle=rand()*Math.PI*2,distance=16+rand()*24;
  if(put('green',Math.cos(angle)*distance,Math.sin(angle)*distance))made++;
 }
 return placed;
}
