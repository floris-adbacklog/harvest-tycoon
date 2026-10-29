// The guides (/guides and /guides/<slug>, 29 Oct 2026): made on every deploy from scripts/guides-content.mjs (its numbers from the
// game rules), in the wiki's page (scripts/build-wiki.mjs page), in every ready language (the owner, 29 Oct 2026: "alle 15"):
// /guides in English, /es/guides, /fr/guides, ... from the same page and the translations (public/i18n/<code>.json, the texts in
// i18n/catalog.json through scripts/i18n-extract.mjs), with the game's own look-up (public/i18n.js createTranslator), so a text with
// a number ("starts with {0} coins") stays translated when the number changes. A text with no translation stops the build, as on the
// other language pages. Every guide names all its languages (hreflang) and is in the sitemap once per language, so
// scripts/build-ai-markdown.mjs gives each a Markdown copy and a line in llms.txt under its language. vercel.json serves the addresses.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {page} from './build-wiki.mjs';
import {breadcrumbs} from './structured-data.mjs';
import {GUIDES,GUIDES_INDEX,GUIDE_WORDS} from './guides-content.mjs';
import {READY} from './build-languages.mjs';
import {createTranslator,localNumbers,isolateNumbers,FULL_STOP,undot,undotAttr} from '../public/i18n.js';
import {RTL_LANGUAGES,languagePath,playBadge,appStoreBadge} from '../public/languages.js';
import {appPath} from '../public/game-links.js';

const SITE='https://www.harvesttycoon.com';
const esc=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const guidePath=(code,slug='')=>`${code==='en'?'':`/${code}`}/guides${slug?`/${slug}`:''}`;
const readDictionary=code=>JSON.parse(readFileSync(new URL(`../public/i18n/${code}.json`,import.meta.url),'utf8'));

// --- A whole page in one language (the text between tags, and the words in alt, title, aria-label and the search texts) ---
const TOKENS=/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]+>)/i;
const ATTRS=['title','aria-label','placeholder','alt'];
const META=['description','og:title','og:description','twitter:title','twitter:description'];
const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',hellip:'…',mdash:'—',ndash:'–',copy:'©',middot:'·',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”'};
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,c)=>c[0]==='#'?String.fromCodePoint(c[1]==='x'||c[1]==='X'?parseInt(c.slice(2),16):Number(c.slice(1))):ENTITIES[c.toLowerCase()]??all);
const normalize=text=>text.replace(/\s+/g,' ').trim();
const escText=text=>text.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c]);
const escAttr=text=>text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
// Whole hours as the wiki writes them ("2 h", wikiTime): the catalog cannot hold a text with one letter, so the form comes from the
// game's own "{0} h {1} min" in that language, cut before its minutes ("{0} ч", "{0}時間").
export const hoursForm=dict=>{const out=dict?.['{0} h {1} min'];const text=typeof out==='object'?out?.other:out;if(typeof text!=='string'||!text.includes('{1}'))return null;const cut=text.slice(0,text.indexOf('{1}')).trimEnd();return cut.includes('{0}')?cut:null;};
export function translateGuide(html,code,translator,{label,dict=null}){
 const numbers=localNumbers(code),rtl=RTL_LANGUAGES.includes(code),missing=new Set(),hours=hoursForm(dict);
 // An address written out (harvesttycoon.com) is the same in every language.
 const word=text=>{const key=normalize(decode(text));if(/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}$/i.test(key))return key;const h=/^(\d+) h$/.exec(key);if(h&&hours)return hours.replace('{0}',h[1]);const out=translator.translate(key);if(out==null){missing.add(key);return key;}return out;};
 const finish=text=>{let next=numbers&&/\d/.test(text)?numbers(text):text;if(rtl&&/\d/.test(next))next=isolateNumbers(next);return next;};
 const parts=html.split(TOKENS);
 for(let i=0;i<parts.length;i++){
  const part=parts[i];
  if(i%2===0){
   if(!/\p{L}/u.test(part))continue;
   const text=finish(word(part));
   parts[i]=part.match(/^\s*/)[0]+escText(undot(text))+(FULL_STOP.test(text)?'':part.match(/\s*$/)[0]);
   continue;
  }
  if(!part.startsWith('<')||/^<(script|style|!--)/i.test(part))continue;
  let tag=part;
  const meta=tag.match(/^<meta (?:name|property)="([^"]+)" content="([^"]*)"/);
  if(meta&&META.includes(meta[1]))tag=tag.replace(`content="${meta[2]}"`,()=>`content="${escAttr(undotAttr(finish(word(meta[2]))))}"`);
  for(const name of ATTRS)tag=tag.replace(new RegExp(`(\\s${name}=")([^"]*)(")`),(all,a,value,b)=>/\p{L}/u.test(value)?a+escAttr(undotAttr(finish(word(value))))+b:all);
  parts[i]=tag;
 }
 if(missing.size)throw new Error(`${label} ${code}: missing ${[...missing].map(t=>JSON.stringify(t)).join(', ')} (translate them first: i18n/README.md)`);
 return parts.join('');
}

// The page's own things in its language: <html lang>, its addresses (canonical, og:url), the game's links (sign-in page, app page,
// guides), the store badges. The wiki, the privacy policy and the partner page are English only and keep their links.
function localize(html,code,path){
 const swap=(from,to,what)=>{if(!html.includes(from))throw new Error(`Guides ${code}: the page has no ${what}`);html=html.replace(from,to);};
 swap('<html lang="en">',`<html lang="${code}"${RTL_LANGUAGES.includes(code)?' dir="rtl"':''} data-page-lang="${code}">`,'<html lang="en">');
 html=html.replaceAll(`${SITE}${guidePath('en')}`,`${SITE}${guidePath(code)}`).replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]+">/g,m=>m.replace(`${SITE}${guidePath(code)}`,`${SITE}${guidePath('en')}`));
 html=html.replace(/href="\/guides(?=[/"])/g,`href="${guidePath(code)}`).replace(/href="\/"/g,`href="${languagePath(code)}"`).replaceAll('href="/app"',`href="${appPath(code)}"`);
 html=html.replaceAll(`src="${playBadge('en')}"`,`src="${playBadge(code)}"`).replaceAll(`src="${appStoreBadge('en')}"`,`src="${appStoreBadge(code)}"`);
 if(!html.includes(`<link rel="canonical" href="${SITE}${path}">`))throw new Error(`Guides ${code}: ${path} lost its canonical address`);
 return html;
}

export function buildGuides(outDir,{dictionary=readDictionary,languages=READY}={}){
 const pages=[{slug:'',title:GUIDES_INDEX.title,heading:GUIDES_INDEX.heading,description:GUIDES_INDEX.description},...GUIDES.map(g=>({...g,heading:g.title,title:GUIDE_WORDS.title(g.title)}))];
 let written=0;
 for(const code of languages){
  const dict=code==='en'?null:dictionary(code),translator=dict?createTranslator(dict,code):null,t=text=>translator?translator.translate(text)??text:text;
  for(const p of pages){
   const path=guidePath(code,p.slug),en=guidePath('en',p.slug);
   const set=[...languages.map(c=>[c,`${SITE}${guidePath(c,p.slug)}`]),['x-default',`${SITE}${en}`]];
   const guide=GUIDES.find(g=>g.slug===p.slug);
   const body=guide
    ?` <nav class="wiki-crumbs" aria-label="${GUIDE_WORDS.crumb}"><a href="/guides">${GUIDE_WORDS.guides}</a> › <span>${esc(guide.title)}</span></nav>\n <article class="wiki-article guide-article">${guide.body()}</article>\n <section class="wiki-related"><h2>${GUIDE_WORDS.more}</h2><ul class="wiki-list">${GUIDES.filter(o=>o!==guide).map(o=>`<li><a href="/guides/${o.slug}">${esc(o.title)}</a></li>`).join('')}</ul></section>`
    :` <nav class="wiki-crumbs" aria-label="${GUIDE_WORDS.crumb}"><a href="/wiki">${GUIDE_WORDS.wikiCrumb}</a> › <span>${GUIDE_WORDS.guides}</span></nav>\n <ul class="guide-list">${GUIDES.map(g=>`<li><a href="/guides/${g.slug}"><strong>${esc(g.title)}</strong><span>${esc(g.description)}</span></a></li>`).join('')}</ul>\n <p>${GUIDE_WORDS.wiki} <a href="/wiki">${GUIDE_WORDS.wikiLink}</a>.</p>`;
   const data=[breadcrumbs(guide?[[t(GUIDE_WORDS.guides),`${SITE}${guidePath(code)}`],[t(guide.title),`${SITE}${path}`]]:[[t(GUIDE_WORDS.guides),`${SITE}${path}`]])];
   let html=page({path:en,title:p.title,heading:p.heading,description:p.description,body,data});
   html=html.replace('<link rel="canonical"',`${set.map(([lang,href])=>`<link rel="alternate" hreflang="${lang}" href="${href}">`).join('')}<link rel="canonical"`);
   if(code!=='en')html=translateGuide(localize(html,code,path),code,translator,{label:`Guides ${path}`,dict});
   const file=join(outDir,`${path.slice(1)}${p.slug?'':'/index'}.html`);
   mkdirSync(join(file,'..'),{recursive:true});writeFileSync(file,html);written++;
  }
 }
 // The sitemap: each guide once per language, each naming all of them (once, even if the build runs twice).
 const sitemap=join(outDir,'sitemap.xml');
 if(existsSync(sitemap)){
  let xml=readFileSync(sitemap,'utf8');
  if(!xml.includes(`${SITE}/guides</loc>`)){
   const today=new Date().toISOString().slice(0,10);
   if(!xml.includes('xmlns:xhtml='))xml=xml.replace('<urlset','<urlset xmlns:xhtml="http://www.w3.org/1999/xhtml"');
   const urls=pages.flatMap(p=>{const links=[...languages.map(c=>[c,`${SITE}${guidePath(c,p.slug)}`]),['x-default',`${SITE}${guidePath('en',p.slug)}`]].map(([lang,href])=>`<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('');
    return languages.map(c=>` <url><loc>${SITE}${guidePath(c,p.slug)}</loc><lastmod>${today}</lastmod>${links}</url>`);}).join('\n');
   writeFileSync(sitemap,xml.replace('</urlset>',`${urls}\n</urlset>`));
  }
 }
 return written;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const out=process.argv[2]??'dist-static';
 console.log(`Wrote ${buildGuides(out)} guide pages to ${out}.`);
}
