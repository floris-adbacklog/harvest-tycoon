// The hourly reminder email's work (23 Oct 2026, option 5), with everything it touches passed in (the database, Resend, the clock), so
// the tests run it without Deno; index.ts only wires it up. Who gets one is the database's rule (supabase/checkout-reminder.sql
// checkout_reminder_due): a website purchase started 1 to 24 hours ago, still pending or expired, the farmer's latest on the website,
// nothing paid since in any store, never reminded before (one email per farmer per 30 days at most), and a farmer who said yes to news
// and offers by email with a confirmed address (news_mail_ok, the news email's own rule). Here: the pack must still be for sale (a
// Starter Pack week, a special offer or a pass that ended gets no email), the row is claimed before the email goes (reminder_mailed_at:
// so it never goes twice, even when Resend's answer is lost), and what Resend said is noted on the row.
import {PAYMENT_PACKS,PASS,passOnSale,seasonForCheckout} from './payments.js';
import {reminderEmail,unsubscribeLink} from './mail.js';

export const JOB_GAP_MINUTES=50;  // at most once an hour, whoever calls (harvest_job_begin)
export const BATCH=20;            // farmers per run at most: a handful a day is expected (114 checkouts in 21 days, most paid or not opted in)
export const RESEND='https://api.resend.com';

// Whether the pack of a candidate row can still be bought (the database says whether its offer and Starter Pack week still run).
export function stillForSale(row,now=Date.now()){
 if(!row||typeof row.pack!=='string')return false;
 if(row.pack==='starter')return row.starter_running===true;
 if(row.pack==='offer')return row.offer_running===true;
 if(row.pack==='pass')return row.pass_id===PASS.id&&Boolean(PASS.price)&&passOnSale(now);
 if(row.pack==='season')return typeof row.pass_id==='string'&&Boolean(seasonForCheckout(row.pass_id,now));
 return Object.hasOwn(PAYMENT_PACKS,row.pack);
}

// One email through Resend, with an Idempotency-Key of its own (checkout-reminder/<purchase>): tried again once with the same key when
// there was no answer, so Resend sends it at most once.
export function createSender({key,from,fetchImpl=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 return async(mail,idempotencyKey)=>{
  for(let attempt=1;;attempt++){
   let response=null;
   try{response=await fetchImpl(`${RESEND}/emails`,{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json','Idempotency-Key':idempotencyKey},
    body:JSON.stringify({from,to:[mail.to],subject:mail.subject,html:mail.html,text:mail.text,headers:mail.headers,tags:mail.tags}),signal:AbortSignal.timeout(20000)});}catch{response=null;}
   if(response?.ok){const data=await response.json().catch(()=>null);return {ok:true,id:typeof data?.id==='string'?data.id:null};}
   const status=response?.status??0;
   if((status===0||status===429||status>=500)&&attempt<2){await sleep(1500);continue;}
   return {ok:false,detail:`${status||'no answer'} ${response?String(await response.text().catch(()=>'')).slice(0,120):''}`.trim()};
  }
 };
}

export async function runCheckoutReminders({db,send,env,now=Date.now,log=()=>{}}){
 if(!await db.begin(JOB_GAP_MINUTES))return {skipped:'ran recently'};
 const rows=await db.candidates(BATCH);
 let sent=0,failed=0,skipped=0;
 for(const row of rows){
  if(!stillForSale(row,now())){skipped++;continue;}
  // Claimed first (checked again in the database): null when it is no longer due (paid meanwhile, said no to emails, already sent).
  const to=await db.claim(row.purchase_id);
  if(!to?.email||!to?.token){skipped++;continue;}
  const mail=reminderEmail({language:to.language,pack:row.pack,diamonds:row.diamonds,unsubscribeUrl:unsubscribeLink(env.functionsUrl,to.token,to.language),appUrl:env.appUrl});
  const outcome=await send({to:to.email,...mail,tags:[{name:'kind',value:'checkout_reminder'}]},`checkout-reminder/${row.purchase_id}`);
  if(outcome.ok)sent++;else{failed++;log(`not sent ${row.purchase_id}: ${outcome.detail}`);}
  await db.done(row.purchase_id,outcome.ok?`sent${outcome.id?` ${outcome.id}`:''}`:`failed: ${outcome.detail}`.slice(0,200));
 }
 return {candidates:rows.length,sent,failed,skipped};
}
