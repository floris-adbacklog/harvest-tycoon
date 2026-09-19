import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {normalizeFarm,applyFarmAction as act,marketQuote,marketValue,marketHighlights,dailyOrders,utcDay,DAY_MS,ITEMS,CROPS,PRODUCTS,xpForLevel,DELIVERY_TIERS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,19,12);
test('daily quotes stay fixed within a UTC day, vary by day and respect every item range',()=>{
 const oilPrices=new Set();let normalDays=0;
 for(let d=0;d<365;d++)for(const item of Object.keys(ITEMS)){
  const time=now+d*DAY_MS,q=marketQuote(item,time);
  assert.equal(q.price,marketQuote(item,time+1000).price);assert.equal(q.price,marketQuote(item,time-11*3600000).price);
  assert.ok(Number.isInteger(q.price)&&q.price>=q.min&&q.price<=q.max);assert.equal(q.day,utcDay(time));
  if(CROPS[item]&&!CROPS[item].perennial)assert.ok(q.price>CROPS[item].cost);
  if(item==='oil'){assert.equal(q.min,640);assert.equal(q.max,2560);oilPrices.add(q.price);if(Math.abs(q.change)<=20)normalDays++;}
 }
 assert.ok(oilPrices.has(640)&&oilPrices.has(2560)&&oilPrices.size>10);assert.ok(normalDays>150);
 assert.throws(()=>marketQuote('__proto__',now),/valid/);
});
test('forecast is derived from tomorrow, and does not depend on player stock or local timezone',()=>{
 const h=marketHighlights(now),tomorrow=marketQuote(h.tomorrow.item,now+DAY_MS);
 assert.deepEqual(h.tomorrow,tomorrow);assert.equal(h.today.price,marketQuote(h.today.item,now).price);
 const s=createFarm(now);s.inventory.oil=1000;s.xp=1000000;assert.deepEqual(marketHighlights(now),h);
 const midnight=Date.UTC(2026,8,20);assert.equal(marketQuote('oil',midnight-1).resetsAt,midnight);assert.equal(marketQuote('oil',midnight).day,'2026-09-20');
});
test('single and atomic category sales use daily prices, preserve other stock and boost once',()=>{
 const s=createFarm(now);for(const k in s.inventory)s.inventory[k]=0;s.inventory.oil=2;s.inventory.milk=3;s.inventory.wheat=5;
 s.boosts.coinsUntil=now+10000;const before=s.coins,expected=marketValue({oil:2,milk:3},now)*2;
 const r=act(s,{type:'sell',category:'goods',day:utcDay(now),coins:999999},now);
 assert.equal(r.coins,expected);assert.equal(s.coins,before+expected);assert.equal(s.stats.earned,expected);assert.equal(s.inventory.oil,0);assert.equal(s.inventory.milk,0);assert.equal(s.inventory.wheat,5);
 const snapshot=structuredClone(s);assert.throws(()=>act(s,{type:'sell',category:'goods',day:utcDay(now)},now),/empty/);assert.deepEqual(s,snapshot);
 const wheat=act(s,{type:'sell',item:'wheat',day:utcDay(now)},now+10000);assert.equal(wheat.coins,5*marketQuote('wheat',now).price);
});
test('stale sale quotes reject before consuming goods, forged prices cannot affect payout',()=>{
 const s=createFarm(now);s.inventory.oil=2;const before=s.coins;
 assert.throws(()=>act(s,{type:'sell',item:'oil',day:utcDay(now)},now+DAY_MS),/refreshed/);assert.equal(s.inventory.oil,2);assert.equal(s.coins,before);
 assert.throws(()=>act(s,{type:'sell',category:'private'},now+DAY_MS),/category/);
 const r=act(s,{type:'sell',item:'oil',day:utcDay(now+DAY_MS),price:99999999},now+DAY_MS);assert.equal(r.coins,2*marketQuote('oil',now+DAY_MS).price);
});
test('every fresh board has three tiers; commissions scale, and daily rewards exceed current market',()=>{
 const seenBonus=new Set(),seenCommissions=new Set();
 for(const level of [1,4,8,12,25])for(let day=0;day<30;day++){
  const t=now+day*DAY_MS,s=createFarm(t-DAY_MS);s.xp=xpForLevel(level);const orders=dailyOrders(s,t);
  assert.deepEqual(orders.map(o=>o.tier),['quick','village','commission']);assert.equal(new Set(orders.map(o=>o.title)).size,3);
  for(const o of orders){
   const tier=DELIVERY_TIERS[o.tier];assert.ok(o.minLevel<=level);assert.ok(o.bonus>=tier.minBonus&&o.bonus<=tier.maxBonus);
   assert.equal(o.marketValue,marketValue(o.input,t));assert.equal(o.coins,Math.ceil(o.marketValue*(100+o.bonus)/100));assert.ok(o.coins>o.marketValue);
   assert.ok(o.xp>0);assert.equal('reputation' in o,false);
  }
  assert.equal(orders[0].diamonds,1);assert.ok(orders[1].diamonds>=3&&orders[1].diamonds<=5);assert.ok(orders[2].diamonds>=8&&orders[2].diamonds<=18);
  assert.ok(orders[2].coins>orders[0].coins);assert.ok(Object.keys(orders[2].input).length>=3);assert.ok(Object.keys(orders[2].input).every(k=>PRODUCTS[k]));
  seenBonus.add(orders[2].bonus);seenCommissions.add(orders[2].title);
  const copy=JSON.parse(JSON.stringify(s));copy.xp+=100000;assert.deepEqual(dailyOrders(copy,t+5000),orders);
 }
 assert.equal(seenCommissions.size,8);assert.ok(seenBonus.size>10);
});
test('existing boards keep ingredients, payouts and completed IDs until the next reset',()=>{
 const s=createFarm(now);s.daily.orderBoard=[{title:'Existing order',input:{oil:1},coins:2240,xp:65,diamonds:3,minLevel:8}];s.daily.orders=[0];
 const snapshot=structuredClone(s.daily);normalizeFarm(s,now);assert.deepEqual(s.daily,snapshot);assert.equal(dailyOrders(s,now)[0].done,true);
 const next=dailyOrders(s,now+DAY_MS);assert.deepEqual(next.map(o=>o.tier),['quick','village','commission']);assert.ok(next.every(o=>!o.done));
});
test('commissions consume goods and award only server-quoted coins, XP and diamonds once',()=>{
 const s=createFarm(now),o=dailyOrders(s,now)[2];Object.assign(s.inventory,o.input);s.boosts.coinsUntil=now+60000;s.boosts.xpUntil=now+60000;
 const before=structuredClone(s),r=act(s,{type:'delivery',id:o.id,day:utcDay(now),diamonds:99999,coins:99999},now);
 assert.equal(r.coins,o.coins*2);assert.equal(r.xp,o.xp*2);assert.equal(r.diamonds,o.diamonds);assert.equal(s.diamonds,before.diamonds+o.diamonds);
 assert.equal(s.stats.deliveries,before.stats.deliveries+1);assert.equal(s.stats.crafted_deliveries,before.stats.crafted_deliveries+1);
 for(const k in o.input)assert.equal(s.inventory[k],0);
 const completed=structuredClone(s);assert.throws(()=>act(s,{type:'delivery',id:o.id,day:utcDay(now)},now),/already/);assert.deepEqual(s,completed);
 assert.throws(()=>act(s,{type:'delivery',id:o.id,day:utcDay(now)},now+DAY_MS),/refreshed/);assert.equal(s.diamonds,completed.diamonds);
});
