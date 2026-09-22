import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';
// Welcome Back: after 30+ minutes away, one small celebration card (built like the gift and level-up popups)
// with what is waiting on the farm and a single button that goes straight to it.
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
export function welcomeAction(summary){
 return summary.crops?'Harvest your fields':summary.batches?'Collect your batches':summary.stall?'Visit the farm stall':'Let’s get farming';
}
export function showWelcomeBack(summary,{fields,production,stall,today},doc=document){
 if(!summary)return;
 const dialog=doc.createElement('dialog');dialog.id='welcome-back-dialog';dialog.setAttribute('aria-labelledby','welcome-back-title');
 const waiting=[
  summary.crops?`<strong class="reward-item">${art('harvest')}${plural(summary.crops,'field','fields')} ready</strong>`:'',
  summary.batches?`<strong class="reward-xp">${art('buildings')}${plural(summary.batches,'batch','batches')} done</strong>`:'',
  summary.stall?`<strong class="reward-coins">${art('coins')}${summary.stall.toLocaleString('en-US')} coins at the stall</strong>`:''
 ].join('');
 dialog.innerHTML=`<button class="level-up-close" data-close aria-label="Close">×</button><div class="welcome-back-art">${art('farmhouse')}</div><span class="eyebrow">WHILE YOU WERE AWAY</span><h2 id="welcome-back-title">Welcome back!</h2><p>You were away for ${formatDuration(summary.away)}. Your farm kept growing.</p>${waiting?`<div class="gift-rewards">${waiting}</div>`:''}<button class="primary-button welcome-back-go" data-continue>${welcomeAction(summary)}</button>`;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 dialog.querySelector('[data-continue]').onclick=()=>{dialog.close();(summary.crops?fields:summary.batches?production:summary.stall?stall:today)();};
 doc.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 // Existing reward dialogs get their turn first; do not cover or dismiss them.
 const open=()=>{if(doc.querySelector('dialog[open]')){setTimeout(open,500);return;}dialog.showModal();};open();
}
