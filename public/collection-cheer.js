import {art,refreshArt} from './visual-icons.js';
// A whole collection, done (17 Oct 2026, the owner's picks 3a and 4a): the Seed Lab's 20 heirlooms, the pond's fish book and the lake's.
// Until now a line in a toast or a tag on the catch said it, and players found that a let-down. Now one card in the middle, over the
// window it happened in, in the level-up card's look: the collection's pictures, what it paid and what it gives from now on. It opens
// with showModal, so it is the top window (public/windows.js): Escape, Back, × and its button close it, and nothing waits on it.
// pictures: art keys, in the collection's own order. rewards: {diamonds}. perk: what the farm has from now on, one sentence.
export function showCollectionCheer({doc=globalThis.document,title,pictures=[],line='',rewards={},perk='',perkArt=''}){
 if(!doc?.body)return null;
 doc.getElementById('collection-cheer')?.remove();
 const dialog=doc.createElement('dialog');dialog.id='collection-cheer';dialog.className='is-card is-s is-cheer';dialog.setAttribute('aria-labelledby','collection-cheer-title');
 // Full rows: 16 fish in rows of 4, 20 heirlooms or lake fish in rows of 5.
 const columns=pictures.length%5===0?5:pictures.length%4===0?4:5;
 const chips=[rewards.diamonds?`<strong class="reward-diamonds reward-big">${art('diamonds')}+${rewards.diamonds} diamonds</strong>`:''].join('');
 dialog.innerHTML=`<button type="button" class="level-up-close" data-cheer-close aria-label="Close">×</button>`
  +`<h2 id="collection-cheer-title">${title}</h2>`
  +`<div class="collection-cheer-grid" style="--cheer-columns:${columns}" aria-hidden="true">${pictures.map(key=>`<span>${art(key)}</span>`).join('')}</div>`
  +(line?`<p>${line}</p>`:'')+(chips?`<div class="gift-rewards">${chips}</div>`:'')
  +(perk?`<p class="collection-cheer-perk">${perkArt?art(perkArt):''}<span>${perk}</span></p>`:'')
  +`<button type="button" class="primary-button gift-done" data-cheer-done autofocus>Wonderful!</button>`;
 doc.body.append(dialog);
 dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelectorAll('[data-cheer-close],[data-cheer-done]').forEach(button=>button.onclick=()=>dialog.close());
 refreshArt();dialog.showModal();
 return dialog;
}
