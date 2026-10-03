# Translations

The game is written in English. `public/i18n.js` translates what is on screen for a farmer who plays in another
language, from `public/i18n/<code>.json` (`{"English text": "translation"}`). English farmers load nothing.

- `i18n/catalog.json`: every English text a player can see, made by `node scripts/i18n-extract.mjs`. Run it after
  changing or adding texts; `tests/i18n.test.mjs` fails when the catalog is out of date.
- `i18n/ignore.json`: texts the extractor finds that are never shown to a player.
- `node scripts/i18n.mjs status`: how far every language is.
- `node scripts/i18n.mjs next <code> 300`: the next texts to translate, as `id|English` lines.
- `node scripts/i18n.mjs apply <code> <file>`: add translations written as `id|translation` lines. A translation keeps
  every `{0}`, `{1}`, ... of the English text (the parts that change: numbers, names). Where a language needs more
  forms for a number: `id|{"one":"...","few":"...","many":"...","other":"..."}`.
- A language only appears in the game (`ready: true` in `public/languages.js`, and in `READY` in
  `public/i18n-boot.js`) when every text in the catalog is translated.
- Every ready language has its own sign-in page (`/es/`, `/fr/`, ...; English is `/`), written at deploy time by
  `scripts/build-languages.mjs` from `public/play.html` and these translations, including the search and share texts in
  its head. Only exact translations are used: a `play.html` text without one stops the deploy build, so translate new
  `play.html` texts before deploying. A newly ready language also needs its code in the five `/:lang(...)` rules in
  `vercel.json` (a test checks them). Opening a language page saves its language on the device, so the farm and the
  sign-in return (`/play.html`) follow it; where a browser keeps nothing (blocked storage) only the page itself is in its
  language and the farm uses the device's language. On a language page a text that is already a translation is left
  as it is, so no English text may also be the translation of another text (a test checks it).
- The help and support page is built the same way (3 Oct 2026): `/support` is `public/support.html` in English and
  `/es/support`, `/fr/support`, ... are written at deploy time from it and these translations (its texts are in the catalog
  like the sign-in page's). It has no script, so nothing is translated in the browser: a missing translation of a
  `support.html` text stops the deploy build too. Its links to the sign-in page go to the page in the same language; the
  wiki and the legal pages stay English.

Texts that are cut by markup arrive in pieces (`Beginner guide complete! +` … `XP and {0} diamonds.`): translate each
piece so the pieces still read as one sentence in their order.

What players write themselves (chat, names) sits in `translate="no"` and is never translated. The staff screens stay
English.

## Words (keep them the same everywhere)

| English | Español |
|---|---|
| coins / diamonds / XP | monedas / diamantes / XP |
| field / crop / harvest | campo / cultivo / cosechar, cosecha |
| plant / water / extra care | plantar / regar / cuidado extra |
| batch / slot / goods | lote / hueco / productos |
| building / upgrade / level | edificio / mejora, mejorar / nivel |
| Market / Buildings / Quests / More / My farm | Mercado / Edificios / Misiones / Más / Mi granja |
| Farm Family / Family Chest / Family Order | Familia Granjera / Cofre Familiar / Pedido Familiar |
| leader / co-leader | líder / colíder |
| boost / streak / daily gift | potenciador / racha / regalo diario |
| chore / helping hand | tarea / echar una mano |
| Estate / Valley / Valley Market | Finca / Valle / Mercado del Valle |
| farm stall / storage | puesto de la granja / almacén |
| fertilizer (natural) / animal feed | abono (natural) / pienso |
| heirloom / test bed / Seed Lab | variedad antigua / bancal de pruebas / Laboratorio de semillas |
| Settings | Ajustes |
| Wheat, Corn, Barley, Lettuce, Cabbage, Cauliflower, Pumpkin, Red cabbage, Sunflower | Trigo, Maíz, Cebada, Lechuga, Col, Coliflor, Calabaza, Lombarda, Girasol |
| Apples, Berries, Green beans, Squash, Pole beans, Cider apples, Cherries, Truffles | Manzanas, Bayas, Judías verdes, Calabacín, Judías de enrame, Manzanas de sidra, Cerezas, Trufas |
| Windmill, Feed Mill, Dairy, Chicken Coop, Bakery, Kitchen, Juice Press, Factory | Molino de viento, Molino de piensos, Lechería, Gallinero, Panadería, Cocina, Prensa de zumos, Fábrica |
| Bee Yard, Sheep Barn, Glasshouse, Weaving Shed, Goat Shed, Craft Workshop, The Ranch, Pig Farm | Colmenar, Redil, Invernadero, Taller de tejido, Establo de cabras, Taller artesano, El Rancho, Granja de cerdos |
| Estate Workshop, Trade Depot, Grand Valley Fair, Family Hall | Taller de la finca, Depósito comercial, Gran Feria del Valle, Casa Familiar |

Informal "tú" throughout.

### Deutsch (informal "du")

coins Münzen · diamonds Diamanten · field Feld · crop Feldfrucht (growing: Pflanze) · harvest ernten/Ernte · water gießen ·
extra care Extrapflege · batch Charge · slot Platz · goods Waren · upgrade Ausbau/ausbauen · level Level · Market Markt ·
Quests Aufgaben · More Mehr · My farm Mein Hof · Farm Family Farmfamilie · Family Chest Familientruhe · Family Order
Familienauftrag · leader/co-leader Anführer/Co-Anführer · boost Booster · streak Serie · daily gift Tagesgeschenk ·
chore Hofarbeit · helping hand Mit anpacken · Estate Gut · Valley Tal · Valley Market Talmarkt · farm stall Hofladen ·
storage Lager · (natural) fertilizer (Natur)dünger · animal feed Tierfutter · heirloom alte Sorte · test bed Versuchsbeet ·
Seed Lab Saatgutlabor · Glasshouse Gewächshaus · Greenhouse (activity) Frühbeet · Grand Valley Fair Große Talmesse ·
Family Hall Familienhaus · Farmhouse Bauernhaus · Dairy Barn Kuhstall · Feed Mill Futtermühle · Squash Zucchini ·
Pole beans Stangenbohnen · Cider apples Mostäpfel · Cider Cidre.

### हिन्दी (polite "आप", Western digits)

coins सिक्के · diamonds हीरे · field खेत · crop फसल · harvest कटाई/काटें · plant बोएँ/बुआई · water पानी दें ·
extra care खास देखभाल · batch बैच · slot स्लॉट · goods सामान · building इमारत · upgrade अपग्रेड · level लेवल ·
Market बाज़ार · Quests मिशन · More और · My farm मेरा फ़ार्म · Farm Family फ़ार्म परिवार · Family Chest परिवार संदूक ·
Family Order परिवार ऑर्डर · leader/co-leader मुखिया/सह-मुखिया · boost बूस्ट · streak सिलसिला · daily gift रोज़ का तोहफ़ा ·
chore काम · helping hand मदद का हाथ · Estate जागीर · Valley घाटी · Valley Market घाटी बाज़ार · farm stall फ़ार्म स्टॉल ·
storage भंडार · natural fertilizer जैविक खाद · animal feed पशु आहार · heirloom पुरानी किस्म · test bed परीक्षण क्यारी ·
Seed Lab बीज प्रयोगशाला · Glasshouse ग्लासहाउस · Greenhouse (activity) नर्सरी · Grand Valley Fair घाटी का बड़ा मेला ·
grand champion महाविजेता · visitor मेहमान · Windmill पवनचक्की · Dairy Barn गौशाला · Squash तोरी · Pole beans सेम ·
cheese चीज़ · goat cheese बकरी का पनीर · journal फ़ार्म डायरी · Trade Depot व्यापार डिपो · Silo research साइलो शोध.

### Nederlands (informal "je")

coins munten · diamonds diamanten · field veld · crop gewas · harvest oogsten/oogst · plant planten · water water geven ·
extra care extra verzorging · batch batch · slot plek · goods producten · building gebouw · upgrade upgrade/upgraden ·
level level · Market Markt · Quests Opdrachten · More Meer · My farm Boerderij (fits the tab bar) · Farm Family Boerenfamilie ·
Family Chest Familiekist · Family Order Familiebestelling · order bestelling · leader/co-leader leider/co-leider ·
honorary erelid · boost boost · streak reeks · daily gift dagcadeau · chore klusje · helping hand helpende hand ·
Estate Landgoed · Valley Vallei · Valley Market Valleimarkt · farm stall boerderijkraam · storage opslag ·
natural fertilizer natuurlijke mest · animal feed veevoer · heirloom oud ras · test bed proefbed · Seed Lab Zadenlab ·
Glasshouse Kas · Greenhouse (stop) Broeibak · Grand Valley Fair Grote Valleifair · fair star fairster · ribbon lint ·
grand champion grote kampioen · Farmhouse Woonboerderij · Dairy Barn Koeienstal · Feed Mill Voermolen ·
Juice Press Sappers · Preserves Workshop Inmaakkeuken · Tool workshop Gereedschapsschuur · Apiary Bijenkorven ·
Animal paddock Dierenweide · Squash courgette · Pole beans stokbonen · Green beans sperziebonen · journal boerderijdagboek ·
leaderboard ranglijst · farm events boerderijevenementen. Building names go without "de/het" before a `{0}`.

### Français (informal "tu", French spacing)

No-break spaces before ! ? ; : % and inside « » (the batch files go through a small fix script before `apply`).
coins pièces · diamonds diamants · field champ · crop culture · harvest récolter/récolte · plant planter · water arroser ·
extra care soins bonus · batch lot · slot emplacement · goods produits · building bâtiment · upgrade amélioration/améliorer ·
level niveau · Market Marché · Quests Quêtes · More Plus · My farm Ma ferme · Farm Family Famille fermière ·
Family Chest Coffre familial · Family Order Commande familiale · order commande · leader/co-leader chef/co-chef ·
honorary membre d'honneur · streak série · daily gift cadeau du jour · chore corvée · helping hand coup de main ·
Estate Domaine · Valley Market Marché de la vallée · farm stall stand de la ferme · storage réserve ·
natural fertilizer engrais naturel · animal feed nourriture animale · heirloom variété ancienne · test bed planche d'essai ·
Seed Lab Labo des graines · Glasshouse Serre · Greenhouse (stop) Pépinière · Grand Valley Fair Grande Foire de la vallée ·
fair star étoile de foire · Farmhouse Corps de ferme · Dairy Barn Étable · Feed Mill Moulin à provende · Juice Press Pressoir ·
Preserves Workshop Atelier des conserves · Tool workshop Remise à outils · Apiary Ruches · Animal paddock Enclos ·
Squash courgette · Pumpkin citrouille · Pole beans haricots à rames · journal journal de la ferme · leaderboard classement.

### Português (Brazilian, informal "você")

Brazilian Portuguese: far more players reach the game through Meta from Brazil than from Portugal.
coins moedas · diamonds diamantes · field campo · crop cultivo · harvest colher/colheita · plant plantar · water regar ·
extra care cuidado extra · batch lote · slot vaga · goods produtos · building construção · upgrade melhoria/melhorar ·
level nível · Market Mercado · Quests Missões · More Mais · My farm Fazenda (fits the tab bar) · Farm Family Família da Fazenda ·
Family Chest Baú da Família · Family Order Pedido da Família · order pedido · leader/co-leader líder/vice-líder ·
rank posto · honorary honorário · streak sequência · daily gift presente diário · chore tarefa · helping hand mão amiga ·
Estate Propriedade · Valley Market Mercado do Vale · farm stall barraca da fazenda · storage estoque ·
natural fertilizer adubo natural · animal feed ração · heirloom variedade crioula · test bed canteiro de teste ·
Seed Lab Laboratório de Sementes · Glasshouse Estufa · Greenhouse (stop) Viveiro · Grand Valley Fair Grande Feira do Vale ·
Farmhouse Sede · Dairy Barn Estábulo · Feed Mill Moinho de Ração · Juice Press Prensa de Sucos · Sheep Barn Celeiro das Ovelhas ·
Goat Shed Capril · Pig Farm Chiqueiro · Preserves Workshop Oficina de Conservas · Tool workshop Galpão de Ferramentas ·
Apiary Colmeias · Bee Yard Apiário · Animal paddock Cercado · Squash abobrinha · Berries frutas vermelhas · Green beans vagens ·
Pole beans feijão-trepador · leaderboard ranking.

### Bahasa Indonesia (informal "kamu"/"-mu", no plurals)

Indonesian has no plural: "{0} diamond" and "{0} diamonds" read the same. Thousands with a dot, decimals with a comma (1.000, 1,6×).
Time units: j (jam), mnt/m (menit), d (detik). Common game loanwords stay: boost, batch, upgrade, event, level, XP, VIP, chat.
coins koin · diamonds berlian · field ladang · crop tanaman · harvest panen · plant tanam · water siram · care rawat ·
goods barang · building bangunan · Market Pasar · Quests Misi · More Lainnya · My farm Kebunku · Farm Family Keluarga Kebun ·
Family Chest Peti Keluarga · Family Order Pesanan Keluarga · leader/co-leader ketua/wakil ketua · honorary kehormatan ·
qualify lolos · streak beruntun · daily gift hadiah harian · chore tugas · helping hand bantuan · Estate Perkebunan ·
Valley Market Pasar Lembah · farm stall kios kebun · storage gudang · natural fertilizer pupuk alami · animal feed pakan ternak ·
heirloom varietas pusaka · test bed bedeng uji · Seed Lab Lab Benih · Glasshouse Rumah Kaca · Greenhouse (stop) Persemaian ·
Grand Valley Fair Pekan Raya Lembah · fair pekan raya · Farmhouse Rumah Kebun · Dairy Barn Kandang Sapi ·
Feed Mill Penggilingan Pakan · Juice Press Pemeras Jus · Preserves Workshop Bengkel Awetan · Tool workshop Gudang Perkakas ·
Apiary Sarang Lebah · Bee Yard Peternakan Lebah · Animal paddock Padang Ternak · Squash zukini · rush order pesanan kilat ·
visitor tamu · Starter Pack Paket Pemula · leaderboard papan peringkat.

### 日本語 (polite です/ます in sentences, short noun or verb forms on buttons)

No plurals and no spaces between words; counters follow the number (3個, 2枚 for fields, 5件 for batches and orders, 2人 for
people). Full-width punctuation in sentences (。、！？：（）), keep " · " between list parts. Thousands with a comma (1,000).
Fragments around a name or number are written so the sentence still reads in Japanese order ("今いるのは" + Facebook + "の中です。").
coins コイン · diamonds ダイヤ · field 畑 · crop 作物 · harvest 収穫 · plant 植える · water 水やり · care 手入れ ·
batch 生産 (件) · slot 枠 · goods 商品 (processed goods 加工品) · building 建物 · upgrade 強化 · level レベル (Lv) ·
Market 市場 · Quests クエスト · More その他 · My farm 農場 · Farm Family 農場ファミリー · Family Chest ファミリー宝箱 ·
Family Order ファミリー注文 · Family Hall ファミリーホール · tournament 大会 · leader/co-leader リーダー/サブリーダー ·
honorary 名誉メンバー · qualify 条件達成 · streak 連続記録 · daily gift デイリーギフト · chore 農作業 ·
helping hand お手伝い (stops 場所, round 農場めぐり) · Estate 大農園 · Valley 谷 · Valley Market 谷の市場 ·
farm stall 直売所 · storage 倉庫 · natural fertilizer 天然肥料 · animal feed 飼料 · heirloom 在来種 · test bed 試験区画 ·
Seed Lab 種子研究所 · Glasshouse ガラスハウス · Greenhouse (stop) 温室 · Apiary 養蜂箱 · Bee Yard 養蜂場 ·
Animal paddock 放牧場 · Tool workshop 道具小屋 · Grand Valley Fair 谷の大品評会 · fair star 品評会スター ·
Farmhouse 母屋 · Dairy Barn 牛舎 · Feed Mill 飼料工場 · Windmill 風車 · Juice Press ジュース工房 ·
Preserves Workshop 保存食工房 · Trade Depot 交易所 · The Ranch 牧場 · herd 家畜 · visitor 来客 · customer お客さん ·
rush order 急ぎの注文 · delivery order 配達注文 · Squash ズッキーニ · Green beans さやいんげん · Pole beans つるインゲン ·
Cherries さくらんぼ · specialist 名人 · Starter Pack スターターパック · leaderboard ランキング · report 通報.

### Türkçe (informal "sen")

No plural after a number ("5 elmas"). Percent before the number (%10, +%{0}), thousands with a dot, decimals with a comma (1.000,
1,6×). A suffix never goes on a placeholder, because it depends on how the value sounds: write "Tarla {1}: {0} hasat et",
"Önce şunu aç: {0}", "{0}. seviye" (ordinal) instead. Loose parts around a name or number keep Turkish word order with a colon
("Oyunu şurada aç:" + browser).
coins altın · diamonds elmas · field tarla · crop mahsul · goods ürün · harvest hasat · plant ek · water sula · care bakım ·
fertilize gübrele · batch parti · slot yuva · building bina · upgrade yükselt · level seviye (Sv) · rank rütbe ·
Market Pazar · Quests Görevler · More Daha fazla · My farm Çiftliğim · boost güçlendirici · streak seri · daily gift günlük hediye ·
daily challenge günlük meydan okuma · qualify hak kazan · Farm Family Çiftlik Ailesi · Family Chest Aile Sandığı ·
Family Order Aile Siparişi · Family Hall Aile Salonu · leader/co-leader lider/yardımcı lider · honorary onursal üye ·
tournament turnuva · chore çiftlik işi · helping hand yardım (stop durak, round tur) · Estate Malikâne · Valley Vadi ·
Valley Market Vadi Pazarı · farm stall çiftlik tezgâhı · storage depo · natural fertilizer doğal gübre · animal feed hayvan yemi ·
heirloom ata tohumu · test bed deneme tarhı · Seed Lab Tohum Laboratuvarı · Glasshouse Cam Sera · Greenhouse (stop) Sera ·
Apiary Arılık · Bee Yard Arı Bahçesi · Animal paddock Hayvan Ağılı · Tool workshop Alet Atölyesi · The Ranch Hayvan Çiftliği ·
herd sürü · Grand Valley Fair Büyük Vadi Fuarı · fair star fuar yıldızı · Farmhouse Çiftlik Evi · Dairy Barn Süt Ahırı ·
Windmill Yel Değirmeni · Feed Mill Yem Değirmeni · Juice Press Meyve Suyu Presi · Preserves Workshop Konserve Atölyesi ·
Trade Depot Ticaret Deposu · trailer römork · visitor ziyaretçi · customer müşteri · rush order acil sipariş ·
delivery order teslimat siparişi · Berries orman meyvesi · Squash kabak · Pumpkin bal kabağı · Cider sider ·
specialist uzmanı · Starter Pack Başlangıç Paketi · leaderboard sıralama · report bildir.

### Čeština (informal "ty", plural forms)

Counts that change the noun use plural objects (`one` 1, `few` 2–4, `many` decimals, `other` 0 and 5+), like Russian; the
runtime picks the form from the first number. No-break space before % and inside thousands (10 %, 1 000); decimals with a
comma. Uncountable goods are counted with "ks" (kusů) plus the genitive ("12 ks pšenice", "Vyzvedni 20 ks včelího vosku").
To avoid declining a placeholder, put it after a colon ("Otevři: {0}", "Pole {1}: sklidit {0}"). Farm log lines use
passive participles, so they need no gender ("Postaveno: {0}", "Koupeno VIP").
coins mince (mincí) · diamonds diamanty (diamantů) · field pole (polí) · crop plodina · goods výrobky/zboží · harvest sklizeň/sklidit ·
plant sázet/zasadit · water zalít · care péče · fertilize pohnojit · batch várka · slot místo · building budova ·
upgrade vylepšit/vylepšení · level úroveň (Úr.) · rank hodnost · Market Trh · Quests Úkoly · More Více · My farm Moje farma ·
boost boost · streak série · daily gift denní dárek · daily challenge denní výzva · qualify splnit podmínky ·
Farm Family Farmářská rodina · Family Chest Rodinná truhla · Family Order Rodinná objednávka · Family Hall Rodinný sál ·
leader/co-leader vedoucí/zástupce · honorary čestný člen · tournament turnaj · chore farmářská práce ·
helping hand pomocná ruka (stop zastávka, round kolo) · Estate Panství · Valley Údolí · Valley Market Trh v údolí ·
farm stall farmářský stánek · storage sklad · natural fertilizer přírodní hnojivo · animal feed krmivo · heirloom stará odrůda ·
test bed zkušební záhon · Seed Lab Semenářská laboratoř · Glasshouse Skleník · Greenhouse (stop) Pařeniště · Apiary Úly ·
Bee Yard Včelín · Animal paddock Výběh · Tool workshop Dílna na nářadí · The Ranch Ranč · herd stádo ·
Grand Valley Fair Velký údolní jarmark · fair star hvězda jarmarku · Farmhouse Statek · Dairy Barn Kravín · Windmill Větrný mlýn ·
Feed Mill Mlýn na krmivo · Juice Press Lisovna · Preserves Workshop Zavařovna · Trade Depot Obchodní sklad · trailer přívěs ·
visitor návštěvník · customer zákazník · rush order spěšná objednávka · delivery order objednávka k doručení · Berries bobule ·
Squash cuketa · Pumpkin dýně · Cider cidr · specialist specialista na … · Starter Pack Startovní balíček · leaderboard žebříček ·
report nahlásit.

### Українська (informal "ти", plural forms)

Written from the English, not from the Russian: no russicisms. Counts that change the noun use plural objects (`one`,
`few` 2–4, `many` 5+, `other` fractions); the runtime picks the form from the first number. Thousands with a no-break space
(1 000), percent without a space (10%), decimals with a comma. Uncountable goods are counted with "од." plus the genitive
("12 од. пшениці"). Placeholders stand after a colon or in «quotes» so they need no case ending ("Відкрити: {0}"). Farm log
lines are impersonal past forms ("Збудовано: {0}", "Куплено VIP").
coins монети (монет) · diamonds діаманти (діамантів) · field поле (полів) · crop культура · goods вироби/товари · harvest збирати/зібрати ·
plant посадити · water полити · care догляд/доглянути · fertilize удобрити · batch партія · slot місце · building будівля ·
upgrade покращити/покращення · level рівень (Рів.) · rank ранг · Market Ринок · Quests Завдання · More Ще · My farm Моя ферма ·
boost бустер · streak серія · daily gift щоденний подарунок · daily challenge щоденне випробування · qualify виконати умови ·
Farm Family Фермерська родина · Family Chest Родинна скриня · Family Order Родинне замовлення · Family Hall Родинна зала ·
leader/co-leader голова/заступник · honorary почесний член · tournament турнір · chore господарська справа ·
helping hand допомога (stop зупинка, round коло) · Estate Маєток · Valley Долина · Valley Market Ринок долини ·
farm stall фермерський прилавок · storage склад · natural fertilizer природне добриво · animal feed корм ·
heirloom старовинний сорт · test bed дослідна грядка · Seed Lab Насіннєва лабораторія · Glasshouse Оранжерея ·
Greenhouse (stop) Теплиця · Apiary Вулики · Bee Yard Пасіка · Animal paddock Загін · Tool workshop Сарай з інструментами ·
The Ranch Ранчо · herd стадо · Grand Valley Fair Великий ярмарок долини · fair star зірка ярмарку · Farmhouse Садиба ·
Dairy Barn Корівник · Windmill Вітряк · Feed Mill Кормовий млин · Juice Press Соковарня · Preserves Workshop Консервна майстерня ·
Trade Depot Торговий склад · trailer причіп · visitor відвідувач · customer покупець · rush order термінове замовлення ·
delivery order замовлення на доставку · Cherries черешні · Squash кабачок · Pumpkin гарбуз · specialist фахівець з … ·
Starter Pack Стартовий набір · leaderboard рейтинг · report поскаржитися.

### Magyar (informal "te", no plurals after a number)

A number takes the singular ("5 gyémánt", "Takaríts be 12 búzát"). No suffix on a placeholder, because it depends on how the
value sounds: put it after a colon ("Nyisd meg: {0}", "{1}. mező: {0} betakarítása"), use "{0}. szint" for levels and "a(z)"
before a number or name. Percent without a space and with its suffix on the literal ("10%-kal", "60%-át"); thousands with a
no-break space (1 000 000), four digits without (2000); decimals with a comma (1,5×). Farm log lines are impersonal participles
("Megépítve: {0}", "VIP megvásárolva"). "Medal" is medál, never érem: it looks too much like érme (coin).
coins érme · diamonds gyémánt · field mező · crop termény · goods termék · harvest betakarítás/betakarít · plant ültet ·
water öntöz · care gondozás · fertilize trágyáz · batch adag · slot hely · building épület · upgrade fejlesztés/fejleszt ·
level szint (Sz.) · rank rang · Market Piac · Buildings Épületek · Quests Küldetések · More Több · My farm Farmom ·
boost gyorsító · streak sorozat · daily gift napi ajándék · daily challenge napi kihívás · qualify kvalifikálja magát ·
Farm Family Farmcsalád · Family Chest Családi láda · Family Order Családi rendelés · Family Hall Családi csarnok ·
leader/co-leader vezető/helyettes vezető · honorary tiszteletbeli tag · tournament verseny · chore farmmunka ·
helping hand segítő kéz (stop állomás, round kör, hands-on job kézi munka) · Estate Birtok · Valley Völgy ·
Valley Market Völgyi piac · farm stall farmstand · storage raktár · natural fertilizer természetes trágya · animal feed takarmány ·
heirloom régi fajta · test bed kísérleti ágyás · Seed Lab Vetőmaglabor · mastery mesterfok (crop master terménymester,
medal medál) · improvement beruházás · Glasshouse Üvegház · Greenhouse (stop) Melegágy · Apiary Méhes · Bee Yard Méhészet ·
Animal paddock Karám · Tool workshop Szerszámműhely · The Ranch A Ranch · herd állomány · Grand Valley Fair Nagy völgyi vásár ·
fair star vásárcsillag · class kategória · ribbon szalag · grand champion nagy bajnok · Farmhouse Tanyaház ·
Dairy Barn Tehénistálló · Dairy Tejüzem · Windmill Szélmalom · Feed Mill Takarmánymalom · Juice Press Gyümölcsprés ·
Preserves Workshop Befőzőműhely · Packing Shed Csomagolószín · Sheep Barn Juhhodály · Goat Shed Kecskeól ·
Weaving Shed Szövőműhely · Pig Farm Sertéstelep · Trade Depot Kereskedelmi raktár · trailer utánfutó · visitor látogató ·
customer vevő · rush order sürgős rendelés · delivery order szállítási rendelés · Squash cukkini · Pumpkin sütőtök ·
Cider cider · Cider apples cideralma · Berries bogyók · specialist …-specialista · Starter Pack Kezdőcsomag ·
leaderboard ranglista · report jelentés.

### Русский (informal "ты", three plural forms)

Counts use plural objects (`one`/`few`/`many`/`other`); the runtime picks the form from the first number in the text.
Thousands with a no-break space (1 000). coins монеты · diamonds алмазы · field поле · crop культура · harvest собрать урожай ·
plant посадить · water полить/полив · extra care особый уход · batch партия · slot место · goods товары · building здание ·
upgrade улучшить/улучшение · level уровень · Market Рынок · Quests Задания · More Ещё · My farm Моя ферма ·
Farm Family Фермерская семья · Family Chest Семейный сундук · Family Order Семейный заказ · leader/co-leader глава/заместитель ·
honorary почётный член · boost бустер · streak серия · daily gift ежедневный подарок · chore дело по хозяйству ·
helping hand помощь · Estate Поместье · Valley Market Рынок долины · farm stall фермерский прилавок · storage склад ·
natural fertilizer натуральное удобрение · animal feed корм · heirloom старинный сорт · test bed опытная грядка ·
Seed Lab Семенная лаборатория · Glasshouse Оранжерея · Greenhouse (stop) Теплица · Grand Valley Fair Большая ярмарка долины ·
Farmhouse Фермерский дом · Dairy Barn Коровник · Feed Mill Кормовая мельница · Juice Press Соковарня · Bee Yard Пасека ·
Apiary Ульи · Animal paddock Загон · Tool workshop Сарай с инструментами · Squash кабачок · leaderboard рейтинг.

### العربية (Arabic: right to left, Modern Standard Arabic, the player as "أنت" in the masculine, Western digits)

The page runs right to left (public/languages.js `rtl`); numbers with a sign, slash or percent are held in order by the game
(public/i18n.js isolateNumbers), so write them as English does ("{0} / {1}", "+{0}"). Counts that change the noun use the six
forms: `{"zero":…,"one":…,"two":…,"few":…,"many":…,"other":…}`.

coins عملات · diamonds ألماس · XP XP · field حقل · crop محصول · harvest احصد/حصاد · plant ازرع/زراعة · water اسقِ/سقي ·
extra care عناية إضافية · Care عناية · batch دفعة · slot خانة · goods منتجات · building مبنى · upgrade ترقية/رقِّ ·
level المستوى · Market السوق · Buildings المباني · Quests المهام · More المزيد · My farm مزرعتي · Settings الإعدادات ·
Farm Family عائلة المزرعة · Family Chest صندوق العائلة · Family Order طلبية العائلة · Family Tournament بطولة العائلات ·
leader/co-leader القائد/نائب القائد · honorary عضو شرفي · boost معزِّز · streak سلسلة · daily gift الهدية اليومية ·
Daily rewards المكافآت اليومية · chore عمل في المزرعة (Farm chores أعمال المزرعة) · helping hand يد العون · Estate الضيعة ·
Valley الوادي · Valley Market سوق الوادي · farm stall كشك المزرعة · storage المخزن · natural fertilizer سماد طبيعي ·
animal feed علف · heirloom صنف أصيل · test bed حوض تجارب · Seed Lab مختبر البذور · Glasshouse البيت الزجاجي ·
Greenhouse (activity) المشتل · Grand Valley Fair معرض الوادي الكبير · visitor زائر · journal دفتر المزرعة · VIP VIP.
Wheat قمح · Corn ذرة · Barley شعير · Lettuce خس · Cabbage ملفوف · Cauliflower قرنبيط · Pumpkin يقطين · Red cabbage ملفوف أحمر ·
Sunflower دوار الشمس · Apples تفاح · Berries توت · Green beans فاصوليا خضراء · Squash كوسا · Pole beans فاصوليا متسلقة ·
Cider apples تفاح العصير · Cherries كرز. Farmhouse بيت المزرعة · Chicken Coop قن الدجاج · Feed Mill مطحنة العلف ·
Dairy Barn حظيرة الألبان · Windmill طاحونة الهواء · Bakery المخبز · Farm Kitchen مطبخ المزرعة · Juice Press معصرة العصير ·
Factory المصنع · Family Hall قاعة العائلة · Packing Shed سقيفة التعبئة · Bee Yard المنحل · Sheep Barn حظيرة الأغنام ·
Pig Farm مزرعة الخنازير · Goat Shed حظيرة الماعز · Weaving Shed ورشة النسيج · Craft Workshop ورشة الحرف · The Ranch المرعى ·
Estate Workshop ورشة الضيعة · Trade Depot مستودع التجارة · Silo research أبحاث الصومعة · Tractor الجرار.

### 简体中文 (Simplified Chinese: the player as "你", Western digits, full-width punctuation ，。：！？（）)

coins 金币 · diamonds 钻石 · XP XP · field 田地 · crop 作物 · harvest 收获 · plant 种植 · water 浇水 · extra care 额外照料 ·
Care 照料 · batch 批次 · slot 槽位 · goods 商品 · building 建筑 · upgrade 升级 · level 等级 · Market 市场 · Buildings 建筑 ·
Quests 任务 · More 更多 · My farm 我的农场 · Settings 设置 · Farm Family 农场家族 · Family Chest 家族宝箱 ·
Family Order 家族订单 · Family Tournament 家族锦标赛 · leader/co-leader 族长/副族长 · honorary 荣誉成员 · member 成员 ·
boost 加成 · streak 连续签到 · daily gift 每日礼物 · Daily rewards 每日奖励 · chore 农活 (Farm chores 农场杂务) ·
helping hand 帮把手 · Estate 庄园 · Valley 山谷 · Valley Market 山谷市场 · farm stall 农场摊位 · storage 仓库 ·
natural fertilizer 天然肥料 · animal feed 饲料 · heirloom 传家品种 · test bed 试验田 · Seed Lab 种子实验室 ·
Glasshouse 玻璃温室 · Greenhouse (activity) 育苗棚 · Grand Valley Fair 山谷大集市 · visitor 访客 · journal 农场日志 · VIP VIP.
Wheat 小麦 · Corn 玉米 · Barley 大麦 · Lettuce 生菜 · Cabbage 卷心菜 · Cauliflower 花椰菜 · Pumpkin 南瓜 · Red cabbage 紫甘蓝 ·
Sunflower 向日葵 · Apples 苹果 · Berries 浆果 · Green beans 四季豆 · Squash 西葫芦 · Pole beans 架豆 · Cider apples 酒用苹果 ·
Cherries 樱桃. Farmhouse 农舍 · Chicken Coop 鸡舍 · Feed Mill 饲料磨坊 · Dairy Barn 奶牛棚 · Windmill 风车 · Bakery 面包房 ·
Farm Kitchen 农场厨房 · Juice Press 榨汁坊 · Factory 工厂 · Family Hall 家族大厅 · Packing Shed 包装棚 · Bee Yard 养蜂场 ·
Sheep Barn 羊舍 · Pig Farm 养猪场 · Goat Shed 山羊棚 · Weaving Shed 织布坊 · Craft Workshop 手工作坊 · The Ranch 牧场 ·
Preserves Workshop 果酱坊 · Estate Workshop 庄园工坊 · Trade Depot 贸易站 · Silo research 筒仓研究 · Tractor 拖拉机 ·
Mine 矿山 · Lumber Camp 伐木营地 · Smithy 铁匠铺 · Village Windmill 村庄风车.
