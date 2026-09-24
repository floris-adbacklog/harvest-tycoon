// The chat and the notifications (supabase/chat.sql), straight to the database: reading goes through row-level security (a
// farmer only ever receives the chats they belong to, Realtime included), writing through the chat_* functions, which check who
// may say what. One Realtime channel per signed-in session brings new messages and notices in while the farm is open.
export const dmChannel=(a,b)=>{const [x,y]=[String(a),String(b)].sort();return `dm:${x}:${y}`;};
const MESSAGE_COLUMNS='id,channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body,created_at';
// The database says why in plain words ("Slow down a little."); a lost connection gets a sentence of its own.
export function chatError(error){
 const message=String(error?.message??'');
 if(!message||/failed to fetch|networkerror|load failed/i.test(message))return new Error('No connection right now. Try again in a moment.');
 return new Error(message);
}
export function createChatClient(supabase,{playerId,alive=()=>true}){
 const listeners=new Set();let channel=null;
 const check=()=>{if(!alive())throw new Error('Your session has ended.');};
 async function rpc(name,args){check();const {data,error}=await supabase.rpc(name,args);if(error)throw chatError(error);check();return data;}
 async function rows(query){check();const {data,error}=await query;if(error)throw chatError(error);check();return data??[];}
 const emit=event=>{for(const listener of listeners){try{listener(event);}catch{}}};
 function connect(){
  if(channel)return;
  channel=supabase.channel(`chat:${playerId}`)
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},payload=>emit({type:'message',message:payload.new}))
   .on('postgres_changes',{event:'DELETE',schema:'public',table:'chat_messages'},payload=>emit({type:'deleted',id:payload.old?.id}))
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'player_notices'},payload=>emit({type:'notice',notice:payload.new}))
   .subscribe(status=>{if(status==='SUBSCRIBED')emit({type:'connected'});});
 }
 return {
  playerId,
  dmChannel:other=>dmChannel(playerId,other),
  overview:()=>rpc('chat_overview'),
  myRole:()=>rpc('chat_my_role'),
  async messages(name,limit=50){
   const list=await rows(supabase.from('chat_messages').select(MESSAGE_COLUMNS).eq('channel',name).order('created_at',{ascending:false}).limit(limit));
   // The VIP mark belongs to the farmer, not the message: it shows as they are now, on older messages too.
   const ids=[...new Set(list.map(m=>m.sender))];
   if(ids.length){
    try{
     const {data,error}=await supabase.from('player_stats').select('player_id,vip_expires_at').in('player_id',ids);
     if(!error){const now=Date.now(),vip=new Set((data??[]).filter(r=>Date.parse(r.vip_expires_at)>now).map(r=>r.player_id));for(const m of list)m.sender_vip=vip.has(m.sender);}
    }catch{}
   }
   return list;
  },
  notices:(limit=30)=>rows(supabase.from('player_notices').select('id,player_id,kind,body,created_at').order('created_at',{ascending:false}).limit(limit)),
  send:(name,body)=>rpc('chat_send',{p_channel:name,p_body:body}),
  markRead:name=>rpc('chat_mark_read',{p_channel:name}),
  block:(player,on)=>rpc('chat_block',{p_player:player,p_on:on}),
  report:(message,reason=null)=>rpc('chat_report',{p_message:message,p_reason:reason}),
  reportPlayer:(player,reason=null)=>rpc('chat_report_player',{p_player:player,p_reason:reason}),
  playerStatus:player=>rpc('chat_player_status',{p_player:player}),
  setPrivate:on=>rpc('chat_set_private',{p_on:on}),
  // Staff (moderators and the admin); the database refuses anyone else.
  reports:()=>rpc('chat_mod_reports'),
  reportLog:()=>rpc('chat_mod_log'),
  deleteMessage:message=>rpc('chat_mod_delete',{p_message:message}),
  dismissReports:message=>rpc('chat_mod_dismiss',{p_message:message}),
  sanction:(player,minutes,ban,reason=null)=>rpc('chat_mod_sanction',{p_player:player,p_minutes:minutes,p_ban:ban,p_reason:reason}),
  donationRoom:()=>rpc('staff_donation_room'),
  donate:(coins,diamonds,message)=>rpc('staff_donate',{p_coins:coins,p_diamonds:diamonds,p_message:message}),
  // The admin only.
  setModerator:(player,on)=>rpc('staff_set_moderator',{p_player:player,p_on:on}),
  staffList:()=>rpc('staff_list'),
  postNews:(body,hours=24)=>rpc('chat_post_news',{p_body:body,p_hours:hours}),
  setLevels:(global,dm)=>rpc('chat_set_levels',{p_global:global,p_dm:dm}),
  subscribe(listener){listeners.add(listener);connect();return()=>listeners.delete(listener);},
  dispose(){listeners.clear();if(channel){void supabase.removeChannel(channel);channel=null;}}
 };
}
