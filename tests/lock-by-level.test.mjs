// Every feature opens at its level, on every farm (19 Oct 2026, the owner: what you have not reached the level for is locked, also under
// More). A farm that kept a feature when its level moved later, and an older (legacy) farm, follow the level too; nothing they had is lost.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {createFarm,featureUnlocked,FEATURE_LEVELS,xpForLevel,questFeatureOpen,QUESTS,dailyTasks,normalizeFarm,applyFarmAction as act,beginnerProgress} from '../game/farm-state.js';
const now=Date.UTC(2026,9,19,12);
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('a kept feature is locked below its level and opens exactly at it',()=>{
 for(const key of ['cart','mastery','chores','tractor','stall','silo','projects','boosts','activities','challenges']){
  const s=createFarm(now);s.progression.kept={features:[key]};
  s.xp=xpForLevel(FEATURE_LEVELS[key]-1);assert.equal(featureUnlocked(s,key),false,`${key} below its level`);
  s.xp=xpForLevel(FEATURE_LEVELS[key]);assert.equal(featureUnlocked(s,key),true,`${key} at its level`);
 }
});
test('an older (legacy) farm follows the levels too; the family and the places without a level are as before',()=>{
 const s=createLegacyFarm(now);
 for(const key of ['cart','mastery','chores','tractor','stall','silo','projects','boosts'])assert.equal(featureUnlocked(s,key),false,key);
 assert.equal(featureUnlocked(s,'farmroad'),true,'a place without a level stays open');
 const high=createLegacyFarm(now,{level:30});for(const key of ['cart','mastery','chores','tractor','stall','silo','projects','boosts'])assert.equal(featureUnlocked(high,key),true,key);
 assert.match(read('game/farm-state.js'),/return levelOf\(state\)>=\(FEATURE_LEVELS\[key\]\?\?1\);\}/);
 assert.doesNotMatch(read('game/farm-state.js'),/!guidedFarm\(state\)\|\|kept\(state,'features',key\)/);
});
test('quests and challenges for a locked feature wait on every farm',()=>{
 const legacy=createLegacyFarm(now),chore=QUESTS.find(q=>q.stat==='chores');
 assert.equal(questFeatureOpen(legacy,chore),false);
 assert.equal(questFeatureOpen(createLegacyFarm(now,{level:15}),chore),true);
});
test('an older farm gets its daily challenges the moment it reaches level 3, not at midnight',()=>{
 const s=createLegacyFarm(now);assert.deepEqual(dailyTasks(s,now),[]);
 s.xp=xpForLevel(3);normalizeFarm(s,now+60000);assert.equal(dailyTasks(s,now+60000).length,3);
});
test('an older farm in the middle of the guide has the guided steps and gets past step 9 with a helping-hand job',()=>{
 const s=createLegacyFarm(now,{level:5});
 assert.deepEqual(beginnerProgress(s,now).map(q=>q.id),beginnerProgress(createFarm(now),now).map(q=>q.id));
 s.onboarding={...s.onboarding,completed:8,milestones:{...(s.onboarding?.milestones??{})}};
 const start=act(s,{type:'activity_start',station:'greenhouse'},now);
 for(const target of s.activities.jobs.greenhouse.targets)act(s,{type:'activity_work',station:'greenhouse',target,startedAt:start.startedAt},now+1000);
 assert.equal(s.onboarding.milestones.hand,true);assert.equal(s.onboarding.completed,9);
});
