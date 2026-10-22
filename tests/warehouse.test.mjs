import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,applyFarmAction as act,xpForLevel,levelOf,productionJobs,CROPS,ITEMS,HEIRLOOMS,VILLAGE_GOODS,SEASON_CROPS,MASTER_UPGRADES,
 WAREHOUSE_CAPACITY,WAREHOUSE_COSTS,WAREHOUSE_MASTER,WAREHOUSE_MAX_LEVEL,WAREHOUSE_TOP_LEVEL,storedCount,warehouseCapacity,warehouseFull,warehouseNearFull,warehouseStartLevel,
 warehouseTopFor,warehouseUpgrade,warehouseFullText,nightShiftQuote,settleShift,SHIFT_ROUND_MS,utcDay} from '../game/farm-state.js';

// The Warehouse (22 Oct 2026, the owner's choices on plan-warehouse/voorstel.md): capacity option C, an expensive coin ladder, bringing in
// waits when it is full (option 1), selling and using never wait, rewards and gifts always arrive, and old farms start where they fit.
const now=Date.UTC(2026,9,22,12),H=3600000;
const farm=(level=60)=>{const s=createFarm(now-2*H);s.xp=xpForLevel(level);s.rookieUntil=0;s.coins=50_000_000;s.diamonds=1000;
 for(const b of Object.values(s.buildings))b.built=true;for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0,careAt:0});return normalizeFarm(s,now);};
// Fill the Warehouse with wheat up to `stored` items in all (everything else emptied).
const fill=(s,stored)=>{for(const k of Object.keys(s.inventory))s.inventory[k]=0;s.inventory.wheat=stored;return s;};
const ripe=(s,id,crop='wheat')=>Object.assign(s.plots[id],{crop,plantedAt:now-CROPS[crop].duration,readyAt:now-1,careAt:now,watered:false,tended:false,fertilized:false,harvestCycles:0});
const ready=(s,building='coop',recipe='eggs',count=1)=>{s.inventory.feed+=count*5;const r=act(s,{type:'produce',recipe,count},now);for(const j of productionJobs(s.buildings[building]))j.readyAt=now;return r;};

test('capacity and prices: option C and the owner’s coin ladder, the village levels with master goods',()=>{
 assert.deepEqual([...WAREHOUSE_CAPACITY],[500,650,800,950,1100,1300,1500,1750,2000,2300,2700,3100,3500,4000,4500]);
 assert.deepEqual([...WAREHOUSE_COSTS],[20000,48000,80000,140000,220000,340000,520000,800000,1200000]);
 assert.equal(WAREHOUSE_MAX_LEVEL,10);assert.equal(WAREHOUSE_TOP_LEVEL,15);
 assert.deepEqual(WAREHOUSE_MASTER.map(s=>[s.level,s.coins]),[[108,3000000],[120,4000000],[140,5200000],[160,6800000],[180,8800000]]);
 WAREHOUSE_MASTER.forEach((step,i)=>assert.deepEqual(step.materials,MASTER_UPGRADES[i].materials));
 // The upgrade card walks the whole ladder.
 const s=farm(200);s.warehouse={level:1};const seen=[];
 for(let n;(n=warehouseUpgrade(s));){seen.push([n.level,n.capacity,n.coins,n.farmLevel]);for(const [k,q] of Object.entries(n.materials))s.inventory[k]=q;act(s,{type:'warehouse_upgrade',expectedCost:n.coins},now);}
 assert.deepEqual(seen.map(r=>r[1]),WAREHOUSE_CAPACITY.slice(1));
 assert.deepEqual(seen.slice(0,9).map(r=>r[2]),[...WAREHOUSE_COSTS]);
 assert.deepEqual(seen.slice(9).map(r=>[r[2],r[3]]),WAREHOUSE_MASTER.map(m=>[m.coins,m.level]));
 assert.equal(s.warehouse.level,15);assert.equal(warehouseUpgrade(s),null);
 assert.throws(()=>act(s,{type:'warehouse_upgrade'},now),/fully upgraded/);
 assert.equal(WAREHOUSE_COSTS.reduce((a,b)=>a+b),3_368_000,'levels 2-10 cost 3,368,000 coins in all');
});

test('what counts: every item in storage, one place a piece; coins, diamonds, seed packets and fish do not',()=>{
 const s=farm();for(const k of Object.keys(s.inventory))s.inventory[k]=0;
 assert.equal(storedCount(s),0);
 const one=[Object.keys(CROPS)[0],'feed',Object.keys(HEIRLOOMS)[0],Object.keys(VILLAGE_GOODS)[0],Object.keys(SEASON_CROPS)[0]];
 for(const k of one)s.inventory[k]=2;
 assert.equal(storedCount(s),10);
 s.coins=9e9;s.diamonds=9e6;s.seasonSeeds={[Object.keys(SEASON_CROPS)[0]]:50};s.pond={...(s.pond??{}),caught:{minnow:99}};
 assert.equal(storedCount(s),10);
 s.inventory.notanitem=500;s.inventory.barley=-4;s.inventory.lettuce=2.7;
 assert.equal(storedCount(s),12,'only real items, whole and not negative');
 assert.equal(Object.keys(ITEMS).length>100,true);
});

test('a full Warehouse: harvests, collects, the Seed Lab and the tractor’s harvest work wait, with the note’s numbers',()=>{
 const s=farm();s.warehouse={level:1};fill(s,500);ripe(s,0);ripe(s,1);
 assert.equal(warehouseFull(s),true);
 const text=warehouseFullText(s);assert.equal(text,'Warehouse full (500 / 500). Sell or use something to bring in more.');
 const before=structuredClone(s);
 for(const action of [{type:'field',id:0,action:'harvest'},{type:'fields',action:'harvest',ids:[0,1]},{type:'tractor',mode:'harvest',crop:'wheat'}])
  assert.throws(()=>act(s,action,now),{message:text},action.type);
 assert.deepEqual(s.plots,before.plots,'the ripe crops stay on their fields');
 // A finished batch waits in its building.
 const c=farm();c.warehouse={level:1};fill(c,100);c.inventory.feed=10;ready(c);fill(c,500);c.inventory.feed=0;
 const jobs=structuredClone(productionJobs(c.buildings.coop));
 assert.throws(()=>act(c,{type:'collect',building:'coop'},now),/Warehouse full \(500 \/ 500\)/);
 assert.throws(()=>act(c,{type:'collect_all',building:'coop'},now),/Warehouse full/);
 assert.deepEqual(productionJobs(c.buildings.coop),jobs);
 // The Seed Lab's collect.
 const l=farm(95);l.warehouse={level:1};l.lab.beds[0]={heirloom:Object.keys(HEIRLOOMS)[0],startedAt:now-2*H,readyAt:now-1};fill(l,500);
 assert.throws(()=>act(l,{type:'lab_collect',bed:0},now),/Warehouse full/);assert.ok(l.lab.beds[0]);
 // The night shift harvests, so it does not start.
 const n=farm();n.warehouse={level:1};fill(n,600);const cost=nightShiftQuote(n,'wheat',now).cost;
 assert.throws(()=>act(n,{type:'tractor_shift',crop:'wheat',expectedCost:cost},now),/Warehouse full \(600 \/ 500\)/);assert.equal(n.tractorShift,undefined);
});

test('one action may go over the line: a harvest, a sweep’s last field, a collect-all and the tractor are never split',()=>{
 const s=farm();s.warehouse={level:1};fill(s,499);ripe(s,0);ripe(s,1);ripe(s,2);
 const r=act(s,{type:'fields',action:'harvest',ids:[0,1,2]},now);
 assert.equal(r.count,1);assert.equal(r.full,true,'the sweep stops at full');assert.ok(storedCount(s)>500);
 assert.equal(s.plots[1].crop,'wheat');assert.equal(s.plots[2].crop,'wheat');
 const t=farm();t.warehouse={level:1};fill(t,499);for(const id of [0,1,2,3])ripe(t,id);
 const job=act(t,{type:'tractor',mode:'harvest',crop:'wheat'},now);assert.equal(job.count,4);assert.ok(t.plots.slice(0,4).every(p=>!p.crop));
 const c=farm();c.warehouse={level:1};c.buildings.coop.level=5;fill(c,0);ready(c,'coop','eggs',5);c.inventory.wheat=499-storedCount(c)+c.inventory.wheat;
 assert.equal(storedCount(c),499);
 const all=act(c,{type:'collect_all',building:'coop'},now);assert.equal(all.count,5);assert.ok(storedCount(c)>500);
 const h=farm();h.warehouse={level:1};fill(h,499);ripe(h,0);act(h,{type:'field',id:0,action:'harvest'},now);assert.equal(h.plots[0].crop,null);
});

test('never blocked: planting, starting batches, selling, the other tractor jobs, upgrades and fields, at any stock',()=>{
 const s=farm();s.warehouse={level:1};fill(s,5000);s.inventory.feed=100;s.inventory.corn=100;
 s.plots[0]={...s.plots[0],crop:null};
 act(s,{type:'field',id:0,action:'plant',crop:'wheat'},now);
 act(s,{type:'fields',action:'plant',ids:[1,2],crop:'wheat'},now);
 act(s,{type:'produce',recipe:'eggs'},now);
 act(s,{type:'tractor',mode:'water',crop:'wheat'},now);
 const coins=s.coins;act(s,{type:'sell',item:'wheat',quantity:10,day:utcDay(now)},now);assert.ok(s.coins>coins);
 act(s,{type:'sell',category:'crops',day:utcDay(now)},now);assert.equal(s.inventory.wheat,0);
 act(s,{type:'warehouse_upgrade',expectedCost:WAREHOUSE_COSTS[0]},now);assert.equal(s.warehouse.level,2);
 // The Village market too.
 const v=farm(110);v.warehouse={level:1};fill(v,5000);const good=Object.keys(VILLAGE_GOODS)[0];v.inventory[good]=10;
 act(v,{type:'sell',category:'village',item:good,quantity:10,day:utcDay(now)},now);assert.equal(v.inventory[good],0);
});

test('always arrives above the line: a running night shift, a pet’s find and a reward',()=>{
 const s=farm();s.warehouse={level:1};fill(s,100);for(const p of s.plots)Object.assign(p,{crop:null,plantedAt:0,readyAt:0});
 const cost=nightShiftQuote(s,'wheat',now).cost;act(s,{type:'tractor_shift',crop:'wheat',expectedCost:cost},now);
 fill(s,900);settleShift(s,now+5*SHIFT_ROUND_MS);
 assert.ok(storedCount(s)>900,'the shift that runs keeps harvesting');
 const p=farm();p.warehouse={level:1};fill(p,800);delete p.pets;
 const found=act(p,{type:'pet_pat',pet:'cat'},now);assert.equal(storedCount(p),800+found.count);
 // Rewards, purchases, gifts, chores, helping hands and carts have no Warehouse check at all: only these six places check it.
 const rules=readFileSync(new URL('../game/farm-state.js',import.meta.url),'utf8');
 const checks=rules.split('\n').filter(line=>/assertWarehouseRoom\(state\)|warehouseFull\(state\)\)\{full=true/.test(line)&&!/^function /.test(line)).map(line=>line.trim());
 const places=["if(action==='harvest'&&warehouseFull(state))","if(mode==='harvest')assertWarehouseRoom(state)","assertWarehouseRoom(state);","case 'field':if(action.action==='harvest')","case 'collect':assertWarehouseRoom(state)","case 'collect_all':assertWarehouseRoom(state)","case 'lab_collect':assertWarehouseRoom(state)"];
 assert.equal(checks.length,places.length);for(const [i,line] of checks.entries())assert.ok(line.startsWith(places[i]),line);
});

test('every farm starts on Warehouse level 1, whatever its stock (the owner, 22 Oct 2026: "zet iedereen op lvl 1")',()=>{
 const at=(level,stock)=>{const s=farm(level);fill(s,stock);delete s.warehouse;return normalizeFarm(s,now).warehouse.level;};
 for(const [level,stock] of [[1,32],[5,400],[30,521],[70,1841],[108,2000],[200,30000]])assert.equal(at(level,stock),1);
 // A new farm starts on level 1 and a saved level stays as it is, also when the stock changes.
 assert.equal(createFarm(now).warehouse.level,1);
 const s=farm(70);s.warehouse={level:3};fill(s,4000);normalizeFarm(s,now);assert.equal(s.warehouse.level,3);
 // Nobody loses anything: a farm over even its top keeps all its stock and only brings nothing in.
 const big=farm(85);fill(big,15198);delete big.warehouse;normalizeFarm(big,now);
 assert.equal(big.inventory.wheat,15198);assert.equal(big.warehouse.level,1);assert.equal(warehouseFull(big),true);
 // Bad saved values are mended.
 for(const bad of [{level:0},{level:'3'},{level:99},null,{}]){const t=farm(40);fill(t,100);t.warehouse=bad;normalizeFarm(t,now);assert.ok(t.warehouse.level>=1&&t.warehouse.level<=15,JSON.stringify(bad));}
 assert.equal(warehouseTopFor(farm(107)),10);assert.equal(warehouseTopFor(farm(108)),11);assert.equal(warehouseTopFor(farm(180)),15);
 assert.equal(warehouseStartLevel(fill(farm(1),0)),1);
});

test('upgrades: coins only on the farm, XP and counters, the price the card showed, the village levels at their farm level',()=>{
 const s=farm(60);s.warehouse={level:1};s.coins=19999;
 assert.throws(()=>act(s,{type:'warehouse_upgrade',expectedCost:20000},now),/You need 20000 coins/);
 s.coins=20000;const xp=s.xp,upgrades=s.stats.upgrades;
 assert.throws(()=>act(s,{type:'warehouse_upgrade',expectedCost:10000},now),/price has changed/);
 const r=act(s,{type:'warehouse_upgrade',expectedCost:20000},now);
 assert.deepEqual([r.level,r.capacity,r.cost,s.coins,s.warehouse.level],[2,650,20000,0,2]);
 assert.equal(s.xp-xp>=15,true);assert.equal(s.stats.upgrades,upgrades+1);assert.equal(s.stats.warehouse_upgrades,1);
 assert.ok(s.stats.coins_spent>=20000,'counts as coins spent for the events');
 // Level 10 -> 11 needs farm level 108 and the master goods.
 const v=farm(107);v.warehouse={level:10};
 assert.throws(()=>act(v,{type:'warehouse_upgrade'},now),/Reach level 108 to upgrade your Warehouse to level 11/);
 const w=farm(108);w.warehouse={level:10};for(const k of Object.keys(w.inventory))w.inventory[k]=0;
 assert.throws(()=>act(w,{type:'warehouse_upgrade'},now),/Make the goods first: 1 Master tools?, 20 /);
 Object.assign(w.inventory,{mastertools:1,plank:20,stone:30});const coins=w.coins;
 act(w,{type:'warehouse_upgrade',expectedCost:3000000},now);assert.equal(w.warehouse.level,11);assert.equal(coins-w.coins,3000000);
 assert.equal(w.inventory.mastertools+w.inventory.plank+w.inventory.stone,0);
});

test('the Buildings discount voucher halves a Warehouse upgrade, its goods too, and is used up',()=>{
 const s=farm(60);s.warehouse={level:4};s.boosts.upgradeCredits=1;
 assert.equal(warehouseUpgrade(s).coins,70000);assert.equal(warehouseUpgrade(s).voucher,true);
 const coins=s.coins;act(s,{type:'warehouse_upgrade',expectedCost:70000},now);
 assert.equal(coins-s.coins,70000);assert.equal(s.boosts.upgradeCredits,0);assert.equal(warehouseUpgrade(s).coins,220000);
 const v=farm(120);v.warehouse={level:11};v.boosts.upgradeCredits=1;
 assert.deepEqual(warehouseUpgrade(v),{level:12,capacity:3100,added:400,coins:2000000,materials:{mastertools:1,plank:20,stone:30},farmLevel:120,voucher:true});
});

test('near full and the capacity of a level',()=>{
 const s=farm();s.warehouse={level:3};fill(s,719);
 assert.equal(warehouseCapacity(s),800);assert.equal(warehouseNearFull(s),false);
 s.inventory.wheat=720;assert.equal(warehouseNearFull(s),true);assert.equal(warehouseFull(s),false);
 s.inventory.wheat=800;assert.equal(warehouseFull(s),true);
 assert.equal(warehouseCapacity(s,15),4500);
});

test('the guided first steps never come near the line',()=>{
 const s=createFarm(now);assert.equal(s.warehouse.level,1);assert.ok(storedCount(s)<50);
 assert.equal(levelOf(s),1);
});

// Old site code (main 562d8a2a, before the Warehouse) on a save the new rules wrote: it keeps state.warehouse untouched and plays on (the
// release order is the site first, then farm-api, so for about 40 minutes an open old tab may meet new saves), and the new rules on an
// old save add only state.warehouse.
const show=(sha,file)=>{try{return execFileSync('git',['show',`${sha}:${file}`],{cwd:new URL('..',import.meta.url),encoding:'utf8',maxBuffer:1<<26,stdio:['ignore','pipe','ignore']});}catch{return null;}};
test('differential: the old rules on new saves keep the Warehouse and play on; the new rules on old saves add only state.warehouse',async t=>{
 const oldState=show('562d8a2a','game/farm-state.js'),oldParts=show('562d8a2a','game/farmer-parts.js');
 if(!oldState||!oldParts){t.skip('git history not available');return;}
 const partsUrl='data:text/javascript;base64,'+Buffer.from(oldParts).toString('base64');
 const O=await import('data:text/javascript;base64,'+Buffer.from(oldState.replace("from './farmer-parts.js';",`from '${partsUrl}';`)).toString('base64'));
 // A new save: upgraded once, full, a ripe field and a finished batch.
 const s=farm(40);fill(s,640);s.inventory.feed=10;act(s,{type:'warehouse_upgrade',expectedCost:20000},now);ripe(s,0);
 const saved=JSON.parse(JSON.stringify(s));
 const old=O.normalizeFarm(JSON.parse(JSON.stringify(saved)),now+1000);
 assert.deepEqual(old.warehouse,{level:2},'the old rules keep the key as it is');
 for(const action of [{type:'field',id:0,action:'harvest'},{type:'sell',item:'wheat',quantity:5,day:utcDay(now)},{type:'produce',recipe:'eggs'},{type:'upgrade',building:'coop'}])
  O.applyFarmAction(old,action,now+1000);
 assert.deepEqual(old.warehouse,{level:2});
 assert.throws(()=>O.applyFarmAction(JSON.parse(JSON.stringify(saved)),{type:'warehouse_upgrade'},now),/Unknown farm action/,'an old farm-api refuses the new action cleanly');
 // Back under the new rules nothing is lost.
 const back=normalizeFarm(old,now+2000);assert.equal(back.warehouse.level,2);
 // The new rules on an old save: the same farm but for state.warehouse.
 const o=O.normalizeFarm(O.createFarm(now-H),now),n=normalizeFarm(JSON.parse(JSON.stringify(o)),now);
 // (One crop a harvest, merged in on 22 Oct 2026, adds mastery.kept too: the medals the old numbers gave, none on a new farm.)
 assert.deepEqual(n.warehouse,{level:1});delete n.warehouse;assert.deepEqual(n.mastery.kept,{});delete n.mastery.kept;assert.deepEqual(n,o);
});
