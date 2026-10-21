import {checkWornLook} from './farm-state.js';

// What a farmer wears on their card (the Season Pass, Oct 2026): a frame, a badge, a title, a chat name colour and a profile background,
// each one they collected (state.looks, or the avatar that came with a season they bought) or none. Called only after the verified user
// and active session checks in index.ts; the body names looks, never a player, a picture or a colour. The whole set is written at once
// (player_stats.look, supabase/season-pass-engine.sql), so a slot left out is taken off. The float, the rod and the tractor paint are in
// the farm itself (the action season_look); the avatar goes through avatar-service.js.
export async function saveLook({admin,player,look,now=Date.now()}){
 const farm=await admin.from('player_farms').select('looks:state->looks,passes:state->passPremium').eq('player_id',player).maybeSingle();
 if(farm.error)throw farm.error;
 if(!farm.data)return {status:409,data:{error:'Open your farm before choosing a look.'}};
 let worn;
 try{worn=checkWornLook({looks:Array.isArray(farm.data.looks)?farm.data.looks:[],passPremium:Array.isArray(farm.data.passes)?farm.data.passes:[]},look);}
 catch(error){return {status:403,data:{error:error.message}};}
 const {data,error}=await admin.from('player_stats').update({look:worn,last_active_at:new Date(now).toISOString()}).eq('player_id',player).select('player_id,look').maybeSingle();
 if(error)throw error;if(!data)return {status:409,data:{error:'Open your farm before choosing a look.'}};
 // The profile row comes back too (21 Oct 2026, the owner: "Use" on the first free reward showed "Reconnecting…"): the page's bridge
 // takes an answer without the farmer's own profile.player_id for a session that has ended (src/main.js), as for the avatar.
 return {status:200,data:{look:data.look,profile:{player_id:data.player_id,look:data.look},serverNow:now}};
}
