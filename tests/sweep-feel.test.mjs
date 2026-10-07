import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createFarmClient,sweepTotal,farmNow} from '../public/farm-client.js';
import {createFarm,applyFarmAction,seedCost,BEGINNER_QUESTS} from '../public/farm-state.js';
import {createFarmAudio,snipRate,SNIP_SCALE,SNIP_GAP,SOUND_CUES} from '../public/farm-audio.js';
import {toolCursor,ghostPose,TOOL_ART,TOOL_SIZE,CURSOR_PX,createSweepTool,createSweepGhost} from '../public/sweep-tools.js';
import {art,pictureFile,ART_KEYS} from '../public/visual-icons.js';
import {HAPTICS} from '../public/haptics.js';
import {extract} from '../scripts/i18n-extract.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
// Oct 2026 (the CrazyGames review: "harvesting should feel physical"): a sweep works every field on the screen the moment it is passed,
// with the server's rules, and is still saved in ONE 'fields' request on release; a refusal by the server takes it all back.
function farmSetup(request,edit=()=>{}){
 globalThis.localStorage={getItem(){throw new Error('Legacy save must not be read');},setItem(){throw new Error('Farm state must not be saved locally');}};
 globalThis.document={body:{classList:{add(){},remove(){}}}};
 globalThis.window={parent:{harvestBridge:{request,serverNow:Date.now()}}};
 const state=createFarm(Date.now());edit(state);
 const log={changes:0,errors:[]},client=createFarmClient(state,{onChange(){log.changes++;},onStatus(){},onError:m=>log.errors.push(m)});
 return {state,client,log};
}
const ripeCorn=state=>state.plots.map((p,i)=>p.crop==='corn'&&p.readyAt<=Date.now()?i:-1).filter(i=>i>=0);

test('a sweep cuts each field the moment it is passed: the stock and XP move per field, nothing is sent and nothing else is redrawn until release',async()=>{
 const sent=[],answers=[];
 const {state,client,log}=farmSetup(body=>{sent.push(body);return new Promise(resolve=>answers.push(resolve));});await client.load();
 const [a,b,c]=ripeCorn(state),growing=state.plots.findIndex(p=>p.crop&&p.readyAt>Date.now()),changes=log.changes,corn=state.inventory.corn,xp=state.xp;
 const sweep=client.sweep('harvest','corn');
 const first=sweep.add(a);
 assert.equal(first.fields[0].id,a);assert.equal(state.plots[a].crop,null,'cut on the spot');assert.ok(state.inventory.corn>corn,'in the stock at once');assert.ok(state.xp>xp);
 const stock=state.inventory.corn;
 assert.equal(sweep.add(growing),null,'a growing crop is refused, so it is not lit');assert.ok(state.plots[growing].crop);
 assert.equal(sweep.add(a),null,'each field once');
 assert.ok(sweep.add(b));assert.ok(state.inventory.corn>stock,'the next field adds to it');
 assert.equal(log.changes,changes,'no full redraw while sweeping');assert.equal(sent.length,0,'nothing is sent while sweeping');
 const total=sweep.end();
 assert.deepEqual(total.fields.map(f=>f.id),[a,b]);assert.equal(total.count,2);assert.equal(log.changes,changes+1,'one redraw on release');
 assert.equal(sweep.add(c),null,'a finished sweep takes no more fields');
 await tick();
 assert.equal(sent.length,1,'ONE request for the whole sweep');assert.deepEqual(sent[0].action,{type:'fields',action:'harvest',ids:[a,b],crop:'corn'});
 const saved=structuredClone(state);saved.coins+=7;answers.shift()({state:saved,serverNow:Date.now(),result:total});await tick();
 assert.equal(state.coins,saved.coins,'the server has the last word');assert.equal(state.plots[c].crop,'corn');
});

test('what a sweep shows field by field is exactly what its one request does on the server: produce, XP, the golden first harvest, the guide step and the level-up',async()=>{
 const {state,client}=farmSetup(()=>new Promise(()=>{}));await client.load();
 const server=structuredClone(state),ids=ripeCorn(state).reverse();
 const sweep=client.sweep('harvest','corn');for(const id of ids)assert.ok(sweep.add(id));const total=sweep.end();
 const result=applyFarmAction(server,{type:'fields',action:'harvest',ids,crop:'corn'},farmNow());
 for(const key of ['coins','diamonds','xp','inventory','levelRewards'])assert.deepEqual(state[key],server[key],key);
 assert.deepEqual(state.stats.harvested,server.stats.harvested);
 // When each guide step was finished (onboarding.stepAt, 7 Oct 2026) is each side's own clock.
 const {stepAt:shownAt,...shown}=state.onboarding,{stepAt:savedAt,...saved}=server.onboarding;assert.deepEqual(shown,saved);assert.deepEqual(Object.keys(shownAt),Object.keys(savedAt));
 assert.deepEqual(total.fields,result.fields);assert.equal(total.count,result.count);
 assert.ok(total.fields[0].firstHarvest,'the golden first harvest lands on the first swept field');
 assert.deepEqual(total.guide.map(g=>g.id),result.guide.map(g=>g.id));assert.deepEqual(total.levelReward,result.levelReward);
});

test('a planting sweep spends per field and stops where the coins run out; a sweep that took no field sends nothing and says why',async()=>{
 let asked=0;
 const {state,client}=farmSetup(()=>{asked++;return new Promise(()=>{});},s=>{s.coins=seedCost(s,'wheat')+1;});await client.load();
 const empty=state.plots.map((p,i)=>p.crop?-1:i).filter(i=>i>=0),cost=seedCost(state,'wheat');
 const sweep=client.sweep('plant','wheat');
 assert.ok(sweep.add(empty[0]));assert.equal(state.coins,1);assert.equal(state.plots[empty[0]].crop,'wheat');
 assert.equal(sweep.add(empty[1]),null,'out of coins: that field stays empty');assert.match(sweep.reason,/Not enough coins/);
 const total=sweep.end();assert.equal(total.count,1);assert.equal(total.cost,cost);assert.equal(total.short,true,'the game says the coins ran out');assert.equal(total.crop,'wheat');
 const none=client.sweep('plant','wheat');assert.equal(none.add(empty[1]),null);assert.equal(none.end(),null);
 await tick();assert.equal(asked,1,'only the sweep that planted something is sent');
});

test('when the server refuses a sweep every field comes back and the toast says why',async()=>{
 const {state,client,log}=farmSetup(async body=>{if(body.operation==='load')throw new Error('Offline');throw Object.assign(new Error('Your farm changed in another tab.'),{code:'ACTION_REJECTED'});});await client.load();
 const before=structuredClone(state),sweep=client.sweep('harvest','corn');
 for(const id of ripeCorn(state))sweep.add(id);sweep.end();
 assert.ok(state.plots.every(p=>p.crop!=='corn'||p.readyAt>Date.now()),'cut on the screen');
 await tick();await tick();
 assert.deepEqual(state.plots.map(p=>p.crop),before.plots.map(p=>p.crop),'the corn is back');assert.equal(state.inventory.corn,before.inventory.corn);assert.equal(state.xp,before.xp);
 assert.deepEqual(log.errors,['Your farm changed in another tab.']);
});

test('the sum of a sweep adds up every field, XP boost, guide step and level reward',()=>{
 const one=(id,extra={})=>({action:'harvest',fields:[{id,crop:'corn',quantity:2,xp:3}],count:1,...extra});
 const total=sweepTotal('harvest',[one(0,{guide:[{id:'harvest',xp:15}],levelReward:{coins:50,diamonds:1,levels:[2]}}),one(1,{xp:6}),one(2,{levelReward:{coins:60,diamonds:0,levels:[3]}})]);
 assert.deepEqual(total.fields.map(f=>f.id),[0,1,2]);assert.equal(total.count,3);assert.equal(total.xp,6);
 assert.deepEqual(total.guide,[{id:'harvest',xp:15}]);assert.deepEqual(total.levelReward,{coins:110,diamonds:1,levels:[2,3]});
 const plant=sweepTotal('plant',[{action:'plant',fields:[{id:4}],count:1,crop:'wheat',cost:3,short:false},{action:'plant',fields:[{id:5}],count:1,crop:'wheat',cost:3,short:false}]);
 assert.equal(plant.cost,6);assert.equal(plant.crop,'wheat');assert.equal(plant.short,false);
});

class Param{value=0;setValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}cancelScheduledValues(){}}
class Node{gain=new Param();frequency=new Param();playbackRate=new Param();threshold=new Param();knee=new Param();ratio=new Param();attack=new Param();release=new Param();connect(){return this;}disconnect(){}start(when){this.startedAt=when;}stop(){}}
class Context{state='suspended';currentTime=1;destination=new Node();sources=[];createGain(){return new Node();}createOscillator(){const n=new Node();this.sources.push(n);return n;}createDynamicsCompressor(){return new Node();}createBufferSource(){const n=new Node();this.sources.push(n);return n;}createBuffer(c,length){const d=new Float32Array(length);return {getChannelData:()=>d};}async resume(){this.state='running';}async suspend(){this.state='suspended';}async close(){this.state='closed';}}
test('every swept field snips, a step higher on a pentatonic scale up to an octave, at most one every 55 ms; the closing chime still plays',async()=>{
 assert.deepEqual(SNIP_SCALE,[0,2,4,7,9,12]);assert.equal(SNIP_GAP,.055);
 assert.deepEqual([0,1,2,3,4,5,6,20].map(n=>Number(snipRate(n).toFixed(4))),[1,1.1225,1.2599,1.4983,1.6818,2,2,2],'up to an octave, then it stays');
 assert.ok(SOUND_CUES.snip&&read('public/sound-kit.js').includes("case 'snip':"),'a short sample of its own, made like the other cues');
 const doc=new EventTarget();doc.hidden=false;const ctx=new Context();
 const audio=createFarmAudio({contextFactory:()=>ctx,storage:{getItem:()=>JSON.stringify({ambience:0}),setItem(){}},documentRef:doc,windowRef:new EventTarget(),renderSounds:(w,accept)=>{for(const kind of ['snip','harvest'])accept(kind,0,new Float32Array(64),8000);}});
 await audio.unlock();
 assert.ok(audio.snip(0));const low=ctx.sources.length;
 assert.equal(audio.snip(1),false,'within 55 ms of the last one: skipped');assert.equal(ctx.sources.length,low);
 ctx.currentTime+=SNIP_GAP+.001;assert.ok(audio.snip(5));assert.equal(ctx.sources.at(-1).playbackRate.value,2,'an octave up');
 ctx.currentTime+=.01;assert.ok(audio.play('harvest'),'the chime on release is not held back by the snips');
 audio.setSettings({effects:0});ctx.currentTime+=1;assert.equal(audio.snip(0),false,'the effects volume applies');
 audio.dispose();
 assert.equal(HAPTICS.sweep,8,'a short tick per field on a phone');
});

test('the tool in the hand: a sickle over a ripe crop, a watering can, a seed bag and (Oct 2026) gloves for care, with the inline drawings as the cursor until a picture is there',()=>{
 // Before a painted picture has loaded (and in these tests, where nothing loads) the inline drawing is the cursor; care has none.
 assert.match(toolCursor('harvest'),/^url\("data:image\/svg\+xml,%3Csvg%20width%3D%2232%22%20height%3D%2232%22.*"\) 9 12, pointer$/);
 assert.match(toolCursor('water'),/^url\("data:image\/svg\+xml,.*"\) 4 11, pointer$/);assert.match(toolCursor('plant'),/, pointer$/);
 assert.equal(toolCursor('tend'),'','care: a plain pointer until the gloves are there');assert.equal(toolCursor(null),'');
 for(const tool of Object.values(TOOL_ART))if(tool.svg)assert.match(tool.svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 48 48">/);
 assert.deepEqual(Object.keys(TOOL_ART).filter(a=>TOOL_ART[a].svg),['harvest','water','plant'],'the three drawings stay as the fallback');
 // Review (Oct 2026): made once per tool (asked on every mouse move), and the cursor value is no text for the translation catalog.
 assert.equal(toolCursor('harvest'),toolCursor('harvest'));
 const texts=Object.keys(extract());assert.ok(!texts.some(t=>/pointer|svg\+xml/.test(t)),'", pointer" is not a text to translate');
 // A press starts afresh: no sickle at an old mouse spot for a finger, no tilt from an earlier drag; no ring left after a sweep.
 const game=read('public/game.js');
 assert.match(game,/addEventListener\('pointerdown',e=>\{lastPointer=\{x:e\.clientX,y:e\.clientY,type:e\.pointerType\};pointerDx=0;\}\);/);
 assert.match(game,/const run=sweepRun;sweepRun=null;sweepTool\.hide\(\);swept\.clear\(\);highlight\(-1\);/);
});

// The painted tools (Oct 2026): the owner's sickle, watering can, seed bag and gloves, WebP like every game picture and listed in
// visual-icons.js, 256 px square with a transparent background; the hot spot is each one's working point.
test('the four painted tools are 256 px WebP pictures with transparency, listed in visual-icons.js, each with its working point inside the picture',()=>{
 const files={harvest:'tool-sickle',water:'tool-can',plant:'tool-seeds',tend:'tool-gloves'};
 assert.deepEqual(Object.keys(TOOL_ART),Object.keys(files));assert.equal(TOOL_SIZE,256);
 for(const [action,name] of Object.entries(files)){
  const tool=TOOL_ART[action];
  assert.equal(tool.picture,`/assets/icons/${name}.webp`);assert.equal(tool.picture,pictureFile(name),'the path comes from visual-icons.js');
  assert.ok(ART_KEYS.includes(name));assert.match(art(name),new RegExp(`src="/assets/icons/${name}\\.webp"`));
  const webp=readFileSync(new URL(`../public${tool.picture}`,import.meta.url));
  assert.equal(webp.toString('latin1',0,4),'RIFF');assert.equal(webp.toString('latin1',8,16),'WEBPVP8X',`${name}: an extended WebP`);
  assert.ok(webp[20]&0x10,`${name} keeps its transparency`);
  assert.deepEqual([1+webp.readUIntLE(24,3),1+webp.readUIntLE(27,3)],[TOOL_SIZE,TOOL_SIZE],`${name} is 256 px square`);
  assert.ok(webp.length<30000,`${name} stays small`);
  assert.ok(!existsSync(new URL(`../public/assets/icons/${name}.png`,import.meta.url)),'no PNG');
  assert.ok(tool.hot.every(v=>Number.isInteger(v)&&v>=0&&v<TOOL_SIZE),`${name}: the hot spot is inside the picture`);
 }
 // Each hot spot is the working point: the sickle's blade tip and the leaf the gloves hold are at the top left, the can's rose a
 // little lower, the bag's opening further in.
 assert.deepEqual(TOOL_ART.harvest.hot,[47,10]);assert.deepEqual(TOOL_ART.water.hot,[52,54]);assert.deepEqual(TOOL_ART.plant.hot,[100,84]);assert.deepEqual(TOOL_ART.tend.hot,[10,16]);
 assert.doesNotMatch(read('public/sweep-tools.js'),/\.png/,'no PNG picture is asked for');
});

// A small stand-in for the page: elements with children, attributes, listeners and style properties (the tool in the hand and the ghost).
function fakeDoc(){
 const doc={};
 class El{
  constructor(tag){Object.assign(this,{tagName:tag.toUpperCase(),ownerDocument:doc,dataset:{},children:[],listeners:{},attrs:{},parentNode:null,classList:{toggle(){},add(){},remove(){}},style:{props:{},setProperty(k,v){this.props[k]=v;}}});}
  setAttribute(k,v){this.attrs[k]=v;}addEventListener(type,fn){this.listeners[type]=fn;}remove(){this.removed=true;}
  append(c){this.children.push(c);c.parentNode=this;}replaceChildren(...c){this.children=c;for(const x of c)x.parentNode=this;}
  set outerHTML(html){const p=this.parentNode;p.children=p.children.map(c=>c===this?{html}:c);this.parentNode=null;}
 }
 doc.createElement=tag=>new El(tag);doc.body=new El('body');
 return doc;
}

test('once a painted tool has loaded it is the cursor: drawn once at 40 px (and 80 px for sharp screens) as a PNG, its working point the hot spot; a picture that cannot load keeps the drawing',async()=>{
 const keys=['document','Image','CSS'],saved=Object.fromEntries(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const images=[],drawn=[];let unreadable=false;
 globalThis.Image=class{constructor(){images.push(this);}};
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');const c={width:0,height:0,getContext:()=>({drawImage:(img,x,y,w,h)=>drawn.push([img.src,w,h])}),toDataURL(type){if(unreadable)throw new Error('tainted');return `data:${type};base64,${c.width}`;}};return c;}};
 globalThis.CSS={supports:(prop,value)=>prop==='cursor'&&value.startsWith('image-set(')};
 try{
  const {toolCursor:cursor,createSweepTool:hold}=await import('../public/sweep-tools.js?browser');
  assert.match(cursor('harvest'),/^url\("data:image\/svg\+xml,/,'the drawing until the picture is there');
  assert.equal(images.length,1);assert.equal(images[0].src,'/assets/icons/tool-sickle.webp');
  cursor('harvest');cursor('harvest');assert.equal(images.length,1,'loaded once');
  images[0].onload();
  assert.equal(cursor('harvest'),'image-set(url("data:image/png;base64,40") 1x, url("data:image/png;base64,80") 2x) 7 2, url("data:image/png;base64,32") 6 1, pointer','then the same tool at 32 px, which Chrome takes near the window edge');
  assert.deepEqual(drawn,[['/assets/icons/tool-sickle.webp',40,40],['/assets/icons/tool-sickle.webp',80,80],['/assets/icons/tool-sickle.webp',32,32]]);assert.equal(CURSOR_PX,40);
  // Where a browser takes no image-set for a cursor: the 40 px picture alone. Care gets its gloves.
  globalThis.CSS={supports:()=>false};
  assert.equal(cursor('tend'),'');images[1].onload();assert.equal(cursor('tend'),'url("data:image/png;base64,40") 2 3, url("data:image/png;base64,32") 1 2, pointer');
  // Once the gloves have loaded, a care sweep holds them (48 px, the leaf tip on the pointer).
  const doc=fakeDoc(),tool=hold({doc}),hand=doc.body.children[0];
  tool.show('tend');const [gloves]=hand.children;assert.equal(gloves.tagName,'IMG');assert.equal(gloves.src,'/assets/icons/tool-gloves.webp');
  assert.deepEqual(hand.style.props,{'--hot-x':'1.875px','--hot-y':'3px'});assert.equal(tool.move(10,20),true,'care has a tool in the hand now');
  // A picture that cannot load, or a canvas that cannot be read, keeps the drawing.
  cursor('water');images[2].onerror?.();assert.match(cursor('water'),/^url\("data:image\/svg\+xml,.*"\) 4 11, pointer$/);
  unreadable=true;cursor('plant');images[3].onload();assert.match(cursor('plant'),/^url\("data:image\/svg\+xml,.*"\) 6 6, pointer$/);
 }finally{for(const k of keys){if(saved[k])Object.defineProperty(globalThis,k,saved[k]);else delete globalThis[k];}}
});

test('in the hand and in Show me the tool is the painted picture (an <img>), with its working point scaled to the size shown; the drawing if it cannot load',()=>{
 const doc=fakeDoc();
 const tool=createSweepTool({doc}),hand=doc.body.children[0];
 // Review (Oct 2026): care has no drawing, so until its gloves have loaded (here nothing loads) the hand stays empty and the cursor
 // keeps its plain pointer: game.js hides the cursor only while move() says a tool is in the hand.
 tool.show('tend');assert.equal(hand.children.length,0);assert.equal(tool.move(10,20),false,'no hidden cursor without a tool in the hand');assert.equal(hand.hidden,true);
 tool.show('harvest');let [img]=hand.children;
 assert.equal(img.tagName,'IMG');assert.equal(img.src,'/assets/icons/tool-sickle.webp');assert.equal(img.alt,'');assert.equal(img.draggable,false);
 assert.deepEqual(hand.style.props,{'--hot-x':`${47*48/256}px`,'--hot-y':`${10*48/256}px`},'48 px in the hand');
 assert.equal(tool.move(10,20),true);
 img.listeners.error();assert.equal(hand.children[0].html,TOOL_ART.harvest.svg,'the drawing if the picture cannot load');
 assert.deepEqual(hand.style.props,{'--hot-x':'14px','--hot-y':'18px'},'with the drawing\'s own working point');
 const ghost=createSweepGhost({doc,win:{requestAnimationFrame:()=>1,cancelAnimationFrame(){},performance:{now:()=>0}},reducedMotion:true});
 ghost.start(()=>[{x:0,y:0}]);const shown=doc.body.children.at(-1);
 assert.match(shown.className,/sweep-ghost/);assert.equal(shown.children[0].src,'/assets/icons/tool-sickle.webp','Show me: the painted sickle');
 assert.deepEqual(shown.style.props,{'--hot-x':`${47*56/256}px`,'--hot-y':`${10*56/256}px`},'56 px');
 ghost.stop();assert.ok(shown.removed);
 // Either picture swings around its working point; reduced motion has no swing.
 const css=read('public/ui-polish.css');
 assert.match(css,/\.sweep-tool>\*\{width:100%;height:100%;display:block;transform-origin:var\(--hot-x,24px\) var\(--hot-y,24px\)\}/);
 assert.match(css,/\.sweep-tool\.is-cutting>\*\{animation:sweep-swing \.22s ease-out\}/);
});

test('Show me for the first basket: the ghost sickle comes in over the first field, holds, sweeps over the others and lifts away',()=>{
 const pts=[{x:0,y:0},{x:100,y:0},{x:200,y:0}];
 assert.equal(ghostPose([],.5),null);
 const fade=ghostPose(pts,.06);assert.deepEqual([fade.x,fade.y],[0,0]);assert.ok(fade.opacity>0&&fade.opacity<1);
 assert.equal(ghostPose(pts,.2).press,1,'it holds the first field (a finger holds before it sweeps)');
 const mid=ghostPose(pts,.55);assert.ok(mid.x>0&&mid.x<200&&mid.y===0);assert.ok(mid.dx>0,'facing the way it goes');
 assert.ok(ghostPose(pts,.6).x>=mid.x,'always onward');assert.deepEqual([ghostPose(pts,.79).x,ghostPose(pts,.9).x],[ghostPose(pts,.79).x,200]);
 assert.ok(ghostPose(pts,.99).opacity<.1);
 const one=ghostPose([{x:5,y:6}],.5);assert.deepEqual([one.x,one.y],[5,6],'a single ripe field: it stays over it');
 const game=read('public/game.js');
 assert.match(game,/firstBasket=target==='harvest'&&beginnerProgress\(state\)\.find\(q=>q\.current\)\?\.id==='harvest'/);
 assert.match(game,/const firstBasketGhost=\(\)=>sweepGhost\.start\(\(\)=>\{if\(state\.stats\.harvested>0\)return null;/,'until the first harvest');
 assert.match(game,/coach\.stop\(\);sweepGhost\.stop\(\);/,'one Show me at a time');
 assert.doesNotMatch(read('public/sweep-tools.js'),/showModal|<dialog|\.open\(/,'no popup');
});

test('per field only the field and three header numbers are drawn; the full redraw, the sum and the chime wait for release; bursts and flights are capped',()=>{
 const game=read('public/game.js'),field=game.match(/\nfunction sweepField\(id,action\)\{([\s\S]*?)\n\}\n/)[1],end=game.match(/\nfunction endSweep\(\)\{([\s\S]*?)\n\}\n/)[1];
 assert.doesNotMatch(field,/updateUI\(|floatReward\(|icons\(/,'no full redraw per field');
 assert.match(field,/const result=run\.handle\.add\(id\);if\(!result\)return false;\n[\s\S]*?swept\.add\(id\);v\.ring\.visible=true;/,'a field the rules refuse is not lit');
 assert.match(field,/hudNumbers\(\)/);assert.match(field,/particleBurst\(id,false,5\)/,'5 particles a field instead of 13');assert.match(field,/run\.flights=run\.flights\.filter\(t=>now-t<900\);if\(run\.flights\.length<8\)\{run\.flights\.push\(now\);harvestFlight\(id,f\.crop,1\);\}/,'one picture a field, at most 8 in the air');
 assert.match(field,/farmAudio\.snip\(n\);haptic\('sweep'\);sweepTool\.cut\(\);/);assert.match(field,/drawCrop\(id,run\.tilt\)/);
 assert.match(end,/floatReward\(last,/);assert.match(end,/soundForAction\(\{type:'fields',action\},result,run\.level,levelProgress\(state\)\.level\)/);assert.match(end,/beginner\?\.afterAction\(result\)/);
 assert.match(game,/function hudNumbers\(\)\{[\s\S]*?fitText\(\$\('coins'\)\);[\s\S]*?\$\('xp-text'\)[\s\S]*?\$\('stock-count'\)/);assert.match(game,/function updateUI\(\)\{\n hudNumbers\(\);/);
 // Reduced motion keeps the rings and sounds, without flights, bursts or swings.
 assert.match(game,/function particleBurst\(id,water=false,count=13\)\{\n if\(reducedMotion\)return;/);assert.match(game,/function flyToMarket\(x,y,z,html,count,delay=0\)\{\n if\(reducedMotion\)return;/);
 assert.match(game,/createSweepTool\(\{reducedMotion\}\),sweepGhost=createSweepGhost\(\{reducedMotion\}\)/);assert.match(read('public/ui-polish.css'),/@media\(prefers-reduced-motion:reduce\)\{\.sweep-tool\.is-cutting>\*\{animation:none\}\}/);
 assert.match(game,/if\(target\?\.type==='plot'\)world\.style\.cursor=toolCursor\(sweepAction\(target\)\)\|\|'pointer';/,'the hover cursor');
});

test('the texts say how: computer hints and step 1 sweep first, the wiki mouse first and then touch, and the loading tip',()=>{
 const game=read('public/game.js'),wiki=read('public/wiki-content.js'),tips=read('public/loading-screen.js');
 assert.ok(game.includes("'Click a ripe crop, or hold the mouse button and sweep over your crops to harvest them all. Drag the grass to move the view.'"));
 assert.match(game,/Hold the mouse button and sweep over empty fields to plant them all\. Drag the grass to move the view\./);
 assert.doesNotMatch(game,/Hold and drag to move the view/,'a drag from a ripe or empty field sweeps; the grass moves the view');
 assert.equal(BEGINNER_QUESTS[0].description,'Sweep across your ripe corn to harvest it, or tap one.');
 assert.ok(game.includes("'Sweep across your ripe corn to harvest it, or tap one.'"),'Show me says it too');
 const section=wiki.match(/\['harvest','Swipe across fields',`([^`]*)`\]/)[1];
 assert.ok(section.indexOf('With a mouse')===0&&section.indexOf('With a mouse')<section.indexOf('On a touchscreen'),'mouse first, then touch');
 assert.match(wiki,/With a mouse, a drag with the right button moves it from anywhere\./);
 assert.match(tips,/\['instant-harvest','Hold the mouse button on a ripe crop and sweep across your fields to harvest them all\. On a phone, hold a field for a moment first\.'\]/);
 assert.match(read('public/farm.html'),/Click to work · Sweep across crops · Drag the grass to explore/);
});
