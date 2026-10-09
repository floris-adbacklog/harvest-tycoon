// Kongregate accounts (Oct 2026): signs in players who are signed in to Kongregate, checking their user id and game auth token with
// Kongregate's server (kongregate.js has the rules, supabase/kongregate.sql the tables). The game on Kongregate
// (public/kongregate.html, src/kongregate.js) calls it before it opens the farm; harvesttycoon.com never does.
// Deploy with --no-verify-jwt: the first start has no session yet, and a session sent along is checked here (kongregate.js sessionUser).
// Settings (Supabase secrets): KONGREGATE_API_KEY (the game's API key from its Kongregate /api page; never in the game itself, the
// docs' rule), KONGREGATE_CHECK_LIMIT and KONGREGATE_CHECK_LIMIT_ALL (checks with Kongregate an hour per network and in all),
// KONGREGATE_IP_SECRET (the key of the network and token hashes; the service role key when not set).
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleKongregateAuth,MAX_BODY,MESSAGES} from './kongregate.js';

const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const env=(key:string)=>Deno.env.get(key)??'';
const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const raw=await req.text();if(raw.length>MAX_BODY)return reply({error:'Request is too large.'},413);
  let body;try{body=JSON.parse(raw);}catch{return reply({error:MESSAGES.request},400);}
  const result:{status:number;data:{error?:string;code?:string};refused?:string}=await handleKongregateAuth({admin,body,headers:req.headers,env:{apiKey:env('KONGREGATE_API_KEY').trim(),
   checkLimit:{perIp:env('KONGREGATE_CHECK_LIMIT'),all:env('KONGREGATE_CHECK_LIMIT_ALL')},secret:env('KONGREGATE_IP_SECRET')||env('SUPABASE_SERVICE_ROLE_KEY')}});
  // Why Kongregate said no, never the token or the key: every start refused as "credentials" means KONGREGATE_API_KEY is wrong.
  if(result.refused)console.error('Kongregate refused a sign-in check:',result.refused);
  if(result.data?.code==='NOT_CONFIGURED')console.error('KONGREGATE_API_KEY is not set.');
  return reply(result.data,result.status);
 }catch(error){
  console.error('Kongregate sign-in failed',(error as {code?:string})?.code||(error as Error)?.name||'',String((error as Error)?.message??'').slice(0,200));
  return reply({error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'},503);
 }
});
