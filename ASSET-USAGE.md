# Harvest Tycoon — asset usage

The supplied upload is a GLB pack. The game loads selected GLB models directly in Three.js; it does not load OBJ files or the entire demo scene.

The game now loads **75 distinct model files**, up from 55. Loading every variation would increase mobile download and rendering costs without necessarily improving play. Existing crops and buildings keep their models.

| Additional models | Purpose |
| --- | --- |
| mountain_008 | The distant valley ridge |
| field_004, field_005 | Green and golden neighbouring fields; scenery, with no misleading crop timers |
| horse_002, pig_001 | Animal paddock; tap for animal-care activities |
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
