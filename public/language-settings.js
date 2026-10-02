import {LANGUAGES,languagePath,pageLanguage} from './languages.js';
import {chosenLanguage,chooseLanguage} from './i18n.js';
import {portal} from './portal.js';
// Settings > Language: a dropdown (pretty-select.js) with every language and its flag. The languages that are not translated yet
// are greyed out as coming soon, below the ones you can choose. Picking one saves it on this device and opens the game again in that language.
// On a language page (/es/, Oct 2026) that is the new language's own page, which would otherwise open in Spanish again.
export function renderLanguageSettings(select=document.getElementById('language-select')){
 if(!select)return;
 const current=chosenLanguage();
 // The languages you can play in first (in their own order), then the ones still coming.
 const order=[...LANGUAGES.filter(l=>l.ready),...LANGUAGES.filter(l=>!l.ready)];
 select.innerHTML=order.map(({code,name,ready})=>`<option value="${code}" lang="${code}" data-art="flag-${code}"${code===current?' selected':''}${ready?'':' disabled data-note="Coming soon"'}>${name}</option>`).join('');
 // The heading shows the flag of the language in use (before or after visual-icons.js turned it into a picture).
 const flag=document.querySelector('#language-settings-title img.game-art, #language-settings-title [data-game-art]');
 if(flag?.tagName==='IMG')flag.src=`/assets/icons/flag-${current}.webp`;else flag?.setAttribute('data-game-art',`flag-${current}`);
 select.addEventListener('change',()=>{
  // On CrazyGames (Oct 2026, public/portal.js) the game is a frame in their page: only our own page opens again, never theirs.
  const around=portal();if(around?.reload){chooseLanguage(select.value);around.reload();return;}
  chooseLanguage(select.value);const top=(window.top??window).location,path=languagePath(select.value);
  // The same address again is a reload: assigning it with a #… would only scroll (Oct 2026).
  if(pageLanguage(top.pathname)&&path!==top.pathname)top.assign(path+top.search+top.hash);else top.reload();
 });
}
