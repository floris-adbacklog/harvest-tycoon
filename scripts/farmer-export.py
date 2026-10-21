# The farmer's parts out of ithappy Studios' Creative Characters pack (20 Oct 2026, the owner: "Doe 2"; a paid licence, see
# ASSET-USAGE.md; the pack itself stays out of the repository). One .glb with the pack's skeleton, every wearable part bound to it at
# the skeleton's own spot, and the few clips the farm plays; scripts/build-farmer.mjs cuts that into the game's small files.
#   blender -b --factory-startup <copy of Creative_Characters.blend> --python scripts/farmer-export.py -- <out.glb> [--rig-only]
# --rig-only: only the skeleton and its clips (no parts, no baked shade: a few seconds), for build-farmer.mjs --rig-only, which writes
# only farmer-rig.glb (a new clip without building the 413 parts again).
# Open a copy of the pack's .blend, never the download itself: this script moves and deletes things in the open file (it never saves).
# What the .blend holds besides the parts, and is left out here:
#  - "Frame": the pack's own showcase board, 22 empty rectangles (8 points, no material) round each group and their text labels
#    ("Hat", "Outwear", "Happy", ...). Nothing to wear and nothing to draw.
#  - "Heads": 160 unrigged heads with a fixed hair, standing behind the 80 faces on that board so the faces can be seen. Not parts: the
#    head is part of every Body, and a face is worn on it.
import bpy, sys, math, mathutils

args = sys.argv[sys.argv.index('--') + 1:]
out, RIG_ONLY = args[0], '--rig-only' in args
PARTS = ['Body', 'Faces', 'Hairstyle', 'Hairstyle Single', 'Hat', 'Hat Single', 'Glasses', 'Gloves', 'Face Accessories',
         'Outwear', 'Outfit', 'Costumes', 'Mascots', 'Pants', 'Shorts', 'Shoes', 'Socks']
# The clips the farm plays (the run, the fights, the falls and the rest stay out). Walk_Forward walks forward 1.48 m a cycle (the build
# keeps it on the spot); Jump_Start and Jump_End become one small hop for a tap (build-farmer.mjs).
CLIPS = ['Idle_Breathing', 'Idle_Look_Around', 'Idle_Relaxed', 'Walk_Forward', 'Jump_Start', 'Jump_End']

skeleton = bpy.data.objects['Skeleton']
keep = {skeleton}
for name in ([] if RIG_ONLY else PARTS):
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
# Clips of our own (21 Oct 2026, the owner: "Doe alles behalve 9", items 3 and 4): the pack has no sitting, waving or dancing, so they
# are keyframed here on the pack's own skeleton, from the first pose of Idle_Breathing. A pose is a list of steps, parents first: aim a
# bone (its length) along a direction of the world, or turn it round an axis of the world through its own head; the farmer faces -Y
# (the farm's +z), their right hand is at -X, up is +Z. Each clip is 30 frames a second, like the pack's.
bpy.context.view_layer.update()
pb = skeleton.pose.bones
for b in pb:
    b.rotation_mode = 'QUATERNION'
ad0 = skeleton.animation_data_create()
ad0.action = bpy.data.actions['Idle_Breathing']
if hasattr(ad0, 'action_slot') and ad0.action.slots:
    ad0.action_slot = ad0.action.slots[0]
bpy.context.scene.frame_set(int(ad0.action.frame_range[0]))
bpy.context.view_layer.update()
BASE = {b.name: (b.location.copy(), b.rotation_quaternion.copy(), b.scale.copy()) for b in pb}
ad0.action = None
TO_ARM = skeleton.matrix_world.to_3x3().inverted()
V = mathutils.Vector
def base_pose():
    for b in pb:
        loc, rot, sc = BASE[b.name]
        b.location = loc; b.rotation_quaternion = rot; b.scale = sc
    bpy.context.view_layer.update()
def about_head(b, q):
    head = b.matrix.to_translation()
    b.matrix = mathutils.Matrix.Translation(head) @ q.to_matrix().to_4x4() @ mathutils.Matrix.Translation(-head) @ b.matrix
    bpy.context.view_layer.update()
def aim(name, direction):
    b = pb[name]
    now = b.matrix.col[1].xyz.normalized(); want = (TO_ARM @ V(direction)).normalized()
    about_head(b, now.rotation_difference(want))
def turn(name, axis, degrees):
    about_head(pb[name], mathutils.Quaternion((TO_ARM @ V(axis)).normalized(), math.radians(degrees)))
def lift(name, up):
    b = pb[name]
    b.matrix = mathutils.Matrix.Translation(TO_ARM @ V((0, 0, up))) @ b.matrix
    bpy.context.view_layer.update()
def foot_z():
    return min((skeleton.matrix_world @ pb[n].head).z for n in ('LeftFoot', 'RightFoot'))
REST_FOOT = None
def clip(name, keys):
    # keys: [(frame, [steps]), ...]; a step is a function. Every bone is keyed at every key, so nothing drifts in between.
    global REST_FOOT
    action = bpy.data.actions.new(name)
    skeleton.animation_data.action = action
    for frame, steps in keys:
        base_pose()
        for step in steps:
            step()
        for b in pb:
            b.keyframe_insert('rotation_quaternion', frame=frame)
            b.keyframe_insert('location', frame=frame)
    skeleton.animation_data.action = None
    return action
base_pose(); REST_FOOT = foot_z()
def seated():
    # Sitting (item 3): the thighs forward, the shins down, the hips lowered until the feet are on the ground again; hands on the knees.
    for side in ('Left', 'Right'):
        turn(side + 'UpLeg', (1, 0, 0), -84)
    for side in ('Left', 'Right'):
        turn(side + 'Leg', (1, 0, 0), 80)
    lift('Hips', REST_FOOT - foot_z())
    for side, x in (('Left', 1), ('Right', -1)):
        aim(side + 'Arm', (x * .22, -.3, -.92)); aim(side + 'ForeArm', (x * .05, -.82, -.57))
def breathe(up):
    def step():
        turn('Spine1', (1, 0, 0), up)
    return step
clip('Farmer_Sit', [(1, [seated]), (45, [seated, breathe(-2)]), (90, [seated])])
skeleton.animation_data.action = None
# The skeleton at its rest pose: the parts are bound there.
skeleton.animation_data_clear()
for b in skeleton.pose.bones:
    b.location = (0, 0, 0); b.rotation_quaternion = (1, 0, 0, 0); b.rotation_euler = (0, 0, 0); b.scale = (1, 1, 1)
# A little baked shade (21 Oct 2026, the owner: so the farmer does not stand out from the farm's models, which all carry theirs): per
# point of each part, how open it is (rays over its outside half, up to SHADE_REACH), against the part itself and the bare body (a
# collar round the neck, the inside of a hat brim, the armpits), at rest. Written as the farm's shade (scripts/model-shade/apply-ao.mjs,
# softer: SHADE_STRENGTH, SHADE_FLOOR) into a grey colour the exporter writes as COLOR_0. Faces are painted on: no shade of their own.
SHADE_RAYS, SHADE_REACH, SHADE_STRENGTH, SHADE_FLOOR = 24, .2, .5, .55
for lc in bpy.context.view_layer.layer_collection.children:
    lc.exclude = False; lc.hide_viewport = False
bpy.context.view_layer.update()
from mathutils.bvhtree import BVHTree
import random
rng = random.Random(20261021)
# Fixed directions over the half sphere round +Z, more of them near the top (cosine-weighted).
UP = []
for i in range(SHADE_RAYS):
    u, v = (i + .5) / SHADE_RAYS, rng.random()
    r, a = math.sqrt(u), 2 * math.pi * v
    UP.append(mathutils.Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0, 1 - u)))))
depsgraph = bpy.context.evaluated_depsgraph_get()
body_tree = None if RIG_ONLY else BVHTree.FromObject(bpy.data.objects['Body_001'], depsgraph)
shades = {}
for o in sorted(keep - {skeleton}, key=lambda x: x.name):
    me = o.data
    key = (len(me.vertices), tuple(round(c, 4) for c in me.vertices[0].co)) if len(me.vertices) else None
    if o['part'] == 'Faces':
        values = [1.0] * len(me.vertices)
    elif key in shades:
        values = shades[key]
    else:
        own = BVHTree.FromObject(o, depsgraph)
        trees = [own] if o['part'] == 'Body' else [own, body_tree]
        values = []
        for vert in me.vertices:
            n = vert.normal.normalized(); p = vert.co + n * .004
            turn = mathutils.Vector((0, 0, 1)).rotation_difference(n)
            hit = 0
            for d in UP:
                ray = turn @ d
                if any(t.ray_cast(p, ray, SHADE_REACH)[0] is not None for t in trees):
                    hit += 1
            ao = 1 - hit / SHADE_RAYS
            values.append(max(SHADE_FLOOR, 1 - SHADE_STRENGTH * (1 - ao)))
        shades[key] = values
    for old in list(me.color_attributes):
        me.color_attributes.remove(old)
    attr = me.color_attributes.new('shade', 'FLOAT_COLOR', 'POINT')
    for i, s in enumerate(values):
        attr.data[i].color = (s, s, s, 1)
    me.color_attributes.active_color = attr
print('SHADE', len(shades), 'shapes')
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
                          export_materials='EXPORT', export_image_format='AUTO', export_cameras=False, export_lights=False,
                          export_vertex_color='ACTIVE')
