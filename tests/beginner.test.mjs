import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction,levelReward,levelOf,BEGINNER_QUESTS,BEGINNER_REWARD,BEGINNER_STEP_XP,QUESTS,beginnerProgress} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
const act=(state,action,time=now,random=()=>0)=>applyFarmAction(state,action,time,random);
// Chores pay enough XP to level up a young farm; level-ups pay their own coins and diamonds on top.
const levelGain=(from,to,key)=>{let sum=0;for(let l=from+1;l<=to;l++)sum+=levelReward(l)[key];return sum;};
test('the beginner guide teaches ten achievable starter actions and awards 50 diamonds once',()=>{
 const state=createFarm(now);assert.equal(BEGINNER_QUESTS.length,10);assert.equal(QUESTS.length,300);
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
 done(act(state,{type:'chore',id:'weeds'},now,()=>0),'chore');
 done(act(state,{type:'field',id:0,action:'tend'},now+40000),'tend');
 done(act(state,{type:'field',id:0,action:'harvest'},now+120000),'wheat');
 assert.equal(state.onboarding.completed,9);assert.equal(state.onboarding.rewardClaimed,false);
 const before=state.diamonds;
 assert.throws(()=>act(state,{type:'collect',building:'coop'},now+120000),/still being made/);
 assert.throws(()=>claim('collect'),/farming action/);assert.equal(state.diamonds,before);
 act(state,{type:'collect',building:'coop'},now+300000);const collected=state.diamonds,level=levelOf(state);
 const reward=claim('collect');assert.equal(reward.diamonds,50);assert.equal(BEGINNER_REWARD,50);const levelDiamonds=levelGain(level,levelOf(state),'diamonds');assert.equal(state.diamonds,collected+BEGINNER_REWARD+levelDiamonds);
 assert.deepEqual(state.claimed,[],'regular quests must not be claimed by the tutorial');
 assert(beginnerProgress(state).every(q=>q.done));
 const reloaded=normalizeFarm(JSON.parse(JSON.stringify(state)),now+300001);
 assert.throws(()=>act(reloaded,{type:'beginner_claim',id:'collect'}),/already complete/);
 assert.equal(reloaded.diamonds,collected+50+levelDiamonds);assert.ok(collected>=before);
});
test('out-of-order actions count but rewards cannot skip steps or trust client fields',()=>{
 const state=createFarm(now);
 assert.throws(()=>act(state,{type:'field',id:3,action:'harvest'}),/Still growing/);
 assert.equal(state.onboarding.milestones.harvest,undefined);
 act(state,{type:'chore',id:'weeds'},now,()=>0);
 assert.throws(()=>act(state,{type:'beginner_claim',id:'chore',completed:9,diamonds:999}),/current beginner step/);
 assert.equal(state.onboarding.completed,0);assert.ok(state.diamonds<BEGINNER_REWARD,'only level-up diamonds, never the guide reward');
 assert.equal(state.onboarding.milestones.chore,true);
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
