// The game's languages (29 Sep 2026). English is the only one so far; the others are shown in Settings as coming soon until
// their texts are translated. code: the flag picture (assets/icons/flag-<code>.webp, painted, WebP). name: the language in its own words.
// English first, then the others by their own name.
export const LANGUAGES=Object.freeze([
 {code:'en',name:'English',ready:true},
 {code:'de',name:'Deutsch',ready:true},
 {code:'es',name:'Español',ready:true},
 {code:'fr',name:'Français'},
 {code:'id',name:'Bahasa Indonesia'},
 {code:'nl',name:'Nederlands'},
 {code:'pt',name:'Português'},
 {code:'tr',name:'Türkçe'},
 {code:'ru',name:'Русский'},
 {code:'ar',name:'العربية'},
 {code:'hi',name:'हिन्दी',ready:true},
 {code:'zh',name:'中文'},
 {code:'ja',name:'日本語'}
].map(Object.freeze));
