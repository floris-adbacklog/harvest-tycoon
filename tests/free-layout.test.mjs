// Your own farm layout (24 Oct 2026, the owner: "Doe optie 2"): move every yard and field on World 1, land that opens by level, trees,
// bushes and rocks you clear for coins, and trees and path tiles you buy and store (game/farm-map.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,xpForLevel,NO_EVENT_ACTIONS} from '../game/farm-state.js';
import {LAYOUT_YARDS,FIXED_YARDS,LAND,WATER,DECOR,landOpen,landAt,clearCost,obstacleKind,LAYOUT_GRID} from '../game/farm-map.js';
import {ANCHORS,pondBounds} from '../public/farm-layout.js';
import {misfit,LAYOUT_SLACK} from '../public/layout-edit.js';
import {INSTANT_ACTIONS} from '../public/farm-client.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,24,12);
const farmAt=level=>{const s=createFarm(now);s.xp=xpForLevel(level);s.coins=100000;return s;};

test('every yard moves but the farmhouse and the pond; the water is the pond\'s box; the land fits together without gaps',()=>{
 assert.deepEqual([...LAYOUT_YARDS,...FIXED_YARDS].sort(),[...new Set(Object.keys(ANCHORS))].sort());
 {const [minX,minZ,maxX,maxZ]=pondBounds().map(v=>+v.toFixed(2));assert.deepEqual([...WATER[0]],[minX,maxX,minZ,maxZ]);}
 for(const a of LAND)for(const b of LAND)if(a!==b){const [x0,x1,z0,z1]=a.box,[y0,y1,w0,w1]=b.box;assert.ok(x1<=y0||y1<=x0||z1<=w0||w1<=z0,`${a.id} and ${b.id} overlap`);}
 assert.equal(landAt(0,0).id,'middle');assert.equal(LAND.find(p=>p.id==='middle').level,1,'the middle from the start');
 assert.equal(landAt(-45,0).level,25,'the west at 25');assert.equal(landAt(50,0).level,50,'the east at 50');
});

test('moving: from the start, on open land on the grid, never in the pond; the farmhouse and the pond stay',()=>{
 const s=farmAt(1);
 assert.deepEqual(act(s,{type:'layout_move',id:'bakery',x:-20,z:10.5},now),{moved:'bakery',x:-20,z:10.5,turn:0});
 assert.deepEqual(s.layout.at.bakery,[-20,10.5]);
 act(s,{type:'layout_move',id:'field:3',x:0,z:-2},now);assert.deepEqual(s.layout.at['field:3'],[0,-2]);
 assert.throws(()=>act(s,{type:'layout_move',id:'field:99',x:0,z:0},now),/Choose something to move/);
 assert.throws(()=>act(s,{type:'layout_move',id:'farmhouse',x:0,z:0},now),/stays where it is/);
 assert.throws(()=>act(s,{type:'layout_move',id:'pond',x:0,z:0},now),/stays where it is/);
 assert.throws(()=>act(s,{type:'layout_move',id:'bakery',x:.3,z:0},now),/Choose a spot/,'on the half-step grid');
 assert.throws(()=>act(s,{type:'layout_move',id:'bakery',x:-45,z:0},now),/opens at level 25/);
 assert.throws(()=>act(s,{type:'layout_move',id:'bakery',x:25,z:15},now),/in the pond/);
 assert.throws(()=>act(s,{type:'layout_move',id:'bakery',x:200,z:0},now),/off your farm/);
 const w=farmAt(25);act(w,{type:'layout_move',id:'bakery',x:-45,z:0},now);assert.deepEqual(w.layout.at.bakery,[-45,0]);
 // A building turns a quarter at a time ("Rotate building maybe?"): saved as its third number; a field does not turn.
 assert.deepEqual(act(s,{type:'layout_move',id:'bakery',x:-20,z:10.5,turn:3},now),{moved:'bakery',x:-20,z:10.5,turn:3});assert.deepEqual(s.layout.at.bakery,[-20,10.5,3]);
 act(s,{type:'layout_move',id:'bakery',x:-20,z:10.5,turn:0},now);assert.deepEqual(s.layout.at.bakery,[-20,10.5],'no turn, no third number');
 assert.throws(()=>act(s,{type:'layout_move',id:'bakery',x:-20,z:10.5,turn:4},now),/how it stands/);
 assert.throws(()=>act(s,{type:'layout_move',id:'field:3',x:0,z:-2,turn:1},now),/how it stands/);
 for(const type of ['layout_move','layout_store','layout_place'])assert.ok(NO_EVENT_ACTIONS.has(type),type);
 assert.equal(LAYOUT_GRID,.5);
});

test('clearing: a tree, bush or rock on open land for coins (no XP), once; further out costs more',()=>{
 assert.equal(obstacleKind('stone_fence_001'),null,'a stone wall is no rock');assert.equal(obstacleKind('stone_002'),'rock');
 assert.equal(obstacleKind('tree_004'),'tree');assert.equal(obstacleKind('fir_tree_001'),'tree');assert.equal(obstacleKind('bush_001'),'bush');assert.equal(obstacleKind('stone_002'),'rock');assert.equal(obstacleKind('grass_001'),null);
 assert.deepEqual(clearCost('o:tree_001:100:-50'),{kind:'tree',land:'middle',coins:120});
 assert.ok(clearCost('o:tree_001:550:0').coins>clearCost('o:tree_001:100:0').coins,'the east costs more than the middle');
 assert.equal(clearCost('o:grass_001:0:0'),null);assert.equal(clearCost('nope'),null);
 const s=farmAt(5),coins=s.coins,xp=s.xp;
 assert.deepEqual(act(s,{type:'layout_clear',id:'o:tree_001:100:-50'},now),{cleared:'o:tree_001:100:-50',kind:'tree',coins:120});
 assert.equal(s.coins,coins-120);assert.equal(s.xp,xp,'no XP');assert.deepEqual(s.layout.cleared,['o:tree_001:100:-50']);assert.equal(s.stats.cleared,1);
 assert.throws(()=>act(s,{type:'layout_clear',id:'o:tree_001:100:-50'},now),/cleared already/);
 assert.throws(()=>act(s,{type:'layout_clear',id:'o:tree_001:-450:0'},now),/opens at level 25/);
 const poor=farmAt(5);poor.coins=10;assert.throws(()=>act(poor,{type:'layout_clear',id:'o:bush_001:0:0'},now),/You need 40 coins/);
});

test('trees and path tiles: bought for coins and placed, moved, stored and placed again for free',()=>{
 const s=farmAt(3),coins=s.coins;
 const r=act(s,{type:'layout_buy',kind:'oak',x:2,z:-30},now);assert.equal(r.placed,'d0');assert.equal(s.coins,coins-DECOR.oak.coins);
 assert.deepEqual(s.layout.added,[{id:'d0',kind:'oak',x:2,z:-30}]);
 act(s,{type:'layout_move',id:'d0',x:3,z:-30},now);assert.equal(s.layout.added[0].x,3);assert.equal(s.layout.at.d0,undefined);
 act(s,{type:'layout_store',id:'d0'},now);assert.deepEqual(s.layout.added,[]);assert.deepEqual(s.layout.stored,{oak:1});
 const before=s.coins;act(s,{type:'layout_place',kind:'oak',x:4,z:-30},now);assert.equal(s.coins,before,'placing from the store is free');
 assert.deepEqual(s.layout.added,[{id:'d1',kind:'oak',x:4,z:-30}]);assert.deepEqual(s.layout.stored,{});
 assert.throws(()=>act(s,{type:'layout_place',kind:'oak',x:4,z:-30},now),/none stored/);
 assert.throws(()=>act(s,{type:'layout_buy',kind:'castle',x:4,z:-30},now),/Choose a tree or a path tile/);
});

test('a farm that never moved anything has no layout; a broken one is cleaned; old rules keep the key',()=>{
 const s=farmAt(1);act(s,{type:'field',id:0,action:'harvest'},now);assert.equal(s.layout,undefined);
 s.layout={at:{bakery:[1,2],mill:[3,4,2],coop:[3,4,7],farmhouse:[0,0],'field:999':[1,1],nope:[1,1],dairy:['x',1]},cleared:['o:tree_001:1:1','bad',3],added:[{id:'d4',kind:'oak',x:1,z:2},{id:'x',kind:'oak',x:1,z:2}],stored:{oak:2,castle:1}};
 act(s,{type:'field',id:1,action:'harvest'},now);
 assert.deepEqual(s.layout,{v:1,at:{bakery:[1,2],mill:[3,4,2],coop:[3,4]},cleared:['o:tree_001:1:1'],added:[{id:'d4',kind:'oak',x:1,z:2}],stored:{oak:2},n:5,roads:[]});
 assert.match(read('scripts/sync-game.mjs'),/game\/farm-map\.js/);
 assert.equal(read('public/farm-map.js'),read('game/farm-map.js'));assert.equal(read('supabase/functions/farm-api/farm-map.js'),read('game/farm-map.js'));
});

test('R turns what you hold on a keyboard, as the Rotate button does, and Esc ends moving; not while typing or with Ctrl, Cmd or Alt',()=>{
 const edit=read('public/layout-edit.js');
 assert.match(edit,/if\(!on\|\|event\.repeat\|\|event\.ctrlKey\|\|event\.metaKey\|\|event\.altKey\)return;/);
 assert.match(edit,/if\(event\.key==='Escape'\)\{event\.preventDefault\(\);stop\(\);return;\}\n  if\(!held\|\|event\.key\?\.toLowerCase\(\)!=='r'\)return;\n  event\.preventDefault\(\);turn\(\);/);
 assert.match(read('public/farm.html'),/data-layout="rotate" aria-label="Rotate" title="Rotate \(R\)" aria-keyshortcuts="R"/);
});

test('what fits: open land, out of the pond and off the roads, clear of the rest; a tree, bush or rock in it says so',()=>{
 const rules={level:1,others:[[-30,-20,20,30]],roads:[[-50,50,-6.7,-3.8]],blockers:[{x:0,z:-20,kind:'tree'}]};
 assert.equal(misfit([-2,2,-30,-26],rules),null);
 assert.equal(misfit([-50,-46,0,4],rules),'land','the west opens at 25');assert.equal(misfit([-50,-46,0,4],{...rules,level:25}),null);
 assert.equal(misfit([20,24,12,16],rules),'water');assert.equal(misfit([-2,2,-6,-2],rules),'road');
 assert.equal(misfit([-21,-17,22,26],rules),'taken');assert.equal(misfit([-20.5,-17,22,26],rules),null,`fences may touch: more than ${LAYOUT_SLACK} over is a clash`);
 assert.equal(misfit([-2,2,-22,-18],rules),'tree');
});

test('the screen: layout actions show at once; Move things can be switched off in Graphics (on unless this device said off); the share picture shows the whole farm',()=>{
 for(const type of ['layout_move','layout_clear','layout_buy','layout_place','layout_store'])assert.ok(INSTANT_ACTIONS.has(type),type);
 const game=read('public/game.js'),html=read('public/farm.html');
 assert.match(html,/<label class="notify-row" for="move-things"><span><strong>Move things<\/strong>/);
 assert.match(game,/function movingOn\(\)\{try\{return localStorage\.getItem\(MOVE_KEY\)!=='off';\}catch\{return true;\}\}/);
 assert.match(game,/for\(const id of \['layout-button','layout-menu-entry'\]\)\$\(id\)\.hidden=!on;if\(!on\)layoutEditor\?\.stop\(\);/);
 assert.match(game,/const whole=wholeFarmFrame\(width\/height\),photo=camera\.clone\(\);Object\.assign\(photo,whole\?\?photoFrame\(camera,width\/height\)\);/);
 assert.match(game,/\.\.\.Array\.from\(decorViews\.values\(\),v=>v\.obj\)\]\)\{/,'the trees you placed count for the whole farm');
 assert.match(read('public/scenery.js'),/im\.userData\.scenery=name;im\.userData\.spots=list\.map\(\(\[x,z\]\)=>\[x,z\]\);/,'an instanced tree is known by its spot');
});


// Visiting a farm (24 Oct 2026, the owner: "Zorg ook dat je andermans boerderij kan visiten na dit").
test('a visit shows the farm as it stands (its own layout too), never its coins, diamonds, stock, invite or first-look notes',async()=>{
 const {visitView,VISIT_KEYS}=await import('../game/farm-state.js');
 const s=farmAt(40);s.diamonds=77;s.inventory.wheat=55;s.invite={code:'AB12',by:'x',at:now};s.inviteRewards=['p1'];s.onboarding.firstLook={readyAt:now,frame:'960x540'};
 act(s,{type:'layout_move',id:'bakery',x:-20,z:10.5,turn:1},now);s.family={familyId:'f1',unclaimedCount:3,name:'Sunny Acres',emblem:'2',level:4,secret:'x'};
 const v=visitView(s,now);
 assert.deepEqual(v.layout.at,{bakery:[-20,10.5,1]});assert.deepEqual(v.plots,s.plots);assert.deepEqual(v.buildings,s.buildings);assert.equal(v.xp,s.xp);
 assert.equal(v.coins,0);assert.equal(v.diamonds,0);assert.equal(v.inventory.wheat,createFarm(now).inventory.wheat??0,'a fresh farm\'s stock, not theirs');
 assert.equal(v.invite,undefined);assert.deepEqual(v.inviteRewards,[]);assert.equal(v.onboarding.firstLook,undefined);
 assert.deepEqual(v.family,{familyId:'f1',unclaimedCount:0,name:'Sunny Acres',emblem:'2',level:4});
 for(const key of ['coins','diamonds','inventory','invite','inviteRewards','donations','emailBonus','login','starterOffer','passPremium'])assert.ok(!VISIT_KEYS.includes(key),key);
});

test('a visit: farm-api farm_visit, Visit farm on someone else\'s profile, the page marked and locked, and the way back',()=>{
 const api=read('supabase/functions/farm-api/index.ts'),service=read('supabase/functions/farm-api/player-profile-service.js');
 assert.match(api,/'player_profile','farm_visit',/);assert.match(api,/if\(body\.operation==='farm_visit'\)\{const visit=await handleFarmVisit\(\{admin,body,player:user\.id,visitorAdmin:isAdminAccount\(user\)\}\);/);
 assert.match(service,/const state=visitView\(farm\.state,now\);/);assert.match(service,/select\('state'\)\.eq\('player_id',body\.playerId\)/);
 const profiles=read('src/player-profiles.js');
 assert.match(profiles,/\$\{self\?'':'<div class="farmer-visit" data-farmer-visit hidden><\/div>'\}/,'only on someone else\'s profile');
 assert.match(profiles,/box\.querySelector\('button'\)\.onclick=\(\)=>\{dialog\.close\(\);visit\(player\.playerId,player\.username\);\};/);
 const cloud=read('src/game-cloud.js');assert.match(cloud,/if\(visit\)\{markAdminView\(document\);document\.documentElement\.dataset\.visitView='';\}/);
 assert.match(cloud,/const visit=Boolean\(window\.harvestInitialFarm\.visit\);/,'a visit is a visit on Kongregate, CrazyGames and Discord too (25 Oct 2026)');
 assert.match(read('public/farm-client.js'),/export const VISIT_LOCKED='You are visiting this farm\. Go back to your own farm to play\.';/);
 const game=read('public/game.js');
 assert.match(game,/request:body=>body\?\.operation==='action'\?locked\(\):body\?\.operation==='load'\?/,'their farm loads, every action is refused');
 assert.match(game,/requestAnimationFrame\(frame\);if\(!ready\|\|document\.hidden\|\|visitLayer\)return;/,'your own farm rests meanwhile');
 assert.match(game,/if\(!villageWorld&&!adminView\)\{window\.harvestVisit=playerId=>void openVisit\(playerId\);window\.harvestCloseVisit=closeVisit;\}/);
 assert.match(game,/const visitInfo=window\.harvestInitialFarm\.visit\?\?null;/,'read before the page lets go of the first farm');
});

test('no visits for the admins, both ways, and no Neighbours on their showcase farm (25 Oct 2026, the owner: "Je moet geen buren kunnen doen als admin")',async()=>{
 const {handleFarmVisit}=await import('../supabase/functions/farm-api/player-profile-service.js');
 const ADMIN='11111111-1111-4111-8111-111111111111',FARMER='22222222-2222-4222-8222-222222222222';
 const query=data=>{const q={select:()=>q,eq:()=>q,maybeSingle:()=>Promise.resolve({data,error:null})};return q;};
 const client={auth:{admin:{getUserById:async id=>({data:{user:{created_at:'2026-10-01T00:00:00Z',email:id===ADMIN?'floris@millstone.nl':'farmer@example.com'}}})}},
  from:table=>query(table==='player_farms'?{state:createFarm(Date.now())}:{username:'Sam',avatar_id:'default'})};
 const visit=(playerId,visitorAdmin=false)=>handleFarmVisit({admin:client,body:{playerId},player:FARMER,visitorAdmin});
 assert.equal((await visit(FARMER)).status,200,'an ordinary farm');
 assert.deepEqual([(await visit(ADMIN)).status,(await visit(ADMIN)).data.code],[403,'VISIT_REFUSED'],'never an admin\'s farm');
 assert.equal((await visit(FARMER,true)).status,403,'an admin visits nobody');
 // The profile shows no Visit farm for an admin (noVisit), and the admin's own game has no Neighbours (farm-api refuses their actions).
 assert.match(read('supabase/functions/farm-api/player-profile-service.js'),/\.\.\.\(a\.admin\?\{noVisit:true\}:\{\}\)/);
 assert.match(read('src/player-profiles.js'),/if\(!box\|\|typeof visit!=='function'\|\|player\.noVisit\)return;/);
 assert.match(read('public/game.js'),/if\(adminView\)document\.querySelector\('\[data-menu-utility="neighbours"\]'\)\?\.setAttribute\('hidden',''\);\n else neighbours=createNeighboursUI\(/);
});

test('drawing (24 Oct 2026, "1+2", then "Doe 1,2,3"): paths, fences, flowers and grass with a drag; erased ones and old road pieces go to your store',async()=>{
 const {DECOR:D,roadPieces,OLD_ROADS}=await import('../game/farm-map.js');
 assert.deepEqual(Object.keys(D).filter(k=>D[k].draw),['path','fence','flowers','grass']);
 assert.equal(roadPieces().filter(p=>p.road===0).length,38);assert.equal(OLD_ROADS.length,5,'the road out of the valley stays');
 const s=farmAt(30),coins=s.coins;
 assert.deepEqual(act(s,{type:'layout_draw',kind:'fence',add:[[0,24,1],[0,26,1]],remove:['r:0:3']},now),{kind:'fence',added:2,removed:1,coins:20});
 assert.equal(s.coins,coins-20);assert.deepEqual(s.layout.stored,{path:1},'the road piece came back as a path tile');assert.equal(s.layout.added[0].turn,1);
 act(s,{type:'layout_draw',kind:'path',add:[[2,24]]},now);assert.equal(s.coins,coins-20,'the stored tile went first');
 assert.throws(()=>act(s,{type:'layout_draw',kind:'path',add:[[2,24]]},now),/something there already/);
 assert.throws(()=>act(s,{type:'layout_draw',kind:'path',add:[[1,24]]},now),/on the grid/);
 assert.throws(()=>act(s,{type:'layout_draw',kind:'oak',add:[[4,24]]},now),/what to draw/);
 assert.throws(()=>act(s,{type:'layout_draw',kind:'path',remove:['r:0:3']},now),/a path that is there/,'a piece goes once');
 act(s,{type:'layout_draw',kind:'flowers',add:[[6,24]],remove:['d0']},now);assert.deepEqual(s.layout.stored,{fence:1});
});

test('buying puts it in your store (Your things); you place it from there',()=>{
 const s=farmAt(5),coins=s.coins;
 assert.deepEqual(act(s,{type:'layout_purchase',kind:'oak'},now),{bought:'oak',count:1,coins:DECOR.oak.coins});
 assert.equal(s.coins,coins-DECOR.oak.coins);assert.deepEqual(s.layout.stored,{oak:1});assert.deepEqual(s.layout.added,[]);
 act(s,{type:'layout_place',kind:'oak',x:4,z:-30},now);assert.equal(s.coins,coins-DECOR.oak.coins,'placing is free');assert.deepEqual(s.layout.stored,{});
 assert.throws(()=>act(s,{type:'layout_purchase',kind:'oak',count:0},now),/how many/);
 const poor=farmAt(5);poor.coins=10;assert.throws(()=>act(poor,{type:'layout_purchase',kind:'bench'},now),/You need 120 coins/);
});

test('a tree or a thing you place turns a quarter at a time, when you place it and when you move it ("Waarom kan je bomen niet rotaten bij plaatsen")',()=>{
 const s=farmAt(5);act(s,{type:'layout_purchase',kind:'bench'},now);
 act(s,{type:'layout_place',kind:'bench',x:4,z:-30,turn:3},now);assert.deepEqual(s.layout.added,[{id:'d0',kind:'bench',x:4,z:-30,turn:3}]);
 act(s,{type:'layout_move',id:'d0',x:5,z:-30,turn:1},now);assert.deepEqual(s.layout.added[0],{id:'d0',kind:'bench',x:5,z:-30,turn:1});
 act(s,{type:'layout_move',id:'d0',x:5,z:-30},now);assert.equal(s.layout.added[0].turn,undefined,'no turn, none kept');
 assert.throws(()=>act(s,{type:'layout_buy',kind:'oak',x:6,z:-30,turn:5},now),/how it stands/);
});

