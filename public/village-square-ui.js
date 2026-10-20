import {VILLAGERS,VILLAGER_GONE,VILLAGE_REQUEST_WAIT,VILLAGE_THIRD_BOARD,VILLAGE_THREE_KINDS,VILLAGE_BUILD_XP,VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS,VILLAGE_LANDMARKS,VILLAGE_LANDMARK_XP,VILLAGE_PREMIUM,VILLAGE_HALL_PREMIUM,GREAT_HALL_DIAMONDS,VILLAGE_ALL_BUILT,WORLD_TWO_LEVEL,BUILDINGS,ITEMS,villageBrief,villageLandmark,villagePremium,villageWeek,MILLER_ORDER,MILLER_PREMIUM,MILLER_DIAMONDS,VILLAGE_XP_SHARE,millerValue,millerOpen,millerDelivered,villageRequestGoods,villagerLine,villageRequestExtra,worldTwoOpen,levelOf,familyWeek,familyWeekStart,normalizeFarm,villageShopStatus,villagerCallsLeft,VILLAGER_CALLS_PER_DAY,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {buyVillage,waitButton} from './village-shop-ui.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');
const CHIPS={coins:n=>`<b>${art('coins')}${number(n)}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${number(n)}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${number(n)} XP</b>`};
const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
const inStock=(state,goods)=>Object.entries(goods).every(([k,n])=>(state.inventory[k]??0)>=n);
// Where packed lunches come from, under a brief or a request that is short of them: at level 100 everything on the square waits for them,
// and their recipe on the farm was hidden until then. Once the Miners' Canteen is built (Oct 2026) its pasty lunches are named too.
const lunchHint=state=>`<small class="square-note">${state.buildings.canteen?.built===true?'Pack lunches in the Farm Kitchen or bake them in the Miners’ Canteen.':'Pack lunches in the Farm Kitchen.'}</small>`;
const shortOfLunch=(state,goods)=>(goods.packedlunch??0)>(state.inventory.packedlunch??0);

// World II's market square (Oct 2026, the owner's plan for levels 100-200): the Village market's pin opens it. On top the golden brief
// that builds the next village place, under it the villagers' requests, and a way to the Village market's own sell list. The rules are in
// game/farm-state.js (villageBrief, refreshVillage, villageDeliver); like the Valley Market (public/valley-ui.js), every tap waits for the
// server's answer. Each rule is said on this screen in one sentence.

// The golden brief as a card. A village place's own window shows it too, without Show me and without what it builds (that window is the
// place itself).
export function briefCard(state,itemList,{showMe=true}={}){
 const b=villageBrief(state);
 // After the last place (Oct 2026) the brief builds the landmarks, and after the Great Hall it says everything is built.
 if(!b){const l=villageLandmark(state);return l?landmarkCard(state,l,{showMe}):allBuilt();}
 const name=BUILDINGS[b.place].name,short=[...Object.entries(b.missing).map(([k,n])=>`${number(n)} ${ITEMS[k].name}`),...(b.short?[`${number(b.short)} coins`]:[])];
 // Below its level the brief says when it opens; with the level reached, exactly what is still missing (as an upgrade does).
 const note=!b.open?`<small class="shortfall">Opens at level ${b.level}. You are level ${levelOf(state)}.</small>`:short.length?`<small class="shortfall">Still needed: ${short.join(' and ')}.</small>`:'';
 return `<article class="order-card village-brief ${b.ready?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(b.place)}</span><div><small>GOLDEN BRIEF</small><h3>${b.title}</h3><p class="valley-line"><q>${b.line}</q> <span class="brief-from">${VILLAGERS[b.villager].name}</span></p></div></div>`
  +(showMe?`<p class="brief-builds"><b>Builds the ${name}</b> ${BUILDINGS[b.place].tagline}</p>`:'')
  +`<div class="ingredients">${itemList(b.goods,true)}<span class="ingredient ${b.short?'missing':''}">${art('coins')}<span>${number(b.coins)} coins</span></span></div>`
  +`<div class="task-bottom">${rewardChips({xp:VILLAGE_BUILD_XP})}<span class="brief-actions">${showMe?`<button type="button" class="secondary-button village-show" data-village-show="${b.place}">Show me</button>`:''}<button type="button" class="primary-button" data-village-build="${b.place}" ${b.ready?'':'disabled'}>Build</button></span></div>${note}${shortOfLunch(state,b.goods)?lunchHint(state):''}</article>`;
}
// After the last place the golden brief builds the landmarks (Oct 2026, levels 165-200): a row per good with what is handed in and Give,
// then Finish, like a valley project (estate-ui.js projectsMarkup): what you give stays given. Before its level the card says when it
// opens, its goods wait and there is nothing to show in the village yet (no Show me). The rule is LANDMARK_RULE, said above the card.
const LANDMARK_RULE='Bring the goods bit by bit, then pay to finish. The bonus lasts for good.';
const allBuilt=()=>`<article class="order-card village-brief is-waiting"><div class="order-head"><span class="order-icon">${art('village-badge')}</span><div><small>GOLDEN BRIEF</small><h3>${VILLAGE_ALL_BUILT}</h3></div></div></article>`;
export function landmarkCard(state,l,{showMe=true}={}){
 const ids=Object.keys(VILLAGE_LANDMARKS),handedIn=!Object.keys(l.missing).length;
 const rows=Object.entries(l.materials).map(([k,n])=>{const have=l.given[k]??0,left=n-have,stock=state.inventory[k]??0,give=l.open?Math.min(stock,left):0;
  return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${ITEMS[k].name}</strong><small>${left?`${number(stock)} in your barn`:'Handed in'}</small></span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-landmark-give="${l.id}" data-item="${k}" ${give?'':'disabled'}>Give${give?` ${number(give)}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
 const any=l.open&&Object.keys(l.missing).some(k=>(state.inventory[k]??0)>0);
 const note=!l.open?`<small class="shortfall">Opens at level ${l.level}. You are level ${levelOf(state)}.</small>`:handedIn&&l.short?`<small class="shortfall">Still needed: ${number(l.short)} coins.</small>`:'';
 const action=handedIn?`<button type="button" class="primary-button" data-landmark-finish="${l.id}" ${l.ready?'':'disabled'}>Finish for ${number(l.coins)} coins</button>`:`<button type="button" class="primary-button" data-landmark-all="${l.id}" ${any?'':'disabled'}>Give all you can</button>`;
 return `<article class="order-card village-brief village-landmark ${l.ready?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(l.art)}</span><div><small>LANDMARK ${ids.indexOf(l.id)+1} OF ${ids.length}</small><h3>${l.title}</h3><p class="valley-line"><q>${l.line}</q> <span class="brief-from">${VILLAGERS[l.villager].name}</span></p></div></div>`
  +`<p class="brief-builds"><b>Builds the ${l.name}</b> ${l.effect}</p><ul class="depot-load">${rows}</ul>`
  +(handedIn?'':`<div class="ingredients"><span class="ingredient ${l.short?'missing':''}">${art('coins')}<span>${number(l.coins)} coins to finish</span></span></div>`)
  +`<div class="task-bottom">${rewardChips({xp:VILLAGE_LANDMARK_XP,diamonds:l.id==='greathall'?GREAT_HALL_DIAMONDS:0})}<span class="brief-actions">${showMe&&l.open?`<button type="button" class="secondary-button village-show" data-village-show="${l.id}">Show me</button>`:''}${action}</span></div>${note}</article>`;
}
// Next villager now (20 Oct 2026, the Village tab of the diamond shop) under a waiting board's time: one tap, with the calls left today; once
// they are used, the rule instead of the button.
function callButton(state,i,now){
 const s=villageShopStatus(state,'villager',now,i);
 if(!s.reason)return `<div class="wait-buy-row">${waitButton(s)}<small class="square-note">${s.left} of ${VILLAGER_CALLS_PER_DAY} left today</small></div>`;
 return s.reason==='None left today'?`<small class="square-note">You can call ${VILLAGER_CALLS_PER_DAY} villagers a day. More tomorrow.</small>`:'';
}
// One board: its villager and what they ask (in a fixed order, so a save never flips the lines), or the time until the next one. A board
// that is due but empty has nobody to send: the farm makes no village good yet, and packed lunches are the first. line: the villager's
// line, another than the cards above say (villagerLine).
function requestCard(state,itemList,board,i,now,line){
 const r=board.request;
 if(!r)return `<article class="order-card valley-stall is-waiting"><div class="order-head"><span class="order-icon">${art('villagemarket')}</span><div><h3>Waiting for a villager</h3></div></div>${board.readyAt>now?`<p class="valley-next">Next villager in <b>${formatDuration(board.readyAt-now)}</b></p>${callButton(state,i,now)}`:'<p class="valley-next">Pack lunches in the Farm Kitchen and a villager will come.</p>'}</article>`;
 const v=VILLAGERS[r.villager],can=inStock(state,r.input),extra=villageRequestExtra(state,r,now),brief=villageBrief(state)?.goods??{};
 // Helping with goods the open golden brief needs leaves the brief short (at level 100 both ask packed lunches): the card says so.
 const forBrief=can&&Object.entries(r.input).some(([k,n])=>brief[k]&&(state.inventory[k]??0)-n<brief[k]);
 // "+X% vs market" only when the Village market would pay less now, its boosts included (a Double earnings boost can pay more).
 return `<article class="order-card valley-stall village-request ${can?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(v.place)}</span><div>${extra?`<small><b title="Compared with selling these goods at the market today">+${extra}% vs market</b></small>`:''}<h3>${v.name}</h3><p class="valley-line">${line}</p></div></div>`
  +`<div class="ingredients">${itemList(villageRequestGoods(r),true)}</div>${shortOfLunch(state,r.input)?lunchHint(state):''}${forBrief?'<small class="square-note is-brief">Uses goods the golden brief needs.</small>':''}`
  +`<div class="task-bottom">${rewardChips({coins:r.coins,xp:r.xp})}<button type="button" class="primary-button" data-village-deliver="${i}" data-request="${r.id}" ${can?'':'disabled'}>Help out</button></div>`
  +`<button type="button" class="text-button valley-skip" data-village-skip="${i}" data-request="${r.id}">Not now</button></article>`;
}
// The market week (Oct 2026), from level 116: under the villagers, how many were helped this week and when the next week starts. The 15th
// Help opens the crate by itself and its toast says so: no pop-up, nothing to claim. Below 116 nothing shows (Coming up announces it).
function marketWeek(state,now){
 if(levelOf(state)<VILLAGE_WEEK_LEVEL)return '';
 const w=villageWeek(state,now),n=Math.min(w.helped,VILLAGE_WEEK_TARGET),next=familyWeekStart(familyWeek(now)+1)-now;
 return `<h3 class="square-heading">Market week</h3><p class="square-rule">Help ${VILLAGE_WEEK_TARGET} villagers between Monday and Sunday and the market crate gives you ${VILLAGE_CRATE_DIAMONDS} diamonds.</p>`
  +`<div class="market-week ${w.paid?'is-paid':''}"><span class="market-week-art">${art('diamonds')}</span><div class="market-week-copy">`
  +`<strong>${w.paid?`The market crate is open: +${VILLAGE_CRATE_DIAMONDS} diamonds this week.`:`${n} / ${VILLAGE_WEEK_TARGET} villagers this week`}</strong>`
  +`<span class="market-week-bar" role="progressbar" aria-label="Villagers helped this week" aria-valuemin="0" aria-valuemax="${VILLAGE_WEEK_TARGET}" aria-valuenow="${n}"><i style="width:${Math.round(n/VILLAGE_WEEK_TARGET*100)}%"></i></span>`
  +`<small>New week in ${formatDuration(next)}.</small></div></div>`;
}
// The miller's order (17 Oct 2026, the owner's pick 5b): once a week, from level 115, 6 golden loaves and 2 heirloom pies for twice their
// worth and 10 diamonds (farm-state.js millerDeliver). Below 115 nothing shows (level 115's card and Coming up announce it). Delivered,
// the card says when the next order comes; short of the bakes, where they are made.
const MILLER_LINES=['Golden flour makes the finest bread in the valley.','The village feast needs something special.','Bake with my golden flour, and I pay you well.','Nothing smells better than a golden loaf.'];
function millerCard(state,itemList,now){
 if(!millerOpen(state))return '';
 const week=familyWeek(now),done=millerDelivered(state,now),can=!done&&inStock(state,MILLER_ORDER),next=familyWeekStart(week+1)-now,value=millerValue();
 const head=`<div class="order-head"><span class="order-icon miller-portrait">${art('villager-miller')}</span><div><small>ONCE A WEEK</small><h3>The miller</h3><p class="valley-line">${MILLER_LINES[week%MILLER_LINES.length]}</p></div></div>`;
 const body=done?`<p class="valley-next">Thank you! His next order comes in <b>${formatDuration(next)}</b>.</p>`
  :`<div class="ingredients">${itemList(MILLER_ORDER,true)}</div>${can?'':'<small class="square-note">Golden loaves bake at the Bakery and heirloom pies in the Farm Kitchen, both with heirloom flour from the Village Windmill.</small>'}`
   +`<div class="task-bottom">${rewardChips({coins:value*MILLER_PREMIUM,diamonds:MILLER_DIAMONDS,xp:Math.round(value/VILLAGE_XP_SHARE)})}<button type="button" class="primary-button" data-miller-deliver data-week="${week}" ${can?'':'disabled'}>Deliver</button></div>`;
 return `<h3 class="square-heading">The miller’s order</h3><p class="square-rule">Once a week the miller asks for heirloom bakes. He pays twice what they are worth, and ${MILLER_DIAMONDS} diamonds.</p>`
  +`<article class="order-card valley-stall miller-order ${can?'is-ready':''}">${head}${body}</article>`;
}
// The whole screen, top to bottom as on a phone: the golden brief (a place, then a landmark) with its rule, the villagers with theirs,
// what is coming at the next levels and the count helped, the market week, and the way to sell. "Half again" is VILLAGE_PREMIUM (1.5),
// 1.6 times once the Great Hall stands (villagePremium).
export function squareMarkup(state,itemList,now=farmNow()){
 const boards=state.village?.boards??[],helped=state.stats.village_requests??0,said=[],level=levelOf(state);
 const brief=villageBrief(state),landmark=!brief&&villageLandmark(state);
 const rule=brief?'Village places are built with coins and village goods, one at a time.':landmark?LANDMARK_RULE:'';
 // From level 120 most requests have three lines (a farm with no village place built still gets two): "often", not a promise.
 const footer=[level<VILLAGE_THIRD_BOARD?`<span>A third villager comes at level ${VILLAGE_THIRD_BOARD}.</span>`:level<VILLAGE_THREE_KINDS?`<span>From level ${VILLAGE_THREE_KINDS}, villagers often ask for three kinds of goods.</span>`:'',helped?`<span>${helped===1?'1 villager helped so far.':`${number(helped)} villagers helped so far.`}</span>`:''].filter(Boolean);
 return `<h3 class="square-heading">Golden brief</h3>${rule?`<p class="square-rule">${rule}</p>`:''}${briefCard(state,itemList)}`
  +`<h3 class="square-heading">Villagers’ requests</h3><p class="square-rule">${villagePremium(state)===VILLAGE_PREMIUM?'Villagers pay half again what their goods are worth.':`Villagers pay ${VILLAGE_HALL_PREMIUM} times what their goods are worth.`} A new villager comes ${VILLAGE_REQUEST_WAIT/3600000} hours after you help or say no.</p>`
  +`<div class="daily-list valley-stalls">${boards.map((b,i)=>{const line=b.request&&villagerLine(b.request,said);if(line)said.push(line);return requestCard(state,itemList,b,i,now,line);}).join('')}</div>`
  +(footer.length?`<p class="valley-footer">${footer.join(' ')}</p>`:'')
  +millerCard(state,itemList,now)
  +marketWeek(state,now)
  +'<div class="market-board-link"><span>Sell village goods at today’s prices.</span><button type="button" id="square-sell">Sell goods →</button></div>';
}
// The market square's line in the village's Buildings list: a brief to build first, then villagers you can help, then who waits.
export function squareStatus(state,now=farmNow()){
 if(!worldTwoOpen(state))return {text:`Locked · Reach level ${WORLD_TWO_LEVEL}.`,kind:'locked'};
 if(villageBrief(state)?.ready)return {text:'Golden brief ready to build',kind:'ready'};
 if(villageLandmark(state)?.ready)return {text:'Landmark ready to finish',kind:'ready'};
 if(millerOpen(state)&&!millerDelivered(state,now)&&inStock(state,MILLER_ORDER))return {text:'The miller’s order is ready to deliver',kind:'ready'};
 const boards=state.village?.boards??[],asking=boards.filter(b=>b.request),can=asking.filter(b=>inStock(state,b.request.input)).length;
 if(can)return {text:`${can} ${can===1?'villager':'villagers'} can be helped`,kind:'ready'};
 if(asking.length)return {text:`${asking.length} ${asking.length===1?'villager':'villagers'} waiting`,kind:'idle'};
 const next=boards.length?Math.min(...boards.map(b=>b.readyAt))-now:0;
 return next>0?{text:`Next villager in ${formatDuration(next)}`,kind:'working'}:{text:'Waiting for a villager',kind:'idle'};
}

export function createVillageSquareUI({state,runAction,onChange,notify,itemList,onShow,onSell,refresh}){
 let timer,shown='',busy=false,seen=[];
 // What the open screen shows: each board's villager with its goods and their stock (or the minutes to the next one), the brief and the
 // count of villagers helped, the market week (a crate, a new week, reaching 116) and the landmark with what is handed in. Only a change
 // draws it again.
 const signature=()=>{const b=villageBrief(state),l=!b&&villageLandmark(state);return JSON.stringify([(state.village?.boards??[]).map(x=>x.request?[x.request.id,Object.entries(villageRequestGoods(x.request)).map(([k,n])=>[k,n,state.inventory[k]])]:Math.ceil(Math.max(0,x.readyAt-farmNow())/60000)),b&&[b.place,b.ready,b.open,Object.values(b.missing),b.short],state.stats.village_requests,levelOf(state)>=VILLAGE_WEEK_LEVEL&&villageWeek(state,farmNow()),millerOpen(state)&&[millerDelivered(state,farmNow()),familyWeek(farmNow()),Object.keys(MILLER_ORDER).map(k=>state.inventory[k]??0)],l&&[l.id,l.ready,l.open,l.short,Object.keys(l.materials).map(k=>[l.given[k]??0,state.inventory[k]??0])],state.village?.landmarks?.done?.length,villagerCallsLeft(state,farmNow())]);};
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
  root.querySelectorAll('[data-village-deliver]').forEach(b=>b.onclick=()=>{const r=board(Number(b.dataset.villageDeliver));if(r)act(b,{type:'village_deliver',...r},x=>`${x.villager} thanks you! +${number(x.coins)} coins and +${number(x.xp)} XP.`+(x.crate?` The market crate is open: +${number(x.crate)} diamonds!`:''));});
  root.querySelectorAll('[data-miller-deliver]').forEach(b=>b.onclick=()=>act(b,{type:'miller_deliver',week:Number(b.dataset.week)},x=>`The miller thanks you! +${number(x.coins)} coins, +${x.diamonds} diamonds and +${number(x.xp)} XP.`));
  root.querySelectorAll('[data-village-skip]').forEach(b=>b.onclick=()=>{const r=board(Number(b.dataset.villageSkip));if(r)act(b,{type:'village_skip',...r},()=>`The next villager comes in ${formatDuration(VILLAGE_REQUEST_WAIT)}.`);});
  // After a build the screen stays open on the next brief. The Village Fields are one name in the plural; the Pier says where the boat is.
  root.querySelectorAll('[data-village-build]').forEach(b=>b.onclick=()=>act(b,{type:'village_build',place:b.dataset.villageBuild},x=>x.place==='villagefields'?`The ${x.name} are built! +${number(x.xp)} XP.`:`The ${x.name} is built! +${number(x.xp)} XP.${x.place==='pier'?' The town boat waits at the pier.':''}`));
  // A landmark (Oct 2026): Give one good or all you can, then Finish; after Finish the screen stays open on the next one.
  const handed=r=>r.ready?'Everything is handed in. Pay the coins to finish it.':`Handed in ${number(r.units)} ${r.units===1?'good':'goods'}.`;
  root.querySelectorAll('[data-landmark-give]').forEach(b=>b.onclick=()=>act(b,{type:'landmark_give',landmark:b.dataset.landmarkGive,item:b.dataset.item},handed));
  root.querySelectorAll('[data-landmark-all]').forEach(b=>b.onclick=()=>act(b,{type:'landmark_give',landmark:b.dataset.landmarkAll},handed));
  root.querySelectorAll('[data-landmark-finish]').forEach(b=>b.onclick=()=>act(b,{type:'landmark_finish',landmark:b.dataset.landmarkFinish},r=>r.diamonds?`The ${r.name} is finished! +${number(r.xp)} XP and +${number(r.diamonds)} diamonds.`:`The ${r.name} is finished! +${number(r.xp)} XP.`));
  // Next villager now: one tap; short of diamonds the square closes and the shop opens.
  root.querySelectorAll('[data-wait-buy]').forEach(b=>b.onclick=async()=>{if(busy)return;busy=true;b.disabled=true;
   try{const done=await buyVillage({state,id:'villager',board:Number(b.dataset.board),now:farmNow(),runAction,close:()=>$('village-square-dialog').close()});if(done)notify(done.message);}
   catch(error){notify(error.message);}finally{busy=false;onChange();if($('village-square-dialog').open)render();}});
  root.querySelectorAll('[data-village-show]').forEach(b=>b.onclick=()=>{$('village-square-dialog').close();onShow?.(b.dataset.villageShow);});
  const sell=$('square-sell');if(sell)sell.onclick=()=>{$('village-square-dialog').close();onSell?.();};
 }
 function open(){
  if(!worldTwoOpen(state)){notify(`Reach level ${WORLD_TWO_LEVEL} to trade in the village.`);return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('village-square-dialog').showModal();$('village-square-dialog').scrollTop=0;later();
 }
 return {open,refresh:()=>{if($('village-square-dialog')?.open&&signature()!==shown)render();}};
}
