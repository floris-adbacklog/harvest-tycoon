import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {onlineSince,normaliseCounts,CACHE_MS} from './counts.js';

// verify_jwt is off for this function: the sign-in page shows these numbers before anyone has an account.
// It answers GET with {players, online} and nothing else, and remembers the answer for 30 seconds. With ?invite=CODE it
// answers {inviter} instead: the player name behind an invite code, for the sign-in page's "Tony invited you" (or null).
const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Allow-Headers':'*','Content-Type':'application/json'};
let cached:{at:number,body:string}|null=null;

Deno.serve(async(request:Request)=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(request.method!=='GET')return new Response(JSON.stringify({error:'Use GET.'}),{status:405,headers});
 const now=Date.now();
 const invite=new URL(request.url).searchParams.get('invite');
 if(invite!==null){
  const code=invite.trim().toUpperCase(),answer=(inviter:string|null)=>new Response(JSON.stringify({inviter}),{headers:{...headers,'Cache-Control':'public, max-age=300'}});
  if(!/^[A-Z0-9]{4,12}$/.test(code))return answer(null);
  try{
   const owner=await admin.from('player_invite_codes').select('player_id').eq('code',code).maybeSingle();
   if(owner.error||!owner.data)return answer(null);
   const name=await admin.from('player_stats').select('username').eq('player_id',owner.data.player_id).maybeSingle();
   return answer(name.error?null:name.data?.username??null);
  }catch{return answer(null);}
 }
 if(cached&&now-cached.at<CACHE_MS)return new Response(cached.body,{headers:{...headers,'Cache-Control':'public, max-age=30'}});
 try{
  const [total,online]=await Promise.all([
   admin.from('player_stats').select('player_id',{count:'exact',head:true}),
   admin.from('player_stats').select('player_id',{count:'exact',head:true}).gte('last_active_at',onlineSince(now))
  ]);
  const failed=total.error??online.error;if(failed)throw failed;
  const body=JSON.stringify(normaliseCounts(total.count,online.count));
  cached={at:now,body};
  return new Response(body,{headers:{...headers,'Cache-Control':'public, max-age=30'}});
 }catch{
  return new Response(JSON.stringify({error:'Not available right now.'}),{status:503,headers:{...headers,'Cache-Control':'no-store'}});
 }
});
