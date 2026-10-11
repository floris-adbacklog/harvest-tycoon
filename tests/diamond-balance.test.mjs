import test from 'node:test';
import assert from 'node:assert/strict';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,dailyTasks,utcDay,DAY_MS,BOOSTS,DAILY_DIAMONDS,xpForLevel,familyWeek,familyWeekStart,normalizeFarm,VILLAGE_CRATE_DIAMONDS,VILLAGE_REQUEST_WAIT,
 BOAT_DIAMONDS,BOAT_DIAMOND_TRIPS,DEPOT_DIAMONDS,VILLAGE_LANDMARKS} from '../game/farm-state.js';
const now=Date.UTC(2026,8,17,12);
// 7 Oct 2026: 1, 1 and 2 (they were 2, 2 and 4).
test('daily challenges pay 1, 1 and 2 diamonds once, separately from login gifts',()=>{
 const s=createFarm(now);const tasks=dailyTasks(s,now);assert.deepEqual(tasks.map(q=>q.diamonds),[1,1,2]);
 let levelTotal=0;
 for(const q of tasks){
  assert.throws(()=>applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now),/Finish/);
  s.stats[q.stat]=(s.daily.baseline[q.stat]??0)+q.target;
  const before=s.diamonds;const r=applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now);
  const levelDiamonds=r.levelReward?.diamonds??0;levelTotal+=levelDiamonds;assert.equal(r.diamonds,q.diamonds);assert.equal(s.diamonds,before+q.diamonds+levelDiamonds);
  assert.throws(()=>applyFarmAction(s,{type:'daily',id:q.id,day:utcDay(now)},now),/already claimed/);
  assert.equal(s.diamonds,before+q.diamonds+levelDiamonds);
 }
 assert.equal(s.diamonds,4+levelTotal);assert.equal(s.stats.challenge_diamonds,4);assert.equal(s.stats.diamonds_earned,levelTotal,'only level-ups count, the challenge diamonds stay apart');
 assert.throws(()=>applyFarmAction(s,{type:'daily',id:0,day:utcDay(now)},now+DAY_MS),/new day/);
 assert.equal(s.diamonds,4+levelTotal);
});
test('old or manipulated boost quotes never charge a different price',()=>{
 const s=createFarm(now);s.diamonds=1000;
 for(const expectedCost of [undefined,8,0,89,'90']){
  const before=structuredClone(s);
  assert.throws(()=>applyFarmAction(s,{type:'buy_boost',boost:'crops',expectedCost},now),/prices have changed/);
  assert.deepEqual(s,before);
 }
 const r=applyFarmAction(s,{type:'buy_boost',boost:'crops',expectedCost:150},now);
 assert.equal(r.cost,150);assert.equal(s.diamonds,850);
});
test('free beginner diamonds still buy an entry boost; premium boost prices preserve their value',()=>{
 const s=createFarm(now);s.diamonds=20;
 const id=s.plots.findIndex(p=>p.crop&&p.readyAt>now);
 applyFarmAction(s,{type:'finish_crop',id,expectedCost:10},now);assert.equal(s.diamonds,10);
 assert.equal(DAILY_DIAMONDS.reduce((a,b)=>a+b,0)+7*4,68,'a first week of gifts and challenges (136 until 7 Oct 2026)');
 assert.equal(Math.floor(1000/BOOSTS.crops.cost),6);
 const before=structuredClone(s);assert.throws(()=>applyFarmAction(s,{type:'buy_boost',boost:'coins',expectedCost:100},now),/diamonds/);assert.deepEqual(s,before);
});
test('Double XP costs 50 diamonds and rejects the old 25-diamond quote',()=>{
 const s=createFarm(now);s.diamonds=50;
 assert.throws(()=>applyFarmAction(s,{type:'buy_boost',boost:'xp',expectedCost:25},now),/prices have changed/);assert.equal(s.diamonds,50);
 applyFarmAction(s,{type:'buy_boost',boost:'xp',expectedCost:50},now);assert.equal(s.diamonds,0);assert.equal(s.boosts.xpUntil,now+1800000);
});
// World II's market week (Oct 2026): the market crate pays 10 diamonds once a week (Monday to Sunday UTC), however many villagers are
// helped; the village quests pay coins and XP only.
test('the market crate pays 10 diamonds at most once a week',()=>{
 const s=createFarm(now);s.xp=xpForLevel(116);s.coins=1e7;for(const b of Object.values(s.buildings))b.built=true;for(const k of Object.keys(s.inventory))s.inventory[k]=1e6;
 const start=Date.UTC(2026,9,5),weeks={};let t=start;
 while(t<start+14*DAY_MS){
  applyFarmAction(s,{type:'first_look'},t);
  for(const [board,b] of s.village.boards.entries())if(b.request){const before=s.diamonds,r=applyFarmAction(s,{type:'village_deliver',board,request:b.request.id,input:b.request.input},t);
   assert.equal(s.diamonds-before,r.crate+(r.levelReward?.diamonds??0),'the crate and a level-up, nothing else');if(r.crate)weeks[familyWeek(t)]=(weeks[familyWeek(t)]??0)+r.crate;}
  t+=VILLAGE_REQUEST_WAIT;
 }
 assert.deepEqual(Object.values(weeks),[VILLAGE_CRATE_DIAMONDS,VILLAGE_CRATE_DIAMONDS],'one crate in each of the two weeks');
 assert.equal(s.stats.village_requests,14*8*3,'24 villagers a day');assert.equal(s.stats.market_crates,2);
 for(const id of [31,32,33,34]){s.stats.built_villagefields=s.stats.built_canteen=1;s.stats.made_potatoes=200;const before=s.diamonds;applyFarmAction(s,{type:'village_quest',id},t);assert.equal(s.diamonds,before,`quest ${id}`);}
});
// World II's town boat (Oct 2026): 3 diamonds a boat, fewer than the Trade Depot's 5, and only on the first 14 boats of a week (10 Oct 2026),
// so a Monday-to-Sunday week of the village pays at most 52 diamonds (14 boats and the market crate), also with the Stone quay's 6 hours.
test('the town boat pays 3 diamonds on 14 boats a week at most, also 28 boats with the Stone quay: a village week pays at most 52',()=>{
 assert.ok(BOAT_DIAMONDS===3&&BOAT_DIAMONDS<DEPOT_DIAMONDS);assert.equal(BOAT_DIAMOND_TRIPS*BOAT_DIAMONDS+VILLAGE_CRATE_DIAMONDS,52);
 for(const quay of [false,true]){
  const s=createFarm(now);s.xp=xpForLevel(200);s.coins=1e8;for(const b of Object.values(s.buildings))b.built=true;for(const k of Object.keys(s.inventory))s.inventory[k]=1e7;
  s.village={serial:0,boards:[],landmarks:{done:quay?Object.keys(VILLAGE_LANDMARKS).slice(0,3):[],given:{}}};
  const weeks={},boats={},add=(t,n)=>{const w=familyWeek(t);weeks[w]=(weeks[w]??0)+n;};
  // A look at the farm every 10 minutes for two weeks from a Thursday: every boat loaded and every villager helped as soon as they come.
  for(let t=now;t<now+14*DAY_MS;t+=600000){
   normalizeFarm(s,t);const c=s.village.boat.cargo;
   if(c){const r=applyFarmAction(s,{type:'boat_load',cargo:c.id,input:c.input},t);assert.ok(r.sailed);add(t,r.diamonds);boats[familyWeek(t)]=(boats[familyWeek(t)]??0)+1;}
   for(const [board,b] of s.village.boards.entries())if(b.request)add(t,applyFarmAction(s,{type:'village_deliver',board,request:b.request.id,input:b.request.input},t).crate);
  }
  const full=familyWeek(now)+1;   // the one whole week of the two
  assert.equal(new Date(familyWeekStart(full)).getUTCDay(),1);
  assert.deepEqual([boats[full],weeks[full]],[quay?28:14,52],`quay ${quay}`);
  assert.ok(Object.values(weeks).every(n=>n<=52),JSON.stringify(weeks));
 }
});
