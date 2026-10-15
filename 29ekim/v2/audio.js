// Original score for "Sıfırdan v2", synthesised with the Web Audio API (no samples, no recordings).
// Re majör, 120 BPM (one bar = 2 s). Motif: Re – La – Si – La. Everything sits on the film's timeline.
import { T, DURATION } from './timeline.js';
import { rng, ease, clamp } from '../src/util.js';

const SR = 48000;
const world_t = n => ({ Kayseri: T.rail + 0.1, Sivas: T.rail + 1.0, Erzurum: T.vote })[n];
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const N = { D1: 26, A1: 33, D2: 38, E2: 40, Fs2: 42, G2: 43, A2: 45, B2: 47, Cs3: 49, D3: 50, E3: 52, F3: 53, Fs3: 54, G3: 55, A3: 57, B3: 59, Cs4: 61,
  D4: 62, E4: 64, Fs4: 66, G4: 67, A4: 69, B4: 71, Cs5: 73, D5: 74, E5: 76, Fs5: 78, A5: 81, B5: 83, D6: 86 };

export async function renderMusic() {
  const ctx = new OfflineAudioContext(2, Math.round(SR * DURATION), SR);
  const rand = rng(1923);
  // ---- buses
  const master = ctx.createGain(); master.gain.value = 0.9;
  master.gain.setValueAtTime(0.9, 0); master.gain.setValueAtTime(0.9, DURATION - 0.25); master.gain.linearRampToValueAtTime(0.0001, DURATION);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3.5; comp.attack.value = 0.008; comp.release.value = 0.25;
  master.connect(comp); comp.connect(ctx.destination);
  const verb = ctx.createConvolver(); verb.buffer = impulse(3.4); verb.normalize = true;
  const verbOut = ctx.createGain(); verbOut.gain.value = 0.5; verb.connect(verbOut); verbOut.connect(master);
  const bus = (wet = 0.3, pan = 0) => {
    const g = ctx.createGain(), p = ctx.createStereoPanner(); p.pan.value = pan;
    const w = ctx.createGain(); w.gain.value = wet;
    g.connect(p); p.connect(master); g.connect(w); w.connect(verb); return g;
  };
  function impulse(sec) {
    const len = Math.round(SR * sec), b = ctx.createBuffer(2, len, SR);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) { const x = i / len; d[i] = (rand() * 2 - 1) * Math.pow(1 - x, 2.6) * (i < SR * 0.012 ? i / (SR * 0.012) : 1); } }
    return b;
  }
  const noise = ctx.createBuffer(1, SR * 3, SR);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rand() * 2 - 1; }
  const noiseSrc = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, rand() * 2); s.stop(t + dur); return s; };
  const env = (g, t, a, peak, d, floor = 0.0001) => { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(floor, t + a + d); };

  // ---- instruments
  function tick(t, g = 0.5, pitch = 1, out = tickBus) {
    const n = noiseSrc(t, 0.08), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200 * pitch; bp.Q.value = 3;
    const ga = ctx.createGain(); env(ga, t, 0.001, g, 0.035); n.connect(bp); bp.connect(ga); ga.connect(out);
    const o = ctx.createOscillator(); o.frequency.value = 1500 * pitch; const gb = ctx.createGain(); env(gb, t, 0.001, g * 0.35, 0.03);
    o.connect(gb); gb.connect(out); o.start(t); o.stop(t + 0.06);
  }
  function key(t, g = 0.12) {
    const n = noiseSrc(t, 0.05), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
    const ga = ctx.createGain(); env(ga, t, 0.001, g, 0.018); n.connect(hp); hp.connect(ga); ga.connect(tickBus);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 180; const gb = ctx.createGain(); env(gb, t, 0.001, g * 0.6, 0.04);
    o.connect(gb); gb.connect(tickBus); o.start(t); o.stop(t + 0.08);
  }
  function drum(t, g = 0.8, f0 = 110, f1 = 42, dur = 1.3) {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.14);
    const ga = ctx.createGain(); env(ga, t, 0.004, g, dur); o.connect(ga); ga.connect(drumBus); o.start(t); o.stop(t + dur + 0.1);
    const n = noiseSrc(t, 0.2), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    const gn = ctx.createGain(); env(gn, t, 0.002, g * 0.35, 0.09); n.connect(lp); lp.connect(gn); gn.connect(drumBus);
  }
  function pad(notes, t0, t1, g = 0.06, cut = 1400, attack = 1.2, release = 1.6) {
    notes.forEach((m, i) => {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = cut; lp.Q.value = 0.5;
      const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t0); ga.gain.linearRampToValueAtTime(g, t0 + attack);
      ga.gain.setValueAtTime(g, Math.max(t0 + attack, t1 - 0.01)); ga.gain.exponentialRampToValueAtTime(0.0001, t1 + release);
      lp.connect(ga); ga.connect(i % 2 ? padR : padL);
      for (const det of [-8, 0, 7]) {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det + (rand() - 0.5) * 3;
        const og = ctx.createGain(); og.gain.value = 0.33; o.connect(og); og.connect(lp); o.start(t0); o.stop(t1 + release + 0.1);
      }
    });
  }
  function pluck(t, m, g = 0.12) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(2400, t); lp.frequency.exponentialRampToValueAtTime(260, t + 0.22); lp.Q.value = 2;
    const ga = ctx.createGain(); env(ga, t, 0.003, g, 0.32); o.connect(lp); lp.connect(ga); ga.connect(pluckBus); o.start(t); o.stop(t + 0.4);
  }
  function brass(t, dur, m, g = 0.13) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.12); lp.frequency.linearRampToValueAtTime(1700, t + 0.6);
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t); ga.gain.linearRampToValueAtTime(g, t + 0.07);
    ga.gain.setValueAtTime(g * 0.85, t + dur - 0.05); ga.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
    lp.connect(ga); ga.connect(brassBus);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5.2; const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(6, t + 0.5);
    lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.4);
    for (const det of [-5, 5]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = det; lg.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.4);
    }
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = hz(m - 12); const g2 = ctx.createGain(); g2.gain.value = 0.25; o2.connect(g2); g2.connect(lp); o2.start(t); o2.stop(t + dur + 0.4);
  }
  function piano(t, m, g = 0.1, dur = 2.6) {
    [[1, 1, 1], [2, 0.42, 0.7], [3, 0.16, 0.5], [4, 0.08, 0.35]].forEach(([k, a, dk]) => {
      const o = ctx.createOscillator(); o.frequency.value = hz(m) * k * (1 + (k - 1) * 0.0007);
      const ga = ctx.createGain(); env(ga, t, 0.004, g * a, dur * dk); o.connect(ga); ga.connect(pianoBus); o.start(t); o.stop(t + dur + 0.2);
    });
  }
  function bell(t, m, g = 0.05) {
    [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.25, 0.4], [8.93, 0.12, 0.25]].forEach(([k, a, dk]) => {
      const o = ctx.createOscillator(); o.frequency.value = hz(m) * k;
      const ga = ctx.createGain(); env(ga, t, 0.002, g * a, 3.2 * dk); o.connect(ga); ga.connect(bellBus); o.start(t); o.stop(t + 3.5);
    });
  }
  function riser(t0, t1, g = 0.12, f0 = 300, f1 = 6000) {
    const n = noiseSrc(t0, t1 - t0 + 0.05), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(f0, t0); bp.frequency.exponentialRampToValueAtTime(f1, t1);
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t0); ga.gain.exponentialRampToValueAtTime(g, t1 - 0.02); ga.gain.linearRampToValueAtTime(0.0001, t1 + 0.03);
    n.connect(bp); bp.connect(ga); ga.connect(fxBus);
  }
  function cymbal(t, g = 0.18, dur = 3.0) {
    const n = noiseSrc(t, dur + 0.1), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 5200;
    const ga = ctx.createGain(); env(ga, t, 0.005, g, dur); n.connect(hp); hp.connect(ga); ga.connect(fxBus);
  }
  function crackle(t0, t1, count, g = 0.05) {
    for (let i = 0; i < count; i++) {
      const t = t0 + rand() * (t1 - t0);
      const n = noiseSrc(t, 0.03), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500 + rand() * 4000;
      const ga = ctx.createGain(); env(ga, t, 0.0005, g * (0.3 + rand() * 0.7), 0.012 + rand() * 0.02); n.connect(hp); hp.connect(ga); ga.connect(fxBus);
    }
  }
  function boom(t, g = 0.5) {
    drum(t, g, 75, 30, 1.6);
    const n = noiseSrc(t, 1.2), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700;
    const ga = ctx.createGain(); env(ga, t, 0.004, g * 0.5, 0.8); n.connect(lp); lp.connect(ga); ga.connect(fxBus);
    crackle(t + 0.25, t + 1.6, 26, g * 0.14);
  }
  function drone(t0, t1, g = 0.1) {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 240;
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t0); ga.gain.linearRampToValueAtTime(g, t0 + 3);
    ga.gain.setValueAtTime(g, t1 - 0.6); ga.gain.linearRampToValueAtTime(0.0001, t1);
    lp.connect(ga); ga.connect(droneBus);
    for (const [type, m, det, a] of [['sawtooth', N.D2, -4, 0.5], ['sawtooth', N.D2, 5, 0.5], ['sine', N.D1, 0, 0.9]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = hz(m); o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(lp); o.start(t0); o.stop(t1 + 0.1);
    }
  }

  function snare(t, g = 0.16) {
    const n = noiseSrc(t, 0.2), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2300; bp.Q.value = 0.8;
    const ga = ctx.createGain(); env(ga, t, 0.001, g, 0.11); n.connect(bp); bp.connect(ga); ga.connect(snareBus);
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(170, t + 0.05);
    const gb = ctx.createGain(); env(gb, t, 0.001, g * 0.5, 0.06); o.connect(gb); gb.connect(snareBus); o.start(t); o.stop(t + 0.12);
  }
  function whoosh(t, dur = 0.5, g = 0.08, f0 = 600, f1 = 3000) {
    const n = noiseSrc(t, dur + 0.1), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.5); bp.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dur);
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t); ga.gain.exponentialRampToValueAtTime(g, t + dur * 0.5); ga.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(bp); bp.connect(ga); ga.connect(fxBus);
  }
  function whistle(t, dur = 0.7, g = 0.05) {
    // a distant steam whistle: two detuned tones with breath
    for (const [m, a] of [[N.A5, 1], [N.Cs5 + 12, 0.7]]) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(hz(m) * 0.97, t); o.frequency.linearRampToValueAtTime(hz(m), t + 0.08);
      const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t); ga.gain.linearRampToValueAtTime(g * a, t + 0.06); ga.gain.setValueAtTime(g * a, t + dur - 0.1); ga.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
      o.connect(ga); ga.connect(fxBus); o.start(t); o.stop(t + dur + 0.3);
    }
    const n = noiseSrc(t, dur), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 2;
    const gn = ctx.createGain(); env(gn, t, 0.03, g * 0.4, dur); n.connect(bp); bp.connect(gn); gn.connect(fxBus);
  }
  function chug(t, g = 0.06) {
    const n = noiseSrc(t, 0.12), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.9;
    const ga = ctx.createGain(); env(ga, t, 0.004, g, 0.07); n.connect(bp); bp.connect(ga); ga.connect(fxBus);
  }
  function crowd(t0, t1, g = 0.05) {
    // a distant crowd: band-limited noise with slow swells and many small voices
    for (const [f, q, a] of [[520, 0.8, 1], [1100, 1.2, 0.6], [2300, 1.5, 0.25]]) {
      const n = noiseSrc(t0, t1 - t0), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
      const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t0); ga.gain.linearRampToValueAtTime(g * a, t0 + 1.5);
      for (let t = t0 + 1.5; t < t1 - 0.6; t += 0.37) ga.gain.linearRampToValueAtTime(g * a * (0.75 + 0.5 * rand()), t);
      ga.gain.linearRampToValueAtTime(0.0001, t1);
      n.connect(bp); bp.connect(ga); ga.connect(crowdBus);
    }
    for (let i = 0; i < 40; i++) {           // voices: short formant blips
      const t = t0 + 1 + rand() * (t1 - t0 - 1.5), o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 160 + rand() * 180;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700 + rand() * 900; bp.Q.value = 5;
      const ga = ctx.createGain(); env(ga, t, 0.04, g * 0.25 * rand(), 0.25 + rand() * 0.3); o.connect(bp); bp.connect(ga); ga.connect(crowdBus); o.start(t); o.stop(t + 0.7);
    }
  }
  function scratch(t0, t1, g = 0.02) {
    const n = noiseSrc(t0, t1 - t0), hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 5200; hp.Q.value = 0.7;
    const ga = ctx.createGain(); ga.gain.setValueAtTime(0.0001, t0);
    for (let t = t0 + 0.05; t < t1; t += 0.07) ga.gain.linearRampToValueAtTime(g * (0.2 + 0.8 * rand()), t);
    ga.gain.linearRampToValueAtTime(0.0001, t1);
    n.connect(hp); hp.connect(ga); ga.connect(fxBus);
  }

  const tickBus = bus(0.18, 0), drumBus = bus(0.22, 0), padL = bus(0.5, -0.35), padR = bus(0.5, 0.35), pluckBus = bus(0.25, 0.1),
    brassBus = bus(0.4, -0.05), pianoBus = bus(0.55, 0.1), bellBus = bus(0.7, 0), fxBus = bus(0.35, 0), droneBus = bus(0.15, 0),
    snareBus = bus(0.2, 0.15), crowdBus = bus(0.5, -0.1);

  // ---- PLAN 1 · 0–4 s: clock, keys, an open fifth with a minor shadow
  for (let i = 0; i < 4; i++) tick(0.0 + i, i % 2 ? 0.32 : 0.42, i % 2 ? 0.82 : 1);
  for (let i = 0; i < 10; i++) key(T.type0 + i * T.typeStep + 0.01, 0.1);
  drone(0, 8, 0.07);
  pad([N.D3, N.A3], 0.2, 4.0, 0.035, 700, 1.5, 1.2);
  pad([N.F3], 0.6, 3.0, 0.018, 600, 1.2, 0.8);
  riser(3.0, T.burst, 0.1, 200, 3000);
  // ---- PLAN 2 · burst, fall, sunrise
  drum(T.burst, 0.55, 95, 40, 1.8); whoosh(T.burst - 0.1, 0.9, 0.09, 400, 4000);
  crackle(T.burst, 7.2, 60, 0.035);
  pad([N.D3, N.A3, N.E4], 4.0, 7.0, 0.04, 1000, 1.6, 0.6);
  riser(5.6, 7.0, 0.07, 300, 5000);
  drum(7.0, 0.6, 100, 42, 1.6); cymbal(7.0, 0.1, 2.5);
  pad([N.D3, N.Fs3, N.A3, N.D4], 7.0, 8.0, 0.055, 2200, 0.3, 0.3);
  [N.D5, N.Fs5, N.A5].forEach((m, i) => bell(7.05 + i * 0.12, m, 0.03));
  // ---- PLANS 3–8 · 8–20 s: pluck ostinato, a chord per bar, a drum on each bar
  const prog = [[8, N.D3, [N.D3, N.Fs3, N.A3, N.D4]], [10, N.A2, [N.A2, N.Cs3, N.E3, N.A3]], [12, N.B2, [N.B2, N.D3, N.Fs3, N.B3]],
    [14, N.G2, [N.G2, N.B2, N.D3, N.G3]], [16, N.D3, [N.D3, N.Fs3, N.A3, N.D4]], [18, N.A2, [N.A2, N.Cs3, N.E3, N.A3]]];
  for (const [t0, root, chord] of prog) {
    pad(chord, t0, t0 + 2.0, 0.062, 2200, 0.25, 0.4);
    for (let k = 0; k < 8; k++) pluck(t0 + k * 0.25, root + [12, 19, 24, 19][k % 4], 0.09);
    pluck(t0, root, 0.09);
    drum(t0, t0 === 10 ? 0.4 : 0.5, 100, 42, 1.0);
  }
  // 10.4 Ankara: the biggest hit, a brass flare
  drum(T.ankara, 0.95, 90, 34, 2.0); cymbal(T.ankara, 0.12, 2.2); brass(T.ankara, 1.2, N.A4, 0.09); brass(T.ankara, 1.2, N.E4, 0.06);
  // 12–14 letters fly past
  [12.45, 12.8, 13.1, 13.4, 13.65].forEach((t, i) => whoosh(t, 0.35, 0.05 + 0.01 * i, 700, 2600));
  // 14–16 the train: wheels lock to the rhythm and speed up, a whistle at each city
  { let t = 13.2; while (t < T.vote) { const v = 0.24 - 0.12 * clamp((t - 13.2) / 2.8); chug(t, 0.035 + 0.02 * clamp((t - 13.2) / 2)); t += v; } }
  whistle(world_t('Kayseri'), 0.5, 0.045); whistle(world_t('Sivas'), 0.4, 0.045); whistle(world_t('Erzurum') - 0.1, 0.9, 0.055);
  // 16–18 1934: bells across the country
  [N.D5, N.Fs5, N.A5, N.D6, N.A5, N.Fs5, N.B5, N.A5].forEach((m, i) => bell(16.1 + i * 0.22, m, 0.04));
  // 18–20 the dive to Kocaeli
  riser(18.0, 20.6, 0.1, 250, 6000);
  // ---- PLAN 9 · 20–25 s: the machine
  for (let t = 19.5; t < T.cut; t += 0.25) tick(t, 0.12, 0.42);
  whoosh(20.35, 0.55, 0.12, 300, 2200);
  drum(20.6, 0.35, 70, 36, 1.2);
  pad([N.G2, N.B2, N.D3, N.G3], 20.6, 25.0, 0.045, 1600, 1.0, 0.8);
  // the cut: "şak"
  { const t = T.cut; const n = noiseSrc(t, 0.2), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
    const ga = ctx.createGain(); env(ga, t, 0.0008, 0.32, 0.07); n.connect(hp); hp.connect(ga); ga.connect(fxBus); drum(t, 0.25, 160, 60, 0.3); }
  // ---- PLAN 10 · 25–31 s: the motif on the piano while the pen writes
  pad([N.D3, N.Fs3, N.A3], 25.0, 31.0, 0.035, 1000, 1.2, 0.6);
  [[25.4, N.D5], [26.4, N.A4], [27.3, N.B4], [28.2, N.A4]].forEach(([t, m]) => piano(t, m, 0.09, 2.6));
  [N.D4, N.Fs4, N.A4, N.D5].forEach((m, i) => piano(T.sign + i * 0.05, m, 0.065, 3.4));
  scratch(T.write, T.write + 1.7, 0.012); scratch(T.write + 1.8, T.write + 3.7, 0.012);
  // ---- PLAN 11 · wind takes the sheet, white
  whoosh(30.6, 1.0, 0.1, 300, 1800); riser(30.9, 31.55, 0.06, 1000, 8000);
  // ---- PLAN 12 · the dial: ticks follow the hands and become a whirr
  for (let t = 31.8; t < T.years0; t += 0.5) tick(t, 0.32, t % 1 < 0.25 ? 1 : 0.82);
  {
    const total = 103 * 15; let last = 0;
    for (let t = T.years0; t < T.years1 + 0.3; t += 1 / 1000) {
      const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
      const step = Math.floor(spin * total / 20);
      if (step > last) { last = step; const speed = Math.min(1, step / 25); tick(t, 0.28 - 0.14 * speed, step % 2 ? 0.85 : 1); }
    }
  }
  pad([N.A2, N.Cs3, N.E3, N.A3], 31.7, 36.4, 0.06, 1800, 1.6, 0.3);
  pad([N.E3, N.A3], 30.9, 32.2, 0.03, 1200, 0.6, 0.8);
  riser(34.4, T.reveal, 0.14, 200, 8000);
  for (let i = 0; i < 16; i++) { const t = 35.2 + 1.2 * (1 - Math.pow(1 - i / 16, 1.8)); drum(t, 0.1 + 0.012 * i, 220, 160, 0.12); }
  // ---- PLAN 13 · 36.4 climax: D major, full band, the motif in the brass
  drum(T.reveal, 1.0, 90, 32, 2.2); cymbal(T.reveal, 0.2, 3.0);
  const chords = [[36.4, 38.4, [N.D3, N.Fs3, N.A3, N.D4]], [38.4, 39.4, [N.G2, N.B2, N.D3, N.G3]], [39.4, 40.4, [N.A2, N.Cs3, N.E3, N.A3]],
    [40.4, 42.4, [N.D3, N.Fs3, N.A3, N.D4]], [42.4, 43.4, [N.G2, N.B2, N.D3, N.G3]], [43.4, 44.4, [N.A2, N.Cs3, N.E3, N.A3]], [44.4, 45.0, [N.D3, N.Fs3, N.A3, N.D4]]];
  for (const [a, b, ns] of chords) pad(ns, a, b, 0.06, 2600, 0.12, 0.7);
  [[36.4, 1.0, N.D4], [37.4, 0.5, N.A4], [37.9, 0.5, N.B4], [38.4, 1.0, N.A4], [39.4, 1.0, N.Fs4]].forEach(([t, d, m]) => brass(t, d, m, 0.12));
  // ---- PLAN 14–15 · the band marches in, the crowd, the motif once more, the greeting
  crowd(38.0, 45.0, 0.045);
  for (let bar = 38.4; bar < 44.4; bar += 2) {
    for (let k = 0; k < 4; k++) drum(bar + k * 0.5, k % 2 ? 0.28 : 0.42, 90, 45, 0.6);
    [0, 0.5, 0.75, 1.0, 1.5, 1.625, 1.75, 1.875].forEach((o, i) => snare(bar + o, i === 0 || i === 3 ? 0.17 : 0.1));
  }
  [[40.4, 1.0, N.D5], [41.4, 0.5, N.A4], [41.9, 0.5, N.B4], [42.4, 1.0, N.A4], [43.4, 1.0, N.Cs5], [44.4, 0.6, N.D5]].forEach(([t, d, m]) => { brass(t, d, m, 0.12); brass(t, d, m - 12, 0.07); });
  drum(40.4, 0.8, 90, 34, 1.6); cymbal(40.4, 0.12, 2.0);
  drum(T.greet, 0.6, 90, 34, 1.6);
  [N.D5, N.Fs5, N.A5, N.D6].forEach((m, i) => bell(T.greet + 0.05 + i * 0.18, m, 0.035));
  tick(T.tick, 0.45, 1);

  return ctx.startRendering();
}

export function toWav(buf) {
  const ch = buf.numberOfChannels, len = buf.length, out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true);
  out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(out.buffer);
}
