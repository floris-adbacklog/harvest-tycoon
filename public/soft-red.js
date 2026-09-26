// The buildings' red in the colour palette of the models (model-atlas.js), made a little lighter and a little less intense.
// Red swatches only (hue within 15° of red, clearly coloured, not already light): a little lighter and a little less intense.
export function softenRed(data){
 for(let i=0;i<data.length;i+=4){
  const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  if(d<.2||max!==r||l>=.62)continue;
  const s=d/(1-Math.abs(2*l-1));let h=((g-b)/d)*60;if(h<0)h+=360;
  if(h>15&&h<345)continue;
  const nl=l+(.62-l)*.45,ns=s*.88,c=(1-Math.abs(2*nl-1))*ns,x=c*(1-Math.abs((h/60)%2-1)),m=nl-c/2;
  const [rr,gg,bb]=h<60?[c,x,0]:[c,0,x];
  data[i]=Math.round((rr+m)*255);data[i+1]=Math.round((gg+m)*255);data[i+2]=Math.round((bb+m)*255);
 }
 return data;
}
