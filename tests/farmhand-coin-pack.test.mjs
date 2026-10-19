// The farmhand and the coin pack in Power-ups (20 Oct 2026, the owner): a farmhand gives one more production slot in every building but
// the Factory for a day, for 150 diamonds, and counts like any batch; the coin pack gives 1,000 coins for every level of the farm for 100 diamonds. The
// special offer values coins at 500 a diamond (it was 200).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction as act,xpForLevel,buildingSlots,productionSlots,farmhandActive,farmhandWorks,buildingRecipes,BOOSTS,COIN_PACK,coinPackCoins,RECIPES,recipeAvailability,normalizeFarm,farmSummary,startProduction} from '../game/farm-state.js';
import {OFFER,offerFill,offerValueCents,offerProblem} from '../game/payments.js';
const now=Date.UTC(2026,9,20,12),DAY=86400000;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
function farm(level=20){const s=createFarm(now);s.xp=xpForLevel(level);s.diamonds=1000;return s;}

test('the farmhand costs 150 diamonds, works a day, and buying it again adds a day after it',()=>{
 assert.equal(BOOSTS.farmhand.cost,150);assert.equal(BOOSTS.farmhand.duration,DAY);
 const s=farm();act(s,{type:'buy_boost',boost:'farmhand',expectedCost:150},now);
 assert.equal(s.boosts.farmhandUntil,now+DAY);assert.equal(s.diamonds,850);assert.equal(s.stats.diamonds_spent,150);assert.equal(farmhandActive(s,now),true);
 act(s,{type:'buy_boost',boost:'farmhand',expectedCost:150},now+1000);assert.equal(s.boosts.farmhandUntil,now+2*DAY);
 assert.throws(()=>act(s,{type:'buy_boost',boost:'farmhand',expectedCost:100},now),/prices have changed/i);
 const low=farm(9);assert.throws(()=>act(low,{type:'buy_boost',boost:'farmhand',expectedCost:150},now),/Reach level 10/,'with the other boosts, from level 10');
});
test('while the farmhand works every building but the Factory has one more slot; a batch in it runs on after the farmhand leaves',()=>{
 const s=farm(20);const coop=s.buildings.coop;assert.ok(coop&&coop.built!==false,'the Chicken Coop stands from the start');
 const base=productionSlots(coop.level,'coop');assert.equal(buildingSlots(s,'coop',now),base);
 act(s,{type:'buy_boost',boost:'farmhand',expectedCost:150},now);assert.equal(buildingSlots(s,'coop',now),base+1);assert.equal(buildingSlots(s,'villagemill',now),productionSlots(1,'villagemill')+1,'the village too');
 const recipe=Object.keys(RECIPES).find(id=>RECIPES[id].building==='coop'&&recipeAvailability(s,id,now).canStart);assert.ok(recipe);
 for(const k of Object.keys(RECIPES[recipe].input))s.inventory[k]=1000;
 for(let i=0;i<base+1;i++)act(s,{type:'produce',recipe},now+i);
 assert.equal((coop.job?1:0)+coop.extraJobs.length,base+1,'one batch more than the level gives');
 assert.equal(recipeAvailability(s,recipe,now+10).canStart,false,'full');
 const after=now+DAY+1000;assert.equal(buildingSlots(s,'coop',after),base);
 assert.equal(recipeAvailability(s,recipe,after).busy,true,'no new batch until it is below its own slots again');
 normalizeFarm(s,after);assert.equal(s.boosts.farmhandUntil,now+DAY,'the save keeps the time');
});
test('the farmhand does not work for the Factory (the owner: "de knecht werkt niet voor de factory")',()=>{
 const s=farm(60);s.buildings.factory.built=true;s.coins=1e7;
 act(s,{type:'buy_boost',boost:'farmhand',expectedCost:150},now);assert.equal(farmhandWorks('factory'),false);assert.equal(farmhandWorks('coop'),true);
 assert.equal(buildingSlots(s,'factory',now),productionSlots(1,'factory'));assert.equal(buildingSlots(s,'factory',now),1,'a level-1 Factory: one slot');
 const recipe=buildingRecipes(s,'factory').find(id=>!recipeAvailability(s,id,now).locked);assert.ok(recipe);
 for(const k of Object.keys(RECIPES[recipe].input))s.inventory[k]=100000;
 act(s,{type:'produce',recipe},now);
 assert.throws(()=>act(s,{type:'produce',recipe},now+1),/Not enough free production slots/,'no second batch at Factory level 1 while the farmhand works');
 assert.equal(recipeAvailability(s,recipe,now+1).busy,true);
 // The Factory window says nothing about the farmhand; every other building's does.
 assert.match(read('public/economy-ui.js'),/\$\{farmhandWorks\(key\)&&farmhandActive\(state,farmNow\(\)\)\?` Your farmhand adds one more for /);
 assert.equal(BOOSTS.farmhand.description,'One more production slot in every building but the Factory for 24 hours.');
});
test('a level-10 building with the farmhand starts all eleven batches at once (Max); without him ten is the most',()=>{
 const s=farm(60);const mill=s.buildings.windmill;mill.built=true;mill.level=10;s.coins=1e7;
 const recipe=buildingRecipes(s,'windmill').find(id=>!recipeAvailability(s,id,now).locked);assert.ok(recipe);
 for(const k of Object.keys(RECIPES[recipe].input))s.inventory[k]=100000;
 const plain=structuredClone(s);assert.throws(()=>startProduction(plain,recipe,now,11),/Choose 1–10 batches/);
 act(s,{type:'buy_boost',boost:'farmhand',expectedCost:150},now);
 const a=recipeAvailability(s,recipe,now);assert.equal(a.slots,11);assert.equal(a.maxCount,11);
 assert.equal(act(s,{type:'produce',recipe,count:11},now).count,11,'the Max button sends 11');
 assert.throws(()=>startProduction(s,recipe,now,12),/Choose 1–11 batches/);
 // The farm summary (the game's agent tools) counts the farmhand's slot too.
 assert.equal(farmSummary(s,now).buildings.find(b=>b.id==='windmill').slots,11);
 // "Fully upgraded" names the level's own slots, not the farmhand's.
 assert.match(read('public/economy-ui.js'),/`Level \$\{MAX_BUILDING_LEVEL\}: \$\{productionSlots\(MAX_BUILDING_LEVEL,key\)\} simultaneous batches;/);
});
test('the coin pack opens with the shop at level 10, on the server too, and shows in the player log and the shop numbers',()=>{
 const low=farm(9);low.diamonds=500;const before=structuredClone(low);
 assert.throws(()=>act(low,{type:'buy_coins',expectedCost:100,expectedCoins:9000},now),/Reach level 10/);assert.deepEqual(low,before);
 assert.equal(act(farm(10),{type:'buy_coins',expectedCost:100,expectedCoins:10000},now).coins,10000);
 assert.match(read('supabase/functions/farm-api/player-log.js'),/buy_coins:\['diamonds',\(a,s,r\)=>`Bought \$\{number\(r\?\.coins\?\?0\)\} coins with diamonds`\]/);
 assert.match(read('public/farm-client.js'),/\['buy_boost','buy_coins','finish_crop','finish_batch','replace_order'\]\.includes\(action\.type\)/);
 assert.match(read('src/analytics.js'),/'coins','farmhand','crops','production','upgrade','replace_order','buy_coins'\]/);
});
test('the coin pack gives 1,000 coins for every level for 100 diamonds, as often as the farmer likes; the coins are not earned',()=>{
 assert.equal(COIN_PACK.cost,100);assert.equal(COIN_PACK.perLevel,1000);
 for(const level of [10,30,50,90]){const s=farm(level);assert.equal(coinPackCoins(s),level*1000);
  const coins=s.coins,earned=s.stats.earned;const r=act(s,{type:'buy_coins',expectedCost:100,expectedCoins:level*1000},now);
  assert.deepEqual(r,{coins:level*1000,cost:100});assert.equal(s.coins,coins+level*1000);assert.equal(s.diamonds,900);assert.equal(s.stats.earned,earned);assert.equal(s.stats.coins_bought,level*1000);}
 const s=farm(30);act(s,{type:'buy_coins',expectedCost:100,expectedCoins:30000},now);act(s,{type:'buy_coins',expectedCost:100,expectedCoins:30000},now);assert.equal(s.diamonds,800);
 assert.throws(()=>act(farm(31),{type:'buy_coins',expectedCost:100,expectedCoins:30000},now),/Prices have changed/,'a level gained since the shop was drawn');
 const poor=farm(30);poor.diamonds=99;const before=structuredClone(poor);assert.throws(()=>act(poor,{type:'buy_coins',expectedCost:100,expectedCoins:30000},now),/100 diamonds/);assert.deepEqual(poor,before);
});
test('the special offer values coins at 500 a diamond',()=>{
 assert.equal(OFFER.coinsPerDiamond,500);
 assert.deepEqual(offerFill({diamonds:true,coins:true,vipDays:60}),{diamonds:1000,coins:500000,vipDays:60});
 assert.equal(offerProblem({diamonds:1000,coins:500000,vipDays:60}),null);
 assert.match(offerProblem({diamonds:1000,coins:200000,vipDays:60})??'',/worth €49.99/,'the old mix is no longer worth €49.99');
 assert.equal(offerValueCents({coins:500000}),offerValueCents({diamonds:1000}));
 // The offer window's fine print names the same rate (the coin pack in Power-ups has its own).
 assert.match(read('src/offer-ui.js'),new RegExp(`Worth: diamonds and VIP at shop prices, coins at ${OFFER.coinsPerDiamond} a diamond\\.`));
 for(const f of ['diamond-checkout','stripe-webhook','play-voided','app-store-notify'])assert.equal(read(`supabase/functions/${f}/payments.js`),read('game/payments.js'),f);
});
test('the shop shows both under Power-ups, the bonuses list the farmhand, and the pictures are WebP',()=>{
 const ui=read('public/boosts-ui.js');
 assert.match(ui,/<h3 class="shop-heading">Power-ups<\/h3><div class="shop-list">\$\{powerUps\}<\/div><\/section>/);
 assert.match(ui,/const powerUps=\[\.\.\.entries\.filter\(\(\[id\]\)=>!finishNow\.includes\(id\)\)\.map\(entry=>\[entry\[1\]\.cost,boostCard\(entry\)\]\),\[COIN_PACK\.cost,coinCard\]\]\.sort\(\(a,b\)=>a\[0\]-b\[0\]\)/);
 // From cheap to dear (the owner): 50, 75, 100, the coins for 100, 150, 250.
 const order=[...Object.entries(BOOSTS).filter(([id])=>!['crops','production'].includes(id)).map(([id,b])=>[b.cost,id]),[COIN_PACK.cost,'coins-pack']].sort((a,b)=>a[0]-b[0]).map(([,id])=>id);
 assert.deepEqual(order,['xp','harvest','coins','coins-pack','farmhand','upgrade']);
 assert.match(ui,/runAction\(\{type:'buy_coins',expectedCost:COIN_PACK\.cost,expectedCoins:coins\}\)/);
 assert.match(ui,/\['farmhand','Farmhand',state\.boosts\.farmhandUntil,'farmhand'\]/);
 assert.match(read('public/bonus-overview.js'),/row\('farmhand',BOOSTS\.farmhand\.name,`\$\{formatDuration\(farmhandLeft\)\} left`,'\+1 slot'\)/);
 const icons=read('public/visual-icons.js');assert.match(icons,/webpPictures=new Set\(\['live-events','family-sharing','farmhand','coin-cart',/);
 for(const f of ['farmhand','coin-cart'])assert.ok(readFileSync(new URL(`../public/assets/icons/${f}.webp`,import.meta.url)).length>1000,f);
});
