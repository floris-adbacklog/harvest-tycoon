// Renders "Sunny Acres", the farm's original background music: an upbeat folk loop (banjo rolls, upright bass, guitar on the
// off-beat, a light shaker and kick, a whistled tune, a fiddle, now and then a bird). No recordings or sound fonts: every note is
// synthesised here. Notes, tails and room reflections wrap around the exact loop boundary, so the loop repeats without a seam.
// node scripts/generate-farm-music.mjs  ->  public/assets/audio/sunny-acres.wav and .json (then: afconvert to FLAC, see ASSET-USAGE)
import {writeFileSync} from 'node:fs';

const RATE=24000,BPM=108,BEAT=60/BPM,BARS=48,COUNT=Math.round(BARS*4*BEAT*RATE);
const track=new Float64Array(COUNT);
let seed=26092026;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
const hz=midi=>440*2**((midi-69)/12);
// Adds samples at a beat, wrapping past the end of the loop back to its start.
function place(beat,samples){const start=((Math.round(beat*BEAT*RATE))%COUNT+COUNT)%COUNT;for(let i=0;i<samples.length;i++)track[(start+i)%COUNT]+=samples[i];}
function note(midi,beat,beats,volume,instrument){
 const f=hz(midi),seconds=beats*BEAT,tail={banjo:.9,guitar:.18,bass:.35,whistle:.25,fiddle:.35,accordion:.3}[instrument];
 const size=Math.round((seconds+tail)*RATE),out=new Float64Array(size);
 for(let i=0;i<size;i++){
  const t=i/RATE,release=t<seconds?1:Math.max(0,1-(t-seconds)/tail);let s=0;
  if(instrument==='banjo'){
   // Bright pluck: upper harmonics die away fast, the ring of the head stays a little.
   for(let n=1;n<=9;n++)s+=Math.sin(2*Math.PI*f*n*t)*Math.exp(-t*(2.2+1.9*n))/n**.75;
   s*=Math.min(1,t/.002)*(t<seconds?1:release);
  }else if(instrument==='guitar'){
   for(let n=1;n<=6;n++)s+=Math.sin(2*Math.PI*f*n*t)*Math.exp(-t*(9+4*n))/n;
   s*=Math.min(1,t/.003);
  }else if(instrument==='bass'){
   s=(.85*Math.sin(2*Math.PI*f*t)+.2*Math.sin(4*Math.PI*f*t)+.06*Math.sin(6*Math.PI*f*t))*Math.min(1,t/.012)*Math.exp(-t*1.6)*release;
  }else if(instrument==='whistle'){
   const vib=t>.18?.0045*Math.sin(2*Math.PI*5.6*t):0,glide=-.012*Math.exp(-t/.04);
   s=(Math.sin(2*Math.PI*f*t*(1+glide)+2*Math.PI*f*vib/5.6)+.06*Math.sin(4*Math.PI*f*t))*Math.min(1,t/.035)*release;
  }else if(instrument==='accordion'){
   // A soft reed chord underneath: two reeds a hair apart, so it breathes a little.
   for(let n=1;n<=4;n++)s+=(Math.sin(2*Math.PI*f*n*t)+Math.sin(2*Math.PI*f*1.003*n*t))/(n*n);
   s*=.5*Math.min(1,t/.2)*release;
  }else{ // fiddle
   const vib=t>.25?.006*Math.sin(2*Math.PI*5.3*t):0;
   for(let n=1;n<=8;n++)s+=Math.sin(2*Math.PI*f*n*t+2*Math.PI*f*n*vib/5.3)*(n>=3&&n<=5?1.25:1)/n;
   s*=.42*Math.min(1,t/.14)*release;
  }
  out[i]=s*volume;
 }
 place(beat,out);
}
function kick(beat,volume){const size=Math.round(.16*RATE),out=new Float64Array(size);let phase=0;for(let i=0;i<size;i++){const t=i/RATE;phase+=2*Math.PI*(48+60*Math.exp(-t/.03))/RATE;out[i]=Math.sin(phase)*Math.exp(-t/.05)*volume;}place(beat,out);}
// Shaker and brush: noise, smoothed a little so it sounds soft rather than hissy.
function shaker(beat,volume,length=.06,soft=.86){const size=Math.round(length*RATE),out=new Float64Array(size);let last=0;for(let i=0;i<size;i++){const t=i/RATE;last=last*soft+(rand()*2-1)*(1-soft);out[i]=last*Math.min(1,t/.008)*Math.exp(-t/(length/3))*volume;}place(beat,out);}
function bird(beat,volume){
 const chirps=2+Math.floor(rand()*3),base=2600+rand()*1100;
 for(let c=0;c<chirps;c++){const d=.05+rand()*.04,size=Math.round(d*RATE),out=new Float64Array(size),f0=base+rand()*300,f1=f0+700+rand()*600;let phase=0;
  for(let i=0;i<size;i++){const t=i/RATE,f=f0+(f1-f0)*t/d;phase+=2*Math.PI*f/RATE;out[i]=Math.sin(phase)*Math.sin(Math.PI*t/d)*volume;}
  place(beat+c*.11/BEAT,out);}
}

// Chords as [bass root, voicing]; G major.
const CH={G:[43,[55,59,62,67]],C:[48,[60,64,67,72]],D:[50,[62,66,69,74]],Em:[40,[64,67,71,76]],Am:[45,[57,60,64,69]]};
const A=['G','C','G','D','G','C','D','G'],B=['Em','C','G','D','Em','C','D','D'],C=['C','G','Am','D','C','G','D','G'];
// The whistled tunes: [note, beat in the 8 bars, length in beats].
const TUNE_A=[[74,0,1],[71,1,.5],[74,1.5,.5],[79,2,1.5],[76,3.5,.5],[76,4,1],[72,5,1],[76,6,.5],[79,6.5,.5],[76,7,1],[74,8,1.5],[71,9.5,.5],[67,10,1],[71,11,1],
 [69,12,.5],[71,12.5,.5],[69,13,1],[66,14,1],[69,15,1],[74,16,1],[71,17,.5],[74,17.5,.5],[79,18,1.5],[78,19.5,.5],[76,20,1],[79,21,1],[76,22,.5],[74,22.5,.5],[72,23,1],
 [74,24,1.5],[76,25.5,.5],[78,26,1],[74,27,1],[79,28,2],[74,30,1],[71,31,1]];
const TUNE_B=[[71,0,1.5],[67,1.5,.5],[64,2,1],[67,3,1],[72,4,1.5],[71,5.5,.5],[69,6,1],[67,7,1],[71,8,1],[74,9,1],[79,10,1.5],[78,11.5,.5],[76,12,1],[74,13,1],[69,14,2],
 [71,16,1],[76,17,1],[79,18,1],[76,19,1],[79,20,1.5],[76,21.5,.5],[72,22,1],[76,23,1],[74,24,1],[78,25,1],[81,26,1],[78,27,1],[74,28,3],[69,31,1]];
// Six sections of 8 bars: groove, tune A, tune B, a lighter break with the fiddle, tune A with the fiddle, the banjo plays tune B.
const SECTIONS=[
 {chords:A,groove:1},{chords:A,groove:1,tune:TUNE_A},{chords:B,groove:1,tune:TUNE_B},
 {chords:C,groove:.55,fiddle:true},{chords:A,groove:1,tune:TUNE_A,harmony:true},{chords:B,groove:1,banjoTune:TUNE_B}
];
const ROLL=[0,2,3,1,2,3,1,2];
SECTIONS.forEach((s,si)=>{
 const start=si*32;
 s.chords.forEach((name,bar)=>{
  const [root,v]=CH[name],b=start+bar*4,g=s.groove;
  ROLL.forEach((k,e)=>note(v[k],b+e*.5,.5,(e%2?.05:.068)*(s.banjoTune?.8:1)*(g<1?.85:1),'banjo'));
  note(root,b,2,.2,'bass');note(root+7,b+2,2,.17,'bass');
  for(const m of v.slice(0,3))note(m,b,4,.016,'accordion');
  if(bar===7)note(root+(name==='D'?-3:2),b+3.5,.5,.12,'bass');
  if(g>=1){for(const off of [1,3])v.forEach((m,j)=>note(m-12+(j?12:0),b+off+j*.012,.25,.035,'guitar'));kick(b,.16);kick(b+2,.13);}
  for(let e=0;e<8;e++)shaker(b+e*.5,(e%2?.045:.028)*g);
  if(g>=1){shaker(b+1,.05,.1,.8);shaker(b+3,.05,.1,.8);}
  if(s.fiddle){note(v[2]+12,b,4,.075,'fiddle');}
  if(s.harmony&&bar%2===0)note(v[1]+12,b,7.5,.045,'fiddle');
 });
 for(const [m,beat,len] of s.tune??[])note(m,start+beat,len,.14,'whistle');
 for(const [m,beat,len] of s.banjoTune??[])note(m,start+beat,len,.1,'banjo');
});
// Birds now and then, never on top of each other.
for(let beat=3;beat<BARS*4-2;beat+=10+Math.floor(rand()*9))bird(beat+rand(),.03+rand()*.015);

// A small room: a few quiet reflections, wrapped round the loop like everything else.
const dry=Float64Array.from(track);
for(const [ms,gain] of [[23,.16],[41,.12],[67,.09],[97,.065],[139,.045],[181,.03]]){const d=Math.round(ms/1000*RATE);for(let i=0;i<COUNT;i++)track[(i+d)%COUNT]+=dry[i]*gain;}
// Gentle limiter, then a steady level.
let peak=0;for(let i=0;i<COUNT;i++){track[i]=Math.tanh(track[i]*1.4)/1.4;peak=Math.max(peak,Math.abs(track[i]));}
const scale=.27/peak;for(let i=0;i<COUNT;i++)track[i]*=scale;

const pcm=Buffer.alloc(44+COUNT*2);
pcm.write('RIFF',0);pcm.writeUInt32LE(36+COUNT*2,4);pcm.write('WAVE',8);pcm.write('fmt ',12);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);
pcm.writeUInt32LE(RATE,24);pcm.writeUInt32LE(RATE*2,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(COUNT*2,40);
let energy=0,quiet=1,step=0;
for(let i=0;i<COUNT;i++){const v=Math.max(-32768,Math.min(32767,Math.round(track[i]*32767)));pcm.writeInt16LE(v,44+i*2);energy+=track[i]**2;if(i)step=Math.max(step,Math.abs(track[i]-track[i-1]));}
for(let i=0;i+1200<=COUNT;i+=1200){let e=0;for(let j=i;j<i+1200;j++)e+=track[j]**2;quiet=Math.min(quiet,Math.sqrt(e/1200));}
const out=new URL('../public/assets/audio/',import.meta.url);
writeFileSync(new URL('sunny-acres.wav',out),pcm);
const metrics={duration_seconds:COUNT/RATE,sample_rate:RATE,frames:COUNT,peak:.27,rms:Math.sqrt(energy/COUNT),quietest_50ms_rms:quiet,seam_step:Math.abs(track[0]-track[COUNT-1]),max_adjacent_step:step,
 composition:`Original Sunny Acres — ${BARS} bars in six sections, ${BPM} BPM, G major: banjo, upright bass, guitar, shaker, whistle, fiddle, birds`};
writeFileSync(new URL('sunny-acres.json',out),JSON.stringify(metrics,null,2)+'\n');
console.log(metrics);
