import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,applyFarmAction,firstSaleDouble,marketPay,marketSaleValue,marketQuote,sellableStock,beginnerProgress} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,20,12);
const act=(state,action,time=now)=>applyFarmAction(state,action,time,()=>0);
const worth=(state,item,time=now)=>marketSaleValue(state,sellableStock(state,item,time)*marketQuote(item,time).price,time);

// Option 4 of the step 2 study (the owner, 20 Oct 2026: "Doe alleen 4"): 21% of new farmers who harvested never made the first sale, and
// 83% of them still had their 500 starting coins. A guided farm's first sale at the Market pays double, once.
test('a new farm’s first sale pays double, once, and finishes step 2',()=>{
 const state=createFarm(now);
 assert.equal(firstSaleDouble(state),true,'from the start: step 1 can sell too');
 act(state,{type:'field',id:0,action:'harvest'});
 assert.equal(beginnerProgress(state).find(q=>q.current).id,'sell');
 assert.equal(firstSaleDouble(state),true);
 const single=worth(state,'corn');assert.ok(single>0);
 assert.equal(marketPay(state,sellableStock(state,'corn',now)*marketQuote('corn',now).price,now),single*2,'the Market shows the doubled price');
 const coins=state.coins,earned=state.stats.earned,r=act(state,{type:'sell',item:'corn'});
 assert.equal(r.coins,single*2);assert.equal(r.firstSale,true);
 assert.equal(state.coins,coins+single*2);assert.equal(state.stats.earned,earned+single*2,'quests count what was paid');
 assert.deepEqual(r.guide?.map(g=>g.step),['sell']);
 assert.equal(firstSaleDouble(state),false,'once');
 const wheat=worth(state,'wheat'),again=act(state,{type:'sell',item:'wheat'});
 assert.equal(again.coins,wheat);assert.equal(again.firstSale,undefined);
});

test('a sale before the first harvest is the first sale: it doubles, and the second does not',()=>{
 const state=createFarm(now);
 const wheat=worth(state,'wheat'),r=act(state,{type:'sell',item:'wheat'});
 assert.equal(r.coins,wheat*2);assert.equal(r.firstSale,true);assert.equal(firstSaleDouble(state),false);
 // The harvest then finishes steps 1 and 2 at once (the sale was done early), and the corn sells at the normal price.
 assert.deepEqual(act(state,{type:'field',id:0,action:'harvest'}).guide.map(g=>g.step),['harvest','sell']);
 const corn=worth(state,'corn');assert.equal(act(state,{type:'sell',item:'corn'}).coins,corn);
});

test('only a guided farm in its first two guide steps doubles: an older farm or a finished guide never does',()=>{
 const legacy=createLegacyFarm(now);assert.equal(firstSaleDouble(legacy),false);
 const corn=worth(legacy,'corn');assert.equal(act(legacy,{type:'sell',item:'corn'}).coins,corn);
 const done=createFarm(now);done.onboarding={...done.onboarding,completed:10,rewardClaimed:true};assert.equal(firstSaleDouble(done),false);
 // A farm on step 2 that earned coins with an order but never sold at the Market still gets its double first sale.
 const order=createFarm(now);order.onboarding.completed=1;order.stats.earned=300;assert.equal(firstSaleDouble(order),true);
});

test('the guide, the pointer, the Market and the level 2 line all say it',()=>{
 assert.match(beginnerProgress(createFarm(now)).find(q=>q.id==='sell').description,/Your first sale pays double\.$/);
 assert.match(read('public/guide-steps.js'),/firstSaleDouble\(state\)\?'Tap Market: your first sale pays double\.'/);
 assert.match(read('public/progression-ui.js'),/'Level 2! Next: sell your corn in Market\. Your first sale pays double\.'/);
 const html=read('public/farm.html');assert.match(html,/id="market-first-sale" hidden><i data-game-art="double-coins"><\/i><span><b>Your first sale pays double<\/b> The prices below are doubled, once\.<\/span>/);
 const economy=read('public/economy-ui.js');
 assert.match(economy,/\$\('market-first-sale'\)\.hidden=village\|\|!firstSaleDouble\(state\)/);
 assert.match(economy,/\$\{number\(today\.price\*\(firstSaleDouble\(state\)\?2:1\)\)\} coins each/,'the market pick too');
 assert.doesNotMatch(economy,/marketSaleValue\(/,'every Market price goes through marketPay');
 assert.match(economy,/r\.firstSale\?`Double coins for your first sale! \+\$\{number\(r\.coins\)\} coins\.`/);
 assert.match(read('public/game.js'),/worth=base>0\?marketPay\(state,base,now\):0/);
 assert.match(read('public/wiki-content.js'),/sell:'Tap Market and sell the corn you just harvested\. Your first sale pays double\.'/);
});
