import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {availableDaily,recipeValue,createFarm,applyFarmAction as act,normalizeFarm,xpForLevel,recipeDuration,cropDuration,productionJobs,featureUnlocked,recipeUnlocked,buildingEligible,itemAvailable,marketSaleValue,dailyOrders,currentProject,familyWeek,familyWeekStart,valleyRestock,ranchSpeedup,depotRestock,exportValue,
 CROPS,CROP_LEVELS,ENDGAME_FIELDS,IMPROVEMENTS,DEPOT_PREMIUM,DEPOT_RESTOCK,DEPOT_DIAMONDS,FAIR_CLASSES,FAIR_PREMIUM,VALLEY_RESTOCK,RANCH_SPEEDUP,RECIPES,ITEMS,QUESTS,PROJECTS,CHAPTER_DIAMONDS,DAY_MS,FEATURE_LEVELS} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {ANCHORS,YARD_EXTENT,ROADS,anchorAt,roadRects} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12);
// A farm at a level with every building it may already have opened (some need another one first), rich and well stocked.
function farmAt(level,stock=0){const s=createFarm(now);s.xp=xpForLevel(level);s.levelRewards=Array.from({length:level},(_,i)=>i+1);s.coins=5e7;
 for(let pass=0;pass<3;pass++)for(const key of Object.keys(s.buildings))if(buildingEligible(s,key)&&s.buildings[key].built===false){try{act(s,{type:'construct',building:key},now);}catch{}}
 // The trailer and the fair are set up once everything is open, as on a farm that grew into them.
 for(const key of Object.keys(s.inventory))s.inventory[key]=stock;s.depot={serial:0,shipped:0,contract:null,readyAt:0};s.fair={week:null,classes:[],entered:[]};normalizeFarm(s,now);return s;}

test('wave 3 opens between 75 and 90: the Estate Workshop, prize produce, the Trade Depot and the fair',()=>{
 const first=check=>{for(let level=60;level<=95;level++)if(check(farmAt(level)))return level;return null;};
 assert.deepEqual(['estateworkshop','tradedepot','grandfair'].map(k=>first(s=>featureUnlocked(s,k))),[75,85,90]);
 assert.equal(first(s=>recipeUnlocked(s,'prizeproduce')),80);
 assert.equal(RECIPES.mass_prizeproduce,undefined,'grown under glass, never in bulk');
 const legacy=createLegacyFarm(now);legacy.xp=xpForLevel(30);normalizeFarm(legacy,now);
 for(const key of ['estateworkshop','tradedepot','grandfair'])assert.equal(featureUnlocked(legacy,key),false,`an old farm waits for level ${FEATURE_LEVELS[key]} as well`);
 assert.throws(()=>act(farmAt(80),{type:'fair_enter',entry:0,week:familyWeek(now)},now),/level 90/);
});

test('prize produce grows in the Glasshouse from the best of the vegetable garden',()=>{
 const s=farmAt(80);Object.assign(s.inventory,RECIPES.prizeproduce.input);
 act(s,{type:'produce',recipe:'prizeproduce'},now);for(const job of productionJobs(s.buildings.glasshouse))job.readyAt=now;
 act(s,{type:'collect',building:'glasshouse'},now);
 assert.equal(s.inventory.prizeproduce,1);assert.equal(s.stats.made_prizeproduce,1);assert.equal(s.stats.glasshouse_batches,1);
 const input=Object.entries(RECIPES.prizeproduce.input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0);
 assert.ok(ITEMS.prizeproduce.sell>input,'worth more than what goes in');
});

test('the Estate Workshop: each improvement is built once, at its level, with coins and goods',()=>{
 const s=farmAt(80,500),coins=s.coins,xp=s.xp;
 assert.throws(()=>act(s,{type:'improve',improvement:'ledger'},now),/Reach level 88/);
 assert.throws(()=>act(s,{type:'improve',improvement:'moat'},now),/Choose an improvement/);
 const r=act(s,{type:'improve',improvement:'ladders'},now);
 assert.equal(s.coins,coins-IMPROVEMENTS.ladders.coins);assert.ok(s.xp>=xp+r.xp);assert.equal(s.stats.improvements,1);
 for(const [k,n] of Object.entries(IMPROVEMENTS.ladders.materials))assert.equal(s.inventory[k],500-n);
 assert.throws(()=>act(s,{type:'improve',improvement:'ladders'},now),/already built/);
 const poor=farmAt(80);assert.throws(()=>act(poor,{type:'improve',improvement:'heating'},now),/missing supplies/);
 assert.throws(()=>act(farmAt(70,500),{type:'improve',improvement:'ladders'},now),/level 75/);
 const levels=Object.values(IMPROVEMENTS).map(x=>x.level);assert.deepEqual(levels,[...levels].sort((a,b)=>a-b));assert.ok(levels.every(n=>n>=75&&n<=90));
 for(const x of Object.values(IMPROVEMENTS))for(const k of Object.keys(x.materials))assert.ok(itemAvailable(farmAt(x.level),k),`${x.name}: ${k} can be made by level ${x.level}`);
});

test('every improvement does what its card says',()=>{
 const s=farmAt(90,500),before={regrow:cropDuration(s,'cherries',true,now),grow:cropDuration(s,'cherries',false,now),glass:recipeDuration(s,'glasscauliflower',now),bread:recipeDuration(s,'bread',now),sale:marketSaleValue(s,1000,now)};
 assert.equal(valleyRestock(s),VALLEY_RESTOCK);assert.equal(ranchSpeedup(s),RANCH_SPEEDUP);assert.equal(depotRestock(s),DEPOT_RESTOCK);
 for(const id of Object.keys(IMPROVEMENTS))act(s,{type:'improve',improvement:id},now);
 assert.equal(s.stats.improvements,7);
 assert.equal(cropDuration(s,'cherries',true,now),Math.round(before.regrow*.8),'trees grow back 20% faster');assert.equal(cropDuration(s,'cherries',false,now),before.grow,'a new planting is unchanged');
 assert.equal(recipeDuration(s,'glasscauliflower',now),Math.round(before.glass*.75));assert.equal(recipeDuration(s,'bread',now),before.bread);
 assert.equal(ranchSpeedup(s),.35);assert.equal(valleyRestock(s),VALLEY_RESTOCK/2);assert.equal(depotRestock(s),DEPOT_RESTOCK/2);
 assert.equal(marketSaleValue(s,1000,now),Math.floor(before.sale*1.1));
 const plot=s.plots.findIndex(p=>!p.crop);act(s,{type:'field',id:plot,action:'plant',crop:'cabbage'},now);
 const p=s.plots[plot],left=p.readyAt-now;act(s,{type:'field',id:plot,action:'water'},now);assert.equal(p.readyAt,now+left*.7,'watering takes 30% off');
});

test('the Trade Depot: load a trailer bit by bit; a full one leaves at once and pays 1.6× plus diamonds',()=>{
 const s=farmAt(85),c=s.depot.contract;
 assert.ok(c,'a contract is waiting');const keys=Object.keys(c.input);assert.ok(keys.length>=1&&keys.length<=4);
 for(const k of keys){assert.ok(itemAvailable(s,k),k);assert.ok(ITEMS[k].sell>=400,k);}
 assert.equal(c.value,Object.entries(c.input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0));assert.ok(Math.abs(c.value-exportValue(85))<exportValue(85)*.35);
 assert.equal(c.coins,Math.ceil(c.value*DEPOT_PREMIUM/100)*100);assert.equal(c.diamonds,DEPOT_DIAMONDS);
 assert.throws(()=>act(s,{type:'depot_load',contract:c.id},now),/none of the goods/);
 const [first,...rest]=keys;s.inventory[first]=c.input[first]-1;
 const part=act(s,{type:'depot_load',contract:c.id,item:first},now);assert.equal(part.shipped,false);assert.equal(s.inventory[first],0);assert.equal(s.depot.contract.loaded[first],c.input[first]-1);
 assert.throws(()=>act(s,{type:'depot_skip',contract:c.id},now),/already on this trailer/,'a started trailer cannot be turned down');
 assert.throws(()=>act(s,{type:'depot_load',contract:c.id+1},now),/changed/);
 for(const k of keys)s.inventory[k]+=c.input[k];
 const coins=s.coins,diamonds=s.diamonds,r=act(s,{type:'depot_load',contract:c.id},now);
 assert.equal(r.shipped,true);assert.equal(s.coins,coins+c.coins);assert.equal(s.diamonds,diamonds+c.diamonds+(r.levelReward?.diamonds??0));
 assert.equal(s.inventory[first],c.input[first]-1,'only what was still needed was loaded');for(const k of rest)assert.equal(s.inventory[k],0);
 assert.equal(s.stats.depot_shipments,1);assert.equal(s.depot.contract,null);assert.equal(s.depot.readyAt,now+DEPOT_RESTOCK);
 normalizeFarm(s,now+DEPOT_RESTOCK-1);assert.equal(s.depot.contract,null);normalizeFarm(s,now+DEPOT_RESTOCK);assert.equal(s.depot.contract.id,c.id+1);
 const t=farmAt(85),skip=act(t,{type:'depot_skip',contract:t.depot.contract.id},now);assert.equal(skip.readyAt,now+DEPOT_RESTOCK);
 const again=farmAt(85);assert.deepEqual(again.depot,farmAt(85).depot,'the same farm gets the same contract: game and server agree');
 const boosted=farmAt(85);for(const [k,n] of Object.entries(boosted.depot.contract.input))boosted.inventory[k]=n;boosted.boosts.coinsUntil=now+60000;
 const before=boosted.coins,paid=act(boosted,{type:'depot_load',contract:boosted.depot.contract.id},now);assert.equal(boosted.coins-before,paid.coins);assert.equal(paid.coins,boosted.stats.depot_coins*2,'Double earnings doubles an export like a delivery');
});

test('a farm that makes nothing yet gets no empty trailer and no empty fair',()=>{
 const s=createFarm(now);s.xp=xpForLevel(90);normalizeFarm(s,now);
 assert.equal(s.depot.contract,null);assert.equal(s.depot.serial,0);
});

test('the Grand Valley Fair: three classes a week, one ribbon each, stars that add up and a grand champion',()=>{
 const s=farmAt(90,0),week=familyWeek(now),classes=s.fair.classes;
 assert.equal(s.fair.week,week);assert.deepEqual(classes.map(c=>c.stars),[1,2,3]);assert.deepEqual(classes.map(c=>c.name),FAIR_CLASSES.map(c=>c.name));
 assert.ok(Object.keys(classes[0].input).every(k=>CROPS[k]),'the first class is a crop');assert.equal(classes[2].input.prizeproduce,3,'best in show asks for prize produce');
 for(const c of classes){for(const k of Object.keys(c.input))assert.ok(itemAvailable(s,k),k);assert.equal(c.coins,Math.ceil(c.value*FAIR_PREMIUM/100)*100);}
 assert.throws(()=>act(s,{type:'fair_enter',entry:0,week},now),/Missing/);
 for(const c of classes)for(const [k,n] of Object.entries(c.input))s.inventory[k]+=n;
 const r0=act(s,{type:'fair_enter',entry:0,week},now);assert.equal(r0.champion,false);assert.equal(s.stats.fair_stars,1);
 assert.throws(()=>act(s,{type:'fair_enter',entry:0,week},now),/already have a ribbon/);
 assert.throws(()=>act(s,{type:'fair_enter',entry:1,week:week-1},now),/new fair week/);
 act(s,{type:'fair_enter',entry:1,week},now);const r2=act(s,{type:'fair_enter',entry:2,week},now);
 assert.equal(r2.champion,true);assert.equal(s.stats.fair_stars,6);assert.equal(s.stats.fair_entries,3);assert.equal(s.stats.fair_champion,1);
 const next=familyWeekStart(week+1);normalizeFarm(s,next);assert.equal(s.fair.week,week+1);assert.deepEqual(s.fair.entered,[]);
 const weeks=new Set();for(let w=0;w<8;w++){normalizeFarm(s,next+w*7*DAY_MS);weeks.add(JSON.stringify(s.fair.classes.map(c=>c.input)));}assert.ok(weeks.size>=6,'the classes change from week to week');
});

test('Estate chapters 7-10 use the goods of the three waves and wait for their level',()=>{
 assert.equal(PROJECTS.length,10);assert.deepEqual(CHAPTER_DIAMONDS.slice(6),[125,150,175,200]);
 assert.deepEqual(PROJECTS.slice(6).map(p=>p.level),[40,55,70,85]);
 for(const p of PROJECTS.slice(6))for(const k of Object.keys(p.input))assert.ok(itemAvailable(farmAt(p.level),k),`${p.name}: ${k}`);
 const s=farmAt(45,1000);s.estate.completed=6;s.mastery.claimed=Array.from({length:44},(_,i)=>String(i));
 assert.equal(currentProject(s).name,'Golden meadows');act(s,{type:'project_start'},now);
 s.estate.job.readyAt=now;act(s,{type:'project_collect'},now);assert.equal(currentProject(s).name,'The weavers’ valley');
 assert.throws(()=>act(s,{type:'project_start'},now),/Reach level 55/);
});

test('quests, dailies, orders and commissions for wave 3 come only once they can be done',()=>{
 const titles=QUESTS.map(q=>q.title);assert.ok(titles.indexOf('The manor workshop')>titles.indexOf('Head of the herd'),'appended after wave 2');
 const gate={improvements:'estateworkshop',depot_shipments:'tradedepot',fair_entries:'grandfair',fair_stars:'grandfair',fair_champion:'grandfair'};
 for(const q of QUESTS.filter(q=>gate[q.stat]))assert.ok(q.minLevel>=FEATURE_LEVELS[gate[q.stat]],q.title);
 const late=farmAt(90),seen=new Set();for(let d=0;d<40;d++)dailyOrders(late,now+d*DAY_MS).forEach(o=>seen.add(o.title));
 assert.ok(['The champions\' supper','The fair\'s closing night'].some(t=>seen.has(t)),'the level-90 commissions come round');
 const young=farmAt(70),early=new Set();for(let d=0;d<40;d++)dailyOrders(young,now+d*DAY_MS).forEach(o=>early.add(o.title));
 assert.ok(!['The judges’ table','The produce show','The export sampler'].some(t=>early.has(t)));
});

test('the three new places stand on free ground at the end of the trunk road, and every model and picture is in place',()=>{
 for(const id of ['tradedepot','estateworkshop','grandfair']){
  assert.ok(ANCHORS[id]&&YARD_EXTENT[id],id);const [x,z]=anchorAt(id),[west,east,north,south]=YARD_EXTENT[id];
  assert.ok(!roadRects().some(r=>x+east>r.minX&&x+west<r.maxX&&z+south>r.minZ&&z+north<r.maxZ),`${id} is off the roads`);
 }
 const lane=ROADS.find(r=>r.turned);assert.ok(lane,'the road out of the valley is laid along its own length: no pointed end');
 const rect=roadRects()[ROADS.indexOf(lane)];assert.ok(rect.minX<roadRects()[0].maxX&&rect.maxX>98.9,'it joins the trunk road and runs to the edge of the world');
 const game=read('public/game.js'),loaded=new Set([...game.split('\n').filter(line=>/^const modelNames=|^modelNames\.push\(/.test(line)).join('\n').matchAll(/'([a-z_]+_\d+)'/g)].map(m=>m[1]));
 for(const model of ['house_005','hangar_008','trailer_003','truck_005','prop_020','prop_021','house_023','dray_003']){assert.ok(existsSync(new URL(`../public/assets/models/${model}.glb`,import.meta.url)),model);assert.ok(loaded.has(model),model);}
 assert.doesNotMatch(game,/'box_00[45]'/,'no plain white or grey cubes');
 for(const id of ['prizeproduce','estate-workshop','trade-depot','grand-fair'])assert.ok(existsSync(new URL(`../public/assets/icons/${id}.webp`,import.meta.url)),id);
 assert.match(game,/addUtility\('tradedepot','hangar_008'/);assert.match(game,/addUtility\('estateworkshop','house_005'/);assert.match(game,/addUtility\('grandfair','house_023'/);
 const html=read('public/farm.html');assert.match(html,/data-menu-utility="estateworkshop"[\s\S]*data-menu-utility="tradedepot"[\s\S]*data-menu-utility="grandfair"/);assert.match(html,/<dialog id="estate-place-dialog"/);
 assert.doesNotMatch(read('public/farm-life.js'),/landscape_008/,'the green hill at the east end is gone');
});

test('sunflowers grow under glass from level 48, and chapter 9 asks for 275 cherries instead of 440',()=>{
 assert.equal(recipeUnlocked(farmAt(47),'glasssunflower'),false);
 const s=farmAt(48);assert.equal(recipeUnlocked(s,'glasssunflower'),true);assert.equal(RECIPES.mass_glasssunflower,undefined,'the Factory never grows crops');
 s.inventory.fertilizer=2;const coins=s.coins;act(s,{type:'produce',recipe:'glasssunflower'},now);assert.equal(s.coins,coins-RECIPES.glasssunflower.coins);
 for(const job of productionJobs(s.buildings.glasshouse))job.readyAt=now;act(s,{type:'collect',building:'glasshouse'},now);
 assert.equal(s.inventory.sunflower,6);assert.equal(s.stats.made_sunflower,6);
 const orchard=PROJECTS.find(p=>p.name==='Orchard and ranch');assert.deepEqual([orchard.input.cherrypie,orchard.input.cherryjam],[25,25]);
 assert.equal(orchard.input.cherrypie*RECIPES.cherrypie.input.cherries+orchard.input.cherryjam*RECIPES.cherryjam.input.cherries,275);
});

test('prize produce is the best use of a Glasshouse slot, as a prize should be',()=>{
 const perHour=id=>recipeValue(id).added/(RECIPES[id].duration/3600000);
 for(const id of Object.keys(RECIPES).filter(id=>RECIPES[id].building==='glasshouse'&&id!=='prizeproduce'))assert.ok(perHour('prizeproduce')>perHour(id),id);
 assert.ok(perHour('prizeproduce')>=perHour('blanket')*.95,'on a par with the wool blanket, the best good before it');
});

test('fields 29-40 open during the expansion, each asking only for goods the farm can make by then',()=>{
 const levels=ENDGAME_FIELDS.map(f=>f.level);assert.equal(levels.at(-1),90,'the last field comes where the content ends');
 assert.ok(levels.filter(n=>n<=50).length>=6,'half of them while the trees start to claim fields');
 for(const field of ENDGAME_FIELDS){const s=farmAt(field.level);for(const k of Object.keys(field.materials))assert.ok(itemAvailable(s,k),`field at ${field.level}: ${k}`);}
 for(const crop of ['polebeans','ciderapples','cherries'])assert.ok(levels.some(n=>n<=CROP_LEVELS[crop]&&n>CROP_LEVELS[crop]-5),`a field opens around the ${crop}`);
});

test('250 quests: the last 46 carry the expansion ladders to the end of the game, each climbing and shown only when it can be done',()=>{
 assert.equal(QUESTS.length,250);assert.equal(QUESTS[204].title,'A cellar full of squash','appended after “Legend of the fair”');
 const added=QUESTS.slice(204);assert.equal(added.length,46);
 for(const stat of new Set(added.map(q=>q.stat))){
  const ladder=QUESTS.filter(q=>q.stat===stat);
  for(let i=1;i<ladder.length;i++){assert.ok(ladder[i].target>ladder[i-1].target,`${stat}: targets climb`);assert.ok(ladder[i].reward>ladder[i-1].reward,`${stat}: rewards climb`);}
 }
 const gate={valley_:'valleymarket',depot_:'tradedepot',fair_:'grandfair'};
 for(const q of added)for(const [prefix,feature] of Object.entries(gate))if(q.stat.startsWith(prefix))assert.ok(q.minLevel>=FEATURE_LEVELS[feature],q.title);
 assert.equal(QUESTS.find(q=>q.title==='Forty fields').target,40-12,'all 28 fields bought on top of the first 12');
 const glass=QUESTS.find(q=>q.title==='Sunflowers under glass');
 assert.equal(availableDaily(farmAt(47),glass),false);assert.equal(availableDaily(farmAt(48),glass),true);
 assert.equal(availableDaily(farmAt(30),QUESTS.find(q=>q.title==='A river of honey')),false,'honey from the Bee Yard, not the hands-on jobs');
 const fresh=createFarm(now);for(const q of added)assert.equal(fresh.stats[q.stat],0,`${q.stat} is a counter the game keeps`);
});

test('a Factory batch can never be finished with diamonds: the shop does not offer it and the server refuses it',()=>{
 const ui=read('public/boosts-ui.js');
 assert.match(ui,/function runningBatches\(\)\{return Object\.entries\(state\.buildings\)\.filter\(\(\[building\]\)=>building!=='factory'\)/);
 assert.match(ui,/ready to collect now \(not the Factory\)/);
 const s=farmAt(60,100);s.diamonds=100;act(s,{type:'produce',recipe:'mass_bread'},now);
 const job=productionJobs(s.buildings.factory)[0];assert.ok(job,'a Factory batch is running');
 assert.throws(()=>act(s,{type:'finish_batch',building:'factory',jobId:job.id,expectedCost:10},now),/too big to rush/);
});
