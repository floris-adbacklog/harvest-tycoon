# Your own farm layout (World 1)

The owner, 24 Oct 2026: "dat alles gewoon een grasveld is en je zelf bomen, roads, velden en gebouwen kan plaatsen, alleen het water
staat vast". After the research the owner picked option 2: move everything on World 1, plus land that opens per level, with trees,
bushes and rocks on it that you clear. World 2 (the village) stays as it is.

The owner's rules:
- Moving is allowed from the start (level 1).
- Clearing a tree, bush or rock costs coins and gives a little XP.
- Land opens by level by itself.
- Trees and path tiles can be bought for coins, and stored again.
- Not live until the owner says so ("Zet nog niks live"): branch free-layout, lab harness only.

## How it works

- A new farm starts with today's farm, exactly as it looks now. Nothing changes until you move something.
- **What moves:** every yard (a building with its pens, fences, props and animals) moves as one piece, as farm-layout.js zone()
  already builds it. Every field moves on its own. So do the trees and path tiles you bought.
- **What stays:** the pond (water), the farmhouse (the camera's home and the farmer's start) and the roads that are there today.
  Today's roads can later be cut into tiles you can move.
- **Land:** pieces with a level (the valley by level: middle from the start, west at 25, east at 50, plus outer edges). You can only
  move or place onto open land. Something that stands on unopened land from the start (for example the Glasshouse at 40 in the east)
  stays usable where it stands.
- **Obstacles:** on open land, the loose trees, bushes and rocks are in the way. Tap one to clear it for coins (+XP), and it is gone
  for good. Small tufts and flowers just vanish under what you place.

## The split between the rules and the screen

- **The rules (game/farm-map.js + farm-state.js, the same on the server):** which things exist and can move, which land is open at
  which level, the water box, prices, the saved layout. The actions are layout_move, layout_clear, layout_buy, layout_store and
  layout_place, all instant (no diamonds).
- **The screen only:** overlap between things, worked out from the real 3D pieces (yard footprints are the boxes of their pieces). The
  server does not know those shapes. A cheat could only overlap their own buildings, which gains nothing.
- **Saved:** state.layout = {v:1, at:{id:[x,z]}, cleared:[ids], added:[{id,kind,x,z}], stored:{kind:n}, n}. It is a new save key
  (RELEASE: site first, wait about 40 min, then farm-api; differential-test the old code on new saves; never roll back).

## How the screen does it

- The farm is built as now (decorate, asBefore, scenery: untouched). Then the layout is applied: each moved yard's pieces (tagged
  userData.yard while their zone was current) move by the difference. Views (buildings, utilities, activities) get their new x,z, the
  pens and the pastures are measured again, and loose scenery under a moved piece is hidden.
- **Edit mode:** a Move button (in More from the start; a HUD button once the calm start is over).
  1. Tap something: it lifts and shows its footprint, green where it fits and red where it doesn't.
  2. Drag it to move it (snapped to a 0.5 grid). Dragging the ground moves the camera.
  3. ✓ saves, ✕ puts it back. Done leaves edit mode.
- **Camera:** the fields view looks at the fields' own box, and the pan limits come from the open land.

## Milestones

1. Rules and data: layout_move, yard and field positions from the layout, and edit mode for yards and fields. Shown in the lab.
2. Land pieces by level (locked land shown) and obstacles to clear for coins.
3. Buying trees and path tiles, and storing them.
4. Polish: the farmer and pets walk around what moved, the camera, the wiki, translations, tests, RELEASE.md.
