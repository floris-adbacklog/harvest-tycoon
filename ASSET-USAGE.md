# Harvest Tycoon — asset usage

The supplied upload is a GLB pack. The game loads selected GLB models directly in Three.js; it does not load OBJ files or the entire demo scene.

This update loads **72 distinct model files**, up from 55. Loading every variation would increase mobile download and rendering costs without necessarily improving play. Existing crops and buildings keep their models.

| Additional models | Purpose |
| --- | --- |
| landscape_004, landscape_008, mountain_008, mountain_009 | Hills and the distant valley ridge |
| field_004, field_005 | Green and golden neighbouring fields; scenery, with no misleading crop timers |
| bridge_001 | Bridge across the pond |
| horse_002, pig_001 | Animal paddock; tap for animal-care activities |
| truck_005 | Moving delivery truck; tap for delivery orders |
| harvester_001 | Moving combine on a neighbouring field; tap for tractor controls |
| lawn_mower_001, house_024 | Workshop and its hands-on repair activity |
| trailer_001 | Parked equipment beside the workshop |
| fir_tree_003, tree_008, stone_fence_001 | Forest edges and low boundary walls |

The existing greenhouse_003 and apiary_001 now open real repeatable activities. The pond surface, water ripples, bees and reward particles are simple generated geometry. All scenery stays outside camera-fit measurements; the four activity stations are included so the useful farm remains easy to reach.

The 3D assets are from the user-supplied ithappy Studios Farm pack: https://ithappystudios.com/environment/farm/
