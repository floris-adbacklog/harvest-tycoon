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
 assert.deepEqual(eventStandings(e,rows,now,legends).map(r=>[r.coins,r.diamonds,r.podium]),[[17600,50,true],[9600,30,true],[5600,20,true],[2400,5,false]]);
 assert.deepEqual(eventStandings(e,rows,now,EVENT_LEAGUES[0]).map(r=>r.finished),[false,false,false,false],'the Sprout League needs its own goal');
});

test('every league draws its own goals, open from its first level, with bigger numbers higher up; the Sprout League keeps today\'s',()=>{
 assert.equal(EVENT_GOAL_POOLS.length,EVENT_LEAGUES.length);
 // A goal must be possible from the league's first level, and a batch for it must fit well inside the 5 hours of an event.
 const openAt=stat=>stat==='glasshouse_batches'?BUILDING_LEVELS.glasshouse:stat==='valley_baskets'?FEATURE_LEVELS.valleymarket:stat==='tractor'?FEATURE_LEVELS.tractor
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
 for(const {stat,targets} of sprout.filter(g=>old.includes(`"stat":"${g.stat}"`)&&g.stat!=='boosts_used'))assert.match(old,new RegExp(`"stat":"${stat}","targets":\\[${targets.join(',')}\\]`),`Sprout keeps ${stat} as before`);
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
