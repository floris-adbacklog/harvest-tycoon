// Discord accounts (Oct 2026): signs in the players of the Discord Activity, swapping the code the Activity got from Discord for who
// the player is (discord.js has the rules, supabase/discord.sql and supabase/discord-link.sql the tables). The game in Discord
// (public/discord.html, src/discord.js) calls it, through Discord's proxy, before it opens the farm; harvesttycoon.com only for the
// link of a website farm to Discord (ops peek, begin, confirm, status and unlink, with the farmer's own session; confirm with the
// state begin gave Link and the code Discord gave the website after it, which says whose Discord account tapped it).
// Deploy with --no-verify-jwt: the first start has no session yet, and a session sent along is checked here (discord.js sessionUser).
// Release order (10 Oct 2026): supabase/discord-link.sql, then the site, then this function: the Activity page live before it cannot
// show the choice of a farm that this version asks a new Discord player for.
// Never in the log: a code, a ticket, a Link's state, a token or a secret.
// Settings (Supabase secrets): DISCORD_CLIENT_ID (the Activity's application id from the Developer Portal, the same app the Activity
// runs in) and DISCORD_CLIENT_SECRET (its OAuth2 client secret; never in the game or in git, Discord's Developer Terms).
// In the Developer Portal, OAuth2 › Redirects: https://www.harvesttycoon.com/discord-link/callback (discord.js LINK_CALLBACK), the
// address Discord sends the website's Link back to; without it Discord refuses the website's trip and nothing can be linked.
// No limit per network here: every Discord player comes through Discord's proxy, so one network would be all of them.
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleDiscordAuth,MAX_BODY,MESSAGES} from './discord.js';

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
  const result:{status:number;data:{error?:string;code?:string;retry_after?:number};refused?:string;leftover?:string}=await handleDiscordAuth({admin,body,headers:req.headers,
   env:{clientId:env('DISCORD_CLIENT_ID').trim(),clientSecret:env('DISCORD_CLIENT_SECRET').trim()}});
  // A relinked Discord-only farm that could not be deleted (its row already names the website farm, so nobody plays it): by hand.
  if(result.leftover)console.error('A replaced Discord farm is left to delete:',result.leftover);
  // Why Discord said no, never the code or a token: "invalid_client" means DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is wrong.
  if(result.refused)console.error('Discord refused a sign-in:',result.refused);
  else if(result.data?.code==='NOT_CONFIGURED')console.error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is not set.');
  // How often Discord makes this server wait (its address is shared and changes, docs production-readiness).
  if(result.status===429)console.error('Discord asks to wait',result.data.retry_after,'s');
  return reply(result.data,result.status);
 }catch(error){
  console.error('Discord sign-in failed',(error as {code?:string})?.code||(error as Error)?.name||'',String((error as Error)?.message??'').slice(0,200));
  return reply({error:'Your farm could not be reached. Please try again.',code:'SERVER_UNAVAILABLE'},503);
 }
});
