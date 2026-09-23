import {roadmapMarkup} from './progression-ui.js';
import {questArt} from './quests-ui.js';
import {dailyRewardMultiplier,marketSaleValue,vipActive,replacementOptions,REPLACE_ORDER_COST,DAILY_ORDER_REPLACEMENTS,levelReward,featureUnlocked,featureUnlockHint,CROPS,ITEMS,QUESTS,DAILY_REWARDS,DAILY_DIAMONDS,DAY_MS,utcDay,dailyTasks,dailyOrders,levelOf,seedCost,levelProgress,SILO_COSTS,siloBonus,tractorQuote,marketHighlights,marketValue,DELIVERY_TIERS,ACTIVE_STATIONS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
export function createRetentionUI({state,runAction,onChange,notify,getCrop,itemList}){
 let tab='challenges',journalTab='crops',utility='tractor',lastDay=utcDay(farmNow()),lastTractorReady=true,lastFieldStatus='',lastCoinBoost=false,lastXPBoost=false;
 const open=id=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();};
 // Rewards as the same little chips everywhere: coins, diamonds, XP.
 // In the order given, so a screen can lead with what matters most there (the streak leads with diamonds).
 const CHIPS={coins:n=>`<b>${art('coins')}${n.toLocaleString('en-US')}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${n}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${n} XP</b>`};
 const rewardChips=rewards=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}</span>`;
 async function act(action,message){try{const r=await runAction(action);onChange();refresh();notify(typeof message==='function'?message(r):message);return r;}catch(e){notify(e.message);}}
 function gift(){
  const now=farmNow(),today=utcDay(now),claimed=state.login.lastDay===today;
  const continuous=claimed||state.login.lastDay===utcDay(now-DAY_MS);
  const streak=continuous?state.login.streak:0,next=claimed?streak:streak+1,day=(next-1)%7;
  const multiplier=dailyRewardMultiplier(state,now),coins=DAILY_REWARDS[day]*multiplier,diamonds=DAILY_DIAMONDS[day]*multiplier;
  // A streak line, seven small days that always fit (showing the diamonds, the reward that matters), and today's gift
  // as chips next to one Collect button.
  const days=DAILY_DIAMONDS.map((_,i)=>{const got=i<day||claimed&&i===day;return `<li class="streak-day ${i===day&&!claimed?'current':''} ${got?'collected':''}"><small>Day ${i+1}</small>${got?'<i data-lucide="check"></i>':art(i===6?'gift':'diamonds')}<b>${DAILY_DIAMONDS[i]*multiplier}</b></li>`;}).join('');
  $('daily-gift').innerHTML=`<section class="gift-panel streak-panel ${claimed?'is-claimed':''}"><div class="streak-head">${art('streak','streak-flame')}<div><h3>${streak?`${streak}-day streak`:'Start a streak'}</h3><p>Best ${state.login.best} day${state.login.best===1?'':'s'}${vipActive(state,now)?' · VIP doubles your gifts':''}</p></div><b class="streak-count">${streak}</b></div><ol class="streak-days">${days}</ol><div class="streak-claim"><span><strong>${claimed?'Collected today':`Day ${day+1} gift`}</strong>${rewardChips({diamonds,coins})}</span>${claimed?'<span class="streak-done"><i data-lucide="check"></i>Back tomorrow</span>':'<button id="checkin-gift" class="primary-button">Collect</button>'}</div><small class="gift-note">Miss a day and the streak starts over.</small></section>`;
  if($('checkin-gift'))$('checkin-gift').onclick=()=>act({type:'checkin'},r=>`Welcome back! +${r.diamonds} diamonds and +${r.coins} coins · ${r.streak}-day streak.`);
 }
 function renderToday(){
  if(tab==='orders'&&!featureUnlocked(state,'cart'))tab='challenges';
  const challengesOpen=featureUnlocked(state,'challenges');
  const {today}=marketHighlights(farmNow(),state);
  $('today-market').innerHTML=`<button type="button" class="today-market-card" id="today-open-market">${art(today.item)}<span><small>TODAY’S MARKET PICK</small><strong>${ITEMS[today.item].name}</strong><span>${today.price.toLocaleString('en-US')} coins each · ${today.change>=0?'+':''}${today.change}% vs normal</span></span><b>Market →</b></button>`;
  $('today-open-market').onclick=()=>{$('today-dialog').close();$('market-button').click();};
  gift();document.querySelectorAll('[data-today-tab]').forEach(b=>{b.hidden=b.dataset.todayTab==='orders'?!featureUnlocked(state,'cart'):!challengesOpen;b.classList.toggle('active',b.dataset.todayTab===tab);b.setAttribute('aria-pressed',String(b.dataset.todayTab===tab));});
  const day=utcDay(farmNow());
  if(tab==='challenges'&&!challengesOpen){
   $('today-content').innerHTML=`<p class="section-copy">Your daily gift is ready from the start. ${featureUnlockHint('challenges')}</p>`;
  }else if(tab==='challenges'){
   const tasks=dailyTasks(state,farmNow()),xpBoost=state.boosts.xpUntil>farmNow()?2:1,multiplier=dailyRewardMultiplier(state,farmNow()),done=tasks.filter(q=>q.claimed).length;
   // Same cards as the quest list: picture, goal, a bar with the count and the reward as chips; Claim only when done.
   $('today-content').innerHTML=`<div class="daily-bonus-card ${done===3?'is-done':''}"><span class="daily-bonus-art">${art('gift')}</span><span><strong>${done===3?'Daily bonus collected':'Finish all three for a bonus'}</strong>${rewardChips({coins:60*multiplier,xp:15*multiplier*xpBoost})}</span><b>${done}/3</b></div><div class="daily-list">`+tasks.map(q=>{const ready=!q.claimed&&q.progress>=q.target;return `<article class="daily-task daily-card ${q.claimed?'completed':ready?'is-ready':''}"><span class="quest-art">${questArt(q.stat)}</span><div class="quest-body"><h3>${q.title}</h3><p>${q.description}</p>${q.claimed?'':`<div class="quest-meter"><progress max="${q.target}" value="${q.progress}" aria-label="${q.title} progress"></progress><span>${q.progress} / ${q.target}</span></div>`}<div class="task-bottom">${rewardChips({coins:q.reward,diamonds:q.diamonds,xp:q.xp*xpBoost})}${q.claimed?'<span class="quest-state">Collected ✓</span>':ready?`<button class="primary-button" data-daily="${q.id}">Claim</button>`:''}</div></div></article>`;}).join('')+'</div>';
   document.querySelectorAll('[data-daily]').forEach(b=>b.onclick=()=>act({type:'daily',id:Number(b.dataset.daily),day},r=>`Challenge complete! +${r.coins} coins and +${r.diamonds} diamond${r.diamonds===1?'':'s'}${r.bonus?' including your daily bonus!':'.'}`));
  }else{
   const now=farmNow(),orders=dailyOrders(state,now),coinBoost=state.boosts.coinsUntil>now?2:1,xpBoost=state.boosts.xpUntil>now?2:1;
   const ready=orders.filter(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)).length;
   $('today-content').innerHTML=`<p class="delivery-summary"><b>${orders.filter(o=>!o.done).length}</b> open ${orders.filter(o=>!o.done).length===1?'order':'orders'}${ready?` · <span>${ready} ready to deliver</span>`:''}</p>${orders.some(o=>!o.tier)?'<p class="legacy-order-note">Your existing orders and rewards are kept for today. Quick deliveries, village orders and special commissions arrive at the next daily reset.</p>':''}<div class="daily-list">`+orders.map(o=>{
    const can=Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n),tier=DELIVERY_TIERS[o.tier],options=o.done?[]:replacementOptions(state,o.id,now);
    // One card per order: who and what, the goods (missing ones marked), the reward as chips and Deliver.
    return `<article class="order-card daily-order ${o.tier??'legacy'} ${o.done?'completed':can?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(o.tier==='commission'?'trophy':'cart')}</span><div><small>${tier?.name??'Delivery order'}${o.tier?` · <b title="Compared with selling these goods at the market">+${o.bonus}% vs market</b>`:''}</small><h3>${o.title}</h3></div></div><div class="ingredients">${itemList(o.input,!o.done)}</div><div class="task-bottom">${rewardChips({coins:o.coins*coinBoost,diamonds:o.diamonds,xp:o.xp*xpBoost})}${o.done?'<span class="quest-state">Delivered ✓</span>':`<button class="primary-button" data-order="${o.id}" data-order-revision="${o.revision}" ${can?'':'disabled'}>Deliver</button>`}</div>${!o.done?`<details class="order-replace"><summary>Replace this order · ${art('diamonds')} ${REPLACE_ORDER_COST}</summary><p>A different order in the same category. Your goods stay in storage. ${Math.max(0,DAILY_ORDER_REPLACEMENTS-state.daily.replacements)} left today.</p><button type="button" class="small-button diamond-option" data-replace-order="${o.id}" data-order-revision="${o.revision}" ${state.diamonds<REPLACE_ORDER_COST||state.daily.replacements>=DAILY_ORDER_REPLACEMENTS||!options.length?'disabled':''}>${art('diamonds')} Spend ${REPLACE_ORDER_COST} & replace</button>${!options.length?'<small>No alternative at this difficulty yet.</small>':''}</details>`:''}</article>`;
   }).join('')+'</div>';
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
   // A status pill instead of a note, the crop you plant as a tappable chip, and each job as one card with its fields
   // and price; the fuel rule is one small line at the bottom.
   const empty={plant:state.plots.some(p=>!p.crop)?'Not enough coins':'No empty fields',water:'Nothing to water right now',harvest:'Nothing ready yet'};
   $('utility-content').innerHTML=`<div class="tractor-top"><span class="tractor-art">${art('tractor')}</span><div><strong>Works many fields at once</strong><span>By hand is always free.</span></div><span id="tractor-timer" class="tractor-state ${cooldown?'is-resting':''}">${cooldown?`Resting · ${cooldown}s`:'Ready'}</span></div><button type="button" class="tractor-seed" data-tractor-crop>${art(crop)}<span><small>Planting</small><strong>${CROPS[crop].name}</strong></span><em>${art('coins')}${seedCost(state,crop)} per field</em><i data-lucide="chevron-right" data-line-icon></i></button><div class="tractor-jobs">${[['plant','seeds',`Plant ${CROPS[crop].name}`],['water','water','Water growing crops'],['harvest','harvest','Harvest ready crops']].map(([mode,icon,label])=>{const q=quotes[mode];return `<button class="tractor-job" data-tractor="${mode}" ${cooldown||!q.count||state.coins<q.total?'disabled':''}><span class="tractor-job-art">${art(icon)}</span><span class="tractor-job-copy"><strong>${label}</strong><small>${q.count?`${q.count} ${q.count===1?'field':'fields'}${q.seeds?` · ${q.fuel} fuel + ${q.seeds} seeds`:''}`:empty[mode]}</small></span>${q.count?`<span class="tractor-job-cost">${art('coins')}${q.total}</span>`:''}</button>`;}).join('')}</div><p class="tractor-foot">Fuel: 12 coins a job + 2 per field. The tractor rests 15 seconds after each job.</p>`;
   document.querySelector('[data-tractor-crop]').onclick=()=>{$('utility-dialog').close();$('selected-crop-button')?.click();};
   document.querySelectorAll('[data-tractor]').forEach(b=>b.onclick=()=>act({type:'tractor',mode:b.dataset.tractor,crop:getCrop()},r=>`All done! The tractor worked ${r.count} fields · ${r.cost} coins spent.`));
  }else{
   const level=state.siloLevel,cost=SILO_COSTS[level],bonus=siloBonus(level),nextBonus=siloBonus(level+1);$('utility-title').textContent='Silo research';
   // What research does in one line, what you have now in two tiles, and the next level (of 5) as gains + price.
   const pct=n=>`${Math.round(n*100)}%`,gain=(a,b)=>Math.round((b-a)*100);
   $('utility-content').innerHTML=`<p class="silo-lead">${art('silo')}<span>Cheaper seeds and quicker crops for everything you plant from now on.</span></p><div class="silo-now"><div>${art('seeds')}<p><strong>${bonus.seeds?'−':''}${pct(bonus.seeds)}</strong><span>seed price</span></p></div><div>${art('hourglass')}<p><strong>${bonus.growth?'−':''}${pct(bonus.growth)}</strong><span>growing time</span></p></div></div><section class="research-next silo-next ${level===5?'is-complete':''}"><div><h3>${level===5?'All research done':`Level ${level+1} <small>of 5</small>`}</h3>${level===5?'<p>Every crop you plant gets the full bonus.</p>':`<span class="reward-chips"><b class="is-gain">−${gain(bonus.seeds,nextBonus.seeds)}% seed price</b><b class="is-gain">−${gain(bonus.growth,nextBonus.growth)}% growing time</b><b class="is-xp">${art('xp')}20 XP</b></span>`}</div><button id="research-silo" class="primary-button" ${level===5||state.coins<cost?'disabled':''}>${level===5?'Research complete<i data-lucide="check"></i>':`<span>Research</span><span class="button-price">${art('coins')}${cost.toLocaleString('en-US')} coins</span>`}</button></section><p class="silo-note">Crops already growing keep their time.</p>`;
   $('research-silo').onclick=()=>act({type:'silo_upgrade'},r=>`Silo research level ${r.level} complete. Your next planting gets the benefit!`);
  }icons();
 }
 function openUtility(key){if(!featureUnlocked(state,key)){notify(featureUnlockHint(key));return;}if(key==='cart'){openToday('orders');return;}utility=key;renderUtility();open('utility-dialog');}
 function renderJournal(){
  const {level,current,target}=levelProgress(state),reward=levelReward(level+1),stats=state.stats,number=n=>Number(n).toLocaleString('en-US');
  // Lifetime totals the same way the leaderboards count them: every crop picked and every good collected.
  const total=prefix=>Object.entries(stats).reduce((n,[k,v])=>k.startsWith(prefix)&&Number.isFinite(v)?n+v:n,0);
  const crops=Math.max(stats.harvested??0,total('harvest_')),goods=Math.max(stats.produced??0,total('made_'));
  const tile=(icon,value,label)=>`<div>${art(icon)}<p><strong>${value}</strong><span>${label}</span></p></div>`;
  const cropKeys=Object.keys(CROPS),goodKeys=Object.keys(ITEMS).filter(k=>!CROPS[k]);
  // Honey also comes from the Apiary (a few jars per finished job), not only from the Factory.
  const apiaryHoney=(stats.activity_apiary??state.activities?.completed?.apiary??0)*(ACTIVE_STATIONS.apiary.itemCount??0);
  const count=key=>CROPS[key]?stats['harvest_'+key]??0:(stats['made_'+key]??0)+(key==='honey'?apiaryHoney:0);
  const found=keys=>keys.filter(k=>CROPS[k]?state.discovered.includes(k):count(k)>0).length;
  const keys=journalTab==='goods'?goodKeys:cropKeys,verb=journalTab==='goods'?'made':'picked';
  const card=key=>{const n=count(key),seen=CROPS[key]?state.discovered.includes(key):n>0;return `<div class="collection-crop ${seen?'discovered':''}">${art(key,'collection-picture')}<strong>${ITEMS[key].name}</strong><small>${seen?`${number(n)} ${verb}`:'Not yet'}</small></div>`;};
  const tabButton=(key,label,list)=>`<button type="button" data-journal-tab="${key}" aria-pressed="${journalTab===key}" class="${journalTab===key?'active':''}">${label} <b>${found(list)}/${list.length}</b></button>`;
  $('journal-content').innerHTML=`<section class="journal-hero"><span class="journal-medallion"><small>LVL</small><b>${level}</b></span><div class="journal-hero-copy"><div class="journal-hero-top"><strong>Level ${level+1} in ${number(Math.max(0,target-current))} XP</strong><small>${number(current)} / ${number(target)} XP</small></div><progress max="${target}" value="${current}" aria-label="Level progress"></progress><div class="journal-next"><span>Level-up reward</span><b>${art('coins')}${number(reward.coins)}</b><b>${art('diamonds')}${reward.diamonds}</b></div></div></section>`
   +`<div class="journal-tiles">${tile('harvest',number(crops),'crops harvested')}${tile('buildings',number(goods),'goods made')}${tile('quests',`${state.claimed.length}/${QUESTS.length}`,'quests done')}${tile('cart',number(stats.deliveries??0),'deliveries')}</div>`
   +`<section class="journal-collection"><div class="journal-collection-head"><h3>Your collection</h3><div class="market-tabs journal-tabs" role="group" aria-label="Collection">${tabButton('crops','Crops',cropKeys)}${tabButton('goods','Goods',goodKeys)}</div></div><div class="collection-grid">${keys.map(card).join('')}</div></section>`
   +roadmapMarkup(state);
  document.querySelectorAll('[data-journal-tab]').forEach(b=>b.onclick=()=>{journalTab=b.dataset.journalTab;renderJournal();});
  icons();
 }
 function refresh(){
  const tasks=dailyTasks(state,farmNow());$('today-dot').hidden=state.login.lastDay===utcDay(farmNow())&&(!featureUnlocked(state,'challenges')||!tasks.some(q=>!q.claimed&&q.progress>=q.target))&&(!featureUnlocked(state,'cart')||!dailyOrders(state,farmNow()).some(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)));
  $('journal-button').classList.remove('has-reward');
  if($('today-dialog').open)renderToday();if($('utility-dialog').open)renderUtility();if($('journal-dialog').open)renderJournal();
 }
 function countdown(){const ms=DAY_MS-farmNow()%DAY_MS,h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60;$('daily-countdown').textContent=`Resets in ${h}h ${m}m`;}
 function fieldStatus(){return state.plots.map(p=>!p.crop?'empty':p.readyAt<=farmNow()?'ready':p.watered?'watered':'growing').join(',');}
 function tick(){
  const coinBoost=`${state.boosts.coinsUntil>farmNow()}:${vipActive(state,farmNow())}`;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('today-dialog').open)renderToday();}
  const xpBoost=state.boosts.xpUntil>farmNow();if(lastXPBoost!==xpBoost){lastXPBoost=xpBoost;if($('today-dialog').open)renderToday();}
  const day=utcDay(farmNow());if(day!==lastDay){lastDay=day;refresh();}countdown();
  if($('utility-dialog').open&&utility==='tractor'){const s=Math.max(0,Math.ceil((state.tractorReadyAt-farmNow())/1000));if(lastTractorReady!==(s===0)||lastFieldStatus!==fieldStatus())renderUtility();else if($('tractor-timer'))$('tractor-timer').textContent=s?`Resting · ${s}s`:'Ready';}
 }
 $('today-button').onclick=()=>openToday();$('journal-button').onclick=()=>{renderJournal();open('journal-dialog');};
 document.querySelectorAll('[data-today-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.todayTab;renderToday();});
 document.querySelectorAll('[data-utility]').forEach(b=>b.onclick=()=>openUtility(b.dataset.utility));
 return {refresh,tick,openToday,openUtility};
}
