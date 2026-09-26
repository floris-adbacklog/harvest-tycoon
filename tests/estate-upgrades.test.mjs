import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,normalizeFarm,xpForLevel,upgradeCost,upgradeRequirements,productionSlots,productionJobs,productionSpeed,recipeDuration,recipeAvailability,startProduction,BASE_BUILDING_LEVEL,MAX_BUILDING_LEVEL,RECIPES,BUILDINGS,BOOSTS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,26,12);
function farm(level=1){const s=createFarm(now);s.xp=xpForLevel(level);s.coins=1e9;s.diamonds=1e6;for(const b of Object.values(s.buildings))b.built=true;return s;}
const act=(s,action)=>applyFarmAction(s,action,now);

// Level 10 is a fully upgraded building since 26 Sep 2026 (the estate upgrades to level 20 are gone; nobody had passed level 7).
test('level 10 is a fully upgraded building: ten slots, no price above it',()=>{
 assert.equal(MAX_BUILDING_LEVEL,10);assert.equal(BASE_BUILDING_LEVEL,10);
 for(let level=1;level<=10;level++)assert.equal(productionSlots(level),level,'each level adds one slot');
 assert.equal(productionSlots(25),10,'never more than the top level');
 const s=farm(90);s.buildings.mill.level=10;
 assert.equal(upgradeCost(s,'mill'),null);assert.equal(upgradeRequirements(s,'mill'),null);
 assert.throws(()=>act(s,{type:'upgrade',building:'mill'}),/fully upgraded/);
 assert.equal(s.buildings.mill.level,10);assert.equal(s.coins,1e9);assert.equal(s.diamonds,1e6);
 for(const b of Object.values(s.buildings))b.level=10;
 assert.throws(()=>act(s,{type:'buy_boost',boost:'upgrade',expectedCost:BOOSTS.upgrade.cost}),/maximum level/,'no upgrade voucher once everything is at 10');
});
test('speeds of levels 1 to 10 are as they were, and every level has a positive production time',()=>{
 const before={1:0,2:.2,3:.4,4:.44,5:.48,6:.52,7:.56,8:.6,9:.64,10:.68};
 for(const [level,speed] of Object.entries(before))assert.ok(Math.abs(productionSpeed(Number(level))-speed)<1e-9,`speed at ${level}`);
 const s=farm(50);
 for(let level=1;level<=10;level++)for(const building of ['mill','windmill','preserves']){
  s.buildings[building].level=level;const id=Object.entries(RECIPES).find(([,r])=>r.building===building)[0];
  const duration=recipeDuration(s,id,now);assert.ok(duration>0&&duration<=RECIPES[id].duration,`${id} at level ${level}`);
 }
});
test('the 50% voucher halves the coins of any level, once',()=>{
 const s=farm(95);
 for(const level of [1,5,9]){s.buildings.mill.level=level;s.boosts.upgradeCredits=0;const full=upgradeCost(s,'mill');s.boosts.upgradeCredits=1;assert.equal(upgradeCost(s,'mill'),Math.ceil(full/2),`level ${level}`);}
 s.buildings.dairy.level=9;s.inventory.milk=36;s.boosts.upgradeCredits=0;const full=upgradeCost(s,'dairy');s.boosts.upgradeCredits=1;
 const result=act(s,{type:'upgrade',building:'dairy'});assert.equal(result.cost,Math.ceil(full/2));assert.equal(s.boosts.upgradeCredits,0,'used up');assert.equal(s.buildings.dairy.level,10);
 assert.doesNotMatch(BOOSTS.upgrade.description,/level 20/);
});
test('an upgrade does not wait for a running batch: it keeps its own time and reward, and the new slot is usable at once',()=>{
 const s=farm(50);s.buildings.mill.level=5;s.inventory.corn=12;s.inventory.feed=20;   // the upgrade's own goods: 2 × 5 batches of 2 feed
 startProduction(s,'feed',now,5);const job=productionJobs(s.buildings.mill)[0],before=structuredClone(job);
 const r=act(s,{type:'upgrade',building:'mill'});assert.equal(r.level,6);
 assert.deepEqual(productionJobs(s.buildings.mill)[0],before,'the running batch keeps its own readyAt, output and xp');
 act(s,{type:'produce',recipe:'feed'});assert.equal(productionJobs(s.buildings.mill).length,6,'the slot from the upgrade is usable immediately');
});
test('ten slots run ten batches at once; a saved farm above level 10 loads at 10, lower levels unchanged',()=>{
 const s=farm(50);s.buildings.mill.level=10;s.inventory.corn=200;
 const started=startProduction(s,'feed',now,10);assert.equal(started.count,10);assert.equal(recipeAvailability(s,'feed').slots,10);
 assert.throws(()=>startProduction(s,'feed',now,11),/Choose 1–10 batches/);
 const old=farm(20);old.buildings.mill.level=14;old.buildings.dairy.level=7;
 const loaded=normalizeFarm(JSON.parse(JSON.stringify(old)),now);assert.equal(loaded.buildings.mill.level,10);assert.equal(loaded.buildings.dairy.level,7);
});
test('the server copy of the rules is identical, so the live farm-api only needs a redeploy',()=>{
 for(const path of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(path),read('game/farm-state.js'),path);
});
test('the building panel still says what an upgrade gives, and diamonds and coins do not wait for a running batch',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/\$\{state\.boosts\.upgradeCredits\?'50% voucher included\. ':''\}/,'the voucher counts at every level');
 assert.doesNotMatch(ui,/id="upgrade-building"[^>]*jobs\.length/,'coins do not wait for a running batch');
 assert.match(ui,/Level \$\{MAX_BUILDING_LEVEL\}: \$\{slots\} simultaneous batches/);
});
test('with many slots the batch picker has a Max button that respects what is available',()=>{
 const ui=read('public/economy-ui.js'),css=read('public/production-controls.css');
 assert.match(ui,/a\.maxCount>2\?` · <button type="button" class="batch-max" data-batch-step="max"/);
 assert.match(ui,/button\.dataset\.batchStep==='max'\?Math\.max\(1,most\)/);
 assert.match(ui,/most\.disabled=mutating\|\|count>=max/);
 assert.match(css,/\.batch-max\{[^}]*min-height:32px/);
});

test('from the upgrade to level 4 a building also asks for its own goods: 2 × the level in batches of its first product',async()=>{
 const {upgradeGoods,UPGRADE_GOODS_FROM}=await import('../game/farm-state.js');
 assert.equal(UPGRADE_GOODS_FROM,3);
 assert.deepEqual(upgradeGoods('coop',2),{},'coins only up to level 3: the beginner guide\'s first upgrade stays one tap');
 assert.deepEqual([3,6,9].map(l=>upgradeGoods('coop',l)),[{eggs:18},{eggs:36},{eggs:54}]);
 assert.deepEqual([3,6,9].map(l=>upgradeGoods('dairy',l)),[{milk:12},{milk:24},{milk:36}]);
 assert.deepEqual(upgradeGoods('kitchen',9),{stew:18});assert.deepEqual(upgradeGoods('glasshouse',3),{cauliflower:48});
 assert.deepEqual(upgradeGoods('factory',9),{flour:144,cheese:36,cloth:18,harvesthamper:9,squashsoup:9,cider:9},'the Factory makes everything, so goods from across the valley');
 assert.deepEqual(upgradeGoods('mill',10),{},'nothing above the top');
 for(const [key,b] of Object.entries(BUILDINGS).filter(([,b])=>b.type==='production'))for(const item of Object.keys(upgradeGoods(key,5)))assert.ok(Object.values(RECIPES).some(r=>r.output[item]&&(r.building===key||key==='factory')),`${key} makes ${item}`);
});
test('an upgrade takes the coins and the goods; the Buildings discount halves both; level 5-10 cost 1.5× the coins',()=>{
 const s=farm(40);s.buildings.dairy.level=5;s.inventory.milk=0;
 assert.deepEqual(upgradeRequirements(s,'dairy'),{level:1,materials:{milk:20}});
 assert.throws(()=>act(s,{type:'upgrade',building:'dairy'}),{message:'Make the goods first: 20 Milk.'},'no diamond route to mention');assert.equal(s.coins,1e9);
 s.inventory.milk=25;const coins=s.coins,price=upgradeCost(s,'dairy');act(s,{type:'upgrade',building:'dairy'});
 assert.equal(s.inventory.milk,5);assert.equal(s.coins,coins-price);assert.equal(s.buildings.dairy.level,6);
 assert.throws(()=>act(s,{type:'upgrade',building:'dairy',currency:'diamonds',expectedCost:225,expectedLevel:6}),/Upgrades are paid with coins and goods/,'not with diamonds');
 s.boosts.upgradeCredits=1;s.inventory.milk=12;const full=Math.round(upgradeCost(s,'dairy')*2);
 assert.deepEqual(upgradeRequirements(s,'dairy'),{level:1,materials:{milk:12}},'the voucher halves the goods (24 -> 12)');
 act(s,{type:'upgrade',building:'dairy'});assert.equal(s.inventory.milk,0);assert.equal(s.boosts.upgradeCredits,0,'used up');assert.ok(Math.abs(coins-price-s.coins-full/2)<=1,'and the coins');
 const t=farm(40);
 const craft=[1,2,3,4,5,6,7,8,9].map(level=>{t.buildings.craftshop.level=level;return upgradeCost(t,'craftshop');});
 assert.deepEqual(craft,[4500,12150,32805,124305,161598,210077,273099,355029,461538],'level 1-4 as before, level 5-10 1.5× the ladder');
 t.buildings.coop.level=2;assert.equal(upgradeCost(t,'coop'),Math.round(BUILDINGS.coop.upgradeCost*3),'a new farmer\'s early upgrades are unchanged');
});
test('the upgrade panel: one row with the coins and the goods, the Upgrade button and what is still missing; no diamond option',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/\$\{cost\?`Upgrade to level \$\{next\}`:'Fully upgraded'\}/);
 assert.match(ui,/<div class="upgrade-option"><div class="upgrade-cost"><span class="upgrade-price">\$\{art\('coins'\)\}<b>\$\{number\(cost\)\}<\/b><\/span>\$\{estate\?`<span class="upgrade-plus">\+<\/span><div class="ingredients expansion-materials">\$\{itemList\(estate\.materials,true\)\}<\/div>`:''\}<\/div>/,'coins plus the goods, with what you have');
 assert.match(ui,/<small class="shortfall">Still needed: \$\{stillNeeded\.join\(' and '\)\}\.<\/small>/,'exactly what is missing');
 assert.doesNotMatch(ui,/upgrade-building-diamonds|diamondUpgradeCost|Upgrade now · /);
 assert.match(ui,/\$\{cost===null\?'':`<div class="upgrade-payments">\$\{coinRow\}<\/div>`\}/);
 assert.match(read('public/production-controls.css'),/\.upgrade-option\{display:grid;grid-template-columns:minmax\(0,1fr\) auto;/);
 assert.match(read('public/wiki-content.js'),/From level 4 an upgrade also asks for goods the building makes itself, like milk for the Dairy Barn\. The Factory asks for goods from across the valley from its first upgrade\. The Buildings discount boost halves the coins and goods of your next upgrade\./);
});
