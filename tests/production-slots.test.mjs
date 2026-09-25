import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction,productionSlots,productionJobs,recipeValue,recipeAvailability,upgradeCost,BUILDINGS,BUILDING_COSTS,UPGRADE_BUILD_SHARE,RECIPES,CROPS,BOOSTS,ITEMS,farmSummary,marketQuote} from '../game/farm-state.js';
import {createProductionCueTracker} from '../public/farm-audio.js';
import {createBeginnerUI} from '../public/beginner-ui.js';
const now=1789690000000;
function farm(){const s=createFarm(now);s.xp=200000;for(const b of Object.values(s.buildings))b.built=true;s.coins=1000000;s.diamonds=500;for(const k of Object.keys(s.inventory))s.inventory[k]=1000;return s;}
const act=(s,a,t=now)=>applyFarmAction(s,a,t);
test('every production building permits exactly one simultaneous batch per level',()=>{
 for(const [id,b] of Object.entries(BUILDINGS).filter(([id,b])=>b.type==='production'&&id!=='factory'))for(let level=1;level<=10;level++){
  const s=farm();s.buildings[id].level=level;const recipe=Object.keys(RECIPES).find(k=>RECIPES[k].building===id);
  for(let i=0;i<level;i++)act(s,{type:'produce',recipe});
  const jobs=productionJobs(s.buildings[id]);assert.equal(jobs.length,level);assert.equal(new Set(jobs.map(j=>j.id)).size,level);assert(jobs.every(j=>j.startedAt===now));
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'produce',recipe}),/slots/);assert.deepEqual(s,before);assert.equal(recipeAvailability(s,recipe).slots,level);
 }
});
test('mixed recipes finish independently, targeted collection and replay cannot steal another batch',()=>{
 const s=farm();s.buildings.mill.level=3;const oil=act(s,{type:'produce',recipe:'oil'}),feed=act(s,{type:'produce',recipe:'feed'}),barley=act(s,{type:'produce',recipe:'barleyfeed'});
 assert.throws(()=>act(s,{type:'collect',building:'mill',jobId:oil.jobId},feed.readyAt),/still/);
 const before=s.inventory.feed;act(s,{type:'collect',building:'mill',jobId:feed.jobId},feed.readyAt);assert.equal(s.inventory.feed,before+1);assert.equal(s.stats.produced,1);
 const snapshot=structuredClone(s);assert.throws(()=>act(s,{type:'collect',building:'mill',jobId:feed.jobId},feed.readyAt),/Nothing/);assert.deepEqual(s,snapshot);
 assert.throws(()=>act(s,{type:'collect',building:'coop',jobId:barley.jobId},barley.readyAt),/Nothing/);
 const next=act(s,{type:'produce',recipe:'feed'},feed.readyAt);assert.notEqual(next.jobId,feed.jobId);assert.equal(productionJobs(s.buildings.mill).length,3);
 const running=structuredClone(productionJobs(s.buildings.mill));act(s,{type:'upgrade',building:'mill'},feed.readyAt);
 assert.equal(s.buildings.mill.level,4);assert.deepEqual(productionJobs(s.buildings.mill),running,'upgrading mid-batch leaves every running job exactly as it was');
 const summary=farmSummary(s,feed.readyAt).buildings.find(b=>b.id==='mill');assert.equal(summary.jobs.length,3);assert.equal(summary.status,'ready');
});
test('ready goods occupy a slot; old clients collect ready jobs; promotion and reload preserve jobs',()=>{
 const s=farm();s.buildings.mill.level=2;const first=act(s,{type:'produce',recipe:'oil'}),second=act(s,{type:'produce',recipe:'feed'});
 assert.throws(()=>act(s,{type:'produce',recipe:'feed'},second.readyAt),/slots/);
 act(s,{type:'collect',building:'mill'},second.readyAt);assert.equal(s.buildings.mill.job.id,first.jobId);
 const third=act(s,{type:'produce',recipe:'feed'},second.readyAt);act(s,{type:'collect',building:'mill',jobId:first.jobId},first.readyAt);
 assert.equal(s.buildings.mill.job.id,third.jobId);assert.deepEqual(s.buildings.mill.extraJobs,[]);
 assert.deepEqual(normalizeFarm(structuredClone(s),now),s);
});
test('old saves migrate in place, keeping paid-for output, timers, rewards and balances',()=>{
 const s=farm();s.version=7;const job={recipe:'oil',startedAt:now-100,readyAt:now+100,output:{oil:3},xp:99};s.buildings.mill.job=structuredClone(job);delete s.buildings.mill.extraJobs;delete s.buildings.mill.batchSequence;
 s.onboarding={completed:10,rewardClaimed:true,milestones:{}};const before=structuredClone(s);normalizeFarm(s,now);
 assert.equal(s.coins,before.coins);assert.equal(s.diamonds,before.diamonds);assert.deepEqual(s.onboarding,before.onboarding);
 const {id,...saved}=s.buildings.mill.job;assert(id);assert.deepEqual(saved,job);const output=act(s,{type:'collect',building:'mill',jobId:id},now+100);assert.deepEqual(output.items,{oil:3});assert.equal(output.xp,99);
});
test('instant production finishes every parallel job and grants nothing until collection',()=>{
 const s=farm();s.buildings.mill.level=3;for(let i=0;i<3;i++)act(s,{type:'produce',recipe:'oil'});const before=s.inventory.oil;
 const result=act(s,{type:'buy_boost',boost:'production',expectedCost:BOOSTS.production.cost},now+10);assert.equal(result.affected,3);assert.equal(s.inventory.oil,before);
 for(const j of [...productionJobs(s.buildings.mill)])act(s,{type:'collect',building:'mill',jobId:j.id},now+10);
 assert.equal(s.inventory.oil,before+3);assert.equal(s.stats.produced,3);assert.equal(s.buildings.mill.job,null);
});
test('higher-level production, early upgrade pricing and vouchers stay consistent',()=>{
 for(const [id,b] of Object.entries(BUILDINGS).filter(([id,b])=>b.type==='production'&&id!=='factory')){
  const s=farm();for(const level of [1,2,3]){s.buildings[id].level=level;const base=Math.max(Math.round(b.upgradeCost*(level<3?level*1.5:12)),Math.round((BUILDING_COSTS[id]??0)*UPGRADE_BUILD_SHARE*2.7**(level-1)));assert.equal(upgradeCost(s,id),base);s.boosts.upgradeCredits=1;assert.equal(upgradeCost(s,id),Math.ceil(base/2));s.boosts.upgradeCredits=0;}
  s.buildings[id].level=1;const result=act(s,{type:'upgrade',building:id});assert.equal(productionSlots(result.level),2);
 }
});
test('long-wait crops earn less raw while all recipes add value and planting stays profitable',()=>{
 const old={cabbage:170,cauliflower:300,pumpkin:480,redcabbage:720,sunflower:1100};
 for(const [id,price] of Object.entries(old)){assert(CROPS[id].sell<price*.7);assert(CROPS[id].sell>CROPS[id].cost);}
 for(const id of Object.keys(RECIPES))if(!RECIPES[id].coins)assert(recipeValue(id).added>0,id);
 for(const id of ['oil','pickles','pie','vegetables']){const v=recipeValue(id);assert(v.output>=v.input*1.45);}
 assert.equal(CROPS.wheat.sell,8);assert.equal(CROPS.corn.sell,40);
 const s=farm();for(const k in s.inventory)s.inventory[k]=0;s.inventory.sunflower=2;const start=s.coins;act(s,{type:'sell',item:'sunflower'});assert.equal(s.coins-start,marketQuote('sunflower',now).price*2);
 assert.equal(s.stats.sold,2);
 s.inventory.wheat=3;s.inventory.corn=1;act(s,{type:'sell',category:'crops'});assert.equal(s.stats.sold,2+3+1);
});
test('a second batch becoming ready triggers one cue even with a long-running first batch',()=>{
 const b={mill:{job:{id:'mill-1',recipe:'oil',startedAt:0,readyAt:10000},extraJobs:[{id:'mill-2',recipe:'feed',startedAt:0,readyAt:1000}]}},tracker=createProductionCueTracker(b,0);
 assert.equal(tracker.check(b,1000),true);assert.equal(tracker.check(b,2000),false);assert.equal(tracker.check(b,10000),true);
});
test('completed beginner guide disappears from desktop, mobile and menu, including after reload',async()=>{
 const previous=globalThis.document;const elements=new Map();
 class Element {hidden=false;open=false;classList={toggle(){}};listeners={};addEventListener(type,fn){this.listeners[type]=fn;}close(){this.open=false;}showModal(){this.open=true;}focus(){}querySelector(){return new Element();}}
 const get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 globalThis.document={getElementById:get,querySelector:get,querySelectorAll:selector=>selector==='[data-menu-action="all-quests-mobile"]'?[get('menu')]:[]};
 try{
  const s=farm();s.onboarding={completed:9,rewardClaimed:false,milestones:{collect:true}};const originalDiamonds=s.diamonds;
  const ui=createBeginnerUI({state:s,runAction:async a=>act(s,a),icons(){},notify(){},onChange(){},guide(){}});
  assert.equal(get('.beginner-card').hidden,false);ui.open();assert.equal(get('beginner-dialog').open,true);
  await get('claim-reward').listeners.click();assert.equal(s.diamonds,originalDiamonds+50);
  for(const el of ['.beginner-card','beginner-mobile','menu'])assert.equal(get(el).hidden,true,el);assert.equal(get('beginner-dialog').open,false);
  ui.open();assert.equal(get('beginner-dialog').open,false);ui.refresh();assert.equal(get('.beginner-card').hidden,true);assert.equal(s.diamonds,originalDiamonds+50);
 }finally{globalThis.document=previous;}
});
