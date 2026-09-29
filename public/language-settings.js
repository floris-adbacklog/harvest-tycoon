import {LANGUAGES} from './languages.js';
import {chosenLanguage,chooseLanguage} from './i18n.js';
// Settings > Language: a dropdown (pretty-select.js) with every language and its flag. The languages that are not translated yet
// are greyed out as coming soon. Picking one saves it on this device and opens the game again in that language.
export function renderLanguageSettings(select=document.getElementById('language-select')){
 if(!select)return;
 const current=chosenLanguage();
 select.innerHTML=LANGUAGES.map(({code,name,ready})=>`<option value="${code}" lang="${code}" data-art="flag-${code}"${code===current?' selected':''}${ready?'':' disabled data-note="Coming soon"'}>${name}</option>`).join('');
 select.addEventListener('change',()=>{chooseLanguage(select.value);(window.top??window).location.reload();});
}
