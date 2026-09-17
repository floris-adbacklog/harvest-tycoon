import {CROPS,PRODUCTS,ITEMS,BUILDINGS,RECIPES,MAX_PLOTS,recipeAvailability,upgradeCost,expansionCost,seedCost,formatDuration,cropDuration,recipeDuration,productionSpeed,MAX_BUILDING_LEVEL,expansionMaterials} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
const seconds=formatDuration;
export function createEconomyUI({state,onChange,onCrop,onExpand,notify,runAction,onEstate}){
 let currentBuilding=null,marketTab='crops',selectedCrop='wheat',seedFilter='all',lastJobReady=false,lastCoinBoost=false;
 function itemArt(key){return art(key,'product-art');}
 function show(id){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();}
 function itemList(items,requirements=false){return Object.entries(items).map(([key,n])=>`<span class="ingredient ${requirements&&state.inventory[key]<n?'missing':''}">${itemArt(key)}<span>${requirements?`${state.inventory[key]}/${n}`:`${n}×`} ${ITEMS[key].name}</span></span>`).join('');}
 function status(key,now=farmNow()){
  const b=state.buildings[key];if(key==='farmhouse')return {text:`${state.plots.length} / ${MAX_PLOTS} fields`,kind:'farm'};
  if(!b.job)return {text:'Ready to work',kind:'idle'};
  if(now>=b.job.readyAt)return {text:'Ready to collect',kind:'ready'};
  return {text:`Working · ${seconds(b.job.readyAt-now)}`,kind:'working'};
 }
 function chooseCrop(key){selectedCrop=key;$('selected-crop-art').innerHTML=art(key);$('selected-crop-name').textContent=CROPS[key].name;$('selected-crop-price').textContent=`${seedCost(state,key)} · ${seconds(cropDuration(state,key))}`;onCrop(key);}
 function renderSeeds(){
  document.querySelectorAll('[data-seed-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.seedFilter===seedFilter);b.setAttribute('aria-pressed',String(b.dataset.seedFilter===seedFilter));});
  $('crop-catalog').innerHTML=Object.entries(CROPS).sort((a,b)=>a[1].duration-b[1].duration).filter(([,c])=>seedFilter==='all'||(seedFilter==='quick'?c.duration<=900000:seedFilter==='later'?c.duration>900000&&c.duration<28800000:c.duration>=28800000)).map(([key,c])=>`<button class="crop-card crop-${key} ${selectedCrop===key?'selected':''}" data-choose-crop="${key}" aria-pressed="${selectedCrop===key}"><div class="crop-art"><span class="crop-pace">${c.duration<=900000?'Quick grow':c.duration<28800000?'Day crop':'Slow grow'}</span>${art(key,'crop-picture')}${selectedCrop===key?'<span class="crop-selected"><i data-lucide="check"></i></span>':''}</div><strong>${c.name}</strong><span class="crop-stats"><span>${art('coins','tiny-coin')} ${seedCost(state,key)}</span><span><i data-lucide="clock-3"></i> ${seconds(cropDuration(state,key))}</span></span><small>${c.sell} coins per crop · 1–3 yield</small><span class="crop-use">${c.use}</span></button>`).join('');
  $('crop-catalog').querySelectorAll('[data-choose-crop]').forEach(b=>b.addEventListener('click',()=>{chooseCrop(b.dataset.chooseCrop);$('seed-dialog').close();notify(`${CROPS[b.dataset.chooseCrop].name} selected. Choose an empty field to plant.`);}));icons();
 }
 function openSeeds(){renderSeeds();show('seed-dialog');}
 function renderCatalog(){
  $('building-catalog').innerHTML=Object.entries(BUILDINGS).map(([key,b])=>{const s=status(key);return `<button class="building-card" data-open-building="${key}"><img src="/assets/icons/${key}.png" alt=""><span class="building-card-info"><strong>${b.name}</strong><small>Level ${state.buildings[key].level}${key==='farmhouse'?' · Expand your fields':` · ${Object.values(RECIPES).filter(r=>r.building===key).length} recipes`}</small><span class="building-status ${s.kind}" data-building-status="${key}">${s.text}</span></span><i data-lucide="chevron-right"></i></button>`;}).join('');
  $('building-catalog').querySelectorAll('[data-open-building]').forEach(b=>b.addEventListener('click',()=>openBuilding(b.dataset.openBuilding)));icons();
 }
 function openBuildings(){renderCatalog();show('buildings-dialog');}
 function openBuilding(key){if(!Object.hasOwn(BUILDINGS,key))return;currentBuilding=key;renderBuilding();show('building-dialog');}
 function renderBuilding(){
  if(!currentBuilding)return;
  const key=currentBuilding,b=BUILDINGS[key],bs=state.buildings[key];
  let content=`<div class="building-hero"><div class="building-image"><img src="/assets/icons/${key}.png" alt=""></div><div><span class="eyebrow">LEVEL ${bs.level}${key==='farmhouse'?' · YOUR HOMESTEAD':' · FARM PRODUCTION'}</span><h2 id="building-title">${b.name}</h2><p>${b.tagline}</p></div></div>`;
  if(key==='farmhouse'){
   const cost=expansionCost(state),materials=expansionMaterials(state),hasMaterials=Object.entries(materials).every(([k,n])=>state.inventory[k]>=n);
   content+=`<div class="expansion-panel"><div class="expansion-summary"><span><i data-lucide="land-plot"></i> Your growing space</span><strong>${state.plots.length}<small> / ${MAX_PLOTS} fields</small></strong></div><div class="field-preview" aria-hidden="true">${Array.from({length:MAX_PLOTS},(_,i)=>`<span class="${i<state.plots.length?'unlocked':'locked'}"><i data-lucide="${i<state.plots.length?'sprout':'lock-keyhole'}"></i></span>`).join('')}</div><h3>${cost?'Make room for one more.':'Your farm is fully expanded.'}</h3><p>${cost?'Unlock one field at a time. Each new field needs more coins and a different mix of farm supplies.':'Twenty-four fields, nine crops and room to build a lasting estate.'}</p>${cost!==null?`<div class="ingredients expansion-materials">${itemList(materials,true)}</div>`:''}<button id="expand-fields" class="primary-button" ${cost===null||state.coins<cost||!hasMaterials?'disabled':''}>${cost?`Unlock 1 field · ${cost} coins`:'All fields unlocked'}<i data-lucide="${cost?'plus':'check'}"></i></button>${cost!==null&&state.coins<cost?`<small class="shortfall">You need ${cost-state.coins} more coins.</small>`:''}</div>`;
   content+=`<button id="farmhouse-estate" class="estate-entry"><i data-lucide="landmark"></i><span><strong>Your next chapter</strong><small>Estate projects, passive income and mastery</small></span><i data-lucide="chevron-right"></i></button>`;
  }else{
   if(key==='windmill'||key==='bakery')content+=`<div class="milling-chain"><span>${art('wheat')} Grain</span><b>→</b><span>${art('grainmeal')} Grain meal</span><b>→</b><span>${art('flour')} Flour</span><b>→</b><span>${art('bread')} Fresh baking</span></div><p class="milling-note">${key==='windmill'?'Grind wheat and barley into grain meal, then refine it into flour. Your Bakery turns the flour into higher-value fresh bread and pies.':'Flour now comes from the Windmill. Fresh bread sells for 340 coins each; fresh pumpkin pie sells for 2,100 coins.'}</p>`;
   const job=bs.job;
   if(job){
    const recipe=RECIPES[job.recipe],isReady=farmNow()>=job.readyAt;lastJobReady=isReady;
    content+=`<div class="job-panel ${isReady?'ready':''}" id="active-job"><div class="job-heading"><span class="job-icon"><i data-lucide="${isReady?'package-check':'timer'}"></i></span><div><strong>${recipe.name}</strong><span id="job-time">${isReady?'Your batch is ready!':`${seconds(job.readyAt-farmNow())} remaining`}</span></div></div><progress id="job-progress" max="100" value="${Math.min(100,(farmNow()-job.startedAt)/(job.readyAt-job.startedAt)*100)}" aria-label="Production progress"></progress><div class="job-result">${itemList(job.output??recipe.output)}</div><button id="collect-batch" class="primary-button" ${isReady?'':'disabled'}>${isReady?'Collect your goods':'Making something good…'}<i data-lucide="shopping-basket"></i></button></div>`;
   }
   content+=`<div class="recipe-section-heading"><h3>What shall we make?</h3><span>Ingredients are used when you start.</span></div><div class="recipe-list">`;
   for(const [rid,r]of Object.entries(RECIPES).filter(([,r])=>r.building===key)){
    const a=recipeAvailability(state,rid),duration=recipeDuration(state,rid);
    content+=`<article class="recipe-card"><div class="recipe-title"><h4>${r.name}</h4><span><i data-lucide="clock-3"></i> ${seconds(duration)}</span></div><div class="recipe-flow"><div class="ingredients">${itemList(r.input,true)}</div><i class="recipe-arrow" data-lucide="arrow-right"></i><div class="recipe-output">${itemList(r.output)}</div></div><div class="recipe-footer"><span>${a.busy?'Collect your current batch first.':a.missing.length?'Gather the missing ingredients.':`Ready to make · +${r.xp} XP`}</span><button class="small-button start-recipe" data-recipe="${rid}" ${a.canStart?'':'disabled'}>Start batch<i data-lucide="play"></i></button></div></article>`;
   }
   content+='</div>';
   if(key==='windmill'){
    const eligible=state.plots.filter(p=>p.crop&&p.readyAt>farmNow()&&!p.fertilized);
    content+=`<section class="fertilizer-panel"><div>${art('fertilizer')}<h3>Give a field a head start</h3></div><p>Use 1 natural fertilizer to remove 35% of a crop’s remaining growing time. Once per planting; watering and extra care still work.</p><label for="fertilizer-field">Choose a growing field</label><select id="fertilizer-field" ${eligible.length?'':'disabled'}>${eligible.length?eligible.map(p=>`<option value="${p.id}">Field ${p.id+1} · ${CROPS[p.crop].name} · ${seconds(p.readyAt-farmNow())}</option>`).join(''):'<option>No eligible growing crops</option>'}</select><div class="fertilizer-action"><span>${state.inventory.fertilizer} fertilizer in storage</span><button id="fertilize-field" class="small-button" ${eligible.length&&state.inventory.fertilizer>0?'':'disabled'}>Use 1 fertilizer</button></div></section>`;
   }
   const cost=upgradeCost(state,key);
   content+=`<div class="upgrade-panel"><span class="upgrade-icon"><i data-lucide="circle-fading-arrow-up"></i></span><div><strong>${cost?`Upgrade to level ${bs.level+1}`:'Fully upgraded'}</strong><p>${cost?`${state.boosts.upgradeCredits?'Your 50% upgrade voucher is included in this price. ':''}${Math.round(productionSpeed(bs.level+1)*100)}% shorter production time than level 1. ${bs.job?'Collect the current batch first.':'Applies to your next batches.'}`:`Level ${MAX_BUILDING_LEVEL}: production takes ${Math.round(productionSpeed(MAX_BUILDING_LEVEL)*100)}% less time.`}</p></div><button id="upgrade-building" class="small-button" ${cost===null||state.coins<cost||bs.job?'disabled':''}>${cost?`${cost} coins`:'Max level'}</button></div>`;
  }
  $('building-content').innerHTML=content;$('building-feedback').textContent='';
  $('farmhouse-estate')?.addEventListener('click',()=>onEstate('projects'));
  $('expand-fields')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'expand'});onExpand();return `One new field! Your farm now has ${r.fields}.`;}));
  $('collect-batch')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'collect',building:key});return `Collected ${Object.entries(r.items).map(([k,n])=>`${n} ${ITEMS[k].name}`).join(', ')} · +${r.xp} XP.`;}));
  $('upgrade-building')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'upgrade',building:key});return `${b.name} upgraded to level ${r.level}.`;}));
  $('fertilize-field')?.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'fertilize',id:Number($('fertilizer-field').value)});onExpand();return `Field ${r.id+1} fertilized! ${seconds(r.saved)} saved · +${r.xp} XP.`;}));
  $('building-content').querySelectorAll('[data-recipe]').forEach(btn=>btn.addEventListener('click',()=>mutate(async()=>{const r=await runAction({type:'produce',recipe:btn.dataset.recipe});return `${RECIPES[r.recipe].name} started. Come back to collect your batch.`;})));
  icons();
 }
 async function mutate(action){try{const message=await action();onChange();renderBuilding();$('building-feedback').textContent=message;notify(message);return {ok:true,message};}catch(e){$('building-feedback').textContent=e.message;notify(e.message);return {error:e.message};}}
 function renderMarket(){
  const entries=Object.entries(marketTab==='crops'?CROPS:PRODUCTS);
  const multiplier=state.boosts.coinsUntil>farmNow()?2:1;
  $('market-items').innerHTML=entries.map(([key,c])=>`<div class="market-row">${itemArt(key)}<div><strong>${c.name}</strong><small>${c.sell*multiplier} coins each${multiplier===2?' · 2× boost active':''}${CROPS[key]?` · ${CROPS[key].use}`:''}</small></div><span>${state.inventory[key]}</span><button class="small-button" data-sell="${key}" ${state.inventory[key]?'':'disabled'}>Sell</button></div>`).join('');
  const total=entries.reduce((v,[k,c])=>v+state.inventory[k]*c.sell*multiplier,0);$('inventory-value').textContent=`${total} coins`;$('sell-all').disabled=!total;$('sell-all').innerHTML=`Sell all ${marketTab==='crops'?'crops':'goods'}<i data-lucide="arrow-right"></i>`;
  document.querySelectorAll('[data-market-tab]').forEach(b=>{b.classList.toggle('active',b.dataset.marketTab===marketTab);b.setAttribute('aria-pressed',String(b.dataset.marketTab===marketTab));});
  $('market-items').querySelectorAll('[data-sell]').forEach(b=>b.addEventListener('click',()=>sell(b.dataset.sell)));icons();
 }
 async function sell(key='category'){
  try{
   let coins=0;
   if(key==='category'){for(const k of Object.keys(marketTab==='crops'?CROPS:PRODUCTS)){if(state.inventory[k])coins+=(await runAction({type:'sell',item:k})).coins;}if(!coins)throw new Error('Nothing in this basket yet.');}
   else coins=(await runAction({type:'sell',item:key})).coins;
   onChange();renderMarket();notify(`Sold! +${coins} coins for your next harvest.`);return {coins};
  }catch(e){notify(e.message);return {error:e.message};}
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
  const now=farmNow();
  const coinBoost=state.boosts.coinsUntil>now;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('market-dialog').open)renderMarket();}
  document.querySelectorAll('[data-building-status]').forEach(el=>{const s=status(el.dataset.buildingStatus,now);el.textContent=s.text;el.className=`building-status ${s.kind}`;});
  const count=Object.keys(BUILDINGS).filter(key=>status(key,now).kind==='ready').length;$('production-count').hidden=!count;$('production-count').textContent=count;
  if($('building-dialog').open&&currentBuilding){
   const job=state.buildings[currentBuilding].job;
   if(job){const isReady=now>=job.readyAt;if(isReady!==lastJobReady){renderBuilding();}else if($('job-time')){$('job-time').textContent=isReady?'Your batch is ready!':`${seconds(job.readyAt-now)} remaining`;$('job-progress').value=Math.min(100,(now-job.startedAt)/(job.readyAt-job.startedAt)*100);}}
  }
 }
 $('selected-crop-button').addEventListener('click',openSeeds);$('seed-shop-button').addEventListener('click',openSeeds);
 $('buildings-button').addEventListener('click',openBuildings);$('all-buildings').addEventListener('click',openBuildings);
 document.querySelectorAll('[data-seed-filter]').forEach(b=>b.addEventListener('click',()=>{seedFilter=b.dataset.seedFilter;renderSeeds();}));
 document.querySelectorAll('[data-market-tab]').forEach(b=>b.addEventListener('click',()=>{marketTab=b.dataset.marketTab;renderMarket();}));
 return {openBuilding,openBuildings,openSeeds,renderBuilding,renderMarket,sell,refresh,tick,status,chooseCrop,itemList};
}
