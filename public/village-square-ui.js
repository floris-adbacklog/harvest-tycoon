import {VILLAGERS,VILLAGER_GONE,VILLAGE_REQUEST_WAIT,VILLAGE_THIRD_BOARD,VILLAGE_BUILD_XP,WORLD_TWO_LEVEL,BUILDINGS,ITEMS,villageBrief,villageRequestGoods,villagerLine,villageRequestExtra,worldTwoOpen,levelOf,normalizeFarm,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
const inStock=(state,goods)=>Object.entries(goods).every(([k,n])=>(state.inventory[k]??0)>=n);
// Where packed lunches come from, under a brief or a request that is short of them: at level 100 everything on the square waits for them,
// and their recipe on the farm was hidden until then.
const LUNCH_HINT='<small class="square-note">Pack lunches in the Farm Kitchen.</small>';
const shortOfLunch=(state,goods)=>(goods.packedlunch??0)>(state.inventory.packedlunch??0);

// World II's market square (Oct 2026, the owner's plan for levels 100-200): the Village market's pin opens it. On top the golden brief
// that builds the next village place, under it the villagers' requests, and a way to the Village market's own sell list. The rules are in
// game/farm-state.js (villageBrief, refreshVillage, villageDeliver); like the Valley Market (public/valley-ui.js), every tap waits for the
// server's answer. Each rule is said on this screen in one sentence.

// The golden brief as a card. A village place's own window shows it too, without Show me and without what it builds (that window is the
// place itself).
export function briefCard(state,itemList,{showMe=true}={}){
 const b=villageBrief(state);
 if(!b)return `<article class="order-card village-brief is-waiting"><div class="order-head"><span class="order-icon">${art('village-badge')}</span><div><small>GOLDEN BRIEF</small><h3>The builders are drawing the next plans.</h3></div></div></article>`;
 const name=BUILDINGS[b.place].name,short=[...Object.entries(b.missing).map(([k,n])=>`${number(n)} ${ITEMS[k].name}`),...(b.short?[`${number(b.short)} coins`]:[])];
 // Below its level the brief says when it opens; with the level reached, exactly what is still missing (as an upgrade does).
 const note=!b.open?`<small class="shortfall">Opens at level ${b.level}. You are level ${levelOf(state)}.</small>`:short.length?`<small class="shortfall">Still needed: ${short.join(' and ')}.</small>`:'';
 return `<article class="order-card village-brief ${b.ready?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(b.place)}</span><div><small>GOLDEN BRIEF</small><h3>${b.title}</h3><p class="valley-line"><q>${b.line}</q> <span class="brief-from">${VILLAGERS[b.villager].name}</span></p></div></div>`
  +(showMe?`<p class="brief-builds"><b>Builds the ${name}</b> ${BUILDINGS[b.place].tagline}</p>`:'')
  +`<div class="ingredients">${itemList(b.goods,true)}<span class="ingredient ${b.short?'missing':''}">${art('coins')}<span>${number(b.coins)} coins</span></span></div>`
  +`<div class="task-bottom">${rewardChips({xp:VILLAGE_BUILD_XP})}<span class="brief-actions">${showMe?`<button type="button" class="secondary-button village-show" data-village-show="${b.place}">Show me</button>`:''}<button type="button" class="primary-button" data-village-build="${b.place}" ${b.ready?'':'disabled'}>Build</button></span></div>${note}${shortOfLunch(state,b.goods)?LUNCH_HINT:''}</article>`;
}
// One board: its villager and what they ask (in a fixed order, so a save never flips the lines), or the time until the next one. A board
// that is due but empty has nobody to send: the farm makes no village good yet, and packed lunches are the first. line: the villager's
// line, another than the cards above say (villagerLine).
function requestCard(state,itemList,board,i,now,line){
 const r=board.request;
 if(!r)return `<article class="order-card valley-stall is-waiting"><div class="order-head"><span class="order-icon">${art('villagemarket')}</span><div><h3>Waiting for a villager</h3></div></div>${board.readyAt>now?`<p class="valley-next">Next villager in <b>${formatDuration(board.readyAt-now)}</b></p>`:'<p class="valley-next">Pack lunches in the Farm Kitchen and a villager will come.</p>'}</article>`;
 const v=VILLAGERS[r.villager],can=inStock(state,r.input),extra=villageRequestExtra(state,r,now),brief=villageBrief(state)?.goods??{};
 // Helping with goods the open golden brief needs leaves the brief short (at level 100 both ask packed lunches): the card says so.
 const forBrief=can&&Object.entries(r.input).some(([k,n])=>brief[k]&&(state.inventory[k]??0)-n<brief[k]);
 // "+X% vs market" only when the Village market would pay less now, its boosts included (a Double earnings boost can pay more).
 return `<article class="order-card valley-stall village-request ${can?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(v.place)}</span><div>${extra?`<small><b title="Compared with selling these goods at the market today">+${extra}% vs market</b></small>`:''}<h3>${v.name}</h3><p class="valley-line">${line}</p></div></div>`
  +`<div class="ingredients">${itemList(villageRequestGoods(r),true)}</div>${shortOfLunch(state,r.input)?LUNCH_HINT:''}${forBrief?'<small class="square-note is-brief">Uses goods the golden brief needs.</small>':''}`
  +`<div class="task-bottom">${rewardChips({coins:r.coins,xp:r.xp})}<button type="button" class="primary-button" data-village-deliver="${i}" data-request="${r.id}" ${can?'':'disabled'}>Help out</button></div>`
  +`<button type="button" class="text-button valley-skip" data-village-skip="${i}" data-request="${r.id}">Not now</button></article>`;
}
// The whole screen, top to bottom as on a phone. "Half again" is VILLAGE_PREMIUM (1.5).
export function squareMarkup(state,itemList,now=farmNow()){
 const boards=state.village?.boards??[],helped=state.stats.village_requests??0,said=[];
 const footer=[levelOf(state)<VILLAGE_THIRD_BOARD?`<span>A third villager comes at level ${VILLAGE_THIRD_BOARD}.</span>`:'',helped?`<span>${helped===1?'1 villager helped so far.':`${number(helped)} villagers helped so far.`}</span>`:''].filter(Boolean);
 return `<h3 class="square-heading">Golden brief</h3><p class="square-rule">Village places are built with coins and village goods, one at a time.</p>${briefCard(state,itemList)}`
  +`<h3 class="square-heading">Villagers’ requests</h3><p class="square-rule">Villagers pay half again what their goods are worth. A new villager comes ${VILLAGE_REQUEST_WAIT/3600000} hours after you help or say no.</p>`
  +`<div class="daily-list valley-stalls">${boards.map((b,i)=>{const line=b.request&&villagerLine(b.request,said);if(line)said.push(line);return requestCard(state,itemList,b,i,now,line);}).join('')}</div>`
  +(footer.length?`<p class="valley-footer">${footer.join(' ')}</p>`:'')
  +'<div class="market-board-link"><span>Sell village goods at today’s prices.</span><button type="button" id="square-sell">Sell goods →</button></div>';
}
// The market square's line in the village's Buildings list: a brief to build first, then villagers you can help, then who waits.
export function squareStatus(state,now=farmNow()){
 if(!worldTwoOpen(state))return {text:`Locked · Reach level ${WORLD_TWO_LEVEL}.`,kind:'locked'};
 if(villageBrief(state)?.ready)return {text:'Golden brief ready to build',kind:'ready'};
 const boards=state.village?.boards??[],asking=boards.filter(b=>b.request),can=asking.filter(b=>inStock(state,b.request.input)).length;
 if(can)return {text:`${can} ${can===1?'villager':'villagers'} can be helped`,kind:'ready'};
 if(asking.length)return {text:`${asking.length} ${asking.length===1?'villager':'villagers'} waiting`,kind:'idle'};
 const next=boards.length?Math.min(...boards.map(b=>b.readyAt))-now:0;
 return next>0?{text:`Next villager in ${formatDuration(next)}`,kind:'working'}:{text:'Waiting for a villager',kind:'idle'};
}

export function createVillageSquareUI({state,runAction,onChange,notify,itemList,onShow,onSell,refresh}){
 let timer,shown='',busy=false,seen=[];
 // What the open screen shows: each board's villager with its goods and their stock (or the minutes to the next one), the brief and the
 // count of villagers helped. Only a change draws it again.
 const signature=()=>{const b=villageBrief(state);return JSON.stringify([(state.village?.boards??[]).map(x=>x.request?[x.request.id,Object.entries(villageRequestGoods(x.request)).map(([k,n])=>[k,n,state.inventory[k]])]:Math.ceil(Math.max(0,x.readyAt-farmNow())/60000)),b&&[b.place,b.ready,b.open,Object.values(b.missing),b.short],state.stats.village_requests]);};
 // A tap waits for the server: its button stays off until the answer, a refusal is told as it comes, and the screen is drawn again.
 async function act(button,action,message){
  if(busy)return;busy=true;button.disabled=true;
  try{const result=await runAction(action);notify(message(result));}
  catch(error){
   notify(error.message);
   // The server has another villager on that board (a family gift or another device changed the farm there): the farm is loaded again
   // first, so the screen shows the server's villagers and the next tap is not refused the same way.
   if(error.message===VILLAGER_GONE)try{await refresh?.();}catch{}
  }
  finally{busy=false;onChange();render();}
 }
 function render(){
  clearTimeout(timer);
  const now=farmNow();normalizeFarm(state,now);
  // Help hands over the goods that were on the screen: the server refuses when its villager asks for others (farm-state.js villageDeliver).
  seen=(state.village?.boards??[]).map(b=>b.request&&{id:b.request.id,input:{...b.request.input}});
  $('village-square-content').innerHTML=squareMarkup(state,itemList,now);bind();refreshArt();shown=signature();
  if($('village-square-dialog').open)later();
 }
 // Drawn again every 30 seconds while open, for the time to the next villager (also from the first opening on).
 function later(){clearTimeout(timer);timer=setTimeout(()=>{if($('village-square-dialog').open)render();},30000);}
 function bind(){
  const root=$('village-square-content'),board=i=>{const r=seen[i];return r?{board:i,request:r.id,input:r.input}:null;};
  root.querySelectorAll('[data-village-deliver]').forEach(b=>b.onclick=()=>{const r=board(Number(b.dataset.villageDeliver));if(r)act(b,{type:'village_deliver',...r},x=>`${x.villager} thanks you! +${number(x.coins)} coins and +${number(x.xp)} XP.`);});
  root.querySelectorAll('[data-village-skip]').forEach(b=>b.onclick=()=>{const r=board(Number(b.dataset.villageSkip));if(r)act(b,{type:'village_skip',...r},()=>`The next villager comes in ${formatDuration(VILLAGE_REQUEST_WAIT)}.`);});
  // After a build the screen stays open on the next brief.
  root.querySelectorAll('[data-village-build]').forEach(b=>b.onclick=()=>act(b,{type:'village_build',place:b.dataset.villageBuild},x=>`The ${x.name} is built! +${number(x.xp)} XP.`));
  root.querySelectorAll('[data-village-show]').forEach(b=>b.onclick=()=>{$('village-square-dialog').close();onShow?.(b.dataset.villageShow);});
  const sell=$('square-sell');if(sell)sell.onclick=()=>{$('village-square-dialog').close();onSell?.();};
 }
 function open(){
  if(!worldTwoOpen(state)){notify(`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`);return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('village-square-dialog').showModal();$('village-square-dialog').scrollTop=0;later();
 }
 return {open,refresh:()=>{if($('village-square-dialog')?.open&&signature()!==shown)render();}};
}
