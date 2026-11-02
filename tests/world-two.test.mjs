import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {otherWorldBuilding,createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,unlockEntries,upgradeCost,upgradeRequirements,upgradeGoods,marketHighlights,familyOrder,
 buildingRecipes,marketItems,villageBrief,villageSquareReady,villageRequestGoods,villagePlaceBefore,itemAvailable,questXp,
 BUILDINGS,BUILDING_COSTS,BUILDING_LEVELS,RECIPE_LEVELS,RECIPES,ITEMS,VILLAGE_GOODS,MASTER_UPGRADES,MAX_BUILDING_LEVEL,TOP_BUILDING_LEVEL,WORLD_TWO_TOP_BUILDING,WORLD_TWO_LEVEL,
 VILLAGE_BRIEFS,VILLAGE_BUILD_XP,VILLAGE_UPGRADE_GOODS,VILLAGE_QUESTS,VILLAGERS,VILLAGE_REQUEST_WAIT,QUESTS,DAILY_POOLS,
 villageGood,worldTwoItem,worldTwoBuilding,beyondMaxBuilding,masterUpgrade,doubleBatchChance,worldTwoOpen,recipeLevel,buildingUnlocked,recipeUnlocked,
 CROPS,PRODUCTS,HEIRLOOMS,STARTER_PACK_CROPS,VILLAGE_LANDMARKS,VILLAGE_REQUEST_BOARDS_MAX,VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS,
 VILLAGE_TILES_FROM,VILLAGE_UPGRADE_TILES,BUILDER_CRATE_COINS,VILLAGE_NEVER_ASKED,villageWeek,familyWeek,familyWeekStart,builderCrates,dailyTasks,availableDaily,
 marketQuote,recipeDuration,villageRequestValue,buildingEligible,recipeValue,WORLD_TWO_TOP,VILLAGE_LANDMARK_XP,VILLAGE_HALL_PREMIUM,GREAT_HALL_DIAMONDS,
 VILLAGE_LANDMARK_BONUS,VALLEY_PROJECTS,MARKET_PAYOUT_MULTIPLIER,BOAT_GOODS,BOAT_DIAMONDS,BOAT_DIAMOND_TRIPS,BOAT_RETURN,BOAT_QUAY_RETURN,BOAT_PREMIUM,BOAT_XP_SHARE,
 DEPOT_DIAMONDS,boatValue,boatReturn,landmarkDone,landmarkBonus,villagePremium,exportValue,
 BOAT_GONE,boatReady,boatDiamonds,villageLandmark} from '../game/farm-state.js';
import {EVENT_GOAL_POOLS} from '../public/event-goals.js';
import {EVENT_LEAGUES} from '../public/farm-state.js';

const now=Date.parse('2026-10-05T12:00:00Z');
function farm(level){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=k!=='donkeystable';if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}   // not the farm's Donkey Stable (level 64, 27 Oct 2026): the pinned cargos predate its soap; tests/donkey-stable.test.mjs sails it
 normalizeFarm(s,now);return s;
}
const act=(s,a,t=now,random)=>applyFarmAction(s,a,t,random);
// A farm as a player has it at that level (Oct 2026): the farm's buildings not built yet, none of the village's places; guided or legacy.
function playerFarm(level,mode='guided'){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=400000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};return normalizeFarm(s,now);
}

test('World II opens at level 100: below it none of its places, recipes, goods or upgrades shows',()=>{
 const s=farm(99);
 assert.equal(worldTwoOpen(s),false);
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.equal(buildingUnlocked(s,key),false,key);
 for(const id of Object.keys(RECIPES).filter(id=>recipeLevel(s,id)>=WORLD_TWO_LEVEL))assert.equal(recipeUnlocked(s,id),false,id);
 assert.ok(unlockEntries(s).every(e=>e.level<WORLD_TWO_LEVEL),'the roadmap shows nothing of level 100 and up');
 assert.equal(upgradeCost(s,'bakery'),null,'a level-10 building reads as fully upgraded, as before');
 assert.equal(masterUpgrade(s,'bakery'),null);
 assert.throws(()=>act(s,{type:'sell',item:'all',category:'village'}),/level 100/);
 const w=farm(100);assert.equal(worldTwoOpen(w),true);
 for(const key of ['mine','lumbercamp'])assert.equal(buildingUnlocked(w,key),true,key);
 for(const id of ['packedlunch','digiron','chop','saw'])assert.equal(recipeUnlocked(w,id),true,id);
 assert.equal(recipeUnlocked(w,'smeltiron'),false,'the Smithy waits for 102');
 // Built from the golden brief at the market square (Oct 2026): 75,000 for the Mine and the Lumber Camp, 150,000 for the Smithy, 250,000
 // for the windmill, and the brief's goods (150k / 150k / 200k / 300k in coins only before).
 const fresh=createFarm(now);fresh.xp=xpForLevel(100);fresh.coins=400000;fresh.onboarding={...fresh.onboarding,completed:99,rewardClaimed:true};normalizeFarm(fresh,now);
 assert.equal(buildingUnlocked(fresh,'mine'),false,'eligible, not built yet');
 fresh.inventory.packedlunch=6;const xp=fresh.xp;
 act(fresh,{type:'village_build',place:'mine'});assert.equal(buildingUnlocked(fresh,'mine'),true);
 assert.deepEqual([fresh.coins,fresh.inventory.packedlunch,fresh.xp-xp,fresh.stats.built_mine],[325000,0,VILLAGE_BUILD_XP,1]);assert.equal(VILLAGE_BUILD_XP,250);
 // Levels 110-150 (Oct 2026): eleven briefs in the order the places open, the Village Fields (110) before the Village Windmill (112).
 const places=['mine','lumbercamp','smithy','villagefields','villagemill','canteen','kiln','linenloft','soapmaker','pier','jeweller'];
 assert.deepEqual(VILLAGE_BRIEFS.map(b=>b.place),places);
 assert.deepEqual(places.map(k=>BUILDINGS[k].buildCost),[75000,75000,150000,150000,250000,200000,250000,300000,350000,400000,450000]);
 assert.deepEqual(places.map(k=>BUILDING_COSTS[k]),[75000,75000,150000,150000,250000,200000,250000,300000,350000,400000,450000]);
 assert.deepEqual(places.map(k=>BUILDING_LEVELS[k]),[100,100,102,110,112,113,118,125,135,144,150]);
 assert.deepEqual(VILLAGE_BRIEFS.map(b=>b.villager),[0,1,2,5,3,6,7,8,9,10,11],'each brief\'s villager');
 // Every brief's goods can be made when it opens: from places earlier in the order (or the farm's Kitchen).
 for(const [i,b] of VILLAGE_BRIEFS.entries())for(const k of Object.keys(b.goods)){
  const makers=Object.values(RECIPES).filter(r=>r.output[k]&&r.building!=='factory').map(r=>r.building);
  assert.ok(makers.some(m=>!worldTwoBuilding(m)||places.indexOf(m)<i),`${b.place} asks ${k}`);
 }
 // A game from before the update sends Build: refused, never the old price.
 assert.throws(()=>act(fresh,{type:'construct',building:'lumbercamp'}),/golden brief/);assert.equal(fresh.buildings.lumbercamp.built,false);
 assert.throws(()=>act(playerFarm(99),{type:'construct',building:'mine'}),{message:'Reach level 100.'},'below 100 the old answer, nothing of the village');
});

test('the village goods stay in the village: own market, never in the farm Market, Family Orders or family sharing',async()=>{
 assert.equal(Object.keys(VILLAGE_GOODS).length,25);
 for(const k of Object.keys(VILLAGE_GOODS)){assert.ok(villageGood(k)&&worldTwoItem(k),k);}
 // The goods of levels 110-200 (Oct 2026), appended in this order: requests and cargos follow it. None is a farm crop, product or heirloom,
 // none has a leaderboard; the four village crops move in price like the farm's.
 const added=Object.keys(VILLAGE_GOODS).slice(12);
 assert.deepEqual(added,['potatoes','flax','lavender','saffron','clay','rooftile','linen','builderscrate','lavendersoap','scentedsachet','silvercandlestick','rubyring','saffronbun']);
 assert.deepEqual(added.map(k=>ITEMS[k].sell),[75,110,170,650,70,220,480,6500,560,580,10500,14000,2100]);
 for(const k of added){
  assert.ok(ITEMS[k].noBoard===true&&ITEMS[k].world===2&&ITEMS[k].village===true,k);
  assert.ok(!Object.hasOwn(CROPS,k)&&!Object.hasOwn(PRODUCTS,k)&&!Object.hasOwn(HEIRLOOMS,k)&&!STARTER_PACK_CROPS.includes(k),k);
  assert.equal(ITEMS[k].crop===true,['potatoes','flax','lavender','saffron'].includes(k),k);
 }
 let low=Infinity,high=0;
 for(let d=0;d<365;d++){const q=marketQuote('potatoes',now+d*86400000);assert.equal(q.normal,60);low=Math.min(low,q.price);high=Math.max(high,q.price);assert.ok(q.price/q.normal>=.85&&q.price/q.normal<=1.15,`day ${d}: ${q.price}`);}
 assert.deepEqual([low,high],[51,69],'the crops band, not the goods band');
 const p=farm(110);p.inventory.potatoes=5;assert.throws(()=>act(p,{type:'sell',item:'potatoes'}),/Village market/);
 assert.ok(worldTwoItem('goldenloaf')&&worldTwoItem('heirloompie')&&!villageGood('goldenloaf'),'the farm\'s bakes are World II but sell at the farm Market');
 const s=farm(110);s.inventory.stone=10;s.inventory.wheat=5;
 assert.throws(()=>act(s,{type:'sell',item:'stone'}),/Village market/);
 assert.throws(()=>act(s,{type:'sell',item:'wheat',category:'village'}),/only buys village goods/);
 const before=s.coins;act(s,{type:'sell',item:'all'});assert.equal(s.inventory.stone,10,'selling everything at the farm leaves the village goods');assert.ok(s.coins>before);
 act(s,{type:'sell',item:'stone',category:'village',quantity:4});assert.equal(s.inventory.stone,6);
 act(s,{type:'sell',item:'all',category:'village'});assert.equal(s.inventory.stone,0);
 for(let day=0;day<60;day++)for(const k of Object.keys(familyOrder('f'+day,2900+day,3).lines))assert.ok(!worldTwoItem(k),k);
 for(let d=0;d<30;d++){const h=marketHighlights(now+d*86400000,s);assert.ok(!villageGood(h.today.item)&&!villageGood(h.tomorrow.item));}
 // Valley baskets, Trade Depot exports, fair classes and visitors' orders never ask for World II goods, even with them in reach.
 const src=(await import('node:fs')).readFileSync(new URL('../game/farm-state.js',import.meta.url),'utf8');
 for(const fn of ['function valleyBasket(','function exportContract(','function fairClasses(','function visitorOrder(']){const body=src.slice(src.indexOf(fn),src.indexOf('\n}',src.indexOf(fn)));assert.match(body,/!worldTwoItem\(k\)/,fn);}
});

test('a packed lunch from the farm starts every trip: the chain from the Kitchen to master tools works',()=>{
 const s=farm(108);for(const k of Object.keys(s.inventory))s.inventory[k]=0;
 Object.assign(s.inventory,{bread:2,cheese:2,apples:4});
 let r=act(s,{type:'produce',recipe:'packedlunch'});act(s,{type:'collect',building:'kitchen'},r.readyAt);assert.equal(s.inventory.packedlunch,6);
 r=act(s,{type:'produce',recipe:'digiron'});assert.equal(s.inventory.packedlunch,5);act(s,{type:'collect',building:'mine'},r.readyAt);
 assert.deepEqual([s.inventory.ironore,s.inventory.stone],[5,4]);
 assert.throws(()=>act(s,{type:'produce',recipe:'digsilver'}),/Missing ingredients/,'silver needs pickaxes from the Smithy');
 for(const [id,building] of [['chop','lumbercamp'],['saw','lumbercamp'],['smeltiron','smithy']]){
  r=act(s,{type:'produce',recipe:id},r.readyAt);act(s,{type:'collect',building,jobId:r.jobId},r.readyAt);
 }
 assert.equal(s.inventory.ironbar,1);assert.equal(s.inventory.plank,2);
});

test('past level 10 with master tools: one level at farm level 108, 120, 140, 160 and 180, up to 15',()=>{
 // Since 30 Oct 2026 World III takes them on to 20 (tests/levels-twenty.test.mjs); World II's own top is 15.
 assert.equal(TOP_BUILDING_LEVEL,20);assert.equal(WORLD_TWO_TOP_BUILDING,15);assert.deepEqual(MASTER_UPGRADES.map(u=>u.level),[108,120,140,160,180]);
 assert.deepEqual(MASTER_UPGRADES.map(u=>u.materials.mastertools),[1,2,3,4,5]);
 assert.ok(beyondMaxBuilding('bakery')&&!beyondMaxBuilding('factory')&&!beyondMaxBuilding('mine')&&!beyondMaxBuilding('farmhouse'));
 const s=farm(105);
 assert.deepEqual(upgradeRequirements(s,'bakery'),{level:108,materials:{mastertools:1,plank:20,stone:30}});
 assert.throws(()=>act(s,{type:'upgrade',building:'bakery'}),/Reach level 108/);
 const t=farm(108);Object.assign(t.inventory,{mastertools:1,plank:20,stone:30});
 assert.equal(upgradeCost(t,'bakery'),750000);
 const coins=t.coins;act(t,{type:'upgrade',building:'bakery'});
 assert.equal(t.buildings.bakery.level,11);assert.equal(t.buildings.bakery.beyond,1);assert.equal(t.coins,coins-750000);
 assert.deepEqual([t.inventory.mastertools,t.inventory.plank,t.inventory.stone],[0,0,0]);assert.equal(t.stats.beyond_upgrades,1);
 assert.throws(()=>act(t,{type:'upgrade',building:'bakery'}),/Reach level 120/);
 assert.equal(upgradeCost(t,'factory'),null,'the Factory stops at 10');
 // An old save with levels past 10 from before 26 Sep 2026 keeps only what master tools bought.
 const old=farm(150);old.buildings.dairy.level=20;old.buildings.bakery.level=13;old.buildings.bakery.beyond=1;normalizeFarm(old,now);
 assert.equal(old.buildings.dairy.level,10);assert.equal(old.buildings.bakery.level,11);
});

test('every level past 10 gives a batch a 10% chance to come out double, decided when it starts',()=>{
 assert.deepEqual([9,10,11,13,15,20,25].map(doubleBatchChance),[0,0,.1,.3,.5,1,1],'every batch double at 20 (World III, 30 Oct 2026)');
 const s=farm(120);s.buildings.bakery.level=12;s.buildings.bakery.beyond=2;Object.assign(s.inventory,{flour:40,milk:20});
 const lucky=act(s,{type:'produce',recipe:'bread'},now,()=>.1);assert.equal(lucky.double,true);
 const plain=act(s,{type:'produce',recipe:'bread'},now,()=>.25);assert.equal(plain.double,undefined);
 const got=act(s,{type:'collect',building:'bakery',jobId:lucky.jobId},lucky.readyAt);assert.deepEqual(got.items,{bread:4},'2 bread doubled');
 assert.deepEqual(act(s,{type:'collect',building:'bakery',jobId:plain.jobId},plain.readyAt).items,{bread:2});
 const v=farm(120);v.buildings.mine.level=10;v.inventory.packedlunch=5;
 assert.equal(act(v,{type:'produce',recipe:'digiron'},now,()=>0).double,undefined,'the village\'s places never double');
});

test('every World II recipe is worth making: 40% on top and 120 coins an hour, at least 2 of each mixed ingredient',async()=>{
 const {recipeValue}=await import('../game/farm-state.js');
 for(const id of Object.keys(RECIPES).filter(id=>(RECIPES[id].minLevel??0)>=WORLD_TWO_LEVEL&&RECIPES[id].building!=='factory')){
  const v=recipeValue(id),r=RECIPES[id];
  assert.ok(v.output/v.input>=1.4,id);assert.ok(v.added/(r.duration/3600000)>=120,id);
  if(Object.keys(r.input).length>1)assert.ok(Object.values(r.input).every(n=>n>=2),id);
  assert.ok(Object.keys(r.input).concat(Object.keys(r.output)).every(k=>ITEMS[k]),id);
 }
 assert.equal(levelOf(farm(200)),200);
});

test('the village keeps its own count and its own quests: batches, sales and quests apart from the farm\'s',async()=>{
 const {VILLAGE_QUESTS,QUESTS,worldTwoItem:w2}=await import('../game/farm-state.js');
 // Every village quest counts something of the village (its goods, places, batches, market) or the master levels, from level 100.
 for(const q of VILLAGE_QUESTS){
  assert.ok(q.minLevel>=WORLD_TWO_LEVEL,q.title);
  const [,kind,key]=q.stat.match(/^(made|built)_(.+)$/)??[];
  assert.ok(kind==='made'?w2(key):kind==='built'?worldTwoBuilding(key):['village_batches','village_sold','village_earned','village_requests','beyond_upgrades','market_crates','builder_crates_used','boat_trips','village_landmarks','lake_fish','lake_fish_kinds','caught_oldgranite'].includes(q.stat),q.stat);
  if(kind==='made'){const opens=Math.min(...Object.values(RECIPES).filter(r=>r.output[key]&&r.building!=='factory').map(r=>r.minLevel??0));assert.ok(q.minLevel>=opens,`${q.title} opens with its recipe`);}
 }
 assert.ok(!QUESTS.some(q=>/^village_|beyond_upgrades/.test(q.stat)),'the farm\'s quests stay the farm\'s');
 const s=farm(110);Object.assign(s.inventory,{packedlunch:10,stone:20});
 const produced=s.stats.produced??0,sold=s.stats.sold??0;
 const r=act(s,{type:'produce',recipe:'digiron'});act(s,{type:'collect',building:'mine'},r.readyAt);
 assert.deepEqual([s.stats.village_batches,s.stats.produced??0],[1,produced],'a village batch is the village\'s');
 const sale=act(s,{type:'sell',item:'stone',category:'village',quantity:5},r.readyAt);
 assert.deepEqual([s.stats.village_sold,s.stats.village_earned,s.stats.sold??0],[5,sale.coins,sold],'so is a village sale');
 // A village quest: claimed once, only when done and open, and never among the farm's claimed quests.
 const first=VILLAGE_QUESTS.findIndex(q=>q.stat==='village_batches');
 const low=farm(99);low.stats.village_batches=50;assert.throws(()=>act(low,{type:'village_quest',id:first}),/Reach level 100/);
 s.stats.village_batches=VILLAGE_QUESTS[first].target;const coins=s.coins,claimed=[...s.claimed];
 const got=act(s,{type:'village_quest',id:first});assert.equal(s.coins,coins+VILLAGE_QUESTS[first].reward);assert.ok(got.xp>0);
 assert.deepEqual(s.villageQuests,[first]);assert.deepEqual(s.claimed,claimed);
 assert.throws(()=>act(s,{type:'village_quest',id:first}),/already been claimed/);
 const late=VILLAGE_QUESTS.findIndex(q=>q.minLevel>110);s.stats[VILLAGE_QUESTS[late].stat]=1e9;assert.throws(()=>act(s,{type:'village_quest',id:late}),/Reach level/);
 s.villageQuests.push(999,'x',first);normalizeFarm(s,now);assert.deepEqual(s.villageQuests,[first]);
});

// Phase 0 of World II's market square (Oct 2026): nothing of the village shows below level 100, on guided farms and on legacy farms
// (rank 2 at level 108 is one). The wiki and the Market screen read these rules (buildingRecipes, marketItems).
function legacyFarm(level){
 const s=createFarm(now);s.progression={mode:'legacy'};s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=k!=='donkeystable';if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}   // not the farm's Donkey Stable (level 64, 27 Oct 2026): the pinned cargos predate its soap; tests/donkey-stable.test.mjs sails it
 return normalizeFarm(s,now);
}
// What every farm's market square starts with (Oct 2026): no boards, an empty market week, no boat and no landmark.
const VILLAGE_DEFAULT={serial:0,boards:[],week:{week:null,helped:0,paid:false},boat:{serial:0,cargo:null,readyAt:0,trips:0,week:null,paid:0},landmarks:{done:[],given:{}},miller:{week:null}};   // the miller's order: 17 Oct 2026
test('level 99 sees nothing new, guided and legacy: no recipe, Market good, highlight, quest, board or village action of World II',()=>{
 const stats=new Set(['village_requests','village_sold','village_earned','market_crates','builder_crates_used','boat_loaded','boat_trips','boat_coins','village_landmarks']);
 const production=Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].type==='production'&&!worldTwoBuilding(k));
 assert.ok(production.includes('factory'));
 for(const s of [farm(99),legacyFarm(99),playerFarm(99),playerFarm(99,'legacy')]){
  const mode=s.progression.mode;Object.assign(s.inventory,{goldenloaf:3,heirloompie:2});   // even with the bakes in stock (a gift)
  assert.ok(unlockEntries(s).every(e=>e.level<WORLD_TWO_LEVEL),mode);
  for(const key of production)for(const id of buildingRecipes(s,key)){
   assert.ok(recipeLevel(s,id)<WORLD_TWO_LEVEL,`${mode} ${key} lists ${id}`);
   assert.ok(Object.keys(RECIPES[id].output).every(k=>!worldTwoItem(k)),`${mode} ${key} shows what ${id} makes`);
  }
  assert.ok(buildingRecipes(s,'kitchen').includes('stew')&&buildingRecipes(s,'factory').includes('mass_bread'),'the rest stays listed');
  for(const tab of ['crops','goods'])assert.ok(marketItems(s,tab).length&&marketItems(s,tab).every(k=>!worldTwoItem(k)),`${mode} ${tab}`);
  for(let d=0;d<30;d++){const h=marketHighlights(now+d*86400000,s);assert.ok(!worldTwoItem(h.today.item)&&!worldTwoItem(h.tomorrow.item),`${mode} day ${d}`);}
  assert.deepEqual(s.village,VILLAGE_DEFAULT,mode);
  assert.ok(!unlockEntries(s).some(e=>e.id==='village:week'),`${mode}: no Market week`);
  // Builder's crates (Oct 2026): none below level 100, even with crates in stock (a gift), and an upgrade sent with crates is refused.
  s.inventory.builderscrate=50;
  for(const key of Object.keys(BUILDINGS))assert.equal(builderCrates(s,key),0,`${mode} ${key}`);
  const dairy=structuredClone(s);Object.assign(dairy.buildings.dairy,{built:true,level:6});normalizeFarm(dairy,now);const kept=structuredClone(dairy);
  assert.throws(()=>act(dairy,{type:'upgrade',building:'dairy',crates:1}),{message:'Your builder’s crates have changed. Look at the upgrade again.'},mode);
  assert.deepEqual(dairy,kept,`${mode}: nothing changes`);
  // No daily of the village is drawn below level 100 (they come last in their pools, from level 100).
  const day=structuredClone(s);
  for(let d=0;d<60;d++){delete day.daily;assert.ok(dailyTasks(day,now+d*86400000).every(q=>!stats.has(q.stat)),`${mode} day ${d}`);}
  for(const action of [{type:'village_deliver',board:0,request:1,input:{stone:1}},{type:'village_skip',board:0,request:1},{type:'village_build',place:'mine'},
   {type:'boat_load',cargo:1,input:{linen:1}},{type:'boat_skip',cargo:1},{type:'landmark_give',landmark:'windpump'},{type:'landmark_finish',landmark:'windpump'}])   // the town boat and the landmarks too
   assert.throws(()=>act(s,action),{message:'Reach level 100 to trade in the village.'},`${mode} ${action.type}`);
  assert.equal(villageSquareReady(s),false);assert.equal(villageLandmark(s),null);assert.equal(boatReady(s),false);
 }
 // No farm quest or event goal counts the market square (the village's own quests open at 100); the dailies that do open at 100.
 assert.ok(!QUESTS.some(q=>stats.has(q.stat)));assert.ok(DAILY_POOLS.flat().filter(q=>stats.has(q.stat)).every(q=>q.minLevel>=WORLD_TWO_LEVEL));
 // 20 Oct 2026: the village leagues (from level 100) do; a farm league never.
 assert.ok(!EVENT_GOAL_POOLS.filter((p,i)=>EVENT_LEAGUES[i].world===1).flat(2).some(g=>stats.has(g.stat)));
 // From 100 the village is open: the Kitchen lists packed lunches (and the heirloom pie of 115 under "Coming later"), the Market the bakes.
 for(const s of [farm(100),legacyFarm(100)]){
  assert.ok(buildingRecipes(s,'kitchen').includes('packedlunch')&&buildingRecipes(s,'kitchen').includes('heirloompie'));
  assert.ok(buildingRecipes(s,'factory').includes('mass_packedlunch'));
  s.inventory.goldenloaf=1;assert.ok(marketItems(s,'goods').includes('goldenloaf'));
  assert.ok(marketItems(s,'village').every(villageGood));
 }
});

// The screens' half of it (Oct 2026): How to play finds, lists and opens nothing of World II below level 100 (a link from the chat opens
// its home page), and the building and Market screens list what the rules above list.
test('level 99 sees nothing new in How to play or on the screens: no search hit, topic, link or listed recipe of World II',async()=>{
 const {wikiSearch,wikiGroups,wikiArticle,WIKI_TOPICS}=await import('../public/wiki-content.js');
 const {readFileSync}=await import('node:fs'),read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
 const names=[...Object.values(VILLAGE_GOODS).map(g=>g.name),...Object.keys(BUILDINGS).filter(worldTwoBuilding).map(k=>BUILDINGS[k].name),'Golden loaf','Heirloom pie','village','master tools','market square','golden brief'];
 for(const name of names){
  assert.deepEqual(wikiSearch(name,{level:99}),[],name);
  assert.ok(wikiSearch(name,{level:100}).length>=1,`${name} at 100`);assert.ok(wikiSearch(name).length>=1,`${name} on the website`);
 }
 const ctx={level:99,href:id=>`#wiki-${id}`};
 assert.doesNotMatch(wikiGroups(ctx),/data-wiki-topic="village"/);assert.equal(wikiArticle('village',ctx),null);
 // The Harbour (World III, from level 200) is hidden at 99 too.
 assert.equal(wikiArticle('harbour',ctx),null);
 for(const t of WIKI_TOPICS.filter(t=>t.id!=='village'&&t.id!=='harbour')){
  const a=wikiArticle(t.id,ctx);
  assert.doesNotMatch(a.html,/data-wiki-topic="village"|market square|golden brief|packed lunch|master tools|heirloom pie|golden loaf|from the village/i,t.id);
  assert.ok(a.related.every(r=>r.id!=='village'),t.id);
 }
 assert.match(wikiArticle('buildings',{level:100}).html,/master tools/);
 // The building windows and the Market list what buildingRecipes and marketItems list; the wiki's search gets the farmer's level.
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const previewEntries=buildingRecipes\(state,key\)\.filter\(id=>recipeUnlocked\(preview,id\)\)/,'the build panel\'s recipes');
 assert.match(ui,/const all=buildingRecipes\(state,key\),outputs=ids=>/,'its Makes and Coming later pictures');
 assert.match(ui,/const recipeEntries=buildingRecipes\(state,key\)\.map/,'a built building\'s list and its Coming later');
 assert.match(ui,/function marketEntries\(\)\{return marketItems\(state,marketTab\)\.map\(k=>\[k,ITEMS\[k\]\]\);\}/,'the Market tabs');
 assert.doesNotMatch(ui,/Object\.(entries|values)\(RECIPES\)\.filter/,'no screen lists a building\'s recipes on its own');
 assert.match(read('public/wiki-ui.js'),/hits=wikiSearch\(q,\{level:ctx\(\)\.level\}\)/);
 // The signpost and the closed bridge on the farm stay from level 90.
 assert.match(read('public/game.js'),/const shown=levelProgress\(state\)\.level>=WORLD_TWO_TEASER;v\.object\.visible=shown;/);
});

test('every village place and recipe has its level, so a guided farm never opens one at level 1',()=>{
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.ok(BUILDING_LEVELS[key]>=WORLD_TWO_LEVEL&&BUILDING_LEVELS[key]===BUILDINGS[key].minLevel,key);
 const village=Object.keys(RECIPES).filter(id=>RECIPES[id].building!=='factory'&&(worldTwoBuilding(RECIPES[id].building)||Object.keys(RECIPES[id].output).some(worldTwoItem)));
 assert.ok(village.length>=13);
 for(const id of village)assert.ok(RECIPE_LEVELS[id]===RECIPES[id].minLevel&&RECIPE_LEVELS[id]>=WORLD_TWO_LEVEL,id);
});

test('village places upgrade with planks and stone; the places that open from level 125 take roof tiles too',()=>{
 assert.deepEqual(VILLAGE_UPGRADE_GOODS,{plank:4,stone:6});assert.deepEqual([VILLAGE_TILES_FROM,VILLAGE_UPGRADE_TILES],[125,2]);
 const production=Object.keys(BUILDINGS).filter(k=>worldTwoBuilding(k)&&BUILDINGS[k].type==='production'),tiled=[];
 assert.equal(production.length,10);
 for(const key of production){
  const tiles=BUILDING_LEVELS[key]>=VILLAGE_TILES_FROM;if(tiles)tiled.push(key);
  for(let level=1;level<=10;level++)assert.ok(Object.keys(upgradeGoods(key,level)).every(k=>k==='plank'||k==='stone'||tiles&&k==='rooftile'),`${key} ${level}`);
  for(const level of [1,2,10])assert.deepEqual(upgradeGoods(key,level),{},`${key} ${level}`);
  const total={plank:0,stone:0,...(tiles?{rooftile:0}:{})};for(let level=3;level<=9;level++)for(const [k,n] of Object.entries(upgradeGoods(key,level)))total[k]+=n;
  assert.deepEqual(total,{plank:168,stone:252,...(tiles?{rooftile:84}:{})},key);
 }
 assert.deepEqual(tiled,['linenloft','soapmaker','jeweller']);
 assert.deepEqual(upgradeGoods('pier',5),{},'the Pier never upgrades');
 assert.deepEqual(upgradeGoods('villagemill',6),{plank:24,stone:36},'not 72 heirloom flour any more');
 assert.deepEqual(upgradeGoods('kiln',6),{plank:24,stone:36});assert.deepEqual(upgradeGoods('linenloft',6),{plank:24,stone:36,rooftile:12});
 const v=farm(125);v.buildings.linenloft.level=6;v.boosts.upgradeCredits=1;
 assert.deepEqual(upgradeRequirements(v,'linenloft').materials,{plank:12,stone:18,rooftile:6});assert.equal(upgradeCost(v,'linenloft'),105039);
 // A level-125 farm without roof tiles still upgrades its older places; the Linen Loft waits for its tiles.
 const w=farm(125);for(const k of Object.keys(w.inventory))w.inventory[k]=0;Object.assign(w.inventory,{plank:44,stone:66,rooftile:9});
 w.buildings.mine.level=5;w.buildings.linenloft.level=5;
 act(w,{type:'upgrade',building:'mine'});assert.deepEqual([w.buildings.mine.level,w.inventory.plank,w.inventory.stone],[6,24,36]);
 assert.throws(()=>act(w,{type:'upgrade',building:'linenloft'}),{message:'Make the goods first: 10 Roof tile.'});
 w.inventory.rooftile=10;const coins=w.coins;act(w,{type:'upgrade',building:'linenloft'});
 assert.deepEqual([w.buildings.linenloft.level,coins-w.coins,w.inventory.plank,w.inventory.stone,w.inventory.rooftile],[6,161598,4,6,0]);
 const s=farm(110);s.buildings.mine.level=6;s.boosts.upgradeCredits=1;
 assert.deepEqual(upgradeRequirements(s,'mine').materials,{plank:12,stone:18},'the Buildings discount halves them');
 const t=farm(110);t.buildings.smithy.level=3;Object.assign(t.inventory,{plank:12,stone:18});
 act(t,{type:'upgrade',building:'smithy'});assert.deepEqual([t.buildings.smithy.level,t.inventory.plank,t.inventory.stone],[4,0,0]);
});

test('one golden brief at a time, guided and legacy: the Mine, the Lumber Camp, the Smithy at 102, the Fields at 110, the windmill at 112, the Canteen at 113, the Kiln at 118 and the Linen Loft at 125',()=>{
 for(const mode of ['guided','legacy']){
  const s=playerFarm(100,mode);s.coins=10000000;
  assert.equal(villageBrief(s).place,'mine',mode);assert.equal(villageBrief(s).title,'The miners’ lunch');
  assert.deepEqual([villageBrief(s).coins,villageBrief(s).level,villageBrief(s).open,villageBrief(s).ready],[75000,100,true,false]);
  assert.deepEqual(villageBrief(s).missing,{packedlunch:6});
  assert.throws(()=>act(s,{type:'village_build',place:'lumbercamp'}),{message:'Build the Mine first: one golden brief at a time.'},mode);
  assert.throws(()=>act(s,{type:'village_build',place:'mine'}),{message:'Gather the missing supplies: 6 Packed lunch.'},mode);
  assert.throws(()=>act(s,{type:'village_build',place:'barn'}),{message:'Choose a village place.'});
  assert.throws(()=>act(s,{type:'village_build',place:'familyhall'}),/Choose a village place/);
  s.inventory.packedlunch=12;assert.equal(villageBrief(s).ready,true);
  const poor=structuredClone(s);poor.coins=74999;assert.throws(()=>act(poor,{type:'village_build',place:'mine'}),{message:'You need 75,000 coins to build the Mine.'});
  assert.equal(villageBrief(poor).short,1);
  let coins=s.coins;assert.deepEqual(act(s,{type:'village_build',place:'mine'}),{place:'mine',name:'Mine',coins:75000,goods:{packedlunch:6},xp:250});
  assert.equal(s.coins,coins-75000);assert.throws(()=>act(s,{type:'village_build',place:'mine'}),{message:'The Mine is already built.'});
  assert.equal(villageBrief(s).place,'lumbercamp');act(s,{type:'village_build',place:'lumbercamp'});
  assert.equal(s.inventory.packedlunch,0);assert.equal(s.stats.built_lumbercamp,1);
  Object.assign(s.inventory,{ironore:20,timber:20});
  assert.equal(villageBrief(s).open,false);assert.throws(()=>act(s,{type:'village_build',place:'smithy'}),{message:'Reach level 102.'},mode);
  s.xp=xpForLevel(102);assert.deepEqual(villageBrief(s).goods,{ironore:20,timber:20});
  coins=s.coins;act(s,{type:'village_build',place:'smithy'});assert.deepEqual([s.coins,s.inventory.ironore,s.inventory.timber],[coins-150000,0,0]);
  // The Village Fields (Oct 2026) open at 110, before the windmill: its brief waits for them.
  Object.assign(s.inventory,{plank:30,stone:40});
  assert.throws(()=>act(s,{type:'village_build',place:'villagemill'}),{message:'Build the Village Fields first: one golden brief at a time.'},mode);
  s.xp=xpForLevel(109);assert.deepEqual([villageBrief(s).place,villageBrief(s).open,villageBrief(s).level],['villagefields',false,110]);
  assert.throws(()=>act(s,{type:'village_build',place:'villagefields'}),{message:'Reach level 110.'},mode);
  s.xp=xpForLevel(110);assert.equal(villageBrief(s).title,'Rows by the hay barns');
  const poorer=structuredClone(s);poorer.coins=149999;assert.throws(()=>act(poorer,{type:'village_build',place:'villagefields'}),{message:'You need 150,000 coins to build the Village Fields.'});
  const bare=structuredClone(s);bare.inventory.plank=0;assert.throws(()=>act(bare,{type:'village_build',place:'villagefields'}),{message:'Gather the missing supplies: 20 Plank.'});
  assert.deepEqual(act(s,{type:'village_build',place:'villagefields'}),{place:'villagefields',name:'Village Fields',coins:150000,goods:{plank:20,stone:30},xp:250});
  assert.equal(s.stats.built_villagefields,1);
  assert.throws(()=>act(s,{type:'village_build',place:'villagefields'}),{message:'The Village Fields are already built.'},'one name in the plural');
  Object.assign(s.inventory,{plank:30,stone:40});
  assert.throws(()=>act(s,{type:'village_build',place:'villagemill'}),{message:'Reach level 112.'},mode);
  s.xp=xpForLevel(112);coins=s.coins;act(s,{type:'village_build',place:'villagemill'});
  assert.deepEqual([s.coins,s.inventory.plank,s.inventory.stone,buildingUnlocked(s,'villagemill')],[coins-250000,0,0,true]);
  // The Miners' Canteen at 113, then the Potter's Kiln at 118 and the Linen Loft at 125.
  assert.deepEqual([villageBrief(s).place,villageBrief(s).open],['canteen',false]);
  assert.throws(()=>act(s,{type:'village_build',place:'canteen'}),{message:'Reach level 113.'},mode);
  s.xp=xpForLevel(113);Object.assign(s.inventory,{plank:30});
  assert.throws(()=>act(s,{type:'village_build',place:'canteen'}),{message:'Gather the missing supplies: 10 Iron bar.'},mode);
  s.inventory.ironbar=10;const broke=structuredClone(s);broke.coins=1000;
  assert.throws(()=>act(broke,{type:'village_build',place:'canteen'}),{message:'You need 200,000 coins to build the Miners’ Canteen.'});
  assert.deepEqual(act(s,{type:'village_build',place:'canteen'}),{place:'canteen',name:'Miners’ Canteen',coins:200000,goods:{plank:30,ironbar:10},xp:250});
  assert.deepEqual([villageBrief(s).place,villageBrief(s).open,villageBrief(s).villager],['kiln',false,7]);
  s.xp=xpForLevel(117);Object.assign(s.inventory,{stone:60,ironbar:20,rooftile:40,plank:40});
  assert.throws(()=>act(s,{type:'village_build',place:'kiln'}),{message:'Reach level 118.'},mode);
  assert.throws(()=>act(s,{type:'village_build',place:'linenloft'}),{message:'Build the Potter’s Kiln first: one golden brief at a time.'},mode);
  s.xp=xpForLevel(118);coins=s.coins;const xp=s.xp;
  assert.deepEqual(act(s,{type:'village_build',place:'kiln'}),{place:'kiln',name:'Potter’s Kiln',coins:250000,goods:{stone:60,ironbar:20},xp:250});
  assert.deepEqual([coins-s.coins,s.xp-xp,s.stats.built_kiln,s.inventory.stone,s.inventory.ironbar],[250000,250,1,0,0]);
  assert.equal(villagePlaceBefore(s,'soapmaker'),'linenloft');
  s.xp=xpForLevel(124);assert.throws(()=>act(s,{type:'village_build',place:'linenloft'}),{message:'Reach level 125.'},mode);
  s.xp=xpForLevel(125);coins=s.coins;
  assert.deepEqual(act(s,{type:'village_build',place:'linenloft'}),{place:'linenloft',name:'Linen Loft',coins:300000,goods:{rooftile:40,plank:40},xp:250});
  assert.deepEqual([coins-s.coins,s.inventory.rooftile,s.inventory.plank,s.stats.built_linenloft],[300000,0,0,1]);
  assert.deepEqual([villageBrief(s).place,villageBrief(s).open,villageBrief(s).level],['soapmaker',false,135]);
  // Every place built: no brief (the landmarks take the slot then).
  for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))s.buildings[key].built=true;
  assert.equal(villageBrief(s),null,'every place built: no brief');
 }
});

test('a farm that already built a place keeps it, its level and its batch; the briefs start at the first place it lacks',()=>{
 const s=playerFarm(112);s.coins=10000000;
 Object.assign(s.buildings.smithy,{built:true,level:3,job:{id:'smithy-1',recipe:'smeltiron',startedAt:now-1000,readyAt:now+3600000,output:{ironbar:1},xp:50},batchSequence:1});
 const smithy=structuredClone(s.buildings.smithy);normalizeFarm(s,now+1000);
 assert.deepEqual(s.buildings.smithy,smithy,'unchanged, the batch keeps the XP it started with');
 assert.equal(villageBrief(s).place,'mine');
 assert.throws(()=>act(s,{type:'village_build',place:'smithy'}),/already built/);
 assert.throws(()=>act(s,{type:'village_build',place:'villagemill'}),/Build the Mine first/);
 s.inventory.packedlunch=12;act(s,{type:'village_build',place:'mine'});act(s,{type:'village_build',place:'lumbercamp'});
 assert.equal(villageBrief(s).place,'villagefields','the Smithy is skipped: it is built');
});

test('old farms load unchanged: an empty market square, nothing else moves; normalizing twice changes nothing; junk is cleaned up',async()=>{
 const {createLegacyFarm}=await import('./legacy-farm.mjs');
 for(const s of [createLegacyFarm(now),playerFarm(60),farm(112),legacyFarm(108)]){
  delete s.village;const before=structuredClone(s);normalizeFarm(s,now);
  for(const key of ['coins','inventory','buildings','xp','stats','diamonds'])assert.deepEqual(s[key],before[key],key);
  if(!worldTwoOpen(s))assert.deepEqual(s.village,VILLAGE_DEFAULT);else{assert.equal(s.village.boards.length,levelOf(s)>=104?3:2);assert.deepEqual({...s.village,serial:0,boards:[]},VILLAGE_DEFAULT);}
  const village=structuredClone(s.village);normalizeFarm(s,now);assert.deepEqual(s.village,village,'idempotent');
 }
 // A save from before levels 110-200 (Oct 2026): no market week, boat or landmarks, none of the 13 goods or 7 places. Every old key stays.
 const NEW_GOODS=Object.keys(VILLAGE_GOODS).slice(12),NEW_PLACES=['villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller'];
 for(const s of [farm(112),legacyFarm(108),farm(150)]){
  s.village={serial:s.village.serial,boards:s.village.boards};for(const k of NEW_GOODS)delete s.inventory[k];for(const k of NEW_PLACES)delete s.buildings[k];
  const before=structuredClone(s);normalizeFarm(s,now);
  for(const key of ['coins','xp','stats','diamonds'])assert.deepEqual(s[key],before[key],key);
  for(const [k,n] of Object.entries(before.inventory))assert.equal(s.inventory[k],n,k);
  for(const [k,b] of Object.entries(before.buildings))assert.deepEqual(s.buildings[k],b,k);
  for(const k of NEW_GOODS)assert.equal(s.inventory[k],0,k);
  for(const k of NEW_PLACES)assert.deepEqual(s.buildings[k],{level:1,job:null,built:false,extraJobs:[],batchSequence:0},k);
  assert.deepEqual(s.village.boards,before.village.boards,'the villagers stay');assert.equal(s.village.serial,before.village.serial);
  assert.deepEqual({...s.village,serial:0,boards:[]},VILLAGE_DEFAULT);
  const again=structuredClone(s);normalizeFarm(again,now);assert.deepEqual(again,s,'idempotent');
 }
 const junk=()=>({serial:-3,boards:[5,{request:{id:'x'}},{request:{id:2,villager:0,input:{stone:'a'},value:1,coins:1,xp:1}},{},{},{}],extra:1,
  week:{week:2961,helped:'x',paid:true},boat:{serial:-1,cargo:{id:3,input:{potatoes:5},loaded:{potatoes:0},value:375,coins:600,xp:9},readyAt:5,trips:2.5,week:'w',paid:99},
  landmarks:{done:['longhouse','windpump'],given:{rooftile:9999,plank:5,linen:3}}});
 const low=farm(99);low.village=junk();normalizeFarm(low,now);
 assert.deepEqual(low.village,{serial:0,boards:[{request:null,readyAt:0},{request:null,readyAt:0}],week:{week:2961,helped:0,paid:false},
  boat:{serial:0,cargo:null,readyAt:5,trips:0,week:null,paid:0},landmarks:{done:['windpump','longhouse'],given:{plank:5}},miller:{week:null}},'below 100 nothing fills; junk is cleaned up');
 for(const bad of ['x',[1,2],null,{boards:'x'},{serial:1.5,boards:[{request:{id:1,villager:99,input:{stone:1},value:45,coins:68,xp:1}}]}]){
  const s=farm(99);s.village=bad;normalizeFarm(s,now);assert.ok(s.village.boards.every(b=>b.request===null),JSON.stringify(bad));
 }
 // Never a third villager below level 104, also when an old save holds three boards.
 const hundred=farm(100);hundred.village=junk();normalizeFarm(hundred,now);
 assert.equal(hundred.village.boards.length,2);assert.ok(hundred.village.boards.every(b=>b.request));assert.equal(hundred.village.serial,2);
 const kept=farm(104);kept.village={serial:3,boards:[{request:{id:7,villager:0,input:{stone:10},value:450,coins:675,xp:9},readyAt:0}]};normalizeFarm(kept,now);
 assert.deepEqual(kept.village.boards[0].request,{id:7,villager:0,input:{stone:10},value:450,coins:675,xp:9},'a good request is kept');
 assert.deepEqual(kept.village.boards.slice(1).map(b=>b.request.id),[8,9],'and the next ids never repeat it');
});

test('the market square lights up only when there is something to do: a brief to build or a villager to help',()=>{
 assert.equal(villageSquareReady(farm(99)),false);
 const s=farm(110);for(const k of Object.keys(s.inventory))s.inventory[k]=0;
 assert.equal(villageBrief(s),null);assert.ok(s.village.boards.every(b=>b.request));assert.equal(villageSquareReady(s),false,'nothing in stock');
 Object.assign(s.inventory,s.village.boards[1].request.input);assert.equal(villageSquareReady(s),true,'a villager can be helped');
 const b=playerFarm(100);for(const board of b.village.boards){board.request=null;board.readyAt=now+VILLAGE_REQUEST_WAIT;}
 assert.equal(villageSquareReady(b),false,'the brief is not ready yet');
 b.inventory.packedlunch=6;assert.equal(villageSquareReady(b),true,'the brief can be built');
 b.coins=1000;assert.equal(villageSquareReady(b),false);
});

test('the market square\'s quests come after the others, so every claimed quest keeps its place',()=>{
 assert.equal(VILLAGE_QUESTS[0].title,'Lunch for the road');assert.equal(VILLAGE_QUESTS[26].title,'A valley of masters');
 const added=VILLAGE_QUESTS.slice(27,31);
 assert.deepEqual(added.map(q=>[q.stat,q.target,q.reward,q.minLevel]),[['village_requests',1,10000,100],['village_requests',10,30000,100],['village_requests',50,100000,104],['village_requests',200,250000,120]]);
 assert.deepEqual(added.map(questXp),[47,82,150,237]);
 const titles=[...QUESTS,...VILLAGE_QUESTS].map(q=>q.title.toLowerCase().replace(/’/g,'\''));
 assert.equal(new Set(titles).size,titles.length,'every quest title once');
 assert.ok(!titles.some(t=>/favourite/.test(t)&&/village/.test(t)),'nothing close to "The valley\'s favourite"');
 const s=farm(110);s.villageQuests=[0];s.stats.village_requests=10;
 act(s,{type:'village_quest',id:28});assert.deepEqual(s.villageQuests,[0,28]);
 assert.throws(()=>act(s,{type:'village_quest',id:29}),/Finish this quest/);
});

// A good's village place (Oct 2026): the village place that makes it, none for a good the farm's own buildings make (packed lunches).
const placeOf=k=>Object.values(RECIPES).some(r=>r.output[k]&&r.building!=='factory'&&!worldTwoBuilding(r.building))?undefined:Object.values(RECIPES).find(r=>r.output[k]&&worldTwoBuilding(r.building))?.building;
test('a request\'s villager and lines stay the same after a save reorders its goods; the newest place among its goods names the villager',()=>{
 let lunchFirst=0;
 for(const [level,stock] of [[101,{}],[101,{packedlunch:100}],[113,{potatoes:200}],[130,{ironbar:10,plank:50}],[130,{}]]){
 const s=farm(level);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,stock);s.village={serial:0,boards:[]};
 for(let i=0;i<40;i++){
  normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
  for(const b of s.village.boards){
   const r=b.request,places=Object.keys(VILLAGE_GOODS).filter(k=>r.input[k]).map(placeOf).filter(Boolean).sort((a,c)=>BUILDING_LEVELS[c]-BUILDING_LEVELS[a]);
   assert.equal(VILLAGERS[r.villager].place,places[0]??'villagemarket',JSON.stringify(r));
   if(Object.keys(r.input)[0]==='packedlunch'&&places.length)lunchFirst++;   // the lunches' Kitchen is not a village place
   const shown=JSON.stringify(villageRequestGoods(r)),villager=r.villager;
   r.input=Object.fromEntries(Object.entries(r.input).reverse());   // what a save does to the keys
   normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);assert.equal(b.request.villager,villager);assert.equal(JSON.stringify(villageRequestGoods(b.request)),shown);
   b.request=null;b.readyAt=now+(i+1)*VILLAGE_REQUEST_WAIT;
  }
 }
 }
 assert.ok(lunchFirst>10,'requests that start with lunches and ask a place\'s good too go to that place\'s villager');
});

test('villagers never ask for master tools, heirloom flour or builder’s crates, even when the farm makes them',()=>{
 const s=farm(115);s.lab.found=['goldenwheat'];Object.assign(s.inventory,{goldenwheat:50,heirloomflour:200,mastertools:20});normalizeFarm(s,now);
 assert.ok(itemAvailable(s,'heirloomflour')&&itemAvailable(s,'mastertools'));
 for(let i=0;i<200;i++){
  for(const b of s.village.boards){assert.ok(!('heirloomflour' in b.request.input)&&!('mastertools' in b.request.input),JSON.stringify(b.request.input));b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}
  normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);
 }
 // Builder's crates (Oct 2026) are for the farm's upgrades: from level 180 a request's share would be worth more than one, so the rule is needed.
 assert.deepEqual(VILLAGE_NEVER_ASKED,['mastertools','heirloomflour','builderscrate']);assert.ok(villageRequestValue(200)/3>=ITEMS.builderscrate.sell);
 for(const mode of ['guided','legacy']){
  const t=mode==='guided'?farm(200):legacyFarm(200);t.lab.found=['goldenwheat'];Object.assign(t.inventory,{builderscrate:500,heirloomflour:200,mastertools:20});t.village={serial:0,boards:[]};normalizeFarm(t,now);
  assert.ok(itemAvailable(t,'builderscrate'));
  for(let i=1;i<=150;i++){
   for(const b of t.village.boards){assert.ok(VILLAGE_NEVER_ASKED.every(k=>!(k in b.request.input)),`${mode} ${JSON.stringify(b.request.input)}`);b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}
   normalizeFarm(t,now+i*VILLAGE_REQUEST_WAIT);
  }
 }
});

test('a board\'s villager does not depend on how its fills were grouped: one pass after two boards fell due fills them as two passes did',()=>{
 const H=3600000;
 for(const mode of ['guided','legacy']){
  // Level 104, the Mine and the Lumber Camp built. "Not now" on board 1 at 12:00 and on board 0 at 12:20, so board 1 falls due first.
  // The screen fills board 1 at 15:00 from a load that is not saved; the server fills both at 15:20:30 from the saved farm.
  const s=farm(104);if(mode==='legacy')s.progression={mode:'legacy'};s.buildings.smithy.built=s.buildings.villagemill.built=false;s.village={serial:0,boards:[]};normalizeFarm(s,now);
  act(s,{type:'village_skip',board:1,request:s.village.boards[1].request.id},now);
  act(s,{type:'village_skip',board:0,request:s.village.boards[0].request.id},now+20*60000);
  const saved=structuredClone(s),screen=structuredClone(saved);
  normalizeFarm(screen,now+3*H+60000);const seen=structuredClone(screen.village.boards[1].request);assert.equal(screen.village.boards[0].request,null);
  normalizeFarm(screen,now+3*H+20*60000+30000);
  const server=structuredClone(saved);normalizeFarm(server,now+3*H+20*60000+30000);
  assert.deepEqual(server.village,screen.village,mode);assert.deepEqual(server.village.boards[1].request,seen,`${mode}: the villager on the screen stays`);
  assert.ok(server.village.boards[1].request.id<server.village.boards[0].request.id,'the board that waited longest gets the first number');
 }
 // Any times: a pass at each moment a board falls due, or one pass at the end, from the same farm.
 for(let round=0;round<60;round++){
  const s=farm(110);s.village={serial:0,boards:[]};normalizeFarm(s,now);
  const times=s.village.boards.map((b,i)=>now+((round*7+i*13)%5)*15*60000);
  s.village.boards.forEach((b,i)=>{b.request=null;b.readyAt=times[i];});
  const one=structuredClone(s),many=structuredClone(s),end=Math.max(...times)+1;
  for(const t of [...times].sort((a,b)=>a-b))normalizeFarm(many,t);normalizeFarm(many,end);normalizeFarm(one,end);
  assert.deepEqual(one.village,many.village,`round ${round}: ${times.map(t=>(t-now)/60000)}`);
 }
});

test('every villager with request lines comes to the market square; the miller, the skipper, the jeweller and the elder never do',()=>{
 assert.deepEqual(VILLAGERS[3].lines,[],'his windmill grinds heirloom flour, which nobody asks for');
 assert.equal(VILLAGE_BRIEFS.find(b=>b.place==='villagemill').villager,3);
 // Villagers of levels 110-200 (Oct 2026), always added at the end: a saved request keeps its villager by its place in the list.
 assert.deepEqual(VILLAGERS.slice(5).map(v=>v.id),['fieldhand','canteencook','potter','weaver','soapmaker','skipper','jeweller','elder']);
 assert.deepEqual(VILLAGERS.slice(5).map(v=>v.place),['villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller',null]);
 for(const id of ['miller','skipper','jeweller','elder'])assert.deepEqual(VILLAGERS.find(v=>v.id===id).lines,[],id);
 for(const v of VILLAGERS.filter(v=>v.lines.length))assert.equal(v.lines.length,VILLAGE_REQUEST_BOARDS_MAX,`${v.id}: as many lines as boards (four with the Lookout tower)`);
 const meet=(s,rounds=300)=>{const met=new Set();s.village={serial:0,boards:[]};normalizeFarm(s,now);
  for(let i=1;i<=rounds;i++){for(const b of s.village.boards){met.add(b.request.villager);b.request=null;b.readyAt=now+i*VILLAGE_REQUEST_WAIT;}normalizeFarm(s,now+i*VILLAGE_REQUEST_WAIT);}
  return [...met].sort((a,b)=>a-b);};
 // The newest place among a request's goods names its villager: at 130 the potter and the weaver come (the keeper only for lunches and a
 // farm good, so with the live places alone).
 const s=farm(130);s.lab.found=['goldenwheat'];Object.assign(s.inventory,{goldenwheat:50});
 assert.deepEqual(meet(s),[0,1,2,5,7,8]);
 const live=farm(104);for(const k of ['villagefields','canteen','kiln','linenloft','soapmaker','pier','jeweller'])live.buildings[k].built=false;
 assert.deepEqual(meet(live),[0,1,2,4]);
 // A save that names a villager without lines (or none at all) loses that request: the board fills again.
 const junk=farm(110);junk.village={serial:5,boards:[{request:{id:5,villager:3,input:{stone:10},value:450,coins:675,xp:9},readyAt:0}]};normalizeFarm(junk,now);
 assert.notEqual(junk.village.boards[0].request.villager,3);assert.equal(junk.village.boards[0].request.id,6);
});

test('the level-up card and Coming up call a village place a village place, built from a golden brief, never "open Buildings"',()=>{
 for(const mode of ['guided','legacy']){
  const s=playerFarm(100,mode),entries=unlockEntries(s);
  for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding))assert.equal(entries.find(e=>e.id==='building:'+key).kind,'Village place',`${mode} ${key}`);
  assert.ok(entries.filter(e=>e.id.startsWith('building:')&&!worldTwoBuilding(e.id.slice(9))).every(e=>e.kind!=='Village place'),mode);
 }
 const ui=readFileSync(new URL('../public/progression-ui.js',import.meta.url),'utf8');
 assert.match(ui,/if\(e\.kind==='Village place'\)return 'Village place · built from a golden brief at the market square';/);
});

test('a village place that waits names the place right before it, not the open brief',()=>{
 const s=playerFarm(112);
 assert.deepEqual(['mine','lumbercamp','smithy','villagefields','villagemill','canteen'].map(k=>villagePlaceBefore(s,k)),[null,'mine','lumbercamp','smithy','villagefields','villagemill']);
 s.buildings.smithy.built=true;   // built before the briefs
 assert.deepEqual(['mine','lumbercamp','villagefields','villagemill'].map(k=>villagePlaceBefore(s,k)),[null,'mine','lumbercamp','villagefields'],'a place already built is skipped');
 s.buildings.mine.built=true;assert.deepEqual(['lumbercamp','villagefields'].map(k=>villagePlaceBefore(s,k)),[null,'lumbercamp']);
});

// World II, levels 110-116 (Oct 2026): the Village Fields, the Miners' Canteen and the market week.
test('the Village Fields sow with natural fertilizer and coins, like the Glasshouse',()=>{
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(110):legacyFarm(110);s.rookieUntil=0;for(const k of Object.keys(s.inventory))s.inventory[k]=0;s.inventory.fertilizer=1;s.coins=1000;
  const produced=s.stats.produced??0,batches=s.stats.village_batches??0;
  const r=act(s,{type:'produce',recipe:'sowpotatoes'});
  // A guided farm's first batch in a new place is ready in 30 seconds (11 Oct 2026, tests/first-batch.test.mjs).
  assert.deepEqual([s.coins,s.inventory.fertilizer,r.readyAt-now],[880,0,mode==='guided'?30000:2700000],mode);
  assert.deepEqual(act(s,{type:'collect',building:'villagefields'},r.readyAt).items,{potatoes:10});
  assert.deepEqual([s.inventory.potatoes,s.stats.made_potatoes,s.stats.village_batches-batches,s.stats.produced??0],[10,10,1,produced],'a village batch, not the farm\'s');
  assert.throws(()=>act(s,{type:'produce',recipe:'sowpotatoes'},r.readyAt),{message:'Missing ingredients for this many batches.'});
  s.inventory.fertilizer=1;s.coins=100;assert.throws(()=>act(s,{type:'produce',recipe:'sowpotatoes'},r.readyAt),{message:'You need 120 coins for this batch.'});
  s.buildings.villagefields.level=10;assert.equal(recipeDuration(s,'sowpotatoes',r.readyAt),864000,'14.4 minutes at level 10');
 }
 assert.deepEqual(['sowpotatoes','sowflax','sowlavender','sowsaffron'].map(id=>[RECIPES[id].coins,RECIPES[id].duration/60000,RECIPES[id].xp,RECIPE_LEVELS[id]]),[[120,45,45,110],[200,75,75,123],[400,180,180,132],[1100,360,360,158]]);
});

test('pasty lunches are packed lunches without apples, from the Miners’ Canteen',()=>{
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(113):legacyFarm(113);s.rookieUntil=0;for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,{potatoes:10,flour:4});
  s.buildings.canteen.batchSequence=1;   // not its first batch (that one is quick on a guided farm, tests/first-batch.test.mjs)
  const made=s.stats.made_packedlunch??0,r=act(s,{type:'produce',recipe:'pastylunch'});
  assert.equal(r.readyAt-now,1800000);assert.deepEqual(act(s,{type:'collect',building:'canteen'},r.readyAt).items,{packedlunch:4});
  assert.deepEqual([s.inventory.packedlunch,s.inventory.potatoes,s.inventory.flour,s.inventory.apples,s.stats.made_packedlunch-made],[4,0,0,0,4],mode);
  s.buildings.canteen.level=10;assert.equal(recipeDuration(s,'pastylunch',r.readyAt),576000);
  // Lunches without the Kitchen: the Canteen alone makes them.
  s.buildings.kitchen.built=false;assert.equal(itemAvailable(s,'packedlunch'),true,mode);
  s.buildings.canteen.built=false;assert.equal(itemAvailable(s,'packedlunch'),false,mode);
 }
});

test('the market week: 15 villagers between Monday and Sunday open the crate once, from level 116',()=>{
 assert.deepEqual([VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS],[116,15,10]);
 assert.equal(new Date(familyWeekStart(familyWeek(now))).toISOString(),'2026-10-05T00:00:00.000Z','a week starts on Monday at 00:00 UTC');
 assert.equal(new Date(familyWeekStart(familyWeek(now)+1)).toISOString(),'2026-10-12T00:00:00.000Z');
 const help=(s,until,t)=>{const out=[];while(out.length<until){normalizeFarm(s,t);for(const [i,b] of s.village.boards.entries())if(b.request&&out.length<until)out.push(act(s,{type:'village_deliver',board:i,request:b.request.id,input:b.request.input},t));t+=VILLAGE_REQUEST_WAIT;}return out;};
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(116):legacyFarm(116);for(const k of Object.keys(s.inventory))s.inventory[k]=100000;
  const diamonds=s.diamonds,earned=s.stats.village_diamonds_earned??0,W=familyWeek(now);   // the village's own count (28 Oct 2026)
  const got=help(s,16,now);
  assert.deepEqual(got.map(r=>r.crate),[...Array(14).fill(0),10,0],mode);
  assert.deepEqual([s.diamonds-diamonds,s.stats.market_crates,(s.stats.village_diamonds_earned??0)-earned],[10,1,10]);
  assert.deepEqual(s.village.week,{week:W,helped:16,paid:true});
  assert.deepEqual(villageWeek(s,now),{helped:16,paid:true});
  // A new week: the count starts again, and the next crate comes with its 15th villager.
  const next=familyWeekStart(W+1);assert.deepEqual(villageWeek(s,next),{helped:0,paid:false});
  const first=help(s,1,next);assert.equal(first[0].crate,0);assert.deepEqual(s.village.week,{week:W+1,helped:1,paid:false});
  const more=help(s,14,next);assert.deepEqual(more.map(r=>r.crate),[...Array(13).fill(0),10]);assert.equal(s.stats.market_crates,2);
 }
 // Below level 116 a Help does not count; a week that falls short costs nothing.
 const low=farm(115);for(const k of Object.keys(low.inventory))low.inventory[k]=100000;
 assert.ok(help(low,3,now).every(r=>r.crate===0));assert.deepEqual(low.village.week,{week:null,helped:0,paid:false});
 const short=farm(116);short.village.week={week:familyWeek(now)-1,helped:14,paid:false};normalizeFarm(short,now);
 const coins=short.coins,gems=short.diamonds;assert.deepEqual(villageWeek(short,now),{helped:0,paid:false});assert.deepEqual([short.coins,short.diamonds],[coins,gems]);
 // A crate is open only with the villagers it needs: a save cannot say so on its own.
 const forged=farm(116);forged.village.week={week:familyWeek(now),helped:3,paid:true};normalizeFarm(forged,now);
 assert.deepEqual(forged.village.week,{week:familyWeek(now),helped:3,paid:false});
});

test('the Market week is announced from level 100 and opens at 116',()=>{
 for(const mode of ['guided','legacy']){
  const entry=level=>unlockEntries(playerFarm(level,mode)).find(e=>e.id==='village:week');
  assert.equal(entry(99),undefined,mode);
  assert.deepEqual(entry(110),{id:'village:week',name:'Market week',art:'villagemarket',kind:'Activity',level:116,unlocked:false,hint:'Reach level 116.'});
  assert.equal(entry(116).unlocked,true);
 }
});

test('the village quests of levels 110-200 come after the market square\'s, open with their goods and pay as listed',()=>{
 const added=VILLAGE_QUESTS.slice(31,58);
 assert.equal(VILLAGE_QUESTS.length,70);
 assert.deepEqual(added.map(q=>[q.stat,q.target,q.reward,q.minLevel]),[
  ['built_villagefields',1,60000,110],['made_potatoes',200,40000,110],['built_canteen',1,80000,113],['market_crates',1,50000,116],
  ['built_kiln',1,100000,118],['made_rooftile',300,80000,118],['made_flax',200,60000,123],['built_linenloft',1,120000,125],['made_linen',100,100000,125],['made_builderscrate',10,120000,128],['builder_crates_used',25,150000,128],
  ['made_lavender',300,80000,132],['built_soapmaker',1,150000,135],['made_lavendersoap',100,120000,135],['made_scentedsachet',100,120000,138],['built_pier',1,150000,144],['boat_trips',10,200000,144],['built_jeweller',1,200000,150],['made_silvercandlestick',20,200000,150],
  ['made_rubyring',10,250000,154],['made_saffron',200,200000,158],['made_saffronbun',50,250000,158],['village_requests',500,300000,160],['market_crates',20,250000,160],
  ['village_landmarks',1,300000,165],['village_landmarks',3,400000,185],['village_landmarks',5,500000,200]]);
 assert.deepEqual(added.map(questXp),[116,95,134,106,150,134,116,164,150,164,184,134,184,164,164,184,212,212,212,237,212,237,250,237,250,250,250]);
 assert.deepEqual([added.reduce((n,q)=>n+q.reward,0),added.reduce((n,q)=>n+questXp(q),0)],[4630000,4902]);
 assert.equal(VILLAGE_QUESTS[31].title,'Fields of our own');assert.equal(VILLAGE_QUESTS[57].title,'The Great Hall');
 for(const q of added.filter(q=>q.stat.startsWith('made_')))assert.equal(q.minLevel,RECIPE_LEVELS[Object.keys(RECIPES).find(id=>RECIPES[id].output[q.stat.slice(5)]&&worldTwoBuilding(RECIPES[id].building))],q.title);
 for(const q of added.filter(q=>q.stat.startsWith('built_')))assert.equal(q.minLevel,BUILDING_LEVELS[q.stat.slice(6)],q.title);
 // Claimed one by one, only when done: the market crate's quest needs a crate, the crates' quest 25 crates used.
 const s=farm(128);s.stats.market_crates=0;assert.throws(()=>act(s,{type:'village_quest',id:34}),/Finish this quest/);
 s.stats.market_crates=1;assert.deepEqual(act(s,{type:'village_quest',id:34}),{coins:50000,xp:106});
 s.stats.builder_crates_used=24;assert.throws(()=>act(s,{type:'village_quest',id:41}),/Finish this quest/);
 s.stats.builder_crates_used=25;assert.deepEqual(act(s,{type:'village_quest',id:41}),{coins:150000,xp:184});
 assert.throws(()=>act(farm(157),{type:'village_quest',id:51}),{message:'Reach level 158 for this quest.'});
});

// World II, levels 118-128 (Oct 2026): the Potter's Kiln, flax, the Linen Loft and builder's crates.
test('the Potter’s Kiln and the Linen Loft: clay from a packed lunch, roof tiles, flax on the Fields and linen, then builder’s crates, guided and legacy',()=>{
 assert.deepEqual([VILLAGE_BRIEFS.findIndex(b=>b.place==='kiln'),VILLAGE_BRIEFS.findIndex(b=>b.place==='linenloft')],[6,7]);
 assert.deepEqual(['digclay','rooftile','sowflax','linen','builderscrate'].map(id=>[RECIPE_LEVELS[id],RECIPES[id].minLevel]),[[118,118],[118,118],[123,123],[125,125],[128,128]]);
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(128):legacyFarm(128);s.rookieUntil=0;for(const k of Object.keys(s.inventory))s.inventory[k]=0;
  let t=now;const run=(recipe,building,stock)=>{Object.assign(s.inventory,stock);const r=act(s,{type:'produce',recipe},t);t=r.readyAt;return act(s,{type:'collect',building,jobId:r.jobId},t).items;};
  const batches=s.stats.village_batches??0;
  assert.deepEqual(run('digclay','kiln',{packedlunch:1}),{clay:8});
  assert.deepEqual(run('rooftile','kiln',{timber:2}),{rooftile:4});
  s.coins=200;assert.deepEqual(run('sowflax','villagefields',{fertilizer:1}),{flax:10});assert.equal(s.coins,0);
  assert.deepEqual(run('linen','linenloft',{}),{linen:2});
  assert.equal(s.inventory.rooftile,4);s.inventory.rooftile+=2;
  assert.deepEqual(run('builderscrate','lumbercamp',{plank:10,ironbar:2}),{builderscrate:1});
  assert.deepEqual([s.inventory.clay,s.inventory.rooftile,s.inventory.flax,s.inventory.linen,s.inventory.builderscrate],[2,0,4,2,1],mode);
  assert.deepEqual([s.stats.made_clay,s.stats.made_rooftile,s.stats.made_flax,s.stats.made_linen,s.stats.made_builderscrate,s.stats.village_batches-batches],[8,4,10,2,1,5]);
  const early=mode==='guided'?farm(122):legacyFarm(122);early.inventory.fertilizer=1;
  assert.throws(()=>act(early,{type:'produce',recipe:'sowflax'}),{message:'Unlock this recipe first. Reach level 123.'});
  const before=mode==='guided'?farm(127):legacyFarm(127);Object.assign(before.inventory,{plank:10,rooftile:6,ironbar:2});
  assert.throws(()=>act(before,{type:'produce',recipe:'builderscrate'}),{message:'Unlock this recipe first. Reach level 128.'});
 }
 const entries=unlockEntries(playerFarm(118));
 assert.deepEqual(['kiln','linenloft'].map(k=>{const e=entries.find(x=>x.id==='building:'+k);return [e.kind,e.level];}),[['Village place',118],['Village place',125]]);
});

test('builder’s crates take 8,000 coins each off a farm building’s upgrade to level 10, at most half, after the voucher; not the Factory, master steps or village places',()=>{
 assert.equal(BUILDER_CRATE_COINS,8000);
 const CRATES='Your builder’s crates have changed. Look at the upgrade again.';
 for(const mode of ['guided','legacy']){
  const base=()=>{const s=mode==='guided'?farm(128):legacyFarm(128);s.buildings.dairy.level=6;Object.assign(s.inventory,{milk:24,builderscrate:30});s.coins=1000000;s.boosts.upgradeCredits=0;return normalizeFarm(s,now);};
  let s=base();assert.deepEqual([upgradeCost(s,'dairy'),builderCrates(s,'dairy')],[38973,2],mode);
  let xp=s.xp;
  assert.deepEqual(act(s,{type:'upgrade',building:'dairy',crates:2}),{building:'dairy',level:7,cost:22973,currency:'coins',materials:{milk:24},crates:2});
  assert.deepEqual([s.coins,s.inventory.builderscrate,s.inventory.milk,s.stats.builder_crates_used,s.xp-xp],[1000000-22973,28,0,2,15]);
  s=base();assert.deepEqual(act(s,{type:'upgrade',building:'dairy'}),{building:'dairy',level:7,cost:38973,currency:'coins',materials:{milk:24},crates:0});
  assert.deepEqual([s.inventory.builderscrate,s.stats.builder_crates_used],[30,undefined],'coins only, as before');
  for(const crates of [0,3,1.5,'2',null,-1]){s=base();const kept=structuredClone(s);assert.throws(()=>act(s,{type:'upgrade',building:'dairy',crates}),{message:CRATES},`${mode} ${crates}`);assert.deepEqual(s,kept);}
  s=base();s.boosts.upgradeCredits=1;assert.deepEqual([upgradeCost(s,'dairy'),builderCrates(s,'dairy')],[19487,1]);
  assert.deepEqual(act(s,{type:'upgrade',building:'dairy',crates:1}),{building:'dairy',level:7,cost:11487,currency:'coins',materials:{milk:12},crates:1});assert.equal(s.boosts.upgradeCredits,0,'the voucher is used');
  s=base();s.buildings.dairy.level=9;s.inventory.builderscrate=100;assert.deepEqual([upgradeCost(s,'dairy'),builderCrates(s,'dairy')],[461538,28]);
  s.inventory.builderscrate=5;assert.equal(builderCrates(s,'dairy'),5,'no more than in stock');
  s=base();s.coins=30000;assert.throws(()=>act(s,{type:'upgrade',building:'dairy'}),{message:'You need 38973 coins for this upgrade.'});
  assert.equal(act(s,{type:'upgrade',building:'dairy',crates:2}).cost,22973);assert.equal(s.coins,30000-22973);
  s=base();s.coins=20000;assert.throws(()=>act(s,{type:'upgrade',building:'dairy',crates:2}),{message:'You need 22973 coins for this upgrade.'});
  // Never the Factory, a master step (the Mill at 10), a village place, the Farmhouse, the Family Hall or the Pier.
  s=base();Object.assign(s.buildings.factory,{level:5});s.buildings.mine.level=5;s.buildings.linenloft.level=5;
  for(const key of ['factory','mine','mill','linenloft','farmhouse','familyhall','pier']){
   assert.equal(builderCrates(s,key),0,key);
   assert.throws(()=>act(s,{type:'upgrade',building:key,crates:1}),{message:['farmhouse','familyhall','pier'].includes(key)?'Choose a production building.':CRATES},key);
  }
 }
 // Every farm building but the Factory, levels 1-9, with and without the voucher, any stock: at most half the price, never more than in stock.
 const s=farm(128);
 for(const key of Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].type==='production'&&k!=='factory'&&!otherWorldBuilding(k)))for(let level=1;level<=9;level++)for(const voucher of [0,1])for(const stock of [0,1,5,1000]){
  s.buildings[key].level=level;s.boosts.upgradeCredits=voucher;s.inventory.builderscrate=stock;const cost=upgradeCost(s,key),n=builderCrates(s,key);
  assert.equal(n,Math.min(stock,Math.floor(cost/2/BUILDER_CRATE_COINS)),`${key} ${level} ${voucher} ${stock}`);assert.ok(n*BUILDER_CRATE_COINS<=cost/2);
 }
 // A crate upgrade, then one with coins: the count stays what the crates were.
 const t=farm(128);t.boosts.upgradeCredits=0;t.buildings.dairy.level=6;Object.assign(t.inventory,{milk:100,builderscrate:30});
 act(t,{type:'upgrade',building:'dairy',crates:2});act(t,{type:'upgrade',building:'dairy'});assert.deepEqual([t.buildings.dairy.level,t.stats.builder_crates_used],[8,2]);
});

test('old farms load with no crates and no crate option: a save from before upgrades as it did',async()=>{
 const {createLegacyFarm}=await import('./legacy-farm.mjs');
 for(const s of [farm(128),createLegacyFarm(now),legacyFarm(108)]){
  delete s.inventory.builderscrate;delete s.buildings.kiln;delete s.buildings.linenloft;
  const before=structuredClone(s);normalizeFarm(s,now);
  assert.equal(s.inventory.builderscrate,0);assert.deepEqual([s.buildings.kiln,s.buildings.linenloft],[{level:1,job:null,built:false,extraJobs:[],batchSequence:0},{level:1,job:null,built:false,extraJobs:[],batchSequence:0}]);
  for(const [k,n] of Object.entries(before.inventory))assert.equal(s.inventory[k],n,k);
  for(const key of Object.keys(BUILDINGS))assert.equal(builderCrates(s,key),0,key);
  assert.equal(s.stats.builder_crates_used,undefined);
  const again=structuredClone(s);normalizeFarm(again,now);assert.deepEqual(again,s,'idempotent');
 }
 const s=farm(128);s.boosts.upgradeCredits=0;delete s.inventory.builderscrate;normalizeFarm(s,now);s.buildings.dairy.level=6;s.inventory.milk=24;
 assert.deepEqual(act(s,{type:'upgrade',building:'dairy'}),{building:'dairy',level:7,cost:38973,currency:'coins',materials:{milk:24},crates:0});
});

// The goods of levels 110-200 stay in the village (Oct 2026): none of the 13 ever reaches a World I pool, with every place built and
// plenty of each in the barn, guided and legacy.
test('the goods of levels 110-200 never reach World I: no stall, trailer, fair class, visitor, daily, Family Order or highlight asks them',()=>{
 const goods=Object.keys(VILLAGE_GOODS).slice(12),pattern=new RegExp(`"(${goods.join('|')})"`);
 assert.equal(goods.length,13);
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(200):legacyFarm(200);for(const k of goods)s.inventory[k]=1000;
  for(let d=0;d<60;d++){
   const t=now+d*86400000;delete s.daily;normalizeFarm(s,t);
   assert.doesNotMatch(JSON.stringify({valley:s.valley,depot:s.depot,fair:s.fair,visitors:s.visitors,daily:s.daily}),pattern,`${mode} day ${d}`);
   for(const k of Object.keys(familyOrder('f'+d,2900+d,3).lines))assert.ok(!goods.includes(k),k);
   const h=marketHighlights(t,s);assert.ok(!goods.includes(h.today.item)&&!goods.includes(h.tomorrow.item),`${mode} day ${d}`);
  }
 }
});

// The data of levels 144-200 (Oct 2026): the town boat's numbers and the five landmarks. The boat's actions are tested below, the landmarks'
// in tests/village-landmarks.test.mjs; the market square keeps their saved state (normalizeVillage), so old and new farms load the same way.
test('the town boat\'s numbers and the five landmarks, as the owner chose them',()=>{
 assert.deepEqual([BOAT_PREMIUM,BOAT_DIAMONDS,BOAT_DIAMOND_TRIPS,BOAT_XP_SHARE,BOAT_RETURN/3600000,BOAT_QUAY_RETURN/3600000],[1.6,3,14,40,12,6]);
 assert.ok(BOAT_DIAMONDS<DEPOT_DIAMONDS);assert.ok(BOAT_DIAMOND_TRIPS*BOAT_DIAMONDS+VILLAGE_CRATE_DIAMONDS<=52,'at most 52 diamonds a week, also with the Stone quay');
 assert.deepEqual(BOAT_GOODS,['rooftile','linen','lavendersoap','scentedsachet','silvercandlestick','rubyring','saffronbun','silverbar','donkeymilksoap']);
 assert.deepEqual([144,145,150,200,250].map(boatValue),[50000,51000,56000,106000,106000]);
 for(let level=144;level<=200;level++)assert.ok(boatValue(level)<=exportValue(level),`${level}: never more than the Trade Depot's trailer`);
 const ids=Object.keys(VILLAGE_LANDMARKS),l=VILLAGE_LANDMARKS;
 assert.deepEqual(ids,['windpump','longhouse','stonequay','lookout','greathall']);
 assert.deepEqual(ids.map(k=>l[k].level),[165,172,185,192,200]);assert.equal(l.greathall.level,WORLD_TWO_TOP);
 assert.deepEqual(ids.map(k=>l[k].coins),[1500000,2000000,2500000,3000000,3000000]);
 assert.deepEqual(l.longhouse.materials,{linen:300,scentedsachet:200,rooftile:400},'sachets, not lavender soap (10 Oct 2026)');
 assert.ok(Object.isFrozen(l)&&ids.every(k=>Object.isFrozen(l[k])&&Object.isFrozen(l[k].materials)));
 for(const k of ids){assert.ok(Object.keys(l[k].materials).every(villageGood),k);assert.ok(VILLAGERS[l[k].villager],k);}
 assert.deepEqual([VILLAGE_LANDMARK_XP,VILLAGE_HALL_PREMIUM,GREAT_HALL_DIAMONDS],[5000,1.6,500]);
 assert.match(l.windpump.effect,new RegExp(`${VILLAGE_LANDMARK_BONUS.windpump*100}%`));assert.match(l.longhouse.effect,new RegExp(`${VILLAGE_LANDMARK_BONUS.longhouse*100}%`));
 assert.match(l.stonequay.effect,new RegExp(`${BOAT_QUAY_RETURN/3600000} hours instead of ${BOAT_RETURN/3600000}`));
 assert.ok(l.greathall.effect.includes(`${VILLAGE_HALL_PREMIUM} times`)&&l.greathall.effect.includes(`${GREAT_HALL_DIAMONDS} diamonds`));
 const worth=k=>Object.entries(l[k].materials).reduce((n,[g,c])=>n+Math.round(ITEMS[g].sell*MARKET_PAYOUT_MULTIPLIER)*c,0);
 assert.deepEqual(ids.map(worth),[183600,278400,227200,644000,315200]);
 const largest=Math.max(...Object.values(VALLEY_PROJECTS).flatMap(p=>p.levels.map(x=>Object.entries(x.materials).reduce((n,[g,c])=>n+Math.round(ITEMS[g].sell*MARKET_PAYOUT_MULTIPLIER)*c,0))));
 assert.equal(largest,682000);assert.ok(ids.every(k=>worth(k)<=largest),'never more than the largest valley project level');
 // What a finished landmark changes, read from the saved list: the boat's wait, the pay, the batch time bonus.
 const s=farm(200);assert.deepEqual([boatReturn(s),villagePremium(s),landmarkBonus(s,'windpump'),landmarkDone(s,'lookout')],[BOAT_RETURN,1.5,0,false]);
 s.village.landmarks.done=[...ids];assert.deepEqual([boatReturn(s),villagePremium(s),landmarkBonus(s,'windpump'),landmarkBonus(s,'longhouse'),landmarkBonus(s,'greathall'),landmarkDone(s,'lookout')],[BOAT_QUAY_RETURN,1.6,.25,.1,0,true]);
});

test('the town boat and the landmarks: old saves load with none, junk is cleaned up, a good cargo is kept with today\'s diamonds',()=>{
 const boatOf=boat=>{const s=farm(99);s.village={serial:0,boards:[],boat};normalizeFarm(s,now);return s.village.boat;};
 const none={serial:0,cargo:null,readyAt:0,trips:0,week:null,paid:0};
 for(const bad of [undefined,'x',[1],null,{serial:-1,cargo:'x',readyAt:'y',trips:1.5}])assert.deepEqual(boatOf(bad),none,JSON.stringify(bad));
 const cargo={id:3,input:{linen:39,scentedsachet:32,silverbar:7},loaded:{linen:10,scentedsachet:0,silverbar:7},value:54780,coins:87700,xp:1370,diamonds:9,extra:1};
 assert.deepEqual(boatOf({serial:2,cargo,readyAt:5,trips:4,week:2961,paid:3,extra:1}),{serial:3,cargo:{id:3,input:cargo.input,loaded:cargo.loaded,value:54780,coins:87700,xp:1370,diamonds:BOAT_DIAMONDS},readyAt:5,trips:4,week:2961,paid:3},'kept, with 3 diamonds and a serial at least its id');
 for(const broken of [{...cargo,loaded:{...cargo.loaded,linen:40}},{...cargo,input:{...cargo.input,cheese:5},loaded:{...cargo.loaded,cheese:0}},{...cargo,loaded:{linen:0,scentedsachet:0}},
  {...cargo,input:{rooftile:1,linen:1,lavendersoap:1,scentedsachet:1,silverbar:1},loaded:{rooftile:0,linen:0,lavendersoap:0,scentedsachet:0,silverbar:0}},{...cargo,id:0},{...cargo,coins:-1}])
  assert.equal(boatOf({serial:1,cargo:broken}).cargo,null,JSON.stringify(broken));
 assert.deepEqual([boatOf({week:2961,paid:99}).paid,boatOf({week:null,paid:5}).paid,boatOf({week:2961,paid:2.5}).paid],[BOAT_DIAMOND_TRIPS,0,0],'diamond boats only with their week, 14 at most');
 const landmarksOf=landmarks=>{const s=farm(200);s.village={serial:0,boards:[],landmarks};normalizeFarm(s,now);return s.village;};
 assert.deepEqual(landmarksOf({done:['longhouse'],given:{rooftile:5}}).landmarks,{done:[],given:{rooftile:5}});
 assert.deepEqual(landmarksOf({done:['windpump','windpump','x','stonequay'],given:{linen:999,rooftile:-3,plank:2.5,stone:10,lavendersoap:'7'}}).landmarks,{done:['windpump'],given:{linen:300}});
 for(const bad of [{done:'all',given:[1]},null,'x'])assert.deepEqual(landmarksOf(bad).landmarks,{done:[],given:{}});
 const all=landmarksOf({done:[...Object.keys(VILLAGE_LANDMARKS)].reverse(),given:{rooftile:5}});
 assert.deepEqual(all.landmarks,{done:Object.keys(VILLAGE_LANDMARKS),given:{}});assert.equal(all.boards.length,4,'the Lookout tower\'s fourth villager');
 const f=farm(200);f.village={serial:4,boards:[],week:{week:2961,helped:20,paid:true},boat:{serial:2,cargo,readyAt:5,trips:4,week:2961,paid:3},landmarks:{done:['windpump'],given:{linen:7}}};
 normalizeFarm(f,now);const once=structuredClone(f.village);normalizeFarm(f,now);assert.deepEqual(f.village,once,'idempotent');
});

// World II, levels 132-150 (Oct 2026): the Soap Maker, the Pier with the town boat, and the Jeweller. A farm with only the listed village
// places built (every farm building built), guided or legacy.
const PLACES_ALL=Object.keys(BUILDINGS).filter(worldTwoBuilding);
function placesFarm(level,built,mode='guided'){
 const s=mode==='guided'?farm(level):legacyFarm(level);for(const k of PLACES_ALL)s.buildings[k].built=built.includes(k);s.coins=10000000;s.village={serial:0,boards:[]};return normalizeFarm(s,now);
}
test('the Soap Maker, the Pier and the Jeweller: golden briefs 9 to 11, at 135, 144 and 150, guided and legacy',()=>{
 assert.deepEqual(['soapmaker','pier','jeweller'].map(k=>[BUILDING_LEVELS[k],BUILDING_COSTS[k],VILLAGE_BRIEFS.findIndex(b=>b.place===k)]),[[135,350000,8],[144,400000,9],[150,450000,10]]);
 assert.equal(BUILDINGS.pier.type,'pier');assert.deepEqual(upgradeGoods('pier',5),{});
 const upTo=place=>PLACES_ALL.filter(k=>VILLAGE_BRIEFS.findIndex(b=>b.place===k)<VILLAGE_BRIEFS.findIndex(b=>b.place===place));
 for(const mode of ['guided','legacy']){
  const s=placesFarm(140,upTo('soapmaker'),mode);Object.assign(s.inventory,{rooftile:300,linen:20,plank:120,ironbar:20,silverbar:5});
  assert.equal(villageBrief(s).place,'soapmaker',mode);assert.equal(villageBrief(s).title,'A sweet-smelling workshop');
  assert.throws(()=>act(s,{type:'village_build',place:'pier'}),{message:'Build the Soap Maker first: one golden brief at a time.'});
  const coins=s.coins,xp=s.xp;
  assert.deepEqual(act(s,{type:'village_build',place:'soapmaker'}),{place:'soapmaker',name:'Soap Maker',coins:350000,goods:{rooftile:60,linen:20},xp:VILLAGE_BUILD_XP});
  assert.deepEqual([coins-s.coins,s.xp-xp,s.inventory.rooftile,s.inventory.linen,s.stats.built_soapmaker],[350000,250,240,0,1]);
  assert.deepEqual([villageBrief(s).place,villageBrief(s).open,villageBrief(s).level],['pier',false,144]);
  assert.throws(()=>act(s,{type:'village_build',place:'pier'}),{message:'Reach level 144.'});
  s.xp=xpForLevel(144);normalizeFarm(s,now);
  assert.deepEqual(act(s,{type:'village_build',place:'pier'}),{place:'pier',name:'Pier',coins:400000,goods:{plank:120,rooftile:60,ironbar:20},xp:250});
  assert.equal(s.village.boat.cargo,null,'the boat comes with the next look at the farm');
  normalizeFarm(s,now);assert.equal(s.village.boat.cargo.id,1,`${mode}: the first cargo at once`);assert.equal(s.village.boat.serial,1);
  assert.throws(()=>act(s,{type:'village_build',place:'jeweller'}),{message:'Reach level 150.'});
  s.xp=xpForLevel(150);normalizeFarm(s,now);
  assert.throws(()=>act(s,{type:'village_build',place:'jeweller'}),{message:'Gather the missing supplies: 10 Silver bar.'});
  s.inventory.silverbar=10;act(s,{type:'village_build',place:'jeweller'});
  assert.equal(villageBrief(s),null,'after the last place the landmarks take the brief\'s slot');assert.equal(villageLandmark(s).id,'windpump');
  // The Pier makes nothing: no upgrade, no batch to collect, never built from Buildings.
  assert.deepEqual([upgradeCost(s,'pier'),upgradeRequirements(s,'pier')],[null,null]);
  for(const action of [{type:'collect',building:'pier'},{type:'collect_all',building:'pier'},{type:'upgrade',building:'pier'}])assert.throws(()=>act(s,action),{message:'Choose a production building.'},action.type);
  const unbuilt=placesFarm(150,upTo('pier'),mode);assert.throws(()=>act(unbuilt,{type:'construct',building:'pier'}),/golden brief/);
 }
});

// The town boat (Oct 2026, from level 144): the pinned level-150 cargo, its refusals, a part load, the full boat sailing, the next one.
test('the town boat: one cargo at a time from the Pier, loaded bit by bit, 1.6 times, 3 diamonds and a 40th in XP, as shown',()=>{
 const PIN={id:1,input:{linen:39,scentedsachet:32,silverbar:7},loaded:{linen:0,scentedsachet:0,silverbar:0},value:54780,coins:87700,xp:1370,diamonds:3};
 for(const mode of ['guided','legacy']){
  const s=placesFarm(150,PLACES_ALL,mode);for(const k of Object.keys(s.inventory))s.inventory[k]=0;
  assert.deepEqual(s.village.boat,{serial:1,cargo:PIN,readyAt:0,trips:0,week:null,paid:0},mode);
  const input=PIN.input,load=(a,t=now)=>act(s,{type:'boat_load',cargo:1,input,...a},t);
  // The refusals, in their order; none of them takes anything.
  const none=placesFarm(150,PLACES_ALL.filter(k=>k!=='pier'),mode);
  assert.deepEqual(none.village.boat,{serial:0,cargo:null,readyAt:0,trips:0,week:null,paid:0});
  assert.throws(()=>act(none,{type:'boat_load',cargo:1,input}),{message:'Build the Pier first.'});
  assert.throws(()=>act(none,{type:'boat_skip',cargo:1}),{message:'Build the Pier first.'});
  s.inventory.linen=50;const kept=structuredClone(s);
  for(const bad of [{cargo:99},{input:{...input,linen:38}},{input:{linen:39,scentedsachet:32}},{input:undefined},{input:'x'},{cargo:'1'}])
   assert.throws(()=>load(bad),{message:BOAT_GONE},JSON.stringify(bad));
  assert.deepEqual(s,kept,'a cargo that is not the one on the screen takes nothing');
  assert.deepEqual(act(s,{type:'boat_load',cargo:1,input:{silverbar:7,scentedsachet:32,linen:39}}).loaded,{linen:39},'the goods in any order');
  Object.assign(s,structuredClone(kept));
  for(const item of ['rooftile','__proto__',7,'toString'])assert.throws(()=>load({item}),{message:'The boat does not take that.'},String(item));
  s.inventory.linen=0;
  assert.throws(()=>load({}),{message:'You have none of the goods the boat still needs.'});
  assert.throws(()=>load({item:'linen'}),{message:'You have no linen to load.'});
  // A part load stays loaded; "Turn this cargo down" is then refused.
  s.inventory.linen=10;assert.deepEqual(load({item:'linen'}),{loaded:{linen:10},units:10,sailed:false});
  assert.deepEqual([s.inventory.linen,s.stats.boat_loaded,s.village.boat.cargo.loaded.linen],[0,10,10]);
  assert.throws(()=>act(s,{type:'boat_skip',cargo:1}),{message:'Goods are already on the boat. Finish loading it.'});
  assert.equal(boatReady(s),false);Object.assign(s.inventory,{linen:29,scentedsachet:32,silverbar:7});assert.equal(boatReady(s),true);
  // The full boat with Double earnings and VIP on: exactly what it showed, at the village's own pier.
  s.boosts.coinsUntil=now+3600000;s.vipExpiresAt=now+86400000;
  const before=structuredClone({coins:s.coins,xp:s.xp,diamonds:s.diamonds,stats:s.stats});
  assert.deepEqual(load({}),{loaded:{linen:29,scentedsachet:32,silverbar:7},units:68,sailed:true,coins:87700,xp:1370,diamonds:3,readyAt:now+BOAT_RETURN});
  assert.deepEqual([s.coins-before.coins,s.xp-before.xp,s.diamonds-before.diamonds],[87700,1370,3]);
  // 27 Oct 2026: the village's own counts (village_earned, village_diamonds_earned), never the farm's.
  assert.deepEqual([s.stats.earned-before.stats.earned,(s.stats.village_earned??0)-(before.stats.village_earned??0),(s.stats.diamonds_earned??0)-(before.stats.diamonds_earned??0),(s.stats.village_diamonds_earned??0)-(before.stats.village_diamonds_earned??0),s.stats.boat_trips,s.stats.boat_coins,s.stats.boat_loaded],[0,87700,0,3,1,87700,78]);
  for(const k of ['sold','deliveries','produced'])assert.equal(s.stats[k],before.stats[k],k);
  assert.deepEqual(s.village.boat,{serial:1,cargo:null,readyAt:now+BOAT_RETURN,trips:1,week:familyWeek(now),paid:1});
  assert.throws(()=>load({}),{message:BOAT_GONE},'the boat has sailed');
  // The next cargo when the boat is back; turning it down brings the next after the same wait, and counts nothing.
  normalizeFarm(s,now+BOAT_RETURN-1);assert.equal(s.village.boat.cargo,null);
  const t=now+BOAT_RETURN;normalizeFarm(s,t);assert.deepEqual([s.village.boat.cargo.id,s.village.boat.serial],[2,2]);
  const stats=structuredClone(s.stats);
  assert.deepEqual(act(s,{type:'boat_skip',cargo:2,input:s.village.boat.cargo.input},t),{readyAt:t+BOAT_RETURN});
  assert.deepEqual(s.stats,stats);assert.equal(s.village.boat.trips,1);
  // With the XP boost the boat's XP doubles, like every action's.
  const u=t+BOAT_RETURN;normalizeFarm(s,u);const c=s.village.boat.cargo;Object.assign(s.inventory,c.input);s.boosts.xpUntil=u+3600000;
  assert.equal(act(s,{type:'boat_load',cargo:c.id,input:c.input},u).xp,2*c.xp);
 }
});

// 10 Oct 2026 (the main session's choice F2): the boat's 3 diamonds come only with the first 14 boats of a week, Monday to Sunday UTC, the
// market week's week. Later boats that week pay their coins and XP. Without the Stone quay a farm can never send more than 14.
test('the town boat\'s diamonds: the first 14 boats of a week, then coins and XP only until Monday',()=>{
 const s=placesFarm(200,PLACES_ALL);const W=familyWeek(now);
 assert.equal(boatDiamonds(s,now),BOAT_DIAMONDS);
 s.village.boat.week=W;s.village.boat.paid=BOAT_DIAMOND_TRIPS-1;normalizeFarm(s,now);assert.equal(boatDiamonds(s,now),3);
 let c=s.village.boat.cargo;Object.assign(s.inventory,c.input);
 assert.equal(act(s,{type:'boat_load',cargo:c.id,input:c.input}).diamonds,3);assert.deepEqual([s.village.boat.week,s.village.boat.paid],[W,14]);
 assert.equal(boatDiamonds(s,now),0);
 let t=now+BOAT_QUAY_RETURN;s.village.landmarks.done=Object.keys(VILLAGE_LANDMARKS).slice(0,3);s.village.boat.readyAt=t;normalizeFarm(s,t);
 c=s.village.boat.cargo;Object.assign(s.inventory,c.input);const before={coins:s.coins,diamonds:s.diamonds,earned:s.stats.diamonds_earned??0};
 const r=act(s,{type:'boat_load',cargo:c.id,input:c.input},t);
 assert.deepEqual([r.sailed,r.coins,r.diamonds,s.coins-before.coins,s.diamonds-before.diamonds,(s.stats.diamonds_earned??0)-before.earned],[true,c.coins,0,c.coins,0,0]);
 assert.equal(c.diamonds,BOAT_DIAMONDS,'the cargo keeps today\'s amount: the week decides');
 assert.equal(s.village.boat.paid,14);assert.equal(s.stats.boat_trips,2);
 // Monday: diamonds again.
 const monday=familyWeekStart(W+1);assert.equal(boatDiamonds(s,monday),3);
 s.village.boat.readyAt=monday;normalizeFarm(s,monday);c=s.village.boat.cargo;Object.assign(s.inventory,c.input);
 assert.equal(act(s,{type:'boat_load',cargo:c.id,input:c.input},monday).diamonds,3);assert.deepEqual([s.village.boat.week,s.village.boat.paid],[W+1,1]);
});

// World II, levels 154-160 (Oct 2026): the ruby ring, saffron and saffron buns. Data only: everything else picks them up by itself.
test('Phase 4 data: the ruby ring at 154, saffron and saffron buns at 158, as the registry pins them',()=>{
 assert.deepEqual(['saffron','rubyring','saffronbun'].map(k=>ITEMS[k]),[
  {name:'Saffron',sell:650,village:true,world:2,crop:true,noBoard:true},{name:'Ruby ring',sell:14000,village:true,world:2,noBoard:true},{name:'Saffron bun',sell:2100,village:true,world:2,noBoard:true}]);
 for(const k of ['saffron','rubyring','saffronbun']){assert.ok(villageGood(k)&&worldTwoItem(k),k);assert.ok(![CROPS,PRODUCTS,HEIRLOOMS].some(m=>Object.hasOwn(m,k)),k);}
 assert.deepEqual([RECIPES.rubyring,RECIPES.sowsaffron,RECIPES.saffronbun],[
  {building:'jeweller',name:'Set a ruby ring',input:{silverbar:2,gemstone:2},output:{rubyring:1},duration:12600000,xp:210,minLevel:154},
  {building:'villagefields',name:'Sow saffron',input:{fertilizer:2},coins:1100,output:{saffron:8},duration:21600000,xp:360,minLevel:158},
  {building:'canteen',name:'Bake saffron buns',input:{saffron:4,flour:4,eggs:2},output:{saffronbun:2},duration:3600000,xp:60,minLevel:158}]);
 assert.deepEqual([RECIPE_LEVELS.rubyring,RECIPE_LEVELS.sowsaffron,RECIPE_LEVELS.saffronbun],[154,158,158]);
 assert.deepEqual(['rubyring','sowsaffron','saffronbun'].map(id=>recipeValue(id)),[{input:7840,output:11200,added:3360},{input:1516,output:4160,added:2644},{input:2352,output:3360,added:1008}]);
 assert.ok(!Object.keys(RECIPES).some(id=>Object.keys(VILLAGE_GOODS).slice(12).some(k=>RECIPES[id].output[k])&&RECIPES[id].building==='factory'),'never a Factory version');
});

test('rubies finally have a use: two rubies and two silver bars make a ruby ring at the Jeweller, from level 154',()=>{
 for(const mode of ['guided','legacy']){
  const early=mode==='guided'?farm(153):legacyFarm(153);Object.assign(early.inventory,{silverbar:2,gemstone:2});
  assert.throws(()=>act(early,{type:'produce',recipe:'rubyring'}),{message:'Unlock this recipe first. Reach level 154.'},mode);
  assert.ok(buildingRecipes(early,'jeweller').includes('rubyring'),'listed under Coming later');
  const s=mode==='guided'?farm(154):legacyFarm(154);for(const k of Object.keys(s.inventory))s.inventory[k]=0;Object.assign(s.inventory,{silverbar:2,gemstone:2});
  const produced=s.stats.produced??0,batches=s.stats.village_batches??0,r=act(s,{type:'produce',recipe:'rubyring'});
  assert.equal(r.readyAt-now,mode==='guided'?30000:recipeDuration(s,'rubyring',now),'the first ring of a guided farm is quick (tests/first-batch.test.mjs)');
  assert.deepEqual(act(s,{type:'collect',building:'jeweller'},r.readyAt),{building:'jeweller',items:{rubyring:1},xp:210});
  assert.deepEqual([s.inventory.rubyring,s.inventory.silverbar,s.inventory.gemstone,s.stats.made_rubyring,s.stats.village_batches-batches,s.stats.produced??0],[1,0,0,1,1,produced],mode);
  const none=mode==='guided'?farm(160):legacyFarm(160);none.buildings.jeweller.built=false;Object.assign(none.inventory,{silverbar:2,gemstone:2});
  assert.equal(itemAvailable(none,'rubyring'),false);assert.throws(()=>act(none,{type:'produce',recipe:'rubyring'}),/Unlock this recipe first/);
 }
});

test('saffron: 2 fertilizer and 1,100 coins sow 8 saffron, ripe after 6 hours, sold only at the Village market; saffron buns from 158',()=>{
 for(const mode of ['guided','legacy']){
  const early=mode==='guided'?farm(157):legacyFarm(157);Object.assign(early.inventory,{fertilizer:2,saffron:4,flour:4,eggs:2});
  assert.throws(()=>act(early,{type:'produce',recipe:'sowsaffron'}),{message:'Unlock this recipe first. Reach level 158.'},mode);
  assert.throws(()=>act(early,{type:'produce',recipe:'saffronbun'}),{message:'Unlock this recipe first. Reach level 158.'},mode);
  const s=mode==='guided'?farm(158):legacyFarm(158);for(const k of Object.keys(s.inventory))s.inventory[k]=0;s.inventory.fertilizer=2;s.coins=1100;
  const r=act(s,{type:'produce',recipe:'sowsaffron'});assert.deepEqual([s.coins,s.inventory.fertilizer],[0,0]);
  assert.deepEqual(act(s,{type:'collect',building:'villagefields'},r.readyAt),{building:'villagefields',items:{saffron:8},xp:360});assert.equal(s.stats.made_saffron,8);
  s.inventory.fertilizer=2;s.coins=1099;assert.throws(()=>act(s,{type:'produce',recipe:'sowsaffron'},r.readyAt),{message:'You need 1100 coins for this batch.'});
  Object.assign(s.inventory,{saffron:4,flour:4,eggs:2});const b=act(s,{type:'produce',recipe:'saffronbun'},r.readyAt);
  assert.deepEqual(act(s,{type:'collect',building:'canteen'},b.readyAt),{building:'canteen',items:{saffronbun:2},xp:60});
  assert.deepEqual([s.inventory.saffron,s.inventory.flour,s.inventory.eggs,s.inventory.saffronbun,s.stats.made_saffronbun],[0,0,0,2,2],mode);
  // Sold at the Village market only; Sell all at the farm leaves it.
  s.inventory.saffron=5;assert.throws(()=>act(s,{type:'sell',item:'saffron'},b.readyAt),/Village market/);
  act(s,{type:'sell',item:'saffron',category:'village',quantity:3},b.readyAt);assert.equal(s.inventory.saffron,2);
  s.inventory.wheat=5;try{act(s,{type:'sell',item:'all'},b.readyAt);}catch{}assert.equal(s.inventory.saffron,2);
 }
 const l=legacyFarm(158);l.buildings.villagefields.level=10;assert.equal(recipeDuration(l,'sowsaffron',now),6912000,'1 h 55 min at level 10');
 // Its price moves like the farm's crops: 0.85-1.15 of normal (at the market's 0.8), not the goods' 0.7-1.6.
 for(let d=0;d<365;d++){const q=marketQuote('saffron',now+d*86400000);assert.deepEqual([q.min,q.max],[442,598]);assert.ok(q.price>=q.min&&q.price<=q.max,`day ${d}: ${q.price}`);}
});

test('the Phase 4 quests: 10 ruby rings, 200 saffron, 50 saffron buns, 500 villagers, 20 market crates, claimed one by one',()=>{
 assert.deepEqual(VILLAGE_QUESTS.slice(50,55).map(q=>[q.title,q.description]),[['A ring of rubies','Set 10 ruby rings.'],['Golden threads','Grow 200 saffron.'],['Saffron buns','Bake 50 saffron buns.'],
  ['Friend of the village','Help 500 villagers at the market square.'],['Weeks at the market','Open the market crate 20 times.']]);
 const s=farm(154);s.stats.made_rubyring=10;assert.deepEqual(act(s,{type:'village_quest',id:50}),{coins:250000,xp:237});assert.ok(s.villageQuests.includes(50));
 const t=farm(159);t.stats.village_requests=500;assert.throws(()=>act(t,{type:'village_quest',id:53}),{message:'Reach level 160 for this quest.'});
});

// The level-99 guard for all 13 goods of levels 110-200 (Oct 2026): with each of them in stock (a gift) nothing of them shows, guided and legacy.
test('level 99 sees none of the 13 goods of levels 110-200: no recipe, Market row, quest, daily or event goal',()=>{
 const goods=Object.keys(VILLAGE_GOODS).slice(12),made=new Set(goods.map(k=>'made_'+k));assert.equal(goods.length,13);
 for(const s of [farm(99),legacyFarm(99),playerFarm(99),playerFarm(99,'legacy')]){
  const mode=s.progression.mode;for(const k of goods)s.inventory[k]=5;
  assert.ok(!unlockEntries(s).some(e=>e.id.startsWith('recipe:')&&Object.keys(RECIPES[e.id.slice(7)].output).some(k=>goods.includes(k))),mode);
  for(const key of Object.keys(BUILDINGS).filter(k=>!worldTwoBuilding(k)))assert.ok(buildingRecipes(s,key).every(id=>!Object.keys(RECIPES[id].output).some(k=>goods.includes(k))),`${mode} ${key}`);
  for(const tab of ['crops','goods'])assert.ok(marketItems(s,tab).every(k=>!goods.includes(k)),`${mode} ${tab}`);
  for(const k of goods)assert.equal(itemAvailable(s,k),false,`${mode} ${k}`);
 }
 assert.ok(!QUESTS.some(q=>made.has(q.stat)));assert.ok(!DAILY_POOLS.flat().some(q=>made.has(q.stat)));assert.ok(!EVENT_GOAL_POOLS.filter((p,i)=>EVENT_LEAGUES[i].world===1).flat(2).some(g=>made.has(g.stat)));
 assert.ok(VILLAGE_QUESTS.filter(q=>made.has(q.stat)).every(q=>q.minLevel>=110));
});

test('old farms load unchanged with the goods of Phase 4: a running batch keeps what it started with',()=>{
 for(const mode of ['guided','legacy']){
  const s=mode==='guided'?farm(160):legacyFarm(160);s.rookieUntil=0;s.buildings.villagefields.level=4;
  Object.assign(s.inventory,{fertilizer:4,silverbar:2,gemstone:2});s.coins+=2000;
  act(s,{type:'produce',recipe:'sowlavender'});const saffron=act(s,{type:'produce',recipe:'sowsaffron'});const ring=act(s,{type:'produce',recipe:'rubyring'});
  for(const k of ['rubyring','saffron','saffronbun']){delete s.inventory[k];delete s.stats['made_'+k];}
  const before=structuredClone(s);normalizeFarm(s,now);
  for(const k of ['rubyring','saffron','saffronbun'])assert.equal(s.inventory[k],0,`${mode} ${k}`);
  for(const [k,n] of Object.entries(before.inventory))assert.equal(s.inventory[k],n,k);
  for(const key of ['buildings','stats','coins','xp'])assert.deepEqual(s[key],before[key],`${mode} ${key}`);
  const inventory=structuredClone(s.inventory);normalizeFarm(s,now);assert.deepEqual(s.inventory,inventory);
  // The saffron and the ring started before: they pay what they started with.
  assert.deepEqual(act(s,{type:'collect',building:'villagefields',jobId:saffron.jobId},saffron.readyAt).items,{saffron:8});
  assert.deepEqual(act(s,{type:'collect',building:'jeweller',jobId:ring.jobId},ring.readyAt).items,{rubyring:1});
 }
});
