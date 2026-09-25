import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitText} from '../public/fit-text.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 25 Sep 2026: on a phone the diamonds read "1…": the number is now made just small enough to fit its pill.
test('a number that does not fit its pill is made smaller, a pixel at a time, and only measured again when something changed',()=>{
 const make=(textWidth,room)=>{let size=21;const el={textContent:'1.2K',dataset:{},style:{},parentElement:{clientWidth:room+40},get clientWidth(){return room;},get scrollWidth(){return Math.ceil(textWidth*(parseFloat(this.style.fontSize)||size)/21);}};return el;};
 const previous=globalThis.getComputedStyle;globalThis.getComputedStyle=()=>({fontSize:'21px'});
 try{
  const wide=make(46,41);fitText(wide);assert.equal(wide.style.fontSize,'18px','46 wide at 21px fits 41 at 18px');
  const fits=make(30,41);fitText(fits);assert.equal(fits.style.fontSize,'','a number that fits keeps its size');
  const tiny=make(80,10);fitText(tiny);assert.equal(tiny.style.fontSize,'11px','never smaller than 11px');
  wide.style.fontSize='99px';fitText(wide);assert.equal(wide.style.fontSize,'99px','same text, same room: nothing is measured again');
 }finally{globalThis.getComputedStyle=previous;}
 assert.match(read('public/game.js'),/fitText\(\$\('coins'\)\);/);assert.match(read('public/boosts-ui.js'),/fitText\(\$\('diamonds'\)\);/);
 assert.match(read('public/mobile.css'),/\.diamond-counter>span:last-child\{position:absolute;top:-5px;right:-5px;/,'the + is a badge on the corner, not a column of its own');
});
