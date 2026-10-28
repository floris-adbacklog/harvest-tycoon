// Hourly events (20 Oct 2026, the owner): a new event every hour, on the hour: 55 minutes of play, then 5 minutes for the prizes. One
// goal per league, about a fifth of the 5-hour medium goal. Diamonds only: 8 / 5 / 3 for the first three in a league (10 in the spec;
// the owner made it 8 the same day), 1 for every other finisher, +3 each when 3 or more of one Farm family finish. They count in
// events_finished. A pause switch for releases. No push. The live switch is supabase/hourly-events.sql (scripts/hourly-events-sql.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
globalThis.window??={};
const {EVENT_LEAGUES,HOUR_EVENT_REWARDS,FAMILY_EVENT_BONUS,eventPrizes,RECIPES,RECIPE_LEVELS,CROPS,createFarm,xpForLevel,normalizeFarm}=await import('../game/farm-state.js');
const {EVENT_GOAL_POOLS,EVENT_HOUR_POOLS,EVENT_HOUR_POOLS_BEFORE_ONE_CROP,HARVEST_GOAL_FACTOR,HOUR_LEFT_OUT,HOUR_SHARE,LAKE_FISH_PER_HOUR,EVENT_GOAL_TITLES}=await import('../public/event-goals.js');
const {eventStandings,validateEvent,withPlayerRows}=await import('../supabase/functions/farm-api/event-service.js');
const {hourlyEventsSql,NEW_MD5,LIVE_MD5,HOUR_SETTLE_BODY,SCHEDULE_BODY,PAUSE_BODY,REWARDS_JSON,LEGACY_LINES}=await import('../scripts/hourly-events-sql.mjs');
const {PICK_BODY,VALIDATE_BODY,HOUR_PICK_BODY,HOUR_VALIDATE_BODY,HOUR_STATS}=await import('../scripts/event-goals-sql.mjs');
const PARTB=await import('../scripts/world-two-leagues-sql.mjs');
const {createLiveEventsUI,EVENT_GOALS}=await import('../public/live-events-ui.js');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const md5=text=>createHash('md5').update(text).digest('hex');
const SQL=read('supabase/hourly-events.sql');
const body=name=>{const at=SQL.indexOf(`create or replace function public.${name}(`);assert.ok(at>=0,name);const from=SQL.indexOf('$function$',at)+10;return SQL.slice(from,SQL.indexOf('$function$',from));};
const nice=x=>x<20?Math.max(1,Math.round(x)):x<100?Math.round(x/5)*5:x<1000?Math.round(x/10)*10:Math.round(x/100)*100;
const H=3600000,M=60000,iso=t=>new Date(t).toISOString();

test('the hour pools: 12 leagues of 5 groups, never empty, a fifth of the medium goal, at most 3 lake fish, nothing left out',()=>{
 assert.equal(HOUR_SHARE,5);assert.equal(LAKE_FISH_PER_HOUR,3);
 assert.equal(EVENT_HOUR_POOLS.length,EVENT_LEAGUES.length);
 for(const [i,pool] of EVENT_HOUR_POOLS.entries()){
  const l=EVENT_LEAGUES[i];assert.equal(pool.length,5,l.id);
  for(const [k,group] of pool.entries())assert.ok(group.length>0,`${l.id}: group ${k} has a goal (harvest_event_pick divides by its size)`);
  for(const {stat,target} of pool.flat()){
   const medium=EVENT_GOAL_POOLS[i].flat().find(g=>g.stat===stat).targets[1];
   // One crop a harvest (22 Oct 2026): an hour's harvest goal asks twice as many.
   assert.equal(target,Math.min(stat==='lake_fish'?3:Infinity,nice(medium/5))*(stat==='harvested'?HARVEST_GOAL_FACTOR:1),`${l.id} ${stat}`);
   assert.ok(target>=1&&!HOUR_LEFT_OUT[stat],`${l.id} ${stat}`);
   assert.ok(EVENT_GOAL_TITLES[stat]?.length>=2&&EVENT_GOALS[stat],stat);
  }
 }
 // The owner's list and the three added by default (spec §9.1): never drawn.
 for(const stat of ['valley_baskets','boat_trips','diamonds_spent','sold_wheat','sold_cheese','sold_eggs','harvest_cabbage','glasshouse_batches','made_orchardsalad','made_pickaxe','made_linen','made_ironbar','made_rubyring'])
  assert.ok(!HOUR_STATS.includes(stat),stat);
 assert.equal(HOUR_STATS.length,40,'40 kinds in all');
});

test('every hour goal fits in the hour: a crop or the fastest non-Factory batch open at the league\'s first level takes under 60 minutes',()=>{
 const batch=(stat,level)=>Math.min(...Object.entries(RECIPES).filter(([k,r])=>r.output[stat.slice(5)]&&r.building!=='factory'&&(RECIPE_LEVELS[k]??0)<=level).map(([,r])=>r.duration));
 for(const [i,pool] of EVENT_HOUR_POOLS.entries()){
  const l=EVENT_LEAGUES[i];
  for(const {stat} of pool.flat()){
   if(stat.startsWith('harvest_'))assert.ok(CROPS[stat.slice(8)].duration<H,`${l.id} ${stat}`);
   if(stat.startsWith('made_')){const ms=batch(stat,l.from);assert.ok(ms<H,`${l.id} ${stat}: ${ms/M} min`);}
  }
 }
});

test('a snapshot of the Sprout League and the Village Legends (spec §2.5.1)',()=>{
 const row=i=>EVENT_HOUR_POOLS[i].map(g=>g.map(k=>`${k.stat} ${k.target}`).join(', '));
 assert.deepEqual(row(0),['harvested 16, planted 8, watered 4, tended 2, fertilized 1','harvest_wheat 20, harvest_corn 8, harvest_lettuce 9, harvest_barley 5',
  'made_eggs 7, made_feed 6, made_milk 4, made_cheese 1, made_flour 6, produced 2, made_grainmeal 2, made_bread 2, parallel_batches 2, made_salad 2, made_fertilizer 2',
  'sold 20, earned 240, coins_spent 160','chores 1, activities 1, upgrades 1, activity_rounds 1']);
 assert.deepEqual(row(11),['made_stone 18, made_ironore 20, made_timber 25, made_clay 20','made_packedlunch 12, made_potatoes 30','village_batches 17, made_plank 7, made_rooftile 8',
  'village_requests 1','lake_fish 2, upgrades 1']);
});

// The rewards the first hourly events were made with (diamonds only, 20 Oct 2026), frozen in scripts/hourly-events-sql.mjs. Since later
// that day HOUR_EVENT_REWARDS has coins too (tests/hourly-coins.test.mjs).
const FIRST_HOUR_REWARDS=JSON.parse(REWARDS_JSON);
test('the prizes: diamonds only, 8 / 5 / 3 and 1, +3 for the family, in the first hourly events; an older event keeps its own',()=>{
 assert.deepEqual(FIRST_HOUR_REWARDS,{coins:0,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50,podium:[8,5,3],finisher:1,familyFinishers:3,familyDiamonds:3});
 assert.deepEqual(FAMILY_EVENT_BONUS,{finishers:HOUR_EVENT_REWARDS.familyFinishers,coins:HOUR_EVENT_REWARDS.familyCoins,diamonds:HOUR_EVENT_REWARDS.familyDiamonds});
 assert.deepEqual(eventPrizes(FIRST_HOUR_REWARDS),{hour:true,coins:0,podium:[{coins:0,diamonds:8},{coins:0,diamonds:5},{coins:0,diamonds:3}],finisher:{coins:0,diamonds:1},family:{finishers:3,coins:0,diamonds:3},paysCoins:false});
 assert.deepEqual(eventPrizes({coins:200,diamondMin:1}),{hour:false,coins:200,podium:[{coins:2000,diamonds:25},{coins:1000,diamonds:15},{coins:500,diamonds:10}],finisher:{coins:100,diamonds:3},family:{finishers:3,coins:200,diamonds:3},paysCoins:true});
 assert.equal(eventPrizes(null).hour,false);assert.equal(eventPrizes({podium:[8,'x',-2],finisher:null}).podium[1].diamonds,5,'a broken number falls back');
});

test('farm-api standings: a first hourly event gives 8 / 5 / 3 / 1 diamonds and no coins in every league; an older one as before',()=>{
 const now=Date.UTC(2026,9,20,13,30),rows=n=>Array.from({length:n},(_,i)=>({player_id:`p${i}`,progress:{harvested:10},actions:3,joined_at:iso(now-20*M),last_at:iso(now-20*M+i*M)}));
 const hour={id:'h',starts_at:iso(now-30*M),ends_at:iso(now+25*M),settled_at:null,objectives:[{stat:'harvested',target:10}],leagues:Array(12).fill({objectives:[{stat:'harvested',target:10}]}),rewards:FIRST_HOUR_REWARDS};
 for(const i of [0,5,8])assert.deepEqual(eventStandings(hour,rows(5),now,EVENT_LEAGUES[i]).map(r=>[r.diamonds,r.coins,r.podium]),[[8,0,true],[5,0,true],[3,0,true],[1,0,false],[1,0,false]],EVENT_LEAGUES[i].id);
 const old={...hour,leagues:null,rewards:{coins:200,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50}};
 assert.deepEqual(eventStandings(old,rows(4),now,EVENT_LEAGUES[5]).map(r=>[r.diamonds,r.coins]),[[25,17600],[15,9600],[10,5600],[3,2400]]);
 // Settled: what settle stored.
 assert.deepEqual(eventStandings({...hour,settled_at:iso(now)},[{...rows(1)[0],qualified:true,coins:0,diamonds:11}],now).map(r=>[r.diamonds,r.coins]),[[11,0]]);
 // An event made by hand pays like an hourly one.
 assert.deepEqual(validateEvent({title:'Hand made',description:'',starts_at:iso(now+H),ends_at:iso(now+2*H),objectives:[{stat:'harvested',target:5}],rewards:{coins:300}},now).rewards.podium,[8,5,3]);
 assert.equal(validateEvent({title:'Hand made',description:'',starts_at:iso(now+H),ends_at:iso(now+2*H),objectives:[{stat:'harvested',target:5}],rewards:{coins:300}},now).rewards.coins,HOUR_EVENT_REWARDS.coins);
});

test('farm-api lists the events in at most 4 queries: 1 live, 2 next and 3 past',async()=>{
 const now=Date.UTC(2026,9,20,13,30),calls=[];
 const ev=(id,start,settled)=>({id,starts_at:iso(start),ends_at:iso(start+55*M),active:true,settled_at:settled?iso(start+55*M):null,participants:settled?7:null,rewards:HOUR_EVENT_REWARDS});
 const list=[ev('next2',Date.UTC(2026,9,20,15)),ev('next1',Date.UTC(2026,9,20,14)),ev('live',Date.UTC(2026,9,20,13)),ev('p1',Date.UTC(2026,9,20,12),true),ev('p2',Date.UTC(2026,9,20,11),true),ev('p3',Date.UTC(2026,9,20,10),true)];
 const q=(table,result)=>{const call={table,ops:[]};calls.push(call);const me={select(...a){call.ops.push(['select',...a]);return me;},eq(...a){call.ops.push(['eq',...a]);return me;},in(...a){call.ops.push(['in',...a]);return me;},is(){return me;},gt(){return me;},order(){return me;},limit(){return me;},single(){return me;},maybeSingle(){return me;},then:(ok,no)=>Promise.resolve(result(call)).then(ok,no)};return me;};
 const admin={from:table=>q(table,call=>table==='live_events'?{data:list}:call.ops.some(o=>o[0]==='select'&&o[2]?.head)?{count:12}:{data:[{event_id:'p1',player_id:'u',qualified:true,coins:0,diamonds:8}]}),rpc:name=>{calls.push({rpc:name});return Promise.resolve({data:null});}};
 const {playerEvents}=await import('../supabase/functions/farm-api/event-service.js');
 const listed=await playerEvents(admin,{id:'u'},now);
 const events=await withPlayerRows(admin,{id:'u'},listed.data,now);
 assert.ok(calls.length<=4,`${calls.length} queries`);
 assert.equal(calls.filter(c=>c.rpc).length,0,'nothing to settle, nothing to schedule');
 assert.deepEqual(events.map(e=>[e.id,e.participants,e.player?.diamonds??null]),[['next2',0,null],['next1',0,null],['live',12,null],['p1',7,8],['p2',7,null],['p3',7,null]]);
 const src=read('supabase/functions/farm-api/event-service.js');
 assert.match(src,/\.in\('event_id',events\.map\(e=>e\.id\)\)\.eq\('player_id',user\.id\)/,'the farmer\'s rows in one query');
});

test('the SQL file: guard, table check, pause, pick, settle, schedule, cron and the after-check',()=>{
 assert.equal(SQL,hourlyEventsSql(),'run node scripts/hourly-events-sql.mjs');
 assert.match(SQL,/^begin;\nset local lock_timeout='5s';\ndo \$guard\$/m);assert.match(SQL,/\nend \$after\$;\ncommit;\n$/);
 // Guard: Part B's bodies, the paused (or 6-hour) schedule, the claim, or already this file's own.
 const guard=JSON.parse(SQL.match(/do \$guard\$\ndeclare want jsonb:='([^']*)'/)[1]);
 for(const name of ['harvest_event_league(integer)','harvest_event_league_for(integer,jsonb,smallint)','harvest_event_progress()','harvest_event_board(uuid)','harvest_event_pick(bigint)','harvest_event_validate()','harvest_event_settle(uuid)'])
  assert.ok(guard[name].includes(PARTB.NEW_MD5[name]),`${name}: Part B's body`);
 assert.deepEqual(guard['harvest_event_schedule()'].slice(0,2),['d280ae236ddae469437e80ef2bade5d9','aecdec923a2d0ef6fd71eb320e1b3482']);
 assert.deepEqual(guard['harvest_event_claim(uuid,uuid)'],['de2cdc930a667bc9c80f3737fca9929c']);
 for(const [name,hash] of Object.entries(NEW_MD5))if(guard[name])assert.ok(guard[name].includes(hash),`${name}: a second run`);
 assert.match(SQL,/if exists\(select 1 from public\.live_events where active and starts_at<=now\(\) and ends_at>now\(\)\) then\n  raise exception 'An event is running/);
 assert.match(SQL,/to_regprocedure\('public\.harvest_event_league_for\(integer,jsonb,smallint\)'\) is null then\n  raise exception 'Run World 2 leagues Part B/);
 assert.match(SQL,/perform public\.harvest_event_settle\(id\) from public\.live_events where ends_at<=now\(\) and settled_at is null;\nend \$guard\$;/);
 // The table check: 30 minutes to 12 hours.
 assert.match(SQL,/add constraint live_events_check check \(ends_at>=starts_at\+interval '30 minutes' and ends_at<=starts_at\+interval '12 hours'\);/);
 // Schedule.
 const s=body('harvest_event_schedule');
 for(const part of ["/3600)::bigint","starts:=to_timestamp(n*3600);","starts+interval '55 minutes'","md5('harvest-hour-event:'||n)::uuid","continue when starts<now()-interval '5 minutes' or starts<paused;",
  "and (e.ends_at-e.starts_at>interval '55 minutes' or e.starts_at<paused)","when raise_exception or unique_violation then null;",`rewards constant jsonb:='${REWARDS_JSON}';`])assert.ok(s.includes(part),part);
 // The rewards as this file ran (diamonds only), frozen: HOUR_EVENT_REWARDS has the coins since (supabase/hourly-coins.sql).
 assert.equal(REWARDS_JSON,'{"coins":0,"diamondMin":1,"diamondMax":1,"participantStep":25,"poolCap":50,"podium":[8,5,3],"finisher":1,"familyFinishers":3,"familyDiamonds":3}');
 assert.equal(s,SCHEDULE_BODY);
 // Settle: the hourly branch, Part B's legacy lines byte for byte, the family bonus from the event.
 const settle=body('harvest_event_settle');assert.equal(settle,HOUR_SETTLE_BODY);
 assert.ok(settle.includes("hour:=e.rewards ? 'podium';"));
 assert.ok(settle.includes(`coins=case when hour then 0 else ${LEGACY_LINES.coins} end,`));
 assert.ok(PARTB.SETTLE_BODY.includes(`set coins=${LEGACY_LINES.coins},\n  diamonds=${LEGACY_LINES.diamonds}\n`),'the legacy lines are Part B\'s');
 assert.ok(settle.includes(`diamonds=case when hour then coalesce((e.rewards->'podium'->>(r.rank::integer-1))::integer,(e.rewards->>'finisher')::integer)\n   else ${LEGACY_LINES.diamonds} end`));
 assert.ok(settle.includes('having count(*)>=fam_n)')&&settle.includes('set coins=p.coins+fam_c,diamonds=p.diamonds+fam_d'));
 assert.ok(settle.includes('events_finished=(select count(*) from public.live_event_players lp where lp.player_id=s.player_id and lp.qualified)'),'hourly events count in events_finished');
 // Everything else in settle is Part B's, line for line and in order.
 const changed=/^declare |^ update public\.live_event_players p set coins=\(\(|^  diamonds=\(case|^ -- The family bonus|^  big as |^ update public\.live_event_players p set coins=p\.coins\+200/;
 const partB=PARTB.SETTLE_BODY.split('\n').filter(line=>!changed.test(line)),lines=settle.split('\n');
 let at=0;for(const line of partB){const found=lines.indexOf(line,at);assert.ok(found>=0,`Part B's line kept: ${line}`);at=found+1;}
 assert.equal(lines.length-partB.length,15,'the lines that changed or came in');
 // Validate: Part B's check with the podium rules.
 assert.equal(body('harvest_event_validate'),HOUR_VALIDATE_BODY);assert.ok(HOUR_VALIDATE_BODY.startsWith(VALIDATE_BODY.slice(0,VALIDATE_BODY.indexOf(' return new;'))));
 assert.ok(HOUR_VALIDATE_BODY.includes("raise exception 'Podium diamonds must be 3 whole numbers from 0 to 25.'")&&HOUR_VALIDATE_BODY.includes("(new.rewards->>'coins')::integer<>0"));
 // Pick: one goal per league from the hour pools.
 assert.equal(body('harvest_event_pick'),HOUR_PICK_BODY);
 const pools=JSON.parse(HOUR_PICK_BODY.match(/pools constant jsonb:='([^\n]*)';\n/)[1].replaceAll("''","'"));
 // hourly-events.sql ran with the pools from before one crop a harvest (22 Oct 2026); supabase/one-crop.sql draws from today's.
 assert.deepEqual(pools.map(l=>l.map(g=>g.map(k=>[k.stat,k.target]))),EVENT_HOUR_POOLS_BEFORE_ONE_CROP.slice(0,12).map(l=>l.map(g=>g.map(k=>[k.stat,k.target]))));   // the 12 live leagues
 assert.ok(HOUR_PICK_BODY.includes("grp int:=(n%5)::int;")&&HOUR_PICK_BODY.includes("'objectives',jsonb_build_array(jsonb_build_object('stat',kind->>'stat','target',(kind->>'target')::int))"));
 // Pause: admin only.
 assert.equal(body('harvest_event_pause'),PAUSE_BODY);
 assert.match(SQL,/revoke all on function public\.harvest_event_pause\(timestamptz\) from public, anon, authenticated;\ngrant execute on function public\.harvest_event_pause\(timestamptz\) to service_role;/);
 assert.match(SQL,/create table if not exists public\.event_config\(id boolean primary key default true check \(id\), paused_until timestamptz,/);
 assert.match(SQL,/alter table public\.event_config enable row level security;\nrevoke all on public\.event_config from anon, authenticated;/);
 // Cron every 5 minutes, the index, the two inactive 6-hour rows, then the first events.
 assert.match(SQL,/select cron\.schedule\('harvest-event-schedule','\*\/5 \* \* \* \*','select public\.harvest_event_schedule\(\)'\);/);
 assert.match(SQL,/create index if not exists live_events_open on public\.live_events \(starts_at\) where settled_at is null;/);
 assert.match(SQL,/delete from public\.live_events e where e\.created_by is null and not e\.active and e\.starts_at>='2026-10-20 12:00\+00'/);
 assert.ok(SQL.indexOf('cron.schedule')<SQL.indexOf('\nselect public.harvest_event_schedule();')&&SQL.indexOf('\nselect public.harvest_event_schedule();')<SQL.indexOf('do $after$'));
 // After-check: the md5s are the bodies in this file, the others unchanged; grants, the check, cron and the events made ahead.
 const after=SQL.slice(SQL.indexOf('do $after$'));
 assert.deepEqual(JSON.parse(after.match(/want jsonb:='([^']*)'/)[1]),NEW_MD5);
 for(const [name,hash] of Object.entries(NEW_MD5))assert.equal(md5(body(name.slice(0,name.indexOf('(')))),hash,name);
 const kept=JSON.parse(after.match(/kept jsonb:='([^']*)'/)[1]);assert.deepEqual(Object.keys(kept).sort(),['harvest_event_board(uuid)','harvest_event_claim(uuid,uuid)','harvest_event_league(integer)','harvest_event_league_for(integer,jsonb,smallint)','harvest_event_progress()']);
 for(const part of ["like '%00:30:00%'","is distinct from '*/5 * * * *'","e.ends_at-e.starts_at<>interval '55 minutes'","jsonb_array_length(e.leagues)<>12","has_function_privilege('anon','public.harvest_event_pause(timestamptz)','execute')","relrowsecurity",
  "a 6-hour automatic event is left"])assert.ok(after.includes(part),part);
 assert.doesNotMatch(SQL.replace(/--[^\n]*/g,''),/ · /);
});

test('Part B is safe: the old pick and check are unchanged, and the live md5s this file expects are Part B\'s',()=>{
 assert.equal(md5(PICK_BODY),PARTB.NEW_MD5['harvest_event_pick(bigint)']);assert.equal(md5(VALIDATE_BODY),PARTB.NEW_MD5['harvest_event_validate()']);
 assert.equal(PARTB.NEW_MD5['harvest_event_pick(bigint)'],'56d9b813f0b9223c59251ff07d0bbc28');
 for(const [name,hash] of Object.entries(LIVE_MD5))if(PARTB.NEW_MD5[name])assert.equal(hash,PARTB.NEW_MD5[name],name);
});

// The events window, drawn with a small stand-in for the page.
function page({level=20,events=[],now}){
 const els={'events-dot':{hidden:true},'mobile-events-hint':{textContent:''},'events-button':{setAttribute(){},hidden:false}};
 let html='';const listeners={};
 const dialog={open:false,id:'',className:'',setAttribute(){},addEventListener:(t,f)=>(listeners[t]??=[]).push(f),showModal(){dialog.open=true;},close(){dialog.open=false;for(const f of listeners.close??[])f();},
  querySelector:()=>({}),querySelectorAll:()=>[],closest:()=>null};
 Object.defineProperty(dialog,'innerHTML',{get:()=>html,set:v=>{html=String(v);}});
 const doc={hidden:false,getElementById:id=>els[id]??null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>dialog,body:{append(){}}};
 const state=createFarm(now());state.xp=xpForLevel(level);normalizeFarm(state,now());
 const requests=[];
 const bridge={request:async r=>{requests.push(r);return {events,serverNow:now(),eligibility:{level,minLevel:15}};}};
 globalThis.document=doc;
 const ui=createLiveEventsUI({state,notify(){},refreshFarm(){},document:doc,bridge,now});
 return {ui,dialog,els,doc,requests,html:()=>html};
}
const hourEvent=(id,start,extra={})=>({id,title:'Harvest rush',description:'Bring it in.',starts_at:iso(start),ends_at:iso(start+55*M),active:true,settled_at:null,participants:4,rewards:{...FIRST_HOUR_REWARDS},
 objectives:[{stat:'harvested',target:8}],leagues:EVENT_HOUR_POOLS.map((l,i)=>({title:`League ${i}`,description:'',objectives:[{stat:l[0][0].stat,target:l[0][0].target}]})),player:null,...extra});

test('the events window: a new event every hour; a first hourly event shows diamonds only, no "0 coins", and the hourly rules',async t=>{
 const now=Date.UTC(2026,9,20,13,20),clock=()=>now;
 const old={id:'old',title:'Rain dance',description:'',starts_at:iso(now-8*H),ends_at:iso(now-3*H),active:true,settled_at:iso(now-3*H),participants:9,qualified:4,rewards:{coins:200,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50},objectives:[{stat:'watered',target:20}],leagues:null,
  player:{qualified:true,claimed_at:null,coins:2200,diamonds:25}};
 const events=[hourEvent('live',Date.UTC(2026,9,20,13)),hourEvent('next',Date.UTC(2026,9,20,14)),
  hourEvent('owed',Date.UTC(2026,9,20,12),{settled_at:iso(Date.UTC(2026,9,20,12,55)),qualified:3,player:{qualified:true,claimed_at:null,coins:0,diamonds:8}}),
  hourEvent('done',Date.UTC(2026,9,20,11),{settled_at:iso(Date.UTC(2026,9,20,11,55)),qualified:3,player:{qualified:true,claimed_at:iso(now-H),coins:0,diamonds:1,paid_diamonds:1}}),old];
 const p=page({events,now:clock});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 await p.ui.open();const html=p.html();
 assert.match(html,/<summary>How events work<span>A new event every hour<\/span><\/summary>/);
 assert.doesNotMatch(html,/5 hours|1-hour break|Coins ×|[>\s]0 coins|higher leagues win more coins/);
 assert.match(html,/<li>A new event starts every hour, on the hour\. You play for 55 minutes; in the last 5 minutes the prizes are handed out\.<\/li><li>Each event has one goal\. Reach it and you have finished\.<\/li><li>The first three to finish in your league win 8, 5 and 3 diamonds\. Everyone else who finishes wins 1 diamond\.<\/li>/);
 assert.match(html,/The prizes are the same in every league\. The family bonus counts family members from every league\./);
 // The rewards card: diamonds only, with the family bonus.
 const card=html.slice(html.indexOf('<div class="event-podium no-coins">'),html.indexOf('</div>',html.indexOf('<div class="event-podium no-coins">')));
 assert.ok(card.length>0);assert.doesNotMatch(card,/data-art="coins"|art-coins/);
 // Since 23 Oct 2026 the family bonus is a line of chips there; the whole sentence is in How events work.
 assert.match(card,/<b>Family bonus<\/b><span class="event-chip">[^]*\+3<\/span><small>When 3 or more of your family finish, in any league\.<\/small>/);
 assert.match(html,/<li>Family bonus: when 3 or more of your Farm Family finish, you each get 3 diamonds more\. <span>/);
 // Collect: the hourly reward shows diamonds only, the older one coins and diamonds. History: "Collected 1 diamond".
 assert.match(html,/8 diamonds<\/strong>/);assert.match(html,/2,200 coins<\/strong>/);
 assert.match(html,/<span>Collected 1 diamond · 3 of 4 finished<\/span>/);
});

test('the gap and the pause: the prizes are being handed out, or no event right now',async t=>{
 const at=Date.UTC(2026,9,20,13,57);let now=at;
 const p=page({events:[hourEvent('next',Date.UTC(2026,9,20,14))],now:()=>now});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 await p.ui.open();assert.match(p.html(),/The prizes are being handed out\. Here is what comes next\./);
 now=Date.UTC(2026,9,20,13,30);await p.ui.load();assert.match(p.html(),/No event right now\. Here is what comes next\./);
});

test('the red "!": an unseen event lights it, joining or opening hides it, and the next hour lights it on time without a request',async t=>{
 t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:Date.UTC(2026,9,20,13,50)});
 const now=()=>Date.now();
 const p=page({events:[hourEvent('live',Date.UTC(2026,9,20,13)),hourEvent('next',Date.UTC(2026,9,20,14))],now});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 globalThis.localStorage=undefined;
 await p.ui.load();assert.equal(p.els['events-dot'].hidden,false,'a running event nobody opened');
 // Joined (a row of your own): no dot.
 const joined=page({events:[hourEvent('live',Date.UTC(2026,9,20,13),{player:{progress:{harvested:2},actions:1}})],now});
 await joined.ui.load();assert.equal(joined.els['events-dot'].hidden,true,'joined');joined.ui.dispose();
 // The next hour: the dot without a request.
 const store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 t.after(()=>{delete globalThis.localStorage;});
 globalThis.document=p.doc;await p.ui.open();p.dialog.close();assert.equal(p.els['events-dot'].hidden,true,'opened: seen');
 p.doc.hidden=true;   // no background read either
 const before=p.requests.length;
 t.mock.timers.tick(10*M+2000);
 assert.equal(p.els['events-dot'].hidden,false,'14:00: the next event lights the dot');
 assert.equal(p.requests.length,before,'no request on the hour');
 assert.match(p.els['mobile-events-hint'].textContent,/^Live/);
});

test('the texts: the wiki, the tips, the family window, the bonus overview and the More hint follow the hourly rules',async()=>{
 const {wikiArticle}=await import('../public/wiki-content.js'),{LOADING_TIPS}=await import('../public/loading-screen.js');
 const events=wikiArticle('events').html;
 assert.match(events,/A new event starts every hour, on the hour\./);assert.match(events,/one per event:/);assert.doesNotMatch(events,/three per event/);
 assert.match(events,/win 8, 5 and 3 diamonds, every other finisher 1\./);
 assert.doesNotMatch(events,/ruby rings|Weave linen|5 hours|six hours/);
 assert.match(wikiArticle('family').html,/each of them gets <span[^>]*data-art="coins"[^>]*><\/span>500 and <span[^>]*data-art="diamonds"[^>]*><\/span>3 on top of their own prize/);
 const tips=LOADING_TIPS.map(([,t])=>t).join('\n');
 assert.match(tips,/From level 15 a new event starts every hour: finish its goal for coins and diamonds\./);
 assert.match(tips,new RegExp(`you each get ${FAMILY_EVENT_BONUS.coins} coins and ${FAMILY_EVENT_BONUS.diamonds} diamonds extra\\.`));assert.doesNotMatch(tips,/200 coins/);
 assert.match(read('public/family-ui.js'),/each gets \$\{num\(ev\.coins\)\} coins and \$\{ev\.diamonds\} diamonds extra\./);
 assert.match(read('public/farm.html'),/<small id="mobile-events-hint">A new event every hour<\/small>/);
 assert.match(read('scripts/build-wiki.mjs'),/a new event every hour\./);
 // No push: the hourly reminders send nothing about events.
 for(const file of ['index.ts','mail.js'])try{assert.doesNotMatch(read(`supabase/functions/notify-hourly/${file}`),/live_events|harvest_event/);}catch(e){if(e.code!=='ENOENT')throw e;}
});
