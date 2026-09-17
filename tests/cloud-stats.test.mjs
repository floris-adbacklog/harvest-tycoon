import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchLeaderboard} from '../src/leaderboard.js';
test('leaderboard asks for twenty ranked stats and computes own rank outside the list',async()=>{
 const calls=[];let i=0;const responses=[{data:[{player_id:'other',username:'Other',currency:500,level:3}],error:null},{data:{player_id:'self',username:'Farmer',currency:100,level:2},error:null},{count:21,error:null}];
 const client={from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
 const result=await fetchLeaderboard(client,'self');assert.equal(result.rank,22);assert.equal(result.own.player_id,'self');assert(calls[0].steps.some(x=>x[0]==='limit'&&x[1]===20));assert(calls[0].steps.some(x=>x[0]==='order'&&x[1]==='currency'&&x[2].ascending===false));assert(calls.every(x=>x.table==='player_stats'));
});
