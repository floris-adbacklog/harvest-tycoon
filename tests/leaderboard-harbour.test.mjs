import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDINGS,EVENT_LEAGUES} from '../public/farm-state.js';
const read=f=>readFileSync(new URL(`../${f}`,import.meta.url),'utf8');

// 29 Oct 2026, the owner: World III's leaderboards "zoals village".
test('the harbour boards read their own columns, and the SQL keeps the harbour places and leagues as the game has them', ()=>{
 const sql=read('supabase/leaderboard-harbour.sql');
 assert.match(sql,/add column if not exists ships_sent integer not null default 0/);
 assert.match(sql,/add column if not exists harbour_events_finished integer not null default 0/);
 assert.match(sql,/grant select \(ships_sent, harbour_events_finished\) on public\.player_stats to authenticated/);
 assert.match(sql,/new\.ships_sent:=\(farm#>>''\{stats,ships_sent\}''\)::integer/);
 // Every harbour place out of "Most building upgrades", like the village's.
 const places=Object.keys(BUILDINGS).filter(k=>BUILDINGS[k].world===3);
 for(const p of places)assert.ok(sql.includes(`''${p}''`),p);
 // The harbour's leagues are 12 to 16.
 const harbour=EVENT_LEAGUES.map((l,i)=>[l,i]).filter(([l])=>l.world===3).map(([,i])=>i);
 assert.deepEqual([harbour[0],harbour.at(-1)],[12,16]);
 assert.equal((sql.match(/lp\.league between 12 and 16/g)??[]).length,3,'the settle, the fill and its filter');
 assert.match(sql,/md5\(definition\)<>'24a6de2db303384a982420bd16406073'/);assert.match(sql,/md5\(definition\)<>'87fd41b8abcdb841be58fac7861aff63'/);
});
