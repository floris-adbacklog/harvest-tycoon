import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction,normalizeFarm,CROPS,xpForLevel,utcDay,FULL_CARE_COST,SHIFT_MS,SHIFT_ROUND_MS,SHIFT_ROUNDS,SHIFT_COINS_PER_DIAMOND,SHIFT_MIN_PER_FIELD,NO_EVENT_ACTIONS,
 fullCareQuote,nightShiftQuote,shiftForecast,marketQuote,seedCost,cropDuration} from '../game/farm-state.js';
import {welcomeSummary} from '../supabase/functions/farm-api/welcome-service.js';
import {readyCrops} from '../supabase/functions/notify-hourly/rules.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const HOUR=3600000,now=Date.UTC(2026,9,4,20);
const apply=(s,a,t=now)=>applyFarmAction(s,a,t);
// A farm past the tractor (level 18), every field empty, coins and diamonds to spend.
function farm(t=now){
 const s=createFarm(t);s.xp=xpForLevel(22);s.coins=50000;s.diamonds=1000;s.rookieUntil=0;
 for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0});
 return normalizeFarm(s,t);
}
const shift=(s,crop='corn',t=now)=>apply(s,{type:'tractor_shift',crop,expectedCost:nightShiftQuote(s,crop,t).cost},t);
const counters=s=>({harvested:s.stats.harvested,planted:s.stats.planted,watered:s.stats.watered,tended:s.stats.tended,corn:s.stats.harvest_corn,tractor:s.stats.tractor,mastery:s.mastery.harvests.corn,xp:s.xp});

test('Full care: water and extra care for every growing crop at once, 2 diamonds a crop, counted nowhere but its own counter',()=>{
 const s=farm();for(const id of [0,1,2])apply(s,{type:'field',id,action:'plant',crop:'corn'});
 apply(s,{type:'field',id:1,action:'water'});s.plots[2].readyAt=now-1;   // field 2 is ripe: skipped
 const before=counters(s),diamonds=s.diamonds,spent=s.stats.diamonds_spent,quote=fullCareQuote(s,now);
 assert.deepEqual(quote.ids,[0,1]);assert.equal(quote.cost,2*FULL_CARE_COST);
 assert.throws(()=>apply(s,{type:'tractor_care',expectedCost:quote.cost+2}),/Review the price/,'a price that changed is never charged');
 const left0=s.plots[0].readyAt-now,left1=s.plots[1].readyAt-now;
 const r=apply(s,{type:'tractor_care',expectedCost:quote.cost});
 assert.deepEqual(r,{count:2,cost:4});assert.equal(s.diamonds,diamonds-4);assert.equal(s.stats.diamonds_spent,spent+4);
 assert.ok(s.plots[0].watered&&s.plots[0].tended&&s.plots[1].tended);
 assert.ok(Math.abs((s.plots[0].readyAt-now)-left0*.8*.85)<1,'water then care on what is left');assert.ok(Math.abs((s.plots[1].readyAt-now)-left1*.85)<1);
 assert.deepEqual(counters(s),before,'no water, care, harvest or tractor counts, no XP');assert.equal(s.stats.full_care,2);
 const t=s.plots[0].readyAt+1,harvest=apply(s,{type:'field',id:0,action:'harvest'},t);
 assert.equal(harvest.quantity,3);assert.equal(harvest.xp,CROPS.corn.xp*2,'the harvest gives three times the crop and double XP');
 assert.throws(()=>apply(s,{type:'tractor_care',expectedCost:2},t),/No growing crops/);
 s.diamonds=1;apply(s,{type:'field',id:0,action:'plant',crop:'corn'},t);assert.throws(()=>apply(s,{type:'tractor_care',expectedCost:2},t),/You need 2 diamonds/);
});

test('the night shift costs what it brings in with the chosen crop: 1 diamond per 250 coins of crops, at least 1 a field; one a day',()=>{
 const start=Date.UTC(2026,9,4,2),s=farm(start),fields=s.plots.length;
 const corn=nightShiftQuote(s,'corn',start),barley=nightShiftQuote(s,'barley',start),pumpkin=nightShiftQuote(s,'pumpkin',start),sunflower=nightShiftQuote(s,'sunflower',start);
 for(const [q,crop] of [[corn,'corn'],[barley,'barley'],[pumpkin,'pumpkin']]){
  const f=q.forecast,value=Object.entries(f.items).reduce((sum,[k,n])=>sum+marketQuote(k,start).price*n,0)-f.seeds;
  assert.equal(q.cost,Math.max(fields*SHIFT_MIN_PER_FIELD,Math.ceil(value/SHIFT_COINS_PER_DIAMOND)),crop);
 }
 assert.equal(corn.perField,8,'corn (15 minutes) is harvested in every one of the 8 hourly rounds');assert.equal(pumpkin.perField,1,'pumpkin (8 hours) once');
 assert.ok(barley.cost>corn.cost,'barley brings in more than corn in the same rounds, so it costs more');
 assert.equal(sunflower.forecast.tooSlow,true);assert.equal(sunflower.cost,fields*SHIFT_MIN_PER_FIELD,'a crop slower than the shift: only planted and cared for, at the lowest price');
 const diamonds=s.diamonds,r=apply(s,{type:'tractor_shift',crop:'corn',expectedCost:corn.cost},start);
 assert.equal(r.cost,corn.cost);assert.equal(s.diamonds,diamonds-corn.cost);assert.equal(r.endsAt,start+SHIFT_MS);assert.equal(r.planted,fields,'the first round plants every empty field at once');
 assert.ok(s.plots.every(p=>p.crop==='corn'&&p.watered),'and waters them');
 assert.throws(()=>apply(s,{type:'tractor_shift',crop:'corn',expectedCost:999},start+3600000),/already running/);
 assert.throws(()=>apply(s,{type:'tractor_shift',crop:'corn',expectedCost:999},start+SHIFT_MS+3600000),/One night shift a day/,'still the same day (UTC)');
 const tomorrow=Date.UTC(2026,9,5,21),q=nightShiftQuote(s,'corn',tomorrow);
 assert.throws(()=>apply(s,{type:'tractor_shift',crop:'corn',expectedCost:q.cost-1},tomorrow),/price has changed/,'never more than the price shown');
 const before=s.diamonds;apply(s,{type:'tractor_shift',crop:'corn',expectedCost:q.cost+5},tomorrow);assert.equal(s.diamonds,before-q.cost,'a lower price on the server is what is charged');
 assert.equal(s.tractorShift.day,utcDay(tomorrow));assert.equal(SHIFT_ROUNDS,8);
 const forecast=shiftForecast(farm(start),'corn',start),real=farm(start);shift(real,'corn',start);normalizeFarm(real,start+SHIFT_MS);
 assert.deepEqual(forecast.items,real.tractorShift.log.items,'the forecast is the shift itself, worked out ahead');
});

test('the night shift harvests, replants, waters and cares while the farmer is away; its harvests give no XP and count nowhere',()=>{
 const s=farm();shift(s);
 const before=counters(s),coins=s.coins,corn=s.inventory.corn,fields=s.plots.length;
 const end=now+SHIFT_MS+5*HOUR;normalizeFarm(s,end);
 assert.equal(s.tractorShift.done,SHIFT_ROUNDS+1,'nine rounds: at the start and on every hour after it');
 const harvests=s.tractorShift.log.rounds.reduce((a,b)=>a+b,0);
 assert.ok(harvests>=fields,'corn ripens within the night: every field harvested at least once');
 assert.equal(s.inventory.corn-corn,s.tractorShift.log.items.corn);assert.ok(s.tractorShift.log.items.corn>=harvests*2,'watered (and cared) crops: 2 or 3 each');
 assert.ok(s.coins<coins,'replanting pays the seeds');
 assert.deepEqual(counters(s),before,'no harvest, plant, water, care, tractor or medal counts, and no XP');
 assert.equal(s.stats.shift_harvests,harvests);
 normalizeFarm(s,end+10*HOUR);assert.equal(s.tractorShift.done,SHIFT_ROUNDS+1,'nothing after the shift ends');
});

test('the shift gives the same farm whenever and however often it is worked out (every action and load settles it first)',()=>{
 const a=farm(),b=farm();
 for(const s of [a,b])shift(s,'wheat');
 for(let t=now;t<=now+SHIFT_MS+HOUR;t+=7*60000)normalizeFarm(a,t);
 normalizeFarm(b,now+SHIFT_MS+HOUR);
 assert.deepEqual(a.plots,b.plots);assert.deepEqual(a.inventory,b.inventory);assert.equal(a.coins,b.coins);assert.deepEqual(a.tractorShift,b.tractorShift);
});

test('the shift stops planting when the coins run out, keeps harvesting, and regrows trees and bushes',()=>{
 const s=farm();s.coins=seedCost(s,'corn')*2;
 shift(s);
 assert.equal(s.plots.filter(p=>p.crop).length,2,'two seeds paid, the rest stays empty');assert.ok(s.coins<seedCost(s,'corn'));
 const berries=farm();berries.xp=xpForLevel(60);normalizeFarm(berries,now);
 const perennial=Object.keys(CROPS).find(k=>CROPS[k].perennial);
 Object.assign(berries.plots[0],{crop:perennial,plantedAt:now-HOUR,readyAt:now-1,careAt:now-HOUR,watered:true,tended:true,harvestCycles:0});
 shift(berries);
 assert.equal(berries.plots[0].crop,perennial,'picked and growing again');assert.equal(berries.plots[0].harvestCycles,1);
 assert.equal(berries.plots[0].readyAt>now,true);assert.equal(berries.plots[0].plantedAt,now);
 assert.ok(Math.abs(berries.plots[0].readyAt-now-cropDuration(berries,perennial,true,now)*.8)<1,'and watered right away');
});

test('diamond work is no event action, and its seeds are no "Spend coins" for challenges or events',()=>{
 assert.deepEqual([...NO_EVENT_ACTIONS].sort(),['tractor_care','tractor_shift']);
 assert.match(read('supabase/functions/farm-api/index.ts'),/eventAction:NO_EVENT_ACTIONS\.has\(body\.action\.type\)\?null:body\.action\.type/);
 const s=farm(),spent=s.stats.coins_spent??0;shift(s);
 assert.equal(s.stats.coins_spent??0,spent);
 const later=now+3*HOUR,coins=s.coins;apply(s,{type:'sell',item:'all'},later);
 assert.ok((s.stats.coins_spent??0)===spent,'the rounds worked out before a later action are no spend of that action either');void coins;
});

test('a broken saved shift is dropped; the tractor card, Welcome back, pushes and the wiki tell the farmer',()=>{
 for(const bad of [{day:'x'},{day:'2026-10-04',startedAt:now,endsAt:now+1,crop:'corn',done:0,log:{}},{day:'2026-10-04',startedAt:now,endsAt:now+SHIFT_MS,crop:'gold',done:0,log:{}},'yes',null]){
  const s=farm();s.tractorShift=bad;normalizeFarm(s,now);assert.equal(s.tractorShift,undefined,JSON.stringify(bad));
 }
 const s=farm();shift(s);normalizeFarm(s,now+SHIFT_MS);
 const seen=new Date(now+3*HOUR+60000).toISOString(),summary=welcomeSummary(s,seen,now+SHIFT_MS);
 const afterSeen=s.tractorShift.log.rounds.reduce((sum,n,k)=>now+k*SHIFT_ROUND_MS>Date.parse(seen)?sum+n:sum,0);
 assert.equal(summary.tractor,afterSeen,'Welcome back counts the fields harvested since the farmer was last here');
 assert.match(read('public/welcome-ui.js'),/'harvest':'harvests'\} by the tractor/);
 const raw={plots:[{crop:'corn',readyAt:now-1}],tractorShift:{endsAt:now+HOUR}};
 assert.deepEqual(readyCrops(raw,now),[],'no "crops ready" push while the tractor will harvest them');assert.equal(readyCrops({...raw,tractorShift:null},now).length,1);
 const ui=read('public/retention-ui.js');
 assert.match(ui,/The tractor's diamond work counts for no challenges, events or leaderboards\. What it brings in is yours, like any crop\./);assert.match(ui,/data-tractor-care/);assert.match(ui,/data-tractor-shift/);
 assert.match(ui,/if\(cost>=150&&!await confirmDiamondSpend/,'150 diamonds or more asks first');assert.match(ui,/window\.harvestShop\?\.open\(\)/,'short of diamonds: to the packs');
 const wiki=read('public/wiki-content.js');assert.match(wiki,/The tractor's diamond work counts for no challenges, events or leaderboards\./);assert.match(wiki,/Selling or using them later counts like any crop you sell or use\./);assert.match(wiki,/1 diamond for every \$\{SHIFT_COINS_PER_DIAMOND\} coins of crops/);assert.match(ui,/Night shift price: 1 diamond for every \$\{SHIFT_COINS_PER_DIAMOND\} coins of crops it brings in\./);
});

test('Extra care for coins: the tractor gives care to every crop whose care moment has come, like by hand, and it counts like hand work',()=>{
 const s=farm();for(const id of [0,1,2])apply(s,{type:'field',id,action:'plant',crop:'cabbage'});apply(s,{type:'field',id:3,action:'plant',crop:'corn'});
 assert.throws(()=>apply(s,{type:'tractor',mode:'tend'}),/No crops are ready for extra care yet/,'not before the care moment');
 const t=now+40*60000,tended=s.stats.tended,tractor=s.stats.tractor,coins=s.coins;
 const r=apply(s,{type:'tractor',mode:'tend'},t);
 assert.equal(r.count,3,'the three cabbages; the corn is ripe by then and waits for its harvest');assert.equal(coins-s.coins,12+2*3);
 assert.equal(s.stats.tended,tended+3);assert.equal(s.stats.tractor,tractor+1,'a coin job, so it counts like the others');
 assert.ok([0,1,2].every(id=>s.plots[id].tended));
 assert.match(read('public/retention-ui.js'),/\['tend','care','Give extra care'\]/);
});

test('news from a level: the admin picks "From level", the database shows it only from that level and counts it unread only there',()=>{
 const sql=read('supabase/news-min-level.sql'),admin=read('src/admin-dashboard.js'),client=read('src/chat-client.js');
 assert.match(sql,/add column if not exists min_level integer/);
 assert.match(sql,/player_id is null and \(min_level is null or min_level<=\(select public\.notice_reader_level\(\)\)\)/,'the read policy hides news below the level');
 assert.match(sql,/n\.min_level is null or n\.min_level<=coalesce\(\(select ps\.level from public\.player_stats ps where ps\.player_id=me\),1\)/,'and the unread count leaves it out');
 assert.match(sql,/case when lvl>1 then lvl end\) returning id into news;/,'a pop-up\'s own notification takes the pop-up\'s level');
 assert.match(client,/p_min_level:minLevel/);assert.match(admin,/id="admin-news-level"/);assert.match(admin,/postNews\(body,hours,texts,newsLevel\(\)\)/);
});

test('the night shift price cannot be talked down: coins, what grows on the fields and boosts at the start do not change it',()=>{
 const s=farm(),honest=nightShiftQuote(s,'barley',now).cost;
 s.coins=1;assert.equal(nightShiftQuote(s,'barley',now).cost,honest,'no coins for seeds');s.coins=50000;
 for(const p of s.plots)Object.assign(p,{crop:'sunflower',plantedAt:now,readyAt:now+86400000,careAt:now+30000000,watered:false,tended:false});
 assert.equal(nightShiftQuote(s,'barley',now).cost,honest,'fields full of slow crops');
 for(const p of s.plots)Object.assign(p,{readyAt:now-1});assert.equal(nightShiftQuote(s,'wheat',now).cost,nightShiftQuote(farm(),'wheat',now).cost,'ripe crops already there are not charged for');
 s.boosts.harvestUntil=now+86400000;assert.equal(nightShiftQuote(s,'barley',now).cost,honest,'a running Double harvest');
 const ui=read('public/retention-ui.js');
 assert.match(ui,/data-tractor-shift data-cost="\$\{shift\.cost\}"/);assert.match(ui,/if\(q\.cost>shown\)\{notify\('The price has changed\. Review the current price\.'\)/,'what is sent is the price that was shown');
 assert.match(ui,/settleShift\(state,farmNow\(\)\);onChange\(\);refresh\(\);/,'rounds that come due while the game is open are worked out there too');
 assert.match(read('supabase/tractor-shift-pushes.sql'),/''tractorShift'', f\.state -> ''tractorShift''/,'the hourly job sees the shift');
 assert.deepEqual(readyCrops({plots:[{crop:'corn',readyAt:now-1}],tractorShift:{endsAt:now-3600000,done:5}},now),[],'a finished shift not saved yet: no push for half a day');
 assert.equal(readyCrops({plots:[{crop:'corn',readyAt:now-1}],tractorShift:{endsAt:now-3600000,done:9}},now).length,1);
});
