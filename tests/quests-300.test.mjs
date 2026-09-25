import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUESTS,QUEST_XP,questXp,claimQuest,createFarm} from '../game/farm-state.js';
import {questArt} from '../public/quests-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('50 more quests, appended so every quest id stays the same: 300 in all, every title once',()=>{
 assert.equal(QUESTS.length,300);assert.equal(QUESTS[249].title,'Every building at its best','the old last quest keeps its id');
 assert.equal(QUESTS[250].title,'A mountain of lettuce');assert.equal(QUESTS[299].title,'Stall keeper');
 assert.equal(new Set(QUESTS.map(q=>q.title)).size,300);
 for(const q of QUESTS.slice(250)){assert.ok(q.reward>0&&q.target>0&&q.description.length<=60,q.title);assert.ok(!questArt(q.stat).includes('data-art="quests"'),`${q.title} has its own picture`);}
});

test('every goal is a ladder: a bigger goal of the same kind always pays more',()=>{
 const byStat={};for(const q of QUESTS)(byStat[q.stat]??=[]).push(q);
 for(const [stat,list] of Object.entries(byStat)){
  const ladder=[...list].filter(q=>q.xp===undefined).sort((a,b)=>a.target-b.target);   // the starter quests (their own 0 XP) are a separate little track
  for(let i=1;i<ladder.length;i++){assert.ok(ladder[i].target>ladder[i-1].target,`${stat}: one quest per goal`);assert.ok(ladder[i].reward>ladder[i-1].reward,`${stat}: ${ladder[i].target} pays more than ${ladder[i-1].target}`);}
 }
});

test('quest XP: 15 up to 1,000 coins, then growing with the reward to at most 250; the starter quests keep their 0',()=>{
 assert.equal(QUEST_XP,15);
 assert.equal(questXp({reward:40}),15);assert.equal(questXp({reward:1000}),15);assert.equal(questXp({reward:4500}),32);assert.equal(questXp({reward:60000}),116);assert.equal(questXp({reward:300000}),250);
 assert.equal(questXp({reward:20,xp:0}),0);
 const s=createFarm(Date.UTC(2026,8,26));s.stats.upgrades=300;const id=QUESTS.findIndex(q=>q.title==='Every building at its best'),before=s.xp;
 assert.deepEqual(claimQuest(s,id),{coins:90000,xp:questXp(QUESTS[id])});assert.equal(s.xp-before,Math.round(15*Math.sqrt(90)));
 assert.match(read('public/quests-ui.js'),/const xp=questXp\(q\),rewards=/,'the quest card shows the same XP');
 assert.match(read('public/wiki-content.js'),/Bigger quests, more XP/);
});
