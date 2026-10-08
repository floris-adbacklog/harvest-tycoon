import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LANGUAGES,languagePath,pageLanguage} from '../public/languages.js';
import {buildLanguagePages,translatePage,READY,OG_LOCALE,languageLinks} from '../scripts/build-languages.mjs';
import {buildWiki} from '../scripts/build-wiki.mjs';
import {chosenLanguage,startTranslation,LANGUAGE_KEY,translateDocument,createTranslator} from '../public/i18n.js';
import {catalog,translations} from '../scripts/i18n.mjs';
import {tipLink} from '../src/browser-tip.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SITE='https://www.harvesttycoon.com';
const others=READY.filter(code=>code!=='en');
const TOKENS=/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/i;
const normalize=text=>text.replace(/\s+/g,' ').trim();
const exact=(dict,key)=>{const out=dict[key];return out&&typeof out==='object'?out.other:out;};
const unescape=text=>text.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const meta=(html,name)=>unescape(html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)">`))?.[1]??'');
const alternatesOf=html=>html.match(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g)??[];

// Oct 2026: a sign-in page per language, written at build time from the translations, so search engines and visitors get it in
// their language at once.
function build(){
 const out=mkdtempSync(join(tmpdir(),'languages-'));
 writeFileSync(join(out,'sitemap.xml'),read('public/sitemap.xml'));
 const html=read('public/play.html').replace('<meta name="harvest-version" content="dev">','<meta name="harvest-version" content="test123">');
 const home=buildLanguagePages(out,html);
 return {out,html,home,page:code=>readFileSync(join(out,code,'index.html'),'utf8')};
}

test('every translated language gets its own page, written in its language with exact translations only',()=>{
 const {html,home,page}=build();
 assert.deepEqual(READY,LANGUAGES.filter(l=>l.ready).map(l=>l.code));
 // Every language's home page as a real link (8 Oct 2026), inside the language menu's box, hidden until the menu is drawn over them.
 const SWITCH=`<div id="language-switch" class="language-switch" hidden>${languageLinks()}</div>`,bare=doc=>doc.replace(languageLinks(),'');
 assert.ok(home.includes(SWITCH));for(const code of others)assert.ok(page(code).includes(SWITCH),code);
 assert.equal((languageLinks().match(/<a href="\/([a-z]{2}\/)?" hreflang="[a-z]{2}" lang="[a-z]{2}">[^<]+<\/a>/g)??[]).length,READY.length);
 const english=bare(home).split(TOKENS);
 // The English texts of play.html that a translation changes: none of them may stay on a language page.
 const playKeys=Object.entries(catalog()).filter(([,source])=>source==='public/play.html').map(([key])=>key);
 for(const code of others){
  const dict=translations(code),doc=page(code);
  assert.ok(doc.startsWith(`<!doctype html>\n<html lang="${code}"${code==='ar'?' dir="rtl"':''} data-page-lang="${code}"><head><meta charset="utf-8"><script src="/i18n-boot.js"></script>`),`${code}: language, direction, and the early script still first`);
  assert.match(doc,/<meta name="harvest-version" content="test123">/,code);
  assert.equal(doc.match(/<title>([^<]*)<\/title>/)[1],exact(dict,'Harvest Tycoon — Free Online 3D Farming Game'),code);
  for(const name of ['description','og:title','og:description','og:image:alt','twitter:title','twitter:description'])assert.equal(meta(doc,name),exact(dict,meta(html,name)),`${code} ${name}`);
  assert.equal(meta(doc,'og:locale'),OG_LOCALE[code]);assert.equal(meta(doc,'og:url'),`${SITE}/${code}/`);
  assert.match(doc,new RegExp(`<link rel="canonical" href="${SITE}/${code}/">`));assert.equal((doc.match(/rel="canonical"/g)??[]).length,1);
  // The same page, tag for tag: every text is the exact translation of the English one, scripts and styles are untouched.
  const parts=bare(doc).split(TOKENS);assert.equal(parts.length,english.length,`${code}: no tag lost or added`);
  for(let i=0;i<parts.length;i+=2)if(/\p{L}/u.test(english[i]))assert.equal(normalize(unescape(parts[i])),normalize(exact(dict,normalize(english[i]))),`${code}: ${english[i].trim()}`);
  for(let i=1;i<parts.length;i+=2)if(/^<(script|style)/i.test(english[i]))assert.equal(parts[i],english[i],`${code}: a script stays as it is`);
  for(const key of playKeys)if(exact(dict,key)!==key&&key.length>3)assert.ok(!doc.includes(`>${key}<`)&&!['title','aria-label','placeholder','alt','content'].some(name=>doc.includes(` ${name}="${key}"`)),`${code}: "${key}" is still English`);
 }
 // The same hreflang set on every page, the English home page included: every language plus x-default.
 const set=alternatesOf(home);
 assert.equal(set.length,READY.length+1);
 assert.deepEqual(set.map(link=>link.match(/hreflang="([^"]+)" href="([^"]+)"/).slice(1)),[...READY.map(code=>[code,`${SITE}${languagePath(code)}`]),['x-default',`${SITE}/`]]);
 for(const code of others)assert.deepEqual(alternatesOf(page(code)),set,code);
 assert.match(home,new RegExp(`<link rel="canonical" href="${SITE}/">`),'the English home page keeps its own address');
 assert.equal(meta(home,'og:url'),`${SITE}/`);assert.match(home,/^<!doctype html>\n<html lang="en">/);
 assert.equal(bare(home).replace(set.join(''),''),html,'the English page only gains the list of languages (and their links)');
});

test('a text without its exact translation stops the build (the game\'s guesses never reach a search engine)',()=>{
 const html=read('public/play.html'),dict={...translations('es')};
 delete dict['The Harvest Tycoon logo over the farm at dusk: fields, a red barn, a windmill and a tractor'];delete dict['Create account'];
 assert.throws(()=>translatePage(html,'es',dict),/Language page es: missing "The Harvest Tycoon logo over the farm at dusk[^"]*", "Create account"/);
 assert.throws(()=>translatePage(html.replace('<meta name="description"','<meta name="summary"'),'es',translations('es')),/no description meta tag/);
 assert.throws(()=>translatePage(html.replace('<p class="hero-copy">','<p class="hero-copy" title="a > b">'),'es',translations('es')),/a > inside a quoted value/);
 // A translation is written as it is, also with a $ in it (a replacement pattern to String.replace).
 const dollar={...translations('es'),[meta(html,'description')]:'Gana 5 $& más'};
 assert.equal(meta(translatePage(html,'es',dollar),'description'),'Gana 5 $& más');
});

test('the sitemap lists the home page once per language, each with the full hreflang set; the wiki is still added once',async()=>{
 const {out,html}=build();
 buildLanguagePages(out,html);await buildWiki(out);await buildWiki(out);
 const xml=readFileSync(join(out,'sitemap.xml'),'utf8');
 assert.match(xml,/<urlset xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml" xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
 const homes=xml.match(/<url><loc>https:\/\/www\.harvesttycoon\.com\/([a-z]{2}\/)?<\/loc>.*<\/url>/g);
 assert.equal(homes.length,READY.length,'one entry per language, also after a second run');
 for(const entry of homes)assert.equal((entry.match(/<xhtml:link rel="alternate" hreflang="[^"]+" href="[^"]+"\/>/g)??[]).length,READY.length+1);
 assert.match(homes[0],/hreflang="x-default" href="https:\/\/www\.harvesttycoon\.com\/"\/>/);
 assert.match(xml,/<loc>https:\/\/www\.harvesttycoon\.com\/privacy<\/loc>/);
 assert.equal((xml.match(/\/wiki<\/loc>/g)??[]).length,1);
 const source=read('scripts/build-static.mjs');
 assert.ok(source.indexOf("buildLanguagePages('dist-static',html)")>0&&source.indexOf("buildLanguagePages('dist-static',html)")<source.indexOf("await buildWiki('dist-static')"),'made before the wiki, from the same page');
 assert.match(source,/writeFileSync\('dist-static\/index\.html',home\);writeFileSync\('dist-static\/play\.html',home\);/);
});

test('Vercel serves /xx/ for exactly the translated languages, /xx and /en go to the right page, and the pages are never stale',()=>{
 const vercel=JSON.parse(read('vercel.json')),codes=others.join('|');
 const redirect=vercel.redirects.find(r=>r.destination==='/:lang/');
 assert.deepEqual(redirect.source.match(/^\/:lang\((.+)\)$/)[1].split('|').sort(),[...others].sort(),'the address list is the list of translated languages');
 assert.equal(redirect.source,`/:lang(${codes})`);assert.equal(redirect.permanent,true);
 for(const source of ['/en','/en/'])assert.ok(vercel.redirects.some(r=>r.source===source&&r.destination==='/'&&r.permanent),source);
 assert.ok(vercel.rewrites.some(r=>r.source===`/:lang(${codes})/`&&r.destination==='/:lang/index.html'));
 const header=vercel.headers.find(r=>r.source===`/:lang(${codes})/`);
 assert.deepEqual(header?.headers,[{key:'Cache-Control',value:'no-cache'}]);
 // One installed app for every language page.
 const manifest=JSON.parse(read('public/manifest.webmanifest'));assert.equal(manifest.id,'/');assert.equal(manifest.scope,'/');
});

test('an address to its language and back',()=>{
 assert.equal(languagePath('en'),'/');assert.equal(languagePath('es'),'/es/');
 for(const code of others){assert.equal(pageLanguage(`/${code}/`),code);assert.equal(pageLanguage(`/${code}`),code);}
 assert.equal(pageLanguage('/es/index.html'),'es','the same file under its own name');
 for(const path of ['/','/en/','/en/index.html','/play.html','/wiki','/xx/','/es/x','/es/play.html','/es//',undefined])assert.equal(pageLanguage(path),null,String(path));
});

test('a language page is its language even when the device chose another one or keeps nothing',()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),store=new Map([[LANGUAGE_KEY,'de']]);
 globalThis.localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 Object.defineProperty(globalThis,'navigator',{value:{languages:['nl-NL']},configurable:true});
 try{
  globalThis.document={documentElement:{getAttribute:name=>name==='data-page-lang'?'es':null}};
  assert.equal(chosenLanguage(),'es');
  globalThis.localStorage={getItem(){throw new Error('blocked');}};assert.equal(chosenLanguage(),'es');
  globalThis.document={documentElement:{getAttribute:()=>null}};assert.equal(chosenLanguage(),'nl','the device language elsewhere');
 }finally{
  delete globalThis.localStorage;delete globalThis.document;
  if(saved)Object.defineProperty(globalThis,'navigator',saved);else delete globalThis.navigator;
 }
});

// The early script, run as the browser runs it.
function boot({page=null,saved=null,blocked=false,languages=['en-GB']}={}){
 const attrs={'data-page-lang':page},classes=new Set(),styles=[],fetched=[],store=new Map(saved?[[LANGUAGE_KEY,saved]]:[]);
 const root={getAttribute:name=>attrs[name]??null,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)},lang:'en',dir:''};
 const context=vm.createContext({document:{documentElement:root,head:{appendChild:s=>styles.push(s.textContent)},createElement:()=>({})},navigator:{languages},window:{},setTimeout(){},
  localStorage:{getItem:k=>{if(blocked)throw new Error('blocked');return store.get(k)??null;},setItem:(k,v)=>{if(blocked)throw new Error('blocked');store.set(k,v);}},
  fetch:url=>{fetched.push(url);return {then:()=>({})};}});
 vm.runInContext(read('public/i18n-boot.js'),context);
 return {root,classes,styles,fetched,store,window:context.window};
}
test('the early script: a language page wins, is saved as this device\'s language, and shows at once except the English-written parts',()=>{
 const es=boot({page:'es',saved:'fr'});
 assert.equal(es.root.lang,'es');assert.equal(es.store.get(LANGUAGE_KEY),'es','opening /es/ makes Spanish this device\'s language');
 assert.deepEqual(es.fetched,['/i18n/es.json']);assert.ok(es.classes.has('i18n-wait'));
 assert.doesNotMatch(es.styles[0],/\.i18n-wait body\{visibility:hidden\}/,'the page itself is not hidden');
 for(const part of ['.account-card','.cookie-banner','.farm-loading-status','.farm-loading-tip','.player-counts'])assert.ok(es.styles[0].includes(`.i18n-wait ${part}`),part);
 assert.equal(boot({page:'ar'}).root.dir,'rtl');
 const blocked=boot({page:'ja',blocked:true});assert.equal(blocked.root.lang,'ja','blocked storage still gets the page language');assert.deepEqual(blocked.fetched,['/i18n/ja.json']);
 // Every other page as before: the saved choice, else the device's language, and the whole page waits.
 const fr=boot({saved:'fr'});assert.equal(fr.root.lang,'fr');assert.match(fr.styles[0],/^\.i18n-wait body\{visibility:hidden\}/);assert.equal(fr.store.get(LANGUAGE_KEY),'fr');
 assert.equal(boot({blocked:true,languages:['de-DE']}).root.lang,'de','blocked storage no longer stops the early script');
 const en=boot({});assert.equal(en.classes.size,0);assert.deepEqual(en.fetched,[]);
});

// A language page leaves every text that is already a translation as it is (startTranslation). That is only right while no English
// text the code writes is also some other text's translation: it would stay English on that language's page. Translate it otherwise.
test('no English text is another text\'s translation, so a language page never leaves English standing',()=>{
 for(const code of others){
  const dict=translations(code),values=new Set(Object.values(dict).flatMap(out=>out&&typeof out==='object'?Object.values(out):[out]).map(out=>normalize(String(out))));
  const clash=Object.keys(dict).filter(key=>values.has(normalize(key))&&normalize(String(exact(dict,key)))!==normalize(key));
  assert.deepEqual(clash,[],`${code}: these English texts are also a translation of another text`);
 }
});

// Just enough of a page for public/i18n.js: elements with attributes, text nodes and a tree walker.
function fakePage(lang){
 const el=(attrs,children=[])=>{const e={nodeType:1,attrs,children,parentElement:null,hasAttribute:n=>n in e.attrs,getAttribute:n=>e.attrs[n]??null,setAttribute:(n,v)=>{e.attrs[n]=v;},matches:()=>false,closest:()=>null};for(const c of children)c.parentElement=e;return e;};
 const text=data=>({nodeType:3,data,parentElement:null});
 const done=text('Lots of fun'),english=text('Grow your farm'),label=el({'aria-label':'Lots of fun'});
 const root=el({'data-page-lang':lang},[el({},[done,english]),label]);root.classList={remove(){}};
 const doc={documentElement:root,createTreeWalker(start,show,filter){const list=[];const visit=n=>{for(const c of n.children??[]){const r=filter.acceptNode(c);if(r===1)list.push(c);if(r!==2)visit(c);}};visit(start);let i=0;return {nextNode:()=>list[i++]??null};}};
 return {doc,done,english,label};
}
test('on a language page the texts that are already translated stay as they are; English the code writes is still translated',async()=>{
 // "Lots of fun" stands for a translation that also fits an English text with a changing part ("{0} of {1}").
 const dict={'{0} of {1}':'{0} de {1}','Grow your farm':'Haz crecer tu granja','Something':'Lots of fun'};
 globalThis.MutationObserver=class{observe(){}};
 try{
  for(const lang of ['es',null]){
   const {doc,done,english,label}=fakePage(lang);globalThis.document=doc;globalThis.harvestI18n={code:'es',load:Promise.resolve(dict)};
   globalThis.localStorage={getItem:()=>'es',setItem(){}};
   await startTranslation(doc);
   assert.equal(english.data,'Haz crecer tu granja');
   assert.equal(done.data,lang?'Lots of fun':'Lots de fun',lang?'a language page keeps its translation':'elsewhere the game translates as before');
   assert.equal(label.attrs['aria-label'],lang?'Lots of fun':'Lots de fun');
  }
 }finally{delete globalThis.MutationObserver;delete globalThis.document;delete globalThis.harvestI18n;delete globalThis.localStorage;}
});

test('the in-app browser tip opens the language page in the phone\'s browser; the privacy policy names the language setting',()=>{
 const loc={origin:'https://www.harvesttycoon.com'};
 assert.equal(tipLink({documentElement:{getAttribute:()=>'es'}},loc),'https://www.harvesttycoon.com/es/');
 assert.equal(tipLink({documentElement:{getAttribute:()=>null}},loc),'https://www.harvesttycoon.com/');
 assert.match(read('public/privacy.html'),/<code>harvest-tycoon:language<\/code><\/td><td data-label="What it does">[^<]*language page you opened \(for example \/es\/ for Spanish\)/);
});

// 7 Oct 2026: Japanese and Chinese put no space after 。 or ？ (FULL_STOP in public/i18n.js): the space the English text has before
// the Privacy Policy link (or before Use a different email) is dropped, on the language page and where the game translates the page.
test('no space after a Japanese or Chinese full stop or question mark, on the language page and in the game',()=>{
 const html=read('public/play.html');
 globalThis.MutationObserver=class{observe(){}};
 try{
  for(const code of ['ja','zh']){
   const dict=translations(code),doc=translatePage(html,code,dict);
   assert.ok(doc.includes(`<p class="account-legal">${dict['For players aged 16 and over.']}<a href="/privacy">`),code);
   assert.doesNotMatch(doc,/[。！？：][ \t]+</,`${code}: no space between a full stop and a link or button`);
   const legal={nodeType:3,data:'For players aged 16 and over. ',parentElement:null};
   const p={nodeType:1,children:[legal],parentElement:null,hasAttribute:()=>false,getAttribute:()=>null,matches:()=>false,closest:()=>null};legal.parentElement=p;
   translateDocument({documentElement:p,createTreeWalker:(start,show,filter)=>{const list=start.children.filter(c=>filter.acceptNode(c)===1);let i=0;return {nextNode:()=>list[i++]??null};}},createTranslator(dict,code));
   assert.equal(legal.data,dict['For players aged 16 and over.'],`${code}: the game drops it too`);
  }
 }finally{delete globalThis.MutationObserver;}
 assert.match(translatePage(html,'es',translations('es')),/<p class="account-legal">Para jugadores de 16 años o más\. <a href="\/privacy">/,'a language with spaces between sentences keeps it');
});
