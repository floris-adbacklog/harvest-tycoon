import {CHAPTER_STALL_INCOME,FAIR_CHAMPION_DIAMONDS,QUESTS,QUEST_XP,ACTIVE_STATIONS,CROPS,CROP_LEVELS,BUILDINGS,BUILDING_LEVELS,BUILDING_COSTS,RECIPES,RECIPE_LEVELS,PRODUCTS,ITEMS,FEATURE_LEVELS,FACTORY_LEVEL,FACTORY_COST,MAX_BUILDING_LEVEL,MAX_PLOTS,STARTER_FIELDS,EARLY_FIELDS,MASTERY_TIERS,SILO_COSTS,siloBonus,DAILY_REWARDS,DAILY_DIAMONDS,DAILY_BOOSTS,DAILY_BOOST_MS,giftCoins,DELIVERY_LEVELS,DELIVERY_TIERS,REPLACE_ORDER_COST,FAMILY_CONFIG,FAMILY_MIN_LEVEL,BOOSTS,VIP_PLANS,DIAMOND_PACKS,SINGLE_CROP_COST,SINGLE_BATCH_COST,INVITE_REWARD,INVITE_LEVEL,INVITE_DAYS,INVITE_LIMIT,STARTER_LEVEL,IMPROVEMENTS,CHORES,RANCH_HERDS,SWIPE_MAX_FIELDS,BEGINNER_REWARD,ROOKIE_BOOST_MS,ROOKIE_TIMER_BOOST,EMAIL_BONUS,choreRewards,CHORE_PRACTICE_STEP,ACTIVITY_ROUND_REWARD,TRACTOR_FUEL_BASE,TRACTOR_FUEL_PER_FIELD,TRACTOR_REST_MS,stallLevel,STALL_MAX_LEVEL,PROJECTS,CHAPTER_DIAMONDS,VALLEY_STALLS,VALLEY_RESTOCK,VALLEY_PREMIUM,RANCH_SPEEDUP,RANCH_SWITCH_COST,DEPOT_PREMIUM,DEPOT_RESTOCK,DEPOT_DIAMONDS,levelReward,DAILY_CHALLENGE_DIAMONDS,DAILY_BONUS,MARKET_RANGES,FAMILY_CHEST_TIERS,FAMILY_CHEST_POINTS,FAMILY_CHEST_MIN,FAMILY_LEVEL_STEPS,FAMILY_LEVEL_BONUS,FAMILY_MAX_COLEADERS,HEIRLOOMS,LAB_YIELD,LAB_DISCOVER_DIAMONDS,LAB_COMPLETE_DIAMONDS,VISITOR_STREAK_MAX,VISITOR_PREMIUM,GIANT_COINS_PER_KG,GIANT_RECORD_DIAMONDS,GIANT_RECORD_MIN,GIANT_FEED,GIANT_FEED_KG,VALLEY_PROJECTS,MASTER_BRANCHES,MASTER_FROM,FAMILY_EVENT_BONUS} from './farm-state.js';
import {art} from './visual-icons.js';
import {helpCoins,maxShare,SHARE_LIMIT} from './social-ui.js';
import {PLAYER_AVATARS,avatarGoal} from './player-avatars.js';
import {EVENTS_LEVEL,PODIUM_PRIZES,FINISHER_PRIZE} from './live-events-ui.js';

// The farm wiki: the same topics in How to play (public/wiki-ui.js) and on the website (/wiki, scripts/build-wiki.mjs).
// Every number and table comes from the game rules, so a balance change never leaves the wiki behind. In the game, things
// above your level say "From level X"; on the website every level is just shown.
export const WIKI_TOPICS=Object.freeze([
 {id:'getting-started',title:'Getting started',art:'farm',blurb:'Your first minutes on the farm, and how to move around.',keywords:'start beginner guide rookie controls swipe zoom tutorial new'},
 {id:'crops',title:'Fields and crops',art:'wheat',blurb:'Planting, watering, more fields and every crop in the game.',keywords:'plant water care harvest field seeds grow mastery silo trees'},
 {id:'buildings',title:'Buildings and goods',art:'buildings',blurb:'What each building makes, from what, and how long it takes.',keywords:'production recipe goods upgrade factory batch collect'},
 {id:'market',title:'Market',art:'market',blurb:'Selling crops and goods, and prices that change every day.',keywords:'sell price demand coins stall'},
 {id:'quests',title:'Quests and levels',art:'quests',blurb:'Goals, XP, levels and what opens when.',keywords:'xp level unlock journal quest claim'},
 {id:'daily',title:'Daily rewards and orders',art:'gift',blurb:'The daily gift, challenges and delivery orders.',keywords:'streak gift challenges deliveries orders cart commission'},
 {id:'family',title:'Farm family',art:'family-members',blurb:'Playing together: the Family Chest, weekly orders, sharing and the tournament.',keywords:'family team guild members tournament sharing invite chest level flag join'},
 {id:'events',title:'Farm events',art:'live-events',blurb:'Short shared goals every six hours.',keywords:'event goals qualify podium'},
 {id:'helpers',title:'Farm helpers',art:'tractor',blurb:'Tractor, silo research, farm stall, chores and a helping hand.',keywords:'tractor silo stall chores helping hand greenhouse apiary paddock workshop'},
 {id:'estate',title:'Estate and Valley',art:'estate',blurb:'Big goals for later: projects, the Valley Market and more.',keywords:'estate projects valley market ranch workshop trade depot fair improvements'},
 {id:'diamonds',title:'Diamonds, boosts and VIP',art:'diamonds',blurb:'How to earn diamonds and what they do.',keywords:'diamonds boosts vip shop packs starter pack buy premium'},
 {id:'chat',title:'Chat and house rules',art:'chat',blurb:'Talking with other farmers, and keeping it friendly.',keywords:'chat messages private block report rules moderator'},
 {id:'account',title:'Account and settings',art:'settings',blurb:'Your account, settings, invites and privacy.',keywords:'account password settings avatar sound reminders invite delete privacy app'}
]);
const TOPIC=Object.fromEntries(WIKI_TOPICS.map(t=>[t.id,t]));
// How long the Starter Pack is open (game/payments.js STARTER_WINDOW; the wiki test keeps the two equal).
export const STARTER_DAYS=7;
// The home page in three groups; "Getting started" leads as the one to read first.
export const WIKI_GROUPS=Object.freeze([
 {title:'Start here',ids:['getting-started','crops','buildings']},
 {title:'Grow your farm',ids:['market','daily','quests','helpers']},
 {title:'Together and extras',ids:['family','events','chat','diamonds','estate','account']}
]);
// Each topic's header has its own soft colour.
const TINTS={'getting-started':'#e3efd6',crops:'#f6e7b8',buildings:'#f3d9cf',market:'#f6dfc4',quests:'#efe4cf',daily:'#f5d9dc',family:'#dcebd3',events:'#e6def0',helpers:'#d8e7f0',estate:'#dbe9e2',diamonds:'#d9ebf7',chat:'#e1eed8',account:'#ebe5dc'};

const number=n=>Number(n).toLocaleString('en-US');
export function wikiTime(ms){
 const minutes=Math.round(ms/60000);if(minutes<60)return `${minutes} min`;
 const hours=Math.floor(minutes/60),rest=minutes%60;if(hours<24)return rest?`${hours} h ${rest} min`:`${hours} h`;
 const days=Math.floor(hours/24),h=hours%24;return h?`${days} d ${h} h`:`${days} d`;
}
const itemName=key=>ITEMS[key]?.name??PRODUCTS[key]?.name??CROPS[key]?.name??key;
const item=(key,count)=>`<span class="wiki-item">${art(key)}<span>${count>1?`${number(count)} `:''}${itemName(key)}</span></span>`;
const items=list=>Object.entries(list).map(([key,count])=>item(key,count)).join('');
const slug=text=>'sec-'+text.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const section=(title,body)=>`<section class="wiki-section" id="${slug(title)}"><h3>${title}</h3>${body}</section>`;
// On a phone the long tables become cards (CSS shows one or the other).
const dual=(tableHtml,cards)=>`<div class="wiki-dual">${tableHtml}<ul class="wiki-cards">${cards.join('')}</ul></div>`;
const card=({picture,title,badge='',stats=[],note='',locked=false})=>`<li class="wiki-card${locked?' is-locked':''}">${art(picture)}<div><strong>${title}</strong>${badge}${stats.length?`<div class="wiki-stats">${stats.map(x=>`<span>${x}</span>`).join('')}</div>`:''}${note?`<small>${note}</small>`:''}</div></li>`;
// An avatar in a table: its small picture and its name (the Avatars section).
const avatarCell=a=>`<span class="wiki-avatar"><img src="${a.src}" alt="" width="34" height="36" loading="lazy" decoding="async">${a.name}</span>`;
const table=(head,rows,cls='')=>`<div class="wiki-table-wrap"><table class="wiki-table ${cls}"><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
const facts=list=>`<ul class="wiki-facts">${list.map(([picture,title,text])=>`<li>${art(picture)}<div><strong>${title}</strong><p>${text}</p></div></li>`).join('')}</ul>`;

export const cropLevel=key=>CROP_LEVELS[key]??CROPS[key].minLevel??1;
export const buildingLevel=key=>BUILDING_LEVELS[key]??BUILDINGS[key].minLevel??1;
export const recipeLevel=key=>{const r=RECIPES[key];return r.building==='factory'?Math.max(FACTORY_LEVEL,RECIPE_LEVELS[r.base]??1):RECIPE_LEVELS[key]??buildingLevel(r.building);};

// ctx: {level: the player's level, or null on the website; href: id => link to a topic}.
function helpers(ctx){
 const level=ctx.level??null,href=ctx.href??(id=>`/wiki/${id}`);
 const locked=n=>level!=null&&n>level;
 const lvl=n=>`<span class="wiki-level${locked(n)?' is-locked':''}">${locked(n)?'From level':'Level'} ${n}</span>`;
 const row=(n,cells)=>`<tr${locked(n)?' class="is-locked"':''}>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
 const link=(id,text=TOPIC[id].title)=>`<a href="${href(id)}" data-wiki-topic="${id}">${text}</a>`;
 return {level,href,locked,lvl,row,link};
}

const BODIES={
 'getting-started'(h){
  const loop=[['seeds','Plant'],['harvest','Harvest'],['buildings','Make'],['market','Sell']].map(([p,l],i)=>`${i?'<i class="wiki-arrow" aria-hidden="true">›</i>':''}<li>${art(p)}<span>${l}</span></li>`).join('');
  return section('The whole game in four steps',`<ol class="wiki-loop">${loop}</ol><p>Plant crops, harvest them, turn them into goods in your buildings and sell them at the ${h.link('market')}. Everything else helps your farm grow.</p>`)
  +section('Your first minutes',facts([
   ['quests','Beginner guide',`Ten small steps that show you the farm. After all ten you get ${BEGINNER_REWARD} diamonds.`],
   ['boost','Beginner boost',`When you create your account, waiting times are ${Math.round(ROOKIE_TIMER_BOOST*100)}% shorter. The boost gets smaller evenly, hour by hour, and stops after your first ${Math.round(ROOKIE_BOOST_MS/3600000)} hours.`],
   ['gift','A gift every day',`Come back every day for coins and diamonds. See ${h.link('daily')}.`]
  ]))
  +section('Moving around',facts([
   ['farm','Look around','Drag to move the farm. Pinch, or scroll with a mouse, to zoom in and out.'],
   ['harvest','Swipe across fields',`With a tool picked, hold a field for a moment until it lights up, then swipe across your fields to plant, water, care for or harvest many at once, up to ${SWIPE_MAX_FIELDS} in one swipe. A quick swipe moves the farm instead. With a mouse, just drag from a field.`],
   ['care','Tools at the bottom','Pick Plant, Water, Care or Harvest at the bottom of the screen, then tap or swipe your fields.']
  ]))
  +section('Saved for you','<p>Your farm is saved to your account, so you can play on your phone and your computer. You need an internet connection to play.</p>')
  +section('Play it as an app',facts([
   ['farm','Why the app','One tap from your home screen, without the browser bar. Reminders when your farm needs you, a number on the icon for new messages, and press and hold the icon for Chat, Daily gift and the leaderboard.']
  ])+'<ul class="wiki-list wiki-app-steps"><li><strong>Android:</strong> in Chrome, tap the menu (⋮) and choose “Install app” or “Add to Home screen”.</li><li><strong>iPhone and iPad:</strong> in Safari, tap Share, then “Add to Home Screen”, then “Add”.</li><li><strong>Computer:</strong> in Chrome or Edge, click the install icon at the right of the address bar.</li></ul>'
  +facts([['settings','In the game','Settings, Farm app shows the steps for your device, or installs it in one tap. There you can also switch on full screen (Android and computers).']]));
 },
 crops(h){
  const regrowing=Object.entries(CROPS).filter(([,c])=>c.regrow).map(([k])=>CROPS[k].name);
  const sorted=Object.entries(CROPS).sort(([a],[b])=>cropLevel(a)-cropLevel(b)||CROPS[a].duration-CROPS[b].duration);
  const rows=sorted.map(([key,c])=>h.row(cropLevel(key),[
   item(key,1),h.lvl(cropLevel(key)),`${art('coins')}${number(c.cost)}`,wikiTime(c.duration),`${art('coins')}${number(c.sell)}`,number(c.xp),c.regrow?`every ${wikiTime(c.regrow)}`:'–',c.use??'–']));
  const cards=sorted.map(([key,c])=>card({picture:key,title:c.name,badge:h.lvl(cropLevel(key)),locked:h.locked(cropLevel(key)),stats:[`Grows in ${wikiTime(c.duration)}`,`Seed ${art('coins')}${number(c.cost)}`,`Sells ${art('coins')}${number(c.sell)}`,`${number(c.xp)} XP`,...(c.regrow?[`Grows back every ${wikiTime(c.regrow)}`]:[])],note:c.use?`Used for ${c.use.toLowerCase()}`:''}));
  const early=EARLY_FIELDS.map(f=>number(f.coins)).join(', ');
  return section('Planting','<p>Pick a crop in the seed shop, then tap an empty field. Quick crops are good while you play; longer ones grow while you are away.</p><p>Changed your mind? In the Farmhouse, under Your fields, you can remove any crop, ripe or not. The field is empty right away, but you get nothing back: no harvest, no XP and no seed coins.</p>')
  +section('Water and care',`<p>A harvest gives 1 crop. Water a field for 2 crops, water and care for 3. Both also make the crop grow faster, and doing both gives double XP.</p>`)
  +section('Trees and bushes',`<p>${regrowing.join(', ')} grow back after you harvest them, so you only plant them once. Each holds one harvest at a time: pick it yourself to start the next one. Water and care it every time, for up to 3 fruit instead of 1. Nothing is picked while you are away.</p>`)
  +section('More fields',`<p>You start with ${STARTER_FIELDS} fields. While you start out, each new level lets you open one more for coins (${early}). After that the Farmhouse adds fields, up to ${MAX_PLOTS} in total. See ${h.link('buildings')}.</p>`)
  +section('Crop mastery',`<p>${h.lvl(FEATURE_LEVELS.mastery)} Harvest the same crop often for a reward at every tier.</p>`+table(['Tier','Harvests','Reward'],MASTERY_TIERS.map(t=>`<tr><td>${t.name}</td><td>${number(t.target)}</td><td>${art('coins')}${number(t.coins)} · ${number(t.xp)} XP</td></tr>`)))
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Five research steps, each paid with coins. Together they make crops grow up to 40% faster and seeds up to 25% cheaper. Crops already growing keep their time.</p>`+table(['Step','Price','Growing time','Seed price'],SILO_COSTS.map((cost,i)=>{const b=siloBonus(i+1),was=siloBonus(i),pct=n=>Math.round(n*100);return `<tr><td>${i+1}</td><td>${art('coins')}${number(cost)}</td><td>−${pct(b.growth-was.growth)}% <small>(−${pct(b.growth)}% in all)</small></td><td>−${pct(b.seeds-was.seeds)}% <small>(−${pct(b.seeds)}% in all)</small></td></tr>`;})))
  +section('Every crop',dual(table(['Crop','Opens','Seed','Grows in','Sells for','XP','Grows back','Used for'],rows,'wiki-crops'),cards));
 },
 buildings(h){
  const production=Object.entries(BUILDINGS).filter(([,b])=>b.type==='production').sort(([a],[b])=>buildingLevel(a)-buildingLevel(b));
  const blocks=production.map(([key,b])=>{
   const recipes=Object.entries(RECIPES).filter(([,r])=>r.building===key).sort(([a],[b])=>recipeLevel(a)-recipeLevel(b));
   if(!recipes.length)return '';
   const cost=key==='factory'?FACTORY_COST:BUILDING_COSTS[key];
   const rows=recipes.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0]??[];return h.row(recipeLevel(id),[out?item(out,count):r.name,items(r.input),wikiTime(r.duration),out&&PRODUCTS[out]?.sell?`${art('coins')}${number(PRODUCTS[out].sell)}`:'–',h.lvl(recipeLevel(id))]);});
   const cards=recipes.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0]??[];return card({picture:out??key,title:out?`${count>1?`${number(count)} `:''}${itemName(out)}`:r.name,badge:h.lvl(recipeLevel(id)),locked:h.locked(recipeLevel(id)),stats:[wikiTime(r.duration),...(out&&PRODUCTS[out]?.sell?[`Sells ${art('coins')}${number(PRODUCTS[out].sell)} each`]:[])],note:`Needs ${items(r.input)}`});});
   return `<section class="wiki-section wiki-building" id="building-${key}"><h3>${art(key)}${b.name}</h3><p class="wiki-meta">${h.lvl(buildingLevel(key))}${cost?` · builds for ${art('coins')}${number(cost)}`:' · ready from the start'}</p>${b.tagline?`<p>${b.tagline}</p>`:''}${key==='factory'?'<p>The biggest batches are shown. Yours are twice the level of the building that normally makes the good (its level for goods that take over an hour).</p>':''}${dual(table(['Makes','Needs','Time','Sells for (each)','Opens'],rows),cards)}</section>`;
  }).join('');
  return section('How buildings work',facts([
   ['buildings','Build',`Each building opens at a level and costs coins once; the ${BUILDINGS.dairy.name} needs the ${BUILDINGS.mill.name} first, the ${BUILDINGS.bakery.name} the ${BUILDINGS.dairy.name} and the ${BUILDINGS.windmill.name}. Tap a building to start a batch: it turns crops (or other goods) into goods that sell for more.`],
   ['hammer','Upgrade',`Better buildings run more batches at the same time, up to level ${MAX_BUILDING_LEVEL}. Level ${MAX_BUILDING_LEVEL} is fully upgraded. Every level costs more than the one before, and a building that costs more to build costs more to upgrade. From level 4 an upgrade also asks for goods the building makes itself, like milk for the Dairy Barn. The Factory asks for goods from across the valley from its first upgrade. The Buildings discount boost halves the coins and goods of your next upgrade.`],
   ['collect-all','Collect','When a batch is ready, the building\'s name on the farm turns yellow: tap the name to collect everything that is ready. Or open the building and use Collect all.'],
   ['feed','Animal feed',`Chickens, cows, sheep, goats and pigs eat animal feed. Mix it at the ${BUILDINGS.mill.name}: ${RECIPES.feed.input.corn} corn make ${RECIPES.feed.output.feed}, ${RECIPES.barleyfeed.input.barley} barley make ${RECIPES.barleyfeed.output.feed} and ${RECIPES.wheatfeed.input.wheat} wheat make ${RECIPES.wheatfeed.output.feed}. At the ${BUILDINGS.windmill.name}, ${RECIPES.windfeed.input.barley} barley make ${RECIPES.windfeed.output.feed}. Feed sells for ${ITEMS.feed.sell} coins.`],
   ['boost','Factory',`From level ${FACTORY_LEVEL} the Factory (${number(FACTORY_COST)} coins) makes the goods of your other buildings in bulk, in twice the time of one batch. A bulk batch is twice the level of the building that normally makes it, up to ×20: a level-5 Dairy makes cheese ×10. Goods that take over an hour: its level, up to ×10. Upgrade a building and its bulk batch grows too. Upgrading the Factory itself asks for flour, cheese and cloth, plus harvest hampers from the upgrade to level 5, squash soup from level 7 and cider from level 9.`]
  ]))+blocks;
 },
 market(h){
  return section('Selling',facts([
   ['market','Prices change every day','At 00:00 UTC the market sets new prices. Most days a price stays close to normal; now and then it is much higher or lower. Today’s market pick is the item whose price rose most today, and the outlook shows tomorrow’s.'],
   ['coins','Sell some or sell all','Choose how many to sell (on a phone: tap Pick amount), or sell all of one crop. The basket at the bottom shows what all your crops are worth.'],
   ['buildings','Goods pay more',`Crops made into goods sell for more than the crops that went in. See ${h.link('buildings')}.`],
   ['quests','Keep what you need',`Orders and your family ask for crops and goods, and often pay more than the market. See ${h.link('daily')} and ${h.link('family')}.`]
  ]))+section('How far prices move',table(['What','Lowest','Highest'],[['Crops',MARKET_RANGES.crops],['Goods',MARKET_RANGES.goods]].map(([what,[lo,hi]])=>`<tr><td>${what}</td><td>${Math.round(lo*100)}% of normal</td><td>${Math.round(hi*100)}% of normal</td></tr>`))+'<p>Every crop and good has its own price each day. The Market shows today’s price next to the normal one.</p>')
  +section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Your stall earns coins by itself. Collect them from time to time. What it earns per level is in ${h.link('helpers')}.</p>`);
 },
 quests(h){
  // Everything a level opens, not only the features: buildings, crops and the recipes that come later than their building (26 Sep 2026;
  // between level 27 and 62 only buildings, crops and recipes open, and a features-only list looked empty there).
  const opens=new Map(),add=(n,html)=>{if(n>1)(opens.get(n)??opens.set(n,[]).get(n)).push(html);};
  const chip=(picture,name,kind)=>`<span class="wiki-open">${art(picture)||art('gift')}<span>${name}</span>${kind?`<small>${kind}</small>`:''}</span>`;
  const featureArt={challenges:'quests',mastery:'trophy',activities:'helping-hand',family:'familyhall',boosts:'boost',projects:'estate'};
  for(const [key,n] of Object.entries(FEATURE_LEVELS))add(n,chip(featureArt[key]??key,featureTitle(key)));
  add(EVENTS_LEVEL,chip('live-events','Farm events'));add(STARTER_LEVEL,chip('gift','Starter Pack'));
  for(const [key,b] of Object.entries(BUILDINGS))if(b.type==='production')add(buildingLevel(key),chip(key,b.name,'building'));
  for(const [key,c] of Object.entries(CROPS))add(cropLevel(key),chip(key,c.name,'crop'));
  for(const [id,r] of Object.entries(RECIPES))if(r.building!=='factory'&&recipeLevel(id)>buildingLevel(r.building))add(recipeLevel(id),chip(Object.keys(r.output)[0],r.name,'recipe'));
  return section('Quests',facts([
   ['quests','One little goal at a time',`${number(QUESTS.length)} quests, from your first harvest to the Grand Valley Fair. They ask for things like harvesting 12 wheat. When one is done, claim its coins and XP.`],
   ['trophy','Bigger quests, more XP',`Quests up to ${number(1000)} coins give ${QUEST_XP} XP. Bigger ones give more, up to 250 XP for the biggest.`],
   ['xp','XP and levels',`Almost everything you do gives XP. Each new level opens new crops, buildings and things to do, and the journal shows your level rewards.`]
  ]))+section('Level rewards',`<p>Every new level brings ${art('coins')}10 × the level and ${art('diamonds')}1 diamond for every 5 levels (at least 1).</p>`+table(['Level','Coins','Diamonds'],[2,5,10,20,30,50,75,100].map(n=>{const r=levelReward(n);return `<tr><td>${n}</td><td>${art('coins')}${number(r.coins)}</td><td>${art('diamonds')}${number(r.diamonds)}</td></tr>`;})))+section('What opens when',table(['Level','What opens'],[...opens].sort((a,b)=>a[0]-b[0]).map(([n,list])=>h.row(n,[h.lvl(n),`<span class="wiki-opens">${list.join('')}</span>`])),'wiki-opens-table')+`<p>More about each one in ${h.link('crops')} and ${h.link('buildings')}.</p>`);
 },
 daily(h){
  const boost=day=>DAILY_BOOSTS[day]?`<span class="wiki-boost" title="${BOOSTS[DAILY_BOOSTS[day]].name}">${art(BOOSTS[DAILY_BOOSTS[day]].art)}<span>${BOOSTS[DAILY_BOOSTS[day]].name.replace('Double ','×2 ')}</span></span>`:'–';
  const days=DAILY_REWARDS.map((_,i)=>`<tr><td>${i+1}</td><td>${art('diamonds')}${number(DAILY_DIAMONDS[i])}</td><td>${art('coins')}${number(giftCoins(i+1,10))}</td><td>${art('coins')}${number(giftCoins(i+1,30))}</td><td>${boost(i+1)}</td></tr>`);
  const tiers=Object.entries(DELIVERY_TIERS).map(([key,t])=>h.row(DELIVERY_LEVELS[key],[t.name,h.lvl(DELIVERY_LEVELS[key]),`${t.minBonus}–${t.maxBonus}% more than the market`]));
  return section('A gift every day',`<p>Open the farm every day and collect your gift. Every day in a row makes your streak one longer, and from day 7 every day pays the day-7 gift. Miss one day and your streak is kept, once a week; miss more and it starts over.</p><p>The coins grow with your level: the day’s coins × half your level. Days 3, 5 and 7 of every streak week also bring a ${DAILY_BOOST_MS/60000}-minute boost. VIP doubles the whole gift, the boost too. The table shows the coins at level 10 and at level 30.</p>`+table(['Day','Diamonds','Level 10','Level 30','Boost'],days))
  +section('Daily challenges',`<p>${h.lvl(FEATURE_LEVELS.challenges)} Three small goals every day. Each pays coins, 10 XP and diamonds: ${DAILY_CHALLENGE_DIAMONDS.join(', ')}. Finish all three for a bonus of ${art('coins')}${DAILY_BONUS.coins} and ${DAILY_BONUS.xp} XP. VIP doubles these rewards.</p>`)
  +section('Delivery orders',`<p>${h.lvl(FEATURE_LEVELS.cart)} Customers ask for crops and goods and pay more than the market. Don’t like an order? Replace it for ${REPLACE_ORDER_COST} diamonds.</p>`+table(['Order','Opens','Pays'],tiers))
  +section('A new day','<p>Gifts, challenges, orders and market prices refresh at 00:00 UTC.</p>');
 },
 family(h){
  // 27 Sep 2026: the Family Chest, the family level, the flag and the family event bonus; every number from the game rules.
  const pointNames={harvested:'a harvest',produced:'a collected batch',deliveries:'a delivery',chores:'a chore',activities:'a helping-hand job'};
  const chestRows=FAMILY_CHEST_TIERS.map(t=>`<tr><td>${art(`family-chest-${t.id}`)}${t.name}</td><td>${number(t.points)}</td><td>${art('diamonds')}${t.diamonds}</td><td>${art('coins')}${t.coinsPerLevel} × your level</td></tr>`);
  const levelRows=FAMILY_LEVEL_STEPS.map((need,i)=>`<tr><td>${i+1}</td><td>${number(need)}</td><td>${i?`+${Math.round(i*FAMILY_LEVEL_BONUS*100)}%`:'–'}</td></tr>`);
  return section('Together is better',`<p>${h.lvl(FAMILY_MIN_LEVEL)} Start a Farm family or join one, with up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers. The Family screen shows the busiest families you can join first. The leader chooses who can join: <strong>Open</strong> (anyone joins at once; a new family starts open), <strong>Request to join</strong> (you ask, the leader or a co-leader accepts or declines within 3 days), <strong>Invite only</strong> (the leader or a co-leader invites you by your player name) or <strong>Closed</strong> (nobody new). You can ask one family at a time.</p><p>Tap a family's name, in the list, the tournament or a farmer's profile, to see its <strong>family profile</strong>: its level, its farmers, the tournaments it won and the chests it opened.</p>`)
  +section('Ranks and the top farmer',`<p>The leader gives the family its ranks. <strong>Co-leaders</strong> (at most ${FAMILY_MAX_COLEADERS}) can do everything the leader does: accept requests, invite and remove farmers, and change the emblem, the name and who can join. They cannot change ranks, hand over the leadership or remove the leader or the other co-leader. <strong>Honorary</strong> is a title of thanks, without extra rights. Everyone else is a <strong>member</strong>.</p><p>The farmer who brings the most points into the Family Chest this week wears the <strong>top farmer</strong> crown in the member list and on the family profile, until the week ends on Monday, 00:00 UTC.</p>`)
  +section('The Family Chest',`<p>Every week your family fills one chest together. Everything members do on their farm counts: ${Object.entries(FAMILY_CHEST_POINTS).map(([k,n])=>`${pointNames[k]} ${n} point${n===1?'':'s'}`).join(', ')}. At each chest, everyone who put in at least ${number(FAMILY_CHEST_MIN)} points that week gets its rewards. A new chest starts on Monday at 00:00 UTC.</p>`+table(['Chest','Family points','Diamonds','Coins'],chestRows)+`<p>A bigger, busier family fills it further: a keen farmer alone reaches the wooden chest, a family of five the silver one, and gold takes a full family. Collect your rewards on the Family screen within a few weeks.</p>`)
  +section('Family level',`<p>Every chest your family opens, in any week, is a step towards the next family level. Every level adds ${Math.round(FAMILY_LEVEL_BONUS*100)}% to the rewards of the Family Chest and the weekly Family Order, for every member. The family list shows each family's level.</p>`+table(['Level','Chests opened','Extra rewards'],levelRows))
  +section('Your family flag',`<p>When you are in a Farm family, its flag stands by your Family Hall: the family emblem in the family colour, with the family level on it.</p>`)
  +section('The family pages',facts([
   ['family-weekly-order','This week',`A big order for the whole family. Everyone delivers what they can. When the whole order is done, everyone who delivered at least ${number(FAMILY_CONFIG.MIN_CONTRIB_POINTS)} points’ worth gets coins, XP and diamonds for what they delivered. Deliveries cannot be taken back.`],
   ['family-sharing','Sharing',`From level 10 you share with your family every day, up to ${SHARE_LIMIT} times each. Help a member with coins: it costs you your level × 25 coins (level 10: ${number(helpCoins(10))}, level 30: ${number(helpCoins(30))}) and they get all of it. Gifts and requests hold up to 5 crops or goods for every 10 levels (level 10: ${maxShare(10)}, level 30: ${maxShare(30)}).`],
   ['family-tournament','Tournament',`Every week families compete; your deliveries count as points. First place wins ${number(FAMILY_CONFIG.TOURNAMENT_FIRST_MIN)} diamonds, plus ${FAMILY_CONFIG.TOURNAMENT_PER_EXTRA_FAMILY} for every other family taking part (up to ${number(FAMILY_CONFIG.TOURNAMENT_FIRST_MAX)}); second ${Math.round(FAMILY_CONFIG.RANK_WEIGHTS[1]*100)}% of that, third ${Math.round(FAMILY_CONFIG.RANK_WEIGHTS[2]*100)}%. The prize is shared by what each member delivered.`],
   ['family-members','Members','See who is online and how much everyone did this week. The leader can invite farmers.']
  ]))
  +section('Family chat',`<p>Your family has its own chat. See ${h.link('chat')}.</p>`)
  +section('Farm events together',`<p>When ${FAMILY_EVENT_BONUS.finishers} or more members of your family finish the same farm event, each of them gets ${art('coins')}${number(FAMILY_EVENT_BONUS.coins)} and ${art('diamonds')}${FAMILY_EVENT_BONUS.diamonds} on top of their own prize. See ${h.link('events')}.</p>`)
  +section('Changing family',`<p>After you leave a family you can join another after ${Math.round(FAMILY_CONFIG.JOIN_COOLDOWN_MS/3600000)} hours. Were you its only member? Then you can join another family straight away.</p>`);
 },
 events(h){
  return section('Short shared goals',`<p>${h.lvl(EVENTS_LEVEL)} A farm event runs for 5 hours, then there is a 1-hour break before the next one. Everyone plays toward the same goals. Events open as soon as you reach level ${EVENTS_LEVEL}.</p>`)
  +section('How it works',facts([
   ['live-events','Goals','Every event mixes 3 goals from 30 kinds, each in an easy, medium or hard size: harvesting and crops, animals and buildings, the market, coins and diamonds, and life on the farm. The 3 goals always come from 3 different kinds of play, and an event is never three hard goals. Your progress shows in the event window.'],
   ['trophy','Rewards',`Complete every goal and help at least 3 times over 10 minutes to qualify. Everyone who finishes wins coins and diamonds; the sooner you finish, the more. The first three win ${PODIUM_PRIZES.map(p=>p.diamonds).join(', ').replace(/, (\d+)$/,' and $1')} diamonds, every other finisher ${FINISHER_PRIZE.diamonds}.`],
   ['family-members','Family bonus',`When ${FAMILY_EVENT_BONUS.finishers} or more members of one Farm family finish the same event, each of them gets ${number(FAMILY_EVENT_BONUS.coins)} coins and ${FAMILY_EVENT_BONUS.diamonds} diamonds more.`],
   ['gift','Next event','When an event ends, the window shows when the next one starts and what it gives.']
  ]));
 },
 helpers(h){
  // Every number below comes from the game rules (27 Sep 2026: the wiki named these helpers without saying what they pay or cost).
  const stall=Array.from({length:STALL_MAX_LEVEL},(_,i)=>{const s=stallLevel(i+1);return `<tr><td>${i+1}</td><td>${art('coins')}${number(s.rate)}</td><td>${s.capacityHours} h</td><td>${s.upgradeCost?`${art('coins')}${number(s.upgradeCost)}`:'Top level'}</td></tr>`;});
  const choreList=Object.entries(CHORES).map(([key,c])=>({key,c,r:choreRewards(c),tries:Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP)}));
  const chores=choreList.map(({key,c,r,tries})=>`<tr><td>${art(`chore-${key}`)||''}${c.name}</td><td>${art('coins')}${number(r.coins)} · ${number(r.xp)} XP</td><td>${wikiTime(c.cooldown)}</td><td>${item(c.bonus.item,c.bonus.count)} ${c.baseChance}% → ${c.maxChance}%</td><td>${tries} times</td></tr>`);
  const choreCards=choreList.map(({key,c,r,tries})=>card({picture:`chore-${key}`,title:c.name,stats:[`${art('coins')}${number(r.coins)} · ${number(r.xp)} XP`,`Rests ${wikiTime(c.cooldown)}`,`${item(c.bonus.item,c.bonus.count)} ${c.baseChance}% → ${c.maxChance}%`],note:`Mastered after ${tries} times`}));
  const stops=Object.values(ACTIVE_STATIONS).map(a=>`<tr><td>${a.name}</td><td>${number(a.xp)} XP${a.coins?` · ${art('coins')}${number(a.coins)}`:''} · ${item(a.item,a.itemCount??1)}</td></tr>`);
  return section('Tractor',`<p>${h.lvl(FEATURE_LEVELS.tractor)} The tractor does one job on every field that needs it: it plants your chosen crop on every empty field, waters every field that can be watered, or harvests every ripe field. Fuel costs ${art('coins')}${TRACTOR_FUEL_BASE} plus ${art('coins')}${TRACTOR_FUEL_PER_FIELD} for every field (planting also pays the seeds), and afterwards the tractor rests ${TRACTOR_REST_MS/1000} seconds.</p>`)
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Better seeds: crops grow faster and seeds cost less. Every step and its price is in ${h.link('crops')}.</p>`)
  +section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Your stall earns coins by itself, every hour, also while you are away. It holds a day or two of earnings; when it is full it stops earning until you collect. Every finished estate chapter adds more coins an hour on top (see ${h.link('estate')}).</p>`+table(['Level','Earns an hour','Holds','Next level'],stall))
  +section('Farm chores',`<p>${h.lvl(FEATURE_LEVELS.chores)} Small jobs that always pay coins and XP, and sometimes find a few crops too. Every time you do a chore its chance of finding them goes up by ${CHORE_PRACTICE_STEP}%, until it reaches its top: then the chore is mastered and the next one opens. After a chore it rests before you can do it again.</p>`+dual(table(['Chore','Pays','Rests','Sometimes finds (chance)','To master'],chores),choreCards))
  +section('A helping hand',`<p>${h.lvl(FEATURE_LEVELS.activities)} Four stops on the farm, each with a little job of three taps. Help at all four for a round bonus of ${art('coins')}${number(ACTIVITY_ROUND_REWARD.coins)} and ${number(ACTIVITY_ROUND_REWARD.xp)} XP, then start a new round. After its job a stop rests ${wikiTime(Math.min(...Object.values(ACTIVE_STATIONS).map(a=>a.cooldown)))}.</p>`+table(['Stop','Gives'],stops));
 },
 estate(h){
  const later=[['projects','Estate projects','estate',`Big projects that make your estate grow. Each finished chapter adds coins an hour to your stall for good, more for every chapter: +${number(CHAPTER_STALL_INCOME[0])} for the first, +${number(CHAPTER_STALL_INCOME[3])} for the fourth, up to +${number(CHAPTER_STALL_INCOME[CHAPTER_STALL_INCOME.length-1])} for the last.`],['valleymarket','Valley Market','valley-market',`${VALLEY_STALLS} customers wait at your stalls, each with a basket of goods. Fill a basket and they pay ${VALLEY_PREMIUM}× what the goods fetch at the market, plus XP. A new customer comes ${wikiTime(VALLEY_RESTOCK)} later (sooner with the Market wagon). Not the basket for you? Send the customer on; the next one comes after the same wait.`],['ranch','The Ranch','ranch',`Choose one herd: ${Object.entries(RANCH_HERDS).map(([b,n])=>`${n} (${BUILDINGS[b].name})`).join(', ')}. Its building works ${Math.round(RANCH_SPEEDUP*100)}% faster (more with the Big hay loft). The first choice is free; switching to another herd costs ${art('coins')}${number(RANCH_SWITCH_COST)}.`],['estateworkshop','Estate Workshop','estate-workshop','Improvements that last for good.'],['tradedepot','Trade Depot','trade-depot',`One export contract at a time. Load its goods, all at once or bit by bit; a full trailer pays ${DEPOT_PREMIUM}× the goods' market value and ${DEPOT_DIAMONDS} diamonds. The next contract comes ${wikiTime(DEPOT_RESTOCK)} after a trailer leaves (sooner with the Loading crane). You can pass on a contract before anything is loaded; the next one comes after the same wait.`]];
  const list=Object.values(IMPROVEMENTS).sort((a,b)=>a.level-b.level);
  const improvements=list.map(i=>h.row(i.level,[`${art(i.art)}${i.name}`,i.effect,h.lvl(i.level),`${art('coins')}${number(i.coins)} + ${items(i.materials)}`]));
  const improvementCards=list.map(i=>card({picture:i.art,title:i.name,badge:h.lvl(i.level),locked:h.locked(i.level),stats:[i.effect],note:`Costs ${art('coins')}${number(i.coins)} + ${items(i.materials)}`}));
  const chapters=PROJECTS.map((p,i)=>h.row(p.level??FEATURE_LEVELS.projects,[`${i+1}. ${p.name}`,h.lvl(p.level??FEATURE_LEVELS.projects),`${art('coins')}${number(p.coins)} + ${items(p.input)}${p.medals?`<small>${p.medals} mastery medal${p.medals===1?'':'s'}</small>`:''}`,wikiTime(p.duration),`${art('diamonds')}${number(CHAPTER_DIAMONDS[i])} · ${number(p.xp)} XP · stall +${art('coins')}${number(CHAPTER_STALL_INCOME[i])} an hour`]));
  const chapterCards=PROJECTS.map((p,i)=>{const level=p.level??FEATURE_LEVELS.projects;return card({picture:'estate',title:`${i+1}. ${p.name}`,badge:h.lvl(level),locked:h.locked(level),stats:[`${art('coins')}${number(p.coins)}`,...Object.entries(p.input).map(([key,n])=>item(key,n)),`Takes ${wikiTime(p.duration)}`,...(p.medals?[`${p.medals} mastery medal${p.medals===1?'':'s'}`]:[])],note:`Brings ${art('diamonds')}${number(CHAPTER_DIAMONDS[i])}, ${number(p.xp)} XP and ${art('coins')}+${number(CHAPTER_STALL_INCOME[i])} an hour at the stall`});});
  return section('Something to grow towards',`<ul class="wiki-facts">${later.map(([key,name,picture,text])=>`<li>${art(picture)}<div><strong>${name} ${h.lvl(FEATURE_LEVELS[key])}</strong><p>${text}</p></div></li>`).join('')}</ul>`)
  +section('Estate chapters',`<p>One chapter at a time, in this order. Pay the coins and goods, and the work takes the time shown. Some chapters also ask for crop mastery medals.</p>`+dual(table(['Chapter','Opens','Costs','Takes','Brings'],chapters),chapterCards))
  +section('Estate Workshop improvements',dual(table(['Improvement','What it does','Opens','Costs'],improvements),improvementCards))
  +afterNinety(h);
 },
 diamonds(h){
  const boostPrice=b=>b.prices?Object.entries(b.prices).map(([length,cost])=>`${length.replace('m',' min').replace('h',' hour').replace('d',' day')}: ${number(cost)}`).join(' · '):number(b.cost);
  const boosts=Object.values(BOOSTS).map(b=>`<tr><td>${art(b.art)}${b.name}</td><td>${b.description}</td><td>${boostPrice(b)}</td></tr>`);
  const boostCards=Object.values(BOOSTS).map(b=>card({picture:b.art,title:b.name,stats:[`${art('diamonds')}${boostPrice(b)}`],note:b.description}));
  const vip=Object.values(VIP_PLANS).map(p=>`<tr><td>${p.name}</td><td>${art('diamonds')}${number(p.cost)}</td></tr>`);
  const packs=DIAMOND_PACKS.map(p=>`<tr><td>${art('diamonds')}${number(p.amount)}</td><td>${p.price}</td></tr>`);
  return section('Earning diamonds',facts([
   ['gift','Every day',`Your daily gift and daily challenges. See ${h.link('daily')}.`],
   ['quests','Beginner guide and levels',`${BEGINNER_REWARD} diamonds for the beginner guide, and at least 1 diamond with every level-up.`],
   ['live-events','Events and family',`${h.link('events','Farm events')} and your ${h.link('family','Farm family')} give diamonds too.`],
   ['invite-friends','Invite a friend',`When a friend you invite reaches level ${INVITE_LEVEL} within ${INVITE_DAYS} days: ${INVITE_REWARD} diamonds for you both.`],
   ['letter','Confirm your email',`${EMAIL_BONUS} diamonds, once. Signed up with Google or Facebook? You get them straight away.`]
  ]))
  +section('Finish now',`<p>Finish a growing field for ${SINGLE_CROP_COST} diamonds, or a running batch for ${SINGLE_BATCH_COST} (not in the Factory).</p>`)
  +section('Boosts',`<p>${h.lvl(FEATURE_LEVELS.boosts)} Boosts in the diamond shop. Buying a timed boost again adds the time after it.</p>`+dual(table(['Boost','What it does','Diamonds'],boosts),boostCards))
  +section('VIP',`<p>VIP gives 10% faster crops, 10% faster production, 5% more coins at the market and double daily rewards. Buying again adds time; it never gets stronger.</p>`+table(['Plan','Diamonds'],vip))
  +section('Buying diamonds',`<p>One-time purchases, added right after payment. Payments go through Stripe; we never see your card. The bigger the pack, the more diamonds per euro. From level ${STARTER_LEVEL}, when diamond boosts unlock, there is also a Starter Pack for ${STARTER_DAYS} days.</p>`+table(['Diamonds','Price'],packs));
 },
 chat(h){
  return section('The chat',facts([
   ['bell','Notifications','News from the Harvest Tycoon team, and gifts.'],
   ['chat','Global','Everyone in the valley. Be kind: new farmers read along too.'],
   ['family-members','Family',`Only your ${h.link('family','Farm family')}.`],
   ['letter','Private','One-to-one messages. Search a farmer by name, or open their profile.']
  ]))
  +section('Your choice',facts([
   ['settings','Private messages off','In Settings you can switch private messages off. Then nobody can start one with you, and you cannot start one either.'],
   ['block','Block','Blocked farmers can no longer send you private messages.'],
   ['alert','Report','Report a message or a farmer and a moderator will look at it.']
  ]))
  +section('House rules',`<ul class="wiki-list"><li>Be friendly. No insults, threats or discrimination.</li><li>No spam, advertising or selling accounts.</li><li>Keep personal details to yourself: no phone numbers, addresses or passwords.</li><li>Moderators can remove messages and close the chat for someone for a while or for good. That only ever closes the chat, never your farm.</li></ul><p>Chat not open for you yet? The chat says from which level it opens.</p>`);
 },
 account(h){
  return section('Your account',facts([
   ['farm','One farm, everywhere','Sign in on any device and your farm is there. You can also add Harvest Tycoon to your home screen and play it like an app: press and hold its icon for Chat, Daily gift and the leaderboard, and on Android or a computer you can play full screen (Settings, Farm app).'],
   ['bell','Reminders','Push reminders come once you allow notifications on your device (Settings): private messages, the daily gift and crops & goods ready are then on. Crops and goods share one reminder, at most once an hour and not at night. Email reminders, and news and offers by email, stay off until you switch them on. The daily email (at most one a day, only when something is waiting) goes to a confirmed address: signed up with your email? Confirm it first.']
  ]))
  +section('Settings',`<p>In Settings you change your farmer name and avatar, sound and music, private messages, reminders and cookies. Forgot your password? Use “Forgot your password?” on the sign-in page.</p>`)
  +section('Avatars',`<p>Pick your avatar in Settings. ${PLAYER_AVATARS.filter(a=>!a.level&&!avatarGoal(a.id)).length} are yours from the start; the others you earn by playing. Until then one shows grey with a lock: tap it to see what it needs.</p>`
   +table(['Avatar','Opens at'],PLAYER_AVATARS.filter(a=>a.level).map(a=>`<tr><td>${avatarCell(a)}</td><td>Level ${a.level}</td></tr>`))
   +table(['Avatar','How to earn it'],PLAYER_AVATARS.filter(a=>avatarGoal(a.id)).map(a=>`<tr><td>${avatarCell(a)}</td><td>${avatarGoal(a.id).text}</td></tr>`))
   +'<p>Diamonds spent and VIP days count from 25 September 2026.</p>')
  +section('Confirm your email',`<p>Signed up with your email address? Confirm it once for ${EMAIL_BONUS} diamonds: tap “Confirm your email” in the menu and type the code we send you. Google and Facebook accounts get the diamonds straight away.</p>`)
  +section('Invite a friend',`<p>Share your invite link. When your friend reaches level ${INVITE_LEVEL} within ${INVITE_DAYS} days, you both get ${INVITE_REWARD} diamonds, for up to ${INVITE_LIMIT} friends.</p>`)
  +section('Privacy',`<p>Read how we handle your data in the <a href="/privacy">Privacy Policy</a>. Want to stop? You can <a href="/delete-account">delete your account</a>.</p>`);
 }
};
// After the last building (27 Sep 2026): five things to do from level 91 on, all on your own farm.
function afterNinety(h){
  const heirlooms=Object.entries(HEIRLOOMS).map(([k,x])=>h.row(x.level,[`${art(k)}${x.name}`,items(x.input),h.lvl(x.level),`${art('coins')}${number(x.sell)}`]));
  const heirloomCards=Object.entries(HEIRLOOMS).map(([k,x])=>card({picture:k,title:x.name,badge:h.lvl(x.level),locked:h.locked(x.level),stats:[`${art('coins')}${number(x.sell)} each`],note:`Cross ${items(x.input)}`}));
  const projects=Object.values(VALLEY_PROJECTS).map(p=>`<tr><td>${art(p.art)}${p.name}</td><td>${p.effect}</td><td>${p.levels.map((l,i)=>`Level ${i+1}: ${art('coins')}${number(l.coins)} + ${items(l.materials)}`).join('<br>')}</td></tr>`);
  const projectCards=Object.values(VALLEY_PROJECTS).map(p=>card({picture:p.art,title:p.name,badge:h.lvl(FEATURE_LEVELS.valleyprojects),locked:h.locked(FEATURE_LEVELS.valleyprojects),stats:[p.effect],note:p.levels.map((l,i)=>`Level ${i+1}: ${art('coins')}${number(l.coins)} + ${items(l.materials)}`).join('<br>')}));
  return section('After level 90',`<p>The Grand Valley Fair is the last new building. After it, five things keep your farm growing, all on your own:</p><ul class="wiki-facts">${[
   ['master','Master points',FEATURE_LEVELS.master,`Every level after ${MASTER_FROM} gives a Master point, in Estate → Master. Spend it on a lasting bonus: ${Object.values(MASTER_BRANCHES).map(b=>`<b>${b.name}</b> (${b.effect.toLowerCase().replace(/\.$/,'')})`).join(', ')}. Each has ten ranks.`],
   ['seedlab','Seed Lab',FEATURE_LEVELS.seedlab,`Two test beds beside the Glasshouse. Cross two crops into an heirloom: the first cross of a variety takes a day and discovers it (+${LAB_DISCOVER_DIAMONDS} diamonds), after that 8 hours. Each cross gives ${LAB_YIELD} heirlooms. Find all ${Object.keys(HEIRLOOMS).length} for +${LAB_COMPLETE_DIAMONDS} diamonds. Five new varieties open every two levels, and they sell with the crops.`],
   ['visitors','Valley visitors',FEATURE_LEVELS.visitors,`Someone comes up the road with a rush order. Deliver it within 12 hours for ${VISITOR_PREMIUM}× the goods’ price and diamonds. Every visitor served in a row makes the next order 10% bigger and better paid, up to ${VISITOR_STREAK_MAX} in a row; one who leaves unserved, or is sent away, ends the run.`],
   ['giantpumpkin','Giant pumpkin',FEATURE_LEVELS.giantpumpkin,`At the fair, one a week. Tend it every 8 hours; it gains a little more each time, and ${GIANT_FEED_KG} kg more when you feed it ${GIANT_FEED.fertilizer} natural fertilizer. The scale pays ${number(GIANT_COINS_PER_KG)} coins a kilo and diamonds; a new record from ${GIANT_RECORD_MIN} kg adds ${GIANT_RECORD_DIAMONDS}. On Monday it is weighed in by itself.`],
   ['valleyprojects','Valley projects',FEATURE_LEVELS.valleyprojects,'Five big works, three levels each. Hand in the goods bit by bit, then pay the coins to finish a level. Every level adds a lasting bonus.']
  ].map(([picture,name,level,text])=>`<li>${art(picture)}<div><strong>${name} ${h.lvl(level)}</strong><p>${text}</p></div></li>`).join('')}</ul>`)
  +section('Heirlooms',dual(table(['Heirloom','Cross','Opens','Sells for'],heirlooms),heirloomCards))
  +section('Valley projects',dual(table(['Project','Bonus','Each level'],projects),projectCards));
}
const featureTitle=key=>({family:'Farm family',boosts:'Diamond boosts'})[key]??{challenges:'Daily challenges',chores:'Farm chores',stall:'Farm stall',mastery:'Crop mastery',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',activities:'A helping hand',valleymarket:'Valley Market',ranch:'The Ranch',estateworkshop:'Estate Workshop',tradedepot:'Trade Depot',grandfair:'Grand Valley Fair',master:'Master points',seedlab:'Seed Lab',visitors:'Valley visitors',giantpumpkin:'Giant pumpkin',valleyprojects:'Valley projects'}[key]??key;

const RELATED={'getting-started':['crops','daily','quests'],crops:['buildings','market','helpers'],buildings:['crops','market','daily'],market:['buildings','daily','family'],quests:['getting-started','crops','buildings'],daily:['market','events','diamonds'],family:['chat','events','daily'],events:['family','daily','diamonds'],helpers:['crops','estate','buildings'],estate:['helpers','buildings','quests'],diamonds:['daily','events','account'],chat:['family','account','events'],account:['chat','diamonds','getting-started']};

export function wikiArticle(id,ctx={}){
 const topic=TOPIC[id];if(!topic)return null;const h=helpers(ctx);
 return {...topic,html:BODIES[id](h),related:(RELATED[id]??[]).map(r=>TOPIC[r])};
}
export const wikiHero=topic=>`<header class="wiki-hero" style="--tint:${TINTS[topic.id]??'#efe6d8'}"><div><h3>${topic.title}</h3><p>${topic.blurb}</p></div>${art(topic.art)}</header>`;
// The jump bar: one chip per section of the page (a building's chip has its picture).
export function wikiJump(article){
 const chips=[...article.html.matchAll(/<section class="wiki-section[^"]*" id="([^"]+)"><h3>(.*?)<\/h3>/g)].map(([,id,label])=>`<a href="#${id}" data-wiki-jump="${id}">${label}</a>`);
 return chips.length>1?`<nav class="wiki-jump" aria-label="On this page">${chips.join('')}</nav>`:'';
}
export const wikiGroups=(ctx={},{featured=true}={})=>WIKI_GROUPS.map(g=>`<section class="wiki-group"><h3>${g.title}</h3><div class="wiki-tiles">${g.ids.map(id=>wikiTile(TOPIC[id],ctx).replace('class="wiki-tile"',featured&&id==='getting-started'?'class="wiki-tile is-featured"':'class="wiki-tile"')).join('')}</div></section>`).join('');
// "Read next" under a topic: a short row per topic, picture and title.
export const wikiNext=(topic,ctx={})=>{const h=helpers(ctx);return `<a class="wiki-next" href="${h.href(topic.id)}" data-wiki-topic="${topic.id}">${art(topic.art)}<strong>${topic.title}</strong><i aria-hidden="true">›</i></a>`;};
export const wikiTile=(topic,ctx={})=>{const h=helpers(ctx);return `<a class="wiki-tile" href="${h.href(topic.id)}" data-wiki-topic="${topic.id}">${art(topic.art)}<strong>${topic.title}</strong><span>${topic.blurb}</span></a>`;};

// Search: topic titles, blurbs and keywords, plus every crop, building and product by name (pointing to its topic).
const INDEX=[
 ...WIKI_TOPICS.map(t=>({topic:t.id,label:t.title,art:t.art,text:`${t.title} ${t.blurb} ${t.keywords}`.toLowerCase()})),
 ...Object.entries(CROPS).map(([k,c])=>({topic:'crops',label:c.name,art:k,text:c.name.toLowerCase()})),
 ...PLAYER_AVATARS.filter(a=>a.level||avatarGoal(a.id)).map(a=>({topic:'account',label:a.name,art:'settings',text:`${a.name} avatar`.toLowerCase(),anchor:'sec-avatars'})),
 ...Object.entries(BUILDINGS).filter(([,b])=>b.type==='production').map(([k,b])=>({topic:'buildings',label:b.name,art:k,text:b.name.toLowerCase(),anchor:`building-${k}`})),
 ...Object.entries(RECIPES).flatMap(([,r])=>Object.keys(r.output).map(out=>({topic:'buildings',label:itemName(out),art:out,text:itemName(out).toLowerCase(),anchor:`building-${r.building}`})))
];
export function wikiSearch(query){
 const words=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
 const seen=new Set(),hits=[];
 for(const entry of INDEX){if(!words.every(w=>entry.text.includes(w)))continue;const key=`${entry.topic}:${entry.label}`;if(seen.has(key))continue;seen.add(key);hits.push({...entry,topicTitle:TOPIC[entry.topic].title});}
 return hits.slice(0,12);
}
