import {levelOf} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {WIKI_TOPICS,wikiArticle,wikiTile,wikiNext,wikiSearch} from './wiki-content.js';

// How to play as a wiki: a search box and a tile per topic, then one page per topic with a way back. The same content as the
// website's /wiki (public/wiki-content.js); in the game, what is above your level says "From level X".
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let farm=null,bound=false;

function root(){return document.getElementById('help-content');}
function ctx(){return {level:farm?levelOf(farm):null,href:id=>`#wiki-${id}`};}
function scrollTop(){const dialog=root()?.closest('dialog');if(dialog)dialog.scrollTop=0;root()?.scrollIntoView?.({block:'start'});}

function home(){
 const el=root();if(!el)return;
 el.innerHTML=`<div class="wiki" data-wiki-view="home"><label class="wiki-search">${art('guide')}<input type="search" id="wiki-search" placeholder="Search the wiki: corn, cheese, tractor…" aria-label="Search the wiki" autocomplete="off"></label><div id="wiki-results" class="wiki-results" hidden></div><div class="wiki-tiles">${WIKI_TOPICS.map(t=>wikiTile(t,ctx())).join('')}</div><p class="wiki-note">Your farm is saved to your account. You need an internet connection to play.</p></div>`;
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
 el.innerHTML=`<div class="wiki" data-wiki-view="${id}"><button type="button" class="small-button wiki-back" data-wiki-home>‹ All topics</button><header class="wiki-head">${art(article.art)}<div><h3>${article.title}</h3><p>${article.blurb}</p></div></header><article class="wiki-article">${article.html}</article><section class="wiki-related"><h3>Read next</h3><div class="wiki-next-list">${article.related.map(t=>wikiNext(t,ctx())).join('')}</div></section></div>`;
 refreshArt();
 const target=anchor&&el.querySelector(`#${CSS.escape(anchor)}`);
 if(target)target.scrollIntoView({block:'start'});else scrollTop();
}

function bind(){
 if(bound||!root())return;bound=true;
 root().addEventListener('click',event=>{
  const back=event.target.closest('[data-wiki-home]');if(back){event.preventDefault();home();scrollTop();return;}
  const link=event.target.closest('[data-wiki-topic]');if(link){event.preventDefault();topic(link.dataset.wikiTopic,link.dataset.wikiAnchor);return;}
  // Links inside a page (the building list on Buildings and goods) scroll within the pop-up.
  const inPage=event.target.closest('a[href^="#building-"]');if(inPage){event.preventDefault();root().querySelector(inPage.getAttribute('href'))?.scrollIntoView({block:'start',behavior:'smooth'});}
 });
}

export function renderWiki(state,id=null){farm=state;bind();if(id)topic(id);else home();}
