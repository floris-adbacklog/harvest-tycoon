// The admin view (3 Oct 2026): an admin account plays nothing (farm-api locks every action), so it opens a showcase farm (farm-state.js
// createShowcaseFarm, level 999) and gets a topbar and a menu it can use. The topbar shows the farmers online now and the open chat
// reports instead of coins and diamonds; the menu is My farm, How to play, Chat, Admin panel and More, on a phone and on a computer.
// The beginner guide, the tools and the crop picker step aside (public/admin-view.css, every rule under html[data-admin-view]).
// farm-api says which farm this is (adminView on the load); src/game-cloud.js marks the page before it shows (markAdminView), never on
// CrazyGames. Staff screens stay English (scripts/i18n-extract.mjs skips admin-*.js); the menu names the game already has are
// translated as everywhere. farm.html is the same for everyone: all of this is made here.
import {art} from '../public/visual-icons.js';
// [key, name, picture, the button it presses]: the existing buttons do the work (the topbar's own are hidden in this view).
export const ADMIN_TOOLS=Object.freeze([['help','How to play','guide','help-button'],['chat','Chat','chat','chat-button'],['admin','Admin panel','admin','admin-button']].map(Object.freeze));
// Both numbers come straight from the database (no Edge Function): once a minute while the page is in view, and on coming back to it.
export const ADMIN_REFRESH_MS=60000;
export const ONLINE_MINUTES=30;
// A number that does not come within 15 s shows "–" and the next minute asks again; the showcase farm is built again every hour and
// after midnight (UTC), so a tab left open never shows ripe fields, ready batches or a new day's tasks.
export const ADMIN_WAIT_MS=15000,SHOWCASE_RELOAD_MS=3600000;
export function markAdminView(doc=document){
 doc.documentElement.dataset.adminView='';
 const style=doc.createElement('link');style.rel='stylesheet';style.href='/admin-view.css';doc.head.append(style);
}
// "37", or "–" while unknown or when it could not be read (a password session has no admin powers: the reports answer "Not authorized").
export const statText=n=>Number.isFinite(n)?n.toLocaleString('en-US'):'–';
const inTime=(ask,win)=>new Promise((resolve,reject)=>{const timer=win.setTimeout(()=>reject(new Error('No answer.')),ADMIN_WAIT_MS);Promise.resolve().then(ask).then(resolve,reject).finally(()=>win.clearTimeout(timer));});
export function startAdminView({bridge,doc=document,win=window}){
 const $=id=>doc.getElementById(id);
 // The admin's powers come with a Google session (src/admin-dashboard.js role); a password session has the view without them.
 const powers=()=>Boolean(win.harvestStaff?.role?.());
 // The topbar: two numbers in place of coins and diamonds. A tap opens the Admin dashboard there (src/admin-dashboard.js open); without
 // the powers the numbers are only numbers. The captions stay English, as the staff screens do.
 const stat=(id,picture,caption,label,tab)=>{const b=doc.createElement('button');b.type='button';b.id=id;b.className='admin-stat';b.dataset.label=label;b.title=label;b.setAttribute('aria-label',label);b.setAttribute('aria-disabled','true');b.innerHTML=`${art(picture)}<span><strong>–</strong><small translate="no">${caption}</small></span>`;b.onclick=()=>{if(powers())win.harvestStaff.open?.(tab);};return b;};
 const online=stat('admin-online-stat','family-members','online',`Farmers online now (last ${ONLINE_MINUTES} minutes)`,'players'),reports=stat('admin-reports-stat','alert','open reports','Open chat reports','chat');
 doc.querySelector('.topbar .resources')?.prepend(online,reports);
 const show=(button,n)=>{button.querySelector('strong').textContent=statText(n);button.classList.toggle('has-reports',button===reports&&Number.isFinite(n)&&n>0);button.setAttribute('aria-label',Number.isFinite(n)?`${button.dataset.label}: ${statText(n)}`:button.dataset.label);};
 // The menu: three buttons after My farm, in the side tools' own look; More stays last.
 let after=$('farm-button');
 for(const [key,name,picture] of ADMIN_TOOLS){
  const b=doc.createElement('button');b.type='button';b.className='side-tool';b.id=`admin-${key}-tool`;b.dataset.adminTool=key;if(key!=='help')b.setAttribute('aria-haspopup','dialog');
  b.innerHTML=`<span>${art(picture)}${key==='chat'?'<em hidden></em>':''}</span><b>${name}</b>`;b.title=name;
  b.onclick=()=>$(ADMIN_TOOLS.find(t=>t[0]===key)[3])?.click();
  if(after)after.after(b);after=b;
 }
 // Chat and Admin panel are there when their topbar buttons are (the chat once it has loaded, the dashboard for staff), with the
 // chat's unread count.
 let hadPowers=false;
 function mirror(){
  const on=powers();
  for(const b of [online,reports]){b.setAttribute('aria-disabled',String(!on));if(on)b.setAttribute('aria-haspopup','dialog');else b.removeAttribute('aria-haspopup');}
  // The powers arrive after the view starts: the reports are asked for at once.
  if(on!==hadPowers){hadPowers=on;void refresh();}
  for(const [key,,,source] of ADMIN_TOOLS.slice(1)){const tool=$(`admin-${key}-tool`),from=$(source);if(tool)tool.hidden=!from||from.hidden;}
  const dot=$('chat-dot'),pill=$('admin-chat-tool')?.querySelector('em');
  if(pill){pill.hidden=!dot||dot.hidden;pill.textContent=dot?.textContent??'';}
  const chat=$('chat-button');if(chat)$('admin-chat-tool')?.setAttribute('aria-label',chat.getAttribute('aria-label')??'Open chat');
 }
 // The numbers: farmers active in the last 30 minutes (bridge.onlineCount, the same rule as the dashboard's Online now) and the open
 // reports (the same list as the dashboard's Chat reports; only with the powers, else "Not authorized" every minute). A refresh asked
 // for while one runs follows it.
 let busy=false,again=false,built=Date.now(),day=new Date(built).getUTCDate();
 async function refresh(){
  if(doc.hidden)return;if(busy){again=true;return;}busy=true;
  try{
   const [count,list]=await Promise.allSettled([inTime(()=>bridge.onlineCount(),win),powers()?inTime(()=>bridge.chat.reports(),win):Promise.reject(new Error('Not authorized.'))]);
   show(online,count.status==='fulfilled'?Number(count.value):NaN);
   show(reports,list.status==='fulfilled'&&Array.isArray(list.value)?list.value.length:NaN);
  }finally{busy=false;if(again){again=false;void refresh();}}
  // The showcase again (farm-client.js harvestRefresh: one load, which answers with the showcase): every hour and after midnight.
  const now=Date.now();if(now-built>=SHOWCASE_RELOAD_MS||new Date(now).getUTCDate()!==day){built=now;day=new Date(now).getUTCDate();void Promise.resolve().then(()=>win.harvestRefresh?.()).catch(()=>{});}
 }
 const watch=new win.MutationObserver(mirror);
 for(const id of ['chat-button','chat-dot','admin-button'])if($(id))watch.observe($(id),{attributes:true,attributeFilter:['hidden','aria-label'],childList:true,characterData:true,subtree:true});
 mirror();
 // A report handled in the dashboard shows here as soon as it closes.
 const dashboard=$('admin-dashboard-dialog'),onClose=()=>void refresh();dashboard?.addEventListener('close',onClose);
 const timer=win.setInterval(refresh,ADMIN_REFRESH_MS),onVisible=()=>{if(!doc.hidden)void refresh();};
 doc.addEventListener('visibilitychange',onVisible);
 win.addEventListener('pagehide',()=>{win.clearInterval(timer);watch.disconnect();doc.removeEventListener('visibilitychange',onVisible);dashboard?.removeEventListener('close',onClose);},{once:true});
 if(!hadPowers)void refresh();
 return {refresh,mirror};
}
