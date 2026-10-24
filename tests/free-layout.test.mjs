// Your own farm layout (24 Oct 2026, the owner: "Doe optie 2"): move every yard and field on World 1, land that opens by level, trees,
// bushes and rocks you clear for coins, and trees and path tiles you buy and store (game/farm-map.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,xpForLevel,NO_EVENT_ACTIONS} from '../game/farm-state.js';
import {LAYOUT_YARDS,FIXED_YARDS,LAND,WATER,DECOR,landOpen,landAt,clearCost,obstacleKind,LAYOUT_GRID} from '../game/farm-map.js';
import {ANCHORS,pondBounds} from '../public/farm-layout.js';
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

test('clearing: a tree, bush or rock on open land for coins and a little XP, once; further out costs more',()=>{
 assert.equal(obstacleKind('tree_004'),'tree');assert.equal(obstacleKind('fir_tree_001'),'tree');assert.equal(obstacleKind('bush_001'),'bush');assert.equal(obstacleKind('stone_002'),'rock');assert.equal(obstacleKind('grass_001'),null);
 assert.deepEqual(clearCost('o:tree_001:100:-50'),{kind:'tree',land:'middle',coins:120,xp:4});
 assert.ok(clearCost('o:tree_001:550:0').coins>clearCost('o:tree_001:100:0').coins,'the east costs more than the middle');
 assert.equal(clearCost('o:grass_001:0:0'),null);assert.equal(clearCost('nope'),null);
 const s=farmAt(5),coins=s.coins,xp=s.xp;
 assert.deepEqual(act(s,{type:'layout_clear',id:'o:tree_001:100:-50'},now),{cleared:'o:tree_001:100:-50',kind:'tree',coins:120,xp:4});
 assert.equal(s.coins,coins-120);assert.equal(s.xp,xp+4);assert.deepEqual(s.layout.cleared,['o:tree_001:100:-50']);assert.equal(s.stats.cleared,1);
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
 assert.deepEqual(s.layout,{v:1,at:{bakery:[1,2],mill:[3,4,2],coop:[3,4]},cleared:['o:tree_001:1:1'],added:[{id:'d4',kind:'oak',x:1,z:2}],stored:{oak:2},n:5});
 assert.match(read('scripts/sync-game.mjs'),/game\/farm-map\.js/);
 assert.equal(read('public/farm-map.js'),read('game/farm-map.js'));assert.equal(read('supabase/functions/farm-api/farm-map.js'),read('game/farm-map.js'));
});
