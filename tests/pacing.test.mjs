import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,beginnerProgress,BEGINNER_QUESTS,BEGINNER_STEP_XP,BEGINNER_REWARD,levelOf,levelProgress,xpForLevel,XP_CURVE,convertXpCurve,CROPS,CROP_LEVELS,BUILDING_LEVELS,RECIPE_LEVELS,FEATURE_LEVELS,DELIVERY_LEVELS,FAMILY_MIN_LEVEL,cropUnlocked,featureUnlocked,deliveryTierUnlocked,recipeLevel} from '../game/farm-state.js';
// The XP to reach a level on a given curve, through the game's own conversion (a farm at the very start of the level stays there).
const onCurve=(curve,level)=>{const s={xp:xpForLevel(level),xpOffset:0,xpCurve:XP_CURVE};convertXpCurve(s,curve);return s.xp;};
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
 act(s,{type:'field',id:6,action:'tend'},now+22000);act(s,{type:'field',id:6,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 assert.equal(s.onboarding.completed,BEGINNER_QUESTS.length-1,'nine steps done without a single claim');
 act(s,{type:'beginner_claim',id:'collect'},now+300000);
 assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds>=BEGINNER_REWARD,true);
 assert(s.xp>=BEGINNER_STEP_XP*BEGINNER_QUESTS.length);assert(levelOf(s)>=3,`level ${levelOf(s)} after the guide`);
});
test('levels 1 to 10 need less XP than the original curve, the first harvest reaches level 2, and levels 30 to 50 keep their old distances',()=>{
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12,20,30].map(level=>onCurve(6,level)),[0,15,55,120,215,345,515,730,995,1315,1645,2000,5860,14840],'curve 6 (curve 7 asks more from level 6, below)');
 assert.equal(XP_CURVE,7,'curve 7 is on (9 Oct 2026): every copy learned to read it first (step 1), then farms switched (step 2)');assert(xpForLevel(10)<xpForLevelOld(10)&&xpForLevel(10)>850,'between the flying curve of a day (850) and the original (1,980)');
 for(let level=30;level<=50;level++)assert.equal(onCurve(6,level+1)-onCurve(6,level),60+40*(level-1),`the step from level ${level} is unchanged on curve 6`);
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
// 9 Oct 2026 (the owner's call: new things open gradually, without a flood): the first half hour opened about one new thing a minute.
// What a level-up card can show, per level: crops, buildings, recipes and features (the order tiers come with Delivery orders).
const opensAt=()=>{const perLevel={};const add=(level,what)=>{(perLevel[level]??=[]).push(what);};
 for(const [k,l] of Object.entries(CROP_LEVELS))if(l>1)add(l,'crop:'+k);
 for(const [k,l] of Object.entries(BUILDING_LEVELS))if(l>1&&k!=='familyhall')add(l,'building:'+k);
 for(const [k,l] of Object.entries(RECIPE_LEVELS))if(l>1)add(l,'recipe:'+k);
 for(const [k,l] of Object.entries(FEATURE_LEVELS))add(l,'feature:'+k);
 return perLevel;};
test('every level up to 20 opens one to three new things, and levels 2 to 10 twenty in all (26 before 9 Oct 2026)',()=>{
 assert.equal(FEATURE_LEVELS.activities,8);assert.equal(FEATURE_LEVELS.chores,15);assert.equal(FEATURE_LEVELS.mastery,14);assert.equal(FEATURE_LEVELS.cart,7);
 const perLevel=opensAt();
 for(let level=2;level<=20;level++){const things=perLevel[level]??[];assert(things.length>=1,`level ${level} has nothing`);assert(things.length<=3,`level ${level}: ${things.join(', ')}`);}
 let first=0;for(let level=2;level<=10;level++)first+=(perLevel[level]??[]).length;assert.equal(first,20);
 assert.equal(FAMILY_MIN_LEVEL,10);
 // Every goal an event can ask for is open when events open (level 15): chores, fertilizer and green beans included.
 assert(FEATURE_LEVELS.chores<=15&&RECIPE_LEVELS.fertilizer<=15&&CROP_LEVELS.greenbeans<=15);
 // A crop comes with its first use: green beans with the vegetable stew, and the Packing shed with the fresh salad.
 assert.equal(CROP_LEVELS.greenbeans,RECIPE_LEVELS.stew);assert.equal(RECIPE_LEVELS.salad,BUILDING_LEVELS.packing);
});
// Farm chores (4 -> 10 -> 15), A helping hand (6 -> 8) and seven more unlocks (9 Oct 2026) were moved later on purpose; a farm that
// already had one keeps it (tests/helping-hands.test.mjs and below).
test('what moved later on 9 Oct 2026 stays open for every farm that was already past its old level, or had used it',()=>{
 const moved=[['crops','greenbeans',7,12],['features','cart',5,7],['features','mastery',7,14],['features','chores',10,15],['orderTiers','quick',5,7],['recipes','salad',10,11],['recipes','vegetables',11,13],['recipes','fertilizer',9,14],['recipes','windfeed',7,18]];
 const levels={crops:CROP_LEVELS,features:FEATURE_LEVELS,orderTiers:DELIVERY_LEVELS,recipes:RECIPE_LEVELS};
 const open=(s,kind,key)=>kind==='crops'?cropUnlocked(s,key):kind==='features'?featureUnlocked(s,key):kind==='orderTiers'?deliveryTierUnlocked(s,key):recipeLevel(s,key)<=levelOf(s);
 // A farm saved before this change (progression version 5), at a given level, then opened with today's rules.
 const saved=level=>{const s=createFarm(now);s.progression={mode:'guided',version:5,fields:s.progression.fields};s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);return s;};
 for(const [kind,key,from,to] of moved){
  assert.equal(levels[kind][key],to,`${key} opens at ${to}`);
  const had=saved(from),waiting=saved(from-1);
  assert.equal(had.progression.version,6);assert.ok(open(had,kind,key),`${key}: a farm at level ${from} keeps it`);
  assert.ok(!open(waiting,kind,key),`${key}: a farm at level ${from-1} waits for level ${to}`);
  waiting.xp=xpForLevel(to);assert.ok(open(waiting,kind,key),`${key}: and gets it at ${to}`);
 }
 // A farm that already used a feature keeps it at any level; migrating twice changes nothing; a new farm starts at version 6.
 const used=createFarm(now);used.progression={mode:'guided',version:5,fields:used.progression.fields};used.xp=xpForLevel(4);used.stats.deliveries=1;normalizeFarm(used,now);
 assert.ok(featureUnlocked(used,'cart')&&deliveryTierUnlocked(used,'quick'));
 const again=structuredClone(saved(30));const once=structuredClone(again);normalizeFarm(again,now);assert.deepEqual(again,once);
 assert.equal(createFarm(now).progression.version,6);assert.equal(createFarm(now).progression.kept,undefined);
});

// 27 Sep 2026 (curve 5): levels 10 to 30 cheaper. 10 -> 20 felt four and a half times as long as 1 -> 10, right as the beginner boost ran out.
test('levels 10 to 20 ask a quarter less XP, the steps grow smoothly on from level 9 and back to the old ones by level 30',()=>{
 const step=level=>onCurve(5,level+1)-onCurve(5,level),old=level=>60+40*(level-1);
 assert.deepEqual([9,10,11,12,13,14,15,16,17,18,19].map(step),[320,330,355,380,405,435,465,495,525,560,595]);
 assert.equal(onCurve(5,20)-onCurve(5,10),4545,'was 6,000');
 assert.equal(onCurve(5,30)-onCurve(5,20),8980,'was 10,000');
 for(let level=10;level<30;level++){assert(step(level)<old(level),`level ${level} is cheaper`);assert(step(level)/step(level-1)<1.1,`no jump at ${level}`);}
 assert.equal(step(30),old(30),'from level 30 as before');
 for(const level of [1,9,10])assert.equal(onCurve(5,level),[0,995,1315][[1,9,10].indexOf(level)],'levels 1 to 10 unchanged');
 // A curve-4 farm keeps its level and its share of the way to the next one.
 const curve4=level=>{const n=level-1;return 60*n+20*n*(n-1)-665;};
 for(const [level,share] of [[9,.5],[10,0],[10,.5],[14,.2],[16,.4],[19,.99],[20,0],[25,.3],[29,.7],[30,.2],[49,.5]]){
  const xp=Math.round(curve4(level)+share*(curve4(level+1)-curve4(level))),s={...createFarm(now),xp,xpOffset:0,xpCurve:4},before=levelProgress(s);
  convertXpCurve(s,5);const after=levelProgress(s);   // to curve 5, as on 27 Sep (normalizeFarm converts to the curve that is on)
  assert.equal(before.level,level);assert.equal(after.level,level);assert.ok(Math.abs(after.current/after.target-before.current/before.target)<.005,`level ${level}: same share`);
  if(level<10)assert.equal(s.xp,xp,`level ${level}: untouched`);
  if(level>=30)assert.equal(s.xp,xp-2475,`level ${level}: the same XP into the level`);
 }
});
// Curve 5's and curve 6's totals, whichever is switched on (curve 6 is curve 5 with every step from level 90 exactly doubled).
const xp5=level=>onCurve(5,level),xp6=level=>onCurve(6,level);
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
// 9 Oct 2026 (curve 7): the steps from level 5 to 59 dearer, up to 1.3x from level 10 to 50, back to curve 6's own steps at 60. Every
// copy learns to read it first (XP_CURVE stays 6), then farms switch; a farm keeps its level and its share of the way to the next one.
const factor7=level=>level<5?1:level<10?1+(level-5)*.06:level<50?1.3:level<60?1.3-(level-50)*.03:1;
const xp7=(()=>{const totals=[0,0];return level=>{while(totals.length<=level){const from=totals.length-1;totals.push(totals[from]+Math.round((xp6(from+1)-xp6(from))*factor7(from)));}return totals[level];};})();
test('curve 7: levels 5 to 59 ask more XP, up to 1.3x, with no jump anywhere; every copy reads it; farms convert both ways keeping level and share',()=>{
 const step6=level=>xp6(level+1)-xp6(level),step7=level=>xp7(level+1)-xp7(level);
 assert.equal(XP_CURVE,7,'step 2 (9 Oct 2026): farms are on curve 7; every copy read it first (step 1)');
 for(let level=1;level<=6;level++)assert.equal(xp7(level),xp6(level),`reaching level ${level} costs the same`);
 assert.deepEqual([5,6,9,10,11,20,49,50,51,59,60,89,90].map(step7),[130,180,397,429,462,832,2574,2626,2720,3334,3388,9165,18824]);
 for(let level=10;level<50;level++)assert.equal(step7(level),Math.round(step6(level)*1.3),`${level} -> ${level+1} is 1.3x`);
 for(let level=60;level<300;level++)assert.equal(step7(level),step6(level),`${level} -> ${level+1} as on curve 6`);
 for(let level=1;level<300;level++)assert(step7(level+1)>step7(level),`steps keep growing: ${level}`);
 for(let level=10;level<300;level++)if(level!==90)assert(step7(level)/step7(level-1)<1.1,`no jump at ${level}`);
 assert.deepEqual([10,20,30,50,60,90].map(xp7),[1476,7388,19064,60664,90725,272521]);
 for(let level=2;level<=300;level++){
  assert.equal(levelOf({xp:xp7(level),xpOffset:0,xpCurve:7}),level,`curve 7 level ${level}`);
  assert.equal(levelOf({xp:xp7(level)-1,xpOffset:0,xpCurve:7}),level-1,`curve 7 just below ${level}`);
 }
 for(const [level,share] of [[1,.5],[5,.9],[6,0],[9,.5],[10,.2],[14,.99],[20,.3],[50,.5],[59,.4],[60,0],[89,.99],[95,.3],[108,.5],[200,.1]]){
  const xp=Math.round(xp6(level)+share*step6(level)),s={...createFarm(now),xp,xpOffset:0,xpCurve:6},before=levelProgress(s);
  convertXpCurve(s,7);const after=levelProgress(s),oneXp=1/Math.min(before.target,after.target);
  assert.equal(s.xpCurve,7);assert.equal(before.level,level);assert.equal(after.level,level,`level ${level} kept`);
  assert.ok(Math.abs(after.current/after.target-before.current/before.target)<=oneXp,`level ${level}: same share, give or take one XP`);
  if(level<6)assert.equal(s.xp,xp,`level ${level}: XP untouched`);
  const again=structuredClone(s);convertXpCurve(again,7);assert.equal(again.xp,s.xp,'converted once');
  // And back (a farm-api that is one release behind): the same level and share again.
  convertXpCurve(again,6);assert.equal(levelOf(again),level);assert.ok(Math.abs(levelProgress(again).current/levelProgress(again).target-before.current/before.target)<=2*oneXp);
 }
});

// 9 Oct 2026 (found in review): "Good soil, good harvests" counts fertilizer made at the Windmill and showed from level 8 (the paddock's
// helping hand gives fertilizer), while the recipe opens at 14. A "made" quest or challenge now waits for a recipe that makes the good.
test('a quest or daily challenge about making a good only shows once a recipe for it is open, at every level',async()=>{
 const {QUESTS,DAILY_POOLS,RECIPES,availableDaily,recipeUnlocked}=await import('../game/farm-state.js');
 const goals=[...QUESTS,...DAILY_POOLS.flat()].filter(q=>q.stat?.startsWith('made_'));
 assert.ok(goals.some(q=>q.title==='Good soil, good harvests'));
 for(let level=1;level<=60;level++){
  const s=createFarm(now);s.coins=1e9;s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);
  for(const key of Object.keys(s.buildings))if(BUILDING_LEVELS[key]<=level)s.buildings[key].built=true;
  for(const q of goals)if(availableDaily(s,q))assert.ok(Object.entries(RECIPES).some(([id,r])=>r.output[q.stat.slice(5)]&&recipeUnlocked(s,id)),`level ${level}: ${q.title} shows, but nothing makes ${q.stat.slice(5)}`);
 }
 const fertilizer=goals.find(q=>q.title==='Good soil, good harvests'),at=level=>{const s=createFarm(now);s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);for(const key of Object.keys(s.buildings))if(BUILDING_LEVELS[key]<=level)s.buildings[key].built=true;return s;};
 assert.equal(availableDaily(at(13),fertilizer),false);assert.equal(availableDaily(at(14),fertilizer),true);
});

// 9 Oct 2026 (found in review): a daily challenge drawn before an update keeps up with its definition (target, reward, the text the
// languages translate), and what a farm has used stays open even if it met the old levels after a rollback.
test('a stored daily challenge follows its new definition; a used feature stays open on every load, also after a rollback',async()=>{
 const {DAILY_POOLS}=await import('../game/farm-state.js');
 const s=createFarm(now);s.xp=xpForLevel(12);s.xpOffset=0;normalizeFarm(s,now);
 const honey=DAILY_POOLS.flat().find(q=>q.title==='Honey time');
 s.daily.tasks=[{...honey,target:3,reward:85,description:'Finish 3 Apiary jobs and collect their Honey.'}];
 normalizeFarm(s,now+60000);
 assert.deepEqual([s.daily.tasks[0].target,s.daily.tasks[0].reward,s.daily.tasks[0].description],[2,65,'Finish 2 Apiary jobs and collect their Honey.']);
 // A version-6 farm that used Medals, chores and deliveries below their new levels (the old rules, after a rollback) keeps them.
 const back=createFarm(now);back.xp=xpForLevel(11);back.xpOffset=0;back.stats.chores=3;back.stats.deliveries=2;back.mastery.claimed=['corn:0'];
 normalizeFarm(back,now);
 assert.equal(back.progression.version,6);for(const key of ['chores','mastery','cart'])assert.ok(featureUnlocked(back,key),key);assert.ok(deliveryTierUnlocked(back,'quick'));
 const fresh=createFarm(now);fresh.xp=xpForLevel(11);fresh.xpOffset=0;normalizeFarm(fresh,now);
 assert.ok(!featureUnlocked(fresh,'chores')&&!featureUnlocked(fresh,'mastery'),'a farm that never used them waits for their levels');assert.equal(fresh.progression.kept,undefined);
});
