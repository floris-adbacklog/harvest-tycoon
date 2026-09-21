import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,normalizeFarm,RECIPES,PROJECTS,CHAPTER_DIAMONDS,currentProject,grantChapterRewards,productionJobs,recipeValue,dailyOrders,ORDER_POOL,PRODUCTS,availableDaily,xpForLevel,DAY_MS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,16);
function farm(){const s=createLegacyFarm(now);s.xp=xpForLevel(28);s.levelRewards=Array.from({length:28},(_,i)=>i+1);s.coins=100000000;s.diamonds=0;s.mastery.claimed=Array.from({length:24},(_,i)=>String(i));for(const k in s.inventory)s.inventory[k]=1000;return s;}

test('new bulk feed is more ingredient-efficient, with positive production margins',()=>{
 assert.equal(RECIPES.windfeed.output.feed,10);
 assert.ok(RECIPES.windfeed.input.barley/RECIPES.windfeed.output.feed<RECIPES.barleyfeed.input.barley/RECIPES.barleyfeed.output.feed);
 for(const id of Object.keys(RECIPES))if(!RECIPES[id].coins)assert.ok(recipeValue(id).added>0,id);   // bottled honey is a coin sink on purpose
 const s=farm();s.buildings.windmill.level=2;
 s.buildings.windmill.job={id:'windmill-old',recipe:'windfeed',startedAt:now-1200000,readyAt:now,output:{feed:7},xp:32};
 const stock=s.inventory.feed;act(s,{type:'collect',building:'windmill',jobId:'windmill-old'},now);assert.equal(s.inventory.feed,stock+7);
 const created=act(s,{type:'produce',recipe:'windfeed'},now);const job=productionJobs(s.buildings.windmill)[0];assert.equal(job.output.feed,10);
 act(s,{type:'collect',building:'windmill',jobId:created.jobId},created.readyAt);assert.equal(s.inventory.feed,stock+17);
});
test('long production earns its new XP while already-running batches keep the promised XP',()=>{
 const s=farm();s.buildings.mill.level=2;
 s.buildings.mill.job={id:'mill-old',recipe:'oil',startedAt:now-1,readyAt:now,output:{oil:1},xp:15};
 assert.equal(act(s,{type:'collect',building:'mill',jobId:'mill-old'},now).xp,15);
 const job=act(s,{type:'produce',recipe:'oil'},now);s.boosts.xpUntil=job.readyAt+1000;
 assert.equal(act(s,{type:'collect',building:'mill',jobId:job.jobId},job.readyAt).xp,160);
 assert.equal(RECIPES.feed.xp,4);assert.equal(RECIPES.barleyfeed.xp,6);assert.equal(RECIPES.flour.xp,8);
});
test('village orders follow accessible advanced recipes and keep the quick order easy',()=>{
 const s=farm();s.buildings.kitchen.built=true;
 for(let day=0;day<30;day++){
  const t=now+day*DAY_MS;delete s.daily;normalizeFarm(s,t);
  const eligible=ORDER_POOL.filter(o=>availableDaily(s,o)&&Object.keys(o.input).some(k=>k!=='honey'&&PRODUCTS[k]));
  const min=Math.max(1,Math.max(...eligible.map(o=>o.minLevel))-3);
  const [quick,village]=dailyOrders(s,t);assert.equal(quick.minLevel,1);if(Math.floor(t/DAY_MS)%3!==0)assert.ok(village.minLevel>=min);assert.ok(availableDaily(s,village));
  const board=structuredClone(s.daily.orderBoard);s.xp+=100;assert.equal(dailyOrders(s,t+1000).length,board.length);
  assert.deepEqual(s.daily.orderBoard,board);
 }
});
test('all six chapter rewards are paid once, not doubled by XP boosts, then commissions continue',()=>{
 const s=farm();let time=now,chapterDiamonds=0;
 for(let id=0;id<8;id++){
  const p=currentProject(s),before=s.diamonds;Object.assign(s.inventory,p.input);
  act(s,{type:'project_start'},time);assert.throws(()=>act(s,{type:'project_collect'},time),/still/);assert.equal(s.diamonds,before);
  time+=p.duration;s.boosts.xpUntil=time+1000;
  const r=act(s,{type:'project_collect'},time),expected=CHAPTER_DIAMONDS[id]??0;
  assert.equal(r.diamonds,expected);assert.equal(r.xp,p.xp*2);
  assert.equal(s.diamonds-before,expected+(r.levelReward?.diamonds??0));chapterDiamonds+=expected;
  const snapshot=structuredClone(s);assert.throws(()=>act(s,{type:'project_collect'},time),/Start/);assert.deepEqual(s,snapshot);
 }
 assert.equal(chapterDiamonds,290);assert.equal(s.stats.chapter_diamonds,290);assert.equal(s.estate.diamondChapters.length,PROJECTS.length);
 assert.equal(currentProject(s).name,'Estate commission 3');assert.deepEqual(grantChapterRewards(s),{chapters:[],diamonds:0});
});
test('completed chapters on old saves receive a one-time catch-up without touching other progress',()=>{
 for(const completed of [0,1,3,6,9]){
  const s=farm();s.estate.completed=completed;delete s.estate.diamondChapters;normalizeFarm(s,now);
  const before=structuredClone(s),expected=CHAPTER_DIAMONDS.slice(0,completed).reduce((a,b)=>a+b,0);
  const result=grantChapterRewards(s);assert.equal(result.diamonds,expected);assert.equal(s.diamonds,before.diamonds+expected);
  for(const key of ['coins','xp','inventory','buildings','plots','levelRewards'])assert.deepEqual(s[key],before[key]);
  const reloaded=normalizeFarm(JSON.parse(JSON.stringify(s)),now+1000);assert.equal(grantChapterRewards(reloaded).diamonds,0);assert.equal(reloaded.diamonds,s.diamonds);
 }
});
