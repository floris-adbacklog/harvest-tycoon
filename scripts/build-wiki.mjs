// The public farm wiki (/wiki and /wiki/<topic>): plain HTML pages that search engines can read, made from the same content as
// How to play in the game (public/wiki-content.js). Run by scripts/build-static.mjs on every deploy, so the pages always
// match the game rules; also adds the pages to the sitemap.
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const SITE='https://www.harvesttycoon.com';
const esc=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);

function page({path,title,heading,description,body}){
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#214d36">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta property="og:type" content="article"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${SITE}/assets/harvest-tycoon-logo.png">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48"><link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png"><link rel="canonical" href="${SITE}${path}"><link rel="stylesheet" href="/legal.css"><link rel="stylesheet" href="/wiki.css"></head>
<body class="wiki-page">
<header class="legal-hero">
 <a class="legal-logo" href="/" aria-label="Harvest Tycoon home"><img src="/assets/harvest-tycoon-logo.webp" alt="Harvest Tycoon" width="1024" height="1024"></a>
 <p class="eyebrow">HARVEST TYCOON WIKI</p>
 <h1>${esc(heading)}</h1>
 <p class="updated">${esc(description)}</p>
</header>
<main class="legal-card wiki">
${body}
 <div class="wiki-cta"><p>Ready to start your own farm? It’s free to play.</p><a href="/">Play Harvest Tycoon</a></div>
</main>
<footer class="legal-footer">
 <span>© 2026 Harvest Tycoon</span>
 <a href="/">Play Harvest Tycoon</a>
 <a href="/wiki">Game wiki</a>
 <a href="/privacy">Privacy Policy</a>
 <a class="footer-social" href="https://www.facebook.com/harvesttycoon/" target="_blank" rel="noopener" aria-label="Harvest Tycoon on Facebook" title="Harvest Tycoon on Facebook"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.1 23.7v-8H6.6V12h2.5v-1.6c0-4.1 1.9-6 5.9-6 .8 0 2.1.2 2.6.3v3.3l-1.4-.1c-2 0-2.7.7-2.7 2.7V12h3.9l-.7 3.7h-3.2V24C19.4 23.2 24 18.2 24 12 24 5.4 18.6 0 12 0S0 5.4 0 12c0 5.6 3.9 10.4 9.1 11.7Z"/></svg></a>
</footer>
</body></html>
`;
}

export async function buildWiki(outDir,{contentUrl=new URL('../public/wiki-content.js',import.meta.url)}={}){
 const {WIKI_TOPICS,wikiArticle,wikiNext,wikiJump,wikiGroups}=await import(contentUrl.href);
 mkdirSync(join(outDir,'wiki'),{recursive:true});
 writeFileSync(join(outDir,'wiki','index.html'),page({path:'/wiki',title:'Harvest Tycoon wiki: crops, buildings, recipes and tips',heading:'The farm wiki',description:'Everything about Harvest Tycoon: every crop, building and recipe, the market, Farm family, events, diamonds and more.',body:` ${wikiGroups()}`}));
 for(const topic of WIKI_TOPICS){
  const article=wikiArticle(topic.id);
  const body=` <nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="/wiki">Wiki</a> › ${esc(article.title)}</nav>
 ${wikiJump(article)}
 <article class="wiki-article">${article.html}</article>
 <section class="wiki-related"><h3>Read next</h3><div class="wiki-next-list">${article.related.map(t=>wikiNext(t)).join('')}</div></section>`;
  writeFileSync(join(outDir,'wiki',`${topic.id}.html`),page({path:`/wiki/${topic.id}`,title:`${article.title} — Harvest Tycoon wiki`,heading:article.title,description:article.blurb,body}));
 }
 // The sitemap gets the wiki pages (once, even if the build runs twice).
 const sitemap=join(outDir,'sitemap.xml');
 if(existsSync(sitemap)){
  const xml=readFileSync(sitemap,'utf8');
  if(!xml.includes('/wiki</loc>')){
   const today=new Date().toISOString().slice(0,10);
   const urls=['/wiki',...WIKI_TOPICS.map(t=>`/wiki/${t.id}`)].map(p=>` <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n');
   writeFileSync(sitemap,xml.replace('</urlset>',`${urls}\n</urlset>`));
  }
 }
 return WIKI_TOPICS.length+1;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const out=process.argv[2]??'dist-static';
 console.log(`Wrote ${await buildWiki(out)} wiki pages to ${out}/wiki.`);
}
