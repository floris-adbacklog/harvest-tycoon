import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm} from '../game/farm-state.js';
import {welcomeSummary} from '../supabase/functions/farm-api/welcome-service.js';
const now=Date.UTC(2026,8,22);
test('welcome requires an actual return and reports existing ready rewards without minting any',()=>{
 const s=createFarm(now),copy=structuredClone(s);
 assert.equal(welcomeSummary(s,new Date(now).toISOString(),now),null);
 assert.equal(welcomeSummary(s,'invalid',now),null);
 const summary=welcomeSummary(s,new Date(now).toISOString(),now+3600000);
 assert(summary.crops>0);assert.equal(summary.stall,0);assert.equal(summary.away,3600000);assert.deepEqual(s,copy);
});
