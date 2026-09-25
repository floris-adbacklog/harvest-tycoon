import {art} from '../public/visual-icons.js';
import {RANK_ART} from '../public/rank-picker.js';
import {CROPS,ITEMS,MASTERY_TIERS,QUESTS} from '../game/farm-state.js';

// A farmer's stats on the profile (src/player-profiles.js): two pages of nine, "On the farm" and "In the valley", with arrows (and a
// swipe on a phone). A stat that has its own leaderboard is a button that opens that board. Zero stays visible, but greyed.
const CROP_COUNT=Object.keys(CROPS).length,GOOD_COUNT=Object.keys(ITEMS).filter(key=>!Object.hasOwn(CROPS,key)).length;
const DAY=24*60*60*1000;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const whole=value=>Math.max(0,Math.floor(Number(value)||0));
const full=value=>whole(value).toLocaleString('en-US');
// Up to 99,999 in full; bigger numbers short (123.4K, 12.3M) so they fit a third of a phone screen. The full number is in the title.
const short=value=>whole(value)>=100000?new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(whole(value)):full(value);
const stat=(board,value,label,icon=RANK_ART[board])=>({board,value,label,icon});

export function profileStatPages(player,now=Date.now()){
 const s=player.stats??{},harvests=player.harvests??{};
 const grown=Object.keys(CROPS).filter(key=>whole(harvests[key])>0);
 const top=grown.sort((a,b)=>whole(harvests[b])-whole(harvests[a]))[0];
 const joined=Number(player.memberSince);
 return [
  {title:'On the farm',stats:[
   stat('harvested_crops',s.harvested_crops,'Crops harvested'),
   {value:grown.length,of:CROP_COUNT,label:'Crop kinds',icon:'seeds'},
   top?stat(`harvested_${top}`,harvests[top],`Top crop: ${CROPS[top].name}`,top):{value:null,label:'Top crop',icon:'wheat'},
   stat('goods_produced',s.goods_produced,'Goods produced'),
   {...stat('farm_fields',s.farm_fields,'Fields'),of:40},
   {...stat('building_upgrades',s.building_upgrades,'Building upgrades'),of:153},
   {...stat('badges',s.badges,'Badges'),of:CROP_COUNT*MASTERY_TIERS.length},
   {...stat('quests_done',s.quests_done,'Quests done'),of:QUESTS.length},
   stat('best_streak',s.best_streak,'Best day streak')
  ]},
  {title:'In the valley',stats:[
   stat('items_sold',s.items_sold,'Items sold'),
   stat('deliveries',s.deliveries,'Deliveries'),
   stat('currency',s.currency,'Coins'),
   stat('events_finished',s.events_finished,'Events finished'),
   stat('chores_done',s.chores_done,'Chores done'),
   stat('helping_rounds',s.helping_rounds,'Helping-hand rounds'),
   stat('estate_projects',s.estate_projects,'Estate projects'),
   {value:s.goods_kinds,of:GOOD_COUNT,label:'Goods kinds',icon:'buildings'},
   {value:joined>0?Math.max(1,Math.floor((now-joined)/DAY)+1):null,label:'Days farming',icon:'farm'}
  ]}
 ];
}

const chevron=d=>`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
function tile({board,value,of,label,icon}){
 const empty=value===null||value===undefined,number=empty?'—':short(value);
 const shown=`${number}${of?`<small>/${full(of)}</small>`:''}`,said=`${empty?'None yet':full(value)}${of?` of ${full(of)}`:''} · ${label}`;
 const body=`${art(icon)}<strong>${shown}</strong><span>${esc(label)}</span>`,zero=empty||whole(value)===0?' is-zero':'';
 return board?`<button type="button" class="farmer-stat${zero}" data-stat-board="${esc(board)}" title="${esc(said)}. Tap to see the leaderboard." aria-label="${esc(said)}. Open the leaderboard.">${body}</button>`
  :`<div class="farmer-stat${zero}" title="${esc(said)}" role="group" aria-label="${esc(said)}">${body}</div>`;
}
export function renderStatPages(player,now=Date.now(),page=0){
 const pages=profileStatPages(player,now),current=Math.min(Math.max(0,page),pages.length-1);
 return `<section class="farmer-stats" data-stat-pages aria-label="Farmer stats"><div class="farmer-section-heading farmer-stats-heading"><h3 class="farmer-section-title" data-stat-title aria-live="polite">${pages[current].title}</h3><div class="farmer-stats-nav"><button type="button" class="farmer-stats-arrow" data-stat-step="-1" aria-label="Previous stats"${current===0?' disabled':''}>${chevron('M15 18l-6-6 6-6')}</button><span class="farmer-stats-dots" aria-hidden="true">${pages.map((_,i)=>`<i${i===current?' class="is-current"':''}></i>`).join('')}</span><button type="button" class="farmer-stats-arrow" data-stat-step="1" aria-label="Next stats"${current===pages.length-1?' disabled':''}>${chevron('M9 18l6-6-6-6')}</button></div></div>
 <div class="farmer-stats-track">${pages.map((p,i)=>`<div class="farmer-stat-grid" data-title="${esc(p.title)}" role="group" aria-label="${esc(p.title)}, page ${i+1} of ${pages.length}"${i===current?'':' inert'}>${p.stats.map(tile).join('')}</div>`).join('')}</div>
 <p class="farmer-stats-hint">Tap a stat to see its leaderboard.</p></section>`;
}

// The arrows, the swipe and a tap on a stat. `page` is where to start (a refresh keeps the page you were on); onPage reports a new page.
export function bindStatPages(root,{page=0,onPage=()=>{},onBoard=()=>{}}={}){
 const box=root.querySelector('[data-stat-pages]');if(!box)return;
 const track=box.querySelector('.farmer-stats-track'),pages=[...track.children],title=box.querySelector('[data-stat-title]');
 const dots=[...box.querySelectorAll('.farmer-stats-dots i')],arrows=[...box.querySelectorAll('[data-stat-step]')];
 let current=Math.min(Math.max(0,page),pages.length-1),settle;
 const paint=()=>{
  title.textContent=pages[current].dataset.title;dots.forEach((dot,i)=>dot.classList.toggle('is-current',i===current));
  for(const arrow of arrows){const to=current+Number(arrow.dataset.statStep);arrow.disabled=to<0||to>=pages.length;}
  pages.forEach((p,i)=>{p.inert=i!==current;});onPage(current);
 };
 const go=(to,behavior='smooth')=>{current=Math.min(Math.max(0,to),pages.length-1);track.scrollTo({left:current*track.clientWidth,behavior});paint();};
 for(const arrow of arrows)arrow.onclick=()=>go(current+Number(arrow.dataset.statStep));
 // A swipe snaps to a page (CSS scroll-snap); the page counts once the scrolling stops.
 track.addEventListener('scroll',()=>{clearTimeout(settle);settle=setTimeout(()=>{const at=Math.round(track.scrollLeft/Math.max(1,track.clientWidth));if(at!==current){current=Math.min(Math.max(0,at),pages.length-1);paint();}},90);},{passive:true});
 track.addEventListener('click',event=>{const button=event.target.closest('[data-stat-board]');if(button&&track.contains(button))onBoard(button.dataset.statBoard);});
 go(current,'auto');
}
