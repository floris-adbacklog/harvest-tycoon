import {BOOSTS,DIAMOND_PACKS,SINGLE_CROP_COST,CROPS,boostStatus,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');

export function createBoostsUI({state,runAction,onChange,notify}){
 let lastStatus='',catalog=null,purchasing=false,requests={},selectedField='',finishing=false;
 const bridge=()=>window.parent.harvestBridge;
 function signature(){return [state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason)].join('|');}
 function render(){
  $('boost-wallet').textContent=number(state.diamonds);
  $('boost-catalog').innerHTML=Object.entries(BOOSTS).map(([id,b])=>{
   const status=boostStatus(state,id,farmNow());
   return `<article class="boost-card ${status.remaining?'boost-active':''}"><div class="boost-card-art">${art(b.art)}</div><div class="boost-card-copy"><h3>${b.name}</h3><p>${b.description}</p><span class="boost-detail" data-boost-time="${id}">${status.remaining?`Active · ${formatDuration(status.remaining)} left`:status.reason||(state.diamonds<b.cost?`Need ${b.cost-state.diamonds} more diamonds · Earn them in Today`:'Ready to activate')}</span></div><button class="boost-buy" data-buy-boost="${id}" ${status.canBuy?'':'disabled'} aria-label="Activate ${b.name} for ${b.cost} diamonds">${art('diamonds')}<span>${b.cost}</span><small>${status.remaining?'Active':id==='upgrade'&&state.boosts.upgradeCredits?'Ready':'Activate'}</small></button></article>`;
  }).join('');
  const growing=state.plots.filter(p=>p.crop&&p.readyAt>farmNow());
  if(!growing.some(p=>String(p.id)===selectedField))selectedField='';
  $('boost-catalog').insertAdjacentHTML('afterbegin',`<article class="boost-card"><div class="boost-card-art">${art('seeds')}</div><div class="boost-card-copy"><h3>Finish one crop</h3><p>Choose one growing field. Its crop will be ready to harvest instantly.</p><label for="finish-crop-field">Choose a field</label><select id="finish-crop-field" style="display:block;max-width:100%;width:100%;min-height:44px;margin-top:8px;font:inherit" ${!growing.length||finishing?'disabled':''}><option value="">${growing.length?'Select a growing crop…':'No crops are growing'}</option>${growing.map(p=>`<option value="${p.id}" ${String(p.id)===selectedField?'selected':''}>Field ${p.id+1} · ${CROPS[p.crop].name} · ${formatDuration(p.readyAt-farmNow())}</option>`).join('')}</select><small>${state.diamonds<SINGLE_CROP_COST?`You need ${SINGLE_CROP_COST} diamonds.`:''}</small></div><button id="finish-one-crop" class="boost-buy" ${selectedField===''||state.diamonds<SINGLE_CROP_COST||finishing?'disabled':''} aria-label="Finish the selected crop for ${SINGLE_CROP_COST} diamonds">${art('diamonds')}<span>${SINGLE_CROP_COST}</span><small>${finishing?'Finishing…':'Finish crop'}</small></button></article>`);
  $('finish-crop-field').onchange=event=>{selectedField=event.target.value;render();};
  $('finish-one-crop').onclick=async()=>{if(finishing||selectedField==='')return;const id=Number(selectedField);finishing=true;render();try{const r=await runAction({type:'finish_crop',id,expectedCost:SINGLE_CROP_COST});selectedField='';onChange();const message=`Field ${r.field+1}: ${CROPS[r.crop].name} is ready to harvest!`;$('boost-feedback').textContent=message;notify(message);}catch(error){$('boost-feedback').textContent=error.message;}finally{finishing=false;render();}};
  $('diamond-packs').innerHTML=DIAMOND_PACKS.map(pack=>`<article class="diamond-pack">${art('diamonds')}<h3>${number(pack.amount)} <span>diamonds</span></h3><strong>${pack.price}</strong><button data-diamond-pack="${pack.amount}" ${!catalog?.enabled||purchasing?'disabled':''}>${purchasing?'Opening checkout…':catalog?.enabled?(catalog.mode==='test'?'Test checkout':'Buy diamonds'):'Currently unavailable'}</button></article>`).join('');
  $('diamond-packs').querySelectorAll('[data-diamond-pack]').forEach(button=>button.onclick=async()=>{
   if(purchasing)return;const pack=button.dataset.diamondPack;purchasing=true;requests[pack]??=crypto.randomUUID();render();
   try{await bridge().checkout(pack,requests[pack]);}catch(error){$('boost-feedback').textContent=error.message;purchasing=false;render();}
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
 async function open(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';requests={};render();$('boost-dialog').showModal();try{catalog=await bridge().payments({operation:'catalog'});render();}catch{catalog=null;$('boost-feedback').textContent='The diamond shop is unavailable. Your existing boosts still work.';render();}}
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
