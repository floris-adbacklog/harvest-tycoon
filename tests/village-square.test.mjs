import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFarm,normalizeFarm,xpForLevel,worldTwoBuilding,villageRequestGoods,villageRequestExtra,villagerLine,villageBrief,VILLAGERS,VILLAGER_GONE,VILLAGE_REQUEST_WAIT,VILLAGE_REQUEST_BOARDS_MAX,ITEMS} from '../public/farm-state.js';
import {briefCard,squareMarkup,squareStatus,createVillageSquareUI} from '../public/village-square-ui.js';
import {createEconomyUI} from '../public/economy-ui.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// World II's market square (Oct 2026, public/village-square-ui.js): the Village market's pin opens it. Its screen is drawn from the rules
// (game/farm-state.js), so these run the real rules on farms as players have them at that level, guided and legacy.
const now=Date.parse('2026-10-05T12:00:00Z');
function farm(level,{mode='guided',built=[]}={}){
 const s=createFarm(now);if(mode==='legacy')s.progression={mode:'legacy'};
 s.xp=xpForLevel(level);s.coins=400000;s.onboarding={...s.onboarding,completed:99,rewardClaimed:true};
 for(const [k,b] of Object.entries(s.buildings))if(!worldTwoBuilding(k)||built.includes(k))b.built=true;
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
  return [...html.matchAll(new RegExp(`<[a-z]+[^>]*\\s${attr}(?:="[^"]*")?[^>]*>`,'g'))].map(([tag])=>({tag,disabled:/\sdisabled[\s>]/.test(tag),onclick:null,addEventListener(type,fn){this.onclick=fn;},
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
 assert.match(briefCard(farm(112,{built:['mine','lumbercamp','smithy','villagemill']}),itemList),/village-brief is-waiting[^]*The builders are drawing the next plans\./);
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
 const t=farm(104);html=squareMarkup(t,itemList,now);assert.equal(VILLAGE_REQUEST_BOARDS_MAX,3);
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
  assert.deepEqual(['mine','lumbercamp','smithy','villagemill'].map(k=>later.status(k).text),['Build from the golden brief','After the Mine','After the Lumber Camp','After the Smithy']);
  later.openBuilding('villagemill');assert.match(p.byId.get('building-content').innerHTML,/<strong>After the Smithy<\/strong>/);
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
 assert.match(game,/economy\.status\(k\)\.kind==='ready'\)\.length\+\(villageSquareReady\(state\)\?1:0\):0;/,'the Village button\'s count, no pop-up');
 assert.match(game,/villageSquare=createVillageSquareUI\(\{state,runAction,onChange:updateUI,notify:toast,itemList:economy\.itemList,onShow:showVillagePlace,onSell:\(\)=>economy\.openMarket\('village'\),refresh:\(\)=>client\.refresh\(\)\}\);/,'and a refusal for a villager who moved on loads the farm again');
 assert.match(game,/valley\?\.refresh\(\);villageSquare\?\.refresh\(\);/);
 assert.doesNotMatch(game,/harvestVillageMarket/,'the Market button sells; nothing else opened the sell list from the pin');
 assert.match(game,/if\(!adminView\)\{if\(villageWorld\)toast\('Welcome to the village! '\+\(briefWaits\(\)\?'A golden brief waits at the market square\.':'Your farm keeps growing while you are here\.'\)\);/);
 assert.match(game,/const briefWaits=\(\)=>\{const b=villageBrief\(state\);return Boolean\(b\?\.open\)&&\['mine','lumbercamp'\]\.includes\(b\.place\);\};/);
 // These actions wait for the server (farm-state.js decides the goods), like the Valley Market's.
 for(const type of ['village_deliver','village_skip','village_build'])assert.ok(!read('public/farm-client.js').match(/INSTANT_ACTIONS=Object\.freeze\(new Set\(\[([^\]]+)\]/)[1].includes(`'${type}'`),type);
 const html=read('public/farm.html');
 assert.match(html,/<dialog id="village-square-dialog" class="game-dialog wide-dialog" aria-labelledby="village-square-title"><div class="dialog-heading"><div><span class="eyebrow">THE HEART OF THE VILLAGE<\/span><h2 id="village-square-title">Market square<\/h2><\/div><button class="icon-button close-dialog" aria-label="Close">/);
 const tips=read('public/loading-screen.js');
 for(const tip of ['Villagers at the market square pay half again what their goods are worth.','Each golden brief at the market square builds the next village place.'])assert.ok(tips.includes(tip),tip);
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
 assert.deepEqual([0,1,2].map(n=>villagerLine({id:4,villager:4},VILLAGERS[4].lines.filter((_,i)=>i<n).map((_,i)=>VILLAGERS[4].lines[(4+i)%3]))),[VILLAGERS[4].lines[1],VILLAGERS[4].lines[2],VILLAGERS[4].lines[0]]);
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
