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
// (same numbers as harvest_event_settle). At collection a farmer gets at most EVENT_DAY_DIAMONDS event diamonds a day.
export const PODIUM=Object.freeze([{coins:2000,diamonds:20},{coins:1000,diamonds:10},{coins:500,diamonds:5}]);
export const FINISHER_PRIZE=Object.freeze({coins:100,diamonds:1});
export const EVENT_DAY_DIAMONDS=30;
// The event's top 10, ranked the way settlement pays (live-events.sql): finished farmers first, earliest finish
// first (the finish time is frozen), then everyone else by how far along they are. Rewards follow the same formula
// as harvest_event_settle — exact once settled, "if it ended now" while the event runs.
export function eventStandings(event,rows,now=Date.now()){
 const settled=Boolean(event.settled_at),goals=event.objectives;
 const share=r=>goals.reduce((sum,o)=>sum+Math.min(1,(r.progress?.[o.stat]??0)/o.target),0)/goals.length;
 const finished=r=>settled?r.qualified:goals.every(o=>(r.progress?.[o.stat]??0)>=o.target)&&r.actions>=MIN_ACTIONS&&Date.parse(r.last_at)-Date.parse(r.joined_at)>=MIN_SPAN;
 const at=r=>Date.parse(r.last_at);
 const ranked=rows.map(r=>({...r,done:finished(r),share:share(r)})).sort((a,b)=>Number(b.done)-Number(a.done)||(a.done?at(a)-at(b)||String(a.player_id).localeCompare(String(b.player_id)):b.share-a.share||at(a)-at(b)));
 const n=ranked.filter(r=>r.done).length,{coins,diamondMin,diamondMax,participantStep,poolCap}=event.rewards;
 const perPlayer=Math.min(diamondMax,diamondMin+Math.floor(Math.sqrt(n/participantStep))),budget=Math.min(poolCap,n*perPlayer);
 return ranked.map((r,i)=>({rank:i+1,playerId:r.player_id,finished:r.done,progress:Math.round(r.share*100),
  coins:settled?r.coins:r.done?coins+(PODIUM[i]??FINISHER_PRIZE).coins:0,diamonds:settled?r.diamonds:r.done?Math.max(0,Math.min(perPlayer,budget-i*perPlayer))+(PODIUM[i]??FINISHER_PRIZE).diamonds:0,podium:r.done&&i<PODIUM.length}));
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
// The same gates as the progress trigger (live-events.sql, live-events-no-wait.sql): level 10 and a confirmed email address, so the
// event screen can say why a farm is not taking part yet.
async function eligibility(admin,user){
 const stats=await admin.from('player_stats').select('level').eq('player_id',user.id).maybeSingle();
 if(stats.error)throw stats.error;
 return {level:stats.data?.level??0,minLevel:10,openAt:0,verified:Boolean(user.email_confirmed_at)};
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
