import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {ITEMS,CROPS,itemAvailable,levelOf} from './farm-state.js';
// Daily sharing inside a Farm Family: help a member with coins, send a gift of any crop or good, ask for any crop or good
// of any crop or good you have unlocked, and fill someone else's request. Everything comes out of your own farm (harvest_social in retention-social.sql moves it),
// so this screen only has to make the choices clear and say up front what cannot be done today.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SHARE_LIMIT=3;
// Both grow with your level (26 Sep 2026; harvest_social checks the same, supabase/family-sharing-by-level.sql): help costs you
// level × 25 coins and gives them to the member, and a gift or a request is up to 5 per 10 levels (level 10: 5, level 30: 15).
export const helpCoins=level=>25*Math.max(10,Math.floor(Number(level)||0));
export const maxShare=level=>5*Math.max(1,Math.floor((Number(level)||0)/10));
const itemName=key=>(ITEMS[key]?.name??key).toLowerCase();

// What the toast says after sharing, with the item's own name ("You sent 4 Fresh bread to Anna.").
export function sharingMessage(result,action,nameOf=id=>id){
 const item=ITEMS[result?.item]?.name,quantity=result?.quantity;
 if(!item||!quantity)return result?.message??'Done.';
 if(action.kind==='gift')return `You sent ${quantity} ${item} to ${nameOf(action.recipient)}.`;
 if(action.kind==='request')return `Your family can see your request for ${quantity} ${item}.`;
 if(action.kind==='fulfill')return `You gave ${quantity} ${item}. Your family thanks you!`;
 return result.message;
}

// Today's totals from the server's activity list (only rows this player sent or received).
export function sharingToday(social,me){
 const sent=kind=>social.activity.filter(a=>a.sender===me&&a.kind===kind).length;
 return {
  sent:social.activity.filter(a=>a.sender===me).length,
  received:social.activity.filter(a=>a.recipient===me).length,
  full:kind=>sent(kind)>=SHARE_LIMIT,
  done:(kind,recipient)=>social.activity.some(a=>a.sender===me&&a.recipient===recipient&&a.kind===kind)
 };
}

// It draws into the Sharing tab of Farm Family (mount), or into a dialog of its own (open) where no tab is around.
export function createSocialUI({state,notify,refreshFarm,getMembers=()=>[],onBack,document:doc=globalThis.document,bridge=globalThis.parent?.harvestBridge}){
 let dialog=null,root=null,embedded=false;
 function ownDialog(){if(!dialog){dialog=doc.createElement('dialog');dialog.id='sharing-dialog';dialog.className='game-dialog wide-dialog sharing-dialog';dialog.setAttribute('aria-labelledby','sharing-title');doc.body.append(dialog);}return dialog;}
 let social=null,busy=false,error='',pick={item:'wheat',quantity:3},gift={to:null,item:null,quantity:1};
 const me=()=>bridge.playerId,stock=key=>state?.inventory?.[key]??0,myLevel=()=>state?levelOf(state):10;
 // The family view keys members by membership row, the sharing list by player; the (unique) farmer name links the two.
 const member=id=>{const name=social?.members.find(m=>m.id===id)?.name;return name?getMembers().find(m=>m.username===name):undefined;};
 const portrait=id=>`<span class="family-member-portrait">${avatarImage(member(id)?.avatarId)}${member(id)?`<span class="online-dot ${member(id).online?'is-online':''}" aria-hidden="true"></span>`:''}</span>`;
 const nameOf=id=>id===me()?'You':esc(social.members.find(m=>m.id===id)?.name??member(id)?.username??'A family member');

 // A picker for any crop or good: one native list grouped into Crops and Goods (easy on phones), the chosen item's
 // picture beside it, and a 1–5 stepper.
 function itemPicker({kind,keys,picked,quantity,max,withStock=false}){
  const option=k=>`<option value="${k}" data-art="${k}"${withStock?` data-note="${stock(k)} in storage"`:''} ${k===picked?'selected':''}>${esc(ITEMS[k].name)}</option>`,crops=keys.filter(k=>CROPS[k]),goods=keys.filter(k=>!CROPS[k]);
  return `<div class="sharing-picker"><span class="sharing-picker-art">${art(picked)}</span><select data-pick="${kind}" aria-label="Choose a crop or good">${crops.length?`<optgroup label="Crops">${crops.map(option).join('')}</optgroup>`:''}${goods.length?`<optgroup label="Goods">${goods.map(option).join('')}</optgroup>`:''}</select><div class="sharing-stepper" aria-label="Quantity"><button type="button" data-step="${kind}" data-by="-1" aria-label="One less" ${quantity<=1?'disabled':''}>−</button><output>${quantity}</output><button type="button" data-step="${kind}" data-by="1" aria-label="One more" ${quantity>=max?'disabled':''}>+</button></div></div>`;
 }
 const giftKeys=()=>Object.keys(ITEMS).filter(k=>stock(k)>0);
 function members(today){
  if(!social.members.length)return '<p class="sharing-empty">Invite a farmer to your family to start sharing.</p>';
  const action=(kind,id,label,icon,blocked)=>{
   const done=today.done(kind,id);
   return `<button class="sharing-action" data-kind="${kind}" data-recipient="${esc(id)}" ${done||blocked?'disabled':''} title="${esc(blocked&&!done?blocked:'')}">${done?'✓ Sent':`${art(icon)}<span>${label}</span>`}</button>`;
  };
  const helpBlocked=today.full('help')?'You have helped 3 times today.':(state?.coins??0)<helpCoins(myLevel())?`You need ${helpCoins(myLevel())} coins.`:'';
  const giftBlocked=today.full('gift')?'You have sent 3 gifts today.':!giftKeys().length?'Nothing in storage to give yet.':'';
  const composer=m=>{
   if(gift.to!==m.id||today.done('gift',m.id)||giftBlocked)return '';
   const max=Math.min(maxShare(myLevel()),stock(gift.item));
   return `<div class="sharing-gift">${itemPicker({kind:'gift',keys:giftKeys(),picked:gift.item,quantity:gift.quantity,max,withStock:true})}<div class="sharing-gift-actions"><button type="button" class="link-button" data-gift-cancel>Cancel</button><button type="button" class="primary-button" data-send-gift>Send ${gift.quantity} ${esc(ITEMS[gift.item].name)}</button></div></div>`;
  };
  return `<div class="sharing-list">${social.members.map(m=>`<article class="sharing-row">${portrait(m.id)}<div class="sharing-who"><strong>${esc(m.name)}</strong><span>${member(m.id)?`Level ${member(m.id).level}`:'Family member'}</span></div><div class="sharing-actions">${action('help',m.id,`Help · ${helpCoins(myLevel())}`,'coins',helpBlocked)}${today.done('gift',m.id)?'<button class="sharing-action" disabled>✓ Sent</button>':`<button class="sharing-action ${gift.to===m.id?'is-open':''}" data-gift-open="${esc(m.id)}" ${giftBlocked?'disabled':''} title="${esc(giftBlocked)}" aria-expanded="${gift.to===m.id}">${art('gift')}<span>Gift</span></button>`}</div></article>${composer(m)}`).join('')}</div>`;
 }
 function requests(today){
  const open=social.requests;
  if(!open.length)return '<p class="sharing-empty">No requests yet today.</p>';
  return `<div class="sharing-list">${open.map(r=>{
   const mine=r.player_id===me(),have=stock(r.item),state_=r.fulfilled_by?`<span class="sharing-chip is-done">✓ ${r.fulfilled_by===me()?'You helped':'Fulfilled'}</span>`:mine?'<span class="sharing-chip">Your request</span>':today.full('fulfill')?'<span class="sharing-chip">Daily limit reached</span>':`<button class="sharing-action is-primary" data-kind="fulfill" data-request="${esc(r.id)}" ${have<r.quantity?'disabled':''}>${have<r.quantity?`You have ${have}`:`Give ${r.quantity}`}</button>`;
   return `<article class="sharing-row">${art(r.item,'sharing-item')}<div class="sharing-who"><strong>${mine?'You need':`${esc(r.name)} needs`} ${r.quantity} ${esc(itemName(r.item))}</strong><span>${mine&&!r.fulfilled_by?'Waiting for your family':r.fulfilled_by?`From ${nameOf(r.fulfilled_by)}`:`You have ${have}`}</span></div>${state_}</article>`;
  }).join('')}</div>`;
 }
 function ask(){
  if(social.requests.some(r=>r.player_id===me()))return '';
  const keys=Object.keys(ITEMS).filter(k=>itemAvailable(state,k));if(!keys.includes(pick.item))pick.item=keys[0]??'wheat';
  return `<section class="sharing-section"><h3>Ask for goods</h3><p class="sharing-hint">Once a day, up to ${maxShare(myLevel())} of any crop or good. Any family member can fill it.</p><form class="sharing-ask">${itemPicker({kind:'ask',keys,picked:pick.item,quantity:pick.quantity,max:maxShare(myLevel())})}<button class="primary-button">Ask for ${pick.quantity} ${esc(ITEMS[pick.item]?.name??pick.item)}</button></form></section>`;
 }
 function render(){
  if(!root)return;
  const heading=embedded?'':`<div class="dialog-heading"><div><span class="eyebrow">FARM FAMILY</span><h2 id="sharing-title">Daily sharing</h2></div><button class="icon-button close-dialog" data-close aria-label="Close"><i data-lucide="x"></i></button></div>${onBack?'<button class="back-button sharing-back" data-back><i data-lucide="chevron-left" data-line-icon></i>Back to Farm Family</button>':''}`;
  if(!social){root.innerHTML=heading+`<p class="sharing-empty">${esc(error||'Opening daily sharing…')}</p>`;bind();return;}
  const today=sharingToday(social,me());
  root.innerHTML=heading+`<section class="sharing-intro">${art('family-sharing')}<div><strong>Share a little of your own farm</strong><span>Help and gifts arrive right away. Up to ${SHARE_LIMIT} of each a day, resets at midnight UTC.</span></div><dl class="sharing-today"><div><dt>Sent</dt><dd>${today.sent}</dd></div><div><dt>Received</dt><dd>${today.received}</dd></div></dl></section>`
   +`<section class="sharing-section"><h3>Help your family</h3>${members(today)}</section>`
   +`<section class="sharing-section"><h3>Today’s requests</h3>${requests(today)}</section>`
   +ask()
   +'<p class="sharing-rules">Opens at level 10, 48 hours after you started your farm and 24 hours in this family.</p><p class="sharing-feedback" role="status" data-status></p>';
  bind();
 }
 function bind(){
  const close=root.querySelector('[data-close]');if(close)close.onclick=()=>dialog.close();
  const back=root.querySelector('[data-back]');if(back)back.onclick=()=>{dialog.close();onBack();};
  root.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>act({kind:b.dataset.kind,recipient:b.dataset.recipient,request:b.dataset.request}));
  root.querySelectorAll('[data-pick]').forEach(select=>select.onchange=()=>{const target=select.dataset.pick==='gift'?gift:pick;target.item=select.value;target.quantity=Math.min(target.quantity,select.dataset.pick==='gift'?Math.min(maxShare(myLevel()),stock(select.value)):maxShare(myLevel()))||1;render();});
  root.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const target=b.dataset.step==='gift'?gift:pick,max=b.dataset.step==='gift'?Math.min(maxShare(myLevel()),stock(gift.item)):maxShare(myLevel());target.quantity=Math.min(max,Math.max(1,target.quantity+Number(b.dataset.by)));render();});
  root.querySelectorAll('[data-gift-open]').forEach(b=>b.onclick=()=>{const id=b.dataset.giftOpen;if(gift.to===id){gift.to=null;}else{const keys=giftKeys();gift={to:id,item:keys.includes(gift.item)?gift.item:keys[0],quantity:1};}render();});
  const cancel=root.querySelector('[data-gift-cancel]');if(cancel)cancel.onclick=()=>{gift.to=null;render();};
  const send=root.querySelector('[data-send-gift]');if(send)send.onclick=()=>act({kind:'gift',recipient:gift.to,item:gift.item,quantity:gift.quantity});
  const form=root.querySelector('.sharing-ask');if(form)form.onsubmit=e=>{e.preventDefault();act({kind:'request',item:pick.item,quantity:pick.quantity});};
  refreshArt();
 }
 async function load(){try{social=(await bridge.request({operation:'social'})).social;error='';}catch(e){error=e.message;}render();}
 async function act(action){
  if(busy)return;busy=true;root.querySelectorAll('button:not([data-close]):not([data-back])').forEach(b=>b.disabled=true);
  // Drop the fields a kind does not use, so the server only sees what it expects.
  const clean=Object.fromEntries(Object.entries(action).filter(([,v])=>v!==undefined));
  try{const r=await bridge.request({operation:'social',action:clean,requestId:crypto.randomUUID()});notify?.(sharingMessage(r.social,clean,id=>social?.members.find(m=>m.id===id)?.name??'your family member'));if(clean.kind==='gift')gift.to=null;await refreshFarm?.();await load();}
  catch(e){render();const status=root?.querySelector('[data-status]');if(status)status.textContent=e.message;}
  finally{busy=false;}
 }
 return {
  async open(){embedded=false;root=ownDialog();doc.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});social=null;error='';render();if(!dialog.open)dialog.showModal();await load();},
  // Inside the Farm Family dialog: shows what it last knew at once, then today's fresh list.
  async mount(container){embedded=true;root=container;render();await load();},
  unmount(){if(embedded)root=null;}
 };
}
