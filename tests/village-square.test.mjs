import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,worldTwoBuilding,villageRequestGoods,villageRequestExtra,villagerLine,villageBrief,VILLAGERS,VILLAGER_GONE,VILLAGE_REQUEST_WAIT,VILLAGE_REQUEST_BOARDS_MAX,ITEMS,BUILDINGS,RECIPE_LEVELS,BUILDING_LEVELS,VILLAGE_BRIEFS,VILLAGE_LANDMARKS,VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS,BOAT_GONE,BOAT_RETURN,familyWeek,applyFarmAction} from '../public/farm-state.js';
import {briefCard,squareMarkup,squareStatus,createVillageSquareUI} from '../public/village-square-ui.js';
import {createEconomyUI} from '../public/economy-ui.js';
import {boatStatus,boatMarkup,createBoatUI,SKIPPER_LINES} from '../public/boat-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// World II's market square (Oct 2026, public/village-square-ui.js): the Village market's pin opens it. Its screen is drawn from the rules
// (game/farm-state.js), so these run the real rules on farms as players have them at that level, guided and legacy.
const now=Date.parse('2026-10-05T12:00:00Z');
function farm(level,{mode='guided',built=[]}={}){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=400000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings))if(k!=='donkeystable'&&(!worldTwoBuilding(k)||built.includes(k)))b.built=true;   // not the farm's Donkey Stable (level 64, 27 Oct 2026): the pinned cargos predate its soap; tests/donkey-stable.test.mjs sails it
 return normalizeFarm(s,now);
}
// The ingredients as economy-ui.js draws them, with the good's key, so the order of the lines can be read back.
const itemList=items=>Object.entries(items).map(([k,n])=>`<span class="ingredient" data-item="${k}">${n} ${ITEMS[k].name}</span>`).join('');
const cards=html=>html.split('<article').slice(1);

// A small page for the screens' own code: every element of farm.html by its id, and each id a screen writes into its markup (as the
// browser would make it; one that is never written stays missing, so a screen that reads it breaks here as it would there). A list of
// [data-…] buttons comes from the markup, with their data and the onclick a screen gives them.
function page(){
 const byId=new Map();
 const register=html=>{for(const [,id] of html.matchAll(/\sid="([^"]+)"/g))element(id);};
 const buttons=(html,selector)=>{
  const [,attr]=selector.match(/^\[(data-[a-z-]+)\]$/)??[];if(!attr)return [];
  return [...html.matchAll(new RegExp(`<[a-z]+[^>]*\\s${attr}(?:="[^"]*")?[^>]*>`,'g'))].map(([tag])=>({tag,disabled:/\sdisabled[\s>]/.test(tag),onclick:null,addEventListener(type,fn){this.onclick=fn;},closest:()=>element(),
   dataset:Object.fromEntries([...tag.matchAll(/\sdata-([a-z-]+)(?:="([^"]*)")?/g)].map(([,k,v])=>[k.replace(/-([a-z])/g,(m,c)=>c.toUpperCase()),v??'']))}));
 };
 function element(id){
  const e={id,hidden:false,disabled:false,textContent:'',className:'',dataset:{},style:{},open:false,scrollTop:0,html:'',found:{},
   classList:{toggle(){},add(){},remove(){},contains:()=>false},lastChild:{textContent:''},append(){},
   addEventListener(type,fn){e.onclick=fn;},removeEventListener(){},setAttribute(){},removeAttribute(){},getAttribute:()=>null,hasAttribute:()=>false,
   closest:()=>element(),querySelector:()=>element(),querySelectorAll:selector=>e.found[selector]??=buttons(e.html,selector),
   showModal(){e.open=true;},close(){e.open=false;},getBoundingClientRect:()=>({width:0,height:0}),
   get innerHTML(){return e.html;},set innerHTML(value){e.html=String(value);e.found={};register(e.html);},
   insertAdjacentHTML(where,html){e.html=where==='afterbegin'?html+e.html:e.html+html;e.found={};register(html);}};
  if(id)byId.set(id,e);return e;
 }
 for(const [,id] of read('public/farm.html').matchAll(/\sid="([^"]+)"/g))element(id);
 return {byId,document:{getElementById:id=>byId.get(id)??null,querySelectorAll:()=>[],querySelector:()=>null,createElement:()=>element()}};
}
// Runs fn with the page as the document; the square's 30-second redraw is not started (it would keep the test running).
async function withPage(fn){
 const p=page(),saved={document:globalThis.document,setTimeout:globalThis.setTimeout};
 globalThis.document=p.document;globalThis.setTimeout=()=>0;
 try{return await fn(p);}finally{globalThis.document=saved.document;globalThis.setTimeout=saved.setTimeout;if(saved.document===undefined)delete globalThis.document;}
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('the golden brief: what it builds and costs, Show me, and Build only when the level, coins and goods are there',()=>{
 for(const mode of ['guided','legacy']){
  const s=farm(100,{mode});let html=briefCard(s,itemList);
  assert.match(html,/<small>GOLDEN BRIEF<\/small><h3>The miners’ lunch<\/h3>/,mode);assert.match(html,/<b>Builds the Mine<\/b>/);
  assert.match(html,/75,000 coins/);assert.ok(html.includes(`<span class="brief-from">${VILLAGERS[0].name}</span>`));
  assert.match(html,/data-village-show="mine"/);assert.match(html,/data-village-build="mine" disabled>Build</);
  assert.match(html,/<small class="shortfall">Still needed: 6 Packed lunch\.<\/small>/,'exactly what is missing, as an upgrade says it');
  s.inventory.packedlunch=6;html=briefCard(s,itemList);
  assert.match(html,/village-brief is-ready/);assert.match(html,/data-village-build="mine" >Build</);assert.doesNotMatch(html,/shortfall/);
  s.coins=1000;assert.match(briefCard(s,itemList),/Still needed: 74,000 coins\./);
  assert.doesNotMatch(briefCard(s,itemList,{showMe:false}),/data-village-show/,'a village place\'s own window leaves Show me out');
 }
 assert.match(briefCard(farm(101,{built:['mine','lumbercamp']}),itemList),/<h3>A fire for the forge<\/h3>[^]*Opens at level 102\. You are level 101\./);
 // From Phase 2a (Oct 2026) the brief after the Smithy is the Village Fields (D1), before the Village Windmill; the builders' "next plans"
 // are retired (the all-built card is tested with the landmarks).
 assert.match(briefCard(farm(112,{built:['mine','lumbercamp','smithy','villagemill']}),itemList),/<small>GOLDEN BRIEF<\/small><h3>Rows by the hay barns<\/h3>[^]*<b>Builds the Village Fields<\/b>/);
 // The palette: the brief's edge is the ready label's yellow; the gold of the buttons is for real money.
 const css=read('public/world-two.css');
 assert.match(css,/\.order-card\.village-brief\{background:#fbf8f3;border:2px solid #efc750\}/);assert.doesNotMatch(css,/var\(--btn-gold/);
});

test('the market square: the brief on top, a villager per board (three from level 104), Help out and Not now, and the way to sell',()=>{
 const s=farm(100);let html=squareMarkup(s,itemList,now);
 assert.match(html,/^<h3 class="square-heading">Golden brief<\/h3><p class="square-rule">Village places are built with coins and village goods, one at a time\.<\/p><article class="order-card village-brief/);
 assert.match(html,/<p class="square-rule">Villagers pay half again what their goods are worth\. A new villager comes 3 hours after you help or say no\.<\/p>/);
 assert.equal(VILLAGE_REQUEST_WAIT,3*3600000,'"3 hours" on the screen');
 const requests=cards(html).filter(c=>/village-request/.test(c)),said=[];assert.equal(requests.length,2);
 s.village.boards.forEach((b,i)=>{
  const card=requests[i],r=b.request,line=villagerLine(r,said);said.push(line);
  assert.ok(card.includes(`data-village-deliver="${i}" data-request="${r.id}"`)&&card.includes(`data-village-skip="${i}" data-request="${r.id}">Not now</button>`));
  assert.ok(card.includes(`<h3>${VILLAGERS[r.villager].name}</h3>`)&&card.includes(`<p class="valley-line">${line}</p>`)&&VILLAGERS[r.villager].lines.includes(line));
  assert.deepEqual([...card.matchAll(/data-item="([a-z]+)"/g)].map(m=>m[1]),Object.keys(villageRequestGoods(r)),'the lines in their fixed order');
  assert.match(card,/disabled>Help out</,'nothing in stock: Help out waits');
 });
 assert.match(html,/<p class="valley-footer"><span>A third villager comes at level 104\.<\/span><\/p>/);
 assert.match(html,/<div class="market-board-link"><span>Sell village goods at today’s prices\.<\/span><button type="button" id="square-sell">Sell goods →<\/button><\/div>$/);
 assert.doesNotMatch(html,/ · /,'no middle dots');
 // Enough in stock: that villager can be helped.
 Object.assign(s.inventory,s.village.boards[0].request.input);html=squareMarkup(s,itemList,now);
 assert.match(cards(html).find(c=>/village-request/.test(c)),/village-request is-ready[^]*data-village-deliver="0" data-request="\d+" >Help out</);
 s.stats.village_requests=1;assert.match(squareMarkup(s,itemList,now),/<span>1 villager helped so far\.<\/span>/);
 s.stats.village_requests=1234;assert.match(squareMarkup(s,itemList,now),/<span>1,234 villagers helped so far\.<\/span>/);
 // From level 104: three villagers and no line about the third.
 const t=farm(104);html=squareMarkup(t,itemList,now);assert.equal(VILLAGE_REQUEST_BOARDS_MAX,4,'the fourth comes with the Lookout tower');
 assert.equal(cards(html).filter(c=>/village-request/.test(c)).length,3);assert.doesNotMatch(html,/A third villager/);
 // A board after Help or Not now waits; one that is due with nothing the farm can make (no Kitchen) says how to get a villager.
 t.village.boards[1]={request:null,readyAt:now+VILLAGE_REQUEST_WAIT};assert.match(squareMarkup(t,itemList,now),/<h3>Waiting for a villager<\/h3><\/div><\/div><p class="valley-next">Next villager in <b>3h<\/b><\/p>/);
 const none=farm(100);none.buildings.kitchen.built=false;none.village={serial:0,boards:[]};normalizeFarm(none,now);
 assert.ok(none.village.boards.every(b=>!b.request));assert.match(squareMarkup(none,itemList,now),/<p class="valley-next">Pack lunches in the Farm Kitchen and a villager will come\.<\/p>/);
});

test('"+X% vs market" shows only when the market would pay less now, a Double earnings boost included',()=>{
 const s=farm(130,{built:['mine','lumbercamp','smithy']}),shown=boosted=>{
  if(boosted)s.boosts.coinsUntil=now+3600000;else delete s.boosts.coinsUntil;
  const requests=cards(squareMarkup(s,itemList,now)).filter(c=>/village-request/.test(c));
  return s.village.boards.map((b,i)=>{const extra=villageRequestExtra(s,b.request,now);assert.equal(requests[i].includes('vs market'),extra!==null,`${boosted} ${i}`);if(extra)assert.ok(requests[i].includes(`>+${extra}% vs market</b>`));return extra??0;});
 };
 const plain=shown(false),boosted=shown(true);
 assert.ok(plain.some(n=>n>0),'without a boost a request pays more than the market');
 // With the boost the market pays twice: the chip says less, or goes when the market would pay as much.
 plain.forEach((n,i)=>assert.ok(boosted[i]<n||n===0&&boosted[i]===0,`${i}: ${n}% then ${boosted[i]}%`));
 assert.ok(boosted.some((n,i)=>n<plain[i]));
});

test('the market square\'s line in the village\'s Buildings list: the brief first, then villagers to help, then who waits',()=>{
 const s=farm(100);s.inventory.packedlunch=6;
 assert.deepEqual(squareStatus(s,now),{text:'Golden brief ready to build',kind:'ready'});
 s.inventory.packedlunch=0;assert.deepEqual(squareStatus(s,now),{text:'2 villagers waiting',kind:'idle'});
 Object.assign(s.inventory,s.village.boards[1].request.input);assert.deepEqual(squareStatus(s,now),{text:'1 villager can be helped',kind:'ready'});
 for(const b of s.village.boards){b.request=null;b.readyAt=now+VILLAGE_REQUEST_WAIT;}
 assert.deepEqual(squareStatus(s,now),{text:'Next villager in 3h',kind:'working'});
 assert.equal(squareStatus(farm(99),now).kind,'locked');
});

test('Help out and Not now hand over only what was on the screen; Build, Show me and Sell goods do what they say',async()=>{
 await withPage(async p=>{
  const s=farm(100),calls=[],notes=[],shown=[],sold=[];s.inventory.packedlunch=6;
  for(const b of s.village.boards)Object.assign(s.inventory,Object.fromEntries(Object.entries(b.request.input).map(([k,n])=>[k,(s.inventory[k]??0)+n])));
  const answers={village_deliver:{villager:VILLAGERS[4].name,coins:6270,xp:84},village_skip:{readyAt:0},village_build:{place:'mine',name:'Mine',coins:75000,xp:250}};
  const ui=createVillageSquareUI({state:s,runAction:async action=>{calls.push(structuredClone(action));return answers[action.type];},onChange(){},notify:m=>notes.push(m),itemList,onShow:key=>shown.push(key),onSell:()=>sold.push(1)});
  ui.open();const dialog=p.byId.get('village-square-dialog'),content=()=>p.byId.get('village-square-content');assert.equal(dialog.open,true);
  const first=structuredClone(s.village.boards[0].request),second=structuredClone(s.village.boards[1].request);
  // The server's farm can hold other goods under the same running number: the state changes, the screen has not been drawn again.
  s.village.boards[0].request.input={stone:1};
  content().querySelectorAll('[data-village-deliver]')[0].onclick();await tick();
  assert.deepEqual(calls[0],{type:'village_deliver',board:0,request:first.id,input:first.input});
  assert.equal(notes[0],`${VILLAGERS[4].name} thanks you! +6,270 coins and +84 XP.`);
  content().querySelectorAll('[data-village-skip]')[1].onclick();await tick();
  assert.deepEqual(calls[1],{type:'village_skip',board:1,request:second.id,input:second.input});assert.equal(notes[1],'The next villager comes in 3h.');
  content().querySelectorAll('[data-village-build]')[0].onclick();await tick();
  assert.deepEqual(calls[2],{type:'village_build',place:'mine'});assert.equal(notes[2],'The Mine is built! +250 XP.');assert.equal(dialog.open,true,'it stays open on the next brief');
  content().querySelectorAll('[data-village-show]')[0].onclick();assert.deepEqual(shown,['mine']);assert.equal(dialog.open,false);
  ui.open();p.byId.get('square-sell').onclick();assert.deepEqual(sold,[1]);assert.equal(dialog.open,false);
  // A refusal is told as it comes. One for a villager who moved on (the server filled that board with other goods, a family gift or
  // another device changed the farm there) loads the farm first, so the screen draws the server's villager and the next tap is not refused
  // again; any other refusal leaves the farm as it is.
  let loads=0;const server={id:99,villager:0,input:{stone:10},value:450,coins:675,xp:9};
  const refused=createVillageSquareUI({state:s,runAction:async()=>{throw Object.assign(new Error(VILLAGER_GONE),{code:'ACTION_REJECTED'});},onChange(){},notify:m=>notes.push(m),itemList,refresh:async()=>{loads++;s.village.boards[0].request=structuredClone(server);}});
  refused.open();content().querySelectorAll('[data-village-deliver]')[0].onclick();await tick();await tick();
  assert.equal(notes.at(-1),'This villager has moved on. Look at the market square again.');assert.equal(loads,1);
  assert.match(content().innerHTML,/data-village-deliver="0" data-request="99"/,'drawn again after the load, with the server\'s villager');
  const missing=createVillageSquareUI({state:s,runAction:async()=>{throw new Error('Missing: Stone (0/10).');},onChange(){},notify:m=>notes.push(m),itemList,refresh:async()=>{loads++;}});
  missing.open();content().querySelectorAll('[data-village-skip]')[0].onclick();await tick();await tick();assert.equal(loads,1,'only for a villager who moved on');
 });
 const below=farm(99),said=[];createVillageSquareUI({state:below,runAction:async()=>{},onChange(){},notify:m=>said.push(m),itemList}).open();
 assert.deepEqual(said,['Reach level 100 to trade in the village.'],'never opens below level 100');
});

test('in the village: the Market square card heads the Buildings list, a place shows its brief, and the sell list leads to the square',async()=>{
 await withPage(async p=>{
  const s=farm(100),places=[],economy=createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace:key=>places.push(key),village:true});
  assert.deepEqual([economy.status('mine'),economy.status('lumbercamp'),economy.status('smithy')].map(x=>[x.text,x.kind]),[['Build from the golden brief','available'],['After the Mine','locked'],['Locked · Reach level 102.','locked']]);
  economy.openBuildings();const catalog=p.byId.get('building-catalog').innerHTML;
  assert.match(catalog,/^<button class="building-card is-place" data-open-square><span class="building-card-art"><img src="\/assets\/icons\/villagemarket\.webp" alt=""><\/span><span class="building-card-info"><strong>Market square<\/strong><span class="building-status idle" data-square-status>2 villagers waiting<\/span>/);
  economy.openBuilding('mine');let html=p.byId.get('building-content').innerHTML;
  assert.match(html,/data-village-build="mine"/);assert.doesNotMatch(html,/id="construct-building"|data-village-show|Build for/,'no old Build button, no Show me in the place itself');
  economy.openBuilding('lumbercamp');html=p.byId.get('building-content').innerHTML;
  assert.match(html,/<strong>After the Mine<\/strong><small>Village places are built with coins and village goods, one at a time\.<\/small>/);assert.doesNotMatch(html,/data-village-build|id="construct-building"/);
  economy.openBuilding('smithy');assert.match(p.byId.get('building-content').innerHTML,/Opens at level 102/);assert.doesNotMatch(p.byId.get('building-content').innerHTML,/data-village-build/);
  // A farm past 112 with nothing built (as some farms are): each place names the one right before it, not the open brief.
  const late=farm(112),later=createEconomyUI({state:late,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){},village:true});
  // From Phase 2a (Oct 2026) the Village Fields' brief comes before the Village Windmill's (D1).
  assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>later.status(k).text),['Build from the golden brief','After the Mine','After the Lumber Camp','After the Village Fields']);
  later.openBuilding('villagemill');assert.match(p.byId.get('building-content').innerHTML,/<strong>After the Village Fields<\/strong>/);
  // The Village market's sell list: only the way to the market square (it once read the farm's Valley Market link here and broke).
  assert.doesNotThrow(()=>economy.openMarket('village'));
  const outlook=p.byId.get('market-outlook');assert.equal(outlook.hidden,false);
  assert.equal(outlook.innerHTML,'<div class="market-board-link"><span>Villagers pay half again at the market square.</span><button type="button" id="market-square">Market square →</button></div>');
  assert.equal(p.byId.has('market-valley'),false);p.byId.get('market-square').onclick();assert.deepEqual(places,['villagemarket']);
 });
});

test('on the farm below level 100 the screens show nothing of World II, guided and legacy: no packed lunch to build towards, no bakes to sell',async()=>{
 for(const mode of ['guided','legacy'])await withPage(async p=>{
  const s=farm(99,{mode});Object.assign(s.inventory,{goldenloaf:3,heirloompie:2});s.buildings.kitchen.built=false;
  const economy=createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){}});
  economy.openBuilding('kitchen');assert.doesNotMatch(p.byId.get('building-content').innerHTML,/Packed lunch|Heirloom pie/,`${mode}: the Kitchen's Makes and recipes`);
  s.buildings.kitchen.built=true;economy.openBuilding('kitchen');assert.doesNotMatch(p.byId.get('building-content').innerHTML,/Packed lunch|Heirloom pie/,`${mode}: Coming later`);
  economy.openBuilding('bakery');assert.doesNotMatch(p.byId.get('building-content').innerHTML,/Golden loaf/,mode);
  economy.openMarket('goods');const market=p.byId.get('market-items').innerHTML+p.byId.get('market-outlook').innerHTML;
  assert.doesNotMatch(market,/Golden loaf|Heirloom pie|Packed lunch/,`${mode}: the Market's Goods tab and today's market`);assert.match(market,/Fresh bread/);
  economy.openBuildings();assert.doesNotMatch(p.byId.get('building-catalog').innerHTML,/data-open-square|Mine|Lumber Camp/,'the farm lists none of the village');
 });
});

test('the game opens the market square from the Village market\'s pin and lights it, and the Village button counts it',()=>{
 const game=read('public/game.js');
 assert.match(game,/villagemarket:\{name:'Market square',icon:'store',hint:'Villagers’ requests and golden briefs'\}/);
 assert.match(game,/if\(key==='villagemarket'\)\{villageSquare\?\.open\(\);return;\}/);
 assert.match(game,/\n if\(key==='villagemarket'\)return villageSquareReady\(state\)\?'ready':'';\n return economy\.placeReady\(key\)\?'ready':'';/,'its pin is yellow when there is something to do');
 assert.match(game,/economy\.status\(k\)\.kind==='ready'\)\.length\+\(villageBrief\(state\)\?\.ready\|\|villageLandmark\(state\)\?\.ready\?1:0\):0;/,'the Village button\'s count: ready batches and a brief or landmark to build, no pop-up');
 assert.doesNotMatch(game.match(/villageReady=[^\n]*/)[0],/villageSquareReady/,'a villager you could help never lights the Village button (10 Oct 2026)');
 assert.match(game,/villageSquare=createVillageSquareUI\(\{state,runAction,onChange:updateUI,notify:toast,itemList:economy\.itemList,onShow:showVillagePlace,onSell:\(\)=>economy\.openMarket\('village'\),refresh:\(\)=>client\.refresh\(\)\}\);/,'and a refusal for a villager who moved on loads the farm again');
 assert.match(game,/valley\?\.refresh\(\);villageSquare\?\.refresh\(\);/);
 assert.doesNotMatch(game,/harvestVillageMarket/,'the Market button sells; nothing else opened the sell list from the pin');
 assert.match(game,/if\(!adminView\)\{if\(villageWorld\)toast\('Welcome to the village! '\+\(briefWaits\(\)\?'A golden brief waits at the market square\.':'Your farm keeps growing while you are here\.'\)\);/);
 assert.match(game,/const briefWaits=\(\)=>\{const b=villageBrief\(state\);return Boolean\(b\?\.open\)&&\['mine','lumbercamp'\]\.includes\(b\.place\);\};/);
 // These actions wait for the server (farm-state.js decides the goods), like the Valley Market's.
 for(const type of ['village_deliver','village_skip','village_build','villager_now'])assert.ok(!read('public/farm-client.js').match(/INSTANT_ACTIONS=Object\.freeze\(new Set\(\[([^\]]+)\]/)[1].includes(`'${type}'`),type);
 const html=read('public/farm.html');
 // 18 Oct 2026: the window shell, the market square's picture beside its title and no small line above it.
 assert.match(html,/<dialog id="village-square-dialog" class="game-dialog wide-dialog is-sheet is-m" aria-labelledby="village-square-title"><div class="dialog-heading"><i class="dialog-badge" data-game-art="villagemarket" aria-hidden="true"><\/i><div class="dialog-titles"><h2 id="village-square-title">Market square<\/h2><\/div><button class="icon-button close-dialog" aria-label="Close">/);
 const tips=read('public/loading-screen.js');
 for(const tip of ['Villagers at the market square pay at least half again what their goods are worth.','Each golden brief at the market square builds the next village place or landmark.'])assert.ok(tips.includes(tip),tip);
});

test('the village journal lists the market square\'s quests with the others of their level, and pictures them with the market',async()=>{
 const {villageQuestGroups,questArt}=await import('../public/quests-ui.js');
 const {VILLAGE_QUESTS}=await import('../public/farm-state.js');
 const s=farm(104),active=villageQuestGroups(s).active;
 assert.deepEqual(active.map(x=>x.quest.minLevel),[...active.map(x=>x.quest.minLevel)].sort((a,b)=>a-b),'by the level they open');
 const friendly=active.findIndex(x=>x.quest.title==='A friendly face');
 assert.ok(friendly>0&&active[friendly-1].quest.minLevel===100&&active.at(-1).quest.minLevel===104,'with the level-100 quests, before those of 104');
 assert.ok(VILLAGE_QUESTS.findIndex(q=>q.title==='A friendly face')>26,'its place in the list (the claimed ids) does not move');
 assert.match(questArt('village_requests'),/villagemarket\.webp/);
});

test('two cards never read the same line, short lunches say where they are made, and helping with the brief\'s goods says so',()=>{
 // A farm past 104 with no village place built (as some farms are): three boards, all the market keeper, each with its own line.
 for(const [level,built] of [[112,[]],[104,['mine','lumbercamp']],[130,['mine','lumbercamp','smithy','villagemill']]])for(let round=0;round<30;round++){
  const s=farm(level,{built});s.village={serial:round*7,boards:[]};normalizeFarm(s,now);
  const shown=cards(squareMarkup(s,itemList,now)).filter(c=>/village-request/.test(c)).map(c=>[c.match(/<h3>([^<]+)<\/h3>/)[1],c.match(/<p class="valley-line">([^<]+)<\/p>/)[1]]);
  assert.equal(shown.length,3);assert.equal(new Set(shown.map(x=>x.join('|'))).size,3,`${level} ${round}: ${JSON.stringify(shown)}`);
  for(const [name,line] of shown)assert.ok(VILLAGERS.find(v=>v.name===name).lines.includes(line));
 }
 const keeper=VILLAGERS[4].lines;assert.equal(keeper.length,VILLAGE_REQUEST_BOARDS_MAX,'a line for every board, the Lookout tower\'s fourth too');
 assert.deepEqual([0,1,2,3].map(n=>villagerLine({id:5,villager:4},keeper.filter((_,i)=>i<n).map((_,i)=>keeper[(5+i)%keeper.length]))),[1,2,3,0].map(i=>keeper[i]));
 // Level 100, no lunches yet: the brief and every request that asks lunches say where they are packed.
 const s=farm(100),lunch='<small class="square-note">Pack lunches in the Farm Kitchen.</small>';s.inventory.packedlunch=0;
 assert.ok(briefCard(s,itemList).includes(lunch));
 for(const card of cards(squareMarkup(s,itemList,now)).filter(c=>/village-request/.test(c)))assert.equal(card.includes(lunch),/data-item="packedlunch"/.test(card));
 assert.ok(s.village.boards.some(b=>b.request.input.packedlunch),'at level 100 the villagers ask lunches');
 // One Kitchen batch: the brief has its lunches; a villager who asks lunches can be helped, and says that leaves the brief short.
 s.inventory.packedlunch=6;assert.ok(!briefCard(s,itemList).includes(lunch));
 const i=s.village.boards.findIndex(b=>b.request.input.packedlunch),r=s.village.boards[i].request;
 for(const [k,n] of Object.entries(r.input))if(k!=='packedlunch')s.inventory[k]=n;
 s.inventory.packedlunch=Math.max(6,r.input.packedlunch);
 const note='<small class="square-note is-brief">Uses goods the golden brief needs.</small>',card=()=>cards(squareMarkup(s,itemList,now)).filter(c=>/village-request/.test(c))[i];
 assert.match(card(),/village-request is-ready/);assert.ok(card().includes(note));
 s.inventory.packedlunch=6+r.input.packedlunch;assert.ok(!card().includes(note),'enough for both: no note');
 s.buildings.mine.built=s.buildings.lumbercamp.built=true;s.inventory.packedlunch=r.input.packedlunch;assert.ok(!card().includes(note),'no brief asks lunches any more');
 assert.match(read('public/world-two.css'),/\.square-note\{display:block;margin:6px 0 0;font-size:12px;line-height:1\.4;color:#7a6c58\}/);
});

test('in the village an answer from the server never builds the farm\'s fields: a request, a build and a batch reach the screen',async()=>{
 // game.js's own expandVisuals (farm-client.js calls it after every answer): the village never loads the farm's models, so createPlots
 // there threw "Missing model: ground_004" and every reply ended in that error (a batch never even went out).
 const game=read('public/game.js'),code=game.match(/\nfunction expandVisuals\(\)\{[^\n]+\}\n/)[0];
 const visuals=(villageWorld,state)=>new Function('s',`let {ready,villageWorld,renderer,scenePolish,plots}=s;const createPlots=()=>{if(plots.length<s.state.plots.length)throw new Error('Missing model: ground_004');},measureFarm=()=>{},drawCrop=()=>{},resize=()=>{},icons=()=>{},shootMinimap=()=>{};${code}return expandVisuals;`)({ready:true,villageWorld,renderer:{shadowMap:{}},scenePolish:null,plots:[],state});
 const {createFarmClient}=await import('../public/farm-client.js'),{applyFarmAction}=await import('../public/farm-state.js');
 const s=farm(100,{built:['mine']}),saved=structuredClone(s),asked=s.village.boards[0].request.input;Object.assign(s.inventory,asked,{packedlunch:(asked.packedlunch??0)+20});Object.assign(saved.inventory,s.inventory);
 assert.throws(()=>visuals(false,s)(),/Missing model/,'on the farm it does build the fields (the farm has the models)');
 const errors=[],statuses=[],server=structuredClone(saved);
 globalThis.document={body:{classList:{add(){},remove(){}}},documentElement:{hasAttribute:()=>false}};
 globalThis.window={parent:{harvestBridge:{serverNow:Date.now(),request:async({action})=>{const result=applyFarmAction(server,action,now);return {state:structuredClone(server),serverNow:Date.now(),result};}}}};
 try{
  const expand=visuals(true,s),client=createFarmClient(s,{onChange:expand,onStatus:x=>statuses.push(x),onError:m=>errors.push(m)});await client.load();
  const r=s.village.boards[0].request,thanks=await client.runAction({type:'village_deliver',board:0,request:r.id,input:{...r.input}});
  assert.equal(thanks.coins,r.coins);assert.equal(s.coins,server.coins);
  const batch=await client.runAction({type:'produce',recipe:'digiron',count:1});await tick();await tick();
  assert.ok(batch,'the batch shows at once');assert.ok(server.buildings.mine.job||server.buildings.mine.jobs?.length,'and reaches the server');
  assert.deepEqual(errors,[]);assert.ok(!statuses.includes('error'));
 }finally{delete globalThis.window;delete globalThis.document;}
});

test('on a phone the village\'s count lights The Village in More and the More button',()=>{
 const mobile=read('public/mobile-ui.js');
 assert.match(mobile,/const villageTile=\$\('village-menu-entry'\);villageTile\?\.classList\.toggle\('has-dot',Boolean\(villageTile&&!villageTile\.hidden&&!\(\$\('village-count'\)\?\.hidden\?\?true\)\)\);/);
 assert.match(mobile,/const villageWaiting=mobileLayout\.matches&&Boolean\(villageTile\?\.classList\.contains\('has-dot'\)\);/);
 assert.match(mobile,/&&!villageWaiting&&!medalWaiting&&/);
 assert.match(read('public/mobile.css'),/\.side-tools #village-button\{display:none\}/,'why: the Village side tool is hidden on phones');
});

// World II, Phases 2a to 5 (Oct 2026): the screens of the village's later levels. ALL: every village place in the briefs' order; upto(L):
// the places that open by level L. economy(s): the village's Buildings window as game.js makes it there.
const ALL=VILLAGE_BRIEFS.map(b=>b.place),upto=level=>ALL.filter(k=>BUILDINGS[k].minLevel<=level);
const economyUI=(s,extra={})=>createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){},village:true,...extra});

test('the market week bar: from level 116, under the villagers, with its rule, its count and when the week ends',()=>{
 assert.deepEqual([VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS],[116,15,10],'the numbers on the screen');
 for(const mode of ['guided','legacy']){
  assert.doesNotMatch(squareMarkup(farm(115,{mode}),itemList,now),/Market week|market crate/,`${mode}: nothing below 116`);
  const s=farm(116,{mode});let html=squareMarkup(s,itemList,now);
  assert.match(html,/<h3 class="square-heading">Market week<\/h3><p class="square-rule">Help 15 villagers between Monday and Sunday and the market crate gives you 10 diamonds\.<\/p><div class="market-week "><span class="market-week-art">/);
  assert.match(html,/<strong>0 \/ 15 villagers this week<\/strong><span class="market-week-bar" role="progressbar" aria-label="Villagers helped this week" aria-valuemin="0" aria-valuemax="15" aria-valuenow="0"><i style="width:0%"><\/i><\/span><small>New week in 6d 12h\.<\/small>/,'Monday 12:00 UTC');
  assert.ok(html.indexOf('Market week')>html.indexOf('valley-stalls'),'under the villagers');
  assert.match(html,/id="square-sell">Sell goods →<\/button><\/div>$/,'the sell link stays last');assert.doesNotMatch(html,/ · /);
  s.village.week={week:familyWeek(now),helped:7,paid:false};assert.match(squareMarkup(s,itemList,now),/<strong>7 \/ 15 villagers this week<\/strong>[^]*aria-valuenow="7"><i style="width:47%">/);
  s.village.week={week:familyWeek(now),helped:15,paid:true};html=squareMarkup(s,itemList,now);
  assert.match(html,/<div class="market-week is-paid">[^]*<strong>The market crate is open: \+10 diamonds this week\.<\/strong>[^]*aria-valuenow="15"><i style="width:100%">/);
  s.village.week={week:familyWeek(now)-1,helped:15,paid:true};assert.match(squareMarkup(s,itemList,now),/0 \/ 15 villagers this week/,'last week\'s crate counts for nothing this week');
 }
 // Cream, the green of a bar and the diamond blue of buttons.css; no gold.
 const css=read('public/world-two.css');
 assert.match(css,/\.market-week-art\{[^}]*background:var\(--btn-diamond\)\}/);assert.match(css,/\.market-week\.is-paid \.market-week-bar>i\{background:var\(--btn-diamond-line\)\}/);assert.doesNotMatch(css,/var\(--btn-gold/);
});

test('from level 104 to 119 the square says villagers often ask for three kinds of goods from level 120',()=>{
 const note='<span>From level 120, villagers often ask for three kinds of goods.</span>';
 assert.ok(squareMarkup(farm(110),itemList,now).includes(`<p class="valley-footer">${note}</p>`));
 assert.ok(squareMarkup(farm(104),itemList,now).includes(note));
 for(const level of [100,103,120,140])assert.ok(!squareMarkup(farm(level),itemList,now).includes(note),level);
 assert.match(squareMarkup(farm(100),itemList,now),/<p class="valley-footer"><span>A third villager comes at level 104\.<\/span><\/p>/,'the third-villager line stays as it was');
});

test('the Help that opens the market crate says so; a built Canteen is named where lunches are short; the Fields and the Pier have their own build toast',async()=>{
 await withPage(async p=>{
  const s=farm(116),notes=[],calls=[];for(const b of s.village.boards)for(const [k,n] of Object.entries(b.request.input))s.inventory[k]=(s.inventory[k]??0)+n;
  let answer={villager:VILLAGERS[4].name,coins:6270,xp:84,crate:10};
  const ui=createVillageSquareUI({state:s,runAction:async action=>{calls.push(action);return answer;},onChange(){},notify:m=>notes.push(m),itemList});
  ui.open();const content=()=>p.byId.get('village-square-content');
  content().querySelectorAll('[data-village-deliver]')[0].onclick();await tick();
  assert.equal(notes.at(-1),`${VILLAGERS[4].name} thanks you! +6,270 coins and +84 XP. The market crate is open: +10 diamonds!`);
  answer={...answer,crate:0};content().querySelectorAll('[data-village-deliver]')[1].onclick();await tick();
  assert.equal(notes.at(-1),`${VILLAGERS[4].name} thanks you! +6,270 coins and +84 XP.`);
  // The Village Fields are one name in the plural; the Pier says where the boat waits.
  const fields=farm(110,{built:['mine','lumbercamp','smithy']}),said=[];
  createVillageSquareUI({state:fields,runAction:async()=>({place:'villagefields',name:'Village Fields',coins:150000,xp:250}),onChange(){},notify:m=>said.push(m),itemList}).open();
  content().querySelectorAll('[data-village-build]')[0].onclick();await tick();assert.equal(said.at(-1),'The Village Fields are built! +250 XP.');
  const pier=farm(144,{built:upto(143)});assert.equal(villageBrief(pier).place,'pier');
  createVillageSquareUI({state:pier,runAction:async()=>({place:'pier',name:'Pier',coins:400000,xp:250}),onChange(){},notify:m=>said.push(m),itemList}).open();
  content().querySelectorAll('[data-village-build]')[0].onclick();await tick();assert.equal(said.at(-1),'The Pier is built! +250 XP. The town boat waits at the pier.');
 });
 const lunch=farm(100,{built:['canteen']});lunch.inventory.packedlunch=0;
 assert.ok(briefCard(lunch,itemList).includes('<small class="square-note">Pack lunches in the Farm Kitchen or bake them in the Miners’ Canteen.</small>'));
 assert.ok(briefCard(farm(100),itemList).includes('<small class="square-note">Pack lunches in the Farm Kitchen.</small>'));
});

test('the Village Fields say how they sow and open the farm\'s Windmill right there; the Canteen says what it bakes',async()=>{
 await withPage(async p=>{
  const s=farm(113,{built:['mine','lumbercamp','smithy','villagefields','villagemill','canteen']});s.inventory.fertilizer=1;
  const economy=economyUI(s);economy.openBuilding('villagefields');const html=p.byId.get('building-content').innerHTML;
  assert.match(html,/<p class="milling-note">Sow with natural fertilizer and coins, harvest when ripe\. Village crops sell only at the Village market\.<\/p><div class="market-board-link village-fertilizer"><span>[^]*1 natural fertilizer in storage\. Make more at the farm’s Windmill\.<\/span><button type="button" id="open-windmill">Farm Windmill →<\/button><\/div>/);
  assert.match(html,/<span>120 coins<\/span>/,'the sow card says its coins, once, among the ingredients');
  assert.doesNotMatch(html,/Costs 120 coins/,'not a second time in its header, which shows the profit like every recipe (10 Oct 2026)');
  p.byId.get('open-windmill').onclick();assert.match(p.byId.get('building-content').innerHTML,/Mix natural fertilizer/,'the farm\'s Windmill, in the village');
  economy.openBuilding('canteen');assert.match(p.byId.get('building-content').innerHTML,/<p class="milling-note">Pasty lunches are packed lunches baked without apples\.<\/p>/);
  const css=read('public/world-two.css');assert.match(css,/#building-content \.village-fertilizer\{margin:0 0 14px\}/);
 });
});

test('a farm building\'s card offers builder\'s crates only from level 100 and only with crates, with its rule; Use crates sends what it showed',async()=>{
 await withPage(async p=>{
  const make=(level,{mode='guided',crates=30,coins=1000000,dairy=6}={})=>{const s=farm(level,{mode});s.coins=coins;s.buildings.dairy.level=dairy;s.inventory.milk=24;s.inventory.builderscrate=crates;return s;};
  const rule='<small class="upgrade-rule">Each builder’s crate takes 8,000 coins off a farm building upgrade, up to half the price.</small>';
  for(const mode of ['guided','legacy']){
   const s=make(128,{mode}),calls=[],notes=[];
   const economy=createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify:m=>notes.push(m),runAction:async action=>{calls.push(action);return {building:'dairy',level:7,cost:22973,currency:'coins',materials:{milk:24},crates:action.crates??0};},onEstate(){},onFamily(){},onPlace(){}});
   economy.openBuilding('dairy');const html=p.byId.get('building-content').innerHTML;
   assert.match(html,/<b>38,973<\/b>[^]*<div class="upgrade-option is-crates"><div class="upgrade-cost"><span class="upgrade-price">[^]*<b>22,973<\/b>/,mode);
   assert.ok(html.includes('30/2 Builder’s crate'));assert.ok(html.includes('aria-label="Upgrade with 2 builder’s crates">Use crates</button>'));assert.ok(html.includes(rule));
   p.byId.get('upgrade-building-crates').onclick();await tick();await tick();
   assert.deepEqual(calls.at(-1),{type:'upgrade',building:'dairy',crates:2});assert.equal(notes.at(-1),'Dairy Barn upgraded to level 7 with 2 builder’s crates.');
   p.byId.get('upgrade-building').onclick();await tick();await tick();assert.deepEqual(calls.at(-1),{type:'upgrade',building:'dairy'},'Upgrade stays coins only');
  }
  // No second row and no rule: no crates, a cheap upgrade, the Factory, a step past level 10, below level 100.
  const none=(s,key)=>{createEconomyUI({state:s,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){}}).openBuilding(key);const html=p.byId.get('building-content').innerHTML;return !html.includes('is-crates')&&!html.includes('upgrade-rule');};
  assert.ok(none(make(128,{crates:0}),'dairy'),'no crates');assert.ok(none(make(128,{dairy:4}),'dairy'),'4 to 5 costs 5,346: no crate fits in half');
  const factory=make(128);factory.buildings.factory.level=5;assert.ok(none(factory,'factory'),'the Factory');
  const master=make(128);master.buildings.bakery.level=10;assert.ok(none(master,'bakery'),'a master step');
  for(const mode of ['guided','legacy'])assert.ok(none(make(99,{mode}),'dairy'),`${mode}: below level 100`);
  // Short of coins: what row 2 still needs, and its button waits.
  const poor=make(128,{coins:20000});createEconomyUI({state:poor,onChange(){},onCrop(){},onExpand(){},notify(){},runAction:async()=>({}),onEstate(){},onFamily(){},onPlace(){}}).openBuilding('dairy');
  assert.match(p.byId.get('building-content').innerHTML,/<button id="upgrade-building-crates" class="small-button" disabled aria-label="Upgrade with 2 builder’s crates">Use crates<\/button><small class="shortfall">Still needed: 2,973 coins\.<\/small>/);
  assert.match(read('public/production-controls.css'),/\.upgrade-payments>\.upgrade-rule\{text-align:start\}/);
 });
});

test('village places say what their upgrades take; the Lumber Camp says what crates are for from level 128',async()=>{
 await withPage(async p=>{
  const built=['mine','lumbercamp','smithy','villagefields','villagemill','canteen','kiln','linenloft'],s=farm(128,{built});s.buildings.linenloft.level=5;
  const economy=economyUI(s);economy.openBuilding('linenloft');const html=p.byId.get('building-content').innerHTML;
  assert.ok(html.includes('<small class="upgrade-rule">Village places upgrade with planks and stone; the places from level 125 on take roof tiles too.</small>'));
  assert.match(html,/Roof tile/);assert.doesNotMatch(html,/is-crates/,'a village place takes no crates');
  const note='<p class="milling-note crate-note">Each builder’s crate takes 8,000 coins off a farm building upgrade, up to half the price.</p>';
  economy.openBuilding('lumbercamp');assert.ok(p.byId.get('building-content').innerHTML.includes(note),'at 128');
  economyUI(farm(127,{built})).openBuilding('lumbercamp');assert.ok(!p.byId.get('building-content').innerHTML.includes(note),'not at 127');
 });
});

test('the town boat\'s window: its rule, a row per good with Load, Load all you can, and Turn this cargo down until something is loaded',()=>{
 for(const mode of ['guided','legacy']){
  const s=farm(150,{mode,built:upto(150)}),c=s.village.boat.cargo;assert.deepEqual([c.id,c.input,c.coins,c.xp],[1,{linen:39,scentedsachet:32,silverbar:7},87700,1370],mode);
  let html=boatMarkup(s,now);
  assert.match(html,/^<p class="estate-lead valley-lead"><span class="estate-icon">[^]*<\/span><span>Load the boat bit by bit\. A full boat sails at once and pays 1\.6 times what its goods are worth, plus 3 diamonds\. It is back 12 hours later\. Diamonds come with the first 14 trips each week\.<\/span><\/p>/);
  assert.deepEqual([...html.matchAll(/data-boat-load="([a-z]+)"/g)].map(m=>m[1]),['silverbar','linen','scentedsachet'],'in the village goods\' order');
  assert.equal([...html.matchAll(/data-boat-load="[a-z]+" disabled>Load<\/button>/g)].length,3,'nothing in the barn');assert.match(html,/data-boat-all disabled>Load all you can</);
  assert.match(html,/data-boat-skip>Turn this cargo down</);assert.ok(html.includes(`>+${villageRequestExtra(s,c,now)}% vs market</b>`));
  assert.ok(html.includes(`<q>${SKIPPER_LINES[0]}</q> <span class="brief-from">The skipper</span>`));
  assert.match(html,/87,700<\/b><b class="is-diamonds">[^]*3<\/b><b class="is-xp">[^]*1,370 XP<\/b>/);assert.doesNotMatch(html,/ · /);
  // A part load: no more turning it down, and the count.
  s.inventory.linen=10;applyFarmAction(s,{type:'boat_load',cargo:1,input:{...c.input},item:'linen'},now);html=boatMarkup(s,now);
  assert.doesNotMatch(html,/data-boat-skip/);assert.match(html,/<span>10 \/ 78 loaded<\/span>/);assert.match(html,/<li class="">[^]*Linen<\/strong><small>0 in your barn<\/small><\/span><b>10\/39<\/b>/);
  // The week's diamond trips have sailed: this boat brings no diamond chip.
  s.village.boat.week=familyWeek(now);s.village.boat.paid=14;assert.doesNotMatch(boatMarkup(s,now),/is-diamonds/);s.village.boat.paid=13;assert.match(boatMarkup(s,now),/is-diamonds/);
  // It sails: the waiting card, the time it is back and the boats sent.
  Object.assign(s.inventory,{linen:29,scentedsachet:32,silverbar:7});applyFarmAction(s,{type:'boat_load',cargo:1,input:{...c.input}},now);html=boatMarkup(s,now);
  assert.match(html,/<h3>Waiting for the boat<\/h3>[^]*<p class="valley-next">The boat is back in <b>12h<\/b>\.<\/p>/);assert.match(html,/<p class="valley-footer">1 boat sent so far\.<\/p>$/);
  s.village.landmarks={done:['windpump','longhouse','stonequay'],given:{}};assert.match(boatMarkup(s,now),/It is back 6 hours later\./,'with the Stone quay');
 }
});

test('the Pier\'s line: ready to sail only when one Load all sails it; unbuilt it is a village place like the others',async()=>{await withPage(async()=>{
 const s=farm(150,{built:upto(150)}),economy=economyUI(s);
 assert.deepEqual(boatStatus(s,now),{text:'0 / 78 loaded',kind:'working'});
 Object.assign(s.inventory,{linen:39,scentedsachet:32,silverbar:6});assert.equal(boatStatus(s,now).kind,'working','one silver bar short');
 s.inventory.silverbar=7;assert.deepEqual(boatStatus(s,now),{text:'Ready to sail',kind:'ready'});
 const status=economy.status('pier');assert.deepEqual([status.text,status.kind],['Ready to sail','ready']);
 s.village.boat.cargo=null;s.village.boat.readyAt=now+BOAT_RETURN;assert.deepEqual(boatStatus(s,now),{text:'Back in 12h',kind:'working'});
 s.village.boat.readyAt=0;assert.deepEqual(boatStatus(s,now),{text:'Waiting for the boat',kind:'idle'});
 assert.equal(economyUI(farm(144,{built:upto(143)})).status('pier').text,'Build from the golden brief');
 assert.equal(economyUI(farm(144,{built:upto(134)})).status('pier').text,'After the Soap Maker');
 assert.equal(economyUI(farm(143,{built:upto(143)})).status('pier').text,'Locked · Reach level 144.');
});});

test('Load, Load all you can and Turn this cargo down send the cargo the screen showed; a changed cargo loads the farm again',async()=>{
 await withPage(async p=>{
  const s=farm(150,{built:upto(150)}),calls=[],notes=[];s.inventory.linen=10;const shown=structuredClone(s.village.boat.cargo.input);
  const answers=[{loaded:{linen:10},units:10,sailed:false},{loaded:{},units:78,sailed:true,coins:87700,xp:1370,diamonds:3,readyAt:now+BOAT_RETURN},{loaded:{},units:68,sailed:true,coins:87700,xp:1370,diamonds:0,readyAt:now+BOAT_RETURN},{readyAt:now+BOAT_RETURN}];
  const ui=createBoatUI({state:s,runAction:async action=>{calls.push(structuredClone(action));return answers[calls.length-1];},onChange(){},notify:m=>notes.push(m),refresh:async()=>{}});
  ui.open();const dialog=p.byId.get('boat-dialog'),content=()=>p.byId.get('boat-content');assert.equal(dialog.open,true);
  // The server's farm can hold another cargo under the same number (a level-up in between): the screen sends what it showed.
  s.village.boat.cargo.input={linen:40,scentedsachet:32,silverbar:7};
  content().querySelectorAll('[data-boat-load]').find(b=>b.dataset.boatLoad==='linen').onclick();await tick();
  assert.deepEqual(calls[0],{type:'boat_load',cargo:1,input:shown,item:'linen'});assert.equal(notes[0],'Loaded 10 goods onto the boat.');
  s.village.boat.cargo.input=structuredClone(shown);ui.open();
  content().querySelectorAll('[data-boat-all]')[0].onclick();await tick();
  assert.deepEqual(calls[1],{type:'boat_load',cargo:1,input:shown});assert.equal(notes[1],'The boat sails for town! +87,700 coins and +1,370 XP. The trip also brings +3 diamonds.','no comma after a reward chip');
  content().querySelectorAll('[data-boat-all]')[0].onclick();await tick();assert.equal(notes[2],'The boat sails for town! +87,700 coins and +1,370 XP.','past the week\'s diamond trips');
  content().querySelectorAll('[data-boat-skip]')[0].onclick();await tick();
  assert.deepEqual(calls[3],{type:'boat_skip',cargo:1,input:shown});assert.equal(notes[3],'Cargo turned down. The boat is back in 12h.');
  // A refusal for a cargo the server no longer has loads the farm again, once; any other refusal does not.
  let loads=0;const gone=createBoatUI({state:s,runAction:async()=>{throw new Error(BOAT_GONE);},onChange(){},notify:m=>notes.push(m),refresh:async()=>{loads++;}});
  gone.open();content().querySelectorAll('[data-boat-all]')[0].onclick();await tick();await tick();assert.equal(notes.at(-1),BOAT_GONE);assert.equal(loads,1);
  const other=createBoatUI({state:s,runAction:async()=>{throw new Error('You have none of the goods the boat still needs.');},onChange(){},notify(){},refresh:async()=>{loads++;}});
  other.open();content().querySelectorAll('[data-boat-all]')[0].onclick();await tick();await tick();assert.equal(loads,1);
 });
 const said=[];createBoatUI({state:farm(99),runAction:async()=>{},onChange(){},notify:m=>said.push(m)}).open();
 createBoatUI({state:farm(150,{built:upto(143)}),runAction:async()=>{},onChange(){},notify:m=>said.push(m)}).open();
 assert.deepEqual(said,['Reach level 100 to trade in the village.','Build the Pier first.']);
});

test('in the village the Pier opens the town boat, and a Pier built from its own window opens it too',async()=>{
 await withPage(async p=>{
  const s=farm(150,{built:upto(150)}),boats=[];const economy=economyUI(s,{onBoat:()=>boats.push(1)});
  economy.openBuilding('pier');assert.deepEqual(boats,[1]);assert.equal(p.byId.get('building-dialog').open,false);
  economy.openBuildings();const card=p.byId.get('building-catalog').innerHTML.match(/<button class="building-card" data-open-building="pier">[^]*?<\/button>/)[0];
  assert.doesNotMatch(card,/building-level-chip/,'no levels');assert.match(card,/<span class="building-status working" data-building-status="pier">0 \/ 78 loaded<\/span>/);
  // Not built yet: its golden brief in its window, with what it is for.
  const t=farm(144,{built:upto(143)}),notes=[],later=economyUI(t,{onBoat:()=>boats.push(2),notify:m=>notes.push(m),runAction:async()=>({place:'pier',name:'Pier',coins:400000,xp:250})});
  later.openBuilding('pier');const html=p.byId.get('building-content').innerHTML;
  // 18 Oct 2026: what it is for is the line under its name in the window's heading (the window shell).
  assert.equal(p.byId.get('building-sub').textContent,'Not built yet · For the town boat');assert.match(html,/The town boat calls here once the pier is mended\./);assert.match(html,/data-village-build="pier"/);assert.doesNotMatch(html,/id="construct-building"/);
  t.buildings.pier.built=true;p.byId.get('building-content').querySelector('[data-village-build]');
  later.renderBuilding();assert.deepEqual(boats,[1,2],'built from there: the boat opens');assert.equal(p.byId.get('building-dialog').open,false);
 });
});

test('the game opens the town boat from the Pier, counts a boat ready to sail once, and rings the Hall bell only in the village',()=>{
 const game=read('public/game.js');
 assert.match(game,/import \{ createBoatUI \} from '\.\/boat-ui\.js';/);
 assert.match(game,/if\(BUILDINGS\[key\]\.type==='pier'\|\|economy\.status\(key\)\.kind!=='ready'\)\{economy\.openBuilding\(key\);return;\}/);
 assert.match(game,/onBoat:\(\)=>boat\?\.open\(\)/);
 assert.match(game,/boat=createBoatUI\(\{state,runAction,onChange:updateUI,notify:toast,refresh:\(\)=>client\.refresh\(\)\}\);/);
 assert.match(game,/villageSquare\?\.refresh\(\);boat\?\.refresh\(\);/);
 assert.match(game,/\$\{status\.kind==='ready'&&BUILDINGS\[key\]\.type!=='pier'\?'Collect from':'Open'\} \$\{BUILDINGS\[key\]\.name\}/);
 assert.match(game,/economy\.status\(k\)\.kind==='ready'\)\.length\+\(villageBrief\(state\)\?\.ready\|\|villageLandmark\(state\)\?\.ready\?1:0\):0;/,'the Pier counts through its status, once');
 const arrivals=game.match(/\nfunction villageArrivals\(now\)\{\n([^]*?)\n\}\n/)[1];
 assert.match(arrivals,/^ if\(!villageWorld\)return;/);assert.doesNotMatch(arrivals,/toast\(/);
 assert.match(arrivals,/if\(hallSerial!==null&&serial>hallSerial&&landmarkDone\(state,'greathall'\)\)farmAudio\.play\('bell'\);hallSerial=serial;/);
 assert.match(game,/syncVillageExtras\(\);villageArrivals\(now\);icons\(\);/,'in the 500 ms tick');
 const instant=read('public/farm-client.js').match(/INSTANT_ACTIONS=Object\.freeze\(new Set\(\[([^\]]+)\]/)[1];
 for(const type of ['boat_load','boat_skip','landmark_give','landmark_finish','boat_now','landmark_supplies','village_cart','lake_casts'])assert.ok(!instant.includes(`'${type}'`),`${type} waits for the server`);
 // 18 Oct 2026: the window shell, the pier's picture beside the title and no small line above it.
 assert.match(read('public/farm.html'),/<dialog id="boat-dialog" class="game-dialog wide-dialog is-sheet is-m" aria-labelledby="boat-title"><div class="dialog-heading"><i class="dialog-badge" data-game-art="pier" aria-hidden="true"><\/i><div class="dialog-titles"><h2 id="boat-title">Town boat<\/h2><\/div><button class="icon-button close-dialog" aria-label="Close"><i data-lucide="x"><\/i><\/button><\/div><div id="boat-content"><\/div><\/dialog>/);
 for(const file of ['public/village-square-ui.js','public/economy-ui.js'])assert.ok(read(file).includes("' The town boat waits at the pier.'"),file);
 // The boat's list is the Trade Depot's (one set of cream values, retention.css), and so is a landmark's.
 const css=read('public/retention.css');assert.match(css,/#estate-place-content \.depot-load li,#boat-content \.depot-load li,#village-square-content \.village-landmark \.depot-load li\{/);assert.match(css,/#village-square-content \.order-card,#boat-content \.order-card\{/);
});

test('the landmark card: the villager\'s line, what it builds, a row per good, Give, Give all you can, then Finish',()=>{
 for(const mode of ['guided','legacy']){
  const s=farm(160,{mode,built:ALL});let html=squareMarkup(s,itemList,now);
  assert.match(html,/^<h3 class="square-heading">Golden brief<\/h3><p class="square-rule">Bring the goods bit by bit, then pay to finish\. The bonus lasts for good\.<\/p><article class="order-card village-brief village-landmark ">/,mode);
  let card=briefCard(s,itemList);
  assert.match(card,/<small>LANDMARK 1 OF 5<\/small><h3>Water for the fields<\/h3><p class="valley-line"><q>A wind pump by the fields, and every row grows faster\.<\/q> <span class="brief-from">The field hand<\/span>/);
  assert.ok(card.includes('<b>Builds the Wind pump</b> Village Fields batches take 25% less time.'));
  assert.equal([...card.matchAll(/data-landmark-give="windpump" data-item="[a-z]+" disabled>Give<\/button>/g)].length,3);
  assert.match(card,/<small class="shortfall">Opens at level 165\. You are level 160\.<\/small>/);assert.doesNotMatch(card,/data-village-show/,'nothing to show in the village before its level');
  assert.match(card,/5,000 XP<\/b>/);assert.doesNotMatch(card,/is-diamonds/);assert.doesNotMatch(html,/ · |builders are drawing/);
  const t=farm(165,{mode,built:ALL});Object.assign(t.inventory,{rooftile:250,plank:300,ironbar:100});card=briefCard(t,itemList);
  assert.deepEqual([...card.matchAll(/data-item="([a-z]+)" >Give ([\d,]+)<\/button>/g)].map(m=>[m[1],m[2]]),[['rooftile','250'],['plank','300'],['ironbar','60']]);
  assert.match(card,/data-landmark-all="windpump" >Give all you can</);assert.match(card,/data-village-show="windpump">Show me</);
  t.village.landmarks.given={rooftile:600,plank:300,ironbar:60};t.coins=1000000;card=briefCard(t,itemList);
  assert.match(card,/data-landmark-finish="windpump" disabled>Finish for 1,500,000 coins<\/button>/);assert.match(card,/<small class="shortfall">Still needed: 500,000 coins\.<\/small>/);
  t.coins=1600000;card=briefCard(t,itemList);assert.match(card,/village-landmark is-ready/);assert.match(card,/data-landmark-finish="windpump" >Finish/);
  assert.deepEqual(squareStatus(t,now),{text:'Landmark ready to finish',kind:'ready'});
  const hall=farm(200,{mode,built:ALL});hall.village.landmarks={done:['windpump','longhouse','stonequay','lookout'],given:{}};
  assert.match(briefCard(hall,itemList),/<small>LANDMARK 5 OF 5<\/small><h3>The heart of the village<\/h3>[^]*<b class="is-diamonds">[^]*500<\/b>/);
 }
});

test('after the Great Hall: 1.6 times on the square and at the Village market, and the brief slot says everything is built',async()=>{
 const s=farm(200,{built:ALL});s.village.landmarks={done:Object.keys(VILLAGE_LANDMARKS),given:{}};normalizeFarm(s,now);
 const html=squareMarkup(s,itemList,now);
 assert.match(html,/^<h3 class="square-heading">Golden brief<\/h3><article class="order-card village-brief is-waiting">[^]*<h3>Every place and landmark in the village is built\.<\/h3>/,'no rule line over it');
 assert.ok(html.includes('<p class="square-rule">Villagers pay 1.6 times what their goods are worth. A new villager comes 3 hours after you help or say no.</p>'));
 assert.equal(cards(html).filter(c=>/village-request/.test(c)).length,4,'the Lookout tower\'s fourth villager');assert.doesNotMatch(html,/builders are drawing/);
 await withPage(async p=>{
  economyUI(s).openMarket('village');assert.equal(p.byId.get('market-outlook').innerHTML,'<div class="market-board-link"><span>Villagers pay 1.6 times at the market square.</span><button type="button" id="market-square">Market square →</button></div>');
  const before=farm(200,{built:ALL});economyUI(before).openMarket('village');assert.match(p.byId.get('market-outlook').innerHTML,/Villagers pay half again at the market square\./);
 });
});

test('Give, Give all you can and Finish send what the screen shows; Show me finds the landmark',async()=>{
 await withPage(async p=>{
  const s=farm(165,{built:ALL}),calls=[],notes=[],shown=[];Object.assign(s.inventory,{rooftile:250,plank:300,ironbar:100});
  const answers={landmark_give:{handed:{rooftile:250},units:250,ready:false},landmark_finish:{landmark:'windpump',name:'Wind pump',coins:1500000,xp:5000,diamonds:0}};
  const ui=createVillageSquareUI({state:s,runAction:async action=>{calls.push(structuredClone(action));return answers[action.type];},onChange(){},notify:m=>notes.push(m),itemList,onShow:key=>shown.push(key)});
  ui.open();const content=()=>p.byId.get('village-square-content');
  content().querySelectorAll('[data-landmark-give]')[0].onclick();await tick();
  assert.deepEqual(calls[0],{type:'landmark_give',landmark:'windpump',item:'rooftile'});assert.equal(notes[0],'Handed in 250 goods.');
  answers.landmark_give={handed:{plank:300,ironbar:60},units:360,ready:true};content().querySelectorAll('[data-landmark-all]')[0].onclick();await tick();
  assert.deepEqual(calls[1],{type:'landmark_give',landmark:'windpump'});assert.equal(notes[1],'Everything is handed in. Pay the coins to finish it.');
  s.village.landmarks.given={rooftile:600,plank:300,ironbar:60};s.coins=1600000;ui.open();
  content().querySelectorAll('[data-landmark-finish]')[0].onclick();await tick();
  assert.deepEqual(calls[2],{type:'landmark_finish',landmark:'windpump'});assert.equal(notes[2],'The Wind pump is finished! +5,000 XP.');
  answers.landmark_finish={landmark:'greathall',name:'Great Hall',coins:3000000,xp:5000,diamonds:500};content().querySelectorAll('[data-landmark-finish]')[0].onclick();await tick();
  assert.equal(notes[3],'The Great Hall is finished! +5,000 XP and +500 diamonds.');
  content().querySelectorAll('[data-village-show]')[0].onclick();assert.deepEqual(shown,['windpump']);
 });
});

test('Coming up and the level-up card call a landmark a landmark; the Bonuses tab shows the two speed landmarks once finished',async()=>{
 const progression=read('public/progression-ui.js');
 assert.match(progression,/if\(e\.kind==='Landmark'\)return 'Landmark · built from a golden brief at the market square';/);assert.match(progression,/Landmark:'Village landmark'/);
 const {unlockEntries}=await import('../public/farm-state.js');
 assert.deepEqual(unlockEntries(farm(164,{built:ALL})).filter(e=>e.kind==='Landmark'&&!e.unlocked).map(e=>e.id),Object.keys(VILLAGE_LANDMARKS).map(k=>`landmark:${k}`));
 const {bonusOverview}=await import('../public/bonus-overview.js');
 const rows=s=>bonusOverview(s,now).groups.find(g=>g.id==='production')?.rows??[];
 const s=farm(200,{built:ALL});assert.ok(!rows(s).some(r=>['windpump','longhouse'].includes(r.id)),'none before they are finished');
 s.village.landmarks={done:['windpump','longhouse'],given:{}};
 assert.deepEqual(rows(s).filter(r=>['windpump','longhouse'].includes(r.id)).map(r=>[r.id,r.name,r.sub,r.value]),[['windpump','Wind pump','Village Fields','−25%'],['longhouse','Longhouse','Every village place','−10%']]);
 assert.ok(!JSON.stringify(bonusOverview(farm(99),now)).includes('landmark'),'nothing of them below level 100');
});

test('the village\'s loading tips name the levels the rules open them at, and say "at least half again"',()=>{
 const tips=read('public/loading-screen.js');
 for(const tip of [`From level ${BUILDING_LEVELS.villagefields}, the Village Fields grow potatoes from natural fertilizer and coins, with no field on the farm.`,
  `From level ${BUILDING_LEVELS.canteen}, the Miners’ Canteen bakes packed lunches without apples.`,
  `From level ${VILLAGE_WEEK_LEVEL}, help ${VILLAGE_WEEK_TARGET} villagers in a week and the market crate gives you ${VILLAGE_CRATE_DIAMONDS} diamonds.`,
  `From level ${RECIPE_LEVELS.builderscrate}, builder’s crates from the Lumber Camp take coins off your farm building upgrades.`,
  `From level ${BUILDING_LEVELS.pier}, mend the old pier and the town boat buys your finest village goods.`,
  `From level ${VILLAGE_LANDMARKS.windpump.level}, the golden brief builds landmarks, and each one’s bonus lasts for good.`])assert.ok(tips.includes(`'${tip}'`),tip);
 assert.doesNotMatch(tips,/The builders are drawing/);
});
