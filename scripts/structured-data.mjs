// Structured data (8 Oct 2026): what search engines and AI answers read about the game, in the words the pages already use. One block
// of JSON-LD per page, written into the built pages by scripts/build-static.mjs after everything else (the App Store switch too):
//  - the home page in every language: the website, its maker (Millstone) and the game, described by that page's own meta description;
//  - the app page in every language: the maker and the game;
//  - the support page in every language: its Questions (FAQPage), taken from the page as it shows them.
// The wiki's topic pages get their breadcrumb (scripts/build-wiki.mjs). No ratings: the site has none of its own. Once APP_STORE_URL
// (public/game-links.js) is set, the game also names the iPhone and its App Store page.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {LANGUAGES} from '../public/languages.js';
import {appStoreAddress,appStoreWording} from './app-store-links.mjs';

export const SITE='https://www.harvesttycoon.com';
export const PLAY_URL='https://play.google.com/store/apps/details?id=com.harvesttycoon.app';
export const ORG_ID=`${SITE}/#organization`,GAME_ID=`${SITE}/#game`,WEBSITE_ID=`${SITE}/#website`;
const CODES=LANGUAGES.filter(l=>l.ready).map(l=>l.code);

export const organization=()=>({'@type':'Organization','@id':ORG_ID,name:'Millstone',url:`${SITE}/`,logo:`${SITE}/assets/pwa/icon-512.png`,email:'info@harvesttycoon.com',address:{'@type':'PostalAddress',addressCountry:'NL'}});
export const website=()=>({'@type':'WebSite','@id':WEBSITE_ID,name:'Harvest Tycoon',url:`${SITE}/`,inLanguage:CODES,publisher:{'@id':ORG_ID}});
// The game in one language: its address (that language's home page) and description (that page's meta description).
export function videoGame({url,description,appStoreUrl=null}){
 const ios=appStoreUrl==null?null:appStoreAddress(appStoreUrl),platforms=['Web browser','Android',...(ios?['iOS']:[])];
 return {'@type':'VideoGame','@id':GAME_ID,name:'Harvest Tycoon',url,description,image:`${SITE}/assets/og-image-farm.jpg`,genre:['Farming simulation','Casual'],
  gamePlatform:platforms,operatingSystem:platforms.join(', '),applicationCategory:'GameApplication',inLanguage:CODES,isAccessibleForFree:true,datePublished:'2026-09-16',
  offers:{'@type':'Offer',price:'0',priceCurrency:'EUR'},publisher:{'@id':ORG_ID},author:{'@id':ORG_ID},installUrl:PLAY_URL,sameAs:[PLAY_URL,...(ios?[ios]:[])]};
}
export const breadcrumbs=items=>({'@type':'BreadcrumbList',itemListElement:items.map(([name,item],i)=>({'@type':'ListItem',position:i+1,name,item}))});
export const faqPage=(questions,{url,lang})=>({'@type':'FAQPage','@id':`${url}#questions`,url,inLanguage:lang,mainEntity:questions.map(([name,text])=>({'@type':'Question',name,acceptedAnswer:{'@type':'Answer',text}}))});

// The block itself; a < in a text can never close the script.
export const ldScript=nodes=>`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':nodes}).replace(/</g,'\\u003c')}</script>`;
const LD=/<script type="application\/ld\+json">[\s\S]*?<\/script>/g;
// A page's blocks become this one (where the first was, else at the end of the head); running it twice gives the same page.
export function withGraph(html,nodes){
 const block=ldScript(nodes);let first=true;
 if(html.includes('<script type="application/ld+json">'))return html.replace(LD,()=>{const out=first?block:'';first=false;return out;});
 if(!html.includes('</head>'))throw new Error('Structured data: a page without </head>');
 return html.replace('</head>',`${block}</head>`);
}

const ENTITIES={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:'\u00a0',rsquo:'’',lsquo:'‘',ldquo:'“',rdquo:'”',hellip:'…',mdash:'—',ndash:'–',copy:'©'};
const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):Number(code.slice(1))):ENTITIES[code.toLowerCase()]??all);
// The text as it shows; French keeps its no-break spaces (only the source's own line breaks and indents become one space).
const plain=html=>decode(html.replace(/<!--[\s\S]*?-->/g,'').replace(/<[^>]+>/g,'')).replace(/[ \t\r\n\f]+/g,' ').replace(/^ | $/g,'');
const metaDescription=html=>{const m=/<meta name="description" content="([^"]*)">/.exec(html);if(!m)throw new Error('Structured data: a page without a meta description');return decode(m[1]);};
const canonical=html=>{const m=/<link rel="canonical" href="([^"]+)">/.exec(html);if(!m)throw new Error('Structured data: a page without a canonical address');return m[1];};
// The Questions of a support page as they show: each <h3> and the answer under it (the App Store wording that is true now).
export function pageQuestions(html,{live=false}={}){
 const box=/<div class="support-faq">([\s\S]*?)<\/div>/.exec(appStoreWording(html,live));
 if(!box)throw new Error('Structured data: the support page has no Questions');
 const out=[...box[1].matchAll(/<h3\b[^>]*>([\s\S]*?)<\/h3>\s*<p\b[^>]*>([\s\S]*?)<\/p>/g)].map(m=>[plain(m[1]),plain(m[2])]);
 if(out.length<5||out.some(([q,a])=>!q||!a))throw new Error('Structured data: the support page\'s Questions are incomplete');
 return out;
}

// Every built page that gets a block: the home page (also as /play.html), the app page and the support page, in every language.
export function applyStructuredData(outDir,{appStoreUrl=null}={}){
 let pages=0;
 const update=(file,nodes)=>{if(!existsSync(file))throw new Error(`Structured data: ${file} is missing`);const html=readFileSync(file,'utf8');writeFileSync(file,withGraph(html,typeof nodes==='function'?nodes(html):nodes));pages++;};
 for(const code of CODES){
  const dir=code==='en'?outDir:join(outDir,code),homeFile=join(dir,'index.html'),home=readFileSync(homeFile,'utf8');
  const game=videoGame({url:canonical(home),description:metaDescription(home),appStoreUrl});
  for(const file of code==='en'?[homeFile,join(dir,'play.html')]:[homeFile])update(file,[website(),organization(),game]);
  update(join(dir,'app.html'),[organization(),game]);
  update(join(dir,'support.html'),html=>[faqPage(pageQuestions(html,{live:appStoreUrl!=null}),{url:canonical(html),lang:code})]);
 }
 return pages;
}
