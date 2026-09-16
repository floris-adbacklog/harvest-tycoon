import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL?.trim();
const key=import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const isConfigured=Boolean(url&&key);
export const supabase=isConfigured?createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'harvest-tycoon:auth'}}):null;
let player=null,profile=null,initializing;
export const identity=()=>({player,profile});
export function validUsername(value){return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());}
export function cloudError(error){
 if(error?.code==='23505')return 'That name is already taken. Please choose another.';
 if(error?.code==='42P01'||error?.code==='PGRST205')return 'The leaderboard is not ready yet. You can keep farming.';
 if(error?.code==='anonymous_provider_disabled')return 'The leaderboard is not accepting players yet. You can keep farming.';
 return 'The leaderboard could not connect. Your farm is saved on this device. Try again when you are online.';
}
export async function ensurePlayer(){
 if(!supabase)return {player:null,profile:null};
 if(player)return {player,profile};
 if(initializing)return initializing;
 initializing=(async()=>{
  const session=await supabase.auth.getSession();if(session.error)throw session.error;
  let user=session.data.session?.user;
  if(!user){const signed=await supabase.auth.signInAnonymously();if(signed.error)throw signed.error;user=signed.data.user;}
  if(!user)throw new Error('A player session could not be created.');
  const response=await supabase.from('player_stats').select('player_id,username,currency,level,updated_at').eq('player_id',user.id).maybeSingle();
  if(response.error)throw response.error;player=user;profile=response.data;return {player,profile};
 })();
 try{return await initializing;}finally{initializing=null;}
}
export async function saveUsername(username,stats){
 if(!validUsername(username))throw new Error('Use 3–20 letters, numbers, spaces, underscores or hyphens. Start with a letter or number.');
 const {player:user,profile:existing}=await ensurePlayer();if(!user)throw new Error('The leaderboard has not been connected yet.');
 // A rename must not replace a newer score with the cached profile's score.
 const query=existing
  ?supabase.from('player_stats').update({username:username.trim()}).eq('player_id',user.id)
  :supabase.from('player_stats').upsert({player_id:user.id,username:username.trim(),currency:stats.currency,level:stats.level},{onConflict:'player_id'});
 const result=await query.select('player_id,username,currency,level,updated_at').single();
 if(result.error)throw new Error(cloudError(result.error));profile=result.data;return profile;
}
export async function sendAccountLink(email,mode){
 if(!supabase)throw new Error('The leaderboard is not connected yet.');
 const redirect=new URL('/play.html',location.origin).href;
 const response=mode==='link'?await supabase.auth.updateUser({email},{emailRedirectTo:redirect}):await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:redirect}});
 if(response.error)throw new Error(mode==='link'?'This email could not be linked. If you already have an account, choose “Sign in to an existing player”.':'The sign-in link could not be sent. Check your email address and try again.');
}
export function observeIdentity(onChange){
 if(!supabase)return;
 let previous=null;
 supabase.auth.onAuthStateChange((event,session)=>{
  if(event==='INITIAL_SESSION')return;
  if(event==='TOKEN_REFRESHED')return;
  const id=session?.user?.id??null;
  if(id===previous&&event!=='USER_UPDATED')return;previous=id;
  // Do not run another auth call inside Supabase's auth lock callback.
  setTimeout(()=>{player=null;profile=null;onChange();},0);
 });
}
