// The staff dashboard's player insights (src/admin-dashboard.js): every farmer in one list with when they were last active, one
// farmer's details, and where new players stop. The data comes from farm-api admin_players and admin_player
// (supabase/functions/farm-api/admin-analytics-service.js); the country, IP address and device are only there for the admin.
// Plain functions that return HTML, so the dashboard only wires them up.
import {avatarImage} from '../public/player-avatars.js';

const DAY=86400000;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=n=>Number(n??0).toLocaleString('en-US');
const time=iso=>{const t=Date.parse(iso);return Number.isFinite(t)?t:null;};
// Every time in the dashboard is Amsterdam time on a 24-hour clock, wherever the device is: the admin and the moderators are in the
// Netherlands (farm-api counts its days the same way, admin-analytics-service.js).
export const ADMIN_ZONE='Europe/Amsterdam';
const at=(options)=>new Intl.DateTimeFormat('en-US',{timeZone:ADMIN_ZONE,hourCycle:'h23',...options});
const DATE_TIME=at({month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),DATE=at({month:'short',day:'numeric',year:'numeric'}),CLOCK=at({hour:'2-digit',minute:'2-digit'});
// "Sep 25, 14:32", "Sep 25, 2026" and "14:32".
export const dateTime=iso=>{const t=time(iso);return t==null?'—':DATE_TIME.format(t);};
const day=iso=>{const t=time(iso);return t==null?'—':DATE.format(t);};
export const clock=iso=>{const t=time(iso);return t==null?'—':CLOCK.format(t);};
// "2026-09-25" and the instant that day began in Amsterdam (summer or winter time), for "Today".
const DAY_KEY=new Intl.DateTimeFormat('en-CA',{timeZone:ADMIN_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const PARTS=at({year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
const offset=ms=>{const p=Object.fromEntries(PARTS.formatToParts(ms).map(x=>[x.type,x.value]));return Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(ms/1000)*1000;};
export const zoneDay=ms=>DAY_KEY.format(ms);
export const zoneMidnight=ms=>{const start=Date.parse(`${zoneDay(ms)}T00:00:00Z`);return start-offset(start-offset(start));};
export const ago=(iso,now=Date.now())=>{const t=time(iso);if(t==null)return 'never';const m=Math.floor((now-t)/60000);return m<1?'just now':m<60?`${m}m ago`:m<1440?`${Math.floor(m/60)}h ago`:`${Math.floor(m/1440)}d ago`;};
const PROVIDERS={email:'Email',google:'Google',facebook:'Facebook'};
export const provider=id=>PROVIDERS[id]??String(id??'Email');
let regions=null;
try{regions=new Intl.DisplayNames(['en'],{type:'region'});}catch{}
// "🇳🇱 Netherlands" from "NL" (the country of the device's time zone).
export function country(code){
 if(!/^[A-Z]{2}$/.test(code??''))return null;
 let name=code;try{name=regions?.of(code)??code;}catch{}
 return `${String.fromCodePoint(...[...code].map(c=>0x1F1E6+c.charCodeAt(0)-65))} ${name}`;
}
const face=p=>`<span class="admin-avatar${p.avatarId?' has-face':''}">${p.avatarId?avatarImage(p.avatarId):esc(String(p.username??'?').slice(0,2).toUpperCase())}${p.online?'<span class="online-dot is-online" aria-hidden="true"></span>':''}</span>`;
const name=p=>p.username??(p.everPlayed?'Unnamed':'Never opened a farm');

// The list: a filter, a search box (name, and for the admin also country and IP) and an order.
export const PLAYER_FILTERS=Object.freeze([['all','All'],['online','Online'],['today','Today'],['week','This week'],['quiet','Gone quiet'],['new','New'],['never','Never played']]);
export const PLAYER_SORTS=Object.freeze([['active','Last action'],['new','Newest'],['level','Level'],['days','Days played']]);
export function filterPlayers(players,{filter='all',search='',sort='active'}={},now=Date.now()){
 const midnight=zoneMidnight(now),active=p=>time(p.lastActiveAt)??-Infinity,joined=p=>time(p.createdAt)??-Infinity;
 const keep={all:()=>true,online:p=>p.online,today:p=>active(p)>=midnight,week:p=>active(p)>=now-7*DAY,
  quiet:p=>p.everPlayed&&active(p)<now-7*DAY,new:p=>joined(p)>=now-7*DAY,never:p=>!p.everPlayed}[filter]??(()=>true);
 const words=search.trim().toLowerCase();
 const found=p=>!words||[p.username,p.ip,p.country,country(p.country),provider(p.provider),p.family].some(v=>String(v??'').toLowerCase().includes(words));
 const order={active:(a,b)=>active(b)-active(a),new:(a,b)=>joined(b)-joined(a),level:(a,b)=>(b.level??0)-(a.level??0),days:(a,b)=>b.daysPlayed-a.daysPlayed}[sort]??((a,b)=>active(b)-active(a));
 return players.filter(p=>keep(p)&&found(p)).sort((a,b)=>order(a,b)||joined(b)-joined(a));
}
// One row: face, name and chips; level, days played, guide step and family; joined, sign-in, country and IP; at the end when they last
// did something (online: "Online" with the time of the last action under it).
export function playerRow(p,{guideSteps=10,now=Date.now()}={}){
 const facts=p.everPlayed?[`Level ${number(p.level)}`,`${number(p.daysPlayed)} day${p.daysPlayed===1?'':'s'} played`,p.guide>=guideSteps?'Guide done':`Guide ${number(p.guide)}/${guideSteps}`,p.family&&esc(p.family)]:['Never opened a farm'];
 const where=[`Joined ${esc(dateTime(p.createdAt))}`,provider(p.provider),country(p.country),p.ip&&`IP ${esc(p.ip)}`].filter(Boolean);
 return `<li><button type="button" class="admin-player-row" data-player="${esc(p.playerId)}">${face(p)}<span class="admin-recent-copy"><strong>${esc(name(p))}${p.vip?' <b class="admin-chip is-vip">VIP</b>':''}</strong><small>${facts.filter(Boolean).join(' · ')}</small><small>${where.join(' · ')}</small></span><span class="admin-last-active${p.online?' is-online':''}"><b>${p.online?'Online':esc(ago(p.lastActiveAt,now))}</b><time datetime="${esc(p.lastActiveAt??'')}" title="Last action (Amsterdam time)">${p.online?`Last action ${esc(clock(p.lastActiveAt))} (${esc(ago(p.lastActiveAt,now))})`:esc(dateTime(p.lastActiveAt))}</time></span></button></li>`;
}

// One farmer. The other accounts that last played from the same IP address are listed for the staff (a shared home, school or phone
// network, or one person with a second account, for example to dodge a chat ban); the address itself only for the admin.
const PURCHASE={credited:'Paid',test_paid:'Test payment',pending:'Checkout opened, not paid'};
const pack=id=>id==='starter'?'Starter Pack':`${number(id)} diamonds`;
const fact=(label,value)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
export function playerDetail(p,{guideSteps=[],now=Date.now()}={}){
 const since=iso=>time(iso)==null?'—':`${esc(dateTime(iso))} <small>(${esc(ago(iso,now))})</small>`;
 const next=guideSteps[p.guide],sameNetwork=p.sameNetwork;
 const guide=!p.everPlayed?'—':p.guide>=p.guideTotal?'Finished':`Step ${number(p.guide)} of ${p.guideTotal}${next?` <small>(next: ${esc(next)})</small>`:''}`;
 const account=[
  fact('Joined',`${esc(day(p.createdAt))} <small>(${esc(ago(p.createdAt,now))})</small>`),
  fact('Last action',`${p.online?'<b class="admin-paid">Online now</b> · ':''}${since(p.lastActiveAt)}`),
  fact('Last sign-in',since(p.lastSignInAt)),
  fact('Signs in with',`${provider(p.provider)}${p.provider==='email'?` <small>(email ${p.emailBonus?'confirmed':'not confirmed'})</small>`:''}`),
  fact('Days played',`${number(p.daysPlayed)} <small>(streak ${number(p.streak)}, best ${number(p.bestStreak)})</small>`),
  ...('ip' in p?[fact('Country',esc(country(p.country)??'Not known yet')),fact('IP address',p.ip?esc(p.ip):'—'),
   fact('Device',p.device?`<span title="${esc(p.userAgent??'')}">${esc(p.device)}</span>`:'—')]:[]),
  fact('Same network as',!sameNetwork?'Not known':sameNetwork.length?sameNetwork.map(o=>`<button type="button" class="admin-link" data-player="${esc(o.playerId)}">${esc(name(o))}</button>`).join(', '):'Nobody else')
 ].join('');
 const progress=[
  fact('Level',`${number(p.level)} <small>(${number(p.xp)} XP)</small>`),fact('Coins',number(p.coins)),fact('Diamonds',number(p.diamonds)),
  fact('Fields',number(p.fields)),fact('Buildings',number(p.buildings)),fact('Beginner guide',guide),
  fact('Farm family',p.family?`${esc(p.family.name)} <small>(${esc(p.family.role)})</small>`:'None'),
  fact('VIP',p.vipUntil?`Until ${esc(day(p.vipUntil))}`:'No'),
  ...(p.starter?[fact('Starter Pack',p.starter.bought?'Bought':p.starter.offeredAt?`Offered ${esc(day(new Date(p.starter.offeredAt).toISOString()))}, not bought`:'Not offered yet')]:[])
 ].join('');
 const busiest=[...p.activity].sort((a,b)=>b.count-a.count),top=Math.max(1,busiest[0]?.count??0);
 const activity=busiest.map(a=>`<li><span>${esc(a.label)}</span><i aria-hidden="true"><b style="width:${Math.round(a.count/top*100)}%"></b></i><strong>${number(a.count)}</strong></li>`).join('');
 const purchases=!p.purchases?'':p.purchases.length?p.purchases.map(b=>`<li><span>${pack(b.pack)} · €${b.euros.toFixed(2)}${b.test?' <small>(test)</small>':''}</span><b class="${b.status==='credited'?'admin-paid':'admin-pending-pay'}">${esc(PURCHASE[b.status]??b.status)}</b><small>${esc(dateTime(b.createdAt))}</small></li>`).join(''):'<li class="admin-empty">No purchases or checkouts.</li>';
 const chat=[p.chat.messages==null?null:`${number(p.chat.messages)} message${p.chat.messages===1?'':'s'} in the last 30 days`,p.chat.reported?`reported ${number(p.chat.reported)} time${p.chat.reported===1?'':'s'}`:'never reported',p.chat.banned?'<b class="admin-log-open">banned from chat</b>':p.chat.muted?'<b class="admin-log-open">muted</b>':null].filter(Boolean).join(' · ');
 const social=[
  fact('Farm events',`${number(p.events.joined)} joined · ${number(p.events.finished)} finished · ${number(p.events.diamonds)} diamonds won`),
  fact('Chat',chat),
  fact('Invites',`${p.invites.invitedBy?`Invited by ${esc(p.invites.invitedBy)} · `:''}${number(p.invites.friends)} friend${p.invites.friends===1?'':'s'} invited${p.invites.friends?` (${number(p.invites.qualified)} reached level 10)`:''}`),
  fact('Earned in total',`${number(p.earned.coins)} coins · ${number(p.earned.diamonds)} diamonds`)
 ].join('');
 return `<div class="admin-detail-top"><button type="button" class="small-button" data-player-back>‹ All players</button><button type="button" class="small-button" data-open-profile="${esc(p.playerId)}">Open profile</button><button type="button" class="small-button" data-gift-player="${esc(p.playerId)}">Send a gift</button></div>`
  +`<div class="admin-detail-head">${face(p)}<div><h3>${esc(name(p))}${p.vipUntil?' <b class="admin-chip is-vip">VIP</b>':''}</h3><small>${p.everPlayed?`Level ${number(p.level)} · `:''}${p.online?'Online now':`Last action ${esc(ago(p.lastActiveAt,now))}`}</small></div></div>`
  +`<h4>Account</h4><dl class="admin-facts">${account}</dl><h4>Progress</h4><dl class="admin-facts">${progress}</dl>`
  +`<h4>What they do</h4><ul class="admin-bars">${activity}</ul>`
  +(p.purchases?`<h4>Purchases</h4><ul class="admin-recent-list admin-purchases">${purchases}</ul>`:'')
  +`<h4>Events, chat and friends</h4><dl class="admin-facts">${social}</dl>`
  +'<p class="admin-hint">Times are Amsterdam time. Last action is the last time the farm saved. Days played counts the days the daily gift was opened. Same network: the accounts that last played from the same IP address; a home, school or phone network is often shared, so it is a hint, not proof. Open profile for a gift or the chat buttons.</p>';
}

// Where new players stop: of everyone who made an account in the period, how many got how far. The guide steps follow
// BEGINNER_QUESTS (game/farm-state.js); a guided farm sells an egg at step 7 where an older farm does a chore.
export const GUIDE_STEPS=Object.freeze(['First harvest','First sale','Plant wheat','Water a crop','Start production','Daily gift','A chore or an egg sale','Care for a crop','Harvest wheat','Collect goods and the guide reward']);
export const FUNNEL_PERIODS=Object.freeze([['7','Last 7 days'],['30','Last 30 days'],['all','Everyone']]);
const LEVEL_NOTES={10:'farm events open',14:'Starter Pack and diamond boosts'};
export function funnel(players,period='7',now=Date.now()){
 const since=period==='all'?-Infinity:now-Number(period)*DAY,group=players.filter(p=>(time(p.createdAt)??-Infinity)>=since),total=group.length;
 const step=(label,count,note=null)=>({label,count,total,pct:total?Math.round(count/total*100):0,note});
 const rows=[step('Made an account',total),step('Opened their farm',group.filter(p=>p.everPlayed).length),
  ...GUIDE_STEPS.map((label,i)=>step(`Guide ${i+1}: ${label}`,group.filter(p=>p.guide>i).length)),
  ...[3,5,10,14].map(level=>step(`Level ${level}`,group.filter(p=>(p.level??0)>=level).length,LEVEL_NOTES[level]??null))];
 let worst=0;
 for(let i=1;i<rows.length;i++)if(rows[i-1].count-rows[i].count>(worst?rows[worst-1].count-rows[worst].count:0))worst=i;
 if(worst)rows[worst].worst=true;
 // "Came back": still active N days after joining, only for players who joined at least N days ago (based on their last activity).
 const back=[1,3,7].map(days=>{
  const old=group.filter(p=>now-(time(p.createdAt)??now)>=days*DAY),kept=old.filter(p=>(time(p.lastActiveAt)??-Infinity)>=time(p.createdAt)+days*DAY).length;
  return {label:`Came back after ${days} day${days===1?'':'s'}`,count:kept,total:old.length,pct:old.length?Math.round(kept/old.length*100):0};
 });
 return {total,rows,back};
}
export function funnelHtml({total,rows,back}){
 if(!total)return '<li class="admin-empty">Nobody made an account in this period.</li>';
 const bar=r=>`<li${r.worst?' class="is-worst"':''}><span>${esc(r.label)}${r.note?` <small>${esc(r.note)}</small>`:''}${r.worst?' <b class="admin-chip is-drop">Biggest drop</b>':''}</span><i aria-hidden="true"><b style="width:${r.pct}%"></b></i><strong title="${number(r.count)} of ${number(r.total)}">${r.pct}%<small>${number(r.count)}</small></strong></li>`;
 return rows.map(bar).join('')+'<li class="admin-funnel-split">Coming back</li>'+back.map(bar).join('');
}

// Where players come from (admin only): the country of each device's time zone at the last visit, most first.
export function countryCounts(players){
 const counts=new Map();let unknown=0;
 for(const p of players){if(!p.everPlayed)continue;if(p.country)counts.set(p.country,(counts.get(p.country)??0)+1);else unknown++;}
 return {rows:[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([code,count])=>({code,count})),unknown};
}
export function countriesHtml({rows,unknown}){
 const top=Math.max(1,rows[0]?.count??0);
 const list=rows.slice(0,12).map(r=>`<li><span>${esc(country(r.code))}</span><i aria-hidden="true"><b style="width:${Math.round(r.count/top*100)}%"></b></i><strong>${number(r.count)}</strong></li>`).join('');
 return (list||'<li class="admin-empty">No countries yet: they fill in as farmers open the game.</li>')+(unknown?`<li class="admin-funnel-split">${number(unknown)} not seen since countries were added</li>`:'');
}

// A staff gift to whom (supabase/staff-gift-audience.sql decides the list when it is sent; these are the same rules, for the counts on
// the screen): everyone, the farmers active in the last 7 days, the farmers online now (the online dot) or one farmer.
export const GIFT_AUDIENCES=Object.freeze([['all','Everyone'],['active','Active this week'],['online','Online now'],['player','One farmer']]);
const WEEK_MS=7*86400000;
export function giftCount(players,audience,now=Date.now()){
 const list=players??[];
 if(audience==='active')return list.filter(p=>now-Date.parse(p.lastActiveAt)<WEEK_MS).length;
 if(audience==='online')return list.filter(p=>p.online).length;
 if(audience==='player')return 1;
 return list.length;
}
// Farmers whose name contains what was typed, most recently active first (names are not unique: the level tells two apart).
export function giftMatches(players,query,limit=6){
 const q=String(query??'').trim().toLowerCase();if(!q)return [];
 return (players??[]).filter(p=>p.username&&p.username.toLowerCase().includes(q))
  .sort((a,b)=>(Date.parse(b.lastActiveAt)||0)-(Date.parse(a.lastActiveAt)||0)).slice(0,limit);
}
export function giftLabel(audience,{count=null,player=null}={}){
 const n=count==null?'':`${number(count)} `,farmers=count===1?'farmer':'farmers';
 if(audience==='active')return `Send to ${n}${farmers} active this week`;
 if(audience==='online')return `Send to ${n}${farmers} online now`;
 if(audience==='player')return player?`Send to ${player.username}`:'Choose a farmer first';
 return 'Send to everyone';
}
