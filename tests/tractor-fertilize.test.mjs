import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createFarm,xpForLevel,applyFarmAction,normalizeFarm,tractorQuote,fertilizeQuote,fieldFuel,CROPS,QUESTS,DAILY_POOLS,FEATURE_LEVELS,NO_EVENT_ACTIONS,FERTILIZER_CUT,TRACTOR_FUEL_BASE,questFeatureOpen,buildingCost} from '../game/farm-state.js';
import {EVENT_STATS} from '../supabase/functions/farm-api/event-service.js';
import {createFertilizerTip,fertilizerTipDue,fertilizerTipText,FERTILIZER_TIP_KEY,FERTILIZER_TIP_TEXT,FERTILIZER_TIP_DELAY_MS,FERTILIZER_TIP_SHOW_MS} from '../public/fertilizer-tip.js';
import {wikiArticle} from '../public/wiki-content.js';
import {LANGUAGES} from '../public/languages.js';
import {catalog,translations} from '../scripts/i18n.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,21,12),HOUR=3600000,MIN=60000;

// The owner, 21 Oct 2026: players keep asking how to fertilize a field (only the Windmill's "Give a field a head start" did it). Options
// "2+4": the tractor gets a Fertilize job (all growing, not yet fertilized fields at once, 1 natural fertilizer each), and a tip with the
// first fertilizer plus a wiki section.
function farm({level=30,coins=50000,fertilizer=20,fields=8,windmill=true}={}){
 const s=createFarm(now-30*24*HOUR);s.xp=xpForLevel(level)+10;s.coins=coins;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 while(s.plots.length<fields)s.plots.push({id:s.plots.length});
 s.plots.length=fields;s.plots.forEach((p,id)=>Object.assign(p,{id,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0}));
 s.inventory.fertilizer=fertilizer;
 if(buildingCost(s,'windmill'))s.buildings.windmill.built=windmill;
 return s;
}
// A crop planted `ago` ms ago, so its time left is its duration minus that.
const growing=(s,id,crop,ago=1000)=>Object.assign(s.plots[id],{crop,plantedAt:now-ago,readyAt:now-ago+CROPS[crop].duration,careAt:now+CROPS[crop].duration*.3,watered:false,tended:false,fertilized:false});
const ripe=(s,id,crop)=>Object.assign(s.plots[id],{crop,plantedAt:now-CROPS[crop].duration-1000,readyAt:now-1000,careAt:now-CROPS[crop].duration,watered:true,tended:true});
// What a refused job must leave as it was (applyFarmAction fills in a farm's missing keys first, as farm-api does on every load).
const core=s=>({plots:s.plots,coins:s.coins,inventory:s.inventory,xp:s.xp,diamonds:s.diamonds,tractor:s.stats.tractor,fertilized:s.stats.fertilized??0});
const job=(s,expectedCost)=>applyFarmAction(s,{type:'tractor',mode:'fertilize',crop:'wheat',...(expectedCost===undefined?{}:{expectedCost})},now);

test('Fertilize does every growing crop without fertilizer, as the Windmill does by hand: 35% off the time left, once per cycle',()=>{
 const s=farm();growing(s,0,'sunflower');growing(s,1,'pumpkin');growing(s,2,'wheat');ripe(s,3,'corn');growing(s,4,'cabbage');s.plots[4].fertilized=true;
 // 5..7 empty
 const before=structuredClone(s),q=tractorQuote(s,'fertilize','corn',now);
 assert.deepEqual(q,fertilizeQuote(s,now));
 assert.deepEqual([...q.ids].sort(),[0,1,2],'not the ripe field, not the empty ones, not the one fertilized this cycle');
 assert.equal(q.count,3);assert.equal(q.fields,3);assert.equal(q.fertilizer,3);assert.equal(q.seeds,0);
 const r=job(s,q.total);
 assert.deepEqual({count:r.count,mode:r.mode,fertilizer:r.fertilizer,fields:r.fields,xp:r.xp},{count:3,mode:'fertilize',fertilizer:3,fields:3,xp:15});
 assert.equal(FERTILIZER_CUT,.35);
 for(const id of [0,1,2]){
  const left=before.plots[id].readyAt-now;
  assert.equal(s.plots[id].readyAt,before.plots[id].readyAt-Math.floor(left*.35),`field ${id}: 35% off the time left`);
  assert.equal(s.plots[id].fertilized,true);
 }
 for(const id of [3,4,5,6,7])assert.deepEqual(s.plots[id],before.plots[id],`field ${id} untouched`);
 assert.equal(s.inventory.fertilizer,17);assert.equal(s.xp,before.xp+15);
 assert.equal(s.stats.fertilized,(before.stats.fertilized??0)+3);assert.equal(s.stats.tractor,before.stats.tractor+1,'one tractor job');
 assert.equal(s.diamonds,before.diamonds,'no diamonds');
 // Once per cycle: a second run finds nothing to do.
 assert.equal(tractorQuote(s,'fertilize','corn',now).fields,0);
});

test('short of fertilizer: as many as there is fertilizer for, the longest time left first',()=>{
 const s=farm({fertilizer:2});
 growing(s,0,'wheat');growing(s,1,'sunflower',HOUR);growing(s,2,'squash');growing(s,3,'pumpkin');
 const left=id=>s.plots[id].readyAt-now,order=[0,1,2,3].sort((a,b)=>left(b)-left(a));
 const q=fertilizeQuote(s,now);
 assert.equal(q.fields,4);assert.equal(q.count,2);assert.equal(q.fertilizer,2);
 assert.deepEqual(q.ids,order.slice(0,2),'the two longest waits');
 assert.equal(q.fuel,TRACTOR_FUEL_BASE+q.ids.reduce((n,id)=>n+fieldFuel(s.plots[id].crop),0),'fuel only for the fields it does');
 const r=job(s,q.total);
 assert.equal(r.count,2);assert.equal(r.fields,4);assert.equal(s.inventory.fertilizer,0);
 assert.deepEqual(s.plots.filter(p=>p.fertilized).map(p=>p.id).sort(),[...q.ids].sort());
 // Equal waits: the field order decides, so the quote is the same every time.
 const t=farm({fertilizer:1});growing(t,3,'corn');growing(t,1,'corn');assert.deepEqual(fertilizeQuote(t,now).ids,[1]);
});

test('cost: 12 a job + each field’s crop fuel, as Water and Harvest; never more than the tile showed',()=>{
 const s=farm();growing(s,0,'sunflower');growing(s,1,'wheat');growing(s,2,'pumpkin');
 const q=fertilizeQuote(s,now);
 assert.equal(q.fuel,12+fieldFuel('sunflower')+fieldFuel('wheat')+fieldFuel('pumpkin'));assert.equal(q.fuel,12+19+2+10);assert.equal(q.total,q.fuel);
 assert.equal(q.fuel,tractorQuote(s,'water','corn',now).fuel,'the same fuel Water asks for these fields');
 const coins=s.coins,r=job(s,q.total);assert.equal(coins-s.coins,q.total);assert.equal(r.cost,q.total);assert.equal(r.fuel,q.fuel);
 // A field that started growing after the tile was drawn: the price went up, so it asks to look again.
 const t=farm();growing(t,0,'sunflower');const shown=fertilizeQuote(t,now).total;growing(t,1,'squash');
 const before=structuredClone(t);
 assert.throws(()=>job(t,shown),{message:'The price has changed. Review the current price.'});
 assert.deepEqual(core(t),core(before),'nothing charged, nothing fertilized');
 // An older page sends no price: the rules' price.
 const u=farm();growing(u,0,'corn');assert.equal(job(u).cost,12+fieldFuel('corn'));
});

test('refuses cleanly: no fertilizer, nothing to fertilize, too few coins, below the tractor’s level',()=>{
 const none=farm({fertilizer:0});growing(none,0,'pumpkin');let before=structuredClone(none);
 assert.equal(fertilizeQuote(none,now).fields,1);assert.equal(fertilizeQuote(none,now).count,0);assert.equal(fertilizeQuote(none,now).total,0);
 assert.throws(()=>job(none,0),{message:'Make natural fertilizer at the Windmill first.'});assert.deepEqual(core(none),core(before));
 const empty=farm();ripe(empty,0,'corn');growing(empty,1,'wheat');empty.plots[1].fertilized=true;before=structuredClone(empty);
 assert.throws(()=>job(empty,0),{message:'No growing crops need fertilizer.'});assert.deepEqual(core(empty),core(before));
 const poor=farm({coins:20});growing(poor,0,'sunflower');before=structuredClone(poor);
 assert.throws(()=>job(poor,fertilizeQuote(poor,now).total),{message:`You need ${12+19} coins for tractor fuel. Working by hand is free.`});assert.deepEqual(core(poor),core(before));
 const young=farm({level:FEATURE_LEVELS.tractor-1});growing(young,0,'pumpkin');before=structuredClone(young);
 assert.throws(()=>job(young));assert.deepEqual(core(young),core(before),'the tractor stays at its own level');
 assert.equal(FEATURE_LEVELS.tractor,18,'unchanged');
 assert.throws(()=>applyFarmAction(farm(),{type:'tractor',mode:'spray',crop:'wheat'},now),{message:'Choose a tractor task.'});
});

test('it counts as fertilizing by hand: the same farm afterwards, quests, challenges and events alike',()=>{
 const a=farm(),b=farm();for(const s of [a,b]){growing(s,0,'pumpkin');growing(s,1,'cabbage');growing(s,2,'sunflower');growing(s,3,'barley');}
 const q=fertilizeQuote(a,now);job(a,q.total);applyFarmAction(b,{type:'fertilize',ids:[0,1,2,3]},now);
 assert.deepEqual(a.plots,b.plots);assert.deepEqual(a.inventory,b.inventory);assert.equal(a.xp,b.xp);
 assert.deepEqual({...a.stats,tractor:0,coins_spent:0},{...b.stats,tractor:0,coins_spent:0},'every counter the same, plus one tractor job and its fuel');
 assert.equal(a.coins,b.coins-q.total,'and the fuel');
 // "A gentler way to grow" (4 fields) can be claimed; "Rich soil" (50) counts the same stat.
 const gentle=QUESTS.findIndex(x=>x.title==='A gentler way to grow');assert.equal(QUESTS[gentle].stat,'fertilized');
 assert.ok(applyFarmAction(a,{type:'quest',id:gentle},now).coins>0);
 for(const title of ['Rich soil','Master gardener'])assert.equal(QUESTS.find(x=>x.title===title).stat,'fertilized');
 assert.ok(questFeatureOpen(a,QUESTS[gentle]));
 assert.ok(DAILY_POOLS.flat().some(d=>d.stat==='fertilized'),'the daily challenge counts the same stat');
 // Events count a saved action's stats unless it is a no-event action; the coin jobs are event actions, as Water and Harvest.
 assert.ok(EVENT_STATS.includes('fertilized'));assert.equal(NO_EVENT_ACTIONS.has('tractor'),false);
});

// The tip (option 4): once per device, when the farm first has fertilizer and the tractor to use it with (24 Oct 2026, the owner: "Haal
// natuurlijke mest uit Windmolen, gaat nu via tractor": the Windmill's hand fertilizing is gone). A toast after a short wait, no popup.
const memoryStorage=()=>{const map=new Map();return {map,getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>map.set(k,String(v))};};
function tipSetup(s,{quiet=()=>false,storage=memoryStorage()}={}){
 const shown=[],timers=[];
 const tip=createFertilizerTip({state:s,storage,quiet,show:(text,options)=>shown.push({text,options}),wait:(fn,ms)=>timers.push({fn,ms})});
 const run=()=>{while(timers.length)timers.shift().fn();};
 return {tip,shown,timers,run,storage};
}
test('the tip: the first fertilizer with the tractor open, once on this device, after the action’s own toast',()=>{
 const s=farm({level:FEATURE_LEVELS.tractor,fertilizer:0});const {tip,shown,timers,run,storage}=tipSetup(s);
 assert.equal(tip.check(),false,'no fertilizer yet');
 s.inventory.fertilizer=3;
 assert.equal(tip.check(),true);assert.equal(tip.check(),false,'one on its way');
 assert.equal(timers.length,1);assert.equal(timers[0].ms,FERTILIZER_TIP_DELAY_MS);assert.deepEqual(shown,[]);
 run();
 assert.deepEqual(shown,[{text:FERTILIZER_TIP_TEXT,options:{duration:FERTILIZER_TIP_SHOW_MS,icon:'fertilizer',tone:'info'}}]);
 assert.equal(storage.getItem(FERTILIZER_TIP_KEY),'1');
 assert.equal(tip.check(),false);run();assert.equal(shown.length,1,'once');
 const again=tipSetup(s,{storage});assert.equal(again.tip.check(),false,'and not again after a reload on this device');
 assert.equal(FERTILIZER_TIP_TEXT,'Use natural fertilizer on growing fields with the tractor’s Fertilize job to cut their growing time by 35%.');
 assert.equal(fertilizerTipText(s),FERTILIZER_TIP_TEXT);
});
test('the tip waits for the tractor and keeps quiet when asked',()=>{
 const early=farm({level:FEATURE_LEVELS.tractor-1});assert.equal(fertilizerTipDue(early),false,'fertilizer, but no tractor yet');
 let quiet=true;const s=farm({level:20});const {tip,shown,run}=tipSetup(s,{quiet:()=>quiet});
 assert.equal(tip.check(),false);run();assert.deepEqual(shown,[]);
 quiet=false;assert.equal(tip.check(),true);quiet=true;run();assert.deepEqual(shown,[],'quiet again when the wait is over: not now');
 quiet=false;tip.check();run();assert.equal(shown.length,1);assert.equal(shown[0].text,FERTILIZER_TIP_TEXT);
 const blocked=tipSetup(farm({level:20}),{storage:{getItem(){throw new Error('blocked');},setItem(){throw new Error('blocked');}}});
 blocked.tip.check();blocked.run();assert.equal(blocked.shown.length,1);blocked.tip.check();blocked.run();assert.equal(blocked.shown.length,1,'kept for the page');
});

test('the game wires it: the tractor tile, the tip in updateUI, the Windmill line and the toast picture',()=>{
 const ui=read('public/retention-ui.js'),game=read('public/game.js'),eco=read('public/economy-ui.js'),toast=read('public/toast-ui.js');
 assert.match(ui,/\['plant','water','tend','harvest','fertilize'\]\.map\(mode=>\[mode,tractorQuote\(state,mode,crop,farmNow\(\)\)\]\)/);
 assert.match(ui,/\$\{fertilizeTile\(quotes\.fertilize\)\}<\/div>/);
 assert.match(ui,/const reason=!q\.fields\?'No growing crops without fertilizer':!q\.count\?'Make natural fertilizer at the Windmill first\.':'';/);
 assert.match(ui,/of \$\{q\.fields\} fields · Uses your \$\{q\.count\} natural fertilizer, longest waits first/);
 assert.match(ui,/\$\{state\.inventory\?\.fertilizer\?\?0\}/,'a new fertilizer count redraws the tractor');
 assert.match(game,/import \{ createFertilizerTip \} from '\.\/fertilizer-tip\.js';/);
 assert.match(game,/const fertilizerTip=createFertilizerTip\(\{state,show:toast,quiet:\(\)=>adminView\|\|villageWorld\|\|!beginnerProgress\(state\)\.every\(q=>q\.done\)\|\|Boolean\(document\.querySelector\('dialog\[open\]'\)\)\}\);/,'not under an open window');
 assert.match(game,/document\.addEventListener\('close',e=>\{if\(e\.target instanceof HTMLDialogElement\)fertilizerTip\.check\(\);\},true\);/,'and when it closes');
 assert.match(game,/nudge\?\.check\(\);fertilizerTip\.check\(\);/);
 assert.doesNotMatch(eco,/fertilizer-field-picker|fertilize-field|Give a field a head start/,'the Windmill\'s hand fertilizing is gone (24 Oct 2026)');
 assert.match(toast,/icon=options\?\.icon\?\?themed/);
 assert.match(read('public/retention.css'),/\.tractor-tile\.is-wide\{grid-column:1\/-1;/);
});

test('the wiki: a Natural fertilizer section (make it, the tractor, the Glasshouse, the Village Fields) and the tractor’s job',()=>{
 const site=wikiArticle('crops').html;
 assert.match(site,/id="sec-natural-fertilizer"/);
 assert.match(site,/Natural fertilizer takes 35% off the time a growing crop still needs\. Each crop takes it once per growing cycle/);
 assert.ok(!site.includes('By hand at the Windmill')&&!site.includes('Give a field a head start'),'no hand fertilizing (24 Oct 2026)');
 for(const part of ['Make it','With the tractor','longest wait first','Glasshouse','Village Fields','grows crates of vegetables or sunflowers'])assert.ok(site.includes(part),part);
 assert.match(site,/At the Windmill, 2 grain meal and 2 cabbage make 3 natural fertilizer in 30 min\. A helping hand at the Animal paddock gives some too\./);
 const young=wikiArticle('crops',{level:20}).html;assert.ok(!young.includes('In the village, the Village Fields'),'World II stays out below level 100 in the game');
 const helpers=wikiArticle('helpers').html;
 assert.match(helpers,/<strong>Fertilize<\/strong><p>Natural fertilizer on every growing crop that has none yet, 1 a field: 35% off its time left\. With less fertilizer than fields, the longest waits go first\./);
 assert.match(helpers,/data-wiki-anchor="sec-natural-fertilizer"/);
});

test('every new text is in the catalog and in all 14 other languages, without a middle dot or a leaked ${',()=>{
 const all=catalog();
 const texts=Object.entries(all).filter(([,file])=>['public/fertilizer-tip.js'].includes(file)).map(([t])=>t);
 assert.deepEqual(texts,[FERTILIZER_TIP_TEXT]);
 // The toasts too: a translated toast keeps its middle dots (no undot), so these are whole words.
 const toasts=['The tractor fertilized 1 field with 1 fertilizer for {0} coins! +{1} XP.','The tractor fertilized {0} fields with {1} fertilizer for {2} coins! +{3} XP.'];
 texts.push(...toasts);
 const mine=['Fertilize','35% off the time left on growing crops, once each','No growing crops without fertilizer','{0} fields · Uses {1} natural fertilizer','1 field · Uses 1 natural fertilizer','{0} of {1} fields · Uses your {2} natural fertilizer, longest waits first','No growing crops need fertilizer.',...texts];
 for(const t of mine)assert.ok(all[t],t);
 for(const t of texts)assert.doesNotMatch(t,/·/);
 for(const {code} of LANGUAGES.filter(l=>l.code!=='en')){
  const done=translations(code);
  for(const t of mine){
   assert.equal(typeof done[t],'string',`${code}: ${t}`);assert.doesNotMatch(done[t],/\$\{/,`${code}: ${t}`);
   for(const hole of t.match(/\{\d\}/g)??[])assert.ok(done[t].includes(hole),`${code}: ${t} keeps ${hole}`);
  }
  for(const t of texts)assert.doesNotMatch(done[t],/·/,`${code}: ${t}`);
 }
});

// Release order: farm-api first, then the site. No new save key: the job uses the fields' own fertilized flag, the fertilizer in
// storage and the existing stats (fertilized, tractor); the tip lives in the device's localStorage. Only the new site sends mode
// 'fertilize'; the live rules (main eef95f62) refuse it cleanly ("Choose a tractor task."), so a new site on the old farm-api would show a
// refused job: hence farm-api first. The old rules play on with a farm the new rules worked on, and the new rules on an old save.
const show=(sha,path)=>{try{return execFileSync('git',['show',`${sha}:${path}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source.replace("from './farmer-parts.js';",`from '${new URL('../game/farmer-parts.js',import.meta.url).href}';`)).toString('base64');
test('old rules on new saves and new rules on old saves (main eef95f62): no new key, the old rules refuse the job cleanly',async t=>{
 const old=show('eef95f62','game/farm-state.js');if(!old){t.skip('no git history here');return;}
 const O=await import(asModule(old));
 // New rules worked on it (a tractor Fertilize job), then the old rules load it and play on.
 const s=farm();growing(s,0,'pumpkin');growing(s,1,'sunflower');growing(s,2,'wheat');job(s,fertilizeQuote(s,now).total);
 const saved=structuredClone(s),keys=JSON.stringify(Object.keys(normalizeFarm(structuredClone(saved),now)).sort());
 const copy=O.normalizeFarm(structuredClone(saved),now+MIN);
 assert.deepEqual(copy.plots.map(p=>p.fertilized),saved.plots.map(p=>p.fertilized),'the old rules keep the fertilized fields');
 assert.equal(copy.inventory.fertilizer,saved.inventory.fertilizer);assert.equal(copy.stats.fertilized,saved.stats.fertilized);
 assert.throws(()=>O.applyFarmAction(structuredClone(copy),{type:'fertilize',id:0},now+MIN),{message:'This crop has already been fertilized.'},'once per cycle under the old rules too');
 O.applyFarmAction(copy,{type:'tractor',mode:'harvest',crop:'wheat'},now+CROPS.wheat.duration);
 assert.throws(()=>O.applyFarmAction(structuredClone(saved),{type:'tractor',mode:'fertilize',crop:'wheat'},now),{message:'Choose a tractor task.'});
 // The same farm under the old and the new rules has the same keys: nothing new is saved.
 const oldFarm=O.normalizeFarm(O.createFarm(now-HOUR),now),newFarm=normalizeFarm(structuredClone(oldFarm),now);
 // The Warehouse (22 Oct 2026) is the one key added since: state.warehouse, which the old rules keep as it is (tests/warehouse.test.mjs).
 const later=keys=>keys.filter(k=>k!=='warehouse');
 assert.deepEqual(later(Object.keys(newFarm).sort()),Object.keys(oldFarm).sort());
 assert.equal(JSON.stringify(Object.keys(O.normalizeFarm(structuredClone(saved),now)).sort()),keys);
 // New rules on an old save: the Fertilize job works on it.
 const legacy=farm();growing(legacy,0,'cabbage');const back=normalizeFarm(O.normalizeFarm(structuredClone(legacy),now),now);
 assert.equal(job(back,fertilizeQuote(back,now).total).count,1);
 const oldUi=show('eef95f62','public/retention-ui.js');if(oldUi)assert.doesNotMatch(oldUi,/'fertilize'/,'the live page never sends it');
});
