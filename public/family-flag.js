// The family flag (27 Sep 2026): a farmer in a Farm Family sees its flag by the Family Hall. A low-poly wooden pole with a gold
// knob and a cloth in the family colour that waves gently, with the family emblem and its level in a gold badge on it. The cloth
// picture (a small canvas) is only redrawn when the family, its emblem or its level changes; the wave moves 44 vertices a frame.
import * as THREE from 'three';
import {FAMILY_EMBLEMS} from './farm-state.js';
import {artSource} from './visual-icons.js';

const W=256,H=160;   // the cloth picture
const images=new Map();
function load(src){
 if(!images.has(src))images.set(src,new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=()=>resolve(img);img.onerror=()=>resolve(null);img.src=src;}));
 return images.get(src);
}
export function familyFlagKey(family){return family?.familyId?`${family.familyId}:${family.emblem}:${family.level??1}`:'';}
const shade=(hex,f)=>{const n=parseInt(hex.slice(1),16),c=[n>>16,n>>8&255,n&255].map(v=>Math.round(Math.min(255,Math.max(0,v*f))));return `rgb(${c.join(',')})`;};
export async function drawFamilyCloth(canvas,family){
 const ctx=canvas.getContext('2d'),emblem=FAMILY_EMBLEMS.find(e=>e.id===family.emblem)??FAMILY_EMBLEMS[0];
 // The family colour with a soft fold of light, a gold border and a darker hem.
 const grad=ctx.createLinearGradient(0,0,W,H);grad.addColorStop(0,shade(emblem.color,1.12));grad.addColorStop(1,shade(emblem.color,.88));
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 ctx.lineWidth=10;ctx.strokeStyle='#e9bd4c';ctx.strokeRect(5,5,W-10,H-10);
 ctx.lineWidth=2;ctx.strokeStyle='#9c6d1c';ctx.strokeRect(11,11,W-22,H-22);
 // The emblem on a cream round patch in the middle.
 const cx=W*.5,cy=H*.5,r=H*.34;
 ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle='#fff6df';ctx.fill();ctx.lineWidth=5;ctx.strokeStyle='#e9bd4c';ctx.stroke();
 const source=artSource(emblem.icon),picture=source&&await load(source.src);
 if(picture){const cell=picture.naturalWidth/source.columns,sx=(source.index%source.columns)*cell,sy=Math.floor(source.index/source.columns)*cell,d=r*1.5;ctx.drawImage(picture,sx,sy,cell,cell,cx-d/2,cy-d/2,d,d);}
 // The family level in a gold badge at the free end.
 const bx=W*.84,by=H*.74,br=H*.13;
 ctx.beginPath();ctx.arc(bx,by,br,0,Math.PI*2);ctx.fillStyle='#f0c24f';ctx.fill();ctx.lineWidth=3;ctx.strokeStyle='#8a5a17';ctx.stroke();
 ctx.fillStyle='#4a2d08';ctx.font=`800 ${Math.round(br*1.3)}px Outfit, 'DM Sans', sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(family.level??1),bx,by+1);
}
// A flag standing at (x, z), `height` world units tall, turned by `turn` radians. update(family) shows, hides or redraws it;
// tick(seconds) makes the cloth wave (call it every frame while it is visible).
export function createFamilyFlag(scene,x,z,{height=3.4,turn=0}={}){
 const group=new THREE.Group();group.position.set(x,0,z);group.rotation.y=turn;group.visible=false;
 const wood=new THREE.MeshStandardMaterial({color:0x8a5a2b,roughness:.8,flatShading:true}),gold=new THREE.MeshStandardMaterial({color:0xe2b33e,roughness:.45,metalness:.3,flatShading:true});
 const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.075,height,7),wood);pole.position.y=height/2;
 const knob=new THREE.Mesh(new THREE.IcosahedronGeometry(.12,0),gold);knob.position.y=height+.08;
 const foot=new THREE.Mesh(new THREE.CylinderGeometry(.18,.24,.14,7),wood);foot.position.y=.07;
 const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 const cw=1.95,ch=cw*H/W,geometry=new THREE.PlaneGeometry(cw,ch,10,3);geometry.translate(cw/2,0,0);
 const rest=geometry.attributes.position.array.slice();
 const cloth=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,roughness:.9}));
 cloth.position.set(.05,height-ch/2-.08,0);
 for(const part of [pole,knob,foot,cloth]){part.castShadow=true;part.receiveShadow=false;group.add(part);}
 scene.add(group);
 let shown='';
 return {group,
  async update(family){
   const key=familyFlagKey(family);if(key===shown)return;shown=key;
   if(!key){group.visible=false;return;}
   await drawFamilyCloth(canvas,family);if(shown!==key)return;
   texture.needsUpdate=true;group.visible=true;
  },
  // A soft wave that grows towards the free end of the cloth.
  tick(t){
   if(!group.visible)return;
   const p=geometry.attributes.position.array;
   for(let i=0;i<p.length;i+=3){const u=rest[i]/cw;p[i+2]=rest[i+2]+Math.sin(t*2.4-rest[i]*3.2)*.09*u+Math.sin(t*1.3+rest[i+1]*2)*.025*u;}
   geometry.attributes.position.needsUpdate=true;
  }};
}
