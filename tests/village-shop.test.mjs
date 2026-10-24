import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,worldTwoBuilding,levelOf,waterCasts,marketQuote,marketSaleValue,villageLandmark,
 villageShopStatus,villageShopAction,villagerCallsUsed,villagerCallsLeft,landmarkSuppliesQuote,landmarkFullCost,
 VILLAGE_SHOP,VILLAGER_CALLS_PER_DAY,LANDMARK_COINS_PER_DIAMOND,PRICES_CHANGED,BOOSTS,COIN_PACK,NO_EVENT_ACTIONS,FEATURE_LEVELS,
 BUILDINGS,BUILDING_LEVELS,MAX_BUILDING_LEVEL,WORLD_TWO_LEVEL,LAKE_LEVEL,LAKE_WATER,POND_MAX_CASTS,POND_MIN_GAP_MS,VILLAGE_LANDMARKS,ITEMS,
 VALLEY_PROJECTS,BOAT_DIAMOND_TRIPS,familyWeek} from '../game/farm-state.js';
import {INSTANT_ACTIONS,instantResult} from '../public/farm-client.js';
import {farmLog,snapshot} from '../supabase/functions/farm-api/player-log.js';
import {squareMarkup} from '../public/village-square-ui.js';
import {boatMarkup} from '../public/boat-ui.js';
import {villageLine,villageMessage,untilText,waitButton,VILLAGE_ASK} from '../public/village-shop-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// farm-state.js imports the farmer's parts beside it (21 Oct 2026): a copy made into a data: module finds them by their file.
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`).replace("from './farm-map.js';",`from '${new URL('../game/farm-map.js',import.meta.url).href}';`)).toString('base64');
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<24,stdio:['ignore','pipe','ignore']});}catch{return null;}};

// The Village tab of the diamond shop (20 Oct 2026, the owner's choices; plan-wereld-2/winkel/spec-dorpswinkel.md): five items for World II
// and Landmark supplies, each from its own level, with a small diamond button at the boat, an empty villager board and the lake. The owner
// kept the carts at 40 and 20, made the time-skips one tap, and the time-skips count as boosts (the carts do not).
const now=Date.UTC(2026,9,20,12),HOUR=3600000,DAY=86400000;
const ALL=Object.keys(BUILDINGS).filter(worldTwoBuilding),TYPES=['village_cart','boat_now','villager_now','lake_casts','landmark_supplies'];
const act=(s,a,t=now)=>applyFarmAction(s,a,t);
// A farm at a level: every farm building built, the village places of that level built (or only those listed), only the stock given; the
// boat away for 5 hours, the second board empty for 2 hours and the lake at 0 casts (a new one in 19 minutes).
function world(level,{places=ALL,stock={},done=[],diamonds=5000}={}){
 const s=createFarm(now-DAY);s.xp=xpForLevel(level);s.coins=5000000;s.diamonds=diamonds;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){if(worldTwoBuilding(k))b.built=places.includes(k)&&BUILDING_LEVELS[k]<=level;else{b.built=true;if(BUILDINGS[k].type==='production')b.level=MAX_BUILDING_LEVEL;}}
 normalizeFarm(s,now);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,stock);
 s.village={serial:0,boards:[],landmarks:{done,given:{}}};normalizeFarm(s,now);
 if(s.village.boards[1])s.village.boards[1]={request:null,readyAt:now+2*HOUR};
 s.village.boat.cargo=null;s.village.boat.readyAt=now+5*HOUR;
 s.lake={firstAt:now-DAY,n:10,casts:0,castsAt:now-60000,lastAt:now-60000,prevAt:now-120000,best:{}};
 return normalizeFarm(s,now);
}
// A refusal changes nothing.
function refused(s,action,message,t=now){const before=structuredClone(s);assert.throws(()=>act(s,action,t),{message},`${action.type}: ${message}`);assert.deepEqual(s,before,`${action.type} changed nothing`);}
const statusAction=(s,id,board)=>villageShopAction(villageShopStatus(s,id,now,board));

test('the shop: prices, levels and the rates as the owner chose them',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(VILLAGE_SHOP).filter(([,i])=>i.cost).map(([k,i])=>[k,i.cost])),{villager:10,casts:10,tilecart:20,boat:30,supplycart:40});
 assert.deepEqual(Object.fromEntries(Object.entries(VILLAGE_SHOP).map(([k,i])=>[k,i.level])),{villager:WORLD_TWO_LEVEL,casts:LAKE_LEVEL,tilecart:BUILDING_LEVELS.kiln,boat:BUILDING_LEVELS.pier,supplycart:BUILDING_LEVELS.smithy,landmark:VILLAGE_LANDMARKS.windpump.level});
 assert.deepEqual([WORLD_TWO_LEVEL,LAKE_LEVEL,BUILDING_LEVELS.kiln,BUILDING_LEVELS.pier,BUILDING_LEVELS.smithy,VILLAGE_LANDMARKS.windpump.level],[100,100,118,144,102,165]);
 assert.equal(LANDMARK_COINS_PER_DIAMOND,500);assert.equal(VILLAGER_CALLS_PER_DAY,3);
 assert.deepEqual(VILLAGE_SHOP.supplycart.goods,{plank:40,ironbar:10});assert.deepEqual(VILLAGE_SHOP.tilecart.goods,{rooftile:40});
 assert.ok(Object.isFrozen(VILLAGE_SHOP)&&Object.values(VILLAGE_SHOP).every(Object.isFrozen)&&Object.isFrozen(VILLAGE_SHOP.supplycart.goods));
 assert.equal(VILLAGE_SHOP.supplycart.art,'supply-cart','the owner\'s picture');
 assert.equal(PRICES_CHANGED,'Prices have changed. Reload the game to see current prices.');
 assert.match(read('game/farm-state.js'),/case 'buy_coins':\{[^]*?throw new Error\(PRICES_CHANGED\);/);
});

test('each of the five: diamonds spent, boosts only for the time-skips, events count it, never instant, no gate, no new village keys',()=>{
 const s=world(165,{stock:{rooftile:10}});
 const gates=read('game/farm-state.js').match(/const gates=\{([^}]+)\}/)[1];
 const steps=[['village_cart',statusAction(s,'supplycart'),0],['village_cart',statusAction(s,'tilecart'),0],['boat_now',statusAction(s,'boat'),1],['villager_now',statusAction(s,'villager'),1],['lake_casts',statusAction(s,'casts'),1],['landmark_supplies',statusAction(s,'landmark'),0]];
 for(const [type,action,boosts] of steps){
  assert.equal(action.type,type);
  const villageKeys=Object.keys(s.village),boatKeys=Object.keys(s.village.boat),spent=s.stats.diamonds_spent??0,used=s.stats.boosts_used??0,diamonds=s.diamonds;
  const r=act(s,action);
  assert.equal(r.cost,action.expectedCost,type);assert.equal(s.diamonds,diamonds-action.expectedCost,type);
  assert.equal(s.stats.diamonds_spent,spent+action.expectedCost,`${type}: diamonds_spent`);
  assert.equal((s.stats.boosts_used??0)-used,boosts,`${type}: boosts_used (the owner: the time-skips count, the carts and supplies do not)`);
  assert.deepEqual(Object.keys(s.village),villageKeys,type);assert.deepEqual(Object.keys(s.village.boat),boatKeys,type);
 }
 for(const type of TYPES){
  assert.ok(!NO_EVENT_ACTIONS.has(type),type);assert.ok(!INSTANT_ACTIONS.has(type),type);assert.equal(instantResult(s,{type},now),null,type);
  assert.doesNotMatch(gates,new RegExp(`\\b${type}:`),type);assert.ok(!Object.hasOwn(FEATURE_LEVELS,type),type);
 }
 assert.deepEqual(['village_carts','boat_calls','villager_calls','lake_refills','landmark_supplies'].map(k=>s.stats[k]),[2,1,1,1,1]);
});

test('the card and the server agree: Buy is on exactly when the action goes through',()=>{
 const states={
  ready:()=>world(165,{stock:{rooftile:10}}),
  short:()=>world(165,{diamonds:5}),
  low:()=>world(101),
  boatHome:()=>{const s=world(165);s.village.boat.readyAt=now-1;return normalizeFarm(s,now);},
  nopier:()=>world(149,{places:ALL.filter(k=>k!=='pier')}),
  fullBoards:()=>{const s=world(165);s.village.boards.forEach(b=>{b.readyAt=now-1;});return normalizeFarm(s,now);},
  calledOut:()=>{const s=world(165);s.daily.villagersCalled=3;return s;},
  casts:()=>{const s=world(165);s.lake.castsAt=now-2*20*60000;return s;},
  brief:()=>world(165,{places:ALL.filter(k=>k!=='jeweller')}),
  handedIn:()=>{const s=world(165);Object.assign(s.village.landmarks.given,VILLAGE_LANDMARKS.windpump.materials);return s;},
  pumpDone:()=>world(168,{done:['windpump']})
 };
 let ok=0,off=0;
 for(const [name,make] of Object.entries(states))for(const id of Object.keys(VILLAGE_SHOP)){
  const s=make(),st=villageShopStatus(s,id,now);if(!st.shown)continue;
  let went=true;try{act(structuredClone(s),villageShopAction(st));}catch{went=false;}
  assert.equal(st.canBuy,went,`${name}/${id}: ${st.reason||'no reason'}`);went?ok++:off++;
 }
 assert.ok(ok>=6&&off>=10,`${ok} on, ${off} off`);
 // The two the card does not check on purpose (to stay cheap): the button is on, the server refuses, nothing is charged.
 const empty=world(149,{places:['mine','lumbercamp','pier']});
 assert.equal(villageShopStatus(empty,'boat',now).canBuy,true);
 refused(empty,statusAction(empty,'boat'),'The boat comes as soon as the village makes goods it can carry.');
 // (No Farm Kitchen: no packed lunches, so nobody can come to the square yet.)
 const lunch=world(100,{places:[]});lunch.buildings.kitchen.built=false;lunch.village.boards=[{request:null,readyAt:now+HOUR},{request:null,readyAt:0}];normalizeFarm(lunch,now);
 assert.equal(villageShopStatus(lunch,'villager',now,0).canBuy,true);
 refused(lunch,statusAction(lunch,'villager',0),'Pack lunches in the Farm Kitchen and a villager will come.');
});

test('the carts\' goods resold at their top price stay under the coin pack without Double earnings (the owner kept 40 and 20)',()=>{
 for(const id of ['supplycart','tilecart']){
  const c=VILLAGE_SHOP[id],s=world(c.level);
  s.vipExpiresAt=now+DAY;s.improvements=['ledger'];s.master={market:10};s.valleyProjects.barn={level:VALLEY_PROJECTS.barn.levels.length,given:{}};
  const top=Object.entries(c.goods).reduce((sum,[k,n])=>sum+marketQuote(k,now).max*n,0),pack=COIN_PACK.perLevel*c.level/COIN_PACK.cost;
  s.boosts.coinsUntil=0;const plain=marketSaleValue(s,top,now)/c.cost;
  s.boosts.coinsUntil=now+HOUR;const doubled=marketSaleValue(s,top,now)/c.cost;
  assert.ok(plain<pack,`${id}: ${Math.round(plain)} < ${pack}`);
  // With Double earnings on a top day it can beat the pack by a little: the owner's choice (40 and 20, not 49 and 26).
  assert.ok(doubled>pack&&doubled<pack*1.35,`${id}: ${Math.round(doubled)} vs ${pack}`);
 }
 assert.deepEqual([VILLAGE_SHOP.supplycart.cost,VILLAGE_SHOP.tilecart.cost],[40,20]);
});

test('below level 100 every action is refused, the lake with its own words',()=>{
 const s=world(99);
 for(const [action,message] of [[{type:'village_cart',cart:'supplycart',expectedCost:40,expectedGoods:{plank:40,ironbar:10}},'Reach level 100 to trade in the village.'],
  [{type:'boat_now',expectedCost:30},'Reach level 100 to trade in the village.'],[{type:'villager_now',board:0,expectedCost:10},'Reach level 100 to trade in the village.'],
  [{type:'landmark_supplies',landmark:'windpump',expectedCost:459,expectedGoods:{rooftile:600,plank:300,ironbar:60}},'Reach level 100 to trade in the village.'],
  [{type:'lake_casts',expectedCost:10},'Reach level 100 to fish at the village lake.']])refused(s,action,message);
 assert.ok(Object.keys(VILLAGE_SHOP).every(id=>!villageShopStatus(s,id,now).shown));
});

test('the carts: from the Smithy\'s and the Kiln\'s levels, their goods into the barn, no cap, nothing made or earned',()=>{
 const cart=(cart,extra={})=>({type:'village_cart',cart,expectedCost:VILLAGE_SHOP[cart].cost,expectedGoods:{...VILLAGE_SHOP[cart].goods},...extra});
 refused(world(101),cart('supplycart'),'Reach level 102 for the Supply cart.');
 refused(world(117),cart('tilecart'),'Reach level 118 for the Roof tile cart.');
 const s=world(120);
 for(const c of ['wagon','__proto__',undefined,7,'boat'])refused(s,cart('supplycart',{cart:c}),'Choose a cart.');
 for(const extra of [{expectedCost:39},{expectedCost:'40'},{expectedGoods:undefined},{expectedGoods:{plank:40}},{expectedGoods:{plank:40,ironbar:11}},{expectedGoods:{plank:40,ironbar:10,stone:1}},{expectedGoods:[40,10]}])
  refused(s,cart('supplycart',extra),PRICES_CHANGED);
 const poor=world(120,{diamonds:39});refused(poor,cart('supplycart'),'You need 40 diamonds. Earn more from daily gifts and challenges.');
 delete s.inventory.plank;delete s.inventory.ironbar;const earned=s.stats.earned,made=s.stats.made_plank;
 assert.deepEqual(act(s,cart('supplycart')),{cart:'supplycart',goods:{plank:40,ironbar:10},cost:40});
 assert.deepEqual([s.inventory.plank,s.inventory.ironbar],[40,10]);
 assert.deepEqual(act(s,cart('tilecart')),{cart:'tilecart',goods:{rooftile:40},cost:20});assert.equal(s.inventory.rooftile,40);
 act(s,cart('supplycart',{expectedGoods:{ironbar:10,plank:40}}));assert.deepEqual([s.inventory.plank,s.inventory.ironbar],[80,20],'twice in a row, keys in any order');
 assert.equal(s.stats.village_carts,3);assert.equal(s.stats.earned,earned);assert.equal(s.stats.made_plank,made);
});

test('Boat back now: only for a boat that is away, with the cargo it would have brought; the week\'s diamond trips stay as they were',()=>{
 refused(world(143),{type:'boat_now',expectedCost:30},'Build the Pier first.');
 refused(world(149,{places:ALL.filter(k=>k!=='pier')}),{type:'boat_now',expectedCost:30},'Build the Pier first.');
 const home=world(149);home.village.boat.readyAt=now-1;normalizeFarm(home,now);assert.ok(home.village.boat.cargo);
 refused(home,{type:'boat_now',expectedCost:30},'The boat is at the pier.');
 const s=world(149);Object.assign(s.village.boat,{trips:4,week:familyWeek(now),paid:2});
 refused(s,{type:'boat_now',expectedCost:20},PRICES_CHANGED);
 refused(world(149,{diamonds:29}),{type:'boat_now',expectedCost:30},'You need 30 diamonds. Earn more from daily gifts and challenges.');
 const serial=s.village.boat.serial,later=structuredClone(s);later.village.boat.readyAt=now;normalizeFarm(later,now);
 const r=act(s,{type:'boat_now',expectedCost:30}),b=s.village.boat;
 assert.equal(b.cargo.id,serial+1);assert.equal(b.readyAt,now);assert.deepEqual([b.trips,b.week,b.paid],[4,familyWeek(now),2]);
 assert.deepEqual(r.cargo,b.cargo);assert.deepEqual(b.cargo.input,later.village.boat.cargo.input,'the cargo it would have brought at its time');
 assert.equal(s.stats.boat_calls,1);
 refused(s,{type:'boat_now',expectedCost:30},'The boat is at the pier.');
 // Load all sails it, with diamonds only while the week's diamond trips last.
 for(const [k,n] of Object.entries(b.cargo.input))s.inventory[k]=n;
 const sailed=act(s,{type:'boat_load',cargo:b.cargo.id,input:{...b.cargo.input}});assert.equal(sailed.sailed,true);assert.equal(sailed.diamonds,3);
 const full=world(149);Object.assign(full.village.boat,{week:familyWeek(now),paid:BOAT_DIAMOND_TRIPS});act(full,{type:'boat_now',expectedCost:30});
 for(const [k,n] of Object.entries(full.village.boat.cargo.input))full.inventory[k]=n;
 assert.equal(act(full,{type:'boat_load',cargo:full.village.boat.cargo.id,input:{...full.village.boat.cargo.input}}).diamonds,0);
 // The Stone quay's 6 hours do not change the price.
 const quay=world(190,{done:['windpump','longhouse','stonequay']});assert.equal(villageShopStatus(quay,'boat',now).cost,30);assert.equal(act(quay,{type:'boat_now',expectedCost:30}).cost,30);
});

test('Next villager now: an empty board that waits, three a day (UTC), with no charge when it cannot',()=>{
 const s=world(120),board=s.village.boards[1];assert.equal(board.request,null);
 refused(s,{type:'villager_now',board:1,expectedCost:5},PRICES_CHANGED);
 refused(s,{type:'villager_now',board:0,expectedCost:10},'A villager is already waiting there.');
 const two=world(103);
 for(const b of [2,'1',-1,1.5,undefined])refused(two,{type:'villager_now',board:b,expectedCost:10},'Choose a villager.');
 const serial=s.village.serial,spent=s.diamonds;
 const r=act(s,{type:'villager_now',board:1,expectedCost:10});
 assert.equal(board.request,null,'the board object is replaced by normalize; read it again');
 const b=s.village.boards[1];assert.ok(b.request);assert.equal(b.readyAt,now);assert.equal(s.village.serial,serial+1);assert.equal(b.request.id,serial+1);
 assert.equal(s.daily.villagersCalled,1);assert.equal(s.stats.villager_calls,1);assert.equal(s.diamonds,spent-10);assert.equal(r.left,2);assert.equal(r.board,1);
 assert.equal(typeof r.villager,'string');assert.deepEqual(r.request,b.request);
 const kept=structuredClone(b.request);normalizeFarm(s,now+60000);assert.deepEqual(s.village.boards[1].request,kept,'the request stays');
 assert.equal(s.stats.village_requests??0,0,'a call is not a Help');
 // The cap: three calls with "Not now" between them, then the rule; the next UTC day again.
 const say=(t)=>{const x=s.village.boards[1];act(s,{type:'village_skip',board:1,request:x.request.id,input:{...x.request.input}},t);};
 assert.deepEqual([villagerCallsLeft(s,now)],[2]);
 say(now);act(s,{type:'villager_now',board:1,expectedCost:10});assert.equal(villagerCallsLeft(s,now),1);
 say(now);act(s,{type:'villager_now',board:1,expectedCost:10});assert.equal(villagerCallsLeft(s,now),0);
 say(now);refused(s,{type:'villager_now',board:1,expectedCost:10},'You can call 3 villagers a day. More tomorrow.');
 assert.equal(villageShopStatus(s,'villager',now).reason,'None left today');
 const tomorrow=Date.UTC(2026,9,21,0,1);assert.equal(villagerCallsLeft(s,tomorrow),3);
 s.village.boards[1].readyAt=tomorrow+HOUR;act(s,{type:'villager_now',board:1,expectedCost:10},tomorrow);assert.equal(s.daily.villagersCalled,1);
 // A saved count that is not a whole number above 0 reads as 0; one from another day too.
 const g=world(120);for(const v of ['3',-1,1.5,null,undefined,{}]){g.daily.villagersCalled=v;assert.equal(villagerCallsUsed(g,now),0,String(v));}
 g.daily.villagersCalled=3;g.daily.date='2026-10-19';assert.equal(villagerCallsLeft(g,now),3);
 // Which board the card calls: the given one, otherwise the waiting board that waits longest.
 const three=world(120);three.village.boards.forEach((x,i)=>{x.request=null;x.readyAt=now+[1,3,2][i]*HOUR;});
 assert.equal(villageShopStatus(three,'villager',now).board,1);assert.equal(villageShopStatus(three,'villager',now).until,now+3*HOUR);
 assert.equal(villageShopStatus(three,'villager',now,2).board,2);assert.equal(villageShopStatus(three,'villager',now,2).until,now+2*HOUR);
 three.village.boards[1].readyAt=now+2*HOUR;assert.equal(villageShopStatus(three,'villager',now).board,1,'ties: board order');
});

test('Five casts now: only at 0 casts (the count of now), five casts and the 20 minutes start again; the pond untouched',()=>{
 refused(world(99),{type:'lake_casts',expectedCost:10},'Reach level 100 to fish at the village lake.');
 const fresh=world(120);delete fresh.lake;refused(fresh,{type:'lake_casts',expectedCost:10},'You still have casts. Fish them first.');
 const some=world(120);some.lake.casts=3;refused(some,{type:'lake_casts',expectedCost:10},'You still have casts. Fish them first.');
 const back=world(120);back.lake.castsAt=now-20*60000;assert.equal(back.lake.casts,0);assert.equal(waterCasts(LAKE_WATER,back,now).casts,1);
 refused(back,{type:'lake_casts',expectedCost:10},'You still have casts. Fish them first.');
 const s=world(120);s.pond={firstAt:now-DAY,n:4,casts:2,castsAt:now-1000,lastAt:0,prevAt:0,best:{}};s.lake.best={bleak:.05};s.lake.n=7;normalizeFarm(s,now);
 refused(s,{type:'lake_casts',expectedCost:5},PRICES_CHANGED);
 const pond=structuredClone(s.pond),{n,best,prevAt,lastAt}=structuredClone(s.lake);
 assert.deepEqual(act(s,{type:'lake_casts',expectedCost:10}),{casts:{casts:5,nextAt:0},cost:10});
 assert.deepEqual([s.lake.casts,s.lake.castsAt,s.lake.n,s.lake.best,s.lake.prevAt,s.lake.lastAt],[POND_MAX_CASTS,now,n,best,prevAt,lastAt]);
 assert.deepEqual(s.pond,pond);assert.equal(s.stats.lake_refills,1);
 let t=now;for(let i=0;i<5;i++){t+=POND_MIN_GAP_MS;act(s,{type:'lake_fish',n:s.lake.n,landed:true,perfect:false},t);}
 assert.throws(()=>act(s,{type:'lake_fish',n:s.lake.n,landed:true,perfect:false},t+POND_MIN_GAP_MS),{message:'No casts left. A new cast comes every 20 minutes.'});
});

test('Landmark supplies: the open landmark\'s missing goods at their normal price, 1 diamond a 500 coins, rounded up once; it does not finish it',()=>{
 const costs=Object.fromEntries(Object.keys(VILLAGE_LANDMARKS).map(id=>[id,landmarkFullCost(id)]));
 assert.deepEqual(costs,{windpump:459,longhouse:696,stonequay:568,lookout:1610,greathall:788});assert.equal(Object.values(costs).reduce((a,b)=>a+b),4121);
 const s=world(165,{stock:{rooftile:331,plank:300,ironbar:40}});
 const q=landmarkSuppliesQuote(s);assert.deepEqual([q.id,q.value,q.cost,q.goods],['windpump',229500,459,{rooftile:600,plank:300,ironbar:60}]);
 const stale=statusAction(s,'landmark');
 act(s,{type:'landmark_give',landmark:'windpump'});
 const after=landmarkSuppliesQuote(s);assert.deepEqual([after.goods,after.value,after.cost],[{rooftile:269,ironbar:20},72180,145]);
 refused(s,stale,PRICES_CHANGED);
 refused(s,{...statusAction(s,'landmark'),expectedCost:146},PRICES_CHANGED);
 const poor=structuredClone(s);poor.diamonds=144;refused(poor,statusAction(poor,'landmark'),'You need 145 diamonds. Earn more from daily gifts and challenges.');
 // Rounding: added up first, rounded up once.
 const one=world(165);one.village.landmarks.given={rooftile:600,plank:299,ironbar:60};assert.equal(landmarkSuppliesQuote(one).cost,Math.ceil(ITEMS.plank.sell/500));assert.equal(landmarkSuppliesQuote(one).cost,1);
 one.village.landmarks.given={rooftile:600,plank:299,ironbar:59};assert.equal(landmarkSuppliesQuote(one).cost,Math.ceil((ITEMS.plank.sell+ITEMS.ironbar.sell)/500));assert.equal(landmarkSuppliesQuote(one).cost,2);
 const inventory=structuredClone(s.inventory),done=[...s.village.landmarks.done],coins=s.coins;
 const r=act(s,statusAction(s,'landmark'));
 assert.deepEqual(s.village.landmarks.given,{...VILLAGE_LANDMARKS.windpump.materials});assert.deepEqual(s.inventory,inventory);assert.deepEqual(s.village.landmarks.done,done);
 assert.deepEqual(r,{landmark:'windpump',name:'Wind pump',handed:{rooftile:269,ironbar:20},units:289,cost:145,ready:coins>=1500000});assert.equal(s.stats.landmark_supplies,1);
 normalizeFarm(s,now);assert.deepEqual(s.village.landmarks.given,{...VILLAGE_LANDMARKS.windpump.materials},'normalize keeps it');
 refused(s,{type:'landmark_supplies',landmark:'windpump',expectedCost:0,expectedGoods:{}},'Everything is handed in. Pay the coins to finish it.');
 assert.equal(villageShopStatus(s,'landmark',now).reason,'Everything is handed in');
 act(s,{type:'landmark_finish',landmark:'windpump'});assert.equal(s.stats.village_landmarks,1);
 // Refusals of its own: the level, a brief open, another landmark.
 refused(world(164),{type:'landmark_supplies',landmark:'windpump',expectedCost:459,expectedGoods:{rooftile:600,plank:300,ironbar:60}},'Reach level 165 to build the Wind pump.');
 refused(world(165,{places:ALL.filter(k=>k!=='jeweller')}),{type:'landmark_supplies',landmark:'windpump',expectedCost:459,expectedGoods:{rooftile:600,plank:300,ironbar:60}},'Build the Jeweller first: one golden brief at a time.');
 refused(world(165),{type:'landmark_supplies',landmark:'longhouse',expectedCost:696,expectedGoods:VILLAGE_LANDMARKS.longhouse.materials},'Finish the Wind pump first: one golden brief at a time.');
 for(const landmark of ['castle','__proto__',7])refused(world(165),{type:'landmark_supplies',landmark,expectedCost:459,expectedGoods:{}},'Choose a landmark.');
 // The card before its level, with a brief open, with the Wind pump done.
 assert.equal(villageShopStatus(world(165,{places:ALL.filter(k=>k!=='jeweller')}),'landmark',now).reason,'Build every village place first');
 const pump=villageShopStatus(world(168,{done:['windpump']}),'landmark',now);assert.deepEqual([pump.shown,pump.reason,pump.cost,pump.art,pump.name,pump.landmarkName],[true,'Opens at level 172',696,'landmark-longhouse','Landmark supplies','Longhouse']);
 assert.equal(villageShopStatus(world(200,{done:Object.keys(VILLAGE_LANDMARKS)}),'landmark',now).shown,false,'all five finished: the card goes');
 assert.equal(villageLandmark(world(165)).id,'windpump');
});

test('the log says what each buy was, in the diamonds category (the real calls: a missing import would throw here)',()=>{
 const s=world(165,{stock:{rooftile:10}});
 const lines=[[statusAction(s,'supplycart'),'Bought the Supply cart with diamonds'],[statusAction(s,'tilecart'),'Bought the Roof tile cart with diamonds'],[statusAction(s,'boat'),'Called the town boat back with diamonds'],
  [statusAction(s,'villager'),'Called the next villager with diamonds'],[statusAction(s,'casts'),'Bought five lake casts with diamonds'],[statusAction(s,'landmark'),'Bought the goods for the Wind pump with diamonds']];
 for(const [action,text] of lines){
  const before=snapshot(s),result=act(s,action),[row]=farmLog(action,before,s,result);
  assert.equal(row.category,'diamonds');assert.equal(row.action,action.type);assert.ok(row.text.startsWith(text),row.text);assert.ok(action.type.length<40);
 }
 assert.match(read('supabase/functions/farm-api/player-log.js'),/^import \{[^}]*\bVILLAGE_SHOP\b[^}]*\} from '\.\/farm-state\.js';/);
 for(const type of TYPES){assert.ok(read('public/farm-client.js').includes(`'${type}'`),type);assert.match(read('src/analytics.js'),new RegExp(`action:new Set\\(\\[[^\\]]*'${type}'`),type);}
});

test('the shop window: a fifth tab from level 100, opened on it in the village; the cards cheap to dear; the carts and supplies ask first',()=>{
 const html=read('public/farm.html'),css=read('public/shop.css'),ui=read('public/boosts-ui.js'),shopUi=read('public/village-shop-ui.js');
 assert.match(html,/data-shop-jump="vip-shop"[^>]*>.*?<\/button><button type="button" data-shop-jump="shop-village" aria-controls="shop-village" aria-pressed="false" hidden><i data-game-art="village-badge"><\/i><span>Village<\/span><\/button><\/nav>/);
 assert.match(css,/#boost-dialog \.shop-tabs\{[^}]*grid-auto-flow:column;grid-auto-columns:auto/);assert.doesNotMatch(css,/repeat\(4,/);
 assert.match(css,/#boost-dialog\[data-shop-tab\]:not\(\[data-shop-tab="shop-village"\]\) #shop-village/);
 assert.match(read('public/payments.css'),/#vip-shop,#shop-village\{scroll-margin-top/);
 assert.match(ui,/id="shop-boosts"[^]*?<\/section>`\n\s*\+\(worldTwo\?`<section class="shop-section" id="shop-village">/);
 assert.ok(ui.includes("village&&worldTwoOpen(state)?'shop-village':firstShopTab()"));assert.ok(ui.includes("showShopTab(typeof tab==='string'?tab:"));
 assert.ok(ui.includes('querySelectorAll(`[data-boost-time='));assert.ok(ui.includes('data-shop-until'));
 assert.equal((ui.match(/balance:state\.diamonds/g)??[]).length,4,'the village confirm lives in village-shop-ui.js');
 assert.ok(ui.includes('always:VILLAGE_ASK.has(id)'));
 assert.ok(shopUi.includes("VILLAGE_ASK=new Set(['supplycart','tilecart','landmark'])"));assert.ok(shopUi.includes('always||s.cost>=150'));assert.ok(shopUi.includes('balance:state.diamonds'));
 assert.deepEqual([...VILLAGE_ASK],['supplycart','tilecart','landmark']);
 assert.match(read('public/game.js'),/boosts=createBoostsUI\(\{state,runAction,[^\n]*,village:villageWorld\}\);/);
 assert.ok(read('public/game.js').includes("window.harvestShop.packs=()=>boosts.open('diamond-store');"));
 assert.ok(read('src/payment-ui.js').includes('(window.harvestShop?.packs??window.harvestShop?.open)?.()'));
 // The order on the tab (the sort in boosts-ui.js): by price, the Farmhand in at 150, Landmark supplies at its price of the moment.
 assert.ok(ui.includes('[...shown.map(s=>[s.cost||Infinity,villageCard(s)]),[BOOSTS.farmhand.cost,boostCard([\'farmhand\',BOOSTS.farmhand])]].sort((a,b)=>a[0]-b[0])'));
 const order=s=>[...Object.keys(VILLAGE_SHOP).map(id=>villageShopStatus(s,id,now)).filter(x=>x.shown).map(x=>[x.cost||Infinity,x.id]),[BOOSTS.farmhand.cost,'farmhand']].sort((a,b)=>a[0]-b[0]).map(([,id])=>id);
 const s=world(165,{stock:{rooftile:331,plank:300,ironbar:40}});
 assert.deepEqual(order(s),['villager','casts','tilecart','boat','supplycart','farmhand','landmark']);
 act(s,{type:'landmark_give',landmark:'windpump'});assert.deepEqual(order(s),['villager','casts','tilecart','boat','supplycart','landmark','farmhand']);
 act(s,statusAction(s,'landmark'));assert.deepEqual(order(s).at(-1),'landmark');
 assert.deepEqual(order(world(100)),['villager','casts','farmhand']);
 assert.deepEqual(order(world(118)),['villager','casts','tilecart','supplycart','farmhand']);
 // The lines and the messages.
 assert.equal(villageLine({id:'supplycart'}),'40 planks and 10 iron bars into your barn, right away.');
 assert.equal(villageLine(villageShopStatus(s,'landmark',now)),'All the goods the Wind pump still needs, handed in right away. 1 diamond for every 500 coins they are worth.');
 assert.equal(villageMessage('tilecart',{goods:{rooftile:40}}),'40 roof tiles are in your barn.');assert.equal(villageMessage('villager',{villager:'The miller'}),'The miller has come to the market square.');
 assert.equal(untilText('boat',10*HOUR),'Back in 10h');assert.equal(untilText('cast',14*60000),'Next cast in 14m');assert.equal(untilText('villager',3*HOUR),'Next villager in 3h');
});

test('the small diamond buttons: under the boat\'s and an empty board\'s time, and at the lake with no cast left',()=>{
 const itemList=items=>Object.entries(items).map(([k,n])=>`<span class="ingredient">${n} ${ITEMS[k].name}</span>`).join('');
 const s=world(149);s.village.boards.forEach((b,i)=>{b.request=null;b.readyAt=now+(i+1)*HOUR;});
 const square=squareMarkup(s,itemList,now);
 assert.match(square,/Next villager in <b>2h<\/b><\/p><div class="wait-buy-row"><button type="button" class="small-button is-diamond wait-buy" data-wait-buy="villager" data-board="1"[^>]*>[^]*?<span>Next villager now<\/span><\/button><small class="square-note">3 of 3 left today<\/small><\/div>/);
 s.daily.villagersCalled=3;const out=squareMarkup(s,itemList,now);
 assert.doesNotMatch(out,/data-wait-buy/);assert.match(out,/You can call 3 villagers a day\. More tomorrow\./);
 const due=world(100,{places:[]});due.buildings.kitchen.built=false;due.village.boards=[{request:null,readyAt:0},{request:null,readyAt:0}];normalizeFarm(due,now);assert.match(squareMarkup(due,itemList,now),/Pack lunches in the Farm Kitchen and a villager will come\./);assert.doesNotMatch(squareMarkup(due,itemList,now),/data-wait-buy/,'a due board with nobody to send');
 const away=boatMarkup(s,now);assert.match(away,/The boat is back in <b>5h<\/b>\.<\/p><div class="wait-buy-row"><button[^>]*data-wait-buy="boat"[^>]*aria-label="Buy Boat back now for 30 diamonds">/);
 const home=world(149);home.village.boat.readyAt=now-1;normalizeFarm(home,now);assert.doesNotMatch(boatMarkup(home,now),/data-wait-buy/);
 const none=world(149,{places:['mine','lumbercamp','pier']});none.village.boat.readyAt=0;normalizeFarm(none,now);
 assert.doesNotMatch(boatMarkup(none,now),/data-wait-buy/,'back with nothing to carry');
 assert.equal(waitButton(villageShopStatus(s,'casts',now)).startsWith('<button type="button" class="small-button is-diamond wait-buy" data-wait-buy="casts" aria-label="Buy Five casts now for 10 diamonds">'),true);
 const pond=read('public/pond-ui.js');
 assert.ok(pond.includes("${lake?`<div class=\"wait-buy-row pond-refill\" data-pond-refill hidden>${waitButton(villageShopStatus(state,'casts',now()))}</div>`:''}"),'drawn once, for the lake only, never a button around a button');
 assert.ok(pond.includes("if(refill)refill.hidden=!(phase==='idle'&&c.casts===0);"),'top() only shows or hides it');
 assert.ok(pond.includes("`${lake?waitButton(villageShopStatus(state,'casts',now())):''}<button type=\"button\" class=\"primary-button\" data-card-farm>"),'and on the last catch\'s card');
 assert.match(read('public/world-two.css'),/:is\(#village-square-content,#boat-content\) \.wait-buy-row\{display:flex/);
 assert.match(read('public/pond.css'),/\.pond-refill\{pointer-events:auto\}/);
});

test('the wiki\'s Village topic says it all, the Wind pump\'s price worked out; the Supply cart picture is the owner\'s WebP',async()=>{
 const {wikiArticle}=await import('../public/wiki-content.js');
 const html=wikiArticle('village',{level:165,href:id=>`#${id}`}).html;
 assert.match(html,/Diamonds in the village/);for(const item of Object.values(VILLAGE_SHOP))assert.ok(html.includes(item.name),item.name);
 assert.ok(html.includes(`the whole Wind pump costs ${landmarkFullCost('windpump')}.`));assert.equal(landmarkFullCost('windpump'),459);
 assert.doesNotMatch(wikiArticle('diamonds',{level:165,href:id=>`#${id}`}).html,/Supply cart|Landmark supplies|Five casts/,'the diamonds topic names nothing of World II');
 assert.match(read('public/visual-icons.js'),/'villager-miller',[^\n]*\n 'supply-cart'\];/);
 assert.ok(statSync(new URL('../public/assets/icons/supply-cart.webp',import.meta.url)).size>1000);
 const {art}=await import('../public/visual-icons.js');assert.match(art('supply-cart'),/src="\/assets\/icons\/supply-cart\.webp"/);
});

// Release order: farm-api first, then the site. The game as it is live now (d99e77c0: the coin pack; the site's 601867b9 changed no game
// code) must read a farm the new actions touched, keep what they wrote, play on, and refuse the new actions cleanly.
test('the live game (d99e77c0) reads a farm after every new action, keeps it, plays on and refuses the new actions cleanly',async t=>{
 const old=show('d99e77c0','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 const s=world(165,{stock:{rooftile:10}});
 for(const id of ['supplycart','tilecart','boat','villager','casts','landmark'])act(s,statusAction(s,id));
 const saved=structuredClone(s),copy=structuredClone(saved),t2=now+60000;O.normalizeFarm(copy,t2);
 assert.equal(copy.daily.villagersCalled,1,'the day\'s count, on the same day');
 assert.deepEqual(copy.village.boat,saved.village.boat,'the boat\'s cargo, serial and time');
 assert.deepEqual(copy.village.boards,saved.village.boards,'the called board\'s villager');
 assert.deepEqual([copy.lake.casts,copy.lake.castsAt],[saved.lake.casts,saved.lake.castsAt]);
 assert.deepEqual(copy.village.landmarks.given,saved.village.landmarks.given);
 for(const k of ['village_carts','boat_calls','villager_calls','lake_refills','landmark_supplies'])assert.equal(copy.stats[k],saved.stats[k],k);
 O.farmSummary(copy,t2);O.unlockEntries(copy);O.dailyTasks(copy,t2);O.dailyOrders(copy,t2);
 const play=action=>{try{return O.applyFarmAction(copy,action,t2);}catch(error){if(error instanceof TypeError||error instanceof RangeError||error instanceof ReferenceError)throw error;}};
 play({type:'sell',item:'plank',quantity:1,category:'village'});play({type:'lake_fish',n:copy.lake.n,landed:true,perfect:false});
 const field=copy.plots.findIndex(p=>p.crop&&p.readyAt<=t2);if(field>=0)play({type:'field',id:field,action:'harvest'});
 assert.equal(copy.lake.casts,4,'a lake cast from the five');assert.equal(copy.daily.villagersCalled,1);
 const next=structuredClone(saved);O.normalizeFarm(next,Date.UTC(2026,9,21,1));assert.equal(next.daily.villagersCalled,undefined,'gone the next UTC day');
 for(const action of [{type:'village_cart',cart:'supplycart',expectedCost:40,expectedGoods:{plank:40,ironbar:10}},{type:'boat_now',expectedCost:30},{type:'villager_now',board:1,expectedCost:10},{type:'lake_casts',expectedCost:10},{type:'landmark_supplies',landmark:'longhouse',expectedCost:696,expectedGoods:{}}])
  assert.throws(()=>O.applyFarmAction(structuredClone(saved),action,t2),{message:'Unknown farm action.'},action.type);
 const client=show('d99e77c0','public/farm-client.js');
 if(client){const {instantResult:oldInstant}=await import(asModule(client.replace("from './farm-state.js';",`from '${asModule(old)}';`)));for(const type of TYPES)assert.equal(oldInstant(saved,{type,expectedCost:10},t2),null,type);}
 assert.equal(levelOf(copy),165);
});
