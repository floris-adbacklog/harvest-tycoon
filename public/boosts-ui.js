import {BUILDINGS,RECIPES,productionJobs,SINGLE_BATCH_COST,featureUnlocked,featureUnlockHint,BOOSTS,DIAMOND_PACKS,SINGLE_CROP_COST,CROPS,boostStatus,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {fieldPicker,bindFieldPicker} from './field-picker.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');

export function createBoostsUI({state,runAction,onChange,notify}){
 let lastStatus='',catalog=null,purchasing='',requests={},selectedField='',selectedBatch='',finishing=false;
 const bridge=()=>window.parent.harvestBridge;
 function runningBatches(){return Object.entries(state.buildings).flatMap(([building,b])=>productionJobs(b).map((job,index)=>({building,job,number:index+1,key:building+'/'+job.id})).filter(b=>b.job.readyAt>farmNow()));}
 function signature(){return [...runningBatches().map(b=>b.key),state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason),...state.plots.filter(p=>p.crop&&p.readyAt>farmNow()).map(p=>`${p.id}:${p.crop}`)].join('|');}
 function render(){
  $('boost-wallet').textContent=number(state.diamonds);
  $('boost-catalog').innerHTML=Object.entries(BOOSTS).map(([id,b])=>{
   const status=boostStatus(state,id,farmNow());
   return `<article class="boost-card ${status.remaining?'boost-active':''}"><div class="boost-card-art">${art(id==='crops'?'instant-harvest':b.art)}</div><div class="boost-card-copy"><h3>${b.name}</h3><p>${b.description}</p><span class="boost-detail" data-boost-time="${id}">${status.remaining?`Active · ${formatDuration(status.remaining)} left`:status.reason||(state.diamonds<b.cost?`Need ${b.cost-state.diamonds} more diamonds · Earn them in Today`:'Ready to activate')}</span></div><button class="boost-buy" data-buy-boost="${id}" ${status.canBuy?'':'disabled'} aria-label="Activate ${b.name} for ${b.cost} diamonds">${art('diamonds')}<span>${b.cost}</span><small>${status.remaining?'Active':id==='upgrade'&&state.boosts.upgradeCredits?'Ready':'Activate'}</small></button></article>`;
  }).join('');
  const batches=runningBatches();if(!batches.some(b=>b.key===selectedBatch))selectedBatch='';
  const selection=batches.find(b=>b.key===selectedBatch);
  $('boost-catalog').insertAdjacentHTML('afterbegin',`<article class="boost-card"><div class="boost-card-art">${art('boost')}</div><div class="boost-card-copy"><h3>Finish one batch</h3><p>Make one running batch ready instantly. Collect its goods from the building afterwards.</p><details class="batch-select"><summary>${selection?`${BUILDINGS[selection.building].name} · ${RECIPES[selection.job.recipe].name} · Batch ${selection.number}`:'Choose a running batch'}</summary><div>${batches.map((b,i)=>`<button type="button" data-batch-choice="${i}" aria-pressed="${b.key===selectedBatch}" ${finishing?'disabled':''}><strong>${BUILDINGS[b.building].name} · ${RECIPES[b.job.recipe].name} · Batch ${b.number}</strong><small>${formatDuration(b.job.readyAt-farmNow())} remaining</small></button>`).join('')||'<p>No batches are running.</p>'}</div></details></div><button id="finish-one-batch" class="boost-buy" ${!selection||finishing||state.diamonds<SINGLE_BATCH_COST?'disabled':''}>${art('diamonds')}<span>${SINGLE_BATCH_COST}</span><small>Finish batch</small></button></article>`);
  $('boost-catalog').querySelectorAll('[data-batch-choice]').forEach(b=>b.onclick=()=>{selectedBatch=batches[Number(b.dataset.batchChoice)].key;render();});
  $('finish-one-batch').onclick=async()=>{if(finishing||!selection)return;finishing=true;render();try{await runAction({type:'finish_batch',building:selection.building,jobId:selection.job.id,expectedCost:SINGLE_BATCH_COST});selectedBatch='';onChange();notify('Your batch is ready. Collect it from the building.');}catch(error){$('boost-feedback').textContent=error.message;}finally{finishing=false;render();}};
  const growing=state.plots.filter(p=>p.crop&&p.readyAt>farmNow());
  if(!growing.some(p=>String(p.id)===selectedField))selectedField='';
  $('boost-catalog').insertAdjacentHTML('afterbegin',`<article class="boost-card"><div class="boost-card-art">${art('seeds')}</div><div class="boost-card-copy"><h3>Finish one crop</h3><p>Choose one growing field. Its crop will be ready to harvest instantly.</p><span class="field-picker-label">Choose a field</span>${fieldPicker({id:'finish-crop-field',plots:growing,selected:selectedField===''?[]:[selectedField],now:farmNow(),disabled:finishing})}<small>${state.diamonds<SINGLE_CROP_COST?`You need ${SINGLE_CROP_COST} diamonds.`:''}</small></div><button id="finish-one-crop" class="boost-buy" ${selectedField===''||state.diamonds<SINGLE_CROP_COST||finishing?'disabled':''} aria-label="Finish the selected crop for ${SINGLE_CROP_COST} diamonds">${art('diamonds')}<span>${SINGLE_CROP_COST}</span><small>${finishing?'Finishing…':'Finish crop'}</small></button></article>`);
  bindFieldPicker($('finish-crop-field'),{onChange:ids=>{selectedField=String(ids[0]??'');$('finish-one-crop').disabled=selectedField===''||state.diamonds<SINGLE_CROP_COST||finishing;}});
  $('finish-one-crop').onclick=async()=>{if(finishing||selectedField==='')return;const id=Number(selectedField);finishing=true;render();try{const r=await runAction({type:'finish_crop',id,expectedCost:SINGLE_CROP_COST});selectedField='';onChange();const message=`Field ${r.field+1}: ${CROPS[r.crop].name} is ready to harvest!`;$('boost-feedback').textContent=message;notify(message);}catch(error){$('boost-feedback').textContent=error.message;}finally{finishing=false;render();}};
  $('diamond-packs').innerHTML=DIAMOND_PACKS.map(pack=>`<article class="diamond-pack" data-state="${purchasing===String(pack.amount)?'opening':catalog?.enabled?'available':'unavailable'}">${art('diamonds')}<h3>${number(pack.amount)} <span>diamonds</span></h3><strong>${pack.price}</strong><button type="button" data-diamond-pack="${pack.amount}" aria-label="Buy ${number(pack.amount)} diamonds for ${pack.price}" ${!catalog?.enabled||purchasing?'disabled':''}>${purchasing===String(pack.amount)?'Opening checkout…':catalog?.enabled?(catalog.mode==='test'?'Test checkout':'Buy diamonds'):'Currently unavailable'}</button></article>`).join('');
  $('diamond-packs').querySelectorAll('[data-diamond-pack]').forEach(button=>button.onclick=async()=>{
   if(purchasing||!catalog?.enabled)return;const pack=button.dataset.diamondPack;purchasing=pack;requests[pack]??=crypto.randomUUID();render();
   try{await bridge().checkout(pack,requests[pack]);}catch(error){$('boost-feedback').textContent=error.message;purchasing='';render();}
  });
  $('boost-catalog').querySelectorAll('[data-buy-boost]').forEach(button=>button.onclick=async()=>{
   try{
    const id=button.dataset.buyBoost,result=await runAction({type:'buy_boost',boost:id,expectedCost:BOOSTS[id].cost});onChange();render();
    const message=id==='crops'?`${result.affected} crops are ready to harvest!`:id==='production'?`${result.affected} batches are ready to collect!`:id==='upgrade'?'Your next production-building upgrade costs 50% less.':`${BOOSTS[id].name} is active for 30 minutes.`;
    $('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);render();}
  });
  lastStatus=signature();refreshArt();
 }
 async function open(){if(!featureUnlocked(state,'boosts')){notify(featureUnlockHint('boosts'));return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';requests={};render();$('boost-dialog').showModal();try{catalog=await bridge().payments({operation:'catalog'});render();}catch{catalog=null;$('boost-feedback').textContent='The diamond shop is unavailable. Your existing boosts still work.';render();}}
 function refresh(){
  $('diamonds').textContent=state.diamonds.toLocaleString('en-US',matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)').matches?{notation:'compact',maximumFractionDigits:1}:{});
  $('diamond-button').setAttribute('aria-label',`${number(state.diamonds)} diamonds. Open boosts and diamond shop.`);
  if($('boost-dialog').open)render();tick();
 }
 function tick(){
  const now=farmNow(),active=[];
  for(const [id,label,until] of [['xp','2× XP',state.boosts.xpUntil],['coins','2× coins',state.boosts.coinsUntil]]){
   if(until>now)active.push(`${label} · ${formatDuration(until-now)}`);
   const el=document.querySelector(`[data-boost-time="${id}"]`);if(el&&until>now)el.textContent=`Active · ${formatDuration(until-now)} left`;
  }
  if(state.boosts.upgradeCredits)active.push('50% upgrade voucher');
  $('active-boosts').hidden=!active.length;$('active-boosts').textContent=active.join(' · ');
  if($('boost-dialog').open&&signature()!==lastStatus)render();
 }
 $('diamond-button').onclick=open;
 $('boosts-button').onclick=open;
 $('boost-daily').onclick=()=>{$('boost-dialog').close();$('today-button').click();};
 return {open,refresh,tick};
}
