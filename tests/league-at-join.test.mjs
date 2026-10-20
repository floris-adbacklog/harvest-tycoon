// Your league is set when you join an event (20 Oct 2026, the owner: "doe 1"): your first action that counts stores it on your row
// (live_event_players.league), and you finish that event in that league, even if you level up. A player's report: "I was first place
// in event. then lvled up, changed league and couldnt get my prize." The live switch is supabase/league-at-join.sql
// (scripts/league-at-join-sql.mjs); farm-api and the site show the stored league; the rules texts say the plain rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
globalThis.window??={};
const {EVENT_LEAGUES,HOUR_EVENT_REWARDS,eventLeague,eventLeagueFor,eventLeagueIn,eventLeagueOf,createFarm,xpForLevel,normalizeFarm}=await import('../game/farm-state.js');
const {eventStandings,handleEvents}=await import('../supabase/functions/farm-api/event-service.js');
const LJ=await import('../scripts/league-at-join-sql.mjs');
const W2=await import('../scripts/world-two-leagues-sql.mjs');
const HC=await import('../scripts/hourly-coins-sql.mjs');
const {createLiveEventsUI}=await import('../public/live-events-ui.js');
const {LANGUAGES}=await import('../public/languages.js');
const {catalog,translations,problem}=await import('../scripts/i18n.mjs');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const md5=text=>createHash('md5').update(text).digest('hex');
const SQL=read('supabase/league-at-join.sql');
const body=name=>{const at=SQL.indexOf(`create or replace function public.${name}(`);assert.ok(at>=0,name);const from=SQL.indexOf('$function$',at)+10;return SQL.slice(from,SQL.indexOf('$function$',from));};
const PROGRESS=body('harvest_event_progress'),SETTLE=body('harvest_event_settle');
const M=60000,iso=t=>new Date(t).toISOString();
const id=index=>EVENT_LEAGUES[index].id;
const RULE='Your league is set when you join an event (your first action that counts), and you finish that event in that league, even if you level up.';

// An hourly event: one goal per league, the Sprout League's smaller than the Meadow League's (as "Growing strong" on 20 Oct 2026:
// Sprout fertilize 1 field, Meadow plant 9).
const START=Date.UTC(2026,9,20,16);
const hourEvent=(extra={})=>({id:'hour',title:'Growing strong',description:'Grow.',starts_at:iso(START),ends_at:iso(START+55*M),active:true,settled_at:null,rewards:HOUR_EVENT_REWARDS,
 objectives:[{stat:'fertilized',target:1}],leagues:EVENT_LEAGUES.map((l,i)=>({title:`${l.name} goal`,description:'',objectives:[i===0?{stat:'fertilized',target:1}:{stat:'planted',target:9+i}]})),...extra});

// The two functions, step by step as the SQL does it (each step is checked against the SQL text in the next test). joinStores false is
// the live rule before this file (the level decides at every action and at the end); true is the new one. A row that already exists
// without a league (written before) follows the old rule under both.
function play(event,joinStores){
 const rows=new Map();
 const leagueFor=(level,world)=>eventLeagueFor(event,level,world).index;   // harvest_event_league_for
 return {rows,
  // harvest_event_progress, for one save that counts: before/after are the farm's stats.
  act(player,level,before,after,at){
   let p=rows.get(player);const fresh=!p;
   if(fresh)p={player,progress:{},baseline:null,world:eventLeague(level).index>=6?2:1,league:null,last_at:null};
   if(fresh&&joinStores)p.league=leagueFor(level,p.world);
   const lg=p.league??leagueFor(level,p.world),objs=event.leagues[lg].objectives;
   const base={...p.baseline};for(const o of objs)if(!(o.stat in base))base[o.stat]=(before[o.stat]??0)-(p.progress[o.stat]??0);
   if(!fresh&&objs.every(o=>(p.progress[o.stat]??0)>=o.target))return;   // the finish time is frozen
   let changed=false;const progress={...p.progress};
   for(const o of objs){const value=Math.min(o.target,Math.max(0,(after[o.stat]??0)-base[o.stat]));if(value>(progress[o.stat]??0)){progress[o.stat]=value;changed=true;}}
   if(changed)rows.set(player,{...p,progress,baseline:base,last_at:iso(at)});   // insert: the league only with the row; on conflict never
   else if(!fresh)rows.set(player,{...p,baseline:base});
  },
  // harvest_event_settle: a stored league stays, a NULL one is the level's at the end; then the league's goals and prizes.
  settle(levelNow){
   const out=[...rows.values()].map(r=>{const league=r.league??leagueFor(levelNow[r.player],r.world);return {...r,league,player_id:r.player,qualified:event.leagues[league].objectives.every(o=>(r.progress[o.stat]??0)>=o.target)};});
   const paid=new Map();
   for(const l of new Set(out.map(r=>r.league)))for(const s of eventStandings(event,out.filter(r=>r.league===l&&r.qualified),Date.parse(event.ends_at)-M,EVENT_LEAGUES[l]))paid.set(s.playerId,{coins:s.coins,diamonds:s.diamonds,rank:s.rank});
   return Object.fromEntries(out.map(r=>[r.player,{league:id(r.league),qualified:r.qualified,...(paid.get(r.player)??{coins:0,diamonds:0,rank:null})}]));
  }};
}

test('the SQL does what the steps above do: the league is stored when the row is first written, used for its goals, and kept by settle',()=>{
 // Progress: with the first write, next to world.
 assert.ok(PROGRESS.includes(`  if fresh then p.progress:='{}';p.actions:=0;p.joined_at:=now();p.last_at:=now()-interval '1 day';p.baseline:=null;
   p.world:=case when public.harvest_event_league(lv)>=6 then 2 else 1 end;p.league:=public.harvest_event_league_for(lv,e.leagues,p.world);end if;\n`));
 assert.equal(PROGRESS.split('p.league:=').length,2,'stored once, only for a fresh row');
 assert.ok(PROGRESS.includes('  lg:=coalesce(p.league,public.harvest_event_league_for(lv,e.leagues,p.world));\n  objs:=coalesce(e.leagues->lg->\'objectives\',e.objectives);\n'));
 assert.ok(PROGRESS.includes('insert into public.live_event_players(event_id,player_id,progress,actions,joined_at,last_at,baseline,world,league)'));
 assert.ok(PROGRESS.includes('p.joined_at,now(),p.baseline,p.world,p.league)\n'));
 const conflict=PROGRESS.slice(PROGRESS.indexOf('on conflict(event_id,player_id) do update set'),PROGRESS.indexOf(';',PROGRESS.indexOf('on conflict')));
 assert.doesNotMatch(conflict,/league|world/,'an existing row never gets a league or a world here');
 assert.doesNotMatch(PROGRESS.replace(/--[^\n]*/g,''),/set league|league=/,'progress never updates a league');
 // Settle: only a NULL league is filled by the level at the end; the rest of settle reads p.league.
 assert.ok(SETTLE.includes(` update public.live_event_players p set league=public.harvest_event_league_for(s.level,e.leagues,p.world)
  from public.player_stats s where p.event_id=p_event and s.player_id=p.player_id and p.league is null;\n`));
 assert.deepEqual(SETTLE.replace(/--[^\n]*/g,'').match(/set league=[^\n]*/g),['set league=public.harvest_event_league_for(s.level,e.leagues,p.world)','set league=0 where event_id=p_event and league is null;']);
 // Every other line of the live bodies is kept, in order.
 for(const [live,now,changed] of [[W2.PROGRESS_BODY,PROGRESS,/^  -- |^   -- |^   p\.world:=|^  lg:=|^   insert into|^    values\(e\.id/],[HC.SETTLE_BODY,SETTLE,/^ -- |^  from public\.player_stats s where p\.event_id/]]){
  const lines=now.split('\n');let at=0;
  for(const line of live.split('\n').filter(l=>!changed.test(l))){const found=lines.indexOf(line,at);assert.ok(found>=0,`kept: ${line}`);at=found+1;}
 }
 // The board is not replaced: it already shows a stored league before the level's.
 assert.match(W2.BOARD_BODY,/coalesce\(lp\.league,public\.harvest_event_league_for\(s\.level,e\.leagues,lp\.world\)\)/);
 assert.equal(md5(W2.BOARD_BODY),LJ.LIVE_MD5['harvest_event_board(uuid)']);
 assert.doesNotMatch(SQL,/function public\.harvest_event_board/);
});

test('joins at level 29 in the Sprout League, reaches 30 mid-event, finishes the Sprout goal: the Sprout prize (the player\'s report)',()=>{
 const event=hourEvent();
 for(const joinStores of [false,true]){
  const g=play(event,joinStores);
  // 16:00 at level 29: fertilizes a field, the Sprout goal is done at once. Another Sprout farmer finishes later.
  g.act('reporter',29,{fertilized:10,planted:50},{fertilized:11,planted:50},START+6e3);
  g.act('other',20,{fertilized:0},{fertilized:1},START+45e3);
  // 16:43 level 30, then plants 6 fields: under the old rule now in the Meadow League (plant 10), under the new one still a Sprout.
  g.act('reporter',30,{fertilized:11,planted:50},{fertilized:11,planted:56},START+54*M);
  const paid=g.settle({reporter:31,other:20});
  if(!joinStores){
   assert.deepEqual(paid.reporter,{league:'meadow',qualified:false,coins:0,diamonds:0,rank:null},'the bug: judged on the Meadow goal');
   assert.equal(paid.other.rank,1);
  }else{
   assert.deepEqual(paid.reporter,{league:'sprout',qualified:true,coins:(50+500)*1,diamonds:8,rank:1},'first in the Sprout League: 550 coins and 8 diamonds');
   assert.deepEqual(paid.other,{league:'sprout',qualified:true,coins:(50+250)*1,diamonds:5,rank:2});
   assert.deepEqual(g.rows.get('reporter').progress,{fertilized:1},'the finish time stayed frozen at the Sprout goal');
   assert.equal(g.rows.get('reporter').last_at,iso(START+6e3));
  }
 }
 // And the other way: levelling up never takes a farmer out of a league they have not finished yet.
 const g=play(event,true);
 g.act('a',29,{fertilized:0,planted:0},{fertilized:0,planted:3},START+M);   // no Sprout progress: no row, not joined yet
 assert.equal(g.rows.size,0);
 g.act('a',30,{fertilized:0,planted:3},{fertilized:0,planted:13},START+2*M);   // the first action that counts is at 30: Meadow
 assert.equal(g.rows.get('a').league,1);
 assert.deepEqual(g.settle({a:30}).a,{league:'meadow',qualified:true,coins:(50+500)*2,diamonds:8,rank:1});
});

test('joins at 99 and reaches 100: still finishes in the Valley Legends (world 1); joins at 100: a village league (world 2)',()=>{
 const event=hourEvent();
 const g=play(event,true);
 g.act('late',99,{planted:0},{planted:5},START+M);
 assert.deepEqual([g.rows.get('late').league,g.rows.get('late').world],[5,1]);
 g.act('late',100,{planted:5},{planted:20},START+3*M);
 assert.deepEqual(g.settle({late:100}).late,{league:'legends',qualified:true,coins:(50+500)*8,diamonds:8,rank:1});
 const v=play(event,true);
 v.act('village',100,{planted:0},{planted:20},START+M);
 assert.deepEqual([v.rows.get('village').league,v.rows.get('village').world],[6,2]);
 assert.equal(v.settle({village:121}).village.league,'cobble','a village farmer who levels up stays in the league they joined');
 // The stored league and world always agree: a league from 6 up only in world 2.
 for(let level=15;level<=250;level++){const w=eventLeague(level).index>=6?2:1,l=eventLeagueFor(event,level,w).index;assert.equal(l>=6,w===2,`level ${level}`);}
 // An event made with the 6 farm leagues stores the Valley Legends for 100+, as before.
 assert.equal(eventLeagueFor({leagues:Array(6)},150,2).id,'legends');
});

test('a row written before this change (no league) behaves as before: the goals and the league of the level, at each action and at the end',()=>{
 const event=hourEvent();
 const g=play(event,true);
 // The row is there from before the switch, as live today: progress written, world 1, league NULL.
 g.rows.set('old',{player:'old',progress:{fertilized:1},baseline:{fertilized:10},world:1,league:null,last_at:iso(START+6e3)});
 g.act('old',30,{fertilized:11,planted:50},{fertilized:11,planted:56},START+40*M);
 assert.equal(g.rows.get('old').league,null,'never filled in by progress');
 assert.deepEqual(g.rows.get('old').progress,{fertilized:1,planted:6},'the Meadow goal, as before');
 assert.deepEqual(g.settle({old:31}).old,{league:'meadow',qualified:false,coins:0,diamonds:0,rank:null},'settled by the level at the end, as before');
 // The same farmer at 29 at the end: Sprout, as before.
 const h=play(event,true);
 h.rows.set('old',{player:'old',progress:{fertilized:1},baseline:{fertilized:10},world:1,league:null,last_at:iso(START+6e3)});
 assert.equal(h.settle({old:29}).old.league,'sprout');
});

test('eventLeagueOf: the stored league first, else the level\'s (with the row\'s world), within the event\'s leagues',()=>{
 const e12={leagues:Array(12)},e6={leagues:Array(6)};
 assert.equal(eventLeagueOf(e12,{league:0,world:1},31).id,'sprout');
 assert.equal(eventLeagueOf(e12,{league:5,world:1},100).id,'legends');
 assert.equal(eventLeagueOf(e12,{league:null,world:1},31).id,'meadow');
 assert.equal(eventLeagueOf(e12,{league:null,world:1},100).id,'legends');
 assert.equal(eventLeagueOf(e12,null,100).id,'cobble');assert.equal(eventLeagueOf(e12,undefined,20).id,'sprout');
 assert.equal(eventLeagueOf(e6,{league:9},150).id,'legends','never a league the event was not made with');
 assert.equal(eventLeagueOf(e12,{league:'2'},20).id,'sprout','only a whole number counts as stored');
 assert.equal(eventLeagueIn(e12,0).id,'sprout');
 for(const f of ['public/farm-state.js','supabase/functions/farm-api/farm-state.js'])assert.equal(read(f),read('game/farm-state.js'),`${f}: run node scripts/sync-game.mjs`);
});

// farm-api: the events list with the standings of the running event, from a stand-in database.
async function listFor({row,board,level}){
 const event=hourEvent();
 const q=(table,result)=>{const call={table,ops:[]};const me={select(...a){call.ops.push(['select',...a]);return me;},eq(...a){call.ops.push(['eq',...a]);return me;},in(...a){call.ops.push(['in',...a]);return me;},is(...a){call.ops.push(['is',...a]);return me;},
  gt(){return me;},order(){return me;},limit(){return me;},single(){return me;},maybeSingle(){call.single=true;return me;},then:(ok,no)=>Promise.resolve(result(call)).then(ok,no)};return me;};
 const admin={from:table=>q(table,call=>{
   if(table==='live_events')return {data:[event]};
   if(table==='live_event_players'){if(call.ops.some(o=>o[0]==='select'&&o[2]?.head))return {count:board.length};if(call.ops.some(o=>o[0]==='is'))return {data:[]};return {data:row?[{event_id:'hour',player_id:'me',...row}]:[]};}
   if(table==='player_stats')return call.single?{data:{level}}:{data:board.map(r=>({player_id:r.player_id,username:r.player_id,level,avatar_id:null,vip_expires_at:null}))};
   return {data:[]};
  }),rpc:name=>Promise.resolve(name==='harvest_event_board'?{data:board}:{data:null})};
 const r=await handleEvents({admin,body:{command:'list'},user:{id:'me'}});
 return r.data.events.find(e=>e.id==='hour').standings;
}

test('farm-api: Your league and the standings are the stored league of the running event; without one, as before',async()=>{
 const now=Date.now(),at=t=>iso(now-t*M);
 const sprout=[{player_id:'me',progress:{fertilized:1},actions:1,joined_at:at(50),last_at:at(50),qualified:null,coins:0,diamonds:0,league:0},
  {player_id:'s2',progress:{fertilized:1},actions:1,joined_at:at(40),last_at:at(40),qualified:null,coins:0,diamonds:0,league:0},
  {player_id:'m1',progress:{planted:10},actions:1,joined_at:at(30),last_at:at(30),qualified:null,coins:0,diamonds:0,league:1}];
 const realNow=Date.now;Date.now=()=>START+50*M;
 try{
  // Joined at 29, level 31 now: the Sprout League's standings, first place.
  let s=await listFor({row:{league:0,world:1,progress:{fertilized:1}},board:sprout,level:31});
  assert.equal(s.league.id,'sprout');assert.deepEqual(s.top.map(r=>[r.playerId,r.rank,r.diamonds]),[['me',1,8],['s2',2,5]]);
  // An old board (or a row from before) that gives the level's league still loses to the row's stored league.
  s=await listFor({row:{league:0,world:1},board:sprout.map(r=>r.player_id==='me'?{...r,league:1}:r),level:31});
  assert.equal(s.league.id,'sprout');
  // A row from before (league NULL): the board's, which is the level's, as before.
  s=await listFor({row:{league:null,world:1},board:sprout.map(r=>r.player_id==='me'?{...r,league:1}:r),level:31});
  assert.equal(s.league.id,'meadow');
  // Not joined yet: the level's.
  s=await listFor({row:null,board:sprout.filter(r=>r.player_id!=='me'),level:31});
  assert.equal(s.league.id,'meadow');
 }finally{Date.now=realNow;}
});

// The events window, drawn with a small stand-in for the page (as tests/hourly-coins.test.mjs).
function page({level=20,events=[],now}){
 const els={'events-dot':{hidden:true},'mobile-events-hint':{textContent:''},'events-button':{setAttribute(){},hidden:false}};
 let html='';const listeners={};
 const dialog={open:false,id:'',className:'',setAttribute(){},addEventListener:(t,f)=>(listeners[t]??=[]).push(f),showModal(){dialog.open=true;},close(){dialog.open=false;for(const f of listeners.close??[])f();},
  querySelector:()=>({}),querySelectorAll:()=>[],closest:()=>null};
 Object.defineProperty(dialog,'innerHTML',{get:()=>html,set:v=>{html=String(v);}});
 const doc={hidden:false,getElementById:id=>els[id]??null,querySelector:()=>null,querySelectorAll:()=>[],createElement:()=>dialog,body:{append(){}}};
 const state=createFarm(now());state.xp=xpForLevel(level);normalizeFarm(state,now());
 const bridge={request:async()=>({events,serverNow:now(),eligibility:{level,minLevel:15}})};
 globalThis.document=doc;
 const ui=createLiveEventsUI({state,notify(){},refreshFarm(){},document:doc,bridge,now});
 return {ui,html:()=>html};
}

test('the events window: Your league and the goal are the stored league\'s; an old row or an old farm-api as before',async t=>{
 const clock=()=>START+50*M;
 const cases=[[31,{league:0,world:1},'Sprout League'],[31,{league:null,world:1},'Meadow League'],[31,null,'Meadow League'],[100,{league:5,world:1},'Valley Legends'],[100,{league:null,world:1},'Valley Legends'],[121,{league:6,world:2},'Cobble League']];
 for(const [level,row,name] of cases){
  const player=row&&{...row,progress:{},actions:1,qualified:null,claimed_at:null};
  const p=page({level,events:[hourEvent({player})],now:clock});
  t.after(()=>{p.ui.dispose();delete globalThis.document;});
  await p.ui.open();const html=p.html();
  assert.match(html,new RegExp(`<span>Your league</span><strong>${name}</strong>`),`${level} ${JSON.stringify(row)}`);
  assert.ok(html.includes(`<h3>${name} goal</h3>`),`${name}: that league's goal`);
 }
});

test('the rules: one plain sentence in the window, the wiki and its leagues, in every language; the old rule is gone',()=>{
 const ui=read('public/live-events-ui.js'),wiki=read('public/wiki-content.js');
 assert.ok(ui.includes(`<li>You race in your league, against farmers of about your level. ${RULE}<span class="event-league-list">`));
 assert.ok(wiki.includes(`with its own top 10 and podium. ${RULE} Diamonds are the same in every league; higher leagues win more coins.'],`));
 assert.ok(wiki.includes(`+section('Leagues',\`<p>${RULE}\${village?\` <span>Up to level \${v.from-1} your goals are on the farm; from level \${v.from} they are in the village.</span>\`:''}`));
 for(const src of [ui,wiki,read('public/loading-screen.js')])assert.doesNotMatch(src,/when the event ends decides|when an event ends decides|during an event and you finish that event/);
 const texts=[RULE,`You race in your league, against farmers of about your level. ${RULE}`,
  `You race in your league, against farmers of about your level, with its own top 10 and podium. ${RULE} Diamonds are the same in every league; higher leagues win more coins.`,
  'Up to level {0} your goals are on the farm; from level {1} they are in the village.'];
 const all=catalog(),codes=LANGUAGES.filter(l=>l.code!=='en').map(l=>l.code);
 assert.equal(codes.length,15);
 for(const text of texts){
  assert.ok(text in all,text);assert.doesNotMatch(text,/ · /);
  for(const code of codes){const out=translations(code)[text];assert.ok(out,`${code}: ${text}`);assert.equal(problem(text,out),'',`${code}: ${text}`);assert.doesNotMatch(JSON.stringify(out),/ · /,`${code}: ${text}`);}
 }
 for(const gone of ['Your level when an event ends decides your league.','You race in your league, against farmers of about your level. Your level when the event ends decides your league.',
  'Reach level {0} during an event and you finish that event in the Valley Legends.',
  'Up to level {0} your goals are on the farm; from level {1} they are in the village. Reach level {2} during an event and you finish that event in the Valley Legends.'])assert.ok(!(gone in all),gone);
 assert.equal(translations('nl')[RULE],'Je liga ligt vast zodra je meedoet aan een evenement (je eerste actie die telt), en je rondt dat evenement af in die liga, ook als je een level omhoog gaat.');
});

test('the SQL file: generated, guard with md5 and time window, the two functions, the after-check',()=>{
 assert.equal(SQL,LJ.leagueAtJoinSql(),'run node scripts/league-at-join-sql.mjs');
 assert.match(SQL,/^-- Generated by scripts\/league-at-join-sql\.mjs/);
 assert.match(SQL,/\nbegin;\nset local lock_timeout='5s';\ndo \$guard\$/);assert.match(SQL,/\nend \$after\$;\ncommit;\n$/);
 const guard=JSON.parse(SQL.match(/do \$guard\$\ndeclare want jsonb:='([^']*)'/)[1]);
 assert.equal(Object.keys(guard).length,10,'every harvest_event function');
 for(const [name,hash] of Object.entries(LJ.LIVE_MD5))assert.deepEqual(guard[name],LJ.NEW_MD5[name]?[hash,LJ.NEW_MD5[name]]:[hash],name);
 // The live md5s: what the generators of the live bodies made (hourly-coins.sql ran last).
 for(const [name,hash] of Object.entries(HC.NEW_MD5))assert.equal(LJ.LIVE_MD5[name],hash,name);
 for(const name of ['harvest_event_progress()','harvest_event_board(uuid)','harvest_event_league(integer)','harvest_event_league_for(integer,jsonb,smallint)'])assert.equal(LJ.LIVE_MD5[name],W2.NEW_MD5[name],name);
 assert.equal(md5(W2.PROGRESS_BODY),LJ.LIVE_MD5['harvest_event_progress()']);assert.equal(md5(HC.SETTLE_BODY),LJ.LIVE_MD5['harvest_event_settle(uuid)']);
 assert.deepEqual(Object.keys(LJ.NEW_MD5).sort(),['harvest_event_progress()','harvest_event_settle(uuid)']);
 for(const [name,hash] of Object.entries(LJ.NEW_MD5))assert.equal(md5(body(name.slice(0,name.indexOf('(')))),hash,name);
 assert.match(SQL,/if extract\(minute from now\(\)\) not between 5 and 50 then raise exception 'Run this between hh:05 and hh:50 UTC\.'/);
 // The headers as live.
 assert.ok(SQL.includes("create or replace function public.harvest_event_progress()\n returns trigger language plpgsql set search_path to '' as $function$"));
 assert.ok(SQL.includes("create or replace function public.harvest_event_settle(p_event uuid)\n returns void language plpgsql set search_path to '' as $function$"));
 const after=SQL.slice(SQL.indexOf('do $after$'));
 assert.deepEqual(JSON.parse(after.match(/want jsonb:='([^']*)'/)[1]),LJ.NEW_MD5);
 assert.deepEqual(Object.keys(JSON.parse(after.match(/kept jsonb:='([^']*)'/)[1])).sort(),['harvest_event_board(uuid)','harvest_event_claim(uuid,uuid)','harvest_event_league(integer)','harvest_event_league_for(integer,jsonb,smallint)',
  'harvest_event_pause(timestamptz)','harvest_event_pick(bigint)','harvest_event_schedule()','harvest_event_validate()']);
 for(const part of ["'{postgres=X/postgres,service_role=X/postgres}'","t.tgfoid='public.harvest_event_progress()'::regprocedure","extract(minute from clock_timestamp()) not between 5 and 54"])assert.ok(after.includes(part),part);
 // Order: guard, progress, settle, after-check; nothing else writes.
 const at=s=>{const i=SQL.indexOf(s);assert.ok(i>=0,s);return i;};
 assert.ok(at('do $guard$')<at('function public.harvest_event_progress()')&&at('function public.harvest_event_progress()')<at('function public.harvest_event_settle(')&&at('function public.harvest_event_settle(')<at('do $after$'));
 const outside=SQL.replace(/\$function\$[^]*?\$function\$/g,'').replace(/do \$(\w+)\$[^]*?end \$\1\$;/g,'').replace(/--[^\n]*/g,'');
 assert.doesNotMatch(outside,/\b(update|insert|delete|alter|drop)\b/i,'no other writes');
 assert.doesNotMatch(SQL.replace(/--[^\n]*/g,''),/ · /);
});

test('no alias in a DO block or function shares a name with one of its PL/pgSQL variables (42702)',()=>{
 const blocks=[...SQL.matchAll(/do \$(\w+)\$([^]*?)end \$\1\$;/g)].map(m=>m[2]);
 for(const name of Object.keys(LJ.NEW_MD5))blocks.push(body(name.slice(0,name.indexOf('('))));
 assert.equal(blocks.length,4);
 for(const raw of blocks){
  const block=raw.replace(/--[^\n]*/g,'');
  const declare=block.slice(block.indexOf('declare')+7,block.indexOf('\nbegin')>=0?block.indexOf('\nbegin'):block.indexOf(' begin'));
  const vars=new Set([...declare.matchAll(/(?:^|[;\n,]|declare)\s*(\w+)\s+(?:constant\s+)?(?:jsonb|text|integer|bigint|boolean|uuid|timestamptz|record|smallint|public\.live_events|public\.live_event_players)\b(?!\.)/g)].map(m=>m[1]));
  const aliases=new Set([...block.matchAll(/\bas\s+(\w+)\s*\(|\b(?:from|join|update)\s+(?:public\.)?\w+(?:\([^)]*\))?\s+(?:as\s+)?(\w+)\b/gi)].map(m=>m[1]??m[2]).filter(a=>!/^(where|on|left|join|group|order|set|loop|and|for|limit|into)$/i.test(a)));
  assert.ok(vars.size>=2,'the variables were found');
  for(const a of aliases)assert.ok(!vars.has(a),`alias ${a} is also a variable`);
 }
});
