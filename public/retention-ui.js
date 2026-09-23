import {roadmapMarkup} from './progression-ui.js';
import {dailyRewardMultiplier,marketSaleValue,vipActive,replacementOptions,REPLACE_ORDER_COST,DAILY_ORDER_REPLACEMENTS,levelReward,featureUnlocked,featureUnlockHint,CROPS,ITEMS,QUESTS,DAILY_REWARDS,DAILY_DIAMONDS,DAY_MS,utcDay,dailyTasks,dailyOrders,levelOf,seedCost,levelProgress,SILO_COSTS,siloBonus,tractorQuote,marketHighlights,marketValue,DELIVERY_TIERS,ACTIVE_STATIONS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
export function createRetentionUI({state,runAction,onChange,notify,getCrop,itemList}){
 let tab='challenges',journalTab='crops',utility='tractor',lastDay=utcDay(farmNow()),lastTractorReady=true,lastFieldStatus='',lastCoinBoost=false,lastXPBoost=false;
 const open=id=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();};
 async function act(action,message){try{const r=await runAction(action);onChange();refresh();notify(typeof message==='function'?message(r):message);return r;}catch(e){notify(e.message);}}
 function gift(){
  const now=farmNow(),today=utcDay(now),claimed=state.login.lastDay===today;
  const continuous=claimed||state.login.lastDay===utcDay(now-DAY_MS);
  const streak=continuous?state.login.streak:0,next=claimed?streak:streak+1,day=(next-1)%7;
  $('daily-gift').innerHTML=`<section class="gift-panel"><div class="gift-heading"><span class="gift-icon"><i data-lucide="gift"></i></span><div><h3>${claimed?'A little gift, just for you':'Good to see you, farmer!'}</h3><p>${streak?`${streak} day${streak===1?'':'s'} in a row · `:''}Best streak: ${state.login.best} day${state.login.best===1?'':'s'}</p></div><span class="streak-pill"><i data-lucide="flame"></i> ${streak}</span></div><div class="streak-days">${DAILY_REWARDS.map((reward,i)=>`<div class="streak-day ${i===day?'current':''} ${i<day||claimed&&i===day?'collected':''}"><small>Day ${i+1}</small><i data-lucide="${i<day||claimed&&i===day?'check':i===6?'gift':'coins'}"></i><strong>${reward*dailyRewardMultiplier(state,now)} <span>coins</span></strong><span class="streak-diamonds">${art('diamonds')} ${DAILY_DIAMONDS[i]*dailyRewardMultiplier(state,now)}</span></div>`).join('')}</div><button id="checkin-gift" class="primary-button" ${claimed?'disabled':''}>${claimed?'Gift collected · see you tomorrow!':`Collect day ${day+1} gift · ${DAILY_REWARDS[day]*dailyRewardMultiplier(state,now)} coins + ${DAILY_DIAMONDS[day]*dailyRewardMultiplier(state,now)} diamonds`}<i data-lucide="${claimed?'check':'gift'}"></i></button><small class="gift-note">${vipActive(state,now)?'VIP: doubled daily gifts while active. ':''}Miss a day and the streak starts over.</small></section>`;
  $('checkin-gift').onclick=()=>act({type:'checkin'},r=>`Welcome back! +${r.coins} coins and +${r.diamonds} diamonds · ${r.streak}-day streak.`);
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
   const tasks=dailyTasks(state,farmNow());
   $('today-content').innerHTML=`<p class="section-copy">Three goals for today. New ones at midnight UTC.</p><div class="daily-bonus"><i data-lucide="sparkles"></i><span>Finish all three for <strong>${60*dailyRewardMultiplier(state,farmNow())} bonus coins + ${15*dailyRewardMultiplier(state,farmNow())*(state.boosts.xpUntil>farmNow()?2:1)} XP</strong></span><b>${tasks.filter(q=>q.claimed).length}/3</b></div>`+tasks.map(q=>`<article class="daily-task ${q.claimed?'completed':''}"><div><h3>${q.title}</h3><p>${q.description}</p></div><span class="daily-reward">${q.reward} coins <span class="daily-diamond-reward">${art('diamonds')} ${q.diamonds} diamond${q.diamonds===1?'':'s'}</span></span><progress max="${q.target}" value="${q.progress}" aria-label="${q.title} progress"></progress><div class="task-bottom"><span>${q.progress} / ${q.target} · +${q.xp*(state.boosts.xpUntil>farmNow()?2:1)} XP</span><button class="small-button" data-daily="${q.id}" ${q.claimed||q.progress<q.target?'disabled':''}>${q.claimed?'Collected':'Claim reward'}</button></div></article>`).join('');
   document.querySelectorAll('[data-daily]').forEach(b=>b.onclick=()=>act({type:'daily',id:Number(b.dataset.daily),day},r=>`Challenge complete! +${r.coins} coins and +${r.diamonds} diamond${r.diamonds===1?'':'s'}${r.bonus?' including your daily bonus!':'.'}`));
  }else{
   const now=farmNow(),orders=dailyOrders(state,now),coinBoost=state.boosts.coinsUntil>now?2:1,xpBoost=state.boosts.xpUntil>now?2:1;
   const ready=orders.filter(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)).length;
   $('today-content').innerHTML=`<div class="delivery-board-intro"><div><h3>Good goods. Better rewards.</h3><p>${orders.length} ${orders.length===1?'customer':'customers'}, fresh offers every day. Deliver your goods for bonus coins and diamonds. More orders open as your production grows.</p></div><span>${ready} ready to deliver</span></div>${orders.some(o=>!o.tier)?'<p class="legacy-order-note">Your existing orders and rewards are kept for today. Quick deliveries, village orders and special commissions arrive at the next daily reset.</p>':''}`+orders.map(o=>{
    const can=Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n),tier=DELIVERY_TIERS[o.tier],value=marketValue(o.input,now),completed=Object.entries(o.input).filter(([k,n])=>state.inventory[k]>=n).length;
    return `<article class="order-card daily-order ${o.tier??'legacy'} ${o.done?'completed':''}"><div class="daily-order-top"><span class="order-tier">${tier?.name??'Delivery order'}</span><span class="order-bonus">${o.tier?`+${o.bonus}% coins vs market`:'Original daily offer'}</span></div><div class="order-heading"><span class="order-icon">${art(o.tier==='commission'?'trophy':'cart')}</span><div><small>${o.customer??'Village trading post'}</small><h3>${o.title}</h3></div></div>${o.story?`<p class="order-story">${o.story}</p>`:''}<div class="order-payout"><span>${art('coins')}<b>${(o.coins*coinBoost).toLocaleString('en-US')}</b><small>coins${coinBoost===2?' · 2×':''}</small></span><span>${art('diamonds')}<b>${o.diamonds}</b><small>diamonds</small></span><span>${art('xp')}<b>${o.xp*xpBoost}</b><small>XP${xpBoost===2?' · 2×':''}</small></span></div><div class="order-supplies"><span>Delivery basket</span><small>${o.done?'Delivered':`${completed} / ${Object.keys(o.input).length} items ready`}</small></div><div class="ingredients">${itemList(o.input,!o.done)}</div><div class="order-comparison">Market sale: ${marketSaleValue(state,value,now).toLocaleString('en-US')} coins${o.tier?` · Delivery bonus: +${(o.coins*coinBoost-marketSaleValue(state,value,now)).toLocaleString('en-US')} coins`:''}</div><button class="small-button" data-order="${o.id}" data-order-revision="${o.revision}" ${o.done||!can?'disabled':''}>${o.done?'Delivered ✓':can?'Load cart & deliver':'Gather these ingredients'}</button>${!o.done?`<details class="order-replace"><summary>Replace order · ${REPLACE_ORDER_COST} diamonds</summary><p>A different order in the same category and level group. Your goods stay in storage. ${Math.max(0,DAILY_ORDER_REPLACEMENTS-state.daily.replacements)} replacements left today.</p><button type="button" class="small-button diamond-option" data-replace-order="${o.id}" data-order-revision="${o.revision}" ${state.diamonds<REPLACE_ORDER_COST||state.daily.replacements>=DAILY_ORDER_REPLACEMENTS||!replacementOptions(state,o.id,now).length?'disabled':''}>${art('diamonds')} Spend ${REPLACE_ORDER_COST} & replace</button>${!replacementOptions(state,o.id,now).length?'<small>No alternative at this difficulty yet.</small>':''}</details>`:''}</article>`;
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
   // A status pill instead of a note, the crop you plant as a tappable chip, and each job as one card with its fields
   // and price; the fuel rule is one small line at the bottom.
   const empty={plant:state.plots.some(p=>!p.crop)?'Not enough coins':'No empty fields',water:'Nothing to water right now',harvest:'Nothing ready yet'};
   $('utility-content').innerHTML=`<div class="tractor-top"><span class="tractor-art">${art('tractor')}</span><div><strong>Works many fields at once</strong><span>By hand is always free.</span></div><span id="tractor-timer" class="tractor-state ${cooldown?'is-resting':''}">${cooldown?`Resting · ${cooldown}s`:'Ready'}</span></div><button type="button" class="tractor-seed" data-tractor-crop>${art(crop)}<span><small>Planting</small><strong>${CROPS[crop].name}</strong></span><em>${art('coins')}${seedCost(state,crop)} per field</em><i data-lucide="chevron-right" data-line-icon></i></button><div class="tractor-jobs">${[['plant','seeds',`Plant ${CROPS[crop].name}`],['water','water','Water growing crops'],['harvest','harvest','Harvest ready crops']].map(([mode,icon,label])=>{const q=quotes[mode];return `<button class="tractor-job" data-tractor="${mode}" ${cooldown||!q.count||state.coins<q.total?'disabled':''}><span class="tractor-job-art">${art(icon)}</span><span class="tractor-job-copy"><strong>${label}</strong><small>${q.count?`${q.count} ${q.count===1?'field':'fields'}${q.seeds?` · ${q.fuel} fuel + ${q.seeds} seeds`:''}`:empty[mode]}</small></span>${q.count?`<span class="tractor-job-cost">${art('coins')}${q.total}</span>`:''}</button>`;}).join('')}</div><p class="tractor-foot">Fuel: 12 coins a job + 2 per field. The tractor rests 15 seconds after each job.</p>`;
   document.querySelector('[data-tractor-crop]').onclick=()=>{$('utility-dialog').close();$('selected-crop-button')?.click();};
   document.querySelectorAll('[data-tractor]').forEach(b=>b.onclick=()=>act({type:'tractor',mode:b.dataset.tractor,crop:getCrop()},r=>`All done! The tractor worked ${r.count} fields · ${r.cost} coins spent.`));
  }else{
   const level=state.siloLevel,cost=SILO_COSTS[level],bonus=siloBonus(level),nextBonus=siloBonus(level+1);$('utility-title').textContent='Silo research';
   $('utility-content').innerHTML=`<div class="utility-hero"><i data-lucide="warehouse"></i><div><h3>Better seeds. Bigger possibilities.</h3><p>Research applies to every crop you plant afterwards. Existing crops keep their current growing time.</p></div></div><div class="research-stats"><div><strong>${Math.round(bonus.seeds*100)}%</strong><span>seed discount</span></div><div><strong>${Math.round(bonus.growth*100)}%</strong><span>shorter growing time</span></div><div><strong>${level}/5</strong><span>research completed</span></div></div><div class="research-next"><h3>${level===5?'A well-stocked future':`Research level ${level+1}`}</h3><p>${level===5?'Your silo is fully researched. Enjoy your savings with every new planting.':`Seeds cost ${Math.round(nextBonus.seeds*100)}% less, rounded up to whole coins. Growing time is ${Math.round(nextBonus.growth*100)}% shorter.`}</p><button id="research-silo" class="primary-button" ${level===5||state.coins<cost?'disabled':''}>${level===5?'Research complete<i data-lucide="check"></i>':`<span>Research</span><span class="button-price">${art('coins')}${cost.toLocaleString('en-US')} coins</span>`}</button></div>`;
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
