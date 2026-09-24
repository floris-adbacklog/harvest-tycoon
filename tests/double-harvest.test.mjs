import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLegacyFarm as createFarm} from './legacy-farm.mjs';
import {applyFarmAction as act,normalizeFarm,xpForLevel,marketQuote,harvestQuantity,boostOffer,BOOSTS,BOOST_DURATIONS,CROPS} from '../game/farm-state.js';
import {trackCommerce} from '../src/analytics.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const now=Date.UTC(2026,8,24,12),MIN=60000,HOUR=60*MIN;
const TIMED=['xp','harvest','coins'];
function farm(){const s=createFarm(now);s.xp=xpForLevel(20);s.coins=100000;s.diamonds=5000;s.onboarding.completed=10;s.onboarding.rewardClaimed=true;s.stats.harvested=1;return s;}   // past the guide and the first harvest
// A ripe field: watered (2 crops), watered and cared for (3 crops) or neither (1).
function ripe(s,id,crop,{watered=true,tended=false}={}){s.plots[id]={...s.plots[id],id,crop,plantedAt:now-HOUR,readyAt:now-MIN,careAt:now-HOUR,watered,tended,fertilized:false,harvestCycles:0};}
const buy=(s,boost,length,time=now)=>act(s,{type:'buy_boost',boost,...(length?{length}:{}),expectedCost:boostOffer(boost,length).cost},time);

test('timed boosts cost 30 min / 1 hour / 1 day; longer is cheaper per hour, and Double harvest sits between XP and earnings',()=>{
 assert.deepEqual(Object.keys(BOOST_DURATIONS),['30m','1h','1d']);
 assert.deepEqual(TIMED.map(id=>BOOSTS[id].prices),[{'30m':50,'1h':90,'1d':300},{'30m':75,'1h':135,'1d':450},{'30m':100,'1h':180,'1d':600}]);
 for(const id of TIMED){
  const perHour=length=>BOOSTS[id].prices[length]/(BOOST_DURATIONS[length]/HOUR);
  assert.ok(perHour('30m')>perHour('1h')&&perHour('1h')>perHour('1d'),`${id}: longer is cheaper per hour`);
  assert.equal(BOOSTS[id].prices['1h'],BOOSTS[id].prices['30m']*1.8);assert.equal(BOOSTS[id].prices['1d'],BOOSTS[id].prices['30m']*6);
  // What older games read: the 30-minute offer.
  assert.equal(BOOSTS[id].cost,BOOSTS[id].prices['30m']);assert.equal(BOOSTS[id].duration,BOOST_DURATIONS['30m']);
  assert.doesNotMatch(BOOSTS[id].description,/30 minutes/,'the length is picked, so the text does not name one');
 }
 assert.ok(BOOSTS.xp.cost<BOOSTS.harvest.cost&&BOOSTS.harvest.cost<BOOSTS.coins.cost);
 for(const id of ['crops','production','upgrade'])assert.equal(BOOSTS[id].prices,undefined,`${id} works at once: no length`);
});

test('an older game that sends no length still buys the 30-minute boost at the old price',()=>{
 const s=farm();const result=act(s,{type:'buy_boost',boost:'xp',expectedCost:50},now);
 assert.equal(s.diamonds,4950);assert.equal(s.boosts.xpUntil,now+30*MIN);assert.equal(result.expiresAt,now+30*MIN);assert.equal(result.length,'30m');
});

test('each length charges its own price and runs its own time; a wrong price or length changes nothing',()=>{
 const s=farm();
 buy(s,'harvest','1h');assert.equal(s.diamonds,5000-135);assert.equal(s.boosts.harvestUntil,now+HOUR);
 buy(s,'coins','1d');assert.equal(s.diamonds,5000-135-600);assert.equal(s.boosts.coinsUntil,now+24*HOUR);
 const before=structuredClone(s);
 assert.throws(()=>act(s,{type:'buy_boost',boost:'xp',length:'1d',expectedCost:50},now),/prices have changed/);
 for(const length of ['2h','',7,'__proto__','toString'])assert.throws(()=>act(s,{type:'buy_boost',boost:'xp',length,expectedCost:50},now),/30 minutes, 1 hour or 1 day/,String(length));
 assert.deepEqual(s,before);
});

test('buying a running boost again adds the new time after it, like VIP',()=>{
 const s=farm();buy(s,'harvest','30m');
 const result=buy(s,'harvest','1h',now+10*MIN);
 assert.equal(s.boosts.harvestUntil,now+30*MIN+HOUR,'20 minutes left + 1 hour');assert.equal(result.expiresAt,s.boosts.harvestUntil);
 assert.equal(s.diamonds,5000-75-135);
 buy(s,'harvest','30m',now+3*HOUR);assert.equal(s.boosts.harvestUntil,now+3*HOUR+30*MIN,'after it ended it starts from now again');
});

test('Double harvest doubles every harvest while it runs, also a crop that ripened before it started, and nothing more',()=>{
 const s=farm();ripe(s,0,'wheat');ripe(s,1,'corn',{tended:true});ripe(s,2,'lettuce',{watered:false});ripe(s,3,'wheat');
 const wheat=s.inventory.wheat,corn=s.inventory.corn,lettuce=s.inventory.lettuce,xp=s.xp,counted=s.stats.harvest_wheat??0;
 buy(s,'harvest','30m');
 assert.equal(harvestQuantity(s,s.plots[0],now),4);
 const first=act(s,{type:'field',id:0,action:'harvest'},now+MIN);assert.equal(first.quantity,4);assert.equal(s.inventory.wheat,wheat+4);
 act(s,{type:'field',id:1,action:'harvest'},now+MIN);assert.equal(s.inventory.corn,corn+6,'watered and cared for: 3 becomes 6');
 act(s,{type:'field',id:2,action:'harvest'},now+MIN);assert.equal(s.inventory.lettuce,lettuce+2,'no care: 1 becomes 2');
 assert.equal(s.xp-xp,(CROPS.wheat.xp+CROPS.corn.xp*2+CROPS.lettuce.xp),'XP stays as it was: that is Double XP');
 assert.equal(s.stats.harvest_wheat,counted+4,'quests that count crops count the real amount');
 const after=act(s,{type:'field',id:3,action:'harvest'},now+31*MIN);assert.equal(after.quantity,2,'after 30 minutes it is over');
});

test('regrowing crops and the tractor are doubled too; Instant harvest and Double earnings stack with it',()=>{
 const s=farm();s.plots.forEach((p,id)=>{if(p.crop)s.plots[id]={...p,crop:null,plantedAt:0,readyAt:0,careAt:0,watered:false,tended:false,fertilized:false,harvestCycles:0};});
 ripe(s,0,'apples');ripe(s,1,'wheat');ripe(s,2,'wheat');
 const apples=s.inventory.apples,wheat=s.inventory.wheat;
 buy(s,'harvest','1h');
 act(s,{type:'field',id:0,action:'harvest'},now+MIN);assert.equal(s.inventory.apples,apples+4);assert.equal(s.plots[0].crop,'apples','it regrows');
 act(s,{type:'tractor',mode:'harvest'},now+2*MIN);assert.equal(s.inventory.wheat,wheat+8,'two wheat fields by tractor: 2×2 each');
 // Instant harvest makes the regrowing apples ripe again; harvested during Double harvest they are doubled again.
 buy(s,'crops',undefined,now+3*MIN);act(s,{type:'field',id:0,action:'harvest'},now+3*MIN);assert.equal(s.inventory.apples,apples+4+2,'regrown apples have no water: 1 becomes 2');
 buy(s,'coins','30m',now+4*MIN);
 const sold=s.inventory.wheat;const sale=act(s,{type:'sell',item:'wheat'},now+5*MIN);
 assert.equal(sale.coins,Math.floor(sold*marketQuote('wheat',now+5*MIN).price*2),'doubled crops sell at double price');
});

test('the running time survives a save and reload; broken values become 0',()=>{
 const s=farm();buy(s,'harvest','1d');const saved=normalizeFarm(JSON.parse(JSON.stringify(s)),now);assert.equal(saved.boosts.harvestUntil,now+24*HOUR);
 for(const bad of [null,'soon',Infinity,-5])assert.equal(normalizeFarm({...structuredClone(s),boosts:{...s.boosts,harvestUntil:bad}},now).boosts.harvestUntil,0,String(bad));
});

test('the boosts screen offers the three lengths with prices, extends a running boost, and shows 2× harvest in the bar',()=>{
 const ui=read('public/boosts-ui.js');
 assert.match(ui,/const LENGTH_LABELS=\{'30m':'30 min','1h':'1 hour','1d':'1 day'\}/);
 // The game's own dropdown (public/pretty-select.js) as a small pill, each length with its price in diamonds; 30 minutes each time the shop opens.
 assert.match(ui,/<select class="boost-length" data-boost-length="\$\{id\}" data-pretty="compact" aria-label="How long"/);
 assert.match(ui,/<option value="\$\{length\}" data-detail="\$\{number\(b\.prices\[length\]\)\}" data-detail-art="diamonds"/);
 assert.match(ui,/requests=\{\};lengths=\{\};/,'back to 30 minutes when the shop opens');
 assert.match(ui,/runAction\(\{type:'buy_boost',boost:id,\.\.\.\(length\?\{length\}:\{\}\),expectedCost:offer\.cost\}\)/,'sends the length, and none for boosts without one');
 assert.match(ui,/const verb=active\?'Extend'/);assert.match(ui,/Adds \$\{time\} after your current \$\{boost\.name\} ends\./);
 assert.match(ui,/\['harvest','2× harvest',state\.boosts\.harvestUntil\]/);
 assert.match(read('public/shop.css'),/\.boost-status-row\{display:flex/);
 assert.match(read('public/visual-icons.js'),/'double-harvest':'double-harvest'/);
 assert.match(read('public/game.js'),/harvestQuantity\(state,p,farmNow\(\)\)\} crop/,'the field tooltip shows the doubled amount');
});

test('analytics knows Double harvest and the length, and still drops anything else',()=>{
 const win={innerWidth:1400,dataLayer:[]};
 trackCommerce('diamond_action_completed',{action:'harvest',length:'1d',cost:450},win);
 trackCommerce('diamond_action_completed',{action:'harvest',length:'forever',cost:450},win);
 assert.deepEqual(win.dataLayer,[{event:'diamond_action_completed',device:'desktop',action:'harvest',length:'1d',cost:450},{event:'diamond_action_completed',device:'desktop',action:'harvest',cost:450}]);
 assert.match(read('public/farm-client.js'),/\{action:action\.boost\?\?action\.type,length:action\.length,cost:result\.cost\}/);
});
