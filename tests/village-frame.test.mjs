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
const VILLAGE_PLACES=constant('VILLAGE_PLACES'),VILLAGE_UTILITIES=constant('VILLAGE_UTILITIES'),VILLAGE_VIEW=constant('VILLAGE_VIEW');
const slice=(from,to)=>{const a=game.indexOf(from),b=game.indexOf(to,a);assert.ok(a>0&&b>a,`game.js: ${from.slice(0,50)}`);return game.slice(a,b+to.length);};
const measureVillage=new Function('THREE',`${slice('function measureVillage(spots,margin=26){','\n}\n')}return measureVillage;`)(THREE);
const villageFrame=new Function('THREE','measureVillage','VILLAGE_PLACES','VILLAGE_UTILITIES','VILLAGE_VIEW',`let villageFrame;${slice('const spots={...VILLAGE_PLACES,...VILLAGE_UTILITIES};villageFrame=','view:VILLAGE_VIEW};')}return villageFrame;`)(THREE,measureVillage,VILLAGE_PLACES,VILLAGE_UTILITIES,VILLAGE_VIEW);
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
const COMPUTER=[[1440,900,96.5],[1280,720,90],[1920,1080,96.5],[2560,1440,96.5],[1366,768,90]];
const SCREENS=[...UPRIGHT.map(([w,h])=>[w,h,{mobile:true}]),...SIDEWAYS.map(([w,h])=>[w,h,{mobile:true}]),...TABLET.map(([w,h])=>[w,h,{mobile:true}]),...COMPUTER.map(([w,h,hudShift])=>[w,h,{hudShift}])];

test('every village place stands well inside the ellipse the camera keeps to',()=>{
 for(const [key,spot] of Object.entries({...VILLAGE_PLACES,...VILLAGE_UTILITIES})){const [x,y]=screen(spot);assert.ok(((x-VILLAGE_VIEW.x)/VILLAGE_VIEW.rx)**2+((y-VILLAGE_VIEW.y)/VILLAGE_VIEW.ry)**2<.5,key);}
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
  // beyond .92 of the half-width); the Lumber Camp across the lake is a swipe away.
  const middle=(v.left+v.right)/2;
  for(const [key,spot] of Object.entries({...VILLAGE_PLACES,...VILLAGE_UTILITIES})){const share=Math.abs(screen(spot)[0]-middle)/(v.across/2);if(key==='lumbercamp')assert.ok(share>1,key);else assert.ok(share<.85,`${key} at ${share.toFixed(2)}`);}
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
  for(const [key,spot] of Object.entries({...VILLAGE_PLACES,villagemarket:VILLAGE_UTILITIES.villagemarket})){
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
