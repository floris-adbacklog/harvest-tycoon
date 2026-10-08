// The chat window. Its button sits next to Farm Family in the header; on a phone it takes the Family button's place (Family moves
import {linkify,inLanguage} from './popup-ui.js';
import {skeleton} from '../public/skeleton.js';
import {loadStaff,staffRole,staffBadge,STAFF_LABELS} from './staff-badge.js';
// into the More menu, under Friends). Four tabs: Notifications (news from the admin and the odd personal note from the staff),
// Global, Family and Private. The box you type in is at the top and the newest message right under it, so nothing has to be
// scrolled. A name or picture opens that farmer's profile. Data and live updates: bridge.chat (src/chat-client.js).
import {avatarImage} from '../public/player-avatars.js';
import {art,refreshArt} from '../public/visual-icons.js';
import {ITEMS,FAMILY_CHEST_TIERS,FAMILY_CHEST_MIN,familyWeek} from '../public/farm-state.js';
import {showCenterNotice} from '../public/center-notice.js';
import {confirmAction,promptText} from '../public/confirm-dialog.js';
import {setAppBadge} from '../public/app-badge.js';
import {chosenLanguage} from '../public/i18n.js';
import {portalChat,portalOff} from '../public/portal.js';
import {chatParts,mentionsMe,mentionAt,insertMention,appendMention,mentionIds,mentionMatches,MAX_MENTIONS} from './chat-rich.js';
import {wikiSectionTitle} from '../public/wiki-content.js';
import {SITE,appPath,settingsPart} from '../public/game-links.js';
import {androidApp} from '../public/android.js';
import {LANGUAGES} from '../public/languages.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// A message the staff changed: the new text and the "edited" mark; the rest (such as the farmer's VIP mark as it is now) stays.
const withEdit=(list,changed)=>list.map(m=>m.id===changed?.id?{...m,body:changed.body,edited_at:changed.edited_at,edited_by_moderator:changed.edited_by_moderator,...(changed.meta!==undefined?{meta:changed.meta}:{})}:m);
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
// The messages of one farmer in a row (at most 10 minutes apart, the same day) show their name and picture once, and every day starts
// with a divider: Today, Yesterday, then the date. The list shows the newest first, so a group's name sits above its newest message.
const GROUP_GAP=10*60*1000;
const dayKey=iso=>{const d=new Date(Date.parse(iso));return Number.isFinite(d.getTime())?`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`:'';};
export function dayLabel(iso,now=Date.now()){
 const key=dayKey(iso),today=new Date(now),yesterday=new Date(now-86400000);
 if(key===dayKey(today.toISOString()))return 'Today';
 if(key===dayKey(yesterday.toISOString()))return 'Yesterday';
 const time=Date.parse(iso);return Number.isFinite(time)?new Date(time).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'}):'';
}
export function messageLayout(shown){
 return shown.map((m,i)=>{
  const newer=shown[i-1],day=!newer||dayKey(newer.created_at)!==dayKey(m.created_at);
  // A card (a request, a new rank) stands on its own: it never folds into the messages around it. So does a group message (8 Oct 2026):
  // its line says who it is from and who got it.
  const card=x=>(Boolean(x.kind)&&x.kind!=='message')||Boolean(x.meta?.group);
  const cont=Boolean(newer)&&!day&&!card(newer)&&!card(m)&&newer.sender===m.sender&&Date.parse(newer.created_at)-Date.parse(m.created_at)<=GROUP_GAP;
  return {m,day,cont};
 });
}
// A Family Chest tier the family opened (supabase/family-chest-cards.sql, 5 Oct 2026): the chest's picture, one whole sentence per
// chest (so a translation can bend it), who gets its rewards and a button to Farm Family, where they are collected. A card from an
// earlier week says "that week". The database sends it under the week's top farmer, as a message needs a sender; it is the family's
// card all the same, so it shows even to a farmer who blocked them.
const CHEST_OPENED={wood:'Your family opened the Wooden chest!',iron:'Your family opened the Iron chest!',silver:'Your family opened the Silver chest!',gold:'Your family opened the Golden chest!'};
export function chestCard(m,now=Date.now()){
 const tier=FAMILY_CHEST_TIERS.find(t=>t.id===m.meta?.tier),week=Number(m.meta?.week),past=Number.isFinite(week)&&week<familyWeek(now);
 const who=past?`Everyone with ${FAMILY_CHEST_MIN} points that week gets its rewards. Collect them in Farm Family.`:`Everyone with ${FAMILY_CHEST_MIN} points this week gets its rewards. Collect them in Farm Family.`;
 return `<li class="chat-request chat-chest" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}Family Chest</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at,now)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art(tier?`family-chest-${tier.id}`:'family-chest-open')}</span><div><p class="chat-text">${esc(CHEST_OPENED[tier?.id]??m.body)}</p><small class="chat-request-status">${esc(who)}</small></div></div><button type="button" class="small-button chat-chest-open" data-open-family>Open Farm Family</button></li>`;
}
export const hiddenAsBlocked=(m,blocked)=>m.kind!=='chest'&&blocked.has(m.sender);
// A group message from the admin (8 Oct 2026, supabase/chat-group-filters.sql): every copy carries who it was sent to (meta.group.filters,
// as the database checked them), so the farmer reads an honest line above it: one pill per filter, in the game's own words (translated
// like the rest), never the admin's text. A language by its own name, as Settings lists it. No filter: "Every farmer". A filter this
// game does not know yet is left out, and then nothing claims it went to everyone.
const GROUP_ACTIVE={online:'Online now',week:'Active this week',month:'Active this month'};
const GROUP_PLATFORM={android:'Plays in the Android app',ios:'Plays in the iPhone app',browser:'Plays in the browser'};
const GROUP_NOT_PLATFORM={android:'Not in the Android app',ios:'Not in the iPhone app',browser:'Not in the browser'};
const GROUP_FAMILY={in:'In a family',out:'Not in a family'};
export function groupPills(filters){
 const f=filters&&typeof filters==='object'&&!Array.isArray(filters)?filters:{},level=n=>Number.isInteger(n)&&n>=1&&n<=200,language=LANGUAGES.find(l=>l.code===f.language)?.name;
 const pills=[level(f.minLevel)&&`From level ${f.minLevel}`,level(f.maxLevel)&&`Up to level ${f.maxLevel}`,GROUP_ACTIVE[f.active],GROUP_PLATFORM[f.platform],GROUP_NOT_PLATFORM[f.notPlatform],f.crazygames===true&&'Plays on CrazyGames',language&&`Plays in ${language}`,GROUP_FAMILY[f.family]].filter(text=>typeof text==='string'&&text);
 return pills.length||Object.keys(f).length?pills:['Every farmer'];
}
// Above the message's text: "Group message from the team", then "Sent to:" and the pills, each its own element (no " · ").
export function groupLine(m){
 if(!m?.meta?.group)return '';const pills=groupPills(m.meta.group.filters);
 return `<div class="chat-group"><span class="chat-group-title">${art('chat')}Group message from the team</span>${pills.length?`<span class="chat-group-to"><span>Sent to:</span>${pills.map(text=>`<span class="chat-group-pill">${esc(text)}</span>`).join('')}</span>`:''}</div>`;
}
// 8 Oct 2026: the other farmer in a private chat, read from its channel; null when it is not one of mine (a link can name any channel).
export function dmOther(channel,me){const m=/^dm:([0-9a-f-]{36}):([0-9a-f-]{36})$/.exec(String(channel??''));return !m||!me?null:m[1]===me?m[2]:m[2]===me?m[1]:null;}
// 8 Oct 2026 (supabase/chat-threads-paging.sql): the Private list is the overview's chats, then the older pages (Show more) that are not
// among them: each chat once, the first copy wins (the overview's, the newer).
// Newest first, then the channel in byte order (collate "C"), as chat_threads pages them: the overview's unread older chats and the
// pages after them interleave by time (8 Oct 2026).
export const byLast=(a,b)=>(Date.parse(b.lastAt)||0)-(Date.parse(a.lastAt)||0)||(a.channel<b.channel?1:a.channel>b.channel?-1:0);
export function mergeThreads(first,older){const seen=new Set();return [...(first??[]),...(older??[])].filter(t=>t?.channel&&!seen.has(t.channel)&&seen.add(t.channel));}
// The header button counts news and notes, your family and your private messages. Global's own messages do not count: with the whole
// valley talking, a number on the button would never go away. A mention of you there does (3 Oct 2026): it is meant for you.
export const headerCount=unread=>(unread?.notices??0)+(unread?.family??0)+(unread?.dm??0)+(unread?.mentions??0);
const NOTICES={news:'News',moderation:'From the moderators',gift:'A gift for you',donation:'A gift for you',purchase:'In-game purchase',family:'Farm Family'};
const TITLES={notices:'Notifications',global:'Global chat',private:'Private chats'};
const EMPTY={
 notices:'No news yet. New features and events show up here.',
 global:'No messages yet. Say hello to the valley!',
 family:'No messages yet. Say hello to your family!',
 private:'No private messages yet. Open a farmer’s profile and choose Send message.'
};
const ICON={
 back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12l6-6"/></svg>',
 more:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
 pin:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>',
 translate:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
 phone:'<svg class="chat-link-icon" viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>'
};
// The valley speaks many languages (30 Sep 2026): a message from someone else, in any chat, has a small translate link (under the
// "•••", on hover; on a phone in the long-press menu) that opens Google Translate in a new tab, from whatever language it is in to
// the one the farmer plays in.
export const translateLink=(text,language='en')=>`https://translate.google.com/?sl=auto&tl=${encodeURIComponent(language)}&text=${encodeURIComponent(String(text??''))}&op=translate`;

export function createChatUI({bridge,profiles,doc=document,win=window}){
 const chat=bridge?.chat,button=doc.getElementById('chat-button'),dot=doc.getElementById('chat-dot');
 if(!chat||!button)return null;
 // CrazyGames (Oct 2026, public/portal.js): the chat is for players logged in with CrazyGames, and gone when CrazyGames switches chat
 // off (its disableChat setting). A guest's chat button opens one small window with CrazyGames' log-in instead.
 const gate=portalChat(bridge.portal??null);
 if(gate==='off')return null;
 if(gate==='guest')return chatLogIn({portal:bridge.portal,button,doc});
 const me=bridge.playerId;
 // Staff marks: the admin shows as Admin (src/staff-badge.js); drawn again once the list is in.
 void loadStaff(chat).then(()=>{if(dialog?.open)paint();});
 const dialog=doc.createElement('dialog');dialog.id='chat-dialog';dialog.className='game-dialog chat-dialog';dialog.setAttribute('aria-labelledby','chat-title');dialog.tabIndex=-1;
 dialog.innerHTML=`<div class="chat-top"><div class="chat-tabs" role="tablist" aria-label="Chat">
  <button type="button" role="tab" data-chat-tab="notices" aria-label="Notifications" title="Notifications">${art('bell')}<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="global">Global<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="family">Family<b class="chat-count" hidden></b></button>
  <button type="button" role="tab" data-chat-tab="private">Private<b class="chat-count" hidden></b></button>
 </div><button type="button" class="icon-button chat-close" aria-label="Close chat"><i data-lucide="x"></i></button></div>
 <div class="chat-head"><button type="button" class="chat-back" aria-label="All private chats" hidden>${ICON.back}</button><h2 id="chat-title">Global chat</h2><button type="button" class="chat-report" hidden>${art('alert')}</button><button type="button" class="chat-block" hidden>${art('block')}</button></div>
 <form class="chat-compose" hidden><input type="text" maxlength="200" autocomplete="off" enterkeyhint="send" aria-label="Your message"><select class="chat-hours" aria-label="Show the news for" title="How long everyone sees it" hidden><option value="6">6 h</option><option value="12">12 h</option><option value="24" selected>24 h</option><option value="48">48 h</option><option value="72">3 days</option><option value="168">7 days</option><option value="0">Always</option></select><button type="submit" class="chat-send" aria-label="Send">${art('send')}</button><ul class="chat-mentions" role="listbox" aria-label="Mention a farmer" hidden></ul></form>
 <div class="chat-find" hidden><input type="search" maxlength="20" autocomplete="off" spellcheck="false" placeholder="Find a farmer to message…" aria-label="Find a farmer to message"></div>
 <p class="chat-note" role="status" hidden></p>
 <ol class="chat-list"></ol>`;
 doc.body.append(dialog);
 const $=selector=>dialog.querySelector(selector);
 const form=$('.chat-compose'),input=form.querySelector('input'),hours=form.querySelector('.chat-hours'),sendButton=form.querySelector('.chat-send'),list=$('.chat-list'),noteEl=$('.chat-note');
 const title=$('#chat-title'),head=$('.chat-head'),back=$('.chat-back'),blockButton=$('.chat-block'),reportButton=$('.chat-report'),find=$('.chat-find'),findInput=find.querySelector('input');
 // The Private tab: find any farmer by name and write to them, without opening their profile first (the same search as the leaderboard).
 let found=null,findTimer=null,findTicket=0;

 let overview=null,tab='global',thread=null,messages=[],notices=[],freshNotices=0,loading=0,busy=false,sending=false,connected=false,disposed=false,switchedOff=false;
 // Earlier messages (5 Oct 2026, a farmer's feedback: an old conversation could not be read back): the newest PAGE come first, and a button
 // at the end of the list fetches the PAGE before them, as long as there are more.
 const PAGE=50;let more=false,loadingMore=false;
 // Older private chats (8 Oct 2026, supabase/chat-threads-paging.sql): the overview has the 30 newest and every unread one, Show more
 // fetches the next 30 after its cursor. They live here, apart from the overview, which is replaced every 3 minutes and on every private
 // message. olderMore is null until the first page: then the overview says whether there are more.
 let olderThreads=[],olderMore=null,olderCursor=null,loadingThreads=false,threadsTicket=0;
 let overviewTimer=null,pollTimer=null;const readTimers=new Map(),statusCache=new Map();
 // A message keeps the avatar its sender had when it was sent (chat_messages.sender_avatar); the chat shows the sender's avatar of now
 // instead: looked up for every farmer on screen when a chat opens (at most once a minute, then only farmers not seen yet), and changed
 // at once when you save a new one in Settings.
 const faces=new Map();let facesAt=0;
 const faceOf=m=>faces.get(m.sender)??m.sender_avatar;
 async function freshFaces(ids,all=false){
  const wanted=[...new Set(ids)].filter(id=>id&&(all||!faces.has(id)));if(!wanted.length)return;if(all)facesAt=Date.now();
  let found;try{found=await chat.faces(wanted);}catch{return;}
  let changed=false;for(const [id,avatar] of found){if(avatar&&faces.get(id)!==avatar){faces.set(id,avatar);changed=true;}}
  if(changed&&dialog.open&&!disposed)paint();
 }
 win.addEventListener?.('harvest-avatar-changed',event=>{const {playerId,avatarId}=event.detail??{};if(!playerId||!avatarId)return;faces.set(playerId,avatarId);if(dialog.open&&!disposed)paint();});
 const unread=()=>overview?.unread??{notices:0,global:0,family:0,dm:0,mentions:0};
 const role=()=>overview?.role??null;
 const blocked=()=>new Set(overview?.blocked??[]);
 const channelOf=()=>tab==='global'?'global':tab==='family'?overview?.family?.channel??null:tab==='private'?thread?.channel??null:null;
 const showing=channel=>dialog.open&&channelOf()===channel;
 function note(text=''){noteEl.textContent=text;noteEl.hidden=!text;}

 // The header pill, the numbers on the tabs and the number on the app icon (private and family messages; public/app-badge.js).
 let iconCount=null;
 function counts(){
  const u=unread(),total=headerCount(u),onIcon=(u.dm??0)+(u.family??0)+(u.mentions??0);
  if(onIcon!==iconCount){iconCount=onIcon;void setAppBadge(onIcon);}
  dot.hidden=total<1;dot.textContent=pillText(total);
  button.setAttribute('aria-label',total?`Open chat, ${total} unread`:'Open chat');
  // Global's red count is only its mentions of you (3 Oct 2026): its other messages would keep it lit for ever. News, Family and
  // Private count everything new.
  const per={notices:u.notices,global:u.mentions??0,family:u.family,private:u.dm};
  dialog.querySelectorAll('[data-chat-tab]').forEach(tabButton=>{const n=per[tabButton.dataset.chatTab]??0,badge=tabButton.querySelector('.chat-count');badge.hidden=n<1;badge.textContent=pillText(n);});
 }
 async function refreshOverview(){
  try{
   const next=await chat.overview();if(disposed)return;
   // Once older pages are (being) fetched, a chat that drops out of the newest 30 (new chats came in) stays in the list, or it would
   // fall between the new 30th and the pages already there.
   // Below 99 rows the overview lists every chat with something unread, so a kept chat it no longer lists has nothing unread.
   if(olderMore!==null||loadingThreads){const listed=new Set((next?.threads??[]).map(t=>t.channel)),full=(next?.threads?.length??0)>=99;olderThreads=mergeThreads(overview?.threads,olderThreads).map(t=>full||listed.has(t.channel)||!t.unread?t:{...t,unread:0});}
   overview=next;button.hidden=switchedOff;settings();
   // What is on screen right now is read, even if the count raced ahead of it.
   if(dialog.open){const name=channelOf();if(tab==='notices')overview.unread.notices=0;else if(name==='global')overview.unread.global=overview.unread.mentions=0;else if(name&&name===overview.family?.channel)overview.unread.family=0;else if(name)clearThread(name);}
   counts();if(dialog.open)paint();
  }catch{}
 }
 const scheduleOverview=(wait=1200)=>{clearTimeout(overviewTimer);overviewTimer=setTimeout(refreshOverview,wait);};
 const findThread=name=>overview?.threads?.find(x=>x.channel===name)??olderThreads.find(x=>x.channel===name);
 function clearThread(name){
  const t=name==='crew'?overview?.crew:findThread(name);if(!t)return;
  // Private counts the staff's Crew too (supabase/chat-crew.sql). 8 Oct 2026: and every private chat, listed or not
  // (supabase/chat-threads-paging.sql), so this one's count comes off rather than the listed ones being added up again.
  overview.unread.dm=Math.max(0,(overview.unread.dm??0)-(t.unread||0));t.unread=0;for(const x of olderThreads)if(x.channel===name)x.unread=0;
 }
 // Marks a chat read on the server, at most once every few seconds per chat, and at once on this screen.
 function markRead(name){
  if(!overview||!name)return;
  if(name==='notices')overview.unread.notices=0;else if(name==='global')overview.unread.global=overview.unread.mentions=0;else if(name===overview.family?.channel)overview.unread.family=0;else clearThread(name);
  counts();
  if(readTimers.has(name))return;
  readTimers.set(name,setTimeout(()=>{readTimers.delete(name);chat.markRead(name).catch(()=>{});},1500));
 }

 const profileButton=(id,label,inner,cls)=>`<button type="button" class="${cls}" data-profile="${esc(id)}" aria-label="${esc(label)}">${inner}</button>`;
 // A request for goods (supabase/family-request-chat.sql, 29 Sep 2026): a card of its own between the messages, with the good's
 // picture and, for the others, a button that gives it straight from here. Once given it greys out and says by whom.
 function requestRow(m){
  // The family fills a request together (supabase/family-sharing-partial.sql): "given" is how many are in, each farmer gives
  // what they have, up to what is still needed.
  const r=m.meta??{},name=ITEMS[r.item]?.name??String(r.item??''),qty=Number(r.quantity)||0,mine=m.sender===me,given=Boolean(r.fulfilled_by),filled=Number(r.given)||0,left=Math.max(0,qty-filled);
  const have=win.harvestStock?.(r.item),known=Number.isFinite(have),give_=known?Math.min(have,left):left;
  const helped=Number(r.helpers)||0,status=given?(r.fulfilled_by===me?'✓ You helped':helped>1?`✓ Filled by ${helped} farmers`:r.fulfilled_name?`✓ Given by ${r.fulfilled_name}`:'✓ Fulfilled'):filled?`${filled} of ${qty} in${mine||!known?'':` · you have ${have}`}`:mine?'Waiting for your family':known?`You have ${have}`:'';
  const give=!given&&!mine&&r.request?`<button type="button" class="primary-button chat-request-give" data-give="${esc(r.request)}"${known&&give_<1?' disabled':''}>${known&&give_<1?'You have none':`Give ${give_} ${esc(name)}`}</button>`:'';
  return `<li class="chat-request${given?' is-given':''}" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}Family request</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art(r.item)}</span><div><p class="chat-text">${esc(given?`${m.sender_name} asked for ${qty} ${name}`:`${m.sender_name} asks for ${qty} ${name}`)}</p>${status?`<small class="chat-request-status">${esc(status)}</small>`:''}</div></div>${give}</li>`;
 }
 // A new rank in the family (supabase/family-rank-chat.sql): a card with the rank's badge, a promotion in the warm colour, a
 // demotion in grey.
 const RANK_ORDER={member:1,honorary:2,coleader:3,leader:4};
 const RANK_TEXT={leader:'{0} is now the leader.',coleader:'{0} is now a co-leader.',honorary:'{0} is now an honorary member.',member:'{0} is now a member.'};
 function rankRow(m){
  const {from,to}=m.meta??{},up=(RANK_ORDER[to]??0)>=(RANK_ORDER[from]??0),text=(RANK_TEXT[to]??'{0} is now a member.').replace('{0}',m.sender_name);
  return `<li class="chat-request chat-rank${up?'':' is-given'}" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}${up?'Promoted':'Demoted'}</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art(`family-rank-${RANK_ORDER[to]?to:'member'}`)}</span><div><p class="chat-text">${esc(text)}</p></div></div></li>`;
 }
 // A new top farmer of the week (supabase/family-top-chat.sql, checked once an hour): the crown and their chest points.
 function topRow(m){
  const points=Number(m.meta?.points)||0;
  return `<li class="chat-request chat-top-farmer" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}Top farmer</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art('family-rank-top')}</span><div><p class="chat-text">${esc(`${m.sender_name} is now the top farmer of the week.`)}</p>${points?`<small class="chat-request-status">${esc(`${points} points`)}</small>`:''}</div></div></li>`;
 }
 // A farmer removed from the family (farm-api family-service.js): in grey, with the rank they had and who removed them.
 function kickRow(m){
  const {role,by}=m.meta??{},badge=['leader','coleader','honorary'].includes(role)?role:'member';
  return `<li class="chat-request chat-kick is-given" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}Removed</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art(`family-rank-${badge}`)}</span><div><p class="chat-text">${esc(`${m.sender_name} was removed from the family.`)}</p>${by?`<small class="chat-request-status">${esc(`Removed by ${by}`)}</small>`:''}</div></div></li>`;
 }
 // A new member of the family (supabase/family-join-chat.sql): the member badge and "… is now a member.", in the warm colour.
 function joinRow(m){
  return `<li class="chat-request chat-join" data-id="${esc(m.id)}"><div class="chat-request-top"><span class="chat-request-label">${art('family-members')}New member</span><time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time></div><div class="chat-request-body"><span class="chat-request-art">${art('family-rank-member')}</span><div><p class="chat-text">${esc(`${m.sender_name} is now a member.`)}</p></div></div></li>`;
 }
 // The words of a message as written (translate="no"), with its wiki links and mentions as chips (3 Oct 2026, src/chat-rich.js). A wiki
 // chip shows the book and the spot's title as How to play heads it (wiki-content.js wikiSectionTitle: a section, a building, a crop or
 // a level, else the topic), the game's own words, so the page's translation puts them in the reader's language; a mention is "@Name"
 // and opens that farmer's profile by id. The staff's own messages may still carry another https link (an admin's message to many
 // farmers, e.g. a feedback form); nobody else's can.
 const wikiChip=link=>`<button type="button" class="chat-wiki" data-wiki-link="${esc(link.topic)}" data-wiki-section="${esc(link.section)}">${art('guide')}<span>${esc(wikiSectionTitle(link.topic,link.section))}</span></button>`;
 // The app page and a part of Settings (4 Oct 2026, public/game-links.js): "Get the app", and the way to the part as Settings shows it,
 // "Settings › Farm app" (the game's own words, translated like the rest), so a farmer learns where to find it without the link.
 // On CrazyGames an app link stays plain words (no app promotion in their build; 4 Oct 2026 review).
 const appChip=()=>`<button type="button" class="chat-wiki chat-app-link" data-app-link>${ICON.phone}<span>Get the app</span></button>`;
 const settingsChip=link=>`<button type="button" class="chat-wiki chat-settings-link" data-settings-link="${esc(link.slug)}">${art('settings')}<span>Settings</span><span class="chat-path-sep" aria-hidden="true">›</span><span>${esc(settingsPart(link.slug)?.title??'')}</span></button>`;
 // The Feedback window (6 Oct 2026): "Feedback" with its mailbox, opening it as the button does.
 const feedbackChip=()=>`<button type="button" class="chat-wiki chat-feedback-link" data-feedback-link>${art('feedback')}<span>Feedback</span></button>`;
 const mentionChip=who=>`<button type="button" class="chat-mention${who.id===me?' is-me':''}" data-profile="${esc(who.id)}" translate="no">@${esc(who.name)}</button>`;
 const bodyHtml=m=>chatParts(m.body,m.meta?.mentions).map(part=>part.wiki?wikiChip(part.wiki):part.app?(portalOff('app')?`<span translate="no">${esc(part.app.url)}</span>`:appChip()):part.settings?settingsChip(part.settings):part.feedback?feedbackChip():part.mention?mentionChip(part.mention):`<span translate="no">${m.sender_staff?linkify(part.text):esc(part.text)}</span>`).join('');
 function messageRow(m,{cont=false}={}){
  if(m.kind==='request')return requestRow(m);
  if(m.kind==='rank')return rankRow(m);
  if(m.kind==='top')return topRow(m);
  if(m.kind==='join')return joinRow(m);
  if(m.kind==='kick')return kickRow(m);
  if(m.kind==='chest')return chestCard(m);
  const mine=m.sender===me,staff=role()!==null,menu=!mine||staff;
  // Every message keeps the room of the "•••" (an empty spot on your own), so all the times line up.
  const more=menu?`<button type="button" class="chat-more" data-more="${esc(m.id)}" aria-label="More options for this message" aria-haspopup="menu">${ICON.more}</button>`:'<span class="chat-more-space" aria-hidden="true"></span>';
  const translate=!mine&&String(m.body??'').trim()?`<a class="chat-translate" href="${esc(translateLink(m.body,chosenLanguage()))}" target="_blank" rel="noopener noreferrer" aria-label="Translate with Google" title="Translate with Google">${ICON.translate}</a>`:'';
  const text=`${bodyHtml(m)}${m.edited_at?` <span class="chat-edited" title="${esc(exact(m.edited_at))}">(${m.edited_by_moderator?'edited by a moderator':'edited'})</span>`:''}`,tr=`${translate?' has-translate':''}${mentionsMe(m,me)?' is-mention':''}`;
  // A second message in a row: only the text (the name is there for a screen reader), the time on hover.
  if(cont)return `<li class="chat-msg is-cont${mine?' is-mine':''}${tr}" data-id="${esc(m.id)}"><span aria-hidden="true"></span><div class="chat-msg-main"><p class="chat-text" title="${esc(exact(m.created_at))}"><span class="chat-sr">${esc(m.sender_name)}: </span>${text}</p></div>${more}${translate}</li>`;
  return `<li class="chat-msg${mine?' is-mine':''}${tr}" data-id="${esc(m.id)}">${profileButton(m.sender,`Open ${m.sender_name}’s profile`,avatarImage(faceOf(m)),'chat-avatar')}<div class="chat-msg-main"><div class="chat-msg-top">${profileButton(m.sender,`Open ${m.sender_name}’s profile`,esc(m.sender_name),'chat-name')}${m.sender_vip?VIP:''}${m.sender_staff?staffBadge(staffRole(m.sender)??'moderator','chat-mod'):''}<time datetime="${esc(m.created_at)}" title="${esc(exact(m.created_at))}">${ago(m.created_at)}</time>${more}</div>${groupLine(m)}<p class="chat-text">${text}</p></div>${translate}</li>`;
 }
 function threadRow(t){
  return `<li><button type="button" class="chat-thread${t.unread?' is-unread':''}" data-thread="${esc(t.channel)}"><span class="chat-avatar">${avatarImage(t.otherAvatar)}</span><span class="chat-thread-copy"><strong>${esc(t.otherName)}${t.otherVip?VIP:''}</strong><small>${t.last?.mine?'You: ':''}<span translate="no">${esc(t.last?.body??'')}</span></small></span><span class="chat-thread-side"><time datetime="${esc(t.lastAt)}" title="${esc(exact(t.lastAt))}">${ago(t.lastAt)}</time>${t.unread?`<b class="chat-count">${pillText(t.unread)}</b>`:''}</span></button></li>`;
 }
 // The Crew (supabase/chat-crew.sql, 1 Oct 2026): the staff's own group chat, the admin and every moderator, pinned on top of their
 // private chats. Nobody else sees it.
 function crewRow(c){
  const last=c.last?`${c.last.mine?'You: ':`<span translate="no">${esc(c.last.senderName)}</span>: `}<span translate="no">${esc(c.last.body)}</span>`:'Admins and moderators only';
  return `<li><button type="button" class="chat-thread chat-crew${c.unread?' is-unread':''}" data-thread="crew"><span class="chat-avatar chat-crew-art">${art('admin')}</span><span class="chat-thread-copy"><strong>Crew<span class="chat-crew-pin" title="Pinned">${ICON.pin}</span></strong><small>${last}</small></span><span class="chat-thread-side">${c.lastAt?`<time datetime="${esc(c.lastAt)}" title="${esc(exact(c.lastAt))}">${ago(c.lastAt)}</time>`:''}${c.unread?`<b class="chat-count">${pillText(c.unread)}</b>`:''}</span></button></li>`;
 }
 // "50 diamonds + 1,000 coins" in a gift note shows the diamond and the coin in front of the amounts.
 const AMOUNT_ART={diamonds:'diamonds',coins:'coins',XP:'xp'};
 const withAmounts=text=>esc(text).replace(/\b(\d{1,3}(?:,\d{3})+|\d+) (diamonds|coins|XP)\b/g,(all,amount,what)=>`<span class="chat-amount">${art(AMOUNT_ART[what])}<b>${amount}</b> ${what}</span>`);
 // A gift note is made by the database in English ("Donation: you received 10 diamonds + 10 coins for every level. “…”"). It shows
 // in the player's language (1 Oct 2026): "You’ve received:", the amounts with their pictures, and the staff's own words as written.
 function giftBody(body){
  const m=/^Donation: you received (.*?)\.(?: “([\s\S]*)”)?$/.exec(String(body??''));
  if(!m)return withAmounts(body);
  const parts=m[1].split(' + ').map(part=>/ for every level$/.test(part)?`${withAmounts(part.replace(/ for every level$/,''))} <span>for every level</span>`:withAmounts(part));
  return `<span>You’ve received:</span> ${parts.join(' + ')}${m[2]?` <span translate="no">“${esc(m[2])}”</span>`:''}`;
 }
 function noticeRow(n,fresh){
  // News in the farmer's own language when the admin wrote it in that language too.
  const news=n.kind==='news'?inLanguage(n):{own:new Set()};
  const picture=n.kind==='news'?'<img src="/assets/harvest-tycoon-logo.webp" alt="" width="44" height="44" draggable="false">':art(n.kind==='moderation'?'admin':n.kind==='gift'||n.kind==='donation'?'gift':n.kind==='purchase'?'diamonds':n.kind==='family'?'family-members':'bell');
  return `<li class="chat-notice${fresh?' is-new':''}"><span class="chat-notice-art">${picture}</span><div class="chat-msg-main"><div class="chat-msg-top"><strong>${esc(NOTICES[n.kind]??'Harvest Tycoon')}</strong><time datetime="${esc(n.created_at)}" title="${esc(exact(n.created_at))}">${ago(n.created_at)}</time></div><p class="chat-text"${news.own.has('body')?' translate="no"':''}>${n.kind==='gift'||n.kind==='donation'?giftBody(n.body):n.kind==='news'?linkify(news.body):esc(n.body)}</p></div></li>`;
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
  if(tab==='private'&&thread?.crew)return {show:true,placeholder:'Message the crew…'};
  const need=tab==='global'?overview?.levels?.global:tab==='private'?overview?.levels?.dm:1;
  if(need&&(overview?.level??0)<need)return {show:true,blocked:`${tab==='global'?'The global chat':'Private messages'} open at level ${need}.`};
  if(tab==='private'&&overview?.privateOn===false)return {show:true,blocked:'Your private messages are off. Turn them on in Settings.'};
  if(tab==='private'&&thread&&blocked().has(thread.otherId))return {show:true,blocked:`You blocked ${thread.otherName}. Unblock them to write.`};
  // Global and Family say how to mention someone, on the box itself (3 Oct 2026; the tab already says where you write, and a longer
  // hint did not fit a phone). A private chat has nobody else to mention.
  return {show:true,placeholder:tab==='global'||tab==='family'?'Type @ to mention a farmer.':`Message ${thread.otherName}…`};
 }
 // Its own class (6 Oct 2026): it shared .chat-more with each message's ⋯ button, which is invisible until hovered on a computer and
 // clipped away on a phone, so it never showed.
 const moreButton=()=>more?`<li class="chat-earlier"><button type="button" class="small-button" data-chat-more${loadingMore?' disabled':''}>${loadingMore?'Loading…':'Load earlier messages'}</button></li>`:'';
 async function loadMore(){
  const name=channelOf(),last=messages[messages.length-1];if(!name||!last||loadingMore)return;
  const ticket=loading;loadingMore=true;paint();
  try{const rows=await chat.messages(name,PAGE,last.created_at);if(ticket!==loading)return;const known=new Set(messages.map(m=>m.id));messages=[...messages,...rows.filter(m=>!known.has(m.id))];more=rows.length>=PAGE;void freshFaces(rows.map(m=>m.sender));}
  catch(error){if(ticket===loading)note(error.message);}
  finally{if(ticket===loading){loadingMore=false;paint();}}
 }
 // Show more under the private chats (8 Oct 2026), only while the database says there are more: never before
 // supabase/chat-threads-paging.sql (the overview has no moreThreads then, and a missing chat_threads gives null).
 const threadsCursor=()=>olderMore===null?(overview?.moreThreads&&overview.threadsCursor)||null:olderMore?olderCursor:null;
 const moreThreadsButton=()=>threadsCursor()?`<li class="chat-earlier"><button type="button" class="small-button" data-chat-threads${loadingThreads?' disabled':''}>${loadingThreads?'Loading…':'Show more'}</button></li>`:'';
 async function loadThreads(){
  const cursor=threadsCursor(),ticket=threadsTicket;if(!cursor||loadingThreads)return;
  loadingThreads=true;paint();
  try{const page=await chat.threads(cursor);if(ticket!==threadsTicket||disposed)return;olderThreads=mergeThreads(olderThreads,page?.threads);olderCursor=page?.cursor??null;olderMore=Boolean(page?.more&&olderCursor);}
  catch(error){if(ticket===threadsTicket)note(error.message);}
  finally{if(ticket===threadsTicket){loadingThreads=false;if(dialog.open&&!disposed)paint();}}
 }
 // A fresh open of the chat starts the list at the newest 30 again.
 function resetThreads(){threadsTicket++;olderThreads=[];olderMore=null;olderCursor=null;loadingThreads=false;}
 function paint(){
  dialog.querySelectorAll('[data-chat-tab]').forEach(tabButton=>{const on=tabButton.dataset.chatTab===tab;tabButton.classList.toggle('active',on);tabButton.setAttribute('aria-selected',String(on));});
  back.hidden=!(tab==='private'&&thread);blockButton.hidden=reportButton.hidden=back.hidden||Boolean(thread?.crew);
  find.hidden=!(tab==='private'&&!thread&&overview?.privateOn!==false);
  // The tab already says where you are: a heading only for a family (its name) and a private chat (who with).
  head.classList.toggle('is-quiet',!((tab==='family'&&overview?.family)||(tab==='private'&&thread)));
  if(thread){reportButton.setAttribute('aria-label',`Report ${thread.otherName}`);reportButton.title=reportButton.getAttribute('aria-label');}
  if(thread){const off=blocked().has(thread.otherId);blockButton.setAttribute('aria-label',off?`Unblock ${thread.otherName}`:`Block ${thread.otherName}`);blockButton.title=blockButton.getAttribute('aria-label');blockButton.classList.toggle('is-on',off);}
  // A private chat shows just the other farmer's name (27 Sep 2026): "Chat with" and a long automatic name ("Gentle Farm 6170")
  // did not fit on a phone next to Report and Block, and the whole name fell away behind "…". Screen readers still hear "Chat with".
  title.innerHTML=tab==='family'?esc(overview?.family?.name??'Family chat'):tab==='private'&&thread?.crew?esc('Crew'):tab==='private'&&thread?profileButton(thread.otherId,`Open ${thread.otherName}’s profile`,esc(thread.otherName),'chat-title-name'):esc(TITLES[tab]);
  if(tab==='private'&&thread&&!thread.crew)title.setAttribute('aria-label',`Chat with ${thread.otherName}`);else title.removeAttribute('aria-label');
  const compose=composeState();
  // While a message is on its way only the send button waits: the box stays usable, so the cursor (and a phone's keyboard) stays
  // put for the next message.
  form.hidden=!compose.show;input.disabled=Boolean(compose.blocked);sendButton.disabled=Boolean(compose.blocked)||sending;
  input.placeholder=compose.blocked??compose.placeholder??'';input.maxLength=compose.max??200;hours.hidden=tab!=='notices';form.classList.toggle('is-blocked',Boolean(compose.blocked));
  if(busy){list.innerHTML=`<li class="chat-empty">${skeleton('Opening the chat…',{rows:4})}</li>`;return;}
  if(tab==='notices')list.innerHTML=notices.length?notices.map((n,i)=>noticeRow(n,i<freshNotices)).join(''):empty(EMPTY.notices);
  else if(tab==='family'&&!overview?.family){
   const familyButton=doc.getElementById('family-button');
   list.innerHTML=empty(familyButton&&!familyButton.hidden?'Join a family to chat with its farmers.':'Families open at level 10. Then you can chat with yours here.',familyButton&&!familyButton.hidden?'<button type="button" class="small-button" data-open-family>Find a family</button>':'');
  }
  else if(tab==='private'&&!thread&&found&&!find.hidden)list.innerHTML=found.loading?'<li class="chat-empty"><p>Looking around the valley…</p></li>':found.players.length?found.players.map(foundRow).join(''):empty('No farmers found. Try another name.');
  else if(tab==='private'&&!thread){const threads=mergeThreads(overview?.threads,olderThreads).filter(t=>!blocked().has(t.otherId)).sort(byLast);list.innerHTML=(overview?.crew?crewRow(overview.crew):'')+(overview?.privateOn===false?'<li class="chat-empty chat-off"><p>Your private messages are off. You can turn them on in Settings, under Chat.</p></li>':'')+(threads.length?threads.map(threadRow).join('')+moreThreadsButton():overview?.privateOn===false?'':empty(EMPTY.private));}
  else{const shown=messages.filter(m=>!hiddenAsBlocked(m,blocked()));list.innerHTML=shown.length?messageLayout(shown).map(({m,day,cont})=>`${day?`<li class="chat-day" role="separator"><span>${esc(dayLabel(m.created_at))}</span></li>`:''}${messageRow(m,{cont})}`).join('')+moreButton():empty(thread?.crew?'Say hello to the crew!':thread?`Say hello to ${thread.otherName}!`:EMPTY[tab]);}
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
  more=false;
  try{const rows=await chat.messages(name,PAGE);if(ticket!==loading)return;messages=rows;more=rows.length>=PAGE;}catch(error){if(ticket===loading){messages=[];note(error.message);}}
  if(ticket!==loading)return;busy=false;paint();markRead(name);void freshFaces(messages.map(m=>m.sender),Date.now()-facesAt>60000);
 }
 function show(next,{keepThread=false}={}){
  tab=next;if(!keepThread)thread=null;messages=[];more=false;found=null;findInput.value='';picked.clear();closePicks();load();
  if(!matchMedia('(pointer:coarse)').matches&&!form.hidden)input.focus({preventScroll:true});
 }
 // 8 Oct 2026: a push for a private chat that is not in the list (the welcome sender has 1,500+ of them) opens it all the same, as
 // Send message on a profile does: the other farmer from the channel, their name and picture as they are now (chat.cards, the same
 // public table as the leaderboard). Only when that fails, the list.
 async function threadFromCard(channel){
  const id=dmOther(channel,me);if(!id)return null;
  const card=(await chat.cards?.([id]).catch(()=>[])??[]).find(c=>c?.playerId===id);
  return card?{channel,otherId:id,otherName:card.username??'A farmer',otherAvatar:card.avatarId}:null;
 }
 // A channel comes from a notification or a link (public/app-links.js): a private chat opens that conversation, a family chat the
 // Family tab.
 async function open({tab:wanted,with:other,channel}={}){
  if(switchedOff)return;
  doc.querySelectorAll('dialog[open]').forEach(d=>d.close());
  resetThreads();
  if(!overview||channel)await refreshOverview();
  if(!overview)return;
  if(channel?.startsWith('dm:')){const t=findThread(channel)??await threadFromCard(channel);if(t)other={id:t.otherId,name:t.otherName,avatar:t.otherAvatar};else wanted='private';}
  else if(channel?.startsWith('family:'))wanted='family';
  else if(channel==='notices')wanted='notices';
  // A push from the Crew opens the Crew (a farmer who is no longer staff gets their private chats).
  const crew=channel==='crew'&&Boolean(overview.crew);if(channel==='crew')wanted='private';
  // Always Global first (a private chat only when you came to write to someone); the counts on the tabs show what is new elsewhere.
  const first=other?'private':wanted??'global';
  if(other)thread={channel:chat.dmChannel(other.id),otherId:other.id,otherName:other.name,otherAvatar:other.avatar};
  else if(crew)thread={channel:'crew',crew:true,otherName:'Crew'};
  // The chat itself takes the focus, not its first button (the bell showed a focus ring on every open); Tab still reaches everything.
  dialog.showModal();dialog.focus({preventScroll:true});show(first,{keepThread:Boolean(other)||crew});void refreshOverview();
 }

 // Live: a message in the chat on screen appears at the top; anything else raises a count.
 function onEvent(event){
  if(disposed)return;
  if(event.type==='connected'){if(connected){void refreshOverview();if(dialog.open)void load();}connected=true;return;}
  if(!overview)return;
  if(event.type==='deleted'){if(messages.some(m=>m.id===event.id)){messages=messages.filter(m=>m.id!==event.id);if(dialog.open)paint();}return;}
  if(event.type==='edited'){const changed=event.message;if(changed&&messages.some(m=>m.id===changed.id)){messages=withEdit(messages,changed);if(dialog.open)paint();}return;}
  if(event.type==='notice'){
   // A gift for everyone: an open game fetches it now (the farm adds it on load), a few seconds apart so not everyone asks at once.
   if(event.notice?.kind==='donation')setTimeout(()=>{void win.harvestRefresh?.()?.catch?.(()=>{});},1000+Math.random()*9000);
   if(dialog.open&&tab==='notices'){if(!notices.some(n=>n.id===event.notice.id)){notices=[event.notice,...notices];freshNotices++;paint();}markRead('notices');}
   else{overview.unread.notices=Math.min(99,(overview.unread.notices??0)+1);counts();}
   return;
  }
  // Chat switched off by CrazyGames during play (Oct 2026 review): no more dings or counts for a chat that is not there.
  if(switchedOff)return;
  const m=event.message;if(!m||hiddenAsBlocked(m,blocked()))return;
  // A private message from someone else gets its own soft ding, open or not (the sound settings decide if it plays), and so does a
  // mention of you in Global or Family (3 Oct 2026: a mention reaches you like a private message).
  const forMe=mentionsMe(m,me);
  if(m.sender!==me&&(m.channel.startsWith('dm:')||m.channel==='crew'||forMe))win.harvestSound?.('message');
  if(showing(m.channel)){if(!messages.some(x=>x.id===m.id)){messages=[m,...messages].slice(0,Math.max(100,messages.length+1));paint();void freshFaces([m.sender]);}if(m.sender!==me)markRead(m.channel);if(m.channel.startsWith('dm:')||m.channel==='crew')scheduleOverview();return;}
  if(m.sender===me)return;
  if(m.channel==='global'){overview.unread.global=Math.min(99,(overview.unread.global??0)+1);if(forMe)overview.unread.mentions=Math.min(99,(overview.unread.mentions??0)+1);}
  else if(m.channel===overview.family?.channel)overview.unread.family=Math.min(99,(overview.unread.family??0)+1);
  else if(m.channel.startsWith('dm:')||m.channel==='crew')scheduleOverview(300);
  counts();
 }

 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const name=tab==='notices'?'notices':channelOf(),text=input.value.trim();if(!name||!text||sending)return;
  sending=true;sendButton.disabled=true;note('');
  try{
   if(name==='notices'){await chat.postNews(text,Number(hours.value)||0);input.value='';await load();return;}
   const m=await chat.send(name,text,tab==='global'||tab==='family'?mentionIds(text,picked,me):[]);input.value='';picked.clear();closePicks();
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
 reportButton.onclick=()=>thread&&reportPlayer(thread.otherId,thread.otherName);
 // Gives what a family request card asks for, the same way as Daily sharing does (public/social-ui.js), then refreshes the farm.
 // What it did, or why it was refused, shows in the middle of the chat (public/center-notice.js); the card updates itself.
 async function giveRequest(button){
  if(button.disabled)return;button.disabled=true;
  try{
   const r=await bridge.request({operation:'social',action:{kind:'fulfill',request:button.dataset.give},requestId:crypto.randomUUID()});
   const card=button.closest('.chat-request'),qty=Number(r?.social?.quantity),name=ITEMS[r?.social?.item]?.name,filled=Number(r?.social?.given),needed=Number(r?.social?.needed),full=!(needed>filled);
   showCenterNotice(dialog,qty&&name?(full?`You gave ${qty} ${name}. Your family thanks you!`:`You gave ${qty} ${name}. ${filled} of ${needed} are in.`):r?.social?.message??'Request fulfilled. Your family thanks you!');
   if(full)card?.classList.add('is-given');
   await win.harvestRefresh?.();
  }catch(error){button.disabled=false;showCenterNotice(dialog,error?.message??'That did not work. Please try again.',{refused:true});}
 }
 list.addEventListener('click',event=>{
  if(pressed){pressed=false;return;}   // the tap that ends a long press opened the menu already
  if(event.target.closest('[data-chat-more]')){void loadMore();return;}
  if(event.target.closest('[data-chat-threads]')){void loadThreads();return;}
  const profile=event.target.closest('[data-profile]'),threadButton=event.target.closest('[data-thread]'),more=event.target.closest('[data-more]');
  if(more){openMenu(more.closest('.chat-msg'));return;}
  const give=event.target.closest('[data-give]');
  if(give){giveRequest(give);return;}
  const wiki=event.target.closest('[data-wiki-link]');
  if(wiki){openWiki(wiki.dataset.wikiLink,wiki.dataset.wikiSection);return;}
  if(event.target.closest('[data-app-link]')){openApp();return;}
  const part=event.target.closest('[data-settings-link]');
  if(part){openSettings(part.dataset.settingsLink);return;}
  if(event.target.closest('[data-feedback-link]')){dialog.close();doc.getElementById('feedback-button')?.click();return;}
  if(profile){profiles?.open(profile.dataset.profile,{back:null});return;}
  const start=event.target.closest('[data-start]');
  if(start){const p=found?.players?.find(x=>x.playerId===start.dataset.start);if(!p)return;thread={channel:chat.dmChannel(p.playerId),otherId:p.playerId,otherName:p.username,otherAvatar:p.avatarId};show('private',{keepThread:true});return;}
  if(threadButton&&threadButton.dataset.thread==='crew'){if(!overview?.crew)return;thread={channel:'crew',crew:true,otherName:'Crew'};show('private',{keepThread:true});return;}
  if(threadButton){const t=findThread(threadButton.dataset.thread);if(!t)return;thread={channel:t.channel,otherId:t.otherId,otherName:t.otherName,otherAvatar:t.otherAvatar};show('private',{keepThread:true});return;}
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

 // Mentions (3 Oct 2026, src/chat-rich.js): an "@" in Global or Family opens a list under the box, never in a private chat. Global: the
 // farmers who spoke there lately, and from 2 letters every farmer by name (the same search as Private); Family: its members only, as
 // the database only lets those through. A tap puts "@Full Name" in the text, and the message takes their ids along (at most 3).
 const pickList=form.querySelector('.chat-mentions'),picked=new Map();
 let picks=[],pickAt=null,pickActive=0,pickTimer=null,pickTicket=0,familyPeople=null,recentPeople=null;
 const canMention=()=>(tab==='global'||(tab==='family'&&Boolean(overview?.family)))&&!composeState().blocked;
 function closePicks(){clearTimeout(pickTimer);pickTicket++;picks=[];pickAt=null;pickList.hidden=true;pickList.innerHTML='';input.removeAttribute('aria-activedescendant');}
 // The family name stays as written (translate="no"), but the " · " before it is the game's: outside that span, so the page takes
 // it off like every other middle dot (7 Oct 2026, public/i18n.js undot).
 function drawPicks(text=''){
  pickList.hidden=!picks.length&&!text;
  pickList.innerHTML=text?`<li class="chat-pick-note">${esc(text)}</li>`:picks.map((p,i)=>`<li role="option" id="chat-pick-${i}" class="chat-pick${i===pickActive?' is-active':''}" aria-selected="${i===pickActive}" data-pick="${i}"><span class="chat-avatar">${avatarImage(p.avatarId)}</span><span class="chat-thread-copy"><strong translate="no">${esc(p.username)}</strong><small>${p.level?`Level ${esc(p.level)}`:''}${p.family?.name?`${p.level?' · ':''}<span translate="no">${esc(p.family.name)}</span>`:''}</small></span></li>`).join('');
  if(picks.length)input.setAttribute('aria-activedescendant',`chat-pick-${pickActive}`);else input.removeAttribute('aria-activedescendant');
 }
 // Who spoke here lately, newest first, by their name of now (a farmer who renamed since: the database checks the name of now).
 async function speakers(){
  const ids=[];for(const m of messages)if(m.sender!==me&&(m.kind??'message')==='message'&&!ids.includes(m.sender))ids.push(m.sender);
  const key=ids.slice(0,8).join();if(!key)return [];
  if(recentPeople?.key===key&&Date.now()-recentPeople.at<60000)return recentPeople.list;
  const cards=await chat.cards?.(ids.slice(0,8)).catch(()=>[])??[];
  const list=ids.slice(0,8).map(id=>cards.find(c=>c.playerId===id)).filter(Boolean);recentPeople={key,at:Date.now(),list};return list;
 }
 // The family's members (the same answer as Farm Family's Members), kept two minutes.
 async function members(){
  if(familyPeople&&Date.now()-familyPeople.at<120000)return familyPeople.list;
  try{const data=await bridge.request({operation:'family'});const list=(data?.family?.members??[]).map(x=>({playerId:x.playerId,username:x.username,level:x.level,avatarId:x.avatarId}));familyPeople={at:Date.now(),list};return list;}
  catch{return [];}
 }
 function updatePicks(){
  const at=canMention()?mentionAt(input.value,input.selectionStart??input.value.length,picked.values()):null;
  if(!at){closePicks();return;}
  clearTimeout(pickTimer);pickAt=at;const ticket=++pickTicket,query=at.query.trim(),family=tab==='family';
  if(mentionIds(input.value,picked,me).length>=MAX_MENTIONS){picks=[];drawPicks('Mention up to 3 farmers in one message.');return;}
  const run=async()=>{
   let people=[];
   if(family)people=await members();
   else if(query.length>=2){try{people=(await bridge.request({operation:'player_search',query}))?.players??[];}catch{people=[];}}
   else people=await speakers();
   if(ticket!==pickTicket||!dialog.open)return;
   picks=mentionMatches(people,query,{me,blocked:blocked()});pickActive=0;
   drawPicks(!picks.length&&query.length>=2?'No farmers found. Try another name.':'');refreshArt();
  };
  if(!family&&query.length>=2)pickTimer=setTimeout(run,300);else void run();
 }
 // "Mention" in a message's menu: their name of now (a farmer who renamed since: the database checks the name of now, as for the list),
 // at the end of what is typed, and the box gets the focus so the message can go on from there.
 async function mentionFrom(m){
  if(!canMention())return;
  const card=(await chat.cards?.([m.sender]).catch(()=>[])??[]).find(c=>c?.playerId===m.sender),name=card?.username??m.sender_name;
  if(!name||!canMention())return;
  if(!picked.has(m.sender)&&mentionIds(input.value,picked,me).length>=MAX_MENTIONS){note('Mention up to 3 farmers in one message.');return;}
  const next=appendMention(input.value,name,input.maxLength>0?input.maxLength:200);if(!next)return;
  input.value=next.text;picked.set(m.sender,name);closePicks();input.focus({preventScroll:true});input.setSelectionRange(next.caret,next.caret);
 }
 function pick(i){
  const p=picks[i];if(!p||!pickAt)return;
  const next=insertMention(input.value,input.selectionStart??input.value.length,pickAt.start,p.username);
  input.value=next.text;picked.set(p.playerId,p.username);closePicks();input.focus({preventScroll:true});input.setSelectionRange(next.caret,next.caret);
 }
 input.addEventListener('input',updatePicks);
 input.addEventListener('keydown',event=>{
  if(pickList.hidden)return;
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePicks();return;}
  if(!picks.length)return;
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();pickActive=(pickActive+(event.key==='ArrowDown'?1:picks.length-1))%picks.length;drawPicks();refreshArt();}
  else if(event.key==='Enter'||event.key==='Tab'){event.preventDefault();pick(pickActive);}
 });
 // A tap picks on click (the list goes away then, so the tap never lands on a message under it); the mouse keeps the box's focus.
 pickList.addEventListener('mousedown',event=>event.preventDefault());
 pickList.addEventListener('click',event=>{const row=event.target.closest('[data-pick]');if(row)pick(Number(row.dataset.pick));});
 dialog.addEventListener('close',closePicks);

 // A wiki chip opens How to play at that section in the game (public/game.js harvestWiki), never a new tab (also on CrazyGames and in
 // the app). The way back is How to play's own (wiki-ui.js renderWiki's from): "‹ Chat" in its jump bar, which stays in view, back to
 // this chat as it was; after a link inside the wiki it says "‹ Back" first. One way back, not a second button in the title bar
 // (Oct 2026, merging the wiki links and the chat). No How to play (the farm not ready): nothing.
 function openWiki(topic,section){
  if(typeof win.harvestWiki!=='function'||!doc.getElementById('help-dialog'))return;
  dialog.close();
  win.harvestWiki(topic,section,{from:{label:'Chat',go:()=>{doc.querySelectorAll('dialog[open]').forEach(d=>d.close());if(switchedOff)return;dialog.showModal();dialog.focus({preventScroll:true});show(tab,{keepThread:true});}}});
 }

 // "Get the app" opens /app in a new tab on the website, in the farmer's language (/es/app, ...). In our Android or iPhone app the farmer has it already (the game's own view
 // never goes away to a store page), and CrazyGames allows no links to an app: a short line says so instead.
 function openApp(){
  if(portalOff('app')){showCenterNotice(dialog,'The app is not available on CrazyGames.');return;}
  if(androidApp(win)){showCenterNotice(dialog,'You already have the app: you are playing in it.');return;}
  win.open(`${SITE}${appPath(chosenLanguage())}`,'_blank','noopener');
 }
 // A Settings chip opens Settings at that part (public/game.js harvestSettings); a part this farmer does not have opens the list with
 // a short note (settings-nav.js).
 function openSettings(slug){
  if(typeof win.harvestSettings!=='function')return;
  dialog.close();win.harvestSettings(slug);
 }

 // The little menu on a message: report or block for everyone; delete, mute and ban (the chat only) for the staff.
 const STAFF_ACTIONS=new Set(['edit','delete','mute60','mute1440','ban']);
 let menuEl=null;
 function closeMenu(){menuEl?.remove();menuEl=null;}
 const touch=()=>win.matchMedia?.('(pointer:coarse)').matches;
 function openMenu(row){
  closeMenu();
  const m=row&&messages.find(x=>x.id===row.dataset.id);if(!m)return;
  const mine=m.sender===me,staff=role()!==null,items=[];
  // A long press replaces the phone's own text selection, so the menu can copy the text there.
  if(touch())items.push(['copy','Copy text']);
  if(touch()&&!mine&&String(m.body??'').trim())items.push(['translate','Translate with Google']);
  // No links out on CrazyGames (Oct 2026, public/portal.js), Google's translation included.
  if(portalOff('translate')){const at=items.findIndex(([key])=>key==='translate');if(at>=0)items.splice(at,1);}
  // Mention them without typing (3 Oct 2026): handy for a farmer who never chose a name. Global and Family, as the "@" list.
  if(!mine&&canMention())items.push(['mention',`Mention ${m.sender_name}`]);
  if(!mine)items.push(['report','Report message'],['block',`Block ${m.sender_name}`]);
  if(staff)items.push(['edit','Edit message'],['delete','Delete message']);
  if(staff&&!mine&&!m.sender_staff)items.push(['mute60','Mute 1 hour'],['mute1440','Mute 1 day'],['ban','Ban from chat']);
  if(!items.length)return;
  menuEl=doc.createElement('div');menuEl.className='chat-menu';menuEl.setAttribute('role','menu');
  // Oct 2026: what only the staff can do carries the shield of their Admin and Moderator badge, and one line at the bottom says who
  // has it (the wiki's own heading), only when such an action is in the menu. Farmers never get these, so their menu is as it was.
  const staffOnly=items.some(([key])=>STAFF_ACTIONS.has(key));
  menuEl.innerHTML=items.map(([key,label])=>`<button type="button" role="menuitem" data-menu="${key}"${['block','delete','ban'].includes(key)?' class="is-danger"':''}>${esc(label)}${STAFF_ACTIONS.has(key)?art('admin','chat-menu-shield'):''}</button>`).join('')
   +(staffOnly?`<p class="chat-menu-staff" role="none">${art('admin')}Moderators and the admin</p>`:'');
  row.append(menuEl);menuEl.querySelector('button').focus({preventScroll:true});
  menuEl.onclick=event=>{const key=event.target.closest('[data-menu]')?.dataset.menu;if(!key)return;closeMenu();void act(key,m);};
 }
 dialog.addEventListener('pointerdown',event=>{if(menuEl&&!menuEl.contains(event.target)&&!event.target.closest('[data-more]'))closeMenu();if(!form.contains(event.target))closePicks();});
 // On a phone the "•••" is not shown: a long press on a message (half a second, without moving) opens its menu.
 let pressTimer=null,pressed=false,pressStart=null;
 const endPress=()=>{clearTimeout(pressTimer);pressTimer=null;};
 list.addEventListener('pointerdown',event=>{
  pressed=false;endPress();if(event.pointerType!=='touch')return;
  const row=event.target.closest('.chat-msg');if(!row||event.target.closest('button,a'))return;
  pressStart={x:event.clientX,y:event.clientY};
  pressTimer=setTimeout(()=>{pressTimer=null;pressed=true;openMenu(row);win.navigator?.vibrate?.(10);},500);
 });
 list.addEventListener('pointermove',event=>{if(pressTimer&&Math.hypot(event.clientX-pressStart.x,event.clientY-pressStart.y)>10)endPress();});
 for(const type of ['pointerup','pointercancel','scroll'])list.addEventListener(type,endPress,{passive:true});
 list.addEventListener('contextmenu',event=>{if(touch()&&event.target.closest('.chat-msg'))event.preventDefault();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'&&menuEl){event.preventDefault();closeMenu();}});
 async function act(key,m){
  // A new tab straight from the tap on the menu item, so the browser allows it.
  if(key==='translate'){if(!portalOff('translate'))win.open(translateLink(m.body,chosenLanguage()),'_blank','noopener,noreferrer');return;}
  if(key==='mention'){await mentionFrom(m);return;}
  try{
   if(key==='report'){
    if(!await confirmAction({title:'Report this message?',description:'A moderator will read it. Thank you for keeping the valley friendly.',confirmLabel:'Report',picture:'admin'}))return;
    await chat.report(m.id);note('Thanks, a moderator will take a look.');
   }else if(key==='copy'){await win.navigator.clipboard.writeText(m.body);note('Copied.');setTimeout(()=>note(),1500);}
   else if(key==='block')await setBlock(m.sender,m.sender_name,true);
   else if(key==='edit'){
    // The staff can change a message (to take out a phone number, say) instead of deleting it; the chat rules still apply.
    const body=await promptText({title:'Edit this message',description:m.sender===me?'Everyone sees the new text, marked “edited”.':`Everyone sees the new text, marked “edited by a moderator”.`,value:m.body,maxLength:200,confirmLabel:'Save',picture:'admin'});
    if(body==null||body.trim()===m.body)return;
    messages=withEdit(messages,await chat.editMessage(m.id,body));paint();
   }else if(key==='delete'){
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
 // Report a farmer: the moderators get their latest message you can see.
 async function reportPlayer(id,name){
  if(!await confirmAction({title:`Report ${name}?`,description:'A moderator will read what they wrote to you or in the chat. Thank you for keeping the valley friendly.',confirmLabel:'Report',picture:'admin'}))return false;
  try{await chat.reportPlayer(id);note('Thanks, a moderator will take a look.');return true;}catch(error){note(error.message);return false;}
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
   // Their staff badge (not named role: role() is who you are, used just below; the clash broke every profile, 27 Sep 2026).
   const badge=STAFF_LABELS[status.role]?status.role:status.moderator?'moderator':null;
   if(badge&&heading&&!heading.querySelector('.farmer-mod-badge'))heading.insertAdjacentHTML('beforeend',staffBadge(badge,'farmer-mod-badge'));
   const box=content.querySelector('[data-farmer-chat]');if(!box)return;
   if(id===me){box.hidden=true;return;}
   const staffTools=status.staff&&!status.moderator,admin=role()==='admin';
   const chatState=status.banned?'Chat closed (banned)':status.mutedUntil?`Muted until ${new Date(status.mutedUntil).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}`:'Can chat';
   box.hidden=false;
   box.innerHTML=`<div class="farmer-chat-row">${status.canMessage?`<button type="button" class="primary-button farmer-chat-send" data-chat="message">${art('letter')}Send message</button>`:''}<button type="button" class="small-button farmer-chat-report" data-chat="report">${art('alert')}Report</button><button type="button" class="small-button farmer-chat-report" data-chat="${status.blocked?'unblock':'block'}">${art('block')}${status.blocked?'Unblock':'Block'}</button></div>`
    +(staffTools||(admin&&status.moderator)?`<div class="farmer-mod-tools"><span class="farmer-mod-title">${art('admin')}Moderation${staffTools?` · <b>${esc(chatState)}</b>`:''}</span><div class="farmer-mod-buttons">${staffTools?`<button type="button" class="small-button" data-chat="mute60">Mute 1 hour</button><button type="button" class="small-button" data-chat="mute1440">Mute 1 day</button>${status.banned||status.mutedUntil?'<button type="button" class="small-button" data-chat="lift">Allow chat</button>':'<button type="button" class="small-button is-danger" data-chat="ban">Ban from chat</button>'}`:''}${admin?`<button type="button" class="small-button" data-chat="${status.moderator?'unmod':'mod'}">${status.moderator?'Remove moderator':'Make moderator'}</button>`:''}</div></div>`:'');
   refreshArt();
   box.onclick=async event=>{
    const key=event.target.closest('[data-chat]')?.dataset.chat;if(!key)return;
    const name=player.username,redraw=()=>{statusCache.delete(id);if(isCurrent())decorateProfile(player,content,{isCurrent});};
    try{
     if(key==='message'){open({with:{id,name,avatar:player.avatarId}});return;}
     if(key==='report'){if(await reportPlayer(id,name)){const s=content.ownerDocument.getElementById('farmer-profile-status');if(s)s.textContent='Thanks, a moderator will take a look.';}return;}
     if(key==='block'||key==='unblock'){if(await setBlock(id,name,key==='block'))redraw();return;}
     if(key==='mod'||key==='unmod'){
      // Making a moderator can never happen by accident: the admin types the farmer's name first.
      if(!await confirmAction({title:key==='mod'?`Make ${name} a moderator?`:`Remove ${name} as moderator?`,description:key==='mod'?'They can delete messages, mute and ban farmers from the chat, and open the Moderator dashboard with the player list. They cannot give anything or see IP addresses.':'They become a regular farmer again.',confirmLabel:key==='mod'?'Make moderator':'Remove',picture:'admin',...(key==='mod'?{typeToConfirm:name}:{})}))return;
      await chat.setModerator(id,key==='mod');redraw();return;
     }
     if(await sanction(id,name,key==='ban'?0:Number(key.slice(4)),key==='ban',{lift:key==='lift'}))redraw();
    }catch(error){const status=content.ownerDocument.getElementById('farmer-profile-status');if(status)status.textContent=error.message;}
   };
  }
 }
 profiles?.setChatExtras?.(decorateProfile);

 // Settings, Chat: private messages on or off (the section shows once the chat has answered), and for the admin only a notice for
 // every in-game purchase (supabase/purchase-alerts.sql: the overview says purchaseAlerts true or false to the admin, null to anyone else).
 const privateSwitch=doc.getElementById('chat-private'),privateStatus=doc.getElementById('chat-settings-status');let privateBusy=false;
 const purchaseRow=doc.getElementById('chat-purchases-row'),purchaseSwitch=doc.getElementById('chat-purchases');let purchaseBusy=false;
 function settings(){
  const section=doc.getElementById('chat-settings');if(!section||!privateSwitch||!overview)return;section.hidden=false;if(!privateBusy)privateSwitch.checked=overview.privateOn!==false;
  const admin=typeof overview.purchaseAlerts==='boolean';if(purchaseRow)purchaseRow.hidden=!admin;if(admin&&purchaseSwitch&&!purchaseBusy)purchaseSwitch.checked=overview.purchaseAlerts;
 }
 purchaseSwitch?.addEventListener('change',async()=>{
  const on=purchaseSwitch.checked;purchaseBusy=true;purchaseSwitch.disabled=true;if(privateStatus)privateStatus.textContent='Saving…';
  try{await chat.setPurchaseAlerts(on);overview.purchaseAlerts=on;if(privateStatus)privateStatus.textContent=on?'You get a notice for every in-game purchase.':'No notices for in-game purchases.';}
  catch(error){purchaseSwitch.checked=!on;if(privateStatus)privateStatus.textContent=error.message;}
  finally{purchaseBusy=false;purchaseSwitch.disabled=false;}
 });
 privateSwitch?.addEventListener('change',async()=>{
  const on=privateSwitch.checked;privateBusy=true;privateSwitch.disabled=true;if(privateStatus)privateStatus.textContent='Saving…';
  try{await chat.setPrivate(on);overview.privateOn=on;statusCache.clear();if(privateStatus)privateStatus.textContent=on?'Private messages are on.':'Private messages are off. Nobody can write to you privately.';if(dialog.open)paint();}
  catch(error){privateSwitch.checked=!on;if(privateStatus)privateStatus.textContent=error.message;}
  finally{privateBusy=false;privateSwitch.disabled=false;}
 });

 button.onclick=()=>open();
 // CrazyGames switching the chat off during play: it closes and its button goes (until the next start).
 const stopPortal=bridge.portal?.onSettings?.(()=>{if(portalChat(bridge.portal)!=='off')return;switchedOff=true;button.hidden=true;if(dialog.open)dialog.close();});
 const stop=chat.subscribe(onEvent);
 const ready=refreshOverview();
 // In case the live connection drops without telling: a quiet check every few minutes while the farm is on screen.
 pollTimer=setInterval(()=>{if(!doc.hidden)void refreshOverview();},180000);
 doc.addEventListener('visibilitychange',()=>{if(!doc.hidden&&overview)scheduleOverview(500);});
 win.addEventListener('pagehide',()=>{disposed=true;stop?.();stopPortal?.();clearInterval(pollTimer);clearTimeout(overviewTimer);for(const timer of readTimers.values())clearTimeout(timer);},{once:true});
 return {open,get role(){return role();},whenReady:()=>ready.then(()=>overview)};
}
// The chat button for a guest on CrazyGames (Oct 2026): one small window that says the chat is for players logged in with CrazyGames,
// with their log-in (never opened by itself). Logged in, the farm opens again with the chat (src/crazygames.js).
function chatLogIn({portal,button,doc}){
 const dialog=doc.createElement('dialog');dialog.id='chat-login-dialog';dialog.className='game-dialog portal-chat-gate';dialog.setAttribute('aria-labelledby','chat-login-title');
 dialog.innerHTML='<div class="dialog-heading"><div><span class="eyebrow">CHAT</span><h2 id="chat-login-title">Log in with CrazyGames to chat</h2></div><button type="button" class="icon-button close-dialog" aria-label="Close"><i data-lucide="x"></i></button></div><p>The chat is for farmers who are logged in with CrazyGames. Your farm comes with you.</p><button type="button" class="primary-button" data-portal-login>Log in with CrazyGames</button>';
 doc.body.append(dialog);
 dialog.querySelector('.close-dialog').onclick=()=>dialog.close();
 const login=dialog.querySelector('[data-portal-login]');
 login.onclick=async()=>{login.disabled=true;try{await portal.showAuthPrompt();}finally{login.disabled=false;dialog.close();}};
 // CrazyGames switching the chat off during play: this window and its button go too (Oct 2026 review), as the chat does.
 let off=false;
 function open(){if(off)return;doc.querySelectorAll('dialog[open]').forEach(d=>d.close());dialog.showModal();}
 button.onclick=open;button.hidden=false;button.setAttribute('aria-label','Chat: log in with CrazyGames');
 const stop=portal.onSettings?.(()=>{if(portalChat(portal)!=='off')return;off=true;button.hidden=true;if(dialog.open)dialog.close();});
 doc.defaultView?.addEventListener?.('pagehide',()=>stop?.(),{once:true});
 try{globalThis.lucide?.createIcons?.();}catch{}
 return {open,get role(){return null;},whenReady:async()=>null};
}
