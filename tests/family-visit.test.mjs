import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as nodeModule from 'node:module';
import {createFamilyVisits,pickVisitor,visitOrder,VISIT_FIRST,VISIT_STAY,VISIT_BREAK,VISIT_RETRY,VISIT_POOL} from '../public/family-visit.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// A family visit on your farm (21 Oct 2026, the owner, option 2: "Now and then a family member visits your farm: one at a time,
// preferably someone online now, takes a walk by the Farmhouse and leaves after a few minutes. Tap them and their profile opens.").

// A pretend clock for the visits' timers: run() fires the next one, as the page's would.
function clock(){
 const list=[];let id=0,now=0;
 return {now:()=>now,pending:()=>list.length,
  timers:{set:(f,ms)=>{list.push({id:++id,at:now+ms,f});return id;},clear:i=>{const k=list.findIndex(t=>t.id===i);if(k>=0)list.splice(k,1);}},
  async run(){list.sort((a,b)=>a.at-b.at);const t=list.shift();if(!t)return null;const waited=t.at-now;now=t.at;await t.f();await new Promise(r=>setTimeout(r,0));return waited/1000;}};
}
const A={playerId:'a',online:true,daysAway:0},B={playerId:'b',online:true,daysAway:1},C={playerId:'c',online:true,daysAway:5};
function visits({members=[A,B,C],evening=()=>false,busy=()=>false,random=()=>.5}={}){
 const c=clock(),came=[],here=new Set();let most=0;
 const v=createFamilyVisits({members:async()=>members,evening,busy,random,timers:c.timers,
  arrive:async m=>{here.add(m.playerId);most=Math.max(most,here.size);came.push(m.playerId);return {leave:async()=>{here.delete(m.playerId);}};}});
 return {v,c,came,here,most:()=>most};
}

test('who comes: only members online now (the owner, 21 Oct 2026), the ones seen most lately first; the first four take turns, never twice in a row',()=>{
 assert.deepEqual(visitOrder([C,B,A,{playerId:'d'},{playerId:'e',online:false,daysAway:0},null,{name:'x'}]).map(m=>m.playerId),['a','b','c'],'online only, fewest days away first; only members');
 assert.equal(pickVisitor([{playerId:'off',online:false,daysAway:0}]),null,'nobody online: nobody comes');
 const visited=new Map();let last=null;const order=[];
 for(let i=1;i<=6;i++){const m=pickVisitor([C,B,A],visited,last);order.push(m.playerId);visited.set(m.playerId,i);last=m.playerId;}
 assert.deepEqual(order,['a','b','c','a','b','c'],'online first, then rotating');
 // Someone online later in the list still comes first.
 assert.equal(pickVisitor([{playerId:'x',online:false,daysAway:0},{playerId:'y',online:true,daysAway:9}]).playerId,'y');
 // Only the first VISIT_POOL of the order.
 const many=Array.from({length:7},(_,i)=>({playerId:`m${i}`,online:true,daysAway:i}));const seen=new Set();const v2=new Map();let l2=null;
 for(let i=1;i<=12;i++){const m=pickVisitor(many,v2,l2);seen.add(m.playerId);v2.set(m.playerId,i);l2=m.playerId;}
 assert.equal(VISIT_POOL,4);assert.deepEqual([...seen].sort(),['m0','m1','m2','m3']);
 // One other member: always them; nobody: nobody.
 assert.equal(pickVisitor([B],new Map([['b',3]]),'b').playerId,'b');assert.equal(pickVisitor([]),null);assert.equal(pickVisitor(null),null);
});

test('when: a minute or three after the farm is on screen, about three minutes, then four to six minutes without; one at a time',async()=>{
 assert.deepEqual([VISIT_FIRST,VISIT_STAY,VISIT_BREAK,VISIT_RETRY],[[60,180],[150,210],[240,360],[20,40]]);
 const {v,c,came,most,here}=visits({random:()=>0});
 assert.equal(await c.run(),60,'the first visit after a minute (at the earliest)');assert.deepEqual(came,['a']);assert.equal(here.size,1);
 // A visit at once (the harness's visit=1) while one is there: nobody else comes.
 await v.now();await v.now();assert.deepEqual(came,['a']);
 assert.equal(await c.run(),150,'they stay two and a half minutes (at the least)');assert.equal(here.size,0,'gone');
 assert.equal(await c.run(),240,'then a break of four minutes (at the least)');assert.deepEqual(came,['a','b']);
 for(let i=0;i<8;i++)await c.run();
 assert.deepEqual(came,['a','b','c','a','b','c']);assert.equal(most(),1,'never two at once');assert.equal(c.pending(),1,'one timer at a time');
 const late=visits({random:()=>.999});assert.ok(Math.abs(await late.c.run()-180)<.5,'at the latest three minutes');
 await v.stop();assert.equal(c.pending(),0);
});

test('no visits: without a family (or nobody else in it), in the evening, or while the page is busy; they come once it is over',async()=>{
 const alone=visits({members:[]});for(let i=0;i<4;i++)await alone.c.run();assert.deepEqual(alone.came,[],'no family: nobody comes');
 assert.equal(alone.c.pending(),1,'looked at again after a break (a family joined later)');
 let late=true;const evening=visits({evening:()=>late});
 for(let i=0;i<5;i++)await evening.c.run();assert.deepEqual(evening.came,[],'20:00 to 7:00: nobody');
 late=false;await evening.c.run();assert.deepEqual(evening.came,['a'],'in the morning again');
 let busy=true;const b=visits({busy:()=>busy});assert.equal(await b.c.run(),120);assert.deepEqual(b.came,[]);
 busy=false;assert.equal(await b.c.run(),30,'a short wait, then the visit');assert.deepEqual(b.came,['a']);
 // A visitor who cannot come (their farmer failed to load): a break, nobody marked as visited.
 const c=clock(),came=[];const v=createFamilyVisits({members:async()=>[A,B],random:()=>.5,timers:c.timers,arrive:async m=>{came.push(m.playerId);return null;}});
 await c.run();await c.run();assert.deepEqual(came,['a','a']);await v.stop();
 // Stopped while one is there: they leave at once.
 let left=null;const c2=clock();const v2=createFamilyVisits({members:async()=>[A],random:()=>.5,timers:c2.timers,arrive:async()=>({leave:async now=>{left=now;}})});
 await c2.run();await v2.stop();assert.equal(left,true);assert.equal(c2.pending(),0);
});

test('game.js: only on the farm where your farmer walks (not the village, the admin view, reduced motion, Save-Data or 2g), only in a family, a tap opens the profile',()=>{
 const game=read('public/game.js');
 assert.match(game,/function farmerComes\(\)\{const connection=navigator\.connection;return !\(reducedMotion\|\|adminView\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\);\}/);
 assert.match(game,/async function startFamilyVisits\(createFarmWalker,ground\)\{\n try\{\n  if\(villageWorld\|\|!farmerComes\(\)\|\|familyVisits\)return;/,'the admin view and the village: never');
 assert.match(game,/  if\(villageWorld\)void addFamilyFarmers\(createFarmWalker,VILLAGE_FAMILY_WALKS\);\n  else void startFamilyVisits\(createFarmWalker,ground\);/,'after your own farmer, on the farm');
 // Who: the Family read (no new operation), kept 20 minutes for the visits; no family: [] without asking.
 assert.match(game,/members:\(\)=>familyFarmers\(FAMILY_VISIT_KEEP\),/);assert.match(game,/const FAMILY_VISIT_KEEP=FAMILY_FARMERS_KEEP;/);
 assert.match(game,/const familyId=state\.family\?\.familyId,bridge=window\.parent\?\.harvestBridge;if\(!familyId\|\|!bridge\?\.request\)return \[\];/);
 assert.match(game,/evening:\(\)=>isEvening\(\),/);assert.match(game,/busy:\(\)=>document\.hidden\|\|tripNearVisit\(walker\?\.trip\?\.\(\)\),/);
 // One model, made when they come (lite on phones), in their own look and family shirt, thrown away when they go.
 assert.match(game,/const visitor=await createFarmWalker\(\{scene,walk:FARM_VISIT,ground,lite:handheld\|\|mobileLayout\.matches,config:member\.farmer\?\?undefined,name:'family-farmer',family,visit:FARM_VISIT,tag:farmerTag\(member\.username\),blockers:tagBlockers\}\);/);
 assert.match(game,/finally\{const i=familyWalkers\.indexOf\(visitor\);if\(i>=0\)familyWalkers\.splice\(i,1\);visitor\.dispose\(\);\}/);
 // A tap: the family farmers' (a hop, then their profile).
 assert.match(game,/visitor\.playerId=member\.playerId;visitor\.username=member\.username;familyWalkers\.push\(visitor\);/);
 assert.match(game,/for\(const other of familyWalkers\)if\(other\.pick\(raycaster\)\)return \{type:'familyFarmer',id:other\.playerId\};/);
 // Your farmer makes no trip past a visitor.
 assert.match(game,/if\(place&&!\(familyVisits\?\.visitor&&nearVisit\(place\)\)\)walker\.visit\(place,look\);/);
 // No words: no toast, no window.
 const block=game.slice(game.indexOf('async function startFamilyVisits'),game.indexOf('// Every farmer\'s name'));
 assert.doesNotMatch(block,/toast\(|showModal|textContent|innerHTML/);
 assert.doesNotMatch(read('public/family-visit.js'),/document|localStorage|toast|track\(/,'only timing and who');
});

test('where the visitor walks: a loop by the Farmhouse and a way in from the door, clear of everything that can be tapped and of your own farmer',{skip},async()=>{
 const F=await import('../public/farm-farmer.js');const {FARM_VISIT,FARM_WALK,FARM_BENCH,FARM_TRIPS,FIELD_TRIPS,visitWays,inFarmerWay,tripNearVisit,VISIT_ROOM}=F;
 const {FARM_PETS}=await import('../public/farm-pets.js');
 const {pondBounds,outsideYardExtents,outsideFields,anchorAt}=await import('../public/farm-layout.js');
 const seg=([x,z],[ax,az],[bx,bz])=>{const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;return Math.hypot(x-ax-t*dx,z-az-t*dz);};
 // Every step of the walk 1/8 apart, and across the loop from each of its points to the first spot (the way out from where they are).
 const ways=visitWays(),along=([a,b],n,from=0,to=n)=>Array.from({length:to-from+1},(_,k)=>[a[0]+(b[0]-a[0])*(k+from)/n,a[1]+(b[1]-a[1])*(k+from)/n]);
 const loopPoints=ways.slice(2,2+FARM_VISIT.spots.length).flatMap(w=>along(w,8));
 const key=([x,z])=>`${x.toFixed(2)},${z.toFixed(2)}`;
 const points=[...new Map([...ways.flatMap(w=>along(w,8)),...loopPoints.flatMap(p=>along([p,FARM_VISIT.spots[0]],4,1,3))].map(p=>[key(p),p])).values()];
 assert.equal(FARM_VISIT.height,FARM_WALK.height);assert.equal(FARM_VISIT.spots.length,4);
 const TAPPABLE={farmhouse:[-21.4,-14.5,-16.6,-9.9],chores:[-14.6,-13.5,-8.8,-7.7],mill:[-19.5,-13,3.2,7.2],cart:[-13.7,-11.5,-14.1,-13.1],tractor:[-8.3,-5.2,-1.1,.6]};
 const [px0,pz0,px1,pz1]=pondBounds(),own=FARM_WALK.spots.map((p,i)=>[p,FARM_WALK.spots[(i+1)%FARM_WALK.spots.length]]);
 for(const p of points){
  const [x,z]=p;
  assert.ok(outsideFields(x,z,2)&&outsideYardExtents(x,z,.3),`${p}: off the fields and the yards`);assert.ok(x<px0||x>px1||z<pz0||z>pz1);
  for(const [name,[x0,x1,z0,z1]] of Object.entries(TAPPABLE))assert.ok(x<x0-1.5||x>x1+1.5||z<z0-1.5||z>z1+1.5,`${p}: clear of the ${name}`);
  for(const [a,b] of own)assert.ok(seg(p,a,b)>3,`${p}: clear of your farmer's loop`);
  assert.ok(Math.hypot(x-FARM_BENCH.x,z-FARM_BENCH.z)>3,`${p}: clear of the evening chair`);
  for(const pet of Object.values(FARM_PETS))for(const a of pet.spots)for(const b of pet.spots)assert.ok(seg(p,a,b)>3,`${p}: clear of the pets' walks`);
 }
 for(const p of ways.flatMap(w=>along(w,8)))assert.ok(inFarmerWay(p[0],p[1],0),`${p}: the scenery leaves it free`);
 assert.ok(!inFarmerWay(-10.1,-6,.3)&&!inFarmerWay(-12.5,-9.6,.3),'beside it the scenery stays');
 // By the Farmhouse.
 const [hx,hz]=anchorAt('farmhouse');for(const [x,z] of FARM_VISIT.spots)assert.ok(Math.hypot(x-hx,z-hz)<10);
 // Your farmer's trips: only the Dairy's comes this near (up the lane): no visit while they are on it, and none while a visitor is there.
 const near=[...Object.entries(FARM_TRIPS),...FIELD_TRIPS.map((t,i)=>[`field ${i}`,t])].filter(([,t])=>tripNearVisit(t)).map(([n])=>n);
 assert.deepEqual(near,['dairy']);assert.equal(VISIT_ROOM,2.5);assert.equal(tripNearVisit(null),false);
 for(const [name,t] of [...Object.entries(FARM_TRIPS),...FIELD_TRIPS.map((t,i)=>[`field ${i}`,t])])if(name!=='dairy'){
  const way=[[-13.6,-2],...t.via,t.at];for(let i=0;i+1<way.length;i++)for(const p of points)assert.ok(seg(p,way[i],way[i+1])>=VISIT_ROOM,`${name}: clear of the visit`);}
 // Checked in the harness (visit-cover.mjs, 21 Oct 2026): every point, 1/8 of each step apart, on a phone (390 x 844) and a computer's two
 // views (1440 x 900, 1000 x 620), in the home view and with the camera over it, on a level 60 and a level 150 farm: nothing that can
 // be tapped behind them (building, cart, chores, pin, name) and nothing under their feet. The points checked are these; a new spot
 // is a new check (and this list with it).
 const checked=JSON.parse(read('tests/fixtures/family-visit-cover.json'));
 assert.deepEqual(checked.views.sort(),['desktop','phone','small']);assert.deepEqual(checked.farms.sort(),['f150','f60']);
 assert.deepEqual(points.map(key),checked.points,'the walk is the one checked in the harness');
 assert.equal(checked.clear,checked.points.length*checked.views.length*checked.farms.length*2,'every point clear in every view, both cameras, both farms');
});

test('the visitor: in at the door fading in, the loop as anyone\'s, out the same way fading out; gone at once off the picture',()=>{
 const walker=read('public/farm-farmer.js');
 assert.match(walker,/me\.visit=\{leg:'in',path:\[\.\.\.visit\.way,spots\[0\]\],i:0\};/);
 assert.match(walker,/else\{me\.visit=\{leg:'out',path:\[spots\[0\],\.\.\.\[\.\.\.visit\.way\]\.reverse\(\),visit\.door\],i:0\};/);
 assert.match(walker,/if\(v\.leg==='in'\|\|v\.i>=v\.path\.length\)setAlpha\(d\/FADE_WAY\);/,'the fade over the first and last stretch');
 assert.match(walker,/if\(me\.visit\?\.leg==='in'\)arrived\(\);else if\(me\.visit\?\.leg==='out'\)gone\(\);/,'off the picture: no one waits to see them walk');
 assert.match(walker,/if\(now\|\|!\(performance\.now\(\)-\(me\.steppedAt\?\?-Infinity\)<MOVED_RECENTLY\)\)gone\(\);/);
 // Its own see-through copies of the shared materials, never a new shader mid-visit; all thrown away with it.
 assert.match(walker,/const m=n\.material\.clone\(\);m\.transparent=true;/);assert.match(walker,/dispose\(\)\{farmer\.dispose\(\);for\(const m of faded\)m\.dispose\(\);/);
 // A tap mid-way: the hop, then on their way again.
 assert.match(walker,/if\(me\.visit\)me\.visit\.i=Math\.max\(0,me\.visit\.i-1\);/);
 assert.match(walker,/if\(me\.visit\)\{me\.target=null;me\.rest=\.5;play\('idle'\);return;\}/);
});

test('names over the farmers (the owner, 21 Oct 2026: "Zet ook de naam van de user in village en farm boven het poppetje", "Toon alleen naamlabel bij hover", "Op mobiel altijd")',()=>{
 const game=read('public/game.js'),walker=read('public/farm-farmer.js'),css=read('public/farm-life.css');
 // A mouse: the hover tooltip, only the name, in the players' own words.
 assert.match(game,/const named=target\?\.type==='farmer'\?farmerTooltip\(ownName\(\)\):target\?\.type==='familyFarmer'\?farmerTooltip\(familyWalkers\.find\(w=>w\.playerId===target\.id\)\?\.username\):'';/);
 assert.match(game,/const farmerTooltip=name=>name\?`<strong>\$\{ownWords\(name\)\}<\/strong>`:'';/);
 assert.match(game,/if\(named\)tooltip\.innerHTML=named;\n   else if\(target\.type==='activity'\)/);
 assert.match(game,/if\(e\.pointerType!=='mouse'\|\|e\.buttons\)\{highlight\(-1\);\$\('tooltip'\)\.hidden=true;return;\}/,'a touch never shows the tooltip');
 // A touch screen: the name over each farmer all the time; with a mouse none (null tag).
 assert.match(game,/const namesAlways=handheld\|\|matchMedia\('\(hover: none\)'\)\.matches;/);
 assert.match(game,/function farmerTag\(name\)\{\n if\(!namesAlways\|\|typeof name!=='string'\|\|!name\.trim\(\)\)return null;\n const tag=document\.createElement\('span'\);tag\.className='farmer-name';tag\.setAttribute\('aria-hidden','true'\);tag\.innerHTML=ownWords\(name\.trim\(\)\);tag\.hidden=true;\n \$\('building-labels'\)\.prepend\(tag\);return tag;\n\}/);
 assert.equal((game.match(/tag:farmerTag\(/g)??[]).length,3,'your farmer, the village\'s family farmers and the visitor');
 assert.match(game,/tag:farmerTag\(ownName\(\)\),blockers:tagBlockers\}\);farmerTrip=tripFor;/);
 assert.match(game,/const initialUsername=typeof window\.harvestInitialFarm\.profile\?\.username==='string'/,'read before the page lets go of the first load');
 // Escaped and never translated (i18n.js ownWords).
 assert.match(read('public/i18n.js'),/export const ownWords=value=>`<span translate="no">\$\{escapeHtml\(value\)\}<\/span>`;/);
 // Following the farmer at their own frames (a phone's every other), hidden off the picture, giving way to pins and names.
 assert.match(walker,/  if\(lite&&frame%2\)return;\n  \/\/ The name follows them[^\n]*\n  if\(tag\)placeTag\(camera\);/);
 assert.match(walker,/const off=Math\.abs\(head\.x\)>1\|\|Math\.abs\(head\.y\)>1\|\|head\.z>1;/);
 assert.match(walker,/tag\.classList\.toggle\('yield',blockers\(\)\.some\(/);
 // Never tapped, under the pins (z-index 2) and so under every window; a fade where it gives way.
 assert.match(css,/\.farmer-name\{position:absolute;left:0;top:0;z-index:1;pointer-events:none;/);assert.match(css,/\.farmer-name\.yield\{opacity:\.18!important\}/);
 assert.match(read('public/styles.css'),/\.building-label\{position:absolute;[^}]*z-index:2\}/);
 // Not in the admin view, nor with reduced motion: no farmer, so no name (addFarmer returns before).
 assert.match(game,/async function addFarmer\(\)\{\n try\{\n  if\(!farmerComes\(\)\)return;/);
});
