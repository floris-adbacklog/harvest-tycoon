import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scrollable,guardWheel} from '../public/wheel-guard.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// A box in a small page: its overflow, size and scroll position, and the box around it.
const node=(style,size={},parent=null)=>({nodeType:1,parentElement:parent,style:{overflowX:'visible',overflowY:'visible',direction:'ltr',...style},scrollTop:0,scrollLeft:0,scrollHeight:100,clientHeight:100,scrollWidth:100,clientWidth:100,...size});
const win={getComputedStyle:el=>el.style};

// 11 Oct 2026 (Part A, A7): a wheel over the bars or at the end of a list scrolled CrazyGames' page, and the game slid out of view.
test('a wheel only scrolls what can still scroll that way; everything else stays put',()=>{
 const page=node({}),list=node({overflowY:'auto'},{scrollHeight:600,clientHeight:300},page),row=node({},{},list);
 assert.equal(scrollable(row,0,40,win),true,'down a list that has more below');
 assert.equal(scrollable(row,0,-40,win),false,'up a list at its top');
 list.scrollTop=300;assert.equal(scrollable(row,0,40,win),false,'down a list at its end');assert.equal(scrollable(row,0,-40,win),true);
 assert.equal(scrollable(page,0,40,win),false,'the page itself never');
 const hidden=node({overflowY:'hidden'},{scrollHeight:600,clientHeight:300},page);assert.equal(scrollable(hidden,0,40,win),false,'cut off, not scrolling');
 const short=node({overflowY:'auto'},{scrollHeight:300,clientHeight:300},page);assert.equal(scrollable(short,0,40,win),false,'a list that fits');
 // Sideways (a row of tabs), also right to left.
 const tabs=node({overflowX:'auto'},{scrollWidth:500,clientWidth:200},page);
 assert.equal(scrollable(tabs,60,10,win),true);assert.equal(scrollable(tabs,-60,10,win),false);
 const rtl=node({overflowX:'auto',direction:'rtl'},{scrollWidth:500,clientWidth:200},page);
 assert.equal(scrollable(rtl,-60,0,win),true,'right to left: further means the other way');assert.equal(scrollable(rtl,60,0,win),false);
 assert.equal(scrollable(row,0,0,win),false);assert.equal(scrollable(null,0,40,win),false);
});

test('one listener on the page stops every other wheel, in pixels, lines or pages',()=>{
 let listener=null,options=null;
 const doc={addEventListener:(type,fn,o)=>{assert.equal(type,'wheel');listener=fn;options=o;},removeEventListener(){listener=null;}};
 const stop=guardWheel(doc,win);assert.deepEqual(options,{passive:false},'it may stop the wheel');
 const page=node({}),list=node({overflowY:'auto'},{scrollHeight:600,clientHeight:300},page);
 const wheel=(target,deltaY,extra={})=>{const e={target,deltaY,deltaX:0,deltaMode:0,defaultPrevented:false,prevented:0,preventDefault(){this.prevented++;},...extra};listener(e);return e.prevented;};
 assert.equal(wheel(page,40),1,'over the bars');
 assert.equal(wheel(list,40),0,'a list scrolls');
 assert.equal(wheel(list,-3,{deltaMode:1}),1,'lines up at its top');
 assert.equal(wheel(page,40,{defaultPrevented:true}),0,'the farm zoomed with it already');
 stop();assert.equal(listener,null);
 assert.deepEqual(guardWheel(null)(),undefined,'no page, nothing to do');
});

test('the farm page and the CrazyGames page both guard the wheel, and overscroll stays on the page',()=>{
 assert.match(read('public/game.js'),/^import \{ guardWheel \} from '\.\/wheel-guard\.js';$/m);
 assert.match(read('public/game.js'),/\nguardWheel\(\);\n/);
 assert.match(read('src/crazygames.js'),/import \{guardWheel\} from '\.\.\/public\/wheel-guard\.js';/);
 assert.match(read('src/crazygames.js'),/ guardWheel\(document\);\n/);
 assert.match(read('public/styles.css'),/html,body\{overscroll-behavior:none\}dialog\{overscroll-behavior:contain\}/);
 assert.match(read('public/crazygames.css'),/html,body\{overscroll-behavior:none\}/);
 // The farm's own zoom still stops its wheel first (farm-input.js).
 assert.match(read('public/farm-input.js'),/canvas\.addEventListener\('wheel',event=>\{\n  if\(!isReady\(\)\)return;\n  event\.preventDefault\(\);/);
});
