// The game's languages (29 Sep 2026). English is the only one so far; the others are shown in Settings as coming soon until
// their texts are translated. code: the flag picture (assets/icons/flag-<code>.webp, painted, WebP). name: the language in its own words.
// English first, then the others by their own name.
export const LANGUAGES=Object.freeze([
 {code:'en',name:'English',ready:true},
 {code:'de',name:'Deutsch',ready:true},
 {code:'es',name:'Español',ready:true},
 {code:'fr',name:'Français',ready:true},
 {code:'id',name:'Bahasa Indonesia',ready:true},
 {code:'nl',name:'Nederlands',ready:true},
 {code:'pt',name:'Português',ready:true},
 {code:'tr',name:'Türkçe'},
 {code:'ru',name:'Русский',ready:true},
 {code:'ar',name:'العربية'},
 {code:'hi',name:'हिन्दी',ready:true},
 {code:'ja',name:'日本語'}
].map(Object.freeze));
