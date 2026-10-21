// Loads that stalled (15 Oct 2026, the 12% report, option 5; supabase/load-stalls.sql). When the farm does not finish loading, the page
// leaves a short note in its tab (public/loading-screen.js LOAD_STALL_KEY) and the next farm load brings it along (src/supabase.js
// takeStall): what happened, at which step, how long the player waited (in view and in all), whether the page was ever out of view,
// online, the connection's protocol and which of the farm page's own files never arrived. No cookies needed, so every stall is seen,
// the iPhone app's too. Nothing in it is trusted: every field is checked again here, and anything that does not fit is left out (null).
// The row names no player, no IP address and no user agent: only the platform and the device type (admin-analytics-service.js). Kept
// 90 days: each new row clears the older ones. A failure here never reaches the farm (index.ts runs it beside the load).
// 15 Oct 2026, review fixes: the time is kept to the hour only, not the moment of the load that brought the note (player_seen and the
// player log keep that one, with the same platform and device: the two could be matched). And the note's own random id (note_id, unique)
// counts it once: a load that failed or took too long is sent again as it was (src/connection.js withRetry), the note with it.
import {platformOf,deviceName} from './admin-analytics-service.js';
// kind: 'auto' the farm opened again by itself, 'card' Try again, 'reload_hung' its reload got no answer and Try again showed, 'left'
// the page went while still loading, 'refresh' the player refreshed it by hand, 'part' (18 Oct 2026) the farm opened but one of the
// farm page's own parts broke on the way (src/game-cloud.js part; its error in error), 'lost' (21 Oct 2026) the 3D view was lost during
// play or while loading, 'crash' the last start ended under the player without a minute of play (public/graphics-mode.js; both written by
// the farm itself, loading-screen.js noteOnDevice). step: loading-screen.js loadStep's words and 'frame'
// (farmHandOver), the same as src/analytics.js LOAD_STEPS (tests/load-stall.test.mjs keeps them equal).
export const STALL_KINDS=Object.freeze(['auto','card','reload_hung','left','refresh','part','lost','crash']);
export const STALL_STEPS=Object.freeze(['code','models','account','scene','village','frame']);
export const STALL_PROTOCOLS=Object.freeze(['h2','h3','http/1.1','http/1.0']);
export const STALL_FILE=/^\/[A-Za-z0-9._/-]{1,100}$/;
export const STALL_ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const STALL_KEEP_DAYS=90,STALL_MAX_FILES=5;
// 18 Oct 2026 (the 12% report, option 1): how far the farm page's start came (src/game-cloud.js harvestStartup.stage, the same words as
// public/loading-screen.js STARTUP_STAGES) and the first thing that broke there (errorLine: name, message, file and line). The message is
// kept to one line of at most 160 characters with any e-mail address taken out; nothing else in it names a player. Characters as
// Postgres counts them (code points), and no half of an emoji left on its own: Postgres refuses such a string, and the whole row with it
// (review of 18 Oct 2026).
export const STALL_STAGES=Object.freeze(['begin','watch','parts','game','farm','ready']);
export const STALL_ERROR_MAX=160;
// 21 Oct 2026 (a Pixel 10 Pro Fold that lost its 3D view): the graphics chip's name as the browser tells it (one line, at most 100
// characters, no e-mail address) and the mode the farm ran in (public/graphics-mode.js GFX_MODES).
export const STALL_GPU_MAX=100,STALL_GFX=Object.freeze(['full','noshadow','simple']);
export function stallGpu(value){
 const line=stallError(value);return line?Array.from(line).slice(0,STALL_GPU_MAX).join('').trim()||null:null;
}
export function stallError(value){
 if(typeof value!=='string')return null;
 const clean=value.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,'').replace(/[\u0000-\u001f\u007f]+/g,' ').replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[email]').replace(/\s+/g,' ').trim();
 const line=Array.from(clean).slice(0,STALL_ERROR_MAX).join('').trim();
 return line||null;
}
const DAY=86400000,HOUR=3600000,AHEAD=5*60000;
const plain=value=>Boolean(value)&&typeof value==='object'&&!Array.isArray(value);
const whole=(value,max)=>Number.isSafeInteger(value)&&value>=0&&value<=max?value:null;
const yes=value=>typeof value==='boolean'?value:null;
export function stallRow(note,{platform,agent,portal,staff,now=Date.now()}={}){
 if(!plain(note)||!STALL_KINDS.includes(note.kind)||!STALL_STEPS.includes(note.step))return null;
 if(typeof note.at!=='number'||!Number.isFinite(note.at)||note.at<now-DAY||note.at>now+AHEAD)return null;
 const files=(Array.isArray(note.files)?note.files:[]).filter(file=>typeof file==='string'&&STALL_FILE.test(file)&&!file.includes('..')).slice(0,STALL_MAX_FILES);
 return {note_id:typeof note.id==='string'&&STALL_ID.test(note.id)?note.id:null,created_at:new Date(now-now%HOUR).toISOString(),platform:platformOf({hint:platform,agent,portal}),device:deviceName(agent)?.slice(0,60)??null,staff:staff===true,
  kind:note.kind,step:note.step,percent:whole(note.percent,100),models:whole(note.models,999),view_s:whole(note.view,86400),total_s:whole(note.total,86400),
  hidden:yes(note.hidden),online:yes(note.online),protocol:STALL_PROTOCOLS.includes(note.protocol)?note.protocol:null,waiting:whole(note.waiting,999),files,
  stage:STALL_STAGES.includes(note.stage)?note.stage:null,error:stallError(note.error),gpu:stallGpu(note.gpu),gfx:STALL_GFX.includes(note.gfx)?note.gfx:null};
}
export async function recordLoadStall({admin,note,platform,agent,portal,staff,now=Date.now()}){
 const row=stallRow(note,{platform,agent,portal,staff,now});if(!row)return null;
 try{const saved=await admin.from('load_stalls').upsert(row,{onConflict:'note_id',ignoreDuplicates:true});if(saved?.error)console.error('Load stall record failed',saved.error.code);}catch(error){console.error('Load stall record failed',error?.code);}
 try{const cleared=await admin.from('load_stalls').delete().lt('created_at',new Date(now-STALL_KEEP_DAYS*DAY).toISOString());if(cleared?.error)console.error('Load stall cleanup failed',cleared.error.code);}catch(error){console.error('Load stall cleanup failed',error?.code);}
 return row;
}
