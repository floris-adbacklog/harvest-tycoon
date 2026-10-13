// The news-mail function's work (13 Oct 2026), with everything it touches passed in (the admin's own database session, the service
// role, Resend, the clock) so the tests run it without Deno. index.ts only wires it up.
// Three requests, each from the Admin dashboard with the admin's own session:
//  test   the chosen language's version to the admin's own address only (news_mail_me gives it), nothing recorded;
//  start  records the email and one row per farmer (news_mail_start), then sends as below;
//  send   goes on with an email that has farmers waiting (a call ended by its time limit, a stop, a retry).
// Every request starts with a database function called with the admin's own session (news_mail_me, news_mail_start, news_mail_status):
// they check it is the admin, signed in with Google (chat_staff_role), before anything else happens. Only then does the service role
// claim farmers (news_mail_claim: their addresses never reach a browser) and mark what Resend said (news_mail_done).
// Sending: a batch of up to 50 farmers is one Resend call (/emails/batch), at most one call a second (Resend allows 2 a second for the
// whole account, and the sign-up mails of auth-email must keep getting through). Each batch carries the same Idempotency-Key every
// time it goes (news-mail/<email>/<batch>): when Resend's answer was lost, the batch goes again later with that key and Resend answers
// from its record instead of sending twice. Together with one row per farmer, claimed before it goes, nobody gets an email twice.
import {cleanMail,MAIL_LANGUAGES} from './rules.js';
import {newsEmail,unsubscribeLink} from './mail.js';

export const TIME_BUDGET=45000;   // per call; the dashboard calls again for the rest (an Edge Function must answer within 150 s)
export const PACE=1000;           // at least this long between two Resend calls
export const RESEND='https://api.resend.com';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What the database said, for the dashboard: its own refusals (they start with a capital) as written, an ended session, else general.
export function refusal(error){
 const code=String(error?.code??''),message=String(error?.message??'');
 if(code==='42501')return {status:403,data:{error:'Not authorized.'}};
 if(/^PGRST30\d$/.test(code)||/\bJWT\b/.test(message))return {status:401,data:{error:'Your session has ended. Please sign in again.'}};
 if(['22023','54000','P0001'].includes(code)&&/^\p{Lu}/u.test(message))return {status:422,data:{error:message}};
 return {status:503,data:{error:'The database could not be reached. Please try again.'}};
}

const retryAfter=response=>Math.min(5,Math.max(1,Number(response?.headers?.get?.('retry-after'))||1))*1000;
// Resend: ok, later (too many calls: it sent nothing), refused (it sent nothing: a key, the sender or the request itself) or unknown
// (no answer, its own failure, or the same key still in flight: maybe it went).
export function createResend({key,from,fetchImpl=fetch,sleep}){
 async function post(path,payload,extra={}){
  const headers={Authorization:`Bearer ${key}`,'Content-Type':'application/json',...extra};
  for(let attempt=1;;attempt++){
   let response=null;
   // A call that hangs ends after 20 seconds, as one that got no answer (tried again with the same key).
   try{response=await fetchImpl(`${RESEND}${path}`,{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(20000)});}catch{response=null;}
   if(response?.ok)return {kind:'ok',status:response.status,data:await response.json().catch(()=>null)};
   const status=response?.status??0,detail=response?String(await response.text().catch(()=>'')).slice(0,200):'no answer';
   if(status===429){if(attempt<3){await sleep(retryAfter(response));continue;}return {kind:'later',status,detail};}
   if(status>=400&&status<500&&status!==409)return {kind:'refused',status,detail};
   // Tried again with the same key: Resend answers from its record if the first one arrived.
   if(status!==409&&attempt<3){await sleep(1000*attempt);continue;}
   return {kind:'unknown',status,detail};
  }
 }
 const shape=m=>({from,to:[m.to],subject:m.subject,html:m.html,text:m.text,headers:m.headers,tags:m.tags});
 return {
  one:mail=>post('/emails',shape(mail)),
  // permissive: a refused address fails alone (errors[].index), the others go.
  batch:(mails,idempotencyKey)=>post('/emails/batch',mails.map(shape),{'Idempotency-Key':idempotencyKey,'x-batch-validation':'permissive'})
 };
}

// What each farmer of a batch becomes: sent, failed (with why), pending (Resend sent nothing: they go again) or null (not known:
// nothing is marked, the batch goes again after 10 minutes with the same key).
export function batchResults(recipients,outcome){
 const each=fn=>recipients.map((r,i)=>({player:r.player_id,id:null,note:null,...fn(r,i)}));
 if(outcome.kind==='ok'){
  const errors=new Map((Array.isArray(outcome.data?.errors)?outcome.data.errors:[]).map(e=>[Number(e?.index),String(e?.message??'refused').slice(0,200)]));
  const ids=(Array.isArray(outcome.data?.data)?outcome.data.data:[]).map(d=>d?.id??null),exact=ids.length===recipients.length-errors.size;let next=0;
  return each((r,i)=>errors.has(i)?{status:'failed',note:errors.get(i)}:{status:'sent',id:exact?ids[next++]:null});
 }
 if(outcome.kind==='later'||(outcome.kind==='refused'&&[401,403].includes(outcome.status)))return each(()=>({status:'pending'}));
 if(outcome.kind==='refused')return each(()=>({status:'failed',note:`refused (${outcome.status}): ${outcome.detail}`.slice(0,200)}));
 return null;
}

// Sends what is waiting until the time is up, nothing is left, or Resend or the database says stop.
export async function runMailing({mailing,service,resend,env,now,sleep,run,log}){
 const started=now();let last=-Infinity,progress=0,stopped=null,busy=false;
 while(now()-started<TIME_BUDGET){
  const claim=await service.rpc('news_mail_claim',{p_mailing:mailing.id,p_run:run});
  if(claim.error){log(`claim: ${claim.error.message}`);stopped='database';break;}
  const {batch=null,recipients=[],skipped=0,again=false}=claim.data??{};
  if(claim.data?.busy){busy=true;break;}
  progress+=skipped;
  if(batch==null)break;
  if(!recipients.length)continue;
  const wait=PACE-(now()-last);if(wait>0)await sleep(wait);last=now();
  const mails=recipients.map(r=>({to:r.email,...newsEmail({texts:mailing.texts,language:r.language,buttonUrl:mailing.buttonUrl,unsubscribeUrl:unsubscribeLink(env.functionsUrl,r.token,r.language),appUrl:env.appUrl}),
   tags:[{name:'kind',value:'news'},{name:'mailing',value:mailing.id}]}));
  const outcome=await resend.batch(mails,`news-mail/${mailing.id}/${batch}`);
  let results=batchResults(recipients,outcome);
  // The same key with a different batch (a farmer said no since its first try): whether that first try went is not known, so it does
  // not go again.
  if(!results&&again&&outcome.status===409)results=recipients.map(r=>({player:r.player_id,status:'failed',id:null,note:'not known whether it went (409); not sent again'}));
  if(results){
   const done=await service.rpc('news_mail_done',{p_mailing:mailing.id,p_results:results});
   if(done.error){log(`done: ${done.error.message}`);stopped='database';break;}
   progress+=results.filter(r=>r.status!=='pending').length;
  }
  if(outcome.kind==='later'){stopped='later';break;}
  if(outcome.kind==='refused'&&[401,403].includes(outcome.status)){log(`Resend refused the batch: ${outcome.status} ${outcome.detail}`);stopped='refused';break;}
  if(!results){log(`Resend did not answer the batch: ${outcome.status||'no answer'}`);stopped='unknown';break;}
 }
 try{await service.rpc('news_mail_release',{p_mailing:mailing.id,p_run:run});}catch{}
 return {progress,busy,stopped};
}

// The counts for the dashboard (never the texts or an address).
const counts=s=>({id:s.id,subject:s.subject,recipients:s.recipients??0,sent:s.sent??0,failed:s.failed??0,skipped:s.skipped??0,pending:s.pending??0,sending:s.sending??0,
 waiting:(s.pending??0)+(s.sending??0),finishedAt:s.finishedAt??null});

export async function handleNewsMail({body,user,service,resend,env,now=Date.now,sleep,run,log=()=>{}}){
 const operation=body?.operation;
 if(operation==='test'){
  let mail;try{mail=cleanMail({texts:body.texts,buttonUrl:body.buttonUrl});}catch(error){return {status:422,data:{error:error.message}};}
  const me=await user.rpc('news_mail_me');if(me.error)return refusal(me.error);
  const to=String(me.data?.email??'').trim();if(!to)return {status:422,data:{error:'Your account has no email address.'}};
  const language=MAIL_LANGUAGES.includes(body.language)?body.language:'en';
  // The admin's own unsubscribe link (it works on their own settings); without settings a link that says it is not valid.
  const message=newsEmail({texts:mail.texts,language,buttonUrl:mail.buttonUrl,unsubscribeUrl:unsubscribeLink(env.functionsUrl,me.data?.token??'test',language),appUrl:env.appUrl,test:true});
  const sent=await resend.one({to,...message,tags:[{name:'kind',value:'news_test'}]});
  if(sent.kind!=='ok'){log(`Resend did not take the test: ${sent.status} ${sent.detail}`);return {status:502,data:{error:`The mail service did not take the test (${sent.status||'no answer'}). Please try again.`}};}
  return {status:200,data:{to,language}};
 }
 let id;
 if(operation==='start'){
  let mail;try{mail=cleanMail(body);}catch(error){return {status:422,data:{error:error.message}};}
  const started=await user.rpc('news_mail_start',{p_texts:mail.texts,p_button_url:mail.buttonUrl,p_filters:mail.filters});
  if(started.error)return refusal(started.error);
  id=String(started.data?.id??'');
 }else if(operation==='send')id=String(body?.mailing??'');
 else return {status:400,data:{error:'Unknown request.'}};
 if(!UUID.test(id))return {status:400,data:{error:'Unknown email.'}};
 // The admin's own session again (news_mail_status checks it), and the email as recorded: its texts and button.
 const status=await user.rpc('news_mail_status',{p_mailing:id});if(status.error)return refusal(status.error);
 if(!status.data)return {status:404,data:{error:'Unknown email.'}};
 const outcome=await runMailing({mailing:{id,texts:status.data.texts??{},buttonUrl:status.data.buttonUrl??null},service,resend,env,now,sleep,run,log});
 const after=await user.rpc('news_mail_status',{p_mailing:id});
 return {status:200,data:{...counts(after.data??status.data),...outcome}};
}
