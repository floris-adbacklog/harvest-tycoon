# Harvest Tycoon — asset usage

The supplied upload is a GLB pack. The game loads selected GLB models directly in Three.js; it does not load OBJ files or the entire demo scene.

The game now loads **75 distinct model files**, up from 55. Loading every variation would increase mobile download and rendering costs without necessarily improving play. Existing crops and buildings keep their models.

| Additional models | Purpose |
| --- | --- |
| mountain_008 | The distant valley ridge |
| field_004, field_005 | Green and golden neighbouring fields; scenery, with no misleading crop timers. field_004 in its ploughed brown is also the soil of World II's Village Fields |
| horse_002 | Animal paddock (the horse alone since 15 Oct 2026); tap for animal-care activities |
| lawn_mower_001 | Workshop and its hands-on repair activity |
| trailer_001 | Parked equipment beside the workshop |
| fir_tree_003, tree_008, stone_fence_001 | Forest edges and low boundary walls |
| case_002, case_003, bag_003, barrel_009 | Recognisable wooden crates, a grain sack and a barrel replacing four plain white block props |
| firewood_008, hay_003 | Extra work-yard detail beside the farmhouse and animal area |

The roaming truck and combine were removed at the user’s request. The original parked tractor and delivery cart remain usable.

The existing greenhouse_003 and apiary_001 now open real repeatable activities. The pond surface, water ripples, bees and reward particles are simple generated geometry. All scenery stays outside camera-fit measurements; the four activity stations are included so the useful farm remains easy to reach.

The 3D assets are from the user-supplied ithappy Studios Farm pack: https://ithappystudios.com/environment/farm/

## Baked shade (26 Sep 2026)

Every model carries soft shade in its vertex colours (COLOR_0): darker in corners, under roofs, inside tree crowns and where it
meets the ground, baked once in Blender, so it costs nothing while playing. The models grew 8% (11.0 → 11.8 MB).

A new model from the pack gets the same shade in two steps (Blender is needed for the first):

    SRC=<folder with the original .glb> OUT=<folder for the shade> blender -b --factory-startup --python scripts/model-shade/bake-ao.py
    node scripts/model-shade/apply-ao.mjs <folder with the original .glb> <folder for the shade> public/assets/models

A shaded model is marked (asset.extras.bakedShade), so running the second step again never darkens it twice. tests/scene-look.test.mjs
checks that every model has its shade.

## One palette file (6 Oct 2026)

Every model paints from the same palette picture, and every .glb from the pack carries its own copy of it. The models in
public/assets/models point at one `palette.png` beside them instead (`village-palette.png` for village_*), and the game fetches
each palette once for all of them (public/model-atlas.js, sharePalette). The models went from 11.96 to 10.27 MB (as the site sends them, brotli-packed: 3.64 to 3.28 MB), and each palette is decoded once instead of once per model. After the two
steps above, a new model gets the same treatment with:

    node scripts/share-palette.mjs

Only a picture that is byte for byte the palette is taken out; it is safe to run again. tests/model-palette.test.mjs checks that no
model carries a copy of the palette.

## Village pack props (27 Sep 2026)

Ten props from the ithappy Studios **Village** pack (Summer version), bought by the user: https://ithappystudios.com/environment/village/
The download stays out of the repository (`assets-source/`, in .gitignore): the license does not allow sharing the pack as it is.
The Village buildings were tried and left out: their plank roofs did not match the Farm pack.

| Model (source) | Purpose |
| --- | --- |
| village_pier_001 (Building_006), village_boat_001 (props_023), village_rowboat_001 (props_027), village_stones_001 (stones_003) | The pond: a pier with a moored boat, a rowing boat, stones on the shore |
| village_stall_001 (props_052) | Farm stall and Valley Market |
| village_stall_002–004 (animal_015, props_053, props_047), village_melons_001 (props_050), village_barrels_001 (props_055) | Market stalls in front of the Grand Valley Fair |

The Village models paint from their own small palette: model-atlas.js lets them share that one, never the Farm palette.
They carry the same baked shade (the steps above, with SRC pointing at renamed copies of the source files).

Thirteen model files that no code used any more were removed at the same time (git keeps them): bridge_001, stall_002,
trailer_002, mountain_009, landscape_004, landscape_008, landscape_011, tower_004, tower_008, stone_fence_002, stone_fence_005,
house_024 and water_001.

## Village shade (Oct 2026)

World II's village (`public/assets/village/village.glb`) carries the same soft shade as the farm's models, with the same strength
(.45) and floor (.55), so both worlds match. Its houses are built from separate pack models (roofs, walls, doors, chimneys), so it
is baked where it stands instead of model by model on a ground plane: a roof gets its shade from the house under it, a tree from the
hill it stands on, and a model drawn in many places gets the mean of its shade over them. scripts/build-village.mjs stays the one way
to make the file; the bake (15-30 s) runs between two of its runs. From the repository, with <tools> a folder holding a copy of
scripts/build-village.mjs and gltf-transform and pngjs installed (see its header) and <pack> assets-source/village/Village_Summer_glb:

    node <tools>/build-village.mjs <pack>/Village_Summer.glb <pack>/Separate_assets_glb <out>
    SRC=<out> OUT=<out> LAYOUT=<out>/village-layout.json blender -b --factory-startup --python scripts/model-shade/bake-ao.py
    node <tools>/build-village.mjs <pack>/Village_Summer.glb <pack>/Separate_assets_glb <out> <out>/village.ao.json
    <tools>/node_modules/.bin/gltf-transform meshopt <out>/village.glb public/assets/village/village.glb --level high
    cp <out>/village-layout.json public/assets/village/

A second bake is not byte for byte the same (Blender's noise where two surfaces overlap: about 0.1% of the vertices, a few hundred
bytes in the file); the layout comes out identical.

The shade travels as one byte per vertex (`_SHADE`) and public/village-scene.js turns it into the grey vertex colours the farm's
models carry: as COLOR_0 (three bytes) the meshopt file would grow to 6.4 MB, now 4.5 → 5.3 MB. The file is marked
(asset.extras.bakedShade). The buckets of the two wells and one market prop had no material in the pack (drawn almost black);
the build gives them the palette. tests/village-look.test.mjs checks the shade, the size and the village's light settings.

## Village extras (Oct 2026)

World II's props at its places and its five landmarks (`public/assets/village/village-extras.glb`, about 410 KB) are 35 more models
of the same Village pack, each once, shaded like the farm's props: baked per model on a ground plane with the strength (.45) and
floor (.55) of the rest. They carry no palette; the village paints them with its own. scripts/build-village-extras.mjs is the one way
to make the file, with <tools> a folder holding a copy of it and @gltf-transform/core, extensions, functions and meshoptimizer
installed:

    node <tools>/build-village-extras.mjs assets-source/village <out>
    SRC=<out>/models OUT=<out>/ao blender -b --factory-startup --python scripts/model-shade/bake-ao.py
    node <tools>/build-village-extras.mjs assets-source/village <out> <out>/ao
    cp <out>/village-extras.glb public/assets/village/

public/village-scene.js says where each model stands (VILLAGE_EXTRAS); tests/village-look.test.mjs checks the shade, the size and
that every model it places is in the file. Like the village, a second bake is not byte for byte the same; the tests check ranges.

Two landmarks are built of the pack's parts (10 Oct 2026, after the owner's review: the Great Hall was one more house of the square,
the Stone quay a wooden pier on posts). The Great Hall is the house parts the village's own houses are made of (Building_Angle_002,
Angle_Roof_002, Window_002, Door_002, Roof_002, Small_Window_002, Canopy_002, all in the light wood with red roofs): two wings and a
bell tower of three storeys under a cross roof, on the village's stone footings (foundation_002) with stone steps (foundation_010).
The Stone quay is six of those stone steps as slabs on the water, faced and backed with dry-stone walls (stones_015), with barrels,
crates, a sack and a boat (props_055, 018, 022, 044, 023). A part that stands several times is in the file once. foundation_010 is
written at a tenth of the pack's size, the size the village draws it at (village-layout.json), so 1 in VILLAGE_EXTRAS is the
village's own size for every model. Each part is baked on its own, so the storeys of the tower and the roofs carry the shade of a
part on the ground, not of the whole Hall; from the game's distance that reads as the joints between them. The file went from
381,800 to 408,956 bytes.

The pictures of the later places and the landmarks (`public/assets/icons/<key>.webp`, 512 px) are drawn from the same models by
scripts/render-village-pictures.py (numpy and Pillow, no Blender), after the first step above has written <out>/models:

    python3 scripts/render-village-pictures.py assets-source/village/Village_Summer_glb/Separate_assets_glb <out>/models <pictures>
    for f in <pictures>/*.png; do cwebp -q 82 -alpha_q 100 -m 6 "$f" -o public/assets/icons/$(basename "${f%.png}").webp; done

The Village Fields (11 Oct 2026) have no model of their own: public/village-scene.js lays four strips of the farm's field_004 (in
the brown of the farm's ploughed fields) on the hill where the pack's bare plot (landscape_004, now hidden) lay, puts the farm's
cream fence_008 round them and grows the farm's plant_010 and plant_005 and the farm's wildflower (scene-polish.js) on them, all
from public/assets/models. Their picture is drawn from the same farm models (`fields()` in the script above).

The 13 later goods (potatoes … saffron buns) are painted by the owner, 256 px WebP, copied as they are.

## Farm pets (20 Oct 2026)

A dog and a cat by the lane in front of the Farmhouse and a deer in the village (public/farm-pets.js), from ithappy Studios' free
animals (https://ithappystudios.com/). Licence: their free asset policy (https://ithappystudios.com/type-of-licenses/): use inside a
finished game is allowed, commercial too, and no credit is needed, but the assets may not be shared or sold on their own,
not as they are. So the download (Dog_001, Kitty_001, Deer_001 and their Texture_1.png) stays out of the repository, and the game ships only
copies rebuilt for it by scripts/build-pets.mjs (see its header for the three steps):

| Model (source) | Purpose | Size as it came → in the game |
| --- | --- | --- |
| dog_101 (Dog_001) | The farm's dog, front yard and lane | 996,544 → 105,820 bytes |
| cat_101 (Kitty_001) | The farm's cat, the grass across the lane | 968,688 → 103,280 bytes |
| deer_101 (Deer_001) | The deer on the village lake's east slope | 1,128,332 → 142,280 bytes |

Each keeps its walk and its idle (the run is left out), paints from the farm's palette.png (each vertex takes the farm palette's
cell nearest to the colour it read in the pack's own palette, which has a watermark over it, so none of that picture is shipped),
carries the farm's baked shade (bake-ao.py, the farm's strength and floor) and is meshopt-compressed and quantized (the village's
decoder). About 150 KB for all three as the site sends them.

## Farm animals that move (20 Oct 2026)

The farm's chickens, cows, goats, pigs, sheep and horses move (public/farm-animals.js): they graze, stand, take a few calm steps in
their own pen, and the cows and pigs lie down now and then. No animal was added or moved: each still model (below) keeps its place,
size and turn, still loads with the farm and stays as the tap target, and an animated twin takes its place once the farm is on screen.
The twins come from ithappy Studios' **Animals** pack, bought by the owner on 20 Oct 2026 (https://ithappystudios.com/). Licence: the
paid asset licence (https://ithappystudios.com/type-of-licenses/): use inside a finished game is allowed, commercial too, and the
pack has no watermark; the assets may not be shared or sold on their own, not as they are. So the download stays out of the
repository, and the game ships only copies rebuilt for it by scripts/build-farm-animals.mjs (see its header for the three steps): one
file a kind, with the kind's colours as separate meshes on one skeleton and its clips once (idle, walk, eat, lie for the cow and the
pig, the goat's and the chick's gesture; no run), painted from the farm's palette.png, with the farm's baked shade, meshopt-compressed and quantized.

| Model (source) | Takes the place of | Size as it came → in the game |
| --- | --- | --- |
| chicken_101: hen_brown (Chicken_01, its orange painted brown), hen_white (Chicken_02) | chicken_001; chicken_003 | 921,880 → 69,116 bytes |
| chick_101: chick_yellow (Chick_01) | chicken_002 (the scenery's two chicks) | 400,152 → 51,436 bytes |
| cow_101: cow_black (Cow_01), cow_brown (Cow_02) | cow_001; cow_003 | 1,420,524 → 118,320 bytes |
| goat_101: goat_white (Goat_01), goat_grey (Goat_01 painted grey) | goat_001; goat_002 | 585,648 → 103,052 bytes |
| pig_101: pig_pink (Pig_03), pig_peach (Pig_02) | pig_003; pig_002, pig_005 | 1,252,032 → 114,844 bytes |
| sheep_101: sheep_white (Sheep_01), sheep_grey (Sheep_02), sheep_cream (Sheep_01, white face and legs) | sheep_001; sheep_002; sheep_003 | 1,292,168 → 103,248 bytes |
| horse_101: horse_bay (Horse_01), horse_black (Horse_02), horse_chestnut (Horse_05, its mane dark) | horse_002, horse_005; horse_004; horse_003 | 1,805,676 → 127,924 bytes |
| duck_101: duck_white (Duck_01) | nothing: the duck on the farm's pond (22 Oct 2026), new | 583,964 → 63,952 bytes |
| donkey_101: donkey_grey (Donkey_01), donkey_brown (Donkey_02) | nothing: the Donkey Stable's two donkeys and the one with the cart (27 Oct 2026), new; horse_002 stands in as the still one | 1,419,068 → 108,684 bytes |

687 KB for all seven files (about 253 KB as the site sends them, brotli-packed). They are not among the models the loading bar waits for,
not loaded with reduced motion or when the browser asks to save data, and a kind that cannot load keeps its still models.

The duck (22 Oct 2026, the owner: "zet de eend hier bij, doet verder niks") is the one animal added: it mostly floats on the farm's pond and now and then paddles a calm stretch
(public/farm-duck.js), only to look at (no tap, nothing saved). Built by the same script with `KIND=duck_101`: only its swim and its
float (swim_idle) are kept; its walk, idle, gesture and run are left out. It loads once the farm is on screen, not with reduced motion,
simple graphics or Save-Data.

The donkeys (27 Oct 2026, the owner's level-64 Donkey Stable): two in the stable's pen, walking like the farm's other animals
(public/farm-animals.js), and the grey one pulling the farm's cart (dray_003) up and down the trunk road (public/farm-donkey-cart.js), only
to look at. Built by the same script with `KIND=donkey_101`: idle and walk only (the pack's donkey gesture stamps a hoof).

The village's animals (27 Oct 2026, public/village-animals.js: pigeons on the square, two roe deer and a fox by the Lumber Camp, a cat with three kittens by the Canteen) come from the same paid pack, rebuilt by scripts/build-village-animals.mjs as above (pigeon_101: Pigeon_01-03; roedeer_101: Roe_Deer_01-02; fox_101: Fox_01; housecat_101: Cat_04; kitten_101: Kitty_03 painted a lighter ginger, Kitty_01, Kitty_02; 6,165,636 → 547,584 bytes for the five files), only to look at.

## The farmer (20 Oct 2026)

Every player's own 3D farmer (since 21 Oct 2026 their own character: it walks on their farm and in the village, and the painted
avatars stay their picture), from ithappy Studios' **Creative Characters** pack, bought by the owner on 20 Oct 2026
(https://ithappystudios.com/). Licence: the paid asset licence (https://ithappystudios.com/type-of-licenses/): use inside a finished game
is allowed, commercial too, and the pack has no watermark; the assets may not be shared or sold on their own, not as they are. So the
download (Creative_Characters.blend, its .fbx and .glb zips) stays out of the repository, and the game ships only copies rebuilt for it:

- `scripts/farmer-export.py` (Blender, on a copy of the .blend): the skeleton (44 bones), the 413 wearable meshes back at the
  skeleton's own spot, a little of the farm's baked shade on every part (how open each point is against the part itself and the bare
  body, softer than the farm's: strength .5, floor .55), and six of the pack's 31 clips, as one .glb. Left out: the pack's showcase
  board ("Frame": 22 empty rectangles and their text labels) and the 160 unrigged "Heads" that stand behind the faces on that board.
- `scripts/build-farmer.mjs`: `public/assets/farmer/farmer-rig.glb` (the skeleton with idle, look, relaxed, walk on the spot and a
  small hop for a tap, 94 KB), one meshopt-packed, quantized file a mesh in `public/assets/farmer/parts/` (413 files, 6.8 MB in all,
  4-118 KB each; a farmer loads only the 4 to 8 it wears), and `farmer.webp` (the pack's colour picture at 512 px in the farm's look:
  every colour half way to the nearest of the farm's palette.png and a little less saturated, 25 KB). It also measures the catalog into
  `game/farmer-parts.js` (the parts, their groups, which go together, free or earned).
- `scripts/build-farmer-pictures.mjs` (the game's own code in a muted headless Chrome): a picture sheet a slot for My farmer
  (`thumbs/`, only the parts it offers, 12 files, 127 KB) and My farmer's own picture (`public/assets/icons/my-farmer.webp`).
