import {foldLocked} from './progression-ui.js';
import {sellableStock,keptStock,rookieLeft,marketSaleValue,vipActive,buildingCost,constructionNeeds,recipeUnlocked,diamondUpgradeCost,itemAvailable,recipeUnlockHint,guidedFarm,buildingEligible,buildingUnlockHint,BUILDING_LEVELS,cropUnlockHint,featureUnlocked,CROPS,PRODUCTS,ITEMS,BUILDINGS,RECIPES,MAX_PLOTS,recipeAvailability,upgradeCost,expansionCost,expansionLevel,seedCost,formatDuration,cropDuration,recipeDuration,productionSpeed,MAX_BUILDING_LEVEL,upgradeRequirements,expansionMaterials,productionSlots,productionJobs,recipeValue,marketQuote,marketHighlights,utcDay,levelOf,cropUnlocked,buildingUnlocked} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {rookieTimeLeft} from './rookie-ui.js';
import {art,refreshArt} from './visual-icons.js';
import {fieldPicker,bindFieldPicker} from './field-picker.js';
import {confirmAction} from './confirm-dialog.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const seconds=formatDuration;
export function createEconomyUI({state,onChange,onCrop,onExpand,notify,runAction,onEstate,onFamily}){
 const openFactoryGroups=new Set();let factoryFilter='all';
 let currentBuilding=null,marketTab='crops',selectedCrop='wheat',seedFilter='all',lastJobReady='',lastCoinBoost=false,mutating=false;
 let marketSelling=false,renderedMarketDay='',lastMarketDay=utcDay(farmNow());
 const number=n=>n.toLocaleString('en-US');
 const signed=n=>`${n>=0?'+':''}${number(n)}`;
 const sellQuantities={};
 const batchCounts={},fertilizerFields=new Set();
 function itemArt(key){return art(key,'product-art');}
 function show(id){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();}
 // What a batch costs: the ingredients, and for bottled honey the coins (the Factory).
 function costList(id,n=1){const r=RECIPES[id];return itemList(Object.fromEntries(Object.entries(r.input).map(([k,v])=>[k,v*n])),true)+(r.coins?`<span class="ingredient ${state.coins<r.coins*n?'missing':''}">${art('coins')}<span>${number(r.coins*n)} coins</span></span>`:'');}
 function itemList(items,requirements=false){return Object.entries(items).map(([key,n])=>`<span class="ingredient ${requirements&&state.inventory[key]<n?'missing':''}">${itemArt(key)}<span>${requirements?`${state.inventory[key]}/${n}`:`${n}×`} ${ITEMS[key].name}</span></span>`).join('');}
 function status(key,now=farmNow()){
  const b=state.buildings[key];if(key==='farmhouse')return {text:`${state.plots.length} / ${MAX_PLOTS} fields`,kind:'farm'};
  if(key==='familyhall')return buildingEligible(state,key)?{text:'Your weekly order & family',kind:'family'}:{text:`Locked · ${buildingUnlockHint(state,key)}`,kind:'locked'};
  const jobs=productionJobs(b),slots=productionSlots(b.level,key),ready=jobs.filter(j=>now>=j.readyAt).length;
  if(!buildingUnlocked(state,key))return {text:!buildingEligible(state,key)?`Locked · ${buildingUnlockHint(state,key)}`:`Open for ${number(buildingCost(state,key))} coins`,kind:buildingEligible(state,key)?'available':'locked'};
  if(!jobs.length)return {text:`Ready to work · 0 / ${slots} slots`,kind:'idle'};
  if(ready)return {text:`${ready} ready · ${jobs.length} / ${slots} slots`,kind:'ready'};
  return {text:`${jobs.length} / ${slots} working · ${seconds(Math.min(...jobs.map(j=>j.readyAt))-now)}`,kind:'working'};
 }
 function chooseCrop(key){if(!cropUnlocked(state,key)){notify(cropUnlockHint(state,key));return;}selectedCrop=key;$('selected-crop-art').innerHTML=art(key);$('selected-crop-name').textContent=CROPS[key].name;$('selected-crop-price').textContent=`${seedCost(state,key)} · ${seconds(cropDuration(state,key,false,farmNow()))}`;onCrop(key);}
 function renderSeeds(){
  document.querySelectorAll('[data-seed-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.seedFilter===seedFilter);b.setAttribute('aria-pressed',String(b.dataset.seedFilter===seedFilter));});
  $('crop-catalog').innerHTML=Object.entries(CROPS).sort((a,b)=>a[1].duration-b[1].duration).filter(([,c])=>seedFilter==='all'||(seedFilter==='quick'?c.duration<=900000:seedFilter==='later'?c.duration>900000&&c.duration<28800000:c.duration>=28800000)).map(([key,c])=>{
   const paceTitle=c.perennial?`Plant once · First harvest ${seconds(cropDuration(state,key,false,farmNow()))}\nThen ${seconds(cropDuration(state,key,true))} after each collection.\nOne harvest waits; no offline stockpiling.`:'';
   // One compact row per crop, like the market: picture, name (plus "Regrows" for orchard crops), time and today's price,
   // the seed price on the right. The filter tabs already say how quick a crop is.
   const locked=!cropUnlocked(state,key);
   return `<button class="seed-row crop-${key} ${selectedCrop===key?'selected':''} ${locked?'is-locked':''}" data-choose-crop="${key}" ${locked?'disabled':''} aria-pressed="${selectedCrop===key}"${paceTitle?` title="${paceTitle}"`:''}><span class="seed-row-art">${art(key)}</span><span class="seed-row-copy"><strong>${c.name}${c.perennial?'<em class="seed-pace is-regrow">Regrows</em>':''}</strong><small>${locked?`${art('lock','unlock-lock')} ${cropUnlockHint(state,key)}`:`${seconds(cropDuration(state,key,false,farmNow()))} · sells for ${marketQuote(key,farmNow()).price}`}</small></span><span class="seed-row-price">${art('coins')}${seedCost(state,key)}</span>${selectedCrop===key?'<span class="seed-row-check" aria-hidden="true">✓</span>':''}</button>`;
  }).join('');
  if(guidedFarm(state))foldLocked($('crop-catalog'),'[data-choose-crop]',b=>!cropUnlocked(state,b.dataset.chooseCrop),'Seeds to unlock');
  $('crop-catalog').querySelectorAll('[data-choose-crop]').forEach(b=>b.addEventListener('click',()=>{chooseCrop(b.dataset.chooseCrop);$('seed-dialog').close();notify(`${CROPS[b.dataset.chooseCrop].name} selected. Choose an empty field to plant.`);}));icons();
 }
 function openSeeds(){renderSeeds();show('seed-dialog');}
 function renderCatalog(){
  const buildingLevel=key=>guidedFarm(state)?BUILDING_LEVELS[key]:BUILDINGS[key].minLevel??1;
  $('building-catalog').innerHTML=Object.entries(BUILDINGS).sort(([a],[b])=>buildingLevel(a)-buildingLevel(b)).map(([key,b])=>{const s=status(key),picture=key==='familyhall'?'familyhall-model':key;return `<button class="building-card" data-open-building="${key}"><img src="/assets/icons/${picture}.png" alt=""><span class="building-card-info"><strong>${b.name}</strong><small>${key==='familyhall'?'Weekly orders & tournament':!buildingUnlocked(state,key)?'New production building':`Level ${state.buildings[key].level}${key==='farmhouse'?' · Expand your fields':` · ${Object.entries(RECIPES).filter(([id,r])=>r.building===key&&recipeUnlocked(state,id)).length} recipes ready`}`}</small><span class="building-status ${s.kind}" data-building-status="${key}">${s.kind==='locked'?art('lock','unlock-lock'):''}${s.text}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('');
  if(guidedFarm(state))foldLocked($('building-catalog'),'[data-open-building]',b=>!buildingEligible(state,b.dataset.openBuilding),'Buildings to unlock');
  $('building-catalog').querySelectorAll('[data-open-building]').forEach(b=>b.addEventListener('click',()=>openBuilding(b.dataset.openBuilding)));icons();
 }
 function openBuildings(){renderCatalog();show('buildings-dialog');}
 function openBuilding(key){if(!Object.hasOwn(BUILDINGS,key))return;if(key==='familyhall'){if(!buildingEligible(state,key)){notify(buildingUnlockHint(state,key));return;}onFamily();return;}currentBuilding=key;renderBuilding();show('building-dialog');}
 function renderBuilding(){
  if(!currentBuilding)return;
  const picker=$('fertilizer-field-picker'),pickerOpen=picker?.open,pickerScroll=picker?.querySelector('.field-picker-options')?.scrollTop??0;
  const key=currentBuilding,b=BUILDINGS[key],bs=state.buildings[key],buildCost=buildingCost(state,key);
  let content=`<div class="building-hero"><div class="building-image"><img src="/assets/icons/${key}.png" alt=""></div><div><span class="eyebrow">LEVEL ${bs.level}${key==='farmhouse'?' · YOUR HOMESTEAD':' · FARM PRODUCTION'}</span><h2 id="building-title">${b.name}</h2><p>${b.tagline}</p></div></div>`;
  // Shared by both the pre-purchase preview and the working recipe list below: the Factory repeats every other
  // building's whole catalogue, so both of its recipe lists get grouped and collapsed by source; every other
  // building's own, much shorter list stays exactly the flat list it always was.
  const buildingOrder=Object.keys(BUILDINGS),sourceOf=r=>r.base?buildingOrder.indexOf(RECIPES[r.base].building):-1;
  const sourceKey=r=>r.base?RECIPES[r.base].building:'honey';
  const sourceLabel=r=>r.base?BUILDINGS[RECIPES[r.base].building].name:'Honey bottling';
  // Each source reads at a glance: its building, what it makes, how many recipes and how many you can start now.
  // Open groups stay open when the list re-renders (after starting or collecting a batch).
  const foldFactoryGroups=(entries,cardOf,{ready=()=>false}={})=>{
   const groups=new Map();
   for(const [rid,r] of entries.sort(([,a],[,b])=>sourceOf(a)-sourceOf(b))){
    const source=sourceKey(r);if(!groups.has(source))groups.set(source,{label:sourceLabel(r),cards:[],outputs:[],ready:0});
    const g=groups.get(source);g.cards.push(cardOf(rid,r));g.outputs.push(Object.keys(r.output)[0]);if(ready(rid))g.ready++;
   }
   return [...groups].map(([source,g])=>`<details class="factory-recipe-group ${g.ready?'has-ready':''}" data-factory-group="${source}" ${openFactoryGroups.has(source)?'open':''}><summary><span class="factory-source-art">${art(source)}</span><span class="factory-source-copy"><strong>${g.label}</strong><small><span class="factory-source-goods">${[...new Set(g.outputs)].slice(0,4).map(item=>art(item)).join('')}</span>${g.cards.length} ${g.cards.length===1?'recipe':'recipes'}</small></span>${g.ready?`<em class="factory-ready">${g.ready} ready</em>`:''}<i class="factory-chevron" data-lucide="chevron-down" data-line-icon></i></summary><div class="factory-recipe-group-cards">${g.cards.join('')}</div></details>`).join('');
  };
  if(key==='farmhouse'){
   const cost=expansionCost(state),materials=expansionMaterials(state),hasMaterials=Object.entries(materials).every(([k,n])=>state.inventory[k]>=n),needLevel=expansionLevel(state),levelOk=levelOf(state)>=needLevel;
   content+=`<div class="expansion-panel"><div class="expansion-summary"><span><i data-lucide="land-plot"></i> Your growing space</span><strong>${state.plots.length}<small> / ${MAX_PLOTS} fields</small></strong></div><div class="field-preview" aria-hidden="true">${Array.from({length:MAX_PLOTS},(_,i)=>`<span class="${i<state.plots.length?'unlocked':'locked'}"><i data-lucide="${i<state.plots.length?'sprout':'lock-keyhole'}"></i></span>`).join('')}</div><h3>${cost?'Make room for one more.':'Your farm is fully expanded.'}</h3><p>${cost?`Unlock one field at a time. Each new field needs more coins and a different mix of farm supplies.${needLevel>1?' The last twelve fields are long-term goals: they also ask for a higher farm level.':''}`:`${MAX_PLOTS} fields, twelve crops and room to build a lasting estate.`}</p>${cost!==null?`<div class="ingredients expansion-materials">${itemList(materials,true)}</div>`:''}<button id="expand-fields" class="primary-button" ${cost===null||!levelOk||state.coins<cost||!hasMaterials?'disabled':''}>${cost?(levelOk?`Unlock 1 field · ${number(cost)} coins`:`Reach level ${needLevel} to unlock`):'All fields unlocked'}<i data-lucide="${cost?(levelOk?'plus':'lock-keyhole'):'check'}"></i></button>${cost!==null&&!levelOk?`<small class="shortfall">Field ${state.plots.length+1} unlocks at level ${needLevel}. You are level ${levelOf(state)}.</small>`:cost!==null&&state.coins<cost?`<small class="shortfall">You need ${number(cost-state.coins)} more coins.</small>`:''}</div>`;
   const plantings=state.plots.filter(p=>CROPS[p.crop]?.perennial);
   if(plantings.length||cropUnlocked(state,'apples')||cropUnlocked(state,'berries'))content+=`<section class="orchard-management"><h3>Your orchard plantings</h3><p>Each tree or bush holds one harvest. Pick it yourself to start the next cycle. Water and care each cycle for up to 3 fruit instead of 1. Nothing is collected, processed or sold while you are away.</p>${plantings.length?plantings.map(p=>`<div class="orchard-field">${art(p.crop)}<div><strong>Field ${p.id+1} · ${CROPS[p.crop].name}</strong><small>${p.readyAt<=farmNow()?'Ready to pick':`${seconds(p.readyAt-farmNow())} until picking`}</small><details class="remove-planting"><summary>Remove planting</summary><p>This clears the field and discards any fruit. Replanting costs ${seedCost(state,p.crop)} coins.</p><button type="button" class="small-button" data-clear-planting="${p.id}" data-planted-at="${p.plantedAt}">Confirm removal</button></details></div></div>`).join(''):'<p>Choose Apples or Berries in the seed shop to plant an orchard in an empty field.</p>'}</section>`;
   content+=`<button ${featureUnlocked(state,'projects')?'':'hidden'} id="farmhouse-estate" class="estate-entry"><i data-lucide="landmark"></i><span><strong>Your next chapter</strong><small>Estate projects, passive income and mastery</small></span><i data-lucide="chevron-right"></i></button>`;
  }else if(!buildingUnlocked(state,key)&&!buildCost){
   content+=`<section class="construction-panel"><h3>Something to grow towards</h3><p>${buildingUnlockHint(state,key)}</p><p>This building opens automatically when you reach its milestone.</p></section>`;
  }else if(!buildingUnlocked(state,key)){
   const eligible=buildingEligible(state,key),needs=constructionNeeds(state,key),preview={...state,buildings:{...state.buildings,[key]:{...bs,built:true}}};
   const previewEntries=Object.entries(RECIPES).filter(([id,r])=>r.building===key&&recipeUnlocked(preview,id));
   // Bottled honey has no input at all — it is bought with coins — so without this it showed as a bare arrow
   // into a honey icon here, with no hint of the 5,000 coin cost that costList() already shows once built.
   const previewCard=(rid,r)=>`<div>${itemList(r.input)}${r.coins?`<span class="ingredient">${art('coins')}<span>${number(r.coins)} coins</span></span>`:''}<b>→</b>${itemList(r.output)}</div>`;
   const previewRecipes=key==='factory'?foldFactoryGroups(previewEntries,previewCard):previewEntries.map(([rid,r])=>previewCard(rid,r)).join('');
   content+=`<section class="construction-panel"><span class="eyebrow">NEW PRODUCTION CHAIN</span><h3>${eligible?'Bring this building to life':buildingUnlockHint(state,key)}</h3><p>Open ${b.name} for ${number(buildCost)} coins. Starts at level 1 with one batch slot; upgrades add one slot each.</p>${needs.length?`<p>First open ${needs.map(k=>BUILDINGS[k].name).join(' and ')} to supply this building.</p>`:''}<div class="construction-recipes${key==='factory'?' factory-recipe-list':''}">${previewRecipes}</div><button type="button" id="construct-building" class="primary-button" ${eligible&&state.coins>=buildCost&&!needs.length?'':'disabled'}>Open building · ${number(buildCost)} coins</button>${eligible&&state.coins<buildCost?`<p>You need ${number(buildCost-state.coins)} more coins.</p>`:''}</section>`;
  }else{
   if(key==='windmill' ||key==='bakery')content+=`<div class="milling-chain"><span>${art('wheat')} Grain</span><b>→</b><span>${art('grainmeal')} Grain meal</span><b>→</b><span>${art('flour')} Flour</span><b>→</b><span>${art('bread')} Fresh baking</span></div><p class="milling-note">${key==='windmill'?'Grain becomes meal, then flour for the Bakery.':'Flour comes from the Windmill.'}</p>`;
   const jobs=productionJobs(bs),slots=productionSlots(bs.level,key),ready=jobs.filter(j=>j.readyAt<=farmNow());
   lastJobReady=jobs.map(j=>`${j.id}:${farmNow()>=j.readyAt}`).join('|');
   content+=`<div class="production-capacity"><strong>${jobs.length} / ${slots} production slots used</strong><p>${key==='factory'?'The Factory gets a slot every two levels, up to five.':'Each building level adds one slot.'}</p></div>${ready.length>1?`<section class="collect-all-panel"><div class="collect-all-art">${art('collect-all')}</div><div class="collect-all-copy"><strong>${ready.length} batches ready</strong><span>Gather all finished goods from this building.</span></div><button type="button" id="collect-all-batches" class="primary-button" ${mutating?'disabled':''}>Collect all <span>${ready.length}</span></button></section>`:''}<div class="production-batches">`;
   for(const [index,job] of jobs.entries()){
    const recipe=RECIPES[job.recipe],isReady=farmNow()>=job.readyAt;
    // One row per running batch: what it makes, a bar and the time left; the Collect button only once it is ready.
    const made=job.output??recipe.output,first=Object.keys(made)[0];
    content+=`<div class="job-panel ${isReady?'ready':''}" data-production-job="${job.id}"><span class="job-art">${art(first)}</span><div class="job-copy"><strong>${recipe.name}</strong><span><b>${number(made[first])}×</b> · <span data-job-time="${job.id}">${isReady?'Ready to collect':`${seconds(job.readyAt-farmNow())} left`}</span></span><progress data-job-progress="${job.id}" max="100" value="${Math.max(0,Math.min(100,(farmNow()-job.startedAt)/Math.max(1,job.readyAt-job.startedAt)*100))}" aria-label="Batch ${index+1} production progress"></progress></div>${isReady?`<button data-collect-job="${job.id}" class="primary-button job-collect">Collect</button>`:''}</div>`;
   }
   content+='</div>';
   content+=`<div class="recipe-section-heading"><h3>What shall we make?</h3><span>Ingredients are used when you start.</span></div>`;
   const recipeCard=(rid,r)=>{
    const a=recipeAvailability(state,rid),duration=recipeDuration(state,rid,farmNow()),value=recipeValue(rid,farmNow()),count=Math.max(1,Math.min(batchCounts[rid]??1,a.maxCount||1));batchCounts[rid]=count;
    return `<article class="recipe-card ${a.canStart?'is-ready':''}" data-recipe-card="${rid}"><div class="recipe-head"><span class="recipe-art">${art(Object.keys(r.output)[0])}</span><div class="recipe-title"><h4>${r.name}</h4><div class="recipe-meta"><span><i data-lucide="clock-3"></i> ${seconds(duration)}</span><p class="recipe-value">${r.coins?`Costs ${number(r.coins)} coins`:`${art('coins')}<strong>${signed(value.added)}</strong> profit`}</p><span class="recipe-xp">${art('xp')}+${r.xp} XP</span></div></div></div><div class="recipe-flow-wrap"><div class="recipe-flow"><div class="ingredients">${costList(rid)}</div><i class="recipe-arrow" data-lucide="arrow-right"></i><div class="recipe-output">${itemList(r.output)}</div></div></div><div class="recipe-footer"><span>${a.locked?`${art('lock','unlock-lock')} Locked · ${recipeUnlockHint(state,rid)}`:a.busy?'All slots are occupied. Collect a finished batch first.':a.missing.length?'Gather the missing ingredients.':a.poor?`You need ${number(a.price)} coins for a batch.`:`+${r.xp} XP`}</span>${a.slots>1?`<div class="batch-picker"><span id="batch-label-${rid}">Batches</span><div class="batch-stepper" role="group" aria-labelledby="batch-label-${rid}"><button type="button" data-batch-step="-1" data-for-recipe="${rid}" aria-label="Fewer batches of ${r.name}" ${count<=1||!a.maxCount?'disabled':''}>−</button><output data-batch-count="${rid}" data-max="${a.maxCount}" aria-live="polite" aria-label="Number of batches for ${r.name}">${count}</output><button type="button" data-batch-step="1" data-for-recipe="${rid}" aria-label="More batches of ${r.name}" ${count>=a.maxCount?'disabled':''}>+</button></div><small>${a.maxCount} available${a.maxCount>2?` · <button type="button" class="batch-max" data-batch-step="max" data-for-recipe="${rid}" aria-label="Start the most batches of ${r.name}">Max</button>`:''}</small></div>`:''}<button class="small-button start-recipe" data-recipe="${rid}" ${a.canStart?'':'disabled'}>Start batch<i data-lucide="play"></i></button></div></article>`;
   };
   const recipeEntries=Object.entries(RECIPES).filter(([,r])=>r.building===key);
   // Every good any other building makes, in one huge batch — that is the Factory's whole point, but it also
   // means its recipe list is every other building's list combined. Grouped by where each good normally comes
   // from and collapsed (same helper as the pre-purchase preview above), so this reads as a short list of
   // sources instead of one very long scroll. Every other building's own, much shorter list stays flat.
   if(key==='factory'){
    // "Ready now" answers the question you open the Factory with: what can I start right away?
    const canStart=rid=>recipeAvailability(state,rid).canStart,readyEntries=recipeEntries.filter(([rid])=>canStart(rid));
    if(factoryFilter==='ready'&&!readyEntries.length)factoryFilter='all';
    content+=`<div class="market-tabs factory-filter" role="group" aria-label="Show recipes"><button type="button" data-factory-filter="all" aria-pressed="${factoryFilter==='all'}" class="${factoryFilter==='all'?'active':''}">All sources</button><button type="button" data-factory-filter="ready" aria-pressed="${factoryFilter==='ready'}" class="${factoryFilter==='ready'?'active':''}" ${readyEntries.length?'':'disabled'}>Ready now <span>${readyEntries.length}</span></button></div>`;
    content+=factoryFilter==='ready'?`<div class="recipe-list factory-ready-list">${readyEntries.map(([rid,r])=>recipeCard(rid,r)).join('')}</div>`:`<div class="recipe-list factory-recipe-list">${foldFactoryGroups(recipeEntries,recipeCard,{ready:canStart})}</div>`;
   }else content+=`<div class="recipe-list">${recipeEntries.map(([rid,r])=>recipeCard(rid,r)).join('')}</div>`;
   if(key==='windmill'){
    const eligible=state.plots.filter(p=>p.crop&&p.readyAt>farmNow()&&!p.fertilized);
    content+=`<section class="fertilizer-panel"><div>${art('fertilizer')}<h3>Give a field a head start</h3></div><p>Use 1 natural fertilizer to remove 35% of a crop’s remaining growing time. Once per growing cycle; watering and extra care still work.</p>${fieldPicker({id:'fertilizer-field-picker',plots:eligible,selected:[...fertilizerFields].filter(id=>eligible.some(p=>p.id===id)),multiple:true,now:farmNow(),available:state.inventory.fertilizer})}<div class="fertilizer-action"><span id="fertilizer-cost">${state.inventory.fertilizer} fertilizer in storage · 0 required</span><button id="fertilize-field" class="small-button" disabled>Fertilize selected fields</button></div></section>`;
   }
   const cost=upgradeCost(state,key),diamondCost=diamondUpgradeCost(state,key),estate=upgradeRequirements(state,key),next=bs.level+1;
   const estateLevelOk=!estate||levelOf(state)>=estate.level,estateSupplies=!estate||Object.entries(estate.materials).every(([item,n])=>(state.inventory[item]??0)>=n);
   const upgradeNote=cost?`${state.boosts.upgradeCredits?'50% voucher included. ':''}${productionSlots(next,key)} ${productionSlots(next,key)===1?'batch':'batches'} at once, ${Math.round(productionSpeed(next,key)*100)}% faster than level 1.`:`Level ${MAX_BUILDING_LEVEL}: ${slots} simultaneous batches; production takes ${Math.round(productionSpeed(MAX_BUILDING_LEVEL,key)*100)}% less time.`;
   content+=`<div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${cost?`${estate?'Estate upgrade':'Upgrade'} to level ${next}`:'Fully upgraded'}</strong><p>${upgradeNote}</p>${estate?`<div class="ingredients expansion-materials">${itemList(estate.materials,true)}</div>`:''}</div><div class="upgrade-payments"><button id="upgrade-building" class="small-button" ${cost===null||state.coins<cost||!estateLevelOk||!estateSupplies?'disabled':''}>${cost?`${art('coins')} ${number(cost)} coins`:'Max level'}</button>${diamondCost!==null&&featureUnlocked(state,'boosts')?`<span>or</span><button id="upgrade-building-diamonds" class="small-button diamond-option" ${mutating||state.diamonds<diamondCost||!estateLevelOk||!estateSupplies?'disabled':''}>${art('diamonds')} ${number(diamondCost)} diamonds</button><small>Same upgrade. Coins and vouchers are kept.</small>`:''}${estate&&!estateLevelOk?`<small class="shortfall">Level ${next} unlocks at farm level ${estate.level}. You are level ${levelOf(state)}.</small>`:estate&&!estateSupplies?`<small class="shortfall">Gather the finished goods above first.</small>`:cost!==null&&state.coins<cost?`<small class="shortfall">You need ${number(cost-state.coins)} more coins.</small>`:''}</div></div>`;
  }
  $('building-content').innerHTML=content;$('building-feedback').textContent='';
  const recipeList=$('building-content').querySelector('.recipe-list');if(recipeList&&guidedFarm(state))foldLocked(recipeList,'[data-recipe-card]',card=>recipeAvailability(state,card.dataset.recipeCard).locked,'Coming later');
  $('building-content').querySelectorAll('[data-factory-filter]').forEach(b=>b.addEventListener('click',()=>{factoryFilter=b.dataset.factoryFilter;renderBuilding();}));
  $('building-content').querySelectorAll('[data-factory-group]').forEach(g=>g.addEventListener('toggle',()=>{if(g.open)openFactoryGroups.add(g.dataset.factoryGroup);else openFactoryGroups.delete(g.dataset.factoryGroup);}));
  $('construct-building')?.addEventListener('click',()=>mutate(async()=>{await runAction({type:'construct',building:key});return `${b.name} is open. Start your first batch!`;}));
  $('building-content').querySelectorAll('[data-clear-planting]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{await runAction({type:'clear_planting',id:Number(btn.dataset.clearPlanting),expectedPlantedAt:Number(btn.dataset.plantedAt)});onExpand();return 'Planting removed. Your field is ready for a new crop.';})));
  $('farmhouse-estate')?.addEventListener('click',()=>onEstate('projects'));
  $('expand-fields')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'expand'});onExpand();return `One new field! Your farm now has ${r.fields}.`;}));
  $('building-content').querySelectorAll('[data-collect-job]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect',building:key,jobId:btn.dataset.collectJob});return `Collected ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;})));
  $('upgrade-building-diamonds')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'upgrade',building:key,currency:'diamonds',expectedCost:diamondUpgradeCost(state,key),expectedLevel:bs.level});return `${b.name} upgraded to level ${r.level} for ${r.cost} diamonds.`;}));
  $('collect-all-batches')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect_all',building:key});return `Collected ${r.count} batches: ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;}));
  $('upgrade-building')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'upgrade',building:key});return `${b.name} upgraded to level ${r.level}.`;}));
  const updateFertilizer=ids=>{
   fertilizerFields.clear();ids.forEach(id=>fertilizerFields.add(id));
   const count=ids.length,missing=Math.max(0,count-state.inventory.fertilizer);
   $('fertilizer-cost').textContent=`${state.inventory.fertilizer} in storage · ${count} required${missing?` · Need ${missing} more`:''}`;
   $('fertilizer-cost').classList.toggle('shortfall',missing>0);
   $('fertilize-field').disabled=mutating||!count||missing>0;
   $('fertilize-field').textContent=count?`Fertilize ${count} ${count===1?'field':'fields'}`:'Select fields to fertilize';
  };
  const selectedFields=$('fertilizer-field-picker')?bindFieldPicker($('fertilizer-field-picker'),{multiple:true,available:state.inventory.fertilizer,onChange:updateFertilizer}):()=>[];
  if($('fertilizer-field-picker')){updateFertilizer(selectedFields());$('fertilizer-field-picker').open=!!pickerOpen;$('fertilizer-field-picker').querySelector('.field-picker-options').scrollTop=pickerScroll;}
  $('fertilize-field')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'fertilize',ids:selectedFields()});onExpand();return `${r.count} fields fertilized! Used ${r.cost} fertilizer · +${r.xp} XP.`;}));
  $('building-content').querySelectorAll('[data-recipe]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'produce',recipe:btn.dataset.recipe,count:batchCounts[btn.dataset.recipe]??1});return `${r.count} ${r.count===1?'batch':'batches'} of ${RECIPES[r.recipe].name} started.`;})));
  function updateBatch(output){
   const id=output.dataset.batchCount,count=batchCounts[id],r=RECIPES[id],card=output.closest('.recipe-card'),max=Number(output.dataset.max);
   output.textContent=count;
   card.querySelector('[data-batch-step="-1"]').disabled=mutating||count<=1||!max;
   card.querySelector('[data-batch-step="1"]').disabled=mutating||count>=max;
   const most=card.querySelector('[data-batch-step="max"]');if(most)most.disabled=mutating||count>=max;
   const multiply=items=>Object.fromEntries(Object.entries(items).map(([k,n])=>[k,n*count]));
   card.querySelector('.recipe-flow .ingredients').innerHTML=costList(id,count);
   card.querySelector('.recipe-output').innerHTML=itemList(multiply(r.output));
   if(max)card.querySelector('.recipe-footer>span').textContent=`+${r.xp*count} XP`;
   const value=recipeValue(id,farmNow());
   card.querySelector('.recipe-value').innerHTML=RECIPES[id].coins?`Costs ${number(RECIPES[id].coins*count)} coins`:`${art('coins')}<strong>${signed(value.added*count)}</strong> profit`;
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
 function renderMarket(){
  const now=farmNow(),entries=marketEntries(),multiplier=state.boosts.coinsUntil>now?2:1;
  renderedMarketDay=utcDay(now);
  const {today,tomorrow}=marketHighlights(now,state);
  $('market-outlook').innerHTML=`<div class="market-outlook-heading"><span class="eyebrow">TODAY’S MARKET</span><span id="market-countdown"></span></div><div class="market-highlight">${art(today.item)}<div><strong>${ITEMS[today.item].name}</strong><span>${number(today.price)} coins each · ${today.label}</span></div><b class="demand-pill ${today.demand}">${signed(today.change)}%</b></div><p class="market-forecast">Tomorrow’s outlook: <strong>${ITEMS[tomorrow.item].name}</strong> · ${tomorrow.label.toLowerCase()} expected.</p><div class="market-board-link"><span>Delivery orders pay extra for specific baskets.</span><button type="button" id="market-orders">View orders →</button></div>`;
  $('market-orders').closest('.market-board-link').hidden=!featureUnlocked(state,'cart');
  $('market-orders').onclick=()=>{$('market-dialog').close();$('today-button').click();document.querySelector('[data-today-tab="orders"]').click();};
  // What you can sell gets a card with its controls; what you do not have yet is a compact price list, never a row of greyed-out buttons.
  const card=([key,c])=>{const q=marketQuote(key,now),stock=sellableStock(state,key,now),kept=keptStock(state,key,now),quantity=stock?Math.min(stock,Math.max(1,sellQuantities[key]??1)):0;sellQuantities[key]=quantity;return `<div class="market-row dynamic-market-row market-card">${itemArt(key)}<div class="market-item-copy"><strong>${c.name}</strong><span class="market-current-price">${art('coins')}<b>${number(marketSaleValue(state,q.price,now))}</b> each${vipActive(state,now)?' · VIP +5%':''}${multiplier===2?' · 2× boost':''}</span><span class="demand-pill ${q.demand}" title="Normal ${number(q.normal)} · range ${number(q.min)}–${number(q.max)}">${q.label} · ${signed(q.change)}%</span></div><div class="market-stock"><b>${number(stock)}</b><small>${kept?`${number(kept)} kept`:'in stock'}</small></div><div class="market-sale-controls"><label for="sell-quantity-${key}"><span>${kept?`${number(kept)} kept, free in ${rookieTimeLeft(rookieLeft(state,now))}`:'How many to sell'}</span><output id="sell-count-${key}">${quantity} selected</output></label><input id="sell-quantity-${key}" data-sell-range="${key}" type="range" min="1" max="${stock}" step="1" value="${quantity}" aria-label="Quantity of ${c.name} to sell" ${marketSelling||stock<2?'disabled':''}><div class="market-sale-buttons"><button class="small-button market-sell-some" data-sell="${key}" ${marketSelling?'disabled':''}>Sell ${number(quantity)} · ${art('coins')}${number(marketSaleValue(state,quantity*q.price,now))}</button><button class="small-button" data-sell-item-all="${key}" ${marketSelling?'disabled':''}>Sell all ${number(stock)}</button></div></div></div>`;};
  const inStock=entries.filter(([key])=>sellableStock(state,key,now)>0),empty=entries.filter(([key])=>sellableStock(state,key,now)<=0);
  $('market-items').innerHTML=(inStock.length?inStock.map(card).join(''):`<div class="quest-empty market-empty">${art(marketTab==='crops'?'wheat':'feed')}<h3>Nothing to sell yet</h3><p>${marketTab==='crops'?'Harvest your fields, then sell your crops here.':'Collect batches from your buildings, then sell the goods here.'}</p><button type="button" class="primary-button" data-market-empty>${marketTab==='crops'?'Go to your fields':'Open buildings'}</button></div>`)
   +(empty.length?`<h3 class="market-empty-title">Not in stock · today’s prices</h3><div class="market-price-list">${empty.map(([key,c])=>{const q=marketQuote(key,now);return `<div class="market-price-tile">${itemArt(key)}<span><strong>${c.name}</strong><small>${art('coins')}${number(marketSaleValue(state,q.price,now))}<em class="demand-dot ${q.demand}" title="${q.label} · ${signed(q.change)}%"></em></small></span></div>`;}).join('')}</div>`:'');
  const total=categoryTotal(now);$('inventory-value').innerHTML=`${art('coins')}${number(total)} coins`;$('sell-all').disabled=!total||marketSelling;$('sell-all').textContent=marketSelling?'Selling…':`Sell all ${marketTab==='crops'?'crops':'goods'}`;
  document.querySelectorAll('[data-market-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.marketTab===marketTab);b.setAttribute('aria-pressed',String(b.dataset.marketTab===marketTab));b.disabled=marketSelling;});
  $('market-items').querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sell,sellQuantities[b.dataset.sell])));$('market-items').querySelectorAll('[data-sell-item-all]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sellItemAll)));
  $('market-items').querySelectorAll('[data-sell-range]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.sellRange,quantity=Number(input.value);sellQuantities[key]=quantity;$(`sell-count-${key}`).textContent=`${number(quantity)} selected`;$('market-items').querySelector(`[data-sell="${key}"]`).innerHTML=`Sell ${number(quantity)} · ${art('coins')}${number(marketSaleValue(state,quantity*marketQuote(key,now).price,now))}`;}));
  $('market-items').querySelector('[data-market-empty]')?.addEventListener('click',()=>{$('market-dialog').close();if(marketTab!=='crops')openBuildings();});
  marketCountdown(now);icons();
 }
 function marketCountdown(now){const el=$('market-countdown');if(el)el.textContent=`New prices in ${seconds(marketQuote('oil',now).resetsAt-now)} · 00:00 UTC`;}
 // What "Sell all" would bring in right now for the tab that is open.
 function marketEntries(){return Object.entries(marketTab==='crops'?CROPS:PRODUCTS).filter(([key])=>!guidedFarm(state)||state.inventory[key]>0||itemAvailable(state,key));}
 function categoryTotal(now=farmNow()){return marketSaleValue(state,marketEntries().reduce((v,[k])=>v+sellableStock(state,k,now)*marketQuote(k,now).price,0),now);}
 let confirmingSale=false;
 async function sell(key='category',quantity){
  if(marketSelling||confirmingSale)return;
  // Selling a whole tab is one tap that empties the barn, so it asks first. Selling one item stays a single tap.
  if(key==='category'){
   const label=marketTab==='crops'?'crops':'goods',total=categoryTotal();confirmingSale=true;
   const sure=await confirmAction({title:`Sell all your ${label}?`,description:`Are you sure you want to sell all your ${label} for ${number(total)} coins?`,confirmLabel:`Sell for ${number(total)} coins`,cancelLabel:'Keep them'}).finally(()=>{confirmingSale=false;});
   if(!sure)return;
  }
  const day=renderedMarketDay||utcDay(farmNow()),category=marketTab;marketSelling=true;renderMarket();
  try{
   const r=await runAction(key==='category'?{type:'sell',category,day}:{type:'sell',item:key,day,...(quantity===undefined?{}:{quantity})});
   onChange();notify(`Sold! +${number(r.coins)} coins for your next harvest.`);return r;
  }catch(e){notify(e.message);return {error:e.message};}finally{marketSelling=false;renderMarket();}
 }
 function refresh(){
  $('selected-crop-price').textContent=`${seedCost(state,selectedCrop)} · ${seconds(cropDuration(state,selectedCrop))}`;
  if($('building-dialog').open)renderBuilding();
  if($('seed-dialog').open)renderSeeds();
  const count=Object.keys(BUILDINGS).filter(key=>status(key).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('market-dialog').open)renderMarket();
  if($('buildings-dialog').open)renderCatalog();
 }
 function tick(){
  const now=farmNow(),day=utcDay(now);
  if(day!==lastMarketDay){lastMarketDay=day;if($('market-dialog').open)renderMarket();if($('seed-dialog').open)renderSeeds();if($('building-dialog').open)renderBuilding();}
  if($('market-dialog').open)marketCountdown(now);
  const coinBoost=`${state.boosts.coinsUntil>now}:${vipActive(state,now)}`;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('market-dialog').open)renderMarket();if($('seed-dialog').open)renderSeeds();if($('building-dialog').open)renderBuilding();}
  document.querySelectorAll('[data-building-status]').forEach(el=>{const s=status(el.dataset.buildingStatus,now);el.textContent=s.text;el.className=`building-status ${s.kind}`;});
  const count=Object.keys(BUILDINGS).filter(key=>status(key,now).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('building-dialog').open&&currentBuilding){
   const jobs=productionJobs(state.buildings[currentBuilding]),signature=jobs.map(j=>`${j.id}:${now>=j.readyAt}`).join('|');
   if(signature!==lastJobReady)renderBuilding();
   else for(const job of jobs){
    const time=document.querySelector(`[data-job-time="${job.id}"]`),progress=document.querySelector(`[data-job-progress="${job.id}"]`);
    if(time)time.textContent=now>=job.readyAt?'Ready to collect':`${seconds(job.readyAt-now)} left`;
    if(progress)progress.value=Math.max(0,Math.min(100,(now-job.startedAt)/Math.max(1,job.readyAt-job.startedAt)*100));
   }
  }
 }
 $('selected-crop-button').addEventListener('click',openSeeds);$('seed-shop-button').addEventListener('click',openSeeds);
 $('buildings-button').addEventListener('click',openBuildings);$('all-buildings').addEventListener('click',openBuildings);
 document.querySelectorAll('[data-seed-filter]').forEach(b=>b.addEventListener('click',()=>{seedFilter=b.dataset.seedFilter;renderSeeds();}));
 document.querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{marketTab=b.dataset.marketTab;renderMarket();}));
 return {openMarket:(tab='crops')=>{marketTab=tab;renderMarket();show('market-dialog');},openBuilding,openBuildings,openSeeds,renderBuilding,renderMarket,sell,refresh,tick,status,chooseCrop,itemList};
}
