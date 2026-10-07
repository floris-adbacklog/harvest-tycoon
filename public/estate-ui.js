import {VISITOR_DIAMONDS,GIANT_KG_PER_DIAMOND,GIANT_MAX_DIAMONDS,HEIRLOOMS,LAB_BEDS,LAB_YIELD,LAB_DISCOVER_DIAMONDS,LAB_COMPLETE_DIAMONDS,heirloomFound,heirloomOpen,VISITORS,VISITOR_WAIT,VISITOR_STREAK_MAX,visitorStreakBonus,GIANT_TEND_MS,GIANT_TEND_KG,GIANT_FEED,GIANT_FEED_KG,GIANT_COINS_PER_KG,GIANT_RECORD_DIAMONDS,GIANT_RECORD_MIN,giantDiamonds,VALLEY_PROJECTS,valleyProjectLevel,valleyProjectBonus,IMPROVEMENTS,FAIR_CHAMPION_DIAMONDS,hasImprovement,EXPORT_DESTINATIONS,DEPOT_PREMIUM,depotRestock,featureUnlocked,featureUnlockHint,familyWeek,familyWeekStart,levelOf,normalizeFarm,marketValue,formatDuration,ITEMS} from './farm-state.js';
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
 grandfair:{eyebrow:'ONCE A WEEK',title:'Grand Valley Fair'},
 seedlab:{eyebrow:'IN THE GLASSHOUSE',title:'Seed Lab'},
 visitors:{eyebrow:'UP THE VALLEY ROAD',title:'Valley visitors'},
 valleyprojects:{eyebrow:'WORKS THAT LAST',title:'Valley projects'}
};

// The wave-3 places: the Estate Workshop (improvements built once), the Trade Depot (one export trailer to fill) and the Grand
// Valley Fair (three classes a week). Each opens from its place on the farm and from the farm menu; the rules are in
// game/farm-state.js.
export function createEstateUI({state,runAction,onChange,notify,itemList}){
 let view='estateworkshop',timer,shown='',fairTab='classes';
 // What the open screen shows; only a change re-renders it (the depot's countdown in minutes, the fair's week).
 const signature=()=>JSON.stringify([view,state.coins,Object.keys(ITEMS).map(k=>state.inventory[k]),state.improvements,state.depot?.contract?.loaded,state.depot?.contract?.id,Math.ceil(Math.max(0,(state.depot?.readyAt??0)-farmNow())/60000),state.fair?.week,state.fair?.entered,levelOf(state),state.lab,state.visitors,state.giant,state.valleyProjects,fairTab,Math.ceil(farmNow()/60000)]);
 async function act(action,message){
  try{const result=await runAction(action);onChange();render();notify(typeof message==='function'?message(result):message);}
  catch(error){notify(error.message);}
 }
 function open(key,tab){
  if(key==='giantpumpkin'){key='grandfair';tab='pumpkin';}
  if(!featureUnlocked(state,key)){notify(featureUnlockHint(key));return;}
  if(key==='grandfair')fairTab=tab==='pumpkin'&&featureUnlocked(state,'giantpumpkin')?'pumpkin':'classes';
  view=key;document.querySelectorAll('dialog[open]').forEach(d=>d.close());render();$('estate-place-dialog').showModal();$('estate-place-dialog').scrollTop=0;
 }
 const lead=(picture,text)=>`<p class="estate-lead valley-lead"><span class="estate-icon">${art(picture)}</span><span>${text}</span></p>`;
 function render(){
  clearTimeout(timer);
  normalizeFarm(state,farmNow());
  $('estate-place-eyebrow').textContent=VIEWS[view].eyebrow;
  $('estate-place-title').textContent=VIEWS[view].title;
  $('estate-place-content').innerHTML=view==='estateworkshop'?workshopMarkup():view==='tradedepot'?depotMarkup():view==='seedlab'?labMarkup():view==='visitors'?visitorsMarkup():view==='valleyprojects'?projectsMarkup():fairMarkup();
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
  // Two tabs once the giant pumpkin opens (level 94): the week's classes and the pumpkin.
  const tabs=featureUnlocked(state,'giantpumpkin')?`<div class="market-tabs fair-tabs" role="group" aria-label="At the fair"><button type="button" data-fair-tab="classes" aria-pressed="${fairTab==='classes'}" class="${fairTab==='classes'?'active':''}">Classes</button><button type="button" data-fair-tab="pumpkin" aria-pressed="${fairTab==='pumpkin'}" class="${fairTab==='pumpkin'?'active':''}">Giant pumpkin</button></div>`:'';
  if(tabs&&fairTab==='pumpkin')return tabs+pumpkinMarkup();
  return tabs+classesMarkup();
 }
 function classesMarkup(){
  const now=farmNow(),fair=state.fair,total=state.stats.fair_stars??0,champion=state.stats.fair_champion??0;
  const cards=(fair.classes??[]).map((entry,i)=>{
   const done=fair.entered.includes(i),can=!done&&Object.entries(entry.input).every(([k,n])=>state.inventory[k]>=n);
   return `<article class="order-card fair-class ${done?'is-ready':''}"><div class="order-head"><span class="order-icon">${art('grand-fair')}</span><div><small><span class="fair-stars" aria-label="${entry.stars} ${entry.stars===1?'star':'stars'}">${stars(entry.stars)}</span></small><h3>${entry.name}</h3></div></div><div class="ingredients">${itemList(entry.input,!done)}</div><div class="task-bottom">${rewardChips({coins:entry.coins,diamonds:entry.diamonds,xp:entry.xp})}${done?'<span class="quest-state">Ribbon won ✓</span>':`<button class="primary-button" data-fair-enter="${i}" ${can?'':'disabled'}>Enter</button>`}</div></article>`;
  }).join('')||'<p class="valley-next">The classes for this week are being set up. Make some goods and come back.</p>';
  const week=familyWeek(now),next=familyWeekStart(week+1);
  return lead('grand-fair',`Three classes a week. Enter each one once to win a ribbon: <b>fair stars</b>, coins and diamonds. Win all three in one week for grand champion: <b>+${number(FAIR_CHAMPION_DIAMONDS)} diamonds</b>.`)
   +`<p class="fair-tally"><span class="fair-stars">★</span><b>${number(total)}</b> fair ${total===1?'star':'stars'}${champion?` · grand champion ${champion===1?'once':`${number(champion)} times`}`:''}</p>`
   +`<div class="daily-list">${cards}</div><p class="valley-footer">New classes in ${formatDuration(next-now)}, every Monday.</p>`;
 }
 // The giant pumpkin (level 94): tend it every 8 hours, feed it fertilizer for more, weigh it in when you like. The intro names the
 // scale's diamonds (7 Oct 2026: 1 for every 20 kg, up to 20; it said only the record's).
 function pumpkinMarkup(){
  const now=farmNow(),g=state.giant,next=g.lastTendAt?g.lastTendAt+GIANT_TEND_MS:0,ready=!g.weighed&&(!next||now>=next);
  const stage=g.kg>=200?'giant-prize':g.kg>=80?'giant-big':'giant-small',feed=Object.entries(GIANT_FEED).every(([k,n])=>state.inventory[k]>=n);
  const addNext=GIANT_TEND_KG+g.tends,payout=g.kg*GIANT_COINS_PER_KG;
  const body=g.weighed?`<p class="valley-next">Weighed in: <b>${number(g.kg)} kg</b>. A new pumpkin grows from Monday.</p>`
   :`<div class="giant-actions"><button class="primary-button" data-giant-tend ${ready?'':'disabled'}>Tend it · +${addNext} kg</button><button class="secondary-button" data-giant-feed ${ready&&feed?'':'disabled'}>Tend + feed · +${addNext+GIANT_FEED_KG} kg</button></div><p class="valley-line">${ready?`Feeding takes ${GIANT_FEED.fertilizer} natural fertilizer (you have ${number(state.inventory.fertilizer)}).`:`Tend it again in <b>${formatDuration(next-now)}</b>.`}</p>${g.kg?`<div class="task-bottom">${rewardChips({coins:payout,diamonds:giantDiamonds(g.kg)})}<button class="secondary-button" data-giant-weigh>Weigh in now</button></div>`:''}`;
  const last=g.last?`<p class="valley-footer">Last pumpkin: ${number(g.last.kg)} kg for ${number(g.last.coins)} coins and ${g.last.diamonds} diamonds${g.last.record?' (a new record)':''}.</p>`:'';
  return lead('giant-scale',`One giant pumpkin a week. Tend it every 8 hours: each time it gains a little more than the time before. Feed it for ${GIANT_FEED_KG} kg extra. The scale pays <b>${number(GIANT_COINS_PER_KG)} coins a kilo</b> and 1 diamond for every ${GIANT_KG_PER_DIAMOND} kg, up to ${GIANT_MAX_DIAMONDS}; a new record from ${GIANT_RECORD_MIN} kg adds ${GIANT_RECORD_DIAMONDS} diamonds.`)
   +`<article class="order-card giant-card"><div class="giant-hero">${art(stage,'giant-art')}<div><strong>${number(g.kg)} kg</strong><span>${g.tends} ${g.tends===1?'tending':'tendings'} this week${g.record?` · record ${number(g.record)} kg`:''}</span></div></div>${body}</article>${last}<p class="valley-footer">A pumpkin still on the vine on Monday is weighed in by itself.</p>`;
 }
 // The Seed Lab (level 92): two test beds, twenty heirlooms to discover.
 function labMarkup(){
  const now=farmNow(),found=state.lab.found.length,total=Object.keys(HEIRLOOMS).length,freeBed=state.lab.beds.findIndex(b=>!b);
  const beds=state.lab.beds.map((b,i)=>{
   if(!b)return `<article class="order-card lab-bed is-empty"><div class="order-head"><span class="order-icon">${art('seedlab')}</span><div><small>Test bed ${i+1}</small><h3>Empty</h3><p class="valley-line">Choose a variety below to cross in it.</p></div></div></article>`;
   const h=HEIRLOOMS[b.heirloom],done=now>=b.readyAt;
   return `<article class="order-card lab-bed ${done?'is-ready':''}"><div class="order-head"><span class="order-icon">${art(b.heirloom)}</span><div><small>Test bed ${i+1}${heirloomFound(state,b.heirloom)?'':' · a new variety'}</small><h3>${h.name}</h3><p class="valley-line">${done?`${LAB_YIELD} ${h.name.toLowerCase()} are ready.`:`Ready in <b>${formatDuration(b.readyAt-now)}</b>`}</p></div></div><div class="depot-progress"><progress value="${Math.min(now,b.readyAt)-b.startedAt}" max="${b.readyAt-b.startedAt}" aria-label="Growing"></progress></div><div class="task-bottom">${done?`<button class="primary-button" data-lab-collect="${i}">Collect</button>`:''}</div></article>`;
  }).join('');
  const cards=Object.entries(HEIRLOOMS).map(([k,h])=>{
   const known=heirloomFound(state,k),open=heirloomOpen(state,k),can=open&&freeBed>=0&&Object.entries(h.input).every(([c,n])=>state.inventory[c]>=n);
   const action=!open?`<small class="ranch-closed">Opens at level ${h.level}.</small>`:`<button class="${known?'secondary-button':'primary-button'}" data-lab-cross="${k}" ${can?'':'disabled'}>${known?'Grow again · 8 h':'Discover · 1 day'}</button>`;
   return `<article class="order-card heirloom ${known?'is-found':'is-unknown'}"><div class="order-head"><span class="order-icon">${art(k)}</span><div><small>${known?`Found · ${number(state.inventory[k])} in your barn`:`New · +${LAB_DISCOVER_DIAMONDS} diamonds`}</small><h3>${h.name}</h3></div></div><div class="ingredients">${itemList(h.input,open)}</div><div class="task-bottom">${action}</div></article>`;
  }).join('');
  return lead('seedlab',`Cross two crops in a test bed. The first cross of a variety takes a day and discovers it; after that it takes 8 hours. Each bed gives <b>${LAB_YIELD} heirlooms</b>, worth far more than their parents at the Market.`)
   +`<div class="daily-list lab-beds">${beds}</div><p class="fair-tally"><b>${found} of ${total}</b> discovered${found<total?` · all ${total}: +${LAB_COMPLETE_DIAMONDS} diamonds`:' · the whole collection ✓'}</p><div class="daily-list heirloom-list">${cards}</div>`;
 }
 // Visitors (level 93): one rush order at a time; the run of visitors served in a row makes the next one bigger and better paid in
 // coins. Each pays VISITOR_DIAMONDS (3 since 7 Oct 2026; the run raised the diamonds too, 5 up to 15).
 function visitorsMarkup(){
  const now=farmNow(),v=state.visitors,c=v.current,streak=v.streak??0;
  let body;
  if(!c)body=`<article class="order-card is-waiting"><div class="order-head"><span class="order-icon">${art('visitors')}</span><div><small>The road is quiet</small><h3>Nobody at the gate yet</h3></div></div><p class="valley-next">${v.nextAt>now?`The next visitor comes in <b>${formatDuration(v.nextAt-now)}</b>.`:'The next visitor comes as soon as you make goods worth 300 coins or more.'}</p></article>`;
  else{
   const who=VISITORS[c.visitor],can=Object.entries(c.input).every(([k,n])=>state.inventory[k]>=n);
   body=`<article class="order-card visitor-card"><div class="order-head"><span class="order-icon visitor-portrait">${art(`visitor-${who.id}`)}</span><div><small>Leaves in <b>${formatDuration(Math.max(0,c.leavesAt-now))}</b></small><h3>${who.name}</h3><p class="valley-line">“${who.line}”</p></div></div><div class="ingredients">${itemList(c.input,true)}</div><div class="task-bottom">${rewardChips({coins:c.coins,diamonds:c.diamonds,xp:c.xp})}<button class="primary-button" data-visitor-serve ${can?'':'disabled'}>Deliver</button></div><button type="button" class="text-button valley-skip" data-visitor-decline>Send this visitor away${streak?' (ends your run)':''}</button></article>`;
  }
  const extra=Math.round(visitorStreakBonus(streak)*100);
  return lead('visitors',`A visitor comes up the road with a rush order. Deliver it within 12 hours for coins and ${VISITOR_DIAMONDS} diamonds. Every visitor you serve in a row makes the next order bigger and <b>+10% better paid</b> in coins, up to ${VISITOR_STREAK_MAX} in a row; a visitor who leaves unserved, or is sent away, ends the run.`)
   +`<p class="fair-tally"><b>${streak}</b> in a row${extra?` · next order +${extra}%`:''}${v.best?` · best run ${v.best}`:''}</p><div class="daily-list">${body}</div><p class="valley-footer">${v.served?`${number(v.served)} ${v.served===1?'visitor':'visitors'} served so far. `:''}The next visitor comes ${formatDuration(VISITOR_WAIT)} after one leaves.</p>`;
 }
 // Valley projects (level 95): five works, three levels each; hand in goods bit by bit, then pay the coins to finish a level.
 function projectsMarkup(){
  const cards=Object.entries(VALLEY_PROJECTS).map(([id,p])=>{
   const level=valleyProjectLevel(state,id),done=level>=p.levels.length,now=Math.round(valleyProjectBonus(state,id)*100);
   const pips=`<span class="project-pips" aria-label="Level ${level} of ${p.levels.length}">${p.levels.map((_,i)=>`<i class="${i<level?'is-on':''}"></i>`).join('')}</span>`;
   if(done)return `<article class="order-card valley-project is-ready"><div class="order-head"><span class="order-icon">${art(p.art)}</span><div><small>${pips} Finished · +${now}%</small><h3>${p.name}</h3><p class="valley-line">${p.effect}</p></div></div></article>`;
   const step=p.levels[level],given=state.valleyProjects[id].given,ready=Object.entries(step.materials).every(([k,n])=>(given[k]??0)>=n);
   const rows=Object.entries(step.materials).map(([k,n])=>{const have=given[k]??0,left=n-have,stock=state.inventory[k],give=Math.min(stock,left);return `<li class="${left?'':'is-full'}">${art(k,'product-art')}<span><strong>${ITEMS[k].name}</strong><small>${left?`${number(stock)} in your barn`:'Handed in'}</small></span><b>${number(have)}/${number(n)}</b>${left?`<button type="button" class="secondary-button" data-vproject-give="${id}" data-item="${k}" ${give?'':'disabled'}>Give${give?` ${number(give)}`:''}</button>`:'<i data-lucide="check"></i>'}</li>`;}).join('');
   const any=Object.entries(step.materials).some(([k,n])=>(given[k]??0)<n&&state.inventory[k]>0);
   return `<article class="order-card valley-project"><div class="order-head"><span class="order-icon">${art(p.art)}</span><div><small>${pips} Level ${level+1} of ${p.levels.length}${now?` · now +${now}%`:''}</small><h3>${p.name}</h3><p class="valley-line">${p.effect}</p></div></div><ul class="depot-load">${rows}</ul><div class="task-bottom">${ready?`<button class="primary-button" data-vproject-finish="${id}" ${state.coins>=step.coins?'':'disabled'}>Finish for ${number(step.coins)} coins</button>`:`<span class="ingredient ${state.coins<step.coins?'missing':''}">${art('coins')}<span>${number(step.coins)} coins to finish</span></span><button class="primary-button" data-vproject-all="${id}" ${any?'':'disabled'}>Give all you can</button>`}</div></article>`;
  }).join('');
  const levels=Object.keys(VALLEY_PROJECTS).reduce((sum,id)=>sum+valleyProjectLevel(state,id),0),all=Object.values(VALLEY_PROJECTS).reduce((sum,p)=>sum+p.levels.length,0);
  return lead('valleyprojects','Big works in the valley. Hand in the goods bit by bit (what you give stays given), then pay the coins to finish a level. Every level adds a bonus that lasts.')
   +`<p class="fair-tally"><b>${levels} of ${all}</b> levels built</p><div class="daily-list">${cards}</div>`;
 }
 function bind(){
  document.querySelectorAll('[data-improve]').forEach(b=>b.onclick=()=>act({type:'improve',improvement:b.dataset.improve},r=>`${r.name} built! It works for good from now on. +${r.xp} XP.`));
  const c=state.depot?.contract;
  const shipped=r=>r.shipped?`The trailer is off to ${r.destination.toLowerCase()}! +${number(r.coins)} coins, +${r.diamonds} diamonds and +${number(r.xp)} XP.`:`Loaded ${number(r.units)} ${r.units===1?'good':'goods'} onto the trailer.`;
  document.querySelectorAll('[data-depot-load]').forEach(b=>b.onclick=()=>act({type:'depot_load',contract:c.id,item:b.dataset.depotLoad},shipped));
  document.querySelectorAll('[data-depot-all]').forEach(b=>b.onclick=()=>act({type:'depot_load',contract:c.id},shipped));
  document.querySelectorAll('[data-depot-skip]').forEach(b=>b.onclick=()=>act({type:'depot_skip',contract:c.id},()=>`Contract turned down. The next one comes in ${formatDuration(depotRestock(state))}.`));
  document.querySelectorAll('[data-fair-tab]').forEach(b=>b.onclick=()=>{fairTab=b.dataset.fairTab;render();});
  document.querySelectorAll('[data-giant-tend],[data-giant-feed]').forEach(b=>b.onclick=()=>act({type:'giant_tend',feed:b.hasAttribute('data-giant-feed')},r=>`Your pumpkin gained ${r.added} kg${r.fed?' (fed)':''}: ${number(r.kg)} kg now.`));
  document.querySelectorAll('[data-giant-weigh]').forEach(b=>b.onclick=()=>act({type:'giant_weigh'},r=>`${number(r.kg)} kg on the scale! +${number(r.coins)} coins and +${r.diamonds} diamonds${r.record?', a new record':''}.`));
  document.querySelectorAll('[data-lab-cross]').forEach(b=>b.onclick=()=>act({type:'lab_cross',bed:state.lab.beds.findIndex(x=>!x),heirloom:b.dataset.labCross},r=>r.discover?`${r.name} is crossing. Come back in a day to see what grows.`:`${r.name} is growing again.`));
  document.querySelectorAll('[data-lab-collect]').forEach(b=>b.onclick=()=>act({type:'lab_collect',bed:Number(b.dataset.labCollect)},r=>`${r.discovered?`You discovered ${r.name}! `:''}+${r.count} ${r.name.toLowerCase()}${r.diamonds?`, +${r.diamonds} diamonds`:''}.${r.complete?' The whole heirloom collection is yours!':''}`));
  const visitor=state.visitors?.current;
  document.querySelectorAll('[data-visitor-serve]').forEach(b=>b.onclick=()=>act({type:'visitor_serve',visitor:visitor.id},r=>`${r.name} is delighted! +${number(r.coins)} coins, +${r.diamonds} diamonds. ${r.streak} in a row.`));
  document.querySelectorAll('[data-visitor-decline]').forEach(b=>b.onclick=()=>act({type:'visitor_decline',visitor:visitor.id},()=>`The visitor went on their way. The next one comes in ${formatDuration(VISITOR_WAIT)}.`));
  const given=r=>r.ready?'Everything is handed in. Pay the coins to finish it.':`Handed in ${number(r.units)} ${r.units===1?'good':'goods'}.`;
  document.querySelectorAll('[data-vproject-give]').forEach(b=>b.onclick=()=>act({type:'vproject_give',project:b.dataset.vprojectGive,item:b.dataset.item},given));
  document.querySelectorAll('[data-vproject-all]').forEach(b=>b.onclick=()=>act({type:'vproject_give',project:b.dataset.vprojectAll},given));
  document.querySelectorAll('[data-vproject-finish]').forEach(b=>b.onclick=()=>act({type:'vproject_finish',project:b.dataset.vprojectFinish},r=>`The ${r.name.toLowerCase()} reached level ${r.level}! +${number(r.xp)} XP and +${r.diamonds} diamonds.`));
  document.querySelectorAll('[data-fair-enter]').forEach(b=>b.onclick=()=>act({type:'fair_enter',entry:Number(b.dataset.fairEnter),week:state.fair.week},r=>`A ribbon for ${r.name}! +${r.stars} fair ${r.stars===1?'star':'stars'}, +${number(r.coins)} coins and +${r.diamonds} diamonds.${r.champion?` You are this week’s grand champion! +${number(r.championDiamonds)} diamonds.`:''}`));
 }
 return {open,refresh:()=>{if($('estate-place-dialog')?.open&&signature()!==shown)render();}};
}
