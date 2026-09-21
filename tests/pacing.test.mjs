import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,applyFarmAction as act,beginnerProgress,BEGINNER_QUESTS,BEGINNER_STEP_XP,BEGINNER_REWARD,levelOf,xpForLevel,CROPS,CROP_LEVELS,BUILDING_LEVELS,RECIPE_LEVELS,FEATURE_LEVELS,DELIVERY_LEVELS,FAMILY_MIN_LEVEL} from '../game/farm-state.js';
const now=Date.UTC(2026,8,21,12);

test('the guide starts with the money loop: harvest, sell, plant',()=>{
 assert.deepEqual(BEGINNER_QUESTS.slice(0,4).map(q=>q.id),['harvest','sell','plant','water']);
 assert.equal(BEGINNER_QUESTS.length,10);
});
test('every guide step pays XP, so following the guide takes a new farmer to level 3',()=>{
 const s=createFarm(now);assert.equal(levelOf(s),1);
 const claim=(id,time=now)=>act(s,{type:'beginner_claim',id},time);
 act(s,{type:'field',id:0,action:'harvest'},now);assert.equal(claim('harvest').xp,BEGINNER_STEP_XP);
 act(s,{type:'sell',item:'corn',quantity:1},now);const afterSale=s.xp;claim('sell');assert.equal(s.xp,afterSale+BEGINNER_STEP_XP);
 act(s,{type:'field',id:8,action:'plant',crop:'wheat'},now);claim('plant');act(s,{type:'field',id:8,action:'water'},now);claim('water');
 assert(levelOf(s)>=2,'level 2 arrives after about four steps, in the first minutes');
 act(s,{type:'produce',recipe:'eggs'},now);claim('produce');act(s,{type:'checkin'},now);claim('gift');
 act(s,{type:'field',id:8,action:'tend'},now+40000);act(s,{type:'field',id:8,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 for(const q of beginnerProgress(s))if(!q.done)claim(q.id,now+300000);
 assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds>=BEGINNER_REWARD,true);
 assert(s.xp>=BEGINNER_STEP_XP*BEGINNER_QUESTS.length);assert(levelOf(s)>=3,`level ${levelOf(s)} after the guide`);
});
test('the level curve is unchanged: nobody gains or loses a level from this update',()=>{
 assert.deepEqual([1,2,3,4,5,9,10,20].map(xpForLevel),[0,60,160,300,480,1600,1980,7980]);
 for(const level of [1,2,5,9,12,25]){const s={xp:xpForLevel(level),xpOffset:0};assert.equal(levelOf(s),level);assert.equal(levelOf({xp:xpForLevel(level+1)-1,xpOffset:0}),level);}
});
test('slow crops pay more XP so hours of waiting still feel like progress; quick crops are unchanged',()=>{
 assert.deepEqual([CROPS.wheat.xp,CROPS.lettuce.xp,CROPS.corn.xp],[2,3,5]);
 assert.deepEqual([CROPS.barley.xp,CROPS.greenbeans.xp,CROPS.cabbage.xp,CROPS.cauliflower.xp,CROPS.pumpkin.xp,CROPS.redcabbage.xp,CROPS.sunflower.xp],[12,21,18,27,36,48,68]);
 // XP per hour of growing, for the crops that take 45 minutes or longer, no longer collapses.
 const perHour=key=>CROPS[key].xp/(CROPS[key].duration/3600000);
 for(const key of ['barley','greenbeans','cabbage','cauliflower','pumpkin','redcabbage','sunflower'])assert(perHour(key)>=2.5,`${key} ${perHour(key).toFixed(1)}/h`);
 assert(CROPS.apples.xp>22&&CROPS.berries.xp>18);
});
test('chores and crop mastery arrive in the thin levels, and no level unlocks more than four things',()=>{
 assert.equal(FEATURE_LEVELS.chores,4);assert.equal(FEATURE_LEVELS.mastery,7);
 const perLevel={};const add=(level,what)=>{(perLevel[level]??=[]).push(what);};
 for(const [k,l] of Object.entries(CROP_LEVELS))if(l>1)add(l,'crop:'+k);
 for(const [k,l] of Object.entries(BUILDING_LEVELS))if(l>1)add(l,'building:'+k);
 for(const [k,l] of Object.entries(RECIPE_LEVELS))if(l>1)add(l,'recipe:'+k);
 for(const [k,l] of Object.entries(FEATURE_LEVELS))if(k!=='activities'&&k!=='family')add(l,'feature:'+k);
 for(const [k,l] of Object.entries(DELIVERY_LEVELS))add(l,'orders:'+k);
 for(let level=2;level<=12;level++){const things=perLevel[level]??[];assert(things.length>=2,`level ${level} has only ${things.join(', ')||'nothing'}`);assert(things.length<=4,`level ${level}: ${things.join(', ')}`);}
 assert.equal(FAMILY_MIN_LEVEL,10);
});
test('nothing unlocks later than before, so every existing player keeps what they already use',()=>{
 const before={chores:7,mastery:9};
 for(const [key,level] of Object.entries(before))assert(FEATURE_LEVELS[key]<=level,key);
});
