// The Season Pass, Autumn 2026 (plan-farmpas/plan.md, approved 20 Oct 2026): the rules (game/farm-state.js), the sale (game/payments.js)
// and the database file (supabase/season-pass-engine.sql). The season's start is the owner's go, so it is not in the code yet: these tests
// put one on it with scheduleSeason (this copy of the rules only).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as G from '../game/farm-state.js';
import * as P from '../game/payments.js';
import {SQL} from '../scripts/season-pass-sql.mjs';

const {createFarm,normalizeFarm,applyFarmAction,xpForLevel,levelOf,seasonById,scheduleSeason,seasonView,seasonPhase,seasonTotals,SEASON_LOOKS,CROPS,ITEMS}=G;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const H=3600000,D=24*H,ID='autumn-2026',START=Date.UTC(2026,10,6);   // the plan's example: Friday 6 November
scheduleSeason(ID,START);
// Autumn on its own here: the next season (Winter 2026, from 22 Dec) is taken out of this copy of the rules, so these tests read as
// they did; tests/season-pass-winter.test.mjs has Winter, and the two seasons together.
scheduleSeason('winter-2026',null);
const S=()=>seasonById(ID);
const at=(month,day,hour=12)=>Date.UTC(2026,month-1,day,hour);
function farm(level=40,now=at(11,9)){const s=createFarm(now-3*D);s.xp=xpForLevel(level)+5;return normalizeFarm(s,now);}
// Points without playing every action: the counters the season reads, then a normalize (what every action and load does first).
function bump(s,now,{gift=0,daily=0,delivery=0,event=0,quest=0,fish=0,hand=0,chore=0}={}){
 s.login.visits+=gift;s.stats.dailies+=daily;s.stats.deliveries+=delivery;s.stats.events_claimed=(s.stats.events_claimed??0)+event;
 s.stats.quests_claimed=(s.stats.quests_claimed??0)+quest;s.stats.fish=(s.stats.fish??0)+fish;s.stats.activities=(s.stats.activities??0)+hand;s.stats.chores+=chore;
 return normalizeFarm(s,now);
}
const buy=s=>{s.passPremium=[...(s.passPremium??[]),ID];return s;};
const points=(s,n,now)=>{for(let left=n;left>0;left-=Math.min(left,250)){/* one day each */}s.season.points+=n;return normalizeFarm(s,now);};

test('Autumn 2026: 100 tiers, 1,500 paid and 200 free diamonds, something on every paid tier, the plan\'s totals and catalogue',()=>{
 const s=S(),t=seasonTotals(s);
 assert.equal(s.tiers.length,100);
 assert.deepEqual({diamonds:t.diamonds,free:t.freeDiamonds,vip:t.vipDays,farmhand:t.farmhandDays,boosts:t.boosts,avatars:t.avatars,looks:t.otherLooks},{diamonds:1500,free:200,vip:21,farmhand:6,boosts:17,avatars:2,looks:10});
 assert.ok(t.shop>8800&&t.shop<8900,`the value line's "more than 8,800 diamonds": ${t.shop}`);
 assert.equal(s.tiers.reduce((n,x)=>n+(x.free.coins??0),0),6120,'6,120 × level coins in the free row');
 assert.equal(s.tiers.reduce((n,x)=>n+(x.free.seeds?.cranberries??0),0),13,'13 free seed packets');
 assert.equal(s.tiers.reduce((n,x)=>n+(x.paid.seeds?.cranberries??0),0),30,'30 paid packets: 3 on every tier ending in 8');
 for(const [i,x] of s.tiers.entries())assert.ok(Object.keys(x.paid).length&&Object.keys(x.free).length,`tier ${i+1} has both`);
 const looks=track=>s.tiers.flatMap(x=>x[track].looks??[]);
 assert.equal(looks('paid').length,12,'12 paid season things');assert.equal(looks('free').length,6,'6 free ones');
 assert.deepEqual([...looks('free'),...looks('paid')].sort(),Object.keys(SEASON_LOOKS).filter(id=>SEASON_LOOKS[id].season===ID).sort(),'every look of the catalogue, once');
 assert.deepEqual(s.tiers[0].paid,{looks:['season-autumn-2026-harvest-chef'],purchase:true},'the Harvest chef comes with the purchase');
 assert.deepEqual(s.tiers[24].free.looks,['season-autumn-2026-autumn-harvester']);assert.deepEqual(s.tiers[99].paid.looks,['season-autumn-2026-pumpkin-royal','autumn-2026-golden-pumpkin']);
 for(const [id,look] of Object.entries(SEASON_LOOKS))if(look.color&&look.season===ID)assert.ok(['#9c6214','#96402f','#316c3a'].includes(look.color),`${id}: the game's palette`);
 for(const look of Object.values(SEASON_LOOKS))assert.ok(!/ · /.test(look.name));
});
test('a tier skip never pays: at most 50 diamonds a tier in both rows together, and VIP never on a tier with diamonds',()=>{
 for(const [i,x] of S().tiers.entries()){
  const diamonds=(x.free.diamonds??0)+(x.paid.diamonds??0);
  assert.ok(diamonds<=G.SEASON_MAX_TIER_DIAMONDS&&diamonds<G.SEASON_SKIP_COST,`tier ${i+1}: ${diamonds}`);
  if(x.free.vipDays||x.paid.vipDays)assert.equal(diamonds,0,`tier ${i+1}: VIP doubles the daily gift's diamonds, so no diamonds beside it`);
  // VIP's extra gift diamonds over 7 days (at most 12 a day) stay under a skip too.
  if(x.paid.vipDays)assert.ok(7*12<G.SEASON_SKIP_COST);
 }
 assert.equal(G.SEASON_SKIP_COST,100);
 // Skipping all 100 tiers: 10,000 diamonds out, 1,700 back.
 assert.equal(100*G.SEASON_SKIP_COST-seasonTotals(S()).diamonds-seasonTotals(S()).freeDiamonds,8300);
});
test('a tier costs 1.4 × the season\'s days, rounded to 5, fixed from the start',()=>{
 for(const [day,expected] of [[2,70],[6,65],[9,60],[13,55],[16,50]])assert.equal(G.seasonPerTier(Date.UTC(2026,10,day),S().endsAt),expected,`start ${day} Nov`);
 assert.equal(S().perTier,65);
});
test('the season: not scheduled shows nothing; then a 3-day preview, open until 21 December, a week to collect, then over',()=>{
 scheduleSeason(ID,null);
 assert.equal(seasonPhase(S(),at(11,20)),'off','no start set: nothing at all');assert.equal(G.currentSeason(at(11,20)),null);
 assert.equal(seasonView(farm(40,at(11,20)),at(11,20)),null);
 scheduleSeason(ID,START);
 assert.equal(seasonPhase(S(),START-3*D-1),'off');assert.equal(seasonPhase(S(),START-3*D),'soon');
 assert.equal(seasonPhase(S(),START),'open');assert.equal(seasonPhase(S(),Date.UTC(2026,11,22)-1),'open');
 assert.equal(seasonPhase(S(),Date.UTC(2026,11,22)),'claim');assert.equal(seasonPhase(S(),Date.UTC(2026,11,29)),'over');
 assert.equal(farm(40,START-D).season,undefined,'nothing stored before the start');
 assert.equal(farm(9,at(11,9)).season,undefined,'below level 10 nothing counts');
 assert.equal(farm(10,at(11,9)).season?.id,ID,'from level 10 the count starts');
});
test('points: the eight actions, up to 250 a day (the day turning at 00:00 UTC), shown at once',()=>{
 const now=at(11,10,9),s=farm(40,now);
 bump(s,now+1,{gift:1,daily:1,delivery:1,event:1,quest:1,fish:1,hand:1,chore:1});
 assert.equal(s.season.points,30+15+15+15+5+3+3+3);assert.equal(s.season.today,89);
 s.login.visits++;assert.equal(seasonView(s,now+2).points,119,'the window counts what happened since the last save');assert.equal(s.season.points,89,'stored at the next save');
 bump(s,now+3,{fish:200});assert.equal(s.season.today,250,'the day\'s cap');assert.equal(s.season.points,250);
 bump(s,now+4,{gift:1});assert.equal(s.season.points,250,'nothing more today');
 bump(s,at(11,11,1),{chore:2});assert.equal(s.season.today,6,'a new day');assert.equal(s.season.points,256);
 assert.deepEqual(G.SEASON_POINTS,{gift:30,daily:15,delivery:15,event:15,quest:5,fish:3,hand:3,chore:3});
});
test('the Harvest festival and the last two days count double, the cap too (500)',()=>{
 const now=at(11,23),s=farm(40,now);
 bump(s,now+1,{gift:1});assert.equal(s.season.points,60);
 bump(s,now+2,{fish:300});assert.equal(s.season.today,500);
 const v=seasonView(s,now+3);assert.equal(v.cap,500);assert.equal(v.week.name,'Harvest festival');assert.equal(v.double,true);
 assert.equal(seasonView(s,at(12,20)).cap,500,'the final days');assert.equal(seasonView(s,at(12,19)).cap,250);
});
test('the weekly goal: +200 on top of the cap, once a week; the start week\'s goal is halved for a Friday start',()=>{
 assert.equal(G.seasonWeekTarget(S(),0),3,'a Friday start: 5 gift days become 3');assert.equal(G.seasonWeekTarget(S(),1),10);
 scheduleSeason(ID,Date.UTC(2026,10,9));assert.equal(G.seasonWeekTarget(S(),1),10,'a Monday start keeps it');assert.equal(G.seasonWeekTarget(S(),0),5);scheduleSeason(ID,START);
 const s=farm(40,at(11,9,1));   // week 2: finish 10 daily challenges
 bump(s,at(11,9,2),{fish:100});assert.equal(s.season.today,250);
 bump(s,at(11,9,3),{daily:10});assert.equal(s.season.week.done,true);assert.equal(s.season.points,450,'+200 beyond the cap');
 bump(s,at(11,10),{daily:10});assert.equal(s.season.points,450+150,'once a week (the 150: ten challenges counted on a fresh day)');
 const v=seasonView(s,at(11,10));assert.equal(v.weekTarget,10);assert.equal(v.weekDone,true);
});
test('tiers and the skip: 100 diamonds a tier, one per tap, points carried, nothing for the cap or the goal, not after tier 100',()=>{
 const now=at(11,12),s=farm(40,now);s.diamonds=1000;
 bump(s,now,{fish:50});   // 150 points: tier 2, 20 towards tier 3
 assert.equal(G.seasonTier(S(),s.season),2);
 const r=applyFarmAction(s,{type:'season_skip',expectedCost:100},now+1);
 assert.equal(r.tier,3);assert.equal(s.diamonds,900);assert.equal(s.stats.diamonds_spent,100,'counts for the Gem collector');
 assert.equal(seasonView(s,now+1).inTier,20,'the 20 points stay towards the next tier');assert.equal(s.season.today,150,'the cap does not see it');
 assert.throws(()=>applyFarmAction(s,{type:'season_skip',expectedCost:90},now+2),/Prices have changed/);
 s.diamonds=50;assert.throws(()=>applyFarmAction(s,{type:'season_skip',expectedCost:100},now+3),/You need 100 diamonds/);
 s.diamonds=100000;for(let i=0;i<97;i++)applyFarmAction(s,{type:'season_skip',expectedCost:100},now+4+i);
 assert.equal(G.seasonTier(S(),s.season),100);assert.throws(()=>applyFarmAction(s,{type:'season_skip'},now+200),/You reached tier 100/);
 const late=farm(40,at(12,23));late.season={...s.season};late.diamonds=1000;normalizeFarm(late,at(12,23));
 assert.throws(()=>applyFarmAction(late,{type:'season_skip'},at(12,23)),/only be skipped while the season runs/);
});
test('after tier 100 every 500 points open a bonus chest of 500 × level coins, for everyone, one at a time',()=>{
 const now=at(11,12),s=farm(40,now);s.diamonds=100000;
 for(let i=0;i<100;i++)applyFarmAction(s,{type:'season_skip'},now+i);
 assert.throws(()=>applyFarmAction(s,{type:'season_chest'},now+200),/Every 500 points after tier 100/);
 s.season.points+=1000;normalizeFarm(s,now+300);
 const coins=s.coins,r=applyFarmAction(s,{type:'season_chest'},now+301);
 assert.equal(r.coins,500*40);assert.equal(s.coins,coins+20000);applyFarmAction(s,{type:'season_chest'},now+302);
 assert.throws(()=>applyFarmAction(s,{type:'season_chest'},now+303),/bonus chest/);
});
test('claims: each reward on its own; the paid row once bought, also tiers reached before; the paid tier 1 avatar comes with the purchase',()=>{
 const now=at(11,12),s=farm(40,now);s.season.points=65*30;normalizeFarm(s,now);
 const claim=(track,tier,t=now)=>applyFarmAction(s,{type:'season_claim',track,tier},t);
 const before=s.coins;let r=claim('free',1);
 assert.equal(r.coins,60*40);assert.deepEqual(r.looks,['autumn-2026-title-leaf-collector']);assert.equal(s.coins,before+2400,'never counted as earned');
 assert.ok(s.looks.includes('autumn-2026-title-leaf-collector'));
 assert.throws(()=>claim('free',1),/already collected/);assert.throws(()=>claim('free',31),/Reach tier 31 first/);
 assert.throws(()=>claim('paid',3),/Unlock the paid rewards first/);
 assert.equal(G.ownsLook(s,'season-autumn-2026-harvest-chef'),false);
 buy(s);normalizeFarm(s,now);
 assert.equal(G.ownsLook(s,'season-autumn-2026-harvest-chef'),true,'the Harvest chef is yours the moment you buy');
 assert.throws(()=>claim('paid',1),/came with your Season Pass/);
 const d=s.diamonds;claim('paid',3);assert.equal(s.diamonds,d+50,'a tier reached before buying opens at once');
 claim('free',7);assert.equal(s.seasonSeeds.cranberries,2);claim('paid',8);assert.equal(s.seasonSeeds.cranberries,5);
 claim('paid',5);assert.ok(s.boosts.farmhandUntil>=now+D-1);assert.ok(s.looks.includes('autumn-2026-color-pumpkin'));
 const c=s.coins;claim('paid',11);assert.equal(s.coins,c+1000*40,'a coin cart');
 const vip=s.vipExpiresAt;claim('paid',12);assert.ok(s.vipExpiresAt>=Math.max(vip,now)+7*D);
 claim('free',12);assert.ok(s.looks.includes('autumn-2026-float'));
 assert.equal(seasonView(s,now).waiting,60-s.season.free.length-s.season.paid.length-1,'the "!" counts what waits (not the paid tier 1)');
});
test('rewards that act now wait until they can: Instant harvest, Finish production and one Buildings discount at a time',()=>{
 const now=at(11,12),s=buy(farm(60,now));s.season.points=65*80;normalizeFarm(s,now);
 s.boosts.upgradeCredits=1;assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:44},now),/Use your Buildings discount first/);
 s.boosts.upgradeCredits=0;applyFarmAction(s,{type:'season_claim',track:'paid',tier:44},now);assert.equal(s.boosts.upgradeCredits,1);
 for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0});
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:55},now),/Plant something first/);
 s.coins=1e6;applyFarmAction(s,{type:'field',id:0,action:'plant',crop:'wheat'},now);
 const r=applyFarmAction(s,{type:'season_claim',track:'paid',tier:55},now+1);assert.equal(r.affected,1);assert.ok(s.plots[0].readyAt<=now+1);
});
test('a refund takes back the paid diamonds collected (as far as the farm has them) and the paid looks; the free row stays',()=>{
 const now=at(11,12),s=buy(farm(40,now));s.season.points=65*30;normalizeFarm(s,now);
 for(const tier of [3,6,25])applyFarmAction(s,{type:'season_claim',track:'paid',tier},now);
 applyFarmAction(s,{type:'season_claim',track:'free',tier:25},now);applyFarmAction(s,{type:'season_claim',track:'free',tier:12},now);
 applyFarmAction(s,{type:'season_look',slot:'bobber',id:'autumn-2026-float'},now);
 s.diamonds=70;s.passPremium=s.passPremium.filter(id=>id!==ID);normalizeFarm(s,now+1);
 assert.equal(s.diamonds,0,'100 paid diamonds collected, 70 left: down to 0, never below');
 assert.ok(!s.looks.includes('autumn-2026-frame'),'the paid frame goes');assert.ok(s.looks.includes('season-autumn-2026-autumn-harvester'),'the free avatar stays');
 assert.equal(s.lookFarm.bobber,'autumn-2026-float','a free float stays worn');
 assert.deepEqual(s.season.paid,[]);assert.equal(s.season.refunded,true);assert.equal(G.ownsLook(s,'season-autumn-2026-harvest-chef'),false);
 assert.throws(()=>applyFarmAction(s,{type:'season_claim',track:'paid',tier:3},now+2),/Unlock the paid rewards first/);
});
test('looks: only what the farm owns, each in its own slot; the farm\'s own float, rod and paint in state.lookFarm',()=>{
 const now=at(11,12),s=farm(40,now);s.season.points=65*70;normalizeFarm(s,now);
 assert.throws(()=>G.checkWornLook(s,{title:'autumn-2026-title-leaf-collector'}),/Collect this look/);
 applyFarmAction(s,{type:'season_claim',track:'free',tier:1},now);
 assert.deepEqual(G.checkWornLook(s,{title:'autumn-2026-title-leaf-collector',frame:null}),{title:'autumn-2026-title-leaf-collector'});
 assert.throws(()=>G.checkWornLook(s,{frame:'autumn-2026-title-leaf-collector'}),/Choose a look/,'a title is no frame');
 assert.throws(()=>G.checkWornLook(s,{crown:'x'}),/Choose a look/);assert.throws(()=>G.checkWornLook(s,[]),/Choose a look/);
 assert.deepEqual(G.wornLook({title:'autumn-2026-title-leaf-collector',color:'#ff0000',bg:'autumn-2026-frame'}),{title:'autumn-2026-title-leaf-collector'},'shown: only known looks in their slot');
 assert.throws(()=>applyFarmAction(s,{type:'season_look',slot:'rod',id:'autumn-2026-golden-rod'},now),/Collect this look/);
 applyFarmAction(s,{type:'season_claim',track:'free',tier:12},now);applyFarmAction(s,{type:'season_look',slot:'bobber',id:'autumn-2026-float'},now);
 assert.deepEqual(s.lookFarm,{bobber:'autumn-2026-float'});applyFarmAction(s,{type:'season_look',slot:'bobber',id:null},now);assert.deepEqual(s.lookFarm,{});
});
test('cranberries: a seed packet plants one field, only while the season runs; harvested once; no medal, board or sharing; 400 coins each',()=>{
 assert.ok(!Object.keys(CROPS).includes('cranberries'),'not in any list made from CROPS (medals, boards, the Starter Pack, the seed list)');
 assert.equal(CROPS.cranberries.model,'bush_003');assert.equal(CROPS.cranberries.tint,0xb0283c);assert.ok(ITEMS.cranberries);
 assert.ok(!G.STARTER_PACK_CROPS.includes('cranberries'));assert.equal(G.cropUnlocked(farm(90),'cranberries'),false,'never from the seed list or the tractor');
 const now=at(11,12),s=farm(40,now),plant=(id,t=now)=>applyFarmAction(s,{type:'field',id,action:'plant',crop:'cranberries'},t);
 for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0});
 assert.throws(()=>plant(0),/no seed packets for this crop/);
 s.seasonSeeds={cranberries:2};const coins=s.coins;plant(0);
 assert.equal(s.seasonSeeds.cranberries,1);assert.equal(s.coins,coins,'no coins');assert.equal(s.plots[0].crop,'cranberries');
 assert.equal(s.plots[0].readyAt-now,G.cropDuration(s,'cranberries',false,now),'4 hours, shorter with the usual bonuses');
 const swipe=applyFarmAction(s,{type:'fields',action:'plant',ids:[1,2,3],crop:'cranberries'},now);assert.equal(swipe.count,1,'a swipe stops when the packets run out');assert.equal(swipe.short,true);
 const harvested=s.stats.harvested;applyFarmAction(s,{type:'field',id:0,action:'harvest'},now+5*H);
 assert.equal(s.plots[0].crop,null,'the field is empty after the harvest');assert.equal(s.stats.harvested,harvested+1);assert.equal(s.stats.season_crop_harvests,1);
 assert.equal(s.mastery.harvests.cranberries,undefined,'no medal');assert.equal(s.stats.harvest_cranberries,undefined,'no leaderboard');assert.ok(!s.discovered.includes('cranberries'));
 for(const day of [0,1,2,3,30])assert.equal(G.marketQuote('cranberries',now+day*D).price,400,'one fixed price');
 const stock=s.inventory.cranberries;assert.ok(stock>=1);const sold=applyFarmAction(s,{type:'sell',item:'cranberries',quantity:1,category:undefined,day:G.utcDay(now+5*H)},now+5*H);assert.ok(sold.coins>=400);
 s.seasonSeeds={cranberries:3};assert.throws(()=>plant(4,Date.UTC(2026,11,22)),/only grows in its season/);
 normalizeFarm(s,Date.UTC(2027,0,5));assert.equal(s.seasonSeeds.cranberries,3,'packets keep until next autumn');
 for(let week=0;week<200;week++)assert.ok(!JSON.stringify(G.familyOrder(`f${week}`,week,5)).includes('cranberries'),'never in a Family Order');
 assert.ok(G.seasonItem('cranberries')&&!G.seasonItem('berries'));
});
test('the Halloween Pass and the Season Pass side by side: one gift counts for both, each in its own key',()=>{
 scheduleSeason(ID,Date.UTC(2026,10,2));
 const now=Date.UTC(2026,10,2,10),s=farm(40,now);
 assert.equal(G.passPhase(now),'open');assert.equal(seasonPhase(S(),now),'open');
 assert.equal(s.pass?.id,'halloween-2026');assert.equal(s.season?.id,ID);
 applyFarmAction(s,{type:'checkin'},now);normalizeFarm(s,now+1);
 assert.equal(G.passLanterns(s),2,'2 lanterns');assert.equal(s.season.points,30,'and 30 leaves');
 s.passPremium=['halloween-2026'];normalizeFarm(s,now+2);assert.equal(s.season.id,ID,'refreshPass leaves the season alone');
 assert.equal(G.passPremium(s),true);assert.equal(G.seasonPremium(s,ID),false,'one pass bought is not the other');
 scheduleSeason(ID,START);
});
test('a quest claimed counts for the season (stats.quests_claimed), the farm\'s and the village\'s',()=>{
 const s=farm(40);const before=s.stats.quests_claimed??0;
 const id=G.QUESTS.findIndex((q,i)=>!s.claimed.includes(i));s.stats[G.QUESTS[id].stat]=G.QUESTS[id].target;G.claimQuest(s,id);
 assert.equal(s.stats.quests_claimed,before+1);
});
test('the family emblem of the season: only when a member has it (or the family wears it), and it stays',()=>{
 const now=at(11,12),leader=farm(40,now);
 let c=G.familyMutate(G.emptyFamilyContext(),leader,'alice',{type:'family_create',name:'Meadow Friends',emblem:'60'},now).context;
 assert.throws(()=>G.familyMutate(c,leader,'alice',{type:'family_emblem',emblem:'100'},now),/needs this emblem from the Season Pass/);
 const r=G.familyMutate(c,leader,'alice',{type:'family_emblem',emblem:'100'},now,{seasonEmblems:['100']});assert.equal(r.context.families[0].emblem,'100');
 c=r.context;assert.equal(G.familyMutate(c,leader,'alice',{type:'family_emblem',emblem:'100'},now).failed,false,'worn already: it stays');
 assert.deepEqual(G.familyEmblemChoices().map(e=>e.id).includes('100'),false);assert.equal(G.familyEmblemChoices(['100'])[0].id,'100','offered first when allowed');
 const view=G.familyPublicView({...c,seasonEmblems:['100']},'alice',leader,now);assert.deepEqual(view.seasonEmblems,['100']);
});
test('old saves: nothing new until it is used; a season entry that is broken is cleaned',()=>{
 const s=farm(40,at(10,25));
 for(const key of ['season','seasonPrev','looks','lookFarm','seasonSeeds'])assert.equal(key in s,false,key);
 s.season={id:'nope'};s.looks=['x','autumn-2026-frame','autumn-2026-frame'];s.lookFarm={rod:'autumn-2026-frame',tractor:'x'};s.seasonSeeds={cranberries:-2,corn:4};
 normalizeFarm(s,at(10,26));
 assert.equal(s.season,undefined);assert.deepEqual(s.looks,['autumn-2026-frame']);assert.deepEqual(s.lookFarm,{});assert.deepEqual(s.seasonSeeds,{});
 assert.deepEqual(JSON.parse(JSON.stringify(normalizeFarm(farm(40,at(11,9)),at(11,9)))).season.free,[]);
});
test('the sale: €19.99 once per season from level 20, the dates the game\'s own, a second purchase refused, the season in the row',()=>{
 // The same dates in both (the start: null until the owner's go, then the same 00:00 UTC in both files).
 const shipped=read('game/farm-state.js').match(/id:'autumn-2026',[^]*?startsAt:(null|utc\(\d+,\d+\)),endsAt:utc\(12,22\)/)[1],utc=(month,day)=>Date.UTC(2026,month-1,day);
 for(const s of P.SEASON_SALE.seasons){const g=G.seasonById(s.id);assert.equal(s.endsAt,g.endsAt);assert.equal(s.claimUntil,g.claimUntil);}
 assert.equal(String(P.SEASON_SALE.seasons[0].startsAt),String(eval(shipped)),'the start in payments.js is the one in farm-state.js');
 const at0=P.SEASON_SALE.seasons[0].startsAt;if(at0!=null)assert.ok(at0%D===0&&at0>=Date.UTC(2026,9,21)&&at0<Date.UTC(2026,11,1),'a start is 00:00 UTC, from 21 October (the owner\'s go, 20 Oct 2026: "start zsm")');
 assert.deepEqual([P.SEASON_SALE.cents,P.SEASON_SALE.level,P.SEASON_SALE.price,P.SEASON_SALE.product],[1999,20,'price_1USilO04FdNTUSp4FI12JA9l','prod_VTg71Dn0njkTPI']);
 const seasons=[{...P.SEASON_SALE.seasons[0],startsAt:START}],open=START+H;
 assert.deepEqual(P.seasonCheckoutProblem({level:40,now:open,seasons:[{...P.SEASON_SALE.seasons[0],startsAt:null}]}),{error:'The Season Pass is not on sale right now.',status:409},'no start: not for sale');
 assert.equal(P.seasonCheckoutProblem({level:20,now:open,seasons}),null);
 assert.deepEqual(P.seasonCheckoutProblem({level:19,now:open,seasons}),{error:'The Season Pass is for sale from level 20.',status:409});
 assert.deepEqual(P.seasonCheckoutProblem({level:40,now:open,seasons,owned:true}),{error:'You already have the Season Pass for this season.',status:409});
 assert.deepEqual(P.seasonCheckoutProblem({level:40,now:START-1,seasons}).status,409,'not in the preview');assert.equal(P.seasonCheckoutProblem({level:40,now:Date.UTC(2026,11,22),seasons}).status,409,'not in the collecting week');
 assert.equal(P.offerPausedForSeason(START+6*D,seasons),false,'no pause since 22 Oct 2026: offers run beside the pass');assert.equal(P.SEASON_OFFER_PAUSE,0);assert.equal(P.offerPausedForSeason(START+7*D,seasons),false);assert.equal(P.offerPausedForSeason(START+D),false,'not scheduled: nothing paused');
 assert.match(read('supabase/functions/diamond-checkout/index.ts'),/async function currentOffer\(player:string\)\{\n[^\n]*\n if\(offerPausedForSeason\(\)\)return null;/);
 assert.equal(P.paymentPack('season').cents,1999);assert.equal(P.PLAY_PRODUCTS.season,'season_pass');assert.equal(P.kongProduct('season'),'season_pass');
 const row={id:'00000000-0000-4000-8000-000000000001',pack:'season',pass_id:ID,diamonds:0,coins:0,amount_cents:1999,player_id:'p',store:'kongregate',price_id:'season_pass'};
 assert.deepEqual(P.checkKongPurchase(row,{product:'season_pass',player:'p'}),{product:'season_pass'});
 assert.throws(()=>P.checkKongPurchase({...row,pass_id:'summer-1999'},{product:'season_pass',player:'p'}),/Pass mismatch/,'only a season the game knows');
 assert.throws(()=>P.checkKongPurchase({...row,diamonds:50},{product:'season_pass',player:'p'}),/Pass mismatch/);
 const checkout=read('supabase/functions/diamond-checkout/index.ts');
 assert.match(checkout,/eq\('pack','season'\)\.eq\('pass_id',open\.id\)\.in\('status',\['credited','test_paid'\]\)/,'a paid row for this season');
 assert.match(checkout,/const inFarm=Array\.isArray\(farmPasses\.data\?\.passes\)&&farmPasses\.data\.passes\.includes\(open\.id\);/,'or the season in the farm already');
});
test('the iPhone app: the App Store path, switched on with the app 1.5 (APPLE_SELLS_SEASON_PASS, 22 Oct 2026); both states',()=>{
 assert.equal(P.APPLE_SELLS_SEASON_PASS,true);assert.equal(G.APPLE_SELLS_SEASON_PASS,P.APPLE_SELLS_SEASON_PASS,'one switch: the page reads the same in farm-state.js');
 // Off: no product, the checkout refused, never credited.
 assert.equal(P.appleProduct('season',false),null);assert.equal(P.appleProduct('pass'),'halloween_pass_2026','the Halloween Pass as before');
 assert.deepEqual(P.seasonStoreProblem('app_store',false),{error:'The Season Pass is not sold in the iPhone app.',status:409});
 for(const store of ['stripe','google_play','kongregate'])assert.equal(P.seasonStoreProblem(store),null,store);
 const purchase={id:'00000000-0000-4000-8000-000000000001',pack:'season',pass_id:ID,diamonds:0,coins:0,amount_cents:1999,player_id:'p'};
 const apple={bundleId:P.APPLE_BUNDLE,transactionId:'1',originalTransactionId:'1',environment:'Production',type:'Consumable',productId:'season_pass',appAccountToken:purchase.id,quantity:1};
 assert.doesNotThrow(()=>P.checkApplePurchase(apple,purchase,{product:'season_pass',player:'p'}),'on since 1.5: credited');
 // On: the same product id as Google Play, nothing refused.
 assert.equal(P.appleProduct('season',true),'season_pass');assert.equal(P.seasonStoreProblem('app_store',true),null);
 assert.equal(P.APPLE_PRODUCTS,P.PLAY_PRODUCTS,'the App Store keeps Google Play\'s ids');
 const checkout=read('supabase/functions/diamond-checkout/index.ts'),main=read('src/main.js');
 assert.match(checkout,/const notHere=seasonStoreProblem\(apple\?'app_store'/);assert.match(checkout,/seasonReady=Boolean\(SEASON_SALE\.price\)&&!seasonStoreProblem\(apple\?'app_store':'other'\)/);
 assert.match(main,/storeProducts=appStore\?Object\.fromEntries\(Object\.keys\(APPLE_PRODUCTS\)\.filter\(pack=>appleProduct\(pack\)\)/,'off: the App Store is not even asked for a price');
});
test('supabase/season-pass-engine.sql is generated from the rules and guards every function it patches',()=>{
 assert.equal(read('supabase/season-pass-engine.sql'),SQL,'run node scripts/season-pass-sql.mjs');
 assert.match(SQL,/^begin;$/m);assert.match(SQL,/^commit;$/m);
 assert.match(SQL,/\('autumn-2026',timestamptz '2026-12-22T00:00:00\.000Z',timestamptz '2026-12-29T00:00:00\.000Z'\)/);
 for(const fn of ['harvest_purchase_grant(uuid)','harvest_purchase_alert()','harvest_purchase_log()','harvest_revoke_play_purchases(jsonb)','harvest_revoke_apple_purchases(jsonb)','harvest_revoke_kong_purchases(jsonb)','harvest_event_claim(uuid,uuid)'])
  assert.match(SQL,new RegExp(`season_patch\\('${fn.replace(/[()]/g,'\\$&')}','[0-9a-f]{32}'`),fn);
 assert.match(SQL,/create unique index if not exists harvest_one_season_per_player on public\.harvest_purchases\(player_id, pass_id\)\n where pack='season' and status<>'expired';/);
 assert.match(SQL,/grant select \(look\) on public\.player_stats to authenticated;/);
 const paid=S().tiers.flatMap(t=>t.paid.looks??[]);for(const id of paid)assert.ok(SQL.includes(`'${id}'`),id);
});
test('farm-api look: only looks the farm owns, in their own slot, written as one set; never a player or picture from the body',async()=>{
 const {saveLook}=await import('../supabase/functions/farm-api/look-service.js');
 const writes=[];
 const admin=(farm)=>({from:table=>{const q={select(){return q;},eq(){return q;},update(row){writes.push({table,row});return q;},maybeSingle:async()=>table==='player_farms'?{data:farm,error:null}:{data:{player_id:'p',look:writes.at(-1)?.row.look},error:null}};return q;}});
 const farm={looks:['autumn-2026-frame','autumn-2026-title-leaf-collector'],passes:[]};
 let r=await saveLook({admin:admin(farm),player:'p',look:{frame:'autumn-2026-frame',title:'autumn-2026-title-leaf-collector',color:null}});
 assert.equal(r.status,200);assert.deepEqual(writes.at(-1).row.look,{frame:'autumn-2026-frame',title:'autumn-2026-title-leaf-collector'});
 assert.equal(r.data.profile.player_id,'p','the bridge (src/main.js) takes an answer without the farmer\'s own profile for an ended session: "Reconnecting…" (21 Oct 2026)');
 r=await saveLook({admin:admin(farm),player:'p',look:{badge:'autumn-2026-golden-pumpkin'}});assert.equal(r.status,403,'not collected');
 r=await saveLook({admin:admin(farm),player:'p',look:{frame:'autumn-2026-title-leaf-collector'}});assert.equal(r.status,403,'wrong slot');
 r=await saveLook({admin:admin(null),player:'p',look:{}});assert.equal(r.status,409,'no farm yet');
 const index=read('supabase/functions/farm-api/index.ts');
 assert.match(index,/if\(body\.operation==='look'\)\{\n\s+const saved=await saveLook\(\{admin,player:user\.id,look:body\.look\}\);/);
 assert.match(index,/'avatar','look','delete_account'/);
});
test('family-service reads the members\' looks and season emblems only for the farmer\'s own family, and never fails the read',()=>{
 const svc=read('supabase/functions/farm-api/family-service.js');
 assert.match(svc,/admin\.from\('player_stats'\)\.select\('player_id,look'\)\.in\('player_id',ids\)/);
 assert.match(svc,/admin\.from\('player_farms'\)\.select\('player_id,looks:state->looks(,farmer:state->farmer)?'\)\.in\('player_id',ids\)/);
 assert.match(svc,/familyMutate\(before,state,player,reading\?\{type:'family_read'\}:body\.action,now,\{seasonEmblems:before\.seasonEmblems\?\?\[\]\}\)/);
});
test('the window: the rule in one sentence, the value line without a euro beside diamonds, the iPhone app shows the free row only',async()=>{
 // season-ui.js reads the page's copy of the rules (public/farm-state.js, a module of its own): the start goes there too.
 {const pub=await import('../public/farm-state.js');pub.scheduleSeason(ID,START);pub.scheduleSeason('winter-2026',null);}
 const ui=await import('../public/season-ui.js');
 const now=at(11,12),s=farm(40,now),v=seasonView(s,now);
 assert.equal(ui.seasonRule(v),'Every 65 leaves = 1 tier. Up to 250 a day.');
 assert.match(ui.seasonPhaseLine(v,now),/^Ends in /);
 const [holds,worth]=ui.seasonValueLines(S());
 assert.equal(holds,'Over 100 tiers: 1,500 diamonds, 21 days of VIP, 6 days of farmhand, 17 boosts, 2 avatars and 10 other season looks.');
 assert.equal(worth,'What you can buy of it in the shop costs more than 8,800 diamonds there. You get it by reaching tiers.');
 assert.ok(!/€/.test(holds+worth),'no euro beside diamonds');
 const ios={documentElement:{getAttribute:name=>name==='data-app-os'?'ios':null}},web={documentElement:{getAttribute:()=>null}};
 assert.equal(ui.seasonSellsHere(ios,false),false,'not in the iPhone app while Apple does not sell it');assert.equal(ui.seasonSellsHere(ios),true,'on since the app 1.5');assert.equal(ui.seasonSellsHere(ios,true),true);assert.equal(ui.seasonSellsHere(web),true);
 assert.match(ui.leafChip(s,'gift',now),/\+30 leaves/);assert.match(ui.leafChip(s,'daily',at(11,23)),/\+30 leaves/,'doubled in the Harvest festival');
 assert.equal(ui.weekGoalText('festival',100),'Harvest 100 crops. Cranberries count double.');
 const source=read('public/season-ui.js');
 assert.match(source,/if\(!await confirmDiamondSpend\(\{title:t\('Open tier \{0\}\?',next\)/,'every skip asks first, tier by tier');
 assert.ok(!/claim all|claimAll/i.test(source),'never a button to collect everything at once');
 assert.match(read('public/farm.html'),/<button class="icon-button" id="season-button" aria-label="Open the Season Pass"[^>]*hidden>/,'its own button beside the Halloween Pass');
 assert.match(read('public/farm.html'),/<dialog id="season-dialog"[^>]*><div class="dialog-heading"><i class="dialog-badge" data-game-art="season-pass-autumn" aria-hidden="true"><\/i><div class="dialog-titles"><h2 id="season-title">Season Pass<\/h2><\/div>/,'the title is the button\'s word and icon');
});
