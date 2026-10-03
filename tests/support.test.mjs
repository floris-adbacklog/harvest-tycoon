import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LANGUAGES,playBadge} from '../public/languages.js';
import {buildSupportPages,buildLanguagePages,translateSupport,supportPath,READY} from '../scripts/build-languages.mjs';
import {catalog,translations} from '../scripts/i18n.mjs';
import * as support from '../supabase/functions/support/support.js';
const {handleSupport,checkRequest,readForm,cleanText,cleanEmail,subjectOf,supportMail,supportUrl,appKind,ipHash,clientIp,SITE,TO,MAX_BODY,LIMITS,RESULTS,TOPICS}=support;
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// Help and support (3 Oct 2026): public/support.html, its page per language, the support Edge Function and supabase/support.sql.
const ACTION='https://jnmdirvidffzxukbdmij.supabase.co/functions/v1/support';
const TOKENS=/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/i;
const normalize=text=>text.replace(/\s+/g,' ').trim();
const unescape=text=>text.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const exact=(dict,key)=>{const out=dict[key];return out&&typeof out==='object'?out.other:out;};
const others=READY.filter(code=>code!=='en');
const IOS_UA='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0';
const ANDROID_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.70 Mobile Safari/537.36 HarvestTycoonApp/1.0';
const CHROME_UA='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.6668.70 Mobile Safari/537.36';

// ---- The page ----
test('the support page: a legal-style page with no script but the app mark, short help first, then a form that posts to the function',()=>{
 const html=read('public/support.html');
 assert.match(html,/^<!doctype html>\n<html lang="en"><head>/);
 assert.match(html,/<link rel="canonical" href="https:\/\/www\.harvesttycoon\.com\/support">/);
 assert.ok(!/<script/i.test(html.replace('<script src="/android-app.js"></script>','')),'no scripts but the app mark');
 assert.doesNotMatch(html,/googletagmanager|gtag\(|fbq\(|\son[a-z]+="/i,'no tracking, no inline handlers');
 const mark=html.indexOf('<script src="/android-app.js"></script>');assert.ok(mark>0&&mark<html.indexOf('rel="stylesheet"'),'the mark before the first stylesheet');
 assert.match(html,/<link rel="stylesheet" href="\/legal\.css"><link rel="stylesheet" href="\/support\.css"><\/head>/);
 assert.match(html,/<link rel="icon" href="\/favicon\.ico" sizes="16x16 32x32 48x48"><link rel="icon" type="image\/png" sizes="96x96" href="\/assets\/favicon-96\.png">/);
 assert.match(html,/src="\/assets\/harvest-tycoon-logo\.webp"/);assert.doesNotMatch(html,/<img [^>]*src="[^"]*\.png"/,'pictures as WebP');
 // Short help before the form: how to play, a forgotten password, Google/Facebook, deleting the account.
 const form=html.indexOf('<form');
 for(const href of ['/wiki','/delete-account'])assert.ok(html.indexOf(`<a href="${href}">`)<form,href);
 assert.ok(html.indexOf('Forgot your password?')<form);assert.ok(html.indexOf('mailto:info@harvesttycoon.com')<form);
 // Nothing about buying: no shop, no prices (the App Store's rule about other ways to pay).
 assert.doesNotMatch(html,/stripe|diamonds|€|\$\d|checkout/i);
 assert.doesNotMatch(html,/floris@|millstone\.nl/i);
});

test('the form: POST, the browser\'s own encoding, the fields the function reads, limits as the function\'s, and a hidden honeypot',()=>{
 const html=read('public/support.html');
 const form=html.match(/<form [^>]*>/)[0];
 assert.equal(form,`<form class="support-form" method="post" action="${ACTION}" accept-charset="utf-8">`);
 assert.doesNotMatch(form,/enctype/,'urlencoded, the type the function asks for');
 assert.match(html,/<input type="hidden" name="lang" value="en">/);
 assert.match(html,new RegExp(`<input type="email" name="email" required maxlength="${support.LENGTH.email}" autocomplete="email"`));
 assert.match(html,new RegExp(`<input type="text" name="name" maxlength="${support.LENGTH.name}"`));
 assert.match(html,new RegExp(`<textarea name="message" required minlength="${support.LENGTH.min}" maxlength="${support.LENGTH.max}"`));
 assert.deepEqual([...html.matchAll(/<option value="([a-z]+)"( selected)?>([^<]+)<\/option>/g)].map(m=>[m[1],m[3]]),Object.entries(TOPICS));
 assert.match(html,/<div class="support-trap" aria-hidden="true"><input type="text" name="website" tabindex="-1" autocomplete="off"><\/div>/);
 assert.match(read('public/support.css'),/\.support-trap\{position:absolute;inset-inline-start:-10000px;/);
 assert.match(html,/<button type="submit" class="legal-button">Send<\/button>/,'a button, not <input value> (the page builder translates no value)');
 // The boxes the way back opens, one per result, shown by :target only; "sent" takes the form's place.
 for(const id of RESULTS)assert.match(html,new RegExp(`<p id="${id}" class="support-note is-(good|bad)"`),id);
 assert.ok(html.indexOf('id="sent"')<html.indexOf('<form'),'the boxes before the form, so the sibling rule can hide it');
 const css=read('public/support.css');
 assert.match(css,/\.support-note\{display:none;/);assert.match(css,/\.support-note:target\{display:block\}/);assert.match(css,/#sent:target~\.support-form\{display:none\}/);
 assert.doesNotMatch(css,/font-size:(9|10|11)(\.\d+)?px/);
});

test('the site links it: /support and /<code>/support, the home page\'s footer, the sitemap; the App Store support URL works',()=>{
 const vercel=JSON.parse(read('vercel.json')),codes=others.join('|');
 for(const source of ['/support','/support/'])assert.ok(vercel.rewrites.some(r=>r.source===source&&r.destination==='/support.html'),source);
 for(const source of [`/:lang(${codes})/support`,`/:lang(${codes})/support/`])assert.ok(vercel.rewrites.some(r=>r.source===source&&r.destination==='/:lang/support.html'),source);
 const play=read('public/play.html');
 assert.match(play,/<footer class="site-legal">.*<a href="\/partners">Partner programme<\/a><a href="\/support">Help and support<\/a><button/);
 assert.match(read('scripts/build-static.mjs'),/buildSupportPages\('dist-static',readFileSync\('public\/support\.html','utf8'\)\);/);
 assert.equal(supportPath('en'),'/support');assert.equal(supportPath('es'),'/es/support');
});

// ---- The pages per language ----
function build(){
 const out=mkdtempSync(join(tmpdir(),'support-'));
 writeFileSync(join(out,'sitemap.xml'),read('public/sitemap.xml'));
 const html=read('public/support.html'),english=buildSupportPages(out,html);
 return {out,html,english,page:code=>readFileSync(join(out,code,'support.html'),'utf8')};
}
test('every translated language gets its support page: exact translations, its own address, its language sent with the form',()=>{
 const {out,html,english,page}=build();
 try{
  const set=english.match(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g);
  assert.deepEqual(set.map(l=>l.match(/hreflang="([^"]+)" href="([^"]+)"/).slice(1)),[...READY.map(code=>[code,`${SITE}${supportPath(code)}`]),['x-default',`${SITE}/support`]]);
  assert.equal(english.replace(set.join(''),''),html,'the English page only gains the list of languages');
  assert.equal(readFileSync(join(out,'support.html'),'utf8'),english);
  const parts=english.split(TOKENS);
  const keys=Object.entries(catalog()).filter(([,source])=>source==='public/support.html').map(([key])=>key);
  assert.ok(keys.length>20,'the page\'s texts are in the catalog');
  for(const code of others){
   const dict=translations(code),doc=page(code);
   assert.ok(doc.startsWith(`<!doctype html>\n<html lang="${code}"${code==='ar'?' dir="rtl"':''} data-page-lang="${code}"><head>`),code);
   assert.match(doc,new RegExp(`<link rel="canonical" href="${SITE}/${code}/support">`));assert.equal((doc.match(/rel="canonical"/g)??[]).length,1);
   assert.match(doc,new RegExp(`<input type="hidden" name="lang" value="${code}">`),`${code}: the way back comes to this page`);
   assert.match(doc,new RegExp(`<form class="support-form" method="post" action="${ACTION}"`));
   assert.ok(doc.includes(`src="${playBadge(code)}"`),`${code}: the badge in the page's language`);
   assert.ok(!/href="\/"/.test(doc)&&doc.includes(`href="/${code}/"`),`${code}: the sign-in page in the same language`);
   assert.deepEqual(doc.match(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g),set,code);
   const mine=doc.split(TOKENS);assert.equal(mine.length,parts.length,`${code}: no tag lost or added`);
   for(let i=0;i<mine.length;i+=2)if(/\p{L}/u.test(parts[i]))assert.equal(normalize(unescape(mine[i])),normalize(exact(dict,normalize(unescape(parts[i])))),`${code}: ${parts[i].trim()}`);
   assert.equal(doc.match(/<title>([^<]*)<\/title>/)[1],unescape(exact(dict,'Help and support — Harvest Tycoon')).replace(/&/g,'&amp;'));
   assert.match(doc,new RegExp(`<meta name="description" content="${exact(dict,'Help with Harvest Tycoon: how to play, a forgotten password, deleting your account, and a form to send us a message.').replace(/[.?*+()[\]]/g,'\\$&')}">`),`${code} description`);
   for(const key of keys)if(exact(dict,key)!==key&&key.length>4)assert.ok(!doc.includes(`>${key}<`),`${code}: "${key}" is still English`);
  }
  // The sitemap: every support page once, even when the build runs twice.
  buildSupportPages(out,html);
  const xml=readFileSync(join(out,'sitemap.xml'),'utf8');
  for(const code of READY)assert.equal(xml.split(`<loc>${SITE}${supportPath(code)}</loc>`).length,2,code);
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('a support text without its translation stops the build; the home page per language links its own support page',()=>{
 const html=read('public/support.html'),dict={...translations('es')};delete dict['Quick help'];
 assert.throws(()=>translateSupport(html,'es',dict),/Support page es: missing "Quick help"/);
 assert.throws(()=>translateSupport(html.replace('name="lang" value="en"','name="lang" value="xx"'),'es',translations('es')),/support\.html has no hidden lang field/);
 const out=mkdtempSync(join(tmpdir(),'support-home-'));
 try{
  buildLanguagePages(out,read('public/play.html'));
  for(const code of others){const doc=readFileSync(join(out,code,'index.html'),'utf8');assert.ok(doc.includes(`<a href="/${code}/support">${exact(translations(code),'Help and support')}</a>`),code);}
 }finally{rmSync(out,{recursive:true,force:true});}
});

// ---- The Edge Function's rules ----
test('the languages, the way back and the app kind are the site\'s own',()=>{
 assert.deepEqual([...support.LANGUAGES],LANGUAGES.map(l=>l.code));
 assert.equal(supportUrl('en','sent'),'https://www.harvesttycoon.com/support#sent');
 assert.equal(supportUrl('es','error-busy'),'https://www.harvesttycoon.com/es/support#error-busy');
 assert.equal(supportUrl('xx','sent'),'https://www.harvesttycoon.com/support#sent','an unknown language: English');
 assert.equal(supportUrl('ar','https://evil.example/'),'https://www.harvesttycoon.com/ar/support#error-failed','only the known results');
 assert.equal(supportUrl('../evil','sent'),'https://www.harvesttycoon.com/support#sent');
 // The same rule as the page's own app mark (public/android-app.js).
 const window={};vm.runInNewContext(read('public/android-app.js'),{window,document:{documentElement:{hasAttribute:()=>false,setAttribute(){},getAttribute:()=>null}},navigator:{userAgent:''},location:{search:''},localStorage:{getItem:()=>null,setItem(){},removeItem(){}}});
 for(const ua of [IOS_UA,ANDROID_UA,CHROME_UA,'',`${IOS_UA.replace('HarvestTycoonApp/1.0','')}`,'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 HarvestTycoonApp/1.0']){
  const want=window.harvestIosApp(ua)?'ios':window.harvestAndroidApp(ua,'',null).app?'android':'web';
  assert.equal(appKind(ua),want,ua);
 }
 assert.equal(appKind(IOS_UA),'ios');assert.equal(appKind(ANDROID_UA),'android');assert.equal(appKind(CHROME_UA),'web');assert.equal(appKind(undefined),'web');
});

const form=fields=>new URLSearchParams({lang:'en',email:'farmer@example.com',name:'Rosa',topic:'bug',message:'My cows stopped giving milk after the update.',website:'',...fields});
test('the fields are checked: one plain address, a message of 10 to 2000 characters, a known topic and language',()=>{
 const ok=readForm(form({}));
 assert.deepEqual(ok,{lang:'en',trap:false,email:'farmer@example.com',name:'Rosa',topic:'bug',message:'My cows stopped giving milk after the update.'});
 for(const email of ['','nope','a@b','farmer@example','a@b.c','x@y.com\r\nBcc: victim@example.com','x@y.com,victim@example.com','x@y.com; y@z.com','"Rosa" <x@y.com>','x y@z.com','x@y.com\nBcc:z@z.com','x@-y.com','x..y@z.com',`${'a'.repeat(65)}@example.com`,`a@${'b'.repeat(250)}.com`,'rosa@exämple.com'])
  assert.equal(readForm(form({email})).error,'error-email',JSON.stringify(email));
 assert.equal(readForm(form({email:'x@y.com\r\n'})).email,'x@y.com','spaces and line breaks around it go');
 assert.equal(readForm(form({email:'  Rosa.O\'Neil+farm@Example.co.uk '})).email,'Rosa.O\'Neil+farm@Example.co.uk');
 assert.equal(readForm(form({message:'too short'})).error,'error-message');
 assert.equal(readForm(form({message:'  \u0000\u0001   short  \u0007 '})).error,'error-message','control characters and spaces do not count');
 assert.equal(readForm(form({message:'x'.repeat(2001)})).error,'error-message');
 assert.equal(readForm(form({message:'x'.repeat(2000)})).message.length,2000);
 // A textarea sends every line break as CRLF: 1000 lines that fit maxlength (the browser counts \n) still fit here.
 const lines=Array(1000).fill('a').join('\r\n');assert.equal(lines.length,2998);assert.equal(readForm(form({message:lines})).message.length,1999);
 assert.equal(readForm(form({message:'Hello\u0000 there, my farm\u202e is gone!'})).message,'Hello there, my farm is gone!','no NUL (Postgres) and no direction tricks');
 assert.equal(readForm(form({topic:'admin'})).topic,'other');assert.equal(readForm(form({topic:'__proto__'})).topic,'other');assert.equal(readForm(form({topic:'purchases'})).topic,'purchases');
 assert.equal(readForm(form({lang:'zz'})).lang,'en');assert.equal(readForm(form({lang:'ja'})).lang,'ja');
 assert.equal(readForm(form({name:'Rosa\r\nBcc: x@y.com   the   farmer'})).name,'Rosa Bcc: x@y.com the farmer','a name on one line');
 assert.equal(readForm(form({name:'n'.repeat(80)})).name.length,40);
 assert.equal(readForm(form({website:'http://spam.example'})).trap,true);
 assert.equal(readForm(new URLSearchParams('')).error,'error-email');assert.equal(readForm(null).error,'error-email');
 assert.equal(cleanText('a\r\nb\rc\td'),'a\nb\nc d');assert.equal(cleanEmail('x@y.com'),'x@y.com');
});

test('the mail: to info@ only, a one-line subject from the topic and the first words, the message escaped in the HTML',()=>{
 const at=new Date('2026-10-03T12:34:56Z');
 const fields=readForm(form({name:'<b>Rosa</b>',message:'<script>alert(1)</script> My "cows" & sheep\r\nSubject: hacked\r\nsecond line here please help me out',topic:'bug'}));
 const mail=supportMail(fields,{app:'ios',agent:`${IOS_UA}\r\nX-Evil: 1`,id:42,at});
 assert.equal(mail.subject,'[Support] Something does not work — <script>alert(1)</script> My "cows" & sheep Subject: hacked…');
 assert.doesNotMatch(mail.subject,/[\r\n]/);
 assert.ok(mail.html.includes('&lt;script&gt;alert(1)&lt;/script&gt; My &quot;cows&quot; &amp; sheep\nSubject: hacked'));
 assert.ok(mail.html.includes('&lt;b&gt;Rosa&lt;/b&gt;'));assert.doesNotMatch(mail.html,/<script|<b>Rosa/);
 assert.match(mail.text,/Topic: Something does not work\nFrom: farmer@example\.com\nFarmer name: <b>Rosa<\/b>\nLanguage: en\nSent from: iPhone app\nDevice: [^\n]*HarvestTycoonApp\/1\.0 X-Evil: 1\nSent at: 2026-10-03 12:34 UTC\nMessage id: 42\n\n<script>/);
 assert.match(mail.text,/Reply to this email to answer them/);
 assert.equal(subjectOf('purchases','Short one'),'[Support] Purchases — Short one');
 assert.equal(subjectOf('other','one two three four five six seven eight nine ten'),'[Support] Something else — one two three four five six seven eight…');
 assert.ok(subjectOf('account','x'.repeat(500)).length<120,'a word without spaces is cut too');
 assert.match(supportMail(readForm(form({name:''})),{at}).text,/Farmer name: —\n[^]*Sent from: website/);
});

function fakeAdmin({limited=false,fail=false}={}){
 const log={rpc:[],deleted:[]};
 return {log,admin:{
  async rpc(name,args){log.rpc.push({name,args});if(fail)return {data:null,error:{code:'42P01',message:'relation does not exist'}};return {data:limited?null:7,error:null};},
  from(table){return {delete(){return {eq:async(column,value)=>{log.deleted.push({table,column,value});return {error:null};}};}};}
 }};
}
const headers=(more={})=>new Headers({'content-type':'application/x-www-form-urlencoded','user-agent':ANDROID_UA,'x-forwarded-for':'198.51.100.7, 10.0.0.1',...more});
test('a message is stored with the limits, mailed to info@ with reply_to the farmer, and the farmer goes back to #sent',async()=>{
 const {admin,log}=fakeAdmin(),sent=[];
 const r=await handleSupport({admin,raw:form({lang:'nl'}).toString(),headers:headers(),env:{ipSecret:'secret'},mail:async(message,replyTo)=>sent.push({message,replyTo})});
 assert.deepEqual(r,{location:'https://www.harvesttycoon.com/nl/support#sent'});
 assert.equal(log.rpc.length,1);assert.equal(log.rpc[0].name,'support_submit');
 const args=log.rpc[0].args;
 assert.deepEqual({...args,p_ip_hash:undefined},{p_email:'farmer@example.com',p_farmer_name:'Rosa',p_topic:'bug',p_message:'My cows stopped giving milk after the update.',p_language:'nl',p_app:'android',
  p_user_agent:ANDROID_UA,p_ip_hash:undefined,p_max_ip:LIMITS.perIp,p_max_email:LIMITS.perEmail,p_max_day:LIMITS.perDay});
 assert.equal(args.p_ip_hash,await ipHash('198.51.100.7','secret'));assert.match(args.p_ip_hash,/^[0-9a-f]{32}$/);
 assert.ok(!JSON.stringify(log).includes('198.51.100.7'),'never the address itself');
 assert.equal(sent.length,1);assert.equal(sent[0].replyTo,'farmer@example.com');assert.match(sent[0].message.subject,/^\[Support\] Something does not work — My cows/);
 assert.match(sent[0].message.text,/Message id: 7/);
 assert.deepEqual(LIMITS,{perIp:3,perEmail:3,perDay:200});
});
test('a robot in the honeypot hears "sent" and nothing is stored or mailed; bad fields go back to their box; a limit to #error-busy',async()=>{
 const mailNever=async()=>{throw new Error('no mail');};
 let {admin,log}=fakeAdmin();
 assert.deepEqual(await handleSupport({admin,raw:form({website:'x',lang:'de'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/de/support#sent`});
 assert.deepEqual(await handleSupport({admin,raw:form({website:'x',email:'bad'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#sent`},'even with bad fields');
 assert.equal(log.rpc.length,0);
 assert.deepEqual(await handleSupport({admin,raw:form({email:'x@y.com\r\nBcc: a@b.com',lang:'fr'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/fr/support#error-email`});
 assert.deepEqual(await handleSupport({admin,raw:form({message:'hi'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#error-message`});
 assert.deepEqual(await handleSupport({admin,raw:'garbage%%%',headers:headers(),mail:mailNever}),{location:`${SITE}/support#error-email`});
 assert.equal(log.rpc.length,0,'nothing stored for a refused form');
 ({admin,log}=fakeAdmin({limited:true}));
 assert.deepEqual(await handleSupport({admin,raw:form({lang:'ja'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/ja/support#error-busy`});
 assert.equal(log.deleted.length,0);
 // No address known (no proxy header): the network limit is skipped, the others still count.
 ({admin,log}=fakeAdmin());
 await handleSupport({admin,raw:form({}).toString(),headers:new Headers({'content-type':'application/x-www-form-urlencoded'}),mail:async()=>{}});
 assert.equal(log.rpc[0].args.p_ip_hash,null);assert.equal(log.rpc[0].args.p_user_agent,null);assert.equal(log.rpc[0].args.p_app,'web');
 assert.equal(clientIp(new Headers({'cf-connecting-ip':'203.0.113.9','x-forwarded-for':'1.1.1.1'})),'203.0.113.9');
});
test('a mail that fails: the message is taken out again (no limit used up) and the farmer goes to #error-failed; a database error too',async()=>{
 let {admin,log}=fakeAdmin();
 const r=await handleSupport({admin,raw:form({lang:'uk'}).toString(),headers:headers(),mail:async()=>{throw new Error('Resend 500');}});
 assert.deepEqual(r,{location:`${SITE}/uk/support#error-failed`});
 assert.deepEqual(log.deleted,[{table:'support_messages',column:'id',value:7}]);
 ({admin,log}=fakeAdmin({fail:true}));
 assert.deepEqual(await handleSupport({admin,raw:form({lang:'hi'}).toString(),headers:headers(),mail:async()=>{throw new Error('never');}}),{location:`${SITE}/hi/support#error-failed`});
});
test('Resend: from MAIL_FROM, to info@ only, reply_to the farmer; no key, no mail',async()=>{
 const calls=[],before={Deno:globalThis.Deno,fetch:globalThis.fetch};
 const settings={RESEND_API_KEY:'re_test',MAIL_FROM:'Harvest Tycoon <noreply@harvesttycoon.com>'};
 globalThis.Deno={env:{get:key=>settings[key]}};globalThis.fetch=async(url,init)=>{calls.push({url,init});return new Response('{}',{status:200});};
 try{
  await support.resendMail({subject:'s',text:'t',html:'h'},'farmer@example.com');
  assert.equal(calls[0].url,'https://api.resend.com/emails');
  const body=JSON.parse(calls[0].init.body);
  assert.deepEqual(body,{from:'Harvest Tycoon <noreply@harvesttycoon.com>',to:[TO],reply_to:'farmer@example.com',subject:'s',html:'h',text:'t'});
  assert.equal(TO,'info@harvesttycoon.com');
  globalThis.fetch=async()=>new Response('{}',{status:500});
  await assert.rejects(support.resendMail({subject:'s',text:'t',html:'h'},'x@y.com'),/Resend 500/);
  delete settings.RESEND_API_KEY;await assert.rejects(support.resendMail({subject:'s',text:'t',html:'h'},'x@y.com'),/RESEND_API_KEY/);
 }finally{globalThis.Deno=before.Deno;globalThis.fetch=before.fetch;}
 assert.doesNotMatch(read('supabase/functions/support/support.js'),/to:\s*\[\s*(form|replyTo|email)/,'never to the sender');
});

test('before the form is read: POST only, a form\'s content type, a size cap, and only from our site',()=>{
 const h=more=>new Headers({'content-type':'application/x-www-form-urlencoded',...more});
 assert.equal(checkRequest({method:'POST',headers:h()}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://www.harvesttycoon.com'})}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://harvesttycoon.com'})}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'null'})}),null,'a privacy-minded browser');
 assert.equal(checkRequest({method:'POST',headers:h({'content-type':'application/x-www-form-urlencoded; charset=UTF-8'})}),null);
 for(const method of ['GET','OPTIONS','PUT','DELETE','HEAD'])assert.equal(checkRequest({method,headers:h()}).status,405,method);
 assert.equal(checkRequest({method:'POST',headers:new Headers()}).status,415,'no content type');
 for(const type of ['multipart/form-data; boundary=x','application/json','text/plain'])assert.equal(checkRequest({method:'POST',headers:h({'content-type':type})}).status,415,type);
 assert.equal(checkRequest({method:'POST',headers:h({'content-length':String(MAX_BODY+1)})}).status,413);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://evil.example'})}).status,403);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://www.harvesttycoon.com.evil.example'})}).status,403);
 // A 2000-character message in a script that encodes long still fits.
 const long=form({message:'खेत'.repeat(666),name:'किसान'.repeat(8)}).toString();assert.ok(long.length<MAX_BODY,String(long.length));
});

test('the Edge Function itself: 405, 415, 413 and 403 as plain text, every form answer a 303 back that is never cached',async()=>{
 const source=read('supabase/functions/support/index.ts');
 assert.match(source,/Deploy with --no-verify-jwt/);
 assert.equal(read('supabase/functions/support/deno.json'),read('supabase/functions/farm-api/deno.json'));
 const settings={SUPABASE_URL:'https://x.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'service',RESEND_API_KEY:'re_test'};
 const {admin,log}=fakeAdmin(),mails=[];let handler;
 const fetch=async(url,init)=>{mails.push({url,body:JSON.parse(init.body)});return new Response('{}',{status:200});};
 const before={Deno:globalThis.Deno,fetch:globalThis.fetch};globalThis.Deno={env:{get:key=>settings[key]}};globalThis.fetch=fetch;
 try{
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm,'')),{...support,createClient:()=>admin,Deno:{env:{get:key=>settings[key]},serve:fn=>handler=fn},Response,String,Error,console:{error(){}}});
  const call=(method,body,more={})=>handler(new Request(ACTION,{method,headers:{'content-type':'application/x-www-form-urlencoded',...more},...(body===undefined?{}:{body})}));
  const get=await call('GET');assert.equal(get.status,405);assert.equal(get.headers.get('allow'),'POST');assert.equal(get.headers.get('cache-control'),'no-store');
  assert.equal((await call('OPTIONS')).status,405);
  assert.equal((await call('POST','{}',{'content-type':'application/json'})).status,415);
  assert.equal((await call('POST',form({}).toString(),{origin:'https://evil.example'})).status,403);
  assert.equal((await call('POST',`email=a%40b.com&message=${'x'.repeat(MAX_BODY)}`)).status,413);
  const ok=await call('POST',form({lang:'pt'}).toString(),{origin:'https://www.harvesttycoon.com','user-agent':IOS_UA,'cf-connecting-ip':'192.0.2.1'});
  assert.equal(ok.status,303);assert.equal(ok.headers.get('location'),`${SITE}/pt/support#sent`);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal(await ok.text(),'');
  assert.equal(log.rpc[0].args.p_app,'ios');assert.equal(log.rpc[0].args.p_ip_hash,await ipHash('192.0.2.1','service'),'the service role key when SUPPORT_IP_SECRET is not set');
  assert.equal(mails.length,1);assert.deepEqual(mails[0].body.to,['info@harvesttycoon.com']);assert.equal(mails[0].body.reply_to,'farmer@example.com');
  const bad=await call('POST',form({email:'nope'}).toString());assert.equal(bad.status,303);assert.equal(bad.headers.get('location'),`${SITE}/support#error-email`);
 }finally{globalThis.Deno=before.Deno;globalThis.fetch=before.fetch;}
});

// ---- The database ----
test('supabase/support.sql: re-runnable, RLS on and nothing for anon or authenticated, limits in one locked function, cleanup by cron',()=>{
 const sql=read('supabase/support.sql');
 assert.match(sql,/create table if not exists public\.support_messages \(/);
 assert.match(sql,/alter table public\.support_messages enable row level security;\nrevoke all on public\.support_messages from anon, authenticated;/);
 for(const index of ['support_messages_ip on public.support_messages(ip_hash, created_at)','support_messages_email on public.support_messages(lower(email), created_at)','support_messages_created on public.support_messages(created_at)'])
  assert.ok(sql.includes(`create index if not exists ${index}`),index);
 assert.match(sql,/check \(topic in \('account','bug','purchases','other'\)\)/);
 assert.deepEqual(Object.keys(TOPICS),['account','bug','purchases','other']);
 assert.match(sql,/check \(app in \('web','android','ios'\)\)/);
 assert.match(sql,/create or replace function public\.support_submit\([^)]*\)\nreturns bigint language plpgsql security definer set search_path to '' as \$f\$/);
 assert.match(sql,/perform pg_advisory_xact_lock\(hashtextextended\('harvest-support',0\)\);/);
 const signature='public.support_submit(text,text,text,text,text,text,text,text,integer,integer,integer)';
 assert.ok(sql.includes(`revoke all on function ${signature} from public, anon, authenticated;`));assert.ok(sql.includes(`grant execute on function ${signature} to service_role;`));
 // The function's named arguments are the ones support.js sends.
 const params=[...sql.match(/function public\.support_submit\(([^)]*)\)/)[1].matchAll(/(p_[a-z_]+) /g)].map(m=>m[1]);
 assert.deepEqual(params,['p_email','p_farmer_name','p_topic','p_message','p_language','p_app','p_user_agent','p_ip_hash','p_max_ip','p_max_email','p_max_day']);
 assert.match(sql,/select cron\.unschedule\('harvest-support-messages'\) where exists\(select 1 from cron\.job where jobname='harvest-support-messages'\);/);
 assert.match(sql,/set ip_hash=null where ip_hash is not null and created_at<now\(\)-interval '2 hours'/);
 assert.doesNotMatch(sql,/raise exception/i,'nothing for the translation catalog');
 assert.doesNotMatch(sql,/grant [^;]* to (anon|authenticated)/);
});
