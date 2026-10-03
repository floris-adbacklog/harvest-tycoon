# Bakes soft shade (ambient occlusion) per vertex for each GLB and writes <name>.ao.json: one list per primitive, one value per
# vertex (1 = open, 0 = fully occluded). A ground plane under the model adds the shade where it meets the ground.
# SRC=<glb dir> OUT=<json dir> [ONLY=name,name] [SAMPLES=96] [DIST=.22] blender -b --factory-startup --python bake-ao.py
# Then apply-ao.mjs writes the shade into the models (see ASSET-USAGE.md).
# The village (Oct 2026): SRC=<folder with village.glb from scripts/build-village.mjs> OUT=<json dir> LAYOUT=<its village-layout.json>
# bakes World II as it stands and writes village.ao.json, which build-village.mjs then writes into the village (ASSET-USAGE.md).
import bpy, json, struct, os, sys, math
import numpy as np
src, out = os.environ['SRC'], os.environ['OUT']
only = set(filter(None, os.environ.get('ONLY', '').split(',')))
CT = {5120: np.int8, 5121: np.uint8, 5122: np.int16, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4, 'MAT4': 16}
def read_glb(path):
    b = open(path, 'rb').read()
    jl = struct.unpack_from('<I', b, 12)[0]; j = json.loads(b[20:20 + jl])
    off = 20 + jl; bl = struct.unpack_from('<I', b, off)[0]; binc = b[off + 8: off + 8 + bl]
    def acc(i):
        a = j['accessors'][i]; bv = j['bufferViews'][a['bufferView']]; n = NC[a['type']]; dt = np.dtype(CT[a['componentType']])
        start = bv.get('byteOffset', 0) + a.get('byteOffset', 0); stride = bv.get('byteStride', 0) or dt.itemsize * n
        raw = np.frombuffer(binc, dtype=np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=start)
        rows = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], dt.itemsize * n), strides=(stride, 1)).copy()
        v = rows.view(dt).reshape(a['count'], n)
        # A quantized file (KHR_mesh_quantization, the village) stores positions as normalized integers.
        return np.maximum(v / float(np.iinfo(dt).max), -1.0) if a.get('normalized') else v
    return j, acc
def node_matrix(nd):
    if 'matrix' in nd: return np.array(nd['matrix'], dtype=np.float64).reshape(4, 4).T
    t = nd.get('translation', [0, 0, 0]); r = nd.get('rotation', [0, 0, 0, 1]); s = nd.get('scale', [1, 1, 1])
    x, y, z, w = r
    R = np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
    M = np.eye(4); M[:3, :3] = R * np.array(s); M[:3, 3] = t; return M
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences; prefs.compute_device_type = 'METAL'; prefs.get_devices()
    for d in prefs.devices: d.use = True
    sc.cycles.device = 'GPU'
except Exception as e: print('cpu', e)
sc.cycles.samples = int(os.environ.get('SAMPLES', '128'))
sc.render.bake.target = 'VERTEX_COLORS'
if not sc.world: sc.world = bpy.data.worlds.new('W')
mat = bpy.data.materials.new('bake')
lay = os.environ.get('LAYOUT')
if lay:
    # The village holds every model once (at the origin) and the objects that are no separate model under "static"; the layout
    # says where each model stands. All of it is baked at once where it stands: a roof gets its shade from the house under it
    # instead of from a ground plane, a door from its wall, a tree from the hill it stands on. A model drawn in many places gets
    # the mean of its shade over them. One distance for all of it, the farm's largest (2.5 m).
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    j, acc = read_glb(os.path.join(src, 'village.glb'))
    parents = {c: i for i, nd in enumerate(j['nodes']) for c in nd.get('children', [])}
    def world(i):
        M = node_matrix(j['nodes'][i])
        while i in parents: i = parents[i]; M = node_matrix(j['nodes'][i]) @ M
        return M
    def subtree(i):
        yield i
        for c in j['nodes'][i].get('children', []): yield from subtree(c)
    places = {}
    for p in json.load(open(lay)): places.setdefault(p['a'], []).append(np.array(p['m'], dtype=np.float64).reshape(4, 4).T)
    V, F, spans, n0 = [], [], [], 0
    for r in j['scenes'][j.get('scene', 0)]['nodes']:
        name = j['nodes'][r].get('name'); at = [np.eye(4)] if name == 'static' else places.get(name, [])
        for ni in subtree(r):
            if 'mesh' not in j['nodes'][ni]: continue
            W, mi = world(ni), j['nodes'][ni]['mesh']
            for pi, p in enumerate(j['meshes'][mi]['primitives']):
                pos = acc(p['attributes']['POSITION']).astype(np.float64)
                tri = (acc(p['indices']).ravel() if 'indices' in p else np.arange(len(pos))).astype(np.int64).reshape(-1, 3)
                for P in at:
                    M = P @ W; V.append(pos @ M[:3, :3].T + M[:3, 3])
                    F.append((tri[:, ::-1] if np.linalg.det(M[:3, :3]) < 0 else tri) + n0)   # a mirrored place turns its triangles round
                    spans.append((f'{mi}:{pi}', n0, len(pos))); n0 += len(pos)
    V = np.concatenate(V); mn, mx = V.min(0), V.max(0); L = float(max(mx - mn)); y0 = mn[1] - 1
    V = np.concatenate([V, [[mn[0]-L, y0, mn[2]-L], [mx[0]+L, y0, mn[2]-L], [mx[0]+L, y0, mx[2]+L], [mn[0]-L, y0, mx[2]+L]]])
    F = np.concatenate(F + [np.array([[n0, n0+3, n0+2], [n0, n0+2, n0+1]])])
    me = bpy.data.meshes.new('village'); me.vertices.add(len(V)); me.vertices.foreach_set('co', V.astype(np.float32).ravel())
    me.loops.add(F.size); me.loops.foreach_set('vertex_index', F.astype(np.int32).ravel())
    me.polygons.add(len(F)); me.polygons.foreach_set('loop_start', np.arange(0, F.size, 3, dtype=np.int32))
    me.update(calc_edges=True); me.polygons.foreach_set('use_smooth', np.ones(len(F), dtype=bool)); me.update()
    ob = bpy.data.objects.new('village', me); sc.collection.objects.link(ob); ob.data.materials.append(mat)
    ca = me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT'); me.color_attributes.active_color = ca
    sc.world.light_settings.distance = 2.5
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = np.empty(len(me.vertices) * 4, dtype=np.float32); ca.data.foreach_get('color', col); ao = col.reshape(-1, 4)[:, 0]
    total, count = {}, {}
    for k, b, n in spans: total[k] = total.get(k, 0) + ao[b:b + n]; count[k] = count.get(k, 0) + 1
    json.dump({'distance': 2.5, 'ao': {k: (total[k] / count[k]).round(3).tolist() for k in total}}, open(os.path.join(out, 'village.ao.json'), 'w'))
    print('BAKED village', n0, 'vertices', len(total), 'parts', 'mean', round(float(ao[:n0].mean()), 3), flush=True)
    print('ALLDONE'); sys.exit(0)
files = sorted(f for f in os.listdir(src) if f.endswith('.glb') and (not only or f[:-4] in only))
for f in files:
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
    j, acc = read_glb(os.path.join(src, f))
    # world transform of each node that carries a mesh
    parents = {c: i for i, nd in enumerate(j['nodes']) for c in nd.get('children', [])}
    def world(i):
        M = node_matrix(j['nodes'][i])
        while i in parents: i = parents[i]; M = node_matrix(j['nodes'][i]) @ M
        return M
    verts, faces, spans = [], [], []  # spans: (mesh, prim, start, count) in the joined vertex list
    seen = set()
    for ni, nd in enumerate(j['nodes']):
        if 'mesh' not in nd: continue
        M = world(ni)
        for pi, p in enumerate(j['meshes'][nd['mesh']]['primitives']):
            pos = acc(p['attributes']['POSITION']).astype(np.float64)
            pos = (np.c_[pos, np.ones(len(pos))] @ M.T)[:, :3]
            idx = acc(p['indices']).ravel() if 'indices' in p else np.arange(len(pos))
            base = len(verts); verts.extend(pos.tolist())
            tri = idx.reshape(-1, 3) + base; faces.extend(tri.tolist())
            key = (nd['mesh'], pi)
            spans.append((key, base, len(pos), key in seen)); seen.add(key)
    V = np.array(verts); mn, mx = V.min(0), V.max(0); size = mx - mn; big = float(max(size))
    # ground plane just under the model (glTF is Y-up)
    L = big * 4; y0 = mn[1] - big * 0.002; gb = len(verts)
    verts += [[mn[0]-L, y0, mn[2]-L], [mx[0]+L, y0, mn[2]-L], [mx[0]+L, y0, mx[2]+L], [mn[0]-L, y0, mx[2]+L]]
    faces += [[gb, gb+3, gb+2, gb+1]]
    me = bpy.data.meshes.new('m'); me.from_pydata(verts, [], faces); me.update()
    for poly in me.polygons: poly.use_smooth = True
    ob = bpy.data.objects.new('o', me); sc.collection.objects.link(ob); ob.data.materials.append(mat)
    ca = me.color_attributes.new('AO', 'FLOAT_COLOR', 'POINT'); me.color_attributes.active_color = ca
    sc.world.light_settings.distance = float(min(2.5, max(0.08, big * float(os.environ.get('DIST', '0.22')))))
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    col = np.empty(len(me.vertices) * 4, dtype=np.float32); ca.data.foreach_get('color', col); ao = col.reshape(-1, 4)[:, 0]
    result = {}
    for (key, base, n, dup) in spans:
        k = f'{key[0]}:{key[1]}'; vals = ao[base:base + n]
        result[k] = (np.minimum(result[k], vals) if dup and k in result else vals).round(3).tolist() if not dup else np.minimum(np.array(result[k]), vals).round(3).tolist()
    json.dump({'distance': sc.world.light_settings.distance, 'size': size.round(3).tolist(), 'ao': result}, open(os.path.join(out, f[:-4] + '.ao.json'), 'w'))
    print('BAKED', f, len(verts) - 4, 'dist', round(sc.world.light_settings.distance, 3), 'mean', round(float(ao[:gb].mean()), 3), 'min', round(float(ao[:gb].min()), 3), flush=True)
print('ALLDONE')
