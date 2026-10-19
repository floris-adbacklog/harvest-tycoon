import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction,levelReward,levelOf,BEGINNER_QUESTS,BEGINNER_REWARD,BEGINNER_STEP_XP,QUESTS,FEATURE_LEVELS,beginnerProgress} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
const act=(state,action,time=now,random=()=>0)=>applyFarmAction(state,action,time,random);
// Chores pay enough XP to level up a young farm; level-ups pay their own coins and diamonds on top.
const levelGain=(from,to,key)=>{let sum=0;for(let l=from+1;l<=to;l++)sum+=levelReward(l)[key];return sum;};
test('the beginner guide teaches ten achievable starter actions and awards 50 diamonds once',()=>{
 const state=createFarm(now);assert.equal(BEGINNER_QUESTS.length,10);assert.equal(QUESTS.length,320);
 const claim=id=>act(state,{type:'beginner_claim',id});
 assert.throws(()=>claim('harvest'),/farming action/);
 // Steps 1-9 finish themselves with the action that does them (XP included); only the last one is collected by hand.
 const done=(result,id)=>{assert.deepEqual(result.guide?.map(g=>g.step),[id],id);assert.equal(result.guide[0].xp,BEGINNER_STEP_XP);};
 done(act(state,{type:'field',id:0,action:'harvest'}),'harvest');
 done(act(state,{type:'sell',item:'corn'}),'sell');
 done(act(state,{type:'field',id:0,action:'plant',crop:'wheat'}),'plant');
 done(act(state,{type:'field',id:0,action:'water'}),'water');
 done(act(state,{type:'produce',recipe:'eggs'}),'produce');
 done(act(state,{type:'checkin'}),'gift');
 // 19 Oct 2026: an older farm has the guided steps 7 and 9 too (its chore step waited for Farm chores at level 15 once features follow the
 // level on every farm): collect the eggs and sell one, then one helping-hand job (level 3; the guide's XP has the farm past it by then).
 const before=state.diamonds,beforeLevel=levelOf(state);
 assert.throws(()=>act(state,{type:'collect',building:'coop'},now+120000),/still being made/);
 assert.throws(()=>claim('collect'),/current beginner step/);assert.equal(state.diamonds,before);
 act(state,{type:'collect',building:'coop'},now+300000);assert.equal(state.onboarding.completed,6,'the eggs alone are half of step 7');
 done(act(state,{type:'sell',item:'eggs',quantity:1},now+300000),'sell_egg');
 const field=state.plots.findIndex(p=>!p.crop);act(state,{type:'field',id:field,action:'plant',crop:'wheat'},now+300000);
 done(act(state,{type:'field',id:field,action:'tend'},now+340000),'tend');
 assert.ok(levelOf(state)>FEATURE_LEVELS.activities,'the hand is open at step 9');
 const {startedAt}=act(state,{type:'activity_start',station:'greenhouse'},now+341000);let job;
 state.activities.jobs.greenhouse.targets.forEach((target,i)=>{job=act(state,{type:'activity_work',station:'greenhouse',startedAt,target},now+341000+(i+1)*700);});
 done(job,'hand');
 assert.equal(state.onboarding.completed,9);assert.equal(state.onboarding.rewardClaimed,false);
 // Step 10 was done with step 7's eggs (a done action counts whenever it came); its diamonds still wait for the claim.
 assert.equal(state.diamonds-before,levelGain(beforeLevel,levelOf(state),'diamonds'),'no guide diamonds before the claim');
 // Without a collected batch step 10 still cannot be claimed (here the eggs are collected in step 7, so a farm at step 10 that never did).
 const uncollected=createFarm(now);uncollected.onboarding.completed=9;const untouched=structuredClone(uncollected);
 assert.throws(()=>act(uncollected,{type:'beginner_claim',id:'collect'}),/farming action/);assert.deepEqual(uncollected,untouched);
 const collected=state.diamonds,level=levelOf(state);
 const reward=claim('collect');assert.equal(reward.diamonds,50);assert.equal(BEGINNER_REWARD,50);const levelDiamonds=levelGain(level,levelOf(state),'diamonds');assert.equal(state.diamonds,collected+BEGINNER_REWARD+levelDiamonds);
 assert.deepEqual(state.claimed,[],'regular quests must not be claimed by the tutorial');
 assert(beginnerProgress(state).every(q=>q.done));
 const reloaded=normalizeFarm(JSON.parse(JSON.stringify(state)),now+300001);
 assert.throws(()=>act(reloaded,{type:'beginner_claim',id:'collect'}),/already complete/);
 assert.equal(reloaded.diamonds,collected+50+levelDiamonds);assert.ok(collected>=before);
});
// Step 7 is selling an egg on every farm since 19 Oct 2026 (it was a chore on an older farm, and chores open at level 15).
test('out-of-order actions count but rewards cannot skip steps or trust client fields',()=>{
 const state=createFarm(now);
 assert.throws(()=>act(state,{type:'field',id:3,action:'harvest'}),/Still growing/);
 assert.equal(state.onboarding.milestones.harvest,undefined);
 act(state,{type:'produce',recipe:'eggs'});act(state,{type:'collect',building:'coop'},now+300000);act(state,{type:'sell',item:'eggs',quantity:1},now+300000);
 assert.throws(()=>act(state,{type:'beginner_claim',id:'sell_egg',completed:9,diamonds:999},now+300000),/current beginner step/);
 assert.equal(state.onboarding.completed,0);assert.ok(state.diamonds<BEGINNER_REWARD,'only level-up diamonds, never the guide reward');
 assert.equal(state.onboarding.milestones.sell_egg,true);
});
test('existing farms retain regular progress, money, plots and jobs on tutorial migration',()=>{
 const state=createFarm(now);delete state.onboarding;
 state.claimed=[0,1,3];state.stats.harvested=50;state.coins=9876;state.diamonds=8;state.login.visits=4;
 act(state,{type:'produce',recipe:'eggs'});delete state.onboarding;
 const before=structuredClone(state);normalizeFarm(state,now);
 for(const key of ['claimed','stats','coins','diamonds','plots','buildings'])assert.deepEqual(state[key],before[key]);
 assert.equal(state.onboarding.completed,0);assert.equal(state.onboarding.milestones.gift,true);
 assert.equal(state.onboarding.milestones.harvest,undefined,'old normal-quest counters do not complete beginner steps');
});
test('regular quest claims never claim tutorial steps or diamond reward',()=>{
 const state=createFarm(now);state.stats.harvested=3;
 act(state,{type:'quest',id:0});assert.deepEqual(state.claimed,[0]);
 assert.equal(state.onboarding.completed,0);assert.equal(state.diamonds,levelReward(2).diamonds,'only the level-up pays diamonds, never the guide reward');
});
