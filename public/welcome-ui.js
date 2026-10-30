import {art} from './visual-icons.js';
import {formatDuration} from './farm-state.js';
import {emblemMarkup} from './family-emblem-art.js';
import {t} from './i18n.js';
// Welcome Back: after 30+ minutes away, one small celebration card (built like the gift and level-up popups)
// with what is waiting on the farm and a single button that goes straight to it; on a new day also today's gift, collected
// in the card itself (27 Sep 2026), so coming back never brings a second pop-up for it. After 3 days or more away a comeback chest
// sits above the gift (Oct 2026), with its own Collect: one by one, never both at once.
// Join again (17 Oct 2026, the owner): a farmer who left their family for being away too long sees one line here, with the family
// and why, and Join again (no pop-up of its own). farm-api's load puts it in the summary (family) only while it can be done. The
// sentence is put in the farmer's language here (t) and kept from the page's translation (translate="no"), as every family name is:
// the page would translate a name that is also a word ("Cozy") and take a name's digits ("Betty 2026") for the number of days.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function welcomeFamilyRow(offer){
 if(!offer?.familyId||!offer.name)return '';
 return `<div class="welcome-gift welcome-family" data-welcome-family><span class="welcome-gift-art">${emblemMarkup(offer.emblem)}</span><span class="welcome-gift-copy"><strong translate="no">${esc(t('You left {0} after {1} days away.',offer.name,Number(offer.days)))}</strong></span><button type="button" class="small-button" data-rejoin-family>Join again</button></div>`;
}
const plural=(n,one,many)=>`${n} ${n===1?one:many}`;
export function welcomeAction(summary){
 return summary.crops?'Harvest your fields':summary.batches?'Collect your batches':summary.stall?'Visit the farm stall':'Let’s get farming';
}
export function showWelcomeBack(summary,{gift,chest,current,fields,production,stall,today,family},doc=document){
 if(!summary)return;
 const dialog=doc.createElement('dialog');dialog.id='welcome-back-dialog';dialog.className='is-card is-s is-cheer';dialog.setAttribute('aria-labelledby','welcome-back-title');
 const waiting=[
  summary.crops?`<strong class="reward-item reward-big">${art('harvest')}${plural(summary.crops,'field','fields')} ready</strong>`:'',
  summary.batches?`<strong class="reward-xp reward-big">${art('buildings')}${plural(summary.batches,'batch','batches')} done</strong>`:'',
  summary.stall?`<strong class="reward-coins reward-big">${art('coins')}${summary.stall.toLocaleString('en-US')} coins at the stall</strong>`:'',
  summary.tractor?`<strong class="reward-item reward-big">${art('tractor')}${summary.tractor} ${summary.tractor===1?'harvest':'harvests'} by the tractor</strong>`:''
 ].join('');
 dialog.innerHTML=`<button class="level-up-close" data-close aria-label="Close">×</button><div class="welcome-back-art">${art('farmhouse')}</div><h2 id="welcome-back-title">Welcome back!</h2><p>You were away for ${formatDuration(summary.away)}. Your farm kept growing.</p>${waiting?`<div class="gift-rewards">${waiting}</div>`:''}${chest?.offer?`<div class="welcome-gift welcome-chest" data-welcome-chest><span class="welcome-gift-art">${art('family-chest-wood')}</span><span class="welcome-gift-copy"><strong>Comeback chest</strong>${chest.chips(chest.offer)}</span><button type="button" class="small-button" data-collect-chest>Collect</button></div>`:''}${gift?.offer?`<div class="welcome-gift" data-welcome-gift><span class="welcome-gift-art">${art('gift')}</span><span class="welcome-gift-copy"><strong>Day ${gift.offer.day} gift${gift.offer.saved?' · streak saved':''}</strong>${gift.chips(gift.offer)}</span><button type="button" class="primary-button" data-collect-gift>Collect</button></div>`:''}${family?.rejoin?welcomeFamilyRow(summary.family):''}<button class="${gift?.offer?'secondary-button':'primary-button'} welcome-back-go" data-continue>${welcomeAction(summary)}</button>`;
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();
 // Today's gift, collected right here (the same collect as in Today): no second pop-up for it when you come back.
 const collect=dialog.querySelector('[data-collect-gift]');
 if(collect)collect.onclick=async()=>{collect.disabled=true;const r=await gift.collect();const row=dialog.querySelector('[data-welcome-gift]');
  if(r&&row){row.classList.add('is-collected');row.querySelector('[data-collect-gift]').remove();row.querySelector('strong').textContent=`Collected · ${r.streak}-day streak`;const go=dialog.querySelector('[data-continue]');go?.classList.replace('secondary-button','primary-button');}else collect.disabled=false;};
 // The comeback chest the same way (the same collect as at the top of Today).
 const chestButton=dialog.querySelector('[data-collect-chest]');
 if(chestButton)chestButton.onclick=async()=>{chestButton.disabled=true;const r=await chest.collect();const row=dialog.querySelector('[data-welcome-chest]');
  if(r&&row){row.classList.add('is-collected');chestButton.remove();row.querySelector('strong').textContent='Collected';}else chestButton.disabled=false;};
 // Join again: the family action itself (runAction), so every family rule is checked again; the farm then shows its flag again.
 const rejoin=dialog.querySelector('[data-rejoin-family]');
 if(rejoin)rejoin.onclick=async()=>{rejoin.disabled=true;const row=dialog.querySelector('[data-welcome-family]');
  // The answer names the family, so it is put in the farmer's language here too; an error is the game's own English, which the page
  // translates (translate="no" off).
  try{await family.rejoin(summary.family.familyId);row.classList.add('is-collected');rejoin.remove();row.querySelector('strong').textContent=t('Welcome back to {0}!',summary.family.name);}
  catch(error){rejoin.remove();const strong=row.querySelector('strong');strong.removeAttribute('translate');strong.textContent=error?.message||'This family is unavailable or full.';}};
 dialog.querySelector('[data-continue]').onclick=()=>{dialog.close();(summary.crops?fields:summary.batches?production:summary.stall?stall:today)();};
 doc.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});
 // Existing reward dialogs get their turn first; do not cover or dismiss them.
 // The card can wait a while: a gift or chest collected in the meantime (Today, another tab) loses its row, so no stale Collect is left.
 const open=()=>{if(doc.querySelector('dialog[open]')){setTimeout(open,500);return;}
  const now=current?.();if(now){if(!now.gift)dialog.querySelector('[data-welcome-gift]')?.remove();if(!now.chest)dialog.querySelector('[data-welcome-chest]')?.remove();}
  dialog.showModal();};open();
}
