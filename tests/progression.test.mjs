import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,CROPS,BUILDINGS,RECIPES,CROP_LEVELS,BUILDING_LEVELS,FEATURE_LEVELS,BUILDING_COSTS,RECIPE_LEVELS,FEATURE_NAMES,cropUnlocked,buildingUnlocked,buildingEligible,buildingCost,constructionNeeds,featureUnlocked,recipeUnlocked,itemAvailable,beginnerProgress,xpForLevel,levelOf,dailyTasks,dailyOrders,DAY_MS,productionJobs,availableDaily,familyOrder,marketHighlights,unlockEntries,formatDuration,itemUnlockLevel} from '../game/farm-state.js';
import {progressionSnapshot,progressionChange,roadmapMarkup} from '../public/progression-ui.js';
import {ART_KEYS} from '../public/visual-icons.js';
const now=Date.UTC(2026,8,20,12);
function level(s,n){s.xp=xpForLevel(n);s.xpOffset=0;}
function produce(s,recipe,t=now){act(s,{type:'produce',recipe},t);const key=RECIPES[recipe].building,job=productionJobs(s.buildings[key]).at(-1);act(s,{type:'collect',building:key,jobId:job.id},job.readyAt);return job.readyAt;}
function buyAvailable(s,t=now){for(const key of Object.keys(BUILDINGS).sort((a,b)=>BUILDING_LEVELS[a]-BUILDING_LEVELS[b]))if(buildingCost(s,key)&&buildingEligible(s,key)&&!buildingUnlocked(s,key))act(s,{type:'construct',building:key},t);}
test('new farm starts with two crops, one production building and only a daily gift',()=>{
 const s=createFarm(now);assert.equal(s.progression.version,5);
 assert.deepEqual(Object.keys(CROPS).filter(k=>cropUnlocked(s,k)),['corn','wheat']);
 assert.deepEqual(Object.keys(BUILDINGS).filter(k=>buildingUnlocked(s,k)),['farmhouse','coop']);
 assert.ok(s.plots.every(p=>!p.crop||['wheat','corn'].includes(p.crop)));
 assert.deepEqual(Object.keys(RECIPES).filter(k=>recipeUnlocked(s,k)),['eggs']);
 for(const key of Object.keys(FEATURE_NAMES))assert.equal(featureUnlocked(s,key),false,key);
 assert.deepEqual(dailyTasks(s,now),[]);assert.deepEqual(dailyOrders(s,now),[]);
 assert.equal(act(s,{type:'checkin'},now).xp,10);
});
test('locked actions and premature construction cannot spend balances or goods',()=>{
 for(const action of [{type:'construct',building:'mill'},{type:'construct',building:'bakery'},{type:'field',id:6,action:'plant',crop:'cabbage'},{type:'produce',recipe:'milk'},{type:'upgrade',building:'bakery'},{type:'chore',id:'weeds'},{type:'activity_start',station:'greenhouse'},{type:'tractor',mode:'plant',crop:'wheat'},{type:'silo_upgrade'},{type:'project_start'},{type:'buy_boost',boost:'xp',expectedCost:25},{type:'daily',id:0}]){
  const s=createFarm(now),before=structuredClone(s);assert.throws(()=>act(s,action,now));assert.deepEqual(s,before,JSON.stringify(action));
 }
});
test('selling the first egg remains an achievable beginner step; jobs arrive at level 8',()=>{
 const s=createFarm(now),t=produce(s,'eggs');act(s,{type:'sell',item:'eggs',quantity:1},t);
 assert.equal(s.inventory.eggs,2);assert.equal(beginnerProgress(s).find(q=>q.id==='sell_egg').ready,true);
 assert.equal(featureUnlocked(s,'activities'),false);level(s,7);assert.equal(featureUnlocked(s,'activities'),false);level(s,8);assert.ok(featureUnlocked(s,'activities'));
 act(s,{type:'activity_start',station:'greenhouse'},t);assert.ok(s.activities.jobs.greenhouse);
});
test('buying through the feed, milk, grain and bread chain uses only earlier ingredients',()=>{
 const s=createFarm(now);s.coins=10000;
 level(s,2);assert.ok(buildingEligible(s,'mill'));assert.ok(!buildingUnlocked(s,'mill'));
 let coins=s.coins;act(s,{type:'construct',building:'mill'},now);assert.equal(s.coins,coins-100);
 s.inventory.corn=2;produce(s,'feed');
 level(s,4);act(s,{type:'construct',building:'dairy'},now);produce(s,'milk');assert.ok(!recipeUnlocked(s,'cheese'));
 level(s,6);act(s,{type:'construct',building:'windmill'},now);s.inventory.wheat=8;s.inventory.barley=4;produce(s,'grainmeal');produce(s,'flour');
 level(s,8);act(s,{type:'construct',building:'bakery'},now);produce(s,'bread');assert.equal(s.inventory.bread,2);
 level(s,9);assert.ok(cropUnlocked(s,'cabbage'));assert.ok(recipeUnlocked(s,'cheese'));
 const withoutBread=createFarm(now);level(withoutBread,10);assert.ok(cropUnlocked(withoutBread,'cabbage'));assert.ok(!buildingEligible(withoutBread,'packing'),'the Packing shed waits for level 11');level(withoutBread,11);assert.ok(buildingEligible(withoutBread,'packing'));
});
test('construction enforces ingredient suppliers, purchase price and one-time ownership',()=>{
 const s=createFarm(now);level(s,8);s.coins=5000;const coins=s.coins;
 assert.deepEqual(constructionNeeds(s,'bakery'),['dairy','windmill']);assert.throws(()=>act(s,{type:'construct',building:'bakery'},now),/Dairy Barn and Windmill/);assert.equal(s.coins,coins);
 act(s,{type:'construct',building:'mill'},now);const paid=s.coins;
 assert.throws(()=>act(s,{type:'construct',building:'mill'},now),/already/);assert.equal(s.coins,paid);
 const poor=createFarm(now);level(poor,2);poor.coins=99;assert.throws(()=>act(poor,{type:'construct',building:'mill'},now),/100 coins/);assert.equal(poor.coins,99);assert.ok(!buildingUnlocked(poor,'mill'));
});
test('every level has renewable play, every new building has a viable recipe; the early game opens by 25, the midgame by 47, the valley by 70 and the estate by 90',()=>{
 const s=createFarm(now);s.coins=10000000;
 const outputs=new Set();let cropCount=2;
 const early=key=>(BUILDING_LEVELS[key]??1)<=25,earlyRecipe=id=>(RECIPE_LEVELS[id]??1)<=25&&early(RECIPES[id].building);
 for(let n=1;n<=90;n++){
  level(s,n);buyAvailable(s);
  const crops=Object.keys(CROPS).filter(k=>cropUnlocked(s,k));assert.ok(crops.includes('wheat')&&crops.includes('corn'));assert.ok(crops.length>=cropCount);cropCount=crops.length;
  for(const [key,b]of Object.entries(BUILDINGS))if(BUILDING_LEVELS[key]===n&&b.type==='production')assert.ok(Object.keys(RECIPES).some(id=>RECIPES[id].building===key&&recipeUnlocked(s,id)),`${key} lacks a usable first recipe`);
  for(const [id,r]of Object.entries(RECIPES))if(recipeUnlocked(s,id)){
   for(const ingredient of Object.keys(r.input))assert.ok(itemAvailable(s,ingredient)||(ingredient==='feed'&&s.inventory.feed>0),`${n}: ${id} cannot obtain ${ingredient}`);
   Object.keys(r.output).forEach(k=>outputs.add(k));
  }
  if(n===70)for(const key of Object.keys(FEATURE_NAMES))assert.equal(featureUnlocked(s,key),FEATURE_LEVELS[key]<=70,`${key} opens at its own level`);
  if(n===25){
   assert.equal(cropCount,12);for(const key of Object.keys(BUILDINGS))if(early(key)&&key!=='factory')assert.ok(buildingUnlocked(s,key),key);
   for(const id of Object.keys(RECIPES))if(RECIPES[id].building!=='factory'&&earlyRecipe(id))assert.ok(recipeUnlocked(s,id),id);
   for(const key of Object.keys(FEATURE_NAMES))if(FEATURE_LEVELS[key]<=25)assert.ok(featureUnlocked(s,key),key);else assert.ok(!featureUnlocked(s,key),`${key} waits for its level`);
   assert.ok(outputs.has('pickledbeans')&&outputs.has('berrysmoothie')&&!outputs.has('harvesthamper'),'the harvest hamper waits for level 35');
  }
 }
 // By 90 every expansion is fully open: the Valley Market, the Ranch, the Estate Workshop, the Trade Depot and the fair included.
 assert.equal(cropCount,16);for(const key of Object.keys(FEATURE_NAMES))assert.ok(featureUnlocked(s,key),key);for(const key of Object.keys(BUILDINGS))if(key!=='factory')assert.ok(buildingUnlocked(s,key),key);
 for(const id of Object.keys(RECIPES))if(RECIPES[id].building!=='factory')assert.ok(recipeUnlocked(s,id),id);
 assert.ok(['squashsoup','beeswax','wool','yarn','cloth','cider','goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie','prizeproduce'].every(k=>outputs.has(k)));
 const levels=Object.entries(CROP_LEVELS).filter(([,n])=>n>1).sort((a,b)=>a[1]-b[1]);
 assert.deepEqual(levels.map(([k])=>k),['lettuce','barley','greenbeans','cabbage','cauliflower','pumpkin','redcabbage','sunflower','apples','berries','squash','polebeans','ciderapples','cherries']);
 assert.equal(new Set(levels.map(([,n])=>n)).size,14);
});
test('levelled inventory from the Starter Pack cannot bypass seeds, recipes or building locks',()=>{
 const s=createFarm(now);for(const key of Object.keys(s.inventory))s.inventory[key]=100;
 assert.equal(cropUnlocked(s,'berries'),false);assert.equal(recipeUnlocked(s,'berrytart'),false);assert.equal(buildingEligible(s,'preserves'),false);
 assert.throws(()=>act(s,{type:'field',id:6,action:'plant',crop:'apples'},now));
 act(s,{type:'sell',item:'apples',quantity:1},now);assert.equal(s.inventory.apples,99);
});
test('daily boards respect unlocks and owned production at all 25 levels',()=>{
 for(let lvl=1;lvl<=25;lvl++)for(const buy of [false,true])for(let day=0;day<14;day++){
  const t=now+day*DAY_MS,s=createFarm(t);level(s,lvl);s.coins=100000;if(buy)buyAvailable(s,t);s.inventory.feed=0;
  delete s.daily;normalizeFarm(s,t);
  const orders=dailyOrders(s,t),tasks=dailyTasks(s,t);
  if(lvl<3)assert.equal(tasks.length,0);if(lvl<5)assert.equal(orders.length,0);
  if(lvl<8)assert.ok(orders.every(o=>o.tier==='quick'));if(lvl<12)assert.ok(orders.every(o=>o.tier!=='commission'));
  for(const o of orders)for(const item of Object.keys(o.input))assert.ok(itemAvailable(s,item),`${lvl}/${buy}: ${o.title}: ${item}`);
  for(const q of tasks)assert.ok(availableDaily(s,q),`${lvl}: ${q.title}`);
 }
});
test('new delivery tiers append without changing paid, replaced or existing orders',()=>{
 const s=createFarm(now);s.coins=100000;level(s,5);buyAvailable(s);delete s.daily;normalizeFarm(s,now);
 const first=structuredClone(dailyOrders(s,now)[0]);assert.equal(s.daily.orderBoard.length,1);s.daily.orders=[0];s.daily.orderRevisions[0]=1;
 level(s,8);buyAvailable(s);dailyOrders(s,now);assert.equal(s.daily.orderBoard.length,2);
 assert.deepEqual(s.daily.orderBoard[0].input,first.input);assert.equal(s.daily.orderBoard[0].coins,first.coins);assert.deepEqual(s.daily.orders,[0]);assert.equal(s.daily.orderRevisions[0],1);
 level(s,15);buyAvailable(s);assert.equal(dailyOrders(s,now).length,2,'commission orders wait for level 16');
 level(s,16);buyAvailable(s);const all=dailyOrders(s,now);assert.equal(all.length,3);assert.equal(all[2].tier,'commission');
 const frozen=structuredClone(s.daily);normalizeFarm(s,now);dailyOrders(s,now);assert.deepEqual(s.daily,frozen);
});
test('the family order does not depend on level: anything can be asked, and the unlock level says when a farm can make it',()=>{
 // A solo family's order sits in the usual value band; a bigger one scales up until a line would need more than 3 days of work.
 for(let week=0;week<30;week++){const solo=familyOrder('test-family',week,1),six=familyOrder('test-family',week,6);assert.ok(solo.value>=16000&&solo.value<=30000);assert.ok(six.value>=solo.value&&six.value<=solo.value*6);}
 // The level a line shows ("unlocks at level N") matches when a guided farm really can make it.
 for(const n of [10,25,40,70]){const s=createFarm(now);s.coins=10000000;level(s,n);buyAvailable(s);
  for(const item of ['bread','cheese','honey','applejuice','candles','blanket','cherrypie'])if(itemUnlockLevel(item)<=n)assert.ok(itemAvailable(s,item),`${n}: ${item}`);
 }
});
test('level-up and roadmap use existing painted art and name the crop as it unlocks',()=>{
 const s=createFarm(now),before=progressionSnapshot(s),coins=s.coins;level(s,3);const event=progressionChange(before,s);
 for(const id of ['building:mill','crop:lettuce','feature:challenges'])assert.ok(event.entries.some(e=>e.id===id));
 assert.equal(s.coins,coins);assert.deepEqual(progressionChange(progressionSnapshot(s),s).entries,[]);
 for(let n=1;n<=25;n++){level(s,n);for(const e of unlockEntries(s))assert.ok(ART_KEYS.includes(e.art),e.id);}
 assert.equal((roadmapMarkup(createFarm(now)).match(/class="roadmap-entry"/g)??[]).length,3);
});
test('market highlights only suggest currently obtainable goods or items already in stock',()=>{
 const s=createFarm(now);for(let d=0;d<14;d++)for(const q of Object.values(marketHighlights(now+d*DAY_MS,s)))assert.ok(itemAvailable(s,q.item)||s.inventory[q.item]>0,q.item);
});
test('all ten beginner steps still finish in the first session and pay once',()=>{
 const s=createFarm(now);
 act(s,{type:'field',id:0,action:'harvest'},now);act(s,{type:'field',id:6,action:'plant',crop:'wheat'},now);act(s,{type:'field',id:6,action:'water'},now);
 act(s,{type:'sell',item:'corn',quantity:1},now);act(s,{type:'produce',recipe:'eggs'},now);act(s,{type:'checkin'},now);
 act(s,{type:'field',id:6,action:'tend'},now+10000);act(s,{type:'field',id:6,action:'harvest'},now+120000);
 act(s,{type:'collect',building:'coop'},now+300000);act(s,{type:'sell',item:'eggs',quantity:1},now+300000);
 // Steps finish themselves as they are done (in any order they happened); only the last one, with the diamonds, is claimed.
 assert.equal(s.onboarding.completed,9);for(const q of beginnerProgress(s))assert.equal(q.ready,true,q.id);
 const diamonds=s.diamonds;const levelDiamonds=act(s,{type:'beginner_claim',id:'collect'},now+300000).levelReward?.diamonds??0;
 assert.equal(s.onboarding.rewardClaimed,true);assert.equal(s.diamonds,diamonds+50+levelDiamonds);assert.throws(()=>act(s,{type:'beginner_claim',id:'collect'},now+300000));
});
test('pre-update guided and legacy saves retain every prior unlock, balance, timer and paid reward',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/progression-v1.json',import.meta.url),'utf8'));
 for(const {name,state,access}of fixtures){const s=structuredClone(state);normalizeFarm(s,now);
  for(const key of access.crops)assert.ok(cropUnlocked(s,key),`${name}: ${key}`);
  for(const key of access.buildings)assert.ok(buildingUnlocked(s,key),`${name}: ${key}`);
  for(const key of access.features)assert.ok(featureUnlocked(s,key),`${name}: ${key}`);
  for(const key of access.recipes)assert.ok(recipeUnlocked(s,key),`${name}: ${key}`);
  for(const key of ['coins','diamonds','claimed','plots','daily','onboarding','levelRewards'])assert.deepEqual(s[key],state[key],`${name}: ${key}`);
  // Every item the save had keeps its count; items added to the game since then start at zero.
  for(const [key,n] of Object.entries(state.inventory))assert.equal(s.inventory[key],n,`${name}: inventory ${key}`);
  for(const key of Object.keys(s.inventory))if(!(key in state.inventory))assert.equal(s.inventory[key],0,`${name}: new item ${key}`);
  assert.equal(levelOf(s),levelOf(state),`${name}: the level survives the shorter curve`);
  for(const key of Object.keys(state.buildings))assert.deepEqual(productionJobs(s.buildings[key]),productionJobs(state.buildings[key]),`${name}: jobs`);
  const migrated=structuredClone(s);normalizeFarm(s,now);assert.deepEqual(s,migrated,`${name}: migration must be idempotent`);
 }
});

test('grandfathered construction keeps the first recipe when a previously available building is bought later',()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/progression-v1.json',import.meta.url),'utf8'));
 const saved=fixtures.find(f=>f.name==='level-9-bread-true-paid-true-legacy-false').state;
 const s=structuredClone(saved);s.buildings.juicepress.built=false;normalizeFarm(s,now);
 assert.ok(buildingEligible(s,'juicepress'));assert.ok(!buildingUnlocked(s,'juicepress'));
 act(s,{type:'construct',building:'juicepress'},now);assert.ok(recipeUnlocked(s,'applejuice'));
 s.progression.kept.recipes=[];assert.ok(recipeUnlocked(s,'applejuice'),'partial older migration still keeps buildable recipe access');
 s.inventory.apples=4;produce(s,'applejuice');assert.equal(s.inventory.applejuice,1);
});
