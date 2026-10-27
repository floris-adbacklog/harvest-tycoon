import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import * as nodeModule from 'node:module';
import {createFarm,normalizeFarm,applyFarmAction,xpForLevel,itemAvailable,recipeValue,unlockEntries,
 BUILDINGS,BUILDING_LEVELS,BUILDING_COSTS,RECIPES,RECIPE_LEVELS,ITEMS,QUESTS,BOAT_GOODS,FAMILY_ORDER_FROM_WEEK,worldTwoItem} from '../game/farm-state.js';
import {LAYOUT_YARDS} from '../game/farm-map.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const {registerHooks}=nodeModule,vendor=new URL('../public/vendor/',import.meta.url).href;
registerHooks?.({resolve:(specifier,context,next)=>next(specifier==='three'?`${vendor}three.module.js`:specifier.startsWith('three/addons/')?vendor+specifier.slice(6):specifier,context)});
const skip=!registerHooks&&'needs module.registerHooks (Node 22.15 or newer)';

// The Donkey Stable (27 Oct 2026, the owner: "echt een nieuwe building met goods"; on the farm at level 64, 90,000 coins): donkey milk,
// and with it donkey milk soap (64) and a bath basket (77) in the Craft Workshop and donkey cheese (69) in the Dairy Barn.
const now=Date.parse('2026-10-27T12:00:00Z'),HOUR=3600000;
const GOODS=['donkeymilk','donkeymilksoap','donkeycheese','bathbasket'];
const perHour=id=>recipeValue(id).added/(RECIPES[id].duration/HOUR);
function farm(level,mode='guided'){
 const s=createFarm(now);s.xp=xpForLevel(level);s.coins=1e6;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 if(mode==='legacy')s.progression={mode:'legacy'};
 return normalizeFarm(s,now);
}

test('level 64, 90,000 coins, a farm building with slots and upgrades; its recipes at 64, 69 and 77',()=>{
 assert.deepEqual([BUILDING_LEVELS.donkeystable,BUILDING_COSTS.donkeystable,BUILDINGS.donkeystable.minLevel,BUILDINGS.donkeystable.buildCost,BUILDINGS.donkeystable.type],[64,90000,64,90000,'production']);
 assert.equal(BUILDINGS.donkeystable.world,undefined,'on the farm, not in the village');
 assert.deepEqual(['milkdonkeys','donkeymilksoap','donkeycheese','bathbasket'].map(id=>[RECIPES[id].building,RECIPE_LEVELS[id],RECIPES[id].minLevel]),
  [['donkeystable',64,64],['craftshop',64,64],['dairy',69,69],['craftshop',77,77]]);
 for(const k of GOODS)assert.ok(ITEMS[k]&&!worldTwoItem(k)&&!ITEMS[k].noBoard,`${k}: a farm good with its own board`);
 assert.ok(LAYOUT_YARDS.includes('donkeystable'),'it moves with Move things like every yard');
 for(const mode of ['guided','legacy']){
  const s=farm(63,mode);assert.throws(()=>applyFarmAction(s,{type:'construct',building:'donkeystable'},now),/level 64/i,mode);
  const t=farm(64,mode);applyFarmAction(t,{type:'construct',building:'donkeystable'},now);assert.equal(t.buildings.donkeystable.built,true,mode);
  assert.ok(unlockEntries(t).some(e=>e.id==='building:donkeystable'&&e.level===64),mode);
 }
});

test('balance: every step adds 40% and more, XP like the farm\'s late recipes, and the goods sit among their neighbours an hour',()=>{
 for(const id of ['milkdonkeys','donkeymilksoap','donkeycheese','bathbasket']){
  const v=recipeValue(id);assert.ok(v.output/v.input>=1.4,`${id} adds ${Math.round((v.output/v.input-1)*100)}%`);
  const xpHour=RECIPES[id].xp/(RECIPES[id].duration/HOUR);assert.ok(xpHour>=20&&xpHour<=31,`${id}: ${xpHour} XP an hour`);
 }
 assert.ok(perHour('milkdonkeys')>=perHour('goatmilk'),'donkey milk pays at least what goat milk (54) does');
 assert.ok(perHour('donkeymilksoap')>=perHour('blanket')&&perHour('donkeymilksoap')<=perHour('prizeproduce'),'the soap between the blanket (60) and prize produce (80)');
 assert.ok(perHour('donkeycheese')>perHour('goatcheese')&&perHour('donkeycheese')>perHour('cherryjam'),'the cheese beats goat cheese and cherry jam');
 assert.ok(Math.abs(perHour('bathbasket')-perHour('prizeproduce'))<10,'the bath basket about what prize produce pays');
 // Sunflower oil, no honey and no beeswax: all three come from sunflowers, a 14-24 hour crop. A soap costs one sunflower, as a candle does.
 assert.deepEqual(RECIPES.donkeymilksoap.input,{donkeymilk:12,oil:2});assert.equal(RECIPES.oil.input.sunflower/RECIPES.oil.output.oil*RECIPES.donkeymilksoap.input.oil/RECIPES.donkeymilksoap.output.donkeymilksoap,1);
 // One stable slot keeps one soap slot going: 2 milk an hour each way.
 assert.equal(RECIPES.milkdonkeys.output.donkeymilk/(RECIPES.milkdonkeys.duration/HOUR),RECIPES.donkeymilksoap.input.donkeymilk/(RECIPES.donkeymilksoap.duration/HOUR));
});

test('the goods come where the farm\'s goods come: quests appended, the town boat\'s soap, Family Orders from 9 November, family sharing in the SQL',()=>{
 assert.deepEqual(QUESTS.slice(320).map(q=>[q.stat,q.target,q.minLevel]),[['built_donkeystable',1,64],['made_donkeymilk',30,64],['made_donkeymilksoap',5,64],['made_donkeymilksoap',40,64],['made_donkeycheese',10,69],['made_bathbasket',5,77]]);
 for(const q of QUESTS.slice(320))assert.ok(q.reward<=40000);
 assert.equal(BOAT_GOODS.at(-1),'donkeymilksoap','always added at the end');
 for(const k of GOODS.filter(k=>k!=='bathbasket'))assert.equal(FAMILY_ORDER_FROM_WEEK[k],2966);
 assert.equal(FAMILY_ORDER_FROM_WEEK.bathbasket,undefined,'never in an order: too dear for its value band (FAMILY_ORDER_NEVER)');
 const s=farm(64);assert.equal(itemAvailable(s,'donkeymilk'),false,'nothing before the stable stands');
 for(const k of ['donkeystable','craftshop','mill'])s.buildings[k].built=true;assert.ok(itemAvailable(s,'donkeymilk')&&itemAvailable(s,'donkeymilksoap'));
 const sql=read('supabase/donkey-stable.sql');
 assert.match(sql,/^begin;/m);assert.match(sql,/^commit;/m);
 assert.match(sql,/md5\(social_body\)<>'137d9207549af3384eb0c42175440e13'/);assert.match(sql,/md5\(metrics_body\)<>'619356d3d99564e95d1906b00fdddd1d'/);
 for(const k of GOODS){assert.ok(sql.includes(`''${k}''`),k);assert.ok(sql.includes(`made_${k}}`),k);}
});

test('the pictures: the stable a render of its barn (512 px), the four goods painted by the owner (256 px), all WebP',()=>{
 const icons=read('public/visual-icons.js');assert.match(icons,/export const DONKEY_ART=Object\.freeze\(\['donkeystable','donkeymilk','donkeymilksoap','donkeycheese','bathbasket','donkeycart'\]\);/);
 for(const k of ['donkeystable','donkeycart',...GOODS]){const f=new URL(`../public/assets/icons/${k}.webp`,import.meta.url);assert.ok(existsSync(f),k);assert.ok(statSync(f).size<40_000,k);}
 for(const k of GOODS)assert.notEqual(read(`public/assets/icons/${k}.webp`),read({donkeymilk:'public/assets/icons/goatmilk.webp',donkeymilksoap:'public/assets/icons/lavendersoap.webp',donkeycheese:'public/assets/icons/goatcheese.webp',bathbasket:'public/assets/icons/harvesthamper.webp'}[k]),`${k}: its own picture, not the stand-in`);
});

test('every new name and line in all 15 languages, no middle dots',()=>{
 const names=['Donkey Stable','Donkey milk','Donkey milk soap','Donkey cheese','Bath basket','Milk the donkeys','Make donkey milk soap','Make donkey cheese','Pack a bath basket','Two gentle donkeys and their precious milk.'];
 for(const code of ['nl','de','fr','es','pt','id','hu','cs','tr','ru','uk','hi','ja','ar','zh']){
  const t=JSON.parse(read(`public/i18n/${code}.json`));
  for(const n of names){assert.ok(t[n]&&t[n]!==n,`${code}: ${n}`);assert.doesNotMatch(t[n],/ · /);}
 }
});

test('the donkeys walk in their pen without the stamping gesture; the cart\'s loop stays on the trunk road, clear of the yards',{skip},async()=>{
 const b=readFileSync(new URL('../public/assets/models/donkey_101.glb',import.meta.url)),json=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString('utf8'));
 assert.deepEqual(json.animations.map(a=>a.name).sort(),['idle','walk']);assert.ok(b.length<130_000);
 const {ANIMATED,ANIMAL_KINDS,ANIMAL_FILES}=await import('../public/farm-animals.js');
 assert.deepEqual([ANIMATED.donkey_001,ANIMATED.donkey_002],[['donkey_101','donkey_grey'],['donkey_101','donkey_brown']]);
 assert.ok(ANIMAL_FILES.includes('donkey_101'));assert.deepEqual(Object.keys(ANIMAL_KINDS.donkey_101.odds).sort(),['idle','walk']);
 const {createRoute,createTrip,CART_ROUTE}=await import('../public/farm-donkey-cart.js');
 const {anchorAt,YARD_EXTENT,roadRects}=await import('../public/farm-layout.js');
 const route=createRoute(),road=roadRects().find(r=>r.horizontal&&r.minZ<-5&&r.maxZ>-5&&r.minX<0&&r.maxX>40);
 for(const [x,z] of route.line){
  for(const [id,[w,e,n,s]] of Object.entries(YARD_EXTENT)){const [ax,az]=anchorAt(id),dx=Math.max(ax+w-x,0,x-ax-e),dz=Math.max(az+n-z,0,z-az-s);assert.ok(Math.hypot(dx,dz)>=.45,`${id} at ${x.toFixed(1)}, ${z.toFixed(1)}`);}
  if(x>CART_ROUTE.west+CART_ROUTE.ease&&x<CART_ROUTE.east-CART_ROUTE.ease)assert.ok(z>road.minZ+.3&&z<road.maxZ-.3,`on the road at ${x.toFixed(1)}`);
 }
 // It never turns sharper than its bends, and it stands now and then by the stable's pen.
 let prev=route.at(0).yaw,most=0;for(let s=.1;s<route.length;s+=.1){const y=route.at(s).yaw;let d=Math.abs(y-prev);if(d>Math.PI)d=2*Math.PI-d;most=Math.max(most,d/.1);prev=y;}
 assert.ok(most<=1.05/CART_ROUTE.bend,`${most} radians a unit`);
 const stop=route.at(route.stopAt),[sx]=anchorAt('donkeystable');assert.ok(Math.abs(stop.x-sx)<1.5,'by the stable');
 let r=0;const {trip,step}=createTrip({random:()=>(r=(r*9301+49297)%233280)/233280});for(let i=0;i<20*60*10;i++)step(.1);assert.ok(trip.stops>=5,`${trip.stops} stops in 20 minutes`);
 const cart=read('public/farm-donkey-cart.js');assert.match(cart,/donkey\.userData\.donkeyCart=wagon\.userData\.donkeyCart=true/,'a tap on it opens its own window');
 assert.doesNotMatch(cart,/addEventListener|runAction|localStorage|[^-\w]state\./,'nothing saved: the stable\'s window sells');
 assert.match(read('public/game.js'),/\.\.\.\(farmLife\?\.cartTargets\?\.\(\)\?\?\[\]\)\];/);
 assert.match(read('public/farm-life.js'),/shown:\(\)=>buildingUnlocked\(state,'donkeystable'\)/,'only once the stable stands');
});

// The donkey cart's goods (27 Oct 2026, the owner: 3 kinds a day for diamonds at their value, priced by level like the coin pack).
test('the donkey cart: three loads a day of the farm\'s own goods, each about 100 × level coins for that value at the coin pack\'s rate, once each',async()=>{
 const {cartLoads,cartBuy,COIN_PACK,PRICES_CHANGED,utcDay}=await import('../game/farm-state.js');
 const built=level=>{const s=farm(level);for(const k of Object.keys(s.buildings))if(!BUILDINGS[k].world)s.buildings[k].built=true;normalizeFarm(s,now);return s;};
 assert.deepEqual(cartLoads(farm(70),now),[],'nothing before the stable stands');
 for(const level of [64,80,99]){
  const s=built(level),rate=COIN_PACK.perLevel/COIN_PACK.cost*level;
  for(let d=0;d<30;d++){
   const loads=cartLoads(s,now+d*86400000);assert.equal(loads.length,3);assert.equal(new Set(loads.map(l=>l.item)).size,3,'three kinds');
   for(const l of loads){
    assert.ok(itemAvailable(s,l.item)&&!['feed','fertilizer','honey'].includes(l.item)&&!worldTwoItem(l.item),l.item);
    assert.equal(l.value,l.count*ITEMS[l.item].sell);assert.equal(l.cost,Math.ceil(l.value/rate),'its value at the coin pack\'s rate, rounded up');
    assert.ok(l.cost>=1&&l.cost<=30,`${l.item}: ${l.cost}`);
    // Resold at the Market (0.8 of the price) a load never brings more coins than its diamonds buy in the coin pack.
    assert.ok(l.value*.8<l.cost*rate,`${l.item} resells for less than the coin pack`);
   }
  }
 }
 const s=built(70),[load]=cartLoads(s,now);s.diamonds=100;const stock=s.inventory[load.item]??0,spent=s.stats.diamonds_spent??0;
 assert.throws(()=>cartBuy(s,load.item,load.count,load.cost+1,now),{message:PRICES_CHANGED});
 assert.deepEqual(applyFarmAction(s,{type:'donkey_cart_buy',item:load.item,expectedCount:load.count,expectedCost:load.cost},now),{item:load.item,count:load.count,cost:load.cost});
 assert.deepEqual([s.diamonds,s.inventory[load.item],s.stats.diamonds_spent,s.stats.cart_loads],[100-load.cost,stock+load.count,spent+load.cost,1]);
 assert.throws(()=>applyFarmAction(s,{type:'donkey_cart_buy',item:load.item,expectedCount:load.count,expectedCost:load.cost},now),/once a day|tomorrow/);
 assert.ok(cartLoads(s,now)[0].bought);
 const tomorrow=now+86400000;normalizeFarm(s,tomorrow);assert.equal(s.daily.date,utcDay(tomorrow));assert.ok(cartLoads(s,tomorrow).every(l=>!l.bought),'a new day, new loads');
 const poor=built(70);poor.diamonds=0;const [p]=cartLoads(poor,now);assert.throws(()=>applyFarmAction(poor,{type:'donkey_cart_buy',item:p.item,expectedCount:p.count,expectedCost:p.cost},now),/diamonds/);
 assert.throws(()=>applyFarmAction(built(70),{type:'donkey_cart_buy',item:'wheat',expectedCount:1,expectedCost:1},now),/other goods/);
 const ui=read('public/donkey-cart-ui.js');assert.match(ui,/confirmDiamondSpend\(/,'every buy asks first');const game=read('public/game.js');assert.match(game,/if\(obj\.userData\.donkeyCart\)return \{type:'donkeycart'\};/,'a tap on the cart');assert.match(game,/else if\(target\.type==='donkeycart'\)donkeyCart\?\.open\(\);/,'opens its own window');
 assert.match(read('public/farm.html'),/<dialog id="donkeycart-dialog"/);assert.doesNotMatch(read('public/economy-ui.js'),/cartPanel|donkey-cart/,'not in the Donkey Stable\'s window (the owner)');
});
