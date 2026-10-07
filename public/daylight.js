// The farm's light through the day, by the farmer's local time (used by farm-atmosphere.js): fresh in the morning, warmer towards
// the evening, always daylight. Sun and sky colours, their strength, the haze, and how far the sun has turned from noon (radians).
// The light through the day (local time). Nights borrow the morning, so the farm is never dark.
// 6 Oct 2026, the look of the loading screen's painted valley: a warmer, stronger sun and less fill from the sky, so shadows and
// the deep greens of the trees give the farm depth; the grass itself keeps its green (game.js sets it for this light).
const MORNING={sun:0xffe6bf,sunI:3.7,sky:0xd8ebff,ground:0x7a8a3e,hemiI:1.6,haze:0xdcedeb,turn:-.35};
const NOON={sun:0xffd9a3,sunI:3.95,sky:0xd3e6ff,ground:0x7f8a3a,hemiI:1.5,haze:0xdfeee2,turn:0};
const EVENING={sun:0xffc988,sunI:4,sky:0xe6dcef,ground:0x84883a,hemiI:1.45,haze:0xefe4cf,turn:.35};
const DAY=[[0,MORNING],[9,MORNING],[12,NOON],[16,NOON],[19,EVENING],[21,EVENING],[23,MORNING],[24,MORNING]];
const mixHex=(a,b,t)=>[16,8,0].reduce((hex,shift)=>{const x=a>>shift&255,y=b>>shift&255;return hex|Math.round(x+(y-x)*t)<<shift;},0);
export function daylightAt(hour){
 const h=((hour%24)+24)%24;let i=0;while(i<DAY.length-2&&DAY[i+1][0]<=h)i++;
 const [h0,a]=DAY[i],[h1,b]=DAY[i+1],t=h1>h0?Math.min(1,Math.max(0,(h-h0)/(h1-h0))):0;
 const out={};for(const key of Object.keys(a))out[key]=/I$|turn/.test(key)?a[key]+(b[key]-a[key])*t:mixHex(a[key],b[key],t);
 return out;
}
