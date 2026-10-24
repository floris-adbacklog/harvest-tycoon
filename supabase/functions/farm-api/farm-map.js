// Your own farm layout (24 Oct 2026, the owner: "dat alles gewoon een grasveld is en je zelf bomen, roads, velden en gebouwen kan
// plaatsen, alleen het water staat vast"; then "Doe optie 2"). On World 1 you move every yard (a building with its pens, fences and
// props, as farm-layout.js builds it) and every field; the land around the farm opens by level, with trees, bushes and rocks on it
// that you clear for coins; and you buy trees and path tiles for coins and store them again. A new farm starts as the farm stands
// today, and nothing changes until you move something.
// The rules here are what the server can check by itself: which things can move, which land is open at your level, the water, the
// prices and what is saved (state.layout). Whether two things overlap is checked on the screen, from the real 3D pieces (game.js):
// the server does not know their shapes, and a farm that overlapped its own buildings would only look odd to itself.
// Copied beside farm-state.js (scripts/sync-game.mjs): game/, public/ and farm-api.

// Moved and placed things stand on a half-step grid (world units).
export const LAYOUT_GRID=.5;
// What stays where it is: the pond (the water) and the farmhouse (the camera's home and where the farmer starts out).
export const FIXED_YARDS=Object.freeze(['farmhouse','pond']);
// Every yard that moves as one piece (farm-layout.js ANCHORS without the fixed ones; tests/free-layout checks they match).
export const LAYOUT_YARDS=Object.freeze(['dairy','silo','familyhall','preserves','juicepress','greenhouse','packing','coop','paddock','windmill',
 'tractor','cart','factory','chores','stall','mill','bakery','kitchen','apiary','workshop','beeyard','sheepbarn','glasshouse','weaving',
 'goatshed','craftshop','ranch','valleymarket','tradedepot','estateworkshop','grandfair','pigfarm','warehouse']);
// The land, piece by piece, as world boxes [minX, maxX, minZ, maxZ], each open from its level (the valley by level of 25 Sep 2026:
// the middle from the start, the west at 25, the east at 50, then the edges beyond).
export const LAND=Object.freeze([
 {id:'middle',level:1,box:[-38,34,-46,44]},
 {id:'north',level:15,box:[-38,34,-58,-46]},
 {id:'west',level:25,box:[-56,-38,-46,44]},
 {id:'south',level:35,box:[-38,34,44,56]},
 {id:'east',level:50,box:[34,70,-46,44]},
 {id:'westedge',level:60,box:[-56,-38,-58,-46]},
 {id:'westsouth',level:60,box:[-56,-38,44,56]},
 {id:'eastedge',level:75,box:[34,70,-58,-46]},
 {id:'eastsouth',level:75,box:[34,70,44,56]}
].map(piece=>Object.freeze({...piece,box:Object.freeze(piece.box)})));
// The water: the pond's box with its bank (farm-layout.js pondBounds()).
export const WATER=Object.freeze([Object.freeze([16.88,34.48,9.36,20.56])]);
// What clearing costs: coins and XP by kind, times the land's own factor (further out costs more).
export const OBSTACLES=Object.freeze({tree:Object.freeze({coins:120,xp:4}),bush:Object.freeze({coins:40,xp:2}),rock:Object.freeze({coins:160,xp:5})});
const LAND_FACTOR=Object.freeze({middle:1,north:1.5,west:2,south:2.5,east:4,westedge:5,westsouth:5,eastedge:7,eastsouth:7});
// What you can buy and place: path tiles and trees (the model each one shows is chosen on the screen).
export const DECOR=Object.freeze({
 path:Object.freeze({name:'Path tile',coins:20}),
 oak:Object.freeze({name:'Oak tree',coins:250}),
 pine:Object.freeze({name:'Pine tree',coins:250}),
 birch:Object.freeze({name:'Young tree',coins:150}),
 shrub:Object.freeze({name:'Bush',coins:60})
});
const MAX_CLEARED=3000,MAX_ADDED=600;
const onGrid=v=>Number.isFinite(v)&&Math.abs(v/LAYOUT_GRID-Math.round(v/LAYOUT_GRID))<1e-6;
const inBox=([minX,maxX,minZ,maxZ],x,z)=>x>=minX&&x<=maxX&&z>=minZ&&z<=maxZ;
// The piece of land a point is on (or null, off the map), and whether it is open at this level.
export const landAt=(x,z)=>LAND.find(piece=>inBox(piece.box,x,z))??null;
export function landOpen(level,x,z){const piece=landAt(x,z);return Boolean(piece&&level>=piece.level);}
export const inWater=(x,z)=>WATER.some(box=>inBox(box,x,z));
// Every land piece and whether it is open, for the screen.
export const landPieces=level=>LAND.map(piece=>({...piece,open:level>=piece.level}));

// A saved state.layout as the rules expect it. A farm that never moved anything has none.
export function normalizeLayout(state){
 const l=state.layout;if(l===undefined)return;
 if(!l||typeof l!=='object'||Array.isArray(l)){delete state.layout;return;}
 const at={};
 // A yard's spot can carry its quarter turns (0-3, rotated a quarter at a time round its own anchor; 24 Oct 2026, the owner: "Rotate building maybe?").
 for(const [id,spot] of Object.entries(l.at&&typeof l.at==='object'?l.at:{}))if(movableId(state,id,l)&&Array.isArray(spot)&&(spot.length===2||spot.length===3)&&spot.slice(0,2).every(Number.isFinite))at[id]=validTurn(spot[2])&&spot[2]?[spot[0],spot[1],spot[2]]:[spot[0],spot[1]];
 const cleared=[...new Set((Array.isArray(l.cleared)?l.cleared:[]).filter(obstacleId))].slice(-MAX_CLEARED);
 const added=(Array.isArray(l.added)?l.added:[]).filter(d=>d&&typeof d.id==='string'&&/^d\d+$/.test(d.id)&&Object.hasOwn(DECOR,d.kind)&&Number.isFinite(d.x)&&Number.isFinite(d.z)).map(d=>({id:d.id,kind:d.kind,x:d.x,z:d.z})).slice(0,MAX_ADDED);
 const stored=Object.fromEntries(Object.keys(DECOR).filter(k=>Number.isSafeInteger(l.stored?.[k])&&l.stored[k]>0).map(k=>[k,l.stored[k]]));
 const n=Number.isSafeInteger(l.n)&&l.n>=0?l.n:added.reduce((m,d)=>Math.max(m,Number(d.id.slice(1))+1),0);
 state.layout={v:1,at,cleared,added,stored,n};
}
const emptyLayout=()=>({v:1,at:{},cleared:[],added:[],stored:{},n:0});
const validTurn=turn=>Number.isInteger(turn)&&turn>=0&&turn<=3;
function layoutOf(state){state.layout??=emptyLayout();return state.layout;}
// A thing that can move: a yard, a field (by its id) or a tree or path tile you placed.
function movableId(state,id,layout=state.layout){
 if(typeof id!=='string')return false;
 if(LAYOUT_YARDS.includes(id))return true;
 const field=/^field:(\d+)$/.exec(id);if(field)return Number(field[1])<(state.plots?.length??0);
 return /^d\d+$/.test(id)&&Boolean(layout?.added?.some?.(d=>d.id===id));
}
// An obstacle's id is made on the screen from what it is and where it stands: o:<model>:<x×10>:<z×10>.
const OBSTACLE_ID=/^o:([a-z0-9_]{1,24}):(-?\d{1,4}):(-?\d{1,4})$/;
const obstacleId=id=>typeof id==='string'&&OBSTACLE_ID.test(id);
export function obstacleKind(model){
 if(/^(fir_)?tree_/.test(model))return 'tree';
 if(/^(bush|hedge|plant)_/.test(model))return 'bush';
 if(/^(stone|rock|stump|log|boulder)_\d/.test(model))return 'rock';   // not a stone fence
 return null;
}
// What clearing an obstacle costs, from its id (its kind and its land).
export function clearCost(id){
 const m=OBSTACLE_ID.exec(id??'');if(!m)return null;
 const kind=obstacleKind(m[1]),piece=landAt(Number(m[2])/10,Number(m[3])/10);if(!kind||!piece)return null;
 const factor=LAND_FACTOR[piece.id]??1;
 return {kind,land:piece.id,coins:Math.round(OBSTACLES[kind].coins*factor/10)*10,xp:Math.round(OBSTACLES[kind].xp*Math.sqrt(factor))};
}
function checkSpot(level,x,z){
 if(!onGrid(x)||!onGrid(z))throw new Error('Choose a spot on the farm.');
 if(!landAt(x,z))throw new Error('That is off your farm.');
 if(!landOpen(level,x,z))throw new Error(`This land opens at level ${landAt(x,z).level}.`);
 if(inWater(x,z))throw new Error('That is in the pond.');
}
// Moving a yard, a field or a placed tree or tile to a new spot on open land; a yard also turned a quarter at a time (turn 0-3).
export function moveThing(state,id,x,z,level,turn=0){
 if(FIXED_YARDS.includes(id))throw new Error('This stays where it is.');
 if(!movableId(state,id))throw new Error('Choose something to move.');
 if(turn===undefined||turn===null)turn=0;
 if(!validTurn(turn)||turn&&!LAYOUT_YARDS.includes(id))throw new Error('Choose how it stands.');
 checkSpot(level,x,z);
 const layout=layoutOf(state);
 const added=layout.added.find(d=>d.id===id);
 if(added){added.x=x;added.z=z;}else layout.at[id]=turn?[x,z,turn]:[x,z];
 return {moved:id,x,z,turn};
}
// Clearing a tree, bush or rock on open land: gone for good.
export function clearObstacle(state,id,level){
 const cost=clearCost(id);if(!cost)throw new Error('Choose a tree, bush or rock.');
 const m=OBSTACLE_ID.exec(id),x=Number(m[2])/10,z=Number(m[3])/10;
 if(!landOpen(level,x,z))throw new Error(`This land opens at level ${landAt(x,z).level}.`);
 const layout=layoutOf(state);if(layout.cleared.includes(id))throw new Error('That is cleared already.');
 if(state.coins<cost.coins)throw new Error(`You need ${cost.coins} coins.`);
 state.coins-=cost.coins;state.xp+=cost.xp;
 layout.cleared=[...layout.cleared,id].slice(-MAX_CLEARED);
 state.stats.cleared=(state.stats.cleared??0)+1;
 return {cleared:id,kind:cost.kind,coins:cost.coins,xp:cost.xp};
}
// Buying a tree or a path tile and placing it, or placing one you stored.
export function placeDecor(state,kind,x,z,level,{fromStore=false}={}){
 if(!Object.hasOwn(DECOR,kind))throw new Error('Choose a tree or a path tile.');
 checkSpot(level,x,z);
 const layout=layoutOf(state);if(layout.added.length>=MAX_ADDED)throw new Error('Your farm is full of trees and paths.');
 let coins=0;
 if(fromStore){if(!(layout.stored[kind]>0))throw new Error('You have none stored.');layout.stored[kind]-=1;if(!layout.stored[kind])delete layout.stored[kind];}
 else{coins=DECOR[kind].coins;if(state.coins<coins)throw new Error(`You need ${coins} coins.`);state.coins-=coins;}
 const id=`d${layout.n}`;layout.n+=1;layout.added.push({id,kind,x,z});
 return {placed:id,kind,x,z,coins};
}
// Storing a tree or a path tile you placed: it waits to be placed again.
export function storeDecor(state,id){
 const layout=layoutOf(state),i=layout.added.findIndex(d=>d.id===id);if(i<0)throw new Error('Choose a tree or a path tile you placed.');
 const [d]=layout.added.splice(i,1);layout.stored[d.kind]=(layout.stored[d.kind]??0)+1;
 return {stored:id,kind:d.kind};
}
