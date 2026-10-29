import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EVENT_LEAGUES} from '../game/farm-state.js';
import {EVENT_HOUR_POOLS,EVENT_HOUR_MIX,EVENT_HOUR_OLDER,HOUR_LEFT_OUT,hourGoalSources} from '../public/event-goals.js';
import {HOUR_PICK_BODY_HARBOUR} from '../scripts/event-goals-sql.mjs';
import {hourMixSql,LIVE_MD5,NEW_MD5,PICK_BODY,ALLOWED} from '../scripts/hour-mix-sql.mjs';
import {wikiArticle} from '../public/wiki-content.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Older worlds' goals in the higher leagues (29 Oct 2026, the owner: "de vorige kunnen ook nog gehaald worden", option 2).
test('a farm league draws only its own; a village league half farm; a harbour league half own, a quarter village, a quarter farm',()=>{
 for(const l of EVENT_LEAGUES){
  const shares=Object.fromEntries(hourGoalSources(l.index).map(s=>[s.world,s.share]));
  assert.deepEqual(shares,l.world===1?{1:1}:l.world===2?{2:.5,1:.5}:{3:.5,2:.25,1:.25},l.name);
 }
 assert.equal(EVENT_HOUR_MIX.length,EVENT_LEAGUES.length);
});
test('an older world\'s goals are its top league\'s (never scaled further), without the hour\'s left-out goals',()=>{
 assert.equal(EVENT_HOUR_OLDER[1],EVENT_HOUR_POOLS[EVENT_LEAGUES.filter(l=>l.world===1).at(-1).index]);
 assert.equal(EVENT_HOUR_OLDER[2],EVENT_HOUR_POOLS[EVENT_LEAGUES.filter(l=>l.world===2).at(-1).index]);
 for(const pool of Object.values(EVENT_HOUR_OLDER)){assert.equal(pool.length,5);for(const group of pool){assert.ok(group.length,'every kind of play has a goal');for(const g of group)assert.ok(!HOUR_LEFT_OUT[g.stat],g.stat);}}
 // A harbour league may get a farm or a village goal, a farm league never another world's.
 assert.ok(ALLOWED[12].includes('harvested')&&ALLOWED[12].includes('village_batches')&&ALLOWED[12].includes('ship_loads'));
 assert.ok(!ALLOWED[0].includes('village_batches')&&!ALLOWED[5].includes('ship_loads'));
});
test('the pick keeps every league\'s own pool as it runs, and draws the source on a hash of its own',()=>{
 const pools=body=>body.match(/ pools constant jsonb:='(.*)';/)[1];
 assert.equal(pools(PICK_BODY),pools(HOUR_PICK_BODY_HARBOUR),'the own pools are the live ones');
 assert.match(PICK_BODY,/src:=mix->lg->>\(\(abs\(hashtextextended\('harvest-hour-source:'\|\|n\|\|':'\|\|lg,0\)\)%jsonb_array_length\(mix->lg\)\)::int\);/);
 assert.match(PICK_BODY,/pool:=case when src='own' then pools->lg->grp else older->src->grp end;/);
 assert.match(PICK_BODY,/r:=abs\(hashtextextended\('harvest-hour-event:'\|\|n\|\|':'\|\|lg,0\)\);/,'the goal itself is drawn as before');
});
test('the SQL file: the generator\'s, guarded by the live pick, never at hh:00-hh:04, farm leagues compared with before, in one transaction',()=>{
 const sql=read('supabase/hour-mix.sql');
 assert.equal(sql,hourMixSql(),'run node scripts/hour-mix-sql.mjs');
 assert.ok(sql.includes(LIVE_MD5)&&sql.includes(NEW_MD5));assert.equal(LIVE_MD5,'662d444e40f2d89fff524fbd551f023f');
 assert.match(sql,/extract\(minute from now\(\)\)<5/);assert.match(sql,/create temp table hour_mix_before on commit drop/);
 assert.match(sql,/a farm league''s goal changed/);assert.match(sql,/\nbegin;\n/);assert.match(sql,/\ncommit;\n$/);
 assert.equal((sql.match(/create or replace function /g)??[]).length,1);
});
test('the wiki and the event window say that older worlds\' goals come up too',()=>{
 const events=wikiArticle('events',{level:250}).html,village=wikiArticle('village',{level:150}).html;
 assert.match(events,/Half of the time a village or harbour league's goal comes from an earlier world instead/);
 assert.match(events,/Half of the time the goal comes from the farm instead\./);assert.match(events,/Half of the time the goal comes from the village or the farm instead\./);
 assert.match(village,/Half of the time the goal comes from the farm instead\./);
 const ui=read('public/live-events-ui.js');
 assert.ok(ui.includes('<span>Half of the time the goal comes from the farm instead.</span>')&&ui.includes('<span>Half of the time the goal comes from the village or the farm instead.</span>'));
});
