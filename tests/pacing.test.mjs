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
 // Steps finish themselves with the action that does them; only the last one is collected by hand.
 assert.equal(act(s,{type:'field',id:0,action:'harvest'},now).guide[0].xp,BEGINNER_STEP_XP);
 const beforeSale=s.xp,sale=act(s,{type:'sell',item:'corn',quantity:1},now);assert.equal(s.xp,beforeSale+(sale.xp??0)+BEGINNER_STEP_XP);
 act(s,{type:'field',id:6,action:'plant',crop:'wheat'},now);act(s,{type:'field',id:6,action:'water'},now);
 assert(levelOf(s)>=2,'level 2 arrives after about four steps, in the first minutes');
 act(s,{type:'produce',recipe:'eggs'},now);act(s,{type:'checkin'},now);
 act(s,{type:'field',id:6,action:'tend'},now+10000);act(s,{type:'field',id:6,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 assert.equal(s.onboarding.completed,BEGINNER_QUESTS.length-1,'nine steps done without a single claim');
 act(s,{type:'beginner_claim',id:'collect'},now+300000);
 assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds>=BEGINNER_REWARD,true);
 assert(s.xp>=BEGINNER_STEP_XP*BEGINNER_QUESTS.length);assert(levelOf(s)>=3,`level ${levelOf(s)} after the guide`);
});
test('levels 1 to 10 need less XP than the original curve, the first harvest reaches level 2, and levels 10 to 50 keep their old distances',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12,20].map(xpForLevel),[0,15,55,120,215,345,515,730,995,1315,1735,2195,7315]);
 assert.equal(XP_CURVE,4);assert(xpForLevel(10)<xpForLevelOld(10)&&xpForLevel(10)>850,'between the flying curve of a day (850) and the original (1,980)');
 for(let level=10;level<=50;level++)assert.equal(xpForLevel(level+1)-xpForLevel(level),60+40*(level-1),`the step from level ${level} is unchanged`);
 for(let level=1;level<10;level++)assert(xpForLevel(level+1)-xpForLevel(level)<xpForLevel(level+2)-xpForLevel(level+1),`steps grow: ${level}`);
 for(const level of [1,2,5,9,10,12,25]){const s={xp:xpForLevel(level),xpOffset:0,xpCurve:XP_CURVE};assert.equal(levelOf(s),level);assert.equal(levelOf({...s,xp:xpForLevel(level+1)-1}),level);}
 const s=createFarm(now);act(s,{type:'field',id:0,action:'harvest'},now);
 assert.equal(levelOf(s),2,'a first harvest and its guide step are enough for level 2');
 assert.deepEqual(levelProgress(s),{level:2,current:s.xp-15,target:40});
});
test('farms saved with an earlier curve keep their level and share of progress, whatever their XP',()=>{
 for(const from of [undefined,1,2])for(let xp=0;xp<=6000;xp++){
  const s={...createFarm(now),xp,xpOffset:0,xpCurve:from};if(from===undefined)delete s.xpCurve;const level=levelOf(s),progress=levelProgress(s);
  normalizeFarm(s,now);assert.equal(s.xpCurve,XP_CURVE);assert.equal(levelOf(s),level,`curve ${from} xp ${xp}`);
  assert.equal(levelProgress(s).level,progress.level);
  const again=structuredClone(s);normalizeFarm(again,now);assert.equal(again.xp,s.xp,`xp ${xp} migrates once`);
 }
 // Rubbish in the curve field counts as the original curve.
 for(const bad of ['x',null,0,99,-1]){const s={...createFarm(now),xp:500,xpOffset:0,xpCurve:bad};const level=levelOf(s);assert.equal(level,levelOf({xp:500,xpOffset:0}),String(bad));normalizeFarm(s,now);assert.equal(levelOf(s),level);}
 // A client on the new curve reading a farm the server has not migrated yet still shows the right level (new client first, then the server: an old client cannot read a migrated farm).
 for(const xp of [0,59,60,1979,1980,2400,50000])assert.equal(levelOf({xp,xpOffset:0}),levelOf({xp,xpOffset:0,xpCurve:1}));
 assert.deepEqual([14,15,54,55,849,850,1314,1315].map(xp=>levelOf({xp,xpOffset:0,xpCurve:2})),[1,2,3,3,9,10,11,11],'a farm still on curve 2 is read with curve 2');
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
test('hands-on jobs come at level 8, chores wait until level 10, and no level unlocks more than four things',()=>{
 assert.equal(FEATURE_LEVELS.activities,8);assert.equal(FEATURE_LEVELS.chores,10);assert.equal(FEATURE_LEVELS.mastery,7);
 const perLevel={};const add=(level,what)=>{(perLevel[level]??=[]).push(what);};
 for(const [k,l] of Object.entries(CROP_LEVELS))if(l>1)add(l,'crop:'+k);
 for(const [k,l] of Object.entries(BUILDING_LEVELS))if(l>1)add(l,'building:'+k);
 for(const [k,l] of Object.entries(RECIPE_LEVELS))if(l>1)add(l,'recipe:'+k);
 for(const [k,l] of Object.entries(FEATURE_LEVELS))if(k!=='activities'&&k!=='family')add(l,'feature:'+k);
 for(const [k,l] of Object.entries(DELIVERY_LEVELS))add(l,'orders:'+k);
 for(let level=2;level<=12;level++){const things=perLevel[level]??[];assert(things.length>=2,`level ${level} has only ${things.join(', ')||'nothing'}`);assert(things.length<=4,`level ${level}: ${things.join(', ')}`);}
 assert.equal(FAMILY_MIN_LEVEL,10);
});
// Farm chores (4 -> 10) and A helping hand (6 -> 8) were moved later on purpose; a farm that already had them keeps them (tests/helping-hands.test.mjs).
test('nothing else unlocks later than before, so every existing player keeps what they already use',()=>{
 const before={mastery:9};
 for(const [key,level] of Object.entries(before))assert(FEATURE_LEVELS[key]<=level,key);
});

// 26 Sep 2026: from level 50 every step asks 4% more per level above 50, from level 100 6% more per level (curve 4).
test('from level 50 each level asks 4% more per level above 50, from 100 6% more; nobody loses a level or progress',()=>{
 const step=level=>xpForLevel(level+1)-xpForLevel(level),old=level=>60+40*(level-1);
 assert.equal(step(50),old(50),'50 -> 51 as before');
 assert.equal(step(60),Math.round(old(60)*1.4));assert.equal(step(90),Math.round(old(90)*2.6));assert.equal(step(100),Math.round(old(100)*3));assert.equal(step(110),Math.round(old(110)*3.6));
 for(let level=50;level<200;level++)assert(step(level+1)>step(level),`steps keep growing: ${level}`);
 for(let level=2;level<=250;level++){assert.equal(levelOf({xp:xpForLevel(level),xpOffset:0,xpCurve:4}),level);assert.equal(levelOf({xp:xpForLevel(level)-1,xpOffset:0,xpCurve:4}),level-1);}
 // A curve-3 farm: the same level and the same share of the way to the next one; below level 50 the XP does not change at all.
 const curve3=level=>{const n=level-1;return 60*n+20*n*(n-1)-665;};
 for(const [level,share] of [[20,.3],[49,.99],[50,0],[50,.5],[65,.4],[69,.4],[70,.95],[99,.1],[120,.7]]){
  const xp=Math.round(curve3(level)+share*(curve3(level+1)-curve3(level))),s={...createFarm(now),xp,xpOffset:0,xpCurve:3},before=levelProgress(s);
  normalizeFarm(s,now);const after=levelProgress(s);
  assert.equal(after.level,level);assert.equal(before.level,level);assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.001,`level ${level}: same share`);
  if(level<50)assert.equal(s.xp,xp,`level ${level}: untouched`);
 }
});
