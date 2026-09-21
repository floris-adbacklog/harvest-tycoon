import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SPREAD,ANCHORS,YARD_CLEARANCE,ROADS,zone,currentZone,place,placeIn,wide,anchorAt,clearOfYards,roadRects,roadSize,onRoad,fenceSegments,FIELD_BLOCK,outsideFields,outsideFactory,factoryYard,HOMES} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const nearest=(position,ids=Object.keys(ANCHORS))=>Object.fromEntries(ids.map(id=>[id,Math.min(...ids.filter(other=>other!==id).map(other=>distance(position(id),position(other))))]));

test('nothing moves until a zone is chosen: the fields and every later model stay where they are',()=>{
 assert.equal(currentZone(),'fields');assert.deepEqual(place(3.5,-7),[3.5,-7]);
});
test('a yard moves as one piece: everything inside keeps its place relative to the building',()=>{
 zone('dairy');const building=place(...ANCHORS.dairy),hay=place(1.2,-9.7);zone('fields');
 assert.deepEqual([building[0]-hay[0],building[1]-hay[1]].map(v=>Math.round(v*1e9)/1e9),[ANCHORS.dairy[0]-1.2,ANCHORS.dairy[1]+9.7].map(v=>Math.round(v*1e9)/1e9));
 assert.deepEqual(building,anchorAt('dairy').map(v=>Math.round(v*1e9)/1e9),'the building itself ends at its anchor times the spread');
 assert.deepEqual(placeIn('coop',13,-9.5).map(v=>Math.round(v*1e9)/1e9),anchorAt('coop').map(v=>Math.round(v*1e9)/1e9));assert.equal(currentZone(),'fields','placeIn leaves the zone alone');
});
test('loose scenery and roads are spread out from the middle, and a wrong yard name is refused',()=>{
 zone('exact');assert.deepEqual(place(-6,3),[-6*SPREAD,3*SPREAD]);assert.equal(wide(40),40*SPREAD);
 zone(null);const [x,z]=place(30,-25);assert.deepEqual([x,z],[30*SPREAD,-25*SPREAD]);
 zone('fields');assert.throws(()=>zone('moon'),/Unknown yard/);assert.equal(currentZone(),'fields');
});
test('loose pieces are pushed out of every yard',()=>{
 for(const id of Object.keys(ANCHORS)){
  const centre=anchorAt(id),[x,z]=clearOfYards(centre[0]+.5,centre[1]-.5);
  for(const other of Object.keys(ANCHORS))assert(distance([x,z],anchorAt(other))>=YARD_CLEARANCE-1e-6,`${id} vs ${other}`);
 }
 assert.deepEqual(clearOfYards(80,80),[80,80],'far away nothing changes');
});
test('everything you can work on has more room than on the compact grid, without sending the player far to the sides',()=>{
 // yards that stand where they were designed grow apart by the spread; the ones that were moved only have to keep room
 const still=Object.keys(ANCHORS).filter(id=>!HOMES[id]);
 const before=nearest(id=>ANCHORS[id],still),after=nearest(id=>anchorAt(id),still),all=nearest(id=>anchorAt(id));
 for(const id of still)assert(after[id]>=before[id]*1.25,`${id}: ${before[id].toFixed(1)} -> ${after[id].toFixed(1)}`);
 for(const id of Object.keys(ANCHORS))assert(all[id]>=5,`${id} has room around it (${all[id].toFixed(1)})`);
 assert(SPREAD>=1.25&&SPREAD<=1.35,'roomy, but compact enough that there is little to pan sideways');
});
test('the fields keep their place and every yard stays clear of them and within reach of the camera',()=>{
 const fields={minX:-3.4,maxX:8.6,minZ:-1,maxZ:30.4};   // 40 plots (10 rows) at 3.15 x 3.2
 const reach=Math.round(20*SPREAD)*2;                     // pan and depth, both directions, from the home view at (1.4, 1.5)
 for(const id of Object.keys(ANCHORS)){
  const [x,z]=anchorAt(id);
  assert(!(x>fields.minX-2&&x<fields.maxX+2&&z>fields.minZ-2&&z<fields.maxZ+2),`${id} is not on the fields`);
  assert(Math.abs(x-1.4)<=reach&&Math.abs(z-1.5)<=reach,`${id} can be reached by panning`);
 }
});
test('the scene is laid out through the zones, and the default is restored afterwards',()=>{
 const game=read('public/game.js'),life=read('public/farm-life.js'),polish=read('public/scene-polish.js');
 assert.match(game,/import \{ zone, place, wide, currentZone, SPREAD, ANCHORS, anchorAt, placeIn, ROADS, roadSize, roadRects, fenceSegments \} from '\.\/farm-layout\.js';/);assert.match(game,/import \{ scatterProps, seeded \} from '\.\/farm-props\.js';/);
 const scene=game.slice(game.indexOf('function decorate(){'),game.indexOf('function createPlots(){'));
 assert(scene.trimEnd().endsWith("farmLife.attach('greenhouse',glasshouse);farmLife.attach('apiary',hive);farmLife.watchProduction(buildingViews);\n}")||/zone\('fields'\);\s*farmLife\.attach/.test(scene),'back to the default before the fields are drawn');
 assert(!/(cloneModel|scenery)\('road_001',-?\d/.test(scene+life),'no road with typed-in numbers: they come from the shared list');assert.match(scene,/for\(const road of ROADS\.slice\(0,3\)\)cloneModel\('road_001'/);assert.match(life,/for\(const road of ROADS\.slice\(3\)\)scenery\('road_001'/);
 const used=new Set([...scene.matchAll(/zone\('(\w+)'\)/g)].map(m=>m[1]).concat([...scene.matchAll(/\[yard,list\]/g)].length?Object.keys(ANCHORS):[]));
 for(const id of used)assert(id==='fields'||id==='exact'||Object.hasOwn(ANCHORS,id),id);
 assert.match(game,/const limit=Math\.round\(20\*SPREAD\)/,'more room to pan');
 assert.match(game,/sun\.shadow\.camera\.left=-52/,'shadows cover the wider farm');
 assert.match(game,/utilityViews\.set\(key,\{object,label,info,x:object\.position\.x,z:object\.position\.z,height,locked:false\}\)/);assert.match(game,/buildingViews\.set\(key,\{object,hit,outline,label,pin:label\.querySelector\('\.building-pin'\),pinArt:key==='familyhall'\?'familyhall-model':key,x:object\.position\.x,z:object\.position\.z,height,locked:false\}\)/,'labels follow where things really stand');
 assert.match(life,/zone\('pond'\)/);assert.match(life,/zone\('paddock'\)/);assert.match(life,/zone\('workshop'\)/);assert.match(life,/const beeHome=placeIn\('apiary',10\.4,13\.7\)/);
 assert.match(polish,/pondRect=\[10\.4\+pondX/);assert.match(polish,/const RING=1\+\(SPREAD-1\)\*\.85/);
});

test('the roads are one list, and the long side grows with the farm',()=>{
 const rects=roadRects();assert.equal(rects.length,ROADS.length);
 const first=rects[0],size=roadSize(ROADS[0]);assert.equal(size.width,48*SPREAD);assert.equal(size.depth,2.9);
 assert(Math.abs((first.maxX-first.minX)-48*SPREAD)<1e-9&&first.horizontal);assert(!rects[1].horizontal);
});
test('a fence never stands on a road: where a road crosses, the line has a gap',()=>{
 zone(null);
 const boundary=fenceSegments(-19,-9,8,'z');zone('fields');
 assert.equal(Math.round(8*SPREAD),10);assert(boundary.length<10,'some segments were left out');assert(boundary.length>=7,'only the ones on the road');
 for(const [cx,cz] of boundary)assert(!onRoad(cx-.3,cx+.3,cz-1.1,cz+1.1),`segment at ${cx.toFixed(1)}, ${cz.toFixed(1)} is on a road`);
 // the far western road and the trunk road it meets
 const near=roadRects();assert(near.some(r=>r.horizontal&&r.minZ<-5.8&&r.maxZ>-5.8&&r.minX<-27.5));
});
test('a yard keeps its fence whole, and a fence off the roads keeps all its segments',()=>{
 zone('coop');const pen=fenceSegments(8,-12.5,5);zone('fields');
 assert.equal(pen.length,5);
 const [ax,az]=anchorAt('coop');assert(Math.abs(pen[0][0]-(8+ANCHORS.coop[0]*(SPREAD-1)))<1e-9&&Math.abs(pen[0][1]-(-12.5+ANCHORS.coop[1]*(SPREAD-1)))<1e-9);
 assert.equal(fenceSegments(9.55,-.3,15,'z').length,15,'the white fences beside the crops, long enough for ten rows');
});

test('the crops have a white fence on the two sides only',()=>{
 const game=read('public/game.js'),scene=game.slice(game.indexOf('function decorate(){'),game.indexOf('function createPlots(){'));
 const white=[...scene.matchAll(/fenceLine\(([^)]*'fence_008'[^)]*)\)/g)].map(m=>m[1]);
 assert.equal(white.length,2,'one on each side');
 assert(white.every(args=>/,'z',/.test(args)),'both run along the fields, none across the ends');
 assert.deepEqual(white.map(args=>Number(args.split(',')[0])),[-4.4,9.55],'the same distance from the outer fields on each side');
});


test('loose scenery never stands in the crops, however far the farm has grown',()=>{
 // a bush placed at (2,20) lands at z=29 once the scenery is spread out: outside 28 fields, right in the middle of 40
 zone(null);
 for(let x=FIELD_BLOCK.minX-2;x<=FIELD_BLOCK.maxX+2;x+=.7)for(let z=FIELD_BLOCK.minZ-2;z<=FIELD_BLOCK.maxZ+2;z+=.7){
  const [px,pz]=clearOfYards(x,z);assert(outsideFields(px,pz),`(${x.toFixed(1)}, ${z.toFixed(1)}) -> (${px.toFixed(1)}, ${pz.toFixed(1)})`);
 }
 assert.deepEqual(clearOfYards(80,80),[80,80]);assert.deepEqual(clearOfYards(-30,-30),clearOfYards(-30,-30));
 // the same for everything game.js scatters by hand in the trees, bushes and tufts section
 const game=read('public/game.js'),from=game.indexOf('// Trees, bushes and tufts are spread out'),loose=game.slice(from,game.indexOf('farmLife=createFarmLife(',from));
 const pieces=[...loose.matchAll(/\[(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,-?\d+(?:\.\d+)?)?\]/g)].map(m=>[Number(m[1]),Number(m[2])]);
 assert(pieces.length>40,'the hand-placed trees, bushes and tufts were found');
 for(const [x,z] of pieces){const [px,pz]=place(x,z);assert(outsideFields(px,pz),`piece (${x}, ${z}) ends up at (${px.toFixed(1)}, ${pz.toFixed(1)}) in the crops`);assert(outsideFactory(px,pz),`piece (${x}, ${z}) ends up at (${px.toFixed(1)}, ${pz.toFixed(1)}) in the Factory yard`);}
 const yard=factoryYard();assert(yard.maxX-yard.minX>=16&&yard.minX>=10,'the Factory yard is the long hall, east of the crops');
 zone('fields');
});
