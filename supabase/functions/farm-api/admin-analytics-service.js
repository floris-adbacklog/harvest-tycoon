import {isStaff,isSuperadmin} from './admin-service.js';
import {isRecentlyActive,ONLINE_WINDOW} from './presence.js';
import {BEGINNER_QUESTS} from './farm-state.js';
import {zoneCountry} from './time-zones.js';

// bridge.request() in src/main.js checks every response's profile.player_id against the signed-in caller (a
// stale-tab/concurrent-session guard every farm-api reply is expected to satisfy) — the admin's own id here,
// not any of the farmers this dashboard reports on.
const respond=(user,data,status=200)=>({status,data:{...data,profile:{player_id:user?.id}}});
const DAY_MS=86400000,RETENTION_DAYS=7;
// The staff are in the Netherlands: the dashboard's days run from midnight to midnight Amsterdam time (src/admin-players.js shows
// every time in it too). zoneDay gives "2026-09-25" for an instant; dayStart the instant that day began, summer or winter time.
export const ADMIN_ZONE='Europe/Amsterdam';
const dayFormat=new Intl.DateTimeFormat('en-CA',{timeZone:ADMIN_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
const partsFormat=new Intl.DateTimeFormat('en-US',{timeZone:ADMIN_ZONE,hourCycle:'h23',year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'numeric',second:'numeric'});
export const zoneDay=ms=>dayFormat.format(ms);
const zoneOffset=ms=>{const p=Object.fromEntries(partsFormat.formatToParts(ms).map(x=>[x.type,x.value]));return Date.UTC(+p.year,p.month-1,+p.day,+p.hour,+p.minute,+p.second)-Math.floor(ms/1000)*1000;};
export const dayStart=day=>{const clock=Date.parse(`${day}T00:00:00Z`);return clock-zoneOffset(clock-zoneOffset(clock));};

// Who is online right now: the same "active in the last 30 minutes" rule the leaderboard's own online dot and a
// farmer's public profile already use (presence.js) — nothing new is invented for this dashboard.
export async function handleAdminOnline({admin,user,now=Date.now()}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
 const found=await admin.from('player_stats').select('player_id,username,level,last_active_at').order('last_active_at',{ascending:false,nullsFirst:false}).limit(500);
 if(found.error)throw found.error;
 const online=(found.data??[]).filter(row=>isRecentlyActive(row.last_active_at,now));
 return respond(user,{count:online.length,windowMinutes:ONLINE_WINDOW/60000,players:online.map(({player_id,username,level})=>({playerId:player_id,username,level}))});
}

// The newest real accounts (never anonymous sessions — see admin_auth_signups), whether or not they ever opened
// a farm: a signed-up player who never played is exactly the kind of thing this list should surface.
export async function handleAdminRecentPlayers({admin,user,limit=14,now=Date.now()}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
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
 return respond(user,{players});
}

// A simplified retention cohort: for every day in the last week (Amsterdam time), the % of that day's real (non-anonymous)
// signups whose most recent activity is at or after "signup day + N days", for N = 0..7. This is a "still
// around by day N" cohort (a rolling floor on their one last-activity timestamp), not exact day-N-active
// retention — the game keeps no daily activity log, so exact day-by-day presence cannot be reconstructed after
// the fact. A day still in progress (not enough of it has elapsed for a given N) is reported as null, not 0%.
export async function handleAdminRetention({admin,user,now=Date.now()}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
 const since=new Date(now-(RETENTION_DAYS+1)*DAY_MS).toISOString();
 const signups=await admin.rpc('admin_auth_signups',{p_since:since,p_limit:5000});
 if(signups.error)throw signups.error;
 const ids=[...new Set((signups.data??[]).map(r=>r.player_id))];
 const stats=ids.length?await admin.from('player_stats').select('player_id,last_active_at').in('player_id',ids):{data:[]};
 if(stats.error)throw stats.error;
 const lastActive=new Map((stats.data??[]).map(s=>[s.player_id,s.last_active_at?Date.parse(s.last_active_at):null]));
 const cohorts=new Map();
 for(const s of signups.data??[]){
  const day=zoneDay(Date.parse(s.created_at));
  if(!cohorts.has(day))cohorts.set(day,[]);
  cohorts.get(day).push(s.player_id);
 }
 const rows=[...cohorts.entries()].sort(([a],[b])=>a<b?-1:a>b?1:0).map(([day,members])=>{
  const start=dayStart(day);
  const days=Array.from({length:RETENTION_DAYS+1},(_,offset)=>{
   const mark=start+offset*DAY_MS;
   if(now<mark)return null;
   const retained=members.filter(id=>{const active=lastActive.get(id);return active!=null&&active>=mark;}).length;
   return {retained,total:members.length,pct:Math.round(retained/members.length*100)};
  });
  return {day,size:members.length,days};
 });
 return respond(user,{rows});
}

// Invite a friend, for the admin: every friend who started with someone's link (newest first, at most 200), who invited them,
// how far they are, and whether each side has received its 150 diamonds. "Paid" is read from the farms themselves: the friend's
// farm stamps invite.rewardedAt, the inviter's farm lists the friend in inviteRewards (farm-state.js), so this shows what was
// really credited, not only what was earned. Also the totals and how many personal links exist.
export async function handleAdminInvites({admin,user,now=Date.now(),reward=150,level=10,days=30}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
 const found=await admin.from('referrals').select('invitee_id,referrer_id,created_at,qualified_at,referrer_diamonds').order('created_at',{ascending:false}).limit(200);
 if(found.error)throw found.error;
 const rows=found.data??[],ids=[...new Set(rows.flatMap(r=>[r.invitee_id,r.referrer_id]))];
 const codes=await admin.from('player_invite_codes').select('player_id',{count:'exact',head:true});
 const [stats,farms]=ids.length?await Promise.all([
  admin.from('player_stats').select('player_id,username,level').in('player_id',ids),
  admin.from('player_farms').select('player_id,invite:state->invite,paid:state->inviteRewards').in('player_id',ids)
 ]):[{data:[]},{data:[]}];
 if(stats.error)throw stats.error;if(farms.error)throw farms.error;
 const who=new Map((stats.data??[]).map(s=>[s.player_id,s])),farm=new Map((farms.data??[]).map(f=>[f.player_id,f]));
 const invites=rows.map(r=>{
  const friend=who.get(r.invitee_id),inviter=who.get(r.referrer_id);
  const friendPaid=Boolean(farm.get(r.invitee_id)?.invite?.rewardedAt),inviterPaid=(farm.get(r.referrer_id)?.paid??[]).includes(r.invitee_id);
  const status=r.qualified_at?'qualified':now-Number(r.created_at)>days*86400000?'expired':'playing';
  return {inviter:inviter?.username??'Unknown',friend:friend?.username??'New farmer',friendLevel:friend?.level??1,joinedAt:Number(r.created_at),qualifiedAt:r.qualified_at?Number(r.qualified_at):null,
   status,friendReward:status==='qualified'?reward:0,inviterReward:r.referrer_diamonds??0,friendPaid,inviterPaid};
 });
 const totals={links:codes.count??0,friends:invites.length,qualified:invites.filter(i=>i.status==='qualified').length,
  diamondsPaid:invites.reduce((sum,i)=>sum+(i.friendPaid?i.friendReward:0)+(i.inviterPaid?i.inviterReward:0),0)};
 return respond(user,{totals,invites,rules:{reward,level,days}});
}

// Where and on what a farmer opened the game, for the admin (supabase/admin-player-insights.sql): the country of the device's own time
// zone (sent with every load, time-zones.js; never worked out from the IP address), the IP address and the browser. One row per
// farmer, replaced on every load; a failure here never stops a farm opening.
const IPV4=/^\d{1,3}(\.\d{1,3}){3}$/,IPV6=/^[0-9a-f:.]{2,45}$/i;
export function seenFrom(headers,timeZone){
 const get=name=>String(headers?.get?.(name)??'').trim();
 const ip=get('cf-connecting-ip')||get('x-real-ip')||get('x-forwarded-for').split(',')[0].trim();
 return {country:zoneCountry(timeZone),ip:IPV4.test(ip)||IPV6.test(ip)&&ip.includes(':')?ip:null,device:get('user-agent').slice(0,300)||null};
}
// Only what this visit knows is written: a load without a time zone (a game tab from before this) keeps the country saved earlier.
export async function recordSeen({admin,player,headers,timeZone,now=Date.now()}){
 const seen=Object.fromEntries(Object.entries(seenFrom(headers,timeZone)).filter(([,value])=>value!=null));
 const saved=await admin.from('player_seen').upsert({player_id:player,...seen,seen_at:new Date(now).toISOString()});
 if(saved.error)throw saved.error;
}
// "iPhone · Safari", "Windows · Chrome", "Android phone · Facebook app": enough to tell devices apart, from the user agent.
export function deviceName(agent){
 const s=String(agent??'');if(!s)return null;
 const system=/iPad/.test(s)?'iPad':/iPhone|iPod/.test(s)?'iPhone':/Android/.test(s)?(/Mobile/.test(s)?'Android phone':'Android tablet'):/CrOS/.test(s)?'Chromebook':/Windows/.test(s)?'Windows':/Macintosh|Mac OS X/.test(s)?'Mac':/Linux/.test(s)?'Linux':'Other';
 const browser=/FBAN|FBAV|FB_IAB/.test(s)?'Facebook app':/Instagram/.test(s)?'Instagram app':/EdgA?\/|EdgiOS/.test(s)?'Edge':/SamsungBrowser/.test(s)?'Samsung Internet':/OPR\/|Opera/.test(s)?'Opera':/Firefox|FxiOS/.test(s)?'Firefox':/CriOS|Chrome\//.test(s)?'Chrome':/Safari\//.test(s)?'Safari':'Browser';
 return `${system} · ${browser}`;
}
const num=value=>Number.isFinite(Number(value))?Number(value):0;
// Every row of a query, however many: PostgREST answers at most 1,000 rows per request, so this asks for the next page until one
// comes back empty (which also holds if the project's own page limit is smaller). `query` makes a fresh request for each page, in a
// fixed order.
export async function allRows(query,page=1000){
 const rows=[];
 for(;;){
  const found=await query().range(rows.length,rows.length+page-1);
  if(found.error)throw found.error;
  if(!found.data?.length)return rows;
  rows.push(...found.data);
 }
}

// Every farmer in one list, for the Players tab and the new-player funnel (src/admin-dashboard.js): when they joined and how they
// sign in, when they were last active, their level, days played, beginner guide step, VIP and family. The country, IP address and
// device are for the admin only, never for the moderators.
export async function handleAdminPlayers({admin,user,now=Date.now(),page=1000}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
 const owner=isSuperadmin(user);
 const [accounts,stats,farms,families]=await Promise.all([
  allRows(()=>admin.rpc('admin_player_accounts',{}),page),
  allRows(()=>admin.from('player_stats').select('player_id,username,level,currency,last_active_at,vip_expires_at,avatar_id').order('player_id'),page),
  allRows(()=>admin.from('player_farms').select('player_id,diamonds:state->diamonds,visits:state->login->visits,streak:state->login->streak,guide:state->onboarding->completed,guideDone:state->onboarding->rewardClaimed,family:state->family->familyId').order('player_id'),page),
  allRows(()=>admin.from('families').select('id,name').order('id'),page)
 ]);
 const stat=new Map(stats.map(s=>[s.player_id,s])),farm=new Map(farms.map(f=>[f.player_id,f])),family=new Map(families.map(f=>[f.id,f.name]));
 const players=accounts.map(a=>{
  const s=stat.get(a.player_id),f=farm.get(a.player_id);
  return {playerId:a.player_id,username:s?.username??null,level:s?.level??null,coins:s?.currency??null,diamonds:f?num(f.diamonds):null,avatarId:s?.avatar_id??null,
   createdAt:a.created_at,lastActiveAt:s?.last_active_at??null,lastSignInAt:a.last_sign_in_at??null,provider:a.provider??'email',
   online:s?isRecentlyActive(s.last_active_at,now):false,everPlayed:Boolean(s),vip:Date.parse(s?.vip_expires_at)>now,
   daysPlayed:num(f?.visits),streak:num(f?.streak),guide:num(f?.guide),guideDone:f?.guideDone===true,family:f?.family?family.get(f.family)??'A family':null,
   ...(owner?{country:a.country??null,ip:a.ip??null,device:deviceName(a.device)}:{})};
 });
 return respond(user,{players,owner,guideSteps:BEGINNER_QUESTS.length});
}

// One farmer: the account, time played, progress, what they spend their time on (the farm's own statistics), farm events, chat and
// invites, and the other accounts that last played from the same IP address (a second account dodging a chat ban shows up here). A
// moderator gets what moderating the chat needs: everything except the IP address itself, the country, the device, the Starter Pack
// and the purchases.
// Anything that fails to load beside the farm itself is left out, not fatal.
const ACTIVITY=[['harvested','Crops harvested'],['planted','Crops planted'],['watered','Crops watered'],['tended','Crops cared for'],['produced','Goods made'],['sold','Items sold'],
 ['deliveries','Orders delivered'],['dailies','Daily tasks'],['chores','Farm chores'],['activity_rounds','Helping hand rounds'],['tractor','Tractor fields'],['upgrades','Upgrades'],
 ['expansions','Field expansions'],['projects','Estate projects'],['boosts_used','Boosts used']];
export async function handleAdminPlayer({admin,user,playerId,now=Date.now()}){
 if(!(await isStaff(admin,user)))return respond(user,{error:'Not authorized.'},403);
 if(!/^[0-9a-f-]{36}$/i.test(String(playerId??'')))return respond(user,{error:'Unknown farmer.'},400);
 const owner=isSuperadmin(user),id=String(playerId);
 const quiet=promise=>Promise.resolve(promise).then(found=>found?.error?null:found).catch(()=>null);
 const [account,stat,farm,purchases,events,messages,reports,sanction,invitedBy,invited,membership]=await Promise.all([
  admin.rpc('admin_player_accounts',{p_player:id}),
  admin.from('player_stats').select('player_id,username,level,currency,last_active_at,vip_expires_at,avatar_id,events_finished').eq('player_id',id).maybeSingle(),
  admin.from('player_farms').select('state').eq('player_id',id).maybeSingle(),
  quiet(admin.from('harvest_purchases').select('pack,status,amount_cents,diamonds,livemode,created_at').eq('player_id',id).order('created_at',{ascending:false}).limit(20)),
  quiet(admin.from('live_event_players').select('qualified,diamonds,joined_at').eq('player_id',id).limit(500)),
  quiet(admin.from('chat_messages').select('id',{count:'exact',head:true}).eq('sender',id)),
  quiet(admin.from('chat_reports').select('id',{count:'exact',head:true}).eq('sender',id)),
  quiet(admin.from('chat_sanctions').select('muted_until,banned').eq('player_id',id).maybeSingle()),
  quiet(admin.from('referrals').select('referrer_id').eq('invitee_id',id).maybeSingle()),
  quiet(admin.from('referrals').select('invitee_id,qualified_at').eq('referrer_id',id).limit(200)),
  quiet(admin.from('family_members').select('family_id,role').eq('player_id',id).is('left_at',null).limit(1))
 ]);
 for(const found of [account,stat,farm])if(found.error)throw found.error;
 const a=account.data?.[0];if(!a)return respond(user,{error:'Unknown farmer.'},404);
 const s=stat.data,state=farm.data?.state??null,stats=state?.stats??{},member=membership?.data?.[0]??null,inviter=invitedBy?.data?.referrer_id??null;
 const [familyRow,inviterRow,network]=await Promise.all([
  member?quiet(admin.from('families').select('name').eq('id',member.family_id).maybeSingle()):null,
  inviter?quiet(admin.from('player_stats').select('username').eq('player_id',inviter).maybeSingle()):null,
  a.ip?quiet(admin.rpc('admin_player_accounts',{p_ip:a.ip}).range(0,20)):null
 ]);
 const shared=(network?.data??[]).filter(row=>row.player_id!==id).slice(0,20);
 const joined=events?.data??[],friends=invited?.data??[],muted=Date.parse(sanction?.data?.muted_until)>now;
 const player={playerId:id,username:s?.username??null,level:s?.level??null,avatarId:s?.avatar_id??null,coins:s?.currency??null,diamonds:state?num(state.diamonds):null,xp:state?num(state.xp):null,
  createdAt:a.created_at,lastActiveAt:s?.last_active_at??null,lastSignInAt:a.last_sign_in_at??null,provider:a.provider??'email',online:s?isRecentlyActive(s.last_active_at,now):false,everPlayed:Boolean(s),
  vipUntil:Date.parse(s?.vip_expires_at)>now?s.vip_expires_at:null,
  daysPlayed:num(state?.login?.visits),streak:num(state?.login?.streak),bestStreak:num(state?.login?.best),
  guide:num(state?.onboarding?.completed),guideDone:state?.onboarding?.rewardClaimed===true,guideTotal:BEGINNER_QUESTS.length,
  fields:Array.isArray(state?.plots)?state.plots.length:0,buildings:Object.values(state?.buildings??{}).filter(b=>b&&b.built!==false).length,
  family:member?{name:familyRow?.data?.name??'A family',role:member.role??'member'}:null,
  emailBonus:Boolean(state?.emailBonus),
  activity:ACTIVITY.map(([key,label])=>({key,label,count:num(stats[key])})).concat([{key:'events',label:'Farm events finished',count:num(s?.events_finished)}]),
  earned:{coins:num(stats.earned),diamonds:num(stats.diamonds_earned)},
  events:{joined:joined.length,finished:joined.filter(e=>e.qualified).length,diamonds:joined.reduce((sum,e)=>sum+num(e.diamonds),0)},
  chat:{messages:messages?.count??null,reported:reports?.count??null,muted,banned:sanction?.data?.banned===true},
  invites:{invitedBy:inviter?inviterRow?.data?.username??'A farmer':null,friends:friends.length,qualified:friends.filter(f=>f.qualified_at).length},
  sameNetwork:!a.ip?null:shared.map(row=>({playerId:row.player_id,username:row.username??null,everPlayed:row.username!=null})),
  ...(owner?{country:a.country??null,ip:a.ip??null,device:deviceName(a.device),userAgent:a.device??null,seenAt:a.seen_at??null,
   starter:{offeredAt:num(state?.starterOffer?.unlockedAt)||null,bought:state?.starterPackClaimed===true},
   purchases:(purchases?.data??[]).map(p=>({pack:p.pack,status:p.status,euros:num(p.amount_cents)/100,diamonds:num(p.diamonds),test:!p.livemode,createdAt:p.created_at}))}:{})};
 return respond(user,{player,owner});
}
