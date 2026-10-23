import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {runCheckoutReminders,createSender} from './job.js';

// The one reminder email for a website purchase started but not paid (23 Oct 2026, the owner's option 5; supabase/checkout-reminder.sql).
// pg_cron calls it every hour at :23. Deployed with --no-verify-jwt, as notify-hourly and play-voided: the cron call carries no user,
// and nothing here trusts the caller. It runs at most once every 50 minutes whoever calls (harvest_job_begin), only the database picks
// who gets an email (farmers who said yes to news and offers by email), and each purchase gets one at most. Uses RESEND_API_KEY and
// MAIL_FROM, like news-mail. CHECKOUT_REMINDER_ENABLED=false is the off switch.
const env=(key:string)=>Deno.env.get(key)??'';
const url=env('SUPABASE_URL');
const admin=createClient(url,env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
const must=async(call:PromiseLike<{data:any,error:any}>)=>{const {data,error}=await call;if(error)throw error;return data;};

Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const key=env('RESEND_API_KEY');
 if(!key)return reply({skipped:'email is not set up'});
 if(env('CHECKOUT_REMINDER_ENABLED').trim().toLowerCase()==='false')return reply({skipped:'switched off'});
 try{
  const done=await runCheckoutReminders({
   db:{
    begin:(gap:number)=>must(admin.rpc('harvest_job_begin',{p_name:'checkout-reminder',p_gap_minutes:gap})),
    candidates:async(limit:number)=>(await must(admin.rpc('checkout_reminder_candidates',{p_limit:limit})))??[],
    claim:(purchase:string)=>must(admin.rpc('checkout_reminder_claim',{p_purchase:purchase})),
    done:(purchase:string,note:string)=>must(admin.rpc('checkout_reminder_done',{p_purchase:purchase,p_note:note}))
   },
   send:createSender({key,from:env('MAIL_FROM')||'Harvest Tycoon <noreply@harvesttycoon.com>'}),
   env:{functionsUrl:`${url.replace(/\/$/,'')}/functions/v1`,appUrl:(env('APP_URL')||'https://www.harvesttycoon.com').replace(/\/$/,'')},
   log:(m:string)=>console.error(`checkout-reminder: ${m}`)
  });
  return reply(done);
 }catch(error){
  console.error('checkout-reminder',(error as any)?.code??(error as Error)?.name,String((error as Error)?.message??'').slice(0,120));
  return reply({error:'The reminders could not run.'},500);
 }
});
