// The Double XP weekend (27 Oct 2026, the owner; supabase/xp-weekend.sql, farm-state.js setXpWeekend). The admin starts it from the
// Admin panel; farm-api reads the latest one from the database at most once per XP_WEEKEND_CACHE_MS per instance, beside the farm read,
// so it costs no extra round trip, and sets it in farm-state.js before it works out a farm. Every load and action answer carries it
// (xpWeekend), so the game shows it and works its taps out the same way. A start or a stop reaches farm-api within the cache's time.
export const XP_WEEKEND_CACHE_MS=30000;
let cache={until:-Infinity,read:null};
export const forgetXpWeekendCache=()=>{cache={until:-Infinity,read:null};};
const ms=value=>{const time=value==null?NaN:Date.parse(value);return Number.isFinite(time)?time:null;};

// The weekend as farm-state.js takes it ({id, startsAt, endsAt}: its real end, so a stopped one ends when it was stopped), from rows
// newest first: the one running at now, else the next one to come, else null. A row that was stopped before it began is none.
export function pickXpWeekend(rows,now=Date.now()){
 const weekends=(Array.isArray(rows)?rows:[]).map(r=>{const startsAt=ms(r?.starts_at),planned=ms(r?.ends_at),stopped=ms(r?.stopped_at);
  const endsAt=stopped==null?planned:Math.min(planned??stopped,stopped);
  return typeof r?.id==='string'&&startsAt!=null&&endsAt!=null&&endsAt>startsAt?{id:r.id,startsAt,endsAt}:null;}).filter(Boolean);
 return weekends.find(w=>now>=w.startsAt&&now<w.endsAt)??weekends.filter(w=>w.startsAt>now).sort((a,b)=>a.startsAt-b.startsAt)[0]??null;
}

// Never throws and never waits on more than one read: a load or an action never fails for this (no table yet, as before the SQL: null).
export function readXpWeekend(admin,now=Date.now()){
 if(cache.read&&now<cache.until)return cache.read;
 const read=Promise.resolve().then(()=>admin.from('harvest_xp_weekends').select('id,starts_at,ends_at,stopped_at')
  .gt('ends_at',new Date(now).toISOString()).order('starts_at',{ascending:false}).limit(5))
  .then(found=>found?.error?null:pickXpWeekend(found?.data,Date.now())).catch(()=>null);
 cache={until:now+XP_WEEKEND_CACHE_MS,read};
 return read;
}
