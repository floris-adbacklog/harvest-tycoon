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
