import test from 'node:test';
import assert from 'node:assert/strict';
import * as m from '../game/farm-state.js';
// The review of 28 Oct 2026 (the owner: "Fix alles"): what it found, held.
const HALL={done:['windpump','longhouse','stonequay','lookout','greathall'],given:{}};
const farm=(level,{hall=true,works=[]}={})=>{const now=Date.UTC(2026,10,3);const s=m.createFarm(now-9e9);s.xp=m.xpForLevel(level);for(const [k,b] of Object.entries(s.buildings))if(!m.worldThreeBuilding(k))b.built=true;m.normalizeFarm(s,now);if(hall)s.village.landmarks=structuredClone(HALL);m.normalizeFarm(s,now);if(works.length){s.harbour.works.done=works;for(const w of works)if(s.buildings[w])s.buildings[w].built=true;m.normalizeFarm(s,now);}return {s,now};};
const act=(s,a,now)=>m.applyFarmAction(s,a,now);
test('a harbour place opens only by its work, never by level alone, and never before the Great Hall',()=>{
 for(const hall of [false,true]){const {s,now}=farm(270,{hall});s.inventory.flax=50;s.inventory.linen=10;
  assert.equal(m.buildingUnlocked(s,'ropewalk'),false);assert.throws(()=>act(s,{type:'produce',recipe:'twistrope'},now));assert.throws(()=>act(s,{type:'construct',building:'ropewalk'},now),/harbour master/);}
 for(const k of Object.keys(m.BUILDINGS).filter(m.worldThreeBuilding))assert.equal(m.BUILDING_COSTS[k],m.HARBOUR_WORKS.find(w=>w.id===k).coins,k);
});
test('the farm keeps to itself: no harbour goods in the shipping bin, no side-by-side harbour batches, harbour finishes count in the harbour',()=>{
 const {s,now}=farm(230,{works:['office','ropewalk']});s.inventory.rowboat=3;s.inventory.flax=100;s.inventory.linen=20;s.buildings.ropewalk.level=3;
 assert.equal(m.shipBinItem('rowboat'),false);assert.equal(m.shipBinItem('stone'),false);assert.equal(m.shipBinItem('wheat'),true);
 const before=s.stats.parallel_batches??0;for(let i=0;i<3;i++)act(s,{type:'produce',recipe:'twistrope'},now);assert.equal(s.stats.parallel_batches??0,before);
 assert.equal(m.actionWorld({type:'finish_batch',building:'ropewalk'}),3);assert.equal(m.actionWorld({type:'finish_batch',building:'smithy'}),2);assert.equal(m.actionWorld({type:'finish_batch',building:'bakery'}),1);
});
test('village upgrades still count for the village leagues\' upgrades goal; the harbour\'s count apart and its leagues ask for them',async()=>{
 const {s,now}=farm(150);s.coins=1e8;const b=s.stats.upgrades,v=s.stats.village_upgrades??0;
 for(const k of ['mine','smithy','jeweller'])try{act(s,{type:'upgrade',building:k},now);}catch{}
 assert.ok(s.stats.upgrades>b&&s.stats.village_upgrades>v);
 const {EVENT_HOUR_POOLS}=await import('../public/event-goals.js');
 for(const l of m.EVENT_LEAGUES.filter(l=>l.world===3))assert.ok(!EVENT_HOUR_POOLS[l.index].flat().some(g=>g.stat==='upgrades'),l.id);
});
test('the berths: a container ship every 2 days from the Deep quay and a world voyage every week from the launch, counted for their quests',()=>{
 const {s,now}=farm(300,{works:m.HARBOUR_WORKS.map(w=>w.id)});s.warehouse={level:15};
 assert.deepEqual(m.harbourBerths(s),['ship','ship','ship','container','voyage']);
 for(const [i,kind,every,diamonds] of [[3,'container',48,10],[4,'voyage',168,25]]){const sh=s.harbour.quays[i].ship;assert.equal(sh.kind,kind);for(const [k,n] of Object.entries(sh.input))s.inventory[k]=n;
  const d=s.diamonds,r=act(s,{type:'ship_load',quay:i,ship:sh.id,input:{...sh.input}},now);assert.equal(r.sailed,true);assert.equal(s.diamonds-d,diamonds);assert.equal((r.readyAt-now)/3600000,every);}
 assert.equal(s.stats.container_ships,1);assert.equal(s.stats.world_voyages,1);
 assert.equal(act(s,{type:'flagship_name',name:' Sea  Breeze '},now).name,'Sea Breeze');assert.throws(()=>act(s,{type:'flagship_name',name:'<b>'},now));
 const {s:early,now:n2}=farm(290,{works:m.HARBOUR_WORKS.filter(w=>w.id!=='launch').map(w=>w.id)});assert.throws(()=>act(early,{type:'flagship_name',name:'Gull'},n2),/Launch/);
});
test('the leagues shown without an event are the live events\' (12 until the harbour\'s SQL runs)',()=>{
 assert.equal(m.LIVE_EVENT_LEAGUES,12);assert.equal(m.liveEventLeague(250).id,'village');assert.equal(m.liveEventLeague(50).id,m.eventLeague(50).id);
});
test('every harbour quest can be finished: an upgrade count within 10 places × 9 levels, and the harbour warehouse gives its XP',()=>{
 const places=Object.keys(m.BUILDINGS).filter(m.worldThreeBuilding).length;
 for(const q of m.HARBOUR_QUESTS.filter(q=>q.stat==='harbour_upgrades'))assert.ok(q.target<=places*9,q.title);
 for(const q of m.HARBOUR_QUESTS.filter(q=>q.stat==='harbour_warehouse'))assert.ok(q.target<=m.HARBOUR_WAREHOUSE.length,q.title);
 const {s,now}=farm(205);s.coins=1e7;s.inventory.plank=400;s.inventory.stone=400;const xp=s.xp;act(s,{type:'harbour_warehouse'},now);assert.equal(s.xp-xp,15);
});
// The last review (28 Oct 2026): a level-200 farm without the Great Hall keeps the live shape, the harbour's keys come the moment it
// opens, the farm's power-ups and the shipping bin stay the farm's, and no farm drops a level at 200.
test('without the Great Hall a level-200 save keeps the live shape; the harbour keys come the moment it opens',()=>{
 const {s,now}=farm(230,{hall:false});
 assert.ok(!Object.keys(s.buildings).some(m.worldThreeBuilding)&&!Object.keys(s.inventory).some(m.worldThreeItem),'no harbour keys');
 assert.ok(Object.keys(m.RECIPES).every(id=>Number.isFinite(m.recipeDuration(s,id,now))),'every recipe reads without the harbour keys');
 s.village.landmarks=structuredClone(HALL);m.addHarbourKeys(s);
 assert.ok(Object.keys(m.BUILDINGS).filter(m.worldThreeBuilding).every(k=>s.buildings[k]?.built===false),'the places join, not built');
});
test('the farm power-ups, the shipping bin and the level curve stay out of the harbour',()=>{
 const {s,now}=farm(270,{works:m.HARBOUR_WORKS.map(w=>w.id)});
 for(const [k,b] of Object.entries(s.buildings))if(!m.worldThreeBuilding(k)&&m.BUILDINGS[k].type==='production')b.level=m.MAX_BUILDING_LEVEL;
 assert.equal(m.boostStatus(s,'upgrade',now).reason,'All buildings at maximum level');
 s.buildings.ropewalk.job={recipe:'twistrope',readyAt:now+6e5,output:{rope:1}};
 assert.equal(m.boostStatus(s,'production',now).reason,'No batches are running');
 assert.ok(Object.hasOwn(m.ITEMS,'goldenloaf')&&m.shipBinItem('goldenloaf')===false&&m.shipBinItem('rope')===false&&m.shipBinItem('bread')===true);
 for(let level=200;level<300;level++)assert.ok(m.xpForLevel(level+1)-m.xpForLevel(level)<=m.HARBOUR_XP_STEP,`${level} -> ${level+1}`);
});
