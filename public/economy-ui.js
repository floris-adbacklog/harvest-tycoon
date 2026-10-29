import {foldLocked} from './progression-ui.js';
import {shipBinItem,harbourWorkDone,shipBinRoom,shipBinCount,SHIP_BIN_BONUS,caredDuration,storedCount,warehouseCapacity,warehouseFull,warehouseNearFull,seasonCrop,seasonCropOpen,seasonSeedsOf,SEASON_CROPS,villageGood,recipeLevel,lakeOpen,lakeCasts,POND_MAX_CASTS,labCanCross,doubleBatchChance,worldTwoBuilding,builderCrates,BUILDER_CRATE_COINS,VILLAGE_TILES_FROM,VILLAGE_PREMIUM,VILLAGE_HALL_PREMIUM,villagePremium,buildingRecipes,marketItems,villageBrief,villagePlaceBefore,VALLEY_PROJECTS,valleyProjectLevel,ENDGAME_PLACES,endgameInSight,sellableStock,keptStock,rookieLeft,marketPay,firstSaleDouble,vipActive,buildingCost,constructionNeeds,recipeUnlocked,recipeUnlockHint,guidedFarm,buildingEligible,buildingUnlockHint,BUILDING_LEVELS,cropUnlockHint,featureUnlocked,CROPS,ITEMS,BUILDINGS,RECIPES,MAX_PLOTS,recipeAvailability,upgradeCost,expansionCost,expansionLevel,seedCost,formatDuration,cropDuration,batchDuration,quickFirstBatch,FIRST_BATCH_MS,productionSpeed,MAX_BUILDING_LEVEL,upgradeRequirements,expansionMaterials,productionSlots,buildingSlots,farmhandActive,farmhandWorks,productionJobs,recipeValue,recipeFor,jobName,marketQuote,marketHighlights,utcDay,levelOf,cropUnlocked,buildingUnlocked,FEATURE_LEVELS,FEATURE_NAMES,RANCH_HERDS,ranchSpeedup,IMPROVEMENTS,hasImprovement,normalizeFarm} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {rookieTimeLeft} from './rookie-ui.js';
import {art,refreshArt,pictureFile} from './visual-icons.js';
import {briefCard,squareStatus} from './village-square-ui.js';
import {boatStatus} from './boat-ui.js';
import {confirmAction} from './confirm-dialog.js';
import {flyHarvest,bump} from './harvest-fly.js';
import {keepFolds} from './keep-folds.js';
import {QUICK_CROP_MS,cropChoiceText} from './wait-tip.js';
import {confettiFrom} from './confetti.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
// What one market tab's stock is worth at today's prices, as Sell all would pay (11 Oct 2026, Part A A11: the Market button's badge from
// the first harvest to the first sale says the same number as the Crops tab's "This basket is worth").
export function marketWorth(state,tab,now=Date.now()){return marketPay(state,marketItems(state,tab).reduce((v,k)=>v+sellableStock(state,k,now)*marketQuote(k,now).price,0),now);}
const seconds=formatDuration;
// The seed shop's tabs by the growing time its rows show, each tab's name true to it (23 Oct 2026, the owner: "Dit klopt niet meer nu we
// tijden aangepast hebben", then "show bij crops enkel total time"): Quick 5 minutes or less (wheat, lettuce), Minutes under an hour (corn,
// barley), Hours under 8 hours, Overnight 8 hours or more. Before (16 Oct 2026) Hours ran from above 5 minutes, corn's 15 too.
export const seedTab=duration=>duration<=QUICK_CROP_MS?'quick':duration<3600000?'minutes':duration<28800000?'hours':'overnight';
// 8 Oct 2026: a built building in the Buildings list says what it is doing in separate chips under its name, which wrap instead of
// being cut off with … (French, Russian and Czech on a phone, English on a computer): green "4 ready", amber "1 working", plain
// "2 free" (slots; always with its number, a bare "free" is translated as "gratis") and, while nothing is ready yet, a quiet
// "Next in 3m". Only the counts above zero; nothing running is one "Ready to work"; the Farmhouse keeps its fields. s: status().
// 19 Oct 2026: a building whose recipes all lack goods says "Missing goods" (red), not "Ready to work" (buildingCanWork).
export const buildingChips=s=>(s.kind==='farm'?[['farm',s.text]]:s.kind==='idle'?[['idle','Ready to work']]:s.kind==='missing'?[['missing','Missing goods']]:[['ready',s.ready&&`${s.ready} ready`],['working',s.working&&`${s.working} working`],['free',s.free&&`${s.free} free`],['next',!s.ready&&s.working&&`Next in ${seconds(s.next)}`]]).filter(([,text])=>text).map(([kind,text])=>`<span class="building-status ${kind}">${text}</span>`).join('');
// 19 Oct 2026, the owner: "toon alleen Ready to work bij buildings als je daadwerkelijk iets kan ontwikkelen, anders Missing goods (rood)":
// a building with nothing running is ready to work only when one of its recipes can start now, as its own window's Start button decides
// (recipeAvailability: unlocked, a free slot, every ingredient, any coins). A building none of whose recipes is open yet keeps "Ready to
// work", since nothing is missing there.
export function buildingCanWork(state,key){const open=buildingRecipes(state,key).map(id=>recipeAvailability(state,id,farmNow())).filter(a=>!a.locked);return !open.length||open.some(a=>a.canStart);}
// village: the game shows World II, the village (public/game.js). Its Buildings list holds only the village's places and its market
// only buys village goods; on the farm the village's places and goods never show here.
// onBoat (Oct 2026): opens the town boat at the Pier (public/boat-ui.js), which has no batches of its own.
// world (27 Oct 2026): 3 in the harbour, whose Buildings list holds only its places (built by the harbour master's works).
export function createEconomyUI({state,onChange,onCrop,onExpand,notify,runAction,onEstate,onFamily,onPlace,onBoat,onWarehouse,village=false,world=village?2:1}){
 const openFactoryGroups=new Set();let factoryFilter='all';
 let currentBuilding=null,marketTab=world===3?'harbour':village?'village':'crops',selectedCrop='wheat',seedFilter='all',lastJobReady='',lastCoinBoost=false,mutating=false,lastReadyKeys='';
 let marketSelling=false,renderedMarketDay='',lastMarketDay=utcDay(farmNow());
 const number=n=>n.toLocaleString('en-US');
 const inWorld=key=>(BUILDINGS[key]?.world??1)===world;
 const signed=n=>`${n>=0?'+':''}${number(n)}`;
 // The builder's crate's rule (Oct 2026), said where crates are packed (the Lumber Camp) and where they are used (a farm building's upgrade).
 const CRATE_RULE=`Each builder’s crate takes ${number(BUILDER_CRATE_COINS)} coins off a farm building upgrade, up to half the price.`;
 const sellQuantities={};
 // Market rows whose amount slider is open on a phone (mobile-windows.css); a computer always shows it.
 const openSaleRows=new Set();
 const batchCounts={};
 function itemArt(key){return art(key,'product-art');}
 function show(id){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();}
 // What a batch costs: the ingredients, and for a recipe with a coin price the coins (the Glasshouse).
 function costList(id,n=1){const r=recipeFor(state,id);return itemList(Object.fromEntries(Object.entries(r.input).map(([k,v])=>[k,v*n])),true)+(r.coins?`<span class="ingredient ${state.coins<r.coins*n?'missing':''}">${art('coins')}<span>${number(r.coins*n)} coins</span></span>`:'');}
 // Two buttons above Your fields: all crops, or only the ones that do not regrow (shown when there are both kinds).
 function fieldClearButtons(planted){
  const annual=planted.filter(p=>!CROPS[p.crop].perennial).length,both=annual>0&&annual<planted.length;
  return `<div class="field-clear-all">${both?`<button type="button" class="small-button field-clear-button" data-clear-all="annual">Remove all but regrowing (${annual})</button>`:''}<button type="button" class="small-button field-clear-button" data-clear-all="all">Remove all (${planted.length})</button></div>`;
 }
 function itemList(items,requirements=false){return Object.entries(items).map(([key,n])=>`<span class="ingredient ${requirements&&state.inventory[key]<n?'missing':''}">${itemArt(key)}<span>${requirements?`${state.inventory[key]}/${n}`:`${n}×`} ${ITEMS[key].name}</span></span>`).join('');}
 function status(key,now=farmNow()){
  const b=state.buildings[key];if(key==='farmhouse')return {text:`${state.plots.length} / ${MAX_PLOTS} fields`,kind:'farm'};
  if(key==='familyhall')return buildingEligible(state,key)?{text:'Your weekly order & family',kind:'family'}:{text:`Locked · ${buildingUnlockHint(state,key)}`,kind:'locked'};
  const jobs=productionJobs(b),slots=buildingSlots(state,key,now),ready=jobs.filter(j=>now>=j.readyAt).length;
  // A village place is built from the golden brief at the market square, one at a time (Oct 2026): the next one says so, the others
  // the place right before them (villagePlaceBefore). Below their level they stay locked as before.
  if(!buildingUnlocked(state,key)&&BUILDINGS[key]?.world===3)return buildingEligible(state,key)?{text:'Built by a harbour work',kind:'locked'}:{text:`Opens at level ${BUILDINGS[key].minLevel}`,kind:'locked'};
  if(!buildingUnlocked(state,key)&&worldTwoBuilding(key)&&buildingEligible(state,key)){const before=villagePlaceBefore(state,key);return before?{text:`After the ${BUILDINGS[before].name}`,kind:'locked'}:{text:'Build from the golden brief',kind:'available'};}
  if(!buildingUnlocked(state,key))return {text:!buildingEligible(state,key)?`Locked · ${buildingUnlockHint(state,key)}`:`Build for ${number(buildingCost(state,key))} coins`,kind:buildingEligible(state,key)?'available':'locked'};
  // The Pier (Oct 2026) has no batches: its line is the town boat's.
  if(BUILDINGS[key].type==='pier')return boatStatus(state,now);
  // 8 Oct 2026: the counts as well, for the chips in the Buildings list (buildingChips); the text stays the line the farm map shows.
  const counts={ready,working:jobs.length-ready,free:Math.max(0,slots-jobs.length)};
  if(!jobs.length&&!buildingCanWork(state,key))return {text:`Missing goods · 0 / ${slots} slots`,kind:'missing',...counts};
  if(!jobs.length)return {text:`Ready to work · 0 / ${slots} slots`,kind:'idle',...counts};
  if(ready)return {text:`${ready} ready · ${jobs.length} / ${slots} slots`,kind:'ready',...counts};
  const next=Math.min(...jobs.map(j=>j.readyAt))-now;
  return {text:`${jobs.length} / ${slots} working · ${seconds(next)}`,kind:'working',...counts,next};
 }
 // A season crop (the Season Pass's cranberries, Oct 2026) is planted with its seed packets, never coins: its row says how many are left.
 // The seed shop and the seed picker show a crop's growing time only, with an hourglass (23 Oct 2026, the owner: "show bij crops enkel
 // total time"; from 22 Oct the time with water and care stood beside it). A field's own timer keeps its real time left.
 const growTimes=(key,regrowing=false)=>`<span class="crop-time" title="Growing time">${art('hourglass')}${seconds(cropDuration(state,key,regrowing,farmNow()))}</span>`;
 const cropPrice=key=>seasonCrop(key)?`${seasonSeedsOf(state,key)} packets · ${growTimes(key)}`:`${seedCost(state,key)} · ${growTimes(key)}`;
 function chooseCrop(key){if(seasonCrop(key)?seasonSeedsOf(state,key)<1||!seasonCropOpen(key,farmNow()):!cropUnlocked(state,key)){notify(cropUnlockHint(state,key));return;}selectedCrop=key;$('selected-crop-art').innerHTML=art(key);$('selected-crop-name').textContent=CROPS[key].name;$('selected-crop-price').innerHTML=cropPrice(key);onCrop(key);}
 // The season crop's row on top of the seeds while its season runs or a farm still has packets: the packets instead of a price.
 function seasonSeedRows(){
  return Object.keys(SEASON_CROPS).filter(key=>seasonSeedsOf(state,key)>0||seasonCropOpen(key,farmNow())&&levelOf(state)>=10).map(key=>{
   const c=CROPS[key],n=seasonSeedsOf(state,key),open=seasonCropOpen(key,farmNow()),usable=open&&n>0;
   const line=!open?'This crop only grows in its season. Your seed packets keep until then.':n?`${growTimes(key)} · sells for ${marketQuote(key,farmNow()).price}`:'Seed packets come from the Season Pass.';
   return `<button class="seed-row crop-${key} is-season ${selectedCrop===key?'selected':''} ${usable?'':'is-locked'}" data-choose-crop="${key}" ${usable?'':'disabled'} aria-pressed="${selectedCrop===key}"><span class="seed-row-art">${art(key)}</span><span class="seed-row-copy"><strong>${c.name}</strong><small>${line}</small></span><span class="seed-row-price">${art(`${key}-seeds`)}${n}</span></button>`;
  }).join('');
 }
 function renderSeeds(){
  document.querySelectorAll('[data-seed-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.seedFilter===seedFilter);b.setAttribute('aria-pressed',String(b.dataset.seedFilter===seedFilter));});
  keepFolds($('crop-catalog'),()=>{$('crop-catalog').innerHTML=seasonSeedRows()+Object.entries(CROPS).sort((a,b)=>a[1].duration-b[1].duration).filter(([key])=>seedFilter==='all'||seedTab(cropDuration(state,key,false,farmNow()))===seedFilter).map(([key,c])=>{
   const paceTitle=c.perennial?`Plant once · First harvest ${seconds(caredDuration(state,key,false,farmNow()))} with water and care\nThen ${seconds(caredDuration(state,key,true,farmNow()))} after each collection.\nOne harvest waits; no offline stockpiling.`:'';
   // One compact row per crop, like the market: picture, name (plus "Regrows" for orchard crops), time and today's price,
   // the seed price on the right. The filter tabs already say how quick a crop is.
   const locked=!cropUnlocked(state,key);
   return `<button class="seed-row crop-${key} ${selectedCrop===key?'selected':''} ${locked?'is-locked':''}" data-choose-crop="${key}" ${locked?'disabled':''} aria-pressed="${selectedCrop===key}"${paceTitle?` title="${paceTitle}"`:''}><span class="seed-row-art">${art(key)}</span><span class="seed-row-copy"><strong>${c.name}${c.perennial?'<em class="seed-pace is-regrow">Regrows</em>':''}</strong><small>${locked?`${art('lock','unlock-lock')} ${cropUnlockHint(state,key)}`:`${growTimes(key)} · sells for ${marketQuote(key,farmNow()).price}`}</small></span><span class="seed-row-price">${art('coins')}${seedCost(state,key)}</span>${selectedCrop===key?'<span class="seed-row-check" aria-hidden="true">✓</span>':''}</button>`;
  }).join('');
  // What is still locked goes to the bottom, folded, on every farm (older farms too), so what you can use comes first.
  foldLocked($('crop-catalog'),'[data-choose-crop]:not(.is-season)',b=>!cropUnlocked(state,b.dataset.chooseCrop),'Seeds to unlock','seeds-locked');});
  // Up to level 8 a crop that is not quick says how long it takes and names the quick one for playing on (16 Oct 2026, wait-tip.js).
  // Opened from the tractor (17 Oct 2026, data-from): nothing, as the tractor opens again and shows the crop on its Plant tile.
  $('crop-catalog').querySelectorAll('[data-choose-crop]').forEach(b=>b.addEventListener('click',()=>{chooseCrop(b.dataset.chooseCrop);const fromTractor=$('seed-dialog').dataset.from==='tractor';$('seed-dialog').close();if(!fromTractor)notify(cropChoiceText(state,b.dataset.chooseCrop,farmNow()));}));icons();
 }
 function openSeeds(){renderSeeds();show('seed-dialog');}
 // The places in the valley that stand on the farm like buildings but work differently (the Valley Market, the Ranch and the
 // three wave-3 places): listed with the buildings, each with one line on what is waiting there, and opened like from the map.
 // The picture is a render of the place's own models (public/assets/icons/place-<key>, served as WebP), like the building cards.
 const PLACES=Object.freeze({valleymarket:'valley-market',ranch:'ranch',estateworkshop:'estate-workshop',tradedepot:'trade-depot',grandfair:'grand-fair',seedlab:'seedlab',visitors:'visitors',valleyprojects:'valleyprojects'});
 // The after-90 places (27 Sep 2026) show their painted icon instead of a render of models.
 const PLACE_PICTURES=Object.freeze({seedlab:'endgame-seed-lab',visitors:'endgame-visitors',valleyprojects:'project-watermill'});
 const canPay=items=>Object.entries(items).every(([k,n])=>state.inventory[k]>=n);
 function placeStatus(key,now=farmNow()){
  if(!featureUnlocked(state,key))return {text:`Locked · Reach level ${FEATURE_LEVELS[key]}.`,kind:'locked'};
  if(key==='valleymarket'){
   const stalls=state.valley?.stalls??[],waiting=stalls.filter(s=>s.basket);
   if(waiting.length)return {text:`${waiting.length} ${waiting.length===1?'customer':'customers'} waiting`,kind:waiting.some(s=>canPay(s.basket.input))?'ready':'idle'};
   return {text:`Next customer in ${seconds(Math.min(...stalls.map(s=>s.readyAt))-now)}`,kind:'working'};
  }
  if(key==='ranch')return state.ranch?.focus?{text:`${RANCH_HERDS[state.ranch.focus]} · ${Math.round(ranchSpeedup(state)*100)}% faster`,kind:'idle'}:{text:'Choose your herd',kind:'ready'};
  if(key==='estateworkshop'){
   const list=Object.entries(IMPROVEMENTS),built=list.filter(([id])=>hasImprovement(state,id)).length,buildable=list.filter(([id,x])=>!hasImprovement(state,id)&&levelOf(state)>=x.level&&state.coins>=x.coins&&canPay(x.materials)).length;
   return buildable?{text:`${buildable} ready to build · ${built} / ${list.length} built`,kind:'ready'}:{text:`${built} / ${list.length} improvements built`,kind:'idle'};
  }
  if(key==='seedlab'){
   const beds=state.lab?.beds??[],ready=beds.filter(b=>b&&now>=b.readyAt).length,free=beds.filter(b=>!b).length;
   if(ready)return {text:`${ready} ${ready===1?'bed':'beds'} ready to collect`,kind:'ready'};
   if(free)return {text:`${free} test ${free===1?'bed':'beds'} free`,kind:labCanCross(state)?'ready':'idle'};   // ready only when you can cross something
   return {text:`Growing · ready in ${seconds(Math.min(...beds.map(b=>b.readyAt))-now)}`,kind:'working'};
  }
  if(key==='visitors'){
   const c=state.visitors?.current;
   if(!c)return state.visitors?.nextAt>now?{text:`Next visitor in ${seconds(state.visitors.nextAt-now)}`,kind:'working'}:{text:'Waiting for a visitor',kind:'idle'};
   return canPay(c.input)?{text:'A visitor can be served',kind:'ready'}:{text:`A visitor waits · ${seconds(Math.max(0,c.leavesAt-now))} left`,kind:'working'};
  }
  if(key==='valleyprojects'){
   const finish=Object.entries(VALLEY_PROJECTS).some(([id,p])=>{const level=valleyProjectLevel(state,id),step=p.levels[level];return step&&state.coins>=step.coins&&Object.entries(step.materials).every(([k,n])=>(state.valleyProjects[id].given[k]??0)>=n);});
   const built=Object.keys(VALLEY_PROJECTS).reduce((sum,id)=>sum+valleyProjectLevel(state,id),0);
   return finish?{text:'A project is ready to finish',kind:'ready'}:{text:`${built} of 15 levels built`,kind:'idle'};
  }
  if(key==='tradedepot'){
   const c=state.depot?.contract;
   if(!c)return state.depot?.readyAt>now?{text:`Next contract in ${seconds(state.depot.readyAt-now)}`,kind:'working'}:{text:'Waiting for a contract',kind:'idle'};
   const needed=Object.values(c.input).reduce((a,n)=>a+n,0),loaded=Object.values(c.loaded).reduce((a,n)=>a+n,0),full=Object.entries(c.input).every(([k,n])=>c.loaded[k]+state.inventory[k]>=n);
   return full?{text:'Ready to send',kind:'ready'}:{text:`${number(loaded)} / ${number(needed)} loaded`,kind:'working'};
  }
  const fair=state.fair??{classes:[],entered:[]},open=fair.classes.filter((c,i)=>!fair.entered.includes(i));
  return open.some(c=>canPay(c.input))?{text:`A ribbon to win · ${fair.entered.length} / ${fair.classes.length} this week`,kind:'ready'}:{text:`${fair.entered.length} / ${fair.classes.length} ribbons this week`,kind:'idle'};
 }
 // The buildings list (8 Oct 2026): a built building has its level as a gold chip beside the name and what it is doing as chips under
 // it (buildingChips), not one "Level 3 · 2 ready · 4 / 5 slots" line that was cut off; locked, to build and the Family Hall keep their
 // one line. The labels on the farm keep the short status.
 const isBuilt=key=>key==='farmhouse'||key!=='familyhall'&&buildingUnlocked(state,key);
 // The built Pier (Oct 2026) has no levels: one line (the town boat's), no level chip.
 const leveled=key=>isBuilt(key)&&BUILDINGS[key].type!=='pier';
 const catalogStatus=(key,s)=>leveled(key)?`<span class="building-chips" data-building-status="${key}">${buildingChips(s)}</span>`:`<span class="building-status ${s.kind}" data-building-status="${key}">${s.kind==='locked'?art('lock','unlock-lock'):''}${s.text}</span>`;
 function renderCatalog(){
  $('buildings-dialog').dataset.place=village?'village':'farm';   // its ⓘ (dialog-shell.js)
  const buildingLevel=key=>guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1;
  // Buildings with finished batches come first, so collecting is one tap away; the rest in the order they unlock. Those missing goods
  // for every recipe go last, above the folded locked ones (19 Oct 2026, the owner: "zet missing goods ook onderaan, in de buildings lijst").
  const readyFirst=key=>status(key).kind==='ready'?0:1,missingLast=key=>status(key).kind==='missing'?1:0;
  keepFolds($('building-catalog'),()=>{$('building-catalog').innerHTML=Object.entries(BUILDINGS).filter(([key])=>inWorld(key)).sort(([a],[b])=>readyFirst(a)-readyFirst(b)||missingLast(a)-missingLast(b)||buildingLevel(a)-buildingLevel(b)).map(([key,b])=>{const s=status(key),picture=key==='familyhall'?'familyhall-model':key;
   return `<button class="building-card" data-open-building="${key}"><span class="building-card-art"><img src="${pictureFile(picture)}" alt=""></span><span class="building-card-info"><strong>${b.name}${leveled(key)?` <span class="building-level-chip">Level ${state.buildings[key].level}</span>`:''}</strong>${catalogStatus(key,s)}</span><i data-lucide="chevron-right"></i></button>`;}).join('');
  foldLocked($('building-catalog'),'[data-open-building]',b=>!buildingEligible(state,b.dataset.openBuilding),village?'Places to unlock':'Buildings to unlock','buildings-locked');
  normalizeFarm(state,farmNow());
  // In the village the market square comes first (Oct 2026): its golden brief builds the places listed under it. The village lake
  // (12 Oct 2026, plan D) right after it, once the lake is open: computers have no More menu, so this card and the pin over the rowboat
  // are their way there. Its line is the casts waiting, gold when all 5 wait (like the pin).
  // The harbour (27 Oct 2026): its office first, where the ships, the works, the market and the quests are.
  if(world===3){$('building-catalog').insertAdjacentHTML('afterbegin',`<button class="building-card is-place" data-open-harbour><span class="building-card-art">${art('harbour-badge')}</span><span><strong>Harbour office</strong><small>Ships and works</small></span></button>`);$('building-catalog').querySelector('[data-open-harbour]').addEventListener('click',()=>{$('buildings-dialog').close();onPlace?.('harbouroffice');});}
  // The Rail siding (28 Oct 2026): from then on the harbour's ships load from the farm and the village too, from this card.
  else if(harbourWorkDone(state,'rail')){$('building-catalog').insertAdjacentHTML('afterbegin',`<button class="building-card is-place" data-open-harbour-ships><span class="building-card-art">${art('harbour-badge')}</span><span><strong>Harbour ships</strong><small>Load them by rail</small></span></button>`);$('building-catalog').querySelector('[data-open-harbour-ships]').addEventListener('click',()=>{$('buildings-dialog').close();onPlace?.('harbourships');});}
  if(world===2){const s=squareStatus(state),l=lakeStatus();$('building-catalog').insertAdjacentHTML('afterbegin',`<button class="building-card is-place" data-open-square><span class="building-card-art"><img src="${pictureFile('villagemarket')}" alt=""></span><span class="building-card-info"><strong>Market square</strong><span class="building-status ${s.kind}" data-square-status>${s.text}</span></span><i data-lucide="chevron-right"></i></button>${lakeOpen(state)?`<button class="building-card is-place" data-open-lake><span class="building-card-art"><img src="${pictureFile('villagelake')}" alt=""></span><span class="building-card-info"><strong>Village lake</strong><span class="building-status ${l.kind}" data-lake-status>${l.text}</span></span><i data-lucide="chevron-right"></i></button>`:''}`);}
  const placeFirst=key=>placeStatus(key).kind==='ready'?0:1,places=village?[]:Object.keys(PLACES).filter(k=>!ENDGAME_PLACES.includes(k)||endgameInSight(state)).sort((a,b)=>placeFirst(a)-placeFirst(b)||FEATURE_LEVELS[a]-FEATURE_LEVELS[b]),openPlaces=places.filter(k=>featureUnlocked(state,k));
  $('building-catalog').insertAdjacentHTML('beforeend',`${openPlaces.length?'<h3 class="catalog-heading">Places in the valley</h3>':''}${places.map(key=>{const s=placeStatus(key);return `<button class="building-card is-place" data-open-place="${key}"><span class="building-card-art"><img src="${pictureFile(PLACE_PICTURES[key]??`place-${key}`)}" alt=""></span><span class="building-card-info"><strong>${FEATURE_NAMES[key]}</strong><span class="building-status ${s.kind}" data-place-status="${key}">${s.kind==='locked'?art('lock','unlock-lock'):''}${s.text}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('')}`);
  foldLocked($('building-catalog'),'[data-open-place]',b=>!featureUnlocked(state,b.dataset.openPlace),'Places to unlock','places-locked');});
  $('building-catalog').querySelectorAll('[data-open-building]').forEach(b=>b.addEventListener('click',()=>openBuilding(b.dataset.openBuilding)));
  $('building-catalog').querySelectorAll('[data-open-place]').forEach(b=>b.addEventListener('click',()=>{$('buildings-dialog').close();onPlace?.(b.dataset.openPlace);}));
  $('building-catalog').querySelector('[data-open-square]')?.addEventListener('click',()=>{$('buildings-dialog').close();onPlace?.('villagemarket');});
  $('building-catalog').querySelector('[data-open-lake]')?.addEventListener('click',()=>{$('buildings-dialog').close();onPlace?.('villagelake');});icons();
 }
 const lakeStatus=(now=farmNow())=>{const c=lakeCasts(state,now).casts;return {text:`Casts waiting: ${c}`,kind:c>=POND_MAX_CASTS?'ready':'idle'};};
 function openBuildings(){renderCatalog();show('buildings-dialog');}
 // The built Pier opens the town boat (Oct 2026); while it is not built its window shows its golden brief like any village place.
 function openBuilding(key){if(!Object.hasOwn(BUILDINGS,key))return;if(BUILDINGS[key].world===3&&!buildingUnlocked(state,key)){onPlace?.('harbourworks');return;}   // a harbour place is built by its work
if(key==='familyhall'){if(!buildingEligible(state,key)){notify(buildingUnlockHint(state,key));return;}onFamily();return;}if(BUILDINGS[key].type==='pier'&&buildingUnlocked(state,key)){onBoat?.();return;}currentBuilding=key;$('building-dialog').dataset.building=key;renderBuilding();show('building-dialog');}
 function renderBuilding(){
  if(!currentBuilding)return;
  // A Pier built from its own window (its brief) opens the town boat instead; mutate's toast still shows.
  if(BUILDINGS[currentBuilding].type==='pier'&&buildingUnlocked(state,currentBuilding)){currentBuilding=null;$('building-dialog').close();onBoat?.();return;}
  const key=currentBuilding,b=BUILDINGS[key],bs=state.buildings[key],buildCost=buildingCost(state,key);
  let crateOffer=0;   // the builder's crates the upgrade card shows, sent with Use crates
  // The heading (18 Oct 2026, the window shell): the building's picture with its level, its name, and what kind of building it is. Its
  // tagline went: the name and the recipes say it.
  const built=key==='farmhouse'||buildingUnlocked(state,key)&&b.type!=='pier';
  $('building-badge').innerHTML=`<img src="${pictureFile(key)}" alt="">${built?`<b class="lv-badge">Lv. ${bs.level}</b>`:''}`;
  $('building-title').textContent=b.name;$('building-dialog').dataset.place=worldTwoBuilding(key)?'village':'farm';   // its ⓘ (dialog-shell.js)
  $('building-sub').textContent=!built?(b.type==='pier'?'Not built yet · For the town boat':'Not built yet'):key==='farmhouse'?'Your homestead':worldTwoBuilding(key)?'Village production':'Farm production';
  let content='';
  // Shared by both the pre-purchase preview and the working recipe list below: the Factory repeats every other
  // building's whole catalogue, so both of its recipe lists get grouped and collapsed by source; every other
  // building's own, much shorter list stays exactly the flat list it always was.
  const buildingOrder=Object.keys(BUILDINGS),sourceOf=r=>r.base?buildingOrder.indexOf(RECIPES[r.base].building):-1;
  const sourceKey=r=>r.base?RECIPES[r.base].building:'honey';
  const sourceLabel=r=>r.base?BUILDINGS[RECIPES[r.base].building].name:'Honey bottling';
  // Each source reads at a glance: its building, what it makes, how many recipes and how many you can start now.
  // Open groups stay open when the list re-renders (after starting or collecting a batch).
  // 4 Oct 2026: every good a source makes, in colour when you can start one of its recipes now and greyed out when you cannot (the
  // "N ready" count alone did not say which, so you had to open each group). The pre-purchase preview has nothing to start: all in colour.
  const foldFactoryGroups=(entries,cardOf,{ready=null}={})=>{
   const groups=new Map();
   for(const [rid,r] of entries.sort(([,a],[,b])=>sourceOf(a)-sourceOf(b))){
    const source=sourceKey(r);if(!groups.has(source))groups.set(source,{label:sourceLabel(r),cards:[],goods:new Map(),ready:0});
    const g=groups.get(source),now=ready?Boolean(ready(rid)):true,item=Object.keys(r.output)[0];
    g.cards.push(cardOf(rid,r));g.goods.set(item,Boolean(g.goods.get(item))||now);if(ready&&now)g.ready++;
   }
   return [...groups].map(([source,g])=>`<details class="factory-recipe-group ${g.ready?'has-ready':''}" data-factory-group="${source}" ${openFactoryGroups.has(source)?'open':''}><summary><span class="factory-source-art">${art(source)}</span><span class="factory-source-copy"><strong>${g.label}</strong><small><span class="factory-source-goods">${[...g.goods].map(([item,on])=>art(item,on?'':'is-off')).join('')}</span>${g.cards.length} ${g.cards.length===1?'recipe':'recipes'}</small></span>${g.ready?`<em class="factory-ready">${g.ready} ready</em>`:''}<i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="factory-recipe-group-cards">${g.cards.join('')}</div></details>`).join('');
  };
  if(key==='farmhouse'){
   // The Farmhouse (23 Oct 2026, the owner's redesign, as the chores and production windows): one compact Growing space card (the fields
   // as a small map, the next field as a card with its price as chips, coins, goods and level in red while short, and Buy beside it; a
   // green edge when it can be bought now, muted with one line saying why when not; the rule folded away), the Estate as one row, then
   // Your fields as compact rows, ripe fields first with a green edge, each with a quiet remove button (behind its red confirmation, as
   // before), and the two Remove all buttons under the list. Same actions: expand, clear_planting, clear_plantings, onEstate.
   const n=state.plots.length,cost=expansionCost(state),materials=expansionMaterials(state),hasMaterials=Object.entries(materials).every(([k,v])=>state.inventory[k]>=v),needLevel=expansionLevel(state),levelOk=levelOf(state)>=needLevel;
   const coinsOk=cost!==null&&state.coins>=cost,canBuy=cost!==null&&levelOk&&coinsOk&&hasMaterials;
   // Why it cannot be bought yet, in one short line: the level first, then the coins, then the goods (their chips are red with have/need).
   const why=cost===null||canBuy?'':!levelOk?`Field ${n+1} unlocks at level ${needLevel}. You are level ${levelOf(state)}.`:!coinsOk?`You need ${number(cost-state.coins)} more coins.`:'You need more of the goods in red.';
   // Your growing space as a small gold card: a picture, how many of the fields are yours in big figures and a thick gold bar (23 Oct
   // 2026: the owner found the little row of 40 field slots ugly, then the plain bar under a heading "heel karig").
   const fieldMap=`<div class="fh-space-card"><span class="fh-space-art">${art('seeds')}</span><div class="fh-space-main"><div class="fh-space-head"><strong>Your growing space</strong><span>${n} / ${MAX_PLOTS} fields</span></div><div class="fh-bar" aria-hidden="true"><i style="width:${Math.round(n/MAX_PLOTS*100)}%"></i></div></div></div>`;
   const rule=state.plots.length<12?'While you start out, every new level opens one more field, up to 12. No supplies needed.':`Unlock one field at a time. Each new field needs more coins and a different mix of farm supplies.${needLevel>1?' The last twelve fields are long-term goals: they also ask for a higher farm level.':''}`;
   const nextField=cost===null?`<div class="fh-next is-done"><span class="fh-next-art"><i data-lucide="check" data-line-icon></i></span><div class="fh-next-main"><strong>Your farm is fully expanded.</strong><small>${MAX_PLOTS} fields, twelve crops and room to build a lasting estate.</small></div></div>`
    :`<div class="fh-next ${canBuy?'is-ready':'is-waiting'}"><span class="fh-next-art">${art('farm')}</span><div class="fh-next-main"><strong>Field ${n+1}</strong><div class="ingredients fh-cost"><span class="ingredient ${coinsOk?'':'missing'}">${art('coins')}<span>${number(cost)} coins</span></span>${needLevel>1?`<span class="ingredient fh-level ${levelOk?'':'missing'}">${art('xp')}<span>Level ${needLevel}</span></span>`:''}${itemList(materials,true)}</div>${why?`<small class="fh-why">${why}</small>`:''}</div><button id="expand-fields" class="primary-button" ${canBuy?'':'disabled'}>Buy</button></div>`;
   content+=`<div class="farmhouse-panel"><section class="fh-space">${fieldMap}${nextField}${cost===null?'':`<details class="fold fh-rule" data-fold="farmhouse-rule"><summary>How it works</summary><p>${rule}</p></details>`}</section>`;
   content+=`<button ${featureUnlocked(state,'projects')?'':'hidden'} id="farmhouse-estate" class="estate-entry">${art('estate')}<span><strong>Your next chapter</strong><small>Estate projects, passive income and medals</small></span><i data-lucide="chevron-right"></i></button>`;
   // Your fields: one compact row per planted field, ripe ones first, the rest by time left, with a quiet button to remove it (clearPlanting: nothing back).
   const now=farmNow();
   const planted=state.plots.filter(p=>CROPS[p.crop]).sort((a,b)=>Number(b.readyAt<=now)-Number(a.readyAt<=now)||(a.readyAt<=now?a.id-b.id:a.readyAt-b.readyAt)),ripe=planted.filter(p=>p.readyAt<=now).length;
   const fieldRow=p=>{const c=CROPS[p.crop],ready=p.readyAt<=now,pct=ready?100:Math.max(3,Math.min(100,Math.round((now-p.plantedAt)/Math.max(1,p.readyAt-p.plantedAt)*100)));
    return `<li class="field-row ${ready?'is-ready':'is-waiting'}">${art(p.crop)}<div class="field-row-copy"><span class="field-row-name"><strong>${c.name}</strong><small class="fh-field-no">Field ${p.id+1}</small>${c.perennial?'<em>Regrows</em>':''}<small class="fh-time">${ready?'Ready to harvest':`${seconds(p.readyAt-now)} to go`}</small></span><span class="field-row-bar" aria-hidden="true"><i style="width:${pct}%"></i></span></div><button type="button" class="field-row-remove" data-clear-planting="${p.id}" data-planted-at="${p.plantedAt}" aria-label="Remove the ${c.name.toLowerCase()} from field ${p.id+1}" title="Remove"><i data-lucide="trash-2"></i></button></li>`;};
   if(planted.length)content+=`<section class="field-list"><div class="field-list-head"><h3>Your fields</h3>${ripe?`<span class="fh-ripe">${ripe} ready</span>`:''}<span>${planted.length} of ${n} planted</span></div><ul>${planted.map(fieldRow).join('')}</ul><div class="fh-remove"><p>Remove a crop to free its field. You get nothing back.</p>${fieldClearButtons(planted)}</div></section>`;
   content+='</div>';
  }else if(!buildingUnlocked(state,key)&&!buildCost){
   content+=`<section class="construction-panel"><h3>Something to grow towards</h3><p>${buildingUnlockHint(state,key)}</p><p>This building opens automatically when you reach its milestone.</p></section>`;
  }else if(!buildingUnlocked(state,key)){
   const eligible=buildingEligible(state,key),needs=constructionNeeds(state,key),preview={...state,buildings:{...state.buildings,[key]:{...bs,built:true}}};
   // What a building lists leaves World II's recipes out below level 100 (buildingRecipes, Oct 2026): the Kitchen showed packed lunches.
   const previewEntries=buildingRecipes(state,key).filter(id=>recipeUnlocked(preview,id)).map(id=>[id,recipeFor(state,id)]);
   // Bottled honey has no input at all — it is bought with coins — so without this it showed as a bare arrow
   // into a honey icon here, with no hint of the 5,000 coin cost that costList() already shows once built.
   const previewCard=(rid,r)=>`<div>${itemList(r.input)}${r.coins?`<span class="ingredient">${art('coins')}<span>${number(r.coins)} coins</span></span>`:''}<b>→</b>${itemList(r.output)}</div>`;
   const previewRecipes=key==='factory'?foldFactoryGroups(previewEntries,previewCard):previewEntries.map(([rid,r])=>previewCard(rid,r)).join('');
   // One status line (ready to build, or the level it opens at), what it makes as pictures, the full recipes folded
   // away, and a Build button only when building is possible.
   const openLevel=guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1,level=levelOf(state),short=buildCost-state.coins;
   // Plan F (13 Oct 2026, proposal 5): Makes lists what its recipes make once built, and Coming later the rest with its level (the Windmill
   // showed four goods beside "See all 2 recipes": natural fertilizer opens at 14, its animal feed at 18). A building not open yet lists all.
   const all=buildingRecipes(state,key),outputs=ids=>[...new Set(ids.flatMap(id=>Object.keys(RECIPES[id].output)))],nowMade=new Set(outputs(previewEntries.map(([rid])=>rid)));
   const made=outputs(all).filter(k=>!previewEntries.length||nowMade.has(k)),shown=made.slice(0,6),later=previewEntries.length?outputs(all).filter(k=>!nowMade.has(k)).map(k=>[k,Math.min(...all.filter(id=>RECIPES[id].output[k]).map(id=>recipeLevel(state,id)))]):[];
   const seeRecipes=previewEntries.length===1?'See the recipe':later.length?`See the ${previewEntries.length} recipes you can make now`:`See all ${previewEntries.length} recipes`;
   // A village place (Oct 2026): built from the golden brief, the next one in its order only; the others name the place right before them.
   const villagePlace=worldTwoBuilding(key),next=villagePlace&&eligible?villageBrief(state):null,before=next&&next.place!==key?villagePlaceBefore(state,key):null,after=before?BUILDINGS[before].name:'';
   const status=after?`<span class="build-status-art is-locked">${art('lock','unlock-lock')}</span><div><strong>After the ${after}</strong><small>Village places are built with coins and village goods, one at a time.</small></div>`:eligible?`<span class="build-status-art">${art('hammer')}</span><div><strong>Ready to build</strong><small>${b.type==='pier'?'The town boat calls here once the pier is mended.':'Starts with one batch slot. Every upgrade adds one.'}</small></div>`
    :`<span class="build-status-art is-locked">${art('lock','unlock-lock')}</span><div><strong>${level<openLevel?`Opens at level ${openLevel}`:buildingUnlockHint(state,key)}</strong><small>${level<openLevel?`You are level ${level}${openLevel-level>1?` · ${openLevel-level} levels to go`:' · almost there'}`:'Not open yet'}</small></div>`;
   content+=`<section class="construction-panel ${eligible&&!after?'is-ready':'is-locked'}"><div class="build-status">${status}</div>${made.length?`<div class="build-makes"><span>Makes</span><div>${shown.map(k=>`<b title="${ITEMS[k].name}">${art(k)}${ITEMS[k].name}</b>`).join('')}${made.length>shown.length?`<b class="build-more">+${made.length-shown.length} more</b>`:''}</div></div>`:''}${later.length?`<div class="build-makes build-later"><span>Coming later</span><div>${later.map(([k,l])=>`<b title="${ITEMS[k].name}">${art(k)}${ITEMS[k].name}${l>level?`<small>Level ${l}</small>`:''}</b>`).join('')}</div></div>`:''}${previewEntries.length?`<details class="build-recipes" data-fold="recipes"><summary>${seeRecipes}</summary><div class="construction-recipes${key==='factory'?' factory-recipe-list':''}">${previewRecipes}</div></details>`:''}${needs.length?`<p class="build-needs">First open ${needs.map(k=>BUILDINGS[k].name).join(' and ')} to supply this building.</p>`:''}${villagePlace?(next&&!after?briefCard(state,itemList,{showMe:false}):''):eligible?`<button type="button" id="construct-building" class="primary-button" ${state.coins>=buildCost&&!needs.length?'':'disabled'}><span>Build</span><span class="button-price">${art('coins')}${number(buildCost)} coins</span></button>${short>0?`<p class="build-short">You need ${number(short)} more coins.</p>`:''}`:`<p class="build-price">${art('coins')}<span>${number(buildCost)} coins to build</span></p>`}</section>`;
  }else{
   if(key==='windmill' ||key==='bakery')content+=`<div class="milling-chain"><span>${art('wheat')} Grain</span><b>→</b><span>${art('grainmeal')} Grain meal</span><b>→</b><span>${art('flour')} Flour</span><b>→</b><span>${art('bread')} Fresh baking</span></div><p class="milling-note">${key==='windmill'?'Grain becomes meal, then flour for the Bakery.':'Flour comes from the Windmill.'}</p>`;
   // World II (Oct 2026): a village place's own rule in one sentence. The Village Fields sow with the farm's natural fertilizer: what is in
   // storage, and a button that opens the farm's Windmill window right here (its batches start from the village as well).
   if(key==='villagefields')content+=`<p class="milling-note">Sow with natural fertilizer and coins, harvest when ripe. Village crops sell only at the Village market.</p><div class="market-board-link village-fertilizer"><span>${art('fertilizer')}${number(state.inventory.fertilizer)} natural fertilizer in storage. Make more at the farm’s Windmill.</span><button type="button" id="open-windmill">Farm Windmill →</button></div>`;
   else if(key==='canteen')content+='<p class="milling-note">Pasty lunches are packed lunches baked without apples.</p>';
   const jobs=productionJobs(bs),slots=buildingSlots(state,key,farmNow()),ready=jobs.filter(j=>j.readyAt<=farmNow());
   // What Collect all brings in, e.g. "6 Eggs · 2 Milk".
   const readyGoods=list=>Object.entries(list.reduce((sum,j)=>{for(const [k,n] of Object.entries(j.output??RECIPES[j.recipe].output))sum[k]=(sum[k]??0)+n;return sum;},{})).map(([k,n])=>`${number(n)} ${ITEMS[k]?.name??k}`).join(' · ');
   lastJobReady=jobs.map(j=>`${j.id}:${farmNow()>=j.readyAt}`).join('|');
   // While the Warehouse is (nearly) full and a batch is ready, its chip says how full it is and a ready batch says Full (Collect still
   // tries): bringing in waits until there is room (farm-state.js assertWarehouseRoom; a player's report, 23 Oct 2026).
   const room=warehouseFull(state)?'full':warehouseNearFull(state)?'near':'ok';
   content+=`<div class="production-capacity"><strong>${jobs.length} / ${slots} production slots used</strong><p>${key==='factory'?'The Factory gets a slot every two levels, up to five. A batch is twice the level of the building that normally makes it, up to ×20 (a level-5 Dairy: cheese ×10). Goods that take over an hour: its level, up to ×10.':'Each building level adds one slot.'}${farmhandWorks(key)&&farmhandActive(state,farmNow())?` Your farmhand adds one more for ${seconds(state.boosts.farmhandUntil-farmNow())}.`:''}</p></div>${ready.length>1?`<section class="collect-all-panel"><div class="collect-all-art">${art('collect-all')}</div><div class="collect-all-copy"><strong>${ready.length} batches ready</strong><span>${readyGoods(ready)}</span></div><button type="button" id="collect-all-batches" class="primary-button" ${mutating?'disabled':''}>Collect all <span>${ready.length}</span></button></section>`:''}${ready.length&&room!=='ok'?`<div class="production-room is-${room}"><button type="button" class="warehouse-chip is-${room}" data-open-warehouse>${art('warehouse')}<span>Warehouse ${number(storedCount(state))} / ${number(warehouseCapacity(state))}</span></button>${room==='full'?'<span>Sell or use something to bring in more. Nothing is lost.</span>':''}</div>`:''}<div class="production-batches">`;
   for(const [index,job] of jobs.entries()){
    // A batch keeps its goods even when its recipe was later retired (the Factory's honey bottling).
    const recipe=RECIPES[job.recipe]??{name:'Finished batch',output:job.output??{}},isReady=farmNow()>=job.readyAt;
    // One row per running batch: what it makes, a bar and the time left; the Collect button only once it is ready.
    const made=job.output??recipe.output,first=Object.keys(made)[0];
    content+=`<div class="job-panel ${isReady?'ready':''}${isReady&&room==='full'?' is-full':''}" data-production-job="${job.id}"><span class="job-art">${art(first)}</span><div class="job-copy"><strong>${jobName(job)}</strong><span><b>${number(made[first])}×</b> · <span data-job-time="${job.id}">${isReady?(room==='full'?'Full':'Ready'):`${seconds(job.readyAt-farmNow())} left`}</span></span><progress data-job-progress="${job.id}" max="100" value="${Math.max(0,Math.min(100,(farmNow()-job.startedAt)/Math.max(1,job.readyAt-job.startedAt)*100))}" aria-label="Batch ${index+1} production progress"></progress></div>${isReady?`<button data-collect-job="${job.id}" class="primary-button job-collect">Collect</button>`:''}</div>`;
   }
   content+='</div>';
   content+=`<div class="recipe-section-heading"><h3>What shall we make?</h3><span>Ingredients are used when you start.</span></div>`;
   // A guided farm's first batch in a building is ready in 30 seconds (11 Oct 2026, farm-state.js batchDuration): said once above the
   // recipes while the building has never made one, and every card's clock shows the quick time.
   if(quickFirstBatch(state,key))content+=`<p class="milling-note first-batch-note">Your first batch here is ready in ${FIRST_BATCH_MS/1000} seconds.</p>`;
   const recipeCard=(rid,r)=>{
    const a=recipeAvailability(state,rid,farmNow()),duration=batchDuration(state,rid,farmNow()),value=recipeValue(rid,farmNow(),state),count=Math.max(1,Math.min(batchCounts[rid]??1,a.maxCount||1));batchCounts[rid]=count;
    return `<article class="recipe-card ${a.canStart?'is-ready':''}" data-recipe-card="${rid}"><div class="recipe-head"><span class="recipe-art">${art(Object.keys(r.output)[0])}</span><div class="recipe-title"><h4>${r.name}</h4><div class="recipe-meta"><span><i data-lucide="clock-3"></i> ${seconds(duration)}</span><p class="recipe-value">${art('coins')}<strong>${signed(value.added)}</strong> profit</p><span class="recipe-xp">${art('xp')}+${r.xp} XP</span></div></div></div><div class="recipe-flow-wrap"><div class="recipe-flow"><div class="ingredients">${costList(rid)}</div><i class="recipe-arrow" data-lucide="arrow-right"></i><div class="recipe-output">${itemList(r.output)}</div></div></div><div class="recipe-footer"><span>${a.locked?`${art('lock','unlock-lock')} Locked · ${recipeUnlockHint(state,rid)}`:a.busy?'All slots are occupied. Collect a finished batch first.':a.missing.length?'Gather the missing ingredients.':a.poor?`You need ${number(a.price)} coins for a batch.`:`+${r.xp} XP`}</span>${a.slots>1?`<div class="batch-picker"><span id="batch-label-${rid}">Batches</span><div class="batch-stepper" role="group" aria-labelledby="batch-label-${rid}"><button type="button" data-batch-step="-1" data-for-recipe="${rid}" aria-label="Fewer batches of ${r.name}" ${count<=1||!a.maxCount?'disabled':''}>−</button><output data-batch-count="${rid}" data-max="${a.maxCount}" aria-live="polite" aria-label="Number of batches for ${r.name}">${count}</output><button type="button" data-batch-step="1" data-for-recipe="${rid}" aria-label="More batches of ${r.name}" ${count>=a.maxCount?'disabled':''}>+</button></div><small>${a.maxCount} available${a.maxCount>2?` · <button type="button" class="batch-max" data-batch-step="max" data-for-recipe="${rid}" aria-label="Start the most batches of ${r.name}">Max</button>`:''}</small></div>`:''}<button class="small-button start-recipe" data-recipe="${rid}" ${a.canStart?'':'disabled'}>Start batch<i data-lucide="play"></i></button></div></article>`;
   };
   const recipeEntries=buildingRecipes(state,key).map(id=>[id,recipeFor(state,id)]);
   // Every good any other building makes, in one huge batch — that is the Factory's whole point, but it also
   // means its recipe list is every other building's list combined. Grouped by where each good normally comes
   // from and collapsed (same helper as the pre-purchase preview above), so this reads as a short list of
   // sources instead of one very long scroll. Every other building's own, much shorter list stays flat.
   if(key==='factory'){
    // "Ready now" answers the question you open the Factory with: what can I start right away?
    const canStart=rid=>recipeAvailability(state,rid,farmNow()).canStart,readyEntries=recipeEntries.filter(([rid])=>canStart(rid));
    if(factoryFilter==='ready'&&!readyEntries.length)factoryFilter='all';
    content+=`<div class="market-tabs factory-filter" role="group" aria-label="Show recipes"><button type="button" data-factory-filter="all" aria-pressed="${factoryFilter==='all'}" class="${factoryFilter==='all'?'active':''}">All sources</button><button type="button" data-factory-filter="ready" aria-pressed="${factoryFilter==='ready'}" class="${factoryFilter==='ready'?'active':''}" ${readyEntries.length?'':'disabled'}>Ready now <span>${readyEntries.length}</span></button></div>`;
    content+=factoryFilter==='ready'?`<div class="recipe-list factory-ready-list">${readyEntries.map(([rid,r])=>recipeCard(rid,r)).join('')}</div>`:`<div class="recipe-list factory-recipe-list">${foldFactoryGroups(recipeEntries,recipeCard,{ready:canStart})}</div>`;
   }else{
    // What you can start now comes first (18 Oct 2026, the window shell); the rest keep their order, the locked ones fold away below.
    const startable=rid=>recipeAvailability(state,rid,farmNow()).canStart?0:1;
    content+=`<div class="recipe-list">${[...recipeEntries].sort((a,b)=>startable(a[0])-startable(b[0])).map(([rid,r])=>recipeCard(rid,r)).join('')}</div>`;
   }
   // From level 128 the Lumber Camp packs builder's crates (Oct 2026): its window says what they are for.
   if(key==='lumbercamp'&&recipeUnlocked(state,'builderscrate'))content+=`<p class="milling-note crate-note">${CRATE_RULE}</p>`;
   // The Windmill makes natural fertilizer; fields get it from the tractor's Fertilize job (24 Oct 2026, the owner: "Haal natuurlijke mest
   // uit Windmolen, gaat nu via tractor"): its hand fertilizing (a field picker and a button) is gone.
   const cost=upgradeCost(state,key),estate=upgradeRequirements(state,key),next=bs.level+1;
   const estateLevelOk=!estate||levelOf(state)>=estate.level,estateSupplies=!estate||Object.entries(estate.materials).every(([item,n])=>(state.inventory[item]??0)>=n);
   // Past level 10 (World II's master tools) every level also gives a batch a chance to come out double.
   const doubleLevel=cost?next:bs.level,doubleNote=doubleLevel>MAX_BUILDING_LEVEL?`${Math.round(doubleBatchChance(doubleLevel)*100)}% chance of a double batch.`:'';
   const upgradeNote=cost?`${state.boosts.upgradeCredits?'50% voucher included. ':''}${productionSlots(next,key)} ${productionSlots(next,key)===1?'batch':'batches'} at once, ${Math.round(productionSpeed(next,key)*100)}% faster than level 1.`:bs.level>MAX_BUILDING_LEVEL?`Level ${bs.level}: ${productionSlots(bs.level,key)} simultaneous batches; production takes ${Math.round(productionSpeed(bs.level,key)*100)}% less time.`:`Level ${MAX_BUILDING_LEVEL}: ${productionSlots(MAX_BUILDING_LEVEL,key)} simultaneous batches; production takes ${Math.round(productionSpeed(MAX_BUILDING_LEVEL,key)*100)}% less time.`;
   // One row: what the upgrade costs (coins and the building's own goods), the Upgrade button and exactly what is still missing.
   const missingGoods=estate?Object.entries(estate.materials).filter(([item,n])=>(state.inventory[item]??0)<n).map(([item,n])=>`${number(n-(state.inventory[item]??0))} ${ITEMS[item].name}`):[];
   const coinsShort=cost!==null&&state.coins<cost?[`${number(cost-state.coins)} coins`]:[],stillNeeded=[...missingGoods,...coinsShort];
   const coinRow=cost===null?'':`<div class="upgrade-option"><div class="upgrade-cost"><span class="upgrade-price">${art('coins')}<b>${number(cost)}</b></span>${estate?`<span class="upgrade-plus">+</span><div class="ingredients expansion-materials">${itemList(estate.materials,true)}</div>`:''}</div><button id="upgrade-building" class="small-button" ${mutating||stillNeeded.length||!estateLevelOk?'disabled':''} aria-label="Upgrade with coins${estate?' and goods':''}">Upgrade</button>${estate&&!estateLevelOk?`<small class="shortfall">Level ${next} unlocks at farm level ${estate.level}. You are level ${levelOf(state)}.</small>`:stillNeeded.length?`<small class="shortfall">Still needed: ${stillNeeded.join(' and ')}.</small>`:''}</div>`;
   // Builder's crates (Oct 2026, from the village's Lumber Camp): a second row only when this upgrade can take one (builderCrates: from level
   // 100, crates in stock, a farm production building below level 10, not the Factory), using as many as it may. The coins row stays.
   const crates=builderCrates(state,key),cratePrice=cost===null?0:cost-crates*BUILDER_CRATE_COINS;crateOffer=crates;
   const crateNeeded=[...missingGoods,...(crates&&state.coins<cratePrice?[`${number(cratePrice-state.coins)} coins`]:[])];
   const crateRow=crates?`<div class="upgrade-option is-crates"><div class="upgrade-cost"><span class="upgrade-price">${art('coins')}<b>${number(cratePrice)}</b></span><span class="upgrade-plus">+</span><div class="ingredients expansion-materials">${itemList({...(estate?.materials??{}),builderscrate:crates},true)}</div></div><button id="upgrade-building-crates" class="small-button" ${mutating||crateNeeded.length||!estateLevelOk?'disabled':''} aria-label="Upgrade with ${number(crates)} builder’s ${crates===1?'crate':'crates'}">Use crates</button>${crateNeeded.length?`<small class="shortfall">Still needed: ${crateNeeded.join(' and ')}.</small>`:''}</div><small class="upgrade-rule">${CRATE_RULE}</small>`:'';
   // A village place's card says what its upgrades take (the owner's choice 8a: roof tiles for the places from level 125).
   const placeRule=cost!==null&&worldTwoBuilding(key)?`<small class="upgrade-rule">Village places upgrade with planks and stone; the places from level ${VILLAGE_TILES_FROM} on take roof tiles too.</small>`:'';
   content+=`<div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${cost?`Upgrade to level ${next}`:'Fully upgraded'}</strong><p>${upgradeNote}${doubleNote?` <span class="upgrade-double">${doubleNote}</span>`:''}</p></div>${cost===null?'':`<div class="upgrade-payments">${coinRow}${crateRow}${placeRule}</div>`}</div>`;
  }
  // Its fold-outs stay as the player left them while the window is open (16 Oct 2026, public/keep-folds.js); the Factory's groups keep
  // their own open set, the fertilizer picker its own open state and scroll (below).
  keepFolds($('building-content'),()=>{$('building-content').innerHTML=content;$('building-feedback').textContent='';
  const recipeList=$('building-content').querySelector('.recipe-list');if(recipeList)foldLocked(recipeList,'[data-recipe-card]',card=>recipeAvailability(state,card.dataset.recipeCard).locked,'Coming later','recipes-locked');});
  $('building-content').querySelectorAll('[data-factory-filter]').forEach(b=>b.addEventListener('click',()=>{factoryFilter=b.dataset.factoryFilter;renderBuilding();}));
  $('building-content').querySelectorAll('[data-factory-group]').forEach(g=>g.addEventListener('toggle',()=>{if(g.open)openFactoryGroups.add(g.dataset.factoryGroup);else openFactoryGroups.delete(g.dataset.factoryGroup);}));
  // Confetti from the button once it is bought (23 Oct 2026, the owner: "Doe confetti als je een nieuw gebouw opent en koopt"); where the
  // button was, read before the window draws itself again.
  $('construct-building')?.addEventListener('click',e=>{const at=e.currentTarget.getBoundingClientRect();mutate(async()=>{await runAction({type:'construct',building:key});confettiFrom(at);return `${b.name} is open. Start your first batch!`;});});
  $('building-content').querySelector('[data-village-build]')?.addEventListener('click',e=>{const at=e.currentTarget.getBoundingClientRect();mutate(async()=>{const r=await runAction({type:'village_build',place:key});confettiFrom(at);return r.place==='villagefields'?`The ${r.name} are built! +${number(r.xp)} XP.`:`The ${r.name} is built! +${number(r.xp)} XP.${r.place==='pier'?' The town boat waits at the pier.':''}`;});});
  $('open-windmill')?.addEventListener('click',()=>openBuilding('windmill'));
  $('building-content').querySelector('[data-open-warehouse]')?.addEventListener('click',()=>onWarehouse?.());
  // "Remove all" and "Remove all but regrowing": one save for every field, after typing ALL. The fields go as they were shown; if one
  // changed in the meantime, nothing is removed.
  $('building-content').querySelectorAll('[data-clear-all]').forEach(btn=>btn.addEventListener('click',async()=>{
   const keep=btn.dataset.clearAll==='annual',fields=state.plots.filter(p=>CROPS[p.crop]&&!(keep&&CROPS[p.crop].perennial));if(!fields.length)return;
   const regrowing=fields.filter(p=>CROPS[p.crop].perennial).length,ripe=fields.filter(p=>p.readyAt<=farmNow()).length;
   const description=`${fields.length} field${fields.length===1?'':'s'} ${fields.length===1?'is':'are'} empty right away. You get nothing back: no harvest, no XP and no seed coins.${keep?' Crops that regrow stay.':regrowing?` ${regrowing} of them regrow${regrowing===1?'s':''}: planting ${regrowing===1?'it':'them'} again costs coins.`:''}${ripe?` ${ripe} ${ripe===1?'is':'are'} ready now: harvest first to keep ${ripe===1?'it':'them'}.`:''}`;
   if(!await confirmAction({title:keep?`Remove ${fields.length} crop${fields.length===1?'':'s'} that do not regrow?`:`Remove all ${fields.length} crops?`,description,confirmLabel:'Remove',cancelLabel:'Keep them',picture:'harvest',tone:'danger',typeToConfirm:'ALL'}))return;
   mutate(async()=>{const r=await runAction({type:'clear_plantings',fields:fields.map(p=>({id:p.id,expectedPlantedAt:p.plantedAt}))});onExpand();return `${r.cleared.length} field${r.cleared.length===1?' is':'s are'} empty. Plant something new.`;});
  }));
  $('building-content').querySelectorAll('[data-clear-planting]').forEach(btn=>btn.addEventListener('click',async()=>{
   // Removing a crop throws it away, ripe or not: the same red confirmation as leaving a family.
   const p=state.plots[Number(btn.dataset.clearPlanting)];if(!p?.crop)return;
   const c=CROPS[p.crop],ready=p.readyAt<=farmNow();
   const description=`Field ${p.id+1} is empty right away. You get nothing back: no harvest, no XP and no seed coins.${ready?' It is ready now: harvest it instead to keep it.':''}${c.perennial?` Planting it again costs ${number(seedCost(state,p.crop))} coins.`:''}`;
   if(!await confirmAction({title:`Remove the ${c.name.toLowerCase()} from field ${p.id+1}?`,description,confirmLabel:'Remove',cancelLabel:'Keep it',picture:p.crop,tone:'danger'}))return;
   mutate(async()=>{await runAction({type:'clear_planting',id:Number(btn.dataset.clearPlanting),expectedPlantedAt:Number(btn.dataset.plantedAt)});onExpand();return `Field ${p.id+1} is empty. Plant something new.`;});
  }));
  $('farmhouse-estate')?.addEventListener('click',()=>onEstate('projects'));
  $('expand-fields')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'expand'});onExpand();return `One new field! Your farm now has ${r.fields}.`;}));
  $('building-content').querySelectorAll('[data-collect-job]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect',building:key,jobId:btn.dataset.collectJob});return `Collected ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;})));
  $('collect-all-batches')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect_all',building:key});return `Collected ${r.count} batches: ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;}));
  $('upgrade-building')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'upgrade',building:key});return `${b.name} upgraded to level ${r.level}.`;}));
  // Use crates sends as many crates as the card showed; the rules refuse a count that is no longer right.
  $('upgrade-building-crates')?.addEventListener('click',()=>{const crates=crateOffer;mutate(async()=>{const r=await runAction({type:'upgrade',building:key,crates});return `${b.name} upgraded to level ${r.level} with ${number(r.crates)} builder’s ${r.crates===1?'crate':'crates'}.`;});});
  $('building-content').querySelectorAll('[data-recipe]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'produce',recipe:btn.dataset.recipe,count:batchCounts[btn.dataset.recipe]??1});return `${r.count} ${r.count===1?'batch':'batches'} of ${recipeFor(state,r.recipe).name} started.`;})));
  function updateBatch(output){
   const id=output.dataset.batchCount,count=batchCounts[id],r=recipeFor(state,id),card=output.closest('.recipe-card'),max=Number(output.dataset.max);
   output.textContent=count;
   card.querySelector('[data-batch-step="-1"]').disabled=mutating||count<=1||!max;
   card.querySelector('[data-batch-step="1"]').disabled=mutating||count>=max;
   const most=card.querySelector('[data-batch-step="max"]');if(most)most.disabled=mutating||count>=max;
   const multiply=items=>Object.fromEntries(Object.entries(items).map(([k,n])=>[k,n*count]));
   card.querySelector('.recipe-flow .ingredients').innerHTML=costList(id,count);
   card.querySelector('.recipe-output').innerHTML=itemList(multiply(r.output));
   if(max)card.querySelector('.recipe-footer>span').textContent=`+${r.xp*count} XP`;
   const value=recipeValue(id,farmNow(),state);
   // A recipe that costs coins (the Village Fields' sowing) shows its profit too: recipeValue counts the coins in, and the coins are one
   // of the ingredients below, so a "Costs N coins" line here said the same thing twice (10 Oct 2026).
   card.querySelector('.recipe-value').innerHTML=`${art('coins')}<strong>${signed(value.added*count)}</strong> profit`;
   card.querySelector('[data-recipe]').textContent=`Start ${count} ${count===1?'batch':'batches'}`;
  }
  $('building-content').querySelectorAll('[data-batch-step]').forEach(button=>button.addEventListener('click',()=>{
   const id=button.dataset.forRecipe,output=$('building-content').querySelector(`[data-batch-count="${id}"]`);
   const most=Number(output.dataset.max);batchCounts[id]=button.dataset.batchStep==='max'?Math.max(1,most):Math.max(1,Math.min(most,batchCounts[id]+Number(button.dataset.batchStep)));updateBatch(output);icons();
  }));
  $('building-content').querySelectorAll('[data-batch-count]').forEach(updateBatch);
  icons();
 }
 async function mutate(action){if(mutating)return;mutating=true;$('building-content').setAttribute('aria-busy','true');$('building-content').querySelectorAll('button').forEach(b=>b.disabled=true);try{const message=await action();onChange();renderBuilding();$('building-feedback').textContent=message;notify(message);return {ok:true,message};}catch(e){$('building-feedback').textContent=e.message;notify(e.message);return {error:e.message};}finally{mutating=false;const message=$('building-feedback').textContent;renderBuilding();$('building-feedback').textContent=message;$('building-content').removeAttribute('aria-busy');}}
 // opening (Plan F, 13 Oct 2026, proposal 5): the Market button opens on Crops when Farm goods has nothing to sell (it stayed on the last
 // tab: after the first eggs were sold, Market opened on an empty Farm goods while the corn waited under Crops).
 function renderMarket({opening=false}={}){
  if(opening&&!village&&marketTab==='goods'&&!marketItems(state,'goods').some(k=>sellableStock(state,k,farmNow())>0))marketTab='crops';
  const now=farmNow(),entries=marketEntries(),multiplier=state.boosts.coinsUntil>now?2:1;
  renderedMarketDay=utcDay(now);
  // Tomorrow's outlook (back on 1 Oct 2026, the player missed it): the item whose price rises most tomorrow, to plant or make for.
  $('market-outlook').hidden=false;
  // The Village market's sell list leads to the market square, where villagers pay more (Oct 2026); it has no farm prices of the day.
  if(world===3){$('market-outlook').innerHTML=`<div class="market-board-link"><span>Ships at the quays pay twice what goods are worth.</span><button type="button" id="market-square">Harbour office →</button></div>`;$('market-square').onclick=()=>{$('market-dialog').close();onPlace?.('harbouroffice');};}
  else if(village){$('market-outlook').innerHTML=`<div class="market-board-link"><span>${villagePremium(state)===VILLAGE_PREMIUM?'Villagers pay half again at the market square.':`Villagers pay ${VILLAGE_HALL_PREMIUM} times at the market square.`}</span><button type="button" id="market-square">Market square →</button></div>`;$('market-square').onclick=()=>{$('market-dialog').close();onPlace?.('villagemarket');};}
  else{
  // The market pick's price is doubled before the first sale too (20 Oct 2026), like every price under the first-sale line.
  const {today,tomorrow}=marketHighlights(now,state),tomorrowChange=`${signed(tomorrow.change)}%`;
  $('market-outlook').innerHTML=`<div class="market-outlook-heading"><span id="market-countdown"></span></div><div class="market-highlight">${art(today.item)}<div><strong>${ITEMS[today.item].name}</strong><span>${number(today.price*(firstSaleDouble(state)?2:1))} coins each · ${today.label}</span></div><b class="demand-pill ${today.demand}">${signed(today.change)}%</b></div><p class="market-forecast">Tomorrow’s outlook: <strong>${ITEMS[tomorrow.item].name}</strong> · ${tomorrowChange} expected.</p><div class="market-board-link"><span>The Valley Market pays 1.5× for a full basket.</span><button type="button" id="market-valley">Valley Market →</button></div>`;
  $('market-valley').closest('.market-board-link').hidden=!featureUnlocked(state,'valleymarket');
  $('market-valley').onclick=()=>{$('market-dialog').close();document.querySelector('[data-menu-utility="valleymarket"]').click();};
  }
  // What you can sell gets a card with its controls; what you do not have yet is a compact price list, never a row of greyed-out buttons.
  // The demand label only when it matters (high or low demand); a fair price needs no label (30 Sep 2026).
  // Just one in stock (25 Oct 2026, the owner: "dit ziet er wat rommelig uit als je 1 maar good/crop hebt"): the same card as the rest,
  // one Sell and To bin, no amount to pick (mobile-windows.css no longer opens the picker for it on a computer).
  // The starter corn, feed and barley kept for the first half hour say why (Plan F, 13 Oct 2026: "8 kept, free in 29 min" gave no reason).
  // The shipping bin (24 Oct 2026, farm-state.js shipBinAdd): on the farm's Market from its level, a line at the top with what is in it and
  // what it pays at 00:00 UTC (10% on top of today's price), this morning's pay, and each item with Take back; "To bin" on every card.
  const binOn=!village&&featureUnlocked(state,'shipbin'),binRoom=binOn?Math.max(0,shipBinRoom(state)-shipBinCount(state)):0;
  const binBlock=()=>{
   if(!binOn)return '';
   const count=shipBinCount(state),paid=state.shipPaid?.day===utcDay(now)?state.shipPaid:null,items=Object.entries(state.shipBin?.items??{}).filter(([,n])=>n>0);
   const line=count?`${number(count)} / ${number(shipBinRoom(state))} in the bin, ${number(state.shipBin.coins)} coins at 00:00 UTC`:`Today's price plus ${Math.round(SHIP_BIN_BONUS*100)}%, paid at 00:00 UTC.`;
   return `<section class="ship-bin">${art('shipping-bin')}<div class="ship-bin-copy"><strong>Shipping bin</strong><small>${line}</small>${paid?`<small class="ship-bin-paid">Paid this morning: +${number(paid.coins)} coins</small>`:''}</div></section>`
    // What is in it, always in view with Take back (24 Oct 2026, the owner: "Hoe haal ik ze nou uit mijn bin": a closed fold hid it).
    +(items.length?`<div class="ship-bin-items">${items.map(([k,n])=>`<div class="ship-bin-row">${itemArt(k)}<span><strong>${ITEMS[k].name}</strong><small>${number(n)} in the bin</small></span><button type="button" class="small-button" data-bin-take="${k}" ${marketSelling?'disabled':''}>Take back</button></div>`).join('')}</div>`:'');
  };
  const card=([key,c])=>{const q=marketQuote(key,now),stock=sellableStock(state,key,now),kept=keptStock(state,key,now),quantity=stock?Math.min(stock,Math.max(1,sellQuantities[key]??1)):0,open=openSaleRows.has(key)&&stock>1;sellQuantities[key]=quantity;return `<div class="market-row dynamic-market-row market-card${open?' is-open':''}">${itemArt(key)}<div class="market-item-copy"><strong>${c.name}</strong><span class="market-current-price">${art('coins')}<b>${number(marketPay(state,q.price,now))}</b> each${vipActive(state,now)?' · VIP +5%':''}${multiplier===2?'<span class="sr-only"> · 2× boost</span>':''}</span>${q.demand==='fair'||!q.demand||q.label==='Fair price'?'':`<span class="demand-pill ${q.demand}" title="Normal ${number(q.normal)} · range ${number(q.min)}–${number(q.max)}"><span class="sr-only">${q.label} · </span>${signed(q.change)}%</span>`}${kept?`<small class="market-kept">${number(kept)} kept for your first buildings, free in ${rookieTimeLeft(rookieLeft(state,now))}</small>`:''}</div><div class="market-stock"><b>${number(stock)}</b><small>${kept?`${number(kept)} kept`:'in stock'}</small></div><div class="market-quick"><button type="button" class="small-button market-quick-sell" data-sell-item-all="${key}" ${marketSelling?'disabled':''}>${stock>1?`Sell all ${number(stock)}`:'Sell'}</button>${stock>1?`<button type="button" class="market-amount-toggle" data-sell-amount="${key}" aria-expanded="${open}" aria-controls="sell-controls-${key}">${open?'Hide':'Pick amount'}</button>`:''}${binOn&&shipBinItem(key)?`<button type="button" class="market-bin-button" data-bin="${key}" data-bin-count="${Math.min(stock,binRoom)}" ${marketSelling||!binRoom?'disabled':''}>${art('shipping-bin')}To bin</button>`:''}</div><div class="market-sale-controls" id="sell-controls-${key}"><label for="sell-quantity-${key}"><span>${kept?`${number(kept)} kept for your first buildings, free in ${rookieTimeLeft(rookieLeft(state,now))}`:'How many to sell'}</span><output id="sell-count-${key}">${quantity} selected</output></label><input id="sell-quantity-${key}" data-sell-range="${key}" type="range" min="1" max="${stock}" step="1" value="${quantity}" aria-label="Quantity of ${c.name} to sell" ${marketSelling||stock<2?'disabled':''}><div class="market-sale-buttons"><button class="small-button market-sell-some" data-sell="${key}" ${marketSelling?'disabled':''}>Sell ${number(quantity)} · ${art('coins')}${number(marketPay(state,quantity*q.price,now))}</button><button class="small-button" data-sell-item-all="${key}" ${marketSelling?'disabled':''}>Sell all ${number(stock)}</button>${binOn&&shipBinItem(key)?`<button class="small-button market-bin-some" data-bin="${key}" data-bin-count="${Math.min(quantity,binRoom)}" ${marketSelling||!binRoom?'disabled':''}>To bin ${number(Math.min(quantity,binRoom))}</button>`:''}</div></div></div>`;};
  const inStock=entries.filter(([key])=>sellableStock(state,key,now)>0),empty=entries.filter(([key])=>sellableStock(state,key,now)<=0);
  keepFolds($('market-items'),binBlock()+(inStock.length?inStock.map(card).join(''):`<div class="quest-empty market-empty">${art(marketTab==='crops'?'wheat':marketTab==='harbour'?'rope':marketTab==='village'?'stone':'feed')}<h3>Nothing to sell yet</h3><p>${marketTab==='crops'?'Harvest your fields, then sell your crops here.':marketTab==='harbour'?'Make rope, barrels and more in the harbour’s places, then sell them here.':marketTab==='village'?'Dig, chop and forge in the village, then sell the goods here.':'Collect batches from your buildings, then sell the goods here.'}</p><button type="button" class="primary-button" data-market-empty>${marketTab==='crops'?'Go to your fields':marketTab!=='crops'&&village?'Open places':'Open buildings'}</button></div>`)
   +(empty.length?`<details class="fold market-not-in-stock" data-fold="market-not-in-stock"><summary><span class="market-empty-title">Not in stock · today’s prices</span><span class="tag-info">${empty.length}</span></summary><div class="market-price-list">${empty.map(([key,c])=>{const q=marketQuote(key,now);return `<div class="market-price-tile">${itemArt(key)}<span><strong>${c.name}</strong><small>${art('coins')}${number(marketPay(state,q.price,now))}<em class="demand-dot ${q.demand}" title="${q.label} · ${signed(q.change)}%"></em></small></span></div>`;}).join('')}</div></details>`:''));
  // One line for the boost of the whole market (18 Oct 2026), instead of "2× boost" on every row; the barn's count in the heading.
  $('market-boost').hidden=multiplier!==2;
  // The first sale pays double (20 Oct 2026, farm-state.js firstSaleDouble): one line says why every price here is doubled.
  $('market-first-sale').hidden=village||!firstSaleDouble(state);
  // The Warehouse (22 Oct 2026): how full it is, in the heading, and a tap opens it (every item counts, village goods too).
  {const tone=warehouseFull(state)?'full':warehouseNearFull(state)?'near':'ok',el=$('market-barn');el.hidden=false;el.innerHTML=`<button type="button" class="warehouse-chip is-${tone}" data-open-warehouse>${art('warehouse')}<span>Warehouse ${number(storedCount(state))} / ${number(warehouseCapacity(state))}</span></button>`;el.querySelector('[data-open-warehouse]').onclick=()=>onWarehouse?.();}
  const total=categoryTotal(now);$('inventory-value').innerHTML=`${art('coins')}${number(total)} coins`;$('sell-all').disabled=!total||marketSelling;$('sell-all').textContent=marketSelling?'Selling…':marketTab==='harbour'?'Sell all harbour goods':marketTab==='village'?'Sell all village goods':`Sell all ${marketTab==='crops'?'crops':'goods'}`;
  document.querySelectorAll('[data-market-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.marketTab===marketTab);b.setAttribute('aria-pressed',String(b.dataset.marketTab===marketTab));b.disabled=marketSelling;});
  $('market-items').querySelectorAll('[data-bin]').forEach(b=>b.addEventListener('click',()=>toBin(b.dataset.bin,Number(b.dataset.binCount))));
  $('market-items').querySelectorAll('[data-bin-take]').forEach(b=>b.addEventListener('click',()=>toBin(b.dataset.binTake,0,true)));
  $('market-items').querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sell,sellQuantities[b.dataset.sell])));$('market-items').querySelectorAll('[data-sell-item-all]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sellItemAll)));
  $('market-items').querySelectorAll('[data-sell-amount]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.sellAmount,open=!openSaleRows.has(key);if(open)openSaleRows.add(key);else openSaleRows.delete(key);b.closest('.market-card').classList.toggle('is-open',open);b.setAttribute('aria-expanded',String(open));b.textContent=open?'Hide':'Pick amount';}));
  $('market-items').querySelectorAll('[data-sell-range]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.sellRange,quantity=Number(input.value);sellQuantities[key]=quantity;$(`sell-count-${key}`).textContent=`${number(quantity)} selected`;$('market-items').querySelector(`[data-sell="${key}"]`).innerHTML=`Sell ${number(quantity)} · ${art('coins')}${number(marketPay(state,quantity*marketQuote(key,now).price,now))}`;}));
  $('market-items').querySelector('[data-market-empty]')?.addEventListener('click',()=>{$('market-dialog').close();if(marketTab!=='crops')openBuildings();});
  marketCountdown(now);icons();
 }
 function marketCountdown(now){const el=$('market-countdown');if(el)el.textContent=`New prices in ${seconds(marketQuote('oil',now).resetsAt-now)} · 00:00 UTC`;}
 // What "Sell all" would bring in right now for the tab that is open.
 // Heirlooms from the Seed Lab sell with the crops, once found or in stock (27 Sep 2026).
 function marketEntries(){return marketItems(state,marketTab).map(k=>[k,ITEMS[k]]);}
 function categoryTotal(now=farmNow()){return marketWorth(state,marketTab,now);}
 let confirmingSale=false;
 // Into the shipping bin, or all of one item back out of it.
 async function toBin(key,count,back=false){
  if(marketSelling)return;marketSelling=true;renderMarket();try{
   const r=await runAction(back?{type:'bin_take',item:key}:{type:'bin_add',item:key,count});onChange();
   notify(back?`${number(r.count)} ${ITEMS[key].name} back in your Warehouse.`:`In the shipping bin: ${number(r.count)} ${ITEMS[key].name}. ${number(r.total)} coins at 00:00 UTC.`);
  }catch(e){notify(e.message);}finally{marketSelling=false;renderMarket();}
 }
 async function sell(key='category',quantity,from=null){
  if(marketSelling||confirmingSale)return;
  // Selling a whole tab is one tap that empties the barn, so it asks first. Selling one item stays a single tap.
  if(key==='category'){
   const label=marketTab==='crops'?'crops':marketTab==='harbour'?'harbour goods':marketTab==='village'?'village goods':'goods',total=categoryTotal();confirmingSale=true;
   const sure=await confirmAction({title:`Sell all your ${label}?`,description:`Are you sure you want to sell all your ${label} for ${number(total)} coins?`,confirmLabel:`Sell for ${number(total)} coins`,cancelLabel:'Keep them',picture:'market'}).finally(()=>{confirmingSale=false;});
   if(!sure)return;
  }
  // Where the coins fly from after the first sale: the button that was tapped, read before the list is drawn again.
  const tapped=from??[...document.querySelectorAll(key==='category'?'#sell-all':`#market-items [data-sell-item-all="${key}"],#market-items [data-sell="${key}"]`)].map(b=>b.getBoundingClientRect()).find(b=>b.width&&b.height);
  const day=renderedMarketDay||utcDay(farmNow()),category=marketTab;marketSelling=true;renderMarket();
  try{
   const r=await runAction(key==='category'?{type:'sell',category,day}:{type:'sell',item:key,day,...(category==='village'||category==='harbour'?{category}:{}),...(quantity===undefined?{}:{quantity})});
   onChange();notify(r.firstSale?`Double coins for your first sale! +${number(r.coins)} coins.`:`Sold! +${number(r.coins)} coins for your next harvest.`);
   if(r.guide?.some(step=>step.step==='sell'))firstSale(tapped);
   return r;
  }catch(e){notify(e.message);return {error:e.message};}finally{marketSelling=false;renderMarket();}
 }
 // The guide's first sale (7 Oct 2026, the owner's choice: a third of new farmers never got past it, and its "Sold!" and the next step
 // were hidden behind the window, which stayed open): the Market closes and the coins fly from the button to the coin counter, so the
 // reward and the guide's next step are in sight. Only the flight is skipped when motion is reduced.
 function firstSale(from){
  $('market-dialog').close();
  const counter=[...document.querySelectorAll('.coin-counter')].find(el=>el.getBoundingClientRect().width>0);
  if(!counter||!from||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const to=counter.getBoundingClientRect();
  flyHarvest({from:{x:from.left+from.width/2,y:from.top+from.height/2},to:{x:to.left+to.width/2,y:to.top+to.height/2},html:art('coins'),count:5,onArrive:()=>bump(counter)});
 }
 function refresh(){
  $('selected-crop-price').innerHTML=cropPrice(selectedCrop);
  if($('building-dialog').open)renderBuilding();
  if($('seed-dialog').open)renderSeeds();
  const count=Object.keys(BUILDINGS).filter(key=>inWorld(key)&&status(key).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('market-dialog').open)renderMarket();
  if($('buildings-dialog').open)renderCatalog();
 }
 function tick(){
  const now=farmNow(),day=utcDay(now);
  if(day!==lastMarketDay){lastMarketDay=day;if($('market-dialog').open)renderMarket();if($('seed-dialog').open)renderSeeds();if($('building-dialog').open)renderBuilding();}
  if($('market-dialog').open)marketCountdown(now);
  const coinBoost=`${state.boosts.coinsUntil>now}:${vipActive(state,now)}`;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('market-dialog').open)renderMarket();if($('seed-dialog').open)renderSeeds();if($('building-dialog').open)renderBuilding();}
  // The chips in the Buildings list are written again only when what they say changes (a count, the next time), like the places' line.
  document.querySelectorAll('[data-building-status]').forEach(el=>{const key=el.dataset.buildingStatus,s=status(key,now);if(el.classList.contains('building-chips')){const html=buildingChips(s);if(el.dataset.html!==html){el.dataset.html=html;el.innerHTML=html;}return;}const text=s.text,kind=`building-status ${s.kind}`;if(el.dataset.text!==text&&!el.querySelector('.game-art')){el.dataset.text=text;el.textContent=text;}if(el.className!==kind)el.className=kind;});
  // A building that finishes while the list is open moves to the top, and one that runs out of goods (or gets them) moves to or from the
  // bottom; the places keep their line up to date.
  const readyKeys=Object.keys(BUILDINGS).map(key=>{const kind=status(key,now).kind;return kind==='ready'||kind==='missing'?`${key}:${kind}`:'';}).filter(Boolean).join();
  if($('buildings-dialog').open&&readyKeys!==lastReadyKeys){const y=$('buildings-dialog').scrollTop;renderCatalog();$('buildings-dialog').scrollTop=y;}
  lastReadyKeys=readyKeys;
  document.querySelectorAll('[data-square-status]').forEach(el=>{const s=squareStatus(state,now);if(el.dataset.text!==s.text){el.dataset.text=s.text;el.textContent=s.text;el.className=`building-status ${s.kind}`;}});
  document.querySelectorAll('[data-lake-status]').forEach(el=>{const s=lakeStatus(now);if(el.dataset.text!==s.text){el.dataset.text=s.text;el.textContent=s.text;el.className=`building-status ${s.kind}`;}});
  document.querySelectorAll('[data-place-status]').forEach(el=>{const s=placeStatus(el.dataset.placeStatus,now);const html=(s.kind==='locked'?art('lock','unlock-lock'):'')+s.text;if(el.dataset.text!==html){el.dataset.text=html;el.innerHTML=html;el.className=`building-status ${s.kind}`;}});
  const count=Object.keys(BUILDINGS).filter(key=>inWorld(key)&&status(key,now).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('building-dialog').open&&currentBuilding){
   const jobs=productionJobs(state.buildings[currentBuilding]),signature=jobs.map(j=>`${j.id}:${now>=j.readyAt}`).join('|');
   if(signature!==lastJobReady)renderBuilding();
   else for(const job of jobs){
    const time=document.querySelector(`[data-job-time="${job.id}"]`),progress=document.querySelector(`[data-job-progress="${job.id}"]`);
    if(time)time.textContent=now>=job.readyAt?(warehouseFull(state)?'Full':'Ready'):`${seconds(job.readyAt-now)} left`;
    if(progress)progress.value=Math.max(0,Math.min(100,(now-job.startedAt)/Math.max(1,job.readyAt-job.startedAt)*100));
   }
  }
 }
 // The crop button ("Wheat ⌄") opens the seed shop; there is no separate Seed shop button any more.
 $('selected-crop-button').addEventListener('click',openSeeds);
 $('buildings-button').addEventListener('click',openBuildings);$('all-buildings').addEventListener('click',openBuildings);
 document.querySelectorAll('[data-seed-filter]').forEach(b=>b.addEventListener('click',()=>{seedFilter=b.dataset.seedFilter;renderSeeds();}));
 document.querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{marketTab=b.dataset.marketTab;renderMarket();}));
 // In the village the market is the Village market: one list, its own heading, no farm tabs or farm prices of the day. In the harbour
 // (27 Oct 2026) it is the Harbour market the same way, which buys only harbour goods.
 if(village){const d=$('market-dialog'),harbour=world===3;const kicker=d.querySelector('.eyebrow');if(kicker)kicker.textContent=harbour?'MADE ON THE QUAYS':'DUG, CHOPPED AND FORGED';d.querySelector('h2').textContent=harbour?'Harbour market':'Village market';d.querySelector('.market-tabs').hidden=true;
  const b=$('buildings-dialog');if(b){const e=b.querySelector('.dialog-heading .eyebrow'),h=b.querySelector('.dialog-heading h2');if(e)e.textContent=harbour?'THE HARBOUR':'THE VILLAGE';if(h)h.textContent=harbour?'Harbour places':'Village places';}
  const back=$('all-buildings');if(back)back.lastChild.textContent=' All places';}
 return {openMarket:(tab='crops')=>{marketTab=world===3?'harbour':village?'village':tab==='village'?'crops':tab;renderMarket();show('market-dialog');},placeReady:key=>key in PLACES&&placeStatus(key).kind==='ready',openBuilding,openBuildings,openSeeds,renderBuilding,renderMarket,sell,refresh,tick,status,chooseCrop,itemList};
}
