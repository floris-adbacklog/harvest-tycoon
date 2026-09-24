// The farm from high above, in the top-left corner on a computer (it takes the logo's place; phones do not show it). The picture
// is a small render of the farm itself (game.js shootMinimap, from a steeper angle than the play camera, refreshed now and then);
// on top of it, live: a steady gold ring where something is ready, and a white frame for what is on screen now. Click or drag on it to
// move the view there, and point at a building to see its name. game.js supplies the picture, the points and the camera maths.
export function createMinimap({root,background,project,unproject,points,view,onJump}){
 const canvas=root.querySelector('canvas'),ctx=canvas.getContext('2d');
 function draw(){
  const dpr=canvas.width/Math.max(1,canvas.clientWidth||canvas.width);
  ctx.fillStyle='#b7cd86';ctx.fillRect(0,0,canvas.width,canvas.height);   // grass under the picture, so no edge ever shows white
  ctx.drawImage(background,0,0,canvas.width,canvas.height);
  for(const p of points()){
   if(!p.ready||p.locked)continue;
   const [x,y]=project(p.x,p.z);
   ctx.beginPath();ctx.arc(x,y,6.5*dpr,0,Math.PI*2);ctx.lineWidth=2.4*dpr;ctx.strokeStyle='#f5c542';ctx.stroke();
   ctx.beginPath();ctx.arc(x,y,9*dpr,0,Math.PI*2);ctx.lineWidth=1.4*dpr;ctx.strokeStyle='rgba(245,197,66,.45)';ctx.stroke();
  }
  // What is on screen now.
  const corners=view();
  if(corners?.length===4){
   ctx.beginPath();corners.forEach(([x,z],i)=>{const [a,b]=project(x,z);i?ctx.lineTo(a,b):ctx.moveTo(a,b);});ctx.closePath();
   ctx.fillStyle='rgba(255,253,245,.16)';ctx.fill();ctx.lineWidth=2*dpr;ctx.lineJoin='round';ctx.strokeStyle='rgba(255,253,245,.95)';ctx.stroke();
  }
 }
 const at=event=>{const r=canvas.getBoundingClientRect();return unproject((event.clientX-r.left)*canvas.width/r.width,(event.clientY-r.top)*canvas.height/r.height);};
 let dragging=false;
 canvas.addEventListener('pointerdown',event=>{dragging=true;canvas.setPointerCapture?.(event.pointerId);onJump(...at(event));draw();event.preventDefault();});
 canvas.addEventListener('pointermove',event=>{
  if(dragging){onJump(...at(event));draw();return;}
  const [x,z]=at(event),near=points().map(p=>({p,d:Math.hypot(p.x-x,p.z-z)})).sort((a,b)=>a.d-b.d)[0];
  canvas.title=near&&near.d<4.5?near.p.name:'Your farm · click to look there';
 });
 const stop=()=>{dragging=false;};canvas.addEventListener('pointerup',stop);canvas.addEventListener('pointercancel',stop);
 return {draw};
}
