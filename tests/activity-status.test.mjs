import test from 'node:test';
import assert from 'node:assert/strict';
import {isRecentlyActive,createFarmPresence,ONLINE_WINDOW} from '../src/presence.js';
test('online lasts strictly less than thirty minutes after a server-recorded action',()=>{
 const start=Date.UTC(2026,8,18),last=new Date(start).toISOString();
 assert.equal(isRecentlyActive(last,start),true);assert.equal(isRecentlyActive(last,start+ONLINE_WINDOW-1),true);assert.equal(isRecentlyActive(last,start+ONLINE_WINDOW),false);
 assert.equal(isRecentlyActive(null,start),false);assert.equal(isRecentlyActive('invalid',start),false);assert.equal(isRecentlyActive(last,start-1000),false);
});
test('an open page expires online status without requiring a reload or live socket',()=>{
 const start=Date.UTC(2026,8,18);let now=start,tick,cleared=false,latest;
 const presence=createFarmPresence({},'self',{}, {setInterval(fn){tick=fn;return 1;},clearInterval(){cleared=true;}},()=>now);
 presence.subscribe(s=>latest=s);presence.setRows([{player_id:'self',last_active_at:new Date(start).toISOString()}]);assert.deepEqual(latest.onlinePlayers,['self']);
 now+=ONLINE_WINDOW;tick();assert.deepEqual(latest.onlinePlayers,[]);presence.dispose();assert.equal(cleared,true);
});

import {readFileSync} from 'node:fs';
test('the restore migration stamps last_active_at on real actions only, and never moves it backwards',()=>{
 const sql=readFileSync(new URL('../supabase/restore-activity-status.sql',import.meta.url),'utf8');
 assert.match(sql,/case when p_expected>0 then clock_timestamp\(\) else null end/);
 assert.match(sql,/last_active_at=coalesce\(excluded\.last_active_at,public\.player_stats\.last_active_at\)/);
 assert.match(sql,/f\.updated_at>coalesce\(s\.last_active_at/);
});
