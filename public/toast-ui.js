import {art} from './visual-icons.js';
// The short message after an action. Each toast gets a matching painted icon and a tone (a find, a reward, a warning),
// and amounts like "+40 coins" or "+12 XP" become small chips with their own picture. The message is escaped first,
// so text from other players (names, gift notes) can never become markup.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WARN=/\b(need|needs|cannot|can't|not enough|failed|no longer|already|limit|locked|first|unavailable|try again|reach level|returns in|is still)\b/i;
const ICONS=[
 [/diamond/i,'diamonds'],[/\bXP\b|level/i,'xp'],[/harvest|crop|field/i,'harvest'],[/batch|collected|production/i,'buildings'],
 [/upgrade/i,'hammer'],[/event/i,'live-events'],[/family|gift|help/i,'gift'],[/sold|sale|market/i,'market'],[/coin/i,'coins']
];
const REWARD=/\+([\d,]+)\s(coins?|XP|diamonds?)/g;
export function toastParts(message){
 const text=String(message??'');
 const tone=WARN.test(text)?'warn':REWARD.test(text)?'reward':'info';REWARD.lastIndex=0;
 const icon=tone==='warn'?'lock':(ICONS.find(([re])=>re.test(text))?.[1]??'farm');
 const kind=unit=>/coin/i.test(unit)?'coins':/xp/i.test(unit)?'xp':'diamonds';
 const html=esc(text).replace(REWARD,(_,n,unit)=>`<b class="toast-chip is-${kind(unit)}">${art(kind(unit))}+${n}${kind(unit)==='xp'?' XP':''}</b>`);
 return {tone,icon,html};
}
export function createToast(el,{duration=3200}={}){
 let timer=0;
 return function show(message){
  const {tone,icon,html}=toastParts(message);
  el.className=`toast is-${tone}`;el.style.setProperty('--toast-duration',`${duration}ms`);
  el.innerHTML=`<span class="toast-icon">${art(icon)}</span><span class="toast-text">${html}</span><i class="toast-timer" aria-hidden="true"></i>`;
  void el.offsetWidth;el.classList.add('visible');
  clearTimeout(timer);timer=setTimeout(()=>el.classList.remove('visible'),duration);
 };
}
