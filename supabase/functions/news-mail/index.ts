import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleNewsMail,createResend} from './send.js';

// News and offers by email (13 Oct 2026, supabase/news-mail.sql): the admin's email to the farmers who said yes to it, from the Admin
// dashboard (src/admin-news-mail.js). send.js does the work. A function of its own, apart from farm-api (no part of a game request
// waits for it, and it deploys alone) and from notify-hourly (whose hourly job and cron stay as they are; its unsubscribe page has
// the news-only link these emails carry).
// verify_jwt stays on (deploy without --no-verify-jwt): only a signed-in session gets here, and every request checks in the database,
// with that session, that it is the admin signed in with Google (chat_staff_role, supabase/admin-google-only.sql). The service role
// is only used after that. Uses RESEND_API_KEY and MAIL_FROM, like auth-email and notify-hourly.
const env=(key:string)=>Deno.env.get(key)??'';
const url=env('SUPABASE_URL'),anon=env('SUPABASE_ANON_KEY');
const service=createClient(url,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const auth=req.headers.get('Authorization')??'';
 if(!/^Bearer \S+$/.test(auth))return reply({error:'Please sign in.'},401);
 const key=env('RESEND_API_KEY');
 if(!key||!anon)return reply({error:'Email is not set up.'},503);
 let body;try{body=await req.json();}catch{return reply({error:'Send a request the page understands.'},400);}
 // The admin's own session, for every check in the database.
 const user=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
 try{
  const done=await handleNewsMail({body,user,service,sleep,run:crypto.randomUUID(),log:(m:string)=>console.error(`news-mail: ${m}`),
   resend:createResend({key,from:env('MAIL_FROM')||'Harvest Tycoon <noreply@harvesttycoon.com>',sleep}),
   env:{functionsUrl:`${url.replace(/\/$/,'')}/functions/v1`,appUrl:(env('APP_URL')||'https://www.harvesttycoon.com').replace(/\/$/,'')}});
  return reply(done.data,done.status);
 }catch(error){
  console.error('news-mail',(error as Error)?.message);
  return reply({error:'Something went wrong. Please try again in a moment.'},500);
 }
});
