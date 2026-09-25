import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm} from './legacy-farm.mjs';
import {applyFarmAction,xpForLevel,levelOf,cropUnlocked,CROP_LEVELS,RECIPES,BUILDING_LEVELS,FEATURE_LEVELS} from '../game/farm-state.js';
import {EVENT_STATS} from '../supabase/functions/farm-api/event-service.js';
import {EVENT_GOALS,EVENTS_LEVEL} from '../public/live-events-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const sql=read('supabase/live-events-mixed.sql');
const pool=JSON.parse(sql.match(/pool constant jsonb:='(\[[\s\S]*?\n \])';/)[1].replace(/''/g,"'"));
const kinds=pool.flat();
const now=Date.UTC(2026,8,26,12);

test('30 kinds of goal in 5 groups, each easy, medium and hard, each with two titles',()=>{
 assert.deepEqual(pool.map(g=>g.length),[5,7,9,5,4]);assert.equal(kinds.length,30);
 assert.equal(new Set(kinds.map(k=>k.stat)).size,30,'no kind twice');
 for(const k of kinds){
  assert.equal(k.targets.length,3,k.stat);assert.ok(k.targets[0]>0&&k.targets[0]<=k.targets[1]&&k.targets[1]<=k.targets[2],`${k.stat}: easy ≤ medium ≤ hard`);
  assert.ok(k.titles.length>=2&&k.titles.every(([title,text])=>title.length<=30&&text.length<=90),`${k.stat}: titles`);
  assert.ok(EVENT_STATS.includes(k.stat),`${k.stat} is allowed by farm-api`);assert.ok(EVENT_GOALS[k.stat]?.label,`${k.stat} has a label on the event screen`);
  assert.match(read('supabase/live-events-more.sql')+sql,new RegExp(`'${k.stat}'`),`${k.stat} is allowed by harvest_event_validate (the 24 Sep list plus the new goals)`);
 }
 assert.equal(new Set(kinds.flatMap(k=>k.titles.map(t=>t[0]))).size,60,'60 different titles');
});

test('every goal can be done at level 15: crops open by then, buildings open by then, diamonds spendable by then',()=>{
 assert.equal(EVENTS_LEVEL,15);
 const s=createLegacyFarm(now);s.xp=xpForLevel(15);assert.equal(levelOf(s),15);
 for(const {stat} of kinds){
  if(stat.startsWith('harvest_'))assert.ok(cropUnlocked(s,stat.slice(8))&&CROP_LEVELS[stat.slice(8)]<15,stat);
  if(stat.startsWith('made_')){const item=stat.slice(5),makers=Object.values(RECIPES).filter(r=>r.output[item]&&r.building!=='factory');assert.ok(makers.some(r=>(BUILDING_LEVELS[r.building]??1)<=15),`${item} is made in a building open by level 15`);}
 }
 assert.ok(FEATURE_LEVELS.boosts<=15,'diamonds and boosts');assert.ok(FEATURE_LEVELS.activities<=15&&FEATURE_LEVELS.chores<=15);
 assert.ok(!kinds.some(k=>['dailies','deliveries'].includes(k.stat)),'no goal that can be used up earlier the same day');
});

test('the mix: main goal group takes turns, the other two from other groups, hard+medium+easy or three medium',()=>{
 assert.match(sql,/head:=\(n%5\)::int;\n rest:=array_remove\(array\[0,1,2,3,4\],head\);/,'the main goal\'s group takes turns, so two events in a row differ');
 assert.match(sql,/g1:=rest\[1\+\(r\[1\]%4\)::int\];rest:=array_remove\(rest,g1\);\n g2:=rest\[1\+\(r\[2\]%3\)::int\];/,'three different groups');
 assert.match(sql,/sizes:=case when r\[3\]%2=0 then array\[2,1,0\] else array\[1,1,1\] end;/,'never three hard goals');
 assert.match(sql,/abs\(hashtextextended\('harvest-event-mix:'\|\|n\|\|':'\|\|i,0\)\)/,'the same event for everyone in a slot');
 assert.match(sql,/t:=public\.harvest_event_pick\(n\);/);
});

test('progress: level 15, swiping over fields counts, and every new goal counts for the actions that move it',()=>{
 assert.match(sql,/\$s\$level>=10\) then return new;\$s\$,\$s\$level>=15\) then return new;\$s\$/);
 assert.match(sql,/\(stat in \('harvested','watered','tended','planted'\) and action in \('field','fields','tractor','collect_all'\)\)/);
 assert.match(sql,/\(stat like 'harvest\\_%' and action in \('field','fields','tractor'\)\)/);
 assert.match(sql,/or stat in \('sold','earned','coins_spent','diamonds_spent'\) or \(stat in \('activities','activity_rounds'\) and action='activity_work'\) or \(stat='upgrades' and action='upgrade'\)/);
 assert.match(sql,/\(stat='fertilized' and action='fertilize'\) or \(stat='parallel_batches' and action='produce'\) or \(stat='boosts_used' and action='buy_boost'\)/);
});

test('the farm counts the coins it spends (for "Spend coins"), and not the coins it earns',()=>{
 const s=createLegacyFarm(now);s.xp=xpForLevel(15);s.coins=5000;s.stats.coins_spent=0;
 const plot=s.plots.findIndex(p=>!p.crop);applyFarmAction(s,{type:'field',id:plot,action:'plant',crop:'wheat'},now);
 assert.ok(s.stats.coins_spent>0,'seed money');const afterSeed=s.stats.coins_spent;
 s.inventory.corn=10;applyFarmAction(s,{type:'sell',item:'corn',quantity:10},now);assert.equal(s.stats.coins_spent,afterSeed,'selling is earning, not spending');
 const before=s.coins;applyFarmAction(s,{type:'upgrade',building:'coop'},now);assert.equal(s.stats.coins_spent,afterSeed+(before-s.coins));
});

test('the wiki and the event screen explain the mix and the level',()=>{
 assert.match(read('public/wiki-content.js'),/Every event mixes 3 goals from 30 kinds, each in an easy, medium or hard size/);
 assert.match(read('public/live-events-ui.js'),/<li>Open from level \$\{EVENTS_LEVEL\}\.<\/li>/);
});
