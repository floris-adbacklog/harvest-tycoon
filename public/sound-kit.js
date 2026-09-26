// The farm's sound effects, synthesised once in the browser (no files, nothing to download): soil, water, leaves, coins, wood,
// bells, a little engine and a fanfare, instead of bare beeps. renderCue gives the samples of one cue at a sample rate; farm-audio.js
// turns them into a buffer the first time the cue plays. Every cue is the same each time (seeded noise) and stays below 1.5 s.

const TAU=Math.PI*2;
function seeded(seed){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2147483648-1;};}
// A two-pole band-pass (RBJ), run in place over a buffer.
function bandpass(data,rate,centre,q){
 const w=TAU*centre/rate,alpha=Math.sin(w)/(2*q),a0=1+alpha,b0=alpha/a0,b2=-alpha/a0,a1=-2*Math.cos(w)/a0,a2=(1-alpha)/a0;
 let x1=0,x2=0,y1=0,y2=0;for(let i=0;i<data.length;i++){const x=data[i],y=b0*x+b2*x2-a1*y1-a2*y2;x2=x1;x1=x;y2=y1;y1=y;data[i]=y;}return data;
}
function lowpass(data,rate,cutoff){const k=1-Math.exp(-TAU*cutoff/rate);let y=0;for(let i=0;i<data.length;i++){y+=k*(data[i]-y);data[i]=y;}return data;}

// Some cues have a few versions (CUE_VARIANTS) that take turns, so a sound heard all the time does not wear thin.
export function renderCue(kind,rate=48000,variant=0){
 const length=Math.round((CUE_LENGTH[kind]??.8)*rate),out=new Float32Array(length),rand=seeded([...kind].reduce((h,c)=>h*31+c.charCodeAt(0),7+variant*101)>>>0);
 const add=(start,data,volume=1)=>{const s=Math.round(start*rate);for(let i=0;i<data.length&&s+i<length;i++)out[s+i]+=data[i]*volume;};
 const buffer=seconds=>new Float32Array(Math.round(seconds*rate));
 // A struck bell or chime: a few inharmonic partials, the higher ones dying first.
 const bell=(f,seconds,volume=1,bright=1)=>{const b=buffer(seconds);for(let i=0;i<b.length;i++){const t=i/rate;
  b[i]=(Math.sin(TAU*f*t)*Math.exp(-t*3.2/seconds*2)+.45*bright*Math.sin(TAU*f*2.76*t)*Math.exp(-t*9/seconds)+.22*bright*Math.sin(TAU*f*5.4*t)*Math.exp(-t*16/seconds))*Math.min(1,t/.002)*volume;}return b;};
 // Noise through a band-pass, with a quick attack and an exponential decay.
 const hiss=(seconds,centre,q,decay,volume=1)=>{const b=buffer(seconds);for(let i=0;i<b.length;i++)b[i]=rand();bandpass(b,rate,centre,q);for(let i=0;i<b.length;i++){const t=i/rate;b[i]*=Math.min(1,t/.003)*Math.exp(-t/decay)*volume;}return b;};
 // A pitched sweep (a pop, a thud, a droplet).
 const sweep=(seconds,from,to,decay,volume=1,shape=Math.sin)=>{const b=buffer(seconds);let phase=0;for(let i=0;i<b.length;i++){const t=i/rate,f=from*(to/from)**(t/seconds);phase+=TAU*f/rate;b[i]=shape(phase)*Math.min(1,t/.002)*Math.exp(-t/decay)*volume;}return b;};
 // Wood: a short resonant knock.
 const knock=(f,volume=1)=>{const b=hiss(.09,f,9,.018,3);const tone=sweep(.09,f*1.02,f,.02,.5);for(let i=0;i<b.length;i++)b[i]=(b[i]+tone[i])*volume;return b;};
 // A coin: bright metal partials, each coin a little different.
 const coin=volume=>{const f=2600+rand()*900,b=buffer(.3);for(let i=0;i<b.length;i++){const t=i/rate;b[i]=(Math.sin(TAU*f*t)+.7*Math.sin(TAU*f*2.32*t)*Math.exp(-t*8)+.4*Math.sin(TAU*f*4.25*t)*Math.exp(-t*14))*Math.exp(-t*11)*Math.min(1,t/.001)*volume;}return b;};
 const hz=midi=>440*2**((midi-69)/12);
 switch(kind){
  case 'plant': // a soft thud in the soil, a crumble of earth, a little seed tick
   add(0,sweep(.14,120,62,.045,.9));add(0,hiss(.12,700,.8,.04,.5));add(.035,sweep(.03,1300,900,.008,.25));break;
  case 'water': // a splash, then droplets
   add(0,hiss(.32,1400,1.2,.09,.55));
   for(let d=0;d<5;d++)add(.04+d*.055+rand()*.02,sweep(.05,900+rand()*500,2000+rand()*900,.02,.35));break;
  case 'harvest': // a rustle of leaves, a pop as it comes free, two little bells
   add(0,hiss(.16,3200,1.5,.05,.45));add(.03,sweep(.07,480,900,.03,.6));add(.08,bell(hz(79),.5,.32));add(.16,bell(hz(84),.55,.3));break;
  case 'care': // a soft sparkle
   add(0,hiss(.35,6000,2,.12,.12));[88,91,95].forEach((m,i)=>add(i*.07,bell(hz(m),.45,.2,.6)));break;
  case 'sell': // coins
   add(0,hiss(.08,4500,1.2,.02,.2));for(let c=0;c<3;c++)add(c*.055+rand()*.015,coin(.28-c*.05));break;
  case 'produce': // a wooden clunk and a short whirr of the machine
   add(0,knock(420,.7));{const w=sweep(.34,110,190,.2,.18,p=>Math.sin(p)+.3*Math.sin(2*p)+.15*Math.sin(3*p));lowpass(w,rate,900);add(.05,w);}break;
  case 'collect': // a pop, a wooden crate, a bell
   add(0,sweep(.06,380,760,.025,.5));add(.05,knock(330,.55));add(.1,knock(470,.45));add(.12,bell(hz(81),.55,.3));add(.2,bell(hz(86),.6,.26));break;
  case 'ready': // ding-dong
   add(0,bell(hz(88),.75,.24,.7));add(.2,bell(hz(84),.85,.22,.7));break;
  case 'chore': // two knocks of a tool on wood
   add(0,knock(620,.7));add(.12,knock(560,.6));break;
  case 'upgrade': // two hammer taps, then rising chimes
   add(0,knock(900,.55));add(.1,knock(1000,.5));[79,83,86,91].forEach((m,i)=>add(.2+i*.08,bell(hz(m),.6,.24)));break;
  case 'reward': // a bright sparkle of bells
   add(0,hiss(.6,7000,2,.2,.1));[84,88,91,96].forEach((m,i)=>add(i*.085,bell(hz(m),.6,.25)));break;
  case 'diamond': // glassy shimmer
   [88,95,100].forEach((m,i)=>{add(i*.1,bell(hz(m),.8,.22,.4));add(i*.1+.004,bell(hz(m)*1.004,.8,.12,.4));});add(.05,hiss(.7,8000,3,.25,.08));break;
  case 'tractor':{
   // One stroke of a small engine: a buzzy pulse around 120-200 Hz with its overtones (phone and laptop speakers play nothing much
   // below 150 Hz, so the body of the sound sits above that) and a puff of exhaust.
   const putt=(start,f,volume)=>{const pulse=sweep(.085,f,f*.85,.035,.6,x=>Math.sign(Math.sin(x))*.55+Math.sin(x)*.3+Math.sin(2*x)*.25);lowpass(pulse,rate,2200);add(start,pulse,volume);add(start,hiss(.06,650,1.4,.022,.5),volume);};
   if(variant===1){ // the engine picks up speed, with a little pop from the exhaust at the end
    let at=0;for(let p=0;p<9;p++){putt(at,125+p*14,.55+p*.06);at+=.1-p*.007;}add(at+.02,hiss(.07,900,1.2,.015,1.1));add(at+.02,sweep(.06,160,90,.02,.5));
   }else if(variant===2){ // toot-toot on the horn over a ticking-over engine
    for(let p=0;p<5;p++)putt(p*.09,120,.6-p*.06);
    for(const [start,len] of [[.05,.12],[.23,.2]]){const f=415,b=buffer(len+.04);for(let i=0;i<b.length;i++){const t=i/rate,env=Math.min(1,t/.012)*(t<len?1:Math.exp(-(t-len)/.012));b[i]=(Math.sin(TAU*f*t)+.6*Math.sin(TAU*f*1.26*t)+.35*Math.sin(TAU*f*2*t)+.2*Math.sin(TAU*f*2.52*t))*env*.5;}lowpass(b,rate,2400);add(start,b);}
   }else for(let p=0;p<6;p++)putt(p*.075,165,1-p*.12); // putt-putt
   break;}
  case 'levelup': // a little fanfare with a bell and a shimmer on the last chord
   [[72,0,.16],[76,.14,.16],[79,.28,.16],[84,.42,.7]].forEach(([m,start,len])=>{
    const f=hz(m),b=buffer(len+.25);for(let i=0;i<b.length;i++){const t=i/rate,env=Math.min(1,t/.02)*(t<len?1:Math.exp(-(t-len)/.08))*Math.exp(-t*.9);let s=0;for(let n=1;n<=6;n++)s+=Math.sin(TAU*f*n*t)/n*(n<=3?1:.6);b[i]=s*env*.13;}
    lowpass(b,rate,3200);add(start,b);});
   add(.42,bell(hz(96),.9,.2));add(.42,hiss(.9,7500,1.5,.3,.12));break;
 }
 // Each cue as loud as the beep it replaces (a touch fuller), measured over its loudest 150 ms, which is how loud a short sound feels.
 const target=CUE_LOUDNESS[kind]??.03,now=loudness(out,rate);if(now>0){let gain=target/now,peak=0;for(const v of out)peak=Math.max(peak,Math.abs(v));gain=Math.min(gain,.5/peak);for(let i=0;i<length;i++)out[i]*=gain;}
 // A tiny fade at the very end, so no cue ever clicks.
 const fade=Math.min(length,Math.round(.01*rate));for(let i=0;i<fade;i++)out[length-1-i]*=i/fade;
 return out;
}
export const CUE_VARIANTS={tractor:3};
// Rendered at 24 kHz (half the work of 48; nothing in these sounds needs more), most frequent first (sound-worker.js).
export const SFX_RATE=24000;
export const CUE_ORDER=['harvest','plant','water','care','sell','collect','tractor','produce','ready','chore','reward','upgrade','diamond','levelup'];
export const CUE_LENGTH={plant:.25,water:.5,harvest:.75,care:.6,sell:.45,produce:.45,collect:.85,ready:1.1,chore:.3,upgrade:.9,reward:.95,diamond:1.1,tractor:1,levelup:1.45};
export const CUE_LOUDNESS={plant:.029,water:.029,harvest:.05,care:.04,sell:.032,produce:.029,collect:.047,ready:.029,chore:.029,upgrade:.053,reward:.052,diamond:.038,tractor:.034,levelup:.056};
export function loudness(data,rate){const w=Math.min(data.length,Math.round(.15*rate)),step=Math.max(1,Math.round(w/4));let best=0;for(let i=0;i+w<=data.length;i+=step){let e=0;for(let j=i;j<i+w;j++)e+=data[j]*data[j];best=Math.max(best,Math.sqrt(e/w));}return best;}
