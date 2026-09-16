import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const PENDING_ACCOUNT='harvest-tycoon:pending-account';
export const isConfigured=Boolean(url&&key);
export const supabase=isConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'}}):null;
let player=null,profile=null,initializing;
export const identity=()=>({player,profile});
export function validUsername(value){return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());}
export function cloudError(error){
 if(error?.code==='23505')return 'That player name is already taken. Please choose another.';
 if(error?.code==='invalid_credentials')return 'The email address or password is incorrect.';
 if(error?.code==='email_not_confirmed')return 'Please confirm your email address using the link in your inbox.';
 if(error?.code==='42P01'||error?.code==='PGRST205')return 'The leaderboard is not available yet. You can keep farming.';
 return error?.message||'Something went wrong. Check your connection and try again.';
}
function rememberPending(username,stats){try{localStorage.setItem(PENDING_ACCOUNT,JSON.stringify({username:username.trim(),stats}));}catch{}}
function takePending(){try{const value=JSON.parse(localStorage.getItem(PENDING_ACCOUNT)||'null');localStorage.removeItem(PENDING_ACCOUNT);return value;}catch{return null;}}
async function loadProfile(user){const response=await supabase.from('player_stats').select('player_id,username,currency,level,updated_at').eq('player_id',user.id).maybeSingle();if(response.error)throw response.error;player=user;profile=response.data;return {player,profile};}
export async function ensurePlayer(){
 if(!supabase)return {player:null,profile:null};if(player)return {player,profile};if(initializing)return initializing;
 initializing=(async()=>{const session=await supabase.auth.getSession();if(session.error)throw session.error;const user=session.data.session?.user;if(!user||user.is_anonymous)return {player:null,profile:null};return loadProfile(user);})();
 try{return await initializing;}finally{initializing=null;}
}
export async function signIn(email,password){const result=await supabase.auth.signInWithPassword({email:email.trim(),password});if(result.error)throw new Error(cloudError(result.error));player=null;profile=null;return loadProfile(result.data.user);}
export async function register(email,password,username,stats){
 if(!validUsername(username))throw new Error('Use 3–20 letters, numbers, spaces, underscores, or hyphens.');
 const current=(await supabase.auth.getSession()).data.session?.user;
 const options={email:email.trim(),password,options:{emailRedirectTo:new URL('/play.html',location.origin).href}};
 const result=current?.is_anonymous?await supabase.auth.updateUser(options):await supabase.auth.signUp({...options,options:{...options.options,data:{username:username.trim()}}});
 if(result.error)throw new Error(cloudError(result.error));rememberPending(username,stats);
 if(!result.data.session)return {confirmationRequired:true};
 player=null;profile=null;await loadProfile(result.data.user);await saveUsername(username,stats);takePending();return {confirmationRequired:false};
}
export async function completePendingProfile(stats){const pending=takePending();if(!pending)return null;try{return await saveUsername(pending.username,pending.stats??stats);}catch(error){rememberPending(pending.username,pending.stats??stats);throw error;}}
export async function signOut(){if(!supabase)return;const result=await supabase.auth.signOut();if(result.error)throw new Error(cloudError(result.error));player=null;profile=null;}
export async function saveUsername(username,stats){
 if(!validUsername(username))throw new Error('Use 3–20 letters, numbers, spaces, underscores, or hyphens.');
 const {player:user,profile:existing}=await ensurePlayer();if(!user)throw new Error('Sign in first to save your progress.');
 const query=existing?supabase.from('player_stats').update({username:username.trim()}).eq('player_id',user.id):supabase.from('player_stats').upsert({player_id:user.id,username:username.trim(),currency:stats.currency,level:stats.level},{onConflict:'player_id'});
 const result=await query.select('player_id,username,currency,level,updated_at').single();if(result.error)throw new Error(cloudError(result.error));profile=result.data;return profile;
}
export function observeIdentity(onChange){if(!supabase)return;supabase.auth.onAuthStateChange((event,session)=>{if(event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')return;setTimeout(()=>{player=null;profile=null;onChange(event,session);},0);});}
