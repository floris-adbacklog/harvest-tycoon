import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const THREE=await import('../public/vendor/three.module.js');

// 18 Oct 2026, the owner: "Laat de verschillende views soepeler lopen, nu schiet hij naar een andere view, maar het moet gewoon een stand
// zijn in de views." The farm's camera is one zoom axis (zoomAt): -1 the closest, 0 the fields, 1 the heart of the farm, 2 the whole farm.
// These run game.js's own resize code for the farm's picture: the three stops are exactly the old views, and in between nothing jumps.
const game=read('public/game.js');
const slice=(from,to)=>{const a=game.indexOf(from),b=game.indexOf(to,a);assert.ok(a>0&&b>a,`game.js: ${from.slice(0,50)}`);return game.slice(a,b+to.length);};
const stops=slice("const FARM_STOPS=","];");
const block=slice(' const padding=mobile?','base:from.focus.clone().lerp(to.focus,k)};');
const run=new Function('THREE','s',`${stops}let {width,height,mobile,hudShift,overviewBounds,state,fieldRoom,zoomAt}=s,farmAxis;const villageWorld=false,aspect=width/height,camera={};${block}return {camera,farmAxis};`);
const helpers=new Function('farmAxis',`${slice('function axisOf(at){','\n')}${slice('function atAxis(d){','\n')}return {axisOf,atAxis};`);
// Screen units from the game's angle, as measureFarm counts them: across, and up.
const screen=({x,z})=>[(x-z)/Math.SQRT2,-40*(x+z)/Math.sqrt(8384)];
function view(s,zoomAt){
 const {camera:c,farmAxis}=run(THREE,{...s,zoomAt}),[fx,fy]=screen(farmAxis.base);
 return {...c,farmAxis,base:farmAxis.base,span:c.top-c.bottom,width:c.right-c.left,mx:fx+(c.left+c.right)/2,my:fy+(c.top+c.bottom)/2};
}
// The views as they were before 18 Oct 2026 (game.js at e5852b6): a view and its zoom.
function oldView(s,mode,zoom=1){
 const {width,height,mobile,hudShift,overviewBounds,state,fieldRoom}=s,aspect=width/height;
 const padding=mobile?{left:28,right:28,top:48,bottom:25}:{left:105,right:285,top:125,bottom:155};
 const bounds=overviewBounds??{minX:-27,maxX:27,minY:-18,maxY:18};
 const usableWidth=Math.max(width*.5,width-padding.left-padding.right),usableHeight=Math.max(height*.5,height-padding.top-padding.bottom);
 const overviewSpan=Math.max((bounds.maxY-bounds.minY+3)*height/usableHeight,(bounds.maxX-bounds.minX+3)*height/usableWidth);
 const rows=Math.ceil(state.plots.length/4);
 const fitRoom=height<650&&fieldRoom?fieldRoom:null,fieldFit=fitRoom?(6.1+rows*2.06)*height/(fitRoom.bottom-fitRoom.top):0;
 const fieldSpan=fitRoom?Math.max(24/aspect,(10+2.26*rows)/aspect,fieldFit):Math.max(21,24/aspect,(10+2.26*rows)/aspect,10.6+rows*2.06);
 const homeSpan=Math.min(overviewSpan,Math.max(fieldSpan,mobile?32/aspect:38));
 const span=(mode==='fields'?fieldSpan:mode==='home'?homeSpan:overviewSpan)/zoom;
 const shift=!mobile&&mode!=='overview'?hudShift*span/height:0;
 const lift=mode==='fields'&&fitRoom?((fitRoom.top+fitRoom.bottom)/2-height/2)*span/height+1.25:0;
 let focus;
 if(mode==='fields')focus={x:2.575,z:.25+(rows-1)*3.2/2};
 else if(mode==='home')focus={x:1.4,z:1.5};
 else{const side=(bounds.minX+bounds.maxX)/2+(padding.right-padding.left)*span/(2*height),up=(bounds.minY+bounds.maxY)/2+(padding.top-padding.bottom)*span/(2*height),depth=-up*Math.sqrt(8384)/80;focus={x:side/Math.SQRT2+depth,z:-side/Math.SQRT2+depth};}
 return {left:-span*aspect/2-shift,right:span*aspect/2-shift,top:span/2+lift,bottom:-span/2+lift,focus};
}
const plots=n=>({plots:Array.from({length:n},()=>({}))});
// Phones and computers as the game sizes #world, small farms and big ones (15 rows: the fields as wide as the heart of the farm), a
// level-60 farm's measured outline, and short frames where the fields fill the free room (Kongregate, CrazyGames).
const BIG={minX:-58,maxX:62,minY:-41,maxY:30};
const SCREENS=[
 {name:'phone',width:390,height:708,mobile:true,hudShift:0,overviewBounds:BIG,state:plots(24),fieldRoom:null},
 {name:'phone, new farm',width:390,height:708,mobile:true,hudShift:0,overviewBounds:null,state:plots(8),fieldRoom:null},
 {name:'phone on its side',width:780,height:300,mobile:true,hudShift:0,overviewBounds:BIG,state:plots(24),fieldRoom:{top:40,bottom:250}},
 {name:'computer',width:1440,height:900,mobile:false,hudShift:118,overviewBounds:BIG,state:plots(24),fieldRoom:null},
 {name:'computer, 15 rows',width:1440,height:900,mobile:false,hudShift:118,overviewBounds:BIG,state:plots(60),fieldRoom:null},
 {name:'Kongregate',width:1000,height:560,mobile:false,hudShift:96,overviewBounds:BIG,state:plots(16),fieldRoom:{top:70,bottom:420}},
 {name:'short frame',width:840,height:430,mobile:false,hudShift:80,overviewBounds:null,state:plots(8),fieldRoom:{top:96,bottom:335}}
];
const near=(a,b,what)=>assert.ok(Math.abs(a-b)<1e-9,`${what}: ${a} against ${b}`);

test('the three camera buttons stop exactly on the old views, and the closest end is the fields 2.2 times as close',()=>{
 for(const s of SCREENS)for(const [at,mode,zoom] of [[0,'fields',1],[1,'home',1],[2,'overview',1],[-1,'fields',2.2]]){
  const v=view(s,at),o=oldView(s,mode,zoom);
  for(const side of ['left','right','top','bottom'])near(v[side],o[side],`${s.name} ${mode} at ${zoom}: ${side}`);
  near(v.base.x,o.focus.x,`${s.name} ${mode}: middle x`);near(v.base.z,o.focus.z,`${s.name} ${mode}: middle z`);
 }
});

test('zooming runs smoothly through the views: the width grows with every step, and the middle never jumps sideways',()=>{
 for(const s of SCREENS){
  const steps=3000;let before=view(s,-1),grow=0,slide=0;const {axisOf}=helpers(before.farmAxis);
  for(let i=1;i<=steps;i++){
   const at=-1+3*i/steps,v=view(s,at),along=axisOf(at)-axisOf(-1+3*(i-1)/steps);
   assert.ok(v.span>=before.span-1e-9,`${s.name} at ${at}: never narrower going out`);
   assert.ok(along>0,`${s.name}: every part of the axis has a length`);
   grow=Math.max(grow,Math.log(v.span/before.span)/along);
   slide=Math.max(slide,Math.hypot((v.mx-before.mx)/before.width,(v.my-before.my)/before.span)/along);
   before=v;
  }
  // The width changes by at most its own factor per unit of the axis (exactly that where it grows), and the middle slides at most
  // half a picture per unit: a wheel notch (.18) moves it under a tenth of the picture.
  assert.ok(grow<=1+1e-6,`${s.name}: width ${grow}`);assert.ok(slide<=.5+1e-3,`${s.name}: middle ${slide}`);
  assert.ok(view(s,2).span>=view(s,1.999).span&&view(s,2).span===oldView(s,'overview').top-oldView(s,'overview').bottom,`${s.name}: the whole farm is the widest`);
 }
});

test('a zoom step moves along the axis by its ratio, and the axis can be read back',()=>{
 for(const s of SCREENS){
  const {farmAxis}=view(s,0),{axisOf,atAxis}=helpers(farmAxis);
  for(let at=-1;at<=2;at+=.125)near(atAxis(axisOf(at)),at,`${s.name} at ${at}`);
  assert.equal(atAxis(-5),-1);assert.equal(atAxis(99),2,'the ends hold');
  // Closer than the fields the width follows the ratio exactly (a 1.25 step is a quarter narrower).
  const a=view(s,-.2),b=view(s,atAxis(axisOf(-.2)-Math.log(1.25)));near(a.span/b.span,1.25,`${s.name}: a step in`);
 }
});

test('the camera buttons glide to their stop, + and - glide a step, and nothing switches views any more',()=>{
 assert.doesNotMatch(game,/VIEW_LADDER|ladderStep|ladderAt|viewSpans/,'the old ladder is gone');
 assert.match(game,/\$\('zoom-in'\)\.addEventListener\('click',\(\)=>villageWorld\?zoomFarm\(1\.25\):stepFarm\(1\)\);\$\('zoom-out'\)\.addEventListener\('click',\(\)=>villageWorld\?zoomFarm\(1\/1\.25\):stepFarm\(-1\)\);/);
 assert.match(game,/function resetView\(\)\{viewMode=startView\(\);if\(villageWorld\)\{zoom=1;pan=0;panDepth=0;resize\(\);\}else glideFarm\(FARM_STOPS\.indexOf\(viewMode\),\{stop:viewMode\}\);/);
 assert.match(game,/function showOverview\(\)\{if\(villageWorld\)\{viewMode='overview';zoom=1;pan=0;panDepth=0;resize\(\);\}else glideFarm\(2,\{stop:'overview'\}\);\}/);
 assert.match(game,/function focusFields\(\)\{if\(villageWorld\)\{viewMode='fields';zoom=1;pan=0;panDepth=0;resize\(\);\}else glideFarm\(0,\{stop:'fields'\}\);\}/);
 assert.match(game,/function glideFarm\(to,\{ms=reducedMotion\?0:400,stop=null,centre=true\}=\{\}\)\{/,'about 400 ms, at once with reduced motion');
 assert.match(game,/glideFarm\(0,\{ms:450,stop:'fields'\}\);/,'the first basket still eases back to the fields in 450 ms');
 // The button of the stop a glide goes to, else of the nearest one, shows pressed; - and + grey out only at the axis's ends.
 assert.match(game,/if\(!villageWorld\)viewMode=glide\?\.stop\?\?FARM_STOPS\[Math\.round\(Math\.max\(0,along\)\)\];/);
 assert.match(game,/\$\('zoom-in'\)\.disabled=villageWorld\?zoom>=maxZoom\(\):along<=-1;\$\('zoom-out'\)\.disabled=villageWorld\?zoom<=minZoom\(\):along>=2;/);
 // The player's pan fades out on the way to the whole farm (so it ends centred), and a drag takes over from a glide.
 assert.match(game,/if\(fade&&b>a&&a<2\)\{const keep=\(2-b\)\/\(2-a\);pan\*=keep;panDepth\*=keep;\}/);
 assert.match(game,/function panFarm\(delta,depth=0\)\{stopGlide\(\);/);
});
