// The game's languages (29 Sep 2026). A language is shown in Settings as coming soon until all its texts are translated
// (ready). code: the flag picture (assets/icons/flag-<code>.webp, painted, WebP). name: the language in its own words.
// English first, then the others by their own name.
export const LANGUAGES=Object.freeze([
 {code:'en',name:'English',ready:true},
 {code:'cs',name:'Čeština',ready:true},
 {code:'de',name:'Deutsch',ready:true},
 {code:'es',name:'Español',ready:true},
 {code:'fr',name:'Français',ready:true},
 {code:'id',name:'Bahasa Indonesia',ready:true},
 {code:'hu',name:'Magyar',ready:true},
 {code:'nl',name:'Nederlands',ready:true},
 {code:'pt',name:'Português',ready:true},
 {code:'tr',name:'Türkçe',ready:true},
 {code:'ru',name:'Русский',ready:true},
 {code:'uk',name:'Українська',ready:true},
 {code:'hi',name:'हिन्दी',ready:true},
 {code:'ja',name:'日本語',ready:true},
 {code:'ar',name:'العربية',ready:false,rtl:true}
].map(Object.freeze));
// Languages read from right to left (1 Oct 2026, Arabic): the page then runs right to left (dir="rtl"), set by public/i18n-boot.js
// before anything is drawn and again by public/i18n.js.
export const RTL_LANGUAGES=Object.freeze(LANGUAGES.filter(l=>l.rtl).map(l=>l.code));
