import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,xpForLevel,applyFarmAction,tractorQuote,fieldFuel,marketQuote,seedCost,CROPS,TRACTOR_FUEL_BASE,TRACTOR_FUEL_PER_FIELD,TRACTOR_FUEL_SHARE} from '../game/farm-state.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,17,12),HOUR=3600000;

// The owner, 17 Oct 2026: "Maak de coins in de tractor duurder naarmate je langere 'duurdere' crop selecteert, ipv altijd 40, bij alle:
// planten, wateren, care, oogsten." It was 12 a job + 2 a field for every crop (40 on 14 fields). Option 1 of two (5% or 10%): 12 a job
// + 5% of the field's crop's usual market price, at least 2.
function farm({level=30,coins=50000,fields=8}={}){
 const s=createFarm(now-30*24*HOUR);s.xp=xpForLevel(level)+10;s.coins=coins;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};
 while(s.plots.length<fields)s.plots.push({id:s.plots.length,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false});
 s.plots.length=fields;for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return s;
}
const ripe=(s,id,crop)=>Object.assign(s.plots[id],{crop,plantedAt:now-CROPS[crop].duration-1000,readyAt:now-1000,careAt:now-CROPS[crop].duration,watered:true,tended:true});
const growing=(s,id,crop)=>Object.assign(s.plots[id],{crop,plantedAt:now-1000,readyAt:now-1000+CROPS[crop].duration,careAt:now+CROPS[crop].duration*.3,watered:false,tended:false});

test('fuel per field: 5% of the crop\'s usual market price, at least 2, in whole coins; quick crops stay at 2',()=>{
 assert.equal(TRACTOR_FUEL_BASE,12);assert.equal(TRACTOR_FUEL_PER_FIELD,2);assert.equal(TRACTOR_FUEL_SHARE,.05);
 const table={wheat:2,lettuce:2,corn:2,barley:3,greenbeans:4,apples:4,cabbage:4,berries:5,polebeans:6,cauliflower:7,ciderapples:7,cherries:9,pumpkin:10,redcabbage:14,sunflower:19,squash:22};
 assert.deepEqual(Object.keys(table).sort(),Object.keys(CROPS).sort(),'every crop is in the table the owner saw');
 for(const [crop,fuel] of Object.entries(table)){
  assert.equal(fieldFuel(crop),fuel,crop);
  assert.equal(fuel,Math.max(2,Math.round(marketQuote(crop,now).normal*.05)),`${crop}: the usual price, not today's`);
 }
 for(const day of [0,1,2,3,4,5,6])assert.equal(fieldFuel('sunflower'),19,'the same every day, whatever the market does');
 assert.equal(fieldFuel(null),2);assert.equal(fieldFuel('gold'),2);assert.equal(fieldFuel(undefined),2);
});

test('Plant pays for the crop it plants: 12 + its fuel on every field, and as many fields as the coins pay for with the seeds',()=>{
 const s=farm({coins:12+3*(seedCost(farm(),'sunflower')+19)});
 const q=tractorQuote(s,'plant','sunflower',now);
 assert.equal(q.count,3,'coins for three fields, seeds and fuel');assert.equal(q.fuel,12+3*19);assert.equal(q.total,12+3*(seedCost(s,'sunflower')+19));
 s.coins--;assert.equal(tractorQuote(s,'plant','sunflower',now).count,2,'one coin short of the third');
 const w=farm();assert.equal(tractorQuote(w,'plant','wheat',now).fuel,12+8*2,'wheat on 8 fields: as before');
 const r=applyFarmAction(s,{type:'tractor',mode:'plant',crop:'sunflower',expectedCost:12+2*(seedCost(s,'sunflower')+19)},now);
 assert.equal(r.count,2);assert.equal(r.fuel,12+2*19);assert.equal(r.cost,12+2*(seedCost(s,'sunflower')+19));
});

test('Water, Extra care and Harvest pay for the crop on each field: mixed fields add up field by field',()=>{
 const s=farm();ripe(s,0,'wheat');ripe(s,1,'sunflower');ripe(s,2,'pumpkin');ripe(s,3,'sunflower');
 const q=tractorQuote(s,'harvest','corn',now);
 assert.equal(q.count,4);assert.equal(q.fuel,12+2+19+10+19,'the selected crop (corn) plays no part');
 const coins=s.coins,r=applyFarmAction(s,{type:'tractor',mode:'harvest',crop:'corn',expectedCost:q.total},now);
 assert.equal(coins-s.coins,q.total);assert.equal(r.cost,q.total);
 const t=farm();growing(t,0,'barley');growing(t,1,'redcabbage');growing(t,2,'wheat');
 assert.equal(tractorQuote(t,'water','wheat',now).fuel,12+3+14+2);
 const later=now+CROPS.cabbage.duration*.35,c=farm();growing(c,0,'barley');growing(c,1,'cabbage');
 assert.equal(tractorQuote(c,'tend','wheat',later).fuel,12+3+4,'Extra care: barley and cabbage, both at their care moment');
});

test('the price on the tile is the most that is charged: a farm that changed asks to look again; an older page sends none',()=>{
 const s=farm();ripe(s,0,'sunflower');ripe(s,1,'sunflower');
 const shown=tractorQuote(s,'harvest','corn',now).total;ripe(s,2,'squash');   // a field ripened after the tile was drawn
 const before=structuredClone(s);
 assert.throws(()=>applyFarmAction(s,{type:'tractor',mode:'harvest',crop:'corn',expectedCost:shown},now),/The price has changed\. Review the current price\./);
 assert.deepEqual(s.plots,before.plots);assert.equal(s.coins,before.coins,'nothing charged, nothing harvested');
 assert.throws(()=>applyFarmAction(s,{type:'tractor',mode:'harvest',crop:'corn',expectedCost:'12'},now),/The price has changed/,'only a whole number counts');
 const total=tractorQuote(s,'harvest','corn',now).total,coins=s.coins;
 applyFarmAction(s,{type:'tractor',mode:'harvest',crop:'corn',expectedCost:total+50},now);assert.equal(coins-s.coins,total,'cheaper than shown: the rules\' price');
 const old=farm();ripe(old,0,'sunflower');const oldCoins=old.coins;
 applyFarmAction(old,{type:'tractor',mode:'harvest',crop:'corn'},now);assert.equal(oldCoins-old.coins,12+19,'a page from before 17 Oct sends no price and pays the rules\' price');
});

test('the window, the wiki and the texts say the rule; the night shift and Full care stay diamonds without fuel',()=>{
 const ui=read('public/retention-ui.js');
 assert.match(ui,/Fuel: \$\{TRACTOR_FUEL_BASE\} coins a job \+ \$\{Math\.round\(TRACTOR_FUEL_SHARE\*100\)\}% of the crop's usual price per field, at least \$\{TRACTOR_FUEL_PER_FIELD\}\. <span>By hand is always free\.<\/span>/);
 assert.match(ui,/expectedCost:quotes\[mode\]\.total\},r=>`All done! The tractor worked \$\{r\.count\} fields · \$\{r\.cost\} coins spent\.`\)\.then\(r=>\{if\(!r\)renderUtility\(\);\}\);/,'a refused job shows the new price');
 const wiki=read('public/wiki-content.js');
 assert.match(wiki,/Fuel costs \$\{art\('coins'\)\}\$\{TRACTOR_FUEL_BASE\} a job, plus for every field \$\{Math\.round\(TRACTOR_FUEL_SHARE\*100\)\}% of what its crop usually sells for, at least \$\{TRACTOR_FUEL_PER_FIELD\} coins: wheat \$\{fieldFuel\('wheat'\)\}, pumpkin \$\{fieldFuel\('pumpkin'\)\}, sunflower \$\{fieldFuel\('sunflower'\)\}\. Planting also pays the seeds\./);
 assert.doesNotMatch(ui+wiki,/TRACTOR_FUEL_PER_FIELD\} per field|plus \$\{art\('coins'\)\}\$\{TRACTOR_FUEL_PER_FIELD\} for every field/,'nothing says 2 a field for every crop any more');
 for(const code of ['nl','de','fr','tr','ja','ar','zh']){
  const t=JSON.parse(read(`public/i18n/${code}.json`));
  const foot=t["Fuel: {0} coins a job + {1}% of the crop's usual price per field, at least {2}."];assert.ok(foot,code);assert.match(foot,/\{0\}[^]*\{1\}[^]*\{2\}/);
  assert.ok(t['{0} a job, plus for every field {1}% of what its crop usually sells for, at least {2} coins: wheat {3}, pumpkin {4}, sunflower {5}. Planting also pays the seeds.'],code);
 }
 const rules=read('game/farm-state.js'),shiftRound=rules.slice(rules.indexOf('function shiftRound('),rules.indexOf('export function settleShift('));
 assert.doesNotMatch(shiftRound,/fieldFuel|TRACTOR_FUEL/,'the night shift burns no fuel');
 assert.doesNotMatch(rules.slice(rules.indexOf('export function fullCare('),rules.indexOf('export const SHIFT_MS')),/fieldFuel|TRACTOR_FUEL/,'Full care neither');
});
