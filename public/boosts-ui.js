import {confirmDiamondSpend} from './diamond-confirm.js';
import {VIP_PLANS,vipActive,BUILDINGS,RECIPES,productionJobs,SINGLE_BATCH_COST,featureUnlocked,featureUnlockHint,BOOSTS,DIAMOND_PACKS,SINGLE_CROP_COST,CROPS,boostStatus,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {fieldPicker,batchPicker,bindFieldPicker} from './field-picker.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');

export function createBoostsUI({state,runAction,onChange,notify}){
 let lastStatus='',catalog=null,purchasing='',requests={},selectedField='',selectedBatch='',finishing=false;
 const bridge=()=>window.parent.harvestBridge;
 let previousVip=vipActive(state,farmNow()),observedExpiry=state.vipExpiresAt??0;
 const track=(event,params={})=>bridge()?.trackCommerce?.(event,params);
 function runningBatches(){return Object.entries(state.buildings).flatMap(([building,b])=>productionJobs(b).map((job,index)=>({building,job,number:index+1,key:building+'/'+job.id})).filter(b=>b.job.readyAt>farmNow()));}
 function signature(){return [state.vipExpiresAt,vipActive(state,farmNow()),finishing,...runningBatches().map(b=>b.key),state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason),...state.plots.filter(p=>p.crop&&p.readyAt>farmNow()).map(p=>`${p.id}:${p.crop}`)].join('|');}
 function render(){
  $('boost-wallet').textContent=number(state.diamonds);
  const batches=runningBatches();if(!batches.some(b=>b.key===selectedBatch))selectedBatch='';
  const selection=batches.find(b=>b.key===selectedBatch);
  const growing=state.plots.filter(p=>p.crop&&p.readyAt>farmNow());
  if(!growing.some(p=>String(p.id)===selectedField))selectedField='';
  // One card layout for everything: picture, title and text, a status line, and a price button that never changes size.
  const chip=(kind,text,time='')=>`<span class="boost-detail" data-state="${kind}"${time?` data-boost-time="${time}"`:''}>${text}</span>`;
  const price=(cost,verb)=>`<span class="boost-price">${art('diamonds')}<b>${cost}</b></span><small>${verb}</small>`;
  const card=({cls='',picture,title,text,detail='',button,extra=''})=>`<article class="boost-card ${cls}"><div class="boost-card-art">${art(picture)}</div><div class="boost-card-copy"><h3>${title}</h3><p>${text}</p>${detail}</div>${button}${extra?`<div class="boost-card-extra">${extra}</div>`:''}</article>`;
  const boostCard=([id,b])=>{
   const status=boostStatus(state,id,farmNow()),active=Boolean(status.remaining);
   const [kind,text]=active?['active',`Active · ${formatDuration(status.remaining)} left`]:status.reason?['blocked',status.reason]:state.diamonds<b.cost?['need',`Need ${number(b.cost-state.diamonds)} more diamonds`]:['ready','Ready to use'];
   return card({cls:active?'boost-active':'',picture:id==='crops'?'instant-harvest':b.art,title:b.name,text:b.description,detail:chip(kind,text,id),button:`<button class="boost-buy" data-buy-boost="${id}" ${status.canBuy&&!finishing?'':'disabled'} aria-label="Activate ${b.name} for ${b.cost} diamonds">${price(b.cost,active?'Active':id==='upgrade'&&state.boosts.upgradeCredits?'Ready':'Activate')}</button>`});
  };
  const cropCard=card({picture:'seeds',title:'Finish one crop',text:'Choose one growing field. Its crop will be ready to harvest instantly.',
   detail:state.diamonds<SINGLE_CROP_COST?chip('need',`Need ${number(SINGLE_CROP_COST-state.diamonds)} more diamonds`):'',
   button:`<button id="finish-one-crop" class="boost-buy" ${selectedField===''||state.diamonds<SINGLE_CROP_COST||finishing?'disabled':''} aria-label="Finish the selected crop for ${SINGLE_CROP_COST} diamonds">${price(SINGLE_CROP_COST,finishing?'Finishing…':'Finish crop')}</button>`,
   extra:`<span class="field-picker-label">Choose a field</span>${fieldPicker({id:'finish-crop-field',plots:growing,selected:selectedField===''?[]:[selectedField],now:farmNow(),disabled:finishing})}`});
  const batchCard=card({picture:'boost',title:'Finish one batch',text:'Make one running batch ready instantly. Collect its goods from the building afterwards.',
   detail:state.diamonds<SINGLE_BATCH_COST?chip('need',`Need ${number(SINGLE_BATCH_COST-state.diamonds)} more diamonds`):'',
   button:`<button id="finish-one-batch" class="boost-buy" ${!selection||finishing||state.diamonds<SINGLE_BATCH_COST?'disabled':''} aria-label="Finish the selected batch for ${SINGLE_BATCH_COST} diamonds">${price(SINGLE_BATCH_COST,'Finish batch')}</button>`,
   extra:`<span class="field-picker-label">Choose a batch</span>${batchPicker({id:'finish-batch-picker',batches,selectedKey:selectedBatch,now:farmNow(),disabled:finishing})}`});
  const finishNow=['crops','production'],entries=Object.entries(BOOSTS);
  $('boost-catalog').innerHTML=`<section class="shop-section"><h3 class="shop-heading">Finish now</h3><div class="shop-list">${cropCard}${batchCard}${entries.filter(([id])=>finishNow.includes(id)).map(boostCard).join('')}</div></section><section class="shop-section"><h3 class="shop-heading">Boosts</h3><div class="shop-list">${entries.filter(([id])=>!finishNow.includes(id)).map(boostCard).join('')}</div></section>`;
  bindFieldPicker($('finish-batch-picker'),{onChange:ids=>{selectedBatch=ids.length?batches[ids[0]]?.key??'':'';$('finish-one-batch').disabled=selectedBatch===''||state.diamonds<SINGLE_BATCH_COST||finishing;}});
  $('finish-one-batch').onclick=async()=>{const chosen=batches.find(b=>b.key===selectedBatch);if(finishing||!chosen)return;finishing=true;render();try{await runAction({type:'finish_batch',building:chosen.building,jobId:chosen.job.id,expectedCost:SINGLE_BATCH_COST});selectedBatch='';onChange();notify('Your batch is ready. Collect it from the building.');}catch(error){$('boost-feedback').textContent=error.message;}finally{finishing=false;render();}};
  bindFieldPicker($('finish-crop-field'),{onChange:ids=>{selectedField=String(ids[0]??'');$('finish-one-crop').disabled=selectedField===''||state.diamonds<SINGLE_CROP_COST||finishing;}});
  $('finish-one-crop').onclick=async()=>{if(finishing||selectedField==='')return;const id=Number(selectedField);finishing=true;render();try{const r=await runAction({type:'finish_crop',id,expectedCost:SINGLE_CROP_COST});selectedField='';onChange();const message=`Field ${r.field+1}: ${CROPS[r.crop].name} is ready to harvest!`;$('boost-feedback').textContent=message;notify(message);}catch(error){$('boost-feedback').textContent=error.message;}finally{finishing=false;render();}};
  $('diamond-packs').innerHTML=DIAMOND_PACKS.map(pack=>`<article class="diamond-pack" data-state="${purchasing===String(pack.amount)?'opening':catalog?.enabled?'available':'unavailable'}">${art('diamonds')}<h3>${number(pack.amount)} <span>diamonds</span></h3><strong>${pack.price}</strong><button type="button" data-diamond-pack="${pack.amount}" aria-label="Buy ${number(pack.amount)} diamonds for ${pack.price}" ${!catalog?.enabled||purchasing?'disabled':''}>${purchasing===String(pack.amount)?'Opening checkout…':catalog?.enabled?(catalog.mode==='test'?'Test checkout':'Buy diamonds'):'Currently unavailable'}</button></article>`).join('');
  $('diamond-packs').querySelectorAll('[data-diamond-pack]').forEach(button=>button.onclick=async()=>{
   if(purchasing||!catalog?.enabled)return;const pack=button.dataset.diamondPack;purchasing=pack;requests[pack]??=crypto.randomUUID();render();
   try{await bridge().checkout(pack,requests[pack]);}catch(error){$('boost-feedback').textContent=error.message;purchasing='';render();}
  });
  $('boost-catalog').querySelectorAll('[data-buy-boost]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const id=button.dataset.buyBoost,offer=BOOSTS[id];finishing=true;render();
   try{
    if(offer.cost>=150&&!await confirmDiamondSpend({title:offer.name,cost:offer.cost,description:offer.description}))return;
    const result=await runAction({type:'buy_boost',boost:id,expectedCost:offer.cost});onChange();
    const message=id==='crops'?`${result.affected} crops are ready to harvest!`:id==='production'?`${result.affected} batches are ready to collect!`:id==='upgrade'?'Your next production-building upgrade costs 50% less.':`${offer.name} is active for 30 minutes.`;
    $('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  let vipPanel=$('vip-shop');if(!vipPanel){vipPanel=document.createElement('section');vipPanel.id='vip-shop';vipPanel.className='vip-shop';$('boost-catalog').after(vipPanel);}
  const active=vipActive(state,farmNow());
  vipPanel.innerHTML=`<div class="vip-shop-heading">${art('vip')}<div><h3>A little VIP sunshine</h3><p>Choose the plan that suits you best.</p>${active?`<span class="vip-status" data-vip-status>VIP · ${formatDuration(state.vipExpiresAt-farmNow())} left</span>`:''}</div></div><ul class="vip-benefits" aria-label="VIP benefits">${[['wheat','10% faster crops'],['buildings','10% faster production'],['coins','+5% market coins'],['gift','2x daily rewards']].map(([icon,title])=>`<li>${art(icon)}<strong>${title}</strong></li>`).join('')}</ul><div class="vip-plans">${Object.entries(VIP_PLANS).map(([id,plan])=>`<article class="vip-plan"><div class="vip-plan-copy"><strong>${plan.name}</strong><span>${id==='week'?'A week of VIP extras':'Best value'}</span></div><button type="button" class="small-button" data-buy-vip="${id}" aria-label="${active?'Extend':'Activate'} ${plan.name} for ${number(plan.cost)} diamonds" ${finishing||state.diamonds<plan.cost?'disabled':''}>${art('diamonds')}<span>${active?'Extend':'Activate'} · ${number(plan.cost)}</span></button>${state.diamonds<plan.cost?`<small>Need ${number(plan.cost-state.diamonds)} more diamonds</small>`:''}</article>`).join('')}</div>`;
  vipPanel.querySelectorAll('[data-buy-vip]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const plan=button.dataset.buyVip,offer=VIP_PLANS[plan],expectedExpiresAt=state.vipExpiresAt??0;finishing=true;render();
   try{if(!await confirmDiamondSpend({title:active?'Extend your VIP':'Activate VIP',cost:offer.cost,description:`${offer.name}. ${active?'Adds time after your current VIP expires.':'Starts immediately.'} Your benefits never stack in strength.`}))return;
    track('vip_purchase_started',{plan,cost:offer.cost});await runAction({type:'buy_vip',plan,expectedCost:offer.cost,expectedExpiresAt});onChange();notify(active?'Your VIP time has been extended.':'Welcome to VIP! Your extras are active.');
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  lastStatus=signature();refreshArt();
 }
 async function open(){if(!featureUnlocked(state,'boosts')){notify(featureUnlockHint('boosts'));return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';requests={};render();$('boost-dialog').showModal();track('diamond_shop_view');try{catalog=await bridge().payments({operation:'catalog'});render();}catch{catalog=null;$('boost-feedback').textContent='The diamond shop is unavailable. Your existing boosts still work.';render();}}
 function refresh(){
  $('diamonds').textContent=state.diamonds.toLocaleString('en-US',matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)').matches?{notation:'compact',maximumFractionDigits:1}:{});
  $('diamond-button').setAttribute('aria-label',`${number(state.diamonds)} diamonds. Open boosts and diamond shop.`);
  if($('boost-dialog').open)render();tick();
 }
 function tick(){
  const now=farmNow(),active=[],isVip=vipActive(state,now);
  if(previousVip&&!isVip&&observedExpiry===state.vipExpiresAt)track('vip_expired');
  previousVip=isVip;observedExpiry=state.vipExpiresAt??0;
  if(isVip)active.push(`VIP · ${formatDuration(state.vipExpiresAt-now)}`);
  const vipStatus=document.querySelector('[data-vip-status]');if(vipStatus&&isVip)vipStatus.textContent=`VIP · ${formatDuration(state.vipExpiresAt-now)} left`;

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
