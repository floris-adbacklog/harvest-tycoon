// Renders "Morning Market", an original background loop for Harvest Tycoon: bouncy light orchestral-country in F major,
// 116 BPM, straight eighths, 96 bars in twelve 8-bar sections (3:18.6). Pizzicato strings and an oom-pah tuba drive it,
// an acoustic guitar chucks on the off-beats, a glockenspiel doubles the staccato hook, clarinet and flute trade phrases,
// woodblock and shaker keep time, and a soft string pad colours the D-minor bridge before a key lift to G.
// No recordings or sound fonts: plucks are Karplus-Strong, mallets are modal, winds/brass are additive with breath noise.
// Every note, release tail, reverb tail, filter state and limiter envelope wraps round the exact loop boundary, so the file
// repeats without a seam. Mastering: per-note transient tamer on plucks/mallets, a 3 ms look-ahead peak limiter (gain envelope
// computed round the loop), then a tanh soft clip with a 0.33 ceiling; level set to RMS 0.065.
// Second-ear revision: the string pad ties common tones and releases in 0.32 s (each chord rang 1.1 s under the next one),
// fingerpicked strings stop at the first chord that lacks them, the bass's second note steps toward the next root (no more
// A2-Bb1 sevenths or E2-Bb1 tritone), the tuba carries less fundamental and the kick is a shorter tap (energy below 80 Hz
// 11.8% -> 6%), the key-lift clarinet doubles the flute an octave below instead of in phase-locked unison (which hollowed
// random notes by up to 20 dB), the Bridge lift now sits under the key-lift hook, and pluck transients are tamed a little more.
// node scripts/music/morning-market.mjs [folder]  ->  <folder>/morning-market.wav (16-bit stereo 32 kHz) and morning-market.json; scripts/build-farm-music.mjs
// runs it and makes the game's files from the WAV.
//   --seam also writes morning-market-seam.wav (last 15 s + first 15 s) for a loop-point preview.
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const started = performance.now();
// The folder to write into: the first argument (scripts/build-farm-music.mjs gives a temporary one), else the system's temp folder.
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? join(tmpdir(), 'harvest-music'), SLUG = 'morning-market';
mkdirSync(DIR, {recursive: true});
const RATE = 32000, BPM = 116, BEAT = 60 / BPM, BAR = 4 * BEAT, EIGHTH = BEAT / 2, BARS = 96, SECTIONS = BARS / 8;
const COUNT = Math.round(BARS * BAR * RATE);
const L = new Float32Array(COUNT), R = new Float32Array(COUNT), SEND = new Float32Array(COUNT);

// ---------- helpers ----------
let seedState = 20261004;
function rand() { let t = (seedState += 0x6D2B79F5) | 0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const gauss = () => (rand() + rand() + rand() + rand() - 2) * 1.732;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hz = m => 440 * 2 ** ((m - 69) / 12);
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const PC = {C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11};
function noteNum(tok) { const m = tok.match(/^([A-G](?:#|b)?)(\d)$/); if (!m) throw new Error('bad note ' + tok); return 12 * (+m[2] + 1) + PC[m[1]]; }
const noteName = m => NAMES[m % 12] + (Math.floor(m / 12) - 1);

// RBJ biquads, used per note (tone shaping) and on the master (run twice round the loop).
function bq(type, f, q = .707, db = 0) {
  const w = 2 * Math.PI * f / RATE, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q), A = 10 ** (db / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hshelf') { const sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sq); a0 = (A + 1) - (A - 1) * cs + sq; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sq; }
  else { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; } // peak
  return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0};
}
class BQ {
  constructor(c) { this.c = c; this.x1 = this.x2 = this.y1 = this.y2 = 0; }
  step(x) { const c = this.c, y = c.b0 * x + c.b1 * this.x1 + c.b2 * this.x2 - c.a1 * this.y1 - c.a2 * this.y2; this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y; return y; }
}
function filt(buf, ...coefs) { for (const c of coefs) { const f = new BQ(c); for (let i = 0; i < buf.length; i++) buf[i] = f.step(buf[i]); } return buf; }
function fadeEnd(buf, sec) { const k = Math.min(buf.length, Math.round(sec * RATE)); for (let i = 0; i < k; i++) buf[buf.length - 1 - i] *= i / k; return buf; }
// Per-note transient tamer (like a fast compressor on a close mic): peaks above k x the note's early RMS are pulled down
// with a 2 ms look-ahead ramp and a 40 ms recovery, so plucks keep their shape without poking out of the mix.
function tame(buf, k) {
  const n = buf.length, m = Math.min(n, Math.round(.15 * RATE)); let e = 0; for (let i = 0; i < m; i++) e += buf[i] * buf[i];
  const th = k * Math.sqrt(e / m), look = Math.round(.002 * RATE), rel = Math.exp(-1 / (.04 * RATE)), want = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) { const a = Math.abs(buf[i]); if (a <= th) continue; const r = th / a; for (let j = Math.max(0, i - look); j <= i; j++) { const v = 1 - (1 - r) * (j - i + look) / look; if (v < want[j]) want[j] = v; } }
  let g = 1; for (let i = 0; i < n; i++) { const t = want[i]; g = t < g ? t : t + (g - t) * rel; buf[i] *= g; }
  return buf;
}
function mixInto(dst, src, off, gain = 1) { for (let i = 0; i < src.length && i + off < dst.length; i++) dst[i + off] += src[i] * gain; }

// ---------- placement (everything wraps round the loop) ----------
const INST = {
  pizz: {pan: -.2, send: .22}, pah: {pan: .16, send: .2}, arp: {pan: .2, send: .22}, pizzBass: {pan: 0, send: .1},
  guitar: {pan: -.34, send: .15}, tuba: {pan: 0, send: .07}, kick: {pan: 0, send: 0}, glock: {pan: .3, send: .3},
  marimba: {pan: .14, send: .24}, clarinet: {pan: -.17, send: .28}, flute: {pan: .22, send: .3}, pad: {pan: 0, send: .42},
  wood: {pan: .3, send: .15}, shaker: {pan: -.28, send: .1}, clap: {pan: .05, send: .2},
};
// Per instrument and section: energy as heard on small speakers (12 dB/oct high-pass at 200 Hz), used to balance the mix.
// Also full-band energy and K-weighted energy (the BS.1770 loudness weighting: +4 dB shelf above ~1.7 kHz, low cut at 38 Hz),
// so the balance can be judged as heard on headphones too, not only on small speakers.
const peaks = {}, stats = {}, statsFull = {}, statsK = {}, SPEAKER = bq('hp', 200, .7), KSHELF = bq('hshelf', 1681, .707, 4), KHP = bq('hp', 38, .5);
function place(sec, buf, inst, panShift = 0) {
  const pr = INST[inst], pan = clamp(pr.pan + panShift, -.5, .5), a = (pan + 1) * Math.PI / 4;
  const gl = Math.cos(a) * Math.SQRT2, gr = Math.sin(a) * Math.SQRT2, send = pr.send, w = new BQ(SPEAKER), k1 = new BQ(KSHELF), k2 = new BQ(KHP);
  let j = Math.round(sec * RATE) % COUNT; if (j < 0) j += COUNT;
  let e = 0, ef = 0, ek = 0, pk = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = buf[i]; pk = Math.max(pk, Math.abs(s)); L[j] += s * gl; R[j] += s * gr; SEND[j] += s * send; e += w.step(s) ** 2; ef += s * s; ek += k2.step(k1.step(s)) ** 2;
    if (++j === COUNT) j = 0;
  }
  const si = Math.floor(((((sec + .02) / BAR) % BARS) + BARS) % BARS / 8);
  (stats[inst] ??= new Float64Array(SECTIONS))[si] += e;
  (statsFull[inst] ??= new Float64Array(SECTIONS))[si] += ef;
  (statsK[inst] ??= new Float64Array(SECTIONS))[si] += ek;
  peaks[inst] = Math.max(peaks[inst] ?? 0, pk * Math.max(gl, gr));
}
const at = (beat, sdMs) => beat * BEAT + clamp(gauss(), -2.5, 2.5) * sdMs / 1000;

// ---------- Karplus-Strong plucked string ----------
function apDelay(c, w) { return -(Math.atan2(-Math.sin(w), c + Math.cos(w)) - Math.atan2(-c * Math.sin(w), 1 + c * Math.cos(w))) / w; }
// exc = cutoff of the noise burst that excites the string (a finger is soft, a pick is bright); attack = onset ramp in seconds.
function ks(f, {len, t60, lp = .3, pick = .15, exc = 3000, attack = .001, mute = Infinity, muteT60 = .07}) {
  const n = Math.max(1, Math.round(len * RATE)), out = new Float32Array(n);
  const P = RATE / f, w = 2 * Math.PI * f / RATE, a = lp;
  const pdLp = Math.atan2(a * Math.sin(w), 1 - a * Math.cos(w)) / w, magLp = (1 - a) / Math.sqrt(1 - 2 * a * Math.cos(w) + a * a);
  const D = P - pdLp; let N = Math.floor(D - .6); if (N < 2) N = 2;
  const target = D - N; let d = target, c = (1 - d) / (1 + d);
  for (let k = 0; k < 4; k++) { d += target - apDelay(c, w); c = (1 - d) / (1 + d); } // exact tuning at the fundamental
  const gOn = Math.min(.99995, 10 ** (-3 / (t60 * f)) / magLp), gOff = Math.min(gOn, 10 ** (-3 / (muteT60 * f)) / magLp);
  const buf = new Float32Array(N); let s = 0;
  const e1 = new BQ(bq('lp', Math.min(exc, RATE * .45), .6)), e2 = new BQ(bq('lp', Math.min(exc, RATE * .45), .6));
  for (let i = 0; i < 64; i++) e2.step(e1.step(rand() * 2 - 1)); // settle the filters
  for (let i = 0; i < N; i++) buf[i] = e2.step(e1.step(rand() * 2 - 1));
  const tilt = (buf[N - 1] - buf[0]) * N / (N - 1); for (let i = 0; i < N; i++) buf[i] -= tilt * i / N; // ends meet: no kink per period
  const pk = Math.max(1, Math.round(pick * P)), raw = Float32Array.from(buf);
  for (let i = 0; i < N; i++) buf[i] = raw[i] - raw[(i - pk + N) % N]; // pick-position comb (circular)
  let mean = 0, peak = 1e-9; for (let i = 0; i < N; i++) mean += buf[i]; mean /= N;
  for (let i = 0; i < N; i++) { buf[i] -= mean; peak = Math.max(peak, Math.abs(buf[i])); }
  for (let i = 0; i < N; i++) buf[i] /= peak;
  let idx = 0, lpY = 0, apX = 0, apY = 0, g = gOn;
  const muteN = mute === Infinity ? Infinity : Math.round(mute * RATE), ramp = Math.round(.008 * RATE);
  for (let i = 0; i < n; i++) {
    const x = buf[idx]; out[i] = x;
    lpY = (1 - a) * x + a * lpY;
    const ap = c * lpY + apX - c * apY; apX = lpY; apY = ap;
    if (i >= muteN) g = gOn + (gOff - gOn) * Math.min(1, (i - muteN) / ramp);
    buf[idx] = ap * g; if (++idx === N) idx = 0;
  }
  const an = Math.max(1, Math.round(attack * RATE)); for (let i = 0; i < an && i < n; i++) out[i] *= .5 - .5 * Math.cos(Math.PI * i / an);
  return fadeEnd(out, .012);
}

const PIZZ_BODY = [bq('hp', 120, .7), bq('peak', 430, 1.3, 4), bq('peak', 1200, 1.2, 2), bq('lp', 4600, .7)];
const BASS_BODY = [bq('hp', 35, .7), bq('peak', 160, 1.2, 3), bq('lp', 2200, .7)];
function pizzBuf(midi, vel, voices) {
  const f = hz(midi), t60 = Math.min(1.3, .6 * (600 / f) ** .5), len = t60 * .7 + .06;
  const res = new Float32Array(Math.round((len + .03) * RATE));
  for (let v = 0; v < voices; v++) {
    // a section of players: slightly detuned, spread over ~25 ms, each with a fleshy finger rather than a snap
    const det = voices > 1 ? (v - (voices - 1) / 2) * 4 + gauss() * 1.5 : 0, off = v === 0 ? 0 : Math.round((.004 + .02 * (v - 1 + rand()) / (voices - 1)) * RATE);
    const s = ks(f * 2 ** (det / 1200), {len, t60: t60 * (.9 + rand() * .2), lp: .38, pick: .12 + rand() * .1, exc: clamp(4 * f, 1400, 3200), attack: .003});
    for (let i = 0; i < s.length; i++) s[i] *= 1 - .45 * Math.exp(-i / (.012 * RATE));
    mixInto(res, s, off, 1 / voices ** .6);
  }
  filt(res, ...PIZZ_BODY);
  // even playing: every note starts at the same loudness (first 150 ms), high notes a touch softer
  const k = Math.min(res.length, Math.round(.15 * RATE)); let e = 0; for (let i = 0; i < k; i++) e += res[i] * res[i];
  const g = vel * .2 * (f / 440) ** -.15 / Math.sqrt(e / k + 1e-12);
  for (let i = 0; i < res.length; i++) res[i] *= g;
  return fadeEnd(tame(res, 2.5), .02);
}
function pizz(inst, midi, beat, vel, voices = 4, sd = 4) { place(at(beat, sd), pizzBuf(midi, vel, voices), inst, (rand() - .5) * .08); }
function pizzBass(midi, beat, vel, ring) {
  const f = hz(midi), t60 = ring ? 1.6 : 1.0, len = ring ? 1.25 : .8;
  const res = new Float32Array(Math.round((len + .03) * RATE));
  for (let v = 0; v < 2; v++) mixInto(res, ks(f * 2 ** ((v - .5) * 4 / 1200), {len, t60, lp: .72, pick: .2, exc: 700, attack: .004}), v * Math.round(.008 * RATE), .7);
  filt(res, ...BASS_BODY);
  const k = Math.round(.2 * RATE); let e = 0; for (let i = 0; i < k; i++) e += res[i] * res[i];
  const g = vel * .25 / Math.sqrt(e / k + 1e-12);
  for (let i = 0; i < res.length; i++) res[i] *= g * (1 - .35 * Math.exp(-i / (.015 * RATE)));
  place(at(beat, 3), fadeEnd(tame(res, 2.6), .03), 'pizzBass');
}

// ---------- acoustic guitar (steel strings, strummed or picked) ----------
const GTR_BODY = [bq('hp', 70, .7), bq('peak', 102, 1.8, 4), bq('peak', 205, 1.6, 2.5), bq('peak', 2800, 1, -2.5), bq('lp', 6500, .7)];
function guitarString(midi, vel, mute) {
  const f = hz(midi), t60 = 2.4 * (110 / f) ** .4, len = Math.min(t60 * .55, mute + .3);
  const s = ks(f, {len, t60, lp: .17, pick: .12 + .06 * rand(), exc: clamp(9 * f, 2200, 5000), attack: .0012, mute, muteT60: .065});
  for (let i = 0; i < s.length; i++) s[i] *= vel;
  return s;
}
function strum(beat, notes, {up = false, vel = 1, mute = .11, spread = .011}) {
  const order = up ? [...notes].reverse() : notes;
  const parts = order.map((m, k) => ({off: Math.round(k * spread * (.8 + .4 * rand()) * RATE), s: guitarString(m, vel * (up ? (k < 2 ? 1 : .72) : (k === 0 ? .85 : 1)) * (.85 + .3 * rand()), mute === Infinity ? Infinity : Math.max(.03, mute - k * spread))}));
  const buf = new Float32Array(Math.max(...parts.map(p => p.off + p.s.length)));
  for (const p of parts) mixInto(buf, p.s, p.off);
  filt(buf, ...GTR_BODY);
  place(at(beat, 3), fadeEnd(tame(buf, 3), .01), 'guitar');
}
function pickNote(midi, beat, vel, ring = .95) { const s = filt(guitarString(midi, vel, ring), ...GTR_BODY); place(at(beat, 4), fadeEnd(s, .02), 'guitar', (rand() - .5) * .1); }

// ---------- tuba (additive brass: darker when soft, a round attack with a small scoop) ----------
function tuba(midi, beat, beats, vel) {
  const f = hz(midi), dur = beats * BEAT, att = .038, rel = .11, n = Math.round((dur + rel + .01) * RATE), out = new Float32Array(n);
  const H = Math.max(2, Math.min(16, Math.floor(2600 / f))), lpN = new BQ(bq('lp', 900, .7));
  let ph = rand() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let env = t < att ? Math.sin(Math.PI / 2 * t / att) ** 2 : 1;
    env *= .8 + .2 * Math.exp(-t / .12);
    if (t > dur) env *= Math.cos(Math.PI / 2 * Math.min(1, (t - dur) / rel));
    const dk = Math.exp(-(1.05 - .55 * Math.min(1, vel / GAIN.tuba * env)));
    ph += 2 * Math.PI * f * (1 - .016 * Math.exp(-t / .03)) / RATE;
    // the fundamental sits under the 2nd harmonic, as on a real low brass note at mf: a rounder "oom" that reads on small
    // speakers without piling energy below 80 Hz (it was .8 and the tuba alone was 44% of the track's energy)
    const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph); let a0 = 0, a1 = s1, sum = s1 * .52, amp = 1;
    for (let h = 2; h <= H; h++) { const nx = c2 * a1 - a0; a0 = a1; a1 = nx; amp *= dk; sum += amp * nx; }
    const breath = lpN.step(rand() * 2 - 1) * .05 * (env + .6 * Math.exp(-t / .02));
    out[i] = (sum * .55 * env + breath) * vel;
  }
  place(at(beat, 3), out, 'tuba');
}
function kick(beat, vel) {
  const n = Math.round(.26 * RATE), out = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / RATE; ph += 2 * Math.PI * (48 + 64 * Math.exp(-t / .028)) / RATE; out[i] = Math.sin(ph) * Math.min(1, t / .002) * Math.exp(-t / .075) * vel; }
  place(at(beat, 1.5), fadeEnd(out, .02), 'kick');
}

// ---------- mallets (modal synthesis with inharmonic partials) ----------
function modal(f, vel, modes, T, attack, clickAmt, clickLp) {
  const n = Math.round(T * 1.05 * RATE), out = new Float32Array(n), lp = new BQ(bq('lp', clickLp, .7));
  const ms = modes.filter(m => m[0] * f < 9500).map(([r, a, d]) => ({w: 2 * Math.PI * f * r / RATE, a, k: Math.exp(-6.91 / (T * d * RATE)), ph: rand() * .3}));
  for (const m of ms) { let g = m.a; for (let i = 0; i < n; i++) { out[i] += g * Math.sin(m.w * i + m.ph); g *= m.k; } }
  const an = Math.round(attack * RATE);
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    if (i < an) out[i] *= .5 - .5 * Math.cos(Math.PI * i / an);
    if (t < .02) out[i] += lp.step(rand() * 2 - 1) * clickAmt * Math.exp(-t / .002);
    out[i] *= vel;
  }
  return fadeEnd(out, .05);
}
const GLOCK_MODES = [[1, 1, 1], [2.76, .24, .42], [5.40, .08, .2], [8.93, .03, .1]];
const MARIMBA_MODES = [[1, 1, 1], [3.93, .2, .3], [9.2, .045, .12]];
function glock(midi, beat, vel) { const f = hz(midi); place(at(beat, 3), tame(modal(f, vel, GLOCK_MODES, 1.7 * (1000 / f) ** .25, .0012, .08, 4500), 2.6), 'glock'); }
function marimba(midi, beat, vel) { const f = hz(midi); place(at(beat, 3), tame(modal(f, vel, MARIMBA_MODES, 1.05 * (330 / f) ** .5, .0028, .07, 1600), 2.4), 'marimba'); }

// ---------- winds: clarinet (odd harmonics) and flute (mostly fundamental), breath noise, delayed vibrato ----------
function wind(kind, midi, beat, dur, vel, stacc) {
  const fl = kind === 'flute', f = hz(midi);
  const att = stacc ? (fl ? .024 : .02) : (fl ? .06 : .045), rel = stacc ? .045 : (fl ? .09 : .075);
  const n = Math.round((dur + rel + .01) * RATE), out = new Float32Array(n);
  const H = Math.max(1, Math.min(fl ? 6 : 14, Math.floor((fl ? 5200 : 4600) / f)));
  const amp = new Float64Array(H + 1);
  for (let h = 1; h <= H; h++) {
    if (fl) amp[h] = [0, 1, .3, .12, .05, .025, .012][h] * (h > 1 && f > 900 ? .7 : 1);
    else amp[h] = (h % 2 ? 1 : (f < 520 ? .1 : .28)) * h ** -.55 / (1 + (h * f / (1900 + 900 * Math.min(1, vel / GAIN.clarinet))) ** 2);
  }
  let norm = 0; for (let h = 1; h <= H; h++) norm += amp[h]; for (let h = 1; h <= H; h++) amp[h] /= norm ** .5;
  const vibRate = (fl ? 5.1 : 4.8) + rand() * .5, vibDepth = fl ? .0045 : .0018, vibDelay = fl ? .2 : .28, vibPh = rand() * 6.28;
  const breathF = new BQ(fl ? bq('bp', Math.min(f, 2500), 3) : bq('bp', 1700, .8)), hiss = new BQ(bq('bp', 2400, .9)), soften = new BQ(bq('lp', 6000, .7));
  let ph = rand() * 6.28;
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let env = t < att ? Math.sin(Math.PI / 2 * t / att) ** 2 : 1;
    if (!stacc && t > att) env *= 1 - .08 * Math.min(1, (t - att) / 1.5);
    if (t > dur) env *= Math.cos(Math.PI / 2 * Math.min(1, (t - dur) / rel));
    const vib = t > vibDelay ? Math.min(1, (t - vibDelay) / .35) * Math.sin(2 * Math.PI * vibRate * t + vibPh) : 0;
    const scoop = fl ? .003 * Math.exp(-t / .02) : -.005 * Math.exp(-t / .025);
    ph += 2 * Math.PI * f * (1 + vibDepth * vib + scoop) / RATE;
    const s1 = Math.sin(ph), c2 = 2 * Math.cos(ph); let a0 = 0, a1 = s1, sum = amp[1] * s1;
    for (let h = 2; h <= H; h++) { const nx = c2 * a1 - a0; a0 = a1; a1 = nx; sum += amp[h] * nx; }
    const nz = rand() * 2 - 1;
    const chiff = Math.exp(-t / .018);
    const breath = breathF.step(nz) * (fl ? .11 : .05) * (env + chiff) + hiss.step(nz) * (fl ? .018 : .012) * (env * .5 + chiff);
    out[i] = soften.step(sum * env * (1 + (fl ? .06 : .02) * vib) + breath) * vel;
  }
  place(at(beat, 4), out, kind, (rand() - .5) * .06);
}

// ---------- string pad: three detuned band-limited saws per note, slow bow ----------
const tables = new Map();
function sawTable(midi) {
  if (tables.has(midi)) return tables.get(midi);
  const f = hz(midi), S = 2048, H = Math.max(1, Math.floor(4000 / f)), t = new Float32Array(S + 1);
  for (let h = 1; h <= H; h++) { const a = 1 / h / (1 + (h * f / 1700) ** 2); for (let i = 0; i < S; i++) t[i] += a * Math.sin(2 * Math.PI * h * i / S); }
  t[S] = t[0]; tables.set(midi, t); return t;
}
function padNote(midi, beat, beats, vel, pan) {
  const f = hz(midi), dur = beats * BEAT, att = .35, rel = .32, n = Math.round((dur + rel + .01) * RATE), out = new Float32Array(n), T = sawTable(midi), S = 2048;
  const voices = [-7, 0, 6].map(c => ({inc: f * 2 ** ((c + gauss()) / 1200) * S / RATE, ph: rand() * S, vr: 4.6 + rand() * .8, vp: rand() * 6.28}));
  const lp = new BQ(bq('lp', 2600, .6));
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    let env = t < att ? Math.sin(Math.PI / 2 * t / att) ** 2 : 1;
    if (t > dur) env *= Math.cos(Math.PI / 2 * Math.min(1, (t - dur) / rel)) ** 2;
    let s = 0;
    for (const v of voices) {
      v.ph += v.inc * (1 + .0016 * Math.sin(2 * Math.PI * v.vr * t + v.vp)); if (v.ph >= S) v.ph -= S;
      const k = v.ph | 0, fr = v.ph - k; s += T[k] + (T[k + 1] - T[k]) * fr;
    }
    out[i] = lp.step(s / 3) * env * vel;
  }
  place(at(beat, 2), out, 'pad', pan);
}

// ---------- light percussion ----------
function woodblock(beat, high, vel) {
  const f = high ? 1180 : 840, n = Math.round(.09 * RATE), out = new Float32Array(n), lp = new BQ(bq('lp', 3500, .7));
  for (let i = 0; i < n; i++) { const t = i / RATE; out[i] = (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / .017) + .3 * Math.sin(2 * Math.PI * f * 2.37 * t) * Math.exp(-t / .006) + lp.step(rand() * 2 - 1) * .25 * Math.exp(-t / .0015)) * Math.min(1, t / .0006) * vel; }
  place(at(beat, 1.5), fadeEnd(out, .01), 'wood', high ? .04 : -.04);
}
function shaker(beat, vel) {
  const n = Math.round(.12 * RATE), out = new Float32Array(n), bp = new BQ(bq('bp', 4000, .9)), lp = new BQ(bq('lp', 7000, .7));
  for (let i = 0; i < n; i++) { const t = i / RATE, env = t < .014 ? (t / .014) ** 2 : Math.exp(-(t - .014) / .03); out[i] = lp.step(bp.step(rand() * 2 - 1)) * env * vel; }
  place(at(beat, 2), fadeEnd(out, .01), 'shaker');
}
function clap(beat, vel) {
  const n = Math.round(.17 * RATE), out = new Float32Array(n), bp = new BQ(bq('bp', 1250, 1.1));
  for (let i = 0; i < n; i++) {
    const t = i / RATE; let env = 0;
    for (const o of [0, .0085, .017]) if (t >= o) env += Math.exp(-(t - o) / .0035);
    if (t >= .024) env += .7 * Math.exp(-(t - .024) / .045);
    out[i] = bp.step(rand() * 2 - 1) * env * vel;
  }
  place(at(beat, 2), fadeEnd(out, .02), 'clap');
}

// ---------- harmony ----------
const QUAL = {'': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], m6: [0, 3, 7, 9], maj7: [0, 4, 7, 11]};
function parseChord(sym) { const m = sym.match(/^([A-G](?:#|b)?)(.*)$/); const root = PC[m[1]]; return {sym, root, pcs: QUAL[m[2]].map(i => (root + i) % 12)}; }
const trChord = (sym, t) => sym.split(' ').map(s => { const m = s.match(/^([A-G](?:#|b)?)(.*)$/); return NAMES[(PC[m[1]] + t + 12) % 12] + m[2]; }).join(' ');
const trBar = (bar, t) => bar.trim().split(/\s+/).map(x => x === '.' || x === '-' ? x : noteName(noteNum(x) + t)).join(' ');
function halvesOf(chords) { const h = []; for (const c of chords) { const p = c.split(' '); h.push(parseChord(p[0]), parseChord(p[1] ?? p[0])); } return h; }
function voicing(ch, lo, hi, n, prev) {
  const tones = []; for (let m = lo; m <= hi; m++) if (ch.pcs.includes(m % 12)) tones.push(m);
  let best = null, bestCost = Infinity;
  for (let i = 0; i + n <= tones.length; i++) {
    const v = tones.slice(i, i + n);
    let cost = prev ? v.reduce((s, x, k) => s + Math.abs(x - prev[Math.min(k, prev.length - 1)]), 0) : Math.abs((v[0] + v[n - 1]) / 2 - (lo + hi) / 2);
    if (!v.some(x => x % 12 === ch.pcs[1])) cost += 8;
    if (ch.pcs.length > 3 && v.some(x => x % 12 === ch.pcs[3])) cost -= 1;
    if (cost < bestCost) { bestCost = cost; best = v; }
  }
  return best;
}
const bassNote = pc => 34 + ((pc - 34) % 12 + 12) % 12; // Bb1..A2
const fifthOf = r => r + 7 <= 46 ? r + 7 : r - 5;
// The bass's second note in a one-chord bar: the fifth above or below (or the root an octave away) that steps nearest to the
// next bar's root, so the line leads into the next chord (A1-Bb1, B2-A2) instead of leaping a seventh or a tritone (E2-Bb1).
function bassSecond(r, next) {
  const fifths = [r + 7, r - 5].filter(m => m >= 33 && m <= 47);
  let best = fifths.reduce((a, m) => Math.abs(m - next) < Math.abs(a - next) ? m : a, fifths[0] ?? r);
  if (Math.abs(best - next) > 2) for (const o of [r - 12, r + 12]) if (o >= 33 && o <= 47 && Math.abs(o - next) < Math.abs(best - next)) best = o;
  return best;
}
// A harmony line a third (or sixth) below the tune, chord tones where the tune has chord tones, diatonic thirds elsewhere.
function harmonizeBelow(bars, chords, scale) {
  const halves = halvesOf(chords);
  return bars.map((bar, bi) => bar.trim().split(/\s+/).map((t, si) => {
    if (t === '.' || t === '-') return t;
    const m = noteNum(t), ch = halves[bi * 2 + (si >= 4 ? 1 : 0)], pc = m % 12;
    if (ch.pcs.includes(pc)) for (const iv of [3, 4, 8, 9, 5]) if (ch.pcs.includes((m - iv + 120) % 12)) return noteName(m - iv);
    const k = scale.indexOf(pc); if (k < 0) return noteName(m - 3);
    return noteName(m - ((pc - scale[(k + 5) % 7] + 12) % 12));
  }).join(' '));
}
function parseBars(bars) {
  const notes = []; let cur = null;
  bars.forEach((bar, bi) => {
    const tok = (bar ?? R8).trim().split(/\s+/); if (tok.length !== 8) throw new Error('bar needs 8 slots: ' + bar);
    tok.forEach((t, si) => {
      if (t === '.') cur = null; else if (t === '-') { if (cur) cur.len++; }
      else { cur = {slot: bi * 8 + si, len: 1, midi: noteNum(t)}; notes.push(cur); }
    });
  });
  return notes;
}
// Melody check: chord tones on beats 1 and 3, and on beats 2 and 4 unless it is a passing/neighbour note (stepwise both sides).
const warnings = [];
function checkLine(label, bars, chords, oct = 0) {
  const notes = parseBars(bars), halves = halvesOf(chords);
  notes.forEach((n, k) => {
    const s = n.slot % 8, ch = halves[Math.floor(n.slot / 8) * 2 + (s >= 4 ? 1 : 0)];
    if (ch.pcs.includes(n.midi % 12)) return;
    const prev = notes[k - 1], next = notes[k + 1], step = o => o && Math.abs(o.midi - n.midi) <= 2;
    if (s === 0 || s === 4) warnings.push(`${label} bar ${Math.floor(n.slot / 8) + 1} slot ${s}: ${noteName(n.midi + oct)} not in ${ch.sym} on a strong beat`);
    else if ((s === 2 || s === 6) && !(step(prev) && step(next))) warnings.push(`${label} bar ${Math.floor(n.slot / 8) + 1} slot ${s}: ${noteName(n.midi + oct)} over ${ch.sym} is not stepwise`);
  });
}

// ---------- the score ----------
const R8 = '. . . . . . . .';
// Hook (antecedent): a staccato bounce up the F chord, an answer that runs down, rests left open for the reply.
const H_CH = ['F', 'F', 'Bb', 'C7', 'F', 'Dm', 'Gm7 C7', 'F'];
const H = ['A4 . C5 . F5 - E5 F5', 'A5 G5 F5 . C5 . . .', 'D5 . F5 D5 Bb4 . C5 D5', 'E5 . C5 . . . . .',
  'A4 . C5 . F5 - E5 F5', 'A5 G5 F5 E5 D5 . . .', 'Bb4 D5 G5 F5 E5 . G5 .', 'F5 . C5 . F4 . . .'];
const H_ANS = [R8, '. . . . . F4 A4 C5', R8, '. . . . Bb4 A4 G4 E4', R8, '. . . . . A4 F4 D4', R8, '. . . . . F4 G4 G#4'];
const H_CTR = ['F4 - - - - - - -', 'A4 - - - C5 Bb4 A4 G4', 'F4 - - - D4 - - -', 'E4 - - - G4 A4 Bb4 B4',
  'C5 - - - A4 - - -', 'F4 - - - A4 - - -', 'G4 - - - Bb4 - - -', 'A4 - - - . C5 A4 F4'];
// Hook (consequent): same opening, climbs to Bb, a D7 colour, lands high.
const H2_CH = ['F', 'F', 'Bb', 'Bb', 'F', 'D7', 'Gm7 C7', 'F'];
const H2 = ['A4 . C5 . F5 - E5 F5', 'A5 G5 F5 . C5 . . .', 'Bb5 . A5 G5 F5 . D5 .', 'F5 - D5 . Bb4 . . .',
  'C5 . F5 . A5 - G5 A5', 'C6 . A5 . F#5 - D5 .', 'Bb5 A5 G5 F5 E5 . G5 Bb5', 'A5 . F5 . . . . .'];
const H2_ANS = [R8, '. . . . . C6 A5 F5', R8, '. . . . . D6 C6 Bb5', R8, R8, R8, '. . . . C6 A5 F5 .'];
// B theme: legato, starts on IV.
const B_CH = ['Bb', 'C', 'Am7', 'Dm', 'Gm7', 'C7', 'F', 'C7'];
const B = ['D5 - - C5 Bb4 - F4 -', 'G4 - - A4 G4 - E4 -', 'A4 - C5 - E5 - D5 C5', 'D5 - - - A4 - . .',
  'Bb4 - - C5 D5 - F5 -', 'E5 - D5 - C5 - Bb4 -', 'A4 - - - C5 - F5 -', 'E5 - - - . . . .'];
const B2_CH = ['Bb', 'C', 'Am7', 'Dm', 'Gm7', 'C7', 'F Bb', 'Gm7 C7'];
const B2 = [...B.slice(0, 6), 'A4 - C5 - Bb4 - D5 -', 'G4 - Bb4 - E4 - . .'];
const B2_CTR = ['F4 - - - D4 - F4 -', 'E4 - - - G4 - E4 -', 'E4 - - - G4 - A4 -', 'F4 - - - D4 - F4 -',
  'G4 - - - F4 - D4 -', 'E4 - - - G4 - Bb4 -', 'F4 - - - D4 - F4 -', 'D4 - - - C4 - E4 -'];
// Breakdown: marimba calls with the hook's opening, pizzicato answers.
const BRK_CH = ['F', 'Bb', 'F', 'C7', 'F', 'Bb', 'Gm7 C7', 'F A7'];
const BRK_MAR = ['A4 . C5 . F5 - E5 F5', R8, 'C6 A5 F5 . C5 . A4 .', R8, 'A4 . C5 . F5 - E5 F5', R8, 'Bb4 D5 G5 . E5 G5 C6 .', 'F5 . C5 . C#5 . E5 .'];
const BRK_PIZ = [R8, 'D5 . F5 . Bb5 . A5 Bb5', R8, 'Bb4 . G4 . E4 . G4 .', R8, 'F5 . D5 . Bb4 . D5 .', R8, R8];
// Bridge in D minor with the string pad, then a lift through Am7-D7 into G.
const BR1_CH = ['Dm', 'Bb', 'Gm', 'A7', 'Dm', 'Bb', 'Gm6', 'A7'];
const BR1 = ['A4 - - - D5 - E5 -', 'F5 - - - D5 - - -', 'Bb4 - - - D5 - G5 -', 'E5 - - - C#5 - A4 -',
  'A4 - - - D5 - F5 -', 'D5 - F5 - Bb5 - A5 -', 'G5 - - - E5 - D5 -', 'C#5 - - - E5 - - -'];
const BR1_FL = [R8, R8, R8, R8, 'D5 - - - F5 - A5 -', 'F5 - Bb5 - D6 - C6 -', 'Bb5 - - - G5 - F5 -', 'E5 - - - G5 - - -'];
const BR2_CH = ['Bb', 'C', 'Am', 'Dm', 'Bb', 'C', 'Am7', 'D7'];
const BR2 = ['F5 - - G5 F5 - D5 -', 'E5 - - F5 G5 - C5 -', 'A5 - - G5 E5 - C5 -', 'D5 - - - F5 - A5 -',
  'Bb5 - - A5 F5 - D5 -', 'C6 - - Bb5 G5 - E5 -', 'C6 - - B5 A5 - G5 -', 'A5 - F#5 - D5 - C5 .'];
const BR2_CL = ['D5 - - - - - Bb4 -', 'C5 - - - - - G4 -', 'C5 - - - - - A4 -', 'A4 - - - D5 - F5 -',
  'D5 - - - - - Bb4 -', 'E5 - - - - - C5 -', 'E5 - - - - - - -', 'D5 - - - A4 - F#4 .'];
// Key lift: the hook in G, then its answer, pivoting on C7 back to F.
const G_SCALE = [7, 9, 11, 0, 2, 4, 6];
const HG_CH = H_CH.map(c => trChord(c, 2)), HG = H.map(b => trBar(b, 2));
const H2G_CH = [...H2_CH.slice(0, 7).map(c => trChord(c, 2)), 'G C7'];
const H2G = [...H2.slice(0, 7).map(b => trBar(b, 2)), 'B5 . G5 . E5 . C5 .'];
const H2G_HARM = [...harmonizeBelow(H2G.slice(0, 7), H2G_CH.slice(0, 7), G_SCALE), 'G5 . D5 . Bb4 . G4 G#4'];
// Tag: clarinet and flute trade the hook, then a C7 turnaround with a chromatic pickup into bar 1.
const TAG_CH = ['F', 'Dm', 'Bb', 'C7', 'F', 'Dm', 'Gm7', 'C7'];
const TAG_CL = ['A4 . C5 . F5 - E5 F5', R8, 'D5 . F5 . Bb5 - A5 Bb5', R8, 'A4 . C5 . F5 - E5 F5', R8, 'G4 . Bb4 . D5 . F5 .', 'G4 . E4 . . . . .'];
const TAG_FL = [R8, 'A5 G5 F5 . D5 . . .', R8, 'C6 Bb5 G5 . E5 . . .', R8, 'A5 G5 F5 E5 D5 . . .', 'Bb4 . D5 . G5 . Bb5 .', 'E5 . C5 . G4 A4 Bb4 B4'];
const INTRO_CH = ['F', 'F', 'Bb', 'Bb', 'F', 'F', 'Gm7', 'C7'];

const FULL = {tuba: 'oompah', kick: .65, pah: .85, guitar: 'chuck', shaker: .9};
const SCORE = [
  {name: 'Intro groove', chords: INTRO_CH, groove: {tuba: 'oompah', kick: .55, arp: 1.6, guitar: 'chuck', guitarFrom: 2, wood: 'light', shaker: .8}, groove2: {arp: 1.25, wood: 'clip'}, tubaBars: {7: 'C2 . D2 . E2 . . .'},
    lead: 'pizzicato arpeggio engine with tuba, guitar joins at bar 3; flute lands the pickup, glockenspiel teases the hook',
    parts: [{inst: 'flute', vel: .6, stacc: true, bars: ['C5 . . . . . . .']},
      {inst: 'glock', vel: 1.1, oct: 12, bars: ['C5 . . . . . . .', R8, R8, R8, 'A4 . C5 . F5 . . .', R8, 'Bb4 . D5 . G5 . . .', 'G5 . E5 . C5 . Bb4 .']}]},
  {name: 'Hook A', chords: H_CH, groove: {...FULL, wood: 'clip'}, lead: 'pizzicato violins + glockenspiel, clarinet answers',
    parts: [{inst: 'pizz', vel: .95, bars: H}, {inst: 'glock', vel: .75, oct: 12, bars: H}, {inst: 'clarinet', vel: .75, stacc: true, bars: H_ANS}]},
  {name: 'Hook A answered', chords: H2_CH, groove: {...FULL, wood: 'gallop'}, tubaBars: {7: 'F2 . . . D2 . C2 .'}, lead: 'clarinet + glockenspiel, flute answers',
    parts: [{inst: 'clarinet', vel: .95, stacc: true, bars: H2}, {inst: 'glock', vel: .6, oct: 12, bars: H2}, {inst: 'flute', vel: 1, stacc: true, bars: H2_ANS}]},
  {name: 'B theme', chords: B_CH, groove: {tuba: 'oompah', kick: .5, arp: .75, guitar: 'strum', shaker: .7}, lead: 'clarinet legato over pizzicato arpeggios, flute pickup',
    parts: [{inst: 'clarinet', vel: .95, bars: B}, {inst: 'flute', vel: .7, stacc: true, bars: [R8, R8, R8, R8, R8, R8, R8, '. . . . G5 A5 Bb5 C6']}]},
  {name: 'B theme answered', chords: B2_CH, groove: {...FULL, kick: .5, pah: .75, wood: 'light', shaker: .75}, tubaBars: {7: 'G2 . . . C2 . E2 .'}, lead: 'flute (octave up) + clarinet counter-line',
    parts: [{inst: 'flute', vel: .85, oct: 12, bars: B2}, {inst: 'clarinet', vel: .6, bars: B2_CTR}]},
  {name: 'Hook A returns', chords: H_CH, groove: {...FULL, kick: .7, wood: 'trot'}, lead: 'flute + glockenspiel, clarinet counter-melody',
    parts: [{inst: 'flute', vel: .95, stacc: true, bars: H}, {inst: 'glock', vel: .7, oct: 12, bars: H}, {inst: 'clarinet', vel: .62, bars: H_CTR}]},
  {name: 'Breakdown', chords: BRK_CH, groove: {pizzBass: 'oompah', pah: .55, guitar: 'pick', gvel: .7, wood: 'light', shaker: .7}, bassBars: {7: 'F2 . . . A1 . C#2 .'}, lead: 'marimba calls, pizzicato answers; pizzicato bass and soft fingerpicked guitar instead of tuba and chucks',
    parts: [{inst: 'marimba', vel: 1, bars: BRK_MAR}, {inst: 'pizz', vel: 1.3, bars: BRK_PIZ}]},
  {name: 'Bridge (D minor)', chords: BR1_CH, groove: {pizzBass: 'half', guitar: 'pick', shaker: .45, pad: 1}, lead: 'clarinet over string pad, flute harmony in the second half',
    parts: [{inst: 'clarinet', vel: .78, bars: BR1}, {inst: 'flute', vel: .55, bars: BR1_FL}]},
  {name: 'Bridge lift', chords: BR2_CH, groove: {tuba: 'half', guitar: 'pick', shaker: .55, pad: .9},
    groove2: {tuba: 'oompah', kick: .5, pah: .7, guitar: 'chuck', shaker: .75, pad: .7, wood: 'light'}, tubaBars: {7: 'D2 . E2 . F#2 . . .'},
    lead: 'flute over pad, clarinet inner line, groove rebuilds, D7 lifts to G',
    parts: [{inst: 'flute', vel: .8, bars: BR2}, {inst: 'clarinet', vel: .58, bars: BR2_CL}]},
  {name: 'Hook in G', chords: HG_CH, groove: {...FULL, kick: .7, wood: 'clip', shaker: 1, clap: .8, pad: .5}, lead: 'tutti: flute with the clarinet an octave below, glockenspiel an octave above, pizzicato, pad, claps',
    parts: [{inst: 'flute', vel: .86, stacc: true, bars: HG}, {inst: 'clarinet', vel: .7, oct: -12, stacc: true, bars: HG}, {inst: 'glock', vel: .7, oct: 12, bars: HG}, {inst: 'pizz', vel: .42, bars: HG}]},
  {name: 'Hook answered in G', chords: H2G_CH, groove: {...FULL, kick: .7, wood: 'gallop', shaker: 1, clap: .8, pad: .5}, tubaBars: {7: 'G2 . . . C2 . E2 .'},
    lead: 'flute + glockenspiel, clarinet in thirds below, C7 pivot home',
    parts: [{inst: 'flute', vel: .95, stacc: true, bars: H2G}, {inst: 'glock', vel: .7, oct: 12, bars: H2G}, {inst: 'clarinet', vel: .7, stacc: true, bars: H2G_HARM}]},
  {name: 'Tag + turnaround', chords: TAG_CH, groove: {...FULL, kick: .6, pah: .8, wood: 'clip', shaker: .85}, tubaBars: {7: 'C2 . D2 . E2 . . .'},
    lead: 'clarinet and flute trade the hook, glockenspiel echoes, pickup into bar 1',
    parts: [{inst: 'clarinet', vel: .9, stacc: true, bars: TAG_CL}, {inst: 'flute', vel: .85, stacc: true, bars: TAG_FL},
      {inst: 'glock', vel: .55, oct: 12, bars: [TAG_CL[0], R8, TAG_CL[2], R8, TAG_CL[4], R8, R8, R8]}]},
];
if (SCORE.length !== SECTIONS) throw new Error('need ' + SECTIONS + ' sections');

// Check every line against its chords before rendering.
for (const S of SCORE) for (const p of S.parts) checkLine(`${S.name}/${p.inst}`, p.bars.concat(Array(8 - p.bars.length).fill(R8)), S.chords, p.oct ?? 0);

// ---------- render ----------
const GAIN = {pizz: .48, pah: .18, arp: .215, pizzBass: .375, guitar: .103, tuba: .33, kick: .21, glock: .11, marimba: .26, clarinet: .188, flute: .175, pad: .041, wood: .095, shaker: .11, clap: .24};
const WOOD = {light: '. . . . . . . h', clip: 'h . . l . . h .', gallop: '. . h l . . h l', trot: 'h . l . h . l .'};
function slotLine(bar, beat0, fn) { for (const n of parseBars([bar])) fn(n.midi, beat0 + n.slot / 2, n.len / 2); }
const human = () => 1 + clamp(gauss(), -2, 2) * .06;

function renderPart(startBar, p) {
  for (const n of parseBars(p.bars)) {
    const beat = startBar * 4 + n.slot / 2, s = n.slot % 8, accent = s === 0 ? 1.06 : s % 2 ? .92 : 1;
    const vel = p.vel * accent * human(), midi = n.midi + (p.oct ?? 0);
    if (p.inst === 'pizz') pizz('pizz', midi, beat, vel * GAIN.pizz);
    else if (p.inst === 'glock') glock(midi, beat, vel * GAIN.glock);
    else if (p.inst === 'marimba') marimba(midi, beat, vel * GAIN.marimba);
    else {
      const dur = p.stacc ? (n.len === 1 ? EIGHTH * .5 : n.len * EIGHTH * .8) : n.len * EIGHTH - .02;
      const artic = p.stacc ? (n.len === 1 ? 1 : .8) : .62; // held notes carry more energy than staccato ones
      wind(p.inst, midi, beat, dur, vel * GAIN[p.inst] * artic, !!p.stacc && n.len === 1);
    }
  }
}

// Every half-bar chord of the loop, so a part can look ahead across section boundaries (and from bar 96 into bar 1).
const ALL_HALVES = SCORE.flatMap(S => halvesOf(S.chords));
// How long a fingerpicked string may ring: until the first chord that no longer contains it (the fretting hand moves),
// at most 0.95 s. Before, every picked note rang 0.95 s into the next chord (D4 under the clarinet's C#5 on A7, C4 under A7).
function ringFor(midi, beat) {
  const h0 = Math.floor(beat / 2 + 1e-6);
  for (let h = h0 + 1; h <= h0 + 3; h++) if (!ALL_HALVES[h % ALL_HALVES.length].pcs.includes(midi % 12)) return clamp((h * 2 - beat) * BEAT - .012, .08, .95);
  return .95;
}
let prevPad = null; const padNotes = []; // the pad is voice-led (and tied) across section boundaries too
SCORE.forEach((S, si) => {
  const startBar = si * 8, halves = halvesOf(S.chords);
  let prevPah = null, prevArp = null, prevGtr = null;
  const padSegs = [];
  for (let b = 0; b < 8; b++) {
    const G = {...S.groove, ...(b >= 4 ? S.groove2 ?? {} : {})}, B = (startBar + b) * 4, c1 = halves[b * 2], c2 = halves[b * 2 + 1];
    const next = ALL_HALVES[((startBar + b + 1) % BARS) * 2], r1 = bassNote(c1.root), second = c2.sym !== c1.sym ? bassNote(c2.root) : bassSecond(r1, bassNote(next.root));
    // bass: tuba oom-pah (or half notes), or pizzicato bass in the lighter sections
    if (G.tuba) {
      if (S.tubaBars?.[b]) slotLine(S.tubaBars[b], B, (m, beat, len) => tuba(m, beat, Math.min(len, .5) * .9, .92 * GAIN.tuba * human()));
      else if (G.tuba === 'oompah') { tuba(r1, B, .72, GAIN.tuba * human()); tuba(second, B + 2, .72, .88 * GAIN.tuba * human()); }
      else { tuba(r1, B, 1.8, .64 * GAIN.tuba * human()); tuba(second, B + 2, 1.8, .58 * GAIN.tuba * human()); } // held half notes carry more energy than the oom-pah
    }
    if (G.pizzBass) {
      const ring = G.pizzBass === 'half';
      if (S.bassBars?.[b]) slotLine(S.bassBars[b], B, (m, beat) => pizzBass(m, beat, GAIN.pizzBass * human(), false));
      else { pizzBass(r1, B, GAIN.pizzBass * human(), ring); pizzBass(second, B + 2, .88 * GAIN.pizzBass * human(), ring); }
    }
    if (G.kick) kick(B, G.kick * GAIN.kick * (b % 2 ? .8 : 1)); // a soft thump under the first oom only
    // pizzicato "pah" on 2 and 4, or running arpeggios
    if (G.pah) for (const [beat, ch] of [[1, c1], [3, c2]]) {
      const v = voicing(ch, 55, 70, 3, prevPah); prevPah = v;
      v.forEach(m => pizz('pah', m, B + beat, G.pah * GAIN.pah * human(), 1, 3));
    }
    if (G.arp) for (let e = 0; e < 8; e++) {
      const v = voicing(e < 4 ? c1 : c2, 57, 76, 4, prevArp); prevArp = v;
      pizz('arp', v[[0, 1, 2, 3, 2, 1, 2, 1][e]], B + e / 2, G.arp * GAIN.arp * (e % 2 ? .8 : 1) * human(), 1, 3);
    }
    // guitar: off-beat chucks, a boom-chick strum, or fingerpicking
    if (G.guitar === 'chuck' && b >= (G.guitarFrom ?? 0)) for (const e of [1, 3, 5, 7]) {
      const v = voicing(e < 4 ? c1 : c2, 53, 69, 4, prevGtr); prevGtr = v;
      strum(B + e / 2, v, {up: true, vel: GAIN.guitar * (e === 3 || e === 7 ? 1 : .8) * human(), mute: e === 3 || e === 7 ? .19 : .13});
    }
    if (G.guitar === 'strum') for (const [e, up] of [[2, false], [3, true], [6, false], [7, true]]) {
      const ch = e < 4 ? c1 : c2, v = voicing(ch, 53, 69, 4, prevGtr); prevGtr = v;
      strum(B + e / 2, up ? v : [bassNote(ch.root) + 12, ...v], {up, vel: GAIN.guitar * (up ? .75 : .9) * human(), mute: .16});
    }
    if (G.guitar === 'pick') for (let e = 0; e < 8; e++) {
      const ch = e < 4 ? c1 : c2, v = voicing(ch, 55, 69, 3, prevGtr); prevGtr = v;
      const low = bassNote(ch.root) + 12, m = e === 0 ? low : e === 4 ? (c2.sym !== c1.sym ? low : fifthOf(bassNote(ch.root)) + 12) : v[[0, 1, 2, 0, 0, 1, 2, 1][e]];
      pickNote(m, B + e / 2, GAIN.guitar * (G.gvel ?? 1) * (e % 4 === 0 ? .85 : .6) * human(), ringFor(m, B + e / 2));
    }
    // light percussion
    if (G.wood) WOOD[G.wood].split(' ').forEach((t, e) => { if (t !== '.') woodblock(B + e / 2, t === 'h', GAIN.wood * (t === 'h' ? 1 : .85) * human()); });
    if (G.shaker) for (let e = 0; e < 8; e++) shaker(B + e / 2, G.shaker * GAIN.shaker * (e % 2 ? 1 : .6) * (.85 + .3 * rand()));
    if (G.clap) for (const beat of [1, 3]) clap(B + beat, G.clap * GAIN.clap * human());
    if (G.pad) for (const [h, ch] of [[0, c1], [1, c2]]) {
      const last = padSegs[padSegs.length - 1];
      if (last && last.ch.sym === ch.sym && last.end === B + h * 2) { last.end += 2; continue; }
      padSegs.push({ch, start: B + h * 2, end: B + h * 2 + 2, vel: G.pad});
    }
  }
  // String pad: voice-led chords; a tone the next chord shares is held on (tied, no new bow), the others change with a short
  // crossfade. Before, every chord rang on 1.1 s under the next one (A under Bb, C# under D, E under F at full level for ~0.5 s).
  if (!padSegs.length) prevPad = null;
  for (const seg of padSegs) {
    const v = voicing(seg.ch, 53, 72, 4, prevPad); prevPad = v;
    v.forEach((m, k) => {
      const open = padNotes.find(p => p.midi === m && p.end === seg.start);
      if (open) open.end = seg.end; else padNotes.push({midi: m, start: seg.start, end: seg.end, vel: seg.vel, pan: (k - 1.5) * .2});
    });
  }
  for (const p of S.parts) renderPart(startBar, p);
});
for (const p of padNotes) padNote(p.midi, p.start, p.end - p.start, p.vel * GAIN.pad, p.pan);

// ---------- room: Freeverb-style combs + allpasses, run twice round the loop so the start holds the end's tail ----------
function reverb() {
  const sc = RATE / 44100, spread = Math.round(23 * sc), pre = Math.round(.016 * RATE);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(x => Math.round(x * sc));
  const aps = [556, 441, 341, 225].map(x => Math.round(x * sc));
  const mk = lens => lens.map(n => ({b: new Float32Array(n), i: 0, s: 0}));
  const cL = mk(combs), cR = mk(combs.map(x => x + spread)), aL = mk(aps), aR = mk(aps.map(x => x + spread));
  const fb = .86, damp = .32, hp = new BQ(bq('hp', 220, .7)), lp = new BQ(bq('lp', 5200, .7));
  const outL = new Float32Array(COUNT), outR = new Float32Array(COUNT);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) {
    let j = i - pre; if (j < 0) j += COUNT;
    const x = lp.step(hp.step(SEND[j])) * .02;
    let sl = 0, sr = 0;
    for (const c of cL) { const y = c.b[c.i]; c.s = y * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; if (++c.i === c.b.length) c.i = 0; sl += y; }
    for (const c of cR) { const y = c.b[c.i]; c.s = y * (1 - damp) + c.s * damp; c.b[c.i] = x + c.s * fb; if (++c.i === c.b.length) c.i = 0; sr += y; }
    for (const a of aL) { const bo = a.b[a.i]; a.b[a.i] = sl + bo * .5; sl = bo - sl; if (++a.i === a.b.length) a.i = 0; }
    for (const a of aR) { const bo = a.b[a.i]; a.b[a.i] = sr + bo * .5; sr = bo - sr; if (++a.i === a.b.length) a.i = 0; }
    if (pass) { outL[i] = sl; outR[i] = sr; }
  }
  return [outL, outR];
}
const rmsOf = (...bufs) => { let e = 0, n = 0; for (const b of bufs) { for (let i = 0; i < b.length; i++) e += b[i] * b[i]; n += b.length; } return Math.sqrt(e / n); };
const [wetL, wetR] = reverb();
const WET = .24 * rmsOf(L, R) / rmsOf(wetL, wetR); // reverb sits about 12 dB under the dry mix
for (let i = 0; i < COUNT; i++) { L[i] += wetL[i] * WET; R[i] += wetR[i] * WET; }

// Master: a 28 Hz high-pass, a little presence above 2.5 kHz and a dip around 9 kHz, all run twice round the loop.
for (const ch of [L, R]) {
  const fs = [new BQ(bq('hp', 28, .7)), new BQ(bq('hshelf', 2500, .7, 3.5)), new BQ(bq('peak', 9000, .7, -4))];
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) { let x = ch[i]; for (const f of fs) x = f.step(x); if (pass) ch[i] = x; }
}

// ---------- level: a gentle look-ahead peak limiter (gain envelope computed round the loop), then a tanh soft clip ----------
const CEIL = .33, KNEE = .3, LIMIT = .3, LOOK = Math.round(.003 * RATE), RELEASE = Math.exp(-1 / (.09 * RATE));
const lim = x => { const a = Math.abs(x); if (a <= KNEE) return x; const y = KNEE + (CEIL - KNEE) * Math.tanh((a - KNEE) / (CEIL - KNEE)); return x < 0 ? -y : y; };
const GR = new Float32Array(COUNT);
function limiterGain(M) {
  const want = new Float32Array(COUNT).fill(1);
  for (let i = 0; i < COUNT; i++) {
    const a = Math.max(Math.abs(L[i]), Math.abs(R[i])) * M; if (a <= LIMIT) continue;
    const r = LIMIT / a; for (let k = 0; k <= LOOK; k++) { let j = i - LOOK + k; if (j < 0) j += COUNT; const v = 1 - (1 - r) * k / LOOK; if (v < want[j]) want[j] = v; }
  }
  let g = 1;
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) { const t = want[i]; g = t < g ? t : t + (g - t) * RELEASE; if (pass) GR[i] = g; }
}
function rmsAfter(M) { let e = 0, n = 0; for (let i = 0; i < COUNT; i += 3) { const a = lim(L[i] * M * GR[i]), b = lim(R[i] * M * GR[i]); e += a * a + b * b; n += 2; } return Math.sqrt(e / n); }
const TARGET = .065; let MASTER = TARGET / rmsOf(L, R);
for (let k = 0; k < 4; k++) { limiterGain(MASTER); MASTER *= TARGET / rmsAfter(MASTER); }
limiterGain(MASTER);
let grMin = 1, grOver1dB = 0, grOver3dB = 0; const grSec = new Float64Array(SECTIONS);
for (let i = 0; i < COUNT; i++) { grMin = Math.min(grMin, GR[i]); if (GR[i] < .891) grOver1dB++; if (GR[i] < .708) grOver3dB++; grSec[Math.min(SECTIONS - 1, Math.floor(i / (8 * BAR * RATE)))] += -20 * Math.log10(GR[i]); }
const grSecDb = Array.from(grSec, x => +(x / (8 * BAR * RATE)).toFixed(2));
console.log('limiter mean gain reduction per section (dB):', grSecDb.join(' '));
for (let i = 0; i < COUNT; i++) { L[i] *= GR[i]; R[i] *= GR[i]; }
const outL = new Int16Array(COUNT), outR = new Int16Array(COUNT);
let nan = 0, clipped = 0, overKnee = 0, prePeak = 0;
for (let i = 0; i < COUNT; i++) for (const x of [L[i] * MASTER, R[i] * MASTER]) { if (Math.abs(x) > KNEE) overKnee++; prePeak = Math.max(prePeak, Math.abs(x)); }
for (let i = 0; i < COUNT; i++) {
  for (const [src, dst] of [[L, outL], [R, outR]]) {
    let v = src[i]; if (!Number.isFinite(v)) { nan++; v = 0; }
    const q = Math.round(lim(v * MASTER) * 32767); if (Math.abs(q) >= 32767) clipped++;
    dst[i] = q;
  }
}

// ---------- write WAV ----------
function wav(frames, l, r) {
  const n = frames, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(l[i], 44 + i * 4); buf.writeInt16LE(r[i], 46 + i * 4); }
  return buf;
}
writeFileSync(join(DIR, SLUG + '.wav'), wav(COUNT, outL, outR));
// Seam preview source: the last 15 s straight into the first 15 s.
if (process.argv.includes('--seam')) {
  const k = 15 * RATE, sl = new Int16Array(2 * k), sr = new Int16Array(2 * k);
  for (let i = 0; i < k; i++) { sl[i] = outL[COUNT - k + i]; sr[i] = outR[COUNT - k + i]; sl[k + i] = outL[i]; sr[k + i] = outR[i]; }
  writeFileSync(join(DIR, SLUG + '-seam.wav'), wav(2 * k, sl, sr));
}

// ---------- metrics ----------
const fl = Float64Array.from(outL, v => v / 32767), fr = Float64Array.from(outR, v => v / 32767);
let peak = 0; for (let i = 0; i < COUNT; i++) peak = Math.max(peak, Math.abs(fl[i]), Math.abs(fr[i]));
function steps(x) {
  const d = new Float64Array(COUNT - 1); for (let i = 1; i < COUNT; i++) d[i - 1] = Math.abs(x[i] - x[i - 1]);
  let mean = 0; for (const v of d) mean += v; mean /= d.length;
  const sorted = Float64Array.from(d).sort();
  return {seam: Math.abs(x[COUNT - 1] - x[0]), mean, median: sorted[sorted.length >> 1], p99: sorted[Math.floor(sorted.length * .99)], max: sorted[sorted.length - 1]};
}
const stL = steps(fl), stR = steps(fr);
let quiet = 1; const W = Math.round(.05 * RATE);
for (let i = 0; i + W <= COUNT; i += W) { let e = 0; for (let j = i; j < i + W; j++) e += fl[j] ** 2 + fr[j] ** 2; quiet = Math.min(quiet, Math.sqrt(e / (2 * W))); }
const secRms = SCORE.map((S, si) => { const a = Math.round(si * 8 * BAR * RATE), b = Math.round((si + 1) * 8 * BAR * RATE); let e = 0; for (let i = a; i < b; i++) e += fl[i] ** 2 + fr[i] ** 2; return Math.sqrt(e / (2 * (b - a))); });
const secSpk = SCORE.map((S, si) => { const a = Math.round(si * 8 * BAR * RATE), b = Math.round((si + 1) * 8 * BAR * RATE); let e = 0; for (const x of [fl, fr]) { const w = new BQ(SPEAKER); for (let i = a - 3200; i < b; i++) { const y = w.step(x[(i + COUNT) % COUNT]); if (i >= a) e += y * y; } } return Math.sqrt(e / (2 * (b - a))); });
let hfE = 0, allE = 0;
for (const x of [fl, fr]) { const f1 = new BQ(bq('hp', 6000, .5412)), f2 = new BQ(bq('hp', 6000, 1.3066)); for (let i = 0; i < COUNT; i++) { const y = f2.step(f1.step(x[i])); hfE += y * y; allE += x[i] * x[i]; } }
// Each instrument's small-speaker level per section, in dB relative to the final overall RMS (pan and reverb ignored).
const instShare = {}, instFull = {}, instK = {}, secFrames = 8 * BAR * RATE;
const shareOf = (src, dst) => { for (const [k, arr] of Object.entries(src)) dst[k] = Array.from(arr, e => e > 0 ? +(10 * Math.log10(e / secFrames) + 20 * Math.log10(MASTER / TARGET)).toFixed(1) : null); };
shareOf(stats, instShare); shareOf(statsFull, instFull); shareOf(statsK, instK);
// K-weighted loudness per section (dB relative to the whole loop) and the share of energy below 80 Hz.
const secK = SCORE.map((S, si) => { const a = Math.round(si * 8 * BAR * RATE), b = Math.round((si + 1) * 8 * BAR * RATE); let e = 0; for (const x of [fl, fr]) { const f1 = new BQ(KSHELF), f2 = new BQ(KHP); for (let i = a - 3200; i < b; i++) { const y = f2.step(f1.step(x[(i + COUNT) % COUNT])); if (i >= a) e += y * y; } } return e / (2 * (b - a)); });
const kAll = secK.reduce((s, x) => s + x, 0) / SECTIONS, secKdb = secK.map(x => +(10 * Math.log10(x / kAll)).toFixed(1));
let lowE = 0; for (const x of [fl, fr]) { const f1 = new BQ(bq('lp', 80, .5412)), f2 = new BQ(bq('lp', 80, 1.3066)); for (let i = 0; i < COUNT; i++) { const y = f2.step(f1.step(x[i])); lowE += y * y; } }
const r4 = x => +x.toFixed(5);
const metrics = {
  title: 'Morning Market', slug: SLUG, duration_seconds: +(COUNT / RATE).toFixed(3), sample_rate: RATE, channels: 2, frames: COUNT, bars: BARS, bpm: BPM, key: 'F major (bridge D minor, key lift to G)',
  rms: r4(Math.sqrt((rmsOf(fl) ** 2 + rmsOf(fr) ** 2) / 2)), rms_left: r4(rmsOf(fl)), rms_right: r4(rmsOf(fr)), peak: r4(peak),
  seam_step: {left: r4(stL.seam), right: r4(stR.seam)}, adjacent_step: {left: {mean: r4(stL.mean), median: r4(stL.median), p99: r4(stL.p99), max: r4(stL.max)}, right: {mean: r4(stR.mean), median: r4(stR.median), p99: r4(stR.p99), max: r4(stR.max)}},
  quietest_50ms_rms: r4(quiet), section_rms: Object.fromEntries(SCORE.map((S, i) => [`${i + 1}. ${S.name}`, r4(secRms[i])])),
  section_rms_ratio_min_over_max: +(Math.min(...secRms) / Math.max(...secRms)).toFixed(3),
  section_rms_small_speaker: secSpk.map(r4), section_small_speaker_ratio: +(Math.min(...secSpk) / Math.max(...secSpk)).toFixed(3), energy_share_above_6khz: +(hfE / allE).toFixed(5), energy_share_below_80hz: +(lowE / allE).toFixed(4), section_loudness_k_db: secKdb,
  nan_samples: nan, clipped_samples: clipped, limiter: {peak_before_soft_clip: r4(prePeak), share_over_knee: +(overKnee / (2 * COUNT)).toExponential(2), max_gain_reduction_db: +(20 * Math.log10(grMin)).toFixed(2), time_share_over_1db_reduction: +(grOver1dB / COUNT).toFixed(4), time_share_over_3db_reduction: +(grOver3dB / COUNT).toFixed(5), mean_reduction_db_per_section: grSecDb}, master_gain: r4(MASTER), reverb_wet: r4(WET), render_seconds: +((performance.now() - started) / 1000).toFixed(1),
  form: SCORE.map((S, i) => `${i + 1}. bars ${i * 8 + 1}-${i * 8 + 8} ${S.name} [${S.chords.join(' | ')}]: ${S.lead}`),
  instrument_share_db_per_section: instShare, instrument_fullband_db_per_section: instFull, instrument_loudness_k_db_per_section: instK, melody_warnings: warnings,
};
writeFileSync(join(DIR, SLUG + '.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(JSON.stringify({...metrics, form: undefined, instrument_share_db_per_section: undefined, instrument_fullband_db_per_section: undefined, instrument_loudness_k_db_per_section: undefined}));
console.log('peak per note x master:', Object.entries(peaks).map(([k, v]) => k + ' ' + (v * MASTER).toFixed(3)).join(', '));
console.log('small-speaker level per instrument (dB re overall rms):'); console.log('section  ', secSpk.map(x => (20 * Math.log10(x / TARGET)).toFixed(1).padStart(5)).join(' ')); for (const [k, v] of Object.entries(instShare)) console.log(k.padEnd(9), v.map(x => x === null ? '   . ' : String(x).padStart(5)).join(' '));
for (const [label, tab] of [['full-band', instFull], ['K-weighted (loudness)', instK]]) { console.log(label + ' level per instrument (dB re overall rms):'); for (const [k, v] of Object.entries(tab)) console.log(k.padEnd(9), v.map(x => x === null ? '   . ' : String(x).padStart(5)).join(' ')); }
