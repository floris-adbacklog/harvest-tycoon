// The game's languages (29 Sep 2026). English is the only one so far; the others are shown in Settings as coming soon until
// their texts are translated. code: the flag picture (assets/icons/flag-<code>.webp, painted, WebP). name: the language in its own words.
// English first, then the others by their own name.
export const LANGUAGES=Object.freeze([
 {code:'en',name:'English',ready:true},
 {code:'de',name:'Deutsch'},
 {code:'es',name:'Español',ready:true},
 {code:'fr',name:'Français'},
 {code:'nl',name:'Nederlands'},
 {code:'pt',name:'Português'},
 {code:'ru',name:'Русский'},
 {code:'ar',name:'العربية'},
 {code:'hi',name:'हिन्दी'},
 {code:'zh',name:'中文'}
].map(Object.freeze));
