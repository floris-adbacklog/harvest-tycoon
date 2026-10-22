// News and offers by email (13 Oct 2026): the admin's email from the Admin dashboard to the farmers who said yes to it, each in their
// own language with an unsubscribe link of their own; supabase/news-mail.sql, supabase/functions/news-mail, src/admin-news-mail.js and
// the news-only unsubscribe (notify-hourly, with its page on our website: public/unsubscribe.html).
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LANGUAGES} from '../public/languages.js';
import {MAIL_LANGUAGES,MAIL_LIMITS,MAIL_CAP,OWN_PAGE,GAME_URL,MESSAGES,cleanTexts,cleanFilters,cleanMail,ownPage} from '../supabase/functions/news-mail/rules.js';
import {newsTexts,NEWS_LANGUAGES,RTL_MAIL} from '../supabase/functions/news-mail/texts.js';
import {newsEmail,unsubscribeLink,textFor,paragraphs} from '../supabase/functions/news-mail/mail.js';
import {handleNewsMail,createResend,batchResults,refusal,TIME_BUDGET,PACE} from '../supabase/functions/news-mail/send.js';
import {newsUnsubscribeTexts,NEWS_UNSUBSCRIBE_LANGUAGES,unsubscribeView,showUnsubscribe,NOTIFY_URL} from '../public/mail/news-unsubscribe.js';
import {createChatClient} from '../src/chat-client.js';
import {createNewsMail,countLine,sendLine,filtersText,logRow} from '../src/admin-news-mail.js';

const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SQL=read('supabase/news-mail.sql');
const fn=name=>{const at=SQL.indexOf(`create or replace function public.${name}(`);assert.ok(at>=0,name);const end=Math.min(...['$function$;','$f$;'].map(e=>SQL.indexOf(e,at)).filter(i=>i>=0));return SQL.slice(at,end);};
const CODES=LANGUAGES.map(l=>l.code).sort();
const FUNCTIONS='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1';
const TOKEN='5b1f7a52-0c2e-4f53-9a7e-1d2c3b4a5f60';

// ---- What the admin may send (rules.js, the same rules in the database) ----
test('the texts: English subject and text needed, every game language, limits in characters, one-line subject and button',()=>{
 assert.deepEqual([...MAIL_LANGUAGES].sort(),CODES);
 assert.throws(()=>cleanTexts({nl:{subject:'Hoi',body:'Nieuws'}}),{message:MESSAGES.english},'English first');
 assert.throws(()=>cleanTexts({en:{subject:'Hi',body:'  '}}),{message:MESSAGES.english});
 assert.throws(()=>cleanTexts(null),{message:MESSAGES.english});
 const t=cleanTexts({en:{subject:'  Big\n news \t ',body:'\r\n Hello\r\n\r\nSecond   line \n',buttonLabel:' Open \n my farm '},nl:{body:'Hallo',subject:''},xx:{body:'?'},de:{},fr:'nope'});
 assert.deepEqual(t,{en:{subject:'Big news',body:'Hello\n\nSecond   line',buttonLabel:'Open my farm'},nl:{body:'Hallo'}},'unknown and empty languages left out, empty parts dropped');
 // Counted as the database counts (code points): an emoji is one character, not two.
 assert.doesNotThrow(()=>cleanTexts({en:{subject:'🌾'.repeat(MAIL_LIMITS.subject),body:'x'}}));
 assert.throws(()=>cleanTexts({en:{subject:'a'.repeat(MAIL_LIMITS.subject+1),body:'x'}}),{message:MESSAGES.subject});
 assert.throws(()=>cleanTexts({en:{subject:'a',body:'x'},es:{body:'b'.repeat(MAIL_LIMITS.body+1)}}),{message:MESSAGES.body},'every language is checked');
 assert.throws(()=>cleanTexts({en:{subject:'a',body:'x',buttonLabel:'b'.repeat(MAIL_LIMITS.buttonLabel+1)}}),{message:MESSAGES.buttonLabel});
 assert.deepEqual(MAIL_LIMITS,{subject:100,body:5000,buttonLabel:30});
});

test('the button: only with its English text, and only to a page of harvesttycoon.com',()=>{
 // Written the way a browser writes it: a quote or a space in it becomes %22 or %20, never the end of the link.
 for(const [url,href] of [['https://www.harvesttycoon.com','https://www.harvesttycoon.com/'],['https://harvesttycoon.com/?source=news#shop','https://harvesttycoon.com/?source=news#shop'],['https://HarvestTycoon.com/es/','https://harvesttycoon.com/es/'],[' https://www.harvesttycoon.com:443/support ','https://www.harvesttycoon.com/support'],['https://www.harvesttycoon.com/partners?a=1&b=2','https://www.harvesttycoon.com/partners?a=1&b=2'],
  ['https://www.harvesttycoon.com/"onmouseover="x','https://www.harvesttycoon.com/%22onmouseover=%22x'],['https://www.harvesttycoon.com/a b<c>','https://www.harvesttycoon.com/a%20b%3Cc%3E']])
  assert.equal(ownPage(url),href,url);
 for(const url of ['http://www.harvesttycoon.com/','https://harvesttycoon.com.evil.example/','https://evil.example/?https://harvesttycoon.com/','https://user@harvesttycoon.com/','https://harvesttycoon.com@evil.example/','https://www.harvesttycoon.com:8443/',
  'javascript:alert(1)','https://play.harvesttycoon.com/','//harvesttycoon.com/','harvesttycoon.com','data:text/html,x','mailto:info@harvesttycoon.com'])
  assert.throws(()=>ownPage(url),{message:MESSAGES.ownPage},url);
 assert.equal(ownPage(''),null);assert.equal(ownPage(null),null);
 const texts={en:{subject:'Hi',body:'News',buttonLabel:'Play'}};
 assert.equal(cleanMail({texts,buttonUrl:GAME_URL}).buttonUrl,GAME_URL);
 assert.throws(()=>cleanMail({texts,buttonUrl:''}),{message:MESSAGES.noLink});
 assert.throws(()=>cleanMail({texts,buttonUrl:'https://example.com/'}),{message:MESSAGES.ownPage});
 assert.equal(cleanMail({texts:{en:{subject:'Hi',body:'News'},nl:{buttonLabel:'Speel'}},buttonUrl:GAME_URL}).buttonUrl,null,'no English button text: no button at all');
});

test('the filters: from a level and played in the last N days, nothing else',()=>{
 assert.deepEqual(cleanFilters({}),{});assert.deepEqual(cleanFilters({minLevel:'1',activeDays:''}),{},'level 1 and any time narrow nothing');
 assert.deepEqual(cleanFilters({minLevel:'14',activeDays:'7'}),{minLevel:14,activeDays:7});
 for(const minLevel of ['0','201','1.5','x',-3])assert.throws(()=>cleanFilters({minLevel}),{message:MESSAGES.level});
 for(const activeDays of ['0','366','2.5','week'])assert.throws(()=>cleanFilters({activeDays}),{message:MESSAGES.days});
 assert.deepEqual(cleanMail({texts:{en:{subject:'a',body:'b'}},filters:{minLevel:14}}).filters,{minLevel:14});
});

// ---- The email (texts.js, mail.js) ----
test('the fixed parts are in every game language, plain text, without a middle dot',()=>{
 assert.deepEqual([...NEWS_LANGUAGES].sort(),CODES);assert.deepEqual([...NEWS_UNSUBSCRIBE_LANGUAGES].sort(),CODES);
 const mailKeys=Object.keys(newsTexts('en')).sort(),pageKeys=Object.keys(newsUnsubscribeTexts('en')).sort();
 for(const code of CODES){
  const t=newsTexts(code),p=newsUnsubscribeTexts(code);
  assert.equal(t.language,code);assert.equal(p.language,code);assert.deepEqual(Object.keys(t).sort(),mailKeys,code);assert.deepEqual(Object.keys(p).sort(),pageKeys,code);
  assert.ok(t.why.includes('Harvest Tycoon'),`${code}: names the game`);
  for(const text of [...Object.values(t),...Object.values(p)]){assert.ok(String(text).trim(),code);assert.doesNotMatch(String(text),/[<>&]| · /,`${code}: ${text}`);}
  if(code!=='en'){assert.notEqual(t.why,newsTexts('en').why,code);assert.notEqual(p.askBody,newsUnsubscribeTexts('en').askBody,code);}
  assert.equal(p.dir,RTL_MAIL.includes(code)?'rtl':'ltr');
 }
 assert.equal(newsTexts('xx').language,'en');assert.equal(newsTexts(null).language,'en');assert.equal(newsUnsubscribeTexts('<script>').language,'en');
 // The page says the daily summary stays: this link stops news and offers only.
 assert.match(newsUnsubscribeTexts('en').askBody,/daily summary of your farm, if you switched it on, and emails about your account still arrive/);
 assert.match(newsTexts('en').why,/because you said yes to news and offers by email in Harvest Tycoon/);
});

test('every part the admin wrote is escaped: no markup, no link of their own',()=>{
 const evil={en:{subject:'Sale <img src=x onerror=alert(1)> & "more"',body:'<script>alert("x")</script>\nline 2 & <a href="https://evil.example">click</a>\n\n\'quoted\'',buttonLabel:'<b>Go</b>'}};
 const mail=newsEmail({texts:evil,language:'en',buttonUrl:GAME_URL,unsubscribeUrl:unsubscribeLink(FUNCTIONS,TOKEN,'en')});
 assert.doesNotMatch(mail.html,/<script|<img src=x|<a href="https:\/\/evil|<b>Go<\/b>/);
 assert.match(mail.html,/<title>Sale &lt;img src=x onerror=alert\(1\)&gt; &amp; &quot;more&quot;<\/title>/);
 assert.match(mail.html,/&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;<br>line 2 &amp; &lt;a href=&quot;https:\/\/evil\.example&quot;&gt;click&lt;\/a&gt;<\/p>/,'a line break stays one');
 assert.match(mail.html,/>&#39;quoted&#39;<\/p>/,'an empty line starts a paragraph');
 assert.match(mail.html,/>&lt;b&gt;Go&lt;\/b&gt;<\/a>/);
 assert.equal([...mail.html.matchAll(/<a href="([^"]*)"/g)].length,2,'only the button and the unsubscribe link');
 assert.equal(mail.subject,'Sale <img src=x onerror=alert(1)> & "more"','the subject header is plain text');
 // A button address that is not ours never becomes a link, even if one got past every other check.
 for(const url of ['https://evil.example/','javascript:alert(1)','https://www.harvesttycoon.com/"><script>'])
  assert.doesNotMatch(newsEmail({texts:{en:{subject:'S',body:'B',buttonLabel:'Go'}},language:'en',buttonUrl:url,unsubscribeUrl:'u'}).html,/evil\.example|javascript:|"><script>|>Go<\/a>/,url);
 assert.deepEqual(paragraphs('a\n\n\n b\nc \n \t\nd'),['a','b\nc','d']);
 assert.equal(newsEmail({texts:{en:{subject:'A\r\nBcc: x@y',body:'b'}},language:'en',unsubscribeUrl:'u'}).subject,'A Bcc: x@y','one line');
});

test('each farmer gets their own language\'s text (English for a part left empty) and the fixed parts in their language',()=>{
 const texts={en:{subject:'Weekend offer',body:'Big news',buttonLabel:'Open my farm'},nl:{subject:'Weekendaanbieding',body:'Groot nieuws'},ar:{body:'أخبار'}};
 const nl=newsEmail({texts,language:'nl',buttonUrl:GAME_URL,unsubscribeUrl:unsubscribeLink(FUNCTIONS,TOKEN,'nl')});
 assert.equal(nl.subject,'Weekendaanbieding');assert.match(nl.html,/<html lang="nl" dir="ltr">/);assert.match(nl.html,/Groot nieuws/);assert.match(nl.html,/>Open my farm<\/a>/,'its button text left empty: the English one');
 assert.match(nl.html,new RegExp(newsTexts('nl').why));assert.match(nl.html,/>Afmelden voor nieuws en aanbiedingen<\/a>/);
 const es=newsEmail({texts,language:'es',buttonUrl:GAME_URL,unsubscribeUrl:unsubscribeLink(FUNCTIONS,TOKEN,'es')});
 assert.equal(es.subject,'Weekend offer');assert.match(es.html,/<td lang="en" dir="ltr"[^>]*>\n<h1[^>]*>Weekend offer<\/h1>/,'the English text, marked English');
 assert.match(es.html,/<html lang="es" dir="ltr">/);assert.match(es.html,/Darse de baja de novedades y ofertas/,'why and the link in Spanish all the same');
 const ar=newsEmail({texts,language:'ar',unsubscribeUrl:unsubscribeLink(FUNCTIONS,TOKEN,'ar')});
 assert.match(ar.html,/<html lang="ar" dir="rtl">/);assert.match(ar.html,/<td lang="ar" dir="rtl"/);
 assert.equal(textFor(texts,'xx').language,'en');assert.equal(newsEmail({texts,language:'xx',unsubscribeUrl:'u'}).language,'en');
 assert.doesNotMatch(newsEmail({texts:{en:{subject:'a',body:'b'}},language:'en',buttonUrl:GAME_URL,unsubscribeUrl:'u'}).html,/border-bottom:3px/,'no button text: no button');
});

test('every email has our own unsubscribe link (news and offers only), the one-click headers and a text part',()=>{
 const link=unsubscribeLink(FUNCTIONS,TOKEN,'de');
 assert.equal(link,`${FUNCTIONS}/notify-hourly?unsubscribe=${TOKEN}&only=news&lang=de`);
 assert.equal(unsubscribeLink(FUNCTIONS,TOKEN,'<x>'),`${FUNCTIONS}/notify-hourly?unsubscribe=${TOKEN}&only=news&lang=en`);
 const mail=newsEmail({texts:{en:{subject:'S',body:'Body text',buttonLabel:'Play'}},language:'de',buttonUrl:GAME_URL,unsubscribeUrl:link,test:true});
 assert.deepEqual(mail.headers,{'List-Unsubscribe':`<${link}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'});
 assert.ok(mail.html.includes(`href="${link.replace(/&/g,'&amp;')}"`));
 assert.equal(mail.text,`S\n\nBody text\n\nPlay: ${GAME_URL}\n\n--\n${newsTexts('de').why}\n${newsTexts('de').unsubscribe}: ${link}\n`);
 assert.equal(mail.subject,'[Test] S','a test says so');
 // The game's palette, like the daily summary: cream page, cream card, the game's brown button.
 for(const colour of ['#f3e8e0','#fffdf6','#685e3f','#494125'])assert.ok(mail.html.includes(colour),colour);
 assert.match(mail.html,/harvest-tycoon-logo\.png/,'the logo the other emails use');
});

// ---- The function (send.js): a fake database that keeps the rules of supabase/news-mail.sql, and a fake Resend ----
const ADMIN_EMAIL='floris@millstone.nl';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
function world({players=120,admin=true,start=Date.UTC(2026,9,13,9)}={}){
 let t=start;const sleeps=[];
 const clock={now:()=>t,sleep:async ms=>{sleeps.push(ms);t+=ms;},advance:ms=>{t+=ms;}};
 const farmers=new Map(Array.from({length:players},(_,i)=>[id(i+1),{email:`farmer${i+1}@example.com`,token:id(9000+i),language:CODES[i%CODES.length],level:i%30+1,ok:true}]));
 const mailings=new Map(),rows=[];let seq=0;
 const counts=m=>{const mine=rows.filter(r=>r.mailing===m.id),n=s=>mine.filter(r=>r.status===s).length;return {id:m.id,subject:m.texts.en.subject,recipients:m.recipients,sent:n('sent'),failed:n('failed'),skipped:n('skipped'),pending:n('pending'),sending:n('sending'),finishedAt:m.finished??null};};
 const calls={user:[],service:[]};
 const user={async rpc(name,a){
  calls.user.push(name);
  if(!admin)return {data:null,error:{code:'42501',message:'Not authorized.'}};
  if(name==='news_mail_me')return {data:{email:ADMIN_EMAIL,token:TOKEN,language:'nl'},error:null};
  if(name==='news_mail_start'){
   if([...mailings.values()].some(m=>m.texts.en.subject===a.p_texts.en.subject&&t-m.at<86400000))return {data:null,error:{code:'54000',message:'An email with this subject went out in the last 24 hours. Use Continue under Last emails, or change the subject.'}};
   const who=[...farmers].filter(([,f])=>f.ok&&f.level>=(a.p_filters.minLevel??1)).map(([pid])=>pid).sort();
   const m={id:id(5000+ ++seq),texts:a.p_texts,buttonUrl:a.p_button_url,recipients:who.length,at:t};mailings.set(m.id,m);
   who.forEach((pid,i)=>rows.push({mailing:m.id,player:pid,language:farmers.get(pid).language,batch:Math.floor(i/50),status:'pending'}));
   return {data:{id:m.id,recipients:who.length},error:null};
  }
  if(name==='news_mail_status'){const m=mailings.get(a.p_mailing);return {data:m?{...counts(m),texts:m.texts,buttonUrl:m.buttonUrl}:null,error:null};}
  throw new Error(name);
 }};
 const service={async rpc(name,a){
  calls.service.push(name);const m=mailings.get(a.p_mailing);
  if(name==='news_mail_claim'){
   if(m.run&&m.run!==a.p_run&&m.until>=t)return {data:{busy:true},error:null};
   m.run=a.p_run;m.until=t+120000;const mine=rows.filter(r=>r.mailing===m.id);
   for(const r of mine)if(r.status==='sending'&&r.claimed<t-23*3600000)Object.assign(r,{status:'failed',note:'stopped while sending; not sent again'});
   const open=r=>r.status==='pending'||(r.status==='sending'&&r.claimed<t-600000),waiting=mine.filter(open);
   if(!waiting.length){if(!mine.some(r=>['pending','sending'].includes(r.status)))m.finished??=t;return {data:{batch:null,recipients:[],skipped:0},error:null};}
   const batch=Math.min(...waiting.map(r=>r.batch)),these=waiting.filter(r=>r.batch===batch),again=these.some(r=>r.status==='sending');let skipped=0;
   for(const r of these)if(!farmers.get(r.player).ok){r.status='skipped';skipped++;}
   const claimed=these.filter(r=>r.status!=='skipped').sort((x,y)=>x.player<y.player?-1:1);for(const r of claimed)Object.assign(r,{status:'sending',claimed:t});
   return {data:{batch,again,skipped,recipients:claimed.map(r=>{const f=farmers.get(r.player);return {player_id:r.player,email:f.email,language:r.language,token:f.token};})},error:null};
  }
  if(name==='news_mail_done'){let n=0;for(const x of a.p_results){const r=rows.find(r=>r.mailing===m.id&&r.player===x.player);if(!r||r.status!=='sending'||!['sent','failed','pending'].includes(x.status))continue;Object.assign(r,{status:x.status,id:x.id,note:x.note},x.status==='pending'?{claimed:null}:{});n++;}return {data:n,error:null};}
  if(name==='news_mail_release'){if(m.run===a.p_run)m.run=null;return {data:null,error:null};}
  throw new Error(name);
 }};
 return {clock,sleeps,farmers,mailings,rows,user,service,calls,counts};
}
// Resend as it behaves: an Idempotency-Key it has seen answers from its record (a different body: 409); steps per call: ok, {errors:[i]},
// 429, 500, 403, lost (it took and sent it, the answer never came back) or down (it never got it).
function resendFake(steps=[],{slow=0,clock}={}){
 const record=new Map(),delivered=[],requests=[];
 const reply=(status,data,headers={})=>({ok:status>=200&&status<300,status,headers:{get:k=>headers[k.toLowerCase()]??null},json:async()=>data,text:async()=>JSON.stringify(data)});
 const fetchImpl=async(url,init)=>{
  if(slow)clock.advance(slow);
  const step=steps.length?steps.shift():'ok',key=init.headers['Idempotency-Key'];requests.push({url,headers:init.headers,body:JSON.parse(init.body),step});
  if(step==='down')throw new TypeError('fetch failed');
  if(step==='429')return reply(429,{name:'rate_limit_exceeded'},{'retry-after':'1'});
  if(step==='500')return reply(500,{name:'internal_server_error'});
  if(step==='403')return reply(403,{name:'validation_error',message:'The domain is not verified.'});
  if(key&&record.has(key)){const kept=record.get(key);return kept.body===init.body?reply(200,kept.data):reply(409,{name:'invalid_idempotent_request'});}
  const payload=JSON.parse(init.body),list=Array.isArray(payload)?payload:[payload],refused=step?.errors??[];
  list.forEach((m,i)=>{if(!refused.includes(i))delivered.push(m.to[0]);});
  const data=Array.isArray(payload)?{data:list.filter((_,i)=>!refused.includes(i)).map((_,i)=>({id:`re_${requests.length}_${i}`})),...(refused.length?{errors:refused.map(index=>({index,message:'Invalid `to` field.'}))}:{})}:{id:'re_test'};
  if(key)record.set(key,{body:init.body,data});
  if(step==='lost')throw new TypeError('fetch failed');
  return reply(200,data);
 };
 return {fetchImpl,delivered,requests};
}
const ENV={functionsUrl:FUNCTIONS,appUrl:'https://www.harvesttycoon.com'};
const MAIL={texts:{en:{subject:'Weekend offer',body:'Something special',buttonLabel:'Open my farm'},nl:{body:'Iets speciaals'}},buttonUrl:GAME_URL,filters:{}};
function run(w,fake,body,extra={}){
 const resend=createResend({key:'re_key',from:'Harvest Tycoon <noreply@harvesttycoon.com>',fetchImpl:fake.fetchImpl,sleep:w.clock.sleep});
 return handleNewsMail({body,user:w.user,service:w.service,resend,env:ENV,now:w.clock.now,sleep:w.clock.sleep,run:extra.run??`run-${Math.random()}`,log:()=>{}});
}
const once=(list,expected)=>{assert.equal(new Set(list).size,list.length,'nobody twice');assert.deepEqual([...list].sort(),[...expected].sort());};
const everyone=w=>[...w.farmers.values()].filter(f=>f.ok).map(f=>f.email);

test('admin only: without the admin\'s Google session nothing is read, nothing is sent and the service role is never used',async()=>{
 for(const body of [{operation:'test',...MAIL},{operation:'start',...MAIL},{operation:'send',mailing:id(5001)}]){
  const w=world({admin:false}),fake=resendFake(),r=await run(w,fake,body);
  assert.deepEqual(r,{status:403,data:{error:'Not authorized.'}},body.operation);
  assert.equal(fake.requests.length,0);assert.deepEqual(w.calls.service,[]);
 }
 const w=world(),fake=resendFake();
 assert.equal((await run(w,fake,{operation:'send',mailing:'not-an-id'})).status,400);assert.equal((await run(w,fake,{operation:'drop'})).status,400);
 assert.equal(w.calls.user.length+w.calls.service.length+fake.requests.length,0);
 assert.deepEqual((await run(w,fake,{operation:'start',texts:{en:{subject:'x'}}})).data,{error:MESSAGES.english},'checked before the database');
 assert.deepEqual(refusal({code:'PGRST301',message:'JWT expired'}),{status:401,data:{error:'Your session has ended. Please sign in again.'}});
 assert.deepEqual(refusal({code:'22023',message:'Choose a level from 1 to 200.'}),{status:422,data:{error:'Choose a level from 1 to 200.'}});
 assert.equal(refusal({code:'XX000',message:'deadlock detected'}).status,503);
});

test('Send a test to me: one email, the chosen language, only to the admin\'s own address, nothing recorded',async()=>{
 const w=world(),fake=resendFake(),r=await run(w,fake,{operation:'test',...MAIL,language:'nl',to:'someone@example.com'});
 assert.deepEqual(r,{status:200,data:{to:ADMIN_EMAIL,language:'nl'}});
 assert.equal(fake.requests.length,1);const [sent]=fake.requests;
 assert.equal(sent.url,'https://api.resend.com/emails');assert.deepEqual(sent.body.to,[ADMIN_EMAIL]);assert.equal(sent.body.subject,'[Test] Weekend offer');
 assert.match(sent.body.html,/Iets speciaals/);assert.match(sent.body.html,/Afmelden voor nieuws en aanbiedingen/);assert.equal(sent.body.from,'Harvest Tycoon <noreply@harvesttycoon.com>');
 assert.equal(sent.body.headers['List-Unsubscribe'],`<${FUNCTIONS}/notify-hourly?unsubscribe=${TOKEN}&only=news&lang=nl>`);
 assert.deepEqual(w.calls.user,['news_mail_me']);assert.deepEqual(w.calls.service,[]);assert.equal(w.mailings.size,0);
 const refused=await run(world(),resendFake(['403']),{operation:'test',...MAIL,language:'xx'});assert.equal(refused.status,502);
});

test('Send: batches of 50 through Resend\'s batch call, one key per batch, paced, everyone once in their own language',async()=>{
 const w=world({players:120}),fake=resendFake(),r=await run(w,fake,{operation:'start',...MAIL});
 assert.equal(r.status,200);assert.equal(r.data.sent,120);assert.equal(r.data.waiting,0);assert.equal(r.data.recipients,120);assert.equal(r.data.progress,120);assert.equal(r.data.stopped,null);
 once(fake.delivered,everyone(w));
 assert.deepEqual(fake.requests.map(q=>q.url),Array(3).fill('https://api.resend.com/emails/batch'));
 assert.deepEqual(fake.requests.map(q=>q.body.length),[50,50,20]);
 const mailing=[...w.mailings.keys()][0];
 assert.deepEqual(fake.requests.map(q=>q.headers['Idempotency-Key']),[0,1,2].map(b=>`news-mail/${mailing}/${b}`));
 assert.ok(fake.requests.every(q=>q.headers['x-batch-validation']==='permissive'&&q.headers.Authorization==='Bearer re_key'));
 assert.deepEqual(w.sleeps,[PACE,PACE],'at most one Resend call a second');
 const first=fake.requests[0].body[0],farmer=[...w.farmers.values()].find(f=>f.email===first.to[0]);
 assert.equal(first.headers['List-Unsubscribe'],`<${FUNCTIONS}/notify-hourly?unsubscribe=${farmer.token}&only=news&lang=${farmer.language}>`,'each farmer their own link');
 assert.equal(first.headers['List-Unsubscribe-Post'],'List-Unsubscribe=One-Click');assert.deepEqual(first.tags,[{name:'kind',value:'news'},{name:'mailing',value:mailing}]);
 assert.match(first.html,new RegExp(`<html lang="${farmer.language}"`));
 assert.ok(w.rows.every(row=>row.status==='sent'&&/^re_/.test(row.id)));
 assert.equal(w.mailings.get(mailing).run,null,'the run lets go');
 // The same subject again at once: a double click, refused by the database.
 assert.deepEqual((await run(w,fake,{operation:'start',...MAIL})).data,{error:'An email with this subject went out in the last 24 hours. Use Continue under Last emails, or change the subject.'});
});

test('a call ends at its time limit; Continue goes on where it stopped and nobody gets it twice',async()=>{
 const w=world({players:120}),fake=resendFake([],{slow:TIME_BUDGET*2/3,clock:w.clock});
 const first=await run(w,fake,{operation:'start',...MAIL});
 assert.equal(first.data.sent,100);assert.equal(first.data.waiting,20);assert.equal(first.data.progress,100);
 const rest=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(rest.data.sent,120);assert.equal(rest.data.waiting,0);once(fake.delivered,everyone(w));
 const again=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(again.data.progress,0);assert.equal(fake.delivered.length,120,'a finished email sends nothing more');
});

test('Resend asks to wait (429): those farmers wait and go later, once',async()=>{
 const w=world({players:60}),fake=resendFake(['ok','429','429','429']),first=await run(w,fake,{operation:'start',...MAIL});
 assert.equal(first.data.stopped,'later');assert.equal(first.data.sent,50);assert.equal(first.data.pending,10);
 const rest=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(rest.data.sent,60);once(fake.delivered,everyone(w));
});

test('an answer that never came: the batch waits 10 minutes, goes again with the same key and Resend does not send it twice',async()=>{
 const w=world({players:30}),fake=resendFake(['lost','down','down']),first=await run(w,fake,{operation:'start',...MAIL});
 assert.equal(first.data.stopped,'unknown');assert.equal(first.data.sending,30);assert.equal(fake.delivered.length,30,'Resend did take it');
 const soon=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(soon.data.progress,0);assert.equal(soon.data.sending,30,'not within 10 minutes');assert.equal(fake.requests.length,3);
 w.clock.advance(10*60000+1);
 const later=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(later.data.sent,30);assert.equal(later.data.waiting,0);once(fake.delivered,everyone(w));
 assert.equal(new Set(fake.requests.map(q=>q.headers['Idempotency-Key'])).size,1,'one key for the batch, every time');
 // Never arrived at all: the same, and then it does go.
 const w2=world({players:10}),fake2=resendFake(['down','down','down']);const r2=await run(w2,fake2,{operation:'start',...MAIL});
 assert.equal(fake2.delivered.length,0);w2.clock.advance(11*60000);await run(w2,fake2,{operation:'send',mailing:r2.data.id});once(fake2.delivered,everyone(w2));
});

test('a batch that changed since its first try (a farmer said no) is not sent again: failed, as it is not known whether it went',async()=>{
 const w=world({players:5}),fake=resendFake(['lost','down','down']),first=await run(w,fake,{operation:'start',...MAIL});
 w.farmers.get(id(3)).ok=false;w.clock.advance(11*60000);
 const later=await run(w,fake,{operation:'send',mailing:first.data.id});
 assert.equal(later.data.failed,4);assert.equal(later.data.skipped,1);assert.equal(later.data.waiting,0);assert.equal(fake.delivered.length,5,'only the first try');
 assert.ok(w.rows.filter(r=>r.status==='failed').every(r=>/not sent again/.test(r.note)));
 // After 23 hours a batch that never got an answer is given up (Resend no longer knows its key).
 const w2=world({players:3}),fake2=resendFake(['down','down','down']);const r2=await run(w2,fake2,{operation:'start',...MAIL});
 w2.clock.advance(24*3600000);const end=await run(w2,fake2,{operation:'send',mailing:r2.data.id});
 assert.equal(end.data.failed,3);assert.equal(fake2.delivered.length,0);
});

test('one refused address fails alone; who said no since is skipped; another run of the same email is told it is busy',async()=>{
 const w=world({players:12}),fake=resendFake([{errors:[1]}]);w.farmers.get(id(12)).ok=false;
 const r=await run(w,fake,{operation:'start',...MAIL});
 assert.equal(r.data.sent,10);assert.equal(r.data.failed,1);assert.equal(r.data.skipped,0,'not yet: said no after the count');
 assert.equal(r.data.recipients,11);
 const row=w.rows.find(x=>x.status==='failed');assert.equal(row.player,id(2));assert.match(row.note,/Invalid `to` field/);
 const w2=world({players:4}),fake2=resendFake(['403']);const started=await run(w2,fake2,{operation:'start',...MAIL});
 assert.equal(started.data.stopped,'refused');assert.equal(started.data.pending,4,'Resend sent nothing: they wait');
 w2.farmers.get(id(2)).ok=false;
 const m=w2.mailings.get(started.data.id);m.run='other-tab';m.until=w2.clock.now()+60000;
 const busy=await run(w2,fake2,{operation:'send',mailing:started.data.id});assert.equal(busy.data.busy,true);assert.equal(fake2.requests.length,1);
 w2.clock.advance(61000);const rest=await run(w2,fake2,{operation:'send',mailing:started.data.id});
 assert.equal(rest.data.sent,3);assert.equal(rest.data.skipped,1);once(fake2.delivered,everyone(w2));
});

test('Resend\'s answers: per address in permissive mode, refused, later or unknown',()=>{
 const people=[{player_id:'a'},{player_id:'b'},{player_id:'c'}];
 assert.deepEqual(batchResults(people,{kind:'ok',data:{data:[{id:'1'},{id:'3'}],errors:[{index:1,message:'bad'}]}}).map(r=>[r.player,r.status,r.id,r.note]),[['a','sent','1',null],['b','failed',null,'bad'],['c','sent','3',null]]);
 assert.deepEqual(batchResults(people,{kind:'ok',data:{data:[{id:'1'},{id:'2'},{id:'3'}]}}).map(r=>r.id),['1','2','3']);
 assert.ok(batchResults(people,{kind:'later',status:429}).every(r=>r.status==='pending'));
 assert.ok(batchResults(people,{kind:'refused',status:401}).every(r=>r.status==='pending'),'a key or sender problem: nothing went, they wait');
 assert.ok(batchResults(people,{kind:'refused',status:422,detail:'x'}).every(r=>r.status==='failed'));
 assert.equal(batchResults(people,{kind:'unknown',status:500}),null,'not known: nothing is marked');
});

// ---- The database (supabase/news-mail.sql) ----
test('news-mail.sql: one row per email and farmer, gone with the account, read by nobody directly',()=>{
 assert.match(SQL,/create table if not exists public\.news_mail_recipients\(\n mailing_id uuid not null references public\.news_mailings\(id\) on delete cascade,\n player_id uuid not null references auth\.users\(id\) on delete cascade,/);
 assert.match(SQL,/ primary key \(mailing_id,player_id\)\n\);/,'an email can never go twice to the same farmer');
 assert.match(SQL,/status text not null default 'pending' check \(status in \('pending','sending','sent','failed','skipped'\)\)/);
 assert.match(SQL,/created_by uuid references auth\.users\(id\) on delete set null,/);
 assert.match(SQL,/recipients integer not null default 0 check \(recipients between 0 and 5000\),/);assert.equal(MAIL_CAP,5000);
 for(const table of ['news_mailings','news_mail_recipients']){assert.match(SQL,new RegExp(`alter table public\\.${table} enable row level security;\\nrevoke all on public\\.${table} from public, anon, authenticated;`),table);}
 assert.doesNotMatch(SQL,/create policy|grant [^;]* on public\.news_mail/i);
 assert.doesNotMatch(SQL,/email text|address text/i,'no address is copied: it is read from the account when the batch goes');
});

test('news-mail.sql: who gets it is who said yes, with a confirmed real address by the daily summary\'s rule, matching the filters',()=>{
 const ok=fn('news_mail_ok');
 assert.match(ok,/where s\.player_id=p_player and s\.email_marketing and/,'said yes, separately');
 assert.match(ok,/and public\.harvest_email_checked\(p_player\)\n$/,'confirmed as the daily summary checks it, not email_confirmed_at');
 assert.doesNotMatch(ok,/email_confirmed_at/);
 assert.match(read('supabase/functions/notify-hourly/index.ts'),/admin\.rpc\('harvest_email_checked',\{p_player:row\.player_id\}\)/,'the same rule as the daily summary');
 assert.match(ok,/coalesce\(u\.raw_app_meta_data->>'portal',''\) not in \('crazygames','kongregate','discord'\)/,'never a game portal\'s account');
 assert.match(ok,/u\.email !~\* '@players\\\.harvesttycoon\\\.com\$'/,'never a made-up address');
 assert.match(ok,/coalesce\(u\.raw_app_meta_data->>'guest',''\)<>'true'/);assert.match(ok,/not coalesce\(u\.is_anonymous,false\) and u\.deleted_at is null/);
 const targets=fn('news_mail_targets');
 assert.match(targets,/where s\.email_marketing\n  and ps\.level>=coalesce\(\(p_filters->>'minLevel'\)::integer,1\)\n  and \(p_filters->>'activeDays' is null or ps\.last_active_at>now\(\)-make_interval\(days=>\(p_filters->>'activeDays'\)::integer\)\)\n  and public\.news_mail_ok\(s\.player_id\)/);
 assert.match(targets,/join public\.player_stats ps on ps\.player_id=s\.player_id/,'a farm, with a level');
 const codes=list=>list.match(/'([a-z]{2})'/g).map(c=>c.slice(1,3)).sort();
 assert.deepEqual(codes(/seen\.language in \(([^)]*)\)/.exec(targets)[1]),CODES,'the game\'s languages');assert.match(targets,/then seen\.language else 'en' end/,'else English');
 assert.deepEqual(codes(/code not in \(([^)]*)\)/.exec(fn('news_mail_texts'))[1]),CODES);
 const filters=fn('news_mail_filters');
 assert.match(filters,/if k not in \('minLevel','activeDays'\) then raise exception 'There is no filter called %\.'/);
 assert.match(filters,/then s::integer not between 1 and 200 else true end\) then raise exception 'Choose a level from 1 to 200\.'/);
 assert.match(filters,/then s::integer not between 1 and 365 else true end\) then raise exception 'Choose from 1 to 365 days\.'/);
 assert.equal(MESSAGES.level,'Choose a level from 1 to 200.');assert.equal(MESSAGES.days,'Choose from 1 to 365 days.');
});

test('news-mail.sql: the admin\'s functions check the admin\'s Google session first; the sending steps are the service role\'s',()=>{
 const check=`begin\n if me is null or public.chat_staff_role(me) is distinct from 'admin' then raise exception 'Not authorized.' using errcode='42501'; end if;`;
 for(const [name,args] of [['news_mail_count','jsonb'],['news_mail_me',''],['news_mail_start','jsonb,text,jsonb'],['news_mail_status','uuid'],['news_mail_list','integer']]){
  const body=fn(name);assert.match(body,/declare me uuid:=\(select auth\.uid\(\)\);/,name);assert.ok(body.includes(check),`${name}: the check comes first`);
  assert.ok(SQL.includes(`revoke all on function public.${name}(${args}) from public, anon;\ngrant execute on function public.${name}(${args}) to authenticated;`),name);
 }
 // chat_staff_role is the admin rule everywhere: the admin's address and, for their own session, Google only (admin-google-identity.sql).
 assert.match(read('supabase/admin-google-identity.sql'),/i\.provider not in \('google','email'\)/);
 for(const [name,args] of [['news_mail_claim','uuid,uuid'],['news_mail_done','uuid,jsonb'],['news_mail_release','uuid,uuid']])
  assert.ok(SQL.includes(`revoke all on function public.${name}(${args}) from public, anon, authenticated;\ngrant execute on function public.${name}(${args}) to service_role;`),name);
 for(const [name,args] of [['news_mail_texts','jsonb'],['news_mail_filters','jsonb'],['news_mail_ok','uuid'],['news_mail_targets','jsonb'],['news_mail_summary','uuid,boolean']]){
  assert.ok(SQL.includes(`revoke all on function public.${name}(${args}) from public, anon, authenticated;`),name);
  assert.doesNotMatch(SQL,new RegExp(`grant execute on function public\\.${name}\\(`),name);
 }
 // The addresses: only the claim (service role) and the admin's own (news_mail_me) read one.
 for(const name of ['news_mail_count','news_mail_start','news_mail_status','news_mail_list','news_mail_summary'])assert.doesNotMatch(fn(name),/u\.email/,name);
 for(const [,name,rest] of SQL.matchAll(/create or replace function public\.(\w+)\([^)]*\)[^$]*?security definer([^$]*)\$/g))assert.match(rest,/set search_path to ''/,name);
});

test('news-mail.sql: the same limits and own-page rule as the dashboard, batches by farmer, a cap and a guard against a double click',()=>{
 const texts=fn('news_mail_texts');
 assert.ok(texts.includes(`if char_length(s)>${MAIL_LIMITS.subject} then raise exception '${MESSAGES.subject}'`));
 assert.ok(texts.includes(`if char_length(b)>${MAIL_LIMITS.body} then raise exception 'Keep every text to % characters.', ${MAIL_LIMITS.body}`));
 assert.ok(texts.includes(`if char_length(l)>${MAIL_LIMITS.buttonLabel} then raise exception '${MESSAGES.buttonLabel}'`));
 assert.ok(texts.includes(`raise exception '${MESSAGES.english}'`));
 const start=fn('news_mail_start');
 assert.ok(start.includes(`elsif v_url !~ '${OWN_PAGE.source.replace(/\\\//g,'/')}' then raise exception '${MESSAGES.ownPage}'`),'the same pattern as rules.js');
 assert.ok(start.includes(`elsif v_url is null then raise exception '${MESSAGES.noLink}'`));
 assert.match(start,/if v_texts->'en'->>'buttonLabel' is null then v_url:=null;/,'no English button text: no button');
 assert.match(start,/if v_n>5000 then raise exception 'More than 5,000 farmers match\. Choose a higher level or fewer days\.'/);
 assert.match(start,/m\.texts->'en'->>'subject'=v_texts->'en'->>'subject' and m\.created_at>now\(\)-interval '24 hours'\) then\n  raise exception 'An email with this subject went out in the last 24 hours\. Use Continue under Last emails, or change the subject\.' using errcode='54000';/);
 assert.match(start,/\(\(row_number\(\) over \(order by t\.player_id\)\)-1\)\/50 from public\.news_mail_targets\(v_filters\) t;/,'a batch is the same farmers every time');
 const claim=fn('news_mail_claim');
 assert.match(claim,/run_until=now\(\)\+interval '2 minutes' where id=p_mailing and \(run_id is null or run_id=p_run or run_until<now\(\)\);/,'one run at a time');
 assert.match(claim,/status='sending' and claimed_at<now\(\)-interval '23 hours'/);assert.match(claim,/x\.status='sending' and x\.claimed_at<now\(\)-interval '10 minutes'/);
 assert.match(claim,/and not public\.news_mail_ok\(r\.player_id\);/,'checked again when the batch goes');
 assert.match(claim,/order by c\.player_id\),'\[\]'::jsonb\) into v_rows/,'the same order every time, so the same batch is the same request');
 assert.match(fn('news_mail_done'),/where r\.mailing_id=p_mailing and r\.player_id=x\.player and r\.status='sending' and x\.status in \('sent','failed','pending'\);/,'only what this run claimed');
 // Every message of ours is either for farmers (translated) or the admin's only (never shown to a farmer: i18n/ignore.json).
 const catalog=JSON.parse(read('i18n/catalog.json')),ignore=JSON.parse(read('i18n/ignore.json'));
 for(const m of SQL.matchAll(/raise exception\s+'((?:[^']|'')*)'/g)){let n=0;const key=m[1].replace(/%/g,()=>`{${n++}}`);if(/_[a-z]/.test(key))continue;assert.ok(key in catalog||ignore.includes(key),key);}
 for(const text of Object.values(MESSAGES)){const key=text.replace(/5000/,'{0}');assert.ok(key in catalog||ignore.includes(text),text);}
});

test('delete account: the farmer\'s rows go with the account, patched into the live function once, next to the notification state',()=>{
 const m=/select pg_temp\.news_mail_patch\('([^']+)',\$m\$([\s\S]*?)\$m\$,\s*\$a\$([\s\S]*?)\$a\$,\s*\$b\$([\s\S]*?)\$b\$\);/.exec(SQL);
 assert.ok(m);const [,target,marker,from,to]=m;
 assert.equal(target,'public.harvest_delete_account(uuid,text)');assert.equal(marker,'public.news_mail_recipients');
 assert.match(SQL,/if position\(p_marker in def\)>0 then return; end if;\n if position\(p_from in def\)=0 or \(length\(def\)-length\(replace\(def,p_from,''\)\)\)\/length\(p_from\)<>1 then/);
 const def=/create or replace function public\.harvest_delete_account[\s\S]*?end \$f\$;/.exec(read('supabase/delete-account.sql'))[0];
 assert.equal(def.split(from).length-1,1,'the line is there once');assert.ok(!def.includes(marker));
 const after=def.replace(from,to);
 assert.ok(after.includes(marker)&&!from.includes(marker),'a second run finds it done and changes nothing');
 assert.match(after,/\n delete from public\.news_mail_recipients where player_id=p_player;get diagnostics n=row_count;c:=c\|\|jsonb_build_object\('news_mail_recipients',n\);\n update public\.news_mailings set created_by=null where created_by=p_player;\n/);
 assert.ok(after.indexOf('public.news_mail_recipients')<after.indexOf('delete from auth.users'),'before the sign-in goes');
 assert.match(SQL,/revoke all on function public\.harvest_delete_account\(uuid,text\) from public, anon, authenticated;\ngrant execute on function public\.harvest_delete_account\(uuid,text\) to service_role;\n$/);
});

// ---- notify-hourly: the news-only unsubscribe ----
test('notify-hourly: the news-only link turns off news and offers only, only on a POST; a browser goes to our page in the farmer\'s language',()=>{
 const index=read('supabase/functions/notify-hourly/index.ts');
 const at=index.indexOf("if(query.get('only')==='news'){"),old=index.indexOf("if(!tokenOk(token))return page('This link is not valid'");
 assert.ok(at>0&&at<old,'before the full unsubscribe');const news=index.slice(at,old);
 // Supabase serves a function's HTML as plain text (its markup showed): the browser goes to public/unsubscribe.html, the token after the
 // #, and only from our own address and a two-letter language (never from the request: no open redirect).
 assert.match(news,/const lang=\/\^\[a-z\]\{2\}\$\/\.test\(query\.get\('lang'\)\?\?''\)\?query\.get\('lang'\):'en';/);
 assert.match(news,/Location:`\$\{APP_URL\}\/unsubscribe\.html\?lang=\$\{lang\}#\$\{hash\}`/);
 assert.match(news,/if\(req\.method!=='POST'\)return back\(`t=\$\{token!\.toLowerCase\(\)\}`\);/,'opening it changes nothing');
 assert.ok(news.indexOf("if(!tokenOk(token))")<news.indexOf("if(req.method!=='POST')"),'a token that is not one is never passed on');
 assert.match(news,/const \{error\}=await admin\.from\('notification_settings'\)\.update\(\{email_marketing:false,marketing_changed_at:at,updated_at:at\}\)\.eq\('unsubscribe_token',token\)\.eq\('email_marketing',true\);/);
 assert.match(news,/if\(query\.has\('back'\)\)return back\(error\?'error':'done'\);\n\s+return json\(\{ok:!error\},error\?500:200\);/,'the page goes back to the page; a mail app\'s one-click gets a plain answer');
 assert.doesNotMatch(news,/email_digest|page\(/,'the daily summary stays as it is');
 assert.doesNotMatch(index,/news-unsubscribe/,'the texts live with the page');
 assert.match(index,/\.update\(\{email_digest:false,email_marketing:false,marketing_changed_at:at,updated_at:at\}\)\.eq\('unsubscribe_token',token\)/,'the daily summary\'s link stops both, as before');
 assert.equal(read('vercel.json').includes('unsubscribe'),false,'a plain file of the site, no route of its own');
});

test('the unsubscribe page: asks first, posts to notify-hourly, says done or why not, in the farmer\'s language, as text only',()=>{
 assert.equal(NOTIFY_URL,`${FUNCTIONS}/notify-hourly`);
 const ask=unsubscribeView('?lang=nl',`#t=${TOKEN.toUpperCase()}`);
 assert.deepEqual(ask,{state:'ask',title:newsUnsubscribeTexts('nl').askTitle,body:newsUnsubscribeTexts('nl').askBody,button:'Afmelden',language:'nl',dir:'ltr',
  action:`${FUNCTIONS}/notify-hourly?unsubscribe=${TOKEN}&only=news&lang=nl&back=1`});
 assert.equal(unsubscribeView('?lang=nl','#done').title,'Je bent afgemeld');assert.equal(unsubscribeView('?lang=ar','#error').dir,'rtl');
 for(const hash of ['','#','#invalid','#t=','#t=nope','#t=<script>',`#t=${TOKEN}x`,`#done&t=${TOKEN}x`])assert.equal(unsubscribeView('?lang=de',hash).state,'invalid',hash);
 assert.equal(unsubscribeView('?lang=<b>',`#t=${TOKEN}`).language,'en');assert.match(unsubscribeView(null,`#t=${TOKEN}`).action,/&lang=en&back=1$/);
 // In a page: the texts as text, the form only with a token, and the token gone from the address bar.
 const el=()=>({textContent:'',hidden:true,action:'',removeAttribute(name){if(name==='action')this.action='';}});
 const parts={title:el(),body:el(),button:el(),form:el()},doc={documentElement:{},title:'',querySelector:q=>parts[/data-unsubscribe-(\w+)/.exec(q)[1]]};
 const replaced=[],hist={replaceState:(...a)=>replaced.push(a)};
 showUnsubscribe(doc,{search:'?lang=fr',hash:`#t=${TOKEN}`,pathname:'/unsubscribe.html'},hist);
 assert.equal(doc.documentElement.lang,'fr');assert.equal(parts.title.textContent,newsUnsubscribeTexts('fr').askTitle);assert.equal(parts.form.hidden,false);
 assert.equal(parts.form.action,`${FUNCTIONS}/notify-hourly?unsubscribe=${TOKEN}&only=news&lang=fr&back=1`);assert.deepEqual(replaced,[[null,'','/unsubscribe.html?lang=fr']]);
 showUnsubscribe(doc,{search:'?lang=fr',hash:'#done',pathname:'/unsubscribe.html'},hist);
 assert.equal(parts.form.hidden,true);assert.equal(parts.form.action,'');assert.equal(parts.body.textContent,newsUnsubscribeTexts('fr').doneBody);assert.equal(replaced.length,1);
 // The page: no other script (the token goes nowhere else), not indexed, no referrer, the game's look.
 const page=read('public/unsubscribe.html');
 assert.deepEqual([...page.matchAll(/<script[^>]*>/g)].map(m=>m[0]),['<script type="module" src="/mail/news-unsubscribe.js">']);
 assert.match(page,/<meta name="robots" content="noindex">/);assert.match(page,/<meta name="referrer" content="no-referrer">/);assert.match(page,/href="\/legal\.css"/);
 assert.match(page,/<form method="post" data-unsubscribe-form hidden>/);assert.doesNotMatch(page,/ · /);
 // Not through the catalog: the extractor reads public/*.js only, not this folder.
 assert.match(read('scripts/i18n-extract.mjs'),/list\('public\/',f=>f\.endsWith\('\.js'\)\)/);
});

// ---- The function's wiring ----
test('the news-mail function: a signed-in session only, every check with that session, the service role after, no secret in the code',()=>{
 const index=read('supabase/functions/news-mail/index.ts');
 assert.match(index,/verify_jwt stays on \(deploy without --no-verify-jwt\)/);
 assert.match(index,/const user=createClient\(url,anon,\{global:\{headers:\{Authorization:auth\}\},auth:\{persistSession:false,autoRefreshToken:false\}\}\);/);
 assert.match(index,/if\(!\/\^Bearer \\S\+\$\/\.test\(auth\)\)return reply\(\{error:'Please sign in\.'\},401\);/);
 assert.match(index,/env\('RESEND_API_KEY'\)/);assert.match(index,/env\('MAIL_FROM'\)\|\|'Harvest Tycoon <noreply@harvesttycoon\.com>'/);
 assert.doesNotMatch(index+read('supabase/functions/news-mail/send.js'),/re_[A-Za-z0-9_]{20,}|eyJ[A-Za-z0-9_-]{20,}/,'no key pasted in');
 assert.doesNotMatch(read('supabase/functions/news-mail/send.js'),/log\([^)]*(email|\.to\b|address)/i,'no address in the log');
 assert.equal(read('supabase/functions/news-mail/deno.json'),read('supabase/functions/farm-api/deno.json'));
 const send=read('supabase/functions/news-mail/send.js');
 // Before the service role does anything, the admin's own session has been checked by the database.
 assert.ok(send.indexOf("user.rpc('news_mail_status'")<send.indexOf('const outcome=await runMailing('));
 assert.ok(send.indexOf("user.rpc('news_mail_me')")<send.indexOf('resend.one('));
 assert.equal(TIME_BUDGET,45000,'well inside the 150 seconds an Edge Function has to answer');assert.equal(PACE,1000);
});

// ---- The Admin dashboard ----
test('the client: the count and the list from the database, the rest through the function, in Frankfurt',async()=>{
 const calls=[],invoked=[];
 const supabase={rpc:async(name,args)=>{calls.push([name,args]);return {data:{total:3},error:null};},functions:{invoke:async(name,options)=>{invoked.push([name,options]);return name.includes('news-mail')&&options.body.operation==='bad'?{data:null,error:{message:'Edge Function returned a non-2xx status code',context:{json:async()=>({error:'Not authorized.'})}}}
  :options.body.operation==='lost'?{data:null,error:{message:'Failed to send a request to the Edge Function'}}:{data:{ok:true},error:null};}}};
 const client=createChatClient(supabase,{playerId:'admin'});
 assert.deepEqual(await client.newsMailCount({minLevel:14}),{total:3});await client.newsMailList();
 assert.deepEqual(calls,[['news_mail_count',{p_filters:{minLevel:14}}],['news_mail_list',{p_limit:10}]]);
 assert.deepEqual(await client.newsMail({operation:'send',mailing:'m'}),{ok:true});
 assert.equal(invoked[0][0],'news-mail?forceFunctionRegion=eu-central-1');assert.deepEqual(invoked[0][1].body,{operation:'send',mailing:'m'});assert.ok(invoked[0][1].timeout>=TIME_BUDGET+30000);
 await assert.rejects(client.newsMail({operation:'bad'}),{message:'Not authorized.'});
 // No answer (a timeout, the network): the email may be going already, so not "try again" but where to look first (13 Oct 2026).
 await assert.rejects(client.newsMail({operation:'lost'}),{message:'The server did not answer. Look under Last emails before you send again: Continue goes on where it stopped.'});
});

test('the dashboard: its own card on Messages for the admin only, the staff screens\' rules',()=>{
 const admin=read('src/admin-dashboard.js'),card=read('src/admin-news-mail.js');
 assert.match(admin,/import \{createNewsMail\} from '\.\/admin-news-mail\.js';/);
 assert.match(admin,/document\.body\.append\(dialog\);\n[^\n]*\n const newsMail=createNewsMail\(\{dialog,bridge\}\);/);
 assert.match(admin,/  if\(role==='admin'\)newsMail\.show\(\);\n/);
 assert.match(admin,/for\(const tab of ADMIN_TABS\)dialog\.querySelector\(`\[data-admin-tab="\$\{tab\}"\]`\)\.hidden=role!=='admin';/,'the Messages tab is the admin\'s');assert.match(card,/dialog\.querySelector\('\[data-admin-panel="messages"\]'\)\?\?dialog\.querySelector\('\[data-admin-panel="settings"\]'\)/,'on Messages (22 Oct 2026)');
 assert.match(card,/const why=error=>error\?\.raw\?\?error\?\.message;/);assert.doesNotMatch(card,/error\.message/);
 assert.doesNotMatch(card,/ · /,'no middle dot');
 assert.match(read('scripts/i18n-extract.mjs'),/admin-\[\^\/\]\*/,'staff screens stay English (left out of the catalog)');
});

test('the dashboard\'s lines: how many per language, where a send stands, the last emails (escaped)',()=>{
 assert.equal(countLine({total:28,cap:5000,languages:{en:9,es:4,nl:4,de:1}}),'Goes to 28 farmers: English 9, Español 4, Nederlands 4, Deutsch 1.');
 assert.equal(countLine({total:1,languages:{fr:1}}),'Goes to 1 farmer: Français 1.');
 assert.equal(countLine({total:0,languages:{}}),'No farmer matches: nobody would get it.');
 assert.match(countLine({total:6001,cap:5000}),/^6,001 farmers match, more than 5,000: choose a higher level or fewer days\.$/);
 assert.equal(filtersText({}),'Every farmer who said yes');assert.equal(filtersText({minLevel:14,activeDays:7}),'Farmers who said yes, from level 14, played in the last 7 days');
 assert.equal(sendLine({sent:93,recipients:94,failed:1,skipped:0,waiting:0}),'Sent to 93 of 94 farmers (1 failed). Done.');
 assert.equal(sendLine({sent:50,recipients:94,failed:0,skipped:1,waiting:43,stopped:'unknown'}),'Sent to 50 of 94 farmers (1 no longer said yes). 43 waiting. The send stopped halfway: Continue in 10 minutes. Nobody gets it twice.');
 assert.match(sendLine({sent:0,recipients:4,waiting:4,stopped:'refused'}),/check RESEND_API_KEY and MAIL_FROM/);
 const row=logRow({id:'m1',subject:'<b>Sale</b>',filters:{minLevel:14},languages:['en','nl'],sent:3,failed:0,skipped:0,pending:2,sending:0,recipients:5,by:'Tony',createdAt:'2026-10-13T10:00:00Z'});
 assert.match(row,/“&lt;b&gt;Sale&lt;\/b&gt;”/);assert.match(row,/in English, Nederlands/);assert.match(row,/data-mail-continue="m1">Continue<\/button>/);
 assert.doesNotMatch(logRow({id:'m2',subject:'x',filters:{},languages:['en'],sent:5,failed:0,skipped:0,pending:0,sending:0,recipients:5}),/Continue/);
});

// A small page for the card: elements by id from its markup, their values, options and events.
function fakePage(){
 class El{
  constructor(attrs={}){Object.assign(this,{hidden:false,disabled:false,textContent:'',value:'',placeholder:'',dataset:{},listeners:{},options:[]},attrs);}
  set innerHTML(html){this._html=html;this.byId=new Map();
   for(const m of html.matchAll(/<(\w+)([^>]*?)\sid="([^"]+)"([^>]*)>/g)){const attrs=`${m[2]} ${m[4]}`,get=n=>(new RegExp(`\\s${n}="([^"]*)"`).exec(attrs)??[])[1];
    this.byId.set(m[3],new El({tag:m[1],value:get('value')??'',placeholder:get('placeholder')??'',hidden:/\shidden(\s|$)/.test(attrs)}));}
   const select=this.byId.get('admin-mail-language');if(select)select.options=LANGUAGES.map(l=>({value:l.code,textContent:l.name}));}
  get innerHTML(){return this._html??'';}
  querySelector(selector){return this.byId?.get(selector.replace(/^#/,''))??null;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  async fire(type,event={}){for(const fn of this.listeners[type]??[])await fn({preventDefault(){},target:this,...event});}
 }
 const settings=new El();const dialog={querySelector:s=>s==='[data-admin-panel="settings"]'?settings:null};
 settings.append=section=>{settings.section=section;};
 globalThis.document={createElement:()=>new El()};
 return {dialog,settings,$:id=>settings.section.querySelector(`#admin-mail-${id}`)};
}
test('the card: the News editor per language, the live count, a test of the chosen language, Send with Continue until done',async()=>{
 const page=fakePage(),asked=[],sent=[],confirms=[];
 const replies=[{id:'m1',recipients:94,sent:50,failed:0,skipped:0,waiting:44,progress:50},{id:'m1',recipients:94,sent:94,failed:0,skipped:0,waiting:0,progress:44}];
 const bridge={chat:{newsMailCount:async f=>{asked.push(f);return {total:28,cap:5000,languages:{en:9,es:4}};},newsMailList:async()=>[],
  newsMail:async body=>{sent.push(body);return body.operation==='test'?{to:ADMIN_EMAIL,language:body.language}:replies.shift();}}};
 const card=createNewsMail({dialog:page.dialog,bridge,ask:async o=>{confirms.push(o);return true;},pause:async()=>{}});
 assert.equal(page.settings.section.hidden,true,'hidden until the admin\'s dashboard shows it');
 card.show();await new Promise(r=>setImmediate(r));
 assert.equal(page.settings.section.hidden,false);assert.deepEqual(asked,[{}]);assert.equal(page.$('count').textContent,'Goes to 28 farmers: English 9, Español 4.');
 page.$('level').value='14';await page.$('level').fire('input');assert.deepEqual(asked.at(-1),{minLevel:14});
 page.$('days').value='7';await page.$('days').fire('change');assert.deepEqual(asked.at(-1),{minLevel:14,activeDays:7});
 // English first, then Dutch: the English shows in Dutch's empty fields, as what to translate.
 Object.assign(page.$('subject'),{value:'Weekend offer'});page.$('text').value='Something special';page.$('label').value='Open my farm';
 page.$('language').value='nl';await page.$('language').fire('change',{target:{value:'nl'}});
 assert.equal(page.$('subject').value,'');assert.equal(page.$('subject').placeholder,'Weekend offer');assert.equal(page.$('text').placeholder,'Something special');
 assert.match(page.$('language-note').textContent,/Farmers who play in Nederlands get this text\. A part left empty stays English\./);
 page.$('text').value='Iets speciaals';
 await page.$('test').fire('click');
 assert.deepEqual(sent[0],{operation:'test',texts:{en:{subject:'Weekend offer',body:'Something special',buttonLabel:'Open my farm'},nl:{body:'Iets speciaals'}},buttonUrl:GAME_URL,language:'nl'});
 assert.equal(page.$('status').textContent,`Test sent to ${ADMIN_EMAIL}, in Nederlands. Check it, then Send.`);
 assert.equal(page.$('language').options.find(o=>o.value==='nl').textContent,'Nederlands ✓');assert.equal(page.$('language').options.find(o=>o.value==='de').textContent,'Deutsch (English for now)');
 assert.equal(page.$('language').options.find(o=>o.value==='en').textContent,'English (everyone else)');
 page.$('count').dataset.count='28';
 await page.$('form').fire('submit');
 assert.equal(confirms.length,1);assert.equal(confirms[0].title,'Email 28 farmers?');assert.match(confirms[0].description,/“Weekend offer” goes to: farmers who said yes, from level 14, played in the last 7 days, in 2 languages/);
 assert.deepEqual(sent.slice(1).map(b=>b.operation),['start','send'],'went on until nothing waited');
 assert.deepEqual(sent[1].filters,{minLevel:14,activeDays:7});assert.deepEqual(sent[2],{operation:'send',mailing:'m1'});
 assert.equal(page.$('status').textContent,'Sent to 94 of 94 farmers. Done.');
 assert.equal(page.$('subject').value,'','the editor is empty again');assert.equal(page.$('send').disabled,false);
 // Nothing in English: not sent, and the server is never asked.
 const before=sent.length;await page.$('form').fire('submit');assert.equal(sent.length,before);assert.equal(page.$('status').textContent,MESSAGES.english);
});

test('the privacy policy already promises this: a separate yes, and the unsubscribe link in every email',()=>{
 const policy=read('public/privacy.html');
 assert.match(policy,/We send you news and offers by email only if you say yes to that separately\. Confirming your email address does not mean yes\./);
 assert.match(policy,/You can withdraw it at any time in Settings or through the unsubscribe link in every email/);
 assert.match(policy,/<strong>Resend<\/strong>: delivery of our emails\./);
});
