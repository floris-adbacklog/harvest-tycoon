// Convert screen movement into the fixed isometric camera's horizontal ground plane.
export function cameraDragDelta(dx,dy,spanX,spanY,width,height){
 const elevation=40/Math.hypot(36,40,36);
 return {side:-dx*spanX/width/Math.SQRT2,depth:-dy*spanY/height/Math.SQRT2/elevation};
}

// All pointers commit on release. Dragging moves the farm, except a drag that starts on a field with work to do (a ripe crop, water,
// care): that one swipes, and every field the finger passes over gets the same work (sweep: {action,add,end}).
export function bindFarmInput({canvas,isReady,pick,open,pan,zoom,sweep=null}){
 const pointers=new Map();
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 function release(event,cancelled=false){
  const point=pointers.get(event.pointerId);if(!point)return;
  pointers.delete(event.pointerId);
  if(point.sweep?.started)sweep.end(point.sweep.action,point.sweep.ids);
  else if(!cancelled&&!point.moved&&!point.multi){
   const target=pick(event);
   if(target&&target.type===point.target?.type&&target.id===point.target.id){
    open(target);
   }
  }
  if(cancelled)for(const other of pointers.values())other.multi=true;
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
 }
 canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||!isReady())return;
  event.preventDefault();canvas.setPointerCapture(event.pointerId);
  const target=pick(event);
  const action=target?.type==='plot'&&sweep?sweep.action(target):null;
  const point={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,target,moved:false,multi:false,threshold:event.pointerType==='touch'?12:8,sweep:action?{action,ids:[],started:false}:null};
  pointers.set(event.pointerId,point);
  if(pointers.size>1){for(const item of pointers.values()){item.multi=true;if(item.sweep&&!item.sweep.started)item.sweep=null;}return;}
 });
 canvas.addEventListener('pointermove',event=>{
  const point=pointers.get(event.pointerId);if(!point)return;
  event.preventDefault();
  const previous={x:point.x,y:point.y};
  const pair=[...pointers.values()].filter(p=>p!==point)[0];
  const before=pair?distance(point,pair):0,oldCenter=pair?midpoint(point,pair):null;
  point.x=event.clientX;point.y=event.clientY;
  if(Math.hypot(point.x-point.startX,point.y-point.startY)>point.threshold)point.moved=true;
  // A swipe: every field under the finger since the last move (checked every few pixels, so a quick swipe misses none).
  if(point.sweep&&!point.multi){
   if(!point.moved)return;
   const s=point.sweep;
   if(!s.started){s.started=true;s.ids.push(point.target.id);sweep.add(point.target);}
   const steps=Math.max(1,Math.ceil(Math.hypot(point.x-previous.x,point.y-previous.y)/10));
   for(let i=1;i<=steps;i++){
    const over=pick({clientX:previous.x+(point.x-previous.x)*i/steps,clientY:previous.y+(point.y-previous.y)*i/steps});
    if(over?.type==='plot'&&!s.ids.includes(over.id)&&s.ids.length<60&&sweep.action(over)===s.action){s.ids.push(over.id);sweep.add(over);}
   }
   return;
  }
  if(pair){
   const center=midpoint(point,pair);pan(center.x-oldCenter.x,center.y-oldCenter.y);
   if(before>8)zoom(distance(point,pair)/before);
   return;
  }
  if(point.moved||point.multi)pan(point.x-previous.x,point.y-previous.y);
 });
 // The mouse wheel (and a trackpad pinch, which arrives as a wheel event with ctrlKey) zooms, towards the pointer.
 canvas.addEventListener('wheel',event=>{
  if(!isReady())return;
  event.preventDefault();
  const step=event.deltaMode===1?event.deltaY*16:event.deltaMode===2?event.deltaY*400:event.deltaY;
  const ratio=Math.exp(-Math.max(-120,Math.min(120,step))*(event.ctrlKey?.01:.0015));
  zoom(ratio,event.clientX,event.clientY);
 },{passive:false});
 canvas.addEventListener('pointerup',event=>release(event));
 canvas.addEventListener('pointercancel',event=>release(event,true));
 canvas.addEventListener('lostpointercapture',event=>release(event,true));
 return {cancel(){for(const [id] of pointers)release({pointerId:id},true);}};
}
