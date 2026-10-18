// Plan F, proposal 4 (13 Oct 2026, the owner's yes): every line on the level-up card says what opened and where it is (five things said
// only "Activity unlocked"), delivery orders have one name, their tab says what they are, level 8 names the village orders, level 9's card
// names the Farm Family next, and a recipe the farmer's own building opened is not named again on the next level's card.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dailyTasks,createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,unlockEntries,QUESTS,DAILY_POOLS,FEATURE_NAMES,DELIVERY_LEVELS,BUILDINGS,buildingCost,buildingEligible,buildingUnlocked,BUILDING_LEVELS,worldTwoBuilding} from '../public/farm-state.js';
import {entryLine,nextUnlock,progressionSnapshot,progressionChange,createProgressionUI} from '../public/progression-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,9,13,12);
const level=(s,n)=>{s.xp=xpForLevel(n);s.xpOffset=0;};
const buildAll=s=>{for(const key of Object.keys(BUILDINGS).sort((a,b)=>BUILDING_LEVELS[a]-BUILDING_LEVELS[b]))if(!worldTwoBuilding(key)&&buildingCost(s,key)&&buildingEligible(s,key)&&!buildingUnlocked(s,key)){s.coins+=buildingCost(s,key);act(s,{type:'construct',building:key},now);}};

test('every line on a level-up card says what opened and where: no bare "Activity unlocked", from level 2 to 200',()=>{
 const s=createFarm(now);s.coins=1e9;const seen=new Map();
 for(let n=2;n<=200;n++){level(s,n);buildAll(s);normalizeFarm(s,now);for(const e of unlockEntries(s))if(e.level>1)seen.set(e.id,e);}
 assert.ok(seen.size>120,'the whole unlock list');for(const kind of ['Crop','Ready to build','Activity','Recipe','Ready to expand','Improvement','Village place','Landmark'])assert.ok([...seen.values()].some(e=>e.kind===kind),kind);
 for(const e of seen.values()){
  for(const phone of [false,true]){const line=entryLine(e,{phone});assert.doesNotMatch(line,/ unlocked$/,e.id);assert.ok(line.length<=90,`${e.id}: ${line}`);}
 }
 // Every activity has a line of its own (FEATURE_NAMES), the pond's own line stays.
 for(const key of Object.keys(FEATURE_NAMES))assert.doesNotMatch(entryLine({id:'feature:'+key,kind:'Activity'}),/unlocked/,key);
 assert.equal(entryLine({id:'feature:fishing',kind:'Activity'}),'Activity · tap its pin over the pier');
});

test('the first ten levels: daily challenges, the helping hand, delivery orders, the family and boosts say where they are',()=>{
 const line=id=>entryLine({id:'feature:'+id,kind:'Activity'});
 assert.equal(line('challenges'),'Three small goals a day, in Today.');
 assert.equal(line('activities'),'Small jobs at four stops: tap a pin on the farm.');
 assert.equal(line('cart'),'Customers pay more than the Market: tap the cart.');
 assert.equal(line('family'),'Play together: tap the Family Hall.');
 assert.equal(line('boosts'),'Spend your diamonds on a boost: tap the diamonds at the top.');
 // A recipe says where it is made, a crop how to plant it; Medals sit in More on a phone and in Estate on a computer.
 assert.equal(entryLine({id:'recipe:milk',kind:'Recipe'}),'Make it at the Dairy Barn.');
 assert.equal(entryLine({id:'recipe:bread',kind:'Recipe'}),'Make it at the Bakery.');
 assert.equal(entryLine({id:'crop:lettuce',kind:'Crop'}),'Pick it in the seed shop and plant it on a field.');
 assert.equal(entryLine({id:'feature:mastery',kind:'Activity'},{phone:true}),'Rewards for every crop you grow, in More.');
 assert.equal(entryLine({id:'feature:mastery',kind:'Activity'},{phone:false}),'Rewards for every crop you grow, in Estate.');
 // The places named are there: the cart and the Family Hall on the farm, Today, the diamonds at the top.
 const game=read('public/game.js'),farm=read('public/farm.html');
 assert.match(game,/addUtility\('cart',/);assert.match(game,/addBuilding\('familyhall',/);
 assert.match(farm,/id="today-button"[^>]*>.*<b>Today<\/b>/);assert.match(farm,/data-menu-action="today-button"><i data-lucide="gift"><\/i><span><strong>Today<\/strong>/);
 assert.match(farm,/id="diamond-button"/);assert.match(read('public/boosts-ui.js'),/\$\('diamond-button'\)\.onclick=open;/);
 // The card draws these lines (the old chain of kinds is gone).
 // A short phone (360x640) keeps the card without scrolling (measured on the stage, Russian level 3: 601 of 606 px).
 assert.match(read('public/progression.css'),/@media\(max-width:900px\) and \(max-height:700px\),\(max-height:550px\) and \(pointer:coarse\)\{#level-up-dialog\{padding-top:14px\}#level-up-dialog \.level-up-art\{width:52px;height:52px;margin-bottom:2px\}/);
 const ui=read('public/progression-ui.js');assert.match(ui,/<span>\$\{entryLine\(e,\{phone:phone\(\)\}\)\}<\/span>/);assert.doesNotMatch(ui,/e\.kind\+' unlocked'\}<\/span>/);
});

test('level 8 names the village orders and level 16 the special commissions; level 9 names the Farm Family next',()=>{
 const s=createFarm(now);s.coins=1e6;level(s,7);buildAll(s);normalizeFarm(s,now);
 let before=progressionSnapshot(s);level(s,8);let change=progressionChange(before,s,null);
 assert.ok(change.entries.some(e=>e.id==='orders:village'&&e.name==='Village orders'),'level 8');
 assert.equal(entryLine(change.entries.find(e=>e.id==='orders:village')),'Bigger orders that pay even more: tap the cart.');
 level(s,15);buildAll(s);before=progressionSnapshot(s);level(s,16);change=progressionChange(before,s,null);
 assert.ok(change.entries.some(e=>e.id==='orders:commission'&&e.name==='Special commissions'),'level 16');
 assert.equal(Object.keys(DELIVERY_LEVELS).length,3);assert.equal(DELIVERY_LEVELS.village,8);assert.equal(DELIVERY_LEVELS.commission,16);
 // Next at level 10: the Farm Family, not Diamond boosts (both open at 10).
 const nine=createFarm(now);level(nine,9);normalizeFarm(nine,now);assert.equal(nextUnlock(nine).id,'feature:family');
 // A farm from before the guided start has every order tier, so nothing is announced.
 const legacy=createFarm(now);legacy.progression={mode:'legacy'};assert.ok(unlockEntries(legacy).filter(e=>e.id.startsWith('orders:')).every(e=>e.unlocked));
 // The wiki's What opens when lists them at their level.
 assert.match(read('public/wiki-content.js'),/if\(tier!=='quick'\)add\(n,\{picture:tier==='village'\?'cart':'trophy',name:tier==='village'\?'Village orders':'Special commissions',to:\['daily','sec-delivery-orders'\]\}\);/);
});

test('a recipe the farmer\'s own building opened is not named again on the next level\'s card (it waited while a window was open)',async()=>{
 const cards=[],lines=[];let windowOpen=true;
 const dialog={setAttribute(){},addEventListener(){},querySelector:()=>({}),showModal(){cards.push(this.innerHTML);}};
 const saved={document:globalThis.document,window:globalThis.window,setTimeout:globalThis.setTimeout};
 globalThis.document={createElement:()=>dialog,body:{append(){}},querySelector:sel=>sel==='dialog[open]'&&windowOpen?{}:null,querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
 globalThis.window={addEventListener(){},dispatchEvent(){}};
 try{
  const s=createFarm(now);s.coins=1e6;level(s,5);act(s,{type:'construct',building:'mill'},now);
  const ui=createProgressionUI({state:s,isReady:()=>true,notify:text=>lines.push(text),phone:()=>true});
  const flush=()=>new Promise(r=>saved.setTimeout(r,140));
  // The Dairy Barn built in the Buildings window: Feed the cows waits for its line, then a level comes before the window closes.
  let before=progressionSnapshot(s);act(s,{type:'construct',building:'dairy'},now);const built=progressionChange(before,s,null);
  assert.ok(built.entries.some(e=>e.id==='recipe:milk'));ui.announce(built);await flush();assert.equal(cards.length+lines.length,0,'waits while the window is open');
  before=progressionSnapshot(s);level(s,6);ui.announce(progressionChange(before,s,null));await flush();assert.equal(cards.length,0,'still waiting');windowOpen=false;ui.refresh();await flush();
  assert.equal(cards.length,1);assert.match(cards[0],/Level 6!/);assert.match(cards[0],/Windmill/);
  assert.doesNotMatch(cards[0],/Feed the cows/,'the Dairy Barn\'s recipe is not on level 6\'s card');
  assert.match(cards[0],/Ready to build · open Buildings/);
  // Without a level in between it is still the one line at the top.
  windowOpen=false;before=progressionSnapshot(s);act(s,{type:'construct',building:'windmill'},now);ui.announce(progressionChange(before,s,null));await flush();
  assert.equal(cards.length,1);assert.match(lines.at(-1),/^New: /);
 }finally{Object.assign(globalThis,saved);}
});

test('delivery orders have one name everywhere, and their tab says what they are',()=>{
 const texts=[...QUESTS,...DAILY_POOLS.flat()].map(q=>`${q.title} ${q.description}`).join('\n');
 assert.doesNotMatch(texts,/farm cart/);assert.doesNotMatch(texts,/Deliver \d+ orders/);
 assert.match(texts,/Complete 3 delivery orders\./);assert.match(texts,/Special delivery Complete 1 delivery order\./);
 assert.equal(FEATURE_NAMES.cart,'Delivery orders');
 assert.match(read('public/farm.html'),/<button data-menu-utility="cart"><i data-lucide="truck"><\/i><span><strong>Delivery orders<\/strong>/);
 // 18 Oct 2026: the tabs have their pictures (the window shell); the name stays.
 assert.match(read('public/farm.html'),/<button data-today-tab="orders" aria-pressed="false"><i data-game-art="cart"><\/i><span>Delivery orders<\/span><\/button>/);
 assert.match(read('public/game.js'),/cart:\{name:'Delivery orders',icon:'truck',hint:'Fresh orders every day'\}/);
 assert.match(read('public/retention-ui.js'),/<p class="section-copy orders-lead">Customers pay more than the Market\. New orders every day\.<\/p><p class="delivery-summary">/);
 assert.match(read('public/wiki-content.js'),/Tap the cart on your farm, or open Delivery orders in Today\./);
 // farm-state.js is the same in all three places.
 const one=read('public/farm-state.js');assert.equal(read('game/farm-state.js'),one);assert.equal(read('supabase/functions/farm-api/farm-state.js'),one);
});

// Review of fc18e9b (14 Oct 2026): the Buildings window's shortcut still said "Delivery cart". And a challenge saved before the release
// with "Complete an order at the farm cart." (no translation has it any more) shows the pool's words now: normalizeFarm takes them from the
// pool by counter and title (9 Oct 2026), so the site and farm-api can go in either order.
test('the review: the Buildings window says Delivery orders, and a challenge saved with the old words shows the new ones',()=>{
 const farm=read('public/farm.html');
 assert.match(farm,/<button data-utility="cart"><i data-lucide="truck"><\/i><span>Delivery orders<\/span><\/button>/);
 assert.doesNotMatch(farm,/Delivery cart/);
 const s=createFarm(now);level(s,7);normalizeFarm(s,now);
 s.daily.tasks[2]={stat:'deliveries',target:1,title:'Special delivery',description:'Complete an order at the farm cart.',reward:60};
 assert.equal(dailyTasks(s,now)[2].description,'Complete 1 delivery order.');
});
