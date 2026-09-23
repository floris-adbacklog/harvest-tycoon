import {IMPROVEMENTS,hasImprovement,EXPORT_DESTINATIONS,DEPOT_PREMIUM,depotRestock,featureUnlocked,featureUnlockHint,familyWeek,familyWeekStart,levelOf,normalizeFarm,marketValue,formatDuration,ITEMS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
const stars=n=>'★'.repeat(n);
const VIEWS={
 estateworkshop:{eyebrow:'LASTING IMPROVEMENTS',title:'Estate Workshop'},
 tradedepot:{eyebrow:'EXPORTS BY THE TRAILER LOAD',title:'Trade Depot'},
 grandfair:{eyebrow:'ONCE A WEEK',title:'Grand Valley Fair'}
};

// The wave-3 places: the Estate Workshop (improvements built once), the Trade Depot (one export trailer to fill) and the Grand
// Valley Fair (three classes a week). Each opens from its place on the farm and from the farm menu; the rules are in
// game/farm-state.js.
export function createEstateUI({state,runAction,onChange,notify,itemList}){
 let view='estateworkshop',timer,shown='';
 // What the open screen shows; only a change re-renders it (the depot's countdown in minutes, the fair's week).
 const signature=()=>JSON.stringify([view,state.coins,Object.keys(ITEMS).map(k=>state.inventory[k]),state.improvements,state.depot?.contract?.loaded,state.depot?.contract?.id,Math.ceil(Math.max(0,(state.depot?.readyAt??0)-farmNow())/60000),state.fair?.week,state.fair?.entered,levelOf(state)]);
 async function act(action,message){
  try{const result=await runAction(action);onChange();render();notify(typeof message==='function'?message(result):message);}
  catch(error){notify(error.message);}
 }
 function open(key){
  if(!featureUnlocked(state,key)){notify(featureUnlockHint(key));return;}
  view=key;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-place-dialog').showModal();$('estate-place-dialog').scrollTop=0;
 }
 const lead=(picture,text)=>`<p class="estate-lead valley-lead"><span class="estate-icon">${art(picture)}</span><span>${text}</span></p>`;
 function render(){
  clearTimeout(timer);
  normalizeFarm(state,farmNow());
  $('estate-place-eyebrow').textContent=VIEWS[view].eyebrow;
  $('estate-place-title').textContent=VIEWS[view].title;
  $('estate-place-content').innerHTML=view==='estateworkshop'?workshopMarkup():view==='tradedepot'?depotMarkup():fairMarkup();
  bind();refreshArt();shown=signature();
  if($('estate-place-dialog').open)timer=setTimeout(()=>{if($('estate-place-dialog').open)render();},30000);
 }
 function workshopMarkup(){
  const level=levelOf(state),list=Object.entries(IMPROVEMENTS).sort((a,b)=>a[1].level-b[1].level);
  const cards=list.map(([id,x])=>{
   const built=hasImprovement(state,id),open=level>=x.level,can=open&&!built&&state.coins>=x.coins&&Object.entries(x.materials).every(([k,n])=>state.inventory[k]>=n);
   const coins=`<span class="ingredient ${state.coins<x.coins?'missing':''}">${art('coins')}<span>${number(x.coins)} coins</span></span>`;
   const action=built?'<span class="quest-state">Built ✓</span>':!open?`<small class="ranch-closed">Opens at level ${x.level}.</small>`:`<button class="primary-button" data-improve="${id}" ${can?'':'disabled'}>Build</button>`;
   return `<article class="order-card improvement ${built?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(x.art)}</span><div><small>${built?'Working for good':`Level ${x.level}`}</small><h3>${x.name}</h3><p class="valley-line">${x.effect}</p></div></div>${built?'':`<div class="ingredients">${itemList(x.materials,true)}${coins}</div>`}<div class="task-bottom">${action}</div></article>`;
  }).join('');
  const done=list.filter(([id])=>hasImprovement(state,id)).length;
  return lead('estate-workshop','Each improvement is built once, with coins and goods from your farm, and works for good.')
   +`<div class="daily-list">${cards}</div><p class="valley-footer">${done} of ${list.length} improvements built.</p>`;
 }
 function depotMarkup(){
  const now=farmNow(),c=state.depot.contract;
  let body;
  if(!c)body=`<article class="order-card is-waiting"><div class="order-head"><span class="order-icon">${art('trade-depot')}</span><div><small>The trailer is on the road</small><h3>Waiting for the next contract</h3></div></div><p class="valley-next">${state.depot.readyAt>now?`Next contract in <b>${formatDuration(state.depot.readyAt-now)}</b>`:'Make goods worth 400 coins or more to get your first contract.'}</p></article>`;
  else{
   const place=EXPORT_DESTINATIONS[c.destination],extra=Math.round((c.coins/Math.max(1,marketValue(c.input,now))-1)*100);
   const needed=Object.values(c.input).reduce((a,n)=>a+n,0),loaded=Object.values(c.loaded).reduce((a,n)=>a+n,0),started=loaded>0;
   const rows=Object.entries(c.input).map(([k,n])=>{const have=c.loaded[k],left=n-have,stock=state.inventory[k],load=Math.min(stock,left);return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${ITEMS[k].name}</strong><small>${left?`${number(stock)} in your barn`:'Loaded'}</small></span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-depot-load="${k}" ${load?'':'disabled'}>Load${load?` ${number(load)}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
   const any=Object.entries(c.input).some(([k,n])=>c.loaded[k]<n&&state.inventory[k]>0);
   body=`<article class="order-card depot-contract"><div class="order-head"><span class="order-icon">${art('trade-depot')}</span><div><small>Export contract ${c.id}${extra>0?` · <b title="Compared with selling these goods at the market today">+${extra}% vs market</b>`:''}</small><h3>${place.name}</h3><p class="valley-line">${place.line}</p></div></div><div class="depot-progress"><progress value="${loaded}" max="${needed}" aria-label="Trailer loaded"></progress><span>${number(loaded)} / ${number(needed)} loaded</span></div><ul class="depot-load">${rows}</ul><div class="task-bottom">${rewardChips({coins:c.coins,diamonds:c.diamonds,xp:c.xp})}<button class="primary-button" data-depot-all ${any?'':'disabled'}>Load all you can</button></div>${started?'':'<button type="button" class="text-button valley-skip" data-depot-skip>Turn this contract down</button>'}</article>`;
  }
  const sent=state.stats.depot_shipments??0;
  return lead('trade-depot',`Fill the trailer with the goods on the contract. What you load stays loaded. A full trailer leaves at once and pays <b>${DEPOT_PREMIUM}×</b> the goods’ normal price, plus diamonds.`)
   +`<div class="daily-list">${body}</div><p class="valley-footer">${sent?`${number(sent)} ${sent===1?'trailer':'trailers'} sent so far. `:''}The next contract comes ${formatDuration(depotRestock(state))} after a trailer leaves or a contract is turned down.</p>`;
 }
 function fairMarkup(){
  const now=farmNow(),fair=state.fair,total=state.stats.fair_stars??0,champion=state.stats.fair_champion??0;
  const cards=(fair.classes??[]).map((entry,i)=>{
   const done=fair.entered.includes(i),can=!done&&Object.entries(entry.input).every(([k,n])=>state.inventory[k]>=n);
   return `<article class="order-card fair-class ${done?'is-ready':''}"><div class="order-head"><span class="order-icon">${art('grand-fair')}</span><div><small><span class="fair-stars" aria-label="${entry.stars} ${entry.stars===1?'star':'stars'}">${stars(entry.stars)}</span></small><h3>${entry.name}</h3></div></div><div class="ingredients">${itemList(entry.input,!done)}</div><div class="task-bottom">${rewardChips({coins:entry.coins,diamonds:entry.diamonds,xp:entry.xp})}${done?'<span class="quest-state">Ribbon won ✓</span>':`<button class="primary-button" data-fair-enter="${i}" ${can?'':'disabled'}>Enter</button>`}</div></article>`;
  }).join('')||'<p class="valley-next">The classes for this week are being set up. Make some goods and come back.</p>';
  const week=familyWeek(now),next=familyWeekStart(week+1);
  return lead('grand-fair',`Three classes a week. Enter each one once to win a ribbon: <b>fair stars</b>, coins and diamonds. Win all three for grand champion.`)
   +`<p class="fair-tally"><span class="fair-stars">★</span><b>${number(total)}</b> fair ${total===1?'star':'stars'}${champion?` · grand champion ${champion===1?'once':`${number(champion)} times`}`:''}</p>`
   +`<div class="daily-list">${cards}</div><p class="valley-footer">New classes in ${formatDuration(next-now)}, every Monday.</p>`;
 }
 function bind(){
  document.querySelectorAll('[data-improve]').forEach(b=>b.onclick=()=>act({type:'improve',improvement:b.dataset.improve},r=>`${r.name} built! It works for good from now on. +${r.xp} XP.`));
  const c=state.depot?.contract;
  const shipped=r=>r.shipped?`The trailer is off to ${r.destination.toLowerCase()}! +${number(r.coins)} coins, +${r.diamonds} diamonds and +${number(r.xp)} XP.`:`Loaded ${number(r.units)} ${r.units===1?'good':'goods'} onto the trailer.`;
  document.querySelectorAll('[data-depot-load]').forEach(b=>b.onclick=()=>act({type:'depot_load',contract:c.id,item:b.dataset.depotLoad},shipped));
  document.querySelectorAll('[data-depot-all]').forEach(b=>b.onclick=()=>act({type:'depot_load',contract:c.id},shipped));
  document.querySelectorAll('[data-depot-skip]').forEach(b=>b.onclick=()=>act({type:'depot_skip',contract:c.id},()=>`Contract turned down. The next one comes in ${formatDuration(depotRestock(state))}.`));
  document.querySelectorAll('[data-fair-enter]').forEach(b=>b.onclick=()=>act({type:'fair_enter',entry:Number(b.dataset.fairEnter),week:state.fair.week},r=>`A ribbon for ${r.name}! +${r.stars} fair ${r.stars===1?'star':'stars'}, +${number(r.coins)} coins and +${r.diamonds} diamonds.${r.champion?' You are this week’s grand champion!':''}`));
 }
 return {open,refresh:()=>{if($('estate-place-dialog')?.open&&signature()!==shown)render();}};
}
