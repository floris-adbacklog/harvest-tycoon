import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseHtml,makeRenderer,markdownPath,pageFile,sitemapPages,buildAiMarkdown,SITE} from '../scripts/build-ai-markdown.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

// 29 Oct 2026 (the owner): every public page as Markdown beside it, and /llms.txt listing them per language (scripts/build-ai-markdown.mjs).
test('addresses: each page has one copy beside it, and its built file is the one Vercel serves',()=>{
 assert.equal(markdownPath('/'),'/index.md');assert.equal(markdownPath('/es/'),'/es/index.md');
 assert.equal(markdownPath('/app'),'/app.md');assert.equal(markdownPath('/es/support'),'/es/support.md');
 assert.equal(markdownPath('/wiki'),'/wiki.md');assert.equal(markdownPath('/wiki/crops'),'/wiki/crops.md');
 assert.equal(pageFile('/'),'index.html');assert.equal(pageFile('/es/'),'es/index.html');assert.equal(pageFile('/wiki'),'wiki/index.html');assert.equal(pageFile('/guides'),'guides/index.html');assert.equal(pageFile('/guides/earn-coins-fast'),'guides/earn-coins-fast.html');
 assert.equal(pageFile('/wiki/crops'),'wiki/crops.html');assert.equal(pageFile('/es/app'),'es/app.html');
});

test('the page\'s own words, in order: headings, lists, tables, terms, links and pictures; nothing hidden, no forms',()=>{
 const doc=parseHtml(`<main><h1>Grow <em>big</em></h1><p class="x"><span>NEW GAME</span><span>Opened</span></p>
  <p hidden>secret</p><p aria-hidden="true">decor</p><span class="sr-only">again</span><form><label>Email</label><button>Sendnow</button></form>
  <ul><li>One</li><li>Two <a href="/wiki/crops#crop-wheat">wheat</a></li></ul>
  <table><tr><th>Tier</th><th>Reward</th></tr><tr><td>Gold</td><td><span data-art="coins" aria-hidden="true"></span>1,200 | more</td></tr></table>
  <dl><dt>Level</dt><dd>12</dd></dl><details><summary>More</summary><p>Inside</p></details>
  <p><a href="https://example.com/x">out</a> <a href="/?src=meta">play</a> <a href="/nothing-here">other</a></p>
  <img src="/assets/big.webp" alt="A farm" width="1600" height="900"><img src="/assets/icons/a.webp" alt="Apples" width="64" height="64"><script>var x=1</script><svg><path d="M0"/></svg></main>`);
 const known=new Set(['/wiki/crops']);
 const link=href=>{const u=new URL(href,`${SITE}/`);return u.origin===SITE&&!u.search&&known.has(u.pathname)?`${SITE}${markdownPath(u.pathname)}${u.hash}`:u.href;};
 const md=makeRenderer({pageUrl:`${SITE}/`,link}).blocks(doc.children).join('\n\n');
 assert.match(md,/^# Grow \*big\*$/m);
 assert.match(md,/^NEW GAME Opened$/m,'two spans side by side keep their words apart');
 for(const gone of ["secret","decor","again","Email","Sendnow","var x","M0"])assert.ok(!md.includes(gone),gone);
 assert.match(md,/^- One\n- Two \[wheat\]\(https:\/\/www\.harvesttycoon\.com\/wiki\/crops\.md#crop-wheat\)$/m,'an internal link goes to the copy, with its spot');
 assert.match(md,/^\| Tier \| Reward \|\n\| --- \| --- \|\n\| Gold \| 🪙1,200 \\\| more \|$/m,'a table, the coin icon as 🪙, a pipe kept');
 assert.match(md,/^- \*\*Level\*\*: 12$/m);assert.match(md,/^\*\*More\*\*\n\nInside$/m);
 assert.match(md,/\[out\]\(https:\/\/example\.com\/x\) \[play\]\(https:\/\/www\.harvesttycoon\.com\/\?src=meta\) \[other\]\(https:\/\/www\.harvesttycoon\.com\/nothing-here\)/,'other links stay as they are, absolute');
 assert.match(md,/!\[A farm\]\(https:\/\/www\.harvesttycoon\.com\/assets\/big\.webp\)/);assert.ok(!md.includes('Apples'),'an icon beside its own name is left out');
});

const page=({lang,title,body,canonical,alternates=''})=>`<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${title}</title><meta name="description" content="${title} described">
<link rel="canonical" href="${canonical}">${alternates}</head><body><header>logo</header><main>${body}</main><footer>© footer</footer></body></html>`;
function site(){
 const dir=mkdtempSync(join(tmpdir(),'ai-md-'));mkdirSync(join(dir,'es'));mkdirSync(join(dir,'wiki'));
 const alt='<link rel="alternate" hreflang="en" href="https://www.harvesttycoon.com/"><link rel="alternate" hreflang="es" href="https://www.harvesttycoon.com/es/">';
 const words='Plant crops, harvest them, bake bread and sell it at the Market while your family helps with every order in the valley.';
 writeFileSync(join(dir,'index.html'),page({lang:'en',title:'Home',canonical:`${SITE}/`,alternates:alt,body:`<h1>Home</h1><p>${words}</p><p><a href="/wiki">Wiki</a> <a href="/es/">Español</a></p>`}));
 writeFileSync(join(dir,'es','index.html'),page({lang:'es',title:'Inicio',canonical:`${SITE}/es/`,alternates:alt,body:`<h1>Inicio</h1><p>Planta cultivos, cosecha, hornea pan y véndelo en el mercado mientras tu familia ayuda con cada pedido del valle.</p><p><a href="/es/">Inicio</a></p>`}));
 writeFileSync(join(dir,'wiki','index.html'),page({lang:'en',title:'Wiki',canonical:`${SITE}/wiki`,body:`<h1>Wiki</h1><p>${words}</p><p><a href="/wiki/crops">Crops</a></p>`}));
 writeFileSync(join(dir,'wiki','crops.html'),page({lang:'en',title:'Crops',canonical:`${SITE}/wiki/crops`,body:`<h1>Crops</h1><p>${words}</p><p><a href="/">Play</a></p>`}));
 const url=(path,alts=false)=>`<url><loc>${SITE}${path}</loc>${alts?`<xhtml:link rel="alternate" hreflang="en" href="${SITE}/"/><xhtml:link rel="alternate" hreflang="es" href="${SITE}/es/"/>`:''}</url>`;
 writeFileSync(join(dir,'sitemap.xml'),`<urlset>${url('/',true)}${url('/es/',true)}${url('/wiki')}${url('/wiki/crops')}</urlset>`);
 writeFileSync(join(dir,'llms.txt'),'# Harvest Tycoon\n\n> A farming game.\n\n## Facts\n- Free.\n\n## Pages\n- [Play](https://www.harvesttycoon.com/)\n');
 return dir;
}

test('a whole site: one copy a page, links between the copies, languages and llms.txt per language, all checked',()=>{
 const dir=site();
 try{
  assert.deepEqual(sitemapPages(readFileSync(join(dir,'sitemap.xml'),'utf8'))[0].alternates,{en:`${SITE}/`,es:`${SITE}/es/`});
  const report=buildAiMarkdown(dir);
  assert.deepEqual(report,{pages:4,languages:2,links:4,checked:4});
  for(const f of ['index.md','es/index.md','wiki.md','wiki/crops.md'])assert.ok(existsSync(join(dir,f)),f);
  const home=readFileSync(join(dir,'index.md'),'utf8'),es=readFileSync(join(dir,'es/index.md'),'utf8'),llms=readFileSync(join(dir,'llms.txt'),'utf8');
  assert.match(home,/^---\ntitle: "Home"\nurl: "https:\/\/www\.harvesttycoon\.com\/"\nmarkdown: "https:\/\/www\.harvesttycoon\.com\/index\.md"\nlanguage: "en"\ndescription: "Home described"\nalternates:\n {2}es: "https:\/\/www\.harvesttycoon\.com\/es\/index\.md"\n/);
  assert.match(home,/\[Wiki\]\(https:\/\/www\.harvesttycoon\.com\/wiki\.md\) \[Español\]\(https:\/\/www\.harvesttycoon\.com\/es\/index\.md\)/);
  assert.ok(!home.includes('logo')&&!home.includes('© footer'),'the site\'s header and footer stay out');
  assert.match(es,/^language: "es"$/m);assert.match(es,/Planta cultivos/);
  assert.match(llms,/^# Harvest Tycoon\n\n> A farming game\.\n\n## Facts\n- Free\.\n\n## How to read this site/,'the facts stay on top; the old list of HTML pages goes');
  assert.match(llms,/^## English \(en\)\n\n### Main pages\n- \[Home\]\(https:\/\/www\.harvesttycoon\.com\/index\.md\): Home described\n\n### Game wiki\n- \[Wiki\]/m);
  assert.match(llms,/^## Español \(es\)\n\n### Main pages\n- \[Inicio\]\(https:\/\/www\.harvesttycoon\.com\/es\/index\.md\)/m);
  const again=buildAiMarkdown(dir);assert.deepEqual(again,report);assert.equal(readFileSync(join(dir,'llms.txt'),'utf8'),llms,'the same file every time');
  // A page that loses its words, or a sitemap page with no built page, stops the deploy.
  writeFileSync(join(dir,'wiki','crops.html'),readFileSync(join(dir,'wiki','crops.html'),'utf8').replace('<main>','<main><p>'+'extra words here '.repeat(10)+'</p>'));
  assert.ok(buildAiMarkdown(dir).checked===4,'new words simply come along');
  rmSync(join(dir,'wiki','crops.html'));
  assert.throws(()=>buildAiMarkdown(dir),/\/wiki\/crops has no built page/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});

test('served as Markdown text, out of search results, open to fetch, made on every deploy',()=>{
 const rules=JSON.parse(read('vercel.json')).headers,md=rules.find(r=>r.source==='/(.*)\\.md'),get=(r,k)=>r.headers.find(h=>h.key===k)?.value;
 assert.equal(get(md,'Content-Type'),'text/markdown; charset=utf-8');assert.equal(get(md,'X-Robots-Tag'),'noindex');
 assert.equal(get(rules.find(r=>r.source==='/llms.txt'),'Content-Type'),'text/plain; charset=utf-8');
 assert.doesNotMatch(read('public/robots.txt'),/^Disallow:\s*(?:\/\s*$|.*\.md|.*llms)/m,'robots.txt stops none of it');
 assert.match(read('scripts/build-static.mjs'),/const \{buildAiMarkdown\}=await import\('\.\/build-ai-markdown\.mjs'\);const ai=buildAiMarkdown\('dist-static'\);\nconsole\.log\(`Markdown copies:[^\n]*\nconsole\.log\('Standalone static game ready/);
});

test('what the page\'s stylesheets hide on a computer stays out; what a wider screen or a state shows is judged like a browser',async()=>{
 const {markCssHidden,mediaHolds}=await import('../scripts/build-ai-markdown.mjs');
 const doc=parseHtml('<main><p class="phone">Phone photo</p><ul class="cards"><li>Card</li></ul><div class="in-app">In the app</div><p class="note" id="sent">Sent!</p><p class="x y">Strong</p><p>Plain</p></main>');
 const css=`.phone{display:none}@media (min-width:1000px){.phone{display:block}}.cards{display:none}@media (max-width:700px){.dual .cards{display:grid}}
  .in-app{display:none}html[data-app] .in-app{display:block}.note{display:none}.note:target{display:block}.x.y{display:none}.y{display:block}@media print{.phone{display:none}}`;
 markCssHidden(doc,css);
 const md=makeRenderer({pageUrl:`${SITE}/`,link:h=>h}).blocks(doc.children).join('\n\n');
 assert.match(md,/Phone photo/,'a wide screen shows it');assert.match(md,/Plain/);
 for(const gone of ['Card','In the app','Sent!','Strong'])assert.ok(!md.includes(gone),gone);
 assert.equal(mediaHolds('(min-width: 900px) and (hover: hover)'),true);assert.equal(mediaHolds('(max-width:700px)'),false);assert.equal(mediaHolds('(orientation: portrait)'),false);
});
