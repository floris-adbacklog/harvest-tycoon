import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
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

test('seeds cost a third (trees and bushes kept their price) and a harvest gives two thirds of its old XP (wheat stays 2)',()=>{
 for(const [key,old] of Object.entries(OLD)){
  const c=CROPS[key];
  if(c.perennial)assert.equal(c.cost,old.cost,`${key}: planted once, same price`);else assert.equal(c.cost,Math.max(1,Math.round(old.cost/3)),key);
  assert.equal(c.xp,key==='wheat'?2:Math.max(1,Math.round(old.xp*2/3)),key);
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

test('the seed shop and the seed picker show a crop\'s time with water and care, with the water and care pictures; the fields keep their real time',()=>{
 const ui=read('public/economy-ui.js'),html=read('public/farm.html');
 assert.match(ui,/const caredTime=\(key,regrowing=false\)=>`<span class="cared-time" title="With water and care">\$\{art\('water'\)\}\$\{art\('care'\)\}\$\{seconds\(caredDuration\(state,key,regrowing,farmNow\(\)\)\)\}<\/span>`;/);
 assert.match(ui,/\$\('selected-crop-price'\)\.innerHTML=cropPrice\(key\);/);assert.match(ui,/:`\$\{caredTime\(key\)\} · sells for \$\{marketQuote\(key,farmNow\(\)\)\.price\}`\}<\/small>/);
 assert.match(html,/<p class="seed-yield-line"><span class="cared-time"><i data-game-art="water"><\/i><i data-game-art="care"><\/i><\/span>Times with water and care\. Every harvest gives 1 crop\.<\/p>/);
 assert.match(read('public/retention.css'),/\.cared-time\{display:inline-flex/);
 assert.doesNotMatch(read('public/game.js'),/\+1 crop/,'no "+1 crop" for water or care any more');
 const s=farm();assert.equal(caredDuration(s,'wheat',false,now),Math.round(30000+(48000-30000)*.4),'wheat: care opens at the 30-second minimum');
 assert.ok(caredDuration(s,'apples',true,now)<cropDuration(s,'apples',true,now)*.26);
});

test('the texts say the new rule: one crop a harvest, water and care make it ripen sooner',()=>{
 const wiki=read('public/wiki-content.js');
 assert.doesNotMatch(wiki,/Water a field for 2 crops|three times the crop|gives one more crop|doing both gives double XP/);
 assert.match(wiki,/Every harvest gives 1 crop and the crop's XP\. Water and care make it ripen much sooner\./);
 assert.match(wiki,/'With water and care'/);
 assert.match(read('public/loading-screen.js'),/Water and care for a field: it is ready in about a quarter of the time\./);
 assert.match(read('public/retention-ui.js'),/it opens after 15% of the growing time/);
 for(const lang of ['nl','de','es','fr','ja']){const t=JSON.parse(read(`public/i18n/${lang}.json`));assert.ok(t['Times with water and care. Every harvest gives 1 crop.'],lang);assert.ok(t['{0} sooner'],lang);}
});
