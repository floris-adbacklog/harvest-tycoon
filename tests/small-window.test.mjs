// Small windows (16 Oct 2026, the owner, from Kongregate without full screen: the game in a box of about 1000 x 620, level 19, 16 fields
// of red cabbage all at "7h 33m"). The owner chose all seven: one label for a group of the same timers, a compact and opaque Next goal
// card, a Starter Pack price that stays in its own button (at every size), building pictures without names, one column of side tools, a
// smaller map, and full screen on Kongregate. One query says what a small window is (public/small-window.js SMALL_WINDOW, the same words
// in desktop-hud.css); phones and bigger windows keep their own layout.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {SMALL_WINDOW,smallWindow,timerKey,timerGroups,fullScreenChoice,createFullScreenOffer,FULL_SCREEN_TIP,FULL_SCREEN_TIP_KEY,FULL_SCREEN_TIP_WAIT_MS} from '../public/small-window.js';
import {createMinimap} from '../public/minimap.js';
import {CROPS,canWater} from '../public/farm-state.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const MIN=60000,HOUR=60*MIN;
// The rules of a stylesheet with the @media they sit in ('' at the top level), comments left out.
function rules(css){
 const out=[],stack=[];let start=0;css=css.replace(/\/\*[\s\S]*?\*\//g,m=>' '.repeat(m.length));
 for(let i=0;i<css.length;i++){
  if(css[i]==='{'){const head=css.slice(start,i).trim();if(head.startsWith('@')){stack.push(head);start=i+1;continue;}const end=css.indexOf('}',i);out.push({media:stack.join(' '),selector:head,body:css.slice(i+1,end)});i=end;start=i+1;}
  else if(css[i]==='}'){stack.pop();start=i+1;}
 }
 return out;
}
const HUD=read('public/desktop-hud.css'),SMALL=rules(HUD).filter(r=>r.media.startsWith(`@media${SMALL_WINDOW}`));
const rule=selector=>SMALL.find(r=>r.selector===selector)?.body??'';
// A small window by the query's own words, for a window of width x height with a mouse (fine) or a touch screen (coarse).
const matches=(query,{width,height,pointer='fine'})=>query.split(',').some(part=>part.split(' and ').every(cond=>{
 const [,name,value]=cond.trim().match(/^\(([a-z-]+):([a-z0-9]+)\)$/);const n=parseFloat(value);
 return name==='min-width'?width>=n:name==='max-width'?width<=n:name==='min-height'?height>=n:name==='max-height'?height<=n:name==='pointer'?pointer===value:false;
}));
const PHONE='(max-width:900px),(max-height:550px) and (pointer:coarse)';

test('one query for every small window: a computer window 700 px high or less, in desktop-hud.css as in small-window.js',()=>{
 assert.equal(SMALL_WINDOW,'(min-width:901px) and (max-height:700px) and (min-height:551px),(min-width:901px) and (max-height:700px) and (pointer:fine)');
 assert.ok(HUD.includes(`@media${SMALL_WINDOW}{`),'desktop-hud.css writes the same words');
 assert.equal(HUD.split(`@media${SMALL_WINDOW}{`).length,2,'one block for all of it');
 assert.ok(SMALL.length>20);
 for(const [size,want] of [[{width:1000,height:620},true],[{width:1024,height:640},true],[{width:1100,height:700},true],[{width:960,height:540},true],[{width:1000,height:480},true],
  [{width:1000,height:701},false],[{width:1440,height:900},false],[{width:390,height:844},false],[{width:800,height:600},false],[{width:1000,height:500,pointer:'coarse'},false]])
  assert.equal(matches(SMALL_WINDOW,size),want,JSON.stringify(size));
 // Never where the phone layout is (mobile-ui.js mobileLayout, mobile.css): that one runs to 900 px wide.
 assert.match(read('public/mobile-ui.js'),/matchMedia\('\(max-width: 900px\), \(max-height: 550px\) and \(pointer: coarse\)'\)/);
 for(let width=320;width<=1600;width+=20)for(let height=320;height<=1000;height+=20)for(const pointer of ['fine','coarse'])
  assert.ok(!(matches(SMALL_WINDOW,{width,height,pointer})&&matches(PHONE,{width,height,pointer})),`${width}x${height} ${pointer}`);
 assert.equal(smallWindow.matches,false,'no window in node: never small');
 const game=read('public/game.js');
 assert.match(game,/\nimport \{ smallWindow,timerKey,timerGroups,createFullScreenOffer \} from '\.\/small-window\.js';\n/);
 assert.match(read('public/farm.html'),/<link rel="modulepreload" href="\/small-window\.js">/,'preloaded with the rest of the game');
});

// 1. The timers.
const plot=(over={})=>({crop:'redcabbage',plantedAt:0,readyAt:12*HOUR,careAt:3.6*HOUR,watered:true,tended:true,fertilized:false,...over});
test('the same timers that stand together are one label over the group\'s middle field, with how many',()=>{
 // 16 fields of red cabbage planted in one sweep (a few hundred ms apart), watered and cared for, 7h 33m to go.
 const now=12*HOUR-(7*HOUR+33*MIN),fields=Array.from({length:16},(_,i)=>plot({plantedAt:i*40,readyAt:12*HOUR+i*40}));
 const keys=fields.map(p=>timerKey(p,now));
 assert.equal(new Set(keys).size,1,'one crop, one look');
 const {lead,count}=timerGroups(keys,fields.map(p=>p.readyAt));
 assert.deepEqual(lead,Array(16).fill(10),'field 11, the middle one in front, stands for all');
 assert.equal(count[10],16);assert.equal(count.filter(n=>n>1).length,1);
 // A row of three: the middle one. Two side by side or one behind the other: the one in front (larger number).
 assert.deepEqual(timerGroups(['a','a','a',null]).lead,[1,1,1,3]);
 assert.deepEqual(timerGroups(['a','a',null,null]).lead,[1,1,2,3]);
 assert.deepEqual(timerGroups(['a',null,null,null,'a']).lead,[4,1,2,3,4]);
 assert.deepEqual(timerGroups(['a',null,null,null,'a']).count,[1,1,1,1,2]);
 // An L (fields 1, 5, 9, 10 and 11): the field nearest the group's centre; of 5 and 10, as near, the one in front.
 const l=timerGroups(['a',null,null,null,'a',null,null,null,'a','a','a',null]);
 assert.deepEqual(l.lead,[9,1,2,3,9,5,6,7,9,9,9,11]);assert.equal(l.count[9],5);
});

test('only fields that touch side by side or front to back count as together; another crop or look, or a minute apart, is another group',()=>{
 // The end of one row and the start of the next are not neighbours, nor are fields corner to corner.
 assert.deepEqual(timerGroups([null,null,null,'a','a',null,null,null]).lead,[0,1,2,3,4,5,6,7]);
 assert.deepEqual(timerGroups(['a',null,null,null,null,'a',null,null]).count,[1,1,1,1,1,1,1,1]);
 // The same timer twice, apart: two groups.
 const apart=timerGroups(['a','a',null,'a','b','b','b','a']);
 assert.deepEqual(apart.lead,[1,1,2,7,5,5,5,7]);assert.deepEqual([apart.count[1],apart.count[5],apart.count[7]],[2,3,2]);
 const now=HOUR;
 assert.equal(timerKey(plot({readyAt:5*HOUR}),now),timerKey(plot({readyAt:5*HOUR+MIN}),now),'when it is ready is timerGroups\' part');
 // Ready less than a minute from the group's first field: together, also across a whole minute of the clock (16 Oct 2026 review: a
 // sweep across one was two labels side by side with the same time, for all of the growing). A minute or more: another group, and a
 // group never drifts minute by minute along a row.
 assert.deepEqual(timerGroups(['a','a',null,null],[0,59999]).lead,[1,1,2,3]);
 assert.deepEqual(timerGroups(['a','a',null,null],[0,MIN]).lead,[0,1,2,3],'a minute apart');
 assert.deepEqual(timerGroups(['a','a',null,null],[MIN,0]).lead,[0,1,2,3],'either way');
 assert.deepEqual(timerGroups(['a','a','a',null],[0,50000,100000]).lead,[1,1,2,3],'not a chain of minutes');
 // 16 fields sown 300 ms apart (4.5 s), starting anywhere in a minute, 2 s before a whole one among them: always one label.
 for(let start=0;start<MIN;start+=250){
  const readyAt=Array.from({length:16},(_,i)=>30*HOUR+start+i*300),fields=readyAt.map(at=>plot({plantedAt:at-12*HOUR,readyAt:at})),{lead,count}=timerGroups(fields.map(p=>timerKey(p,now)),readyAt);
  assert.deepEqual([new Set(lead).size,count[lead[0]]],[1,16],`starting ${start} ms into a minute`);
 }
 const across=Array.from({length:16},(_,i)=>30*HOUR-2000+i*300);
 assert.ok(across.some(at=>at%MIN<2000)&&across.some(at=>at%MIN>MIN-2000),'both sides of a whole minute');
 assert.equal(timerGroups(Array(16).fill('a'),across).count.filter(n=>n>1).length,1);
 assert.notEqual(timerKey(plot(),now),timerKey(plot({crop:'cabbage'}),now),'another crop');
 assert.notEqual(timerKey(plot(),now),timerKey(plot({watered:false}),now),'not watered: another look');
 assert.ok(Object.hasOwn(CROPS,'redcabbage'));
 assert.deepEqual(timerGroups([]),{lead:[],count:[]});
});

test('a field that asks for a tap keeps its own label: ready, extra care; an empty field has none; one that may be watered groups',()=>{
 const now=5*HOUR;
 assert.notEqual(timerKey(plot(),now),null,'growing, watered and cared for');
 assert.equal(timerKey(plot({readyAt:now}),now),null,'ready to harvest');
 assert.equal(timerKey(plot({readyAt:now-1}),now),null);
 // A field that may still be watered groups with the fields that look like it (16 Oct 2026 review: its label is just like any other, and
 // a fresh planting is waterable until care opens, so the owner's pile of 16 stayed); its ring stays green, not the watered blue.
 const fresh=plot({watered:false,tended:false,plantedAt:now-30000,careAt:now+HOUR}),waiting=plot({watered:false,tended:false,careAt:now+HOUR});
 assert.ok(canWater(fresh,now)&&canWater(waiting,now),'both may be watered');
 assert.notEqual(timerKey(fresh,now),null,'water: right after planting');assert.equal(timerKey(fresh,now),timerKey(waiting,now),'water: until care opens');
 assert.notEqual(timerKey(fresh,now),timerKey(plot(),now),'not watered: another look');
 assert.equal(timerKey(plot({tended:false,careAt:now-1}),now),null,'extra care is ready');
 assert.notEqual(timerKey(plot({tended:false,careAt:now+MIN}),now),null,'care not open yet, watered: nothing to tap');
 assert.equal(timerKey(plot({crop:null}),now),null);assert.equal(timerKey(undefined,now),null);
 // Among 16 together, the one asking for care keeps its own label and the 15 others are still one.
 const keys=Array.from({length:16},(_,i)=>timerKey(plot(i===5?{tended:false,careAt:now-1}:{}),now)),{lead,count}=timerGroups(keys,Array(16).fill(12*HOUR));
 assert.equal(lead[5],5);assert.equal(count[5],1);assert.equal(count[lead[0]],15);
 // The owner's farm right after planting (the lab stage's care=wait): 16 red cabbages, not yet watered, care in an hour. One label.
 const sown=Array.from({length:16},(_,i)=>plot({plantedAt:now-30000+i*250,readyAt:now-30000+i*250+12*HOUR,careAt:now+HOUR,watered:false,tended:false})),owner=timerGroups(sown.map(p=>timerKey(p,now)),sown.map(p=>p.readyAt));
 assert.deepEqual([new Set(owner.lead).size,owner.count[owner.lead[0]]],[1,16]);
});

test('the game groups the labels in a small window only, cheaply, and a grouped field\'s label steps aside but its field still works',()=>{
 const game=read('public/game.js'),body=game.slice(game.indexOf('function positionLabels(){'),game.indexOf('function pointerTarget('));
 assert.match(body,/const t=farmNow\(\),groups=smallWindow\.matches\?timerGroups\(plots\.map\(\(v,i\)=>v\.label\.hidden\?null:timerKey\(state\.plots\[i\],t\)\),state\.plots\.map\(p=>p\.readyAt\)\):null;/,'fields on screen, nothing measured');
 assert.match(body,/v\.grouped=Boolean\(groups\)&&groups\.lead\[i\]!==i;v\.label\.classList\.toggle\('is-grouped',v\.grouped\);/);
 assert.match(body,/if\(n>1\)\{const text=`\$\{n\} ×`;if\(!count\)\{count=document\.createElement\('i'\);count\.className='plot-timer-count';v\.label\.querySelector\('\.plot-timer-time'\)\?\.before\(count\);\}/,'"16 × 7h 33m", the crop\'s picture as before');
 assert.match(body,/if\(!groups&&!v\.grouped&&!v\.counted\)continue;/,'a phone or a big window touches no label');
 assert.equal(body.match(/getBoundingClientRect/g).length,1,'only the phone\'s own pass measures');
 assert.match(game,/\$\{p\.tended\?' tended':''\}\$\{v\.grouped\?' is-grouped':''\}`;/,'each tick keeps the label aside');
 assert.match(game,/if\(!state\.plots\[i\]\.crop\|\|v\.label\.hidden\|\|v\.grouped\)continue;/,'a tap on a grouped field is the field\'s own, never a hidden label\'s');
 assert.match(rule('.plot-label.is-grouped:not(:focus-visible)'),/^opacity:0$/,'still there for the keyboard');
 assert.match(rule('.plot-timer-count'),/font-style:normal/);
 assert.doesNotMatch(read('public/retention.css'),/is-grouped/,'only in a small window');
});

// 2. The Next goal card.
test('the Next goal card is opaque and above the map labels at every size, and compact in a small window',()=>{
 const card=rules(read('public/beginner.css')).filter(r=>r.selector==='.next-goal-card');
 assert.ok(card.some(r=>r.media===''&&/background:#fffdf5(;|$)/.test(r.body)),'opaque (it was #fffdf5f5), at every size');
 const z=rules(read('public/styles.css')).find(r=>r.media===''&&/(^|,)\.quest-card(,|$)/.test(r.selector)&&/z-index:/.test(r.body)).body.match(/z-index:(\d+)/)[1];
 assert.equal(Number(z),6);
 for(const file of readdirSync(new URL('../public/',import.meta.url)).filter(f=>f.endsWith('.css')))
  for(const r of rules(read(`public/${file}`)))if(/(building|utility|plot|pond|activity|landmark)-label|#(plot|building)-labels/.test(r.selector)&&/z-index:\d/.test(r.body))
   assert.ok(Number(r.body.match(/z-index:(\d+)/)[1])<Number(z),`${file}: ${r.selector} stays under the card`);
 assert.match(rule('.next-goal-card'),/^width:220px$/,'narrower (270 px elsewhere)');
 // What to do shows while the mouse is on the card or it has focus, under its button (16 Oct 2026 review: above it, it pushed the
 // button 32 px away from the mouse aiming at it); the kind of goal only while the mouse is on the heading. Nothing else changes on hover.
 assert.equal(rule('.next-goal-card:not(:hover,:focus-within) #next-goal-description'),'display:none');
 assert.equal(rule('.next-goal-card .quest-heading:not(:hover,:focus-within) #next-goal-kind'),'display:none');
 assert.deepEqual(SMALL.filter(r=>/:hover|:focus-within/.test(r.selector)&&/next-goal/.test(r.selector)).map(r=>r.selector),['.next-goal-card:not(:hover,:focus-within) #next-goal-description','.next-goal-card .quest-heading:not(:hover,:focus-within) #next-goal-kind']);
 assert.equal(rule('#next-goal-body:not([hidden])'),'display:flex;flex-direction:column','folded, the body stays hidden');
 assert.equal(rule('#next-goal-description'),'order:1','after the button');
 assert.ok(!SMALL.some(r=>r.selector!=='#next-goal-description'&&/(^|;)order:/.test(r.body)),'the button and all above it keep their place');
 const html=read('public/farm.html');assert.ok(html.indexOf('id="next-goal-description"')<html.indexOf('id="next-goal-button"'),'in the page it comes before the button');
 for(const part of ['#next-goal-title','#next-goal-note','#next-goal-meter','#next-goal-button','#next-goal-progress','.next-goal-note','.quest-progress'])
  assert.ok(!SMALL.some(r=>r.selector.includes(part)&&/display:none|visibility:hidden/.test(r.body)),`${part} stays`);
 assert.match(rule('.next-goal-card #next-goal-button'),/min-height:32px/);
});

// 3. The Starter Pack's price.
test('the Starter Pack\'s price stays inside its own chip at every size: the chip is as wide as its price',()=>{
 const css=read('public/starter-pack.css'),all=rules(css);
 const top=selector=>all.filter(r=>r.selector===selector&&r.media==='').map(r=>r.body).join(';');
 assert.match(top('#starter-pack-chip'),/min-width:max-content/,'at least as wide as what is in it');
 assert.equal(top('#starter-pack-chip>*'),'grid-area:1/1','the crate and the price share one cell');
 const price=top('#starter-pack-chip small');
 assert.match(price,/^align-self:end;margin:0 -4px -8px;/,'over the chip\'s bottom edge as before, over its side padding only');
 assert.doesNotMatch(price,/position:absolute|translateX|left:50%/,'no longer hung out of the chip');
 assert.match(price,/font:700 12px\/1\.3 'DM Sans'/,'as readable as before');
 assert.equal(top('#starter-pack-chip small.is-long'),'letter-spacing:-.3px');
 assert.ok(!all.some(r=>r.media&&r.selector.startsWith('#starter-pack-chip small')),'no size of its own: every window');
 // Kongregate's price comes as its own text ("30 Kreds"); a long one gets is-long, as on the phone's tile.
 assert.match(read('src/starter-pack-ui.js'),/small\.textContent=price;small\.classList\.toggle\('is-long',price\.length>6\);/);
 assert.match(read('public/pass.css'),/>:is\(#offer-chip,#starter-pack-chip\)\{width:36px;padding-inline:3px\}/,'the pass\'s narrow chip: a longer price wins over its width');
});

// 4. Building names.
test('in a small window a building shows its picture; its name on hover (the farm\'s tooltip) and focus, and in its aria-label',()=>{
 assert.equal(rule('.building-label>span:nth-child(2)'),'display:none');
 assert.equal(rule('.building-label:focus-visible>span:nth-child(2)'),'display:block');
 assert.match(rule('.building-label'),/^gap:0;padding:3px;/);
 const game=read('public/game.js');
 assert.match(game,/else if\(target\.type==='building'\)\{const b=BUILDINGS\[target\.id\];tooltip\.innerHTML=`<strong>\$\{b\.name\}<\/strong>/,'the mouse over a label or its building names it');
 assert.match(game,/for\(const \[type,views\] of \[\['building',buildingViews\]/,'over its label too');
 assert.match(game,/label\.setAttribute\('aria-label',`Open \$\{BUILDINGS\[key\]\.name\}`\);/);
 assert.match(game,/const aria=`\$\{status\.kind==='ready'&&BUILDINGS\[key\]\.type!=='pier'\?'Collect from':'Open'\} \$\{BUILDINGS\[key\]\.name\}`;/);
 // Batches ready to collect keep their number on the picture.
 assert.match(game,/const ready=!locked&&status\.kind==='ready'&&status\.ready>0\?String\(status\.ready\):'';if\(\(v\.label\.dataset\.ready\?\?''\)!==ready\)v\.label\.dataset\.ready=ready;/);
 assert.match(rule('.building-label[data-ready]:not([data-ready=""])::before'),/^content:attr\(data-ready\);position:absolute;/);
 assert.match(read('public/economy-ui.js'),/if\(ready\)return \{text:`\$\{ready\} ready · \$\{jobs\.length\} \/ \$\{slots\} slots`,kind:'ready',\.\.\.counts\};/,'status.ready is the count');
});

// 5. The side tools.
test('in a small window the side tools are one column of smaller buttons that all fit, names beside them on hover, numbers kept',()=>{
 const tools=rule('.side-tools');
 assert.match(tools,/^--tool:clamp\(26px,calc\(\(100dvh - 180px\)\/12\),38px\);top:120px;bottom:auto;grid-template-columns:var\(--tool\);gap:4px;max-height:none;overflow:visible;padding:4px$/);
 assert.match(SMALL.find(r=>r.media.endsWith('@media(max-height:500px)')&&r.selector==='.side-tools').body,/^--tool:clamp\(24px,calc\(\(100dvh - 160px\)\/12\),38px\);top:100px$/,'no map there');
 // All 12 there can be (today, estate, farm, village, buildings, market, boosts, quests, events, leaderboard, invite, email) end above the
 // window's bottom, from the shortest small window up.
 for(let height=448;height<=700;height++){
  const [top,low,room]=height>500?[120,26,180]:[100,24,160],tool=Math.min(38,Math.max(low,(height-room)/12));
  if(height>=(height>500?492:448))assert.ok(top+8+12*tool+11*4<=height,`${height} px`);
 }
 assert.match(rule('.side-tools .side-tool b,.side-tools .side-tool.active b'),/position:absolute;inset-inline-start:calc\(100% \+ 8px\);[^]*background:#fffdf5;[^]*opacity:0;pointer-events:none/,'a cream label beside the button');
 assert.equal(rule('.side-tools .side-tool:is(:hover,:focus-visible) b'),'opacity:1');
 assert.match(rule('.side-tools .side-tool em'),/^min-width:17px;height:17px;/,'the numbers stay (the Market\'s 243)');
 assert.ok(!SMALL.some(r=>/\bem\b/.test(r.selector)&&/display:none/.test(r.body)));
 assert.match(read('public/farm.html'),/<button class="side-tool" id="market-button" aria-haspopup="dialog"><span><i data-lucide="store"><\/i><em id="stock-count" hidden>0<\/em><\/span><b>Market<\/b><\/button>/,'the name is the button\'s own text');
});

// 6. The map.
test('in a small window the map is smaller, and a click on it still goes to the spot under the pointer',()=>{
 assert.equal(rule('.topbar .brand,.minimap'),'width:150px;height:90px');
 // minimap.js measures the picture as it is shown: a click at the same place on a smaller map is the same spot on the farm.
 for(const [width,height] of [[210,126],[150,90]]){
  const listeners={},jumps=[];
  const canvas={width:420,height:252,clientWidth:width,getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true}),addEventListener:(type,fn)=>listeners[type]=fn,setPointerCapture(){},getBoundingClientRect:()=>({left:20,top:20,width,height}),title:''};
  createMinimap({root:{querySelector:()=>canvas},background:{},project:(x,z)=>[x,z],unproject:(x,y)=>[x,y],points:()=>[],view:()=>null,onJump:(x,z)=>jumps.push([x,z])});
  listeners.pointerdown({clientX:20+width/2,clientY:20+height/4,pointerId:1,preventDefault(){}});
  assert.deepEqual(jumps,[[210,63]],`${width}x${height}`);
 }
});

// Names under the mouse need a mouse.
test('names that show under the mouse hide only where there is a mouse: a short touch screen keeps them as before',()=>{
 // A touch screen this short (an older tablet on its side, 1024 x 690) is a small window, and the farm's tooltip is for a mouse only.
 assert.ok(matches(SMALL_WINDOW,{width:1024,height:690,pointer:'coarse'}));
 assert.match(read('public/game.js'),/if\(e\.pointerType!=='mouse'\|\|e\.buttons\)\{highlight\(-1\);\$\('tooltip'\)\.hidden=true;return;\}/);
 const HOVER=`@media${SMALL_WINDOW} @media(hover:hover)`;
 // Whatever hides a name or a text, the one column of side tools, the buildings' pictures and the card's order: all there.
 for(const selector of ['.side-tools','.side-tools .side-tool b,.side-tools .side-tool.active b','.building-label','.building-label>span:nth-child(2)','.building-label[data-ready]:not([data-ready=""])::before','#next-goal-body:not([hidden])','#next-goal-description','.next-goal-card:not(:hover,:focus-within) #next-goal-description','.next-goal-card .quest-heading:not(:hover,:focus-within) #next-goal-kind']){
  const found=SMALL.filter(r=>r.selector===selector);assert.ok(found.length,selector);
  for(const r of found)assert.ok(r.media.startsWith(HOVER),selector);
 }
 for(const r of SMALL.filter(r=>/opacity:0|display:none/.test(r.body)&&r.selector!=='.plot-label.is-grouped:not(:focus-visible)'))assert.ok(r.media.startsWith(HOVER),r.selector);
 // What needs no mouse is for every small window: the map, the grouped timers (one label with how many), the card's size.
 for(const selector of ['.topbar .brand,.minimap','.plot-label.is-grouped:not(:focus-visible)','.plot-timer-count','.next-goal-card','#next-goal-body','.next-goal-card #next-goal-button'])
  assert.equal(SMALL.find(r=>r.selector===selector)?.media,`@media${SMALL_WINDOW}`,selector);
});

// 7. Full screen on Kongregate.
test('full screen on Kongregate in a small window only: a button where the page may go full screen, else one tip',()=>{
 const base={portal:'kongregate',small:true,allowed:true,active:false,tipSeen:false};
 assert.equal(fullScreenChoice(base),'button');
 assert.equal(fullScreenChoice({...base,allowed:false}),'tip');
 assert.equal(fullScreenChoice({...base,allowed:false,tipSeen:true}),null,'once on this device');
 assert.equal(fullScreenChoice({...base,small:false}),null,'a big window');
 assert.equal(fullScreenChoice({...base,active:true}),null,'full screen already');
 for(const portal of [undefined,null,'crazygames','discord'])for(const allowed of [true,false])assert.equal(fullScreenChoice({...base,portal,allowed}),null,`${portal}`);
 assert.equal(FULL_SCREEN_TIP,"Tip: Kongregate's full screen gives your farm more room.");
 assert.equal(FULL_SCREEN_TIP_KEY,'harvest-tycoon:fullscreen-tip');
});

// A farm frame inside a page (Kongregate's, ours, or none) on a clock that only moves when the test moves it.
function frame({portal='kongregate',allowed=true,small=true,storage=new Map(),quiet=()=>false}={}){
 const clock={t:1000},timers=[],shown=[],asked=[],outerListeners={},mediaListeners={};
 const outer={fullscreenEnabled:allowed,fullscreenElement:null,documentElement:{requestFullscreen(){asked.push(1);return Promise.resolve();}},addEventListener:(type,fn)=>outerListeners[type]=fn};
 const parent={document:outer,...(portal?{harvestPortal:{name:portal,features:{}}}:{})},win={parent};
 const media={matches:small,addEventListener:(type,fn)=>mediaListeners[type]=fn};
 const button={hidden:true,onclick:null},store={getItem:k=>storage.has(k)?storage.get(k):null,setItem:(k,v)=>storage.set(k,String(v))};
 const offer=createFullScreenOffer({win,button,small:media,show:text=>shown.push(text),storage:store,quiet,now:()=>clock.t,later:(fn,ms)=>timers.push({fn,at:clock.t+ms})});
 const run=ms=>{clock.t+=ms;for(const timer of timers.splice(0).sort((a,b)=>a.at-b.at)){if(timer.at<=clock.t)timer.fn();else timers.push(timer);}};
 return {offer,button,shown,asked,storage,outer,media,mediaListeners,outerListeners,run,timers};
}

test('the button makes the page around the farm full screen; it hides in a big window and once full screen',async()=>{
 const f=frame();
 assert.equal(f.button.hidden,false);f.button.onclick();assert.equal(f.asked.length,1,'the page around the farm, not the farm\'s own frame');
 f.run(60000);assert.deepEqual(f.shown,[],'no tip where the button is');
 f.outer.fullscreenElement={};f.outerListeners.fullscreenchange();assert.equal(f.button.hidden,true,'full screen: no button');
 f.outer.fullscreenElement=null;f.outerListeners.fullscreenchange();assert.equal(f.button.hidden,false);
 f.media.matches=false;f.mediaListeners.change();assert.equal(f.button.hidden,true,'a big window');
 const refused=frame();refused.outer.documentElement.requestFullscreen=()=>Promise.reject(new Error('no'));assert.doesNotThrow(()=>refused.button.onclick());
 await new Promise(resolve=>setTimeout(resolve,0));
});

test('where Kongregate\'s frame allows no full screen: the tip once on this device, after the welcome and never over a window',()=>{
 let open=true;const f=frame({allowed:false,quiet:()=>open});
 assert.equal(f.button.hidden,true);
 f.run(FULL_SCREEN_TIP_WAIT_MS);assert.deepEqual(f.shown,[],'a window is open');
 open=false;f.run(4000);assert.deepEqual(f.shown,[FULL_SCREEN_TIP]);
 assert.equal(f.storage.get(FULL_SCREEN_TIP_KEY),'seen');
 f.mediaListeners.change();f.run(60000);assert.equal(f.shown.length,1,'once');
 const again=frame({allowed:false,storage:f.storage});again.run(60000);assert.deepEqual(again.shown,[],'not on the next visit');
 const early=frame({allowed:false});early.run(FULL_SCREEN_TIP_WAIT_MS-4001);assert.deepEqual(early.shown,[],'the farm first, 8 seconds');
 const big=frame({allowed:false,small:false});big.run(60000);assert.deepEqual(big.shown,[]);
 big.media.matches=true;big.mediaListeners.change();big.run(FULL_SCREEN_TIP_WAIT_MS);assert.deepEqual(big.shown,[FULL_SCREEN_TIP],'once the window is small');
 const blocked=frame({allowed:false,storage:{get:()=>{throw new Error('blocked');},set:()=>{throw new Error('blocked');},has:()=>{throw new Error('blocked');}}});
 assert.doesNotThrow(()=>blocked.run(60000));
});

test('nothing of it on the website, in the apps or on another portal',()=>{
 for(const portal of [null,'crazygames','discord'])for(const allowed of [true,false]){
  const f=frame({portal,allowed});f.run(60000);
  assert.equal(f.button.hidden,true,`${portal}`);assert.deepEqual(f.shown,[],`${portal}`);f.button.onclick();
 }
 // A page on its own (no frame around it) and one whose parent cannot be read.
 const alone={};alone.parent=alone;const button={hidden:false};
 createFullScreenOffer({win:alone,button,small:{matches:true},show:()=>assert.fail('no tip')});assert.equal(button.hidden,true);
 const sealed={get parent(){throw new Error('cross-origin');}};assert.doesNotThrow(()=>createFullScreenOffer({win:sealed,button,small:{matches:true},show:()=>assert.fail('no tip')}));
});

test('the Full screen button sits with the camera buttons, hidden until it may show; the game starts the offer once the farm is up',()=>{
 const html=read('public/farm.html');
 assert.match(html,/id="zoom-fit" aria-label="Show the whole farm" title="Show the whole farm"><i data-lucide="scan"><\/i><\/button><button class="icon-button" id="fullscreen-button" type="button" aria-label="Full screen" title="Full screen" hidden><i data-lucide="expand"><\/i><\/button><\/div>/,'its own button, not Show the whole farm');
 assert.ok(read('public/lucide-icons.js').includes('"Expand":'),'its icon is in the game\'s set');
 assert.match(HUD,/\n#fullscreen-button\[hidden\]\{display:none\}\n/,'hidden beats the camera buttons\' grid, at every size');
 assert.match(read('public/game.js'),/\n  createFullScreenOffer\(\{button:\$\('fullscreen-button'\),show:text=>toast\(text\),storage:\(\(\)=>\{try\{return localStorage;\}catch\{return null;\}\}\)\(\),quiet:\(\)=>modalOpen\(\)\}\);\n/);
 assert.ok(read('public/privacy.html').includes(`<code>${FULL_SCREEN_TIP_KEY}</code>`),'the device key is in the privacy policy\'s storage table');
});

test('the new texts are in the catalog and in every language, without a middle dot',()=>{
 const all=catalog();
 assert.equal(all[FULL_SCREEN_TIP],'public/small-window.js');assert.ok(all['Full screen']);
 for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){
  const done=translations(code);
  for(const text of [FULL_SCREEN_TIP,'Full screen']){assert.equal(typeof done[text],'string',`${code}: ${text}`);assert.doesNotMatch(done[text],/·/,`${code}: ${text}`);}
  assert.match(done[FULL_SCREEN_TIP],/Kongregate/,code);
 }
 assert.doesNotMatch(read('public/small-window.js'),/ · /);
 assert.ok(JSON.parse(read('i18n/ignore.json')).includes(SMALL_WINDOW),'the query is no text for a player');
});
