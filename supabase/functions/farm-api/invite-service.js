// Invite a friend (rules and amounts: farm-state.js). Tables and the qualify function: supabase/invite-a-friend.sql.
import {INVITE_REWARD,INVITE_LEVEL,INVITE_LIMIT,INVITE_DAYS,INVITE_CODE,inviteCodeFrom,DAY_MS,levelOf} from './farm-state.js';
export const INVITE_SITE='https://www.harvesttycoon.com';
export const inviteLink=code=>`${INVITE_SITE}/?invite=${code}`;
const cleanCode=value=>typeof value==='string'&&INVITE_CODE.test(value.trim().toUpperCase())?value.trim().toUpperCase():null;

// This farmer's code, made the first time it is asked for (a clash with another code simply tries new letters).
export async function ensureInviteCode(admin,player,username,now=Date.now(),random=Math.random){
 const found=await admin.from('player_invite_codes').select('code').eq('player_id',player).maybeSingle();
 if(found.error)throw found.error;if(found.data)return found.data.code;
 for(let attempt=0;attempt<6;attempt++){
  const code=inviteCodeFrom(attempt<3?username:'',random);
  const made=await admin.from('player_invite_codes').insert({player_id:player,code,created_at:now});
  if(!made.error)return code;
  if(made.error.code!=='23505')throw made.error;
  const mine=await admin.from('player_invite_codes').select('code').eq('player_id',player).maybeSingle();if(mine.data)return mine.data.code;
 }
 throw new Error('Could not make an invite code. Please try again.');
}

// A new farm that started from an invite link: remember who invited it (once; a code of your own or an unknown code is
// ignored). Returns what goes into the new farm ({code, by, at}) or null.
export async function linkInvite({admin,player,code,now=Date.now()}){
 const clean=cleanCode(code);if(!clean)return null;
 const owner=await admin.from('player_invite_codes').select('player_id').eq('code',clean).maybeSingle();
 if(owner.error)throw owner.error;if(!owner.data||owner.data.player_id===player)return null;
 const name=await admin.from('player_stats').select('username').eq('player_id',owner.data.player_id).maybeSingle();
 if(name.error)throw name.error;
 const saved=await admin.from('referrals').upsert({invitee_id:player,referrer_id:owner.data.player_id,code:clean,created_at:now},{onConflict:'invitee_id',ignoreDuplicates:true});
 if(saved.error)throw saved.error;
 return {code:clean,by:name.data?.username??'A friend',at:now};
}

// The friend reached level 10 (their farm already holds their own reward): mark it, and the inviter's reward is decided.
export async function qualifyInvite(admin,player,now=Date.now()){
 const done=await admin.rpc('harvest_referral_qualify',{p_invitee:player,p_now:now,p_reward:INVITE_REWARD,p_limit:INVITE_LIMIT});
 if(done.error)throw done.error;return done.data;
}

// Friends of this farmer who reached level 10, with their names, for the inviter's reward on load.
export async function qualifiedFriends(admin,player){
 const rows=await admin.from('referrals').select('invitee_id,referrer_diamonds').eq('referrer_id',player).not('qualified_at','is',null).gt('referrer_diamonds',0);
 if(rows.error)throw rows.error;if(!rows.data.length)return [];
 const names=await admin.from('player_stats').select('player_id,username').in('player_id',rows.data.map(r=>r.invitee_id));
 if(names.error)throw names.error;
 return rows.data.map(r=>({...r,username:names.data.find(n=>n.player_id===r.invitee_id)?.username}));
}

// Everything the Invite a friend screen shows. A friend's status: playing (with their level), rewarded, limit (they reached
// level 10 after you already earned for 10 friends) or expired (30 days passed before level 10). Amounts: farm-state.js.
export function inviteStatus(row,now){
 if(row.qualified_at)return row.referrer_diamonds>0?'rewarded':'limit';
 return now-row.created_at>INVITE_DAYS*DAY_MS?'expired':'playing';
}
export async function handleInvite({admin,player,username,state,now=Date.now()}){
 const code=await ensureInviteCode(admin,player,username,now);
 const rows=await admin.from('referrals').select('invitee_id,created_at,qualified_at,referrer_diamonds').eq('referrer_id',player).order('created_at',{ascending:false}).limit(50);
 if(rows.error)throw rows.error;
 const ids=rows.data.map(r=>r.invitee_id);
 const stats=ids.length?await admin.from('player_stats').select('player_id,username,level').in('player_id',ids):{data:[]};
 if(stats.error)throw stats.error;
 const friends=rows.data.map(r=>{const p=stats.data.find(s=>s.player_id===r.invitee_id);return {name:p?.username??'A friend',level:p?.level??1,status:inviteStatus(r,now)};});
 const earned=rows.data.filter(r=>r.qualified_at&&r.referrer_diamonds>0).length;
 const invitedBy=state.invite?{name:state.invite.by,level:levelOf(state),rewarded:!!state.invite.rewardedAt,expired:!state.invite.rewardedAt&&now-state.invite.at>INVITE_DAYS*DAY_MS}:null;
 return {code,link:inviteLink(code),rules:{reward:INVITE_REWARD,level:INVITE_LEVEL,limit:INVITE_LIMIT,days:INVITE_DAYS},earned,friends,invitedBy,serverNow:now};
}
