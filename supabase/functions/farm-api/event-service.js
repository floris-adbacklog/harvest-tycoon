import {writeLog,eventRewardLog,accountLog} from './player-log.js';
import {isSuperadmin,isAdminAccount,isAdminAddress} from './admin-service.js';
import {validEmail} from './account-form.js';
import {codeTexts,playerLanguage,RTL_MAIL} from './mail-text.js';
import {EVENT_LEAGUES,eventLeague} from './farm-state.js';
// The goals an event may use: the 24 Sep list (farm-wide counters, crops unlocked by level 9, eggs) and the 30 kinds of the mixed
// events (supabase/live-events-mixed.sql), all open to every farm at level 15, when events open. Since 26 Sep 2026 the pool has
// "Sell wheat" instead of "Use a boost" (supabase/live-events-sell-wheat.sql); boosts_used stays valid for events made by hand.
export const EVENT_STATS=['harvested','produced','watered','tended','chores','deliveries','harvest_wheat','harvest_corn','harvest_lettuce','harvest_barley','harvest_greenbeans','harvest_cabbage','made_eggs',
 'planted','sold','earned','coins_spent','diamonds_spent','activities','upgrades','made_feed','made_milk','made_cheese','made_flour','fertilized','harvest_cauliflower','made_grainmeal','made_bread','parallel_batches','boosts_used','activity_rounds','sold_wheat'];
export function validateEvent(config,now=Date.now()){
 if(!config||typeof config.title!=='string'||config.title.trim().length<3||config.title.length>80||typeof config.description!=='string'||config.description.length>500)throw Error('Enter a title (3–80 characters) and description (up to 500).');
 const start=Date.parse(config.starts_at),end=Date.parse(config.ends_at);
 if(!Number.isFinite(start)||!Number.isFinite(end)||start<now||end-start<3600000||end-start>12*3600000)throw Error('Schedule a future event lasting 1–12 hours.');
 const objectives=config.objectives;
 if(!Array.isArray(objectives)||objectives.length<1||objectives.length>4||new Set(objectives.map(o=>o.stat)).size!==objectives.length||objectives.some(o=>!EVENT_STATS.includes(o.stat)||!Number.isInteger(o.target)||o.target<1||o.target>10000))throw Error('Choose 1–4 unique objectives with whole targets from 1 to 10,000.');
 const rewards=config.rewards;
 for(const [key,min,max] of [['coins',0,300],['diamondMin',0,1],['diamondMax',1,3],['participantStep',10,1000],['poolCap',0,200]])if(!Number.isInteger(rewards?.[key])||rewards[key]<min||rewards[key]>max)throw Error(`Set ${key} between ${min} and ${max}.`);
 return {title:config.title.trim(),description:config.description,starts_at:new Date(start).toISOString(),ends_at:new Date(end).toISOString(),active:config.active===true,objectives:objectives.map(({stat,target})=>({stat,target})),rewards:Object.fromEntries(['coins','diamondMin','diamondMax','participantStep','poolCap'].map(k=>[k,rewards[k]]))};
}
const DAY_MS=86400000,TOP=10;
// The first three farmers to finish win a podium prize on top of the usual reward, and every later finisher a small extra
// (same numbers as harvest_event_settle, live-events-bigger-prizes.sql). Diamonds are a fixed prize per place, nothing else; coins
// come on top of the event's own coins. Every event diamond is paid out: no daily limit since 28 Sep 2026.
export const PODIUM=Object.freeze([{coins:2000,diamonds:50},{coins:1000,diamonds:30},{coins:500,diamonds:20}]);
export const FINISHER_PRIZE=Object.freeze({coins:100,diamonds:5});
// The event's top 10, ranked the way settlement pays (live-events.sql): finished farmers first, earliest finish
// first (the finish time is frozen), then everyone else by how far along they are. Rewards follow the same formula
// as harvest_event_settle — exact once settled, "if it ended now" while the event runs. Since 1 Oct 2026 the rows are one
// league's (live-event-leagues.sql): the podium is that league's, and its coins are × the league's number.
export function eventStandings(event,rows,now=Date.now(),league=EVENT_LEAGUES[0]){
 const settled=Boolean(event.settled_at),goals=event.leagues?.[league.index]?.objectives??event.objectives;   // the league's own goals
 const share=r=>goals.reduce((sum,o)=>sum+Math.min(1,(r.progress?.[o.stat]??0)/o.target),0)/goals.length;
 // Every goal full is finished (30 Sep 2026; it also took 3 contributions over 10 minutes before), the earliest first.
 const finished=r=>settled?r.qualified:goals.every(o=>(r.progress?.[o.stat]??0)>=o.target);
 const at=r=>Date.parse(r.last_at);
 const ranked=rows.map(r=>({...r,done:finished(r),share:share(r)})).sort((a,b)=>Number(b.done)-Number(a.done)||(a.done?at(a)-at(b)||String(a.player_id).localeCompare(String(b.player_id)):b.share-a.share||at(a)-at(b)));
 const {coins}=event.rewards;
 return ranked.map((r,i)=>({rank:i+1,playerId:r.player_id,finished:r.done,progress:Math.round(r.share*100),
  coins:settled?r.coins:r.done?(coins+(PODIUM[i]??FINISHER_PRIZE).coins)*league.coins:0,diamonds:settled?r.diamonds:r.done?(PODIUM[i]??FINISHER_PRIZE).diamonds:0,podium:r.done&&i<PODIUM.length}));
}
// The standings the farmer sees are their own league's: the league they finished in, or the one their level puts them in now.
async function standings(admin,event,user,now){
 const rows=await admin.rpc('harvest_event_board',{p_event:event.id});
 if(rows.error)throw rows.error;
 const mine=rows.data.find(r=>r.player_id===user.id);
 let league=mine&&Number.isInteger(mine.league)?EVENT_LEAGUES[mine.league]:null;
 if(!league){const me=await admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle();if(me.error)throw me.error;league=eventLeague(me.data?.level??0);}
 const all=eventStandings(event,rows.data.filter(r=>(r.league??0)===league.index),now,league),top=all.slice(0,TOP),you=all.find(r=>r.playerId===user.id)??null;
 const ids=[...new Set([...top.map(r=>r.playerId),...(you?[you.playerId]:[])])];
 const names=ids.length?await admin.from('player_stats').select('player_id,username,level,avatar_id,vip_expires_at').in('player_id',ids):{data:[]};
 if(names.error)throw names.error;
 const byId=new Map(names.data.map(p=>[p.player_id,p]));
 // The VIP mark as on the leaderboard (26 Sep 2026), and the id opens the farmer's profile in the game.
 const dress=r=>({...r,username:byId.get(r.playerId)?.username??'Farmer',level:byId.get(r.playerId)?.level??null,avatarId:byId.get(r.playerId)?.avatar_id??null,vipExpiresAt:Date.parse(byId.get(r.playerId)?.vip_expires_at)||0,isYou:r.playerId===user.id});
 return {league:{id:league.id,name:league.name,from:league.from,to:league.to,coins:league.coins},top:top.map(dress),you:you&&you.rank>TOP?dress(you):null,total:all.length,everyone:rows.data.length};
}
// A player sees the running and upcoming events, the last day's results and any reward still waiting to be
// collected (up to 30 days back) — not every automatic event of the month.
async function playerEvents(admin,user,now){
 const recent=()=>admin.from('live_events').select('*').gt('ends_at',new Date(now-DAY_MS).toISOString()).order('starts_at',{ascending:false}).limit(12);
 let listed=await recent();if(listed.error)return listed;
 // The pg_cron job normally creates events ahead of time; if it ever lags, fill the schedule here. Best effort:
 // a failure only means no new event yet, never a broken event screen.
 if(!listed.data.some(e=>e.active&&Date.parse(e.ends_at)>now)){
  const scheduled=await admin.rpc('harvest_event_schedule');
  if(!scheduled.error){listed=await recent();if(listed.error)return listed;}
 }
 const owed=await admin.from('live_event_players').select('event_id').eq('player_id',user.id).eq('qualified',true).is('claimed_at',null).limit(20);
 if(owed.error)return owed;
 const missing=owed.data.map(r=>r.event_id).filter(id=>!listed.data.some(e=>e.id===id));
 if(!missing.length)return listed;
 const older=await admin.from('live_events').select('*').in('id',missing).gt('ends_at',new Date(now-30*DAY_MS).toISOString());
 if(older.error)return older;
 return {data:[...listed.data,...older.data]};
}
// The same gate as the progress trigger (live-events-mixed.sql): level 15, so the event screen can say why a farm is not
// taking part yet.
async function eligibility(admin,user){
 const stats=await admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle();
 if(stats.error)throw stats.error;
 return {level:stats.data?.level??0,minLevel:15,openAt:0,verified:true};
}

// Confirming the email address (for EMAIL_BONUS diamonds, farm-state.js): a 6-digit code by email, valid for 30 minutes, 5 tries
// per code, at most one email a minute and 5 a day. Only a hash of the code is stored.
export const EMAIL_CODE=Object.freeze({validMs:30*60000,waitMs:60000,perDay:5,tries:5});
async function codeHash(player,code){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${player}:${code}`));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
// The same look as the reminder email (notify-hourly/mail.js): the logo, a cream card and the game's colours.
// In the farmer's game language (mail-text.js), English when it is not known.
export function emailCodeMessage(code,appUrl='https://www.harvesttycoon.com',language=null){
 const t=codeTexts(language),esc=v=>String(v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
 const text=t.text(code);
 const font="'DM Sans',Helvetica,Arial,sans-serif";
 const html=`<!doctype html><html lang="${t.language}" dir="${RTL_MAIL.includes(t.language)?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)}</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${appUrl}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td align="center" style="padding:8px 32px 0;font-family:${font};color:#3d3923;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#3d3923;">${esc(t.heading)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#5d573f;">${esc(t.intro)}</p>
<p style="margin:0 0 18px;"><span style="display:inline-block;padding:14px 24px;border-radius:14px;background:#eef5e6;border:1px solid #cfe2bd;font-size:34px;font-weight:700;letter-spacing:8px;color:#2f5a33;font-family:${font};">${code}</span></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#5d573f;">${esc(t.valid)}</p></td></tr>
<tr><td style="padding:18px 32px 28px;font-family:${font};font-size:12px;line-height:1.6;color:#857d70;text-align:center;">${esc(t.footer)}</td></tr>
</table></td></tr></table></body></html>`;
 return {subject:t.subject(code),text,html};
}
async function resendMail(to,message){
 const env=globalThis.Deno?.env,key=env?.get('RESEND_API_KEY')??'',from=env?.get('MAIL_FROM')??'Harvest Tycoon <noreply@harvesttycoon.com>';
 if(!key)throw Error('Email is not available right now. Try again later.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[to],subject:message.subject,html:message.html,text:message.text})});
 if(!response.ok)throw Error('The email could not be sent. Try again in a moment.');
}
export async function sendEmailCode({admin,user,now=Date.now(),mail=resendMail,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]}){
 if(!user.email)throw Error('Your account has no email address.');
 const checked=await admin.rpc('harvest_email_checked',{p_player:user.id});if(checked.error)throw checked.error;
 if(checked.data===true)return {verified:true};
 const row=await admin.from('email_checks').select('*').eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
 const r=row.data,day=new Date(now).toISOString().slice(0,10),sends=r?.send_day===day?r.sends_today:0;
 if(r?.sent_at&&now-Date.parse(r.sent_at)<EMAIL_CODE.waitMs)throw Error('Wait a minute before asking for a new code.');
 if(sends>=EMAIL_CODE.perDay)throw Error('You asked for 5 codes today. Try again tomorrow.');
 const code=String(random()%1000000).padStart(6,'0');
 const saved=await admin.from('email_checks').upsert({player_id:user.id,email:user.email,new_email:null,code_hash:await codeHash(user.id,code),code_expires_at:new Date(now+EMAIL_CODE.validMs).toISOString(),attempts:0,sent_at:new Date(now).toISOString(),send_day:day,sends_today:sends+1,confirmed_at:null});
 if(saved.error)throw saved.error;
 await mail(user.email,emailCodeMessage(code,undefined,await playerLanguage(admin,user.id)));
 return {sent:true,email:user.email,waitMs:EMAIL_CODE.waitMs};
}
export async function confirmEmailCode({admin,user,code,now=Date.now()}){
 if(!/^\d{6}$/.test(String(code??'')))throw Error('Type the 6 digits from the email.');
 const row=await admin.from('email_checks').select('*').eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
 const r=row.data;
 if(!r?.code_hash||!r.code_expires_at||Date.parse(r.code_expires_at)<=now)throw Error('This code has expired. Ask for a new one.');
 if(r.attempts>=EMAIL_CODE.tries)throw Error('Too many tries. Ask for a new code.');
 if(r.new_email||r.email?.toLowerCase()!==String(user.email??'').toLowerCase())throw Error('Your email address changed. Ask for a new code.');
 if(await codeHash(user.id,code)!==r.code_hash){
  const left=EMAIL_CODE.tries-r.attempts-1;
  const u=await admin.from('email_checks').update({attempts:r.attempts+1}).eq('player_id',user.id);if(u.error)throw u.error;
  throw Error(left>0?`That code is not right. ${left} ${left===1?'try':'tries'} left.`:'Too many tries. Ask for a new code.');
 }
 const u=await admin.from('email_checks').update({confirmed_at:new Date(now).toISOString(),code_hash:null,code_expires_at:null,attempts:0}).eq('player_id',user.id);if(u.error)throw u.error;
 return {verified:true};
}
// Changing the email address (28 Sep 2026). An email sign-up is not checked when the account is made (fewer steps), so a typo is
// common, and then neither a password reset nor a reminder reaches the farmer. The farmer types the new address and their
// password; a 6-digit code goes to the new address (email_checks.new_email, supabase/email-change.sql) and only that code moves the
// account there. So a typo or someone else's address never sticks, and whoever finds a signed-in phone cannot move the account
// without the password. Until then the current address, confirmed or not, stays as it is. Google and Facebook accounts keep their
// provider's address. The confirmation limits apply (a minute apart, five a day) and a wrong password uses one of the five, so a
// password cannot be guessed here.
const emailProvider=user=>(user.app_metadata?.provider??'email')==='email';
export async function sendEmailChange({admin,user,email,password,passwordOk,now=Date.now(),mail=resendMail,random=()=>crypto.getRandomValues(new Uint32Array(1))[0]}){
 if(!emailProvider(user))throw Error('You sign in with Google or Facebook, so your email address comes from there.');
 // The admin's address is what makes it the admin (admin-service.js): moving it here would lock the admin out of the dashboard.
 if(isAdminAccount(user))throw Error('This is the admin account. Change its address in Supabase.');
 const next=String(email??'').trim().toLowerCase();
 if(!validEmail(next)||next.length>254)throw Error('Enter a valid email address, like you@example.com.');
 if(next===String(user.email??'').trim().toLowerCase())throw Error('That is already your email address.');
 if(isAdminAddress(next))throw Error('This email address cannot be used.');
 if(typeof password!=='string'||!password||password.length>200)throw Error('Type your password.');
 const row=await admin.from('email_checks').select('*').eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
 const r=row.data,day=new Date(now).toISOString().slice(0,10),sends=r?.send_day===day?r.sends_today:0;
 if(r?.sent_at&&now-Date.parse(r.sent_at)<EMAIL_CODE.waitMs)throw Error('Wait a minute before asking for a new code.');
 if(sends>=EMAIL_CODE.perDay)throw Error('You asked for 5 codes today. Try again tomorrow.');
 const counted=await admin.from('email_checks').upsert({player_id:user.id,email:r?.email??user.email,sent_at:new Date(now).toISOString(),send_day:day,sends_today:sends+1});if(counted.error)throw counted.error;
 if(!await passwordOk(user.email,password))throw Error('That password is not right.');
 const code=String(random()%1000000).padStart(6,'0');
 const saved=await admin.from('email_checks').update({new_email:next,code_hash:await codeHash(user.id,code),code_expires_at:new Date(now+EMAIL_CODE.validMs).toISOString(),attempts:0}).eq('player_id',user.id);
 if(saved.error)throw saved.error;
 await mail(next,emailCodeMessage(code,undefined,await playerLanguage(admin,user.id)));
 return {sent:true,email:next,waitMs:EMAIL_CODE.waitMs};
}
export async function confirmEmailChange({admin,user,code,now=Date.now()}){
 if(!emailProvider(user))throw Error('You sign in with Google or Facebook, so your email address comes from there.');
 if(!/^\d{6}$/.test(String(code??'')))throw Error('Type the 6 digits from the email.');
 const row=await admin.from('email_checks').select('*').eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
 const r=row.data;
 if(!r?.new_email)throw Error('Ask for a code for your new address first.');
 if(!r.code_hash||!r.code_expires_at||Date.parse(r.code_expires_at)<=now)throw Error('This code has expired. Ask for a new one.');
 if(r.attempts>=EMAIL_CODE.tries)throw Error('Too many tries. Ask for a new code.');
 if(await codeHash(user.id,code)!==r.code_hash){
  const left=EMAIL_CODE.tries-r.attempts-1;
  const u=await admin.from('email_checks').update({attempts:r.attempts+1}).eq('player_id',user.id);if(u.error)throw u.error;
  throw Error(left>0?`That code is not right. ${left} ${left===1?'try':'tries'} left.`:'Too many tries. Ask for a new code.');
 }
 const moved=await admin.auth.admin.updateUserById(user.id,{email:r.new_email,email_confirm:true});
 if(moved.error){
  if(moved.error.code==='email_exists'||/already (been )?registered|already exists/i.test(moved.error.message??''))throw Error('This email address belongs to another account. Sign in with that one, or use another address.');
  throw moved.error;
 }
 const u=await admin.from('email_checks').update({email:r.new_email,new_email:null,confirmed_at:new Date(now).toISOString(),code_hash:null,code_expires_at:null,attempts:0}).eq('player_id',user.id);if(u.error)throw u.error;
 return {changed:true,email:r.new_email};
}
export async function handleEvents({admin,body,user,passwordOk}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:user.id}}});
 const managing=body.operation==='admin_events';if(managing&&!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 try{
  if(managing&&body.command==='save'){
   const config=validateEvent(body.config);const id=body.eventId??crypto.randomUUID();
   const query=body.eventId?admin.from('live_events').update(config).eq('id',id).gt('starts_at',new Date().toISOString()).select():admin.from('live_events').insert({...config,id,created_by:user.id}).select();
   const r=await query;if(r.error)throw r.error;if(!r.data?.length)throw Error('This event has started or no longer exists.');return respond({event:r.data[0]});
  }
  if(managing&&body.command==='toggle'){
   if(typeof body.active!=='boolean')throw Error('Choose active or inactive.');
   const r=await admin.from('live_events').update({active:body.active}).eq('id',body.eventId).is('settled_at',null).gt('ends_at',new Date().toISOString()).select();if(r.error)throw r.error;if(!r.data?.length)throw Error('Ended events cannot be activated.');return respond({event:r.data[0]});
  }
  if(managing&&body.command==='results'){
   const settled=await admin.rpc('harvest_event_settle',{p_event:body.eventId});if(settled.error)throw settled.error;
   const [event,players,count]=await Promise.all([admin.from('live_events').select('*').eq('id',body.eventId).single(),admin.from('live_event_players').select('*').eq('event_id',body.eventId).order('player_id').range(Math.max(0,Math.floor(Number(body.offset)||0)),Math.max(0,Math.floor(Number(body.offset)||0))+99),admin.from('live_event_players').select('*',{count:'exact',head:true}).eq('event_id',body.eventId)]);
   for(const r of [event,players,count])if(r.error)throw r.error;return respond({event:event.data,players:players.data,total:count.count});
  }
  if(!managing&&body.command==='email_send')return respond(await sendEmailCode({admin,user}));
  if(!managing&&body.command==='email_confirm')return respond(await confirmEmailCode({admin,user,code:body.code}));
  if(!managing&&body.command==='email_change_send')return respond(await sendEmailChange({admin,user,email:body.email,password:body.password,passwordOk}));
  if(!managing&&body.command==='email_change_confirm'){
   const changed=await confirmEmailChange({admin,user,code:body.code});
   globalThis.EdgeRuntime?.waitUntil?.(writeLog(admin,user.id,accountLog('email_change','Changed the email address')));
   return respond(changed);
  }
  if(!managing&&body.command==='claim'){
   const r=await admin.rpc('harvest_event_claim',{p_player:user.id,p_event:body.eventId});if(r.error)throw r.error;
   // In the farmer's log (player-log.js), after the reply: the event's name and what it paid.
   if(r.data?.coins||r.data?.diamonds)globalThis.EdgeRuntime?.waitUntil?.(logEventReward(admin,user.id,body.eventId,r.data));
   return respond({reward:r.data});
  }
  if(body.command&&body.command!=='list')throw Error('Unknown event command.');
  const now=Date.now();
  const listed=managing?await admin.from('live_events').select('*').order('starts_at',{ascending:false}).limit(50):await playerEvents(admin,user,now);
  if(listed.error)throw listed.error;
  const events=[];
  for(let e of listed.data){
   if(!managing&&!e.active&&Date.parse(e.ends_at)>now)continue;
   if(Date.parse(e.ends_at)<=now&&!e.settled_at){const r=await admin.rpc('harvest_event_settle',{p_event:e.id});if(r.error)throw r.error;const fresh=await admin.from('live_events').select('*').eq('id',e.id).single();if(fresh.error)throw fresh.error;e=fresh.data;}
   const [player,count]=await Promise.all([admin.from('live_event_players').select('*').eq('event_id',e.id).eq('player_id',user.id).maybeSingle(),admin.from('live_event_players').select('*',{count:'exact',head:true}).eq('event_id',e.id)]);
   if(player.error)throw player.error;if(count.error)throw count.error;
   events.push({...e,participants:count.count,player:player.data});
  }
  // Standings only for the event the screen puts first: the running one, otherwise the one that ended last.
  if(!managing){
   const running=events.find(e=>e.active&&Date.parse(e.starts_at)<=now&&Date.parse(e.ends_at)>now);
   const shown=running??events.filter(e=>Date.parse(e.ends_at)<=now).sort((a,b)=>Date.parse(b.ends_at)-Date.parse(a.ends_at))[0];
   if(shown)shown.standings=await standings(admin,shown,user,now);
  }
  return respond(managing?{events,serverNow:now}:{events,serverNow:now,eligibility:await eligibility(admin,user)});
 }catch(error){if(error.code&&!['P0001','23514','23505','22P02'].includes(error.code))throw error;return respond({error:error.message},422);}
}

async function logEventReward(admin,playerId,eventId,reward){
 let title=null;
 try{const found=await admin.from('live_events').select('title').eq('id',eventId).maybeSingle();title=found.data?.title??null;}catch{}
 await writeLog(admin,playerId,eventRewardLog(title,reward));
}
