import {supabase,isConfigured,ensurePlayer,saveUsername,identity,observeIdentity,signIn,register,signOut,completePendingProfile,cloudError} from './supabase.js';
import {createStatsSync} from './sync.js';
import {fetchLeaderboard,renderLeaderboard} from './leaderboard.js';
import {createCloudUI} from './ui.js';
const PENDING='harvest-tycoon:pending-stats';
let stats={currency:180,level:1},ready=false,prompted=false,loading=null,requestNumber=0,lastAppliedUser=null;
const sync=createStatsSync({getIdentity:identity,write:async row=>{const {error}=await supabase.from('player_stats').upsert(row,{onConflict:'player_id'});if(error)throw error;},onStatus:status=>{const labels={pending:'Progress waiting to sync',syncing:'Saving your progress…',synced:'Your progress is saved',offline:'Offline · we will try again'};ui.status(labels[status]);if(status==='synced')try{localStorage.removeItem(PENDING);}catch{}}});
const ui=createCloudUI({onOpen:openBoard,onRetry:async()=>{await boot();sync.retry();return openBoard();},onName:async name=>{await saveUsername(name,stats);ui.setProfile(identity().profile,identity().player);sync.queue(stats);},onSignIn:async(email,password)=>{await signIn(email,password);await boot(true);},onRegister:async(email,password,username)=>register(email,password,username,stats),onSignOut:async()=>{await signOut();lastAppliedUser=null;ui.requireAuth();}});
function applyAccountProgress(){const {player,profile}=identity();if(!player||!profile||lastAppliedUser===player.id)return;lastAppliedUser=player.id;window.harvestAccountProgress={currency:profile.currency,level:profile.level};window.dispatchEvent(new CustomEvent('account:progress',{detail:window.harvestAccountProgress}));}
async function boot(force=false){
 if(!isConfigured){ui.configurationError();return;}if(loading&&!force)return loading;
 loading=(async()=>{try{await ensurePlayer();if(!identity().player){ui.requireAuth();return;}await completePendingProfile(stats);ui.authenticated();ui.setProfile(identity().profile,identity().player);if(identity().profile){ui.status('Connected to your account');applyAccountProgress();}else{ui.status('Choose your player name');maybePrompt();}sync.retry();}catch(error){ui.status('Connection failed');ui.authMessage(cloudError(error));}})();
 try{return await loading;}finally{loading=null;}
}
function maybePrompt(){if(ready&&identity().player&&!identity().profile&&!prompted){prompted=true;ui.promptName();}}
async function openBoard(){if(!isConfigured)return;const request=++requestNumber;ui.message('Gathering the latest scores…');try{await boot();if(!identity().player)return;if(!identity().profile){ui.promptName();return;}await sync.flush();const data=await fetchLeaderboard(supabase,identity().player.id);if(request===requestNumber)renderLeaderboard(ui.results,data,identity().player.id);}catch(error){if(request===requestNumber)ui.message(cloudError(error));}}
function readyFarm(detail){stats={currency:detail.currency,level:detail.level};ready=true;maybePrompt();applyAccountProgress();try{if(localStorage.getItem(PENDING))sync.queue(stats);}catch{}}
window.addEventListener('farm:ready',event=>readyFarm(event.detail));window.addEventListener('farm:stats',event=>{stats={currency:event.detail.currency,level:event.detail.level};try{localStorage.setItem(PENDING,JSON.stringify(stats));}catch{}if(isConfigured&&identity().player)sync.queue(stats);});
if(window.harvestStats)readyFarm(window.harvestStats());window.addEventListener('online',()=>{boot();sync.retry();});observeIdentity(()=>{prompted=false;boot(true).then(()=>{if(ui.open)openBoard();});});boot();
