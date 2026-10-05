import {art} from './visual-icons.js';
import {rankArt} from './rank-art.js';
import {avatarImage} from './player-avatars.js';
import {FAMILY_CHEST_MIN,familyWeekStart} from './farm-state.js';

// The Stats tab of Farm Family (5 Oct 2026, the owner's wish): this week in numbers for your family, for you and for every farmer
// in it, and how your family did in the weeks before. Drawn like renderFamilyTournament, from familyPublicView only. The newer
// fields (each member's order, goods and chest points, pointsAhead, rankOf, history, lastWeek) are read with a fallback, so the tab
// still draws from a server that does not send them yet.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');
const weekOf=week=>new Date(familyWeekStart(week)).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'});
const tile=(pic,value,label,note='')=>`<div class="family-stats-tile">${art(pic)}<strong>${value}</strong><span>${label}</span>${note?`<small>${note}</small>`:''}</div>`;

// Your family's settled weeks, newest first: the server's history, or (from an older server) this family's rows in the last four
// weeks of results, where the number of rows that week is the number of families ranked.
export function familyHistory(view){
 const t=view.tournament??{},own=view.family?.id;
 if(Array.isArray(t.history))return t.history.slice(0,8);
 const past=t.past??[];
 return past.filter(r=>r.familyId===own).sort((a,b)=>b.week-a.week).slice(0,8).map(r=>({week:r.week,rank:r.rank,points:r.points,diamonds:r.diamonds,activeMembers:r.activeMembers,families:past.filter(p=>p.week===r.week).length}));
}
// One plain line on how the last week went against the week before it.
export function familyTrend(history){
 const [last,before]=history;if(!last||!before)return '';
 const moved=before.rank-last.rank,places=Math.abs(moved);
 return moved>0?`Up ${places} ${places===1?'place':'places'} on the week before.`:moved<0?`Down ${places} ${places===1?'place':'places'} on the week before.`:'The same place as the week before.';
}
// What each member put in this week: order and goods points (the tournament) and chest points (the Family Chest). Your own come from
// the fields the window already had when the server does not split them per member yet.
export function memberSplit(view,m){
 const self=m.isSelf,order=m.orderPoints??(self?view.yourOrderPoints:undefined),goods=m.extraPoints??(self?view.extraUsed:undefined);
 const chest=m.chestPoints??(self?view.chest?.mine:undefined);
 return {points:m.points??0,order:order??null,goods:goods??null,chest:chest??null,split:order!=null&&goods!=null};
}

export function renderFamilyStats({view}){
 const t=view.tournament??{},rank=t.yourRank??null,of=t.rankOf??t.activeFamilies??0,points=t.familyPoints??0;
 const members=view.members??[],me=members.find(m=>m.isSelf),mine=me?memberSplit(view,me):{points:view.yourPoints??0,order:view.yourOrderPoints??0,goods:view.extraUsed??0,chest:view.chest?.mine??0,split:true};
 const prizes=t.placePrizes?.length||10;

 // 1. Your family this week: its place, how far from the families either side, and the prize at this moment.
 const below=t.pointsAhead!==undefined?t.pointsAhead:rank&&t.top?.[rank]?points-t.top[rank].points:null;
 const gaps=[rank>1?`${num(t.pointsBehind??0)} behind #${rank-1}`:null,rank&&below!=null?`${num(below)} ahead of #${rank+1}`:null].filter(Boolean).map(g=>` · ${g}`).join('');
 const family=rank?`<section class="family-stats-card"><h3>Your family this week</h3><div class="family-stats-place">${rankArt(rank)}<div><strong>#${rank} of ${num(of)}</strong><span>${num(points)} points${gaps}</span></div></div>
  <div class="family-stats-tiles is-two">${tile('family-tournament',num(t.familyDiamonds??0),'family prize now',rank>prizes?'The top ten win prizes.':'')}${tile('diamonds',num(t.yourDiamonds??0),t.entered?'for you now':'deliver to share')}</div></section>`
  :`<section class="family-stats-card family-stats-empty">${art('family-weekly-order')}<div><h3>Your family this week</h3><p>Nobody in your family has delivered yet. The first delivery to the Family Order enters the tournament.</p><button type="button" class="small-button" data-family-goto="week">Go to the Family Order</button></div></section>`;

 // 2. You: your tournament points (order and goods), your chest points against the 300 that share in every chest, your part of the family's points.
 const min=view.chest?.minPoints??FAMILY_CHEST_MIN,chest=mine.chest??0,familyTotal=points||members.reduce((n,m)=>n+(m.points??0),0);
 const share=familyTotal>0?Math.round(mine.points/familyTotal*100):0;
 const lw=view.lastWeek,last=lw?`<p class="family-stats-note">Last week: ${[`${num(lw.points)} tournament points`,lw.rank?`your family was #${lw.rank}`:null,`${num(lw.chestPoints??0)} chest points`].filter(Boolean).join(' · ')}</p>`:'';
 const you=`<section class="family-stats-card"><h3>You</h3><div class="family-stats-tiles">${tile('family-tournament',num(mine.points),'tournament points',mine.split?`<span>${num(mine.order)} order</span> · <span>${num(mine.goods)} goods</span>`:'')}${tile('family-chest-wood',num(chest),'chest points',chest>=min?'✓ You share in every chest':`${num(min-chest)} more to share in the chests`)}${tile('family-members',`${share}%`,'of your family’s points')}</div>${last}</section>`;

 // 3. Farmers this week: everyone by tournament points, with the order and goods bar and the chest bar. The crown is for chest points.
 const rows=members.map(m=>({m,...memberSplit(view,m)})).sort((a,b)=>b.points-a.points||(b.chest??0)-(a.chest??0)||String(a.m.username).localeCompare(String(b.m.username)));
 const best=Math.max(1,...rows.map(r=>r.points)),bestChest=Math.max(1,...rows.map(r=>r.chest??0)),pct=(n,max)=>Math.round(Math.max(0,n??0)/max*100);
 const crown=`<span class="family-top">${art('family-rank-top')}Most chest points</span>`;
 const farmer=(r,i)=>`<li class="family-stats-farmer${r.m.isSelf?' is-self':''}"><b class="family-stats-farmer-place">${i+1}</b><span class="family-stats-portrait">${avatarImage(r.m.avatarId)}</span><div class="family-stats-farmer-copy"><div class="family-stats-farmer-name"><strong><span translate="no">${esc(r.m.username)}</span>${r.m.isSelf?' <em>(you)</em>':''}</strong>${r.m.top?crown:''}</div>
  <span class="family-stats-bar" aria-hidden="true">${r.split?`<i class="is-order" style="width:${pct(r.order,best)}%"></i><i class="is-goods" style="width:${pct(r.goods,best)}%"></i>`:`<i class="is-order" style="width:${pct(r.points,best)}%"></i>`}</span>${r.chest!=null?`<span class="family-stats-bar is-chest" aria-hidden="true"><i style="width:${pct(r.chest,bestChest)}%"></i></span>`:''}
  ${r.split||r.chest!=null?`<small>${[r.split?`${num(r.order)} order`:null,r.split?`${num(r.goods)} goods`:null,r.chest!=null?`${num(r.chest)} chest`:null].filter(Boolean).map(part=>`<span>${part}</span>`).join(' · ')}</small>`:''}</div><span class="family-stats-farmer-total"><strong>${num(r.points)}</strong><small>points</small></span></li>`;
 const farmers=`<section class="family-stats-card"><div class="family-standings-heading"><h3>Farmers this week</h3><span>Tournament points</span></div>
  <p class="family-stats-legend"><span><i class="is-order"></i>Order</span><span><i class="is-goods"></i>Goods</span><span><i class="is-chest"></i>Chest</span></p>
  <ol class="family-stats-farmers">${rows.map(farmer).join('')}</ol><p class="family-footnote">Order and goods points count for the tournament. Chest points come from everything you do on your farm: from ${num(min)} you share in every chest.</p></section>`;

 // 4. Your last weeks: up to eight settled weeks, newest first, and one line on the trend.
 const history=familyHistory(view),trend=familyTrend(history);
 const weekRow=w=>`<tr><td>${weekOf(w.week)}</td><td><strong>#${w.rank}</strong>${w.families?` <small>of ${num(w.families)}</small>`:''}</td><td>${num(w.points)}</td><td><span class="family-stats-diamonds">${art('diamonds')}${num(w.diamonds)}</span></td></tr>`;
 const weeks=`<section class="family-stats-card"><h3>Your last weeks</h3>${history.length?`${trend?`<p class="family-stats-note">${trend}</p>`:''}<table class="family-stats-weeks"><thead><tr><th scope="col">Week of</th><th scope="col">Place</th><th scope="col">Points</th><th scope="col">Family prize</th></tr></thead><tbody>${history.map(weekRow).join('')}</tbody></table>`
  :'<p class="family-stats-note">No results yet. A week your family delivers in shows here once it ends, on Monday at 00:00 UTC.</p>'}</section>`;
 return `<div class="family-stats">${family}${you}${farmers}${weeks}</div>`;
}
