// A sign-in page per language (Oct 2026): /es/, /fr/, ... is public/play.html already written in that language, so a search engine
// reads it in Spanish and a Spanish visitor sees Spanish at once (no English first). Run by scripts/build-static.mjs on every deploy
// from the same page and the game's own translations (public/i18n/<code>.json). Every page names all the others (hreflang, the
// English home page '/' also for any other language: x-default) and so does the sitemap.
// Only exact translations are used: a text without one stops the build (the game's translator would guess, and a guess on the
// page a search engine reads is worse than none). Translate the missing texts first (i18n/README.md).
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {LANGUAGES,RTL_LANGUAGES,languagePath,playBadge} from '../public/languages.js';
import {appPath} from '../public/game-links.js';
import {FULL_STOP} from '../public/i18n.js';

const SITE='https://www.harvesttycoon.com';
export const READY=LANGUAGES.filter(l=>l.ready).map(l=>l.code);
// The share card's language and country (Brazilian Portuguese and Simplified Chinese, as the translations are written).
export const OG_LOCALE={en:'en_GB',cs:'cs_CZ',de:'de_DE',es:'es_ES',fr:'fr_FR',id:'id_ID',hu:'hu_HU',nl:'nl_NL',pt:'pt_BR',tr:'tr_TR',ru:'ru_RU',uk:'uk_UA',hi:'hi_IN',ja:'ja_JP',ar:'ar_AR',zh:'zh_CN'};
// The search and share texts in the page's head; the twitter ones are the same texts as the og ones.
const SEO_META=['description','og:title','og:description','og:image:alt','twitter:title','twitter:description'];
const ATTRS=['title','aria-label','placeholder','alt'];
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0',hellip:'…',mdash:'—',ndash:'–',copy:'©',middot:'·',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”'};
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):Number(code.slice(1))):ENTITIES[code.toLowerCase()]??all);
const normalize=text=>text.replace(/\s+/g,' ').trim();
const escText=text=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
const escAttr=text=>text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
// Scripts, styles and comments stay as they are; a tag is everything between < and >, the rest is text.
const TOKENS=/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/i;

// The same set on every page and in the sitemap: each language's address, and the English home page for everyone else.
export const alternates=()=>[...READY.map(code=>[code,`${SITE}${languagePath(code)}`]),['x-default',`${SITE}/`]];
const links=()=>alternates().map(([lang,href])=>`<link rel="alternate" hreflang="${lang}" href="${href}">`).join('');
const once=(html,from,to,what)=>{if(!html.includes(from))throw new Error(`Language pages: play.html has no ${what}`);return html.replace(from,to);};

// The texts of a page in one language, from that language's translations (exact texts only; a missing one stops the build): every
// text node, the title / aria-label / placeholder / alt attributes and the head's meta tags named in seoMeta. page: the file, for the errors.
function translateTexts(html,code,dict,{label,page,seoMeta}){
 const missing=new Set(),seo=new Set();
 const out=key=>{const hit=dict[key];const text=hit&&typeof hit==='object'?hit.other:hit;if(typeof text!=='string'||!text.trim()){missing.add(key);return key;}return text;};
 const parts=html.split(TOKENS);
 for(let i=0;i<parts.length;i++){
  const part=parts[i];
  if(i%2===0){
   // Text: the same text node the game would translate, its spaces around it kept; but none after a Japanese or Chinese full stop,
   // question mark or colon (FULL_STOP, 7 Oct 2026: "…向け。 プライバシーポリシー"), as the game does.
   if(!/\p{L}/u.test(part))continue;
   const key=normalize(decode(part)),text=out(key);
   parts[i]=part.match(/^\s*/)[0]+escText(text)+(FULL_STOP.test(text)?'':part.match(/\s*$/)[0]);
   continue;
  }
  if(!part.startsWith('<')||/^<(script|style|!--)/i.test(part))continue;
  // A tag: a > inside an attribute would cut it in two, and the page would come out broken.
  if((part.match(/"/g)??[]).length%2)throw new Error(`${label} ${code}: a tag with a > inside a quoted value: ${part.slice(0,80)}`);
  if(/\stranslate="no"/.test(part))throw new Error(`${label} ${code}: ${page} has translate="no" text, which scripts/build-languages.mjs cannot leave out yet`);
  let tag=part;
  const meta=tag.match(/^<meta (?:name|property)="([^"]+)" content="([^"]*)"/);
  if(meta&&seoMeta.includes(meta[1])){seo.add(meta[1]);tag=tag.replace(`content="${meta[2]}"`,()=>`content="${escAttr(out(normalize(decode(meta[2]))))}"`);}
  for(const name of ATTRS)tag=tag.replace(new RegExp(`(\\s${name}=")([^"]*)(")`),(all,a,value,b)=>/\p{L}/u.test(value)?a+escAttr(out(normalize(decode(value))))+b:all);
  parts[i]=tag;
 }
 const lost=seoMeta.filter(name=>!seo.has(name));
 if(lost.length)throw new Error(`${label} ${code}: ${page} has no ${lost.join(', ')} meta tag`);
 if(missing.size)throw new Error(`${label} ${code}: missing ${[...missing].map(t=>JSON.stringify(t)).join(', ')} (translate them first: i18n/README.md)`);
 const result=parts.join('');
 if(result.split(TOKENS).length!==parts.length)throw new Error(`${label} ${code}: the page lost or gained a tag`);
 return result;
}
const htmlTag=code=>`<html lang="${code}"${RTL_LANGUAGES.includes(code)?' dir="rtl"':''} data-page-lang="${code}">`;

// public/play.html in one language, from that language's translations (exact texts only; a missing one stops the build).
export function translatePage(html,code,dict){
 html=once(html,'<html lang="en">',htmlTag(code),'<html lang="en">');
 html=once(html,'<meta property="og:locale" content="en_GB">',`<meta property="og:locale" content="${OG_LOCALE[code]}">`,'og:locale');
 html=once(html,`<meta property="og:url" content="${SITE}/">`,`<meta property="og:url" content="${SITE}${languagePath(code)}">`,'og:url');
 html=once(html,`<link rel="canonical" href="${SITE}/">`,`<link rel="canonical" href="${SITE}${languagePath(code)}">`,'canonical address');
 // The footer's Google Play badge in the page's language (Oct 2026, public/languages.js playBadge); its alt text is translated below.
 html=once(html,`src="${playBadge('en')}"`,`src="${playBadge(code)}"`,'Google Play badge');
 // The footer's Help and support (3 Oct 2026) opens the support page in the same language.
 html=html.replaceAll('href="/support"',`href="${supportPath(code)}"`);
 // ... and Get the app (4 Oct 2026) the app page.
 html=html.replaceAll('href="/app"',`href="${appPath(code)}"`);
 return translateTexts(html,code,dict,{label:'Language page',page:'play.html',seoMeta:SEO_META});
}

// The support page per language (3 Oct 2026): /support is English, /es/support Spanish, ... (public/support.html, no script: the
// language is written into the page, and its form tells the support Edge Function which page to send the farmer back to).
export const supportPath=code=>code==='en'?'/support':`/${code}/support`;
export const supportAlternates=()=>[...READY.map(code=>[code,`${SITE}${supportPath(code)}`]),['x-default',`${SITE}/support`]];
const oncePage=(html,from,to,what)=>{if(!html.includes(from))throw new Error(`Support pages: support.html has no ${what}`);return html.replace(from,to);};
export function translateSupport(html,code,dict){
 html=oncePage(html,'<html lang="en">',htmlTag(code),'<html lang="en">');
 html=oncePage(html,`<link rel="canonical" href="${SITE}/support">`,`<link rel="canonical" href="${SITE}${supportPath(code)}">`,'canonical address');
 html=oncePage(html,'<input type="hidden" name="lang" value="en">',`<input type="hidden" name="lang" value="${code}">`,'hidden lang field');
 html=oncePage(html,`src="${playBadge('en')}"`,`src="${playBadge(code)}"`,'Google Play badge');
 // The game's own links in the page's language (the sign-in page per language); the wiki and the legal pages are English only.
 html=html.replace(/href="\/"/g,`href="${languagePath(code)}"`).replaceAll('href="/app"',`href="${appPath(code)}"`);
 return translateTexts(html,code,dict,{label:'Support page',page:'support.html',seoMeta:['description']});
}
// Writes /<code>/support.html for every translated language and adds the support pages to the sitemap. Returns the English page with
// the same hreflang set, for /support.
export function buildSupportPages(outDir,html,{dictionary=readDictionary}={}){
 return buildPerLanguage(outDir,html,{file:'support.html',pathOf:supportPath,translate:translateSupport,dictionary,what:'Support pages: support.html'});
}

// Harvest Tycoon on your phone (4 Oct 2026): /app is public/app.html in English, /es/app, ... the same way (no script; its texts are in
// the catalog). Google Play's badge in the page's language (on the page and in the footer), its links in the same language.
export {appPath};// one copy, shared with the chat's chip (public/game-links.js)
export function translateAppPage(html,code,dict){
 const once=(from,to,what)=>{if(!html.includes(from))throw new Error(`App pages: app.html has no ${what}`);html=html.replace(from,to);};
 once('<html lang="en">',htmlTag(code),'<html lang="en">');
 once(`<link rel="canonical" href="${SITE}/app">`,`<link rel="canonical" href="${SITE}${appPath(code)}">`,'canonical address');
 if(!html.includes(`src="${playBadge('en')}"`))throw new Error('App pages: app.html has no Google Play badge');
 html=html.replaceAll(`src="${playBadge('en')}"`,`src="${playBadge(code)}"`);
 html=html.replace(/href="\/"/g,`href="${languagePath(code)}"`).replaceAll('href="/support"',`href="${supportPath(code)}"`);
 return translateTexts(html,code,dict,{label:'App page',page:'app.html',seoMeta:['description']});
}
export function buildAppPages(outDir,html,{dictionary=readDictionary}={}){
 return buildPerLanguage(outDir,html,{file:'app.html',pathOf:appPath,translate:translateAppPage,dictionary,what:'App pages: app.html'});
}

// One page in every translated language (/<code>/<file>), each naming all of them (hreflang), and once each in the sitemap (also when
// the build runs twice). Returns the English page with the same set, for its own address.
const readDictionary=code=>JSON.parse(readFileSync(new URL(`../public/i18n/${code}.json`,import.meta.url),'utf8'));
function buildPerLanguage(outDir,html,{file,pathOf,translate,dictionary,what}){
 const set=[...READY.map(code=>[code,`${SITE}${pathOf(code)}`]),['x-default',`${SITE}${pathOf('en')}`]];
 if(!html.includes('<link rel="canonical"'))throw new Error(`${what} has no canonical address`);
 const english=html.replace('<link rel="canonical"',`${set.map(([lang,href])=>`<link rel="alternate" hreflang="${lang}" href="${href}">`).join('')}<link rel="canonical"`);
 for(const code of READY.filter(code=>code!=='en')){
  mkdirSync(join(outDir,code),{recursive:true});
  writeFileSync(join(outDir,code,file),translate(english,code,dictionary(code)));
 }
 writeFileSync(join(outDir,file),english);
 const sitemap=join(outDir,'sitemap.xml');
 if(existsSync(sitemap)){
  let xml=readFileSync(sitemap,'utf8');
  if(!xml.includes(`${SITE}${pathOf('en')}</loc>`)){
   const today=new Date().toISOString().slice(0,10),links=set.map(([lang,href])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('');
   if(!xml.includes('xmlns:xhtml='))xml=xml.replace('<urlset','<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml"');
   xml=xml.replace('</urlset>',`${READY.map(code=>` <url><loc>${SITE}${pathOf(code)}</loc><lastmod>${today}</lastmod>${links}</url>`).join('\n')}\n</urlset>`);
   writeFileSync(sitemap,xml);
  }
 }
 return english;
}

// Writes /<code>/index.html for every translated language and adds them to the sitemap. Returns the English page with the same
// hreflang set, for / and /play.html.
export function buildLanguagePages(outDir,html,{dictionary=code=>JSON.parse(readFileSync(new URL(`../public/i18n/${code}.json`,import.meta.url),'utf8'))}={}){
 const english=once(html,'<link rel="canonical"',`${links()}<link rel="canonical"`,'canonical address');
 for(const code of READY.filter(code=>code!=='en')){
  mkdirSync(join(outDir,code),{recursive:true});
  writeFileSync(join(outDir,code,'index.html'),translatePage(english,code,dictionary(code)));
 }
 // The sitemap: the home page once per language, each naming all of them (once, even if the build runs twice).
 const sitemap=join(outDir,'sitemap.xml');
 if(existsSync(sitemap)){
  let xml=readFileSync(sitemap,'utf8');
  if(!READY.some(code=>code!=='en'&&xml.includes(`${SITE}${languagePath(code)}</loc>`))){
   const today=new Date().toISOString().slice(0,10),set=alternates().map(([lang,href])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('');
   const urls=READY.map(code=>` <url><loc>${SITE}${languagePath(code)}</loc><lastmod>${today}</lastmod>${set}</url>`).join('\n');
   if(!xml.includes('xmlns:xhtml='))xml=xml.replace('<urlset','<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml"');
   const home=new RegExp(`[ \\t]*<url><loc>${SITE.replace(/[.]/g,'\\.')}/</loc>.*?</url>\\n?`);
   xml=home.test(xml)?xml.replace(home,`${urls}\n`):xml.replace('</urlset>',`${urls}\n</urlset>`);
   writeFileSync(sitemap,xml);
  }
 }
 return english;
}
