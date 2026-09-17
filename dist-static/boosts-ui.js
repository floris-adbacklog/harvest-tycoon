import {BOOSTS,DIAMOND_PACKS,boostStatus,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
const $=id=>document.getElementById(id);
const number=n=>n.toLocaleString('en-US');

export function createBoostsUI({state,runAction,onChange,notify}){
 let lastStatus='';
 function signature(){return [state.diamonds,state.boosts.upgradeCredits,...Object.keys(BOOSTS).map(id=>boostStatus(state,id,farmNow()).reason)].join('|');}
 function render(){
  $('boost-wallet').textContent=number(state.diamonds);
  $('boost-catalog').innerHTML=Object.entries(BOOSTS).map(([id,b])=>{
   const status=boostStatus(state,id,farmNow());
   return `<article class="boost-card ${status.remaining?'boost-active':''}"><div class="boost-card-art">${art(b.art)}</div><div class="boost-card-copy"><h3>${b.name}</h3><p>${b.description}</p><span class="boost-detail" data-boost-time="${id}">${status.remaining?`Active · ${formatDuration(status.remaining)} left`:status.reason||'Ready to activate'}</span></div><button class="boost-buy" data-buy-boost="${id}" ${status.canBuy?'':'disabled'} aria-label="Activate ${b.name} for ${b.cost} diamonds">${art('diamonds')}<span>${b.cost}</span><small>${status.remaining?'Active':id==='upgrade'&&state.boosts.upgradeCredits?'Ready':'Activate'}</small></button></article>`;
  }).join('');
  $('diamond-packs').innerHTML=DIAMOND_PACKS.map(pack=>`<article class="diamond-pack" aria-disabled="true">${art('diamonds')}<h3>${number(pack.amount)} <span>diamonds</span></h3><strong>${pack.price}</strong><button disabled>Coming after beta</button></article>`).join('');
  $('boost-catalog').querySelectorAll('[data-buy-boost]').forEach(button=>button.onclick=async()=>{
   try{
    const id=button.dataset.buyBoost,result=await runAction({type:'buy_boost',boost:id});onChange();render();
    const message=id==='crops'?`${result.affected} crops are ready to harvest!`:id==='production'?`${result.affected} batches are ready to collect!`:id==='upgrade'?'Your next production-building upgrade costs 50% less.':`${BOOSTS[id].name} is active for 30 minutes.`;
    $('boost-feedback').textContent=message;notify(message);
   }catch(error){$('boost-feedback').textContent=error.message;notify(error.message);render();}
  });
  lastStatus=signature();refreshArt();
 }
 function open(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('boost-feedback').textContent='';render();$('boost-dialog').showModal();}
 function refresh(){
  $('diamonds').textContent=state.diamonds.toLocaleString('en-US',matchMedia('(max-width: 900px), (max-height: 550px) and (pointer: coarse)').matches?{notation:'compact',maximumFractionDigits:1}:{});
  $('diamond-button').setAttribute('aria-label',`${number(state.diamonds)} diamonds. Open boosts and diamond shop.`);
  if($('boost-dialog').open)render();tick();
 }
 function tick(){
  const now=farmNow(),active=[];
  for(const [id,label,until] of [['xp','2× XP',state.boosts.xpUntil],['coins','2× coins',state.boosts.coinsUntil]]){
   if(until>now)active.push(`${label} · ${formatDuration(until-now)}`);
   const el=document.querySelector(`[data-boost-time="${id}"]`);if(el&&until>now)el.textContent=`Active · ${formatDuration(until-now)} left`;
  }
  if(state.boosts.upgradeCredits)active.push('50% upgrade voucher');
  $('active-boosts').hidden=!active.length;$('active-boosts').textContent=active.join(' · ');
  if($('boost-dialog').open&&signature()!==lastStatus)render();
 }
 $('diamond-button').onclick=open;
 $('boosts-button').onclick=open;
 $('boost-daily').onclick=()=>{$('boost-dialog').close();$('today-button').click();};
 return {open,refresh,tick};
}
