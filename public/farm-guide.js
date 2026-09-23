import {featureUnlocked,FEATURE_LEVELS,levelOf} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {EVENTS_LEVEL} from './live-events-ui.js';

// How to play: the whole game loop in four pictures, then three short groups of cards with one sentence each.
// Something that is not open yet says from which level, instead of a paragraph about it.
const LOOP=[['seeds','Plant'],['harvest','Harvest'],['buildings','Make'],['market','Sell']];

export function guideSections(state){
 const level=levelOf(state),lockedAt=(open,at)=>open?null:at;
 const feature=key=>lockedAt(featureUnlocked(state,key),FEATURE_LEVELS[key]);
 return [
  {title:'The basics',cards:[
   {art:'seeds',title:'Plant',text:'Pick a crop, then tap an empty field.'},
   {art:'water',title:'Water and care',text:'Each adds one crop and speeds it up. Do both for double XP.'},
   {art:'harvest',title:'Harvest',text:'Tap the basket when a crop is ready. Apples and berries grow back.'},
   {art:'buildings',title:'Make goods',text:'Tap a building to turn crops into goods that sell for more.'},
   {art:'market',title:'Sell or keep',text:'Prices change every day. Keep what you need for orders.'}
  ]},
  {title:'Grow your farm',cards:[
   {art:'quests',title:'Quests and levels',text:'Finish quests and level up for coins, diamonds and new things to do.'},
   {art:'hammer',title:'Upgrade',text:'Better buildings run more batches. The Farmhouse adds new fields.'},
   {art:'helping-hand',title:'Lend a hand',text:'Help at the Greenhouse, Apiary, paddock and workshop for rewards.',locked:feature('activities')},
   {art:'familyhall',title:'Farm family',text:'Weekly orders and a tournament together with other farmers.',locked:feature('family')},
   {art:'live-events',title:'Farm events',text:'Every six hours: reach the goals together for coins and diamonds.',locked:lockedAt(level>=EVENTS_LEVEL,EVENTS_LEVEL)}
  ]},
  {title:'Good to know',cards:[
   {art:'farm',title:'Look around',text:'Drag to move, pinch or scroll to zoom.'},
   {art:'diamonds',title:'Diamonds',text:'Finish crops or batches right away, or buy boosts. The shop shows every price.'},
   {art:'gift',title:'A new day',text:'Gifts, challenges, orders and prices refresh at 00:00 UTC.'}
  ]}
 ];
}

export function renderFarmGuide(state){
 const loop=LOOP.map(([picture,label],i)=>`${i?'<i class="guide-arrow" aria-hidden="true">›</i>':''}<li>${art(picture)}<span>${label}</span></li>`).join('');
 const card=c=>`<li class="guide-card ${c.locked?'is-locked':''}"><span class="guide-art">${art(c.art)}</span><div><strong>${c.title}${c.locked?`<em>Level ${c.locked}</em>`:''}</strong><p>${c.text}</p></div></li>`;
 document.getElementById('help-content').innerHTML=`<ol class="guide-loop" aria-label="The game in four steps">${loop}</ol><p class="guide-loop-note">That’s the whole game. Everything else helps it grow.</p>`
  +guideSections(state).map(s=>`<section class="guide-section"><h3>${s.title}</h3><ul class="guide-grid">${s.cards.map(card).join('')}</ul></section>`).join('')
  +'<p class="guide-note">Your farm is saved to your account. You need an internet connection to play.</p>';
 refreshArt();
}
