import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {createFarm,applyFarmAction,normalizeFarm,levelOf,xpForLevel,grantLevelRewards,grantChapterRewards} from './farm-state.js';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const nameValid=(value:unknown)=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9 _-]{2,19}$/.test(value.trim());
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token)return reply({error:'Please sign in.'},401);
  const {data:{user},error:authError}=await admin.auth.getUser(token);
  if(authError||!user||user.is_anonymous)return reply({error:'Please sign in with your account.'},401);
  const claims=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
  if(!claims.session_id)return reply({error:'Your session has ended. Please sign in again.'},401);
  const active=await admin.rpc('harvest_session_active',{p_player:user.id,p_session:claims.session_id});
  if(active.error)throw active.error;
  if(!active.data)return reply({error:'Your session has ended. Please sign in again.'},401);
  const raw=await req.text();if(raw.length>4096)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:'Invalid request.'},400);}
  if(!['load','action','rename'].includes(body?.operation))return reply({error:'Unknown request.'},400);
  const profileResponse=await admin.from('player_stats').select('player_id,username,currency,level').eq('player_id',user.id).maybeSingle();
  if(profileResponse.error)throw profileResponse.error;
  let profile=profileResponse.data;
  const username=profile?.username??(nameValid(user.user_metadata?.username)?user.user_metadata.username.trim():null);
  if(!username)return reply({error:'Choose a player name to open your farm.',code:'USERNAME_REQUIRED'},409);
  if(body.operation==='rename'){
   if(!nameValid(body.username))return reply({error:'Use 3–20 letters, numbers, spaces, underscores or hyphens.'},400);
   const renamed=await admin.from('player_stats').update({username:body.username.trim()}).eq('player_id',user.id).select('player_id,username,currency,level').single();
   if(renamed.error)throw renamed.error;return reply({profile:renamed.data});
  }
  if(body.operation==='action'&&(!/^[0-9a-f-]{36}$/i.test(body.requestId??'')||!body.action||typeof body.action!=='object'))return reply({error:'Invalid farm action.'},400);
  // Keep one server-owned roll across optimistic concurrency retries.
  let choreRoll:number|undefined;
  const random=()=>choreRoll??=(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296);
  for(let attempt=0;attempt<5;attempt++){
   const found=await admin.from('player_farms').select('*').eq('player_id',user.id).maybeSingle();if(found.error)throw found.error;
   const row=found.data,now=Date.now();
   if(!row){
    const initial=createFarm(now);
    // Preserve only progress already stored on the server. Never import browser saves.
    if(profile){initial.coins=profile.currency;initial.xp=xpForLevel(profile.level);initial.xpOffset=0;}
    const created=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:0,p_state:initial,p_receipts:[],p_username:username,p_currency:initial.coins,p_level:levelOf(initial)});
    if(created.error)throw created.error;continue;
   }
   const state=normalizeFarm(row.state,now);
   profile={player_id:user.id,username,currency:state.coins,level:levelOf(state)};
   if(body.operation==='load'){
    const levelReward=grantLevelRewards(state),chapterReward=grantChapterRewards(state);
    if(levelReward.levels.length||chapterReward.chapters.length){
     const saved=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:row.revision,p_state:state,p_receipts:row.receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state)});
     if(saved.error)throw saved.error;if(!saved.data)continue;
     return reply({state,profile:{...profile,currency:state.coins},levelReward,chapterReward,revision:row.revision+1,serverNow:now});
    }
    return reply({state,profile,revision:row.revision,serverNow:now});
   }
   const previous=row.receipts.find((r:{id:string})=>r.id===body.requestId);
   if(previous)return reply({state,profile,result:previous.result,revision:row.revision,serverNow:now});
   let result;try{result=applyFarmAction(state,body.action,now,random);}catch(error){return reply({error:error.message,code:'ACTION_REJECTED'},422);}
   const receipts=[...row.receipts,{id:body.requestId,result}].slice(-100);
   const saved=await admin.rpc('harvest_commit_farm',{p_player:user.id,p_expected:row.revision,p_state:state,p_receipts:receipts,p_username:username,p_currency:state.coins,p_level:levelOf(state)});
   if(saved.error)throw saved.error;
   if(saved.data)return reply({state,profile:{...profile,currency:state.coins,level:levelOf(state)},result,revision:row.revision+1,serverNow:now});
  }
  return reply({error:'Your farm changed in another tab. Please try again.'},409);
 }catch(error){console.error('Farm request failed',error.code??error.name);return reply({error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'},503);}
});
