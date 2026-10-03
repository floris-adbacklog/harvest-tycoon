// The support form (3 Oct 2026, https://www.harvesttycoon.com/support): a plain HTML form posts here and is sent back to the page with a
// 303 (#sent or #error-…); support.js has the rules, supabase/support.sql the table and the limits. Mails go to info@ only (Resend:
// RESEND_API_KEY and MAIL_FROM, as auth-email), reply_to the farmer. SUPPORT_IP_SECRET keys the IP hash (the service role key when not set).
// Deploy with --no-verify-jwt: a form from a page has no session, and the gateway would answer it 401.
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {handleSupport,checkRequest,supportUrl,MAX_BODY} from './support.js';

const env=(key:string)=>Deno.env.get(key)??'';
const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
const plain=(text:string,status:number,more:Record<string,string>={})=>new Response(text,{status,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store',...more}});
const back=(location:string)=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store'}});

Deno.serve(async(req)=>{
 const refused=checkRequest({method:req.method,headers:req.headers});
 if(refused)return plain(refused.text,refused.status,refused.allow?{Allow:refused.allow}:{});
 try{
  const raw=await req.text();if(raw.length>MAX_BODY)return plain('The message is too long.',413);
  const {location}=await handleSupport({admin,raw,headers:req.headers,env:{ipSecret:env('SUPPORT_IP_SECRET')||env('SUPABASE_SERVICE_ROLE_KEY')}});
  return back(location);
 }catch(error){
  console.error('Support form failed',(error as {code?:string})?.code||(error as Error)?.name||'',String((error as Error)?.message??'').slice(0,200));
  return back(supportUrl('en','error-failed'));
 }
});
