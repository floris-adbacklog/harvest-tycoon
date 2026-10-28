import {playerAvatar} from './player-avatars.js';
import {isRecentlyActive} from './presence.js';
import {CROPS,ITEMS,MASTERY_TIERS,worldTwoItem,otherWorldItem,wornLook,seasonBadges,visitView,levelOf} from './farm-state.js';
import {isAdminAddress} from './admin-service.js';

const cropKeys=Object.keys(CROPS),goodKeys=Object.keys(ITEMS).filter(key=>!Object.hasOwn(CROPS,key)&&!ITEMS[key].heirloom&&!otherWorldItem(key));   // the farm's goods, not World II's or III's
// The profile's stat pages (src/player-profiles.js): the same public numbers as the leaderboards, coins included (the "Most coins"
// board already shows them). Diamonds and the rest of the account stay private.
// 20 Oct 2026: the village page ("In the village") reads Villagers helped and Village events (supabase/world-two-leagues-a.sql).
const metrics=['harvested_crops','goods_produced','items_sold','deliveries','badges','farm_fields','building_upgrades','best_streak','events_finished','chores_done','helping_rounds','estate_projects','quests_done','currency','villagers_helped','village_events_finished'];
export const PLAYER_PUBLIC_FIELDS=['player_id','username','level','last_active_at','vip_expires_at','avatar_id','look',...metrics,'goods_made',...cropKeys.map(key=>`harvested_${key}`)].join(',');
const number=value=>Number.isFinite(Number(value))?Math.max(0,Math.floor(Number(value))):0;
export const escapePlayerSearch=value=>value.replace(/[\\%_]/g,'\\$&');
async function read(query){const result=await query;if(result.error)throw result.error;return result.data;}
async function familiesFor(admin,ids){
 const result=new Map();if(!ids.length)return result;
 const members=await read(admin.from('family_members').select('player_id,family_id,role').in('player_id',ids).is('left_at',null));
 const familyIds=[...new Set((members??[]).map(m=>m.family_id))];if(!familyIds.length)return result;
 const families=await read(admin.from('families').select('id,name,emblem').in('id',familyIds).is('deleted_at',null));
 const byId=new Map((families??[]).map(f=>[f.id,f]));
 for(const member of members??[]){const f=byId.get(member.family_id);if(f)result.set(member.player_id,{id:f.id,name:f.name,emblem:f.emblem,role:({leader:'Leader',coleader:'Co-leader',honorary:'Honorary'})[member.role]??'Member'});}
 return result;
}
// The account behind a farmer: since when, and whether it is an admin's (25 Oct 2026: an admin's farm is a showcase, never visited).
async function accountOf(admin,playerId){
 try{const {data}=await admin.auth.admin.getUserById(playerId);const time=Date.parse(data?.user?.created_at);return {since:Number.isFinite(time)?time:null,admin:isAdminAddress(data?.user?.email)};}catch{return {since:null,admin:false};}
}
function summary(row,families,now){return {playerId:row.player_id,username:row.username,avatarId:playerAvatar(row.avatar_id).id,level:number(row.level),vipExpiresAt:Date.parse(row.vip_expires_at)||0,online:isRecentlyActive(row.last_active_at,now),family:families.get(row.player_id)??null,look:wornLook(row.look)};}
// Auth/session validation happens in index.ts before this read-only directory is reached.
// Never load or return a complete farm, account record, membership or family record. The one account fact a profile
// shows is the sign-up date ("member since"); the rest of the account is not read out. Last online (28 Sep 2026) is the day
// the farm last saved, from the public player_stats row; the profile shows the day only, never the time.
export async function handlePlayerDirectory({admin,body,player,now=Date.now()}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:player},serverNow:now}});
 if(body.operation==='player_search'){
  if(typeof body.query!=='string'||body.query.trim().length<2||body.query.trim().length>20)return respond({error:'Enter 2–20 characters to find a farmer.'},400);
  const rows=await read(admin.from('player_stats').select('player_id,username,level,last_active_at,vip_expires_at,avatar_id,look').ilike('username',`%${escapePlayerSearch(body.query.trim())}%`).order('username',{ascending:true}).order('player_id',{ascending:true}).limit(21));
  const visible=(rows??[]).slice(0,20),families=await familiesFor(admin,visible.map(row=>row.player_id));
  return respond({players:visible.map(row=>summary(row,families,now)),hasMore:(rows??[]).length>20});
 }
 if(body.operation!=='player_profile'||typeof body.playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.playerId))return respond({error:'Choose a valid farmer.'},400);
 const row=await read(admin.from('player_stats').select(PLAYER_PUBLIC_FIELDS).eq('player_id',body.playerId).maybeSingle());
 if(!row)return respond({error:'This farmer could not be found.',code:'PLAYER_NOT_FOUND'},404);
 const families=await familiesFor(admin,[row.player_id]);
 const mastery=await read(admin.from('player_farms').select('claimed:state->mastery->claimed,looks:state->looks').eq('player_id',row.player_id).maybeSingle());
 const badges=[...new Set(Array.isArray(mastery?.claimed)?mastery.claimed:[])].flatMap(id=>{
  if(typeof id!=='string')return [];const [crop,tier,...extra]=id.split(':');
  return !extra.length&&cropKeys.includes(crop)&&/^[0-3]$/.test(tier)&&MASTERY_TIERS[Number(tier)]?[{crop,tier:Number(tier)}]:[];
 });
 return respond({playerProfile:{...summary(row,families,now),...await accountOf(admin,row.player_id).then(a=>({memberSince:a.since,...(a.admin?{noVisit:true}:{})})),lastOnline:Date.parse(row.last_active_at)||null,stats:{...Object.fromEntries(metrics.map(key=>[key,number(row[key])])),goods_kinds:goodKeys.filter(key=>number(row.goods_made?.[key])>0).length,
  // Village goods made (20 Oct 2026): every World II good in goods_made, packed lunches included; the client never gets goods_made.
  village_goods:Object.entries(row.goods_made??{}).filter(([k])=>worldTwoItem(k)).reduce((n,[,v])=>n+number(v),0)},harvests:Object.fromEntries(cropKeys.map(key=>[key,number(row[`harvested_${key}`])])),badges,
  // The Season Pass (Oct 2026): every season badge this farmer collected, the "Seasons" row.
  seasons:seasonBadges(mastery?.looks)}});
}

// Visiting a farm (24 Oct 2026, the owner: "Zorg ook dat je andermans boerderij kan visiten"): another farmer's farm as it stands, to
// look at (farm-state.js visitView: never its coins, diamonds, stock, purchases or invite), with their name, picture and level.
// No visits for the admins (25 Oct 2026, the owner: "Je moet geen buren kunnen doen als admin", both ways): an admin account visits no
// farm, and nobody visits an admin's (they never play; the profile shows no Visit farm for them, noVisit).
export async function handleFarmVisit({admin,body,player,visitorAdmin=false,now=Date.now()}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:player},serverNow:now}});
 if(visitorAdmin)return respond({error:'Admin accounts do not visit farms.',code:'VISIT_REFUSED'},403);
 if(typeof body.playerId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.playerId))return respond({error:'Choose a valid farmer.'},400);
 const [account,farm,row]=await Promise.all([accountOf(admin,body.playerId),read(admin.from('player_farms').select('state').eq('player_id',body.playerId).maybeSingle()),read(admin.from('player_stats').select('username,avatar_id').eq('player_id',body.playerId).maybeSingle())]);
 if(!farm?.state||!row)return respond({error:'This farm could not be found.',code:'PLAYER_NOT_FOUND'},404);
 if(account.admin)return respond({error:'This farm cannot be visited.',code:'VISIT_REFUSED'},403);
 const state=visitView(farm.state,now);
 return respond({visit:{playerId:body.playerId,username:row.username,avatarId:playerAvatar(row.avatar_id).id,level:levelOf(state)},state});
}
