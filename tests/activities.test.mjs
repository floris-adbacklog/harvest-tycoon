import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,ACTIVE_STATIONS,ACTIVITY_ROUND_REWARD,activityStatus} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,15);
function complete(s,station,time){
 const {startedAt}=act(s,{type:'activity_start',station},time);
 const targets=[...s.activities.jobs[station].targets];let result;
 targets.forEach((target,i)=>{result=act(s,{type:'activity_work',station,startedAt,target},time+(i+1)*700);});return result;
}
test('all four hands-on jobs reward once, give useful goods and complete one round',()=>{
 const s=createFarm(now),coins=s.coins,xp=s.xp,inventory={...s.inventory};
 let result,levelCoins=0;Object.keys(ACTIVE_STATIONS).forEach((id,i)=>{result=complete(s,id,now+i*3000);levelCoins+=result.levelReward?.coins??0;});
 assert.equal(s.coins-coins-levelCoins,Object.values(ACTIVE_STATIONS).reduce((n,a)=>n+a.coins,ACTIVITY_ROUND_REWARD.coins));
 assert.equal(s.xp-xp,Object.values(ACTIVE_STATIONS).reduce((n,a)=>n+a.xp,ACTIVITY_ROUND_REWARD.xp));
 assert.equal(s.xp-xp,160);
 assert.equal(s.inventory.lettuce,inventory.lettuce+1);assert.equal(s.inventory.fertilizer,inventory.fertilizer+1);
 // Honey is needed in bulk (berry preserves 3, smoothie 2, compote 2), so the Apiary gives three; the other stations still give one.
 assert.equal(s.inventory.honey,inventory.honey+3);assert.equal(s.inventory.feed,inventory.feed+1);
 assert.equal(ACTIVE_STATIONS.apiary.itemCount,3);for(const [id,a] of Object.entries(ACTIVE_STATIONS))if(id!=='apiary')assert.equal(a.itemCount??1,1,id);
 for(const station of Object.keys(ACTIVE_STATIONS))assert.equal(s.stats['activity_'+station],1);
 assert.equal(s.stats.activity_rounds,1);
 assert(result.roundComplete);assert.equal(s.activities.rounds,1);assert.deepEqual(s.activities.round,[]);assert.equal(s.stats.activities,4);
});
test('invalid, premature, wrong and repeated tile requests never award or advance',()=>{
 const s=createFarm(now);assert.throws(()=>act(s,{type:'activity_start',station:'constructor'},now),/Choose/);
 act(s,{type:'activity_start',station:'apiary'},now);const j=s.activities.jobs.apiary,valid=j.targets[0],wrong=Array.from({length:6},(_,i)=>i).find(i=>!j.targets.includes(i));
 for(const action of [{target:valid,startedAt:now+1},{target:wrong,startedAt:now},{target:String(valid),startedAt:now},{target:6,startedAt:now}]){
  const before=structuredClone(s);assert.throws(()=>act(s,{type:'activity_work',station:'apiary',...action},now+700));assert.deepEqual(s,before);
 }
 assert.throws(()=>act(s,{type:'activity_work',station:'apiary',startedAt:now,target:valid},now+100),/moment/);
 act(s,{type:'activity_work',station:'apiary',startedAt:now,target:valid},now+700);
 const after=structuredClone(s);assert.throws(()=>act(s,{type:'activity_work',station:'apiary',startedAt:now,target:valid},now+1500),/already/);assert.deepEqual(s,after);
 assert.throws(()=>act(s,{type:'activity_start',station:'apiary'},now+3000),/already/);
});
test('finished jobs enforce cooldowns and reject delayed replay from previous job',()=>{
 const s=createFarm(now);complete(s,'greenhouse',now);const before=s.coins;
 assert.throws(()=>act(s,{type:'activity_start',station:'greenhouse'},now+10000),/returns/);
 assert.throws(()=>act(s,{type:'activity_work',station:'greenhouse',startedAt:now,target:0},now+10000),/current/);assert.equal(s.coins,before);
 const next=s.activities.cooldowns.greenhouse;act(s,{type:'activity_start',station:'greenhouse'},next);
 assert.throws(()=>act(s,{type:'activity_work',station:'greenhouse',startedAt:now,target:s.activities.jobs.greenhouse.targets[0]},next+700),/current/);
 assert.notDeepEqual(s.activities.jobs.greenhouse.targets,[0,2,3]);
});
test('old farms migrate without losing balances, timers or quests; partial jobs survive reloads',()=>{
 const s=createFarm(now);delete s.activities;s.version=6;const before=structuredClone(s);normalizeFarm(s,now+1000);
 for(const key of ['coins','diamonds','inventory','plots','buildings','onboarding','claimed'])assert.deepEqual(s[key],before[key]);
 act(s,{type:'activity_start',station:'paddock'},now+1000);const target=s.activities.jobs.paddock.targets[0];act(s,{type:'activity_work',station:'paddock',startedAt:now+1000,target},now+2000);
 const reload=normalizeFarm(JSON.parse(JSON.stringify(s)),now+86400000);
 assert.deepEqual(reload.activities,s.activities);assert.equal(activityStatus(reload,'paddock',now+86400000).job.done.length,1);
});
test('repeating one station does not count as visiting all four; idle time awards nothing',()=>{
 const s=createFarm(now);complete(s,'apiary',now);complete(s,'apiary',s.activities.cooldowns.apiary);
 assert.equal(s.activities.rounds,0);assert.deepEqual(s.activities.round,['apiary']);
 const coins=s.coins;normalizeFarm(s,now+86400000);assert.equal(s.coins,coins);
});
test('client-supplied reward fields are ignored and XP boosts apply once',()=>{
 const s=createFarm(now);s.boosts.xpUntil=now+60000;act(s,{type:'activity_start',station:'workshop',coins:999999},now);
 const job=s.activities.jobs.workshop;let result;job.targets.forEach((target,i)=>{result=act(s,{type:'activity_work',station:'workshop',startedAt:now,target,coins:999999,xp:999999},now+(i+1)*700);});
 assert.equal(result.coins,30);assert.equal(result.xp,64);assert.equal(s.activities.completed.workshop,1);
});

test('Double XP doubles the full hands-on round without multiplying level rewards',()=>{
 const s=createFarm(now),coins=s.coins,diamonds=s.diamonds,xp=s.xp;
 s.boosts.xpUntil=now+60000;let creditedCoins=0,creditedDiamonds=0;
 Object.keys(ACTIVE_STATIONS).forEach((id,i)=>{
  const r=complete(s,id,now+i*3000);
  creditedCoins+=r.levelReward?.coins??0;creditedDiamonds+=r.levelReward?.diamonds??0;
 });
 assert.equal(s.xp-xp,320);assert.equal(s.coins-coins,122+creditedCoins);
 assert.equal(s.diamonds-diamonds,creditedDiamonds);assert.equal(s.activities.rounds,1);
 const before=structuredClone(s);normalizeFarm(s,now+60000);
 assert.equal(s.xp,before.xp);assert.equal(s.coins,before.coins);assert.equal(s.diamonds,before.diamonds);
});
