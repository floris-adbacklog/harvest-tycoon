# Harvest Tycoon — asset usage

The supplied upload is a GLB pack. The game loads selected GLB models directly in Three.js; it does not load OBJ files or the entire demo scene.

The game now loads **75 distinct model files**, up from 55. Loading every variation would increase mobile download and rendering costs without necessarily improving play. Existing crops and buildings keep their models.

| Additional models | Purpose |
| --- | --- |
| landscape_004, landscape_008, mountain_008, mountain_009 | Hills and the distant valley ridge |
| field_004, field_005 | Green and golden neighbouring fields; scenery, with no misleading crop timers |
| bridge_001 | Bridge across the pond |
| horse_002, pig_001 | Animal paddock; tap for animal-care activities |
| lawn_mower_001, house_024 | Workshop and its hands-on repair activity |
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
