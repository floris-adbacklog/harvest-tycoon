import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');

// Every prize and statistic comes from the server's settlement calculation.
export function renderFamilyTournament({view,now,emblem,rewards,preview}){
 const t=view.tournament;
 const podiumRow=(f,index)=>{
  const rank=index+1,mine=!!f&&t.yourRank===rank;
  return `<li class="family-podium-row family-place-${rank}${f?'':' is-empty'}${mine?' is-yours':''}">
   <span class="family-place" aria-label="Place ${rank}">${rank}</span>
   <div class="family-podium-identity">${f?emblem(f.emblem):`<span class="family-empty-emblem" aria-hidden="true">${art('family-members')}</span>`}
    <div><strong>${f?esc(f.name):'Open place'}</strong><span>${mine?'Your family':f?'Harvest team':'No family here yet'}</span></div>
   </div>
   ${f?`<dl class="family-podium-stats">
    <div><dt>Points</dt><dd>${num(f.points)}</dd></div>
    <div><dt>Contributors</dt><dd>${num(f.activeMembers)}</dd></div>
    <div class="family-podium-prize"><dt>Family prize</dt><dd>${art('diamonds')}<strong>${num(f.diamonds)}</strong><span class="family-sr-only"> diamonds</span></dd></div>
   </dl>`:'<div class="family-open-place">Awaiting a challenger</div>'}
  </li>`;
 };
 return `<section class="family-tournament-banner">
  ${art('family-tournament')}
  <div class="family-tournament-title"><span class="eyebrow">THIS WEEK</span><h3>Family Tournament</h3><span>Ends in <strong data-family-countdown>${formatDuration(Math.max(0,view.endsAt-now))}</strong></span></div>
  <div class="family-tournament-pool">${art('diamonds')}<div><strong>${num(t.firstPrize)}</strong><span>1st prize</span></div></div>
 </section>
 <section class="family-standings" aria-labelledby="family-standings-heading">
  <div class="family-standings-heading"><h3 id="family-standings-heading">Top 3 families</h3><span>Live standings</span></div>
  <ol class="family-podium">${Array.from({length:3},(_,i)=>podiumRow(t.top[i],i)).join('')}</ol>
  <p class="family-standings-note">${num(t.activePlayers)} ${t.activePlayers===1?'contributor':'contributors'} · ${num(t.activeFamilies)} ${t.activeFamilies===1?'family':'families'} · ${num(t.pool)} diamonds in prizes</p>
  <p class="family-tournament-promise">1st place wins ${num(t.firstPrizeMin)}–${num(t.firstPrizeMax)} diamonds. Solo families can win too.</p>
 </section>
 ${preview}${rewards}
 ${t.top.length>3?`<details class="family-rules"><summary>More families</summary>${t.top.slice(3).map((f,i)=>`<div class="family-list-row"><b class="family-rank">${i+4}</b>${emblem(f.emblem)}<div><strong>${esc(f.name)}</strong><span>${num(f.points)} points · ${f.activeMembers} contributors</span></div></div>`).join('')}</details>`:''}
 <details class="family-rules"><summary>How rewards work</summary>
  <p>Deliver goods to earn points. The family with the most points wins at least ${num(t.firstPrizeMin)} diamonds. Each extra contributor across the tournament adds ${num(t.perExtraPlayer)} diamonds to first prize, up to ${num(t.firstPrizeMax)}. Second place wins 60% of first prize; third place wins 40%.</p>
  <p>Family prizes are shared by contribution. Make a delivery and stay in your family until Monday, 00:00 UTC. Only members who contributed this week count. Your personal prize is shown below the standings; order rewards are extra. Prizes may change before the week ends.</p>
 </details>
 <details class="family-rules"><summary>Previous weeks</summary>
  ${t.past.length?t.past.map(f=>`<div class="family-list-row"><b class="family-rank">${f.rank}</b><div><strong>${esc(f.name)}</strong><span>Week of ${new Date((f.week*7+4)*86400000).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'})} · ${num(f.points)} points</span></div><span>${f.diamonds} diamonds</span></div>`).join(''):'<p>Results appear after the first week ends.</p>'}
 </details>`;
}
