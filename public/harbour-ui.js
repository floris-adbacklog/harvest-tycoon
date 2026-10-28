import {ITEMS,HARBOUR_WEEK,SHIP_GONE,SHIP_SWAP_LEVEL,harbourBerths,berthReturn,harbourWork,harbourWorkDone,shipReady,shipReturn,shipPremium,shipQuays,worldThreeOpen,levelOf,normalizeFarm,formatDuration,familyWeek} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
const total=goods=>Object.values(goods).reduce((sum,n)=>sum+n,0);
const name=k=>ITEMS[k]?.name??k;

// World III, the harbour office (27 Oct 2026, v1): one window with two tabs, as the village's market square and town boat are drawn
// (order cards, a load list, reward chips). Ships: one card a quay, loaded bit by bit, "Not now", and from level 226 "Ask for something
// else" once a ship. Works: the harbour master's one work, goods handed in bit by bit, then the coins. The harbour's goods sell at the Market,
// which in the harbour is the Harbour market (economy-ui.js), and its quests are in the Quests menu (quests-ui.js), as in the village.
// The rules are in farm-state.js; every tap waits for the server.
export const HARBOUR_TABS=Object.freeze([['ships','Ships','harbour-badge'],['works','Works','harbour-master']]);
export function harbourStatus(state,now=farmNow()){
 if(!worldThreeOpen(state))return {text:'Closed',kind:'idle'};
 const q=state.harbour?.quays??[];
 if(q.some((_,i)=>shipReady(state,i)))return {text:'A ship is ready to sail',kind:'ready'};
 if(harbourWork(state)?.ready)return {text:'A work is ready to finish',kind:'ready'};
 const docked=q.filter(x=>x.ship).length;
 if(docked)return {text:docked===1?'A ship at the quay':`${docked} ships at the quays`,kind:'working'};
 const next=q.map(x=>x.readyAt).filter(t=>t>now).sort((a,b)=>a-b)[0];
 return next?{text:`Next ship in ${formatDuration(next-now)}`,kind:'working'}:{text:'The harbour master waits',kind:'idle'};
}
function shipsMarkup(state,now){
 const quays=state.harbour.quays,premium=shipPremium(state);
 const rule=`<p class="estate-lead valley-lead"><span class="estate-icon">${art('harbour-badge')}</span><span>Ships pay ${premium} times what their cargo is worth. Load them bit by bit; a full ship sails at once. A new ship docks ${formatDuration(shipReturn(state))} later.</span></p>`;
 if(!quays.length)return rule+`<div class="daily-list"><article class="order-card is-waiting"><div class="order-head"><span class="order-icon">${art('harbour-master')}</span><div><small>The harbour master</small><h3>Build the Harbour office first</h3></div></div><p class="valley-next">Its work is on the Works tab.</p></article></div>`;
 // The berths (28 Oct 2026): the quays' ships, the Deep quay's container ship and the flagship's world voyage, each with its own name.
 const berths=harbourBerths(state),flagship=state.harbour.flagship||'Your flagship';
 const berthName=(kind,i)=>kind==='container'?'Container ship':kind==='voyage'?`World voyage: ${esc(flagship)}`:`Quay ${i+1}`;
 const cards=quays.map((q,i)=>{
  const s=q.ship,kind=berths[i]??'ship';
  if(!s)return `<article class="order-card is-waiting"><div class="order-head"><span class="order-icon">${art(kind==='ship'?'harbour-badge':'harbour-crate')}</span><div><small>${berthName(kind,i)}</small><h3>${q.readyAt>now?`${kind==='container'?'Next container ship':kind==='voyage'?`${esc(flagship)} is back`:'Next ship'} in ${formatDuration(q.readyAt-now)}`:'A ship is on its way'}</h3></div></div></article>`;
  const loaded=total(s.loaded),needed=total(s.input);
  const rows=Object.entries(s.input).map(([k,n])=>{const have=s.loaded[k],left=n-have,stock=state.inventory[k]??0,load=Math.min(stock,left);
   const swap=!s.swapped&&!have&&levelOf(state)>=SHIP_SWAP_LEVEL;
   return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${name(k)}</strong><small>${left?`${number(stock)} in your barn`:'Loaded'}</small>${swap?`<button type="button" class="text-button" data-ship-swap="${i}" data-item="${k}">Something else</button>`:''}</span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-ship-load="${i}" data-item="${k}" ${load?'':'disabled'}>Load${load?` ${number(load)}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
  const any=Object.entries(s.input).some(([k,n])=>s.loaded[k]<n&&(state.inventory[k]??0)>0);
  return `<article class="order-card depot-contract boat-cargo ${shipReady(state,i)?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(kind==='ship'?'harbour-badge':'harbour-crate')}</span><div><small>${berthName(kind,i)}</small><h3>${kind==='voyage'?`${esc(flagship)} sails round the world with ${Object.keys(s.input).length} goods`:`${kind==='container'?'A container ship':'A ship'} wants ${Object.keys(s.input).length} goods`}</h3></div></div>`
   +`<div class="depot-progress"><progress value="${loaded}" max="${needed}" aria-label="Ship loaded"></progress><span>${number(loaded)} / ${number(needed)} loaded</span></div><ul class="depot-load">${rows}</ul>`
   +`<div class="task-bottom">${rewardChips({coins:s.coins,diamonds:s.diamonds??0,xp:s.xp})}<button type="button" class="primary-button" data-ship-all="${i}" ${any?'':'disabled'}>Load all you can</button></div>`
   +(loaded?'':`<button type="button" class="text-button valley-skip" data-ship-skip="${i}">Not now</button>`)+'</article>';
 }).join('');
 const h=state.harbour,week=h.week.week===familyWeek(now)?h.week:{sent:0,paid:false};
 const crate=levelOf(state)>=HARBOUR_WEEK.level?`<p class="valley-footer">${art('harbour-crate')} Harbour week: ${Math.min(week.sent,HARBOUR_WEEK.target)} / ${HARBOUR_WEEK.target} ships.${week.paid?' The crate is open.':` The crate holds ${harbourWorkDone(state,'yard')?HARBOUR_WEEK.yardDiamonds:HARBOUR_WEEK.diamonds} diamonds.`}</p>`:'';
 return rule+`<div class="daily-list">${cards}</div>`+crate;
}
function worksMarkup(state){
 const w=harbourWork(state);
 const rule=`<p class="estate-lead valley-lead"><span class="estate-icon">${art('harbour-master')}</span><span>The harbour master hands out one work at a time. Bring the goods bit by bit, then pay the coins to finish.</span></p>`;
 // Every work done (28 Oct 2026): the flagship's name, given and changed here.
 if(!w){const name=state.harbour.flagship??'';return rule+`<div class="daily-list"><article class="order-card"><div class="order-head"><span class="order-icon">${art('harbour-crate')}</span><div><small>Every harbour work is built</small><h3>${name?esc(name):'Name your flagship'}</h3></div></div><p class="valley-next">It sails a world voyage every week from the last berth.</p><div class="task-bottom"><input id="flagship-name" type="text" maxlength="24" value="${esc(name)}" placeholder="Your flagship’s name" aria-label="Your flagship’s name"><button type="button" class="primary-button" data-flagship-name>${name?'Rename':'Name it'}</button></div></article></div>`;}
 const rows=Object.entries(w.goods).map(([k,n])=>{const have=w.given[k]??0,left=n-have,stock=state.inventory[k]??0;
  return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${name(k)}</strong><small>${left?`${number(stock)} in your barn`:'Handed in'}</small></span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-work-give="${k}" ${stock&&w.open?'':'disabled'}>Give${stock?` ${number(Math.min(stock,left))}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
 const done=total(w.given),need=total(w.goods),all=!Object.keys(w.missing).length;
 return rule+`<div class="daily-list"><article class="order-card ${w.ready?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(w.art)}</span><div><small>${w.open?'The next work':`From level ${w.level}`}</small><h3>${w.name}</h3></div></div><p class="valley-next">${w.effect}</p>`
  +`<div class="depot-progress"><progress value="${done}" max="${need}" aria-label="Goods handed in"></progress><span>${number(done)} / ${number(need)} handed in</span></div><ul class="depot-load">${rows}</ul>`
  +`<div class="task-bottom">${rewardChips({xp:5000})}${all?`<button type="button" class="primary-button" data-work-finish ${w.ready?'':'disabled'}>Pay ${number(w.coins)} coins</button>`:`<button type="button" class="primary-button" data-work-all ${w.open?'':'disabled'}>Give all you can</button>`}</div></article></div>`;
}
export function createHarbourUI({state,runAction,onChange,notify,refresh}){
 let tab='ships',busy=false,timer;
 async function act(button,action,message){
  if(busy)return;busy=true;if(button)button.disabled=true;
  try{const result=await runAction(action);notify(message(result));}
  catch(error){notify(error.message);if(error.message===SHIP_GONE)try{await refresh?.();}catch{}}
  finally{busy=false;onChange();render();}
 }
 function render(){
  clearTimeout(timer);const now=farmNow();normalizeFarm(state,now);
  const tabs=`<div class="market-tabs harbour-tabs" role="group" aria-label="Harbour office">${HARBOUR_TABS.map(([id,label,picture])=>`<button type="button" aria-pressed="${id===tab}" data-harbour-tab="${id}"><i data-game-art="${picture}"></i><span>${label}</span></button>`).join('')}</div>`;
  const body=tab==='works'?worksMarkup(state):shipsMarkup(state,now);
  $('harbour-content').innerHTML=tabs+body;bind();refreshArt();
  if($('harbour-dialog').open)timer=setTimeout(()=>{if($('harbour-dialog').open&&!busy&&document.activeElement?.id!=='flagship-name')render();},30000);   // not while the flagship's name is being typed
 }
 const shipOf=i=>{const s=state.harbour.quays[i].ship;return {quay:i,ship:s.id,input:{...s.input}};};
 const sailed=r=>r.sailed?`${r.kind==='voyage'?'Off round the world!':r.kind==='container'?'The container ship sails!':'The ship sails!'} +${number(r.coins)} coins and +${number(r.xp)} XP.${r.diamonds?` +${r.diamonds} diamonds.`:''}${r.crate?` The harbour crate opens: +${r.crate} diamonds.`:''}`:r.units===1?'Loaded 1 good.':`Loaded ${number(r.units)} goods.`;
 function bind(){
  const root=$('harbour-content');
  root.querySelectorAll('[data-harbour-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.harbourTab;render();});
  root.querySelectorAll('[data-ship-load]').forEach(b=>b.onclick=()=>act(b,{type:'ship_load',...shipOf(+b.dataset.shipLoad),item:b.dataset.item},sailed));
  root.querySelectorAll('[data-ship-all]').forEach(b=>b.onclick=()=>act(b,{type:'ship_load',...shipOf(+b.dataset.shipAll)},sailed));
  root.querySelectorAll('[data-ship-skip]').forEach(b=>b.onclick=()=>act(b,{type:'ship_skip',...shipOf(+b.dataset.shipSkip)},()=>`The ship sails on without cargo. The next one docks in ${formatDuration(berthReturn(state,harbourBerths(state)[+b.dataset.shipSkip]))}.`));
  root.querySelectorAll('[data-ship-swap]').forEach(b=>b.onclick=()=>act(b,{type:'ship_swap',...shipOf(+b.dataset.shipSwap),item:b.dataset.item},r=>`The ship asks for ${number(r.count)} ${name(r.item).toLowerCase()} instead.`));
  const w=harbourWork(state);
  root.querySelectorAll('[data-work-give]').forEach(b=>b.onclick=()=>act(b,{type:'harbour_give',work:w.id,item:b.dataset.workGive},r=>`Handed in ${number(r.units)}.`));
  root.querySelectorAll('[data-work-all]').forEach(b=>b.onclick=()=>act(b,{type:'harbour_give',work:w.id},r=>r.ready?'Everything is handed in. Pay the coins to finish.':`Handed in ${number(r.units)}.`));
  root.querySelectorAll('[data-flagship-name]').forEach(b=>b.onclick=()=>act(b,{type:'flagship_name',name:root.querySelector('#flagship-name')?.value??''},r=>`Your flagship is called ${r.name}.`));
  root.querySelectorAll('[data-work-finish]').forEach(b=>b.onclick=()=>act(b,{type:'harbour_finish',work:w.id},r=>`${r.name} is built! +${number(r.xp)} XP.${r.diamonds?` +${r.diamonds} diamonds.`:''}`));
 }
 function open(at){
  if(at)tab=at;
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('harbour-dialog').showModal();$('harbour-dialog').scrollTop=0;
 }
 return {open,refresh:()=>{if($('harbour-dialog')?.open&&!busy)render();}};
}
