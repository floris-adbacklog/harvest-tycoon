import {EVENT_LEAGUES,CHAPTER_STALL_INCOME,FAIR_CHAMPION_DIAMONDS,QUESTS,QUEST_XP,ACTIVE_STATIONS,CROPS,CROP_LEVELS,BUILDINGS,BUILDING_LEVELS,BUILDING_COSTS,RECIPES,RECIPE_LEVELS,PRODUCTS,ITEMS,FEATURE_LEVELS,FACTORY_LEVEL,FACTORY_COST,MAX_BUILDING_LEVEL,MAX_PLOTS,STARTER_FIELDS,EARLY_FIELDS,MASTERY_TIERS,SILO_COSTS,siloBonus,DAILY_REWARDS,DAILY_DIAMONDS,DAILY_BOOSTS,COIN_PACK,DAILY_BOOST_MS,giftCoins,COMEBACK_MIN_DAYS,COMEBACK_MAX_DAYS,COMEBACK_EVERY_DAYS,COMEBACK_COINS,comebackCoins,DELIVERY_LEVELS,DELIVERY_TIERS,REPLACE_ORDER_COST,FAMILY_CONFIG,FAMILY_MIN_LEVEL,MARKET_PAYOUT_MULTIPLIER,familyOrderPay,FAMILY_ORDER_LINES,FAMILY_ORDER_VALUE,BOOSTS,VIP_PLANS,DIAMOND_PACKS,SINGLE_CROP_COST,SINGLE_BATCH_COST,INVITE_REWARD,INVITE_LEVEL,INVITE_DAYS,INVITE_LIMIT,STARTER_LEVEL,IMPROVEMENTS,CHORES,RANCH_HERDS,SWIPE_MAX_FIELDS,BEGINNER_REWARD,ROOKIE_BOOST_MS,ROOKIE_TIMER_BOOST,EMAIL_BONUS,choreRewards,CHORE_PRACTICE_STEP,ACTIVITY_ROUND_REWARD,HAND_FULL_LEVEL,HAND_REST_PER_LEVEL,FIRST_BATCH_MS,TRACTOR_FUEL_BASE,FULL_CARE_COST,SHIFT_MS,SHIFT_COINS_PER_DIAMOND,TRACTOR_FUEL_PER_FIELD,TRACTOR_FUEL_SHARE,fieldFuel,stallLevel,STALL_MAX_LEVEL,PROJECTS,CHAPTER_DIAMONDS,VALLEY_STALLS,VALLEY_RESTOCK,VALLEY_PREMIUM,RANCH_SPEEDUP,RANCH_SWITCH_COST,DEPOT_PREMIUM,DEPOT_RESTOCK,DEPOT_DIAMONDS,levelReward,DAILY_CHALLENGE_DIAMONDS,DAILY_BONUS,MARKET_RANGES,FAMILY_CHEST_TIERS,FAMILY_CHEST_POINTS,FAMILY_CHEST_MIN,FAMILY_LEVEL_STEPS,FAMILY_LEVEL_BONUS,FAMILY_MAX_COLEADERS,HEIRLOOMS,LAB_YIELD,LAB_DISCOVER_DIAMONDS,LAB_COMPLETE_DIAMONDS,LAB_FULL_BEDS,MILLER_LEVEL,MILLER_ORDER,MILLER_PREMIUM,MILLER_DIAMONDS,millerValue,POND_BOOK_REFILL_MS,VISITOR_STREAK_MAX,VISITOR_PREMIUM,VISITOR_DIAMONDS,GIANT_COINS_PER_KG,GIANT_KG_PER_DIAMOND,GIANT_MAX_DIAMONDS,GIANT_RECORD_DIAMONDS,GIANT_RECORD_MIN,GIANT_FEED,GIANT_FEED_KG,VALLEY_PROJECTS,MASTER_BRANCHES,MASTER_FROM,TOP_XP_FROM,XP_CURVE,FAMILY_EVENT_BONUS,worldTwoBuilding,worldTwoItem,VILLAGE_GOODS,MASTER_UPGRADES,WORLD_TWO_LEVEL,WORLD_TWO_TEASER,TOP_BUILDING_LEVEL,DOUBLE_BATCH_PER_LEVEL,VILLAGE_QUESTS,questXp,VILLAGE_BRIEFS,VILLAGE_BUILD_XP,VILLAGE_UPGRADE_GOODS,VILLAGE_THIRD_BOARD,VILLAGE_REQUEST_BOARDS,VILLAGE_REQUEST_BOARDS_MAX,VILLAGE_REQUEST_WAIT,VILLAGE_XP_SHARE,VILLAGE_PREMIUM,villageRequestValue,upgradeGoods,VILLAGE_WEEK_LEVEL,VILLAGE_WEEK_TARGET,VILLAGE_CRATE_DIAMONDS,VILLAGE_TILES_FROM,VILLAGE_UPGRADE_TILES,VILLAGE_THREE_KINDS,BUILDER_CRATE_COINS,upgradeCost,BOAT_GOODS,BOAT_PREMIUM,BOAT_DIAMONDS,BOAT_DIAMOND_TRIPS,BOAT_XP_SHARE,BOAT_RETURN,BOAT_QUAY_RETURN,boatValue,WORLD_TWO_TOP,VILLAGE_LANDMARKS,VILLAGE_LANDMARK_XP,VILLAGE_HALL_PREMIUM,GREAT_HALL_DIAMONDS,SEASON_PASS,passPhase,passTotals,BOOST_LENGTH_NAMES,expansionCost,expansionMaterials,expansionLevel} from './farm-state.js';
import {art} from './visual-icons.js';
// The Fishing pond (11 Oct 2026): its section, only once the pond is open (POND_OPEN).
import {FAMILY_IDLE_DAYS,FAMILY_IDLE_DEFAULT} from './farm-state.js';
// The farm's pets (20 Oct 2026): their names and finds, for one line in Getting started.
import {PETS,PET_CAT_CROPS,PET_DEER_PLANKS} from './farm-state.js';
import {FEATURE_NAMES,POND_OPEN,POND_LEVEL,POND_START_CASTS,POND_MAX_CASTS,POND_REFILL_MS,POND_PERFECT,POND_NEW_FISH_XP,POND_NEW_FISH_COINS,POND_BOOK_DIAMONDS,POND_LEGEND_BY,FISH,FISH_PAGES,POND_PAGE_TWO_LEVEL,POND_BOOK2_DIAMONDS,POND_STURGEON_BY} from './farm-state.js';
// The village lake (12 Oct 2026, plan D): its section in The Village only, once the lake is open (LAKE_OPEN).
import {LAKE_OPEN,LAKE_LEVEL,LAKE_FISH,LAKE_FISH_PAGES,LAKE_PAGE_TWO_LEVEL,LAKE_BOOK_DIAMONDS,LAKE_BOOK2_DIAMONDS,LAKE_LEGEND_BY,LAKE_GHOST_BY} from './farm-state.js';
// Getting started, longer and clearer (20 Oct 2026): the Beginner guide's own steps and the head start a new farm gets.
import {beginnerProgress,BEGINNER_STEP_XP,STARTER_COINS,ROOKIE_MS,FIRST_HARVEST_BONUS,RETURN_BOOST_MS,WATER_MIN_MS} from './farm-state.js';
import {VILLAGE_SHOP,LANDMARK_COINS_PER_DIAMOND,landmarkFullCost} from './farm-state.js';
import {villageLine} from './village-shop-ui.js';
import {helpCoins,maxShare,SHARE_LIMIT,REQUEST_DAYS} from './social-ui.js';
import {PLAYER_AVATARS,avatarGoal} from './player-avatars.js';
import {EVENTS_LEVEL,EVENT_GOALS} from './live-events-ui.js';
import {EVENT_HOUR_POOLS,EVENT_GOAL_GROUPS} from './event-goals.js';
import {HOUR_EVENT_REWARDS,eventPrizes} from './farm-state.js';
import {portal as portalAround,privacyContact} from './portal.js';
import {androidApp,appPushOffered,playBilling,appStoreBilling,webBilling} from './android.js';
import {wikiLink,parseWikiLink,wikiLinksIn} from './wiki-link.js';
// A link to one spot of the wiki (Oct 2026): public/wiki-link.js, here too for whoever has the wiki at hand.
export {wikiLink,parseWikiLink,wikiLinksIn};

// The farm wiki: the same topics in How to play (public/wiki-ui.js) and on the website (/wiki, scripts/build-wiki.mjs).
// Every number and table comes from the game rules, so a balance change never leaves the wiki behind. In the game, things
// above your level say "From level X"; on the website every level is just shown.
export const WIKI_TOPICS=Object.freeze([
 {id:'getting-started',title:'Getting started',art:'farm',blurb:'The Beginner guide step by step, where to find things, and help when you are stuck.',keywords:'start beginner guide rookie controls swipe sweep zoom tutorial new first steps stuck help buttons phone computer sell money'},
 {id:'crops',title:'Fields and crops',art:'wheat',blurb:'Planting, watering, more fields and every crop in the game.',keywords:'plant water care harvest field seeds grow medals mastery silo trees'},
 {id:'buildings',title:'Buildings and goods',art:'buildings',blurb:'What each building makes, from what, and how long it takes.',keywords:'production recipe goods upgrade factory batch collect'},
 {id:'market',title:'Market',art:'market',blurb:'Selling crops and goods, and prices that change every day.',keywords:'sell price demand coins stall'},
 {id:'quests',title:'Quests and levels',art:'quests',blurb:'Goals, XP, levels and what opens when.',keywords:'xp level unlock journal quest claim'},
 {id:'daily',title:'Daily rewards and orders',art:'gift',blurb:'The daily gift, challenges and delivery orders.',keywords:'streak gift challenges deliveries orders cart commission comeback chest away return'},
 {id:'family',title:'Farm family',art:'family-members',blurb:'Playing together: the Family Chest, weekly orders, sharing and the tournament.',keywords:'family team guild members tournament sharing invite chest level flag join order points stats goods'},
 {id:'events',title:'Events',art:'live-events',blurb:'A short shared goal every hour.',keywords:'event goals qualify podium league'},
 {id:'helpers',title:'Farm helpers',art:'tractor',blurb:'Tractor, silo research, farm stall, chores and a helping hand.',keywords:'tractor silo stall chores helping hand greenhouse apiary paddock workshop'},
 {id:'village',title:'The Village',art:'village-badge',blurb:'World II from level 100: villagers’ requests, the mine, the forest, the smithy and master tools for your farm.',keywords:'village world ii second world mine lumber camp smithy windmill iron silver ruby pickaxe master tools packed lunch stone log plank level 15 double batch travel requests villagers brief golden market square fields potatoes canteen pasty market week crate clay roof tile kiln potter flax linen loft weaver builder crate lavender soap sachet jeweller candlestick pier boat cargo landmark landmarks wind pump longhouse quay lookout tower great hall'},
 {id:'estate',title:'Estate and Valley',art:'estate',blurb:'Big goals for later: projects, the Valley Market and more.',keywords:'estate projects valley market ranch workshop trade depot fair improvements'},
 {id:'diamonds',title:'Diamonds, boosts and VIP',art:'diamonds',blurb:'How to earn diamonds and what they do.',keywords:'diamonds boosts vip shop packs starter pack buy premium'},
 {id:'chat',title:'Chat and house rules',art:'chat',blurb:'Talking with other farmers, and keeping it friendly.',keywords:'chat messages private block report rules moderator moderators admin team staff'},
 {id:'account',title:'Account and settings',art:'settings',blurb:'Your account, settings, invites and privacy.',keywords:'account password settings avatar sound reminders invite delete privacy app feedback bug support help problem'}
]);
const TOPIC=Object.fromEntries(WIKI_TOPICS.map(t=>[t.id,t]));
// The Avatars section of Account and settings. On CrazyGames the one earned with invited friends is left out (no invites there).
const avatarsBody=(portal=false)=>`<p>Pick your avatar in Settings. ${PLAYER_AVATARS.filter(a=>!a.level&&!avatarGoal(a.id)).length} are yours from the start; the others you earn by playing. Until then one shows grey with a lock: tap it to see what it needs.</p>`
 +table(['Avatar','Opens at'],PLAYER_AVATARS.filter(a=>a.level).map(a=>`<tr><td>${avatarCell(a)}</td><td>Level ${a.level}</td></tr>`))
 // The Halloween Pass face (4 Oct 2026) is a purchase: not on CrazyGames, and hidden in our apps (public/android.css .wiki-paid).
 +table(['Avatar','How to earn it'],PLAYER_AVATARS.filter(a=>avatarGoal(a.id)&&!(portal&&(/invite/i.test(avatarGoal(a.id).text)||avatarGoal(a.id).pass))).map(a=>`<tr${avatarGoal(a.id).pass?' class="wiki-paid"':''}><td>${avatarCell(a)}</td><td>${avatarGoal(a.id).text}</td></tr>`))
 +'<p>Diamonds spent and VIP days count from 25 September 2026.</p>';
// How long the Starter Pack is open (game/payments.js STARTER_WINDOW; the wiki test keeps the two equal).
export const STARTER_DAYS=7;
// The home page in three groups; "Getting started" leads as the one to read first.
export const WIKI_GROUPS=Object.freeze([
 {title:'Start here',ids:['getting-started','crops','buildings']},
 {title:'Grow your farm',ids:['market','daily','quests','helpers']},
 {title:'Together and extras',ids:['family','events','chat','diamonds','estate','village','account']}
]);
// Each topic's header has its own soft colour.
const TINTS={'getting-started':'#e3efd6',crops:'#f6e7b8',buildings:'#f3d9cf',market:'#f6dfc4',quests:'#efe4cf',daily:'#f5d9dc',family:'#dcebd3',events:'#e6def0',helpers:'#d8e7f0',estate:'#dbe9e2',village:'#dde6ee',diamonds:'#d9ebf7',chat:'#e1eed8',account:'#ebe5dc'};

const number=n=>Number(n).toLocaleString('en-US');
export function wikiTime(ms){
 const minutes=Math.round(ms/60000);if(minutes<60)return `${minutes} min`;
 const hours=Math.floor(minutes/60),rest=minutes%60;if(hours<24)return rest?`${hours} h ${rest} min`:`${hours} h`;
 const days=Math.floor(hours/24),h=hours%24,d=`${days} ${days===1?'day':'days'}`;return h?`${d} ${h} h`:d;
}
const itemName=key=>ITEMS[key]?.name??PRODUCTS[key]?.name??CROPS[key]?.name??key;
// While a topic is written (wikiArticle): its helpers, so a name in any table can link to where it is explained without every table
// handing them on (Oct 2026). Only set during that one synchronous call.
let scope=null;
// A crop, good or heirloom in a table leads to where it is explained (itemTarget); plain: the row's own name (what it makes, the crop itself).
const item=(key,count,plain=false)=>{const to=!plain&&scope&&itemTarget(key),inner=`${art(key)}<span>${count>1?`${number(count)} `:''}${itemName(key)}</span>`;return to?`<a class="wiki-item" href="${scope.to(...to)}" data-wiki-topic="${to[0]}" data-wiki-anchor="${to[1]}">${inner}</a>`:`<span class="wiki-item">${inner}</span>`;};
const items=list=>Object.entries(list).map(([key,count])=>item(key,count)).join('');
const slug=text=>'sec-'+text.toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const section=(title,body)=>`<section class="wiki-section" id="${slug(title)}"><h3>${title}</h3>${body}</section>`;
// On a phone the long tables become cards (CSS shows one or the other).
const dual=(tableHtml,cards)=>`<div class="wiki-dual">${tableHtml}<ul class="wiki-cards">${cards.join('')}</ul></div>`;
// row: the card stands for a table row with that id (a crop, a field), so a link to the row finds the card on a phone (wiki-ui.js).
const card=({picture,title,badge='',stats=[],note='',locked=false,row=''})=>`<li class="wiki-card${locked?' is-locked':''}"${row?` data-wiki-row="${row}"`:''}>${art(picture)}<div><strong>${title}</strong>${badge}${stats.length?`<div class="wiki-stats">${stats.map(x=>`<span>${x}</span>`).join('')}</div>`:''}${note?`<small>${note}</small>`:''}</div></li>`;
// An avatar in a table: its small picture and its name (the Avatars section).
const avatarCell=a=>`<span class="wiki-avatar"><img src="${a.src}" alt="" width="34" height="36" loading="lazy" decoding="async">${a.name}</span>`;
const table=(head,rows,cls='')=>`<div class="wiki-table-wrap"><table class="wiki-table ${cls}"><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
// The two admins (3 Oct 2026), by name: in the game a tap opens their profile (wiki-ui.js, window.harvestProfiles); on the website, where
// nobody is signed in, the name is plain text.
const ADMINS=Object.freeze({gerard:{id:'c1194a46-dfdf-47f7-abd2-c59279681702',name:'Gerard'},tony:{id:'e8e4c7c3-c06f-408c-9fe6-1cfa7d2b3ae8',name:'Tony'}});
const adminName=(h,a)=>h.level!=null?`<a href="#" class="wiki-profile-link" role="button" data-player-profile="${a.id}" translate="no">${a.name}</a>`:`<span translate="no">${a.name}</span>`;
const facts=list=>`<ul class="wiki-facts">${list.map(([picture,title,text])=>`<li>${art(picture)}<div><strong>${title}</strong><p>${text}</p></div></li>`).join('')}</ul>`;

export const cropLevel=key=>CROP_LEVELS[key]??CROPS[key].minLevel??1;
export const buildingLevel=key=>BUILDING_LEVELS[key]??BUILDINGS[key].minLevel??1;
export const recipeLevel=key=>{const r=RECIPES[key];return r.building==='factory'?Math.max(FACTORY_LEVEL,RECIPE_LEVELS[r.base]??1):RECIPE_LEVELS[key]??buildingLevel(r.building);};
// World II (30 Sep 2026): the village's places and everything made for or from it (packed lunches, the heirloom-flour bakes) have
// their own topic, The Village; the farm's topics leave them out.
const worldTwoRecipe=r=>worldTwoBuilding(r.building)||Object.keys(r.output).some(worldTwoItem);
// Where a name in a table leads (Oct 2026): a crop to its row in Every crop, a good to the building that makes it (its row opens; the
// village's goods and the farm's goods for the village as in search), an heirloom to Heirlooms. [topic, spot]; null: plain text.
const MADE_AT=new Map();
for(const r of Object.values(RECIPES))if(r.building!=='factory')for(const out of Object.keys(r.output))if(!MADE_AT.has(out))MADE_AT.set(out,worldTwoRecipe(r)?['village',worldTwoBuilding(r.building)?`building-${r.building}`:'sec-made-on-the-farm']:['buildings',`building-${r.building}`]);
const itemTarget=key=>CROPS[key]?['crops',`crop-${key}`]:HEIRLOOMS[key]?['estate','sec-heirlooms']:MADE_AT.get(key)??null;

// ctx: {level: the player's level, or null on the website; href: id => link to a topic; now: the moment (seasonal sections, the
// Halloween Pass); portal: true in the game on CrazyGames (Oct 2026, public/portal.js; read from the page around the game when not
// given), where the parts about buying, inviting, sharing, email, reminders, the app and our website are left out, as the game itself
// leaves them out there; app: true in our Android app (Oct 2026, public/android.js; read from the page when not given), where only the
// parts about buying and installing the web app are left out; appPush: in the app, its own notifications are offered (src/app-push.js,
// once notify-hourly's config says appPush; read from the page around the game when not given), else push reminders are left out too;
// play, appStore: in the app, it sells through Google Play or the App Store (app 1.1, Oct 2026; read from the page when not given); web:
// the Galaxy Store app, which sells through Stripe like the website (Oct 2026)}.
function helpers(ctx){
 const around=ctx.portal??portalAround(),level=ctx.level??null,href=ctx.href??(id=>`/wiki/${id}`),now=ctx.now??Date.now(),portal=Boolean(around),app=Boolean(ctx.app??androidApp());
 // Which portal (Oct 2026): Kongregate and Discord have their own lines where CrazyGames' talk about guests and CrazyGames' log-in
 // (the portal, or its name such as portal:'kongregate'; portal:true is CrazyGames, as before). signedIn: those lines, else null.
 const name=typeof around==='string'?around:around?.name,signedIn=Object.hasOwn(SIGNED_IN,name??'')?SIGNED_IN[name]:null;
 // kreds: Kongregate once it sells with Kreds (15 Oct 2026, its portal's payments on; off until Kongregate says yes): its own shop lines.
 const kreds=name==='kongregate'&&around?.features?.payments===true;
 const appPush=app&&Boolean(ctx.appPush??appPushOffered()),play=app&&Boolean(ctx.play??playBilling()),appStore=app&&Boolean(ctx.appStore??appStoreBilling()),web=app&&Boolean(ctx.web??webBilling());
 // to: a link to a spot (Oct 2026). On the website the address itself (/wiki/crops#crop-wheat); in the game the topic's own href (never
 // our site: CrazyGames allows no links to it), the spot rides along in data-wiki-anchor.
 const to=(id,anchor='')=>ctx.href?ctx.href(id):`/wiki/${id}${anchor?`#${anchor}`:''}`;
 const locked=n=>level!=null&&n>level;
 const lvl=n=>`<span class="wiki-level${locked(n)?' is-locked':''}">${locked(n)?'From level':'Level'} ${n}</span>`;
 const row=(n,cells,id='')=>`<tr${id?` id="${id}"`:''}${locked(n)?' class="is-locked"':''}>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
 // anchor: the spot on that topic (Oct 2026), so a link lands on the paragraph it means rather than the top.
 const link=(id,text=TOPIC[id].title,anchor='')=>`<a href="${to(id,anchor)}" data-wiki-topic="${id}"${anchor?` data-wiki-anchor="${anchor}"`:''}>${text}</a>`;
 // shop: our own purchases are there (not on CrazyGames, not in an app that sells nothing; the app 1.1 sells through its store, Oct
 // 2026: Google Play in the Android app, play; the App Store in the iPhone app, appStore; Kongregate with Kreds, kreds); install:
 // installing the web app is.
 return {level,href,to,locked,lvl,row,link,now,portal,signedIn,crazygames:portal&&!signedIn,app,appPush,play,appStore,web,kreds,shop:(!portal||kreds)&&(!app||play||appStore||web),install:!portal&&!app};
}
// On CrazyGames: what is saved where, and the one link allowed (our Privacy Policy, in full).
const PORTAL_SAVED='<p>Your farm is saved on our server. As a guest it stays with this browser; log in with CrazyGames to keep it safe and play it on any device. You need an internet connection to play.</p>';
const PORTAL_PRIVACY='<p>Read how we handle your data in our <a href="https://www.harvesttycoon.com/privacy" target="_blank" rel="noopener">Privacy Policy</a>.</p>';
// On Kongregate and Discord (Oct 2026): a farm is always that of a player signed in there (Kongregate's guests get the Register page,
// Discord has none), and both ask for who to write to about privacy beside the policy. Each its own lines, by the portal's name.
const SIGNED_IN=Object.freeze({
 kongregate:{saved:'<p>Your farm is saved on our server with your Kongregate account: sign in to Kongregate on any device to play it. You need an internet connection to play.</p>',
  farm:['farm','Your farm on Kongregate','Your farm belongs to your Kongregate account: sign in to Kongregate on any device and it is there.']},
 discord:{saved:'<p>Your farm is saved on our server with your Discord account: open the game in Discord on any device to play it. You need an internet connection to play.</p>',
  farm:['farm','Your farm on Discord','Your farm belongs to your Discord account: open the game in Discord on any device and it is there.']}
});
const signedInPrivacy=()=>`${PORTAL_PRIVACY}<p>${privacyContact()}</p>`;
const PORTAL_BLURBS=Object.freeze({account:'Your account, settings and privacy.'});
// The Halloween Pass (Oct 2026): from its preview until the collecting week ends, every number and date from SEASON_PASS
// (farm-state.js). Its dates as "23 October" (UTC, as the daily reset).
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const passDay=ms=>{const d=new Date(ms);return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;};
const DAY=86400000;
// When the paid rewards can be bought: already before the season (the pre-sale, Oct 2026), until it ends; nothing after.
function passSale(now){
 const phase=passPhase(now);
 return phase==='soon'?`You can buy it already; it starts on ${passDay(SEASON_PASS.startsAt)}.`:phase==='open'?`You can buy it until ${passDay(SEASON_PASS.endsAt-DAY)}.`:'';
}
function passSection(h){
 if(passPhase(h.now)==='over')return '';
 const P=SEASON_PASS,p=P.points,totals=passTotals(),price=`€${(P.cents/100).toFixed(2)}`;
 const reward=r=>r.coins?`${art('coins')}${r.coins} × your level`:r.diamonds?`${art('diamonds')}${number(r.diamonds)}`:r.items?items(r.items)
  :r.boost?`<span class="wiki-boost">${art(BOOSTS[r.boost].art)}<span>${BOOSTS[r.boost].name}<small>${BOOST_LENGTH_NAMES[r.length]}</small></span></span>`:r.vipDays?`${art('vip')}${r.vipDays} days of VIP`:'–';
 const rows=P.tiers.map((t,i)=>`<tr><td>${i+1}</td><td>${reward(t.free)}</td><td>${reward(t.paid)}</td></tr>`);
 return section(P.name,`<p>${h.lvl(P.level)} From ${passDay(P.startsAt)} to ${passDay(P.endsAt-DAY)}. Every daily gift gives ${p.gift} lanterns, every daily challenge and every delivery ${p.daily}. Every ${P.perTier} lanterns open the next of ${P.tiers.length} tiers. Collect each reward with its own button, until ${passDay(P.claimUntil-DAY)}.</p>`
  +(!h.shop?`<p>Rewards: coins that grow with your level, pumpkins, pumpkin pies and ${totals.freeBoostMinutes.join(' and ')}-minute boosts.</p>`+table(['Tier','Reward'],P.tiers.map((t,i)=>`<tr><td>${i+1}</td><td>${reward(t.free)}</td></tr>`))
  // On Kongregate (Kreds, 15 Oct 2026) a sentence of its own: the price is Kongregate's, in Kreds, and the shop shows it.
  :`<p>${h.kreds?`Free: coins that grow with your level, pumpkins, pumpkin pies and ${totals.freeBoostMinutes.join(' and ')}-minute boosts. With Kreds the paid rewards open too: ${number(totals.diamonds)} diamonds, ${totals.vipDays} days of VIP, ${totals.boosts} boosts, pies and more coins. Tiers you already reached open at once.`
   :`Free: coins that grow with your level, pumpkins, pumpkin pies and ${totals.freeBoostMinutes.join(' and ')}-minute boosts. For ${price} the paid rewards open too: ${number(totals.diamonds)} diamonds, ${totals.vipDays} days of VIP, ${totals.boosts} boosts, pies and more coins. Tiers you already reached open at once.`}</p>`+(passSale(h.now)?`<p>${passSale(h.now)}</p>`:'')
  +table(['Tier','Free','Paid'],rows)));
}

// A building's section: its recipes as a table (cards on a phone). The Buildings topic and The Village share it.
function buildingBlock(h,key,recipes){
 const b=BUILDINGS[key],sellOf=out=>(PRODUCTS[out]??VILLAGE_GOODS[out])?.sell;
 if(!recipes.length)return '';
 const cost=key==='factory'?FACTORY_COST:BUILDING_COSTS[key],brief=VILLAGE_BRIEFS.find(x=>x.place===key);
 // A village recipe with a coin price (the Village Fields' sowing, Oct 2026) shows its coins with its goods. The farm's rows stay as they
 // were (the Glasshouse keeps its row: nothing a farm below level 100 can see changes).
 const needs=r=>items(r.input)+(r.coins&&worldTwoRecipe(r)?`<span class="wiki-item">${art('coins')}<span>${number(r.coins)} coins</span></span>`:'');
 const rows=recipes.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0]??[];return h.row(recipeLevel(id),[out?item(out,count,true):r.name,needs(r),wikiTime(r.duration),out&&sellOf(out)?`${art('coins')}${number(sellOf(out))}`:'–',h.lvl(recipeLevel(id))]);});
 const cards=recipes.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0]??[];return card({picture:out??key,title:out?`${count>1?`${number(count)} `:''}${itemName(out)}`:r.name,badge:h.lvl(recipeLevel(id)),locked:h.locked(recipeLevel(id)),stats:[wikiTime(r.duration),...(out&&sellOf(out)?[`Sells ${art('coins')}${number(sellOf(out))} each`]:[])],note:`Needs ${needs(r)}`});});
 // Closed, a building is one row: its picture, name, level and cost, and small pictures of what it makes; open, its recipes.
 // The level badge and the cost stand apart, with room between them (7 Oct 2026: no middle dot; the wiki on the website has no
 // page translation to take it off, public/i18n.js undot).
 const made=[...new Set(recipes.map(([,r])=>Object.keys(r.output)[0]).filter(Boolean))];
 return closedRow(`building-${key}`,art(key)+b.name,`${h.lvl(buildingLevel(key))}${cost?` Builds for ${art('coins')}${number(cost)}${brief?` + ${Object.entries(brief.goods).map(([k,n])=>item(k,n,true)).join('')}`:''}`:' Ready from the start'}`,`${made.slice(0,6).map(out=>art(out)).join('')}${made.length>6?`<small>+${made.length-6}</small>`:''}`,
  `${b.tagline?`<p>${b.tagline}</p>`:''}${key==='factory'?'<p>The biggest batches are shown. Yours are twice the level of the building that normally makes the good (its level for goods that take over an hour).</p>':''}${dual(table(['Makes','Needs','Time','Sells for (each)','Opens'],rows),cards)}`);
}
// One closed row (a building, the Farmhouse, the Family Hall): its heading, a line under it, small pictures and what opens.
const closedRow=(id,heading,meta,makes,body)=>`<details class="wiki-section wiki-building" id="${id}"><summary><h3>${heading}</h3><span class="wiki-meta">${meta}</span><span class="wiki-makes" aria-hidden="true">${makes}</span><i class="wiki-open-mark" aria-hidden="true"></i></summary><div class="wiki-building-body">${body}</div></details>`;
// The Pier (Oct 2026, from level 144) makes nothing: its row says what the town boat takes and pays, by level (boatValue).
function pierBlock(h){
 const key='pier',b=BUILDINGS[key],brief=VILLAGE_BRIEFS.find(x=>x.place===key),level=buildingLevel(key);
 const rows=[...new Set([level,150,160,170,180,190,WORLD_TWO_TOP])].map(n=>{const value=boatValue(n);return h.row(n,[n===WORLD_TWO_TOP?`${number(n)}+`:number(n),`${art('coins')}${number(value)}`,`${art('coins')}${number(Math.ceil(value*BOAT_PREMIUM/100)*100)} and ${number(Math.round(value/BOAT_XP_SHARE))} XP`]);});
 return closedRow(`building-${key}`,art(key)+b.name,`${h.lvl(level)} Builds for ${art('coins')}${number(BUILDING_COSTS[key])} + ${Object.entries(brief.goods).map(([k,n])=>item(k,n,true)).join('')}`,`${BOAT_GOODS.slice(0,6).map(k=>art(k)).join('')}<small>+${BOAT_GOODS.length-6}</small>`,
  `<p>${b.tagline}</p><p>The town boat asks for three or four of these goods, from places you have built:</p><p>${BOAT_GOODS.map(k=>item(k)).join('')}</p>`
  +`<p>Load the boat bit by bit: what you load stays loaded. A full boat sails at once and pays ${BOAT_PREMIUM} times what its goods are worth and a ${BOAT_XP_SHARE}th of it in XP, whatever coin boosts you have. Diamonds come with the first ${BOAT_DIAMOND_TRIPS} trips each week: ${BOAT_DIAMONDS} a boat. It is back ${BOAT_RETURN/3600000} hours later (${BOAT_QUAY_RETURN/3600000} with the ${VILLAGE_LANDMARKS.stonequay.name}). A cargo with nothing loaded yet can be turned down; the next one comes after the same wait.</p>`
  +table(['Level','A cargo is worth about','Pays'],rows));
}
// The Farmhouse and the Family Hall (Oct 2026): they make nothing, so the production rows left them out, while the game keeps sending
// farmers there ("buy it at the Farmhouse", the quest "Expand your fields at the Farmhouse"). Every field from the rules (expansionLevel,
// expansionCost, expansionMaterials), so a balance change never leaves the table behind. A field opens at its own level or at the one
// before it, whichever is higher: fields 13-28 ask no level of their own, but come after field 12.
export function wikiFields(){
 let need=1;
 return Array.from({length:MAX_PLOTS-STARTER_FIELDS},(_,i)=>{const farm={plots:{length:STARTER_FIELDS+i}};need=Math.max(need,expansionLevel(farm));return {field:STARTER_FIELDS+i+1,level:need,coins:expansionCost(farm),materials:expansionMaterials(farm)};});
}
// Field 13 is the first that counts as an expansion: the one that raises the Farmhouse level (farm-state.js expandFarm).
const FIRST_COUNTED_FIELD=STARTER_FIELDS+EARLY_FIELDS.length+1;
function farmhouseBlock(h){
 const fields=wikiFields(),needs=f=>Object.keys(f.materials).length?items(f.materials):'';
 const rows=fields.map(f=>h.row(f.level,[`Field ${f.field}`,h.lvl(f.level),`${art('coins')}${number(f.coins)}`,needs(f)||'–']));
 const cards=fields.map(f=>card({picture:'seeds',title:`Field ${f.field}`,badge:h.lvl(f.level),locked:h.locked(f.level),stats:[`${art('coins')}${number(f.coins)}`],note:needs(f)&&`Needs ${needs(f)}`}));
 return closedRow('building-farmhouse',art('farmhouse')+BUILDINGS.farmhouse.name,`${h.lvl(1)} Ready from the start`,'',facts([
  ['seeds','Expand your fields',`You start with ${STARTER_FIELDS} fields. Buy more here, one at a time, up to ${MAX_PLOTS}.`],
  ['harvest','Your fields','Remove a crop to free its field. You get nothing back.'],
  ['estate',`Your next chapter ${h.lvl(FEATURE_LEVELS.projects)}`,`Estate projects, passive income and medals <span class="wiki-see">See ${h.link('estate',TOPIC.estate.title,'sec-estate-chapters')}.</span>`]
 ])+`<p>The Farmhouse level goes up by 1 with every field from field ${FIRST_COUNTED_FIELD} on. You do not upgrade it, and it gives no bonus of its own.</p>`+dual(table(['Field','Opens','Coins','Needs'],rows),cards));
}
function familyHallBlock(h){
 const b=BUILDINGS.familyhall;
 return closedRow('building-familyhall',art('familyhall-model')+b.name,h.lvl(FAMILY_MIN_LEVEL),'',`<p>${b.tagline}</p><p>Tap it on your farm to open your Farm family: start or join one, fill the Family Chest, deliver the weekly order and share with your family. <span class="wiki-see">See ${h.link('family')}.</span></p>`);
}
const BODIES={
 // 20 Oct 2026, the owner: "Maak de wiki aan de slag langer en duidelijker". In the order a new farmer meets things: the loop, the
 // buttons (the guide's steps name them), the Beginner guide step by step (most new farms stop at its first sale, then its first
 // harvest), the fields, the head start, coins and levels, the first levels, what to do next, coming back, and answers to what new farmers ask most. Every number
 // from the rules; a step the guide gets later without help text here shows the game's own line.
 'getting-started'(h){
  const loop=[['seeds','Plant'],['harvest','Harvest'],['buildings','Make'],['market','Sell']].map(([p,l],i)=>`${i?'<i class="wiki-arrow" aria-hidden="true">›</i>':''}<li>${art(p)}<span>${l}</span></li>`).join('');
  // "See X." as a text of its own, so the sentence before it keeps its translation.
  const see=(id,anchor='',text=TOPIC[id].title)=>` <span class="wiki-see">See ${h.link(id,text,anchor)}.</span>`;
  const coop=BUILDINGS.coop.name,steps=beginnerProgress({});
  const stepHelp={
   harvest:'Your corn is ripe. Tap a ripe field to harvest it, or sweep across all of them.',
   sell:'Tap Market and sell the corn you just harvested. Your first sale pays double.',
   plant:`Pick Wheat with the seed button at the bottom, then tap an empty field. Wheat seeds cost ${CROPS.wheat.cost} coins.`,
   water:`Plant wheat, choose Water and tap the new crop within ${wikiTime(WATER_MIN_MS)}. Water makes it grow faster and gives one more crop.`,
   produce:`Tap the ${coop} on your farm, or open Buildings. Choose ${RECIPES.eggs.name} and tap Start batch. Your starting feed is for this.`,
   gift:'Open Today and tap Collect. On a phone, Today is in More. Come back tomorrow for the next gift.',
   sell_egg:`When the label over the ${coop} turns yellow, tap it to collect your eggs. Then open Market, tap Farm goods and sell an egg.`,
   tend:'When the label on a growing crop glows gold, choose Care and tap the crop. Care gives one more crop too.',
   hand:`Tap the ${ACTIVE_STATIONS.greenhouse.name} on your farm and water the dry seedlings.`,
   collect:`Collect a finished batch from any building, then tap Claim ${BEGINNER_REWARD} diamonds.`
  };
  // Levels 1 to 20 as What opens when shows them (opensByLevel), plus what a level-1 farm has and the fields that cost only coins.
  const FIRST_LEVELS=20,opens=opensByLevel(h.app||h.portal&&!h.kreds,1),at=n=>opens.get(n)??opens.set(n,[]).get(n);
  at(1).push({picture:'quests',name:'Quests',to:['quests','sec-quests']},{picture:'gift',name:'A gift every day',to:['daily','sec-a-gift-every-day']});
  EARLY_FIELDS.forEach((f,i)=>at(f.level).push({picture:'seeds',name:`Field ${STARTER_FIELDS+i+1}`,to:['buildings','building-farmhouse']}));
  const levelRows=[...opens].filter(([n])=>n<=FIRST_LEVELS).sort((a,b)=>a[0]-b[0]).map(([n,list])=>h.row(n,[h.lvl(n),`<span class="wiki-opens">${list.map(e=>openChip(h,e)).join('')}</span>`]));
  const firstField=STARTER_FIELDS+1,lastEarly=STARTER_FIELDS+EARLY_FIELDS.length;
  // Reminders only where Settings has them: not on the portals, and in our apps once they offer their own notifications.
  const reminders=!h.portal&&(!h.app||h.appPush);
  return section('The whole game in four steps',`<ol class="wiki-loop">${loop}</ol><p>Plant crops, harvest them, turn them into goods in your buildings and sell them at the ${h.link('market')}.</p>`)
  +section('Where to find things',facts([
   ['farm','Look around','Drag the grass to move the farm. With a mouse, a drag with the right button moves it from anywhere; before your first harvest only that one does. Pinch, or scroll with a mouse, to zoom in and out.'],
   // public/mobile.css (the bottom bar), public/event-rail.js (Today and Events at the side while something waits there).
   ['farmhouse','On a phone','The bar at the bottom has My farm, Buildings, Market, Quests and More. Today and Events are in More; when something waits there, a round button shows it at the side of your farm. At the top you see your level, coins and diamonds.'],
   ['market','On a computer','The buttons at the side of the screen open Today, My farm, Buildings, Market, Quests and More. At the top you see a map of your farm, your level, coins and diamonds. Click a spot on the map to look there.'],
   ['guide','More','More holds everything else, like How to play, Settings and Feedback. What opens at a higher level waits under Coming later, with the level it needs. A ! on a button means something waits there.']
  ]))
  // 11 Oct 2026 (Part A): the guide shows the way to every step by itself (A12), and the next goal comes after it (A13).
  +section('Beginner guide',`<p>The Beginner guide shows you the farm in ${steps.length} small steps. Each step gives ${BEGINNER_STEP_XP} XP. You never have to do a step twice. Not sure what to do? Tap Show me and the guide shows you where to tap.</p>`
   +'<p>On a computer the guide is a card on the screen. On a phone it is the line at the top: tap it to see every step.</p>'
   +`<ol class="wiki-list">${steps.map(q=>`<li><strong>${q.title}</strong><br>${stepHelp[q.id]??q.description}</li>`).join('')}</ol>`
   +`<p>After the last step you get ${BEGINNER_REWARD} diamonds. Then the Next goal card takes the guide’s place and shows one thing to do next.${see('quests','sec-quests')}</p>`)
  +section('Working your fields',facts([
   ['corn','Ripe or growing?','A ripe field shows only a picture of its crop. A growing field shows a label with a ring and the time left. When that label glows gold, the crop is ready for care.'],
   ['care','Tools at the bottom','Pick Plant, Water, Care or Harvest at the bottom of the screen, then tap or swipe your fields. The seed button beside them picks the crop you plant. On a computer, keys 1 to 4 pick the tools.'],
   ['seeds','What a tap does','You don’t have to switch tools all the time. A tap plants an empty field and harvests a ripe one. On a growing crop it gives water or care when the crop can use it.'],
   // Mouse first, then touch (Oct 2026): every field is worked the moment you pass it, and the whole sweep is saved at once.
   ['harvest','Swipe across fields',`With a mouse, hold the button on a ripe crop and sweep across your fields: every ripe crop you pass is harvested on the spot, up to ${SWIPE_MAX_FIELDS} in one sweep. From an empty field a sweep plants your seed, and from a growing crop it waters or gives extra care. Before your first harvest, a mouse sweep harvests the ripe crops it crosses, wherever it starts. On a touchscreen, hold a field for a moment until it lights up, then swipe across your fields. A quick swipe moves the farm instead.`],
   ['water','Water and care',`A harvest gives 1 crop. Water a field for 2 crops, water and care for 3. Both also make the crop grow faster, and doing both gives double XP. Water right after planting; care comes later, when the label glows gold.${see('crops','sec-water-and-care')}`]
  ]))
  +section('Help at the start',facts([
   ['coins','What you start with',`${number(STARTER_COINS)} coins and ${STARTER_FIELDS} fields, some already planted. Your barn holds some crops and animal feed to begin with.`],
   ['double-harvest','A big first harvest',`Your very first harvest gives ${FIRST_HARVEST_BONUS} times the crop.`],
   // The three goods of STARTER_KEEP (farm-state.js), named here in words.
   ['market','Kept for your first buildings',`The corn, feed and barley you start with are kept for your first buildings during your first ${ROOKIE_MS/60000} minutes. What you harvest or make sells right away.`],
   ['boost','Beginner boost',`When you start your farm, waiting times for crops and batches are ${Math.round(ROOKIE_TIMER_BOOST*100)}% shorter. The boost gets smaller evenly, hour by hour, and stops after your first ${Math.round(ROOKIE_BOOST_MS/3600000)} hours. On a computer, the hourglass at the top shows how much is left.`],
   // The same fact as in Buildings and goods (farm-state.js batchDuration).
   ['eggs','A quick first batch',`The first batch in each new building is ready in ${FIRST_BATCH_MS/1000} seconds. After that every batch takes its usual time.`]
  ]))
  +section('Coins, XP and diamonds',facts([
   ['coins','Coins','You earn coins by selling at the Market, and from quests, the daily gift and new levels. You spend them on seeds, buildings, more fields and upgrades.'],
   ['xp','XP','Harvests, finished batches, guide steps, most quests and the daily gift give XP. Selling at the Market gives no XP.'],
   ['trophy','New levels',`Enough XP brings a new level. Every level gives coins and diamonds, and opens new crops, buildings or things to do. A message tells you what opened and where to find it.${see('quests','sec-level-rewards')}`],
   ['log','Farm journal','Tap your level at the top to open the Farm journal. It shows how much XP you still need, your next level reward and what opens next.'],
   ['diamonds','Diamonds',`You get ${BEGINNER_REWARD} for the Beginner guide, and more from the daily gift, daily challenges and new levels.${see('diamonds','sec-earning-diamonds')}`],
   ['boost','What diamonds do',`From level ${FEATURE_LEVELS.cart}, diamonds can replace a delivery order. From level ${FEATURE_LEVELS.boosts}, they also buy boosts and finish a crop or a batch at once.${see('diamonds','sec-boosts')}`]
  ]))
  +section(`Your first ${FIRST_LEVELS} levels`,`<p>Every level opens something new. Tap a name to read more.${see('quests','sec-what-opens-when','What opens when')}</p>`+table(['Level','What opens'],levelRows,'wiki-opens-table'))
  +section('What to do next',facts([
   ['quests','Quests',`Small goals that pay coins and XP. When one is done, open Quests and claim it. You claim them one at a time.${see('quests','sec-quests')}`],
   ['trophy','Next goal','After the Beginner guide, the Next goal card shows one thing to do, like a quest to claim, something to build, a field to buy or your next level. On a phone it is the line at the top.'],
   ['xp',`Daily challenges ${h.lvl(FEATURE_LEVELS.challenges)}`,`${DAILY_CHALLENGE_DIAMONDS.length} small goals every day, in Today. Each pays coins, XP and diamonds.${see('daily','sec-daily-challenges')}`],
   ['helping-hand',`A helping hand ${h.lvl(FEATURE_LEVELS.activities)}`,`${Object.keys(ACTIVE_STATIONS).length} stops on your farm each have a small job. Help at a stop for goods and XP, then it rests for a while. Help at all of them for a bonus in coins.${see('helpers','sec-a-helping-hand')}`],
   ['cart',`Delivery orders ${h.lvl(FEATURE_LEVELS.cart)}`,`Customers ask for crops and goods and pay more than the Market. Tap the cart on your farm, or open Delivery orders in Today.${see('daily','sec-delivery-orders')}`],
   // The farm's pets (20 Oct 2026, farm-state.js PETS): one line, the rule and what each brings.
   ['coins','The farm’s pets',`Pat ${PETS.dog.name} the dog and ${PETS.cat.name} the cat by the Farmhouse once an hour for a small find: coins from ${PETS.dog.name}, ${PET_CAT_CROPS} crops from ${PETS.cat.name}. From level ${WORLD_TWO_LEVEL}, ${PETS.deer.name} the deer in the village brings ${PET_DEER_PLANKS} planks.`]
  ]))
  +section('Coming back',facts([
   ['instant-harvest','Your farm keeps growing','Crops and batches keep growing while the game is closed. Nothing spoils: a ripe crop waits on its field until you harvest it.'],
   ['corn','Before you go',`Wheat grows in ${wikiTime(CROPS.wheat.duration)}, corn in ${wikiTime(CROPS.corn.duration)}. Plant quick crops while you play and longer ones before you go, and start a batch in every building.`],
   ['gift','A gift every day',`Collect your gift in Today every day: coins, diamonds and XP. Each day in a row makes it bigger, up to day ${DAILY_REWARDS.length}. Your second gift also brings ${RETURN_BOOST_MS/60000} minutes of double harvest.${see('daily','sec-a-gift-every-day')}`],
   ['farmhouse','Welcome back','Back after a while? Welcome back shows what is ready, and today’s gift if you have not collected it yet. Its button takes you straight to what waits.'],
   ['family-chest-wood','Back after a few days',`Away for ${COMEBACK_MIN_DAYS} days or more? A comeback chest waits for you in Welcome back, at most once every ${COMEBACK_EVERY_DAYS} days.${see('daily','sec-back-after-a-while')}`],
   ...(reminders?[['bell','Reminders',`Switch on reminders in Settings, and the game tells you when your crops and goods are ready and when your daily gift waits.${see('account','sec-your-account')}`]]:[])
  ]))
  // What new farmers ask most (20 Oct 2026: the farms that stopped in the guide, and new players' questions in chat and Feedback).
  +section('Need help?',facts([
   ['market','I can’t sell my corn',`The corn you start with is kept for your first buildings during your first ${ROOKIE_MS/60000} minutes. Harvest some corn and sell that: it sells right away.${see('market','sec-selling')}`],
   ['corn','A tap does not harvest','Only a ripe field can be harvested: it shows only a picture of its crop, with no ring or time. A field with a ring and a time is still growing.'],
   ['water','Water does nothing',`A crop takes water only while it is young. Plant a new crop and water it right away.${see('crops','sec-water-and-care')}`],
   ['buildings','Where do I make goods?',`Tap a building on your farm, or open Buildings. Choose what to make and tap Start batch. When its label turns yellow, tap it to collect.${see('buildings','sec-how-buildings-work')}`],
   ['eggs','Where do I sell eggs?',`Open Market and tap Farm goods. Eggs, milk and everything else your buildings make are sold there.${see('market','sec-selling')}`],
   ['seeds','How do I get more fields?',`Fields ${firstField} to ${lastEarly} cost only coins and open at levels ${EARLY_FIELDS[0].level} to ${EARLY_FIELDS.at(-1).level}. Open Buildings, then the Farmhouse, and tap Unlock 1 field. From field ${FIRST_COUNTED_FIELD} a field also asks for crops and goods.${see('buildings','building-farmhouse','Farmhouse')}`],
   ['coins','Can I earn real money?','No. Coins and diamonds are only for the game. You cannot change them into real money.'],
   ['diamonds','What are diamonds for?',`From level ${FEATURE_LEVELS.boosts}: boosts, and finishing a crop or a batch at once. From level ${FEATURE_LEVELS.cart} you can also replace a delivery order.${see('diamonds')}`],
   ['settings','How do I change my name or avatar?',`Open Settings in More. There you change your farmer name and your avatar.${see('account','sec-settings')}`],
   // Support, 20 Oct 2026: farmers who signed in another way landed on a new level-1 farm. Not on the portals, which sign in for you.
   ...(h.portal?[]:[['farm','My farm is gone',`Sign out and sign in again the way you did before. Signing in another way can start a new farm. At the top of Settings, Your account shows how you are signed in.${see('account','sec-settings')}`]])
  ]))
  +section('Saved for you',h.signedIn?h.signedIn.saved:h.portal?PORTAL_SAVED:'<p>Your farm is saved to your account, so you can play on your phone and your computer. You need an internet connection to play.</p>')
  +(!h.install?'':section('Play it as an app',facts([
   ['farm','Why the app','One tap from your home screen, without the browser bar. Reminders when your farm needs you, a number on the icon for new messages, and press and hold the icon for Chat, Daily gift and the leaderboard.']
  ])+'<ul class="wiki-list wiki-app-steps"><li><strong>Android:</strong> in Chrome, tap the menu (⋮) and choose “Install app” or “Add to Home screen”.</li><li><strong>iPhone and iPad:</strong> in Safari, tap Share, then “Add to Home Screen”, then “Add”.</li><li><strong>Computer:</strong> in Chrome or Edge, click the install icon at the right of the address bar.</li></ul>'
  // Install the app (30 Sep 2026): one tap where the browser can install it (Android, Chrome and Edge on a computer). Shown by
  // public/wiki-ui.js in the game and by a small script on the website (scripts/build-wiki.mjs); hidden elsewhere, where the steps say how.
  +'<p class="wiki-install" data-wiki-install-row hidden><button type="button" class="wiki-install-button" data-wiki-install>Install the app</button></p>'
  +facts([['settings','In the game','Settings, Farm app shows the steps for your device, or installs it in one tap. There you can also switch on full screen (Android and computers).']])));
 },
 crops(h){
  const regrowing=Object.keys(CROPS).filter(k=>CROPS[k].regrow).sort((a,b)=>cropLevel(a)-cropLevel(b));
  const sorted=Object.entries(CROPS).sort(([a],[b])=>cropLevel(a)-cropLevel(b)||CROPS[a].duration-CROPS[b].duration);
  const rows=sorted.map(([key,c])=>h.row(cropLevel(key),[
   item(key,1,true),h.lvl(cropLevel(key)),`${art('coins')}${number(c.cost)}`,wikiTime(c.duration),`${art('coins')}${number(c.sell)}`,number(c.xp),c.regrow?`every ${wikiTime(c.regrow)}`:'–',c.use??'–'],`crop-${key}`));
  const cards=sorted.map(([key,c])=>card({picture:key,title:c.name,row:`crop-${key}`,badge:h.lvl(cropLevel(key)),locked:h.locked(cropLevel(key)),stats:[`Grows in ${wikiTime(c.duration)}`,`Seed ${art('coins')}${number(c.cost)}`,`Sells ${art('coins')}${number(c.sell)}`,`${number(c.xp)} XP`,...(c.regrow?[`Grows back every ${wikiTime(c.regrow)}`]:[])],note:c.use?`Used for ${c.use.toLowerCase()}`:''}));
  const early=EARLY_FIELDS.map(f=>number(f.coins)).join(', ');
  return section('Planting',`<p>Pick a crop in the seed shop, then tap an empty field. Quick crops are good while you play; longer ones grow while you are away.</p><p>Changed your mind? In the Farmhouse, under Your fields, you can remove any crop, ripe or not. The field is empty right away, but you get nothing back: no harvest, no XP and no seed coins. <span class="wiki-see">See ${h.link('buildings','Farmhouse','building-farmhouse')}.</span></p>`)
  +section('Water and care',`<p>A harvest gives 1 crop. Water a field for 2 crops, water and care for 3. Both also make the crop grow faster, and doing both gives double XP.</p><p>Water a crop soon after planting: it takes water until its extra care opens, and always in its first minute. Extra care comes after that, until the harvest.</p>`)
  +section('Trees and bushes',`<ul class="wiki-chips wiki-regrow">${regrowing.map(k=>`<li><a href="${h.to('crops',`crop-${k}`)}" data-wiki-topic="crops" data-wiki-anchor="crop-${k}">${art(k)}<span>${CROPS[k].name}</span>${h.lvl(cropLevel(k))}</a></li>`).join('')}</ul><p>These grow back after you harvest them, so you only plant them once. Each holds one harvest at a time: pick it yourself to start the next one. Water and care it every time, for up to 3 fruit instead of 1. Nothing is picked while you are away.</p>`)
  +section('More fields',`<p>You start with ${STARTER_FIELDS} fields. While you start out, each new level lets you open one more for coins (${early}). After that the Farmhouse adds fields, up to ${MAX_PLOTS} in total. See ${h.link('buildings',TOPIC.buildings.title,'building-farmhouse')}.</p>`)
  +section('Medals',`<p>${h.lvl(FEATURE_LEVELS.mastery)} Harvest the same crop often for a reward at every tier. <span>You collect each medal yourself in Medals (on a phone: More → Medals; on a computer: Estate → Medals). A yellow ! shows when one is waiting.</span></p>`+table(['Tier','Harvests','Reward'],MASTERY_TIERS.map(t=>`<tr><td>${t.name}</td><td>${number(t.target)}</td><td>${art('coins')}${number(t.coins)} and ${number(t.xp)} XP</td></tr>`)))
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Five research steps, each paid with coins. Together they make crops grow up to 40% faster and seeds up to 25% cheaper. Crops already growing keep their time.</p>`+table(['Step','Price','Growing time','Seed price'],SILO_COSTS.map((cost,i)=>{const b=siloBonus(i+1),was=siloBonus(i),pct=n=>Math.round(n*100);return `<tr><td>${i+1}</td><td>${art('coins')}${number(cost)}</td><td>−${pct(b.growth-was.growth)}% <small>(−${pct(b.growth)}% in all)</small></td><td>−${pct(b.seeds-was.seeds)}% <small>(−${pct(b.seeds)}% in all)</small></td></tr>`;})))
  +section('Every crop',dual(table(['Crop','Opens','Seed','Grows in','Sells for','XP','Grows back','Used for'],rows,'wiki-crops'),cards));
 },
 buildings(h){
  const production=Object.entries(BUILDINGS).filter(([key,b])=>b.type==='production'&&!worldTwoBuilding(key)).sort(([a],[b])=>buildingLevel(a)-buildingLevel(b));
  const blocks=production.map(([key])=>buildingBlock(h,key,Object.entries(RECIPES).filter(([,r])=>r.building===key&&!worldTwoRecipe(r)).sort(([a],[b])=>recipeLevel(a)-recipeLevel(b)))).join('');
  return section('How buildings work',facts([
   ['buildings','Build',`Each building opens at a level and costs coins once; the ${BUILDINGS.dairy.name} needs the ${BUILDINGS.mill.name} first, the ${BUILDINGS.bakery.name} the ${BUILDINGS.dairy.name} and the ${BUILDINGS.windmill.name}. Tap a building to start a batch: it turns crops (or other goods) into goods that sell for more.`],
   ['hammer','Upgrade',`Better buildings run more batches at the same time, up to level ${MAX_BUILDING_LEVEL}. Level ${MAX_BUILDING_LEVEL} is fully upgraded. Every level costs more than the one before, and a building that costs more to build costs more to upgrade. From level 4 an upgrade also asks for goods the building makes itself, like milk for the Dairy Barn. The Factory asks for goods from across the valley from its first upgrade. The Buildings discount boost halves the coins and goods of your next upgrade.${h.level==null||h.level>=WORLD_TWO_LEVEL?` <span>From level ${MASTER_UPGRADES[0].level}, master tools from ${h.link('village',TOPIC.village.title,'sec-past-level-10')} take a building on to level ${TOP_BUILDING_LEVEL}.</span> <span>From level ${RECIPE_LEVELS.builderscrate}, builder’s crates from ${h.link('village',TOPIC.village.title,'sec-builder-s-crates')} take coins off an upgrade, up to half the price.</span>`:''}`],
   // 18 Oct 2026: a computer with a mouse shows a building's picture without its name (desktop-hud.css), so the label, not the name.
   ['collect-all','Collect','When a batch is ready, the building\'s label on the farm turns yellow: tap it to collect everything that is ready. Or open the building and use Collect all.'],
   // 11 Oct 2026 (farm-state.js batchDuration).
   ['eggs','A quick first batch',`The first batch in each new building is ready in ${FIRST_BATCH_MS/1000} seconds. After that every batch takes its usual time.`],
   ['feed','Animal feed',`Chickens, cows, sheep, goats and pigs eat animal feed. Mix it at the ${BUILDINGS.mill.name}: ${RECIPES.feed.input.corn} corn make ${RECIPES.feed.output.feed}, ${RECIPES.barleyfeed.input.barley} barley make ${RECIPES.barleyfeed.output.feed} and ${RECIPES.wheatfeed.input.wheat} wheat make ${RECIPES.wheatfeed.output.feed}. At the ${BUILDINGS.windmill.name}, ${RECIPES.windfeed.input.barley} barley make ${RECIPES.windfeed.output.feed}. Feed sells for ${ITEMS.feed.sell} coins.`],
   ['boost','Factory',`From level ${FACTORY_LEVEL} the Factory (${number(FACTORY_COST)} coins) makes the goods of your other buildings in bulk, in twice the time of one batch. A bulk batch is twice the level of the building that normally makes it, up to ×20: a level-5 Dairy makes cheese ×10. Goods that take over an hour: its level, up to ×10. Upgrade a building and its bulk batch grows too. Upgrading the Factory itself asks for flour, cheese and cloth, plus harvest hampers from the upgrade to level 5, squash soup from level 7 and cider from level 9.`]
  ]))+farmhouseBlock(h)+familyHallBlock(h)+blocks;
 },
 market(h){
  return section('Selling',facts([
   ['market','Prices change every day','At 00:00 UTC the market sets new prices. Most days a price stays close to normal; now and then it is much higher or lower. Today’s market pick is the item whose price rose most today, and the outlook shows tomorrow’s.'],
   ['coins','Sell some or sell all','Choose how many to sell (on a phone: tap Pick amount), or sell all of one crop. The basket at the bottom shows what all your crops are worth.'],
   // 20 Oct 2026 (farm-state.js firstSaleDouble): a new farm's first sale pays double.
   ['coins','Your first sale pays double','On a new farm the Market pays twice for your first sale. Until then it shows the doubled prices.'],
   ['buildings','Goods pay more',`Crops made into goods sell for more than the crops that went in. See ${h.link('buildings')}.`],
   ['quests','Keep what you need',`Orders and your family ask for crops and goods, and often pay more than the market. See ${h.link('daily',TOPIC.daily.title,'sec-delivery-orders')} and ${h.link('family',TOPIC.family.title,'sec-the-family-order')}.`]
  ]))+section('How far prices move',table(['What','Lowest','Highest'],[['Crops',MARKET_RANGES.crops],['Goods',MARKET_RANGES.goods]].map(([what,[lo,hi]])=>`<tr><td>${what}</td><td>${Math.round(lo*100)}% of normal</td><td>${Math.round(hi*100)}% of normal</td></tr>`))+'<p>Every crop and good has its own price each day. The Market shows today’s price next to the normal one.</p>')
  +section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Your stall earns coins by itself. Collect them from time to time. What it earns per level is in ${h.link('helpers',TOPIC.helpers.title,'sec-farm-stall')}.</p>`);
 },
 quests(h){
  // Each thing that opens is a chip; one explained elsewhere leads there (Oct 2026). The Starter Pack is bought, so never in our Android app
  // or on CrazyGames and Kongregate (nothing is sold there, except Kreds on Kongregate once switched on, 15 Oct 2026): How to play there
  // leaves it out, and on the website's wiki data-shop-only lets public/wiki.css hide it in the app.
  const chip=e=>openChip(h,e);
  const opens=opensByLevel(h.app||h.portal&&!h.kreds);
  return section('Quests',facts([
   // Plan F (13 Oct 2026): a field to buy on the Next goal card (proposal 3), and the phone's line that says when everything is ready (2).
   ['quests','One little goal at a time',`${number(QUESTS.length)} quests, from your first harvest to the Grand Valley Fair. They ask for things like harvesting 12 wheat. When one is done, claim its coins and XP, one quest at a time. The number on Quests also counts the daily challenges that are ready; claim those in Today. After the Beginner guide the Next goal card shows one goal: a quest to claim, a daily challenge to claim, a building to build, a new field to buy (fields 9 to 12, once no building waits to be built), the quest closest to done or your next level. On a phone it is one line at the top; while your crops or batches grow and nothing else waits, it says when everything is ready.${h.level==null||h.level>=WORLD_TWO_LEVEL?` <span>From level ${WORLD_TWO_LEVEL}, ${h.link('village',TOPIC.village.title,'sec-village-quests')} has its own quests.</span>`:''}`],
   // Plan F (13 Oct 2026): the 20 starter quests give coins only (their own xp 0, farm-state.js questXp); the line said every quest gave XP.
   ['trophy','Bigger quests, more XP',`The ${QUESTS.filter(q=>q.xp===0).length} small starter quests give coins only. Other quests up to ${number(1000)} coins give ${QUEST_XP} XP; bigger ones give more, up to 250 XP for the biggest.`],
   ['xp','XP and levels',`Almost everything you do gives XP. A new level gets its card, and each line on it says what opened and where it is. What opens because of something you just did (a building you built, a field you bought) is named in one line at the top. Each new level opens new crops, buildings and things to do, and the journal shows your level rewards. <span class="wiki-see">See ${h.link('quests','What opens when','sec-what-opens-when')}.</span>`]
  ]))+section('Level rewards',`<p>Every new level brings ${art('coins')}10 × the level and ${art('diamonds')}1 diamond for every 10 levels (at least 1).</p>`+table(['Level','Coins','Diamonds'],[2,5,10,20,30,50,75,100].map(n=>{const r=levelReward(n);return `<tr><td>${n}</td><td>${art('coins')}${number(r.coins)}</td><td>${art('diamonds')}${number(r.diamonds)}</td></tr>`;})))+section('What opens when',table(['Level','What opens'],[...opens].sort((a,b)=>a[0]-b[0]).map(([n,list])=>h.row(n,[h.lvl(n),`<span class="wiki-opens">${list.map(chip).join('')}</span>`],`level-${n}`)),'wiki-opens-table')+`<p>More about each one in ${h.link('crops',TOPIC.crops.title,'sec-every-crop')} and ${h.link('buildings')}.</p>`);
 },
 daily(h){
  const boost=day=>DAILY_BOOSTS[day]?`<span class="wiki-boost" title="${BOOSTS[DAILY_BOOSTS[day]].name}">${art(BOOSTS[DAILY_BOOSTS[day]].art)}<span>${BOOSTS[DAILY_BOOSTS[day]].name.replace('Double ','×2 ')}</span></span>`:'–';
  const days=DAILY_REWARDS.map((_,i)=>`<tr><td>${i+1}</td><td>${art('diamonds')}${number(DAILY_DIAMONDS[i])}</td><td>${art('coins')}${number(giftCoins(i+1,10))}</td><td>${art('coins')}${number(giftCoins(i+1,30))}</td><td>${boost(i+1)}</td></tr>`);
  // The comeback chest (Oct 2026): its coins for every number of days away, at level 10 and 30 like the gift's table.
  const away=Array.from({length:COMEBACK_MAX_DAYS-COMEBACK_MIN_DAYS+1},(_,i)=>COMEBACK_MIN_DAYS+i).map(d=>`<tr><td>${d}</td><td>${art('coins')}${number(comebackCoins(d,10))}</td><td>${art('coins')}${number(comebackCoins(d,30))}</td></tr>`);
  const tiers=Object.entries(DELIVERY_TIERS).map(([key,t])=>h.row(DELIVERY_LEVELS[key],[t.name,h.lvl(DELIVERY_LEVELS[key]),`${t.minBonus}–${t.maxBonus}% more than the market`]));
  return section('A gift every day',`<p>Open the farm every day and collect your gift. Every day in a row makes your streak one longer, and from day 7 every day pays the day-7 gift. Miss one day and your streak is kept, once a week; miss more and it starts over.</p><p>The coins grow with your level: the day’s coins × half your level. Days 3, 5 and 7 of every streak week also bring a ${DAILY_BOOST_MS/60000}-minute boost. VIP doubles the whole gift, the boost too. The table shows the coins at level 10 and at level 30.</p>`+table(['Day','Diamonds','Level 10','Level 30','Boost'],days))
  +section('Back after a while',`<p>Away for ${COMEBACK_MIN_DAYS} days or more? The Welcome back card holds a comeback chest: ${COMEBACK_COINS} coins × half your level for every day you were away (up to ${COMEBACK_MAX_DAYS} days), and ${DAILY_BOOST_MS/60000} minutes of double XP. VIP doubles it, like the daily gift. You get one at most every ${COMEBACK_EVERY_DAYS} days, and it waits until you collect it: in Welcome back, or at the top of Today.</p>`+table(['Days away','Level 10','Level 30'],away))
  +section('Daily challenges',`<p>${h.lvl(FEATURE_LEVELS.challenges)} Three small goals every day. Each pays coins, 10 XP and diamonds: ${DAILY_CHALLENGE_DIAMONDS.join(', ')}. Finish all three for a bonus of ${art('coins')}${DAILY_BONUS.coins} and ${DAILY_BONUS.xp} XP. VIP doubles these rewards.</p><p>They are in Today (on a phone: More → Today). Claim each one there when it is done; the number on Quests counts it too. A challenge for a helping hand stop that is resting says when that stop is ready again.</p>`)
  +section('Delivery orders',`<p>${h.lvl(FEATURE_LEVELS.cart)} Customers ask for crops and goods and pay more than the market, with new orders every day. Tap the cart on your farm, or open Delivery orders in Today. Don’t like an order? Replace it for ${REPLACE_ORDER_COST} diamonds.</p>`+table(['Order','Opens','Pays'],tiers))
  +passSection(h)
  +section('A new day','<p>Gifts, challenges, orders and market prices refresh at 00:00 UTC.</p>');
 },
 family(h){
  // 27 Sep 2026: the Family Chest, the family level, the flag and the family event bonus; every number from the game rules.
  // 5 Oct 2026: what the Family Order pays, tournament goods, what counts as tournament points, how long rewards wait and the Stats
  // tab. The wiki named the order's rewards without amounts and never mentioned tournament goods.
  // 5 Oct 2026, later: an unfinished order pays for its full lines when the week ends, a quarter a line (it paid nothing).
  const C=FAMILY_CONFIG,pointNames={harvested:'a harvest',produced:'a collected batch',deliveries:'a delivery',chores:'a chore',activities:'a helping-hand job'};
  const chestRows=FAMILY_CHEST_TIERS.map(t=>`<tr><td>${art(`family-chest-${t.id}`)}${t.name}</td><td>${number(t.points)}</td><td>${art('diamonds')}${t.diamonds}</td><td>${art('coins')}${t.coinsPerLevel} × your level</td></tr>`);
  const levelRows=FAMILY_LEVEL_STEPS.map((need,i)=>`<tr><td>${i+1}</td><td>${number(need)}</td><td>${i?`+${Math.round(i*FAMILY_LEVEL_BONUS*100)}%`:'–'}</td></tr>`);
  // The whole order's rewards as familyOrderPay (farm-state.js) pays them at family level 1: a coin for every point (the Market's payout
  // × ORDER_COIN_MULTIPLIER, so the goods' full value; tests/wiki.test.mjs keeps that true), 1 XP per 100 points, and 1 diamond plus 1
  // for every 10,000 points, up to 2 (3 until 7 Oct 2026; that 10,000 is written in familyOrderPay too). One row for each diamond step, from the
  // fewest points that earn a reward. Then what one farmer's part of an order (FAMILY_ORDER_VALUE points) earns at each number of
  // full lines, straight from familyOrderPay.
  const ORDER_DIAMOND_STEP=10000,orderDiamonds=p=>Math.min(C.ORDER_DIAMOND_MAX,C.ORDER_DIAMOND_BASE+Math.floor(p/ORDER_DIAMOND_STEP));
  const orderRows=Array.from({length:C.ORDER_DIAMOND_MAX-C.ORDER_DIAMOND_BASE+1},(_,i)=>Math.max(C.MIN_CONTRIB_POINTS,i*ORDER_DIAMOND_STEP))
   .map(p=>`<tr><td>${number(p)}</td><td>${art('coins')}${number(Math.floor(p*MARKET_PAYOUT_MULTIPLIER*C.ORDER_COIN_MULTIPLIER))}</td><td>${number(Math.floor(p*C.ORDER_XP_PER_VALUE))}</td><td>${art('diamonds')}${orderDiamonds(p)}</td></tr>`);
  const lineRows=Array.from({length:FAMILY_ORDER_LINES},(_,i)=>i+1).map(n=>{const pay=familyOrderPay(FAMILY_ORDER_VALUE,1,n,FAMILY_ORDER_LINES);return `<tr><td>${n<FAMILY_ORDER_LINES?`${n} of ${FAMILY_ORDER_LINES}`:`All ${n}`}</td><td>${art('coins')}${number(pay.coins)}</td><td>${number(pay.xp)}</td><td>${art('diamonds')}${n<FAMILY_ORDER_LINES?pay.diamonds:`${pay.diamonds} + a share of ${C.ORDER_COMPLETION_DIAMONDS}`}</td></tr>`;});
  const placeRows=C.TOURNAMENT_SHARES.map((share,i)=>`<tr><td>${i+1}</td><td>${share}%</td></tr>`);
  return section('Together is better',`<p>${h.lvl(FAMILY_MIN_LEVEL)} Start a Farm family or join one, with up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers. The Family screen shows the busiest families you can join first. The leader chooses who can join: <strong>Open</strong> (anyone joins at once; a new family starts open), <strong>Request to join</strong> (you ask, the leader or a co-leader accepts or declines within 3 days), <strong>Invite only</strong> (the leader or a co-leader invites you by your player name) or <strong>Closed</strong> (nobody new). An open family or one taking requests can also set a minimum level; an invitation still works for anyone. You can ask one family at a time.</p><p>Tap a family's name, in the list, the tournament or a farmer's profile, to see its <strong>family profile</strong>: its level, its farmers, the tournaments it won and the chests it opened.</p>`)
  +section('Ranks and the top farmer',`<p>The leader gives the family its ranks. <strong>Co-leaders</strong> (at most ${FAMILY_MAX_COLEADERS}) can do everything the leader does: accept requests, invite and remove farmers, and change the emblem, the name and who can join. They cannot change ranks, hand over the leadership or remove the leader or the other co-leader. <strong>Honorary</strong> is a title of thanks, without extra rights. Everyone else is a <strong>member</strong>.</p><p>The farmer who brings the most points into the Family Chest this week wears the <strong>top farmer</strong> crown in the member list and on the family profile, until the week ends on Monday, 00:00 UTC.</p>`)
  +section('The Family Chest',`<p>Every week your family fills one chest together. Everything members do on their farm counts: ${Object.entries(FAMILY_CHEST_POINTS).map(([k,n])=>`${pointNames[k]} ${n} point${n===1?'':'s'}`).join(', ')}. At each chest, everyone who put in at least ${number(FAMILY_CHEST_MIN)} points that week gets its rewards in full: nothing is split, and the coins follow your own level. A new chest starts on Monday at 00:00 UTC.</p>`+table(['Chest','Family points','Diamonds','Coins'],chestRows)+`<p>A bigger, busier family fills it further: a keen farmer alone reaches the wooden chest, a family of five the silver one, and gold takes a full family. Collect your rewards on the Family screen within ${C.REWARD_WEEKS} weeks.</p>`)
  +section('The Family Order',`<p>Every week your family gets one big order. Every family gets the same goods that week; a bigger family gets bigger amounts, set when the week’s order is made. Each line takes only what it still needs, and deliveries cannot be taken back. You deliver to one family a week.</p><p>Every good you deliver brings points: its full value in coins. Everyone who delivered at least ${number(C.MIN_CONTRIB_POINTS)} points to the order shares in its rewards. The whole order pays a coin for every point (${Math.round((C.ORDER_COIN_MULTIPLIER-1)*100)}% more than the Market pays at its normal price), 1 XP for every ${number(Math.round(1/C.ORDER_XP_PER_VALUE))} points and diamonds:</p>`
   +table(['Your points','Coins','XP','Diamonds'],orderRows)+`<p>Every full line pays a quarter of these rewards. An order that is not finished pays for its full lines when the week ends, on Monday at 00:00 UTC: with 2 of its ${FAMILY_ORDER_LINES} lines full, half. The whole order pays everything as soon as its last line is full, plus ${C.ORDER_COMPLETION_DIAMONDS} diamonds for finishing it, shared by points. An order without a full line pays nothing, but every delivery still counts for the tournament. The family level adds its bonus to all of it, and everything is rounded down; an order that is not finished still gives at least 1 diamond for every full line, never more than the whole order would. What ${number(FAMILY_ORDER_VALUE)} points, about one farmer’s part of an order, earn:</p>`
   +table(['Full lines','Coins','XP','Diamonds'],lineRows))
  +section('The weekly tournament',facts([
   ['family-tournament','Points','Your family’s points are the value in coins of everything its members deliver that week: to the order and as tournament goods. Family Chest points do not count. The most points wins; with equal points, the family that got there first.'],
   ['harvesthamper','Tournament goods',`Once one line of the order is full, the Tournament tab takes any crop or good from your farm${h.level==null||h.level>=WORLD_TWO_LEVEL?' (nothing from the village)':''}, as many as you like. They count for the tournament only: no coins, XP or diamonds.`],
   ['diamonds','The prize','The top ten families share the prize pool. A family’s prize is shared by points among the members who delivered and are still in the family when the week ends: leave before then and your share goes to the others. In the top ten, everyone who delivered gets at least 1 diamond.']
  ])+table(['Place','Share of the pool'],placeRows)+'<p>With fewer than ten families, the same shares split the whole pool.</p>')
  +section('Family level',`<p>Every chest your family opens, in any week, is a step towards the next family level. Every level adds ${Math.round(FAMILY_LEVEL_BONUS*100)}% to the rewards of the Family Chest and the weekly Family Order, for every member; not to the tournament or events. The level belongs to the family: it stays when farmers come and go. The family list shows each family's level.</p>`+table(['Level','Chests opened','Extra rewards'],levelRows))
  +section('Your family flag',`<p>When you are in a Farm family, its flag stands by your Family Hall: the family emblem in the family colour, with the family level on it.</p>`)
  +section('The family pages',facts([
   ['family-weekly-order','This week',`A big order for the whole family. Everyone delivers what they can. Every full line pays a quarter of the coins, XP and diamonds to everyone who delivered at least ${number(FAMILY_CONFIG.MIN_CONTRIB_POINTS)} points’ worth, when the week ends; the whole order pays everything at once. Deliveries cannot be taken back.`],
   ['family-sharing','Sharing',`From level 10 you share with your family every day: up to ${SHARE_LIMIT} helps and ${SHARE_LIMIT} gifts. Help a member with coins: it costs you your level × 25 coins (level 10: ${number(helpCoins(10))}, level 30: ${number(helpCoins(30))}) and they get all of it. Gifts and requests hold up to 5 crops or goods for every 10 levels (level 10: ${maxShare(10)}, level 30: ${maxShare(30)}). Ask once a day: a request stays open for ${REQUEST_DAYS} days, until your family has filled it. Everyone adds 1, 5 or all they have, as often as they like, and every part arrives at once.`],
   ['family-tournament','Tournament',`Every week families compete; your deliveries count as points. The prize pool grows with every family taking part: ${FAMILY_CONFIG.TOURNAMENT_FIRST_MIN} diamonds for one family, ${FAMILY_CONFIG.TOURNAMENT_FIRST_MIN*2} for two, ${FAMILY_CONFIG.TOURNAMENT_FIRST_MIN*3} for three and ${FAMILY_CONFIG.TOURNAMENT_PER_EXTRA_FAMILY*2} more for every family after that (up to ${number(FAMILY_CONFIG.TOURNAMENT_FIRST_MAX*2)}). The top ten families share it, from ${FAMILY_CONFIG.TOURNAMENT_SHARES[0]}% for first place down to ${FAMILY_CONFIG.TOURNAMENT_SHARES.at(-1)}% for tenth. A family's prize is shared by what each member delivered.`],
   ['family-members','Members','See who is online, who has been away for a day or more and how much everyone did this week. The leader or a co-leader can invite farmers.'],
   ['family-rank-top','Stats','The week in numbers: your family’s place, what every farmer put in and your last weeks.']
  ]))
  +section('Collecting rewards',`<p>Chest, order and tournament rewards wait on the Family screen until you collect them, for ${C.REWARD_WEEKS} weeks after their week ends. They stay yours if you change family.</p>`)
  // Share in chat (20 Oct 2026, the owner's option 1; farm-state.js familyShareState): the rule on the page that explains families.
  +section('Family chat',`<p>Your family has its own chat. See ${h.link('chat')}.</p><p>The leader or a co-leader can share the family in the global chat, once an hour, with Share in chat under Members. Its card shows the emblem, the family level and the farmers, with a button to join the family or look at it.</p>`)
  +section('Events together',`<p>When ${FAMILY_EVENT_BONUS.finishers} or more members of your family finish the same event, each of them gets ${art('coins')}${number(FAMILY_EVENT_BONUS.coins)} and ${art('diamonds')}${FAMILY_EVENT_BONUS.diamonds} on top of their own prize. See ${h.link('events')}.</p>`)
  +section('Changing family',`<p>Left a family, or did a family remove you? You can join another family straight away. Only the family that removed you stays closed to you for ${Math.round(FAMILY_CONFIG.JOIN_COOLDOWN_MS/3600000)} hours. Delivered to your old family this week? Then you deliver to your new one from Monday.</p>`)
  // 17 Oct 2026, the owner: members who don't play leave by themselves (farm-state.js FAMILY_IDLE_DAYS, supabase/family-idle-leave.sql).
  +section('Away too long',`<p>A member who doesn't play for ${FAMILY_IDLE_DEFAULT} days leaves the family automatically, so the seat is free for a farmer who plays. The leader or a co-leader can choose ${FAMILY_IDLE_DAYS.slice(0,-1).join(', ')} or ${FAMILY_IDLE_DAYS.at(-1)} days in Family settings. The leader never leaves this way. The family keeps that week's points, as when a member leaves. When you come back, Welcome back offers to join that family again straight away, while it has room.</p>`);
 },
 events(h){
  // 7 Oct 2026: the podium pays 25, 15 and 10 diamonds, each place its own number, because one "50, 30 and 20" kept the English "and"
  // in every language. Since 8 Oct 2026 in every league however many finished (on 7 Oct only with 4 finishers or more).
  // 20 Oct 2026: the six village leagues from level 100 (farm-state.js EVENT_LEAGUES, world 2). Like everything of World II they show
  // only on the website and in How to play from level WORLD_TWO_LEVEL: below it the article has the six farm leagues and no village.
  // 20 Oct 2026, the owner: an event every hour with one goal (farm-state.js HOUR_EVENT_REWARDS, eventPrizes): diamonds, and since
  // later that day coins × the league again, a quarter of the 6-hour events' coins; the family bonus's coins are flat.
  const prize=eventPrizes(HOUR_EVENT_REWARDS),[first,second,third]=prize.podium.map(p=>p.diamonds),firstCoins=l=>(prize.coins+prize.podium[0].coins)*l.coins;
  const village=h.level==null||h.level>=WORLD_TWO_LEVEL,shown=EVENT_LEAGUES.filter(l=>l.world===1||village);
  const v=EVENT_LEAGUES.find(l=>l.world===2),last=EVENT_LEAGUES.at(-1);
  return section('A new event every hour',`<p>${h.lvl(EVENTS_LEVEL)} A new event starts every hour, on the hour. You play for 55 minutes; in the last 5 minutes the prizes are handed out. Everyone in your league plays toward the same goal. Events open as soon as you reach level ${EVENTS_LEVEL}.</p>`)
  +section('How it works',facts([
   ['live-events','Goals',`Every event has one goal, one you can finish within the hour. The kind of play changes every hour: the fields, crops, buildings, the market or helping out. Each league gets its own goal, made for its levels: the Sprout League harvests wheat and collects eggs, higher leagues milk goats and drive the tractor, with bigger numbers.${village?` <span>From level ${v.from} your league is a village league: its goal is in the village, from stone and planks to roof tiles and lake fish.</span>`:''} <span>Your progress shows in the event window.</span>`],
   ['trophy','Rewards',`Reach the goal and you have finished. Everyone who finishes wins coins and diamonds; the sooner you finish, the more. The first three in each league win ${first}, ${second} and ${third} diamonds, every other finisher ${prize.finisher.diamonds}.`],
   ['rank-gold','Leagues','You race in your league, against farmers of about your level, with its own top 10 and podium. Your league is set when you join an event (your first action that counts), and you finish that event in that league, even if you level up. Diamonds are the same in every league; higher leagues win more coins.'],
   ...(village?[['village-badge','Village leagues',`From level ${v.from} you race in a village league, with goals in the village and coins ×${v.coins} to ×${last.coins}. Each one you finish counts in Village events and in Events finished.`]]:[]),
   ['family-members','Family bonus',`When ${FAMILY_EVENT_BONUS.finishers} or more members of one Farm family finish the same event, each of them gets ${number(FAMILY_EVENT_BONUS.coins)} coins and ${FAMILY_EVENT_BONUS.diamonds} diamonds more.`],
   ['gift','Next event','When an event ends, the window shows when the next one starts and what it gives.']
  ]))
  // The leagues (1 Oct 2026, farm-state.js EVENT_LEAGUES) with their levels and what first place wins there, and then each league with the goals its hourly events can
  // draw, per kind of play (public/event-goals.js EVENT_HOUR_POOLS), so a farmer knows what to get ready for. A higher league of
  // the same world keeps every goal of the league below, so it lists only the goals it adds; the first village league lists all of its own.
  +section('Leagues',`<p>Your league is set when you join an event (your first action that counts), and you finish that event in that league, even if you level up.${village?` <span>Up to level ${v.from-1} your goals are on the farm; from level ${v.from} they are in the village.</span>`:''} <span>Every league has the same diamonds; coins grow with the league. The family bonus counts family members from every league.</span></p>`+table(['League','Levels','First place'],shown.map(l=>`<tr><td>${l.name}</td><td>${l.to?`${l.from}–${l.to}`:`${l.from}+`}</td><td>${number(firstCoins(l))} coins and ${first} diamonds</td></tr>`)))
  +shown.map(l=>{
   const i=l.index,prev=EVENT_LEAGUES[i-1],below=new Set(prev?.world===l.world?EVENT_HOUR_POOLS[i-1].flat().map(g=>g.stat):[]);
   const added=EVENT_HOUR_POOLS[i].map((group,k)=>[k,group.filter(g=>!below.has(g.stat))]).filter(([,group])=>group.length);
   const intro=!i?'Goals you can expect, one per event:':prev.world!==l.world?'Village goals you can expect, one per event:':added.length?'Every goal from the league below, with bigger numbers, plus:':'Every goal from the league below, with bigger numbers.';
   return section(l.name,`<p class="wiki-league"><img class="wiki-league-badge" src="/assets/icons/league-${l.id}.webp" alt="" width="48" height="48" loading="lazy"><span class="wiki-league-facts"><span>${l.to?`Levels ${l.from}–${l.to}`:`Level ${l.from}+`}</span><span>Coins ×${l.coins}</span></span></p><p>${intro}</p>${added.length?`<ul class="wiki-list">${added.map(([k,group])=>`<li><strong>${EVENT_GOAL_GROUPS[l.world][k]}</strong>: ${group.map(g=>`<span>${EVENT_GOALS[g.stat]?.label??g.stat}</span>`).join(', ')}</li>`).join('')}</ul>`:''}`);
  }).join('');
 },
 helpers(h){
  // Every number below comes from the game rules (27 Sep 2026: the wiki named these helpers without saying what they pay or cost).
  const stall=Array.from({length:STALL_MAX_LEVEL},(_,i)=>{const s=stallLevel(i+1);return `<tr><td>${i+1}</td><td>${art('coins')}${number(s.rate)}</td><td>${s.capacityHours} h</td><td>${s.upgradeCost?`${art('coins')}${number(s.upgradeCost)}`:'Top level'}</td></tr>`;});
  const choreList=Object.entries(CHORES).map(([key,c])=>({key,c,r:choreRewards(c),tries:Math.ceil((c.maxChance-c.baseChance)/CHORE_PRACTICE_STEP)}));
  const chores=choreList.map(({key,c,r,tries})=>`<tr><td>${art(`chore-${key}`)||''}${c.name}</td><td>${art('coins')}${number(r.coins)} and ${number(r.xp)} XP</td><td>${wikiTime(c.cooldown)}</td><td>${item(c.bonus.item,c.bonus.count)} ${c.baseChance}% → ${c.maxChance}%</td><td>${tries} times</td></tr>`);
  const choreCards=choreList.map(({key,c,r,tries})=>card({picture:`chore-${key}`,title:c.name,stats:[`${art('coins')}${number(r.coins)} and ${number(r.xp)} XP`,`Rests ${wikiTime(c.cooldown)}`,`${item(c.bonus.item,c.bonus.count)} ${c.baseChance}% → ${c.maxChance}%`],note:`Mastered after ${tries} times`}));
  // The goods last, right before "and" (7 Oct 2026), so nothing but a space stands between them (wiki.css: a last .wiki-item has no margin).
  const stops=Object.values(ACTIVE_STATIONS).map(a=>`<tr><td>${a.name}</td><td>${a.coins?`${art('coins')}${number(a.coins)}, `:''}${item(a.item,a.itemCount??1)} and ${number(a.xp)} XP</td></tr>`);
  return section('Tractor',`<p>${h.lvl(FEATURE_LEVELS.tractor)} The tractor does one job on every field that needs it. Fuel costs ${art('coins')}${TRACTOR_FUEL_BASE} a job, plus for every field ${Math.round(TRACTOR_FUEL_SHARE*100)}% of what its crop usually sells for, at least ${TRACTOR_FUEL_PER_FIELD} coins: wheat ${fieldFuel('wheat')}, pumpkin ${fieldFuel('pumpkin')}, sunflower ${fieldFuel('sunflower')}. Planting also pays the seeds.</p>`
   +facts([['seeds','Plant','Your chosen crop on every empty field. It asks first, so you can check the crop.'],['water','Water','Every crop that can still take water.'],['care','Extra care','Every crop that is ready for it.'],['harvest','Harvest','Every ripe field.']])
   +`<p>With diamonds the tractor does more. The tractor's diamond work counts for no challenges, events or leaderboards. What it brings in is yours, like any crop.</p>`
   +facts([['tractor-full-care','Full care',`Water and extra care for every growing crop at once, also outside their usual moments, so each gives three times the crop. ${FULL_CARE_COST} diamonds a crop. A crop that already had both is skipped.`],
    ['tractor-night-shift','Night shift',`For ${SHIFT_MS/3600000} hours the tractor does a round every hour: it harvests, plants your chosen crop, waters and gives care, also while you are away. The tractor card shows how it is doing.`]])
   +`<p><strong>Limits of the night shift</strong></p><ul class="wiki-list"><li>One night shift a day, and it always lasts ${SHIFT_MS/3600000} hours.</li><li>Its harvests go to your barn but give no XP, and they do not count as your harvests anywhere: not for quests, medals, challenges, events or leaderboards. Selling or using them later counts like any crop you sell or use.</li><li>It plants with your coins. When they run out, it stops planting and only harvests, waters and gives care.</li><li>A crop that grows longer than the shift is planted and cared for, but you harvest it yourself.</li><li>It plants only on fields that are empty or harvested during the shift. The price counts every field, so before you start the tractor card warns you when fields stay full until after the shift, or when your crop brings in less than the lowest price.</li><li>The price follows what it brings in with your crop on your number of fields: 1 diamond for every ${SHIFT_COINS_PER_DIAMOND} coins of crops at today's market price, at least 1 a field. What grows on your fields or the coins you have do not change it. The button shows it before you start.</li></ul>`)
  +section('Silo research',`<p>${h.lvl(FEATURE_LEVELS.silo)} Better seeds: crops grow faster and seeds cost less. Every step and its price is in ${h.link('crops',TOPIC.crops.title,'sec-silo-research')}.</p>`)
  +section('Farm stall',`<p>${h.lvl(FEATURE_LEVELS.stall)} Your stall earns coins by itself, every hour, also while you are away. It holds a day or two of earnings; when it is full it stops earning until you collect. Every finished estate chapter adds more coins an hour on top (see ${h.link('estate',TOPIC.estate.title,'sec-estate-chapters')}).</p>`+table(['Level','Earns an hour','Holds','Next level'],stall))
  +section('Farm chores',`<p>${h.lvl(FEATURE_LEVELS.chores)} Small jobs that always pay coins and XP, and sometimes find a few crops too. Every time you do a chore its chance of finding them goes up by ${CHORE_PRACTICE_STEP}%, until it reaches its top: then the chore is mastered and the next one opens. After a chore it rests before you can do it again.</p>`+dual(table(['Chore','Pays','Rests','Sometimes finds (chance)','To master'],chores),choreCards))
  // Below level 10 the stops grow with the farm (11 Oct 2026, farm-state.js handShare): one rule, in plain words, under the full amounts.
  +section('A helping hand',`<p>${h.lvl(FEATURE_LEVELS.activities)} Four stops on the farm, each with a little job of three taps. Help at all four for a round bonus of ${art('coins')}${number(ACTIVITY_ROUND_REWARD.coins)} and ${number(ACTIVITY_ROUND_REWARD.xp)} XP, then start a new round. After its job a stop rests ${wikiTime(Math.min(...Object.values(ACTIVE_STATIONS).map(a=>a.cooldown)))}.</p>`
   +`<p>Until level ${HAND_FULL_LEVEL} the stops grow with your farm: a stop rests ${HAND_REST_PER_LEVEL/60000} minutes for every level of your farm, and its XP and the round bonus are a tenth of the full amount for every level. At level ${FEATURE_LEVELS.activities} a stop rests ${FEATURE_LEVELS.activities*HAND_REST_PER_LEVEL/60000} minutes and pays ${FEATURE_LEVELS.activities*100/HAND_FULL_LEVEL}%. The goods are always the same.</p>`+table(['Stop','Gives'],stops))
   +(POND_OPEN?pondSection(h):'');
 },
 estate(h){
  const later=[['projects','Estate projects','estate',`Big projects that make your estate grow. Each finished chapter adds coins an hour to your stall for good, more for every chapter: +${number(CHAPTER_STALL_INCOME[0])} for the first, +${number(CHAPTER_STALL_INCOME[3])} for the fourth, up to +${number(CHAPTER_STALL_INCOME[CHAPTER_STALL_INCOME.length-1])} for the last.`],['valleymarket','Valley Market','valley-market',`${VALLEY_STALLS} customers wait at your stalls, each with a basket of goods. Fill a basket and they pay ${VALLEY_PREMIUM}× what the goods fetch at the market, plus XP. A new customer comes ${wikiTime(VALLEY_RESTOCK)} later (sooner with the Market wagon). Not the basket for you? Send the customer on; the next one comes after the same wait.`],['ranch','The Ranch','ranch',`Choose one herd: ${Object.entries(RANCH_HERDS).map(([b,n])=>`${n} (${BUILDINGS[b].name})`).join(', ')}. Its building works ${Math.round(RANCH_SPEEDUP*100)}% faster (more with the Big hay loft). The first choice is free; switching to another herd costs ${art('coins')}${number(RANCH_SWITCH_COST)}.`],['estateworkshop','Estate Workshop','estate-workshop','Improvements that last for good.'],['tradedepot','Trade Depot','trade-depot',`One export contract at a time. Load its goods, all at once or bit by bit; a full trailer pays ${DEPOT_PREMIUM}× the goods' market value and ${DEPOT_DIAMONDS} diamonds. The next contract comes ${wikiTime(DEPOT_RESTOCK)} after a trailer leaves (sooner with the Loading crane). You can pass on a contract before anything is loaded; the next one comes after the same wait.`]];
  const list=Object.values(IMPROVEMENTS).sort((a,b)=>a.level-b.level);
  const improvements=list.map(i=>h.row(i.level,[`${art(i.art)}${i.name}`,i.effect,h.lvl(i.level),`${art('coins')}${number(i.coins)} + ${items(i.materials)}`]));
  const improvementCards=list.map(i=>card({picture:i.art,title:i.name,badge:h.lvl(i.level),locked:h.locked(i.level),stats:[i.effect],note:`Costs ${art('coins')}${number(i.coins)} + ${items(i.materials)}`}));
  // What a chapter brings: the diamonds and XP, and on a line of its own the stall's extra coins (7 Oct 2026: "💎35, 1,200 XP" read as
  // one number, and the stall's coin picture ended a line on its own). In the table each is a .wiki-line (wiki.css).
  const brings=(p,i)=>`<span class="wiki-line">${art('diamonds')}${number(CHAPTER_DIAMONDS[i])} and ${number(p.xp)} XP</span><br><span class="wiki-line">${art('coins')}+${number(CHAPTER_STALL_INCOME[i])} an hour at the stall</span>`;
  const chapters=PROJECTS.map((p,i)=>h.row(p.level??FEATURE_LEVELS.projects,[`${i+1}. ${p.name}`,h.lvl(p.level??FEATURE_LEVELS.projects),`${art('coins')}${number(p.coins)} + ${items(p.input)}${p.medals?`<small>${p.medals} medal${p.medals===1?'':'s'}</small>`:''}`,wikiTime(p.duration),brings(p,i)]));
  const chapterCards=PROJECTS.map((p,i)=>{const level=p.level??FEATURE_LEVELS.projects;return card({picture:'estate',title:`${i+1}. ${p.name}`,badge:h.lvl(level),locked:h.locked(level),stats:[`${art('coins')}${number(p.coins)}`,...Object.entries(p.input).map(([key,n])=>item(key,n)),`Takes ${wikiTime(p.duration)}`,...(p.medals?[`${p.medals} medal${p.medals===1?'':'s'}`]:[])],note:`Brings ${brings(p,i)}`});});
  return section('Something to grow towards',`<ul class="wiki-facts">${later.map(([key,name,picture,text])=>`<li>${art(picture)}<div><strong>${name} ${h.lvl(FEATURE_LEVELS[key])}</strong><p>${text}</p></div></li>`).join('')}</ul>`)
  +section('Estate chapters',`<p>One chapter at a time, in this order. Pay the coins and goods, and the work takes the time shown. Some chapters also ask for crop medals.</p>`+dual(table(['Chapter','Opens','Costs','Takes','Brings'],chapters,'wiki-chapters'),chapterCards))
  +section('Estate Workshop improvements',dual(table(['Improvement','What it does','Opens','Costs'],improvements),improvementCards))
  +afterNinety(h);
 },
 // World II (30 Sep 2026): every number from the rules (VILLAGE_RECIPES, MASTER_UPGRADES).
 village(h){
  const places=Object.keys(BUILDINGS).filter(worldTwoBuilding).sort((a,b)=>buildingLevel(a)-buildingLevel(b));
  // The Pier (Oct 2026) makes nothing: its own row says what the town boat takes and pays.
  const blocks=places.map(key=>BUILDINGS[key].type==='pier'?pierBlock(h):buildingBlock(h,key,Object.entries(RECIPES).filter(([,r])=>r.building===key).sort(([a],[b])=>recipeLevel(a)-recipeLevel(b)))).join('');
  const fromFarm=Object.entries(RECIPES).filter(([,r])=>r.building!=='factory'&&!worldTwoBuilding(r.building)&&worldTwoRecipe(r)).sort(([a],[b])=>recipeLevel(a)-recipeLevel(b));
  const farmRows=fromFarm.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0];return h.row(recipeLevel(id),[item(out,count),BUILDINGS[r.building].name,items(r.input),wikiTime(r.duration),h.lvl(recipeLevel(id))]);});
  const farmCards=fromFarm.map(([id,r])=>{const [out,count]=Object.entries(r.output)[0];return card({picture:out,title:`${count>1?`${number(count)} `:''}${itemName(out)}`,badge:h.lvl(recipeLevel(id)),locked:h.locked(recipeLevel(id)),stats:[BUILDINGS[r.building].name,wikiTime(r.duration)],note:`Needs ${items(r.input)}`});});
  // The village's quests (VILLAGE_QUESTS), each with the picture of what it counts.
  const questPicture=q=>{const [,kind,key]=q.stat.match(/^(made|built)_(.+)$/)??[];return kind?key:{village_batches:'mine',village_sold:'villagemarket',village_earned:'coins',village_requests:'villagemarket',beyond_upgrades:'mastertools',market_crates:'villagemarket',builder_crates_used:'builderscrate',boat_trips:'pier',village_landmarks:'landmark-greathall'}[q.stat]??'quests';};
  const questReward=q=>`${art('coins')}${number(q.reward)} and ${questXp(q)} XP`;
  const questRows=VILLAGE_QUESTS.map(q=>h.row(q.minLevel,[`${art(questPicture(q))}${q.title}`,q.description,h.lvl(q.minLevel),questReward(q)]));
  const questCards=VILLAGE_QUESTS.map(q=>card({picture:questPicture(q),title:q.title,badge:h.lvl(q.minLevel),locked:h.locked(q.minLevel),stats:[questReward(q)],note:q.description}));
  const steps=MASTER_UPGRADES.map((u,i)=>h.row(u.level,[`${MAX_BUILDING_LEVEL+i} → ${MAX_BUILDING_LEVEL+i+1}`,h.lvl(u.level),`${art('coins')}${number(u.coins)} + ${items(u.materials)}`,`${Math.round((i+1)*DOUBLE_BATCH_PER_LEVEL*100)}%`]));
  const stepCards=MASTER_UPGRADES.map((u,i)=>card({picture:'mastertools',title:`Level ${MAX_BUILDING_LEVEL+i+1}`,badge:h.lvl(u.level),locked:h.locked(u.level),stats:[`${Math.round((i+1)*DOUBLE_BATCH_PER_LEVEL*100)}% double batches`],note:`Costs ${art('coins')}${number(u.coins)} + ${items(u.materials)}`}));
  // The market square (Oct 2026): the golden briefs in their order, and what a villager's request is worth (villageRequestValue) and
  // pays (half again in coins, a 50th in XP), by level up to where it stops growing. A third villager from level 104 (the Lookout
  // tower's fourth is a landmark, said in the text); two kinds of goods, from level 120 mostly three.
  const briefRows=VILLAGE_BRIEFS.map(b=>h.row(buildingLevel(b.place),[`${art(b.place)}${BUILDINGS[b.place].name}`,h.lvl(buildingLevel(b.place)),`${art('coins')}${number(BUILDING_COSTS[b.place])} + ${items(b.goods)}`]));
  const briefCards=VILLAGE_BRIEFS.map(b=>card({picture:b.place,title:BUILDINGS[b.place].name,badge:h.lvl(buildingLevel(b.place)),locked:h.locked(buildingLevel(b.place)),stats:[`${art('coins')}${number(BUILDING_COSTS[b.place])}`],note:`Needs ${items(b.goods)}`}));
  let top=WORLD_TWO_LEVEL;while(villageRequestValue(top)<villageRequestValue(top+1000))top++;
  const requestRows=[...new Set([WORLD_TWO_LEVEL,VILLAGE_THIRD_BOARD,110,120,130,150,top])].filter(n=>n<=top).sort((a,b)=>a-b).map(n=>{const value=villageRequestValue(n);
   return h.row(n,[n===top?`${number(n)}+`:number(n),n>=VILLAGE_THIRD_BOARD?VILLAGE_REQUEST_BOARDS+1:VILLAGE_REQUEST_BOARDS,n>=VILLAGE_THREE_KINDS?'2 or 3':'2',`${art('coins')}${number(value)}`,`${art('coins')}${number(Math.ceil(value*VILLAGE_PREMIUM))} and ${number(Math.round(value/VILLAGE_XP_SHARE))} XP`]);});
  // The landmarks (Oct 2026): the golden brief after the last place, one at a time.
  const landmarks=Object.values(VILLAGE_LANDMARKS);
  const landmarkRows=landmarks.map(l=>h.row(l.level,[`${art(l.art)}${l.name}`,h.lvl(l.level),`${art('coins')}${number(l.coins)} + ${items(l.materials)}`,l.effect]));
  // A card's bonus stands on its own line under the goods (10 Oct 2026, review fix): the page translates the text between two pictures
  // on its own, and ". Village Fields batches take 25% less time." after the goods matched no translation.
  const landmarkCards=landmarks.map(l=>card({picture:l.art,title:l.name,badge:h.lvl(l.level),locked:h.locked(l.level),stats:[`${art('coins')}${number(l.coins)}`],note:`Needs ${items(l.materials)}<br>${l.effect}`}));
  // The Village tab of the diamond shop (20 Oct 2026): each item with its card's line, its price and its level, by level.
  const shopItems=Object.entries(VILLAGE_SHOP).sort((a,b)=>a[1].level-b[1].level),shopArt=item=>item.art??VILLAGE_LANDMARKS.windpump.art;
  const shopLine=id=>id==='landmark'?'Everything the next landmark still needs, handed in right away.':villageLine({id});
  const shopPrice=item=>item.cost?`${art('diamonds')}${number(item.cost)}`:`${art('diamonds')}1 per ${number(LANDMARK_COINS_PER_DIAMOND)} coins`;
  const villageShopRows=shopItems.map(([id,item])=>h.row(item.level,[`${art(shopArt(item))}${item.name}`,shopLine(id),shopPrice(item),h.lvl(item.level)]));
  const villageShopCards=shopItems.map(([id,item])=>card({picture:shopArt(item),title:item.name,badge:h.lvl(item.level),locked:h.locked(item.level),stats:[shopPrice(item)],note:shopLine(id)}));
  // What the Village Fields sow (Oct 2026), and the upgrade goods of a place that opens before level 125 and of one after it.
  const sown=Object.values(RECIPES).filter(r=>r.building==='villagefields').map(r=>item(Object.keys(r.output)[0],0)).join('');
  // Lunches and Village crops (10 Oct 2026, review fix): every text ends before its goods' pictures, so each text between two pictures
  // is a whole sentence the translations know (one cut in half by the pictures stayed English).
  const lunchKitchen=`Every trip into the mine or the forest takes packed lunches. The ${BUILDINGS[RECIPES.packedlunch.building].name} packs ${RECIPES.packedlunch.output.packedlunch} at a time from:`;
  const lunchCanteen=`From level ${BUILDING_LEVELS.canteen} the ${BUILDINGS.canteen.name} bakes ${RECIPES.pastylunch.output.packedlunch} at a time without apples, from:`;
  const cropsSown=`From level ${BUILDING_LEVELS.villagefields} the ${BUILDINGS.villagefields.name} grow these crops from natural fertilizer and coins, with no field on the farm:`;
  const cropsSold='Make the fertilizer at the farm’s Windmill. Village crops sell only at the Village market, and like the farm’s crops their price changes only a little from day to day.';
  const plankExample=upgradeGoods('mine',6),tileExample=upgradeGoods('linenloft',6);
  // Builder's crates: an upgrade to level 10 costs the same for every farm building; crates take off at most half of it.
  const crateTop=upgradeCost({buildings:{dairy:{level:MAX_BUILDING_LEVEL-1}},boosts:{}},'dairy'),crateMax=Math.floor(crateTop/2/BUILDER_CRATE_COINS);
  return section('Your second world',facts([
   ['village-badge',`From level ${WORLD_TWO_LEVEL}`,`The road out of the valley leads to a village in the mountains. Travel there with the Village button (on a phone: More → The Village) or the signpost past the Trade Depot, and back with My farm. From level ${WORLD_TWO_TEASER} you can see the closed bridge on the way.`],
   ['coins','One farm, two places','Your coins, diamonds and XP are the same in both. Your fields and buildings keep working while you are in the village, and the village keeps working while you are on the farm.'],
   ['packedlunch','Lunch from the farm',`${lunchKitchen}${items(RECIPES.packedlunch.input)} ${lunchCanteen}${items(RECIPES.pastylunch.input)}`],
   ['villagemarket','The market square','Tap the market on the village square. On top, a golden brief builds the next village place, and after the last place a landmark; under it, villagers ask for goods. To sell single goods at today’s prices, use the Market button.'],
   ['potatoes','Village crops',`${cropsSown}${sown} ${cropsSold}`],
   ['coins','Village goods stay in the village','Village goods sell at the Village market (the Market button in the village) and to the villagers at the market square, who also ask for some of your farm’s goods. Village goods never go to the farm Market, Family Orders or family sharing. Prices change every day, as at the farm.'],
   ['plank','Upgrades with planks and stone',`Village places upgrade with planks and stone; the places from level ${VILLAGE_TILES_FROM} on take roof tiles too. From the upgrade to level 4 a place asks ${VILLAGE_UPGRADE_GOODS.plank} planks and ${VILLAGE_UPGRADE_GOODS.stone} stone for every level it has: a level-6 place takes ${number(plankExample.plank)} planks and ${number(plankExample.stone)} stone to reach level 7. A place that opens at level ${VILLAGE_TILES_FROM} or later also takes ${VILLAGE_UPGRADE_TILES} roof tiles for every level, ${number(tileExample.rooftile)} at level 6.`],
   ['quests','Kept apart',`The village has its own quests, its own tab in the farm journal and its own leaderboards, all under Village. What you make and sell in the village counts there: the farm's quests and leaderboards stay the farm's. From level ${WORLD_TWO_LEVEL} one daily challenge asks you to help villagers at the market square.`],
   // 20 Oct 2026: the village leagues (the Events article).
   ['live-events','Village events',`From level ${WORLD_TWO_LEVEL} your events have village goals, in a village league of your level. Each one you finish counts in Village events, on your profile and the Village leaderboard, and in Events finished. See ${h.link('events')}.`]
  ]))
  +section('Golden briefs',`<p>${h.lvl(WORLD_TWO_LEVEL)} Village places are built with coins and village goods, one at a time, in this order. Each place you build gives ${VILLAGE_BUILD_XP} XP.</p>`+dual(table(['Place','Opens','Costs'],briefRows),briefCards)+'<p>After the last place, the golden brief builds the landmarks.</p>')
  +section('Landmarks',`<p>${h.lvl(landmarks[0].level)} After the last village place the golden brief builds five landmarks, one at a time. Bring the goods bit by bit, then pay to finish. The bonus lasts for good. Each landmark gives ${number(VILLAGE_LANDMARK_XP)} XP; the ${VILLAGE_LANDMARKS.greathall.name} also gives ${GREAT_HALL_DIAMONDS} diamonds once and rings a bell for every villager who comes.</p>`+dual(table(['Landmark','Opens','Costs','Bonus'],landmarkRows),landmarkCards))
  +section('Villagers’ requests',`<p>${h.lvl(WORLD_TWO_LEVEL)} Villagers pay half again what their goods are worth (${VILLAGE_HALL_PREMIUM} times once the ${VILLAGE_LANDMARKS.greathall.name} is built), and a ${VILLAGE_XP_SHARE}th of it in XP. A request pays what it shows: coin boosts and VIP do not add to it. They ask for two kinds of goods: packed lunches and village goods from places you have built, at most one of the farm’s late goods, and something you have at least half of in stock when you can. From level ${VILLAGE_THREE_KINDS} they often ask for three kinds of goods. They never ask for master tools, heirloom flour or builder’s crates. A new villager comes ${VILLAGE_REQUEST_WAIT/3600000} hours after you help or say no. From level ${VILLAGE_THIRD_BOARD}, three villagers at a time, and a fourth with the ${VILLAGE_LANDMARKS.lookout.name}.</p>`+table(['Level','Villagers','Kinds of goods','A request is worth about','Pays'],requestRows))
  +section('Market week',`<p>${h.lvl(VILLAGE_WEEK_LEVEL)} Help ${VILLAGE_WEEK_TARGET} villagers between Monday and Sunday and the market crate gives you ${VILLAGE_CRATE_DIAMONDS} diamonds. It opens by itself, once a week. A week starts on Monday at 00:00 UTC, and a week that falls short costs nothing.</p>`)
  // The miller's order (17 Oct 2026): the heirloom bakes' weekly use, at the market square.
  +section('The miller’s order',`<p>${h.lvl(MILLER_LEVEL)} Once a week the miller at the market square asks for ${MILLER_ORDER.goldenloaf} golden loaves and ${MILLER_ORDER.heirloompie} heirloom pies, baked with heirloom flour from the Village Windmill. He pays twice what they are worth (${number(millerValue()*MILLER_PREMIUM)} coins), ${MILLER_DIAMONDS} diamonds and a ${VILLAGE_XP_SHARE}th of their worth in XP. One order a week: a week starts on Monday at 00:00 UTC, and a week you miss costs nothing.</p>`)
  +(LAKE_OPEN?lakeSection(h):'')
  +section('Diamonds in the village',`<p>${h.lvl(WORLD_TWO_LEVEL)} The diamond shop has a Village tab. Opened in the village, the shop starts on it. There is also a small diamond button at the boat, at an empty villager board and at the lake.</p>`
   +dual(table(['Item','What it does','Diamonds','Opens'],villageShopRows),villageShopCards)
   +`<p>Landmark supplies hand in everything the next landmark still needs, at 1 diamond for every ${number(LANDMARK_COINS_PER_DIAMOND)} coins the goods are worth: the whole ${VILLAGE_LANDMARKS.windpump.name} costs ${number(landmarkFullCost('windpump'))}. Give your own goods first and it costs less. You still pay the coins to finish it.</p>`
   +`<p>The ${BOOSTS.farmhand.name} from Power-ups adds a slot in the village places too.</p>`)
  +section('Past level 10',`<p>Master tools from the Smithy take a farm production building past level ${MAX_BUILDING_LEVEL}, one level at a time, up to ${TOP_BUILDING_LEVEL}. Every level past ${MAX_BUILDING_LEVEL} gives each batch a ${Math.round(DOUBLE_BATCH_PER_LEVEL*100)}% chance to come out double, decided when it starts. The Factory and the village's own places stop at level ${MAX_BUILDING_LEVEL}.</p>`+dual(table(['Building level','Opens','Costs','Double batches'],steps),stepCards))
  +section('Builder’s crates',`<p>${h.lvl(RECIPE_LEVELS.builderscrate)} Pack them at the ${BUILDINGS.lumbercamp.name}: ${RECIPES.builderscrate.input.plank} planks, ${RECIPES.builderscrate.input.rooftile} roof tiles and ${RECIPES.builderscrate.input.ironbar} iron bars make one. Each builder’s crate takes ${number(BUILDER_CRATE_COINS)} coins off a farm building upgrade, up to half the price. On the upgrade card of a farm building below level ${MAX_BUILDING_LEVEL}, Use crates pays with as many as it can take, after the Buildings discount. They do not work on the Factory, the steps past level ${MAX_BUILDING_LEVEL} or the village’s own places. An upgrade to level ${MAX_BUILDING_LEVEL} costs ${number(crateTop)} coins: ${crateMax} crates take ${number(crateMax*BUILDER_CRATE_COINS)} off it.</p>`)
  +blocks
  +section('Made on the farm',`<p>The farm makes these for and from the village. The Factory can make them in bulk too.</p>`+dual(table(['Makes','Where','Needs','Time','Opens'],farmRows),farmCards))
  +section('Village quests',`<p>In Your quests, switch to Village. Each quest opens at its level and pays coins and XP once.</p>`+dual(table(['Quest','Goal','Opens','Reward'],questRows),questCards));
 },
 diamonds(h){
  // Each length with its price, as the diamond shop's length list shows them: "30 min", then the diamond and the price (7 Oct 2026:
  // they were joined with middle dots). The table lists them in lined-up columns (wiki.css .wiki-prices), a card gives each its own
  // pill; one price is one pill.
  const boostPrices=b=>b.prices?Object.entries(b.prices).map(([length,cost])=>`${length.replace('m',' min').replace('h',' hour').replace('d',' day')} ${art('diamonds')}${number(cost)}`):[`${art('diamonds')}${number(b.cost)}`];
  const boosts=Object.values(BOOSTS).map(b=>`<tr><td>${art(b.art)}${b.name}</td><td>${b.description}</td><td>${b.prices?`<span class="wiki-prices">${boostPrices(b).map(p=>`<span>${p}</span>`).join('')}</span>`:boostPrices(b)[0]}</td></tr>`);
  const boostCards=Object.values(BOOSTS).map(b=>card({picture:b.art,title:b.name,stats:boostPrices(b),note:b.description}));
  const vip=Object.values(VIP_PLANS).map(p=>`<tr><td>${Math.round(p.duration/86400000)} days of VIP</td><td>${art('diamonds')}${number(p.cost)}</td></tr>`);
  const packs=DIAMOND_PACKS.map(p=>`<tr><td>${art('diamonds')}${number(p.amount)}</td><td>${p.price}</td></tr>`);
  return section('Earning diamonds',facts([
   ['gift','Every day',`Your daily gift and daily challenges. See ${h.link('daily')}.`],
   ['quests','Beginner guide and levels',`${BEGINNER_REWARD} diamonds for the beginner guide, and at least 1 diamond with every level-up.`],
   ['live-events','Events and family',`${h.link('events','Events')} and your ${h.link('family','Farm family')} give diamonds too.`],
   ...(h.portal?[]:[['invite-friends','Invite a friend',`When a friend you invite reaches level ${INVITE_LEVEL} within ${INVITE_DAYS} days: ${INVITE_REWARD} diamonds for you both.`],
   ['letter','Confirm your email',`${EMAIL_BONUS} diamonds, once. Signed up with Google or Facebook? You get them straight away.`]])
  ]))
  +section('Finish now',`<p>Finish a growing field for ${SINGLE_CROP_COST} diamonds, or a running batch for ${SINGLE_BATCH_COST} (not in the Factory).</p>`)
  // The coin pack (20 Oct 2026): 1,000 coins for every level of the farm, in Power-ups.
  +section('Coins for diamonds',`<p>In Power-ups: ${number(COIN_PACK.perLevel)} coins for every level of your farm (${number(COIN_PACK.perLevel*10)} at level 10, ${number(COIN_PACK.perLevel*50)} at level 50) for ${COIN_PACK.cost} diamonds, as often as you like.</p>`)
  +section('Boosts',`<p>${h.lvl(FEATURE_LEVELS.boosts)} Boosts in the diamond shop. Buying a timed boost again adds the time after it.</p>`+dual(table(['Boost','What it does','Diamonds'],boosts),boostCards))
  +section('VIP',`<p>VIP gives 10% faster crops, 10% faster production, 5% more coins at the market and double daily rewards. Buying again adds time; it never gets stronger.</p>`+table(['Plan','Diamonds'],vip))
  // The App Store's sentence is a text of its own (Oct 2026), so the website's and Google Play's keep their translations. On Kongregate
  // (Kreds, 15 Oct 2026) the prices are Kongregate's own, in Kreds: no euro table, and the pass is in its own section.
  +(!h.shop?'':h.kreds?section('Buying diamonds',`<p>One-time purchases with Kreds, Kongregate’s own currency, added to your farm right after payment. The diamond shop shows each price in Kreds. From level ${STARTER_LEVEL} there is also a Starter Pack for ${STARTER_DAYS} days.</p>`)
  :section('Buying diamonds',`<p>${h.appStore?`One-time purchases, added right after payment. Payments go through the App Store; we never see your card. The bigger the pack, the more diamonds per euro. From level ${STARTER_LEVEL} there is also a Starter Pack for ${STARTER_DAYS} days.`
   :`One-time purchases, added right after payment. ${h.play?'Payments go through Google Play':'Payments go through Stripe'}; we never see your card. The bigger the pack, the more diamonds per euro. From level ${STARTER_LEVEL} there is also a Starter Pack for ${STARTER_DAYS} days.`}${passSale(h.now)?` From level ${SEASON_PASS.level} the ${h.link('daily',SEASON_PASS.name,slug(SEASON_PASS.name))} opens its paid rewards for €${(SEASON_PASS.cents/100).toFixed(2)}. ${passSale(h.now)}`:''}</p>`+table(['Diamonds','Price'],packs)));
 },
 chat(h){
  return (h.crazygames?section('Who can chat','<p>The chat is for farmers who are logged in with CrazyGames, when CrazyGames has the chat switched on. Playing as a guest? Tap the chat button to log in with CrazyGames; your farm comes with you.</p>'):'')
  +section('The chat',facts([
   ['bell','Notifications','News from the Harvest Tycoon team, and gifts.'],
   ['chat','Global','Everyone in the valley. Be kind: new farmers read along too.'],
   ['family-members','Family',`Only your ${h.link('family','Farm family')}.`],
   ['letter','Private','One-to-one messages. Search a farmer by name, or open their profile.'],
   // Mentions (3 Oct 2026, src/chat-rich.js): the one rule, on the page that explains the chat.
   ['chat','Mentions','Type @ in Global or Family and pick a farmer, or choose Mention in the menu of their message. A mention reaches them like a private message.'],
   // Links (4 Oct 2026, src/chat-rich.js): what a link becomes; the rule itself is in House rules below. On CrazyGames no app page
   // (their build promotes no app) and no Farm app in Settings.
   ['guide','Links',h.portal?'A link to this wiki or a part of Settings shows as a button that opens it. A Settings link shows the way there, such as Settings › Sound.':'A link to this wiki, the app page or a part of Settings shows as a button that opens it. A Settings link shows the way there, such as Settings › Farm app.']
  ]))
  +section('Your choice',facts([
   ['settings','Private messages off','In Settings you can switch private messages off. Then nobody can start one with you, and you cannot start one either.'],
   ['block','Block','Blocked farmers can no longer send you private messages.'],
   ['alert','Report','Report a message or a farmer and a moderator will look at it.']
  ]))
  // Who the team is (1 Oct 2026; 3 Oct: two admins, each by name with their profile one tap away in the game, ADMINS above).
  +section('The admins and the moderators','<p>There are two admins, Gerard and Tony.</p>'+facts([
   ['admin',`<span>${adminName(h,ADMINS.gerard)}, community manager</span>`,'Your first contact: welcomes new farmers, answers questions and looks after the chat and the families.'],
   ['admin',`<span>${adminName(h,ADMINS.tony)}, developer</span>`,'Builds Harvest Tycoon: the game itself, the news, the events and the gifts for everyone.'],
   ['family-members','Moderators','Farmers who help keep the valley a friendly place. They look at what is reported and keep an eye on the chat.'],
   ['chat','How to spot them','An Admin or Moderator badge next to their name, in the chat and on their profile.']
  ])+`<p>The team never asks for your password or payment details. A question or a problem? Send one of them a private message, or use ${h.link('account','Feedback','sec-feedback')}.</p>`)
  +section('House rules',`<ul class="wiki-list"><li>Be friendly. No insults, threats or discrimination.</li><li>No spam, advertising or selling accounts.</li><li>Keep personal details to yourself: no phone numbers, addresses or passwords.</li><li>${h.portal?'No links, except to this wiki or a part of Settings: at most 2 in one message.':'No links, except to this wiki, the app page or a part of Settings: at most 2 in one message.'}</li><li>Moderators can remove messages and close the chat for someone for a while or for good. That only ever closes the chat, never your farm.</li></ul><p>Chat not open for you yet? The chat says from which level it opens.</p>`);
 },
 account(h){
  if(h.portal)return section('Your account',facts([
   h.signedIn?h.signedIn.farm
   :['farm','Your farm on CrazyGames','Logged in with CrazyGames, your farm is yours on any device. As a guest it stays with this browser: tap “Save your farm: log in with CrazyGames” in Settings to keep it. Your farm comes with you when you log in.']
  ]))
  +section('Settings','<p>In Settings you change your farmer name and avatar, sound and music, private messages and the language.</p>')
  +section('Feedback','<p>An idea, a question, something that does not work or something you would like to see? Tap More, then Feedback, choose Feedback, Report a bug or Request a feature and write a few words. Our team reads every message.</p>')
  +section('Avatars',avatarsBody(true))
  +section('Privacy',h.signedIn?signedInPrivacy():PORTAL_PRIVACY);
  // In the Android app (Oct 2026): no home screen or Farm app to point at; what the app says instead is the line Getting started already
  // has (so it is translated already). Push reminders only once the app offers its own notifications (h.appPush, src/app-push.js);
  // until then Settings has no switch for them there, so the line would promise one.
  return section('Your account',facts([
   h.app?['farm','One farm, everywhere','Your farm is saved to your account, so you can play on your phone and your computer. You need an internet connection to play.']
   :['farm','One farm, everywhere','Sign in on any device and your farm is there. You can also add Harvest Tycoon to your home screen and play it like an app: press and hold its icon for Chat, Daily gift and the leaderboard, and on Android or a computer you can play full screen (Settings, Farm app).'],
   ...(h.app&&!h.appPush?[]:[['bell','Reminders','Push reminders come once you allow notifications on your device (Settings): private messages, the daily gift and crops & goods ready are then on. Crops and goods share one reminder, at most once an hour and not at night. After 3 and 6 days away, the morning gift reminder tells you a comeback chest is waiting. Email reminders, and news and offers by email, stay off until you switch them on. The daily email (at most one a day, only when something is waiting) goes to a confirmed address: signed up with your email? Confirm it first.']])
  ]))
  // How you sign in (17 Oct 2026, src/account-sign-in.js): Your account says it, and a Google or Facebook farmer can set a password there.
  +section('Settings',`<p>In Settings you change your farmer name and avatar, sound and music, private messages, reminders and cookies. Your account, at the top, says how you sign in. Signed in with Google or Facebook? Tap Set a password there, and you can also sign in with your email address and password, for example in our apps. Forgot your password? Use “Forgot your password?” on the sign-in page.</p>`)
  // The mailbox button (30 Sep 2026, public/feedback-ui.js); in More on every screen since 18 Oct 2026 (the window shell).
  +section('Feedback','<p>An idea, a question, something that does not work or something you would like to see? Tap More, then Feedback, choose Feedback, Report a bug or Request a feature and write a few words. Our team reads every message.</p>')
  +section('Avatars',avatarsBody())
  +section('Confirm your email',`<p>Signed up with your email address? Confirm it once for ${EMAIL_BONUS} diamonds: tap “Confirm your email” in the menu and type the code we send you. Google and Facebook accounts get the diamonds straight away.</p>`)
  // Share my farm (Oct 2026, public/farm-share.js).
  +section('Invite a friend',`<p>Share your invite link. When your friend reaches level ${INVITE_LEVEL} within ${INVITE_DAYS} days, you both get ${INVITE_REWARD} diamonds, for up to ${INVITE_LIMIT} friends.</p><p>Or tap Share my farm on the level-up card or your own profile: a picture of your farm with your invite link.</p>`)
  +section('Privacy',`<p>Read how we handle your data in the <a href="/privacy">Privacy Policy</a>.</p><p>Want to stop? You can delete your account yourself under <strong>Settings</strong>, <strong>Privacy</strong>, <strong>Delete account</strong>: after a warning you type your farmer name and it is gone at once (<a href="/delete-account">what is deleted and what is kept</a>). A question? <a href="/support">Contact support</a>.</p>`);
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
   ['seedlab','Seed Lab',FEATURE_LEVELS.seedlab,`Two test beds beside the Glasshouse. Cross two crops into an heirloom: the first cross of a variety takes a day and discovers it (+${LAB_DISCOVER_DIAMONDS} diamonds), after that 8 hours. Each cross gives ${LAB_YIELD} heirlooms. Find all ${Object.keys(HEIRLOOMS).length} for +${LAB_COMPLETE_DIAMONDS} diamonds and a third test bed for good, so ${LAB_FULL_BEDS} crosses grow at once. Five new varieties open every two levels, and they sell with the crops.`],
   ['visitors','Valley visitors',FEATURE_LEVELS.visitors,`Someone comes up the road with a rush order. Deliver it within 12 hours for ${VISITOR_PREMIUM}× the goods’ price and ${VISITOR_DIAMONDS} diamonds. Every visitor served in a row makes the next order 10% bigger and better paid in coins, up to ${VISITOR_STREAK_MAX} in a row; one who leaves unserved, or is sent away, ends the run.`],
   ['giantpumpkin','Giant pumpkin',FEATURE_LEVELS.giantpumpkin,`At the fair, one a week. Tend it every 8 hours; it gains a little more each time, and ${GIANT_FEED_KG} kg more when you feed it ${GIANT_FEED.fertilizer} natural fertilizer. The scale pays ${number(GIANT_COINS_PER_KG)} coins a kilo and 1 diamond for every ${GIANT_KG_PER_DIAMOND} kg, up to ${GIANT_MAX_DIAMONDS}; a new record from ${GIANT_RECORD_MIN} kg adds ${GIANT_RECORD_DIAMONDS} diamonds. On Monday it is weighed in by itself.`],
   ['valleyprojects','Valley projects',FEATURE_LEVELS.valleyprojects,'Five big works, three levels each. Hand in the goods bit by bit, then pay the coins to finish a level. Every level adds a lasting bonus.']
  ].map(([picture,name,level,text])=>`<li>${art(picture)}<div><strong>${name} ${h.lvl(level)}</strong><p>${text}</p></div></li>`).join('')}</ul>`
   // XP curve 6 (Oct 2026, farm-state.js): the endgame is meant to last. Said once farms are on it.
   +(XP_CURVE>=6?`<p>From level ${TOP_XP_FROM}, the XP each level needs is doubled.</p>`:''))
  +section('Heirlooms',dual(table(['Heirloom','Cross','Opens','Sells for'],heirlooms),heirloomCards))
  +section('Valley projects',dual(table(['Project','Bonus','Each level'],projects),projectCards));
}
// The Fishing pond (11 Oct 2026, part C): the rule as the pond's own screen says it, and every fish from the rules (FISH). Coins depend on
// the level, so the table shows them at the farmer's level (in the game) or at the pond's own level (on the website). Page two (from
// level 20, a section of its own, its coins at level 20 or the farmer's): the first 8 kinds' chance below level 20 and from it (the 16
// share the pond then); in the game a farmer of 20 and up sees only the chance that is theirs. A farmer below 20 (the review, 11 Oct 2026)
// sees nothing of page two: the section reads as it did before page two came.
function pondSection(h){
 const at=h.level??POND_LEVEL,from=POND_PAGE_TWO_LEVEL,now20=h.level!=null&&h.level>=from,before20=h.level!=null&&h.level<from,kg=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
 const coins=(f,level)=>{const factor=1+level/8;return `${number(Math.round(f.coins*.8*factor))}–${number(Math.round(f.coins*1.2*factor))}`;};
 const weight=f=>`${kg(f.kg[0])}–${kg(f.kg[1])} kg`,[one,two]=FISH_PAGES;
 const chances=f=>now20?[`${f.chance20}%`]:before20?[`${f.chance}%`]:[`${f.chance}%`,`${f.chance20}%`];
 const rows=one.map(key=>{const f=FISH[key];return `<tr>${[`${art(`fish-${key}`)}${f.name}`,...chances(f),weight(f),`${art('coins')}${coins(f,at)}`,`${f.xp} XP`].map(c=>`<td>${c}</td>`).join('')}</tr>`;});
 const cards=one.map(key=>{const f=FISH[key];return card({picture:`fish-${key}`,title:f.name,stats:[`${now20?f.chance20:f.chance}%`,weight(f),`${art('coins')}${coins(f,at)}`,`${f.xp} XP`],note:now20||before20?'':`From level ${from}: ${f.chance20}%`});});
 const twoAt=Math.max(at,from);
 const rows2=two.map(key=>{const f=FISH[key];return h.row(from,[`${art(`fish-${key}`)}${f.name}`,`${f.chance20}%`,weight(f),`${art('coins')}${coins(f,twoAt)}`,`${f.xp} XP`]);});
 const cards2=two.map(key=>{const f=FISH[key];return card({picture:`fish-${key}`,title:f.name,badge:h.lvl(from),locked:h.locked(from),stats:[`${f.chance20}%`,weight(f),`${art('coins')}${coins(f,twoAt)}`,`${f.xp} XP`]});});
 return section('Fishing pond',`<p>${h.lvl(POND_LEVEL)} Fish at the pond while your crops grow: open it from its pin over the pier, from Buildings or from More. Tap to cast, tap again when the float dips, then hold to reel and keep the fish in the green.</p>`
  +`<ul class="wiki-list"><li>${POND_START_CASTS} casts to start, then a new one every ${POND_REFILL_MS/60000} minutes, up to ${POND_MAX_CASTS} waiting.</li><li>A cast is only used when you land a fish or let it go. A fish that gets away stays in the pond, a little more tired each time.</li>`
  +`<li>Every fish pays coins (more for a heavier fish and at a higher level) and XP. The first of each kind pays ${POND_NEW_FISH_COINS+1} times its coins and ${POND_NEW_FISH_XP} XP more.</li><li>Today’s fish pays double coins. A perfect catch, where the fish never left the green, pays ${Math.round(POND_PERFECT*100)}% more.</li>`
  +`<li>The fish book keeps your heaviest of each kind. Catch all ${one.length} kinds for ${POND_BOOK_DIAMONDS} diamonds, once.</li><li>Old Whiskers, the pond’s legend, is very rare, but your fish number ${POND_LEGEND_BY} is him if you have not landed him yet.</li><li>The pond has its own quests, from your first fish to a thousand. Fishing counts for no events, challenges or Family Chest.</li></ul>`
  +dual(table(['Fish',...(now20||before20?['Chance']:['Chance',`From level ${from}`]),'Weight',`Coins at level ${at}`,'XP'],rows),cards))
 +(before20?'':section('Fish book page 2',`<p>${h.lvl(from)} ${two.length} more kinds swim in the pond, on page 2 of the fish book. From then on the ${one.length+two.length} kinds share the pond, so each of the first ${one.length} comes less often, and a cast pays about what it did before.</p>`
  +`<ul class="wiki-list"><li>Catch all ${one.length+two.length} kinds, on both pages, for ${POND_BOOK2_DIAMONDS} diamonds more, once: ${POND_BOOK_DIAMONDS+POND_BOOK2_DIAMONDS} diamonds in all. From then on a new cast comes every ${POND_BOOK_REFILL_MS/60000} minutes at your pond.</li><li>The sturgeon, the pond’s giant, is very rare too, but one of your first ${POND_STURGEON_BY} fish from level ${from} is always a sturgeon.</li></ul>`
  +dual(table(['Fish','Chance','Weight',`Coins at level ${twoAt}`,'XP'],rows2),cards2)));
}
// The village lake (12 Oct 2026, plan D), in The Village: the pond's section for the lake, every number from the rules. As on the pond,
// a farmer below level 120 reads page one only (no "From level 120" column, no page two); the website shows both chances and page two.
function lakeSection(h){
 const at=Math.max(h.level??LAKE_LEVEL,LAKE_LEVEL),from=LAKE_PAGE_TWO_LEVEL,now120=h.level!=null&&h.level>=from,before120=h.level!=null&&h.level<from,kg=v=>v.toLocaleString('en-US',{maximumFractionDigits:2});
 const coins=(f,level)=>{const factor=1+level/8;return `${number(Math.round(f.coins*.8*factor))}–${number(Math.round(f.coins*1.2*factor))}`;};
 const weight=f=>`${kg(f.kg[0])}–${kg(f.kg[1])} kg`,[one,two]=LAKE_FISH_PAGES;
 const chances=f=>now120?[`${f.chance120}%`]:before120?[`${f.chance}%`]:[`${f.chance}%`,`${f.chance120}%`];
 const rows=one.map(key=>{const f=LAKE_FISH[key];return `<tr>${[`${art(`fish-${key}`)}${f.name}`,...chances(f),weight(f),`${art('coins')}${coins(f,at)}`,`${f.xp} XP`].map(c=>`<td>${c}</td>`).join('')}</tr>`;});
 const cards=one.map(key=>{const f=LAKE_FISH[key];return card({picture:`fish-${key}`,title:f.name,stats:[`${now120?f.chance120:f.chance}%`,weight(f),`${art('coins')}${coins(f,at)}`,`${f.xp} XP`],note:now120||before120?'':`From level ${from}: ${f.chance120}%`});});
 const twoAt=Math.max(at,from);
 const rows2=two.map(key=>{const f=LAKE_FISH[key];return h.row(from,[`${art(`fish-${key}`)}${f.name}`,`${f.chance120}%`,weight(f),`${art('coins')}${coins(f,twoAt)}`,`${f.xp} XP`]);});
 const cards2=two.map(key=>{const f=LAKE_FISH[key];return card({picture:`fish-${key}`,title:f.name,badge:h.lvl(from),locked:h.locked(from),stats:[`${f.chance120}%`,weight(f),`${art('coins')}${coins(f,twoAt)}`,`${f.xp} XP`]});});
 return section('Village lake',`<p>${h.lvl(LAKE_LEVEL)} Fish from the rowboat in the middle of the village lake: open it from its pin over the boat, from Buildings or from More. It plays like your farm’s fishing pond, with its own casts, its own fish and its own fish book, and its fish pay much more.</p>`
  +`<ul class="wiki-list"><li>${POND_START_CASTS} casts to start, then a new one every ${POND_REFILL_MS/60000} minutes, up to ${POND_MAX_CASTS} waiting. They are the lake’s own: fishing here never uses your farm pond’s casts, and the other way round.</li><li>A cast is only used when you land a fish or let it go. A fish that gets away stays in the lake, a little more tired each time.</li>`
  +`<li>Every fish pays coins (more for a heavier fish and at a higher level) and XP. The first of each kind pays ${POND_NEW_FISH_COINS+1} times its coins and ${POND_NEW_FISH_XP} XP more.</li><li>Today’s fish pays double coins. A perfect catch, where the fish never left the green, pays ${Math.round(POND_PERFECT*100)}% more.</li>`
  +`<li>The fish book keeps your heaviest of each kind. Catch all ${one.length} kinds for ${LAKE_BOOK_DIAMONDS} diamonds, once.</li><li>Old Granite, the lake’s legend, is very rare, but your lake fish number ${LAKE_LEGEND_BY} is him if you have not landed him yet.</li><li>The lake has its own village quests. Its fish count for village events, but not for challenges or the Family Chest.</li></ul>`
  +dual(table(['Fish',...(now120||before120?['Chance']:['Chance',`From level ${from}`]),'Weight',`Coins at level ${at}`,'XP'],rows),cards))
 +(before120?'':section('Village lake page 2',`<p>${h.lvl(from)} ${two.length} more kinds swim in the lake, on page 2 of its fish book. From then on the ${one.length+two.length} kinds share the lake, so each of the first ${one.length} comes less often, and a cast pays about what it did before.</p>`
  +`<ul class="wiki-list"><li>Catch all ${one.length+two.length} kinds, on both pages, for ${LAKE_BOOK2_DIAMONDS} diamonds more, once: ${LAKE_BOOK_DIAMONDS+LAKE_BOOK2_DIAMONDS} diamonds in all.</li><li>The Glacier Ghost, the lake’s giant, is very rare too, but one of your first ${LAKE_GHOST_BY} lake fish from level ${from} is always a Glacier Ghost.</li></ul>`
  +dual(table(['Fish','Chance','Weight',`Coins at level ${twoAt}`,'XP'],rows2),cards2)));
}
// One thing a level opens, as a chip (What opens when, and Getting started's first levels): one explained elsewhere leads there.
const openChip=(h,e)=>{const tag=e.to?'a':'span';return `<${tag} class="wiki-open"${e.mark??''}${e.to?` href="${h.to(...e.to)}" data-wiki-topic="${e.to[0]}"${e.to[1]?` data-wiki-anchor="${e.to[1]}"`:''}`:''}>${art(e.picture)||art('gift')}<span>${e.name}</span>${e.kind?`<small>${e.kind}</small>`:''}</${tag}>`;};
// Everything a level opens, not only the features: buildings, crops and the recipes that come later than their building (26 Sep 2026;
// between level 27 and 62 only buildings, crops and recipes open, and a features-only list looked empty there). to (Oct 2026): the
// [topic, spot] where it is explained.
// from: the first level listed (Getting started lists level 1 too, 20 Oct 2026).
function opensByLevel(app=false,from=2){
 const opens=new Map(),add=(n,entry)=>{if(n>=from)(opens.get(n)??opens.set(n,[]).get(n)).push(entry);};
 const featureArt={fishing:'fishingpond',challenges:'quests',mastery:'trophy',activities:'helping-hand',family:'familyhall',boosts:'boost',projects:'estate'};
 for(const [key,n] of Object.entries(FEATURE_LEVELS))add(n,{picture:featureArt[key]??key,name:featureTitle(key),to:FEATURE_SPOTS[key]});
 // Plan F (13 Oct 2026): village orders and special commissions, as on their level's card (farm-state.js unlockEntries).
 for(const [tier,n] of Object.entries(DELIVERY_LEVELS))if(tier!=='quick')add(n,{picture:tier==='village'?'cart':'trophy',name:tier==='village'?'Village orders':'Special commissions',to:['daily','sec-delivery-orders']});
 add(EVENTS_LEVEL,{picture:'live-events',name:'Events',to:['events']});if(!app)add(STARTER_LEVEL,{picture:'gift',name:'Starter Pack',mark:' data-shop-only'});
 for(const [key,b] of Object.entries(BUILDINGS))if(b.type==='production'&&!worldTwoBuilding(key))add(buildingLevel(key),{picture:key,name:b.name,kind:'building',to:['buildings',`building-${key}`]});
 for(const [key,c] of Object.entries(CROPS))add(cropLevel(key),{picture:key,name:c.name,kind:'crop',to:['crops',`crop-${key}`]});
 for(const [id,r] of Object.entries(RECIPES))if(r.building!=='factory'&&!worldTwoRecipe(r)&&recipeLevel(id)>buildingLevel(r.building))add(recipeLevel(id),{picture:Object.keys(r.output)[0],name:r.name,kind:'recipe',to:['buildings',`building-${r.building}`]});
 return opens;
}
// Where each feature in What opens when is explained (Oct 2026); one without a spot of its own leads to its topic.
const FEATURE_SPOTS={fishing:['helpers','sec-fishing-pond'],challenges:['daily','sec-daily-challenges'],cart:['daily','sec-delivery-orders'],activities:['helpers','sec-a-helping-hand'],chores:['helpers','sec-farm-chores'],mastery:['crops','sec-medals'],family:['family'],stall:['helpers','sec-farm-stall'],tractor:['helpers','sec-tractor'],boosts:['diamonds','sec-boosts'],silo:['crops','sec-silo-research'],projects:['estate','sec-estate-chapters'],valleymarket:['estate','sec-something-to-grow-towards'],ranch:['estate','sec-something-to-grow-towards'],estateworkshop:['estate','sec-estate-workshop-improvements'],tradedepot:['estate','sec-something-to-grow-towards'],grandfair:['estate','sec-after-level-90'],master:['estate','sec-after-level-90'],seedlab:['estate','sec-heirlooms'],visitors:['estate','sec-after-level-90'],giantpumpkin:['estate','sec-after-level-90'],valleyprojects:['estate','sec-valley-projects']};
const featureTitle=key=>({family:'Farm family',boosts:'Diamond boosts'})[key]??{fishing:'Fishing pond',challenges:'Daily challenges',chores:'Farm chores',stall:'Farm stall',mastery:'Medals',tractor:'Tractor',silo:'Silo research',cart:'Delivery orders',projects:'Estate projects',activities:'A helping hand',valleymarket:'Valley Market',ranch:'The Ranch',estateworkshop:'Estate Workshop',tradedepot:'Trade Depot',grandfair:'Grand Valley Fair',master:'Master points',seedlab:'Seed Lab',visitors:'Valley visitors',giantpumpkin:'Giant pumpkin',valleyprojects:'Valley projects'}[key]??key;

const RELATED={'getting-started':['crops','daily','quests'],crops:['buildings','market','helpers'],buildings:['crops','market','daily'],market:['buildings','daily','family'],quests:['getting-started','crops','buildings'],daily:['market','events','diamonds'],family:['chat','events','daily'],events:['family','daily','diamonds'],helpers:['crops','estate','buildings'],estate:['helpers','buildings','quests'],village:['estate','buildings','market'],diamonds:['daily','events','account'],chat:['family','account','events'],account:['chat','diamonds','getting-started']};

export function wikiArticle(id,ctx={}){
 const topic=TOPIC[id];if(!topic||!topicShown(id,ctx))return null;const h=helpers(ctx);
 let html;scope=h;try{html=BODIES[id](h);}finally{scope=null;}
 return {...topic,...(h.portal&&PORTAL_BLURBS[id]?{blurb:PORTAL_BLURBS[id]}:{}),html,related:(RELATED[id]??[]).filter(r=>topicShown(r,ctx)).map(r=>TOPIC[r])};
}
// The heading of a spot on a topic (Oct 2026; the chat shows a wiki link as a chip with it): a section's or a building's title, a crop's
// or a level's name, or the topic's own title where the page has no such spot (now: a season that is over, the app, CrazyGames). null:
// no such topic. English, as on the page: the page's translation does the rest.
// Writing a whole topic takes a phone up to a tenth of a second, and the chat names every link it shows: without a ctx a spot's title is
// kept for the hour (Oct 2026 review; a season's section comes and goes, so not for longer). At most 200 kept.
const TITLES=new Map();let titlesHour=-1;
export function wikiSectionTitle(id,section='',ctx={}){
 if(!TOPIC[id])return null;
 const keep=!Object.keys(ctx).length,hour=Math.floor(Date.now()/3600000),key=`${id}#${section}`;
 if(keep&&(hour!==titlesHour||TITLES.size>=200)){TITLES.clear();titlesHour=hour;}
 if(keep&&TITLES.has(key))return TITLES.get(key);
 const title=sectionTitle(id,String(section??''),ctx);if(keep)TITLES.set(key,title);return title;
}
function sectionTitle(id,section,ctx){
 const html=/^[a-z0-9-]+$/.test(section)&&wikiArticle(id,ctx)?.html;if(!html||!html.includes(`id="${section}"`))return TOPIC[id].title;
 const [,crop]=section.match(/^crop-(.+)$/)??[],[,level]=section.match(/^level-(\d+)$/)??[],m=html.match(new RegExp(`id="${section}">(?:<summary>)?<h3>(.*?)</h3>`));
 return crop?CROPS[crop].name:level?`Level ${level}`:m?m[1].replace(/<[^>]+>/g,'').trim():TOPIC[id].title;
}
export const wikiHero=topic=>`<header class="wiki-hero" style="--tint:${TINTS[topic.id]??'#efe6d8'}"><div><h3>${topic.title}</h3><p>${topic.blurb}</p></div>${art(topic.art)}</header>`;
// The jump bar: one chip per section of the page (a building's chip has its picture).
export function wikiJump(article){
 const chips=[...article.html.matchAll(/<(?:section|details) class="wiki-section[^"]*" id="([^"]+)">(?:<summary>)?<h3>(.*?)<\/h3>/g)].map(([,id,label])=>`<a href="#${id}" data-wiki-jump="${id}">${label}</a>`);
 return chips.length>1?`<div class="wiki-jump-wrap"><nav class="wiki-jump" aria-label="On this page">${chips.join('')}</nav></div>`:'';
}
// In the game The Village shows from level WORLD_TWO_LEVEL (Oct 2026, the owner's choice: it showed from 90), in the list, in search and
// when a link (from the chat, say) opens it; below it a farmer sees the closed bridge on the farm and nothing more. The website shows
// every topic.
const topicShown=(id,ctx)=>id!=='village'||ctx.level==null||ctx.level>=WORLD_TWO_LEVEL;
// Getting started, while it is the one to read first, stands above its group's grid; the grid has two columns (one on a phone),
// and an odd last tile takes the whole row, so a group never ends in a gap (wiki.css).
export const wikiGroups=(ctx={},{featured=true}={})=>WIKI_GROUPS.map(g=>{
 const ids=g.ids.filter(id=>topicShown(id,ctx)),first=featured&&ids[0]==='getting-started';
 return `<section class="wiki-group"><h3>${g.title}</h3>${first?wikiTile(TOPIC[ids[0]],ctx,{featured:true}):''}<div class="wiki-tiles">${ids.slice(first?1:0).map(id=>wikiTile(TOPIC[id],ctx)).join('')}</div></section>`;
}).join('');
// "Read next" under a topic: a short row per topic, picture and title.
export const wikiNext=(topic,ctx={})=>{const h=helpers(ctx);return `<a class="wiki-next" href="${h.href(topic.id)}" data-wiki-topic="${topic.id}">${art(topic.art)}<strong>${topic.title}</strong><i aria-hidden="true">›</i></a>`;};
export const wikiTile=(topic,ctx={},{featured=false}={})=>{const h=helpers(ctx);return `<a class="wiki-tile${featured?' is-featured':''}" href="${h.href(topic.id)}" data-wiki-topic="${topic.id}">${art(topic.art)}<strong>${topic.title}${featured?' <b class="wiki-badge">Read first</b>':''}</strong><span>${h.portal&&PORTAL_BLURBS[topic.id]||topic.blurb}</span><i aria-hidden="true">›</i></a>`;};

// The search box and its quick searches, the same in How to play and on the website. App comes first and goes straight to how to
// install it: many players do not know there is one.
export const WIKI_QUICK=Object.freeze([{label:'App',topic:'getting-started',anchor:'sec-play-it-as-an-app'},'Corn','Apples','Cheese','Tractor','VIP','Farm family']);
export const wikiSearchBox=()=>`<label class="wiki-search">${art('guide')}<input type="search" id="wiki-search" placeholder="Search the wiki: corn, cheese, tractor…" aria-label="Search the wiki" autocomplete="off"></label>`;
export const wikiQuick=(ctx={})=>{const h=helpers(ctx);return `<div class="wiki-quick" aria-label="Quick searches">${WIKI_QUICK.filter(q=>!(!h.install&&q.label==='App')).map(q=>typeof q==='string'?`<button type="button" data-wiki-query="${q}">${q}</button>`:`<a href="${h.href(q.topic)}#${q.anchor}" data-wiki-topic="${q.topic}" data-wiki-anchor="${q.anchor}">${q.label}</a>`).join('')}</div>`;};

// Search: topic titles, blurbs and keywords, plus every crop, building and product by name (pointing to its topic).
const INDEX=[
 ...WIKI_TOPICS.map(t=>({topic:t.id,label:t.title,art:t.art,text:`${t.title} ${t.blurb} ${t.keywords}`.toLowerCase()})),
 ...Object.entries(CROPS).map(([k,c])=>({topic:'crops',label:c.name,art:k,text:c.name.toLowerCase(),anchor:`crop-${k}`})),
 // The Farmhouse and the Family Hall (Oct 2026): "farmhouse" and "expand" found nothing. Single words, so no text to translate.
 {topic:'buildings',label:BUILDINGS.farmhouse.name,art:'farmhouse',text:[BUILDINGS.farmhouse.name.toLowerCase(),'expand','expansion','fields','field','land','plots'].join(' '),anchor:'building-farmhouse'},
 {topic:'buildings',label:BUILDINGS.familyhall.name,art:'familyhall-model',text:BUILDINGS.familyhall.name.toLowerCase(),anchor:'building-familyhall'},
 // The Fishing pond (11 Oct 2026), once it is open: its name, the fish and the book, single words like the Farmhouse's.
 ...(POND_OPEN?[{topic:'helpers',label:FEATURE_NAMES.fishing,art:'fishingpond',text:[FEATURE_NAMES.fishing.toLowerCase(),'fishing','fish','pond','book','float','rod',...Object.values(FISH).map(f=>f.name.toLowerCase())].join(' '),anchor:'sec-fishing-pond'}]:[]),
 ...PLAYER_AVATARS.filter(a=>a.level||avatarGoal(a.id)).map(a=>({topic:'account',label:a.name,art:'settings',text:`${a.name} avatar`.toLowerCase(),anchor:'sec-avatars'})),
 ...Object.entries(BUILDINGS).filter(([,b])=>b.type==='production').map(([k,b])=>({topic:worldTwoBuilding(k)?'village':'buildings',label:b.name,art:k,text:b.name.toLowerCase(),anchor:`building-${k}`})),
 // The Pier and the town boat, and the landmarks (Oct 2026): single English words, like the Farmhouse's entry. The Village topic is hidden
 // below level 100, so nothing of them is found there.
 {topic:'village',label:BUILDINGS.pier.name,art:'pier',text:[BUILDINGS.pier.name.toLowerCase(),'town','boat','cargo'].join(' '),anchor:'building-pier'},
 ...Object.values(VILLAGE_LANDMARKS).map(l=>({topic:'village',label:l.name,art:l.art,text:[l.name.toLowerCase(),'landmark'].join(' '),anchor:'sec-landmarks'})),
 ...Object.entries(RECIPES).flatMap(([,r])=>Object.keys(r.output).map(out=>({topic:worldTwoRecipe(r)?'village':'buildings',label:itemName(out),art:out,text:itemName(out).toLowerCase(),anchor:worldTwoRecipe(r)&&!worldTwoBuilding(r.building)?'sec-made-on-the-farm':`building-${r.building}`})))
];
// Everything search looks through, for the website's search (scripts/build-wiki.mjs writes it to /wiki/search.json).
export const wikiSearchIndex=()=>INDEX.map(entry=>({...entry,topicTitle:TOPIC[entry.topic].title}));
// level: the farmer's, in the game (Oct 2026): what a topic hidden at that level holds is not found (the village's goods and places below
// 100). The website's search (wikiSearchIndex) finds everything.
export function wikiSearch(query,{level=null}={}){
 const words=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return [];
 const seen=new Set(),hits=[];
 for(const entry of INDEX){if(!topicShown(entry.topic,{level})||!words.every(w=>entry.text.includes(w)))continue;const key=`${entry.topic}:${entry.label}`;if(seen.has(key))continue;seen.add(key);hits.push({...entry,topicTitle:TOPIC[entry.topic].title});}
 return hits.slice(0,12);
}
