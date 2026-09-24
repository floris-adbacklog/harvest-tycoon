// The chat window. Its button sits next to Farm Family in the header; on a phone it takes the Family button's place (Family moves
// into the More menu, under Friends). Four tabs: Notifications (news from the admin and the odd personal note from the staff),
// Global, Family and Private. The box you type in is at the top and the newest message right under it, so nothing has to be
// scrolled. A name or picture opens that farmer's profile. Data and live updates: bridge.chat (src/chat-client.js).
import {avatarImage} from '../public/player-avatars.js';
import {art,refreshArt} from '../public/visual-icons.js';
import {confirmAction} from '../public/confirm-dialog.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// "now", "5m", "3h", "2d": short enough for a line of chat; the exact time is in the tooltip.
export function ago(iso,now=Date.now()){
 const seconds=Math.floor((now-Date.parse(iso))/1000);if(!Number.isFinite(seconds))return '';
 const minutes=Math.floor(Math.max(0,seconds)/60);
 return minutes<1?'now':minutes<60?`${minutes}m`:minutes<1440?`${Math.floor(minutes/60)}h`:`${Math.floor(minutes/1440)}d`;
}
// VIP farmers wear the same mark after their name as on their profile (as they were when they wrote the message).
const VIP='<span class="chat-vip" title="VIP farmer"><img src="/assets/icons/vip.webp" alt="VIP" width="18" height="18" draggable="false"></span>';
const exact=iso=>{const time=Date.parse(iso);return Number.isFinite(time)?new Date(time).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';};
export const pillText=count=>count>9?'9+':String(count);
// The header button counts news and notes, your family and your private messages. The global chat only lights its own tab:
// with the whole valley talking, a number on the button would never go away.
export const headerCount=unread=>(unread?.notices??0)+(unread?.family??0)+(unread?.dm??0);
const NOTICES={news:'News',moderation:'From the moderators',gift:'A gift for you',donation:'A gift for you'};
const TITLES={notices:'Notifications',global:'Global chat',private:'Private chats'};
const EMPTY={
 notices:'No news yet. New features and events show up here.',
 global:'No messages yet. Say hello to the valley!',
 family:'No messages yet. Say hello to your family!',
 private:'No private messages yet. Open a farmer’s profile and choose Send message.'
};
const ICON={
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>',
 block:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/></svg>',
 more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};

export function createChatUI({bridge,profiles,doc=document,win=window}){
 const chat=bridge?.chat,button=doc.getElementById('chat-button'),dot=doc.getElementById('chat-dot');
 if(!chat||!button)return null;
 const me=bridge.playerId;
 const dialog=doc.createElement('dialog');dialog.id='chat-dialog';dialog.className='game-dialog chat-dialog';dialog.setAttribute('aria-labelledby','chat-title');
 dialog.innerHTML=`<div class="chat-top"><div class="chat-tabs" role="tablist" aria-label="Chat">
  <button type="button" role="tab" data-chat-tab="notices" aria-label="Notifications" title="Notifications">${art('bell')}<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="global">Global<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="family">Family<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="private">Private<b class="chat-count" hidden></b></button>
 </div><button type="button" class="icon-button chat-close" aria-label="Close chat"><i data-lucide="x"></i></button></div>
 <div class="chat-head"><button type="button" class="chat-back" aria-label="All private chats" hidden>${ICON.back}</button><h2 id="chat-title">Global chat</h2><button type="button" class="chat-block" hidden>${ICON.block}</button></div>
 <form class="chat-compose" hidden><input type="text" maxlength="200" autocomplete="off" enterkeyhint="send" aria-label="Your message"><select class="chat-hours" aria-label="Show the news for" title="How long everyone sees it" hidden><option value="6">6 h</option><option value="12">12 h</option><option value="24" selected>24 h</option><option value="48">48 h</option><option value="72">3 days</option><option value="168">7 days</option><option value="0">Always</option></select><button type="submit" class="chat-send" aria-label="Send">${art('send')}</button></form>
 <div class="chat-find" hidden><input type="search" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Find a farmer to message…" aria-label="Find a farmer to message"></div>
 <p class="chat-note" role="status" hidden></p>
 <ol class="chat-list"></ol>`;
 doc.body.append(dialog);
 const $=selector=>dialog.querySelector(selector);
 const form=$('.chat-compose'),input=form.querySelector('input'),hours=form.querySelector('.chat-hours'),sendButton=form.querySelector('.chat-send'),list=$('.chat-list'),noteEl=$('.chat-note');
 const title=$('#chat-title'),head=$('.chat-head'),back=$('.chat-back'),blockButton=$('.chat-block'),find=$('.chat-find'),findInput=find.querySelector('input');
 // The Private tab: find any farmer by name and write to them, without opening their profile first (the same search as the leaderboard).
 let found=null,findTimer=null,findTicket=0;

 let overview=null,tab='global',thread=null,messages=[],notices=[],freshNotices=0,loading=0,busy=false,sending=false,connected=false,disposed=false;
 let overviewTimer=null,pollTimer=null;const readTimers=new Map(),statusCache=new Map();
 const unread=()=>overview?.unread??{notices:0,global:0,family:0,dm:0};
 const role=()=>overview?.role??null;
 const blocked=()=>new Set(overview?.blocked??[]);
 const channelOf=()=>tab==='global'?'global':tab==='family'?overview?.family?.channel??null:tab==='private'?thread?.channel??null:null;
 const showing=channel=>dialog.open&&channelOf()===channel;
 function note(text=''){noteEl.textContent=text;noteEl.hidden=!text;}

 // The header pill and the numbers on the tabs.
 function counts(){
  const u=unread(),total=headerCount(u);
  dot.hidden=total<1;dot.textContent=pillText(total);
  button.setAttribute('aria-label',total?`Open chat, ${total} unread`:'Open chat');
  // Global never gets a red count: with the whole valley talking it would never go away. News, Family and Private do.
  const per={notices:u.notices,global:0,family:u.family,private:u.dm};
  dialog.querySelectorAll('[data-chat-tab]').forEach(tabButton=>{const n=per[tabButton.dataset.chatTab]??0,badge=tabButton.querySelector('.chat-count');badge.hidden=n<1;badge.textContent=pillText(n);});
 }
 async function refreshOverview(){
  try{
   const next=await chat.overview();if(disposed)return;
   overview=next;button.hidden=false;settings();
   // What is on screen right now is read, even if the count raced ahead of it.
   if(dialog.open){const name=channelOf();if(tab==='notices')overview.unread.notices=0;else if(name==='global')overview.unread.global=0;else if(name&&name===overview.family?.channel)overview.unread.family=0;else if(name)clearThread(name);}
   counts();if(dialog.open)paint();
  }catch{}
 }
 const scheduleOverview=(wait=1200)=>{clearTimeout(overviewTimer);overviewTimer=setTimeout(refreshOverview,wait);};
 function clearThread(name){
  const t=overview?.threads?.find(x=>x.channel===name);if(!t)return;
  t.unread=0;overview.unread.dm=overview.threads.reduce((sum,x)=>sum+(x.unread||0),0);
 }
 // Marks a chat read on the server, at most once every few seconds per chat, and at once on this screen.
 function markRead(name){
  if(!overview||!name)return;
  if(name==='notices')overview.unread.notices=0;else if(name==='global')overview.unread.global=0;else if(name===overview.family?.channel)overview.unread.family=0;else clearThread(name);
  counts();
  if(readTimers.has(name))return;
  readTimers.set(name,setTimeout(()=>{readTimers.delete(name);chat.markRead(name).catch(()=>{});},1500));
 }

 const profileButton=(id,label,inner,cls)=>`<button type="button" class="${cls}" data-profile="${esc(id)}" aria-label="${esc(label)}">${inner}</button>`;
 function messageRow(m){
  const mine=m.sender===me,staff=role()!==null,menu=!mine||staff;
  return `<li class="chat-msg${mine?' is-mine':''}" data-id="${esc(m.id)}">${profileButton(m.sender,`Open ${m.sender_name}’s profile`,avatarImage(m.sender_avatar),'chat-avatar')}<div class="chat-msg-main"><div class="chat-msg-top">${profileButton(m.sender,`Open ${m.sender_name}’s profile`,esc(m.sender_name),'chat-name')}${m.sender_vip?VIP:''}${m.sender_staff?`<span class="chat-mod" title="Moderator">${art('admin')}</span>`:''}<time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time>${menu?`<button type="button" class="chat-more" data-more="${esc(m.id)}" aria-label="More options for this message" aria-haspopup="menu">${ICON.more}</button>`:''}</div><p class="chat-text">${esc(m.body)}</p></div></li>`;
 }
 function threadRow(t){
  return `<li><button type="button" class="chat-thread${t.unread?' is-unread':''}" data-thread="${esc(t.channel)}"><span class="chat-avatar">${avatarImage(t.otherAvatar)}</span><span class="chat-thread-copy"><strong>${esc(t.otherName)}${t.otherVip?VIP:''}</strong><small>${t.last?.mine?'You: ':''}${esc(t.last?.body??'')}</small></span><span class="chat-thread-side"><time datetime="${esc(t.lastAt)}" title="${esc(exact(t.lastAt))}">${ago(t.lastAt)}</time>${t.unread?`<b class="chat-count">${pillText(t.unread)}</b>`:''}</span></button></li>`;
 }
 // "50 diamonds + 1,000 coins" in a gift note shows the diamond and the coin in front of the amounts.
 const AMOUNT_ART={diamonds:'diamonds',coins:'coins',XP:'xp'};
 const withAmounts=text=>esc(text).replace(/\b(\d{1,3}(?:,\d{3})+|\d+) (diamonds|coins|XP)\b/g,(all,amount,what)=>`<span class="chat-amount">${art(AMOUNT_ART[what])}<b>${amount}</b> ${what}</span>`);
 function noticeRow(n,fresh){
  const picture=n.kind==='news'?'<img src="/assets/harvest-tycoon-logo.webp" alt="" width="44" height="44" draggable="false">':art(n.kind==='moderation'?'admin':n.kind==='gift'||n.kind==='donation'?'gift':'bell');
  return `<li class="chat-notice${fresh?' is-new':''}"><span class="chat-notice-art">${picture}</span><div class="chat-msg-main"><div class="chat-msg-top"><strong>${esc(NOTICES[n.kind]??'Harvest Tycoon')}</strong><time datetime="${esc(n.created_at)}" title="${esc(exact(n.created_at))}">${ago(n.created_at)}</time></div><p class="chat-text">${n.kind==='gift'||n.kind==='donation'?withAmounts(n.body):esc(n.body)}</p></div></li>`;
 }
 function foundRow(p){
  return `<li><button type="button" class="chat-thread" data-start="${esc(p.playerId)}"><span class="chat-avatar">${avatarImage(p.avatarId)}</span><span class="chat-thread-copy"><strong>${esc(p.username)}</strong><small>Level ${esc(p.level)}${p.family?` · ${esc(p.family.name)}`:''}</small></span><span class="chat-thread-side"><small class="chat-write">Write</small></span></button></li>`;
 }
 const empty=(text,extra='')=>`<li class="chat-empty"><p>${esc(text)}</p>${extra}</li>`;

 // Who may write here, and if not, why (shown instead of the box).
 function composeState(){
  // The admin writes news for everyone right here, in the Notifications tab; it shows as News, with the logo.
  if(tab==='notices')return role()==='admin'?{show:true,placeholder:'News for everyone…',max:400}:{show:false};
  if(tab==='private'&&!thread)return {show:false};
  if(tab==='family'&&!overview?.family)return {show:false};
  if(overview?.banned)return {show:true,blocked:'The chat is closed for you. Your farm is not affected.'};
  if(overview?.mutedUntil&&Date.parse(overview.mutedUntil)>Date.now())return {show:true,blocked:`You are muted until ${new Date(overview.mutedUntil).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}.`};
  const need=tab==='global'?overview?.levels?.global:tab==='private'?overview?.levels?.dm:1;
  if(need&&(overview?.level??0)<need)return {show:true,blocked:`${tab==='global'?'The global chat':'Private messages'} open at level ${need}.`};
  if(tab==='private'&&overview?.privateOn===false)return {show:true,blocked:'Your private messages are off. Turn them on in Settings.'};
  if(tab==='private'&&thread&&blocked().has(thread.otherId))return {show:true,blocked:`You blocked ${thread.otherName}. Unblock them to write.`};
  return {show:true,placeholder:tab==='global'?'Say something to the valley…':tab==='family'?'Message your family…':`Message ${thread.otherName}…`};
 }
 function paint(){
  dialog.querySelectorAll('[data-chat-tab]').forEach(tabButton=>{const on=tabButton.dataset.chatTab===tab;tabButton.classList.toggle('active',on);tabButton.setAttribute('aria-selected',String(on));});
  back.hidden=!(tab==='private'&&thread);blockButton.hidden=back.hidden;
  find.hidden=!(tab==='private'&&!thread&&overview?.privateOn!==false);
  // The tab already says where you are: a heading only for a family (its name) and a private chat (who with).
  head.classList.toggle('is-quiet',!((tab==='family'&&overview?.family)||(tab==='private'&&thread)));
  if(thread){const off=blocked().has(thread.otherId);blockButton.setAttribute('aria-label',off?`Unblock ${thread.otherName}`:`Block ${thread.otherName}`);blockButton.title=blockButton.getAttribute('aria-label');blockButton.classList.toggle('is-on',off);}
  title.innerHTML=tab==='family'?esc(overview?.family?.name??'Family chat'):tab==='private'&&thread?`Chat with ${profileButton(thread.otherId,`Open ${thread.otherName}’s profile`,esc(thread.otherName),'chat-title-name')}`:esc(TITLES[tab]);
  const compose=composeState();
  form.hidden=!compose.show;input.disabled=sendButton.disabled=Boolean(compose.blocked)||sending;
  input.placeholder=compose.blocked??compose.placeholder??'';input.maxLength=compose.max??200;hours.hidden=tab!=='notices';form.classList.toggle('is-blocked',Boolean(compose.blocked));
  if(busy){list.innerHTML='<li class="chat-empty"><p>Opening the chat…</p></li>';return;}
  if(tab==='notices')list.innerHTML=notices.length?notices.map((n,i)=>noticeRow(n,i<freshNotices)).join(''):empty(EMPTY.notices);
  else if(tab==='family'&&!overview?.family){
   const familyButton=doc.getElementById('family-button');
   list.innerHTML=empty(familyButton&&!familyButton.hidden?'Join a family to chat with its farmers.':'Families open at level 10. Then you can chat with yours here.',familyButton&&!familyButton.hidden?'<button type="button" class="small-button" data-open-family>Find a family</button>':'');
  }
  else if(tab==='private'&&!thread&&found&&!find.hidden)list.innerHTML=found.loading?'<li class="chat-empty"><p>Looking around the valley…</p></li>':found.players.length?found.players.map(foundRow).join(''):empty('No farmers found. Try another name.');
  else if(tab==='private'&&!thread){const threads=(overview?.threads??[]).filter(t=>!blocked().has(t.otherId));list.innerHTML=(overview?.privateOn===false?'<li class="chat-empty chat-off"><p>Your private messages are off. You can turn them on in Settings, under Chat.</p></li>':'')+(threads.length?threads.map(threadRow).join(''):overview?.privateOn===false?'':empty(EMPTY.private));}
  else{const shown=messages.filter(m=>!blocked().has(m.sender));list.innerHTML=shown.length?shown.map(messageRow).join(''):empty(thread?`Say hello to ${thread.otherName}!`:EMPTY[tab]);}
  refreshArt();
 }
 async function load(){
  const ticket=++loading;note('');
  busy=false;
  if(tab==='private'&&!thread){messages=[];paint();return;}
  if(tab==='notices'){
   busy=true;paint();const fresh=unread().notices;
   // News from before you signed up (and a gift for everyone you could not have received) is not yours to read.
   try{const rows=await chat.notices(),joined=Date.parse(overview?.joined??'')||0;if(ticket!==loading)return;notices=rows.filter(n=>n.player_id||Date.parse(n.created_at)>joined);freshNotices=fresh;}catch(error){if(ticket===loading)note(error.message);}
   if(ticket!==loading)return;busy=false;paint();markRead('notices');return;
  }
  const name=channelOf();if(!name){messages=[];paint();return;}
  busy=true;paint();
  try{const rows=await chat.messages(name);if(ticket!==loading)return;messages=rows;}catch(error){if(ticket===loading){messages=[];note(error.message);}}
  if(ticket!==loading)return;busy=false;paint();markRead(name);
 }
 function show(next,{keepThread=false}={}){
  tab=next;if(!keepThread)thread=null;messages=[];found=null;findInput.value='';load();
  if(!matchMedia('(pointer:coarse)').matches&&!form.hidden)input.focus({preventScroll:true});
 }
 async function open({tab:wanted,with:other}={}){
  doc.querySelectorAll('dialog[open]').forEach(d=>d.close());
  if(!overview)await refreshOverview();
  if(!overview)return;
  // Always Global first (a private chat only when you came to write to someone); the counts on the tabs show what is new elsewhere.
  const first=other?'private':wanted??'global';
  if(other)thread={channel:chat.dmChannel(other.id),otherId:other.id,otherName:other.name,otherAvatar:other.avatar};
  dialog.showModal();show(first,{keepThread:Boolean(other)});void refreshOverview();
 }

 // Live: a message in the chat on screen appears at the top; anything else raises a count.
 function onEvent(event){
  if(disposed)return;
  if(event.type==='connected'){if(connected){void refreshOverview();if(dialog.open)void load();}connected=true;return;}
  if(!overview)return;
  if(event.type==='deleted'){if(messages.some(m=>m.id===event.id)){messages=messages.filter(m=>m.id!==event.id);if(dialog.open)paint();}return;}
  if(event.type==='notice'){
   // A gift for everyone: an open game fetches it now (the farm adds it on load), a few seconds apart so not everyone asks at once.
   if(event.notice?.kind==='donation')setTimeout(()=>{void win.harvestRefresh?.()?.catch?.(()=>{});},1000+Math.random()*9000);
   if(dialog.open&&tab==='notices'){if(!notices.some(n=>n.id===event.notice.id)){notices=[event.notice,...notices];freshNotices++;paint();}markRead('notices');}
   else{overview.unread.notices=Math.min(99,(overview.unread.notices??0)+1);counts();}
   return;
  }
  const m=event.message;if(!m||blocked().has(m.sender))return;
  if(showing(m.channel)){if(!messages.some(x=>x.id===m.id)){messages=[m,...messages].slice(0,100);paint();}if(m.sender!==me)markRead(m.channel);if(m.channel.startsWith('dm:'))scheduleOverview();return;}
  if(m.sender===me)return;
  if(m.channel==='global')overview.unread.global=Math.min(99,(overview.unread.global??0)+1);
  else if(m.channel===overview.family?.channel)overview.unread.family=Math.min(99,(overview.unread.family??0)+1);
  else if(m.channel.startsWith('dm:'))scheduleOverview(300);
  counts();
 }

 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const name=tab==='notices'?'notices':channelOf(),text=input.value.trim();if(!name||!text||sending)return;
  sending=true;sendButton.disabled=true;note('');
  try{
   if(name==='notices'){await chat.postNews(text,Number(hours.value)||0);input.value='';await load();return;}
   const m=await chat.send(name,text);input.value='';
   if(showing(name)&&!messages.some(x=>x.id===m.id)){messages=[m,...messages];paint();}
   if(name.startsWith('dm:'))scheduleOverview(300);
  }catch(error){note(error.message);}
  finally{sending=false;sendButton.disabled=Boolean(composeState().blocked);if(dialog.open)input.focus({preventScroll:true});}
 });
 dialog.querySelectorAll('[data-chat-tab]').forEach(tabButton=>tabButton.onclick=()=>show(tabButton.dataset.chatTab));
 back.onclick=()=>{thread=null;show('private');};
 $('.chat-close').onclick=()=>dialog.close();
 // A tap on the dimmed game next to the panel closes it.
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 // Closing stops a chat that is still loading. The browser reports the close a moment later, so when the chat was closed and opened
 // again straight away (Send message on a profile opened from the chat) that report must not stop the new one.
 dialog.addEventListener('close',()=>{closeMenu();if(!dialog.open){loading++;busy=false;}});
 blockButton.onclick=()=>thread&&setBlock(thread.otherId,thread.otherName,!blocked().has(thread.otherId));
 list.addEventListener('click',event=>{
  const profile=event.target.closest('[data-profile]'),threadButton=event.target.closest('[data-thread]'),more=event.target.closest('[data-more]');
  if(more){openMenu(more);return;}
  if(profile){profiles?.open(profile.dataset.profile,{back:null});return;}
  const start=event.target.closest('[data-start]');
  if(start){const p=found?.players?.find(x=>x.playerId===start.dataset.start);if(!p)return;thread={channel:chat.dmChannel(p.playerId),otherId:p.playerId,otherName:p.username,otherAvatar:p.avatarId};show('private',{keepThread:true});return;}
  if(threadButton){const t=overview?.threads?.find(x=>x.channel===threadButton.dataset.thread);if(!t)return;thread={channel:t.channel,otherId:t.otherId,otherName:t.otherName,otherAvatar:t.otherAvatar};show('private',{keepThread:true});return;}
  if(event.target.closest('[data-open-family]')){dialog.close();doc.getElementById('family-button')?.click();}
 });
 findInput.addEventListener('input',()=>{
  clearTimeout(findTimer);const query=findInput.value.trim(),ticket=++findTicket;
  if(query.length<2){found=null;paint();return;}
  found={loading:true,players:[]};paint();
  findTimer=setTimeout(async()=>{
   try{const data=await bridge.request({operation:'player_search',query});if(ticket!==findTicket)return;found={players:(data.players??[]).filter(p=>p.playerId!==me)};}
   catch(error){if(ticket!==findTicket)return;found={players:[]};note(error.message);}
   if(dialog.open&&tab==='private'&&!thread)paint();
  },300);
 });
 title.addEventListener('click',event=>{const profile=event.target.closest('[data-profile]');if(profile)profiles?.open(profile.dataset.profile,{back:null});});

 // The little menu on a message: report or block for everyone; delete, mute and ban (the chat only) for the staff.
 let menuEl=null;
 function closeMenu(){menuEl?.remove();menuEl=null;}
 function openMenu(anchor){
  closeMenu();
  const m=messages.find(x=>x.id===anchor.dataset.more);if(!m)return;
  const mine=m.sender===me,staff=role()!==null,items=[];
  if(!mine)items.push(['report','Report message'],['block',`Block ${m.sender_name}`]);
  if(staff)items.push(['delete','Delete message']);
  if(staff&&!mine&&!m.sender_staff)items.push(['mute60','Mute 1 hour'],['mute1440','Mute 1 day'],['ban','Ban from chat']);
  if(!items.length)return;
  menuEl=doc.createElement('div');menuEl.className='chat-menu';menuEl.setAttribute('role','menu');
  menuEl.innerHTML=items.map(([key,label])=>`<button type="button" role="menuitem" data-menu="${key}"${['block','delete','ban'].includes(key)?' class="is-danger"':''}>${esc(label)}</button>`).join('');
  anchor.closest('.chat-msg').append(menuEl);menuEl.querySelector('button').focus();
  menuEl.onclick=event=>{const key=event.target.closest('[data-menu]')?.dataset.menu;if(!key)return;closeMenu();void act(key,m);};
 }
 dialog.addEventListener('pointerdown',event=>{if(menuEl&&!menuEl.contains(event.target)&&!event.target.closest('[data-more]'))closeMenu();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuEl){event.preventDefault();closeMenu();}});
 async function act(key,m){
  try{
   if(key==='report'){
    if(!await confirmAction({title:'Report this message?',description:'A moderator will read it. Thank you for keeping the valley friendly.',confirmLabel:'Report',picture:'admin'}))return;
    await chat.report(m.id);note('Thanks, a moderator will take a look.');
   }else if(key==='block')await setBlock(m.sender,m.sender_name,true);
   else if(key==='delete'){
    if(!await confirmAction({title:'Delete this message?',description:`“${m.body}” disappears for everyone.`,confirmLabel:'Delete',tone:'danger'}))return;
    await chat.deleteMessage(m.id);messages=messages.filter(x=>x.id!==m.id);paint();
   }else await sanction(m.sender,m.sender_name,key==='ban'?0:Number(key.slice(4)),key==='ban');
  }catch(error){note(error.message);}
 }
 async function setBlock(id,name,on){
  if(on&&!await confirmAction({title:`Block ${name}?`,description:'You will no longer see their messages, and they cannot send you private messages. You can unblock them on their profile.',confirmLabel:'Block',tone:'danger'}))return false;
  try{
   await chat.block(id,on);statusCache.delete(id);
   const set=blocked();on?set.add(id):set.delete(id);overview.blocked=[...set];
   if(on&&thread?.otherId===id)thread=null;
   paint();scheduleOverview(200);note(on?`${name} is blocked.`:`${name} is unblocked.`);return true;
  }catch(error){note(error.message);return false;}
 }
 async function sanction(id,name,minutes,ban,{lift=false}={}){
  const what=lift?`Let ${name} chat again?`:ban?`Ban ${name} from the chat?`:`Mute ${name} for ${minutes>=1440?'1 day':'1 hour'}?`;
  if(!await confirmAction({title:what,description:lift?'They can send messages again straight away.':'Only the chat: their farm is not affected. They get a note about it.',confirmLabel:lift?'Allow':ban?'Ban':'Mute',tone:lift?'':'danger',picture:'admin'}))return false;
  await chat.sanction(id,lift?0:minutes,lift?false:ban);statusCache.delete(id);
  note(lift?`${name} can chat again.`:ban?`${name} can no longer chat.`:`${name} is muted.`);return true;
 }

 // The profile: a Moderator badge (the admin wears the same one), Send message and Block, and for the staff the chat-only
 // moderation buttons; the admin can also appoint or remove a moderator there. player-profiles.js calls this after every draw.
 function decorateProfile(player,content,{isCurrent}){
  const id=player.playerId,cached=statusCache.get(id);
  if(cached&&Date.now()-cached.at<30000){apply(cached.status);return;}
  chat.playerStatus(id).then(status=>{statusCache.set(id,{status,at:Date.now()});if(isCurrent()&&content.isConnected)apply(status);}).catch(()=>{});
  function apply(status){
   const heading=content.querySelector('.farmer-identity h3');
   if(status.moderator&&heading&&!heading.querySelector('.farmer-mod-badge'))heading.insertAdjacentHTML('beforeend',`<span class="farmer-mod-badge" title="Moderator of the valley chat">${art('admin')}Moderator</span>`);
   const box=content.querySelector('[data-farmer-chat]');if(!box)return;
   if(id===me){box.hidden=true;return;}
   const staffTools=status.staff&&!status.moderator,admin=role()==='admin';
   const chatState=status.banned?'Chat closed (banned)':status.mutedUntil?`Muted until ${new Date(status.mutedUntil).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'Can chat';
   box.hidden=false;
   box.innerHTML=`<div class="farmer-chat-row">${status.canMessage?`<button type="button" class="primary-button farmer-chat-send" data-chat="message">${art('letter')}Send message</button>`:''}<button type="button" class="small-button" data-chat="${status.blocked?'unblock':'block'}">${status.blocked?'Unblock':'Block'}</button></div>`
    +(staffTools||(admin&&status.moderator)?`<div class="farmer-mod-tools"><span class="farmer-mod-title">${art('admin')}Moderation${staffTools?` · <b>${esc(chatState)}</b>`:''}</span><div class="farmer-mod-buttons">${staffTools?`<button type="button" class="small-button" data-chat="mute60">Mute 1 hour</button><button type="button" class="small-button" data-chat="mute1440">Mute 1 day</button>${status.banned||status.mutedUntil?'<button type="button" class="small-button" data-chat="lift">Allow chat</button>':'<button type="button" class="small-button is-danger" data-chat="ban">Ban from chat</button>'}`:''}${admin?`<button type="button" class="small-button" data-chat="${status.moderator?'unmod':'mod'}">${status.moderator?'Remove moderator':'Make moderator'}</button>`:''}</div></div>`:'');
   refreshArt();
   box.onclick=async event=>{
    const key=event.target.closest('[data-chat]')?.dataset.chat;if(!key)return;
    const name=player.username,redraw=()=>{statusCache.delete(id);if(isCurrent())decorateProfile(player,content,{isCurrent});};
    try{
     if(key==='message'){open({with:{id,name,avatar:player.avatarId}});return;}
     if(key==='block'||key==='unblock'){if(await setBlock(id,name,key==='block'))redraw();return;}
     if(key==='mod'||key==='unmod'){
      if(!await confirmAction({title:key==='mod'?`Make ${name} a moderator?`:`Remove ${name} as moderator?`,description:key==='mod'?'They can delete messages, mute and ban farmers from the chat, and open the Admin dashboard. They cannot give anything.':'They become a regular farmer again.',confirmLabel:key==='mod'?'Make moderator':'Remove',picture:'admin'}))return;
      await chat.setModerator(id,key==='mod');redraw();return;
     }
     if(await sanction(id,name,key==='ban'?0:Number(key.slice(4)),key==='ban',{lift:key==='lift'}))redraw();
    }catch(error){const status=content.ownerDocument.getElementById('farmer-profile-status');if(status)status.textContent=error.message;}
   };
  }
 }
 profiles?.setChatExtras?.(decorateProfile);

 // Settings, Chat: private messages on or off (the section shows once the chat has answered).
 const privateSwitch=doc.getElementById('chat-private'),privateStatus=doc.getElementById('chat-settings-status');let privateBusy=false;
 function settings(){const section=doc.getElementById('chat-settings');if(!section||!privateSwitch||!overview)return;section.hidden=false;if(!privateBusy)privateSwitch.checked=overview.privateOn!==false;}
 privateSwitch?.addEventListener('change',async()=>{
  const on=privateSwitch.checked;privateBusy=true;privateSwitch.disabled=true;if(privateStatus)privateStatus.textContent='Saving…';
  try{await chat.setPrivate(on);overview.privateOn=on;statusCache.clear();if(privateStatus)privateStatus.textContent=on?'Private messages are on.':'Private messages are off. Nobody can write to you privately.';if(dialog.open)paint();}
  catch(error){privateSwitch.checked=!on;if(privateStatus)privateStatus.textContent=error.message;}
  finally{privateBusy=false;privateSwitch.disabled=false;}
 });

 button.onclick=()=>open();
 const stop=chat.subscribe(onEvent);
 const ready=refreshOverview();
 // In case the live connection drops without telling: a quiet check every few minutes while the farm is on screen.
 pollTimer=setInterval(()=>{if(!doc.hidden)void refreshOverview();},180000);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden&&overview)scheduleOverview(500);});
 win.addEventListener('pagehide',()=>{disposed=true;stop?.();clearInterval(pollTimer);clearTimeout(overviewTimer);for(const timer of readTimers.values())clearTimeout(timer);},{once:true});
 return {open,get role(){return role();},whenReady:()=>ready.then(()=>overview)};
}
