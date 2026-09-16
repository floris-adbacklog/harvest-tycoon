import test from 'node:test';
import assert from 'node:assert/strict';
import {statsPayload,createStatsSync} from '../src/sync.js';
import {fetchLeaderboard} from '../src/leaderboard.js';

test('only the four public writable stats fields can enter the upload payload',()=>{
 const row=statsPayload('player-1','Farmer',{currency:123.8,level:7,plots:[{crop:'corn'}],inventory:{wheat:100},buildings:{},farm:'private'});
 assert.deepEqual(row,{player_id:'player-1',username:'Farmer',currency:123,level:7});
 assert.equal(statsPayload('p','Farmer',{currency:Infinity,level:NaN}).currency,0);
 assert.equal(statsPayload('p','Farmer',{currency:3e9,level:1}).currency,2147483647);
});
function syncHarness(write){
 let clock=0,id=0;const tasks=new Map(),statuses=[];
 const sync=createStatsSync({getIdentity:()=>({player:{id:'player-1'},profile:{username:'Farmer'}}),write,onStatus:s=>statuses.push(s),now:()=>clock,schedule:(fn,ms)=>{const key=++id;tasks.set(key,{fn,at:clock+ms});return key;},cancel:key=>tasks.delete(key)});
 async function advance(ms){clock+=ms;for(const[key,t]of [...tasks])if(t.at<=clock){tasks.delete(key);t.fn();}for(let n=0;n<8;n++)await Promise.resolve();}
 return {sync,advance,statuses};
}
test('rapid actions coalesce and never issue writes less than four seconds apart',async()=>{
 const writes=[],h=syncHarness(async row=>writes.push(row));
 for(let i=0;i<100;i++)h.sync.queue({currency:i,level:2});await h.advance(250);assert.equal(writes.length,1);assert.equal(writes[0].currency,99);
 h.sync.queue({currency:150,level:3});await h.advance(1000);assert.equal(writes.length,1);h.sync.queue({currency:170,level:3});await h.advance(3000);assert.equal(writes.length,2);assert.equal(writes[1].currency,170);
});
test('offline failure preserves the newest stats and retries on the next update',async()=>{
 const writes=[];let offline=true;const h=syncHarness(async row=>{if(offline)throw new Error('offline');writes.push(row);});
 h.sync.queue({currency:50,level:1});await h.advance(250);assert(h.sync.pending);assert(h.statuses.includes('offline'));await h.advance(10000);assert.equal(writes.length,0);
 offline=false;h.sync.queue({currency:80,level:2});await h.advance(250);assert.equal(writes.length,1);assert.equal(writes[0].currency,80);assert(!h.sync.pending);
});
test('changes made during a pending request are sent as the next snapshot',async()=>{
 const writes=[];let finish;const h=syncHarness(row=>{writes.push(row);if(writes.length===1)return new Promise(resolve=>{finish=resolve;});return Promise.resolve();});
 h.sync.queue({currency:15,level:1});await h.advance(250);h.sync.queue({currency:45,level:2});finish();await h.advance(4000);await h.advance(250);assert.equal(writes.length,2);assert.equal(writes[1].currency,45);
});
test('leaderboard asks for twenty ranked stats and computes own rank outside the list',async()=>{
 const calls=[];let i=0;const responses=[{data:[{player_id:'other',username:'Other',currency:500,level:3}],error:null},{data:{player_id:'self',username:'Farmer',currency:100,level:2},error:null},{count:21,error:null}];
 const client={from(table){const n=i++,query={};calls.push({table,steps:[]});for(const name of ['select','order','limit','eq','maybeSingle','gt'])query[name]=(...args)=>{calls[n].steps.push([name,...args]);return query;};query.then=resolve=>Promise.resolve(responses[n]).then(resolve);return query;}};
 const result=await fetchLeaderboard(client,'self');assert.equal(result.rank,22);assert.equal(result.own.player_id,'self');assert(calls[0].steps.some(x=>x[0]==='limit'&&x[1]===20));assert(calls[0].steps.some(x=>x[0]==='order'&&x[1]==='currency'&&x[2].ascending===false));assert(calls.every(x=>x.table==='player_stats'));
});
