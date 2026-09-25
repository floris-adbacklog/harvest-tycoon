import {isSuperadmin} from './admin-service.js';
// Goals open to every farm from level 10, when events open: the farm-wide counters, the crops unlocked by level 9 and eggs.
export const EVENT_STATS=['harvested','produced','watered','tended','chores','deliveries','harvest_wheat','harvest_corn','harvest_lettuce','harvest_barley','harvest_greenbeans','harvest_cabbage','made_eggs'];
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
const DAY_MS=86400000,MIN_ACTIONS=3,MIN_SPAN=10*60000,TOP=10;
// The first three farmers to finish win a podium prize on top of the usual reward, and every later finisher a small extra
// (same numbers as harvest_event_settle, live-events-bigger-prizes.sql). Diamonds are a fixed prize per place, nothing else; coins
// come on top of the event's own coins. At collection a farmer gets at most EVENT_DAY_DIAMONDS event diamonds a day.
export const PODIUM=Object.freeze([{coins:2000,diamonds:50},{coins:1000,diamonds:30},{coins:500,diamonds:20}]);
export const FINISHER_PRIZE=Object.freeze({coins:100,diamonds:5});
export const EVENT_DAY_DIAMONDS=50;
// The event's top 10, ranked the way settlement pays (live-events.sql): finished farmers first, earliest finish
// first (the finish time is frozen), then everyone else by how far along they are. Rewards follow the same formula
// as harvest_event_settle — exact once settled, "if it ended now" while the event runs.
export function eventStandings(event,rows,now=Date.now()){
 const settled=Boolean(event.settled_at),goals=event.objectives;
 const share=r=>goals.reduce((sum,o)=>sum+Math.min(1,(r.progress?.[o.stat]??0)/o.target),0)/goals.length;
 const finished=r=>settled?r.qualified:goals.every(o=>(r.progress?.[o.stat]??0)>=o.target)&&r.actions>=MIN_ACTIONS&&Date.parse(r.last_at)-Date.parse(r.joined_at)>=MIN_SPAN;
 const at=r=>Date.parse(r.last_at);
 const ranked=rows.map(r=>({...r,done:finished(r),share:share(r)})).sort((a,b)=>Number(b.done)-Number(a.done)||(a.done?at(a)-at(b)||String(a.player_id).localeCompare(String(b.player_id)):b.share-a.share||at(a)-at(b)));
 const {coins}=event.rewards;
 return ranked.map((r,i)=>({rank:i+1,playerId:r.player_id,finished:r.done,progress:Math.round(r.share*100),
  coins:settled?r.coins:r.done?coins+(PODIUM[i]??FINISHER_PRIZE).coins:0,diamonds:settled?r.diamonds:r.done?(PODIUM[i]??FINISHER_PRIZE).diamonds:0,podium:r.done&&i<PODIUM.length}));
}
async function standings(admin,event,user,now){
 const rows=await admin.from('live_event_players').select('player_id,progress,actions,joined_at,last_at,qualified,coins,diamonds').eq('event_id',event.id).limit(2000);
 if(rows.error)throw rows.error;
 const all=eventStandings(event,rows.data,now),top=all.slice(0,TOP),you=all.find(r=>r.playerId===user.id)??null;
 const ids=[...new Set([...top.map(r=>r.playerId),...(you?[you.playerId]:[])])];
 const names=ids.length?await admin.from('player_stats').select('player_id,username,level,avatar_id').in('player_id',ids):{data:[]};
 if(names.error)throw names.error;
 const byId=new Map(names.data.map(p=>[p.player_id,p]));
 const dress=r=>({...r,username:byId.get(r.playerId)?.username??'Farmer',level:byId.get(r.playerId)?.level??null,avatarId:byId.get(r.playerId)?.avatar_id??null,isYou:r.playerId===user.id});
 return {top:top.map(dress),you:you&&you.rank>TOP?dress(you):null,total:all.length};
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
// The same gate as the progress trigger (live-events-level-only.sql): level 10, so the event screen can say why a farm is not
// taking part yet.
async function eligibility(admin,user){
 const stats=await admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle();
 if(stats.error)throw stats.error;
 return {level:stats.data?.level??0,minLevel:10,openAt:0,verified:true};
}

// Confirming the email address (for EMAIL_BONUS diamonds, farm-state.js): a 6-digit code by email, valid for 30 minutes, 5 tries
// per code, at most one email a minute and 5 a day. Only a hash of the code is stored.
export const EMAIL_CODE=Object.freeze({validMs:30*60000,waitMs:60000,perDay:5,tries:5});
async function codeHash(player,code){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${player}:${code}`));return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');}
// The same look as the reminder email (notify-hourly/mail.js): the logo, a cream card and the game's colours.
export function emailCodeMessage(code,appUrl='https://www.harvesttycoon.com'){
 const text=`Your code to confirm your email for Harvest Tycoon: ${code}\n\nType it in the game within 30 minutes. If you did not ask for this, you can ignore this email.`;
 const font="'DM Sans',Helvetica,Arial,sans-serif";
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Harvest Tycoon code</title></head>
<body style="margin:0;padding:0;background:#f3e8e0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3e8e0;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fffdf6;border-radius:22px;border:1px solid #eadfd4;">
<tr><td align="center" style="padding:24px 28px 0;"><img src="${appUrl}/assets/harvest-tycoon-logo.png" width="130" height="130" alt="Harvest Tycoon" style="display:block;border:0;width:130px;height:auto;"></td></tr>
<tr><td align="center" style="padding:8px 32px 0;font-family:${font};color:#3d3923;">
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#3d3923;">Confirm your email</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#5d573f;">Type this code in the game to confirm your email:</p>
<p style="margin:0 0 18px;"><span style="display:inline-block;padding:14px 24px;border-radius:14px;background:#eef5e6;border:1px solid #cfe2bd;font-size:34px;font-weight:700;letter-spacing:8px;color:#2f5a33;font-family:${font};">${code}</span></p>
<p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#5d573f;">The code works for 30 minutes.</p></td></tr>
<tr><td style="padding:18px 32px 28px;font-family:${font};font-size:12px;line-height:1.6;color:#857d70;text-align:center;">You get this email because someone asked for a code in Harvest Tycoon with this address. If that was not you, you can ignore it.</td></tr>
</table></td></tr></table></body></html>`;
 return {subject:`Your Harvest Tycoon code: ${code}`,text,html};
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
 const saved=await admin.from('email_checks').upsert({player_id:user.id,email:user.email,code_hash:await codeHash(user.id,code),code_expires_at:new Date(now+EMAIL_CODE.validMs).toISOString(),attempts:0,sent_at:new Date(now).toISOString(),send_day:day,sends_today:sends+1,confirmed_at:null});
 if(saved.error)throw saved.error;
 await mail(user.email,emailCodeMessage(code));
 return {sent:true,email:user.email,waitMs:EMAIL_CODE.waitMs};
}
export async function confirmEmailCode({admin,user,code,now=Date.now()}){
 if(!/^\d{6}$/.test(String(code??'')))throw Error('Type the 6 digits from the email.');
 const row=await admin.from('email_checks').select('*').eq('player_id',user.id).maybeSingle();if(row.error)throw row.error;
 const r=row.data;
 if(!r?.code_hash||!r.code_expires_at||Date.parse(r.code_expires_at)<=now)throw Error('This code has expired. Ask for a new one.');
 if(r.attempts>=EMAIL_CODE.tries)throw Error('Too many tries. Ask for a new code.');
 if(r.email?.toLowerCase()!==String(user.email??'').toLowerCase())throw Error('Your email address changed. Ask for a new code.');
 if(await codeHash(user.id,code)!==r.code_hash){
  const left=EMAIL_CODE.tries-r.attempts-1;
  const u=await admin.from('email_checks').update({attempts:r.attempts+1}).eq('player_id',user.id);if(u.error)throw u.error;
  throw Error(left>0?`That code is not right. ${left} ${left===1?'try':'tries'} left.`:'Too many tries. Ask for a new code.');
 }
 const u=await admin.from('email_checks').update({confirmed_at:new Date(now).toISOString(),code_hash:null,code_expires_at:null,attempts:0}).eq('player_id',user.id);if(u.error)throw u.error;
 return {verified:true};
}
export async function handleEvents({admin,body,user}){
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
  if(!managing&&body.command==='claim'){
   const r=await admin.rpc('harvest_event_claim',{p_player:user.id,p_event:body.eventId});if(r.error)throw r.error;return respond({reward:r.data});
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
