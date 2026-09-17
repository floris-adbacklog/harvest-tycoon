// Convert screen movement into the fixed isometric camera's horizontal ground plane.
export function cameraDragDelta(dx,dy,spanX,spanY,width,height){
 const elevation=40/Math.hypot(36,40,36);
 return {side:-dx*spanX/width/Math.SQRT2,depth:-dy*spanY/height/Math.SQRT2/elevation};
}

// All pointers commit on release. Dragging moves the farm, never works a field.
export function bindFarmInput({canvas,isReady,pick,open,pan,zoom}){
 const pointers=new Map();
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const midpoint=(a,b)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
 function release(event,cancelled=false){
  const point=pointers.get(event.pointerId);if(!point)return;
  pointers.delete(event.pointerId);
  if(!cancelled&&!point.moved&&!point.multi){
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
  const point={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,target,moved:false,multi:false};
  pointers.set(event.pointerId,point);
  if(pointers.size>1){for(const item of pointers.values())item.multi=true;return;}
 });
 canvas.addEventListener('pointermove',event=>{
  const point=pointers.get(event.pointerId);if(!point)return;
  event.preventDefault();
  const previous={x:point.x,y:point.y};
  const pair=[...pointers.values()].filter(p=>p!==point)[0];
  const before=pair?distance(point,pair):0,oldCenter=pair?midpoint(point,pair):null;
  point.x=event.clientX;point.y=event.clientY;
  if(Math.hypot(point.x-point.startX,point.y-point.startY)>8)point.moved=true;
  if(pair){
   const center=midpoint(point,pair);pan(center.x-oldCenter.x,center.y-oldCenter.y);
   if(before>8)zoom(distance(point,pair)/before);
   return;
  }
  if(point.moved||point.multi)pan(point.x-previous.x,point.y-previous.y);
 });
 canvas.addEventListener('pointerup',event=>release(event));
 canvas.addEventListener('pointercancel',event=>release(event,true));
 canvas.addEventListener('lostpointercapture',event=>release(event,true));
 return {cancel(){for(const [id] of pointers)release({pointerId:id},true);}};
}
