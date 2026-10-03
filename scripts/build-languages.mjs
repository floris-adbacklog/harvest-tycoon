// A sign-in page per language (Oct 2026): /es/, /fr/, ... is public/play.html already written in that language, so a search engine
// reads it in Spanish and a Spanish visitor sees Spanish at once (no English first). Run by scripts/build-static.mjs on every deploy
// from the same page and the game's own translations (public/i18n/<code>.json). Every page names all the others (hreflang, the
// English home page '/' also for any other language: x-default) and so does the sitemap.
// Only exact translations are used: a text without one stops the build (the game's translator would guess, and a guess on the
// page a search engine reads is worse than none). Translate the missing texts first (i18n/README.md).
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {LANGUAGES,RTL_LANGUAGES,languagePath,playBadge} from '../public/languages.js';

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

// public/play.html in one language, from that language's translations (exact texts only; a missing one stops the build).
export function translatePage(html,code,dict){
 const missing=new Set(),seo=new Set();
 const out=key=>{const hit=dict[key];const text=hit&&typeof hit==='object'?hit.other:hit;if(typeof text!=='string'||!text.trim()){missing.add(key);return key;}return text;};
 html=once(html,'<html lang="en">',`<html lang="${code}"${RTL_LANGUAGES.includes(code)?' dir="rtl"':''} data-page-lang="${code}">`,'<html lang="en">');
 html=once(html,'<meta property="og:locale" content="en_GB">',`<meta property="og:locale" content="${OG_LOCALE[code]}">`,'og:locale');
 html=once(html,`<meta property="og:url" content="${SITE}/">`,`<meta property="og:url" content="${SITE}${languagePath(code)}">`,'og:url');
 html=once(html,`<link rel="canonical" href="${SITE}/">`,`<link rel="canonical" href="${SITE}${languagePath(code)}">`,'canonical address');
 // The footer's Google Play badge in the page's language (Oct 2026, public/languages.js playBadge); its alt text is translated below.
 html=once(html,`src="${playBadge('en')}"`,`src="${playBadge(code)}"`,'Google Play badge');
 const parts=html.split(TOKENS);
 for(let i=0;i<parts.length;i++){
  const part=parts[i];
  if(i%2===0){
   // Text: the same text node the game would translate, its spaces around it kept.
   if(!/\p{L}/u.test(part))continue;
   const key=normalize(decode(part));
   parts[i]=part.match(/^\s*/)[0]+escText(out(key))+part.match(/\s*$/)[0];
   continue;
  }
  if(!part.startsWith('<')||/^<(script|style|!--)/i.test(part))continue;
  // A tag: a > inside an attribute would cut it in two, and the page would come out broken.
  if((part.match(/"/g)??[]).length%2)throw new Error(`Language page ${code}: a tag with a > inside a quoted value: ${part.slice(0,80)}`);
  if(/\stranslate="no"/.test(part))throw new Error(`Language page ${code}: play.html has translate="no" text, which scripts/build-languages.mjs cannot leave out yet`);
  let tag=part;
  const meta=tag.match(/^<meta (?:name|property)="([^"]+)" content="([^"]*)"/);
  if(meta&&SEO_META.includes(meta[1])){seo.add(meta[1]);tag=tag.replace(`content="${meta[2]}"`,()=>`content="${escAttr(out(normalize(decode(meta[2]))))}"`);}
  for(const name of ATTRS)tag=tag.replace(new RegExp(`(\\s${name}=")([^"]*)(")`),(all,a,value,b)=>/\p{L}/u.test(value)?a+escAttr(out(normalize(decode(value))))+b:all);
  parts[i]=tag;
 }
 const lost=SEO_META.filter(name=>!seo.has(name));
 if(lost.length)throw new Error(`Language page ${code}: play.html has no ${lost.join(', ')} meta tag`);
 if(missing.size)throw new Error(`Language page ${code}: missing ${[...missing].map(t=>JSON.stringify(t)).join(', ')} (translate them first: i18n/README.md)`);
 const result=parts.join('');
 if(result.split(TOKENS).length!==parts.length)throw new Error(`Language page ${code}: the page lost or gained a tag`);
 return result;
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
