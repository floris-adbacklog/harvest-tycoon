// The guides (/guides, 29 Oct 2026, the owner's choice 1 and 2): five guides to what people search for, and one page on what makes a
// good farming game, all about Harvest Tycoon only (no other game is ever named). Every number comes from the game rules
// (public/farm-state.js and the wiki's helpers), so a guide stays true when the game changes; scripts/build-guides.mjs makes the pages
// on every deploy, and scripts/build-ai-markdown.mjs their Markdown copies and their lines in llms.txt.
import {CROPS,CROP_LEVELS,STARTER_COINS,STARTER_FIELDS,MAX_PLOTS,BEGINNER_QUESTS,BEGINNER_REWARD,ROOKIE_BOOST_MS,WATER_CUT,WATER_TOWER_CUT,
 CARE_AT,CARE_CUT,WATER_MIN_MS,FERTILIZER_CUT,MARKET_RANGES,SHIP_BIN_BONUS,SHIP_BIN_LEVEL,DAILY_DIAMONDS,FAMILY_CONFIG,FAMILY_MIN_LEVEL,
 HOUR_EVENT_REWARDS,WORLD_TWO_LEVEL,WORLD_THREE_LEVEL,WORLD_THREE_TOP,STARTER_LEVEL,caredDuration,createFarm,rookieBoost} from '../public/farm-state.js';
import {EVENTS_LEVEL} from '../public/live-events-ui.js';
import {wikiTime} from '../public/wiki-content.js';

const number=n=>Math.round(n).toLocaleString('en-US');
const pct=x=>`${Math.round(x*100)}%`;
const minutes=ms=>ms/60000;
const wiki=(id,text,anchor='')=>`<a href="/wiki/${id}${anchor?`#${anchor}`:''}">${text}</a>`;
const guide=(slug,text)=>`<a href="/guides/${slug}">${text}</a>`;
const section=(title,body)=>`<section class="wiki-section guide-section"><h2>${title}</h2>${body}</section>`;
const table=(head,rows)=>`<div class="wiki-table-wrap"><table class="wiki-table"><thead><tr>${head.map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const list=items=>`<ul class="wiki-list">${items.map(i=>`<li>${i}</li>`).join('')}</ul>`;
const steps=items=>`<ol class="wiki-list">${items.map(i=>`<li>${i}</li>`).join('')}</ol>`;
const play='<p class="guide-play"><a class="wiki-play" href="/">Play Harvest Tycoon free</a></p>';

// The crops as a farmer meets them: in the order they open, with what one field earns per harvest and per hour (with water and care,
// at the Market's usual price; the day's price is up to 15% higher or lower).
export function cropEarnings(){
 return Object.entries(CROPS).map(([key,c])=>{
  const plain=c.duration,cared=caredDuration({},key),again=c.regrow?caredDuration({},key,true):null;
  const perHarvest=c.regrow?c.sell:c.sell-c.cost;
  return {key,name:c.name,level:CROP_LEVELS[key],seed:c.cost,sell:c.sell,plain,cared,again,regrow:Boolean(c.regrow),perHarvest,perHour:perHarvest/(minutes(again??cared)/60)};
 }).sort((a,b)=>a.level-b.level||a.plain-b.plain);
}

export const GUIDES=[
 {slug:'play-farming-game-in-browser',title:'Play a farming game in your browser: no download',
  description:'How to play Harvest Tycoon free in any browser on a phone, tablet or computer, with one farm on every device.',
  body(){
   return `<p>Harvest Tycoon is a free 3D farming game that runs in your web browser. There is nothing to download or install: open the website, make an account and your farm is there. You grow crops, make goods in your own buildings, sell them at the Market and turn a small farm into a big estate, at your own pace.</p>${play}`
   +section('What you need',list(['A phone, tablet or computer with a modern browser (Chrome, Safari, Edge or Firefox).','An internet connection: your farm is saved on our server as you play.','An account: email and a password, or sign in with Google, Facebook, Discord or (on Apple devices) Apple.','You must be 16 or older to play.']))
   +section('Start in a minute',steps(['Go to <a href="/">harvesttycoon.com</a>.','Tap Create account and choose how you sign in.','Your farm opens with a short guide. Follow it to plant, harvest and make your first sale.',`Finish the ${BEGINNER_QUESTS.length} steps of the guide for ${BEGINNER_REWARD} diamonds.`]))
   +section('One farm on every device',`<p>Your farm belongs to your account, not to the device. Sign in the same way on your phone, your tablet and your computer and you play the same farm everywhere: what you planted on your phone is growing on your computer. Sign in the way you did the first time: another way of signing in can start a new farm.</p>`)
   +section('Like an app, without the store',`<p>On a phone you can put the game on your home screen, so it opens full screen in one tap:</p>`+list(['<strong>Android:</strong> in Chrome, tap the menu (⋮) and choose “Install app” or “Add to Home screen”.','<strong>iPhone and iPad:</strong> in Safari, tap Share, then “Add to Home Screen”.','<strong>Computer:</strong> in Chrome or Edge, click the install icon at the right of the address bar.'])
    +`<p>Prefer a store app? Harvest Tycoon is also free on Google Play for Android and in the App Store for iPhone and iPad: see <a href="/app">Get the app</a>. It is the same game and the same farm.</p>`)
   +section('Free to play',`<p>You can play the whole game for free. Diamonds, the game’s special currency, come from the daily gift, quests, level-ups, events and more; you can also buy them, or a pass with extra rewards, but you never have to. The wiki explains ${wiki('diamonds','how to earn diamonds')}.</p>`)
   +section('Read next',list([guide('beginners-first-hour','Your first hour on the farm'),guide('best-crops-by-level','The best crops for every level'),wiki('getting-started','Getting started in the wiki')]));
  }},
 {slug:'beginners-first-hour',title:'Your first hour in Harvest Tycoon: a beginner’s guide',
  description:'The beginner guide step by step, what to plant first, and the head start every new farm gets in its first week.',
  body(){
   const now=Date.parse('2026-01-01T00:00:00Z'),boost=rookieBoost(createFarm(now),now);
   return `<p>A new farm starts with ${number(STARTER_COINS)} coins and ${STARTER_FIELDS} fields, and a short guide shows you every step. Here is what happens in your first hour, and how to make the most of it.</p>${play}`
   +section('The beginner guide',`<p>The guide has ${BEGINNER_QUESTS.length} steps. Each one points at what to tap, and when you finish all of them you get ${BEGINNER_REWARD} diamonds.</p>`
    +steps(BEGINNER_QUESTS.map(q=>`<strong>${q.title}</strong>`)))
   +section('A head start in your first week',`<p>Every new farm grows faster at first: crops and production batches take ${pct(boost)} less time when the farm is new. The head start gets smaller day by day and ends after ${Math.round(ROOKIE_BOOST_MS/86400000)} days, so the first sessions feel quick and coming back the next days still pays.</p><p>Your first sale at the Market pays double, so sell your first harvest instead of keeping it.</p>`)
   +section('Water early, care later',`<p>Every harvest gives one crop; water and care make it ripen sooner.</p>`+list([`<strong>Water</strong> takes ${pct(WATER_CUT)} off the time the crop still needs (${pct(WATER_TOWER_CUT)} once you have the Water tower). Water within the first minute after planting.`,`<strong>Extra care</strong> opens at ${pct(CARE_AT)} of the growing time and takes ${pct(CARE_CUT)} off what is left then.`,`<strong>Natural fertilizer</strong>, later on, takes ${pct(FERTILIZER_CUT)} off the time that is left.`])
    +`<p>So a crop that would take ${wikiTime(CROPS.corn.duration)} is ready in about ${wikiTime(caredDuration({},'corn'))} with water and care. ${wiki('crops','More about water and care','sec-water-and-care')}.</p>`)
   +section('What to plant first',`<p>While you are playing, plant quick crops: ${CROPS.wheat.name.toLowerCase()} and ${CROPS.corn.name.toLowerCase()} are ready in minutes, and ${CROPS.lettuce.name.toLowerCase()} opens at level ${CROP_LEVELS.lettuce}. Before you leave, plant something that takes longer, so your fields are working while you are away. ${guide('best-crops-by-level','The best crops for every level')} has the full list.</p>`)
   +section('After the guide',list([`<strong>Buildings</strong> turn crops into goods that sell for more: feed, eggs, flour, bread and many more. See ${wiki('buildings','Buildings and goods')}.`,`<strong>Quests</strong> always show your next goal, with coins and XP.`,`<strong>The daily gift</strong> grows over seven days in a row: ${DAILY_DIAMONDS.join(', ')} diamonds.`,`<strong>Farm families</strong> open at level ${FAMILY_MIN_LEVEL} and <strong>events</strong> at level ${EVENTS_LEVEL}. See ${guide('farming-with-friends','Farming with friends')}.`]))
   +section('Read next',list([guide('earn-coins-fast','How to earn coins fast'),guide('best-crops-by-level','The best crops for every level'),wiki('getting-started','Getting started in the wiki')]));
  }},
 {slug:'earn-coins-fast',title:'How to earn coins fast in Harvest Tycoon',
  description:'Quick crops, goods that sell for more, the Market’s daily prices, the shipping bin, orders and other ways to fill your purse.',
  body(){
   const quick=cropEarnings().filter(c=>!c.regrow&&c.cared<=3600000).sort((a,b)=>b.perHour-a.perHour).slice(0,5);
   const [lo,hi]=MARKET_RANGES.crops,[glo,ghi]=MARKET_RANGES.goods;
   return `<p>Coins pay for seeds, buildings, upgrades and more fields. These are the ways to earn them quickly, from your first minutes to the later game.</p>${play}`
   +section('1. Quick crops while you play',`<p>A field earns the most per hour with a quick crop that you water and care for, because you can replant it again and again. These earn the most per field per hour (at the Market’s usual price, with water and care):</p>`
    +table(['Crop','Opens at level','Ready in (water and care)','Earns per harvest','Per field per hour'],quick.map(c=>[c.name,c.level,wikiTime(c.cared),`${number(c.perHarvest)} coins`,`about ${number(c.perHour)} coins`]))
    +`<p>Quick crops need you there. When you go away, plant something that is ready when you come back. ${guide('best-crops-by-level','The best crops for every level')} lists them all.</p>`)
   +section('2. Make goods, not just crops',`<p>Crops sell for little compared with what your buildings make from them. Corn becomes feed, feed becomes eggs, wheat becomes flour and bread, and later on the goods get bigger and more valuable. Keep your buildings busy: they work while you are away. See ${wiki('buildings','Buildings and goods')}.</p>`)
   +section('3. Sell on a good day',`<p>Market prices change every day: a crop sells for ${pct(lo)} to ${pct(hi)} of its usual price, a good for ${pct(glo)} to ${pct(ghi)}. If a price is low today and you have room in the Warehouse, it can pay to wait a day. See ${wiki('market','Market and Warehouse')}.</p>`)
   +section('4. The shipping bin',`<p>From level ${SHIP_BIN_LEVEL}, drop crops and goods in the shipping bin instead of selling them now: it pays ${pct(SHIP_BIN_BONUS)} more than today’s price, the next morning.</p>`)
   +section('5. Orders, quests and level-ups',list(['<strong>Delivery orders</strong> pay well for the goods they ask for.','<strong>Quests</strong> pay coins and XP for goals you reach anyway.','<strong>Every new level</strong> brings coins: 10 × the level.','<strong>Farm chores</strong> pay a few coins while your crops and buildings work.']))
   +section('6. Your first sale',`<p>Your very first sale at the Market pays double. Sell your first harvest right away.</p>`)
   +section('Read next',list([guide('best-crops-by-level','The best crops for every level'),wiki('market','Market and Warehouse'),wiki('daily','Daily rewards and orders')]));
  }},
 {slug:'best-crops-by-level',title:'The best crops for every level in Harvest Tycoon',
  description:'Every crop with the level it opens at, its time with and without water and care, and what one field earns per harvest and per hour.',
  body(){
   const all=cropEarnings();
   return `<p>Which crop to plant depends on how long you will be away and which level you are. This table has every crop in the game in the order they open, with what one field earns at the Market’s usual price.</p>${play}`
   +section('Every crop',table(['Crop','Opens at level','Seed','Sells for','Grows in','With water and care','Earns per harvest','Per field per hour (water and care)'],
     all.map(c=>[c.name,c.level,`${number(c.seed)}`,`${number(c.sell)}`,wikiTime(c.plain),wikiTime(c.regrow?c.again:c.cared)+(c.regrow?' (grows back)':''),number(c.perHarvest),`about ${number(c.perHour)}`]))
    +'<p>Coins per field. Seed and sale prices are the usual ones; the Market’s price of the day is a little higher or lower.</p>')
   +section('While you play',`<p>Plant the quickest crops you have and water and care for them: they earn the most per field per hour. Early on that is ${all.filter(c=>c.level===1).map(c=>c.name.toLowerCase()).join(' and ')}, then ${CROPS.lettuce.name.toLowerCase()} from level ${CROP_LEVELS.lettuce} and ${CROPS.barley.name.toLowerCase()} from level ${CROP_LEVELS.barley}.</p>`)
   +section('While you are away',`<p>Pick a crop that is ready when you come back: a field earns nothing while it waits for you. Going to bed? A crop of 8 to 24 hours fills the night. Away for an hour or two? Pick one of about that length.</p>`)
   +section('Trees and bushes',`<p>Trees and bushes cost a lot to plant but grow back after every harvest, so you only buy them once. ${all.filter(c=>c.regrow).map(c=>`${c.name} (level ${c.level})`).join(', ')}. Water and care them every time, and pick them yourself to start the next harvest.</p>`)
   +section('More fields, more coins',`<p>You start with ${STARTER_FIELDS} fields and can have up to ${MAX_PLOTS}. Every field you add earns as much as the others, so new fields pay for themselves quickly. See ${wiki('crops','Fields and crops','sec-more-fields')}.</p>`)
   +section('Read next',list([guide('earn-coins-fast','How to earn coins fast'),wiki('crops','Fields and crops in the wiki')]));
  }},
 {slug:'farming-with-friends',title:'Farming with friends: families, chat and events',
  description:'Play Harvest Tycoon together: Farm families with a weekly chest and tournament, chat with farmers worldwide and a new event every hour.',
  body(){
   const [first,second,third]=HOUR_EVENT_REWARDS.podium;
   return `<p>Harvest Tycoon is a farm of your own, but you never play it alone. Here is how to play together with friends and with farmers from all over the world.</p>${play}`
   +section('Farm families',`<p>From level ${FAMILY_MIN_LEVEL} you can start a Farm family or join one, with up to ${FAMILY_CONFIG.MAX_MEMBERS} farmers.</p>`+list(['<strong>The Family Chest</strong> fills as the whole family plays during the week, and everyone collects the rewards.','<strong>The family order</strong> asks for goods that you deliver together, one line at a time.','<strong>The family tournament</strong> ranks the families every week.','<strong>Sharing</strong>: family members can share goods and help each other along.'])
    +`<p>See ${wiki('family','Farm family in the wiki')}.</p>`)
   +section('A new event every hour',`<p>From level ${EVENTS_LEVEL}, a new event starts every hour: one short goal for everyone in your league, such as harvesting a crop or making a good. The first three in a league win ${first}, ${second} and ${third} diamonds, and everyone who finishes wins a reward. When ${HOUR_EVENT_REWARDS.familyFinishers} or more farmers of one family finish, each of them gets ${HOUR_EVENT_REWARDS.familyDiamonds} diamonds more. See ${wiki('events','Events')}.</p>`)
   +section('Chat',`<p>Talk with farmers from all over the world in the chat, send private messages and mention a farmer to get their attention. Keep it friendly: the house rules are in ${wiki('chat','Chat and house rules')}.</p>`)
   +section('Invite a friend',`<p>Invite friends from the game and both of you get a reward once they have played a little. Their farm is their own, so you can each play at your own pace and help each other along.</p>`)
   +section('Visit a farm',`<p>Open another farmer’s profile and tap Visit farm to walk around their farm as it stands. You only look: nothing changes.</p>`)
   +section('Read next',list([guide('beginners-first-hour','Your first hour on the farm'),wiki('family','Farm family in the wiki'),wiki('events','Events in the wiki')]));
  }},
 {slug:'what-makes-a-good-farming-game',title:'What makes a good farming game? 10 things to look for',
  description:'Ten things that make a farming game worth your time, from playing anywhere to fair free-to-play, with how Harvest Tycoon does each one.',
  body(){
   return `<p>Farming games are about the quiet joy of watching something grow. But not every farming game is worth your evenings. Here are ten things to look for, and how Harvest Tycoon does each of them.</p>${play}`
   +section('1. You can play it anywhere',`<p>A good farming game goes where you go. Harvest Tycoon runs in any browser on a phone, tablet or computer, with no download, and the same farm is on every device. See ${guide('play-farming-game-in-browser','Play a farming game in your browser')}.</p>`)
   +section('2. It respects your time',`<p>Crops should grow while you are away, so a few minutes now and then are enough. In Harvest Tycoon your fields and buildings keep working when you close the game, and quick crops reward you for playing longer.</p>`)
   +section('3. The start is clear',`<p>The first minutes decide whether a game clicks. Harvest Tycoon starts with a guide of ${BEGINNER_QUESTS.length} short steps and a head start for new farms. See ${guide('beginners-first-hour','Your first hour')}.</p>`)
   +section('4. There is always a next goal',`<p>Quests, levels and medals give you something to work towards at every moment, from your first field to level ${WORLD_THREE_TOP}.</p>`)
   +section('5. Crops become something',`<p>Growing is only half of it. In a good farming game your harvest becomes feed, eggs, bread and many more goods in your own buildings, each a little more valuable than the last. See ${wiki('buildings','Buildings and goods')}.</p>`)
   +section('6. Trading has a little thrill',`<p>Market prices in Harvest Tycoon change every day, so selling at the right moment pays. The shipping bin and delivery orders give you more ways to sell. See ${guide('earn-coins-fast','How to earn coins fast')}.</p>`)
   +section('7. You play together',`<p>Farming is better with friends: Farm families with a weekly chest and tournament, a worldwide chat and a new event every hour. See ${guide('farming-with-friends','Farming with friends')}.</p>`)
   +section('8. Free means free',`<p>A fair free-to-play game lets you play the whole game without paying. In Harvest Tycoon diamonds come from the daily gift, quests, levels and events; buying them is a choice, never a wall.</p>`)
   +section('9. The world grows with you',`<p>A farm that never changes gets old. In Harvest Tycoon your farm becomes an estate, a village opens at level ${WORLD_TWO_LEVEL} and a harbour at level ${WORLD_THREE_LEVEL}, each with its own places, goods and goals.</p>`)
   +section('10. It feels calm and cheerful',`<p>Soft colours, animals that move, music to pick and gentle sounds: a farming game should be a nice place to come back to. You can also move your buildings and fields and decorate your farm the way you like it.</p>`)
   +section('Try it',`<p>Harvest Tycoon is free and runs in your browser. <a href="/">Start your farm</a>, or read the ${wiki('getting-started','wiki')} first.</p>`);
  }}
];
export const GUIDES_INDEX={title:'Harvest Tycoon guides: tips for your farm',heading:'Guides',description:'Guides to playing Harvest Tycoon: playing in your browser, your first hour, earning coins, the best crops for every level, farming with friends and what makes a good farming game.'};
