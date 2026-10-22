import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as nodeModule from 'node:module';
import {ANCHORS,HOMES,YARD_EXTENT,anchorAt,asBeforeLayout,clearOfYards,outsideYardExtents} from '../public/farm-layout.js';
import {BUILDINGS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const near=(a,b,d=1e-6)=>Math.abs(a[0]-b[0])<d&&Math.abs(a[1]-b[1])<d;

// The Warehouse on the farm (22 Oct 2026, the owner's plan): the Sheep Barn's old red barn where the Feed Mill stood, the Feed Mill across
// the main road between the cows and the chickens, the silo 1.3 back, the Animal paddock by the pond, the chickens' pen a segment narrower
// ("maak de chicken coop ruimte iets kleiner zodat er meer ruimte is voor de feed mill") and the Sheep Barn in the Goat Shed's barn.

test('the Warehouse has the Feed Mill\'s old yard; the Feed Mill, the silo and the Animal paddock moved; the valley stays sorted by level',()=>{
 assert.deepEqual(ANCHORS.warehouse,[-12.5,4],'the Feed Mill\'s old design point');assert.ok(!HOMES.warehouse);
 assert.deepEqual(anchorAt('warehouse'),[-16.25,5.2]);
 assert.ok(near(anchorAt('mill'),[8.1,-10.6],1e-9),'across the main road, between the cows and the chickens');
 assert.ok(near(anchorAt('silo'),[5.98,-16.64],1e-9),'the silo 1.3 further back, and as far west so its pin stays where it was across');
 assert.ok(near(anchorAt('paddock'),[14.3,6.3],1e-9),'the horse on the green east of the fields, by the pond');
 // The Feed Mill (hangar_003, 6.2 long, its long side north-south) between the pasture's east fence (x 3.8) and the pen's west rail (x 11.4).
 const [mx,mz]=anchorAt('mill');assert.ok(mx-1.8-3.8>=2.4&&11.4-(mx+1.8)>=1.4,'room on both sides (0.9 in the first plan), its pin off most of the cows\' pasture');assert.ok(-6.65-(mz+3.1)>=.7,'clear of the main road');
 // The level rule: the Warehouse (from the start), the Feed Mill (2) and the paddock (3) stay in the middle of the valley.
 for(const id of ['warehouse','mill','paddock','silo'])assert.ok(Math.abs(anchorAt(id)[0])<20,`${id} in the middle`);
 assert.ok(YARD_EXTENT.warehouse&&YARD_EXTENT.mill,'loose trees keep clear of both');
 assert.deepEqual(YARD_EXTENT.coop,[-5.7,7.9,-5.8,5.8],'the chickens\' pen is a segment (2.2) narrower on its west side');
});

test('as it stood: the seeded props and scenery are placed with the yards of before, and the farm of now comes back after',()=>{
 const now=[anchorAt('mill'),anchorAt('paddock'),YARD_EXTENT.coop];
 const then=asBeforeLayout(()=>[anchorAt('mill'),anchorAt('paddock'),anchorAt('silo'),Object.keys(ANCHORS).includes('warehouse'),YARD_EXTENT.coop,outsideYardExtents(-14,6,0)]);
 assert.deepEqual(then[0],[-16.25,5.2]);assert.ok(near(then[1],[5.98,-9.88],1e-9));assert.ok(near(then[2],[7.28,-15.34],1e-9));
 assert.equal(then[3],false,'no Warehouse yet');assert.deepEqual(then[4],[-7.9,7.9,-5.8,5.8]);assert.equal(then[5],true,'nor its yard');
 assert.deepEqual([anchorAt('mill'),anchorAt('paddock'),YARD_EXTENT.coop],now,'back as it stands now');
 assert.throws(()=>asBeforeLayout(()=>{throw new Error('x');}));assert.deepEqual(anchorAt('mill'),now[0],'also after a slip');
 assert.equal(outsideYardExtents(-14,6,0),false,'the Warehouse\'s yard now');
 // A loose piece keeps the spot it had when that is still free (the tree west of the Warehouse), so the trees elsewhere stay put.
 assert.deepEqual(clearOfYards(-22.62,11.05),[-22.62,11.05]);
 const game=read('public/game.js');
 assert.match(game,/function asBefore\(place,\{dairy=true\}=\{\}\)\{/);
 assert.match(game,/try\{return asBeforeLayout\(place\);\}finally\{put\(now\);/);
 assert.match(game,/asBefore:place=>asBefore\(place,\{dairy:false\}\)\}\);clipNow\(\);/,'scene-polish measures the farm as it stood just before');
 assert.match(read('public/scene-polish.js'),/const blocked=asBefore\(\(\)=>\{\n  hideClippedScenery\(scene\);/);
});

test('the farm\'s pieces: the Warehouse a utility on the Sheep Barn\'s old barn, the Feed Mill unturned, the pump tower gone, the Sheep Barn in the Goat Shed\'s barn',()=>{
 const game=read('public/game.js'),icons=read('public/visual-icons.js');
 assert.match(game,/zone\('warehouse'\);addUtility\('warehouse','hangar_006',-11\.5,4\.6,\{width:8\.5,rotation:Math\.PI\/2\}\);fresh\.push\(/,'its own proportions, its doors towards the lane');
 assert.match(game,/warehouse:\{name:'Warehouse',icon:'warehouse',hint:'All your crops and goods'\}/);
 assert.match(game,/zone\('mill'\);addBuilding\('mill',-12\.5,4,\{width:6\.2\}\);/);
 assert.equal((game.match(/tower_005/g)??[]).length,2,'loaded, and only as it stood (goneNow)');assert.match(game,/goneNow\(cloneModel\('tower_005'/);
 assert.equal(BUILDINGS.sheepbarn.model,'hangar_015');assert.equal(BUILDINGS.goatshed.model,'hangar_015');
 assert.match(game,/addBuilding\('sheepbarn',23\.8,-15\.4,\{width:5,height:4\.6,depth:8,paint:SHEEP_BARN_ROOF\}\);/);   // its own roof (tests/sheepbarn-roof.test.mjs)assert.match(game,/addBuilding\('goatshed',31\.9,-14\.6,\{width:5,height:4\.6,depth:8\}\);/);
 assert.match(game,/was=cloneModel\('hangar_006',23\.8,-15\.4,\{width:5\.4,height:4\.4,depth:9\}\)/,'the old barn stands in while the scenery is placed');
 // Its pin and the Sheep Barn's picture (WebP).
 assert.match(icons,/pictures\.warehouse='warehouse';/);assert.match(icons,/webpPictures\.add\('warehouse'\);/);
 for(const f of ['warehouse','sheepbarn'])assert.ok(existsSync(new URL(`../public/assets/icons/${f}.webp`,import.meta.url)),f);
 assert.ok(!existsSync(new URL('../public/assets/icons/warehouse.png',import.meta.url)),'no new PNG');
});

test('the chickens\' pen is a segment narrower and every hen stands inside it, half a body from the rails',()=>{
 const game=read('public/game.js');
 assert.match(game,/const back=fenceLine\(6\.4,-15,7\),front=fenceLine\(6\.4,-4,7\),side=fenceLine\(5\.3,-13\.9,5,'z'\),cut=placeIn\('coop',7\.5,0\)\[0\];/);
 assert.match(game,/for\(const o of side\)\{movedBefore\.push\(\[o,o\.position\.x,o\.position\.z\]\);o\.position\.x\+=2\.2;\}/,'the west rail a segment further east');
 assert.match(game,/penned\('coop',\[\.\.\.back,\.\.\.front,\.\.\.side,\.\.\.fenceLine\(20\.7,-13\.9,5,'z'\)\]\.filter\(o=>o\.parent\)\);/,'its fences are still its pen (farm-animals.js)');
 const hens=JSON.parse(game.match(/for\(const \[x,z,r\] of (\[\[11\.9,-5\.75[^\n]*?\]\])\)\{const hen=animalAt\('chicken_001'/)[1].replace(/(?<![\d])\./g,'0.'));
 assert.equal(hens.length,6,'all six hens');
 // The pen (coop yard coordinates): west rail 7.5, east rail 20.7, back -15, front -4 (the trunk road side has no rail).
 for(const [x,z] of hens)assert.ok(x>=7.5+.5&&x<=20.7-.5&&z>=-15+.5&&z<=-4-.5,`hen at ${x},${z} inside`);
 // None on the coop's own spot (its pin and its tap) and none at the pen's front left (the Windmill's tall tap box).
 for(const [x,z] of hens){assert.ok(Math.abs(x-13)>2.4||Math.abs(z+9.5)>2.4,`hen at ${x},${z} clear of the coop`);assert.ok(!(x<10&&z>-6.5),`hen at ${x},${z} clear of the Windmill's tap box`);}
});

test('your farmer\'s trip to the Feed Mill goes with it; the family walk by the lane made way for the Warehouse',{skip},async()=>{
 const {FARM_TRIPS,FARM_FAMILY_WALKS}=await import('../public/farm-farmer.js');
 const [mx,mz]=anchorAt('mill'),at=FARM_TRIPS.mill.at;
 assert.ok(Math.hypot(at[0]-mx,at[1]-mz)<7,'beside the Feed Mill');assert.ok(at[0]<mx-1.8,'left of its doors, so it hides none of it');
 const [wx0,wx1,wz0,wz1]=[anchorAt('warehouse')[0]+YARD_EXTENT.warehouse[0],anchorAt('warehouse')[0]+YARD_EXTENT.warehouse[1],anchorAt('warehouse')[1]+YARD_EXTENT.warehouse[2],anchorAt('warehouse')[1]+YARD_EXTENT.warehouse[3]];
 for(const {spots} of FARM_FAMILY_WALKS)for(const [x,z] of spots)assert.ok(x<wx0-.5||x>wx1+.5||z<wz0-.5||z>wz1+.5,`${x},${z} off the Warehouse`);
});
