// The farm's light through the day, by the farmer's local time (used by farm-atmosphere.js): fresh in the morning, warmer towards
// the evening, always daylight. Sun and sky colours, their strength, the haze, and how far the sun has turned from noon (radians).
// The light through the day (local time). Nights borrow the morning, so the farm is never dark.
// 7 Oct 2026: the farm should look fun and cheerful. Halfway between the fresh daylight of before (a little flat) and the painted
// valley of 6 Oct (too dark and too strong): a slightly warmer sun and a bright sky, so the shade is soft and the farm stays sunny.
const MORNING={sun:0xffedce,sunI:3.25,sky:0xddeeff,ground:0x758b42,hemiI:2.05,haze:0xdcedee,turn:-.35};
const NOON={sun:0xffe3b7,sunI:3.45,sky:0xdcebff,ground:0x778b40,hemiI:1.95,haze:0xdeede6,turn:0};
const EVENING={sun:0xffd094,sunI:3.5,sky:0xece3f1,ground:0x7e8a40,hemiI:1.9,haze:0xefe4d3,turn:.35};
const DAY=[[0,MORNING],[9,MORNING],[12,NOON],[16,NOON],[19,EVENING],[21,EVENING],[23,MORNING],[24,MORNING]];
const mixHex=(a,b,t)=>[16,8,0].reduce((hex,shift)=>{const x=a>>shift&255,y=b>>shift&255;return hex|Math.round(x+(y-x)*t)<<shift;},0);
export function daylightAt(hour){
 const h=((hour%24)+24)%24;let i=0;while(i<DAY.length-2&&DAY[i+1][0]<=h)i++;
 const [h0,a]=DAY[i],[h1,b]=DAY[i+1],t=h1>h0?Math.min(1,Math.max(0,(h-h0)/(h1-h0))):0;
 const out={};for(const key of Object.keys(a))out[key]=/I$|turn/.test(key)?a[key]+(b[key]-a[key])*t:mixHex(a[key],b[key],t);
 return out;
}
