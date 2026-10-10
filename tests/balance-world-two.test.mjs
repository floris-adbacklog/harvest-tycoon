import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,itemAvailable,recipeValue,marketSaleValue,marketValue,
 villageRequestValue,villageBoards,villageRequestExtra,villagerLine,villageSquareReady,
 BUILDINGS,RECIPES,RECIPE_LEVELS,ITEMS,VILLAGE_GOODS,MAX_BUILDING_LEVEL,VILLAGERS,VILLAGE_FARM_GOODS,VILLAGE_NEVER_ASKED,VILLAGE_REQUEST_WAIT,VILLAGE_PREMIUM,VILLAGE_XP_SHARE,
 VILLAGE_THIRD_BOARD,VILLAGE_REQUEST_BOARDS,VILLAGE_REQUEST_BOARDS_MAX,villageGood,worldTwoBuilding} from '../game/farm-state.js';

// World II's balance (Oct 2026, the owner's plan for levels 100-200): the village's recipes pay XP like the farm's late recipes, and the
// villagers at the market square ask for what the farm can make, worth what the plan says, paid exactly as shown.
const now=Date.parse('2026-10-05T12:00:00Z'),HOUR=3600000,DAY=24*HOUR;
const PLACES=['mine','lumbercamp','smithy','villagemill'];
const act=(s,a,t=now)=>applyFarmAction(s,a,t);
// Plenty of everything a villager may ask for.
const plenty=n=>Object.fromEntries([...Object.keys(VILLAGE_GOODS),...VILLAGE_FARM_GOODS].map(k=>[k,n]));
// Every farm building built and at level 10, the listed village places built, and only the stock given: the market square's first boards.
function fixture(level,places,stock={},mode='guided'){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 if(mode==='legacy')s.progression={mode:'legacy'};
 for(const [k,b] of Object.entries(s.buildings)){if(worldTwoBuilding(k))b.built=places.includes(k);else{b.built=true;if(BUILDINGS[k].type==='production')b.level=MAX_BUILDING_LEVEL;}}
 normalizeFarm(s,now);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,stock);
 s.village={serial:0,boards:[]};return normalizeFarm(s,now);
}
// Says "Not now" to every villager and looks again 3 hours later, `rounds` times; calls check(request, farm) for every request seen.
function sweep(s,rounds,check){
 let t=now;
 for(let i=0;i<rounds;i++){
  for(const b of s.village.boards){if(b.request)check(b.request,s);b.request=null;b.readyAt=t;}
  t+=VILLAGE_REQUEST_WAIT;normalizeFarm(s,t);
 }
}

test('village XP stays at 30 an hour, and per coin added never above the farm\'s best recipe of levels 54-99',()=>{
 const perCoins=id=>RECIPES[id].xp/recipeValue(id).added*100;
 const farm=Object.keys(RECIPES).filter(id=>RECIPE_LEVELS[id]>=54&&RECIPE_LEVELS[id]<=99);
 const best=Math.max(...farm.map(perCoins));assert.ok(best>14&&best<14.3,`about 14.15 (goat browse), got ${best}`);
 const village=Object.keys(RECIPES).filter(id=>worldTwoBuilding(RECIPES[id].building));
 assert.equal(village.length,10);
 for(const id of village){
  const r=RECIPES[id];
  assert.ok(r.xp/(r.duration/HOUR)<=31,`${id}: ${r.xp/(r.duration/HOUR)} XP an hour`);
  assert.ok(perCoins(id)<=best,`${id}: ${perCoins(id).toFixed(2)} XP per 100 coins added`);
 }
 assert.equal(RECIPES.smeltiron.xp,20,'smelting iron adds little value, so 20 (30 would be 19.7 per 100 coins)');
});

test('a later recipe in the same village place pays at least as well an hour',()=>{
 // These three already paid less than an earlier recipe of their place when they were added (30 Sep 2026): digging deep 328 an hour
 // against 875 for silver, silver bars 384 and master tools 542 against 1,136 for pickaxes. They are what silver and rubies need.
 const OLDER=['digdeep','smeltsilver','mastertools'];
 const hourly=id=>recipeValue(id).added/(RECIPES[id].duration/HOUR);
 for(const place of PLACES){
  const list=Object.keys(RECIPES).filter(id=>RECIPES[id].building===place);
  for(const id of list){
   const before=list.filter(x=>RECIPE_LEVELS[x]<RECIPE_LEVELS[id]);if(!before.length)continue;
   const top=Math.max(...before.map(hourly));
   if(OLDER.includes(id))assert.ok(hourly(id)<top,`${id} is no exception any more: take it off the list`);
   else assert.ok(hourly(id)>=top,`${id} pays ${hourly(id)} an hour, less than ${top}`);
  }
 }
});

test('two villagers until level 103, three from 104: the third has a request at once',()=>{
 assert.deepEqual([VILLAGE_REQUEST_BOARDS,VILLAGE_REQUEST_BOARDS_MAX,VILLAGE_THIRD_BOARD],[2,3,104]);
 const s=fixture(103,['mine','lumbercamp','smithy']);
 assert.equal(villageBoards(s),2);assert.equal(s.village.boards.length,2);assert.ok(s.village.boards.every(b=>b.request));
 s.xp=xpForLevel(104);normalizeFarm(s,now);
 assert.equal(s.village.boards.length,3);assert.equal(s.village.boards[2].request.id,3);assert.equal(s.village.serial,3);
});

test('every request: worth about its target, paid half again and a 50th in XP, two kinds the farm can make, one of them the village\'s',()=>{
 const stocks=[{},{cheese:100,stone:300},{ironbar:10},{wool:500,cheese:500,candles:100,cider:100}];
 let seen=0,single=0;
 for(const mode of ['guided','legacy'])for(const [i,level] of [100,110,130,180].entries()){
  const s=fixture(level,PLACES,stocks[i],mode),target=villageRequestValue(level),ids=new Set();
  sweep(s,480,r=>{   // 60 days of "Not now"
   seen++;const keys=Object.keys(r.input),at=`${mode} ${level} ${JSON.stringify(r.input)}`;
   assert.ok(r.value/target>=.8&&r.value/target<=1.25,`${at}: ${r.value} for ${target}`);
   assert.equal(r.coins,Math.ceil(r.value*VILLAGE_PREMIUM),at);assert.equal(r.xp,Math.round(r.value/VILLAGE_XP_SHARE),at);
   assert.ok(keys.length>=1&&keys.length<=2,at);if(keys.length===1)single++;
   assert.ok(keys.some(villageGood),at);assert.ok(keys.filter(k=>VILLAGE_FARM_GOODS.includes(k)).length<=1,at);
   assert.ok(keys.every(k=>!VILLAGE_NEVER_ASKED.includes(k)&&itemAvailable(s,k)),at);
   assert.ok(!ids.has(r.id),`${at}: id ${r.id} again`);ids.add(r.id);
   assert.ok(VILLAGERS[r.villager]?.lines.length,at);assert.equal(villagerLine(r),VILLAGERS[r.villager].lines[r.id%VILLAGERS[r.villager].lines.length]);
  });
 }
 assert.ok(seen>9000,`${seen} requests`);assert.ok(single<seen/20,'two kinds, one only when no second good fits');
 assert.deepEqual([100,104,110,120,130,150,180,200].map(villageRequestValue),[4000,4800,6000,8000,10000,14000,20000,20000]);
});

test('villagers ask only for what the places built make: a farm with only the Mine never sees logs, planks, bars, pickaxes or silver',()=>{
 for(const mode of ['guided','legacy']){
  const s=fixture(110,['mine'],{},mode),asked=new Set();
  sweep(s,120,r=>Object.keys(r.input).forEach(k=>asked.add(k)));
  for(const k of ['timber','plank','ironbar','pickaxe','silverore','silverbar','gemstone','heirloomflour','mastertools'])assert.ok(!asked.has(k),`${mode}: ${k}`);
  assert.ok(asked.has('stone')&&asked.has('ironore')&&asked.has('packedlunch'),mode);
 }
});

test('one line is something the farm has at least half of in stock, when it has any; with nothing in stock a village good comes first',()=>{
 const s=fixture(110,PLACES,{stone:300});let n=0;
 sweep(s,160,r=>{n++;assert.ok(Object.entries(r.input).some(([k,count])=>s.inventory[k]>=Math.ceil(count/2)),JSON.stringify(r.input));});
 assert.ok(n>=480);
 const empty=fixture(110,PLACES);
 sweep(empty,160,r=>assert.ok(villageGood(Object.keys(r.input)[0]),JSON.stringify(r.input)));
});

test('the same farm always gets the same villagers: the game and the server agree; the plan\'s level-101 example',()=>{
 const s=fixture(130,PLACES,{ironbar:10});
 const a=structuredClone(s),b=structuredClone(s);a.village={serial:0,boards:[]};b.village={serial:0,boards:[]};
 normalizeFarm(a,now);normalizeFarm(b,now);assert.deepEqual(a.village,b.village);assert.deepEqual(a.village,s.village);
 // The plan's own example: at level 101, with the Mine and the Lumber Camp, 10 lunches and 40 iron ore, the first villager asks 6 lunches and
 // 28 iron ore and pays 6,270 coins and 84 XP. It is the mine foreman: the lunches come from the farm's own Kitchen.
 for(const mode of ['guided','legacy']){
  const f=fixture(101,['mine','lumbercamp'],{packedlunch:10,ironore:40},mode);
  assert.deepEqual(f.village.boards[0].request,{id:1,villager:0,input:{packedlunch:6,ironore:28},value:4180,coins:6270,xp:84},mode);
  assert.deepEqual(Object.keys(f.village.boards[0].request.input),['packedlunch','ironore'],'in the order they were picked');
  assert.equal(VILLAGERS[0].name,'The mine foreman');
 }
});

test('Help pays exactly what the villager shows, also with VIP and Double earnings, and counts at the Village market only',()=>{
 const s=fixture(110,PLACES,plenty(1000));
 s.vipExpiresAt=now+DAY;s.boosts.coinsUntil=now+HOUR;
 const r=structuredClone(s.village.boards[0].request),before=structuredClone(s),units=Object.values(r.input).reduce((a,n)=>a+n,0);
 const got=act(s,{type:'village_deliver',board:0,request:r.id,input:Object.fromEntries(Object.entries(r.input).reverse())});
 assert.deepEqual(got,{coins:r.coins,xp:r.xp,villager:VILLAGERS[r.villager].name,readyAt:now+VILLAGE_REQUEST_WAIT});
 assert.equal(s.coins,before.coins+r.coins,'no VIP or Double earnings on top: the shown price');assert.equal(s.xp,before.xp+r.xp);
 for(const [k,n] of Object.entries(r.input))assert.equal(s.inventory[k],before.inventory[k]-n,k);
 assert.deepEqual([s.stats.village_requests,s.stats.village_sold-(before.stats.village_sold??0),s.stats.village_earned-(before.stats.village_earned??0),s.stats.earned-before.stats.earned],[1,units,r.coins,r.coins]);
 assert.equal(s.stats.sold,before.stats.sold,'not the farm Market\'s count');
 for(const k of Object.keys(r.input))assert.equal(s.stats['sold_'+k],before.stats['sold_'+k],k);
 assert.equal(s.village.boards[0].request,null);
 // The XP boost doubles the XP, like every action.
 const x=fixture(110,PLACES,plenty(1000));x.boosts.xpUntil=now+HOUR;
 const q=x.village.boards[1].request;
 const xp=x.xp;act(x,{type:'village_deliver',board:1,request:q.id,input:q.input});assert.equal(x.xp,xp+2*q.xp);
});

test('the next villager comes 3 hours after Help or "Not now"; "Not now" pays nothing',()=>{
 const s=fixture(110,PLACES,plenty(5000));
 const [a,b]=s.village.boards.map(x=>x.request),coins=s.coins,t=now+60000;
 act(s,{type:'village_deliver',board:0,request:a.id,input:a.input},t);
 const skipped=act(s,{type:'village_skip',board:1,request:b.id},t);assert.deepEqual(skipped,{readyAt:t+VILLAGE_REQUEST_WAIT});
 assert.equal(s.coins,coins+a.coins,'only the help paid');assert.equal(s.stats.village_requests,1);
 const serial=s.village.serial;
 normalizeFarm(s,t+VILLAGE_REQUEST_WAIT-1);assert.deepEqual(s.village.boards.slice(0,2).map(x=>x.request),[null,null],'not a minute early');
 normalizeFarm(s,t+VILLAGE_REQUEST_WAIT);
 assert.deepEqual(s.village.boards.slice(0,2).map(x=>x.request.id),[serial+1,serial+2]);assert.equal(s.village.serial,serial+2);
});

test('Help hands over only the goods the farmer saw: refusals for a villager who moved on, other goods and missing goods',()=>{
 const s=fixture(110,PLACES,{stone:300});
 const r=s.village.boards[0].request;
 assert.throws(()=>act(s,{type:'village_deliver',board:0,request:r.id+50,input:r.input}),{message:'This villager has moved on. Look at the market square again.'});
 assert.throws(()=>act(s,{type:'village_deliver',board:5,request:r.id,input:r.input}),{message:'Choose a villager.'});
 assert.throws(()=>act(s,{type:'village_deliver',board:'0',request:r.id,input:r.input}),{message:'Choose a villager.'});
 assert.throws(()=>act(s,{type:'village_deliver',board:0,request:r.id}),/moved on/,'the goods shown come with Help');
 for(const k of Object.keys(s.inventory))s.inventory[k]=0;s.inventory.stone=3;
 const missing='Missing: '+Object.entries(r.input).map(([k,n])=>`${ITEMS[k].name} (${s.inventory[k]}/${n})`).join(', ')+'.';
 assert.match(missing,/Stone \(3\/\d+\)/,'the request asks stone, the farm has 3');
 assert.throws(()=>act(s,{type:'village_deliver',board:0,request:r.id,input:r.input}),{message:missing},'the Valley Market\'s form: Missing: Stone (3/67), …');
 assert.ok(s.village.boards[0].request,'the villager stays');
 // The device filled the same board from other stock (a harvest came in between): same running number, other goods. Help on the
 // device's card is refused and nothing is taken; the farmer sees the server's villager after that.
 const server=fixture(130,PLACES,plenty(10000));
 const device=fixture(130,PLACES,{ironbar:10});
 const [mine,theirs]=[server.village.boards[0].request,device.village.boards[0].request];
 assert.equal(mine.id,theirs.id);assert.notDeepEqual(mine.input,theirs.input,'the fixture shows the case');
 const stock=structuredClone(server.inventory);
 assert.throws(()=>act(server,{type:'village_deliver',board:0,request:theirs.id,input:theirs.input}),/moved on/);
 assert.deepEqual(server.inventory,stock,'nothing handed over');
 assert.throws(()=>act(server,{type:'village_deliver',board:0,request:mine.id,input:{...mine.input,extra:1}}),/moved on/);
 assert.throws(()=>act(server,{type:'village_deliver',board:0,request:mine.id,input:[1]}),/moved on/);
 assert.throws(()=>act(server,{type:'village_skip',board:0,request:mine.id,input:theirs.input}),/moved on/,'"Not now" checks them too when sent');
 act(server,{type:'village_deliver',board:0,request:mine.id,input:Object.fromEntries(Object.entries(mine.input).reverse())});
 assert.equal(server.stats.village_requests,1,'in any key order: a save reorders them');
});

test('at most 24 villagers a day: three boards, one every 3 hours each, however much is in stock',()=>{
 const s=fixture(110,PLACES,plenty(1e6));
 let t=now,helped=0;
 while(t<now+DAY){
  normalizeFarm(s,t);
  s.village.boards.forEach((b,i)=>{if(b.request){act(s,{type:'village_deliver',board:i,request:b.request.id,input:b.request.input},t);helped++;}});
  t=Math.min(...s.village.boards.map(b=>b.readyAt));
 }
 assert.equal(helped,24);
});

test('no Kitchen, no villager: the board waits and the running number stays',()=>{
 for(const mode of ['guided','legacy']){
  const s=fixture(100,[],{},mode);s.buildings.kitchen.built=false;s.village={serial:0,boards:[]};normalizeFarm(s,now);
  assert.deepEqual(s.village,{serial:0,boards:[{request:null,readyAt:0},{request:null,readyAt:0}]},mode);
  assert.equal(villageSquareReady(s),false);
  s.buildings.kitchen.built=true;normalizeFarm(s,now);
  assert.ok(s.village.boards.every(b=>Object.keys(b.request.input).includes('packedlunch')),'lunches and a farm good: money on the first trip');
 }
});

test('"+X% vs market" compares with what the market would pay now, bonuses included, and is left out when it would not be more',()=>{
 const s=fixture(110,PLACES,{stone:300}),r=s.village.boards[0].request;
 const pay=marketSaleValue(s,marketValue(r.input,now),now),extra=villageRequestExtra(s,r,now);
 assert.equal(extra,Math.round((r.coins/pay-1)*100));assert.ok(extra>=30,`${extra}% at the normal price`);
 s.boosts.coinsUntil=now+HOUR;s.vipExpiresAt=now+DAY;
 const boosted=villageRequestExtra(s,r,now),market=marketSaleValue(s,marketValue(r.input,now),now);
 assert.ok(market>pay);assert.equal(boosted,r.coins>market?Math.round((r.coins/market-1)*100):null);
 const rich={...r,coins:1};assert.equal(villageRequestExtra(s,rich,now),null,'never a negative or zero percentage');
});
