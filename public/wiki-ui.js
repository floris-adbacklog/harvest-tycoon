import {levelOf} from './farm-state.js';
import {farmNow} from './farm-client.js';
import {art,refreshArt} from './visual-icons.js';
import {wikiArticle,wikiNext,wikiSearch,wikiHero,wikiJump,wikiGroups,wikiSearchBox,wikiQuick} from './wiki-content.js';
import {wikiLink,WIKI_COPY_ICON} from './wiki-link.js';
import {portal} from './portal.js';

// How to play as a wiki: a search box with quick searches and the topics in three groups, then one page per topic with a
// coloured header, a jump bar that stays in view, and a way back. The same content as the
// website's /wiki (public/wiki-content.js); in the game, what is above your level says "From level X".
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
// view: the topic on screen (null: the home page). trail (Oct 2026): the spots a link took the farmer from, for "‹ Back": {id, scroll, open}
// (the topic, how far down, which rows were open), or where How to play was opened from ({label, go}: the chat's wiki chip, "‹ Chat").
let farm=null,bound=false,view=null,trail=[];

function root(){return document.getElementById('help-content');}
// Install the app (Getting started): the install prompt belongs to the top-level page (src/pwa.js, window.harvestPwa), like the
// Farm app block in Settings. The button shows only where one tap installs it.
const pwa=()=>{try{return window.parent?.harvestPwa??null;}catch{return null;}};
function showInstall(el){const row=el?.querySelector('[data-wiki-install-row]');if(row)row.hidden=pwa()?.state?.().kind!=='prompt';}
// now: the farm's clock (the server's, as the Halloween Pass window and its countdowns), never the device's: what the wiki says about
// the pass (on sale already, until when, gone after the collecting week) follows the same moment as the window (Oct 2026).
function ctx(){return {level:farm?levelOf(farm):null,href:id=>`#wiki-${id}`,now:farmNow()};}
const dialogOf=()=>root()?.closest('dialog');
function scrollTop(){const dialog=dialogOf();if(dialog)dialog.scrollTop=0;}
// On a phone the pop-up's title bar stays at the top; the jump bar sits just below it.
// On a computer the title bar scrolls away: the jump bar then sticks to the window's very top edge, over its padding, so nothing
// shows through above it.
function stickyOffset(){const el=root(),dialog=el?.closest('dialog'),head=dialog?.querySelector('.dialog-heading');const style=head&&getComputedStyle(head),top=style?.position==='sticky'?Math.max(0,head.offsetHeight+(parseFloat(style.top)||0)):-(parseFloat(dialog?getComputedStyle(dialog).paddingTop:0)||0);el?.querySelector('.wiki')?.style.setProperty('--wiki-sticky',`${top}px`);}

function home(){
 const el=root();if(!el)return;
 view=null;trail=trail.filter(step=>step.go);
 el.innerHTML=`<div class="wiki" data-wiki-view="home">${wikiSearchBox()}${wikiQuick(ctx())}<div id="wiki-results" class="wiki-results" hidden></div>${wikiGroups(ctx(),{featured:!farm||levelOf(farm)<15})}<p class="wiki-note">Your farm is saved to your account. You need an internet connection to play.</p></div>`;
 const input=el.querySelector('#wiki-search'),results=el.querySelector('#wiki-results');
 input.addEventListener('input',()=>{
  // In the game search finds only what the farmer's level shows (Oct 2026): nothing of the village below level 100.
  const q=input.value.trim(),hits=wikiSearch(q,{level:ctx().level});results.hidden=!q;
  results.innerHTML=hits.length?`<ul>${hits.map(h=>`<li><a href="#wiki-${h.topic}" data-wiki-topic="${h.topic}"${h.anchor?` data-wiki-anchor="${h.anchor}"`:''}>${art(h.art)}<strong>${esc(h.label)}</strong><span>${esc(h.topicTitle)}</span></a></li>`).join('')}</ul>`:`<p>Nothing found for “${esc(q)}”. Try a crop, a building or a word like “diamonds”.</p>`;
  refreshArt();
 });
 showBack(el);refreshArt();
}

function topic(id,anchor=''){
 const el=root(),article=wikiArticle(id,ctx());if(!el||!article)return home();
 view=id;
 el.innerHTML=`<div class="wiki" data-wiki-view="${id}"><button type="button" class="small-button wiki-back" data-wiki-home>‹ All topics</button>${wikiHero(article)}${wikiJump(article)}<article class="wiki-article">${article.html}</article><section class="wiki-related"><h3>Read next</h3><div class="wiki-next-list">${article.related.map(t=>wikiNext(t,ctx())).join('')}</div></section></div>`;
 refreshArt();stickyOffset();showInstall(el);fadeJump(el);addCopy(el,id);showBack(el);
 const target=anchor&&reveal(anchor);
 if(target)land(target);else scrollTop();
}

// The jump bar fades at its right edge while there are more chips to scroll to (wiki.css).
function fadeJump(el){
 const bar=el?.querySelector('.wiki-jump'),wrap=bar?.parentElement;if(!bar)return;
 const check=()=>{wrap.classList.toggle('is-scrollable',bar.scrollWidth>bar.clientWidth+2);wrap.classList.toggle('at-end',bar.scrollLeft+bar.clientWidth>=bar.scrollWidth-4);};
 check();bar.addEventListener('scroll',check,{passive:true});requestAnimationFrame(check);
}
// A building on its page is a closed row (wiki-content.js buildingBlock): going to it opens it.
function reveal(id){const target=root()?.querySelector(`#${CSS.escape(id)}`);const row=target?.closest('details');if(row)row.open=true;return target;}
// Landing on a spot (Oct 2026): a crop's or a level's row is in a table that a phone hides for cards (wiki.css), so there its card is the
// spot. A row comes to the middle, a section to the top under the jump bar; then it lights up for a moment so the eye finds it.
function land(target,smooth=false){
 const card=!target.getClientRects().length&&root()?.querySelector(`[data-wiki-row="${CSS.escape(target.id)}"]`),spot=card||target,row=/^(TR|LI)$/.test(spot.tagName);
 spot.scrollIntoView({block:row?'center':'start',behavior:smooth&&!matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'auto'});
 const mark=spot.matches('details')?spot.querySelector('summary'):spot.matches('section')?spot.querySelector('h3'):spot;
 mark?.classList.remove('wiki-flash');void mark?.offsetWidth;mark?.classList.add('wiki-flash');setTimeout(()=>mark?.classList.remove('wiki-flash'),1900);
}
// Where the farmer is now, to come back to.
function spot(){return {id:view,scroll:dialogOf()?.scrollTop??0,open:[...(root()?.querySelectorAll('details[open][id]')??[])].map(row=>row.id)};}
// A link in the text, a name in a table, a tile or a search hit. From a topic it leaves a step to come back to; on the same topic it
// only scrolls, so the rows that are open stay open.
function go(id,anchor=''){
 if(view){trail.push(spot());if(trail.length>30)trail.splice(trail.findIndex(step=>!step.go),1);}
 if(id!==view)return topic(id,anchor);
 const target=anchor&&reveal(anchor);if(target)land(target,true);else scrollTop();
 showBack(root());
}
function back(){
 const step=trail.pop();if(!step)return;
 if(step.go){step.go();return;}
 if(step.id!==view)topic(step.id);else showBack(root());
 for(const id of step.open)root()?.querySelector(`#${CSS.escape(id)}`)?.setAttribute('open','');
 const dialog=dialogOf();if(dialog)dialog.scrollTop=step.scroll;
}
// "‹ Back" (Oct 2026): one step back to where the farmer was ("‹ Chat" when that is where How to play came from). In the jump bar, which
// stays in view, so it is at hand after a link took you far down; on the home page (or a page without a jump bar) at the top.
// "Back" and "Chat" are texts the game has already, so the arrow is apart from the word.
function showBack(el){
 el?.querySelector('[data-wiki-back]')?.remove();el?.querySelector('.wiki-jump-wrap')?.classList.remove('has-back');
 const step=trail.at(-1);if(!el||!step)return;
 const button=`<button type="button" class="small-button wiki-step-back" data-wiki-back><span aria-hidden="true">‹</span> <span>${esc(step.go?step.label:'Back')}</span></button>`;
 const wrap=el.querySelector('.wiki-jump-wrap');
 if(wrap){wrap.insertAdjacentHTML('afterbegin',button);wrap.classList.add('has-back');}else el.querySelector('.wiki')?.insertAdjacentHTML('afterbegin',button);
}
// Copy link (Oct 2026): beside every heading, that spot's link (wiki-link.js), to paste in the chat or anywhere. The button says
// "Copied." itself; nothing else opens. Never on CrazyGames, which allows no links to our site.
function addCopy(el,id){
 if(portal())return;
 for(const head of el.querySelectorAll('.wiki-article .wiki-section[id]>h3,.wiki-article .wiki-section[id]>summary>h3'))
  head.insertAdjacentHTML('beforeend',`<button type="button" class="wiki-copy" data-wiki-copy="${wikiLink(id,head.closest('.wiki-section').id)}" title="Copy link" aria-label="Copy link">${WIKI_COPY_ICON}<span class="wiki-copied" aria-live="polite"></span></button>`);
}
// Through the page around the game first (same site), as Invite a friend does; then this page; then the old way, a selected text.
async function writeClipboard(text){
 for(const win of [window.parent,window]){try{if(win?.navigator?.clipboard?.writeText){await win.navigator.clipboard.writeText(text);return true;}}catch{}}
 const field=document.createElement('textarea');field.value=text;field.setAttribute('readonly','');field.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0';
 document.body.append(field);let done=false;try{field.select();done=document.execCommand('copy');}catch{}field.remove();return done;
}
async function copy(button){
 const say=button.querySelector('.wiki-copied'),url=button.dataset.wikiCopy;clearTimeout(button.wikiTimer);
 const done=await writeClipboard(url);
 // Where no clipboard is allowed, the link itself shows, selected, to copy by hand.
 if(!done){button.insertAdjacentHTML('afterend',`<input class="wiki-copy-field" readonly value="${esc(url)}" aria-label="Copy link">`);const field=button.nextElementSibling;field.select();field.addEventListener('blur',()=>field.remove(),{once:true});return;}
 say.textContent='Copied.';button.classList.add('is-copied');
 button.wikiTimer=setTimeout(()=>{say.textContent='';button.classList.remove('is-copied');},1800);
}

function bind(){
 if(bound||!root())return;bound=true;
 pwa()?.subscribe?.(()=>showInstall(root()));
 root().addEventListener('click',event=>{
  // Before anything else: the button sits in a building's closed row, which a click would open or close.
  const copying=event.target.closest('[data-wiki-copy]');if(copying){event.preventDefault();event.stopPropagation();void copy(copying);return;}
  // The link shown to copy by hand sits in the heading too: a tap there selects it and leaves the row as it is (Oct 2026 review).
  if(event.target.closest('.wiki-copy-field')){event.preventDefault();return;}
  const install=event.target.closest('[data-wiki-install]');if(install){install.disabled=true;Promise.resolve(pwa()?.install?.()).catch(()=>{}).finally(()=>{install.disabled=false;showInstall(root());});return;}
  if(event.target.closest('[data-wiki-back]')){event.preventDefault();back();return;}
  const homeButton=event.target.closest('[data-wiki-home]');if(homeButton){event.preventDefault();home();scrollTop();return;}
  const quick=event.target.closest('[data-wiki-query]');if(quick){const input=root().querySelector('#wiki-search');input.value=quick.dataset.wikiQuery;input.dispatchEvent(new Event('input'));input.focus();return;}
  const jump=event.target.closest('[data-wiki-jump]');if(jump){event.preventDefault();reveal(jump.dataset.wikiJump)?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
  const link=event.target.closest('[data-wiki-topic]');if(link){event.preventDefault();go(link.dataset.wikiTopic,link.dataset.wikiAnchor);return;}
  // An admin's name (Oct 2026, wiki-content.js ADMINS): their profile, over How to play.
  const profile=event.target.closest('[data-player-profile]');if(profile){event.preventDefault();window.harvestProfiles?.open?.(profile.dataset.playerProfile,{back:null});return;}
 });
}

// The way in: How to play's button (the home page), a pop-up's button or (Oct 2026) a wiki link in the chat (a topic and a spot on it:
// wiki-link.js parseWikiLink gives both). The spot opens (a building's row too), comes into view and lights up for a moment; a spot this
// farmer's page does not have (a season that is over, the app, CrazyGames) opens the topic at the top. from: {label, go()} where it was
// opened from, for a step back there ("‹ Chat"); every new opening starts a new trail.
export function renderWiki(state,id=null,anchor='',{from=null}={}){farm=state;bind();trail=from?.go?[{label:String(from.label??'Back'),go:from.go}]:[];if(id)topic(id,anchor);else home();}
