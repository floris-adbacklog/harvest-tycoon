import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLoadingScreen,startLoadingTips,LOADING_TIPS,FARM_START,ACCOUNT_STEPS} from '../public/loading-screen.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function fixture(){const nodes=new Map();const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,{value:0,textContent:'',src:'',parentElement:{classList:{add(){},remove(){}}}});return nodes.get(id);}};return{doc,nodes};}

test('the farm bar goes on from the account check and says the real step; Ready! only at 100%',()=>{
 const {doc,nodes}=fixture(),screen=createLoadingScreen(doc,4);
 assert.equal(nodes.get('load-progress').value,FARM_START);assert.equal(nodes.get('load-text').textContent,'Loading your farm');
 screen.modelsReady(4);assert.equal(nodes.get('load-progress').value,70);assert.equal(nodes.get('load-text').textContent,'Opening your saved farm');
 screen.accountReady();assert.equal(nodes.get('load-progress').value,85);assert.equal(nodes.get('load-text').textContent,'Planting the fields');
 screen.complete();assert.equal(nodes.get('load-progress').value,100);assert.equal(nodes.get('load-text').textContent,'Ready!');
 screen.modelsReady(1);assert.equal(nodes.get('load-progress').value,100);
 assert.ok(Math.max(...Object.values(ACCOUNT_STEPS))<FARM_START,'the account check stays below where the farm starts');
});

test('fast account response and out-of-order asset callbacks never regress progress, and it never says ready early',()=>{
 const {doc,nodes}=fixture(),screen=createLoadingScreen(doc,4);
 screen.accountReady();const a=nodes.get('load-progress').value;
 screen.modelsReady(3);const b=nodes.get('load-progress').value;assert.ok(b>a);
 screen.modelsReady(2);assert.equal(nodes.get('load-progress').value,b);
 screen.modelsReady(4);assert.ok(nodes.get('load-progress').value<100);assert.notEqual(nodes.get('load-text').textContent,'Ready!');
});

test('a tip with a painted picture changes every few seconds and stops when asked',()=>{
 const {doc,nodes}=fixture(),timers={intervals:[],setInterval(fn){this.intervals.push(fn);return 1;},setTimeout(fn){fn();return 2;},clearInterval(){this.stopped=true;},clearTimeout(){}};
 const stop=startLoadingTips(doc,{timers,now:0});
 assert.equal(nodes.get('loading-tip-text').textContent,LOADING_TIPS[0][1]);assert.equal(nodes.get('loading-tip-icon').src,`/assets/icons/${LOADING_TIPS[0][0]}.webp`);
 timers.intervals[0]();assert.equal(nodes.get('loading-tip-text').textContent,LOADING_TIPS[1][1]);
 stop();assert.equal(timers.stopped,true);
 for(const [picture] of LOADING_TIPS)assert.ok(readFileSync(new URL(`../public/assets/icons/${picture}.webp`,import.meta.url)).length>1000,picture);
});

test('the sign-in check and the farm show the same calm screen, and it fades into the farm',()=>{
 for(const page of ['public/play.html','public/farm.html']){
  const html=read(page);
  assert.match(html,/class="farm-loading-stage">\n <img class="farm-loading-logo"/,page);
  assert.match(html,/<p class="farm-loading-tip"><img id="loading-tip-icon"/,page);
  assert.doesNotMatch(html,/farm-loading-crops|farm-loading-eyebrow|farm-loading-footer/,page);
 }
 assert.match(read('public/game.js'),/\$\('loading'\)\.classList\.add\('fade'\);/);
 assert.match(read('src/main.js'),/const step=ACCOUNT_STEPS\[message\]\?\?6;/);
});
