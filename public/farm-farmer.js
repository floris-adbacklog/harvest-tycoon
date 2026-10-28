import * as THREE from 'three';
import {createFarmer} from './farmer.js';
import {softShadow} from './soft-shadow.js';
import {DEFAULT_FARMER} from './farmer-parts.js';

// Your own farmer, walking on your farm and in the village (20 Oct 2026, the owner: "Doe 2"; phase 1: everyone's farmer is the default
// one until the creator is saved somewhere). A few calm loops round the Farmhouse yard (in World II round the village's farm road),
// standing still between them to breathe, look around or rest; a tap makes them hop. Like the farm's animals (farm-animals.js) it comes
// after the farm is on screen and the page has a quiet moment (the skeleton and the default farmer's parts are about 160 KB), never
// with reduced motion, Save-Data or a 2g line (game.js addFarmer), and only moves while it is in the picture (a phone: every other frame).
// Nothing is saved, counted or earned; a tap on anything else is never taken (game.js asks the farmer last, after the pets).
// Where they walk, in world units. The farm: the open ground across the lane from the Farmhouse, between the dog's and the cat's walks
// and the tractor (tests/farm-farmer.test.mjs keeps every point clear of the yards, the fields, the pond, the pets' walks and the tappable
// things round the Farmhouse, and the harness checked on a phone and a computer that the farmer never stands in front of anything
// that can be tapped). One loop: the spots in order and back to the first.
export const FARM_WALK=Object.freeze({height:1.9,walk:1.05,spots:Object.freeze([[-15.3,-3.4],[-14.4,-2.7],[-13.6,-2],[-14.8,-1.6],[-16,-2.2]])});
// The village (its houses stand 1.8 tall, the deer .72 long): smaller, on the lane through the village and the grass above it, below
// the deer's slope, between a tree, the red house at the bend and the blue house's roof (nothing hides them there), in the middle of a
// computer's first view.
export const VILLAGE_WALK=Object.freeze({height:.95,walk:.5,spots:Object.freeze([[17,-7.6],[16.4,-9.2],[17.6,-9.4],[18.6,-8.2],[18,-8.3]])});
// The farmer joins in (21 Oct 2026, the owner: "Doe alles behalve 9", item 1): after a harvest, a collect at a building or a chore, they
// walk over and stand by it a while, then walk back to their loop. Only to the places below, each a spot checked in the harness on a
// computer's two views (1440 x 900 and Kongregate's 1000 x 620, the camera moved over the place as a player pans there) where they cover
// nothing that can be tapped (no field, building, pin, name, pet or animal behind them) and stand on open ground (no tree, fence or prop
// under their feet), and a way there over open ground and the roads (tests/farm-farmer.test.mjs keeps both clear of the yards, the
// fields, the pond and the pets' walks). The farther places (the Factory, the east and west of the valley) are a walk too long to join.
// at: where they stand; via: the way there from their loop (and back the other way round).
const trip=(at,via=[])=>Object.freeze({at:Object.freeze(at),via:Object.freeze(via.map(p=>Object.freeze(p)))});
// Out of the loop north of the cart beside it; down the lane (south of the tractor) for the fields' west side and the Bakery.
const OUT=[-13.6,-4.4],LANE=[OUT,[-9.6,-4.4],[-9.6,2],[-7.8,3]],TRUNK=[OUT,[-10,-4.4]];
export const FARM_TRIPS=Object.freeze({
 chores:trip([-14.66,-5.7]),
 // The Feed Mill across the main road since 22 Oct 2026 (the Warehouse stands where it was): on the road in front of the cows' pasture,
 // left of the Mill's doors, along the trunk road like the Windmill's.
 mill:trip([4,-5.2],[...TRUNK,[4,-4.4]]),
 bakery:trip([-13.79,10.6],[...LANE,[-7.8,10.6]]),
 dairy:trip([-4.8,-16.86],[OUT,[-7.8,-4.4],[-7.8,-16.86]]),   // by the barn's front corner, behind the pasture's fence (moved back with the barn, 22 Oct 2026)
 pigfarm:trip([-28.49,-3.25],[[-16.2,-5.2],[-27.4,-5.2]]),
 windmill:trip([11.64,-.95],[...TRUNK,[11.64,-4.4]]),
 coop:trip([21.65,-6.1],[...TRUNK,[21.65,-4.4]])
});
// The fields: along the lane on their west side and along the trunk road on their north side; the nearest to the field worked on.
export const FIELD_TRIPS=Object.freeze([
 ...[4.8,9.3,13.05,17.55,22.05,26.55].map(z=>trip([-7,z],[...LANE,[-7.8,z]])),
 ...[.85,3.1,6.1].map(x=>trip([x,-2.8],[OUT,[x,-4.4],[x,-3.6]]))
]);
// Beside a building wherever it stands (25 Oct 2026, the owner: "loopt naar de gebouwen bij ophalen batches, meest recente batch loopt
// die heen"): for a building with no checked spot above, or one moved with Move things. They stand next to it along the screen's
// width (the camera looks from +x+z, so (1,-1) runs across the picture), on the side nearer their loop, so they never stand in front of
// it, r beyond its middle; out of their loop, along the main road to it and then across to it.
const ROAD_Z=-4.4,onRoad=([,z])=>Math.abs(z-ROAD_Z)<.01;
export function besideTrip([x,z],r=3.2){
 const k=Math.SQRT1_2*r,a=[x+k,z-k],b=[x-k,z+k],home=[-15,-2.5],at=Math.hypot(a[0]-home[0],a[1]-home[1])<=Math.hypot(b[0]-home[0],b[1]-home[1])?a:b;
 return trip(at,[OUT,[at[0],ROAD_Z]]);
}
// The trip for a place (a building's key, 'chores', or 'fields' with the field's x and z), or null.
export function tripFor(place,[x,z]=[0,0]){
 if(place!=='fields')return Object.hasOwn(FARM_TRIPS,place)?FARM_TRIPS[place]:null;
 return FIELD_TRIPS.reduce((best,t)=>Math.hypot(t.at[0]-x,t.at[1]-z)<Math.hypot(best.at[0]-x,best.at[1]-z)?t:best);
}
// A trip: they walk at TRIP_PACE times their calm pace, stay TRIP_STAY seconds (a little longer with every new action there), and
// go nowhere for TRIP_REST seconds after they are back, so a farmer harvesting all over never sees them zig-zag.
const TRIP_PACE=1.6,TRIP_STAY=[7,10],TRIP_MORE=4,TRIP_STAY_MAX=18,TRIP_REST=20;
// A collect at a building (recent): they go to the newest one at once, also from the middle of another trip or the rest after one.
// The evening (21 Oct 2026, item 3): from 20:00 to 7:00 by the player's own clock they rest on a chair at the edge of their loop (the
// farm's chair_001, the one at the Farmhouse's garden table: that one stands in front of the Farmhouse, which a farmer sitting there
// would hide); in the morning they go back to work. The chair stands on the open ground south of the loop, checked in the harness like
// the trip spots (it and the farmer on it cover nothing that can be tapped, on open ground, clear of the loop, the pets and the trips'
// ways). x, z: the seat; turn: the way the chair (and the farmer on it) faces: to the right of the screen, so they are seen sitting
// (facing the camera a seated farmer looks like a standing one, and hides the chair); height: the chair's.
export const FARM_BENCH=Object.freeze({x:-13.16,z:-.45,turn:Math.PI*3/4,height:.9});
// Your Farm Family on the farm (21 Oct 2026, the owner: "toon alle online players in de fam in farm en village, dus geen 'bezoekjes'
// meer"): every member online now walks on your farm, each round a small calm loop of their own by the Farmhouse yard and the lanes,
// as in the village (VILLAGE_FAMILY_WALKS). Every point of every loop, also on the way between the spots, checked in the harness on a
// phone and a computer's two views (1440 x 900, 1000 x 620), in the home view and with the camera over it, on a level 60 and a level
// 150 farm (family-cover.mjs: they cover nothing that can be tapped, no building, cart, chores, pin or name behind them, nothing hides
// them, open ground under their feet; tests/fixtures/family-farm-cover.json), and kept clear of your own farmer's loop, the evening
// chair, your farmer's trips, the pets' walks, the animals' pens and each other (tests/family-online.test.mjs). The scenery leaves its
// bushes off them (inFarmerWay). The first three are the ones in a phone's first view: a phone shows at most FARM_FAMILY_LITE.
const farmLoop=spots=>Object.freeze({height:FARM_WALK.height,walk:.9,spots:Object.freeze(spots.map(p=>Object.freeze(p)))});
export const FARM_FAMILY_WALKS=Object.freeze([
 // Between the Farmhouse yard and the lane, south of the cart and east of the chores.
 farmLoop([[-9.5,-10.3],[-9.6,-9.1],[-10.6,-8.9],[-10.7,-10.3]]),
 // By the lane south of the crossroads, between the evening chair and the Warehouse's corner (22 Oct 2026: it was between the Mill and
 // the fields, where the Warehouse's longer barn and its doors stand now).
 farmLoop([[-11.3,1.4],[-11.2,2.5],[-12,1.9]]),
 // Along the trunk road east of the crossroads, by the cows' pasture fence (two stretches).
 farmLoop([[-5.2,-6],[-3.4,-6.05]]),
 farmLoop([[-1.6,-6],[.4,-6.05]]),
 // West of the Warehouse (the Mill until 22 Oct 2026), by the west road; and across the west road from the Farmhouse.
 // A step nearer the camera since 22 Oct 2026, so the Warehouse's taller barn in front of them never hides them.
 farmLoop([[-23.8,5.8],[-22.6,6.9]]),
 farmLoop([[-27.6,-8.1],[-26.2,-7.6],[-26.5,-8.5]])
]);
// On a phone (lite) at most this many, the ones seen most lately: each farmer is a few skinned meshes more to draw.
export const FARM_FAMILY_LITE=3;
// Who walks where: shown, the members on the screen now (playerId -> their walk's number); list, the members online now in the order
// they are shown (seen most lately first); cap, how many walks there are to fill. The first cap of the list are shown: the others
// leave (gone offline, or pushed out by someone seen more lately), the new ones join on a free walk.
export function familyStage(shown,list,cap){
 const want=(Array.isArray(list)?list:[]).filter(m=>m&&typeof m.playerId==='string').slice(0,Math.max(0,cap)),ids=new Set(want.map(m=>m.playerId));
 const leave=[...shown.keys()].filter(id=>!ids.has(id)),used=new Set([...shown].filter(([id])=>ids.has(id)).map(([,slot])=>slot)),join=[];
 for(const member of want){
  if(shown.has(member.playerId))continue;
  let slot=0;while(used.has(slot))slot++;if(slot>=cap)break;
  used.add(slot);join.push({member,slot});
 }
 return {leave,join};
}
// Where the farm's scenery leaves room for your farmer (21 Oct 2026, QA): its bushes, sunflowers and tufts come from a seeded list
// (scenery.js) that knows nothing of the farmer, and on a computer two bushes stood on the loop and a third beside it, so the farmer
// walked through them. scenery.js asks this of every piece (x, z and how far it reaches round) and leaves out one in the way: of the
// loop (each spot to the next), of the evening chair and the spot in front of it where they stand up, and of the trips' spots. Since
// 21 Oct 2026 also the family's loops (FARM_FAMILY_WALKS): on every farm the farmer walks, family or not, so the scenery stands the
// same every time the farm opens.
const FARMER_ROOM=.35,toSegment=(x,z,[ax,az],[bx,bz])=>{const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;return Math.hypot(x-ax-t*dx,z-az-t*dz);};
// The family's loops as segments, each spot to the next.
export const familyWays=()=>FARM_FAMILY_WALKS.flatMap(({spots})=>spots.map((p,i)=>[p,spots[(i+1)%spots.length]]));
let farmerWays=null;
export function inFarmerWay(x,z,r){
 if(!farmerWays){
  const loop=FARM_WALK.spots,front=[FARM_BENCH.x+Math.sin(FARM_BENCH.turn)*.7,FARM_BENCH.z+Math.cos(FARM_BENCH.turn)*.7];
  farmerWays=[...loop.map((p,i)=>[p,loop[(i+1)%loop.length]]),[[FARM_BENCH.x,FARM_BENCH.z],front],...[...Object.values(FARM_TRIPS),...FIELD_TRIPS].map(t=>[t.at,t.at]),...familyWays()];
 }
 return farmerWays.some(([a,b])=>toSegment(x,z,a,b)<r+FARMER_ROOM);
}
export const EVENING_FROM=20,MORNING_AT=7;
export const isEvening=(date=new Date())=>{const h=date.getHours();return h>=EVENING_FROM||h<MORNING_AT;};
// The family's farmers in the village (21 Oct 2026, item 5): up to six members of your Farm Family walk there too, each in their own
// look, each round a small loop of their own: in the village's units like VILLAGE_WALK, on the grass and lanes between the Pier, the
// Village Fields, the canteen and the lumber camp, checked in the harness on a phone and a computer's two views (nobody covers a
// place, a pin, a name or the deer; open ground under their feet, also on the way between the spots), 4 away from every place, off
// the Village Fields, clear of the deer and of your own farmer's loop.
const villageLoop=spots=>Object.freeze({height:VILLAGE_WALK.height,walk:VILLAGE_WALK.walk,spots:Object.freeze(spots.map(p=>Object.freeze(p)))});
export const VILLAGE_FAMILY_WALKS=Object.freeze([
 villageLoop([[11,-6],[12,-6],[11.5,-5.5]]),villageLoop([[18.5,-5],[19.5,-4],[19,-4.5]]),villageLoop([[19,-2],[20,-1.5],[19,-1]]),
 villageLoop([[9,-9.5],[9.5,-8.5],[9,-8]]),villageLoop([[9.5,1],[10.5,2],[10,.5]]),villageLoop([[20,6],[21,5.5],[20.5,5]])
]);
// How long they stand at a spot (seconds), and what they do there: breathe, look around or rest on one leg.
const REST=[4,10],STILL={idle:.45,look:.35,relaxed:.2};
const TURN=3,FADE=.4,HOP_TIME=.45,HOP_UP=.14,MOVED_RECENTLY=250,LANDED_WAIT=1500;
// A celebration (21 Oct 2026, item 2: a level-up or an event won): two happy hops, a little higher than a tap's.
const CHEER_HOPS=2,CHEER_UP=.18;
const turnOf=(from,to)=>((to-from+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
const turnTowards=(from,to,step)=>{const d=turnOf(from,to);return Math.abs(d)<=step?from+d:from+Math.sign(d)*step;};
const choose=(odds,random)=>{let r=random()*Object.values(odds).reduce((a,b)=>a+b,0);for(const [k,w] of Object.entries(odds)){r-=w;if(r<=0)return k;}return 'idle';};
// For the screenshot harness: every page's walker (where it stands on the screen, to tap it).
export const FARM_WALKERS=new Set();
// scene: the farm's or the village's; walk: FARM_WALK or VILLAGE_WALK; ground(x, z): the height there; lite: phones (every other frame).
// trips: whether they join in (the farm on a computer: game.js addFarmer; never on a phone, in lite mode or in the village). bench: the
// farm's chair (FARM_BENCH, game.js places the model) for the evening, or null (the village); clock: the time now (the harness's).
// name: 'your-farmer', or 'family-farmer' for a member's in the village; family: the family shirt's {shirt, emblem} (farmer.js).
// appear: a family member come online while the farm is open fades in where they stand (leave() fades them out again).
// tag: on a touch screen the farmer's name over their head (game.js farmerTag: a span in the pins' layer; with a mouse the name is
// the hover tooltip instead); blockers(): the pins and names it gives way to.
export async function createFarmWalker({scene,walk=FARM_WALK,ground=()=>0,lite=false,config=DEFAULT_FARMER,random=Math.random,trips=false,bench=null,clock=()=>new Date(),name='your-farmer',family=null,appear=false,tag=null,blockers=()=>[]}){
 const farmer=await createFarmer(config,{height:walk.height,family,shadow:false});
 const root=farmer.root,{actions,mixer}=farmer;root.name=name;
 for(const name of ['walk','idle','look','relaxed','sit'])actions[name]?.setLoop(THREE.LoopRepeat,Infinity);
 // The walk cycle covers 1.48 m of the pack's 1.83 m farmer: played at the speed that keeps the feet from sliding.
 const walkPace=actions.walk?walk.walk/(1.48*walk.height/1.83/actions.walk.getClip().duration):1;
 if(actions.walk)actions.walk.timeScale=walkPace;
 actions.hop?.setLoop(THREE.LoopOnce,1);if(actions.hop)actions.hop.clampWhenFinished=true;
 root.add(softShadow(walk.height*.55));
 // The tap target: a box round the farmer, a little bigger, so a phone's finger finds them. Never drawn.
 const hit=new THREE.Mesh(new THREE.BoxGeometry(walk.height*.5,walk.height*1.05,walk.height*.5),new THREE.MeshBasicMaterial({visible:false}));
 hit.position.y=walk.height*.52;hit.userData.farmer=true;root.add(hit);
 const spots=walk.spots,start=Math.floor(random()*spots.length);
 root.position.set(spots[start][0],ground(spots[start][0],spots[start][1]),spots[start][1]);scene.add(root);
 const me={spot:start,target:null,rest:REST[0]*random(),yaw:Math.PI/4,face:Math.PI/4,state:'idle',current:null,hopping:0,hops:1,hopUp:HOP_UP,gesture:0,trip:null,tripDone:-Infinity,clock:0};
 const frustum=new THREE.Frustum(),matrix=new THREE.Matrix4(),sphere=new THREE.Sphere();let frame=0,wait=0,seenBy=null;
 function play(name,fade=FADE){
  const next=actions[name];if(!next||next===me.current)return;
  next.reset().play();if(me.current)me.current.crossFadeTo(next,fade,false);me.current=next;me.state=name;
 }
 play('idle');mixer.update(random()*3);
 // The evening: they rest on the bench (at once when the farm opens in the evening), and get up in the morning. Looked at every
 // EVENING_CHECK seconds of play. me.away: 'going' (on their way to it) or 'sitting'.
 const EVENING_CHECK=5,front=bench?[bench.x+Math.sin(bench.turn)*.7,bench.z+Math.cos(bench.turn)*.7]:null;
 let checked=0;
 function sitDown(){me.away='sitting';me.target=null;root.position.set(bench.x,ground(bench.x,bench.z),bench.z);me.yaw=me.face=bench.turn;root.rotation.y=me.yaw;play('sit',.3);}
 function getUp(){me.away=null;root.position.set(front[0],ground(front[0],front[1]),front[1]);play('idle',.3);rest();}
 function evening(){
  if(!bench||!actions.sit)return;
  const late=isEvening(clock());
  if(late&&!me.away&&!me.trip&&me.hopping<=0){me.away='going';me.target=front;}
  else if(!late&&me.away==='sitting')getUp();
  else if(!late&&me.away==='going'){me.away=null;rest();}
 }
 if(bench&&actions.sit&&isEvening(clock()))sitDown();
 // Facing the camera a little (it looks from +x, +z) while standing; the next spot of the loop when the rest is over.
 function rest(){
  // On a trip a pause (after a hop) is short, and the stay keeps the time it had left.
  if(me.trip){me.target=null;if(me.trip.leg!=='stay')me.rest=.5;play(me.trip.leg==='stay'?'look':'idle');return;}
  me.target=null;me.rest=REST[0]+random()*(REST[1]-REST[0]);me.face=Math.PI/4+(random()-.5)*1.2;play(choose(STILL,random));}
 function step(dt){
  const at=root.position;
  if((checked+=dt)>=EVENING_CHECK){checked=0;evening();}
  if(me.away==='sitting')return;
  // A gesture (My farmer's Wave, Cheer or Dance): they stand and do it once, facing you, then breathe again.
  if(me.gesture>0){me.yaw=turnTowards(me.yaw,Math.PI/4,TURN*dt);root.rotation.y=me.yaw;if((me.gesture-=dt)<=0)play('idle',.3);return;}
  if(me.hopping>0){
   // The hop (21 Oct 2026, the owner: the pack's jump, made small, sank into the ground: its legs still tucked a full jump's worth):
   // the whole farmer goes up and down once, standing as they are; the ground is never crossed.
   me.hopping=Math.max(0,me.hopping-dt);at.y=ground(at.x,at.z)+Math.sin(Math.PI*(1-me.hopping/HOP_TIME))*me.hopUp*walk.height;
   // A celebration's next hop follows straight on.
   if(me.hopping<=0&&me.hops>1){me.hops--;me.hopping=HOP_TIME;at.y=ground(at.x,at.z);}
   if(me.hopping<=0){at.y=ground(at.x,at.z);rest();me.landed?.();me.landed=null;}
  }
  else if(me.target){
   const dx=me.target[0]-at.x,dz=me.target[1]-at.z,d=Math.hypot(dx,dz),want=Math.atan2(dx,dz);
   if(d<.05){if(me.trip)tripStep();else if(me.away==='going')sitDown();else rest();}
   else{
    me.yaw=turnTowards(me.yaw,want,TURN*(me.trip?1.6:1)*dt);
    // It turns first, then walks: no sliding sideways. On a trip a brisker step (the walk played faster to match).
    const pace=me.trip?TRIP_PACE:1;if(actions.walk)actions.walk.timeScale=walkPace*pace;
    if(Math.abs(turnOf(me.yaw,want))<.5){play('walk');const s=Math.min(d,walk.walk*pace*dt);at.x+=dx/d*s;at.z+=dz/d*s;at.y=ground(at.x,at.z);}
   }
  }else{
   me.yaw=turnTowards(me.yaw,me.face,TURN*.4*dt);
   if((me.rest-=dt)<=0){if(me.trip)tripStep();else{me.spot=(me.spot+1)%spots.length;me.target=spots[me.spot];}}
  }
  root.rotation.y=me.yaw;
 }
 // A trip, one waypoint at a time: there (way), the stay (stay), and back to the loop's nearest spot (home).
 function tripStep(){
  const t=me.trip;
  if(t.leg==='way'||t.leg==='home'){
   if(t.i<t.path.length){me.target=t.path[t.i++];return;}
   if(t.leg==='home'){me.trip=null;me.tripDone=me.clock;rest();return;}
   // Arrived: they face what they came for and stand there a while.
   t.leg='stay';me.target=null;me.rest=t.stay;me.face=Math.atan2(t.look[0]-root.position.x,t.look[1]-root.position.z);play(choose({idle:.6,look:.4},random));return;
  }
  // The stay is over: back the way they came, to the loop's nearest spot.
  const near=spots.reduce((best,p,i)=>Math.hypot(p[0]-t.from[0],p[1]-t.from[1])<Math.hypot(spots[best][0]-t.from[0],spots[best][1]-t.from[1])?i:best,0);
  me.spot=near;t.leg='home';t.i=0;t.path=[...t.trip.via].reverse().concat([spots[near]]);tripStep();
 }
 const shown=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
 // A spot on the farm is in the picture (as the camera saw it last).
 const inView=([x,z])=>{if(!seenBy)return false;const p=new THREE.Vector3(x,walk.height/2,z).project(seenBy);return Math.abs(p.x)<.95&&Math.abs(p.y)<.95;};
 // One frame (dt in seconds; game.js caps it): only while in the picture, a phone at every other frame (with that frame's time too).
 function animate(dt,camera){
  frame++;wait+=dt;seenBy=camera;
  if(lite&&frame%2)return;
  // The name follows them at the frames they are moved at (a phone: every other one): one point projected, the page only moves it.
  if(tag)placeTag(camera);
  const t=Math.min(wait,.2);wait=0;
  if(!shown(root))return;
  matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
  sphere.center.copy(root.position);sphere.center.y+=walk.height/2;sphere.radius=walk.height;
  // Off the picture they stand still, unless on a trip: then they keep walking (only where they are, not their arms and legs).
  if(!frustum.intersectsSphere(sphere)){
   // A fade out of the picture: done at once (no one waits to see it).
   if(fade)fadeBy(Infinity);
   if(me.trip){me.clock+=t;step(t);}return;}
  me.clock+=t;me.steppedAt=performance.now();if(fade)fadeBy(t);step(t);mixer.update(t);
 }
 // A trip to a place (tripFor's): look, the x and z they face once there (the building or the field). Only on the farm on a computer
 // (trips), while they are walking their loop or resting in it (not hopping), the place's spot in the picture, and TRIP_REST seconds
 // after the last trip ended. A new action at the place they stand at keeps them there a little longer. True when they go (or stay).
 function goTo(place,look,{recent=false}={}){
  if(!trips||!place||me.hopping>0||me.away)return false;
  const same=me.trip&&me.trip.trip.at[0]===place.at[0]&&me.trip.trip.at[1]===place.at[1];
  if(me.trip&&same){if(me.trip.leg==='stay'){me.rest=Math.min(TRIP_STAY_MAX,me.rest+TRIP_MORE);return true;}if(me.trip.leg==='way')return true;}
  if(me.trip&&!recent)return false;
  if((!recent&&me.clock-me.tripDone<TRIP_REST)||!inView(place.at))return false;
  me.trip=me.trip?{...me.trip,trip:place,leg:'way',i:0,path:[...backToRoad(me.trip),...fromRoad(place.via),place.at],look}
   :{trip:place,leg:'way',i:0,path:[...place.via,place.at],from:[root.position.x,root.position.z],look,stay:TRIP_STAY[0]+random()*(TRIP_STAY[1]-TRIP_STAY[0])};
  tripStep();return true;
 }
 // From the middle of another trip to the newest place: back the way they came as far as the main road (nothing when they are on it),
 // then along the road to where the new place's way leaves it, so they never cut across a yard or the fields, nor walk back first.
 function backToRoad(t){
  if(Math.abs(root.position.z-ROAD_Z)<.5)return [];
  const now=Math.max(t.i-1,0);   // the point they are walking to
  if(t.leg==='home'){const k=t.path.findIndex((p,j)=>j>=now&&onRoad(p));return k<0?[]:t.path.slice(now,k+1);}
  const came=(t.leg==='stay'?t.path.slice(0,-1):t.path.slice(0,now)).reverse(),k=came.findIndex(onRoad);return k<0?[]:came.slice(0,k+1);
 }
 const fromRoad=via=>{const k=via.findLastIndex(onRoad);return k<0?via:via.slice(k);};

 // A tap that found nothing else (game.js pointerTarget): true when it was the farmer.
 const pick=raycaster=>raycaster.intersectObject(hit,false).length>0;
 // A tap: they stop, turn to you and hop once, then stand a while before walking on. Returns a promise that settles when they are back on
 // the ground (the owner, 21 Oct 2026: "wacht met profiel open als die klaar is met springen"), counted in the frames they are moved
 // in, so a phone's every other frame lands as late as it looks. A farmer that is not being moved (off the screen, the farm resting
 // under a window) does not hop: it settles at once. LANDED_WAIT is only a safety net for a page that stops drawing mid-hop.
 function react(){
  // On the bench they stay seated (no hop from a chair): the profile opens at once. On their way to it: the hop, then the bench again.
  if(me.away==='sitting')return Promise.resolve();
  if(me.away==='going')me.away=null;
  // On their way somewhere: the waypoint they were walking to is taken again after the hop.
  if(me.trip&&me.trip.leg!=='stay')me.trip.i=Math.max(0,me.trip.i-1);
  me.target=null;me.yaw=me.face=Math.PI/4;root.rotation.y=me.yaw;play('idle');me.gesture=0;
  me.landed?.();me.landed=null;me.hops=1;me.hopUp=HOP_UP;
  if(!(performance.now()-(me.steppedAt??-Infinity)<MOVED_RECENTLY)){at0();return Promise.resolve();}
  me.hopping=HOP_TIME;
  return new Promise(done=>{const timer=setTimeout(()=>{me.landed=null;done();},LANDED_WAIT);me.landed=()=>{clearTimeout(timer);done();};});
 }
 // A celebration (a level-up, an event won): they stop, turn to you and hop twice. Returns where to throw a little confetti (just over
 // their head), or null when they are not in the picture (or not there: resting on the bench in the evening) and nothing happens.
 function celebrate(){
  if(me.away||me.hopping>0||!(performance.now()-(me.steppedAt??-Infinity)<MOVED_RECENTLY))return null;
  if(me.trip&&me.trip.leg!=='stay')me.trip.i=Math.max(0,me.trip.i-1);
  me.target=null;me.yaw=me.face=Math.PI/4;root.rotation.y=me.yaw;play('idle');
  me.hops=CHEER_HOPS;me.hopUp=CHEER_UP;me.hopping=HOP_TIME;me.gesture=0;
  // Both arms up while they hop (the Cheer gesture, once), where the rig has it.
  if(actions.cheer){actions.cheer.setLoop(THREE.LoopOnce,1);actions.cheer.clampWhenFinished=true;play('cheer',.15);}
  return [root.position.x,root.position.y+walk.height*1.1,root.position.z];
 }
 // A gesture once (item 4: chosen in My farmer, played here when it closes): 'wave', 'cheer' or 'dance'. Not on the bench, not mid-hop.
 function gesture(name){
  const a=['wave','cheer','dance'].includes(name)?actions[name]:null;
  if(!a||me.away||me.hopping>0)return false;
  if(me.trip&&me.trip.leg!=='stay')me.trip.i=Math.max(0,me.trip.i-1);
  me.target=null;a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;play(name,.25);me.gesture=a.getClip().duration;return true;
 }
 // The share picture (21 Oct 2026, item 7: "Share my farm" shows your farmer standing in the scene): for the moment of the photo they
 // stand facing you in the idle's first pose, where they are when that is in the picture, else on the first spot of their loop or a
 // trip's that is (all checked to cover nothing; inFrame([x, z]) says what the photo shows); from the evening chair they stand up in
 // front of it. Returns a function that puts everything back as it was, or null when no spot is in the picture (no farmer then).
 function photo(inFrame){
  const was={x:root.position.x,y:root.position.y,z:root.position.z,yaw:root.rotation.y,state:me.state};
  let at=me.away==='sitting'&&front?front:[root.position.x,root.position.z];
  if(!inFrame(at)){at=[...spots,...Object.values(FARM_TRIPS).map(t=>t.at),...FIELD_TRIPS.map(t=>t.at)].find(p=>inFrame(p));if(!at||walk!==FARM_WALK)return null;}
  root.position.set(at[0],ground(at[0],at[1]),at[1]);root.rotation.y=Math.PI/4;
  mixer.stopAllAction();actions.idle?.reset().play();mixer.update(0);root.updateMatrixWorld(true);
  return ()=>{root.position.set(was.x,was.y,was.z);root.rotation.y=was.yaw;mixer.stopAllAction();me.current=null;play(was.state in actions?was.state:'idle',0);mixer.update(0);};
 }
 const at0=()=>{me.hopping=0;root.position.y=ground(root.position.x,root.position.z);};
 // Coming and going (a family member come online, gone offline): they fade in where they stand, and out again, over FADE_TIME
 // seconds of their own frames. The fade: their own copies of the farmer's materials (shared by every farmer otherwise), made only
 // for a fade and given back when it is over, so their look never needs another shader; at full strength they look as anyone's.
 const FADE_TIME=.8,faded=[];let fade=null,leaving=null;
 function setAlpha(a){
  const alpha=Math.max(0,Math.min(1,a));
  if(!faded.length&&alpha<1)root.traverse(n=>{if(!n.isMesh||n===hit||Array.isArray(n.material))return;const m=n.material.clone();m.transparent=true;m.userData.full=n.material.opacity??1;m.userData.shared=n.material;n.material=m;faded.push(m);});
  for(const m of faded)m.opacity=m.userData.full*alpha;
  if(tag)tag.style.opacity=alpha<1?String(alpha):'';
 }
 // Back to the shared materials once they are there in full.
 function solid(){root.traverse(n=>{const m=n.material;if(n.isMesh&&faded.includes(m))n.material=m.userData.shared;});for(const m of faded)m.dispose();faded.length=0;if(tag)tag.style.opacity='';}
 function fadeBy(dt){
  fade.t=Math.min(FADE_TIME,fade.t+dt);const k=fade.t/FADE_TIME;setAlpha(fade.to?k:1-k);
  if(fade.t<FADE_TIME)return;
  const to=fade.to;fade=null;if(to)solid();else gone();
 }
 function gone(){me.target=null;root.visible=false;if(tag)tag.hidden=true;const done=leaving;leaving=null;done?.();}
 if(appear){setAlpha(0);fade={to:1,t:0};}
 // Off they go (gone offline): a fade where they stand; at once when they are not being moved (off the screen, the page hidden).
 function leave(){
  if(leaving)return leaving.promise;
  if(!root.visible)return Promise.resolve();
  let done;const promise=new Promise(r=>{done=r;});leaving=Object.assign(()=>done(),{promise});
  if(!(performance.now()-(me.steppedAt??-Infinity)<MOVED_RECENTLY)){setAlpha(0);gone();}
  else{const shownNow=fade?(fade.to?fade.t/FADE_TIME:1-fade.t/FADE_TIME):1;fade={to:0,t:(1-shownNow)*FADE_TIME};me.gesture=0;}
  return promise;
 }
 // The name over their head (touch screens): the head's point projected, hidden off the picture (or when they are not shown); a pin
 // or a name it touches wins (looked at a few times a second: the name fades back, farm-farmer.css .farmer-name.yield).
 let tagX=NaN,tagY=NaN,tagFrame=0,size=null;
 const head=new THREE.Vector3();
 function placeTag(camera){
  if(!shown(root)){if(!tag.hidden)tag.hidden=true;return;}
  if(!size||tagFrame%60===0){const box=tag.parentElement;size=box?[box.clientWidth,box.clientHeight]:[0,0];}
  head.copy(root.position);head.y+=walk.height*1.12;head.project(camera);
  const off=Math.abs(head.x)>1||Math.abs(head.y)>1||head.z>1;
  if(off!==tag.hidden)tag.hidden=off;
  tagFrame++;if(off)return;
  const x=Math.round((head.x*.5+.5)*size[0]),y=Math.round((-head.y*.5+.5)*size[1]);
  if(x!==tagX||y!==tagY){tagX=x;tagY=y;tag.style.transform=`translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;}
  if(tagFrame%12===0){const r=tag.getBoundingClientRect();tag.classList.toggle('yield',blockers().some(b=>{if(b===tag||b.hidden)return false;const q=b.getBoundingClientRect();return q.width>0&&q.left<r.right&&q.right>r.left&&q.top<r.bottom&&q.bottom>r.top;}));}
 }
 // Where the farmer stands on the screen, -1 to 1 across and up (as the camera saw it last), and what they are doing.
 const where=()=>{if(!seenBy)return null;const p=root.position.clone();p.y+=walk.height*.5;p.project(seenBy);return {x:p.x,y:p.y,state:me.state,world:[root.position.x,root.position.z]};};
 const result={farmer,root,hit,ground,animate,pick,react,where,visit:goTo,leave,celebrate,gesture,photo,tag,trip:()=>me.trip&&{leg:me.trip.leg,at:me.trip.trip.at,via:me.trip.trip.via},fading:()=>fade&&(fade.to?'in':'out'),camera:()=>seenBy,
  dispose(){if(faded.length)solid();farmer.dispose();root.traverse(n=>{if(n.isMesh&&!n.isSkinnedMesh){n.geometry.dispose();n.material.map?.dispose();n.material.dispose();}});tag?.remove();FARM_WALKERS.delete(result);}};
 FARM_WALKERS.add(result);return result;
}
