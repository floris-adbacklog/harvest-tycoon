// The guides (/guides and /guides/<slug>, 29 Oct 2026): made on every deploy from scripts/guides-content.mjs (its numbers from the
// game rules), in the wiki's page (scripts/build-wiki.mjs page), and added to the sitemap, so scripts/build-ai-markdown.mjs gives each
// a Markdown copy and a line in llms.txt. English only for now (the owner, 29 Oct 2026: begin small). vercel.json serves /guides and
// /guides/<slug> from these files.
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {page} from './build-wiki.mjs';
import {breadcrumbs} from './structured-data.mjs';
import {GUIDES,GUIDES_INDEX} from './guides-content.mjs';

const SITE='https://www.harvesttycoon.com';
const esc=text=>String(text).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export function buildGuides(outDir){
 mkdirSync(join(outDir,'guides'),{recursive:true});
 const cards=GUIDES.map(g=>`<li><a href="/guides/${g.slug}"><strong>${esc(g.title)}</strong><span>${esc(g.description)}</span></a></li>`).join('');
 writeFileSync(join(outDir,'guides','index.html'),page({path:'/guides',title:GUIDES_INDEX.title,heading:GUIDES_INDEX.heading,description:GUIDES_INDEX.description,
  body:` <nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="/wiki">Wiki</a> › Guides</nav>\n <ul class="guide-list">${cards}</ul>\n <p>Looking for the details of every crop, building and recipe? See the <a href="/wiki">farm wiki</a>.</p>`,
  data:[breadcrumbs([['Guides',`${SITE}/guides`]])]}));
 for(const g of GUIDES){
  const others=GUIDES.filter(o=>o!==g).map(o=>`<li><a href="/guides/${o.slug}">${esc(o.title)}</a></li>`).join('');
  writeFileSync(join(outDir,'guides',`${g.slug}.html`),page({path:`/guides/${g.slug}`,title:`${g.title} — Harvest Tycoon`,heading:g.title,description:g.description,
   body:` <nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="/guides">Guides</a> › ${esc(g.title)}</nav>\n <article class="wiki-article guide-article">${g.body()}</article>\n <section class="wiki-related"><h2>More guides</h2><ul class="wiki-list">${others}</ul></section>`,
   data:[breadcrumbs([['Guides',`${SITE}/guides`],[g.title,`${SITE}/guides/${g.slug}`]])]}));
 }
 // The sitemap (once, even if the build runs twice).
 const sitemap=join(outDir,'sitemap.xml');
 if(existsSync(sitemap)){
  const xml=readFileSync(sitemap,'utf8');
  if(!xml.includes('/guides</loc>')){
   const today=new Date().toISOString().slice(0,10);
   const urls=['/guides',...GUIDES.map(g=>`/guides/${g.slug}`)].map(p=>` <url><loc>${SITE}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n');
   writeFileSync(sitemap,xml.replace('</urlset>',`${urls}\n</urlset>`));
  }
 }
 return GUIDES.length+1;
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
 const out=process.argv[2]??'dist-static';
 console.log(`Wrote ${buildGuides(out)} guide pages to ${out}/guides.`);
}
