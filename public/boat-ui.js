import {BOAT_PREMIUM,BOAT_DIAMONDS,BOAT_DIAMOND_TRIPS,BOAT_GONE,VILLAGERS,ITEMS,WORLD_TWO_LEVEL,boatReturn,boatReady,boatDiamonds,villageRequestGoods,villageRequestExtra,worldTwoOpen,buildingUnlocked,normalizeFarm,formatDuration,villageShopStatus} from './farm-state.js';
import {buyVillage,waitButton} from './village-shop-ui.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
const total=goods=>Object.values(goods).reduce((sum,n)=>sum+n,0);

// World II's town boat (Oct 2026, from level 144): the Pier's own window. One cargo at a time, loaded bit by bit like the Trade Depot's
// trailer; the rules are in game/farm-state.js (boatLoad, boatSkip). Every tap waits for the server's answer and carries the cargo the
// screen showed, as Help at the market square does. The skipper says one of his lines on the cargo card, a cargo each in turn (his
// VILLAGERS entry has no request lines: he never comes to the market square).
export const SKIPPER_LINES=Object.freeze(['The tide is right and my hold is empty.','Fill her up and we cast off at once.','The town has been asking for village goods.','A full hold makes for a happy crew.']);
// The Pier's line in the village's Buildings list and under its name in the village: yellow only when one Load all sails the boat.
export function boatStatus(state,now=farmNow()){
 const boat=state.village?.boat,c=boat?.cargo;
 if(c)return boatReady(state)?{text:'Ready to sail',kind:'ready'}:{text:`${number(total(c.loaded))} / ${number(total(c.input))} loaded`,kind:'working'};
 return (boat?.readyAt??0)>now?{text:`Back in ${formatDuration(boat.readyAt-now)}`,kind:'working'}:{text:'Waiting for the boat',kind:'idle'};
}
// The whole window, top to bottom as on a phone: the rule (its diamonds only on a week's first BOAT_DIAMOND_TRIPS boats, 10 Oct 2026), the
// cargo (or the time until the boat is back) and how many sailed. The goods in the village goods' own order (villageRequestGoods), so a save
// never swaps the rows; the diamond chip shows what this boat brings (boatDiamonds: none once the week's diamond trips have sailed).
export function boatMarkup(state,now=farmNow()){
 const boat=state.village.boat,c=boat.cargo,trips=boat.trips;
 const rule=`<p class="estate-lead valley-lead"><span class="estate-icon">${art('pier')}</span><span>Load the boat bit by bit. A full boat sails at once and pays ${BOAT_PREMIUM} times what its goods are worth, plus ${BOAT_DIAMONDS} diamonds. It is back ${boatReturn(state)/3600000} hours later. Diamonds come with the first ${BOAT_DIAMOND_TRIPS} trips each week.</span></p>`;
 let body;
 if(!c)body=`<article class="order-card is-waiting"><div class="order-head"><span class="order-icon">${art('pier')}</span><div><small>Sailing to town</small><h3>Waiting for the boat</h3></div></div><p class="valley-next">${boat.readyAt>now?`The boat is back in <b>${formatDuration(boat.readyAt-now)}</b>.`:'The boat comes as soon as the village makes goods it can carry.'}</p>${boat.readyAt>now?`<div class="wait-buy-row">${waitButton(villageShopStatus(state,'boat',now))}</div>`:''}</article>`;
 else{
  const goods=villageRequestGoods(c),loaded=total(c.loaded),needed=total(c.input),extra=villageRequestExtra(state,c,now),skipper=VILLAGERS.find(v=>v.id==='skipper').name;
  const rows=Object.entries(goods).map(([k,n])=>{const have=c.loaded[k],left=n-have,stock=state.inventory[k]??0,load=Math.min(stock,left);return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${ITEMS[k].name}</strong><small>${left?`${number(stock)} in your barn`:'Loaded'}</small></span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-boat-load="${k}" ${load?'':'disabled'}>Load${load?` ${number(load)}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
  const any=Object.entries(goods).some(([k,n])=>c.loaded[k]<n&&(state.inventory[k]??0)>0);
  // "+X% vs market" only when the Village market would pay less now, its boosts included (villageRequestExtra, as on the square).
  body=`<article class="order-card depot-contract boat-cargo ${boatReady(state)?'is-ready':''}"><div class="order-head"><span class="order-icon">${art('pier')}</span><div>${extra?`<small><b title="Compared with selling these goods at the market today">+${extra}% vs market</b></small>`:''}<h3>The town boat</h3><p class="valley-line"><q>${SKIPPER_LINES[(c.id-1)%SKIPPER_LINES.length]}</q> <span class="brief-from">${skipper}</span></p></div></div>`
   +`<div class="depot-progress"><progress value="${loaded}" max="${needed}" aria-label="Boat loaded"></progress><span>${number(loaded)} / ${number(needed)} loaded</span></div><ul class="depot-load">${rows}</ul>`
   +`<div class="task-bottom">${rewardChips({coins:c.coins,diamonds:boatDiamonds(state,now),xp:c.xp})}<button type="button" class="primary-button" data-boat-all ${any?'':'disabled'}>Load all you can</button></div>`
   +(loaded?'':'<button type="button" class="text-button valley-skip" data-boat-skip>Turn this cargo down</button>')+'</article>';
 }
 return rule+`<div class="daily-list">${body}</div>`+(trips?`<p class="valley-footer">${trips===1?'1 boat sent so far.':`${number(trips)} boats sent so far.`}</p>`:'');
}

export function createBoatUI({state,runAction,onChange,notify,refresh}){
 let timer,shown='',busy=false,seen=null;
 // What the open window shows: the cargo with what is loaded and in stock, the minutes until the boat is back, the boats sent, the wait
 // and this boat's diamonds.
 const signature=()=>{const b=state.village?.boat,c=b?.cargo,now=farmNow();return JSON.stringify([c?.id,c&&Object.entries(villageRequestGoods(c)).map(([k,n])=>[k,n,c.loaded[k],state.inventory[k]]),Math.ceil(Math.max(0,(b?.readyAt??0)-now)/60000),b?.trips,boatReturn(state),boatDiamonds(state,now)]);};
 // A tap waits for the server: its button stays off until the answer. When the server's cargo is not the one on the screen (a level-up
 // in between, another device), the farm is loaded again first, as the market square does for a villager who moved on.
 async function act(button,action,message){
  if(busy)return;busy=true;button.disabled=true;
  try{const result=await runAction(action);notify(message(result));}
  catch(error){notify(error.message);if(error.message===BOAT_GONE)try{await refresh?.();}catch{}}
  finally{busy=false;onChange();render();}
 }
 function render(){
  clearTimeout(timer);const now=farmNow();normalizeFarm(state,now);
  // Load and Turn down hand over the cargo that was on the screen: the server refuses when its cargo asks for other goods.
  const c=state.village.boat.cargo;seen=c&&{cargo:c.id,input:{...c.input}};
  $('boat-content').innerHTML=boatMarkup(state,now);bind();refreshArt();shown=signature();
  if($('boat-dialog').open)later();
 }
 // Drawn again every 30 seconds while open, for the time until the boat is back.
 function later(){clearTimeout(timer);timer=setTimeout(()=>{if($('boat-dialog').open)render();},30000);}
 function bind(){
  const root=$('boat-content');
  // Boat back now (20 Oct 2026, the Village tab of the diamond shop): one tap; short of diamonds the window closes and the shop opens.
  root.querySelectorAll('[data-wait-buy]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;
   try{const done=await buyVillage({state,id:'boat',now:farmNow(),runAction,close:()=>$('boat-dialog').close()});if(done)notify(done.message);}
   catch(error){notify(error.message);}finally{busy=false;onChange();if($('boat-dialog').open)render();}});
  if(!seen)return;
  const loaded=r=>r.sailed?(r.diamonds?`The boat sails for town! +${number(r.coins)} coins and +${number(r.xp)} XP. The trip also brings +${r.diamonds} diamonds.`:`The boat sails for town! +${number(r.coins)} coins and +${number(r.xp)} XP.`):r.units===1?'Loaded 1 good onto the boat.':`Loaded ${number(r.units)} goods onto the boat.`;
  root.querySelectorAll('[data-boat-load]').forEach(b=>b.onclick=()=>act(b,{type:'boat_load',...seen,item:b.dataset.boatLoad},loaded));
  root.querySelectorAll('[data-boat-all]').forEach(b=>b.onclick=()=>act(b,{type:'boat_load',...seen},loaded));
  root.querySelectorAll('[data-boat-skip]').forEach(b=>b.onclick=()=>act(b,{type:'boat_skip',...seen},()=>`Cargo turned down. The boat is back in ${formatDuration(boatReturn(state))}.`));
 }
 function open(){
  if(!worldTwoOpen(state)){notify(`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`);return;}
  if(!buildingUnlocked(state,'pier')){notify('Build the Pier first.');return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('boat-dialog').showModal();$('boat-dialog').scrollTop=0;later();
 }
 return {open,refresh:()=>{if($('boat-dialog')?.open&&signature()!==shown)render();}};
}
