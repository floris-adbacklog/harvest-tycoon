import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm} from '../public/farm-state.js';
import {createFarmClient} from '../public/farm-client.js';

test('farm actions save locally and reload offline without making a network request',async()=>{
 const store=new Map(),events=[];globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value),removeItem:key=>store.delete(key)};
 globalThis.window=new EventTarget();globalThis.document={body:{dataset:{legacyMigration:'false'}}};window.addEventListener('farm:stats',e=>events.push(e.detail));
 let calls=0;globalThis.fetch=()=>{calls++;throw new Error('Offline');};
 const now=Date.now(),a=createFarm(now),client=createFarmClient(a,{onChange(){},onStatus(){},onError(){}});await client.load();client.runAction({type:'field',id:0,action:'harvest'});client.runAction({type:'sell',item:'corn'});
 const coins=a.coins,xp=a.xp,b=createFarm(now+1000),reopened=createFarmClient(b,{onChange(){},onStatus(){},onError(){}});await reopened.load();assert.equal(b.coins,coins);assert.equal(b.xp,xp);assert.equal(b.plots[0].crop,null);assert.equal(calls,0);
 assert(events.length>=1);assert.deepEqual(Object.keys(events.at(-1)).sort(),['currency','level']);
});
test('an existing cloud farm is read once for migration and is never written back',async()=>{
 const store=new Map();globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,value)};globalThis.window=new EventTarget();globalThis.document={body:{dataset:{legacyMigration:'true'}}};
 const previous=createFarm();previous.coins=12345;previous.inventory.pumpkin=12;let reads=0;
 globalThis.fetch=async(url,options)=>{reads++;assert.equal(url,'/api/farm');assert.equal(options.method,undefined);return {ok:true,json:async()=>({state:previous})};};
 const farm=createFarm(),client=createFarmClient(farm,{onChange(){},onStatus(){},onError(){}});await client.load();assert.equal(farm.coins,12345);assert.equal(farm.inventory.pumpkin,12);client.runAction({type:'sell',item:'pumpkin'});
 const reopened=createFarmClient(createFarm(),{onChange(){},onStatus(){},onError(){}});await reopened.load();assert.equal(reads,1);
});
