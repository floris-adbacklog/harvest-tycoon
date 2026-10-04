// Builds the farm's music for the game (4 Oct 2026). For each track in scripts/music/ it renders the loop (stereo, 32 kHz), mixes it
// to mono at the same loudness as the others, and writes to public/assets/audio/:
//  <id>.m4a          AAC, mono: the loop with MUSIC_PAD seconds of its end before it and MUSIC_PAD seconds of its start after it, so
//                    the game can loop from MUSIC_PAD to MUSIC_PAD + length whatever the decoder does at the edges (public/farm-audio.js)
//  <id>-preview.m4a  20 seconds from the tune, faded in and out, for Listen in Settings › Sound
//  <id>.json         length, loudness and the checks below
// It then decodes each .m4a again and checks that the loop has no seam where the decoder put its edges.
// Sunny Acres (scripts/generate-farm-music.mjs) only gets its preview here; its FLAC and WAV stay as they are.
// macOS only (afconvert). node scripts/build-farm-music.mjs [id ...]   (no ids: all of them)
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {MUSIC_PAD,MUSIC_TRACKS} from '../public/farm-audio.js';

const ROOT=new URL('../',import.meta.url),AUDIO=new URL('public/assets/audio/',ROOT),inAudio=file=>fileURLToPath(new URL(file,AUDIO));
// preview: where the 20 seconds start, in seconds into the loop (at a phrase of the tune, a beat early for its pickup).
// about: what the .json says the track is.
const TRACKS={
 'hayride-hop':{preview:15.5,about:'Hayride Hop: a light country shuffle in D major at 120 BPM. Banjo, mandolin, upright bass, whistled tune, reed, fiddle, xylophone, brushes, a hayride horse'},
 'morning-market':{preview:16.03,about:'Morning Market: bouncy light orchestral-country in F major at 116 BPM. Pizzicato strings, tuba, guitar, glockenspiel, clarinet, flute, woodblock, shaker'},
 'orchard-breeze':{preview:17.22,about:'Orchard Breeze: a cosy loop in C major at 108 BPM. Ukulele, marimba, recorder, whistle, flute, glockenspiel, plucked bass, accordion, pizzicato'},
 'sunny-acres':{preview:17.22,about:'Sunny Acres: the first farm tune, an upbeat folk loop in G major at 108 BPM'}
};
const RATE=32000,TARGET_RMS=.062,KNEE=.3,PREVIEW_SECONDS=20,BITRATE=96000;

function readWav(path){
 const b=readFileSync(path);let fmt=null,data=null;
 for(let i=12;i+8<=b.length;){const id=b.toString('ascii',i,i+4),size=b.readUInt32LE(i+4);if(id==='fmt ')fmt=b.subarray(i+8,i+8+size);if(id==='data')data=b.subarray(i+8,i+8+size);i+=8+size+(size&1);}
 if(!fmt||!data||![1,0xfffe].includes(fmt.readUInt16LE(0))||fmt.readUInt16LE(14)!==16)throw new Error(`${path}: not 16-bit PCM`);
 const channels=fmt.readUInt16LE(2),rate=fmt.readUInt32LE(4),frames=data.length/2/channels,out=new Float64Array(frames);
 // To mono: the average of the channels (the mixes pan gently, nothing hard left or right).
 for(let i=0;i<frames;i++){let s=0;for(let c=0;c<channels;c++)s+=data.readInt16LE((i*channels+c)*2);out[i]=s/channels/32768;}
 return {rate,samples:out};
}
function writeWav(path,samples,rate){
 const b=Buffer.alloc(44+samples.length*2);
 b.write('RIFF',0);b.writeUInt32LE(36+samples.length*2,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);
 for(let i=0;i<samples.length;i++)b.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(samples[i]*32767))),44+i*2);
 writeFileSync(path,b);
}
const rms=(a,from=0,to=a.length)=>{let e=0;for(let i=from;i<to;i++)e+=a[i]*a[i];return Math.sqrt(e/Math.max(1,to-from));};
const peak=a=>a.reduce((m,v)=>Math.max(m,Math.abs(v)),0);
// The same loudness for every track, so switching tracks never jumps in volume; the rare peak above KNEE is rounded off.
function level(samples){
 const gain=TARGET_RMS/rms(samples);
 return samples.map(v=>{const x=v*gain,a=Math.abs(x);return a<=KNEE?x:Math.sign(x)*(KNEE+(1-KNEE)*Math.tanh((a-KNEE)/(1-KNEE)));});
}
const wrap=(loop,i)=>loop[((i%loop.length)+loop.length)%loop.length];
function preview(loop,rate,startSeconds){
 const n=PREVIEW_SECONDS*rate,start=Math.round(startSeconds*rate),fadeIn=.15*rate,fadeOut=2.5*rate,out=new Float64Array(n);
 for(let i=0;i<n;i++){const f=Math.min(1,i/fadeIn,(n-1-i)/fadeOut);out[i]=wrap(loop,start+i)*Math.sin(Math.PI/2*Math.max(0,f))**2;}
 return out;
}
const aac=(wav,m4a,bitrate=BITRATE)=>execFileSync('afconvert',['-f','m4af','-d','aac','-b',String(bitrate),wav,m4a]);
// Decodes the .m4a again and plays its loop the way the game does (from MUSIC_PAD to MUSIC_PAD + length): right after the loop's end
// the music must go on exactly as it did right after its start. Measured over the first 50 ms after the jump, as a share of the music.
function checkLoop(m4a,loop,rate,dir){
 const decoded=join(dir,'decoded.wav');execFileSync('afconvert',['-f','WAVE','-d','LEI16',m4a,decoded]);
 const {rate:decodedRate,samples}=readWav(decoded);if(decodedRate!==rate)throw new Error(`decoded at ${decodedRate} Hz`);
 const from=Math.round(MUSIC_PAD*rate),to=from+loop.length,window=Math.round(.05*rate);
 if(samples.length<to+window)throw new Error('the decoded file is too short for its loop');
 let difference=0;for(let i=0;i<window;i++)difference+=(samples[to+i]-samples[from+i])**2;
 // Where the decoder put the start (the encoder's delay): the shift that lines the decoded loop up with the rendered one.
 let shift=0,best=Infinity;for(let d=-2400;d<=2400;d+=1){let e=0;for(let i=0;i<4000;i+=4)e+=(samples[from+rate*10+d+i]-wrap(loop,rate*10+i))**2;if(e<best){best=e;shift=d;}}
 return {seam:Math.sqrt(difference/window)/rms(loop),decoder_shift_ms:Math.round(shift/rate*1000*100)/100};
}

const wanted=process.argv.slice(2),ids=wanted.length?wanted:Object.keys(TRACKS);
for(const id of ids){
 const track=MUSIC_TRACKS.find(t=>t.id===id),config=TRACKS[id];if(!track||!config)throw new Error(`unknown track ${id}`);
 const dir=mkdtempSync(join(tmpdir(),`harvest-music-${id}-`));
 try{
  if(id==='sunny-acres'){
   // The first tune is already mono and level; only its preview is new.
   const {rate,samples}=readWav(inAudio('sunny-acres.wav'));
   writeWav(join(dir,'preview.wav'),preview(samples,rate,config.preview),rate);aac(join(dir,'preview.wav'),inAudio(`${id}-preview.m4a`),64000);   // 24 kHz: AAC's ceiling there is lower
   console.log(id,'preview only');continue;
  }
  execFileSync(process.execPath,[fileURLToPath(new URL(`scripts/music/${id}.mjs`,ROOT)),dir],{stdio:['ignore','ignore','inherit']});
  const rendered=readWav(join(dir,`${id}.wav`));if(rendered.rate!==RATE)throw new Error(`${id} renders at ${rendered.rate} Hz`);
  const loop=level(rendered.samples),pad=Math.round(MUSIC_PAD*RATE),padded=new Float64Array(loop.length+2*pad);
  for(let i=0;i<padded.length;i++)padded[i]=wrap(loop,i-pad);
  writeWav(join(dir,'padded.wav'),padded,RATE);const m4a=inAudio(`${id}.m4a`);aac(join(dir,'padded.wav'),m4a);
  writeWav(join(dir,'preview.wav'),preview(loop,RATE,config.preview),RATE);aac(join(dir,'preview.wav'),inAudio(`${id}-preview.m4a`));
  const check=checkLoop(m4a,loop,RATE,dir),length=loop.length/RATE;
  if(Math.abs(length-track.length)>1e-9)console.warn(`!! ${id}: MUSIC_TRACKS in public/farm-audio.js says ${track.length} s, the loop is ${length} s`);
  if(check.seam>.2)throw new Error(`${id}: the decoded loop has a seam (${check.seam})`);
  let quiet=1;for(let i=0;i+1600<=loop.length;i+=1600)quiet=Math.min(quiet,rms(loop,i,i+1600));
  const metrics={title:track.title,duration_seconds:length,frames:loop.length,sample_rate:RATE,channels:1,pad_seconds:MUSIC_PAD,aac_bitrate:BITRATE,
   rms:rms(loop),peak:peak(loop),quietest_50ms_rms:quiet,seam_step:Math.abs(loop[0]-loop[loop.length-1]),decoded_seam:check.seam,decoder_shift_ms:check.decoder_shift_ms,
   preview_start_seconds:config.preview,preview_seconds:PREVIEW_SECONDS,composition:`Original ${config.about}`};
  writeFileSync(new URL(`${id}.json`,AUDIO),JSON.stringify(metrics,null,2)+'\n');
  console.log(id,{length,rms:metrics.rms.toFixed(4),peak:metrics.peak.toFixed(3),seam:check.seam.toFixed(4),shift_ms:check.decoder_shift_ms});
 }finally{rmSync(dir,{recursive:true,force:true});}
}
