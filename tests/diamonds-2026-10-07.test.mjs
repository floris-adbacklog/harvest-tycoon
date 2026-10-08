import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,buildingEligible,levelReward,dailyGift,dailyTasks,dailyOrders,familyWeek,familyTournament,emptyFamilyContext,
 giantDiamonds,GIANT_KG_PER_DIAMOND,GIANT_MAX_DIAMONDS,familyOrderPay,valleyProjectFinish,VALLEY_PROJECTS,DAILY_DIAMONDS,DAILY_CHALLENGE_DIAMONDS,REPLACE_ORDER_COST,COMMISSION_POOL,ITEMS,FAIR_CLASSES,FAIR_CHAMPION_DIAMONDS,
 VISITOR_DIAMONDS,GIANT_RECORD_DIAMONDS,DEPOT_DIAMONDS,LAB_DISCOVER_DIAMONDS,LAB_COMPLETE_DIAMONDS,VALLEY_PROJECT_DIAMONDS,CHAPTER_DIAMONDS,FAMILY_CHEST_TIERS,
 FAMILY_CONFIG,FAMILY_EVENT_BONUS,BEGINNER_REWARD,EMAIL_BONUS,INVITE_REWARD,VIP_PLANS,BOOSTS,DAY_MS} from '../game/farm-state.js';
import {eventStandings,PODIUM,FINISHER_PRIZE} from '../supabase/functions/farm-api/event-service.js';

// 7 Oct 2026, the owner's choice ("option B" and "podium only with rivals"): about half the diamonds earned in play at every level and
// about 60% less in the end game. This file pins the whole table, so a later change to one amount is a choice and not an accident.
// 8 Oct 2026 ("option 3"): the event podium pays its diamonds however many finished in the league (tests/event-podium-2026-10-08.test.mjs).
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,7,12);
function farmAt(level){const s=createFarm(now);s.xp=xpForLevel(level);s.levelRewards=Array.from({length:level},(_,i)=>i+1);s.coins=5e7;s.rookieUntil=0;
 for(let pass=0;pass<3;pass++)for(const key of Object.keys(s.buildings))if(buildingEligible(s,key)&&s.buildings[key].built===false){try{act(s,{type:'construct',building:key},now);}catch{}}
 for(const key of Object.keys(s.inventory))s.inventory[key]=0;s.depot={serial:0,shipped:0,contract:null,readyAt:0};s.fair={week:null,classes:[],entered:[]};return normalizeFarm(s,now);}
const vip=s=>{s.vipExpiresAt=now+DAY_MS;return s;};

test('level-ups: one diamond for every ten levels, at least one (was one for every five)',()=>{
 assert.deepEqual([2,9,10,19,20,29,30,50,70,90,95,100,120].map(l=>levelReward(l).diamonds),[1,1,1,1,2,2,3,5,7,9,9,10,12]);
 for(let l=2;l<=200;l++)assert.equal(levelReward(l).diamonds,Math.max(1,Math.floor(l/10)),`level ${l}`);
 assert.equal(levelReward(40).coins,400,'the coins stay 10 × the level');
});

test('the daily gift: 2/3/4/5/6/8/12, then 12 a day; VIP still doubles it',()=>{
 assert.deepEqual(DAILY_DIAMONDS,[2,3,4,5,6,8,12]);
 const s=farmAt(30);
 assert.deepEqual([1,2,3,4,5,6,7,8,30].map(day=>dailyGift(s,day,now).diamonds),[2,3,4,5,6,8,12,12,12]);
 assert.deepEqual([1,7,30].map(day=>dailyGift(vip(farmAt(30)),day,now).diamonds),[4,24,24]);
 assert.equal(DAILY_DIAMONDS.reduce((a,b)=>a+b,0),40,'the first streak week (80 before)');
});

test('daily challenges: 1 + 1 + 2; VIP still doubles them',()=>{
 assert.deepEqual(DAILY_CHALLENGE_DIAMONDS,[1,1,2]);
 assert.deepEqual(dailyTasks(farmAt(30),now).map(q=>q.diamonds),[1,1,2]);
 assert.deepEqual(dailyTasks(vip(farmAt(30)),now).map(q=>q.diamonds),[2,2,4]);
});

test('deliveries: quick 1, village 2-3, commission 4 + 1 per 4,000 coins of goods + 0-1, at most 10; VIP doubles; replacing costs 5',()=>{
 assert.equal(REPLACE_ORDER_COST,5);
 const seen={village:new Set(),commission:new Set()};
 for(const level of [16,30,50,70,90])for(let day=0;day<21;day++){
  const t=now+day*DAY_MS,s=farmAt(level),orders=dailyOrders(s,t),by=Object.fromEntries(orders.map(o=>[o.tier,o]));
  assert.equal(by.quick.diamonds,1);
  assert.ok(by.village.diamonds>=2&&by.village.diamonds<=3,`village ${by.village.diamonds}`);seen.village.add(by.village.diamonds);
  const value=Object.entries(by.commission.input).reduce((n,[k,c])=>n+ITEMS[k].sell*c,0),base=Math.min(10,4+Math.floor(value/4000));
  assert.ok(by.commission.diamonds===base||by.commission.diamonds===Math.min(10,base+1),`commission ${by.commission.diamonds} for ${value} coins of goods`);seen.commission.add(by.commission.diamonds);
  if(day===0)assert.deepEqual(dailyOrders(vip(farmAt(level)),t).map(o=>o.diamonds),orders.map(o=>o.diamonds*2),'VIP doubles');
 }
 assert.deepEqual([...seen.village].sort(),[2,3]);
 assert.ok(Math.max(...seen.commission)<=10&&Math.min(...seen.commission)>=4);
 // The biggest commission at level 90 reaches the cap of 10 (it was 18).
 const top=Math.max(...COMMISSION_POOL.map(t=>Object.entries(t.input).reduce((n,[k,c])=>n+ITEMS[k].sell*c,0)));assert.equal(Math.min(10,4+Math.floor(top/4000)+1),10);
});

test('farm events: podium 25 / 15 / 10, every other finisher 3 (since 8 Oct 2026 however many finished in the league)',()=>{
 assert.deepEqual(PODIUM.map(p=>p.diamonds),[25,15,10]);assert.equal(FINISHER_PRIZE.diamonds,3);
 assert.deepEqual(PODIUM.map(p=>p.coins),[2000,1000,500],'the podium coins stay');assert.equal(FINISHER_PRIZE.coins,100);
 const H=3600000,iso=t=>new Date(t).toISOString(),e={id:'e',starts_at:iso(now-H),ends_at:iso(now+H),settled_at:null,objectives:[{stat:'harvested',target:10}],rewards:{coins:200}};
 const rows=n=>Array.from({length:n},(_,i)=>({player_id:`p${i}`,progress:{harvested:10},actions:3,joined_at:iso(now-H),last_at:iso(now-H+(10+i)*60000)}));
 assert.deepEqual([1,2,3].map(n=>eventStandings(e,rows(n),now).map(r=>r.diamonds)),[[25],[25,15],[25,15,10]],'the podium pays with 1 to 3 finishers too (8 Oct 2026)');
 assert.deepEqual(eventStandings(e,rows(4),now).map(r=>r.diamonds),[25,15,10,3]);
 assert.deepEqual(eventStandings(e,rows(6),now).map(r=>r.diamonds),[25,15,10,3,3,3]);
 assert.deepEqual(eventStandings(e,rows(3),now).map(r=>r.coins),[2200,1200,700],'the podium coins');
 // A farmer still busy wins nothing yet.
 assert.deepEqual(eventStandings(e,[...rows(3),{...rows(1)[0],player_id:'busy',progress:{harvested:9}}],now).map(r=>r.diamonds),[25,15,10,0]);
 assert.deepEqual(FAMILY_EVENT_BONUS,{finishers:3,coins:200,diamonds:3});
});

test('the event SQL changes only the prizes of the live harvest_event_settle and can run twice',()=>{
 const body=sql=>{const i=sql.indexOf('function public.harvest_event_settle'),a=sql.indexOf('$function$',i)+10;return sql.slice(a,sql.indexOf('$function$',a));};
 const fresh=read('supabase/diamonds-2026-10-07.sql'),live=body(read('supabase/live-event-leagues.sql'));
 assert.match(fresh,/^create or replace function public\.harvest_event_settle\(p_event uuid\)$/m);assert.match(fresh,/[Ss]afe to run twice/);
 assert.doesNotMatch(fresh.replace(/^--.*$/gm,''),/\b(insert|delete|drop|alter|grant|revoke|truncate)\b/i,'nothing but the function');
 const changed=[
  [" -- podium coins are × the league's number (1–5), × 8 for the Valley Legends. Diamonds are a fixed 50, 30, 20 and 5 in every league.\n",
   " -- podium coins are × the league's number (1–5), × 8 for the Valley Legends. Diamonds are a fixed 25, 15, 10 and 3 in every league\n -- (7 Oct 2026; 50, 30, 20 and 5 before), and the podium's diamonds only where at least 4 finished in the league: else 3 for all.\n"],
  ["row_number() over(partition by league order by last_at,player_id) as rank from","row_number() over(partition by league order by last_at,player_id) as rank,count(*) over(partition by league) as finishers from"],
  ["diamonds=(case r.rank when 1 then 50 when 2 then 30 when 3 then 20 else 5 end)","diamonds=(case when r.finishers>=4 then (case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end) else 3 end)"],
  ["each get +200 coins and +5 diamonds.","each get +200 coins and +3 diamonds (+5 until 7 Oct 2026)."],
  ["set coins=p.coins+200,diamonds=p.diamonds+5","set coins=p.coins+200,diamonds=p.diamonds+3"]];
 let expected=live;for(const [from,to] of changed){assert.equal(expected.split(from).length,2,from);expected=expected.replace(from,to);}
 assert.equal(body(fresh),expected,'everything else is the live function, byte for byte');
});

test('Farm Family: chest 2 / 3 / 6 / 12, the order\'s own diamonds at most 2 and 12 a week with 2 completion diamonds, the tournament pool halved',()=>{
 assert.deepEqual(FAMILY_CHEST_TIERS.map(t=>t.diamonds),[2,3,6,12]);
 assert.deepEqual(FAMILY_CHEST_TIERS.map(t=>t.coinsPerLevel),[20,50,100,200],'the coins stay');
 assert.equal(FAMILY_CONFIG.ORDER_PLAYER_WEEK_DIAMOND_CAP,12);assert.equal(FAMILY_CONFIG.ORDER_COMPLETION_DIAMONDS,2);
 // The order's own diamonds: 1, plus 1 from 10,000 points, at most 2 (3 until 7 Oct 2026). A typical farmer's part (20,000 points)
 // pays 2 instead of 3, and a family of five's share of the completion diamonds 0.4 instead of 0.8: about 2.4 instead of 3.8.
 assert.equal(FAMILY_CONFIG.ORDER_DIAMOND_MAX,2);assert.deepEqual([500,9999,10000,20000,60000].map(p=>familyOrderPay(p).diamonds),[1,1,2,2,2]);
 const week=familyWeek(now),families=n=>{const c=emptyFamilyContext();for(let i=0;i<n;i++){c.families.push({id:`f${i}`,name:`F${i}`,emblem:'0',deleted_at:null});c.members.push({id:`p${i}`,player_id:`p${i}`,family_id:`f${i}`,role:'leader',joined_at:now,left_at:null});c.contributions.push({family_id:`f${i}`,player_id:`p${i}`,week,points:100+i,order_points:0,extra_points:0,lines:{},last_at:now});}return c;};
 assert.equal(familyTournament(emptyFamilyContext(),week).pool,50);
 assert.deepEqual([1,2,3,4,5,10,14,40,196,197,300].map(n=>familyTournament(families(n),week).pool),[50,100,150,175,200,325,425,1075,4975,5000,5000]);
});

test('the end game: fair 5 / 10 / 15 and 20, visitors 3, pumpkin 1 per 20 kg up to 20, depot 5, Seed Lab 8 and 100, projects 20 / 40 / 60',()=>{
 assert.deepEqual(FAIR_CLASSES.map(c=>c.diamonds),[5,10,15]);assert.equal(FAIR_CHAMPION_DIAMONDS,20);
 assert.equal(VISITOR_DIAMONDS,3);assert.equal(DEPOT_DIAMONDS,5);assert.equal(LAB_DISCOVER_DIAMONDS,8);assert.equal(LAB_COMPLETE_DIAMONDS,100);
 assert.deepEqual([0,19,20,99,100,231,399,400,1000].map(giantDiamonds),[0,0,1,4,5,11,19,20,20]);assert.equal(GIANT_RECORD_DIAMONDS,25,'the record bonus stays');
 assert.equal(VALLEY_PROJECT_DIAMONDS,20);
 const s=farmAt(95),id=Object.keys(VALLEY_PROJECTS)[0],paid=[];
 for(const step of VALLEY_PROJECTS[id].levels){s.valleyProjects[id].given={...step.materials};paid.push(valleyProjectFinish(s,id).diamonds);}
 assert.deepEqual(paid,[20,40,60]);
 // A fair week in full pays 50 (180 before).
 assert.equal(FAIR_CLASSES.reduce((n,c)=>n+c.diamonds,0)+FAIR_CHAMPION_DIAMONDS,50);
});

test('estate chapters: half, rounded to whole diamonds, 470 in all (940 before)',()=>{
 assert.deepEqual(CHAPTER_DIAMONDS,[5,10,18,25,37,50,63,75,87,100]);assert.equal(CHAPTER_DIAMONDS.reduce((a,b)=>a+b,0),470);
});

test('a fair class, a trailer or a visitor set out before the change pays, and shows, the new amount',()=>{
 const s=farmAt(95);assert.ok(s.fair.classes.length===3&&s.depot.contract&&s.visitors.current,'the farm has all three waiting');
 // As they were stored before 7 Oct 2026.
 s.fair.classes.forEach((c,i)=>{c.diamonds=[15,25,40][i];});s.depot.contract.diamonds=10;s.visitors.current.diamonds=15;
 normalizeFarm(s,now);
 assert.deepEqual(s.fair.classes.map(c=>c.diamonds),[5,10,15]);assert.equal(s.depot.contract.diamonds,5);assert.equal(s.visitors.current.diamonds,3);
 // And they pay it.
 const week=s.fair.week;for(const c of s.fair.classes)for(const [k,n] of Object.entries(c.input))s.inventory[k]+=n;
 const paid=[0,1,2].map(entry=>act(s,{type:'fair_enter',entry,week},now));assert.deepEqual(paid.map(r=>r.diamonds),[5,10,15]);assert.equal(paid[2].championDiamonds,20);
 const v=s.visitors.current;for(const [k,n] of Object.entries(v.input))s.inventory[k]=n;const before=s.diamonds,served=act(s,{type:'visitor_serve',visitor:v.id},now);
 assert.equal(served.diamonds,3);assert.equal(s.diamonds-before-(served.levelReward?.diamonds??0),3);
 const c=s.depot.contract;for(const [k,n] of Object.entries(c.input))s.inventory[k]=n;const shipped=act(s,{type:'depot_load',contract:c.id},now);assert.equal(shipped.diamonds,5);
 // Already earned diamonds are never taken back: nothing touches the balance.
 const rich=farmAt(95);rich.diamonds=1234;normalizeFarm(rich,now);assert.equal(rich.diamonds,1234);
});

test('unchanged: the beginner guide, the email bonus, invite a friend, VIP and boost prices',()=>{
 assert.equal(BEGINNER_REWARD,50);assert.equal(EMAIL_BONUS,10);assert.equal(INVITE_REWARD,150);
 assert.deepEqual([VIP_PLANS.week.cost,VIP_PLANS.month.cost],[500,1500]);
 assert.deepEqual(Object.values(BOOSTS).map(b=>b.cost),[50,75,100,150,200,250]);
});

// What the players read says the same (7 Oct 2026, phase 2): the event screen, the wiki, the estate screens and the tips. The event
// screen's 4-finisher line went again on 8 Oct 2026 (tests/event-podium-2026-10-08.test.mjs).
test('the texts say the new amounts: the event screen, the wiki, the estate screens, the tip and the tournament',async()=>{
 const screen=await import('../public/live-events-ui.js'),{wikiArticle}=await import('../public/wiki-content.js'),{LOADING_TIPS}=await import('../public/loading-screen.js');
 assert.deepEqual([screen.PODIUM_PRIZES,screen.FINISHER_PRIZE],[PODIUM,FINISHER_PRIZE],'the screen shows what the server pays');
 const ui=read('public/live-events-ui.js');
 assert.match(ui,/<li>Everyone who finishes wins; the sooner you finish, the more\. The list above shows what each place wins in total\.<\/li><li>You race in your league/,'How events work');
 assert.match(ui,/'Rewards if the event ended now\. The first three to finish in your league win extra coins and diamonds\.'/,'the standings caption');
 // The wiki: levels, events, visitors and the giant pumpkin.
 assert.match(wikiArticle('quests').html,/1 diamond for every 10 levels \(at least 1\)\./);assert.equal(levelReward(30).diamonds,3);
 const events=wikiArticle('events').html;assert.match(events,/win 25, 15 and 10 diamonds, every other finisher 3\./);
 const estate=wikiArticle('estate').html;
 assert.match(estate,/Deliver it within 12 hours for 1\.8× the goods’ price and 3 diamonds\. Every visitor served in a row makes the next order 10% bigger and better paid in coins/);
 assert.match(estate,/The scale pays 400 coins a kilo and 1 diamond for every 20 kg, up to 20; a new record from 100 kg adds 25 diamonds\./);
 assert.deepEqual([GIANT_KG_PER_DIAMOND,GIANT_MAX_DIAMONDS],[20,20]);assert.equal(giantDiamonds(GIANT_KG_PER_DIAMOND*GIANT_MAX_DIAMONDS*2),GIANT_MAX_DIAMONDS);
 // The estate screens read the same rules.
 const screens=read('public/estate-ui.js');
 assert.match(screens,/Deliver it within 12 hours for coins and \$\{VISITOR_DIAMONDS\} diamonds\./);
 assert.match(screens,/coins a kilo<\/b> and 1 diamond for every \$\{GIANT_KG_PER_DIAMOND\} kg, up to \$\{GIANT_MAX_DIAMONDS\}; a new record/);
 // The loading tip, and the tournament's fallback pool when the server sends none.
 assert.ok(LOADING_TIPS.some(([,text])=>text==='Finish an event with two or more members of your Farm family: you each get 200 coins and 3 diamonds extra.'));
 const week=familyWeek(now);assert.deepEqual(familyTournament(emptyFamilyContext(),week).pool,50);
 assert.match(read('public/family-tournament.js'),/p=t\.poolSteps\?\?\[50,100,150\];/);
 // No middle dots in any of them (the owner's rule).
 for(const text of LOADING_TIPS.map(([,t])=>t))assert.doesNotMatch(text,/ · /);
});
