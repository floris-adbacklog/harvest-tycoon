import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as nodeModule from 'node:module';
import {familyFarmers} from '../supabase/functions/farm-api/family-service.js';
import {DEFAULT_FARMER,validFarmerConfig} from '../game/farmer-parts.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// Your Farm Family's farmers in the village (21 Oct 2026, the owner: "Doe alles behalve 9; Kerstoutfit bewaren voor Kerst Pass", item 5).
const A='00000000-0000-4000-8000-00000000000a',B='00000000-0000-4000-8000-00000000000b',C='00000000-0000-4000-8000-00000000000c',ME='00000000-0000-4000-8000-0000000000ff';
const own={...DEFAULT_FARMER,hat:'hat_009'};
const view=()=>({id:'f1',members:[{playerId:ME,isSelf:true},{playerId:A},{playerId:B},{playerId:C}]});
const context={players:[{player_id:ME,farmer:own},{player_id:A,farmer:own},{player_id:B,farmer:{body:'hat_009'}},{player_id:C}]};

test('farm-api: the Family read carries each member\'s saved farmer only when the page asks for them, from the read it already makes',()=>{
 // Not asked (the Family window, chat): the view as it was, nothing added.
 for(const body of [{},{farmers:'yes'},{farmers:1},null])assert.deepEqual(familyFarmers(view(),context,body),view());
 const out=familyFarmers(view(),context,{operation:'family',farmers:true});
 assert.deepEqual(out.members.map(m=>m.farmer),[own,own,null,null],'a broken farmer and one never made: null (the page shows the default farmer)');
 for(const m of out.members)if(m.farmer)assert.equal(validFarmerConfig(m.farmer).ok,true);
 assert.deepEqual(familyFarmers({members:null},context,{farmers:true}),{members:null},'no family: nothing');
 const service=read('supabase/functions/farm-api/family-service.js');
 // No new SQL and no query of its own: the members' farms are already read for their looks.
 assert.match(service,/admin\.from\('player_farms'\)\.select\('player_id,looks:state->looks,farmer:state->farmer'\)\.in\('player_id',ids\)/);
 assert.equal((service.match(/admin\.from\('player_farms'\)/g)??[]).length,1);
 // The answer keeps profile:{player_id} (every route the site calls through bridge.request needs it, or the page shows Reconnecting).
 assert.match(service,/reading\?\{profile:\{player_id:player\},family:familyFarmers\(publicView\(context,player,state,now\),context,body\),serverNow:now\}/);
 // farmer-parts.js stands beside it in farm-api (scripts/sync-game.mjs).
 assert.equal(read('supabase/functions/farm-api/farmer-parts.js'),read('game/farmer-parts.js'));
});

test('the village: up to six of your family\'s farmers, each in their own look on a loop of their own, clear of everything that can be tapped; a tap opens their profile',{skip},async()=>{
 const {VILLAGE_FAMILY_WALKS,VILLAGE_WALK}=await import('../public/farm-farmer.js');
 const {VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_LANDMARK_SPOTS,VILLAGE_FIELD_PLOT,VILLAGE_FISHING_SPOT}=await import('../public/village-scene.js');
 const {VILLAGE_DEER}=await import('../public/farm-pets.js');
 assert.equal(VILLAGE_FAMILY_WALKS.length,6);
 const named=[...Object.values(VILLAGE_PLACES),...Object.values(VILLAGE_UTILITIES),...Object.values(VILLAGE_LANDMARK_SPOTS),VILLAGE_FISHING_SPOT],p=VILLAGE_FIELD_PLOT;
 const loop=spots=>spots.flatMap((a,i)=>{const b=spots[(i+1)%spots.length];return Array.from({length:11},(_,k)=>[a[0]+(b[0]-a[0])*k/10,a[1]+(b[1]-a[1])*k/10]);});
 const ownLoop=loop(VILLAGE_WALK.spots);
 for(const [i,walk] of VILLAGE_FAMILY_WALKS.entries()){
  assert.equal(walk.height,VILLAGE_WALK.height);assert.equal(walk.spots.length,3);
  for(const [x,z] of loop(walk.spots)){
   for(const spot of named)assert.ok(Math.hypot(x-spot.x,z-spot.z)>4,`loop ${i}: away from the place at ${spot.x},${spot.z}`);
   assert.ok(x<p.x-1||x>p.x+p.width+1||z<p.z-1||z>p.z+p.depth+1,'off the Village Fields');
   for(const [a,b] of VILLAGE_DEER.spots)assert.ok(Math.hypot(a-x,b-z)>=1.4,`loop ${i}: clear of the deer`);
   for(const [a,b] of ownLoop)assert.ok(Math.hypot(a-x,b-z)>1.5,`loop ${i}: clear of your own farmer's loop`);
   for(const [j,other] of VILLAGE_FAMILY_WALKS.entries())if(j!==i)for(const [a,b] of loop(other.spots))assert.ok(Math.hypot(a-x,b-z)>1.5,`loops ${i} and ${j} apart`);
  }
 }
 const game=read('public/game.js');
 // Once a visit, kept 10 minutes; online members first; at most six; only in the village, after your own farmer (the same rules).
 assert.match(game,/const data=await bridge\.request\(\{operation:'family',farmers:true\}\);/);
 assert.match(game,/const FAMILY_FARMERS_KEY='harvest-tycoon:family-farmers',FAMILY_FARMERS_KEEP=10\*60000;/);
 assert.match(game,/kept\?\.familyId===familyId&&Date\.now\(\)-kept\.at<FAMILY_FARMERS_KEEP/);
 assert.match(game,/\.slice\(0,6\)\.map\(m=>\(\{playerId:m\.playerId,farmer:m\.farmer&&validFarmerConfig\(m\.farmer\)\.ok\?cleanFarmer\(m\.farmer\):null\}\)\);/);
 assert.match(game,/if\(villageWorld\)void addFamilyFarmers\(createFarmWalker,VILLAGE_FAMILY_WALKS\);/);
 assert.match(game,/lite:handheld\|\|mobileLayout\.matches,config:member\.farmer\?\?undefined,name:'family-farmer'\}\);/);
 assert.match(game,/for\(const other of familyWalkers\)other\.animate\(dt,camera\);/);
 // A tap: after your own farmer, the hop, then that member's profile.
 assert.match(game,/for\(const other of familyWalkers\)if\(other\.pick\(raycaster\)\)return \{type:'familyFarmer',id:other\.playerId\};\n return null;/);
 assert.match(game,/else if\(target\.type==='familyFarmer'\)tapFamilyFarmer\(target\.id\);/);
 assert.match(game,/\.then\(\(\)=>window\.harvestProfiles\.open\(id,\{back:null\}\)\);\}/);
});
