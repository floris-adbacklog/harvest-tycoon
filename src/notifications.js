import {createPush} from './push.js';
// Reminder preferences for the settings dialog. Reads go through row-level security (a player only sees their
// own row) and writes go through the notification_save function, which validates everything on the server.
export const DEFAULT_PREFS=Object.freeze({pushCrops:false,pushProduction:false,pushDaily:false,emailDigest:false,digestHour:9,pushMessages:false});

export function browserTimezone(){
 try{return Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC';}catch{return 'UTC';}
}
const validHour=value=>Number.isInteger(value)&&value>=0&&value<=23;

// No row yet means every reminder is off: nothing is ever switched on for a player.
export function prefsFromRow(row){
 if(!row)return {...DEFAULT_PREFS};
 return {pushCrops:row.push_crops===true,pushProduction:row.push_production===true,pushDaily:row.push_daily===true,emailDigest:row.email_digest===true,digestHour:validHour(row.digest_hour)?row.digest_hour:DEFAULT_PREFS.digestHour,pushMessages:row.push_messages===true};
}
export function paramsFromPrefs(prefs,timezone=browserTimezone()){
 const hour=Number(prefs.digestHour);
 return {p_push_crops:prefs.pushCrops===true,p_push_production:prefs.pushProduction===true,p_push_daily:prefs.pushDaily===true,p_email_digest:prefs.emailDigest===true,p_digest_hour:validHour(hour)?hour:DEFAULT_PREFS.digestHour,p_timezone:timezone,p_push_messages:prefs.pushMessages===true};
}

// `available` only turns true when the notification service answers its config request. Until then the
// settings dialog does not show reminder switches that would not do anything yet.
export function createNotifications(supabase,{configUrl=null,fetchImpl=globalThis.fetch,timezone=browserTimezone,win=globalThis.window}={}){
 let available=false,config=null;
 const ready=(async()=>{
  if(!configUrl||typeof fetchImpl!=='function')return;
  try{const response=await fetchImpl(configUrl);if(!response.ok)return;const body=await response.json();if(body?.enabled===true){available=true;config=body;}}catch{}
 })();
 const push=createPush({supabase,getKey:async()=>{await ready;return config?.vapidPublicKey??null;},win});
 return {
  ready,
  get available(){return available;},
  get config(){return config;},
  // Device notifications, only when the service has push switched on.
  get push(){return config?.push?push:null;},
  async get(){
   const {data,error}=await supabase.from('notification_settings').select('push_crops,push_production,push_daily,email_digest,digest_hour,push_messages').maybeSingle();
   if(error)throw error;return prefsFromRow(data);
  },
  async save(prefs){
   const params=paramsFromPrefs(prefs,timezone());
   const {error}=await supabase.rpc('notification_save',params);if(error)throw error;
   return {pushCrops:params.p_push_crops,pushProduction:params.p_push_production,pushDaily:params.p_push_daily,emailDigest:params.p_email_digest,digestHour:params.p_digest_hour,pushMessages:params.p_push_messages};
  }
 };
}
