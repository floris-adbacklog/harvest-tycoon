import {art} from './visual-icons.js';
const num=value=>Number(value??0).toLocaleString('en-US');
// What this week's Family Order gives you (26 Sep 2026, shorter): your coins, XP and diamonds in one row and the shared completion
// bonus in one line. The lines complete, your points and the time left are in the summary above it, so they are not repeated here.
export function renderFamilyOrderRewards(view){
 const eligible=view.yourOrderPoints>=view.config.minPoints,r=view.rewardPreview,done=view.order.completed;
 const remaining=Math.max(0,view.config.minPoints-view.yourOrderPoints);
 const values=[['coins',r.coins,'coins'],['xp',r.xp,'XP'],['diamonds',r.diamonds,r.diamonds===1?'diamond':'diamonds']];
 return `<section class="family-order-rewards is-compact" aria-labelledby="family-order-rewards-title">
 <div class="family-order-rewards-heading">${art('gift')}<div><h3 id="family-order-rewards-title">${done?'Your order rewards':'Your rewards so far'}</h3><p class="family-reward-caption">${eligible?(done?'For the goods you delivered.':'For the goods you delivered so far.'):'Keep delivering to qualify.'}</p></div></div>
 <div class="family-order-reward-grid">${values.map(([icon,value,label])=>`<div class="family-order-reward-cell">${art(icon)}<strong>${num(value)}</strong><span>${label}</span></div>`).join('')}</div>
 <p class="family-completion-bonus">${art('diamonds')}<span>+ ${num(r.completionBonus)} ${r.completionBonus===1?'diamond':'diamonds'} family bonus, shared by everyone who helped</span></p>
 ${eligible?'':`<p class="family-reward-qualification">${num(remaining)} more order points to qualify for rewards.</p>`}
 </section>`;
}
