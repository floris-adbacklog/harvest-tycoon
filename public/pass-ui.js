import {SEASON_PASS,PASS_TRACKS,passTotals,passPhase,passLanterns,passTier,passPremium,passVisible,passWaiting,passReward,levelOf,BOOSTS,BOOST_LENGTH_NAMES,ITEMS,DIAMOND_PACKS,formatDuration} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {portalOff} from './portal.js';

// The Halloween Pass (Oct 2026, the rules in farm-state.js SEASON_PASS): a pumpkin button next to Farm family on a computer and a tile
// under Every day in the More menu on a phone, both with the "!" while a reached reward waits (worked out from the farm, nothing stored
// on the device). The window opens only from there or from its banner in the Diamond shop, never by itself. One row per tier with the
// free and the paid reward, each with its own Claim and a toast, never all at once. From level 10: a preview with every reward and the
// rule before the season opens (nothing to collect yet, but the paid row is already for sale: the pre-sale, Oct 2026), a week to collect
// after it ends, then it hides.
const number=n=>Number(n).toLocaleString('en-US');
const euro=cents=>`€${(cents/100).toFixed(2)}`;
export const PASS_ART='giant-small';
const tiers=SEASON_PASS.tiers;
// The rule in one sentence, from the numbers themselves.
export function passRule(){const p=SEASON_PASS.points;return `Every daily gift gives ${p.gift} lanterns, every daily challenge and delivery ${p.daily}. Every ${SEASON_PASS.perTier} lanterns open the next tier.`;}
// What the paid row holds in all, from the tiers (farm-state.js): its diamonds, VIP and boosts.
export const passPaidTotals=passTotals;
// A true comparison only: the shop's own price for as many diamonds as the paid row holds (as the Starter Pack does), never a "was" price.
export function passValueLine(){
 const {diamonds}=passPaidTotals(),pack=DIAMOND_PACKS.find(p=>p.amount===diamonds);
 return pack?`The ${number(diamonds)} diamonds alone cost ${pack.price} in the shop.`:'';
}
// One reward as a picture, an amount and what it is: rewardParts for one worked out already (a claim's result), passRewardParts for a
// tier's reward at this farm's level (its coins grow with the level).
export function rewardParts(r){
 const parts=[];
 if(r.coins)parts.push({art:'coins',main:number(r.coins),sub:'coins',label:`${number(r.coins)} coins`});
 if(r.diamonds)parts.push({art:'diamonds',main:number(r.diamonds),sub:'diamonds',label:`${number(r.diamonds)} diamonds`});
 for(const [key,n] of Object.entries(r.items??{}))parts.push({art:key,main:number(n),sub:ITEMS[key].name,label:`${n} × ${ITEMS[key].name}`});
 if(r.boost)parts.push({art:BOOSTS[r.boost].art,main:BOOSTS[r.boost].name,sub:BOOST_LENGTH_NAMES[r.length],label:`${BOOSTS[r.boost].name} · ${BOOST_LENGTH_NAMES[r.length]}`});
 if(r.vipDays)parts.push({art:'vip',main:'VIP',sub:`${r.vipDays} days`,label:`VIP · ${r.vipDays} days`});
 return parts;
}
export const passRewardParts=(raw,level)=>rewardParts(passReward(raw,level));
// Where the season stands, as one line with a countdown (no dates, so nothing to translate per country).
export function passPhaseLine(now){
 const phase=passPhase(now);
 if(phase==='soon')return `Coming soon · opens in ${formatDuration(SEASON_PASS.startsAt-now)}`;
 if(phase==='open')return `Ends in ${formatDuration(SEASON_PASS.endsAt-now)}`;
 if(phase==='claim')return `Collect your rewards · ${formatDuration(SEASON_PASS.claimUntil-now)} left`;
 return '';
}
// The pre-sale (Oct 2026): before the season the time until it starts, or, once bought, that the farmer has it and when it starts (a
// countdown by the farm's clock, as the phase line).
export function passStartsLine(state,now){
 const left=formatDuration(SEASON_PASS.startsAt-now);
 return passPremium(state)?`You have the Halloween Pass · starts in ${left}`:`Starts in ${left}`;
}
// The buy box, from the preview on (the pre-sale, Oct 2026) until the season ends: Buy, with the time until it starts while it is coming.
// Bought before the season it says so instead; bought in the season there is no box (the paid row is open).
export function passPaidBox(state,{phase,now,catalog=null,pending=false,feedback=''}){
 const soon=phase==='soon';
 if(passPremium(state))return soon?`<section class="pass-paid-box is-owned"><div class="pass-paid-copy"><strong data-pass-starts>${passStartsLine(state,now)}</strong></div></section>`:'';
 if(!soon&&phase!=='open')return '';
 const totals=passPaidTotals(),cents=catalog?.pass?.cents??SEASON_PASS.cents,ready=Boolean(catalog?.enabled&&catalog?.pass?.ready);
 const label=pending?'Opening secure checkout…':catalog?.mode==='test'?`Test purchase · ${euro(cents)}`:`Buy for ${euro(cents)}`;
 const note=catalog&&!ready&&!pending?'Purchases are not available yet. Please check back later.':feedback;
 // No tiers are reached before the season, so that part waits for it.
 const holds=soon?`${number(totals.diamonds)} diamonds, ${totals.vipDays} days of VIP, ${totals.boosts} boosts and more.`
  :`${number(totals.diamonds)} diamonds, ${totals.vipDays} days of VIP, ${totals.boosts} boosts and more. Tiers you already reached open at once.`;
 return `<section class="pass-paid-box"><div class="pass-paid-copy"><strong>Unlock the paid rewards</strong><small>${holds}</small><small class="pass-value">${passValueLine()}</small>${soon?`<small class="pass-starts" data-pass-starts>${passStartsLine(state,now)}</small>`:''}</div>`
  +`<button type="button" class="primary-button pass-buy" ${ready&&!pending?'':'disabled'}>${label}</button><p class="pass-feedback" role="status" aria-live="polite">${note}</p></section>`;
}
// The small line under the tile in the More menu.
export function passHint(state,now){
 const phase=passPhase(now);
 if(phase==='soon')return 'Coming soon';
 return passWaiting(state,now)?'A reward is waiting':`Tier ${passTier(state)} of ${tiers.length}`;
}

export function createPassUI({state,runAction,notify,onChange=()=>{},bridge=()=>window.parent?.harvestBridge,doc=document,clock=farmNow}){
 const $=id=>doc.getElementById(id);
 const button=$('pass-button'),dot=$('pass-dot'),dialog=$('pass-dialog'),content=$('pass-content'),hint=$('pass-menu-hint');
 let catalog=null,pending=false,claiming='',requestId='',drawn='',feedback='';
 const now=()=>clock();
 // One reward of a tier with its button: Claim once reached (the paid one once bought), Collected after; nothing in the preview.
 function cell(track,t,level,reached,phase){
  const raw=tiers[t-1][track],parts=passRewardParts(raw,level),claimed=state.pass?.[track]?.includes(t),locked=track==='paid'&&!passPremium(state);
  const open=phase==='open'||phase==='claim';
  const action=!open?'':claimed?'<span class="pass-collected"><i data-lucide="check"></i>Collected</span>'
   :locked?`<span class="pass-lock" title="Unlock the paid rewards first.">${art('lock')}</span>`
   :reached?`<button type="button" class="primary-button pass-claim" data-pass-claim="${track}" data-pass-tier="${t}" ${claiming?'disabled':''}>Claim</button>`:'';
  return `<div class="pass-cell is-${track}${claimed?' is-claimed':''}${locked?' is-locked':''}">${parts.map(p=>`<span class="pass-reward" title="${p.label}">${art(p.art)}<span><b>${p.main}</b><small>${p.sub}</small></span></span>`).join('')}${action}</div>`;
 }
 function render(){
  const t=now(),phase=passPhase(t),level=levelOf(state),lanterns=passLanterns(state),tier=passTier(state),waiting=passWaiting(state,t);
  const next=tier<tiers.length?(tier+1)*SEASON_PASS.perTier-lanterns:0;
  const progress=phase==='soon'?'':`<div class="pass-progress"><div><strong>${number(lanterns)} lantern${lanterns===1?'':'s'}</strong><span>Tier ${tier} of ${tiers.length}</span></div><progress max="${SEASON_PASS.perTier}" value="${tier<tiers.length?SEASON_PASS.perTier-next:SEASON_PASS.perTier}" aria-label="Lanterns to the next tier"></progress><small>${phase==='open'&&next?`${next} more lantern${next===1?'':'s'} to tier ${tier+1}`:tier>=tiers.length?`All ${tiers.length} tiers reached`:''}</small></div>`;
  const rows=tiers.map((_,i)=>{const n=i+1,reached=phase!=='soon'&&n<=tier;return `<li class="pass-row${reached?' is-reached':''}${n===tier+1&&phase==='open'?' is-next':''}" data-pass-row="${n}"><b class="pass-tier">${n}</b>${PASS_TRACKS.map(track=>cell(track,n,level,reached,phase)).join('')}</li>`;}).join('');
  content.innerHTML=`<section class="pass-top">${art(PASS_ART,'pass-hero')}<div class="pass-top-copy"><p class="pass-phase" data-pass-phase>${passPhaseLine(t)}</p><p class="pass-rule">${passRule()} Coins grow with your level.</p></div></section>`
   +progress+(waiting?`<p class="pass-waiting">${waiting} reward${waiting===1?' is':'s are'} waiting</p>`:'')+passPaidBox(state,{phase,now:t,catalog,pending,feedback})
   +`<div class="pass-heads" aria-hidden="true"><span></span><b>Free</b><b>${passPremium(state)?'Paid':`${art('lock')}Paid`}</b></div><ol class="pass-tiers">${rows}</ol>`;
  content.querySelectorAll('[data-pass-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.passClaim,Number(b.dataset.passTier)));
  const buy=content.querySelector('.pass-buy');if(buy)buy.onclick=purchase;
  refreshArt();
 }
 // Redraw only when something on the window changed (a claim, a lantern, the purchase, the phase), so a refresh never jumps the list.
 const key=()=>JSON.stringify([passPhase(now()),passLanterns(state),state.pass?.free,state.pass?.paid,passPremium(state),levelOf(state),pending,claiming,feedback,catalog?.enabled,catalog?.pass?.ready,catalog?.mode]);
 function draw(){drawn=key();render();}
 // The first row with something to collect, else the next tier, in view.
 function scrollToNext(){
  const row=content.querySelector('.pass-claim')?.closest('.pass-row')??content.querySelector('.pass-row.is-next');
  row?.scrollIntoView?.({block:'center'});
 }
 async function claim(track,tier){
  if(claiming)return;claiming=`${track}:${tier}`;draw();
  try{
   const r=await runAction({type:'pass_claim',track,tier});
   notify(`${SEASON_PASS.name} · tier ${tier}: ${rewardParts(r??{}).map(p=>p.label).join(' · ')}`);
   onChange();
  }catch(error){notify(error.message);}
  finally{claiming='';refresh();if(dialog.open)draw();}
 }
 async function purchase(){
  if(pending||portalOff('payments')||!['soon','open'].includes(passPhase(now()))||passPremium(state))return;   // for sale before the season too (Oct 2026)
  pending=true;feedback='';draw();
  try{await bridge().checkout('pass',requestId);}
  catch(error){pending=false;feedback=error.message;draw();}
 }
 async function readCatalog(){
  // Not on CrazyGames (Oct 2026, public/portal.js): only the free row is there, nothing is for sale.
  if(catalog||portalOff('payments')||!['soon','open'].includes(passPhase(now()))||passPremium(state))return;   // only for the buy box
  try{catalog=await bridge().payments({operation:'catalog'});if(dialog.open)draw();}catch{}
 }
 function open(){
  if(!passVisible(state,now()))return;
  doc.querySelectorAll('dialog[open]').forEach(d=>d!==dialog&&d.close());
  requestId=crypto.randomUUID();pending=false;feedback='';draw();
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;scrollToNext();void readCatalog();
 }
 // The Diamond shop (farm.html #boost-dialog): a banner at the top while the paid row is for sale and not bought yet, also before the
 // season (the pre-sale, Oct 2026: there it says when it starts). Tapped, it opens the pass; it never opens by itself.
 function banner(show){
  let b=$('shop-pass');const wallet=doc.querySelector('#boost-dialog .boost-wallet');
  if(!b&&!wallet)return;
  if(!b){b=doc.createElement('button');b.type='button';b.id='shop-pass';b.className='shop-pass';b.onclick=open;wallet.after(b);}
  b.hidden=!show;if(!show)return;
  const html=`${art(PASS_ART)}<span class="shop-pass-copy"><b>Halloween Pass</b><small>${passPhase(now())==='soon'?passStartsLine(state,now()):passPhaseLine(now())}</small></span><span class="shop-pass-price"><b>${euro(catalog?.pass?.cents??SEASON_PASS.cents)}</b></span>`;
  if(b.dataset.html!==html){b.dataset.html=html;b.innerHTML=html;}
 }
 function refresh(){
  const t=now(),visible=passVisible(state,t),waiting=visible?passWaiting(state,t):0;
  button.hidden=!visible;dot.hidden=!waiting;
  if(hint)hint.textContent=visible?passHint(state,t):'Coming soon';
  banner(visible&&['soon','open'].includes(passPhase(t))&&!passPremium(state));
  if(!dialog.open)return;
  if(!visible){dialog.close();return;}
  if(key()!==drawn)draw();else{
   const line=content.querySelector('[data-pass-phase]');if(line)line.textContent=passPhaseLine(t);
   content.querySelectorAll('[data-pass-starts]').forEach(el=>el.textContent=passStartsLine(state,t));
  }
 }
 const onCatalog=event=>{catalog=event.detail??catalog;refresh();};
 window.addEventListener('harvest-catalog',onCatalog);
 button.onclick=open;
 const timer=setInterval(refresh,10000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);window.removeEventListener('harvest-catalog',onCatalog);},{once:true});
 refresh();
 return {open,refresh};
}
// A lantern chip for the Today window's cards while lanterns count for this farm: how many this gift, challenge or delivery brings.
export function lanternChip(state,kind,now){
 if(passPhase(now)!=='open'||state.pass?.id!==SEASON_PASS.id)return '';
 const n=SEASON_PASS.points[kind];
 return `<b class="is-lantern" title="${SEASON_PASS.name}">${art(PASS_ART)}+${n} lantern${n===1?'':'s'}</b>`;
}
