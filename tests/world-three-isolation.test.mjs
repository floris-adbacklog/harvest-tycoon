import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../game/farm-state.js';
// World III keeps to itself (27 Oct 2026, the owner: "zorg dat niks effect heeft op world I of II, dat het voldoende gescheiden is zoals
// world I en II nu zijn"): every harbour action on a level-295 farm counts only in the harbour's own numbers. The farm's and the village's
// quests, dailies, leaderboards, family and events read earned, sold, produced, upgrades, coins_spent and village_*; none of them moves.
const H=3600000;
const HARBOUR_STAT=k=>/^(harbour_|ship_|ships_|seal_|container_ships|world_voyages)/.test(k)||k==='quests_claimed'   // quests_claimed: every world's quests, for the Season Pass (as the village's)
 ||/^built_/.test(k)&&m.worldThreeBuilding(k.slice(6))||/^(made_|sold_)/.test(k)&&m.worldThreeItem(k.replace(/^(made_|sold_)/,''));
test('every harbour action counts in the harbour only: no number of the farm or the village moves',()=>{
 let now=Date.UTC(2026,9,27,12);
 const s=m.createFarm(now-60*86400000);s.xp=m.xpForLevel(295);s.coins=5e8;m.normalizeFarm(s,now);
 s.village.landmarks={done:['windpump','longhouse','stonequay','lookout','greathall'],given:{}};
 for(const [k,b] of Object.entries(s.buildings))if(!m.worldThreeBuilding(k))b.built=true;   // a farm and a village with every place: ships ask for what they make
 const goods=['plank','stone','ironbar','rooftile','barrel','rope','silverbar','builderscrate','anchor','anchorchain','provisions','sailcloth','saffronbun','goldenloaf','shippaint','flax','linen','bread','cheese','candles','oil','berries','clay','gemstone','stew','berrypreserves','saffron','lavender','lavendersoap','scentedsachet','timber'];
 const stock=()=>{for(const k of Object.keys(m.ITEMS))s.inventory[k]=0;for(const k of goods)s.inventory[k]=9000;};
 stock();m.normalizeFarm(s,now);
 const before=JSON.parse(JSON.stringify(s.stats)),quests=m.QUESTS.map(q=>Math.min(q.target,s.stats[q.stat]??0)),daily=JSON.stringify(m.dailyTasks(s,now).map(t=>t.progress));
 // A refusal (a recipe whose village good this farm has not unlocked, a full slot) changes nothing; the asserts below check enough went through.
 const act=a=>{try{return m.applyFarmAction(s,a,now);}catch{return null;}};
 act({type:'harbour_visit'});
 // The Harbour tab of the diamond shop (28 Oct 2026): the first work's goods bought with Harbour supplies, the rest handed in.
 s.diamonds=50000;
 for(const w of m.HARBOUR_WORKS.filter(w=>w.level<=295)){stock();s.coins=5e8;if(w.id==='office')act(m.harbourShopAction(m.harbourShopStatus(s,'supplies',now)));else act({type:'harbour_give',work:w.id});act({type:'harbour_finish',work:w.id});}
 now+=13*H;m.normalizeFarm(s,now);stock();
 const first=s.harbour.quays[0].ship;act({type:'ship_skip',quay:0,ship:first.id,input:{...first.input}});act({type:'ship_now',quay:0,expectedCost:m.HARBOUR_SHOP.ship.cost});   // Ship back now
 for(const [i,q] of s.harbour.quays.entries())if(q.ship)act({type:'ship_load',quay:i,ship:q.ship.id,input:{...q.ship.input}});
 act({type:'seal_pat'});
 for(const k of Object.keys(m.BUILDINGS).filter(m.worldThreeBuilding)){const id=Object.keys(m.RECIPES).find(r=>m.RECIPES[r].building===k);act({type:'produce',recipe:id});}
 now+=9*H;for(const k of Object.keys(m.ITEMS))s.inventory[k]=0;
 for(const k of Object.keys(m.BUILDINGS).filter(m.worldThreeBuilding))act({type:'collect',building:k});
 act({type:'sell',item:'rope',category:'harbour',day:m.utcDay(now),quantity:s.inventory.rope});
 stock();act({type:'upgrade',building:'ropewalk'});act({type:'harbour_warehouse'});act({type:'harbour_quest',id:0});
 const changed=Object.keys({...before,...s.stats}).filter(k=>JSON.stringify(before[k])!==JSON.stringify(s.stats[k]));
 assert.ok(changed.includes('ships_sent')||changed.includes('ship_loads'),'the ships were loaded');assert.ok(changed.includes('ship_calls')&&changed.includes('harbour_supplies'),'the Harbour tab\'s buys went through');assert.ok(changed.includes('harbour_batches'),'batches were collected');
 assert.deepEqual(changed.filter(k=>!HARBOUR_STAT(k)),[],'only the harbour\'s own numbers moved');
 assert.deepEqual(m.QUESTS.map(q=>Math.min(q.target,s.stats[q.stat]??0)),quests,'no farm quest moved');
 assert.equal(JSON.stringify(m.dailyTasks(s,now).map(t=>t.progress)),daily,'no daily challenge moved');
});
test('no farm or village order, boat cargo or visitor ever asks for a harbour good',()=>{
 const s=m.createFarm(Date.UTC(2026,7,1));s.xp=m.xpForLevel(295);m.normalizeFarm(s,Date.UTC(2026,9,27));
 s.village.landmarks={done:['windpump','longhouse','stonequay','lookout','greathall'],given:{}};for(const b of Object.values(s.buildings))b.built=true;
 for(let d=0;d<200;d++){const now=Date.UTC(2026,9,27)+d*86400000;m.normalizeFarm(s,now);
  const asked=[...m.dailyOrders(s,now).flatMap(o=>Object.keys(o.input??o.items??{})),...Object.keys(s.village?.request?.input??{}),...Object.keys(s.village?.boat?.cargo?.input??{}),...Object.keys(s.visitors?.current?.input??{})];
  assert.deepEqual(asked.filter(m.worldThreeItem),[],`day ${d}`);}
});
