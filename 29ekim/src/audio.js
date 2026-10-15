// Original score for "Sıfırdan", synthesised with the Web Audio API (no samples, no recordings).
// Re minör'den başlayıp bayrakla birlikte Re majöre açılır. Everything is placed on the film's timeline.
import { T, DURATION } from './timeline.js';
import { BURST_TIMES } from './fireworks.js';
import { rng, ease, clamp } from './util.js';

const SR = 48000;
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// note names -> midi
const N = { D1: 26, D2: 38, F2: 41, G2: 43, A2: 45, Bb2: 46, B2: 47, C3: 48, Cs3: 49, D3: 50, E3: 52, F3: 53, Fs3: 54, G3: 55, A3: 57, Bb3: 58, B3: 59, C4: 60, Cs4: 61,
  D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, A4: 69, Bb4: 70, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, Fs5: 78, A5: 81, D6: 86 };

export async function renderMusic() {
  const ctx = new OfflineAudioContext(2, Math.round(SR * DURATION), SR);
  const rand = rng(1923);

  // ---- buses
  const master = ctx.createGain(); master.gain.value = 0.9;
  master.gain.setValueAtTime(0.9, 0); master.gain.setValueAtTime(0.9, DURATION - 0.35); master.gain.linearRampToValueAtTime(0.0001, DURATION);
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

  const tickBus = bus(0.18, 0), drumBus = bus(0.22, 0), padL = bus(0.5, -0.35), padR = bus(0.5, 0.35), pluckBus = bus(0.25, 0.1),
    brassBus = bus(0.4, -0.05), pianoBus = bus(0.55, 0.1), bellBus = bus(0.7, 0), fxBus = bus(0.35, 0), droneBus = bus(0.15, 0);

  // ---- 1. terminal: clock ticks and key clicks
  for (let i = 0; i < 6; i++) tick(0.5 + i, i % 2 ? 0.35 : 0.45, i % 2 ? 0.82 : 1);
  for (let i = 0; i < 10; i++) key(T.type0 + i * T.typeStep + 0.01, 0.1);
  // ---- 2. embers
  riser(4.6, T.burst, 0.1, 200, 2500);
  drum(T.burst, 0.45, 90, 40, 1.8);
  crackle(T.burst, 13, 70, 0.035);
  drone(T.burst, 40.2, 0.09);
  pad([N.D3, N.F3, N.A3], 7.0, 10.6, 0.045, 900, 2.0);
  pad([N.Bb2, N.D3, N.F3], 10.4, 13.2, 0.045, 1000, 1.5);
  // ---- 3. map, Kocaeli
  drum(13.0, 0.35, 90, 45, 1.2);
  pad([N.F3, N.A3, N.C4], 13.0, 16.3, 0.05, 1200, 1.5);
  riser(14.6, 16.2, 0.07, 400, 4000);
  drum(16.2, 0.6, 110, 42, 1.6);
  pad([N.C3, N.E3, N.G3], 16.2, 19.2, 0.05, 1300, 1.2);
  pad([N.D3, N.F3, N.A3], 19.0, 22.2, 0.05, 1200, 1.0);
  pad([N.Bb2, N.D3, N.F3], 22.0, 25.4, 0.05, 1200, 1.0);
  [[19.3, N.D5], [20.2, N.A4], [21.1, N.F4], [22.2, N.D5], [23.1, N.Bb4], [24.0, N.F4]].forEach(([t, m]) => piano(t, m, 0.075));
  // ---- 4. montage: ostinato, hits on every event
  const roots = [[25.3, 28.4, N.F2], [28.4, 32.0, N.C3], [32.0, 35.0, N.D3], [35.0, 37.5, N.Bb2], [37.5, 40.0, N.A2]];
  for (const [a, b, m] of roots) for (let t = a; t < b - 0.01; t += 0.3125) pluck(t, m + ((Math.round((t - a) / 0.3125) % 4) === 2 ? 12 : 0), 0.085);
  for (const t of [T.wave, T.letters, T.rail, T.vote, T.paper]) drum(t, t === T.wave ? 0.85 : 0.6);
  pad([N.F3, N.A3, N.C4, N.F4], 25.3, 28.5, 0.06, 2200, 0.4);
  pad([N.C3, N.E3, N.G3, N.C4], 28.4, 32.1, 0.055, 2000, 0.6);
  pad([N.D3, N.F3, N.A3, N.D4], 32.0, 35.1, 0.055, 2000, 0.6);
  pad([N.Bb2, N.D3, N.F3, N.Bb3], 35.0, 37.6, 0.055, 2000, 0.6);
  pad([N.A2, N.Cs3, N.E3, N.A3], 37.5, 40.0, 0.06, 2200, 0.6, 0.4);
  brass(T.wave + 0.02, 2.6, N.F4, 0.07);
  riser(38.3, 40.0, 0.13, 300, 7000);
  // ---- 5. the tower draws itself, the dial spins through 103 years
  drum(T.tower, 0.95, 70, 30, 2.4);
  pad([N.D3, N.A3, N.E4, N.F4], 40.3, 47.2, 0.075, 1300, 2.0);
  drone(40.4, 47.4, 0.07);
  [N.D4, N.F4, N.A4, N.D5, N.E5, N.F5, N.A5].forEach((m, i) => bell(40.6 + i * 0.85, m, 0.075));
  for (let t = 47.0; t < T.years0; t += 1) tick(t, 0.35, 1);
  {
    // ticks follow the clock hands: one every 6 clock-minutes, while the year counter runs
    const total = 8 * 60;
    let last = 0;
    for (let t = T.years0; t < T.years1 + 0.6; t += 1 / 1000) {
      const spin = ease.inOut(clamp((t - T.years0) / (T.years1 - T.years0)));
      const step = Math.floor(spin * total / 6);
      if (step > last) { last = step; const speed = Math.min(1, step / 30); tick(t, 0.3 - 0.12 * speed, step % 2 ? 0.85 : 1); }
    }
  }
  pad([N.Bb2, N.D3, N.F3], 47.0, 49.4, 0.07, 1400, 1.0);
  pad([N.C3, N.E3, N.G3], 49.3, 51.8, 0.075, 1600, 0.8);
  pad([N.A2, N.Cs3, N.E3, N.A3], 51.7, 55.6, 0.085, 1900, 0.8, 0.5);
  riser(51.8, 55.8, 0.16, 200, 8000);
  for (let i = 0; i < 22; i++) { const t = 53.4 + 2.4 * (1 - Math.pow(1 - i / 22, 1.8)); drum(t, 0.12 + 0.012 * i, 220, 160, 0.12); }
  // ---- 6. flag and fireworks: D major
  drum(55.8, 1.0, 90, 32, 2.2); cymbal(55.8, 0.2, 3.2);
  const chords = [[55.8, 58.3, [N.D3, N.Fs3, N.A3, N.D4]], [58.3, 59.55, [N.G2, N.B2, N.D3, N.G3]], [59.55, 60.8, [N.Fs3, N.A3, N.D4]], [60.8, 62.675, [N.A2, N.Cs3, N.E3, N.A3]], [62.675, 65.3, [N.D3, N.Fs3, N.A3, N.D4]]];
  for (const [a, b, ns] of chords) pad(ns, a, b, 0.065, 2600, 0.15, 0.8);
  [[55.8, 1.25, N.D4], [57.05, 0.625, N.A4], [57.675, 0.625, N.B4], [58.3, 1.25, N.A4], [59.55, 0.625, N.Fs4], [60.175, 0.625, N.G4], [60.8, 1.875, N.A4], [62.675, 2.4, N.D5]]
    .forEach(([t, d, m]) => brass(t, d, m, 0.12));
  for (const t of [57.05, 58.3, 59.55, 60.8, 62.05]) drum(t, 0.55, 100, 40, 1.0);
  drum(62.675, 0.9, 90, 32, 2.0); cymbal(62.675, 0.14, 2.5);
  for (let i = 0; i < 16; i++) pluck(55.8 + i * 0.3125, N.D3 + (i % 4 === 2 ? 12 : 0), 0.06);
  BURST_TIMES.forEach((t, i) => boom(t, 0.22 + 0.06 * (i % 3)));
  // ---- 7. paper and the quote
  pad([N.D3, N.Fs3, N.A3], 64.9, 71.0, 0.035, 900, 1.2, 0.8);
  [[65.7, N.Fs5], [66.6, N.D5], [67.5, N.A4], [68.4, N.B4]].forEach(([t, m]) => piano(t, m, 0.08, 3));
  [N.Fs4, N.A4, N.D5].forEach((m, i) => piano(69.05 + i * 0.03, m, 0.06, 3.2));
  // ---- 8. 103 and the closing words
  drum(T.end, 0.45, 80, 35, 2.0);
  pad([N.D3, N.Fs3, N.A3, N.D4, N.Fs4], 71.0, 74.5, 0.05, 1600, 1.0, 0.5);
  [[71.3, N.D6], [72.2, N.A5], [73.1, N.Fs5]].forEach(([t, m]) => bell(t, m, 0.035));
  tick(74.55, 0.4, 1);

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
