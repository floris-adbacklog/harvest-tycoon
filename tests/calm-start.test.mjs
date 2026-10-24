// A calm start (24 Oct 2026, the owner, after players said a new farm overwhelmed them: "Doe alle 4"): the farm screen shows only what
// the guide's step needs and each button comes with its step, the first four steps have a spotlight on the place to tap, and the farm
// opens on the fields until step 5.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,BEGINNER_QUESTS} from '../public/farm-state.js';
import {calmStep,calmRevealed,CALM_REVEALS,CALM_UNTIL_LEVEL} from '../public/beginner-ui.js';
import {createSpotlight,SPOT_SKIP_KEY,SPOT_PAD} from '../public/spotlight.js';
globalThis.matchMedia??=()=>({matches:true,addEventListener(){}});
const {railShown}=await import('../public/event-rail.js');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,24,12);

test('a calm start lasts until the guide is done, or level 10 on a farm that never finished it; never in the village',()=>{
 const s=createFarm(now);
 assert.equal(calmStep(s),0,'a new farm: no step done yet');
 assert.equal(calmStep(s,{village:true}),null);
 s.onboarding={...s.onboarding,completed:3};assert.equal(calmStep(s),3);
 s.onboarding={...s.onboarding,completed:BEGINNER_QUESTS.length,rewardClaimed:true};assert.equal(calmStep(s),null,'the guide is done');
 const old=createFarm(now);old.xp=xpForLevel(CALM_UNTIL_LEVEL);assert.equal(calmStep(old),null,'from level 10 the whole screen, guide or not');
 old.xp=xpForLevel(CALM_UNTIL_LEVEL-1);assert.notEqual(calmStep(old),null);
});

test('each button comes with the step that uses it, and what comes is told once',()=>{
 assert.deepEqual(calmRevealed(0,1),['#market-button'],'Market for step 2, the first sale');
 assert.deepEqual(calmRevealed(2,3),['.tool[data-tool="water"]']);assert.deepEqual(calmRevealed(3,4),['#buildings-button']);
 assert.deepEqual(calmRevealed(4,5),['#today-button']);assert.deepEqual(calmRevealed(6,7),['.tool[data-tool="tend"]']);
 assert.deepEqual(calmRevealed(9,null),['#tasks-button,#events-button,#estate-button'],'the rest once the guide is done');
 assert.deepEqual(calmRevealed(undefined,0),[],'nothing glows as the farm opens');assert.deepEqual(calmRevealed(2,2),[]);
 // The sheet hides each one until its step: the steps done before it comes, as data-guide-step.
 const css=read('public/beginner.css');
 const rule=sel=>{const i=css.indexOf(`) ${sel}{display:none!important}`);assert.ok(i>0,sel);const start=css.lastIndexOf('\n',i);return [...css.slice(start,i).matchAll(/\[data-guide-step="(\d)"\]/g)].map(m=>Number(m[1]));};
 const steps=n=>Array.from({length:n},(_,i)=>i);
 assert.deepEqual(rule('.tool[data-tool="water"]'),steps(3));assert.deepEqual(rule(':is(#buildings-button,.building-label)'),steps(4));
 assert.deepEqual(rule('#today-button'),steps(5));assert.deepEqual(rule('.activity-label'),steps(6));assert.deepEqual(rule('.tool[data-tool="tend"]'),steps(7));
 assert.match(css,/html\.calm-start\[data-guide-step="0"\] #market-button\{display:none!important\}/);
 for(const id of ['tasks-button','events-button','estate-button','pass-button','season-button','family-button','chat-button','offer-button','starter-pack-chip'])assert.match(css,new RegExp(`html\\.calm-start :is\\([^)]*#${id}[,)]`),id);
 for(const sel of ['.minimap','.building-label.locked','.farmer-name','.pond-label'])assert.ok(css.includes(sel),sel);
 for(const [at] of CALM_REVEALS)assert.ok(at>=1&&at<=10);
 // More stays: it opens every window.
 assert.doesNotMatch(css.slice(css.indexOf('---- A calm start')),/#more-button/);
});

test('the guide marks <html> and tells the game; the rail shows only Today in a calm start',()=>{
 const ui=read('public/beginner-ui.js');
 assert.match(ui,/root\.classList\.toggle\('calm-start',step!==null\);if\(step===null\)delete root\.dataset\.guideStep;else root\.dataset\.guideStep=String\(step\);/);
 assert.match(ui,/if\(before===undefined\)return;/,'the first look only notes');
 assert.match(ui,/onStep\?\.\(step,before\);/);
 const node=(id,waiting=true)=>({id,hidden:false,classList:{contains:n=>n==='is-waiting'&&waiting}});
 const page={'today-button':node('today-button'),'pass-button':node('pass-button'),'season-button':node('season-button')};
 const calm={documentElement:{classList:{contains:n=>n==='calm-start'}},getElementById:id=>page[id]??null};
 assert.deepEqual(railShown(calm).map(b=>b.id),['today-button']);
 const full={documentElement:{classList:{contains:()=>false}},getElementById:id=>page[id]??null};
 assert.deepEqual(railShown(full).map(b=>b.id),['today-button','pass-button','season-button']);
});

test('the spotlight: the place to tap clear, the farm dimmed, every tap goes through; Skip ends it on this device',()=>{
 const els=[];const make=()=>{const e={hidden:false,style:{},classes:new Set(),attrs:{},kids:[],on:{},append:(...n)=>e.kids.push(...n),setAttribute:(k,v)=>{e.attrs[k]=v;},addEventListener:(t,f)=>{e.on[t]=f;},classList:{toggle:(n,v)=>v?e.classes.add(n):e.classes.delete(n)}};els.push(e);return e;};
 const game={...make(),getBoundingClientRect:()=>({left:10,top:20})};
 const doc={getElementById:id=>id==='game'?game:null,createElement:()=>make()};
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const spot=createSpotlight({doc,storage});
 const [layer,hole,skip]=els.slice(1);
 assert.equal(layer.className,'spotlight');assert.equal(layer.hidden,true);assert.equal(skip.textContent,'Skip tutorial');
 spot.show({left:110,top:220,right:210,bottom:300});
 assert.equal(layer.hidden,false);assert.equal(hole.hidden,false);
 assert.deepEqual(hole.style,{left:`${100-SPOT_PAD}px`,top:`${200-SPOT_PAD}px`,width:`${100+2*SPOT_PAD}px`,height:`${80+2*SPOT_PAD}px`},'in the farm\'s own pixels, with room around it');
 spot.show(null,{all:true});assert.ok(layer.classes.has('is-all'));assert.equal(hole.hidden,true,'the sale: the whole farm dims, the Market glows above it');
 spot.show(null);assert.equal(layer.hidden,true,'nothing to point at: no spotlight');
 skip.on.click();assert.equal(store.get(SPOT_SKIP_KEY),'1');assert.equal(spot.skipped,true);
 spot.show({left:0,top:0,right:10,bottom:10});assert.equal(layer.hidden,true,'skipped stays skipped');
 assert.equal(createSpotlight({doc,storage}).skipped,true,'on this device');
 const css=read('public/beginner.css');
 assert.match(css,/\.spotlight\{position:absolute;inset:0;z-index:4;pointer-events:none;/,'over the farm\'s names (2), under the bars (6 and up); taps go through');
 assert.match(css,/\.spotlight-skip\{position:absolute;z-index:7;/);
});

test('the game: the spotlight for the first four steps only, never over a window or in the village; the camera',()=>{
 const game=read('public/game.js');
 assert.match(game,/if\(step===null\|\|step>3\|\|!ready\|\|document\.querySelector\('dialog\[open\]'\)\)return null;/);
 assert.match(game,/if\(current\.id==='sell'\)return \{all:true\};/);
 assert.match(game,/if\(!villageWorld&&!adminView\)spot=createSpotlight\(\);/);
 assert.match(game,/if\(spot\)\{const target=spotTarget\(\);if\(target\)spot\.show\(target\.rect\?\?null,\{all:Boolean\(target\.all\)\}\);else spot\.hide\(\);\}/);
 assert.match(read('public/farm.html'),/<link rel="modulepreload" href="\/spotlight\.js">/);
});

test('no pop-ups before the guide is done: each one that opens by itself waits for the end of a calm start',()=>{
 const game=read('public/game.js'),calm=/!doc\.documentElement\?\.classList\?\.contains\?\.\('calm-start'\)/;
 assert.match(game,/canShow:\(\)=>ready&&[^}]*&&calmStep\(state\)===null\}\)/,'the reminder question');
 assert.match(game,/if\(calmStep\(state\)!==null\)\{farmerKnown=known;return;\}/,'"Something new to wear", said after the guide');
 assert.match(game,/state\.stats\.harvested>0&&calmStep\(state\)===null&&\(!initialWelcome/,'the "Welcome back" toast on a reload');
 assert.match(game,/quiet:\(\)=>modalOpen\(\)\|\|calmStep\(state\)!==null\}\)/,'Kongregate\'s full-screen tip');
 for(const file of ['src/popup-ui.js','src/offer-ui.js','src/checkout-reminder-ui.js'])assert.match(read(file),calm,file);
});
