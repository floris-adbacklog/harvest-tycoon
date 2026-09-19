import {roadmapMarkup} from './progression-ui.js';
import {replacementOptions,REPLACE_ORDER_COST,DAILY_ORDER_REPLACEMENTS,levelReward,featureUnlocked,featureUnlockHint,CROPS,ITEMS,QUESTS,DAILY_REWARDS,DAILY_DIAMONDS,DAY_MS,utcDay,dailyTasks,dailyOrders,levelOf,seedCost,levelProgress,SILO_COSTS,siloBonus,tractorQuote,marketHighlights,marketValue,DELIVERY_TIERS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
export function createRetentionUI({state,runAction,onChange,notify,getCrop,itemList}){
 let tab='challenges',utility='tractor',lastDay=utcDay(farmNow()),lastTractorReady=true,lastFieldStatus='',lastCoinBoost=false,lastXPBoost=false;
 const open=id=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();};
 async function act(action,message){try{const r=await runAction(action);onChange();refresh();notify(typeof message==='function'?message(r):message);return r;}catch(e){notify(e.message);}}
 function gift(){
  const now=farmNow(),today=utcDay(now),claimed=state.login.lastDay===today;
  const continuous=claimed||state.login.lastDay===utcDay(now-DAY_MS);
  const streak=continuous?state.login.streak:0,next=claimed?streak:streak+1,day=(next-1)%7;
  $('daily-gift').innerHTML=`<section class="gift-panel"><div class="gift-heading"><span class="gift-icon"><i data-lucide="gift"></i></span><div><h3>${claimed?'A little gift, just for you':'Good to see you, farmer!'}</h3><p>${streak?`${streak} day${streak===1?'':'s'} in a row · `:''}Best streak: ${state.login.best} day${state.login.best===1?'':'s'}</p></div><span class="streak-pill"><i data-lucide="flame"></i> ${streak}</span></div><div class="streak-days">${DAILY_REWARDS.map((reward,i)=>`<div class="streak-day ${i===day?'current':''} ${i<day||claimed&&i===day?'collected':''}"><small>Day ${i+1}</small><i data-lucide="${i<day||claimed&&i===day?'check':i===6?'gift':'coins'}"></i><strong>${reward} <span>coins</span></strong><span class="streak-diamonds">${art('diamonds')} ${DAILY_DIAMONDS[i]}</span></div>`).join('')}</div><button id="checkin-gift" class="primary-button" ${claimed?'disabled':''}>${claimed?'Gift collected · see you tomorrow!':`Collect day ${day+1} gift · ${DAILY_REWARDS[day]} coins + ${DAILY_DIAMONDS[day]} diamonds`}<i data-lucide="${claimed?'check':'gift'}"></i></button><small class="gift-note">A new seven-day cycle follows day 7. Miss a day? Start again with your farm intact.</small></section>`;
  $('checkin-gift').onclick=()=>act({type:'checkin'},r=>`Welcome back! +${r.coins} coins and +${r.diamonds} diamonds · ${r.streak}-day streak.`);
 }
 function renderToday(){
  if(tab==='orders'&&!featureUnlocked(state,'cart'))tab='challenges';
  const {today}=marketHighlights(farmNow());
  $('today-market').innerHTML=`<button type="button" class="today-market-card" id="today-open-market">${art(today.item)}<span><small>TODAY’S MARKET PICK</small><strong>${ITEMS[today.item].name}</strong><span>${today.price.toLocaleString('en-US')} coins each · ${today.change>=0?'+':''}${today.change}% vs normal</span></span><b>Market →</b></button>`;
  $('today-open-market').onclick=()=>{$('today-dialog').close();$('market-button').click();};
  gift();document.querySelectorAll('[data-today-tab]').forEach(b=>{b.hidden=b.dataset.todayTab==='orders'&&!featureUnlocked(state,'cart');b.classList.toggle('active',b.dataset.todayTab===tab);b.setAttribute('aria-pressed',String(b.dataset.todayTab===tab));});
  const day=utcDay(farmNow());
  if(tab==='challenges'){
   const tasks=dailyTasks(state,farmNow());
   $('today-content').innerHTML=`<p class="section-copy">Three challenges, picked for your farm. Only today’s actions count. New goals arrive at midnight UTC.</p><div class="daily-bonus"><i data-lucide="sparkles"></i><span>Finish all three for <strong>60 bonus coins + 15 XP</strong></span><b>${tasks.filter(q=>q.claimed).length}/3</b></div>`+tasks.map(q=>`<article class="daily-task ${q.claimed?'completed':''}"><div><h3>${q.title}</h3><p>${q.description}</p></div><span class="daily-reward">${q.reward} coins <span class="daily-diamond-reward">${art('diamonds')} ${q.diamonds} diamond${q.diamonds===1?'':'s'}</span></span><progress max="${q.target}" value="${q.progress}" aria-label="${q.title} progress"></progress><div class="task-bottom"><span>${q.progress} / ${q.target} · +10 XP</span><button class="small-button" data-daily="${q.id}" ${q.claimed||q.progress<q.target?'disabled':''}>${q.claimed?'Collected':'Claim reward'}</button></div></article>`).join('');
   document.querySelectorAll('[data-daily]').forEach(b=>b.onclick=()=>act({type:'daily',id:Number(b.dataset.daily),day},r=>`Challenge complete! +${r.coins} coins and +${r.diamonds} diamond${r.diamonds===1?'':'s'}${r.bonus?' including your daily bonus!':'.'}`));
  }else{
   const now=farmNow(),orders=dailyOrders(state,now),coinBoost=state.boosts.coinsUntil>now?2:1,xpBoost=state.boosts.xpUntil>now?2:1;
   const ready=orders.filter(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)).length;
   $('today-content').innerHTML=`<div class="delivery-board-intro"><div><h3>Good goods. Better rewards.</h3><p>Three customers, fresh offers every day. Deliver specific baskets for bonus coins and diamonds.</p></div><span>${ready} ready to deliver</span></div>${orders.some(o=>!o.tier)?'<p class="legacy-order-note">Your existing orders and rewards are kept for today. Quick deliveries, village orders and special commissions arrive at the next daily reset.</p>':''}`+orders.map(o=>{
    const can=Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n),tier=DELIVERY_TIERS[o.tier],value=marketValue(o.input,now),completed=Object.entries(o.input).filter(([k,n])=>state.inventory[k]>=n).length;
    return `<article class="order-card daily-order ${o.tier??'legacy'} ${o.done?'completed':''}"><div class="daily-order-top"><span class="order-tier">${tier?.name??'Delivery order'}</span><span class="order-bonus">${o.tier?`+${o.bonus}% coins vs market`:'Original daily offer'}</span></div><div class="order-heading"><span class="order-icon">${art(o.tier==='commission'?'trophy':'cart')}</span><div><small>${o.customer??'Village trading post'}</small><h3>${o.title}</h3></div></div>${o.story?`<p class="order-story">${o.story}</p>`:''}<div class="order-payout"><span>${art('coins')}<b>${(o.coins*coinBoost).toLocaleString('en-US')}</b><small>coins${coinBoost===2?' · 2×':''}</small></span><span>${art('diamonds')}<b>${o.diamonds}</b><small>diamonds</small></span><span>${art('xp')}<b>${o.xp*xpBoost}</b><small>XP${xpBoost===2?' · 2×':''}</small></span></div><div class="order-supplies"><span>Delivery basket</span><small>${o.done?'Delivered':`${completed} / ${Object.keys(o.input).length} items ready`}</small></div><div class="ingredients">${itemList(o.input,!o.done)}</div><div class="order-comparison">Market sale: ${(value*coinBoost).toLocaleString('en-US')} coins${o.tier?` · Delivery bonus: +${((o.coins-value)*coinBoost).toLocaleString('en-US')} coins`:''}</div><button class="small-button" data-order="${o.id}" data-order-revision="${o.revision}" ${o.done||!can?'disabled':''}>${o.done?'Delivered ✓':can?'Load cart & deliver':'Gather these ingredients'}</button>${!o.done?`<details class="order-replace"><summary>Replace order · ${REPLACE_ORDER_COST} diamonds</summary><p>A different order in the same category and level group. Your goods stay in storage. ${Math.max(0,DAILY_ORDER_REPLACEMENTS-state.daily.replacements)} replacements left today.</p><button type="button" class="small-button diamond-option" data-replace-order="${o.id}" data-order-revision="${o.revision}" ${state.diamonds<REPLACE_ORDER_COST||state.daily.replacements>=DAILY_ORDER_REPLACEMENTS||!replacementOptions(state,o.id,now).length?'disabled':''}>${art('diamonds')} Spend ${REPLACE_ORDER_COST} & replace</button>${!replacementOptions(state,o.id,now).length?'<small>No alternative at this difficulty yet.</small>':''}</details>`:''}</article>`;
   }).join('');
   document.querySelectorAll('[data-replace-order]').forEach(b=>b.onclick=()=>act({type:'replace_order',id:Number(b.dataset.replaceOrder),revision:Number(b.dataset.orderRevision),day,expectedCost:REPLACE_ORDER_COST},r=>`New order: ${r.title}. ${r.remaining} replacements left today.`));
   document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>act({type:'delivery',id:Number(b.dataset.order),day,revision:Number(b.dataset.orderRevision)},r=>`Delivery complete! +${r.coins} coins, +${r.xp} XP and +${r.diamonds} diamond${r.diamonds===1?'':'s'}.`));
  }
  countdown();icons();
 }
 function openToday(selected='challenges'){tab=selected==='orders'&&!featureUnlocked(state,'cart')?'challenges':selected;renderToday();open('today-dialog');}
 function renderUtility(){
  if(utility==='tractor'){
   $('utility-title').textContent='Your trusty tractor';
   lastFieldStatus=fieldStatus();
   const crop=getCrop(),cooldown=Math.max(0,Math.ceil((state.tractorReadyAt-farmNow())/1000));lastTractorReady=cooldown===0;
   const quotes=Object.fromEntries(['plant','water','harvest'].map(mode=>[mode,tractorQuote(state,mode,crop,farmNow())]));
   $('utility-content').innerHTML=`<div class="utility-hero"><i data-lucide="tractor"></i><div><h3>A helping hand in the fields</h3><p>Fuel costs 12 coins per job plus 2 per field. Seeds cost extra. Working by hand is free. The tractor rests for 15 seconds after each job.</p></div></div><div class="tractor-crop">Selected crop: <strong>${CROPS[crop].name}</strong><span>${seedCost(state,crop)} coins per field, plus fuel</span></div><div class="tractor-actions">${[['plant','sprout',`Plant ${CROPS[crop].name}`],['water','droplets','Water growing crops'],['harvest','shopping-basket','Harvest ready crops']].map(([mode,icon,label])=>{const q=quotes[mode];return `<button data-tractor="${mode}" ${cooldown||!q.count||state.coins<q.total?'disabled':''}><i data-lucide="${icon}"></i><span><strong>${label}</strong><small>${q.count} fields · ${q.total} coins${q.seeds?` (${q.fuel} fuel + ${q.seeds} seeds)`:q.count?' fuel':''}</small></span><i data-lucide="chevron-right"></i></button>`;}).join('')}</div><p id="tractor-timer" class="utility-note">${cooldown?`Ready again in ${cooldown}s`:'Your tractor is ready. Choose a job.'}</p>`;
   document.querySelectorAll('[data-tractor]').forEach(b=>b.onclick=()=>act({type:'tractor',mode:b.dataset.tractor,crop:getCrop()},r=>`All done! The tractor worked ${r.count} fields · ${r.cost} coins spent.`));
  }else{
   const level=state.siloLevel,cost=SILO_COSTS[level],bonus=siloBonus(level),nextBonus=siloBonus(level+1);$('utility-title').textContent='Silo research';
   $('utility-content').innerHTML=`<div class="utility-hero"><i data-lucide="warehouse"></i><div><h3>Better seeds. Bigger possibilities.</h3><p>Research applies to every crop you plant afterwards. Existing crops keep their current growing time.</p></div></div><div class="research-stats"><div><strong>${Math.round(bonus.seeds*100)}%</strong><span>seed discount</span></div><div><strong>${Math.round(bonus.growth*100)}%</strong><span>shorter growing time</span></div><div><strong>${level}/5</strong><span>research completed</span></div></div><div class="research-next"><h3>${level===5?'A well-stocked future':`Research level ${level+1}`}</h3><p>${level===5?'Your silo is fully researched. Enjoy your savings with every new planting.':`Seeds cost ${Math.round(nextBonus.seeds*100)}% less, rounded up to whole coins. Growing time is ${Math.round(nextBonus.growth*100)}% shorter.`}</p><button id="research-silo" class="primary-button" ${level===5||state.coins<cost?'disabled':''}>${level===5?'Research complete':`Research · ${cost} coins`}<i data-lucide="${level===5?'check':'sparkles'}"></i></button></div>`;
   $('research-silo').onclick=()=>act({type:'silo_upgrade'},r=>`Silo research level ${r.level} complete. Your next planting gets the benefit!`);
  }icons();
 }
 function openUtility(key){if(!featureUnlocked(state,key)){notify(featureUnlockHint(key));return;}if(key==='cart'){openToday('orders');return;}utility=key;renderUtility();open('utility-dialog');}
 function renderJournal(){
  const {level,current,target}=levelProgress(state),reward=levelReward(level+1);
  $('journal-content').innerHTML=`<div class="journal-level"><span class="journal-medallion"><small>LVL</small><b>${level}</b></span><div><h3>One harvest at a time</h3><p>${current} / ${target} XP to level ${level+1}</p><progress max="${target}" value="${current}" aria-label="Level progress"></progress></div></div><div class="level-reward"><strong>Next level: ${reward.coins} coins + ${reward.diamonds} diamonds</strong><p>Level-up rewards are added automatically.</p></div><div class="journal-stats"><div><strong>${state.stats.harvested}</strong><span>crops harvested</span></div><div><strong>${state.claimed.length}/${QUESTS.length}</strong><span>quests complete</span></div><div><strong>${state.stats.deliveries}</strong><span>happy neighbours</span></div></div><div class="recipe-section-heading"><h3>Your crop collection</h3><span>${state.discovered.length} / ${Object.keys(CROPS).length} discovered</span></div><p class="section-copy">Harvest each variety to add it to your journal.</p><div class="collection-grid">${Object.entries(CROPS).map(([key,c])=>`<div class="collection-crop ${state.discovered.includes(key)?'discovered':''}">${art(key,'collection-picture')}<strong>${c.name}</strong><small>${state.discovered.includes(key)?`${state.stats['harvest_'+key]??0} harvested`:'Not harvested yet'}</small></div>`).join('')}</div>`;
  $('journal-content').insertAdjacentHTML('beforeend',roadmapMarkup(state));
  icons();
 }
 function refresh(){
  const tasks=dailyTasks(state,farmNow());$('today-dot').hidden=state.login.lastDay===utcDay(farmNow())&&!tasks.some(q=>!q.claimed&&q.progress>=q.target)&&!dailyOrders(state,farmNow()).some(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n));
  $('journal-button').classList.remove('has-reward');
  if($('today-dialog').open)renderToday();if($('utility-dialog').open)renderUtility();if($('journal-dialog').open)renderJournal();
 }
 function countdown(){const ms=DAY_MS-farmNow()%DAY_MS,h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60;$('daily-countdown').textContent=`Resets in ${h}h ${m}m`;}
 function fieldStatus(){return state.plots.map(p=>!p.crop?'empty':p.readyAt<=farmNow()?'ready':p.watered?'watered':'growing').join(',');}
 function tick(){
  const coinBoost=state.boosts.coinsUntil>farmNow();if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('today-dialog').open)renderToday();}
  const xpBoost=state.boosts.xpUntil>farmNow();if(lastXPBoost!==xpBoost){lastXPBoost=xpBoost;if($('today-dialog').open)renderToday();}
  const day=utcDay(farmNow());if(day!==lastDay){lastDay=day;refresh();}countdown();
  if($('utility-dialog').open&&utility==='tractor'){const s=Math.max(0,Math.ceil((state.tractorReadyAt-farmNow())/1000));if(lastTractorReady!==(s===0)||lastFieldStatus!==fieldStatus())renderUtility();else if($('tractor-timer'))$('tractor-timer').textContent=s?`Ready again in ${s}s`:'Your tractor is ready. Choose a job.';}
 }
 $('today-button').onclick=()=>openToday();$('journal-button').onclick=()=>{renderJournal();open('journal-dialog');};
 document.querySelectorAll('[data-today-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.todayTab;renderToday();});
 document.querySelectorAll('[data-utility]').forEach(b=>b.onclick=()=>openUtility(b.dataset.utility));
 return {refresh,tick,openToday,openUtility};
}
