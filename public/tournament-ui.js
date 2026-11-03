import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {vipBadge,refreshVipBadges} from './vip-ui.js';
import {familyBadge,loadFamilies} from './family-badge.js';
import {farmNow} from './farm-client.js';
import {skeleton} from './skeleton.js';
import {formatDuration,CROPS,ITEMS} from './farm-state.js';
import {keepFolds} from './keep-folds.js';
import {ownWords,ownText} from './i18n.js';
import {placeLabel} from './place-label.js';
import {hintsButton} from './dialog-shell.js';
import {TOURNAMENT_KINDS,TOURNAMENT_DEFAULTS,TOURNAMENT_PRIZE_MAX,TOURNAMENT_WIDE_FROM} from './tournament.js';
// The Super Tournament's screen (3 Nov 2026, the owner; rules in tournament.js, farm-api tournament-service.js). Its button (the finish
// flag) sits with the passes in the header, and its tile in the More menu on phones; both show only while a tournament runs, the
// last one ended less than 2 days ago, or a prize waits. The screen: the kind and its rule, the time left, the pot and its places, your
// score and place, the top 20 with what each would win, and the prizes to collect. How it works folds open with every rule.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const MEDALS=['rank-gold','rank-silver','rank-bronze'];
const SEEN_KEY='harvest-tycoon:tournament-seen';
export const pickName=t=>t?.pick?(CROPS[t.pick]?.name??ITEMS[t.pick]?.name??null):null;
export const pickArt=t=>t?.pick?art(t.pick):'';
// A kind's own title is translated like every game text; a title the admin wrote stays as written.
const DEFAULT_TITLES=new Set(Object.values(TOURNAMENT_KINDS).map(k=>k.title));
export const titleHtml=title=>DEFAULT_TITLES.has(title)?esc(title):ownWords(title);
// What a prize pays, as words (one text each, so the translation finds it whole).
export function prizeWords(p){
 const d=Number(p?.diamonds)||0,c=Number(p?.coins)||0;
 return d&&c?`${num(d)} diamond${d===1?'':'s'} and ${num(c)} coins`:d?`${num(d)} diamond${d===1?'':'s'}`:c?`${num(c)} coins`:'';
}
export function createTournamentUI({notify,refreshFarm,onClaimed,document:doc=globalThis.document,bridge=globalThis.parent?.harvestBridge,now=farmNow}){
 const button=doc.getElementById('tournament-button'),dot=doc.getElementById('tournament-dot'),tile=doc.getElementById('tournament-menu-entry'),hint=doc.getElementById('tournament-menu-hint');
 const dialog=doc.createElement('dialog');dialog.id='tournament-dialog';dialog.className='game-dialog wide-dialog events-dialog tournament-dialog is-sheet is-m';dialog.setAttribute('aria-labelledby','tournament-title');doc.body.append(dialog);
 let data=null,error='',busy=false,timer=0,clock=0,background=0;
 const seen=()=>{try{return globalThis.localStorage?.getItem(SEEN_KEY)??'';}catch{return '';}};
 const markSeen=id=>{try{globalThis.localStorage?.setItem(SEEN_KEY,String(id));}catch{}};
 const t=()=>data?.tournament??null;
 const live=()=>Boolean(t()?.running)&&Date.parse(t().endsAt)>now();
 // The button and the tile: shown while there is something to see; the "!" for a prize to collect, or a new tournament not opened yet.
 function badge(){
  const show=Boolean(t()||data?.owed?.length),alert=Boolean(data?.owed?.length)||(live()&&seen()!==String(t().id));
  for(const el of [button,tile])if(el)el.hidden=!show;
  if(dot)dot.hidden=!alert;tile?.classList.toggle('has-dot',alert);
  if(hint)hint.textContent=live()?`Ends in ${formatDuration(Date.parse(t().endsAt)-now())}`:data?.owed?.length?'Your prize is ready':'Results';
 }
 async function load(){
  if(!bridge?.request)return;
  try{const r=await bridge.request({operation:'tournament'});if(r?.error)throw Error(r.error);data=r;error='';}
  catch(e){error=data?'':e?.message||'The tournament could not be loaded.';}
  badge();if(dialog.open)render();
  // A prize waiting opens the screen once by itself (the result pop-up), at most once per tournament in this browser.
  const owed=data?.owed?.[0];if(owed&&!dialog.open&&seenPrize()!==owed.tournamentId){markPrize(owed.tournamentId);open();}
 }
 const PRIZE_KEY='harvest-tycoon:tournament-prize-seen';
 const seenPrize=()=>{try{return globalThis.localStorage?.getItem(PRIZE_KEY)??'';}catch{return '';}};
 const markPrize=id=>{try{globalThis.localStorage?.setItem(PRIZE_KEY,String(id));}catch{}};

 const countdown=at=>`<span data-countdown="${at}">${formatDuration(at-now())}</span>`;
 function collect(){
  if(!data?.owed?.length)return '';
  return `<div class="event-collect-list">${data.owed.map(o=>`<article class="event-collect tournament-collect">${art('tournament-winner')}<div><h3>${titleHtml(o.title)}</h3><p>You finished #${o.place}. Your prize is ready.</p><span class="event-reward-amounts">${o.coins>0?`<strong class="coin-reward">${art('coins')}${num(o.coins)}</strong>`:''}${o.diamonds>0?`<strong class="diamond-reward">${art('diamonds')}${num(o.diamonds)}</strong>`:''}</span></div><button type="button" class="primary-button" data-claim="${esc(o.tournamentId)}">Collect</button></article>`).join('')}</div>`;
 }
 function hero(){
  const x=t();if(!x)return `<div class="quest-empty"><span class="estate-icon">${art('tournament')}</span><h3>No tournament right now</h3><p>A new Super Tournament comes soon. You hear it in News.</p></div>`;
  const kind=TOURNAMENT_KINDS[x.kind],running=live(),name=pickName(x);
  const when=running?`Ends in ${countdown(Date.parse(x.endsAt))}`:'Ended';
  const pick=name?`<p class="tournament-pick">${pickArt(x)}<strong>${esc(name)}</strong></p>`:'';
  return `<section class="event-hero tournament-hero"><div class="event-hero-top"><span class="event-when ${running?'is-live':''}">${when}</span><span class="event-count">${num(x.participants)} farmer${x.participants===1?'':'s'} taking part</span></div><div class="tournament-head">${art(running?'tournament':'tournament-winner','tournament-flag')}<div><h3>${titleHtml(x.title)}</h3><p class="event-hero-text">${esc(kind?.rule??'')}</p>${pick}</div></div>${you(x,running)}</section>`;
 }
 function you(x,running){
  const y=x.you,min=x.settings?.minScore??TOURNAMENT_DEFAULTS.minScore;
  if(!y)return `<p class="family-notice event-note">${running?'You take part as soon as you score your first point.':'You did not take part.'}</p>`;
  const prize=prizeWords(y);
  const line=!y.counts?`You have ${num(y.score)} point${y.score===1?'':'s'}. From ${num(min)} points you count for the pot and can win.`
   :running?(prize?`You are #${y.rank} with ${num(y.score)} points. If it ended now you would win ${prize}.`:`You are #${y.rank} with ${num(y.score)} points. Climb into the winning places to win a prize.`)
   :(y.place?`You finished #${y.place} with ${num(y.score)} points and won ${prize}.`:`You finished #${y.rank} with ${num(y.score)} points.`);
  return `<p class="family-notice event-note ${y.counts?'is-good':''}">${line}</p>`;
 }
 function pot(){
  const x=t();if(!x?.pot)return '';
  const p=x.pot,running=live(),places=Math.max(0,Number(p.places)||0);
  // The prizes as the events show them (23 Oct 2026, retention.css .event-podium): a tile per podium place, then one for the other
  // winning places, from the top rows the server sent (the same numbers as the rules).
  const prizeAt=i=>x.top?.[i]&&(x.top[i].diamonds||x.top[i].coins)?x.top[i]:null;
  const chips=q=>q?`${q.diamonds?`<span>${art('diamonds')}${num(q.diamonds)}</span>`:''}${q.coins?`<span>${art('coins')}${num(q.coins)}</span>`:''}`:'<span>—</span>';
  const tiles=[0,1,2].map(i=>`<li>${art(MEDALS[i])}<b>${placeLabel(i+1)}</b>${chips(prizeAt(i))}</li>`).join('')
   +(places>3&&prizeAt(3)?`<li>${art('tournament')}<b>Places 4 to ${num(places)}</b>${chips(prizeAt(3))}</li>`:'');
  return `<div class="event-prizes tournament-pot"><div class="tournament-pot-head"><span>${running?'Prize pot now':'Prize pot'}</span><strong>${art('diamonds')}${num(p.diamonds)}</strong><strong>${art('coins')}${num(p.coins)}</strong></div><div class="event-podium ${places>3?'':'is-three'}"><ol>${tiles}</ol></div><p class="event-summary">${num(p.counted)} farmer${p.counted===1?'':'s'} count for the pot. ${num(places)} winning place${places===1?'':'s'}.</p></div>`;
 }
 function standings(){
  const x=t();if(!x?.top?.length)return '';
  const row=r=>{const podium=r.rank<=3;const prize=r.diamonds||r.coins;return `<article class="family-list-row event-standing ${podium?`is-podium is-rank-${r.rank}`:''} ${r.isYou?'is-you':''}"><span class="event-rank">${podium?art(MEDALS[r.rank-1]):r.rank}</span><button type="button" class="event-standing-who" data-tournament-profile="${esc(r.playerId)}" aria-label="${esc(ownText(`Open ${r.username}’s profile`,[r.username]))}"><span class="family-member-portrait">${avatarImage(r.avatarId)}</span><div><strong>${ownWords(r.username)}${vipBadge(r.vipExpiresAt,farmNow())}${familyBadge(r.playerId)}${r.isYou?' (you)':''}</strong><span>${num(r.score)} point${r.score===1?'':'s'}</span></div></button><span class="event-standing-reward">${prize?`${r.diamonds?`<b>${art('diamonds')}${num(r.diamonds)}</b>`:''}${r.coins?`<b>${art('coins')}${num(r.coins)}</b>`:''}`:''}</span></article>`;};
  // The top 10, and your own row under it when you are further down (as the events show it).
  const shown=x.top.slice(0,10),mine=x.top.find(r=>r.isYou);
  const own=mine&&mine.rank>10?mine:null;
  return `<div class="event-section-head"><h3 class="event-section-title">${live()?'Top farmers':'Final standings'}</h3></div><p class="event-summary">${live()?'Prizes if the tournament ended now.':'The prizes as they were handed out.'}</p><div class="family-member-list event-standings">${shown.map(row).join('')}${own?`<p class="event-standings-gap" aria-hidden="true">···</p>${row(own)}`:''}</div>`;
 }
 const rules=()=>{
  const s=t()?.settings??TOURNAMENT_DEFAULTS;
  return `<details class="family-extra event-rules" data-fold="how-tournament"><summary>How the Super Tournament works<span>Everyone can take part</span></summary><ul>
<li>Everyone takes part, from level 1. You join with your first point: no button to press.</li>
<li>Each tournament counts one thing, such as crops harvested or goods made. What you did before it started does not count.</li>
<li>From ${num(s.minScore)} points you count for the pot. Every farmer who counts adds ${num(s.diamondsPerPlayer)} diamonds and ${num(s.coinsPerPlayer)} coins to it, up to ${num(s.maxDiamonds)} diamonds and ${num(s.maxCoins)} coins.</li>
<li>With fewer than ${num(TOURNAMENT_WIDE_FROM)} farmers who count, the top 3 win: 50%, 30% and 20% of the pot.</li>
<li>${Number(s.winners)>0?`From ${num(TOURNAMENT_WIDE_FROM)} farmers, the top ${num(s.winners)} win. The top 3 win 25%, 15% and 10% of the pot, and the other winning places share the rest equally.`:`From ${num(TOURNAMENT_WIDE_FROM)} farmers, every ${num(s.placeStep)} farmers add one winning place. The top 3 win 25%, 15% and 10% of the pot, and the other winning places share the rest equally.`}</li>
<li>One farmer wins at most ${num(TOURNAMENT_PRIZE_MAX.diamonds)} diamonds and ${num(TOURNAMENT_PRIZE_MAX.coins)} coins.</li>
<li>The same score? Who reached it first ranks higher.</li>
<li>When it ends, collect your prize here. It waits for you for 30 days.</li></ul></details>`;
 };
 function render(){
  const heading='<div class="dialog-heading">'+art('tournament','dialog-badge')+'<div class="dialog-titles"><h2 id="tournament-title">Super Tournament</h2></div><button class="icon-button close-dialog" data-close aria-label="Close"><i data-lucide="x"></i></button></div>';
  keepFolds(dialog,heading+(data?collect()+hero()+pot()+standings()+rules():error?`<p class="event-loading">${esc(error)}</p>`:skeleton('Opening the tournament…',{hero:true,rows:3,avatar:false}))+'<p class="event-feedback" role="status" data-status></p>');
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  // The ⓘ to the rules in How to play (public/dialog-shell.js WINDOW_WIKI), again after every redraw of the heading.
  if(dialog.open)try{hintsButton(dialog);}catch{}
  dialog.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>claim(b));
  dialog.querySelectorAll('[data-tournament-profile]').forEach(b=>b.onclick=()=>window.harvestProfiles?.open(b.dataset.tournamentProfile,{back:'Back to the tournament'}));
  refreshVipBadges(dialog,farmNow());refreshArt();
  void loadFamilies([...dialog.querySelectorAll('[data-tournament-profile]')].map(b=>b.dataset.tournamentProfile)).then(changed=>{if(changed&&dialog.open)render();});
 }
 async function claim(b){
  if(busy)return;busy=true;b.disabled=true;
  const status=dialog.querySelector('[data-status]');
  try{
   const r=await bridge.request({operation:'tournament',command:'claim',tournamentId:b.dataset.claim});if(r?.error)throw Error(r.error);
   const prize=r.prize??{};
   if(prize.coins>0||prize.diamonds>0){notify?.(`You finished #${prize.place} and won ${prizeWords(prize)}!`);onClaimed?.(prize);}
   await refreshFarm?.();await load();
  }catch(e){if(status)status.textContent=e?.message||'The prize could not be collected. Try again.';b.disabled=false;}
  finally{busy=false;}
 }
 function open(){
  if(t()&&live())markSeen(t().id);
  badge();render();if(!dialog.open)dialog.showModal();
  clearInterval(timer);timer=setInterval(()=>{if(!dialog.open){clearInterval(timer);return;}void load();},30000);
  void load();
 }
 // The countdowns tick every second while the screen is open; the button's hint every minute.
 clock=setInterval(()=>{for(const el of dialog.querySelectorAll('[data-countdown]'))el.textContent=formatDuration(Math.max(0,Number(el.dataset.countdown)-now()));},1000);
 background=setInterval(()=>{if(!dialog.open)void load();},5*60000);
 button?.addEventListener('click',open);
 void load();
 return {open,load,get data(){return data;},stop(){clearInterval(timer);clearInterval(clock);clearInterval(background);}};
}
