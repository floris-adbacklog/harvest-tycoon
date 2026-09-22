import {isSuperadmin} from './admin-service.js';
export const EVENT_STATS=['harvested','produced','watered','tended','chores','deliveries'];
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
  const now=Date.now();let query=admin.from('live_events').select('*').order('starts_at',{ascending:false}).limit(50);
  if(!managing)query=query.gt('ends_at',new Date(now-30*86400000).toISOString());
  const listed=await query;if(listed.error)throw listed.error;
  const events=[];
  for(let e of listed.data){
   if(!managing&&!e.active&&Date.parse(e.ends_at)>now)continue;
   if(Date.parse(e.ends_at)<=now&&!e.settled_at){const r=await admin.rpc('harvest_event_settle',{p_event:e.id});if(r.error)throw r.error;const fresh=await admin.from('live_events').select('*').eq('id',e.id).single();if(fresh.error)throw fresh.error;e=fresh.data;}
   const [player,count]=await Promise.all([admin.from('live_event_players').select('*').eq('event_id',e.id).eq('player_id',user.id).maybeSingle(),admin.from('live_event_players').select('*',{count:'exact',head:true}).eq('event_id',e.id)]);
   if(player.error)throw player.error;if(count.error)throw count.error;
   events.push({...e,participants:count.count,player:player.data});
  }
  return respond({events,serverNow:now});
 }catch(error){if(error.code&&!['P0001','23514','23505','22P02'].includes(error.code))throw error;return respond({error:error.message},422);}
}
