import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';
export function showWelcomeBack(summary,{fields,production,stall,today},doc=document){
 if(!summary)return;
 const dialog=doc.createElement('dialog');dialog.className='game-dialog';dialog.setAttribute('aria-labelledby','welcome-back-title');
 dialog.innerHTML=`<div class="dialog-heading"><div>${art('farmhouse')}<p class="eyebrow">YOUR FARM KEPT GROWING</p><h2 id="welcome-back-title">Welcome back to your farm</h2></div><button class="icon-button" data-close aria-label="Close">×</button></div><p>You were away for ${formatDuration(summary.away)}.</p><div class="family-rewards">${summary.crops?`<p>${art('wheat')} <strong>${summary.crops} fields ready to harvest</strong></p>`:''}${summary.batches?`<p>${art('package-open')} <strong>${summary.batches} batches ready to collect</strong></p>`:''}${summary.stall?`<p>${art('coins')} <strong>${summary.stall} coins waiting at your farm stall</strong></p>`:''}</div><p data-objective></p><p>Your goods and earnings are waiting for you to collect.</p><button class="primary-button" data-continue>Let’s get farming</button>`;
 dialog.querySelector('[data-objective]').textContent=summary.objective;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-continue]').onclick=()=>{dialog.close();(summary.crops?fields:summary.batches?production:summary.stall?stall:today)();};
 doc.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 // Existing reward dialogs get their turn first; do not cover or dismiss them.
 const open=()=>{if(doc.querySelector('dialog[open]')){setTimeout(open,500);return;}dialog.showModal();};open();
}
