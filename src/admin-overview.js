// The Admin dashboard's tabs, its Overview and its quick actions (22 Oct 2026, the owner picked "restructure + refresh"): plain rules and
// numbers, so src/admin-dashboard.js only draws them and the tests can check them without a page.
//   Tabs: Overview, Players, Growth, Money, Chat, Feedback, Messages, Settings. A moderator sees Players, Chat and Feedback only, and the
//   dashboard never asks farm-api or the database for what is on the other tabs (the server says no to most of it anyway).
//   Overview (the admin only): today in UTC, as every time in the dashboard (src/admin-players.js ADMIN_ZONE): new players today, online
//   now, open chat reports, new feedback, day-1 retention, and what was earned today and in 7 days. All from the operations the dashboard
//   already loads (admin_online, admin_retention, admin_purchases, chat reports, feedback): no new server call.
//   Quick actions (the admin only): each opens its tab at its card.
import {zoneMidnight,zoneDay} from './admin-players.js';

export const TABS=Object.freeze(['overview','players','growth','money','chat','feedback','messages','settings']);
// What a moderator sees; everything else is the admin's.
export const STAFF_TABS=Object.freeze(['players','chat','feedback']);
export const ADMIN_TABS=Object.freeze(TABS.filter(tab=>!STAFF_TABS.includes(tab)));
export const tabsFor=role=>role==='admin'?[...TABS]:role==='moderator'?[...STAFF_TABS]:[];
// The tab a window opens on: the Overview for the admin, the chat for a moderator (what they come for).
export const firstTab=role=>role==='admin'?'overview':'chat';
// The farm-api parts the dashboard loads on every refresh: Players for every staff member; Retention and Invites (Growth, and the
// Overview's numbers) for the admin only.
export const PARTS=Object.freeze([['admin_online','Online now'],['admin_players','All players'],['admin_retention','Retention'],['admin_invites','Invites']]);
export const STAFF_PARTS=Object.freeze(['admin_online','admin_players']);
export const partsFor=role=>PARTS.filter(([operation])=>role==='admin'||STAFF_PARTS.includes(operation));

// The quick actions: the tab, the card to show and, where it helps, the field to start typing in.
export const QUICK_ACTIONS=Object.freeze({
 news:{tab:'messages',card:'admin-chat-settings',focus:'admin-news-text'},
 gift:{tab:'messages',card:'admin-donate',audience:'all',focus:'admin-donate-diamonds'},
 offer:{tab:'money',card:'admin-offers'},
 reload:{tab:'settings',card:'admin-reload'},
 mail:{tab:'messages',card:'admin-news-mail',focus:'admin-mail-subject'}
});

const time=iso=>{const t=Date.parse(iso);return Number.isFinite(t)?t:null;};
const DAY=86400000;
// Earned: paid checkouts of real farmers (the same rule as the Purchases totals, farm-api handleAdminPurchases: credited and live), by
// the moment they were paid (else when the checkout opened). Today is since 00:00 UTC; 7 days is today and the 6 days before.
export function earned(purchases,now=Date.now()){
 const today=zoneMidnight(now),week=today-6*DAY,sum={todayCents:0,todayPaid:0,weekCents:0,weekPaid:0};
 for(const p of purchases??[]){
  if(p?.status!=='credited'||p.live===false)continue;
  const at=time(p.creditedAt)??time(p.createdAt);if(at==null)continue;
  const cents=Number(p.amountCents)||0;
  if(at>=week){sum.weekCents+=cents;sum.weekPaid++;}
  if(at>=today){sum.todayCents+=cents;sum.todayPaid++;}
 }
 return sum;
}
// New feedback: the open messages, and how many of them came in today (UTC).
export function feedbackToday(list,now=Date.now()){
 const today=zoneMidnight(now),open=Array.isArray(list)?list:[];
 return {open:open.length,today:open.filter(f=>(time(f?.createdAt)??-Infinity)>=today).length};
}
// Day 1: of the last week's signups, how many came back the next day (farm-api sends retention.kpi; an older one only the rows).
export function dayOne(retention){
 const rows=retention?.rows??[],kept=retention?.kpi?.day1??rows.map(r=>r.days?.[1]).filter(Boolean).reduce((s,d)=>({retained:s.retained+d.retained,total:s.total+d.total}),{retained:0,total:0});
 return kept.total?Math.round(kept.retained/kept.total*100):null;
}
export const euro=cents=>`€${(Number(cents??0)/100).toFixed(2)}`;
// The tiles' numbers as they show; null where the part did not load (the tile then shows "–").
export function overviewTiles({online=null,retention=null,reports=null,feedback=null,purchases=null}={},now=Date.now()){
 const day1=retention?dayOne(retention):null,fb=feedback?feedbackToday(feedback,now):null,money=purchases?earned(purchases,now):null;
 return {
  online:online?Number(online.count??0):null,
  new:retention?Number(retention.kpi?.today??retention.rows?.find(r=>r.day===zoneDay(now))?.size??0):null,
  day1,reports:Array.isArray(reports)?reports.length:null,feedback:fb?.open??null,feedbackToday:fb?.today??null,
  revenueToday:money?money.todayCents:null,paidToday:money?money.todayPaid:null,revenueWeek:money?money.weekCents:null,paidWeek:money?money.weekPaid:null
 };
}
// The search at the top: farmers whose name holds what was typed, the most recently active first (names are not unique: the level and
// the last action tell two apart). Names only, for the admin and the moderators alike.
export function searchPlayers(players,query,limit=8){
 const q=String(query??'').trim().toLowerCase();if(!q)return [];
 return (players??[]).filter(p=>p?.username&&p.username.toLowerCase().includes(q))
  .sort((a,b)=>(a.username.toLowerCase().startsWith(q)?0:1)-(b.username.toLowerCase().startsWith(q)?0:1)||(time(b.lastActiveAt)??0)-(time(a.lastActiveAt)??0)).slice(0,limit);
}
