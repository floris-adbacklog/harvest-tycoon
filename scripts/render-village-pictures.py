# The pictures of World II's later places and landmarks (Oct 2026, 512 px, WebP): the pack's models drawn like the village's first place
# pictures (mine.webp ... farmroad.webp): flat faces in the palette's colour, lit .75+.25|n.L| as render-family-hall-thumbnail.py, from the
# game's side (x and z toward the viewer), with a depth buffer, framed to 86% and graded 1.33*c^1.6 (fitted on smithy.webp, pack
# Building_015: outline 0.989, colour within 0.05). Needs numpy and Pillow only.
#   python3 scripts/render-village-pictures.py assets-source/village/Village_Summer_glb/Separate_assets_glb <extras out>/models <out> [name ...]
#   for f in <out>/*.png; do cwebp -q 82 -alpha_q 100 -m 6 "$f" -o public/assets/icons/$(basename "${f%.png}").webp; done
import json,struct,sys,math,os
import numpy as np
from PIL import Image
pack,extras,out=sys.argv[1:4];root=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','public','assets','models')
PAL=np.array(Image.open(os.path.join(root,'village-palette.png')).convert('RGB'))/255
P=lambda n:os.path.join(pack,n+'.glb');E=lambda n:os.path.join(extras,n+'.glb');F=lambda n:os.path.join(root,n+'.glb')
# The Village Fields (11 Oct 2026), as the village draws them (public/village-scene.js createVillageFields): four strips of the farm's
# ploughed field (field_004 in its ploughed brown) in the farm's cream fence (fence_008) with a gate at the front, and from the back
# lavender (green clumps with purple spikes), flax (green stalks under soft blue flowers), potatoes (green plants, a few white flowers) and
# saffron (low lilac flowers), each the farm's own plants and wildflowers in straight rows, in the same colours. In game units, on a
# shorter plot with fewer plants 1.6 times as big, so the four crops still read at pin size. The old picture's hay barn is left out: the
# plot is the place now, and beside a barn it shrank to half the pin. ('bloom', colour) is the farm's wildflower (scene-polish.js
# wildflowerGeometry), drawn below.
def fields(big=1.6):
    W,D,edge,gap,rows=5.2,3.9,.22,.16,3;depth=(D-2*edge-3*gap)/4;L=W-2*edge
    fence=lambda x,z,turn,l:(F('fence_008'),x,0,z,turn,(l/2.35,.3,.3),'f2e2bd')
    items=[fence(-W/2+(i+.5)*W/7,D/2,0,W/7) for i in range(7) if i!=1]+[fence(-W/2+(i+.5)*W/7,-D/2,0,W/7) for i in range(7)]
    items+=[fence(x,-D/2+(i+.5)*D/6,-math.pi/2,D/6) for i in range(6) for x in (-W/2,W/2)]
    # (step, [(model or 'bloom', height or size, colour, tufts a clump)]) from the back strip to the front
    crops=[(.3,[('plant_010',.2,None,3),('plant_010',.34,'9470d2',4)]),(.28,[('plant_010',.28,None,1),('bloom',1.15,'8acaff',1)]),
           (.38,[('plant_005',.22,'49be4c',1),('bloom',.65,'fffdf4',1)]),(.3,[('plant_010',.14,None,1),('bloom',.95,'9470d2',1)])]
    for strip,(step,parts) in enumerate(crops):
        z0=-D/2+edge+strip*(depth+gap);n=int((L-.3)/step)+1;x0=-L/2+(L-(n-1)*step)/2
        items.append((F('field_004'),0,-.035,z0+depth/2,0,(L/490.7,.12/27.3,depth/268.5),'9c7a52'))
        for r in range(rows):
            for i in range(n):
                j=strip*997+r*131+i;x=x0+i*step;z=z0+.1+(depth-.2)*(r+.5)/rows;yaw=(j*2.4)%(2*math.pi)
                for model,h,colour,bush in parts:
                    if model=='bloom':
                        # The potatoes' few white flowers stand over their leaves; flax and saffron have as many again between the plants.
                        if colour=='fffdf4':
                            if i%2==0:items.append((('bloom',colour),x,.1*big,z,yaw,h*big,None))
                            continue
                        items.append((('bloom',colour),x,0,z,yaw,h*big,None))
                        if i<n-1:items.append((('bloom',colour),x+step/2,0,z+((j*7)%5/4-.5)*.08,yaw+1.3,h*big*.9,None))
                        continue
                    for t in range(bush):
                        a=yaw+t*2.4;d=.04 if bush>1 else 0
                        items.append((F(model),x+math.cos(a)*d,0,z+math.sin(a)*d,yaw+t*1.7,big*h/(1.0996 if model=='plant_010' else .4258)*(.85+.15*(t%2) if bush>1 else 1),colour))
    return items
# The Great Hall and the Stone quay (10 Oct 2026) are built of the pack's parts as VILLAGE_EXTRAS places them, (model, x, y, z, turn) in
# metres of the pack: the Hall's two wings and its bell tower of three storeys under a cross roof, with a porch, stone steps and the
# village's stone footings; the quay's stone slabs (the village's steps, foundation_010) with dry-stone walls, goods and a boat.
T=math.pi
HALL=([('Building_Angle_002',0,1.3+4.45*k,0,r) for k in range(3) for r in (0,T)]+[('Building_Angle_Roof_002',0,10.2,0,r) for r in (0,T)]
 +[(n,0,1.3,s*z,0 if s>0 else T) for s in (1,-1) for n,z in (('Building_Window_002',6.19),('Building_Door_002',11.55),('Building_Roof_002',6.19),('Building_Roof_002',11.55))]
 +[('foundation_002',0,0,s*9,T/2) for s in (1,-1)]+[('foundation_002',0,0,0,0),('Building_Small_Window_002',1.35,6.4,0,0),('Building_Small_Window_002',0,6.4,1.35,-T/2)]
 +[('Building_Canopy_002',5.4,1.3,0,T/2),('foundation_010',8,0,0,T/2)])
QUAY=([('foundation_010',-4.7*i,0,s*1.55,0 if s>0 else T) for i in range(3) for s in (1,-1)]
 +[('stones_015',-4.7,.6,-2.6,0),('stones_015',-2.65,-.34,3.45,0),('stones_015',-6.75,-.36,3.6,T)]
 +[('props_055',-.6,1.45,-.9,0),('props_018',1.3,1.45,-.5,.3),('props_018',1.4,2.45,-.4,.6),('props_044',1.6,1.45,.8,0),('props_022',-4,1.45,-.6,.2),('props_023',-5.7,.25,5.6,T/2)])
PICTURES={   # name: [(file, x, y, z, turn, size, colour or None)], metres of the pack
 'villagefields':fields(),
 'canteen':[(P('Building_029'),0,0,0,0,1,None),(E('props_054'),-6,0,4,0,1,None),(E('props_044'),-7.2,0,2.6,0,1,None),(E('props_044'),-5.6,0,5.6,.8,1,None)],
 'kiln':[(P('Building_010'),0,0,0,0,1,None),(E('props_063'),5,0,3,0,1,None),(E('props_073'),-1,0,6.5,0,1,None),(E('props_056'),3,0,5.5,0,1,None),(E('props_059'),4.2,0,6,1,1,None),(E('props_061'),6.5,0,6,0,1,None)],
 'linenloft':[(P('Building_014'),0,0,0,0,1,None),(E('props_034'),-9,0,7,0,1,None),(E('props_034'),-3,0,9,0,1,None)],
 'soapmaker':[(P('Building_040'),0,0,0,0,1,None),(E('props_039'),5,0,3,0,1,None),(E('props_039'),6,0,1.5,.7,1,None),(P('props_020'),3.8,0,4.2,0,1,None)],
 'pier':[(P('Building_007'),0,0,0,0,1,None),(P('props_023'),-6,.2,10,.4,1,None),(E('props_070'),14,4.4,0,0,1,None)],
 'jeweller':[(P('Building_028'),0,0,0,0,1,None),(E('props_062'),5.5,0,5.5,-.6,1,None)],
 'landmark-windpump':[(E('Building_022'),0,0,0,0,1,None),(P('props_020'),2.5,0,2.5,0,1,None)],
 'landmark-longhouse':[(E('Building_017_012'),0,0,0,0,1,None)],
 'landmark-stonequay':[(E(n),x,y,z,r,1,None) for n,x,y,z,r in QUAY],
 'landmark-lookout':[(E('Building_005'),0,0,0,0,1,None)],
 # Turned an eighth (11 Oct 2026): the tower in the middle between both wings, so at pin size it reads as a hall, not as the Miners'
 # Canteen's yellow house under red roofs.
 'landmark-greathall':[(E(n),math.cos(-T/4)*x+math.sin(-T/4)*z,y,-math.sin(-T/4)*x+math.cos(-T/4)*z,r-T/4,1,None) for n,x,y,z,r in HALL],
}
CT={5126:'<f4',5123:'<u2',5125:'<u4',5121:'u1',5122:'<i2',5120:'i1'};NC={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def read(path):
    d=open(path,'rb').read();jl=struct.unpack_from('<I',d,12)[0];j=json.loads(d[20:20+jl]);b=d[28+jl:]
    def acc(i):
        a=j['accessors'][i];bv=j['bufferViews'][a['bufferView']];dt=np.dtype(CT[a['componentType']]);n=NC[a['type']]
        off=bv.get('byteOffset',0)+a.get('byteOffset',0);st=bv.get('byteStride',dt.itemsize*n)
        v=np.ndarray((a['count'],n),dtype=dt,buffer=b,offset=off,strides=(st,dt.itemsize)).astype(np.float64)
        return v/np.iinfo(dt).max if a.get('normalized') else v
    def mat(nd):
        if 'matrix' in nd:return np.array(nd['matrix'],dtype=np.float64).reshape(4,4).T
        t=nd.get('translation',[0,0,0]);x,y,z,w=nd.get('rotation',[0,0,0,1]);s=nd.get('scale',[1,1,1])
        R=np.array([[1-2*(y*y+z*z),2*(x*y-z*w),2*(x*z+y*w)],[2*(x*y+z*w),1-2*(x*x+z*z),2*(y*z-x*w)],[2*(x*z-y*w),2*(y*z+x*w),1-2*(x*x+y*y)]]);M=np.eye(4);M[:3,:3]=R*np.array(s);M[:3,3]=t;return M
    parents={c:i for i,n in enumerate(j['nodes']) for c in n.get('children',[])};T=[];U=[]
    for i,nd in enumerate(j['nodes']):
        if 'mesh' not in nd:continue
        M=mat(nd);k=i
        while k in parents:k=parents[k];M=mat(j['nodes'][k])@M
        for p in j['meshes'][nd['mesh']]['primitives']:
            pos=np.einsum('ij,nj->ni',M[:3,:3],acc(p['attributes']['POSITION']))+M[:3,3]
            idx=acc(p['indices']).astype(int).reshape(-1,3) if 'indices' in p else np.arange(len(pos)).reshape(-1,3)
            T.append(pos[idx]);U.append(acc(p['attributes']['TEXCOORD_0'])[idx].mean(1))
    return np.concatenate(T),np.concatenate(U)
# The farm's wildflower (scene-polish.js wildflowerGeometry): a stem with two leaves, five petals in the flower's colour round a golden heart,
# 0.26 tall; the stem's and the heart's vertex colours (linear in the game) as they show on screen.
def bloom(colour):
    top,T,C=.24,[],[];stem,heart,petal=(.68,.81,.55),(1,.88,.48),tuple(int(colour[i:i+2],16)/255 for i in (0,2,4))
    ring=lambda n,i,r,y:(math.cos(i/n*2*math.pi)*r,y,math.sin(i/n*2*math.pi)*r)
    for t in ([(-.012,0,0),(.012,0,0),(0,top,0)],[(0,.02,0),(.075,.09,.02),(.03,.06,-.015)],[(0,.03,0),(-.07,.1,-.02),(-.025,.07,.02)]):T.append(t);C.append(stem)
    for k in range(10):T.append([(0,top+.004,0),ring(10,k+1,.09 if k%2 else .042,top+(.014 if k%2 else 0)),ring(10,k,.042 if k%2 else .09,top+(0 if k%2 else .014))]);C.append(petal)
    for k in range(5):T.append([(0,top+.032,0),ring(5,k+1,.034,top+.01),ring(5,k,.034,top+.01)]);C.append(heart)
    return np.array(T,dtype=np.float64),np.array(C)
READ={}
def render(items,path,N=1024):
    V=[];C=[]
    for f,x,y,z,r,s,tint in items:
        if f not in READ:READ[f]=bloom(f[1]) if isinstance(f,tuple) else read(f)
        v,uv=READ[f];c,sn=math.cos(r),math.sin(r);R=np.array([[c,0,sn],[0,1,0],[-sn,0,c]])
        V.append(np.einsum('ij,ntj->nti',R,v*np.array(s if isinstance(s,tuple) else (s,s,s)))+np.array([x,y,z]))
        if isinstance(f,tuple):C.append(uv);continue
        xy=np.clip(((uv%1)*1023).round().astype(int),0,1023)
        C.append(np.tile([int(tint[i:i+2],16)/255 for i in (0,2,4)],(len(v),1)) if tint else PAL[xy[:,1],xy[:,0]])
    V=np.concatenate(V);C=np.concatenate(C)
    n=np.cross(V[:,1]-V[:,0],V[:,2]-V[:,0]);n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-12)
    C=C*(.75+.25*np.abs(n@np.array([-.4,.85,.3])))[:,None]
    SX=(V[...,0]-V[...,2])*.707;SY=V[...,1]*.866-(V[...,0]+V[...,2])*.354;D=(V[...,0]+V[...,2])*.612+V[...,1]*.5
    size=max(SX.max()-SX.min(),SY.max()-SY.min())/.86;cx=(SX.max()+SX.min())/2;cy=(SY.max()+SY.min())/2
    X=((SX-cx)/size+.5)*N;Y=(.5-(SY-cy)/size)*N;zb=np.full((N,N),-1e18);rgb=np.zeros((N,N,3))
    for i in range(len(V)):
        x0,y0,x1,y1,x2,y2=X[i,0],Y[i,0],X[i,1],Y[i,1],X[i,2],Y[i,2];area=(x1-x0)*(y2-y0)-(x2-x0)*(y1-y0)
        if abs(area)<1e-9:continue
        a0,a1=int(max(0,np.floor(min(x0,x1,x2)))),int(min(N-1,np.ceil(max(x0,x1,x2))));b0,b1=int(max(0,np.floor(min(y0,y1,y2)))),int(min(N-1,np.ceil(max(y0,y1,y2))))
        if a1<a0 or b1<b0:continue
        px,py=np.meshgrid(np.arange(a0,a1+1)+.5,np.arange(b0,b1+1)+.5)
        w0=((x1-px)*(y2-py)-(x2-px)*(y1-py))/area;w1=((x2-px)*(y0-py)-(x0-px)*(y2-py))/area;w2=1-w0-w1
        m=(w0>=-1e-6)&(w1>=-1e-6)&(w2>=-1e-6)
        if not m.any():continue
        dep=w0*D[i,0]+w1*D[i,1]+w2*D[i,2];sub=zb[b0:b1+1,a0:a1+1];m&=dep>sub;sub[m]=dep[m];rgb[b0:b1+1,a0:a1+1][m]=C[i]
    rgb=np.clip(1.33*rgb**1.6,0,1);alpha=zb>-1e17
    Image.fromarray(np.dstack([rgb*255,alpha*255]).astype(np.uint8),'RGBA').resize((512,512),Image.LANCZOS).save(path)
os.makedirs(out,exist_ok=True)
for name in (sys.argv[4:] or PICTURES):render(PICTURES[name],os.path.join(out,name+'.png'));print(name)
