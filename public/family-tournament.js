import {rankArt} from './rank-art.js';
import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');

// Every prize and statistic comes from the server's settlement calculation.
export function renderFamilyTournament({view,now,emblem,rewards,preview}){
 const t=view.tournament;
 // The three prizes now, how far first prize has grown towards its maximum, and where your family stands.
 const ladder=(t.placePrizes??[t.firstPrize]).map((prize,i)=>`<div class="family-prize-step family-place-${i+1}">${rankArt(i+1)}<span>${['1st','2nd','3rd'][i]} place</span><strong>${art('diamonds')}${num(prize)}</strong></div>`).join('');
 const grown=Math.max(0,Math.min(1,(t.firstPrize-t.firstPrizeMin)/Math.max(1,t.firstPrizeMax-t.firstPrizeMin)));
 const growth=`<div class="family-prize-growth"><div><strong>+${num(t.perExtraFamily)} for every family that takes part</strong><span>${t.firstPrize>=t.firstPrizeMax?`1st prize is at its maximum of ${num(t.firstPrizeMax)} diamonds.`:`${num(t.activeFamilies)} of ${num(t.familiesForMax)} families for the maximum of ${num(t.firstPrizeMax)} diamonds.`}</span></div><progress max="100" value="${Math.round(grown*100)}" aria-label="First prize towards its maximum"></progress></div>`;
 const gap=t.yourRank>1?` · ${num(t.pointsBehind)} behind #${t.yourRank-1}`:t.yourRank===1&&t.top.length>1?` · ${num(t.familyPoints-t.top[1].points)} ahead of #2`:'';
 const yours=t.yourRank?`<section class="family-your-place">${rankArt(t.yourRank)}<div><strong>Your family is #${t.yourRank}</strong><span>${num(t.familyPoints)} points${gap}${t.yourRank>3?' · the top three win prizes':''}</span></div><div class="family-your-place-prize"><strong>${art('diamonds')}${num(t.yourDiamonds)}</strong><span>${t.entered?'for you now':'deliver to share'}</span></div></section>`:preview;
 const podiumRow=(f,index)=>{
  const rank=index+1,mine=!!f&&t.yourRank===rank;
  return `<li class="family-podium-row family-place-${rank}${f?'':' is-empty'}${mine?' is-yours':''}">
   <span class="family-place" aria-label="Place ${rank}">${rankArt(rank)}</span>
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
 </section>
 <section class="family-prizes" aria-label="Prizes this week"><div class="family-prize-ladder">${ladder}</div>${growth}</section>
 ${yours}
 <section class="family-standings" aria-labelledby="family-standings-heading">
  <div class="family-standings-heading"><h3 id="family-standings-heading">Top 3 families</h3><span>Live standings</span></div>
  ${t.top.length?`<ol class="family-podium">${Array.from({length:3},(_,i)=>podiumRow(t.top[i],i)).join('')}</ol>`:`<div class="family-podium-empty">${art('family-tournament')}<div><strong>No families on the board yet</strong><span>Your first delivery puts your family in first place.</span></div></div>`}
  <p class="family-standings-note">${num(t.activePlayers)} ${t.activePlayers===1?'contributor':'contributors'} · ${num(t.activeFamilies)} ${t.activeFamilies===1?'family':'families'} · ${num(t.pool)} diamonds in prizes</p>
 </section>
 ${rewards}
 ${t.top.length>3?`<details class="family-rules"><summary>More families</summary>${t.top.slice(3).map((f,i)=>`<div class="family-list-row"><b class="family-rank">${i+4}</b>${emblem(f.emblem)}<div><strong>${esc(f.name)}</strong><span>${num(f.points)} points · ${f.activeMembers} contributors</span></div></div>`).join('')}</details>`:''}
 <details class="family-rules"><summary>How rewards work</summary>
  <p>Deliver goods to earn points. The family with the most points wins at least ${num(t.firstPrizeMin)} diamonds. Each other family that takes part adds ${num(t.perExtraFamily)} diamonds to first prize, up to ${num(t.firstPrizeMax)}. How many members a family has does not change the prize. Second place wins 60% of first prize; third place wins 40%.</p>
  <p>Family prizes are shared by contribution. Make a delivery and stay in your family until Monday, 00:00 UTC. Only members who contributed this week count. Your personal prize is shown below the standings; order rewards are extra. Prizes may change before the week ends.</p>
 </details>
 <details class="family-rules"><summary>Previous weeks</summary>
  ${t.past.length?t.past.map(f=>`<div class="family-list-row"><b class="family-rank">${rankArt(f.rank)}</b><div><strong>${esc(f.name)}</strong><span>Week of ${new Date((f.week*7+4)*86400000).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'})} · ${num(f.points)} points</span></div><span>${f.diamonds} diamonds</span></div>`).join(''):'<p>Results appear after the first week ends.</p>'}
 </details>`;
}
