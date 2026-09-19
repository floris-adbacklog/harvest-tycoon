import {foldLocked} from './progression-ui.js';
import {SINGLE_BATCH_COST,diamondUpgradeCost,itemAvailable,recipeUnlockHint,guidedFarm,buildingEligible,buildingUnlockHint,cropUnlockHint,featureUnlocked,CROPS,PRODUCTS,ITEMS,BUILDINGS,RECIPES,MAX_PLOTS,recipeAvailability,upgradeCost,expansionCost,seedCost,formatDuration,cropDuration,recipeDuration,productionSpeed,MAX_BUILDING_LEVEL,expansionMaterials,productionSlots,productionJobs,recipeValue,marketQuote,marketHighlights,utcDay,levelOf,cropUnlocked,buildingUnlocked} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {fieldPicker,bindFieldPicker} from './field-picker.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const seconds=formatDuration;
export function createEconomyUI({state,onChange,onCrop,onExpand,notify,runAction,onEstate}){
 let currentBuilding=null,marketTab='crops',selectedCrop='wheat',seedFilter='all',lastJobReady='',lastCoinBoost=false,mutating=false;
 let marketSelling=false,renderedMarketDay='',lastMarketDay=utcDay(farmNow());
 const number=n=>n.toLocaleString('en-US');
 const signed=n=>`${n>=0?'+':''}${number(n)}`;
 const sellQuantities={};
 const batchCounts={},fertilizerFields=new Set();
 function itemArt(key){return art(key,'product-art');}
 function show(id){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();}
 function itemList(items,requirements=false){return Object.entries(items).map(([key,n])=>`<span class="ingredient ${requirements&&state.inventory[key]<n?'missing':''}">${itemArt(key)}<span>${requirements?`${state.inventory[key]}/${n}`:`${n}×`} ${ITEMS[key].name}</span></span>`).join('');}
 function status(key,now=farmNow()){
  const b=state.buildings[key];if(key==='farmhouse')return {text:`${state.plots.length} / ${MAX_PLOTS} fields`,kind:'farm'};
  const jobs=productionJobs(b),slots=productionSlots(b.level),ready=jobs.filter(j=>now>=j.readyAt).length;
  if(!buildingUnlocked(state,key))return {text:!buildingEligible(state,key)?buildingUnlockHint(state,key):`Open for ${number(BUILDINGS[key].buildCost)} coins`,kind:'locked'};
  if(!jobs.length)return {text:`Ready to work · 0 / ${slots} slots`,kind:'idle'};
  if(ready)return {text:`${ready} ready · ${jobs.length} / ${slots} slots`,kind:'ready'};
  return {text:`${jobs.length} / ${slots} working · ${seconds(Math.min(...jobs.map(j=>j.readyAt))-now)}`,kind:'working'};
 }
 function chooseCrop(key){if(!cropUnlocked(state,key)){notify(cropUnlockHint(state,key));return;}selectedCrop=key;$('selected-crop-art').innerHTML=art(key);$('selected-crop-name').textContent=CROPS[key].name;$('selected-crop-price').textContent=`${seedCost(state,key)} · ${seconds(cropDuration(state,key))}`;onCrop(key);}
 function renderSeeds(){
  document.querySelectorAll('[data-seed-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.seedFilter===seedFilter);b.setAttribute('aria-pressed',String(b.dataset.seedFilter===seedFilter));});
  $('crop-catalog').innerHTML=Object.entries(CROPS).sort((a,b)=>a[1].duration-b[1].duration).filter(([,c])=>seedFilter==='all'||(seedFilter==='quick'?c.duration<=900000:seedFilter==='later'?c.duration>900000&&c.duration<28800000:c.duration>=28800000)).map(([key,c])=>{
   const paceLabel=c.perennial?'Grows back':c.duration<=900000?'Quick grow':c.duration<28800000?'Day crop':'Slow grow';
   const paceTitle=c.perennial?`Plant once · First harvest ${seconds(cropDuration(state,key))}\nThen ${seconds(cropDuration(state,key,true))} after each collection.\nOne harvest waits; no offline stockpiling.`:'';
   return `<button class="crop-card crop-${key} ${selectedCrop===key?'selected':''}" data-choose-crop="${key}" ${cropUnlocked(state,key)?'':'disabled'} aria-pressed="${selectedCrop===key}"><div class="crop-art"><span class="crop-pace"${paceTitle?` title="${paceTitle}"`:''}>${paceLabel}</span>${art(key,'crop-picture')}${selectedCrop===key?'<span class="crop-selected"><i data-lucide="check"></i></span>':''}</div><strong>${c.name}</strong><span class="crop-stats"><span>${art('coins','tiny-coin')} ${seedCost(state,key)}</span><span><i data-lucide="clock-3"></i> ${seconds(cropDuration(state,key))}</span></span><small>${marketQuote(key,farmNow()).price} coins today · 1–3 yield</small><span class="crop-use">${cropUnlocked(state,key)?c.use:cropUnlockHint(state,key)}</span>${c.perennial?`<small class="regrow-hint">Regrows ${seconds(cropDuration(state,key,true))} after picking · 1 harvest waits</small>`:""}</button>`;
  }).join('');
  if(guidedFarm(state))foldLocked($('crop-catalog'),'[data-choose-crop]',b=>!cropUnlocked(state,b.dataset.chooseCrop),'Seeds to unlock');
  $('crop-catalog').querySelectorAll('[data-choose-crop]').forEach(b=>b.addEventListener('click',()=>{chooseCrop(b.dataset.chooseCrop);$('seed-dialog').close();notify(`${CROPS[b.dataset.chooseCrop].name} selected. Choose an empty field to plant.`);}));icons();
 }
 function openSeeds(){renderSeeds();show('seed-dialog');}
 function renderCatalog(){
  $('building-catalog').innerHTML=Object.entries(BUILDINGS).map(([key,b])=>{const s=status(key);return `<button class="building-card" data-open-building="${key}"><img src="/assets/icons/${key}.png" alt=""><span class="building-card-info"><strong>${b.name}</strong><small>Level ${state.buildings[key].level}${key==='farmhouse'?' · Expand your fields':` · ${Object.values(RECIPES).filter(r=>r.building===key).length} recipes`}</small><span class="building-status ${s.kind}" data-building-status="${key}">${s.text}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('');
  if(guidedFarm(state))foldLocked($('building-catalog'),'[data-open-building]',b=>!buildingEligible(state,b.dataset.openBuilding),'Buildings to unlock');
  $('building-catalog').querySelectorAll('[data-open-building]').forEach(b=>b.addEventListener('click',()=>openBuilding(b.dataset.openBuilding)));icons();
 }
 function openBuildings(){renderCatalog();show('buildings-dialog');}
 function openBuilding(key){if(!Object.hasOwn(BUILDINGS,key))return;currentBuilding=key;renderBuilding();show('building-dialog');}
 function renderBuilding(){
  if(!currentBuilding)return;
  const picker=$('fertilizer-field-picker'),pickerOpen=picker?.open,pickerScroll=picker?.querySelector('.field-picker-options')?.scrollTop??0;
  const key=currentBuilding,b=BUILDINGS[key],bs=state.buildings[key];
  let content=`<div class="building-hero"><div class="building-image"><img src="/assets/icons/${key}.png" alt=""></div><div><span class="eyebrow">LEVEL ${bs.level}${key==='farmhouse'?' · YOUR HOMESTEAD':' · FARM PRODUCTION'}</span><h2 id="building-title">${b.name}</h2><p>${b.tagline}</p></div></div>`;
  if(key==='farmhouse'){
   const cost=expansionCost(state),materials=expansionMaterials(state),hasMaterials=Object.entries(materials).every(([k,n])=>state.inventory[k]>=n);
   content+=`<div class="expansion-panel"><div class="expansion-summary"><span><i data-lucide="land-plot"></i> Your growing space</span><strong>${state.plots.length}<small> / ${MAX_PLOTS} fields</small></strong></div><div class="field-preview" aria-hidden="true">${Array.from({length:MAX_PLOTS},(_,i)=>`<span class="${i<state.plots.length?'unlocked':'locked'}"><i data-lucide="${i<state.plots.length?'sprout':'lock-keyhole'}"></i></span>`).join('')}</div><h3>${cost?'Make room for one more.':'Your farm is fully expanded.'}</h3><p>${cost?'Unlock one field at a time. Each new field needs more coins and a different mix of farm supplies.':'Twenty-four fields, twelve crops and room to build a lasting estate.'}</p>${cost!==null?`<div class="ingredients expansion-materials">${itemList(materials,true)}</div>`:''}<button id="expand-fields" class="primary-button" ${cost===null||state.coins<cost||!hasMaterials?'disabled':''}>${cost?`Unlock 1 field · ${cost} coins`:'All fields unlocked'}<i data-lucide="${cost?'plus':'check'}"></i></button>${cost!==null&&state.coins<cost?`<small class="shortfall">You need ${cost-state.coins} more coins.</small>`:''}</div>`;
   const plantings=state.plots.filter(p=>CROPS[p.crop]?.perennial);
   content+=`<section class="orchard-management"><h3>Your orchard plantings</h3><p>Each tree or bush holds one harvest. Pick it yourself to start the next cycle. Water and care each cycle for up to 3 fruit instead of 1. Nothing is collected, processed or sold while you are away.</p>${plantings.length?plantings.map(p=>`<div class="orchard-field">${art(p.crop)}<div><strong>Field ${p.id+1} · ${CROPS[p.crop].name}</strong><small>${p.readyAt<=farmNow()?'Ready to pick':`${seconds(p.readyAt-farmNow())} until picking`}</small><details class="remove-planting"><summary>Remove planting</summary><p>This clears the field and discards any fruit. Replanting costs ${seedCost(state,p.crop)} coins.</p><button type="button" class="small-button" data-clear-planting="${p.id}" data-planted-at="${p.plantedAt}">Confirm removal</button></details></div></div>`).join(''):'<p>Plant Apples from level 8 and Berries from level 10 in any empty field.</p>'}</section>`;
   content+=`<button ${featureUnlocked(state,'projects')?'':'hidden'} id="farmhouse-estate" class="estate-entry"><i data-lucide="landmark"></i><span><strong>Your next chapter</strong><small>Estate projects, passive income and mastery</small></span><i data-lucide="chevron-right"></i></button>`;
  }else if(!buildingUnlocked(state,key)&&!b.buildCost){
   content+=`<section class="construction-panel"><h3>Something to grow towards</h3><p>${buildingUnlockHint(state,key)}</p><p>This building opens automatically when you reach its milestone.</p></section>`;
  }else if(!buildingUnlocked(state,key)){
   const eligible=buildingEligible(state,key);
   content+=`<section class="construction-panel"><span class="eyebrow">NEW PRODUCTION CHAIN</span><h3>${eligible?'Bring this building to life':`Unlocks at farmer level ${b.minLevel}`}</h3><p>Open ${b.name} for ${number(b.buildCost)} coins. Starts at level 1 with one batch slot; upgrades add one slot each.</p><div class="construction-recipes">${Object.values(RECIPES).filter(r=>r.building===key).map(r=>`<div>${itemList(r.input)}<b>→</b>${itemList(r.output)}</div>`).join('')}</div><button type="button" id="construct-building" class="primary-button" ${eligible&&state.coins>=b.buildCost?'':'disabled'}>Open building · ${number(b.buildCost)} coins</button>${eligible&&state.coins<b.buildCost?`<p>You need ${number(b.buildCost-state.coins)} more coins.</p>`:''}</section>`;
  }else{
   if(key==='windmill' ||key==='bakery')content+=`<div class="milling-chain"><span>${art('wheat')} Grain</span><b>→</b><span>${art('grainmeal')} Grain meal</span><b>→</b><span>${art('flour')} Flour</span><b>→</b><span>${art('bread')} Fresh baking</span></div><p class="milling-note">${key==='windmill'?'Grind wheat and barley into grain meal, then refine it into flour. Your Bakery turns the flour into higher-value fresh bread and pies.':'Flour now comes from the Windmill. Process flour into bread and pumpkin pie for a better return than selling the ingredients.'}</p>`;
   const jobs=productionJobs(bs),slots=productionSlots(bs.level),ready=jobs.filter(j=>j.readyAt<=farmNow());
   lastJobReady=jobs.map(j=>`${j.id}:${farmNow()>=j.readyAt}`).join('|');
   content+=`<div class="production-capacity"><strong>${jobs.length} / ${slots} production slots used</strong><p>Level ${bs.level} · ${slots} simultaneous ${slots===1?'batch':'batches'}. Each building level adds one slot. Ready goods keep their slot until collected.</p></div>${ready.length>1?`<section class="collect-all-panel"><div class="collect-all-art">${art('collect-all')}</div><div class="collect-all-copy"><strong>${ready.length} batches ready</strong><span>Gather all finished goods from this building.</span></div><button type="button" id="collect-all-batches" class="primary-button" ${mutating?'disabled':''}>Collect all <span>${ready.length}</span></button></section>`:''}<div class="production-batches">`;
   for(const [index,job] of jobs.entries()){
    const recipe=RECIPES[job.recipe],isReady=farmNow()>=job.readyAt;
    content+=`<div class="job-panel ${isReady?'ready':''}" data-production-job="${job.id}"><div class="job-heading"><span class="job-icon"><i data-lucide="${isReady?'package-check':'timer'}"></i></span><div><strong>Batch ${index+1} · ${recipe.name}</strong><span data-job-time="${job.id}">${isReady?'Your batch is ready!':`${seconds(job.readyAt-farmNow())} remaining`}</span></div></div><progress data-job-progress="${job.id}" max="100" value="${Math.max(0,Math.min(100,(farmNow()-job.startedAt)/Math.max(1,job.readyAt-job.startedAt)*100))}" aria-label="Batch ${index+1} production progress"></progress><div class="job-result">${itemList(job.output??recipe.output)}</div><button data-collect-job="${job.id}" class="primary-button" ${isReady?'':'disabled'}>${isReady?'Collect this batch':'Making something good…'}<i data-lucide="shopping-basket"></i></button>${!isReady&&featureUnlocked(state,'boosts')?`<button type="button" class="small-button diamond-option" data-finish-batch="${job.id}" ${mutating||state.diamonds<SINGLE_BATCH_COST?'disabled':''}>${art('diamonds')} Finish this batch · ${SINGLE_BATCH_COST}</button>`:''}</div>`;
   }
   content+='</div>';
   content+=`<div class="recipe-section-heading"><h3>What shall we make?</h3><span>Ingredients are used when you start.</span></div><div class="recipe-list">`;
   for(const [rid,r]of Object.entries(RECIPES).filter(([,r])=>r.building===key)){
    const a=recipeAvailability(state,rid),duration=recipeDuration(state,rid),value=recipeValue(rid,farmNow()),count=Math.max(1,Math.min(batchCounts[rid]??1,a.maxCount||1));batchCounts[rid]=count;
    content+=`<article class="recipe-card" data-recipe-card="${rid}"><div class="recipe-title"><h4>${r.name}</h4><span><i data-lucide="clock-3"></i> ${seconds(duration)}</span></div><div class="recipe-flow"><div class="ingredients">${itemList(r.input,true)}</div><i class="recipe-arrow" data-lucide="arrow-right"></i><div class="recipe-output">${itemList(r.output)}</div></div><p class="recipe-value">Today: ingredients ${number(value.input)} coins → goods ${number(value.output)} coins · <strong>${signed(value.added)} coins from processing</strong></p><div class="recipe-footer"><span>${a.locked?recipeUnlockHint(state,rid):a.busy?'All slots are occupied. Collect a finished batch first.':a.missing.length?'Gather the missing ingredients.':`Ready to make · +${r.xp} XP`}</span>${a.slots>1?`<div class="batch-picker"><span id="batch-label-${rid}">Batches</span><div class="batch-stepper" role="group" aria-labelledby="batch-label-${rid}"><button type="button" data-batch-step="-1" data-for-recipe="${rid}" aria-label="Fewer batches of ${r.name}" ${count<=1||!a.maxCount?'disabled':''}>−</button><output data-batch-count="${rid}" data-max="${a.maxCount}" aria-live="polite" aria-label="Number of batches for ${r.name}">${count}</output><button type="button" data-batch-step="1" data-for-recipe="${rid}" aria-label="More batches of ${r.name}" ${count>=a.maxCount?'disabled':''}>+</button></div><small>${a.maxCount} available</small></div>`:''}<button class="small-button start-recipe" data-recipe="${rid}" ${a.canStart?'':'disabled'}>Start batch<i data-lucide="play"></i></button></div></article>`;
   }
   content+='</div>';
   if(key==='windmill'){
    const eligible=state.plots.filter(p=>p.crop&&p.readyAt>farmNow()&&!p.fertilized);
    content+=`<section class="fertilizer-panel"><div>${art('fertilizer')}<h3>Give a field a head start</h3></div><p>Use 1 natural fertilizer to remove 35% of a crop’s remaining growing time. Once per growing cycle; watering and extra care still work.</p>${fieldPicker({id:'fertilizer-field-picker',plots:eligible,selected:[...fertilizerFields].filter(id=>eligible.some(p=>p.id===id)),multiple:true,now:farmNow(),available:state.inventory.fertilizer})}<div class="fertilizer-action"><span id="fertilizer-cost">${state.inventory.fertilizer} fertilizer in storage · 0 required</span><button id="fertilize-field" class="small-button" disabled>Fertilize selected fields</button></div></section>`;
   }
   const cost=upgradeCost(state,key),diamondCost=diamondUpgradeCost(state,key);
   content+=`<div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${cost?`Upgrade to level ${bs.level+1}`:'Fully upgraded'}</strong><p>${cost?`${state.boosts.upgradeCredits?'Your 50% upgrade voucher is included in this price. ':''}${productionSlots(bs.level+1)} simultaneous batches, plus ${Math.round(productionSpeed(bs.level+1)*100)}% shorter production time than level 1. ${jobs.length?'Collect all current batches first.':'Applies to your next batches.'}`:`Level ${MAX_BUILDING_LEVEL}: ${slots} simultaneous batches; production takes ${Math.round(productionSpeed(MAX_BUILDING_LEVEL)*100)}% less time.`}</p></div><div class="upgrade-payments"><button id="upgrade-building" class="small-button" ${cost===null||state.coins<cost||jobs.length?'disabled':''}>${cost?`${cost} coins`:'Max level'}</button>${diamondCost!==null&&featureUnlocked(state,'boosts')?`<span>or</span><button id="upgrade-building-diamonds" class="small-button diamond-option" ${mutating||state.diamonds<diamondCost||jobs.length?'disabled':''}>${art('diamonds')} ${diamondCost} diamonds</button><small>Same upgrade. Coins and vouchers are kept.</small>`:''}</div></div>`;
  }
  $('building-content').innerHTML=content;$('building-feedback').textContent='';
  const recipeList=$('building-content').querySelector('.recipe-list');if(recipeList&&guidedFarm(state))foldLocked(recipeList,'[data-recipe-card]',card=>recipeAvailability(state,card.dataset.recipeCard).locked,'Coming later');
  $('construct-building')?.addEventListener('click',()=>mutate(async()=>{await runAction({type:'construct',building:key});return `${b.name} is open. Start your first batch!`;}));
  $('building-content').querySelectorAll('[data-clear-planting]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{await runAction({type:'clear_planting',id:Number(btn.dataset.clearPlanting),expectedPlantedAt:Number(btn.dataset.plantedAt)});onExpand();return 'Planting removed. Your field is ready for a new crop.';})));
  $('farmhouse-estate')?.addEventListener('click',()=>onEstate('projects'));
  $('expand-fields')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'expand'});onExpand();return `One new field! Your farm now has ${r.fields}.`;}));
  $('building-content').querySelectorAll('[data-collect-job]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect',building:key,jobId:btn.dataset.collectJob});return `Collected ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;})));
  $('building-content').querySelectorAll('[data-finish-batch]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{await runAction({type:'finish_batch',building:key,jobId:btn.dataset.finishBatch,expectedCost:SINGLE_BATCH_COST});return 'Your batch is ready. Collect it to receive the goods.';})));
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
   const multiply=items=>Object.fromEntries(Object.entries(items).map(([k,n])=>[k,n*count]));
   card.querySelector('.recipe-flow .ingredients').innerHTML=itemList(multiply(r.input),true);
   card.querySelector('.recipe-output').innerHTML=itemList(multiply(r.output));
   if(max)card.querySelector('.recipe-footer>span').textContent=`Ready to make · +${r.xp*count} XP when collected`;
   const value=recipeValue(id,farmNow());
   card.querySelector('.recipe-value').textContent=`Today’s total: ingredients ${number(value.input*count)} coins → goods ${number(value.output*count)} coins · ${signed(value.added*count)} coins from processing`;
   card.querySelector('[data-recipe]').textContent=`Start ${count} ${count===1?'batch':'batches'}`;
  }
  $('building-content').querySelectorAll('[data-batch-step]').forEach(button=>button.addEventListener('click',()=>{
   const id=button.dataset.forRecipe,output=$('building-content').querySelector(`[data-batch-count="${id}"]`);
   batchCounts[id]=Math.max(1,Math.min(Number(output.dataset.max),batchCounts[id]+Number(button.dataset.batchStep)));updateBatch(output);icons();
  }));
  $('building-content').querySelectorAll('[data-batch-count]').forEach(updateBatch);
  icons();
 }
 async function mutate(action){if(mutating)return;mutating=true;$('building-content').setAttribute('aria-busy','true');$('building-content').querySelectorAll('button').forEach(b=>b.disabled=true);try{const message=await action();onChange();renderBuilding();$('building-feedback').textContent=message;notify(message);return {ok:true,message};}catch(e){$('building-feedback').textContent=e.message;notify(e.message);return {error:e.message};}finally{mutating=false;const message=$('building-feedback').textContent;renderBuilding();$('building-feedback').textContent=message;$('building-content').removeAttribute('aria-busy');}}
 function renderMarket(){
  const now=farmNow(),entries=Object.entries(marketTab==='crops'?CROPS:PRODUCTS).filter(([key])=>!guidedFarm(state)||state.inventory[key]>0||itemAvailable(state,key)),multiplier=state.boosts.coinsUntil>now?2:1;
  renderedMarketDay=utcDay(now);
  const {today,tomorrow}=marketHighlights(now);
  $('market-outlook').innerHTML=`<div class="market-outlook-heading"><span class="eyebrow">TODAY’S MARKET</span><span id="market-countdown"></span></div><div class="market-highlight">${art(today.item)}<div><strong>${ITEMS[today.item].name}</strong><span>${number(today.price)} coins each · ${today.label}</span></div><b class="demand-pill ${today.demand}">${signed(today.change)}%</b></div><p class="market-forecast">Tomorrow’s outlook: <strong>${ITEMS[tomorrow.item].name}</strong> · ${tomorrow.label.toLowerCase()} expected.</p><div class="market-board-link"><span>Delivery orders pay extra for specific baskets.</span><button type="button" id="market-orders">View orders →</button></div>`;
  $('market-orders').closest('.market-board-link').hidden=!featureUnlocked(state,'cart');
  $('market-orders').onclick=()=>{$('market-dialog').close();$('today-button').click();document.querySelector('[data-today-tab="orders"]').click();};
  $('market-items').innerHTML=entries.map(([key,c])=>{const q=marketQuote(key,now),stock=state.inventory[key],quantity=stock?Math.min(stock,Math.max(1,sellQuantities[key]??1)):0;sellQuantities[key]=quantity;return `<div class="market-row dynamic-market-row">${itemArt(key)}<div class="market-item-copy"><strong>${c.name}</strong><span class="market-current-price">${number(q.price*multiplier)} <small>coins each${multiplier===2?' · 2× boost':''}</small></span><span class="market-price-context">Normal ${number(q.normal)} · Range ${number(q.min)}–${number(q.max)}</span><span class="demand-pill ${q.demand}">${q.label} · ${signed(q.change)}%</span></div><div class="market-sale-controls"><label for="sell-quantity-${key}"><span>${number(stock)} in stock</span><output id="sell-count-${key}">${quantity} selected</output></label><input id="sell-quantity-${key}" data-sell-range="${key}" type="range" min="${stock?1:0}" max="${stock}" step="1" value="${quantity}" aria-label="Quantity of ${c.name} to sell" ${!stock||marketSelling?'disabled':''}><div class="market-sale-buttons"><button class="small-button" data-sell="${key}" ${!stock||marketSelling?'disabled':''}>Sell ${number(quantity)} · ${number(quantity*q.price*multiplier)} coins</button><button class="small-button" data-sell-item-all="${key}" ${!stock||marketSelling?'disabled':''}>Sell all</button></div></div></div>`;}).join('');
  const total=entries.reduce((v,[k])=>v+state.inventory[k]*marketQuote(k,now).price*multiplier,0);$('inventory-value').textContent=`${number(total)} coins`;$('sell-all').disabled=!total||marketSelling;$('sell-all').textContent=marketSelling?'Selling…':`Sell all ${marketTab==='crops'?'crops':'goods'}`;
  document.querySelectorAll('[data-market-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.marketTab===marketTab);b.setAttribute('aria-pressed',String(b.dataset.marketTab===marketTab));b.disabled=marketSelling;});
  $('market-items').querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sell,sellQuantities[b.dataset.sell])));$('market-items').querySelectorAll('[data-sell-item-all]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sellItemAll)));
  $('market-items').querySelectorAll('[data-sell-range]').forEach(input=>input.addEventListener('input',()=>{const key=input.dataset.sellRange,quantity=Number(input.value);sellQuantities[key]=quantity;$(`sell-count-${key}`).textContent=`${number(quantity)} selected`;$('market-items').querySelector(`[data-sell="${key}"]`).textContent=`Sell ${number(quantity)} · ${number(quantity*marketQuote(key,now).price*multiplier)} coins`;}));
  marketCountdown(now);icons();
 }
 function marketCountdown(now){const el=$('market-countdown');if(el)el.textContent=`New prices in ${seconds(marketQuote('oil',now).resetsAt-now)} · 00:00 UTC`;}
 async function sell(key='category',quantity){
  if(marketSelling)return;const day=renderedMarketDay||utcDay(farmNow()),category=marketTab;marketSelling=true;renderMarket();
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
  const coinBoost=state.boosts.coinsUntil>now;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('market-dialog').open)renderMarket();}
  document.querySelectorAll('[data-building-status]').forEach(el=>{const s=status(el.dataset.buildingStatus,now);el.textContent=s.text;el.className=`building-status ${s.kind}`;});
  const count=Object.keys(BUILDINGS).filter(key=>status(key,now).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('building-dialog').open&&currentBuilding){
   const jobs=productionJobs(state.buildings[currentBuilding]),signature=jobs.map(j=>`${j.id}:${now>=j.readyAt}`).join('|');
   if(signature!==lastJobReady)renderBuilding();
   else for(const job of jobs){
    const time=document.querySelector(`[data-job-time="${job.id}"]`),progress=document.querySelector(`[data-job-progress="${job.id}"]`);
    if(time)time.textContent=now>=job.readyAt?'Your batch is ready!':`${seconds(job.readyAt-now)} remaining`;
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
