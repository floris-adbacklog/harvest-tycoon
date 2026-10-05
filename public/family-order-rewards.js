import {art} from './visual-icons.js';
const num=value=>Number(value??0).toLocaleString('en-US');
// How many lines of the order are full and what that pays you now (5 Oct 2026: an unfinished order pays for its full lines when the
// week ends, a quarter a line: an order has FAMILY_ORDER_LINES = 4 lines, tests/family-partial-order.test.mjs keeps that true). One
// whole sentence for each step, so each one translates as a whole. The order card's fold shows it too.
export function orderShareText(full,lines){
 if(!lines)return '';
 if(full>=lines)return `All ${lines} lines full: you get everything.`;
 if(full<1)return 'No line full yet: each full line pays a quarter.';
 return [`${full} of ${lines} lines full: you’d get a quarter now.`,`${full} of ${lines} lines full: you’d get half now.`,`${full} of ${lines} lines full: you’d get three quarters now.`][Math.min(2,Math.max(0,Math.round(full/lines*4)-1))];
}
// The order's lines as the payout counts them: from the server's preview, or counted from the order on an older server.
export function orderShare(view){
 const r=view.rewardPreview??{},lines=r.lines??Object.keys(view.order?.lines??{}).length;
 const full=r.fullLines??Object.entries(view.order?.lines??{}).filter(([k,n])=>(view.order.filled?.[k]??0)>=n).length;
 return {full,lines};
}
// What this week's Family Order gives you (26 Sep 2026, shorter; 5 Oct 2026, part by part): the coins, XP and diamonds the full
// lines would pay you now, the rule in one line, and what the whole order gives. The lines complete, your points and the time left
// are in the summary above it, so they are not repeated here.
export function renderFamilyOrderRewards(view){
 const eligible=view.yourOrderPoints>=view.config.minPoints,r=view.rewardPreview,done=view.order.completed,{full,lines}=orderShare(view);
 const remaining=Math.max(0,view.config.minPoints-view.yourOrderPoints),now=r.now??r;
 const values=[['coins',now.coins,'coins'],['xp',now.xp,'XP'],['diamonds',now.diamonds,now.diamonds===1?'diamond':'diamonds']];
 const rule=`Every full line pays a quarter of the rewards; the whole order pays everything plus ${num(r.completionBonus)} bonus ${r.completionBonus===1?'diamond':'diamonds'}, shared by everyone who helped.`;
 return `<section class="family-order-rewards is-compact" aria-labelledby="family-order-rewards-title">
 <div class="family-order-rewards-heading">${art('gift')}<div><h3 id="family-order-rewards-title">${done?'Your order rewards':'Your rewards so far'}</h3><p class="family-reward-caption">${!eligible?'Keep delivering to qualify.':done?'For the goods you delivered.':orderShareText(full,lines)}</p></div></div>
 <div class="family-order-reward-grid">${values.map(([icon,value,label])=>`<div class="family-order-reward-cell">${art(icon)}<strong>${num(value)}</strong><span>${label}</span></div>`).join('')}</div>
 <p class="family-completion-bonus">${art('diamonds')}<span>${rule}</span></p>
 ${done?'':`<p class="family-footnote">Whole order: ${num(r.coins)} coins · ${num(r.xp)} XP · ${num(r.diamonds)} ${r.diamonds===1?'diamond':'diamonds'}</p>`}
 ${eligible?'':`<p class="family-reward-qualification">${num(remaining)} more order points to qualify for rewards.</p>`}
 </section>`;
}
