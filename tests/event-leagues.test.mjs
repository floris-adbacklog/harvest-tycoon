import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {EVENT_LEAGUES,eventLeague,CROP_LEVELS,BUILDING_LEVELS,FEATURE_LEVELS,RECIPES,RECIPE_LEVELS,itemUnlockLevel} from '../public/farm-state.js';
import {EVENT_GOAL_POOLS,EVENT_GOAL_TITLES} from '../public/event-goals.js';
import {EVENT_GOALS} from '../public/live-events-ui.js';
import {eventStandings} from '../supabase/functions/farm-api/event-service.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const H=3600000,now=Date.parse('2026-10-01T12:00:00Z'),iso=t=>new Date(t).toISOString();

test('six leagues from level 15, each with its levels, badge and coins: ×1 to ×5, and ×8 for the Valley Legends',()=>{
 assert.deepEqual(EVENT_LEAGUES.map(l=>[l.id,l.from,l.to,l.coins]),[['sprout',15,29,1],['meadow',30,44,2],['orchard',45,59,3],['harvest',60,74,4],['estate',75,89,5],['legends',90,null,8]]);
 assert.deepEqual([15,29,30,44,45,60,75,89,90,200].map(n=>eventLeague(n).id),['sprout','sprout','meadow','meadow','orchard','harvest','estate','estate','legends','legends']);
 for(const l of EVENT_LEAGUES)assert.ok(existsSync(new URL(`../public/assets/icons/league-${l.id}.webp`,import.meta.url)),`badge for ${l.id}`);
});

test('standings per league: the podium is the league\'s own, coins × the league, diamonds the same, the league\'s own goals',()=>{
 const legends=EVENT_LEAGUES[5];
 const e={id:'e',starts_at:iso(now-H),ends_at:iso(now+H),objectives:[{stat:'harvested',target:10}],leagues:[...Array(5).fill({objectives:[{stat:'harvested',target:10}]}),{objectives:[{stat:'made_cloth',target:2}]}],rewards:{coins:200}};
 const rows=['a','b','c','d'].map((id,i)=>({player_id:id,progress:{made_cloth:2,harvested:0},actions:5,joined_at:iso(now-H),last_at:iso(now-H+(20+i)*60000)}));
 // Four finishers: the podium's diamonds (25 / 15 / 10 since 7 Oct 2026; 50 / 30 / 20 before) and 3 for the fourth.
 assert.deepEqual(eventStandings(e,rows,now,legends).map(r=>[r.coins,r.diamonds,r.podium]),[[17600,25,true],[9600,15,true],[5600,10,true],[2400,3,false]]);
 assert.deepEqual(eventStandings(e,rows,now,EVENT_LEAGUES[0]).map(r=>r.finished),[false,false,false,false],'the Sprout League needs its own goal');
});

test('every league draws its own goals, open from its first level, with bigger numbers higher up; the Sprout League keeps today\'s',()=>{
 assert.equal(EVENT_GOAL_POOLS.length,EVENT_LEAGUES.length);
 // A goal must be possible from the league's first level, and a batch for it must fit well inside the 5 hours of an event.
 // 9 Oct 2026: the goals that need a feature or a recipe count too, since unlocks moved later (chores 10 -> 15, fertilizer 9 -> 14).
 const feature={chores:'chores',activities:'activities',activity_rounds:'activities',deliveries:'cart',mastery_medals:'mastery',boosts_used:'boosts',diamonds_spent:'boosts',dailies:'challenges'};
 const openAt=stat=>stat==='glasshouse_batches'?BUILDING_LEVELS.glasshouse:stat==='valley_baskets'?FEATURE_LEVELS.valleymarket:stat==='tractor'?FEATURE_LEVELS.tractor
  :feature[stat]?FEATURE_LEVELS[feature[stat]]:stat==='fertilized'?RECIPE_LEVELS.fertilizer
  :stat.startsWith('sold_')?itemUnlockLevel(stat.slice(5))
  :stat.startsWith('harvest_')?CROP_LEVELS[stat.slice(8)]??1:stat.startsWith('made_')?itemUnlockLevel(stat.slice(5)):1;
 const batch=stat=>stat.startsWith('made_')?Math.min(...Object.entries(RECIPES).filter(([,r])=>r.output[stat.slice(5)]&&r.building!=='factory').map(([,r])=>r.duration)):0;
 for(const [i,pool] of EVENT_GOAL_POOLS.entries()){
  const league=EVENT_LEAGUES[i];assert.equal(pool.length,5,`${league.id}: five groups`);
  const stats=pool.flat().map(g=>g.stat);assert.equal(new Set(stats).size,stats.length,`${league.id}: a goal kind once`);
  for(const {stat,targets} of pool.flat()){
   assert.ok(EVENT_GOAL_TITLES[stat]?.length>=2,`${stat}: titles`);assert.ok(EVENT_GOALS[stat],`${stat}: a name on the event screen`);
   assert.ok(targets.length===3&&targets[0]>0&&targets[0]<=targets[1]&&targets[1]<=targets[2],`${league.id} ${stat}: easy ≤ medium ≤ hard`);
   assert.ok(openAt(stat)<=league.from,`${league.id} ${stat}: open at level ${league.from} (opens at ${openAt(stat)})`);
   assert.ok(batch(stat)<=4*H,`${league.id} ${stat}: a batch takes at most 4 hours`);
  }
 }
 const old=read('supabase/live-events-mixed.sql')+read('supabase/live-events-sell-wheat.sql'),sprout=EVENT_GOAL_POOLS[0].flat();
 // 10 Oct 2026: four Sprout goals that almost nobody finished ask less, and vegetable boxes left Sprout (event-goals.js KINDS).
 const lowered={fertilized:[2,3,5],harvest_cauliflower:[4,6,10],diamonds_spent:[10,10,20],activities:[3,4,8]};
 for(const [stat,targets] of Object.entries(lowered))assert.deepEqual(sprout.find(g=>g.stat===stat)?.targets,targets,`Sprout ${stat} since 10 Oct`);
 assert.ok(!sprout.some(g=>g.stat==='made_vegetables'),'vegetable boxes from the Meadow League');
 for(const {stat,targets} of sprout.filter(g=>old.includes(`"stat":"${g.stat}"`)&&g.stat!=='boosts_used'&&!lowered[g.stat]))assert.match(old,new RegExp(`"stat":"${stat}","targets":\\[${targets.join(',')}\\]`),`Sprout keeps ${stat} as before`);
 // Higher leagues ask more of the goals they share with the league below.
 for(let i=1;i<EVENT_GOAL_POOLS.length;i++){
  const below=new Map(EVENT_GOAL_POOLS[i-1].flat().map(g=>[g.stat,g.targets]));
  for(const {stat,targets} of EVENT_GOAL_POOLS[i].flat())if(below.has(stat))assert.ok(targets[1]>=below.get(stat)[1],`${EVENT_LEAGUES[i].id} ${stat} at least the league below`);
 }
});

test('the database draws exactly these goals per league, counts the league\'s own and settles per league',()=>{
 const goals=read('supabase/live-event-league-goals.sql'),leagues=read('supabase/live-event-leagues.sql');
 const json=JSON.stringify(EVENT_GOAL_POOLS.map(l=>l.map(g=>g.map(({stat,targets})=>({stat,targets,titles:EVENT_GOAL_TITLES[stat]}))))).replaceAll("'","''");
 assert.ok(goals.includes(`pools constant jsonb:='${json}';`),'run node scripts/event-goals-sql.mjs after changing public/event-goals.js');
 assert.match(goals,/insert into public\.live_events\(id,title,description,starts_at,ends_at,active,objectives,rewards,created_by,leagues\)/);
 // 4 Oct 2026: the check on new events refused the leagues' new goals, and the schedule skipped those events without a word.
 const allowed=goals.slice(goals.indexOf('function public.harvest_event_validate()')).match(/not in \(([^)]*)\)/)[1].split(',').map(s=>s.replace(/'/g,''));
 for(const {stat} of EVENT_GOAL_POOLS.flat(2))assert.ok(allowed.includes(stat),`the event check allows ${stat}`);
 assert.match(leagues,/objs:=coalesce\(e\.leagues->lg->'objectives',e\.objectives\);/,'progress counts the league\'s goals');
 assert.match(leagues,/\(stat='glasshouse_batches' and action in \('collect','collect_all'\)\) or \(stat='valley_baskets' and action='valley_sell'\)/);
 assert.match(leagues,/qualified=\(not exists\(select 1 from jsonb_array_elements\(coalesce\(e\.leagues->p\.league->'objectives',e\.objectives\)\)/);
 assert.match(leagues,/row_number\(\) over\(partition by league order by last_at,player_id\)/);
 const bonus=leagues.slice(leagues.indexOf('with fam as'),leagues.indexOf('update public.live_events set settled_at'));
 assert.doesNotMatch(bonus,/league/,'the family bonus counts finishers from every league');assert.match(bonus,/having count\(\*\)>=3/);
 assert.match(leagues,/\*\(case r\.league when 5 then 8 else r\.league\+1 end\)/);
 assert.match(leagues,/revoke all on function public\.harvest_event_board\(uuid\) from public, anon, authenticated;/);
});

test('the event screen shows your league, its badge and its own goals; it is called Events',()=>{
 const ui=read('public/live-events-ui.js'),html=read('public/farm.html');
 assert.match(ui,/<img src="\/assets\/icons\/league-\$\{l\.id\}\.webp"/);
 assert.match(ui,/const view=eventView\(data\.events,now\(\)\),live=view\.live&&leagueGoals\(view\.live\),next=view\.next&&leagueGoals\(view\.next\);/);
 assert.match(ui,/<h2 id="events-title">Events<\/h2>/);assert.match(html,/<span><strong>Events<\/strong><small id="mobile-events-hint">/);
 assert.doesNotMatch(ui+html,/>Farm events</);
});

// 9 Oct 2026: a helping-hand stop rests an hour (15 minutes before). What an event or a daily challenge asks of it must fit: at most
// two visits an hour apart (8 jobs or 2 rounds in an event of 5 hours, a stop twice in a day), and the live patch makes exactly these.
test('helping-hand goals fit the hour-long rests: events ask at most 8 jobs or 2 rounds in every league, a daily a stop at most twice',async()=>{
 const {ACTIVE_STATIONS,DAILY_POOLS,CHORES}=await import('../public/farm-state.js');
 const stops=Object.keys(ACTIVE_STATIONS).length,rest=Math.max(...Object.values(ACTIVE_STATIONS).map(s=>s.cooldown));
 assert.equal(rest,H);
 for(const [i,pool] of EVENT_GOAL_POOLS.entries())for(const {stat,targets} of pool.flat()){
  if(stat==='activities')assert.ok(targets[2]<=2*stops,`${EVENT_LEAGUES[i].id}: ${targets[2]} jobs is more than two visits`);
  if(stat==='activity_rounds')assert.ok(targets[2]<=2,`${EVENT_LEAGUES[i].id}: ${targets[2]} rounds is more than two visits`);
  // Chores: the hardest number within an hour for a farm with every chore open (the leagues from 30 up) or only the first (Sprout).
  if(stat==='chores'){const first=Math.floor(H/CHORES.weeds.cooldown);assert.ok(targets[2]<=(i?Object.keys(CHORES).length+first:first+1),`${EVENT_LEAGUES[i].id} chores ${targets[2]}`);}
 }
 for(const q of DAILY_POOLS.flat()){
  if(/^activity_(greenhouse|apiary|paddock|workshop)$/.test(q.stat))assert.ok(q.target<=2,`${q.title}: one stop ${q.target} times a day`);
  if(q.stat==='activities')assert.ok(q.target<=2*stops,q.title);if(q.stat==='activity_rounds')assert.ok(q.target<=2,q.title);
 }
 const patch=read('supabase/event-goals-2026-10-10.sql'),goals=read('supabase/live-event-league-goals.sql');   // the newest live patch
 const pools=goals.slice(goals.indexOf("pools constant jsonb:='")+23,goals.indexOf("';\n",goals.indexOf("pools constant jsonb:='")));
 const {createHash}=await import('node:crypto'),md5=createHash('md5').update(pools).digest('hex');
 // The live patch edits the live list and only applies it when the result is exactly the goals of live-event-league-goals.sql.
 assert.match(patch,new RegExp(`if md5\\(pools\\)<>'${md5}' then raise exception using message='the new goals do not come out`),'the live patch ends on exactly these goals');assert.match(patch,new RegExp(`if md5\\(pools\\)='${md5}' then raise notice`),'a second run does nothing');
});

// 9 Oct 2026 (found in review): a goal must be doable by a farmer who has only just reached the league, within the 5 hours of an event.
// A crop or recipe that opens at the league's own first level cannot be in the barn yet, so its whole chain counts: red cabbage (12 h)
// and pickles both open at 15, so pickles join from the Meadow League.
test('every goal can be made from scratch within an event by a farmer who has just reached the league',async()=>{
 const {RECIPES,CROPS,CROP_LEVELS,RECIPE_LEVELS,ACTIVE_STATIONS}=await import('../public/farm-state.js');
 for(const [i,pool] of EVENT_GOAL_POOLS.entries()){
  const from=EVENT_LEAGUES[i].from;
  // The goal's own batch always runs in the event; an ingredient that opened before this level can be in the barn already, one that
  // opens at this level has to be grown or made first (the fastest way).
  const ways=item=>Object.entries(RECIPES).filter(([id,r])=>r.output[item]&&r.building!=='factory'&&(RECIPE_LEVELS[id]??1)<=from);
  const make=(item,seen)=>Math.min(...ways(item).map(([,r])=>r.duration+Math.max(0,...Object.keys(r.input).map(k=>ready(k,seen)))));
  const ready=(item,seen=new Set())=>{
   if(CROPS[item])return CROP_LEVELS[item]<from?0:CROPS[item].duration;
   // The helping hand's stops give lettuce, honey, fertilizer and feed from level 8.
   if(Object.values(ACTIVE_STATIONS).some(a=>a.item===item)&&FEATURE_LEVELS.activities<from)return 0;
   if(ways(item).some(([id])=>(RECIPE_LEVELS[id]??1)<from)||seen.has(item))return 0;
   return make(item,new Set([...seen,item]));
  };
  for(const {stat} of pool.flat())if(stat.startsWith('made_')){const t=make(stat.slice(5),new Set([stat.slice(5)]));assert.ok(t<=5*H,`${EVENT_LEAGUES[i].id}: ${stat} takes ${(t/H).toFixed(1)} h from scratch`);}
 }
 assert.ok(!EVENT_GOAL_POOLS[0].flat().some(g=>g.stat==='made_pickles'),'no pickles in the Sprout League');
 assert.ok(EVENT_GOAL_POOLS[1].flat().some(g=>g.stat==='made_pickles'),'pickles from the Meadow League');
});
