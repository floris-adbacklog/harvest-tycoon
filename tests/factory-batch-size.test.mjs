import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction,xpForLevel,RECIPES,recipeFor,factoryBatchCount,jobName,recipeAvailability,recipeValue,productionSlots,productionSpeed,FACTORY_BATCHES_PER_LEVEL} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,26,12);
const act=(s,action,t=now)=>applyFarmAction(s,action,t);
function farm(level=60){const s=createLegacyFarm(now);s.xp=xpForLevel(level);s.coins=1e9;for(const b of Object.values(s.buildings))b.built=true;for(const k of Object.keys(s.inventory))s.inventory[k]=0;return s;}

test('a Factory batch is twice the level of the building that makes the good, up to x20; slow goods its level, up to x10',()=>{
 assert.deepEqual(FACTORY_BATCHES_PER_LEVEL,{quick:2,slow:1});
 const s=farm();
 for(const [level,quick,slow] of [[1,2,1],[3,6,3],[5,10,5],[7,14,7],[9,18,9],[10,20,10],[15,20,10],[20,20,10]]){
  s.buildings.dairy.level=level;
  assert.equal(factoryBatchCount(s,'mass_cheese'),quick,`cheese (an hour) with a level-${level} Dairy`);
  assert.equal(factoryBatchCount(s,'mass_goatcheese'),slow,`goat cheese (three hours) with a level-${level} Dairy`);
 }
 s.buildings.dairy.level=5;
 const cheese=recipeFor(s,'mass_cheese');
 assert.equal(cheese.name,'Make farmhouse cheese ×10');assert.deepEqual(cheese.input,{milk:20});assert.deepEqual(cheese.output,{cheese:10});
 assert.equal(cheese.xp,RECIPES.cheese.xp*10);assert.equal(cheese.duration,RECIPES.mass_cheese.duration,'the time stays twice one batch');
 assert.ok(Object.isFrozen(cheese));assert.equal(recipeFor(s,'cheese'),RECIPES.cheese,'every other recipe is untouched');
 s.buildings.dairy.level=10;assert.equal(recipeFor(s,'mass_cheese'),RECIPES.mass_cheese,'full size from level 10');
 assert.equal(recipeValue('mass_cheese',undefined,farm()).added,recipeValue('cheese').added*2,'a level-1 source: two batches worth');
});

test('the farm\'s own size is what starting, the ingredients check and the collected goods use; a running batch keeps its size',()=>{
 const s=farm();s.buildings.coop.level=4;s.buildings.factory.level=3;s.inventory.feed=8;
 const a=recipeAvailability(s,'mass_eggs');assert.equal(a.missing.length,0,'eight feed are enough with a level-4 Coop');assert.equal(a.maxCount,1);
 const started=act(s,{type:'produce',recipe:'mass_eggs'});assert.equal(s.inventory.feed,0);
 s.buildings.coop.level=10;
 const got=act(s,{type:'collect',building:'factory'},started.readyAt);assert.deepEqual(got.items,{eggs:24},'eight batches of eggs, as it was started');
 const job={recipe:'mass_eggs',output:{eggs:24}};assert.equal(jobName(job),'Collect eggs ×8'.replace('Collect eggs',RECIPES.eggs.name));
 assert.equal(jobName({recipe:'mass_eggs',output:{eggs:60}}),`${RECIPES.eggs.name} ×20`);
 assert.equal(jobName({recipe:'mass_honey',output:{honey:50}}),'Finished batch','a retired recipe');
 assert.equal(jobName({recipe:'eggs',output:{eggs:3}}),RECIPES.eggs.name);
});

test('at the farm levels players really have, a full Factory is worth one to four of their own buildings, not four to fifteen',()=>{
 const building=L=>productionSlots(L)/(1-productionSpeed(L));
 const factory=(F,n)=>productionSlots(F,'factory')*n/(2*(1-productionSpeed(F,'factory')));
 const s=farm();
 for(const [F,L] of [[5,3],[5,5],[5,7],[9,5],[9,7]]){
  s.buildings.dairy.level=L;const worth=factory(F,factoryBatchCount(s,'mass_cheese'))/building(L);
  assert.ok(worth>=1&&worth<=4,`Factory ${F} with a level-${L} Dairy is worth ${worth.toFixed(2)} Dairies`);
  assert.ok(Math.abs(worth-factory(F,20)/building(L)*Math.min(1,2*L/20))<1e-9,'what it was, times twice the level out of 20');
 }
 s.buildings.dairy.level=20;assert.equal(factory(20,factoryBatchCount(s,'mass_cheese')),factory(20,20),'at the top nothing changes');
});

test('the Factory panel, the batch picker and the wiki say how big a batch is',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/A batch is twice the level of the building that normally makes it, up to ×20 \(a level-5 Dairy: cheese ×10\)\. Goods that take over an hour: its level, up to ×10\./);
 assert.match(ui,/const recipeEntries=Object\.entries\(RECIPES\)\.filter\(\(\[,r\]\)=>r\.building===key\)\.map\(\(\[id\]\)=>\[id,recipeFor\(state,id\)\]\);/);
 assert.match(ui,/function costList\(id,n=1\)\{const r=recipeFor\(state,id\);/);assert.match(ui,/<strong>\$\{jobName\(job\)\}<\/strong>/);
 assert.match(read('public/field-picker.js'),/jobName\(b\.job\)/);
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/A bulk batch is twice the level of the building that normally makes it, up to ×20: a level-5 Dairy makes cheese ×10\./);
 assert.match(wiki,/The biggest batches are shown\./);assert.doesNotMatch(wiki,/finest goods from what your other buildings make/);
});
