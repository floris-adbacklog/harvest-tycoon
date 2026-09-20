# Reproduce the map thumbnail from the supplied GLB, using its embedded material atlas.
# Requires numpy, Pillow and matplotlib. This is a model render, not generated artwork.
import json,struct,io
from pathlib import Path
import numpy as np
from PIL import Image
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
root=Path(__file__).resolve().parents[1]/'public/assets'
for name,model in [('familyhall-model','house_008')]:
 data=(root/'models'/f'{model}.glb').read_bytes();length=struct.unpack_from('<I',data,12)[0];g=json.loads(data[20:20+length]);binary=data[28+length:]
 def accessor(i):
  a=g['accessors'][i];b=g['bufferViews'][a['bufferView']];dt={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1'}[a['componentType']];n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']];offset=b.get('byteOffset',0)+a.get('byteOffset',0);stride=b.get('byteStride',np.dtype(dt).itemsize*n)
  return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=offset,strides=(stride,np.dtype(dt).itemsize)).copy()
 polys=[];colors=[];depths=[]
 for mesh in g['meshes']:
  for p in mesh['primitives']:
   v=accessor(p['attributes']['POSITION']);v=v@np.array([[0,0,-1],[0,1,0],[1,0,0]],dtype=float);tri=accessor(p['indices']).reshape(-1,3);verts=v[tri]
   mat=g['materials'][p.get('material',0)]['pbrMetallicRoughness'];bc=mat.get('baseColorFactor',[1,1,1,1]);c=np.tile(bc,(len(tri),1))
   if 'baseColorTexture' in mat:
    tex=g['textures'][mat['baseColorTexture']['index']];im=g['images'][tex['source']];b=g['bufferViews'][im['bufferView']];off=b.get('byteOffset',0);pic=np.array(Image.open(io.BytesIO(binary[off:off+b['byteLength']])).convert('RGBA'))/255
    uv=accessor(p['attributes']['TEXCOORD_0'])[tri].mean(1);xy=(uv*np.array([pic.shape[1]-1,pic.shape[0]-1])).round().astype(int);xy[:,0]=np.clip(xy[:,0],0,pic.shape[1]-1);xy[:,1]=np.clip(xy[:,1],0,pic.shape[0]-1);c=pic[xy[:,1],xy[:,0]]
   normals=np.cross(verts[:,1]-verts[:,0],verts[:,2]-verts[:,0]);normals/=np.maximum(np.linalg.norm(normals,axis=1,keepdims=True),1e-9);c[:,:3]*=(.75+.25*np.abs(normals@np.array([.3,.85,.4])))[:,None];c=np.clip(c,0,1)
   screen=np.stack([(v[:,0]-v[:,2])*.707,v[:,1]*.866-(v[:,0]+v[:,2])*.354],axis=1);polys.extend(screen[tri]);colors.extend(c);depths.extend(((verts[:,:,0]+verts[:,:,2])*.612+verts[:,:,1]*.5).mean(1))
 order=np.argsort(depths);poly=np.array(polys)[order];fig,ax=plt.subplots(figsize=(2.56,2.56),dpi=200);ax.add_collection(PolyCollection(poly,facecolors=np.array(colors)[order],edgecolors='none',antialiased=True));ax.autoscale();ax.set_aspect('equal');ax.margins(.08);ax.axis('off');fig.subplots_adjust(0,0,1,1);fig.savefig(root/'icons'/f'{name}.png',transparent=True);plt.close(fig)
 print(name,len(polys),'faces')
