import {art} from './visual-icons.js';
const num=value=>Number(value??0).toLocaleString('en-US');
export function renderFamilyOrderRewards(view){
 const eligible=view.yourOrderPoints>=view.config.minPoints,r=view.rewardPreview;
 const remaining=Math.max(0,view.config.minPoints-view.yourOrderPoints);
 const lines=Object.entries(view.order.lines),complete=lines.filter(([key,target])=>(view.order.filled[key]??0)>=target).length;
 const values=[['coins',r.coins,'coins'],['xp',r.xp,'XP'],['diamonds',r.diamonds,r.diamonds===1?'diamond':'diamonds']];
 return `<section class="family-order-rewards" aria-labelledby="family-order-rewards-title">
 <div class="family-order-rewards-heading">${art('gift')}<div><span class="eyebrow">${view.order.completed?'ORDER COMPLETE':'GROW TOGETHER, EARN TOGETHER'}</span><h3 id="family-order-rewards-title">${view.order.completed?'Your order rewards':'Finish the order for extra rewards'}</h3></div></div>
 <p class="family-reward-caption">${eligible?'Your base rewards, based on the goods you delivered.':'Your reward preview — keep delivering to qualify.'}</p>
 <div class="family-order-reward-grid">${values.map(([icon,value,label])=>`<div class="family-order-reward-cell">${art(icon)}<strong>${num(value)}</strong><span>${label}</span></div>`).join('')}</div>
 <div class="family-completion-bonus">${art('diamonds')}<div><strong>+ ${num(r.completionBonus)} ${r.completionBonus===1?'diamond':'diamonds'} · family completion bonus</strong><span>Shared between eligible contributors when the order is complete.</span></div></div>
 ${eligible?'':`<p class="family-reward-qualification">${num(remaining)} more order points to qualify for rewards.</p>`}
 <div class="family-order-reward-progress"><span>${complete} / ${lines.length} goods complete</span><strong>${num(view.yourOrderPoints)} order points from you</strong></div>
 <progress max="${Math.max(1,lines.length)}" value="${complete}" aria-label="Order goods completed"></progress>
 <p class="family-reward-unlock">${view.order.completed?'Earned rewards are available above.':'Rewards unlock when every order line is complete.'}</p>
 </section>`;
}
