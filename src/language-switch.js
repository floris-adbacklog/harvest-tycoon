import {LANGUAGES,languagePath} from '../public/languages.js';
import {chosenLanguage,chooseLanguage} from '../public/i18n.js';
// Under the sign-up form: a small flag button that opens a little menu with the languages the game is translated into,
// each with its flag. Picking one saves it on this device (the same choice as Settings > Language) and opens the page
// again in that language: its own page (/es/, English on '/'; Oct 2026), so a language page never opens itself again.
// From seven languages on the menu has two columns, so it stays small.
const flag=code=>`<img src="/assets/icons/flag-${code}.webp" alt="" width="20" height="20">`;
const chevron='<svg class="language-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
const check='<svg class="language-check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

export function renderLanguageSwitch(host=document.getElementById('language-switch')){
 if(!host)return;
 const ready=LANGUAGES.filter(l=>l.ready);
 if(ready.length<2){host.hidden=true;return;}
 const current=chosenLanguage(),name=(ready.find(l=>l.code===current)??ready[0]).name;
 host.innerHTML=`<button type="button" class="language-button" aria-haspopup="listbox" aria-expanded="false">${flag(current)}<span lang="${current}">${name}</span>${chevron}</button>`
  +`<ul class="language-menu${ready.length>6?' is-wide':''}" role="listbox" aria-label="Language" hidden>${ready.map(({code,name})=>`<li role="option" tabindex="-1" data-code="${code}" lang="${code}" aria-selected="${code===current}">${flag(code)}<span>${name}</span>${code===current?check:''}</li>`).join('')}</ul>`;
 host.hidden=false;
 const button=host.querySelector('.language-button'),menu=host.querySelector('.language-menu'),options=()=>[...menu.querySelectorAll('[role=option]')];
 const open=()=>{menu.hidden=false;button.setAttribute('aria-expanded','true');(options().find(o=>o.getAttribute('aria-selected')==='true')??options()[0]).focus();};
 const close=(focus=true)=>{if(menu.hidden)return;menu.hidden=true;button.setAttribute('aria-expanded','false');if(focus)button.focus();};
 const pick=code=>{close();if(code&&code!==current){chooseLanguage(code);location.assign(languagePath(code)+location.search+location.hash);}};
 button.addEventListener('click',()=>menu.hidden?open():close());
 menu.addEventListener('click',event=>pick(event.target.closest?.('[role=option]')?.dataset.code));
 menu.addEventListener('keydown',event=>{
  const list=options(),at=list.indexOf(document.activeElement);
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();list[(at+(event.key==='ArrowDown'?1:list.length-1))%list.length].focus();}
  else if(event.key==='Home'||event.key==='End'){event.preventDefault();list[event.key==='Home'?0:list.length-1].focus();}
  else if(event.key==='Enter'||event.key===' '){event.preventDefault();pick(document.activeElement?.dataset?.code);}
  else if(event.key==='Escape'){event.preventDefault();close();}
  else if(event.key==='Tab')close(false);
 });
 document.addEventListener('pointerdown',event=>{if(!host.contains(event.target))close(false);});
}
