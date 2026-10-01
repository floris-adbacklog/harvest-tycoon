import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {partnerPanel,partnerPayout} from './partner.js';

// The partner programme (supabase/partners.sql, 1 Oct 2026) for /partners: a partner signed in with their own account asks for
// their panel ({operation:'panel'}, with {join:{name,website,terms}} to become a partner with an account that already exists) or
// sends a payout request ({operation:'payout',name,details,note}). verify_jwt stays on: only a signed-in account gets here.
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store'};
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json'}});
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});

Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'Use POST.'},405);
 try{
  const token=req.headers.get('Authorization')?.replace(/^Bearer /,'');
  if(!token)return reply({error:'Please sign in.'},401);
  const {data:{user},error}=await admin.auth.getUser(token);
  if(error||!user||user.is_anonymous)return reply({error:'Please sign in with your partner account.'},401);
  let body:{operation?:string,join?:unknown,name?:string,details?:string,note?:string}={};
  try{body=await req.json();}catch{return reply({error:'Send a request the page understands.'},400);}
  const done=body.operation==='payout'?await partnerPayout({admin,user,body}):body.operation==='panel'?await partnerPanel({admin,user,join:body.join??null}):{status:400,data:{error:'Unknown request.'}};
  return reply(done.data,done.status);
 }catch(error){
  console.error('partner-api',(error as Error)?.message);
  return reply({error:'Something went wrong. Please try again in a moment.'},500);
 }
});
