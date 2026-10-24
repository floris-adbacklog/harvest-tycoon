import test from 'node:test';
import assert from 'node:assert/strict';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,marketQuote,marketSaleValue,utcDay,FEATURE_LEVELS,SHIP_BIN_LEVEL,SHIP_BIN_BONUS,shipBinRoom,shipBinCount,payShipBin} from '../game/farm-state.js';

// The shipping bin (24 Oct 2026, the owner's "Doe 1&2" to the lessons of a well-loved farming game): in today at today's price and 10%
// on top, paid at 00:00 UTC on the next load, room that grows with the level, take back before midnight, counts nowhere.
const now=Date.UTC(2026,9,24,15),DAY=86400000;
const farm=(level=20)=>{const s=createFarm(now-30*DAY);s.xp=xpForLevel(level)+10;s.rookieUntil=0;s.onboarding={...s.onboarding,completed:10,rewardClaimed:true};s.inventory.wheat=100;s.inventory.eggs=40;return normalizeFarm(s,now);};

test('opens at its level, beside Delivery orders; room grows with the level up to 500',()=>{
 assert.equal(FEATURE_LEVELS.shipbin,SHIP_BIN_LEVEL);assert.equal(SHIP_BIN_LEVEL,7);
 assert.throws(()=>act(farm(6),{type:'bin_add',item:'wheat',count:1},now),/Reach level 7 to unlock Shipping bin\./);
 assert.equal(shipBinRoom(farm(7)),55);assert.equal(shipBinRoom(farm(200)),500);
});

test('in at today\'s price with 10% on top, out of the Warehouse at once; paid on the next day\'s load, once',()=>{
 const s=farm(),coins=s.coins,price=marketSaleValue(s,30*marketQuote('wheat',now).price,now),want=Math.floor(price*(1+SHIP_BIN_BONUS));
 const r=act(s,{type:'bin_add',item:'wheat',count:30},now);
 assert.deepEqual([r.count,r.coins,s.inventory.wheat,shipBinCount(s),s.coins],[30,want,70,30,coins]);
 act(s,{type:'bin_add',item:'eggs',count:10},now);const total=s.shipBin.coins;
 assert.equal(payShipBin(s,now+3600000),null,'not before 00:00 UTC');
 const next=normalizeFarm(structuredClone(s),now+DAY);
 assert.equal(next.coins,coins+total);assert.equal(next.shipBin,undefined);assert.deepEqual(next.shipPaid,{day:utcDay(now+DAY),coins:total,count:40});
 assert.equal(next.stats.bin_shipped,40);assert.equal(next.stats.bin_earned,total);
 assert.equal(next.stats.sold,s.stats.sold,'counts as no sale');assert.equal(next.stats.earned,s.stats.earned,'and as nothing earned');
 const again=normalizeFarm(structuredClone(next),now+DAY+60000);assert.equal(again.coins,next.coins,'paid once');
});

test('the room, take back for what it was put in at, village goods stay out',()=>{
 const s=farm(7);s.inventory.wheat=200;
 assert.throws(()=>act(s,{type:'bin_add',item:'wheat',count:56},now),/The bin has room for 55 more\./);
 act(s,{type:'bin_add',item:'wheat',count:50},now);act(s,{type:'bin_add',item:'eggs',count:5},now);
 assert.throws(()=>act(s,{type:'bin_add',item:'eggs',count:1},now),/The shipping bin is full\./);
 const before=s.shipBin.coins,wheat=s.inventory.wheat;act(s,{type:'bin_take',item:'wheat'},now);
 assert.equal(s.inventory.wheat,wheat+50);assert.ok(s.shipBin.coins<before&&s.shipBin.coins>0);assert.deepEqual(Object.keys(s.shipBin.items),['eggs']);
 act(s,{type:'bin_take',item:'eggs'},now);assert.equal(s.shipBin,undefined,'an empty bin is gone');
 assert.throws(()=>act(s,{type:'bin_take',item:'eggs'},now),/not in the shipping bin/);
 assert.throws(()=>act(s,{type:'bin_add',item:'stone',count:1},now),/Choose a crop or good for the shipping bin\./);
 assert.throws(()=>act(s,{type:'bin_add',item:'wheat',count:999},now),/You have \d+ wheat to put in\./);
});
