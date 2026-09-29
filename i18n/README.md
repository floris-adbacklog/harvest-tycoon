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
