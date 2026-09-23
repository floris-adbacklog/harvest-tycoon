import {VALLEY_CUSTOMERS,VALLEY_PREMIUM,VALLEY_RESTOCK,RANCH_HERDS,RANCH_SPEEDUP,ranchChangeCost,featureUnlocked,featureUnlockHint,buildingUnlocked,normalizeFarm,marketValue,formatDuration,BUILDINGS,RECIPES,ITEMS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
// What each herd's barn makes, for the Ranch cards.
const herdGoods=key=>[...new Set(Object.values(RECIPES).filter(r=>r.building===key).flatMap(r=>Object.keys(r.output)))];

// The Valley Market (three stalls with a customer and a basket each) and the Ranch (one herd works faster). Both are
// opened from their place on the farm and from the farm menu; the rules are in game/farm-state.js.
export function createValleyUI({state,runAction,onChange,notify,itemList}){
 let view='valleymarket',timer,shown='';
 // What the open screen shows: the stalls (customer, stock of their goods, minutes left) and the ranch. Only a change re-renders it.
 const signature=()=>JSON.stringify([view,state.valley?.stalls?.map(s=>s.basket?[s.basket.id,Object.keys(s.basket.input).map(k=>state.inventory[k])]:Math.ceil(Math.max(0,s.readyAt-farmNow())/60000)),state.ranch?.focus,state.coins>=ranchChangeCost(state)]);
 async function act(action,message){
  try{const result=await runAction(action);onChange();render();notify(typeof message==='function'?message(result):message);}
  catch(error){notify(error.message);}
 }
 function open(key){
  if(!featureUnlocked(state,key)){notify(featureUnlockHint(key));return;}
  view=key;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('valley-dialog').showModal();$('valley-dialog').scrollTop=0;
 }
 const lead=(picture,text)=>`<p class="estate-lead valley-lead"><span class="estate-icon">${art(picture)}</span><span>${text}</span></p>`;
 function render(){
  clearTimeout(timer);
  const market=view==='valleymarket';
  $('valley-eyebrow').textContent=market?'AT THE EDGE OF THE VALLEY':'ONE HERD, A QUARTER FASTER';
  $('valley-title').textContent=market?'Valley Market':'The Ranch';
  $('valley-content').innerHTML=market?marketMarkup():ranchMarkup();
  if(market)bindMarket();else bindRanch();
  refreshArt();shown=signature();
  if(market&&$('valley-dialog').open)timer=setTimeout(()=>{if($('valley-dialog').open)render();},30000);
 }
 function marketMarkup(){
  const now=farmNow();normalizeFarm(state,now);
  const stalls=state.valley.stalls.map((stall,i)=>{
   const b=stall.basket;
   if(!b)return `<article class="order-card valley-stall is-waiting"><div class="order-head"><span class="order-icon">${art('valley-market')}</span><div><small>Stall ${i+1}</small><h3>Waiting for a customer</h3></div></div><p class="valley-next">Next customer in <b>${formatDuration(Math.max(0,stall.readyAt-now))}</b></p></article>`;
   const customer=VALLEY_CUSTOMERS[b.customer],can=Object.entries(b.input).every(([k,n])=>state.inventory[k]>=n);
   const extra=Math.round((b.coins/Math.max(1,marketValue(b.input,now))-1)*100);
   return `<article class="order-card valley-stall ${can?'is-ready':''}"><div class="order-head"><span class="order-icon">${art('valley-market')}</span><div><small>Stall ${i+1}${extra>0?` · <b title="Compared with selling these goods at the market today">+${extra}% vs market</b>`:''}</small><h3>${customer.name}</h3><p class="valley-line">${customer.line}</p></div></div><div class="ingredients">${itemList(b.input,true)}</div><div class="task-bottom">${rewardChips({coins:b.coins,xp:b.xp})}<button class="primary-button" data-valley-sell="${i}" data-basket="${b.id}" ${can?'':'disabled'}>Sell basket</button></div><button type="button" class="text-button valley-skip" data-valley-skip="${i}" data-basket="${b.id}">Send this customer away</button></article>`;
  }).join('');
  const sold=state.stats.valley_baskets??0;
  return lead('valley-market',`A full basket pays <b>${VALLEY_PREMIUM}×</b> its normal price. Each stall gets a new customer ${formatDuration(VALLEY_RESTOCK)} after a sale.`)
   +`<div class="daily-list valley-stalls">${stalls}</div>`
   +`<p class="valley-footer">${sold?`${number(sold)} ${sold===1?'basket':'baskets'} sold here so far.`:'Every basket has one of your newest goods in it.'} Sending a customer away is free; the next one comes ${formatDuration(VALLEY_RESTOCK)} later.</p>`;
 }
 function bindMarket(){
  document.querySelectorAll('[data-valley-sell]').forEach(b=>b.onclick=()=>act({type:'valley_sell',stall:Number(b.dataset.valleySell),basket:Number(b.dataset.basket)},r=>`Sold to ${r.customer}! +${number(r.coins)} coins and +${r.xp} XP.`));
  document.querySelectorAll('[data-valley-skip]').forEach(b=>b.onclick=()=>act({type:'valley_skip',stall:Number(b.dataset.valleySkip),basket:Number(b.dataset.basket)},()=>`The next customer comes in ${formatDuration(VALLEY_RESTOCK)}.`));
 }
 function ranchMarkup(){
  const focus=state.ranch.focus,cost=ranchChangeCost(state);
  const cards=Object.entries(RANCH_HERDS).map(([key,herd])=>{
   const open=buildingUnlocked(state,key),chosen=focus===key;
   const goods=herdGoods(key).map(k=>`<span class="ingredient">${art(k,'product-art')}<span>${ITEMS[k].name}</span></span>`).join('');
   const action=chosen?'<span class="quest-state">Your herd ✓</span>':!open?`<small class="ranch-closed">Open the ${BUILDINGS[key].name} first.</small>`
    :`<button class="primary-button" data-ranch="${key}" data-cost="${cost}" ${state.coins<cost?'disabled':''}>${cost?`Switch · ${art('coins')}${number(cost)}`:'Choose'}</button>`;
   return `<article class="order-card ranch-herd ${chosen?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(key)}</span><div><small>${BUILDINGS[key].name}</small><h3>${herd}</h3></div></div><div class="ingredients">${goods}</div><div class="task-bottom">${action}</div></article>`;
  }).join('');
  return lead('ranch',`Pick one herd. Every new batch in its barn takes <b>${Math.round(RANCH_SPEEDUP*100)}% less time</b>.`)
   +`<div class="daily-list ranch-herds">${cards}</div>`
   +`<p class="valley-footer">${focus?`Switching to another herd costs ${number(cost)} coins. Batches already running keep their time.`:'Your first choice is free.'}</p>`;
 }
 function bindRanch(){
  document.querySelectorAll('[data-ranch]').forEach(b=>b.onclick=()=>act({type:'ranch_focus',focus:b.dataset.ranch,expectedCost:Number(b.dataset.cost)},r=>`Your ranch now works with the ${RANCH_HERDS[r.focus].toLowerCase()}: batches in the ${BUILDINGS[r.focus].name} take ${Math.round(RANCH_SPEEDUP*100)}% less time.`));
 }
 return {open,refresh:()=>{if($('valley-dialog')?.open&&signature()!==shown)render();}};
}
