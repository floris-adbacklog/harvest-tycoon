// The partner programme's server side (supabase/partners.sql, 1 Oct 2026), for /partners (src/partners.js). A partner signs in with
// their own account (email and password); this answers with their panel, makes their partner place the first time (with the
// name and website they signed up with) and sends a payout request to info@harvesttycoon.com. Payouts are never automatic.
export const PARTNER_RULES=Object.freeze({sharePct:25,vatPct:21,minCents:2000,site:'https://www.harvesttycoon.com',to:'info@harvesttycoon.com'});
export const partnerLink=code=>`${PARTNER_RULES.site}/?ref=${code}`;
const CODE=/^[A-Z0-9]{4,12}$/;
const text=(value,max)=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,max):'';
export const euro=cents=>`€${(Math.max(0,Number(cents)||0)/100).toFixed(2)}`;
// A code from the partner's name ("Green Acres" -> GREENA plus three digits), new digits on a clash.
export function partnerCode(name,random=Math.random){
 const letters=String(name??'').toUpperCase().normalize('NFKD').replace(/[^A-Z0-9]/g,'').slice(0,6)||'HT';
 return `${letters}${String(Math.floor(random()*900)+100)}`.slice(0,12).padEnd(4,'0');
}
// What a sign-up brings along (user_metadata from /partners, or the form on the page for an account that already exists).
export function joinDetails(source){
 const name=text(source?.partner_name??source?.name,80),website=text(source?.partner_website??source?.website,200);
 const terms=source?.partner_terms===true||source?.terms===true;
 if(!name)return {error:'Write your name or your company’s name.'};
 if(!terms)return {error:'Accept the partner terms to join.'};
 if(website&&!/^https?:\/\/\S+\.\S+$/i.test(website)&&!/^@?[\w.]{2,}$/.test(website))return {error:'Write a web address (https://…) or a handle (@name), or leave it empty.'};
 return {name,website:website||null};
}
export async function ensurePartner({admin,user,join,random=Math.random}){
 const found=await admin.from('partners').select('user_id,code,name,website,created_at').eq('user_id',user.id).maybeSingle();
 if(found.error)throw found.error;if(found.data)return {partner:found.data};
 const details=joinDetails(join??(user.user_metadata?.partner_signup?user.user_metadata:null));
 if(!join&&!user.user_metadata?.partner_signup)return {partner:null};
 if(details.error)return {error:details.error};
 for(let attempt=0;attempt<6;attempt++){
  const code=partnerCode(attempt<4?details.name:'',random);if(!CODE.test(code))continue;
  const made=await admin.from('partners').insert({user_id:user.id,code,name:details.name,website:details.website}).select('user_id,code,name,website,created_at').single();
  if(!made.error)return {partner:made.data,joined:true};
  if(made.error.code!=='23505')throw made.error;
  const mine=await admin.from('partners').select('user_id,code,name,website,created_at').eq('user_id',user.id).maybeSingle();if(mine.data)return {partner:mine.data};
 }
 throw new Error('Could not make your partner link. Please try again.');
}
export async function partnerPanel({admin,user,join}){
 const made=await ensurePartner({admin,user,join});
 if(made.error)return {status:400,data:{error:made.error}};
 if(!made.partner)return {status:200,data:{partner:null,email:user.email,rules:PARTNER_RULES}};
 const p=made.partner;
 const [stats,payouts]=await Promise.all([admin.rpc('partner_stats',{p_partner:user.id}),admin.from('partner_payouts').select('id,amount_cents,status,requested_at,handled_at').eq('partner_id',user.id).order('requested_at',{ascending:false}).limit(12)]);
 if(stats.error)throw stats.error;if(payouts.error)throw payouts.error;
 return {status:200,data:{partner:{name:p.name,website:p.website,code:p.code,link:partnerLink(p.code),since:p.created_at},email:user.email,stats:stats.data,
  payouts:(payouts.data??[]).map(x=>({id:x.id,amountCents:x.amount_cents,status:x.status,requestedAt:x.requested_at,handledAt:x.handled_at})),joined:Boolean(made.joined),rules:PARTNER_RULES}};
}
// The payout form: who gets the money and how (bank or PayPal); it goes by email only and is not kept in the database.
export function payoutDetails(body){
 const name=text(body?.name,80),how=text(body?.details,200),note=text(body?.note,500);
 if(!name)return {error:'Write the name the money goes to.'};
 if(how.length<5)return {error:'Write your IBAN (with the bank’s BIC outside the EU) or your PayPal email address.'};
 return {name,how,note};
}
export function payoutMail({partner,user,request,details,stats}){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=[['Partner',partner.name],['Account email',user.email],['Partner code',partner.code],['Amount',euro(request.amountCents)],['Pay to',details.name],['IBAN or PayPal',details.how],['Note',details.note||'—'],
  ['Players brought in',stats?.players],['Paying players',stats?.payingPlayers],['Earned in total',euro(stats?.earnedCents)],['Paid out before',euro(stats?.paidCents)],['Request',request.id]];
 return {subject:`Payout request: ${euro(request.amountCents)} for ${partner.name}`,
  text:`A partner asks for a payout. Pay it by hand, then mark it paid in the Admin dashboard (Purchases, Partners).\n\n${rows.map(([k,v])=>`${k}: ${v??''}`).join('\n')}`,
  html:`<p>A partner asks for a payout. Pay it by hand, then mark it paid in the Admin dashboard (Purchases, Partners).</p><table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.map(([k,v])=>`<tr><td style="color:#666">${esc(k)}</td><td><strong>${esc(v??'')}</strong></td></tr>`).join('')}</table>`};
}
async function resendMail(message,replyTo){
 const env=globalThis.Deno?.env,key=env?.get('RESEND_API_KEY')??'',from=env?.get('MAIL_FROM')??'Harvest Tycoon <noreply@harvesttycoon.com>';
 if(!key)throw Error('Email is not available right now. Try again later.');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({from,to:[PARTNER_RULES.to],reply_to:replyTo,subject:message.subject,html:message.html,text:message.text})});
 if(!response.ok)throw Error('Your request could not be sent. Try again in a moment.');
}
export async function partnerPayout({admin,user,body,mail=resendMail}){
 const details=payoutDetails(body);if(details.error)return {status:400,data:{error:details.error}};
 const found=await admin.from('partners').select('code,name').eq('user_id',user.id).maybeSingle();
 if(found.error)throw found.error;if(!found.data)return {status:403,data:{error:'Sign up as a partner first.'}};
 const asked=await admin.rpc('partner_request_payout',{p_partner:user.id,p_min:PARTNER_RULES.minCents});
 if(asked.error)return {status:400,data:{error:asked.error.message}};
 const stats=await admin.rpc('partner_stats',{p_partner:user.id});
 try{await mail(payoutMail({partner:found.data,user,request:asked.data,details,stats:stats.data}),user.email);}
 catch(error){await admin.from('partner_payouts').delete().eq('id',asked.data.id);return {status:502,data:{error:error.message}};}
 return partnerPanel({admin,user});
}
