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
 {code:'ar',name:'العربية',ready:true,rtl:true},
 {code:'zh',name:'简体中文',ready:true}
].map(Object.freeze));
// Languages read from right to left (1 Oct 2026, Arabic): the page then runs right to left (dir="rtl"), set by public/i18n-boot.js
// before anything is drawn and again by public/i18n.js.
export const RTL_LANGUAGES=Object.freeze(LANGUAGES.filter(l=>l.rtl).map(l=>l.code));
// A page per language (Oct 2026): /es/, /fr/, ... is the sign-in page already written in that language (scripts/build-languages.mjs),
// so search engines find it and a visitor sees it at once. English is the home page itself ('/'). pageLanguage: the language of
// such an address (also /es/index.html, the same file), null for any other page.
export const languagePath=code=>code==='en'?'/':`/${code}/`;
// The Google Play badge in the website's footers (Oct 2026): Google's own badge in the page's language (public/assets/badges/, Google's
// play.google.com badge files with only their see-through edge trimmed; the clear space Google asks for is the footer's CSS). Arabic
// shows the English one: Google's Arabic file still has the old Play logo, and its badge guidelines say not to use outdated artwork.
export const PLAY_BADGES=Object.freeze(LANGUAGES.map(l=>l.code).filter(code=>code!=='ar'));
export const playBadge=code=>`/assets/badges/google-play-${PLAY_BADGES.includes(code)?code:'en'}.webp`;
export const pageLanguage=path=>{const m=/^\/([a-z]{2})(?:\/(?:index\.html)?)?$/.exec(path??'');return m&&m[1]!=='en'&&LANGUAGES.some(l=>l.ready&&l.code===m[1])?m[1]:null;};
