import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,choreStatus,CHORES,ACTIVE_STATIONS} from '../game/farm-state.js';
import {art} from '../public/visual-icons.js';
import {soundForAction} from '../public/farm-audio.js';
const now=Date.UTC(2026,8,18);
test('practice unlocks chores in order at their mastery threshold and respects caps',()=>{
 const s=createFarm(now);let time=now;
 for(const id of ['troughs','sorting'])assert.throws(()=>act(s,{type:'chore',id},time,()=>{throw Error('must not roll');}),/Master/);
 for(const id of Object.keys(CHORES)){
  const c=CHORES[id];assert.equal(choreStatus(s,id,time).locked,false);
  for(let i=0;i<Math.ceil((c.maxChance-c.baseChance)/2);i++){
   assert.equal(choreStatus(s,id,time).chance,c.baseChance+i*2);
   act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  }
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
  act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
 }
});
test('a regular completion earns guaranteed rewards, advances practice, starts cooldown and ignores forged outcome',()=>{
 const s=createFarm(now),coins=s.coins,xp=s.xp,inventory=structuredClone(s.inventory);
 s.boosts.xpUntil=now+999999;
 const r=act(s,{type:'chore',id:'weeds',success:true,roll:0,chance:100},now,()=>.99);
 assert.equal(r.success,true);assert.equal(r.coins,5);assert.equal(r.xp,2);
 assert.equal(s.coins,coins+5);assert.equal(s.xp,xp+2);assert.deepEqual(s.inventory,inventory);
 assert.equal(s.stats.chores,1);assert.ok(s.onboarding.milestones.chore);
 assert.equal(r.nextChance,62);assert.equal(s.chores.weeds,now+60000);
 assert.throws(()=>act(s,{type:'chore',id:'weeds'},now+59999,()=>{throw Error('must not roll');}),/returns in/);
 assert.equal(s.chorePractice.weeds,1);assert.equal(r.bonus,false);
 const restored=normalizeFarm(JSON.parse(JSON.stringify(s)),now);
 assert.equal(restored.chorePractice.weeds,1);
 assert.equal(act(restored,{type:'chore',id:'weeds'},now+60000,()=>0).bonus,true);
});
test('success boundary is strict and a mastered first chore always succeeds',()=>{
 assert.equal(act(createFarm(now),{type:'chore',id:'weeds'},now,()=>.6).bonus,false);
 assert.equal(act(createFarm(now),{type:'chore',id:'weeds'},now,()=>.5999).bonus,true);
 const s=createFarm(now);s.chorePractice.weeds=20;
 assert.equal(act(s,{type:'chore',id:'weeds'},now,()=>.999999).bonus,true);
});
test('old farms retain balances and cooldowns without inventing per-chore practice',()=>{
 const s=createFarm(now);delete s.chorePractice;s.stats.chores=100;s.chores.weeds=now+30000;
 const balance=s.coins;normalizeFarm(s,now);
 assert.equal(s.stats.chores,100);assert.equal(s.coins,balance);assert.equal(s.chores.weeds,now+30000);
 assert.equal(choreStatus(s,'weeds',now).attempts,0);
});
test('each hands-on station awards an item and Honey has dedicated artwork',()=>{
 assert.deepEqual(Object.values(ACTIVE_STATIONS).map(s=>s.item),['lettuce','honey','fertilizer','feed']);
 assert.match(art('honey'),/assets\/icons\/honey.webp/);
});
