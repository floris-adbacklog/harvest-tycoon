import {isPlayerAvatar,playerAvatar,avatarLevel,avatarGoal,avatarOpen} from './player-avatars.js';

// Called only after the verified user and active session checks in index.ts.
// Never accept a target player ID, image URL, balance or other profile field from the body.
// A level avatar is saved only when the farmer's level (player_stats.level, which only the server writes) has reached it: the
// update itself carries the condition, so a farmer below it changes nothing. An achievement avatar is checked against the farm's own
// numbers first (player-avatars.js AVATAR_GOALS); those only ever go up, so a goal reached stays reached.
export async function savePlayerAvatar({admin,player,avatarId,now=Date.now()}){
 if(!isPlayerAvatar(avatarId))return {status:400,data:{error:'Choose one of the available farmer avatars.'}};
 const goal=avatarGoal(avatarId),name=playerAvatar(avatarId).name;
 if(goal){
  const [farm,stats]=await Promise.all([
   admin.from('player_farms').select('stats:state->stats,login:state->login,claimed:state->mastery->claimed,invites:state->inviteRewards').eq('player_id',player).maybeSingle(),
   admin.from('player_stats').select('events_finished').eq('player_id',player).maybeSingle()
  ]);
  if(farm.error)throw farm.error;if(stats.error)throw stats.error;
  if(!farm.data||!stats.data)return {status:409,data:{error:'Open your farm before choosing an avatar.'}};
  const f=farm.data,state={stats:f.stats??{},login:f.login??{},mastery:{claimed:Array.isArray(f.claimed)?f.claimed:[]},inviteRewards:Array.isArray(f.invites)?f.invites:[]};
  if(!avatarOpen(avatarId,{state,events:stats.data.events_finished}))return {status:403,data:{error:`${goal.text} to use the ${name} avatar.`}};
 }
 const level=avatarLevel(avatarId);
 let update=admin.from('player_stats').update({avatar_id:avatarId,last_active_at:new Date(now).toISOString()}).eq('player_id',player);
 if(level>1)update=update.gte('level',level);
 const {data,error}=await update.select('player_id,username,currency,level,avatar_id').maybeSingle();
 if(error)throw error;
 if(!data){
  if(level>1){
   const found=await admin.from('player_stats').select('level').eq('player_id',player).maybeSingle();
   if(found.error)throw found.error;
   if(found.data)return {status:403,data:{error:`Reach level ${level} to use the ${name} avatar.`}};
  }
  return {status:409,data:{error:'Open your farm before choosing an avatar.'}};
 }
 return {status:200,data:{profile:data,serverNow:now}};
}
