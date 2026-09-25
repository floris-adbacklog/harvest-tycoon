import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,rookieBoost,cropDuration,CHORES,ITEMS,choreRewards} from '../game/farm-state.js';
test('the beginner boost eases evenly from 80% to zero over the first day, never rewrites running timers',()=>{
 const start=1e12,H=3600000,s=createFarm(start),ready=s.plots[0].readyAt,near=(a,b)=>Math.abs(a-b)<1e-9;
 assert.equal(rookieBoost(s,start),.8);assert(near(rookieBoost(s,start+6*H),.6));assert(near(rookieBoost(s,start+12*H),.4));assert(near(rookieBoost(s,start+18*H),.2));assert.equal(rookieBoost(s,start+24*H),0);
 let previous=0;for(let h=0;h<=26;h++){const duration=cropDuration(s,'corn',false,start+h*H);assert(duration>=previous);previous=duration;}
 assert.equal(s.plots[0].readyAt,ready);assert(Math.abs(rookieBoost(s,start+H-1)-rookieBoost(s,start+H+1))<.000001);
});
test('every chore pays coins and XP; the bonus adds a few goods instead of more coins, worth no more than the full old reward',()=>{
 for(const c of Object.values(CHORES))for(let chance=c.baseChance;chance<=c.maxChance;chance+=2){
  const base=choreRewards(c),bonus=choreRewards(c,true);
  for(const key of ['coins','xp']){assert(base[key]>=1);assert.equal(bonus[key],base[key],'the bonus never adds coins or XP');assert(base[key]<=c[key]*chance/100+1e-9);}
  assert.deepEqual(base.items,{});assert.deepEqual(bonus.items,{[c.bonus.item]:c.bonus.count});
  assert(ITEMS[c.bonus.item].sell*c.bonus.count<=c.coins,'a lucky find stays below what a full old success paid');
 }
});
