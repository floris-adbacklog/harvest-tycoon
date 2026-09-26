import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {farmNow} from './farm-client.js';
import {formatDuration,levelOf} from './farm-state.js';
// Farm events: a short shared goal (usually 5 hours, then a 1-hour break before the next one). The Events button
// sits next to Quests on desktop and in the More menu on phones; the screen shows the running event, or the next
// one during the break, plus any reward still waiting to be collected.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
export const EVENT_GOALS={harvested:{label:'Harvest crops',art:'harvest'},produced:{label:'Collect batches',art:'buildings'},watered:{label:'Water fields',art:'water'},tended:{label:'Care for fields',art:'care'},chores:{label:'Finish chores',art:'chores'},deliveries:{label:'Complete deliveries',art:'cart'},
 harvest_wheat:{label:'Harvest wheat',art:'wheat'},harvest_corn:{label:'Harvest corn',art:'corn'},harvest_lettuce:{label:'Harvest lettuce',art:'lettuce'},harvest_barley:{label:'Harvest barley',art:'barley'},harvest_greenbeans:{label:'Harvest green beans',art:'greenbeans'},harvest_cabbage:{label:'Harvest cabbage',art:'cabbage'},made_eggs:{label:'Collect eggs',art:'eggs'},
 // The mixed events (supabase/live-events-mixed.sql, 26 Sep 2026): 30 kinds of goal, three drawn per event.
 planted:{label:'Plant fields',art:'seeds'},fertilized:{label:'Fertilize fields',art:'fertilizer'},harvest_cauliflower:{label:'Harvest cauliflower',art:'cauliflower'},
 made_feed:{label:'Make animal feed',art:'feed'},made_milk:{label:'Make milk',art:'milk'},made_cheese:{label:'Make cheese',art:'cheese'},made_flour:{label:'Make flour',art:'flour'},made_grainmeal:{label:'Make grain meal',art:'grainmeal'},made_bread:{label:'Bake bread',art:'bread'},parallel_batches:{label:'Start batches side by side',art:'buildings'},
 sold:{label:'Sell at the market',art:'market'},earned:{label:'Earn coins',art:'coins'},coins_spent:{label:'Spend coins',art:'coins'},diamonds_spent:{label:'Spend diamonds',art:'diamonds'},boosts_used:{label:'Use a boost',art:'boost'},sold_wheat:{label:'Sell wheat',art:'wheat'},
 activities:{label:'Lend a helping hand',art:'helping-hand'},activity_rounds:{label:'Finish a helping-hand round',art:'helping-hand'},upgrades:{label:'Upgrade buildings',art:'hammer'}};
const MIN_ACTIONS=3,MIN_SPAN=10*60000;
// Same level as the server gate (player_stats.level>=15, live-events-mixed.sql; 10 until 26 Sep 2026, when spending diamonds, which
// opens at 14, became a goal): below it the button stays visible but greyed.
export const EVENTS_LEVEL=15;
// The podium prize for the first three finishers and the extra for every later finisher, on top of the usual reward, and the
// most event diamonds a farmer collects in a day (same numbers as harvest_event_settle and harvest_event_claim).
// Fixed diamonds per place (harvest_event_settle): 50, 30, 20, and 5 for every other finisher. Coins come on top of the event's own.
export const PODIUM_PRIZES=Object.freeze([{coins:2000,diamonds:50},{coins:1000,diamonds:30},{coins:500,diamonds:20}]);
export const FINISHER_PRIZE=Object.freeze({coins:100,diamonds:5});
export const EVENT_DAY_DIAMONDS=50;
const MEDALS=['rank-gold','rank-silver','rank-bronze'];

// Sorts the server list into what the screen shows: the running event, the next one, rewards to collect and a
// short history. Pure, so it is easy to test.
export function eventView(events=[],now=Date.now()){
 const at=e=>({start:Date.parse(e.starts_at),end:Date.parse(e.ends_at)});
 const running=events.filter(e=>e.active&&at(e).start<=now&&at(e).end>now).sort((a,b)=>at(a).end-at(b).end);
 const upcoming=events.filter(e=>e.active&&at(e).start>now).sort((a,b)=>at(a).start-at(b).start);
 const ended=events.filter(e=>at(e).end<=now).sort((a,b)=>at(b).end-at(a).end);
 const owed=ended.filter(e=>e.player?.qualified&&!e.player.claimed_at);
 return {live:running[0]??null,next:upcoming[0]??null,owed,past:ended.filter(e=>!owed.includes(e)).slice(0,3)};
}
export function goalsDone(e,player=e.player){return e.objectives.every(o=>(player?.progress?.[o.stat]??0)>=o.target);}
// Mirrors the settlement rule in live-events.sql: every goal full, at least 3 contributions over 10 minutes.
export function hasQualified(e,player=e.player){return Boolean(player)&&goalsDone(e,player)&&player.actions>=MIN_ACTIONS&&Date.parse(player.last_at)-Date.parse(player.joined_at)>=MIN_SPAN;}
// What still stands between a farmer with every goal done and qualifying: 3 contributions, the last one at least 10 minutes after
// the first. One plain sentence.
export function qualifyHint(player,now=Date.now()){
 const more=Math.max(0,MIN_ACTIONS-(player?.actions??0)),wait=Math.max(0,Date.parse(player?.joined_at)+MIN_SPAN-now),min=Math.ceil(wait/60000);
 if(wait>0)return more>1?`${more} more farm actions, the last one after about ${min} min, and you qualify.`:`After about ${min} min, your next farm action qualifies you.`;
 return more>1?`${more} more farm actions and you qualify.`:'Your next farm action qualifies you.';
}
// Why this farm is not taking part yet, in one sentence — or null when it can.
export function eligibilityNote(eligibility,now=Date.now()){
 if(!eligibility)return null;
 if(eligibility.level<eligibility.minLevel)return `Farm events open at level ${eligibility.minLevel}. You are level ${eligibility.level}.`;
 return null;
}

export function createLiveEventsUI({state,notify,refreshFarm,document:doc=globalThis.document,bridge=globalThis.parent?.harvestBridge,now=farmNow}){
 const button=doc.getElementById('events-button'),dot=doc.getElementById('events-dot'),hint=doc.getElementById('mobile-events-hint'),entry=doc.querySelector('[data-menu-action="events-button"]');
 let locked=null;
 const dialog=doc.createElement('dialog');dialog.id='events-dialog';dialog.className='game-dialog wide-dialog events-dialog';dialog.setAttribute('aria-labelledby','events-title');doc.body.append(dialog);
 let data=null,busy=false,error='',reloadTimer=0,clock=0,background=0;

 const countdown=at=>`<span data-countdown="${at}">${formatDuration(at-now())}</span>`;
 // One list of what a farmer wins per place: the event's own coins plus the place's coins, and the place's fixed diamonds.
 const rewards=e=>{
  const {coins}=e.rewards;
  const row=(p,medal,place)=>`<li>${medal}<b>${place}</b><span>${art('coins')}${num(coins+p.coins)}</span><span>${art('diamonds')}${num(p.diamonds)}</span></li>`;
  return `<div class="event-podium"><span>What you win when you finish</span><ol>${PODIUM_PRIZES.map((p,i)=>row(p,art(MEDALS[i]),['1st','2nd','3rd'][i])).join('')}${row(FINISHER_PRIZE,'<i aria-hidden="true"></i>','Everyone else')}</ol></div>`;
 };
 // Goals use the Family Order line: picture, name, "41 / 60" and a bar.
 function goals(e,{preview=false}={}){
  return `<div class="family-order event-goals">${e.objectives.map(o=>{
   const goal=EVENT_GOALS[o.stat]??{label:o.stat,art:'quests'},value=Math.min(o.target,e.player?.progress?.[o.stat]??0),done=!preview&&value>=o.target;
   return `<article class="family-order-line ${done?'is-done':''}">${art(goal.art)}<div class="family-line-copy"><strong>${goal.label}</strong><span>${preview?`Goal: ${num(o.target)}`:done?'<span class="family-done">✓ Complete</span>':`${num(value)} / ${num(o.target)}`}</span>${preview?'':`<progress max="${o.target}" value="${value}" aria-label="${goal.label}"></progress>`}</div></article>`;
  }).join('')}</div>`;
 }
 function status(e){
  const blocked=eligibilityNote(data?.eligibility,now()),p=e.player;
  if(blocked)return `<p class="family-notice event-note is-blocked">${esc(blocked)}</p>`;
  if(hasQualified(e))return '<p class="family-notice event-note">You qualified! Collect your reward here when the event ends.</p>';
  if(p&&goalsDone(e))return `<p class="family-notice event-note">Every goal is complete. ${esc(qualifyHint(p,now()))}</p>`;
  if(p)return `<p class="family-notice event-note">You are taking part · ${num(p.actions)} contribution${p.actions===1?'':'s'} so far.</p>`;
  return '<p class="family-notice event-note">Just play your farm: harvesting, watering and collecting count automatically.</p>';
 }
 const intro=(e,when,live)=>`<div class="estate-intro event-intro"><span class="estate-icon">${art('live-events')}</span><div><span class="event-when ${live?'is-live':''}">${when}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></div></div>`;
 // The top 10 with what each farmer earns: exact after the event, "if it ended now" while it runs.
 function standings(e,{final=false}={}){
  const s=e?.standings;if(!s?.top?.length)return '';
  // A trophy only for someone who really finished in the top three. Every goal done but not qualified yet: "qualifying", and for
  // you the reward of the next free place (faded), so 100% never looks like nothing. Once the event is over (final) that farmer can no
  // longer qualify: "not qualified", without a prize.
  const next=PODIUM_PRIZES[s.top.filter(r=>r.finished).length]??FINISHER_PRIZE,{coins:base}=e.rewards??{coins:0};
  const soon=r=>r.isYou?`<span class="event-soon" title="When you qualify">${art('coins')}${num(base+next.coins)}${art('diamonds')}${num(next.diamonds)}<small>when you qualify</small></span>`:'<span class="event-qualifying">Qualifying</span>';
  const label=r=>r.podium?`${['1st','2nd','3rd'][r.rank-1]} place`:r.finished?'✓ Finished':r.progress>=100?(final?'All goals done, not qualified':'All goals done · qualifying'):`${r.progress}% done`;
  const row=r=>`<article class="family-list-row event-standing ${r.podium?`is-podium is-rank-${r.rank}`:''} ${r.isYou?'is-you':''}"><span class="event-rank">${r.podium?art(MEDALS[r.rank-1]):r.rank}</span><span class="family-member-portrait">${avatarImage(r.avatarId)}</span><div><strong>${esc(r.username)}${r.isYou?' (you)':''}</strong><span>${label(r)}</span></div><span class="event-standing-reward">${r.finished?`<b>${art('coins')}${num(r.coins)}</b>${r.diamonds?`<b>${art('diamonds')}${num(r.diamonds)}</b>`:''}`:r.progress>=100?(final?'':soon(r)):`<progress class="event-mini" max="100" value="${r.progress}" aria-label="${esc(r.username)}: ${r.progress}% done"></progress>`}</span></article>`;
  return `<h3 class="event-section-title">${final?`Final standings · ${esc(e.title)}`:'Top farmers'}</h3><p class="event-summary">${final?`${num(s.total)} farmer${s.total===1?'':'s'} took part.`:'Rewards if the event ended now. The first three to finish win a podium prize.'}</p><div class="family-member-list event-standings">${s.top.map(row).join('')}${s.you?`<p class="event-standings-gap" aria-hidden="true">···</p>${row(s.you)}`:''}</div>`;
 }
 function hero(){
  const {live,next}=eventView(data.events,now());
  if(live)return intro(live,`Live · ends in ${countdown(Date.parse(live.ends_at))}`,true)+`<p class="event-summary">${num(live.participants)} farmer${live.participants===1?'':'s'} taking part</p>`+goals(live)+rewards(live)+status(live)+standings(live);
  if(next){const blocked=eligibilityNote(data.eligibility,now());return intro(next,`Next event in ${countdown(Date.parse(next.starts_at))}`,false)+'<p class="event-summary">A short break between events. Here is what comes next.</p>'+goals(next,{preview:true})+rewards(next)+(blocked?`<p class="family-notice event-note is-blocked">${esc(blocked)}</p>`:'')+standings(data.events.find(e=>e.standings),{final:true});}
  return `<div class="quest-empty"><span class="estate-icon">${art('live-events')}</span><h3>The next farm event is on its way</h3><p>Check back soon.</p></div>`;
 }
 function collect(){
  const {owed}=eventView(data.events,now());
  if(!owed.length)return '';
  return `<h3 class="event-section-title is-first">Rewards to collect</h3>${owed.map(e=>`<article class="task-row"><div class="quest-row-heading"><h3>${esc(e.title)}</h3></div><p>You qualified. Your reward is ready.</p><div class="task-bottom"><span class="event-reward-amounts"><strong class="coin-reward">${art('coins')}${num(e.player.coins)} coins</strong>${e.player.diamonds?`<strong class="coin-reward">${art('diamonds')}${num(e.player.diamonds)} diamond${e.player.diamonds===1?'':'s'}</strong>`:''}</span><button class="primary-button" data-claim="${esc(e.id)}">Collect reward</button></div></article>`).join('')}<div class="event-divider"></div>`;
 }
 function history(){
  const {past}=eventView(data.events,now());
  if(!past.length)return '';
  const result=e=>!e.settled_at?'Results coming up':e.player?.claimed_at?`Collected · ${num(e.player.coins)} coins${e.player.paid_diamonds?` + ${num(e.player.paid_diamonds)} diamond${e.player.paid_diamonds===1?'':'s'}`:''}`:e.player?'Not qualified':'You did not take part';
  return `<h3 class="event-section-title">Recent events</h3><div class="family-member-list event-history">${past.map(e=>`<article class="family-list-row"><div><strong>${esc(e.title)}</strong><span>${result(e)}${e.settled_at?` · ${num(e.qualified)} of ${num(e.participants)} qualified`:''}</span></div></article>`).join('')}</div>`;
 }
 const rules=`<details class="family-extra event-rules"><summary>How farm events work<span>5 hours of play, then a 1-hour break</span></summary><ul><li>Complete every goal and contribute at least 3 times over 10 minutes to qualify.</li><li>Everyone who finishes wins; the sooner you finish, the more. The list above shows what each place wins in total.</li><li>You can collect at most ${EVENT_DAY_DIAMONDS} event diamonds a day.</li><li>Open from level ${EVENTS_LEVEL}.</li></ul></details>`;
 function render(){
  const heading='<div class="dialog-heading"><div><span class="eyebrow">PLAY TOGETHER, FOR A LITTLE WHILE</span><h2 id="events-title">Farm events</h2></div><button class="icon-button close-dialog" data-close aria-label="Close"><i data-lucide="x"></i></button></div>';
  dialog.innerHTML=heading+(data?collect()+hero()+history()+rules:`<p class="event-loading">${esc(error||'Opening farm events…')}</p>`)+'<p class="event-feedback" role="status" data-status></p>';
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b));
  refreshArt();
 }
 async function claim(b){
  if(busy)return;busy=true;b.disabled=true;
  try{const r=await bridge.request({operation:'events',command:'claim',eventId:b.dataset.claim});notify?.(r.reward.message);await refreshFarm?.();await load();}
  catch(e){dialog.querySelector('[data-status]').textContent=e.message;b.disabled=false;}
  finally{busy=false;}
 }
 // The button's dot and the More-menu hint: a reward waiting, or when the current/next event ends/starts.
 function badge(){
  if(!data||locked)return;
  const {live,next,owed}=eventView(data.events,now());
  if(dot)dot.hidden=!owed.length;
  if(hint)hint.textContent=owed.length?'A reward is waiting':live?`Live · ${formatDuration(Date.parse(live.ends_at)-now())} left`:next?`Next in ${formatDuration(Date.parse(next.starts_at)-now())}`:'Short shared goals';
  if(button)button.setAttribute('aria-label',owed.length?'Open farm events, a reward is waiting':'Open farm events');
 }
 async function load(){
  try{data=await bridge.request({operation:'events'});error='';}catch(e){error=e.message;if(!data)throw e;}
  badge();if(dialog.open)render();
 }
 function tick(){
  let due=false;
  dialog.querySelectorAll('[data-countdown]').forEach(el=>{const left=Number(el.dataset.countdown)-now();if(left<=0)due=true;el.textContent=formatDuration(left);});
  if(due&&!busy)load().catch(()=>{});
 }
 async function open(){
  doc.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});
  render();if(!dialog.open)dialog.showModal();
  clearInterval(clock);clearInterval(reloadTimer);clock=setInterval(tick,1000);reloadTimer=setInterval(()=>{if(!busy)load().catch(()=>{});},30000);
  try{await load();}catch(e){error=e.message;render();}
 }
 dialog.addEventListener('close',()=>{clearInterval(clock);clearInterval(reloadTimer);});
 if(button)button.onclick=open;
 // Below level 15 (EVENTS_LEVEL), the same rule as every other locked feature: the desktop side tool is simply not there yet, while the
 // More-menu card stays visible, greyed and unclickable, with the level it needs.
 function refresh(){
  const next=Boolean(state)&&levelOf(state)<EVENTS_LEVEL;if(next===locked)return;locked=next;
  if(button)button.hidden=locked;
  if(entry){entry.disabled=locked;entry.classList.toggle('locked',locked);entry.style.order=locked?String(100+EVENTS_LEVEL):'';entry.setAttribute('aria-disabled',String(locked));if(locked)entry.title=`Reach level ${EVENTS_LEVEL} to unlock farm events.`;else entry.removeAttribute('title');}
  if(locked){if(dot)dot.hidden=true;if(hint)hint.textContent=`Reach level ${EVENTS_LEVEL}.`;}
  else if(data)badge();else if(hint)hint.textContent='Short shared goals';
  if(!locked)setTimeout(quiet,3000);
 }
 // A light background check for the dot and the More hint: shortly after the farm opens, then every 10 minutes.
 const quiet=()=>{if(!locked&&!dialog.open&&!doc.hidden)load().catch(()=>{});};
 refresh();background=setInterval(quiet,600000);
 return {open,load,refresh,dispose(){clearInterval(background);clearInterval(clock);clearInterval(reloadTimer);}};
}

