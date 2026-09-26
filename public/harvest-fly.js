// After a harvest (or goods collected on the farm) a few pictures fly in an arc to the Market button, which gives a small bump when the
// first one lands: the harvest goes to your stock. Screen-only (no 3D), gone when it lands, and never shown when motion is reduced.
export function flyHarvest({doc=document,from,to,html,count=3,onArrive}){
 const dx=to.x-from.x,dy=to.y-from.y,lift=Math.min(110,50+Math.abs(dx)*.12),peak=Math.min(0,dy)-lift;
 let landed=false;
 for(let i=0;i<count;i++){
  const outer=doc.createElement('div'),inner=doc.createElement('div'),spread=(i-(count-1)/2)*16;
  outer.className='harvest-fly';outer.setAttribute('aria-hidden','true');inner.className='harvest-fly-art';inner.innerHTML=Array.isArray(html)?html[i%html.length]:html;outer.append(inner);
  outer.style.left=`${from.x+spread}px`;outer.style.top=`${from.y}px`;doc.body.append(outer);
  const timing={duration:760,delay:i*90,fill:'both'};
  // Sideways at an even pace; up and down in an arc: out of the field, over the top, and down into the button.
  outer.animate([{transform:'translateX(0)'},{transform:`translateX(${dx-spread}px)`}],{...timing,easing:'cubic-bezier(.35,0,.65,1)'});
  const flight=inner.animate([
   {transform:'translateY(0) scale(.3)',opacity:0,easing:'ease-out'},
   {transform:`translateY(${-lift*.35}px) scale(1.12)`,opacity:1,offset:.18,easing:'ease-out'},
   {transform:`translateY(${peak}px) scale(1)`,offset:.5,easing:'ease-in'},
   {transform:`translateY(${dy}px) scale(.45)`,opacity:.85}
  ],timing);
  flight.finished.then(()=>{outer.remove();if(!landed){landed=true;onArrive?.();}},()=>outer.remove());
 }
}
export function bump(element){element?.animate?.([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(.97)'},{transform:'scale(1)'}],{duration:360,easing:'ease-out'});}
