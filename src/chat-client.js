// The chat and the notifications (supabase/chat.sql), straight to the database: reading goes through row-level security (a
// farmer only ever receives the chats they belong to, Realtime included), writing through the chat_* functions, which check who
// may say what. One Realtime channel per signed-in session brings new messages and notices in while the farm is open.
export const dmChannel=(a,b)=>{const [x,y]=[String(a),String(b)].sort();return `dm:${x}:${y}`;};
const MESSAGE_COLUMNS='id,channel,sender,sender_name,sender_avatar,sender_staff,sender_vip,body,created_at,edited_at,edited_by_moderator';
// A family request card (supabase/family-request-chat.sql) carries its kind and details; until that is in the database the chat
// reads the columns it always had.
const CARD_COLUMNS=`${MESSAGE_COLUMNS},kind,meta`;let cards=true;
// The database says why in plain words ("Write 1–200 characters."); a lost connection gets a sentence of its own.
// Oct 2026: a request that was cut off or timed out ("AbortError: …", "TimeoutError: …") is no connection either, and a sign-in
// that ran out ("JWT expired") says so. The pace limit names itself: "Slow down a little." told 8 farmers in a week nothing about
// the 2 seconds (supabase/chat.sql; the 12 a minute it also keeps is never reached by players, at most 6 so far).
// What Postgres or its API says in their own words ("permission denied for function chat_send", "Could not find the function … in
// the schema cache", the English line farmers saw while the Crew went live on 1 Oct) is no refusal of ours and has no translation:
// the farmer reads the general text in their own language. Ours start with a capital (supabase/*.sql, a test keeps them so),
// Postgres starts in lower case and the API's have a PGRST code. raw keeps the words for the staff dashboard (src/admin-dashboard.js).
const OFFLINE=/failed to fetch|networkerror|load failed|network connection was lost|abort|timed out|timeout/i,EXPIRED=/\bJWT\b|\bJWS|^Auth\w*Error|refresh token|session missing/i;
const RAW=/^[^\p{Lu}]|^[A-Z]\w*Error:|schema cache|upstream|violates|does not exist|permission denied/u;
export function chatError(error){
 const message=String(error?.message??'').trim(),code=String(error?.code??''),said=text=>Object.assign(new Error(text),message&&message!==text?{raw:message}:{});
 if(!message||OFFLINE.test(message)||/^(AbortError|TimeoutError)$/.test(error?.name??''))return said('No connection right now. Try again in a moment.');
 if(/^PGRST30\d$/.test(code)||EXPIRED.test(message))return said('Your session has ended. Please sign in again.');
 if(message==='Slow down a little.')return said('Slow down: one message every 2 seconds.');
 if(code.startsWith('PGRST')||RAW.test(message))return said('That did not work. Please try again.');
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
   .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages'},payload=>emit({type:'edited',message:payload.new}))
   .on('postgres_changes',{event:'INSERT',schema:'public',table:'player_notices'},payload=>emit({type:'notice',notice:payload.new}))
   .subscribe(status=>{if(status==='SUBSCRIBED')emit({type:'connected'});});
 }
 return {
  playerId,
  dmChannel:other=>dmChannel(playerId,other),
  overview:()=>rpc('chat_overview'),
  myRole:()=>rpc('chat_my_role'),
  // The newest messages of a channel; before (a created_at): the ones just older than that (Load earlier messages, Oct 2026).
  async messages(name,limit=50,before=null){
   const read=columns=>{let q=supabase.from('chat_messages').select(columns).eq('channel',name);if(before)q=q.lt('created_at',before);return q.order('created_at',{ascending:false}).limit(limit);};
   let list;
   if(cards){check();const first=await read(CARD_COLUMNS);if(first.error?.code==='42703')cards=false;else{if(first.error)throw chatError(first.error);check();list=first.data??[];}}
   if(!cards)list=await rows(read(MESSAGE_COLUMNS));
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
  notices:(limit=30)=>rows(supabase.from('player_notices').select('id,player_id,kind,body,texts,created_at').order('created_at',{ascending:false}).limit(limit)),
  // Mentions (3 Oct 2026, supabase/chat-mentions.sql) go with the message as farmer ids, only when there are any. Before that file is in
  // the database (no function with p_mentions: PGRST202) the message still goes, its "@Name" as plain words.
  async send(name,body,mentions=[]){
   if(!mentions?.length)return rpc('chat_send',{p_channel:name,p_body:body});
   check();const {data,error}=await supabase.rpc('chat_send',{p_channel:name,p_body:body,p_mentions:mentions});
   if(error?.code==='PGRST202')return rpc('chat_send',{p_channel:name,p_body:body});
   if(error)throw chatError(error);check();return data;
  },
  markRead:name=>rpc('chat_mark_read',{p_channel:name}),
  block:(player,on)=>rpc('chat_block',{p_player:player,p_on:on}),
  report:(message,reason=null)=>rpc('chat_report',{p_message:message,p_reason:reason}),
  reportPlayer:(player,reason=null)=>rpc('chat_report_player',{p_player:player,p_reason:reason}),
  playerStatus:player=>rpc('chat_player_status',{p_player:player}),
  setPrivate:on=>rpc('chat_set_private',{p_on:on}),
  // The admin only: a notice in Notifications for every in-game purchase (supabase/purchase-alerts.sql).
  setPurchaseAlerts:on=>rpc('chat_set_purchase_alerts',{p_on:on}),
  // Farmers' pictures (the same public table as the leaderboard), for the staff dashboard's lists.
  async faces(ids){
   const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return new Map();
   const {data,error}=await supabase.from('player_stats').select('player_id,avatar_id').in('player_id',unique.slice(0,200));
   return error?new Map():new Map((data??[]).map(r=>[r.player_id,r.avatar_id]));
  },
  // The farmers the mention list offers from the chat (3 Oct 2026): their name, level and picture as they are now (a rename since their
  // last message: the database checks "@Name" against the name of now).
  async cards(ids){
   const unique=[...new Set(ids.filter(Boolean))];if(!unique.length)return [];
   const {data,error}=await supabase.from('player_stats').select('player_id,username,level,avatar_id').in('player_id',unique.slice(0,50));
   return error?[]:(data??[]).map(r=>({playerId:r.player_id,username:r.username,level:r.level,avatarId:r.avatar_id}));
  },
  // Feedback & bugs (supabase/feedback.sql): any farmer sends one; a limit reached keeps its code (54000), so the game can say it
  // in the farmer's own language.
  async sendFeedback({kind,body,level=null,device=null,language=null}){
   check();const {error}=await supabase.rpc('feedback_send',{p_kind:kind,p_body:body,p_level:level,p_device:device,p_language:language});
   if(error){const failure=chatError(error);failure.code=error.code;throw failure;}
  },
  // The staff read them (open or done) and mark them done.
  feedbackList:(done=false)=>rpc('feedback_list',{p_done:done}),
  feedbackHandle:(id,done=true)=>rpc('feedback_handle',{p_id:id,p_done:done}),
  // Staff (moderators and the admin); the database refuses anyone else.
  reports:()=>rpc('chat_mod_reports'),
  reportLog:()=>rpc('chat_mod_log'),
  // The partner programme, for the admin (supabase/partners.sql): partners and payout requests, and marking one paid or rejected.
  partnerList:()=>rpc('partner_admin_list'),
  partnerPayout:(id,status)=>rpc('partner_admin_payout',{p_id:id,p_status:status}),
  // The admin takes a handled report out of the log (supabase/chat-report-log-remove.sql).
  reportLogRemove:message=>rpc('chat_mod_log_remove',{p_message:message}),
  deleteMessage:message=>rpc('chat_mod_delete',{p_message:message}),
  // Staff only (supabase/chat-edit-message.sql): the same rules as sending; everyone sees it marked as edited.
  editMessage:(message,body)=>rpc('chat_mod_edit',{p_message:message,p_body:body}),
  dismissReports:message=>rpc('chat_mod_dismiss',{p_message:message}),
  sanction:(player,minutes,ban,reason=null)=>rpc('chat_mod_sanction',{p_player:player,p_minutes:minutes,p_ban:ban,p_reason:reason}),
  donationRoom:()=>rpc('staff_donation_room'),
  // To whom: 'all', 'active' (this week), 'online' (now) or 'player' with that farmer's id (supabase/staff-gift-audience.sql).
  donate:(coins,diamonds,message,audience='all',player=null,perLevel=false)=>rpc('staff_donate',{p_coins:coins,p_diamonds:diamonds,p_message:message,p_audience:audience,p_player:player,p_per_level:perLevel===true}),
  // The admin only.
  setModerator:(player,on)=>rpc('staff_set_moderator',{p_player:player,p_on:on}),
  staffList:()=>rpc('staff_list'),
  // News, pop-ups and the private message to many: with each language's own text, if the admin wrote one (supabase/admin-texts-languages.sql).
  // minLevel (4 Oct 2026, supabase/news-min-level.sql): only farmers from that level see it; 1 is everyone.
  postNews:(body,hours=24,texts=null,minLevel=1)=>rpc('chat_post_news',{p_body:body,p_hours:hours,p_texts:texts,p_min_level:minLevel}),
  // Who is admin or moderator, for the mark beside their name (src/staff-badge.js); not the Admin dashboard's staffList above.
  staffRoles:()=>rpc('chat_staff_list'),
  // The admin's welcome message to every new farmer (supabase/welcome-dm.sql).
  welcomeGet:()=>rpc('welcome_dm_get'),
  // sender (Oct 2026, supabase/gerard.sql): which admin the welcome comes from, Tony or Gerard; without it the one who saves.
  welcomeSave:({enabled,body,delay,sender})=>rpc('welcome_dm_save',sender?{p_enabled:enabled,p_body:body,p_delay:delay,p_sender:sender}:{p_enabled:enabled,p_body:body,p_delay:delay}),
  // One language's own welcome text; an empty one goes back to English (supabase/welcome-dm-languages.sql).
  welcomeSaveText:({language,body})=>rpc('welcome_dm_save_text',{p_language:language,p_body:body}),
  // The admin's private message to many farmers at once (supabase/chat-broadcast-dm.sql): count first, then send; from a farm
  // level too (supabase/chat-broadcast-level.sql).
  broadcastDm:({body='',audience,send=false,minLevel=1,texts=null})=>rpc('chat_broadcast_dm',{p_body:body,p_audience:audience,p_send:send,p_min_level:minLevel,p_texts:texts}),
  // Pop-ups (supabase/popups.sql): news that also opens once as a pop-up. Posting, the list and stopping are for the admin only.
  postPopup:({title,body,buttonLabel=null,buttonTarget=null,audience='all',minLevel=1,hours=24,news=true,texts=null})=>rpc('popup_post',{p_title:title,p_body:body,p_button_label:buttonLabel,p_button_target:buttonTarget,p_audience:audience,p_min_level:minLevel,p_hours:hours,p_news:news,p_texts:texts}),
  popupList:()=>rpc('popup_list'),
  stopPopup:id=>rpc('popup_stop',{p_id:id}),
  popups:()=>rpc('popup_next'),
  popupSeen:id=>rpc('popup_seen',{p_id:id}),
  // Special offers (supabase/special-offer.sql): posting, the list and stopping are for the admin only.
  postOffer:({diamonds=0,coins=0,vipDays=0,audience='all',minLevel=14,hours=48})=>rpc('offer_post',{p_diamonds:diamonds,p_coins:coins,p_vip_days:vipDays,p_audience:audience,p_min_level:minLevel,p_hours:hours}),
  offerList:()=>rpc('offer_list'),
  stopOffer:id=>rpc('offer_stop',{p_id:id}),
  setLevels:(global,dm)=>rpc('chat_set_levels',{p_global:global,p_dm:dm}),
  subscribe(listener){listeners.add(listener);connect();return()=>listeners.delete(listener);},
  dispose(){listeners.clear();if(channel){void supabase.removeChannel(channel);channel=null;}}
 };
}
