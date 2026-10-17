import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,itemAvailable,recipeValue,marketSaleValue,marketValue,
 villageRequestValue,villageBoards,villageRequestExtra,villagerLine,villageSquareReady,
 BUILDINGS,RECIPES,RECIPE_LEVELS,ITEMS,VILLAGE_GOODS,MAX_BUILDING_LEVEL,VILLAGERS,VILLAGE_FARM_GOODS,VILLAGE_NEVER_ASKED,VILLAGE_REQUEST_WAIT,VILLAGE_PREMIUM,VILLAGE_XP_SHARE,
 VILLAGE_THIRD_BOARD,VILLAGE_REQUEST_BOARDS,VILLAGE_REQUEST_BOARDS_MAX,villageGood,worldTwoBuilding,
 VILLAGE_THREE_KINDS,BUILDER_CRATE_COINS,MARKET_PAYOUT_MULTIPLIER,upgradeCost,builderCrates,BUILDING_LEVELS,
 BOAT_GOODS,BOAT_PREMIUM,BOAT_XP_SHARE,BOAT_DIAMONDS,boatValue,exportValue,CROPS,HEIRLOOMS} from '../game/farm-state.js';

// World II's balance (Oct 2026, the owner's plan for levels 100-200): the village's recipes pay XP like the farm's late recipes, and the
// villagers at the market square ask for what the farm can make, worth what the plan says, paid exactly as shown.
const now=Date.parse('2026-10-05T12:00:00Z'),HOUR=3600000,DAY=24*HOUR;
const PLACES=['mine','lumbercamp','smithy','villagemill'];
// Every village place with batches (Oct 2026: ten), for the rule that a later recipe pays at least as well. PLACES stays the live four:
// the pinned boards below are built with them.
const PRODUCTION_PLACES=Object.keys(BUILDINGS).filter(k=>worldTwoBuilding(k)&&BUILDINGS[k].type==='production');
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
 assert.equal(village.length,24);
 for(const id of village){
  const r=RECIPES[id];
  assert.ok(r.xp/(r.duration/HOUR)<=31,`${id}: ${r.xp/(r.duration/HOUR)} XP an hour`);
  // The Village Fields (Oct 2026, the owner's choice 7a): 20 XP a slot-hour, like the Glasshouse's sowing.
  if(r.building==='villagefields')assert.ok(r.xp/(r.duration/HOUR)<=21,`${id}: the Fields pay 20 XP an hour`);
  assert.ok(perCoins(id)<=best,`${id}: ${perCoins(id).toFixed(2)} XP per 100 coins added`);
 }
 assert.equal(RECIPES.smeltiron.xp,20,'smelting iron adds little value, so 20 (30 would be 19.7 per 100 coins)');
});

test('a later recipe in the same village place pays at least as well an hour',()=>{
 // These three already paid less than an earlier recipe of their place when they were added (30 Sep 2026): digging deep 328 an hour
 // against 875 for silver, silver bars 384 and master tools 542 against 1,136 for pickaxes. They are what silver and rubies need.
 const OLDER=['digdeep','smeltsilver','mastertools'];
 const hourly=id=>recipeValue(id).added/(RECIPES[id].duration/HOUR);
 assert.equal(PRODUCTION_PLACES.length,10);
 for(const place of PRODUCTION_PLACES){
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
 // MAX is the Lookout tower's fourth (Oct 2026); without the tower a farm has three from 104.
 assert.deepEqual([VILLAGE_REQUEST_BOARDS,VILLAGE_REQUEST_BOARDS_MAX,VILLAGE_THIRD_BOARD],[2,4,104]);
 assert.deepEqual([100,103,104,150,200].map(level=>villageBoards(fixture(level,PLACES))),[2,2,3,3,3]);
 const s=fixture(103,['mine','lumbercamp','smithy']);
 assert.equal(villageBoards(s),2);assert.equal(s.village.boards.length,2);assert.ok(s.village.boards.every(b=>b.request));
 s.xp=xpForLevel(104);normalizeFarm(s,now);
 assert.equal(s.village.boards.length,3);assert.equal(s.village.boards[2].request.id,3);assert.equal(s.village.serial,3);
});

test('every request: worth about its target, paid half again and a 50th in XP, two kinds the farm can make (three from level 120), one of them the village\'s',()=>{
 const stocks=[{},{cheese:100,stone:300},{ironbar:10},{wool:500,cheese:500,candles:100,cider:100}];
 let seen=0;
 for(const mode of ['guided','legacy'])for(const [i,level] of [100,110,130,180].entries()){
  const s=fixture(level,PLACES,stocks[i],mode),target=villageRequestValue(level),ids=new Set();
  sweep(s,480,r=>{   // 60 days of "Not now"
   seen++;const keys=Object.keys(r.input),at=`${mode} ${level} ${JSON.stringify(r.input)}`;
   assert.ok(r.value/target>=.8&&r.value/target<=1.25,`${at}: ${r.value} for ${target}`);
   assert.equal(r.coins,Math.ceil(r.value*VILLAGE_PREMIUM),at);assert.equal(r.xp,Math.round(r.value/VILLAGE_XP_SHARE),at);
   assert.equal(keys.length,level>=VILLAGE_THREE_KINDS?3:2,at);
   assert.ok(keys.some(villageGood),at);assert.ok(keys.filter(k=>VILLAGE_FARM_GOODS.includes(k)).length<=1,at);
   assert.ok(keys.every(k=>!VILLAGE_NEVER_ASKED.includes(k)&&itemAvailable(s,k)),at);
   assert.ok(!ids.has(r.id),`${at}: id ${r.id} again`);ids.add(r.id);
   assert.ok(VILLAGERS[r.villager]?.lines.length,at);assert.equal(villagerLine(r),VILLAGERS[r.villager].lines[r.id%VILLAGERS[r.villager].lines.length]);
  });
 }
 assert.ok(seen>9000,`${seen} requests`);
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
 assert.deepEqual(got,{coins:r.coins,xp:r.xp,villager:VILLAGERS[r.villager].name,readyAt:now+VILLAGE_REQUEST_WAIT,crate:0},'no market crate below level 116');
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
  assert.deepEqual(s.village,{serial:0,boards:[{request:null,readyAt:0},{request:null,readyAt:0}],week:{week:null,helped:0,paid:false},boat:{serial:0,cargo:null,readyAt:0,trips:0,week:null,paid:0},landmarks:{done:[],given:{}},miller:{week:null}},mode);
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

// World II, levels 110-200 (Oct 2026): the village's crops, the newest place naming the villager, three kinds from 120, the builder's crate.
test('village crops pay at least plain cauliflower under glass, and later ones pay more; later waves pay more an hour',()=>{
 const hourly=id=>recipeValue(id).added/(RECIPES[id].duration/HOUR);
 const sow=Object.keys(RECIPES).filter(id=>RECIPES[id].building==='villagefields').sort((a,b)=>RECIPE_LEVELS[a]-RECIPE_LEVELS[b]);
 assert.deepEqual(sow,['sowpotatoes','sowflax','sowlavender','sowsaffron']);
 assert.equal(hourly('glasscauliflower'),326);
 for(const [i,id] of sow.entries()){assert.ok(hourly(id)>=hourly('glasscauliflower'),id);if(i)assert.ok(hourly(id)>hourly(sow[i-1]),`${id} pays more than ${sow[i-1]}`);}
 assert.deepEqual(sow.map(id=>Math.round(hourly(id))),[363,378,408,441]);
 // The median value added an hour of each wave of village recipes rises: 100-115, 113-128, 132-158.
 const village=Object.keys(RECIPES).filter(id=>worldTwoBuilding(RECIPES[id].building));
 const median=(from,to)=>{const v=village.filter(id=>RECIPE_LEVELS[id]>=from&&RECIPE_LEVELS[id]<=to).map(hourly).sort((a,b)=>a-b),h=v.length/2;return v.length%2?v[Math.floor(h)]:(v[h-1]+v[h])/2;};
 assert.deepEqual([median(100,115),median(113,128),median(132,158)].map(Math.round),[373,448,544]);
});

test('the Village Fields\' villager: the plan\'s level-110 example; potatoes join the requests only once the Fields are built',()=>{
 for(const mode of ['guided','legacy']){
  const f=fixture(110,['mine','lumbercamp','smithy','villagefields'],{potatoes:100},mode);
  assert.deepEqual(f.village.boards[0].request,{id:1,villager:5,input:{potatoes:40,cherryjam:1},value:5700,coins:8550,xp:114},mode);
  const before=fixture(110,['mine','lumbercamp','smithy'],{},mode);sweep(before,100,r=>assert.ok(!('potatoes' in r.input),JSON.stringify(r.input)));
  const after=fixture(110,['mine','lumbercamp','smithy','villagefields'],{},mode);let asked=0;
  sweep(after,100,r=>{if('potatoes' in r.input){asked++;assert.equal(r.villager,5,'the field hand');}});
  assert.ok(asked>=20,`${mode}: ${asked} requests ask potatoes`);
 }
});

test('from level 120 villagers ask three kinds: the same value and pay, a waiting request keeps its two lines, and the plan\'s level-130 boards',()=>{
 assert.equal(VILLAGE_THREE_KINDS,120);
 const s=fixture(119,PLACES,{});
 assert.ok(s.village.boards.every(b=>Object.keys(b.request.input).length===2));
 const waiting=structuredClone(s.village.boards);s.xp=xpForLevel(120);normalizeFarm(s,now);
 assert.deepEqual(s.village.boards,waiting,'a request already waiting keeps its lines');
 s.village.boards[0].request=null;s.village.boards[0].readyAt=now;normalizeFarm(s,now);
 assert.equal(Object.keys(s.village.boards[0].request.input).length,3);
 const places=['mine','lumbercamp','smithy','villagefields','villagemill','canteen','kiln','linenloft'];
 for(const mode of ['guided','legacy']){
  const f=fixture(130,places,{rooftile:200,linen:50},mode);
  assert.deepEqual(f.village.boards.map(b=>b.request),[
   {id:1,villager:8,input:{rooftile:15,linen:7,gemstone:1},value:9060,coins:13590,xp:181},
   {id:2,villager:7,input:{rooftile:15,timber:37,silverbar:1},value:9130,coins:13695,xp:183},
   {id:3,villager:7,input:{rooftile:15,silverore:8,cheese:15},value:9950,coins:14925,xp:199}],mode);
 }
 // Help on a three-line request takes all three goods.
 const h=fixture(130,places,plenty(1000)),r=h.village.boards[0].request,stock=structuredClone(h.inventory);
 assert.equal(Object.keys(r.input).length,3);act(h,{type:'village_deliver',board:0,request:r.id,input:r.input});
 for(const [k,n] of Object.entries(r.input))assert.equal(h.inventory[k],stock[k]-n,k);
 // A farm at 120+ that has built no village place still gets two lines: packed lunches and one farm good.
 const bare=fixture(125,[],{});sweep(bare,40,r=>assert.deepEqual(Object.keys(r.input).length,2));
});

test('the Lookout tower\'s fourth villager and the Great Hall\'s 1.6 times, read from the saved landmarks; a waiting request keeps its coins',()=>{
 const ids=['windpump','longhouse','stonequay','lookout','greathall'],all=Object.keys(BUILDINGS).filter(worldTwoBuilding);
 const at=(level,done)=>{const s=fixture(level,all);s.village={serial:0,boards:[],landmarks:{done,given:{}}};return normalizeFarm(s,now);};
 assert.equal(villageBoards(at(192,ids.slice(0,3))),3);assert.equal(villageBoards(at(192,ids.slice(0,4))),4);
 for(const [done,coins] of [[0,[30023,29955,29520]],[4,[30023,29955,29520,28155]],[5,[32024,31952,31488,30032]]]){
  const s=at(200,ids.slice(0,done));assert.deepEqual(s.village.boards.map(b=>b.request.coins),coins,`${done} landmarks`);
  assert.deepEqual(s.village.boards[0].request,{id:1,villager:5,input:{plank:34,potatoes:89,flax:61},value:20015,coins:coins[0],xp:400});
  if(done===4)assert.deepEqual(s.village.boards[3].request,{id:4,villager:8,input:{linen:14,ironore:95,cherryjam:2},value:18770,coins:28155,xp:375});
 }
 // The Hall finished while a request waits: that request keeps its coins; the next one pays 1.6 times.
 const s=at(200,ids.slice(0,4)),waiting=structuredClone(s.village.boards[0].request);
 s.village.landmarks.done.push('greathall');normalizeFarm(s,now);assert.deepEqual(s.village.boards[0].request,waiting);
 s.village.boards[1].request=null;s.village.boards[1].readyAt=now;normalizeFarm(s,now);
 const next=s.village.boards[1].request;assert.equal(next.coins,Math.ceil(next.value*1.6));
 for(let v=1;v<=250000;v++)if(Math.ceil(v*1.6)!==Math.floor((v*16+9)/10))assert.fail(`${v}: no float error`);
 // An old save holding four boards without the tower keeps three.
 const old=at(192,ids.slice(0,3));old.village.boards.push({request:null,readyAt:0});normalizeFarm(old,now);assert.equal(old.village.boards.length,3);
});

test('a builder\'s crate is worth about 1.54 times its market price, never more than 1.6, and halves at most the farm\'s upgrade bill',()=>{
 const ratio=BUILDER_CRATE_COINS/(MARKET_PAYOUT_MULTIPLIER*ITEMS.builderscrate.sell);assert.ok(ratio>=1.5&&ratio<=1.6,`${ratio}`);
 const s=fixture(128,PLACES,{builderscrate:1e6});s.boosts.upgradeCredits=0;
 let coins=0,crates=0,count=0;
 for(const key of Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].type==='production'&&k!=='factory'&&!worldTwoBuilding(k))){
  count++;for(let level=1;level<MAX_BUILDING_LEVEL;level++){s.buildings[key].level=level;coins+=upgradeCost(s,key);crates+=builderCrates(s,key);}
 }
 assert.deepEqual([count,coins,crates,crates*BUILDER_CRATE_COINS],[16,20490263,1225,9800000]);
 assert.ok(crates*BUILDER_CRATE_COINS/coins<.48,'47.8% off at most');
});

// The town boat (Oct 2026, from level 144): P(L) is every village place that opens by level L, as a farm at L has them built.
const P=level=>Object.keys(BUILDINGS).filter(k=>worldTwoBuilding(k)&&BUILDING_LEVELS[k]<=level);
// The cargo the boat brings as its n-th: the same farm, the boat's running number one lower.
const cargoAt=(s,n)=>{s.village.boat={serial:n-1,cargo:null,readyAt:0,trips:0};normalizeFarm(s,now);return s.village.boat.cargo;};
test('the town boat\'s cargo: three or four of the dearer goods the farm can make, about its level\'s value, never more than the Trade Depot\'s trailer',()=>{
 assert.deepEqual([144,145,150,200,250].map(boatValue),[50000,51000,56000,106000,106000]);
 const kinds=new Set();let largest=0;
 for(const mode of ['guided','legacy'])for(let level=144;level<=200;level+=4){
  const s=fixture(level,P(level),{},mode);
  for(let n=1;n<=100;n++){
   const c=cargoAt(s,n),keys=Object.keys(c.input);kinds.add(keys.length);largest=Math.max(largest,c.value);
   assert.ok(keys.length>=3&&keys.length<=4,`${level} #${n}`);
   assert.ok(keys.every(k=>BOAT_GOODS.includes(k)&&itemAvailable(s,k)&&c.input[k]>=1&&c.input[k]<=200&&c.loaded[k]===0),`${level} #${n} ${JSON.stringify(c.input)}`);
   const ratio=c.value/boatValue(level);assert.ok(ratio>=.85&&ratio<=1.15,`${level} #${n}: ${ratio}`);
   assert.ok(c.value<=exportValue(level)&&c.value<=114300,`${level} #${n}: ${c.value}`);
   assert.deepEqual([c.id,c.coins,c.xp,c.diamonds],[n,Math.ceil(c.value*BOAT_PREMIUM/100)*100,Math.round(c.value/BOAT_XP_SHARE),BOAT_DIAMONDS]);
  }
 }
 assert.deepEqual([...kinds].sort(),[3,4]);assert.ok(largest>100000,`${largest}`);
});

test('no boat before the Pier stands and its level is reached; the first cargo as soon as both are there',()=>{
 for(const mode of ['guided','legacy']){
  const none={serial:0,cargo:null,readyAt:0,trips:0,week:null,paid:0};
  assert.deepEqual(fixture(150,P(150).filter(k=>k!=='pier'),{},mode).village.boat,none,mode);
  // A test farm with every place built at any level (91 FIX 5): the Pier counts only from level 144.
  for(const level of [105,118,130,143])assert.deepEqual(fixture(level,P(200),{},mode).village.boat,none,`${mode} ${level}`);
  const s=fixture(144,P(144),{},mode);assert.deepEqual([s.village.boat.serial,s.village.boat.cargo.id],[1,1]);
  assert.deepEqual(s.village.boat.cargo,{id:1,input:{linen:35,rooftile:76,silverbar:7},loaded:{linen:0,rooftile:0,silverbar:0},value:51020,coins:81700,xp:1276,diamonds:3},mode);
 }
});

test('the soap maker comes once the Soap Maker is built; nobody at the square asks for the Jeweller\'s goods',()=>{
 for(const mode of ['guided','legacy']){
  const s=fixture(140,P(140),{lavendersoap:60,scentedsachet:40},mode);
  assert.deepEqual(s.village.boards[0].request,{id:1,villager:9,input:{lavendersoap:7,cherryjam:1,ironore:77},value:12010,coins:18015,xp:240},mode);
 }
 const jeweller=VILLAGERS.findIndex(v=>v.id==='jeweller'),skipper=VILLAGERS.findIndex(v=>v.id==='skipper');
 for(const level of [150,160,180,200])sweep(fixture(level,P(level),plenty(1000)),100,r=>{
  assert.ok(!('silvercandlestick' in r.input)&&!('rubyring' in r.input),`${level} ${JSON.stringify(r.input)}`);assert.ok(r.villager!==jeweller&&r.villager!==skipper,`${level}`);
 });
 sweep(fixture(134,P(134)),100,r=>assert.ok(!('lavendersoap' in r.input)&&!('scentedsachet' in r.input),JSON.stringify(r.input)));
});

// What a good comes from, down to the field: each good from its first non-Factory recipe, packed lunches from the canteen's pasties, crops
// and heirlooms are the ends, and what a recipe makes besides counts for nothing.
function raw(key,n=1,out={},seen=[]){
 if(Object.hasOwn(CROPS,key)||Object.hasOwn(HEIRLOOMS,key)){out[key]=(out[key]??0)+n;return out;}
 const id=key==='packedlunch'?'pastylunch':Object.keys(RECIPES).filter(id=>RECIPES[id].building!=='factory'&&RECIPES[id].output[key]).sort((a,b)=>RECIPE_LEVELS[a]-RECIPE_LEVELS[b])[0];
 assert.ok(id&&!seen.includes(key),`${key} has a recipe and no loop`);
 const r=RECIPES[id];for(const [k,m] of Object.entries(r.input))raw(k,n*m/r.output[key],out,[...seen,key]);
 return out;
}
test('no hidden slow crop in a ruby ring or a saffron bun: only the farm\'s fast field crops',()=>{
 assert.deepEqual(Object.keys(raw('rubyring')).sort(),['barley','cabbage','wheat']);
 assert.deepEqual(Object.keys(raw('saffronbun')).sort(),['barley','cabbage','corn','wheat']);
 const ring=raw('rubyring');assert.deepEqual(['wheat','barley','cabbage'].map(k=>Math.round(ring[k]*10)/10),[13.3,6.6,2]);
});

test('from 158 villagers ask for saffron and saffron buns, never a ruby ring; the level-158 boards',()=>{
 for(const mode of ['guided','legacy']){
  const count=(level,stock)=>{const seen={saffron:0,saffronbun:0,rubyring:0,silvercandlestick:0};sweep(fixture(level,P(level),stock,mode),160,r=>{for(const k of Object.keys(seen))if(k in r.input)seen[k]++;
   if('saffronbun' in r.input)assert.ok(['canteencook','potter','weaver','soapmaker'].includes(VILLAGERS[r.villager].id),VILLAGERS[r.villager].id);
   if('saffron' in r.input)assert.ok(['fieldhand','canteencook','potter','weaver','soapmaker'].includes(VILLAGERS[r.villager].id),VILLAGERS[r.villager].id);});return seen;};
  assert.deepEqual(count(157,{saffron:200,saffronbun:50}),{saffron:0,saffronbun:0,rubyring:0,silvercandlestick:0},mode);
  const bare=count(158,{});assert.ok(bare.saffron>=40&&bare.saffronbun>=40,`${mode} ${JSON.stringify(bare)}`);assert.deepEqual([bare.rubyring,bare.silvercandlestick],[0,0]);
  const stocked=count(158,{saffron:200,saffronbun:50});assert.ok(stocked.saffron>=200&&stocked.saffronbun>=200,`${mode} ${JSON.stringify(stocked)}`);
  assert.equal(count(200,{}).rubyring,0);
  const f=fixture(158,P(158),{saffron:200,saffronbun:50},mode);
  assert.deepEqual(f.village.boards.slice(0,2).map(b=>b.request),[{id:1,villager:5,input:{saffron:8,potatoes:69,gemstone:2},value:15175,coins:22763,xp:304},
   {id:2,villager:8,input:{saffronbun:2,linen:12,wool:30},value:15660,coins:23490,xp:313}],mode);
 }
});

test('the town boat takes a ruby ring from 154 and saffron buns from 158, never more than the Trade Depot',()=>{
 for(const mode of ['guided','legacy']){
  const asks=(level,places=P(level))=>{const s=fixture(level,places,{},mode),seen={rubyring:0,saffronbun:0,ring:new Set(),bun:new Set()};
   for(let n=1;n<=150;n++){const c=cargoAt(s,n);assert.ok(c.value<=exportValue(level));if(c.input.rubyring){seen.rubyring++;seen.ring.add(c.input.rubyring);}if(c.input.saffronbun){seen.saffronbun++;seen.bun.add(c.input.saffronbun);}}return seen;};
  const a=asks(153);assert.deepEqual([a.rubyring,a.saffronbun],[0,0],mode);
  const b=asks(154);assert.ok(b.rubyring>=50&&b.saffronbun===0,`${mode} ${b.rubyring}`);assert.deepEqual([...b.ring],[1]);
  const c=asks(158);assert.ok(c.rubyring>=50&&c.saffronbun>=50,`${mode} ${c.rubyring} ${c.saffronbun}`);
  assert.ok([...c.bun].every(n=>n>=8&&n<=10)&&[...c.ring].every(n=>n>=1&&n<=2));
  assert.equal(asks(160,P(160).filter(k=>k!=='jeweller')).rubyring,0,'no Jeweller, no ring');
  assert.deepEqual(cargoAt(fixture(158,P(158),{},mode),1),{id:1,input:{silverbar:9,rubyring:2,saffronbun:10},loaded:{silverbar:0,rubyring:0,saffronbun:0},value:71500,coins:114400,xp:1788,diamonds:3},mode);
 }
});
