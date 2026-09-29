import {LANGUAGES} from './languages.js';
// Settings > Language: a dropdown (pretty-select.js) with every language and its flag. The language in use is chosen; the others
// are greyed out as coming soon until their texts are translated.
export function renderLanguageSettings(select=document.getElementById('language-select')){
 if(!select)return;
 select.innerHTML=LANGUAGES.map(({code,name,ready})=>`<option value="${code}" lang="${code}" data-art="flag-${code}"${ready?' selected':' disabled data-note="Coming soon"'}>${name}</option>`).join('');
}
