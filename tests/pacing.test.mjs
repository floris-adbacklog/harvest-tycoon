import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,beginnerProgress,BEGINNER_QUESTS,BEGINNER_STEP_XP,BEGINNER_REWARD,levelOf,levelProgress,xpForLevel,XP_CURVE,convertXpCurve,CROPS,CROP_LEVELS,BUILDING_LEVELS,RECIPE_LEVELS,FEATURE_LEVELS,DELIVERY_LEVELS,FAMILY_MIN_LEVEL} from '../game/farm-state.js';
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
test('levels 1 to 10 need less XP than the original curve, the first harvest reaches level 2, and levels 30 to 50 keep their old distances',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12,20,30].map(xpForLevel),[0,15,55,120,215,345,515,730,995,1315,1645,2000,5860,14840]);
 assert.equal(XP_CURVE,6,'curve 6 is on: every copy learned to read it first (step 1), then farms switched (step 2)');assert(xpForLevel(10)<xpForLevelOld(10)&&xpForLevel(10)>850,'between the flying curve of a day (850) and the original (1,980)');
 for(let level=30;level<=50;level++)assert.equal(xpForLevel(level+1)-xpForLevel(level),60+40*(level-1),`the step from level ${level} is unchanged`);
 for(let level=1;level<60;level++)assert(xpForLevel(level+1)-xpForLevel(level)<xpForLevel(level+2)-xpForLevel(level+1),`steps grow: ${level}`);
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

// 27 Sep 2026 (curve 5): levels 10 to 30 cheaper. 10 -> 20 felt four and a half times as long as 1 -> 10, right as the beginner boost ran out.
test('levels 10 to 20 ask a quarter less XP, the steps grow smoothly on from level 9 and back to the old ones by level 30',()=>{
 const step=level=>xpForLevel(level+1)-xpForLevel(level),old=level=>60+40*(level-1);
 assert.deepEqual([9,10,11,12,13,14,15,16,17,18,19].map(step),[320,330,355,380,405,435,465,495,525,560,595]);
 assert.equal(xpForLevel(20)-xpForLevel(10),4545,'was 6,000');
 assert.equal(xpForLevel(30)-xpForLevel(20),8980,'was 10,000');
 for(let level=10;level<30;level++){assert(step(level)<old(level),`level ${level} is cheaper`);assert(step(level)/step(level-1)<1.1,`no jump at ${level}`);}
 assert.equal(step(30),old(30),'from level 30 as before');
 for(const level of [1,9,10])assert.equal(xpForLevel(level),[0,995,1315][[1,9,10].indexOf(level)],'levels 1 to 10 unchanged');
 // A curve-4 farm keeps its level and its share of the way to the next one.
 const curve4=level=>{const n=level-1;return 60*n+20*n*(n-1)-665;};
 for(const [level,share] of [[9,.5],[10,0],[10,.5],[14,.2],[16,.4],[19,.99],[20,0],[25,.3],[29,.7],[30,.2],[49,.5]]){
  const xp=Math.round(curve4(level)+share*(curve4(level+1)-curve4(level))),s={...createFarm(now),xp,xpOffset:0,xpCurve:4},before=levelProgress(s);
  normalizeFarm(s,now);const after=levelProgress(s);
  assert.equal(before.level,level);assert.equal(after.level,level);assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.005,`level ${level}: same share`);
  if(level<10)assert.equal(s.xp,xp,`level ${level}: untouched`);
  if(level>=30)assert.equal(s.xp,xp-2475,`level ${level}: the same XP into the level`);
 }
});
// Curve 5's and curve 6's totals, whichever is switched on (curve 6 is curve 5 with every step from level 90 exactly doubled).
const xp5=level=>XP_CURVE===5||level<=90?xpForLevel(level):xpForLevel(90)+(xpForLevel(level)-xpForLevel(90))/2;
const xp6=level=>XP_CURVE===6||level<=90?xpForLevel(level):xpForLevel(90)+2*(xpForLevel(level)-xpForLevel(90));
// 26 Sep 2026: from level 50 every step asks 4% more per level above 50, from level 100 6% more per level (curve 4); 4 Oct 2026: twice
// that from level 90 (curve 6).
test('from level 50 each level asks 4% more per level above 50, from 100 6% more (curve 5); nobody loses a level or progress',()=>{
 const step=level=>xp5(level+1)-xp5(level),old=level=>60+40*(level-1);
 assert.equal(step(50),old(50),'50 -> 51 as before');
 assert.equal(step(60),Math.round(old(60)*1.4));assert.equal(step(89),Math.round(old(89)*2.56),'89 -> 90 as on curve 5');
 assert.equal(step(90),Math.round(old(90)*2.6));assert.equal(step(100),Math.round(old(100)*3));assert.equal(step(110),Math.round(old(110)*3.6));
 for(let level=50;level<200;level++)assert(step(level+1)>step(level),`steps keep growing: ${level}`);
 for(let level=2;level<=250;level++){assert.equal(levelOf({xp:xpForLevel(level),xpOffset:0,xpCurve:XP_CURVE}),level);assert.equal(levelOf({xp:xpForLevel(level)-1,xpOffset:0,xpCurve:XP_CURVE}),level-1);}
 // A curve-3 farm: the same level and the same share of the way to the next one; below level 50 the XP does not change at all.
 const curve3=level=>{const n=level-1;return 60*n+20*n*(n-1)-665;};
 for(const [level,share] of [[20,.3],[49,.99],[50,0],[50,.5],[65,.4],[69,.4],[70,.95],[99,.1],[120,.7]]){
  const xp=Math.round(curve3(level)+share*(curve3(level+1)-curve3(level))),s={...createFarm(now),xp,xpOffset:0,xpCurve:3},before=levelProgress(s);
  normalizeFarm(s,now);const after=levelProgress(s);
  assert.equal(after.level,level);assert.equal(before.level,level);assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.001,`level ${level}: same share`);
  if(level<10)assert.equal(s.xp,xp,`level ${level}: untouched`);
 }
 // A farm past 50 on curve 4 keeps its level and share on curve 5 as well.
 for(const [level,share] of [[50,.5],[65,.4],[120,.7]]){
  const s={...createFarm(now),xp:0,xpOffset:0,xpCurve:4};s.xp=Math.round(xp5(level)+2475+share*(xp5(level+1)-xp5(level)));const before=levelProgress(s);
  normalizeFarm(s,now);const after=levelProgress(s);
  assert.equal(before.level,level);assert.equal(after.level,level);assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.001);
 }
});
// 4 Oct 2026 (curve 6): every step from level 90 on asks twice as much. A curve-5 farm keeps its level and its share of the way to the
// next one; below level 90 its XP does not change at all.
test('curve 6: from level 90 every level asks twice the XP; farms convert both ways keeping level and share, below 90 not even their XP',()=>{
 const step5=level=>xp5(level+1)-xp5(level),step6=level=>xp6(level+1)-xp6(level);
 for(let level=2;level<90;level++)assert.equal(step6(level),step5(level),`${level} -> ${level+1} as on curve 5`);
 for(let level=90;level<300;level++)assert.equal(step6(level),2*step5(level),`${level} -> ${level+1} twice curve 5`);
 assert.deepEqual([89,90,91,100,101].map(step6),[9165,18824,19324,24120,24848]);
 assert.equal(xp6(100)-xp6(90),211544,'90 -> 100: 211,544 XP instead of 105,772');
 // Every copy reads both curves, whichever is switched on (an unknown curve would read as curve 1).
 for(let level=2;level<=300;level++)for(const [curve,total] of [[5,xp5],[6,xp6]]){
  assert.equal(levelOf({xp:total(level),xpOffset:0,xpCurve:curve}),level,`curve ${curve} level ${level}`);
  assert.equal(levelOf({xp:total(level)-1,xpOffset:0,xpCurve:curve}),level-1,`curve ${curve} just below ${level}`);
 }
 for(const [level,share] of [[20,.3],[50,.5],[89,0],[89,.99],[90,0],[90,.5],[95,.3],[102,.619],[120,.7],[200,.1]]){
  const xp=Math.round(xp5(level)+share*step5(level)),s={...createFarm(now),xp,xpOffset:0,xpCurve:5},before=levelProgress(s);
  convertXpCurve(s,6);const after=levelProgress(s);
  assert.equal(s.xpCurve,6);assert.equal(before.level,level);assert.equal(after.level,level,`level ${level} kept`);
  assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.001,`level ${level}: same share`);
  if(level<90)assert.equal(s.xp,xp,`level ${level}: XP untouched`);
  const again=structuredClone(s);convertXpCurve(again,6);assert.equal(again.xp,s.xp,'converted once');
  // And back (a farm-api that is one release behind): the same level and share again.
  convertXpCurve(again,5);assert.equal(levelOf(again),level);assert.ok(Math.abs(levelProgress(again).current/levelProgress(again).target-before.current/before.target)<.001);
 }
 // The farmer at level 102 (4 Oct 2026): 392,898 XP on curve 5 becomes 531,068, still level 102, the next level twice as far.
 const top={...createFarm(now),xp:392898,xpOffset:0,xpCurve:5};convertXpCurve(top,6);
 assert.equal(top.xp,531068);assert.equal(levelOf(top),102);assert.equal(levelProgress(top).target,25584);
 // normalizeFarm converts to the curve that is switched on.
 const any={...createFarm(now),xp:392898,xpOffset:0,xpCurve:5};normalizeFarm(any,now);assert.equal(any.xpCurve,XP_CURVE);assert.equal(levelOf(any),102);
});
