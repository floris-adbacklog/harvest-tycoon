import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {serviceAccount,voidedPurchases} from './google-play.js';
import {PLAY_PACKAGE,PLAY_TOKEN} from './payments.js';
// Refunds of the Android app's purchases (Oct 2026). Google refunds a Play purchase by itself when a farmer asks within 48 hours, and
// for chargebacks; it never tells the game. Every hour (pg_cron, supabase/google-play.sql) this asks Google for the purchases refunded
// in the last 30 days and takes back what each one gave (harvest_revoke_play_purchases: status 'refunded', so no revenue and no partner
// share either). At most every 20 minutes whoever calls (harvest_job_begin), so an outside caller cannot use up Google's quota.
// Deployed with --no-verify-jwt, as notify-hourly.
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 const account=serviceAccount(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT'));if(!account)return reply({skipped:'not configured'});
 try{
  const begin=await admin.rpc('harvest_job_begin',{p_name:'play-voided',p_gap_minutes:20});if(begin.error)throw begin.error;
  if(!begin.data)return reply({skipped:'ran recently'});
  const voided=await voidedPurchases(account,PLAY_PACKAGE,{since:Date.now()-30*86400000});
  const items=voided.filter(v=>PLAY_TOKEN.test(v?.purchaseToken??'')).map(v=>({token:v.purchaseToken,voidedAt:new Date(Number(v.voidedTimeMillis)||Date.now()).toISOString()}));
  if(!items.length)return reply({checked:voided.length,revoked:0});
  const done=await admin.rpc('harvest_revoke_play_purchases',{p_items:items});if(done.error)throw done.error;
  return reply({checked:voided.length,...done.data});
 }catch(e){console.error('Play refunds check failed',e?.status??e?.code??e?.name);return reply({error:'Refunds could not be checked.'},500);}
});
