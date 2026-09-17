"""Render an original 144-second, sample-continuous farming music loop.

No recordings or external sound fonts. Notes, release tails and room reflections
wrap around the exact loop boundary, rather than fading to silence each repeat.
Run with Python + NumPy; the shipped WAV is already built for static hosting.
"""
from pathlib import Path
import json
import wave
import numpy as np

RATE=24000
BPM=80
BEAT=60/BPM
BARS=48
SECONDS=BARS*4*BEAT
COUNT=round(SECONDS*RATE)
track=np.zeros(COUNT,dtype=np.float64)
def hz(midi):return 440*2**((midi-69)/12)
def add(midi,beat,length,volume,instrument='piano'):
    size=round(length*RATE);t=np.arange(size)/RATE;f=hz(midi);phase=2*np.pi*f*t
    if instrument=='pad':
        attack=np.minimum(t/.65,1);release=np.minimum((length-t)/.9,1)
        env=np.sin(np.pi/2*np.clip(attack*release,0,1))**2
        signal=(np.sin(phase)+.18*np.sin(phase*2)+.10*np.sin(phase*1.0012))/1.28
    elif instrument=='flute':
        env=(1-np.exp(-t/.065))*np.minimum(1,np.maximum(0,(length-t)/.3))
        env*=np.exp(-t/(length*2.5))
        signal=np.sin(phase+.022*np.sin(2*np.pi*4.5*t))+.045*np.sin(phase*2)
    elif instrument=='bass':
        env=(1-np.exp(-t/.022))*np.exp(-t/1.1)*np.minimum(1,(length-t)/.1)
        signal=.85*np.sin(phase)+.12*np.sin(2*phase)+.03*np.sin(3*phase)
    else:
        env=(1-np.exp(-t/.008))*np.exp(-t/1.05)*np.minimum(1,(length-t)/.16)
        # Rounded felt-piano/plucked timbre; upper partials decay quickly.
        signal=.76*np.sin(phase)+.17*np.sin(phase*2)*np.exp(-t/.7)+.055*np.sin(phase*3)*np.exp(-t/.32)+.015*np.sin(phase*4)*np.exp(-t/.2)
    samples=signal*env*volume
    start=round(beat*BEAT*RATE)%COUNT;end=start+size
    if end<=COUNT:track[start:end]+=samples
    else:track[start:]+=samples[:COUNT-start];track[:end-COUNT]+=samples[COUNT-start:]

# C major, warm added-note voicings and a light, unhurried pulse.
progression=[(48,[60,64,67,71]),(47,[59,62,64,67]),(45,[57,60,64,67]),(41,[57,60,64,65]),(50,[57,60,62,65]),(43,[55,59,62,67]),(41,[57,60,64,65]),(43,[57,59,62,67])]
melodies=[
    [76,79,81,79],[74,76,79,76],[72,76,79,76],[72,69,72,76],
    [74,77,76,74],[71,74,79,77],[76,72,69,72],[74,71,67,71]
]
for bar in range(BARS):
    section=bar//8;chord=bar%8;root,voices=progression[chord];base=bar*4
    for i,n in enumerate(voices):add(n,base-.12+i*.025,3.8,.021,'pad')
    add(root,base,2.1,.105,'bass');add(root+7,base+2.5,1.2,.053,'bass')
    pattern=[0,2,1,3,2,1] if section%2==0 else [0,1,2,3,1,2]
    for j,beat in enumerate([.0,.75,1.5,2.,2.75,3.5]):
        octave=12 if section in [2,4] and j in [2,5] else 0
        add(voices[pattern[j]]+octave,base+beat,1.75,.069 if j%2==0 else .047)
    # Six phrase variations keep the arrangement evolving over two minutes.
    if section not in [0,3] or chord in [2,3,6,7]:
        notes=melodies[chord]
        if section in [2,5]:notes=[notes[0],notes[2],notes[1],notes[3]]
        for j,beat in enumerate([.5,1.5,2.5,3.25]):
            if section==4 and j==1:continue
            add(notes[j],base+beat,.75 if j==3 else 1.05,.049 if section in [1,4] else .039,'flute')
    if section in [2,5] and chord%2==0:add(voices[2]+12,base+3,1.2,.027)

# A small room: periodic reflections preserve every tail at the seam.
dry=track.copy()
for delay,gain in [(0.113,.13),(0.179,.10),(0.269,.075),(0.383,.05),(0.521,.035)]:
    track+=np.roll(dry,round(delay*RATE))*gain
track-=track.mean()
track*=.26/np.max(np.abs(track))
pcm=np.round(np.clip(track,-1,1)*32767).astype('<i2')
root=Path(__file__).resolve().parents[1]
out=root/'public/assets/audio/harvest-meadow.wav';out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as f:
    f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
windows=track[:len(track)//1200*1200].reshape(-1,1200)
metrics={'duration_seconds':SECONDS,'sample_rate':RATE,'frames':COUNT,'peak':float(np.max(np.abs(track))),'rms':float(np.sqrt(np.mean(track**2))),'quietest_50ms_rms':float(np.sqrt(np.mean(windows**2,axis=1)).min()),'seam_step':float(abs(track[0]-track[-1])),'max_adjacent_step':float(np.max(np.abs(np.diff(track)))),'composition':'Original Harvest Meadow — 48 bars, six phrase variations, 80 BPM'}
(root/'public/assets/audio/harvest-meadow.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
