// Supabase Auth's Send Email Hook (30 Sep 2026): Supabase calls this instead of sending its own sign-up and password reset emails,
// and it sends them through Resend with a subject in the farmer's game language (user_metadata.language), which a template's
// subject field cannot hold. Deploy with --no-verify-jwt: the call is checked by the hook's own signature (SEND_EMAIL_HOOK_SECRET,
// "v1,whsec_…", from Authentication → Hooks). Uses RESEND_API_KEY and MAIL_FROM, like notify-hourly.
import {Webhook} from 'npm:standardwebhooks@1.0.0';
import {authEmail,confirmationUrl,PORTAL_MAIL} from './mail.js';

const env=(key:string)=>Deno.env.get(key)??'';
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const failure=(message:string,status=500)=>reply({error:{http_code:status,message}},status);

Deno.serve(async request=>{
 if(request.method!=='POST')return failure('Method not allowed.',405);
 const secret=env('SEND_EMAIL_HOOK_SECRET').replace(/^v1,whsec_/,''),key=env('RESEND_API_KEY');
 if(!secret||!key)return failure('The email hook is not set up.');
 let data;
 try{data=new Webhook(secret).verify(await request.text(),Object.fromEntries(request.headers)) as {user:{email:string,user_metadata?:{language?:string}},email_data:{token_hash:string,redirect_to?:string,site_url?:string,email_action_type:string}};}
 catch{return failure('Invalid signature.',401);}
 const {user,email_data:mail}=data;
 if(PORTAL_MAIL.test(String(user?.email??'').trim()))return reply({});
 let message;
 try{
  const link=confirmationUrl({supabaseUrl:env('SUPABASE_URL'),tokenHash:mail.token_hash,type:mail.email_action_type,redirectTo:mail.redirect_to||mail.site_url});
  message=authEmail({type:mail.email_action_type,language:user.user_metadata?.language,link});
 }catch(error){console.error('auth-email',mail?.email_action_type,(error as Error).message);return failure((error as Error).message,400);}
 const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({from:env('MAIL_FROM')||'Harvest Tycoon <noreply@harvesttycoon.com>',to:[user.email],subject:message.subject,html:message.html,text:message.text,
   tags:[{name:'kind',value:`auth_${mail.email_action_type}`},{name:'language',value:message.language}]})});
 if(!sent.ok){console.error('auth-email resend',sent.status,await sent.text());return failure('The email could not be sent.',502);}
 return reply({});
});
