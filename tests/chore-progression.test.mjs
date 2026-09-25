import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,choreStatus,CHORES,CHORE_PRACTICE_STEP,ACTIVE_STATIONS,levelOf,levelReward} from '../game/farm-state.js';
import {art} from '../public/visual-icons.js';
import {soundForAction} from '../public/farm-audio.js';
const now=Date.UTC(2026,8,18);
// Chores pay enough XP to level up a young farm; level-ups pay their own coins and diamonds on top.
const levelGain=(from,to,key)=>{let sum=0;for(let l=from+1;l<=to;l++)sum+=levelReward(l)[key];return sum;};
test('practice unlocks chores in order at their mastery threshold and respects caps',()=>{
 const s=createFarm(now);let time=now;
 for(const id of ['troughs','sorting'])assert.throws(()=>act(s,{type:'chore',id},time,()=>{throw Error('must not roll');}),/Master/);
 for(const id of Object.keys(CHORES)){
  const c=CHORES[id];assert.equal(choreStatus(s,id,time).locked,false);
  for(let i=0;i<Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP);i++){
   assert.equal(choreStatus(s,id,time).chance,Math.min(c.maxChance,c.baseChance+i*CHORE_PRACTICE_STEP));
   act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  }
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
  act(s,{type:'chore',id},time,()=>0);time+=c.cooldown;
  assert.equal(choreStatus(s,id,time).chance,c.maxChance);
 }
});
test('a regular completion earns guaranteed rewards, advances practice, starts cooldown and ignores forged outcome',()=>{
 const s=createFarm(now),coins=s.coins,xp=s.xp,inventory=structuredClone(s.inventory),level=levelOf(s);
 s.boosts.xpUntil=now+999999;
 const r=act(s,{type:'chore',id:'weeds',success:true,roll:0,chance:100},now,()=>.99);
 assert.equal(r.success,true);assert.equal(r.coins,27);assert.equal(r.xp,90,'45 XP, doubled by the XP boost');
 assert.equal(s.coins,coins+27+levelGain(level,levelOf(s),'coins'));assert.equal(s.xp,xp+90);assert.deepEqual(s.inventory,inventory);
 assert.equal(s.stats.chores,1);assert.ok(s.onboarding.milestones.chore);
 assert.equal(r.nextChance,64);assert.equal(s.chores.weeds,now+300000);
 assert.throws(()=>act(s,{type:'chore',id:'weeds'},now+299999,()=>{throw Error('must not roll');}),/returns in/);
 assert.equal(s.chorePractice.weeds,1);assert.equal(r.bonus,false);
 const restored=normalizeFarm(JSON.parse(JSON.stringify(s)),now);
 assert.equal(restored.chorePractice.weeds,1);
 assert.equal(act(restored,{type:'chore',id:'weeds'},now+300000,()=>0).bonus,true);
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
test('chores rest 5 minutes to an hour and pay their XP in full; the chores list counts attempts with the same practice step',()=>{
 const rows=Object.values(CHORES).map(c=>[c.cooldown/60000,c.xp]);
 assert.deepEqual(rows,[[5,45],[10,70],[20,110],[30,150],[45,200],[60,260]]);
 assert.equal(CHORE_PRACTICE_STEP,4);
 const ui=readFileSync(new URL('../public/growth-ui.js',import.meta.url),'utf8');
 assert.match(ui,/const mastery=c=>Math\.ceil\(\(c\.maxChance-c\.baseChance\)\/CHORE_PRACTICE_STEP\);/);
});
