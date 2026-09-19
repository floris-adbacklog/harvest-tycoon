import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingScreen} from '../public/loading-screen.js';
function fixture(){const nodes=new Map();const doc={getElementById(id){if(!nodes.has(id))nodes.set(id,{value:0,textContent:''});return nodes.get(id);}};return{doc,nodes};}
test('loading waits for both account data and scenery, then the rendered frame',()=>{
 const {doc,nodes}=fixture(),screen=createLoadingScreen(doc,4);
 screen.modelsReady(4);assert.equal(nodes.get('load-progress').value,66);assert.match(nodes.get('load-text').textContent,/saved farm/);
 screen.accountReady();assert.equal(nodes.get('load-progress').value,83);assert.match(nodes.get('load-text').textContent,/finishing touches/);
 screen.complete();assert.equal(nodes.get('load-progress').value,100);assert.equal(nodes.get('load-heading').textContent,'Welcome home, farmer.');
 screen.modelsReady(1);assert.equal(nodes.get('load-progress').value,100);
});
test('fast account response and out-of-order asset callbacks never regress progress',()=>{
 const {doc,nodes}=fixture(),screen=createLoadingScreen(doc,4);
 screen.accountReady();assert.equal(nodes.get('load-progress').value,16);
 screen.modelsReady(3);assert.equal(nodes.get('load-progress').value,66);
 screen.modelsReady(2);assert.equal(nodes.get('load-progress').value,66);
 screen.modelsReady(4);assert.equal(nodes.get('load-progress').value,83);
 assert.ok(nodes.get('farm-loading-tip').textContent.length>10);
});
