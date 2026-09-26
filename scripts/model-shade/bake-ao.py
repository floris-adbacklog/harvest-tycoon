# Bakes soft shade (ambient occlusion) per vertex for each GLB and writes <name>.ao.json: one list per primitive, one value per
# vertex (1 = open, 0 = fully occluded). A ground plane under the model adds the shade where it meets the ground.
# SRC=<glb dir> OUT=<json dir> [ONLY=name,name] [SAMPLES=96] [DIST=.22] blender -b --factory-startup --python bake-ao.py
# Then apply-ao.mjs writes the shade into the models (see ASSET-USAGE.md).
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
        return rows.view(dt).reshape(a['count'], n)
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
