// What the Stripe payment page knows of the farmer before it opens (10 Oct 2026): fewer things to type, so fewer farmers give up there.
// Plain functions without imports, so tests/checkout-fixes.test.mjs runs them as they are deployed.

// The account's own address, already filled in on Stripe's page (Stripe's Link then knows a returning payer at once). Only an address
// Google, Facebook or Apple checked: Stripe locks the field, and an email sign-up is confirmed without a mail, so it may hold a typo
// (gmail.con); there the farmer types the address as before. Not an Apple relay address either, which drops mail from senders Apple
// does not know.
const CHECKED_BY=new Set(['google','facebook','apple']);
export function checkoutEmail(user){
 const email=typeof user?.email==='string'?user.email.trim():'';
 if(!CHECKED_BY.has(user?.app_metadata?.provider)||!user?.email_confirmed_at||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return undefined;
 if(/@privaterelay\.appleid\.com$/i.test(email))return undefined;
 return email;
}

// The game's language for Stripe's page (the page sends <html lang>, public/i18n.js). Stripe has no Ukrainian, Hindi or Arabic page, and
// the game's Portuguese is Brazilian. English is no choice: it is also what the game falls back to for a browser in a language it does
// not speak (Polish, Romanian, Thai …), and Stripe speaks many of those. So English, anything else, or nothing (an older page) is 'auto':
// Stripe follows the browser, as before.
const STRIPE_LOCALES=Object.freeze({cs:'cs',de:'de',es:'es',fr:'fr',id:'id',hu:'hu',nl:'nl',pt:'pt-BR',tr:'tr',ru:'ru',ja:'ja',zh:'zh'});
export function checkoutLocale(language){
 const code=typeof language==='string'?language.trim().slice(0,2).toLowerCase():'';
 return Object.hasOwn(STRIPE_LOCALES,code)?STRIPE_LOCALES[code]:'auto';
}

// Which season a Season Pass page is for (21 Oct 2026, the pre-sale of Winter 2026: two seasons can be bought at once): one line above
// Stripe's pay button (custom_text.submit), in the game's language, e.g. "Season Pass Winter 2026. It starts on 22 December 2026."
// season: {id:'winter-2026', startsAt} (game/payments.js SEASON_SALE); the start only while it is still to come. Unknown: no line.
const SEASON_TEXT=Object.freeze({
 en:{pass:'Season Pass',autumn:'Autumn',winter:'Winter',spring:'Spring',summer:'Summer',starts:'It starts on {0}.'},
 cs:{pass:'Sezónní propustka',autumn:'Podzim',winter:'Zima',spring:'Jaro',summer:'Léto',starts:'Začíná {0}.'},
 de:{pass:'Saisonpass',autumn:'Herbst',winter:'Winter',spring:'Frühling',summer:'Sommer',starts:'Er beginnt am {0}.'},
 es:{pass:'Pase de temporada',autumn:'Otoño',winter:'Invierno',spring:'Primavera',summer:'Verano',starts:'Empieza el {0}.'},
 fr:{pass:'Pass de saison',autumn:'Automne',winter:'Hiver',spring:'Printemps',summer:'Été',starts:'Il commence le {0}.'},
 id:{pass:'Season Pass',autumn:'Musim Gugur',winter:'Musim Dingin',spring:'Musim Semi',summer:'Musim Panas',starts:'Dimulai {0}.'},
 hu:{pass:'Szezonbérlet',autumn:'Ősz',winter:'Tél',spring:'Tavasz',summer:'Nyár',starts:'Kezdete: {0}.'},
 nl:{pass:'Seizoenspas',autumn:'Herfst',winter:'Winter',spring:'Lente',summer:'Zomer',starts:'Hij begint op {0}.'},
 pt:{pass:'Passe da Temporada',autumn:'Outono',winter:'Inverno',spring:'Primavera',summer:'Verão',starts:'Começa em {0}.'},
 tr:{pass:'Sezon Kartı',autumn:'Sonbahar',winter:'Kış',spring:'İlkbahar',summer:'Yaz',starts:'{0} tarihinde başlar.'},
 ru:{pass:'Сезонный пропуск',autumn:'Осень',winter:'Зима',spring:'Весна',summer:'Лето',starts:'Начинается {0}.'},
 uk:{pass:'Сезонна перепустка',autumn:'Осінь',winter:'Зима',spring:'Весна',summer:'Літо',starts:'Починається {0}.'},
 hi:{pass:'सीज़न पास',autumn:'शरद',winter:'सर्दी',spring:'वसंत',summer:'गर्मी',starts:'{0} से शुरू।'},
 ja:{pass:'シーズンパス',autumn:'秋',winter:'冬',spring:'春',summer:'夏',starts:'{0}に始まります。'},
 ar:{pass:'تذكرة الموسم',autumn:'خريف',winter:'شتاء',spring:'ربيع',summer:'صيف',starts:'يبدأ في {0}.'},
 zh:{pass:'季节通行证',autumn:'秋季',winter:'冬季',spring:'春季',summer:'夏季',starts:'{0}开始。'}
});
const DATE_LOCALES=Object.freeze({en:'en-GB',pt:'pt-BR',zh:'zh-CN'});
export function seasonCheckoutText(season,language,now=Date.now()){
 const m=/^(autumn|winter|spring|summer)-(\d{4})$/.exec(typeof season?.id==='string'?season.id:'');if(!m)return undefined;
 const code=typeof language==='string'?language.trim().slice(0,2).toLowerCase():'',lang=Object.hasOwn(SEASON_TEXT,code)?code:'en',w=SEASON_TEXT[lang];
 const name=lang==='ja'?`${w.pass} ${m[2]}年${w[m[1]]}`:lang==='zh'?`${w.pass} ${m[2]} ${w[m[1]]}`:`${w.pass} ${w[m[1]]} ${m[2]}`;
 const end=lang==='ja'||lang==='zh'?'。':lang==='hi'?'।':'.';
 if(!(Number.isFinite(season.startsAt)&&season.startsAt>now))return `${name}${end}`;
 let day;try{day=new Intl.DateTimeFormat(DATE_LOCALES[lang]??lang,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(season.startsAt);}catch{day=new Date(season.startsAt).toISOString().slice(0,10);}
 return `${name}${end}${end==='。'?'':' '}${w.starts.replace('{0}',day)}`;
}
