import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LANGUAGES,playBadge} from '../public/languages.js';
import {buildSupportPages,buildLanguagePages,translateSupport,supportPath,READY,OG_LOCALE,languageLinks} from '../scripts/build-languages.mjs';
import {FAMILY_CONFIG,FAMILY_MIN_LEVEL} from '../game/farm-state.js';
import {catalog,translations} from '../scripts/i18n.mjs';
import * as support from '../supabase/functions/support/support.js';
const {handleSupport,checkRequest,readForm,readBody,formLang,cleanText,cleanEmail,subjectOf,supportMail,supportUrl,appKind,ipHash,clientIp,SITE,TO,TRAP,MAX_BODY,LIMITS,RESULTS,TOPICS}=support;
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
test('the support page: a legal-style page with no script but the app mark and the draft, short help first, then a form that posts to the function',()=>{
 const html=read('public/support.html');
 assert.match(html,/^<!doctype html>\n<html lang="en"><head>/);
 assert.match(html,/<link rel="canonical" href="https:\/\/www\.harvesttycoon\.com\/support">/);
 assert.ok(!/<script/i.test(html.replace('<script src="/android-app.js"></script>','').replace('<script src="/support-form.js"></script>','')),'no scripts but the app mark and the draft');
 assert.match(html,/<\/footer>\n<script src="\/support-form\.js"><\/script>\n<\/body><\/html>\n?$/,'the draft after the form');
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

// Questions (8 Oct 2026): a Questions heading, one h3 per question with its answer under it, true to the game's rules.
test('the support page answers the common questions, true to the game, before the form',()=>{
 const html=read('public/support.html'),faq=html.match(/<div class="support-faq">([\s\S]*?)<\/div>/)[1];
 assert.ok(html.indexOf('<h2 id="questions">Questions</h2>')<html.indexOf('<div class="support-faq">')&&html.indexOf('<div class="support-faq">')<html.indexOf('<form'));
 const questions=[...faq.matchAll(/<h3(?: class="support-stores")?>([^<]+)<\/h3>/g)].map(m=>m[1]);
 for(const q of ['Is Harvest Tycoon free?','Do I need to download anything?','Which devices can I play on?','Can I play with friends?','Which languages can I play in?','How do I delete my account?','How do I contact you?'])assert.ok(questions.includes(q),q);
 assert.equal((faq.match(/<h3[ >]/g)??[]).length,(faq.match(/<\/h3>\s*(<!--app-store:soon-->)?<p[ >]/g)??[]).length,'an answer under every question');
 assert.ok(faq.includes(`From level ${FAMILY_MIN_LEVEL} you can start or join a Farm Family of up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers`),'the family rules as the game has them');
 assert.ok(faq.includes(`Harvest Tycoon is in ${LANGUAGES.filter(l=>l.ready).length} languages.`));
 assert.ok(faq.includes('open Settings, go to Privacy and tap Delete account'),'the way the game and /delete-account say it');
 assert.ok(faq.includes('info@harvesttycoon.com'));
 assert.doesNotMatch(faq,/ · /);
});

// 8 Oct 2026: inside our apps (html[data-app], the iPhone app also data-app-os=ios) the page says nothing about the stores, as the footer's
// store badges already step aside there; on the website every question shows, and the FAQPage data keeps them all.
test('inside our apps the questions about the stores step aside; on the website they show',()=>{
 const html=read('public/support.html'),faq=html.match(/<div class="support-faq">([\s\S]*?)<\/div>/)[1],css=read('public/support.css');
 assert.match(css,/\nhtml\[data-app\] \.support-stores\{display:none\}/);assert.doesNotMatch(css,/(^|\n)\.support-stores\{/,'on the website they show');
 const items=[...faq.replace(/<!--\/?app-store:\w+-->/g,'').matchAll(/<(h3|p)( class="support-stores")?>([^<]+)<\/\1>/g)].map(m=>({tag:m[1],stores:Boolean(m[2]),text:m[3]}));
 assert.ok(items.length>=14);
 for(const item of items)if(/Google Play|App Store|iPhone|coming soon|download|devices/i.test(item.text))assert.ok(item.stores,`steps aside in the apps: ${item.text}`);
 for(const question of ['Do I need to download anything?','Which devices can I play on?'])assert.ok(faq.includes(`<h3 class="support-stores">${question}</h3>`),question);
 assert.equal(items.filter(i=>i.stores).length,5,'two questions, their answers (the devices answer in both App Store wordings)');
 assert.ok(items.filter(i=>!i.stores).length>=14,'the rest shows in the apps too');
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
 assert.match(html,new RegExp(`<div class="support-trap" aria-hidden="true"><input type="text" name="${TRAP}" tabindex="-1" autocomplete="off"><\\/div>`));
 assert.equal(TRAP,'hp_note','a name no autofill or password manager fills in');assert.doesNotMatch(html,/name="website"/);
 assert.match(read('public/support.css'),/\.support-trap\{position:absolute;inset-inline-start:-10000px;/);
 assert.match(html,/<button type="submit" class="legal-button">Send<\/button>/,'a button, not <input value> (the page builder translates no value)');
 // The boxes the way back opens, one per result, shown by :target only; "sent" takes the form's place.
 // tabindex -1: the jump to #sent / #error-… moves the focus there, so a screen reader reads the box out.
 for(const id of RESULTS)assert.match(html,new RegExp(`<p id="${id}" class="support-note is-(good|bad)" role="(status|alert)" tabindex="-1">`),id);
 assert.ok(html.indexOf('id="sent"')<html.indexOf('<form'),'the boxes before the form, so the sibling rule can hide it');
 const css=read('public/support.css');
 assert.match(css,/\.support-note\{display:none;/);assert.match(css,/\.support-note:target\{display:block\}/);assert.match(css,/#sent:target~\.support-form\{display:none\}/);
 assert.doesNotMatch(css,/font-size:(9|10|11)(\.\d+)?px/);
 // Our apps have no Google or Facebook sign-in: that card is hidden there (android-app.js marks html[data-app] in both apps).
 assert.match(html,/<li class="support-social"><a href="\/"><strong>Signed in with Google or Facebook\?<\/strong>/);
 assert.match(css,/html\[data-app\] \.support-social\{display:none\}/);
});

test('the draft: a refused message comes back in the form in the same tab, #sent forgets it, no storage is no problem',()=>{
 const source=read('public/support-form.js');
 assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|sendBeacon|localStorage/,'only this tab, never sent anywhere');
 const run=({hash='',saved=null,values={},storage=true}={})=>{
  const data=saved===null?{}:{'harvest-tycoon:support-draft':saved},listeners={};
  const field=(name,value)=>({tagName:name==='topic'?'SELECT':name==='message'?'TEXTAREA':'INPUT',value,options:name==='topic'?Object.keys(TOPICS).map(value=>({value})):undefined});
  const elements=Object.fromEntries(['email','name','topic','message'].map(name=>[name,field(name,values[name]??(name==='topic'?'other':''))]));
  const form={elements,addEventListener:(type,fn)=>listeners[type]=fn};
  const sessionStorage={getItem:key=>data[key]??null,setItem:(key,value)=>data[key]=value,removeItem:key=>delete data[key]};
  const window=storage?{sessionStorage}:{get sessionStorage(){throw new Error('blocked');}};
  vm.runInNewContext(source,{window,document:{querySelector:q=>q==='.support-form'?form:null},location:{hash},JSON,String});
  return {elements,data,listeners};
 };
 const draft=JSON.stringify({email:'rosa@example.com',name:'Rosa',topic:'purchases',message:'My diamonds did not arrive.'});
 let r=run({hash:'#error-failed',saved:draft});
 assert.deepEqual(Object.fromEntries(Object.entries(r.elements).map(([k,v])=>[k,v.value])),JSON.parse(draft));
 r=run({hash:'#error-busy',saved:draft,values:{message:'What the browser kept'}});assert.equal(r.elements.message.value,'What the browser kept','the browser\'s own Back wins');
 r=run({hash:'#error-email',saved:JSON.stringify({topic:'admin'})});assert.equal(r.elements.topic.value,'other','an unknown topic is not set');
 r=run({hash:'#sent',saved:draft});assert.equal(r.elements.message.value,'');assert.deepEqual(r.data,{},'sent: the draft is gone');
 r=run({saved:'{broken'});assert.equal(r.elements.email.value,'');
 r.elements.message.value='Hello there';r.listeners.input();assert.equal(JSON.parse(r.data['harvest-tycoon:support-draft']).message,'Hello there');
 assert.ok(r.listeners.submit&&r.listeners.change);
 assert.doesNotThrow(()=>run({hash:'#error-failed',storage:false}),'no storage: the page just works');
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
  // The footer's line of languages (8 Oct 2026): every language's home page, labelled "Language" in the page's language.
  const NAV=label=>`\n <nav class="legal-languages" aria-label="${label}">${languageLinks()}</nav>\n</footer>`,bare=doc=>doc.replace(/\n <nav class="legal-languages"[^>]*>.*?<\/nav>/,'');
  assert.ok(english.includes(NAV('Language')));
  assert.equal(bare(english).replace(set.join(''),''),html,'the English page only gains the list of languages (and their links)');
  assert.equal(readFileSync(join(out,'support.html'),'utf8'),english);
  const parts=bare(english).split(TOKENS);
  const keys=Object.entries(catalog()).filter(([,source])=>source==='public/support.html').map(([key])=>key);
  assert.ok(keys.length>20,'the page\'s texts are in the catalog');
  for(const code of others){
   const dict=translations(code),doc=page(code);
   assert.ok(doc.startsWith(`<!doctype html>\n<html lang="${code}"${code==='ar'?' dir="rtl"':''} data-page-lang="${code}"><head>`),code);
   assert.match(doc,new RegExp(`<link rel="canonical" href="${SITE}/${code}/support">`));assert.equal((doc.match(/rel="canonical"/g)??[]).length,1);
   assert.match(doc,new RegExp(`<input type="hidden" name="lang" value="${code}">`),`${code}: the way back comes to this page`);
   assert.match(doc,new RegExp(`<form class="support-form" method="post" action="${ACTION}"`));
   assert.ok(doc.includes(`src="${playBadge(code)}"`),`${code}: the badge in the page's language`);
   assert.ok(!/href="\/"/.test(bare(doc))&&doc.includes(`href="/${code}/"`),`${code}: the sign-in page in the same language`);
   assert.deepEqual(doc.match(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g),set,code);
   assert.ok(doc.includes(NAV(exact(dict,'Language'))),`${code}: every language in the footer`);
   assert.ok(doc.includes(`<meta property="og:url" content="${SITE}/${code}/support">`)&&doc.includes(`<meta property="og:locale" content="${OG_LOCALE[code]}">`),`${code}: the share card's own address and language`);
   assert.ok(doc.includes(`<meta property="og:title" content="${unescape(exact(dict,'Help and support — Harvest Tycoon')).replace(/&/g,'&amp;')}">`),`${code} og:title`);
   const mine=bare(doc).split(TOKENS);assert.equal(mine.length,parts.length,`${code}: no tag lost or added`);
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

const form=fields=>new URLSearchParams({lang:'en',email:'farmer@example.com',name:'Rosa',topic:'bug',message:'My cows stopped giving milk after the update.',hp_note:'',...fields});
test('the fields are checked: one plain address, a message of 10 to 2000 characters, a known topic and language',()=>{
 const ok=readForm(form({}));
 assert.deepEqual(ok,{lang:'en',trap:false,email:'farmer@example.com',name:'Rosa',topic:'bug',message:'My cows stopped giving milk after the update.'});
 for(const email of ['','nope','a@b','farmer@example','a@b.c','x@y.com\r\nBcc: victim@example.com','x@y.com,victim@example.com','x@y.com; y@z.com','"Rosa" <x@y.com>','x y@z.com','x@y.com\nBcc:z@z.com','x@-y.com','x..y@z.com',`${'a'.repeat(65)}@example.com`,`a@${'b'.repeat(250)}.com`,'rosa@exämple.com','x@y.xn--','x@y.xn-a','x@y.c0m'])
  assert.equal(readForm(form({email})).error,'error-email',JSON.stringify(email));
 assert.equal(readForm(form({email:'x@y.com\r\n'})).email,'x@y.com','spaces and line breaks around it go');
 // A domain in another script as the browser sends it (punycode), top level too: пример.рф, приклад.укр, 例子.中国.
 for(const email of ['user@xn--e1afmkfd.xn--p1ai','user@xn--80aikifvh.xn--j1amh','user@xn--fsqu00a.xn--fiqs8s','user@xn--e1afmkfd.ru'])assert.equal(readForm(form({email})).email,email,email);
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
 assert.equal(readForm(form({hp_note:'http://spam.example'})).trap,true);assert.equal(readForm(form({website:'https://rosa.example'})).trap,false,'the old name is no trap');
 assert.equal(formLang(form({lang:'tr'}).toString()),'tr');assert.equal(formLang('%%%lang=xx'),'en');assert.equal(formLang(undefined),'en');
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

// support_submit as support.sql answers it: {id, mail}, or null when a limit is reached.
function fakeAdmin({limited=false,fail=false,mail=true}={}){
 const log={rpc:[],updated:[]};
 return {log,admin:{
  async rpc(name,args){log.rpc.push({name,args});if(fail)return {data:null,error:{code:'42P01',message:'relation does not exist'}};return {data:limited?null:{id:7,mail:mail&&!args.p_spam},error:null};},
  from(table){return {update(values){return {eq:async(column,value)=>{log.updated.push({table,values,column,value});return {error:null};}};}};}
 }};
}
const headers=(more={})=>new Headers({'content-type':'application/x-www-form-urlencoded','user-agent':ANDROID_UA,'cf-connecting-ip':'198.51.100.7','x-forwarded-for':'203.0.113.66',...more});
test('a message is stored with the limits, mailed to info@ with reply_to the farmer, and the farmer goes back to #sent',async()=>{
 const {admin,log}=fakeAdmin(),sent=[];
 const r=await handleSupport({admin,raw:form({lang:'nl'}).toString(),headers:headers(),env:{ipSecret:'secret'},mail:async(message,replyTo)=>sent.push({message,replyTo})});
 assert.deepEqual(r,{location:'https://www.harvesttycoon.com/nl/support#sent'});
 assert.equal(log.rpc.length,1);assert.equal(log.rpc[0].name,'support_submit');
 const args=log.rpc[0].args;
 assert.deepEqual({...args,p_ip_hash:undefined},{p_email:'farmer@example.com',p_farmer_name:'Rosa',p_topic:'bug',p_message:'My cows stopped giving milk after the update.',p_language:'nl',p_app:'android',
  p_user_agent:ANDROID_UA,p_ip_hash:undefined,p_spam:false,p_max_ip:LIMITS.perIp,p_max_email:LIMITS.perEmail,p_max_day:LIMITS.perDay,p_max_stored:LIMITS.stored});
 assert.equal(args.p_ip_hash,await ipHash('198.51.100.7','secret'));assert.match(args.p_ip_hash,/^[0-9a-f]{32}$/);
 assert.ok(!JSON.stringify(log).includes('198.51.100.7'),'never the address itself');
 assert.equal(sent.length,1);assert.equal(sent[0].replyTo,'farmer@example.com');assert.match(sent[0].message.subject,/^\[Support\] Something does not work — My cows/);
 assert.match(sent[0].message.text,/Message id: 7/);
 assert.deepEqual(LIMITS,{perIp:3,perEmail:3,perDay:200,stored:1000});
});
test('a robot in the honeypot hears "sent", is never mailed and is kept as spam; bad fields go back to their box; a limit to #error-busy',async()=>{
 const mailNever=async()=>{throw new Error('no mail');};
 let {admin,log}=fakeAdmin();
 assert.deepEqual(await handleSupport({admin,raw:form({hp_note:'x',lang:'de'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/de/support#sent`});
 assert.equal(log.rpc.length,1);assert.equal(log.rpc[0].args.p_spam,true,'kept, marked spam, for the owner to look at');
 assert.deepEqual(await handleSupport({admin,raw:form({hp_note:'x',email:'bad'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#sent`},'even with bad fields');
 ({admin,log}=fakeAdmin({limited:true}));
 assert.deepEqual(await handleSupport({admin,raw:form({hp_note:'x'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#sent`},'a robot past a limit too');
 ({admin,log}=fakeAdmin({fail:true}));
 assert.deepEqual(await handleSupport({admin,raw:form({hp_note:'x'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#sent`});
 ({admin,log}=fakeAdmin());
 assert.deepEqual(await handleSupport({admin,raw:form({email:'x@y.com\r\nBcc: a@b.com',lang:'fr'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/fr/support#error-email`});
 assert.deepEqual(await handleSupport({admin,raw:form({message:'hi'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/support#error-message`});
 assert.deepEqual(await handleSupport({admin,raw:'garbage%%%',headers:headers(),mail:mailNever}),{location:`${SITE}/support#error-email`});
 assert.equal(log.rpc.length,0,'nothing stored for a refused form');
 ({admin,log}=fakeAdmin({limited:true}));
 assert.deepEqual(await handleSupport({admin,raw:form({lang:'ja'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/ja/support#error-busy`});
 assert.equal(log.updated.length,0);
 // Past the day's mails: stored (mailed false) and the farmer hears "sent"; the owner reads it in support_messages.
 ({admin,log}=fakeAdmin({mail:false}));
 assert.deepEqual(await handleSupport({admin,raw:form({lang:'ja'}).toString(),headers:headers(),mail:mailNever}),{location:`${SITE}/ja/support#sent`});
 assert.equal(log.rpc.length,1);assert.equal(log.updated.length,0);
 // No address known (no proxy header): the network limit is skipped, the others still count.
 ({admin,log}=fakeAdmin());
 await handleSupport({admin,raw:form({}).toString(),headers:new Headers({'content-type':'application/x-www-form-urlencoded'}),mail:async()=>{}});
 assert.equal(log.rpc[0].args.p_ip_hash,null);assert.equal(log.rpc[0].args.p_user_agent,null);assert.equal(log.rpc[0].args.p_app,'web');
 assert.equal(clientIp(new Headers({'cf-connecting-ip':'203.0.113.9','x-forwarded-for':'1.1.1.1'})),'203.0.113.9');
 assert.equal(clientIp(new Headers({'x-real-ip':'203.0.113.10','x-forwarded-for':'1.1.1.1'})),'203.0.113.10');
 assert.equal(clientIp(new Headers({'x-forwarded-for':'1.1.1.1, 203.0.113.11'})),null,'x-forwarded-for comes from the client: never used');
});
test('a mail that fails: the message stays, marked not mailed, and the farmer goes to #error-failed; a database error too',async()=>{
 let {admin,log}=fakeAdmin();
 const r=await handleSupport({admin,raw:form({lang:'uk'}).toString(),headers:headers(),mail:async()=>{throw new Error('Resend 500');}});
 assert.deepEqual(r,{location:`${SITE}/uk/support#error-failed`});
 assert.deepEqual(log.updated,[{table:'support_messages',values:{mailed:false},column:'id',value:7}]);
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

test('the body is read as it streams in and stops at the cap, also without Content-Length',async()=>{
 const stream=chunks=>new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(typeof chunk==='string'?new TextEncoder().encode(chunk):chunk);c.close();}});
 assert.equal(await readBody(stream(['email=a','%40b.com'])),'email=a%40b.com');
 const bytes=new TextEncoder().encode('ü');assert.equal(await readBody(stream([bytes.slice(0,1),bytes.slice(1)])),'ü','a letter cut between two chunks');
 assert.equal(await readBody(stream(['x'.repeat(MAX_BODY)])),'x'.repeat(MAX_BODY));
 let pulled=0;const endless=new ReadableStream({pull(c){pulled++;c.enqueue(new Uint8Array(4096));}});
 assert.equal(await readBody(endless),null);assert.ok(pulled<=MAX_BODY/4096+2,'stops right after the cap');
 assert.equal(await readBody(null),'');
});

test('before the form is read: POST only, a form\'s content type, a size cap, and only from our site',()=>{
 const h=more=>new Headers({'content-type':'application/x-www-form-urlencoded',...more});
 assert.equal(checkRequest({method:'POST',headers:h()}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://www.harvesttycoon.com'})}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'https://harvesttycoon.com'})}),null);
 assert.equal(checkRequest({method:'POST',headers:h({origin:'null'})}),null,'a privacy-minded browser');
 assert.equal(checkRequest({method:'POST',headers:h({'content-type':'application/x-www-form-urlencoded; charset=UTF-8'})}),null);
 for(const method of ['OPTIONS','PUT','DELETE','PATCH'])assert.equal(checkRequest({method,headers:h()}).status,405,method);
 for(const method of ['GET','HEAD'])assert.deepEqual(checkRequest({method,headers:h()}),{location:`${SITE}/support`},'someone who opened the address goes to the page');
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
  const logged=[];
  vm.runInNewContext(stripTypeScriptTypes(source.replace(/^import .*;\n/gm,'')),{...support,createClient:()=>admin,Deno:{env:{get:key=>settings[key]},serve:fn=>handler=fn},Response,String,Error,console:{error(){},log:(...args)=>logged.push(args.join(' '))}});
  const call=(method,body,more={})=>handler(new Request(ACTION,{method,headers:{'content-type':'application/x-www-form-urlencoded',...more},...(body===undefined?{}:{body,duplex:'half'})}));
  const get=await call('GET');assert.equal(get.status,303);assert.equal(get.headers.get('location'),`${SITE}/support`);assert.equal(get.headers.get('cache-control'),'no-store');
  const options=await call('OPTIONS');assert.equal(options.status,405);assert.equal(options.headers.get('allow'),'POST');assert.equal(options.headers.get('cache-control'),'no-store');
  // No Content-Length (sent in chunks): still stopped at the cap.
  const endless=new ReadableStream({pull(c){c.enqueue(new TextEncoder().encode('message='+'x'.repeat(4096)));}});
  assert.equal((await call('POST',endless)).status,413);
  assert.equal((await call('POST','{}',{'content-type':'application/json'})).status,415);
  assert.equal((await call('POST',form({}).toString(),{origin:'https://evil.example'})).status,403);
  assert.equal((await call('POST',`email=a%40b.com&message=${'x'.repeat(MAX_BODY)}`)).status,413);
  const ok=await call('POST',form({lang:'pt'}).toString(),{origin:'https://www.harvesttycoon.com','user-agent':IOS_UA,'cf-connecting-ip':'192.0.2.1'});
  assert.equal(ok.status,303);assert.equal(ok.headers.get('location'),`${SITE}/pt/support#sent`);assert.equal(ok.headers.get('cache-control'),'no-store');assert.equal(await ok.text(),'');
  assert.equal(log.rpc[0].args.p_app,'ios');assert.equal(log.rpc[0].args.p_ip_hash,await ipHash('192.0.2.1','service'),'the service role key when SUPPORT_IP_SECRET is not set');
  assert.deepEqual(logged,['Support IP from cf-connecting-ip'],'the header\'s name once, never the address');
  assert.equal(mails.length,1);assert.deepEqual(mails[0].body.to,['info@harvesttycoon.com']);assert.equal(mails[0].body.reply_to,'farmer@example.com');
  const bad=await call('POST',form({email:'nope'}).toString());assert.equal(bad.status,303);assert.equal(bad.headers.get('location'),`${SITE}/support#error-email`);
  assert.equal(logged.length,1,'once per instance');
  // Anything unexpected: still back to the page in its own language.
  admin.rpc=async()=>{throw new Error('network down');};
  const broken=await call('POST',form({lang:'pt'}).toString());assert.equal(broken.status,303);assert.equal(broken.headers.get('location'),`${SITE}/pt/support#error-failed`);
 }finally{globalThis.Deno=before.Deno;globalThis.fetch=before.fetch;}
});

// ---- The database ----
test('supabase/support.sql: re-runnable, RLS on and nothing for anon or authenticated, limits in one locked function, cleanup by cron',()=>{
 const sql=read('supabase/support.sql');
 assert.match(sql,/create table if not exists public\.support_messages \(/);
 assert.match(sql,/alter table public\.support_messages enable row level security;\nrevoke all on public\.support_messages from anon, authenticated;/);
 for(const column of ['mailed','spam'])assert.ok(sql.includes(` ${column} boolean not null default false,\n`)&&sql.includes(`alter table public.support_messages add column if not exists ${column} boolean not null default false;`),column);
 for(const index of ['support_messages_ip on public.support_messages(ip_hash, created_at)','support_messages_email on public.support_messages(lower(email), created_at)','support_messages_created on public.support_messages(created_at)'])
  assert.ok(sql.includes(`create index if not exists ${index}`),index);
 assert.match(sql,/check \(topic in \('account','bug','purchases','other'\)\)/);
 assert.deepEqual(Object.keys(TOPICS),['account','bug','purchases','other']);
 assert.match(sql,/check \(app in \('web','android','ios'\)\)/);
 assert.match(sql,/create or replace function public\.support_submit\([^)]*\)\nreturns jsonb language plpgsql security definer set search_path to '' as \$f\$/);
 assert.ok(sql.includes('drop function if exists public.support_submit(text,text,text,text,text,text,text,text,integer,integer,integer);'),'the first version\'s signature goes');
 // The hard ceiling first, then the network and the address; past the day's mails it is stored, not mailed; spam never mailed.
 const body=sql.slice(sql.indexOf('perform pg_advisory_xact_lock'),sql.indexOf('end $f$'));
 const order=['p_max_stored','p_max_ip','p_max_email','p_max_day'].map(name=>body.indexOf(name));assert.deepEqual([...order].sort((a,b)=>a-b),order);
 assert.match(body,/where mailed and created_at>now\(\)-interval '1 day';\n mail:=not coalesce\(p_spam,false\) and n<greatest\(coalesce\(p_max_day,0\),0\);/);
 assert.match(body,/return jsonb_build_object\('id',new_id,'mail',mail\);/);
 assert.match(sql,/perform pg_advisory_xact_lock\(hashtextextended\('harvest-support',0\)\);/);
 const signature='public.support_submit(text,text,text,text,text,text,text,text,boolean,integer,integer,integer,integer)';
 assert.ok(sql.includes(`revoke all on function ${signature} from public, anon, authenticated;`));assert.ok(sql.includes(`grant execute on function ${signature} to service_role;`));
 // The function's named arguments are the ones support.js sends.
 const params=[...sql.match(/function public\.support_submit\(([^)]*)\)/)[1].matchAll(/(p_[a-z_]+) /g)].map(m=>m[1]);
 assert.deepEqual(params,['p_email','p_farmer_name','p_topic','p_message','p_language','p_app','p_user_agent','p_ip_hash','p_spam','p_max_ip','p_max_email','p_max_day','p_max_stored']);
 assert.match(sql,/grant select, update, delete on public\.support_messages to service_role;/,'the function marks a failed mail');
 assert.match(sql,/or \(spam and created_at<now\(\)-interval '30 days'\)/);
 assert.match(sql,/select cron\.unschedule\('harvest-support-messages'\) where exists\(select 1 from cron\.job where jobname='harvest-support-messages'\);/);
 assert.match(sql,/set ip_hash=null where ip_hash is not null and created_at<now\(\)-interval '2 hours'/);
 assert.doesNotMatch(sql,/raise exception/i,'nothing for the translation catalog');
 assert.doesNotMatch(sql,/grant [^;]* to (anon|authenticated)/);
});
test('supabase/support-check.sql: the limits checked on the real database, all inside one transaction that is rolled back',()=>{
 const sql=read('supabase/support-check.sql'),main=read('supabase/support.sql');
 assert.match(sql,/\nbegin;\ndo \$t\$/);assert.match(sql,/end \$t\$;\nrollback;\n$/);
 assert.doesNotMatch(sql.replace(/^--.*$/gm,''),/\b(commit|insert|update|delete|drop|create|alter|grant|truncate)\b/i,'only support_submit, nothing else');
 // Every call has the function's 13 arguments.
 const n=main.match(/function public\.support_submit\(([^)]*)\)/)[1].split(',').length;
 for(const call of sql.matchAll(/public\.support_submit\(([^;]*?)\)(?= is| ?;|;|\n)/g))assert.equal(call[1].split(/,(?![^(]*\))/).length,n,call[0]);
 assert.equal((sql.match(/public\.support_submit\(/g)??[]).length,8);
 assert.match(sql,/raise notice 'support_submit: all checks passed';/);
});
