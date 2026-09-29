import {LANGUAGES} from './languages.js';
import {chosenLanguage,chooseLanguage} from './i18n.js';
// Settings > Language: a dropdown (pretty-select.js) with every language and its flag. The languages that are not translated yet
// are greyed out as coming soon, below the ones you can choose. Picking one saves it on this device and opens the game again in that language.
export function renderLanguageSettings(select=document.getElementById('language-select')){
 if(!select)return;
 const current=chosenLanguage();
 // The languages you can play in first (in their own order), then the ones still coming.
 const order=[...LANGUAGES.filter(l=>l.ready),...LANGUAGES.filter(l=>!l.ready)];
 select.innerHTML=order.map(({code,name,ready})=>`<option value="${code}" lang="${code}" data-art="flag-${code}"${code===current?' selected':''}${ready?'':' disabled data-note="Coming soon"'}>${name}</option>`).join('');
 // The heading shows the flag of the language in use (before or after visual-icons.js turned it into a picture).
 const flag=document.querySelector('#language-settings-title img.game-art, #language-settings-title [data-game-art]');
 if(flag?.tagName==='IMG')flag.src=`/assets/icons/flag-${current}.webp`;else flag?.setAttribute('data-game-art',`flag-${current}`);
 select.addEventListener('change',()=>{chooseLanguage(select.value);(window.top??window).location.reload();});
}
