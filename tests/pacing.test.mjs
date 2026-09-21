import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,beginnerProgress,BEGINNER_QUESTS,BEGINNER_STEP_XP,BEGINNER_REWARD,levelOf,levelProgress,xpForLevel,XP_CURVE,CROPS,CROP_LEVELS,BUILDING_LEVELS,RECIPE_LEVELS,FEATURE_LEVELS,DELIVERY_LEVELS,FAMILY_MIN_LEVEL} from '../game/farm-state.js';
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
 act(s,{type:'field',id:8,action:'tend'},now+10000);act(s,{type:'field',id:8,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 for(const q of beginnerProgress(s))if(!q.done)claim(q.id,now+300000);
 assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds>=BEGINNER_REWARD,true);
 assert(s.xp>=BEGINNER_STEP_XP*BEGINNER_QUESTS.length);assert(levelOf(s)>=3,`level ${levelOf(s)} after the guide`);
});
test('levels 1 to 10 need far less XP, the first harvest reaches level 2, and levels 10 and up keep their old distances',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12,20].map(xpForLevel),[0,15,45,85,145,225,330,465,635,850,1270,1730,6850]);
 assert.equal(XP_CURVE,2);
 for(let level=10;level<=80;level++)assert.equal(xpForLevel(level+1)-xpForLevel(level),60+40*(level-1),`the step from level ${level} is unchanged`);
 for(let level=1;level<10;level++)assert(xpForLevel(level+1)-xpForLevel(level)<xpForLevel(level+2)-xpForLevel(level+1),`steps grow: ${level}`);
 for(const level of [1,2,5,9,10,12,25]){const s={xp:xpForLevel(level),xpOffset:0,xpCurve:XP_CURVE};assert.equal(levelOf(s),level);assert.equal(levelOf({...s,xp:xpForLevel(level+1)-1}),level);}
 const s=createFarm(now);act(s,{type:'field',id:0,action:'harvest'},now);act(s,{type:'beginner_claim',id:'harvest'},now);
 assert.equal(levelOf(s),2,'a first harvest and its guide step are enough for level 2');
 assert.deepEqual(levelProgress(s),{level:2,current:s.xp-15,target:30});
});
test('farms saved with the old curve keep their level and share of progress, whatever their XP',()=>{
 const old=xp=>({...createFarm(now),xp,xpOffset:0,xpCurve:undefined});
 for(let xp=0;xp<=6000;xp++){
  const s=old(xp);delete s.xpCurve;const level=levelOf(s),progress=levelProgress(s);
  normalizeFarm(s,now);assert.equal(s.xpCurve,XP_CURVE);assert.equal(levelOf(s),level,`xp ${xp}`);
  assert.equal(levelProgress(s).level,progress.level);
  const again=structuredClone(s);normalizeFarm(again,now);assert.equal(again.xp,s.xp,`xp ${xp} migrates once`);
 }
 // A client on the new curve reading a farm the server has not migrated yet still shows the right level (deploy order is free).
 for(const xp of [0,59,60,1979,1980,2400,50000])assert.equal(levelOf({xp,xpOffset:0}),levelOf({xp,xpOffset:0,xpCurve:1}));
 const shifted=createFarm(now);delete shifted.xpCurve;shifted.xp=100;shifted.xpOffset=500;const level=levelOf(shifted);normalizeFarm(shifted,now);
 assert.equal(levelOf(shifted),level);assert.equal(shifted.xpOffset,0);
 // The share of the way to the next level survives too, within a point.
 const half=createFarm(now);delete half.xpCurve;half.xp=xpForLevelOld(6)+Math.round((xpForLevelOld(7)-xpForLevelOld(6))/2);half.xpOffset=0;normalizeFarm(half,now);
 const {current,target}=levelProgress(half);assert(Math.abs(current/target-.5)<.05,`${current}/${target}`);
});
const xpForLevelOld=level=>60*(level-1)+20*(level-1)*(level-2);
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
