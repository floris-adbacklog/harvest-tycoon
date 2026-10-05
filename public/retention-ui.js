import {roadmapMarkup} from './progression-ui.js';
import {questArt} from './quests-ui.js';
import {streakToday,comebackChest,COMEBACK_MIN_DAYS,COMEBACK_EVERY_DAYS,worldTwoItem,worldTwoOpen,dailyGift,saveReady,BOOSTS,DAILY_BONUS,dailyRewardMultiplier,marketSaleValue,vipActive,replacementOptions,REPLACE_ORDER_COST,DAILY_ORDER_REPLACEMENTS,levelReward,featureUnlocked,featureUnlockHint,CROPS,ITEMS,QUESTS,DAILY_REWARDS,DAILY_DIAMONDS,DAY_MS,utcDay,dailyTasks,dailyOrders,levelOf,seedCost,levelProgress,SILO_COSTS,siloBonus,tractorQuote,TRACTOR_FUEL_BASE,TRACTOR_FUEL_PER_FIELD,fullCareQuote,nightShiftQuote,shiftHarvests,settleShift,SHIFT_COINS_PER_DIAMOND,SHIFT_ROUNDS,SHIFT_ROUND_MS,canWater,waterUntil,formatDuration,marketValue,DELIVERY_TIERS,ACTIVE_STATIONS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {confirmDiamondSpend} from './diamond-confirm.js';
import {lanternChip} from './pass-ui.js';
import {APP_PUSH_BLOCKED} from './android.js';
const $=id=>document.getElementById(id);
const icons=refreshArt;
export function createRetentionUI({state,runAction,onChange,notify,getCrop,itemList,celebrate=()=>{}}){
 let tab='challenges',journalTab='crops',utility='tractor',lastDay=utcDay(farmNow()),lastFieldStatus='',lastCoinBoost=false,lastXPBoost=false;
 const open=id=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());$(id).showModal();icons();};
 // Rewards as the same little chips everywhere: coins, diamonds, XP.
 // In the order given, so a screen can lead with what matters most there (the streak leads with diamonds).
 const CHIPS={coins:n=>`<b>${art('coins')}${n.toLocaleString('en-US')}</b>`,diamonds:n=>`<b class="is-diamonds">${art('diamonds')}${n}</b>`,xp:n=>`<b class="is-xp">${art('xp')}${n} XP</b>`};
 const rewardChips=(rewards,extra='')=>`<span class="reward-chips">${Object.entries(rewards).filter(([,n])=>n).map(([kind,n])=>CHIPS[kind](n)).join('')}${extra}</span>`;
 async function act(action,message){try{const r=await runAction(action);onChange();refresh();notify(typeof message==='function'?message(r):message);return r;}catch(e){notify(e.message);}}
 // Today's place in the streak (farm-state.js streakToday: yesterday, or one missed day with the weekly save) and its gift, or null
 // once collected. The Today window and the Welcome back card (welcome-ui.js) both show it and collect it through collectGift.
 function giftOffer(now=farmNow()){const today=streakToday(state,now);return today.claimed?null:{...dailyGift(state,today.streak,now),day:today.streak,saved:today.saved};}
 const boostName=(kind,ms)=>`${ms>=3600000?`${ms/3600000} h`:`${ms/60000} min`} ${BOOSTS[kind].name.toLowerCase()}`;
 const boostChip=(kind,ms)=>`<b class="is-boost">${art(BOOSTS[kind].art)}${boostName(kind,ms)}</b>`;
 // While the Halloween Pass counts (Oct 2026), today's gift, each challenge and each order also show the lanterns they bring (public/pass-ui.js).
 const giftChips=g=>rewardChips({diamonds:g.diamonds,coins:g.coins},(g.boost?boostChip(g.boost,g.boostMs):'')+(g.day?lanternChip(state,'gift',farmNow()):''));
 async function collectGift(){
  const r=await act({type:'checkin'},r=>`Welcome back! +${r.diamonds} diamonds and +${r.coins.toLocaleString('en-US')} coins · ${r.streak}-day streak${r.saved?' (saved)':''}.${r.boost?` Plus ${boostName(r.boost,r.boostMinutes*60000)}!`:''}${r.returnBoost?` Plus ${r.returnBoost} minutes of double harvest!`:''}`);
  // Every seventh day of a streak (7, 14, 21 ...) gets its own little celebration.
  if(r&&r.streak%7===0)celebrate(r);
  return r;
 }
 // The comeback chest (Oct 2026, farm-state.js comebackChest): after 3 days or more away, waiting until it is collected. Welcome back
 // shows it first; the top of the Today window keeps it for a farmer who closed that card (or came back in the village).
 const chestOffer=(now=farmNow())=>comebackChest(state,now);
 const chestChips=c=>rewardChips({coins:c.coins},boostChip(c.boost,c.boostMs));
 const collectChest=()=>act({type:'comeback'},r=>`Comeback chest: +${r.coins.toLocaleString('en-US')} coins. Plus ${boostName(r.boost,r.boostMinutes*60000)}!`);
 // Here, unlike in Welcome back (which says how long you were away), the row says why it is there: the rule in one line.
 const chestRow=c=>c?`<div class="welcome-gift welcome-chest"><span class="welcome-gift-art">${art('family-chest-wood')}</span><span class="welcome-gift-copy"><strong>Comeback chest</strong>${chestChips(c)}<small class="welcome-chest-note">For coming back after ${COMEBACK_MIN_DAYS} days or more. One every ${COMEBACK_EVERY_DAYS} days.</small></span><button type="button" id="comeback-chest" class="small-button">Collect</button></div>`:'';
 function gift(){
  // The seven days of the current streak week: day 1-7, then 8-14 and so on, each with its diamonds and, on days 3, 5 and 7, its boost.
  const now=farmNow(),today=streakToday(state,now),claimed=today.claimed;
  const streak=claimed?today.streak:today.streak-1,week=Math.floor((today.streak-1)/7)*7;
  const days=Array.from({length:7},(_,i)=>{const n=week+i+1,g=dailyGift(state,n,now),got=n<today.streak||claimed&&n===today.streak,current=n===today.streak&&!claimed;
   return `<li class="streak-day ${current?'current':''} ${got?'collected':''}"${g.boost?` title="${BOOSTS[g.boost].name} for ${g.boostMs/60000} minutes"`:''}><small>Day ${n}</small>${got?'<i data-lucide="check"></i>':art(n%7===0?'gift':'diamonds')}<b>${g.diamonds}</b>${g.boost?`<span class="streak-boost">${art(BOOSTS[g.boost].art)}</span>`:''}</li>`;}).join('');
  const rule=saveReady(state,now)?'Coins grow with your level. Miss one day and your streak is kept, once a week.':'Coins grow with your level. Your streak was saved this week: miss another day and it starts over.';
  // Collected: tomorrow's gift instead of an empty "come back", and (where reminders can work but are off) one tap to be reminded.
  const offer=giftOffer(now),next=claimed?dailyGift(state,today.streak+1,now+DAY_MS):null;
  const claim=claimed?`<span><strong>Tomorrow · day ${today.streak+1}</strong>${giftChips(next)}</span><span class="streak-done"><i data-lucide="check"></i>Collected</span>`
   :`<span><strong>Day ${offer.day} gift${offer.saved?' · streak saved':''}</strong>${giftChips(offer)}</span><button id="checkin-gift" class="primary-button">Collect</button>`;
  $('daily-gift').innerHTML=`${chestRow(chestOffer(now))}<section class="gift-panel streak-panel ${claimed?'is-claimed':''}"><div class="streak-head">${art('streak','streak-flame')}<div><h3>${streak?`${streak}-day streak`:'Start a streak'}</h3><p>Best ${state.login.best} day${state.login.best===1?'':'s'}${vipActive(state,now)?' · VIP doubles your gifts':''}</p></div><b class="streak-count">${streak}</b></div><ol class="streak-days">${days}</ol><div class="streak-claim">${claim}</div>${claimed?'<button type="button" class="gift-remind" id="gift-remind" hidden><i data-lucide="bell"></i>Remind me when tomorrow’s gift is ready</button>':''}<small class="gift-note">${rule}</small></section>`;
  if($('checkin-gift'))$('checkin-gift').onclick=()=>void collectGift();
  if($('comeback-chest'))$('comeback-chest').onclick=async()=>{$('comeback-chest').disabled=true;if(!await collectChest()&&$('comeback-chest'))$('comeback-chest').disabled=false;};
  if(claimed)void offerReminder();
 }
 // The daily reminder already exists (notify-hourly: 09:00 "your gift is waiting", 19:00 for a streak of 3 or more); this only offers
 // to switch notifications on, where they can work and are off, right after a gift. The settings keep every other choice.
 const notifications=()=>{try{return window.parent?.harvestBridge?.notifications??null;}catch{return null;}};
 async function offerReminder(){
  const button=$('gift-remind'),api=notifications();if(!button||!api)return;
  try{await api.ready;if(!api.available||!(api.config?.push||api.config?.appPush)||!api.push||(await api.push.status()).kind!=='off')return;}catch{return;}
  button.hidden=false;
  button.onclick=async()=>{
   button.disabled=true;
   try{
    const result=await api.push.enable();
    if(result?.kind!=='on'){notify(result?.kind==='blocked'?(api.push.app?APP_PUSH_BLOCKED:'Notifications are blocked for this site. You can allow them in your browser settings.'):'Reminders could not be turned on here.');return;}
    await api.save({...await api.get(),pushDaily:true});button.hidden=true;notify('Reminders are on. We will let you know when your next gift is ready.');
   }catch{notify('Reminders could not be turned on. You can try again in Settings.');}
   finally{button.disabled=false;}
  };
 }
 function renderToday(){
  if(tab==='orders'&&!featureUnlocked(state,'cart'))tab='challenges';
  const challengesOpen=featureUnlocked(state,'challenges');
  // One job per window (30 Sep 2026): the market's pick of the day lives in the Market only.
  $('today-market').hidden=true;$('today-market').innerHTML='';
  gift();document.querySelectorAll('[data-today-tab]').forEach(b=>{b.hidden=b.dataset.todayTab==='orders'?!featureUnlocked(state,'cart'):!challengesOpen;b.classList.toggle('active',b.dataset.todayTab===tab);b.setAttribute('aria-pressed',String(b.dataset.todayTab===tab));});
  const day=utcDay(farmNow());
  if(tab==='challenges'&&!challengesOpen){
   $('today-content').innerHTML=`<p class="section-copy">Your daily gift is ready from the start. ${featureUnlockHint('challenges')}</p>`;
  }else if(tab==='challenges'){
   const tasks=dailyTasks(state,farmNow()),xpBoost=state.boosts.xpUntil>farmNow()?2:1,multiplier=dailyRewardMultiplier(state,farmNow()),done=tasks.filter(q=>q.claimed).length;
   // Same cards as the quest list: picture, goal, a bar with the count and the reward as chips; Claim only when done.
   $('today-content').innerHTML=`<div class="daily-bonus-card ${done===3?'is-done':''}"><span class="daily-bonus-art">${art('gift')}</span><span><strong>${done===3?'Daily bonus collected':'Finish all three for a bonus'}</strong>${rewardChips({coins:DAILY_BONUS.coins*multiplier,xp:DAILY_BONUS.xp*multiplier*xpBoost})}</span><b>${done}/3</b></div><div class="daily-list">`+tasks.map(q=>{const ready=!q.claimed&&q.progress>=q.target;return `<article class="daily-task daily-card ${q.claimed?'completed':ready?'is-ready':''}"><span class="quest-art">${questArt(q.stat)}</span><div class="quest-body"><h3>${q.title}</h3><p>${q.description}</p>${q.claimed?'':`<div class="quest-meter"><progress max="${q.target}" value="${q.progress}" aria-label="${q.title} progress"></progress><span>${q.progress} / ${q.target}</span></div>`}<div class="task-bottom">${rewardChips({coins:q.reward,diamonds:q.diamonds,xp:q.xp*xpBoost},lanternChip(state,'daily',farmNow()))}${q.claimed?'<span class="quest-state">Collected ✓</span>':ready?`<button class="primary-button" data-daily="${q.id}">Claim</button>`:''}</div></div></article>`;}).join('')+'</div>';
   document.querySelectorAll('[data-daily]').forEach(b=>b.onclick=()=>act({type:'daily',id:Number(b.dataset.daily),day},r=>`Challenge complete! +${r.coins} coins and +${r.diamonds} diamond${r.diamonds===1?'':'s'}${r.bonus?' including your daily bonus!':'.'}`));
  }else{
   const now=farmNow(),orders=dailyOrders(state,now),coinBoost=state.boosts.coinsUntil>now?2:1,xpBoost=state.boosts.xpUntil>now?2:1;
   const ready=orders.filter(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)).length;
   $('today-content').innerHTML=`<p class="delivery-summary"><b>${orders.filter(o=>!o.done).length}</b> open ${orders.filter(o=>!o.done).length===1?'order':'orders'}${ready?` · <span>${ready} ready to deliver</span>`:''}</p>${orders.some(o=>!o.tier)?'<p class="legacy-order-note">Your existing orders and rewards are kept for today. Quick deliveries, village orders and special commissions arrive at the next daily reset.</p>':''}<div class="daily-list">`+orders.map(o=>{
    const can=Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n),tier=DELIVERY_TIERS[o.tier],options=o.done?[]:replacementOptions(state,o.id,now);
    // One card per order: who and what, the goods (missing ones marked), the reward as chips and Deliver.
    return `<article class="order-card daily-order ${o.tier??'legacy'} ${o.done?'completed':can?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(o.tier==='commission'?'trophy':'cart')}</span><div><small>${tier?.name??'Delivery order'}${o.tier?` · <b title="Compared with selling these goods at the market">+${o.bonus}% vs market</b>`:''}</small><h3>${o.title}</h3></div></div><div class="ingredients">${itemList(o.input,!o.done)}</div><div class="task-bottom">${rewardChips({coins:o.coins*coinBoost,diamonds:o.diamonds,xp:o.xp*xpBoost},lanternChip(state,'delivery',now))}${o.done?'<span class="quest-state">Delivered ✓</span>':`<button class="primary-button" data-order="${o.id}" data-order-revision="${o.revision}" ${can?'':'disabled'}>Deliver</button>`}</div>${!o.done?`<details class="order-replace"><summary>Replace this order · ${art('diamonds')} ${REPLACE_ORDER_COST}</summary><p>A different order in the same category. Your goods stay in storage. ${Math.max(0,DAILY_ORDER_REPLACEMENTS-state.daily.replacements)} left today.</p><button type="button" class="small-button diamond-option" data-replace-order="${o.id}" data-order-revision="${o.revision}" ${state.diamonds<REPLACE_ORDER_COST||state.daily.replacements>=DAILY_ORDER_REPLACEMENTS||!options.length?'disabled':''}>${art('diamonds')} Spend ${REPLACE_ORDER_COST} & replace</button>${!options.length?'<small>No alternative at this difficulty yet.</small>':''}</details>`:''}</article>`;
   }).join('')+'</div>'+(featureUnlocked(state,'tradedepot')?'<div class="market-board-link"><span>Big export loads pay 1.6× at the Trade Depot.</span><button type="button" id="orders-depot">Trade Depot →</button></div>':'');
   document.querySelectorAll('[data-replace-order]').forEach(b=>b.onclick=()=>act({type:'replace_order',id:Number(b.dataset.replaceOrder),revision:Number(b.dataset.orderRevision),day,expectedCost:REPLACE_ORDER_COST},r=>`New order: ${r.title}. ${r.remaining} replacements left today.`));
   document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>act({type:'delivery',id:Number(b.dataset.order),day,revision:Number(b.dataset.orderRevision)},r=>`Delivery complete! +${r.coins} coins, +${r.xp} XP and +${r.diamonds} diamond${r.diamonds===1?'':'s'}.`));
   if($('orders-depot'))$('orders-depot').onclick=()=>{$('today-dialog').close();document.querySelector('[data-menu-utility="tradedepot"]').click();};
  }
  countdown();icons();
 }
 function openToday(selected='challenges'){tab=selected==='orders'&&!featureUnlocked(state,'cart')?'challenges':selected;renderToday();open('today-dialog');}
 function renderUtility(){
  if(utility==='tractor'){
   $('utility-title').textContent='Your trusty tractor';
   lastFieldStatus=fieldStatus();
   const crop=getCrop();
   const quotes=Object.fromEntries(['plant','water','tend','harvest'].map(mode=>[mode,tractorQuote(state,mode,crop,farmNow())]));
   // A status pill instead of a note, the crop you plant as a tappable chip, and each job as one card with its fields
   // and price; the fuel rule is one small line at the bottom.
   const empty={plant:state.plots.some(p=>!p.crop)?'Not enough coins':'No empty fields',water:'Nothing to water · water right after planting',tend:'Nothing ready for care yet · it opens after 30% of the growing time',harvest:'Nothing ready yet'};
   $('utility-content').innerHTML=`<div class="tractor-top"><span class="tractor-art">${art('tractor')}</span><div><strong>Works many fields at once</strong><span>By hand is always free.</span></div></div><button type="button" class="tractor-seed" data-tractor-crop>${art(crop)}<span><small>Planting</small><strong>${CROPS[crop].name}</strong></span><em>${art('coins')}${seedCost(state,crop)} per field</em><i data-lucide="chevron-right" data-line-icon></i></button><div class="tractor-jobs">${[['plant','seeds',`Plant ${CROPS[crop].name}`],['water','water','Water growing crops'],['tend','care','Give extra care'],['harvest','harvest','Harvest ready crops']].map(([mode,icon,label])=>{const q=quotes[mode];return `<button class="tractor-job" data-tractor="${mode}" ${!q.count||state.coins<q.total?'disabled':''}><span class="tractor-job-art">${art(icon)}</span><span class="tractor-job-copy"><strong>${label}</strong><small>${q.count?`${q.count} ${q.count===1?'field':'fields'}${q.seeds?` · ${q.fuel} fuel + ${q.seeds} seeds`:''}${mode==='water'?` · ${waterLeft(q)} left to water`:''}`:empty[mode]}</small></span>${q.count?`<span class="tractor-job-cost">${art('coins')}${q.total}</span>`:''}</button>`;}).join('')}</div><p class="tractor-foot">Fuel: ${TRACTOR_FUEL_BASE} coins a job + ${TRACTOR_FUEL_PER_FIELD} per field.</p>${diamondWork(crop)}`;
   document.querySelector('[data-tractor-crop]').onclick=()=>{$('utility-dialog').close();$('selected-crop-button')?.click();};
   document.querySelectorAll('[data-tractor]').forEach(b=>b.onclick=()=>act({type:'tractor',mode:b.dataset.tractor,crop:getCrop()},r=>`All done! The tractor worked ${r.count} fields · ${r.cost} coins spent.`));
   // The diamond work (4 Oct 2026): short of diamonds goes to the packs; 150 or more asks first, as everywhere in the game.
   // The price sent is the one on the button: the server never charges more (a quote that went up asks to look again).
   const paid=async(cost,ask,action,message)=>{
    const short=cost-state.diamonds;
    if(short>0){notify(`You need ${short} more diamonds.`);$('utility-dialog').close();window.harvestShop?.open();return;}
    if(cost>=150&&!await confirmDiamondSpend({...ask,cost,balance:state.diamonds}))return;
    act(action,message);
   };
   const care=document.querySelector('[data-tractor-care]');
   if(care)care.onclick=()=>{const shown=Number(care.dataset.cost),q=fullCareQuote(state,farmNow());if(q.cost!==shown){notify('Your fields have changed. Review the price.');renderUtility();return;}paid(shown,{title:'Full care',description:'Water and extra care for every growing crop, now.',picture:'tractor-full-care'},{type:'tractor_care',expectedCost:shown},r=>`Full care for ${r.count} ${r.count===1?'crop':'crops'}: ${r.cost} diamonds.`);};
   const shift=document.querySelector('[data-tractor-shift]');
   if(shift)shift.onclick=()=>{const crop=getCrop(),shown=Number(shift.dataset.cost),q=nightShiftQuote(state,crop,farmNow());if(q.cost>shown){notify('The price has changed. Review the current price.');renderUtility();return;}paid(shown,{title:'Night shift',description:`For 8 hours the tractor harvests, plants ${CROPS[crop].name}, waters and gives care every hour.`,picture:'tractor-night-shift'},{type:'tractor_shift',crop,expectedCost:shown},r=>`Night shift started: the tractor works your fields until ${clock(r.endsAt)}.`);};
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
  // Lifetime totals: every crop picked and every good collected. The Glasshouse grows crops, not goods, so its crates count
  // as crops picked (the leaderboards count the fields only).
  const total=(prefix,keep=()=>true)=>Object.entries(stats).reduce((n,[k,v])=>k.startsWith(prefix)&&keep(k.slice(prefix.length))&&Number.isFinite(v)?n+v:n,0);
  const crops=Math.max(stats.harvested??0,total('harvest_'))+total('made_',k=>CROPS[k]),goods=Math.max(stats.produced??0,total('made_',k=>!CROPS[k]&&!worldTwoItem(k)));
  const tile=(icon,value,label)=>`<div>${art(icon)}<p><strong>${value}</strong><span>${label}</span></p></div>`;
  // World II's goods (30 Sep 2026) have their own tab, from level 100; the farm's Goods tab and its count stay the farm's.
  const cropKeys=Object.keys(CROPS),goodKeys=Object.keys(ITEMS).filter(k=>!CROPS[k]&&!ITEMS[k].heirloom&&!worldTwoItem(k)),villageKeys=Object.keys(ITEMS).filter(k=>!CROPS[k]&&worldTwoItem(k));
  if(journalTab==='village'&&!worldTwoOpen(state))journalTab='crops';
  // Honey also comes from the Apiary (a few jars per finished job), not only from the Factory.
  const apiaryHoney=(stats.activity_apiary??state.activities?.completed?.apiary??0)*(ACTIVE_STATIONS.apiary.itemCount??0);
  const count=key=>CROPS[key]?(stats['harvest_'+key]??0)+(stats['made_'+key]??0):(stats['made_'+key]??0)+(key==='honey'?apiaryHoney:0);
  const found=keys=>keys.filter(k=>CROPS[k]?state.discovered.includes(k):count(k)>0).length;
  const keys=journalTab==='goods'?goodKeys:journalTab==='village'?villageKeys:cropKeys,verb=journalTab==='crops'?'picked':'made';
  // The collection shows what you have (30 Sep 2026); what is still to find is one tile with a count, not a grid of grey "Not yet".
  const seen=key=>CROPS[key]?state.discovered.includes(key):count(key)>0;
  const card=key=>`<div class="collection-crop discovered">${art(key,'collection-picture')}<strong>${ITEMS[key].name}</strong><small>${number(count(key))} ${verb}</small></div>`;
  const have=keys.filter(seen),left=keys.length-have.length;
  const tabButton=(key,label,list)=>`<button type="button" data-journal-tab="${key}" aria-pressed="${journalTab===key}" class="${journalTab===key?'active':''}">${label} <b>${found(list)}/${list.length}</b></button>`;
  $('journal-content').innerHTML=`<section class="journal-hero"><span class="journal-medallion"><small>LVL</small><b>${level}</b></span><div class="journal-hero-copy"><div class="journal-hero-top"><strong>Level ${level+1} in ${number(Math.max(0,target-current))} XP</strong><small>${number(current)} / ${number(target)} XP</small></div><progress max="${target}" value="${current}" aria-label="Level progress"></progress><div class="journal-next"><span>Level-up reward</span><b>${art('coins')}${number(reward.coins)}</b><b>${art('diamonds')}${reward.diamonds}</b></div></div></section>`
   +`<div class="journal-tiles">${tile('harvest',number(crops),'crops harvested')}${tile('buildings',number(goods),'goods made')}${tile('quests',`${state.claimed.length}/${QUESTS.length}`,'quests done')}${tile('cart',number(stats.deliveries??0),'deliveries')}</div>`
   +`<section class="journal-collection"><div class="journal-collection-head"><h3>Your collection</h3><div class="market-tabs journal-tabs" role="group" aria-label="Collection">${tabButton('crops','Crops',cropKeys)}${tabButton('goods','Goods',goodKeys)}${worldTwoOpen(state)?tabButton('village','Village',villageKeys):''}</div></div>${have.length?`<div class="collection-grid">${have.map(card).join('')}${left?`<div class="collection-crop collection-left"><b>${left}</b><small>still to discover</small></div>`:''}</div>`
    :`<div class="quest-empty journal-empty">${art(journalTab==='crops'?'harvest':journalTab==='village'?'village-badge':'buildings')}<h3>Nothing collected yet</h3><p>${journalTab==='crops'?`Harvest a crop and it shows up here. ${keys.length} crops to discover.`:journalTab==='village'?`Make something in the village and it shows up here. ${keys.length} goods to discover.`:`Collect a batch from a building and it shows up here. ${keys.length} goods to discover.`}</p></div>`}</section>`
   +roadmapMarkup(state);
  document.querySelectorAll('[data-journal-tab]').forEach(b=>b.onclick=()=>{journalTab=b.dataset.journalTab;renderJournal();});
  icons();
 }
 // A streak of 3 or more that is not collected yet, in the evening on the farmer's own clock: the Today button shows a flame
 // instead of the "!", so the streak is not lost by accident.
 let lastDanger=null;
 function streakDanger(){
  const now=farmNow(),today=streakToday(state,now),danger=!today.claimed&&today.streak-1>=3&&new Date().getHours()>=18,dot=$('today-dot');
  if(danger===lastDanger||!dot)return;lastDanger=danger;
  dot.classList.toggle('is-streak',danger);dot.innerHTML=danger?art('streak','today-flame'):'!';
  $('today-button').title=danger?`Collect today’s gift to keep your ${today.streak-1}-day streak`:'';
 }
 function refresh(){
  streakDanger();
  const tasks=dailyTasks(state,farmNow());$('today-dot').hidden=state.login.lastDay===utcDay(farmNow())&&!chestOffer()&&(!featureUnlocked(state,'challenges')||!tasks.some(q=>!q.claimed&&q.progress>=q.target))&&(!featureUnlocked(state,'cart')||!dailyOrders(state,farmNow()).some(o=>!o.done&&Object.entries(o.input).every(([k,n])=>state.inventory[k]>=n)));
  $('journal-button').classList.remove('has-reward');
  if($('today-dialog').open)renderToday();if($('utility-dialog').open)renderUtility();if($('journal-dialog').open)renderJournal();
 }
 function countdown(){const ms=DAY_MS-farmNow()%DAY_MS,h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60;$('daily-countdown').textContent=`Resets in ${h}h ${m}m`;}
 // Water only fits early in a crop's growth, so the tractor's water job says how long is left (the field that closes first).
 const clock=at=>new Date(at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
 // The tractor's diamond work: Full care and the night shift, and the one rule that they count nowhere.
 function diamondWork(crop){
  const now=farmNow(),care=fullCareQuote(state,now),shift=nightShiftQuote(state,crop,now),done=shiftHarvests(shift.shift),name=CROPS[crop].name;
  const cost=n=>`<span class="tractor-job-cost">${art('diamonds')}${n}</span>`;
  const harvests=n=>`${n} ${n===1?'harvest':'harvests'}`;
  const careCard=`<button class="tractor-job is-diamond" data-tractor-care data-cost="${care.cost}" ${care.count?'':'disabled'}><span class="tractor-job-art">${art('tractor-full-care')}</span><span class="tractor-job-copy"><strong>Full care</strong><small>${care.count?`${care.count} ${care.count===1?'growing crop':'growing crops'} · water and extra care, now`:'No growing crops need water or care'}</small></span>${care.count?cost(care.cost):''}</button>`;
  // What tonight's shift does with this crop: how often it can harvest a field, or why it cannot.
  const forecast=shift.forecast?.tooSlow?`Grows longer than the shift: the tractor plants and cares for ${name}, you harvest it`
   :state.coins<seedCost(state,crop)?`Not enough coins for ${name} seeds: the tractor only harvests, waters and cares`
   :`${name}: up to ${harvests(shift.perField)} on each field tonight`;
  const shiftCard=shift.running?`<div class="tractor-job is-diamond is-running"><span class="tractor-job-art">${art('tractor-night-shift')}</span><span class="tractor-job-copy"><strong>Night shift · ${formatDuration(shift.shift.endsAt-now)} left</strong><small>${harvests(done)} so far · plants ${CROPS[shift.shift.crop].name}</small></span></div>`
   :shift.doneToday?`<div class="tractor-job is-diamond is-done"><span class="tractor-job-art">${art('tractor-night-shift')}</span><span class="tractor-job-copy"><strong>Night shift done for today</strong><small>${harvests(done)} · the next one tomorrow</small></span></div>`
   :`<button class="tractor-job is-diamond" data-tractor-shift data-cost="${shift.cost}"><span class="tractor-job-art">${art('tractor-night-shift')}</span><span class="tractor-job-copy"><strong>Night shift · 8 hours</strong><small>Every hour: harvest, plant ${name}, water and care, also while you are away</small><small class="tractor-forecast">${forecast}</small></span>${cost(shift.cost)}</button>`;
  return `<h3 class="tractor-subhead">${art('diamonds')}With diamonds</h3><p class="tractor-rule">${art('trophy')}<span>The tractor's diamond work counts for no challenges, events or leaderboards. What it brings in is yours, like any crop.</span></p>${shift.running||shift.doneToday?'':`<p class="tractor-price-rule">Night shift price: 1 diamond for every ${SHIFT_COINS_PER_DIAMOND} coins of crops it brings in.</p>`}<div class="tractor-jobs">${careCard}${shiftCard}</div>`;
 }
 function waterLeft(q){return formatDuration(Math.max(0,Math.min(...q.ids.map(id=>waterUntil(state.plots[id])))-farmNow()));}
 // Redraw when a field changes state, and every minute (every second in the last minute) while water is still possible.
 function fieldStatus(){const now=farmNow(),shift=state.tractorShift;return (shift?`${shift.done}:${Math.ceil((shift.endsAt-now)/60000)}|`:'')+state.plots.map(p=>{if(!p.crop)return 'empty';if(p.readyAt<=now)return 'ready';if(p.watered)return 'watered';if(!canWater(p,now))return 'growing';const left=waterUntil(p)-now;return `water:${left<60000?Math.ceil(left/1000):Math.ceil(left/60000)}`;}).join(',');}
 function tick(){
  // A night shift round that came due while the game is open: worked out here too, as the server will (settleShift is pure).
  const shift=state.tractorShift;if(shift&&shift.done<=SHIFT_ROUNDS&&shift.startedAt+shift.done*SHIFT_ROUND_MS<=farmNow()){settleShift(state,farmNow());onChange();refresh();}
  const coinBoost=`${state.boosts.coinsUntil>farmNow()}:${vipActive(state,farmNow())}`;if(lastCoinBoost!==coinBoost){lastCoinBoost=coinBoost;if($('today-dialog').open)renderToday();}
  const xpBoost=state.boosts.xpUntil>farmNow();if(lastXPBoost!==xpBoost){lastXPBoost=xpBoost;if($('today-dialog').open)renderToday();}
  const day=utcDay(farmNow());if(day!==lastDay){lastDay=day;refresh();}countdown();streakDanger();
  if($('utility-dialog').open&&utility==='tractor'&&lastFieldStatus!==fieldStatus())renderUtility();
 }
 $('today-button').onclick=()=>openToday();$('journal-button').onclick=()=>{renderJournal();open('journal-dialog');};
 document.querySelectorAll('[data-today-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.todayTab;renderToday();});
 document.querySelectorAll('[data-utility]').forEach(b=>b.onclick=()=>openUtility(b.dataset.utility));
 return {refresh,tick,openToday,openUtility,giftOffer,collectGift,giftChips,chestOffer,chestChips,collectChest};
}
