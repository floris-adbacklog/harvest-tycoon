import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {xpForLevel,normalizeFarm,applyFarmAction as act,levelOf,levelProgress,CROPS,RECIPES,recipeDuration,PROJECTS,currentProject,stallStatus,masteryStatus,DAY_MS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12),hour=3600000;
test('old saves preserve coins, inventory, levels, crop and job deadlines',()=>{
 const s=createFarm(now);s.version=3;s.xp=2017;s.coins=8123;s.inventory.wheat=67;s.buildings.mill.job={recipe:'flour',startedAt:now-10000,readyAt:now+5000};delete s.mastery;delete s.stall;delete s.estate;delete s.xpOffset;
 const original=structuredClone(s);normalizeFarm(s,now);
 assert.equal(levelOf(s),1+Math.floor(original.xp/60));assert.equal(s.coins,original.coins);assert.deepEqual(s.inventory,original.inventory);assert.equal(s.plots[5].readyAt,original.plots[5].readyAt);assert.equal(s.buildings.mill.job.readyAt,original.buildings.mill.job.readyAt);assert.deepEqual(s.buildings.mill.job.output,{flour:1});
 const again=structuredClone(s);normalizeFarm(s,now);assert.deepEqual(s,again);
});
test('active care yields three crops versus one passive crop and cannot be repeated',()=>{
 const a=createFarm(now),p=createFarm(now);act(a,{type:'field',id:8,action:'plant',crop:'wheat'},now);act(p,{type:'field',id:8,action:'plant',crop:'wheat'},now);
 act(a,{type:'field',id:8,action:'water'},now);assert.throws(()=>act(a,{type:'field',id:8,action:'tend'},now),/available in/);
 act(a,{type:'field',id:8,action:'tend'},a.plots[8].careAt);assert.throws(()=>act(a,{type:'field',id:8,action:'tend'},a.plots[8].careAt),/already/);
 assert(a.plots[8].readyAt<p.plots[8].readyAt);const active=act(a,{type:'field',id:8,action:'harvest'},now+CROPS.wheat.duration),passive=act(p,{type:'field',id:8,action:'harvest'},now+CROPS.wheat.duration);
 assert.equal(active.quantity,3);assert.equal(passive.quantity,1);assert.equal(active.xp,passive.xp*2);assert.equal(a.mastery.harvests.wheat,1);
 assert.equal(CROPS.wheat.duration,120000);assert.equal(CROPS.sunflower.duration,DAY_MS);
});
test('passive earnings accrue only once, cap offline time and do not retroactively use upgrades',()=>{
 const s=createFarm(now);assert.equal(stallStatus(s,now+hour).available,36);s.coins=10000;act(s,{type:'stall_upgrade'},now+hour);
 assert.equal(stallStatus(s,now+hour).available,36);assert.equal(stallStatus(s,now+2*hour).available,90);
 const before=s.coins;act(s,{type:'stall_collect'},now+2*hour);assert.equal(s.coins,before+90);assert.throws(()=>act(s,{type:'stall_collect'},now+2*hour),/first coin/);
 assert.equal(stallStatus(s,now+100*DAY_MS).available,54*28);
 const b=structuredClone(s);assert.equal(stallStatus(s,now-hour).available,0);assert.deepEqual(b,s);
});
test('chores remain repeatable but do not pay twice during cooldown',()=>{
 const s=createFarm(now);act(s,{type:'chore',id:'weeds'},now,()=>0);const balance=s.coins;assert.throws(()=>act(s,{type:'chore',id:'weeds'},now),/returns in/);assert.equal(s.coins,balance);
 const wheat=s.inventory.wheat;act(s,{type:'chore',id:'weeds'},now+60000,()=>0);assert.equal(s.stats.chores,2);assert.equal(s.coins,balance+5);assert.equal(s.inventory.wheat,wheat+2,'the bonus is goods, not coins');
 assert.throws(()=>act(s,{type:'chore',id:'constructor'},now),/Choose/);
});
test('mastery counts field harvests, claims once and old crop counts receive credit',()=>{
 const s=createFarm(now);s.version=3;delete s.mastery;s.stats.harvest_wheat=100;normalizeFarm(s,now);assert.equal(masteryStatus(s,'wheat')[1].progress,100);
 act(s,{type:'mastery',crop:'wheat',tier:0},now);act(s,{type:'mastery',crop:'wheat',tier:1},now);assert.equal(s.stats.mastery_medals,2);
 assert.throws(()=>act(s,{type:'mastery',crop:'wheat',tier:1},now),/already/);assert.throws(()=>act(s,{type:'mastery',crop:'wheat',tier:2},now),/Keep harvesting/);
});
test('estate chapters take over five weeks even with unlimited funds, then keep repeating',()=>{
 const s=createFarm(now);s.xp=xpForLevel(90);s.coins=1e8;s.mastery.claimed=Array.from({length:44},(_,i)=>String(i));let time=now;
 for(let i=0;i<12;i++){
  const p=currentProject(s),balance=s.coins;Object.assign(s.inventory,p.input);act(s,{type:'project_start'},time);assert.equal(s.coins,balance-p.coins);
  assert.throws(()=>act(s,{type:'project_collect'},time),/still/);time+=p.duration;act(s,{type:'project_collect'},time);assert.throws(()=>act(s,{type:'project_collect'},time),/Start/);
 }
 assert(time-now>35*DAY_MS);assert.equal(s.estate.completed,12);assert.equal(currentProject(s).name,'Estate commission 3');
});
test('level requirements grow and all twenty building levels keep positive production durations',()=>{
 const s=createFarm(now);assert.equal(levelProgress(s).target,15);s.xp=60;assert.equal(levelOf(s),3);assert.equal(levelProgress(s).target,65);
 for(let level=1;level<=20;level++){s.buildings.windmill.level=level;const duration=recipeDuration(s,'flour');assert(duration>0);assert(duration<=RECIPES.flour.duration);}
 s.coins=1e9;s.buildings.mill.level=3;for(let i=3;i<10;i++)act(s,{type:'upgrade',building:'mill'},now);assert.equal(s.buildings.mill.level,10);assert.throws(()=>act(s,{type:'upgrade',building:'mill'},now),/Reach level 26/,'level 10 is where the estate upgrades begin');
});
