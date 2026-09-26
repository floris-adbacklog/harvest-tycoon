import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stopPageZoom,gameViewport,PAGE_VIEWPORT,GAME_VIEWPORT} from '../src/page-zoom.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 25 Sep 2026: pinching over a button or a panel in the installed app zoomed the whole app, which then stayed enlarged.
test('in the game only the 3D field zooms: the frame and the signed-in page scroll but do not zoom',()=>{
 assert.match(read('public/styles.css'),/html,body\{touch-action:pan-x pan-y\}/,'the game frame');
 assert.match(read('public/styles.css'),/#world canvas\{[^}]*touch-action:none/,'the field keeps its own pinch');
 assert.match(read('public/welcome.css'),/html:has\(body\[data-phase=authenticated\]\),body\[data-phase=authenticated\]\{touch-action:pan-x pan-y\}/,'the page once signed in');
 assert.doesNotMatch(read('public/welcome.css'),/^body\{[^}]*touch-action/m,'the signed-out home page stays zoomable');
 assert.match(read('src/main.js'),/document\.body\.dataset\.phase=value;gameViewport\(value==='authenticated'\);/);
 assert.match(read('src/game-cloud.js'),/stopPageZoom\(document\);/);
});
test('signed in the viewport forbids zoom (and so undoes one), signed out it allows it again; Safari pinch events are stopped only in the game',()=>{
 let content=PAGE_VIEWPORT;const doc={querySelector(){return {getAttribute:()=>content,setAttribute(k,v){assert.equal(k,'content');content=v;}};},listeners:{},addEventListener(type,fn,opts){this.listeners[type]=fn;assert.equal(opts.passive,false);}};
 gameViewport(true,doc);assert.equal(content,GAME_VIEWPORT);assert.match(content,/maximum-scale=1, user-scalable=no/);
 gameViewport(false,doc);assert.equal(content,PAGE_VIEWPORT);assert.doesNotMatch(content,/user-scalable/);
 doc.documentElement={dataset:{appMode:'standalone'}};content=GAME_VIEWPORT;gameViewport(false,doc);assert.equal(content,GAME_VIEWPORT,'the installed app keeps one viewport');delete doc.documentElement;
 assert.match(read('public/play.html'),new RegExp(`<meta name="viewport" content="${PAGE_VIEWPORT}">`),'the page starts zoomable, as before');
 let playing=false;stopPageZoom(doc,()=>playing);
 for(const type of ['gesturestart','gesturechange']){
  let stopped=0;doc.listeners[type]({preventDefault(){stopped++;}});assert.equal(stopped,0,`${type}: the home page may zoom`);
  playing=true;doc.listeners[type]({preventDefault(){stopped++;}});assert.equal(stopped,1,`${type}: the game may not`);playing=false;
 }
});
