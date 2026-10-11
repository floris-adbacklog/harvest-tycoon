import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const THREE=await import('../public/vendor/three.module.js');

// 7 Oct 2026: on a phone the village's first view was 60% grey rock with the valley small in the middle, and under it a pale strip
// and a hole in the rock where the world ends. Now an upright phone sees the valley from top to bottom, and no view (home, whole
// village, any pan or zoom, phone or computer) looks past VILLAGE_VIEW, the ellipse the village fills on the screen. The computer's
// first view stays as it was. These run game.js's own village camera code.
const game=read('public/game.js'),scene=read('public/village-scene.js');
const constant=name=>new Function(`return ${new RegExp(`export const ${name}=Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);`).exec(scene)[1]}`)();
const list=name=>new Function(`return ${new RegExp(`export const ${name}=Object\\.freeze\\((\\[[\\s\\S]*?\\])\\);`).exec(scene)[1]}`)();
const VILLAGE_PLACES=constant('VILLAGE_PLACES'),VILLAGE_UTILITIES=constant('VILLAGE_UTILITIES'),VILLAGE_VIEW=constant('VILLAGE_VIEW');
// The places of the owner's plan for levels 100-200 (Oct 2026): the far side of the lake, the computer's frame and the landmarks.
const VILLAGE_FAR_SIDE=list('VILLAGE_FAR_SIDE'),VILLAGE_FRAME=list('VILLAGE_FRAME'),VILLAGE_LANDMARK_SPOTS=constant('VILLAGE_LANDMARK_SPOTS');
const slice=(from,to)=>{const a=game.indexOf(from),b=game.indexOf(to,a);assert.ok(a>0&&b>a,`game.js: ${from.slice(0,50)}`);return game.slice(a,b+to.length);};
const measureVillage=new Function('THREE',`${slice('function measureVillage(spots,margin=26){','\n}\n')}return measureVillage;`)(THREE);
const villageFrame=new Function('THREE','measureVillage','VILLAGE_PLACES','VILLAGE_UTILITIES','VILLAGE_FAR_SIDE','VILLAGE_FRAME','VILLAGE_VIEW',`let villageFrame;${slice('const spots={...VILLAGE_PLACES,...VILLAGE_UTILITIES},framed=','view:VILLAGE_VIEW};')}return villageFrame;`)(THREE,measureVillage,VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_FAR_SIDE,VILLAGE_FRAME,VILLAGE_VIEW);
const block=slice("  const whole=viewMode==='overview'&&villageFrame","  focus=at.clone().add(new THREE.Vector3(pan+panDepth,0,-pan+panDepth));");
const run=new Function('THREE','s',`let {width,height,mobile,hudShift,viewMode,villageFrame,zoom,pan,panDepth}=s,villageMinZoom,focus;const aspect=width/height,camera={};${block}return {camera,focus,zoom,pan,panDepth,villageMinZoom};`);
// Screen units from the game's angle, as measureFarm counts them: across, and up.
const screen=({x,y=0,z})=>[(x-z)/Math.SQRT2,(72*y-40*(x+z))/Math.sqrt(8384)];
function view(width,height,{mobile=false,hudShift=0,viewMode='home',zoom=1,pan=0,panDepth=0}={}){
 const r=run(THREE,{width,height,mobile,hudShift,viewMode,villageFrame,zoom,pan,panDepth}),[fx,fy]=screen(r.focus);
 return {...r,left:fx+r.camera.left,right:fx+r.camera.right,bottom:fy+r.camera.bottom,top:fy+r.camera.top,across:r.camera.right-r.camera.left,span:r.camera.top-r.camera.bottom};
}
const inside=v=>[[v.left,v.bottom],[v.left,v.top],[v.right,v.bottom],[v.right,v.top]].every(([x,y])=>((x-VILLAGE_VIEW.x)/VILLAGE_VIEW.rx)**2+((y-VILLAGE_VIEW.y)/VILLAGE_VIEW.ry)**2<=1+1e-9);
// The #world sizes the game gives the village (390x844 is 390x708 between the top bar and the menu bar; a phone on its side has
// its menu bar on the left), and on a computer the side tools' share (hudShift: half their right edge).
const UPRIGHT=[[390,708],[360,644],[430,796],[375,603]],SIDEWAYS=[[764,324],[652,309]],TABLET=[[768,888]];
// A 375 x 667 phone held upright (10 Oct 2026, review fix): the game gives the village 375 x 531 between the bars, measured in the real game.
// Too short for the 28 across of the taller phones (it shows 44 up and down), but every name must stay clear there too.
const SMALL=[[375,531]];
const COMPUTER=[[1440,900,96.5],[1280,720,90],[1920,1080,96.5],[2560,1440,96.5],[1366,768,90]];
const SCREENS=[...UPRIGHT.map(([w,h])=>[w,h,{mobile:true}]),...SMALL.map(([w,h])=>[w,h,{mobile:true}]),...SIDEWAYS.map(([w,h])=>[w,h,{mobile:true}]),...TABLET.map(([w,h])=>[w,h,{mobile:true}]),...COMPUTER.map(([w,h,hudShift])=>[w,h,{hudShift}])];

test('every village place stands well inside the ellipse the camera keeps to',()=>{
 for(const [key,spot] of Object.entries({...VILLAGE_PLACES,...VILLAGE_UTILITIES,...VILLAGE_LANDMARK_SPOTS})){const [x,y]=screen(spot);assert.ok(((x-VILLAGE_VIEW.x)/VILLAGE_VIEW.rx)**2+((y-VILLAGE_VIEW.y)/VILLAGE_VIEW.ry)**2<.5,key);}
});
test('no view looks past the mountains: home, whole village, any pan and any zoom, on phones and computers',()=>{
 for(const [w,h,options] of SCREENS)for(const viewMode of ['home','overview'])for(const zoom of [.01,.5,.8,1,2,6])for(const pan of [-60,-25,0,25,60])for(const panDepth of [-60,-25,0,25,60]){
  const v=view(w,h,{...options,viewMode,zoom,pan,panDepth});
  assert.ok(inside(v),`${w}x${h} ${viewMode} zoom ${zoom} pan ${pan},${panDepth}: ${[v.left,v.right,v.bottom,v.top].map(n=>n.toFixed(1))}`);
  assert.ok(v.zoom>=v.villageMinZoom&&v.villageMinZoom>0&&v.villageMinZoom<=1);
 }
 // Zooming out stops where the view fills the ellipse (there its middle is the ellipse's).
 for(const [w,h,options] of SCREENS){const v=view(w,h,{...options,zoom:.01}),hw=v.across/2,hh=v.span/2;assert.ok(Math.abs((hw/VILLAGE_VIEW.rx)**2+(hh/VILLAGE_VIEW.ry)**2-1)<1e-6,`${w}x${h}`);}
});
test('an upright phone sees the valley from top to bottom, round the places on the village\'s side of the lake',()=>{
 for(const [w,h] of UPRIGHT){
  const v=view(w,h,{mobile:true});
  assert.ok(Math.abs(v.across-28)<1e-9,`${w}x${h}: 28 across, not 50`);assert.ok(v.span>=44&&v.span<54,`${w}x${h}: ${v.span.toFixed(1)} up and down`);
  assert.deepEqual([v.pan,v.panDepth],[0,0],'the first view fits as it is');
  // The Farm road, the Mill, the Market, the Mine and the Smithy in view, their pins clear of the edges (game.js hides a pin
  // beyond .92 of the half-width), and since Oct 2026 the Fields, the Canteen and the Jeweller; the Lumber Camp across the lake, and
  // the Kiln, the Linen Loft, the Soap Maker and the Pier past the west shore, are a swipe away (VILLAGE_FAR_SIDE).
  const middle=(v.left+v.right)/2;
  for(const [key,spot] of Object.entries({...VILLAGE_PLACES,...VILLAGE_UTILITIES})){const share=Math.abs(screen(spot)[0]-middle)/(v.across/2);if(VILLAGE_FAR_SIDE.includes(key))assert.ok(share>1,`${key} at ${share.toFixed(2)}`);else assert.ok(share<.85,`${key} at ${share.toFixed(2)}`);}
  const swipe=view(w,h,{mobile:true,pan:-60});assert.ok(swipe.left<screen(VILLAGE_PLACES.lumbercamp)[0]-8,'the Lumber Camp is reachable');
  // The whole-village view: further out, round the middle of all the places.
  const all=view(w,h,{mobile:true,viewMode:'overview'});assert.ok(all.span>v.span*1.4,`${w}x${h} overview ${all.span.toFixed(1)}`);
  assert.ok(Math.abs((all.left+all.right)/2-screen(villageFrame.focus)[0])<1,'its middle across is the places\' middle');
 }
});
test('a computer\'s first view of the village is the one it had: 44 up and down, every place, the side tools\' share',()=>{
 for(const [w,h,hudShift] of COMPUTER){
  const v=view(w,h,{hudShift}),aspect=w/h,across=62*w/(w-2*hudShift),span=Math.max(44,across/aspect);
  assert.deepEqual([v.pan,v.panDepth,v.zoom],[0,0,1],`${w}x${h}: nothing moved`);
  assert.ok(Math.abs(v.span-span)<1e-9&&Math.abs(v.across-span*aspect)<1e-9,`${w}x${h}`);
  assert.ok(v.focus.distanceTo(villageFrame.focus)<1e-9,'the middle of the places');
  // The whole-village view shows all of the valley's places, and more of it than the first view.
  const all=view(w,h,{hudShift,viewMode:'overview'});assert.ok(all.span>v.span*1.25,`${w}x${h} overview`);
  for(const spot of Object.values({...VILLAGE_PLACES,...VILLAGE_UTILITIES})){const [x]=screen(spot);assert.ok(x>all.left+5&&x<all.right-5);}
 }
});
test('the camera draws the front of the ring, and a phone on its side has no empty strip under the village',()=>{
 const init=slice('  if(villageWorld){\n   // The village is three times','await import(\'./village-scene.js\');');
 assert.match(init,/camera\.near=-200;/,'the front mountains rise past the camera: drawn from 200 behind it, not cut open');
 assert.match(game,/camera=new THREE\.OrthographicCamera\(-25,25,17,-17,\.1,300\);/,'the farm\'s camera as it was');
 assert.match(read('public/world-two.css'),/@media\(max-height:550px\) and \(orientation:landscape\) and \(max-width:900px\),\(max-height:550px\) and \(orientation:landscape\) and \(pointer:coarse\)\{html\[data-world="village"\]\{--mobile-bottom:0px\}\}/);
 assert.match(game,/const minZoom=\(\)=>villageWorld\?villageMinZoom:\.75/,'zooming out stops at the mountains');
});
// "Show me" on the golden brief (Oct 2026): game.js's own villagePan moves the village's normal view so a place is in the middle. On
// every screen each place (and the market) then stands clear of the edges where game.js hides a name (beyond .92 of the half-width,
// .82 of the half-height), and the view stays inside the mountains: resize's own clamp may stop it short of the middle.
test('Show me puts every village place in view, on phones and computers',()=>{
 const villagePan=new Function(`${slice('function villagePan(spot,at){','}\n')}return villagePan;`)();
 const upright=([w,h,o])=>o.mobile&&w<h;
 for(const screenSize of SCREENS){
  const [w,h,options]=screenSize,at=upright(screenSize)?villageFrame.phone:villageFrame.focus;
  for(const [key,spot] of Object.entries({...VILLAGE_PLACES,villagemarket:VILLAGE_UTILITIES.villagemarket,...VILLAGE_LANDMARK_SPOTS})){
   const v=view(w,h,{...options,...villagePan(spot,at)}),[x,y]=screen({...spot,y:spot.y+3});
   const across=Math.abs(x-(v.left+v.right)/2)/(v.across/2),up=Math.abs(y-(v.bottom+v.top)/2)/(v.span/2);
   assert.ok(across<.92&&up<.82,`${w}x${h} ${key}: ${across.toFixed(2)} across, ${up.toFixed(2)} up`);
   assert.ok(inside(v),`${w}x${h} ${key} stays inside the mountains`);
  }
 }
 const game=read('public/game.js');
 assert.match(game,/viewMode=startView\(\);zoom=1;\(\{pan,panDepth\}=villagePan\(v,upright\?villageFrame\.phone:villageFrame\.focus\)\);resize\(\);/,'the normal view, the same middle resize uses');
 assert.match(game,/v\.label\.classList\.add\('is-pointed'\);setTimeout\(\(\)=>v\.label\.classList\.remove\('is-pointed'\),2400\);/,'its name lights up for a moment');
 assert.match(read('public/world-two.css'),/@media\(prefers-reduced-motion:reduce\)\{html\[data-world="village"\] :is\(\.building-label,\.utility-label\)\.is-pointed\{animation:none;/);
});

// The owner's plan for levels 100-200 (Oct 2026) adds seven places and five landmarks. The computer's first view and the whole-village
// view stay as the owner approved them on 30 Sep (measured round VILLAGE_FRAME): measured round all the places they moved 9 units west
// and the Mine and the Smithy left the first view. Landmarks never count for a frame.
test('the computer\'s views are the ones the owner approved, however many places the village gets',()=>{
 assert.deepEqual([...VILLAGE_FRAME],['mine','lumbercamp','smithy','villagemill','villagemarket','farmroad']);
 assert.ok(Math.abs(villageFrame.focus.x-9.01)<.01&&Math.abs(villageFrame.focus.z+13.39)<.01,`focus ${villageFrame.focus.x.toFixed(2)}, ${villageFrame.focus.z.toFixed(2)}`);
 assert.ok(Math.abs(villageFrame.width-119.1)<.1&&Math.abs(villageFrame.height-76.3)<.1,`${villageFrame.width.toFixed(1)} x ${villageFrame.height.toFixed(1)}`);
 assert.ok(Math.abs(villageFrame.phone.x-17.86)<.01&&Math.abs(villageFrame.phone.z+20.24)<.01,`phone ${villageFrame.phone.x.toFixed(2)}, ${villageFrame.phone.z.toFixed(2)}`);
 for(const [w,h,hudShift] of COMPUTER){
  const v=view(w,h,{hudShift}),middle=[(v.left+v.right)/2,(v.bottom+v.top)/2];
  for(const key of ['mine','lumbercamp','smithy','villagemill']){const [x,y]=screen({...VILLAGE_PLACES[key],y:VILLAGE_PLACES[key].y+3});
   assert.ok(Math.abs(x-middle[0])/(v.across/2)<.92&&Math.abs(y-middle[1])/(v.span/2)<.82,`${w}x${h}: ${key} in the first view`);}
  const all=view(w,h,{hudShift,viewMode:'overview'});
  for(const [key,spot] of Object.entries({...VILLAGE_PLACES,...VILLAGE_UTILITIES,...VILLAGE_LANDMARK_SPOTS})){const [x]=screen(spot);assert.ok(x>all.left+5&&x<all.right-5,`${w}x${h} whole village: ${key}`);}
 }
});
// Every name at once (as the showcase farm has them), 44 x 44 pins anchored at their bottom middle as game.js places them (a building's
// .45 above its spot plus 3, a pin's .3): on the upright phones and the tablet no two cover each other in the first view.
test('names never cover each other on an upright phone or a tablet',()=>{
 const pins=[...Object.entries(VILLAGE_PLACES).map(([key,s])=>[key,{...s,y:s.y+3.45}]),...Object.entries({...VILLAGE_UTILITIES,...VILLAGE_LANDMARK_SPOTS}).map(([key,s])=>[key,{...s,y:s.y+3.3}])];
 for(const [w,h] of [...UPRIGHT,...SMALL,...TABLET]){
  const v=view(w,h,{mobile:true}),at=pins.map(([key,spot])=>{const [x,y]=screen(spot);return [key,(x-v.left)/v.across*w,(v.top-y)/v.span*h];}).filter(([,x,y])=>x>-22&&x<w+22&&y>0&&y<h+44);
  for(let i=0;i<at.length;i++)for(let j=i+1;j<at.length;j++){const [a,ax,ay]=at[i],[b,bx,by]=at[j];assert.ok(Math.abs(ax-bx)>=44||Math.abs(ay-by)>=44,`${w}x${h}: ${a} and ${b} (${Math.abs(ax-bx).toFixed(0)}, ${Math.abs(ay-by).toFixed(0)} px apart)`);}
 }
});

// The owner's review of 11 Oct 2026 (screenshots 01a, 06c, 07a). How game.js lays the names out: a place's name sits with its bottom
// middle 3.45 over its spot, a pin (the market square, the road, a landmark) 3.3 over it; on a computer a place's name is a card of its own
// width (in English, measured in the game at 1280 px) and 38 high (the Pier's 41, with its load), a pin 40 x 40; on a phone every name is a
// 44 x 44 pin. A name is hidden beyond .92 of the half-width (a pin .94) or .82 of the half-height, and on a computer when it reaches the
// side tools (left 12 to 2 x hudShift, from 164 to 701 px down; 25 on the wider screens).
const NAME_WIDTHS={mine:80,lumbercamp:136,smithy:93,villagemill:147,villagefields:130,canteen:149,kiln:123,linenloft:110,soapmaker:121,pier:113,jeweller:101};
const VILLAGE_EXTRAS=constant('VILLAGE_EXTRAS');
function names(w,h,options,computer){
 const v=view(w,h,options),at=spot=>{const [x,y]=screen(spot);return [(x-v.left)/v.across*w,(v.top-y)/v.span*h];};
 const tools=computer?{left:w>1400?25:12,right:2*options.hudShift,top:164,bottom:701}:null,out=[];
 for(const [key,spot,pin] of [...Object.entries(VILLAGE_PLACES).map(([k,s])=>[k,s,false]),...Object.entries({...VILLAGE_UTILITIES,...VILLAGE_LANDMARK_SPOTS}).map(([k,s])=>[k,s,true])]){
  const [x,y]=at({...spot,y:spot.y+(pin?3.3:3.45)}),width=computer?pin?40:NAME_WIDTHS[key]:44,height=computer?pin?40:key==='pier'?41:38:44;
  const edge=Math.abs(x/w*2-1)>(pin?.94:.92)||Math.abs(1-y/h*2)>.82,near=half=>Boolean(tools)&&x+half>tools.left&&x-half<tools.right&&y>tools.top&&y-50<tools.bottom;
  // A place's name the guess of 80 px each side puts at the side tools slides 8 px clear of them, unless its point is at them (game.js
  // nameBehindTools); a pin there hides.
  const slide=!pin&&near(80)?Math.max(0,tools.right+8-(x-width/2)):0,hidden=edge||(pin?near(22):slide>0&&x-22<tools.right+8);
  out.push({key,x,y,left:x-width/2+slide,right:x+width/2+slide,top:y-height,bottom:y,hidden});
 }
 // The Wind pump's model (village-extras.glb's Building_022 where VILLAGE_EXTRAS stands it): its pin's point is half a unit over its top.
 const [,px,py,pz]=VILLAGE_EXTRAS.windpump[0],corners=[];
 for(const x of [px-.8,px+.8])for(const y of [py,VILLAGE_LANDMARK_SPOTS.windpump.y+2.8])for(const z of [pz-.5,pz+.5])corners.push(at({x,y,z}));
 const pump={left:Math.min(...corners.map(c=>c[0])),right:Math.max(...corners.map(c=>c[0])),top:Math.min(...corners.map(c=>c[1])),bottom:Math.max(...corners.map(c=>c[1])),wheel:at({x:px,y:VILLAGE_LANDMARK_SPOTS.windpump.y+2.8,z:pz})[1]};
 return {v,out,pump};
}
const apart=(a,b)=>Math.max(a.left-b.right,b.left-a.right,a.top-b.bottom,b.top-a.bottom);
const DESKTOP=[...COMPUTER,[1280,800,90]];
test('on a computer the whole-village view shows every place\'s name, clear of the side tools and of each other',()=>{
 for(const [w,h,hudShift] of DESKTOP)for(const viewMode of ['overview','home']){
  const {out,pump}=names(w,h,{hudShift,viewMode},true),shown=out.filter(n=>!n.hidden);
  // The Linen Loft's name (owner shot 01a) was hidden by the farm's guess of 80 px each side: game.js measures a village name instead.
  if(viewMode==='overview')assert.deepEqual(out.filter(n=>n.hidden).map(n=>n.key),[],`${w}x${h}: every name in the whole-village view`);
  for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++)assert.ok(apart(shown[i],shown[j])>=2,`${w}x${h} ${viewMode}: ${shown[i].key} and ${shown[j].key} touch (${apart(shown[i],shown[j]).toFixed(0)} px)`);
  // The Village Fields' name stands over the plot's west corner, the Wind pump beside it (06c: over the plot's middle it hid the wheel).
  assert.ok(apart(out.find(n=>n.key==='villagefields'),pump)>=0,`${w}x${h} ${viewMode}: the Fields' name covers the Wind pump (${apart(out.find(n=>n.key==='villagefields'),pump).toFixed(1)} px)`);
 }
 assert.match(game,/v\.label\.hidden=Math\.abs\(p\.x\)>\.92\|\|Math\.abs\(p\.y\)>\.82\|\|behindTools\(x,y,80\)&&\(!villageWorld\|\|nameBehindTools\(v,x,y\)\);/);
});
test('Show me puts a place high on a hill in the middle too, and on a phone no name then covers another',()=>{
 const villagePan=new Function(`${slice('function villagePan(spot,at){','}\n')}return villagePan;`)();
 // The Wind pump (06c): the camera looked at the ground under it, so it stood well above the middle, in the rocks.
 for(const [w,h,options] of [...UPRIGHT,...SMALL,...TABLET].map(([w,h])=>[w,h,{mobile:true}]).concat(DESKTOP.map(([w,h,hudShift])=>[w,h,{hudShift}]))){
  const at=options.mobile&&w<h?villageFrame.phone:villageFrame.focus,spot=VILLAGE_LANDMARK_SPOTS.windpump,v=view(w,h,{...options,...villagePan(spot,at)});
  const [sx,sy]=screen(spot),[fx,fy]=screen(v.focus);assert.ok(Math.hypot(sx-fx,sy-fy)<1e-9,`${w}x${h}: the Wind pump in the middle`);
  const {out,pump,v:seen}=names(w,h,{...options,...villagePan(spot,at)},!options.mobile);
  assert.ok(apart(out.find(n=>n.key==='villagefields'),pump)>=0,`${w}x${h}: the Fields' name clear of the Wind pump`);
  const pin=out.find(n=>n.key==='windpump');assert.ok(!pin.hidden&&pin.bottom<=pump.wheel&&pump.wheel-pin.bottom<h/seen.span*.6,`${w}x${h}: its pin just over its wheel (${(pump.wheel-pin.bottom).toFixed(0)} px)`);
 }
 for(const [w,h] of [...UPRIGHT,...SMALL])for(const spot of Object.values({...VILLAGE_PLACES,villagemarket:VILLAGE_UTILITIES.villagemarket,...VILLAGE_LANDMARK_SPOTS})){
  const shown=names(w,h,{mobile:true,...villagePan(spot,villageFrame.phone)},false).out.filter(n=>!n.hidden);
  for(let i=0;i<shown.length;i++)for(let j=i+1;j<shown.length;j++)assert.ok(apart(shown[i],shown[j])>=0,`${w}x${h}: ${shown[i].key} and ${shown[j].key}`);
 }
});
