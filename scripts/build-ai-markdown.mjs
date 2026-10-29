// The website as Markdown for AI tools (29 Oct 2026, the owner): every public page in the sitemap gets one Markdown copy of its own
// text, next to it (/ → /index.md, /es/ → /es/index.md, /app → /app.md, /wiki/crops → /wiki/crops.md), and /llms.txt lists them all,
// per language. Made on every deploy from the built pages themselves (scripts/build-static.mjs, last), so a new page, a new language
// or a changed text is in it at once and a page that goes is gone: there is nothing to keep by hand.
// - The pages: the sitemap's (only indexable pages are in it; a page with noindex is left out even so), each with the languages its
//   hreflang links name. The sitemap is the one list, so a page the sitemap leaves out has no copy and no line in llms.txt.
// - The text: the page's own words, not a summary. Its <main> (else <body>) in order: headings, paragraphs, lists, tables, the facts
//   of a list of terms, what opens in a <details>, links, and the alt text of pictures. Left out: what nobody sees on the page as it
//   loads (hidden, aria-hidden, screen-reader-only), forms and their buttons, scripts, styles and drawings, and the site's header,
//   navigation and footer (every copy ends with the same short list of the site's pages instead, in its own language where there is one).
// - Links: a link to a page with a copy goes to that copy (same language, as the page itself links), with its #spot; any other link
//   stays as it is, made absolute.
// - Served as text/markdown in UTF-8 and kept out of search results (vercel.json, X-Robots-Tag: noindex), so the HTML pages stay the
//   ones search engines show; robots.txt does not stop them.
// - Checked before the deploy goes on (validate): every sitemap page has a copy, every copy holds its page's words, every .md link in
//   the copies and in llms.txt points to a copy that exists, nothing twice, every language and alternate right. A failure stops it.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';

export const SITE='https://www.harvesttycoon.com';
export const EXT='.md';
// The page's address → its built file in dist-static (as vercel.json's rewrites serve them; cleanUrls is off).
const SECTIONS=/^\/(?:[a-z]{2}\/)?(?:wiki|guides)$/;
export function pageFile(path){
 if(path==='/')return 'index.html';
 if(path.endsWith('/'))return `${path.slice(1)}index.html`;
 if(SECTIONS.test(path))return `${path.slice(1)}/index.html`;   // a section's front page (vercel.json: /wiki, /guides, /es/guides)
 return `${path.slice(1)}.html`;
}
// The page's address → its Markdown copy's address.
export function markdownPath(path){
 if(path==='/'||path.endsWith('/'))return `${path}index${EXT}`;
 return `${path}${EXT}`;
}
export const markdownUrl=url=>{const u=new URL(url);return `${SITE}${markdownPath(u.pathname)}${u.hash}`;};

// --- A small HTML reader for our own pages (no package: they are made by our own templates and well formed) ---
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','source','track','wbr']);
const RAW=new Set(['script','style','textarea','title']);
const NAMED={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',rsquo:'’',lsquo:'‘',rdquo:'”',ldquo:'“',ndash:'–',mdash:'—',hellip:'…',copy:'©',reg:'®',trade:'™',middot:'·',times:'×',euro:'€',bull:'•',rarr:'→',larr:'←',laquo:'«',raquo:'»',shy:'­',zwj:'‍'};
export const decode=text=>text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,(all,code)=>code[0]==='#'?String.fromCodePoint(code[1]==='x'||code[1]==='X'?parseInt(code.slice(2),16):parseInt(code.slice(1),10)):NAMED[code]??all);
export function parseHtml(html){
 const root={tag:'#root',attrs:{},children:[]},stack=[root];let i=0;
 const top=()=>stack[stack.length-1];
 while(i<html.length){
  const lt=html.indexOf('<',i);
  if(lt<0){top().children.push({text:decode(html.slice(i))});break;}
  if(lt>i)top().children.push({text:decode(html.slice(i,lt))});
  if(html.startsWith('<!--',lt)){const end=html.indexOf('-->',lt+4);i=end<0?html.length:end+3;continue;}
  if(html[lt+1]==='!'||html[lt+1]==='?'){const end=html.indexOf('>',lt);i=end<0?html.length:end+1;continue;}
  if(html[lt+1]==='/'){
   const end=html.indexOf('>',lt),name=html.slice(lt+2,end).trim().toLowerCase();i=end+1;
   const at=stack.map(n=>n.tag).lastIndexOf(name);if(at>0)stack.length=at;
   continue;
  }
  const m=/^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(lt,lt+40));
  if(!m){top().children.push({text:'<'});i=lt+1;continue;}
  const tag=m[1].toLowerCase();let j=lt+m[0].length;const attrs={};
  for(;;){
   while(j<html.length&&/\s/.test(html[j]))j++;
   if(html[j]==='>'||html.startsWith('/>',j)){j+=html[j]==='>'?1:2;break;}
   if(j>=html.length)break;
   const a=/^([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/.exec(html.slice(j));
   if(!a){j++;continue;}
   attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]??'');j+=a[0].length;
  }
  const node={tag,attrs,children:[],parent:top()};top().children.push(node);i=j;
  if(VOID.has(tag))continue;
  if(RAW.has(tag)){const end=html.toLowerCase().indexOf(`</${tag}`,i);node.children.push({text:html.slice(i,end<0?html.length:end)});i=end<0?html.length:html.indexOf('>',end)+1;continue;}
  stack.push(node);
 }
 return root;
}
export const find=(node,test)=>{if(test(node))return node;for(const c of node.children??[]){const f=find(c,test);if(f)return f;}return null;};
const findAll=(node,test,out=[])=>{if(test(node))out.push(node);for(const c of node.children??[])findAll(c,test,out);return out;};
const textOf=node=>node.text!=null?node.text:(node.children??[]).map(textOf).join('');

// --- What the page's own stylesheets hide (display:none) ---
// The page as a visitor on a computer sees it (VIEW: 1280 x 800, a mouse): every rule that sets display, in @media blocks that hold
// there too, and per element the winner as in a browser (!important, then the most specific selector, then the last). A selector is
// read as compounds (tag, #id, .classes, [attr] or [attr=value]) joined by descendants; a state (:hover, :checked ...) or where the
// page runs (html[data-app], html[data-portal]: our apps and the portals) is left out, so it neither hides nor shows.
const VIEW={width:1280,height:800};
export function mediaHolds(query){
 return query.split(',').some(one=>{
  const q=one.trim().toLowerCase();if(!q||/\bnot\b|\bprint\b|\bspeech\b/.test(q))return false;
  return [...q.matchAll(/\(([^)]*)\)/g)].every(([,f])=>{
   const [name,value='']=f.split(':').map(x=>x.trim()),px=parseFloat(value)*(value.endsWith('em')||value.endsWith('rem')?16:1);
   switch(name){
    case 'min-width':return VIEW.width>=px;case 'max-width':return VIEW.width<=px;
    case 'min-height':return VIEW.height>=px;case 'max-height':return VIEW.height<=px;
    case 'orientation':return value==='landscape';case 'hover':return value==='hover';case 'any-hover':return value==='hover';
    case 'pointer':return value==='fine';case 'any-pointer':return value==='fine';
    case 'prefers-color-scheme':return value==='light';case 'prefers-reduced-motion':return value==='no-preference';
    default:return false;
   }
  });
 });
}
export function cssDisplayRules(css){
 const rules=[];let order=0;
 const read=(text,holds)=>{
  let i=0;
  while(i<text.length){
   const open=text.indexOf('{',i);if(open<0)break;
   const head=text.slice(i,open).trim();
   let depth=1,j=open+1;while(j<text.length&&depth){if(text[j]==='{')depth++;else if(text[j]==='}')depth--;j++;}
   const body=text.slice(open+1,j-1);i=j;
   if(head.startsWith('@')){if(/^@media\b/i.test(head))read(body,holds&&mediaHolds(head.replace(/^@media\s*/i,'')));else if(/^@(supports|layer)\b/i.test(head))read(body,holds);continue;}
   const d=/(?:^|;)\s*display\s*:\s*([a-z-]+)\s*(!important)?/i.exec(body);if(!d||!holds)continue;
   for(const one of head.split(',').map(x=>x.trim())){
    if(!one||/[:~+*|]|^(?:html|body)\[/.test(one))continue;
    const parts=one.replace(/\s*>\s*/g,' ').split(/\s+/).map(part=>({tag:/^[a-z][a-z0-9-]*/i.exec(part)?.[0]?.toLowerCase()??null,id:/#([\w-]+)/.exec(part)?.[1]??null,
     classes:[...part.matchAll(/\.([\w-]+)/g)].map(m=>m[1]),attrs:[...part.matchAll(/\[([\w-]+)(?:=["']?([^"'\]]*)["']?)?\]/g)].map(m=>[m[1].toLowerCase(),m[2]??null])}));
    const spec=parts.reduce((s,c)=>[s[0]+(c.id?1:0),s[1]+c.classes.length+c.attrs.length,s[2]+(c.tag?1:0)],[0,0,0]);
    rules.push({parts,display:d[1].toLowerCase(),important:Boolean(d[2]),spec,order:order++});
   }
  }
 };
 read(css.replace(/\/\*[\s\S]*?\*\//g,''),true);
 return rules;
}
const fits=(n,c)=>n.tag&&(!c.tag||c.tag===n.tag)&&(!c.id||n.attrs.id===c.id)&&c.classes.every(k=>(' '+(n.attrs.class??'')+' ').includes(` ${k} `))
 &&c.attrs.every(([k,v])=>k in n.attrs&&(v==null||n.attrs[k]===v));
function matchesSelector(n,parts){
 if(!fits(n,parts[parts.length-1]))return false;
 let at=parts.length-2,up=n.parent;
 while(at>=0&&up){if(fits(up,parts[at]))at--;up=up.parent;}
 return at<0;
}
const beats=(a,b)=>a.important!==b.important?a.important:a.spec[0]!==b.spec[0]?a.spec[0]>b.spec[0]:a.spec[1]!==b.spec[1]?a.spec[1]>b.spec[1]:a.spec[2]!==b.spec[2]?a.spec[2]>b.spec[2]:a.order>b.order;
// Marks every element the page's stylesheets hide (data-css-hidden), so the copy leaves it out as the page does.
export function markCssHidden(doc,css){
 const rules=cssDisplayRules(css);if(!rules.some(r=>r.display==='none'))return 0;let n=0;
 const walk=node=>{
  if(node.tag&&node.tag!=='#root'){let win=null;for(const r of rules)if(matchesSelector(node,r.parts)&&(!win||beats(r,win)))win=r;if(win?.display==='none'){node.attrs['data-css-hidden']='';n++;}}
  for(const c of node.children??[])walk(c);
 };
 walk(doc);return n;
}

// --- The page's words, as Markdown ---
const SKIP=new Set(['script','style','svg','template','noscript','form','button','input','select','textarea','label','dialog','iframe','canvas','source','head','link','meta','title','option','datalist','output','progress','meter','object','embed','video','audio']);
const BLOCK=new Set(['address','article','aside','blockquote','details','dd','div','dl','dt','fieldset','figcaption','figure','footer','h1','h2','h3','h4','h5','h6','header','hr','li','main','nav','ol','p','pre','section','summary','table','tbody','td','tfoot','th','thead','tr','ul','picture']);
// What nobody sees as the page loads, and what a screen reader alone hears (it says again what the page shows).
const unseen=n=>n.tag&&('hidden' in n.attrs||'data-css-hidden' in n.attrs||n.attrs['aria-hidden']==='true'||/(^|\s)(sr-only|visually-hidden)(\s|$)/.test(n.attrs.class??''));
const isBlock=n=>n.tag&&(BLOCK.has(n.tag))&&!SKIP.has(n.tag);
// A picture worth its words: one with alt text, not an icon of 96 pixels or less (the wiki's icons sit beside their own names).
const picture=n=>{const alt=(n.attrs.alt??'').trim(),w=Number(n.attrs.width),h=Number(n.attrs.height);return alt&&!(w&&h&&w<=96&&h<=96)?alt:'';};
const VALUE_ICONS={coins:'🪙',diamonds:'💎'};
const squash=text=>text.replace(/[\s ]+/g,' ');
const escMd=text=>text.replace(/([\\`*_[\]])/g,'\\$1');

export function makeRenderer({pageUrl,link}){
 // Two elements side by side with no space between them in the HTML (a chip and its line, a name and its size) stand apart on the
 // page by their styling: a space keeps their words apart here too.
 const join=nodes=>{
  let out='',prevElement=false;
  for(const n of nodes){
   const piece=inlineOf(n);if(!piece)continue;
   const element=n.text==null;
   if(element&&prevElement&&out&&!/\s$/.test(out)&&!/^\s/.test(piece))out+=' ';
   out+=piece;prevElement=element;
  }
  return out;
 };
 const inline=nodes=>squash(join(nodes)).trim();
 function inlineOf(n){
  if(n.text!=null)return escMd(n.text);
  if(SKIP.has(n.tag))return '';
  // A coin or diamond icon in a line of text says what the number beside it counts ("🪙100", the game's own 💎).
  if(unseen(n))return VALUE_ICONS[n.attrs['data-art']]??'';
  const inner=()=>inline(n.children);
  switch(n.tag){
   case 'br':return ' ';
   case 'strong':case 'b':{const t=inner();return t?`**${t}**`:'';}
   case 'em':case 'i':{const t=inner();return t?`*${t}*`:'';}
   case 'code':case 'kbd':{const t=squash(textOf(n)).trim();return t?`\`${t}\``:'';}
   case 'img':{const alt=picture(n);return alt?`![${escMd(alt)}](${new URL(n.attrs.src??'',pageUrl).href})`:'';}
   case 'a':{const t=inner()||escMd(squash(n.attrs['aria-label']??'').trim());const href=n.attrs.href;if(!t)return '';if(!href||href.startsWith('javascript:'))return t;return `[${t}](${link(href)})`;}
   default:return join(n.children);
  }
 }
 // Blocks: a list of Markdown blocks (joined by a blank line); prefix for nested lists.
 function blocks(nodes,depth=0){
  const out=[];let run=[];
  const flush=()=>{const t=inline(run);if(t)out.push(t);run=[];};
  for(const n of nodes){
   if(n.text!=null||!isBlock(n)){if(n.tag&&SKIP.has(n.tag))continue;run.push(n);continue;}
   if(unseen(n))continue;
   flush();out.push(...block(n,depth));
  }
  flush();return out;
 }
 function block(n,depth){
  const t=n.tag;
  if(/^h[1-6]$/.test(t)){const text=inline(n.children);return text?[`${'#'.repeat(Number(t[1]))} ${text}`]:[];}
  if(t==='p'||t==='summary'||t==='figcaption'||t==='dt'){const text=inline(n.children);return text?[t==='summary'||t==='dt'?`**${text.replace(/^\*\*(.*)\*\*$/,'$1')}**`:text]:[];}
  if(t==='hr')return ['---'];
  if(t==='pre')return ['```\n'+textOf(n).replace(/\n$/,'')+'\n```'];
  if(t==='blockquote')return [blocks(n.children,depth).join('\n\n').split('\n').map(l=>`> ${l}`).join('\n')];
  if(t==='ul'||t==='ol'){
   let k=0;const items=n.children.filter(c=>c.tag==='li'&&!unseen(c)).map(li=>{
    const parts=blocks(li.children,depth+1);if(!parts.length)return null;k++;
    const mark=t==='ol'?`${k}. `:'- ',pad=' '.repeat(mark.length);
    return parts.map((p,i)=>p.split('\n').map((l,j)=>i===0&&j===0?mark+l:(l?pad+l:l)).join('\n')).join('\n'+pad.replace(/ +$/,'')+'\n');
   }).filter(Boolean);
   return items.length?[items.join('\n')]:[];
  }
  if(t==='table')return table(n);
  if(t==='dl'){
   // A list of terms (the wiki's facts): **term**: what it says.
   const rows=[];let term=null;
   for(const c of n.children){if(!c.tag||unseen(c))continue;if(c.tag==='dt')term=inline(c.children);else if(c.tag==='dd'){const d=blocks(c.children,depth).join(' ');rows.push(`- ${term?`**${term}**: `:''}${d}`);term=null;}else if(c.tag==='div'){rows.push(...block(c,depth));}}
   return rows.length?[rows.join('\n')]:[];
  }
  return blocks(n.children,depth);
 }
 function table(n){
  const rows=findAll(n,c=>c.tag==='tr'&&!unseen(c)).map(tr=>tr.children.filter(c=>(c.tag==='td'||c.tag==='th')&&!unseen(c)).map(c=>blocks(c.children).join(' ').replace(/\|/g,'\\|').replace(/\n+/g,' ')));
  const caption=find(n,c=>c.tag==='caption');
  if(!rows.length)return [];
  const width=Math.max(...rows.map(r=>r.length)),fill=r=>[...r,...Array(width-r.length).fill('')];
  const lines=[`| ${fill(rows[0]).join(' | ')} |`,`| ${Array(width).fill('---').join(' | ')} |`,...rows.slice(1).map(r=>`| ${fill(r).join(' | ')} |`)];
  return [...(caption?[`**${inline(caption.children)}**`]:[]),lines.join('\n')];
 }
 return {blocks,inline};
}

// --- The site's pages, from the built sitemap ---
export function sitemapPages(xml){
 const pages=[];
 for(const [,body] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)){
  const loc=decode(/<loc>([^<]+)<\/loc>/.exec(body)?.[1]??'').trim();if(!loc)continue;
  const alternates={};for(const [,lang,href] of body.matchAll(/hreflang="([^"]+)"\s+href="([^"]+)"/g))if(lang!=='x-default')alternates[lang]=decode(href);
  pages.push({url:loc,alternates});
 }
 return pages;
}
const LANG_NAME=code=>{try{const n=new Intl.DisplayNames([code],{type:'language'}).of(code);return n&&n!==code?n[0].toLocaleUpperCase(code)+n.slice(1):code;}catch{return code;}};
const CATEGORY=path=>/^\/(?:[a-z]{2}\/)?guides(?:\/|$)/.test(path)?'Guides':path==='/wiki'||path.startsWith('/wiki/')?'Game wiki':/^\/(?:[a-z]{2}\/)?(?:privacy|partners)$/.test(path)?'Privacy and partners':'Main pages';
const CATEGORY_ORDER=['Main pages','Guides','Game wiki','Privacy and partners'];

// Builds every copy and llms.txt in dist (dist-static). Returns the report; throws when a check fails.
export function buildAiMarkdown(dist){
 const xml=readFileSync(join(dist,'sitemap.xml'),'utf8');
 const listed=sitemapPages(xml);
 const seen=new Set(),pages=[];
 for(const p of listed){
  const u=new URL(p.url);if(u.origin!==SITE)throw new Error(`Markdown copies: ${p.url} is not on ${SITE}`);
  if(seen.has(u.pathname))throw new Error(`Markdown copies: ${u.pathname} is twice in the sitemap`);seen.add(u.pathname);
  const file=join(dist,pageFile(u.pathname));if(!existsSync(file))throw new Error(`Markdown copies: ${u.pathname} has no built page (${pageFile(u.pathname)})`);
  const html=readFileSync(file,'utf8'),doc=parseHtml(html);
  const head=find(doc,n=>n.tag==='head')??doc;
  const meta=name=>find(head,n=>n.tag==='meta'&&(n.attrs.name===name||n.attrs.property===name))?.attrs.content?.trim()??'';
  if(/noindex/i.test(meta('robots')))continue;   // never in the sitemap today; kept out even if it were
  // The page's own stylesheets (its <link>s on this site and its <style>s): what they hide stays out of the copy.
  const css=findAll(head,n=>n.tag==='link'&&n.attrs.rel==='stylesheet'&&/^\/[^/]/.test(n.attrs.href??'')).map(n=>{const f=join(dist,n.attrs.href.split(/[?#]/)[0].slice(1));return existsSync(f)?readFileSync(f,'utf8'):'';})
   .concat(findAll(doc,n=>n.tag==='style').map(textOf)).join('\n');
  markCssHidden(doc,css);
  const htmlLang=find(doc,n=>n.tag==='html')?.attrs.lang??'en';
  const canonical=find(head,n=>n.tag==='link'&&n.attrs.rel==='canonical')?.attrs.href??p.url;
  const headAlternates=Object.fromEntries(findAll(head,n=>n.tag==='link'&&n.attrs.rel==='alternate'&&n.attrs.hreflang&&n.attrs.hreflang!=='x-default').map(n=>[n.attrs.hreflang,n.attrs.href]));
  pages.push({url:p.url,path:u.pathname,lang:htmlLang,title:squash(textOf(find(head,n=>n.tag==='title')??{text:''})).trim(),description:meta('description'),canonical,
   alternates:{...headAlternates,...p.alternates},doc,html});
 }
 const byPath=new Map(pages.map(p=>[p.path,p]));
 // A link on a page: a page with a copy → its copy (with its #spot); our other addresses and everything else stay as they are.
 const linkFor=pageUrl=>href=>{
  let u;try{u=new URL(href,pageUrl);}catch{return href;}
  if(u.origin!==SITE)return u.href;
  const path=u.pathname.replace(/\.html$/,'').replace(/\/index$/,'/')||'/';
  if(!u.search&&byPath.has(path))return `${SITE}${markdownPath(path)}${u.hash}`;
  return u.href;
 };
 // The site's pages at the end of every copy, in the page's language where that language has them.
 const guidesIndex=lang=>pages.find(q=>q.lang===lang&&/^\/(?:[a-z]{2}\/)?guides$/.test(q.path))??pages.find(q=>q.path==='/guides');
 const sitePages=lang=>[...pages.filter(q=>q.lang===lang&&CATEGORY(q.path)==='Main pages'),...[guidesIndex(lang)].filter(Boolean),
  ...pages.filter(q=>q.lang==='en'&&(q.path==='/wiki'||CATEGORY(q.path)==='Privacy and partners'))];
 const written=[];
 for(const p of pages){
  const body=find(p.doc,n=>n.tag==='main')??find(p.doc,n=>n.tag==='body')??p.doc;
  const {blocks}=makeRenderer({pageUrl:p.url,link:linkFor(p.url)});
  const text=blocks(body.children).join('\n\n');
  const alternates=Object.entries(p.alternates).filter(([lang,href])=>lang!==p.lang&&byPath.has(new URL(href).pathname));
  const yaml=v=>JSON.stringify(v);
  const front=['---',`title: ${yaml(p.title)}`,`url: ${yaml(p.canonical)}`,`markdown: ${yaml(SITE+markdownPath(p.path))}`,`language: ${yaml(p.lang)}`,
   ...(p.description?[`description: ${yaml(p.description)}`]:[]),
   ...(alternates.length?['alternates:',...alternates.map(([lang,href])=>`  ${lang}: ${yaml(SITE+markdownPath(new URL(href).pathname))}`)]:[]),
   'source: "Made from the page itself on every deploy. Index of every page: https://www.harvesttycoon.com/llms.txt"','---'].join('\n');
  const more=sitePages(p.lang).filter(q=>q.path!==p.path).map(q=>`- [${escMd(q.title)}](${SITE}${markdownPath(q.path)})`);
  const md=`${front}\n\n${text}\n\n## Site pages\n\n${more.join('\n')}\n- [Index of every page in every language](${SITE}/llms.txt)\n`;
  const out=join(dist,markdownPath(p.path).slice(1));mkdirSync(dirname(out),{recursive:true});writeFileSync(out,md);
  written.push({...p,md,file:markdownPath(p.path)});
 }
 // llms.txt: its facts (scripts/build-wiki.mjs) stay on top; the pages follow, per language and part of the site, each to its copy.
 // (Cut where its page lists began: run again on the same folder, it makes the same file.)
 const old=readFileSync(join(dist,'llms.txt'),'utf8'),cut=Math.min(...['\n## Pages','\n## How to read this site'].map(m=>old.indexOf(m)).map(i=>i<0?Infinity:i));
 const intro=(cut===Infinity?old:old.slice(0,cut)).trimEnd();
 const langs=[...new Set(written.map(p=>p.lang))].sort((a,b)=>(a!=='en')-(b!=='en')||a.localeCompare(b));
 const sections=langs.map(lang=>{
  const mine=written.filter(p=>p.lang===lang);
  const parts=CATEGORY_ORDER.map(cat=>{const list=mine.filter(p=>CATEGORY(p.path)===cat);return list.length?`### ${cat}\n${list.map(p=>`- [${p.title}](${SITE}${p.file}): ${p.description||p.title}`).join('\n')}`:'';}).filter(Boolean);
  return `## ${LANG_NAME(lang)} (${lang})\n\n${parts.join('\n\n')}`;
 });
 const llms=`${intro}\n\n## How to read this site\n- Every public page has a Markdown copy of its own text (not a summary): the page's address with ${EXT} (the home page /index${EXT}, a language's home /xx/index${EXT}). They are made from the pages on every deploy.\n- The links inside a copy go to the other copies, so the whole site can be read from here. Each copy starts with its title, address, language, description and the same page in other languages.\n- The game wiki is in English only; the guides, the home page, the app page and help and support are in ${langs.length} languages.\n\n${sections.join('\n\n')}\n`;
 writeFileSync(join(dist,'llms.txt'),llms);
 const report=validate(dist,written,llms);
 return {pages:written.length,languages:langs.length,...report};
}

// --- The checks (they stop the deploy) ---
export function validate(dist,written,llms){
 const problems=[];
 const exists=url=>{const u=new URL(url);return u.origin===SITE&&existsSync(join(dist,decodeURIComponent(u.pathname).slice(1)));};
 const files=new Set();
 for(const p of written){
  if(files.has(p.file))problems.push(`${p.file} is made twice`);files.add(p.file);
  // Every word the page shows (its main part, as read above) is in the copy: the copy holds the page, not a summary of it.
  const words=s=>(s.toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]);
  const body=find(p.doc,n=>n.tag==='main')??find(p.doc,n=>n.tag==='body')??p.doc;
  const shown=words(visibleText(body)),inCopy=new Set(words(p.md.replace(/\]\([^)]*\)/g,']')));
  const missing=shown.filter(w=>!inCopy.has(w));
  if(shown.length&&missing.length/shown.length>0.01)problems.push(`${p.file} misses ${missing.length} of ${shown.length} words (${[...new Set(missing)].slice(0,8).join(', ')})`);
  if(shown.length<20)problems.push(`${p.file} has almost no text (${shown.length} words)`);
  for(const [,url] of p.md.matchAll(/\]\((https:\/\/www\.harvesttycoon\.com\/[^)\s#]*\.md)(?:#[^)]*)?\)/g))if(!exists(url))problems.push(`${p.file} links to ${url}, which does not exist`);
  for(const [,url] of p.md.matchAll(/^ {2}[a-z-]+: "(https:[^"]+)"$/gm))if(!exists(url))problems.push(`${p.file} names an alternate ${url} that does not exist`);
  if(!new RegExp(`^language: "${p.lang}"$`,'m').test(p.md))problems.push(`${p.file} does not say its language`);
 }
 const listed=[...llms.matchAll(/\]\((https:\/\/www\.harvesttycoon\.com\/[^)\s]*\.md)\)/g)].map(m=>m[1]);
 for(const url of listed)if(!exists(url))problems.push(`llms.txt links to ${url}, which does not exist`);
 if(new Set(listed).size!==listed.length)problems.push('llms.txt names a page twice');
 for(const p of written)if(!listed.includes(SITE+p.file))problems.push(`llms.txt misses ${p.file}`);
 if(problems.length)throw new Error(`Markdown copies failed their checks:\n- ${problems.join('\n- ')}`);
 return {links:listed.length,checked:written.length};
}
// The words a visitor sees in a part of the page, by the same rules as the copy (for the check).
function visibleText(n){
 if(n.text!=null)return n.text;
 if(SKIP.has(n.tag)||unseen(n))return ' ';
 if(n.tag==='img')return ` ${picture(n)} `;
 return ' '+n.children.map(visibleText).join('')+' ';
}
