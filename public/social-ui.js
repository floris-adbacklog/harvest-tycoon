import {art,refreshArt} from './visual-icons.js';
import {avatarImage} from './player-avatars.js';
import {ITEMS} from './farm-state.js';
// Daily sharing inside a Farm Family: help a member with 5 coins, gift 3 wheat, ask for a few goods and fill
// someone else's request. Everything comes out of your own farm (harvest_social in retention-social.sql moves it),
// so this screen only has to make the choices clear and say up front what cannot be done today.
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const SHARE_LIMIT=3,HELP_COINS=5,GIFT_WHEAT=3,REQUEST_ITEMS=['wheat','corn','feed'];
const itemName=key=>(ITEMS[key]?.name??key).toLowerCase();

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

export function createSocialUI({state,notify,refreshFarm,getMembers=()=>[],onBack,document:doc=globalThis.document,bridge=globalThis.parent?.harvestBridge}){
 const dialog=doc.createElement('dialog');dialog.id='sharing-dialog';dialog.className='game-dialog wide-dialog sharing-dialog';dialog.setAttribute('aria-labelledby','sharing-title');doc.body.append(dialog);
 let social=null,busy=false,error='',pick={item:'wheat',quantity:3};
 const me=()=>bridge.playerId,stock=key=>state?.inventory?.[key]??0;
 // The family view keys members by membership row, the sharing list by player; the (unique) farmer name links the two.
 const member=id=>{const name=social?.members.find(m=>m.id===id)?.name;return name?getMembers().find(m=>m.username===name):undefined;};
 const portrait=id=>`<span class="family-member-portrait">${avatarImage(member(id)?.avatarId)}${member(id)?`<span class="online-dot ${member(id).online?'is-online':''}" aria-hidden="true"></span>`:''}</span>`;
 const nameOf=id=>id===me()?'You':esc(social.members.find(m=>m.id===id)?.name??member(id)?.username??'A family member');

 function members(today){
  if(!social.members.length)return '<p class="sharing-empty">Invite a farmer to your family to start sharing.</p>';
  const action=(kind,id,label,icon,blocked)=>{
   const done=today.done(kind,id);
   return `<button class="sharing-action" data-kind="${kind}" data-recipient="${esc(id)}" ${done||blocked?'disabled':''} title="${esc(blocked&&!done?blocked:'')}">${done?'✓ Sent':`${art(icon)}<span>${label}</span>`}</button>`;
  };
  const helpBlocked=today.full('help')?'You have helped 3 times today.':(state?.coins??0)<HELP_COINS?`You need ${HELP_COINS} coins.`:'';
  const giftBlocked=today.full('gift')?'You have sent 3 gifts today.':stock('wheat')<GIFT_WHEAT?`You need ${GIFT_WHEAT} wheat.`:'';
  return `<div class="sharing-list">${social.members.map(m=>`<article class="sharing-row">${portrait(m.id)}<div class="sharing-who"><strong>${esc(m.name)}</strong><span>${member(m.id)?`Level ${member(m.id).level}`:'Family member'}</span></div><div class="sharing-actions">${action('help',m.id,`Help · ${HELP_COINS}`,'coins',helpBlocked)}${action('gift',m.id,`Gift · ${GIFT_WHEAT}`,'wheat',giftBlocked)}</div></article>`).join('')}</div>`;
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
  return `<section class="sharing-section"><h3>Ask for goods</h3><p class="sharing-hint">One request a day. Any family member can fill it.</p><form class="sharing-ask"><div class="sharing-items" role="radiogroup" aria-label="Goods to ask for">${REQUEST_ITEMS.map(key=>`<button type="button" role="radio" aria-checked="${pick.item===key}" class="sharing-item-choice ${pick.item===key?'is-picked':''}" data-item="${key}">${art(key)}<span>${esc(ITEMS[key]?.name??key)}</span></button>`).join('')}</div><div class="sharing-stepper" aria-label="Quantity"><button type="button" data-step="-1" aria-label="One less" ${pick.quantity<=1?'disabled':''}>−</button><output>${pick.quantity}</output><button type="button" data-step="1" aria-label="One more" ${pick.quantity>=5?'disabled':''}>+</button></div><button class="primary-button">Ask your family</button></form></section>`;
 }
 function render(){
  const heading=`<div class="dialog-heading"><div><span class="eyebrow">FARM FAMILY</span><h2 id="sharing-title">Daily sharing</h2></div><button class="icon-button close-dialog" data-close aria-label="Close"><i data-lucide="x"></i></button></div>${onBack?'<button class="back-button sharing-back" data-back><i data-lucide="chevron-left" data-line-icon></i>Back to Farm Family</button>':''}`;
  if(!social){dialog.innerHTML=heading+`<p class="sharing-empty">${esc(error||'Opening daily sharing…')}</p>`;bind();return;}
  const today=sharingToday(social,me());
  dialog.innerHTML=heading+`<section class="sharing-intro">${art('family-sharing')}<div><strong>Share a little of your own farm</strong><span>Help and gifts arrive right away. Up to ${SHARE_LIMIT} of each a day, resets at midnight UTC.</span></div><dl class="sharing-today"><div><dt>Sent</dt><dd>${today.sent}</dd></div><div><dt>Received</dt><dd>${today.received}</dd></div></dl></section>`
   +`<section class="sharing-section"><h3>Help your family</h3>${members(today)}</section>`
   +`<section class="sharing-section"><h3>Today’s requests</h3>${requests(today)}</section>`
   +ask()
   +'<p class="sharing-rules">Opens at level 10, 48 hours after you started your farm and 24 hours after joining this family.</p><p class="sharing-feedback" role="status" data-status></p>';
  bind();
 }
 function bind(){
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  const back=dialog.querySelector('[data-back]');if(back)back.onclick=()=>{dialog.close();onBack();};
  dialog.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>act({kind:b.dataset.kind,recipient:b.dataset.recipient,request:b.dataset.request}));
  dialog.querySelectorAll('[data-item]').forEach(b=>b.onclick=()=>{pick.item=b.dataset.item;render();});
  dialog.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{pick.quantity=Math.min(5,Math.max(1,pick.quantity+Number(b.dataset.step)));render();});
  const form=dialog.querySelector('.sharing-ask');if(form)form.onsubmit=e=>{e.preventDefault();act({kind:'request',item:pick.item,quantity:pick.quantity});};
  refreshArt();
 }
 async function load(){try{social=(await bridge.request({operation:'social'})).social;error='';}catch(e){error=e.message;}render();}
 async function act(action){
  if(busy)return;busy=true;dialog.querySelectorAll('button:not([data-close]):not([data-back])').forEach(b=>b.disabled=true);
  // Drop the fields a kind does not use, so the server only sees what it expects.
  const clean=Object.fromEntries(Object.entries(action).filter(([,v])=>v!==undefined));
  try{const r=await bridge.request({operation:'social',action:clean,requestId:crypto.randomUUID()});notify?.(r.social.message);await refreshFarm?.();await load();}
  catch(e){render();dialog.querySelector('[data-status]').textContent=e.message;}
  finally{busy=false;}
 }
 return {async open(){doc.querySelectorAll('dialog[open]').forEach(d=>{if(d!==dialog)d.close();});social=null;error='';render();if(!dialog.open)dialog.showModal();await load();}};
}
