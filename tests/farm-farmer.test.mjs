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
  assert.equal(p.slot,FARMER_GROUPS[p.group].slot);assert.equal(p.earned,FARMER_GROUPS[p.group].earned||Object.hasOwn(P.FARMER_REWARDS,p.id)||Object.hasOwn(P.FARMER_PASS_PARTS,p.id),p.id);   // a pass's part is earned too (Winter 2026)
  for(const f of p.files){const size=statSync(file(`public/assets/farmer/parts/${f}.glb`)).size;total+=size;assert.ok(size<125_000,`${f} is ${size} bytes`);}
 }
 assert.ok(total<7_200_000,`all parts ${total} bytes`);
 // Earned: hats, hoods and helmets, costumes and mascots (the owner, 20 Oct 2026); everything else is free.
 assert.deepEqual(Object.entries(FARMER_GROUPS).filter(([,g])=>g.earned).map(([k])=>k).sort(),['costume','hat','helmet','mascot']);
});

test('a part file is a quantized, meshopt-packed skinned mesh bound to bones by name, with no picture; the rig has the pack\'s five clips and our own',()=>{
 const rig=glb('public/assets/farmer/farmer-rig.glb');
 assert.deepEqual(rig.animations.map(a=>a.name).sort(),['cheer','dance','hop','idle','look','relaxed','sit','walk','wave']);
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
 // Its preview's WebGL context goes when it closes (QA, 21 Oct 2026: after about 16 openings the browser took the farm's own away).
 assert.match(creator,/function close\(\)\{if\(!running\)return;running=false;resized\.disconnect\(\);farmer\.dispose\(\);renderer\.dispose\(\);renderer\.forceContextLoss\(\);/);
 assert.match(creator,/catch\(error\)\{renderer\.dispose\(\);renderer\.forceContextLoss\(\);dialog\.remove\(\);throw error;\}/,'also when the farmer cannot load');
 assert.equal((creator.match(/new THREE\.WebGLRenderer/g)??[]).length,1);
 assert.doesNotMatch(creator,/ · /);
 const catalog=JSON.parse(read('i18n/catalog.json')),texts=new Set(Array.isArray(catalog)?catalog:Object.keys(catalog));
 for(const t of ['My farmer','Skin','Face','Hair','Hat','Glasses','Beard','Top','Trousers','Outfit','Costume','Mascot','Shoes','Socks','Gloves','Random','Save','Saving…','None','Close',
  'Your farmer could not be saved. Please try again.','Earn this first to wear it.','The farmer who walks on your farm and in the village.',
  'Something new to wear in My farmer.'])assert.ok(texts.has(t),t);
 // Every goal's words are a text of the catalog (with its number as {0}).
 const goals=[...creator.matchAll(/:n=>`([^`]+)`/g)].map(m=>m[1].replace('${number(n)}','{0}'));
 assert.equal(goals.length,Object.keys(P.FARMER_GOALS).length);for(const t of goals)assert.ok(texts.has(t),t);
 for(const {goal} of Object.values(P.FARMER_REWARDS))assert.match(creator,new RegExp(`\\b${goal}:n=>`),goal);
 assert.match(read('scripts/i18n-extract.mjs'),/\|farmer-parts\)\\\.js\$\//,'the parts\' working names are not shown');
});

test('your farmer on the farm and in the village: after the first picture, only with motion, clear of everything that can be tapped',{skip},async()=>{
 const game=read('public/game.js'),walker=read('public/farm-farmer.js');
 assert.match(game,/void addPets\(\);void addFarmer\(\);/,'after the first picture, with the pets');
 assert.doesNotMatch(game,/^import[^\n]*farm-farmer/m,'never in the first load');
 assert.match(game,/function farmerComes\(\)\{const connection=navigator\.connection;return !\(reducedMotion\|\|adminView\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\);\}/);
 assert.match(game,/async function addFarmer\(\)\{\n try\{\n  if\(!farmerComes\(\)\)return;/);
 assert.match(game,/const config=farmerOf\(state,farmerFarm\(\)\),family=/);assert.match(game,/lite:handheld\|\|mobileLayout\.matches,config,trips:/,'phones every other frame, in the farmer\'s own clothes');
 assert.match(game,/herd\?\.animate\(dt,camera\);walker\?\.animate\(dt,camera\);/);
 assert.match(game,/if\(walker\?\.pick\(raycaster\)\)return \{type:'farmer'\};\n \/\/ Then your family's farmers on the farm and in the village \(item 5\): their profile\.\n for\(const other of familyWalkers\)if\(other\.pick\(raycaster\)\)return \{type:'familyFarmer',id:other\.playerId\};\n return null;\n\}/,'asked last of all (then the family\'s)');
 assert.match(walker,/if\(!frustum\.intersectsSphere\(sphere\)\)\{\n[^\n]*\n   if\(fade\)fadeBy\(Infinity\);\n   if\(me\.trip\)/,'only on screen (on a trip: only where they are; a family member\'s fade is over at once)');
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
 // The profile waits until the hop is over (the owner, 21 Oct 2026: "wacht met profiel open als die klaar is met springen"): the walker's
 // landing, then a short beat; at once when the farmer is not on the screen.
 assert.match(game,/function tapOwnFarmer\(\)\{const me=window\.parent\?\.harvestBridge\?\.playerId,landed=walker\?\.react\(\)\?\?Promise\.resolve\(\);if\(me&&window\.harvestProfiles\)void Promise\.resolve\(landed\)\.then\(\(\)=>new Promise\(beat=>setTimeout\(beat,LANDED_BEAT\)\)\)\.then\(\(\)=>window\.harvestProfiles\.open\(me,\{back:null\}\)\);\}/);
 assert.match(game,/const LANDED_BEAT=150;/);assert.doesNotMatch(game,/harvestProfiles\.open\(me,\{back:null\}\),\d+\)/,'no fixed wait any more');
 const walk=read('public/farm-farmer.js');
 assert.match(walk,/if\(me\.hopping<=0\)\{at\.y=ground\(at\.x,at\.z\);rest\(\);me\.landed\?\.\(\);me\.landed=null;\}/,'it settles when the farmer is back on the ground');
 assert.match(walk,/if\(!\(performance\.now\(\)-\(me\.steppedAt\?\?-Infinity\)<MOVED_RECENTLY\)\)\{at0\(\);return Promise\.resolve\(\);\}/,'not on the screen: at once');
});

test('your farmer joins in: a harvest, a collect or a chore takes them to a checked spot by it, on a computer\'s farm only (the owner, 21 Oct 2026: "Doe alles behalve 9")',{skip},async()=>{
 const {FARM_TRIPS,FIELD_TRIPS,tripFor,FARM_WALK}=await import('../public/farm-farmer.js');
 const {FARM_PETS}=await import('../public/farm-pets.js');
 const {FIELD_BLOCK,pondBounds,outsideYardExtents,outsideFields,anchorAt}=await import('../public/farm-layout.js');
 const TAPPABLE={farmhouse:[-21.4,-14.5,-16.6,-9.9],chores:[-14.6,-13.5,-8.8,-7.7],mill:[-19.5,-13,3.2,7.2],cart:[-13.7,-11.5,-14.1,-13.1],tractor:[-8.3,-5.2,-1.1,.6]};
 const seg=([x,z],[ax,az],[bx,bz])=>{const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;return Math.hypot(x-ax-t*dx,z-az-t*dz);};
 const pets=Object.values(FARM_PETS).flatMap(p=>p.spots.flatMap(a=>p.spots.map(b=>[a,b])));
 const all=[...Object.entries(FARM_TRIPS),...FIELD_TRIPS.map((t,i)=>[`field ${i}`,t])];
 assert.deepEqual(Object.keys(FARM_TRIPS).sort(),['bakery','chores','coop','dairy','mill','pigfarm','windmill']);
 for(const [name,{at,via}] of all){
  const [x,z]=at;
  // Where they stand (checked in the harness for cover, trip-cover.mjs): off the fields, out of every yard, off the pond, clear of the
  // pets' walks and of the tappable things round the Farmhouse.
  assert.ok(outsideFields(x,z,.5),`${name}: off the fields`);assert.ok(outsideYardExtents(x,z,.3),`${name}: out of the yards`);
  const [px0,pz0,px1,pz1]=pondBounds();assert.ok(x<px0||x>px1||z<pz0||z>pz1,name);
  for(const [a,b] of pets)assert.ok(seg(at,a,b)>2,`${name}: clear of the pets' walks`);
  for(const [what,[x0,x1,z0,z1]] of Object.entries(TAPPABLE))assert.ok(x<x0-1||x>x1+1||z<z0-1||z>z1+1,`${name}: clear of the ${what}`);
  // The way there (from the loop) never crosses the fields or the tractor.
  const way=[[-13.6,-2],...via,at];
  for(let i=0;i+1<way.length;i++)for(let k=0;k<=20;k++){
   const p=[way[i][0]+(way[i+1][0]-way[i][0])*k/20,way[i][1]+(way[i+1][1]-way[i][1])*k/20];
   assert.ok(outsideFields(p[0],p[1],.3),`${name}: the way stays off the fields at ${p}`);
   const [t0,t1,u0,u1]=TAPPABLE.tractor;assert.ok(p[0]<t0-.5||p[0]>t1+.5||p[1]<u0-.5||p[1]>u1+.5,`${name}: round the tractor at ${p}`);
  }
  // Near what they came for: a building's spot within 9 of it; a field's beside the crops.
  if(!name.startsWith('field')){const [bx,bz]=anchorAt(name);assert.ok(Math.hypot(x-bx,z-bz)<9,name);}
  else assert.ok(x>=FIELD_BLOCK.minX-3&&x<=FIELD_BLOCK.maxX&&z>=FIELD_BLOCK.minZ-3&&z<=FIELD_BLOCK.maxZ,name);
 }
 // The nearest field spot to the field worked on; an unknown place: none.
 assert.deepEqual(tripFor('fields',[-2,29]).at,[-7,26.55]);assert.deepEqual(tripFor('fields',[5,1]).at,[6.1,-2.8]);
 assert.equal(tripFor('factory'),null);assert.equal(tripFor('toString'),null);
 assert.ok(FARM_WALK.spots.every(([x,z])=>Math.hypot(x+13.6,z+2)<3),'every trip leaves from the loop');
 const walker=read('public/farm-farmer.js'),game=read('public/game.js');
 // One trip at a time, a rest after it, only to a spot in the picture; off the picture they keep walking (not their arms and legs).
 assert.match(walker,/if\(me\.trip\)\{if\(me\.trip\.trip===place&&me\.trip\.leg==='stay'\)\{me\.rest=Math\.min\(TRIP_STAY_MAX,me\.rest\+TRIP_MORE\);return true;\}return false;\}/);
 assert.match(walker,/if\(me\.clock-me\.tripDone<TRIP_REST\|\|!inView\(place\.at\)\)return false;/);
 assert.match(walker,/   if\(me\.trip\)\{me\.clock\+=t;step\(t\);\}return;\}/);
 assert.match(walker,/const TRIP_PACE=1\.6,TRIP_STAY=\[7,10\],TRIP_MORE=4,TRIP_STAY_MAX=18,TRIP_REST=20;/);
 // game.js: after every farm action and after a sweep; trips on the farm on a computer only (never in lite mode: phones, tablets, apps).
 assert.match(game,/farmerNews\(\);farmerJoins\(action\);/);
 assert.match(game,/if\(action==='harvest'\)\{nudge\?\.harvested\(\);farmerJoins\(\{type:'field',action:'harvest',id:result\.fields\.at\(-1\)\.id\}\);\}/);
 assert.match(game,/trips:!villageWorld&&!handheld&&!mobileLayout\.matches,bench,family,tag:farmerTag\(ownName\(\)\),blockers:tagBlockers\}\);farmerTrip=tripFor;/);
 assert.doesNotMatch(walker,/localStorage|runAction|client\.|track\(/,'visual only');
});

test('your farmer celebrates a level-up or an event won: two happy hops and a little confetti, once the level-up card is closed (the owner, 21 Oct 2026, item 2)',()=>{
 const walker=read('public/farm-farmer.js'),game=read('public/game.js'),events=read('public/live-events-ui.js');
 assert.match(walker,/const CHEER_HOPS=2,CHEER_UP=\.18;/);
 assert.match(walker,/me\.hops=CHEER_HOPS;me\.hopUp=CHEER_UP;me\.hopping=HOP_TIME;/);
 assert.match(walker,/if\(me\.hopping<=0&&me\.hops>1\)\{me\.hops--;me\.hopping=HOP_TIME;at\.y=ground\(at\.x,at\.z\);\}/,'the second hop straight after the first, from the ground');
 assert.match(walker,/me\.landed\?\.\(\);me\.landed=null;me\.hops=1;me\.hopUp=HOP_UP;/,'a tap is one ordinary hop again');
 assert.match(walker,/function celebrate\(\)\{\n  if\(me\.away\|\|me\.hopping>0\|\|!\(performance\.now\(\)-\(me\.steppedAt\?\?-Infinity\)<MOVED_RECENTLY\)\)return null;/,'not in the picture, on the bench or mid-hop: nothing');
 // Both level-up paths (a farm action and a sweep) and an event's reward collected (coins or diamonds).
 assert.equal(game.match(/if\(change\.leveled\)track\('level_up',\{level:change\.level\}\);if\(change\.leveled\)farmerCheers\(\);/g).length,2);
 assert.match(game,/onClaimed:reward=>\{if\(reward\?\.coins>0\|\|reward\?\.diamonds>0\)farmerCheers\(\);\}/);
 assert.match(events,/notify\?\.\(r\.reward\.message\);onClaimed\?\.\(r\.reward\);/);
 // The card first: a beat, then they wait while a window is in front (a minute at most).
 assert.match(game,/const CHEER_BEAT=900,CHEER_WAIT=60000;/);
 assert.match(game,/if\(modalOpen\(\)&&performance\.now\(\)-asked<CHEER_WAIT\)\{setTimeout\(now,400\);return;\}const at=walker\.celebrate\(\);if\(at\)confettiAt\(\.\.\.at\);/);
 // The confetti: the harvest's particles (under the same cap of 100), never with reduced motion.
 assert.match(game,/function confettiAt\(x,y,z,count=22\)\{\n if\(reducedMotion\)return;\n for\(let i=0;i<count&&particles\.length<100;i\+\+\)\{/);
});

test('the evening: from 20:00 to 7:00 by the player\'s clock your farmer rests on a chair by the loop, and goes back to work in the morning (the owner, 21 Oct 2026, item 3)',{skip},async()=>{
 const {FARM_BENCH,isEvening,EVENING_FROM,MORNING_AT,FARM_WALK,FARM_TRIPS,FIELD_TRIPS}=await import('../public/farm-farmer.js');
 const {FARM_PETS}=await import('../public/farm-pets.js');
 const {pondBounds,outsideYardExtents,outsideFields}=await import('../public/farm-layout.js');
 assert.equal(EVENING_FROM,20);assert.equal(MORNING_AT,7);
 const at=(h,m=0)=>new Date(2026,9,21,h,m);
 assert.deepEqual([at(19,59),at(20),at(23,30),at(0),at(6,59),at(7),at(12)].map(isEvening),[false,true,true,true,true,false,false]);
 // The chair (checked in the harness on a phone and a computer's two views: it and the farmer on it cover nothing that can be tapped).
 const {x,z}=FARM_BENCH,seg=([px,pz],[ax,az],[bx,bz])=>{const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((px-ax)*dx+(pz-az)*dz)/l)):0;return Math.hypot(px-ax-t*dx,pz-az-t*dz);};
 assert.ok(outsideFields(x,z,2)&&outsideYardExtents(x,z,.3));const [px0,pz0,px1,pz1]=pondBounds();assert.ok(x<px0||x>px1||z<pz0||z>pz1);
 const loop=FARM_WALK.spots;for(let i=0;i<loop.length;i++)assert.ok(seg([x,z],loop[i],loop[(i+1)%loop.length])>1,'clear of the loop');
 for(const p of Object.values(FARM_PETS))for(const a of p.spots)for(const b of p.spots)assert.ok(seg([x,z],a,b)>2,'clear of the pets\' walks');
 for(const t of [...Object.values(FARM_TRIPS),...FIELD_TRIPS]){const way=[[-13.6,-2],...t.via,t.at];for(let i=0;i+1<way.length;i++)assert.ok(seg([x,z],way[i],way[i+1])>1,'clear of the trips\' ways');}
 const TAPPABLE={farmhouse:[-21.4,-14.5,-16.6,-9.9],chores:[-14.6,-13.5,-8.8,-7.7],mill:[-19.5,-13,3.2,7.2],cart:[-13.7,-11.5,-14.1,-13.1],tractor:[-8.3,-5.2,-1.1,.6]};
 for(const [name,[x0,x1,z0,z1]] of Object.entries(TAPPABLE))assert.ok(x<x0-1||x>x1+1||z<z0-1||z>z1+1,name);
 const walker=read('public/farm-farmer.js'),game=read('public/game.js');
 // At once when the farm opens in the evening; a walk there when 20:00 comes during play; up again in the morning. No trips, no
 // celebration and no hop from the chair (a tap opens the profile at once).
 assert.match(walker,/if\(bench&&actions\.sit&&isEvening\(clock\(\)\)\)sitDown\(\);/);
 assert.match(walker,/if\(late&&!me\.away&&!me\.trip&&me\.hopping<=0\)\{me\.away='going';me\.target=front;\}\n  else if\(!late&&me\.away==='sitting'\)getUp\(\);/);
 assert.match(walker,/if\(me\.away==='sitting'\)return Promise\.resolve\(\);/);assert.match(walker,/if\(!trips\|\|!place\|\|me\.hopping>0\|\|me\.away\)return false;/);
 // The chair is the farm's own chair_001, there only with the farmer, only on the farm (the village has none).
 assert.match(game,/function placeBench\(spot\)\{if\(villageWorld\|\|farmBench\|\|!models\.has\('chair_001'\)\)return;const before=currentZone\(\);zone\('fields'\);cloneModel\('chair_001',spot\.x,spot\.z,\{height:spot\.height,rotation:spot\.turn\+CHAIR_FACING\}\);zone\(before\);farmBench=spot;\}/);
 // QA, 21 Oct 2026: the chair stands before the scenery is planted and the farmer comes after it, so the scenery is the same on every
 // visit (it reckons with what stands when it is planted) and leaves the farmer's loop, chair and trip spots free.
 assert.match(game,/if\(farmerSpots\)placeBench\(farmerSpots\.FARM_BENCH\);\n  buildScenery\(\{scene,models,mobile:mobileLayout\.matches,clear:farmerSpots\?\.inFarmerWay\?\?null\}\);/);
 assert.match(game,/if\(!villageWorld\)await sceneryDone;/);assert.match(game,/if\(!villageWorld\)sceneryDone=addScenery\(\);/);
 assert.match(read('public/scenery.js'),/if\(clear\)\{const d=entry\.size,across=Math\.max\(d\.x,d\.z\)\/2\/d\.y;list=list\.filter\(\(\[x,z,height\]\)=>!clear\(x,z,height\*across\)\);\}/);
 const {inFarmerWay}=await import('../public/farm-farmer.js');
 for(const [x,z] of [...FARM_WALK.spots,[FARM_BENCH.x,FARM_BENCH.z],...Object.values(FARM_TRIPS).map(t=>t.at),...FIELD_TRIPS.map(t=>t.at)])assert.ok(inFarmerWay(x,z,0),`${x},${z}`);
 assert.ok(inFarmerWay(-15.18,-1.53,1.08)&&inFarmerWay(-14.23,-1.53,.76),'the two bushes that stood on the loop on a computer');
 assert.ok(!inFarmerWay(-20,-8,1)&&!inFarmerWay(-13.16,3,.5),'the rest of the farm keeps its scenery');
 // The sitting clip is keyframed in the Blender step (the pack has none), built into the rig with --rig-only.
 assert.match(read('scripts/farmer-export.py'),/clip\('Farmer_Sit', \[/);assert.match(read('scripts/build-farmer.mjs'),/Farmer_Sit:'sit'/);
 assert.match(read('scripts/build-farmer.mjs'),/RIG_ONLY=process\.argv\.includes\('--rig-only'\)/);
});

test('gestures: Wave, Cheer and Dance in My farmer, keyframed on the pack\'s skeleton; the farmer on the farm does the last one tried once the window closes (the owner, 21 Oct 2026, item 4)',()=>{
 const exp=read('scripts/farmer-export.py'),build=read('scripts/build-farmer.mjs'),creator=read('public/farmer-creator.js'),walker=read('public/farm-farmer.js'),game=read('public/game.js');
 // Keyframed in the Blender step from the idle's first pose (read from its curves), never downloaded.
 for(const name of ['Farmer_Wave','Farmer_Cheer','Farmer_Dance','Farmer_Sit'])assert.match(exp,new RegExp(`clip\\('${name}', \\[`));
 assert.match(build,/Farmer_Sit:'sit',Farmer_Wave:'wave',Farmer_Cheer:'cheer',Farmer_Dance:'dance'\}/);
 assert.match(exp,/BASE\[bone\]\[slot\]\[fc\.array_index\] = fc\.evaluate\(idle\.frame_range\[0\]\)/);
 assert.doesNotMatch(exp+build,/mixamo|https?:\/\//i);
 // Every clip of the rig is short and starts and ends on the ground: the gestures are 1-2.5 s.
 const rig=glb('public/assets/farmer/farmer-rig.glb');assert.ok(statSync(file('public/assets/farmer/farmer-rig.glb')).size<130_000);
 for(const name of ['wave','cheer','dance'])assert.ok(rig.animations.some(a=>a.name===name),name);
 // My farmer: three small buttons on the stage (not with reduced motion), each played once there; nothing saved.
 assert.match(creator,/export const GESTURES=Object\.freeze\(\[\{id:'wave',name:'Wave'\},\{id:'cheer',name:'Cheer'\},\{id:'dance',name:'Dance'\}\]\.map\(Object\.freeze\)\);/);
 assert.match(creator,/\$\{reducedMotion\?'':`<div class="farmer-maker-moves" role="group" aria-label="Gestures">/);
 assert.match(creator,/a\.reset\(\);a\.setLoop\(THREE\.LoopOnce,1\);a\.clampWhenFinished=true;a\.play\(\);/);
 assert.match(creator,/dialog\.remove\(\);onClose\(lastMove\);\}/);
 const catalog=JSON.parse(read('i18n/catalog.json')),texts=new Set(Array.isArray(catalog)?catalog:Object.keys(catalog));
 for(const t of ['Wave','Cheer','Dance','Gestures'])assert.ok(texts.has(t),t);
 // The farm: once, facing you, not on the bench or mid-hop; a tap still hops and opens the profile.
 assert.match(walker,/const a=\['wave','cheer','dance'\]\.includes\(name\)\?actions\[name\]:null;\n  if\(!a\|\|me\.away\|\|me\.hopping>0\)return false;/);
 assert.match(game,/onClose:gesture=>\{if\(gesture\)setTimeout\(\(\)=>walker\?\.gesture\?\.\(gesture\),GESTURE_BEAT\);\}/);
 assert.match(game,/else if\(target\.type==='farmer'\)tapOwnFarmer\(\);/);
 // A celebration lifts both arms (the Cheer) while they hop.
 assert.match(walker,/if\(actions\.cheer\)\{actions\.cheer\.setLoop\(THREE\.LoopOnce,1\);actions\.cheer\.clampWhenFinished=true;play\('cheer',\.15\);\}/);
});

test('Share my farm: your farmer stands in the picture, facing you, on a spot it shows; everything goes back right after (the owner, 21 Oct 2026, item 7)',()=>{
 const game=read('public/game.js'),walker=read('public/farm-farmer.js');
 assert.match(game,/let farmerBack=null;try\{farmerBack=walker\?\.photo\?\.\(inPhoto\)\?\?null;\}catch\{\}/);
 assert.match(game,/finally\{farmerBack\?\.\(\);renderer\.setDrawingBufferSize\(viewportWidth,viewportHeight,viewportRatio\);/,'put back before the farm is drawn again');
 assert.match(game,/const inPhoto=\(\[x,z\]\)=>\{const v=new THREE\.Vector3\(x,1,z\)\.project\(photo\);return Math\.abs\(v\.x\)<\.85&&Math\.abs\(v\.y\)<\.8;\};/);
 // Where they stand: where they are, else the first spot of their loop or of a trip the photo shows (all checked to cover nothing);
 // from the evening chair, in front of it. Standing, facing you, the idle's first pose.
 assert.match(walker,/let at=me\.away==='sitting'&&front\?front:\[root\.position\.x,root\.position\.z\];/);
 assert.match(walker,/at=\[\.\.\.spots,\.\.\.Object\.values\(FARM_TRIPS\)\.map\(t=>t\.at\),\.\.\.FIELD_TRIPS\.map\(t=>t\.at\)\]\.find\(p=>inFrame\(p\)\);/);
 assert.match(walker,/root\.rotation\.y=Math\.PI\/4;\n  mixer\.stopAllAction\(\);actions\.idle\?\.reset\(\)\.play\(\);mixer\.update\(0\);/);
 assert.match(walker,/return \(\)=>\{root\.position\.set\(was\.x,was\.y,was\.z\);root\.rotation\.y=was\.yaw;/);
});
