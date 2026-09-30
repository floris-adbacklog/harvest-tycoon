import {levelOf} from './farm-state.js';
import {art,refreshArt} from './visual-icons.js';
import {wikiArticle,wikiNext,wikiSearch,wikiHero,wikiJump,wikiGroups,wikiSearchBox,wikiQuick} from './wiki-content.js';

// How to play as a wiki: a search box with quick searches and the topics in three groups, then one page per topic with a
// coloured header, a jump bar that stays in view, and a way back. The same content as the
// website's /wiki (public/wiki-content.js); in the game, what is above your level says "From level X".
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
let farm=null,bound=false;

function root(){return document.getElementById('help-content');}
// Install the app (Getting started): the install prompt belongs to the top-level page (src/pwa.js, window.harvestPwa), like the
// Farm app block in Settings. The button shows only where one tap installs it.
const pwa=()=>{try{return window.parent?.harvestPwa??null;}catch{return null;}};
function showInstall(el){const row=el?.querySelector('[data-wiki-install-row]');if(row)row.hidden=pwa()?.state?.().kind!=='prompt';}
function ctx(){return {level:farm?levelOf(farm):null,href:id=>`#wiki-${id}`};}
function scrollTop(){const dialog=root()?.closest('dialog');if(dialog)dialog.scrollTop=0;}
// On a phone the pop-up's title bar stays at the top; the jump bar sits just below it.
// On a computer the title bar scrolls away: the jump bar then sticks to the window's very top edge, over its padding, so nothing
// shows through above it.
function stickyOffset(){const el=root(),dialog=el?.closest('dialog'),head=dialog?.querySelector('.dialog-heading');const style=head&&getComputedStyle(head),top=style?.position==='sticky'?Math.max(0,head.offsetHeight+(parseFloat(style.top)||0)):-(parseFloat(dialog?getComputedStyle(dialog).paddingTop:0)||0);el?.querySelector('.wiki')?.style.setProperty('--wiki-sticky',`${top}px`);}

function home(){
 const el=root();if(!el)return;
 el.innerHTML=`<div class="wiki" data-wiki-view="home">${wikiSearchBox()}${wikiQuick(ctx())}<div id="wiki-results" class="wiki-results" hidden></div>${wikiGroups(ctx(),{featured:!farm||levelOf(farm)<15})}<p class="wiki-note">Your farm is saved to your account. You need an internet connection to play.</p></div>`;
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
 refreshArt();stickyOffset();showInstall(el);fadeJump(el);
 const target=anchor&&reveal(anchor);
 if(target)target.scrollIntoView({block:'start'});else scrollTop();
}

// The jump bar fades at its right edge while there are more chips to scroll to (wiki.css).
function fadeJump(el){
 const bar=el?.querySelector('.wiki-jump'),wrap=bar?.parentElement;if(!bar)return;
 const check=()=>{wrap.classList.toggle('is-scrollable',bar.scrollWidth>bar.clientWidth+2);wrap.classList.toggle('at-end',bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-4);};
 check();bar.addEventListener('scroll',check,{passive:true});requestAnimationFrame(check);
}
// A building on its page is a closed row (wiki-content.js buildingBlock): going to it opens it.
function reveal(id){const target=root()?.querySelector(`#${CSS.escape(id)}`);const row=target?.closest('details');if(row)row.open=true;return target;}

function bind(){
 if(bound||!root())return;bound=true;
 pwa()?.subscribe?.(()=>showInstall(root()));
 root().addEventListener('click',event=>{
  const install=event.target.closest('[data-wiki-install]');if(install){install.disabled=true;Promise.resolve(pwa()?.install?.()).catch(()=>{}).finally(()=>{install.disabled=false;showInstall(root());});return;}
  const back=event.target.closest('[data-wiki-home]');if(back){event.preventDefault();home();scrollTop();return;}
  const quick=event.target.closest('[data-wiki-query]');if(quick){const input=root().querySelector('#wiki-search');input.value=quick.dataset.wikiQuery;input.dispatchEvent(new Event('input'));input.focus();return;}
  const jump=event.target.closest('[data-wiki-jump]');if(jump){event.preventDefault();reveal(jump.dataset.wikiJump)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  const link=event.target.closest('[data-wiki-topic]');if(link){event.preventDefault();topic(link.dataset.wikiTopic,link.dataset.wikiAnchor);return;}
 });
}

export function renderWiki(state,id=null,anchor=''){farm=state;bind();if(id)topic(id,anchor);else home();}
