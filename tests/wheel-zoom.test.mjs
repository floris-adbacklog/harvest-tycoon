import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bindFarmInput} from '../public/farm-input.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

function canvas(){const handlers={};return {handlers,addEventListener(type,fn,options){handlers[type]={fn,options};},hasPointerCapture:()=>false,releasePointerCapture(){},setPointerCapture(){}};}

test('scrolling on a computer zooms the farm (wheel up = closer), without scrolling the page',()=>{
 const c=canvas(),calls=[];let ready=true;
 bindFarmInput({canvas:c,isReady:()=>ready,pick:()=>null,open(){},pan(){},zoom:(ratio,x,y)=>calls.push({ratio,x,y})});
 assert.equal(c.handlers.wheel.options.passive,false,'so preventDefault can stop the page from scrolling');
 let prevented=0;const wheel=over=>c.handlers.wheel.fn({deltaY:-100,deltaMode:0,ctrlKey:false,clientX:300,clientY:200,preventDefault(){prevented++;},...over});
 wheel();assert.ok(calls[0].ratio>1,'up zooms in');assert.deepEqual([calls[0].x,calls[0].y],[300,200],'towards the pointer');assert.equal(prevented,1);
 wheel({deltaY:100});assert.ok(calls[1].ratio<1,'down zooms out');
 wheel({deltaY:-5000});assert.ok(calls[2].ratio<1.25,'one big jump is capped');
 wheel({deltaY:-3,deltaMode:1});assert.ok(calls[3].ratio>1,'line-based wheels count too');
 ready=false;wheel();assert.equal(calls.length,4,'nothing before the farm is ready');
});

test('the spot under the mouse stays under the mouse while zooming',()=>{
 const game=read('public/game.js');
 assert.match(game,/const r=zoom\/before;if\(x==null\|\|r===1\)return;/);
 assert.match(game,/cameraDragDelta\(dx\*\(1-r\),dy\*\(1-r\),/);
});
