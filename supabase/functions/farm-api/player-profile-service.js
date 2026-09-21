import {isRecentlyActive} from './presence.js';
import {CROPS,MASTERY_TIERS} from './farm-state.js';

const cropKeys=Object.keys(CROPS);
const metrics=['harvested_crops','goods_produced','items_sold','deliveries','badges'];
export const PLAYER_PUBLIC_FIELDS=['player_id','username','level','last_active_at','vip_expires_at',...metrics,...cropKeys.map(key=>`harvested_${key}`)].join(',');
const number=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
export const escapePlayerSearch=value=>value.replace(/[\\%_]/g,'\\$&');
async function read(query){const result=await query;if(result.error)throw result.error;return result.data;}
async function familiesFor(admin,ids){
 const result=new Map();if(!ids.length)return result;
 const members=await read(admin.from('family_members').select('player_id,family_id,role').in('player_id',ids).is('left_at',null));
 const familyIds=[...new Set((members??[]).map(m=>m.family_id))];if(!familyIds.length)return result;
 const families=await read(admin.from('families').select('id,name,emblem').in('id',familyIds).is('deleted_at',null));
 const byId=new Map((families??[]).map(f=>[f.id,f]));
 for(const member of members??[]){const f=byId.get(member.family_id);if(f)result.set(member.player_id,{name:f.name,emblem:f.emblem,role:member.role==='leader'?'Leader':'Member'});}
 return result;
}
function summary(row,families,now){return {playerId:row.player_id,username:row.username,level:number(row.level),vipExpiresAt:Date.parse(row.vip_expires_at)||0,online:isRecentlyActive(row.last_active_at,now),family:families.get(row.player_id)??null};}
// Auth/session validation happens in index.ts before this read-only directory is reached.
// Never load or return a complete farm, account record, membership or family record.
export async function handlePlayerDirectory({admin,body,player,now=Date.now()}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:player},serverNow:now}});
 if(body.operation==='player_search'){
  if(typeof body.query!=='string'||body.query.trim().length<2||body.query.trim().length>20)return respond({error:'Enter 2–20 characters to find a farmer.'},400);
  const rows=await read(admin.from('player_stats').select('player_id,username,level,last_active_at,vip_expires_at').ilike('username',`%${escapePlayerSearch(body.query.trim())}%`).order('username',{ascending:true}).order('player_id',{ascending:true}).limit(21));
  const visible=(rows??[]).slice(0,20),families=await familiesFor(admin,visible.map(row=>row.player_id));
  return respond({players:visible.map(row=>summary(row,families,now)),hasMore:(rows??[]).length>20});
 }
 if(body.operation!=='player_profile'||typeof body.playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.playerId))return respond({error:'Choose a valid farmer.'},400);
 const row=await read(admin.from('player_stats').select(PLAYER_PUBLIC_FIELDS).eq('player_id',body.playerId).maybeSingle());
 if(!row)return respond({error:'This farmer could not be found.',code:'PLAYER_NOT_FOUND'},404);
 const families=await familiesFor(admin,[row.player_id]);
 const mastery=await read(admin.from('player_farms').select('claimed:state->mastery->claimed').eq('player_id',row.player_id).maybeSingle());
 const badges=[...new Set(Array.isArray(mastery?.claimed)?mastery.claimed:[])].flatMap(id=>{
  if(typeof id!=='string')return [];const [crop,tier,...extra]=id.split(':');
  return !extra.length&&cropKeys.includes(crop)&&/^[0-3]$/.test(tier)&&MASTERY_TIERS[Number(tier)]?[{crop,tier:Number(tier)}]:[];
 });
 return respond({playerProfile:{...summary(row,families,now),stats:Object.fromEntries(metrics.map(key=>[key,number(row[key])])),harvests:Object.fromEntries(cropKeys.map(key=>[key,number(row[`harvested_${key}`])])),badges}});
}
