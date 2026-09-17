import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,applyFarmAction,dailyTasks,utcDay,DAY_MS,BOOSTS,DAILY_DIAMONDS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
test('daily challenges pay 1, 1 and 2 diamonds once, separately from login gifts',()=>{
 const s=createFarm(now);const tasks=dailyTasks(s,now);assert.deepEqual(tasks.map(q=>q.diamonds),[1,1,2]);
 for(const q of tasks){
  assert.throws(()=>applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now),/Finish/);
  s.stats[q.stat]=(s.daily.baseline[q.stat]??0)+q.target;
  const before=s.diamonds;const r=applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now);
  assert.equal(r.diamonds,q.diamonds);assert.equal(s.diamonds,before+q.diamonds);
  assert.throws(()=>applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now),/already claimed/);
  assert.equal(s.diamonds,before+q.diamonds);
 }
 assert.equal(s.diamonds,4);assert.equal(s.stats.challenge_diamonds,4);assert.equal(s.stats.diamonds_earned,0);
 assert.throws(()=>applyFarmAction(s,{type:'daily',id:0,day:utcDay(now)},now+DAY_MS),/new day/);
 assert.equal(s.diamonds,4);
});
test('old or manipulated boost quotes never charge a different price',()=>{
 const s=createFarm(now);s.diamonds=1000;
 for(const expectedCost of [undefined,8,0,89,'90']){
  const before=structuredClone(s);
  assert.throws(()=>applyFarmAction(s,{type:'buy_boost',boost:'crops',expectedCost},now),/prices have changed/);
  assert.deepEqual(s,before);
 }
 const r=applyFarmAction(s,{type:'buy_boost',boost:'crops',expectedCost:90},now);
 assert.equal(r.cost,90);assert.equal(s.diamonds,910);
});
test('free beginner diamonds still buy an entry boost; premium boost prices preserve their value',()=>{
 const s=createFarm(now);s.diamonds=20;
 applyFarmAction(s,{type:'buy_boost',boost:'xp',expectedCost:20},now);assert.equal(s.diamonds,0);
 assert.equal(DAILY_DIAMONDS.reduce((a,b)=>a+b,0)+7*4,68);
 assert.equal(Math.floor(1000/BOOSTS.crops.cost),11);
 const before=structuredClone(s);assert.throws(()=>applyFarmAction(s,{type:'buy_boost',boost:'coins',expectedCost:60},now),/diamonds/);assert.deepEqual(s,before);
});
