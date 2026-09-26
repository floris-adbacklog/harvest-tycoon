// The farm's light through the day, by the farmer's local time (used by farm-atmosphere.js): fresh in the morning, warmer towards
// the evening, always daylight. Sun and sky colours, their strength, the haze, and how far the sun has turned from noon (radians).
// The light through the day (local time). Nights borrow the morning, so the farm is never dark.
const MORNING={sun:0xfff3dc,sunI:3,sky:0xe2f1ff,ground:0x6f8c46,hemiI:2.1,haze:0xdcecf0,turn:-.35};
const NOON={sun:0xffeccb,sunI:3.2,sky:0xe4f0ff,ground:0x6f8c46,hemiI:2,haze:0xdcebea,turn:0};
const EVENING={sun:0xffd6a0,sunI:3.3,sky:0xf1e9f2,ground:0x788b45,hemiI:1.95,haze:0xeee3d6,turn:.35};
const DAY=[[0,MORNING],[9,MORNING],[12,NOON],[16,NOON],[19,EVENING],[21,EVENING],[23,MORNING],[24,MORNING]];
const mixHex=(a,b,t)=>[16,8,0].reduce((hex,shift)=>{const x=a>>shift&255,y=b>>shift&255;return hex|Math.round(x+(y-x)*t)<<shift;},0);
export function daylightAt(hour){
 const h=((hour%24)+24)%24;let i=0;while(i<DAY.length-2&&DAY[i+1][0]<=h)i++;
 const [h0,a]=DAY[i],[h1,b]=DAY[i+1],t=h1>h0?Math.min(1,Math.max(0,(h-h0)/(h1-h0))):0;
 const out={};for(const key of Object.keys(a))out[key]=/I$|turn/.test(key)?a[key]+(b[key]-a[key])*t:mixHex(a[key],b[key],t);
 return out;
}
