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
  `play.html` texts before deploying. A newly ready language also needs its code in the seven `/:lang(...)` rules in
  `vercel.json` (a test checks them). Opening a language page saves its language on the device, so the farm and the
  sign-in return (`/play.html`) follow it; where a browser keeps nothing (blocked storage) only the page itself is in its
  language and the farm uses the device's language. On a language page a text that is already a translation is left
  as it is, so no English text may also be the translation of another text (a test checks it).
- The help and support page is built the same way (3 Oct 2026): `/support` is `public/support.html` in English and
  `/es/support`, `/fr/support`, ... are written at deploy time from it and these translations (its texts are in the catalog
  like the sign-in page's). It has no script, so nothing is translated in the browser: a missing translation of a
  `support.html` text stops the deploy build too. Its links to the sign-in page go to the page in the same language; the
  wiki and the legal pages stay English.
- The app page (`/app`, 4 Oct 2026) is built the same way from `public/app.html` (`/es/app`, ...): a missing translation
  of an `app.html` text stops the deploy build too.
- A picture's alt is a text like any other (9 Oct 2026): Bing's site scan reads an empty alt as a missing one, so every picture
  on the sign-in page has a name, also a small one beside its own text (`aria-hidden="true"`, so a screen reader reads that text
  once), and each name needs its translations (`tests/image-alt.test.mjs`).

Texts that are cut by markup arrive in pieces (`Beginner guide complete! +` … `XP and {0} diamonds.`): translate each
piece so the pieces still read as one sentence in their order. In Japanese and Chinese a piece that ends with 。！？： gets no
space after it (7 Oct 2026, `FULL_STOP` in `public/i18n.js`, the language pages too): the space the English has before a link
or a button is dropped.

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

## World II words (Oct 2026)

The village (World II, levels 100–200) keeps one word per language for each of its places, goods and people: the same in their
names, the quests, the toasts, the villagers' lines and the wiki. "Before" are the words of the first places (the Mine to the market
square), "New" those of levels 110–200. A translation is never an English text of the catalog (`tests/language-pages.test.mjs`), so
the Pier is Anleger in German and Steiger in Dutch. Counts of these goods follow each language's rules above: a colon or ks/ед./од. in
Czech, Russian and Ukrainian, no suffix on a placeholder in Turkish and Hungarian. A landmark's name stands after a colon or in quotes
where its gender would change the sentence ("Dokončeno: {0}!", «{0}»).

- **Čeština** (cs). Before: Village Vesnice · villager vesničan · market square Tržní náměstí · golden brief Zlatá zakázka · village place Místo ve vesnici · Village market Vesnický trh · Mine Důl · Lumber Camp Dřevorubecký tábor · Smithy Kovárna · Village Windmill Vesnický větrný mlýn · packed lunch Svačina na cestu · stone Kámen · log Kláda · plank Prkno · iron ore Železná ruda · iron bar Železný ingot · silver ore Stříbrná ruda · silver bar Stříbrný ingot · ruby Rubín · pickaxe Krumpáč · master tools Mistrovské nářadí · heirloom flour Mouka ze staré odrůdy. New: potatoes Brambory · flax Len · lavender Levandule · saffron Šafrán · clay Hlína · roof tile Střešní taška · linen Plátno · builder’s crate Stavební bedna · lavender soap Levandulové mýdlo · scented sachet Vonný sáček · silver candlestick Stříbrný svícen · ruby ring Rubínový prsten · saffron bun Šafránová buchta · pasty lunch taštičky na cestu · Village Fields Vesnická pole · Miners’ Canteen Hornická jídelna · Potter’s Kiln Hrnčířská pec · Linen Loft Plátenická půda · Soap Maker Mýdlárna · Pier Molo · Jeweller Klenotnictví · town boat Loď do města · cargo náklad · market crate tržní bedna · Market week Tržní týden · landmark Dominanta · Wind pump Větrné čerpadlo · Longhouse Dlouhý dům · Stone quay Kamenné nábřeží · Lookout tower Rozhledna · Great Hall Velký sál · errands pochůzky · the field hand Čeledín · the canteen cook Kuchař z jídelny · the potter Hrnčíř · the weaver Tkadlec · the soap maker Mydlář · the skipper Lodník · the jeweller Klenotník · the village elder Vesnický stařešina.
- **Deutsch** (de). Before: Village Dorf · villager Dorfbewohner · market square Marktplatz · golden brief Goldener Bauauftrag · village place Ort im Dorf · Village market Dorfmarkt · Mine Mine · Lumber Camp Holzfällerlager · Smithy Schmiede · Village Windmill Dorfwindmühle · packed lunch Proviant · stone Stein · log Baumstamm · plank Brett · iron ore Eisenerz · iron bar Eisenbarren · silver ore Silbererz · silver bar Silberbarren · ruby Rubin · pickaxe Spitzhacke · master tools Meisterwerkzeug · heirloom flour Mehl alter Sorte. New: potatoes Kartoffeln · flax Flachs · lavender Lavendel · saffron Safran · clay Ton · roof tile Dachziegel · linen Leinen · builder’s crate Baukiste · lavender soap Lavendelseife · scented sachet Duftsäckchen · silver candlestick Silberleuchter · ruby ring Rubinring · saffron bun Safranbrötchen · pasty lunch Pastetenproviant · Village Fields Dorffelder · Miners’ Canteen Bergmannskantine · Potter’s Kiln Töpferofen · Linen Loft Leinenspeicher · Soap Maker Seifensiederei · Pier Anleger · Jeweller Juwelier · town boat Stadtboot · cargo Fracht · market crate Marktkiste · Market week Marktwoche · landmark Wahrzeichen · Wind pump Windpumpe · Longhouse Langhaus · Stone quay Steinkai · Lookout tower Aussichtsturm · Great Hall Große Halle · errands Besorgungen · the field hand Der Feldarbeiter · the canteen cook Der Kantinenkoch · the potter Der Töpfer · the weaver Der Weber · the soap maker Der Seifensieder · the skipper Der Schiffer · the jeweller Der Juwelier · the village elder Der Dorfälteste.
- **Español** (es). Before: Village Aldea · villager aldeano · market square Plaza del mercado · golden brief Encargo dorado · village place Lugar de la aldea · Village market Mercado de la aldea · Mine Mina · Lumber Camp Campamento maderero · Smithy Herrería · Village Windmill Molino de la aldea · packed lunch Almuerzo para llevar · stone Piedra · log Tronco · plank Tabla · iron ore Mineral de hierro · iron bar Lingote de hierro · silver ore Mineral de plata · silver bar Lingote de plata · ruby Rubí · pickaxe Pico · master tools Herramientas maestras · heirloom flour Harina de variedad antigua. New: potatoes Patatas · flax Lino · lavender Lavanda · saffron Azafrán · clay Arcilla · roof tile Teja · linen Tela de lino · builder’s crate Caja de obra · lavender soap Jabón de lavanda · scented sachet Saquito perfumado · silver candlestick Candelabro de plata · ruby ring Anillo de rubí · saffron bun Bollo de azafrán · pasty lunch almuerzo de empanada · Village Fields Campos de la aldea · Miners’ Canteen Cantina de los mineros · Potter’s Kiln Horno del alfarero · Linen Loft Desván del lino · Soap Maker Jabonería · Pier Embarcadero · Jeweller Joyería · town boat Barco de la ciudad · cargo carga · market crate caja del mercado · Market week Semana del mercado · landmark Monumento · Wind pump Bomba de viento · Longhouse Casa larga · Stone quay Muelle de piedra · Lookout tower Atalaya · Great Hall Gran Salón · errands recados · the field hand El jornalero · the canteen cook El cocinero de la cantina · the potter El alfarero · the weaver El tejedor · the soap maker El jabonero · the skipper El patrón del barco · the jeweller El joyero · the village elder El anciano de la aldea.
- **Français** (fr). Before: Village Village · villager villageois · market square Place du marché · golden brief Commande dorée · village place Lieu du village · Village market Marché du village · Mine Mine · Lumber Camp Camp de bûcherons · Smithy Forge · Village Windmill Moulin du village · packed lunch Panier-repas · stone Pierre · log Rondin · plank Planche · iron ore Minerai de fer · iron bar Lingot de fer · silver ore Minerai d’argent · silver bar Lingot d’argent · ruby Rubis · pickaxe Pioche · master tools Outils de maître · heirloom flour Farine de variété ancienne. New: potatoes Pommes de terre · flax Lin · lavender Lavande · saffron Safran · clay Argile · roof tile Tuile · linen Toile de lin · builder’s crate Caisse de chantier · lavender soap Savon à la lavande · scented sachet Sachet parfumé · silver candlestick Bougeoir en argent · ruby ring Bague en rubis · saffron bun Brioche au safran · pasty lunch chausson-repas · Village Fields Champs du village · Miners’ Canteen Cantine des mineurs · Potter’s Kiln Four du potier · Linen Loft Grenier à lin · Soap Maker Savonnerie · Pier Ponton · Jeweller Bijouterie · town boat Bateau de la ville · cargo cargaison · market crate caisse du marché · Market week Semaine du marché · landmark Monument · Wind pump Pompe à vent · Longhouse Longère · Stone quay Quai de pierre · Lookout tower Tour de guet · Great Hall Grande Salle · errands courses · the field hand L’ouvrier agricole · the canteen cook Le cuisinier de la cantine · the potter Le potier · the weaver Le tisserand · the soap maker Le savonnier · the skipper Le batelier · the jeweller Le bijoutier · the village elder L’ancien du village.
- **Bahasa Indonesia** (id). Before: Village Desa · villager warga desa · market square Alun-alun pasar · golden brief Pesanan emas · village place Tempat di desa · Village market Pasar Desa · Mine Tambang · Lumber Camp Kamp Penebang · Smithy Pandai Besi · Village Windmill Kincir Angin Desa · packed lunch Bekal · stone Batu · log Gelondong kayu · plank Papan · iron ore Bijih besi · iron bar Batang besi · silver ore Bijih perak · silver bar Batang perak · ruby Rubi · pickaxe Beliung · master tools Perkakas ahli · heirloom flour Tepung varietas pusaka. New: potatoes Kentang · flax Rami · lavender Lavender · saffron Safron · clay Tanah liat · roof tile Genteng · linen Kain linen · builder’s crate Peti tukang · lavender soap Sabun lavender · scented sachet Kantong wangi · silver candlestick Kandil perak · ruby ring Cincin rubi · saffron bun Roti safron · pasty lunch bekal pastel · Village Fields Ladang Desa · Miners’ Canteen Kantin Penambang · Potter’s Kiln Tungku Gerabah · Linen Loft Loteng Linen · Soap Maker Rumah Sabun · Pier Dermaga · Jeweller Toko Perhiasan · town boat Kapal kota · cargo muatan · market crate peti pasar · Market week Pekan pasar · landmark Monumen · Wind pump Pompa angin · Longhouse Rumah Panjang · Stone quay Dermaga Batu · Lookout tower Menara Pengawas · Great Hall Balai Agung · errands urusan · the field hand Buruh ladang · the canteen cook Juru masak kantin · the potter Perajin gerabah · the weaver Penenun · the soap maker Pembuat sabun · the skipper Nakhoda · the jeweller Perajin perhiasan · the village elder Tetua desa.
- **Magyar** (hu). Before: Village Falu · villager falubeli · market square Piactér · golden brief Arany megbízás · village place Hely a faluban · Village market Falusi piac · Mine Bánya · Lumber Camp Favágótábor · Smithy Kovácsműhely · Village Windmill Falusi szélmalom · packed lunch Elemózsia · stone Kő · log Rönk · plank Deszka · iron ore Vasérc · iron bar Vasrúd · silver ore Ezüstérc · silver bar Ezüstrúd · ruby Rubin · pickaxe Csákány · master tools Mesterszerszámok · heirloom flour Régi fajtás liszt. New: potatoes Burgonya · flax Len · lavender Levendula · saffron Sáfrány · clay Agyag · roof tile Tetőcserép · linen Vászon · builder’s crate Építőláda · lavender soap Levendulás szappan · scented sachet Illatzsák · silver candlestick Ezüst gyertyatartó · ruby ring Rubingyűrű · saffron bun Sáfrányos kalács · pasty lunch táskás elemózsia · Village Fields Falusi földek · Miners’ Canteen Bányászkantin · Potter’s Kiln Fazekaskemence · Linen Loft Vászonpadlás · Soap Maker Szappanfőző · Pier Móló · Jeweller Ékszerész · town boat Városi hajó · cargo rakomány · market crate piaci láda · Market week Piaci hét · landmark Nevezetesség · Wind pump Szélszivattyú · Longhouse Hosszúház · Stone quay Kőrakpart · Lookout tower Kilátó · Great Hall Nagyterem · errands teendők · the field hand A mezei munkás · the canteen cook A kantin szakácsa · the potter A fazekas · the weaver A takács · the soap maker A szappanfőző · the skipper A hajós · the jeweller Az ékszerész · the village elder A falu öregje.
- **Nederlands** (nl). Before: Village Dorp · villager dorpeling · market square Marktplein · golden brief Gouden bouwbriefje · village place Plek in het dorp · Village market Dorpsmarkt · Mine Mijn · Lumber Camp Houthakkerskamp · Smithy Smederij · Village Windmill Dorpsmolen · packed lunch Lunchpakket · stone Steen · log Boomstam · plank Plank · iron ore IJzererts · iron bar IJzerstaaf · silver ore Zilvererts · silver bar Zilverstaaf · ruby Robijn · pickaxe Houweel · master tools Meestergereedschap · heirloom flour Meel van oud ras. New: potatoes Aardappelen · flax Vlas · lavender Lavendel · saffron Saffraan · clay Klei · roof tile Dakpan · linen Linnen · builder’s crate Bouwkist · lavender soap Lavendelzeep · scented sachet Geurzakje · silver candlestick Zilveren kandelaar · ruby ring Robijnring · saffron bun Saffraanbroodje · pasty lunch pasteitjeslunch · Village Fields Dorpsakkers · Miners’ Canteen Mijnwerkerskantine · Potter’s Kiln Pottenbakkersoven · Linen Loft Linnenzolder · Soap Maker Zeepziederij · Pier Steiger · Jeweller Juwelier · town boat Stadsboot · cargo lading · market crate marktkist · Market week Marktweek · landmark Pronkstuk · Wind pump Windpomp · Longhouse Langhuis · Stone quay Stenen kade · Lookout tower Uitkijktoren · Great Hall Grote Zaal · errands boodschappen · the field hand De veldknecht · the canteen cook De kantinekok · the potter De pottenbakker · the weaver De wever · the soap maker De zeepzieder · the skipper De schipper · the jeweller De juwelier · the village elder De dorpsoudste.
- **Português** (pt). Before: Village Vila · villager morador · market square Praça do mercado · golden brief Encomenda dourada · village place Lugar da vila · Village market Mercado da Vila · Mine Mina · Lumber Camp Acampamento Madeireiro · Smithy Ferraria · Village Windmill Moinho da Vila · packed lunch Marmita · stone Pedra · log Tora · plank Tábua · iron ore Minério de ferro · iron bar Barra de ferro · silver ore Minério de prata · silver bar Barra de prata · ruby Rubi · pickaxe Picareta · master tools Ferramentas de mestre · heirloom flour Farinha crioula. New: potatoes Batatas · flax Linho · lavender Lavanda · saffron Açafrão · clay Argila · roof tile Telha · linen Tecido de linho · builder’s crate Caixa de obra · lavender soap Sabonete de lavanda · scented sachet Sachê perfumado · silver candlestick Castiçal de prata · ruby ring Anel de rubi · saffron bun Pãozinho de açafrão · pasty lunch marmita de empada · Village Fields Campos da Vila · Miners’ Canteen Cantina dos Mineiros · Potter’s Kiln Forno do Oleiro · Linen Loft Sótão do Linho · Soap Maker Saboaria · Pier Píer · Jeweller Joalheria · town boat Barco da cidade · cargo carga · market crate caixa do mercado · Market week Semana do mercado · landmark Marco · Wind pump Cata-vento · Longhouse Casa Longa · Stone quay Cais de Pedra · Lookout tower Torre de Vigia · Great Hall Grande Salão · errands favores · the field hand O lavrador · the canteen cook O cozinheiro da cantina · the potter O oleiro · the weaver O tecelão · the soap maker O saboeiro · the skipper O barqueiro · the jeweller O joalheiro · the village elder O ancião da vila.
- **Türkçe** (tr). Before: Village Köy · villager köylü · market square Pazar meydanı · golden brief Altın sipariş · village place Köydeki yer · Village market Köy Pazarı · Mine Maden · Lumber Camp Kereste Kampı · Smithy Demirci · Village Windmill Köy Yel Değirmeni · packed lunch Azık · stone Taş · log Kütük · plank Kalas · iron ore Demir cevheri · iron bar Demir külçe · silver ore Gümüş cevheri · silver bar Gümüş külçe · ruby Yakut · pickaxe Kazma · master tools Usta aletleri · heirloom flour Ata tohumu unu. New: potatoes Patates · flax Keten · lavender Lavanta · saffron Safran · clay Kil · roof tile Kiremit · linen Keten kumaş · builder’s crate İnşaat sandığı · lavender soap Lavanta sabunu · scented sachet Koku kesesi · silver candlestick Gümüş şamdan · ruby ring Yakut yüzük · saffron bun Safranlı çörek · pasty lunch börek azığı · Village Fields Köy Tarlaları · Miners’ Canteen Madenci Kantini · Potter’s Kiln Çömlekçi Fırını · Linen Loft Keten Çatı Katı · Soap Maker Sabunhane · Pier İskele · Jeweller Kuyumcu Dükkânı · town boat Kasaba teknesi · cargo yük · market crate pazar sandığı · Market week Pazar haftası · landmark Simge yapı · Wind pump Rüzgâr Pompası · Longhouse Uzun Ev · Stone quay Taş Rıhtım · Lookout tower Gözetleme Kulesi · Great Hall Büyük Salon · errands ayak işleri · the field hand Tarla işçisi · the canteen cook Kantin aşçısı · the potter Çömlekçi · the weaver Dokumacı · the soap maker Sabuncu · the skipper Kaptan · the jeweller Kuyumcu · the village elder Köyün yaşlısı.
- **Русский** (ru). Before: Village Деревня · villager житель · market square Рыночная площадь · golden brief Золотой заказ · village place Место деревни · Village market Деревенский рынок · Mine Шахта · Lumber Camp Лагерь лесорубов · Smithy Кузница · Village Windmill Деревенская мельница · packed lunch Обед с собой · stone Камень · log Бревно · plank Доска · iron ore Железная руда · iron bar Железный слиток · silver ore Серебряная руда · silver bar Серебряный слиток · ruby Рубин · pickaxe Кирка · master tools Мастерские инструменты · heirloom flour Мука старинного сорта. New: potatoes Картофель · flax Лён · lavender Лаванда · saffron Шафран · clay Глина · roof tile Черепица · linen Полотно · builder’s crate Ящик строителя · lavender soap Лавандовое мыло · scented sachet Ароматное саше · silver candlestick Серебряный подсвечник · ruby ring Кольцо с рубином · saffron bun Шафрановая булочка · pasty lunch пирожки в дорогу · Village Fields Деревенские поля · Miners’ Canteen Шахтёрская столовая · Potter’s Kiln Гончарная печь · Linen Loft Льняной чердак · Soap Maker Мыловарня · Pier Пристань · Jeweller Ювелирная лавка · town boat Городская лодка · cargo груз · market crate рыночный ящик · Market week Рыночная неделя · landmark Достопримечательность · Wind pump Ветронасос · Longhouse Длинный дом · Stone quay Каменный причал · Lookout tower Смотровая башня · Great Hall Большой зал · errands поручения · the field hand Полевой работник · the canteen cook Повар столовой · the potter Гончар · the weaver Ткач · the soap maker Мыловар · the skipper Шкипер · the jeweller Ювелир · the village elder Деревенский староста.
- **Українська** (uk). Before: Village Село · villager мешканець · market square Ринкова площа · golden brief Золоте замовлення · village place Місце в селі · Village market Сільський ринок · Mine Шахта · Lumber Camp Табір лісорубів · Smithy Кузня · Village Windmill Сільський вітряк · packed lunch Обід у дорогу · stone Камінь · log Колода · plank Дошка · iron ore Залізна руда · iron bar Залізний злиток · silver ore Срібна руда · silver bar Срібний злиток · ruby Рубін · pickaxe Кайло · master tools Майстерні інструменти · heirloom flour Борошно старовинного сорту. New: potatoes Картопля · flax Льон · lavender Лаванда · saffron Шафран · clay Глина · roof tile Черепиця · linen Полотно · builder’s crate Ящик будівельника · lavender soap Лавандове мило · scented sachet Запашне саше · silver candlestick Срібний свічник · ruby ring Перстень з рубіном · saffron bun Шафранова булочка · pasty lunch пиріжки в дорогу · Village Fields Сільські поля · Miners’ Canteen Шахтарська їдальня · Potter’s Kiln Гончарна піч · Linen Loft Лляне горище · Soap Maker Миловарня · Pier Пристань · Jeweller Ювелірна крамниця · town boat Міський човен · cargo вантаж · market crate ринковий ящик · Market week Ринковий тиждень · landmark Пам’ятка · Wind pump Вітронасос · Longhouse Довгий дім · Stone quay Кам’яний причал · Lookout tower Оглядова вежа · Great Hall Велика зала · errands доручення · the field hand Польовий робітник · the canteen cook Кухар їдальні · the potter Гончар · the weaver Ткач · the soap maker Миловар · the skipper Шкіпер · the jeweller Ювелір · the village elder Сільський староста.
- **हिन्दी** (hi). Before: Village गाँव · villager गाँववाला · market square बाज़ार चौक · golden brief सुनहरा ऑर्डर · village place गाँव की जगह · Village market गाँव का बाज़ार · Mine खदान · Lumber Camp लकड़हारा शिविर · Smithy लोहारखाना · Village Windmill गाँव की पवनचक्की · packed lunch टिफ़िन · stone पत्थर · log लट्ठा · plank तख़्ता · iron ore लौह अयस्क · iron bar लोहे की सिल्ली · silver ore चाँदी अयस्क · silver bar चाँदी की सिल्ली · ruby माणिक · pickaxe गैंती · master tools उस्ताद औज़ार · heirloom flour पुरानी किस्म का आटा. New: potatoes आलू · flax अलसी · lavender लैवेंडर · saffron केसर · clay चिकनी मिट्टी · roof tile खपरैल · linen लिनन · builder’s crate निर्माण बक्सा · lavender soap लैवेंडर साबुन · scented sachet खुशबू की थैली · silver candlestick चाँदी का शमादान · ruby ring माणिक की अँगूठी · saffron bun केसर बन · pasty lunch समोसा टिफ़िन · Village Fields गाँव के खेत · Miners’ Canteen खनिकों की कैंटीन · Potter’s Kiln कुम्हार का भट्ठा · Linen Loft लिनन अटारी · Soap Maker साबुनघर · Pier घाट · Jeweller जौहरी की दुकान · town boat शहर की नाव · cargo माल · market crate बाज़ार का बक्सा · Market week बाज़ार हफ़्ता · landmark स्मारक · Wind pump पवन पंप · Longhouse चौपाल · Stone quay पत्थर का घाट · Lookout tower निगरानी मीनार · Great Hall बड़ा सभागार · errands छोटे काम · the field hand खेतिहर मज़दूर · the canteen cook कैंटीन का रसोइया · the potter कुम्हार · the weaver जुलाहा · the soap maker साबुन वाला · the skipper मल्लाह · the jeweller जौहरी · the village elder गाँव के बुज़ुर्ग.
- **日本語** (ja). Before: Village 村 · villager 村人 · market square 市場広場 · golden brief 金色の依頼書 · village place 村の施設 · Village market 村の市場 · Mine 鉱山 · Lumber Camp 伐採キャンプ · Smithy 鍛冶屋 · Village Windmill 村の風車 · packed lunch お弁当 · stone 石材 · log 丸太 · plank 板材 · iron ore 鉄鉱石 · iron bar 鉄インゴット · silver ore 銀鉱石 · silver bar 銀インゴット · ruby ルビー · pickaxe つるはし · master tools 名工の道具 · heirloom flour 在来種の小麦粉. New: potatoes ジャガイモ · flax 亜麻 · lavender ラベンダー · saffron サフラン · clay 粘土 · roof tile 屋根瓦 · linen リネン · builder’s crate 建材箱 · lavender soap ラベンダー石けん · scented sachet 香り袋 · silver candlestick 銀の燭台 · ruby ring ルビーの指輪 · saffron bun サフランパン · pasty lunch パイ弁当 · Village Fields 村の畑 · Miners’ Canteen 鉱夫食堂 · Potter’s Kiln 陶工の窯 · Linen Loft リネン工房 · Soap Maker 石けん工房 · Pier 桟橋 · Jeweller 宝石店 · town boat 町の船 · cargo 積み荷 · market crate 市場の木箱 · Market week 市場週間 · landmark ランドマーク · Wind pump 風車ポンプ · Longhouse 長屋 · Stone quay 石の波止場 · Lookout tower 物見やぐら · Great Hall 大広間 · errands おつかい · the field hand 畑の働き手 · the canteen cook 食堂の料理人 · the potter 陶工 · the weaver 機織り職人 · the soap maker 石けん職人 · the skipper 船長 · the jeweller 宝石職人 · the village elder 村の長老.
- **العربية** (ar). Before: Village القرية · villager قروي · market square ساحة السوق · golden brief الطلب الذهبي · village place مكان في القرية · Village market سوق القرية · Mine المنجم · Lumber Camp معسكر الأخشاب · Smithy الحدادة · Village Windmill طاحونة القرية · packed lunch غداء معبأ · stone حجر · log جذع · plank لوح · iron ore خام حديد · iron bar سبيكة حديد · silver ore خام فضة · silver bar سبيكة فضة · ruby ياقوت · pickaxe معول · master tools أدوات متقنة · heirloom flour طحين أصيل. New: potatoes بطاطس · flax كتّان · lavender خزامى · saffron زعفران · clay طين · roof tile قرميد · linen قماش الكتان · builder’s crate صندوق البنّاء · lavender soap صابون الخزامى · scented sachet كيس معطّر · silver candlestick شمعدان فضي · ruby ring خاتم ياقوت · saffron bun كعكة الزعفران · pasty lunch غداء الفطائر · Village Fields حقول القرية · Miners’ Canteen مقصف عمال المنجم · Potter’s Kiln فرن الفخّاري · Linen Loft علّية الكتان · Soap Maker المصبنة · Pier المرسى · Jeweller محل المجوهرات · town boat قارب المدينة · cargo حمولة · market crate صندوق السوق · Market week أسبوع السوق · landmark معلم · Wind pump مضخة الرياح · Longhouse البيت الطويل · Stone quay الرصيف الحجري · Lookout tower برج المراقبة · Great Hall القاعة الكبرى · errands مشاوير · the field hand عامل الحقل · the canteen cook طبّاخ المقصف · the potter الفخّاري · the weaver النسّاج · the soap maker صانع الصابون · the skipper الربّان · the jeweller الصائغ · the village elder شيخ القرية.
- **简体中文** (zh). Before: Village 村庄 · villager 村民 · market square 集市广场 · golden brief 金色委托 · village place 村庄地点 · Village market 村庄市场 · Mine 矿山 · Lumber Camp 伐木营地 · Smithy 铁匠铺 · Village Windmill 村庄风车 · packed lunch 打包午餐 · stone 石头 · log 原木 · plank 木板 · iron ore 铁矿石 · iron bar 铁锭 · silver ore 银矿石 · silver bar 银锭 · ruby 红宝石 · pickaxe 镐 · master tools 大师工具 · heirloom flour 传家面粉. New: potatoes 土豆 · flax 亚麻 · lavender 薰衣草 · saffron 藏红花 · clay 黏土 · roof tile 屋瓦 · linen 亚麻布 · builder’s crate 建材箱 · lavender soap 薰衣草皂 · scented sachet 香囊 · silver candlestick 银烛台 · ruby ring 红宝石戒指 · saffron bun 藏红花面包 · pasty lunch 馅饼午餐 · Village Fields 村庄田地 · Miners’ Canteen 矿工食堂 · Potter’s Kiln 陶窑 · Linen Loft 亚麻阁楼 · Soap Maker 制皂坊 · Pier 码头 · Jeweller 珠宝铺 · town boat 城镇货船 · cargo 货物 · market crate 集市木箱 · Market week 集市周 · landmark 地标 · Wind pump 风力水泵 · Longhouse 长屋 · Stone quay 石砌码头 · Lookout tower 瞭望塔 · Great Hall 大会堂 · errands 跑腿 · the field hand 田间帮工 · the canteen cook 食堂厨师 · the potter 陶工 · the weaver 织工 · the soap maker 制皂师傅 · the skipper 船老大 · the jeweller 珠宝匠 · the village elder 村长老.

## Fishing pond words (Oct 2026)

The Fishing pond (from level 4, `public/pond-ui.js`) keeps these words in every language: its name, the fish book, a cast (the
thing the pond refills), the float, reeling in and today's fish, and the eight fish. Old Whiskers is a name (a nickname for the
pond's old catfish), so each language has its own playful one; the book shows him as "?" until he is landed.

Page 2 of the fish book (11 Oct 2026, from level 20) adds a page of the book and eight more fish, after Old Whiskers in each line.
The sturgeon is page 2's secret, shown as "?" until it is landed. In Russian and Ukrainian the barbel is Марена, not Усач, so it
never reads as Old Whiskers (Старый Усач, Старий Вусань).

- **Español** (es): Fishing pond Estanque de pesca · fish book Libro de peces · cast lanzamiento/lanzar · float flotador · reel recoger · Today’s fish pez del día · Minnow Piscardo · Perch Perca · Roach Rutilo · Carp Carpa · Tench Tenca · Pike Lucio · Golden carp Carpa dorada · Old Whiskers Viejo Bigotes · page (of the book) página · Rudd Escardinio · Bream Brema · Eel Anguila · Rainbow trout Trucha arcoíris · Barbel Barbo · Zander Lucioperca · Koi Koi · Sturgeon Esturión.
- **Deutsch** (de): Fishing pond Angelteich · fish book Fischbuch · cast Wurf/auswerfen · float Pose · reel einholen · Today’s fish Fisch des Tages · Minnow Elritze · Perch Barsch · Roach Rotauge · Carp Karpfen · Tench Schleie · Pike Hecht · Golden carp Goldkarpfen · Old Whiskers Alter Schnauzbart · page (of the book) Seite · Rudd Rotfeder · Bream Brasse · Eel Aal · Rainbow trout Regenbogenforelle · Barbel Barbe · Zander Zander · Koi Koi · Sturgeon Stör.
- **Français** (fr): Fishing pond Étang de pêche · fish book Carnet de pêche · cast lancer · float flotteur · reel remonter · Today’s fish poisson du jour · Minnow Vairon · Perch Perche · Roach Gardon · Carp Carpe · Tench Tanche · Pike Brochet · Golden carp Carpe dorée · Old Whiskers Vieux Moustachu · page (of the book) page · Rudd Rotengle · Bream Brème · Eel Anguille · Rainbow trout Truite arc-en-ciel · Barbel Barbeau · Zander Sandre · Koi Koï · Sturgeon Esturgeon.
- **Português** (pt): Fishing pond Lago de pesca · fish book Livro de peixes · cast arremesso/arremessar · float boia · reel puxar · Today’s fish peixe do dia · Minnow Lambari · Perch Perca · Roach Rútilo · Carp Carpa · Tench Tenca · Pike Lúcio · Golden carp Carpa dourada · Old Whiskers Velho Bigodudo · page (of the book) página · Rudd Escardínio · Bream Brema · Eel Enguia · Rainbow trout Truta arco-íris · Barbel Barbo · Zander Lúcio-perca · Koi Carpa koi · Sturgeon Esturjão.
- **Nederlands** (nl): Fishing pond Visvijver · fish book Visboek · cast worp/uitwerpen · float dobber · reel binnenhalen · Today’s fish vis van de dag · Minnow Elrits · Perch Baars · Roach Blankvoorn · Carp Karper · Tench Zeelt · Pike Snoek · Golden carp Goudkarper · Old Whiskers Ouwe Snor · page (of the book) pagina · Rudd Ruisvoorn · Bream Brasem · Eel Paling · Rainbow trout Regenboogforel · Barbel Barbeel · Zander Snoekbaars · Koi Koi · Sturgeon Steur.
- **Bahasa Indonesia** (id): Fishing pond Kolam pancing · fish book Buku ikan · cast lemparan/lempar · float pelampung · reel tarik · Today’s fish ikan hari ini · Minnow Ikan Wader · Perch Ikan Betok · Roach Ikan Tawes · Carp Ikan Mas · Tench Ikan Nilem · Pike Ikan Gabus · Golden carp Ikan Mas Kencana · Old Whiskers Si Kumis Tua · page (of the book) halaman · Rudd Ikan Rudd · Bream Ikan Bream · Eel Ikan Sidat · Rainbow trout Ikan Trout Pelangi · Barbel Ikan Barbel · Zander Ikan Zander · Koi Ikan Koi · Sturgeon Ikan Sturgeon.
- **日本語** (ja): Fishing pond 釣り池 · fish book 魚図鑑 · cast 投げる（回数） · float ウキ · reel 巻く · Today’s fish 今日の魚 · Minnow ハヤ · Perch パーチ · Roach ウグイ · Carp コイ · Tench テンチ · Pike カワカマス · Golden carp 黄金のコイ · Old Whiskers ヒゲじい · page (of the book) ページ · Rudd ラッド · Bream ブリーム · Eel ウナギ · Rainbow trout ニジマス · Barbel バーベル · Zander ザンダー · Koi 錦鯉 · Sturgeon チョウザメ.
- **Türkçe** (tr): Fishing pond Balık göleti · fish book Balık kitabı · cast atış/at · float mantar · reel çek · Today’s fish günün balığı · Minnow Golyan · Perch Perki · Roach Kızılgöz · Carp Sazan · Tench Kadife balığı · Pike Turna · Golden carp Altın sazan · Old Whiskers Koca Bıyık · page (of the book) sayfa · Rudd Kızılkanat · Bream Çapak · Eel Yılan balığı · Rainbow trout Gökkuşağı alabalığı · Barbel Bıyıklı balık · Zander Sudak · Koi Koi · Sturgeon Mersin balığı.
- **Čeština** (cs): Fishing pond Rybník · fish book Kniha ryb · cast nahození/nahodit · float splávek · reel navíjet · Today’s fish ryba dne · Minnow Střevle · Perch Okoun · Roach Plotice · Carp Kapr · Tench Lín · Pike Štika · Golden carp Zlatý kapr · Old Whiskers Starý Fousáč · page (of the book) strana · Rudd Perlín · Bream Cejn · Eel Úhoř · Rainbow trout Pstruh duhový · Barbel Parma · Zander Candát · Koi Koi · Sturgeon Jeseter.
- **Українська** (uk): Fishing pond Ставок для риболовлі · fish book Книга риб · cast закидання/закинути · float поплавок · reel підтягнути · Today’s fish риба дня · Minnow Гольян · Perch Окунь · Roach Плітка · Carp Короп · Tench Лин · Pike Щука · Golden carp Золотий короп · Old Whiskers Старий Вусань · page (of the book) сторінка · Rudd Краснопірка · Bream Лящ · Eel Вугор · Rainbow trout Райдужна форель · Barbel Марена · Zander Судак · Koi Кої · Sturgeon Осетер.
- **Magyar** (hu): Fishing pond Horgásztó · fish book Halkönyv · cast dobás · float úszó · reel behúzás · Today’s fish a nap hala · Minnow Fürge cselle · Perch Sügér · Roach Bodorka · Carp Ponty · Tench Compó · Pike Csuka · Golden carp Aranyponty · Old Whiskers Öreg Bajusz · page (of the book) oldal · Rudd Vörösszárnyú keszeg · Bream Dévérkeszeg · Eel Angolna · Rainbow trout Szivárványos pisztráng · Barbel Márna · Zander Süllő · Koi Koi · Sturgeon Tok.
- **Русский** (ru): Fishing pond Пруд для рыбалки · fish book Книга рыб · cast заброс/забросить · float поплавок · reel тянуть · Today’s fish рыба дня · Minnow Гольян · Perch Окунь · Roach Плотва · Carp Карп · Tench Линь · Pike Щука · Golden carp Золотой карп · Old Whiskers Старый Усач · page (of the book) страница · Rudd Краснопёрка · Bream Лещ · Eel Угорь · Rainbow trout Радужная форель · Barbel Марена · Zander Судак · Koi Кои · Sturgeon Осётр.
- **العربية** (ar): Fishing pond بركة الصيد · fish book كتاب الأسماك · cast رمية/ارمِ · float العوامة · reel اسحب · Today’s fish سمكة اليوم · Minnow سمك المنوة · Perch سمك الفرخ · Roach سمك الروتش · Carp الشبوط · Tench سمك التنش · Pike سمك الكراكي · Golden carp الشبوط الذهبي · Old Whiskers أبو شوارب العجوز · page (of the book) الصفحة · Rudd سمك الرود · Bream سمك البريم · Eel الأنقليس · Rainbow trout التراوت القزحي · Barbel البربيس · Zander سمك الزاندر · Koi سمك الكوي · Sturgeon الحفش.
- **简体中文** (zh): Fishing pond 钓鱼池塘 · fish book 鱼类图鉴 · cast 抛竿 · float 浮漂 · reel 收线 · Today’s fish 今日之鱼 · Minnow 鲦鱼 · Perch 河鲈 · Roach 拟鲤 · Carp 鲤鱼 · Tench 丁鱥 · Pike 狗鱼 · Golden carp 金鲤 · Old Whiskers 老胡子 · page (of the book) 页 · Rudd 赤睛鱼 · Bream 欧鳊 · Eel 鳗鱼 · Rainbow trout 虹鳟 · Barbel 鲃鱼 · Zander 梭鲈 · Koi 锦鲤 · Sturgeon 鲟鱼.
- **हिन्दी** (hi): Fishing pond मछली तालाब · fish book मछली किताब · cast कास्ट · float बॉबर · reel खींचें · Today’s fish आज की मछली · Minnow मिनो · Perch पर्च · Roach रोच · Carp कार्प · Tench टेंच · Pike पाइक · Golden carp सुनहरी कार्प · Old Whiskers बूढ़ा मूँछू · page (of the book) पन्ना · Rudd रड · Bream ब्रीम · Eel ईल · Rainbow trout रेनबो ट्राउट · Barbel बार्बेल · Zander ज़ैंडर · Koi कोइ कार्प · Sturgeon स्टर्जन.

## Village lake words (12 Oct 2026)

The village lake (World II, from level 100, plan D) is fished like the Fishing pond, so it keeps the pond's words (fish book, cast,
float, reel, Today's fish) and adds its own name and its 20 fish: page 1 from level 100, then page 2 from level 120, each line in the
book's order. Old Granite (page 1's huge old lake trout) and the Glacier Ghost (page 2's pale char) are names, so each language has its
own, as Old Whiskers has. The lake's name is never the pond's: in Hungarian, where tó is both, it is always Falusi tó.

- **Español** (es): Village lake Lago de la aldea · Bleak Alburno · Chub Cacho · Whitefish Corégono · Nase Boga europea · Grayling Tímalo · Brown trout Trucha común · Arctic char Salvelino ártico · Burbot Lota · Huchen Salmón del Danubio · Old Granite Viejo Granito · Bullhead Cavilat · Vendace Corégono enano · Ide Ido · Golden orfe Ido dorado · Brook trout Trucha de arroyo · Lake trout Trucha lacustre · Salmon Salmón · Golden trout Trucha dorada · Marble trout Trucha marmorata · Glacier Ghost Fantasma del Glaciar.
- **Deutsch** (de): Village lake Dorfsee · Bleak Ukelei · Chub Döbel · Whitefish Renke · Nase Nase · Grayling Äsche · Brown trout Bachforelle · Arctic char Seesaibling · Burbot Quappe · Huchen Huchen · Old Granite Alter Granit · Bullhead Groppe · Vendace Kleine Maräne · Ide Aland · Golden orfe Goldorfe · Brook trout Bachsaibling · Lake trout Seeforelle · Salmon Lachs · Golden trout Goldforelle · Marble trout Marmorforelle · Glacier Ghost Gletschergeist.
- **Français** (fr): Village lake Lac du village · Bleak Ablette · Chub Chevesne · Whitefish Lavaret · Nase Hotu · Grayling Ombre commun · Brown trout Truite fario · Arctic char Omble chevalier · Burbot Lotte de rivière · Huchen Huchon · Old Granite Vieux Granit · Bullhead Chabot · Vendace Petite marène · Ide Ide mélanote · Golden orfe Ide dorée · Brook trout Omble de fontaine · Lake trout Truite de lac · Salmon Saumon · Golden trout Truite dorée · Marble trout Truite marbrée · Glacier Ghost Fantôme du Glacier.
- **Português** (pt): Village lake Lago da vila · Bleak Alburno · Chub Escalo · Whitefish Corégono · Nase Boga-europeia · Grayling Tímalo · Brown trout Truta-marrom · Arctic char Salvelino-ártico · Burbot Lota · Huchen Salmão-do-danúbio · Old Granite Velho Granito · Bullhead Cabeçudo · Vendace Corégono-pequeno · Ide Ide-europeu · Golden orfe Ide-dourado · Brook trout Truta-de-riacho · Lake trout Truta-de-lago · Salmon Salmão · Golden trout Truta-dourada · Marble trout Truta-marmorizada · Glacier Ghost Fantasma da Geleira.
- **Nederlands** (nl): Village lake Dorpsmeer · Bleak Alver · Chub Kopvoorn · Whitefish Grote marene · Nase Sneep · Grayling Vlagzalm · Brown trout Beekforel · Arctic char Beekridder · Burbot Kwabaal · Huchen Donauzalm · Old Granite Ouwe Graniet · Bullhead Rivierdonderpad · Vendace Kleine marene · Ide Winde · Golden orfe Goudwinde · Brook trout Bronforel · Lake trout Meerforel · Salmon Zalm · Golden trout Goudforel · Marble trout Marmerforel · Glacier Ghost Gletsjergeest.
- **Bahasa Indonesia** (id): Village lake Danau desa · Bleak Ikan Bleak · Chub Ikan Chub · Whitefish Ikan Whitefish · Nase Ikan Nase · Grayling Ikan Grayling · Brown trout Ikan Trout Cokelat · Arctic char Ikan Char Arktik · Burbot Ikan Burbot · Huchen Ikan Huchen · Old Granite Si Granit Tua · Bullhead Ikan Bullhead · Vendace Ikan Vendace · Ide Ikan Ide · Golden orfe Ikan Orfe Emas · Brook trout Ikan Trout Sungai · Lake trout Ikan Trout Danau · Salmon Ikan Salmon · Golden trout Ikan Trout Emas · Marble trout Ikan Trout Marmer · Glacier Ghost Hantu Gletser.
- **日本語** (ja): Village lake 村の湖 · Bleak ブリーク · Chub チャブ · Whitefish ホワイトフィッシュ · Nase ナーゼ · Grayling カワヒメマス · Brown trout ブラウントラウト · Arctic char ホッキョクイワナ · Burbot カワメンタイ · Huchen ドナウイトウ · Old Granite ミカゲじい · Bullhead カジカ · Vendace ヴェンダス · Ide アイド · Golden orfe ゴールデンオルフェ · Brook trout カワマス · Lake trout レイクトラウト · Salmon サケ · Golden trout ゴールデントラウト · Marble trout マーブルトラウト · Glacier Ghost 氷河のゴースト.
- **Türkçe** (tr): Village lake Köy gölü · Bleak İnci balığı · Chub Tatlısu kefali · Whitefish Göl ak balığı · Nase Kababurun · Grayling Bayrak balığı · Brown trout Dere alabalığı · Arctic char Kutup alabalığı · Burbot Gelincik balığı · Huchen Tuna somonu · Old Granite Koca Granit · Bullhead Dere kaya balığı · Vendace Küçük ak balık · Ide Ide balığı · Golden orfe Altın ide · Brook trout Kaynak alabalığı · Lake trout Göl alabalığı · Salmon Somon · Golden trout Altın alabalık · Marble trout Mermer alabalık · Glacier Ghost Buzul Hayaleti.
- **Čeština** (cs): Village lake Vesnické jezero · Bleak Ouklej · Chub Jelec tloušť · Whitefish Síh · Nase Ostroretka · Grayling Lipan · Brown trout Pstruh obecný · Arctic char Siven arktický · Burbot Mník · Huchen Hlavatka · Old Granite Starý Granit · Bullhead Vranka · Vendace Malá maréna · Ide Jesen · Golden orfe Zlatý jesen · Brook trout Siven americký · Lake trout Jezerní pstruh · Salmon Losos · Golden trout Zlatý pstruh · Marble trout Pstruh mramorovaný · Glacier Ghost Ledovcový duch.
- **Українська** (uk): Village lake Сільське озеро · Bleak Уклейка · Chub Головень · Whitefish Сиг · Nase Підуст · Grayling Харіус · Brown trout Струмкова форель · Arctic char Арктичний голець · Burbot Минь · Huchen Дунайський лосось · Old Granite Старий Граніт · Bullhead Бабець · Vendace Ряпушка · Ide В’язь · Golden orfe Золотий в’язь · Brook trout Американська палія · Lake trout Озерна форель · Salmon Лосось · Golden trout Золота форель · Marble trout Мармурова форель · Glacier Ghost Льодовиковий Привид.
- **Magyar** (hu): Village lake Falusi tó · Bleak Küsz · Chub Domolykó · Whitefish Maréna · Nase Paduc · Grayling Pénzes pér · Brown trout Sebes pisztráng · Arctic char Sarki szaibling · Burbot Menyhal · Huchen Galóca · Old Granite Öreg Gránit · Bullhead Botos kölönte · Vendace Kis maréna · Ide Jászkeszeg · Golden orfe Aranyjász · Brook trout Pataki szaibling · Lake trout Tavi pisztráng · Salmon Lazac · Golden trout Aranypisztráng · Marble trout Márványos pisztráng · Glacier Ghost Gleccserszellem.
- **Русский** (ru): Village lake Деревенское озеро · Bleak Уклейка · Chub Голавль · Whitefish Сиг · Nase Подуст · Grayling Хариус · Brown trout Ручьевая форель · Arctic char Арктический голец · Burbot Налим · Huchen Дунайский лосось · Old Granite Старый Гранит · Bullhead Подкаменщик · Vendace Ряпушка · Ide Язь · Golden orfe Золотой язь · Brook trout Американская палия · Lake trout Озёрная форель · Salmon Лосось · Golden trout Золотая форель · Marble trout Мраморная форель · Glacier Ghost Ледниковый Призрак.
- **العربية** (ar): Village lake بحيرة القرية · Bleak سمك البليك · Chub سمك الشوب · Whitefish السمك الأبيض · Nase سمك الناز · Grayling سمك الغرايلنغ · Brown trout التراوت البني · Arctic char سمك الشار القطبي · Burbot سمك البربوط · Huchen سلمون الدانوب · Old Granite أبو صخر العجوز · Bullhead سمك أبو رأس · Vendace سمك الفنداس · Ide سمك الآيد · Golden orfe الآيد الذهبي · Brook trout تراوت الجداول · Lake trout تراوت البحيرة · Salmon السلمون · Golden trout التراوت الذهبي · Marble trout التراوت الرخامي · Glacier Ghost شبح الجليد.
- **简体中文** (zh): Village lake 村庄湖泊 · Bleak 欧白鱼 · Chub 雅罗鱼 · Whitefish 白鲑 · Nase 软口鱼 · Grayling 茴鱼 · Brown trout 褐鳟 · Arctic char 北极红点鲑 · Burbot 江鳕 · Huchen 多瑙哲罗鲑 · Old Granite 老花岗 · Bullhead 杜父鱼 · Vendace 小白鲑 · Ide 高体雅罗鱼 · Golden orfe 金雅罗鱼 · Brook trout 溪红点鲑 · Lake trout 湖红点鲑 · Salmon 鲑鱼 · Golden trout 金鳟 · Marble trout 大理石鳟 · Glacier Ghost 冰川幽灵.
- **हिन्दी** (hi): Village lake गाँव की झील · Bleak ब्लीक · Chub चब · Whitefish व्हाइटफ़िश · Nase नाज़े · Grayling ग्रेलिंग · Brown trout ब्राउन ट्राउट · Arctic char आर्कटिक चार · Burbot बरबट · Huchen हुचेन · Old Granite बूढ़ा पत्थरू · Bullhead बुलहेड · Vendace वेंडेस · Ide आइड · Golden orfe सुनहरी ऑर्फ़ · Brook trout ब्रुक ट्राउट · Lake trout लेक ट्राउट · Salmon सैल्मन · Golden trout सुनहरी ट्राउट · Marble trout मार्बल ट्राउट · Glacier Ghost हिमनद भूत.
