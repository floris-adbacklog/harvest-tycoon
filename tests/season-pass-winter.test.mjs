// The Winter 2026 Season Pass and its pre-sale (21 Oct 2026, the owner: "maak winterpass en zet hem alvast helemaal onder herfst pass dat
// die eraan komt, je kan hem al kopen, start na 22 dec"): the rules (game/farm-state.js WINTER_2026), the sale (game/payments.js), the
// database file (supabase/season-pass-winter.sql) and the window (public/season-ui.js). Autumn runs with its shipped start (21 Oct).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as G from '../game/farm-state.js';
import * as P from '../game/payments.js';
import * as F from '../game/farmer-parts.js';
import {WINTER_SQL,WINTER_LIVE_MD5,SQL as ENGINE_SQL} from '../scripts/season-pass-sql.mjs';
import {seasonCheckoutText} from '../supabase/functions/diamond-checkout/checkout-session.js';

const {createFarm,normalizeFarm,applyFarmAction,xpForLevel,seasonById,seasonView,seasonPhase,seasonTotals,currentSeason,seasonUpcoming,seasonComing,SEASON_LOOKS,CROPS,ITEMS}=G;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const H=3600000,D=24*H,W='winter-2026',A='autumn-2026';
const START=Date.UTC(2026,11,22);   // 22 December 00:00 UTC: Winter opens, Autumn's collecting week begins
const W_=()=>seasonById(W),A_=()=>seasonById(A);
const at=(month,day,hour=12,year=2026)=>Date.UTC(year,month-1,day,hour);
function farm(level=40,now=at(11,9)){const s=createFarm(now-3*D);s.xp=xpForLevel(level)+5;return normalizeFarm(s,now);}
const buy=(s,id=W)=>{s.passPremium=[...new Set([...(s.passPremium??[]),id])];return s;};

test('Winter 2026: 100 tiers mirroring Autumn: 1,500 paid and 200 free diamonds, more than 8,800 in shop value, its looks once each',()=>{
 const w=W_(),t=seasonTotals(w);
 assert.equal(w.tiers.length,100);
 assert.deepEqual({diamonds:t.diamonds,free:t.freeDiamonds,vip:t.vipDays,farmhand:t.farmhandDays,boosts:t.boosts,avatars:t.avatars,looks:t.otherLooks,parts:t.farmerParts},
  {diamonds:1500,free:200,vip:21,farmhand:6,boosts:17,avatars:2,looks:10,parts:3});
 assert.ok(t.shop>8800,`the value line's "more than 8,800 diamonds": ${t.shop}`);
 assert.equal(w.perTier,125,'1.4 × 89 days, rounded to 5');
 assert.deepEqual([w.startsAt,w.endsAt,w.claimUntil],[START,Date.UTC(2027,2,21),Date.UTC(2027,2,28)]);
 assert.equal(A_().endsAt,w.startsAt,'the seasons follow each other: Winter starts the moment Autumn ends');
 for(const [i,x] of w.tiers.entries()){
  assert.ok(Object.keys(x.paid).length&&Object.keys(x.free).length,`tier ${i+1} has both`);
  const diamonds=(x.free.diamonds??0)+(x.paid.diamonds??0);
  assert.ok(diamonds<=G.SEASON_MAX_TIER_DIAMONDS,`tier ${i+1}: a skip never pays`);
  if(x.free.vipDays||x.paid.vipDays)assert.equal(diamonds,0,`tier ${i+1}: VIP never beside diamonds`);
  for(const r of [x.free,x.paid])for(const key of Object.keys(r.items??{}))assert.ok(ITEMS[key],`tier ${i+1}: ${key} is a good of the game`);
 }
 const looks=track=>w.tiers.flatMap(x=>x[track].looks??[]);
 assert.deepEqual([...looks('free'),...looks('paid')].sort(),Object.keys(SEASON_LOOKS).filter(id=>SEASON_LOOKS[id].season===W).sort(),'every Winter look, once');
 assert.deepEqual(w.tiers[0].paid,{looks:['season-winter-2026-cocoa-maker'],purchase:true},'the Cocoa maker comes with the purchase');
 assert.deepEqual(w.tiers[24].free.looks,['season-winter-2026-snow-farmhand']);
 assert.deepEqual(w.tiers[49].free.looks,['winter-2026-badge']);
 assert.deepEqual(w.tiers[99].paid.looks,['season-winter-2026-frost-royal','winter-2026-golden-sledge']);
 assert.equal(w.tiers.reduce((n,x)=>n+(x.free.seeds?.sprouts??0),0),13);assert.equal(w.tiers.reduce((n,x)=>n+(x.paid.seeds?.sprouts??0),0),30);
 for(const look of Object.values(SEASON_LOOKS).filter(l=>l.season===W)){
  assert.ok(!/ · |christmas|santa|xmas/i.test(look.name),look.name);
  if(look.color)assert.ok(['#1f5877','#2b5e32','#5b4520'].includes(look.color),`${look.name}: the game's own button colours`);
 }
 assert.equal(SEASON_LOOKS['winter-2026-emblem'].emblem,'101');assert.equal(G.FAMILY_EMBLEMS[101].icon,'emblem-winter');
 // The double days: New Year (two days inside a week) and the final two days; the weeks' goals are things every level from 10 can do.
 assert.deepEqual(w.doubles.map(d=>[d.from,d.to]),[[Date.UTC(2026,11,31),Date.UTC(2027,0,2)]]);
 assert.equal(w.weeks.at(-1).double,true);assert.equal(w.weeks.at(-1).from,Date.UTC(2027,2,19));
 for(const wk of w.weeks)if(wk.goal)assert.ok(Object.hasOwn(G.SEASON_GOAL_COUNTS,wk.goal.kind),wk.name);
});

test('farmer parts in the pass: the penguin suit, black beanie, ski goggles, a coat and gloves; nothing of Christmas; each only through Winter',()=>{
 const parts=track=>W_().tiers.flatMap((x,i)=>(x[track].farmer??[]).map(id=>[i+1,id]));
 assert.deepEqual(parts('free'),[[10,'hat_006'],[62,'gloves_011']]);
 assert.deepEqual(parts('paid'),[[29,'glasses_013'],[49,'outwear_021'],[79,'costume_2']]);
 assert.deepEqual(Object.keys(F.FARMER_PASS_PARTS).sort(),[...parts('free'),...parts('paid')].map(p=>p[1]).sort());
 for(const id of ['hat_015','costume_5','hat_029','gloves_014','outwear_052'])assert.ok(!Object.hasOwn(F.FARMER_PASS_PARTS,id),`${id}: kept for a Christmas Pass`);
 for(const id of Object.keys(F.FARMER_PASS_PARTS))assert.equal(F.FARMER_REWARDS[id],undefined,`${id} has no other goal`);
});

test('the phases around 22 December, both sides of midnight: Autumn open, then Winter open with Autumn\'s collecting week',()=>{
 const before=START-1,after=START;
 assert.equal(seasonPhase(W_(),START-3*D-1),'off');assert.equal(seasonPhase(W_(),START-3*D),'soon');
 assert.equal(seasonPhase(W_(),before),'soon');assert.equal(seasonPhase(A_(),before),'open');
 assert.equal(currentSeason(before).id,A,'21 Dec 23:59:59.999: still Autumn');assert.equal(seasonUpcoming(before)?.id,W,'Winter below it');
 assert.equal(seasonPhase(W_(),after),'open');assert.equal(seasonPhase(A_(),after),'claim');
 assert.equal(currentSeason(after).id,W,'22 Dec 00:00: Winter');assert.equal(seasonUpcoming(after),null,'nothing below it any more');
 assert.equal(seasonUpcoming(at(10,21,1)).id,W,'the pre-sale shows from the Autumn start');
 // A farm across midnight: its Autumn count moves to the last-season strip, a fresh Winter count starts.
 const s=farm(40,before-H);s.season.points=65*20;normalizeFarm(s,before);
 assert.equal(s.season.id,A);
 normalizeFarm(s,after+1);
 assert.equal(s.season.id,W);assert.equal(s.season.points,0);assert.equal(s.seasonPrev.id,A);assert.equal(s.seasonPrev.points,65*20,'Autumn stood still at midnight');
 const v=seasonView(s,after+1);assert.equal(v.season.id,W);assert.equal(v.prev.season.id,A);assert.ok(v.prev.waiting>0);
 normalizeFarm(s,Date.UTC(2026,11,29));assert.equal(s.seasonPrev,undefined,'the strip goes when Autumn\'s week ends');
 // Points before the start never count for Winter.
 const early=buy(farm(40,at(12,10)));early.login.visits+=5;normalizeFarm(early,at(12,21,23));
 assert.equal(early.season.id,A);normalizeFarm(early,after+H);assert.equal(early.season.points,0,'nothing carried into Winter');
});

test('the pre-sale: Winter bought while Autumn runs gives the Cocoa maker at once and nothing else; its paid row opens on 22 December',()=>{
 const now=at(11,10),s=buy(farm(40,now));
 assert.equal(G.seasonPremium(s,W),true);assert.equal(G.seasonPremium(s,A),false,'Winter bought is not Autumn bought');
 assert.equal(G.ownsLook(s,'season-winter-2026-cocoa-maker'),true,'the Cocoa maker is yours the moment you buy');
 assert.equal(s.season.id,A,'the window still shows Autumn');
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:3,season:W},now),/not open yet/);
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:3},now),/Unlock the paid rewards first/,'Autumn\'s paid row stays closed');
 const c=seasonComing(s,now);assert.equal(c.season.id,W);assert.equal(c.premium,true);assert.equal(c.canBuy,true);
 assert.equal(seasonComing(farm(19,now),now).canBuy,false,'for sale from level 20');assert.equal(seasonComing(farm(9,now),now),null,'below level 10 no window');
 // On 22 December: the Winter paid row is open from tier 1 on.
 s.season.points=0;normalizeFarm(s,START+H);s.season.points=125*5;normalizeFarm(s,START+2*H);
 const d=s.diamonds;applyFarmAction(s,{type:'season_claim',track:'paid',tier:3},START+3*H);assert.equal(s.diamonds,d+50);
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:1},START+3*H),/came with your Season Pass/);
});

test('two seasons owned at once: Autumn and Winter each their own paid row; from 22 December Autumn is collected from its strip',()=>{
 const now=at(12,15),s=buy(buy(farm(40,now),A),W);s.season.points=65*10;normalizeFarm(s,now);
 applyFarmAction(s,{type:'season_claim',track:'paid',tier:3},now);
 for(const id of ['season-autumn-2026-harvest-chef','season-winter-2026-cocoa-maker'])assert.ok(G.ownsLook(s,id),id);
 normalizeFarm(s,START+H);s.season.points=125*12;normalizeFarm(s,START+2*H);
 // Winter's paid tier 10 (50 diamonds) and Autumn's paid tier 6 (from the strip, by its id).
 const d=s.diamonds;
 applyFarmAction(s,{type:'season_claim',track:'paid',tier:10},START+3*H);assert.equal(s.diamonds,d+50);assert.deepEqual(s.season.paid,[10]);
 applyFarmAction(s,{type:'season_claim',track:'paid',tier:6,season:A},START+3*H);assert.equal(s.diamonds,d+100);assert.deepEqual(s.seasonPrev.paid,[3,6]);
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:6,season:A},START+3*H),/already collected/);
 // Refunding one never touches the other.
 s.passPremium=s.passPremium.filter(id=>id!==A);normalizeFarm(s,START+4*H);
 assert.equal(s.seasonPrev.refunded,true);assert.deepEqual(s.season.paid,[10],'Winter\'s paid row stays');assert.equal(G.seasonPremium(s,W),true);
});

test('a pre-sale refund before the start: the Cocoa maker goes, nothing else to take back, Autumn untouched; after the start, the usual refund',()=>{
 const now=at(11,20),s=buy(buy(farm(40,now),A),W);s.season.points=65*5;normalizeFarm(s,now);
 applyFarmAction(s,{type:'season_claim',track:'paid',tier:3},now);const d=s.diamonds;
 s.passPremium=s.passPremium.filter(id=>id!==W);normalizeFarm(s,now+1);
 assert.equal(G.ownsLook(s,'season-winter-2026-cocoa-maker'),false);assert.equal(s.diamonds,d,'no diamonds taken: Winter gave none yet');
 assert.deepEqual(s.season.paid,[3]);assert.equal(s.season.refunded,undefined,'Autumn as it was');
 // The database takes the avatar off the card (the refund trigger reads harvest_season_paid_looks): the Cocoa maker is in Winter's list.
 assert.match(WINTER_SQL,/when 'winter-2026' then array\['season-winter-2026-cocoa-maker',/);
 // After the start: the paid diamonds collected go back, the paid parts for the farmer too, the free ones stay.
 const t=buy(farm(40,START+H),W);t.season.points=125*30;normalizeFarm(t,START+2*H);
 for(const tier of [3,29])applyFarmAction(t,{type:'season_claim',track:'paid',tier},START+3*H);
 applyFarmAction(t,{type:'season_claim',track:'free',tier:10},START+3*H);
 assert.deepEqual(t.farmerParts.sort(),['glasses_013','hat_006']);
 t.passPremium=[];normalizeFarm(t,START+4*H);
 assert.deepEqual(t.farmerParts,['hat_006'],'the paid goggles go, the free beanie stays');assert.deepEqual(t.season.paid,[]);
});

test('Brussels sprouts: a seed packet plants one field, only while Winter runs; no medal or sharing; 400 coins; packets keep',()=>{
 assert.ok(!Object.keys(CROPS).includes('sprouts'),'not in any list made from CROPS');
 assert.equal(CROPS.sprouts.model,'plant_004');assert.equal(CROPS.sprouts.season,'winter');assert.ok(CROPS.sprouts.tint);assert.ok(ITEMS.sprouts);
 assert.equal(CROPS.sprouts.name,'Brussels sprouts');assert.equal(G.cropUnlocked(farm(90),'sprouts'),false);
 const s=farm(40,START+H),plant=(id,t)=>applyFarmAction(s,{type:'field',id,action:'plant',crop:'sprouts'},t);
 for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0});
 s.seasonSeeds={sprouts:2,cranberries:4};
 assert.throws(()=>plant(0,START-H),/only grows in its season/,'not before 22 December');
 assert.throws(()=>applyFarmAction(s,{type:'field',id:0,action:'plant',crop:'cranberries'},START+H),/only grows in its season/,'cranberries not in winter');
 plant(0,START+H);assert.equal(s.seasonSeeds.sprouts,1);assert.equal(s.plots[0].crop,'sprouts');
 applyFarmAction(s,{type:'field',id:0,action:'harvest'},START+6*H);assert.equal(s.plots[0].crop,null);assert.equal(s.stats.season_crop_harvests,1);
 assert.equal(s.mastery.harvests.sprouts,undefined);assert.equal(G.marketQuote('sprouts',START).price,400);
 assert.throws(()=>plant(1,Date.UTC(2027,2,21)),/only grows in its season/,'not after 20 March');
 normalizeFarm(s,Date.UTC(2027,5,1));assert.deepEqual(s.seasonSeeds,{sprouts:1,cranberries:4},'packets keep until next winter (and autumn)');
 for(let week=0;week<100;week++)assert.ok(!JSON.stringify(G.familyOrder(`f${week}`,week,5)).includes('sprouts'));
 // The Sprout week's goal counts a field of sprouts twice.
 assert.equal(G.SEASON_GOAL_COUNTS.sprouts({stats:{harvested:10,season_crop_harvests:3}}),13);
});

test('snowflakes: the same actions and cap; New Year and the last two days count double, the cap too',()=>{
 const s=farm(40,at(12,30,1));normalizeFarm(s,at(12,30,2));
 s.login.visits++;normalizeFarm(s,at(12,30,3));assert.equal(s.season.points,30,'30 snowflakes for a gift on 30 Dec');
 s.login.visits++;normalizeFarm(s,at(12,31,3));assert.equal(s.season.points,90,'doubled on 31 Dec');
 s.stats.fish=(s.stats.fish??0)+300;normalizeFarm(s,at(12,31,4));assert.equal(s.season.today,500,'the cap doubled');
 const v=seasonView(s,at(1,1,10,2027));assert.equal(v.double,true);assert.equal(v.cap,500);assert.equal(v.doubleDay.name,'New Year');assert.equal(v.week.name,'New Year week');
 assert.equal(seasonView(s,at(1,2,10,2027)).double,false,'over on 2 January');
 assert.equal(seasonView(s,at(3,19,10,2027)).cap,500);assert.equal(seasonView(s,at(3,19,10,2027)).doubleDay,null,'the final days are a double week');
});

test('the sale: Autumn and Winter on sale together, each checkout names its season and the row keeps it; Apple off; no offer in Winter\'s first week',()=>{
 const now=at(11,10);
 assert.deepEqual(P.seasonsOnSale(now).map(s=>s.id),[A,W],'the pre-sale beside the open season');
 assert.equal(P.seasonOnSale(now).id,A,'the open one stays Autumn (a page from before buys Autumn)');
 assert.equal(P.seasonForCheckout(undefined,now)?.id??P.seasonForCheckout(null,now).id,A);
 assert.equal(P.seasonForCheckout(W,now).id,W);assert.equal(P.seasonForCheckout(A,now).id,A);
 assert.equal(P.seasonForCheckout('summer-1999',now),null);assert.equal(P.seasonForCheckout(42,now),null);
 assert.equal(P.seasonCheckoutProblem({level:20,now,season:W}),null);
 assert.equal(P.seasonCheckoutProblem({level:19,now,season:W}).status,409);
 assert.deepEqual(P.seasonCheckoutProblem({level:40,now,season:W,owned:true}),{error:'You already have the Season Pass for this season.',status:409});
 assert.equal(P.seasonCheckoutProblem({level:40,now:START,season:A}).status,409,'Autumn not after its end');
 assert.equal(P.seasonCheckoutProblem({level:40,now:START,season:W}),null);assert.equal(P.seasonOnSale(START).id,W);
 assert.equal(P.seasonCheckoutProblem({level:40,now:Date.UTC(2027,2,21),season:W}).status,409);
 // The dates are the game's.
 for(const s of P.SEASON_SALE.seasons){const g=seasonById(s.id);assert.deepEqual([s.startsAt,s.endsAt,s.claimUntil,s.saleFrom??null],[g.startsAt,g.endsAt,g.claimUntil,g.saleFrom??null],s.id);}
 // One store product for every season; a purchase row of either season passes every store's check.
 const row={id:'00000000-0000-4000-8000-000000000001',pack:'season',pass_id:W,diamonds:0,coins:0,amount_cents:1999,player_id:'p',store:'kongregate',price_id:'season_pass'};
 assert.deepEqual(P.checkKongPurchase(row,{product:'season_pass',player:'p'}),{product:'season_pass'});
 assert.equal(P.appleProduct('season'),null,'the iPhone app sells no Season Pass');assert.equal(P.APPLE_SELLS_SEASON_PASS,false);
 assert.equal(P.offerPausedForSeason(START+6*D),false,'no pause since 22 Oct 2026');assert.equal(P.offerPausedForSeason(START+7*D),false);
 assert.equal(P.offerPausedForSeason(at(12,10)),false,'the pre-sale pauses nothing');
 // diamond-checkout: the season the page names, on sale now, into the row; the catalogue lists both with their starts.
 const checkout=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(checkout,/const open=seasonForCheckout\(body\.season\?\?null\);/);
 assert.match(checkout,/seasonCheckoutProblem\(\{level:level\.data\?\.level\?\?1,owned:Boolean\(owned\.data\?\.length\)\|\|inFarm,season:open\.id\}\)/);
 assert.match(checkout,/pack=\{id:'season',cents:SEASON_SALE\.cents,price:SEASON_SALE\.price,product:SEASON_SALE\.product,diamonds:0,coins:0,passId:open\.id\};/);
 assert.match(checkout,/eq\('pack','season'\)\.eq\('pass_id',open\.id\)/,'owned: a paid row of that season');
 assert.match(checkout,/const seasons=seasonsOnSale\(\)\.map\(s=>\(\{id:s\.id,cents:SEASON_SALE\.cents,level:SEASON_SALE\.level,startsAt:s\.startsAt,endsAt:s\.endsAt,ready:seasonReady\}\)\);/);
 assert.match(checkout,/custom_text:\{submit:\{message:seasonCheckoutText\(seasonSale\(row\.pass_id\),body\.language\)\}\}/,'the Stripe page names the season');
 // Every page's checkout sends the season: the website, the apps' stores and Kongregate.
 assert.match(read('src/main.js'),/bridge\.checkout=async\(pack,requestId,offerId,\{season\}=\{\}\)=>/);
 assert.match(read('src/main.js'),/const storeCheckout=async\(pack,offerId,season\)=>\{\n\s+const made=await bridge\.payments\(\{operation:'create',pack,requestId:crypto\.randomUUID\(\),\.\.\.\(offerId\?\{offerId\}:\{\}\),\.\.\.\(season\?\{season\}:\{\}\)\}\);/);
 assert.match(read('src/kongregate-kreds.js'),/bridge\.checkout=async\(pack,_requestId,offerId,\{season\}=\{\}\)=>\{/);
 assert.match(read('public/season-ui.js'),/await bridge\(\)\.checkout\('season',requestIds\[id\],undefined,\{season:id\}\)/);
});

test('the Stripe page names the season in the game\'s language, and when a season bought ahead starts',()=>{
 const w=P.seasonSale(W),now=at(11,1);
 assert.equal(seasonCheckoutText(w,'en',now),'Season Pass Winter 2026. It starts on 22 December 2026.');
 assert.equal(seasonCheckoutText(w,'nl',now),'Seizoenspas Winter 2026. Hij begint op 22 december 2026.');
 assert.equal(seasonCheckoutText(w,'xx',now),seasonCheckoutText(w,'en',now),'an unknown language: English');
 assert.equal(seasonCheckoutText(P.seasonSale(A),'de',now),'Saisonpass Herbst 2026.','a season already running: its name only');
 assert.equal(seasonCheckoutText(w,'en',START),'Season Pass Winter 2026.');
 assert.equal(seasonCheckoutText(null,'en',now),undefined);
 for(const lang of ['cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh'])assert.ok(!/\$\{|undefined| · /.test(seasonCheckoutText(w,lang,now)),lang);
});

test('supabase/season-pass-winter.sql is generated from the rules: both seasons, guarded by the live md5s, one transaction, closed to players',()=>{
 assert.equal(read('supabase/season-pass-winter.sql'),WINTER_SQL,'run node scripts/season-pass-sql.mjs');
 assert.equal(read('supabase/season-pass-engine.sql'),ENGINE_SQL,'the engine file stays as it ran (Autumn only)');
 assert.match(WINTER_SQL,/^begin;$/m);assert.match(WINTER_SQL,/^commit;$/m);
 // The season list equals the rules.
 const rows=[...WINTER_SQL.matchAll(/\('([a-z]+-\d{4})',timestamptz '([^']+)',timestamptz '([^']+)'\)/g)].map(m=>[m[1],Date.parse(m[2]),Date.parse(m[3])]);
 assert.deepEqual(rows,G.SEASON_IDS.map(id=>[id,seasonById(id).endsAt,seasonById(id).claimUntil]));
 for(const id of G.SEASON_IDS)for(const look of seasonById(id).tiers.flatMap(t=>t.paid.looks??[]))assert.ok(WINTER_SQL.includes(`'${look}'`),look);
 for(const [fn,md5] of Object.entries(WINTER_LIVE_MD5)){assert.match(md5,/^[0-9a-f]{32}$/);assert.ok(WINTER_SQL.includes(`('${fn}','${md5}')`),fn);}
 assert.deepEqual(Object.keys(WINTER_LIVE_MD5).sort(),['harvest_season_paid_looks(text)','harvest_season_refund()','harvest_season_target(text,jsonb)','harvest_seasons()']);
 assert.match(WINTER_SQL,/revoke all on function public\.harvest_seasons\(\), public\.harvest_season_paid_looks\(text\) from public, anon, authenticated;/);
 assert.match(WINTER_SQL,/harvest_season_target\('winter-2026','\{"passPremium":\["autumn-2026"\]\}'::jsonb\) is distinct from 'winter-2026'/,'a Winter purchase credits Winter');
 // No PL/pgSQL alias that shares a name with a variable (the guard loop's v(f,m) against fn, want, got).
 assert.match(WINTER_SQL,/declare fn text; want text; got text;/);assert.match(WINTER_SQL,/\) v\(f,m\) loop/);
});

test('the window: Winter\'s words in snowflakes, a tile for a farmer part with Wear, the coming card at the very bottom',async()=>{
 const ui=await import('../public/season-ui.js'),pub=await import('../public/farm-state.js');
 const now=at(1,10,12,2027),s=farm(40,now),v=pub.seasonView(s,now);
 assert.equal(ui.seasonRule(v),'Every 125 snowflakes = 1 tier. Up to 250 a day.');
 assert.match(ui.leafChip(s,'gift',now),/\+30 snowflakes/);assert.match(ui.leafChip(s,'gift',now),/season-pass-winter/);
 assert.equal(ui.weekGoalText('sprouts',100),'Harvest 100 crops. Brussels sprouts count double.');
 const [holds,worth]=ui.seasonValueLines(W_());
 assert.equal(holds,'Over 100 tiers: 1,500 diamonds, 21 days of VIP, 6 days of farmhand, 17 boosts, 2 avatars, 10 other season looks and 3 things for My farmer.');
 assert.match(worth,/^What you can buy of it in the shop costs more than 8,800 diamonds there\./);assert.ok(!/€/.test(holds+worth));
 // A farmer part: its picture is its cell in My farmer's sheet, its name translated (the names here are farmer-parts.js's).
 const parts=ui.seasonRewardParts(pub.seasonReward({farmer:['costume_2']},40));
 assert.deepEqual(parts.map(p=>[p.farmer,p.main,p.sub]),[['costume_2','Penguin suit','My farmer']]);
 for(const [id,name] of Object.entries(ui.PASS_PART_NAMES))assert.equal(name,F.FARMER_PARTS[id].name,id);
 assert.deepEqual(Object.keys(ui.PASS_PART_NAMES).sort(),Object.keys(F.FARMER_PASS_PARTS).sort());
 assert.match(F.farmerThumbStyle('costume','costume_2'),/^background-image:url\('\/assets\/farmer\/thumbs\/costume\.webp'\);background-size:1000% 100%;background-position:/);
 const source=read('public/season-ui.js');
 assert.match(source,/data-season-wear="\$\{id\}"/);assert.match(source,/dialog\.close\(\);void window\.harvestMyFarmer\.open\(\{wear:id\}\);/);
 assert.match(read('public/game.js'),/async function openMyFarmer\(\{wear=null\}=\{\}\)\{/);assert.match(read('public/farmer-creator.js'),/tryOn=null,/);
 // The coming card after the tiers and chests, "Bought ✓" once bought, no buy button where the pass is not sold (the iPhone app).
 assert.match(source,/<ol class="season-tiers">\$\{rows\.join\(''\)\}<\/ol>\$\{chests\}\$\{comingCard\(seasonComing\(state,t\)\)\}/);
 assert.match(source,/if\(c\.premium\)buy=`<p class="season-coming-bought">Bought ✓<\/p>/);
 assert.match(source,/else if\(sells\(\)\)\{const \{label,disabled,note\}=sale\(s\.id\);/);
 assert.ok(!/Buy now|was €|claim all|claimAll|hurry|only \d+ left/i.test(source),'quiet wording, no fake discount, never claim all');
 // The last season's strip claims with its own id.
 assert.match(source,/data-season-id="\$\{id\}"/);assert.match(source,/runAction\(\{type:'season_claim',track,tier,\.\.\.\(id\?\{season:id\}:\{\}\)\}\)/);
});

test('the pictures: the owner\'s 13 Winter pictures and the Frost paint ship as WebP, registered for art()',()=>{
 const icons=read('public/visual-icons.js');
 for(const [file,folder] of [['avatar-cocoa-maker','avatars'],['avatar-snow-farmhand','avatars'],['avatar-frost-royal','avatars'],['season-pass-winter','icons'],['season-point-winter','icons'],['golden-sledge','icons'],['emblem-winter','icons'],['tractor-paint-winter','icons'],['brussels-sprouts','icons'],['brussels-sprouts-seeds','icons'],['season-badge-winter-2026','season'],['frame-winter','season'],['profile-bg-winter','season'],['season-pass-banner-winter','season']]){
  assert.ok(readFileSync(new URL(`../public/assets/${folder}/${file}.webp`,import.meta.url)).length>5000,file);
 }
 assert.match(icons,/pictures\.sprouts='brussels-sprouts';pictures\['sprouts-seeds'\]='brussels-sprouts-seeds';/);
 for(const look of Object.values(SEASON_LOOKS).filter(l=>l.season===W&&l.art&&l.kind!=='avatar'))assert.ok(icons.includes(`'${look.art}'`),look.art);
});

// Differential: the rules as they are live (main 7f92bdb2, before Winter) on saves of the new rules, and the new rules on live saves.
const show=(sha,file)=>{try{return execFileSync('git',['show',`${sha}:${file}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};
test('differential: the live rules on new saves (a Winter pre-sale) and the new rules on live saves change nothing before 22 December',async t=>{
 const oldState=show('7f92bdb2','game/farm-state.js'),oldParts=show('7f92bdb2','game/farmer-parts.js');
 if(!oldState||!oldParts){t.skip('git history not available');return;}
 const partsUrl='data:text/javascript;base64,'+Buffer.from(oldParts).toString('base64');
 const O=await import('data:text/javascript;base64,'+Buffer.from(oldState.replace("from './farmer-parts.js';",`from '${partsUrl}';`)).toString('base64'));
 assert.equal(O.SEASON_IDS.join(),A,'the live rules know Autumn only');
 const now=at(11,10);
 const make=(M)=>{const s=M.createFarm(now-3*D);s.xp=M.xpForLevel(40)+5;s.passPremium=['autumn-2026','winter-2026'];return M.normalizeFarm(s,now);};
 // The live rules keep a Winter purchase (passPremium is a list of strings it never trims) and play on as before.
 const live=make(O);normalizeFarm(live,now+H);
 const back=JSON.parse(JSON.stringify(live));O.normalizeFarm(back,now+2*H);
 assert.deepEqual(back.passPremium,['autumn-2026','winter-2026']);assert.equal(back.season.id,A);
 // The new rules on a live save: the same state after a normalize, before 22 December (nothing new is written).
 // Only one key is new: inventory.sprouts at 0 (every item has its count, as cranberries got theirs); the live site and farm-api keep
 // it as it is and never read it (they list storage from their own ITEMS).
 const a=make(O),b=JSON.parse(JSON.stringify(a));O.normalizeFarm(a,now+H);normalizeFarm(b,now+H);
 assert.equal(b.inventory.sprouts,0);assert.equal(a.inventory.sprouts,undefined);delete b.inventory.sprouts;
 // And since 22 Oct 2026 the Warehouse (state.warehouse, tests/warehouse.test.mjs), which the live rules keep as it is.
 assert.ok(b.warehouse);delete b.warehouse;
 assert.deepEqual(b,a,'new rules on a live save: identical but for that count');
 const kept=JSON.parse(JSON.stringify(b));kept.inventory.sprouts=0;O.normalizeFarm(kept,now+2*H);assert.equal(kept.inventory.sprouts,0,'the live rules keep it');
 // And the other way round on a new save at the same moment.
 const c=make(G),d=JSON.parse(JSON.stringify(c));G.normalizeFarm(c,now+H);O.normalizeFarm(d,now+H);
 assert.deepEqual(d,c,'live rules on a new save: identical');
 // A claim on Autumn gives the same under both.
 const e=make(O),f=JSON.parse(JSON.stringify(e));e.season.points=65*12;f.season.points=65*12;O.normalizeFarm(e,now);normalizeFarm(f,now);
 assert.deepEqual(O.applyFarmAction(e,{type:'season_claim',track:'paid',tier:3},now+H),applyFarmAction(f,{type:'season_claim',track:'paid',tier:3},now+H));
 delete f.inventory.sprouts;delete f.warehouse;assert.deepEqual(f,e);
});
