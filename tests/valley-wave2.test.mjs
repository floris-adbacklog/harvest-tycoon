import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createFarm,applyFarmAction as act,normalizeFarm,xpForLevel,levelOf,recipeDuration,productionJobs,featureUnlocked,cropUnlocked,buildingEligible,itemAvailable,marketValue,dailyOrders,CROPS,BUILDINGS,RECIPES,ITEMS,QUESTS,DAY_MS,FEATURE_LEVELS,VALLEY_STALLS,VALLEY_RESTOCK,VALLEY_PREMIUM,VALLEY_STARS,RANCH_SPEEDUP,RANCH_SWITCH_COST} from '../game/farm-state.js';
import {createLegacyFarm} from './legacy-farm.mjs';
import {ANCHORS,YARD_EXTENT,anchorAt,roadRects} from '../public/farm-layout.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12);
const NEW_CROPS=['cherries'],NEW_GOODS=['goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie'];
// A farm at a level with every building it may already have opened (some need another one first).
function farmAt(level){const s=createFarm(now);s.xp=xpForLevel(level);s.coins=5e7;for(let pass=0;pass<3;pass++)for(const key of Object.keys(BUILDINGS))if(buildingEligible(s,key)&&!s.buildings[key].built){try{act(s,{type:'construct',building:key},now);}catch{}}normalizeFarm(s,now);return s;}
function finish(s,building){for(const job of productionJobs(s.buildings[building]))job.readyAt=now;return act(s,{type:'collect',building},now);}

test('wave 2 opens between 54 and 70: goats, the workshop, the market, cherries and the ranch',()=>{
 const first=(check,key)=>{for(let level=40;level<=75;level++)if(check(farmAt(level),key))return level;return null;};
 assert.deepEqual(['goatshed','craftshop'].map(k=>first(buildingEligible,k)),[54,58]);
 assert.equal(first(cropUnlocked,'cherries'),66);
 assert.deepEqual(['valleymarket','ranch'].map(k=>first(featureUnlocked,k)),[62,70]);
 for(const k of [...NEW_CROPS,...NEW_GOODS])assert.ok(ITEMS[k],k);
 const legacy=createLegacyFarm(now);legacy.xp=xpForLevel(20);assert.equal(featureUnlocked(legacy,'valleymarket'),false,'an old farm waits for level 62 as well');
});

test('the chains work: goat milk to goat cheese, wax to candles, cloth and wool to a blanket, cherries to jam and pie',()=>{
 const s=farmAt(70);Object.assign(s.inventory,{feed:10,lettuce:12,barley:4,beeswax:6,cloth:2,wool:6,cherries:11,honey:3,flour:4,eggs:2});
 for(const [recipe,building] of [['goatmilk','goatshed'],['goatbrowse','goatshed']]){assert.ok(!act(s,{type:'produce',recipe},now).error);finish(s,building);}
 assert.equal(s.inventory.goatmilk,5);s.inventory.goatmilk=4;
 for(const [recipe,building,item] of [['goatcheese','dairy','goatcheese'],['candles','craftshop','candles'],['blanket','craftshop','blanket'],['cherryjam','preserves','cherryjam'],['cherrypie','bakery','cherrypie']]){
  act(s,{type:'produce',recipe},now);finish(s,building);assert.equal(s.inventory[item],1,item);assert.equal(s.stats['made_'+item],1,item);
 }
 assert.ok(CROPS.cherries.perennial&&CROPS.cherries.regrow>0);
});

test('Valley Market: three stalls, each a basket with one of the newest goods, paid half as much again as its normal price',()=>{
 const s=farmAt(66);assert.equal(s.valley.stalls.length,VALLEY_STALLS);
 for(const stall of s.valley.stalls){
  const b=stall.basket;assert.ok(b,'every stall has a customer');
  const keys=Object.keys(b.input);assert.ok(VALLEY_STARS.includes(keys[0]),'one of the newest goods');assert.ok(keys.length>=2&&keys.length<=3);
  for(const k of keys)assert.ok(itemAvailable(s,k),`${k} can be made`);
  assert.equal(b.value,Object.entries(b.input).reduce((sum,[k,n])=>sum+ITEMS[k].sell*n,0));
  assert.equal(b.coins,Math.ceil(b.value*VALLEY_PREMIUM/10)*10);assert.ok(b.coins>marketValue(b.input,now),'always better than the market');
 }
 const again=farmAt(66);assert.deepEqual(again.valley,s.valley,'the same farm gets the same baskets: game and server agree');
 const stars=new Set();for(let i=0;i<40;i++){const t=now+i*VALLEY_RESTOCK;normalizeFarm(s,t);for(const [j,st] of s.valley.stalls.entries())if(st.basket){stars.add(Object.keys(st.basket.input)[0]);act(s,{type:'valley_skip',stall:j,basket:st.basket.id},t);}}
 assert.ok(stars.size>=10,`baskets vary (${stars.size} different stars)`);
});

test('selling a basket pays and waits four hours for the next customer; a stale or incomplete basket is refused',()=>{
 const s=farmAt(66),b=s.valley.stalls[0].basket;
 assert.throws(()=>act(s,{type:'valley_sell',stall:0,basket:b.id},now),/Missing/);
 Object.assign(s.inventory,b.input);const coins=s.coins,xp=s.xp,sold=s.stats.sold;
 const r=act(s,{type:'valley_sell',stall:0,basket:b.id},now);
 assert.equal(r.coins,b.coins);assert.equal(s.coins,coins+b.coins);assert.ok(s.xp>=xp+b.xp);assert.equal(s.stats.valley_baskets,1);assert.equal(s.stats.sold,sold+Object.values(b.input).reduce((a,n)=>a+n,0));
 for(const k of Object.keys(b.input))assert.equal(s.inventory[k],0);
 assert.equal(s.valley.stalls[0].basket,null);assert.equal(s.valley.stalls[0].readyAt,now+VALLEY_RESTOCK);
 assert.throws(()=>act(s,{type:'valley_sell',stall:0,basket:b.id},now+1000),/moved on/);
 normalizeFarm(s,now+VALLEY_RESTOCK-1);assert.equal(s.valley.stalls[0].basket,null);
 normalizeFarm(s,now+VALLEY_RESTOCK);assert.ok(s.valley.stalls[0].basket,'the next customer arrives after four hours');
 assert.throws(()=>act(s,{type:'valley_sell',stall:7,basket:1},now),/stall/);
 const young=farmAt(50);assert.throws(()=>act(young,{type:'valley_sell',stall:0,basket:1},now),/level 62/);
});

test('the Ranch: the chosen herd works 25% faster, the first choice is free, switching costs coins',()=>{
 const s=farmAt(70),before=recipeDuration(s,'goatmilk',now),wool=recipeDuration(s,'wool',now);
 assert.throws(()=>act(s,{type:'ranch_focus',focus:'coop',expectedCost:0},now),/herd/);
 act(s,{type:'ranch_focus',focus:'goatshed',expectedCost:0},now);assert.equal(s.ranch.focus,'goatshed');assert.equal(s.stats.ranch_focus,1);
 assert.equal(recipeDuration(s,'goatmilk',now),Math.round(before*(1-RANCH_SPEEDUP)));assert.equal(recipeDuration(s,'wool',now),wool,'other barns are unchanged');
 assert.throws(()=>act(s,{type:'ranch_focus',focus:'goatshed',expectedCost:RANCH_SWITCH_COST},now),/already/);
 assert.throws(()=>act(s,{type:'ranch_focus',focus:'dairy',expectedCost:0},now),/price/);
 const coins=s.coins;act(s,{type:'ranch_focus',focus:'dairy',expectedCost:RANCH_SWITCH_COST},now);assert.equal(s.coins,coins-RANCH_SWITCH_COST);
 const young=farmAt(66);assert.throws(()=>act(young,{type:'ranch_focus',focus:'dairy',expectedCost:0},now),/level 70/);
});

test('quests, dailies, orders and commissions for wave 2 come only once they can be done',()=>{
 const titles=QUESTS.map(q=>q.title);assert.ok(titles.indexOf('Kids of the valley')>titles.indexOf('The cider house'),'appended after wave 1');
 for(const q of QUESTS.filter(q=>q.stat.startsWith('valley_')||q.stat==='ranch_focus'))assert.ok(q.minLevel>=FEATURE_LEVELS[q.stat==='ranch_focus'?'ranch':'valleymarket'],q.title);
 const s=farmAt(70),seen=new Set();for(let d=0;d<40;d++)dailyOrders(s,now+d*DAY_MS).forEach(o=>seen.add(o.title));
 assert.ok(['The ranch banquet','The valley wedding'].some(t=>seen.has(t)),'the level-70 commissions come round');
 const young=farmAt(50),early=new Set();for(let d=0;d<40;d++)dailyOrders(young,now+d*DAY_MS).forEach(o=>early.add(o.title));
 assert.ok(!['Milk for the café','The pie stand','The cherry fair'].some(t=>early.has(t)));
});

test('the Factory no longer bottles honey; the new goods are made in bulk there like every other good',()=>{
 assert.equal(RECIPES.mass_honey,undefined);
 for(const id of ['goatmilk','goatcheese','candles','blanket','cherryjam','cherrypie'])assert.ok(RECIPES[`mass_${id}`],id);
});

test('the new yards stand on free ground, and every model and picture is in place',()=>{
 for(const id of ['goatshed','craftshop','ranch','valleymarket']){
  assert.ok(ANCHORS[id]&&YARD_EXTENT[id],id);const [x,z]=anchorAt(id),[west,east,north,south]=YARD_EXTENT[id];
  assert.ok(!roadRects().some(r=>x+east>r.minX&&x+west<r.maxX&&z+south>r.minZ&&z+north<r.maxZ),`${id} is off the roads`);
 }
 const game=read('public/game.js'),loaded=new Set([...game.split('\n').filter(line=>/^const modelNames=|^modelNames\.push\(/.test(line)).join('\n').matchAll(/'([a-z_]+_\d+)'/g)].map(m=>m[1]));
 for(const model of ['tree_011','hangar_015','hangar_019','hangar_001','hangar_009','goat_002','horse_003','horse_004','horse_005']){assert.ok(existsSync(new URL(`../public/assets/models/${model}.glb`,import.meta.url)),model);assert.ok(loaded.has(model),model);}
 for(const id of ['goatshed','craftshop'])assert.ok(existsSync(new URL(`../public/assets/icons/${id}.png`,import.meta.url)),id);
 for(const id of [...NEW_CROPS,...NEW_GOODS,'valley-market','ranch'])assert.ok(existsSync(new URL(`../public/assets/icons/${id}.webp`,import.meta.url)),id);
 assert.match(game,/addUtility\('valleymarket','hangar_009'/);assert.match(game,/addUtility\('ranch','hangar_001'/);
 assert.match(read('public/farm.html'),/data-menu-utility="valleymarket"[\s\S]*data-menu-utility="ranch"/);
});
