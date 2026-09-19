import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,applyFarmAction as act,grantLevelRewards,levelReward,xpForLevel,levelOf,normalizeFarm} from '../game/farm-state.js';
import {mergeRewards,progressionChange,progressionSnapshot} from '../public/progression-ui.js';
const now=Date.UTC(2026,8,19,12);
function poised(level){const s=createFarm(now);s.xp=xpForLevel(level)-5;s.xpOffset=0;s.levelRewards=Array.from({length:level-1},(_,i)=>i+1);return s;}
test('corrected schedule: level 20 gives 200 coins and 4 diamonds',()=>{
 for(const [lvl,coins,diamonds]of [[2,20,0],[4,40,0],[5,50,1],[9,90,1],[10,100,2],[19,190,3],[20,200,4],[25,250,5]])assert.deepEqual(levelReward(lvl),{coins,diamonds});
});
test('level-up credits automatically, persists and cannot be manually paid twice',()=>{
 const s=poised(20),coins=s.coins,diamonds=s.diamonds,before=progressionSnapshot(s);
 const result=act(s,{type:'field',id:0,action:'harvest'},now);
 assert.equal(levelOf(s),20);assert.deepEqual(result.levelReward,{coins:200,diamonds:4,levels:[20]});
 assert.equal(s.coins,coins+200);assert.equal(s.diamonds,diamonds+4);
 assert.deepEqual(progressionChange(before,s,result.levelReward).reward,result.levelReward);
 const reloaded=normalizeFarm(JSON.parse(JSON.stringify(s)),now);
 assert.deepEqual(grantLevelRewards(reloaded),{coins:0,diamonds:0,levels:[]});
 assert.throws(()=>act(reloaded,{type:'level_rewards'},now),/already/);
 assert.equal(reloaded.coins,coins+200);assert.equal(reloaded.diamonds,diamonds+4);
});
test('all crossed levels are paid once; coin boost cannot multiply level rewards',()=>{
 const s=createFarm(now);s.boosts.coinsUntil=now+10000;s.boosts.xpUntil=now+10000;
 s.buildings.coop.job={id:'bulk',recipe:'eggs',output:{eggs:3},xp:240,startedAt:now-1000,readyAt:now};
 const result=act(s,{type:'collect',building:'coop'},now);
 assert.equal(s.xp,480);assert.equal(levelOf(s),5);
 assert.deepEqual(result.levelReward,{coins:140,diamonds:1,levels:[2,3,4,5]});
 assert.equal(s.coins,320);assert.equal(s.diamonds,1);
});
test('existing unpaid levels settle once while paid levels are preserved',()=>{
 const s=createFarm(now);s.xp=xpForLevel(20);s.levelRewards=Array.from({length:18},(_,i)=>i+1);const coins=s.coins;
 assert.deepEqual(grantLevelRewards(s),{coins:390,diamonds:7,levels:[19,20]});assert.equal(s.coins,coins+390);
 assert.deepEqual(grantLevelRewards(s),{coins:0,diamonds:0,levels:[]});
});
test('invalid actions cannot trigger rewards; level one has no signup payout',()=>{
 const s=poised(20),before=structuredClone(s);assert.throws(()=>act(s,{type:'collect',building:'coop'},now));assert.deepEqual(s,before);
 const fresh=createFarm(now);assert.deepEqual(grantLevelRewards(fresh),{coins:0,diamonds:0,levels:[]});assert.equal(fresh.coins,180);
});
test('queued popups add multiple rewards without counting duplicate levels twice',()=>{
 assert.deepEqual(mergeRewards({levels:[19,20],coins:390,diamonds:7},{levels:[20,21],coins:410,diamonds:8}),{levels:[19,20,21],coins:600,diamonds:11});
});
