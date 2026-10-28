import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as m from '../game/farm-state.js';
import {INSTANT_ACTIONS} from '../public/farm-client.js';
import {farmLog,snapshot} from '../supabase/functions/farm-api/player-log.js';
import {harbourLine,harbourMessage} from '../public/harbour-shop-ui.js';
import {untilText,waitButton} from '../public/village-shop-ui.js';
import {wikiArticle} from '../public/wiki-content.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The Harbour tab of the diamond shop (28 Oct 2026, the owner's choices 1A, 1+2+4, 3a): Ship back now (100 diamonds, one tap, the quays'
// ships only), Harbour supplies (the work's missing goods at 1 diamond for every 500 coins, asks first) and the Farmhand's card; a small
// diamond button under a quay that waits. Everything counts in the harbour's own numbers.
const HALL={done:['windpump','longhouse','stonequay','lookout','greathall'],given:{}},H=3600000;
const farm=(level,{hall=true,works=[],diamonds=5000}={})=>{const now=Date.UTC(2026,10,3,12);const s=m.createFarm(now-9e9);s.xp=m.xpForLevel(level);s.diamonds=diamonds;s.coins=5e8;
 for(const [k,b] of Object.entries(s.buildings))if(!m.worldThreeBuilding(k))b.built=true;m.normalizeFarm(s,now);if(hall)s.village.landmarks=structuredClone(HALL);m.normalizeFarm(s,now);
 if(works.length){s.harbour.works.done=works;for(const w of works)if(s.buildings[w])s.buildings[w].built=true;m.normalizeFarm(s,now);}return {s,now};};
const act=(s,a,now)=>m.applyFarmAction(s,a,now);
const refused=(s,action,message,now)=>{const before=structuredClone(s);assert.throws(()=>act(s,action,now),{message},`${action.type}: ${message}`);assert.deepEqual(s,before,`${action.type} changed nothing`);};
// A quay whose ship was sent on: it waits 12 hours.
const skipped=(s,now,i=0)=>{const q=s.harbour.quays[i].ship;act(s,{type:'ship_skip',quay:i,ship:q.id,input:{...q.input}},now);};

test('the prices: 100 diamonds a ship, and the supplies at 1 diamond for every 500 coins of goods (the office 223, the launch 4,020)',()=>{
 assert.equal(m.HARBOUR_SHOP.ship.cost,100);assert.equal(m.HARBOUR_SHOP.supplies.cost,null);assert.equal(m.LANDMARK_COINS_PER_DIAMOND,500);
 assert.equal(m.harbourSuppliesFullCost('office'),223);assert.equal(m.harbourSuppliesFullCost('ropewalk'),105);assert.equal(m.harbourSuppliesFullCost('launch'),4020);
 for(const id of Object.keys(m.HARBOUR_SHOP))assert.equal(m.HARBOUR_SHOP[id].level,m.WORLD_THREE_LEVEL);
});
test('the tab shows only once the harbour is open; before the office there is no ship to call',()=>{
 for(const [level,hall] of [[199,true],[230,false]]){const {s,now}=farm(level,{hall});assert.ok(Object.keys(m.HARBOUR_SHOP).every(id=>!m.harbourShopStatus(s,id,now).shown),`${level} ${hall}`);
  refused(s,{type:'ship_now',quay:0,expectedCost:100},level<200?'Reach level 200 to sail to the harbour.':'Finish the village’s Great Hall to sail to the harbour.',now);}
 const {s,now}=farm(200),ship=m.harbourShopStatus(s,'ship',now),supplies=m.harbourShopStatus(s,'supplies',now);
 assert.equal(ship.shown,true);assert.equal(ship.reason,'Build the Harbour office first');assert.equal(ship.canBuy,false);
 assert.deepEqual([supplies.work,supplies.cost,supplies.reason],['office',223,'']);assert.deepEqual(supplies.goods,{plank:300,stone:600,ironbar:40});
});
test('Ship back now: the next ship docks at once with the order it would have brought; harbour numbers only, never the farm\'s',()=>{
 const {s,now}=farm(215,{works:['office','ropewalk','cooperage','quay2']});skipped(s,now,1);
 const st=m.harbourShopStatus(s,'ship',now);assert.deepEqual([st.quay,st.wait,st.reason,st.canBuy],[1,'ship','',true]);assert.equal(st.until,now+m.SHIP_RETURN);
 const later=structuredClone(s);m.normalizeFarm(later,now+m.SHIP_RETURN);
 const stats=structuredClone(s.stats),diamonds=s.diamonds,r=act(s,m.harbourShopAction(st),now);
 assert.deepEqual(s.harbour.quays[1].ship,later.harbour.quays[1].ship,'the same ship as the wait would have brought');
 assert.equal(s.diamonds,diamonds-100);assert.equal(r.cost,100);assert.equal(s.stats.ship_calls,1);assert.equal(s.stats.harbour_diamonds_spent,(stats.harbour_diamonds_spent??0)+100);
 for(const k of ['diamonds_spent','boosts_used','ships_sent'])assert.equal(s.stats[k],stats[k],k);
 assert.equal(s.harbour.week.sent,0,'the harbour week counts ships that sail');
 refused(s,{type:'ship_now',quay:1,expectedCost:100},'A ship is at this quay.',now);
 assert.equal(m.harbourShopStatus(s,'ship',now).reason,'Every quay has a ship');
});
test('Ship back now refuses what it should, and changes nothing then',()=>{
 const {s,now}=farm(275,{works:m.HARBOUR_WORKS.filter(w=>w.level<=270).map(w=>w.id)});skipped(s,now,0);
 refused(s,{type:'ship_now',quay:0,expectedCost:30},m.PRICES_CHANGED,now);
 refused(s,{type:'ship_now',quay:9,expectedCost:100},'Choose a quay.',now);
 const container=m.harbourBerths(s).indexOf('container');assert.ok(container>0);
 const c=s.harbour.quays[container].ship;act(s,{type:'ship_skip',quay:container,ship:c.id,input:{...c.input}},now);
 refused(s,{type:'ship_now',quay:container,expectedCost:100},'Only a quay’s ship can be called back.',now);
 assert.equal(m.harbourShopStatus(s,'ship',now).quay,0,'the shop never picks the container ship');
 s.diamonds=99;refused(s,{type:'ship_now',quay:0,expectedCost:100},'You need 100 diamonds. Earn more from daily gifts and challenges.',now);
 s.diamonds=500;assert.equal(act(s,{type:'ship_now',quay:0,expectedCost:100},now).quay,0);
});
test('Harbour supplies: the work\'s missing goods at their price of the moment; the coins stay their own tap',()=>{
 const {s,now}=farm(205,{works:['office']});for(const k of Object.keys(m.ITEMS))s.inventory[k]=0;s.inventory.plank=150;
 assert.equal(m.harbourShopStatus(s,'supplies',now).cost,105);
 act(s,{type:'harbour_give',work:'ropewalk',item:'plank'},now);
 const st=m.harbourShopStatus(s,'supplies',now);assert.deepEqual(st.goods,{plank:50,stone:300});assert.equal(st.cost,Math.ceil((50*195+300*45)/500));
 refused(s,{type:'harbour_supplies',work:'ropewalk',expectedCost:st.cost,expectedGoods:{plank:200,stone:300}},m.PRICES_CHANGED,now);
 const coins=s.coins,stats=structuredClone(s.stats),r=act(s,m.harbourShopAction(st),now);
 assert.deepEqual([r.units,r.cost,r.ready],[350,st.cost,true]);assert.equal(s.coins,coins);assert.deepEqual(s.harbour.works.given,{plank:200,stone:300});
 assert.equal(m.harbourWorkDone(s,'ropewalk'),false);assert.equal(s.stats.harbour_supplies,1);assert.equal(s.stats.diamonds_spent,stats.diamonds_spent);
 assert.equal(m.harbourShopStatus(s,'supplies',now).reason,'Everything is handed in');
 refused(s,{type:'harbour_supplies',work:'ropewalk',expectedCost:0,expectedGoods:{}},'Everything is handed in. Pay the coins to finish it.',now);
 act(s,{type:'harbour_finish',work:'ropewalk'},now);assert.equal(m.harbourShopStatus(s,'supplies',now).work,'cooperage');
 assert.equal(m.harbourShopStatus(s,'supplies',now).reason,'Opens at level 210');
 refused(s,{type:'harbour_supplies',work:'cooperage',expectedCost:169,expectedGoods:{plank:300,ironbar:40}},'Reach level 210 to build the Cooperage.',now);
 const done=farm(300,{works:m.HARBOUR_WORKS.map(w=>w.id)});assert.equal(m.harbourShopStatus(done.s,'supplies',done.now).shown,false);
});
test('the buys are harbour actions, wait for the server, and show in the player log and the shop numbers',()=>{
 for(const type of ['ship_now','harbour_supplies']){assert.equal(m.actionWorld({type}),3,type);assert.ok(!INSTANT_ACTIONS.has(type),type);assert.ok(!m.NO_EVENT_ACTIONS.has(type),type);
  assert.ok(read('public/farm-client.js').includes(`'${type}'`),type);assert.match(read('src/analytics.js'),new RegExp(`action:new Set\\(\\[[^\\]]*'${type}'`),type);}
 const {s,now}=farm(205,{works:['office']});skipped(s,now);
 for(const [action,text] of [[m.harbourShopAction(m.harbourShopStatus(s,'ship',now)),'Called a ship to the quay with diamonds'],[m.harbourShopAction(m.harbourShopStatus(s,'supplies',now)),'Bought the goods for the Ropewalk with diamonds']]){
  const before=snapshot(s),result=act(s,action,now),[row]=farmLog(action,before,s,result);assert.equal(row.category,'diamonds');assert.ok(row.text.startsWith(text),row.text);}
});
test('the shop window: a Harbour tab after the Village one, opened on it in the harbour; the cards cheap to dear with the Farmhand',()=>{
 const html=read('public/farm.html'),ui=read('public/boosts-ui.js');
 assert.match(html,/data-shop-jump="shop-village"[^>]*hidden>.*?<\/button><button type="button" data-shop-jump="shop-harbour" aria-controls="shop-harbour" aria-pressed="false" hidden><i data-game-art="harbour-badge"><\/i><span>Harbour<\/span><\/button><\/nav>/);
 assert.match(read('public/shop.css'),/#boost-dialog\[data-shop-tab\]:not\(\[data-shop-tab="shop-harbour"\]\) #shop-harbour\{display:none\}/);
 assert.ok(ui.includes("harbour&&worldThreeOpen(state)?'shop-harbour':village&&worldTwoOpen(state)?'shop-village':firstShopTab()"));
 assert.match(read('public/game.js'),/boosts=createBoostsUI\(\{[^\n]*,village:villageWorld,harbour:harbourWorld\}\);/);
 const {s,now}=farm(205,{works:['office']});skipped(s,now);
 const order=[...Object.keys(m.HARBOUR_SHOP).map(id=>m.harbourShopStatus(s,id,now)).filter(x=>x.shown).map(x=>[x.cost||Infinity,x.id]),[m.BOOSTS.farmhand.cost,'farmhand']].sort((a,b)=>a[0]-b[0]).map(([,id])=>id);
 assert.deepEqual(order,['ship','supplies','farmhand']);
 assert.equal(harbourLine({id:'ship'}),'The quay’s next ship docks right away.');assert.equal(harbourMessage('ship'),'A new ship is at the quay.');
 assert.equal(untilText('ship',3*H),'Next ship in 3h');
 assert.match(waitButton(m.harbourShopStatus(s,'ship',now)),/data-wait-buy="ship" data-quay="0" aria-label="Buy Ship back now for 100 diamonds"/);
 assert.match(read('public/harbour-ui.js'),/kind==='ship'&&q\.readyAt>now\?`<div class="wait-buy-row">\$\{waitButton\(harbourShopStatus\(state,'ship',now,i\)\)\}<\/div>`/);
});
test('the wiki says it, with the numbers from the rules',()=>{
 const html=wikiArticle('harbour',{level:250}).html;
 assert.match(html,/Diamonds in the harbour/);assert.match(html,/the whole Harbour office &amp; Quay 1 costs 223|the whole Harbour office & Quay 1 costs 223/);
 assert.match(html,/Ship back now calls only a quay’s ship, never the container ship or the world voyage/);
});
