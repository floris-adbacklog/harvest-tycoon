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
const helpers=new Function('farmAxis',`${slice('function axisOf(at){','\n')}${slice('function atAxis(d){','\n')}${slice('function spanOn(at){','\n')}${slice('function atWidth(span,out){','\n}')}return {axisOf,atAxis,spanOn,atWidth};`);
// game.js's own glides, + and - and the wheel on a farm axis, with the camera's drawing left out (resize, the pointer's spot): frame(now)
// takes a glide's step as game.js's frame() does.
const glides=new Function('farmAxis','clock',`let zoomAt=0,pan=0,panDepth=0,glide=null;const ready=true,reducedMotion=false,performance={now:()=>clock.t};
 const resize=()=>{},groundUnder=()=>({x:0,z:0}),keepSpot=()=>{};
 ${slice('function axisOf(at){','\n')}${slice('function atAxis(d){','\n')}${slice('function spanOn(at){','\n')}${slice('function atWidth(span,out){','\n}')}
 ${slice('function placeFarm(at,fade=true){','\n}')}${slice('function wheelFarm(ratio,x,y){','\n}')}${slice('function glideFarm(to,','\n}')}
 ${slice('function stopGlide(){','\n')}${slice('function stepFarm(direction){','\n')}
 return {stepFarm,glideFarm,wheel:ratio=>wheelFarm(ratio,0,0),frame:now=>{if(glide)glide.step(now);},get at(){return zoomAt;},set at(v){zoomAt=v;},get gliding(){return Boolean(glide);},pan:(a,b)=>{pan=a;panDepth=b;},get panned(){return [pan,panDepth];}};`);
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
 {name:'phone, 40 fields',width:390,height:708,mobile:true,hudShift:0,overviewBounds:BIG,state:plots(40),fieldRoom:null},
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

// 18 Oct 2026 (the review of the one zoom axis): + and - and the wheel aim at a width (atWidth), so they always zoom, also where two stops
// are as wide (a phone with 40 fields: two presses of - from the fields only slid the farm); the glides take their steps in frame(), where
// the farm is drawn at every display frame while one runs (the names ran up to 108 px ahead of the drawn farm); the wheel holds the real
// spot under the pointer and follows its notches smoothly; a camera button at its own stop does no work.
test('+ and - and the wheel aim at a width, past a part where two stops are as wide',()=>{
 for(const s of SCREENS){
  const {farmAxis}=view(s,0),{spanOn,atWidth}=helpers(farmAxis),[s0,,,s3]=farmAxis.spans;
  for(let at=-1;at<=2;at+=1/16)for(const ratio of [1.25,1/1.25,1.197,1/1.197]){
   const to=atWidth(spanOn(at)/ratio,ratio<1),want=Math.max(s0,Math.min(s3,spanOn(at)/ratio));
   near(spanOn(to),want,`${s.name} from ${at} by ${ratio}`);assert.ok(ratio<1?to>=at:to<=at,`${s.name} from ${at}: the right way`);
  }
 }
 const phone=SCREENS.find(s=>s.name==='phone, 40 fields'),{farmAxis}=view(phone,0),{spanOn,atWidth}=helpers(farmAxis);
 near(farmAxis.spans[1],farmAxis.spans[2],'the fields as wide as the heart of the farm');
 assert.ok(atWidth(spanOn(0)*1.25,true)>1,'- from the fields passes the heart of the farm');near(spanOn(atWidth(spanOn(0)*1.25,true)),spanOn(0)*1.25,'and is 1.25 times as wide');
 assert.ok(atWidth(spanOn(1)/1.25,false)<0,'+ from the heart of the farm passes the fields');
});

test('the glides land exactly, + and - step by 1.25 in 250 ms, and the wheel follows its notches smoothly to where they aim',()=>{
 for(const s of SCREENS){
  const {farmAxis}=view(s,0),{spanOn}=helpers(farmAxis),clock={t:1000},g=glides(farmAxis,clock);
  const run=(limit=2000)=>{const spans=[spanOn(g.at)];let frames=0;while(g.gliding&&frames<limit/16){clock.t+=1000/60;g.frame(clock.t);spans.push(spanOn(g.at));frames++;}
   assert.ok(!g.gliding,`${s.name}: the glide ends`);let step=0;for(let i=1;i<spans.length;i++)step=Math.max(step,Math.abs(Math.log(spans[i]/spans[i-1])));return {frames,step};};
  // The camera buttons: 400 ms (25 frames at most) to exactly their stop, and the pan glides back to none.
  for(const [from,to] of [[0,2],[2,0],[2,1],[-1,2]]){g.at=from;g.pan(3,-2);g.glideFarm(to,{stop:'x'});const {frames}=run();assert.equal(g.at,to);assert.ok(g.panned.every(v=>v===0),`${s.name}: the pan glides back`);assert.ok(frames<=25,`${s.name}: ${frames} frames`);}
  // A button at its own stop with no pan: nothing to glide.
  g.at=1;g.pan(0,0);g.glideFarm(1,{stop:'home'});assert.ok(!g.gliding,`${s.name}: no glide at its own stop`);
  // - from the fields to the widest and + back: every press 1.25 times (the ends excepted), in 250 ms.
  g.at=0;for(let i=0;i<30&&g.at<2;i++){const before=spanOn(g.at);g.stepFarm(-1);const {frames}=run();assert.ok(frames<=16);const grew=spanOn(g.at)/before;assert.ok(g.at===2||Math.abs(grew-1.25)<1e-9,`${s.name}: - grew ${grew}`);}
  assert.equal(g.at,2,`${s.name}: - reaches the whole farm`);
  for(let i=0;i<40&&g.at>-1;i++){const before=spanOn(g.at);g.stepFarm(1);run();const shrank=before/spanOn(g.at);assert.ok(g.at===-1||Math.abs(shrank-1.25)<1e-9,`${s.name}: + shrank ${shrank}`);}
  assert.equal(g.at,-1,`${s.name}: + reaches the closest`);
  // Three wheel notches out 30 ms apart from the fields: one smooth movement to 1.197^3 as wide, never more than a notch's share a frame.
  g.at=0;const start=spanOn(0),notch=Math.exp(.18);g.wheel(1/notch);clock.t+=30;g.frame(clock.t);g.wheel(1/notch);clock.t+=30;g.frame(clock.t);g.wheel(1/notch);
  const {step}=run();near(spanOn(g.at),Math.min(farmAxis.spans[3],start*notch**3),`${s.name}: three notches out`);assert.ok(step<.18*.5,`${s.name}: a frame's step ${step}`);
  // And in from the whole farm to the closest end.
  g.at=2;for(let i=0;i<20;i++){g.wheel(notch);clock.t+=50;g.frame(clock.t);}run();assert.equal(g.at,-1,`${s.name}: in to the closest`);
 }
 assert.match(game,/const gliding=Boolean\(glide\);if\(gliding\)glide\.step\(now\);\n if\(!gliding&&now-lastFrame<32\)return;/,'drawn at every display frame while a glide runs');
 assert.doesNotMatch(game,/requestAnimationFrame\(step\)/,'no glide of its own beside frame()');
});

