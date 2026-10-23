// Hourly events pay coins again (20 Oct 2026, the owner, later the same day as the hourly events): a quarter of the 6-hour events'
// coins. coins = (50 + 500 / 250 / 125 for the first three in a league, 25 for every other finisher) × the league's coins; a Sprout
// finisher gets 75, the first in the Village Legends 11,000. Diamonds stay 8 / 5 / 3 and 1. The family bonus: +3 diamonds and a flat
// +500 coins (no league factor, as the old +200). The live switch is supabase/hourly-coins.sql (scripts/hourly-coins-sql.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
globalThis.window??={};
const {EVENT_LEAGUES,HOUR_EVENT_REWARDS,FAMILY_EVENT_BONUS,eventPrizes,createFarm,xpForLevel,normalizeFarm}=await import('../game/farm-state.js');
const {EVENT_HOUR_POOLS}=await import('../public/event-goals.js');
const {eventStandings,validateEvent}=await import('../supabase/functions/farm-api/event-service.js');
const HC=await import('../scripts/hourly-coins-sql.mjs');
const HE=await import('../scripts/hourly-events-sql.mjs');
const {HOUR_VALIDATE_BODY}=await import('../scripts/event-goals-sql.mjs');
const {createLiveEventsUI}=await import('../public/live-events-ui.js');
const {LANGUAGES}=await import('../public/languages.js');
const {catalog,translations,problem}=await import('../scripts/i18n.mjs');
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const md5=text=>createHash('md5').update(text).digest('hex');
const SQL=read('supabase/hourly-coins.sql');
const body=name=>{const at=SQL.indexOf(`create or replace function public.${name}(`);assert.ok(at>=0,name);const from=SQL.indexOf('$function$',at)+10;return SQL.slice(from,SQL.indexOf('$function$',from));};
const H=3600000,M=60000,iso=t=>new Date(t).toISOString();
// The rewards of the first hourly events (diamonds only), as they are live in the running and settled events.
const FIRST=JSON.parse(HE.REWARDS_JSON);
const league=id=>EVENT_LEAGUES.find(l=>l.id===id);

test('the rewards: a quarter of the 6-hour coins, the same diamonds, +500 coins flat for the family',()=>{
 assert.deepEqual(JSON.parse(JSON.stringify(HOUR_EVENT_REWARDS)),{coins:50,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50,podium:[8,5,3],finisher:1,familyFinishers:3,familyDiamonds:3,
  podiumCoins:[500,250,125],finisherCoins:25,familyCoins:500});
 // A quarter of the 6-hour events: 200 + 2000 / 1000 / 500 / 100, and +200 for the family... except the family, which the owner set at 500.
 const old=eventPrizes({coins:200});
 assert.deepEqual([HOUR_EVENT_REWARDS.coins,...HOUR_EVENT_REWARDS.podiumCoins,HOUR_EVENT_REWARDS.finisherCoins],[old.coins,...old.podium.map(p=>p.coins),old.finisher.coins].map(n=>n/4));
 const prize=eventPrizes(HOUR_EVENT_REWARDS);
 assert.deepEqual(prize,{hour:true,coins:50,podium:[{coins:500,diamonds:8},{coins:250,diamonds:5},{coins:125,diamonds:3}],finisher:{coins:25,diamonds:1},family:{finishers:3,coins:500,diamonds:3},paysCoins:true});
 const win=(p,l)=>(prize.coins+p.coins)*l.coins;
 assert.equal(win(prize.finisher,league('sprout')),75,'a Sprout finisher');
 assert.equal(win(prize.podium[0],league('village')),11000,'first in the Village Legends');
 assert.deepEqual(FAMILY_EVENT_BONUS,{finishers:3,coins:500,diamonds:3});
 // A first hourly event (diamonds only) pays and shows no coins; a 6-hour one keeps its own.
 assert.deepEqual(eventPrizes(FIRST),{hour:true,coins:0,podium:[{coins:0,diamonds:8},{coins:0,diamonds:5},{coins:0,diamonds:3}],finisher:{coins:0,diamonds:1},family:{finishers:3,coins:0,diamonds:3},paysCoins:false});
 assert.equal(old.paysCoins,true);
});

test('old readers: the v234 farm-api and the old site read the new rewards without breaking, diamonds as before and no coins',()=>{
 // eventPrizes as it went live on 20 Oct 2026 (48519a88, farm-api v234 and the site), verbatim.
 const HOUR_EVENT_REWARDS_V234=Object.freeze({coins:0,diamondMin:1,diamondMax:1,participantStep:25,poolCap:50,podium:Object.freeze([8,5,3]),finisher:1,familyFinishers:3,familyDiamonds:3});
 function eventPrizesV234(rewards){
  const r=rewards&&typeof rewards==='object'?rewards:{};
  if(Array.isArray(r.podium)){
   const whole=(v,fallback)=>Number.isFinite(Number(v))?Math.max(0,Math.floor(Number(v))):fallback;
   return {hour:true,coins:0,podium:[0,1,2].map(i=>({coins:0,diamonds:whole(r.podium[i],HOUR_EVENT_REWARDS_V234.podium[i])})),finisher:{coins:0,diamonds:whole(r.finisher,HOUR_EVENT_REWARDS_V234.finisher)},
    family:{finishers:whole(r.familyFinishers,HOUR_EVENT_REWARDS_V234.familyFinishers),coins:0,diamonds:whole(r.familyDiamonds,HOUR_EVENT_REWARDS_V234.familyDiamonds)}};
  }
  return {hour:false,coins:Number(r.coins)||0,podium:[{coins:2000,diamonds:25},{coins:1000,diamonds:15},{coins:500,diamonds:10}],finisher:{coins:100,diamonds:3},family:{finishers:3,coins:200,diamonds:3}};
 }
 const seen=eventPrizesV234(JSON.parse(HC.REWARDS_JSON));
 assert.deepEqual([seen.hour,seen.podium.map(p=>p.diamonds),seen.finisher.diamonds,seen.family.diamonds],[true,[8,5,3],1,3],'the diamonds read the same');
 assert.equal([seen.coins,...seen.podium.map(p=>p.coins),seen.finisher.coins,seen.family.coins].every(n=>n===0),true,'no coins shown, never NaN');
 // The new keys only add: every key the old readers use is there with the same value.
 for(const [k,v] of Object.entries(FIRST))if(k!=='coins')assert.deepEqual(JSON.parse(HC.REWARDS_JSON)[k],v,k);
});

test('farm-api standings: (50 + the place\'s coins) × the league, the same diamonds; a first hourly event pays no coins',()=>{
 const now=Date.UTC(2026,9,20,15,30),rows=n=>Array.from({length:n},(_,i)=>({player_id:`p${i}`,progress:{harvested:10},actions:3,joined_at:iso(now-20*M),last_at:iso(now-20*M+i*M)}));
 const event=rewards=>({id:'h',starts_at:iso(now-30*M),ends_at:iso(now+25*M),settled_at:null,objectives:[{stat:'harvested',target:10}],leagues:Array(12).fill({objectives:[{stat:'harvested',target:10}]}),rewards});
 for(const l of EVENT_LEAGUES)
  assert.deepEqual(eventStandings(event(HOUR_EVENT_REWARDS),rows(5),now,l).map(r=>[r.coins,r.diamonds]),[[550*l.coins,8],[300*l.coins,5],[175*l.coins,3],[75*l.coins,1],[75*l.coins,1]],l.id);
 assert.deepEqual(eventStandings(event(FIRST),rows(4),now,league('village')).map(r=>r.coins),[0,0,0,0]);
 // Settled: what settle stored.
 assert.deepEqual(eventStandings({...event(HOUR_EVENT_REWARDS),settled_at:iso(now)},[{...rows(1)[0],qualified:true,coins:1075,diamonds:11}],now).map(r=>[r.coins,r.diamonds]),[[1075,11]]);
 // An event made by hand pays the hourly prizes, coins included.
 assert.deepEqual(validateEvent({title:'Hand made',description:'',starts_at:iso(now+H),ends_at:iso(now+2*H),objectives:[{stat:'harvested',target:5}],rewards:{coins:300}},now).rewards,JSON.parse(HC.REWARDS_JSON));
});

test('the SQL file: guard, check, settle, schedule, the events made ahead and the after-check',()=>{
 assert.equal(SQL,HC.hourlyCoinsSql(),'run node scripts/hourly-coins-sql.mjs');
 assert.match(SQL,/^-- Generated by scripts\/hourly-coins-sql\.mjs/);
 assert.match(SQL,/\nbegin;\nset local lock_timeout='5s';\ndo \$guard\$/);assert.match(SQL,/\nend \$after\$;\ncommit;\n$/);
 // The guard: every harvest_event function as read live after hourly-events.sql (its own md5s), or as this file makes it.
 const guard=JSON.parse(SQL.match(/do \$guard\$\ndeclare want jsonb:='([^']*)'/)[1]);
 assert.equal(Object.keys(guard).length,10);
 for(const [name,hash] of Object.entries(HE.NEW_MD5))assert.ok(guard[name].includes(hash),`${name}: as hourly-events.sql made it`);
 for(const [name,hash] of Object.entries(HC.NEW_MD5))assert.deepEqual(guard[name],[HC.LIVE_MD5[name],hash],`${name}: live or a second run`);
 assert.match(SQL,/if extract\(minute from now\(\)\) not between 5 and 50 then raise exception/);
 // The bodies it starts from are the live ones, byte for byte.
 assert.equal(md5(HE.HOUR_SETTLE_BODY),HC.LIVE_MD5['harvest_event_settle(uuid)']);assert.equal(md5(HE.SCHEDULE_BODY),HC.LIVE_MD5['harvest_event_schedule()']);
 assert.equal(md5(HOUR_VALIDATE_BODY),HC.LIVE_MD5['harvest_event_validate()']);
 for(const [name,hash] of Object.entries(HC.NEW_MD5))assert.equal(md5(body(name.slice(0,name.indexOf('(')))),hash,name);
 // Settle: the hourly coins line and the family coins; the 6-hour lines unchanged.
 const settle=body('harvest_event_settle');assert.equal(settle,HC.SETTLE_BODY);
 assert.ok(settle.includes(`  coins=case when hour then (coalesce((e.rewards->>'coins')::integer,0)+coalesce((e.rewards->'podiumCoins'->>(r.rank::integer-1))::integer,(e.rewards->>'finisherCoins')::integer,0))*(array[${EVENT_LEAGUES.map(l=>l.coins).join(',')}])[r.league+1] else ${HE.LEGACY_LINES.coins} end,\n`));
 assert.ok(settle.includes("fam_c:=case when hour then coalesce((e.rewards->>'familyCoins')::integer,0) else 200 end;"));
 assert.ok(settle.includes('set coins=p.coins+fam_c,diamonds=p.diamonds+fam_d'),'the family coins are flat: no league factor');
 const was=HE.HOUR_SETTLE_BODY.split('\n'),now=settle.split('\n');
 for(const line of was.filter(l=>!/coins=case when hour|fam_c:=|^ --/.test(l)))assert.ok(now.includes(line),`kept: ${line}`);
 // The check: the coin keys together, or none of them and coins 0.
 const check=body('harvest_event_validate');assert.equal(check,HC.VALIDATE_BODY);
 assert.ok(check.includes("if new.rewards ?| array['podiumCoins','finisherCoins','familyCoins'] then")&&check.includes("elsif (new.rewards->>'coins')::integer<>0 then raise exception"));
 assert.ok(!check.includes("or (new.rewards->>'coins')::integer<>0\n"));
 assert.ok(check.startsWith(HOUR_VALIDATE_BODY.slice(0,HOUR_VALIDATE_BODY.indexOf(' if new.rewards ? \'podium\' then'))),'the check before the podium rules is as live');
 // Schedule: only the rewards change.
 const schedule=body('harvest_event_schedule');assert.equal(schedule,HE.SCHEDULE_BODY.replace(HE.REWARDS_JSON,HC.REWARDS_JSON));
 assert.ok(schedule.includes(`rewards constant jsonb:='${JSON.stringify(HOUR_EVENT_REWARDS)}';`));
 // The events made ahead get the coin keys; the running one and the settled ones are left alone.
 assert.match(SQL,/\nupdate public\.live_events set rewards=rewards\|\|'\{"coins":50,"podiumCoins":\[500,250,125\],"finisherCoins":25,"familyCoins":500\}'::jsonb\n where starts_at>now\(\) and settled_at is null and rewards \? 'podium' and not rewards \? 'podiumCoins';\n/);
 assert.deepEqual({...FIRST,...JSON.parse(HC.COINS_JSON)},JSON.parse(HC.REWARDS_JSON),'merged, an event made ahead has exactly the new rewards');
 // Order: the check first (the update must pass it), then settle and schedule, the update, the after-check.
 const at=s=>{const i=SQL.indexOf(s);assert.ok(i>=0,s);return i;};
 assert.ok(at('do $guard$')<at('create temp table hourly_coins_started')&&at('create temp table hourly_coins_started')<at('function public.harvest_event_validate()')&&at('function public.harvest_event_validate()')<at('function public.harvest_event_settle(')
  &&at('function public.harvest_event_settle(')<at('function public.harvest_event_schedule()')&&at('function public.harvest_event_schedule()')<at('\nupdate public.live_events set rewards=')&&at('\nupdate public.live_events set rewards=')<at('do $after$'));
 // After-check.
 const after=SQL.slice(SQL.indexOf('do $after$'));
 assert.deepEqual(JSON.parse(after.match(/want jsonb:='([^']*)'/)[1]),HC.NEW_MD5);
 assert.deepEqual(Object.keys(JSON.parse(after.match(/kept jsonb:='([^']*)'/)[1])).sort(),['harvest_event_board(uuid)','harvest_event_claim(uuid,uuid)','harvest_event_league(integer)','harvest_event_league_for(integer,jsonb,smallint)','harvest_event_pause(timestamptz)','harvest_event_pick(bigint)','harvest_event_progress()']);
 for(const part of ["'{postgres=X/postgres,service_role=X/postgres}'","an hourly event made ahead has no coins","the rewards of an event that had started changed","update public.live_events set rewards=rewards where settled_at is null;",
  "raise exception using errcode='HC001';","exception when sqlstate 'HC001' then null;"])assert.ok(after.includes(part),part);
 assert.doesNotMatch(SQL.replace(/--[^\n]*/g,''),/ · /);
});

test('no alias in a DO block or function shares a name with one of its PL/pgSQL variables (42702)',()=>{
 const blocks=[...SQL.matchAll(/do \$(\w+)\$([^]*?)end \$\1\$;/g)].map(m=>m[2]);
 for(const name of Object.keys(HC.NEW_MD5))blocks.push(body(name.slice(0,name.indexOf('('))));
 assert.equal(blocks.length,5);
 for(const raw of blocks){
  const block=raw.replace(/--[^\n]*/g,'');
  const declare=block.slice(block.indexOf('declare')+7,block.indexOf('\nbegin'));
  const vars=new Set([...declare.matchAll(/(?:^|[;\n,]|declare)\s*(\w+)\s+(?:constant\s+)?(?:jsonb|text|integer|bigint|boolean|uuid|timestamptz|record|public\.live_events)\b(?!\.)/g)].map(m=>m[1]));
  const aliases=new Set([...block.matchAll(/\bas\s+(\w+)\s*\(|\b(?:from|join)\s+(?:public\.)?\w+(?:\([^)]*\))?\s+(?:as\s+)?(\w+)\b/gi)].map(m=>m[1]??m[2]).filter(a=>!/^(where|on|left|join|group|order|set|loop|and|for|limit)$/i.test(a)));
  assert.ok(vars.size>=2,'the variables were found');
  for(const a of aliases)assert.ok(!vars.has(a),`alias ${a} is also a variable`);
 }
});

test('the settle coins line gives what Postgres gave for it live on 20 Oct 2026 (read-only test, 13:30 UTC)',()=>{
 // select (the coins line) for these ranks and leagues, run against the live database: the new rewards, then a first hourly event's.
 const live=[[1,0,550],[2,0,300],[3,0,175],[4,0,75],[1,5,4400],[5,7,900],[1,11,11000],[4,11,1500]];
 const prize=eventPrizes(HOUR_EVENT_REWARDS),place=rank=>prize.podium[rank-1]??prize.finisher;
 for(const [rank,lg,coins] of live)assert.equal((prize.coins+place(rank).coins)*EVENT_LEAGUES[lg].coins,coins,`rank ${rank}, league ${lg}`);
 assert.ok(HC.HOUR_COINS_LINE.includes("coalesce((e.rewards->'podiumCoins'->>(r.rank::integer-1))::integer,(e.rewards->>'finisherCoins')::integer,0)"));
});

// The events window, drawn with a small stand-in for the page (as tests/hourly-events.test.mjs).
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
const hourEvent=(id,start,rewards,extra={})=>({id,title:'Harvest rush',description:'Bring it in.',starts_at:iso(start),ends_at:iso(start+55*M),active:true,settled_at:null,participants:4,rewards,
 objectives:[{stat:'harvested',target:8}],leagues:EVENT_HOUR_POOLS.map((l,i)=>({title:`League ${i}`,description:'',objectives:[{stat:l[0][0].stat,target:l[0][0].target}]})),player:null,...extra});
const podium=html=>{const at=html.indexOf('<div class="event-podium');return html.slice(at,html.indexOf('</ol>',at));};

test('the events window: coins per place × your league, Coins × on the league card, the family bonus and the rules with coins',async t=>{
 const now=Date.UTC(2026,9,20,15,20),clock=()=>now;
 for(const [level,id,factor] of [[20,'sprout',1],[121,'timber',12]]){
  const p=page({level,events:[hourEvent('live',Date.UTC(2026,9,20,15),JSON.parse(HC.REWARDS_JSON)),hourEvent('next',Date.UTC(2026,9,20,16),JSON.parse(HC.REWARDS_JSON))],now:clock});
  t.after(()=>{p.ui.dispose();delete globalThis.document;});
  await p.ui.open();const html=p.html(),card=podium(html);
  assert.match(card,/^<div class="event-podium ">/,`${id}: the coins column`);
  const coins=[...card.matchAll(/data-art="coins"[^>]*><\/span>([\d,]+)<\/span>/g)].map(m=>Number(m[1].replace(/,/g,'')));
  assert.deepEqual(coins,[550,300,175,75].map(n=>n*factor),id);
  assert.match(html,new RegExp(`<strong>${league(id).name}</strong><small>Levels \\d+–\\d+</small><small>Coins ×${factor}</small>`));
  assert.match(html,/Family bonus: when 3 or more of your Farm Family finish, you each get 500 coins and 3 diamonds more\./,'flat: the same in every league');
  assert.match(html,/<li>Everyone who finishes wins coins too; the sooner you finish, the more\.<\/li>/);
  assert.match(html,/<li>Each league has its own top 10 and podium\. Diamonds are the same in every league; higher leagues win more coins\. The family bonus counts family members from every league\.<\/li>/);
  assert.match(html,/The first three to finish in your league win 8, 5 and 3 diamonds\. Everyone else who finishes wins 1 diamond\./);
 }
});

test('the events window: a first hourly event (diamonds only) shows no coins, no Coins ×, and the diamonds-only rules',async t=>{
 const now=Date.UTC(2026,9,20,13,20),clock=()=>now;
 const p=page({level:121,events:[hourEvent('live',Date.UTC(2026,9,20,13),FIRST)],now:clock});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 await p.ui.open();const html=p.html();
 assert.match(podium(html),/^<div class="event-podium no-coins">/);assert.doesNotMatch(podium(html),/data-art="coins"/);
 assert.doesNotMatch(html,/Coins ×|wins coins too|higher leagues win more coins|500 coins/);
 assert.match(html,/you each get 3 diamonds more\./);
 assert.match(html,/The prizes are the same in every league\./);
});

test('Collect and Recent events: the coins of an hourly event, in one text every language translates whole',async t=>{
 const now=Date.UTC(2026,9,20,15,20),clock=()=>now,R=JSON.parse(HC.REWARDS_JSON);
 const events=[hourEvent('live',Date.UTC(2026,9,20,15),R),
  hourEvent('owed',Date.UTC(2026,9,20,14),R,{settled_at:iso(Date.UTC(2026,9,20,14,55)),qualified:3,participants:9,player:{qualified:true,claimed_at:null,coins:550,diamonds:8}}),
  hourEvent('done',Date.UTC(2026,9,20,13),R,{settled_at:iso(Date.UTC(2026,9,20,13,55)),qualified:22,participants:58,player:{qualified:true,claimed_at:iso(now-H),coins:75,diamonds:1,paid_diamonds:1}}),
  hourEvent('first',Date.UTC(2026,9,20,12),FIRST,{settled_at:iso(Date.UTC(2026,9,20,12,55)),qualified:3,participants:4,player:{qualified:true,claimed_at:iso(now-2*H),coins:0,diamonds:1,paid_diamonds:1}})];
 const p=page({level:20,events,now:clock});
 t.after(()=>{p.ui.dispose();delete globalThis.document;});
 await p.ui.open();const html=p.html();
 assert.match(html,/550 coins<\/strong>/);assert.match(html,/8 diamonds<\/strong>/);
 assert.match(html,/<span>Collected 75 coins and 1 diamond · 22 of 58 finished<\/span>/);
 assert.match(html,/<span>Collected 1 diamond · 3 of 4 finished<\/span>/,'a first hourly event: diamonds only');
 assert.doesNotMatch(html,/Collected · /);
 const {createTranslator}=await import('../public/i18n.js'),nl=createTranslator(translations('nl'),'nl'),de=createTranslator(translations('de'),'de');
 const tr=(t,k)=>typeof t==='function'?t(k):t.translate(k);
 assert.equal(tr(nl,'Collected 75 coins and 1 diamond · 22 of 58 finished'),'75 munten en 1 diamant opgehaald · 22 van 58 klaar');
 assert.equal(tr(de,'Collected 2,200 coins and 25 diamonds · 4 of 9 finished'),'2,200 Münzen und 25 Diamanten abgeholt · 4 von 9 fertig');
});

test('the standings caption follows the event: coins and diamonds, or diamonds only',()=>{
 const ui=read('public/live-events-ui.js');
 assert.match(ui,/eventPrizes\(e\.rewards\)\.paysCoins\?'Prizes if the event ended now\. The first three to finish in your league win the most coins and diamonds\.':'Prizes if the event ended now\. The first three to finish in your league win the most diamonds\.'/);
 // 23 Oct 2026: the prizes are four tiles on one row; an event without coins has the same tiles, with diamonds only.
 assert.match(read('public/retention.css'),/\.event-podium ol\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});

test('every new or changed text is in the catalog and in all 15 languages, without middle dots or other game names',()=>{
 const texts=['Everyone who finishes wins coins too; the sooner you finish, the more.',
  'Family bonus: when {0} or more of your Farm Family finish, you each get {1} coins and {2} diamonds more.',
  'Prizes if the event ended now. The first three to finish in your league win the most coins and diamonds.',
  'Finish an event with two or more members of your Farm family: you each get 500 coins and 3 diamonds extra.',
  'From level 15 a new event starts every hour: finish its goal for coins and diamonds.',
  'Reach the goal and you have finished. Everyone who finishes wins coins and diamonds; the sooner you finish, the more. The first three in each league win {0}, {1} and {2} diamonds, every other finisher {3}.',
  'Each league has its own top 10 and podium. Diamonds are the same in every league; higher leagues win more coins. The family bonus counts family members from every league.',
  'When {0} of you finish the same event, each gets {1} coins and {2} diamonds extra.',
  'When {0} or more members of one Farm family finish the same event, each of them gets {1} coins and {2} diamonds more.',
  'From level {0} you race in a village league, with goals in the village and coins ×{1} to ×{2}. Each one you finish counts in Village events and in Events finished.',
  'Every league has the same diamonds; coins grow with the league. The family bonus counts family members from every league.',
  'First place','{0} coins and {1} diamonds','Coins ×{0}','Coins ×{0} in events','Collected {0} coins','Collected {0} coins and {1} diamond','Collected {0} coins and {1} diamonds'];
 const all=catalog(),codes=LANGUAGES.filter(l=>l.code!=='en').map(l=>l.code);
 assert.equal(codes.length,15);
 for(const text of texts){
  assert.ok(text in all,text);assert.doesNotMatch(text,/ · /);
  for(const code of codes){const out=translations(code)[text];assert.ok(out,`${code}: ${text}`);assert.equal(problem(text,out),'',`${code}: ${text}`);assert.doesNotMatch(JSON.stringify(out),/ · /,`${code}: ${text}`);}
 }
 // The old diamonds-only texts that are gone from the screens are gone from the catalog.
 for(const gone of ['From level 15 a new event starts every hour: finish its goal for diamonds.','Finish an event with two or more members of your Farm family: you each get 3 diamonds extra.',
  'Reach the goal and you have finished. The first three to finish in each league win {0}, {1} and {2} diamonds, every other finisher {3}.'])assert.ok(!(gone in all),gone);
});
