import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TOURNAMENT_KINDS,TOURNAMENT_DEFAULTS,TOURNAMENT_LIMITS,TOURNAMENT_PRIZE_MAX,TOURNAMENT_WIDE_FROM,tournamentScoring,tournamentSettings,tournamentCounters,tournamentScore,tournamentPot,tournamentShares,tournamentPrizes} from '../game/tournament.js';
import {CROPS,ITEMS} from '../game/farm-state.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('the rules are one file, copied to the site and farm-api',()=>{
 for(const copy of ['public/tournament.js','supabase/functions/farm-api/tournament.js'])assert.equal(read(copy),read('game/tournament.js'),copy);
 assert.match(read('scripts/sync-game.mjs'),/for\(const to of \['\.\.\/public\/tournament\.js','\.\.\/supabase\/functions\/farm-api\/tournament\.js'\]\)/);
});

test('the owner\'s numbers: 2 diamonds and 2,000 coins a farmer who counts, from 10 points; at most 500 diamonds and 1,000,000 coins for one farmer',()=>{
 assert.deepEqual(TOURNAMENT_DEFAULTS,{diamondsPerPlayer:2,coinsPerPlayer:2000,maxDiamonds:2000,maxCoins:4000000,placeStep:10,minScore:10,winners:0});
 assert.deepEqual(TOURNAMENT_PRIZE_MAX,{diamonds:500,coins:1000000});
 assert.equal(TOURNAMENT_WIDE_FROM,80);
});

test('every kind scores counters the farm already keeps, and every kind but the World II and III ones is for everyone early',()=>{
 for(const [key,k] of Object.entries(TOURNAMENT_KINDS)){
  assert.ok(k.title&&k.rule&&!k.rule.includes(' · '),key);
  if(k.pick)continue;
  for(const [stat,weight] of k.score){assert.match(stat,/^(xp|[a-z_]+)$/,key);assert.ok(Number.isInteger(weight)&&weight>=1,key);}
 }
 assert.equal(Object.values(TOURNAMENT_KINDS).filter(k=>k.from>=100).length,2);
 assert.deepEqual(tournamentScoring('crop','corn',{crops:CROPS}),[['harvest_corn',1]]);
 assert.equal(tournamentScoring('crop','nope',{crops:CROPS}),null);
 assert.deepEqual(tournamentScoring('good','bread',{goods:ITEMS}),[['made_bread',1]]);
 assert.equal(tournamentScoring('nope'),null);
 assert.deepEqual(tournamentScoring('allround'),[['harvested',1],['produced',2],['chores',3],['deliveries',5]]);
});

test('settings stay within their limits; nothing sent is the defaults',()=>{
 assert.deepEqual(tournamentSettings(),TOURNAMENT_DEFAULTS);
 const s=tournamentSettings({diamondsPerPlayer:99,maxDiamonds:-5,placeStep:'12',minScore:'x'});
 assert.equal(s.diamondsPerPlayer,TOURNAMENT_LIMITS.diamondsPerPlayer[1]);assert.equal(s.maxDiamonds,0);assert.equal(s.placeStep,12);assert.equal(s.minScore,10);
});

test('the score is what the counters rose by, weighted, never below 0',()=>{
 const scoring=[['harvested',1],['produced',2],['xp',1]];
 const before=tournamentCounters({xp:100,stats:{harvested:5}},scoring),after=tournamentCounters({xp:130,stats:{harvested:9,produced:3}},scoring);
 assert.deepEqual(before,{harvested:5,produced:0,xp:100});
 assert.equal(tournamentScore(after,before,scoring),4+6+30);
 assert.equal(tournamentScore(before,after,scoring),0);
});

test('the pot and its places: top 3 below 80, one place per 10 from 80, a lower place never more than a higher, one farmer at most the cap',()=>{
 assert.deepEqual(tournamentPot(0),{counted:0,diamonds:0,coins:0,places:0});
 assert.deepEqual(tournamentShares(3),[0.5,0.3,0.2]);
 assert.deepEqual(tournamentShares(8),[0.25,0.15,0.1,0.1,0.1,0.1,0.1,0.1]);
 assert.equal(tournamentPot(79).places,3);assert.equal(tournamentPot(80).places,8);assert.equal(tournamentPot(400).places,40);
 for(const n of [1,2,3,4,20,79,80,81,137,300,999,1000,2000,5000]){
  const p=tournamentPrizes(n),pot=tournamentPot(n);
  assert.equal(p.length,pot.places,`${n}`);
  assert.ok(p.reduce((a,b)=>a+b.diamonds,0)<=pot.diamonds&&p.reduce((a,b)=>a+b.coins,0)<=pot.coins,`${n} pays no more than the pot`);
  for(let i=1;i<p.length;i++)assert.ok(p[i].diamonds<=p[i-1].diamonds&&p[i].coins<=p[i-1].coins,`${n}: place ${i+1}`);
  assert.ok(p.every(x=>x.diamonds<=500&&x.coins<=1000000),`${n} cap`);
 }
 // What the owner was shown (3 Nov 2026): 300 farmers who count.
 const p=tournamentPrizes(300);assert.deepEqual([p.length,p[0],p[1],p[2],p[3]],[30,{diamonds:150,coins:150000},{diamonds:90,coins:90000},{diamonds:60,coins:60000},{diamonds:11,coins:11111}]);
 assert.deepEqual(tournamentPrizes(1000)[0],{diamonds:500,coins:500000});
 assert.deepEqual(tournamentPrizes(5000)[0],{diamonds:500,coins:1000000});
 // A set number of winners (3 Nov 2026, the owner: "Aantal winnaars"): 50 from 80 farmers who count, the top 3 below that.
 const fifty={...TOURNAMENT_DEFAULTS,winners:50};
 assert.deepEqual([tournamentPot(79,fifty).places,tournamentPot(80,fifty).places,tournamentPot(350,fifty).places,tournamentPot(2000,fifty).places],[3,50,50,50]);
});

test('supabase/super-tournament.sql: own tables for farm-api only, the score from receipts, the same pot, the caps, the weekly plans every minute',()=>{
 const sql=read('supabase/super-tournament.sql');
 assert.match(sql,/create table if not exists public\.harvest_tournaments\(/);
 assert.match(sql,/player_id uuid not null references auth\.users\(id\) on delete cascade,/,'a deleted account takes its rows with it');
 assert.match(sql,/revoke all on public\.harvest_tournaments, public\.harvest_tournament_players from public, anon, authenticated;/);
 assert.match(sql,/check \(ends_at>starts_at and ends_at<=starts_at\+interval '72 hours'\)/);
 assert.match(sql,/if receipt is null or receipt->>'id' is not distinct from old\.receipts->-1->>'id' then return new; end if;/,'only a farm action counts');
 assert.match(sql,/exception when others then return new;\nend \$function\$;/,'a tournament never stops a farm from saving');
 assert.match(sql,/v_places:=case when n<80 then least\(3,n\) when coalesce\(\(s->>'winners'\)::integer,0\)>0 then least\(n,greatest\(3,\(s->>'winners'\)::integer\)\) else least\(n,greatest\(3,floor\(n\/\(s->>'placeStep'\)::numeric\)::integer\)\) end;/);
 assert.match(sql,/diamonds=least\(500,floor\(pd\*share\.part\)\)::integer,coins=least\(1000000,floor\(pc\*share\.part\)\)::integer/);
 assert.match(sql,/select cron\.schedule\('harvest-tournament-autostart','\* \* \* \* \*','select public\.harvest_tournament_autostart\(\)'\);/);
 assert.doesNotMatch(sql,/public\.live_event/,'the hourly events are not touched');
 // Random plans (3 Nov 2026, the owner): up to 3 a week, any minute of the day, 24 to 48 hours, waiting while another runs.
 assert.match(sql,/\(\('x'\|\|substr\(md5\(p_plan::text\|\|p_week::text\|\|'m'\|\|d\),1,8\)\)::bit\(32\)::bigint%1440\)/);
 assert.match(sql,/24\+\(\('x'\|\|substr\(md5\(p_plan::text\|\|p_week::text\|\|'h'\|\|d\),1,8\)\)::bit\(32\)::bigint%25\)::integer/);
 assert.match(sql,/where not \(e->>'kind'=any\(coalesce\(recent,'\{\}'\)\)\) order by random\(\) limit 1;/,'never one of the last three kinds');
});

test('farm-api: its two requests, the admin\'s only for the superadmin, News with the finish flag in every language',async()=>{
 const index=read('supabase/functions/farm-api/index.ts');
 assert.match(index,/if\(body\.operation==='tournament'\|\|body\.operation==='admin_tournament'\)\{const r=await handleTournament\(\{admin,body,user\}\);return reply\(r\.data,r\.status\);\}/);
 const {handleTournament,TOURNAMENT_NEWS,validateTournament,validatePlan}=await import('../supabase/functions/farm-api/tournament-service.js');
 const r=await handleTournament({admin:{},body:{operation:'admin_tournament',command:'start'},user:{id:'u',email:'someone@example.com'}});
 assert.equal(r.status,403);
 assert.equal(TOURNAMENT_NEWS.texts.art,'tournament');
 assert.deepEqual(Object.keys(TOURNAMENT_NEWS.texts).filter(k=>k!=='art').sort(),['ar','cs','de','es','fr','hi','hu','id','ja','nl','pt','ru','tr','uk','zh']);
 assert.equal(validateTournament({kind:'harvest',hours:24}).title,'Harvest Champion');
 assert.throws(()=>validateTournament({kind:'harvest',hours:73}),/1 to 72 hours/);
 assert.throws(()=>validateTournament({kind:'crop',hours:2}),/Choose a crop/);
 assert.deepEqual(validateTournament({kind:'crop',pick:'corn',hours:2}).scoring,[['harvest_corn',1]]);
 assert.throws(()=>validatePlan({kind:'harvest',hours:2,weekday:7,atMinute:0}),/day of the week/);
 assert.equal(validatePlan({kind:'harvest',hours:2,weekday:3,atMinute:556}).atMinute,556,'Wednesday 09:16 UTC');
 const random=validatePlan({kind:'random',perWeek:3});
 assert.deepEqual([random.kind,random.perWeek,random.pool.length],['random',3,12]);
 assert.throws(()=>validatePlan({kind:'random',perWeek:4}),/1 to 3 tournaments a week/);
 assert.equal(validateTournament({kind:'random',hours:24,recent:[]},()=>0).kind,'harvest','a random start takes a kind from the pool');
});

test('the game: a header button and a More tile that show only when there is something, News with the flag, the wiki section',async()=>{
 const html=read('public/farm.html');
 assert.match(html,/<button class="icon-button" id="tournament-button" aria-label="Open the Super Tournament" aria-haspopup="dialog" title="Super Tournament" hidden><i data-game-art="tournament"><\/i><span id="tournament-dot" aria-hidden="true" hidden>!<\/span><\/button>/);
 assert.match(html,/<button data-menu-action="tournament-button" id="tournament-menu-entry" hidden>/);
 assert.match(read('public/game.js'),/createTournamentUI\(\{notify:toast,refreshFarm:\(\)=>client\.refresh\(\),/);
 assert.match(read('src/chat-ui.js'),/n\.kind==='news'&&n\.texts\?\.art==='tournament'\?art\('tournament'\)/);
 assert.match(read('public/visual-icons.js'),/for\(const key of \['tournament','tournament-winner'\]\)\{pictures\[key\]=key;webpPictures\.add\(key\);\}/);
 const {prizeWords}=await import('../public/tournament-ui.js');
 assert.equal(prizeWords({diamonds:1,coins:2000}),'1 diamond and 2,000 coins');assert.equal(prizeWords({diamonds:0,coins:0}),'');
 const {wikiArticle}=await import('../public/wiki-content.js');
 const events=wikiArticle('events').html;
 assert.match(events,/id="sec-super-tournament"/);
 assert.match(events,/First place wins 150 diamonds and 150,000 coins/);
});

test('the admin card: on Money, the kinds with their levels, weekly plans in UTC',async()=>{
 const {WEEKDAYS,clock,kindLabel,potExample}=await import('../src/admin-tournament.js');
 assert.equal(WEEKDAYS[3],'Wednesday');assert.equal(clock(556),'09:16');
 assert.equal(kindLabel('crop','corn'),'Crop Tournament: Corn');
 assert.match(potExample(TOURNAMENT_DEFAULTS),/^50 farmers: #1 50 diamonds and 50,000 coins, 3 winning places\. 300 farmers: #1 150 diamonds/);
 assert.match(read('src/admin-dashboard.js'),/if\(role==='admin'\)void tournamentCard\.show\(\);/);
});
