import {supabase,isConfigured,ensurePlayer,saveUsername,identity,observeIdentity,sendAccountLink,cloudError} from './supabase.js';
import {createStatsSync} from './sync.js';
import {fetchLeaderboard,renderLeaderboard} from './leaderboard.js';
import {createCloudUI} from './ui.js';
const PENDING='harvest-tycoon:pending-stats';
let stats={currency:180,level:1},ready=false,prompted=false,loading=null,requestNumber=0;
const sync=createStatsSync({getIdentity:identity,write:async row=>{const {error}=await supabase.from('player_stats').upsert(row,{onConflict:'player_id'});if(error)throw error;},onStatus:status=>{
 const labels={pending:'Score waiting to sync',syncing:'Updating your score…',synced:'Your score is up to date',offline:'Offline · score will retry after your next action'};ui.status(labels[status]);
 if(status==='synced')try{localStorage.removeItem(PENDING);}catch{}
}});
const ui=createCloudUI({onOpen:openBoard,onRetry:async()=>{await boot();sync.retry();return openBoard();},onName:async name=>{await saveUsername(name,stats);ui.setProfile(identity().profile,identity().player);sync.queue(stats);},onAccount:sendAccountLink});
async function boot(){
 if(!isConfigured){ui.status('Leaderboard not connected');ui.message('The leaderboard has not been connected yet. Your single-player farm is ready to play.');return;}
 if(loading)return loading;
 loading=(async()=>{try{await ensurePlayer();ui.setProfile(identity().profile,identity().player);ui.status(identity().profile?'Connected to the valley':'Choose your farmer name');maybePrompt();sync.retry();}catch(error){ui.status('Could not connect');ui.message(cloudError(error));}})();
 try{await loading;}finally{loading=null;}
}
function maybePrompt(){if(ready&&identity().player&&!identity().profile&&!prompted){prompted=true;ui.promptName();}}
async function openBoard(){
 if(!isConfigured)return;
 const request=++requestNumber;ui.message('Gathering the latest farm scores…');
 try{await boot();if(!identity().player)throw new Error('Not connected');if(!identity().profile){ui.promptName();return;}
  await sync.flush();const data=await fetchLeaderboard(supabase,identity().player.id);if(request===requestNumber)renderLeaderboard(ui.results,data,identity().player.id);
 }catch(error){if(request===requestNumber)ui.message(cloudError(error));}
}
function readyFarm(detail){stats={currency:detail.currency,level:detail.level};ready=true;maybePrompt();try{if(localStorage.getItem(PENDING))sync.queue(stats);}catch{}}
window.addEventListener('farm:ready',event=>readyFarm(event.detail));
window.addEventListener('farm:stats',event=>{stats={currency:event.detail.currency,level:event.detail.level};try{localStorage.setItem(PENDING,JSON.stringify(stats));}catch{}if(isConfigured){sync.queue(stats);if(!identity().player)boot();}});
if(window.harvestStats)readyFarm(window.harvestStats());
window.addEventListener('online',()=>{boot();sync.retry();});
observeIdentity(()=>{prompted=false;boot().then(()=>{if(ui.open)openBoard();});});
boot();
