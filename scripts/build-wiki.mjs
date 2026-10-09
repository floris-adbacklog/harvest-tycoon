// The public farm wiki (/wiki and /wiki/<topic>): plain HTML pages that search engines can read, made from the same content as
// How to play in the game (public/wiki-content.js). Run by scripts/build-static.mjs on every deploy, so the pages always
// match the game rules; also adds the pages to the sitemap.
import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {WIKI_SITE,WIKI_COPY_ICON} from '../public/wiki-link.js';
import {LANGUAGES} from '../public/languages.js';
import {APP_STORE_URL} from '../public/game-links.js';
import {FAMILY_CONFIG,FAMILY_MIN_LEVEL,STARTER_LEVEL,ITEMS,BUILDINGS,EVENT_LEAGUES} from '../game/farm-state.js';
import {PAYMENT_PACKS,STARTER_WINDOW,OFFER,PASS,passOnSale} from '../game/payments.js';
import {ldScript,breadcrumbs,PLAY_URL} from './structured-data.mjs';
import {appStoreAddress} from './app-store-links.mjs';

const SITE='https://www.harvesttycoon.com';
const esc=value=>String(value).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
// Every picture on the website wiki says what it shows (9 Oct 2026): Bing's site scan reads alt="" as a missing alt. The name is the
// game's own name of the crop, good or building, a league's name, else the name written right beside it. Each one is aria-hidden: that
// name is always written beside it (or the row of small pictures it sits in is hidden from screen readers already), so a screen reader
// still reads every name once. How to play in the game keeps alt="" (public/visual-icons.js art()).
const ENTITY={amp:'&',lt:'<',gt:'>',quot:'"',rsquo:'’',nbsp:' '};
const plainText=html=>html.replace(/&(amp|lt|gt|quot|rsquo|nbsp);/g,(all,name)=>ENTITY[name]).replace(/\s+/g,' ').trim();
const BESIDE=/^(?:\s*<(?!\/|img\b|input\b|span class="game-art)[a-z][^>]*>)*\s*([^<]*\p{L}[^<]*)/u;
export function namePictures(html,fallback=''){
 return html.replace(/<img\b([^>]*?) alt=""([^>]*)>/g,(tag,before,after,at)=>{
  const attrs=before+after,key=attrs.match(/ data-art="([^"]+)"/)?.[1],league=attrs.match(/\/league-([a-z]+)\.webp"/)?.[1];
  const beside=html.slice(at+tag.length).match(BESIDE)?.[1],file=attrs.match(/ src="[^"]*\/([^/."]+)\.[a-z]+"/)?.[1]??'';
  const name=(key&&(ITEMS[key]?.name??BUILDINGS[key]?.name))||(league&&EVENT_LEAGUES.find(l=>l.id===league)?.name)||(beside&&plainText(beside))||fallback||(key??file).replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
  return `<img${before} alt="${esc(name)}"${/ aria-hidden=/.test(attrs)?'':' aria-hidden="true"'}${after}>`;
 });
}

// Install the app on the website (30 Sep 2026): where the browser offers to install (Android, Chrome and Edge on a computer) the
// button in Getting started shows and opens that offer; elsewhere it stays hidden and the steps say how. Only on that page.
export const INSTALL_SCRIPT=`<script>addEventListener('beforeinstallprompt',function(e){var row=document.querySelector('[data-wiki-install-row]');if(!row)return;e.preventDefault();row.hidden=false;row.querySelector('button').onclick=function(){row.hidden=true;e.prompt();};});</script>`;
// Search on the website (30 Sep 2026), like How to play in the game: /wiki/search.json holds every entry (label, topic, link, the
// picture's key and the words to match) and each picture once; the index page loads it on the first keystroke.
export const SEARCH_SCRIPT=`<script>(function(){var input=document.getElementById('wiki-search'),box=document.getElementById('wiki-results');if(!input||!box)return;var loading=null;
function load(){return loading||(loading=fetch('/wiki/search.json').then(function(r){return r.json();}));}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function show(){var q=input.value.trim().toLowerCase();box.hidden=!q;if(!q)return;load().then(function(d){if(input.value.trim().toLowerCase()!==q)return;var words=q.split(/\\s+/),hits=d.items.filter(function(e){return words.every(function(w){return e[4].indexOf(w)>=0;});}).slice(0,12);
box.innerHTML=hits.length?'<ul>'+hits.map(function(e){return '<li><a href="'+esc(e[2])+'">'+(d.arts[e[3]]||'')+'<strong>'+esc(e[0])+'</strong><span>'+esc(e[1])+'</span></a></li>';}).join('')+'</ul>':'<p>Nothing found for \u201c'+esc(input.value.trim())+'\u201d. Try a crop, a building or a word like \u201cdiamonds\u201d.</p>';}).catch(function(){box.innerHTML='<p>Search is not available right now.</p>';});}
input.addEventListener('input',show);input.addEventListener('focus',load,{once:true});
document.querySelectorAll('[data-wiki-query]').forEach(function(b){b.addEventListener('click',function(){input.value=b.getAttribute('data-wiki-query');show();input.focus();});});})();</script>`;
// A topic page: a link to a building (a search hit, the jump bar) opens its closed row; the jump bar fades at the right edge while
// there is more to scroll to. Since Oct 2026, as How to play does (public/wiki-ui.js): a link to a spot lands on it (a crop's or a level's
// row is a card on a phone) and lights it up for a moment, and every heading has Copy link with the spot's canonical address
// (public/wiki-link.js), saying "Copied." itself. A broken address (#%E0) is no spot, and the rest of the page still works (Oct 2026 review).
export const TOPIC_SCRIPT=`<script>(function(){function find(id){try{return document.getElementById(id)||null;}catch(e){return null;}}
function flash(el){var mark=el.tagName==='DETAILS'?el.querySelector('summary'):el.tagName==='SECTION'?el.querySelector('h3'):el;if(!mark)return;mark.classList.remove('wiki-flash');void mark.offsetWidth;mark.classList.add('wiki-flash');setTimeout(function(){mark.classList.remove('wiki-flash');},1900);}
function open(){var id='';try{id=decodeURIComponent(location.hash.slice(1));}catch(e){}var el=id&&find(id),row=el&&el.closest('details');if(row&&!row.open){row.open=true;}if(!el)return;if(!el.getClientRects().length){var cards=document.querySelectorAll('[data-wiki-row]');for(var i=0;i<cards.length;i++)if(cards[i].getAttribute('data-wiki-row')===id)el=cards[i];}el.scrollIntoView({block:/^(TR|LI)$/.test(el.tagName)?'center':'start'});flash(el);}
var page=document.querySelector('[data-wiki-page]');if(page){var topic=page.getAttribute('data-wiki-page');document.querySelectorAll('.wiki-article .wiki-section[id]>h3,.wiki-article .wiki-section[id]>summary>h3').forEach(function(h){var b=document.createElement('button');b.type='button';b.className='wiki-copy';b.title='Copy link';b.setAttribute('aria-label','Copy link');b.setAttribute('data-wiki-copy','${WIKI_SITE}/wiki/'+topic+'#'+h.closest('.wiki-section').id);b.innerHTML='${WIKI_COPY_ICON}<span class="wiki-copied" aria-live="polite"></span>';h.appendChild(b);});
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.wiki-copy-field')){e.preventDefault();return;}var b=e.target.closest&&e.target.closest('[data-wiki-copy]');if(!b)return;e.preventDefault();e.stopPropagation();var url=b.getAttribute('data-wiki-copy'),say=b.querySelector('.wiki-copied');function done(){say.textContent='Copied.';b.classList.add('is-copied');clearTimeout(b.wikiTimer);b.wikiTimer=setTimeout(function(){say.textContent='';b.classList.remove('is-copied');},1800);}
function byHand(){var f=document.createElement('textarea');f.value=url;f.setAttribute('readonly','');f.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';document.body.appendChild(f);f.select();var ok=false;try{ok=document.execCommand('copy');}catch(x){}f.remove();if(ok){done();return;}if(b.nextElementSibling&&b.nextElementSibling.classList.contains('wiki-copy-field')){b.nextElementSibling.select();return;}var i=document.createElement('input');i.className='wiki-copy-field';i.readOnly=true;i.value=url;b.after(i);i.select();}
if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(url).then(done,byHand);else byHand();},true);}
open();addEventListener('hashchange',open);var bar=document.querySelector('.wiki-jump');if(!bar)return;var wrap=bar.parentElement;function fade(){wrap.classList.toggle('is-scrollable',bar.scrollWidth>bar.clientWidth+2);wrap.classList.toggle('at-end',bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-4);}
fade();bar.addEventListener('scroll',fade,{passive:true});addEventListener('resize',fade);})();</script>`;
function page({path,title,heading,description,body,data=null}){
 body=namePictures(body);
 return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="theme-color" content="#214d36">
<title>${esc(title)}</title><meta name="description" content="${esc(description)}">
<meta property="og:type" content="article"><meta property="og:site_name" content="Harvest Tycoon"><meta property="og:url" content="${SITE}${path}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:image" content="${SITE}/assets/og-image-farm.jpg"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="The Harvest Tycoon logo over the farm at dusk: fields, a red barn, a windmill and a tractor"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${SITE}/assets/og-image-farm.jpg">
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48"><link rel="icon" type="image/png" sizes="96x96" href="/assets/favicon-96.png"><link rel="canonical" href="${SITE}${path}">${data?ldScript(data):''}<link rel="manifest" href="/manifest.webmanifest"><script src="/android-app.js"></script><link rel="stylesheet" href="/legal.css"><link rel="stylesheet" href="/wiki.css"></head>
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
 <span class="play-badge"><a class="app-store-badge" href="/app" data-app-store-link><img src="/assets/badges/app-store-en.webp" alt="Download on the App Store" width="120" height="40" loading="lazy" decoding="async"></a><a href="https://play.google.com/store/apps/details?id=com.harvesttycoon.app&amp;referrer=utm_source%3Dwebsite%26utm_medium%3Dfooter" target="_blank" rel="noopener"><img src="/assets/badges/google-play-en.webp" alt="Get it on Google Play" width="135" height="40" loading="lazy" decoding="async"></a></span>
 <span>© 2026 Harvest Tycoon</span>
 <a href="/">Play Harvest Tycoon</a>
 <a href="/wiki">Game wiki</a>
 <a href="/privacy">Privacy Policy</a>
 <a href="/partners">Partner programme</a>
 <a class="footer-social" href="https://www.facebook.com/harvesttycoon/" target="_blank" rel="noopener" aria-label="Harvest Tycoon on Facebook" title="Harvest Tycoon on Facebook"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M9.1 23.7v-8H6.6V12h2.5v-1.6c0-4.1 1.9-6 5.9-6 .8 0 2.1.2 2.6.3v3.3l-1.4-.1c-2 0-2.7.7-2.7 2.7V12h3.9l-.7 3.7h-3.2V24C19.4 23.2 24 18.2 24 12 24 5.4 18.6 0 12 0S0 5.4 0 12c0 5.6 3.9 10.4 9.1 11.7Z"/></svg></a><a class="footer-social" href="https://www.tiktok.com/@harvesttycoon" target="_blank" rel="noopener" aria-label="Harvest Tycoon on TikTok" title="Harvest Tycoon on TikTok"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a><a class="footer-social" href="https://www.instagram.com/harvesttycoon/" target="_blank" rel="noopener" aria-label="Harvest Tycoon on Instagram" title="Harvest Tycoon on Instagram"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M7.4 1.2h9.2a6.2 6.2 0 0 1 6.2 6.2v9.2a6.2 6.2 0 0 1-6.2 6.2H7.4a6.2 6.2 0 0 1-6.2-6.2V7.4a6.2 6.2 0 0 1 6.2-6.2Zm0 2.4a3.8 3.8 0 0 0-3.8 3.8v9.2a3.8 3.8 0 0 0 3.8 3.8h9.2a3.8 3.8 0 0 0 3.8-3.8V7.4a3.8 3.8 0 0 0-3.8-3.8H7.4ZM12 6.8a5.2 5.2 0 1 1 0 10.4 5.2 5.2 0 0 1 0-10.4Zm0 2.4a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm5.65-4.3a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9Z"/></svg></a><a class="footer-social" href="https://www.youtube.com/@HarvestTycoon" target="_blank" rel="noopener" aria-label="Harvest Tycoon on YouTube" title="Harvest Tycoon on YouTube"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" fill-rule="evenodd" d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z"/></svg></a>
</footer>
${body.includes('data-wiki-install')?INSTALL_SCRIPT:''}${body.includes('id="wiki-search"')?SEARCH_SCRIPT:''}${body.includes('class="wiki-article"')?TOPIC_SCRIPT:''}</body></html>
`;
}

// /llms.txt (8 Oct 2026): the plain facts about the game for AI tools, and every page worth reading with one line on what is there.
// Made on every deploy from the game rules and the wiki topics, so it stays true; the same facts as About the game on /app. What
// is for sale comes from the shop's own catalogue (game/payments.js): the diamond packs, the Starter Pack, the special offer (from
// level 14 like the Starter Pack, supabase/special-offer.sql) and the season's pass while it is on sale.
const euro=cents=>`€${(cents/100).toFixed(2)}`;
export function priceLine(now=Date.now()){
 const packs=Object.values(PAYMENT_PACKS).filter(p=>!p.coins).sort((a,b)=>a.cents-b.cents),[low,high]=[packs[0],packs.at(-1)],starter=PAYMENT_PACKS.starter,n=v=>v.toLocaleString('en-GB');
 const offer=`now and then a special offer from level ${STARTER_LEVEL}, once per farmer (diamonds, coins or VIP worth ${euro(OFFER.valueCents)} for ${euro(OFFER.cents)})`;
 // The season's pass only while it is on sale (8 Oct 2026), as the wiki drops it once its season is over.
 const pass=passOnSale(now)?`; and seasonal passes such as the ${PASS.name} (${euro(PASS.cents)} from level ${PASS.level}, with extra rewards to collect in the game)`:'';
 return `free to play. Optional purchases: diamond packs from ${euro(low.cents)} (${n(low.diamonds)} diamonds) to ${euro(high.cents)} (${n(high.diamonds)} diamonds); a one-time Starter Pack for ${STARTER_WINDOW/864e5} days from level ${STARTER_LEVEL} (${n(starter.diamonds)} diamonds and ${n(starter.coins)} coins for ${euro(starter.cents)}); ${pass?offer:`and ${offer}`}${pass}. Diamonds buy VIP and boosts, and players also earn diamonds by playing.`;
}
export function llmsText(topics,{appStoreUrl=APP_STORE_URL}={}){
 const ios=appStoreUrl==null?null:appStoreAddress(appStoreUrl);
 const languages=LANGUAGES.filter(l=>l.ready);
 return `# Harvest Tycoon

> Harvest Tycoon is a free 3D farming game. Play it in your web browser at ${SITE}/ with no download, or with the free Android app on Google Play${ios?` or the free iPhone app on the App Store`:''}. Made by Millstone in the Netherlands.

## Facts
- What you do: plant and harvest crops, bake and craft goods in your own buildings, sell them at the Market, fill orders, and grow a small farm into a big estate.
- Platforms: any modern browser on a phone, tablet or computer (no download); Android app on Google Play: ${PLAY_URL}${ios?`; iPhone app on the App Store: ${ios}`:'; an iPhone app is coming soon'}. One account: the same farm on every device.
- Price: ${priceLine()}
- Playing together: from level ${FAMILY_MIN_LEVEL}, a Farm Family of up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers, with a Family Chest and a family tournament every week; chat with farmers from all over the world; events every six hours.
- Languages (${languages.length}): ${languages.map(l=>`${l.name} (${l.code})`).join(', ')}.
- Age: for players aged 16 and over.
- Opened: 16 September 2026.
- Maker: Millstone, the Netherlands. Contact: info@harvesttycoon.com or ${SITE}/support

## Pages
- [Play Harvest Tycoon](${SITE}/): sign up or sign in and play in the browser
- [Get the app](${SITE}/app): the Android app, the iPhone, and playing on a computer
- [Help and support](${SITE}/support): questions and answers, and a form to contact us
- [Game wiki](${SITE}/wiki): every crop, building and recipe, the Market, families, events and more

## Game wiki
${topics.map(t=>`- [${t.title}](${SITE}/wiki/${t.id}): ${t.blurb}`).join('\n')}

## Other
- [Privacy Policy](${SITE}/privacy)
- [Partner programme](${SITE}/partners)
- [Harvest Tycoon on Google Play](${PLAY_URL})
`;
}

// The search data: [label, topic title, link, picture key, words] per entry (the first of each label in a topic), pictures once, each
// named like the pages' pictures (namePictures, 9 Oct 2026).
export function searchData(index,art){
 const seen=new Set(),arts={},items=[];
 for(const e of index){const key=`${e.topic}:${e.label}`;if(seen.has(key))continue;seen.add(key);arts[e.art]??=namePictures(art(e.art),e.label);items.push([e.label,e.topicTitle,`/wiki/${e.topic}${e.anchor?`#${e.anchor}`:''}`,e.art,e.text]);}
 return {arts,items};
}

export async function buildWiki(outDir,{contentUrl=new URL('../public/wiki-content.js',import.meta.url)}={}){
 const {WIKI_TOPICS,wikiArticle,wikiNext,wikiJump,wikiGroups,wikiSearchBox,wikiQuick,wikiSearchIndex}=await import(contentUrl.href);
 const {art}=await import(new URL('visual-icons.js',contentUrl).href);
 mkdirSync(join(outDir,'wiki'),{recursive:true});
 writeFileSync(join(outDir,'wiki','index.html'),page({path:'/wiki',title:'Harvest Tycoon wiki: crops, buildings, recipes and tips',heading:'The farm wiki',description:'Everything about Harvest Tycoon: every crop, building and recipe, the market, Farm family, events, diamonds and more.',
  body:` ${wikiSearchBox()}${wikiQuick()}<div id="wiki-results" class="wiki-results" hidden></div>${wikiGroups()}`}));
 writeFileSync(join(outDir,'wiki','search.json'),JSON.stringify(searchData(wikiSearchIndex(),art)));
 for(const topic of WIKI_TOPICS){
  const article=wikiArticle(topic.id);
  const body=` <nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="/wiki">Wiki</a> › ${esc(article.title)}</nav>
 ${wikiJump(article)}
 <article class="wiki-article" data-wiki-page="${topic.id}">${article.html}</article>
 <section class="wiki-related"><h3>Read next</h3><div class="wiki-next-list">${article.related.map(t=>wikiNext(t)).join('')}</div></section>`;
  // The breadcrumb as search engines read it (8 Oct 2026): the same two steps as the one on the page.
  const data=[breadcrumbs([['Wiki',`${SITE}/wiki`],[article.title,`${SITE}/wiki/${topic.id}`]])];
  writeFileSync(join(outDir,'wiki',`${topic.id}.html`),page({path:`/wiki/${topic.id}`,title:`${article.title} — Harvest Tycoon wiki`,heading:article.title,description:article.blurb,body,data}));
 }
 writeFileSync(join(outDir,'llms.txt'),llmsText(WIKI_TOPICS));
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
