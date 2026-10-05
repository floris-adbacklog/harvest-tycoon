import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CROPS,RECIPES,BUILDINGS,worldTwoBuilding,worldTwoItem} from '../public/farm-state.js';
// World II's recipes (the village's places, and the farm's recipes for or from it) are in The Village, not in Buildings and goods.
const worldTwo=r=>worldTwoBuilding(r.building)||Object.keys(r.output).some(worldTwoItem);
const FARM_RECIPES=Object.values(RECIPES).filter(r=>!worldTwo(r)).length;
import {WIKI_TOPICS,wikiArticle,wikiSearch,wikiTime} from '../public/wiki-content.js';
import {buildWiki} from '../scripts/build-wiki.mjs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
// The Farmhouse and the Family Hall rows (Oct 2026) make nothing: the recipe counts leave them out.
const recipesOnly=html=>html.replace(/<details class="wiki-section wiki-building" id="building-(?:farmhouse|familyhall)">[^]*?<\/details>/g,'');

test('every topic renders from the game rules without gaps, old drawn icons or broken links',()=>{
 assert.equal(WIKI_TOPICS.length,14);
 const ids=new Set(WIKI_TOPICS.map(t=>t.id));
 for(const t of WIKI_TOPICS){
  const a=wikiArticle(t.id);
  assert.doesNotMatch(a.html,/undefined|NaN|\[object|\.svg/,t.id);
  for(const [,id] of a.html.matchAll(/data-wiki-topic="([^"]+)"/g))assert.ok(ids.has(id),`${t.id} links to ${id}`);
  assert.ok(a.related.length&&a.related.every(Boolean),t.id);
 }
});

test('the tables list every crop and every recipe',()=>{
 const crops=wikiArticle('crops').html,buildings=recipesOnly(wikiArticle('buildings').html);
 for(const c of Object.values(CROPS))assert.ok(crops.includes(c.name),c.name);
 const rows=(buildings.match(/<tr/g)??[]).length,tables=(buildings.match(/<table/g)??[]).length;
 assert.equal(rows-tables,FARM_RECIPES);
 assert.equal(wikiTime(120000),'2 min');assert.equal(wikiTime(5400000),'1 h 30 min');assert.equal(wikiTime(86400000),'1 day');assert.equal(wikiTime(3*86400000),'3 days');
});

test('in the game what is above your level says from which level; the website just shows the level',()=>{
 const game=wikiArticle('crops',{level:20}).html,site=wikiArticle('crops').html;
 assert.match(game,/From level 23/);assert.match(game,/class="is-locked"/);
 assert.doesNotMatch(site,/From level|is-locked/);
});

test('search finds topics, crops, buildings and goods',()=>{
 assert.ok(wikiSearch('corn').some(h=>h.topic==='crops'));
 assert.ok(wikiSearch('cheese').some(h=>h.topic==='buildings'&&h.anchor));
 assert.ok(wikiSearch('tractor').some(h=>h.topic==='helpers'));
 assert.deepEqual(wikiSearch('  '),[]);
});

test('How to play opens the wiki',()=>{
 const html=read('public/farm.html'),game=read('public/game.js');
 assert.match(html,/<h2 id="help-title">How to play<\/h2>/);assert.match(html,/<div id="help-content"><\/div>/);
 assert.match(game,/renderWiki\(state\);openDialog\('help-dialog'\)/);
 assert.ok(html.indexOf('/wiki.css')>0&&html.indexOf('/wiki.css')<html.indexOf('/buttons.css'));
});

test('the website gets a page per topic, in the sitemap, linked from the footer',async()=>{
 const out=mkdtempSync(join(tmpdir(),'wiki-'));
 writeFileSync(join(out,'sitemap.xml'),'<?xml version="1.0"?>\n<urlset>\n</urlset>\n');
 assert.equal(await buildWiki(out),WIKI_TOPICS.length+1);await buildWiki(out);
 const pages=readdirSync(join(out,'wiki'));assert.equal(pages.filter(p=>p.endsWith('.html')).length,WIKI_TOPICS.length+1);assert.ok(pages.includes('search.json'));
 const crops=readFileSync(join(out,'wiki','crops.html'),'utf8');
 assert.match(crops,/<link rel="canonical" href="https:\/\/www\.harvesttycoon\.com\/wiki\/crops">/);
 // A shared wiki link shows the same share card as the home page (27 Sep 2026; it showed the square logo).
 assert.match(crops,/<meta property="og:image" content="https:\/\/www\.harvesttycoon\.com\/assets\/og-image-farm\.jpg">/);assert.match(crops,/<meta name="twitter:card" content="summary_large_image">/);
 assert.match(crops,/<a href="\/wiki">Game wiki<\/a>/);assert.match(crops,/href="\/wiki\/buildings" data-wiki-topic="buildings"/);
 const sitemap=readFileSync(join(out,'sitemap.xml'),'utf8');
 assert.equal((sitemap.match(/\/wiki<\/loc>/g)??[]).length,1,'added once');assert.match(sitemap,/\/wiki\/crops<\/loc>/);
 const vercel=JSON.parse(read('vercel.json'));
 assert.ok(vercel.rewrites.some(r=>r.source==='/wiki'&&r.destination==='/wiki/index.html'));
 assert.ok(vercel.rewrites.some(r=>r.source==='/wiki/:topic([a-z-]+)'&&r.destination==='/wiki/:topic.html'));
 assert.match(read('scripts/build-static.mjs'),/await buildWiki\('dist-static'\)/);
 for(const page of ['public/play.html','public/privacy.html','public/delete-account.html','public/404.html'])assert.match(read(page),/href="\/wiki">Game wiki</,page);
});

test('topic pages have a coloured header and a jump bar; phones get cards; the home page has three groups',async()=>{
 const {wikiHero,wikiJump,wikiGroups,WIKI_GROUPS}=await import('../public/wiki-content.js');
 const buildings=wikiArticle('buildings');
 assert.match(wikiHero(buildings),/class="wiki-hero" style="--tint:#/);
 const jump=wikiJump(buildings);assert.match(jump,/data-wiki-jump="sec-how-buildings-work"/);assert.match(jump,/data-wiki-jump="building-bakery"/);
 const crops=wikiArticle('crops').html;assert.match(crops,/<div class="wiki-dual"><div class="wiki-table-wrap">/);
 assert.equal((crops.match(/class="wiki-card(?:"| is-locked")/g)??[]).length,Object.keys(CROPS).length);
 assert.equal((recipesOnly(buildings.html).match(/class="wiki-card(?:"| is-locked")/g)??[]).length,FARM_RECIPES);
 assert.deepEqual(WIKI_GROUPS.flatMap(g=>g.ids).sort(),WIKI_TOPICS.map(t=>t.id).sort(),'every topic in exactly one group');
 assert.match(wikiGroups(),/class="wiki-tile is-featured" href="\/wiki\/getting-started"/);
 const css=read('public/wiki.css');
 assert.match(css,/\.wiki-dual \.wiki-table-wrap\{display:none\}\.wiki-dual \.wiki-cards\{display:grid\}/);
 assert.match(css,/\.wiki-jump-wrap\{position:sticky;top:var\(--wiki-sticky,0px\)/);
});

test('the wiki states the current rules: the Starter Pack window and the day-long beginner boost',async()=>{
 const {STARTER_WINDOW}=await import('../game/payments.js');const {STARTER_DAYS}=await import('../public/wiki-content.js');
 assert.equal(STARTER_DAYS*24*60*60*1000,STARTER_WINDOW);
 assert.match(wikiArticle('diamonds').html,/there is also a Starter Pack for 7 days\./);
 assert.match(wikiArticle('getting-started').html,/gets smaller evenly, hour by hour, and stops after your first 24 hours\./);
});

test('the wiki matches the rules it explains: family payouts, invites, events and building needs',()=>{
 // 5 Oct 2026: every full line pays a quarter when the week ends (an unfinished order paid nothing before).
 assert.match(wikiArticle('family').html,/Every full line pays a quarter of the coins, XP and diamonds to everyone who delivered at least 500 points’ worth, when the week ends; the whole order pays everything at once\./);
 assert.doesNotMatch(wikiArticle('family').html,/When the whole order is done|An order that is not finished pays nothing|Rewards come only when every line is full/);
 assert.match(wikiArticle('family').html,/The prize pool grows with every family taking part: 100 diamonds for one family, 200 for two, 300 for three and 50 more for every family after that \(up to 10,000\)\. The top ten families share it, from 25% for first place down to 4% for tenth\. A family's prize is shared by what each member delivered\./);
 assert.match(wikiArticle('diamonds').html,/When a friend you invite reaches level 10 within 30 days: 150 diamonds for you both\./);
 assert.match(wikiArticle('account').html,/When your friend reaches level 10 within 30 days, you both get 150 diamonds, for up to 10 friends\./);
 assert.doesNotMatch(wikiArticle('quests').html,/Invite a friend/,'inviting is not a level unlock');
 assert.match(wikiArticle('events').html,/Events open as soon as you reach level 15\./);assert.doesNotMatch(wikiArticle('events').html,/email/);
 assert.match(wikiArticle('account').html,/Confirm it once for 10 diamonds/);assert.match(wikiArticle('diamonds').html,/Confirm your email/);assert.doesNotMatch(wikiArticle('events').html,/48 hours/);
 assert.match(wikiArticle('events').html,/The first three in each league win 50, 30 and 20 diamonds, every other finisher 5\./);
 assert.match(wikiArticle('events').html,/<td>Valley Legends<\/td><td>90\+<\/td><td>17,600 coins · 50 diamonds<\/td>/,'the league table: first place in each league');
 assert.match(wikiArticle('diamonds').html,/at least 1 diamond with every level-up/);
 assert.match(wikiArticle('buildings').html,/Dairy Barn needs the Feed Mill first/);
});

// 5 Oct 2026: the Farm family article says what the order pays, what counts for the tournament and how long rewards wait; the loading
// tips name the order and the event bonus. Each claim is checked against the rules that pay it.
test('the Farm family article and tips say what the order, the tournament, the chest and the level really give',async()=>{
 const rules=await import('../public/farm-state.js'),{LOADING_TIPS}=await import('../public/loading-screen.js');
 const C=rules.FAMILY_CONFIG,html=wikiArticle('family').html;
 // "A coin for every point" and "its full value in coins" hold only while the order pays the Market's payout × ORDER_COIN_MULTIPLIER = 1.
 assert.equal(rules.MARKET_PAYOUT_MULTIPLIER*C.ORDER_COIN_MULTIPLIER,1);
 assert.match(html,/Every family gets the same goods that week; a bigger family gets bigger amounts/);assert.match(html,/You deliver to one family a week\./);
 assert.match(html,new RegExp(`Everyone who delivered at least ${C.MIN_CONTRIB_POINTS} points to the order shares in its rewards\\. The whole order pays a coin for every point \\(25% more than the Market pays at its normal price\\), 1 XP for every 100 points and diamonds`));
 assert.match(html,/<td>500<\/td><td>[^]*?500<\/td><td>5<\/td><td>[^]*?1<\/td>/);assert.match(html,/<td>20,000<\/td><td>[^]*?20,000<\/td><td>200<\/td><td>[^]*?3<\/td>/);
 // 5 Oct 2026: an unfinished order pays for its full lines, a quarter a line of four; the completion diamonds only for a whole order.
 assert.equal(rules.FAMILY_ORDER_LINES,4,'the article says a quarter a line');
 assert.match(html,new RegExp(`Every full line pays a quarter of these rewards\\. An order that is not finished pays for its full lines when the week ends, on Monday at 00:00 UTC: with 2 of its 4 lines full, half\\. The whole order pays everything as soon as its last line is full, plus ${C.ORDER_COMPLETION_DIAMONDS} diamonds for finishing it, shared by points\\. An order without a full line pays nothing`));
 // The table of one farmer's part (20,000 points) by full lines is familyOrderPay's own numbers.
 for(let n=1;n<=4;n++){const pay=rules.familyOrderPay(rules.FAMILY_ORDER_VALUE,1,n,4),row=n<4?`${n} of 4`:'All 4';
  assert.match(html,new RegExp(`<td>${row}</td><td>[^]*?${pay.coins.toLocaleString('en-US')}</td><td>${pay.xp}</td><td>[^]*?${pay.diamonds}${n<4?'':` \\+ a share of ${C.ORDER_COMPLETION_DIAMONDS}`}</td>`),row);}
 assert.deepEqual([1,2,3,4].map(n=>rules.familyOrderPay(20000,1,n,4).coins),[5000,10000,15000,20000]);
 assert.match(html,/Family Chest points do not count\./);assert.match(html,/Tournament goods/);assert.match(html,/They count for the tournament only: no coins, XP or diamonds\./);
 assert.match(html,/still in the family when the week ends/);assert.match(html,/everyone who delivered gets at least 1 diamond/);
 assert.match(html,/gets its rewards in full: nothing is split/);assert.match(html,new RegExp(`for ${C.REWARD_WEEKS} weeks after their week ends`));assert.doesNotMatch(html,/a few weeks/);
 assert.match(html,/not to the tournament or events\. The level belongs to the family/);
 assert.match(html,/The leader or a co-leader can invite farmers\./);assert.doesNotMatch(html,/The leader can invite/);
 assert.match(html,/<strong>Stats<\/strong>/);
 // A real solo order, delivered in full: the coins, XP and diamonds the article's table promises (10,000 points a diamond step).
 const now=Date.parse('2026-09-15T12:00:00Z'),week=rules.familyWeek(now);
 const farm=()=>{const s=rules.createFarm(now);s.xp=rules.xpForLevel(rules.FAMILY_MIN_LEVEL);return rules.normalizeFarm(s,now);};
 let c=rules.familyMutate(rules.emptyFamilyContext(),farm(),'alice',{type:'family_create',name:'Meadow Friends',emblem:'0'},now).context;
 const order=c.orders[0];
 for(const [item,count] of Object.entries(order.lines)){const s=farm();s.inventory[item]=count;c=rules.familyMutate(c,s,'alice',{type:'family_contribute',week,item,count},now).context;}
 const reward=c.rewards.find(r=>r.kind==='order'&&r.player_id==='alice'),points=order.value;
 assert.deepEqual([reward.coins,reward.xp,reward.diamonds],[points,Math.floor(points/100),Math.min(C.ORDER_DIAMOND_MAX,C.ORDER_DIAMOND_BASE+Math.floor(points/10000))+C.ORDER_COMPLETION_DIAMONDS]);
 assert.equal(reward.expires_at,rules.familyWeekStart(week+1)+C.REWARD_WEEKS*7*86400000,'rewards wait the weeks the article names');
 // In the top ten every member who delivered wins at least 1 diamond, whatever the number of families (a full family each).
 for(let families=1;families<=40;families++){
  const t=rules.emptyFamilyContext();
  for(let i=0;i<families;i++){t.families.push({id:`f${i}`,name:`F${i}`,emblem:'0',deleted_at:null});for(let j=0;j<C.MAX_MEMBERS;j++){const p=`p${i}-${j}`;t.members.push({id:p,player_id:p,family_id:`f${i}`,role:j?'member':'leader',joined_at:now,left_at:null});t.contributions.push({family_id:`f${i}`,week,player_id:p,points:1+i*j,order_points:0,extra_points:1+i*j,lines:{},last_at:now+i});}}
  for(const prize of rules.familyTournament(t,week).prizes.slice(0,C.TOURNAMENT_SHARES.length))assert.ok(Object.values(prize.shares).every(d=>d>=1),`${families} families, place ${prize.rank}`);
 }
 // The tips: a quarter above the Market, and the event bonus's own numbers.
 const tips=LOADING_TIPS.map(([,text])=>text).join('\n');
 assert.equal(C.ORDER_COIN_MULTIPLIER,1.25,'the tip says a quarter more than the Market');assert.match(tips,/The Family Order pays for every full line, finished or not\. A whole order pays a quarter more than the Market’s normal price/);
 assert.doesNotMatch(tips,/A finished Family Order pays/);
 assert.equal(rules.FAMILY_EVENT_BONUS.finishers,3,'the tip says two or more members besides you');
 assert.match(tips,new RegExp(`two or more members of your Farm family: you each get ${rules.FAMILY_EVENT_BONUS.coins} coins and ${rules.FAMILY_EVENT_BONUS.diamonds} diamonds extra`));
});

test('What opens when lists every level\'s features, buildings, crops and later recipes, so 27 to 62 is not empty',async()=>{
 const {wikiArticle}=await import('../public/wiki-content.js');
 const html=wikiArticle('quests').html;
 assert.match(html,/class="wiki-table wiki-opens-table"/);
 for(const name of ['Pig Farm','Bee Yard','Sheep Barn','Glasshouse','Weaving Shed','Factory','Goat Shed','Craft Workshop','Cider apples','Squash','Valley Market'])assert.ok(html.includes(`<span>${name}</span>`),name);
 assert.match(html,/<small>building<\/small>/);assert.match(html,/<small>crop<\/small>/);assert.match(html,/<small>recipe<\/small>/);
});

// 27 Sep 2026: the helpers, estate, market, levels and challenges got their numbers, all read from the game rules.
test('the wiki shows what the helpers, chapters, market, levels and challenges pay and cost, straight from the rules',async()=>{
 const rules=await import('../game/farm-state.js');
 const text=id=>JSON.stringify(wikiArticle(id));
 const helpers=text('helpers');
 assert.match(helpers,/Earns an hour/);assert.match(helpers,new RegExp(`${rules.stallLevel(8).rate}<`));assert.match(helpers,/Top level/);
 for(const c of Object.values(rules.CHORES))assert.ok(helpers.includes(c.name)&&helpers.includes(`${c.baseChance}% → ${c.maxChance}%`),c.name);
 assert.doesNotMatch(helpers,/tractor rests/,'the tractor has no rest since 4 Oct 2026');assert.match(helpers,/round bonus/);
 const estate=text('estate');for(const p of rules.PROJECTS)assert.ok(estate.includes(p.name.replace('’','\\u2019'))||estate.includes(p.name),p.name);
 assert.match(estate,new RegExp(`${rules.DEPOT_PREMIUM}× the goods`));assert.match(estate,/switching to another herd costs/);
 assert.match(text('market'),/How far prices move/);assert.match(text('market'),/160% of normal/);assert.doesNotMatch(text('market'),/Sunflower oil/);
 assert.match(text('quests'),/Level rewards/);assert.match(text('daily'),new RegExp(`bonus of .*${rules.DAILY_BONUS.coins}`));
});

test('The Village has its own topic: every World II recipe and the steps past level 10, hidden in the game below level 90',async()=>{
 const {wikiGroups,wikiArticle:article}=await import('../public/wiki-content.js');
 const {MASTER_UPGRADES}=await import('../public/farm-state.js');
 const village=article('village').html,buildings=article('buildings').html;
 for(const r of Object.values(RECIPES).filter(r=>worldTwo(r)&&r.building!=='factory'))assert.ok(village.includes(r.name)||Object.keys(r.output).every(k=>village.includes(k)),r.name);
 for(const key of Object.keys(BUILDINGS).filter(worldTwoBuilding)){assert.match(village,new RegExp(`id="building-${key}"`));assert.doesNotMatch(buildings,new RegExp(`id="building-${key}"`));}
 for(const u of MASTER_UPGRADES)assert.ok(village.includes(`Level ${u.level}`),u.level);
 assert.doesNotMatch(wikiGroups({level:50,href:id=>`#wiki-${id}`}),/data-wiki-topic="village"/,'a farmer below level 90 never sees it');
 assert.match(wikiGroups({level:90,href:id=>`#wiki-${id}`}),/data-wiki-topic="village"/);
 assert.match(wikiGroups(),/data-wiki-topic="village"/,'the website shows it');
 assert.doesNotMatch(article('buildings',{level:40}).html,/master tools/,'the Buildings topic mentions it only from level 90');
 assert.doesNotMatch(article('quests').html,/Lumber Camp|Packed lunch/,'the level list stays on the farm');
});

// 30 Sep 2026: an Install the app button under the steps, only where one tap installs it (in the game and on the website).
test('Play it as an app has an install button that shows only where the browser can install in one tap',async()=>{
 const content=read('public/wiki-content.js'),ui=read('public/wiki-ui.js'),build=read('scripts/build-wiki.mjs');
 assert.match(content,/<p class="wiki-install" data-wiki-install-row hidden><button type="button" class="wiki-install-button" data-wiki-install>Install the app<\/button><\/p>/);
 assert.match(ui,/row\.hidden=pwa\(\)\?\.state\?\.\(\)\.kind!=='prompt'/);assert.match(ui,/pwa\(\)\?\.install\?\.\(\)/);assert.match(ui,/stickyOffset\(\);showInstall\(el\);/);
 assert.match(build,/<link rel="manifest" href="\/manifest\.webmanifest">/);assert.match(build,/\$\{body\.includes\('data-wiki-install'\)\?INSTALL_SCRIPT:''\}/);
 const {INSTALL_SCRIPT}=await import('../scripts/build-wiki.mjs');assert.match(INSTALL_SCRIPT,/beforeinstallprompt[\s\S]*row\.hidden=false[\s\S]*e\.prompt\(\)/);
 assert.match(read('public/wiki.css'),/\.wiki-install\{margin:0 0 20px\}/);assert.doesNotMatch(read('public/wiki.css'),/\.wiki-install\{[^}]*display/,'the hidden attribute keeps working');
});

// 30 Sep 2026, a cleaner wiki: a building is a closed row that opens to its recipes; the home has two even columns and "Read first"
// as a real (translated) badge; the website has search; the jump bar fades while there is more; Trees and bushes shows pictures.
test('a building is one closed row (picture, name, level, cost and what it makes) that opens to its recipes; going to it opens it',async()=>{
 const {wikiArticle:article,wikiJump:jump}=await import('../public/wiki-content.js');
 const buildings=article('buildings');
 assert.match(buildings.html,/<details class="wiki-section wiki-building" id="building-dairy"><summary><h3>[^]*?Dairy Barn<\/h3><span class="wiki-meta">[^]*?<\/span><span class="wiki-makes" aria-hidden="true">[^]*?<\/span><i class="wiki-open-mark" aria-hidden="true"><\/i><\/summary><div class="wiki-building-body">/);
 assert.doesNotMatch(buildings.html,/<details[^>]* open/,'every building starts closed');
 assert.match(jump(buildings),/data-wiki-jump="building-dairy"/);assert.match(jump(buildings),/^<div class="wiki-jump-wrap"><nav class="wiki-jump" aria-label="On this page">/);
 assert.match(article('village').html,/<details class="wiki-section wiki-building" id="building-mine">/,'The Village shares the rows');
 const ui=read('public/wiki-ui.js');
 assert.match(ui,/function reveal\(id\)\{const target=root\(\)\?\.querySelector\(`#\$\{CSS\.escape\(id\)\}`\);const row=target\?\.closest\('details'\);if\(row\)row\.open=true;return target;\}/);
 assert.match(ui,/const target=anchor&&reveal\(anchor\);/);assert.match(ui,/reveal\(jump\.dataset\.wikiJump\)\?\.scrollIntoView\(/);
 const {TOPIC_SCRIPT}=await import('../scripts/build-wiki.mjs');assert.match(TOPIC_SCRIPT,/row=el&&el\.closest\('details'\);if\(row&&!row\.open\)\{row\.open=true;/);assert.match(TOPIC_SCRIPT,/addEventListener\('hashchange',open\)/);
});
test('the home: Getting started above two even columns, an odd last tile across the row, and Read first as a badge that stays whole',async()=>{
 const {wikiGroups}=await import('../public/wiki-content.js');const home=wikiGroups();
 assert.match(home,/<section class="wiki-group"><h3>Start here<\/h3><a class="wiki-tile is-featured" href="\/wiki\/getting-started"[^]*?<b class="wiki-badge">Read first<\/b><\/strong>[^]*?<\/a><div class="wiki-tiles">/);
 assert.match(wikiGroups({level:20},{featured:false}),/<h3>Start here<\/h3><div class="wiki-tiles"><a class="wiki-tile" href="\/wiki\/getting-started"/);
 const css=read('public/wiki.css');
 assert.match(css,/\.wiki-tiles\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);gap:10px\}\n\.wiki-tiles>\.wiki-tile:last-child:nth-child\(odd\)\{grid-column:1\/-1\}/);
 assert.match(css,/\.wiki-badge\{[^}]*white-space:nowrap\}/);assert.doesNotMatch(css,/content:'Read first'/,'a CSS text is never translated');
 assert.match(css,/\.wiki-jump-wrap::after\{content:'';position:absolute;[^}]*\}\n\.wiki-jump-wrap\.is-scrollable:not\(\.at-end\)::after\{opacity:1\}/);
});
test('the website has the same search as the game: the box, the quick searches and /wiki/search.json',async()=>{
 const out=mkdtempSync(join(tmpdir(),'wiki-search-'));await buildWiki(out);
 const index=readFileSync(join(out,'wiki','index.html'),'utf8');
 assert.match(index,/<input type="search" id="wiki-search" placeholder="Search the wiki: corn, cheese, tractor…"/);assert.match(index,/<div class="wiki-quick" aria-label="Quick searches"><a href="\/wiki\/getting-started#sec-play-it-as-an-app"/);
 assert.match(index,/<div id="wiki-results" class="wiki-results" hidden><\/div>/);assert.match(index,/fetch\('\/wiki\/search\.json'\)/);
 const data=JSON.parse(readFileSync(join(out,'wiki','search.json'),'utf8'));
 const cheese=data.items.find(e=>e[0]==='Cheese');assert.deepEqual(cheese.slice(1,4),['Buildings and goods','/wiki/buildings#building-dairy','cheese']);assert.match(data.arts.cheese,/game-art/);
 assert.ok(data.items.some(e=>e[2]==='/wiki/crops#crop-corn'&&e[0]==='Corn'),'a crop lands on its row in Every crop (Oct 2026)');
 assert.doesNotMatch(readFileSync(join(out,'wiki','crops.html'),'utf8'),/id="wiki-search"/,'the search is on the home page');
});
test('Trees and bushes shows each crop that grows back with its picture and level; days are written out',async()=>{
 const {wikiArticle:article}=await import('../public/wiki-content.js');
 const crops=article('crops').html;
 assert.match(crops,/<ul class="wiki-chips wiki-regrow"><li><a href="\/wiki\/crops#crop-apples" data-wiki-topic="crops" data-wiki-anchor="crop-apples">[^]*?<span>Apples<\/span><span class="wiki-level">Level 20<\/span><\/a><\/li>/,'each chip leads to its row in Every crop (Oct 2026)');
 assert.match(crops,/<p>These grow back after you harvest them, so you only plant them once\./);
 assert.doesNotMatch(article('estate').html.replace(/<[^>]+>/g,' '),/\b\d+ d\b/);
});
