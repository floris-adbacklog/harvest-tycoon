import {isSuperadmin} from './admin-service.js';

// Reload everyone now (22 Oct 2026, the owner: a hard refresh for everyone after a release). The admin, never a moderator, sets one
// time in the database (supabase/force-reload.sql, site_reload: one row, only farm-api reads and writes it); every farm load's answer
// carries it as reloadAfter, and a game that opened before it reloads to the new version (src/app-update.js startForcedReload: only
// when /version.json is newer than the page, never during a purchase or while the farmer types, once per press). The farm is on the
// server, so nothing is lost. A load asks the database at most once per RELOAD_CACHE_MS per farm-api instance, beside the farm read, so
// it costs no extra round trip; a press reaches every open game within about a minute and a half (this cache plus the game's minute).
export const RELOAD_CACHE_MS=30000;
let cache={until:-Infinity,read:null};
export const forgetReloadCache=()=>{cache={until:-Infinity,read:null};};
const ms=value=>{const time=value==null?NaN:Date.parse(value);return Number.isFinite(time)?time:null;};

// The time as milliseconds, or null: never pressed, the table not there yet (farm-api may go live before the SQL) or a failed read.
// Never throws: a load never waits on or fails for this.
export function readReloadAfter(admin,now=Date.now()){
 if(cache.read&&now<cache.until)return cache.read;
 const read=Promise.resolve().then(()=>admin.from('site_reload').select('reload_after').eq('id',true).maybeSingle())
  .then(found=>found?.error?null:ms(found?.data?.reload_after)).catch(()=>null);
 cache={until:now+RELOAD_CACHE_MS,read};
 return read;
}

// operation 'admin_reload': {reload:true} sets the time to now; without it, when it was last pressed. The answer's time is lastReload,
// not reloadAfter, so the button's own answer never starts the admin's reload (their next load does, like everyone's).
export async function handleAdminReload({admin,body,user,now=Date.now()}){
 const respond=(data,status=200)=>({status,data:{...data,profile:{player_id:user?.id}}});
 if(!isSuperadmin(user))return respond({error:'Not authorized.'},403);
 if(body?.reload===true){
  const at=new Date(now).toISOString();
  const saved=await admin.from('site_reload').upsert({id:true,reload_after:at,set_by:user.id,updated_at:at}).select('reload_after').single();
  if(saved.error)throw saved.error;
  const time=ms(saved.data?.reload_after)??now;
  cache={until:now+RELOAD_CACHE_MS,read:Promise.resolve(time)};
  return respond({lastReload:time});
 }
 const found=await admin.from('site_reload').select('reload_after').eq('id',true).maybeSingle();
 if(found.error)throw found.error;
 return respond({lastReload:ms(found.data?.reload_after)});
}
