import * as THREE from 'three';
import {tileableNoise} from './scene-polish.js';
import {daylightAt} from './daylight.js';

// Life in the air, all of it cheap: cloud shadows drifting over the land, and light that follows the farmer's own clock: fresh in
// the morning, warmer towards the evening, but always daylight. Decorative only: never part of a hit test, never in the map
// picture, and the clouds stay away when motion is reduced. (No chimney smoke: none of the pack's buildings has a chimney.)

// Soft, see-through patches of shade; tiled, so the same few clouds wander over the whole valley.
function cloudTexture(size,rand){
 const n=tileableNoise(size,3,rand),m=tileableNoise(size,7,rand),c=document.createElement('canvas');c.width=c.height=size;
 const ctx=c.getContext('2d'),img=ctx.createImageData(size,size);
 for(let i=0;i<size*size;i++){
  const v=.7*n[i]+.3*m[i],a=Math.min(1,Math.max(0,(v-.52)/.2));
  img.data[i*4]=28;img.data[i*4+1]=44;img.data[i*4+2]=38;img.data[i*4+3]=Math.round(a*a*(3-2*a)*255*.2);
 }
 ctx.putImageData(img,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;return t;
}

export function createAtmosphere({scene,renderer,sun,hemi,reducedMotion=false,mobile=false,clock=()=>new Date()}){
 let seed=20260926;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 // Cloud shadows: one flat, see-through sheet just above the ground and the fields, moving slowly with the wind.
 const clouds=new THREE.Group();clouds.name='Cloud shadows';clouds.userData.polish=true;scene.add(clouds);
 let cloudMap=null;
 if(!reducedMotion){
  cloudMap=cloudTexture(mobile?96:128,rand);cloudMap.repeat.set(400/64,400/64);
  const sheet=new THREE.Mesh(new THREE.PlaneGeometry(400,400),new THREE.MeshBasicMaterial({map:cloudMap,transparent:true,depthWrite:false}));
  sheet.rotation.x=-Math.PI/2;sheet.position.y=.28;sheet.renderOrder=2;clouds.add(sheet);
 }
 // Daylight.
 const baseSun=sun.position.clone(),up=new THREE.Vector3(0,1,0);let lastTurn=null,lastLight=0;
 function applyDaylight(){
  const d=clock(),light=daylightAt(d.getHours()+d.getMinutes()/60);
  sun.color.setHex(light.sun);sun.intensity=light.sunI;hemi.color.setHex(light.sky);hemi.groundColor.setHex(light.ground);hemi.intensity=light.hemiI;
  scene.fog?.color.setHex(light.haze);renderer.setClearColor(light.haze);
  if(lastTurn===null||Math.abs(light.turn-lastTurn)>.004){sun.position.copy(baseSun).applyAxisAngle(up,light.turn);lastTurn=light.turn;renderer.shadowMap.needsUpdate=true;}
 }
 applyDaylight();
 return {
  // Called twice a second; the light is looked at once a minute.
  tick(now=Date.now()){if(now-lastLight>60000){lastLight=now;applyDaylight();}},
  animate(t,dt){if(cloudMap){cloudMap.offset.x+=dt*.018;cloudMap.offset.y+=dt*.011;}},
  // The map picture shows the farm itself, without passing clouds.
  hide(hidden){clouds.visible=!hidden;}
 };
}
