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
</footer>
</body></html>
`;
}

export async function buildWiki(outDir,{contentUrl=new URL('../public/wiki-content.js',import.meta.url)}={}){
 const {WIKI_TOPICS,wikiArticle,wikiTile,wikiNext}=await import(contentUrl.href);
 mkdirSync(join(outDir,'wiki'),{recursive:true});
 const tiles=WIKI_TOPICS.map(t=>wikiTile(t)).join('');
 writeFileSync(join(outDir,'wiki','index.html'),page({path:'/wiki',title:'Harvest Tycoon wiki: crops, buildings, recipes and tips',heading:'The farm wiki',description:'Everything about Harvest Tycoon: every crop, building and recipe, the market, Farm family, events, diamonds and more.',body:` <div class="wiki-tiles">${tiles}</div>`}));
 for(const topic of WIKI_TOPICS){
  const article=wikiArticle(topic.id);
  const body=` <nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="/wiki">Wiki</a> › ${esc(article.title)}</nav>
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
