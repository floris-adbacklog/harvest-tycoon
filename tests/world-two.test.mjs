import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,unlockEntries,upgradeCost,upgradeRequirements,marketHighlights,familyOrder,
 BUILDINGS,RECIPES,ITEMS,VILLAGE_GOODS,MASTER_UPGRADES,MAX_BUILDING_LEVEL,TOP_BUILDING_LEVEL,WORLD_TWO_LEVEL,
 villageGood,worldTwoItem,worldTwoBuilding,beyondMaxBuilding,masterUpgrade,doubleBatchChance,worldTwoOpen,recipeLevel,buildingUnlocked,recipeUnlocked} from '../game/farm-state.js';

const now=Date.parse('2026-10-05T12:00:00Z');
function farm(level){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=50000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=true;if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k))b.level=MAX_BUILDING_LEVEL;}
 normalizeFarm(s,now);return s;
}
const act=(s,a,t=now,random)=>applyFarmAction(s,a,t,random);

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
 // Built with coins like the farm's buildings: 150,000 for the Mine and the Lumber Camp, 200,000 for the Smithy, 300,000 for the windmill.
 const fresh=createFarm(now);fresh.xp=xpForLevel(100);fresh.coins=400000;fresh.onboarding={...fresh.onboarding,completed:99,rewardClaimed:true};normalizeFarm(fresh,now);
 assert.equal(buildingUnlocked(fresh,'mine'),false,'eligible, not built yet');
 act(fresh,{type:'construct',building:'mine'});assert.equal(buildingUnlocked(fresh,'mine'),true);assert.equal(fresh.coins,250000);
 assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>BUILDINGS[k].buildCost),[150000,150000,200000,300000]);
});

test('the village goods stay in the village: own market, never in the farm Market, Family Orders or family sharing',async()=>{
 assert.equal(Object.keys(VILLAGE_GOODS).length,12);
 for(const k of Object.keys(VILLAGE_GOODS)){assert.ok(villageGood(k)&&worldTwoItem(k),k);}
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
 assert.equal(TOP_BUILDING_LEVEL,15);assert.deepEqual(MASTER_UPGRADES.map(u=>u.level),[108,120,140,160,180]);
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
 assert.deepEqual([9,10,11,13,15,20].map(doubleBatchChance),[0,0,.1,.3,.5,.5]);
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
  assert.ok(kind==='made'?w2(key):kind==='built'?worldTwoBuilding(key):['village_batches','village_sold','village_earned','beyond_upgrades'].includes(q.stat),q.stat);
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
