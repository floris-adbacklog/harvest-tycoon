import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,statSync} from 'node:fs';
const root=new URL('../',import.meta.url),read=path=>readFileSync(new URL(path,root),'utf8');
const dir=new URL('public/assets/models/',root);

test('every model carries its baked shade (vertex colours), and the models stay light to download',()=>{
 let bytes=0;
 for(const f of readdirSync(dir).filter(f=>f.endsWith('.glb'))){
  const b=readFileSync(new URL(f,dir));bytes+=statSync(new URL(f,dir)).size;
  const json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
  for(const mesh of json.meshes)for(const p of mesh.primitives)assert.ok(p.attributes.COLOR_0!=null,`${f} has no baked shade`);
 }
 assert.ok(bytes<12.5e6,`models are ${(bytes/1e6).toFixed(1)} MB`);
});
test('the light: true colours (neutral tone mapping), a warm low sun and a soft sky, and mown stripes where the fields grow',()=>{
 const game=read('public/game.js'),polish=read('public/scene-polish.js');
 assert.match(game,/renderer\.toneMapping=THREE\.NeutralToneMapping;/);
 assert.match(game,/new THREE\.HemisphereLight\(0xe4f0ff,0x6f8c46,2\)/);assert.match(game,/new THREE\.DirectionalLight\(0xffeccb,3\.2\);sun\.position\.set\(-26,22,14\);/);
 assert.match(game,/\.name='Crop meadow';/);assert.match(polish,/scene\.getObjectByName\('Crop meadow'\)/);
 assert.match(polish,/const tuftCount=Math\.round\(\(mobile\?900:2200\)\*SPREAD\*SPREAD\)/,'instanced, so more tufts cost next to nothing');
});
test('the Windmill\'s sails turn only while it is making something, and the side buttons keep their tiles',()=>{
 assert.match(read('public/game.js'),/const buildingBusy=key=>productionJobs\(state\.buildings\[key\]\)\.some\(j=>j\.readyAt>farmNow\(\)\);/);
 assert.match(read('public/game.js'),/const busy=buildingBusy\('windmill'\);windmillSpeed\+=\(\(busy\?\.28:0\)-windmillSpeed\)\*Math\.min\(1,dt\*\.8\);/);
 assert.doesNotMatch(read('public/desktop-hud.css'),/\.side-tools \.side-tool\{width:86px/,'the side buttons keep their own tiles with the name underneath (cleaner, 26 Sep 2026)');
 assert.match(read('public/desktop-hud.css'),/\.side-tools \.side-tool b,\.side-tools \.side-tool\.active b\{color:#fff;text-shadow:/,'white names with a soft shadow');
});
test('the light follows the clock but is always daylight: fresh in the morning and at night, warmer towards the evening',async()=>{
 const {daylightAt}=await import('../public/daylight.js');
 const night=daylightAt(2),morning=daylightAt(8),noon=daylightAt(13),evening=daylightAt(20);
 assert.deepEqual(night,morning,'the night borrows the morning');
 for(const light of [night,noon,evening]){assert.ok(light.sunI>=3&&light.hemiI>=1.9,'never dark');}
 assert.equal(noon.sun,0xffeccb);assert.ok(evening.turn>0&&morning.turn<0,'the sun comes from the east in the morning and the west at night');
 const game=read('public/game.js');
 assert.match(game,/atmosphere\?\.hide\(true\);renderer\.render\(scene,mapCamera\);atmosphere\?\.hide\(false\);/,'no clouds in the map picture');
 assert.doesNotMatch(read('public/scenery.js'),/trailer_002/,'no loose red cultivator in the meadow');
 assert.doesNotMatch(read('public/farm-atmosphere.js'),/Sprite|PUFF/,'no chimney smoke: none of the buildings has a chimney');
});
test('one shared colour palette for every model, with a softer red on the buildings',async()=>{
 const {softenRed}=await import('../public/soft-red.js');
 const px=softenRed(new Uint8ClampedArray([198,40,40,255, 76,175,80,255, 239,154,154,255]));
 assert.ok(px[0]>198&&px[1]>40,'the barn red is lighter');assert.deepEqual([...px.slice(4)],[76,175,80,255,239,154,154,255],'green and light pink stay as they are');
 assert.match(read('public/game.js'),/shareAtlas\(object,name\);/);
});
test('crops: fuller fields in rows, growing in steps (sprout, young, growing, ripe), and every field the same each time',async()=>{
 const {ROW_CROPS,growthStage,fieldSpots,hop}=await import('../public/crop-growth.js');
 assert.equal(fieldSpots('wheat',3).length,36,'grain: a dense field of stalks');assert.equal(fieldSpots('cabbage',3).length,9,'the rest 3 by 3');
 assert.deepEqual(fieldSpots('corn',5),fieldSpots('corn',5),'the same field looks the same after a reload');
 assert.ok(fieldSpots('wheat',1).every(p=>Math.abs(p.x)<1.05&&Math.abs(p.z)<1.05),'every plant stays on its 2.4 wide field');
 assert.deepEqual(['wheat','barley','corn','sunflower','greenbeans','cabbage','redcabbage','lettuce','cauliflower'].sort(),Object.keys(ROW_CROPS).sort(),'trees, vines and bean poles keep their own look');
 assert.deepEqual([0,.3,.7,.99].map(g=>growthStage(g,false).stage),['sprout','young','growing','growing']);
 assert.deepEqual(growthStage(.5,true),{stage:'ripe',scale:1,green:0},'ripe: full size and the crop\'s own colour');
 assert.ok(growthStage(.1,false).green>growthStage(.7,false).green,'young plants are greener');
 assert.equal(hop('ripe',.8),null,'the ripe wiggle ends');assert.equal(hop('plant',0).grow,0,'a new planting comes up out of the soil');
});
test('the harvest: a ripe field\'s plants are picked and the harvest flies to the Market button; one draw call per field, cleaned up afterwards',()=>{
 const game=read('public/game.js'),rows=read('public/crop-rows.js');
 assert.match(game,/const picked=v\.visualCrop&&v\.lastReady&&cropMotion\.pick\(v\.cropGroup\),fresh=v\.visualCrop!==undefined;\n  if\(!picked\)v\.rows\?\.dispose\(\);/);
 assert.match(game,/if\(action==='harvest'\)\{particleBurst\(id\);harvestFlight\(id,result\.crop,flightCount\);/,'the harvest flies to the Market button');
 assert.match(game,/const flightCount=1\+\(plot\.watered\?1:0\)\+\(plot\.tended\?1:0\);/,'one picture, one more for water and one more for care');
 assert.match(read('public/harvest-fly.js'),/flight\.finished\.then\(\(\)=>\{outer\.remove\(\);/,'each flying picture is removed when it lands');
 assert.match(rows,/new THREE\.InstancedMesh\(template\.geometry,template\.material,spots\.length\)/);
 assert.match(rows,/if\(n\.isInstancedMesh\)n\.dispose\(\)/,'the picked plants are freed');
 assert.match(game,/if\(cropMotion\?\.animate\(\)\)renderer\.shadowMap\.needsUpdate=true;/,'shadows follow the moving plants');
 assert.doesNotMatch(read('public/farm-life.js'),/stone_fence_001',wx,wz/,'no loose stone walls beside the neighbouring fields');
});
test('goods: a tap on a building\'s yellow name collects everything ready on the farm and the goods fly to the Market button',()=>{
 const game=read('public/game.js');
 assert.match(game,/if\(economy\.status\(key\)\.kind!=='ready'\)\{economy\.openBuilding\(key\);return;\}/,'nothing ready: the window opens');
 assert.match(game,/const result=await runAction\(\{type:'collect_all',building:key\}\)/,'the same as Collect all in the window');
 assert.match(game,/else if\(target\.type==='building'\)\{if\(target\.label\)tapBuilding\(target\.id\);else economy\.openBuilding\(target\.id\);\}/,'a tap on the building itself opens its window');
 assert.match(read('public/wiki-content.js'),/tap the name to collect everything that is ready\. Or open the building and use Collect all\./);
});
