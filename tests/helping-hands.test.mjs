import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,featureUnlocked,featureUnlockHint,itemAvailable,availableDaily,beginnerProgress,FEATURE_LEVELS,ACTIVE_STATIONS,QUESTS,xpForLevel} from '../game/farm-state.js';
const now=Date.UTC(2026,8,22,12);
const at=level=>{const s=createFarm(now);s.xp=xpForLevel(level);return s;};
const quest=title=>QUESTS.find(q=>q.title===title);

test('A helping hand opens at level 4 with all four stops at once',()=>{
 assert.equal(FEATURE_LEVELS.activities,4);assert.equal(featureUnlockHint('activities'),'Reach level 4 to unlock A helping hand.');
 const before=at(3);assert.equal(featureUnlocked(before,'activities'),false);
 for(const station of Object.keys(ACTIVE_STATIONS))assert.throws(()=>act(before,{type:'activity_start',station},now),/Reach level 4/,station);
 const s=at(4);assert.equal(featureUnlocked(s,'activities'),true);
 for(const station of Object.keys(ACTIVE_STATIONS)){act(s,{type:'activity_start',station},now);assert.ok(s.activities.jobs[station],station);}
 // What the stops give is then available too, and the quests about them show up.
 assert.equal(itemAvailable(before,'honey'),false);assert.equal(itemAvailable(s,'honey'),true);
 assert.equal(availableDaily(before,quest('A taste of honey')),false);assert.equal(availableDaily(s,quest('A taste of honey')),true);
 assert.match(beginnerProgress(createFarm(now)).find(q=>q.id==='sell_egg').description,/Hands-on jobs open at level 4\./);
});

test('farm chores open at level 10 for a new farm, but a farm that already had them keeps them',()=>{
 assert.equal(FEATURE_LEVELS.chores,10);assert.equal(createFarm(now).progression.version,3);
 const s=at(9);assert.equal(featureUnlocked(s,'chores'),false);
 assert.throws(()=>act(s,{type:'chore',id:'weeds'},now,()=>0),/Reach level 10 to unlock Farm chores/);
 assert.equal(availableDaily(s,quest('Chore time')),false);
 const ten=at(10);assert.equal(featureUnlocked(ten,'chores'),true);assert.equal(availableDaily(ten,quest('Chore time')),true);
 assert.ok(act(ten,{type:'chore',id:'weeds'},now,()=>0));
 // A guided farm from before the change (progression version 2) that had reached level 4 keeps chores, once and for good.
 for(const level of [4,6,9]){
  const old=at(level);old.progression={mode:'guided',version:2};normalizeFarm(old,now);
  assert.equal(featureUnlocked(old,'chores'),true,`level ${level}`);assert.equal(old.progression.version,3);assert.deepEqual(old.progression.kept.features,['chores']);
  const again=structuredClone(old);normalizeFarm(again,now);assert.deepEqual(again,old,'migrating twice changes nothing');
 }
 const low=at(3);low.progression={mode:'guided',version:2};normalizeFarm(low,now);
 assert.equal(featureUnlocked(low,'chores'),false,'below level 4 it waits for level 10');assert.equal(low.progression.version,3);
 low.xp=xpForLevel(10);assert.equal(featureUnlocked(low,'chores'),true);
 // Farms that were kept other features before keep those too.
 const mixed=at(6);mixed.progression={mode:'guided',version:2,kept:{features:['mastery'],crops:['corn']}};normalizeFarm(mixed,now);
 assert.deepEqual(mixed.progression.kept.features.sort(),['chores','mastery']);assert.deepEqual(mixed.progression.kept.crops,['corn']);
});
