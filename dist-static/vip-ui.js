// Public presentation only. Entitlement and benefits are enforced by farm-api.
export function vipTime(value){const n=typeof value==='string'?Date.parse(value):value;return Number.isSafeInteger(n)&&n>0?n:0;}
export function vipBadge(value,now=Date.now(),details=false){
 const until=vipTime(value);if(until<=now)return '';
 return `<span class="vip-badge${details?' vip-badge-detail':''}" data-vip-until="${until}" title="VIP farmer" aria-label="VIP farmer"><img src="/assets/icons/vip.png" alt="" width="24" height="24">${details?'<span data-vip-remaining></span>':''}</span>`;
}
export function refreshVipBadges(root,now=Date.now()){
 root.querySelectorAll('[data-vip-until]').forEach(el=>{
  const remaining=vipTime(Number(el.dataset.vipUntil))-now;
  if(remaining<=0){el.remove();return;}
  const text=el.querySelector('[data-vip-remaining]');
  if(text){const minutes=Math.ceil(remaining/60000);text.textContent=`VIP · ${minutes>=1440?`${Math.floor(minutes/1440)}d ${Math.floor(minutes%1440/60)}h`:minutes>=60?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${minutes}m`} left`;}
 });
}
