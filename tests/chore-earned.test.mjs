import test from 'node:test';import assert from 'node:assert/strict';
import {createFarm,applyFarmAction,xpForLevel} from '../public/farm-state.js';
// 7 Nov 2026 (a farmer): a chore's coins count for the Earn coins event goal and the Coin Collector tournament (stats.earned).
test('a chore adds its coins to stats.earned',()=>{
 const now=Date.UTC(2026,10,7,12),s=createFarm(now);s.xp=xpForLevel(20);const before=s.stats.earned,coins=s.coins;
 applyFarmAction(s,{type:'chore',id:'weeds'},now);
 assert.ok(s.coins>coins);assert.equal(s.stats.earned-before,s.coins-coins);
});
