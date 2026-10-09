import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {LANGUAGES,languagePath} from '../public/languages.js';
import {appPath} from '../public/game-links.js';
import {buildLanguagePages,buildSupportPages,buildAppPages,supportPath,READY} from '../scripts/build-languages.mjs';
import {applyAppStore} from '../scripts/app-store-links.mjs';
import {applyStructuredData,withGraph,ldScript,pageQuestions,PLAY_URL,ORG_ID,GAME_ID} from '../scripts/structured-data.mjs';
import {buildWiki,llmsText,priceLine} from '../scripts/build-wiki.mjs';
import {WIKI_TOPICS} from '../public/wiki-content.js';
import {FAMILY_CONFIG,FAMILY_MIN_LEVEL,DIAMOND_PACKS,STARTER_LEVEL} from '../game/farm-state.js';
import {PAYMENT_PACKS,STARTER_WINDOW,OFFER,PASS,passOnSale} from '../game/payments.js';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const SITE='https://www.harvesttycoon.com',APP='https://apps.apple.com/nl/app/harvest-tycoon/id6741234567',APP_LIVE='https://apps.apple.com/app/harvest-tycoon/id6741234567';
const blocks=html=>[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
const meta=(html,name)=>html.match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)">`))?.[1];
const unescape=text=>text.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');

// ---- The home page: the welcome in the page itself (8 Oct 2026) ----
const play=read('public/play.html');
const headScript=play.match(/<script>(\(function\(h\)\{try\{var q=location\.hash[\s\S]*?)<\/script>/)[1];
const endScript=play.match(/<script>(\(function\(h,b\)\{[\s\S]*?)<\/script>/)[1];
const SAFARI='Mozilla/5.0 (iPhone) Version/18.0 Mobile Safari/604.1',FB='Mozilla/5.0 (iPhone) [FBAN/FBIOS;FBAV/480.0]';
function boot({storage={},hash='',search='',blocked=false,ua=SAFARI}={}){
 const attrs={};const root={setAttribute:(k,v)=>attrs[k]=v};
 vm.runInNewContext(headScript,{location:{hash,search},navigator:{userAgent:ua},document:{documentElement:root},localStorage:{getItem:k=>{if(blocked)throw new Error('blocked');return storage[k]??null;}}});
 return attrs['data-boot']??null;
}
test('the home page ships its welcome in the page: crawlers read it, every visitor with JavaScript keeps the loading screen until the end of the page',()=>{
 assert.match(play,/<main id="welcome">/);assert.doesNotMatch(play,/<main id="welcome" hidden>/);
 assert.match(play,/<section id="loading-screen" class="loading-screen farm-loading" aria-labelledby="loading-copy" hidden>/);
 // Before the first stylesheet, so the first frame is already the right one.
 assert.ok(play.indexOf(headScript)<play.indexOf('<link rel="stylesheet" href="/welcome.css">'));
 assert.ok(play.includes('<style>html[data-boot] #welcome{display:none!important}html[data-boot] #loading-screen{display:grid!important}</style><link rel="stylesheet" href="/welcome.css">'));
 // A first visit (also from an ad, the itch.io frame, the installed app's start, a Settings link): the loading screen until the end of the page shows the welcome, as before.
 for(const search of ['','?src=itch','?source=pwa','?ref=abc','?open=settings&part=sound','?utm_source=tiktok&utm_medium=paid'])assert.equal(boot({search}),'first',search);
 // Signed in, here before, or back from a sign-in or email link, or storage that cannot be read: the loading screen, as before.
 assert.equal(boot({storage:{'harvest-tycoon:auth':'{}'}}),'checking');assert.equal(boot({storage:{'harvest-tycoon:returning':'1'}}),'checking');
 for(const [hash,search] of [['#access_token=x&refresh_token=y',''],['','?code=abc'],['#error=access_denied',''],['','?type=recovery']])assert.equal(boot({hash,search}),'checking',hash+search);
 assert.equal(boot({blocked:true}),'checking','blocked storage waits for the page, as before');
});
test('a first visit inside Facebook, Instagram or TikTok keeps the loading screen until the end of the page shows the browser step, as before',async()=>{
 const {GATE_APP,gateApp,ESCAPE_KEY}=await import('../src/browser-tip.js');
 assert.equal(boot({ua:FB}),'gate');assert.equal(boot({ua:FB,storage:{[ESCAPE_KEY]:'shown'}}),'gate');
 assert.equal(boot({ua:FB,storage:{[ESCAPE_KEY]:'stay'}}),'first','"Play here instead" was chosen: the welcome at the end of the page, no step');
 assert.equal(boot({ua:FB,storage:{'harvest-tycoon:returning':'1'}}),'checking','a farmer the device knows: the loading screen as before');
 assert.equal(boot({ua:FB,hash:'#access_token=x&type=recovery'}),'checking');assert.equal(boot({ua:FB,blocked:true}),'checking');
 // The same apps as src/browser-tip.js (and the page holds that list once: tests/auth-gate.test.mjs).
 assert.ok(headScript.includes(`if(${GATE_APP}.test(navigator.userAgent)&&localStorage.getItem('${ESCAPE_KEY}')!=='stay')h.setAttribute('data-boot','gate');`));
 for(const ua of [FB,SAFARI,'Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A; wv) AppleWebKit/537.36 Chrome/129.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/484.0.0.66.73;]',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) Mobile/15E148 Instagram 400.0.0.0','Mozilla/5.0 (iPhone) Barcelona 350.0',
  'Mozilla/5.0 (Linux; Android 14; wv) Chrome/129.0 Mobile Safari/537.36 trill_370504 BytedanceWebview/d8a21c6','Mozilla/5.0 (iPhone) musical_ly_37.0',
  'Mozilla/5.0 (Linux; Android 14) Chrome/129.0 Mobile Safari/537.36','Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) Chrome/129.0 Mobile Safari/537.36 HarvestTycoonApp/1.0 PlayBilling/1',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HarvestTycoonApp/1.0 AppStoreBilling/1'])
  assert.equal(boot({ua})==='gate',gateApp(ua),ua);
 // The step ships hidden, so a reader that skips the styles never reads it as the page's text; the global [hidden] rule beats the
 // card's [data-gate] rule, so whatever shows the step also takes its hidden away (here, and src/main.js).
 assert.match(play,/<div id="browser-gate" class="browser-gate" hidden>/);
 assert.match(read('public/welcome.css'),/\[hidden\]\{display:none!important\}/);
 const main=read('src/main.js');
 assert.ok(main.includes("card.toggleAttribute('data-gate',on);$('browser-gate').hidden=!on;if(!on)return;"));
 assert.ok(main.includes("function gateOff(){document.querySelector('.account-card')?.removeAttribute('data-gate');const step=$('browser-gate');if(step)step.hidden=true;}"));
 assert.doesNotMatch(main.replace("document.querySelector('.account-card')?.removeAttribute('data-gate');const step","").replace("card.toggleAttribute('data-gate',on);$('browser-gate')",""),/data-gate'/,'no other place turns the mark on or off');
});
test('the end of the page hands the welcome, the loading screen or the browser step to the elements, as the page did before',()=>{
 const run=({boot:mark=null,ua=SAFARI}={})=>{
  const attrs=mark?{'data-boot':mark}:{},nodes={welcome:{hidden:false},'loading-screen':{hidden:true},'browser-gate':{hidden:true}},card={attrs:{},setAttribute(k,v){this.attrs[k]=v;}},body={dataset:{phase:'checking'}};
  const root={getAttribute:k=>attrs[k]??null,hasAttribute:k=>k in attrs,removeAttribute:k=>delete attrs[k]};
  vm.runInNewContext(endScript,{document:{documentElement:root,body,getElementById:id=>nodes[id],querySelector:()=>card},navigator:{userAgent:ua},localStorage:{getItem:()=>null}});
  return {attrs,nodes,card,phase:body.dataset.phase};
 };
 const first=run();assert.equal(first.phase,'unauthenticated');assert.equal(first.nodes.welcome.hidden,false);assert.equal(first.nodes['loading-screen'].hidden,true);
 assert.equal('data-gate' in first.card.attrs,false);assert.equal(first.nodes['browser-gate'].hidden,true,'no step: it stays hidden');
 const marked=run({boot:'first'});assert.equal(marked.phase,'unauthenticated');assert.equal(marked.nodes.welcome.hidden,false);assert.equal(marked.nodes['loading-screen'].hidden,true);
 assert.equal(marked.nodes['browser-gate'].hidden,true);assert.equal('data-gate' in marked.card.attrs,false);assert.deepEqual(marked.attrs,{},'the mark is gone, so the welcome shows');
 const known=run({boot:'checking'});assert.equal(known.phase,'checking','src/main.js decides, as before');assert.equal(known.nodes.welcome.hidden,true);assert.equal(known.nodes['loading-screen'].hidden,false);
 assert.deepEqual(known.attrs,{},'the mark is gone: from here on the hidden attributes rule, as src/main.js sets them');assert.equal(known.nodes['browser-gate'].hidden,true);
 const gate=run({boot:'gate',ua:FB});assert.equal(gate.phase,'unauthenticated');assert.equal(gate.nodes.welcome.hidden,false);assert.equal(gate.nodes['loading-screen'].hidden,true);
 assert.equal('data-gate' in gate.card.attrs,true,'the in-app browser gate still shows');assert.equal(gate.nodes['browser-gate'].hidden,false,'and its hidden is taken away');assert.deepEqual(gate.attrs,{});
 // The end of the page only follows the head now: a browser it did not mark gets the welcome, whatever its user agent.
 assert.equal('data-gate' in run({ua:FB}).card.attrs,false);
 assert.match(read('src/main.js'),/\$\('loading-screen'\)\.hidden=value!=='checking';\}\$\('welcome'\)\.hidden=value==='checking'\|\|value==='authenticated';/,'the page keeps the same switch');
});
// A reader that skips hidden elements, scripts, styles and pictures (Readability, an AI crawler without a browser) reads the welcome
// and the sign-up card, never the browser step.
function visibleText(html){
 let out=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi,'');
 for(;;){const next=out.replace(/<(\w+)\b[^>]*\shidden(?:[\s=>][^>]*)?>(?:(?!<\1\b)[\s\S])*?<\/\1>/i,'');if(next===out)break;out=next;}
 return out.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
test('a reader without styles reads the welcome, not the in-app browser step',()=>{
 const text=visibleText(play);
 assert.match(text,/Grow your farm into an empire\./);assert.match(text,/Start your farm\./);
 for(const gate of ['You are inside','Open in browser','Play here instead','Open the game in'])assert.ok(!text.includes(gate),gate);
});
test('the home page gains nothing visible: no About block, no FAQ, no new footer text',()=>{
 for(const text of ['About the game','Questions','by Millstone','legal-languages','coming soon'])assert.ok(!play.includes(text),text);
 assert.match(play,/<div id="language-switch" class="language-switch" hidden><\/div>/,'the links are written into the hidden menu box by the build');
});

// ---- The build: structured data on every home, app and support page ----
function build(appStoreUrl=null){
 const out=mkdtempSync(join(tmpdir(),'seo-geo-'));
 writeFileSync(join(out,'sitemap.xml'),read('public/sitemap.xml'));
 const home=buildLanguagePages(out,play);writeFileSync(join(out,'index.html'),home);writeFileSync(join(out,'play.html'),home);
 buildSupportPages(out,read('public/support.html'));buildAppPages(out,read('public/app.html'));
 applyAppStore(out,appStoreUrl);applyStructuredData(out,{appStoreUrl});
 const page=(code,file)=>readFileSync(join(out,code==='en'?'':code,file),'utf8');
 return {out,page};
}
test('every home page: one graph with the website, Millstone and the game in that page\'s language; valid JSON; no ratings',()=>{
 const {out,page}=build();
 try{
  for(const code of READY){
   const html=page(code,'index.html'),found=blocks(html);
   assert.equal(found.length,1,`${code}: one block`);
   const graph=found[0]['@graph'],byType=Object.fromEntries(graph.map(n=>[n['@type'],n]));
   assert.equal(found[0]['@context'],'https://schema.org');assert.deepEqual(graph.map(n=>n['@type']),['WebSite','Organization','VideoGame']);
   assert.deepEqual(byType.WebSite,{'@type':'WebSite','@id':`${SITE}/#website`,name:'Harvest Tycoon',url:`${SITE}/`,inLanguage:READY,publisher:{'@id':ORG_ID}});
   assert.deepEqual(byType.Organization,{'@type':'Organization','@id':ORG_ID,name:'Millstone',url:`${SITE}/`,logo:`${SITE}/assets/pwa/icon-512.png`,email:'info@harvesttycoon.com',address:{'@type':'PostalAddress',addressCountry:'NL'}});
   const game=byType.VideoGame;
   assert.equal(game['@id'],GAME_ID);assert.equal(game.name,'Harvest Tycoon');assert.equal(game.url,`${SITE}${languagePath(code)}`,'the page\'s own address');
   assert.equal(game.description,unescape(meta(html,'description')),`${code}: the page's own description`);
   assert.deepEqual(game.offers,{'@type':'Offer',price:'0',priceCurrency:'EUR'});assert.deepEqual(game.gamePlatform,['Web browser','Android']);
   assert.deepEqual(game.inLanguage,LANGUAGES.filter(l=>l.ready).map(l=>l.code));assert.equal(game.inLanguage.length,16);
   assert.deepEqual(game.sameAs,[PLAY_URL]);assert.equal(game.installUrl,PLAY_URL);assert.deepEqual(game.publisher,{'@id':ORG_ID});
   assert.equal(game.applicationCategory,'GameApplication');assert.equal(game.image,`${SITE}/assets/og-image-farm.jpg`);
   assert.doesNotMatch(html,/aggregateRating|"review"|ratingValue/);
  }
  assert.ok(existsSync(new URL('../public/assets/pwa/icon-512.png',import.meta.url)),'the logo the Organization names exists');
  assert.equal(readFileSync(join(out,'play.html'),'utf8'),readFileSync(join(out,'index.html'),'utf8'),'the sign-in return page is the same page');
  // The app pages: Millstone and the game, the game at its home page in that language.
  for(const code of READY){
   const html=page(code,'app.html'),[data]=blocks(html);
   assert.deepEqual(data['@graph'].map(n=>n['@type']),['Organization','VideoGame'],code);
   assert.equal(data['@graph'][1].url,`${SITE}${languagePath(code)}`);assert.equal(data['@graph'][1].description,unescape(meta(page(code,'index.html'),'description')));
  }
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('the support pages: FAQPage from the Questions as they show, in that language; the App Store wording that is true now',()=>{
 for(const live of [false,true]){
  const {out,page}=build(live?APP:null);
  try{
   for(const code of READY){
    const html=page(code,'support.html'),[data]=blocks(html),faq=data['@graph'][0];
    assert.equal(faq['@type'],'FAQPage');assert.equal(faq.url,`${SITE}${supportPath(code)}`);assert.equal(faq.inLanguage,code);
    const shown=[...html.match(/<div class="support-faq">([\s\S]*?)<\/div>/)[1].matchAll(/<h3(?: class="support-stores")?>([^<]+)<\/h3>\s*<p(?: class="support-stores")?>([^<]+)<\/p>/g)].map(m=>[unescape(m[1]),unescape(m[2])]);
    assert.ok(shown.length>=7,code);
    assert.deepEqual(faq.mainEntity.map(q=>[q.name,q.acceptedAnswer.text]),shown,`${code}: word for word`);
    assert.deepEqual(pageQuestions(html,{live}),shown);
    assert.doesNotMatch(html,/app-store:/,'no wording markers left');
   }
   const en=page('en','support.html');
   assert.equal(/An app for iPhone is coming soon\./.test(en),!live);assert.equal(/for iPhone on the App Store\./.test(en),live);
   const app=page('en','app.html');
   assert.equal(app.includes('<p class="app-soon">The iPhone app is coming soon.</p>'),!live);assert.equal(app.includes('Get the free app on the App Store.'),live);
   const game=blocks(page('en','index.html'))[0]['@graph'][2];
   assert.deepEqual(game.gamePlatform,live?['Web browser','Android','iOS']:['Web browser','Android']);assert.deepEqual(game.sameAs,live?[PLAY_URL,APP_LIVE]:[PLAY_URL]);
   assert.equal(game.operatingSystem,live?'Web browser, Android, iOS':'Web browser, Android');
  }finally{rmSync(out,{recursive:true,force:true});}
 }
});
test('the JSON-LD helper: one block per page, the same page when run twice, no way to close the script from a text',()=>{
 const html='<html><head><script type="application/ld+json">{"a":1}</script><script type="application/ld+json">{"b":2}</script></head></html>';
 const once=withGraph(html,[{'@type':'Thing',name:'</script><b>x'}]);
 assert.equal(blocks(once).length,1);assert.equal(blocks(once)[0]['@graph'][0].name,'</script><b>x');assert.doesNotMatch(ldScript([{name:'</script>'}]),/<\/script>.*<\/script>/);
 assert.equal(withGraph(once,[{'@type':'Thing',name:'</script><b>x'}]),once);
 assert.match(withGraph('<head></head>',[{'@type':'Thing'}]),/^<head><script type="application\/ld\+json">.*<\/script><\/head>$/);
 assert.match(read('scripts/build-static.mjs'),/applyAppStore\('dist-static',APP_STORE_URL\);[\s\S]*applyStructuredData\('dist-static',\{appStoreUrl:APP_STORE_URL\}\)/,'after the App Store switch');
});

// ---- The app and support pages: About the game, the share card, the languages ----
test('About the game on /app: the facts as the game has them, nothing on the home page',()=>{
 const app=read('public/app.html'),about=app.match(/<section class="app-about"[\s\S]*?<\/section>/)[0];
 assert.match(about,/<h2 id="about-title">About the game<\/h2>/);
 assert.ok(about.includes(`a Farm Family of up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers`));assert.ok(about.includes(`in ${READY.length} languages`));
 assert.ok(about.includes('free 3D farming game')&&about.includes('Made by Millstone in the Netherlands.')&&about.includes('Google Play'));
 assert.match(about,/<!--app-store:soon--><li>An app for iPhone is coming soon\.<\/li><!--\/app-store:soon--><!--app-store:live--><li>The free app for iPhone is on the App Store\.<\/li><!--\/app-store:live-->/);
 for(const page of ['public/app.html','public/support.html']){
  const html=read(page);
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g,''),/ · /,`${page}: no middle dots`);
  assert.match(html,/<span>© 2026 Harvest Tycoon by Millstone<\/span>/,page);
  for(const name of ['og:type','og:site_name','og:locale','og:url','og:title','og:description','og:image','og:image:alt'])assert.ok(meta(html,name),`${page} ${name}`);
  for(const name of ['twitter:card','twitter:title','twitter:description','twitter:image'])assert.ok(meta(html,name),`${page} ${name}`);
  assert.equal(meta(html,'og:url'),html.match(/<link rel="canonical" href="([^"]+)">/)[1]);
  assert.equal(meta(html,'og:description'),meta(html,'description'));assert.equal(meta(html,'og:title'),html.match(/<title>([^<]+)<\/title>/)[1]);
 }
});
// Inside our apps (html[data-app]: the Android app, the iPhone app also data-app-os=ios) /app stays as it was: only "You are already in
// the app"; About the game talks about the stores and buying, so it steps aside there like the store options.
test('inside our apps /app shows only that the farmer is in the app: no About the game, no stores',()=>{
 const css=read('public/app-page.css'),app=read('public/app.html');
 assert.match(css,/\nhtml\[data-app\] \.app-in-app\{display:block\}\nhtml\[data-app\] \.app-options\{display:none\}\nhtml\[data-app\] \.app-about\{display:none\}\n/);
 assert.doesNotMatch(css,/(^|\n)\.app-about\{[^}]*display:none/,'on the website it shows');
 // The card holds the in-app line, the ways in and About the game, nothing else, so in the apps the line is all there is.
 const card=app.match(/<main class="legal-card app-card">([\s\S]*?)<\/main>/)[1];
 const rest=card.replace(/<!--[\s\S]*?-->/g,'').replace(/<div class="app-in-app" role="status">[\s\S]*?<\/div>/,'').replace(/<div class="app-options">[\s\S]*?<\/section>\n <\/div>/,'').replace(/<section class="app-about"[\s\S]*?<\/section>/,'');
 assert.equal(rest.trim(),'');
});
test('the sitemap names /partners, and /privacy with the date the page says',()=>{
 const xml=read('public/sitemap.xml');
 assert.match(xml,/<url><loc>https:\/\/www\.harvesttycoon\.com\/partners<\/loc><lastmod>\d{4}-\d\d-\d\d<\/lastmod><\/url>/);
 assert.match(xml,/<url><loc>https:\/\/www\.harvesttycoon\.com\/privacy<\/loc><lastmod>2026-10-09<\/lastmod><\/url>/);
 assert.match(read('public/privacy.html'),/Last updated: 9 October 2026/);
});

// ---- The wiki: breadcrumbs, the share card's address, /llms.txt ----
test('the wiki: a breadcrumb for search engines on every topic page, og:url and og:site_name, and /llms.txt with every topic',async()=>{
 const out=mkdtempSync(join(tmpdir(),'seo-wiki-'));
 try{
  await buildWiki(out);
  for(const topic of WIKI_TOPICS){
   const html=readFileSync(join(out,'wiki',`${topic.id}.html`),'utf8'),[data]=blocks(html),crumbs=data['@graph'][0];
   assert.equal(crumbs['@type'],'BreadcrumbList');
   const title=html.match(/<nav class="wiki-crumbs" aria-label="Breadcrumb"><a href="\/wiki">Wiki<\/a> › ([^<]+)<\/nav>/)[1];
   assert.deepEqual(crumbs.itemListElement,[{'@type':'ListItem',position:1,name:'Wiki',item:`${SITE}/wiki`},{'@type':'ListItem',position:2,name:unescape(title),item:`${SITE}/wiki/${topic.id}`}]);
   assert.equal(meta(html,'og:url'),`${SITE}/wiki/${topic.id}`);assert.equal(meta(html,'og:site_name'),'Harvest Tycoon');
  }
  const index=readFileSync(join(out,'wiki','index.html'),'utf8');assert.equal(meta(index,'og:url'),`${SITE}/wiki`);assert.equal(blocks(index).length,0);
  const llms=readFileSync(join(out,'llms.txt'),'utf8');
  assert.equal(llms,llmsText(WIKI_TOPICS));assert.match(llms,/^# Harvest Tycoon\n\n> Harvest Tycoon is a free 3D farming game\./);
  for(const topic of WIKI_TOPICS)assert.ok(llms.includes(`- [${topic.title}](${SITE}/wiki/${topic.id}): ${topic.blurb}`),topic.id);
  for(const path of ['/','/app','/support','/wiki','/privacy','/partners'])assert.ok(llms.includes(`](${SITE}${path})`),path);
  assert.ok(llms.includes(`a Farm Family of up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers`)&&llms.includes(`from level ${FAMILY_MIN_LEVEL}`));
  // What is for sale, from the shop's catalogue: the diamond packs (the same as the shop shows), the Starter Pack, the special offer, the pass.
  const price=llms.match(/^- Price: (.*)$/m)[1];
  assert.ok(price.includes(`diamond packs from ${DIAMOND_PACKS[0].price} (${DIAMOND_PACKS[0].amount} diamonds) to ${DIAMOND_PACKS.at(-1).price} (${DIAMOND_PACKS.at(-1).amount.toLocaleString('en-GB')} diamonds)`));
  assert.deepEqual(Object.entries(PAYMENT_PACKS).filter(([,p])=>!p.coins).map(([,p])=>[p.diamonds,`€${(p.cents/100).toFixed(2)}`]),DIAMOND_PACKS.map(p=>[p.amount,p.price]),'the shop and the catalogue agree');
  assert.ok(price.includes(`a one-time Starter Pack for 7 days from level ${STARTER_LEVEL} (${PAYMENT_PACKS.starter.diamonds} diamonds and ${PAYMENT_PACKS.starter.coins.toLocaleString('en-GB')} coins for €2.99)`));
  assert.equal(PAYMENT_PACKS.starter.cents,299);assert.equal(STARTER_WINDOW,7*864e5);
  assert.ok(price.includes('a special offer from level 14, once per farmer (diamonds, coins or VIP worth €49.99 for €4.99)'));assert.equal(OFFER.cents,499);assert.equal(OFFER.valueCents,4999);
  assert.match(read('supabase/special-offer.sql'),/min_level integer not null default 14 check \(min_level between 14 and 200\)/,'the special offer opens at level 14 at the earliest');
  if(passOnSale())assert.ok(price.includes(`seasonal passes such as the ${PASS.name} (€${(PASS.cents/100).toFixed(2)} from level ${PASS.level},`));
  // The season's pass only while it is on sale, as the wiki drops it once its season is over.
  assert.ok(priceLine(PASS.endsAt-1).includes(`such as the ${PASS.name} (€4.99 from level ${PASS.level},`));assert.ok(!priceLine(PASS.endsAt).includes(PASS.name));
  assert.ok(priceLine(PASS.endsAt).includes('; and now and then a special offer from level 14'));
  assert.ok(price.startsWith('free to play.')&&price.endsWith('Diamonds buy VIP and boosts, and players also earn diamonds by playing.'));
  assert.equal(price,priceLine());assert.ok(llms.includes(`Languages (${READY.length})`));
  assert.match(llms,/an iPhone app is coming soon/);assert.doesNotMatch(llms,/ · |apps\.apple\.com/);
  const live=llmsText(WIKI_TOPICS,{appStoreUrl:APP});assert.ok(live.includes(`iPhone app on the App Store: ${APP_LIVE}`));assert.doesNotMatch(live,/coming soon/);
 }finally{rmSync(out,{recursive:true,force:true});}
});
test('the app and support pages link every language\'s home page in their footer; the language list has no middle dots',()=>{
 const out=mkdtempSync(join(tmpdir(),'seo-links-'));
 try{
  buildAppPages(out,read('public/app.html'));buildSupportPages(out,read('public/support.html'));
  for(const code of READY)for(const file of [`${code==='en'?'':`${code}/`}app.html`,`${code==='en'?'':`${code}/`}support.html`]){
   const html=readFileSync(join(out,file),'utf8'),nav=html.match(/<nav class="legal-languages" aria-label="[^"]+">(.*?)<\/nav>\n<\/footer>/)[1];
   assert.deepEqual([...nav.matchAll(/<a href="([^"]+)" hreflang="([a-z]{2})" lang="([a-z]{2})">([^<]+)<\/a>/g)].map(m=>[m[1],m[2],m[3],m[4]]),LANGUAGES.filter(l=>l.ready).map(l=>[languagePath(l.code),l.code,l.code,l.name]),file);
   assert.doesNotMatch(nav,/·/);
  }
  assert.equal(appPath('es'),'/es/app');
 }finally{rmSync(out,{recursive:true,force:true});}
});
