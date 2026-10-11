import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,QUESTS,BUILDINGS,xpForLevel,levelOf,questXp,buildingCost,WORLD_TWO_LEVEL,worldTwoBuilding} from '../game/farm-state.js';
import {nextGoal,actNow,questGuide} from '../public/next-goal.js';
import {questGroups} from '../public/quests-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,11,12);
// A farmer about ten minutes in: the guide done, level 5, a handful of quests finished.
function finisher({coins=900,level=5}={}){
 const s=createFarm(now);s.xp=xpForLevel(level)+20;s.coins=coins;
 s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 Object.assign(s.stats,{harvested:24,planted:12,watered:5,tended:3,sold:14,earned:520,produced:2,made_eggs:2,collected:2,harvest_wheat:8,harvest_corn:16});
 return s;
}

// 11 Oct 2026 (Part A, A8 and A13): after the guide there was no goal on screen, and 9 or more finished quests waited unclaimed.
test('the next goal: a quest to claim first, then a building to build, then the nearest quest, then the next level',()=>{
 const s=finisher(),ready=questGroups(s).ready;
 assert.ok(ready.length>=5,'a finisher has quests waiting');
 let goal=nextGoal(s);
 assert.deepEqual(goal,{kind:'quest',id:ready[0].id,title:QUESTS[ready[0].id].title,stat:QUESTS[ready[0].id].stat,coins:QUESTS[ready[0].id].reward,xp:questXp(QUESTS[ready[0].id]),ready:ready.length});
 assert.ok(actNow(goal));
 // Claimed one by one: each claim takes exactly one quest, and the goal moves on to the next.
 for(let i=0;i<ready.length;i++){const before=s.claimed.length;act(s,{type:'quest',id:nextGoal(s).id},now);assert.equal(s.claimed.length,before+1);}
 goal=nextGoal(s);
 // Then the cheapest building that opened and can be paid for now; never one still locked, never a village place.
 if(goal.kind==='build'){
  assert.ok(buildingCost(s,goal.key)<=s.coins);assert.equal(goal.name,BUILDINGS[goal.key].name);assert.equal(goal.cost,buildingCost(s,goal.key));assert.ok(actNow(goal));
  assert.equal(worldTwoBuilding(goal.key),false);
 }else assert.fail(`expected a building, got ${goal.kind}`);
 // Without the coins for it: the open quest closest to done, with its progress and where Show me points.
 s.coins=0;goal=nextGoal(s);
 assert.equal(goal.kind,'progress');assert.ok(goal.value<goal.target);assert.equal(actNow(goal),false);
 const shares=questGroups(s).active.map(e=>e.value/e.quest.target);assert.equal(goal.value/goal.target,Math.max(...shares),'the one closest to done');
 assert.equal(goal.guide,questGuide(goal.stat));
});

test('the next goal never shows the village below level 100, never a locked building, and falls back to the next level',()=>{
 for(const level of [5,30,60,99]){
  const s=finisher({level,coins:1e9});for(const [key,b] of Object.entries(s.buildings))if(!worldTwoBuilding(key))b.built=true;
  s.claimed=QUESTS.map((_,i)=>i);
  const goal=nextGoal(s);
  assert.notEqual(goal.kind,'quest');assert.notEqual(goal.kind,'build',`level ${level}: nothing left to build on the farm`);
  if(goal.kind==='level'){assert.equal(goal.level>levelOf(s),true);assert.ok(goal.target>0);}
  if(level<WORLD_TWO_LEVEL)assert.doesNotMatch(JSON.stringify(goal),/[Vv]illage|Landmark/,`level ${level}`);
 }
 // A building that is not open yet is never the goal, however many coins.
 const s=finisher({level:2,coins:1e9});s.claimed=QUESTS.map((_,i)=>i);
 const goal=nextGoal(s);if(goal.kind==='build')assert.ok(levelOf(s)>=2&&['mill'].includes(goal.key),goal.key);
 assert.equal(questGuide('harvest_wheat'),'harvest');assert.equal(questGuide('made_eggs'),'produce');assert.equal(questGuide('earned'),'market');assert.equal(questGuide('upgrades'),null);
});

// The card itself (beginner-ui.js): one tap claims exactly one quest, then it shows the next goal; the phone's line opens Quests at it.
function page(){
 const els=new Map();
 class El{hidden=false;open=false;disabled=false;className='';textContent='';innerHTML='';attrs={};listeners={};classList={toggle(){},add(){},remove(){},contains:()=>false};
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]??null;}close(){this.open=false;}showModal(){this.open=true;}focus(){}querySelector(){return new El();}getClientRects(){return [];}
  click(){for(const fn of this.listeners.click??[])fn({target:this});}}
 const get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
 return {get,document:{getElementById:get,querySelector:get,querySelectorAll:()=>[]}};
}
test('the next-goal card claims one quest per tap and the phone line opens Quests at that quest',async()=>{
 const {createBeginnerUI}=await import('../public/beginner-ui.js');
 const previous=globalThis.document,{get,document}=page();globalThis.document=document;
 try{
  const s=finisher(),claims=[],opened=[],store=new Map();
  const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a,now),icons(){},notify(){},onChange(){},guide(){},
   claimQuest:async id=>{claims.push(id);act(s,{type:'quest',id},now);},openQuest:id=>opened.push(id),storage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)}});
  assert.equal(get('.beginner-card').hidden,true,'the guide is done');assert.equal(get('next-goal-card').hidden,false);assert.equal(get('next-goal-mobile').hidden,false,'a quest to claim: the phone shows the line');
  const first=nextGoal(s);assert.equal(get('next-goal-title').textContent,first.title);assert.equal(get('next-goal-button').textContent,'Claim');
  assert.equal(get('next-goal-mobile-copy').textContent,`Quest ready: ${first.title}`);
  get('next-goal-button').click();await new Promise(r=>setTimeout(r,0));
  assert.deepEqual(claims,[first.id],'one quest, the one shown');assert.notEqual(get('next-goal-title').textContent,first.title,'then the next goal');
  get('next-goal-mobile').click();assert.deepEqual(opened,[nextGoal(s).id],'the phone line opens Quests at the quest');assert.equal(claims.length,1,'and claims nothing itself');
  // Folded on this device, kept for next time.
  get('next-goal-collapse').click();assert.equal(get('next-goal-body').hidden,true);assert.equal(store.get('harvest-tycoon:next-goal'),'folded');
  // Nothing to claim or build: the phone line steps aside, the card stays on a computer.
  s.claimed=QUESTS.map((_,i)=>i);s.coins=0;ui.refresh();assert.equal(get('next-goal-mobile').hidden,true);assert.equal(get('next-goal-card').hidden,false);
 }finally{globalThis.document=previous;}
 // Never a Claim all: the card and the line only ever claim one quest.
 const ui=read('public/beginner-ui.js');assert.doesNotMatch(ui,/Claim all/i);assert.match(ui,/try\{await claimQuest\(goal\.id\);\}/);
 assert.match(read('public/game.js'),/claimQuest:claim,openQuest:id=>quests\.openAt\(id\)/);
 assert.match(read('public/quests-ui.js'),/function openAt\(id\)\{open\(\);const button=list\.querySelector\(`\[data-claim="\$\{Number\(id\)\}"\]`\);/);
 // The Quests button counts the quests that wait, one tap each.
 assert.match(read('public/game.js'),/\$\('task-dot'\)\.hidden=!waiting;\$\('task-dot'\)\.textContent=waiting>99\?'99\+':String\(waiting\);/);
 assert.match(read('public/privacy.html'),/<code>harvest-tycoon:next-goal<\/code>/,'the device key is on the privacy page');
});

test('the guide-complete card leads to the next goal with one green button and Thank you beside it',()=>{
 const game=read('public/game.js'),html=read('public/farm.html');
 assert.match(game,/if\(goal\.kind==='quest'\)return \{label:'Claim your next quest',run:\(\)=>quests\.openAt\(goal\.id\)\};/,'one quest: Quests at that quest');
 assert.match(game,/if\(goal\.kind==='build'\)return \{label:`Build the \$\{goal\.name\}`,run:\(\)=>showWay\(`build:\$\{goal\.key\}`\)\};/);
 assert.match(game,/return \{label:'Plant your fields',run:\(\)=>\{setCrop\('wheat'\);focusFields\(\);\}\};/);
 assert.match(html,/<div class="gift-actions" hidden><button type="button" class="secondary-button gift-thanks close-dialog">Thank you!<\/button><button type="button" class="primary-button gift-action"><\/button><\/div><button type="button" class="primary-button gift-done close-dialog">Thank you!<\/button>/);
 assert.match(game,/actions\.hidden=!action;document\.querySelector\('#gift-dialog \.gift-done'\)\.hidden=Boolean\(action\);/,'one green button either way');
 // Show me for a building: through Buildings (or its name on the map) to its Build button.
 assert.match(read('public/guide-steps.js'),/if\(typeof target==='string'&&target\.startsWith\('build:'\)\)\{const key=target\.slice\(6\);return \[\.\.\.building\(key,'Tap this building\.','Open this building\.'\),\{find:\(\)=>doc\.querySelector\('dialog\[open\] #construct-building'\),text:'Build it here\.'\}\];\}/);
});
