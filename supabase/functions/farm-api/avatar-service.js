import {isPlayerAvatar,playerAvatar,avatarLevel} from './player-avatars.js';

// Called only after the verified user and active session checks in index.ts.
// Never accept a target player ID, image URL, balance or other profile field from the body.
// A level avatar is saved only when the farmer's level (player_stats.level, which only the server writes) has reached it: the
// update itself carries the condition, so a farmer below it changes nothing.
export async function savePlayerAvatar({admin,player,avatarId,now=Date.now()}){
 if(!isPlayerAvatar(avatarId))return {status:400,data:{error:'Choose one of the available farmer avatars.'}};
 const level=avatarLevel(avatarId);
 let update=admin.from('player_stats').update({avatar_id:avatarId,last_active_at:new Date(now).toISOString()}).eq('player_id',player);
 if(level>1)update=update.gte('level',level);
 const {data,error}=await update.select('player_id,username,currency,level,avatar_id').maybeSingle();
 if(error)throw error;
 if(!data){
  if(level>1){
   const found=await admin.from('player_stats').select('level').eq('player_id',player).maybeSingle();
   if(found.error)throw found.error;
   if(found.data)return {status:403,data:{error:`Reach level ${level} to use the ${playerAvatar(avatarId).name} avatar.`}};
  }
  return {status:409,data:{error:'Open your farm before choosing an avatar.'}};
 }
 return {status:200,data:{profile:data,serverNow:now}};
}
