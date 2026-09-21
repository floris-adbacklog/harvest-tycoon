import {isPlayerAvatar} from './player-avatars.js';

// Called only after the verified user and active session checks in index.ts.
// Never accept a target player ID, image URL, balance or other profile field from the body.
export async function savePlayerAvatar({admin,player,avatarId,now=Date.now()}){
 if(!isPlayerAvatar(avatarId))return {status:400,data:{error:'Choose one of the available farmer avatars.'}};
 const {data,error}=await admin.from('player_stats').update({avatar_id:avatarId,last_active_at:new Date(now).toISOString()}).eq('player_id',player).select('player_id,username,currency,level,avatar_id').maybeSingle();
 if(error)throw error;
 if(!data)return {status:409,data:{error:'Open your farm before choosing an avatar.'}};
 return {status:200,data:{profile:data,serverNow:now}};
}
