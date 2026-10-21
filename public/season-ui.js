import {seasonView,seasonComing,seasonPremium,seasonReward,seasonTotals,seasonById,seasonLook,ownsLook,lookInfo,SEASON_TIERS,SEASON_LEVEL,SEASON_BUY_LEVEL,SEASON_SKIP_COST,SEASON_CHEST_POINTS,SEASON_CHEST_COINS,SEASON_LOOKS,SEASON_LOOK_SOURCE,
 levelOf,BOOSTS,BOOST_LENGTH_NAMES,ITEMS,CROPS,formatDuration,APPLE_SELLS_SEASON_PASS} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt,pictureFile} from './visual-icons.js';
import {portalOff} from './portal.js';
import {shopPrice} from './android.js';
import {confirmDiamondSpend} from './diamond-confirm.js';
import {t} from './i18n.js';
import {playerAvatar,seasonAvatar} from './player-avatars.js';
import {farmerPart,farmerPassParts,farmerThumbStyle,FARMER_PASS_PARTS} from './farmer-parts.js';

// The Season Pass (Oct 2026, plan-farmpas/plan.md §9; the rules in farm-state.js, Season Pass section). It runs next to the Halloween
// Pass, which keeps its own pumpkin button and window (pass-ui.js): two buttons for now, and this window is built with a tab bar that
// shows once a second pass lives here (from the Christmas pass on). A button with the season's ticket beside Farm family on a computer,
// a tile under Every day in More on a phone, both with a "!" while a reward waits; the window opens only from there or from its line in
// the Diamond shop, never by itself. Top to bottom: the season's picture, its countdown and its rule in one sentence; today's leaves
// against the cap and the next tier; this week's card; Skip a tier; the buy box (from level 20, until bought); the last season's
// collecting week; the tiers in blocks of ten, each reward with its own Claim (never all at once), a look with Use once it is yours.
// Winter 2026 (21 Oct 2026, the owner: "zet hem alvast helemaal onder herfst pass dat die eraan komt, je kan hem al kopen"): while
// Autumn runs, a card for the next season at the very bottom (comingCard): its banner, "Starts 22 December", a few of its rewards as
// small tiles, and its own buy button (the pre-sale), or "Bought ✓". From 22 December Winter is the pass here, and Autumn's collecting
// week a strip at the top (prevStrip) that opens to the rewards still waiting, each with its own Claim. Every text with the season's
// points comes in two words (byPoint): Autumn's leaves, Winter's snowflakes. A part for your own farmer (Winter) is a tile with its
// picture from My farmer's sheet and, once collected, Wear (My farmer opens with it on).
const number=n=>Number(n).toLocaleString('en-US');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SEASON_ART='season-pass-autumn';
// A text in the season's own points: Autumn's leaves or Winter's snowflakes (both whole texts, so each has its own translation).
export const byPoint=(season,leaves,snowflakes)=>season?.point==='snowflake'?snowflakes:leaves;
// The names of the parts a pass gives for your own farmer, for the tile (farmer-parts.js names are working names no screen translates;
// a test keeps these equal to them).
export const PASS_PART_NAMES=Object.freeze({hat_006:'Black beanie',gloves_011:'Blue cuffed gloves',glasses_013:'Ski goggles',outwear_021:'Long beige coat',costume_2:'Penguin suit'});
const partName=id=>PASS_PART_NAMES[id]??farmerPart(id)?.name??id;
// Where the paid row is for sale: not on CrazyGames or in an app without its store (public/portal.js), and not in the iPhone app while
// Apple does not sell it (game/payments.js APPLE_SELLS_SEASON_PASS). There a farmer sees the free row only, unless they bought it elsewhere.
export function seasonSellsHere(doc=globalThis.document,sellsOnApple=APPLE_SELLS_SEASON_PASS){
 if(portalOff('payments'))return false;
 return !(doc?.documentElement?.getAttribute?.('data-app-os')==='ios'&&!sellsOnApple);
}
// The countdown line (no dates, nothing to translate per country).
export function seasonPhaseLine(view,now){
 const s=view.season;
 if(view.phase==='soon')return `Opens in ${formatDuration(s.startsAt-now)}`;
 if(view.phase==='open')return `Ends in ${formatDuration(s.endsAt-now)}`;
 if(view.phase==='claim')return `Collect your rewards: ${formatDuration(s.claimUntil-now)} left`;
 return '';
}
// The rule in one sentence, from the numbers themselves.
export const seasonRule=view=>byPoint(view.season,`Every ${number(view.perTier)} leaves = 1 tier. Up to ${number(view.cap)} a day.`,`Every ${number(view.perTier)} snowflakes = 1 tier. Up to ${number(view.cap)} a day.`);
// This week's goal in words.
export function weekGoalText(kind,n){
 return {gift:`Collect your daily gift on ${number(n)} days`,dailies:`Finish ${number(n)} daily challenges`,harvest:`Harvest ${number(n)} crops`,
  festival:`Harvest ${number(n)} crops. Cranberries count double.`,sprouts:`Harvest ${number(n)} crops. Brussels sprouts count double.`,goods:`Make ${number(n)} batches of goods`,fish:`Catch ${number(n)} fish`,hand:`Lend a helping hand ${number(n)} times`}[kind]??'';
}
const KIND_NAMES={avatar:'Avatar',frame:'Avatar frame',badge:'Badge',title:'Title',color:'Name colour',bg:'Profile background',bobber:'Float',rod:'Fishing rod',emblem:'Family emblem',tractor:'Tractor paint'};
export const lookKindName=kind=>KIND_NAMES[kind]??'';
// A look's picture: an avatar's face, a frame or a background as it is, a colour or a title as the words themselves.
export function lookArt(id){
 const look=seasonLook(id);if(!look)return '';
 if(look.kind==='avatar')return `<img class="game-art season-look-face" src="${seasonAvatar(id)?.src??playerAvatar(id).src}" alt="" loading="lazy" decoding="async" draggable="false">`;
 if(look.kind==='title')return `<span class="season-look-title">${esc(look.name)}</span>`;
 if(look.kind==='color')return `<span class="season-look-color" style="--look-color:${look.color}">Aa</span>`;
 if(look.kind==='bobber'||look.kind==='rod')return `<span class="season-look-dot" style="--look-dot:#${look.colors.top.toString(16).padStart(6,'0')}">${art('fishingpond')}</span>`;
 return art(look.art,`season-look-${look.kind}`);
}
// One reward as pictures with an amount and what it is: the cells, the toast and the skip's question.
export function seasonRewardParts(r){
 const parts=[];
 // say: the same in the farmer's language at once (t), for the skip's question, which the page's translation cannot cut into pieces.
 for(const id of r.looks??[]){const look=seasonLook(id),plain=look.kind==='title'||look.kind==='color';
  parts.push({art:null,html:plain?'':lookArt(id),look:id,main:look.name,sub:lookKindName(look.kind),color:look.kind==='color'?look.color:'',title:look.kind==='title',label:`${look.name} (${lookKindName(look.kind).toLowerCase()})`,say:t('{0} ({1})',t(look.name),t(lookKindName(look.kind)))});}
 for(const id of r.farmer??[])parts.push({art:null,farmer:id,main:partName(id),sub:'My farmer',label:`${partName(id)} (My farmer)`,say:t('{0} ({1})',t(partName(id)),t('My farmer'))});
 if(r.coins)parts.push({art:'coins',main:number(r.coins),sub:'coins',label:`${number(r.coins)} coins`,say:t('{0} coins',r.coins)});
 if(r.diamonds)parts.push({art:'diamonds',main:number(r.diamonds),sub:'diamonds',label:`${number(r.diamonds)} diamonds`,say:t('{0} diamonds',r.diamonds)});
 for(const [key,n] of Object.entries(r.items??{}))parts.push({art:key,main:number(n),sub:ITEMS[key].name,label:`${n} × ${ITEMS[key].name}`,say:`${n} × ${t(ITEMS[key].name)}`});
 for(const [crop,n] of Object.entries(r.seeds??{}))parts.push({art:`${crop}-seeds`,main:number(n),sub:CROPS[crop].seedName,label:`${n} × ${CROPS[crop].seedName}`,say:`${n} × ${t(CROPS[crop].seedName)}`});
 if(r.boost)parts.push({art:BOOSTS[r.boost].art,main:BOOSTS[r.boost].name,sub:BOOST_LENGTH_NAMES[r.length],label:`${BOOSTS[r.boost].name} · ${BOOST_LENGTH_NAMES[r.length]}`,say:`${t(BOOSTS[r.boost].name)}, ${t(BOOST_LENGTH_NAMES[r.length])}`});
 if(r.vipDays)parts.push({art:'vip',main:'VIP',sub:`${r.vipDays} days`,label:`VIP · ${r.vipDays} days`,say:`VIP, ${t('{0} days',r.vipDays)}`});
 if(r.farmhand)parts.push({art:'farmhand',main:'Farmhand',sub:'1 day',label:'Farmhand · 1 day',say:`${t('Farmhand')}, ${t('1 day')}`});
 if(r.cart)parts.push({art:'coin-cart',main:number(r.cartCoins),sub:'coins',label:`Coin cart: ${number(r.cartCoins)} coins`,say:t('Coin cart: {0} coins',r.cartCoins)});
 if(r.discount)parts.push({art:'hammer',main:BOOSTS.upgrade.name,sub:'50% off one upgrade',label:BOOSTS.upgrade.name,say:t(BOOSTS.upgrade.name)});
 if(r.crops)parts.push({art:'seeds',main:BOOSTS.crops.name,sub:'Every growing crop',label:BOOSTS.crops.name,say:t(BOOSTS.crops.name)});
 if(r.production)parts.push({art:'boost',main:BOOSTS.production.name,sub:'Every running batch',label:BOOSTS.production.name,say:t(BOOSTS.production.name)});
 return parts;
}
// The value line of the buy box (plan §6.4): honest, no "was" price, no euro beside diamonds.
export function seasonValueLines(season){
 const t=seasonTotals(season);
 return [t.farmerParts?`Over ${SEASON_TIERS} tiers: ${number(t.diamonds)} diamonds, ${t.vipDays} days of VIP, ${t.farmhandDays} days of farmhand, ${t.boosts} boosts, ${t.avatars} avatars, ${t.otherLooks} other season looks and ${t.farmerParts} things for My farmer.`
  :`Over ${SEASON_TIERS} tiers: ${number(t.diamonds)} diamonds, ${t.vipDays} days of VIP, ${t.farmhandDays} days of farmhand, ${t.boosts} boosts, ${t.avatars} avatars and ${t.otherLooks} other season looks.`,
  `What you can buy of it in the shop costs more than ${number(Math.floor(t.shop/100)*100)} diamonds there. You get it by reaching tiers.`];
}
// A leaf chip on Today's cards while leaves count for this farm (beside the Halloween Pass's lantern chip): what a gift, a challenge or a
// delivery brings, doubled in a double week or on a double day. In Winter a snowflake chip, with the winter ticket.
export function leafChip(state,kind,now){
 const v=seasonView(state,now);if(!v||v.phase!=='open'||!v.entry)return '';
 const n=({gift:30,daily:15,delivery:15})[kind]*(v.double?2:1);
 return `<b class="is-leaf" title="Season Pass">${art(v.season.art??SEASON_ART)}${byPoint(v.season,`+${n} leaves`,`+${n} snowflakes`)}</b>`;
}
// The small line under the tile in More.
export function seasonHint(view){if(!view)return '';if(view.phase==='soon')return 'Coming soon';return view.waiting?'A reward is waiting':`Tier ${view.tier} of ${SEASON_TIERS}`;}
// What the farmer wears on their card now: the last save here, else the profile the farm opened with.
export const worn=()=>{const look=window.harvestLook??window.harvestInitialFarm?.profile?.look;return look&&typeof look==='object'?look:{};};

export function createSeasonUI({state,runAction,notify,onChange=()=>{},bridge=()=>window.parent?.harvestBridge,doc=document,clock=farmNow}){
 const $=id=>doc.getElementById(id);
 const button=$('season-button'),dot=$('season-dot'),dialog=$('season-dialog'),content=$('season-content'),hint=$('season-menu-hint');
 if(!button||!dialog||!content)return {open(){},refresh(){}};
 // pending, feedback and requestIds per season (the open one and the one in its pre-sale each have their own checkout row).
 let catalog=null,pending='',busy='',requestIds={},drawn='',feedback={},preview=null,prevOpen=false;
 const now=()=>clock();
 const sells=()=>seasonSellsHere(doc);
 const avatarId=()=>window.harvestAvatarId??window.harvestInitialFarm?.profile?.avatar_id??'default';
 const farmerName=()=>doc.getElementById('player-name')?.dataset.username||window.harvestInitialFarm?.profile?.username||'You';
 // What a look's button says: Use, or In use when it is worn (on the card, the farm or as the avatar).
 function inUse(id){
  const look=seasonLook(id);if(!look)return false;
  if(look.kind==='avatar')return avatarId()===id;
  if(['bobber','rod','tractor'].includes(look.kind))return state.lookFarm?.[look.kind]===id;
  if(look.kind==='emblem')return false;
  return worn()[look.kind]===id;
 }
 const useButton=id=>{
  const look=seasonLook(id);if(!look||!ownsLook(state,id))return '';
  if(look.kind==='emblem')return '<small class="season-use-note">Your family leader can pick it in Family settings.</small>';
  return inUse(id)?'<span class="season-in-use"><i data-lucide="check"></i>In use</span>':`<button type="button" class="small-button season-use" data-season-use="${id}" ${busy?'disabled':''}>Use</button>`;
 };
 // A part for your own farmer (Winter 2026 on): Wear once it is yours (My farmer opens with it on, and Save keeps it), In use when worn.
 const wearButton=id=>{
  const part=farmerPart(id);if(!part||!farmerPassParts(state).includes(id))return '';
  return state.farmer?.[part.slot]===id?'<span class="season-in-use"><i data-lucide="check"></i>In use</span>':`<button type="button" class="small-button season-use" data-season-wear="${id}" ${busy?'disabled':''}>Wear</button>`;
 };
 // One reward cell. id: the season the claim is for when it is not the one shown (the last season's strip).
 function cell(view,track,t,level,id=''){
  const s=view.season,raw=s.tiers[t-1][track],r=seasonReward(raw,level),parts=seasonRewardParts(r),entry=view.entry;
  const reached=view.phase!=='soon'&&t<=view.tier,claimed=entry?.[track]?.includes(t)||(raw.purchase&&view.premium),locked=track==='paid'&&!view.premium;
  const open=view.phase==='open'||view.phase==='claim';
  const action=!open?'':claimed?`<span class="season-collected"><i data-lucide="check"></i>${raw.purchase?'Yours':'Collected'}</span>`
   :locked?`<span class="season-lock" title="${level<SEASON_BUY_LEVEL?`For sale from level ${SEASON_BUY_LEVEL}`:'Unlock the paid rewards first.'}">${art('lock')}</span>`
   :reached?`<button type="button" class="primary-button season-claim" data-season-claim="${track}" data-season-tier="${t}"${id?` data-season-id="${id}"`:''} ${busy?'disabled':''}>Claim</button>`:'';
  const rewards=parts.map(p=>p.look?`<button type="button" class="season-reward season-look is-${seasonLook(p.look).kind}" data-season-look="${p.look}" title="${esc(p.label)}">${p.html}<span><b${p.color?` style="color:${p.color}"`:''}${p.title?' class="is-title"':''}>${esc(p.main)}</b><small>${esc(p.sub)}</small></span></button>`
   :p.farmer?`<span class="season-reward season-farmer" title="${esc(p.label)}"><span class="season-farmer-thumb" style="${farmerThumbStyle(farmerPart(p.farmer).slot,p.farmer)}" aria-hidden="true"></span><span><b>${esc(p.main)}</b><small>${esc(p.sub)}</small></span></span>`
   :`<span class="season-reward" title="${esc(p.label)}">${art(p.art)}<span><b>${esc(p.main)}</b><small>${esc(p.sub)}</small></span></span>`).join('');
  const uses=claimed?[...(r.looks??[]).map(useButton),...(r.farmer??[]).map(wearButton)].join(''):'';
  return `<div class="season-cell is-${track}${claimed?' is-claimed':''}${locked?' is-locked':''}">${rewards}${action}${uses}</div>`;
 }
 // What a season's checkout shows: whether it can start (sold here, priced, in the catalogue), the button's words and a note.
 function sale(id){
  const offer=catalog?.seasons?.find?.(x=>x.id===id)??(catalog?.season?.id===id?catalog.season:null),cents=offer?.cents??catalog?.season?.cents??1999;
  const ready=Boolean(catalog?.enabled&&offer?.ready),busyHere=pending===id;
  const label=busyHere?'Opening secure checkout…':catalog?.mode==='test'?`Test purchase · €${(cents/100).toFixed(2)}`:`Buy for ${shopPrice(catalog,'season',cents)}`;
  return {ready,label,disabled:!ready||Boolean(pending),note:catalog&&!ready&&!busyHere?'Purchases are not available yet. Please check back later.':feedback[id]??''};
 }
 function buyBox(view,level){
  if(view.premium||view.phase!=='open'||!sells())return '';
  if(level<SEASON_BUY_LEVEL)return '';
  const {label,disabled,note}=sale(view.season.id);
  const [holds,worth]=seasonValueLines(view.season),paidLooks=view.season.tiers.flatMap(t=>t.paid.looks??[]);
  // Its paid avatars, its frame and its paid badges (Autumn: the Harvest chef, the Pumpkin royal, the wreath, the Golden pumpkin).
  const kind=id=>SEASON_LOOKS[id].kind,show=[...paidLooks.filter(id=>kind(id)==='avatar'),...paidLooks.filter(id=>kind(id)==='frame'),...paidLooks.filter(id=>kind(id)==='badge')];
  return `<section class="season-paid-box"><div class="season-paid-looks">${show.map(id=>`<button type="button" class="season-paid-look" data-season-look="${id}" title="${esc(SEASON_LOOKS[id].name)}">${lookArt(id)}</button>`).join('')}</div>`
   +`<div class="season-paid-copy"><strong>Unlock the paid rewards</strong><small>${holds}</small><small class="season-value">${worth}</small><small>With the ${esc(SEASON_LOOKS[view.season.tiers[0].paid.looks[0]].name)} avatar, yours at once. Tiers you already reached open at once.</small></div>`
   +`<button type="button" class="primary-button season-buy" data-season-buy="${view.season.id}" ${disabled?'disabled':''}>${label}</button><p class="season-feedback" role="status" aria-live="polite">${note}</p></section>`;
 }
 // The next season in its pre-sale (Winter 2026 while Autumn runs), at the very bottom of the window: its banner, when it starts, a few
 // of its rewards as small tiles and a line, and its own buy button from level 20 where it is sold; "Bought ✓" once bought (its paid
 // avatar is yours then already). Nothing to collect or count before its start.
 function comingCard(c){
  if(!c)return '';
  const s=c.season,purchaseLook=s.tiers[0].paid.looks?.[0],paid=s.tiers.flatMap(t=>t.paid.looks??[]),free=s.tiers.flatMap(t=>t.free.looks??[]);
  const kind=id=>SEASON_LOOKS[id].kind,avatars=[...paid,...free].filter(id=>kind(id)==='avatar').sort((a,b)=>SEASON_LOOK_SOURCE[a].tier-SEASON_LOOK_SOURCE[b].tier);
  const looks=[...avatars,...paid.filter(id=>kind(id)==='badge').slice(-1),...paid.filter(id=>kind(id)==='frame')];
  const parts=s.tiers.flatMap(t=>t.paid.farmer??[]).slice(-1);
  const tiles=looks.map(id=>`<button type="button" class="season-coming-tile" data-season-look="${id}" title="${esc(SEASON_LOOKS[id].name)}">${lookArt(id)}</button>`).join('')
   +parts.map(id=>`<span class="season-coming-tile" title="${esc(partName(id))}"><span class="season-farmer-thumb" style="${farmerThumbStyle(farmerPart(id).slot,id)}" aria-hidden="true"></span></span>`).join('');
  let buy='';
  if(c.premium)buy=`<p class="season-coming-bought">Bought ✓</p><small class="season-coming-note">The ${esc(SEASON_LOOKS[purchaseLook].name)} avatar is yours already. The paid rewards open when the season starts.</small>`;
  else if(sells()&&!c.canBuy)buy=`<small class="season-coming-note">For sale from level ${SEASON_BUY_LEVEL}</small>`;
  else if(sells()){const {label,disabled,note}=sale(s.id);
   buy=`<small class="season-coming-note">With the ${esc(SEASON_LOOKS[purchaseLook].name)} avatar, yours at once. The paid rewards open when the season starts.</small>`
    +`<button type="button" class="primary-button season-buy" data-season-buy="${s.id}" ${disabled?'disabled':''}>${label}</button><p class="season-feedback" role="status" aria-live="polite">${note}</p>`;}
  return `<section class="season-coming" aria-labelledby="season-coming-title"><img class="season-banner" src="${pictureFile(s.banner)}" alt="" width="1536" height="512" loading="lazy" decoding="async" draggable="false">`
   +`<div class="season-coming-copy"><h3 id="season-coming-title">${art(s.art,'season-coming-ticket')}<span>${esc(s.passName??s.title)}</span></h3><p class="season-phase">${esc(s.starts??'')}</p>`
   +`<div class="season-coming-tiles">${tiles}</div>${s.teaser?`<p class="season-rule">${esc(s.teaser)}</p>`:''}${buy}</div></section>`;
 }
 // The last season's collecting week (from 22 December: Autumn under Winter): one line, and on a tap the rewards still waiting there,
 // each with its own Claim (for that season).
 function prevStrip(view,level){
  const p=view.prev;if(!p||!p.waiting)return '';
  const line=`<p class="season-prev">Last season: ${p.waiting} reward${p.waiting===1?'':'s'}, ${formatDuration(p.season.claimUntil-now())} left</p>`;
  if(!prevOpen)return `<section class="season-prev-strip">${art(p.season.art,'season-prev-art')}${line}<button type="button" class="small-button season-prev-toggle" aria-expanded="false">Show</button></section>`;
  const v={season:p.season,entry:p.entry,premium:seasonPremium(state,p.season.id),phase:'claim',tier:p.tier},rows=[];
  for(let n=1;n<=p.tier;n++){
   const waits=track=>!p.season.tiers[n-1][track].purchase&&!p.entry[track].includes(n)&&(track==='free'||v.premium);
   if(waits('free')||waits('paid'))rows.push(`<li class="season-row is-reached${v.premium?'':' is-free-only'}"><b class="season-tier">${n}</b>${cell(v,'free',n,level,p.season.id)}${v.premium?cell(v,'paid',n,level,p.season.id):''}</li>`);
  }
  return `<section class="season-prev-strip is-open">${art(p.season.art,'season-prev-art')}${line}<button type="button" class="small-button season-prev-toggle" aria-expanded="true">Hide</button><ol class="season-tiers season-prev-tiers">${rows.join('')}</ol></section>`;
 }
 function previewMarkup(id){
  const look=seasonLook(id),name=esc(farmerName()),face=`<img src="${playerAvatar(avatarId()).src}" alt="" width="96" height="96">`;
  const source=SEASON_LOOK_SOURCE[id],where=source?`Season Pass ${seasonById(source.season)?.title??''}, tier ${source.tier}`:'';
  let shown='';
  if(look.kind==='avatar')shown=`<img class="season-preview-face" src="${seasonAvatar(id)?.src}" alt="" width="192" height="192">`;
  else if(look.kind==='frame')shown=`<span class="season-preview-framed">${face}<img class="season-preview-frame" src="${pictureFile(look.art)}" alt=""></span><b>${name}</b>`;
  else if(look.kind==='bg')shown=`<span class="season-preview-card" style="--look-bg:url('${pictureFile(look.art)}')">${face}<b>${name}</b></span>`;
  else if(look.kind==='color')shown=`<span class="season-preview-chat"><b style="color:${look.color}">${name}</b><span>Hello, neighbours!</span></span>`;
  else if(look.kind==='title')shown=`<span class="season-preview-name"><b>${name}</b><small>${esc(look.name)}</small></span>`;
  else if(look.kind==='badge')shown=`<span class="season-preview-name"><b>${name}${art(look.art,'season-badge-mark')}</b></span>${art(look.art,'season-preview-big')}`;
  else shown=`<span class="season-preview-big-art">${lookArt(id)}</span>`;
  return `<div class="season-preview" role="group" aria-label="${esc(look.name)}"><button type="button" class="icon-button season-preview-close" aria-label="Close"><i data-lucide="x"></i></button><div class="season-preview-show">${shown}</div><strong>${esc(look.name)}</strong><small>${esc(lookKindName(look.kind))}${where?` · ${esc(where)}`:''}</small>${useButton(id)}</div>`;
 }
 function render(){
  const t=now(),view=seasonView(state,t);if(!view){content.innerHTML='';return;}
  const s=view.season,level=levelOf(state),open=view.phase==='open',paidColumn=view.premium||sells();
  const point=art(s.pointArt,'season-point');
  const bars=view.phase==='soon'||!view.entry?'':`<div class="season-bars">
   ${open?`<div class="season-bar is-today"><span>${point}<span>Today</span></span><b>${number(view.today)} / ${number(view.cap)}</b><progress max="${view.cap}" value="${Math.min(view.today,view.cap)}" aria-label="${byPoint(s,'Leaves today','Snowflakes today')}"></progress></div>`:''}
   <div class="season-bar is-tier"><span>Tier ${view.tier} of ${SEASON_TIERS}</span><b>${view.tier<SEASON_TIERS?(open?byPoint(s,`${number(view.toNext)} leaves to tier ${view.tier+1}`,`${number(view.toNext)} snowflakes to tier ${view.tier+1}`):''):byPoint(s,`${number(view.toChest)} leaves to a bonus chest`,`${number(view.toChest)} snowflakes to a bonus chest`)}</b><progress max="${view.tier<SEASON_TIERS?view.perTier:SEASON_CHEST_POINTS}" value="${view.tier<SEASON_TIERS?view.inTier:SEASON_CHEST_POINTS-view.toChest}" aria-label="${byPoint(s,'Leaves to the next tier','Snowflakes to the next tier')}"></progress></div>
  </div>`;
  const w=view.week,goal=w?.goal;
  // A double day inside a week (Winter's New Year): its own line under the week's name.
  const doubleDay=view.doubleDay?`<span>${esc(view.doubleDay.name)}: everything counts double</span>`:'';
  const week=!open||!w?'':`<section class="season-week">${art(w.art,'season-week-art')}<div><strong>${esc(w.name)}${w.double?': everything counts double':''}</strong>${doubleDay}${goal?`<span>${view.weekDone?byPoint(s,'Weekly goal reached: +200 leaves','Weekly goal reached: +200 snowflakes'):byPoint(s,`Weekly goal: ${weekGoalText(goal.kind,view.weekTarget)} <b>${number(Math.min(view.weekCount,view.weekTarget))} / ${number(view.weekTarget)}</b>, +200 leaves`,`Weekly goal: ${weekGoalText(goal.kind,view.weekTarget)} <b>${number(Math.min(view.weekCount,view.weekTarget))} / ${number(view.weekTarget)}</b>, +200 snowflakes`)}</span>`:`<span>${byPoint(s,`Up to ${number(view.cap)} leaves a day.`,`Up to ${number(view.cap)} snowflakes a day.`)}</span>`}</div></section>`;
  const skip=open&&view.entry&&view.tier<SEASON_TIERS?`<div class="season-skip"><button type="button" class="season-skip-button" ${busy?'disabled':''}>${art('hourglass')}<span>Skip a tier</span><b>${art('diamonds')}${SEASON_SKIP_COST}</b></button><small>Skip a tier: ${SEASON_SKIP_COST} diamonds per tier.</small></div>`:'';
  const rows=[];
  for(let block=0;block<SEASON_TIERS/10;block++){
   rows.push(`<li class="season-block"><h3>Tiers ${block*10+1} to ${block*10+10}</h3></li>`);
   for(let n=block*10+1;n<=block*10+10;n++){const reached=view.phase!=='soon'&&n<=view.tier;rows.push(`<li class="season-row${reached?' is-reached':''}${n===view.tier+1&&open?' is-next':''}${paidColumn?'':' is-free-only'}" data-season-row="${n}"><b class="season-tier">${n}</b>${cell(view,'free',n,level)}${paidColumn?cell(view,'paid',n,level):''}</li>`);}
  }
  const chests=view.tier>=SEASON_TIERS&&(open||view.phase==='claim')?`<section class="season-chest">${art('family-chest-gold','season-chest-art')}<div><strong>Bonus chest</strong><span>${byPoint(s,`Every ${number(SEASON_CHEST_POINTS)} leaves after tier ${SEASON_TIERS}: ${number(Math.round(SEASON_CHEST_COINS*Math.max(1,level)/5)*5)} coins.`,`Every ${number(SEASON_CHEST_POINTS)} snowflakes after tier ${SEASON_TIERS}: ${number(Math.round(SEASON_CHEST_COINS*Math.max(1,level)/5)*5)} coins.`)}</span></div>${view.chests>view.chestsClaimed?`<button type="button" class="primary-button season-chest-open" ${busy?'disabled':''}>Open</button>`:''}</section>`:'';
  const waiting=view.waiting?`<p class="season-waiting">${view.waiting} reward${view.waiting===1?' is':'s are'} waiting</p>`:'';
  const lockedHead=level<SEASON_BUY_LEVEL&&!view.premium?`${art('lock')}Paid<small>For sale from level ${SEASON_BUY_LEVEL}</small>`:view.premium?'Paid':`${art('lock')}Paid`;
  const rule=byPoint(s,'<span>Leaves only count this season.</span> <span>You earn leaves just by playing.</span>','<span>Snowflakes only count this season.</span> <span>You earn snowflakes just by playing.</span>');
  content.innerHTML=`<nav class="season-tabs" aria-label="Passes" hidden><button type="button" aria-pressed="true">${art(s.art)}<span>${esc(s.name)}</span></button></nav>`
   +`<section class="season-top"><img class="season-banner" src="${pictureFile(s.banner)}" alt="" width="1536" height="512" decoding="async" draggable="false"><div class="season-top-copy"><p class="season-phase" data-season-phase>${seasonPhaseLine(view,t)}</p><p class="season-rule"><span>${seasonRule(view)}</span> ${rule}</p></div></section>`
   +prevStrip(view,level)+bars+week+waiting+skip+buyBox(view,level)
   +`<div class="season-heads${paidColumn?'':' is-free-only'}" aria-hidden="true"><span></span><b>Free</b>${paidColumn?`<b>${lockedHead}</b>`:''}</div>`
   +(open&&view.tier>0?`<button type="button" class="small-button season-to-tier">Go to my tier</button>`:'')
   +`<ol class="season-tiers">${rows.join('')}</ol>${chests}${comingCard(seasonComing(state,t))}${preview?previewMarkup(preview):''}`;
  content.querySelectorAll('[data-season-claim]').forEach(b=>b.onclick=()=>claim(b.dataset.seasonClaim,Number(b.dataset.seasonTier),b.dataset.seasonId));
  content.querySelectorAll('[data-season-look]').forEach(b=>b.onclick=()=>{preview=b.dataset.seasonLook;draw();content.querySelector('.season-preview')?.scrollIntoView?.({block:'nearest'});});
  content.querySelectorAll('[data-season-use]').forEach(b=>b.onclick=event=>{event.stopPropagation();use(b.dataset.seasonUse);});
  content.querySelectorAll('[data-season-wear]').forEach(b=>b.onclick=event=>{event.stopPropagation();wear(b.dataset.seasonWear);});
  const close=content.querySelector('.season-preview-close');if(close)close.onclick=()=>{preview=null;draw();};
  content.querySelectorAll('[data-season-buy]').forEach(b=>b.onclick=()=>purchase(b.dataset.seasonBuy));
  const toggle=content.querySelector('.season-prev-toggle');if(toggle)toggle.onclick=()=>{prevOpen=!prevOpen;draw();};
  const skipButton=content.querySelector('.season-skip-button');if(skipButton)skipButton.onclick=skipTier;
  const chest=content.querySelector('.season-chest-open');if(chest)chest.onclick=openChest;
  const toTier=content.querySelector('.season-to-tier');if(toTier)toTier.onclick=()=>scrollToNext(true);
  refreshArt();
 }
 const key=()=>{const t=now(),v=seasonView(state,t),c=seasonComing(state,t);return JSON.stringify([v?.season.id,v?.phase,v?.points,v?.today,v?.tier,v?.entry?.free,v?.entry?.paid,v?.chestsClaimed,v?.premium,v?.weekDone,v?.waiting,v?.prev?.entry?.free,v?.prev?.entry?.paid,v?.doubleDay?.name,c?.season.id,c?.premium,c?.canBuy,prevOpen,levelOf(state),pending,busy,feedback,preview,catalog?.enabled,catalog?.season?.ready,catalog?.seasons,state.lookFarm,worn(),avatarId(),state.looks?.length,state.farmerParts,state.farmer]);};
 function draw(){drawn=key();render();}
 function scrollToNext(mine=false){
  const row=(mine?null:content.querySelector('.season-tiers:not(.season-prev-tiers) .season-claim')?.closest('.season-row'))??content.querySelector('.season-row.is-next')??content.querySelector(`[data-season-row="${seasonView(state,now())?.tier||1}"]`);
  row?.scrollIntoView?.({block:'center'});
 }
 // id: the last season's, from its strip (claimSeasonTier takes the season named); none: the season shown.
 async function claim(track,tier,id){
  if(busy)return;busy=`${track}:${tier}`;draw();
  try{const r=await runAction({type:'season_claim',track,tier,...(id?{season:id}:{})});notify(`Season Pass, tier ${tier}: ${seasonRewardParts(r??{}).map(p=>p.label).join(' · ')}`);onChange();}
  catch(error){notify(error.message);}
  finally{busy='';refresh();if(dialog.open)draw();}
 }
 async function skipTier(){
  const view=seasonView(state,now());if(busy||!view||view.tier>=SEASON_TIERS)return;
  const next=view.tier+1,level=levelOf(state),s=view.season;
  const list=[...seasonRewardParts(seasonReward(s.tiers[next-1].free,level)).map(p=>t('{0} (free)',p.say)),...(view.premium?seasonRewardParts(seasonReward(s.tiers[next-1].paid,level)).map(p=>t('{0} (paid)',p.say)):[])];
  if(!await confirmDiamondSpend({title:t('Open tier {0}?',next),cost:SEASON_SKIP_COST,description:`${t('Open tier {0} for {1} diamonds. You get:',next,SEASON_SKIP_COST)} ${list.join(', ')}. ${t('Then collect each reward as usual.')}`,picture:'hourglass',balance:state.diamonds,translated:true}))return;
  busy='skip';draw();
  try{const r=await runAction({type:'season_skip',expectedCost:SEASON_SKIP_COST});notify(`Tier ${r.tier} is open. Collect its rewards below.`);onChange();}
  catch(error){notify(error.message);}
  finally{busy='';refresh();if(dialog.open){draw();scrollToNext();}}
 }
 async function openChest(){
  if(busy)return;busy='chest';draw();
  try{const r=await runAction({type:'season_chest'});notify(`Bonus chest: ${number(r.coins)} coins`);onChange();}
  catch(error){notify(error.message);}
  finally{busy='';refresh();if(dialog.open)draw();}
 }
 // Wear a look: an avatar through Settings' own request, a frame, badge, title, colour or background on the card (farm-api look), the
 // float, the rod or the paint on the farm itself.
 async function use(id){
  const look=seasonLook(id);if(!look||busy||!ownsLook(state,id))return;busy=`use:${id}`;draw();
  try{
   if(look.kind==='avatar'){
    const data=await bridge().request({operation:'avatar',avatarId:id});window.harvestAvatarId=data?.profile?.avatar_id??id;
    window.dispatchEvent(new CustomEvent('harvest-avatar-changed',{detail:{playerId:bridge().playerId,avatarId:id}}));
   }else if(['bobber','rod','tractor'].includes(look.kind))await runAction({type:'season_look',slot:look.kind,id});
   else{const data=await bridge().request({operation:'look',look:{...worn(),[look.kind]:id}});window.harvestLook=data?.look??{...worn(),[look.kind]:id};window.dispatchEvent(new CustomEvent('harvest-look-changed',{detail:window.harvestLook}));}
   notify(`${look.name} is in use.`);onChange();
  }catch(error){notify(error.message);}
  finally{busy='';refresh();if(dialog.open)draw();}
 }
 // Wear a part for your own farmer: this window closes and My farmer opens with it on (game.js window.harvestMyFarmer); Save keeps it.
 function wear(id){
  if(busy||!farmerPassParts(state).includes(id)||!window.harvestMyFarmer?.open)return;
  dialog.close();void window.harvestMyFarmer.open({wear:id});
 }
 // A purchase of a season: the one shown (its buy box) or the next one in its pre-sale (its card). The checkout names the season, so the
 // server credits that one (game/payments.js seasonForCheckout).
 async function purchase(id){
  const t=now(),view=seasonView(state,t),c=seasonComing(state,t),canBuy=view?.season.id===id&&view.phase==='open'&&!view.premium||c?.season.id===id&&!c.premium&&c.canBuy;
  if(pending||!sells()||!canBuy||levelOf(state)<SEASON_BUY_LEVEL)return;
  pending=id;feedback={...feedback,[id]:''};draw();
  requestIds[id]??=crypto.randomUUID();
  try{const done=await bridge().checkout('season',requestIds[id],undefined,{season:id});if(done?.store){pending='';draw();}}
  catch(error){pending='';feedback={...feedback,[id]:error.message};draw();}
 }
 async function readCatalog(){
  const t=now(),view=seasonView(state,t),c=seasonComing(state,t),level=levelOf(state);
  const wanted=view?.phase==='open'&&!view.premium&&level>=SEASON_BUY_LEVEL||c&&!c.premium&&c.canBuy;
  if(catalog?.seasons||!sells()||!wanted)return;
  try{catalog=await bridge().payments({operation:'catalog'});if(dialog.open)draw();}catch{}
 }
 function open(){
  const view=seasonView(state,now());if(!view?.visible)return;
  doc.querySelectorAll('dialog[open]').forEach(d=>d!==dialog&&d.close());
  requestIds={};pending='';feedback={};preview=null;draw();
  if(!dialog.open)dialog.showModal();dialog.scrollTop=0;scrollToNext();void readCatalog();
 }
 // The Diamond shop: a line for the Season Pass under the Halloween Pass's, while it is for sale here and not bought yet.
 function shelf(view){
  let b=$('shop-season');const deals=doc.querySelector('#boost-dialog .shop-deals');
  if(!b&&!deals)return;
  if(!b){b=doc.createElement('button');b.type='button';b.id='shop-season';b.className='shop-pass shop-season';b.onclick=open;deals.append(b);}
  const show=Boolean(view?.visible&&view.phase==='open'&&!view.premium&&sells()&&levelOf(state)>=SEASON_BUY_LEVEL&&catalog?.season?.ready!==false);
  b.hidden=!show;if(!show)return;
  const html=`${art(view.season.art)}<span class="shop-pass-copy"><b>Season Pass</b><small>${seasonPhaseLine(view,now())}</small></span><span class="shop-pass-price"><b>${shopPrice(catalog,'season',catalog?.season?.cents??1999)}</b></span>`;
  if(b.dataset.html!==html){b.dataset.html=html;b.innerHTML=html;}
 }
 // The season's own ticket on its button, the window's heading and the tile in More (Autumn's in farm.html; Winter's from 22 December).
 function ticket(key){
  for(const el of [button.querySelector('.game-art,[data-game-art]'),dialog.querySelector('.dialog-heading .dialog-badge'),$('season-menu-entry')?.querySelector('.game-art,[data-game-art]')]){
   if(!el||(el.dataset.art??el.dataset.gameArt)===key)continue;
   const box=doc.createElement('template');box.innerHTML=art(key,[...el.classList].filter(c=>c!=='game-art').join(' '));const picture=box.content.firstElementChild;
   if(picture){if(el.hasAttribute('aria-hidden'))picture.setAttribute('aria-hidden','true');el.replaceWith(picture);}
  }
 }
 function refresh(){
  const t=now(),view=seasonView(state,t),visible=Boolean(view?.visible);
  button.hidden=!visible;if(dot)dot.hidden=!(visible&&view.waiting);
  if(hint)hint.textContent=visible?seasonHint(view):'Coming soon';
  if(view)ticket(view.season.art);
  shelf(view);
  if(!dialog.open)return;
  if(!visible){dialog.close();return;}
  if(key()!==drawn)draw();else{const line=content.querySelector('[data-season-phase]');if(line)line.textContent=seasonPhaseLine(view,t);}
 }
 const onCatalog=event=>{catalog=event.detail??catalog;refresh();};
 const onLook=()=>{if(dialog.open)draw();};
 window.addEventListener('harvest-catalog',onCatalog);window.addEventListener('harvest-look-changed',onLook);
 window.addEventListener('harvest-avatar-changed',event=>{if(event.detail?.avatarId)window.harvestAvatarId=event.detail.avatarId;onLook();});
 button.onclick=open;
 const timer=setInterval(refresh,10000);
 window.addEventListener('pagehide',()=>{clearInterval(timer);window.removeEventListener('harvest-catalog',onCatalog);window.removeEventListener('harvest-look-changed',onLook);},{once:true});
 refresh();
 return {open,refresh};
}
