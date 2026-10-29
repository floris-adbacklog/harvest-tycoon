import {ITEMS,CROPS,PRODUCTS,HEIRLOOMS,SEASON_CROPS,VILLAGE_GOODS,HARBOUR_GOODS,harbourWarehouseLevel,harbourWarehouseNext,harbourWarehouseRoom,worldThreeOpen,storedCount,warehouseCapacity,warehouseLevel,warehouseUpgrade,warehouseFull,warehouseNearFull,
 levelOf,worldTwoOpen,WAREHOUSE_MAX_LEVEL} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {setDialogBadge} from './dialog-shell.js';
// The Warehouse (22 Oct 2026, the owner's plan: plan-warehouse/voorstel.md with his choices). Its window shows every item in storage, grouped
// as the Market groups them, how full it is ("312 / 500") and the next upgrade; a tap on the building, its pin, the Market's heading, More or
// Buildings opens it. Where bringing something in waits because it is full (a harvest, a sweep, a Collect, the tractor), one note says so
// with the two ways on: the Market and Upgrade. The rule itself, and every number, is farm-state.js's.
const $=id=>document.getElementById(id);
const number=n=>Number(n).toLocaleString('en-US');
// The refusal the rules give while the Warehouse is full (farm-state.js warehouseFullText): "Warehouse full (500 / 500). Sell or ...".
export const WAREHOUSE_FULL=/^Warehouse full \((\d+) \/ (\d+)\)/;
export const isWarehouseFull=message=>typeof message==='string'&&WAREHOUSE_FULL.test(message);
// How full, for the bar and the chips: ok, near (from 90%) or full.
export function warehouseTone(state){return warehouseFull(state)?'full':warehouseNearFull(state)?'near':'ok';}
export const fillText=state=>`${number(storedCount(state))} / ${number(warehouseCapacity(state))}`;
// The groups of the window, in the Market's order: crops (with heirlooms and season crops, which sell with them), farm goods, village goods.
const GROUPS=[['crops','Crops','wheat',[...Object.keys(CROPS),...Object.keys(HEIRLOOMS),...Object.keys(SEASON_CROPS)]],['goods','Farm goods','bread',Object.keys(PRODUCTS)],['village','Village goods','stone',Object.keys(VILLAGE_GOODS)],['harbour','Harbour goods','rope',Object.keys(HARBOUR_GOODS)]];
export function warehouseGroups(state){
 const seen=new Set();
 return GROUPS.map(([id,name,icon,keys])=>{
  const items=[...new Set(keys)].filter(k=>{if(seen.has(k)||!ITEMS[k])return false;seen.add(k);return (state.inventory?.[k]??0)>0;}).map(k=>[k,Math.floor(state.inventory[k])]).sort((a,b)=>b[1]-a[1]||ITEMS[a[0]].name.localeCompare(ITEMS[b[0]].name));
  return {id,name,icon,items,total:items.reduce((sum,[,n])=>sum+n,0)};
 }).filter(g=>g.items.length||g.id!=='village'&&g.id!=='harbour'||g.id==='village'&&worldTwoOpen(state));
}
// The bar: green, amber from 90%, red when full.
export function warehouseBar(state){
 const used=storedCount(state),cap=warehouseCapacity(state),pct=Math.min(100,Math.round(used/Math.max(1,cap)*100)),tone=warehouseTone(state);
 return `<div class="warehouse-meter is-${tone}"><div class="warehouse-meter-top"><strong>${number(used)} / ${number(cap)}</strong><span>${tone==='full'?'Full':`Level ${warehouseLevel(state)}`}</span></div><div class="warehouse-bar" role="progressbar" aria-label="Warehouse" aria-valuemin="0" aria-valuemax="${cap}" aria-valuenow="${Math.min(used,cap)}"><span style="width:${pct}%"></span></div></div>`;
}
// The next upgrade as a card: the level it reaches and the places it adds, the coins (and at levels 11-15 the master goods) on a green button.
export function upgradeCard(state){
 const next=warehouseUpgrade(state),level=warehouseLevel(state);
 if(!next)return `<section class="warehouse-upgrade is-complete" id="warehouse-upgrade"><div><h3>Fully upgraded</h3><p>Level ${level} holds ${number(warehouseCapacity(state))} items, the most there is.</p></div></section>`;
 // Below level 100 the village's levels never show: level 10 reads as the top.
 if(level>=WAREHOUSE_MAX_LEVEL&&!worldTwoOpen(state))return `<section class="warehouse-upgrade is-complete" id="warehouse-upgrade"><div><h3>Fully upgraded</h3><p>Level ${level} holds ${number(warehouseCapacity(state))} items.</p></div></section>`;
 const short=levelOf(state)<next.farmLevel,goods=Object.entries(next.materials),missing=goods.some(([k,n])=>(state.inventory[k]??0)<n),poor=state.coins<next.coins;
 const chips=`<span class="reward-chips"><b class="is-gain">+${number(next.added)} places</b>${goods.map(([k,n])=>`<b class="${(state.inventory[k]??0)<n?'is-missing':''}">${art(k)}${number(state.inventory[k]??0)}/${number(n)} ${ITEMS[k].name}</b>`).join('')}${next.voucher?`<b class="is-gain">${art('boost')}Buildings discount: half price</b>`:''}</span>`;
 const button=short?`<button class="primary-button" id="warehouse-upgrade-go" disabled>Reach level ${next.farmLevel}</button>`
  :`<button class="primary-button" id="warehouse-upgrade-go" data-cost="${next.coins}" ${poor||missing?'disabled':''}><span>Upgrade</span><span class="button-price">${art('coins')}${number(next.coins)}</span></button>`;
 return `<section class="warehouse-upgrade" id="warehouse-upgrade"><div><h3>Level ${level} → ${next.level}: ${number(next.capacity)} places</h3>${chips}</div>${button}</section>`;
}
// The harbour warehouse (27 Oct 2026): from level 200, once the harbour is open, built and upgraded at the harbour; each level adds room
// to this Warehouse, for crops and goods alike (farm-state.js HARBOUR_WAREHOUSE). Each world upgrades its own (the owner: "ik zie in de
// warehouse 3 buttons"): in the harbour the window has the harbour warehouse's card and no farm upgrade; on the farm and in the village
// the farm upgrade, and one line for the room the harbour warehouse adds.
export function harbourLine(state){
 const level=harbourWarehouseLevel(state);
 return level?`<p class="warehouse-harbour-line">${art('harbourwarehouse')}<span>Harbour warehouse level ${level}: ${number(harbourWarehouseRoom(state))} more places</span></p>`:'';
}
export function harbourCard(state){
 if(!worldThreeOpen(state))return '';
 const next=harbourWarehouseNext(state),level=harbourWarehouseLevel(state),room=harbourWarehouseRoom(state);
 const head=`<h3>${art('harbourwarehouse')}<span>Harbour warehouse${level?` level ${level}`:''}</span></h3>`;
 if(!next)return `<section class="warehouse-upgrade is-complete" id="warehouse-harbour"><div>${head}<p>Fully upgraded: ${number(room)} more places for crops and goods.</p></div></section>`;
 const goods=Object.entries(next.goods),missing=goods.some(([k,n])=>(state.inventory[k]??0)<n),poor=state.coins<next.coins;
 const chips=`<span class="reward-chips"><b class="is-gain">+${number(next.added)} places</b>${goods.map(([k,n])=>`<b class="${(state.inventory[k]??0)<n?'is-missing':''}">${art(k)}${number(state.inventory[k]??0)}/${number(n)} ${ITEMS[k].name}</b>`).join('')}</span>`;
 const line=level?`It adds ${number(room)} places to your Warehouse, for crops and goods alike.`:'More room in your Warehouse, for crops and goods alike.';
 return `<section class="warehouse-upgrade" id="warehouse-harbour"><div>${head}<p>${line}</p>${chips}</div><button class="primary-button" id="warehouse-harbour-go" data-cost="${next.coins}" ${poor||missing?'disabled':''}><span>${level?'Upgrade':'Build'}</span><span class="button-price">${art('coins')}${number(next.coins)}</span></button></section>`;
}
export function warehouseContent(state,{harbour=false}={}){
 const groups=warehouseGroups(state),empty=!groups.some(g=>g.items.length);
 const list=empty?`<div class="quest-empty warehouse-empty">${art('warehouse')}<h3>Your Warehouse is empty</h3><p>Harvest your fields and collect your batches: everything comes in here.</p></div>`
  :groups.filter(g=>g.items.length).map(g=>`<section class="warehouse-group" data-warehouse-group="${g.id}"><h3>${art(g.icon)}<span>${g.name}</span><b>${number(g.total)}</b></h3><div class="warehouse-items">${g.items.map(([k,n])=>`<div class="warehouse-item">${art(k,'product-art')}<span>${ITEMS[k].name}</span><b>${number(n)}</b></div>`).join('')}</div></section>`).join('');
 return `<p class="warehouse-lead">Everything you harvest and make is kept here. When it is full, harvesting and collecting wait until you sell or use something. Nothing is lost.</p>${warehouseBar(state)}<div class="warehouse-actions"><button class="secondary-button" id="warehouse-market">${art('market')}<span>To the Market</span></button></div>${harbour?harbourCard(state):upgradeCard(state)+harbourLine(state)}${list}`;
}
// The note where bringing in waits: the numbers, one line, and the two ways on. count: a sweep's fields harvested before it stopped.
export function fullNoteHtml(state,{count=0}={}){
 const lead=count?`${count} ${count===1?'field':'fields'} harvested. The rest waits on its fields.`:'Sell or use something to bring in more. Nothing is lost.';
 return `<div class="center-notice-card warehouse-note"><span class="toast-icon">${art('warehouse')}</span><p class="toast-text"><strong>Warehouse full (${fillText(state)})</strong></p><p class="warehouse-note-line">${lead}</p><div class="warehouse-note-actions"><button type="button" class="primary-button" data-full-market>${art('market')}<span>To the Market</span></button><button type="button" class="secondary-button" data-full-upgrade><span>Upgrade</span></button></div></div>`;
}
export function createWarehouseUI({state,runAction,openMarket,notify,onChange,harbour=false}){
 let busy=false,lastTone=null;
 const dialog=()=>$('warehouse-dialog');
 function render(){
  const d=dialog();if(!d?.open)return;
  // In the harbour the window's picture is the harbour warehouse (29 Oct 2026, the owner: it showed the farm's red barn).
  setDialogBadge(d,harbour?'harbourwarehouse':'warehouse');
  $('warehouse-content').innerHTML=warehouseContent(state,{harbour});
  $('warehouse-market').onclick=()=>{d.close();openMarket(marketTab());};
  const go=$('warehouse-upgrade-go');if(go&&go.dataset.cost)go.onclick=upgrade;
  const build=$('warehouse-harbour-go');if(build)build.onclick=upgradeHarbour;
  refreshArt();
 }
 // The Market opens on the tab with the most to sell.
 const marketTab=()=>{const g=warehouseGroups(state).filter(g=>g.items.length).sort((a,b)=>b.total-a.total)[0];return g?.id==='goods'?'goods':'crops';};
 function open(section){
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const d=dialog();if(!d)return;d.showModal();render();
  if(section==='upgrade')$('warehouse-upgrade')?.scrollIntoView({block:'center'});
  if(section==='harbour')$('warehouse-harbour')?.scrollIntoView({block:'center'});
 }
 async function upgrade(){
  if(busy)return;const go=$('warehouse-upgrade-go'),cost=Number(go?.dataset.cost);
  if(warehouseUpgrade(state)?.coins!==cost){notify('The price has changed. Look at the upgrade again.');render();return;}
  busy=true;go.disabled=true;
  try{const r=await runAction({type:'warehouse_upgrade',expectedCost:cost});onChange();notify(`Warehouse level ${r.level}: room for ${number(r.capacity)} items.`);}
  catch(e){notify(e.message);}
  finally{busy=false;render();}
 }
 async function upgradeHarbour(){
  if(busy)return;const go=$('warehouse-harbour-go'),cost=Number(go?.dataset.cost);
  if(harbourWarehouseNext(state)?.coins!==cost){notify('The price has changed. Look at the upgrade again.');render();return;}
  busy=true;go.disabled=true;
  try{const r=await runAction({type:'harbour_warehouse',expectedCost:cost});onChange();notify(`Harbour warehouse level ${r.level}: room for ${number(r.capacity)} items in all.`);}
  catch(e){notify(e.message);}
  finally{busy=false;render();}
 }
 // The note, over whatever window is open (the toast sits under a modal window). A tap outside it closes it.
 function note(message,options={}){
  const host=document.querySelector('dialog[open]')??$('game');if(!host)return;
  host.querySelector(':scope>.center-notice')?.remove();
  const el=document.createElement('div');el.className='center-notice is-warn warehouse-full-note';el.setAttribute('role','alert');
  el.innerHTML=fullNoteHtml(state,options);
  const close=()=>el.remove();
  el.addEventListener('click',event=>{event.stopPropagation();if(event.target===el)close();});
  el.querySelector('[data-full-market]').onclick=()=>{close();openMarket(marketTab());};
  el.querySelector('[data-full-upgrade]').onclick=()=>{close();open('upgrade');};
  host.append(el);refreshArt();el.querySelector('[data-full-market]').focus({preventScroll:true});
  return el;
 }
 // Every update: the window if it is open, and one hint when it passes 90% (the Market button's badge is game.js hudNumbers).
 function refresh(){
  render();
  const tone=warehouseTone(state);
  if(lastTone==='ok'&&tone==='near')notify(`Your Warehouse is almost full (${fillText(state)}). Sell or upgrade to keep harvesting.`);
  lastTone=tone;return tone;
 }
 return {open,render,note,refresh};
}
