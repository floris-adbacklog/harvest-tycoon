import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,rookieBoost,cropDuration,CHORES,ITEMS,choreRewards} from '../game/farm-state.js';
test('boost tapers continuously to zero, never rewrites running timers',()=>{
 const s=createFarm(1e12),t=s.rookieUntil,ready=s.plots[0].readyAt;
 assert.equal(rookieBoost(s,t),.8);assert.equal(rookieBoost(s,t+45*60000),.4);assert.equal(rookieBoost(s,t+90*60000),0);
 let previous=0;for(let m=0;m<=120;m++){const duration=cropDuration(s,'corn',false,1e12+m*60000);assert(duration>=previous);previous=duration;}
 assert.equal(s.plots[0].readyAt,ready);assert(Math.abs(rookieBoost(s,t-1)-rookieBoost(s,t+1))<.000001);
});
test('every chore pays coins and XP; the bonus adds a few goods instead of more coins, worth no more than the full old reward',()=>{
 for(const c of Object.values(CHORES))for(let chance=c.baseChance;chance<=c.maxChance;chance+=2){
  const base=choreRewards(c),bonus=choreRewards(c,true);
  for(const key of ['coins','xp']){assert(base[key]>=1);assert.equal(bonus[key],base[key],'the bonus never adds coins or XP');assert(base[key]<=c[key]*chance/100+1e-9);}
  assert.deepEqual(base.items,{});assert.deepEqual(bonus.items,{[c.bonus.item]:c.bonus.count});
  assert(ITEMS[c.bonus.item].sell*c.bonus.count<=c.coins,'a lucky find stays below what a full old success paid');
 }
});
