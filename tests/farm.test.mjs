import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,CROPS,RECIPES,QUESTS,ITEMS,DAY_MS,DAILY_REWARDS,utcDay,levelReward,levelOf,dailyTasks,dailyOrders,normalizeFarm,marketValue,xpForLevel,STARTER_COINS,STARTER_ITEMS,FIRST_HARVEST_BONUS} from '../game/farm-state.js';
import {readFarm,transactFarm} from '../game/farm-store.js';
const now=Date.UTC(2026,8,16,12);
const apply=(s,a,t=now)=>applyFarmAction(s,a,t);
function database(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(readFileSync(new URL('../drizzle/0000_colorful_gorgon.sql',import.meta.url),'utf8'));
 const prepare=sql=>({bind(...args){return {first:async()=>sqlite.prepare(sql).get(...args)??null,run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}),_sql:sql,_args:args};}});
 return {sqlite,prepare,batch:async statements=>{sqlite.exec('BEGIN');try{const results=statements.map(s=>({meta:{changes:Number(sqlite.prepare(s._sql).run(...s._args).changes)}}));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
}

test('all 16 crops can be planted, watered and harvested; collection is unique',()=>{
 const s=createFarm(now);s.coins=20000;s.xp=xpForLevel(70);
 assert.equal(Object.keys(CROPS).length,16);assert.equal(QUESTS.length,300);
 for(const [crop,c] of Object.entries(CROPS)){
  apply(s,{type:'field',id:8,action:'plant',crop});apply(s,{type:'field',id:8,action:'water'},now+1000);
  assert.throws(()=>apply(s,{type:'field',id:8,action:'harvest'},now+1000),/Still growing/);
  apply(s,{type:'field',id:8,action:'harvest'},now+c.duration);
  assert.throws(()=>apply(s,{type:'field',id:8,action:'harvest'},now+c.duration),/Plant a crop|Still growing/);
  if(c.perennial)apply(s,{type:'clear_planting',id:8,expectedPlantedAt:s.plots[8].plantedAt},now+c.duration);
  assert.equal(s.stats['harvest_'+crop],2);
 }
 assert.equal(s.stats.varieties,16);assert.equal(s.discovered.length,16);
});
test('all 53 recipes require ingredients, persist timed jobs and collect once',()=>{
 const ordinary=Object.entries(RECIPES).filter(([,r])=>r.building!=='factory');   // the Factory's bulk versions have their own tests
 assert.equal(ordinary.length,53);
 for(const [id,r]of ordinary){
  const s=createFarm(now);s.xp=xpForLevel(90);s.coins=100000;for(const b of Object.values(s.buildings))b.built=true;for(const k of Object.keys(s.inventory))s.inventory[k]=0;
  normalizeFarm(s,now);   // what every load does: at level 90 the Valley Market's stalls, the export trailer and the fair fill up
  const before=structuredClone(s);
  assert.throws(()=>apply(s,{type:'produce',recipe:id}),/Missing ingredients/);assert.deepEqual(s,before);
  Object.assign(s.inventory,r.input);apply(s,{type:'produce',recipe:id});
  const restored=JSON.parse(JSON.stringify(s));
  assert.throws(()=>apply(restored,{type:'collect',building:r.building}),/still being made/);
  const result=apply(restored,{type:'collect',building:r.building},now+r.duration);
  assert.deepEqual(result.items,r.output);assert.equal(restored.stats.produced,1);
  assert.throws(()=>apply(restored,{type:'collect',building:r.building},now+r.duration),/Nothing to collect/);
 }
});
test('login gifts cross UTC boundaries, cannot repeat, stay at day 7 and reset without losing farm',()=>{
 const s=createFarm(now);for(let i=0;i<8;i++){
  const result=apply(s,{type:'checkin'},now+i*DAY_MS);assert.equal(result.coins,DAILY_REWARDS[Math.min(i,6)]);assert.equal(result.streak,i+1);
  const balance=s.coins;assert.throws(()=>apply(s,{type:'checkin'},now+i*DAY_MS),/already collected/);assert.equal(s.coins,balance);
 }
 const plots=structuredClone(s.plots),balance=s.coins;
 const late=apply(s,{type:'checkin'},now+10*DAY_MS);assert.equal(s.login.streak,1);assert.equal(s.login.best,8);assert.deepEqual(s.plots,plots);assert.equal(s.coins,balance+40+(late.levelReward?.coins??0));
 const midnight=Date.UTC(2026,8,30),b=createFarm(midnight-1);apply(b,{type:'checkin'},midnight-1);apply(b,{type:'checkin'},midnight);assert.equal(b.login.streak,2);
});
test('daily progress starts today, all-three bonus pays once, old claims fail',()=>{
 const s=createFarm(now),day=utcDay(now);s.stats.harvested=500;
 normalizeFarm(s,now+DAY_MS);assert.equal(dailyTasks(s,now+DAY_MS).find(q=>q.stat==='harvested')?.progress??0,0);
 for(const q of dailyTasks(s,now+DAY_MS))s.stats[q.stat]=(s.daily.baseline[q.stat]??0)+q.target;
 const initial=s.coins,qs=dailyTasks(s,now+DAY_MS);
 let levels=0;for(const q of qs)levels+=apply(s,{type:'daily',id:q.id,day:utcDay(now+DAY_MS)},now+DAY_MS).levelReward?.coins??0;
 assert.equal(s.coins,initial+qs.reduce((n,q)=>n+q.reward,0)+60+levels);
 assert.throws(()=>apply(s,{type:'daily',id:0,day},now+DAY_MS),/new day/);
 assert.throws(()=>apply(s,{type:'daily',id:0,day:utcDay(now+DAY_MS)},now+DAY_MS),/already claimed/);
 assert.equal(s.stats.dailies,3);normalizeFarm(s,now+2*DAY_MS);assert.equal(s.daily.claimed.length,0);
});
test('delivery pays above market, consumes inventory and rejects duplicate or stale orders',()=>{
 for(let day=0;day<7;day++){
  const t=now+day*DAY_MS,s=createFarm(t),o=dailyOrders(s,t)[0];
  assert(o.coins>marketValue(o.input,t));
  Object.assign(s.inventory,o.input);apply(s,{type:'delivery',id:o.id,day:utcDay(t)},t);
  for(const k of Object.keys(o.input))assert.equal(s.inventory[k],0);
  assert.throws(()=>apply(s,{type:'delivery',id:o.id,day:utcDay(t)},t),/already delivered/);
  assert.throws(()=>apply(s,{type:'delivery',id:o.id,day:utcDay(t)},t+DAY_MS),/refreshed/);
 }
});
test('tractor charges per eligible field, cooldown holds; silo changes only future planting',()=>{
 const s=createFarm(now),n=s.plots.filter(p=>!p.crop).length,balance=s.coins;
 const r=apply(s,{type:'tractor',mode:'plant',crop:'corn'});assert.equal(r.count,n);assert.equal(s.coins,balance-n*CROPS.corn.cost-12-2*n);
 assert.throws(()=>apply(s,{type:'tractor',mode:'water'}),/ready in/);
 apply(s,{type:'tractor',mode:'water'},now+15000);
 s.coins=10000;s.xp=xpForLevel(20);const existing=structuredClone(s.plots[8]);apply(s,{type:'silo_upgrade'});assert.deepEqual(s.plots[8],existing);
 apply(s,{type:'field',id:8,action:'harvest'},now+DAY_MS);apply(s,{type:'field',id:8,action:'plant',crop:'pumpkin'},now+DAY_MS);
 assert.equal(s.plots[8].readyAt-s.plots[8].plantedAt,CROPS.pumpkin.duration*.9);
 s.coins=100000;for(let i=0;i<4;i++)apply(s,{type:'silo_upgrade'});assert.throws(()=>apply(s,{type:'silo_upgrade'}),/complete/);
});
test('D1 saves survive reload, isolate users and replay network retries exactly once',async()=>{
 const db=database(),a=await readFarm(db,'alice',now);assert.equal(a.state.coins,STARTER_COINS);
 const first=await transactFarm(db,'alice','request-111111111',[{type:'checkin'},{type:'field',id:0,action:'harvest'}],now);
 const second=await transactFarm(db,'alice','request-111111111',[{type:'checkin'},{type:'field',id:0,action:'harvest'}],now+1000);
 assert(second.replayed);assert.deepEqual(second.state,first.state);assert.equal(second.revision,first.revision);
 const reload=await readFarm(db,'alice',now+2000);assert.deepEqual(reload.state,first.state);
 const bob=await readFarm(db,'bob',now);assert.equal(bob.state.coins,STARTER_COINS);assert.equal(bob.state.inventory.corn,STARTER_ITEMS.corn);
 db.sqlite.close();
});
test('simultaneous saves retain both actions and racing gift requests award once',async()=>{
 const db=database();await readFarm(db,'farmer',now);
 await Promise.all([transactFarm(db,'farmer','request-A11111111',[{type:'field',id:0,action:'harvest'}],now),transactFarm(db,'farmer','request-B11111111',[{type:'field',id:1,action:'harvest'}],now)]);
 const s=await readFarm(db,'farmer',now);assert.equal(s.state.inventory.corn,STARTER_ITEMS.corn+FIRST_HARVEST_BONUS+1,'the first harvest is a golden one');assert.equal(s.state.stats.harvested,2);
 await Promise.all([transactFarm(db,'farmer','request-C11111111',[{type:'checkin'}],now),transactFarm(db,'farmer','request-D11111111',[{type:'checkin'}],now)]);
 const end=await readFarm(db,'farmer',now);assert.equal(levelOf(end.state),2);assert.equal(end.state.coins,STARTER_COINS+40+levelReward(2).coins);assert.equal(end.state.login.visits,1);
 const failed=await transactFarm(db,'farmer','request-E11111111',[{type:'produce',recipe:'__proto__'},{type:'field',id:999,action:'harvest'}],now);
 assert(failed.results.every(r=>!r.ok));assert.deepEqual(failed.state,end.state);db.sqlite.close();
});
