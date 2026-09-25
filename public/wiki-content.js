import {ACTIVE_STATIONS,CROPS,CROP_LEVELS,BUILDINGS,BUILDING_LEVELS,BUILDING_COSTS,RECIPES,RECIPE_LEVELS,PRODUCTS,ITEMS,FEATURE_LEVELS,FACTORY_LEVEL,FACTORY_COST,MAX_BUILDING_LEVEL,MAX_PLOTS,STARTER_FIELDS,EARLY_FIELDS,MASTERY_TIERS,SILO_COSTS,DAILY_REWARDS,DAILY_DIAMONDS,DELIVERY_LEVELS,DELIVERY_TIERS,REPLACE_ORDER_COST,FAMILY_CONFIG,FAMILY_MIN_LEVEL,BOOSTS,VIP_PLANS,DIAMOND_PACKS,SINGLE_CROP_COST,SINGLE_BATCH_COST,INVITE_REWARD,INVITE_LEVEL,INVITE_DAYS,INVITE_LIMIT,STARTER_LEVEL,IMPROVEMENTS,CHORES,RANCH_HERDS,SWIPE_MAX_FIELDS,BEGINNER_REWARD,ROOKIE_BOOST_MS,ROOKIE_TIMER_BOOST,EMAIL_BONUS} from './farm-state.js';
import {art} from './visual-icons.js';
import {EVENTS_LEVEL,EVENT_DAY_DIAMONDS,PODIUM_PRIZES,FINISHER_PRIZE} from './live-events-ui.js';

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
 {id:'family',title:'Farm family',art:'family-members',blurb:'Playing together: weekly orders, sharing and the tournament.',keywords:'family team guild members tournament sharing invite'},
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
   ['boost','Beginner boost',`When you create your account, waiting times are ${Math.round(ROOKIE_TIMER_BOOST*100)}% shorter. The boost gets smaller quickly at first, then slowly, and is gone after your first ${Math.round(ROOKIE_BOOST_MS/3600000)} hours.`],
   ['gift','A gift every day',`Come back every day for coins and diamonds. See ${h.link('daily')}.`]
  ]))
  +section('Moving around',facts([
   ['farm','Look around','Drag to move the farm. Pinch, or scroll with a mouse, to zoom in and out.'],
   ['harvest','Swipe across fields',`With a tool picked, swipe across your fields to plant, water, care for or harvest many at once, up to ${SWIPE_MAX_FIELDS} in one swipe.`],
   ['care','Tools at the bottom','Pick Plant, Water, Care or Harvest at the bottom of the screen, then tap or swipe your fields.']
  ]))
  +section('Saved for you','<p>Your farm is saved to your account, so you can play on your phone and your computer. You need an internet connection to play.</p>');
 },
 crops(h){
  const regrowing=Object.entries(CROPS).filter(([,c])=>c.regrow).map(([k])=>CROPS[k].name);
  const sorted=Object.entries(CROPS).sort(([a],[b])=>cropLevel(a)-cropLevel(b)||CROPS[a].duration-CROPS[b].duration);
  const rows=sorted.map(([key,c])=>h.row(cropLevel(key),[
   item(key,1),h.lvl(cropLevel(key)),`${art('coins')}${number(c.cost)}`,wikiTime(c.duration),`${art('coins')}${number(c.sell)}`,number(c.xp),c.regrow?`every ${wikiTime(c.regrow)}`:'–',c.use??'–']));
  const cards=sorted.map(([key,c])=>card({picture:key,title:c.name,badge:h.lvl(cropLevel(key)),locked:h.locked(cropLevel(key)),stats:[`Grows in ${wikiTime(c.duration)}`,`Seed ${art('coins')}${number(c.cost)}`,`Sells ${art('coins')}${number(c.sell)}`,`${number(c.xp)} XP`,...(c.regrow?[`Grows back every ${wikiTime(c.regrow)}`]:[])],note:c.use?`Used for ${c.use.toLowerCase()}`:''}));
  const early=EARLY_FIELDS.map(f=>number(f.coins)).join(', ');
  return section('Planting','<p>Pick a crop in the seed shop, then tap an empty field. Quick crops are good while you play; longer ones grow while you are away.</p>')
  +section('Water and care',`<p>A harvest gives 1 crop. Water a field for 2 crops, water and care for 3. Both also make the crop grow faster, and doing both gives double XP.</p>`)
  +section('Trees and bushes',`<p>${regrowing.join(', ')} grow back after you harvest them, so you only plant them once.</p>`)
  +section('More fields',`<p>You start with ${STARTER_FIELDS} fields. While you start out, each new level lets you open one more for coins (${early}). After that the Farmhouse adds fields, up to ${MAX_PLOTS} in total. See ${h.link('buildings')}.</p>`)
  +section('Crop mastery',`<p>${h.lvl(FEATURE_LEVELS.mastery)} Harvest the same crop often for a reward at every tier.</p>`+table(['Tier','Harvests','Reward'],MASTERY_TIERS.map(t=>`<tr><td>${t.name}</td><td>${number(t.target)}</td><td>${art('coins')}${number(t.coins)} · ${number(t.xp)} XP</td></tr>`)))
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Five research steps, each paid with coins (${SILO_COSTS.map(number).join(', ')}). Together they make crops grow up to 40% faster and seeds up to 25% cheaper. Crops already growing keep their time.</p>`)
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
   return `<section class="wiki-section wiki-building" id="building-${key}"><h3>${art(key)}${b.name}</h3><p class="wiki-meta">${h.lvl(buildingLevel(key))}${cost?` · builds for ${art('coins')}${number(cost)}`:' · ready from the start'}</p>${b.tagline?`<p>${b.tagline}</p>`:''}${dual(table(['Makes','Needs','Time','Sells for (each)','Opens'],rows),cards)}</section>`;
  }).join('');
  return section('How buildings work',facts([
   ['buildings','Build',`Each building opens at a level and costs coins once; the ${BUILDINGS.dairy.name} needs the ${BUILDINGS.mill.name} first, the ${BUILDINGS.bakery.name} the ${BUILDINGS.dairy.name} and the ${BUILDINGS.windmill.name}. Tap a building to start a batch: it turns crops (or other goods) into goods that sell for more.`],
   ['hammer','Upgrade',`Better buildings run more batches at the same time, up to level ${MAX_BUILDING_LEVEL}.`],
   ['collect-all','Collect','When a batch is ready, tap the building to collect it, or use Collect all.'],
   ['boost','Factory',`From level ${FACTORY_LEVEL} the Factory (${number(FACTORY_COST)} coins) makes the finest goods from what your other buildings make.`]
  ]))+blocks;
 },
 market(h){
  return section('Selling',facts([
   ['market','Prices change every day','At 00:00 UTC the market sets new prices. Today’s market pick is in high demand and pays extra, and the outlook shows what is wanted tomorrow.'],
   ['coins','Sell some or sell all','Choose how many to sell, or sell all of one crop. The basket at the bottom shows what all your crops are worth.'],
   ['buildings','Goods pay more',`Crops made into goods sell for more than the crops that went in. See ${h.link('buildings')}.`],
   ['quests','Keep what you need',`Orders and your family ask for crops and goods, and often pay more than the market. See ${h.link('daily')} and ${h.link('family')}.`]
  ]))+section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Your stall earns coins by itself. Collect them from time to time.</p>`);
 },
 quests(h){
  const opens=[...Object.entries(FEATURE_LEVELS).map(([key,n])=>[n,featureTitle(key)]),[EVENTS_LEVEL,'Farm events'],[STARTER_LEVEL,'Starter Pack']].sort((a,b)=>a[0]-b[0]);
  return section('Quests',facts([
   ['quests','One little goal at a time','Quests ask for things like harvesting 12 wheat. When one is done, claim its coins and XP.'],
   ['xp','XP and levels',`Almost everything you do gives XP. Each new level opens new crops, buildings and things to do, and the journal shows your level rewards.`]
  ]))+section('What opens when',table(['Level','What opens'],opens.map(([n,name])=>h.row(n,[h.lvl(n),name])))+`<p>New crops and buildings are in ${h.link('crops')} and ${h.link('buildings')}.</p>`);
 },
 daily(h){
  const days=DAILY_REWARDS.map((coins,i)=>`<tr><td>Day ${i+1}</td><td>${art('coins')}${number(coins)}</td><td>${art('diamonds')}${number(DAILY_DIAMONDS[i])}</td></tr>`);
  const tiers=Object.entries(DELIVERY_TIERS).map(([key,t])=>h.row(DELIVERY_LEVELS[key],[t.name,h.lvl(DELIVERY_LEVELS[key]),`${t.minBonus}–${t.maxBonus}% more than the market`]));
  return section('A gift every day',`<p>Open the farm every day and collect your gift. Seven days in a row make a streak; miss a day and it starts over.</p>`+table(['Day','Coins','Diamonds'],days))
  +section('Daily challenges',`<p>${h.lvl(FEATURE_LEVELS.challenges)} Three small goals every day. Finish all three for a bonus.</p>`)
  +section('Delivery orders',`<p>${h.lvl(FEATURE_LEVELS.cart)} Customers ask for crops and goods and pay more than the market. Don’t like an order? Replace it for ${REPLACE_ORDER_COST} diamonds.</p>`+table(['Order','Opens','Pays'],tiers))
  +section('A new day','<p>Gifts, challenges, orders and market prices refresh at 00:00 UTC.</p>');
 },
 family(h){
  return section('Together is better',`<p>${h.lvl(FAMILY_MIN_LEVEL)} Start a Farm family or join one, with up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers. A family can be open to everyone or invite-only.</p>`)
  +section('The family pages',facts([
   ['family-weekly-order','This week',`A big order for the whole family. Everyone delivers what they can. When the whole order is done, everyone who delivered at least ${number(FAMILY_CONFIG.MIN_CONTRIB_POINTS)} points’ worth gets coins, XP and diamonds for what they delivered. Deliveries cannot be taken back.`],
   ['family-sharing','Sharing','Ask your family for crops or goods you need, and send gifts to each other.'],
   ['family-tournament','Tournament',`Every week families compete; your deliveries count as points. First place wins ${number(FAMILY_CONFIG.TOURNAMENT_FIRST_MIN)} diamonds, plus ${FAMILY_CONFIG.TOURNAMENT_PER_EXTRA_FAMILY} for every other family taking part (up to ${number(FAMILY_CONFIG.TOURNAMENT_FIRST_MAX)}); second ${Math.round(FAMILY_CONFIG.RANK_WEIGHTS[1]*100)}% of that, third ${Math.round(FAMILY_CONFIG.RANK_WEIGHTS[2]*100)}%. The prize is shared by what each member delivered.`],
   ['family-members','Members','See who is online and how much everyone did this week. The leader can invite farmers.']
  ]))
  +section('Family chat',`<p>Your family has its own chat. See ${h.link('chat')}.</p>`)
  +section('Changing family',`<p>After you leave a family you can join another after ${Math.round(FAMILY_CONFIG.JOIN_COOLDOWN_MS/3600000)} hours.</p>`);
 },
 events(h){
  return section('Short shared goals',`<p>${h.lvl(EVENTS_LEVEL)} A farm event runs for 5 hours, then there is a 1-hour break before the next one. Everyone plays toward the same goals. Events open as soon as you reach level ${EVENTS_LEVEL}.</p>`)
  +section('How it works',facts([
   ['live-events','Goals','Each event has a few goals, like harvesting or making certain things. Your progress shows in the event window.'],
   ['trophy','Rewards',`Complete every goal and help at least 3 times over 10 minutes to qualify. Everyone who finishes wins coins and diamonds; the sooner you finish, the more. The first three win ${PODIUM_PRIZES.map(p=>p.diamonds).join(', ').replace(/, (\d+)$/,' and $1')} diamonds, every other finisher ${FINISHER_PRIZE.diamonds}. You can collect at most ${EVENT_DAY_DIAMONDS} event diamonds a day.`],
   ['gift','Next event','When an event ends, the window shows when the next one starts and what it gives.']
  ]));
 },
 helpers(h){
  const chores=Object.values(CHORES).map(c=>c.name);
  return section('Tractor',`<p>${h.lvl(FEATURE_LEVELS.tractor)} The tractor plants, waters or harvests all your fields in one go. Planting costs a little fuel on top of the seeds, and afterwards the tractor needs a short rest.</p>`)
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Better seeds: crops grow faster and seeds cost less. See ${h.link('crops')}.</p>`)
  +section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Passive income: your stall earns coins by itself. Collect them now and then.</p>`)
  +section('Farm chores',`<p>${h.lvl(FEATURE_LEVELS.chores)} Small jobs for extra coins and XP, and sometimes a few crops: ${chores.join(', ')}. After a chore it rests before you can do it again: from ${wikiTime(Math.min(...Object.values(CHORES).map(c=>c.cooldown)))} for the quickest to ${wikiTime(Math.max(...Object.values(CHORES).map(c=>c.cooldown)))} for the biggest, which pays the most XP.</p>`)
  +section('A helping hand',`<p>${h.lvl(FEATURE_LEVELS.activities)} Help out at the Greenhouse, the Apiary, the paddock and the workshop for coins, goods and XP. Visit all four stops for a bonus. After its job a stop rests ${wikiTime(Math.min(...Object.values(ACTIVE_STATIONS).map(a=>a.cooldown)))}.</p>`);
 },
 estate(h){
  const later=[['projects','Estate projects','estate','Big projects that make your estate grow.'],['valleymarket','Valley Market','valley-market','Fill baskets for customers from the valley.'],['ranch','The Ranch','ranch',`One herd works faster: ${Object.values(RANCH_HERDS).join(', ')}.`],['estateworkshop','Estate Workshop','estate-workshop','Improvements that last for good.'],['tradedepot','Trade Depot','trade-depot','Fill an export trailer for big rewards.'],['grandfair','Grand Valley Fair','grand-fair','Win ribbons every week.']];
  const list=Object.values(IMPROVEMENTS).sort((a,b)=>a.level-b.level);
  const improvements=list.map(i=>h.row(i.level,[`${art(i.art)}${i.name}`,i.effect,h.lvl(i.level),`${art('coins')}${number(i.coins)} + ${items(i.materials)}`]));
  const improvementCards=list.map(i=>card({picture:i.art,title:i.name,badge:h.lvl(i.level),locked:h.locked(i.level),stats:[i.effect],note:`Costs ${art('coins')}${number(i.coins)} + ${items(i.materials)}`}));
  return section('Something to grow towards',`<ul class="wiki-facts">${later.map(([key,name,picture,text])=>`<li>${art(picture)}<div><strong>${name} ${h.lvl(FEATURE_LEVELS[key])}</strong><p>${text}</p></div></li>`).join('')}</ul>`)
  +section('Estate Workshop improvements',dual(table(['Improvement','What it does','Opens','Costs'],improvements),improvementCards));
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
   ['farm','One farm, everywhere','Sign in on any device and your farm is there. You can also add Harvest Tycoon to your home screen and play it like an app.'],
   ['bell','Reminders','Push or email reminders stay off until you switch them on in Settings.']
  ]))
  +section('Settings',`<p>In Settings you change your farmer name and avatar, sound and music, private messages, reminders and cookies. Forgot your password? Use “Forgot your password?” on the sign-in page.</p>`)
  +section('Confirm your email',`<p>Signed up with your email address? Confirm it once for ${EMAIL_BONUS} diamonds: tap “Confirm your email” in the menu and type the code we send you. Google and Facebook accounts get the diamonds straight away.</p>`)
  +section('Invite a friend',`<p>Share your invite link. When your friend reaches level ${INVITE_LEVEL} within ${INVITE_DAYS} days, you both get ${INVITE_REWARD} diamonds, for up to ${INVITE_LIMIT} friends.</p>`)
  +section('Privacy',`<p>Read how we handle your data in the <a href="/privacy">Privacy Policy</a>. Want to stop? You can <a href="/delete-account">delete your account</a>.</p>`);
 }
};
const featureTitle=key=>({family:'Farm family',boosts:'Diamond boosts'})[key]??{challenges:'Daily challenges',chores:'Farm chores',stall:'Farm stall',mastery:'Crop mastery',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',activities:'A helping hand',valleymarket:'Valley Market',ranch:'The Ranch',estateworkshop:'Estate Workshop',tradedepot:'Trade Depot',grandfair:'Grand Valley Fair'}[key]??key;

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
 ...Object.entries(BUILDINGS).filter(([,b])=>b.type==='production').map(([k,b])=>({topic:'buildings',label:b.name,art:k,text:b.name.toLowerCase(),anchor:`building-${k}`})),
 ...Object.entries(RECIPES).flatMap(([,r])=>Object.keys(r.output).map(out=>({topic:'buildings',label:itemName(out),art:out,text:itemName(out).toLowerCase(),anchor:`building-${r.building}`})))
];
export function wikiSearch(query){
 const words=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
 const seen=new Set(),hits=[];
 for(const entry of INDEX){if(!words.every(w=>entry.text.includes(w)))continue;const key=`${entry.topic}:${entry.label}`;if(seen.has(key))continue;seen.add(key);hits.push({...entry,topicTitle:TOPIC[entry.topic].title});}
 return hits.slice(0,12);
}
