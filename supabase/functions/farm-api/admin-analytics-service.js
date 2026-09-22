import {isSuperadmin} from './admin-service.js';
import {isRecentlyActive,ONLINE_WINDOW} from './presence.js';

const respond=(data,status=200)=>({status,data});
const DAY_MS=86400000,RETENTION_DAYS=7;

// Who is online right now: the same "active in the last 30 minutes" rule the leaderboard's own online dot and a
// farmer's public profile already use (presence.js) — nothing new is invented for this dashboard.
export async function handleAdminOnline({admin,user,now=Date.now()}){
 if(!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 const found=await admin.from('player_stats').select('player_id,username,level,last_active_at').order('last_active_at',{ascending:false,nullsFirst:false}).limit(500);
 if(found.error)throw found.error;
 const online=(found.data??[]).filter(row=>isRecentlyActive(row.last_active_at,now));
 return respond({count:online.length,windowMinutes:ONLINE_WINDOW/60000,players:online.map(({player_id,username,level})=>({playerId:player_id,username,level}))});
}

// The newest real accounts (never anonymous sessions — see admin_auth_signups), whether or not they ever opened
// a farm: a signed-up player who never played is exactly the kind of thing this list should surface.
export async function handleAdminRecentPlayers({admin,user,limit=14,now=Date.now()}){
 if(!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 const parsed=Number(limit);
 const n=Math.max(1,Math.min(Number.isFinite(parsed)?Math.floor(parsed):14,100));
 const signups=await admin.rpc('admin_auth_signups',{p_since:'1970-01-01T00:00:00Z',p_limit:n});
 if(signups.error)throw signups.error;
 const ids=(signups.data??[]).map(r=>r.player_id);
 const stats=ids.length?await admin.from('player_stats').select('player_id,username,level,currency,last_active_at').in('player_id',ids):{data:[]};
 if(stats.error)throw stats.error;
 const byId=new Map((stats.data??[]).map(s=>[s.player_id,s]));
 const players=(signups.data??[]).map(s=>{
  const stat=byId.get(s.player_id);
  return {playerId:s.player_id,createdAt:s.created_at,username:stat?.username??null,level:stat?.level??null,coins:stat?.currency??null,online:stat?isRecentlyActive(stat.last_active_at,now):false,everPlayed:Boolean(stat)};
 });
 return respond({players});
}

// A simplified retention cohort: for every UTC day in the last week, the % of that day's real (non-anonymous)
// signups whose most recent activity is at or after "signup day + N days", for N = 0..7. This is a "still
// around by day N" cohort (a rolling floor on their one last-activity timestamp), not exact day-N-active
// retention — the game keeps no daily activity log, so exact day-by-day presence cannot be reconstructed after
// the fact. A day still in progress (not enough of it has elapsed for a given N) is reported as null, not 0%.
export async function handleAdminRetention({admin,user,now=Date.now()}){
 if(!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 const since=new Date(now-(RETENTION_DAYS+1)*DAY_MS).toISOString();
 const signups=await admin.rpc('admin_auth_signups',{p_since:since,p_limit:5000});
 if(signups.error)throw signups.error;
 const ids=[...new Set((signups.data??[]).map(r=>r.player_id))];
 const stats=ids.length?await admin.from('player_stats').select('player_id,last_active_at').in('player_id',ids):{data:[]};
 if(stats.error)throw stats.error;
 const lastActive=new Map((stats.data??[]).map(s=>[s.player_id,s.last_active_at?Date.parse(s.last_active_at):null]));
 const cohorts=new Map();
 for(const s of signups.data??[]){
  const day=new Date(s.created_at).toISOString().slice(0,10);
  if(!cohorts.has(day))cohorts.set(day,[]);
  cohorts.get(day).push(s.player_id);
 }
 const rows=[...cohorts.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([day,members])=>{
  const dayStart=Date.parse(`${day}T00:00:00Z`);
  const days=Array.from({length:RETENTION_DAYS+1},(_,offset)=>{
   const mark=dayStart+offset*DAY_MS;
   if(now<mark)return null;
   const retained=members.filter(id=>{const active=lastActive.get(id);return active!=null&&active>=mark;}).length;
   return {retained,total:members.length,pct:Math.round(retained/members.length*100)};
  });
  return {day,size:members.length,days};
 });
 return respond({rows});
}
