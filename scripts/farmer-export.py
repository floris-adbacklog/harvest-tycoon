# The farmer's parts out of ithappy Studios' Creative Characters pack (20 Oct 2026, the owner: "Doe 2"; a paid licence, see
# ASSET-USAGE.md; the pack itself stays out of the repository). One .glb with the pack's skeleton, every wearable part bound to it at
# the skeleton's own spot, and the few clips the farm plays; scripts/build-farmer.mjs cuts that into the game's small files.
#   blender -b --factory-startup <copy of Creative_Characters.blend> --python scripts/farmer-export.py -- <out.glb>
# Open a copy of the pack's .blend, never the download itself: this script moves and deletes things in the open file (it never saves).
# What the .blend holds besides the parts, and is left out here:
#  - "Frame": the pack's own showcase board, 22 empty rectangles (8 points, no material) round each group and their text labels
#    ("Hat", "Outwear", "Happy", ...). Nothing to wear and nothing to draw.
#  - "Heads": 160 unrigged heads with a fixed hair, standing behind the 80 faces on that board so the faces can be seen. Not parts: the
#    head is part of every Body, and a face is worn on it.
import bpy, sys, mathutils

out = sys.argv[sys.argv.index('--') + 1]
PARTS = ['Body', 'Faces', 'Hairstyle', 'Hairstyle Single', 'Hat', 'Hat Single', 'Glasses', 'Gloves', 'Face Accessories',
         'Outwear', 'Outfit', 'Costumes', 'Mascots', 'Pants', 'Shorts', 'Shoes', 'Socks']
# The clips the farm plays (the run, the fights, the falls and the rest stay out). Walk_Forward walks forward 1.48 m a cycle (the build
# keeps it on the spot); Jump_Start and Jump_End become one small hop for a tap (build-farmer.mjs).
CLIPS = ['Idle_Breathing', 'Idle_Look_Around', 'Idle_Relaxed', 'Walk_Forward', 'Jump_Start', 'Jump_End']

skeleton = bpy.data.objects['Skeleton']
keep = {skeleton}
for name in PARTS:
    for o in bpy.data.collections[name].objects:
        if o.type != 'MESH':
            continue
        # Each part stands on the board at its own spot (its object moved, its points at the skeleton's): back to the skeleton's spot.
        o.matrix_parent_inverse = mathutils.Matrix.Identity(4)
        o.location = (0, 0, 0); o.rotation_euler = (0, 0, 0); o.scale = (1, 1, 1)
        o.hide_set(False); o.hide_render = False; o.hide_viewport = False
        o.data.name = o.name
        o['part'] = name
        keep.add(o)
for o in list(bpy.data.objects):
    if o not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
for a in list(bpy.data.actions):
    if a.name not in CLIPS:
        bpy.data.actions.remove(a)
# The skeleton at its rest pose: the parts are bound there.
skeleton.animation_data_clear()
for b in skeleton.pose.bones:
    b.location = (0, 0, 0); b.rotation_quaternion = (1, 0, 0, 0); b.rotation_euler = (0, 0, 0); b.scale = (1, 1, 1)
# Each clip as an NLA track of its own, named as the clip: the exporter writes one animation a track.
ad = skeleton.animation_data_create()
for a in bpy.data.actions:
    track = ad.nla_tracks.new(); track.name = a.name
    strip = track.strips.new(a.name, int(a.frame_range[0]), a)
    if hasattr(strip, 'action_slot') and a.slots:
        strip.action_slot = a.slots[0]
for lc in bpy.context.view_layer.layer_collection.children:
    lc.exclude = False; lc.hide_viewport = False
bpy.context.view_layer.update()
print('PARTS', len(keep) - 1, 'CLIPS', [a.name for a in bpy.data.actions])
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=False, export_apply=True, export_extras=True,
                          export_yup=True, export_skins=True, export_def_bones=False, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=1,
                          export_materials='EXPORT', export_image_format='AUTO', export_cameras=False, export_lights=False)
