// The game's languages (29 Sep 2026). A language is shown in Settings as coming soon until all its texts are translated
// (ready). code: the flag picture (assets/icons/flag-<code>.webp, painted, WebP). name: the language in its own words.
// English first, then the others by their own name.
export const LANGUAGES=Object.freeze([
 {code:'en',name:'English',ready:true},
 {code:'cs',name:'Čeština'},
 {code:'de',name:'Deutsch',ready:true},
 {code:'es',name:'Español',ready:true},
 {code:'fr',name:'Français',ready:true},
 {code:'id',name:'Bahasa Indonesia',ready:true},
 {code:'hu',name:'Magyar'},
 {code:'nl',name:'Nederlands',ready:true},
 {code:'pt',name:'Português',ready:true},
 {code:'tr',name:'Türkçe',ready:true},
 {code:'ru',name:'Русский',ready:true},
 {code:'uk',name:'Українська'},
 {code:'hi',name:'हिन्दी',ready:true},
 {code:'ja',name:'日本語',ready:true}
].map(Object.freeze));
