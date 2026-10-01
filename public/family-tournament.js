import {rankArt} from './rank-art.js';
import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';

// A family's name (and emblem) on the board opens its profile (family-profile.js) when the board knows which family it is.
const openable=(f,inner,cls='family-list-open')=>f?.familyId?`<button type="button" class="${cls}" data-family-profile="${esc(f.familyId)}">${inner}</button>`:`<div class="${cls}">${inner}</div>`;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number(n??0).toLocaleString('en-US');

// Every prize and statistic comes from the server's settlement calculation.
// 30 Sep 2026, cleaner: rewards to collect first, then where your family stands, the top families as one row each with the family's
// prize beside it (an open place shows what it would win, so there is no separate row of prizes), the tournament goods, and the
// fine print (how the prize pool grows, how it is shared) in the folds below. 1 Oct 2026: the top ten win, not the top three.
export function renderFamilyTournament({view,now,emblem,rewards,preview,extra=''}){
 const t=view.tournament,prizes=t.placePrizes??[t.firstPrize];   // what each of the top ten wins with ten families
 const s=t.placeShares??[25,17,13,10,8,7,6,5,5,4],p=t.poolSteps??[100,200,300];
 // How far first prize has grown towards its maximum (in How rewards work).
 const grown=Math.max(0,Math.min(1,(t.firstPrize-t.firstPrizeMin)/Math.max(1,t.firstPrizeMax-t.firstPrizeMin)));
 const growth=`<div class="family-prize-growth"><div><strong>Grows with every family that takes part</strong><span>${t.firstPrize>=t.firstPrizeMax?`The prize pool is at its maximum of ${num(t.poolMax)} diamonds.`:`${num(t.activeFamilies)} of ${num(t.familiesForMax)} families for the maximum of ${num(t.poolMax)} diamonds.`}</span></div><progress max="100" value="${Math.round(grown*100)}" aria-label="Prize pool towards its maximum"></progress></div>`;
 const gap=t.yourRank>1?` · ${num(t.pointsBehind)} behind #${t.yourRank-1}`:t.yourRank===1&&t.top.length>1?` · ${num(t.familyPoints-t.top[1].points)} ahead of #2`:'';
 const yours=t.yourRank?`<section class="family-your-place">${rankArt(t.yourRank)}<div><strong>Your family is #${t.yourRank}</strong><span>${num(t.familyPoints)} points${gap}${t.yourRank>prizes.length?' · the top ten win prizes':''}</span></div><div class="family-your-place-prize"><strong>${art('diamonds')}${num(t.yourDiamonds)}</strong><span>${t.entered?'for you now':'deliver to share'}</span></div></section>`:preview;
 const podiumRow=(f,index)=>{
  const rank=index+1,mine=!!f&&t.yourRank===rank;
  return `<li class="family-podium-row family-place-${rank}${f?'':' is-empty'}${mine?' is-yours':''}">
   <span class="family-place" aria-label="Place ${rank}">${rankArt(rank)}</span>
   ${openable(f,`${f?emblem(f.emblem):`<span class="family-empty-emblem" aria-hidden="true">${art('family-members')}</span>`}
    <div><strong>${f?`<span translate="no">${esc(f.name)}</span>`:'Open place'}</strong><span>${!f?'No family here yet':mine?`Your family · ${num(f.points)} points`:`${num(f.points)} points`}</span></div>`,'family-podium-identity')}
   <span class="family-podium-prize" title="Family prize">${art('diamonds')}<strong>${num(f?f.diamonds:prizes[index]??0)}</strong><span class="family-sr-only"> diamonds for the family</span></span>
  </li>`;
 };
 return `${rewards}<section class="family-tournament-banner">
  ${art('family-tournament')}
  <div class="family-tournament-title"><span class="eyebrow">THIS WEEK</span><h3>Family Tournament</h3><span>Ends in <strong data-family-countdown>${formatDuration(Math.max(0,view.endsAt-now))}</strong></span></div>
 </section>
 ${yours}
 <section class="family-standings" aria-labelledby="family-standings-heading">
  <div class="family-standings-heading"><h3 id="family-standings-heading">Top 10 families</h3><span>Live standings</span></div>
  <ol class="family-podium">${Array.from({length:Math.max(3,Math.min(prizes.length,t.top.length))},(_,i)=>podiumRow(t.top[i],i)).join('')}</ol>
  <p class="family-standings-note">${num(t.activePlayers)} ${t.activePlayers===1?'contributor':'contributors'} · ${num(t.activeFamilies)} ${t.activeFamilies===1?'family':'families'} · ${num(t.pool)} diamonds in prizes</p>
 </section>
 ${extra}
 <details class="family-rules"><summary>How rewards work</summary>${growth}
  <p>Deliver goods to earn points. The prize pool grows with every family that takes part: ${num(p[0])} diamonds for one family, ${num(p[1])} for two, ${num(p[2])} for three and ${num(t.poolPerFamily)} more for every family after that, up to ${num(t.poolMax)}. The top ten families share it: first place gets ${s[0]}%, second ${s[1]}%, third ${s[2]}%, and so on down to ${s[9]}% for tenth. With fewer than ten families, they share the whole pool in the same proportions. How many members a family has does not change the prize.</p>
  <p>Family prizes are shared by contribution. Make a delivery and stay in your family until Monday, 00:00 UTC. Only members who contributed this week count. Your personal prize is on your family's place above the standings; order rewards are extra. Prizes may change before the week ends.</p>
 </details>
 <details class="family-rules"><summary>Previous weeks</summary>
  ${t.past.length?t.past.map(f=>`<div class="family-list-row"><b class="family-rank">${rankArt(f.rank)}</b>${openable(f,`<div><strong translate="no">${esc(f.name)}</strong><span>Week of ${new Date((f.week*7+4)*86400000).toLocaleDateString('en-GB',{timeZone:'UTC',day:'numeric',month:'short'})} · ${num(f.points)} points</span></div>`)}<span>${f.diamonds} diamonds</span></div>`).join(''):'<p>Results appear after the first week ends.</p>'}
 </details>`;
}
