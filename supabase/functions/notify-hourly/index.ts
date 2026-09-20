import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import webpush from 'npm:web-push@3.6.7';
import {runJob,MAX_FAILURES} from './job.js';
import {digestEmail} from './mail.js';
import {CROP_NAMES,BUILDING_NAMES} from './names.js';

// verify_jwt is off for this function: the hourly cron call carries no user, and the unsubscribe link is opened from an email.
// Nothing here trusts the caller. The job runs at most once per clock hour (notification_begin_run), so calling it more
// often changes nothing, and an unsubscribe needs the private token from the player's own emails.
const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const VAPID_PUBLIC=Deno.env.get('VAPID_PUBLIC_KEY')??'',VAPID_PRIVATE=Deno.env.get('VAPID_PRIVATE_KEY')??'';
const VAPID_SUBJECT=Deno.env.get('VAPID_SUBJECT')??'mailto:noreply@harvesttycoon.com';
const RESEND_KEY=Deno.env.get('RESEND_API_KEY')??'',MAIL_FROM=Deno.env.get('MAIL_FROM')??'Harvest Tycoon <noreply@harvesttycoon.com>';
const APP_URL=(Deno.env.get('APP_URL')??'https://www.harvesttycoon.com').replace(/\/$/,'');
const pushOn=Boolean(VAPID_PUBLIC&&VAPID_PRIVATE),emailOn=Boolean(RESEND_KEY);
if(pushOn)webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC,VAPID_PRIVATE);
const functionUrl=`${url}/functions/v1/notify-hourly`;
const cors={'Access-Control-Allow-Origin':'*','Cache-Control':'no-store'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const page=(title:string,body:string)=>new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;background:#f3e8e0;font-family:Helvetica,Arial,sans-serif;color:#3d3923;"><main style="max-width:420px;margin:12vh auto;padding:28px;background:#fffdf6;border-radius:20px;border:1px solid #eadfd4;"><h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>${body}</main></body></html>`,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
const tokenOk=(value:string|null)=>Boolean(value&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));

const db={
 async beginRun(){const {data,error}=await admin.rpc('notification_begin_run');if(error)throw error;return data;},
 async candidates(){const {data,error}=await admin.rpc('notification_candidates');if(error)throw error;return data??[];},
 async saveState(player:string,patch:Record<string,unknown>){const {error}=await admin.from('notification_state').upsert({player_id:player,...patch,updated_at:new Date().toISOString()});if(error)throw error;},
 async removeSubscription(endpoint:string){await admin.from('push_subscriptions').delete().eq('endpoint',endpoint);},
 async markSuccess(endpoint:string){await admin.from('push_subscriptions').update({last_success_at:new Date().toISOString(),failures:0}).eq('endpoint',endpoint);},
 async markFailure(endpoint:string){
  const {data}=await admin.from('push_subscriptions').select('failures').eq('endpoint',endpoint).maybeSingle();
  const failures=(data?.failures??0)+1;
  if(failures>=MAX_FAILURES)await admin.from('push_subscriptions').delete().eq('endpoint',endpoint);
  else await admin.from('push_subscriptions').update({failures}).eq('endpoint',endpoint);
 },
 async addEmails(count:number){await admin.rpc('notification_add_emails',{p_count:count});}
};
async function sendPush(sub:{endpoint:string;p256dh:string;auth:string},payload:string){
 try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},payload,{TTL:3600,urgency:'normal'});return {ok:true,status:201};}
 catch(error){return {ok:false,status:Number((error as {statusCode?:number}).statusCode)||0};}
}
async function sendEmail(row:Record<string,any>,digest:unknown){
 const unsubscribeUrl=`${functionUrl}?unsubscribe=${row.unsubscribe_token}`;
 const mail=digestEmail({digest,names:{crops:CROP_NAMES,buildings:BUILDING_NAMES},appUrl:APP_URL,unsubscribeUrl});
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${RESEND_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:MAIL_FROM,to:[row.email],subject:mail.subject,html:mail.html,text:mail.text,headers:{'List-Unsubscribe':`<${unsubscribeUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}})});
 return response.ok;
}

Deno.serve(async(req)=>{
 const query=new URL(req.url).searchParams;
 if(req.method==='OPTIONS')return new Response('ok',{headers:{...cors,'Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
 // What the settings dialog may offer. The public key is public by design; nothing secret is returned.
 if(query.has('config'))return json({enabled:pushOn||emailOn,push:pushOn,email:emailOn,vapidPublicKey:pushOn?VAPID_PUBLIC:null});
 if(query.has('unsubscribe')){
  const token=query.get('unsubscribe');if(!tokenOk(token))return page('This link is not valid','<p>Open Settings in the game to change your reminders.</p>');
  // Opening the link (mail scanners do that) changes nothing; the button, or a mail app\'s one-click request, does.
  if(req.method==='POST'){
   const {error}=await admin.from('notification_settings').update({email_digest:false,updated_at:new Date().toISOString()}).eq('unsubscribe_token',token);
   if(error)return page('Something went wrong','<p>Please try again in a moment, or switch the summary off in Settings.</p>');
   return page('You are unsubscribed','<p>You will not get the daily email summary any more. You can switch it back on in the game under Settings.</p>');
  }
  return page('Unsubscribe from the daily email?',`<p>You will not get the daily summary of your farm any more.</p><form method="post" action="?unsubscribe=${token}"><button type="submit" style="background:#685e3f;color:#fffdf0;border:0;border-radius:12px;padding:14px 22px;font-size:16px;font-weight:700;cursor:pointer;">Unsubscribe</button></form>`);
 }
 if(req.method!=='POST')return json({error:'Use POST.'},405);
 if(!pushOn&&!emailOn)return json({ran:false,reason:'not configured'},503);
 try{
  const stats=await runJob({db,sendPush:pushOn?sendPush:null,sendEmail:emailOn?sendEmail:null,names:{crops:CROP_NAMES,buildings:BUILDING_NAMES},log:(m:string)=>console.error(m)});
  return json(stats);
 }catch(error){console.error(error);return json({error:'The reminder job failed.'},500);}
});
