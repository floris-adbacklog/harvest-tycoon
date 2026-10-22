import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import nodeModule from 'node:module';
import {LAKE_PICTURES,FISH_PICTURES,ART_KEYS} from '../public/visual-icons.js';
import {LAKE_LOADING_TIP} from '../public/loading-screen.js';
import {createReel} from '../public/pond-reel.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// farm-state.js imports the farmer's parts beside it (21 Oct 2026): a copy made into a data: module finds them by their file.
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`)).toString('base64');
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{return null;}};
// The village lake's screens (12 Oct 2026, plan D, steps 3, 4, 6 and 7): the pond's screen for another water (pond-ui.js, pond-scene.js,
// pond.css), fished from the rowboat in the middle of the village lake. The lake ships closed (LAKE_OPEN false): these tests open it in a
// copy of the rules (G) and of the screens that read them, and check the closed build as it ships (C).
const SOURCE=read('game/farm-state.js');
const OPEN=asModule(SOURCE.replace(/export const LAKE_OPEN=(true|false),/,'export const LAKE_OPEN=true,'));
const G=await import(OPEN),C=await import('../game/farm-state.js');
const here=file=>new URL(`../public/${file}`,import.meta.url).href;
// A screen's own source with its rules opened: farm-state.js is the open copy, every other module the real file.
const opened=file=>asModule(read(`public/${file}`).replace(/from '\.\/([\w-]+\.js)';/g,(all,name)=>`from '${name==='farm-state.js'?OPEN:here(name)}';`));
const now=Date.UTC(2026,9,12,9);
const at=(level,M=G)=>{const s=M.createFarm(now-3600000);s.xp=M.xpForLevel(level);s.coins=500;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};M.normalizeFarm(s,now);return s;};
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const needsHooks={skip:!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)'};
// The texts the lake's screens added (in every language, below).
const TEXTS=['A fish that gets away stays in the lake: a cast is only used when you land a fish or let it go.','The lake’s casts are its own: fishing here never uses your farm pond’s casts.',
 'The fish slipped off. It’s still in the lake: cast again.','Back to the village','Fish in the mountain lake','Ready to collect!','Something huge lives in this lake.','Something pale glides in the deep.',
 'Fish from the rowboat in the village: its own casts and fish.','The village lake has its own 5 casts, apart from your farm pond, and its fish pay much more.','Village lake page 2',
 'Fish from the rowboat in the middle of the village lake: open it from its pin over the boat, from Buildings or from More. It plays like your farm’s fishing pond, with its own casts, its own fish and its own fish book, and its fish pay much more.',
 '{0} casts to start, then a new one every {1} minutes, up to {2} waiting. They are the lake’s own: fishing here never uses your farm pond’s casts, and the other way round.',
 'A cast is only used when you land a fish or let it go. A fish that gets away stays in the lake, a little more tired each time.',
 'Old Granite, the lake’s legend, is very rare, but your lake fish number {0} is him if you have not landed him yet.',
 '{0} more kinds swim in the lake, on page 2 of its fish book. From then on the {1} kinds share the lake, so each of the first {2} comes less often, and a cast pays about what it did before.',
 'The Glacier Ghost, the lake’s giant, is very rare too, but one of your first {0} lake fish from level {1} is always a Glacier Ghost.'];

// The real village.glb and its layout in node (as tests/village-props.test.mjs loads them): the boat the plan picked must still float
// where VILLAGE_FISHING_SPOT says, so a new village layout cannot move it away silently.
test('the village spot: a rowboat still floats at VILLAGE_FISHING_SPOT, the line flies over open water, the pin stands over the boat',needsHooks,async()=>{
 const R=globalThis.Request;
 globalThis.self??=globalThis;globalThis.ProgressEvent??=class extends Event{constructor(type,init){super(type);Object.assign(this,init);}};
 globalThis.Request=class{constructor(url,init={}){this.url=url;this.signal=init.signal;}};
 globalThis.fetch=async input=>{const url=typeof input==='string'?input:input.url;if(url.startsWith('blob:')){const {resolveObjectURL}=await import('node:buffer');return new Response(await resolveObjectURL(url).arrayBuffer());}
  return new Response(readFileSync(new URL(`../public${url.split('?')[0]}`,import.meta.url)));};
 globalThis.createImageBitmap=async()=>({width:1024,height:1024,close(){}});
 const {error,warn}=console;console.error=console.warn=()=>{};
 try{
  const THREE=await import('three'),V=await import('../public/village-scene.js'),village=await V.loadVillage(),S=V.VILLAGE_FISHING_SPOT;
  assert.deepEqual(JSON.parse(JSON.stringify(S)),{x:-1.6,z:-.7,seat:6.95,float:{x:-3.7,z:1.4},water:6.67,pin:{x:-1.6,y:8,z:-.7},jump:2},'the plan\'s spot');
  assert.ok(!Object.hasOwn(V.VILLAGE_UTILITIES,'villagelake')&&!V.VILLAGE_FRAME.includes('villagelake'),'its own pin: the approved first views stay as they are');
  // The pack's rowboat (props_016), one of its instances right there, floating: its bottom at the water, its top under the pin.
  const boats=[],m=new THREE.Matrix4();village.updateMatrixWorld(true);
  village.traverse(o=>{if(!o.isInstancedMesh||o.name!=='props_016')return;if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);boats.push(o.geometry.boundingBox.clone().applyMatrix4(m).applyMatrix4(o.matrixWorld));}});
  const boat=boats.find(b=>{const c=b.getCenter(new THREE.Vector3());return Math.hypot(c.x-S.x,c.z-S.z)<.35;});
  assert.ok(boat,`a rowboat at ${S.x}, ${S.z} (the boats: ${boats.map(b=>b.getCenter(new THREE.Vector3()).toArray().map(v=>v.toFixed(1)).join(' ')).join(' | ')})`);
  assert.ok(boat.min.y>S.water-.1&&boat.min.y<S.water+.15,`it floats: its bottom ${boat.min.y.toFixed(2)}, the water ${S.water}`);
  assert.ok(S.seat>boat.min.y&&S.seat<boat.max.y,'the rod lies in it');assert.ok(S.pin.y-boat.max.y>.5,'the pin over it');
  // The water: what a ray straight down finds first at the float, on the line from the boat to it, and where a fish may jump.
  const solid=[];village.traverse(o=>{if(o.isMesh&&!/^mountains_/.test(o.name))solid.push(o);});
  const ray=new THREE.Raycaster(),down=new THREE.Vector3(0,-1,0),first=(x,z)=>{ray.set(new THREE.Vector3(x,80,z),down);return ray.intersectObjects(solid,false)[0];};
  const hit=first(S.float.x,S.float.z);assert.equal(hit.object.material.name,'Transparent','the float lands on the lake');assert.ok(Math.abs(hit.point.y-S.water)<.03,`the surface ${hit.point.y.toFixed(3)} there`);
  for(let k=.25;k<=1;k+=.25){const h=first(S.x+(S.float.x-S.x)*k*1.15,S.z+(S.float.z-S.z)*k*1.15);assert.equal(h.object.material.name,'Transparent',`open water ${k} of the way out`);}
  for(let a=0;a<16;a++){const h=first(S.float.x+Math.cos(a*Math.PI/8)*S.jump,S.float.z+Math.sin(a*Math.PI/8)*S.jump);assert.equal(h.object.material.name,'Transparent',`a jump at ${a}/16 of the round`);assert.ok(Math.abs(h.point.y-S.water)<.05,`the surface ${h.point.y.toFixed(3)}`);}
 }finally{console.error=error;console.warn=warn;globalThis.Request=R;}
});

// pond-scene.js takes the spot (12 Oct 2026); without one it is the farm pond's pier exactly as at 21e4e5a, number for number.
test('the 3D pieces: the lake\'s rod in the boat and its view moved down to the ground; the farm pond\'s spot as at 21e4e5a',needsHooks,async t=>{
 const THREE=await import('three'),{createPondScene,FISH_LOOK}=await import('../public/pond-scene.js'),{VILLAGE_FISHING_SPOT:S}=await import('../public/village-scene.js');
 const v=createPondScene({scene:new THREE.Scene(),place:S}),f=v.focus(),mid=v.stand.clone().lerp(v.rest,.55);
 assert.ok(Math.hypot(v.stand.x-S.x,v.stand.z-S.z)<.3&&Math.abs(v.stand.y-S.seat)<1e-9,'the rod\'s butt in the boat');
 assert.deepEqual(v.rest.toArray(),[S.float.x,S.water,S.float.z],'the float on the lake');assert.ok(Math.abs(Math.hypot(v.rest.x-S.x,v.rest.z-S.z)-3)<.1,'about 3 units out');
 // The village's camera looks along (-36,-40,-36) at the ground: the view's spot is the point between boat and float, moved down that line.
 assert.equal(f.y,0);const k=mid.y/40;assert.ok(Math.abs(f.x+36*k-mid.x)<1e-9&&Math.abs(f.z+36*k-mid.z)<1e-9,'the same spot on the screen');
 assert.deepEqual(v.labelAt().toArray(),[S.pin.x,S.pin.y,S.pin.z]);const l=v.labelAt();l.x=99;assert.equal(v.labelAt().x,S.pin.x,'a fresh copy each time (the pin projects it)');
 for(const key of Object.keys(G.LAKE_FISH))assert.ok(FISH_LOOK[key],`${key}: a colour and size for its 3D fish`);
 // The farm pond: the old pond-scene.js (21e4e5a) and this one, with a pier and without, give the same spot, view and pin.
 const old=show('21e4e5a','public/pond-scene.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old.replace("from './farm-layout.js';",`from '${here('farm-layout.js')}';`)));
 const scene=()=>{const s=new THREE.Scene(),pier=new THREE.Mesh(new THREE.BoxGeometry(1.4,.3,3.2),new THREE.MeshBasicMaterial());pier.position.set(25.6,.15,14.4);pier.userData.model='village_pier_001';s.add(pier);s.updateMatrixWorld(true);return s;};
 for(const make of [scene,()=>new THREE.Scene()]){
  const a=createPondScene({scene:make()}),b=O.createPondScene({scene:make()});
  for(const key of ['stand','rest','dir'])assert.deepEqual(a[key].toArray(),b[key].toArray(),key);
  assert.deepEqual(a.focus().toArray(),b.focus().toArray(),'the view');assert.deepEqual(a.labelAt().toArray(),b.labelAt().toArray(),'the pin');
 }
});

test('the screen per water: the lake\'s rules and texts written out in full, its tile in the village\'s More menu, its own way back',()=>{
 const ui=read('public/pond-ui.js');
 assert.match(ui,/export function createPond\(\{water:which='pond',place=null,/);assert.match(ui,/const W=WATERS\[which\],lake=which==='lake',FISH=W\.fish,/);
 assert.match(ui,/runAction\(\{type:W\.action,n:fishN,landed:true,perfect\}\)/);assert.match(ui,/const current=\(\)=>state\[W\.key\]\?\.n\?\?0;/);
 assert.match(ui,/const casts=\(\)=>waterCasts\(W,state,now\(\)\);/);assert.match(ui,/const kinds=W\.pages\[page\],/);
 assert.equal(G.LAKE_WATER.stats.coins,'lake_fish_coins','a lake catch the farm takes back takes its card along, as on the pond');
 for(const [pond,lake] of [['\'Fishing pond\'','\'Village lake\''],['\'Back to my farm\'','\'Back to the village\''],['\'My farm\'','\'Village\''],['\'Ready to harvest!\'','\'Ready to collect!\''],
  ['A fish that gets away stays in the pond: a cast is only used when you land a fish or let it go.','A fish that gets away stays in the lake: a cast is only used when you land a fish or let it go.'],
  ['\'The fish slipped off. It’s still in the pond: cast again.\'','\'The fish slipped off. It’s still in the lake: cast again.\'']])
  assert.ok(ui.includes(pond)&&ui.includes(lake),`both written out: ${lake}`);
 assert.ok(ui.includes('<li>The lake’s casts are its own: fishing here never uses your farm pond’s casts.</li>'),'How fishing works says the lake\'s casts are its own');
 assert.match(ui,/const lakeSecrets=\{oldgranite:'Something huge lives in this lake\.',glacierghost:'Something pale glides in the deep\.'\};/,'both legends are a shadow and a hint until landed');
 // Found from the village: the pin over the rowboat, More (after My farm, only there), Buildings (economy-ui.js); never Around the farm.
 assert.match(ui,/if\(lake\)\{tile\.dataset\.menuLake='';tile\.innerHTML=`\$\{art\('villagelake'\)\}<span><strong>Village lake<\/strong><small class="menu-hint">Fish in the mountain lake<\/small><\/span>`;menuGrid\?\.querySelector\('#farm-menu-entry'\)\?\.after\(tile\);\}/);
 assert.match(ui,/if\(!lake\)document\.querySelector\('#buildings-dialog \.utility-shortcuts'\)\?\.prepend\(shortcut\);/);
 assert.match(read('public/farm.html'),/id="farm-menu-entry" hidden>/,'My farm, the village\'s own entry, which the tile follows');
 // The way back: a ready batch at a village place (its good's picture), and the camera turns to that place.
 assert.match(ui,/const job=worldTwoBuilding\(key\)&&productionJobs\(b\)\.find\(j=>j\.readyAt<=now\(\)\);if\(job\)return \{art:Object\.keys\(job\.output\?\?\{\}\)\[0\]\?\?key,place:key\};/);
 assert.match(ui,/chip\.onclick=\(\)=>\{close\(\);focusFarm\(chip\.dataset\.place\|\|undefined\);\};/);
 assert.match(ui,/cue:\(\)=>!isOpen&&W\.open\(state\)&&waterCasts\(W,state,now\(\)\)\.casts>0&&!waiting\(\)/,'a fish jumps only while casts wait and nothing is ready');
 // The same pieces, so the same layouts: the round button, the bar, the catch card's buttons (pond.css, 918 x 516 and phones).
 assert.match(ui,/<div class="pond-card-actions">\$\{left>0\?`<button type="button" class="primary-button" data-card-again>/);
 for(const text of [...ui.match(/'[^'\n]*'|`[^`]*`/g),...read('public/pond-scene.js').match(/'[^'\n]*'|`[^`]*`/g)])assert.doesNotMatch(text,/ · /,'no middle dot');
});

test('the game: the lake loads in the village only, at the rowboat; the village\'s HUD folds away; cards and gifts wait while fishing',()=>{
 const game=read('public/game.js'),css=read('public/pond.css');
 assert.match(game,/if\(POND_OPEN&&!villageWorld&&!adminView\)void import\('\.\/pond-ui\.js'\)\.then\(\(\{createPond\}\)=>\{pond=createPond\(\{state,/,'the farm\'s line as it was');
 assert.match(game,/if\(LAKE_OPEN&&villageWorld&&!adminView\)void Promise\.all\(\[import\('\.\/pond-ui\.js'\),import\('\.\/village-scene\.js'\)\]\)\.then\(\(\[\{createPond\},\{VILLAGE_FISHING_SPOT\}\]\)=>\{pond=createPond\(\{water:'lake',place:VILLAGE_FISHING_SPOT,state,/);
 assert.match(game,/focusFarm:key=>key\?showVillagePlace\(key\):resetView\(\)\}\);/,'its chip turns the camera to the ready place');
 assert.match(game,/if\(key==='villagelake'\)\{pond\?\.open\(\);return;\}/,'the Buildings card opens it');
 assert.match(game,/tips:villageWorld\?\[\.\.\.\(LAKE_OPEN\?\[LAKE_LOADING_TIP\]:\[\]\),\.\.\.VILLAGE_LOADING_TIPS\]:/,'its tip on the way to the village, once open');
 // One fishing screen in each world (the same hooks): the camera, the pin, its life, a gift held, a level-up waiting for the open window.
 assert.match(game,/if\(pond\?\.viewing\(\)\)focus=pond\.frame\(camera,focus,aspect\);\n camera\.position\.copy\(focus\)/);
 assert.match(game,/if\(pond\?\.hold\(\(\)=>giftPopup\(gift,\{eyebrow,title,icon,text,action,names\}\)\)\)return;/);assert.match(read('public/pond-ui.js'),/dialog\.show\(\)/);
 // The village's own pins (places, the market square, the road, landmarks) are in #building-labels, its count in the side tools:
 // both fold away while fishing, with the topbar, the camera buttons and a phone's bar.
 assert.match(css,/body\.fishing :is\(\.topbar,\.side-tools,\.bottom-hud,\.scene-controls,[^)]*#building-labels[^)]*\)\{opacity:0;visibility:hidden;pointer-events:none\}/);
 for(const fn of ['addVillagePlace','addVillageUtility','addVillageLandmark'])assert.match(game.slice(game.indexOf(`function ${fn}(`),game.indexOf('\n}',game.indexOf(`function ${fn}(`))),/\$\('building-labels'\)\.append\(label\)/,fn);
 const html=read('public/farm.html');assert.ok(html.indexOf('id="village-count"')>html.indexOf('<nav class="side-tools"')&&html.indexOf('id="village-count"')<html.indexOf('</nav>',html.indexOf('<nav class="side-tools"')));
});

// A small page for economy-ui.js (as tests/village-square.test.mjs has it): every element by its id, markup kept as written.
function page(){
 const byId=new Map(),register=html=>{for(const [,id] of html.matchAll(/\sid="([^"]+)"/g))element(id);};
 function element(id){
  const e={id,hidden:false,disabled:false,textContent:'',className:'',dataset:{},style:{},open:false,scrollTop:0,html:'',classList:{toggle(){},add(){},remove(){},contains:()=>false},lastChild:{textContent:''},append(){},
   addEventListener(){},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,closest:()=>element(),querySelector:()=>element(),querySelectorAll:()=>[],
   showModal(){e.open=true;},close(){e.open=false;},getBoundingClientRect:()=>({width:0,height:0}),
   get innerHTML(){return e.html;},set innerHTML(value){e.html=String(value);register(e.html);},
   insertAdjacentHTML(where,html){e.html=where==='afterbegin'?html+e.html:e.html+html;register(html);}};
  if(id)byId.set(id,e);return e;
 }
 for(const [,id] of read('public/farm.html').matchAll(/\sid="([^"]+)"/g))element(id);
 return {byId,document:{getElementById:id=>byId.get(id)??null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>element()}};
}
test('the Buildings card: in the village right after the Market square once the lake is open, with the casts waiting; never on the farm or closed',async()=>{
 const p=page(),saved=globalThis.document;globalThis.document=p.document;
 try{
  const open=await import(opened('economy-ui.js')),shipped=await import('../public/economy-ui.js');
  const catalog=(M,state,village)=>{M.createEconomyUI({state,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){},village}).openBuildings();return p.byId.get('building-catalog').innerHTML;};
  const s=at(120);assert.match(catalog(open,s,true),/^<button class="building-card is-place" data-open-square>[^]*?<\/button><button class="building-card is-place" data-open-lake><span class="building-card-art"><img src="\/assets\/icons\/villagelake\.webp" alt=""><\/span><span class="building-card-info"><strong>Village lake<\/strong><span class="building-status ready" data-lake-status>Casts waiting: 5<\/span>/);
  s.lake={firstAt:now,n:3,casts:2,castsAt:Date.now(),lastAt:0,prevAt:0,best:{}};assert.match(catalog(open,s,true),/<span class="building-status idle" data-lake-status>Casts waiting: 2<\/span>/,'gold only when all 5 wait');
  assert.doesNotMatch(catalog(open,at(120),false),/data-open-lake/,'not in the farm\'s list');
  // Step 2 of the release (12 Oct 2026) opens the lake: the list as it ships follows the switch.
  if(C.LAKE_OPEN)assert.match(catalog(shipped,at(120,C),true),/data-open-lake/,'open as it ships');else assert.doesNotMatch(catalog(shipped,at(120,C),true),/data-open-lake/,'closed as it ships');
 }finally{globalThis.document=saved;if(saved===undefined)delete globalThis.document;}
 const ui=read('public/economy-ui.js');
 assert.match(ui,/\$\('building-catalog'\)\.querySelector\('\[data-open-lake\]'\)\?\.addEventListener\('click',\(\)=>\{\$\('buildings-dialog'\)\.close\(\);onPlace\?\.\('villagelake'\);\}\);/);
 assert.match(ui,/document\.querySelectorAll\('\[data-lake-status\]'\)\.forEach\(el=>\{const s=lakeStatus\(now\);/,'its line follows the casts while the list is open');
});

test('the level cards: level 100\'s line says where the lake is, level 120\'s what the whole book pays; every picture is a game picture',async()=>{
 assert.match(read('public/progression-ui.js'),/if\(e\.id==='lake:open'\)return 'Fish from the rowboat in the village: its own casts and fish\.';\n if\(e\.id==='lake:page2'\)return `Catch all \$\{Object\.keys\(LAKE_FISH\)\.length\} kinds: \$\{LAKE_BOOK2_DIAMONDS\} diamonds, once\.`;/);
 for(let level=98;level<=122;level++)for(const e of G.unlockEntries(at(level)))assert.ok(ART_KEYS.includes(e.art),`level ${level}: ${e.id} (${e.art})`);
 assert.deepEqual(G.unlockEntries(at(120)).filter(e=>e.id.startsWith('lake:')).map(e=>e.art),['villagelake','fish-goldentrout']);
 const {createTranslator}=await import('../public/i18n.js');
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const t=createTranslator(JSON.parse(read(`public/i18n/${code}.json`)),code).translate('Catch all 20 kinds: 65 diamonds, once.');
  assert.ok(t&&t.includes('20')&&t.includes('65')&&t!=='Catch all 20 kinds: 65 diamonds, once.',`${code}: ${t}`);
 }
});

test('the wiki: a Village lake section in The Village only, from the rules; page two from level 120; nothing while closed',async()=>{
 const O=await import(opened('wiki-content.js')),{wikiArticle}=await import('../public/wiki-content.js');
 const lake=html=>{const from=html.lastIndexOf('<section',html.indexOf('id="sec-village-lake"'));return from<0?'':html.slice(from,html.indexOf('</section>',html.lastIndexOf('id="sec-village-lake')+1)+10);};
 if(C.LAKE_OPEN)assert.ok(wikiArticle('village',{level:120}).html.includes('sec-village-lake'),'open as it ships (step 2, 12 Oct 2026)');
 else for(const ctx of [{},{level:120},{level:150}])assert.ok(!wikiArticle('village',ctx).html.includes('sec-village-lake'),`closed: ${JSON.stringify(ctx)}`);
 assert.equal(O.wikiArticle('village',{level:99}),null,'below 100 there is no village topic at all');
 for(const id of ['helpers','getting-started'])assert.equal(O.wikiArticle(id,{level:150}).html,wikiArticle(id,{level:150}).html,`${id}: the farm's topics as they were (the pond's section too)`);
 for(const level of [100,119]){
  const html=O.wikiArticle('village',{level}).html,part=lake(html);
  assert.match(part,/<h3>(?:<span class="game-art[^"]*"[^>]*><\/span>)?Village lake<\/h3>/,`level ${level}`);assert.ok(!html.includes('sec-village-lake-page-2')&&!part.includes('From level 120'),`level ${level}: page one only`);
  for(const key of G.LAKE_FISH_PAGES[1])assert.ok(!html.includes(`fish-${key}`),`level ${level}: no ${key}`);
  assert.ok(part.includes(`<td>${G.LAKE_FISH.bleak.chance}%</td>`)&&part.includes(`Coins at level ${level}`));
 }
 const at120=O.wikiArticle('village',{level:120}).html,site=O.wikiArticle('village',{}).html;
 for(const html of [at120,site]){
  assert.match(html,/<h3>(?:<span class="game-art[^"]*"[^>]*><\/span>)?Village lake page 2<\/h3>/);for(const f of Object.values(G.LAKE_FISH))assert.ok(html.includes(f.name),f.name);
  for(const text of ['Catch all 10 kinds for 35 diamonds, once.','your lake fish number 120 is him','Catch all 20 kinds, on both pages, for 65 diamonds more, once: 100 diamonds in all.','one of your first 60 lake fish from level 120 is always a Glacier Ghost.',
   '5 casts to start, then a new one every 20 minutes, up to 5 waiting. They are the lake’s own'])assert.ok(html.includes(text),text);
 }
 assert.ok(site.includes('From level 120')&&!lake(at120).includes(`<td>${G.LAKE_FISH.bleak.chance}%</td>`),'the website both chances, a farmer of 120 the one that is theirs');
 const bleak=G.LAKE_FISH.bleak;assert.ok(lake(at120).includes(`${Math.round(bleak.coins*.8*16)}–${Math.round(bleak.coins*1.2*16)}`),'a Bleak\'s coins at level 120: the rule\'s (1 + 120 / 8)');
 assert.doesNotMatch(site,/ · /);assert.match(read('public/wiki-content.js'),/\+\(LAKE_OPEN\?lakeSection\(h\):''\)/);
});

test('the loading tip: one village tip, its numbers the rules\', its picture a WebP; only once the lake is open',()=>{
 assert.equal(LAKE_LOADING_TIP[0],'villagelake');
 assert.equal(LAKE_LOADING_TIP[1],`The village lake has its own ${G.POND_START_CASTS} casts, apart from your farm pond, and its fish pay much more.`);
 assert.ok(readFileSync(new URL('../public/assets/icons/villagelake.webp',import.meta.url)).length>1000);assert.doesNotMatch(LAKE_LOADING_TIP[1],/ · /);
});

// The owner paints the 20 fish and the lake (vissen-dorp-prompts.md); until they come the files are copies of the pond's (STAND-INS.txt),
// which must never ship: with the lake open, no stand-in may be left.
test('the pictures: 21 WebP of 256 px on a clear ground, registered for the book, the pin, the menus and the level cards; no stand-in once open',()=>{
 const icons=read('public/visual-icons.js');
 assert.deepEqual(LAKE_PICTURES,[...Object.keys(G.LAKE_FISH).map(k=>`fish-${k}`),'villagelake']);
 for(const name of LAKE_PICTURES){
  const file=new URL(`../public/assets/icons/${name}.webp`,import.meta.url),data=readFileSync(file);
  assert.ok(statSync(file).size<40000,name);assert.equal(data.subarray(8,12).toString('ascii'),'WEBP',name);assert.equal(data.subarray(12,16).toString('ascii'),'VP8X',name);
  assert.ok(data[20]&0x10,`${name}: transparent`);assert.equal(1+data.readUIntLE(24,3),256);assert.equal(1+data.readUIntLE(27,3),256);
  assert.ok(!existsSync(new URL(`../public/assets/icons/${name}.png`,import.meta.url)),`${name}: no PNG`);assert.ok(ART_KEYS.includes(name),name);
  assert.ok(!FISH_PICTURES.includes(name),'the lake\'s own list');
 }
 assert.ok(icons.indexOf('for(const key of LAKE_PICTURES)pictures[key]=key;')<icons.indexOf('export const ART_KEYS='));assert.match(icons,/for\(const key of LAKE_PICTURES\)webpPictures\.add\(key\);/);
 if(C.LAKE_OPEN){
  assert.ok(!existsSync(new URL('../STAND-INS.txt',import.meta.url)),'the stand-ins are gone before the lake opens');
  const pond=new Set(FISH_PICTURES.map(name=>readFileSync(new URL(`../public/assets/icons/${name}.webp`,import.meta.url)).toString('base64')));
  for(const name of LAKE_PICTURES)assert.ok(!pond.has(readFileSync(new URL(`../public/assets/icons/${name}.webp`,import.meta.url)).toString('base64')),`${name} is still a copy of a pond picture`);
 }else if(existsSync(new URL('../STAND-INS.txt',import.meta.url))){
  const list=read('STAND-INS.txt');for(const name of LAKE_PICTURES)assert.ok(list.includes(`public/assets/icons/${name}.webp`),`${name} listed in STAND-INS.txt`);
 }
});

// The reel's simulated players for the 20 kinds are in tests/lake-balance.test.mjs; here the screen's own choice: the farm's first lake
// fish (a Bleak, number 0) plays as a first fish (it hardly moves), as the pond's first Minnow does.
test('the first lake fish plays as a first fish: a slow, sloppy player lands it every time',()=>{
 const seeded=seed=>()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 assert.equal(G.lakeFish({rookieUntil:1},0).species,'bleak');assert.match(read('public/pond-ui.js'),/reel=createReel\(fish\.species,\{tries,first:fishN===0\}\);/);
 for(let i=0;i<40;i++){
  const random=seeded(i+900),r=createReel('bleak',{first:true,random}),seen=[];let t=0;
  while(!r.done&&t<90){seen.push(r.fish);const late=seen[Math.max(0,seen.length-1-Math.round(.6*60))],aim=late+(random()-.5)*8*1.7;r.run(1/60,aim>r.zone+r.size/2+r.v*.22*.3);t+=1/60;}
  assert.equal(r.done,'landed',`try ${i}`);
 }
});

test('texts: every language has the lake\'s screens (the book, the card, the tile, the level card, the wiki, the tip); number forms where a count comes first',async()=>{
 const {createTranslator}=await import('../public/i18n.js'),catalog=JSON.parse(read('i18n/catalog.json')),readme=read('i18n/README.md');
 for(const text of TEXTS){assert.ok(text in catalog,text);assert.doesNotMatch(text,/ · /);}
 const forms={ru:['few','many','one','other'],uk:['few','many','one','other'],cs:['few','many','one','other'],ar:['few','many','one','other','two','zero'],hi:['one','other'],fr:['one','other']};
 const counted=TEXTS.filter(text=>text.startsWith('{0}'));assert.equal(counted.length,2);
 for(const code of ['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']){
  const dict=JSON.parse(read(`public/i18n/${code}.json`));
  for(const text of TEXTS){assert.ok(text in dict,`${code}: ${text}`);const out=dict[text];for(const v of typeof out==='object'?Object.values(out):[out])assert.doesNotMatch(v,/ · /,`${code}: no middle dot`);}
  if(forms[code])for(const text of counted)assert.deepEqual(Object.keys(dict[text]).sort(),forms[code],`${code}: number forms, ${text.slice(0,30)}`);
  // The lake's words are never the pond's (a lake that gets away "stays in the pond" would be wrong in any language).
  assert.notEqual(dict['A fish that gets away stays in the lake: a cast is only used when you land a fish or let it go.'],dict['A fish that gets away stays in the pond: a cast is only used when you land a fish or let it go.'],code);
  assert.notEqual(dict['Back to the village'],dict['Back to my farm'],code);
  const t=createTranslator(dict,code),tip=t.translate(LAKE_LOADING_TIP[1]);assert.ok(tip&&tip!==LAKE_LOADING_TIP[1]&&tip.includes('5'),`${code}: ${tip}`);
 }
 const nl=createTranslator(JSON.parse(read('public/i18n/nl.json')),'nl'),ru=createTranslator(JSON.parse(read('public/i18n/ru.json')),'ru');
 assert.equal(nl.translate('Back to the village'),'Terug naar het dorp');assert.equal(ru.translate('Back to the village'),'Назад в деревню');
 assert.match(readme,/The lake's screens \(12 Oct 2026, plan D\)/,'the glossary has the screens\' words');
 for(const code of ['es','de','fr','pt','nl','id','ja','tr','cs','uk','hu','ru','ar','zh','hi'])assert.ok(readme.includes(`(${code}): rowboat `),`${code}: the rowboat in the glossary`);
});
