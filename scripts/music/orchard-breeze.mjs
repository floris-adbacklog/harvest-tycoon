// Renders "Orchard Breeze", an original cosy background loop for Harvest Tycoon: 108 BPM, C major with a bridge in A minor and a
// lift to D major for the last hooks. Ukulele strums and a marimba ostinato are the bed; recorder, whistle and flute carry the tune;
// the glockenspiel answers; plucked bass, an accordion pad in the warm sections, claps, snaps, a soft shaker and a pizzicato interlude.
// No recordings or sound fonts: plucked strings are Karplus-Strong, mallets are modal (inharmonic partials), winds are wavetables
// with breath noise. Every note, tail and the reverb wrap round the exact loop boundary (reverb and master filters run over the loop
// twice and keep the second copy), and the last bars turn round into bar 1, so the loop has no seam.
// node scripts/music/orchard-breeze.mjs [folder]  ->  <folder>/orchard-breeze.wav (16-bit stereo 32 kHz) and orchard-breeze.json; scripts/build-farm-music.mjs
// runs it and makes the game's files from the WAV.
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {writeFileSync, unlinkSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';

// The folder to write into: the first argument (scripts/build-farm-music.mjs gives a temporary one), else the system's temp folder.
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? join(tmpdir(), 'harvest-music'), SLUG = 'orchard-breeze';
mkdirSync(DIR, {recursive: true});
const RATE = 32000, BPM = 108, BEAT = 60 / BPM, TAU = 2 * Math.PI, TABLE = 2048;
const started = Date.now();
let seed = 4102026;
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const hz = m => 440 * 2 ** ((m - 69) / 12);

// ---------------------------------------------------------------- notation
const PCS = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
function noteNum(s) {
  const m = /^([A-G])([#b]?)(\d)$/.exec(s);
  if (!m) throw Error('bad note ' + s);
  return (+m[3] + 1) * 12 + PCS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
}
// One 8-bar line: "pitch/length" tokens, lengths in eighth notes, r = rest, | = bar line (checked).
function mel(str) {
  const out = []; let pos = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') { if (pos % 8) throw Error(`bar line at eighth ${pos}: ${str}`); continue; }
    const [n, d] = tok.split('/'), len = +d;
    if (n !== 'r') out.push({m: noteNum(n), beat: pos / 2, beats: len / 2});
    pos += len;
  }
  if (pos !== 64) throw Error(`line is ${pos} eighths, not 64: ${str}`);
  return out;
}
const QUAL = {'': [0, 4, 7], m: [0, 3, 7], '7': [0, 4, 7, 10], m7: [0, 3, 7, 10], sus4: [0, 5, 7]};
const CHORDS = {};
function chord(name) {
  if (CHORDS[name]) return CHORDS[name];
  const m = /^([A-G])([#b]?)(.*)$/.exec(name);
  const root = (PCS[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12, iv = QUAL[m[3]];
  if (!iv) throw Error('unknown chord ' + name);
  return CHORDS[name] = {name, root, iv, pcs: iv.map(i => (root + i) % 12)};
}
// Real ukulele shapes (re-entrant G4 C4 E4 A4 tuning), string order G C E A.
const UKE = {
  C: [67, 60, 64, 72], Am: [69, 60, 64, 69], F: [69, 60, 65, 69], G: [67, 62, 67, 71], G7: [67, 62, 65, 71], Em: [67, 64, 67, 71],
  Dm: [69, 62, 65, 69], Dm7: [69, 62, 65, 72], A7: [67, 61, 64, 69], E7: [68, 62, 64, 71], Bb: [70, 62, 65, 70], Gsus4: [67, 62, 67, 72],
  D: [69, 62, 66, 69], D7: [69, 62, 66, 72], 'F#m': [69, 61, 66, 69], A: [69, 61, 64, 69], B7: [69, 63, 66, 71], Em7: [67, 62, 64, 71],
};

// ---------------------------------------------------------------- the tunes (all original)
// Hook: a rising call (C-E-G) answered by a falling one (A-G-F), then the same higher; first half ends open, second half closes.
const HOOK_ANT = mel(`C5/1 E5/1 G5/2 r/1 E5/1 G5/1 A5/1 | G5/3 E5/1 r/4 | A5/1 G5/1 F5/2 r/1 C5/1 F5/1 A5/1 | B5/2 A5/1 G5/1 r/4 |
  E5/1 G5/1 C6/2 r/1 G5/1 C6/1 B5/1 | A5/2 G5/1 E5/1 C#5/2 r/2 | D5/1 F5/1 A5/2 r/1 F5/1 A5/1 C6/1 | B5/2 G5/1 D5/1 r/4`);
const HOOK_CONS = mel(`C5/1 E5/1 G5/2 r/1 E5/1 G5/1 A5/1 | G5/3 E5/1 r/4 | A5/1 G5/1 F5/2 r/1 C5/1 F5/1 A5/1 | B5/2 A5/1 G5/1 r/4 |
  E5/1 G5/1 C6/2 r/1 A5/1 G5/1 E5/1 | C#5/1 E5/1 A5/2 G5/2 r/2 | F5/2 A5/1 F5/1 D5/2 B4/1 D5/1 | C5/3 r/5`);
// The answers that fill the hook's rests (glockenspiel, or recorder/whistle in other sections).
const ANS_ANT = mel(`r/8 | r/4 E6/1 D6/1 B5/2 | r/8 | r/4 D6/1 B5/1 G5/2 | r/8 | r/6 E6/1 C#6/1 | r/8 | r/4 F6/1 D6/1 B5/1 G5/1`);
const ANS_CONS = mel(`r/8 | r/4 E6/1 D6/1 B5/2 | r/8 | r/4 D6/1 B5/1 G5/2 | r/8 | r/6 E6/1 C#6/1 | r/8 | r/4 G5/1 C6/1 E6/1 G6/1`);
// B theme: longer, singing notes over F G Em Am.
const THEME_B = mel(`r/2 A5/2 C6/3 A5/1 | G5/3 D5/1 G5/2 A5/2 | B5/3 G5/1 E5/4 | r/1 E5/1 A5/1 B5/1 C6/3 B5/1 |
  C6/3 A5/1 F5/2 G5/1 A5/1 | B5/3 G5/1 D5/2 E5/1 F5/1 | E5/3 C5/1 E5/2 G5/2 | F5/2 D5/2 B4/2 r/2`);
const THEME_B2 = mel(`r/2 A5/2 C6/3 A5/1 | G5/3 D5/1 G5/2 A5/2 | B5/3 G5/1 E5/4 | r/1 E5/1 A5/1 B5/1 C6/3 B5/1 |
  C6/3 A5/1 F5/2 G5/1 A5/1 | B5/3 G5/1 D5/2 E5/1 F5/1 | E5/3 B4/1 D5/2 G5/2 | E5/2 G5/2 C#5/2 r/2`);
// Bridge in A minor.
const BRIDGE = mel(`A5/3 E5/1 A5/1 B5/1 C6/2 | A5/4 r/2 F5/1 A5/1 | G5/3 E5/1 C5/2 E5/2 | D5/4 r/4 |
  A5/3 E5/1 A5/1 B5/1 C6/2 | A5/3 F5/1 C5/2 A5/2 | F5/3 D5/1 F5/1 E5/1 D5/2 | B4/2 E5/1 G#5/1 B5/2 r/2`);
const BRIDGE_ANS = mel(`r/8 | r/4 C6/1 A5/1 r/2 | r/8 | r/4 B5/1 A5/1 G5/2 | r/8 | r/8 | r/8 | r/6 D6/1 B5/1`);
// Pizzicato interlude: plucked notes with little gaps a woodblock fills.
const PIZZ = mel(`C5/1 r/1 F5/1 r/1 A5/1 G5/1 F5/1 r/1 | E5/1 r/1 G5/1 r/1 E5/1 D5/1 C5/1 r/1 | F5/1 r/1 A5/1 r/1 F5/1 E5/1 D5/1 r/1 |
  E5/1 r/1 C5/1 r/1 A4/2 r/2 | D5/1 r/1 F5/1 r/1 Bb5/1 A5/1 F5/1 r/1 | C5/1 r/1 F5/1 r/1 A5/1 G5/1 F5/1 r/1 |
  D5/1 r/1 G5/1 r/1 C5/2 D5/2 | B4/1 r/1 D5/1 r/1 G4/1 A4/1 B4/1 r/1`);
const PIZZ_ANS = mel(`r/8 | r/8 | r/8 | r/6 C6/1 E6/1 | r/8 | r/8 | r/8 | r/8`);
// Coda: the hook remembered softly, ending on the leading note with a G-A-B pickup into bar 1.
const CODA = mel(`r/2 B4/1 D5/1 G5/3 r/1 | F5/3 D5/1 r/4 | C5/1 E5/1 G5/2 r/1 E5/1 G5/1 A5/1 | C6/3 A5/1 r/4 |
  A4/1 C5/1 F5/2 r/1 C5/1 F5/1 G5/1 | E5/3 C5/1 r/4 | F5/2 A5/2 C6/3 r/1 | B5/3 r/5`);
const CODA_ANS = mel(`r/8 | r/4 D6/1 B5/1 G5/2 | r/8 | r/4 E6/1 C6/1 A5/2 | r/8 | r/4 G6/1 E6/1 C6/2 | r/8 | r/5 G5/1 A5/1 B5/1`);
const INTRO_GLOCK = mel(`C6/1 E6/1 G6/2 r/4 | r/8 | r/8 | r/8 | G5/1 C6/1 E6/2 r/4 | r/8 | r/8 | r/4 F6/1 D6/1 B5/1 G5/1`);
const B_GLOCK = mel(`r/8 | r/8 | r/8 | r/8 | r/8 | r/8 | r/8 | r/6 G5/1 B5/1`);
const B2_GLOCK = mel(`r/8 | r/8 | r/8 | r/8 | r/8 | r/8 | r/8 | r/6 A5/1 C#6/1`);

const ANT = ['C', 'Em', 'F', 'G', 'C', 'A7', 'Dm', 'G7'], CONS = ['C', 'Em', 'F', 'G', 'C', 'A7', 'Dm7 G7', 'C'];
// Eleven 8-bar sections; something changes every 8 bars and the hook comes back in five different dresses.
const SECTIONS = [
  {id: 'intro groove', chords: ['C', 'Am', 'F', 'G', 'C', 'Am', 'Dm7', 'G7'], level: 1.08, glock: [INTRO_GLOCK, 0],
    uke: 'island', ukeVel: .8, marimba: 'A', bass: 'half', shaker: 8, snaps: true},
  {id: 'hook: recorder, glockenspiel answers', chords: ANT, lead: ['recorder', HOOK_ANT, 0], leadVel: .8, answer: ['glock', ANS_ANT, 0],
    uke: 'island', marimba: 'A', bass: 'bounce', kick: 2, shaker: 8},
  {id: 'hook answered: whistle, recorder answers, claps', chords: CONS, lead: ['whistle', HOOK_CONS, 0], answer: ['recorder', ANS_CONS, -12],
    uke: 'island', marimba: 'B', bass: 'bounce8', kick: 2, shaker: 8, claps: true},
  {id: 'B theme: flute, accordion', chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'C', 'G7'], lead: ['flute', THEME_B, 0], leadVel: .76, glock: [B_GLOCK, 0],
    uke: 'half', marimba: 'C', bass: 'walk', kick: 1, shaker: 8, snaps: true, pad: true},
  {id: 'hook on marimba + glockenspiel, whistle answers', chords: CONS, lead: ['mallets', HOOK_CONS, 0], answer: ['whistle', ANS_CONS, 0],
    uke: 'island', ukeVel: .9, bass: 'bounce8', kick: 2, shaker: 8, claps: true, pad: true, padVel: .8},
  {id: 'pizzicato interlude', chords: ['F', 'C', 'Dm', 'Am', 'Bb', 'F', 'Gsus4', 'G'], level: 1.12, lead: ['pizz', PIZZ, 0], glock: [PIZZ_ANS, 0], counter: [.32, 64, 76, 69],
    bass: 'cello', violas: true, woodblock: true, snaps: true, shaker: 4},
  {id: 'bridge in A minor: recorder, accordion, picked ukulele', chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'Dm', 'E7'], level: 1,
    lead: ['recorder', BRIDGE, 0], leadVel: .72, glock: [BRIDGE_ANS, 0], uke: 'pick', marimba: 'C', marVel: .75, bass: 'long', shaker: 4, pad: true, padVel: 1.15},
  {id: 'B theme again: whistle, recorder harmony, lifting', chords: ['F', 'G', 'Em', 'Am', 'F', 'G', 'Em7', 'A7'], lead: ['whistle', THEME_B2, 0],
    harmony: ['recorder', 4], glock: [B2_GLOCK, 0], uke: 'busy', marimba: 'A', bass: 'walk', kick: 2, shaker: 16, claps: true, pad: true, padVel: .8},
  {id: 'hook lifted to D: recorder + whistle in thirds', key: 2, chords: ['D', 'F#m', 'G', 'A', 'D', 'B7', 'Em', 'A7'], lead: ['recorder', HOOK_ANT, 2],
    harmony: ['whistle', 0], answer: ['glock', ANS_ANT, 2], uke: 'island', marimba: 'B', bass: 'bounce8', kick: 2, shaker: 16, claps: true, pad: true, padVel: .75},
  {id: 'hook in D: recorder, flute counter-melody', key: 2, chords: ['D', 'F#m', 'G', 'A', 'D', 'B7', 'Em7 A7', 'D D7'], lead: ['recorder', HOOK_CONS, 2],
    counter: [.5, 62, 74, 66], answer: ['glock', ANS_CONS, 2], uke: 'busy', marimba: 'A', bass: 'bounce8', kick: 2, shaker: 16, claps: true, pad: true, padVel: .75},
  {id: 'coda / turnaround (G7 -> bar 1)', chords: ['G', 'G7', 'C', 'Am', 'F', 'C', 'Dm7', 'G7'], level: 1.04, lead: ['recorder', CODA, 0], leadVel: .85,
    answer: ['glock', CODA_ANS, 0], uke: 'pick', marimba: 'A', marVel: .9, bass: 'bounce', kick: 1, shaker: 8, snaps: true},
];

// ---------------------------------------------------------------- time
const BARS = SECTIONS.length * 8, TOTAL_BEATS = BARS * 4, COUNT = Math.round(TOTAL_BEATS * BEAT * RATE);
const SWING = .035; // off-beat eighths a touch late: a light, smiling lilt
const swing = b => { const i = Math.floor(b), f = b - i; return i + (f < .5 ? f * (.5 + SWING) / .5 : .5 + SWING + (f - .5) * (.5 - SWING) / .5); };
const sec = b => swing(b) * BEAT, dsec = (b, len) => sec(b + len) - sec(b);
const jit = ms => clamp(gauss(), -2.2, 2.2) * ms / 1000;
const hv = (v, a = .07) => v * (1 + a * clamp(gauss(), -2, 2));

const SPANS = [];
SECTIONS.forEach((s, si) => s.chords.forEach((c, bar) => {
  const parts = c.split(' ');
  parts.forEach((name, k) => SPANS.push({si, bar, name, ch: chord(name), beat: si * 32 + bar * 4 + k * 4 / parts.length, beats: 4 / parts.length}));
}));
SPANS.forEach((sp, i) => { sp.next = SPANS[(i + 1) % SPANS.length]; sp.lastInSection = sp.next.si !== sp.si; });
function chordAt(beat) {
  const b = ((beat % TOTAL_BEATS) + TOTAL_BEATS) % TOTAL_BEATS;
  let lo = 0, hi = SPANS.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (SPANS[mid].beat <= b + 1e-9) lo = mid; else hi = mid - 1; }
  return SPANS[lo].ch;
}
// The next chord change after a beat: {beat, ch} (beat on the same unwrapped time line as the input).
function nextChange(beat) {
  const b = ((beat % TOTAL_BEATS) + TOTAL_BEATS) % TOTAL_BEATS;
  let lo = 0, hi = SPANS.length - 1;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (SPANS[mid].beat <= b + 1e-9) lo = mid; else hi = mid - 1; }
  const sp = SPANS[lo]; let nb = sp.next.beat; if (nb <= b + 1e-9) nb += TOTAL_BEATS;
  return {beat: beat + (nb - b), ch: sp.next.ch};
}

// ---------------------------------------------------------------- buses
const L = new Float64Array(COUNT), R = new Float64Array(COUNT), SEND = new Float64Array(COUNT);
const ENERGY = {}, SEC_ENERGY = {};
const SEC_LEN = Math.round(32 * BEAT * RATE);
const G = {recorder: .135, whistle: .13, flute: .125, marimbaLead: .3, marimba: .14, glock: .11, uke: .17, bass: .2, cello: .28,
  violin: .42, viola: .22, accordion: .04, kick: .2, clap: .45, snap: .35, shaker: .22, woodblock: .15};
const PAN = {recorder: -.06, whistle: .18, flute: -.18, marimbaLead: .06, marimba: .36, glock: .38, uke: -.36, bass: 0, cello: -.05,
  violin: -.32, viola: .34, kick: 0, clap: .18, snap: -.24, shaker: .38, woodblock: .28};
const SENDS = {recorder: .26, whistle: .28, flute: .3, marimbaLead: .2, marimba: .16, glock: .34, uke: .14, bass: .03, cello: .08,
  violin: .22, viola: .2, accordion: .3, kick: 0, clap: .22, snap: .2, shaker: .12, woodblock: .24};
// Adds a mono sound at a time in seconds, panned (equal power), wrapping past the end of the loop back to its start.
function put(t, buf, gain, pan, send, inst) {
  const start = ((Math.round(t * RATE) % COUNT) + COUNT) % COUNT;
  const a = (clamp(pan, -.45, .45) + 1) * Math.PI / 4, gl = Math.cos(a) * Math.SQRT2 * gain, gr = Math.sin(a) * Math.SQRT2 * gain, gs = gain * send;
  let e = 0;
  for (let i = 0, j = start; i < buf.length; i++, j++) {
    if (j === COUNT) j = 0;
    const v = buf[i]; L[j] += v * gl; R[j] += v * gr; SEND[j] += v * gs; e += v * v;
  }
  ENERGY[inst] = (ENERGY[inst] || 0) + e * gain * gain;
  const si = Math.min(Math.floor(((start + 1600) % COUNT) / SEC_LEN), 10); (SEC_ENERGY[inst] ??= new Array(11).fill(0))[si] += e * gain * gain;
}

// ---------------------------------------------------------------- dsp helpers
function biquad(type, f, Q, db = 0) {
  const w = TAU * Math.min(f, RATE * .45) / RATE, cw = Math.cos(w), al = Math.sin(w) / (2 * Q);
  let b0, b1, b2, a0 = 1 + al, a1 = -2 * cw, a2 = 1 - al;
  if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
  else if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
  else if (type === 'hs') { // RBJ high shelf, slope 1 (Q is ignored)
    const A = 10 ** (db / 40), sa = 2 * Math.sqrt(A) * Math.sin(w) / Math.SQRT2;
    b0 = A * ((A + 1) + (A - 1) * cw + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sa);
    a0 = (A + 1) - (A - 1) * cw + sa; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sa;
  }
  else { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return x => { const y = B0 * x + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
const tables = new Map();
function table(key, amps) {
  if (tables.has(key)) return tables.get(key);
  const t = new Float64Array(TABLE + 1); let pk = 0;
  for (let i = 0; i <= TABLE; i++) { let s = 0; for (let h = 0; h < amps.length; h++) s += amps[h] * Math.sin(TAU * (h + 1) * i / TABLE); t[i] = s; pk = Math.max(pk, Math.abs(s)); }
  for (let i = 0; i <= TABLE; i++) t[i] /= pk;
  tables.set(key, t); return t;
}
const relEnv = (i, holdN, relN) => { if (i <= holdN) return 1; const r = (i - holdN) / relN; return r >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * r); };
function fadeTail(out, ms = 8) { const n = Math.min(out.length, Math.round(ms / 1000 * RATE)); for (let i = 0; i < n; i++) out[out.length - 1 - i] *= i / n; return out; }

// Karplus-Strong string: the plucked shape (a triangle peaking at the pick position, plus a little noise combed at that position)
// circulates in a tuned delay line with a gentle low-pass in the loop; an all-pass sets the exact fractional length so the pitch is
// true. A ramp of a few milliseconds stands in for the finger leaving the string, so onsets never jump.
function ks(f, hold, o) {
  const rel = o.release ?? .08, n = Math.max(1, Math.round((hold + rel) * RATE)), out = new Float32Array(n);
  const P = RATE / f, w = TAU * f / RATE, a = o.loopLP, b = 1 - a;
  const lpDelay = Math.atan2(b * Math.sin(w), 1 - b * Math.cos(w)) / w;
  const total = P - .5 - lpDelay; let N = Math.floor(total), d = total - N; if (d < .5) { N--; d++; }
  const c = (1 - d) / (1 + d);
  const mag = Math.cos(w / 2) * a / Math.sqrt(1 - 2 * b * Math.cos(w) + b * b);
  const g = Math.min(.9996, Math.pow(1e-3, 1 / (f * o.t60)) / mag);
  const E = Math.max(4, Math.round(P)), pk = Math.max(1, Math.round(o.pick * P)), noise = o.noise ?? .25;
  const nz = new Float64Array(E), exc = new Float64Array(E);
  for (let i = 0; i < E; i++) nz[i] = rand() * 2 - 1;
  let s = 0, mean = 0;
  for (let i = 0; i < E; i++) {
    const tri = i < pk ? i / pk : (E - i) / (E - pk);
    s += o.excite * ((1 - noise) * tri + noise * (nz[i] - (i >= pk ? nz[i - pk] : 0)) - s);
    exc[i] = s; mean += s;
  }
  mean /= E; let peak = 1e-9;
  for (let i = 0; i < E; i++) { exc[i] -= mean; peak = Math.max(peak, Math.abs(exc[i])); }
  const line = new Float64Array(N); let idx = 0, xp = 0, lp = 0, apx = 0, apy = 0;
  const holdN = Math.round(hold * RATE), relN = Math.max(1, Math.round(rel * RATE)), attN = Math.max(1, Math.round((o.attack ?? .002) * RATE));
  for (let i = 0; i < n; i++) {
    const x = line[idx], avg = .5 * (x + xp); xp = x;
    lp += a * (avg - lp);
    const ap = c * lp + apx - c * apy; apx = lp; apy = ap;
    const y = g * ap + (i < E ? exc[i] / peak : 0);
    line[idx] = y; if (++idx === N) idx = 0;
    out[i] = y * relEnv(i, holdN, relN) * (i < attN ? i / attN : 1);
  }
  return out;
}
// Modal synthesis: a few decaying partials (two-pole resonators) plus a soft mallet click.
function modal(f, parts, len, o) {
  const n = Math.max(8, Math.round(len * RATE)), out = new Float32Array(n);
  for (const p of parts) {
    const fr = f * p.r; if (fr > 6500) continue;
    const amp = p.a * (fr > 5000 ? .45 : 1), w = TAU * fr / RATE, r = Math.pow(1e-3, 1 / (p.t * RATE)), c = 2 * r * Math.cos(w), r2 = r * r;
    let y2 = 0, y1 = amp * r * Math.sin(w); out[1] += y1;
    for (let i = 2; i < n; i++) { const y = c * y1 - r2 * y2; out[i] += y; y2 = y1; y1 = y; }
  }
  const att = Math.max(1, Math.round(o.att * RATE)); for (let i = 0; i < att && i < n; i++) out[i] *= i / att;
  if (o.click) { const lp = biquad('lp', o.clickF, .7), cn = Math.min(n, Math.round(.008 * RATE)); for (let i = 0; i < cn; i++) out[i] += o.click * lp(rand() * 2 - 1) * Math.exp(-i / (.0015 * RATE)); }
  return fadeTail(out, 12);
}
// Wind voice: wavetable tone with scoop, delayed vibrato, pitched breath noise and (recorder/flute) an attack chiff.
const WIND = {
  recorder: {table: table('rec', [1, .09, .14, .03, .035, .012]), att: .016, rel: .07, vibRate: 5.2, vibDepth: .0025, vibDelay: .28, scoop: -.004, scoopT: .015, breath: .5, bq: 7, air: .1, chiff: .7},
  whistle: {table: table('whi', [1, .035, .012]), att: .02, rel: .08, vibRate: 5.7, vibDepth: .0045, vibDelay: .16, scoop: -.012, scoopT: .025, breath: .35, bq: 14, air: .04, chiff: 0},
  flute: {table: table('flu', [1, .25, .1, .045, .02, .01]), att: .04, rel: .1, vibRate: 5.0, vibDepth: .005, vibDelay: .2, scoop: -.003, scoopT: .02, breath: .85, bq: 4.5, air: .16, chiff: .3},
};
function wind(f, hold, o) {
  const n = Math.round((hold + o.rel) * RATE), out = new Float32Array(n), tab = o.table;
  const bp = biquad('bp', f, o.bq), air = biquad('bp', Math.min(2600, f * 3), .8), cb = biquad('bp', Math.min(f * 3, 4200), 1.5);
  const vph = rand() * TAU, vr = o.vibRate * (1 + .06 * (rand() - .5)), holdN = Math.round(hold * RATE), relN = Math.round(o.rel * RATE);
  let ph = rand();
  for (let i = 0; i < n; i++) {
    const t = i / RATE, vd = o.vibDepth * clamp((t - o.vibDelay) / .4, 0, 1);
    ph += f * (1 + o.scoop * Math.exp(-t / o.scoopT) + vd * Math.sin(TAU * vr * t + vph)) / RATE; ph -= Math.floor(ph);
    const p = ph * TABLE, k = p | 0, s = tab[k] + (tab[k + 1] - tab[k]) * (p - k), nz = rand() * 2 - 1;
    const env = (1 - Math.exp(-t / o.att)) * relEnv(i, holdN, relN);
    out[i] = (s + o.breath * bp(nz) + o.air * air(nz)) * env * (1 + .04 * Math.exp(-t / .08)) + (o.chiff ? o.chiff * cb(nz) * Math.exp(-t / .014) : 0);
  }
  return out;
}

// ---------------------------------------------------------------- instruments
const acc = n => (n.beat % 1 === 0 ? 1 : .9) * (n.m > 84 ? .92 : 1);
function windNote(inst, m, beat, beats, vel) {
  const hold = Math.max(.06, dsec(beat, beats) - .025);
  put(sec(beat) + jit(4), wind(hz(m), hold, WIND[inst]), G[inst] * hv(vel, .06), PAN[inst], SENDS[inst], inst);
}
// A mallet player damps a bar that would ring on into a chord it does not belong to (a leading note over its resolution,
// last chord's fifth under the new root): a 90 ms fade from the chord change.
function damp(buf, m, beat) {
  const nc = nextChange(beat); if (nc.ch.pcs.includes(m % 12)) return buf;
  const s0 = Math.max(0, Math.round((sec(nc.beat) - sec(beat)) * RATE)), len = Math.round(.09 * RATE);
  for (let i = s0; i < buf.length; i++) { const r = (i - s0) / len; buf[i] *= r >= 1 ? 0 : .5 + .5 * Math.cos(Math.PI * r); }
  return buf;
}
function glockNote(m, beat, vel) {
  const f = hz(m), T = Math.min(2.4, 1.8 * Math.pow(1000 / f, .35));
  const buf = damp(modal(f, [{r: 1, a: 1, t: T}, {r: 2.76, a: .2, t: T * .3}, {r: 5.4, a: .055, t: T * .12}, {r: 8.93, a: .02, t: T * .05}], Math.min(T, 2.2), {att: .0012, click: .04, clickF: 2800}), m, beat);
  put(sec(beat) + jit(3), buf, G.glock * hv(vel), PAN.glock, SENDS.glock, 'glock');
}
function marimbaNote(m, beat, vel, lead = false) {
  const f = hz(m), T = clamp(1.3 * Math.pow(330 / f, .55), .4, lead ? 1.6 : 1.15), br = .55 + .45 * Math.min(1, vel);
  const buf = damp(modal(f, [{r: 1, a: 1, t: T}, {r: 3.98, a: .26 * br, t: T * .22}, {r: 9.85, a: .06 * br, t: T * .07}], T, {att: .0018, click: .05, clickF: 1400}), m, beat);
  const k = lead ? 'marimbaLead' : 'marimba';
  put(sec(beat) + jit(3), buf, G[k] * hv(vel), PAN[k], SENDS[k], k);
}
function bassNote(m, beat, beats, vel) {
  const f = hz(m), hold = Math.max(.08, dsec(beat, beats) - .03), buf = ks(f, hold, {t60: 1.6, pick: .28, excite: .2, loopLP: .5, release: .07, noise: .1, attack: .005});
  const holdN = Math.round(hold * RATE), relN = Math.round(.07 * RATE);
  for (let i = 0; i < buf.length; i++) { const t = i / RATE; buf[i] += .45 * Math.sin(TAU * f * t) * Math.min(1, t / .008) * Math.exp(-t / .5) * relEnv(i, holdN, relN); }
  put(sec(beat) + jit(3), buf, G.bass * hv(vel, .05), PAN.bass, SENDS.bass, 'bass');
}
const PIZZ_CFG = {violin: {t60: .45, pick: .2, excite: .3, loopLP: .68, hold: .55, noise: .2, attack: .0015}, viola: {t60: .45, pick: .2, excite: .38, loopLP: .6, hold: .5, noise: .2, attack: .0015},
  cello: {t60: .8, pick: .22, excite: .3, loopLP: .55, hold: .7, noise: .15, attack: .003}};
function pizzNote(m, beat, vel, kind) {
  const c = PIZZ_CFG[kind], f = hz(m), buf = ks(f, c.hold, {...c, release: .12});
  if (kind === 'cello') for (let i = 0; i < buf.length; i++) { const t = i / RATE; buf[i] += .3 * Math.sin(TAU * f * t) * Math.min(1, t / .006) * Math.exp(-t / .25); }
  put(sec(beat) + jit(4), buf, G[kind] * hv(vel), PAN[kind], SENDS[kind], kind);
}
function strum(beat, ch, dir, vel, ringBeats) {
  const v = UKE[ch.name]; if (!v) throw Error('no ukulele shape for ' + ch.name);
  const order = dir === 'U' ? [3, 2, 1] : [0, 1, 2, 3], spread = dir === 'R' ? .026 : dir === 'U' ? .009 : .012;
  const start = sec(beat) + jit(3), end = sec(beat + ringBeats);
  order.forEach((s, k) => {
    const t = start + k * spread, buf = ks(hz(v[s]), Math.max(.05, end - t + .015), {t60: 1.15, pick: .19, excite: dir === 'D' ? .62 : dir === 'U' ? .48 : .5, loopLP: .78, release: .06, noise: dir === 'D' ? .28 : .22});
    put(t, buf, G.uke * hv(vel * (dir === 'U' ? 1 - .08 * k : 1 - .04 * k)), PAN.uke, SENDS.uke, 'uke');
  });
}
function pluck(beat, m, vel, ringBeats) { // a single fingerpicked ukulele string
  const t = sec(beat) + jit(4);
  put(t, ks(hz(m), dsec(beat, ringBeats), {t60: 1.2, pick: .22, excite: .4, loopLP: .7, release: .07, noise: .15, attack: .003}), G.uke * 1.25 * hv(vel), PAN.uke, SENDS.uke, 'uke');
}
function accordion(m, beat, beats, vel, pan) {
  const f = hz(m), hold = dsec(beat, beats) + .02, rel = .32, n = Math.round((hold + rel) * RATE), out = new Float32Array(n);
  const nh = clamp(Math.floor(3000 / f), 1, 24), tab = table('acc' + nh, Array.from({length: nh}, (_, h) => (h % 2 ? .75 : 1) / (h + 1) ** 1.25));
  const holdN = Math.round(hold * RATE), relN = Math.round(rel * RATE), bel = rand() * TAU;
  let p1 = rand(), p2 = rand();
  for (let i = 0; i < n; i++) {
    const t = i / RATE;
    p1 += f * 1.0016 / RATE; p1 -= Math.floor(p1); p2 += f * .9984 / RATE; p2 -= Math.floor(p2);
    const q1 = p1 * TABLE, k1 = q1 | 0, q2 = p2 * TABLE, k2 = q2 | 0;
    const s = tab[k1] + (tab[k1 + 1] - tab[k1]) * (q1 - k1) + tab[k2] + (tab[k2 + 1] - tab[k2]) * (q2 - k2);
    out[i] = .5 * s * (1 - Math.exp(-t / .07)) * (1 + .05 * Math.sin(TAU * .35 * t + bel)) * relEnv(i, holdN, relN);
  }
  put(sec(beat) + jit(5), out, G.accordion * hv(vel, .05), pan, SENDS.accordion, 'accordion');
}
function kick(beat, vel) {
  const n = Math.round(.32 * RATE), out = new Float32Array(n), lp = biquad('lp', 900, .7); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / RATE; ph += TAU * (53 + 57 * Math.exp(-t / .028)) / RATE; out[i] = Math.sin(ph) * Math.min(1, t / .0015) * Math.exp(-t / .1) + .12 * lp(rand() * 2 - 1) * Math.exp(-t / .004); }
  put(sec(beat) + jit(2), fadeTail(out), G.kick * hv(vel, .05), PAN.kick, SENDS.kick, 'kick');
}
function clap(beat, vel) {
  const n = Math.round(.28 * RATE), out = new Float32Array(n), bp = biquad('bp', 1250, 1.1), lp = biquad('lp', 4200, .7), hits = [0, .0085, .0175];
  for (let i = 0; i < n; i++) {
    const t = i / RATE; let e = t >= .026 ? .75 * Math.min(1, (t - .026) / .002) * Math.exp(-(t - .026) / .055) : 0;
    for (const h of hits) if (t >= h) e += Math.min(1, (t - h) / .0004) * Math.exp(-(t - h) / .0032); // each slap ramps in over 0.4 ms
    out[i] = lp(bp(rand() * 2 - 1)) * e * Math.min(1, t / .0005);
  }
  put(sec(beat) + jit(3), fadeTail(out), G.clap * hv(vel, .1), PAN.clap, SENDS.clap, 'clap');
}
function snap(beat, vel) {
  const n = Math.round(.09 * RATE), out = new Float32Array(n), bp = biquad('bp', 2300, 2.2), lp = biquad('lp', 5200, .7);
  for (let i = 0; i < n; i++) { const t = i / RATE; out[i] = lp(bp(rand() * 2 - 1)) * Math.exp(-t / .011) * Math.min(1, t / .0006) + .18 * Math.sin(TAU * 1500 * t) * Math.exp(-t / .005); }
  put(sec(beat) + jit(3), fadeTail(out), G.snap * hv(vel, .1), PAN.snap, SENDS.snap, 'snap');
}
function shake(beat, vel, len = .07) {
  const n = Math.round(len * 1.8 * RATE), out = new Float32Array(n), hp = biquad('hp', 2200, .7), bp = biquad('bp', 4000, 1), lp = biquad('lp', 5600, .7);
  for (let i = 0; i < n; i++) { const t = i / RATE, e = t < .012 ? (t / .012) ** 1.5 : Math.exp(-(t - .012) / (len / 2.5)); out[i] = lp(bp(hp(rand() * 2 - 1))) * e; }
  put(sec(beat) + jit(3), fadeTail(out), G.shaker * hv(vel, .12), PAN.shaker, SENDS.shaker, 'shaker');
}
function woodblock(beat, vel, high) {
  const buf = modal(high ? 1040 : 780, [{r: 1, a: 1, t: .1}, {r: 2.52, a: .32, t: .05}, {r: 4.15, a: .1, t: .03}], .12, {att: .0004, click: .15, clickF: 2500});
  put(sec(beat) + jit(3), buf, G.woodblock * hv(vel, .1), PAN.woodblock, SENDS.woodblock, 'woodblock');
}

// ---------------------------------------------------------------- arranging helpers
const scaleOf = key => [0, 2, 4, 5, 7, 9, 11].map(x => (x + key) % 12);
// A second voice a chord tone (or a diatonic third) below the tune: always consonant with the chord underneath.
function harmonyBelow(notes, key) {
  const scale = scaleOf(key);
  return notes.map(n => {
    const ch = chordAt(n.beat); let h = null;
    if (ch.pcs.includes(n.m % 12)) for (let m = n.m - 3; m >= n.m - 9; m--) if (ch.pcs.includes(m % 12)) { h = m; break; }
    if (h === null) { h = n.m; let steps = 0; while (steps < 2) { h--; if (scale.includes(((h % 12) + 12) % 12)) steps++; } }
    return {...n, m: h};
  });
}
// A slow counter-melody of guide tones (thirds and sevenths, smoothest path) that moves in the bars where the hook rests.
function guideLine(spans, lo, hi, start) {
  const out = []; let prev = start;
  const nearest = (pcs, from, not) => { let best = null; for (let m = lo; m <= hi; m++) if (pcs.includes(m % 12) && m !== not && (best === null || Math.abs(m - from) < Math.abs(best - from))) best = m; return best; };
  for (const sp of spans) {
    const ch = sp.ch, guide = [(ch.root + ch.iv[1]) % 12, (ch.root + (ch.iv[3] ?? ch.iv[2])) % 12];
    const g = nearest(guide, prev);
    if (sp.beats === 4 && sp.bar % 2 === 1) {
      let alt = null; for (let m = g + 1; m <= hi; m++) if (ch.pcs.includes(m % 12)) { alt = m; break; }
      if (alt === null) for (let m = g - 1; m >= lo; m--) if (ch.pcs.includes(m % 12)) { alt = m; break; }
      out.push({m: g, beat: sp.beat, beats: 2}, {m: alt, beat: sp.beat + 2, beats: 2}); prev = alt;
    } else { out.push({m: g, beat: sp.beat, beats: sp.beats}); prev = g; }
  }
  const merged = []; for (const n of out) { const last = merged[merged.length - 1]; if (last && last.m === n.m && Math.abs(last.beat + last.beats - n.beat) < 1e-9) last.beats += n.beats; else merged.push({...n}); }
  return merged;
}
const marimbaTones = ch => { const r = 50 + ((ch.root - 2 + 12) % 12), iv = ch.iv; return [r, r + iv[1], r + iv[2], iv[3] != null ? r + iv[3] : r + 12, r + iv[1] + 12]; };
const MARIMBA = {
  A: [[0, [0], 1], [1, [2], .6], [2, [3], .7], [3, [2], .62], [4, [4], .88], [5, [2], .6], [6, [3], .78], [7, [2], .6]],
  B: [[0, [0], 1], [1, [2, 4], .5], [2, [3], .72], [3, [2, 4], .5], [4, [0], .88], [5, [2, 4], .5], [6, [3], .7], [7, [1, 3], .55]],
  C: [[0, [0], .95], [3, [3], .75], [6, [4], .7]],
};
const UKE_STRUM = {
  island: [[0, 'D', 1], [1, 'D', .72], [1.5, 'U', .55], [2.5, 'U', .6], [3, 'D', .8], [3.5, 'U', .52]],
  busy: [[0, 'D', 1], [.5, 'U', .45], [1, 'D', .7], [1.5, 'U', .6], [2, 'D', .85], [2.5, 'U', .45], [3, 'D', .7], [3.5, 'U', .55]],
  half: [[0, 'R', 1], [2, 'R', .78]],
};
const PICK = [1, 0, 2, 3, 1, 2, 0, 3];

// ---------------------------------------------------------------- melody check: chord tones on the strong beats
const warnings = [];
function check(label, notes) {
  for (const n of notes) {
    const inBar = ((n.beat % 4) + 4) % 4;
    if (inBar === 0 || inBar === 2) { const ch = chordAt(n.beat); if (!ch.pcs.includes(n.m % 12)) warnings.push(`${label} bar ${Math.floor(n.beat / 4) + 1} beat ${inBar + 1}: midi ${n.m} over ${ch.name}`); }
  }
}

// ---------------------------------------------------------------- render the arrangement
SECTIONS.forEach((s, si) => {
  const S0 = si * 32, lv = s.level ?? 1, key = s.key ?? 0, spans = SPANS.filter(p => p.si === si);
  const place = (line, tr) => line.map(n => ({...n, m: n.m + tr, beat: n.beat + S0}));
  const lead = s.lead ? place(s.lead[1], s.lead[2]) : [];
  if (s.lead) {
    const inst = s.lead[0], lvl = lv * (s.leadVel ?? 1);
    check(s.id + ' lead', lead);
    if (inst === 'mallets') {
      for (const n of lead) {
        marimbaNote(n.m, n.beat, lvl * acc(n), true);
        glockNote(n.m + 12, n.beat, lvl * .32 * acc(n));
        if (n.beats >= 1.5) for (let b = n.beat + 1 / 6, k = 0; b < n.beat + n.beats - .2; b += 1 / 6, k++) marimbaNote(n.m, b, lvl * (k % 2 ? .38 : .44), true);
      }
    } else if (inst === 'pizz') lead.forEach(n => pizzNote(n.m, n.beat, lvl * acc(n), 'violin'));
    else lead.forEach(n => windNote(inst, n.m, n.beat, n.beats, lvl * acc(n)));
  }
  if (s.harmony) {
    const [inst, fromBar] = s.harmony, h = harmonyBelow(lead.filter(n => n.beat >= S0 + fromBar * 4), key);
    check(s.id + ' harmony', h);
    h.forEach(n => windNote(inst, n.m, n.beat, n.beats, lv * .55 * acc(n)));
  }
  if (s.answer) {
    const [inst, line, tr] = s.answer, notes = place(line, tr);
    check(s.id + ' answer', notes);
    notes.forEach(n => inst === 'glock' ? glockNote(n.m, n.beat, lv * .95) : windNote(inst, n.m, n.beat, n.beats, lv * .78 * acc(n)));
  }
  if (s.glock) { const notes = place(s.glock[0], s.glock[1]); check(s.id + ' glock', notes); notes.forEach(n => glockNote(n.m, n.beat, lv * .9)); }
  if (s.counter) { const c = guideLine(spans, s.counter[1], s.counter[2], s.counter[3]); check(s.id + ' counter', c); c.forEach(n => windNote('flute', n.m, n.beat, n.beats - .05, lv * s.counter[0])); }

  // ukulele
  if (s.uke === 'pick') {
    for (let b = 0; b < 32; b += .5) { const ch = chordAt(S0 + b), v = UKE[ch.name], e = Math.round(b * 2) % 8; pluck(S0 + b, v[PICK[e]], lv * (e % 2 ? .62 : .8) * (e === 0 ? 1.15 : 1), 1.5); }
  } else if (s.uke) {
    const pat = UKE_STRUM[s.uke], uv = lv * (s.ukeVel ?? 1);
    for (let bar = 0; bar < 8; bar++) pat.forEach(([b, dir, v], k) => {
      const nb = k + 1 < pat.length ? pat[k + 1][0] : 4 + pat[0][0], beat = S0 + bar * 4 + b;
      strum(beat, chordAt(beat), dir, uv * v, nb - b);
    });
  }
  // marimba bed
  if (s.marimba) {
    const pat = MARIMBA[s.marimba], mv = lv * (s.marVel ?? 1);
    for (let bar = 0; bar < 8; bar++) for (const [e, idx, v] of pat) { const beat = S0 + bar * 4 + e / 2, t = marimbaTones(chordAt(beat)); for (const i of idx) marimbaNote(t[i], beat, mv * v * (idx.length > 1 ? .8 : 1)); }
  }
  // accordion pad
  // Close voicing between G3 and F#4. Seventh chords leave the root to the bass (rootless: A7 = G C# E, B7 = A D# F#), so the
  // reeds never stack a second low down (G3-A3 in A7, A3-B3 in B7 used to buzz).
  if (s.pad) for (const sp of spans) {
    const pcs = sp.ch.pcs.length === 4 ? sp.ch.pcs.slice(1) : sp.ch.pcs;
    const tones = pcs.map(pc => 55 + ((pc - 7 + 12) % 12)).sort((a, b) => a - b);
    tones.forEach((m, k) => accordion(m, sp.beat, sp.beats - .02, lv * (s.padVel ?? 1) * (k === 0 ? .9 : 1), k % 2 ? .3 : -.3));
  }
  // bass
  const scale = scaleOf(key), root = pc => 36 + pc, fifth = r => r + 7 <= 47 ? r + 7 : r - 5;
  const third = (r, ch) => { const t = r + ch.iv[1]; return t <= 50 ? t : t - 12; };
  // Approach note one step under the next root: a semitone when it belongs to the chord (B under C in G7, C# under D in A7),
  // or when it is in the key and does not rub against the chord; otherwise a whole tone.
  const approach = (target, cur) => {
    const a = target - 1, pc = ((a % 12) + 12) % 12;
    const rubs = cur.pcs.some(c => (pc - c + 12) % 12 === 1 || (c - pc + 12) % 12 === 1);
    return cur.pcs.includes(pc) || (scale.includes(pc) && !rubs) ? a : target - 2;
  };
  const approachAbove = (target, cur) => {
    const a = target + 1, pc = a % 12, rubs = cur.pcs.some(c => (pc - c + 12) % 12 === 1 || (c - pc + 12) % 12 === 1);
    return cur.pcs.includes(pc) || (scale.includes(pc) && !rubs) ? a : target + 2;
  };
  // Walking bar: root, third, fifth (above or below), approach (from below or above). Picks the smoothest line that never repeats
  // a note on beats 3-4 (the old fixed shape gave G B D D -> E and A C E E -> F).
  const walkLine = (r, ch, nr) => {
    const t3 = third(r, ch); let best = null;
    for (const f5 of [r + 7, r - 5]) {
      if (f5 > 50 || f5 < 35) continue;
      for (const [a4, pen] of [[approach(nr, ch), 0], [approachAbove(nr, ch), 1]]) {
        if (a4 === f5) continue;
        const cost = Math.abs(t3 - f5) + Math.abs(f5 - a4) + Math.abs(a4 - nr) + pen;
        if (!best || cost < best.cost) best = {cost, line: [r, t3, f5, a4]};
      }
    }
    return best.line;
  };
  for (const sp of spans) {
    const ch = sp.ch, r = root(ch.root), nr = root(sp.next.ch.root), b = sp.beat, full = sp.beats === 4, last = sp.lastInSection;
    const ap = nr === r ? fifth(r) : approach(nr, ch);
    const play = (m, off, len, v = 1) => s.bass === 'cello' ? pizzNote(m, b + off, lv * v, 'cello') : bassNote(m, b + off, len, lv * v);
    switch (s.bass) {
      case 'half':
        if (!full) { play(r, 0, 1.85); if (last) play(ap, 1, .9, .85); break; }
        play(r, 0, 1.85); if (last) { play(fifth(r), 2, .9, .9); play(ap, 3, .9, .85); } else play(fifth(r), 2, 1.85, .9); break;
      case 'bounce': case 'cello':
        play(r, 0, .9); if (!full) { if (last) play(ap, 1, .85, .85); break; }
        play(fifth(r), 2, .9, .88); if (last) play(ap, 3, .85, .82); break;
      case 'bounce8':
        if (!full) { play(r, 0, last ? .9 : 1.2); if (last) play(ap, 1, .85, .85); else play(r, 1.5, .4, .6); break; }
        play(r, 0, 1.2);
        play(r, 1.5, .4, .62); play(fifth(r), 2, .9, .88);
        if (last) play(ap, 3, .85, .82); else if (sp.bar % 2 === 1) play(ap, 3.5, .4, .7); break;
      case 'walk':
        if (!full) { play(r, 0, .85); play(ap, 1, .85, .82); break; }
        walkLine(r, ch, nr).forEach((m, k) => play(m, k, .85, [1, .78, .85, .8][k])); break;
      case 'long':
        if (last) { play(r, 0, 1.85); play(fifth(r), 2, .9, .85); play(ap, 3, .9, .8); } else play(r, 0, 3.7); break;
    }
  }
  // pizzicato violas on the off-beats, woodblock in the gaps of the pizzicato tune
  if (s.violas) for (let bar = 0; bar < 8; bar++) for (const b of [1, 3]) {
    const beat = S0 + bar * 4 + b, ch = chordAt(beat);
    for (const i of [1, 2]) pizzNote(60 + ((ch.root + ch.iv[i] - 60) % 12 + 12) % 12, beat, lv * (b === 1 ? .8 : .72), 'viola');
  }
  if (s.woodblock) for (let bar = 0; bar < 8; bar++) if (bar % 4 !== 3) { woodblock(S0 + bar * 4 + .5, lv * .9, true); woodblock(S0 + bar * 4 + 1.5, lv * .75, false); }
  // percussion
  for (let bar = 0; bar < 8; bar++) {
    const B = S0 + bar * 4;
    if (s.kick) { kick(B, lv); if (s.kick === 2) kick(B + 2, lv * .8); }
    if (s.claps) { clap(B + 1, lv); clap(B + 3, lv * .92); }
    if (s.snaps) { snap(B + 1, lv); snap(B + 3, lv * .9); }
    if (s.shaker === 8) for (let e = 0; e < 8; e++) shake(B + e / 2, lv * (e % 2 ? .9 : .55));
    else if (s.shaker === 16) for (let e = 0; e < 16; e++) shake(B + e / 4, lv * [.6, .32, .85, .35][e % 4], .05);
    else if (s.shaker === 4) for (let e = 1; e < 8; e += 2) shake(B + e / 2, lv * .7, .09);
  }
});
if (process.argv.includes('--mix')) for (const [k, arr] of Object.entries(SEC_ENERGY).sort()) console.log(k.padEnd(12), arr.map(e => (Math.sqrt(e / SEC_LEN) * 1000).toFixed(0).padStart(4)).join(''));
if (warnings.length) console.log('melody check:\n  ' + warnings.join('\n  '));
console.log(`notes placed in ${((Date.now() - started) / 1000).toFixed(1)} s`);

// ---------------------------------------------------------------- room (stereo Freeverb), run over [loop, loop] and keep the 2nd copy
function reverb(send) {
  const sc = RATE / 44100, combLens = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], apLens = [556, 441, 341, 225];
  const pre = Math.round(.018 * RATE), fb = .82, damp = .4, outs = [];
  for (const ch of [0, 1]) {
    const sp = ch ? 23 : 0, cb = combLens.map(l => new Float64Array(Math.round((l + sp) * sc))), ci = new Int32Array(8), cs = new Float64Array(8);
    const ab = apLens.map(l => new Float64Array(Math.round((l + sp) * sc))), ai = new Int32Array(4), out = new Float64Array(COUNT);
    for (let pass = 0; pass < 2; pass++) for (let n = 0; n < COUNT; n++) {
      let k = n - pre; if (k < 0) k += COUNT;
      const x = send[k] * .015; let y = 0;
      for (let c = 0; c < 8; c++) { const buf = cb[c], o = buf[ci[c]]; cs[c] = o * (1 - damp) + cs[c] * damp; buf[ci[c]] = x + cs[c] * fb; if (++ci[c] === buf.length) ci[c] = 0; y += o; }
      for (let c = 0; c < 4; c++) { const buf = ab[c], bo = buf[ai[c]], o = bo - y; buf[ai[c]] = y + bo * .5; if (++ai[c] === buf.length) ai[c] = 0; y = o; }
      if (pass) out[n] = y;
    }
    outs.push(out);
  }
  return outs;
}
const [WL, WR] = reverb(SEND);
let dryE = 0, wetE = 0;
const WET = 2.6;
for (let i = 0; i < COUNT; i++) { dryE += L[i] * L[i] + R[i] * R[i]; wetE += (WL[i] * WL[i] + WR[i] * WR[i]) * WET * WET; L[i] += WET * WL[i]; R[i] += WET * WR[i]; }
console.log(`reverb done in ${((Date.now() - started) / 1000).toFixed(1)} s, wet/dry rms ${Math.sqrt(wetE / dryE).toFixed(3)}`);

// ---------------------------------------------------------------- master: 30 Hz high-pass, +2 dB shelf from 3 kHz (a little sparkle for
// laptop and phone speakers), 8.5 kHz low-pass; run round the loop twice so the filter state at the start is the end's. Level, limiter.
for (const ch of [L, R]) {
  const hp = biquad('hp', 30, .7), hs = biquad('hs', 3000, .7, 2), lp = biquad('lp', 8500, .7);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) { const y = lp(hs(hp(ch[i]))); if (pass) ch[i] = y; }
}
const KNEE = .2, CEIL = .32;
const limit = x => { const a = Math.abs(x); return a <= KNEE ? x : Math.sign(x) * (KNEE + (CEIL - KNEE) * Math.tanh((a - KNEE) / (CEIL - KNEE))); };
const TARGET = .065;
let gain = 1;
{ let e = 0; for (let i = 0; i < COUNT; i++) e += L[i] * L[i] + R[i] * R[i]; gain = TARGET / Math.sqrt(e / (2 * COUNT)); }
for (let it = 0; it < 4; it++) { let e = 0; for (let i = 0; i < COUNT; i++) { const a = limit(L[i] * gain), b = limit(R[i] * gain); e += a * a + b * b; } gain *= TARGET / Math.sqrt(e / (2 * COUNT)); }
let limited = 0;
for (let i = 0; i < COUNT; i++) { const a = L[i] * gain, b = R[i] * gain; if (Math.abs(a) > KNEE || Math.abs(b) > KNEE) limited++; L[i] = limit(a); R[i] = limit(b); }

// ---------------------------------------------------------------- write WAV (16-bit stereo) and metrics
const toInt = x => Math.max(-32768, Math.min(32767, Math.round(x * 32767)));
function wav(file, from, frames) {
  const buf = Buffer.alloc(44 + frames * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + frames * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 4, 28); buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(frames * 4, 40);
  for (let k = 0; k < frames; k++) { const i = ((from + k) % COUNT + COUNT) % COUNT; buf.writeInt16LE(toInt(L[i]), 44 + k * 4); buf.writeInt16LE(toInt(R[i]), 46 + k * 4); }
  writeFileSync(file, buf);
}
// quantise once so the metrics describe exactly what is in the file
for (let i = 0; i < COUNT; i++) { L[i] = toInt(L[i]) / 32767; R[i] = toInt(R[i]) / 32767; }
const wavPath = join(DIR, SLUG + '.wav');
wav(wavPath, 0, COUNT);

let energy = 0, peak = 0, nan = 0, clipped = 0, maxStep = 0, maxStepAt = 0; const steps = [];
for (let i = 0; i < COUNT; i++) {
  const a = L[i], b = R[i];
  if (!Number.isFinite(a) || !Number.isFinite(b)) nan++;
  if (Math.abs(a) >= .999 || Math.abs(b) >= .999) clipped++;
  energy += a * a + b * b; peak = Math.max(peak, Math.abs(a), Math.abs(b));
  if (i) { const st = Math.max(Math.abs(a - L[i - 1]), Math.abs(b - R[i - 1])); if (st > maxStep) { maxStep = st; maxStepAt = i; } if (i % 7 === 0) steps.push(st); }
}
steps.sort((x, y) => x - y);
const pct = p => steps[Math.floor(p * (steps.length - 1))];
let quiet = 1, quietAt = 0; const W = Math.round(.05 * RATE);
for (let i = 0; i + W <= COUNT; i += W) { let e = 0; for (let j = i; j < i + W; j++) e += L[j] * L[j] + R[j] * R[j]; const q = Math.sqrt(e / (2 * W)); if (q < quiet) { quiet = q; quietAt = i; } }
const sectionRms = SECTIONS.map((s, si) => {
  const a = Math.round(si * 32 * BEAT * RATE), b = Math.round((si + 1) * 32 * BEAT * RATE); let e = 0;
  for (let i = a; i < b; i++) e += L[i] * L[i] + R[i] * R[i];
  return +Math.sqrt(e / (2 * (b - a))).toFixed(4);
});
let hfE = 0;
for (const ch of [L, R]) { const h1 = biquad('hp', 6000, .5412), h2 = biquad('hp', 6000, 1.3066); for (let i = 0; i < COUNT; i++) { const y = h2(h1(ch[i])); hfE += y * y; } }
const seamL = Math.abs(L[COUNT - 1] - L[0]), seamR = Math.abs(R[COUNT - 1] - R[0]);
const metrics = {
  title: 'Orchard Breeze', slug: SLUG, duration_seconds: +(COUNT / RATE).toFixed(3), frames: COUNT, sample_rate: RATE, channels: 2, bits: 16,
  bpm: BPM, bars: BARS, key: 'C major (bridge A minor, lift to D major)', rms: +Math.sqrt(energy / (2 * COUNT)).toFixed(4), peak: +peak.toFixed(4),
  nan_samples: nan, clipped_samples: clipped, limiter_active_share: +(limited / COUNT).toFixed(5),
  seam_step: {left: +seamL.toFixed(5), right: +seamR.toFixed(5)}, adjacent_step: {median: +pct(.5).toFixed(5), p90: +pct(.9).toFixed(5), p99: +pct(.99).toFixed(5), max: +maxStep.toFixed(5), max_at_bar: +(maxStepAt / RATE / BEAT / 4 + 1).toFixed(3)},
  quietest_50ms_rms: +quiet.toFixed(4), quietest_50ms_at_bar: +(quietAt / RATE / BEAT / 4 + 1).toFixed(2), section_rms: Object.fromEntries(SECTIONS.map((s, i) => [`${i + 1} ${s.id}`, sectionRms[i]])),
  section_rms_min_over_max: +(Math.min(...sectionRms) / Math.max(...sectionRms)).toFixed(3), share_above_6khz: +(hfE / energy).toFixed(5),
  instrument_rms_premaster: Object.fromEntries(Object.entries(ENERGY).sort((a, b) => b[1] - a[1]).map(([k, e]) => [k, +(Math.sqrt(e / COUNT)).toFixed(4)])),
  melody_check_warnings: warnings, render_seconds: +((Date.now() - started) / 1000).toFixed(1),
};
writeFileSync(join(DIR, SLUG + '.json'), JSON.stringify(metrics, null, 2) + '\n');
console.log(metrics);
