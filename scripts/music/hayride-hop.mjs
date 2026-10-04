// Renders "Hayride Hop", an original background loop for Harvest Tycoon: a light country shuffle in D major at 120 BPM
// (banjo rolls, mandolin chop and tremolo, upright bass on 1 and 3, a whistled hook, harmonica-like reed answers, a fiddle
// counter-melody, xylophone sparkle, brushes, tambourine, handclaps and a clip-clopping hayride horse).
// No recordings or sound fonts: plucked strings are Karplus-Strong, mallets are modal, winds and fiddle are breath/bow
// models with delayed vibrato, pads are detuned reeds/strings. Every note, tail, echo and reverb tail wraps round the exact
// loop boundary (filters and reverb run over [loop, loop] and keep the second copy), so the loop repeats without a seam.
// node scripts/music/hayride-hop.mjs [folder]  ->  <folder>/hayride-hop.wav (16-bit stereo 32 kHz) and hayride-hop.json; scripts/build-farm-music.mjs
// runs it and makes the game's files from the WAV.
// Second-ear pass: guitar/mandolin/pad 7th chords no longer rub a second low down (A7 = A C# E G, not G A C# E), walking-bass
// approach notes stay in key (no F under D/F#, A# under Am, G under E/G#), kick/tambourine/shaker/brush tails fade instead
// of being cut off, a lighter banjo roll under the bridge's reed tune, a little less reverb.
import {mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

// The folder to write into: the first argument (scripts/build-farm-music.mjs gives a temporary one), else the system's temp folder.
const DIR = process.argv.slice(2).find(a => !a.startsWith('--')) ?? join(tmpdir(), 'harvest-music'), SLUG = 'hayride-hop';
mkdirSync(DIR, {recursive: true});
const RATE = 32000, BPM = 120, BEAT = 60 / BPM, SWING = 0.6; // gentle shuffle: the off-beat eighth lands at 60% of the beat
const STARTED = Date.now();

// ---------------------------------------------------------------- the tune
// Lines are written in eighth notes: NOTE:length, r = rest, @n = jump to eighth n of the section, | is only for reading.
const RIFF = 'D5:1 E5:1 F#5:1 A5:1 r:1 F#5:1 A5:2';
const HOOK = 'A5:2 A5:1 B5:1 A5:2 F#5:2 | B5:3 G5:1 D5:2 r:2 | A5:2 A5:1 B5:1 A5:2 D6:2 | C#6:3 B5:1 A5:2 r:2 | ' +
  'D6:2 A5:1 B5:1 A5:1 F#5:1 D5:2 | G5:2 B5:2 D6:3 C#6:1 | B5:2 G5:2 A5:2 C#6:2 | D6:3 r:5';
const HOOK_CHORDS = ['D', 'G', 'D', 'A7', 'D', 'G', 'Em A7', 'D'];
const ANSWER = '@14 D5:1 B4:1 @30 C#5:1 E5:1 @59 A4:1 D5:1 E5:1 F#5:2'; // the reed fills the hook's rests
const COUNTER = 'F#4:4 A4:4 | B4:4 D5:2 B4:2 | A4:4 F#4:4 | E4:2 G4:2 C#5:4 | D5:4 F#4:2 A4:2 | B4:4 G4:2 B4:2 | G4:2 B4:2 C#5:2 E5:2 | D5:3 E5:1 F#5:2 A5:2';
const SPARKLE = '@14 G5:1 B5:1 @30 A5:1 C#6:1 @59 F#5:1 A5:1 D6:1 A5:1 F#5:1';
const BTUNE = 'B5:3 A5:1 G5:4 | E5:2 A5:2 C#6:4 | C#6:3 B5:1 A5:4 | F#5:6 r:2 | D5:2 G5:2 B5:3 A5:1 | A5:3 F#5:1 D5:4 | G5:3 F#5:1 E5:2 B5:2 | A5:4 G5:2 E5:2';
const BCOUNTER = 'D5:4 B4:4 | A4:4 C#5:4 | A4:8 | B4:4 D5:2 F#5:2 | G4:4 B4:4 | A4:4 F#4:4 | G4:4 B4:4 | C#5:4 E5:2 G5:2';
const B_CHORDS = ['G', 'A', 'F#m', 'Bm', 'G', 'D/F#', 'Em', 'A7'];
const BREAK = 'F#5:2 F#5:1 G5:1 F#5:2 D5:2 | G5:3 D5:1 B4:2 r:2 | F#5:2 F#5:1 G5:1 F#5:2 A5:2 | E5:3 C#5:1 A4:2 r:2 | ' +
  'D5:2 F#5:2 B5:3 A5:1 | B5:2 G5:2 D5:4 | E5:2 G5:2 B5:2 G5:2 | F#5:2 A5:2 C6:2 A5:2';
const BRIDGE = 'D5:2 B4:1 D5:1 G5:3 E5:1 | E5:3 D5:1 C5:2 E5:2 | D5:2 B4:1 D5:1 G5:3 B5:1 | A5:4 F#5:2 r:2 | ' +
  'B5:3 A5:1 G5:2 D5:2 | E5:2 G5:2 C6:3 B5:1 | A5:2 C6:2 A5:2 F#5:2 | G5:4 r:2 D5:1 E5:1';
const BR2_FIDDLE = 'E5:2 G5:2 B5:3 A5:1 | G5:2 E5:2 C5:4 | @32 G5:2 B5:2 E6:3 D6:1 | C6:2 G5:2 E5:4';
const BR2_WHISTLE = '@16 B5:2 G5:1 B5:1 D6:4 | A5:3 F#5:1 D5:4 | @48 A5:2 C6:2 E6:3 C6:1 | D#6:2 B5:2 F#5:2 A5:2';
const TAG_FIDDLE = 'C#6:3 B5:1 A5:4 | G5:2 E5:2 C#5:2 E5:2 | A5:1 F#5:1 D5:1 F#5:1 A5:2 D6:2 | B5:1 A5:1 G5:1 D5:1 B4:2 D5:2 | ' +
  'F#5:1 E5:1 D5:1 E5:1 F#5:2 A5:2 | B5:3 A5:1 F#5:2 D5:2';
const TAG_WHISTLE = '@48 E5:2 G5:2 B5:2 G5:2 | A5:3 G5:1 E5:2 C#5:2'; // walks down onto the banjo riff's first D

// Twelve 8-bar sections. tr = transposition (the key lift to E), E = how hard the band plays, g = the groove.
const SECTIONS = [
  {name: 'Intro: hayride riff (banjo, reed)', key: 'D', tr: 0, E: .8, chords: ['D', 'G', 'D', 'A7', 'D', 'G', 'A7', 'A7'],
    parts: [{v: 'banjoLead', line: `${RIFF} | B5:3 A5:1 G5:2 r:2 | ${RIFF} | C#6:3 B5:1 A5:2 r:2`},
      {v: 'reed', line: '@32 F#5:1 G5:1 A5:1 D6:1 r:1 A5:1 F#5:2 | G5:3 F#5:1 D5:2 r:2 | E5:3 C#5:1 A4:2 r:2'},
      {v: 'whistle', line: '@61 C#5:1 E5:1 G5:1'}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: [4, 5, 6, 7], guitar: 'busy', shaker: 1, wood: 'all', pad: 'accordion', padVel: .7}},
  {name: 'Hook A: whistle', key: 'D', tr: 0, E: .85, chords: HOOK_CHORDS, parts: [{v: 'whistle', line: HOOK}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: 'all', guitar: 'busy', shaker: 1, pad: 'strings', padVel: .55}},
  {name: 'Hook A answered: whistle + reed', key: 'D', tr: 0, E: .9, chords: HOOK_CHORDS,
    parts: [{v: 'whistle', line: HOOK}, {v: 'reed', line: ANSWER}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: 'all', chop: 1, tamb: '24', pad: 'accordion'}},
  {name: 'B theme: fiddle over mandolin tremolo', key: 'D', tr: 0, E: .82, chords: B_CHORDS,
    parts: [{v: 'fiddleLead', line: BTUNE}],
    g: {bass: '2beat', walkBars: [1, 3, 5, 7], kick: .8, brush: 1, roll: 'light', guitar: 'chick', shaker: 1, tremPad: 1}},
  {name: 'Hook A: banjo + xylophone, fiddle counter-melody', key: 'D', tr: 0, E: .95, chords: HOOK_CHORDS,
    parts: [{v: 'banjoLead', line: HOOK}, {v: 'xylo', line: HOOK}, {v: 'fiddleCounter', line: COUNTER}],
    g: {bass: '2beat', kick: 1, brush: 1, guitar: 'busy', chop: 1, tamb: '24', clap: 1, pad: 'accordion', padVel: .6}},
  {name: 'Breakdown: marimba, pizzicato, ukulele, horse', key: 'D', tr: 0, E: .72, chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'D7'],
    parts: [{v: 'marimba', line: BREAK}],
    g: {bass: 'half', kick: 'one', brush: 'swish', uke: 1, pizz: 1, wood: 'all', shaker: .7, pad: 'strings'}},
  {name: 'Bridge in G: reed, walking bass', key: 'G', tr: 0, E: .85, chords: ['G', 'C', 'G', 'D', 'G', 'C', 'Am D7', 'G'],
    parts: [{v: 'reed', line: BRIDGE}, {v: 'fiddleCounter', line: '@32 D5:8 | E5:8 | C5:8 | B4:6 r:2'}],
    g: {bass: 'walk', kick: 1, brush: 1, roll: 'light', guitar: 'chick', shaker: 1, pad: 'accordion', padVel: .65}}, // light roll: the reed sat only ~1 dB over the band
  {name: 'Bridge 2: fiddle and whistle trade, build to B7', key: 'G', tr: 0, E: .9, build: 1, chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'],
    parts: [{v: 'fiddleLead', line: BR2_FIDDLE}, {v: 'whistle', line: BR2_WHISTLE}],
    g: {bass: 'walk', kick: 1, brush: 1, roll: 'all', chop: 1, tamb: '8', tremPad: 1, pad: 'strings', fill: [7]}},
  {name: 'Hook A in E: whistle + fiddle harmony + xylophone sparkle', key: 'D', tr: 2, E: 1, chords: HOOK_CHORDS,
    parts: [{v: 'whistle', line: HOOK}, {v: 'fiddleHarm', line: HOOK, harm: 1}, {v: 'xyloSparkle', line: SPARKLE}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: 'all', guitar: 'busy', tamb: '24', clap: 1, pad: 'strings', padVel: .7}},
  {name: 'B theme in E: mandolin tremolo + reed counter', key: 'D', tr: 2, E: .88, chords: B_CHORDS,
    parts: [{v: 'mandTrem', line: BTUNE}, {v: 'reedCounter', line: BCOUNTER}],
    g: {bass: '2beat', walkBars: [1, 3, 5, 7], kick: .8, brush: 1, roll: 'light', guitar: 'chick', shaker: 1, pad: 'accordion'}},
  {name: 'Big hook in E: whistle + reed + fiddle + xylophone', key: 'D', tr: 2, E: 1, chords: HOOK_CHORDS,
    parts: [{v: 'whistle', line: HOOK}, {v: 'reed', line: ANSWER}, {v: 'fiddleCounter', line: COUNTER}, {v: 'xylo', line: HOOK}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: 'all', guitar: 'busy', chop: 1, tamb: '8', clap: 1, pad: 'strings', padVel: .8}},
  {name: 'Turnaround: fiddle tune, back to D, A7 walk-up into bar 1', key: 'D', tr: 0, E: .9, chords: ['A', 'A7', 'D', 'G', 'D', 'Bm', 'Em', 'A7'],
    parts: [{v: 'fiddleLead', line: TAG_FIDDLE}, {v: 'whistle', line: TAG_WHISTLE}],
    g: {bass: '2beat', kick: 1, brush: 1, roll: 'all', guitar: 'busy', shaker: 1, wood: [4, 5, 6, 7], fill: [7], pad: 'accordion', padVel: .7}}, // no chop: room for the fiddle tune
];

// Melodic voices: phrase-synth winds/fiddle (kind), plucked or struck leads, tremolo mandolin.
const VOICE = {
  whistle: {kind: 'whistle', pan: .05, grp: 'lead', gain: 1},
  reed: {kind: 'reed', pan: -.22, grp: 'lead', gain: 1.15},
  fiddleLead: {kind: 'fiddle', pan: .24, grp: 'lead', gain: 1.1},
  fiddleCounter: {kind: 'fiddle', pan: .3, grp: 'accomp', gain: .45},
  fiddleHarm: {kind: 'fiddle', pan: .3, grp: 'accomp', gain: .45},
  reedCounter: {kind: 'reed', pan: -.26, grp: 'accomp', gain: .45},
  banjoLead: {pluck: 'banjo', pan: -.28, grp: 'lead', gain: 4},
  marimba: {mallet: 'marimba', pan: -.08, grp: 'lead', gain: 1.1},
  xylo: {mallet: 'xylo', pan: .36, grp: 'accomp', gain: 1},
  xyloSparkle: {mallet: 'xylo', pan: .36, grp: 'accomp', gain: 1.3},
  mandTrem: {trem: 1, pan: .28, grp: 'lead', gain: 2.2},
};
const GAIN = {kick: .28, brush: .5, swish: .08, shaker: .14, tamb: .2, clap: .35, wood: .24,
  roll: .5, guitar: .2, chop: .15, uke: .4, pizz: .42, bass: 1, accordion: .45, strings: .4, tremPad: 1};
// Group balance: A-weighted active level of each group relative to the lead (dB; the bass by plain RMS, since A-weighting
// would ask for a booming bass), and reverb sends.
const TARGET_DB = {lead: 0, accomp: -6.5, plucks: -7, bass: -1, drums: -10};
const SEND = {lead: .24, accomp: .3, plucks: .16, bass: .02, drums: .1};
const WET = .26, OFFSET = .008, LEVEL_EXP = .3, RMS_TARGET = .065, CEIL = .32, KNEE = .2;

// ---------------------------------------------------------------- basics
const BARS = SECTIONS.length * 8, BEATS = BARS * 4, COUNT = Math.round(BEATS * BEAT * RATE), E8 = SECTIONS.length * 64;
function mulberry(a) {return () => {a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296;};}
const rnd = mulberry(20261004), nrnd = mulberry(4417);
const noise = () => nrnd() * 2 - 1;
let spare = null;
function gauss() {if (spare !== null) {const s = spare; spare = null; return s;} let u = 0; while (!u) u = rnd(); const v = rnd(), r = Math.sqrt(-2 * Math.log(u)); spare = r * Math.sin(2 * Math.PI * v); return r * Math.cos(2 * Math.PI * v);}
const hz = m => 440 * 2 ** ((m - 69) / 12), clamp = (x, a, b) => x < a ? a : x > b ? b : x, pcOf = x => ((x % 12) + 12) % 12;
// Score beats -> seconds, with the shuffle: each beat's second half is squeezed so the off-beat lands late.
function beatTime(b) {const w = Math.floor(b), x = b - w; return (w + (x < .5 ? x * SWING / .5 : SWING + (x - .5) * (1 - SWING) / .5)) * BEAT;}
const J = (s = .004) => gauss() * s, V = (s = .07) => 1 + gauss() * s;
const T = (beat, s) => beatTime(beat) + J(s);

const PC = {C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11};
const midiOf = s => {const m = s.match(/^([A-G])([#b]?)(-?\d)$/); if (!m) throw new Error('bad note ' + s); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);};
function parseLine(str) {
  const notes = []; let p = 0;
  for (const tok of str.trim().split(/\s+/)) {
    if (tok === '|') continue;
    if (tok[0] === '@') {p = +tok.slice(1); continue;}
    const [n, l] = tok.split(':');
    if (n !== 'r') notes.push({p, len: +l, m: midiOf(n)});
    p += +l;
  }
  return notes;
}
function chordOf(name, tr) {
  const m = name.match(/^([A-G])([#b]?)(m?)(7?)(?:\/([A-G])([#b]?))?$/); if (!m) throw new Error('bad chord ' + name);
  const acc = s => s === '#' ? 1 : s === 'b' ? -1 : 0, root = pcOf(PC[m[1]] + acc(m[2]) + tr), minor = !!m[3];
  const tones = [root, pcOf(root + (minor ? 3 : 4)), pcOf(root + 7)]; if (m[4]) tones.push(pcOf(root + 10));
  const bass = m[5] ? pcOf(PC[m[5]] + acc(m[6]) + tr) : root;
  return {name: name + '+' + tr, root, minor, third: tones[1], tones, bass};
}
const HALF = []; // chord per half bar
for (const S of SECTIONS) for (const c of S.chords) {const [a, b] = c.split(' '); HALF.push(chordOf(a, S.tr), chordOf(b ?? a, S.tr));}
const chordAt8 = gp => HALF[Math.floor(pcMod(gp, E8) / 4)];
function pcMod(x, n) {return ((x % n) + n) % n;}
const keyPc = S => pcOf(PC[S.key] + S.tr), scaleOf = k => [0, 2, 4, 5, 7, 9, 11].map(x => (x + k) % 12);

// ---------------------------------------------------------------- buses
const GROUPS = ['lead', 'accomp', 'plucks', 'bass', 'drums'];
const BUS = Object.fromEntries(GROUPS.map(g => [g, {L: new Float32Array(COUNT), R: new Float32Array(COUNT)}]));
const STATS = {};
// Adds a mono buffer at time t (seconds), wrapping past the end of the loop back to its start. Gentle equal-power pan.
const AW = (() => { // one-pole approximation of the A-weighting curve, normalised to 0 dB at 1 kHz (for reporting balance)
  const hp = fc => {const rc = 1 / (2 * Math.PI * fc), a = rc / (rc + 1 / RATE); return {hp: 1, a};}, lp = fc => {const rc = 1 / (2 * Math.PI * fc); return {hp: 0, a: (1 / RATE) / (rc + 1 / RATE)};};
  const chain = [hp(20.6), hp(20.6), hp(107.7), hp(737.9), lp(12194), lp(12194)];
  const apply = x => {const y = Float64Array.from(x); for (const st of chain) {let px = 0, py = 0; for (let i = 0; i < y.length; i++) {const v = y[i]; py = st.hp ? st.a * (py + v - px) : py + st.a * (v - py); px = v; y[i] = py;}} return y;};
  const sine = new Float64Array(RATE); for (let i = 0; i < RATE; i++) sine[i] = Math.sin(2 * Math.PI * 1000 * i / RATE);
  const ref = apply(sine).slice(RATE / 2); let e = 0; for (const v of ref) e += v * v; const k = 1 / Math.sqrt(2 * e / ref.length);
  return x => {const y = apply(x); for (let i = 0; i < y.length; i++) y[i] *= k; return y;};
})();
function place(buf, t, pan, grp, gain, label) {
  const a = (clamp(pan, -.45, .45) + 1) * Math.PI / 4, gl = Math.cos(a) * Math.SQRT2 * gain, gr = Math.sin(a) * Math.SQRT2 * gain;
  const {L, R} = BUS[grp]; let j = pcMod(Math.round((t + OFFSET) * RATE), COUNT), e = 0;
  // every buffer ends on a 3 ms taper, so nothing is ever cut off mid-wave (no click when a tail is truncated)
  const n = buf.length, tp = Math.min(96, n >> 2);
  for (let i = 0; i < n; i++) {const v = n - i <= tp ? buf[i] * (n - i - 1) / tp : buf[i]; L[j] += v * gl; R[j] += v * gr; e += v * v; if (++j === COUNT) j = 0;}
  const s = STATS[label] ??= {e: 0, ea: 0, n: 0, notes: 0, grp}; s.e += e * gain * gain; s.n += buf.length; s.notes++;
  const aw = AW(buf); let ea = 0; for (let i = 0; i < aw.length; i++) ea += aw[i] * aw[i]; s.ea += ea * gain * gain;
}

// ---------------------------------------------------------------- filters
function bq(type, f0, Q = .7071, dB = 0) {
  const w = 2 * Math.PI * f0 / RATE, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), A = 10 ** (dB / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') {b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;}
  else if (type === 'hp') {b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;}
  else if (type === 'bp') {b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al;}
  else if (type === 'peak') {b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A;}
  else if (type === 'hs') {const s = 2 * Math.sqrt(A) * sn / 2 * Math.SQRT2; b0 = A * ((A + 1) + (A - 1) * cs + s); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - s); a0 = (A + 1) - (A - 1) * cs + s; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - s;}
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function run(buf, ...cs) {
  for (const [b0, b1, b2, a1, a2] of cs) {let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let i = 0; i < buf.length; i++) {const x = buf[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; buf[i] = y;}}
  return buf;
}
// Same, but for the whole loop: run over [loop, loop] and keep the second copy, so the filter state wraps round the seam.
function runLoop(buf, ...cs) {
  for (const [b0, b1, b2, a1, a2] of cs) {let x1 = 0, x2 = 0, y1 = 0, y2 = 0; for (let pass = 0; pass < 2; pass++) for (let i = 0; i < COUNT; i++) {const x = buf[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; if (pass) buf[i] = y;}}
  return buf;
}
function norm(buf, vel) {let pk = 0; for (let i = 0; i < buf.length; i++) pk = Math.max(pk, Math.abs(buf[i])); const s = pk ? vel / pk : 0; for (let i = 0; i < buf.length; i++) buf[i] *= s; return buf;}

// ---------------------------------------------------------------- Karplus-Strong strings
// Delay line + gentle 3-tap lowpass in the loop (linear phase, so tuning stays exact) + allpass for the fractional delay.
// Excitation: one period of the plucked shape (a triangle with its apex at the pick point) plus a little smoothed pick
// noise. Several excitations = re-picking (tremolo).
function ks(f, {ring, t60, damp, a, pick, lp, nz = .4, excite = [0], exAmp, repick = 1}) {
  const N = RATE / f, D = Math.max(2, Math.floor(N - 1.1)), frac = N - 1 - D, C = (1 - frac) / (1 + frac);
  const g = Math.pow(.001, 1 / (f * t60)), gr = Math.pow(.001, 1 / (f * damp));
  const ringS = Math.round(ring * RATE), total = ringS + Math.round(damp * 1.4 * RATE), ex = new Float64Array(total);
  const M = Math.max(4, Math.round(N)), P = clamp(Math.round(pick * M), 1, M - 2), c = 1 - Math.exp(-2 * Math.PI * Math.min(lp, 12000) / RATE);
  const marks = [];
  for (let e = 0; e < excite.length; e++) {
    const off = Math.max(0, Math.round(excite[e] * RATE)); if (off >= total) continue; marks.push(off);
    const b = new Float64Array(M); let y = 0, mean = 0;
    let y2 = 0; for (let i = 0; i < M; i++) {y += c * (noise() - y); y2 += c * (y - y2); b[i] = (i < P ? i / P : (M - 1 - i) / (M - 1 - P)) + nz * y2; mean += b[i];}
    mean /= M; const amp = exAmp ? exAmp[e] : 1;
    const T = Math.max(2, Math.min(8, Math.floor(M / 6))); // short tapers: the burst ends before the loop returns it, so no overlap spike
    for (let i = 0; i < M && off + i < total; i++) ex[off + i] += (b[i] - mean) * amp * Math.min(1, (i + 1) / T, (M - i) / T);
  }
  const size = D + 3, line = new Float64Array(size), out = new Float64Array(total);
  let w = 0, x1 = 0, y1 = 0, mk = 1;
  for (let n = 0; n < total; n++) {
    if (repick < 1 && mk < marks.length && n === marks[mk]) {for (let i = 0; i < size; i++) line[i] *= repick; x1 *= repick; y1 *= repick; mk++;}
    let i0 = w - D; if (i0 < 0) i0 += size; let i1 = i0 - 1; if (i1 < 0) i1 += size; let i2 = i1 - 1; if (i2 < 0) i2 += size;
    const fir = a * line[i0] + (1 - 2 * a) * line[i1] + a * line[i2], ap = C * fir + x1 - C * y1; x1 = fir; y1 = ap;
    const y = ex[n] + (n < ringS ? g : gr) * ap; line[w] = y; out[n] = y; if (++w === size) w = 0;
  }
  return out;
}
const PLUCK = {
  banjo: {a: .05, t60: 1.5, pick: .11, lp: 4500, nz: .5, damp: .07, body: () => [bq('hp', 150), bq('peak', 1600, .9, 3), bq('peak', 360, 1.4, 2), bq('lp', 6500)]},
  mandolin: {a: .045, t60: 1.1, pick: .16, lp: 4500, nz: .45, damp: .05, course: 1, body: () => [bq('hp', 200), bq('peak', 520, 1.2, 3), bq('lp', 5500)]},
  guitar: {a: .1, t60: 2.2, pick: .2, lp: 3500, nz: .3, damp: .05, body: () => [bq('hp', 90), bq('peak', 210, 1.2, 3), bq('peak', 2400, 1, 1.5), bq('lp', 6000)]},
  uke: {a: .16, t60: .8, pick: .28, lp: 2800, nz: .2, damp: .05, body: () => [bq('hp', 220), bq('peak', 450, 1.3, 3)]},
  pizz: {a: .2, t60: .34, pick: .4, lp: 2200, nz: .15, damp: .08, body: () => [bq('hp', 140), bq('peak', 290, 2, 4), bq('peak', 1000, 1.5, 2)]},
  bass: {a: .2, t60: 1.8, pick: .18, lp: 1500, nz: .3, damp: .07, body: () => [bq('hp', 34), bq('peak', 100, 1, 2), bq('lp', 2200)]},
};
function pluck(kind, m, {ring, vel = 1, excite, exAmp, bright = 1, repick}) {
  const P = PLUCK[kind], f = hz(m), t60 = P.t60 * (kind === 'bass' ? 1 : clamp((330 / f) ** .35, .5, 1.6));
  const opt = {ring, t60, damp: P.damp, a: P.a, pick: P.pick * (.9 + .2 * rnd()), lp: P.lp * (.6 + .4 * clamp(vel, 0, 1.2)) * bright, nz: P.nz, excite, exAmp, repick};
  const out = ks(f, opt);
  if (P.course) {const o2 = ks(f * 1.0016, {...opt, pick: opt.pick * 1.1}); for (let i = 0; i < out.length; i++) out[i] = (out[i] + o2[i]) * .5;}
  for (let i = 0; i < 24; i++) out[i] *= i / 24;
  run(out, ...P.body());
  // level by how loud the first 150 ms sound (RMS), not by the attack's single highest sample
  const n = Math.min(out.length, Math.round(.15 * RATE)); let e = 0; for (let i = 0; i < n; i++) e += out[i] * out[i];
  const k = .3 * vel / Math.sqrt(e / n + 1e-12); for (let i = 0; i < out.length; i++) out[i] *= k;
  return out;
}
function strum(kind, notes, t, dir, vel, ring, label, pan, bright = 1) {
  const order = dir > 0 ? notes : [...notes].reverse(), spread = kind === 'mandolin' ? .007 : kind === 'uke' ? .011 : .013;
  order.forEach((m, i) => place(pluck(kind, m, {ring: ring + rnd() * .02, vel: vel * (1 - .07 * i) * V(.05), bright}), t + i * spread * (.8 + .4 * rnd()), pan, 'plucks', GAIN[label], label));
}
function tremNote(m, t, dur, vel, pan, grp, gain, label) {
  const rate = 12 + rnd() * .6, n = Math.max(1, Math.round(dur * rate)), ex = [], amp = [];
  for (let k = 0; k < n; k++) {ex.push(Math.max(0, k / rate + J(.003))); amp.push((k % 2 ? .78 : 1) * (k === 0 ? 1.25 : 1) * (.9 + .2 * rnd()));}
  place(pluck('mandolin', m, {ring: dur + .02, vel, excite: ex, exAmp: amp, repick: .55}), t, pan, grp, gain, label);
}

// ---------------------------------------------------------------- mallets (modal: inharmonic partials, soft contact)
const MALLET = {xylo: {r: [1, 3.93, 9.2], a: [1, .22, .05], d: [.42, .11, .035], click: .14}, marimba: {r: [1, 3.99, 9.9], a: [1, .3, .04], d: [.95, .26, .06], click: .05}};
function mallet(kind, m, vel) {
  const P = MALLET[kind], f = hz(m), sc = clamp((660 / f) ** .4, .5, 1.5), len = Math.round(P.d[0] * sc * 6 * RATE), out = new Float64Array(len);
  for (let k = 0; k < P.r.length; k++) {
    const fk = f * P.r[k]; if (fk > 6500) continue;
    const amp = P.a[k] * (fk > 4500 ? .35 : 1), dk = Math.exp(-1 / (P.d[k] * sc * RATE)), w = 2 * Math.PI * fk / RATE;
    // recursive sine oscillator times decaying envelope
    let s1 = Math.sin(rnd() * .3), s0 = Math.sin(rnd() * .3 - w), env = amp; const k2 = 2 * Math.cos(w);
    for (let i = 0; i < len && env > 1e-5; i++) {const s = k2 * s1 - s0; s0 = s1; s1 = s; out[i] += env * s; env *= dk;}
  }
  let y = 0; const c = 1 - Math.exp(-2 * Math.PI * 2600 / RATE);
  for (let i = 0; i < len; i++) {if (i < 40) out[i] *= i / 40; if (i < 240) {y += c * (noise() - y); out[i] += P.click * y * Math.exp(-i / 45);}}
  return norm(run(out, bq('hp', 120)), vel);
}

// ---------------------------------------------------------------- wavetables for reed, fiddle and pads
const TBL = 2048, TABLES = new Map();
function noteTable(kind, m) {
  const key = kind + m; if (TABLES.has(key)) return TABLES.get(key);
  const f = hz(m), w = [], g = (x, c, s) => Math.exp(-(((x - c) / s) ** 2));
  if (kind === 'reed') for (let n = 1; n * f < 5200; n++) {const fn = n * f; w.push((n % 2 ? 1 : .6) / n ** .8 * (1 + 1.5 * g(fn, 1200, 500) + .8 * g(fn, 2700, 700)));}
  else if (kind === 'fiddle') for (let n = 1; n * f < 6000; n++) w.push(1 / n);
  else if (kind === 'accordion') for (let n = 1; n * f < 4000; n++) w.push((n % 2 ? 1 : .8) / n ** .75 * (1 + 1.2 * g(n * f, 1000, 600)));
  else for (let n = 1; n * f < 3000; n++) w.push(1 / n);
  const t = new Float64Array(TBL + 1); let pk = 0;
  for (let i = 0; i < TBL; i++) {let s = 0; for (let n = 0; n < w.length; n++) s += w[n] * Math.sin(2 * Math.PI * (n + 1) * i / TBL); t[i] = s; pk = Math.max(pk, Math.abs(s));}
  for (let i = 0; i < TBL; i++) t[i] /= pk; t[TBL] = t[0]; TABLES.set(key, t); return t;
}

// ---------------------------------------------------------------- winds and fiddle: one continuous voice per phrase
// Glide between notes, soft attack, a small articulation dip on legato notes, scoops into fresh notes, delayed vibrato.
const KIND = {
  whistle: {glide: .016, att: .022, rel: .045, vib: 18, rate: 5.6, vdel: .17, vrise: .25, scoop: -35, scoopT: .035, gap: .1, legato: .9, dip: .45},
  reed: {glide: .012, att: .016, rel: .05, vib: 9, rate: 5.0, vdel: .22, vrise: .3, scoop: -45, scoopT: .05, gap: .1, legato: .86, dip: .5, trem: .12},
  fiddle: {glide: .028, att: .045, rel: .08, vib: 20, rate: 5.7, vdel: .16, vrise: .22, scoop: -80, scoopT: .06, gap: .11, legato: .97, dip: .32},
};
const NOTES = {};
function renderVoice(id) {
  const def = VOICE[id], P = KIND[def.kind], ns = NOTES[id].sort((a, b) => a.t - b.t);
  for (let i = 0; i < ns.length; i++) {
    const prev = ns[i - 1], fresh = !prev || ns[i].t - (prev.t + prev.d) > .12;
    ns[i].fresh = fresh;
    ns[i].scoop = def.kind === 'fiddle' ? (fresh || ns[i].m - prev.m >= 5 || rnd() < .25 ? P.scoop * (.6 + .6 * rnd()) : 0) : fresh ? P.scoop * (.7 + .5 * rnd()) : 0;
  }
  let i = 0;
  while (i < ns.length) {let j = i; while (j + 1 < ns.length && ns[j + 1].t - (ns[j].t + ns[j].d) < P.gap) j++; renderPhrase(ns.slice(i, j + 1), def, P, id); i = j + 1;}
}
function renderPhrase(ns, def, P, id) {
  const kind = def.kind, t0 = ns[0].t - .005, last = ns[ns.length - 1], len = Math.ceil((last.t + last.d + P.rel * 7 - t0) * RATE), out = new Float64Array(len);
  const art = new Float32Array(len).fill(1), w = Math.round(.016 * RATE);
  for (let k = 1; k < ns.length; k++) if (ns[k].t - (ns[k - 1].t + ns[k - 1].d) < .03) {
    const c = Math.round((ns[k].t - t0) * RATE);
    for (let s = Math.max(0, c - 3 * w); s < Math.min(len, c + 3 * w); s++) {const x = (s - c) / w; art[s] *= 1 - P.dip * Math.exp(-x * x);}
  }
  const lf = ns.map(n => Math.log2(hz(n.m))), tabs = kind === 'whistle' ? null : ns.map(n => noteTable(kind, n.m));
  const gK = 1 - Math.exp(-1 / (P.glide * RATE)), aK = 1 - Math.exp(-1 / (P.att * RATE)), rK = 1 - Math.exp(-1 / (P.rel * RATE)), vK = 1 - Math.exp(-1 / (.05 * RATE));
  let k = 0, logf = lf[0], amp = 0, ph = rnd(), ph2 = rnd(), vph = rnd() * 6.283, vd = 0, trph = rnd() * 6.283, r1 = 0, r2 = 0, ca = 0, cb = 0, cc = 0, lp = 0;
  for (let s = 0; s < len; s++) {
    const tau = t0 + s / RATE; while (k + 1 < ns.length && tau >= ns[k + 1].t) k++;
    const n = ns[k], u = tau - n.t, on = u >= 0 && u < n.d;
    logf += (lf[k] - logf) * gK;
    const sc = n.scoop && u >= 0 ? n.scoop / 1200 * Math.exp(-u / P.scoopT) : 0;
    vd += ((on ? P.vib * clamp((u - P.vdel) / P.vrise, 0, 1) : 0) - vd) * vK;
    vph += 2 * Math.PI * P.rate / RATE;
    const f = 2 ** (logf + sc + vd * Math.sin(vph) / 1200), target = on ? n.v : 0;
    amp += (target - amp) * (target > amp ? aK : rK);
    ph += f / RATE; ph -= Math.floor(ph);
    let x;
    if (kind === 'whistle') {
      x = Math.sin(2 * Math.PI * ph) + .03 * Math.sin(4 * Math.PI * ph);
      if ((s & 31) === 0) {const r = Math.exp(-Math.PI * (f / 5) / RATE), wv = 2 * Math.PI * f / RATE; ca = 2 * r * Math.cos(wv); cb = -r * r; cc = (1 - r) * Math.sqrt(1 - 2 * r * Math.cos(2 * wv) + r * r);}
      const y = cc * noise() + ca * r1 + cb * r2; r2 = r1; r1 = y; lp += .25 * (noise() - lp);
      x += .7 * y + lp * (.02 + (n.fresh && u >= 0 ? .2 * Math.exp(-u / .03) : 0)); // breath on the pitch, a little air, a puff on fresh notes
    } else {
      const tb = tabs[k], idx = ph * TBL, i0 = idx | 0; x = tb[i0] + (tb[i0 + 1] - tb[i0]) * (idx - i0);
      if (kind === 'reed') {
        ph2 += f * 1.0028 / RATE; ph2 -= Math.floor(ph2); const j2 = ph2 * TBL, k2 = j2 | 0;
        x = (x + .3 * (tb[k2] + (tb[k2 + 1] - tb[k2]) * (j2 - k2))) / 1.3;
        trph += 2 * Math.PI * 4.6 / RATE; x *= 1 + P.trem * (vd / P.vib) * Math.sin(trph); x += .02 * noise();
      } else x += .035 * noise(); // bow noise
    }
    out[s] = x * amp * art[s];
  }
  if (kind === 'fiddle') run(out, bq('hp', 190), bq('peak', 290, 2.5, 5), bq('peak', 520, 2, 3), bq('peak', 1300, 1.2, -4), bq('peak', 2900, 1.4, 4), bq('lp', 5500));
  else if (kind === 'reed') run(out, bq('hp', 170), bq('peak', 1200, 1, 2), bq('lp', 5000));
  else run(out, bq('hp', 240), bq('lp', 6000));
  place(out, t0, def.pan, def.grp, def.gain, id);
}

// ---------------------------------------------------------------- pads
function pad(kind, m, t, dur, vel, pan, label) {
  const f = hz(m), tb = noteTable(kind, m), att = kind === 'strings' ? .35 : .1, rel = kind === 'strings' ? .5 : .2;
  const det = kind === 'strings' ? [-6, 0, 6] : [0, 4], len = Math.round((dur + rel * 5) * RATE), out = new Float64Array(len), N = dur * RATE;
  for (const c of det) {
    let ph = rnd(), vp = rnd() * 6.28; const inc = f * 2 ** (c / 1200) / RATE, vr = 2 * Math.PI * (4.6 + rnd() * .8) / RATE;
    for (let i = 0; i < len; i++) {vp += vr; ph += inc * (kind === 'strings' ? 1 + .003 * Math.sin(vp) : 1); ph -= Math.floor(ph); const idx = ph * TBL, i0 = idx | 0; out[i] += tb[i0] + (tb[i0 + 1] - tb[i0]) * (idx - i0);}
  }
  const endAmp = 1 - Math.exp(-dur / att);
  for (let i = 0; i < len; i++) {const s = i / RATE; let e = i < N ? 1 - Math.exp(-s / att) : endAmp * Math.exp(-(s - dur) / rel); if (kind === 'accordion') e *= 1 + .05 * Math.sin(2 * Math.PI * s / 1.9); out[i] *= e * vel / det.length;}
  if (kind === 'strings') run(out, bq('hp', 120), bq('lp', 2400)); else run(out, bq('hp', 150), bq('lp', 4000));
  place(out, t, pan, 'accomp', GAIN[label], label);
}

// ---------------------------------------------------------------- percussion (filtered noise and pitched bursts)
function kick(t, vel) {
  // .5 s with a 60 ms fade: the old .3 s buffer cut the 52 Hz body off at 10% of its peak (a low thump-click per kick)
  const n = Math.round(.5 * RATE), fo = Math.round(.06 * RATE), b = new Float64Array(n), c = 1 - Math.exp(-2 * Math.PI * 1200 / RATE); let ph = 0, y = 0;
  for (let i = 0; i < n; i++) {const s = i / RATE; ph += 2 * Math.PI * (52 + 58 * Math.exp(-s / .03)) / RATE; y += c * (noise() - y); b[i] = (Math.sin(ph) * Math.exp(-s / .13) + .25 * y * Math.exp(-s / .006)) * Math.min(1, i / 24, (n - i) / fo);}
  place(norm(b, vel), t, 0, 'drums', GAIN.kick, 'kick');
}
function brushTap(t, vel) {
  const n = Math.round(.3 * RATE), b = new Float64Array(n), body = new Float64Array(n);
  for (let i = 0; i < n; i++) {const s = i / RATE; b[i] = noise() * Math.exp(-s / .055) * Math.min(1, i / 64); body[i] = .35 * Math.sin(2 * Math.PI * 185 * s) * Math.exp(-s / .035) * Math.min(1, i / 32);}
  run(b, bq('hp', 900), bq('lp', 5200)); for (let i = 0; i < n; i++) b[i] += body[i] * .15;
  place(norm(b, vel), t, .12, 'drums', GAIN.brush, 'brush');
}
function swish(t, dur, vel) {
  const n = Math.round(dur * RATE), b = new Float64Array(n);
  for (let i = 0; i < n; i++) b[i] = noise() * Math.sin(Math.PI * i / n) ** 2;
  place(norm(run(b, bq('hp', 1200), bq('lp', 4500)), vel), t, .1, 'drums', GAIN.swish, 'swish');
}
function shaker(t, vel) {
  const n = Math.round(.15 * RATE), b = new Float64Array(n);
  for (let i = 0; i < n; i++) b[i] = noise() * Math.min(1, i / 190) * Math.exp(-i / RATE / .028);
  place(norm(run(b, bq('hp', 2800), bq('lp', 6000)), vel), t, .3, 'drums', GAIN.shaker, 'shaker');
}
function tamb(t, vel) {
  const n = Math.round(.42 * RATE), b = new Float64Array(n), fs = [], ds = [];
  for (let k = 0; k < 6; k++) {fs.push(3300 + rnd() * 2400); ds.push(.05 + rnd() * .08);}
  for (let i = 0; i < n; i++) {const s = i / RATE; let v = 0; for (let k = 0; k < 6; k++) v += Math.sin(2 * Math.PI * fs[k] * s + k) * Math.exp(-s / ds[k]); b[i] = (v / 6 + .5 * noise() * Math.exp(-s / .04)) * Math.min(1, i / 40);}
  place(norm(run(b, bq('hp', 2000), bq('lp', 6500)), vel), t, -.34, 'drums', GAIN.tamb, 'tamb');
}
function clap(t, vel) {
  for (const side of [-1, 1]) {
    const n = Math.round(.22 * RATE), b = new Float64Array(n), bursts = [0, .008, .016, .025].map(x => x + rnd() * .002);
    for (let i = 0; i < n; i++) {const s = i / RATE; let e = 0; for (const bt of bursts) if (s >= bt) e = Math.max(e, Math.exp(-(s - bt) / .0035)); if (s >= bursts[3]) e = Math.max(e, .55 * Math.exp(-(s - bursts[3]) / .06)); b[i] = noise() * e * Math.min(1, i / 16);}
    place(norm(run(b, bq('bp', 1300 + side * 150, .8), bq('lp', 5000)), vel * (.85 + .3 * rnd())), t + side * .005 + J(.002), side * .18, 'drums', GAIN.clap, 'clap');
  }
}
function wood(t, hi, vel, pan) { // hollow clip-clop of the hayride horse
  const f = (hi ? 1050 : 760) * (1 + gauss() * .015), n = Math.round(.09 * RATE), b = new Float64Array(n);
  for (let i = 0; i < n; i++) {const s = i / RATE; b[i] = (Math.sin(2 * Math.PI * f * s) * Math.exp(-s / .018) + .45 * Math.sin(2 * Math.PI * f * 2.6 * s) * Math.exp(-s / .008) + .3 * noise() * Math.exp(-s / .0015)) * Math.min(1, i / 16);}
  place(norm(run(b, bq('hp', 300), bq('lp', 5000)), vel), t, pan, 'drums', GAIN.wood, 'wood');
}

// ---------------------------------------------------------------- voicings
function tonesIn(ch, lo, hi) {const r = []; for (let m = lo; m <= hi; m++) if (ch.tones.includes(m % 12)) r.push(m); return r;}
function nearestPc(pcs, target) {let best = null; for (let m = target - 12; m <= target + 12; m++) if (pcs.includes(pcOf(m)) && (best === null || Math.abs(m - target) < Math.abs(best - target))) best = m; return best;}
function voiceLead(prev, ch, lo, hi, k) {
  const t = tonesIn(ch, lo, hi); let best = null, bc = 1e9;
  for (let i = 0; i + k <= t.length; i++) {
    const c = t.slice(i, i + k);
    let cost = prev ? c.reduce((s, m, j) => s + Math.abs(m - prev[j]), 0) : Math.abs(c.reduce((a, b) => a + b, 0) / k - (lo + hi) / 2);
    if (!c.some(m => m % 12 === ch.third)) cost += 7;
    for (let j = 1; j < c.length; j++) if (c[j] - c[j - 1] <= 2) cost += c[j - 1] < 60 ? 12 : 6; // no rubbing seconds (G-A in A7), least of all low down
    if (cost < bc) {bc = cost; best = c;}
  }
  return best;
}
// Chord shape for guitar and mandolin strums: chord tones upward from lo, never a 7th at the bottom and never two tones a
// second apart (the root just above a 7th is left out; the bass has it), so A7 is A C# E G instead of G A C# E and the
// mandolin's B7 is F# A D# F#.
function strumVoicing(ch, lo, k) {
  const sev = pcOf(ch.root + 10), out = [];
  for (let m = lo; out.length < k && m < lo + 30; m++) {
    if (!ch.tones.includes(pcOf(m)) || (!out.length && pcOf(m) === sev && ch.tones.length > 3)) continue;
    if (out.length && m - out.at(-1) <= 2) continue;
    out.push(m);
  }
  return out;
}
function rollVoicing(ch, drone) {
  const rf = [ch.root, pcOf(ch.root + 7)], low = nearestPc(rf, 62), mid = nearestPc([ch.third], 68);
  let high = nearestPc(rf, 74); if (high <= mid) high += 12;
  const ok = ch.tones.includes(pcOf(drone)) || pcOf(drone) === pcOf(ch.root + 2);
  return [low, mid, high, ok ? drone : nearestPc(ch.tones, drone)];
}
const ROLL = [0, 1, 2, 3, 1, 2, 0, 2]; // forward roll: thumb, index, middle, thumb on the drone string...
const ROLL_RING = ROLL.map((v, k) => {for (let d = 1; d <= 8; d++) if (ROLL[(k + d) % 8] === v) return d; return 8;}); // eighths until that string is picked again

// ---------------------------------------------------------------- bass: two-beat with walks into the next chord
function bassRoot(pc) {let m = 36 + pc; while (m < 40) m += 12; return m;}
// Walking notes for one bar from root r to the next bar's root t, using the key's scale bent to fit the chord.
function walk(r, ch, t, scale) {
  if (t === r) {const below = []; for (let x = r - 1; below.length < 2; x--) if (scale.includes(pcOf(x))) below.push(x); return [[r, 1], [r - 5, 1], [below[1], 1], [below[0], 1]];}
  const dir = Math.sign(t - r), between = [];
  for (let x = r + dir; x !== t; x += dir) if (scale.includes(pcOf(x))) between.push(x);
  if (between.length >= 3) return [[r, 1], ...between.slice(-3).map(x => [x, 1])];
  if (between.length === 2) return [[r, 2], [between[0], 1], [between[1], 1]];
  const up = []; for (let x = r + 1; up.length < 2; x++) if (ch.tones.includes(pcOf(x))) up.push(x); // the next two chord tones above the bass
  let appr = between.length ? between[0] : t - dir; if (appr === up[0]) appr = t - 1;
  if (scale.includes(pcOf(appr))) return [[r, 1], [up[1], 1], [up[0], 1], [appr, 1]];
  // The half-step approach would be out of key and rub against the chord (F under D/F#, A# under Am, G under E/G#):
  // arpeggiate up instead and step into the target from the scale tone on that side (D/F# -> Em: F# A D F# | E).
  let near = t; do near += up[1] > t ? 1 : -1; while (!scale.includes(pcOf(near)));
  return [[r, 1], [up[0], 1], [up[1], 1], [near, 1]];
}
function walkScale(kp, ch, next) { // chromatic chord tones (the D# of B7) replace the scale note below them; V-I also borrows the next third
  const sc = scaleOf(kp), bend = t => {if (sc.includes(t)) return; const i = sc.indexOf(pcOf(t - 1)); if (i >= 0) sc[i] = t; else {const j = sc.indexOf(pcOf(t + 1)); if (j >= 0) sc[j] = t;}};
  ch.tones.forEach(bend); if (pcOf(next.root - ch.root) === 5 && !next.minor) bend(next.third);
  return sc;
}
function bassFifth(r, ch) {const f = r + pcOf(ch.root + 7 - r); return f > 52 ? f - 12 : f;}

// ---------------------------------------------------------------- the band, section by section
const on = (flag, bar) => !flag ? false : Array.isArray(flag) ? flag.includes(bar) : true;
const CHECK = [];
function addParts(si) {
  const S = SECTIONS[si], kp = keyPc(S), scale = scaleOf(kp);
  for (const part of S.parts) {
    let ns = parseLine(part.line).map(n => ({...n, m: n.m + S.tr}));
    if (part.harm) ns = ns.map(n => {
      const ch = chordAt8(si * 64 + n.p);
      if (ch.tones.includes(pcOf(n.m))) {for (const iv of [3, 4, 8, 9, 5]) if (ch.tones.includes(pcOf(n.m - iv))) return {...n, m: n.m - iv};}
      let x = n.m, k = 0; while (k < 2) {x--; if (scale.includes(pcOf(x))) k++;} return {...n, m: x};
    });
    for (const n of ns) { // chord-tone check: strong beats must be chord tones, the "and"s may pass
      const gp = si * 64 + n.p, ch = chordAt8(gp), pos = pcMod(gp, 8), strength = pos % 4 === 0 ? 'strong' : pos % 2 === 0 ? 'medium' : 'weak';
      if (!ch.tones.includes(pcOf(n.m)) && strength !== 'weak') CHECK.push(`${S.name} / ${part.v}: midi ${n.m} at bar ${Math.floor(n.p / 8) + 1} eighth ${pos} (${strength}) over ${ch.name}`);
    }
    const def = VOICE[part.v];
    for (const n of ns) {
      const gp = si * 64 + n.p, t0 = beatTime(gp / 2), t1 = beatTime((gp + n.len) / 2), pos = pcMod(n.p, 8);
      const vel = (pos === 0 ? 1.06 : pos % 2 === 0 ? 1 : .86) * V(.05);
      if (def.kind) (NOTES[part.v] ??= []).push({t: t0 + J(.005), d: (t1 - t0) * KIND[def.kind].legato, m: n.m, v: vel});
      else if (def.pluck) place(pluck('banjo', n.m, {ring: (t1 - t0) * .95 + .06, vel}), t0 + J(.004), def.pan, def.grp, def.gain, part.v);
      else if (def.mallet) place(mallet(def.mallet, n.m, vel), t0 + J(.004), def.pan, def.grp, def.gain, part.v);
      else if (def.trem) tremNote(n.m, t0 + J(.004), (t1 - t0) * .97, vel, def.pan, def.grp, def.gain, part.v);
    }
  }
}
function woodPan(si, bar) { // the horse trots past: left to right across tag + intro, back again in the breakdown
  if (si === SECTIONS.length - 1) return -.4 + .75 * (bar - 4) / 12;
  if (si === 0) return -.4 + .75 * (bar + 4) / 12;
  return .35 - .7 * bar / 8;
}
function groove(si) {
  const S = SECTIONS[si], g = S.g, kp = keyPc(S), drone = nearestPc([pcOf(kp + 7)], 70);
  for (let bar = 0; bar < 8; bar++) {
    const gb = si * 8 + bar, b0 = gb * 4, e = S.E * (S.build ? .74 + .26 * bar / 7 : 1), chAt = beat => HALF[gb * 2 + (beat >= 2 ? 1 : 0)];
    // drums
    if (g.kick) {kick(T(b0, .003), .95 * e * (g.kick === 1 || g.kick === 'one' ? 1 : g.kick)); if (g.kick !== 'one') kick(T(b0 + 2, .003), .78 * e * (g.kick === 1 ? 1 : g.kick));}
    if (g.brush === 1) {brushTap(T(b0 + 1), .85 * e * V()); brushTap(T(b0 + 3), .85 * e * V()); brushTap(T(b0 + 1.5), .2 * e * V()); brushTap(T(b0 + 3.5), .3 * e * V());}
    if (g.brush) {swish(T(b0), 2 * BEAT, .8 * e); swish(T(b0 + 2), 2 * BEAT, .8 * e);}
    if (on(g.fill, bar)) for (const [x, v] of [[2.5, .35], [3, .6], [3.25, .45], [3.5, .75], [3.75, .6]]) brushTap(T(b0 + x), v * e);
    if (g.shaker) for (let k = 0; k < 8; k++) shaker(T(b0 + k / 2), (k % 2 ? .95 : .6) * e * g.shaker * V());
    if (g.tamb === '24') {tamb(T(b0 + 1), .9 * e * V()); tamb(T(b0 + 3), .9 * e * V());}
    if (g.tamb === '8') for (let k = 0; k < 8; k++) tamb(T(b0 + k / 2), (k === 2 || k === 6 ? .95 : k % 2 ? .5 : .36) * e * V());
    if (g.clap) {clap(T(b0 + 1), .9 * e); clap(T(b0 + 3), .9 * e);}
    if (on(g.wood === 'all' ? 1 : g.wood, bar)) for (let k = 0; k < 4; k++) {const pan = woodPan(si, bar + k / 4); wood(T(b0 + k, .006), 1, .62 * V(.1), pan); wood(T(b0 + k + .5, .006), 0, .5 * V(.1), pan);}
    // banjo roll
    if (g.roll === 'all' || g.roll === 'light' || on(g.roll, bar)) for (let k = 0; k < 8; k++) {
      const v = rollVoicing(chAt(k / 2), drone), m = v[ROLL[k]];
      const vel = (k % 2 ? .74 : 1) * (k === 0 ? 1.08 : 1) * e * (g.roll === 'light' ? .62 : 1) * V();
      place(pluck('banjo', m, {ring: Math.min(1.1, ROLL_RING[k] * BEAT / 2) * (.9 + .1 * rnd()), vel}), T(b0 + k / 2), -.3, 'plucks', GAIN.roll, 'roll');
    }
    // guitar: chick on 2 and 4 (and a light up-strum on their off-beats when busy)
    if (g.guitar) for (const b of [1, 3]) {
      const v = strumVoicing(chAt(b), 55, 4);
      strum('guitar', v, T(b0 + b), 1, .9 * e, .16, 'guitar', -.38);
      if (g.guitar === 'busy') strum('guitar', v.slice(1), T(b0 + b + .5), -1, .45 * e, .1, 'guitar', -.38);
    }
    if (g.chop) for (const b of [1, 3]) strum('mandolin', strumVoicing(chAt(b), 64, 4), T(b0 + b), 1, .85 * e, .05, 'chop', .32, .55);
    if (g.uke) for (const [x, dir, v] of [[0, 1, .75], [1.5, -1, .5], [2, 1, .65], [3, 1, .55], [3.5, -1, .5]]) strum('uke', tonesIn(chAt(x), 60, 72).slice(-4), T(b0 + x), dir, v * e, .22, 'uke', -.24);
    if (g.pizz) for (let b = 0; b < 4; b++) {const t = tonesIn(chAt(b), 50, 66); place(pluck('pizz', t[[0, 2, 1, 2][b] % t.length], {ring: .28, vel: (b % 2 ? .8 : 1) * e * V()}), T(b0 + b), .2, 'plucks', GAIN.pizz, 'pizz');}
  }
  // sustained parts: pads and the mandolin tremolo pad, one chord per half bar, merged when the chord repeats
  for (const [flag, kind] of [[g.pad, g.pad], [g.tremPad, 'tremPad']]) {
    if (!flag) continue;
    let prev = null, h = 0;
    while (h < 16) {
      const gh = si * 16 + h; let end = h + 1; while (end < 16 && HALF[si * 16 + end].name === HALF[gh].name) end++;
      const ch = HALF[gh], tb = beatTime(gh * 2), dur = beatTime((si * 16 + end) * 2) - tb, e = S.E * (S.build ? .74 + .26 * h / 15 : 1);
      if (kind === 'tremPad') {const v = voiceLead(prev, ch, 64, 78, 2); prev = v; v.forEach(m => tremNote(m, tb + J(), dur - .03, .8 * e, .3, 'accomp', GAIN.tremPad, 'tremPad'));}
      else {
        const strings = kind === 'strings', v = voiceLead(prev, ch, strings ? 52 : 57, strings ? 74 : 71, strings ? 4 : 3); prev = v;
        v.forEach((m, i) => pad(kind, m, tb + J(), dur - .02, .9 * e * (g.padVel ?? 1), strings ? -.3 + .6 * i / (v.length - 1) : -.15, kind));
      }
      h = end;
    }
  }
  // bass
  for (let bar = 0; bar < 8; bar++) {
    const gb = si * 8 + bar, b0 = gb * 4, h1 = HALF[gb * 2], h2 = HALF[gb * 2 + 1], next = HALF[(gb * 2 + 2) % HALF.length], e = S.E;
    const r1 = bassRoot(h1.bass), target = bassRoot(next.bass), nextKey = keyPc(SECTIONS[Math.floor(((gb + 1) % BARS) / 8)]); let line;
    const wsc = walkScale(bar === 7 ? nextKey : kp, h2, next);
    const walkBar = g.bass === 'walk' || (g.bass === '2beat' && (bar === 3 || bar === 7 || (g.walkBars ?? []).includes(bar)));
    if (h1.name !== h2.name) {const r2 = bassRoot(h2.bass); line = g.bass === 'walk' ? [[r1, 1], [bassFifth(r1, h1), 1], [r2, 1], [walk(r2, h2, target, wsc).at(-1)[0], 1]] : [[r1, 2], [r2, 2]];}
    else if (g.bass === 'half') line = [[r1, 3], [bassFifth(r1, h1), 1]];
    else if (walkBar) line = walk(r1, h1, target, wsc);
    else line = [[r1, 2], [bassFifth(r1, h1), 2]];
    let b = 0;
    for (const [m, len] of line) {
      const t = T(b0 + b, .003), dur = beatTime(b0 + b + len) - beatTime(b0 + b);
      place(pluck('bass', m, {ring: dur * (len >= 2 ? .98 : .93), vel: (b === 0 ? 1 : b === 2 ? .88 : .8) * (.8 + .2 * e) * V(.05)}), t, 0, 'bass', GAIN.bass, 'bass');
      b += len;
    }
  }
}

console.log(`Hayride Hop: ${BARS} bars, ${(COUNT / RATE).toFixed(1)} s, ${COUNT} frames`);
for (let si = 0; si < SECTIONS.length; si++) {addParts(si); groove(si);}
for (const id of Object.keys(NOTES)) renderVoice(id);
console.log(`notes rendered in ${((Date.now() - STARTED) / 1000).toFixed(1)} s`);
if (CHECK.length) console.log('chord-tone check:\n  ' + CHECK.join('\n  ')); else console.log('chord-tone check: every strong and medium melody note is a chord tone');

// ---------------------------------------------------------------- mix
function activeRms(L, R) {
  const W = 1600, pw = []; let mx = 0;
  for (let i = 0; i + W <= COUNT; i += W) {let e = 0; for (let j = i; j < i + W; j++) e += L[j] * L[j] + R[j] * R[j]; e /= 2 * W; pw.push(e); mx = Math.max(mx, e);}
  let s = 0, n = 0; for (const e of pw) if (e > mx * .01) {s += e; n++;} return Math.sqrt(s / Math.max(1, n));
}
const groupGain = {}, groupRms = {}, secA = {}; let MARGIN = [];
for (const gname of GROUPS) { // balance by A-weighted level (closer to what a listener hears than plain RMS)
  const m = new Float64Array(COUNT), {L: gl, R: gr} = BUS[gname]; for (let i = 0; i < COUNT; i++) m[i] = (gl[i] + gr[i]) * .5;
  const aw = AW(m); groupRms[gname] = activeRms(aw, aw); groupGain[gname] = 10 ** (TARGET_DB[gname] / 20) / groupRms[gname];
  const SECL = COUNT / SECTIONS.length; secA[gname] = SECTIONS.map((_, s) => {let e = 0; for (let i = s * SECL; i < (s + 1) * SECL; i++) e += aw[i] * aw[i]; return Math.sqrt(e / SECL);});
  if (gname === 'bass') groupGain.bass = 10 ** (TARGET_DB.bass / 20) * activeRms(BUS.lead.L, BUS.lead.R) * groupGain.lead / activeRms(BUS.bass.L, BUS.bass.R);
}
{ // per-section level of each group, after balancing (dB vs the loudest cell), to see who carries each section
  const SECL = COUNT / SECTIONS.length, rows = SECTIONS.map((S, s) => {const row = {section: S.name.slice(0, 34)}; for (const g of GROUPS) {const {L: gl, R: gr} = BUS[g]; let e = 0; for (let i = s * SECL; i < (s + 1) * SECL; i++) e += gl[i] * gl[i] + gr[i] * gr[i]; row[g] = Math.sqrt(e / (2 * SECL)) * groupGain[g];} return row;});
  const mx = Math.max(...rows.flatMap(r => GROUPS.map(g => r[g]))); for (const r of rows) for (const g of GROUPS) r[g] = +(20 * Math.log10(r[g] / mx)).toFixed(1);
  console.table(rows);
  // the same, A-weighted, plus how far the tune stands above everything else together (the melody margin)
  const arows = SECTIONS.map((S, s) => {const row = {section: S.name.slice(0, 34)}; let rest = 0; for (const g of GROUPS) {const v = secA[g][s] * groupGain[g]; row[g] = +(20 * Math.log10(v + 1e-9)).toFixed(1); if (g !== 'lead') rest += v * v;} row.margin = +(20 * Math.log10(secA.lead[s] * groupGain.lead / Math.sqrt(rest))).toFixed(1); return row;});
  console.log('A-weighted section levels (dB) and melody margin:'); console.table(arows); MARGIN = arows.map(r => r.margin);
}
const L = new Float64Array(COUNT), R = new Float64Array(COUNT), send = new Float64Array(COUNT);
for (const gname of GROUPS) {
  const {L: gl, R: gr} = BUS[gname], k = groupGain[gname], sd = SEND[gname] * k * .5;
  for (let i = 0; i < COUNT; i++) {L[i] += gl[i] * k; R[i] += gr[i] * k; send[i] += (gl[i] + gr[i]) * sd;}
  BUS[gname] = null;
}
// Room: a few early reflections plus a Freeverb-style tail (8 damped combs + 4 allpasses per side), run over [loop, loop].
function reverb(inp) {
  const sc = RATE / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225], fb = .84, damp = .35, pre = Math.round(.018 * RATE);
  const outs = [];
  for (const off of [0, 23]) {
    const cb = combs.map(d => new Float64Array(Math.round((d + off) * sc))), ci = new Int32Array(8), st = new Float64Array(8);
    const ab = aps.map(d => new Float64Array(Math.round((d + off) * sc))), ai = new Int32Array(4), out = new Float64Array(COUNT);
    for (let pass = 0; pass < 2; pass++) for (let n = 0; n < COUNT; n++) {
      let j = n - pre; if (j < 0) j += COUNT; const x = inp[j]; let s = 0;
      for (let c = 0; c < 8; c++) {const b = cb[c], o = b[ci[c]]; st[c] = o * (1 - damp) + st[c] * damp; b[ci[c]] = x + st[c] * fb; if (++ci[c] === b.length) ci[c] = 0; s += o;}
      for (let c = 0; c < 4; c++) {const b = ab[c], bo = b[ai[c]], y = bo - s; b[ai[c]] = s + bo * .5; if (++ai[c] === b.length) ai[c] = 0; s = y;}
      if (pass) out[n] = s;
    }
    outs.push(out);
  }
  const er = [[7, .5, 0], [13, .42, 1], [19, .36, 0], [27, .3, 1], [34, .24, 0], [43, .18, 1]];
  for (const [ms, gn, side] of er) {const d = Math.round(ms / 1000 * RATE), o = outs[side]; for (let i = 0; i < COUNT; i++) o[(i + d) % COUNT] += inp[i] * gn * 1.2;}
  return outs;
}
const rmsOf = (...xs) => {let e = 0, n = 0; for (const x of xs) {for (let i = 0; i < x.length; i++) e += x[i] * x[i]; n += x.length;} return Math.sqrt(e / n);};
const [wl, wr] = reverb(send), wetK = WET * rmsOf(L, R) / rmsOf(wl, wr);
for (let i = 0; i < COUNT; i++) {L[i] += wl[i] * wetK; R[i] += wr[i] * wetK;}
console.log(`mixed + reverb in ${((Date.now() - STARTED) / 1000).toFixed(1)} s`);
// Master tone: no rumble, nothing piercing on top.
for (const ch of [L, R]) runLoop(ch, bq('hp', 32), bq('lp', 7600), bq('hs', 5000, .7071, -2.5));
// Gentle section leveller: pulls quiet and loud sections partly together, with one-beat crossfades that wrap round the loop.
const SEC = COUNT / SECTIONS.length, secRms = s => {let e = 0; for (let i = s * SEC; i < (s + 1) * SEC; i++) e += L[i] * L[i] + R[i] * R[i]; return Math.sqrt(e / (2 * SEC));};
const raw = SECTIONS.map((_, s) => secRms(s)), geo = Math.exp(raw.reduce((a, b) => a + Math.log(b), 0) / raw.length), sg = raw.map(r => (geo / r) ** LEVEL_EXP);
const half = Math.round(BEAT * RATE / 2);
for (let i = 0; i < COUNT; i++) {
  const s = Math.floor(i / SEC), into = i - s * SEC; let gn = sg[s];
  if (into < half) {const w = .5 + .5 * (into / half); const p = sg[(s + SECTIONS.length - 1) % SECTIONS.length]; gn = p + (gn - p) * (.5 - .5 * Math.cos(Math.PI * w));}
  else if (into >= SEC - half) {const w = .5 * ((into - (SEC - half)) / half); const nx = sg[(s + 1) % SECTIONS.length]; gn = gn + (nx - gn) * (.5 - .5 * Math.cos(Math.PI * w));}
  L[i] *= gn; R[i] *= gn;
}
// Level and a soft (tanh) limiter above the knee.
const lim = x => {const a = Math.abs(x); return a <= KNEE ? x : Math.sign(x) * (KNEE + (CEIL - KNEE) * Math.tanh((a - KNEE) / (CEIL - KNEE)));};
let scale = RMS_TARGET / rmsOf(L, R);
for (let it = 0; it < 6; it++) {let e = 0; for (let i = 0; i < COUNT; i++) {const a = lim(L[i] * scale), b = lim(R[i] * scale); e += a * a + b * b;} scale *= RMS_TARGET / Math.sqrt(e / (2 * COUNT));}
let nan = 0, limited = 0;
for (let i = 0; i < COUNT; i++) {for (const ch of [L, R]) {const x = ch[i] * scale; if (!Number.isFinite(x)) nan++; if (Math.abs(x) > KNEE) limited++; ch[i] = Number.isFinite(x) ? lim(x) : 0;}}

// ---------------------------------------------------------------- write
const pcm = Buffer.alloc(44 + COUNT * 4), dith = mulberry(77);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + COUNT * 4, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22);
pcm.writeUInt32LE(RATE, 24); pcm.writeUInt32LE(RATE * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(COUNT * 4, 40);
const outL = new Int16Array(COUNT), outR = new Int16Array(COUNT); let clipped = 0;
for (let i = 0; i < COUNT; i++) for (const [src, dst, o] of [[L, outL, 0], [R, outR, 2]]) {
  let v = Math.round(src[i] * 32767 + (dith() - dith())); if (v > 32767 || v < -32768) clipped++; v = clamp(v, -32768, 32767); dst[i] = v; pcm.writeInt16LE(v, 44 + i * 4 + o);
}
writeFileSync(join(DIR, `${SLUG}.wav`), pcm);

// ---------------------------------------------------------------- metrics
const fl = Float64Array.from(outL, v => v / 32768), fr = Float64Array.from(outR, v => v / 32768);
let peak = 0; for (let i = 0; i < COUNT; i++) peak = Math.max(peak, Math.abs(fl[i]), Math.abs(fr[i]));
function steps(x) {const d = new Float64Array(COUNT - 1); for (let i = 1; i < COUNT; i++) d[i - 1] = Math.abs(x[i] - x[i - 1]); const s = Float64Array.from(d).sort(); let m = 0; for (const v of d) m += v; return {mean: m / d.length, median: s[s.length >> 1], p95: s[Math.floor(s.length * .95)], max: s[s.length - 1], sorted: s};}
const seam = {};
for (const [name, x] of [['left', fl], ['right', fr]]) {
  const st = steps(x), sv = Math.abs(x[0] - x[COUNT - 1]); let lo = 0, hi = st.sorted.length; while (lo < hi) {const mid = (lo + hi) >> 1; if (st.sorted[mid] < sv) lo = mid + 1; else hi = mid;}
  seam[name] = {seam_step: +sv.toFixed(6), mean_step: +st.mean.toFixed(6), median_step: +st.median.toFixed(6), p95_step: +st.p95.toFixed(6), max_step: +st.max.toFixed(6), seam_percentile: +(100 * lo / st.sorted.length).toFixed(1)};
}
let quiet = 1, quietAt = 0; for (let i = 0; i + 1600 <= COUNT; i += 1600) {let e = 0; for (let j = i; j < i + 1600; j++) e += fl[j] * fl[j] + fr[j] * fr[j]; const r = Math.sqrt(e / 3200); if (r < quiet) {quiet = r; quietAt = i / RATE;}}
const qw = []; for (let i = 0; i + 1600 <= COUNT; i += 1600) {let e = 0; for (let j = i; j < i + 1600; j++) e += fl[j] * fl[j] + fr[j] * fr[j]; qw.push([Math.sqrt(e / 3200), i / RATE]);}
qw.sort((a, b) => a[0] - b[0]); console.log('quietest 50 ms windows:', qw.slice(0, 12).map(([r, t]) => `${t.toFixed(2)}s:${r.toFixed(4)}`).join(' '));
const sections = SECTIONS.map((S, s) => {let e = 0; for (let i = s * SEC; i < (s + 1) * SEC; i++) e += fl[i] * fl[i] + fr[i] * fr[i]; return {section: s + 1, name: S.name, start_s: +(s * SEC / RATE).toFixed(1), rms: +Math.sqrt(e / (2 * SEC)).toFixed(4)};});
const secMax = Math.max(...sections.map(s => s.rms)), secMin = Math.min(...sections.map(s => s.rms));
const hiL = Float64Array.from(fl), hiR = Float64Array.from(fr); const hp6 = [bq('hp', 6000, .5412), bq('hp', 6000, 1.3066)]; run(hiL, ...hp6); run(hiR, ...hp6);
const share6k = (rmsOf(hiL, hiR) / rmsOf(fl, fr)) ** 2;
const stats = Object.fromEntries(Object.entries(STATS).sort((a, b) => b[1].e - a[1].e).map(([k, s]) => [k, {group: s.grp, notes: s.notes, active_rms: +Math.sqrt(s.e / s.n * groupGain[s.grp] ** 2).toFixed(4), active_rms_a_weighted: +Math.sqrt(s.ea / s.n * groupGain[s.grp] ** 2).toFixed(4)}]));
const metrics = {
  title: 'Hayride Hop', slug: SLUG, duration_seconds: COUNT / RATE, bars: BARS, bpm: BPM, swing: SWING, key: 'D major (bridge in G / E minor, key lift to E for two hook returns)',
  sample_rate: RATE, channels: 2, frames: COUNT, rms: +rmsOf(fl, fr).toFixed(4), rms_left: +rmsOf(fl).toFixed(4), rms_right: +rmsOf(fr).toFixed(4), peak: +peak.toFixed(4),
  nan_samples: nan, clipped_samples: clipped, samples_over_limiter_knee: limited, seam, quietest_50ms_rms: +quiet.toFixed(4), quietest_50ms_at_s: +quietAt.toFixed(2),
  section_rms: sections, section_rms_ratio_min_over_max: +(secMin / secMax).toFixed(3), share_energy_above_6khz: +share6k.toFixed(5),
  group_gain: Object.fromEntries(GROUPS.map(g => [g, +groupGain[g].toFixed(3)])), section_leveller_gain: sg.map(x => +x.toFixed(3)), melody_margin_db_a_weighted: MARGIN, instrument_stats: stats,
  render_seconds: (Date.now() - STARTED) / 1000,
};
writeFileSync(join(DIR, `${SLUG}.json`), JSON.stringify(metrics, null, 2) + '\n');
const {instrument_stats, section_rms, ...brief} = metrics;
console.log(JSON.stringify(brief, null, 1));
console.table(sections.map(s => ({name: s.name.slice(0, 50), start: s.start_s, rms: s.rms})));
console.table(Object.entries(instrument_stats).map(([k, v]) => ({k, ...v})));
