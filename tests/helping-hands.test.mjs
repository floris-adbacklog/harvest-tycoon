import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,featureUnlocked,featureUnlockHint,itemAvailable,availableDaily,beginnerProgress,FEATURE_LEVELS,ACTIVE_STATIONS,QUESTS,xpForLevel} from '../game/farm-state.js';
const now=Date.UTC(2026,8,22,12);
const at=level=>{const s=createFarm(now);s.xp=xpForLevel(level);return s;};
const quest=title=>QUESTS.find(q=>q.title===title);
const beforeThisChange=(level,version=2,kept)=>{const s=at(level);s.progression={mode:'guided',version,...(kept?{kept}:{})};normalizeFarm(s,now);return s;};

test('A helping hand opens at level 8, with all four stops at once',()=>{
 assert.equal(FEATURE_LEVELS.activities,8);assert.equal(featureUnlockHint('activities'),'Reach level 8 to unlock A helping hand.');
 const before=at(7);assert.equal(featureUnlocked(before,'activities'),false);
 for(const station of Object.keys(ACTIVE_STATIONS))assert.throws(()=>act(before,{type:'activity_start',station},now),/Reach level 8/,station);
 const s=at(8);assert.equal(featureUnlocked(s,'activities'),true);
 for(const station of Object.keys(ACTIVE_STATIONS)){act(s,{type:'activity_start',station},now);assert.ok(s.activities.jobs[station],station);}
 // What the stops give is then available too, and the quests about them show up.
 assert.equal(itemAvailable(before,'honey'),false);assert.equal(itemAvailable(s,'honey'),true);
 assert.equal(availableDaily(before,quest('A taste of honey')),false);assert.equal(availableDaily(s,quest('A taste of honey')),true);
 assert.match(beginnerProgress(createFarm(now)).find(q=>q.id==='sell_egg').description,/Hands-on jobs open at level 8\./);
});

// 9 Oct 2026: chores open at level 15 (they were 10), still in time for events, which open at 15 and can ask for chores.
test('farm chores open at level 15 for a new farm',()=>{
 assert.equal(FEATURE_LEVELS.chores,15);assert.equal(createFarm(now).progression.version,6);
 const s=at(14);assert.equal(featureUnlocked(s,'chores'),false);
 assert.throws(()=>act(s,{type:'chore',id:'weeds'},now,()=>0),/Reach level 15 to unlock Farm chores/);
 assert.equal(availableDaily(s,quest('Chore time')),false);
 const ten=at(15);assert.equal(featureUnlocked(ten,'chores'),true);assert.equal(availableDaily(ten,quest('Chore time')),true);
 assert.ok(act(ten,{type:'chore',id:'weeds'},now,()=>0));
});

test('a farm from before keeps what it already had: chores from level 4, hands-on jobs from level 6',()=>{
 for(const [level,chores,jobs] of [[3,false,false],[4,true,false],[5,true,false],[6,true,true],[7,true,true],[9,true,true]]){
  for(const version of [2,3]){
   const old=beforeThisChange(level,version);
   assert.equal(featureUnlocked(old,'chores'),chores,`level ${level} v${version} chores`);assert.equal(featureUnlocked(old,'activities'),jobs,`level ${level} v${version} jobs`);
   assert.equal(old.progression.version,6,'and then the later spreads of unlocks (versions 5 and 6)');
   const again=structuredClone(old);normalizeFarm(again,now);assert.deepEqual(again,old,'migrating twice changes nothing');
  }
 }
 // What waits keeps waiting for the new level; a farm that did a job or a chore has already used the feature and keeps it.
 const low=beforeThisChange(3);low.xp=xpForLevel(8);assert.equal(featureUnlocked(low,'activities'),true);assert.equal(featureUnlocked(low,'chores'),false);low.xp=xpForLevel(15);assert.equal(featureUnlocked(low,'chores'),true);
 const used=at(5);used.progression={mode:'guided',version:3};used.stats.activities=2;normalizeFarm(used,now);assert.equal(featureUnlocked(used,'activities'),true);
 // Other rights a farm was given are kept next to them, and a farm that is already at version 4 is left alone.
 const mixed=beforeThisChange(6,2,{features:['mastery'],crops:['corn']});
 assert.deepEqual(mixed.progression.kept.features.sort(),['activities','cart','chores','mastery'],'Delivery orders too: the farm was past level 5, where they opened before 9 Oct 2026');assert.deepEqual(mixed.progression.kept.crops,['corn']);
 const fresh=at(6);normalizeFarm(fresh,now);assert.equal(featureUnlocked(fresh,'chores'),false);assert.equal(featureUnlocked(fresh,'activities'),false);assert.equal(fresh.progression.kept,undefined);
});
