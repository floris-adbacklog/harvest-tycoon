import {confirmDiamondSpend} from './diamond-confirm.js';
import {VIP_PLANS,vipActive,BUILDINGS,RECIPES,productionJobs,SINGLE_BATCH_COST,featureUnlocked,featureUnlockHint,BOOSTS,DIAMOND_PACKS,SINGLE_CROP_COST,CROPS,boostStatus,boostOffer,BOOST_DURATIONS,BOOST_LENGTH_NAMES,formatDuration,COIN_PACK,coinPackCoins,VILLAGE_SHOP,villageShopStatus,VILLAGER_CALLS_PER_DAY,worldTwoOpen,normalizeFarm} from './farm-state.js';
import {buyVillage,villageLine,goodsInBarn,untilText,VILLAGE_ASK} from './village-shop-ui.js';
import {farmNow} from './farm-client.js';
import {fitText} from './fit-text.js';
import {art,refreshArt} from './visual-icons.js';
import {prettifySelects} from './pretty-select.js';
import {portalOff} from './portal.js';
import {fieldPicker,batchPicker,bindFieldPicker} from './field-picker.js';
import {keepFolds} from './keep-folds.js';
import {saleBanner,shopSale,shopSaleBonus,saleLeft} from './diamond-sale.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const LENGTH_LABELS={'30m':'30 min','1h':'1 hour','1d':'1 day'};
// The picture of each diamond pack, from a handful to a big chest (painted; plain diamonds until those arrive).
const PACK_ART=['pack-nest','pack-sack','pack-chest','pack-gold'];

// The diamond packs as tappable cards (the shop's render below; 15 Oct 2026: on its own, so the tests run it): purchasing, the pack
// being opened; suggestion, the pack that covers what the farmer is short of.
export function diamondPackCards({catalog=null,purchasing='',suggestion=0,now=farmNow()}={}){
 // Kreds on Kongregate (15 Oct 2026, off until Kongregate says yes): a pack Kongregate gives no price is not for sale there (Unavailable),
 // and with a price for every pack the extra is worked out from Kongregate's own prices, so the tabs stay true whatever the owner sets.
 const kreds=catalog?.store==='kongregate',kredsAll=kreds&&DIAMOND_PACKS.every(p=>catalog.prices?.[p.amount]?.kreds>0);
 // In the apps (Oct 2026) the price is the store's, in the farmer's currency (catalog.prices, src/play-store.js, src/app-store.js). With
 // the store's own amount for every pack, in one currency, the extra and Best value come from those amounts (18 Oct 2026: they are the
 // prices the farmer sees); otherwise from the shop's euro prices, as before.
 const amounts=DIAMOND_PACKS.map(p=>catalog?.prices?.[p.amount]),currency=amounts[0]?.currency;
 const storeAll=!kreds&&amounts.every(a=>Number.isFinite(a?.micros)&&a.micros>0&&a.currency&&a.currency===currency);
 const perEuro=pack=>pack.amount/(kredsAll?catalog.prices[pack.amount].kreds:storeAll?catalog.prices[pack.amount].micros:Number(pack.price.replace(/[^0-9.]/g,''))),base=perEuro(DIAMOND_PACKS[0]);
 const packPrice=pack=>catalog?.prices?.[pack.amount]?.price??pack.price,forSale=pack=>Boolean(catalog?.enabled)&&!(kreds&&!catalog.prices?.[pack.amount]);
 // Best value is the pack with the most diamonds for its price (the biggest today), worked out, not assumed.
 const bestAt=DIAMOND_PACKS.reduce((at,pack,i)=>perEuro(pack)>perEuro(DIAMOND_PACKS[at])?i:at,0),open=Boolean(catalog?.enabled)&&!purchasing;
 return DIAMOND_PACKS.map((pack,i)=>{
  const best=i===bestAt,suggested=suggestion===pack.amount,opening=purchasing===String(pack.amount),sale=forSale(pack);
  const extra=Math.round((perEuro(pack)/base-1)*100);
  // The Sale (27 Oct 2026, public/diamond-sale.js): every pack's tab says the Sale's extra and the pack shows its bonus under the amount
  // (the usual amount small and struck through, the total large: ~~500~~ 700 diamonds; 27 Oct 2026, the owner); the price stays the same. The pack that covers what is short keeps its green tab.
  const bonus=sale?shopSaleBonus(catalog,pack.amount,now):0,salePercent=Number(catalog?.sale?.percent)||40;
  const tag=suggested?'<span class="pack-ribbon is-enough">✓ Enough for this</span>':bonus?`<span class="pack-ribbon is-sale">+${salePercent}% extra</span>`:best?`<span class="pack-ribbon">+${extra}% extra</span>`:extra>0?`<span class="pack-ribbon is-extra">+${extra}% extra</span>`:'';
  const foot=opening?'Opening…':sale?packPrice(pack):catalog?'Unavailable':packPrice(pack);
  const label=kreds&&!sale?`${number(pack.amount)} diamonds`:bonus?`Buy ${number(pack.amount)} diamonds and ${number(bonus)} extra for ${packPrice(pack)}`:`Buy ${number(pack.amount)} diamonds for ${packPrice(pack)}`;
  return `<button type="button" class="diamond-pack${best?' is-best':''}${suggested?' is-suggested':''}${bonus?' is-sale':''}" data-diamond-pack="${pack.amount}" data-state="${opening?'opening':sale?'available':'unavailable'}" aria-label="${label}" ${open&&sale?'':'disabled'}>${tag}<span class="pack-amount">${bonus?`<s class="pack-was">${number(pack.amount)}</s><b>${number(pack.amount+bonus)}</b>`:`<b>${number(pack.amount)}</b>`}<small>diamonds</small></span>${art(PACK_ART[i]??'diamonds')}${best?'<span class="pack-best">Best value</span>':''}<span class="pack-price">${foot}</span></button>`;}).join('');
}

export function createBoostsUI({state,runAction,onChange,notify,village=false}){
 let saleShown=false,lastStatus='',catalog=null,purchasing='',requests={},selectedFields=[],selectedBatches=[],finishing=false;
 // The length picked on each timed boost: 30 minutes every time the shop opens and after each purchase.
 let lengths={};const lengthOf=id=>BOOSTS[id].prices?lengths[id]??'30m':undefined;
 const bridge=()=>window.parent.harvestBridge;
 let previousVip=vipActive(state,farmNow()),observedExpiry=state.vipExpiresAt??0;
 const track=(event,params={})=>bridge()?.trackCommerce?.(event,params);
 // Factory batches are too big to finish with diamonds (the server refuses them, like Finish production skips them).
 function runningBatches(){return Object.entries(state.buildings).filter(([building])=>building!=='factory').flatMap(([building,b])=>productionJobs(b).map((job,index)=>({building,job,number:index+1,key:building+'/'+job.id})).filter(b=>b.job.readyAt>farmNow()));}
 function signature(){return [state.vipExpiresAt,vipActive(state,farmNow()),finishing,coinPackCoins(state),state.boosts.farmhandUntil,...runningBatches().map(b=>b.key),state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason),...state.plots.filter(p=>p.crop&&p.readyAt>farmNow()).map(p=>`${p.id}:${p.crop}`),...villageSignature()].join('|');}
 // The Village tab's cards (20 Oct 2026): a card that shows or goes, its price, its reason, the calls left, the board, the landmark, and a
 // wait that ends (the minutes tick by themselves in tick()).
 function villageSignature(){if(!worldTwoOpen(state))return [];const now=farmNow();return Object.keys(VILLAGE_SHOP).map(id=>{const s=villageShopStatus(state,id,now);return [s.shown,s.reason,s.cost,s.left,s.board,s.landmark,s.until>now,s.shown&&id==='landmark'&&goodsInBarn(state,s)].join(',');});}
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
  // World II (20 Oct 2026): the Village tab from level 100, on the farm and in the village. A boat or a board that fell due shows its cargo
  // or villager first, as the boat's and the square's own windows do.
  const worldTwo=worldTwoOpen(state);$('boost-dialog').querySelector('[data-shop-jump="shop-village"]').hidden=!worldTwo;
  if(worldTwo)normalizeFarm(state,farmNow());
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
  // Coins for diamonds (20 Oct 2026, the owner): 1,000 coins for every level of the farm, for 100 diamonds, as often as the farmer likes.
  const packCoins=coinPackCoins(state),packShort=COIN_PACK.cost-state.diamonds;
  const coinCard=card({picture:COIN_PACK.art,title:`${number(packCoins)} coins`,text:`${number(COIN_PACK.perLevel)} coins for every level of your farm, right away.`,
   detail:`<div class="boost-status-row">${packShort>0?chip('need',`Need ${number(packShort)} more diamonds`)+getMore(packShort):chip('ready','Ready to use')}</div>`,
   button:packShort>0?`<button class="boost-buy is-short" data-get-diamonds="${packShort}" aria-label="${number(packCoins)} coins: get ${number(packShort)} more diamonds first">${price(COIN_PACK.cost,'Buy')}</button>`
    :`<button class="boost-buy" data-buy-coins ${finishing?'disabled':''} aria-label="Buy ${number(packCoins)} coins for ${COIN_PACK.cost} diamonds">${price(COIN_PACK.cost,'Buy')}</button>`});
  const finishNow=['crops','production'],entries=Object.entries(BOOSTS);
  // Power-ups from cheap to dear (20 Oct 2026, the owner: "zet ze wel op volgorde van goedkoop naar duur"), by the price of their
  // shortest length; at the same price the coins come after Double earnings.
  const powerUps=[...entries.filter(([id])=>!finishNow.includes(id)).map(entry=>[entry[1].cost,boostCard(entry)]),[COIN_PACK.cost,coinCard]].sort((a,b)=>a[0]-b[0]).map(([,html])=>html).join('');
  // The Village tab (20 Oct 2026, the owner's choices): time and goods for World II, each card from its own level, with its line, its
  // reason or countdown and its price. Landmark supplies lists the goods it hands in, and says when the barn holds some of them.
  const villageCard=s=>{
   const now=farmNow(),short=s.reason?0:s.cost-state.diamonds;
   const chips=(s.reason?chip('blocked',s.reason):'')+(s.until>now?`<span class="boost-detail" data-state="wait" data-shop-until="${s.until}" data-shop-wait="${s.wait}">${untilText(s.wait,s.until-now)}</span>`:'')
    +(s.id==='villager'&&!s.reason?chip('left',`${s.left} of ${VILLAGER_CALLS_PER_DAY} left today`):'')+(short>0?chip('need',`Need ${number(short)} more diamonds`)+getMore(short):'');
   const goods=s.id==='landmark'?`<span class="reward-chips">${Object.entries(s.goods).map(([k,n])=>`<b>${art(k)}${number(n)}</b>`).join('')}</span>${goodsInBarn(state,s)?'<small class="shop-note">Give your own goods at the market square first and it costs less.</small>':''}`:'';
   const button=short>0?`<button class="boost-buy is-short" data-get-diamonds="${short}" aria-label="${s.name}: get ${number(short)} more diamonds first">${price(s.cost,'Buy')}</button>`
    :s.cost?`<button class="boost-buy" data-buy-village="${s.id}" ${s.canBuy&&!finishing?'':'disabled'} aria-label="Buy ${s.name} for ${number(s.cost)} diamonds">${price(s.cost,'Buy')}</button>`
    :'<button class="boost-buy" disabled><small>Buy</small></button>';
   return card({picture:s.art,title:s.name,text:villageLine(s),detail:goods+(chips?`<div class="boost-status-row">${chips}</div>`:''),button});
  };
  const shown=worldTwo?Object.keys(VILLAGE_SHOP).map(id=>villageShopStatus(state,id,farmNow())).filter(s=>s.shown):[];
  // Cheap to dear (the owner, 20 Oct 2026), Landmark supplies by its price of the moment; with everything handed in (0) it goes last. The
  // sort is stable: at the same price the VILLAGE_SHOP order, and Landmark supplies at exactly 150 before the Farmhand.
  const villageCards=[...shown.map(s=>[s.cost||Infinity,villageCard(s)]),[BOOSTS.farmhand.cost,boostCard(['farmhand',BOOSTS.farmhand])]].sort((a,b)=>a[0]-b[0]).map(([,html])=>html).join('');
  // An open field or batch picker stays open when a crop ripens or the farm updates (16 Oct 2026, public/keep-folds.js).
  keepFolds($('boost-catalog'),`<section class="shop-section" id="shop-finish"><h3 class="shop-heading">Finish now</h3><div class="shop-list">${cropCard}${batchCard}${entries.filter(([id])=>finishNow.includes(id)).map(boostCard).join('')}</div></section><section class="shop-section" id="shop-boosts"><h3 class="shop-heading">Power-ups</h3><div class="shop-list">${powerUps}</div></section>`
   +(worldTwo?`<section class="shop-section" id="shop-village"><h3 class="shop-heading">Village</h3><div class="shop-list">${villageCards}</div></section>`:''));
  if($('finish-batch-picker'))bindFieldPicker($('finish-batch-picker'),{multiple:true,available:Math.floor(state.diamonds/SINGLE_BATCH_COST),noun:['batch','batches'],onChange:ids=>{selectedBatches=ids.map(i=>batches[i]?.key).filter(Boolean);updateFinish('batch');}});
  if($('finish-crop-field'))bindFieldPicker($('finish-crop-field'),{multiple:true,available:Math.floor(state.diamonds/SINGLE_CROP_COST),onChange:ids=>{selectedFields=ids.map(String);updateFinish('crop');}});
  updateFinish('crop');updateFinish('batch');
  $('finish-one-crop').onclick=()=>finishMany('crop');
  $('finish-one-batch').onclick=()=>finishMany('batch');
  // The packs as tappable cards, smallest to largest: how many diamonds, the picture, the price. The biggest is "Best value".
  // Short of diamonds for something here: the smallest pack that covers it gets a green tab.
  // Each bigger pack's tab says how many more diamonds per euro it gives than the smallest pack, rounded. The biggest has a gold tab
  // and "Best value" above its price (1 Oct 2026: "Best value · +86%" did not fit on one tab and was cut off).
  // The Sale's banner over the packs (public/diamond-sale.js), only while one runs where the shop sells.
  const saleBox=$('shop-sale');if(saleBox){const banner=saleBanner(catalog,{now:farmNow(),art});saleBox.hidden=!banner;saleBox.innerHTML=banner;saleShown=Boolean(banner);}
  $('diamond-packs').innerHTML=diamondPackCards({catalog,purchasing,suggestion,now:farmNow()})
   +(catalog?.mode==='test'?'<p class="pack-note">Test checkout: no real payment.</p>':'')
   +(packError?`<p class="pack-error" role="alert">${packError.message}</p>`:'');
  $('diamond-packs').querySelectorAll('[data-diamond-pack]').forEach(button=>button.onclick=async()=>{
   if(purchasing||!catalog?.enabled)return;const pack=button.dataset.diamondPack;purchasing=pack;packError=null;requests[pack]??=crypto.randomUUID();render();
   // A problem opening the checkout shows right under the packs.
   // Stripe leaves the page; the app's store's sheet (Google Play, the App Store) closes on the farm and answers with its store, and
   // the window with the result opens by itself.
   try{const done=await bridge().checkout(pack,requests[pack]);if(done?.store){purchasing='';render();}}catch(error){packError={pack,message:String(error.message).replace(/[<>&]/g,'')};purchasing='';render();}
  });
  prettifySelects($('boost-catalog'));
  $('boost-catalog').querySelectorAll('[data-boost-length]').forEach(select=>select.onchange=()=>{
   const id=select.dataset.boostLength;lengths[id]=select.value;render();
   $('boost-catalog').querySelector(`[data-boost-length="${id}"]`)?.nextElementSibling?.querySelector('.pretty-select-toggle')?.focus();
  });
  $('boost-catalog').querySelectorAll('[data-buy-boost]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const id=button.dataset.buyBoost,boost=BOOSTS[id],length=lengthOf(id),offer=boostOffer(id,length),running=boostStatus(state,id,farmNow(),length).remaining>0,time=length?BOOST_LENGTH_NAMES[length]:boost.lengthName;finishing=true;render();
   try{
    if(offer.cost>=150&&!await confirmDiamondSpend({title:time?`${boost.name} · ${time}`:boost.name,cost:offer.cost,description:time?(running?`Adds ${time} after your current ${boost.name} ends.`:`${boost.description} Starts now and runs for ${time}.`):boost.description,picture:id==='crops'?'instant-harvest':boost.art,balance:state.diamonds}))return;
    const result=await runAction({type:'buy_boost',boost:id,...(length?{length}:{}),expectedCost:offer.cost});delete lengths[id];onChange();
    const message=id==='crops'?`${result.affected} crops are ready to harvest!`:id==='production'?`${result.affected} batches are ready to collect!`:id==='upgrade'?'Your next production-building upgrade costs 50% less.':running?`${boost.name} extended by ${time}.`:`${boost.name} is active for ${time}.`;
    $('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  $('boost-catalog').querySelectorAll('[data-buy-coins]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;const coins=coinPackCoins(state);finishing=true;render();
   // It asks first, as the farmhand and VIP do (20 Oct 2026, the owner: "kreeg geen confirmatiescherm").
   try{if(!await confirmDiamondSpend({title:`${number(coins)} coins`,cost:COIN_PACK.cost,description:`${number(COIN_PACK.perLevel)} coins for every level of your farm, right away.`,picture:COIN_PACK.art,balance:state.diamonds}))return;
    const result=await runAction({type:'buy_coins',expectedCost:COIN_PACK.cost,expectedCoins:coins});onChange();
    const message=`${number(result.coins)} coins added to your farm.`;$('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);}finally{finishing=false;render();}
  });
  // A Village card: the carts and Landmark supplies ask first (VILLAGE_ASK), the time-skips are one tap (village-shop-ui.js buyVillage).
  $('boost-catalog').querySelectorAll('[data-buy-village]').forEach(button=>button.onclick=async()=>{
   if(finishing)return;finishing=true;render();
   try{const id=button.dataset.buyVillage,done=await buyVillage({state,id,now:farmNow(),runAction,always:VILLAGE_ASK.has(id)});
    if(done){onChange();$('boost-feedback').textContent=done.message;notify(done.message);}
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
 // "Get diamonds": to the Diamonds tab, with the smallest pack that covers what is missing marked until the shop closes or another tab
 // is chosen (18 Oct 2026, the review: marked for 6 seconds, it was often gone before a farmer scrolled past the deals to it).
 let suggestion=0,packError=null;
 // The shop's tabs: the part that shows, the others one tap away (the dialog's data-shop-tab, boosts.css). A part a portal or an app
 // has no shop for (its tab is put aside by portal.css or android.css) is never the one that opens.
 function showShopTab(id){
  const dialog=$('boost-dialog');if(!dialog)return;
  dialog.dataset.shopTab=id;if(id!=='diamond-store'&&suggestion){suggestion=0;render();}
  dialog.querySelectorAll('[data-shop-jump]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.shopJump===id)));
 }
 function firstShopTab(){
  const tabs=[...$('boost-dialog').querySelectorAll('[data-shop-jump]')];
  return (tabs.find(b=>b.getClientRects().length)??tabs[1]??tabs[0])?.dataset.shopJump??'shop-finish';
 }
 function showPacks(short){
  showShopTab('diamond-store');
  suggestion=(DIAMOND_PACKS.find(p=>p.amount>=short)??DIAMOND_PACKS.at(-1)).amount;render();
  // The top of the Diamonds tab, the window's own top (nothing under the sticky heading and tabs): the Special offer, the Starter Pack and
  // the pass first (they are what farmers buy), the pack that covers it marked below them.
  $('boost-dialog').scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  track('get_diamonds_clicked',{short});
 }
 $('boost-dialog').addEventListener('click',event=>{
  // No packs on CrazyGames (Oct 2026, public/portal.js): short of diamonds says where they are earned instead.
  const more=event.target.closest('[data-get-diamonds]');if(more){if(portalOff('payments')){const tip='Earn diamonds with the daily gift, daily challenges, quests, level-ups and events.';$('boost-feedback').textContent=tip;notify(tip);return;}showPacks(Number(more.dataset.getDiamonds)||0);return;}
  // The long shop in four parts: tabs under your balance (18 Oct 2026, the window shell; they jumped down the one long list before).
  const jump=event.target.closest('[data-shop-jump]');if(jump)showShopTab(jump.dataset.shopJump);
  // A tap on a deal in the shop is counted (18 Oct 2026: to see whether the shop's look brings more farmers to a checkout).
  const deal=event.target.closest('#shop-offer,#shop-starter,#shop-pass');if(deal)track('shop_deal_opened',{pack:deal.id.slice(5)});
 });
 async function open(tab){if(!featureUnlocked(state,'boosts')){notify(featureUnlockHint('boosts'));return;}document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';requests={};lengths={};render();$('boost-dialog').showModal();showShopTab(typeof tab==='string'?tab:village&&worldTwoOpen(state)?'shop-village':firstShopTab());track('diamond_shop_view');if(portalOff('payments'))return;try{catalog=await bridge().payments({operation:'catalog'});render();}catch{catalog=null;$('boost-feedback').textContent='The diamond shop is unavailable. Your existing boosts still work.';render();}}
 function refresh(){
  $('diamonds').textContent=state.diamonds.toLocaleString('en-US',matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)').matches?{notation:'compact',maximumFractionDigits:1}:{});
  fitText($('diamonds'));
  $('diamond-button').setAttribute('aria-label',`${number(state.diamonds)} diamonds. Open boosts and diamond shop.`);
  if($('boost-dialog').open)render();tick();
 }
 // The active boosts in one small pill under the top bar (phone and computer): a picture and the time left for each, so it is clear
 // which ones run (26 Sep 2026: pictures instead of "2× XP · 45m"). The pill is rebuilt only when the set changes; the times tick.
 let pillKey='';
 function tick(){
  const now=farmNow(),chips=[],isVip=vipActive(state,now);
  if(previousVip&&!isVip&&observedExpiry===state.vipExpiresAt)track('vip_expired');
  previousVip=isVip;observedExpiry=state.vipExpiresAt??0;
  if(isVip)chips.push({id:'vip',picture:'vip',label:'VIP',time:formatDuration(state.vipExpiresAt-now)});
  const vipStatus=document.querySelector('[data-vip-status]');if(vipStatus&&isVip)vipStatus.textContent=`VIP · ${formatDuration(state.vipExpiresAt-now)} left`;

  for(const [id,label,until,picture] of [['xp','2× XP',state.boosts.xpUntil,'double-xp'],['harvest','2× harvest',state.boosts.harvestUntil,'double-harvest'],['coins','2× coins',state.boosts.coinsUntil,'double-coins'],['farmhand','Farmhand',state.boosts.farmhandUntil,'farmhand']]){
   if(until>now)chips.push({id,picture,label,time:formatDuration(until-now)});
   // The Farmhand's card is in Power-ups and in the Village tab: each one ticks.
   document.querySelectorAll(`[data-boost-time="${id}"]`).forEach(el=>{if(until>now)el.textContent=`Active · ${formatDuration(until-now)} left`;});
  }
  // The Sale's time left ticks; when it ends the shop shows the packs as they are again.
  if($('boost-dialog').open&&saleShown){if(shopSale(catalog,now)){const left=document.querySelector('[data-sale-left]');const text=saleLeft(catalog,now);if(left&&left.textContent!==text)left.textContent=text;}else render();}
  document.querySelectorAll('[data-shop-until]').forEach(el=>{const left=Number(el.dataset.shopUntil)-now;if(left>0)el.textContent=untilText(el.dataset.shopWait,left);});
  if(state.boosts.upgradeCredits)chips.push({id:'upgrade',picture:'hammer',label:'50% upgrade voucher',time:'50%'});
  const pill=$('active-boosts'),key=chips.map(c=>c.id).join(',');pill.hidden=!chips.length;
  if(key!==pillKey){pillKey=key;pill.innerHTML=chips.map(c=>`<span class="active-boost" data-active-boost="${c.id}" title="${c.label}">${art(c.picture)}<b></b></span>`).join('');refreshArt();}
  for(const c of chips){const time=pill.querySelector(`[data-active-boost="${c.id}"] b`);if(time&&time.textContent!==c.time)time.textContent=c.time;}
  pill.setAttribute('aria-label',chips.length?`Active boosts: ${chips.map(c=>c.id==='upgrade'?c.label:`${c.label}, ${c.time} left`).join('; ')}. Open the shop.`:'View active boosts');
  if($('boost-dialog').open&&signature()!==lastStatus)render();
 }
 $('diamond-button').onclick=open;
 $('boost-dialog').addEventListener('close',()=>{suggestion=0;});
 // The pill opens the shop as the diamonds do (its onclick left farm.html in Oct 2026: Discord runs no handler written in the page).
 $('active-boosts').addEventListener('click',()=>$('diamond-button').click());
 $('boosts-button').onclick=open;
 $('boost-daily').onclick=()=>{$('boost-dialog').close();$('today-button').click();};
 return {open,refresh,tick};
}
