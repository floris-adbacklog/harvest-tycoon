import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,normalizeFarm,applyFarmAction,upgradeRequirements,upgradeCost,doubleBatchChance,BUILDINGS,RECIPES,ITEMS,
 MAX_BUILDING_LEVEL,TOP_BUILDING_LEVEL,WORLD_TWO_TOP_BUILDING,MASTER_UPGRADES,HARBOUR_UPGRADES,HARBOUR_NEVER_ASKED,worldTwoBuilding} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// Building levels 16-20 (30 Oct 2026, the owner: "Doe met wereld III tot lvl 20", then "doe hetzelfde als 11-15"): shipwright tools from
// the Harbour forge, one level at farm level 240, 255, 270, 285 and 300, each 10% more chance of a double batch (every batch at 20).
const now=Date.parse('2026-10-30T12:00:00Z');
function farm(level,{greatHall=true,beyond=5}={}){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=500000000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings)){b.built=k!=='donkeystable';if(BUILDINGS[k].type==='production'&&!worldTwoBuilding(k)&&BUILDINGS[k].world!==3)b.level=MAX_BUILDING_LEVEL;}
 s.buildings.bakery.level=MAX_BUILDING_LEVEL+beyond;s.buildings.bakery.beyond=beyond;
 if(greatHall){s.village??={};s.village.landmarks={...(s.village.landmarks??{}),done:['windpump','longhouse','stonequay','lookout','greathall']};}
 normalizeFarm(s,now);return s;
}
const act=(s,a)=>applyFarmAction(s,a,now);

test('levels 16-20: five steps after the village\'s five, with shipwright tools, from farm level 240 to 300',()=>{
 assert.equal(TOP_BUILDING_LEVEL,20);assert.equal(WORLD_TWO_TOP_BUILDING,MAX_BUILDING_LEVEL+MASTER_UPGRADES.length);
 assert.deepEqual(HARBOUR_UPGRADES.map(u=>u.level),[240,255,270,285,300]);
 assert.deepEqual(HARBOUR_UPGRADES.map(u=>u.materials.shipwrighttools),[1,2,3,4,5]);
 assert.ok(HARBOUR_UPGRADES.every((u,i)=>u.coins>(HARBOUR_UPGRADES[i-1]??MASTER_UPGRADES.at(-1)).coins),'each step costs more than the one before');
 assert.deepEqual([15,16,18,20].map(doubleBatchChance),[.5,.6,.8,1],'every batch double at level 20');
});

test('the step from 15 shows only once World III is open, asks for level 240, and takes the tools',()=>{
 assert.equal(upgradeRequirements(farm(230,{greatHall:false}),'bakery'),null,'no World III: level 15 is the top, as before');
 assert.equal(upgradeCost(farm(230,{greatHall:false}),'bakery'),null);
 const early=farm(230);
 assert.deepEqual(upgradeRequirements(early,'bakery'),{level:240,materials:{shipwrighttools:1,plank:120,stone:180}});
 assert.throws(()=>act(early,{type:'upgrade',building:'bakery'}),/Reach level 240/);
 const s=farm(240);Object.assign(s.inventory,{shipwrighttools:1,plank:120,stone:180});
 assert.equal(upgradeCost(s,'bakery'),2900000);
 act(s,{type:'upgrade',building:'bakery'});
 assert.equal(s.buildings.bakery.level,16);assert.equal(s.buildings.bakery.beyond,6);
 assert.deepEqual([s.inventory.shipwrighttools,s.inventory.plank,s.inventory.stone],[0,0,0]);
 assert.throws(()=>act(s,{type:'upgrade',building:'bakery'}),/Reach level 255/);
 const top=farm(300,{beyond:10});assert.equal(top.buildings.bakery.level,20,'an old save keeps its 20');assert.equal(upgradeCost(top,'bakery'),null,'20 is the top');
 assert.equal(upgradeCost(s,'factory'),null,'the Factory stops at 10');
});

test('shipwright tools: forged in the Harbour forge from level 240, never asked by a ship, explained in the harbour wiki only',()=>{
 const r=RECIPES.shipwrighttools;
 assert.equal(r.building,'harbourforge');assert.equal(r.minLevel,240);assert.deepEqual(r.output,{shipwrighttools:1});
 assert.equal(r.xp,Math.round(r.duration/60000*2),'World III XP: minutes × 2');
 assert.equal(ITEMS.shipwrighttools.world,3);assert.deepEqual(HARBOUR_NEVER_ASKED,['shipwrighttools']);
 const rules=read('game/farm-state.js');
 assert.match(rules,/Object\.keys\(HARBOUR_GOODS\)\.filter\(k=>!HARBOUR_NEVER_ASKED\.includes\(k\)&&itemAvailable\(state,k\)\)/);
 assert.match(rules,/world===3\?Object\.keys\(HARBOUR_GOODS\)\.filter\(k=>!HARBOUR_NEVER_ASKED\.includes\(k\)\)/);
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/section\('Past level 15'/);assert.match(wiki,/up to \$\{WORLD_TWO_TOP_BUILDING\}\. Every level past/,'the village still says 15');
});
