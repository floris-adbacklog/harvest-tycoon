import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync,readdirSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const file=path=>new URL(`../${path}`,import.meta.url);

// farm-farmer.js and village-scene.js import 'three' by name, as the browser's import map does: here the copies the game ships.
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';
const P=await import('../public/farmer-parts.js');
const {FARMER_PARTS,FARMER_GROUPS,FARMER_SLOTS,FARMER_RULES,DEFAULT_FARMER,validFarmerConfig,wearPart,partTakesOff,farmerFiles,partsOfSlot,partsClash,farmerPart}=P;
const glb=path=>{const b=readFileSync(file(path));return JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));};
// A WebP's size in pixels (the extended, the lossless and the plain kind).
function webpSize(path){
 const b=readFileSync(file(path)),kind=b.toString('ascii',12,16);
 if(kind==='VP8X')return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
 if(kind==='VP8L'){const v=b.readUInt32LE(21);return [1+(v&0x3fff),1+((v>>14)&0x3fff)];}
 return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
}

// The farmer (20 Oct 2026, the owner: "Doe 2"): ithappy Studios' Creative Characters, cut by scripts/build-farmer.mjs into one small
// skinned file a part, one rig with the clips, and one colour picture.
test('the catalog holds every part of the pack, in its groups, with its files there and small',()=>{
 const count=g=>Object.values(FARMER_PARTS).filter(p=>p.group===g).length;
 assert.deepEqual(Object.fromEntries(Object.keys(FARMER_GROUPS).map(g=>[g,count(g)])),
  {body:16,face:80,hair:11,hairFull:15,hat:48,helmet:15,glasses:21,faceExtra:25,top:60,pants:14,shorts:6,outfit:10,costume:14,mascot:8,shoes:21,socks:8,gloves:23},
  'the pack\'s 413 meshes (a costume is several pieces: 32 in 14 costumes); the board\'s Frame labels and showcase Heads are no parts');
 const files=Object.values(FARMER_PARTS).flatMap(p=>p.files);
 assert.equal(files.length,413);assert.equal(new Set(files).size,413);
 assert.deepEqual(readdirSync(file('public/assets/farmer/parts')).sort(),files.map(f=>`${f}.glb`).sort(),'one file a mesh, nothing else in the folder');
 let total=0;
 for(const p of Object.values(FARMER_PARTS)){
  assert.match(p.id,/^[a-z0-9_]+$/);assert.ok(p.name&&!p.name.includes('|'),p.id);assert.ok(['farm','plain','fun','off'].includes(p.fit),p.id);
  assert.equal(p.slot,FARMER_GROUPS[p.group].slot);assert.equal(p.earned,FARMER_GROUPS[p.group].earned);
  for(const f of p.files){const size=statSync(file(`public/assets/farmer/parts/${f}.glb`)).size;total+=size;assert.ok(size<125_000,`${f} is ${size} bytes`);}
 }
 assert.ok(total<7_200_000,`all parts ${total} bytes`);
 // Earned: hats, hoods and helmets, costumes and mascots (the owner, 20 Oct 2026); everything else is free.
 assert.deepEqual(Object.entries(FARMER_GROUPS).filter(([,g])=>g.earned).map(([k])=>k).sort(),['costume','hat','helmet','mascot']);
});

test('a part file is a quantized, meshopt-packed skinned mesh bound to bones by name, with no picture; the rig has the five clips',()=>{
 const rig=glb('public/assets/farmer/farmer-rig.glb');
 assert.deepEqual(rig.animations.map(a=>a.name).sort(),['hop','idle','look','relaxed','walk']);
 assert.equal(rig.nodes.length,45,'the pack\'s 44 bones under its Skeleton node');assert.ok(!rig.meshes,'no mesh in the rig');
 const bones=new Set(rig.nodes.map(n=>n.name));
 for(const id of ['body_010','hat_009','outfit_001','costume_7','gloves_018','male_emotion_usual_002']){
  for(const f of FARMER_PARTS[id].files){
   const json=glb(`public/assets/farmer/parts/${f}.glb`);
   assert.deepEqual([...json.extensionsRequired].sort(),['EXT_meshopt_compression','KHR_mesh_quantization'],f);
   assert.ok(!json.images&&!json.textures,`${f} carries no picture (farmer.webp is shared)`);
   assert.ok(json.asset.extras.bakedShade&&json.meshes.every(m=>m.primitives.every(p=>p.attributes.COLOR_0!=null)),`${f} has a little of the farm's baked shade`);
   assert.equal(json.skins.length,1);for(const j of json.skins[0].joints)assert.ok(bones.has(json.nodes[j].name),`${f}: ${json.nodes[j].name} is a bone of the rig`);
  }
 }
 assert.ok(statSync(file('public/assets/farmer/farmer.webp')).size<40_000);assert.deepEqual(webpSize('public/assets/farmer/farmer.webp'),[512,512]);
 const build=read('scripts/build-farmer.mjs');
 assert.match(build,/meshopt\(\{encoder:MeshoptEncoder,level:'high'\}\)/);assert.match(build,/prune\(\{keepAttributes:true,keepLeaves:true\}\)/,'the finger and toe bones stay');
 assert.match(read('ASSET-USAGE.md'),/## The farmer \(20 Oct 2026\)[^]*Creative Characters[^]*not as they are/);
});

test('the rules: what cannot be worn together, as the pack was made',()=>{
 const clash=(a,b)=>partsClash(farmerPart(a),farmerPart(b));
 assert.ok(clash('outfit_001','outwear_010')&&clash('outfit_001','pants_002')&&clash('outfit_001','shorts_001'),'an outfit is a top and a bottom in one');
 assert.ok(clash('hairstyle_female_single_003','hat_009')&&clash('hairstyle_female_single_003','hat_single_001'),'big hair pokes through every hat');
 assert.ok(!clash('hairstyle_male_003','hat_009'),'short hair fits under a hat');
 assert.ok(clash('hat_single_001','hairstyle_male_003'),'a hood covers the whole head');
 for(const g of ['hair','hairFull','hat','helmet','top','pants','shorts','outfit','mascot','shoes','socks','gloves'])assert.ok(clash('costume_4',partsOfSlot(FARMER_GROUPS[g].slot).find(p=>p.group===g).id),`a costume goes head to toe: no ${g}`);
 assert.ok(!clash('mascot_005','pants_001')&&!clash('mascot_005','shoe_sneakers_010')&&clash('mascot_005','outwear_010')&&clash('mascot_005','hat_009'),'a mascot leaves the arms and legs free');
 assert.ok(clash('hat_single_002','glasses_004')&&clash('costume_8','beard_002')&&!clash('hat_single_001','glasses_004'),'what covers the face leaves no room for glasses or a beard');
 assert.ok(!clash('outwear_010','pants_002')&&!clash('glasses_004','hat_009')&&!clash('socks_006','shorts_001'));
 // Every rule is a pair of known groups, and no group blocks itself.
 for(const [g,list] of FARMER_RULES){assert.ok(FARMER_GROUPS[g]);for(const o of list){assert.ok(FARMER_GROUPS[o],o);assert.notEqual(o,g);}}
});

test('validFarmerConfig takes a farmer as it would be saved and refuses everything else',()=>{
 assert.deepEqual(validFarmerConfig(DEFAULT_FARMER),{ok:true});
 for(const p of Object.values(DEFAULT_FARMER).map(farmerPart))assert.equal(p.earned,false,'the default farmer wears only free parts');
 const bad=[null,undefined,'body_010',42,[],['body_010'],{},{body:'body_010'},{face:'male_emotion_usual_002'},
  {...DEFAULT_FARMER,cape:'hat_001'},{...DEFAULT_FARMER,hat:'hat_999'},{...DEFAULT_FARMER,hat:'outwear_010'},{...DEFAULT_FARMER,body:'hat_001'},
  {...DEFAULT_FARMER,top:'outwear_010'},{...DEFAULT_FARMER,hair:'hairstyle_female_single_003',hat:'hat_009'},{...DEFAULT_FARMER,hat:'hat_single_002',hair:null,glasses:'glasses_004'},
  {...DEFAULT_FARMER,hat:{id:'hat_009'}},{...DEFAULT_FARMER,hat:'toString'},{...DEFAULT_FARMER,hat:'__proto__'},JSON.parse('{"__proto__":"hat_009","body":"body_010","face":"male_emotion_usual_002"}'),
  Object.fromEntries([...FARMER_SLOTS,'extra'].map(s=>[s,null]))];
 for(const config of bad){const r=validFarmerConfig(config);assert.equal(r.ok,false,JSON.stringify(config));assert.equal(typeof r.error,'string');}
 assert.equal(validFarmerConfig({...DEFAULT_FARMER,hat:null,glasses:undefined}).ok,true,'an empty slot may be written out');
 // Earned parts: with the farmer's own list only what they have.
 const hat={...DEFAULT_FARMER,hat:'hat_009'};
 assert.equal(validFarmerConfig(hat).ok,true);assert.equal(validFarmerConfig(hat,{owned:[]}).ok,false);
 assert.equal(validFarmerConfig(hat,{owned:['hat_009']}).ok,true);assert.equal(validFarmerConfig(hat,{owned:new Set(['hat_009'])}).ok,true);
 assert.equal(validFarmerConfig({...DEFAULT_FARMER,glasses:'glasses_004'},{owned:[]}).ok,true,'free parts need nothing');
 // Pure and shared: no imports, the same file for the site (scripts/sync-game.mjs) and later farm-api.
 assert.equal(read('game/farmer-parts.js'),read('public/farmer-parts.js'));
 assert.doesNotMatch(read('game/farmer-parts.js'),/^import /m);
 assert.match(read('scripts/sync-game.mjs'),/copyFileSync\(new URL\('\.\.\/game\/farmer-parts\.js',import\.meta\.url\),new URL\('\.\.\/public\/farmer-parts\.js',import\.meta\.url\)\);/);
});

test('putting a part on takes off what does not go with it; the files follow the slots',()=>{
 let c=wearPart(DEFAULT_FARMER,'costume','costume_7');
 assert.deepEqual(c,{body:DEFAULT_FARMER.body,face:DEFAULT_FARMER.face,costume:'costume_7'});assert.equal(validFarmerConfig(c).ok,true);
 c=wearPart({...DEFAULT_FARMER,hair:'hairstyle_female_single_003'},'hat','hat_009');assert.equal(c.hair,undefined);assert.equal(c.hat,'hat_009');
 assert.deepEqual(partTakesOff(DEFAULT_FARMER,'outwear_010'),['outfit']);
 assert.deepEqual(wearPart(DEFAULT_FARMER,'body',null),DEFAULT_FARMER,'body and face never come off');
 assert.equal(wearPart(DEFAULT_FARMER,'shoes',null).shoes,undefined);
 assert.deepEqual(wearPart(DEFAULT_FARMER,'hat','outwear_010'),DEFAULT_FARMER,'a part only goes in its own slot');
 assert.deepEqual(farmerFiles(DEFAULT_FARMER),['body_010','male_emotion_usual_002','hairstyle_male_003','outfit_001','shoe_sneakers_010']);
 assert.deepEqual(farmerFiles({body:'body_010',face:'male_emotion_usual_002',costume:'costume_8'}),['body_010','male_emotion_usual_002','costume_8_001','costume_8_002','costume_8_003','costume_8_004']);
 // Any random farmer of the creator is a valid one.
});

test('the pictures: a sheet a slot for My farmer (only what it offers), its own picture, and no portrait layers any more',()=>{
 const {creatorParts}=P;
 for(const slot of FARMER_SLOTS){
  const n=creatorParts(slot).length,sheet=`public/assets/farmer/thumbs/${slot}.webp`;
  if(!n){assert.ok(!existsSync(file(sheet)),`${slot}: nothing offered yet, no sheet`);continue;}
  assert.deepEqual(webpSize(sheet),[960,Math.ceil(n/10)*96],`${slot}: 10 a row, 96 px`);
 }
 assert.deepEqual(readdirSync(file('public/assets/farmer/thumbs')).sort(),FARMER_SLOTS.filter(s=>creatorParts(s).length).map(s=>`${s}.webp`).sort());
 // The painted avatars stay everyone's picture (the owner, 20 Oct 2026): the stacked portraits of phase 1 are not shipped.
 assert.ok(!existsSync(file('public/assets/farmer/portrait'))&&!existsSync(file('public/farmer-portrait.js')));
 assert.deepEqual(webpSize('public/assets/icons/my-farmer.webp'),[256,256]);assert.match(read('public/visual-icons.js'),/pictures\['my-farmer'\]='my-farmer';webpPictures\.add\('my-farmer'\);/);
 const build=read('scripts/build-farmer-pictures.mjs');
 assert.match(build,/'--headless=new','--mute-audio'/,'a muted headless Chrome');assert.match(build,/chrome\.kill\(\)/,'stopped by its own process');
 assert.match(build,/--host-resolver-rules=MAP \* ~NOTFOUND, EXCLUDE localhost, EXCLUDE 127\.0\.0\.1/,'only this computer');
});

test('My farmer: a tab for every slot it offers, with words that are in every language; Save is the farm action',async()=>{
 const creator=read('public/farmer-creator.js');
 const tabs=[...creator.matchAll(/\['([a-zA-Z]+)','([A-Za-z ]+)'\]/g)].map(m=>m[1]);
 assert.deepEqual(tabs,FARMER_SLOTS);
 assert.match(creator,/const tabs=CREATOR_TABS\.filter\(\(\[slot\]\)=>creatorParts\(slot\)\.length\);/,'a tab with nothing to offer yet is left out');
 assert.doesNotMatch(creator,/localStorage|sessionStorage|fetch\(|client\.|bridge/,'it saves only through onSave (the farm action)');
 assert.match(creator,/save\.disabled=busy\|\|!changed\(\)\|\|Boolean\(locked\);/,'nothing to save, or something not earned yet: no Save');
 assert.doesNotMatch(creator,/ · /);
 const catalog=JSON.parse(read('i18n/catalog.json')),texts=new Set(Array.isArray(catalog)?catalog:Object.keys(catalog));
 for(const t of ['My farmer','Skin','Face','Hair','Hat','Glasses','Beard','Top','Trousers','Outfit','Costume','Mascot','Shoes','Socks','Gloves','Random','Save','Saving…','None','Close',
  'Earned with levels, goals and passes.','Your farmer could not be saved. Please try again.','Reach level {0}.','Earn this first to wear it.','The farmer who walks on your farm and in the village.'])assert.ok(texts.has(t),t);
 for(const id of Object.keys(P.FARMER_REWARDS)){const t=P.rewardText(id).replace(/^Reach level \d+\.$/,'Reach level {0}.');assert.ok(texts.has(t),`${id}: ${t}`);}
 assert.match(read('scripts/i18n-extract.mjs'),/\|farmer-parts\)\\\.js\$\//,'the parts\' working names are not shown');
});

test('your farmer on the farm and in the village: after the first picture, only with motion, clear of everything that can be tapped',{skip},async()=>{
 const game=read('public/game.js'),walker=read('public/farm-farmer.js');
 assert.match(game,/void addPets\(\);void addFarmer\(\);/,'after the first picture, with the pets');
 assert.doesNotMatch(game,/^import[^\n]*farm-farmer/m,'never in the first load');
 assert.match(game,/if\(reducedMotion\|\|adminView\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\)return;/);
 assert.match(game,/lite:handheld\|\|mobileLayout\.matches,config:farmerOf\(state,farmerFarm\(\)\)\}\);/,'phones every other frame, in the farmer\'s own clothes');
 assert.match(game,/herd\?\.animate\(dt,camera\);walker\?\.animate\(dt,camera\);/);
 assert.match(game,/if\(walker\?\.pick\(raycaster\)\)return \{type:'farmer'\};\n return null;\n\}/,'asked last of all');
 assert.match(walker,/if\(!frustum\.intersectsSphere\(sphere\)\)return;/,'only on screen');
 assert.doesNotMatch(walker,/localStorage|runAction|state\.|client\.|track\(/,'it saves and counts nothing');
 const {FARM_WALK,VILLAGE_WALK}=await import('../public/farm-farmer.js');
 const {FARM_PETS,VILLAGE_DEER}=await import('../public/farm-pets.js');
 const {FIELD_BLOCK,pondBounds,outsideYardExtents}=await import('../public/farm-layout.js');
 const {VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_LANDMARK_SPOTS,VILLAGE_FIELD_PLOT,VILLAGE_FISHING_SPOT}=await import('../public/village-scene.js');
 const loop=spots=>spots.flatMap((a,i)=>{const b=spots[(i+1)%spots.length];return Array.from({length:11},(_,k)=>[a[0]+(b[0]-a[0])*k/10,a[1]+(b[1]-a[1])*k/10]);});
 const walk=spots=>spots.flatMap(a=>spots.flatMap(b=>Array.from({length:11},(_,i)=>[a[0]+(b[0]-a[0])*i/10,a[1]+(b[1]-a[1])*i/10])));
 // The tappable things round the Farmhouse (tests/farm-pets.test.mjs) and the pets' walks.
 const TAPPABLE={farmhouse:[-21.4,-14.5,-16.6,-9.9],chores:[-14.6,-13.5,-8.8,-7.7],mill:[-19.5,-13,3.2,7.2],cart:[-13.7,-11.5,-14.1,-13.1],tractor:[-8.3,-5.2,-1.1,.6]};
 const pets=Object.values(FARM_PETS).flatMap(p=>walk(p.spots));
 for(const [x,z] of loop(FARM_WALK.spots)){
  assert.ok(x<FIELD_BLOCK.minX-2||x>FIELD_BLOCK.maxX+2||z<FIELD_BLOCK.minZ-2||z>FIELD_BLOCK.maxZ+2,`off the fields at ${x},${z}`);
  const [px0,pz0,px1,pz1]=pondBounds();assert.ok(x<px0||x>px1||z<pz0||z>pz1);
  assert.ok(outsideYardExtents(x,z,1),`out of the yards at ${x},${z}`);
  for(const [name,[x0,x1,z0,z1]] of Object.entries(TAPPABLE))assert.ok(x<x0-1||x>x1+1||z<z0-1||z>z1+1,`clear of the ${name} at ${x},${z}`);
  for(const [a,b] of pets)assert.ok(Math.hypot(a-x,b-z)>2,`clear of the pets' walks at ${x},${z}`);
 }
 const named=[...Object.values(VILLAGE_PLACES),...Object.values(VILLAGE_UTILITIES),...Object.values(VILLAGE_LANDMARK_SPOTS),VILLAGE_FISHING_SPOT],p=VILLAGE_FIELD_PLOT;
 for(const [x,z] of loop(VILLAGE_WALK.spots)){
  for(const spot of named)assert.ok(Math.hypot(x-spot.x,z-spot.z)>4,`away from the place at ${spot.x},${spot.z}`);
  assert.ok(x<p.x-1||x>p.x+p.width+1||z<p.z-1||z>p.z+p.depth+1,'off the Village Fields');
  for(const [a,b] of walk(VILLAGE_DEER.spots))assert.ok(Math.hypot(a-x,b-z)>=1,`clear of the deer's walk at ${x},${z}`);
 }
 assert.ok(VILLAGE_WALK.height<FARM_WALK.height,'the village is drawn smaller than the farm');
});

test('the build is written down: the Blender step, the cut, the pictures; the pack never in the repository',()=>{
 const exp=read('scripts/farmer-export.py');
 assert.match(exp,/CLIPS = \['Idle_Breathing', 'Idle_Look_Around', 'Idle_Relaxed', 'Walk_Forward', 'Jump_Start', 'Jump_End'\]/);
 assert.match(exp,/"Frame": the pack's own showcase board/);
 assert.ok(!existsSync(file('public/assets/farmer/Creative_Characters.blend')));
 for(const f of readdirSync(file('public/assets/farmer')))assert.ok(['farmer-rig.glb','farmer.webp','parts','thumbs'].includes(f),f);
});

test('a tap on your own farmer: a hop, then your own profile (the owner, 20 Oct 2026: "als je op jezelf klikt dat je dan naar je profiel gaat")',()=>{
 const game=readFileSync(new URL('../public/game.js',import.meta.url),'utf8');
 assert.match(game,/else if\(target\.type==='farmer'\)tapOwnFarmer\(\);/);
 assert.match(game,/function tapOwnFarmer\(\)\{walker\?\.react\(\);const me=window\.parent\?\.harvestBridge\?\.playerId;if\(me&&window\.harvestProfiles\)setTimeout\(\(\)=>window\.harvestProfiles\.open\(me,\{back:null\}\),\d+\);\}/);
});
