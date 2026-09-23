import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createFarm,applyFarmAction as act,xpForLevel,levelOf,CROPS,BUILDINGS,RECIPES,ITEMS,QUESTS,ORDER_POOL,cropUnlocked,itemAvailable,buildingEligible,productionJobs,dailyOrders,DAY_MS} from '../game/farm-state.js';
import {ANCHORS,YARD_EXTENT,anchorAt,clearOfYards,outsideYardExtents,roadRects} from '../public/farm-layout.js';
import {YARD_THEME} from '../public/farm-props.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,23,12);
const MASS_RECIPES=Object.fromEntries(Object.entries(RECIPES).filter(([,r])=>r.building==='factory'));
const CROPS_NEW=['squash','polebeans','ciderapples'],GOODS_NEW=['squashsoup','beeswax','wool','yarn','cloth','cider'],YARDS=['beeyard','sheepbarn','glasshouse','weaving'];
function farmAt(level,coins=500000){const s=createFarm(now);s.xp=xpForLevel(level);s.coins=coins;return s;}
// The same farm with every building it may have already built (some need another one open first).
function builtAt(level){const s=farmAt(level,5e7);for(let pass=0;pass<3;pass++)for(const key of Object.keys(BUILDINGS))if(buildingEligible(s,key)&&!s.buildings[key].built){try{act(s,{type:'construct',building:key},now);}catch{}}return s;}
// Finishes every running job in a building and collects it.
function finish(s,building){for(const job of productionJobs(s.buildings[building]))job.readyAt=now;return act(s,{type:'collect',building},now);}

test('the new crops, yards and recipes open one by one between levels 28 and 47',()=>{
 const opens=(check,key)=>{for(let level=1;level<=60;level++)if(check(farmAt(level),key))return level;return null;};
 assert.deepEqual(CROPS_NEW.map(k=>opens(cropUnlocked,k)),[28,31,46]);
 assert.deepEqual(YARDS.map(k=>opens(buildingEligible,k)),[34,37,40,43]);
 for(const k of [...CROPS_NEW,...GOODS_NEW])assert.ok(ITEMS[k],`${k} is an item`);
 assert.equal(levelOf(farmAt(27)),27);assert.equal(cropUnlocked(farmAt(27),'squash'),false,'nothing new before level 28');
});

test('the full chains work: hives, wool to yarn to cloth, the Glasshouse and cider',()=>{
 const s=farmAt(50);
 for(const key of ['kitchen','juicepress',...YARDS])if(!s.buildings[key].built)assert.ok(!act(s,{type:'construct',building:key},now).error,key);
 Object.assign(s.inventory,{sunflower:4,feed:10,fertilizer:6,ciderapples:8,honey:4});
 assert.ok(!act(s,{type:'produce',recipe:'hives'},now).error);finish(s,'beeyard');
 assert.equal(s.inventory.beeswax,3);assert.equal(s.stats.made_beeswax,3);
 assert.ok(!act(s,{type:'produce',recipe:'wool'},now).error);finish(s,'sheepbarn');assert.equal(s.inventory.wool,2);
 s.inventory.wool=12;
 for(let i=0;i<4;i++){assert.ok(!act(s,{type:'produce',recipe:'yarn'},now).error);finish(s,'weaving');}
 assert.equal(s.inventory.yarn,8);
 assert.ok(!act(s,{type:'produce',recipe:'cloth'},now).error);finish(s,'weaving');assert.equal(s.inventory.cloth,1);
 const coins=s.coins,cauliflower=s.inventory.cauliflower;
 assert.ok(!act(s,{type:'produce',recipe:'glasscauliflower'},now).error);
 assert.equal(s.coins,coins-RECIPES.glasscauliflower.coins,'the Glasshouse takes coins and fertilizer');
 finish(s,'glasshouse');assert.equal(s.inventory.cauliflower,cauliflower+8);assert.equal(s.stats.glasshouse_batches,1);
 assert.ok(!act(s,{type:'produce',recipe:'cider'},now).error);finish(s,'juicepress');assert.equal(s.inventory.cider,1);
});

test('the Factory never mass-produces Glasshouse crops, and cider apples grow on a tree that keeps giving',()=>{
 assert.ok(Object.values(MASS_RECIPES).every(r=>!Object.keys(r.output).some(k=>CROPS[k])),'no crop comes out of the Factory');
 assert.ok(!Object.keys(MASS_RECIPES).some(id=>id.includes('glass')));
 for(const k of ['polebeans','ciderapples'])assert.ok(CROPS[k].perennial&&CROPS[k].regrow>0,k);
 assert.equal(CROPS.squash.perennial,undefined);
});

test('quests, orders and late upgrades ask for the new goods only once they can be made',()=>{
 const titles=QUESTS.map(q=>q.title);assert.ok(titles.indexOf('A buzzing corner')>titles.indexOf('A small fortune'),'new quests are added at the end');
 for(const o of ORDER_POOL.filter(o=>Object.keys(o.input).some(k=>GOODS_NEW.includes(k)||CROPS_NEW.includes(k)))){
  const s=builtAt(o.minLevel);for(const k of Object.keys(o.input))assert.ok(itemAvailable(s,k),`${o.title}: ${k} at level ${o.minLevel}`);
  const before=builtAt(o.minLevel-3);assert.ok(!Object.keys(o.input).every(k=>itemAvailable(before,k)),`${o.title} is not offered long before it can be made`);
 }
 const s=builtAt(48);const seen=new Set();for(let d=0;d<40;d++)dailyOrders(s,now+d*DAY_MS).forEach(o=>seen.add(o.title));
 assert.ok(['Soup kitchen','The candle maker','The village knitters','Harvest cider'].some(t=>seen.has(t)),'midgame orders come round at level 48');
 const young=builtAt(20),early=new Set();for(let d=0;d<40;d++)dailyOrders(young,now+d*DAY_MS).forEach(o=>early.add(o.title));
 assert.ok(!['Soup kitchen','Harvest cider','Fabric for the fair'].some(t=>early.has(t)),'and never before');
});

test('the four yards stand on the new ground east of the coop, clear of the roads, the crops and each other',()=>{
 for(const id of YARDS){
  assert.ok(ANCHORS[id]&&YARD_EXTENT[id]&&YARD_THEME[id],id);
  const [x,z]=anchorAt(id);assert.ok(x>25,`${id} is east of the old farm`);
  const [west,east,north,south]=YARD_EXTENT[id];
  assert.ok(!roadRects().some(r=>x+east>r.minX&&x+west<r.maxX&&z+south>r.minZ&&z+north<r.maxZ),`${id} is off the roads`);
  for(const other of YARDS.filter(o=>o!==id)){const [ox,oz]=anchorAt(other);assert.ok(Math.hypot(x-ox,z-oz)>=7,`${id} and ${other}`);}
 }
 const trunk=roadRects()[0];assert.ok(trunk.maxX>=Math.max(...YARDS.map(id=>anchorAt(id)[0])),'the trunk road runs on to them');
 // A tree that falls in a yard is moved out of it, and the spot it gets is not on a road.
 for(const id of YARDS){const [x,z]=anchorAt(id),[px,pz]=clearOfYards(x+1,z+1);assert.ok(outsideYardExtents(px,pz),id);}
});

test('every new model and picture is in place and loaded before the scene is built',()=>{
 const game=read('public/game.js');
 const loaded=new Set([...game.split('\n').filter(line=>/^const modelNames=|^modelNames\.push\(/.test(line)).join('\n').matchAll(/'([a-z_]+_\d+)'/g)].map(m=>m[1]));
 for(const model of [...CROPS_NEW.map(k=>CROPS[k].model),...YARDS.map(k=>BUILDINGS[k].model),'apiary_003','sheep_002','sheep_003']){
  assert.ok(existsSync(new URL(`../public/assets/models/${model}.glb`,import.meta.url)),`${model}.glb`);assert.ok(loaded.has(model),`${model} is loaded`);
 }
 for(const id of [...CROPS_NEW,...GOODS_NEW])assert.ok(existsSync(new URL(`../public/assets/icons/${id}.webp`,import.meta.url)),`${id}.webp`);
 for(const id of YARDS){assert.ok(existsSync(new URL(`../public/assets/icons/${id}.png`,import.meta.url)),`${id}.png`);assert.match(game,new RegExp(`addBuilding\\('${id}',`));}
 assert.match(game,/for\(const \[key,list\] of Object\.entries\(yardDecor\)\)\{const locked=BUILDINGS\[key\]\?!buildingEligible\(state,key\):!featureUnlocked\(state,key\);for\(const decor of list\)setLocked\(decor,locked\);\}/,'fences, flowers and the flock are greyed out with their yard');
 assert.match(read('public/quests-ui.js'),/glasshouse_batches:'glasshouse'/);
});
