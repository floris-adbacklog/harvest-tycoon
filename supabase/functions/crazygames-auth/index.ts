// CrazyGames accounts (Oct 2026, Basic Launch): makes guest accounts and signs in players logged in to CrazyGames, linking a guest's
// farm the moment that guest logs in (crazygames.js has the rules, supabase/crazygames.sql the tables). The game on CrazyGames calls
// it before it opens the farm; harvesttycoon.com never does.
// Deploy with --no-verify-jwt: a guest has no session yet, and a session sent along is checked here (crazygames.js sessionUser).
// Settings: CRAZYGAMES_GAME_ID (once the game has its id: a token for another game is refused), CRAZYGAMES_GUEST_LIMIT and
// CRAZYGAMES_GUEST_LIMIT_ALL (new guest farms an hour per network and in all), CRAZYGAMES_IP_SECRET (the key of the network hash;
// the service role key when not set).
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleCrazyGamesAuth,createKeyStore,PUBLIC_KEY_URL,MAX_BODY,MESSAGES} from './crazygames.js';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const env=(key:string)=>Deno.env.get(key)??'';
const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
// At most 5 seconds (Oct 2026 review): a slow sdk.crazygames.com must not hold every logged-in start until the function's own limit.
const keys=createKeyStore({fetchKey:async()=>{
 const response=await fetch(PUBLIC_KEY_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error(`CrazyGames public key: ${response.status}`);
 return (await response.json())?.publicKey;
}});

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const raw=await req.text();if(raw.length>MAX_BODY)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:MESSAGES.request},400);}
  const result=await handleCrazyGamesAuth({admin,body,headers:req.headers,keys,env:{gameId:env('CRAZYGAMES_GAME_ID').trim(),
   guestLimit:{perIp:env('CRAZYGAMES_GUEST_LIMIT'),all:env('CRAZYGAMES_GUEST_LIMIT_ALL')},ipSecret:env('CRAZYGAMES_IP_SECRET')||env('SUPABASE_SERVICE_ROLE_KEY')}});
  return reply(result.data,result.status);
 }catch(error){
  console.error('CrazyGames sign-in failed',(error as {code?:string})?.code||(error as Error)?.name||'',String((error as Error)?.message??'').slice(0,200));
  return reply({error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'},503);
 }
});
