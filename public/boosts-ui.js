import {confirmDiamondSpend} from './diamond-confirm.js';
import {VIP_PLANS,vipActive,BUILDINGS,RECIPES,productionJobs,SINGLE_BATCH_COST,featureUnlocked,featureUnlockHint,BOOSTS,DIAMOND_PACKS,SINGLE_CROP_COST,CROPS,boostStatus,boostOffer,BOOST_DURATIONS,BOOST_LENGTH_NAMES,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {fitText} from './fit-text.js';
import {art,refreshArt} from './visual-icons.js';
import {prettifySelects} from './pretty-select.js';
import {fieldPicker,batchPicker,bindFieldPicker} from './field-picker.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const LENGTH_LABELS={'30m':'30 min','1h':'1 hour','1d':'1 day'};
// The picture of each diamond pack, from a handful to a big chest (painted; plain diamonds until those arrive).
const PACK_ART=['pack-nest','pack-sack','pack-chest','pack-gold'];

export function createBoostsUI({state,runAction,onChange,notify}){
 let lastStatus='',catalog=null,purchasing='',requests={},selectedFields=[],selectedBatches=[],finishing=false;
 // The length picked on each timed boost: 30 minutes every time the shop opens and after each purchase.
 let lengths={};const lengthOf=id=>BOOSTS[id].prices?lengths[id]??'30m':undefined;
 const bridge=()=>window.parent.harvestBridge;
 let previousVip=vipActive(state,farmNow()),observedExpiry=state.vipExpiresAt??0;
 const track=(event,params={})=>bridge()?.trackCommerce?.(event,params);
 // Factory batches are too big to finish with diamonds (the server refuses them, like Finish production skips them).
 function runningBatches(){return Object.entries(state.buildings).filter(([building])=>building!=='factory').flatMap(([building,b])=>productionJobs(b).map((job,index)=>({building,job,number:index+1,key:building+'/'+job.id})).filter(b=>b.job.readyAt>farmNow()));}
 function signature(){return [state.vipExpiresAt,vipActive(state,farmNow()),finishing,...runningBatches().map(b=>b.key),state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason),...state.plots.filter(p=>p.crop&&p.readyAt>farmNow()).map(p=>`${p.id}:${p.crop}`)].join('|');}
 // Finish crops / batches: the selection, its total price, and the button label and state kept in step with it.
 const FINISH={crop:{cost:SINGLE_CROP_COST,button:'finish-one-crop',one:'crop',many:'crops',selected:()=>selectedFields},batch:{cost:SINGLE_BATCH_COST,button:'finish-one-batch',one:'batch',many:'batches',selected:()=>selectedBatches}};
 function finishLabel(kind){const f=FINISH[kind],n=f.selected().length;return `<span class="boost-price">${art('diamonds')}<b>${f.cost*Math.max(1,n)}</b></span><small>${finishing?'Finishing…':`Finish ${n>1?`${n} ${f.many}`:f.one}`}</small>`;}
 function updateFinish(kind){const f=FINISH[kind],n=f.selected().length,button=$(f.button);if(!button)return;button.innerHTML=finishLabel(kind);button.disabled=!n||finishing||state.diamonds<f.cost*n;
  // Not even one: the button takes you to the packs instead of sitting there grey.
  const short=button.parentElement?.querySelector('.boost-card-extra')?f.cost-state.diamonds:0;button.classList.toggle('is-short',short>0);if(short>0){button.dataset.getDiamonds=short;button.disabled=finishing;}else delete button.dataset.getDiamonds;button.setAttribute('aria-label',`Finish ${n||'the selected'} ${n===1?f.one:f.many} for ${f.cost*Math.max(1,n)} diamonds`);}
 // One action per field or batch, the same as finishing them one by one; stops at the first problem.
 async function finishMany(kind){
  const f=FINISH[kind],picked=[...f.selected()];if(finishing||!picked.length)return;
  const cost=f.cost*picked.length;
  if(cost>=150&&!await confirmDiamondSpend({title:`Finish ${picked.length} ${f.many}`,cost,description:`${f.cost} diamonds each. They are ready right away.`,picture:kind==='crop'?'harvest':'buildings',balance:state.diamonds}))return;
  finishing=true;render();const done=[];
  try{
   for(const item of picked){
    if(kind==='crop')done.push(await runAction({type:'finish_crop',id:Number(item),expectedCost:SINGLE_CROP_COST}));
    else{const chosen=runningBatches().find(b=>b.key===item);if(!chosen)continue;done.push(await runAction({type:'finish_batch',building:chosen.building,jobId:chosen.job.id,expectedCost:SINGLE_BATCH_COST}));}
   }
  }catch(error){$('boost-feedback').textContent=error.message;}
  finally{
   finishing=false;
   if(kind==='crop')selectedFields=[];else selectedBatches=[];
   if(done.length){
    onChange();
    const message=kind==='crop'?(done.length===1?`Field ${done[0].field+1}: ${CROPS[done[0].crop].name} is ready to harvest!`:`${done.length} crops are ready to harvest!`):(done.length===1?'Your batch is ready. Collect it from the building.':`${done.length} batches are ready. Collect them from their buildings.`);
    if(!$('boost-feedback').textContent)$('boost-feedback').textContent=message;notify(message);
   }
   render();
  }
 }
 function render(){
  $('boost-wallet').textContent=number(state.diamonds);
  const batches=runningBatches();selectedBatches=selectedBatches.filter(key=>batches.some(b=>b.key===key));
  const growing=state.plots.filter(p=>p.crop&&p.readyAt>farmNow());selectedFields=selectedFields.filter(id=>growing.some(p=>String(p.id)===id));
  // One card layout for everything: picture, title and text, a status line, and a price button that never changes size.
  // Short of diamonds: the reason, then a plain "Get diamonds" button (the game's own small button; the price button does the
  // same) that shows the packs with the smallest one that covers it marked.
  const getMore=short=>short>0?`<button type="button" class="small-button get-diamonds" data-get-diamonds="${short}">${art('diamonds')}Get diamonds</button>`:'';
  const chip=(kind,text,time='')=>`<span class="boost-detail" data-state="${kind}"${time?` data-boost-time="${time}"`:''}>${text}</span>`;
  const price=(cost,verb)=>`<span class="boost-price">${art('diamonds')}<b>${cost}</b></span><small>${verb}</small>`;
  const card=({cls='',picture,title,text,detail='',button,extra=''})=>`<article class="boost-card ${cls}"><div class="boost-card-art">${art(picture)}</div><div class="boost-card-copy"><h3>${title}</h3><p>${text}</p>${detail}</div>${button}${extra?`<div class="boost-card-extra">${extra}</div>`:''}</article>`;
  // A timed boost (Double XP, Double harvest, Double earnings) has a small "30 min ⌄" dropdown next to its status (the game's own
  // dropdown, public/pretty-select.js): 30 min, 1 hour or 1 day, each with its price. The button buys the one picked; while the boost
  // runs, buying again adds that time after it.
  const lengthSelect=(id,b,picked)=>`<select class="boost-length" data-boost-length="${id}" data-pretty="compact" aria-label="How long" ${finishing?'disabled':''}>${Object.keys(BOOST_DURATIONS).map(length=>`<option value="${length}" data-detail="${number(b.prices[length])}" data-detail-art="diamonds" ${length===picked?'selected':''}>${LENGTH_LABELS[length]}</option>`).join('')}</select>`;
  const boostCard=([id,b])=>{
   const length=lengthOf(id),status=boostStatus(state,id,farmNow(),length),active=Boolean(status.remaining);
   const [kind,text]=active?['active',`Active · ${formatDuration(status.remaining)} left`]:status.reason?['blocked',status.reason]:state.diamonds<status.cost?['need',`Need ${number(status.cost-state.diamonds)} more diamonds`]:['ready','Ready to use'];
   const verb=active?'Extend':id==='upgrade'&&state.boosts.upgradeCredits?'Ready':'Activate';
   const label=`${active?'Extend':'Activate'} ${b.name}${length?` for ${BOOST_LENGTH_NAMES[length]}`:''} for ${status.cost} diamonds`;
   const more=kind==='need'?getMore(status.cost-state.diamonds):'';
   return card({cls:active?'boost-active':'',picture:id==='crops'?'instant-harvest':b.art,title:b.name,text:b.description,detail:length?`<div class="boost-status-row">${lengthSelect(id,b,length)}${chip(kind,text,id)}${more}</div>`:`<div class="boost-status-row">${chip(kind,text,id)}${more}</div>`,button:kind==='need'?`<button class="boost-buy is-short" data-get-diamonds="${status.cost-state.diamonds}" aria-label="${label}: get ${number(status.cost-state.diamonds)} more diamonds first">${price(status.cost,verb)}</button>`:`<button class="boost-buy" data-buy-boost="${id}" ${status.canBuy&&!finishing?'':'disabled'} aria-label="${label}">${price(status.cost,verb)}</button>`});
  };
  // Pick one or more fields (or batches): each costs the same 10 diamonds, the button shows the total.
  const cropCard=card({picture:'harvest',title:'Finish crops',text:`${SINGLE_CROP_COST} diamonds a field, ready to harvest now.`,
   // Nothing to choose from: say so in one chip instead of an empty picker.
   detail:!growing.length?chip('need','No crops growing'):state.diamonds<SINGLE_CROP_COST?`<div class="boost-status-row">${chip('need',`Need ${number(SINGLE_CROP_COST-state.diamonds)} more diamonds`)}${getMore(SINGLE_CROP_COST-state.diamonds)}</div>`:'',
   button:`<button id="finish-one-crop" class="boost-buy">${finishLabel('crop')}</button>`,
   extra:growing.length?`<span class="field-picker-label">Choose fields</span>${fieldPicker({id:'finish-crop-field',plots:growing,selected:selectedFields,multiple:true,available:Math.floor(state.diamonds/SINGLE_CROP_COST),now:farmNow(),disabled:finishing,hint:'Select crops to finish instantly',perItem:`${SINGLE_CROP_COST} diamonds per field`,picture:'harvest'})}`:''});
  const batchCard=card({picture:'buildings',title:'Finish batches',text:`${SINGLE_BATCH_COST} diamonds a batch, ready to collect now (not the Factory).`,
   detail:!batches.length?chip('need','No batches running'):state.diamonds<SINGLE_BATCH_COST?`<div class="boost-status-row">${chip('need',`Need ${number(SINGLE_BATCH_COST-state.diamonds)} more diamonds`)}${getMore(SINGLE_BATCH_COST-state.diamonds)}</div>`:'',
   button:`<button id="finish-one-batch" class="boost-buy">${finishLabel('batch')}</button>`,
   extra:batches.length?`<span class="field-picker-label">Choose batches</span>${batchPicker({id:'finish-batch-picker',batches,selectedKeys:selectedBatches,multiple:true,available:Math.floor(state.diamonds/SINGLE_BATCH_COST),now:farmNow(),disabled:finishing,perItem:`${SINGLE_BATCH_COST} diamonds per batch`})}`:''});
  const finishNow=['crops','production'],entries=Object.entries(BOOSTS);
  $('boost-catalog').innerHTML=`<section class="shop-section" id="shop-finish"><h3 class="shop-heading">Finish now</h3><div class="shop-list">${cropCard}${batchCard}${entries.filter(([id])=>finishNow.includes(id)).map(boostCard).join('')}</div></section><section class="shop-section" id="shop-boosts"><h3 class="shop-heading">Boosts</h3><div class="shop-list">${entries.filter(([id])=>!finishNow.includes(id)).map(boostCard).join('')}</div></section>`;
  if($('finish-batch-picker'))bindFieldPicker($('finish-batch-picker'),{multiple:true,available:Math.floor(state.diamonds/SINGLE_BATCH_COST),noun:['batch','batches'],onChange:ids=>{selectedBatches=ids.map(i=>batches[i]?.key).filter(Boolean);updateFinish('batch');}});
  if($('finish-crop-field'))bindFieldPicker($('finish-crop-field'),{multiple:true,available:Math.floor(state.diamonds/SINGLE_CROP_COST),onChange:ids=>{selectedFields=ids.map(String);updateFinish('crop');}});
  updateFinish('crop');updateFinish('batch');
  $('finish-one-crop').onclick=()=>finishMany('crop');
  $('finish-one-batch').onclick=()=>finishMany('batch');
  // The packs as tappable cards, smallest to largest: how many diamonds, the picture, the price. The biggest is "Best value".
  // Short of diamonds for something here: the smallest pack that covers it gets a green tab.
  // Each bigger pack's tab says how many more diamonds per euro it gives than the smallest pack, rounded.
  const perEuro=pack=>pack.amount/Number(pack.price.replace(/[^0-9.]/g,'')),base=perEuro(DIAMOND_PACKS[0]);
  const last=DIAMOND_PACKS.length-1,open=Boolean(catalog?.enabled)&&!purchasing;
  $('diamond-packs').innerHTML=DIAMOND_PACKS.map((pack,i)=>{
   const best=i===last,suggested=suggestion===pack.amount,opening=purchasing===String(pack.amount);
   const extra=Math.round((perEuro(pack)/base-1)*100);
   const tag=suggested?'<span class="pack-ribbon is-enough">✓ Enough for this</span>':best?`<span class="pack-ribbon">Best value · +${extra}%</span>`:extra>0?`<span class="pack-ribbon is-extra">+${extra}% extra</span>`:'';
   const foot=opening?'Opening…':catalog?.enabled?pack.price:catalog?'Unavailable':pack.price;
   return `<button type="button" class="diamond-pack${best?' is-best':''}${suggested?' is-suggested':''}" data-diamond-pack="${pack.amount}" data-state="${opening?'opening':catalog?.enabled?'available':'unavailable'}" aria-label="Buy ${number(pack.amount)} diamonds for ${pack.price}" ${open?'':'disabled'}>${tag}<span class="pack-amount"><b>${number(pack.amount)}</b><small>diamonds</small></span>${art(PACK_ART[i]??'diamonds')}<span class="pack-price">${foot}</span></button>`;}).join('')
   +(catalog?.mode==='test'?'<p class="pack-note">Test checkout: no real payment.</p>':'')
   +(packError?`<p class="pack-error" role="alert">${packError.message}</p>`:'');
  $('diamond-packs').querySelectorAll('[data-diamond-pack]').forEach(button=>button.onclick=async()=>{
   if(purchasing||!catalog?.enabled)return;const pack=button.dataset.diamondPack;purchasing=pack;packError=null;requests[pack]??=crypto.randomUUID();render();
   // A problem opening the checkout shows right under the packs.
   try{await bridge().checkout(pack,requests[pack]);}catch(error){packError={pack,message:String(error.message).replace(/[<>&]/g,'')};purchasing='';render();}
  });
  prettifySelects($('boost-catalog'));
  $('boost-catalog').querySelectorAll('[data-boost-length]').forEach(select=>select.onchange=()=>{
   const id=select.dataset.boostLength;lengths[id]=select.value;render();
   $('boost-catalog').querySelector(`[data-boost-length="${id}"]`)?.nextElementSibling?.querySelector('.pretty-select-toggle')?.focus();
  });
  $('boost-catalog').querySelectorAll('[data-buy-boost]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const id=button.dataset.buyBoost,boost=BOOSTS[id],length=lengthOf(id),offer=boostOffer(id,length),running=boostStatus(state,id,farmNow(),length).remaining>0,time=length&&BOOST_LENGTH_NAMES[length];finishing=true;render();
   try{
    if(offer.cost>=150&&!await confirmDiamondSpend({title:time?`${boost.name} · ${time}`:boost.name,cost:offer.cost,description:time?(running?`Adds ${time} after your current ${boost.name} ends.`:`${boost.description} Starts now and runs for ${time}.`):boost.description,picture:id==='crops'?'instant-harvest':boost.art,balance:state.diamonds}))return;
    const result=await runAction({type:'buy_boost',boost:id,...(length?{length}:{}),expectedCost:offer.cost});delete lengths[id];onChange();
    const message=id==='crops'?`${result.affected} crops are ready to harvest!`:id==='production'?`${result.affected} batches are ready to collect!`:id==='upgrade'?'Your next production-building upgrade costs 50% less.':running?`${boost.name} extended by ${time}.`:`${boost.name} is active for ${time}.`;
    $('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  let vipPanel=$('vip-shop');if(!vipPanel){vipPanel=document.createElement('section');vipPanel.id='vip-shop';vipPanel.className='vip-shop';$('boost-catalog').after(vipPanel);}
  const active=vipActive(state,farmNow());
  // VIP: what it gives, then the two plans in the same row layout as the boosts (name left, price button right). Short of
  // diamonds: how many are missing and "Get diamonds" under the name.
  const vipCost=plan=>`<span class="boost-price">${art('diamonds')}<b>${number(plan.cost)}</b></span>`;
  vipPanel.innerHTML=`<div class="vip-shop-heading">${art('vip-farmer')}<div><h3>${active?'You are VIP':'Become VIP'}</h3><p>${active?`<span class="vip-status" data-vip-status>VIP · ${formatDuration(state.vipExpiresAt-farmNow())} left</span>`:'Extras for your whole farm while it runs.'}</p></div></div><ul class="vip-benefits" aria-label="VIP benefits">${[['wheat','10% faster crops'],['buildings','10% faster production'],['coins','+5% market coins'],['gift','2x daily rewards']].map(([icon,title])=>`<li>${art(icon)}<strong>${title}</strong></li>`).join('')}</ul><div class="vip-plans">${Object.entries(VIP_PLANS).map(([id,plan])=>{
   const short=plan.cost-state.diamonds,verb=active?'Extend':'Activate',days=Math.round(plan.duration/86400000);
   return `<article class="vip-plan${id==='month'?' is-best':''}"><div class="vip-plan-copy"><strong>${days} days${id==='month'?'<span class="vip-best">Best value</span>':''}</strong><span>${short>0?`Need ${number(short)} more diamonds`:id==='week'?'Try every extra for a week':'A whole month of extras'}</span>${getMore(short)}</div><button type="button" class="boost-buy vip-buy${short>0?' is-short':''}" ${short>0?`data-get-diamonds="${short}"`:`data-buy-vip="${id}"`} aria-label="${verb} ${plan.name} for ${number(plan.cost)} diamonds${short>0?`: get ${number(short)} more diamonds first`:''}" ${finishing?'disabled':''}>${vipCost(plan)}<small>${verb}</small></button></article>`;}).join('')}</div>`;
  vipPanel.querySelectorAll('[data-buy-vip]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const plan=button.dataset.buyVip,offer=VIP_PLANS[plan],expectedExpiresAt=state.vipExpiresAt??0;finishing=true;render();
   try{if(!await confirmDiamondSpend({title:active?'Extend your VIP':'Activate VIP',cost:offer.cost,description:`${offer.name}. ${active?'Adds time after your current VIP expires.':'Starts immediately.'} Your benefits never stack in strength.`,picture:'vip',balance:state.diamonds}))return;
    track('vip_purchase_started',{plan,cost:offer.cost});await runAction({type:'buy_vip',plan,expectedCost:offer.cost,expectedExpiresAt});onChange();notify(active?'Your VIP time has been extended.':'Welcome to VIP! Your extras are active.');
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  lastStatus=signature();refreshArt();
 }
 // "Get diamonds": to the packs, with the smallest that covers what is missing marked for a few seconds.
 let suggestion=0,suggestionTimer=0,packError=null;
 function showPacks(short){
  suggestion=(DIAMOND_PACKS.find(p=>p.amount>=short)??DIAMOND_PACKS.at(-1)).amount;render();
  $('diamond-store').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
  clearTimeout(suggestionTimer);suggestionTimer=setTimeout(()=>{suggestion=0;if($('boost-dialog').open)render();},6000);
  track('get_diamonds_clicked',{short});
 }
 $('boost-dialog').addEventListener('click',event=>{
  const more=event.target.closest('[data-get-diamonds]');if(more){showPacks(Number(more.dataset.getDiamonds)||0);return;}
  // The long shop in four parts: a row of small buttons under your balance jumps to each.
  const jump=event.target.closest('[data-shop-jump]');if(jump)$(jump.dataset.shopJump)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 });
 async function open(){if(!featureUnlocked(state,'boosts')){notify(featureUnlockHint('boosts'));return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';requests={};lengths={};render();$('boost-dialog').showModal();track('diamond_shop_view');try{catalog=await bridge().payments({operation:'catalog'});render();}catch{catalog=null;$('boost-feedback').textContent='The diamond shop is unavailable. Your existing boosts still work.';render();}}
 function refresh(){
  $('diamonds').textContent=state.diamonds.toLocaleString('en-US',matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)').matches?{notation:'compact',maximumFractionDigits:1}:{});
  fitText($('diamonds'));
  $('diamond-button').setAttribute('aria-label',`${number(state.diamonds)} diamonds. Open boosts and diamond shop.`);
  if($('boost-dialog').open)render();tick();
 }
 function tick(){
  const now=farmNow(),active=[],isVip=vipActive(state,now);
  if(previousVip&&!isVip&&observedExpiry===state.vipExpiresAt)track('vip_expired');
  previousVip=isVip;observedExpiry=state.vipExpiresAt??0;
  if(isVip)active.push(`VIP · ${formatDuration(state.vipExpiresAt-now)}`);
  const vipStatus=document.querySelector('[data-vip-status]');if(vipStatus&&isVip)vipStatus.textContent=`VIP · ${formatDuration(state.vipExpiresAt-now)} left`;

  for(const [id,label,until] of [['xp','2× XP',state.boosts.xpUntil],['harvest','2× harvest',state.boosts.harvestUntil],['coins','2× coins',state.boosts.coinsUntil]]){
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
