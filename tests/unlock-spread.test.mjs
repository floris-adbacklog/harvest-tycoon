import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,levelOf,featureUnlocked,deliveryTierUnlocked,buildingEligible,FEATURE_LEVELS,DELIVERY_LEVELS,BUILDING_LEVELS,RECIPE_LEVELS,CROP_LEVELS,RECIPES,ACTIVE_STATIONS} from '../game/farm-state.js';
import {wikiArticle} from '../public/wiki-content.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,25,12);
// A guided farm as it was before the spread (progression version 4), at a given level, then opened with today's rules.
function before(level){const s=createFarm(now);s.progression.version=4;s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);return s;}
function fresh(level){const s=createFarm(now);s.xp=xpForLevel(level);s.xpOffset=0;normalizeFarm(s,now);return s;}

test('the unlocks between levels 10 and 38 are spread out: one or more new things on every level from 11 to 48',()=>{
 assert.deepEqual([FEATURE_LEVELS.stall,FEATURE_LEVELS.tractor,FEATURE_LEVELS.silo,FEATURE_LEVELS.projects,DELIVERY_LEVELS.commission,BUILDING_LEVELS.packing],[19,18,26,27,16,11]);
 assert.deepEqual(['windflour','berrycheesecake','harvesthamper','vegetablefeast','berrytart'].map(id=>RECIPE_LEVELS[id]),[14,33,35,36,38]);
 assert.deepEqual([FEATURE_LEVELS.chores,FEATURE_LEVELS.family,FEATURE_LEVELS.boosts],[10,10,14],'chores and Farm Family stay at 10, diamond boosts and the Starter Pack at 14');
 const levels=new Set([...Object.values(CROP_LEVELS),...Object.values(BUILDING_LEVELS),...Object.values(FEATURE_LEVELS),...Object.values(DELIVERY_LEVELS),
  ...Object.entries(RECIPE_LEVELS).filter(([id,l])=>RECIPES[id]&&RECIPES[id].building!=='factory'&&l>(BUILDING_LEVELS[RECIPES[id].building]??1)).map(([,l])=>l)]);
 for(let level=11;level<=48;level++)assert.ok(levels.has(level),`level ${level} brings something new`);
});
test('a farm from before the spread keeps everything it already had; what it had not reached yet follows the new levels',()=>{
 const twelve=before(12);
 assert.equal(twelve.progression.version,5);
 for(const key of ['stall','tractor'])assert.ok(featureUnlocked(twelve,key),`level 12 keeps ${key}`);
 for(const key of ['silo','projects'])assert.ok(!featureUnlocked(twelve,key),`${key} was not reached yet`);
 assert.ok(deliveryTierUnlocked(twelve,'commission'),'commission orders stay');assert.ok(buildingEligible(twelve,'packing'));
 assert.deepEqual(twelve.progression.kept.recipes?.filter(id=>['windflour','berrytart'].includes(id)),['windflour']);
 const thirty=before(30);
 for(const key of ['stall','tractor','silo','projects'])assert.ok(featureUnlocked(thirty,key),key);
 assert.ok(['windflour','berrycheesecake','harvesthamper','berrytart'].every(id=>thirty.progression.kept.recipes.includes(id)));assert.ok(!thirty.progression.kept.recipes.includes('vegetablefeast'),'the pig feast was level 31');
 const again=structuredClone(thirty);normalizeFarm(again,now);assert.deepEqual(again,thirty,'migrating twice changes nothing');
 const nine=before(9);assert.deepEqual(nine.progression.kept??{},{},'a farm below every old level keeps nothing extra');
 const later=before(9);later.xp=xpForLevel(12);normalizeFarm(later,now);assert.ok(!featureUnlocked(later,'tractor'),'and then follows the new levels');
});
test('a new farm follows the new levels',()=>{
 const s=fresh(17);assert.equal(s.progression.version,5);assert.equal(levelOf(s),17);
 assert.ok(!featureUnlocked(s,'tractor')&&!featureUnlocked(s,'stall')&&!featureUnlocked(s,'silo'));assert.ok(featureUnlocked(fresh(18),'tractor'));assert.ok(featureUnlocked(fresh(19),'stall'));
 assert.ok(!deliveryTierUnlocked(fresh(15),'commission'));assert.ok(deliveryTierUnlocked(fresh(16),'commission'));
 assert.ok(!buildingEligible(fresh(10),'packing'));assert.ok(buildingEligible(fresh(11),'packing'));
});
test('A helping hand rests 15 minutes after each job, and the wiki says so',()=>{
 for(const [key,stop] of Object.entries(ACTIVE_STATIONS))assert.equal(stop.cooldown,15*60000,key);
 assert.match(JSON.stringify(wikiArticle('helpers')),/After its job a stop rests 15 min\./);
 assert.match(read('public/wiki-content.js'),/After its job a stop rests \$\{wikiTime\(Math\.min\(\.\.\.Object\.values\(ACTIVE_STATIONS\)\.map\(a=>a\.cooldown\)\)\)\}/);
});
