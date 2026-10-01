// The reminder texts (daily email summary and push) in every game language (29 Sep 2026). The language is the one the farmer plays
// in (player_seen.language, saved by farm-api when the game loads); unknown or missing means English. Crop and building names come
// from the game's own translations (names.js). A count that changes the noun picks its form with Intl.PluralRules.
const NBSP=' ';
const forms=(lang,n,f)=>typeof f==='string'?f:(f[new Intl.PluralRules(lang).select(n)]??f.other);

const TEXTS={
 en:{
  hi:n=>`Hi ${n}!`,waiting:'Your farm has something waiting:',button:'Open my farm',openText:'Open your farm',
  footer:'You get this email because you switched on the daily summary in Settings. It is sent once a day, and only when something is waiting.',
  footerShort:'You get this email because you switched on the daily summary in Settings.',unsubscribe:'Unsubscribe',
  subjectCrops:n=>`Your farm needs you: ${n} ${n===1?'crop':'crops'} ready`,subjectJobs:n=>`Your farm needs you: ${n} ${n===1?'batch':'batches'} ready`,
  gift:'Your daily gift is waiting',giftStreak:n=>`Your daily gift is waiting: keep your ${n}-day streak going`,
  cropsLine:(n,list)=>`${n} ${n===1?'crop':'crops'} ready to harvest${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${n===1?'batch':'batches'} ready`,jobsMany:(n,list)=>`${n} batches ready (${list})`,
  item:(n,name)=>`${n} ${name.toLowerCase()}`,
  pushGift:b=>`Your daily gift is waiting, with ${b}`,boosts:{3:'double XP',5:'double harvest',7:'double earnings'},
  pushStreak:n=>`Collect your gift to keep your ${n}-day streak`,
  readyBoth:'Your crops and goods are ready',readyCrops:'Your crops are ready to harvest',readyGoods:'Your goods are ready to collect'
 },
 nl:{
  hi:n=>`Hoi ${n}!`,waiting:'Er wacht iets op je boerderij:',button:'Open mijn boerderij',openText:'Open je boerderij',
  footer:'Je krijgt deze e-mail omdat je de dagelijkse samenvatting hebt aangezet bij Instellingen. Hij komt één keer per dag, en alleen als er iets wacht.',
  footerShort:'Je krijgt deze e-mail omdat je de dagelijkse samenvatting hebt aangezet bij Instellingen.',unsubscribe:'Afmelden',
  subjectCrops:n=>`Je boerderij heeft je nodig: ${n} ${n===1?'gewas':'gewassen'} klaar`,subjectJobs:n=>`Je boerderij heeft je nodig: ${n} ${n===1?'batch':'batches'} klaar`,
  gift:'Je dagcadeau ligt klaar',giftStreak:n=>`Je dagcadeau ligt klaar: houd je reeks van ${n} dagen vast`,
  cropsLine:(n,list)=>`${n} ${n===1?'gewas':'gewassen'} klaar om te oogsten${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${n===1?'batch':'batches'} klaar`,jobsMany:(n,list)=>`${n} batches klaar (${list})`,
  pushGift:b=>`Je dagcadeau ligt klaar, met ${b}`,boosts:{3:'dubbele XP',5:'dubbele oogst',7:'dubbele verdiensten'},
  pushStreak:n=>`Haal je cadeau op en houd je reeks van ${n} dagen vast`,
  readyBoth:'Je gewassen en producten zijn klaar',readyCrops:'Je gewassen zijn klaar om te oogsten',readyGoods:'Je producten liggen klaar om op te halen'
 },
 de:{
  hi:n=>`Hallo ${n}!`,waiting:'Auf deinem Hof wartet etwas:',button:'Meinen Hof öffnen',openText:'Deinen Hof öffnen',
  footer:'Du bekommst diese E-Mail, weil du die tägliche Zusammenfassung in den Einstellungen eingeschaltet hast. Sie kommt einmal am Tag und nur, wenn etwas wartet.',
  footerShort:'Du bekommst diese E-Mail, weil du die tägliche Zusammenfassung in den Einstellungen eingeschaltet hast.',unsubscribe:'Abmelden',
  subjectCrops:n=>`Dein Hof braucht dich: ${n} ${n===1?'Feldfrucht':'Feldfrüchte'} erntereif`,subjectJobs:n=>`Dein Hof braucht dich: ${n} ${n===1?'Charge':'Chargen'} fertig`,
  gift:'Dein Tagesgeschenk wartet',giftStreak:n=>`Dein Tagesgeschenk wartet: Halte deine Serie von ${n} Tagen`,
  cropsLine:(n,list)=>`${n} ${n===1?'Feldfrucht':'Feldfrüchte'} erntereif${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${n===1?'Charge':'Chargen'} fertig`,jobsMany:(n,list)=>`${n} Chargen fertig (${list})`,
  pushGift:b=>`Dein Tagesgeschenk wartet, mit ${b}`,boosts:{3:'doppelten XP',5:'doppelter Ernte',7:'doppeltem Verdienst'},
  pushStreak:n=>`Hol dein Geschenk ab und halte deine Serie von ${n} Tagen`,
  readyBoth:'Deine Feldfrüchte und Waren sind fertig',readyCrops:'Deine Feldfrüchte sind erntereif',readyGoods:'Deine Waren sind abholbereit'
 },
 es:{
  hi:n=>`¡Hola, ${n}!`,waiting:'Algo te espera en tu granja:',button:'Abrir mi granja',openText:'Abre tu granja',
  footer:'Recibes este correo porque activaste el resumen diario en Ajustes. Se envía una vez al día y solo cuando algo te espera.',
  footerShort:'Recibes este correo porque activaste el resumen diario en Ajustes.',unsubscribe:'Darse de baja',
  subjectCrops:n=>`Tu granja te necesita: ${n} ${n===1?'cultivo listo':'cultivos listos'}`,subjectJobs:n=>`Tu granja te necesita: ${n} ${n===1?'lote listo':'lotes listos'}`,
  gift:'Tu regalo diario te espera',giftStreak:n=>`Tu regalo diario te espera: mantén tu racha de ${n} días`,
  cropsLine:(n,list)=>`${n} ${n===1?'cultivo listo':'cultivos listos'} para cosechar${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${n===1?'lote listo':'lotes listos'}`,jobsMany:(n,list)=>`${n} lotes listos (${list})`,
  pushGift:b=>`Tu regalo diario te espera, con ${b}`,boosts:{3:'XP doble',5:'cosecha doble',7:'ganancias dobles'},
  pushStreak:n=>`Recoge tu regalo para mantener tu racha de ${n} días`,
  readyBoth:'Tus cultivos y productos están listos',readyCrops:'Tus cultivos están listos para cosechar',readyGoods:'Tus productos están listos para recoger'
 },
 fr:{
  hi:n=>`Bonjour ${n}${NBSP}!`,waiting:`Quelque chose t’attend à la ferme${NBSP}:`,button:'Ouvrir ma ferme',openText:'Ouvre ta ferme',
  footer:'Tu reçois cet e-mail parce que tu as activé le résumé quotidien dans les Paramètres. Il est envoyé une fois par jour, et seulement quand quelque chose t’attend.',
  footerShort:'Tu reçois cet e-mail parce que tu as activé le résumé quotidien dans les Paramètres.',unsubscribe:'Se désabonner',
  subjectCrops:n=>`Ta ferme a besoin de toi${NBSP}: ${n} ${n<=1?'culture prête':'cultures prêtes'}`,subjectJobs:n=>`Ta ferme a besoin de toi${NBSP}: ${n} ${n<=1?'lot prêt':'lots prêts'}`,
  gift:'Ton cadeau du jour t’attend',giftStreak:n=>`Ton cadeau du jour t’attend${NBSP}: garde ta série de ${n}${NBSP}jours`,
  cropsLine:(n,list)=>`${n} ${n<=1?'culture prête':'cultures prêtes'} à récolter${list?`${NBSP}: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}${NBSP}: ${n} ${n<=1?'lot prêt':'lots prêts'}`,jobsMany:(n,list)=>`${n} lots prêts (${list})`,
  pushGift:b=>`Ton cadeau du jour t’attend, avec ${b}`,boosts:{3:'l’XP double',5:'la récolte double',7:'les gains doublés'},
  pushStreak:n=>`Récupère ton cadeau pour garder ta série de ${n}${NBSP}jours`,
  readyBoth:'Tes cultures et tes produits sont prêts',readyCrops:'Tes cultures sont prêtes à récolter',readyGoods:'Tes produits sont prêts à récupérer'
 },
 pt:{
  hi:n=>`Oi, ${n}!`,waiting:'Tem algo esperando por você na fazenda:',button:'Abrir minha fazenda',openText:'Abra sua fazenda',
  footer:'Você recebe este e-mail porque ativou o resumo diário em Configurações. Ele é enviado uma vez por dia, e só quando tem algo esperando.',
  footerShort:'Você recebe este e-mail porque ativou o resumo diário em Configurações.',unsubscribe:'Cancelar inscrição',
  subjectCrops:n=>`Sua fazenda precisa de você: ${n} ${n===1?'cultivo pronto':'cultivos prontos'}`,subjectJobs:n=>`Sua fazenda precisa de você: ${n} ${n===1?'lote pronto':'lotes prontos'}`,
  gift:'Seu presente diário está esperando',giftStreak:n=>`Seu presente diário está esperando: mantenha sua sequência de ${n} dias`,
  cropsLine:(n,list)=>`${n} ${n===1?'cultivo pronto':'cultivos prontos'} para colher${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${n===1?'lote pronto':'lotes prontos'}`,jobsMany:(n,list)=>`${n} lotes prontos (${list})`,
  pushGift:b=>`Seu presente diário está esperando, com ${b}`,boosts:{3:'XP em dobro',5:'colheita em dobro',7:'ganhos em dobro'},
  pushStreak:n=>`Pegue seu presente para manter sua sequência de ${n} dias`,
  readyBoth:'Seus cultivos e produtos estão prontos',readyCrops:'Seus cultivos estão prontos para colher',readyGoods:'Seus produtos estão prontos para coletar'
 },
 id:{
  hi:n=>`Hai ${n}!`,waiting:'Ada yang menunggumu di kebun:',button:'Buka kebunku',openText:'Buka kebunmu',
  footer:'Kamu menerima email ini karena kamu menyalakan ringkasan harian di Pengaturan. Email ini dikirim sekali sehari, dan hanya jika ada yang menunggu.',
  footerShort:'Kamu menerima email ini karena kamu menyalakan ringkasan harian di Pengaturan.',unsubscribe:'Berhenti berlangganan',
  subjectCrops:n=>`Kebunmu membutuhkanmu: ${n} tanaman siap`,subjectJobs:n=>`Kebunmu membutuhkanmu: ${n} batch siap`,
  gift:'Hadiah harianmu menunggu',giftStreak:n=>`Hadiah harianmu menunggu: pertahankan ${n} hari beruntunmu`,
  cropsLine:(n,list)=>`${n} tanaman siap dipanen${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} batch siap`,jobsMany:(n,list)=>`${n} batch siap (${list})`,
  pushGift:b=>`Hadiah harianmu menunggu, dengan ${b}`,boosts:{3:'XP ganda',5:'panen ganda',7:'penghasilan ganda'},
  pushStreak:n=>`Ambil hadiahmu untuk mempertahankan ${n} hari beruntunmu`,
  readyBoth:'Tanaman dan barangmu sudah siap',readyCrops:'Tanamanmu siap dipanen',readyGoods:'Barangmu siap diambil'
 },
 tr:{
  hi:n=>`Merhaba ${n}!`,waiting:'Çiftliğinde seni bekleyen bir şey var:',button:'Çiftliğimi aç',openText:'Çiftliğini aç',
  footer:'Bu e-postayı, Ayarlar’da günlük özeti açtığın için alıyorsun. Günde bir kez ve yalnızca bekleyen bir şey olduğunda gönderilir.',
  footerShort:'Bu e-postayı, Ayarlar’da günlük özeti açtığın için alıyorsun.',unsubscribe:'Abonelikten çık',
  subjectCrops:n=>`Çiftliğin seni bekliyor: ${n} mahsul hazır`,subjectJobs:n=>`Çiftliğin seni bekliyor: ${n} parti hazır`,
  gift:'Günlük hediyen seni bekliyor',giftStreak:n=>`Günlük hediyen seni bekliyor: ${n} günlük serini sürdür`,
  cropsLine:(n,list)=>`${n} mahsul hasada hazır${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} parti hazır`,jobsMany:(n,list)=>`${n} parti hazır (${list})`,
  pushGift:b=>`Günlük hediyen seni bekliyor, yanında ${b}`,boosts:{3:'çift XP',5:'çift hasat',7:'çift kazanç'},
  pushStreak:n=>`${n} günlük serini sürdürmek için hediyeni al`,
  readyBoth:'Mahsullerin ve ürünlerin hazır',readyCrops:'Mahsullerin hasada hazır',readyGoods:'Ürünlerin toplanmaya hazır'
 },
 hu:{
  hi:n=>`Szia, ${n}!`,waiting:'Valami vár rád a farmodon:',button:'Farmom megnyitása',openText:'Nyisd meg a farmodat',
  footer:'Azért kapod ezt az e-mailt, mert a Beállításokban bekapcsoltad a napi összefoglalót. Naponta egyszer küldjük, és csak akkor, ha vár rád valami.',
  footerShort:'Azért kapod ezt az e-mailt, mert a Beállításokban bekapcsoltad a napi összefoglalót.',unsubscribe:'Leiratkozás',
  subjectCrops:n=>`A farmodnak szüksége van rád: ${n} termény kész`,subjectJobs:n=>`A farmodnak szüksége van rád: ${n} adag kész`,
  gift:'Vár a napi ajándékod',giftStreak:n=>`Vár a napi ajándékod: tartsd meg a(z) ${n} napos sorozatodat`,
  cropsLine:(n,list)=>`${n} termény betakarítható${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} adag kész`,jobsMany:(n,list)=>`${n} adag kész (${list})`,
  pushGift:b=>`Vár a napi ajándékod, benne: ${b}`,boosts:{3:'dupla XP',5:'dupla termés',7:'dupla bevétel'},
  pushStreak:n=>`Vedd át az ajándékodat, hogy megmaradjon a(z) ${n} napos sorozatod`,
  readyBoth:'A terményeid és termékeid elkészültek',readyCrops:'A terményeid betakaríthatók',readyGoods:'A termékeid átvehetők'
 },
 ru:{
  hi:n=>`Привет, ${n}!`,waiting:'На твоей ферме кое-что ждёт:',button:'Открыть мою ферму',openText:'Открой свою ферму',
  footer:'Ты получаешь это письмо, потому что в Настройках включена ежедневная сводка. Оно приходит раз в день и только тогда, когда что-то ждёт.',
  footerShort:'Ты получаешь это письмо, потому что в Настройках включена ежедневная сводка.',unsubscribe:'Отписаться',
  subjectCrops:n=>`Ферма ждёт тебя: ${n} ${forms('ru',n,{one:'культура готова',few:'культуры готовы',many:'культур готово',other:'культуры готово'})}`,
  subjectJobs:n=>`Ферма ждёт тебя: ${n} ${forms('ru',n,{one:'партия готова',few:'партии готовы',many:'партий готово',other:'партии готово'})}`,
  gift:'Тебя ждёт ежедневный подарок',giftStreak:n=>`Тебя ждёт ежедневный подарок: не прерви свою ${n}-дневную серию`,
  cropsLine:(n,list)=>`Урожай готов: ${n} ${forms('ru',n,{one:'культура',few:'культуры',many:'культур',other:'культуры'})}${list?` (${list})`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${forms('ru',n,{one:'партия готова',few:'партии готовы',many:'партий готово',other:'партии готово'})}`,
  jobsMany:(n,list)=>`${n} ${forms('ru',n,{one:'партия готова',few:'партии готовы',many:'партий готово',other:'партии готово'})} (${list})`,
  pushGift:b=>`Тебя ждёт ежедневный подарок, а с ним ${b}`,boosts:{3:'двойной XP',5:'двойной урожай',7:'двойной доход'},
  pushStreak:n=>`Забери подарок, чтобы сохранить ${n}-дневную серию`,
  readyBoth:'Твои культуры и товары готовы',readyCrops:'Твои культуры готовы к сбору',readyGoods:'Твои товары готовы: забери их'
 },
 uk:{
  hi:n=>`Привіт, ${n}!`,waiting:'На твоїй фермі дещо чекає:',button:'Відкрити мою ферму',openText:'Відкрий свою ферму',
  footer:'Ти отримуєш цей лист, бо в Налаштуваннях увімкнено щоденне зведення. Він приходить раз на день і лише тоді, коли щось чекає.',
  footerShort:'Ти отримуєш цей лист, бо в Налаштуваннях увімкнено щоденне зведення.',unsubscribe:'Відписатися',
  subjectCrops:n=>`Ферма чекає на тебе: ${n} ${forms('uk',n,{one:'культура готова',few:'культури готові',many:'культур готово',other:'культури готово'})}`,
  subjectJobs:n=>`Ферма чекає на тебе: ${n} ${forms('uk',n,{one:'партія готова',few:'партії готові',many:'партій готово',other:'партії готово'})}`,
  gift:'На тебе чекає щоденний подарунок',giftStreak:n=>`На тебе чекає щоденний подарунок: не перерви свою ${n}-денну серію`,
  cropsLine:(n,list)=>`Урожай готовий: ${n} ${forms('uk',n,{one:'культура',few:'культури',many:'культур',other:'культури'})}${list?` (${list})`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${forms('uk',n,{one:'партія готова',few:'партії готові',many:'партій готово',other:'партії готово'})}`,
  jobsMany:(n,list)=>`${n} ${forms('uk',n,{one:'партія готова',few:'партії готові',many:'партій готово',other:'партії готово'})} (${list})`,
  pushGift:b=>`На тебе чекає щоденний подарунок, а з ним ${b}`,boosts:{3:'подвійний XP',5:'подвійний урожай',7:'подвійний заробіток'},
  pushStreak:n=>`Забери подарунок, щоб зберегти ${n}-денну серію`,
  readyBoth:'Твої культури й вироби готові',readyCrops:'Твої культури готові до збирання',readyGoods:'Твої вироби готові: забери їх'
 },
 cs:{
  hi:n=>`Ahoj ${n}!`,waiting:'Na tvé farmě na tebe něco čeká:',button:'Otevřít moji farmu',openText:'Otevři svou farmu',
  footer:'Tento e-mail dostáváš, protože máš v Nastavení zapnuté denní shrnutí. Chodí jednou denně, a jen když na tebe něco čeká.',
  footerShort:'Tento e-mail dostáváš, protože máš v Nastavení zapnuté denní shrnutí.',unsubscribe:'Odhlásit odběr',
  subjectCrops:n=>`Tvoje farma tě potřebuje: ${n} ${forms('cs',n,{one:'plodina připravena',few:'plodiny připraveny',many:'plodiny připraveno',other:'plodin připraveno'})}`,
  subjectJobs:n=>`Tvoje farma tě potřebuje: ${n} ${forms('cs',n,{one:'várka hotová',few:'várky hotové',many:'várky hotovo',other:'várek hotovo'})}`,
  gift:'Čeká na tebe denní dárek',giftStreak:n=>`Čeká na tebe denní dárek: udrž svou ${n}denní sérii`,
  cropsLine:(n,list)=>`Ke sklizni: ${n} ${forms('cs',n,{one:'plodina',few:'plodiny',many:'plodiny',other:'plodin'})}${list?` (${list})`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${forms('cs',n,{one:'várka hotová',few:'várky hotové',many:'várky hotovo',other:'várek hotovo'})}`,
  jobsMany:(n,list)=>`${n} ${forms('cs',n,{one:'várka hotová',few:'várky hotové',many:'várky hotovo',other:'várek hotovo'})} (${list})`,
  pushGift:b=>`Čeká na tebe denní dárek a s ním ${b}`,boosts:{3:'dvojnásobné XP',5:'dvojnásobná sklizeň',7:'dvojnásobný výdělek'},
  pushStreak:n=>`Vyzvedni si dárek a udrž svou ${n}denní sérii`,
  readyBoth:'Tvoje plodiny a výrobky jsou hotové',readyCrops:'Tvoje plodiny jsou připravené ke sklizni',readyGoods:'Tvoje výrobky jsou připravené k vyzvednutí'
 },
 hi:{
  hi:n=>`नमस्ते ${n}!`,waiting:'आपके फ़ार्म पर कुछ आपका इंतज़ार कर रहा है:',button:'मेरा फ़ार्म खोलें',openText:'अपना फ़ार्म खोलें',
  footer:'आपको यह ईमेल इसलिए मिला है क्योंकि आपने सेटिंग्स में रोज़ का सारांश चालू किया है। यह दिन में एक बार भेजा जाता है, और सिर्फ़ तब जब कुछ इंतज़ार कर रहा हो।',
  footerShort:'आपको यह ईमेल इसलिए मिला है क्योंकि आपने सेटिंग्स में रोज़ का सारांश चालू किया है।',unsubscribe:'सदस्यता छोड़ें',
  subjectCrops:n=>`आपके फ़ार्म को आपकी ज़रूरत है: ${n} ${n===1?'फसल':'फसलें'} तैयार`,subjectJobs:n=>`आपके फ़ार्म को आपकी ज़रूरत है: ${n} बैच तैयार`,
  gift:'आपका रोज़ का तोहफ़ा इंतज़ार कर रहा है',giftStreak:n=>`आपका रोज़ का तोहफ़ा इंतज़ार कर रहा है: अपना ${n} दिन का सिलसिला बनाए रखें`,
  cropsLine:(n,list)=>`${n} ${n===1?'फसल':'फसलें'} कटाई के लिए तैयार${list?`: ${list}`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} बैच तैयार`,jobsMany:(n,list)=>`${n} बैच तैयार (${list})`,
  pushGift:b=>`आपका रोज़ का तोहफ़ा इंतज़ार कर रहा है, साथ में ${b}`,boosts:{3:'दोगुना XP',5:'दोगुनी फसल',7:'दोगुनी कमाई'},
  pushStreak:n=>`अपना ${n} दिन का सिलसिला बनाए रखने के लिए तोहफ़ा लें`,
  readyBoth:'आपकी फसलें और सामान तैयार हैं',readyCrops:'आपकी फसलें कटाई के लिए तैयार हैं',readyGoods:'आपका सामान लेने के लिए तैयार है'
 },
 ja:{
  hi:n=>`${n}さん、こんにちは！`,waiting:'農場であなたを待っているものがあります：',button:'農場を開く',openText:'農場を開く',
  footer:'設定で毎日のまとめをオンにしているため、このメールをお送りしています。1日1回、何かが待っているときだけ届きます。',
  footerShort:'設定で毎日のまとめをオンにしているため、このメールをお送りしています。',unsubscribe:'配信停止',
  subjectCrops:n=>`農場があなたを待っています：作物${n}個が収穫できます`,subjectJobs:n=>`農場があなたを待っています：生産${n}件が完了`,
  gift:'デイリーギフトが届いています',giftStreak:n=>`デイリーギフトが届いています：${n}日の連続記録を続けましょう`,
  cropsLine:(n,list)=>`収穫できる作物：${n}個${list?`（${list}）`:''}`,
  jobsOne:(b,n)=>`${b}：生産${n}件が完了`,jobsMany:(n,list)=>`生産${n}件が完了（${list}）`,
  item:(n,name)=>`${name}×${n}`,listSep:'、',jobSep:'、',
  pushGift:b=>`デイリーギフトが届いています（${b}付き）`,boosts:{3:'XP 2倍',5:'収穫2倍',7:'稼ぎ2倍'},
  pushStreak:n=>`ギフトを受け取って${n}日の連続記録を守りましょう`,
  readyBoth:'作物と商品の準備ができました',readyCrops:'作物が収穫できます',readyGoods:'商品を受け取れます'
 },
 ar:{
  hi:n=>`مرحبًا ${n}!`,waiting:'هناك شيء ينتظرك في مزرعتك:',button:'افتح مزرعتي',openText:'افتح مزرعتك',
  footer:'تصلك هذه الرسالة لأنك فعّلت الملخص اليومي في الإعدادات. تُرسل مرة واحدة في اليوم، وفقط عندما يكون هناك شيء ينتظرك.',
  footerShort:'تصلك هذه الرسالة لأنك فعّلت الملخص اليومي في الإعدادات.',unsubscribe:'إلغاء الاشتراك',
  subjectCrops:n=>`مزرعتك تحتاجك: ${n} ${forms('ar',n,{zero:'محاصيل جاهزة',one:'محصول جاهز',two:'محصولان جاهزان',few:'محاصيل جاهزة',many:'محصولًا جاهزًا',other:'محصول جاهز'})}`,
  subjectJobs:n=>`مزرعتك تحتاجك: ${n} ${forms('ar',n,{zero:'دفعات جاهزة',one:'دفعة جاهزة',two:'دفعتان جاهزتان',few:'دفعات جاهزة',many:'دفعةً جاهزةً',other:'دفعة جاهزة'})}`,
  gift:'هديتك اليومية بانتظارك',giftStreak:n=>`هديتك اليومية بانتظارك: حافظ على سلسلتك (${n} ${forms('ar',n,{zero:'أيام',one:'يوم',two:'يومان',few:'أيام',many:'يومًا',other:'يوم'})})`,
  cropsLine:(n,list)=>`جاهزة للحصاد: ${n} ${forms('ar',n,{zero:'محاصيل',one:'محصول',two:'محصولان',few:'محاصيل',many:'محصولًا',other:'محصول'})}${list?` (${list})`:''}`,
  jobsOne:(b,n)=>`${b}: ${n} ${forms('ar',n,{zero:'دفعات جاهزة',one:'دفعة جاهزة',two:'دفعتان جاهزتان',few:'دفعات جاهزة',many:'دفعةً جاهزةً',other:'دفعة جاهزة'})}`,
  jobsMany:(n,list)=>`${n} ${forms('ar',n,{zero:'دفعات جاهزة',one:'دفعة جاهزة',two:'دفعتان جاهزتان',few:'دفعات جاهزة',many:'دفعةً جاهزةً',other:'دفعة جاهزة'})} (${list})`,
  pushGift:b=>`هديتك اليومية بانتظارك، ومعها ${b}`,boosts:{3:'خبرة مضاعفة',5:'حصاد مضاعف',7:'أرباح مضاعفة'},
  pushStreak:n=>`اجمع هديتك لتحافظ على سلسلتك (${n} ${forms('ar',n,{zero:'أيام',one:'يوم',two:'يومان',few:'أيام',many:'يومًا',other:'يوم'})})`,
  readyBoth:'محاصيلك ومنتجاتك جاهزة',readyCrops:'محاصيلك جاهزة للحصاد',readyGoods:'منتجاتك جاهزة للجمع'
 },
 zh:{
  hi:n=>`${n}，你好！`,waiting:'你的农场有东西在等你：',button:'打开我的农场',openText:'打开你的农场',
  footer:'你收到这封邮件，是因为你在设置中开启了每日摘要。每天最多发送一次，并且只在有东西等你时发送。',
  footerShort:'你收到这封邮件，是因为你在设置中开启了每日摘要。',unsubscribe:'退订',
  subjectCrops:n=>`你的农场需要你：${n} 种作物已成熟`,subjectJobs:n=>`你的农场需要你：${n} 个批次已完成`,
  gift:'你的每日礼物在等你',giftStreak:n=>`你的每日礼物在等你：保持你的 ${n} 天连续签到`,
  cropsLine:(n,list)=>`${n} 种作物可以收获${list?`：${list}`:''}`,
  jobsOne:(b,n)=>`${b}：${n} 个批次已完成`,jobsMany:(n,list)=>`${n} 个批次已完成（${list}）`,
  pushGift:b=>`你的每日礼物在等你，还有${b}`,boosts:{3:'双倍经验',5:'双倍收获',7:'双倍收益'},
  pushStreak:n=>`领取礼物以保持你的 ${n} 天连续签到`,
  readyBoth:'你的作物和商品已经准备好了',readyCrops:'你的作物可以收获了',readyGoods:'你的商品可以领取了'
 }
};
export const MAIL_LANGUAGES=Object.freeze(Object.keys(TEXTS));
// Languages that read from right to left: their emails run right to left (dir="rtl").
export const RTL_MAIL=Object.freeze(['ar']);
// Every language but English writes a crop as "Name ×3": no plural or case ending to get wrong in a list.
export function textsFor(language){
 const t=TEXTS[language]??TEXTS.en;
 return {item:(n,name)=>`${name} ×${n}`,listSep:', ',jobSep:', ',...t,language:TEXTS[language]?language:'en'};
}
