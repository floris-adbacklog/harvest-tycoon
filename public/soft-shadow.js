import * as THREE from 'three';

// The soft round shadow under what walks on the farm: the pets, the farmers and the animals (25 Oct 2026, the owner: the game faster on
// slower phones and computers). The sun's shadow map is drawn again only when the farm itself changes (game.js), so whatever walks casts
// none into it: this patch on the ground goes with it at every frame instead. width along x, depth along z (the patch lies flat);
// strength: how dark (the pets and the farmers .68, the animals 1: without it they seemed to float in their sandy pens). It lies a little
// above the ground (.05), clear of the pens' sand and the yards' patches.
let texture=null;
export function softShadow(width,depth=width,strength=.68){
 if(!texture){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),r=g.createRadialGradient(32,32,4,32,32,31);
  r.addColorStop(0,'rgba(40,52,24,.62)');r.addColorStop(.55,'rgba(40,52,24,.42)');r.addColorStop(1,'rgba(40,52,24,0)');g.fillStyle=r;g.fillRect(0,0,64,64);
  texture=new THREE.CanvasTexture(c);
 }
 const m=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:strength,depthWrite:false}));
 m.rotation.x=-Math.PI/2;m.position.y=.05;m.renderOrder=1;m.castShadow=false;m.receiveShadow=false;m.userData.softShadow=true;return m;
}
