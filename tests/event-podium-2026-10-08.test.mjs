import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import * as service from '../supabase/functions/farm-api/event-service.js';
import {EVENT_LEAGUES,FAMILY_EVENT_BONUS} from '../game/farm-state.js';

// 8 Oct 2026, the owner's choice ("option 3"): the event podium always pays 25 / 15 / 10 diamonds, in every league and however many
// farmers finished there; every other finisher 3. On 7 Oct 2026 the podium's diamonds needed 4 finishers in the league, and only 2 of
// the 24 leagues with finishers in the first 5 events reached that. The coins, the league multipliers and the family bonus stay.
const {eventStandings,PODIUM,FINISHER_PRIZE}=service;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const screen=await import('../public/live-events-ui.js'),{wikiArticle}=await import('../public/wiki-content.js');
const now=Date.UTC(2026,9,8,12),H=3600000,iso=t=>new Date(t).toISOString();
const event={id:'e',starts_at:iso(now-H),ends_at:iso(now+H),settled_at:null,objectives:[{stat:'harvested',target:10}],rewards:{coins:200}};
const finishers=n=>Array.from({length:n},(_,i)=>({player_id:`p${i}`,progress:{harvested:10},actions:3,joined_at:iso(now-H),last_at:iso(now-H+(10+i)*60000)}));
const diamonds=rows=>eventStandings(event,rows,now).map(r=>r.diamonds);
const fresh=read('supabase/event-podium-2026-10-08.sql'),before=read('supabase/diamonds-2026-10-07.sql');
// What the SQL pays per place: 1st, 2nd, 3rd and everyone after.
const sqlDiamonds=fresh.match(/diamonds=\(case r\.rank when 1 then (\d+) when 2 then (\d+) when 3 then (\d+) else (\d+) end\)/)?.slice(1).map(Number);
const sqlPays=n=>Array.from({length:n},(_,i)=>sqlDiamonds[Math.min(i,3)]);

test('the podium pays alone too: one finisher 25, two 25 and 15, three 25 / 15 / 10, four 25 / 15 / 10 / 3',()=>{
 assert.deepEqual(PODIUM.map(p=>p.diamonds),[25,15,10]);assert.equal(FINISHER_PRIZE.diamonds,3);
 assert.equal(service.PODIUM_MIN_FINISHERS,undefined,'no finisher threshold any more');
 assert.deepEqual(diamonds(finishers(1)),[25],'one finisher alone in the league');
 assert.deepEqual(diamonds(finishers(2)),[25,15]);
 assert.deepEqual(diamonds(finishers(3)),[25,15,10]);
 assert.deepEqual(diamonds(finishers(4)),[25,15,10,3]);
 assert.deepEqual(diamonds(finishers(6)),[25,15,10,3,3,3]);
 // Farmers still busy win nothing yet and change nothing for the finishers.
 assert.deepEqual(diamonds([...finishers(1),...finishers(4).slice(1).map(r=>({...r,progress:{harvested:9}}))]),[25,0,0,0]);
 // The coins stay: the event's own plus +2000 / +1000 / +500, and +100 for every later finisher.
 assert.deepEqual(eventStandings(event,finishers(4),now).map(r=>[r.coins,r.podium]),[[2200,true],[1200,true],[700,true],[300,false]]);
 // An event settled before the change shows what it paid (3 for a lone first place under the 7 Oct rule).
 const settled=eventStandings({...event,settled_at:iso(now)},[{...finishers(1)[0],qualified:true,coins:2200,diamonds:3}],now);
 assert.deepEqual(settled.map(r=>[r.coins,r.diamonds]),[[2200,3]]);
});

test('every league pays the same diamonds; only the coins grow with the league, as before',()=>{
 for(const league of EVENT_LEAGUES){
  const rows=finishers(2).map(r=>({...r,league:league.index}));
  assert.deepEqual(eventStandings(event,rows,now,league).map(r=>[r.coins,r.diamonds]),[[(200+2000)*league.coins,25],[(200+1000)*league.coins,15]],league.name);
 }
 assert.deepEqual(EVENT_LEAGUES.map(l=>l.coins),[1,2,3,4,5,8]);
 assert.deepEqual(FAMILY_EVENT_BONUS,{finishers:3,coins:200,diamonds:3},'the family bonus stays');
});

test('the SQL changes only the diamonds of the live (7 Oct) harvest_event_settle, runs as-is in the SQL editor and can run twice',()=>{
 const body=sql=>{const i=sql.indexOf('function public.harvest_event_settle'),a=sql.indexOf('$function$',i)+10;return sql.slice(a,sql.indexOf('$function$',a));};
 const head=sql=>sql.slice(sql.indexOf('create or replace function'),sql.indexOf('$function$'));
 assert.equal(head(fresh),head(before),'the same signature and settings (search_path, not security definer)');
 assert.match(head(fresh),/^create or replace function public\.harvest_event_settle\(p_event uuid\)\n returns void\n language plpgsql\n set search_path to ''\nas $/);
 assert.equal(fresh.split('create or replace function').length,2,'one function, nothing else');
 assert.doesNotMatch(fresh.replace(/^--.*$/gm,''),/\b(insert|delete|drop|alter|grant|revoke|truncate)\b/i,'no data or rights touched');
 assert.doesNotMatch(fresh,/^\s*\\/m,'no psql commands: it runs in the Supabase SQL editor');
 assert.match(fresh,/[Ss]afe to run twice/);assert.match(fresh,/end \$function\$;\n$/);
 assert.match(fresh,/^-- The event podium always pays its diamonds \(8 Oct 2026, the owner's choice: "option 3"\)\.$/m);
 // Pushing only the website would promise 25 while the live settlement still pays 3, so the header names the order.
 assert.match(fresh,/^-- Run this first, then deploy farm-api, then push the website \(8 Oct 2026\)/m,'the release order');
 const changed=[
  [" -- (7 Oct 2026; 50, 30, 20 and 5 before), and the podium's diamonds only where at least 4 finished in the league: else 3 for all.\n",
   " -- (7 Oct 2026; 50, 30, 20 and 5 before), however many finished in the league (8 Oct 2026; on 7 Oct only with 4 or more).\n"],
  ["row_number() over(partition by league order by last_at,player_id) as rank,count(*) over(partition by league) as finishers from","row_number() over(partition by league order by last_at,player_id) as rank from"],
  ["diamonds=(case when r.finishers>=4 then (case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end) else 3 end)","diamonds=(case r.rank when 1 then 25 when 2 then 15 when 3 then 10 else 3 end)"]];
 let expected=body(before);for(const [from,to] of changed){assert.equal(expected.split(from).length,2,from);expected=expected.replace(from,to);}
 assert.equal(body(fresh),expected,'everything else is the live function, byte for byte');
 assert.doesNotMatch(body(fresh).replace(/--.*$/gm,''),/finishers/,'nothing counts the finishers any more');
});

test('the SQL, farm-api and the event screen pay and show the same numbers',()=>{
 assert.deepEqual(sqlDiamonds,[...PODIUM.map(p=>p.diamonds),FINISHER_PRIZE.diamonds]);
 const coins=fresh.match(/coins=\(\(e\.rewards->>'coins'\)::integer\+\(case r\.rank when 1 then (\d+) when 2 then (\d+) when 3 then (\d+) else (\d+) end\)\)\*\(case r\.league when 5 then 8 else r\.league\+1 end\)/);
 assert.deepEqual(coins.slice(1).map(Number),[...PODIUM.map(p=>p.coins),FINISHER_PRIZE.coins],'the coins as before');
 assert.match(fresh,new RegExp(`having count\\(\\*\\)>=${FAMILY_EVENT_BONUS.finishers}\\)\\n update public\\.live_event_players p set coins=p\\.coins\\+${FAMILY_EVENT_BONUS.coins},diamonds=p\\.diamonds\\+${FAMILY_EVENT_BONUS.diamonds}\\n`),'the family bonus');
 // Settlement and the "if it ended now" standings agree for every number of finishers.
 for(let n=1;n<=8;n++)assert.deepEqual(diamonds(finishers(n)),sqlPays(n),`${n} finishers`);
 assert.deepEqual([screen.PODIUM_PRIZES,screen.FINISHER_PRIZE],[PODIUM,FINISHER_PRIZE],'the screen shows what the server pays');
});

test('the event screen and the wiki: 25 / 15 / 10 for the top three and 3 for everyone else, no finisher rule',()=>{
 assert.equal(screen.PODIUM_RULE,undefined);assert.equal(screen.PODIUM_MIN_FINISHERS,undefined);
 const ui=read('public/live-events-ui.js');
 assert.doesNotMatch(ui,/PODIUM_RULE|PODIUM_MIN_FINISHERS|event-podium-note|rivals/);
 assert.match(ui,/\$\{PODIUM_PRIZES\.map\(\(p,i\)=>row\(p,art\(MEDALS\[i\]\),placeLabel\(i\+1\)\)\)\.join\(''\)\}\$\{row\(FINISHER_PRIZE,'<i aria-hidden="true"><\/i>','Everyone else'\)\}<\/ol><p class="event-family-bonus">/,'the prize list, then the family bonus');
 assert.match(ui,/'Rewards if the event ended now\. The first three to finish in your league win extra coins and diamonds\.'/,'the standings caption');
 assert.match(ui,/The list above shows what each place wins in total\.<\/li><li>You race in your league/,'How events work');
 assert.doesNotMatch(read('public/retention.css'),/event-podium-note/);
 const events=wikiArticle('events').html;
 assert.match(events,/The first three in each league win 25, 15 and 10 diamonds, every other finisher 3\.<\/p>/);
 assert.match(events,/When 3 or more members of one Farm family finish the same event, each of them gets 200 coins and 3 diamonds more\./);
 assert.doesNotMatch(events,/Podium diamonds need|finishers in your league|With fewer|rivals/i);
 for(const path of ['game/farm-state.js','public/farm-state.js','supabase/functions/farm-api/farm-state.js','supabase/functions/farm-api/event-service.js','public/live-events-ui.js','public/wiki-content.js'])
  assert.doesNotMatch(read(path),/PODIUM_MIN_FINISHERS|PODIUM_RULE|need at least 4 finishers|podium only with rivals/,path);
});

test('no text in any language still names the finisher rule, and the new caption is translated in all 15',()=>{
 const catalog=JSON.parse(read('i18n/catalog.json'));
 const gone=['Podium diamonds need at least {0} finishers in your league. With fewer, every finisher gets {1} diamonds.','Rewards if the event ended now. The first three to finish in your league win extra coins, and extra diamonds once {0} or more have finished.'];
 const caption='Rewards if the event ended now. The first three to finish in your league win extra coins and diamonds.';
 assert.ok(caption in catalog);assert.doesNotMatch(caption,/ · /);
 assert.ok(!Object.keys(catalog).some(k=>/finishers in your league|or more have finished/.test(k)),'the catalog');
 const files=readdirSync(new URL('../public/i18n/',import.meta.url)).filter(n=>n.endsWith('.json'));
 assert.equal(files.length,15);
 for(const file of files){
  const t=JSON.parse(read(`public/i18n/${file}`));
  for(const text of gone)assert.ok(!(text in t),`${file}: ${text}`);
  assert.equal(typeof t[caption],'string',file);assert.doesNotMatch(t[caption],/\{0\}| · /,file);
 }
});
