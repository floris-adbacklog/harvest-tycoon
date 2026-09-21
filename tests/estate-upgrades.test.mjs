import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,normalizeFarm,xpForLevel,levelOf,upgradeCost,upgradeRequirements,diamondUpgradeCost,productionSlots,productionSpeed,recipeDuration,recipeAvailability,startProduction,ESTATE_UPGRADES,BASE_BUILDING_LEVEL,MAX_BUILDING_LEVEL,MAX_PLOTS,ENDGAME_FIELDS,RECIPES,BUILDINGS,ITEMS,BOOSTS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,21,12);
function farm(level=1){const s=createFarm(now);s.xp=xpForLevel(level);s.coins=1e9;s.diamonds=1e6;for(const b of Object.values(s.buildings))b.built=true;return s;}
const act=(s,action)=>applyFarmAction(s,action,now);
const supplies=(s,step)=>{for(const [key,n] of Object.entries(step.materials))s.inventory[key]=(s.inventory[key]??0)+n;};

test('forty fields get twenty building levels: ten as before, ten estate upgrades',()=>{
 assert.equal(MAX_PLOTS,40);assert.equal(BASE_BUILDING_LEVEL,10);assert.equal(MAX_BUILDING_LEVEL,20);assert.equal(ESTATE_UPGRADES.length,MAX_BUILDING_LEVEL-BASE_BUILDING_LEVEL);
 for(let level=1;level<=20;level++)assert.equal(productionSlots(level),level,'each level adds one slot');
 assert.equal(productionSlots(25),20,'never more than the top level');
});
test('levels 1 to 10 are exactly what they were',()=>{
 const before={1:0,2:.2,3:.4,4:.44,5:.48,6:.52,7:.56,8:.6,9:.64,10:.68};
 for(const [level,speed] of Object.entries(before))assert.ok(Math.abs(productionSpeed(Number(level))-speed)<1e-9,`speed at ${level}`);
 const s=farm(5);s.buildings.mill.level=2;assert.equal(upgradeCost(s,'mill'),Math.ceil(BUILDINGS.mill.upgradeCost*3));
 s.buildings.mill.level=9;assert.equal(upgradeCost(s,'mill'),Math.ceil(Math.round(BUILDINGS.mill.upgradeCost*12*2.7**6)));
 assert.equal(upgradeRequirements(s,'mill'),null,'nothing but coins below level 10');
 assert.equal(diamondUpgradeCost(s,'mill'),525);s.buildings.mill.level=10;assert.equal(diamondUpgradeCost(s,'mill'),570,'and the curve goes on above level 10');
});
test('production keeps getting faster above level 10, but never absurdly so',()=>{
 let last=productionSpeed(10);
 for(let level=11;level<=20;level++){const speed=productionSpeed(level);assert.ok(speed>last,`level ${level} is faster than ${level-1}`);assert.ok(speed<=.8+1e-9);last=speed;}
 assert.ok(Math.abs(productionSpeed(15)-.74)<1e-9);assert.ok(Math.abs(productionSpeed(20)-.8)<1e-9);assert.equal(productionSpeed(40),.8);
 const s=farm(50);
 for(let level=1;level<=20;level++)for(const building of ['mill','windmill','preserves']){
  s.buildings[building].level=level;const id=Object.entries(RECIPES).find(([,r])=>r.building===building)[0];
  const duration=recipeDuration(s,id,now);assert.ok(duration>0&&duration<=RECIPES[id].duration,`${id} at level ${level}`);
 }
 s.buildings.preserves.level=20;assert.ok(recipeDuration(s,'applevinegar',now)>=RECIPES.applevinegar.duration*.19,'the fastest is a fifth of the base time');
});
test('the estate steps rise in coins, farm level and difficulty, and only ask for goods that exist',()=>{
 let coins=0,level=0;
 for(const [i,step] of ESTATE_UPGRADES.entries()){
  assert.ok(step.coins>coins,`step ${i+1} costs more`);assert.ok(step.level>level,`step ${i+1} needs a higher farm level`);coins=step.coins;level=step.level;
  assert.ok(Object.keys(step.materials).length>=2);
  for(const [key,n] of Object.entries(step.materials)){assert.ok(ITEMS[key],key);assert.ok(Number.isInteger(n)&&n>0);assert.ok(Object.values(RECIPES).some(r=>r.output[key]),`${key} is made in a building`);}
  assert.ok(Object.isFrozen(step)&&Object.isFrozen(step.materials));
 }
 assert.ok(ESTATE_UPGRADES[0].level<ENDGAME_FIELDS[0].level,'the first estate step comes before the first endgame field');
 assert.ok(ESTATE_UPGRADES.at(-1).level<=ENDGAME_FIELDS.at(-1).level,'nothing asks for more than the last field');
 assert.ok(ESTATE_UPGRADES[0].coins<=ENDGAME_FIELDS[0].coins*1.5&&ESTATE_UPGRADES.at(-1).coins<=ENDGAME_FIELDS.at(-1).coins*4,'in proportion to what the fields cost');
});
test('an estate upgrade asks for the farm level, the coins and the goods, and takes all of them',()=>{
 const s=farm(1);s.buildings.mill.level=10;const step=ESTATE_UPGRADES[0];
 assert.deepEqual(upgradeRequirements(s,'mill'),{level:26,materials:step.materials});assert.notEqual(upgradeRequirements(s,'mill').materials,step.materials,'a copy');
 assert.equal(upgradeCost(s,'mill'),step.coins);
 assert.throws(()=>act(s,{type:'upgrade',building:'mill'}),/Reach level 26 to upgrade this building to level 11/);assert.equal(s.buildings.mill.level,10);
 s.xp=xpForLevel(26);assert.equal(levelOf(s),26);
 assert.throws(()=>act(s,{type:'upgrade',building:'mill'}),/Gather the missing supplies: 60 Fresh bread, 40 Cheese/);assert.equal(s.coins,1e9,'nothing is taken from a failed upgrade');
 supplies(s,step);s.coins=step.coins-1;assert.throws(()=>act(s,{type:'upgrade',building:'mill'}),/You need 400000 coins/);
 s.coins=step.coins+5;const breadBefore=s.inventory.bread,xpBefore=s.xp;
 const result=act(s,{type:'upgrade',building:'mill'});
 assert.equal(s.buildings.mill.level,11);assert.equal(s.coins,5);assert.equal(s.inventory.bread,breadBefore-60);assert.equal(s.inventory.cheese,0);assert.equal(s.xp,xpBefore+15);
 assert.deepEqual(result,{building:'mill',level:11,cost:400000,currency:'coins',materials:{bread:60,cheese:40}});
 assert.equal(productionSlots(11),11);assert.equal(s.stats.upgrades,1);
});
test('diamonds buy any of the twenty levels: a price curve that continues the first ten',()=>{
 const s=farm(90);let last=0;
 for(let level=1;level<20;level++){
  s.buildings.mill.level=level;const price=diamondUpgradeCost(s,'mill');
  assert.ok(price>last,`level ${level} to ${level+1} costs more than the step before (${price})`);last=price;
  if(level>=10)assert.ok(Math.abs(price-Math.round(ESTATE_UPGRADES[level-10].coins/700/5)*5)<=5,`about 700 coins to a diamond at level ${level}`);
 }
 s.buildings.mill.level=20;assert.equal(diamondUpgradeCost(s,'mill'),null);
 assert.deepEqual(ESTATE_UPGRADES.map(step=>step.diamonds),[570,745,970,1255,1645,2145,2785,3645,4715,6145]);
 assert.ok(ESTATE_UPGRADES[0].diamonds>525*1.05&&ESTATE_UPGRADES[0].diamonds<525*1.3,'no jump at level 10');
});
test('paying an estate upgrade in diamonds still needs the farm level and the goods, and keeps the coins and the voucher',()=>{
 const s=farm(1);s.buildings.mill.level=10;s.boosts.upgradeCredits=1;const step=ESTATE_UPGRADES[0],pay={type:'upgrade',building:'mill',currency:'diamonds',expectedCost:step.diamonds,expectedLevel:10};
 assert.throws(()=>act(s,pay),/Reach level 26/);
 s.xp=xpForLevel(26);assert.throws(()=>act(s,pay),/Gather the missing supplies/);assert.equal(s.diamonds,1e6,'a failed upgrade costs nothing');
 supplies(s,step);
 assert.throws(()=>act(s,{...pay,expectedCost:step.diamonds-1}),/Review the current diamond upgrade price/);
 s.diamonds=step.diamonds-1;assert.throws(()=>act(s,pay),/You need 570 diamonds/);
 s.diamonds=step.diamonds+3;const coins=s.coins;const result=act(s,pay);
 assert.deepEqual(result,{building:'mill',level:11,cost:570,currency:'diamonds',materials:{bread:60,cheese:40}});
 assert.equal(s.diamonds,3);assert.equal(s.coins,coins,'the coins are kept');assert.equal(s.boosts.upgradeCredits,1,'and so is the voucher');assert.equal(s.inventory.cheese,0);
});
test('the 50% voucher halves the coins of any of the twenty levels, once',()=>{
 const s=farm(95);
 for(const level of [1,9,10,15,19]){s.buildings.mill.level=level;s.boosts.upgradeCredits=0;const full=upgradeCost(s,'mill');s.boosts.upgradeCredits=1;assert.equal(upgradeCost(s,'mill'),Math.ceil(full/2),`level ${level}`);}
 s.buildings.dairy.level=10;s.boosts.upgradeCredits=1;supplies(s,ESTATE_UPGRADES[0]);
 const result=act(s,{type:'upgrade',building:'dairy'});assert.equal(result.cost,200000);assert.equal(s.boosts.upgradeCredits,0,'used up');
 s.buildings.dairy.level=11;supplies(s,ESTATE_UPGRADES[1]);assert.equal(upgradeCost(s,'dairy'),520000,'the next one is full price');
 for(const b of Object.values(s.buildings))b.level=20;s.boosts.upgradeCredits=0;assert.throws(()=>act(s,{type:'buy_boost',boost:'upgrade',expectedCost:BOOSTS.upgrade.cost}),/maximum level/,'a voucher is offered until every building is at 20');
 assert.doesNotMatch(BOOSTS.upgrade.description,/level 10/);
});
test('an upgrade waits for finished batches, like below level 10',()=>{
 const s=farm(50);s.buildings.mill.level=10;supplies(s,ESTATE_UPGRADES[0]);s.inventory.corn=4;
 startProduction(s,'feed',now,1);
 assert.throws(()=>act(s,{type:'upgrade',building:'mill'}),/Finish and collect all current batches/);
});
test('all ten estate steps can be taken in a row and the building ends fully upgraded',()=>{
 const s=farm(95);s.buildings.bakery.level=10;
 for(const [i,step] of ESTATE_UPGRADES.entries()){supplies(s,step);const r=act(s,{type:'upgrade',building:'bakery'});assert.equal(r.level,11+i);}
 assert.equal(s.buildings.bakery.level,20);assert.equal(upgradeCost(s,'bakery'),null);assert.equal(upgradeRequirements(s,'bakery'),null);
 assert.throws(()=>act(s,{type:'upgrade',building:'bakery'}),/fully upgraded/);
 for(const step of ESTATE_UPGRADES)for(const [key,n] of Object.entries(step.materials))assert.ok(s.inventory[key]>=0,`${key} was paid for exactly`);
 assert.equal(s.stats.upgrades,10);
});
test('twenty slots run twenty batches at once, and a saved farm with old levels loads unchanged',()=>{
 const s=farm(50);s.buildings.mill.level=20;s.inventory.corn=200;
 const started=startProduction(s,'feed',now,20);assert.equal(started.count,20);assert.equal(recipeAvailability(s,'feed').slots,20);assert.equal(recipeAvailability(s,'feed').used,20);
 assert.throws(()=>startProduction(s,'feed',now,21),/Choose 1–20 batches/);
 const old=farm(20);old.buildings.mill.level=10;old.buildings.dairy.level=7;
 const loaded=normalizeFarm(JSON.parse(JSON.stringify(old)),now);assert.equal(loaded.buildings.mill.level,10);assert.equal(loaded.buildings.dairy.level,7);
});
test('the server copy of the rules is identical, so the live farm-api only needs a redeploy',()=>{
 for(const path of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(path),read('game/farm-state.js'),path);
});
test('the building panel shows an estate upgrade with what it asks for, and explains what is missing',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/upgradeRequirements,expansionMaterials/);
 assert.match(ui,/\$\{estate\?'Estate upgrade':'Upgrade'\} to level \$\{next\}/);
 assert.match(ui,/\$\{estate\?`<div class="ingredients expansion-materials">\$\{itemList\(estate\.materials,true\)\}<\/div>`:''\}/,'the goods it asks for, with what you have');
 assert.match(ui,/!estateLevelOk\|\|!estateSupplies\?'disabled':''/);
 assert.match(ui,/Level \$\{next\} unlocks at farm level \$\{estate\.level\}\. You are level \$\{levelOf\(state\)\}\./);
 assert.match(ui,/\$\{state\.boosts\.upgradeCredits\?'Your 50% upgrade voucher is included in this price\. ':''\}/,'the voucher counts at every level');
 assert.match(ui,/id="upgrade-building-diamonds"[^>]*\$\{mutating\|\|state\.diamonds<diamondCost\|\|jobs\.length\|\|!estateLevelOk\|\|!estateSupplies\?'disabled':''\}/,'diamonds wait for the level and the goods too');
 assert.match(ui,/Level \$\{MAX_BUILDING_LEVEL\}: \$\{slots\} simultaneous batches/);
});
test('with many slots the batch picker has a Max button that respects what is available',()=>{
 const ui=read('public/economy-ui.js'),css=read('public/production-controls.css');
 assert.match(ui,/a\.maxCount>2\?` · <button type="button" class="batch-max" data-batch-step="max"/);
 assert.match(ui,/button\.dataset\.batchStep==='max'\?Math\.max\(1,most\)/);
 assert.match(ui,/most\.disabled=mutating\|\|count>=max/);
 assert.match(css,/\.batch-max\{[^}]*min-height:32px/);
});
