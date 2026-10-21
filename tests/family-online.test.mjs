import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import * as nodeModule from 'node:module';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// Your Farm Family on your farm and in the village (21 Oct 2026, the owner: "toon alle online players in de fam in farm en village,
// dus geen 'bezoekjes' meer"): every other member online now walks there, all at once, for as long as they are online.

const member=(id,extra={})=>({playerId:id,online:true,daysAway:0,...extra});

test('who walks where: the first ones of the online list, each on a walk of their own; who goes offline leaves, who comes online joins',{skip},async()=>{
 const {familyStage,FARM_FAMILY_WALKS,FARM_FAMILY_LITE,VILLAGE_FAMILY_WALKS}=await import('../public/farm-farmer.js');
 assert.equal(FARM_FAMILY_WALKS.length,6);assert.equal(VILLAGE_FAMILY_WALKS.length,6);assert.equal(FARM_FAMILY_LITE,3);
 const nine=Array.from({length:9},(_,i)=>member(`m${i}`));
 // Nobody yet: up to six on a computer, three on a phone, in the order of the list.
 let {leave,join}=familyStage(new Map(),nine,6);
 assert.deepEqual(leave,[]);assert.deepEqual(join.map(j=>[j.member.playerId,j.slot]),[['m0',0],['m1',1],['m2',2],['m3',3],['m4',4],['m5',5]]);
 ({join}=familyStage(new Map(),nine,FARM_FAMILY_LITE));assert.deepEqual(join.map(j=>[j.member.playerId,j.slot]),[['m0',0],['m1',1],['m2',2]]);
 // Fewer online than walks: all of them.
 ({join}=familyStage(new Map(),nine.slice(0,2),6));assert.deepEqual(join.map(j=>j.member.playerId),['m0','m1']);
 // Two minutes later m1 went offline and m7 came online: m1 leaves, m7 takes the free walk; the others stay where they walk.
 const shown=new Map([['m0',0],['m1',1],['m2',2]]);
 ({leave,join}=familyStage(shown,[member('m0'),member('m2'),member('m7')],3));
 assert.deepEqual(leave,['m1']);assert.deepEqual(join.map(j=>[j.member.playerId,j.slot]),[['m7',1]]);
 // Everyone offline (or no family any more): all leave, nobody joins.
 ({leave,join}=familyStage(shown,[],3));assert.deepEqual(leave,['m0','m1','m2']);assert.deepEqual(join,[]);
 // Someone seen more lately than the last one shown, all walks taken: the first cap of the list are shown.
 ({leave,join}=familyStage(new Map([['m0',0],['m1',1],['m2',2]]),[member('m9'),member('m0'),member('m1'),member('m2')],3));
 assert.deepEqual(leave,['m2']);assert.deepEqual(join.map(j=>[j.member.playerId,j.slot]),[['m9',2]]);
 // Nothing to do when nothing changed; broken rows are skipped.
 assert.deepEqual(familyStage(new Map([['m0',0]]),[member('m0'),null,{name:'x'}],6),{leave:[],join:[]});
 assert.deepEqual(familyStage(new Map(),null,6),{leave:[],join:[]});
});

test('game.js: only members online now, read again every two minutes (the kept list is gone by then); the farm and the village alike; six, a phone\'s farm three',()=>{
 const game=read('public/game.js');
 assert.match(game,/const list=\(data\?\.family\?\.members\?\?\[\]\)\.filter\(m=>!m\.isSelf&&typeof m\.playerId==='string'&&m\.online===true\)\.sort\(\(a,b\)=>\(a\.daysAway\?\?0\)-\(b\.daysAway\?\?0\)\)\n  \.slice\(0,6\)/);
 assert.match(game,/return kept\.list\.filter\(m=>m\.online===true\);/,'a kept list: only those online');
 const keep=Number(game.match(/FAMILY_FARMERS_KEEP=(\d+)/)[1]),sync=eval(game.match(/FAMILY_FARMERS_SYNC=([\d*]+);/)[1]);
 assert.equal(sync,120000);assert.ok(keep<sync,'every read after two minutes asks again (a list kept as long would be read back)');
 assert.match(game,/await sync\(\);setInterval\(\(\)=>\{if\(!document\.hidden\)void sync\(\);\},FAMILY_FARMERS_SYNC\);/);
 // On the farm and in the village: the walks of each; on a phone's farm at most FARM_FAMILY_LITE (the village keeps its six).
 assert.match(game,/const walks=villageWorld\?VILLAGE_FAMILY_WALKS:FARM_FAMILY_WALKS,cap=villageWorld\|\|!\(handheld\|\|mobileLayout\.matches\)\?walks\.length:FARM_FAMILY_LITE;\n  void addFamilyFarmers\(createFarmWalker,familyStage,walks,cap,villageWorld\?null:ground\);/);
 // After your own farmer, so never with reduced motion, Save-Data, a 2g line or in the admin view.
 assert.match(game,/async function addFarmer\(\)\{\n try\{\n  if\(!farmerComes\(\)\)return;/);
 assert.match(game,/function farmerComes\(\)\{const connection=navigator\.connection;return !\(reducedMotion\|\|adminView\|\|connection\?\.saveData\|\|\/2g\/\.test\(connection\?\.effectiveType\?\?''\)\);\}/);
 // Who leaves first fades out (then is thrown away), then the new ones come one at a time in a quiet moment, fading in.
 const block=game.slice(game.indexOf('async function addFamilyFarmers'),game.indexOf('// Every farmer\'s name'));
 assert.match(block,/const list=await familyFarmers\(\),\{leave,join\}=familyStage\(shown,list,cap\);/);
 assert.match(block,/await Promise\.all\(leave\.map\(async id=>\{\n    const other=walkers\.get\(id\);walkers\.delete\(id\);\n    try\{await other\?\.leave\(\);\}finally\{shown\.delete\(id\);const i=familyWalkers\.indexOf\(other\);if\(i>=0\)familyWalkers\.splice\(i,1\);other\?\.root\.removeFromParent\(\);other\?\.dispose\(\);\}/);
 assert.ok(block.indexOf('leave.map')<block.indexOf('for(const {member,slot} of join)'),'the walk is free before someone new comes');
 assert.match(block,/for\(const \{member,slot\} of join\)\{\n    await new Promise\(done=>'requestIdleCallback' in window\?requestIdleCallback\(done,\{timeout:4000\}\):setTimeout\(done,1200\)\);/);
 assert.match(block,/name:'family-farmer',family,appear:true,tag:farmerTag\(member\.username\),blockers:tagBlockers\}\);/);
 assert.match(block,/lite:handheld\|\|mobileLayout\.matches,/,'a phone moves them every other frame');
 // No bench for them: they walk in the evening too (only your own farmer sits).
 assert.doesNotMatch(block,/bench/);assert.match(read('public/farm-farmer.js'),/function evening\(\)\{\n  if\(!bench\|\|!actions\.sit\)return;/);
 // No words: no toast, no window.
 assert.doesNotMatch(block,/toast\(|showModal|textContent|innerHTML/);
 // A tap: a hop, then their profile.
 assert.match(game,/for\(const other of familyWalkers\)if\(other\.pick\(raycaster\)\)return \{type:'familyFarmer',id:other\.playerId\};/);
 assert.match(game,/function tapFamilyFarmer\(id\)\{const other=familyWalkers\.find\(w=>w\.playerId===id\),landed=other\?\.react\(\)\?\?Promise\.resolve\(\);/);
 assert.match(game,/for\(const other of familyWalkers\)other\.animate\(dt,camera\);/);
});

test('no visits left: the visit\'s file, timing, door and way are gone',()=>{
 assert.ok(!existsSync(new URL('../public/family-visit.js',import.meta.url)));
 assert.ok(!existsSync(new URL('../tests/fixtures/family-visit-cover.json',import.meta.url)));
 const code=[...readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>read(`public/${f}`)),...readdirSync(new URL('../src/',import.meta.url)).filter(f=>f.endsWith('.js')).map(f=>read(`src/${f}`))].join('\n');
 for(const gone of ['family-visit','FARM_VISIT','familyVisits','startFamilyVisits','createFamilyVisits','visitWays','tripNearVisit','VISIT_ROOM','me.visit','visitStep','FAMILY_VISIT_KEEP','__qaVisits'])assert.ok(!code.includes(gone),gone);
 // Your farmer's trips go where they went before the visits.
 assert.match(read('public/game.js'),/ if\(place\)walker\.visit\(place,look\);\n\}/);
});

test('the walker: a family member fades in where they walk and out where they stand; at once off the picture or when not moved',()=>{
 const walker=read('public/farm-farmer.js');
 assert.match(walker,/name='your-farmer',family=null,appear=false,tag=null,/);
 assert.match(walker,/if\(appear\)\{setAlpha\(0\);fade=\{to:1,t:0\};\}/);
 assert.match(walker,/me\.clock\+=t;me\.steppedAt=performance\.now\(\);if\(fade\)fadeBy\(t\);step\(t\);mixer\.update\(t\);/,'over their own frames');
 assert.match(walker,/   if\(fade\)fadeBy\(Infinity\);\n/,'off the picture: done at once');
 assert.match(walker,/if\(!\(performance\.now\(\)-\(me\.steppedAt\?\?-Infinity\)<MOVED_RECENTLY\)\)\{setAlpha\(0\);gone\(\);\}/,'not being moved: gone at once');
 // Their own see-through copies of the shared materials only while fading, given back after; never a new shader.
 assert.match(walker,/const m=n\.material\.clone\(\);m\.transparent=true;m\.userData\.full=n\.material\.opacity\?\?1;m\.userData\.shared=n\.material;/);
 assert.match(walker,/const to=fade\.to;fade=null;if\(to\)solid\(\);else gone\(\);/);
 assert.match(walker,/dispose\(\)\{if\(faded\.length\)solid\(\);farmer\.dispose\(\);/);
});

test('where they walk on the farm: six small loops by the Farmhouse yard and the lanes, clear of everything that can be tapped, of your own farmer and of each other',{skip},async()=>{
 const {FARM_FAMILY_WALKS,FARM_WALK,FARM_BENCH,FARM_TRIPS,FIELD_TRIPS,inFarmerWay,familyWays}=await import('../public/farm-farmer.js');
 const {FARM_PETS}=await import('../public/farm-pets.js');
 const {pondBounds,outsideYardExtents,outsideFields,outsideFactory,anchorAt}=await import('../public/farm-layout.js');
 const seg=([x,z],[ax,az],[bx,bz])=>{const dx=bx-ax,dz=bz-az,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/l)):0;return Math.hypot(x-ax-t*dx,z-az-t*dz);};
 const key=([x,z])=>`${x.toFixed(2)},${z.toFixed(2)}`;
 const along=([a,b],n)=>Array.from({length:n+1},(_,k)=>[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);
 // Every step of every loop 1/8 apart (a loop of two spots walks there and back).
 const loops=FARM_FAMILY_WALKS.map(({spots})=>[...new Map(spots.flatMap((p,i)=>along([p,spots[(i+1)%spots.length]],8)).map(p=>[key(p),p])).values()]);
 const points=[...new Map(loops.flat().map(p=>[key(p),p])).values()];
 const own=FARM_WALK.spots.map((p,i)=>[p,FARM_WALK.spots[(i+1)%FARM_WALK.spots.length]]);
 const trips=[...Object.values(FARM_TRIPS),...FIELD_TRIPS].flatMap(t=>{const w=[[-13.6,-2],...t.via,t.at];return w.slice(1).map((p,i)=>[w[i],p]);});
 const pets=Object.values(FARM_PETS).flatMap(p=>p.spots.flatMap(a=>p.spots.map(b=>[a,b])));
 // The cows' pasture, the paddock and the silo east of the lane, north of the trunk road (fenced, not a yard of YARD_EXTENT's).
 const PEN=[-7,9,-19,-6.2];
 const [px0,pz0,px1,pz1]=pondBounds();
 for(const [i,walk] of FARM_FAMILY_WALKS.entries()){
  assert.equal(walk.height,FARM_WALK.height);assert.ok(walk.walk<FARM_WALK.walk,'a calm pace');assert.ok(walk.spots.length>=2&&walk.spots.length<=4);
  for(const [a,b] of walk.spots.map((p,k)=>[p,walk.spots[(k+1)%walk.spots.length]]))assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<=2.1,`loop ${i}: small`);
  for(const p of loops[i]){
   const [x,z]=p;
   assert.ok(outsideFields(x,z,1.5)&&outsideYardExtents(x,z,.5)&&outsideFactory(x,z,1),`${p}: off the fields and the yards`);assert.ok(x<px0-1||x>px1+1||z<pz0-1||z>pz1+1,`${p}: off the pond`);
   assert.ok(!(x>PEN[0]&&x<PEN[1]&&z>PEN[2]&&z<PEN[3]),`${p}: out of the animals' pens`);
   for(const [a,b] of own)assert.ok(seg(p,a,b)>=1.8,`${p}: clear of your farmer's loop`);
   assert.ok(Math.hypot(x-FARM_BENCH.x,z-FARM_BENCH.z)>=2,`${p}: clear of the evening chair`);
   for(const [a,b] of trips)assert.ok(seg(p,a,b)>=1.5,`${p}: clear of your farmer's trips`);
   for(const [a,b] of pets)assert.ok(seg(p,a,b)>=1.8,`${p}: clear of the pets' walks`);
   for(const [j,other] of loops.entries())if(j!==i)for(const q of other)assert.ok(Math.hypot(q[0]-x,q[1]-z)>=1.5,`loops ${i} and ${j} apart`);
   assert.ok(inFarmerWay(x,z,0),`${p}: the scenery leaves it free`);
  }
 }
 assert.equal(familyWays().length,FARM_FAMILY_WALKS.reduce((n,w)=>n+w.spots.length,0));
 // By the Farmhouse yard and the lanes: none further than a short walk.
 const [hx,hz]=anchorAt('farmhouse');for(const p of points)assert.ok(Math.hypot(p[0]-hx,p[1]-hz)<21,`${p}: by the Farmhouse`);
 // The scenery keeps what is not in anyone's way (as before the family came).
 assert.ok(!inFarmerWay(-20,-8,1)&&!inFarmerWay(-13.16,3,.5)&&!inFarmerWay(-12.5,-12.5,.3));
 // Checked in the harness (family-cover.mjs, 21 Oct 2026): every point on a phone (390 x 844) and a computer's two views (1440 x 900,
 // 1000 x 620), in the home view and with the camera over its loop, on a level 60 and a level 150 farm: nothing that can be tapped
 // behind them (building, cart, chores, pin, name, pet or animal), nothing in front hiding them, nothing under their feet. The points
 // checked are these; a new spot is a new check (and this list with it).
 const checked=JSON.parse(read('tests/fixtures/family-farm-cover.json'));
 assert.deepEqual(checked.views.sort(),['desktop','phone','small']);assert.deepEqual(checked.farms.sort(),['f150','f60']);assert.deepEqual(checked.cameras,['home','loop']);
 assert.deepEqual(points.map(key),checked.points,'the loops are the ones checked in the harness');
 assert.equal(checked.clear,checked.points.length*checked.views.length*checked.farms.length*checked.cameras.length,'every point clear in every view, both cameras, both farms');
 // The three a phone shows are in a phone's first view; on a computer all six.
 for(const farm of checked.farms){
  for(const i of [0,1,2])assert.ok(checked.inHome[`phone ${farm}`].includes(i),`phone ${farm}: loop ${i} in the first view`);
  for(const view of ['desktop','small'])assert.deepEqual(checked.inHome[`${view} ${farm}`],[0,1,2,3,4,5]);
 }
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
 assert.equal((game.match(/tag:farmerTag\(/g)??[]).length,2,'your farmer and the family\'s, on the farm and in the village');
 assert.match(game,/tag:farmerTag\(ownName\(\)\),blockers:tagBlockers\}\);farmerTrip=tripFor;/);
 assert.match(game,/const initialUsername=typeof window\.harvestInitialFarm\.profile\?\.username==='string'/,'read before the page lets go of the first load');
 // Escaped and never translated (i18n.js ownWords).
 assert.match(read('public/i18n.js'),/export const ownWords=value=>`<span translate="no">\$\{escapeHtml\(value\)\}<\/span>`;/);
 // Following the farmer at their own frames (a phone's every other), hidden off the picture, giving way to pins and names; fading with them.
 assert.match(walker,/  if\(lite&&frame%2\)return;\n  \/\/ The name follows them[^\n]*\n  if\(tag\)placeTag\(camera\);/);
 assert.match(walker,/const off=Math\.abs\(head\.x\)>1\|\|Math\.abs\(head\.y\)>1\|\|head\.z>1;/);
 assert.match(walker,/tag\.classList\.toggle\('yield',blockers\(\)\.some\(/);
 assert.match(walker,/if\(tag\)tag\.style\.opacity=alpha<1\?String\(alpha\):'';/);
 // Never tapped, under the pins (z-index 2) and so under every window; a fade where it gives way.
 assert.match(css,/\.farmer-name\{position:absolute;left:0;top:0;z-index:1;pointer-events:none;/);assert.match(css,/\.farmer-name\.yield\{opacity:\.18!important\}/);
 assert.match(read('public/styles.css'),/\.building-label\{position:absolute;[^}]*z-index:2\}/);
});
