import {handleEvents} from './event-service.js';
import {handleSocial} from './social-service.js';
import {welcomeSummary} from './welcome-service.js';
import {savePlayerAvatar} from './avatar-service.js';
import {handlePlayerDirectory} from './player-profile-service.js';
import {handleFamily} from './family-service.js';
import {handleAdminGrant} from './admin-service.js';
import {handleAdminOnline,handleAdminRecentPlayers,handleAdminRetention,handleAdminInvites} from './admin-analytics-service.js';
import {handleInvite,linkInvite,qualifyInvite,qualifiedFriends} from './invite-service.js';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {createFarm,applyFarmAction,normalizeFarm,levelOf,xpForLevel,grantLevelRewards,grantChapterRewards,inviteeReward,inviterRewards} from './farm-state.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const nameValid=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token)return reply({error:'Please sign in.'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return reply({error:'Please sign in with your account.'},401);
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(!claims.session_id)return reply({error:'Your session has ended. Please sign in again.'},401);
  const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});
  if(active.error)throw active.error;
  if(!active.data)return reply({error:'Your session has ended. Please sign in again.'},401);
  const raw=await req.text();if(raw.length>4096)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  if(!['events','admin_events','social','load','action','rename','avatar','family','player_search','player_profile','admin_grant','admin_online','admin_recent_players','admin_retention','admin_invites','invite'].includes(body?.operation))return reply({error:'Unknown request.'},400);
  if(body.operation==='events'||body.operation==='admin_events'){const r=await handleEvents({admin,body,user});return reply(r.data,r.status);}
  if(body.operation==='social'){const r=await handleSocial({admin,body,user});return reply(r.data,r.status);}
  if(body.operation==='player_search'||body.operation==='player_profile'){
   const directory=await handlePlayerDirectory({admin,body,player:user.id});return reply(directory.data,directory.status);
  }
  if(body.operation==='admin_grant'){
   const granted=await handleAdminGrant({admin,body,user});return reply(granted.data,granted.status);
  }
  if(body.operation==='admin_online'){
   const online=await handleAdminOnline({admin,user});return reply(online.data,online.status);
  }
  if(body.operation==='admin_recent_players'){
   const recent=await handleAdminRecentPlayers({admin,user,limit:body.limit});return reply(recent.data,recent.status);
  }
  if(body.operation==='admin_retention'){
   const retention=await handleAdminRetention({admin,user});return reply(retention.data,retention.status);
  }
  if(body.operation==='admin_invites'){
   const invites=await handleAdminInvites({admin,user});return reply(invites.data,invites.status);
  }
  if(body.operation==='avatar'){
   const saved=await savePlayerAvatar({admin,player:user.id,avatarId:body.avatarId});return reply(saved.data,saved.status);
  }
  const profileResponse=await admin.from('player_stats').select('player_id,username,currency,level,avatar_id').eq('player_id',user.id).maybeSingle();
  if(profileResponse.error)throw profileResponse.error;
  let profile=profileResponse.data;
  const username=profile?.username??(nameValid(user.user_metadata?.username)?user.user_metadata.username.trim():null);
  if(!username)return reply({error:'Choose a player name to open your farm.',code:'USERNAME_REQUIRED'},409);
  // Sends each friend an invitation to this farmer's family, as this farmer's own family action; true when one was sent.
  async function inviteFriendsToFamily(friends:{playerId:string,invitedToFamily?:boolean}[]){
   let sent=false;
   for(const friend of friends){
    const found=await admin.from('player_farms').select('*').eq('player_id',user.id).maybeSingle();if(found.error||!found.data)return sent;
    try{
     const done=await handleFamily({admin,body:{operation:'action',action:{type:'family_invite',playerId:friend.playerId},requestId:crypto.randomUUID()},row:found.data,state:normalizeFarm(found.data.state,Date.now()),player:user.id,username});
     friend.invitedToFamily=done?.status===200;sent||=friend.invitedToFamily;
    }catch{friend.invitedToFamily=false;}
   }
   return sent;
  }
  if(body.operation==='rename'){
   if(!nameValid(body.username))return reply({error:'Use 3–20 letters, numbers, spaces, underscores or hyphens.'},400);
   const renamed=await admin.from('player_stats').update({username:body.username.trim()}).eq('player_id',user.id).select('player_id,username,currency,level,avatar_id').single();
   if(renamed.error)throw renamed.error;return reply({profile:renamed.data});
  }
  if(body.operation==='action'&&(!/^[0-9a-f-]{36}$/i.test(body.requestId??'')||!body.action||typeof body.action!=='object'))return reply({error:'Invalid farm action.'},400);
  // Keep one server-owned roll across optimistic concurrency retries.
  let choreRoll:number|undefined;
  const random=()=>choreRoll??=(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296);
  for(let attempt=0;attempt<5;attempt++){
   const found=await admin.from('player_farms').select('*').eq('player_id',user.id).maybeSingle();if(found.error)throw found.error;
   const row=found.data,now=Date.now();
   if(!row){
    const initial=createFarm(now);
    // Preserve only progress already stored on the server. Never import browser saves.
    if(profile){initial.coins=profile.currency;initial.xp=xpForLevel(profile.level);initial.xpOffset=0;}
    // A brand-new farm started from an invite link remembers who invited it (invite-service.js). An invite can never be
    // added to a farm that already exists, and a problem with it never stops the farm from opening.
    else{const invite=await linkInvite({admin,player:user.id,code:body.inviteCode??user.user_metadata?.invite,now}).catch((error:{code?:string})=>{console.error('Invite link failed',error?.code);return null;});if(invite)initial.invite=invite;}
    const created=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:0,p_state:initial,p_receipts:[],p_username:username,p_currency:initial.coins,p_level:levelOf(initial)});
    if(created.error)throw created.error;continue;
   }
   const state=normalizeFarm(row.state,now);
   profile={player_id:user.id,username,currency:state.coins,level:levelOf(state),avatar_id:profile?.avatar_id??'default'};
   // Every answer names whose farm it is; the game checks that before it trusts the answer (src/main.js).
   if(body.operation==='invite')return reply({...await handleInvite({admin,player:user.id,username,state,now}),profile});
   if(body.operation==='family'||(body.operation==='action'&&String(body.action.type).startsWith('family_'))){
    const familyResponse=await handleFamily({admin,body,row,state,player:user.id,username});
    if(!familyResponse)continue;return reply(familyResponse.data,familyResponse.status);
   }
   if(body.operation==='load'){
    const welcome=welcomeSummary(state,row.updated_at,now);
    const levelReward=grantLevelRewards(state),chapterReward=grantChapterRewards(state);
    // An admin gift waiting on this farm (admin-service.js) is shown once, here, then cleared — the same
    // "picked up on the next load, whether that is right now or after a reconnect" delivery as level/chapter
    // rewards above, so no separate push mechanism is needed for it either.
    const gift=state.pendingGift??null;if(gift)delete state.pendingGift;
    // Invite a friend: this farm's own reward at level 10 (also when it got there through a family reward), and the
    // rewards for friends it invited who reached level 10 since the last visit.
    const inviteReward=inviteeReward(state,now),friends=inviterRewards(state,await qualifiedFriends(admin,user.id).catch(()=>[]));
    if(welcome||levelReward.levels.length||chapterReward.chapters.length||gift||inviteReward||friends.length){
     const saved=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:row.revision,p_state:state,p_receipts:row.receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state)});
     if(saved.error)throw saved.error;if(!saved.data)continue;
     if(inviteReward)await qualifyInvite(admin,user.id,now).catch((error:{code?:string})=>console.error('Invite qualify failed',error?.code));
     const invite=inviteReward||friends.length?{reward:inviteReward,friends}:null;
     // A family leader's friend who reached level 10 gets an invitation to that family (the leader's own family action, so
     // every family rule applies: leader, room, no family yet). Then the reply carries the farm as it is after that.
     if(friends.length&&await inviteFriendsToFamily(friends)){
      const latest=await admin.from('player_farms').select('state,revision').eq('player_id',user.id).maybeSingle();
      if(!latest.error&&latest.data){const fresh=normalizeFarm(latest.data.state,now);return reply({state:fresh,profile:{...profile,currency:fresh.coins},levelReward,chapterReward,gift,welcome,invite,revision:latest.data.revision,serverNow:now});}
     }
     return reply({state,profile:{...profile,currency:state.coins},levelReward,chapterReward,gift,welcome,invite,revision:row.revision+1,serverNow:now});
    }
    return reply({state,profile,revision:row.revision,serverNow:now});
   }
   const previous=row.receipts.find((r:{id:string})=>r.id===body.requestId);
   if(previous)return reply({state,profile,result:previous.result,revision:row.revision,serverNow:now});
   let result;try{result=applyFarmAction(state,body.action,now,random);}catch(error){return reply({error:error.message,code:'ACTION_REJECTED'},422);}
   // Invite a friend: the action that brings an invited farm to level 10 pays its reward in the same save.
   const inviteReward=inviteeReward(state,now);if(inviteReward)result.inviteReward=inviteReward;
   const receipts=[...row.receipts,{id:body.requestId,result,eventAction:body.action.type}].slice(-100);
   const saved=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:row.revision,p_state:state,p_receipts:receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state)});
   if(saved.error)throw saved.error;
   if(saved.data){
    if(inviteReward)await qualifyInvite(admin,user.id,now).catch((error:{code?:string})=>console.error('Invite qualify failed',error?.code));
    return reply({state,profile:{...profile,currency:state.coins,level:levelOf(state)},result,revision:row.revision+1,serverNow:now});
   }
  }
  return reply({error:'Your farm changed in another tab. Please try again.'},409);
 }catch(error){console.error('Farm request failed',error.code??error.name);return reply({error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'},503);}
});
