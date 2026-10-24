import {NEIGHBOURS,NEIGHBOUR_HEARTS,ITEMS,neighbourOpen,neighbourLevel,neighbourStatus,featureUnlocked,featureUnlockHint} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
// The neighbours (24 Oct 2026, the owner: "Doe 1&2", "zorg dat je met 2 ook storytelling meeneemt", then "Deze opzet is goed"): four
// people of the valley, each with a story in five letters, one for every heart (farm-state.js giveNeighbour has the rules). Their window
// (More › Neighbours): a row a neighbour with their face, their hearts, today's gift (one of their two favourites, once a UTC day) and
// the letters so far; a new heart opens its letter right there. Rosie, Mei and Otto move in at level 8, Hank when sunflowers grow (17).
const $=id=>document.getElementById(id);
const number=n=>Number(n).toLocaleString('en-US');
export const NEIGHBOUR_ORDER=Object.freeze(['rosie','mei','otto','hank']);
export const LETTERS=Object.freeze({
 rosie:[
  ['A cold oven','Hello, neighbour! I’m Rosie, I bake for the whole valley. Your wheat smells like summer. The old stone oven at the square has been cold for years. With grain like yours, maybe I could light it again.'],
  ['Smoke like a dragon','I tried the old oven today! It smoked like a dragon and I burnt three loaves. My grandmother baked there every morning. I found her recipe book in the attic, and the pages still smell of cinnamon.'],
  ['The Harvest Crown','Grandma’s book has a recipe called the Harvest Crown: a bread shaped like a wreath, baked once a year for the harvest feast. Nobody has made it in thirty years. I want to try, for the valley.'],
  ['Little bread rabbits','The oven is warm and steady now, thanks to you. Children came to watch this morning, and I let them shape little bread rabbits. The square felt alive again.'],
  ['A crown for the valley','The Harvest Crown came out golden and perfect! The whole valley shared it at the square, and I told everyone whose grain made it. Please take my old bread cart for your farm. It belongs with friends.']
 ],
 mei:[
  ['A flower for the show','Hi! I’m Mei. I grow flowers in the greenhouse behind the mill. My dream is the Flower Show in the city, but every year I lose to the same tall roses. This year I want something new.'],
  ['Sunrise colours','I mixed soil from your lettuce beds into my seed trays and the seedlings went wild! One tiny bud is a colour I have never seen, somewhere between peach and sunrise.'],
  ['A name','The bud opened! It is a brand-new flower, and a flower needs a name before the show. I would like to name it after your farm, if that is alright with you.'],
  ['For luck','I am so nervous. The show is next week, and my flower droops when the train shakes. Grandpa says roots need friends, so I will take a pot of your soil with me, for luck.'],
  ['First prize!','First prize! The judges had never seen anything like it, and the city’s book now has a flower named after your farm. I brought you a flowerbed of its seedlings, so it grows where it started.']
 ],
 otto:[
  ['A broken bridge','Hey there, I’m Otto, the valley’s carpenter. The bridge over the creek to the old meadow fell down last spring, and nobody has been across since. I am going to rebuild it, one plank at a time.'],
  ['An old iron sign','Your corn makes a fine lunch for a carpenter! The first posts are in. While digging I found an old iron sign. Half the letters are gone, but it ends in FARM.'],
  ['Twice as big','Half the bridge is done. I asked Hank about the sign. He says that long ago the meadow across the creek belonged to the farm that is yours now. Your farm was once twice as big!'],
  ['The old name','One plank to go. I cleaned the sign and the letters came back: the old name of your farm, carved by the first farmer who lived there. I will hang it on the bridge.'],
  ['The bridge is open','The bridge is open! The whole valley walked across this morning, and the old sign hangs on top with your farm’s story. Here is a stack of firewood from the leftover beams, for cold evenings.']
 ],
 hank:[
  ['A lost queen','Name’s Hank. I keep bees on the hill. Forty years, and I never lost a queen, until last week. Queen Marigold flew off and half my hive went with her. If you see a cloud of bees, wave at them for me.'],
  ['Good taste','Those sunflowers of yours! My bees can smell them from the hill. I followed a few this morning and lost them past your fence. Marigold always had good taste.'],
  ['Found her','Found her! Marigold built a new home in the old oak at the edge of your land. She looks happy, and I don’t have the heart to move her. Would you mind a few bees as neighbours?'],
  ['One big garden','Your farm and my hill make one big garden now. The bees fly back and forth all day, and my honey tastes of your sunflowers. Best honey in forty years, and I mean it.'],
  ['Together again','Marigold’s daughter is the new queen of my hive on the hill, so the family is together again, in two homes. I made you a bench from the old hive stand. Sit on it at sunset and listen to them hum.']
 ]
});
export const neighbourPicture=key=>`<img class="neighbour-face" src="/assets/neighbours/${key}.webp" alt="" width="64" height="64" loading="lazy" draggable="false">`;
// Five hearts, the ones you have full.
const heartsRow=hearts=>`<span class="neighbour-hearts" role="img" aria-label="${hearts} of ${NEIGHBOUR_HEARTS.length} hearts">${NEIGHBOUR_HEARTS.map((_,i)=>`<span class="neighbour-heart${i<hearts?' is-full':''}">${art('friendship-heart')}</span>`).join('')}</span>`;
export function createNeighboursUI({state,runAction,notify,onChange,farmNow}){
 let busy=false,reading=null;   // reading: [key, letter index] open in the window
 const dialog=()=>$('neighbours-dialog');
 function row(key){
  const who=NEIGHBOURS[key];
  if(!neighbourOpen(state,key))return `<section class="neighbour is-locked">${neighbourPicture(key)}<div class="neighbour-copy"><strong>${who.name}</strong><small>Moves in at level ${neighbourLevel(key)}</small></div></section>`;
  const st=neighbourStatus(state,key,farmNow()),letters=LETTERS[key].slice(0,st.hearts);
  const gift=([item,count])=>{const have=Math.floor(state.inventory?.[item]??0)>=count;return `<button type="button" class="small-button neighbour-gift" data-neighbour="${key}" data-gift="${item}" ${busy||st.giftedToday||st.done||!have?'disabled':''}>${art(item)}<span>Give ${number(count)}</span></button>`;};
  const line=st.done?`You are the best of friends.`:st.giftedToday?`Thank you! Come back tomorrow.`:st.nextAt-st.gifts===1?'One more gift for the next heart.':`${st.nextAt-st.gifts} more gifts for the next heart.`;
  const open=reading?.[0]===key?reading[1]:null;
  return `<section class="neighbour">${neighbourPicture(key)}<div class="neighbour-copy"><strong>${who.name}</strong><small>${who.role}</small>${heartsRow(st.hearts)}<small class="neighbour-line">${line}</small></div>`
   +(st.done?'':`<div class="neighbour-gifts">${Object.entries(who.likes).filter(([item])=>ITEMS[item]).map(gift).join('')}</div>`)
   +(letters.length?`<div class="neighbour-letters">${letters.map(([title],i)=>`<button type="button" class="neighbour-letter-link${open===i?' is-open':''}" data-letter="${key}:${i}">${art('letter')}<span>${title}</span></button>`).join('')}</div>`:'')
   +(open!=null?`<article class="neighbour-letter"><h3>${LETTERS[key][open][0]}</h3><p>${LETTERS[key][open][1]}</p><p class="neighbour-sign" translate="no">${who.name}</p></article>`:'')
   +`</section>`;
 }
 function render(){
  const d=dialog();if(!d?.open)return;
  $('neighbours-content').innerHTML=`<p class="neighbours-lead">Bring a neighbour one of their favourites once a day. Every heart brings a letter and a gift.</p>`+NEIGHBOUR_ORDER.map(row).join('');
  d.querySelectorAll('[data-gift]').forEach(b=>b.onclick=()=>give(b.dataset.neighbour,b.dataset.gift));
  d.querySelectorAll('[data-letter]').forEach(b=>b.onclick=()=>{const [k,i]=b.dataset.letter.split(':');reading=reading?.[0]===k&&reading[1]===Number(i)?null:[k,Number(i)];render();});
  refreshArt();
 }
 async function give(key,item){
  if(busy)return;busy=true;render();
  try{
   const r=await runAction({type:'neighbour_gift',neighbour:key,item});onChange();
   const name=NEIGHBOURS[key].name;
   if(r.heart){reading=[key,r.heart-1];notify(r.decor?`${name} wrote you a letter! +${r.diamonds} diamonds and a gift in Your things.`:r.diamonds?`${name} wrote you a letter! +${number(r.coins)} coins and ${r.diamonds} diamonds.`:`${name} wrote you a letter! +${number(r.coins)} coins.`);}
   else notify(`${name} loves it! Come back tomorrow.`);
  }catch(e){notify(e.message);}finally{busy=false;render();}
 }
 function open(){
  if(!featureUnlocked(state,'neighbours')){notify(featureUnlockHint('neighbours'));return;}
  document.querySelectorAll('dialog[open]').forEach(d=>d.close());reading=null;dialog().showModal();render();
 }
 return {open,refresh:render};
}
