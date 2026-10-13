// The fixed parts of a news and offers email (13 Oct 2026) in every game language, like the reminder texts (notify-hourly/texts.js):
// why the farmer gets it and the link that stops only these emails. The language is the farmer's game language (player_seen.language);
// unknown or missing means English. The admin's own text comes from the Admin dashboard (mail.js picks it per language).
const TEXTS={
 en:{why:'You get this email because you said yes to news and offers by email in Harvest Tycoon.',unsubscribe:'Unsubscribe from news and offers'},
 nl:{why:'Je krijgt deze e-mail omdat je in Harvest Tycoon ja hebt gezegd op nieuws en aanbiedingen per e-mail.',unsubscribe:'Afmelden voor nieuws en aanbiedingen'},
 de:{why:'Du bekommst diese E-Mail, weil du in Harvest Tycoon Ja zu Neuigkeiten und Angeboten per E-Mail gesagt hast.',unsubscribe:'Von Neuigkeiten und Angeboten abmelden'},
 es:{why:'Recibes este correo porque en Harvest Tycoon aceptaste recibir novedades y ofertas por correo.',unsubscribe:'Darse de baja de novedades y ofertas'},
 fr:{why:'Tu reçois cet e-mail parce que tu as accepté de recevoir des nouvelles et des offres par e-mail dans Harvest Tycoon.',unsubscribe:'Se désabonner des nouvelles et offres'},
 pt:{why:'Você recebe este e-mail porque aceitou receber novidades e ofertas por e-mail no Harvest Tycoon.',unsubscribe:'Cancelar novidades e ofertas'},
 id:{why:'Kamu menerima email ini karena kamu setuju menerima kabar dan penawaran lewat email di Harvest Tycoon.',unsubscribe:'Berhenti berlangganan kabar dan penawaran'},
 tr:{why:'Bu e-postayı, Harvest Tycoon’da e-postayla haber ve fırsatlara evet dediğin için alıyorsun.',unsubscribe:'Haber ve fırsat aboneliğinden çık'},
 hu:{why:'Azért kapod ezt az e-mailt, mert a Harvest Tycoonban igent mondtál az e-mailes hírekre és ajánlatokra.',unsubscribe:'Leiratkozás a hírekről és ajánlatokról'},
 ru:{why:'Ты получаешь это письмо, потому что в Harvest Tycoon у тебя включены новости и предложения по почте.',unsubscribe:'Отписаться от новостей и предложений'},
 uk:{why:'Ти отримуєш цей лист, бо в Harvest Tycoon у тебе увімкнено новини й пропозиції e-mailом.',unsubscribe:'Відписатися від новин і пропозицій'},
 cs:{why:'Tento e-mail dostáváš, protože máš v Harvest Tycoon zapnuté novinky a nabídky e-mailem.',unsubscribe:'Odhlásit odběr novinek a nabídek'},
 hi:{why:'आपको यह ईमेल इसलिए मिला है क्योंकि आपने Harvest Tycoon में ईमेल से खबरें और ऑफ़र पाने के लिए हाँ कहा है।',unsubscribe:'खबरों और ऑफ़र की सदस्यता छोड़ें'},
 ja:{why:'Harvest Tycoonでメールでのニュースとお得な情報の受け取りに同意いただいたため、このメールをお送りしています。',unsubscribe:'ニュースとお得な情報の配信を停止'},
 ar:{why:'تصلك هذه الرسالة لأنك وافقت في Harvest Tycoon على تلقي الأخبار والعروض بالبريد.',unsubscribe:'إلغاء الاشتراك في الأخبار والعروض'},
 zh:{why:'你收到这封邮件，是因为你在 Harvest Tycoon 中同意通过邮件接收新闻与优惠。',unsubscribe:'退订新闻与优惠'}
};
export const NEWS_LANGUAGES=Object.freeze(Object.keys(TEXTS));
// Languages that read from right to left: that part of the email runs right to left (dir="rtl").
export const RTL_MAIL=Object.freeze(['ar']);
export function newsTexts(language){
 const code=TEXTS[language]?language:'en';
 return {...TEXTS[code],language:code};
}
