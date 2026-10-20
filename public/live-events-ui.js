import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {vipBadge,refreshVipBadges} from './vip-ui.js';
import {farmNow} from './farm-client.js';
import {placeLabel} from './place-label.js';
import {skeleton} from './skeleton.js';
import {formatDuration,levelOf,EVENT_LEAGUES,eventLeague,eventLeagueOf,eventPrizes,HOUR_EVENT_REWARDS,WORLD_TWO_LEVEL} from './farm-state.js';
import {keepFolds} from './keep-folds.js';
import {ownWords,ownText} from './i18n.js';
// Farm events: a new event every hour, 55 minutes of play, then 5 minutes for the prizes (20 Oct 2026; 5 hours and a 1-hour
// break before). The Events button sits next to Quests on desktop and in the More menu on phones; the screen shows the running
// event, or the next one in the gap, plus any reward still waiting to be collected.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
export const EVENT_GOALS={harvested:{label:'Harvest crops',art:'harvest'},produced:{label:'Collect batches',art:'buildings'},watered:{label:'Water fields',art:'water'},tended:{label:'Care for fields',art:'care'},chores:{label:'Finish chores',art:'chores'},deliveries:{label:'Complete deliveries',art:'cart'},
 harvest_wheat:{label:'Harvest wheat',art:'wheat'},harvest_corn:{label:'Harvest corn',art:'corn'},harvest_lettuce:{label:'Harvest lettuce',art:'lettuce'},harvest_barley:{label:'Harvest barley',art:'barley'},harvest_greenbeans:{label:'Harvest green beans',art:'greenbeans'},harvest_cabbage:{label:'Harvest cabbage',art:'cabbage'},made_eggs:{label:'Collect eggs',art:'eggs'},
 // The mixed events (supabase/live-events-mixed.sql, 26 Sep 2026): 30 kinds of goal, three drawn per event.
 planted:{label:'Plant fields',art:'seeds'},fertilized:{label:'Fertilize fields',art:'fertilizer'},harvest_cauliflower:{label:'Harvest cauliflower',art:'cauliflower'},
 made_feed:{label:'Make animal feed',art:'feed'},made_milk:{label:'Make milk',art:'milk'},made_cheese:{label:'Make cheese',art:'cheese'},made_flour:{label:'Make flour',art:'flour'},made_grainmeal:{label:'Make grain meal',art:'grainmeal'},made_bread:{label:'Bake bread',art:'bread'},parallel_batches:{label:'Start batches side by side',art:'buildings'},
 sold:{label:'Sell at the market',art:'market'},earned:{label:'Earn coins',art:'coins'},coins_spent:{label:'Spend coins',art:'coins'},diamonds_spent:{label:'Spend diamonds',art:'diamonds'},boosts_used:{label:'Use a boost',art:'boost'},sold_wheat:{label:'Sell wheat',art:'wheat'},
 activities:{label:'Lend a helping hand',art:'helping-hand'},activity_rounds:{label:'Finish a helping-hand round',art:'helping-hand'},upgrades:{label:'Upgrade buildings',art:'hammer'},
 // The goals of the higher leagues (public/event-goals.js, 1 Oct 2026).
 glasshouse_batches:{label:'Collect Glasshouse crates',art:'glasshouse'},valley_baskets:{label:'Sell Valley Market baskets',art:'valley-market'},
 made_pie:{label:'Bake pies',art:'pie'},made_stew:{label:'Cook stew',art:'stew'},made_applejuice:{label:'Press apple juice',art:'applejuice'},made_orchardjuice:{label:'Make orchard juice',art:'orchardjuice'},
 made_berrypreserves:{label:'Make berry preserves',art:'berrypreserves'},made_truffles:{label:'Find truffles',art:'truffles'},made_honey:{label:'Collect honey',art:'honey'},made_wool:{label:'Shear wool',art:'wool'},
 made_yarn:{label:'Spin yarn',art:'yarn'},made_cloth:{label:'Weave cloth',art:'cloth'},made_squashsoup:{label:'Cook squash soup',art:'squashsoup'},made_goatmilk:{label:'Milk the goats',art:'goatmilk'},
 made_goatcheese:{label:'Make goat cheese',art:'goatcheese'},made_candles:{label:'Pour candles',art:'candles'},made_cider:{label:'Press cider',art:'cider'},made_cherryjam:{label:'Make cherry jam',art:'cherryjam'},
 made_salad:{label:'Make fresh salads',art:'salad'},made_vegetables:{label:'Pack vegetable boxes',art:'vegetables'},made_pickles:{label:'Make pickles',art:'pickles'},made_fertilizer:{label:'Make natural fertilizer',art:'fertilizer'},
 sold_eggs:{label:'Sell eggs',art:'eggs'},made_oil:{label:'Press sunflower oil',art:'oil'},made_beangratin:{label:'Bake bean gratin',art:'beangratin'},made_applepie:{label:'Bake apple pies',art:'applepie'},
 made_berrysmoothie:{label:'Make berry smoothies',art:'berrysmoothie'},made_applecompote:{label:'Make apple compote',art:'applecompote'},made_pickledbeans:{label:'Pickle green beans',art:'pickledbeans'},
 made_orchardsalad:{label:'Make orchard salads',art:'orchardsalad'},made_truffleomelette:{label:'Cook truffle omelettes',art:'truffleomelette'},made_berrycheesecake:{label:'Bake berry cheesecakes',art:'berrycheesecake'},
 tractor:{label:'Tractor jobs',art:'tractor'},sold_cheese:{label:'Sell cheese',art:'cheese'},
 // The village leagues' goals (public/event-goals.js VILLAGE_KINDS, 20 Oct 2026).
 made_stone:{label:'Dig stone',art:'stone'},made_ironore:{label:'Dig iron ore',art:'ironore'},made_timber:{label:'Chop logs',art:'timber'},made_plank:{label:'Saw planks',art:'plank'},
 made_ironbar:{label:'Smelt iron bars',art:'ironbar'},made_pickaxe:{label:'Forge pickaxes',art:'pickaxe'},made_clay:{label:'Dig clay',art:'clay'},made_rooftile:{label:'Fire roof tiles',art:'rooftile'},
 made_packedlunch:{label:'Pack lunches',art:'packedlunch'},made_potatoes:{label:'Grow potatoes',art:'potatoes'},made_flax:{label:'Grow flax',art:'flax'},made_lavender:{label:'Grow lavender',art:'lavender'},
 made_linen:{label:'Weave linen',art:'linen'},made_builderscrate:{label:'Pack builder’s crates',art:'builderscrate'},made_lavendersoap:{label:'Make lavender soap',art:'lavendersoap'},
 made_scentedsachet:{label:'Sew scented sachets',art:'scentedsachet'},made_silvercandlestick:{label:'Make silver candlesticks',art:'silvercandlestick'},made_rubyring:{label:'Set ruby rings',art:'rubyring'},
 village_batches:{label:'Collect village batches',art:'village-badge'},village_requests:{label:'Help villagers',art:'villagemarket'},lake_fish:{label:'Catch lake fish',art:'villagelake'}};
// Same level as the server gate (player_stats.level>=15, live-events-mixed.sql; 10 until 26 Sep 2026, when spending diamonds, which
// opens at 14, became a goal): below it the button stays visible but greyed.
export const EVENTS_LEVEL=15;
// What each place wins comes from the event itself (eventPrizes in farm-state.js, 20 Oct 2026): an hourly event pays 8 / 5 / 3 / 1
// diamonds and (50 + 500 / 250 / 125 / 25) coins × the league (the first hourly events paid no coins), a 6-hour event from before kept
// its coins × the league and 25 / 15 / 10 / 3 diamonds. The same rule as harvest_event_settle and
// farm-api's eventStandings. No daily limit on event diamonds since 28 Sep 2026 (supabase/live-events-no-day-cap.sql).
// In the last 5 minutes of an hour the prizes of the event that just ended are handed out (the cron job at :55).
const GAP_MS=5*60000;
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
// Mirrors the settlement rule (live-events-finish.sql, 30 Sep 2026): every goal full is finished, the first to get there wins most.
// (Until then a finisher also needed 3 contributions over 10 minutes.)
export function hasQualified(e,player=e.player){return Boolean(player)&&goalsDone(e,player);}
// Why this farm is not taking part yet, in one sentence — or null when it can.
export function eligibilityNote(eligibility,now=Date.now()){
 if(!eligibility)return null;
 if(eligibility.level<eligibility.minLevel)return `Events open at level ${eligibility.minLevel}. You are level ${eligibility.level}.`;
 return null;
}

export function createLiveEventsUI({state,notify,refreshFarm,document:doc=globalThis.document,bridge=globalThis.parent?.harvestBridge,now=farmNow}){
 const button=doc.getElementById('events-button'),dot=doc.getElementById('events-dot'),hint=doc.getElementById('mobile-events-hint'),entry=doc.querySelector('[data-menu-action="events-button"]');
 let locked=null;
 // A running event you have not joined or opened yet lights the dot too (30 Sep 2026: players forgot an event was on; joining counts
 // since the hourly events of 20 Oct 2026). Opening the screen marks it seen until the next event; kept in this browser only. Not when
 // you cannot take part or have already finished.
 const SEEN_KEY='harvest-tycoon:event-seen';
 const seenId=()=>{try{return globalThis.localStorage?.getItem(SEEN_KEY)??null;}catch{return null;}};
 const markSeen=id=>{try{globalThis.localStorage?.setItem(SEEN_KEY,String(id));}catch{}};
 const unseen=live=>Boolean(live)&&!live.player&&!hasQualified(leagueGoals(live))&&!eligibilityNote(data?.eligibility,now())&&seenId()!==String(live.id);
 const seeLive=()=>{if(!data)return;const {live}=eventView(data.events,now());if(live)markSeen(live.id);};
 const dialog=doc.createElement('dialog');dialog.id='events-dialog';dialog.className='game-dialog wide-dialog events-dialog is-sheet is-m';dialog.setAttribute('aria-labelledby','events-title');doc.body.append(dialog);
 let data=null,busy=false,error='',reloadTimer=0,clock=0,background=0,turn=0;

 const countdown=at=>`<span data-countdown="${at}">${formatDuration(at-now())}</span>`;
 // Your league (1 Oct 2026, farm-state.js EVENT_LEAGUES): the server's for the event it shows standings for, otherwise the one stored
 // on your row when you joined the event (20 Oct 2026, the owner: you finish it in that league, also when you level up), otherwise
 // your level's (eventLeagueOf), within the leagues the event was made with and at most the Valley Legends when you first counted in it
 // below level 100. So a new site against an event from before the village leagues shows the Valley Legends, never the Sprout
 // League's goals, and an older farm-api (no league on a running event's row) still gives your level's, as before.
 const leagueOf=e=>{const s=e?.standings?.league,own=eventLeagueOf(e,e?.player,levelOf(state));return s?EVENT_LEAGUES.find(l=>l.id===s.id)??own:own;};
 // The title of your own league's goals (20 Oct 2026): rewards to collect, recent events and final standings name it, not the Sprout League's.
 const ownTitle=e=>e.leagues?.[Number.isInteger(e.player?.league)?e.player.league:leagueOf(e).index]?.title??e.title;
 const leagueRange=l=>l.to?`Levels ${l.from}–${l.to}`:`Level ${l.from}+`;
 // The league's own goals and title (live-event-league-goals.sql); an event without them has one set for everyone.
 const leagueGoals=e=>{const own=e?.leagues?.[leagueOf(e).index];return own?{...e,title:own.title,description:own.description,objectives:own.objectives}:e;};
 // Its name and levels, and under them how much its coins are worth when the event pays coins (the first hourly events of 20 Oct
 // 2026 paid none, so no coins line for them).
 const leagueCard=(l,coins)=>`<div class="event-league"><img src="/assets/icons/league-${l.id}.webp" alt="" width="56" height="56" draggable="false"><div><span>Your league</span><strong>${l.name}</strong><small>${leagueRange(l)}</small>${coins?`<small>Coins ×${l.coins}</small>`:''}</div></div>`;
 // One list of what a farmer wins per place, from the event's own prizes (eventPrizes): its coins plus the place's, × the league, and
 // the place's diamonds. No coins column for an event that pays none (the first hourly events of 20 Oct 2026).
 const rewards=e=>{
  const prize=eventPrizes(e.rewards),league=leagueOf(e),fam=prize.family,coins=prize.paysCoins;
  const row=(p,medal,place)=>`<li>${medal}<b>${place}</b>${coins?`<span>${art('coins')}${num((prize.coins+p.coins)*league.coins)}</span>`:''}<span>${art('diamonds')}${num(p.diamonds)}</span></li>`;
  // One sentence for an hourly event, no picture inside it (20 Oct 2026: a picture cut it in two, and "{0} more." read badly on its
  // own). The family coins are flat: the same in every league.
  const bonus=!prize.hour?`Family bonus: when ${fam.finishers} or more of your Farm Family finish, you each get ${art('coins')}${num(fam.coins)} and ${art('diamonds')}${num(fam.diamonds)} more.`
   :fam.coins?`Family bonus: when ${fam.finishers} or more of your Farm Family finish, you each get ${num(fam.coins)} coins and ${num(fam.diamonds)} diamonds more.`
   :`Family bonus: when ${fam.finishers} or more of your Farm Family finish, you each get ${num(fam.diamonds)} diamonds more.`;
  return `${leagueCard(league,coins)}<div class="event-podium ${coins?'':'no-coins'}"><span>What you win when you finish</span><ol>${prize.podium.map((p,i)=>row(p,art(MEDALS[i]),placeLabel(i+1))).join('')}${row(prize.finisher,'<i aria-hidden="true"></i>','Everyone else')}</ol><p class="event-family-bonus">${art('family-members')}<span>${bonus}</span></p></div>`;
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
  if(hasQualified(e))return '<p class="family-notice event-note">You finished! Collect your reward here when the event ends.</p>';
  if(p)return `<p class="family-notice event-note">You are taking part · ${num(p.actions)} contribution${p.actions===1?'':'s'} so far.</p>`;
  return leagueOf(e).world===2?'<p class="family-notice event-note">Just play: digging, sawing, packing lunches, helping villagers and fishing on the lake count automatically.</p>':'<p class="family-notice event-note">Just play your farm: harvesting, watering and collecting count automatically.</p>';
 }
 const intro=(e,when,live)=>`<div class="estate-intro event-intro"><span class="estate-icon">${art('live-events')}</span><div><span class="event-when ${live?'is-live':''}">${when}</span><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></div></div>`;
 // The top 10 with what each farmer earns: exact after the event, "if it ended now" while it runs.
 function standings(e,{final=false}={}){
  const s=e?.standings;if(!s?.top?.length)return '';
  // Every goal done is finished: the first three get a trophy, everyone else who finished a tick. Each row shows the server's coins
  // and diamonds for that place.
  const label=r=>r.podium?placeLabel(r.rank):r.finished?'✓ Finished':`${r.progress}% done`;
  const row=r=>`<article class="family-list-row event-standing ${r.podium?`is-podium is-rank-${r.rank}`:''} ${r.isYou?'is-you':''}"><span class="event-rank">${r.podium?art(MEDALS[r.rank-1]):r.rank}</span><button type="button" class="event-standing-who" data-event-profile="${esc(r.playerId)}" aria-label="${esc(ownText(`Open ${r.username}’s profile`,[r.username]))}"><span class="family-member-portrait">${avatarImage(r.avatarId)}</span><div><strong>${ownWords(r.username)}${vipBadge(r.vipExpiresAt,farmNow())}${r.isYou?' (you)':''}</strong><span>${label(r)}</span></div></button><span class="event-standing-reward">${r.finished?`${r.coins?`<b>${art('coins')}${num(r.coins)}</b>`:''}${r.diamonds?`<b>${art('diamonds')}${num(r.diamonds)}</b>`:''}`:`<progress class="event-mini" max="100" value="${r.progress}" translate="no" aria-label="${esc(ownText(`${r.username}: ${r.progress}% done`,[r.username]))}"></progress>`}</span></article>`;
  const league=s.league?leagueOf(e).name:'';
  return `<h3 class="event-section-title">${final?`Final standings · ${esc(ownTitle(e))}`:'Top farmers'}</h3>${league?`<p class="event-league-name">${league}</p>`:''}<p class="event-summary">${final?`${num(s.total)} farmer${s.total===1?'':'s'} took part.`:eventPrizes(e.rewards).paysCoins?'Prizes if the event ended now. The first three to finish in your league win the most coins and diamonds.':'Prizes if the event ended now. The first three to finish in your league win the most diamonds.'}</p><div class="family-member-list event-standings">${s.top.map(row).join('')}${s.you?`<p class="event-standings-gap" aria-hidden="true">···</p>${row(s.you)}`:''}</div>`;
 }
 function hero(){
  // Each league sees its own title and goals (1 Oct 2026).
  const view=eventView(data.events,now()),live=view.live&&leagueGoals(view.live),next=view.next&&leagueGoals(view.next);
  if(live)return intro(live,`Live · ends in ${countdown(Date.parse(live.ends_at))}`,true)+`<p class="event-summary">${num(live.participants)} farmer${live.participants===1?'':'s'} taking part</p>`+goals(live)+rewards(live)+status(live)+standings(live);
  if(next){const blocked=eligibilityNote(data.eligibility,now());return intro(next,`Next event in ${countdown(Date.parse(next.starts_at))}`,false)+`<p class="event-summary">${Date.parse(next.starts_at)-now()<=GAP_MS?'The prizes are being handed out. Here is what comes next.':'No event right now. Here is what comes next.'}</p>`+goals(next,{preview:true})+rewards(next)+(blocked?`<p class="family-notice event-note is-blocked">${esc(blocked)}</p>`:'')+standings(data.events.find(e=>e.standings),{final:true});}
  return `<div class="quest-empty"><span class="estate-icon">${art('live-events')}</span><h3>The next event is on its way</h3><p>Check back soon.</p></div>`;
 }
 function collect(){
  const {owed}=eventView(data.events,now());
  if(!owed.length)return '';
  return `<h3 class="event-section-title is-first">Rewards to collect</h3>${owed.map(e=>`<article class="task-row"><div class="quest-row-heading"><h3>${esc(ownTitle(e))}</h3></div><p>You finished. Your reward is ready.</p><div class="task-bottom"><span class="event-reward-amounts">${e.player.coins>0?`<strong class="coin-reward">${art('coins')}${num(e.player.coins)} coins</strong>`:''}${e.player.diamonds?`<strong class="coin-reward">${art('diamonds')}${num(e.player.diamonds)} diamond${e.player.diamonds===1?'':'s'}</strong>`:''}</span><button class="primary-button" data-claim="${esc(e.id)}">Collect reward</button></div></article>`).join('')}<div class="event-divider"></div>`;
 }
 function history(){
  const {past}=eventView(data.events,now());
  if(!past.length)return '';
  // The first hourly events paid no coins (20 Oct 2026): then only their diamonds. One text without " · " inside (20 Oct 2026, the
  // hourly coins): "{0} · {1} of {2} finished" is then looked up whole, so every word of it is translated ("Collected · 75 coins +
  // 1 diamond · 22 of 58 finished" was taken apart at its dots and left "coins" and "finished" in English).
  const collected=p=>p.coins>0?p.paid_diamonds?`Collected ${num(p.coins)} coins and ${num(p.paid_diamonds)} diamond${p.paid_diamonds===1?'':'s'}`:`Collected ${num(p.coins)} coins`
   :p.paid_diamonds?`Collected ${num(p.paid_diamonds)} diamond${p.paid_diamonds===1?'':'s'}`:'Collected';
  const result=e=>!e.settled_at?'Results coming up':e.player?.claimed_at?collected(e.player):e.player?'Not finished':'You did not take part';
  return `<h3 class="event-section-title">Recent events</h3><div class="family-member-list event-history">${past.map(e=>`<article class="family-list-row"><div><strong>${esc(ownTitle(e))}</strong><span>${result(e)}${e.settled_at?` · ${num(e.qualified)} of ${num(e.participants)} finished`:''}</span></div></article>`).join('')}</div>`;
 }
 // The leagues of the world of the league card on screen (20 Oct 2026), so the window never contradicts itself: below level 100 the six
 // farm leagues; from 100 the six village leagues, unless the event keeps you in the Valley Legends (an event from before the village
 // leagues, or you joined it below 100: your league is set when you join, 20 Oct 2026).
 // The rules of the hourly events (20 Oct 2026), with the prizes of the event on screen, or the hourly ones: with coins when it pays
 // them (the first hourly events paid diamonds only).
 const rules=()=>{
  const view=eventView(data.events,now()),shown=view.live??view.next,world=(shown?leagueOf(shown):eventLeague(levelOf(state))).world;
  const own=shown&&eventPrizes(shown.rewards),prize=own?.hour?own:eventPrizes(HOUR_EVENT_REWARDS),[first,second,third]=prize.podium.map(p=>num(p.diamonds));
  return `<details class="family-extra event-rules" data-fold="how-events"><summary>How events work<span>A new event every hour</span></summary><ul><li>A new event starts every hour, on the hour. You play for 55 minutes; in the last 5 minutes the prizes are handed out.</li><li>Each event has one goal. Reach it and you have finished.</li><li>The first three to finish in your league win ${first}, ${second} and ${third} diamonds. Everyone else who finishes wins ${num(prize.finisher.diamonds)} diamond${prize.finisher.diamonds===1?'':'s'}.</li>${prize.paysCoins?'<li>Everyone who finishes wins coins too; the sooner you finish, the more.</li>':''}<li>You race in your league, against farmers of about your level. Your league is set when you join an event (your first action that counts), and you finish that event in that league, even if you level up.<span class="event-league-list">${EVENT_LEAGUES.filter(l=>l.world===world).map(l=>`<span><img src="/assets/icons/league-${l.id}.webp" alt="" width="28" height="28" draggable="false"><b>${l.name}</b><small>${leagueRange(l)}</small></span>`).join('')}</span></li>${world===2?`<li>From level ${WORLD_TWO_LEVEL} your league is a village league, with goals in the village. Each village event you finish counts in Village events and in Events finished.</li>`:''}<li>${prize.paysCoins?'Each league has its own top 10 and podium. Diamonds are the same in every league; higher leagues win more coins. The family bonus counts family members from every league.':'Each league has its own top 10 and podium. The prizes are the same in every league. The family bonus counts family members from every league.'}</li><li>Open from level ${EVENTS_LEVEL}.</li></ul></details>`;
 };
 function render(){
  const heading='<div class="dialog-heading">'+art('live-events','dialog-badge')+'<div class="dialog-titles"><h2 id="events-title">Events</h2></div><button class="icon-button close-dialog" data-close aria-label="Close"><i data-lucide="x"></i></button></div>';
  // Drawn anew every 30 seconds and when a countdown ends: How events work stays as the player left it (16 Oct 2026, public/keep-folds.js).
  keepFolds(dialog,heading+(data?collect()+hero()+history()+rules():error?`<p class="event-loading">${esc(error)}</p>`:skeleton('Opening events…',{hero:true,rows:3,avatar:false}))+'<p class="event-feedback" role="status" data-status></p>');
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b));
  // A farmer in the standings opens their profile on top of the event; its back button returns here (26 Sep 2026).
  dialog.querySelectorAll('[data-event-profile]').forEach(b=>b.onclick=()=>window.harvestProfiles?.open(b.dataset.eventProfile,{back:'Back to the event'}));
  refreshVipBadges(dialog,farmNow());
  refreshArt();
 }
 async function claim(b){
  if(busy)return;busy=true;b.disabled=true;
  try{const r=await bridge.request({operation:'events',command:'claim',eventId:b.dataset.claim});notify?.(r.reward.message);await refreshFarm?.();await load();}
  catch(e){dialog.querySelector('[data-status]').textContent=e.message;b.disabled=false;}
  finally{busy=false;}
 }
 // The button's dot and the More-menu hint: a reward waiting or an event you have not joined or seen yet, and when the current/next
 // event ends/starts. The next event is already in the list (made 2 hours ahead), so one timer lights the dot when it starts, with no
 // request on the hour (20 Oct 2026).
 function badge(){
  if(!data||locked)return;
  const {live,next,owed}=eventView(data.events,now()),fresh=unseen(live);
  clearTimeout(turn);const at=next?Date.parse(next.starts_at):0;if(at>now())turn=setTimeout(badge,at-now()+1000);
  if(dot)dot.hidden=!owed.length&&!fresh;
  if(hint)hint.textContent=owed.length?'A reward is waiting':live?`Live · ${formatDuration(Date.parse(live.ends_at)-now())} left`:next?`Next in ${formatDuration(Date.parse(next.starts_at)-now())}`:'A new event every hour';
  if(button)button.setAttribute('aria-label',owed.length?'Open events, a reward is waiting':fresh?'Open events, an event is running':'Open events');
 }
 async function load(){
  try{data=await bridge.request({operation:'events'});error='';}catch(e){error=e.message;if(!data)throw e;}
  if(dialog.open)seeLive();
  badge();if(dialog.open)render();
 }
 function tick(){
  let due=false;
  dialog.querySelectorAll('[data-countdown]').forEach(el=>{const left=Number(el.dataset.countdown)-now();if(left<=0)due=true;el.textContent=formatDuration(left);});
  if(due&&!busy)load().catch(()=>{});
 }
 async function open(){
  doc.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});
  render();if(!dialog.open)dialog.showModal();seeLive();badge();
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
  if(entry){entry.disabled=locked;entry.classList.toggle('locked',locked);entry.style.order=locked?String(100+EVENTS_LEVEL):'';entry.setAttribute('aria-disabled',String(locked));if(locked)entry.title=`Reach level ${EVENTS_LEVEL} to unlock events.`;else entry.removeAttribute('title');}
  if(locked){if(dot)dot.hidden=true;if(hint)hint.textContent=`Reach level ${EVENTS_LEVEL}.`;}
  else if(data)badge();else if(hint)hint.textContent='A new event every hour';
  if(!locked)setTimeout(quiet,3000);
 }
 // A light background check for the dot and the More hint: shortly after the farm opens, then every 10 minutes.
 const quiet=()=>{if(!locked&&!dialog.open&&!doc.hidden)load().catch(()=>{});};
 refresh();background=setInterval(quiet,600000);
 return {open,load,refresh,dispose(){clearInterval(background);clearInterval(clock);clearInterval(reloadTimer);clearTimeout(turn);}};
}

