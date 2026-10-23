import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {QUESTS,DAILY_POOLS,MASTERY_TIERS,MASTERY_TARGETS_BEFORE_ONE_CROP,masteryStatus,medalsWaiting,FAMILY_CHEST_POINTS} from '../game/farm-state.js';
import {EVENT_HOUR_POOLS,EVENT_HOUR_POOLS_BEFORE_ONE_CROP,EVENT_GOAL_TITLES,HARVEST_GOAL_FACTOR} from '../public/event-goals.js';
import {oneCropSql,LIVE_MD5,NEW_MD5,CHEST_BODY} from '../scripts/one-crop-sql.mjs';
import {createHash} from 'node:crypto';
import {applyFarmAction as act,normalizeFarm,xpForLevel,CROPS,CARE_AT,WATER_CUT,WATER_TOWER_CUT,CARE_CUT,oneCropPlot,harvestYield,harvestXp,
 caredDuration,cropDuration,seedCost,waterCut,careCut,createFarm as createNewFarm,DAY_MS} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,22,12),HOUR=3600000;
// One crop a harvest (22 Oct 2026, the owner): every harvest gives 1 crop; water and care make the crop ripen much sooner instead.
// The numbers before it, for the balance guards below.
const OLD={corn:{cost:10,xp:5},wheat:{cost:3,xp:2},cabbage:{cost:40,xp:18},pumpkin:{cost:95,xp:36},sunflower:{cost:180,xp:68},barley:{cost:20,xp:12},
 lettuce:{cost:7,xp:3},redcabbage:{cost:130,xp:48},cauliflower:{cost:65,xp:27},greenbeans:{cost:45,xp:21},apples:{cost:700,xp:33},berries:{cost:1000,xp:27},
 squash:{cost:220,xp:60},polebeans:{cost:1400,xp:30},ciderapples:{cost:1600,xp:40},cherries:{cost:2000,xp:46}};
function farm(level=40){const s=createFarm(now);s.xp=xpForLevel(level);s.coins=1e6;s.rookieUntil=0;s.onboarding.completed=10;s.onboarding.rewardClaimed=true;s.stats.harvested=1;
 for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});return normalizeFarm(s,now);}

test('the rule: water takes 60% off, care opens at 15% and takes 60% of what is left, so both bring a crop in at a quarter of its time',()=>{
 assert.deepEqual([WATER_CUT,WATER_TOWER_CUT,CARE_AT,CARE_CUT],[.6,.65,.15,.6]);
 for(const crop of ['corn','cabbage','sunflower','squash']){
  const s=farm();act(s,{type:'field',id:0,action:'plant',crop},now);const p=s.plots[0],T=CROPS[crop].duration;
  assert.equal(p.oneCrop,true,'a new planting follows the new rule');assert.equal(p.careAt-now,T*CARE_AT);
  const water=act(s,{type:'field',id:0,action:'water'},now);assert.equal(p.readyAt-now,T*.4);assert.equal(water.saved,T*.6,'the chip says how much sooner');
  const care=act(s,{type:'field',id:0,action:'tend'},p.careAt);assert.ok(Math.abs(p.readyAt-now-T*.25)<1,crop);assert.ok(Math.abs(care.saved-T*.25*.6)<1);
  assert.equal(caredDuration(s,crop,false,now),Math.round(T*.25),'the seed shop shows the same time');
  const r=act(s,{type:'field',id:0,action:'harvest'},p.readyAt);assert.equal(r.quantity,1,'one crop');assert.equal(r.xp,CROPS[crop].xp,'its own XP, no doubling');
 }
 // Only water: 40% of the time. Neither: the whole time, still one crop.
 const s=farm();act(s,{type:'field',id:0,action:'plant',crop:'corn'},now);act(s,{type:'field',id:1,action:'plant',crop:'corn'},now);act(s,{type:'field',id:0,action:'water'},now);
 assert.equal(s.plots[0].readyAt-now,CROPS.corn.duration*.4);assert.equal(s.plots[1].readyAt-now,CROPS.corn.duration);
 assert.equal(act(s,{type:'field',id:1,action:'harvest'},now+CROPS.corn.duration).quantity,1);
});

test('the Water tower takes 65% off a crop\'s time; a crop with both is then ready at 23% of its time',()=>{
 const s=farm(90);s.improvements=['watertower'];act(s,{type:'field',id:0,action:'plant',crop:'cabbage'},now);const p=s.plots[0],T=CROPS.cabbage.duration;
 assert.equal(waterCut(s,p),.65);act(s,{type:'field',id:0,action:'water'},now);assert.ok(Math.abs(p.readyAt-now-T*.35)<1);
 act(s,{type:'field',id:0,action:'tend'},p.careAt);assert.ok(Math.abs(p.readyAt-now-T*(.15+.2*.4))<1);
 assert.equal(caredDuration(s,'cabbage',false,now),Math.round(T*(.15+.2*.4)));
});

test('a crop planted before one crop a harvest keeps the old rule for that cycle: its 1-3 crops, the old cuts and the old XP',()=>{
 const s=farm();act(s,{type:'field',id:0,action:'plant',crop:'cabbage'},now);const p=s.plots[0];
 delete p.oneCrop;p.careAt=now+CROPS.cabbage.duration*.3;   // as the old rules planted it
 assert.equal(oneCropPlot(p),false);assert.equal(waterCut(s,p),.2);assert.equal(careCut(p),.15);
 act(s,{type:'field',id:0,action:'water'},now);assert.equal(p.readyAt-now,CROPS.cabbage.duration*.8);
 act(s,{type:'field',id:0,action:'tend'},p.careAt);assert.ok(Math.abs(p.readyAt-now-CROPS.cabbage.duration*.725)<1);
 assert.equal(harvestYield(p),3);assert.equal(harvestXp(p),OLD.cabbage.xp*2);
 const r=act(s,{type:'field',id:0,action:'harvest'},p.readyAt);assert.equal(r.quantity,3);assert.equal(r.xp,36);
 // The next cycle (a new planting, or a tree growing back) is the new rule.
 act(s,{type:'field',id:0,action:'plant',crop:'cabbage'},p.readyAt);assert.equal(p.oneCrop,true);
 const t=farm(60);act(t,{type:'field',id:0,action:'plant',crop:'apples'},now);delete t.plots[0].oneCrop;Object.assign(t.plots[0],{watered:true,tended:true});
 const apple=act(t,{type:'field',id:0,action:'harvest'},t.plots[0].readyAt);assert.equal(apple.quantity,3);assert.equal(t.plots[0].oneCrop,true,'it grows back under the new rule');
 // An old save without careAt gets the old 30% for its old plantings, and 15% for new ones.
 const u=farm();act(u,{type:'field',id:0,action:'plant',crop:'corn'},now);act(u,{type:'field',id:1,action:'plant',crop:'corn'},now);delete u.plots[0].careAt;delete u.plots[1].careAt;delete u.plots[1].oneCrop;
 normalizeFarm(u,now);assert.equal(u.plots[0].careAt,now+CROPS.corn.duration*.15);assert.equal(u.plots[1].careAt,now+CROPS.corn.duration*.3);
});

test('a new farm\'s starter crops, the tractor, Full care and the night shift all plant under the new rule',()=>{
 const fresh=createNewFarm(now);assert.ok(fresh.plots.filter(p=>p.crop).every(p=>p.oneCrop===true),'the starter corn and wheat');
 const s=farm();act(s,{type:'tractor',mode:'plant',crop:'corn'},now);assert.ok(s.plots.every(p=>p.crop==='corn'&&p.oneCrop));
 s.diamonds=1000;const before=s.plots[0].readyAt;act(s,{type:'tractor_care',expectedCost:s.plots.length*2},now);
 assert.ok(Math.abs(s.plots[0].readyAt-now-(before-now)*.4*.4)<1,'Full care: both cuts at once');
 const r=act(s,{type:'tractor',mode:'harvest'},s.plots[0].readyAt);assert.equal(s.inventory.corn,r.count+((farm().inventory.corn)),'one corn a field');
});

test('seeds cost a third (trees and bushes kept their price) and a harvest gives two thirds of its old XP, wheat too (option b)',()=>{
 for(const [key,old] of Object.entries(OLD)){
  const c=CROPS[key];
  if(c.perennial)assert.equal(c.cost,old.cost,`${key}: planted once, same price`);else assert.equal(c.cost,Math.max(1,Math.round(old.cost/3)),key);
  assert.equal(c.xp,Math.max(1,Math.round(old.xp*2/3)),key);
 }
 for(const key of ['cranberries','sprouts'])assert.equal(CROPS[key].xp,18);
 const s=farm();assert.equal(seedCost(s,'corn'),3);
});

// The balance guard (the owner's rule: coins and XP an hour stay about the same for a farmer who waters and cares). Per field and hour
// of growing, planting again at once: crops, the crops' market worth minus seeds, and XP. Before: 3 crops in 72.5% of the time (care at
// 30%), 2 in 80% with water only. Now: 1 crop in 25% (both) or 40% (water).
test('per field and hour: the same crops for every way of playing, the same worth and XP for a farmer who waters and cares',()=>{
 const worth=key=>Math.round(CROPS[key].sell*.8);
 for(const [key,old] of Object.entries(OLD)){
  const c=CROPS[key],T=(c.regrow??c.duration)/HOUR,seeds=c.perennial?0:1;
  const before={full:{h:1/(T*.725),n:3,xp:old.xp*2},water:{h:1/(T*.8),n:2,xp:old.xp},none:{h:1/T,n:1,xp:old.xp}};
  const after={full:{h:1/(T*.25),n:1,xp:c.xp},water:{h:1/(T*.4),n:1,xp:c.xp},none:{h:1/T,n:1,xp:c.xp}};
  for(const way of ['full','water','none']){const b=before[way],a=after[way];assert.ok(a.h*a.n>=b.h*b.n*.96,`${key} ${way}: crops an hour`);}
  const value=(r,cost)=>r.h*(r.n*worth(key)-cost*seeds),b=before.full,a=after.full;
  if(key!=='wheat'){
   const ratio=value(a,c.cost)/value(b,old.cost);assert.ok(ratio>.93&&ratio<1.1,`${key} carer worth an hour ${ratio.toFixed(2)}`);
   const xp=(a.h*a.xp)/(b.h*b.xp);assert.ok(xp>.85&&xp<1.05,`${key} carer XP an hour ${xp.toFixed(2)}`);
  }
 }
});

// 23 Oct 2026 (the owner: "show bij crops enkel total time"): the seed shop and the seed picker show the growing time only; from 22 Oct
// the time with water and care stood beside it.
test('the seed shop and the seed picker show a crop\'s growing time only, with the hourglass; the fields keep their real time',()=>{
 const ui=read('public/economy-ui.js'),html=read('public/farm.html');
 assert.doesNotMatch(ui,/caredTime|cared-time/);assert.doesNotMatch(read('public/retention.css'),/\.cared-time/);
 assert.match(ui,/\$\('selected-crop-price'\)\.innerHTML=cropPrice\(key\);/);assert.match(ui,/:`\$\{growTimes\(key\)\} · sells for \$\{marketQuote\(key,farmNow\(\)\)\.price\}`\}<\/small>/);
 assert.match(html,/<p class="seed-yield-line"><span class="crop-time"><i data-game-art="hourglass"><\/i><\/span><span>Growing time<\/span> <span>Every harvest gives 1 crop\.<\/span><\/p>/);
 assert.match(ui,/const growTimes=\(key,regrowing=false\)=>`<span class="crop-time" title="Growing time">\$\{art\('hourglass'\)\}\$\{seconds\(cropDuration\(state,key,regrowing,farmNow\(\)\)\)\}<\/span>`;/);
 assert.doesNotMatch(read('public/game.js'),/\+1 crop/,'no "+1 crop" for water or care any more');
 const s=farm();assert.equal(caredDuration(s,'wheat',false,now),30000,'wheat: 2 minutes, 30 seconds with water and care (care opens at 18 s, above the 15-second minimum)');
 assert.ok(caredDuration(s,'apples',true,now)<cropDuration(s,'apples',true,now)*.26);
});

test('the texts say the new rule: one crop a harvest, water and care make it ripen sooner',()=>{
 const wiki=read('public/wiki-content.js');
 assert.doesNotMatch(wiki,/Water a field for 2 crops|three times the crop|gives one more crop|doing both gives double XP/);
 assert.match(wiki,/Every harvest gives 1 crop and the crop's XP\. Water and care make it ripen much sooner\./);
 assert.match(wiki,/'With water and care'/);
 assert.match(read('public/loading-screen.js'),/Water and care for a field: it is ready in about a quarter of the time\./);
 assert.match(read('public/retention-ui.js'),/it opens after 15% of the growing time/);
 for(const lang of ['nl','de','es','fr','ja']){const t=JSON.parse(read(`public/i18n/${lang}.json`));assert.ok(t['Every harvest gives 1 crop.'],lang);assert.ok(t['{0} sooner'],lang);}
});

// "Verdubbel de doelen, ook de medailles" (22 Oct 2026): harvests come about twice as often, so every goal that counts harvests asks twice as many.
test('harvest goals ask twice as many: quests, daily challenges, season weeks and the hourly events',()=>{
 assert.deepEqual(QUESTS.filter(q=>q.stat==='harvested').map(q=>q.target),[6,200,2000,5000,10000,20000,20]);
 for(const q of QUESTS.filter(q=>q.stat==='harvested'))assert.match(q.description,new RegExp(q.target.toLocaleString('en-US')),q.title);
 assert.deepEqual(DAILY_POOLS.flat().filter(q=>q.stat==='harvested').map(q=>[q.target,q.description]),[[16,'Harvest 16 crops.'],[80,'Harvest 80 crops.']]);
 const src=read('game/farm-state.js');
 for(const [kind,target] of [['harvest',300],['festival',200],['sprouts',200]])assert.ok(src.includes(`goal:{kind:'${kind}',target:${target}}`),kind);
 assert.doesNotMatch(src,/goal:\{kind:'(harvest|festival|sprouts)',target:(150|100)\}/);
 assert.equal(HARVEST_GOAL_FACTOR,2);
 EVENT_HOUR_POOLS.forEach((league,i)=>league.flat().forEach(g=>{const was=EVENT_HOUR_POOLS_BEFORE_ONE_CROP[i].flat().find(x=>x.stat===g.stat).target;assert.equal(g.target,g.stat==='harvested'?was*2:was,g.stat);}));
 assert.equal(EVENT_GOAL_TITLES.tended[0][1],'A little care brings every harvest in sooner.');
});

test('medals ask 50 / 200 / 600 / 2,000 harvests; a medal reached with the old numbers stays, collected or not',()=>{
 assert.deepEqual(MASTERY_TIERS.map(t=>t.target),[50,200,600,2000]);assert.deepEqual([...MASTERY_TARGETS_BEFORE_ONE_CROP],[25,100,300,1000]);
 // A farm from before: 150 corn harvests (Bronze collected, Silver reached but not collected), 30 wheat (Bronze reached), 10 lettuce.
 const s=farm(40);delete s.mastery.kept;Object.assign(s.mastery.harvests,{corn:150,wheat:30,lettuce:10});s.mastery.claimed=['corn:0'];
 normalizeFarm(s,now);assert.deepEqual(s.mastery.kept,{corn:2,wheat:1},'what the old numbers gave, once');
 assert.deepEqual(masteryStatus(s,'corn').map(t=>[t.progress,t.target,t.claimed]),[[50,50,true],[200,200,false],[150,600,false],[150,2000,false]],'Silver stays; Gold counts 150 of 600');
 assert.ok(medalsWaiting(s).includes('corn:1')&&medalsWaiting(s).includes('wheat:0')&&!medalsWaiting(s).some(id=>id.startsWith('lettuce')));
 act(s,{type:'mastery',crop:'corn',tier:1},now);act(s,{type:'mastery',crop:'wheat',tier:0},now);
 assert.throws(()=>act(s,{type:'mastery',crop:'corn',tier:2},now),/Keep harvesting/);
 // Kept once: later loads never add tiers from new harvests; the new numbers count from here.
 s.mastery.harvests.lettuce=60;normalizeFarm(s,now+1);assert.equal(s.mastery.kept.lettuce,undefined);assert.ok(medalsWaiting(s).includes('lettuce:0'),'50 now');
 s.mastery.harvests.wheat=150;normalizeFarm(s,now+2);assert.equal(s.mastery.kept.wheat,1);assert.ok(!medalsWaiting(s).includes('wheat:1'),'Silver now needs 200');
 // A broken value is dropped; a new farm keeps nothing.
 s.mastery.kept.corn=9;s.mastery.kept.nope=1;normalizeFarm(s,now+3);assert.deepEqual(Object.keys(s.mastery.kept).sort(),['wheat']);
 assert.deepEqual(createNewFarm(now).mastery.kept,{});
});

test('the Family Chest counts two harvests a point; supabase/one-crop.sql is generated, guarded and checked',()=>{
 assert.equal(FAMILY_CHEST_POINTS.harvested,.5);
 const sql=read('supabase/one-crop.sql'),md5=t=>createHash('md5').update(t).digest('hex');
 assert.equal(sql,oneCropSql(),'run node scripts/one-crop-sql.mjs');
 assert.deepEqual(LIVE_MD5,{'harvest_family_chest()':'b2935aa9acdcab783a7b943463607ad6','harvest_event_pick(bigint)':'a4354b4070af10908e1e609720cba26d'});
 assert.equal(NEW_MD5['harvest_family_chest()'],md5(CHEST_BODY));
 for(const hash of [...Object.values(LIVE_MD5),...Object.values(NEW_MD5)])assert.ok(sql.includes(`if m is distinct from '${hash}'`),hash);
 assert.match(sql,/^begin;$/m);assert.match(sql,/^commit;\n$/m);assert.doesNotMatch(sql,/grant |create table|drop /i,'no new function, grant or table');
 assert.match(sql,/create or replace function public\.harvest_family_chest\(\)\n returns trigger language plpgsql security definer set search_path to '' as \$function\$/);
 assert.match(sql,/create or replace function public\.harvest_event_pick\(n bigint\)\n returns jsonb language plpgsql stable set search_path to '' as \$function\$/);
 assert.ok(sql.split('A little care brings every harvest in sooner.').length>2,'in the new pick (and the header)');assert.equal(sql.split('every harvest bigger.').length,2,'only in the header comment');
 // floor(new/2) - floor(old/2): every second harvest is a point, however the saves split them.
 const half=n=>Math.floor(n/2);let points=0,total=0;for(const step of [1,1,3,1,2,5,1])points+=half(total+step)-half(total),total+=step;assert.equal(points,half(total));
});
