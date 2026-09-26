import {levelOf} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {wikiArticle,wikiNext,wikiSearch,wikiHero,wikiJump,wikiGroups} from './wiki-content.js';

// How to play as a wiki: a search box with quick searches and the topics in three groups, then one page per topic with a
// coloured header, a jump bar that stays in view, and a way back. The same content as the
// website's /wiki (public/wiki-content.js); in the game, what is above your level says "From level X".
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let farm=null,bound=false;
// Quick searches under the search box. App comes first and goes straight to how to install it: many players do not know there is one.
const QUICK=[{label:'App',topic:'getting-started',anchor:'sec-play-it-as-an-app'},'Corn','Apples','Cheese','Tractor','VIP','Farm family'];
const quickChip=q=>typeof q==='string'?`<button type="button" data-wiki-query="${q}">${q}</button>`:`<button type="button" data-wiki-topic="${q.topic}" data-wiki-anchor="${q.anchor}">${q.label}</button>`;

function root(){return document.getElementById('help-content');}
function ctx(){return {level:farm?levelOf(farm):null,href:id=>`#wiki-${id}`};}
function scrollTop(){const dialog=root()?.closest('dialog');if(dialog)dialog.scrollTop=0;}
// On a phone the pop-up's title bar stays at the top; the jump bar sits just below it.
function stickyOffset(){const el=root(),head=el?.closest('dialog')?.querySelector('.dialog-heading');const style=head&&getComputedStyle(head),top=style?.position==='sticky'?Math.max(0,head.offsetHeight+(parseFloat(style.top)||0)):0;el?.querySelector('.wiki')?.style.setProperty('--wiki-sticky',`${top}px`);}

function home(){
 const el=root();if(!el)return;
 el.innerHTML=`<div class="wiki" data-wiki-view="home"><label class="wiki-search">${art('guide')}<input type="search" id="wiki-search" placeholder="Search the wiki: corn, cheese, tractor…" aria-label="Search the wiki" autocomplete="off"></label><div class="wiki-quick" aria-label="Quick searches">${QUICK.map(quickChip).join('')}</div><div id="wiki-results" class="wiki-results" hidden></div>${wikiGroups(ctx(),{featured:!farm||levelOf(farm)<15})}<p class="wiki-note">Your farm is saved to your account. You need an internet connection to play.</p></div>`;
 const input=el.querySelector('#wiki-search'),results=el.querySelector('#wiki-results');
 input.addEventListener('input',()=>{
  const q=input.value.trim(),hits=wikiSearch(q);results.hidden=!q;
  results.innerHTML=hits.length?`<ul>${hits.map(h=>`<li><a href="#wiki-${h.topic}" data-wiki-topic="${h.topic}"${h.anchor?` data-wiki-anchor="${h.anchor}"`:''}>${art(h.art)}<strong>${esc(h.label)}</strong><span>${esc(h.topicTitle)}</span></a></li>`).join('')}</ul>`:`<p>Nothing found for “${esc(q)}”. Try a crop, a building or a word like “diamonds”.</p>`;
  refreshArt();
 });
 refreshArt();
}

function topic(id,anchor=''){
 const el=root(),article=wikiArticle(id,ctx());if(!el||!article)return home();
 el.innerHTML=`<div class="wiki" data-wiki-view="${id}"><button type="button" class="small-button wiki-back" data-wiki-home>‹ All topics</button>${wikiHero(article)}${wikiJump(article)}<article class="wiki-article">${article.html}</article><section class="wiki-related"><h3>Read next</h3><div class="wiki-next-list">${article.related.map(t=>wikiNext(t,ctx())).join('')}</div></section></div>`;
 refreshArt();stickyOffset();
 const target=anchor&&el.querySelector(`#${CSS.escape(anchor)}`);
 if(target)target.scrollIntoView({block:'start'});else scrollTop();
}

function bind(){
 if(bound||!root())return;bound=true;
 root().addEventListener('click',event=>{
  const back=event.target.closest('[data-wiki-home]');if(back){event.preventDefault();home();scrollTop();return;}
  const quick=event.target.closest('[data-wiki-query]');if(quick){const input=root().querySelector('#wiki-search');input.value=quick.dataset.wikiQuery;input.dispatchEvent(new Event('input'));input.focus();return;}
  const jump=event.target.closest('[data-wiki-jump]');if(jump){event.preventDefault();root().querySelector(`#${CSS.escape(jump.dataset.wikiJump)}`)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  const link=event.target.closest('[data-wiki-topic]');if(link){event.preventDefault();topic(link.dataset.wikiTopic,link.dataset.wikiAnchor);return;}
 });
}

export function renderWiki(state,id=null,anchor=''){farm=state;bind();if(id)topic(id,anchor);else home();}
