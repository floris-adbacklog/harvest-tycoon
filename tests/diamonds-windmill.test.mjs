import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction,DAILY_DIAMONDS,DAY_MS,BOOSTS,upgradeCost,RECIPES,BUILDINGS,MAX_BUILDING_LEVEL,utcDay,dailyOrders,QUESTS,ITEMS,marketQuote} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
const act=(state,action,time=now)=>applyFarmAction(state,action.type==='buy_boost'?{expectedCost:BOOSTS[action.boost]?.cost,...action}:action,time);

test('old farms gain diamonds, boosts and a windmill without losing progress',()=>{
 const state=createFarm(now);delete state.diamonds;delete state.boosts;delete state.buildings.windmill;delete state.inventory.grainmeal;delete state.inventory.fertilizer;state.version=4;
 state.coins=5432;state.buildings.mill.job={recipe:'flour',startedAt:now-5000,readyAt:now+40000};
 const plots=structuredClone(state.plots),job=structuredClone(state.buildings.mill.job);
 normalizeFarm(state,now);assert.equal(state.coins,5432);assert.equal(state.diamonds,0);assert.equal(state.buildings.windmill.level,1);assert.deepEqual(state.plots,plots);assert.equal(state.buildings.mill.job.readyAt,job.readyAt);assert.deepEqual(state.buildings.mill.job.output,{flour:1});
 assert.equal(state.inventory.fertilizer,0);assert.equal(state.boosts.upgradeCredits,0);
});
test('daily diamond rewards cycle, reset and reject repeat claims',()=>{
 const state=createFarm(now);let total=0;
 for(let day=0;day<9;day++){
  const result=act(state,{type:'checkin'},now+day*DAY_MS);total+=DAILY_DIAMONDS[day%7]+(result.levelReward?.diamonds??0);assert.equal(result.diamonds,DAILY_DIAMONDS[day%7]);assert.equal(state.diamonds,total);
  assert.throws(()=>act(state,{type:'checkin'},now+day*DAY_MS),/already collected/);assert.equal(state.diamonds,total);
 }
 const last=act(state,{type:'checkin'},now+11*DAY_MS);assert.equal(state.login.streak,1);assert.equal(state.diamonds,total+DAILY_DIAMONDS[0]+(last.levelReward?.diamonds??0));
});
test('XP and coin boosts persist, multiply eligible rewards once and expire',()=>{
 let state=createFarm(now);state.diamonds=BOOSTS.xp.cost+BOOSTS.coins.cost;act(state,{type:'buy_boost',boost:'xp'});act(state,{type:'buy_boost',boost:'coins'});
 state=normalizeFarm(JSON.parse(JSON.stringify(state)),now);const before=state.xp;const harvested=act(state,{type:'field',id:0,action:'harvest'});assert.equal(harvested.xp,10);assert.equal(state.xp-before,10);
 state.inventory.wheat=10;assert.equal(act(state,{type:'sell',item:'wheat'}).coins,marketQuote('wheat',now).price*20);
 const order=dailyOrders(state,now)[0];Object.assign(state.inventory,order.input);const delivery=act(state,{type:'delivery',id:order.id,day:utcDay(now)});assert.equal(delivery.coins,order.coins*2);assert.equal(delivery.xp,order.xp*2);
 const gift=act(state,{type:'checkin'});assert.equal(gift.coins,40);assert.equal(gift.diamonds,4);
 const balance=state.diamonds;assert.throws(()=>act(state,{type:'buy_boost',boost:'xp'}),/Already active/);assert.equal(state.diamonds,balance);
 state.inventory.wheat=10;assert.equal(act(state,{type:'sell',item:'wheat'},now+BOOSTS.coins.duration).coins,marketQuote('wheat',now+BOOSTS.coins.duration).price*10);
 assert.equal(act(state,{type:'field',id:1,action:'harvest'},now+BOOSTS.xp.duration).xp,5);
});
test('instant boosts affect existing work only and never pay twice',()=>{
 const state=createFarm(now);state.diamonds=BOOSTS.crops.cost+BOOSTS.production.cost;
 state.plots[4].watered=true;state.plots[4].tended=true;
 act(state,{type:'buy_boost',boost:'crops'});assert(state.plots.every(p=>!p.crop||p.readyAt<=now));assert.equal(state.plots[8].crop,null);
 const amount=state.diamonds;assert.throws(()=>act(state,{type:'buy_boost',boost:'crops'}),/No crops/);assert.equal(state.diamonds,amount);
 const harvest=act(state,{type:'field',id:4,action:'harvest'});assert.equal(harvest.quantity,3);
 state.inventory.grainmeal=3;state.inventory.corn=2;act(state,{type:'produce',recipe:'feed'});act(state,{type:'produce',recipe:'windflour'});
 assert.equal(act(state,{type:'buy_boost',boost:'production'}).affected,2);
 act(state,{type:'collect',building:'mill'});act(state,{type:'collect',building:'windmill'});assert.equal(state.inventory.flour,14);
 assert.throws(()=>act(state,{type:'collect',building:'windmill'}),/Nothing to collect/);
});
test('upgrade voucher applies once and survives a rejected upgrade',()=>{
 const state=createFarm(now);state.diamonds=BOOSTS.upgrade.cost;const originalCost=upgradeCost(state,'windmill');act(state,{type:'buy_boost',boost:'upgrade'});
 assert.equal(upgradeCost(state,'windmill'),Math.ceil(originalCost/2));state.coins=0;
 assert.throws(()=>act(state,{type:'upgrade',building:'windmill'}),/need/);assert.equal(state.boosts.upgradeCredits,1);
 state.coins=10000;const result=act(state,{type:'upgrade',building:'windmill'});assert.equal(result.cost,Math.ceil(originalCost/2));assert.equal(state.boosts.upgradeCredits,0);
 const before=state.diamonds;state.diamonds=0;assert.throws(()=>act(state,{type:'buy_boost',boost:'upgrade'}),/diamonds/);assert.equal(state.diamonds,0);state.diamonds=before;
 for(const key of Object.keys(BUILDINGS))state.buildings[key].level=MAX_BUILDING_LEVEL;
 assert.throws(()=>act(state,{type:'buy_boost',boost:'upgrade'}),/maximum level/);
});
test('windmill has a complete grain-to-fertilizer chain and useful one-time crop care',()=>{
 const state=createFarm(now);state.inventory.wheat=8;state.inventory.barley=4;state.inventory.cabbage=2;
 act(state,{type:'produce',recipe:'grainmeal'});const mealTime=now+RECIPES.grainmeal.duration;act(state,{type:'collect',building:'windmill'},mealTime);assert.equal(state.inventory.grainmeal,3);
 act(state,{type:'produce',recipe:'fertilizer'},mealTime);const fertilizerTime=mealTime+RECIPES.fertilizer.duration;
 act(state,{type:'collect',building:'windmill'},fertilizerTime);assert.equal(state.inventory.fertilizer,3);assert.equal(state.inventory.grainmeal,1);
 const before=state.plots[5].readyAt;const result=act(state,{type:'fertilize',id:5},fertilizerTime);assert.equal(result.saved,Math.floor((before-fertilizerTime)*.35));assert.equal(state.plots[5].readyAt,before-result.saved);assert.equal(state.inventory.fertilizer,2);
 assert.throws(()=>act(state,{type:'fertilize',id:5},fertilizerTime),/already been fertilized/);assert.equal(state.inventory.fertilizer,2);
 assert.throws(()=>act(state,{type:'fertilize',id:8},fertilizerTime),/still growing/);
 act(state,{type:'field',id:5,action:'harvest'},before);act(state,{type:'field',id:5,action:'plant',crop:'wheat'},before);assert.equal(state.plots[5].fertilized,false);
});
test('real money purchasing is not an available farm action',()=>{
 const state=createFarm(now),before=structuredClone(state);
 assert.throws(()=>act(state,{type:'buy_diamonds',amount:1000}),/Unknown farm action/);assert.deepEqual(state,before);
 assert.throws(()=>act(state,{type:'buy_boost',boost:'__proto__'}),/valid boost/);assert.deepEqual(state,before);
});
test('the full Windmill-to-Bakery chain produces fresh goods with a higher margin',()=>{
 const state=createFarm(now);state.inventory.wheat=16;state.inventory.barley=8;state.inventory.milk=2;state.inventory.pumpkin=2;state.inventory.eggs=2;
 let time=now;
 for(const recipe of ['grainmeal','flour','flour','bread','pie']){
  act(state,{type:'produce',recipe},time);time=state.buildings[RECIPES[recipe].building].job.readyAt;
  act(state,{type:'collect',building:RECIPES[recipe].building},time);
 }
 assert.equal(state.inventory.bread,2);assert.equal(state.inventory.pie,1);assert.equal(state.inventory.flour,2);
 assert.equal(act(state,{type:'sell',item:'bread'},time).coins,marketQuote('bread',time).price*2);assert.equal(act(state,{type:'sell',item:'pie'},time).coins,marketQuote('pie',time).price);
 for(const id of ['bread','pie']){const r=RECIPES[id];assert(Object.entries(r.output).reduce((n,[k,v])=>n+ITEMS[k].sell*v,0)>Object.entries(r.input).reduce((n,[k,v])=>n+ITEMS[k].sell*v,0));}
});
test('new beta quests retain old IDs and each reward can be collected only once',()=>{
 const state=createFarm(now);state.claimed=[0,1,31];const old=state.claimed.slice();
 assert.equal(QUESTS.length,150);assert.equal(QUESTS[31].title,'A lifelong grower');
 for(let id=32;id<QUESTS.length;id++){
  const q=QUESTS[id];state.stats[q.stat]=q.target;const coins=state.coins;
  const result=act(state,{type:'quest',id});assert.equal(state.coins,coins+q.reward+(result.levelReward?.coins??0));assert.throws(()=>act(state,{type:'quest',id}),/already been claimed/);
 }
 assert(old.every(id=>state.claimed.includes(id)));assert.equal(state.claimed.length,old.length+QUESTS.length-32);
});
test('legacy mill flour keeps its purchased yield and XP after the recipe moves',()=>{
 const state=createFarm(now);state.version=4;state.buildings.mill.job={recipe:'flour',startedAt:now-100000,readyAt:now-1000};
 const result=act(state,{type:'collect',building:'mill'});assert.deepEqual(result.items,{flour:1});assert.equal(result.xp,8);
 assert.equal(RECIPES.flour.building,'windmill');
});
