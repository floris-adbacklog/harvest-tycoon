// The reminder email's texts in every game language (23 Oct 2026, option 5), written here as the news email's are (news-mail/texts.js):
// the subject per language, one short text, the button, and why the farmer gets it with the link that stops only news and offers
// (word for word the news email's own, tests/checkout-reminder.test.mjs checks it). The pack names are the game's own translations
// (public/i18n/<code>.json: Starter Pack, Special offer, Halloween Pass, Season Pass, {0} diamonds). No discount, no bonus, no
// pressure: one calm line that the purchase was not finished, and the way back.
const TEXTS={
 en:{subject:'Your purchase is still waiting',body:'You started this purchase in Harvest Tycoon, but it was not finished. If you still want it, you can try again in the game.',android:'On an Android phone you can also pay with Google Play, in our app.',button:'Back to my farm',
  why:'You get this email because you said yes to news and offers by email in Harvest Tycoon.',unsubscribe:'Unsubscribe from news and offers',
  packs:{starter:'Starter Pack',offer:'Special offer',pass:'Halloween Pass',season:'Season Pass',diamonds:'{0} diamonds'}},
 nl:{subject:'Je aankoop staat nog klaar',body:'Je bent deze aankoop in Harvest Tycoon begonnen, maar hij is niet afgerond. Wil je hem nog? Dan kun je het in het spel opnieuw proberen.',android:'Op een Android-telefoon kun je ook met Google Play betalen, in onze app.',button:'Terug naar mijn boerderij',
  why:'Je krijgt deze e-mail omdat je in Harvest Tycoon ja hebt gezegd op nieuws en aanbiedingen per e-mail.',unsubscribe:'Afmelden voor nieuws en aanbiedingen',
  packs:{starter:'Starterspakket',offer:'Speciale aanbieding',pass:'Halloween Pass',season:'Seizoenspas',diamonds:'{0} diamanten'}},
 de:{subject:'Dein Kauf wartet noch auf dich',body:'Du hast diesen Kauf in Harvest Tycoon begonnen, aber er wurde nicht abgeschlossen. Wenn du ihn noch möchtest, kannst du es im Spiel noch einmal versuchen.',android:'Auf einem Android-Handy kannst du auch mit Google Play bezahlen, in unserer App.',button:'Zurück zu meinem Hof',
  why:'Du bekommst diese E-Mail, weil du in Harvest Tycoon Ja zu Neuigkeiten und Angeboten per E-Mail gesagt hast.',unsubscribe:'Von Neuigkeiten und Angeboten abmelden',
  packs:{starter:'Starterpaket',offer:'Sonderangebot',pass:'Halloween Pass',season:'Saisonpass',diamonds:'{0} Diamanten'}},
 es:{subject:'Tu compra sigue esperándote',body:'Empezaste esta compra en Harvest Tycoon, pero no se terminó. Si todavía la quieres, puedes intentarlo de nuevo en el juego.',android:'En un móvil Android también puedes pagar con Google Play, en nuestra app.',button:'Volver a mi granja',
  why:'Recibes este correo porque en Harvest Tycoon aceptaste recibir novedades y ofertas por correo.',unsubscribe:'Darse de baja de novedades y ofertas',
  packs:{starter:'Pack de inicio',offer:'Oferta especial',pass:'Pase de Halloween',season:'Pase de temporada',diamonds:'{0} diamantes'}},
 fr:{subject:'Ton achat t’attend toujours',body:'Tu as commencé cet achat dans Harvest Tycoon, mais il n’a pas été terminé. Si tu le veux toujours, tu peux réessayer dans le jeu.',android:'Sur un téléphone Android, tu peux aussi payer avec Google Play, dans notre appli.',button:'Retour à ma ferme',
  why:'Tu reçois cet e-mail parce que tu as accepté de recevoir des nouvelles et des offres par e-mail dans Harvest Tycoon.',unsubscribe:'Se désabonner des nouvelles et offres',
  packs:{starter:'Pack de départ',offer:'Offre spéciale',pass:'Pass Halloween',season:'Pass de saison',diamonds:'{0} diamants'}},
 pt:{subject:'Sua compra ainda está esperando',body:'Você começou esta compra no Harvest Tycoon, mas ela não foi concluída. Se ainda quiser, pode tentar de novo no jogo.',android:'Em um celular Android, você também pode pagar com o Google Play, no nosso app.',button:'Voltar para minha fazenda',
  why:'Você recebe este e-mail porque aceitou receber novidades e ofertas por e-mail no Harvest Tycoon.',unsubscribe:'Cancelar novidades e ofertas',
  packs:{starter:'Pacote Inicial',offer:'Oferta especial',pass:'Passe de Halloween',season:'Passe da Temporada',diamonds:'{0} diamantes'}},
 id:{subject:'Pembelianmu masih menunggu',body:'Kamu memulai pembelian ini di Harvest Tycoon, tetapi belum selesai. Kalau masih mau, kamu bisa mencobanya lagi di dalam game.',android:'Di ponsel Android, kamu juga bisa membayar dengan Google Play, di aplikasi kami.',button:'Kembali ke pertanianku',
  why:'Kamu menerima email ini karena kamu setuju menerima kabar dan penawaran lewat email di Harvest Tycoon.',unsubscribe:'Berhenti berlangganan kabar dan penawaran',
  packs:{starter:'Paket Pemula',offer:'Penawaran spesial',pass:'Halloween Pass',season:'Season Pass',diamonds:'{0} berlian'}},
 tr:{subject:'Satın alman hâlâ seni bekliyor',body:'Bu satın almayı Harvest Tycoon’da başlattın ama tamamlanmadı. Hâlâ istiyorsan oyunda yeniden deneyebilirsin.',android:'Android telefonda Google Play ile de ödeyebilirsin, uygulamamızda.',button:'Çiftliğime dön',
  why:'Bu e-postayı, Harvest Tycoon’da e-postayla haber ve fırsatlara evet dediğin için alıyorsun.',unsubscribe:'Haber ve fırsat aboneliğinden çık',
  packs:{starter:'Başlangıç Paketi',offer:'Özel teklif',pass:'Halloween Pass',season:'Sezon Kartı',diamonds:'{0} elmas'}},
 hu:{subject:'A vásárlásod még vár rád',body:'Elkezdted ezt a vásárlást a Harvest Tycoonban, de nem fejeződött be. Ha még szeretnéd, a játékban újra megpróbálhatod.',android:'Androidos telefonon a Google Playjel is fizethetsz, az alkalmazásunkban.',button:'Vissza a farmomra',
  why:'Azért kapod ezt az e-mailt, mert a Harvest Tycoonban igent mondtál az e-mailes hírekre és ajánlatokra.',unsubscribe:'Leiratkozás a hírekről és ajánlatokról',
  packs:{starter:'Kezdőcsomag',offer:'Különleges ajánlat',pass:'Halloween Pass',season:'Szezonbérlet',diamonds:'{0} gyémánt'}},
 ru:{subject:'Твоя покупка всё ещё ждёт',body:'Эта покупка в Harvest Tycoon была начата, но не завершена. Если она всё ещё нужна, попробуй ещё раз в игре.',android:'На телефоне Android можно также оплатить через Google Play в нашем приложении.',button:'Вернуться на ферму',
  why:'Ты получаешь это письмо, потому что в Harvest Tycoon у тебя включены новости и предложения по почте.',unsubscribe:'Отписаться от новостей и предложений',
  packs:{starter:'Стартовый набор',offer:'Спецпредложение',pass:'Хэллоуин-пропуск',season:'Сезонный пропуск',diamonds:{one:'{0} алмаз',few:'{0} алмаза',many:'{0} алмазов',other:'{0} алмаза'}}},
 uk:{subject:'Твоя покупка все ще чекає',body:'Цю покупку в Harvest Tycoon розпочато, але не завершено. Якщо вона ще потрібна, спробуй ще раз у грі.',android:'На телефоні Android можна також оплатити через Google Play у нашому застосунку.',button:'Повернутися на ферму',
  why:'Ти отримуєш цей лист, бо в Harvest Tycoon у тебе увімкнено новини й пропозиції e-mailом.',unsubscribe:'Відписатися від новин і пропозицій',
  packs:{starter:'Стартовий набір',offer:'Спецпропозиція',pass:'Гелловінська перепустка',season:'Сезонна перепустка',diamonds:{one:'{0} діамант',few:'{0} діаманти',many:'{0} діамантів',other:'{0} діаманта'}}},
 cs:{subject:'Tvůj nákup na tebe stále čeká',body:'Tento nákup v Harvest Tycoon byl zahájen, ale nebyl dokončen. Pokud ho ještě chceš, můžeš to ve hře zkusit znovu.',android:'Na telefonu s Androidem můžeš platit také přes Google Play v naší aplikaci.',button:'Zpět na moji farmu',
  why:'Tento e-mail dostáváš, protože máš v Harvest Tycoon zapnuté novinky a nabídky e-mailem.',unsubscribe:'Odhlásit odběr novinek a nabídek',
  packs:{starter:'Startovní balíček',offer:'Speciální nabídka',pass:'Halloween Pass',season:'Sezónní propustka',diamonds:{one:'{0} diamant',few:'{0} diamanty',many:'{0} diamantu',other:'{0} diamantů'}}},
 hi:{subject:'आपकी ख़रीदारी अभी भी इंतज़ार कर रही है',body:'आपने Harvest Tycoon में यह ख़रीदारी शुरू की थी, लेकिन वह पूरी नहीं हुई। अगर आप इसे अब भी चाहते हैं, तो गेम में फिर से कोशिश कर सकते हैं।',android:'Android फ़ोन पर आप हमारे ऐप में Google Play से भी भुगतान कर सकते हैं।',button:'मेरे फ़ार्म पर वापस',
  why:'आपको यह ईमेल इसलिए मिला है क्योंकि आपने Harvest Tycoon में ईमेल से खबरें और ऑफ़र पाने के लिए हाँ कहा है।',unsubscribe:'खबरों और ऑफ़र की सदस्यता छोड़ें',
  packs:{starter:'स्टार्टर पैक',offer:'ख़ास ऑफ़र',pass:'हैलोवीन पास',season:'सीज़न पास',diamonds:'{0} हीरे'}},
 ja:{subject:'お買い物がまだ完了していません',body:'Harvest Tycoonでこのお買い物を始めましたが、完了していません。まだご希望でしたら、ゲーム内でもう一度お試しください。',android:'Androidのスマートフォンなら、アプリでGoogle Playからもお支払いいただけます。',button:'自分の農場に戻る',
  why:'Harvest Tycoonでメールでのニュースとお得な情報の受け取りに同意いただいたため、このメールをお送りしています。',unsubscribe:'ニュースとお得な情報の配信を停止',
  packs:{starter:'スターターパック',offer:'特別オファー',pass:'ハロウィンパス',season:'シーズンパス',diamonds:'{0}ダイヤ'}},
 ar:{subject:'عملية الشراء ما زالت بانتظارك',body:'بدأت عملية الشراء هذه في Harvest Tycoon لكنها لم تكتمل. إن كنت ما زلت تريدها، يمكنك المحاولة مرة أخرى في اللعبة.',android:'على هاتف Android يمكنك أيضًا الدفع عبر Google Play في تطبيقنا.',button:'العودة إلى مزرعتي',
  why:'تصلك هذه الرسالة لأنك وافقت في Harvest Tycoon على تلقي الأخبار والعروض بالبريد.',unsubscribe:'إلغاء الاشتراك في الأخبار والعروض',
  packs:{starter:'حزمة البداية',offer:'عرض خاص',pass:'تذكرة الهالوين',season:'تذكرة الموسم',diamonds:'{0} ألماسة'}},
 zh:{subject:'你的购买还在等你',body:'你在 Harvest Tycoon 中开始了这笔购买，但尚未完成。如果你仍然想要，可以在游戏中再试一次。',android:'在 Android 手机上，你也可以在我们的应用中通过 Google Play 付款。',button:'回到我的农场',
  why:'你收到这封邮件，是因为你在 Harvest Tycoon 中同意通过邮件接收新闻与优惠。',unsubscribe:'退订新闻与优惠',
  packs:{starter:'新手礼包',offer:'特别优惠',pass:'万圣节通行证',season:'季节通行证',diamonds:'{0} 钻石'}}
};
export const REMINDER_LANGUAGES=Object.freeze(Object.keys(TEXTS));
export const RTL_MAIL=Object.freeze(['ar']);
export function reminderTexts(language){
 const code=Object.hasOwn(TEXTS,language)?language:'en';
 return {...TEXTS[code],language:code};
}
// The pack's name in that language: a diamond pack with its number written the language's way (and its plural form where the
// language has more than one).
export function packNameIn(language,pack,diamonds){
 const t=reminderTexts(language);
 if(Object.hasOwn(t.packs,pack)&&pack!=='diamonds')return t.packs[pack];
 const n=Number(diamonds)||0,forms=t.packs.diamonds;
 const form=typeof forms==='string'?forms:forms[new Intl.PluralRules(t.language).select(n)]??forms.other;
 return form.replace('{0}',n.toLocaleString(t.language==='en'?'en-US':t.language));
}
