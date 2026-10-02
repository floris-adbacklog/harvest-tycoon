// Where a new farmer came from (2 Oct 2026, supabase/player-attribution.sql): written once, when a brand-new farm is created (index.ts),
// from what the sign-in page read from the address the farmer landed on (src/source-link.js), sent with the first farm load or, for an
// email sign-up, kept on the account (user_metadata.source). Neither is trusted: every field is checked again here, and the ad click
// ids are only yes or no. A farm that brings no source at all (an old game tab) gets no record ("Not recorded" in the dashboard); one
// that brings an empty source counts as Direct. The first record stays.
import {deviceName} from './admin-analytics-service.js';
export const SOURCE_TAG=/^[a-z0-9][a-z0-9_.-]{0,47}$/,SOURCE_UTM=/^[\p{L}\p{N} _.+\-/|:]{1,100}$/u,SOURCE_HOST=/^[a-z0-9.-]{1,100}$/,SOURCE_PATH=/^\/[A-Za-z0-9/_.-]{0,63}$/;
export const SOURCE_APPS=Object.freeze(['facebook','instagram','threads','tiktok']);
export function cleanSource(raw){
 const s=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},text=(value,valid)=>typeof value==='string'&&valid.test(value)?value:null;
 return {src:text(s.src,SOURCE_TAG),utm_source:text(s.utm_source,SOURCE_UTM),utm_medium:text(s.utm_medium,SOURCE_UTM),utm_campaign:text(s.utm_campaign,SOURCE_UTM),utm_content:text(s.utm_content,SOURCE_UTM),
  referrer_host:text(s.ref,SOURCE_HOST),has_fbclid:s.fb===true,has_ttclid:s.tt===true,has_gclid:s.g===true,in_app:SOURCE_APPS.includes(s.via)?s.via:null,landing_path:text(s.lp,SOURCE_PATH)};
}
export async function recordSource({admin,player,source,headers,language,now=Date.now()}){
 if(!source||typeof source!=='object'||Array.isArray(source))return null;
 const row={player_id:player,...cleanSource(source),language:typeof language==='string'&&/^[a-z]{2}$/.test(language)?language:null,
  device:deviceName(headers?.get?.('user-agent'))?.slice(0,60)??null,created_at:new Date(now).toISOString()};
 const saved=await admin.from('player_attribution').upsert(row,{onConflict:'player_id',ignoreDuplicates:true});
 if(saved.error)throw saved.error;
 return row;
}
