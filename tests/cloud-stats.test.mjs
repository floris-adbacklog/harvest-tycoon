import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLeaderboard} from '../src/leaderboard.js';
test('leaderboard asks for twenty ranked stats and computes own rank outside the list',async()=>{
 const calls=[];let i=0;const responses=[{data:[{player_id:'other',username:'Other',currency:500,level:3}],error:null},{data:{player_id:'self',username:'Farmer',currency:100,level:2},error:null},{count:21,error:null}];
 const client={from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
 const result=await fetchLeaderboard(client,'self');assert.equal(result.rank,22);assert.equal(result.own.player_id,'self');assert(calls[0].steps.some(x=>x[0]==='limit'&&x[1]===20));assert(calls[0].steps.some(x=>x[0]==='order'&&x[1]==='level'&&x[2].ascending===false));assert(calls.every(x=>x.table==='player_stats'));
});

import {LEADERBOARD_CATEGORIES,rankedRows} from '../src/leaderboard.js';
test('every crop has its own board; only public metrics can be selected',async()=>{
 for(const crop of ['wheat','corn','barley','lettuce','cabbage','cauliflower','pumpkin','redcabbage','sunflower'])assert(LEADERBOARD_CATEGORIES['harvested_'+crop]);
 assert.equal(Object.keys(LEADERBOARD_CATEGORIES).length,16);
 for(const category of ['diamonds','harvested_grain','state','__proto__'])await assert.rejects(fetchLeaderboard({from(){throw new Error('Should not query');}},'self',category),/valid leaderboard/);
 for(const category of Object.keys(LEADERBOARD_CATEGORIES)){
  const calls=[];let i=0;
  const row={player_id:'self',username:'Farmer',level:3,[category]:7};
  const responses=[{data:[row],error:null},{count:2,error:null}];
  const client={from(){const n=i++,q={};for(const name of ['select','order','limit','eq','maybeSingle','gt'])q[name]=(...args)=>{calls.push([name,...args]);return q;};q.then=resolve=>Promise.resolve(responses[n]).then(resolve);return q;}};
  const result=await fetchLeaderboard(client,'self',category);assert.equal(result.category,category);assert.equal(result.rank,3);
  assert(calls.some(c=>c[0]==='order'&&c[1]===category));assert(calls.some(c=>c[0]==='gt'&&c[1]===category&&c[2]===7));
  assert(calls.filter(c=>c[0]==='select').every(c=>!c[1].includes('diamonds')&&!c[1].includes('*')));
 }
});
test('equal harvest or badge scores share ranks without affecting other categories',()=>{
 const rows=[{badges:4,harvested_wheat:50},{badges:4,harvested_wheat:20},{badges:1,harvested_wheat:20}];
 assert.deepEqual(rankedRows(rows,'badges').map(r=>r.rank),[1,1,3]);
 assert.deepEqual(rankedRows(rows,'harvested_wheat').map(r=>r.rank),[1,2,2]);
});
