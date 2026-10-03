// The support form (3 Oct 2026, public/support.html): the rules of the support Edge Function, apart from Deno so the tests run them.
// A plain HTML form posts here (no script, also in our apps); every answer a farmer can get is a 303 back to /support (or /<code>/support)
// with #sent or #error-…, which the page shows by CSS :target. The message is stored (supabase/support.sql: support_submit counts the
// limits and inserts in one round trip) and mailed with Resend to info@ only, never to the sender (no open relay), with reply_to the
// sender's address, so answering is just Reply. Only a keyed hash of the IP address is used, never the address itself.

export const SITE='https://www.harvesttycoon.com';
export const TO='info@harvesttycoon.com';
// A 2000-character message in Hindi or Chinese is about 18 KB once the browser has encoded it; anything far past that is no form.
export const MAX_BODY=32768;
// perDay: mails to info@ a day from everyone together; past it a message is still stored (mailed false) up to stored a day, so one
// sender with many addresses cannot shut the form for everyone (3 Oct 2026).
export const LIMITS=Object.freeze({perIp:3,perEmail:3,perDay:200,stored:1000});
export const LENGTH=Object.freeze({min:10,max:2000,name:40,email:254,agent:300});
// The site's languages (public/languages.js LANGUAGES, which an Edge Function cannot import; a test keeps them the same).
export const LANGUAGES=Object.freeze(['en','cs','de','es','fr','id','hu','nl','pt','tr','ru','uk','hi','ja','ar','zh']);
export const TOPICS=Object.freeze({account:'Account and sign-in',bug:'Something does not work',purchases:'Purchases',other:'Something else'});
export const RESULTS=Object.freeze(['sent','error-email','error-message','error-busy','error-failed']);
export const APPS=Object.freeze({web:'website',android:'Android app',ios:'iPhone app'});

// The way back: only from the site constant and a known language, never from the request (Referer would be an open redirect).
export const supportUrl=(lang,result)=>`${SITE}${LANGUAGES.includes(lang)&&lang!=='en'?`/${lang}`:''}/support#${RESULTS.includes(result)?result:'error-failed'}`;

// Which of our apps sent it: the same user agent marks as public/android-app.js (HarvestTycoonApp/ plus an Apple device: the iPhone app).
export function appKind(agent){
 const ua=String(agent??'');
 if(!/HarvestTycoonApp\//.test(ua))return 'web';
 return /iPhone|iPad|iPod|Macintosh/.test(ua)?'ios':'android';
}

// One line or a block of text as a farmer typed it: \r\n as \n (a textarea sends CRLF, which would count twice), no NUL or other control
// characters (Postgres refuses \u0000), tabs as spaces; oneLine also folds every line break and run of spaces into one space.
export function cleanText(value,{oneLine=false}={}){
 let text=String(value??'').replace(/\r\n?/g,'\n').replace(/\t/g,' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f-\u009f\u2028\u2029\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'');
 if(oneLine)text=text.replace(/\s+/g,' ');
 return text.trim();
}
// One plain ASCII address: nothing that could add a header or a second address (no comma, semicolon, <, >, quotes, spaces or line breaks).
// A domain in another script arrives as the browser's punycode (пример.рф: xn--e1afmkfd.xn--p1ai), its top level xn-- too (3 Oct 2026).
const EMAIL=/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+(?:[A-Za-z]{2,63}|xn--[A-Za-z0-9-]{1,59})$/;
export function cleanEmail(value){
 const email=String(value??'').trim();
 if(!email||email.length>LENGTH.email||!EMAIL.test(email)||email.split('@')[0].length>64)return null;
 return email;
}

// The form's fields, checked. trap: the hidden honeypot field, which only a robot fills in (hp_note, a name no autofill knows: "website"
// was filled in by some password managers, 3 Oct 2026).
export const TRAP='hp_note';
export function readForm(params){
 const get=key=>{const value=params?.get?.(key);return typeof value==='string'?value:'';};
 const lang=LANGUAGES.includes(get('lang'))?get('lang'):'en';
 const form={lang,trap:get(TRAP).trim()!==''};
 const email=cleanEmail(get('email'));
 if(!email)return {...form,error:'error-email'};
 const message=cleanText(get('message'));
 if(message.length<LENGTH.min||message.length>LENGTH.max)return {...form,error:'error-message'};
 const topic=Object.hasOwn(TOPICS,get('topic'))?get('topic'):'other';
 const name=cleanText(get('name'),{oneLine:true}).slice(0,LENGTH.name);
 return {...form,email,name,topic,message};
}

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// The subject: the topic and the message's first words, on one line and short ("[Support] Purchases — My diamonds did not arrive…").
export function subjectOf(topic,message){
 const words=cleanText(message,{oneLine:true}).split(' ');
 let start='';
 for(const word of words.slice(0,8)){const next=start?`${start} ${word}`:word;if(next.length>60)break;start=next;}
 if(!start)start=words[0].slice(0,60);
 return `[Support] ${TOPICS[topic]??TOPICS.other} — ${start}${start.length<cleanText(message,{oneLine:true}).length?'…':''}`;
}
// The mail to info@: plain text and the same as escaped HTML, the message itself last.
export function supportMail(form,{app='web',agent='',id=null,at=new Date()}={}){
 const rows=[['Topic',TOPICS[form.topic]??TOPICS.other],['From',form.email],['Farmer name',form.name||'—'],['Language',form.lang],['Sent from',APPS[app]??APPS.web],
  ['Device',cleanText(agent,{oneLine:true}).slice(0,LENGTH.agent)||'—'],['Sent at',at.toISOString().replace('T',' ').slice(0,16)+' UTC'],['Message id',id??'—']];
 return {subject:subjectOf(form.topic,form.message),
  text:`A farmer wrote through the support page. Reply to this email to answer them.\n\n${rows.map(([k,v])=>`${k}: ${v}`).join('\n')}\n\n${form.message}\n`,
  html:`<p style="font-family:Arial,sans-serif;font-size:14px">A farmer wrote through the support page. Reply to this email to answer them.</p><table cellpadding="6" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:14px">${rows.map(([k,v])=>`<tr><td style="color:#666">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</table><div style="margin-top:14px;padding:12px 14px;border-left:4px solid #b9a36a;background:#f7f2ea;font-family:Arial,sans-serif;font-size:15px;white-space:pre-wrap">${esc(form.message)}</div>`};
}

// The page's language from a raw form, for a way back when anything else went wrong.
export function formLang(raw){try{return readForm(new URLSearchParams(String(raw??''))).lang;}catch{return 'en';}}

export async function resendMail(message,replyTo){
 const env=globalThis.Deno?.env,key=env?.get('RESEND_API_KEY')??'',from=env?.get('MAIL_FROM')||'Harvest Tycoon <noreply@harvesttycoon.com>';
 if(!key)throw Error('RESEND_API_KEY is not set');
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
  body:JSON.stringify({from,to:[TO],reply_to:replyTo,subject:message.subject,html:message.html,text:message.text}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error(`Resend ${response.status}`);
}

// The sender's address as Supabase's gateway sets it: cf-connecting-ip and x-real-ip reach every function call (function_edge_logs,
// 3 Oct 2026), x-forwarded-for almost never and then from the client itself, so it is never used (a faked one would dodge the limit).
export const IP_HEADERS=Object.freeze(['cf-connecting-ip','x-real-ip']);
export function clientIp(headers){
 for(const key of IP_HEADERS){const ip=String(headers?.get?.(key)??'').trim().slice(0,64);if(ip)return ip;}
 return null;
}
const hex=bytes=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
export async function ipHash(ip,secret){
 if(!ip)return null;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(String(secret||'support')),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(ip)))).slice(0,32);
}

// What reaches the function before the form is read: POST only, a form's own type, not too big, and from our site (a browser sends
// Origin with a form; another site's page posting here is turned away; a Vercel preview too, as a message from there is a real mail).
// null: go on; {location}: a 303 there (someone who opened the function's address goes to the page); else the plain answer {status,text}.
const ORIGINS=new Set([SITE,'https://harvesttycoon.com']);
export function checkRequest({method,headers}){
 if(method==='GET'||method==='HEAD')return {location:`${SITE}/support`};
 if(method!=='POST')return {status:405,text:'Use POST.',allow:'POST'};
 const type=String(headers?.get?.('content-type')??'').toLowerCase();
 if(!type.startsWith('application/x-www-form-urlencoded'))return {status:415,text:'Send the support form.'};
 const length=Number(headers?.get?.('content-length')??0);
 if(length>MAX_BODY)return {status:413,text:'The message is too long.'};
 const origin=String(headers?.get?.('origin')??'');
 if(origin&&origin!=='null'&&!ORIGINS.has(origin))return {status:403,text:'Send the form from harvesttycoon.com.'};
 return null;
}

// The body, at most max bytes as it streams in (a request without Content-Length is not read whole first); null when it is longer.
export async function readBody(stream,max=MAX_BODY){
 if(!stream)return '';
 const reader=stream.getReader(),parts=[];let size=0;
 for(;;){
  const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;if(size>max){await reader.cancel().catch(()=>{});return null;}
  parts.push(value);
 }
 const all=new Uint8Array(size);let at=0;for(const part of parts){all.set(part,at);at+=part.byteLength;}
 return new TextDecoder().decode(all);
}

// A form that passed checkRequest: where the farmer goes next ({location}). admin: the service-role client.
export async function handleSupport({admin,raw,headers,env={},mail=resendMail,now=new Date()}){
 const form=readForm(new URLSearchParams(String(raw??'')));
 const back=result=>({location:supportUrl(form.lang,result)});
 // A robot that filled in the hidden field hears "sent" and is never mailed; a valid one is kept marked spam (the limits count it), so
 // a real farmer whose browser filled it in anyway is not lost (3 Oct 2026).
 if(form.error)return back(form.trap?'sent':form.error);
 const agent=String(headers?.get?.('user-agent')??''),app=appKind(agent);
 const saved=await admin.rpc('support_submit',{p_email:form.email,p_farmer_name:form.name||null,p_topic:form.topic,p_message:form.message,p_language:form.lang,
  p_app:app,p_user_agent:cleanText(agent,{oneLine:true}).slice(0,LENGTH.agent)||null,p_ip_hash:await ipHash(clientIp(headers),env.ipSecret),p_spam:form.trap,
  p_max_ip:LIMITS.perIp,p_max_email:LIMITS.perEmail,p_max_day:LIMITS.perDay,p_max_stored:LIMITS.stored});
 if(form.trap)return back('sent');
 // The database not reachable (or support.sql not run yet): the farmer is told, in the page's language.
 if(saved.error){console.error('Support message not stored',saved.error.code||'',String(saved.error.message??'').slice(0,200));return back('error-failed');}
 const id=saved.data?.id;
 if(id===null||id===undefined)return back('error-busy');
 // Past the day's mails: stored for the owner to read (support_messages where not mailed), the farmer is not turned away.
 if(saved.data.mail!==true){console.warn('Support mail limit for today reached: message',id,'stored, not mailed');return back('sent');}
 try{await mail(supportMail(form,{app,agent,id,at:now}),form.email);}
 catch(error){
  // Not sent: the row stays (counted, so a broken mail cannot be hammered) marked not mailed, and the farmer tries again.
  console.error('Support mail failed',String(error?.message??'').slice(0,200));
  await admin.from('support_messages').update({mailed:false}).eq('id',id);
  return back('error-failed');
 }
 return back('sent');
}
