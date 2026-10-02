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
  case 'snip': // one field of a sweep (Oct 2026): a quick crisp swish of leaves and a short bright pluck; farm-audio.js plays it a
   // little higher field by field
   add(0,hiss(.05,5200,1.6,.012,.6));add(.004,sweep(.03,2400,1500,.01,.25));add(.006,bell(hz(79),.16,.3,.5));break;
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
  case 'chorebonus': // the same knocks, then two rising bells and a sparkle: an extra resource turned up
   add(0,knock(620,.7));add(.12,knock(560,.6));add(.24,bell(hz(84),.45,.3));add(.33,bell(hz(91),.5,.3));add(.3,hiss(.35,6500,2,.1,.12));break;
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
   }else{ // the engine starts: the starter whirs, the engine catches and runs
    {const w=sweep(.34,240,330,.3,.35,x=>Math.sin(x)+.5*Math.sin(2*x)+.3*Math.sin(3*x));for(let i=0;i<w.length;i++)w[i]*=.6+.4*Math.sin(TAU*14*i/rate);lowpass(w,rate,1800);add(0,w);}
    add(.3,hiss(.08,900,1.2,.02,1));let at=.34;for(let p=0;p<6;p++){putt(at,150+p*6,.9-p*.08);at+=.085;}
   }
   break;}
  // 27 Sep 2026: every moment that was silent or borrowed another's sound got its own.
  case 'construct': // a new building: three hammer blows, two strokes of a saw, then a bright little ta-da
   add(0,knock(900,.6));add(.12,knock(1000,.55));add(.24,knock(940,.6));
   add(.36,hiss(.14,2600,2.5,.08,.45));add(.52,hiss(.14,2300,2.5,.08,.4));
   [79,84,91].forEach((m,i)=>add(.72+i*.1,bell(hz(m),.6+i*.1,.26-i*.01)));add(.9,hiss(.4,7500,1.6,.15,.1));break;
  case 'purchase': // diamonds bought: a treasure chest creaks open, a shower of coins and a shimmering chord
   {const creak=sweep(.3,170,260,.25,.4,x=>Math.sin(x)+.5*Math.sin(2*x)+.3*Math.sin(3*x));lowpass(creak,rate,1400);add(0,creak);}
   add(.28,knock(260,.7));
   for(let c=0;c<8;c++)add(.34+c*.04+rand()*.012,coin(.26-c*.02));
   [84,88,91,96].forEach((m,i)=>add(.4+i*.06,bell(hz(m),.8,.2,.5)));
   [[96,.22],[100,.16],[103,.12]].forEach(([m,v])=>{add(.72,bell(hz(m),.72,v,.45));add(.724,bell(hz(m)*1.004,.72,v*.4,.4));});
   add(.7,hiss(.75,8000,2,.3,.12));break;
  case 'message': // a private message: a soft letter-box ding, two notes
   add(0,hiss(.08,3000,1.2,.02,.15));add(.01,bell(hz(86),.45,.24,.5));add(.1,bell(hz(91),.45,.2,.5));break;
  case 'finish': // finished at once with diamonds: a magic whoosh that rises, and a quick sparkle
   for(let k=0;k<6;k++)add(k*.045,hiss(.12,900*1.45**k,2,.045,.28));
   [91,96,100].forEach((m,i)=>add(.3+i*.05,bell(hz(m),.5,.2,.5)));add(.3,hiss(.5,8000,2,.18,.1));break;
  case 'quest': // a quest claimed: a rustle of paper, a stamp, two little bells
   add(0,hiss(.12,3500,1.2,.04,.35));add(.1,sweep(.1,130,70,.04,.8));add(.1,knock(300,.5));
   add(.2,bell(hz(84),.4,.24));add(.28,bell(hz(88),.45,.22));break;
  case 'delivery': // an order delivered: the clip-clop of the cart horse, a cart bell and coins
   [[0,700],[.11,820],[.22,700],[.33,820]].forEach(([t,f],i)=>add(t,knock(f,.5+i*.04)));
   add(.44,bell(hz(81),.5,.24));for(let c=0;c<3;c++)add(.52+c*.05,coin(.24-c*.04));add(.64,bell(hz(86),.45,.2));break;
  case 'stall': // the farm stall emptied: the till clacks, the drawer slides out, ka-ching
   add(0,knock(1200,.45));add(0,hiss(.04,5000,1.5,.01,.3));add(.07,hiss(.18,1300,1,.07,.4));
   add(.2,bell(hz(96),.55,.3,1.2));add(.2,bell(hz(100),.55,.18));for(let c=0;c<3;c++)add(.26+c*.045,coin(.2-c*.04));break;
  case 'boost': // a boost switched on: a rising power-up and a quick run of bells
   {const up=sweep(.45,300,1200,.6,.3,x=>Math.sin(x)+.4*Math.sin(2*x)+.2*Math.sin(3*x));lowpass(up,rate,3000);add(0,up);}
   [79,84,88,91].forEach((m,i)=>add(.26+i*.05,bell(hz(m),.45,.2)));add(.4,hiss(.4,7000,2,.14,.1));break;
  case 'expand': // new land: two spadefuls of earth, a fence gate that clicks shut, a bell
   for(const t of [0,.18]){add(t,hiss(.12,900,1.2,.05,.6));add(t,sweep(.1,110,60,.04,.7));}
   add(.4,knock(700,.5));add(.48,knock(760,.45));add(.58,bell(hz(84),.5,.25));break;
  case 'valley': // a sale at the Valley Market: the shop door's bell and a couple of coins
   add(0,bell(hz(93),.5,.24,1));add(.07,bell(hz(98),.5,.2,1));add(.14,bell(hz(93),.45,.12,1));for(let c=0;c<2;c++)add(.22+c*.06,coin(.22));break;
  case 'depot': // an export trailer sent: two toots of a truck horn, crates settling, a bell
   for(const [start,len] of [[0,.12],[.17,.22]]){const b=buffer(len+.04);for(let i=0;i<b.length;i++){const t=i/rate,env=Math.min(1,t/.012)*(t<len?1:Math.exp(-(t-len)/.012));b[i]=(Math.sin(TAU*330*t)+.6*Math.sin(TAU*415*t)+.3*Math.sin(TAU*660*t)+.18*Math.sin(TAU*830*t))*env*.45;}lowpass(b,rate,2200);add(start,b);}
   add(.46,knock(380,.6));add(.56,knock(330,.55));add(.7,bell(hz(84),.55,.24));break;
  case 'fair': // a ribbon at the fair: a short burst of applause and a little fanfare of bells
   for(let c=0;c<30;c++){const t=.02+(rand()+1)/2*.75;add(t,hiss(.04,1400+(rand()+1)/2*1400,1.1,.012,.55*(1-t/1.1)));}
   [84,88,91,96].forEach((m,i)=>add(.3+i*.09,bell(hz(m),.6,.22)));add(.6,hiss(.6,7500,1.6,.2,.1));break;
  case 'improve': // an estate improvement: two taps of a chisel and warm, slow rising chimes
   add(0,knock(800,.5));add(.13,knock(860,.45));
   [76,81,86].forEach((m,i)=>add(.3+i*.13,bell(hz(m),.75,.25,.7)));add(.6,hiss(.45,6500,1.6,.16,.08));break;
  case 'dailygift': // the daily gift (27 Sep 2026): a ribbon whoosh and the lid popping off, coins tumbling out, a run of rising
   // bells and a warm, shimmering chord to finish, so collecting it feels like opening a present
   add(0,hiss(.2,1600,.9,.07,.35));add(.02,hiss(.16,3800,1.4,.05,.18));
   add(.09,sweep(.07,360,940,.028,.7));add(.1,knock(520,.35));
   for(let c=0;c<6;c++)add(.16+c*.045+rand()*.012,coin(.24-c*.025));
   [79,83,86,91,95].forEach((m,i)=>add(.2+i*.07,bell(hz(m),.6,.22)));
   [[91,.24],[95,.18],[98,.13]].forEach(([m,v])=>{add(.58,bell(hz(m),1.1,v,.55));add(.584,bell(hz(m)*1.003,1.1,v*.4,.4));});
   add(.56,hiss(.85,7600,1.6,.32,.13));break;
  case 'offer': // the special offer opening (29 Sep 2026): a magic run of bells up, a bright brass "ta-daa", the chest lid, coins
   // tumbling and a high shimmer, so it sounds like treasure and not like the daily gift
   add(0,hiss(.4,5200,1.4,.13,.14));
   [72,76,79,84,88,91].forEach((m,i)=>add(i*.035,bell(hz(m),.4,.15,.6)));
   [[.24,.1,[67,71,74]],[.37,.6,[72,76,79]]].forEach(([start,len,chord])=>chord.forEach(m=>{
    const f=hz(m),b=buffer(len+.3);for(let i=0;i<b.length;i++){const t=i/rate,env=Math.min(1,t/.015)*(t<len?1:Math.exp(-(t-len)/.1))*Math.exp(-t*.8);let s=0;for(let n=1;n<=6;n++)s+=Math.sin(TAU*f*n*t)/n*(n<=3?1:.6);b[i]=s*env*.09;}
    lowpass(b,rate,3000);add(start,b);}));
   add(.37,knock(300,.3));
   for(let c=0;c<5;c++)add(.42+c*.05+rand()*.015,coin(.2-c*.025));
   [[96,.18],[100,.13]].forEach(([m,v])=>add(.4,bell(hz(m),1,v,.5)));
   add(.4,hiss(.9,7800,1.6,.3,.12));break;
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
export const CUE_ORDER=['harvest','snip','plant','water','care','sell','collect','tractor','produce','ready','chore','chorebonus','quest','delivery','stall','reward','upgrade','expand','boost','finish','diamond','dailygift','construct','message','valley','depot','fair','improve','purchase','offer','levelup'];
export const CUE_LENGTH={snip:.18,plant:.25,water:.5,harvest:.75,care:.6,sell:.45,produce:.45,collect:.85,ready:1.1,chore:.3,chorebonus:.85,upgrade:.9,reward:.95,diamond:1.1,dailygift:1.45,tractor:1,levelup:1.45,construct:1.3,purchase:1.45,message:.55,finish:.9,quest:.6,delivery:1.,stall:.8,boost:.9,expand:.9,valley:.7,depot:1.3,fair:1.4,improve:1.,offer:1.45};
export const CUE_LOUDNESS={snip:.024,plant:.029,water:.029,harvest:.05,care:.04,sell:.032,produce:.029,collect:.047,ready:.029,chore:.029,chorebonus:.042,upgrade:.053,reward:.052,diamond:.038,dailygift:.055,tractor:.034,levelup:.056,construct:.052,purchase:.056,message:.03,finish:.045,quest:.045,delivery:.045,stall:.047,boost:.048,expand:.045,valley:.04,depot:.046,fair:.05,improve:.048,offer:.055};
export function loudness(data,rate){const w=Math.min(data.length,Math.round(.15*rate)),step=Math.max(1,Math.round(w/4));let best=0;for(let i=0;i+w<=data.length;i+=step){let e=0;for(let j=i;j<i+w;j++)e+=data[j]*data[j];best=Math.max(best,Math.sqrt(e/w));}return best;}
