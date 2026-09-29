// The 6-digit code email (confirming or changing the address) in every game language (29 Sep 2026). The language is the one the
// farmer plays in (player_seen.language, saved when the game loads); unknown or missing means English.
const NBSP=' ';
const CODE_TEXTS={
 en:{subject:c=>`Your Harvest Tycoon code: ${c}`,title:'Your Harvest Tycoon code',heading:'Confirm your email',intro:'Type this code in the game to confirm your email:',valid:'The code works for 30 minutes.',
  footer:'You get this email because someone asked for a code in Harvest Tycoon with this address. If that was not you, you can ignore it.',
  text:c=>`Your code to confirm your email for Harvest Tycoon: ${c}\n\nType it in the game within 30 minutes. If you did not ask for this, you can ignore this email.`},
 nl:{subject:c=>`Je Harvest Tycoon-code: ${c}`,title:'Je Harvest Tycoon-code',heading:'Bevestig je e-mailadres',intro:'Typ deze code in het spel om je e-mailadres te bevestigen:',valid:'De code werkt 30 minuten.',
  footer:'Je krijgt deze e-mail omdat iemand met dit adres een code heeft aangevraagd in Harvest Tycoon. Was jij dat niet? Dan kun je deze e-mail negeren.',
  text:c=>`Je code om je e-mailadres voor Harvest Tycoon te bevestigen: ${c}\n\nTyp hem binnen 30 minuten in het spel. Heb je hier niet om gevraagd? Dan kun je deze e-mail negeren.`},
 de:{subject:c=>`Dein Harvest-Tycoon-Code: ${c}`,title:'Dein Harvest-Tycoon-Code',heading:'Bestätige deine E-Mail-Adresse',intro:'Gib diesen Code im Spiel ein, um deine E-Mail-Adresse zu bestätigen:',valid:'Der Code gilt 30 Minuten.',
  footer:'Du bekommst diese E-Mail, weil jemand mit dieser Adresse in Harvest Tycoon einen Code angefordert hat. Warst du das nicht, kannst du sie ignorieren.',
  text:c=>`Dein Code zur Bestätigung deiner E-Mail-Adresse für Harvest Tycoon: ${c}\n\nGib ihn innerhalb von 30 Minuten im Spiel ein. Wenn du ihn nicht angefordert hast, kannst du diese E-Mail ignorieren.`},
 es:{subject:c=>`Tu código de Harvest Tycoon: ${c}`,title:'Tu código de Harvest Tycoon',heading:'Confirma tu correo',intro:'Escribe este código en el juego para confirmar tu correo:',valid:'El código vale durante 30 minutos.',
  footer:'Recibes este correo porque alguien pidió un código en Harvest Tycoon con esta dirección. Si no fuiste tú, puedes ignorarlo.',
  text:c=>`Tu código para confirmar tu correo en Harvest Tycoon: ${c}\n\nEscríbelo en el juego en los próximos 30 minutos. Si no lo pediste, puedes ignorar este correo.`},
 fr:{subject:c=>`Ton code Harvest Tycoon${NBSP}: ${c}`,title:'Ton code Harvest Tycoon',heading:'Confirme ton adresse e-mail',intro:`Saisis ce code dans le jeu pour confirmer ton adresse e-mail${NBSP}:`,valid:`Le code est valable 30${NBSP}minutes.`,
  footer:'Tu reçois cet e-mail parce que quelqu’un a demandé un code dans Harvest Tycoon avec cette adresse. Si ce n’était pas toi, tu peux l’ignorer.',
  text:c=>`Ton code pour confirmer ton adresse e-mail pour Harvest Tycoon${NBSP}: ${c}\n\nSaisis-le dans le jeu dans les 30${NBSP}minutes. Si tu ne l’as pas demandé, tu peux ignorer cet e-mail.`},
 pt:{subject:c=>`Seu código do Harvest Tycoon: ${c}`,title:'Seu código do Harvest Tycoon',heading:'Confirme seu e-mail',intro:'Digite este código no jogo para confirmar seu e-mail:',valid:'O código vale por 30 minutos.',
  footer:'Você recebeu este e-mail porque alguém pediu um código no Harvest Tycoon com este endereço. Se não foi você, pode ignorá-lo.',
  text:c=>`Seu código para confirmar seu e-mail no Harvest Tycoon: ${c}\n\nDigite-o no jogo em até 30 minutos. Se você não pediu isso, pode ignorar este e-mail.`},
 id:{subject:c=>`Kode Harvest Tycoon-mu: ${c}`,title:'Kode Harvest Tycoon-mu',heading:'Konfirmasi emailmu',intro:'Ketik kode ini di game untuk mengonfirmasi emailmu:',valid:'Kode ini berlaku 30 menit.',
  footer:'Kamu menerima email ini karena seseorang meminta kode di Harvest Tycoon dengan alamat ini. Jika itu bukan kamu, abaikan saja.',
  text:c=>`Kode untuk mengonfirmasi emailmu di Harvest Tycoon: ${c}\n\nKetik di game dalam 30 menit. Jika kamu tidak memintanya, abaikan saja email ini.`},
 tr:{subject:c=>`Harvest Tycoon kodun: ${c}`,title:'Harvest Tycoon kodun',heading:'E-postanı onayla',intro:'E-postanı onaylamak için bu kodu oyuna yaz:',valid:'Kod 30 dakika geçerlidir.',
  footer:'Bu e-postayı, biri bu adresle Harvest Tycoon’da kod istediği için alıyorsun. Bu sen değilsen, görmezden gelebilirsin.',
  text:c=>`Harvest Tycoon için e-posta onay kodun: ${c}\n\n30 dakika içinde oyuna yaz. Bunu sen istemediysen bu e-postayı görmezden gelebilirsin.`},
 hu:{subject:c=>`A Harvest Tycoon-kódod: ${c}`,title:'A Harvest Tycoon-kódod',heading:'Erősítsd meg az e-mail-címed',intro:'Írd be ezt a kódot a játékban az e-mail-címed megerősítéséhez:',valid:'A kód 30 percig érvényes.',
  footer:'Azért kapod ezt az e-mailt, mert valaki kódot kért a Harvest Tycoonban ezzel a címmel. Ha nem te voltál, nyugodtan hagyd figyelmen kívül.',
  text:c=>`A kódod az e-mail-címed megerősítéséhez a Harvest Tycoonban: ${c}\n\nÍrd be a játékban 30 percen belül. Ha nem te kérted, hagyd figyelmen kívül ezt az e-mailt.`},
 ru:{subject:c=>`Твой код Harvest Tycoon: ${c}`,title:'Твой код Harvest Tycoon',heading:'Подтверди свою почту',intro:'Введи этот код в игре, чтобы подтвердить почту:',valid:'Код действует 30 минут.',
  footer:'Это письмо пришло, потому что кто-то запросил код в Harvest Tycoon для этого адреса. Если это был не ты, просто не обращай на него внимания.',
  text:c=>`Твой код для подтверждения почты в Harvest Tycoon: ${c}\n\nВведи его в игре в течение 30 минут. Если код запросил не ты, просто не обращай внимания на это письмо.`},
 uk:{subject:c=>`Твій код Harvest Tycoon: ${c}`,title:'Твій код Harvest Tycoon',heading:'Підтверди свою пошту',intro:'Введи цей код у грі, щоб підтвердити пошту:',valid:'Код діє 30 хвилин.',
  footer:'Цей лист надійшов, бо хтось запросив код у Harvest Tycoon для цієї адреси. Якщо це був не ти, просто не зважай на нього.',
  text:c=>`Твій код для підтвердження пошти в Harvest Tycoon: ${c}\n\nВведи його в грі протягом 30 хвилин. Якщо код запитував не ти, просто не зважай на цей лист.`},
 cs:{subject:c=>`Tvůj kód pro Harvest Tycoon: ${c}`,title:'Tvůj kód pro Harvest Tycoon',heading:'Potvrď svůj e-mail',intro:'Zadej tento kód ve hře a potvrď svůj e-mail:',valid:'Kód platí 30 minut.',
  footer:'Tento e-mail ti přišel, protože si někdo s touto adresou vyžádal kód v Harvest Tycoon. Pokud to nebyl tvůj požadavek, můžeš ho ignorovat.',
  text:c=>`Tvůj kód pro potvrzení e-mailu v Harvest Tycoon: ${c}\n\nZadej ho ve hře do 30 minut. Pokud to nebyl tvůj požadavek, můžeš tento e-mail ignorovat.`},
 hi:{subject:c=>`आपका Harvest Tycoon कोड: ${c}`,title:'आपका Harvest Tycoon कोड',heading:'अपना ईमेल पक्का करें',intro:'अपना ईमेल पक्का करने के लिए यह कोड गेम में डालें:',valid:'यह कोड 30 मिनट तक चलेगा।',
  footer:'आपको यह ईमेल इसलिए मिला है क्योंकि किसी ने इस पते से Harvest Tycoon में कोड माँगा है। अगर वह आप नहीं थे, तो इसे अनदेखा कर दें।',
  text:c=>`Harvest Tycoon में अपना ईमेल पक्का करने का कोड: ${c}\n\nइसे 30 मिनट के अंदर गेम में डालें। अगर आपने यह नहीं माँगा था, तो इस ईमेल को अनदेखा कर दें।`},
 ja:{subject:c=>`Harvest Tycoonの確認コード：${c}`,title:'Harvest Tycoonの確認コード',heading:'メールアドレスの確認',intro:'メールアドレスを確認するには、ゲームでこのコードを入力してください：',valid:'コードの有効期限は30分です。',
  footer:'このメールは、このアドレスでHarvest Tycoonの確認コードがリクエストされたためお送りしています。心当たりがない場合は、このメールを無視してください。',
  text:c=>`Harvest Tycoonのメールアドレス確認コード：${c}\n\n30分以内にゲームで入力してください。心当たりがない場合は、このメールを無視してください。`}
};
export function codeTexts(language){return {...(CODE_TEXTS[language]??CODE_TEXTS.en),language:CODE_TEXTS[language]?language:'en'};}
// The farmer's game language, or null. A failed look-up never stops the email: it is then written in English.
export async function playerLanguage(admin,player){
 try{const r=await admin.from('player_seen').select('language').eq('player_id',player).maybeSingle();return typeof r?.data?.language==='string'?r.data.language:null;}
 catch{return null;}
}
