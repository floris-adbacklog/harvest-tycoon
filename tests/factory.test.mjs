import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {createFarm,applyFarmAction,normalizeFarm,xpForLevel,levelOf,recipeAvailability,recipeUnlocked,recipeUnlockHint,recipeDuration,recipeValue,productionSlots,productionSpeed,productionJobs,upgradeCost,buildingEligible,buildingUnlocked,buildingCost,factoryBatches,marketQuote,BUILDINGS,BUILDING_LEVELS,BUILDING_COSTS,RECIPES,CROPS,ITEMS,FACTORY_LEVEL,FACTORY_COST,FACTORY_TIME_FACTOR,FACTORY_HONEY,FACTORY_UPGRADE_MULTIPLIER,MAX_BUILDING_LEVEL,SINGLE_BATCH_COST,BOOSTS,QUESTS} from '../game/farm-state.js';
import {ANCHORS,anchorAt} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,21,12);
const act=(s,action,t=now)=>applyFarmAction(s,action,t);
// Every production recipe gets a bulk version, except the Glasshouse's: those grow crops, and the Factory never makes crops.
const base=Object.entries(RECIPES).filter(([,r])=>r.building!=='factory'&&r.building!=='glasshouse');
const mass=Object.entries(RECIPES).filter(([,r])=>r.building==='factory');
function farm(level=60){const s=createLegacyFarm(now);s.xp=xpForLevel(level);s.coins=1e9;s.diamonds=1000;for(const b of Object.values(s.buildings))b.built=true;for(const k of Object.keys(s.inventory))s.inventory[k]=0;return s;}

test('the Factory is an endgame building: level 50, 100,000 coins, twenty levels, model hangar_007',()=>{
 const b=BUILDINGS.factory;assert.equal(b.name,'Factory');assert.equal(b.type,'production');assert.equal(b.model,'hangar_007');
 assert.equal(FACTORY_LEVEL,50);assert.equal(FACTORY_COST,100000);assert.equal(b.minLevel,50);assert.equal(b.buildCost,100000);
 assert.equal(BUILDING_LEVELS.factory,50);assert.equal(BUILDING_COSTS.factory,100000);
 const s=createFarm(now);s.coins=1e9;
 s.xp=xpForLevel(49);assert.equal(buildingEligible(s,'factory'),false);assert.throws(()=>act(s,{type:'construct',building:'factory'}),/level|unlock|open/i);assert.equal(s.coins,1e9);
 s.xp=xpForLevel(50);assert.equal(levelOf(s),50);assert.equal(buildingEligible(s,'factory'),true);assert.equal(buildingCost(s,'factory'),100000);assert.equal(buildingUnlocked(s,'factory'),false,'it has to be bought');
 act(s,{type:'construct',building:'factory'});assert.equal(s.coins,1e9-100000);assert.equal(buildingUnlocked(s,'factory'),true);
 assert.equal(FACTORY_UPGRADE_MULTIPLIER,2);assert.equal(upgradeCost(s,'factory'),Math.round(800*1.5)*FACTORY_UPGRADE_MULTIPLIER,'same curve as every production building, just doubled');
 assert.equal(MAX_BUILDING_LEVEL,20);
});
test('every production recipe has one bulk version: quick goods x20, slow goods x10, in twice the time, with the same XP per ingredient',()=>{
 assert.equal(base.length,37);assert.equal(mass.length,38,'thirty-seven bulk recipes and the honey');
 assert.deepEqual(Object.keys(RECIPES).filter(id=>RECIPES[id].building==='glasshouse'&&RECIPES[`mass_${id}`]),[],'no bulk Glasshouse');
 for(const [id,r] of base){
  const m=RECIPES[`mass_${id}`],n=r.duration<=3600000?20:10;assert.ok(m,id);
  assert.equal(m.building,'factory');assert.equal(m.base,id);assert.equal(m.batches,n);assert.equal(factoryBatches(r),n);
  for(const [k,c] of Object.entries(r.input))assert.equal(m.input[k],c*n,`${id} ${k}`);assert.equal(Object.keys(m.input).length,Object.keys(r.input).length);
  for(const [k,c] of Object.entries(r.output))assert.equal(m.output[k],c*n,`${id} ${k}`);
  assert.equal(m.duration,r.duration*FACTORY_TIME_FACTOR,`${id} takes twice as long`);assert.equal(FACTORY_TIME_FACTOR,2);
  assert.equal(m.xp,r.xp*n,`${id} pays the same XP per ingredient`);assert.match(m.name,new RegExp(`×${n}$`));assert.ok(Object.isFrozen(m)&&Object.isFrozen(m.input));
 }
 assert.deepEqual([RECIPES.mass_eggs.input,RECIPES.mass_eggs.output,RECIPES.mass_eggs.duration],[{feed:20},{eggs:60},600000]);
 assert.deepEqual([RECIPES.mass_bread.input,RECIPES.mass_bread.output],[{flour:80,milk:40},{bread:40}]);
 assert.deepEqual([RECIPES.mass_harvesthamper.input,RECIPES.mass_harvesthamper.output,RECIPES.mass_harvesthamper.duration],[{applejuice:20,berrypreserves:20,bread:20},{harvesthamper:10},57600000]);
 assert.deepEqual(RECIPES.mass_berrypreserves.input,{berries:40,honey:30},'honey recipes are bulk too');
});
test('the Factory only makes production goods: no bulk recipe produces a crop, and nothing is planted or grown there',()=>{
 for(const [id,r] of mass)for(const item of Object.keys(r.output)){assert.ok(!CROPS[item],`${id} makes ${item}`);assert.ok(ITEMS[item],item);}
 assert.deepEqual(mass.filter(([id])=>RECIPES[id].output.honey).map(([id])=>id),['mass_hives','mass_honey'],'honey is bottled for coins, or comes along with the Bee Yard\'s beeswax');
 assert.ok(!Object.keys(BUILDINGS.factory).some(key=>/plot|field|plant/i.test(key)));
});
test('bottled honey: 100 coins a honey, 50 a batch, 135 minutes (twice what a hive needs), no ingredients, a little XP',()=>{
 const r=RECIPES.mass_honey;assert.deepEqual(FACTORY_HONEY,{coins:5000,batch:50,duration:8100000,xp:50});
 assert.deepEqual([r.input,r.output,r.coins,r.duration,r.xp,r.name],[{},{honey:50},5000,8100000,50,'Bottle honey ×50']);
 assert.equal(r.coins/r.output.honey,100);
 assert.ok(Math.abs(r.duration-2*(50/45)*3600000)<=180000,'about twice the time one hive needs for 50 honey (45 an hour): 2 h 13 min, rounded to 2 h 15');
 assert.ok(ITEMS.honey.sell<100,'buying honey and selling it again never pays');
 assert.ok(recipeValue('mass_honey').added<0,'a coin sink, not a source of income');
});
test('a honey batch takes its coins at the start, needs the balance, and scales with the number of batches',()=>{
 const s=farm();s.buildings.factory.level=9;assert.equal(productionSlots(9,'factory'),5,'all five slots by level 9');
 s.coins=4999;assert.throws(()=>act(s,{type:'produce',recipe:'mass_honey'}),/You need 5000 coins/);assert.equal(s.coins,4999);
 assert.equal(recipeAvailability(s,'mass_honey').poor,true);assert.equal(recipeAvailability(s,'mass_honey').canStart,false);assert.equal(recipeAvailability(s,'mass_honey').maxCount,0);
 s.coins=12000;const a=recipeAvailability(s,'mass_honey');assert.equal(a.maxCount,2,'the balance allows two');assert.equal(a.price,5000);assert.equal(a.canStart,true);
 assert.throws(()=>act(s,{type:'produce',recipe:'mass_honey',count:3}),/You need 15000 coins for 3 batches/);assert.equal(s.coins,12000);
 act(s,{type:'produce',recipe:'mass_honey',count:2});assert.equal(s.coins,2000);assert.equal(productionJobs(s.buildings.factory).length,2);
 const job=productionJobs(s.buildings.factory)[0];assert.deepEqual(job.output,{honey:50});
 assert.throws(()=>act(s,{type:'collect',building:'factory'},now+1000),/still|Nothing/i);
 const before=s.inventory.honey;act(s,{type:'collect',building:'factory',jobId:job.id},job.readyAt);assert.equal(s.inventory.honey,before+50);assert.equal(s.stats.made_honey,50);
});
test('a bulk batch takes twice the normal time, uses 10-20 batches of ingredients, gives 10-20 batches of goods and collects once',()=>{
 const s=farm();s.buildings.factory.level=1;s.inventory.feed=15;
 assert.throws(()=>act(s,{type:'produce',recipe:'mass_eggs'}),/Missing ingredients/,'20 feed are needed');s.inventory.feed=45;
 const started=act(s,{type:'produce',recipe:'mass_eggs'});assert.equal(s.inventory.feed,25);
 assert.equal(started.readyAt-now,10*60000,'twice the five minutes of one batch');assert.equal(recipeDuration(s,'mass_eggs',now),10*60000);
 assert.throws(()=>act(s,{type:'collect',building:'factory'},now+9*60000),/still/);
 const xp=s.xp,eggs=s.inventory.eggs;const got=act(s,{type:'collect',building:'factory'},started.readyAt);
 assert.deepEqual(got.items,{eggs:60});assert.equal(s.inventory.eggs,eggs+60);assert.equal(s.xp,xp+200);
 assert.throws(()=>act(s,{type:'collect',building:'factory'},started.readyAt),/Nothing to collect/);
 assert.equal(s.stats.made_eggs,60);assert.equal(s.stats.produced,1,'one batch, however big');
});
test('bulk recipes need the Factory and the normal recipe: a locked recipe stays locked',()=>{
 const s=createFarm(now);s.xp=xpForLevel(50);s.coins=1e9;
 assert.equal(recipeUnlocked(s,'mass_eggs'),false);assert.match(recipeUnlockHint(s,'mass_eggs'),/Open the Factory|Factory/i);
 act(s,{type:'construct',building:'factory'});
 const wasBase=recipeUnlocked(s,'harvesthamper');assert.equal(recipeUnlocked(s,'mass_harvesthamper'),wasBase,'as unlocked as the recipe it repeats');
 s.xp=xpForLevel(3);assert.equal(recipeUnlocked(s,'mass_grainmeal'),false,'below the level of the grind recipe');
 assert.ok(recipeAvailability(s,'mass_grainmeal').locked);
});
test('the specialised buildings keep their point: a full Factory adds less than one full specialised building',()=>{
 const regular=level=>productionSlots(level)/(1-productionSpeed(level));
 const factory=(level,perBatch)=>productionSlots(level,'factory')*(perBatch/FACTORY_TIME_FACTOR)/(1-productionSpeed(level,'factory'));
 let last={quick:0,slow:0};
 for(let level=1;level<=20;level++){
  const now={quick:factory(level,20),slow:factory(level,10)};
  assert.ok(now.quick>=last.quick&&now.slow>=last.slow,`level ${level} is not weaker than the one before`);last=now;
  assert.equal(productionSlots(level,'factory'),Math.min(5,Math.ceil(level/2)),'a slot every two levels, up to five');assert.ok(Math.abs(productionSpeed(level,'factory')-productionSpeed(level)/2)<1e-9);
 }
 assert.equal(productionSlots(20,'factory'),5);assert.equal(productionSlots(1,'factory'),1);
 assert.ok(factory(20,20)<regular(20)*.9,`a full Factory (${factory(20,20).toFixed(0)}) stays below one full building (${regular(20).toFixed(0)})`);
 assert.ok(factory(20,10)<regular(20)*.5,'and for slow goods well below');
 assert.ok(regular(20)>regular(10)*3,'so levels 11-20 of a specialised building still triple its output');
 assert.ok(regular(10)*10>factory(20,20)*3,'ten specialised buildings at level 10 outproduce a full Factory by far');
 assert.ok(factory(1,20)<regular(10),'a fresh Factory does not replace a level-10 building');
});
test('only the Factory\'s coin upgrade price is doubled; the diamond alternative and every other building are untouched',()=>{
 const s=farm();
 for(const [id,b] of Object.entries(BUILDINGS).filter(([,b])=>b.type==='production'&&b!==BUILDINGS.factory)){
  s.buildings[id].level=1;assert.equal(upgradeCost(s,id),Math.round(b.upgradeCost*1.5),id);
 }
 s.buildings.factory.level=1;assert.equal(upgradeCost(s,'factory'),Math.round(BUILDINGS.factory.upgradeCost*1.5)*FACTORY_UPGRADE_MULTIPLIER);
});
test('the Factory is bought with coins or diamonds and estate-upgrades levels 11-20 like the others, just doubled',()=>{
 const s=farm();s.buildings.factory.level=10;
 assert.equal(upgradeCost(s,'factory'),400000*FACTORY_UPGRADE_MULTIPLIER,'the same estate step every building shares, doubled for the Factory alone');
 s.buildings.factory.level=20;assert.equal(upgradeCost(s,'factory'),null);
 s.buildings.factory.level=1;const r=act(s,{type:'upgrade',building:'factory'});assert.equal(r.level,2);assert.equal(productionSlots(2,'factory'),1,'level 2 still has one slot');assert.equal(productionSlots(3,'factory'),2,'the second slot comes at level 3');
 s.buildings.factory.level=4;act(s,{type:'upgrade',building:'factory'});assert.equal(s.buildings.factory.level,5);assert.equal(productionSlots(5,'factory'),3,'the third at level 5');
});
test('diamonds cannot rush the Factory: a bulk batch is worth 10-20 normal ones for the price of one',()=>{
 const s=farm();s.buildings.factory.level=5;s.inventory.feed=100;s.inventory.corn=100;
 const big=act(s,{type:'produce',recipe:'mass_eggs'}),small=act(s,{type:'produce',recipe:'feed'});
 assert.throws(()=>act(s,{type:'finish_batch',building:'factory',jobId:big.jobId,expectedCost:SINGLE_BATCH_COST}),/too big to rush/);assert.equal(s.diamonds,1000);
 act(s,{type:'finish_batch',building:'mill',jobId:small.jobId,expectedCost:SINGLE_BATCH_COST});assert.equal(s.diamonds,990,'an ordinary batch still can be');
 assert.throws(()=>act(s,{type:'buy_boost',boost:'production',expectedCost:BOOSTS.production.cost}),/No batches are running/,'only the Factory batch is left, and that is not rushed');
act(s,{type:'collect',building:'mill',jobId:small.jobId},now);act(s,{type:'produce',recipe:'feed'});
 const all=act(s,{type:'buy_boost',boost:'production',expectedCost:BOOSTS.production.cost});assert.equal(all.affected,1,'the ordinary batch');
 assert.ok(productionJobs(s.buildings.factory)[0].readyAt>now,'the Factory batch was left alone');
 const only=farm();only.buildings.factory.level=1;only.inventory.feed=100;act(only,{type:'produce',recipe:'mass_eggs'});
 assert.throws(()=>act(only,{type:'buy_boost',boost:'production',expectedCost:BOOSTS.production.cost}),/No batches are running/);assert.equal(only.diamonds,1000);
 assert.match(BOOSTS.production.description,/not the Factory/);
});
test('an older saved farm gets a locked Factory, and nothing else about it changes',()=>{
 const old=createFarm(now);delete old.buildings.factory;old.coins=777;old.xp=xpForLevel(12);
 const loaded=normalizeFarm(JSON.parse(JSON.stringify(old)),now);
 assert.equal(loaded.buildings.factory.level,1);assert.equal(loaded.buildings.factory.job,null);assert.equal(loaded.buildings.factory.built,false);
 assert.equal(loaded.coins,777);assert.equal(loaded.xp,old.xp);assert.equal(buildingEligible(loaded,'factory'),false);
});
test('the roadmap and hints only speak of the ordinary recipes, the Factory has its own panel',()=>{
 const state=(s=>{s.xp=xpForLevel(60);return s;})(createFarm(now));
 const src=read('game/farm-state.js');
 assert.match(src,/filter\(\(\[,r\]\)=>r\.building!=='factory'&&buildingUnlocked\(state,r\.building\)\)/);
 assert.match(src,/recipe\.output\[item\]&&recipe\.building!=='factory'/);
 assert.equal(state.buildings.factory.level,1);
});
test('the yard, models and icon ship with the game',()=>{
 for(const file of ['hangar_007','hangar_022','tower_010'])assert.ok(existsSync(new URL(`../public/assets/models/${file}.glb`,import.meta.url)),file);
 const icon=readFileSync(new URL('../public/assets/icons/factory.png',import.meta.url));assert.equal(icon.subarray(1,4).toString(),'PNG');assert.ok(icon.length<80000);
 assert.match(read('public/visual-icons.js'),/'kitchen','factory'\]\)pictures\[id\]=id;/);
 const game=read('public/game.js');
 assert.match(game,/'hangar_007','hangar_022','tower_010'/);assert.match(game,/zone\('factory'\);addBuilding\('factory',16\.2,21\.9,\{width:6\.4,height:3\.6,depth:13,rotation:Math\.PI\/2\}\)/);
 assert.ok(!existsSync(new URL('../public/assets/models/hangar_014.glb',import.meta.url)),'the first, rejected model is not shipped');
 assert.deepEqual(ANCHORS.factory,[16.2,21.9]);
 const [x,z]=anchorAt('factory');assert.ok(x>15&&z>25,'south of the pond, east of the crops');
 assert.match(read('public/farm-life.js'),/'preserves','factory'\]/);assert.match(read('public/farm-props.js'),/factory:'work'/);
});
test('the building panel shows the coin price of bottled honey, orders the Factory recipes by their source and fits the Factory slots',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/function costList\(id,n=1\)/);assert.match(ui,/r\.coins\?`<span class="ingredient \$\{state\.coins<r\.coins\*n\?'missing':''\}">\$\{art\('coins'\)\}<span>\$\{number\(r\.coins\*n\)\} coins<\/span><\/span>`:''/);
 assert.match(ui,/<div class="ingredients">\$\{costList\(rid\)\}<\/div>/);assert.match(ui,/innerHTML=costList\(id,count\)/);
 assert.match(ui,/a\.poor\?`You need \$\{number\(a\.price\)\} coins for a batch\.`/);
 assert.match(ui,/productionSlots\(b\.level,key\)/);assert.match(ui,/productionSlots\(bs\.level,key\)/);assert.match(ui,/The Factory gets a slot every two levels, up to five\./);
 assert.match(ui,/sourceOf=r=>r\.base\?buildingOrder\.indexOf\(RECIPES\[r\.base\]\.building\):-1/);
 // The pre-purchase preview (built from itemList(r.input), not costList()) has no coins of its own — without
 // this, bottled honey's row showed as a bare arrow into a honey icon, no hint of the 5,000 coin cost.
 assert.match(ui,/const previewCard=\(rid,r\)=>`<div>\$\{itemList\(r\.input\)\}\$\{r\.coins\?`<span class="ingredient">\$\{art\('coins'\)\}<span>\$\{number\(r\.coins\)\} coins<\/span><\/span>`:''\}<b>→<\/b>\$\{itemList\(r\.output\)\}<\/div>`;/);
});
// The Factory repeats every other building's whole recipe list in bulk (31 recipes: see the bulk-version test
// above), which read as one very long scroll in BOTH of its recipe lists — the pre-purchase preview, before it is
// even built, and the working recipe list once it is. Grouped by source building and collapsed in both; every
// other building's short recipe-list (and preview) stays exactly as it was, unwrapped.
test('only the Factory groups its recipes by source and collapses them; every other building keeps a flat list',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/const foldFactoryGroups=\(entries,cardOf,\{ready=\(\)=>false\}=\{\}\)=>\{/,'one shared grouping helper for both of the Factory\'s recipe lists');
 assert.match(ui,/const sourceLabel=r=>r\.base\?BUILDINGS\[RECIPES\[r\.base\]\.building\]\.name:'Honey bottling';/);
 assert.match(ui,/<details class="factory-recipe-group \$\{g\.ready\?'has-ready':''\}" data-factory-group="\$\{source\}" \$\{openFactoryGroups\.has\(source\)\?'open':''\}><summary><span class="factory-source-art">\$\{art\(source\)\}<\/span>/,'each source shows its building, stays open across re-renders');
 assert.match(ui,/\$\{g\.ready\?`<em class="factory-ready">\$\{g\.ready\} ready<\/em>`:''\}/,'and how many of its recipes you can start now');
 // The working recipe list (once built): grouped only for the Factory, otherwise the same flat list as before.
 assert.match(ui,/const recipeCard=\(rid,r\)=>\{/,'the per-recipe card is a reusable function');
 assert.match(ui,/`<div class="recipe-list factory-recipe-list">\$\{foldFactoryGroups\(recipeEntries,recipeCard,\{ready:canStart\}\)\}<\/div>`/);
 assert.match(ui,/\}else content\+=`<div class="recipe-list">\$\{recipeEntries\.map\(\(\[rid,r\]\)=>recipeCard\(rid,r\)\)\.join\(''\)\}<\/div>`;/,'every other building keeps its flat list');
 assert.match(ui,/data-factory-filter="ready"[^`]*Ready now <span>\$\{readyEntries\.length\}<\/span>/,'a Ready now filter shows only what can start right away');
 // The pre-purchase preview (construction-recipes): grouped the same way, only for the Factory.
 assert.match(ui,/const previewRecipes=key==='factory'\?foldFactoryGroups\(previewEntries,previewCard\):previewEntries\.map\(\(\[rid,r\]\)=>previewCard\(rid,r\)\)\.join\(''\);/);
 assert.match(ui,/<div class="construction-recipes\$\{key==='factory'\?' factory-recipe-list':''\}">\$\{previewRecipes\}<\/div>/);
 const css=read('public/styles.css');
 assert.match(css,/\.factory-recipe-group\{/);assert.match(css,/\.factory-recipe-group>summary\{/);assert.match(css,/\.factory-recipe-group-cards\{/);
 assert.match(css,/\.factory-recipe-group-cards>div\{/,'the plain preview rows (no .recipe-card class) still get their flex layout once nested a level deeper');
});
test('the Factory\'s recipe groups are keyed by the building each good normally comes from, one group per source',()=>{
 const groups=new Map();
 for(const [,r] of mass){
  const label=r.base?RECIPES[r.base].building:null;
  groups.set(label,(groups.get(label)??0)+1);
 }
 assert.equal(groups.get(null),1,'bottled honey is the one recipe with no ordinary-building source');
 assert.ok(groups.size>=6,'goods come from several different buildings, so this is worth grouping at all');
 for(const [source,count] of groups)if(source)assert.ok(count>=1,source);
});
test('a server that does not know the Factory yet cannot break the game, and the server copy of the rules is the same',()=>{
 assert.match(read('public/farm-client.js'),/for\(const key of Object\.keys\(BUILDINGS\)\)state\.buildings\[key\]\?\?=\{level:1,job:null\};/);
 assert.match(read('public/game.js'),/state\.buildings\?\?=\{\};for\(const key of Object\.keys\(BUILDINGS\)\)state\.buildings\[key\]\?\?=\{level:1,job:null\};/);
 for(const path of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(path),read('game/farm-state.js'),path);
 assert.match(read('supabase/functions/notify-hourly/names.js'),/"factory":"Factory"/);
});

test('the quest lines that count batches are left alone: a bulk batch counts as one batch, however big',()=>{
 const s=farm();s.buildings.factory.level=3;s.inventory.feed=200;assert.equal(productionSlots(3,'factory'),2);
 const first=act(s,{type:'produce',recipe:'mass_eggs'}),second=act(s,{type:'produce',recipe:'mass_eggs'});
 assert.equal(s.stats.parallel_batches,1,'the second one started while the first was running: one, not twenty');
 act(s,{type:'collect',building:'factory',jobId:first.jobId},first.readyAt);act(s,{type:'collect',building:'factory',jobId:second.jobId},second.readyAt);
 assert.equal(s.stats.produced,2,'two batches collected, 120 eggs');assert.equal(s.stats.made_eggs,120);
 const counting=Object.values(QUESTS).filter(q=>q.stat==='produced'||q.stat==='parallel_batches');
 assert.ok(counting.length>=7&&counting.some(q=>q.target>=1000),'the long batch-counting quests (1,000 and more) are still there, and only many batches finish them');
});
test('a bulk quest goal still needs the same ingredients: the Factory makes goods faster to count, never cheaper',()=>{
 const s=farm();s.buildings.factory.level=1;
 for(const [id,r] of base){const m=RECIPES[`mass_${id}`],n=m.batches;
  for(const [k,c] of Object.entries(r.input))assert.equal(m.input[k]/n,c,`${id}: ${k} per unit is the same`);
  for(const [k,c] of Object.entries(r.output))assert.equal(m.output[k]/n,c,`${id}: ${k} per unit is the same`);
 }
 assert.equal(recipeValue('mass_bread').added,recipeValue('bread').added*20,'the same margin per ingredient');
});
test('at the top a specialised building always beats the Factory for the same goods, so nobody stops upgrading',()=>{
 for(const [id,r] of base){
  const m=RECIPES[`mass_${id}`],per=Object.values(r.output)[0];
  const regular=productionSlots(20,r.building)*per/(r.duration*(1-productionSpeed(20)));
  const factory=productionSlots(20,'factory')*m.output[Object.keys(r.output)[0]]/(m.duration*(1-productionSpeed(20,'factory')));
  assert.ok(regular>factory*1.15,`${id}: a level-20 ${r.building} makes ${regular.toFixed(5)} a ms, a level-20 Factory ${factory.toFixed(5)}`);
 }
});

test('what is still to come is shown from the first minute, greyed out with a lock, and stays calm',()=>{
 const game=read('public/game.js'),css=read('public/ui-polish.css');
 assert.match(game,/const greyedMaterials=new Map\(\);/);assert.match(game,/function setLocked\(object,locked\)/);
 assert.match(game,/dot\(diffuseColor\.rgb,vec3\(\.299,\.587,\.114\)\)/,'a real desaturation of the texture, not a darker tint');
 // buildings: always drawn and clickable, greyed until eligible, a lock on the label
 assert.doesNotMatch(game,/v\.object\.visible=buildingEligible\(state,key\)/,'a building is no longer hidden while locked');
 assert.doesNotMatch(game,/v\.hit\.visible=v\.object\.visible/,'and it can be tapped to see what it needs');
 assert.match(game,/const locked=!buildingEligible\(state,key\),status=economy\.status\(key\);setLocked\(v\.object,locked\);/);
 assert.match(game,/v\.pin\.innerHTML=art\(locked\?'lock':v\.pinArt\)/);
 assert.match(game,/v\.label\.hidden=Math\.abs\(p\.x\)>\.92\|\|Math\.abs\(p\.y\)>\.82;/,'a label only hides when it is off screen');
 assert.match(game,/const hint=locked\?`\$\{BUILDINGS\[key\]\.name\} · \$\{status\.text\}`:'';/,'the name and the hint wait in the tooltip');
 // helpers (tractor, cart, stall, silo, chores)
 assert.match(game,/const locked=!featureUnlocked\(state,key\);setLocked\(v\.object,locked\);/);assert.match(game,/v\.label\.innerHTML=art\(locked\?'lock':key\)/);
 // the pieces that belong to a building follow it
 assert.match(game,/for\(const decor of familyDecor\)setLocked\(decor,!buildingEligible\(state,'familyhall'\)\);/);
 assert.match(game,/for\(const decor of factoryDecor\)setLocked\(decor,!buildingEligible\(state,'factory'\)\);/);
 assert.match(game,/if\(windmillRotor\)setLocked\(windmillRotor,!buildingEligible\(state,'windmill'\)\);/);
 // calm: a small grey lock, no name
 assert.match(css,/\.building-label\.locked,\.utility-label\.locked\{filter:grayscale\(1\);opacity:\.7\}/);
 assert.match(css,/\.building-label\.locked\{padding:3px;width:32px;/);assert.match(css,/\.building-label\.locked>span:nth-child\(2\)\{display:none\}/);
 assert.match(css,/\.utility-label\.locked\{width:30px;height:30px;/);
});
test('a building that is not built yet shows one status line, what it makes, and Build only when it can be built',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/\$\{key==='farmhouse'\|\|buildingUnlocked\(state,key\)\?`LEVEL \$\{bs\.level\}`:'NOT BUILT YET'\}/,'no "Level 1" for a building that is not there');
 assert.match(ui,/<strong>\$\{level<openLevel\?`Opens at level \$\{openLevel\}`:buildingUnlockHint\(state,key\)\}<\/strong>/);
 assert.match(ui,/<details class="build-recipes"><summary>See/,'the full recipes are folded away');
 assert.match(ui,/\$\{eligible\?`<button type="button" id="construct-building" class="primary-button"/,'no greyed-out button while it is still locked');
 assert.match(ui,/<p class="build-price">\$\{art\('coins'\)\}<span>\$\{number\(buildCost\)\} coins to build<\/span><\/p>/);
 assert.match(ui,/`Build for \$\{number\(buildingCost\(state,key\)\)\} coins`/);
});
