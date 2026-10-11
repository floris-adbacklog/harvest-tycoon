import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,batchDuration,recipeDuration,quickFirstBatch,FIRST_BATCH_MS,productionJobs,xpForLevel,beginnerProgress,formatDuration,BUILDINGS,RECIPES} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,11,12);
const at=(level,make=createFarm)=>{const s=make(now);s.xp=xpForLevel(level);s.xpOffset=0;s.coins=1e6;normalizeFarm(s,now);return s;};

// 11 Oct 2026 (the owner's call, part B of the first-ten-minutes plan): the first batch in every new building is ready in 30 seconds,
// on guided farms, once per building. The guide's eggs took three minutes and a third of the players who reached the gift step left then.
test('the first eggs on a new farm are ready in 30 seconds; the second batch takes its usual time',()=>{
 assert.equal(FIRST_BATCH_MS,30000);
 const s=createFarm(now);s.inventory.feed=4;
 assert.equal(quickFirstBatch(s,'coop'),true);assert.equal(batchDuration(s,'eggs',now),30000);assert.ok(recipeDuration(s,'eggs',now)>30000);
 const first=act(s,{type:'produce',recipe:'eggs'},now);assert.equal(first.readyAt-now,30000);
 assert.equal(quickFirstBatch(s,'coop'),false);assert.equal(s.buildings.coop.batchSequence,1,'no new save key: the building\'s own batch count');
 assert.equal(beginnerProgress(s,now).find(q=>q.id==='collect').description,`Collect a finished batch from a building. Chicken feed becomes eggs in ${formatDuration(Math.round(recipeDuration(s,'eggs',now)/5000)*5000)}.`,'step 10 then says the usual time');
 act(s,{type:'collect',building:'coop'},first.readyAt);
 const second=act(s,{type:'produce',recipe:'eggs'},first.readyAt);assert.equal(second.readyAt-first.readyAt,recipeDuration(s,'eggs',first.readyAt));
 // Only time: the same goods and XP as any batch of eggs.
 assert.deepEqual(productionJobs(s.buildings.coop)[0].output,RECIPES.eggs.output);
});

test('once per building: several batches started at once make only the first quick; every new building gets its own',()=>{
 const s=at(8);s.inventory.feed=20;s.buildings.coop.level=3;
 const r=act(s,{type:'produce',recipe:'eggs',count:3},now);
 assert.deepEqual(r.batches.map(b=>b.readyAt-now),[30000,recipeDuration(s,'eggs',now),recipeDuration(s,'eggs',now)]);
 // The Feed Mill, the Dairy Barn, the Windmill and the Bakery: the first of each is quick, once.
 for(const [key,recipe,goods] of [['mill','feed',{corn:4}],['dairy','milk',{feed:4}],['windmill','grainmeal',{wheat:20,barley:20}],['bakery','bread',{flour:4,milk:4,eggs:4}]]){
  Object.assign(s.inventory,goods);if(!s.buildings[key].built)act(s,{type:'construct',building:key},now);s.buildings[key].level=2;
  assert.equal(quickFirstBatch(s,key),true,key);
  const one=act(s,{type:'produce',recipe},now);assert.equal(one.readyAt-now,Math.min(30000,recipeDuration(s,recipe,now)),key);
  Object.assign(s.inventory,goods);
  const two=act(s,{type:'produce',recipe},now);assert.equal(two.readyAt-now,recipeDuration(s,recipe,now),`${key}: the second is not`);
 }
 // The Factory too (the owner's pick: every new building, the simplest rule).
 const f=at(50);for(const key of Object.keys(BUILDINGS))if(BUILDINGS[key].type==='production')f.buildings[key].built=true;
 const bulk=Object.keys(RECIPES).find(id=>RECIPES[id].building==='factory'&&RECIPES[id].base==='eggs');f.inventory.feed=500;
 assert.equal(batchDuration(f,bulk,now),30000);
});

test('legacy farms, and buildings that already made a batch, keep the usual times; old saves load unchanged',()=>{
 const legacy=createLegacyFarm(now);legacy.inventory.feed=4;assert.equal(quickFirstBatch(legacy,'coop'),false);
 assert.equal(act(legacy,{type:'produce',recipe:'eggs'},now).readyAt-now,recipeDuration(legacy,'eggs',now));
 const used=at(6);used.buildings.coop.batchSequence=7;used.inventory.feed=4;
 assert.equal(act(used,{type:'produce',recipe:'eggs'},now).readyAt-now,recipeDuration(used,'eggs',now));
 // A save from before: a running batch keeps its time; a building whose batches all predate an id counts them (normalizeFarm).
 const old=at(6);old.buildings.coop.job={recipe:'eggs',startedAt:now-1000,readyAt:now+170000,output:{eggs:3},xp:4};delete old.buildings.coop.batchSequence;
 normalizeFarm(old,now);assert.equal(old.buildings.coop.job.readyAt,now+170000);assert.equal(old.buildings.coop.batchSequence,1);assert.equal(quickFirstBatch(old,'coop'),false);
});

test('the building window says it, once, while it applies; the wiki explains it',()=>{
 const ui=read('public/economy-ui.js');
 assert.match(ui,/if\(quickFirstBatch\(state,key\)\)content\+=`<p class="milling-note first-batch-note">Your first batch here is ready in \$\{FIRST_BATCH_MS\/1000\} seconds\.<\/p>`;/);
 assert.match(ui,/duration=batchDuration\(state,rid,farmNow\(\)\)/,'every card\'s clock shows the quick time');
 assert.match(read('public/wiki-content.js'),/\['eggs','A quick first batch',`The first batch in each new building is ready in \$\{FIRST_BATCH_MS\/1000\} seconds\. After that every batch takes its usual time\.`\]/);
});
